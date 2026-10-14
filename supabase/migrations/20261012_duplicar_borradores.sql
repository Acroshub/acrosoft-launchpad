-- Duplicar etiquetas, flujos y seguimientos.
--
-- Una copia nace como Borrador y recuerda de quién viene (duplicated_from, sin FK a propósito: si el
-- original se borra, la copia sigue siendo válida y simplemente ya no hay con qué compararla).
-- La pantalla no deja guardar la copia hasta que difiera del original en algo.
--   * Etiquetas y flujos ya tenían estado Borrador (status).
--   * Los seguimientos no: crm_wa_automations gana status ('published' | 'draft'). Un borrador nunca se
--     dispara aunque is_active esté encendido.
--   * Al duplicar un flujo o un seguimiento se copian también sus secuencias (duplicated_from en
--     crm_wa_sequences), para que editar la copia no cambie el original.

alter table public.crm_wa_labels    add column if not exists duplicated_from uuid;
alter table public.crm_wa_flows     add column if not exists duplicated_from uuid;
alter table public.crm_wa_sequences add column if not exists duplicated_from uuid;

alter table public.crm_wa_automations
  add column if not exists status text not null default 'published' check (status in ('draft','published')),
  add column if not exists duplicated_from uuid;
