-- ── SEC-7 · Database indexes ──────────────────────────────────────────────────
-- Covers the most queried tables/columns to avoid full table scans at scale.

CREATE INDEX IF NOT EXISTS idx_crm_contacts_user_created
  ON crm_contacts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_appointments_user_date_status
  ON crm_appointments (user_id, date, status);

CREATE INDEX IF NOT EXISTS idx_crm_appointments_calendar_date
  ON crm_appointments (calendar_id, date);

CREATE INDEX IF NOT EXISTS idx_crm_reminders_user_status_scheduled
  ON crm_reminders (user_id, status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_crm_reminder_queue_status_created
  ON crm_reminder_queue (status, created_at);

CREATE INDEX IF NOT EXISTS idx_crm_sales_user_created
  ON crm_sales (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_contact_pipeline_memberships_pipeline_stage
  ON crm_contact_pipeline_memberships (pipeline_id, stage);

CREATE INDEX IF NOT EXISTS idx_crm_tasks_pipeline_stage_position
  ON crm_tasks (pipeline_id, stage, position);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_status
  ON support_tickets (user_id, status);
