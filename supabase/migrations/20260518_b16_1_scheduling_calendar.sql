-- B16-1: Agendamiento real con Agente IA
-- Vincula el agente IA a un calendario específico para detectar disponibilidad y crear citas

ALTER TABLE crm_ai_agent_config
  ADD COLUMN IF NOT EXISTS scheduling_calendar_id uuid
    REFERENCES crm_calendar_config(id) ON DELETE SET NULL;

-- Trigger: si el calendario se elimina (FK pone NULL), desactiva el toggle de agendar citas
CREATE OR REPLACE FUNCTION reset_can_book_on_calendar_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.scheduling_calendar_id IS NULL AND OLD.scheduling_calendar_id IS NOT NULL THEN
    NEW.can_book_appointments := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reset_can_book_on_calendar_delete ON crm_ai_agent_config;
CREATE TRIGGER trg_reset_can_book_on_calendar_delete
  BEFORE UPDATE ON crm_ai_agent_config
  FOR EACH ROW EXECUTE FUNCTION reset_can_book_on_calendar_delete();
