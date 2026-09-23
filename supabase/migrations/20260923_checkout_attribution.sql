-- Atribución de checkout para la Conversions API de Meta (ebook TOEFL).
--
-- Al hacer clic en un CTA, la landing guarda acá una fila con las cookies de Meta
-- (_fbp, _fbc) y pasa su id a Stripe dentro de client_reference_id
-- ("toefl-b2_<uuid>"). Cuando llega la compra, stripe-webhook lee esta fila y
-- manda a Meta el user agent y la IP del comprador (que Meta exige en eventos web
-- enviados por servidor) junto con fbp/fbc. Sin esto el evento del servidor solo
-- lleva el email y puede ser descartado.
--
-- Privacidad: contiene IP y user agent, así que
--   * el navegador solo puede INSERTAR (no leer) y solo las columnas id/fbp/fbc;
--   * la IP y el user agent los pone un trigger desde los headers de la petición
--     (el navegador no puede falsearlos ni enviarlos);
--   * solo la service role (el webhook) lee las filas;
--   * se borran solas a los 30 días.

create table if not exists public.checkout_attribution (
  id          uuid primary key,
  created_at  timestamptz not null default now(),
  fbp         text check (fbp is null or length(fbp) <= 200),
  fbc         text check (fbc is null or length(fbc) <= 300),
  user_agent  text,
  ip          text
);

comment on table public.checkout_attribution is
  'Cookies de Meta + user agent + IP de quien hizo clic en un CTA de compra. Solo lo lee stripe-webhook (service role). Se limpia a los 30 días.';

alter table public.checkout_attribution enable row level security;

drop policy if exists "checkout_attribution insert" on public.checkout_attribution;
create policy "checkout_attribution insert"
  on public.checkout_attribution
  for insert
  to anon, authenticated
  with check (true);

-- Supabase da todos los privilegios por defecto: se quitan y se deja solo INSERT de tres columnas.
revoke all on public.checkout_attribution from anon, authenticated;
grant insert (id, fbp, fbc) on public.checkout_attribution to anon, authenticated;

create or replace function public.checkout_attribution_fill_request()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  h json;
begin
  -- PostgREST expone los headers de la petición HTTP en este ajuste de sesión.
  begin
    h := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    h := null;
  end;

  new.user_agent := nullif(left(coalesce(h->>'user-agent', ''), 500), '');
  -- cf-connecting-ip lo pone Cloudflare (no lo controla el visitante); x-forwarded-for de respaldo.
  new.ip := nullif(left(btrim(split_part(coalesce(h->>'cf-connecting-ip', h->>'x-forwarded-for', ''), ',', 1)), 64), '');
  return new;
end;
$$;

revoke all on function public.checkout_attribution_fill_request() from public, anon, authenticated;

drop trigger if exists checkout_attribution_fill on public.checkout_attribution;
create trigger checkout_attribution_fill
  before insert on public.checkout_attribution
  for each row execute function public.checkout_attribution_fill_request();

-- Limpieza semanal (mismo patrón que cleanup-wa-inbox y compañía).
do $$
begin
  perform cron.unschedule('cleanup-checkout-attribution');
exception when others then
  null;
end;
$$;

select cron.schedule(
  'cleanup-checkout-attribution',
  '25 3 * * 0',
  $$delete from public.checkout_attribution where created_at < now() - interval '30 days'$$
);
