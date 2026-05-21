-- B18-2 · Transcripción de mensajes de voz (Groq Whisper)
-- Agrega columna para cachear la transcripción y no volver a llamar a Groq

ALTER TABLE crm_wa_messages ADD COLUMN IF NOT EXISTS transcription text;
