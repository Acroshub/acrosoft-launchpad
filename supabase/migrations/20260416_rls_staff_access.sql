-- ══════════════════════════════════════════════════════════════════════════════
-- A-1: RLS para acceso de Staff a todas las tablas del CRM
-- ──────────────────────────────────────────────────────────────────────────────
-- Problema: las políticas actuales usan `auth.uid() = user_id`, pero el Staff
-- tiene su propio auth.uid() diferente al del Dueño de Negocio (owner_user_id).
-- Esto hace que el Staff reciba datos vacíos en todas las tablas.
--
-- Solución: para cada tabla CRM, añadir política adicional que permite al Staff
-- activo acceder a los datos de su empleador (owner_user_id).
--
-- Helper: la sub-consulta reutilizable
--   SELECT owner_user_id FROM crm_staff
--   WHERE staff_user_id = auth.uid() AND status = 'active'
-- ══════════════════════════════════════════════════════════════════════════════


-- ─── crm_staff — Staff puede leer su propio registro ──────────────────────────
-- (necesario para que useStaffPermissions() funcione)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='crm_staff' AND policyname='Staff can view own record') THEN
    CREATE POLICY "Staff can view own record"
      ON crm_staff FOR SELECT
      USING (staff_user_id = auth.uid());
  END IF;
END $$;


-- ─── crm_contacts ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='crm_contacts' AND policyname='Staff accede a contactos del dueno') THEN
    CREATE POLICY "Staff accede a contactos del dueno"
      ON crm_contacts FOR ALL
      USING (
        user_id IN (
          SELECT owner_user_id FROM crm_staff
          WHERE staff_user_id = auth.uid() AND status = 'active'
        )
      )
      WITH CHECK (
        user_id IN (
          SELECT owner_user_id FROM crm_staff
          WHERE staff_user_id = auth.uid() AND status = 'active'
        )
      );
  END IF;
END $$;


-- ─── crm_calendar_config ──────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='crm_calendar_config' AND policyname='Staff accede a calendarios del dueno') THEN
    CREATE POLICY "Staff accede a calendarios del dueno"
      ON crm_calendar_config FOR ALL
      USING (
        user_id IN (
          SELECT owner_user_id FROM crm_staff
          WHERE staff_user_id = auth.uid() AND status = 'active'
        )
      )
      WITH CHECK (
        user_id IN (
          SELECT owner_user_id FROM crm_staff
          WHERE staff_user_id = auth.uid() AND status = 'active'
        )
      );
  END IF;
END $$;


-- ─── crm_appointments ─────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='crm_appointments' AND policyname='Staff accede a citas del dueno') THEN
    CREATE POLICY "Staff accede a citas del dueno"
      ON crm_appointments FOR ALL
      USING (
        user_id IN (
          SELECT owner_user_id FROM crm_staff
          WHERE staff_user_id = auth.uid() AND status = 'active'
        )
      )
      WITH CHECK (
        user_id IN (
          SELECT owner_user_id FROM crm_staff
          WHERE staff_user_id = auth.uid() AND status = 'active'
        )
      );
  END IF;
END $$;


-- ─── crm_blocked_slots ────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='crm_blocked_slots' AND policyname='Staff accede a bloqueos del dueno') THEN
    CREATE POLICY "Staff accede a bloqueos del dueno"
      ON crm_blocked_slots FOR ALL
      USING (
        user_id IN (
          SELECT owner_user_id FROM crm_staff
          WHERE staff_user_id = auth.uid() AND status = 'active'
        )
      )
      WITH CHECK (
        user_id IN (
          SELECT owner_user_id FROM crm_staff
          WHERE staff_user_id = auth.uid() AND status = 'active'
        )
      );
  END IF;
END $$;


-- ─── crm_pipelines ────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='crm_pipelines' AND policyname='Staff accede a pipelines del dueno') THEN
    CREATE POLICY "Staff accede a pipelines del dueno"
      ON crm_pipelines FOR ALL
      USING (
        user_id IN (
          SELECT owner_user_id FROM crm_staff
          WHERE staff_user_id = auth.uid() AND status = 'active'
        )
      )
      WITH CHECK (
        user_id IN (
          SELECT owner_user_id FROM crm_staff
          WHERE staff_user_id = auth.uid() AND status = 'active'
        )
      );
  END IF;
END $$;


-- ─── crm_tasks ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='crm_tasks' AND policyname='Staff accede a tareas del dueno') THEN
    CREATE POLICY "Staff accede a tareas del dueno"
      ON crm_tasks FOR ALL
      USING (
        user_id IN (
          SELECT owner_user_id FROM crm_staff
          WHERE staff_user_id = auth.uid() AND status = 'active'
        )
      )
      WITH CHECK (
        user_id IN (
          SELECT owner_user_id FROM crm_staff
          WHERE staff_user_id = auth.uid() AND status = 'active'
        )
      );
  END IF;
