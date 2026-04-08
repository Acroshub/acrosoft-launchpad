-- Fix: add DELETE RLS policy on crm_calendar_config
-- Run this in Supabase > SQL Editor

-- Make sure RLS is enabled (idempotent)
ALTER TABLE crm_calendar_config ENABLE ROW LEVEL SECURITY;

-- Add DELETE policy if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'crm_calendar_config'
      AND policyname = 'Users can delete own calendar config'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Users can delete own calendar config"
        ON crm_calendar_config FOR DELETE
        USING (auth.uid() = user_id);
    $policy$;
  END IF;
END $$;
