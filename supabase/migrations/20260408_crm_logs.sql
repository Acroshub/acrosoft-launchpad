-- CRM Activity Logs
-- Run this in Supabase > SQL Editor

CREATE TABLE IF NOT EXISTS crm_logs (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at  timestamptz DEFAULT now() NOT NULL,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action      text        NOT NULL, -- 'create' | 'update' | 'delete'
  entity      text        NOT NULL, -- 'Contacto', 'Servicio', 'Deal', etc.
  entity_id   text,
  description text
);

ALTER TABLE crm_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logs"
  ON crm_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own logs"
  ON crm_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX crm_logs_user_created ON crm_logs (user_id, created_at DESC);
