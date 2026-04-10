-- ══════════════════════════════════════════════════════════════════════════════
-- Facebook Pixel support + public RLS for CalendarRenderer
-- Run in: Supabase → SQL Editor
-- ══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Add facebook_pixel_id column to crm_forms ────────────────────────────
ALTER TABLE crm_forms
  ADD COLUMN IF NOT EXISTS facebook_pixel_id text;

-- ─── 2. Public read on crm_calendar_config ───────────────────────────────────
-- Needed so CalendarRenderer can load calendar settings without auth.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'crm_calendar_config'
      AND policyname = 'Public can read calendar config'
  ) THEN
    CREATE POLICY "Public can read calendar config"
      ON crm_calendar_config FOR SELECT
      USING (true);
  END IF;
END $$;

-- ─── 3. Public read on crm_appointments ──────────────────────────────────────
-- Needed so CalendarRenderer can check which slots are already booked.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'crm_appointments'
      AND policyname = 'Public can read appointments'
  ) THEN
    CREATE POLICY "Public can read appointments"
      ON crm_appointments FOR SELECT
      USING (true);
  END IF;
END $$;

-- ─── 4. Public read on crm_blocked_slots ─────────────────────────────────────
-- Needed so CalendarRenderer can exclude blocked days/hours.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'crm_blocked_slots'
      AND policyname = 'Public can read blocked slots'
  ) THEN
    CREATE POLICY "Public can read blocked slots"
      ON crm_blocked_slots FOR SELECT
      USING (true);
  END IF;
END $$;
