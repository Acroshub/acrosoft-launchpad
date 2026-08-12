-- Lista de negocios (Dueños de Negocio) que tienen al menos un dispositivo con
-- notificaciones push activadas (ellos mismos o su Staff), con el conteo de
-- dispositivos por negocio. Sirve para: (1) filtrar el selector "Un negocio
-- específico" a solo negocios que realmente pueden recibir push, y (2) mostrar
-- el desglose al elegir "Todos los usuarios".
create or replace function admin_push_tenant_subscription_counts()
returns table(client_user_id uuid, client_email text, subscriber_count integer)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not is_acrosoft_admin() then
    return;
  end if;

  return query
    select
      ca.client_user_id,
      ca.client_email,
      count(distinct ps.id)::integer as subscriber_count
    from crm_client_accounts ca
    left join crm_staff st
      on st.owner_user_id = ca.client_user_id and st.status = 'active'
    left join crm_push_subscriptions ps
      on ps.user_id = ca.client_user_id or ps.user_id = st.staff_user_id
    where ca.status = 'active' and ca.client_user_id is not null
    group by ca.client_user_id, ca.client_email
    having count(distinct ps.id) > 0
    order by ca.client_email;
end;
$$;

revoke all on function admin_push_tenant_subscription_counts() from public;
grant execute on function admin_push_tenant_subscription_counts() to authenticated;
