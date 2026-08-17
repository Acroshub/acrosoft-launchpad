import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sha256Hex } from "../_shared/course-auth.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

/**
 * POST /functions/v1/course-logout
 * Body: { session_token }
 *
 * Revoca la sesión en el servidor. Sin esto, "cerrar sesión" sólo borraría el
 * token del navegador y seguiría siendo válido para quien lo hubiera copiado.
 *
 * Responde 200 siempre: si el token no existe, tampoco hay nada que revelar.
 */
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { session_token } = await req.json() as { session_token?: string };
    if (!session_token?.trim()) return json({ ok: true });

    await supabase
      .from("crm_course_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("token_hash", await sha256Hex(session_token.trim()))
      .is("revoked_at", null);

    return json({ ok: true });

  } catch (err) {
    console.error("[course-logout]", err);
    return json({ ok: true });
  }
});
