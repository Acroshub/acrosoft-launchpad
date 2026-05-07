-- SEC-1: RLS audit fixes
-- 1. Fix crm_staff_has_perm: add missing perm_recordatorios case
-- 2. Add BEFORE UPDATE trigger to prevent staff from escalating their own permissions
-- 3. Drop 3 broken "Staff insert" policies (wrong perm key + wrong action)
-- 4. Drop duplicate "Form owner reads submissions" policy
-- 5. Recreate crm_contact_notes, crm_pipelines ALL policies with explicit WITH CHECK
-- 6. Recreate crm_tasks ALL policy with explicit WITH CHECK

-- ── 1. Fix crm_staff_has_perm ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION crm_staff_has_perm(owner_id uuid, perm_col text, action text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  perm jsonb;
BEGIN
  SELECT
    CASE perm_col
      WHEN 'perm_mi_negocio_datos'    THEN perm_mi_negocio_datos
      WHEN 'perm_mi_negocio_personal' THEN perm_mi_negocio_personal
      WHEN 'perm_servicios'           THEN perm_servicios
      WHEN 'perm_dashboard'           THEN perm_dashboard
      WHEN 'perm_ventas'              THEN perm_ventas
      WHEN 'perm_calendarios'         THEN perm_calendarios
      WHEN 'perm_formularios'         THEN perm_formularios
      WHEN 'perm_contactos'           THEN perm_contactos
      WHEN 'perm_pipeline'            THEN perm_pipeline
      WHEN 'perm_recordatorios'       THEN perm_recordatorios
    END
  INTO perm
  FROM crm_staff
  WHERE staff_user_id = auth.uid()
    AND owner_user_id = owner_id
    AND status        = 'active';

  RETURN coalesce((perm ->> action)::boolean, false);
END;
$$;

-- ── 2. Anti-privilege-escalation trigger ─────────────────────────────────────
CREATE OR REPLACE FUNCTION crm_staff_prevent_perm_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only blocks when the updater IS the staff member (not the owner, not service_role)
  IF auth.uid() = OLD.staff_user_id AND auth.uid() IS DISTINCT FROM OLD.owner_user_id THEN
    IF (
      NEW.perm_mi_negocio_datos    IS DISTINCT FROM OLD.perm_mi_negocio_datos    OR
      NEW.perm_mi_negocio_personal IS DISTINCT FROM OLD.perm_mi_negocio_personal OR
      NEW.perm_servicios           IS DISTINCT FROM OLD.perm_servicios           OR
      NEW.perm_dashboard           IS DISTINCT FROM OLD.perm_dashboard           OR
      NEW.perm_ventas              IS DISTINCT FROM OLD.perm_ventas              OR
      NEW.perm_calendarios         IS DISTINCT FROM OLD.perm_calendarios         OR
      NEW.perm_formularios         IS DISTINCT FROM OLD.perm_formularios         OR
      NEW.perm_contactos           IS DISTINCT FROM OLD.perm_contactos           OR
      NEW.perm_pipeline            IS DISTINCT FROM OLD.perm_pipeline            OR
      NEW.perm_recordatorios       IS DISTINCT FROM OLD.perm_recordatorios       OR
      NEW.perm_calendarios_items   IS DISTINCT FROM OLD.perm_calendarios_items   OR
      NEW.perm_formularios_items   IS DISTINCT FROM OLD.perm_formularios_items   OR
      NEW.perm_pipeline_items      IS DISTINCT FROM OLD.perm_pipeline_items
    ) THEN
      RAISE EXCEPTION 'Staff members cannot modify their own permissions';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crm_staff_perm_guard ON crm_staff;
CREATE TRIGGER crm_staff_perm_guard
  BEFORE UPDATE ON crm_staff
  FOR EACH ROW EXECUTE FUNCTION crm_staff_prevent_perm_escalation();

-- ── 3. Drop broken "Staff insert" policies ────────────────────────────────────
DROP POLICY IF EXISTS "Staff insert appointments"   ON crm_appointments;
DROP POLICY IF EXISTS "Staff insert blocked slots"  ON crm_blocked_slots;
DROP POLICY IF EXISTS "Staff insert contact notes"  ON crm_contact_notes;

-- ── 4. Drop duplicate form submissions read policy ────────────────────────────
DROP POLICY IF EXISTS "Form owner reads submissions" ON crm_form_submissions;

-- ── 5. Recreate crm_contact_notes ALL policy with WITH CHECK ─────────────────
DROP POLICY IF EXISTS "Users see own contact notes" ON crm_contact_notes;
CREATE POLICY "Users see own contact notes"
  ON crm_contact_notes
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Recreate Staff insert contact_notes with correct perm key
DROP POLICY IF EXISTS "Staff insert contact_notes" ON crm_contact_notes;
CREATE POLICY "Staff insert contact_notes"
  ON crm_contact_notes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_contacts c
      WHERE c.id = crm_contact_notes.contact_id
        AND crm_staff_has_perm(c.user_id, 'perm_contactos', 'edit')
    )
  );

-- ── 6. Recreate crm_pipelines ALL policy with WITH CHECK ─────────────────────
DROP POLICY IF EXISTS "Users manage own pipelines" ON crm_pipelines;
CREATE POLICY "Users manage own pipelines"
  ON crm_pipelines
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 7. Recreate crm_tasks ALL policy with WITH CHECK ─────────────────────────
DROP POLICY IF EXISTS "Users manage own tasks" ON crm_tasks;
CREATE POLICY "Users manage own tasks"
  ON crm_tasks
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Recreate Staff insert blocked_slots with correct perm key
DROP POLICY IF EXISTS "Staff insert blocked_slots" ON crm_blocked_slots;
CREATE POLICY "Staff insert blocked_slots"
  ON crm_blocked_slots
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_staff s
      WHERE s.staff_user_id = auth.uid()
        AND s.status = 'active'
        AND ((s.perm_calendarios ->> 'create')::boolean = true)
        AND crm_blocked_slots.user_id = s.owner_user_id
    )
  );
