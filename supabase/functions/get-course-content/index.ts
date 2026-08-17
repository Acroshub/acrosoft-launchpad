import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { resolveCourseSession } from "../_shared/course-auth.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

/**
 * POST /functions/v1/get-course-content
 * Body: { session_token }
 *
 * Devuelve el curso con sus módulos y lecciones para una sesión válida.
 * `resolveCourseSession` valida la sesión contra la BD (revocación, caducidad
 * absoluta, inactividad y vigencia del acceso) y refresca `last_seen_at`.
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
    if (!session_token?.trim()) return json({ error: "session_token requerido" }, 400);

    const session = await resolveCourseSession(supabase, session_token.trim());
    // 401 genérico: el cliente sólo necesita saber que debe volver a pedir código.
    if (!session) return json({ error: "Sesión inválida o expirada" }, 401);

    const [courseRes, modulesRes, lessonsRes] = await Promise.all([
      supabase
        .from("crm_courses")
        .select("*")
        .eq("id", session.courseId)
        .eq("is_published", true)
        .maybeSingle(),
      supabase
        .from("crm_course_modules")
        .select("*")
        .eq("course_id", session.courseId)
        .order("sort_order"),
      supabase
        .from("crm_course_lessons")
        .select("*")
        .eq("course_id", session.courseId)
        .order("sort_order"),
    ]);

    if (!courseRes.data) return json({ error: "Curso no disponible" }, 404);

    return json({
      course:  courseRes.data,
      modules: modulesRes.data ?? [],
      lessons: lessonsRes.data ?? [],
      email:   session.email,
    });

  } catch (err) {
    console.error("[get-course-content]", err);
    return json({ error: "Error interno" }, 500);
  }
});
