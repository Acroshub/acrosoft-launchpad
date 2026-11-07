-- Nombre del comprador tal como lo capturó Stripe Checkout (customer_details.name). Lo guarda stripe-webhook y lo devuelve
-- estimados-get-order para que /estimados-ty precargue nombre y correo en el calendario de la llamada de regalo (el CRM recibe
-- nombre + correo de la compra + el WhatsApp que escribe la persona). Nullable: compras anteriores y otros productos no lo tienen.
alter table public.ebook_orders
  add column if not exists customer_name text;

comment on column public.ebook_orders.customer_name is 'Nombre completo que el comprador escribió en el checkout de Stripe (customer_details.name). NULL si no se pidió o no se guardó.';
