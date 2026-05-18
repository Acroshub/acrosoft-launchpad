-- B15-6: Descuentos en Productos y Variantes
ALTER TABLE crm_products ADD COLUMN IF NOT EXISTS discount_pct numeric NOT NULL DEFAULT 0;
ALTER TABLE crm_product_variants ADD COLUMN IF NOT EXISTS discount_pct numeric NOT NULL DEFAULT 0;
