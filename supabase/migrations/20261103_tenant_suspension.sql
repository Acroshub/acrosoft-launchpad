-- Suspensión de tenants (clientes SaaS con servicio sin pagar).
--
-- Antes: suspender a un cliente solo mostraba una pantalla de "Cuenta deshabilitada" en el
-- frontend, y solo a quien tuviera account_type = 'saas_client'. Su staff entraba igual y todo
-- el backend (agente IA, automatizaciones, campañas, recordatorios…) seguía ejecutándose.
--
-- Ahora hay UNA fuente de verdad: crm_client_accounts.status = 'disabled'. De ahí cuelgan:
--   1. Auth: un trigger banea (auth.users.banned_until) al dueño y a su staff → no pueden
--      iniciar sesión ni renovar el token. Reactivar la cuenta los desbanea.
--   2. Frontend: my_access_blocked() decide si se muestra la pantalla de suspensión.
--   3. Edge Functions: is_tenant_suspended() / suspended_tenant_ids() para cortar el gasto
--      (agente IA, webhook de WhatsApp, crons, campañas…).

-- ─── ¿Está suspendido este tenant? ───────────────────────────────────────────────────────────
-- Recibe el id de un dueño de negocio. Si recibe el de un staff, resuelve a su dueño.
CREATE OR REPLACE FUNCTION public.is_tenant_suspended(p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.crm_client_accounts ca
    WHERE ca.status = 'disabled'
      AND ca.client_user_id IS NOT NULL
      AND ca.client_user_id IN (
        p_user_id,
        COALESCE(
          (SELECT s.owner_user_id FROM public.crm_staff s
            WHERE s.staff_user_id = p_user_id AND s.status <> 'inactive' LIMIT 1),
          p_user_id
        )
      )
  );
$$;

-- Todos los tenants suspendidos, de una vez (para los crons, que recorren muchos).
CREATE OR REPLACE FUNCTION public.suspended_tenant_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT client_user_id
  FROM public.crm_client_accounts
  WHERE status = 'disabled' AND client_user_id IS NOT NULL;
$$;

-- ─── ¿Debe estar bloqueado este usuario? ─────────────────────────────────────────────────────
-- Sí si su propia cuenta de cliente está deshabilitada, o si es staff y TODOS los negocios a
-- los que pertenece están suspendidos (un staff de dos negocios no cae por uno solo).
CREATE OR REPLACE FUNCTION public.user_access_blocked(p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.crm_client_accounts ca
      WHERE ca.client_user_id = p_user_id AND ca.status = 'disabled'
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.crm_staff s
        WHERE s.staff_user_id = p_user_id AND s.status <> 'inactive'
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.crm_staff s
        WHERE s.staff_user_id = p_user_id AND s.status <> 'inactive'
          AND NOT EXISTS (
            SELECT 1 FROM public.crm_client_accounts ca
            WHERE ca.client_user_id = s.owner_user_id AND ca.status = 'disabled'
          )
      )
    );
$$;

-- Para el frontend: ¿el usuario logueado está bloqueado?
CREATE OR REPLACE FUNCTION public.my_access_blocked()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(public.user_access_blocked(auth.uid()), false);
$$;

-- ─── Ban / desban en Auth ────────────────────────────────────────────────────────────────────
-- Equivale a ban_duration = '876000h' del Admin API (100 años). No se usa 'infinity' porque
-- GoTrue lo lee como timestamptz y un valor no representable rompería el login de ese usuario.
-- Al desbanear solo se levanta el ban que pone esta función (≥ 50 años): un ban manual más
-- corto que alguien haya puesto a mano no se toca.
CREATE OR REPLACE FUNCTION public.sync_user_ban(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE
  v_email text;
BEGIN
  IF p_user_id IS NULL THEN RETURN; END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  -- El superadmin jamás se banea, pase lo que pase con los datos.
  IF v_email IS NULL OR lower(v_email) = 'e.daniel.acero.r@gmail.com' THEN RETURN; END IF;

  IF public.user_access_blocked(p_user_id) THEN
    UPDATE auth.users
       SET banned_until = now() + interval '100 years'
     WHERE id = p_user_id
       AND (banned_until IS NULL OR banned_until < now() + interval '50 years');
  ELSE
    UPDATE auth.users
       SET banned_until = NULL
     WHERE id = p_user_id
       AND banned_until >= now() + interval '50 years';
  END IF;
END;
$$;

-- Al cambiar una cuenta de cliente: re-evaluar al cliente y a todo su staff.
CREATE OR REPLACE FUNCTION public.trg_client_account_sync_bans()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE
  v_owner uuid := COALESCE(NEW.client_user_id, OLD.client_user_id);
  v_uid   uuid;
BEGIN
  IF v_owner IS NULL THEN RETURN NULL; END IF;

  PERFORM public.sync_user_ban(v_owner);
  FOR v_uid IN
    SELECT DISTINCT staff_user_id FROM public.crm_staff
     WHERE owner_user_id = v_owner AND staff_user_id IS NOT NULL
  LOOP
    PERFORM public.sync_user_ban(v_uid);
  END LOOP;

  -- Si se cambió el usuario vinculado a la cuenta, el anterior también se re-evalúa.
  IF TG_OP = 'UPDATE' AND OLD.client_user_id IS DISTINCT FROM NEW.client_user_id THEN
    PERFORM public.sync_user_ban(OLD.client_user_id);
  END IF;
  RETURN NULL;
END;
$$;

-- Al cambiar el staff: un staff nuevo de un negocio suspendido nace bloqueado, y uno que se
-- da de baja queda libre si el único motivo del bloqueo era ese negocio.
CREATE OR REPLACE FUNCTION public.trg_staff_sync_bans()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
BEGIN
  IF TG_OP <> 'DELETE' THEN PERFORM public.sync_user_ban(NEW.staff_user_id); END IF;
  IF TG_OP <> 'INSERT' AND (TG_OP = 'DELETE' OR OLD.staff_user_id IS DISTINCT FROM NEW.staff_user_id) THEN
    PERFORM public.sync_user_ban(OLD.staff_user_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS sync_bans_on_client_account ON public.crm_client_accounts;
CREATE TRIGGER sync_bans_on_client_account
  AFTER INSERT OR DELETE OR UPDATE OF status, client_user_id ON public.crm_client_accounts
  FOR EACH ROW EXECUTE FUNCTION public.trg_client_account_sync_bans();

DROP TRIGGER IF EXISTS sync_bans_on_staff ON public.crm_staff;
CREATE TRIGGER sync_bans_on_staff
  AFTER INSERT OR DELETE OR UPDATE OF status, staff_user_id, owner_user_id ON public.crm_staff
  FOR EACH ROW EXECUTE FUNCTION public.trg_staff_sync_bans();

-- ─── Permisos ────────────────────────────────────────────────────────────────────────────────
-- Ninguna de estas debe poder llamarla un anónimo: revelaría qué clientes están suspendidos.
REVOKE ALL ON FUNCTION public.is_tenant_suspended(uuid)      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.suspended_tenant_ids()         FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.user_access_blocked(uuid)      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_user_ban(uuid)            FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_client_account_sync_bans() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_staff_sync_bans()          FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.my_access_blocked()            FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_tenant_suspended(uuid)   TO service_role;
GRANT EXECUTE ON FUNCTION public.suspended_tenant_ids()      TO service_role;
GRANT EXECUTE ON FUNCTION public.user_access_blocked(uuid)   TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_user_ban(uuid)         TO service_role;
GRANT EXECUTE ON FUNCTION public.my_access_blocked()         TO authenticated, service_role;
