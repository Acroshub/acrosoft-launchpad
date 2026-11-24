-- Consentimiento de SMS en el calendario público.
--
-- Un calendario con sms_reminders_enabled = true muestra, en el formulario de reserva, un checkbox
-- SEPARADO (sin marcar, opcional) para aceptar recordatorios por SMS de Acros Software en nombre del
-- negocio. Twilio exige que el consentimiento se pida en su propio checkbox, no mezclado con los términos.
-- crm-calendar-book guarda la prueba (fecha, texto exacto, calendario) en crm_contacts.custom_fields._sms_consent.
ALTER TABLE public.crm_calendar_config
  ADD COLUMN IF NOT EXISTS sms_reminders_enabled boolean NOT NULL DEFAULT false;

-- GH tree services and landscaping: primer calendario con SMS.
UPDATE public.crm_calendar_config
   SET sms_reminders_enabled = true
 WHERE id = 'cdf76e4d-b80f-40d2-bbd8-e7b09f2a6c97';
