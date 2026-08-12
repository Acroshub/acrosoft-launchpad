create or replace function admin_push_subscriptions_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case when is_acrosoft_admin() then (select count(*)::integer from crm_push_subscriptions) else 0 end;
$$;
