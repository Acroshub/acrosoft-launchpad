-- ══════════════════════════════════════════════════════════════════════════════
-- Public RLS para crm_services (solo servicios activos)
-- ──────────────────────────────────────────────────────────────────────────────
-- Necesario para que la landing page cargue los servicios del Admin sin autenticación.
-- Solo expone servicios con active = true.
-- ══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'crm_services'
      AND policyname = 'Public can read active services'
  ) THEN
    CREATE POLICY "Public can read active services"
      ON crm_services FOR SELECT
      USING (active = true);
  END IF;
END $$;
