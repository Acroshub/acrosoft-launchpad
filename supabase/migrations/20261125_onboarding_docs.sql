-- «Onboarding para Google Ads»: copia editable de las respuestas del formulario «Onboarding Acros», abierta con un link público
-- (/onboarding-google/:token). El documento es independiente de la ficha: editarlo no cambia crm_contacts.
--
-- Quién hace qué:
--  - CRM (authenticated): crea el documento y lee su token, solo si puede ver el contacto (la subconsulta a crm_contacts respeta su RLS:
--    dueño, o staff con permiso de lectura y sin contactos VIP). El único cambio permitido es reasignar contact_id al fusionar contactos.
--  - Público (con el link): lee y edita el texto SOLO a través de la Edge Function onboarding-doc (service role). anon no toca la tabla.
CREATE TABLE IF NOT EXISTS public.crm_onboarding_docs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token        text NOT NULL UNIQUE DEFAULT (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  user_id      uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  -- Borrar el contacto borra el documento: el link deja de funcionar.
  contact_id   uuid NOT NULL UNIQUE REFERENCES public.crm_contacts (id) ON DELETE CASCADE,
  content_html text NOT NULL CHECK (char_length(content_html) <= 100000),
  version      integer NOT NULL DEFAULT 1,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_onboarding_docs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.crm_onboarding_docs FROM anon, authenticated;
GRANT SELECT ON public.crm_onboarding_docs TO authenticated;
GRANT INSERT (user_id, contact_id, content_html) ON public.crm_onboarding_docs TO authenticated;
GRANT UPDATE (contact_id) ON public.crm_onboarding_docs TO authenticated;

CREATE POLICY "Ver documentos de contactos visibles" ON public.crm_onboarding_docs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.crm_contacts c
    WHERE c.id = crm_onboarding_docs.contact_id AND c.user_id = crm_onboarding_docs.user_id
  ));

CREATE POLICY "Crear documentos de contactos visibles" ON public.crm_onboarding_docs
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.crm_contacts c
    WHERE c.id = crm_onboarding_docs.contact_id AND c.user_id = crm_onboarding_docs.user_id
  ));

CREATE POLICY "Reasignar documento al fusionar contactos" ON public.crm_onboarding_docs
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.crm_contacts c
    WHERE c.id = crm_onboarding_docs.contact_id AND c.user_id = crm_onboarding_docs.user_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.crm_contacts c
    WHERE c.id = crm_onboarding_docs.contact_id AND c.user_id = crm_onboarding_docs.user_id
  ));
