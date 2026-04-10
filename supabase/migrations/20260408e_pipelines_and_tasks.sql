-- ─── crm_pipelines ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_pipelines (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz DEFAULT now(),
  user_id       uuid        REFERENCES auth.users NOT NULL,
  name          text        NOT NULL,
  type          text        NOT NULL CHECK (type IN ('contacts', 'tasks')),
  column_names  text[]      NOT NULL DEFAULT '{}'
);

ALTER TABLE crm_pipelines ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users manage own pipelines" ON crm_pipelines
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── crm_tasks ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_tasks (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz DEFAULT now(),
  user_id      uuid        REFERENCES auth.users NOT NULL,
  pipeline_id  uuid        REFERENCES crm_pipelines(id) ON DELETE CASCADE NOT NULL,
  title        text        NOT NULL,
  description  text,
  priority     text        CHECK (priority IN ('low', 'medium', 'high')),
  stage        text        NOT NULL,
  position     integer     DEFAULT 0
);

ALTER TABLE crm_tasks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users manage own tasks" ON crm_tasks
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Allow crm_contacts.stage to hold any string ──────────────
-- (Pipeline column names are used as stage values)
DO $$ BEGIN
  ALTER TABLE crm_contacts DROP CONSTRAINT IF EXISTS crm_contacts_stage_check;
EXCEPTION WHEN others THEN NULL; END $$;
