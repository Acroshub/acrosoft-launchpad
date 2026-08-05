import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

/**
 * POST /functions/v1/stripe-disconnect
 *
 * Desconecta Stripe del tenant que llama (auth.uid()) — borra secret_key y
 * webhook_secret, conserva el resto de la fila para no perder historial de modo/email.
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

    const { error } = await supabase
      .from("crm_stripe_config")
      .update({
        connected: false,
        secret_key: null,
        webhook_secret: null,
        account_email: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", caller.id);
    if (error) throw error;

    return respond({ success: true });
  } catch (err) {
    console.error("stripe-disconnect error:", err);
    return respond({ error: "Error interno del servidor" }, 500);
  }
});
