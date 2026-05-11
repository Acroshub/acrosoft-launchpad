-- ── SEC-12 · Granular Staff RLS — enforce perm_* columns per table ────────────
--
-- Replaces the broad "FOR ALL" Staff policies with 4 policies per table
-- (SELECT / INSERT / UPDATE / DELETE) that check the specific permission flag.
--
-- Pattern: (perm_X->>'action')::boolean = true
--   - Returns false when perm_X is NULL or key is missing → deny by default.
--   - Staff with perm_ventas = '{"read":true,"create":false,...}' can SELECT
--     but not INSERT/UPDATE/DELETE on crm_sales.

-- ─── crm_contacts (perm_contactos) ───────────────────────────────────────────
DROP POLICY IF EXISTS "Staff accede a contactos del dueno" ON crm_contacts;

CREATE POLICY "Staff lee contactos del dueno"
  ON crm_contacts FOR SELECT
  USING (
    user_id IN (
      SELECT owner_user_id FROM crm_staff
      WHERE staff_user_id = auth.uid() AND status = 'active'
        AND (perm_contactos->>'read')::boolean = true
    )
  );

CREATE POLICY "Staff crea contactos del dueno"
  ON crm_contacts FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT owner_user_id FROM crm_staff
      WHERE staff_user_id = auth.uid() AND status = 'active'
        AND (perm_contactos->>'create')::boolean = true
    )
  );

CREATE POLICY "Staff edita contactos del dueno"
  ON crm_contacts FOR UPDATE
  USING (
    user_id IN (
      SELECT owner_user_id FROM crm_staff
      WHERE staff_user_id = auth.uid() AND status = 'active'
        AND (perm_contactos->>'edit')::boolean = true
    )
  );

CREATE POLICY "Staff elimina contactos del dueno"
  ON crm_contacts FOR DELETE
  USING (
    user_id IN (
      SELECT owner_user_id FROM crm_staff
      WHERE staff_user_id = auth.uid() AND status = 'active'
        AND (perm_contactos->>'delete')::boolean = true
    )
  );


-- ─── crm_sales (perm_ventas) ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff accede a ventas del dueno" ON crm_sales;

CREATE POLICY "Staff lee ventas del dueno"
  ON crm_sales FOR SELECT
  USING (
    user_id IN (
      SELECT owner_user_id FROM crm_staff
      WHERE staff_user_id = auth.uid() AND status = 'active'
        AND (perm_ventas->>'read')::boolean = true
    )
  );

CREATE POLICY "Staff crea ventas del dueno"
  ON crm_sales FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT owner_user_id FROM crm_staff
      WHERE staff_user_id = auth.uid() AND status = 'active'
        AND (perm_ventas->>'create')::boolean = true
    )
  );

CREATE POLICY "Staff edita ventas del dueno"
  ON crm_sales FOR UPDATE
  USING (
    user_id IN (
      SELECT owner_user_id FROM crm_staff
      WHERE staff_user_id = auth.uid() AND status = 'active'
        AND (perm_ventas->>'edit')::boolean = true
    )
  );

CREATE POLICY "Staff elimina ventas del dueno"
  ON crm_sales FOR DELETE
  USING (
    user_id IN (
      SELECT owner_user_id FROM crm_staff
      WHERE staff_user_id = auth.uid() AND status = 'active'
        AND (perm_ventas->>'delete')::boolean = true
    )
  );


-- ─── crm_appointments (perm_calendarios) ─────────────────────────────────────
DROP POLICY IF EXISTS "Staff accede a citas del dueno" ON crm_appointments;

CREATE POLICY "Staff lee citas del dueno"
  ON crm_appointments FOR SELECT
  USING (
    user_id IN (
      SELECT owner_user_id FROM crm_staff
      WHERE staff_user_id = auth.uid() AND status = 'active'
        AND (perm_calendarios->>'read')::boolean = true
    )
  );

CREATE POLICY "Staff crea citas del dueno"
  ON crm_appointments FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT owner_user_id FROM crm_staff
      WHERE staff_user_id = auth.uid() AND status = 'active'
        AND (perm_calendarios->>'create')::boolean = true
    )
  );

