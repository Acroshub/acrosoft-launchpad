-- Allow multiple calendars per user
-- Run this in Supabase > SQL Editor

-- 1. Drop the unique constraint on user_id (if it exists under any name)
DO $$
DECLARE
  c_name text;
BEGIN
  SELECT conname INTO c_name
  FROM pg_constraint
  WHERE conrelid = 'crm_calendar_config'::regclass
    AND contype = 'u'
    AND array_to_string(
          ARRAY(SELECT a.attname FROM pg_attribute a
                WHERE a.attrelid = conrelid AND a.attnum = ANY(conkey)),
          ','
        ) = 'user_id';

  IF c_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE crm_calendar_config DROP CONSTRAINT %I', c_name);
  END IF;
END $$;

-- 2. Keep a non-unique index for efficient filtering by user
CREATE INDEX IF NOT EXISTS crm_calendar_config_user_id_idx ON crm_calendar_config (user_id);

-- 3. Ensure RLS policies exist for SELECT, INSERT, UPDATE, DELETE
ALTER TABLE crm_calendar_config ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='crm_calendar_config' AND policyname='Users can view own calendars') THEN
    EXECUTE $p$ CREATE POLICY "Users can view own calendars" ON crm_calendar_config FOR SELECT USING (auth.uid() = user_id); $p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='crm_calendar_config' AND policyname='Users can insert own calendars') THEN
    EXECUTE $p$ CREATE POLICY "Users can insert own calendars" ON crm_calendar_config FOR INSERT WITH CHECK (auth.uid() = user_id); $p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='crm_calendar_config' AND policyname='Users can update own calendars') THEN
    EXECUTE $p$ CREATE POLICY "Users can update own calendars" ON crm_calendar_config FOR UPDATE USING (auth.uid() = user_id); $p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='crm_calendar_config' AND policyname='Users can delete own calendars') THEN
    EXECUTE $p$ CREATE POLICY "Users can delete own calendars" ON crm_calendar_config FOR DELETE USING (auth.uid() = user_id); $p$;
  END IF;
END $$;
