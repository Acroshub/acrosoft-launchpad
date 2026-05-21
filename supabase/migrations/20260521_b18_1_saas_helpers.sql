-- B18-1 · Función auxiliar para activate-saas-client
-- Busca el user_id de auth.users por email usando SECURITY DEFINER
-- Solo service_role puede llamarla (edge functions con clave de servicio)

CREATE OR REPLACE FUNCTION get_user_id_by_email(lookup_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth
AS $$
  SELECT id FROM auth.users WHERE email = lookup_email LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION get_user_id_by_email(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_user_id_by_email(text) FROM anon;
REVOKE EXECUTE ON FUNCTION get_user_id_by_email(text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION get_user_id_by_email(text) TO service_role;
