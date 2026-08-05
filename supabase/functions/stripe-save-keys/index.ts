import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

/**
 * POST /functions/v1/stripe-save-keys
 *
 * Body (todos los campos opcionales — solo se actualiza lo que se envía):
 *   mode             'test' | 'live'
 *   secret_key       string  — se valida contra la API de Stripe antes de guardar
 *   publishable_key  string
 *   webhook_secret   string
 *
 * Guarda la config de Stripe del tenant que llama (auth.uid()). El secret_key y
 * webhook_secret nunca se devuelven — esta función solo escribe, nunca lee esos
 * campos de vuelta al cliente.
 */
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return respond({ error: "No autorizado" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !caller) return respond({ error: "No autorizado" }, 401);

    const body = await req.json();
    const { mode, secret_key, publishable_key, webhook_secret } = body as {
      mode?: "test" | "live";
      secret_key?: string;
      publishable_key?: string;
      webhook_secret?: string;
    };

    if (mode !== undefined && !["test", "live"].includes(mode)) {
      return respond({ error: "mode debe ser 'test' o 'live'" }, 400);
    }

    const { data: existing } = await supabase
      .from("crm_stripe_config")
      .select("mode")
      .eq("user_id", caller.id)
      .maybeSingle();

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (mode) update.mode = mode;
    if (publishable_key !== undefined) update.publishable_key = publishable_key?.trim() || null;
    if (webhook_secret !== undefined) update.webhook_secret = webhook_secret?.trim() || null;

    if (secret_key !== undefined && secret_key.trim()) {
      const effectiveMode = mode ?? existing?.mode ?? "test";
      const expectedPrefix = effectiveMode === "test" ? "sk_test_" : "sk_live_";
      if (!secret_key.trim().startsWith(expectedPrefix)) {
        return respond({ error: `La Secret Key debe empezar con ${expectedPrefix} para el modo ${effectiveMode}` }, 400);
      }

      // Validar la key llamando a la API real de Stripe y obtener datos de la cuenta.
      const acctRes = await fetch("https://api.stripe.com/v1/account", {
        headers: { Authorization: `Bearer ${secret_key.trim()}` },
      });
      if (!acctRes.ok) {
        const errBody = await acctRes.json().catch(() => ({}));
        return respond({ error: errBody?.error?.message ?? "La Secret Key no es válida" }, 400);
      }
      const account = await acctRes.json();
      update.secret_key = secret_key.trim();
      update.connected = true;
      update.account_email = account.email ?? null;
      update.last_verified_at = new Date().toISOString();
    }

    if (existing) {
      const { error } = await supabase.from("crm_stripe_config").update(update).eq("user_id", caller.id);
      if (error) throw error;
    } else {
      if (!secret_key) return respond({ error: "secret_key es requerido para conectar por primera vez" }, 400);
      const { error } = await supabase
        .from("crm_stripe_config")
        .insert({ user_id: caller.id, mode: mode ?? "test", ...update });
      if (error) throw error;
    }

    return respond({ success: true });
  } catch (err) {
    console.error("stripe-save-keys error:", err);
    return respond({ error: "Error interno del servidor" }, 500);
  }
});
