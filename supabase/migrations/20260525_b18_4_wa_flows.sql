-- B18-4 / B18-5: Flow Builder — tabla de flujos del Agente IA
CREATE TABLE IF NOT EXISTS crm_wa_flows (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text    NOT NULL,
  trigger_text  text    NOT NULL DEFAULT '',
  sequence_id   uuid    REFERENCES crm_wa_sequences(id) ON DELETE SET NULL,
  final_action  text    NOT NULL DEFAULT 'nothing',
  -- final_action: 'nothing' | 'human_handoff' | 'book_appointment'
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE crm_wa_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner" ON crm_wa_flows
  USING (user_id = auth.uid());
