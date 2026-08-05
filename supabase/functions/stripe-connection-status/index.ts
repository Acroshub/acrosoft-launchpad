import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

/**
 * GET /functions/v1/stripe-connection-status
 *
 * Devuelve el estado de conexión de Stripe del tenant que llama (auth.uid()).
 * Nunca incluye secret_key ni webhook_secret — solo datos seguros de mostrar.
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

    const { data, error } = await supabase
      .from("crm_stripe_config")
      .select("mode, publishable_key, connected, account_email, webhook_secret, last_verified_at")
      .eq("user_id", caller.id)
      .maybeSingle();
    if (error) throw error;

    if (!data) return respond({ connected: false });

    return respond({
      connected: data.connected,
      mode: data.mode,
      publishable_key: data.publishable_key,
      account_email: data.account_email,
      last_verified_at: data.last_verified_at,
      has_webhook_secret: !!data.webhook_secret,
    });
  } catch (err) {
    console.error("stripe-connection-status error:", err);
    return respond({ error: "Error interno del servidor" }, 500);
  }
});
