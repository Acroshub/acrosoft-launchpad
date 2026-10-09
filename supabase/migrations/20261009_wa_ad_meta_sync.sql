-- Sincronización con la Marketing API: cuenta publicitaria por tenant, datos de
-- campaña/conjunto por anuncio y asignación de producto por campaña o conjunto
-- (los anuncios la heredan; la asignación directa del anuncio manda).

alter table public.crm_ai_agent_config
  add column if not exists ad_account_id text check (ad_account_id is null or ad_account_id ~ '^[0-9]{5,30}$');

alter table public.crm_wa_ad_sources
  add column if not exists ad_name text,
  add column if not exists campaign_id text,
  add column if not exists campaign_name text,
  add column if not exists adset_id text,
  add column if not exists adset_name text,
  add column if not exists effective_status text,
  add column if not exists synced_at timestamptz;

create table if not exists public.crm_wa_ad_groups (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('campaign','adset')),
  meta_id     text not null,
  name        text,
  product_id  uuid references public.crm_products(id) on delete set null,
  unique (user_id, meta_id)
);

alter table public.crm_wa_ad_groups enable row level security;

create policy "owner" on public.crm_wa_ad_groups
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "staff_read_wa_ad_groups" on public.crm_wa_ad_groups
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.crm_staff s
      where s.owner_user_id = crm_wa_ad_groups.user_id
        and s.staff_user_id = auth.uid()
        and ((s.perm_agente_ia ->> 'read')::boolean) = true
    )
  );

-- Varias cuentas publicitarias por tenant (reemplaza crm_ai_agent_config.ad_account_id).
create table if not exists public.crm_wa_ad_accounts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  account_id  text not null check (account_id ~ '^[0-9]{5,30}$'),
  name        text,
  created_at  timestamptz not null default now(),
  unique (user_id, account_id)
);

alter table public.crm_wa_ad_accounts enable row level security;

create policy "owner" on public.crm_wa_ad_accounts
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "staff_read_wa_ad_accounts" on public.crm_wa_ad_accounts
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.crm_staff s
      where s.owner_user_id = crm_wa_ad_accounts.user_id
        and s.staff_user_id = auth.uid()
        and ((s.perm_agente_ia ->> 'read')::boolean) = true
    )
  );

alter table public.crm_wa_ad_sources add column if not exists ad_account_id text;

insert into public.crm_wa_ad_accounts (user_id, account_id)
  select user_id, ad_account_id from public.crm_ai_agent_config where ad_account_id is not null
  on conflict do nothing;

alter table public.crm_ai_agent_config drop column if exists ad_account_id;