CREATE POLICY "Staff edita citas del dueno"
  ON crm_appointments FOR UPDATE
  USING (
    user_id IN (
      SELECT owner_user_id FROM crm_staff
      WHERE staff_user_id = auth.uid() AND status = 'active'
        AND (perm_calendarios->>'edit')::boolean = true
    )
  );

CREATE POLICY "Staff elimina citas del dueno"
  ON crm_appointments FOR DELETE
  USING (
    user_id IN (
      SELECT owner_user_id FROM crm_staff
      WHERE staff_user_id = auth.uid() AND status = 'active'
        AND (perm_calendarios->>'delete')::boolean = true
    )
  );


-- ─── crm_blocked_slots (perm_calendarios) ────────────────────────────────────
DROP POLICY IF EXISTS "Staff accede a bloqueos del dueno" ON crm_blocked_slots;

CREATE POLICY "Staff lee bloqueos del dueno"
  ON crm_blocked_slots FOR SELECT
  USING (
    user_id IN (
      SELECT owner_user_id FROM crm_staff
      WHERE staff_user_id = auth.uid() AND status = 'active'
        AND (perm_calendarios->>'read')::boolean = true
    )
  );

CREATE POLICY "Staff crea bloqueos del dueno"
  ON crm_blocked_slots FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT owner_user_id FROM crm_staff
      WHERE staff_user_id = auth.uid() AND status = 'active'
        AND (perm_calendarios->>'create')::boolean = true
    )
  );

CREATE POLICY "Staff edita bloqueos del dueno"
  ON crm_blocked_slots FOR UPDATE
  USING (
    user_id IN (
      SELECT owner_user_id FROM crm_staff
      WHERE staff_user_id = auth.uid() AND status = 'active'
        AND (perm_calendarios->>'edit')::boolean = true
    )
  );

CREATE POLICY "Staff elimina bloqueos del dueno"
  ON crm_blocked_slots FOR DELETE
  USING (
    user_id IN (
      SELECT owner_user_id FROM crm_staff
      WHERE staff_user_id = auth.uid() AND status = 'active'
        AND (perm_calendarios->>'delete')::boolean = true
    )
  );


-- ─── crm_calendar_config (perm_calendarios) ───────────────────────────────────
DROP POLICY IF EXISTS "Staff accede a calendarios del dueno" ON crm_calendar_config;

CREATE POLICY "Staff lee calendarios del dueno"
  ON crm_calendar_config FOR SELECT
  USING (
    user_id IN (
      SELECT owner_user_id FROM crm_staff
      WHERE staff_user_id = auth.uid() AND status = 'active'
        AND (perm_calendarios->>'read')::boolean = true
    )
  );

CREATE POLICY "Staff crea calendarios del dueno"
  ON crm_calendar_config FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT owner_user_id FROM crm_staff
      WHERE staff_user_id = auth.uid() AND status = 'active'
        AND (perm_calendarios->>'create')::boolean = true
    )
  );

CREATE POLICY "Staff edita calendarios del dueno"
  ON crm_calendar_config FOR UPDATE
  USING (
    user_id IN (
      SELECT owner_user_id FROM crm_staff
      WHERE staff_user_id = auth.uid() AND status = 'active'
        AND (perm_calendarios->>'edit')::boolean = true
    )
  );

CREATE POLICY "Staff elimina calendarios del dueno"
  ON crm_calendar_config FOR DELETE
  USING (
    user_id IN (
      SELECT owner_user_id FROM crm_staff
      WHERE staff_user_id = auth.uid() AND status = 'active'
        AND (perm_calendarios->>'delete')::boolean = true
    )
  );


-- ─── crm_forms (perm_formularios) ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff accede a formularios del dueno" ON crm_forms;

CREATE POLICY "Staff lee formularios del dueno"
  ON crm_forms FOR SELECT
  USING (
    user_id IN (
      SELECT owner_user_id FROM crm_staff
      WHERE staff_user_id = auth.uid() AND status = 'active'
        AND (perm_formularios->>'read')::boolean = true
    )
  );

