import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY    = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM       = `Acrosoft <${Deno.env.get("RESEND_FROM_EMAIL") ?? "noreply@acrosoftlabs.com"}>`;

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
    const { email, tenant_id, course_slug } = await req.json() as {
      email: string;
      tenant_id: string;  // user_id (UUID) of the course owner
      course_slug: string;
    };

    if (!email?.trim() || !tenant_id?.trim() || !course_slug?.trim()) {
      return new Response(JSON.stringify({ error: "email, tenant_id y course_slug son requeridos" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Buscar el curso directamente por user_id + slug
    const { data: course } = await supabase
      .from("crm_courses")
      .select("id, title, user_id, is_published")
      .eq("user_id", tenant_id)
      .eq("slug", course_slug)
      .eq("is_published", true)
      .maybeSingle();

    if (!course) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar que el email tiene acceso
    const { data: access } = await supabase
      .from("crm_course_access")
      .select("id, expires_at")
      .eq("course_id", course.id)
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (!access) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (access.expires_at && new Date(access.expires_at) < new Date()) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Limpiar magic links anteriores no usados
    await supabase
      .from("crm_course_magic_links")
      .delete()
      .eq("course_access_id", access.id)
      .is("used_at", null);

    // Crear magic link (válido 15 minutos)
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await supabase.from("crm_course_magic_links").insert({
      course_access_id: access.id,
      token,
      expires_at: expiresAt,
    });

    const appUrl = Deno.env.get("APP_URL") ?? "https://acrosoftlabs.com";
    const magicUrl = `${appUrl}/curso/${course.user_id}/${course_slug}/ver?token=${token}`;

    if (RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: RESEND_FROM,
          to: [normalizedEmail],
          subject: `Accede al curso: ${course.title}`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
              <h2 style="font-size:20px;margin-bottom:8px">Accede al curso</h2>
              <p style="color:#555;margin-bottom:24px"><strong>${course.title}</strong></p>
              <a href="${magicUrl}" style="display:inline-block;background:#1877F2;color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px">
                Entrar al curso →
              </a>
              <p style="color:#888;font-size:13px;margin-top:24px">Este enlace es válido por 15 minutos y solo puede usarse una vez.</p>
              <p style="color:#aaa;font-size:12px">Si no solicitaste este acceso, ignora este mensaje.</p>
            </div>
          `,
        }),
      }).catch(e => console.error("[request-course-access] email error:", e.message));
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("[request-course-access]", err);
    return new Response(JSON.stringify({ error: "Error interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
