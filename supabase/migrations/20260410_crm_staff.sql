-- ══════════════════════════════════════════════════════════════════════════════
-- BLOQUE 1: crm_staff
-- Staff members for a Principal (Admin or SaaS Client).
-- Each staff has granular per-section permissions.
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS crm_staff (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),

  -- The Principal who owns this CRM (Admin or SaaS Client user_id)
  owner_user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Supabase Auth user for the staff member (set after invitation accepted)
  staff_user_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  name            text NOT NULL,
  email           text NOT NULL,
  description     text,             -- role / cargo

  status          text NOT NULL DEFAULT 'invited'
                    CHECK (status IN ('invited', 'active', 'inactive')),

  -- ── Granular permissions ────────────────────────────────────────────────────
  -- Each section stores a JSONB object: { read, edit, create, delete }
  -- "read" is always required when a section is enabled.
  -- Example: { "read": true, "edit": true, "create": false, "delete": false }
  perm_mi_negocio_datos     jsonb NOT NULL DEFAULT '{"read":true,"edit":false}'::jsonb,
  perm_mi_negocio_personal  jsonb NOT NULL DEFAULT '{"read":true,"edit":false}'::jsonb,
  perm_servicios            jsonb NOT NULL DEFAULT '{"read":true,"edit":false,"create":false,"delete":false}'::jsonb,
  perm_dashboard            jsonb NOT NULL DEFAULT '{"read":false}'::jsonb,
  perm_ventas               jsonb NOT NULL DEFAULT '{"read":false,"edit":false,"create":false,"delete":false}'::jsonb,
  perm_calendarios          jsonb NOT NULL DEFAULT '{"read":false,"edit":false,"create":false,"delete":false}'::jsonb,
  perm_formularios          jsonb NOT NULL DEFAULT '{"read":false,"edit":false,"create":false,"delete":false}'::jsonb,
  perm_contactos            jsonb NOT NULL DEFAULT '{"read":false,"edit":false,"create":false,"delete":false}'::jsonb,
  perm_pipeline             jsonb NOT NULL DEFAULT '{"read":false,"edit":false,"create":false,"delete":false}'::jsonb,

  UNIQUE (owner_user_id, email)
);

ALTER TABLE crm_staff ENABLE ROW LEVEL SECURITY;

-- Principal manages their own staff
CREATE POLICY "Owner manages own staff"
  ON crm_staff
  USING  (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());