CREATE POLICY "Staff crea formularios del dueno"
  ON crm_forms FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT owner_user_id FROM crm_staff
      WHERE staff_user_id = auth.uid() AND status = 'active'
        AND (perm_formularios->>'create')::boolean = true
    )
  );

CREATE POLICY "Staff edita formularios del dueno"
  ON crm_forms FOR UPDATE
  USING (
    user_id IN (
      SELECT owner_user_id FROM crm_staff
      WHERE staff_user_id = auth.uid() AND status = 'active'
        AND (perm_formularios->>'edit')::boolean = true
    )
  );

CREATE POLICY "Staff elimina formularios del dueno"
  ON crm_forms FOR DELETE
  USING (
    user_id IN (
      SELECT owner_user_id FROM crm_staff
      WHERE staff_user_id = auth.uid() AND status = 'active'
        AND (perm_formularios->>'delete')::boolean = true
    )
  );


-- ─── crm_form_submissions (perm_formularios — read only for staff) ────────────
DROP POLICY IF EXISTS "Staff puede leer submissions del dueno" ON crm_form_submissions;

CREATE POLICY "Staff lee submissions del dueno"
  ON crm_form_submissions FOR SELECT
  USING (
    form_id IN (
      SELECT id FROM crm_forms
      WHERE user_id IN (
        SELECT owner_user_id FROM crm_staff
        WHERE staff_user_id = auth.uid() AND status = 'active'
          AND (perm_formularios->>'read')::boolean = true
      )
    )
  );


-- ─── crm_services (perm_servicios) ────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff accede a servicios del dueno" ON crm_services;

CREATE POLICY "Staff lee servicios del dueno"
  ON crm_services FOR SELECT
  USING (
    user_id IN (
      SELECT owner_user_id FROM crm_staff
      WHERE staff_user_id = auth.uid() AND status = 'active'
        AND (perm_servicios->>'read')::boolean = true
    )
  );

CREATE POLICY "Staff crea servicios del dueno"
  ON crm_services FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT owner_user_id FROM crm_staff
      WHERE staff_user_id = auth.uid() AND status = 'active'
        AND (perm_servicios->>'create')::boolean = true
    )
  );

CREATE POLICY "Staff edita servicios del dueno"
  ON crm_services FOR UPDATE
  USING (
    user_id IN (
      SELECT owner_user_id FROM crm_staff
      WHERE staff_user_id = auth.uid() AND status = 'active'
        AND (perm_servicios->>'edit')::boolean = true
    )
  );

CREATE POLICY "Staff elimina servicios del dueno"
  ON crm_services FOR DELETE
  USING (
    user_id IN (
      SELECT owner_user_id FROM crm_staff
      WHERE staff_user_id = auth.uid() AND status = 'active'
        AND (perm_servicios->>'delete')::boolean = true
    )
  );


-- ─── crm_pipelines (perm_pipeline) ────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff accede a pipelines del dueno" ON crm_pipelines;

CREATE POLICY "Staff lee pipelines del dueno"
  ON crm_pipelines FOR SELECT
  USING (
    user_id IN (
      SELECT owner_user_id FROM crm_staff
      WHERE staff_user_id = auth.uid() AND status = 'active'
        AND (perm_pipeline->>'read')::boolean = true
    )
  );

CREATE POLICY "Staff crea pipelines del dueno"
  ON crm_pipelines FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT owner_user_id FROM crm_staff
      WHERE staff_user_id = auth.uid() AND status = 'active'
        AND (perm_pipeline->>'create')::boolean = true
    )
  );

CREATE POLICY "Staff edita pipelines del dueno"
  ON crm_pipelines FOR UPDATE
  USING (
    user_id IN (
      SELECT owner_user_id FROM crm_staff
      WHERE staff_user_id = auth.uid() AND status = 'active'
        AND (perm_pipeline->>'edit')::boolean = true
    )
  );

CREATE POLICY "Staff elimina pipelines del dueno"
  ON crm_pipelines FOR DELETE
  USING (
    user_id IN (
      SELECT owner_user_id FROM crm_staff
      WHERE staff_user_id = auth.uid() AND status = 'active'
        AND (perm_pipeline->>'delete')::boolean = true
    )
  );


-- ─── crm_tasks (perm_pipeline) ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff accede a tareas del dueno" ON crm_tasks;

