-- PR-1: Módulo Productos, Catálogos, Métodos de Pago y extensiones de Ventas/IA

-- ── crm_products ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_products (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             text NOT NULL,
  description      text,
  price            numeric NOT NULL DEFAULT 0,
  currency         text NOT NULL DEFAULT 'USD',
  sku              text,
  stock_enabled    boolean NOT NULL DEFAULT false,
  stock            integer,
  images           text[] NOT NULL DEFAULT '{}',
  has_variants     boolean NOT NULL DEFAULT false,
  deliverable_type text CHECK (deliverable_type IN ('file', 'text')),
  deliverable_url  text,
  deliverable_text text,
  deliverable_sent_at timestamptz,
  is_active        boolean NOT NULL DEFAULT true,
  sort_order       integer NOT NULL DEFAULT 0,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);
ALTER TABLE crm_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner" ON crm_products USING (user_id = auth.uid());
CREATE POLICY "public_read_active_products" ON crm_products FOR SELECT USING (is_active = true);

-- ── crm_product_variants ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_product_variants (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id     uuid NOT NULL REFERENCES crm_products(id) ON DELETE CASCADE,
  name           text NOT NULL,
  price_override numeric,
  stock          integer,
  sort_order     integer NOT NULL DEFAULT 0,
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE crm_product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner" ON crm_product_variants
  USING (product_id IN (SELECT id FROM crm_products WHERE user_id = auth.uid()));

-- ── crm_payment_methods ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_payment_methods (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('product', 'product_variant', 'service')),
  entity_id   uuid NOT NULL,
  type        text NOT NULL CHECK (type IN ('bank_transfer', 'payment_link', 'qr_code')),
  label       text,
  content     text NOT NULL,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE crm_payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner" ON crm_payment_methods USING (user_id = auth.uid());
CREATE POLICY "public_read_payment_methods" ON crm_payment_methods FOR SELECT USING (true);

-- ── crm_catalogs ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_catalogs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  slug        text UNIQUE NOT NULL,
  cover_image text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE crm_catalogs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner" ON crm_catalogs USING (user_id = auth.uid());
CREATE POLICY "public_read_active_catalogs" ON crm_catalogs FOR SELECT USING (is_active = true);

-- ── crm_catalog_products ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_catalog_products (
  catalog_id uuid NOT NULL REFERENCES crm_catalogs(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES crm_products(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (catalog_id, product_id)
);
ALTER TABLE crm_catalog_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner" ON crm_catalog_products
  USING (catalog_id IN (SELECT id FROM crm_catalogs WHERE user_id = auth.uid()));
CREATE POLICY "public_read_catalog_products" ON crm_catalog_products FOR SELECT USING (true);

-- ── Modificar crm_sales ───────────────────────────────────────────────────────
ALTER TABLE crm_sales
  ADD COLUMN IF NOT EXISTS product_id          uuid REFERENCES crm_products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS product_variant_id  uuid REFERENCES crm_product_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_method_id   uuid REFERENCES crm_payment_methods(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_ai_sale          boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status              text NOT NULL DEFAULT 'confirmed'
                                               CHECK (status IN ('confirmed', 'pending_review', 'rejected')),
  ADD COLUMN IF NOT EXISTS wa_conversation_id  uuid REFERENCES crm_wa_conversations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deliverable_sent_at timestamptz;

-- ── Modificar crm_ai_agent_config ─────────────────────────────────────────────
ALTER TABLE crm_ai_agent_config
  ADD COLUMN IF NOT EXISTS products_mode        text NOT NULL DEFAULT 'all'
                                                CHECK (products_mode IN ('all', 'selected')),
  ADD COLUMN IF NOT EXISTS selected_product_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS services_mode        text NOT NULL DEFAULT 'all'
                                                CHECK (services_mode IN ('all', 'selected')),
  ADD COLUMN IF NOT EXISTS selected_service_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS auto_detect_payments boolean NOT NULL DEFAULT false;

-- ── Índices ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_crm_products_user_id           ON crm_products(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_products_is_active         ON crm_products(is_active);
CREATE INDEX IF NOT EXISTS idx_crm_product_variants_product   ON crm_product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_crm_payment_methods_entity     ON crm_payment_methods(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_crm_catalogs_slug              ON crm_catalogs(slug);
CREATE INDEX IF NOT EXISTS idx_crm_catalogs_user_id           ON crm_catalogs(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_catalog_products_catalog   ON crm_catalog_products(catalog_id);
CREATE INDEX IF NOT EXISTS idx_crm_catalog_products_product   ON crm_catalog_products(product_id);
CREATE INDEX IF NOT EXISTS idx_crm_sales_product_id           ON crm_sales(product_id);
CREATE INDEX IF NOT EXISTS idx_crm_sales_is_ai_sale           ON crm_sales(is_ai_sale);
CREATE INDEX IF NOT EXISTS idx_crm_sales_status               ON crm_sales(status);

-- ── Storage buckets (ejecutar vía Supabase dashboard si falla) ────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('product-images',       'product-images',       true,  10485760,  ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('payment-qr',           'payment-qr',            true,  5242880,   ARRAY['image/jpeg','image/png','image/webp']),
  ('product-deliverables', 'product-deliverables',  false, 52428800,  ARRAY['application/pdf','application/zip','application/x-zip-compressed','text/plain'])
ON CONFLICT (id) DO NOTHING;
