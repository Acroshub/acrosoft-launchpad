import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

// Cliente con service role: solo para resolver número → email y para el rate limit.
const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

/**
 * POST /functions/v1/login-with-phone     (pública, verify_jwt = false)
 *
 * Body: { phone: string, password: string }
 *
 * Supabase Auth no tiene proveedor de teléfono (no hay SMS), así que el número se resuelve a
 * la cuenta de email en el servidor y ahí se hace el signInWithPassword normal. El navegador
 * recibe solo la sesión: nunca se le devuelve el email, para que esto no sirva de oráculo
 * número → email. Un número desconocido, ambiguo o una contraseña mala dan la MISMA respuesta.
 *
 * Responde:
 *   200 { access_token, refresh_token }
 *   401 { error: "invalid_credentials" }
 *   403 { error: "user_banned" }        (cuenta suspendida; solo tras validar la contraseña)
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
    const digits = typeof body?.phone === "string" ? body.phone.replace(/\D/g, "") : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (digits.length < 7 || digits.length > 15 || !password) {
      return respond({ error: "invalid_credentials" }, 401);
    }

    // ── Rate limit: por IP y por número (contra fuerza bruta de contraseñas) ─────────────────
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? req.headers.get("x-real-ip")
      ?? "unknown";
    for (const [key, max] of [[`login-phone-ip:${clientIp}`, 30], [`login-phone-num:${digits}`, 10]] as const) {
      const { data: allowed, error: rlErr } = await admin.rpc("check_rate_limit", {
        p_key: key,
        p_window_seconds: 900,
        p_max_count: max,
      });
      if (rlErr) console.error("rate_limit check error (non-blocking):", rlErr);
      if (allowed === false) return respond({ error: "rate_limited" }, 429, { "Retry-After": "900" });
    }

    // ── Número → email (NULL si no existe o es ambiguo) ──────────────────────────────────────
    const { data: email, error: lookupErr } = await admin.rpc("login_email_for_phone", { p_digits: digits });
    if (lookupErr) {
      console.error("login_email_for_phone error:", lookupErr);
      return respond({ error: "invalid_credentials" }, 401);
    }
    if (!email) return respond({ error: "invalid_credentials" }, 401);

    // ── Login normal con email + contraseña (cliente anon, sin persistir sesión) ─────────────
    const anon = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await anon.auth.signInWithPassword({ email: email as string, password });
    if (error || !data.session) {
      const banned = (error as { code?: string } | null)?.code === "user_banned" || /banned/i.test(error?.message ?? "");
      return banned ? respond({ error: "user_banned" }, 403) : respond({ error: "invalid_credentials" }, 401);
    }

    return respond({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  } catch (err) {
    console.error("login-with-phone error:", err);
    return respond({ error: "internal_error" }, 500);
  }
});
