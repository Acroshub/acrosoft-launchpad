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
    const { email, course_id } = await req.json() as { email: string; course_id: string };
    if (!email || !course_id) {
      return new Response(JSON.stringify({ error: "email y course_id son requeridos" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const { data: course } = await supabase
      .from("crm_courses")
      .select("title, slug, description")
      .eq("id", course_id)
      .single();

    if (!course) {
      return new Response(JSON.stringify({ error: "Curso no encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar el registro de acceso para generar el magic link
    const { data: access } = await supabase
      .from("crm_course_access")
      .select("id, expires_at")
      .eq("course_id", course_id)
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (!access) {
      return new Response(JSON.stringify({ error: "El email no tiene acceso a este curso" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Limpiar magic links anteriores no usados
    await supabase
      .from("crm_course_magic_links")
      .delete()
      .eq("course_access_id", access.id)
      .is("used_at", null);

    // Generar magic link con expiración de 7 días (invitación, no sesión rápida)
    const token     = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await supabase.from("crm_course_magic_links").insert({
      course_access_id: access.id,
      token,
      expires_at: expiresAt,
    });

    const magicUrl  = `${APP_URL}/curso/${course.slug}/ver?token=${token}`;
    const courseUrl = `${APP_URL}/curso/${course.slug}`;

    if (RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: RESEND_FROM,
          to: [normalizedEmail],
          subject: `Tienes acceso al curso: ${course.title}`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:40px 24px;background:#ffffff">
              <h2 style="font-size:22px;font-weight:700;margin-bottom:8px;color:#111">
                ¡Tienes acceso al curso!
              </h2>
              <p style="font-size:16px;font-weight:600;color:#333;margin-bottom:4px">${course.title}</p>
              ${course.description ? `<p style="color:#666;font-size:14px;margin-bottom:24px">${course.description}</p>` : `<div style="margin-bottom:24px"></div>`}
              <p style="color:#555;font-size:14px;margin-bottom:20px">
                Haz clic en el botón para ingresar directamente al curso.
                Este enlace es personal, válido por 7 días y de un solo uso.
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
      }).catch(e => console.error("[send-course-invitation] email error:", e.message));
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("[send-course-invitation]", err);
    return new Response(JSON.stringify({ error: "Error interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
