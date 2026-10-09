-- Etiquetas → eventos de la Conversions API de Meta para mensajería (Click-to-WhatsApp).
--
--   * crm_wa_labels.meta_event: evento que se envía a Meta cuando la etiqueta se aplica a un chat
--     (Purchase, LeadSubmitted, QualifiedLead, ...). Varias etiquetas pueden usar el mismo evento.
--   * crm_wa_labels.status: 'draft' = etiqueta sugerida a medio configurar; no la usa la IA ni
--     aparece al etiquetar chats. Guardarla desde el editor la activa.
--   * crm_wa_meta_events: cola/bitácora de envíos. La llena un trigger al aplicar la etiqueta y la
--     procesa la función wa-meta-events (cron cada minuto). Una fila por (chat, etiqueta): Meta no
--     deduplica, así que aquí se garantiza que cada etiqueta dispare su evento una sola vez por chat.
--   * crm_ai_agent_config: dataset de Meta, código de prueba opcional y marca de "sugeridas creadas".

alter table public.crm_wa_labels
  add column if not exists meta_event text
    check (meta_event is null or meta_event in (
      'Purchase','LeadSubmitted','QualifiedLead','InitiateCheckout','AddToCart','ViewContent',
      'OrderCreated','OrderShipped','OrderDelivered','OrderCanceled','OrderReturned',
      'CartAbandoned','RatingProvided','ReviewProvided')),
  add column if not exists status text not null default 'active' check (status in ('active','draft'));

alter table public.crm_ai_agent_config
  add column if not exists meta_dataset_id text,
  add column if not exists meta_test_event_code text,
  add column if not exists suggested_labels_seeded boolean not null default false;

create table if not exists public.crm_wa_meta_events (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.crm_wa_conversations(id) on delete cascade,
  label_id        uuid references public.crm_wa_labels(id) on delete set null,
  event_name      text not null,
  event_time      timestamptz not null default now(),
  status          text not null default 'pending' check (status in ('pending','sent','failed','skipped')),
  attempts        int not null default 0,
  next_attempt_at timestamptz not null default now(),
  value           numeric,
  currency        text,
  error           text,
  sent_at         timestamptz,
  created_at      timestamptz not null default now(),
  unique (conversation_id, label_id)
);

create index if not exists crm_wa_meta_events_pending_idx
  on public.crm_wa_meta_events (next_attempt_at) where status = 'pending';

alter table public.crm_wa_meta_events enable row level security;

-- Solo lectura para el dueño y su staff; escribe únicamente el servidor (service role).
create policy "owner_read" on public.crm_wa_meta_events
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.crm_staff s
      where s.owner_user_id = crm_wa_meta_events.user_id
        and s.staff_user_id = auth.uid()
        and ((s.perm_agente_ia ->> 'read')::boolean) = true
    )
  );

-- Al aplicar una etiqueta con evento de Meta se encola. Nunca debe romper el etiquetado (de ahí el
-- bloque de excepciones): el envío es un extra.
create or replace function public.enqueue_label_meta_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  lbl record;
begin
  begin
    select l.user_id, l.meta_event, l.status into lbl from public.crm_wa_labels l where l.id = new.label_id;
    if lbl.meta_event is not null and lbl.status = 'active' then
      insert into public.crm_wa_meta_events (user_id, conversation_id, label_id, event_name)
      values (lbl.user_id, new.conversation_id, new.label_id, lbl.meta_event)
      on conflict (conversation_id, label_id) do nothing;
    end if;
  exception when others then
    null;
  end;
  return new;
end;
$$;

revoke all on function public.enqueue_label_meta_event() from public, anon, authenticated;

drop trigger if exists crm_wa_conversation_labels_meta_event on public.crm_wa_conversation_labels;
create trigger crm_wa_conversation_labels_meta_event
  after insert on public.crm_wa_conversation_labels
  for each row execute function public.enqueue_label_meta_event();

-- Etiquetas sugeridas: se crean UNA vez por tenant, como borrador, cuando el dueño abre Etiquetas.
create or replace function public.seed_suggested_labels()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  done boolean;
begin
  if uid is null then return; end if;
  select suggested_labels_seeded into done from public.crm_ai_agent_config where user_id = uid;
  if done is distinct from false then return; end if;  -- sin config o ya sembradas

  insert into public.crm_wa_labels (user_id, name, color, hint, meta_event, status)
  select uid, v.name, v.color, v.hint, v.meta_event, 'draft'
  from (values
    ('Interesado', '#3b82f6', 'cuando el cliente muestra interés claro en el producto y pide más información o el precio', 'LeadSubmitted'),
    ('Calificado', '#8b5cf6', 'cuando el cliente confirma que el producto le sirve y tiene intención real de comprar', 'QualifiedLead'),
    ('Inició pago', '#f97316', 'cuando el cliente pide los datos de pago o el enlace para pagar', 'InitiateCheckout'),
    ('Compra',     '#22c55e', 'cuando el cliente confirma que realizó el pago', 'Purchase')
  ) as v(name, color, hint, meta_event)
  where not exists (
    select 1 from public.crm_wa_labels l where l.user_id = uid and lower(l.name) = lower(v.name)
  );

  update public.crm_ai_agent_config set suggested_labels_seeded = true where user_id = uid;
end;
$$;

revoke all on function public.seed_suggested_labels() from public, anon;
grant execute on function public.seed_suggested_labels() to authenticated;

-- Producto de la etiqueta (opcional): la IA solo la usa en chats de ese producto, y el evento Purchase
-- se envía con el valor de la venta de ese producto (y se omite si el chat llegó por otro producto).
alter table public.crm_wa_labels
  add column if not exists product_id uuid references public.crm_products(id) on delete set null;
