-- ══════════════════════════════════════════════════════════════════════════════
-- A-3: RLS para crm_client_accounts — acceso del cliente SaaS
-- ──────────────────────────────────────────────────────────────────────────────
-- Problema: la política actual solo permite al Admin leer/escribir.
-- La página /crm-setup necesita que el cliente pueda actualizar su propio
-- registro (status → 'active') al aceptar la invitación.
-- ══════════════════════════════════════════════════════════════════════════════

-- Cliente puede leer su propio registro (necesario para /crm-setup)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'crm_client_accounts'
      AND policyname = 'Client can view own account'
  ) THEN
    CREATE POLICY "Client can view own account"
      ON crm_client_accounts FOR SELECT
      USING (client_user_id = auth.uid());
  END IF;
END $$;

-- Cliente puede actualizar solo su propio registro (status y campos de setup)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'crm_client_accounts'
      AND policyname = 'Client can update own account status'
  ) THEN
    CREATE POLICY "Client can update own account status"
      ON crm_client_accounts FOR UPDATE
      USING (client_user_id = auth.uid())
      WITH CHECK (client_user_id = auth.uid());
  END IF;
END $$;
