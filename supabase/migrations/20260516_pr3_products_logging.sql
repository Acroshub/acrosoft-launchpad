-- Logging triggers for product-related tables

DROP TRIGGER IF EXISTS trg_log_crm_products ON crm_products;
CREATE TRIGGER trg_log_crm_products
  AFTER INSERT OR UPDATE OR DELETE ON crm_products
  FOR EACH ROW EXECUTE FUNCTION _log_crm_change();

DROP TRIGGER IF EXISTS trg_log_crm_product_variants ON crm_product_variants;
CREATE TRIGGER trg_log_crm_product_variants
  AFTER INSERT OR UPDATE OR DELETE ON crm_product_variants
  FOR EACH ROW EXECUTE FUNCTION _log_crm_change();

DROP TRIGGER IF EXISTS trg_log_crm_catalogs ON crm_catalogs;
CREATE TRIGGER trg_log_crm_catalogs
  AFTER INSERT OR UPDATE OR DELETE ON crm_catalogs
  FOR EACH ROW EXECUTE FUNCTION _log_crm_change();
