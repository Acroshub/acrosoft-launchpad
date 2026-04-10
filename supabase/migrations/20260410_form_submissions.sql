-- ══════════════════════════════════════════════════════════════════════════════
-- Create crm_form_submissions table
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS crm_form_submissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  form_id     uuid NOT NULL REFERENCES crm_forms(id) ON DELETE CASCADE,
  data        jsonb NOT NULL DEFAULT '{}'
);

-- RLS: owners can read their own form submissions
ALTER TABLE crm_form_submissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'crm_form_submissions'
      AND policyname = 'Owners can read their form submissions'
  ) THEN
    CREATE POLICY "Owners can read their form submissions"
      ON crm_form_submissions FOR SELECT
      USING (
        form_id IN (
          SELECT id FROM crm_forms WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Service role (edge functions) can insert — bypasses RLS automatically.
-- No insert policy needed for anon; the edge function uses service role key.
