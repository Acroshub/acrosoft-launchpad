-- B18-1 · Activación Manual de Clientes SaaS
-- Tabla que registra el acceso SaaS asignado manualmente por el superadmin.
-- Complementa crm_client_accounts con datos de plan, fechas y notas.

CREATE TABLE IF NOT EXISTS crm_saas_access (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id   uuid        NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  activated_by uuid        NOT NULL REFERENCES auth.users(id),
  plan_id      uuid        REFERENCES crm_services(id) ON DELETE SET NULL,
  status       text        NOT NULL DEFAULT 'active', -- active | suspended | expired
  starts_at    date        NOT NULL DEFAULT CURRENT_DATE,
  expires_at   date,       -- null = sin vencimiento
  notes        text,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE(contact_id)
);

ALTER TABLE crm_saas_access ENABLE ROW LEVEL SECURITY;

-- El superadmin que activó puede leer y actualizar sus registros
CREATE POLICY "saas_access_select" ON crm_saas_access
  FOR SELECT USING (activated_by = auth.uid());

CREATE POLICY "saas_access_update" ON crm_saas_access
  FOR UPDATE USING (activated_by = auth.uid());

CREATE POLICY "saas_access_insert" ON crm_saas_access
  FOR INSERT WITH CHECK (activated_by = auth.uid());