END $$;


-- ─── crm_forms ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='crm_forms' AND policyname='Staff accede a formularios del dueno') THEN
    CREATE POLICY "Staff accede a formularios del dueno"
      ON crm_forms FOR ALL
      USING (
        user_id IN (
          SELECT owner_user_id FROM crm_staff
          WHERE staff_user_id = auth.uid() AND status = 'active'
        )
      )
      WITH CHECK (
        user_id IN (
          SELECT owner_user_id FROM crm_staff
          WHERE staff_user_id = auth.uid() AND status = 'active'
        )
      );
  END IF;
END $$;


-- ─── crm_form_submissions ────────────────────────────────────────────────────
-- No tiene user_id directo; se accede via crm_forms.user_id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='crm_form_submissions' AND policyname='Staff puede leer submissions del dueno') THEN
    CREATE POLICY "Staff puede leer submissions del dueno"
      ON crm_form_submissions FOR SELECT
      USING (
        form_id IN (
          SELECT id FROM crm_forms
          WHERE user_id IN (
            SELECT owner_user_id FROM crm_staff
            WHERE staff_user_id = auth.uid() AND status = 'active'
          )
        )
      );
  END IF;
END $$;


-- ─── crm_services ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='crm_services' AND policyname='Staff accede a servicios del dueno') THEN
    CREATE POLICY "Staff accede a servicios del dueno"
      ON crm_services FOR ALL
      USING (
        user_id IN (
          SELECT owner_user_id FROM crm_staff
          WHERE staff_user_id = auth.uid() AND status = 'active'
        )
      )
      WITH CHECK (
        user_id IN (
          SELECT owner_user_id FROM crm_staff
          WHERE staff_user_id = auth.uid() AND status = 'active'
        )
      );
  END IF;
END $$;


-- ─── crm_sales ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='crm_sales' AND policyname='Staff accede a ventas del dueno') THEN
    CREATE POLICY "Staff accede a ventas del dueno"
      ON crm_sales FOR ALL
      USING (
        user_id IN (
          SELECT owner_user_id FROM crm_staff
          WHERE staff_user_id = auth.uid() AND status = 'active'
        )
      )
      WITH CHECK (
        user_id IN (
          SELECT owner_user_id FROM crm_staff
          WHERE staff_user_id = auth.uid() AND status = 'active'
        )
      );
  END IF;
END $$;


-- ─── crm_business_profile ─────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='crm_business_profile' AND policyname='Staff puede leer perfil del dueno') THEN
    CREATE POLICY "Staff puede leer perfil del dueno"
      ON crm_business_profile FOR SELECT
      USING (
        user_id IN (
          SELECT owner_user_id FROM crm_staff
          WHERE staff_user_id = auth.uid() AND status = 'active'
        )
      );
  END IF;
END $$;


-- ─── crm_logs ─────────────────────────────────────────────────────────────────
-- Staff puede ver logs del dueño y los suyos propios.
-- Staff puede insertar sus propios logs (ya cubierto por la política existente).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='crm_logs' AND policyname='Staff puede ver logs del dueno') THEN
    CREATE POLICY "Staff puede ver logs del dueno"
      ON crm_logs FOR SELECT
      USING (
        user_id IN (
          SELECT owner_user_id FROM crm_staff
          WHERE staff_user_id = auth.uid() AND status = 'active'
        )
      );
  END IF;
END $$;

-- Staff puede insertar logs con su propio user_id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='crm_logs' AND policyname='Staff puede insertar sus logs') THEN
    CREATE POLICY "Staff puede insertar sus logs"
      ON crm_logs FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;


-- ─── crm_reminders ────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='crm_reminders' AND policyname='Staff accede a recordatorios del dueno') THEN
    CREATE POLICY "Staff accede a recordatorios del dueno"
      ON crm_reminders FOR ALL
      USING (
        user_id IN (
          SELECT owner_user_id FROM crm_staff
          WHERE staff_user_id = auth.uid() AND status = 'active'
        )
      )
      WITH CHECK (
        user_id IN (
          SELECT owner_user_id FROM crm_staff
          WHERE staff_user_id = auth.uid() AND status = 'active'
        )
      );
  END IF;
END $$;


-- ─── crm_reminder_config ──────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='crm_reminder_config' AND policyname='Staff accede a config de recordatorios del dueno') THEN
    CREATE POLICY "Staff accede a config de recordatorios del dueno"
      ON crm_reminder_config FOR ALL
      USING (
        user_id IN (
          SELECT owner_user_id FROM crm_staff
          WHERE staff_user_id = auth.uid() AND status = 'active'
        )
      )
      WITH CHECK (
        user_id IN (
          SELECT owner_user_id FROM crm_staff
          WHERE staff_user_id = auth.uid() AND status = 'active'
        )
      );
  END IF;
END $$;
