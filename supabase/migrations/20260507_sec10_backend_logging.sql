-- ── SEC-10 · Backend audit logging via DB triggers ───────────────────────────
--
-- Replaces the client-side logAction() calls in useCrmData.ts with
-- SECURITY DEFINER trigger functions that fire automatically on every
-- INSERT / UPDATE / DELETE, including service_role writes.
--
-- auth.uid() returns NULL for service_role operations — that is expected
-- and acceptable; the trigger still captures the operation.
--
-- Fail-safe pattern: EXCEPTION WHEN OTHERS → RETURN COALESCE(NEW, OLD)
-- ensures logging never blocks the main write.

-- ── 1. Trigger function ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION _log_crm_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO crm_logs (user_id, performed_by_user_id, action, entity, entity_id, description)
    VALUES (
      COALESCE(
        (NEW->>'user_id')::uuid,
        (OLD->>'user_id')::uuid
      ),
      auth.uid(),
      LOWER(TG_OP),                          -- 'insert' | 'update' | 'delete'
      TG_TABLE_NAME,
      COALESCE(
        (NEW->>'id')::uuid,
        (OLD->>'id')::uuid
      ),
      TG_OP || ' on ' || TG_TABLE_NAME
    );
  EXCEPTION WHEN OTHERS THEN
    -- Logging is non-critical — never block the main operation
    NULL;
  END;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ── 2. Attach triggers to key tables ─────────────────────────────────────────

-- crm_contacts
DROP TRIGGER IF EXISTS trg_log_crm_contacts ON crm_contacts;
CREATE TRIGGER trg_log_crm_contacts
  AFTER INSERT OR UPDATE OR DELETE ON crm_contacts
  FOR EACH ROW EXECUTE FUNCTION _log_crm_change();

-- crm_appointments
DROP TRIGGER IF EXISTS trg_log_crm_appointments ON crm_appointments;
CREATE TRIGGER trg_log_crm_appointments
  AFTER INSERT OR UPDATE OR DELETE ON crm_appointments
  FOR EACH ROW EXECUTE FUNCTION _log_crm_change();

-- crm_blocked_slots
DROP TRIGGER IF EXISTS trg_log_crm_blocked_slots ON crm_blocked_slots;
CREATE TRIGGER trg_log_crm_blocked_slots
  AFTER INSERT OR UPDATE OR DELETE ON crm_blocked_slots
  FOR EACH ROW EXECUTE FUNCTION _log_crm_change();

-- crm_pipeline_deals
DROP TRIGGER IF EXISTS trg_log_crm_pipeline_deals ON crm_pipeline_deals;
CREATE TRIGGER trg_log_crm_pipeline_deals
  AFTER INSERT OR UPDATE OR DELETE ON crm_pipeline_deals
  FOR EACH ROW EXECUTE FUNCTION _log_crm_change();

-- crm_forms
DROP TRIGGER IF EXISTS trg_log_crm_forms ON crm_forms;
CREATE TRIGGER trg_log_crm_forms
  AFTER INSERT OR UPDATE OR DELETE ON crm_forms
  FOR EACH ROW EXECUTE FUNCTION _log_crm_change();

-- crm_services
DROP TRIGGER IF EXISTS trg_log_crm_services ON crm_services;
CREATE TRIGGER trg_log_crm_services
  AFTER INSERT OR UPDATE OR DELETE ON crm_services
  FOR EACH ROW EXECUTE FUNCTION _log_crm_change();

-- crm_sales
DROP TRIGGER IF EXISTS trg_log_crm_sales ON crm_sales;
CREATE TRIGGER trg_log_crm_sales
  AFTER INSERT OR UPDATE OR DELETE ON crm_sales
  FOR EACH ROW EXECUTE FUNCTION _log_crm_change();

-- crm_calendar_config
DROP TRIGGER IF EXISTS trg_log_crm_calendar_config ON crm_calendar_config;
CREATE TRIGGER trg_log_crm_calendar_config
  AFTER INSERT OR UPDATE OR DELETE ON crm_calendar_config
  FOR EACH ROW EXECUTE FUNCTION _log_crm_change();

-- crm_business_profile
DROP TRIGGER IF EXISTS trg_log_crm_business_profile ON crm_business_profile;
CREATE TRIGGER trg_log_crm_business_profile
  AFTER INSERT OR UPDATE OR DELETE ON crm_business_profile
  FOR EACH ROW EXECUTE FUNCTION _log_crm_change();

-- crm_pipelines
DROP TRIGGER IF EXISTS trg_log_crm_pipelines ON crm_pipelines;
CREATE TRIGGER trg_log_crm_pipelines
  AFTER INSERT OR UPDATE OR DELETE ON crm_pipelines
  FOR EACH ROW EXECUTE FUNCTION _log_crm_change();

-- crm_tasks
DROP TRIGGER IF EXISTS trg_log_crm_tasks ON crm_tasks;
CREATE TRIGGER trg_log_crm_tasks
  AFTER INSERT OR UPDATE OR DELETE ON crm_tasks
  FOR EACH ROW EXECUTE FUNCTION _log_crm_change();

-- crm_staff
DROP TRIGGER IF EXISTS trg_log_crm_staff ON crm_staff;
CREATE TRIGGER trg_log_crm_staff
  AFTER INSERT OR UPDATE OR DELETE ON crm_staff
  FOR EACH ROW EXECUTE FUNCTION _log_crm_change();

-- crm_reminders (INSERT only — status updates are internal pipeline state)
DROP TRIGGER IF EXISTS trg_log_crm_reminders ON crm_reminders;
CREATE TRIGGER trg_log_crm_reminders
  AFTER INSERT ON crm_reminders
  FOR EACH ROW EXECUTE FUNCTION _log_crm_change();

-- ── 3. Drop the permissive INSERT policy (writes now come from trigger only) ──

DROP POLICY IF EXISTS "Users can insert own logs" ON crm_logs;
