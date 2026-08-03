import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Plus, Trash2, Loader2, Package, Image as ImageIcon,
  Check, Pencil, X, ChevronRight, ChevronLeft, Info, Layers,
  DollarSign, Tag, CreditCard, SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/useAuth";
import {
  useUpsertProduct, useDeleteProduct, useToggleCatalogProduct,
  useProductVariants, useUpsertProductVariant, useDeleteProductVariant,
  usePricesByEntity, useUpsertPrices, useFaqsByEntity, useUpsertFaqs,
  useUpsertPaymentMethod, useCatalogs, useProductCatalogIds,
} from "@/hooks/useCrmData";
import type { CrmProduct, CrmProductVariant, CrmPaymentMethod } from "@/lib/supabase";
import PriceListEditor, { type PriceEntry } from "@/components/crm/PriceListEditor";
import FaqEditor, { type FaqEntry } from "@/components/crm/FaqEditor";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";
import PaymentMethodsEditor, { PaymentMethodsDraftEditor } from "@/components/shared/PaymentMethodsEditor";
import { CURRENCIES, formatAmount } from "@/lib/currencies";

const fmtProd = (amount: number, cur: string) => formatAmount(amount, cur);

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <div onClick={onChange} className={`relative w-9 h-5 rounded-full transition-colors shrink-0 cursor-pointer ${value ? "bg-primary" : "bg-secondary border"}`}>
      <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? "translate-x-4" : ""}`} />
    </div>
  );
}

// ─── Image Slot ───────────────────────────────────────────────────────────────
function ImageSlot({ url, index, pathId, userId, onUploaded, onRemove }: {
  url?: string; index: number; pathId: string; userId: string;
  onUploaded: (url: string, index: number) => void;
  onRemove: (index: number) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${userId}/${pathId}/${Date.now()}-${index}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      onUploaded(data.publicUrl, index);
    } catch (e) {
      const message = e instanceof Error ? e.message.slice(0, 80) : "Error al subir imagen";
      toast.error(message);
    } finally { setUploading(false); }
  };

  const isMain = index === 0;
  const cls = isMain ? "col-span-2 row-span-2 h-32" : "h-[60px]";

  return (
    <div
      className={`relative rounded-xl border-2 border-dashed border-border overflow-hidden flex items-center justify-center bg-secondary/30 ${cls} group cursor-pointer`}
      onClick={() => !url && ref.current?.click()}
    >
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
      {url ? (
        <>
          <img src={url} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button onClick={e => { e.stopPropagation(); ref.current?.click(); }}
              className="p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30"><Pencil size={12} /></button>
            <button onClick={e => { e.stopPropagation(); onRemove(index); }}
              className="p-1.5 rounded-lg bg-red-500/80 text-white hover:bg-red-600"><X size={12} /></button>
          </div>
        </>
      ) : uploading ? (
        <Loader2 size={16} className="animate-spin text-muted-foreground" />
      ) : (
        <div className="flex flex-col items-center gap-1 text-muted-foreground/50">
          <Plus size={isMain ? 18 : 12} />
          {isMain && <span className="text-[10px]">Principal</span>}
        </div>
      )}
    </div>
  );
}

function ImageSlotGrid({ images, onChange, pathId, userId }: {
  images: string[]; onChange: (next: string[]) => void; pathId: string; userId: string;
}) {
  const handleUploaded = (url: string, index: number) => {
    const updated = [...images];
    if (index >= updated.length) updated.push(url); else updated[index] = url;
    onChange(updated);
  };
  const handleRemove = (index: number) => onChange(images.filter((_, i) => i !== index));

  return (
    <div className="grid grid-cols-4 gap-2">
      {[...images.map((url, i) => ({ url, i })), { url: undefined as string | undefined, i: images.length }].map(({ url, i }) => (
        <ImageSlot key={i} url={url} index={i} pathId={pathId} userId={userId} onUploaded={handleUploaded} onRemove={handleRemove} />
      ))}
    </div>
  );
}

const explainVariants = "Actívalo si este producto viene en distintas versiones — talla, color, etc. " +
  "Por ejemplo: 10 pantalones rojos y 10 negros. Aquí solo defines si existen; las creas en el siguiente paso, " +
  "y ahí el stock se gestiona por cada variación (10 + 10) en vez de un total único.";

// ═══════════════════════════════════════════════════════════════════════════
// Modo asistente (producto nuevo) — variantes en borrador, 100% en memoria
// ═══════════════════════════════════════════════════════════════════════════

type DraftVariant = {
  _key: number;
  name: string;
  description: string;
  stock: string;
  faqs: FaqEntry[];
  images: string[];
  price: string;
  discountPct: number;
  prices: PriceEntry[];
  paymentMethods: Partial<CrmPaymentMethod>[];
};

const emptyDraftVariant = (key: number): DraftVariant => ({
  _key: key, name: "", description: "", stock: "", faqs: [], images: [], price: "", discountPct: 0, prices: [], paymentMethods: [],
});

function DraftVariantBasicsCard({ variant, onChange, onRemove }: {
  variant: DraftVariant; onChange: (v: DraftVariant) => void; onRemove: () => void;
}) {
  return (
    <div className="bg-secondary/20 border rounded-xl p-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <Input value={variant.name} onChange={e => onChange({ ...variant, name: e.target.value })}
          placeholder="Ej: Talla L, Color Rojo" className="h-8 text-sm flex-1" />
        <button onClick={onRemove} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0">
          <Trash2 size={13} />
        </button>
      </div>
      <textarea value={variant.description} onChange={e => onChange({ ...variant, description: e.target.value })}
        placeholder="Descripción de esta variante (opcional)" rows={2}
        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      <div className="w-32">
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Stock</label>
        <Input type="number" min={0} value={variant.stock} onChange={e => onChange({ ...variant, stock: e.target.value })}
          placeholder="0" className="h-8 text-sm" />
      </div>
      <FaqEditor value={variant.faqs} onChange={faqs => onChange({ ...variant, faqs })} />
    </div>
  );
}

function DraftVariantImagesCard({ variant, onChange, userId }: {
  variant: DraftVariant; onChange: (v: DraftVariant) => void; userId: string;
}) {
  return (
    <div className="bg-secondary/20 border rounded-xl p-3 space-y-2">
      <p className="text-xs font-semibold">{variant.name || "Variante sin nombre"}</p>
      <ImageSlotGrid images={variant.images} onChange={images => onChange({ ...variant, images })}
        pathId={`variant-draft-${variant._key}`} userId={userId} />
    </div>
  );
}

function DraftVariantPricesCard({ variant, onChange, baseCurrency }: {
  variant: DraftVariant; onChange: (v: DraftVariant) => void; baseCurrency: string;
}) {
  return (
    <div className="bg-secondary/20 border rounded-xl p-3 space-y-3">
      <p className="text-xs font-semibold">{variant.name || "Variante sin nombre"}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground/70">Precio *</span>
          <Input type="number" min={0} value={variant.price} onChange={e => onChange({ ...variant, price: e.target.value })}
            placeholder="0" className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground/70">Descuento %</span>
          <Input type="number" min={0} max={99} value={variant.discountPct || ""}
            onChange={e => onChange({ ...variant, discountPct: Math.min(99, Math.max(0, parseFloat(e.target.value) || 0)) })}
            placeholder="0" className="h-8 text-sm" />
        </div>
      </div>
      <PriceListEditor value={variant.prices} onChange={prices => onChange({ ...variant, prices })} baseCurrency={baseCurrency} />
    </div>
  );
}

function DraftVariantPaymentsCard({ variant, onChange, baseCurrency }: {
  variant: DraftVariant; onChange: (v: DraftVariant) => void; baseCurrency: string;
}) {
  return (
    <div className="bg-secondary/20 border rounded-xl p-3 space-y-2">
      <p className="text-xs font-semibold">{variant.name || "Variante sin nombre"}</p>
      <PaymentMethodsDraftEditor value={variant.paymentMethods} onChange={paymentMethods => onChange({ ...variant, paymentMethods })} baseCurrency={baseCurrency} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Modo edición (producto existente) — variantes reales, cada una con sus
// propios hooks (FAQs / precios multi-moneda / pagos son tablas hijas
// independientes por entidad, así que cada variante necesita su propia
// instancia de queries — de ahí que cada bloque sea su propio componente).
// ═══════════════════════════════════════════════════════════════════════════

function VariantBasicsRow({ variant, productId, onDeleted }: {
  variant: CrmProductVariant; productId: string; onDeleted: () => void;
}) {
  const upsert = useUpsertProductVariant();
  const remove = useDeleteProductVariant();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(variant.name);
  const [description, setDescription] = useState(variant.description ?? "");
  const [stock, setStock] = useState(variant.stock != null ? String(variant.stock) : "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: existingFaqs = [] } = useFaqsByEntity("product_variant", isEditing ? variant.id : null);
  const upsertFaqs = useUpsertFaqs();
  const [faqs, setFaqs] = useState<FaqEntry[]>([]);
  useEffect(() => { setFaqs(existingFaqs.map(f => ({ question: f.question, answer: f.answer }))); }, [existingFaqs]);
  const faqsSaveTimer = useRef<ReturnType<typeof setTimeout>>();
  const handleFaqsChange = (next: FaqEntry[]) => {
    setFaqs(next);
    clearTimeout(faqsSaveTimer.current);
    faqsSaveTimer.current = setTimeout(() => {
      upsertFaqs.mutate({ entityType: "product_variant", entityId: variant.id, faqs: next },
        { onError: () => toast.error("Error al guardar las FAQs de la variante") });
    }, 800);
  };
  useEffect(() => () => clearTimeout(faqsSaveTimer.current), []);

  const handleSave = async () => {
    if (!name.trim()) return;
    await upsert.mutateAsync({
      id: variant.id, product_id: productId, name: name.trim(), description: description || null,
      stock: stock !== "" ? parseInt(stock) : null,
      price_override: variant.price_override, discount_pct: variant.discount_pct,
      images: variant.images, sort_order: variant.sort_order,
    });
    toast.success("Variante actualizada");
    setIsEditing(false);
  };

  const handleDelete = async () => {
    await remove.mutateAsync({ id: variant.id, productId });
    toast.success("Variante eliminada");
    onDeleted();
  };

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2 bg-secondary/30 rounded-xl px-3 py-2.5">
        <span className="flex-1 text-sm font-medium truncate">{variant.name}</span>
        {variant.stock != null && <span className="text-[10px] text-muted-foreground shrink-0">{variant.stock} u.</span>}
        <button onClick={() => setIsEditing(true)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <Pencil size={13} />
        </button>
        <button onClick={() => setConfirmDelete(true)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0">
          <Trash2 size={13} />
        </button>
        <DeleteConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} onConfirm={handleDelete}
          isPending={remove.isPending} description={`¿Eliminar la variante "${variant.name}"? Esta acción no se puede deshacer.`} />
      </div>
    );
  }

  return (
    <div className="space-y-2.5 bg-secondary/20 border rounded-xl p-3">
      <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Talla L, Color Rojo" className="h-8 text-sm" />
      <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
        placeholder="Descripción de esta variante (opcional)"
        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      <div className="w-32">
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Stock</label>
        <Input type="number" min={0} value={stock} onChange={e => setStock(e.target.value)} placeholder="0" className="h-8 text-sm" />
      </div>
      <FaqEditor value={faqs} onChange={handleFaqsChange} />
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleSave} disabled={!name.trim() || upsert.isPending} className="h-8 px-3 text-xs">
          {upsert.isPending ? <Loader2 size={11} className="animate-spin mr-1" /> : <Check size={11} className="mr-1" />}
          Guardar
        </Button>
        <button onClick={() => setIsEditing(false)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
      </div>
    </div>
  );
}

function VariantImagesRow({ variant, productId, userId }: { variant: CrmProductVariant; productId: string; userId: string }) {
  const upsert = useUpsertProductVariant();
  const [images, setImages] = useState<string[]>(variant.images ?? []);
  const handleChange = async (next: string[]) => {
    setImages(next);
    await upsert.mutateAsync({
      id: variant.id, product_id: productId, name: variant.name, description: variant.description,
      price_override: variant.price_override, discount_pct: variant.discount_pct,
      stock: variant.stock, sort_order: variant.sort_order, images: next,
    });
  };
  return (
    <div className="bg-secondary/20 border rounded-xl p-3 space-y-2">
      <p className="text-xs font-semibold">{variant.name}</p>
      <ImageSlotGrid images={images} onChange={handleChange} pathId={`variant-${variant.id}`} userId={userId} />
    </div>
  );
}

function VariantPricesRow({ variant, productId, baseCurrency }: { variant: CrmProductVariant; productId: string; baseCurrency: string }) {
  const upsert = useUpsertProductVariant();
  const [price, setPrice] = useState(variant.price_override != null ? String(variant.price_override) : "");
  const [discountPct, setDiscountPct] = useState(variant.discount_pct ?? 0);

  const { data: existingPrices = [] } = usePricesByEntity("product_variant", variant.id);
  const upsertPrices = useUpsertPrices();
  const [prices, setPrices] = useState<PriceEntry[]>([]);
  useEffect(() => { setPrices(existingPrices.map(p => ({ currency: p.currency, price: p.price, discount_pct: p.discount_pct ?? null }))); }, [existingPrices]);
  const pricesSaveTimer = useRef<ReturnType<typeof setTimeout>>();
  const handlePricesChange = (next: PriceEntry[]) => {
    setPrices(next);
    clearTimeout(pricesSaveTimer.current);
    pricesSaveTimer.current = setTimeout(() => {
      upsertPrices.mutate({ entityType: "product_variant", entityId: variant.id, prices: next },
        { onError: () => toast.error("Error al guardar los precios de la variante") });
    }, 800);
  };
  useEffect(() => () => clearTimeout(pricesSaveTimer.current), []);

  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const isFirst = useRef(true);
  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      upsert.mutate({
        id: variant.id, product_id: productId, name: variant.name, description: variant.description,
        price_override: price !== "" ? parseFloat(price) : null, discount_pct: discountPct,
        stock: variant.stock, sort_order: variant.sort_order, images: variant.images,
      });
    }, 800);
    return () => clearTimeout(saveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [price, discountPct]);

  return (
    <div className="bg-secondary/20 border rounded-xl p-3 space-y-3">
      <p className="text-xs font-semibold">{variant.name}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground/70">Precio *</span>
          <Input type="number" min={0} value={price} onChange={e => setPrice(e.target.value)} placeholder="0" className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground/70">Descuento %</span>
          <Input type="number" min={0} max={99} value={discountPct || ""}
            onChange={e => setDiscountPct(Math.min(99, Math.max(0, parseFloat(e.target.value) || 0)))} placeholder="0" className="h-8 text-sm" />
        </div>
      </div>
      <PriceListEditor value={prices} onChange={handlePricesChange} baseCurrency={baseCurrency} />
    </div>
  );
}

function VariantPaymentsRow({ variant }: { variant: CrmProductVariant }) {
  return (
    <div className="bg-secondary/20 border rounded-xl p-3 space-y-2">
      <p className="text-xs font-semibold">{variant.name}</p>
      <PaymentMethodsEditor entityType="product_variant" entityId={variant.id} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Editor principal
// ═══════════════════════════════════════════════════════════════════════════

const WIZARD_STEP_LABELS = {
  info: "Información", variantes: "Variantes", imagenes: "Imágenes", precios: "Precios", pagos: "Métodos de pago", ajustes: "Ajustes",
} as const;
type StepId = keyof typeof WIZARD_STEP_LABELS;

const NEW_PRODUCT_DRAFT_KEY = "crm_new_physical_product_draft";
const readDraft = () => { try { return JSON.parse(sessionStorage.getItem(NEW_PRODUCT_DRAFT_KEY) ?? "null"); } catch { return null; } };
const clearDraft = () => sessionStorage.removeItem(NEW_PRODUCT_DRAFT_KEY);

export default function CrmPhysicalProductEditor({ initialProduct, fromCatalogId, canDelete = true, onBack }: {
  initialProduct: CrmProduct | null;
  fromCatalogId: string | null;
  canDelete?: boolean;
  onBack: () => void;
}) {
  const { user } = useCurrentUser();
  const [product, setProduct] = useState<CrmProduct | null>(initialProduct);
  // `isNew` sigue el estado local `product` (no la prop) para que, apenas se
  // crea el producto dentro del propio wizard, el componente pase a modo edición
  // sin necesidad de desmontar/remontar.
  const isNew = !product;
  const _d = useRef(!initialProduct ? readDraft() : null);
  const d = _d.current;

  const upsertProduct = useUpsertProduct();
  const deleteProductMutation = useDeleteProduct();
  const toggleCatalog = useToggleCatalogProduct();
  const upsertVariant = useUpsertProductVariant();
  const upsertPrices = useUpsertPrices();
  const upsertFaqs = useUpsertFaqs();
  const upsertPaymentMethod = useUpsertPaymentMethod();

  // Catálogos a los que pertenece este producto — solo aplica en edición (Ajustes)
  const { data: allCatalogsRaw = [] } = useCatalogs();
  const physicalCatalogs = allCatalogsRaw.filter(c => c.catalog_kind === "fisico");
  const { data: memberCatalogIds = [], refetch: refetchCatalogIds } = useProductCatalogIds(product?.id ?? null);

  const [saving, setSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [name, setName]               = useState(d?.name ?? initialProduct?.name ?? "");
  const [description, setDescription] = useState(d?.description ?? initialProduct?.description ?? "");
  const [sku, setSku]                 = useState(d?.sku ?? initialProduct?.sku ?? "");
  const [isActive, setIsActive]       = useState(d?.isActive ?? initialProduct?.is_active ?? true);
  const [hasVariants, setHasVariants] = useState(d?.hasVariants ?? initialProduct?.has_variants ?? false);
  const [stockEnabled, setStockEnabled] = useState(d?.stockEnabled ?? initialProduct?.stock_enabled ?? false);
  const [stockVal, setStockVal]       = useState(d?.stockVal ?? (initialProduct?.stock != null ? String(initialProduct.stock) : ""));
  const [images, setImages]           = useState<string[]>(d?.images ?? initialProduct?.images ?? []);
  const [price, setPrice]             = useState(d?.price ?? initialProduct?.price ?? 0);
  const [currency, setCurrency]       = useState(d?.currency ?? initialProduct?.currency ?? "USD");
  const [discountPct, setDiscountPct] = useState(d?.discountPct ?? initialProduct?.discount_pct ?? 0);

  // Precios multi-moneda del producto
  const { data: existingPrices = [] } = usePricesByEntity("product", product?.id ?? null);
  const [prices, setPrices] = useState<PriceEntry[]>(d?.prices ?? []);
  const pricesSaveTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => { if (isNew) return; setPrices(existingPrices.map(p => ({ currency: p.currency, price: p.price, discount_pct: p.discount_pct ?? null }))); }, [existingPrices, isNew]);
  const handlePricesChange = (next: PriceEntry[]) => {
    setPrices(next);
    if (isNew) return;
    clearTimeout(pricesSaveTimer.current);
    pricesSaveTimer.current = setTimeout(() => {
      upsertPrices.mutate({ entityType: "product", entityId: product!.id, prices: next },
        { onError: () => toast.error("Error al guardar los precios adicionales") });
    }, 800);
  };
  useEffect(() => () => clearTimeout(pricesSaveTimer.current), []);

  // FAQs del producto
  const { data: existingFaqs = [] } = useFaqsByEntity("product", product?.id ?? null);
  const [faqs, setFaqs] = useState<FaqEntry[]>(d?.faqs ?? []);
  const faqsSaveTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => { if (isNew) return; setFaqs(existingFaqs.map(f => ({ question: f.question, answer: f.answer }))); }, [existingFaqs, isNew]);
  const handleFaqsChange = (next: FaqEntry[]) => {
    setFaqs(next);
    if (isNew) return;
    clearTimeout(faqsSaveTimer.current);
    faqsSaveTimer.current = setTimeout(() => {
      upsertFaqs.mutate({ entityType: "product", entityId: product!.id, faqs: next },
        { onError: () => toast.error("Error al guardar las FAQs") });
    }, 800);
  };
  useEffect(() => () => clearTimeout(faqsSaveTimer.current), []);

  // Variantes — borrador en memoria (wizard) o reales (edición)
  // Normalizamos cada variante del borrador al leerlo — si quedó guardado en
  // sessionStorage con una forma más vieja (ej. sin paymentMethods todavía),
  // rellenamos los campos faltantes en vez de romper con undefined.
  const [draftVariants, setDraftVariants] = useState<DraftVariant[]>(
    (d?.draftVariants ?? []).map((v: Partial<DraftVariant>, i: number) => ({
      _key: v._key ?? i,
      name: v.name ?? "",
      description: v.description ?? "",
      stock: v.stock ?? "",
      faqs: v.faqs ?? [],
      images: v.images ?? [],
      price: v.price ?? "",
      discountPct: v.discountPct ?? 0,
      prices: v.prices ?? [],
      paymentMethods: v.paymentMethods ?? [],
    }))
  );
  const draftKeyRef = useRef(Math.max(0, ...draftVariants.map(v => v._key)) + 1);
  const { data: realVariants = [] } = useProductVariants(product?.id ?? null);

  // Métodos de pago — borrador (wizard) o en vivo (edición)
  const [draftPaymentMethods, setDraftPaymentMethods] = useState<Partial<CrmPaymentMethod>[]>(d?.paymentMethods ?? []);
  // Con variantes: elegir entre un solo método general (respaldo para todas) o configurar por variante.
  const [paymentMode, setPaymentMode] = useState<"general" | "por_variante">(d?.paymentMode ?? "general");

  // Navegación: wizard (nuevo) o tabs (existente)
  const [wizardStep, setWizardStep] = useState(0);
  const [activeTab, setActiveTab] = useState<StepId>("info");
  const [showMobileContent, setShowMobileContent] = useState(false);

  const STEP_IDS: StepId[] = hasVariants
    ? ["info", "variantes", "imagenes", "precios", "pagos"]
    : ["info", "imagenes", "precios", "pagos"];
  const safeWizardStep = Math.min(wizardStep, STEP_IDS.length - 1);
  const currentStepId = STEP_IDS[safeWizardStep];

  // Draft en sessionStorage — solo mientras el producto no existe
  useEffect(() => {
    if (!isNew) return;
    sessionStorage.setItem(NEW_PRODUCT_DRAFT_KEY, JSON.stringify({
      name, description, sku, isActive, hasVariants, stockEnabled, stockVal, images,
      price, currency, discountPct, prices, faqs, draftVariants, paymentMethods: draftPaymentMethods, paymentMode,
    }));
  }, [isNew, name, description, sku, isActive, hasVariants, stockEnabled, stockVal, images,
      price, currency, discountPct, prices, faqs, draftVariants, draftPaymentMethods, paymentMode]);

  // Autoguardado de los campos base del producto — solo edición
  const isFirstRender = useRef(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (isNew) return;
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    clearTimeout(saveTimer.current);
    setAutoSaveStatus("saving");
    saveTimer.current = setTimeout(async () => {
      try {
        const updated = await upsertProduct.mutateAsync({
          id: product!.id, name, description: description || null, sku: sku || null, is_active: isActive,
          has_variants: hasVariants, stock_enabled: !hasVariants && stockEnabled,
          stock: !hasVariants && stockEnabled && stockVal !== "" ? parseInt(stockVal) : null,
          images, price, currency, discount_pct: discountPct,
        });
        setProduct(updated);
        setAutoSaveStatus("saved");
        setTimeout(() => setAutoSaveStatus("idle"), 2000);
      } catch { setAutoSaveStatus("idle"); }
    }, 800);
    return () => clearTimeout(saveTimer.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, name, description, sku, isActive, hasVariants, stockEnabled, stockVal, images, price, currency, discountPct]);

  if (!user) return null;

  const addDraftVariant = () => setDraftVariants(prev => [...prev, emptyDraftVariant(draftKeyRef.current++)]);
  const updateDraftVariant = (key: number, next: DraftVariant) => setDraftVariants(prev => prev.map(v => v._key === key ? next : v));
  const removeDraftVariant = (key: number) => setDraftVariants(prev => prev.filter(v => v._key !== key));

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("El nombre es obligatorio"); return; }
    setSaving(true);
    try {
      const created = await upsertProduct.mutateAsync({
        name: name.trim(), description: description || null, sku: sku || null, is_active: isActive,
        has_variants: hasVariants, stock_enabled: !hasVariants && stockEnabled,
        stock: !hasVariants && stockEnabled && stockVal !== "" ? parseInt(stockVal) : null,
        images, price, currency, discount_pct: discountPct, product_kind: "fisico",
      });

      const tasks: Promise<unknown>[] = [
        upsertPrices.mutateAsync({ entityType: "product", entityId: created.id, prices }),
        upsertFaqs.mutateAsync({ entityType: "product", entityId: created.id, faqs }),
        ...draftPaymentMethods.map((pm, idx) => upsertPaymentMethod.mutateAsync({
          entity_type: "product", entity_id: created.id, type: pm.type ?? "bank_transfer",
          label: pm.label ?? null, content: pm.content ?? "", sort_order: idx, price_id: null, currency: pm.currency ?? null,
        })),
      ];
      if (hasVariants) {
        tasks.push(...draftVariants.map(async (dv, idx) => {
          const savedVariant = await upsertVariant.mutateAsync({
            product_id: created.id, name: dv.name.trim() || `Variante ${idx + 1}`, description: dv.description || null,
            stock: dv.stock !== "" ? parseInt(dv.stock) : null,
            price_override: dv.price !== "" ? parseFloat(dv.price) : null, discount_pct: dv.discountPct,
            images: dv.images, sort_order: idx,
          });
          await Promise.all([
            upsertFaqs.mutateAsync({ entityType: "product_variant", entityId: savedVariant.id, faqs: dv.faqs }),
            upsertPrices.mutateAsync({ entityType: "product_variant", entityId: savedVariant.id, prices: dv.prices }),
            ...dv.paymentMethods.map((pm, pmIdx) => upsertPaymentMethod.mutateAsync({
              entity_type: "product_variant", entity_id: savedVariant.id, type: pm.type ?? "bank_transfer",
              label: pm.label ?? null, content: pm.content ?? "", sort_order: pmIdx, price_id: null, currency: pm.currency ?? null,
            })),
          ]);
        }));
      }
      if (fromCatalogId) {
        tasks.push(toggleCatalog.mutateAsync({ catalogId: fromCatalogId, productId: created.id, add: true }));
      }
      await Promise.all(tasks);

      clearDraft();
      toast.success("Producto creado");
      setProduct(created);
    } catch {
      toast.error("Error al crear el producto");
      setSaving(false);
    }
  };

  // ── Secciones reutilizables (wizard y edición) ────────────────────────────
  const InfoContent = () => (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Nombre del producto</label>
        <Input value={name} onChange={e => setName(e.target.value)} className="h-10 text-sm" placeholder="Ej: Pantalón de mezclilla" />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Descripción</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Describe tu producto..."
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      </div>
      <FaqEditor value={faqs} onChange={handleFaqsChange} />
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">SKU <span className="text-muted-foreground/50">(opcional)</span></label>
        <Input value={sku} onChange={e => setSku(e.target.value)} placeholder="SKU-001" className="h-9 text-sm font-mono" />
      </div>
      <label className="flex items-center gap-2.5 cursor-pointer pt-1">
        <Toggle value={isActive} onChange={() => setIsActive(!isActive)} />
        <span className="text-sm">Visible en el catálogo</span>
      </label>

      <div className="pt-2 border-t space-y-2">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <Toggle value={hasVariants} onChange={() => setHasVariants(!hasVariants)} />
          <span className="text-sm">Este producto tiene variantes</span>
        </label>
        <p className="text-xs text-muted-foreground/70 leading-relaxed">{explainVariants}</p>
      </div>

      {!hasVariants && (
        <div className="space-y-3 pt-1">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <Toggle value={stockEnabled} onChange={() => setStockEnabled(!stockEnabled)} />
            <span className="text-sm">Gestionar stock</span>
          </label>
          {stockEnabled && (
            <div className="space-y-1.5 pl-11">
              <label className="text-xs font-medium text-muted-foreground">Unidades disponibles</label>
              <Input type="number" value={stockVal} onChange={e => setStockVal(e.target.value)} placeholder="0" className="h-9 text-sm w-32" />
            </div>
          )}
        </div>
      )}
    </div>
  );

  const VariantesContent = () => (
    <div className="space-y-3">
      {isNew ? (
        <>
          {draftVariants.map(v => (
            <DraftVariantBasicsCard key={v._key} variant={v} onChange={next => updateDraftVariant(v._key, next)} onRemove={() => removeDraftVariant(v._key)} />
          ))}
          <button onClick={addDraftVariant} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Plus size={12} /> Añadir variante
          </button>
        </>
      ) : (
        <>
          {realVariants.map(v => (
            <VariantBasicsRow key={v.id} variant={v} productId={product!.id} onDeleted={() => {}} />
          ))}
          <button
            onClick={() => upsertVariant.mutate({ product_id: product!.id, name: `Variante ${realVariants.length + 1}`, sort_order: realVariants.length })}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus size={12} /> Añadir variante
          </button>
        </>
      )}
    </div>
  );

  const ImagenesContent = () => (
    <div className="space-y-5">
      {!hasVariants && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Imágenes del producto</p>
          <ImageSlotGrid images={images} onChange={setImages} pathId={product?.id ?? "new"} userId={user.id} />
        </div>
      )}
      {hasVariants && (
        <div className="space-y-2.5">
          <p className="text-xs font-medium text-muted-foreground">
            Imágenes por variante — al tener variantes, la imagen se define por cada una en vez de una sola para el producto.
          </p>
          {isNew
            ? draftVariants.map(v => <DraftVariantImagesCard key={v._key} variant={v} onChange={next => updateDraftVariant(v._key, next)} userId={user.id} />)
            : realVariants.map(v => <VariantImagesRow key={v.id} variant={v} productId={product!.id} userId={user.id} />)}
        </div>
      )}
    </div>
  );

  const PreciosContent = () => (
    <div className="space-y-5">
      {!hasVariants ? (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><DollarSign size={12} /> Precio base</label>
              <Input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} className="h-10 text-sm" min={0} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Moneda</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code} — {c.name.split(" (")[0]}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Tag size={12} /> Descuento (%)</label>
              <Input type="number" value={discountPct} onChange={e => setDiscountPct(Math.max(0, Math.min(100, Number(e.target.value))))} className="h-10 text-sm" min={0} max={100} placeholder="0" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Precio en otra moneda (opcional)</label>
            <PriceListEditor value={prices} onChange={handlePricesChange} baseCurrency={currency} />
          </div>
        </>
      ) : (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Moneda</label>
          <select value={currency} onChange={e => setCurrency(e.target.value)}
            className="flex h-10 max-w-xs rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code} — {c.name.split(" (")[0]}</option>)}
          </select>
          <p className="text-[11px] text-muted-foreground/60">Moneda base para el precio de cada variante.</p>
        </div>
      )}

      {hasVariants && (
        <div className="space-y-2.5 pt-2 border-t">
          <p className="text-xs font-medium text-muted-foreground pt-2">
            Precios por variante — al tener variantes, el precio se define por cada una en vez de uno solo para el producto.
          </p>
          {isNew
            ? draftVariants.map(v => <DraftVariantPricesCard key={v._key} variant={v} onChange={next => updateDraftVariant(v._key, next)} baseCurrency={currency} />)
            : realVariants.map(v => <VariantPricesRow key={v.id} variant={v} productId={product!.id} baseCurrency={currency} />)}
        </div>
      )}
    </div>
  );

  const PagosContent = () => (
    <div className="space-y-5">
      {hasVariants && (
        <div className="flex gap-1 p-1 bg-muted/50 rounded-xl border border-border/50 max-w-md">
          <button
            onClick={() => setPaymentMode("general")}
            className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              paymentMode === "general" ? "bg-card text-foreground shadow-sm border border-border/40" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Mismo para todas las variantes
          </button>
          <button
            onClick={() => setPaymentMode("por_variante")}
            className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              paymentMode === "por_variante" ? "bg-card text-foreground shadow-sm border border-border/40" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Configurar por variante
          </button>
        </div>
      )}

      {(!hasVariants || paymentMode === "general") && (
        <div>
          <p className="text-xs text-muted-foreground/70 mb-2">El Agente IA usará estos métodos para cerrar ventas. Si no hay ninguno, transferirá a modo Manual.</p>
          {isNew
            ? <PaymentMethodsDraftEditor value={draftPaymentMethods} onChange={setDraftPaymentMethods} baseCurrency={currency} />
            : <PaymentMethodsEditor entityType="product" entityId={product!.id} prices={existingPrices} baseCurrency={currency} />}
        </div>
      )}

      {hasVariants && paymentMode === "por_variante" && (
        <div className="space-y-2.5">
          <p className="text-xs text-muted-foreground/70">
            Cada variante usa sus propios métodos de pago. Si dejas alguna sin configurar, el Agente IA usará los métodos generales del producto como respaldo (puedes configurarlos cambiando a "Mismo para todas las variantes").
          </p>
          {isNew
            ? draftVariants.map(v => <DraftVariantPaymentsCard key={v._key} variant={v} onChange={next => updateDraftVariant(v._key, next)} baseCurrency={currency} />)
            : realVariants.map(v => <VariantPaymentsRow key={v.id} variant={v} />)}
        </div>
      )}
    </div>
  );

  const AjustesContent = () => (
    <div className="space-y-6">
      <div className="bg-card border rounded-2xl p-6 space-y-3">
        <h2 className="text-sm font-semibold">Catálogos</h2>
        <p className="text-xs text-muted-foreground/70">
          Selecciona en qué catálogos aparece este producto. Si no seleccionas ninguno, quedará en "Productos Sin Catálogo".
        </p>
        {physicalCatalogs.length === 0 ? (
          <p className="text-xs text-muted-foreground/60 italic">No tienes catálogos creados aún.</p>
        ) : (
          <div className="space-y-2">
            {physicalCatalogs.map(cat => {
              const isMember = memberCatalogIds.includes(cat.id);
              return (
                <label key={cat.id} className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={isMember}
                    onChange={() => product && toggleCatalog.mutate({ catalogId: cat.id, productId: product.id, add: !isMember }, { onSuccess: () => refetchCatalogIds() })}
                    className="rounded border-input" />
                  <span className="text-sm">{cat.name}</span>
                </label>
              );
            })}
          </div>
        )}
        {memberCatalogIds.length > 0 && (
          <button
            onClick={() => {
              if (!product) return;
              Promise.all(memberCatalogIds.map(catalogId => toggleCatalog.mutateAsync({ catalogId, productId: product.id, add: false })))
                .then(() => { refetchCatalogIds(); toast.success('Producto movido a "Productos Sin Catálogo"'); });
            }}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            Quitar de todos los catálogos
          </button>
        )}
      </div>

      {canDelete && (
        <div className="bg-card border border-destructive/20 rounded-2xl p-6 space-y-3">
          <h2 className="text-sm font-semibold text-destructive">Eliminar producto</h2>
          <p className="text-xs text-muted-foreground">Se eliminará permanentemente junto con sus variantes y métodos de pago. Esta acción no se puede deshacer.</p>
          <Button
            variant="outline"
            onClick={() => setConfirmDelete(true)}
            className="text-destructive hover:bg-destructive/10 border-destructive/30"
          >
            <Trash2 size={13} className="mr-1.5" /> Eliminar producto
          </Button>
        </div>
      )}
    </div>
  );

  const renderStepContent = (step: StepId) => {
    if (step === "info") return InfoContent();
    if (step === "variantes") return VariantesContent();
    if (step === "imagenes") return ImagenesContent();
    if (step === "precios") return PreciosContent();
    if (step === "ajustes") return AjustesContent();
    return PagosContent();
  };

  // ── Modo edición (producto existente) — menú de tabs ──────────────────────
  if (!isNew) {
    // "Ajustes" solo existe en edición, nunca como paso del wizard.
    const EDIT_TAB_IDS: StepId[] = [...STEP_IDS, "ajustes"];
    const activeTabId: StepId = EDIT_TAB_IDS.includes(activeTab) ? activeTab : "info";
    const TAB_ICONS: Record<StepId, React.ElementType> = { info: Info, variantes: Layers, imagenes: ImageIcon, precios: DollarSign, pagos: CreditCard, ajustes: SlidersHorizontal };
    const TAB_DESCRIPTIONS: Record<StepId, string> = {
      info: "Nombre, descripción, FAQs y variantes",
      variantes: "Crea y edita las variantes de este producto",
      imagenes: "Fotos del producto y de sus variantes",
      precios: "Precio base, monedas adicionales y por variante",
      pagos: "Métodos de pago generales y por variante",
      ajustes: "Catálogos y eliminar producto",
    };
    const TABS = EDIT_TAB_IDS.map(id => ({ id, label: WIZARD_STEP_LABELS[id], description: TAB_DESCRIPTIONS[id], icon: TAB_ICONS[id] }));
    const activeTabDef = TABS.find(t => t.id === activeTabId) ?? TABS[0];
    const handleSelectTab = (id: StepId) => { setActiveTab(id); setShowMobileContent(true); };

    const HeaderBlock = () => (
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-3 transition-colors">
            <ArrowLeft size={12} /> Volver
          </button>
          <Input value={name} onChange={e => setName(e.target.value)}
            className="text-xl font-semibold border-none h-auto p-0 px-2 -ml-2 hover:bg-secondary/50 focus-visible:ring-0 w-full max-w-sm mb-1"
            placeholder="Nombre del producto" />
          <p className="text-sm text-muted-foreground px-2 -ml-2">Configura los detalles de este producto</p>
        </div>
        {autoSaveStatus !== "idle" && (
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            {autoSaveStatus === "saving" ? <><Loader2 size={11} className="animate-spin" />Guardando...</> : <><span className="text-green-500 font-semibold">✓</span> Guardado</>}
          </span>
        )}
      </div>
    );

    return (
      <>
        <DeleteConfirmDialog
          open={confirmDelete} onOpenChange={setConfirmDelete}
          onConfirm={async () => { await deleteProductMutation.mutateAsync(product!.id); toast.success("Producto eliminado"); onBack(); }}
          isPending={deleteProductMutation.isPending}
          description="Se eliminará el producto permanentemente junto con sus variantes y métodos de pago. Esta acción no se puede deshacer."
        />

        {/* Mobile */}
        <div className="lg:hidden">
          {!showMobileContent ? (
            <div className="space-y-6">
              <HeaderBlock />
              <div className="bg-card border rounded-2xl overflow-hidden divide-y divide-border/50">
                {TABS.map(t => (
                  <button key={t.id} onClick={() => handleSelectTab(t.id)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-secondary/60 transition-colors">
                    <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                      <t.icon size={15} className="text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">{t.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{t.description}</p>
                    </div>
                    <ChevronRight size={14} className="shrink-0 text-muted-foreground/30" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <button onClick={() => setShowMobileContent(false)} className="flex items-center gap-0.5 text-primary text-sm font-medium -ml-1 hover:opacity-75 transition-opacity">
                <ChevronLeft size={20} /> {name || "Producto"}
              </button>
              <div>
                <h2 className="text-xl font-semibold leading-tight">{activeTabDef.label}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{activeTabDef.description}</p>
              </div>
              {renderStepContent(activeTabId)}
            </div>
          )}
        </div>

        {/* Desktop */}
        <div className="hidden lg:block space-y-6">
          <HeaderBlock />
          <div className="overflow-x-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            <div className="inline-flex items-center gap-0.5 bg-secondary/60 rounded-xl p-1 min-w-max">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    activeTabId === t.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}>
                  <t.icon size={13} className="shrink-0" /> {t.label}
                </button>
              ))}
            </div>
          </div>
          {renderStepContent(activeTabId)}
        </div>
      </>
    );
  }

  // ── Wizard (producto nuevo) — solo se guarda al llegar al final ──────────
  const TOTAL = STEP_IDS.length;
  const isLast = safeWizardStep === TOTAL - 1;
  const next = () => { if (safeWizardStep < TOTAL - 1) setWizardStep(s => s + 1); };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <button onClick={() => { clearDraft(); onBack(); }} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-3 transition-colors">
          <ArrowLeft size={12} /> Cancelar
        </button>
        <h2 className="text-lg font-semibold">Nuevo producto</h2>
        <p className="text-sm text-muted-foreground">{WIZARD_STEP_LABELS[currentStepId]} — Paso {safeWizardStep + 1} de {TOTAL}</p>
      </div>

      <div className="flex items-center gap-2">
        {STEP_IDS.map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold transition-colors ${
              i < safeWizardStep ? "bg-primary text-primary-foreground" : i === safeWizardStep ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}>
              {i < safeWizardStep ? <Check size={12} /> : i + 1}
            </div>
            {i < TOTAL - 1 && <div className={`flex-1 h-0.5 rounded w-6 ${i < safeWizardStep ? "bg-primary" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      <div className="bg-card border rounded-2xl p-6">
        <h3 className="text-sm font-semibold mb-4">{WIZARD_STEP_LABELS[currentStepId]}</h3>
        {renderStepContent(currentStepId)}
      </div>

      <div className="flex gap-2 justify-between">
        {safeWizardStep > 0 && (
          <Button variant="outline" size="sm" onClick={() => setWizardStep(s => s - 1)} className="h-9 text-xs">
            <ArrowLeft size={12} className="mr-1" /> Atrás
          </Button>
        )}
        <div className="flex gap-2 ml-auto">
          {isLast ? (
            <Button onClick={handleCreate} disabled={saving || !name.trim()} className="h-9 px-5 gap-1.5">
              {saving ? <Loader2 size={13} className="animate-spin" /> : null}
              {saving ? "Creando..." : "Crear producto"}
            </Button>
          ) : (
            <Button size="sm" onClick={next} disabled={safeWizardStep === 0 && !name.trim()} className="h-9 text-xs">
              Continuar →
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
