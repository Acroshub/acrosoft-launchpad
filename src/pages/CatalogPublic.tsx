import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { X, ChevronLeft, ChevronRight, Package } from "lucide-react";
import { supabasePublic } from "@/lib/supabase";
import type { CrmCatalog, CrmProduct, CrmProductVariant, CrmBusinessProfile } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────
type BusinessInfo = Pick<CrmBusinessProfile, "business_name" | "whatsapp" | "contact_phone" | "logo_url">;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const CURRENCY_SYMBOLS: Record<string, string> = { USD: "$", BOB: "Bs.", PEN: "S/", EUR: "€", GBP: "£" };
const formatPrice = (price: number, currency: string) => {
  const sym = CURRENCY_SYMBOLS[(currency ?? "USD").toUpperCase()] ?? currency;
  return `${sym} ${price.toLocaleString("es", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const cleanPhone = (phone: string) => phone.replace(/\D/g, "");

const LOW_STOCK_THRESHOLD = 5;

function isVariantOutOfStock(v: CrmProductVariant): boolean {
  return v.stock !== null && v.stock <= 0;
}

// Retorna null = sin badge; number = "Solo quedan N unidades"
// Variantes: badge se muestra por variante individual en el modal, nunca en la tarjeta
function getProductLowStockCount(product: CrmProduct, variants: CrmProductVariant[]): number | null {
  if (product.has_variants) return null;
  if (!product.stock_enabled) return null;
  const stock = product.stock ?? 0;
  return stock > 0 && stock <= LOW_STOCK_THRESHOLD ? stock : null;
}

// true = ocultar del catálogo
// Para productos con variantes: tracking por variante (v.stock !== null), ignorar product.stock_enabled
// Para productos sin variantes: tracking por product.stock_enabled + product.stock
function isProductHidden(product: CrmProduct, variants: CrmProductVariant[]): boolean {
  if (product.has_variants) {
    if (variants.length === 0) return false;
    const trackedVariants = variants.filter(v => v.stock !== null);
    if (trackedVariants.length === 0) return false; // ninguna variante con tracking → siempre visible
    return trackedVariants.every(v => (v.stock ?? 0) <= 0);
  }
  if (!product.stock_enabled) return false;
  return (product.stock ?? 0) <= 0;
}

// ─── Product Modal ─────────────────────────────────────────────────────────────
function ProductModal({
  product,
  variants,
  catalog,
  business,
  onClose,
}: {
  product: CrmProduct;
  variants: CrmProductVariant[];
  catalog: CrmCatalog;
  business: BusinessInfo | null;
  onClose: () => void;
}) {
  const [activeImage, setActiveImage] = useState(0);
  // Auto-seleccionar primera variante disponible (no agotada)
  const [selectedVariant, setSelectedVariant] = useState<CrmProductVariant | null>(
    variants.find(v => !isVariantOutOfStock(v)) ?? (variants.length > 0 ? variants[0] : null)
  );

  const images = product.images.filter(Boolean);

  // Sin stock: variante seleccionada agotada, o producto sin variantes agotado
  const outOfStock = selectedVariant
    ? isVariantOutOfStock(selectedVariant)
    : product.stock_enabled && (product.stock ?? 0) <= 0;

  // Badge de poco stock
  const modalLowStock = selectedVariant
    ? (selectedVariant.stock !== null && selectedVariant.stock > 0 && selectedVariant.stock <= LOW_STOCK_THRESHOLD ? selectedVariant.stock : null)
    : getProductLowStockCount(product, variants);

  const productDisc = product.discount_pct ?? 0;
  const baseAmount = selectedVariant?.price_override != null ? selectedVariant.price_override : product.price;
  // Misma lógica que calcProductPrice: descuento propio de variante > herencia de producto > 0
  const activeDisc = selectedVariant
    ? ((selectedVariant.discount_pct ?? 0) > 0
        ? (selectedVariant.discount_pct ?? 0)
        : (selectedVariant.price_override == null ? productDisc : 0))
    : productDisc;
  const finalAmount = activeDisc > 0 ? baseAmount * (1 - activeDisc / 100) : baseAmount;
  const displayPrice = formatPrice(finalAmount, product.currency);
  const originalPrice = activeDisc > 0 ? formatPrice(baseAmount, product.currency) : null;

  // WhatsApp: catalog's configured number takes priority, then business whatsapp/phone
  const rawPhone = catalog.whatsapp_number ?? business?.whatsapp ?? business?.contact_phone ?? "";
  const phone = cleanPhone(rawPhone);
  const waText = encodeURIComponent(
    `Hola! Me interesa el producto: ${product.name}${selectedVariant ? ` (${selectedVariant.name})` : ""}`
  );
  const waUrl = phone ? `https://wa.me/${phone}?text=${waText}` : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full sm:max-w-2xl bg-white sm:rounded-2xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors"
        >
          <X size={16} />
        </button>

        <div className="overflow-y-auto flex-1">
          {/* Image gallery */}
          {images.length > 0 ? (
            <div className="relative bg-gray-100">
              <img
                src={images[activeImage]}
                alt={product.name}
                className="w-full aspect-square sm:aspect-[4/3] object-cover"
              />
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImage(i => (i - 1 + images.length) % images.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setActiveImage(i => (i + 1) % images.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveImage(i)}
                        className={`h-1.5 rounded-full transition-all bg-white ${i === activeImage ? "w-4" : "w-1.5 opacity-60"}`}
                      />
                    ))}
                  </div>
                  {/* Thumbnails */}
                  <div className="absolute bottom-10 left-0 right-0 flex gap-1.5 justify-center px-4">
                    {images.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveImage(i)}
                        className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-all ${i === activeImage ? "border-white" : "border-transparent opacity-60"}`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="w-full aspect-square sm:aspect-[4/3] bg-gray-100 flex items-center justify-center">
              <Package size={48} className="text-gray-300" />
            </div>
          )}

          {/* Info */}
          <div className="p-5 space-y-5">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-gray-900 leading-snug">{product.name}</h2>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-semibold text-primary">{displayPrice}</p>
                {originalPrice && (
                  <p className="text-base text-gray-400 line-through">{originalPrice}</p>
                )}
                {activeDisc > 0 && (
                  <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">{activeDisc}% off</span>
                )}
              </div>
              {outOfStock && (
                <span className="inline-block text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">
                  Sin stock disponible
                </span>
              )}
              {!outOfStock && modalLowStock !== null && (
                <span className="inline-block text-[11px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-semibold">
                  Solo quedan {modalLowStock} unidad{modalLowStock !== 1 ? "es" : ""}
                </span>
              )}
            </div>

            {product.description && (
              <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
            )}

            {/* Variants */}
            {product.has_variants && variants.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Opciones</p>
                <div className="flex flex-wrap gap-2">
                  {variants.map(v => {
                    const vOut = isVariantOutOfStock(v);
                    const vLow = !vOut && v.stock !== null && v.stock > 0 && v.stock <= LOW_STOCK_THRESHOLD;
                    return (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVariant(v)}
                        disabled={vOut}
                        className={`relative px-3 py-1.5 rounded-lg text-sm border font-medium transition-all ${
                          vOut
                            ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed line-through"
                            : selectedVariant?.id === v.id
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                        }`}
                      >
                        {v.name}
                        {v.price_override != null && !vOut && (
                          <span className="ml-1.5 text-xs opacity-75">
                            — {formatPrice(
                                (v.discount_pct ?? 0) > 0
                                  ? v.price_override * (1 - (v.discount_pct ?? 0) / 100)
                                  : v.price_override,
                                product.currency
                              )}
                            {(v.discount_pct ?? 0) > 0 && ` (-${v.discount_pct}%)`}
                          </span>
                        )}
                        {vLow && (
                          <span className="ml-1 text-[10px] text-orange-500 font-semibold">({v.stock})</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* WhatsApp CTA */}
            {waUrl ? (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${
                  outOfStock
                    ? "bg-gray-100 text-gray-400 pointer-events-none"
                    : "bg-[#25D366] hover:bg-[#20bd5a] text-white active:scale-[0.98]"
                }`}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.116 1.529 5.845L.057 23.5l5.797-1.523A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.814 9.814 0 01-5.012-1.374l-.36-.214-3.44.904.919-3.354-.234-.374A9.818 9.818 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z" />
                </svg>
                {outOfStock ? "Sin stock" : "Comprar por WhatsApp"}
              </a>
            ) : (
              <div className="text-center py-3 text-xs text-gray-400">
                Contáctanos para adquirir este producto
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ product, lowStockCount, onClick }: { product: CrmProduct; lowStockCount: number | null; onClick: () => void }) {

  return (
    <button
      onClick={onClick}
      className="text-left bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all active:scale-[0.98] border border-gray-100"
    >
      <div className="aspect-square bg-gray-100 overflow-hidden">
        {product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={32} className="text-gray-300" />
          </div>
        )}
      </div>
      <div className="p-3 space-y-1">
        <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2">{product.name}</p>
        {product.description && (
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{product.description}</p>
        )}
        <div className="flex items-center justify-between pt-0.5 flex-wrap gap-1">
          <div className="flex items-baseline gap-1.5">
            {(product.discount_pct ?? 0) > 0 ? (
              <>
                <p className="text-sm font-bold text-primary">
                  {formatPrice(product.price * (1 - (product.discount_pct ?? 0) / 100), product.currency)}
                </p>
                <p className="text-[11px] text-gray-400 line-through">{formatPrice(product.price, product.currency)}</p>
                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-1 py-0.5 rounded-full">{product.discount_pct}%</span>
              </>
            ) : (
              <p className="text-sm font-bold text-primary">{formatPrice(product.price, product.currency)}</p>
            )}
          </div>
          <div className="flex gap-1 flex-wrap">
            {lowStockCount !== null && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 font-semibold">
                Solo quedan {lowStockCount}
              </span>
            )}
            {product.deliverable_type && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600">Digital</span>
            )}
            {product.has_variants && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">Variantes</span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CatalogPublic() {
  const { businessSlug, catalogSlug } = useParams<{ businessSlug: string; catalogSlug: string }>();

  const [catalog, setCatalog]         = useState<CrmCatalog | null>(null);
  const [products, setProducts]       = useState<CrmProduct[]>([]);
  const [variantMap, setVariantMap]   = useState<Map<string, CrmProductVariant[]>>(new Map());
  const [business, setBusiness]       = useState<BusinessInfo | null>(null);
  const [loading, setLoading]         = useState(true);
  const [notFound, setNotFound]       = useState(false);

  // Modal
  const [selectedProduct, setSelectedProduct] = useState<CrmProduct | null>(null);

  useEffect(() => {
    if (!businessSlug || !catalogSlug) return;
    (async () => {
      setLoading(true);
      try {
        // 1. Business by slug
        const { data: biz, error: bizErr } = await supabasePublic
          .from("crm_business_profile")
          .select("user_id, business_name, whatsapp, contact_phone, logo_url")
          .eq("slug", businessSlug)
          .single();
        if (bizErr || !biz) { setNotFound(true); return; }
        setBusiness(biz as BusinessInfo);

        // 2. Catalog by slug + owner
        const { data: cat, error: catErr } = await supabasePublic
          .from("crm_catalogs")
          .select("*")
          .eq("slug", catalogSlug)
          .eq("user_id", biz.user_id)
          .eq("is_active", true)
          .single();
        if (catErr || !cat) { setNotFound(true); return; }
        setCatalog(cat as CrmCatalog);

        // 3. Products
        const { data: catProds } = await supabasePublic
          .from("crm_catalog_products")
          .select("product_id, sort_order")
          .eq("catalog_id", cat.id)
          .order("sort_order", { ascending: true });

        if (catProds && catProds.length > 0) {
          const productIds = catProds.map((r: any) => r.product_id as string);

          // Cargar productos y variantes en paralelo
          const [{ data: prods }, { data: allVariants }] = await Promise.all([
            supabasePublic.from("crm_products").select("*").in("id", productIds).eq("is_active", true),
            supabasePublic.from("crm_product_variants").select("*").in("product_id", productIds).order("sort_order"),
          ]);

          // Construir mapa de variantes por producto
          const vMap = new Map<string, CrmProductVariant[]>();
          for (const v of (allVariants ?? []) as CrmProductVariant[]) {
            if (!vMap.has(v.product_id)) vMap.set(v.product_id, []);
            vMap.get(v.product_id)!.push(v);
          }
          setVariantMap(vMap);

          // Ordenar y filtrar productos agotados
          const sortMap = new Map(catProds.map((r: any) => [r.product_id, r.sort_order as number]));
          const sorted = ((prods ?? []) as CrmProduct[])
            .sort((a, b) => (sortMap.get(a.id) ?? 999) - (sortMap.get(b.id) ?? 999))
            .filter(p => !isProductHidden(p, vMap.get(p.id) ?? []));
          setProducts(sorted);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [businessSlug, catalogSlug]);

  const openProduct = (product: CrmProduct) => {
    setSelectedProduct(product);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (notFound || !catalog) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 text-center p-8">
        <Package size={40} className="text-gray-300" />
        <div>
          <h1 className="text-lg font-semibold text-gray-800">Catálogo no encontrado</h1>
          <p className="text-sm text-gray-500 mt-1">Este catálogo no existe o no está disponible.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      {catalog.cover_image ? (
        <div className="relative h-52 sm:h-72 overflow-hidden">
          <img src={catalog.cover_image} alt={catalog.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8 text-white">
            <div className="flex items-end gap-3">
              {business?.logo_url && (
                <img
                  src={business.logo_url}
                  alt=""
                  className="w-12 h-12 rounded-xl object-contain bg-white/10 backdrop-blur-sm p-1 border border-white/20 shrink-0"
                />
              )}
              <div>
                <p className="text-xs font-medium text-white/70 uppercase tracking-wide mb-0.5">
                  {business?.business_name}
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold leading-tight">{catalog.name}</h1>
                {catalog.description && (
                  <p className="text-sm text-white/75 mt-0.5">{catalog.description}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border-b px-5 pt-7 pb-5 sm:px-8">
          <div className="max-w-3xl mx-auto flex items-center gap-4">
            {business?.logo_url && (
              <img
                src={business.logo_url}
                alt=""
                className="w-14 h-14 rounded-xl object-contain border bg-gray-50 p-1 shrink-0"
              />
            )}
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                {business?.business_name}
              </p>
              <h1 className="text-2xl font-bold text-gray-900">{catalog.name}</h1>
              {catalog.description && (
                <p className="text-sm text-gray-500 mt-0.5">{catalog.description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Products */}
      <div className="max-w-3xl mx-auto px-4 py-6 sm:px-8">
        {products.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Package size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Este catálogo no tiene productos disponibles aún.</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-4">
              {products.length} producto{products.length !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              {products.map(p => (
                <ProductCard
                  key={p.id}
                  product={p}
                  lowStockCount={getProductLowStockCount(p, variantMap.get(p.id) ?? [])}
                  onClick={() => openProduct(p)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t bg-white mt-10 py-5 px-4 text-center">
        <p className="text-[11px] text-gray-300">
          Powered by <span className="font-medium">Acrosoft</span>
        </p>
      </footer>

      {/* Product modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          variants={variantMap.get(selectedProduct.id) ?? []}
          catalog={catalog}
          business={business}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
