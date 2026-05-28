import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY   = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM      = `Acrosoft <${Deno.env.get("RESEND_FROM_EMAIL") ?? "noreply@acrosoftlabs.com"}>`;
const APP_URL          = Deno.env.get("APP_URL") ?? "https://acrosoftlabs.com";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Obtener todos los cursos publicados (todos los tenants — migración global)
    const { data: courses } = await supabase
      .from("crm_courses")
      .select("id, title, slug, description, user_id")
      .eq("is_published", true);

    if (!courses?.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const courseIds = courses.map(c => c.id);

    const { data: accessList } = await supabase
      .from("crm_course_access")
      .select("id, email, course_id, expires_at")
      .in("course_id", courseIds);

    if (!accessList?.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Limpiar magic links no usados
    await supabase
      .from("crm_course_magic_links")
      .delete()
      .in("course_access_id", accessList.map(a => a.id))
      .is("used_at", null);

    const courseMap = Object.fromEntries(courses.map(c => [c.id, c]));
    let sent = 0;

    for (const access of accessList) {
      if (access.expires_at && new Date(access.expires_at) < new Date()) continue;

      const course = courseMap[access.course_id];
      if (!course) continue;

      const token     = generateToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      await supabase.from("crm_course_magic_links").insert({
        course_access_id: access.id,
        token,
        expires_at: expiresAt,
      });

      // URL con user_id como tenant identifier
      const magicUrl  = `${APP_URL}/curso/${course.user_id}/${course.slug}/ver?token=${token}`;
      const courseUrl = `${APP_URL}/curso/${course.user_id}/${course.slug}`;

      if (RESEND_API_KEY) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: RESEND_FROM,
            to: [access.email],
            subject: `Nuevo enlace para ingresar al curso: ${course.title}`,
            html: `
              <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:40px 24px;background:#ffffff">
                <h2 style="font-size:22px;font-weight:700;margin-bottom:8px;color:#111">
                  Nuevo enlace para ingresar al curso
                </h2>
                <p style="font-size:16px;font-weight:600;color:#333;margin-bottom:4px">${course.title}</p>
                ${course.description ? `<p style="color:#666;font-size:14px;margin-bottom:24px">${course.description}</p>` : `<div style="margin-bottom:24px"></div>`}
                <p style="color:#555;font-size:14px;margin-bottom:20px">
                  Hemos actualizado el enlace de acceso a tu curso.
                  Usa el botón a continuación para ingresar. Este enlace es personal, válido por 7 días y de un solo uso.
                </p>
                <a href="${magicUrl}" style="display:inline-block;background:#111;color:white;text-decoration:none;padding:13px 28px;border-radius:8px;font-weight:600;font-size:15px">
                  Acceder al curso →
                </a>
                <p style="color:#888;font-size:13px;margin-top:28px">
                  ¿El enlace expiró? Ingresa a
                  <a href="${courseUrl}" style="color:#111">${courseUrl}</a>
                  con tu email y recibirás un nuevo enlace de acceso.
                </p>
                <p style="color:#aaa;font-size:12px;margin-top:16px;border-top:1px solid #eee;padding-top:16px">
                  Si no esperabas este mensaje, puedes ignorarlo.
                </p>
              </div>
            `,
          }),
        }).catch(e => console.error("[notify-course-url-change] email error:", e.message));

        sent++;
      }
    }

    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("[notify-course-url-change]", err);
    return new Response(JSON.stringify({ error: "Error interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
