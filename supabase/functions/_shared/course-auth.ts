/**
 * Autenticación de alumnos de cursos: código de un solo uso + sesión opaca.
 *
 * El alumno no crea cuenta. Prueba que controla su email introduciendo un código
 * de 6 dígitos que le llega por correo, y a cambio recibe un token de sesión.
 *
 * Decisión de diseño: el token de sesión NO es un JWT firmado. Es aleatorio y en
 * la BD sólo vive su SHA-256. Así no hay ningún secreto de aplicación que
 * configurar (el esquema anterior tenía un fallback hardcodeado que quedó activo
 * en producción, permitiendo forjar sesiones), y además se puede revocar y
 * caducar por inactividad — cosas imposibles con un JWT autocontenido.
 */

// ── Parámetros (ajustables sin tocar la lógica) ──────────────────────────────
export const OTP_TTL_MINUTES        = 10;   // vida del código enviado por email
export const OTP_MAX_ATTEMPTS       = 5;    // intentos fallidos antes de quemar el código
export const SESSION_INACTIVITY_DAYS = 14;  // sin entrar este tiempo → sesión cerrada
export const SESSION_ABSOLUTE_DAYS   = 90;  // techo duro aunque entre a diario

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

/** Hash del código, ligado a su fila de acceso: un código no vale para otro curso. */
export const hashOtp = (courseAccessId: string, code: string) =>
  sha256Hex(`${courseAccessId}:${code}`);

/**
 * Código de 6 dígitos uniformemente distribuido.
 * Se descartan los bytes >= 250 para que el módulo no sesgue los dígitos bajos.
 */
export function generateOtpCode(): string {
  let out = "";
  while (out.length < 6) {
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    for (const b of bytes) {
      if (b >= 250) continue;
      out += (b % 10).toString();
      if (out.length === 6) break;
    }
  }
  return out;
}

/** Token de sesión opaco de 256 bits. */
export function generateSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

/** Comparación en tiempo constante — evita distinguir códigos por latencia. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export type CourseSession = {
  sessionId: string;
  courseAccessId: string;
  courseId: string;
  email: string;
};

/**
 * Valida un token de sesión y, si sigue vivo, refresca `last_seen_at`.
 *
 * Comprueba en cadena: sesión existe → no revocada → dentro del techo absoluto →
 * activa en la ventana de inactividad → el acceso al curso sigue concedido y no
 * ha vencido. Cualquier fallo devuelve null (el llamante responde 401 genérico).
 *
 * `supabase` debe ser un cliente con service role.
 */
export async function resolveCourseSession(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  token: string,
): Promise<CourseSession | null> {
  if (!token || typeof token !== "string" || token.length < 32) return null;

  const tokenHash = await sha256Hex(token);

  const { data: session } = await supabase
    .from("crm_course_sessions")
    .select("id, course_access_id, last_seen_at, absolute_expires_at, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (!session) return null;
  if (session.revoked_at) return null;

  const now = Date.now();
  if (new Date(session.absolute_expires_at).getTime() < now) return null;

  const idleMs = now - new Date(session.last_seen_at).getTime();
  if (idleMs > SESSION_INACTIVITY_DAYS * 24 * 60 * 60 * 1000) {
    // Cerrar explícitamente: así no revive si el alumno vuelve más tarde.
    await supabase
      .from("crm_course_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", session.id);
    return null;
  }

  // El acceso pudo revocarse o vencer después de emitir la sesión.
  const { data: access } = await supabase
    .from("crm_course_access")
    .select("id, course_id, email, expires_at")
    .eq("id", session.course_access_id)
    .maybeSingle();

  if (!access) return null;
  if (access.expires_at && new Date(access.expires_at).getTime() < now) return null;

  // Sólo se escribe si pasó un minuto: evita un UPDATE por cada request.
  if (idleMs > 60_000) {
    await supabase
      .from("crm_course_sessions")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", session.id);
  }

  return {
    sessionId: session.id,
    courseAccessId: access.id,
    courseId: access.course_id,
    email: access.email,
  };
}

/** IP del cliente para los rate limits. */
export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("x-real-ip")
    ?? "unknown";
}
