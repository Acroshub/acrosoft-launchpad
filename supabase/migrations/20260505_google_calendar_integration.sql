-- Add Google Calendar integration columns to crm_calendar_config
ALTER TABLE crm_calendar_config
ADD COLUMN IF NOT EXISTS google_token jsonb,
ADD COLUMN IF NOT EXISTS google_calendar_id text;

-- Add Google event tracking to crm_appointments
ALTER TABLE crm_appointments
ADD COLUMN IF NOT EXISTS google_event_id text;

-- Comment explaining the columns
COMMENT ON COLUMN crm_calendar_config.google_token IS 'OAuth token from Google: {access_token, refresh_token, expires_at, token_type, scope}';
COMMENT ON COLUMN crm_calendar_config.google_calendar_id IS 'Selected Google Calendar ID (email or calendar ID)';
COMMENT ON COLUMN crm_appointments.google_event_id IS 'Google Calendar event ID for synced appointments';
