import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

/**
 * POST /functions/v1/sms-opt-in     (pública, verify_jwt = false)
 *
 * Body: { phone: string, consent: true, consent_text: string, website?: string }
 *
 * La llama el formulario de alta de /sms-reminders. Guarda la PRUEBA del consentimiento (teléfono en
 * formato E.164, texto exacto que vio la persona, fecha) en sms_opt_ins. Solo números de EE.UU.
 * (el número de envío es toll-free de EE.UU.). Si la persona ya estaba (incluso si había respondido
 * STOP) se renueva el consentimiento: acaba de aceptar de nuevo.
 *
 * No manda ningún SMS (el canal de envío es otro trabajo): solo registra. Responde siempre lo mismo
 * exista o no el número, para que no sirva de oráculo.
 *
 *   200 { ok: true }
 *   400 { error: "invalid_phone" | "consent_required" }
 *   429 { error: "rate_limited" }
 */
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  const respond = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
    });
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return respond({ error: "method_not_allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));

    // Trampa para bots: el campo `website` está oculto en el formulario; una persona nunca lo llena.
    // Se responde "ok" sin guardar nada.
    if (typeof body?.website === "string" && body.website.trim() !== "") return respond({ ok: true });

    // ── Límite por IP ────────────────────────────────────────────────────────────────────────
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? req.headers.get("x-real-ip")
      ?? "unknown";
    const { data: allowed, error: rlErr } = await supabase.rpc("check_rate_limit", {
      p_key: `sms-opt-in:${clientIp}`,
      p_window_seconds: 3600,
      p_max_count: 10,
    });
    if (rlErr) console.error("rate_limit check error (non-blocking):", rlErr);
    if (allowed === false) return respond({ error: "rate_limited" }, 429, { "Retry-After": "3600" });

    // ── Consentimiento explícito ─────────────────────────────────────────────────────────────
    if (body?.consent !== true) return respond({ error: "consent_required" }, 400);

    // ── Teléfono de EE.UU. → E.164 (+1XXXXXXXXXX) ────────────────────────────────────────────
    const raw = typeof body?.phone === "string" ? body.phone.replace(/\D/g, "") : "";
    const national = raw.length === 11 && raw.startsWith("1") ? raw.slice(1) : raw;
    // Código de área y de central: no empiezan en 0 ni 1 (plan de numeración de EE.UU.).
    if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(national)) return respond({ error: "invalid_phone" }, 400);
    const phone = `+1${national}`;

    const consentText = String(typeof body?.consent_text === "string" ? body.consent_text : "")
      .replace(/<[^>]*>/g, "")
      .replace(/[\x00-\x08\x0B\x0E-\x1F\x7F]/g, "")
      .trim()
      .slice(0, 1000);
    if (consentText.length < 20) return respond({ error: "consent_required" }, 400);

    const { error } = await supabase.from("sms_opt_ins").upsert(
      {
        phone,
        consent_text: consentText,
        source: "web-form",
        granted_at: new Date().toISOString(),
        revoked_at: null,
      },
      { onConflict: "phone" },
    );
    if (error) {
      console.error("sms-opt-in upsert error:", error);
      return respond({ error: "internal_error" }, 500);
    }

    return respond({ ok: true });
  } catch (err) {
    console.error("sms-opt-in error:", err);
    return respond({ error: "internal_error" }, 500);
  }
});
