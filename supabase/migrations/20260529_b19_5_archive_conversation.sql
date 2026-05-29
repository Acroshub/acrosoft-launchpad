-- B19-5: Archivar Conversación
ALTER TABLE crm_wa_conversations
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;