CREATE POLICY "Staff lee tareas del dueno"
  ON crm_tasks FOR SELECT
  USING (
    user_id IN (
      SELECT owner_user_id FROM crm_staff
      WHERE staff_user_id = auth.uid() AND status = 'active'
        AND (perm_pipeline->>'read')::boolean = true
    )
  );

CREATE POLICY "Staff crea tareas del dueno"
  ON crm_tasks FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT owner_user_id FROM crm_staff
      WHERE staff_user_id = auth.uid() AND status = 'active'
        AND (perm_pipeline->>'create')::boolean = true
    )
  );

CREATE POLICY "Staff edita tareas del dueno"
  ON crm_tasks FOR UPDATE
  USING (
    user_id IN (
      SELECT owner_user_id FROM crm_staff
      WHERE staff_user_id = auth.uid() AND status = 'active'
        AND (perm_pipeline->>'edit')::boolean = true
    )
  );

CREATE POLICY "Staff elimina tareas del dueno"
  ON crm_tasks FOR DELETE
  USING (
    user_id IN (
      SELECT owner_user_id FROM crm_staff
      WHERE staff_user_id = auth.uid() AND status = 'active'
        AND (perm_pipeline->>'delete')::boolean = true
    )
  );


-- ─── crm_reminders (perm_calendarios) ────────────────────────────────────────
DROP POLICY IF EXISTS "Staff accede a recordatorios del dueno" ON crm_reminders;

CREATE POLICY "Staff lee recordatorios del dueno"
  ON crm_reminders FOR SELECT
  USING (
    user_id IN (
      SELECT owner_user_id FROM crm_staff
      WHERE staff_user_id = auth.uid() AND status = 'active'
        AND (perm_calendarios->>'read')::boolean = true
    )
  );

CREATE POLICY "Staff crea recordatorios del dueno"
  ON crm_reminders FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT owner_user_id FROM crm_staff
      WHERE staff_user_id = auth.uid() AND status = 'active'
        AND (perm_calendarios->>'create')::boolean = true
    )
  );

CREATE POLICY "Staff edita recordatorios del dueno"
  ON crm_reminders FOR UPDATE
  USING (
    user_id IN (
      SELECT owner_user_id FROM crm_staff
      WHERE staff_user_id = auth.uid() AND status = 'active'
        AND (perm_calendarios->>'edit')::boolean = true
    )
  );

CREATE POLICY "Staff elimina recordatorios del dueno"
  ON crm_reminders FOR DELETE
  USING (
    user_id IN (
      SELECT owner_user_id FROM crm_staff
      WHERE staff_user_id = auth.uid() AND status = 'active'
        AND (perm_calendarios->>'delete')::boolean = true
    )
  );


-- ─── crm_reminder_config (perm_calendarios) ──────────────────────────────────
DROP POLICY IF EXISTS "Staff accede a config de recordatorios del dueno" ON crm_reminder_config;

CREATE POLICY "Staff lee config de recordatorios del dueno"
  ON crm_reminder_config FOR SELECT
  USING (
    user_id IN (
      SELECT owner_user_id FROM crm_staff
      WHERE staff_user_id = auth.uid() AND status = 'active'
        AND (perm_calendarios->>'read')::boolean = true
    )
  );

CREATE POLICY "Staff edita config de recordatorios del dueno"
  ON crm_reminder_config FOR UPDATE
  USING (
    user_id IN (
      SELECT owner_user_id FROM crm_staff
      WHERE staff_user_id = auth.uid() AND status = 'active'
        AND (perm_calendarios->>'edit')::boolean = true
    )
  );


-- ─── crm_business_profile (perm_mi_negocio_datos — read only) ────────────────
DROP POLICY IF EXISTS "Staff puede leer perfil del dueno" ON crm_business_profile;

CREATE POLICY "Staff lee perfil del dueno"
  ON crm_business_profile FOR SELECT
  USING (
    user_id IN (
      SELECT owner_user_id FROM crm_staff
      WHERE staff_user_id = auth.uid() AND status = 'active'
        AND (perm_mi_negocio_datos->>'read')::boolean = true
    )
  );
