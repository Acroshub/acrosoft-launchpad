-- ══════════════════════════════════════════════════════════════════════════════
-- S-1: crm_appointments — añadir campo minute
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE crm_appointments
  ADD COLUMN IF NOT EXISTS minute int NOT NULL DEFAULT 0
    CHECK (minute >= 0 AND minute <= 59);


-- ══════════════════════════════════════════════════════════════════════════════
-- S-2: crm_blocked_slots — añadir calendar_id
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE crm_blocked_slots
  ADD COLUMN IF NOT EXISTS calendar_id uuid REFERENCES crm_calendar_config(id) ON DELETE CASCADE;


-- ══════════════════════════════════════════════════════════════════════════════
-- S-3: crm_calendar_config — campos de anticipación y rango de disponibilidad
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE crm_calendar_config
  ADD COLUMN IF NOT EXISTS min_advance_hours int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_future_days   int NOT NULL DEFAULT 60;


-- ══════════════════════════════════════════════════════════════════════════════
-- S-4: crm_services — añadir discount_pct
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE crm_services
  ADD COLUMN IF NOT EXISTS discount_pct numeric NOT NULL DEFAULT 0
    CHECK (discount_pct >= 0 AND discount_pct <= 100);


-- ══════════════════════════════════════════════════════════════════════════════
-- S-5: crm_business_profile — campo metrics_order para persistir orden de métricas
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE crm_business_profile
  ADD COLUMN IF NOT EXISTS metrics_order jsonb NOT NULL DEFAULT '[]'::jsonb;
