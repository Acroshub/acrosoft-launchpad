import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { OTP_TTL_MINUTES, generateOtpCode, hashOtp, clientIp } from "../_shared/course-auth.ts";

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY   = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM      = `Acrosoft <${Deno.env.get("RESEND_FROM_EMAIL") ?? "noreply@acrosoftlabs.com"}>`;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

/**
 * POST /functions/v1/request-course-access
 * Body: { email, tenant_id, course_slug }
 *
 * Envía un código de 6 dígitos al email si — y sólo si — ese email tiene acceso
 * concedido al curso. La respuesta es siempre la misma (`{ ok: true }`) exista o
 * no el curso/acceso: revelar la diferencia permitiría enumerar alumnos.
 */
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  // Respuesta uniforme: nunca distingue "no existe" de "no tiene acceso".
  const uniform = () => json({ ok: true });

  try {
    const { email, tenant_id, course_slug } = await req.json() as {
      email?: string; tenant_id?: string; course_slug?: string;
    };

    if (!email?.trim() || !tenant_id?.trim() || !course_slug?.trim()) {
      return json({ error: "email, tenant_id y course_slug son requeridos" }, 400);
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ── Rate limit por IP: frena el barrido de emails ──────────────────────────
    const { data: ipOk } = await supabase.rpc("check_rate_limit", {
      p_key: `course-otp-req-ip:${clientIp(req)}`,
      p_window_seconds: 3600,
      p_max_count: 20,
    });
    if (ipOk === false) {
      return json({ error: "Demasiadas solicitudes. Intenta más tarde." }, 429);
    }

    // ── Rate limit por email+curso: frena el bombardeo de correos a una víctima ─
    const { data: emailOk } = await supabase.rpc("check_rate_limit", {
      p_key: `course-otp-req-mail:${normalizedEmail}:${tenant_id}:${course_slug}`,
      p_window_seconds: 3600,
      p_max_count: 5,
    });
    if (emailOk === false) {
      // Uniforme a propósito: si dijéramos 429 sólo cuando el email existe,
      // el rate limit se convertiría en un oráculo de enumeración.
      return uniform();
    }

    const { data: course } = await supabase
      .from("crm_courses")
      .select("id, title, user_id")
      .eq("user_id", tenant_id)
      .eq("slug", course_slug)
      .eq("is_published", true)
      .maybeSingle();

    if (!course) return uniform();

    const { data: access } = await supabase
      .from("crm_course_access")
      .select("id, expires_at")
      .eq("course_id", course.id)
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (!access) return uniform();
    if (access.expires_at && new Date(access.expires_at) < new Date()) return uniform();

    // Invalida los códigos anteriores: sólo el último sirve.
    await supabase
      .from("crm_course_otp")
      .update({ consumed_at: new Date().toISOString() })
      .eq("course_access_id", access.id)
      .is("consumed_at", null);

    const code = generateOtpCode();
    const { error: otpErr } = await supabase.from("crm_course_otp").insert({
      course_access_id: access.id,
      code_hash: await hashOtp(access.id, code),
      expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString(),
    });
    if (otpErr) {
      console.error("[request-course-access] no se pudo crear el OTP:", otpErr);
      return json({ error: "Error interno" }, 500);
    }

    if (!RESEND_API_KEY) {
      console.error("[request-course-access] RESEND_API_KEY no configurado");
      return json({ error: "Error interno" }, 500);
    }

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [normalizedEmail],
        subject: `Tu código de acceso: ${code}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
            <h2 style="font-size:20px;margin:0 0 8px">Tu código de acceso</h2>
            <p style="color:#555;margin:0 0 24px"><strong>${course.title}</strong></p>
            <div style="background:#f4f4f5;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
              <p style="font-size:34px;font-weight:700;letter-spacing:.35em;margin:0;color:#111;font-family:monospace">${code}</p>
            </div>
            <p style="color:#888;font-size:13px;margin:0 0 4px">Escribe este código en la página para entrar. Caduca en ${OTP_TTL_MINUTES} minutos y sólo puede usarse una vez.</p>
            <p style="color:#aaa;font-size:12px;margin:16px 0 0">Si no solicitaste este código, ignora este mensaje. Nadie puede entrar sin él.</p>
          </div>
        `,
      }),
    }).catch(e => console.error("[request-course-access] email error:", e.message));

    return uniform();

  } catch (err) {
    console.error("[request-course-access]", err);
    return json({ error: "Error interno" }, 500);
  }
});
