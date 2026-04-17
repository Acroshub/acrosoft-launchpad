-- L-4: Change crm_forms.pipeline_id (uuid) → pipeline_ids (uuid[])
-- Migrates existing data and removes the old column.

ALTER TABLE crm_forms
  ADD COLUMN IF NOT EXISTS pipeline_ids uuid[] NOT NULL DEFAULT '{}';

-- Migrate existing single-pipeline references into the array
UPDATE crm_forms
  SET pipeline_ids = ARRAY[pipeline_id]
  WHERE pipeline_id IS NOT NULL;

ALTER TABLE crm_forms
  DROP COLUMN IF EXISTS pipeline_id;
