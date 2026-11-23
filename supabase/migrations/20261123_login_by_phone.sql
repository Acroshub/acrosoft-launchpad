-- Login con número de teléfono además de email.
--
-- Supabase Auth no tiene el proveedor de teléfono activado (no hay SMS), así que el número se
-- resuelve a la cuenta de email del usuario en el servidor (Edge Function login-with-phone) y
-- ahí se hace el signInWithPassword normal. Esta función es la parte de búsqueda.
--
-- Fuentes del número (solo dígitos, comparados de forma exacta):
--   · auth.users.phone
--   · crm_staff.phone            (staff activo → su staff_user_id)
--   · crm_business_profile.contact_phone / whatsapp   (el dueño del negocio)
--
-- Devuelve el email SOLO si el número identifica a exactamente UN usuario. Si no existe o es
-- ambiguo (dos cuentas comparten número) devuelve NULL: falla cerrado, nunca elige una al azar.
-- Solo la ejecuta service_role (la Edge Function); nunca se expone al navegador, para que no
-- sirva como oráculo número → email.

CREATE OR REPLACE FUNCTION public.login_email_for_phone(p_digits text)
RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE
  v_digits     text := regexp_replace(coalesce(p_digits, ''), '\D', '', 'g');
  v_candidates text[];
  v_emails     text[];
BEGIN
  IF length(v_digits) < 7 THEN RETURN NULL; END IF;

  -- Número de EE.UU. escrito con o sin el 1 inicial.
  v_candidates := ARRAY[v_digits];
  IF length(v_digits) = 10 THEN
    v_candidates := v_candidates || ('1' || v_digits);
  ELSIF length(v_digits) = 11 AND left(v_digits, 1) = '1' THEN
    v_candidates := v_candidates || substr(v_digits, 2);
  END IF;

  SELECT array_agg(DISTINCT lower(u.email))
    INTO v_emails
    FROM auth.users u
   WHERE u.email IS NOT NULL
     AND u.deleted_at IS NULL
     AND u.id IN (
       SELECT id FROM auth.users
        WHERE regexp_replace(coalesce(phone, ''), '\D', '', 'g') = ANY (v_candidates)
       UNION
       SELECT staff_user_id FROM public.crm_staff
        WHERE staff_user_id IS NOT NULL
          AND status = 'active'
          AND regexp_replace(coalesce(phone, ''), '\D', '', 'g') = ANY (v_candidates)
       UNION
       SELECT user_id FROM public.crm_business_profile
        WHERE user_id IS NOT NULL
          AND (   regexp_replace(coalesce(contact_phone, ''), '\D', '', 'g') = ANY (v_candidates)
               OR regexp_replace(coalesce(whatsapp, ''), '\D', '', 'g')      = ANY (v_candidates))
     );

  IF array_length(v_emails, 1) = 1 THEN
    RETURN v_emails[1];
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.login_email_for_phone(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.login_email_for_phone(text) TO service_role;
