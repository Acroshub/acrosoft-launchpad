import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import {
  OTP_MAX_ATTEMPTS, SESSION_ABSOLUTE_DAYS,
  hashOtp, sha256Hex, safeEqual, generateSessionToken, clientIp,
} from "../_shared/course-auth.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

/**
 * POST /functions/v1/verify-course-otp
 * Body: { email, tenant_id, course_slug, code }
 *
 * Canjea el código de 6 dígitos por un token de sesión opaco.
 */
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  // Mismo mensaje para código incorrecto, caducado, ya usado o email sin acceso:
  // cualquier matiz aquí sería un oráculo para adivinar códigos o enumerar alumnos.
  const invalid = () => json({ error: "Código incorrecto o caducado" }, 401);

  try {
    const { email, tenant_id, course_slug, code } = await req.json() as {
      email?: string; tenant_id?: string; course_slug?: string; code?: string;
    };

    if (!email?.trim() || !tenant_id?.trim() || !course_slug?.trim() || !code?.trim()) {
      return json({ error: "Faltan datos" }, 400);
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanCode = code.replace(/\D/g, "");
    if (cleanCode.length !== 6) return invalid();

    // Tope global por IP: el contador por código (OTP_MAX_ATTEMPTS) no basta si el
    // atacante pide códigos nuevos para reintentar sin límite.
    const { data: ipOk } = await supabase.rpc("check_rate_limit", {
      p_key: `course-otp-verify-ip:${clientIp(req)}`,
      p_window_seconds: 3600,
      p_max_count: 30,
    });
    if (ipOk === false) {
      return json({ error: "Demasiados intentos. Intenta más tarde." }, 429);
    }

    const { data: course } = await supabase
      .from("crm_courses")
      .select("id")
      .eq("user_id", tenant_id)
      .eq("slug", course_slug)
      .eq("is_published", true)
      .maybeSingle();
    if (!course) return invalid();

    const { data: access } = await supabase
      .from("crm_course_access")
      .select("id, expires_at")
      .eq("course_id", course.id)
      .eq("email", normalizedEmail)
      .maybeSingle();
    if (!access) return invalid();
    if (access.expires_at && new Date(access.expires_at) < new Date()) return invalid();

    const { data: otp } = await supabase
      .from("crm_course_otp")
      .select("id, code_hash, attempts, expires_at, consumed_at")
      .eq("course_access_id", access.id)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otp) return invalid();
    if (new Date(otp.expires_at) < new Date()) return invalid();

    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      // Quemado: obliga a pedir un código nuevo en vez de seguir probando.
      await supabase.from("crm_course_otp")
        .update({ consumed_at: new Date().toISOString() })
        .eq("id", otp.id);
      return invalid();
    }

    const candidate = await hashOtp(access.id, cleanCode);
    if (!safeEqual(candidate, otp.code_hash)) {
      await supabase.from("crm_course_otp")
        .update({ attempts: otp.attempts + 1 })
        .eq("id", otp.id);
      return invalid();
    }

    // Correcto → se consume de inmediato (un solo uso).
    const { data: consumed } = await supabase
      .from("crm_course_otp")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", otp.id)
      .is("consumed_at", null)
      .select("id")
      .maybeSingle();

    // Si otra petición simultánea lo consumió primero, esta no emite sesión.
    if (!consumed) return invalid();

    const token = generateSessionToken();
    const { error: sessErr } = await supabase.from("crm_course_sessions").insert({
      course_access_id: access.id,
      token_hash: await sha256Hex(token),
      absolute_expires_at: new Date(
        Date.now() + SESSION_ABSOLUTE_DAYS * 24 * 60 * 60 * 1000,
      ).toISOString(),
      user_agent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
    });
    if (sessErr) {
      console.error("[verify-course-otp] no se pudo crear la sesión:", sessErr);
      return json({ error: "Error interno" }, 500);
    }

    await supabase.from("crm_course_access")
      .update({ status: "active" })
      .eq("id", access.id);

    return json({ session_token: token, email: normalizedEmail });

  } catch (err) {
    console.error("[verify-course-otp]", err);
    return json({ error: "Error interno" }, 500);
  }
});
