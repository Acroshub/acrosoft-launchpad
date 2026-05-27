import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SESSION_SECRET   = Deno.env.get("COURSE_SESSION_SECRET") ?? "course-session-secret-fallback";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// JWT firmado con HMAC-SHA256 — sin dependencias externas
async function signJwt(payload: Record<string, unknown>): Promise<string> {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const body   = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const data   = `${header}.${body}`;
  const key    = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${data}.${sigB64}`;
}

export async function verifyCourseJwt(token: string): Promise<{ email: string; course_id: string } | null> {
  try {
    const [headerB64, bodyB64, sigB64] = token.split(".");
    if (!headerB64 || !bodyB64 || !sigB64) return null;

    const data = `${headerB64}.${bodyB64}`;
    const key  = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(SESSION_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const sigBytes = Uint8Array.from(atob(sigB64.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
    const valid    = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(data));
    if (!valid) return null;

    const payload = JSON.parse(atob(bodyB64.replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

    return { email: payload.email, course_id: payload.course_id };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { token } = await req.json() as { token: string };

    if (!token?.trim()) {
      return new Response(JSON.stringify({ error: "token requerido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar el magic link
    const { data: link, error: linkErr } = await supabase
      .from("crm_course_magic_links")
      .select("id, course_access_id, used_at, expires_at")
      .eq("token", token)
      .maybeSingle();

    if (linkErr || !link) {
      return new Response(JSON.stringify({ error: "Enlace inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (link.used_at) {
      return new Response(JSON.stringify({ error: "Este enlace ya fue usado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(link.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "El enlace ha expirado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Marcar como usado
    await supabase
      .from("crm_course_magic_links")
      .update({ used_at: new Date().toISOString() })
      .eq("id", link.id);

    // Obtener el acceso para saber email y course_id
    const { data: access } = await supabase
      .from("crm_course_access")
      .select("email, course_id, expires_at")
      .eq("id", link.course_access_id)
      .single();

    if (!access) {
      return new Response(JSON.stringify({ error: "Acceso no encontrado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar expiración del acceso (puede ser null = sin vencimiento)
    if (access.expires_at && new Date(access.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Tu acceso a este curso ha vencido" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Emitir JWT de sesión (30 días)
    const exp = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
    const sessionToken = await signJwt({
      email: access.email,
      course_id: access.course_id,
      exp,
    });

    // Guardar access_token y marcar como activo (primera vez que el alumno accede)
    await supabase
      .from("crm_course_access")
      .update({
        access_token: sessionToken,
        token_expires_at: new Date(exp * 1000).toISOString(),
        status: "active",
      })
      .eq("id", link.course_access_id);

    return new Response(JSON.stringify({ session_token: sessionToken, email: access.email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("[verify-course-magic-link]", err);
    return new Response(JSON.stringify({ error: "Error interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
