-- B18-6: Ejecución de modo FLOW en ai-agent
-- Añade estado de flujo activo a las conversaciones
ALTER TABLE crm_wa_conversations
  ADD COLUMN IF NOT EXISTS active_flow_id uuid REFERENCES crm_wa_flows(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS flow_step int NOT NULL DEFAULT 0;
