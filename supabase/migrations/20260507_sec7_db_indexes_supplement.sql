-- ── SEC-7 · Índices complementarios ──────────────────────────────────────────
-- Tablas frecuentemente consultadas que quedaron sin índice en la primera pasada.

-- Booking: crm_blocked_slots se consulta por calendar_id + date en cada booking
CREATE INDEX IF NOT EXISTS idx_crm_blocked_slots_calendar_date
  ON crm_blocked_slots (calendar_id, date);

-- Activación SaaS: CrmSetup consulta por client_user_id
CREATE INDEX IF NOT EXISTS idx_crm_client_accounts_client_user_id
  ON crm_client_accounts (client_user_id);

-- Notas de contacto: siempre se cargan por contact_id
CREATE INDEX IF NOT EXISTS idx_crm_contact_notes_contact_id
  ON crm_contact_notes (contact_id);

-- Submissions de formularios: listados por form_id
CREATE INDEX IF NOT EXISTS idx_crm_form_submissions_form_id
  ON crm_form_submissions (form_id, created_at DESC);

-- Pipelines por dueño (carga del CRM principal)
CREATE INDEX IF NOT EXISTS idx_crm_pipelines_user_id
  ON crm_pipelines (user_id);

-- Servicios por dueño (carga de landing y CRM)
CREATE INDEX IF NOT EXISTS idx_crm_services_user_id_active
  ON crm_services (user_id, active);

-- Staff: auth flow consulta por staff_user_id para resolver permisos
CREATE INDEX IF NOT EXISTS idx_crm_staff_staff_user_id
  ON crm_staff (staff_user_id);

-- Mensajes de soporte: hilo de ticket cargado por ticket_id
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id
  ON support_messages (ticket_id, created_at);
