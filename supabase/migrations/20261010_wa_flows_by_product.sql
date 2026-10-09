-- Flujos por producto.
--   * crm_wa_flows.product_id: si está, el flujo solo aplica a chats cuyo producto (resuelto por el
--     anuncio de origen: anuncio → conjunto → campaña) es ese. Null = flujo general (comportamiento de siempre).
--   * crm_wa_conversations.ad_referral_pending: el webhook lo enciende cuando llega un mensaje con
--     `referral` de anuncio; el agente lo consume al evaluar flujos. Permite que "Conversación nueva"
--     de un producto se active con el primer mensaje de ESE producto aunque el chat ya existiera.
alter table public.crm_wa_flows
  add column if not exists product_id uuid references public.crm_products(id) on delete set null;
alter table public.crm_wa_conversations
  add column if not exists ad_referral_pending boolean not null default false;
