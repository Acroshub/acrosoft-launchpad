-- ══════════════════════════════════════════════════════════════════════════════
-- Public RLS for crm_business_profile (branding colors)
-- ══════════════════════════════════════════════════════════════════════════════

-- ─── Public read on crm_business_profile ──────────────────────────────────────
-- Needed so CalendarRenderer and FormRenderer can load branding colors.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'crm_business_profile'
      AND policyname = 'Public can read business profile'
  ) THEN
    CREATE POLICY "Public can read business profile"
      ON crm_business_profile FOR SELECT
      USING (true);
  END IF;
END $$;
