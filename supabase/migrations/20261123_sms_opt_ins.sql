-- Consentimientos de SMS dados en la página pública /sms-reminders (formulario de alta, sin reserva).
--
-- Es la prueba de consentimiento que pide Twilio/las operadoras: teléfono, texto exacto que vio la
-- persona y cuándo aceptó. Los consentimientos dados al reservar viven aparte, en
-- crm_contacts.custom_fields._sms_consent (ver crm-calendar-book). Antes de mandar un SMS hay que
-- mirar AMBOS sitios.
--
-- Solo escribe la Edge Function sms-opt-in con service role: RLS activado y SIN policies = ni anon
-- ni authenticated pueden leer ni escribir (un teléfono con su consentimiento es dato sensible).
CREATE TABLE IF NOT EXISTS public.sms_opt_ins (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone        text NOT NULL UNIQUE,            -- E.164, p. ej. +17812683755
  consent_text text NOT NULL,                   -- el texto exacto que vio la persona
  source       text NOT NULL DEFAULT 'web-form',
  granted_at   timestamptz NOT NULL DEFAULT now(),
  revoked_at   timestamptz,                     -- se llena cuando responde STOP (lo hará el canal SMS)
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_opt_ins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sms_opt_ins FROM anon, authenticated;
