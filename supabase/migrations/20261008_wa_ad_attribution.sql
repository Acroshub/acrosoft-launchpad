-- Atribución de anuncios Click-to-WhatsApp.
--
-- Meta manda un objeto `referral` en el primer mensaje que sigue al clic en un
-- anuncio (source_id = ID del anuncio, headline, body, source_url, ctwa_clid).
-- Antes se descartaba. Ahora:
--   * la conversación guarda el último anuncio que la originó;
--   * crm_wa_ad_sources lista cada anuncio visto y deja asignarle un producto
--     (y una instrucción extra) para que el agente venda lo correcto aunque el
--     cliente escriba un mensaje genérico.
-- Todo es aditivo: sin fila de mapeo con producto el agente se comporta como antes.

alter table public.crm_wa_conversations
  add column if not exists ad_source_id   text,
  add column if not exists ad_source_type text,
  add column if not exists ad_headline    text,
  add column if not exists ad_body        text,
  add column if not exists ad_source_url  text,
  add column if not exists ad_ctwa_clid   text,
  add column if not exists ad_referred_at timestamptz;

create table if not exists public.crm_wa_ad_sources (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  source_id         text not null,
  source_type       text,
  headline          text,
  body              text,
  source_url        text,
  label             text,
  product_id        uuid references public.crm_products(id) on delete set null,
  thumbnail_data    text check (thumbnail_data is null or length(thumbnail_data) <= 400000),
  first_seen_at     timestamptz not null default now(),
  last_seen_at      timestamptz not null default now(),
  unique (user_id, source_id)
);

comment on table public.crm_wa_ad_sources is
  'Anuncios Click-to-WhatsApp vistos por tenant (los registra whatsapp-webhook) y a qué producto corresponde cada uno.';

alter table public.crm_wa_ad_sources enable row level security;

create policy "owner" on public.crm_wa_ad_sources
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "staff_read_wa_ad_sources" on public.crm_wa_ad_sources
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.crm_staff s
      where s.owner_user_id = crm_wa_ad_sources.user_id
        and s.staff_user_id = auth.uid()
        and ((s.perm_agente_ia ->> 'read')::boolean) = true
    )
  );
