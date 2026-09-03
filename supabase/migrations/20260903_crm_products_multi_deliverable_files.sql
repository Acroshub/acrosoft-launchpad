-- Permite adjuntar múltiples archivos entregables (ej: 2 PDFs) a un producto digital,
-- reemplazando el modelo de un solo deliverable_url.
ALTER TABLE crm_products
  ADD COLUMN IF NOT EXISTS deliverable_files jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Backfill: productos existentes con un solo archivo pasan a tener un array de 1 elemento,
-- con el mismo nombre de archivo que generaba el edge function send-deliverable.
UPDATE crm_products
SET deliverable_files = jsonb_build_array(
  jsonb_build_object(
    'url', deliverable_url,
    'filename', trim(both '-' from regexp_replace(regexp_replace(trim(name), '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g'))
      || '.' || lower(split_part(deliverable_url, '.', array_length(string_to_array(deliverable_url, '.'), 1)))
  )
)
WHERE product_kind = 'archivo'
  AND deliverable_type = 'file'
  AND deliverable_url IS NOT NULL
  AND deliverable_url <> ''
  AND deliverable_files = '[]'::jsonb;
