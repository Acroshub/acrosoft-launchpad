-- B19-7: Indicador "Escribiendo..." de la IA
ALTER TABLE crm_wa_conversations
  ADD COLUMN IF NOT EXISTS ai_typing boolean NOT NULL DEFAULT false;
