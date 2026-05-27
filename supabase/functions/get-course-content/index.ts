import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SESSION_SECRET   = Deno.env.get("COURSE_SESSION_SECRET") ?? "course-session-secret-fallback";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function verifyCourseJwt(token: string): Promise<{ email: string; course_id: string } | null> {
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
    const sigBytes = Uint8Array.from(
      atob(sigB64.replace(/-/g, "+").replace(/_/g, "/")),
      c => c.charCodeAt(0),
    );
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(data));
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
    const { session_token } = await req.json() as { session_token: string };

    if (!session_token?.trim()) {
      return new Response(JSON.stringify({ error: "session_token requerido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await verifyCourseJwt(session_token);
    if (!payload) {
      return new Response(JSON.stringify({ error: "Sesión inválida o expirada" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar que el acceso sigue vigente en DB (no revocado, no expirado)
    const { data: access } = await supabase
      .from("crm_course_access")
      .select("id, expires_at")
      .eq("course_id", payload.course_id)
      .eq("email", payload.email)
      .maybeSingle();

    if (!access) {
      return new Response(JSON.stringify({ error: "Acceso revocado" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (access.expires_at && new Date(access.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Tu acceso a este curso ha vencido" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cargar curso y lecciones
    const [courseRes, lessonsRes] = await Promise.all([
      supabase
        .from("crm_courses")
        .select("*")
        .eq("id", payload.course_id)
        .eq("is_published", true)
        .maybeSingle(),
      supabase
        .from("crm_course_lessons")
        .select("*")
        .eq("course_id", payload.course_id)
        .order("sort_order"),
    ]);

    if (!courseRes.data) {
      return new Response(JSON.stringify({ error: "Curso no disponible" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ course: courseRes.data, lessons: lessonsRes.data ?? [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (err: any) {
    console.error("[get-course-content]", err);
    return new Response(JSON.stringify({ error: "Error interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
