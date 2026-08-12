-- Incluye al propio Admin (Acros Software) como opción seleccionable en "Un negocio
-- específico": no tiene fila en crm_client_accounts (no es cliente SaaS de sí mismo),
-- pero puede tener dispositivos propios suscritos y quiere poder targetearlos para
-- pruebas sin mandarle nada a clientes reales (a diferencia de "Todos los usuarios").
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
    select ba.client_user_id, ba.client_email, ba.subscriber_count
    from (
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

      union all

      select
        auth.uid() as client_user_id,
        'Acros Software (tú)' as client_email,
        count(ps.id)::integer as subscriber_count
      from crm_push_subscriptions ps
      where ps.user_id = auth.uid()
    ) ba
    where ba.subscriber_count > 0
    order by ba.client_email;
end;
$$;

revoke all on function admin_push_tenant_subscription_counts() from public;
grant execute on function admin_push_tenant_subscription_counts() to authenticated;
