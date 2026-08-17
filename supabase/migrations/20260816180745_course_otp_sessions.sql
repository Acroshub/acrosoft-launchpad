-- Acceso a cursos por código de un solo uso (OTP) + sesiones opacas revocables.
--
-- Reemplaza el esquema anterior (crm_course_magic_links + JWT firmado con
-- COURSE_SESSION_SECRET). Motivo: el secreto de firma tenía un fallback
-- hardcodeado en el repo y no estaba configurado en producción, así que
-- cualquiera podía forjar un token de sesión válido.
--
-- El diseño nuevo no usa ningún secreto de aplicación: el token de sesión es
-- aleatorio (256 bits) y en la BD sólo vive su SHA-256. Sin secreto que filtrar,
-- sin secreto que configurar mal. Además da revocación y caducidad por
-- inactividad, imposibles con un JWT autocontenido.

-- ── Códigos de un solo uso ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_course_otp (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_access_id uuid NOT NULL REFERENCES crm_course_access(id) ON DELETE CASCADE,
  -- SHA-256 de "<course_access_id>:<código>". Nunca se guarda el código en claro:
  -- quien lea la tabla no puede usar los códigos pendientes.
  code_hash        text NOT NULL,
  attempts         integer NOT NULL DEFAULT 0,
  expires_at       timestamptz NOT NULL,
  consumed_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_otp_access  ON crm_course_otp (course_access_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_course_otp_expires ON crm_course_otp (expires_at);

-- ── Sesiones ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_course_sessions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_access_id    uuid NOT NULL REFERENCES crm_course_access(id) ON DELETE CASCADE,
  -- SHA-256 del token opaco. El token en claro sólo existe en el navegador del alumno.
  token_hash          text NOT NULL UNIQUE,
  created_at          timestamptz NOT NULL DEFAULT now(),
  -- Se refresca en cada carga de contenido: alimenta la caducidad por inactividad.
  last_seen_at        timestamptz NOT NULL DEFAULT now(),
  -- Techo duro: aunque el alumno entre a diario, la sesión muere aquí.
  absolute_expires_at timestamptz NOT NULL,
  revoked_at          timestamptz,
  user_agent          text
);

CREATE INDEX IF NOT EXISTS idx_course_sessions_hash   ON crm_course_sessions (token_hash);
CREATE INDEX IF NOT EXISTS idx_course_sessions_access ON crm_course_sessions (course_access_id);

-- ── RLS: nadie llega por PostgREST ───────────────────────────────────────────
-- Estas tablas sólo se tocan desde Edge Functions con service role. Sin policies,
-- RLS activo = deny-all para anon y authenticated.
ALTER TABLE crm_course_otp      ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_course_sessions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON crm_course_otp      FROM anon, authenticated;
REVOKE ALL ON crm_course_sessions FROM anon, authenticated;

-- ── Limpieza de material caducado ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION cleanup_course_auth()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM crm_course_otp
   WHERE expires_at < now() - interval '1 day';

  DELETE FROM crm_course_sessions
   WHERE absolute_expires_at < now() - interval '7 days'
      OR revoked_at < now() - interval '7 days';
$$;

REVOKE ALL ON FUNCTION cleanup_course_auth() FROM PUBLIC, anon, authenticated;

-- ── El token de sesión ya no se guarda en crm_course_access ──────────────────
-- Vivía en claro en access_token; ahora las sesiones son filas propias con hash.
ALTER TABLE crm_course_access DROP COLUMN IF EXISTS access_token;
ALTER TABLE crm_course_access DROP COLUMN IF EXISTS token_expires_at;

-- La tabla de magic links del esquema viejo queda sin uso: los enlaces que
-- contenía llevan tokens en claro que ya no verifica nadie.
DROP TABLE IF EXISTS crm_course_magic_links;
