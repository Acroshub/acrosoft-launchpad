-- ── SEC-12 cleanup · Remove duplicate crm_staff_has_perm() policies ───────────
-- These were created by a prior migration. The new inline subquery policies
-- (created in sec12_staff_granular_rls) are now the single source of truth.
-- Duplicates cause double evaluation on every query and some used wrong
-- perm names ('perm_recordatorios') or wrong action keys ('write').

-- crm_appointments
DROP POLICY IF EXISTS "Staff read appointments"   ON crm_appointments;
DROP POLICY IF EXISTS "Staff update appointments" ON crm_appointments;
DROP POLICY IF EXISTS "Staff delete appointments" ON crm_appointments;

-- crm_blocked_slots
DROP POLICY IF EXISTS "Staff read blocked_slots"   ON crm_blocked_slots;
DROP POLICY IF EXISTS "Staff update blocked_slots" ON crm_blocked_slots;
DROP POLICY IF EXISTS "Staff delete blocked_slots" ON crm_blocked_slots;
DROP POLICY IF EXISTS "Staff insert blocked_slots" ON crm_blocked_slots;

-- crm_business_profile
DROP POLICY IF EXISTS "Staff read business profile datos"   ON crm_business_profile;
DROP POLICY IF EXISTS "Staff update business profile datos" ON crm_business_profile;

-- crm_calendar_config
DROP POLICY IF EXISTS "Staff read calendar_config"   ON crm_calendar_config;
DROP POLICY IF EXISTS "Staff update calendar_config" ON crm_calendar_config;
DROP POLICY IF EXISTS "Staff delete calendar_config" ON crm_calendar_config;
DROP POLICY IF EXISTS "Staff insert calendar_config" ON crm_calendar_config;

-- crm_contacts
DROP POLICY IF EXISTS "Staff read contacts"   ON crm_contacts;
DROP POLICY IF EXISTS "Staff update contacts" ON crm_contacts;
DROP POLICY IF EXISTS "Staff delete contacts" ON crm_contacts;
DROP POLICY IF EXISTS "Staff insert contacts" ON crm_contacts;

-- crm_form_submissions
DROP POLICY IF EXISTS "Staff read form_submissions" ON crm_form_submissions;

-- crm_forms (old INSERT used 'write' action which doesn't exist)
DROP POLICY IF EXISTS "Staff read forms"   ON crm_forms;
DROP POLICY IF EXISTS "Staff update forms" ON crm_forms;
DROP POLICY IF EXISTS "Staff delete forms" ON crm_forms;
DROP POLICY IF EXISTS "Staff insert forms" ON crm_forms;

-- crm_pipelines
DROP POLICY IF EXISTS "Staff read pipelines"   ON crm_pipelines;
DROP POLICY IF EXISTS "Staff update pipelines" ON crm_pipelines;
DROP POLICY IF EXISTS "Staff delete pipelines" ON crm_pipelines;
DROP POLICY IF EXISTS "Staff insert pipelines" ON crm_pipelines;

-- crm_reminders (used non-existent 'perm_recordatorios' → always denied)
DROP POLICY IF EXISTS "Staff read reminders"   ON crm_reminders;
DROP POLICY IF EXISTS "Staff update reminders" ON crm_reminders;
DROP POLICY IF EXISTS "Staff delete reminders" ON crm_reminders;
DROP POLICY IF EXISTS "Staff insert reminders" ON crm_reminders;

-- crm_sales
DROP POLICY IF EXISTS "Staff read sales"   ON crm_sales;
DROP POLICY IF EXISTS "Staff update sales" ON crm_sales;
DROP POLICY IF EXISTS "Staff delete sales" ON crm_sales;
DROP POLICY IF EXISTS "Staff insert sales" ON crm_sales;

-- crm_services
DROP POLICY IF EXISTS "Staff read services"   ON crm_services;
DROP POLICY IF EXISTS "Staff update services" ON crm_services;
DROP POLICY IF EXISTS "Staff delete services" ON crm_services;
DROP POLICY IF EXISTS "Staff insert services" ON crm_services;

-- crm_tasks
DROP POLICY IF EXISTS "Staff read tasks"   ON crm_tasks;
DROP POLICY IF EXISTS "Staff update tasks" ON crm_tasks;
DROP POLICY IF EXISTS "Staff delete tasks" ON crm_tasks;
DROP POLICY IF EXISTS "Staff insert tasks" ON crm_tasks;

-- crm_reminder_config: old policy used perm_dashboard instead of perm_calendarios
DROP POLICY IF EXISTS "Staff read reminder_config" ON crm_reminder_config;


-- ── Fix: crm_reminder_queue — Staff INSERT ────────────────────────────────────
-- Original policy only allows owner (user_id = auth.uid()), blocking Staff
-- who create reminders on behalf of the owner.
CREATE POLICY "Staff can insert queue for owner reminders"
  ON crm_reminder_queue FOR INSERT
  WITH CHECK (
    reminder_id IN (
      SELECT r.id FROM crm_reminders r
      JOIN crm_staff s ON s.owner_user_id = r.user_id
      WHERE s.staff_user_id = auth.uid()
        AND s.status = 'active'
        AND (s.perm_calendarios->>'create')::boolean = true
    )
  );
