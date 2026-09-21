-- Neto real que recibe la cuenta tras la comisión de Stripe, para mandarlo
-- como valor del evento Purchase a Meta (pixel + Conversions API). Nullable:
-- si no se pudo consultar a Stripe, el tracking cae al monto bruto.
alter table public.ebook_orders
  add column if not exists net_amount integer,
  add column if not exists net_currency text;

comment on column public.ebook_orders.net_amount is 'Centavos que recibe la cuenta tras la comisión de Stripe (balance_transaction.net). NULL si no se pudo consultar.';
comment on column public.ebook_orders.net_currency is 'Moneda de net_amount: la de liquidación de la cuenta, no necesariamente la que pagó el cliente.';
