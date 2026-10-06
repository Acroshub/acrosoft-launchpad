-- Compra confirmada por sesión de A/B: la marca /toefl-ty (misma página de gracias para /toefl y /toefl-mba)
-- con el id de la sesión que hizo clic en el CTA. Solo cuenta sesiones que ya hicieron clic (converted).
alter table public.ab_sessions
  add column if not exists purchased boolean not null default false,
  add column if not exists purchased_at timestamptz;

create or replace function public.ab_track_purchase(p_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update ab_sessions
     set purchased    = true,
         purchased_at = coalesce(purchased_at, now())
   where id = p_id
     and converted is true
     and created_at > now() - interval '3 days';
end;
$$;

revoke all on function public.ab_track_purchase(uuid) from public;
grant execute on function public.ab_track_purchase(uuid) to anon, authenticated, service_role;

create or replace view public.ab_stats as
 select kv.key as element_key,
        kv.value as variant,
        count(*)::integer as impressions,
        sum(case when s.converted then 1 else 0 end)::integer as conversions,
        sum(case when s.purchased then 1 else 0 end)::integer as purchases
   from ab_sessions s,
        lateral jsonb_each_text(s.variants) kv(key, value)
  group by kv.key, kv.value;
