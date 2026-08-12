-- Reasigna la fila de crm_push_subscriptions al usuario actual si el mismo endpoint de
-- navegador ya estaba registrado por otro usuario (dispositivo compartido) — evita el
-- unique-violation que la RLS "owner" produciría en un upsert directo desde el cliente.
create or replace function upsert_push_subscription(
  p_endpoint text, p_p256dh text, p_auth text, p_device_type text, p_user_agent text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authorized';
  end if;

  insert into crm_push_subscriptions (user_id, endpoint, p256dh, auth_key, device_type, user_agent, last_seen_at)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, p_device_type, p_user_agent, now())
  on conflict (endpoint) do update set
    user_id      = auth.uid(),
    p256dh       = excluded.p256dh,
    auth_key     = excluded.auth_key,
    device_type  = excluded.device_type,
    user_agent   = excluded.user_agent,
    last_seen_at = now();
end;
$$;

revoke all on function upsert_push_subscription(text, text, text, text, text) from public;
grant execute on function upsert_push_subscription(text, text, text, text, text) to authenticated;
