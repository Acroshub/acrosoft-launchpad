-- B19-9: Respuestas Rápidas con "/"
CREATE TABLE IF NOT EXISTS crm_quick_replies (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shortcut   text        NOT NULL,
  content    text        NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE crm_quick_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner" ON crm_quick_replies USING (user_id = auth.uid());
