import { useState, useRef, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Plus, Trash2, Loader2, Package, ImageIcon,
  Copy, Check, Pencil, X, Link, FileText, ExternalLink,
  AlertTriangle, Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/useAuth";
import PaymentMethodsEditor from "@/components/shared/PaymentMethodsEditor";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";
import {
  useCatalogs, useUpsertCatalog, useDeleteCatalog,
  useProducts, useCatalogProducts, useProductCatalogIds,
  useUpsertProduct, useDeleteProduct, useToggleCatalogProduct,
  useProductVariants, useUpsertProductVariant, useDeleteProductVariant,
  useOrphanProducts, useBusinessProfile, useAIAgentConfig,
  useAllProductVariants,
} from "@/hooks/useCrmData";
import type { CrmCatalog, CrmProduct, CrmProductVariant } from "@/lib/supabase";

const CURRENCIES: { value: string; label: string }[] = [
  { value: "USD", label: "$ USD — Dólar" },
  { value: "BOB", label: "Bs. BOB — Boliviano" },
  { value: "PEN", label: "S/ PEN — Sol" },
];
const CUR_SYM: Record<string, string> = { USD: "$", BOB: "Bs.", PEN: "S/" };
const fmtProd = (amount: number, cur: string) => `${CUR_SYM[cur] ?? cur} ${amount.toFixed(2)}`;

// ─── Stock badge con tres niveles de color ────────────────────────────────────
// variantTotal: suma de stocks de variantes (solo para has_variants=true); null = usar product.stock
const StockBadge = ({ stock, stockEnabled, variantTotal }: { stock: number | null; stockEnabled: boolean; variantTotal?: number | null }) => {
  const effectiveTracking = stockEnabled || variantTotal !== undefined && variantTotal !== null;
  if (!effectiveTracking) return null;
  const s = variantTotal !== undefined && variantTotal !== null ? variantTotal : (stock ?? 0);
  const label = variantTotal !== undefined && variantTotal !== null ? `${s} u. total` : `${s} u.`;
  if (s === 0) return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">Sin stock</span>
  );
  if (s <= 5) return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium">{label} ⚠️</span>
  );
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium">{label}</span>
  );
};

// ─── Ajustador de stock rápido (+/-) sin entrar al editor completo ─────────────
const StockAdjuster = ({ productId, variantId, currentStock, onDone }: {
  productId: string; variantId?: string; currentStock: number; onDone?: () => void;
}) => {
  const upsertProduct = useUpsertProduct();
  const qc = useQueryClient();
  const [val, setVal] = useState(currentStock);
  const [saving, setSaving] = useState(false);

  const adjust = (delta: number) => setVal(v => Math.max(0, v + delta));

  const save = async () => {
    setSaving(true);
    try {
      if (variantId) {
        // Update directo solo del campo stock — no toca nombre ni otros campos de la variante
        const { error } = await supabase
          .from("crm_product_variants")
          .update({ stock: val })
          .eq("id", variantId);
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ["crm_product_variants", productId] });
        qc.invalidateQueries({ queryKey: ["crm_all_product_variants"] });
      } else {
        await upsertProduct.mutateAsync({ id: productId, stock: val } as any);
      }
      toast.success("Stock actualizado");
      onDone?.();
    } catch { toast.error("Error al actualizar stock"); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
      <button onClick={() => adjust(-1)} className="w-6 h-6 rounded-md border flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors">
        <Minus size={10} />
      </button>
      <input
        type="number" min={0} value={val}
        onChange={e => setVal(Math.max(0, parseInt(e.target.value) || 0))}
        className="w-12 h-6 border rounded-md text-center text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <button onClick={() => adjust(1)} className="w-6 h-6 rounded-md border flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors">
        <Plus size={10} />
      </button>
      <button onClick={save} disabled={saving || val === currentStock}
        className="h-6 px-2 rounded-md bg-primary text-primary-foreground text-[10px] font-medium disabled:opacity-40 transition-colors">
        {saving ? <Loader2 size={9} className="animate-spin" /> : "OK"}
      </button>
    </div>
  );
};

// ─── Panel inline de stock por variante (lazy-load al abrir) ──────────────────
const VariantStockPanel = ({ productId }: { productId: string }) => {
  const [open, setOpen] = useState(false);
  const { data: variants = [], isLoading } = useProductVariants(open ? productId : null);

  return (
    <div onClick={e => e.stopPropagation()} className="pt-0.5">
      <button
        onClick={() => setOpen(v => !v)}
        className="text-[11px] text-primary hover:underline flex items-center gap-1"
      >
        <Package size={10} />
        {open ? "Cerrar" : "Ajustar stock de variantes"}
      </button>
      {open && (
        <div className="mt-1.5 space-y-1.5 border rounded-xl p-2 bg-secondary/20">
          {isLoading && <p className="text-xs text-muted-foreground">Cargando...</p>}
          {!isLoading && variants.length === 0 && <p className="text-xs text-muted-foreground">Sin variantes</p>}
          {variants.map(v => (
            <div key={v.id} className="flex items-center gap-2">
              <span className="text-xs flex-1 truncate font-medium">{v.name}</span>
              <StockAdjuster productId={productId} variantId={v.id} currentStock={v.stock ?? 0} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const generateSlug = (name: string) =>
  name.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"").replace(/-+/g,"-").slice(0,60);

// ─── Image Slot ───────────────────────────────────────────────────────────────
function ImageSlot({ url, index, productId, userId, onUploaded, onRemove }: {
  url?: string; index: number; productId: string; userId: string;
  onUploaded: (url: string, index: number) => void;
  onRemove: (index: number) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${userId}/${productId}/${Date.now()}-${index}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      onUploaded(data.publicUrl, index);
    } catch (e: any) { toast.error(e.message?.slice(0,80) ?? "Error al subir imagen"); }
    finally { setUploading(false); }
  };

  const isMain = index === 0;
  const cls = isMain ? "col-span-2 row-span-2 h-40" : "h-[76px]";

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
          <Plus size={isMain ? 20 : 14} />
          {isMain && <span className="text-[10px]">Principal</span>}
        </div>
      )}
    </div>
  );
}

// ─── Variant Row ──────────────────────────────────────────────────────────────
function VariantRow({ variant, basePrice, baseCurrency, productId, onSaved, onDelete }: {
  variant: Partial<CrmProductVariant> & { _new?: boolean };
  basePrice: number; baseCurrency: string; productId: string;
  onSaved: (v: CrmProductVariant) => void;
  onDelete: (id: string) => void;
}) {
  const upsert = useUpsertProductVariant();
  const remove = useDeleteProductVariant();
  const [isEditing, setIsEditing]         = useState(!!variant._new || !variant.id);
  const [name, setName]                   = useState(variant.name ?? "");
  const [priceOverride, setPriceOverride] = useState(variant.price_override != null ? String(variant.price_override) : "");
  const [discountPct, setDiscountPct]     = useState(variant.discount_pct ?? 0);
  const [stock, setStock]                 = useState(variant.stock != null ? String(variant.stock) : "");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPayments, setShowPayments]   = useState(false);

  const effectiveBase = priceOverride !== "" ? parseFloat(priceOverride) : basePrice;
  const finalPrice = discountPct > 0 ? effectiveBase * (1 - discountPct / 100) : effectiveBase;

  const handleSave = async () => {
    if (!name.trim()) return;
    const saved = await upsert.mutateAsync({
      ...(variant.id ? { id: variant.id } : {}),
      product_id: productId,
      name: name.trim(),
      price_override: priceOverride !== "" ? parseFloat(priceOverride) : null,
      discount_pct: discountPct,
      stock: stock !== "" ? parseInt(stock) : null,
      sort_order: variant.sort_order ?? 0,
    });
    onSaved(saved);
    setIsEditing(false);
    toast.success("Variante guardada");
  };

  const handleDelete = async () => {
    if (!variant.id) { onDelete("_new"); return; }
    await remove.mutateAsync({ id: variant.id, productId });
    onDelete(variant.id);
    toast.success("Variante eliminada");
  };

  // ── Vista compacta (modo lectura) ──────────────────────────────────────────
  if (!isEditing && variant.id) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 bg-secondary/30 rounded-xl px-3 py-2.5">
          <span className="flex-1 text-sm font-medium truncate">{name}</span>
          <span className="text-sm text-primary font-semibold shrink-0">{fmtProd(finalPrice, baseCurrency)}</span>
          {discountPct > 0 && (
            <span className="text-xs text-emerald-600 font-medium shrink-0">-{discountPct}%</span>
          )}
          <StockBadge stock={stock !== "" ? parseInt(stock) : null} stockEnabled={stock !== ""} />
          <button onClick={() => setIsEditing(true)}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <Pencil size={13} />
          </button>
          <button onClick={() => setShowDeleteConfirm(true)}
            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0">
            <Trash2 size={13} />
          </button>
        </div>
        {variant.id && (
          <div className="pl-3">
            <button onClick={() => setShowPayments(v => !v)}
              className="text-[11px] text-primary hover:text-primary/70 flex items-center gap-1 transition-colors underline-offset-2 hover:underline">
              <Link size={10} /> {showPayments ? `Ocultar métodos de pago de "${name}"` : `Métodos de pago para "${name}"`}
            </button>
            {showPayments && (
              <div className="mt-2 pl-2 border-l border-border/60">
                <PaymentMethodsEditor entityType="product_variant" entityId={variant.id} />
              </div>
            )}
          </div>
        )}
        <DeleteConfirmDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          title="Eliminar variante"
          description={`¿Eliminar la variante "${name}"? Esta acción no se puede deshacer.`}
          onConfirm={handleDelete}
        />
      </div>
    );
  }

  // ── Modo edición ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-2 bg-secondary/20 border rounded-xl p-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Nombre de variante *</label>
          <Input value={name} onChange={e => setName(e.target.value)}
            placeholder="Ej: Talla L, Color Rojo" className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Precio ({baseCurrency})</label>
          <Input value={priceOverride} onChange={e => setPriceOverride(e.target.value)}
            type="number" placeholder={`${basePrice} (usa precio base)`} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Descuento %</label>
          <Input value={discountPct || ""} onChange={e => setDiscountPct(Math.min(99, Math.max(0, parseFloat(e.target.value) || 0)))}
            type="number" placeholder="0" min={0} max={99} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Stock (unidades)</label>
          <Input value={stock} onChange={e => setStock(e.target.value)}
            type="number" placeholder="Sin límite" className="h-8 text-sm" />
        </div>
      </div>
      {discountPct > 0 && (
        <p className="text-xs text-emerald-600 font-medium">
          Precio final: {fmtProd(finalPrice, baseCurrency)} ({discountPct}% descuento)
        </p>
      )}
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleSave} disabled={!name.trim() || upsert.isPending} className="h-8 px-3 text-xs">
          {upsert.isPending ? <Loader2 size={11} className="animate-spin mr-1" /> : <Check size={11} className="mr-1" />}
          Guardar variante
        </Button>
        {!variant._new && (
          <button onClick={() => setIsEditing(false)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Cancelar
          </button>
        )}
        {variant.id && (
          <button onClick={() => setShowDeleteConfirm(true)}
            className="ml-auto p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 size={13} />
          </button>
        )}
      </div>
      <DeleteConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Eliminar variante"
        description={`¿Eliminar la variante "${name}"? Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <div onClick={onChange} className={`relative w-9 h-5 rounded-full transition-colors shrink-0 cursor-pointer ${value ? "bg-primary" : "bg-secondary border"}`}>
      <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? "translate-x-4" : ""}`} />
    </div>
  );
}

// ─── Product Editor ───────────────────────────────────────────────────────────
const WIZARD_STEPS = ["Información", "Imágenes", "Variantes", "Entregable", "Métodos de pago", "Catálogos"] as const;

function ProductEditor({ initialProduct, fromCatalogId, allCatalogs, onBack }: {
  initialProduct: CrmProduct | null;
  fromCatalogId: string | null;
  allCatalogs: CrmCatalog[];
  onBack: () => void;
}) {
  const { user } = useCurrentUser();
  const upsertProduct  = useUpsertProduct();
  const toggleCatalog  = useToggleCatalogProduct();
  const deleteProduct  = useDeleteProduct();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isNew = !initialProduct;
  const [wizardStep, setWizardStep]       = useState(isNew ? 0 : -1); // -1 = full edit, 0..5 = wizard steps
  const [product, setProduct]             = useState<CrmProduct | null>(initialProduct);
  const [saving, setSaving]               = useState(false);
  const [name, setName]                   = useState(initialProduct?.name ?? "");
  const [description, setDescription]     = useState(initialProduct?.description ?? "");
  const [price, setPrice]                 = useState(initialProduct?.price ?? 0);
  const [discountPct, setDiscountPct]     = useState(initialProduct?.discount_pct ?? 0);
  const [currency, setCurrency]           = useState(initialProduct?.currency ?? "USD");
  const [sku, setSku]                     = useState(initialProduct?.sku ?? "");
  const [isActive, setIsActive]           = useState(initialProduct?.is_active ?? true);
  const [images, setImages]               = useState<string[]>(initialProduct?.images ?? []);
  const [stockEnabled, setStockEnabled]   = useState(initialProduct?.stock_enabled ?? false);
  const [stockVal, setStockVal]           = useState(initialProduct?.stock != null ? String(initialProduct.stock) : "");
  const [hasVariants, setHasVariants]     = useState(initialProduct?.has_variants ?? false);
  const [newVariantRows, setNewVariantRows] = useState<Array<{ _key: number; sort_order: number }>>([]);
  const [delivType, setDelivType]         = useState<"file"|"text"|null>(initialProduct?.deliverable_type ?? null);
  const [delivText, setDelivText]         = useState(initialProduct?.deliverable_text ?? "");
  const [delivUrl, setDelivUrl]           = useState(initialProduct?.deliverable_url ?? "");
  const [uploadingDeliv, setUploadingDeliv] = useState(false);
  const delivRef = useRef<HTMLInputElement>(null);
  const nkey = useRef(0);

  const { data: savedVariants = [], refetch: refetchVariants } = useProductVariants(product?.id ?? null);
  const { data: memberCatalogIds = [], refetch: refetchCatalogIds } = useProductCatalogIds(product?.id ?? null);

  const addedToFromCatalog = useRef(false);
  useEffect(() => {
    if (product?.id && fromCatalogId && !addedToFromCatalog.current) {
      addedToFromCatalog.current = true;
      toggleCatalog.mutate({ catalogId: fromCatalogId, productId: product.id, add: true },
        { onSuccess: () => refetchCatalogIds() });
    }
  }, [product?.id]);

  const buildPayload = () => ({
    ...(product?.id ? { id: product.id } : {}),
    name: name.trim(),
    description: description || null,
    price,
    discount_pct: discountPct,
    currency,
    sku: sku || null,
    is_active: isActive,
    images,
    stock_enabled: stockEnabled,
    stock: stockEnabled && stockVal !== "" ? parseInt(stockVal) : null,
    has_variants: hasVariants,
    deliverable_type: delivType,
    deliverable_url: delivType === "file" ? (delivUrl || null) : null,
    deliverable_text: delivType === "text" ? (delivText || null) : null,
  });

  const handleSave = async (andNext?: boolean) => {
    if (!name.trim()) { toast.error("El nombre es obligatorio"); return; }
    setSaving(true);
    try {
      const saved = await upsertProduct.mutateAsync(buildPayload());
      setProduct(saved);
      toast.success(product ? "Producto actualizado" : "Producto creado");
      if (andNext) setWizardStep(1);
    } catch (e: any) { toast.error(e.message?.slice(0,100) ?? "Error al guardar"); }
    finally { setSaving(false); }
  };

  const handleImageUploaded = async (url: string, index: number) => {
    const updated = [...images];
    updated[index] = url;
    setImages(updated);
    if (product) await upsertProduct.mutateAsync({ id: product.id, name, price, images: updated });
  };

  const handleImageRemove = async (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    setImages(updated);
    if (product) await upsertProduct.mutateAsync({ id: product.id, name, price, images: updated });
  };

  const handleDelivUpload = async (file: File) => {
    if (!product) return;
    const ALLOWED_MIME = ["application/pdf", "application/zip", "application/x-zip-compressed", "application/x-zip"];
    if (!ALLOWED_MIME.includes(file.type)) { toast.error("Solo se permiten archivos PDF o ZIP"); return; }
    if (file.size > 52428800) { toast.error("El archivo supera 50 MB"); return; }
    setUploadingDeliv(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
      const path = `${user!.id}/${product.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("product-deliverables").upload(path, file, { upsert: true });
      if (error) throw error;
      // El bucket es privado — guardamos la URL pública como referencia de path,
      // la signed URL se genera en el edge function al momento del envío
      const { data } = supabase.storage.from("product-deliverables").getPublicUrl(path);
      setDelivUrl(data.publicUrl);
      await upsertProduct.mutateAsync({ id: product.id, name, price, deliverable_type: "file", deliverable_url: data.publicUrl });
      toast.success("Archivo subido");
    } catch (e: any) { toast.error(e.message?.slice(0,80) ?? "Error"); }
    finally { setUploadingDeliv(false); }
  };

  const handleDelivSave = async () => {
    if (!product) return;
    await upsertProduct.mutateAsync({ id: product.id, name, price, deliverable_type: delivType, deliverable_url: delivType === "file" ? (delivUrl || null) : null, deliverable_text: delivType === "text" ? (delivText || null) : null });
    toast.success("Entregable guardado");
  };

  // ── Secciones reutilizables (llamadas como funciones, no como componentes JSX)
  const InfoSection = () => (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Nombre <span className="text-destructive">*</span></label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Ebook de Marketing Digital" className="h-9 text-sm" />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Descripción</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Describe tu producto..."
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Precio</label>
          <Input type="number" value={price} onChange={e => setPrice(parseFloat(e.target.value) || 0)} className="h-9 text-sm" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Moneda</label>
          <select value={currency} onChange={e => setCurrency(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Descuento (%)</label>
          <Input type="number" value={discountPct} onChange={e => setDiscountPct(Math.min(99, Math.max(0, parseFloat(e.target.value) || 0)))}
            min={0} max={99} className="h-9 text-sm" placeholder="0" />
        </div>
      </div>
      {discountPct > 0 && (
        <p className="text-xs text-emerald-600 font-medium -mt-1">
          Precio final: {fmtProd(price * (1 - discountPct / 100), currency)} ({discountPct}% descuento)
        </p>
      )}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">SKU <span className="text-muted-foreground/50">(opcional)</span></label>
        <Input value={sku} onChange={e => setSku(e.target.value)} placeholder="SKU-001" className="h-9 text-sm font-mono" />
      </div>
      <div className="space-y-3 pt-1 border-t">
        <label className="flex items-center gap-2.5 cursor-pointer pt-3">
          <Toggle value={isActive} onChange={() => setIsActive(!isActive)} />
          <span className="text-sm">Visible en el Catálogo</span>
        </label>
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
    </div>
  );

  const ImagesSection = () => (
    product ? (
      <div className="space-y-3">
        <div className="grid grid-cols-4 gap-2">
          {[0,1,2,3,4].map(i => (
            <ImageSlot key={i} url={images[i]} index={i} productId={product.id} userId={user!.id}
              onUploaded={handleImageUploaded} onRemove={handleImageRemove} />
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground/60">La primera imagen es la principal del catálogo</p>
      </div>
    ) : <p className="text-xs text-muted-foreground/60">—</p>
  );

  const VariantsSection = () => (
    <div className="space-y-4">
      <label className="flex items-center gap-2.5 cursor-pointer">
        <Toggle value={hasVariants} onChange={() => setHasVariants(!hasVariants)} />
        <span className="text-sm">Este producto tiene variantes</span>
      </label>
      {hasVariants && product && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground/80">Si no pones precio, la variante usa el precio base ({fmtProd(price, currency)}). Cada variante puede tener sus propios métodos de pago.</p>
          {savedVariants.map(v => (
            <VariantRow key={v.id} variant={v} basePrice={price} baseCurrency={currency} productId={product.id}
              onSaved={() => refetchVariants()} onDelete={() => refetchVariants()} />
          ))}
          {newVariantRows.map(row => (
            <VariantRow key={row._key} variant={{ sort_order: row.sort_order, _new: true }} basePrice={price} baseCurrency={currency} productId={product.id}
              onSaved={() => { setNewVariantRows(prev => prev.filter(r => r._key !== row._key)); refetchVariants(); }}
              onDelete={() => setNewVariantRows(prev => prev.filter(r => r._key !== row._key))} />
          ))}
          <button onClick={() => { nkey.current++; setNewVariantRows(prev => [...prev, { _key: nkey.current, sort_order: savedVariants.length + newVariantRows.length }]); }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Plus size={12} /> Añadir variante
          </button>
        </div>
      )}
      {!hasVariants && <p className="text-xs text-muted-foreground/60">Sin variantes — el producto se vende tal cual.</p>}
    </div>
  );

  const DelivSection = () => (
    <div className="space-y-4">
      <label className="flex items-center gap-2.5 cursor-pointer">
        <Toggle value={!!delivType} onChange={() => setDelivType(delivType ? null : "file")} />
        <span className="text-sm">Este producto tiene entregable digital</span>
      </label>
      {delivType && (
        <>
          <div className="flex gap-2 flex-wrap">
            {(["file","text"] as const).map(t => (
              <button key={t} onClick={() => setDelivType(t)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${delivType === t ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-secondary"}`}>
                {t === "file" ? <><FileText size={12} /> Archivo (PDF/ZIP)</> : <><Link size={12} /> Texto / Link</>}
              </button>
            ))}
          </div>
          {delivType === "file" && (
            <div className="space-y-2">
              <input ref={delivRef} type="file" accept=".pdf,.zip,application/pdf,application/zip,application/x-zip-compressed" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleDelivUpload(f); e.target.value = ""; }} />
              {delivUrl ? (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-secondary/40 border">
                  <FileText size={14} className="text-muted-foreground shrink-0" />
                  <span className="text-xs flex-1 text-muted-foreground">Archivo subido</span>
                  <button
                    onClick={async () => {
                      try {
                        const url = new URL(delivUrl);
                        const path = url.pathname.split("/product-deliverables/")[1];
                        const { data } = await supabase.storage.from("product-deliverables").createSignedUrl(path, 300);
                        if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                      } catch { toast.error("No se pudo abrir el archivo"); }
                    }}
                    className="text-primary"
                  >
                    <ExternalLink size={13} />
                  </button>
                  <button onClick={() => delivRef.current?.click()} className="text-xs text-muted-foreground hover:text-foreground">Reemplazar</button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => delivRef.current?.click()} disabled={uploadingDeliv} className="h-8 text-xs gap-1.5">
                  {uploadingDeliv ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
                  {uploadingDeliv ? "Subiendo..." : "Subir PDF o ZIP"}
                </Button>
              )}
            </div>
          )}
          {delivType === "text" && (
            <textarea value={delivText} onChange={e => setDelivText(e.target.value)} rows={3}
              placeholder="Ej: https://drive.google.com/... o instrucciones de acceso"
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          )}
          <p className="text-xs text-emerald-600 flex items-center gap-1.5"><Check size={11} /> Se enviará automáticamente por WhatsApp al confirmar la venta</p>
        </>
      )}
      {!delivType && <p className="text-xs text-muted-foreground/60">Producto físico sin entregable digital.</p>}
    </div>
  );

  const PaymentsSection = () => (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground/70">El Agente IA usará estos métodos al cerrar ventas. Sin métodos → transfiere a modo Manual.</p>
      <PaymentMethodsEditor entityType="product" entityId={product?.id ?? null} />
    </div>
  );

  const CatalogsSection = () => (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground/70">Selecciona en qué catálogos aparece este producto:</p>
      {allCatalogs.length === 0
        ? <p className="text-xs text-muted-foreground/60 italic">No tienes catálogos creados aún.</p>
        : <div className="space-y-2">
            {allCatalogs.map(cat => {
              const isMember = memberCatalogIds.includes(cat.id);
              return (
                <label key={cat.id} className="flex items-center gap-2.5 cursor-pointer group">
                  <input type="checkbox" checked={isMember}
                    onChange={() => product && toggleCatalog.mutate({ catalogId: cat.id, productId: product.id, add: !isMember }, { onSuccess: () => refetchCatalogIds() })}
                    className="rounded border-input" />
                  <span className="text-sm">{cat.name}</span>
                  {!cat.is_active && <span className="text-[10px] text-muted-foreground/50">(privado)</span>}
                </label>
              );
            })}
          </div>
      }
    </div>
  );

  if (!user) return null;

  // ── Wizard mode (new product) ──────────────────────────────────────────────
  if (wizardStep >= 0) {
    const TOTAL = WIZARD_STEPS.length;
    const next = () => { if (wizardStep < TOTAL - 1) setWizardStep(s => s + 1); else onBack(); };
    const isLast = wizardStep === TOTAL - 1;

    return (
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div>
          <button onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-3 transition-colors">
            <ArrowLeft size={12} /> Cancelar
          </button>
          <h2 className="text-lg font-semibold">Nuevo producto</h2>
          <p className="text-sm text-muted-foreground">{WIZARD_STEPS[wizardStep]} — Paso {wizardStep + 1} de {TOTAL}</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {WIZARD_STEPS.map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold transition-colors ${
                i < wizardStep ? "bg-primary text-primary-foreground" :
                i === wizardStep ? "bg-primary text-primary-foreground" :
                "bg-secondary text-muted-foreground"
              }`}>
                {i < wizardStep ? <Check size={12} /> : i + 1}
              </div>
              {i < TOTAL - 1 && <div className={`flex-1 h-0.5 rounded w-6 ${i < wizardStep ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="bg-card border rounded-2xl p-6">
          <h3 className="text-sm font-semibold mb-4">{WIZARD_STEPS[wizardStep]}</h3>
          {wizardStep === 0 && InfoSection()}
          {wizardStep === 1 && ImagesSection()}
          {wizardStep === 2 && VariantsSection()}
          {wizardStep === 3 && DelivSection()}
          {wizardStep === 4 && PaymentsSection()}
          {wizardStep === 5 && CatalogsSection()}
        </div>

        {/* Navigation */}
        <div className="flex gap-2 justify-between">
          {wizardStep > 0 && (
            <Button variant="outline" size="sm" onClick={() => setWizardStep(s => s - 1)} className="h-9 text-xs">
              <ArrowLeft size={12} className="mr-1" /> Atrás
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            {wizardStep === 0 ? (
              <Button onClick={() => handleSave(true)} disabled={saving || !name.trim()} className="h-9 px-5 gap-1.5">
                {saving ? <Loader2 size={13} className="animate-spin" /> : null}
                {saving ? "Guardando..." : "Crear y continuar →"}
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={next} className="h-9 text-xs">
                  {isLast ? "Finalizar" : "Omitir"}
                </Button>
                {wizardStep === 3 && delivType && (
                  <Button size="sm" onClick={async () => { await handleDelivSave(); next(); }} disabled={saving} className="h-9 text-xs">
                    Guardar y continuar →
                  </Button>
                )}
                {wizardStep !== 3 && (
                  <Button size="sm" onClick={next} className="h-9 text-xs">
                    {isLast ? "Finalizar" : "Continuar →"}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Full edit mode (existing product) ─────────────────────────────────────
  return (
    <>
      <DeleteConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        onConfirm={async () => { await deleteProduct.mutateAsync(product!.id); toast.success("Producto eliminado"); onBack(); }}
        isPending={deleteProduct.isPending}
        description="Se eliminará el producto permanentemente junto con sus variantes y métodos de pago. Esta acción no se puede deshacer."
      />
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <button onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-2 transition-colors">
            <ArrowLeft size={12} /> Volver
          </button>
          <h2 className="text-lg font-semibold">{name}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setConfirmDelete(true)}
            className="h-9 px-4 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30">
            <Trash2 size={13} className="mr-1.5" /> Eliminar
          </Button>
          <Button onClick={() => handleSave()} disabled={saving} className="h-9 px-5">
            {saving && <Loader2 size={13} className="animate-spin mr-1.5" />}
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card border rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-semibold">Información básica</h3>
          {InfoSection()}
        </div>
        <div className="bg-card border rounded-2xl p-6 space-y-3">
          <h3 className="text-sm font-semibold">Imágenes</h3>
          {ImagesSection()}
        </div>
      </div>

      <div className="bg-card border rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold">Variantes</h3>
        {VariantsSection()}
      </div>

      <div className="bg-card border rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold">Entregable digital</h3>
        {DelivSection()}
      </div>

      <div className="bg-card border rounded-2xl p-6 space-y-3">
        <h3 className="text-sm font-semibold">Métodos de pago</h3>
        {PaymentsSection()}
      </div>

      <div className="bg-card border rounded-2xl p-6 space-y-3">
        <h3 className="text-sm font-semibold">Catálogos</h3>
        {CatalogsSection()}
      </div>
    </div>
    </>
  );
}

// ─── Catalog View ─────────────────────────────────────────────────────────────
function CatalogView({ catalog, allProducts, variantStockMap, onBack, onEditProduct, onCreateProduct }: {
  catalog: CrmCatalog; allProducts: CrmProduct[]; variantStockMap: Map<string, number>;
  onBack: () => void;
  onEditProduct: (p: CrmProduct) => void;
  onCreateProduct: (catalogId: string) => void;
}) {
  const { data: catalogProducts = [], refetch } = useCatalogProducts(catalog.id);
  const toggleCatalog = useToggleCatalogProduct();
  const [showAddExisting, setShowAddExisting] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);
  const inCatalogIds = new Set(catalogProducts.map(p => p.id));
  const available = allProducts.filter(p =>
    !inCatalogIds.has(p.id) && (!addSearch || p.name.toLowerCase().includes(addSearch.toLowerCase()))
  );

  const handleRemove = (productId: string) => {
    toggleCatalog.mutate({ catalogId: catalog.id, productId, add: false },
      { onSuccess: () => { refetch(); setRemoveTarget(null); toast.success("Producto quitado del catálogo"); } });
  };

  return (
    <>
      <DeleteConfirmDialog
        open={!!removeTarget}
        onOpenChange={open => { if (!open) setRemoveTarget(null); }}
        onConfirm={() => removeTarget && handleRemove(removeTarget.id)}
        isPending={toggleCatalog.isPending}
        description={`"${removeTarget?.name}" dejará de aparecer en este catálogo. El producto no se eliminará y podrás añadirlo de nuevo cuando quieras.`}
      />
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <button onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-2 transition-colors">
            <ArrowLeft size={12} /> Todos los catálogos
          </button>
          <h2 className="text-lg font-semibold">{catalog.name}</h2>
          <p className="text-xs text-muted-foreground">{catalogProducts.length} producto{catalogProducts.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAddExisting(v => !v)} className="h-8 text-xs gap-1">
            <Plus size={12} /> Añadir existente
          </Button>
          <Button size="sm" onClick={() => onCreateProduct(catalog.id)} className="h-8 text-xs gap-1">
            <Plus size={12} /> Nuevo producto
          </Button>
        </div>
      </div>

      {showAddExisting && (
        <div className="bg-card border rounded-2xl p-4 space-y-3">
          <p className="text-sm font-medium">Seleccionar producto existente</p>
          <Input value={addSearch} onChange={e => setAddSearch(e.target.value)} placeholder="Buscar..." className="h-8 text-sm" />
          <div className="max-h-52 overflow-y-auto space-y-1">
            {available.length === 0 && <p className="text-xs text-muted-foreground/60 italic">No hay más productos para añadir.</p>}
            {available.map(p => (
              <button key={p.id}
                onClick={() => toggleCatalog.mutate({ catalogId: catalog.id, productId: p.id, add: true },
                  { onSuccess: () => { refetch(); toast.success("Producto añadido"); setAddSearch(""); } })}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-secondary transition-colors text-left">
                {p.images[0] ? (
                  <img src={p.images[0]} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <Package size={13} className="text-muted-foreground" />
                  </div>
                )}
                <span className="text-sm flex-1 truncate">{p.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {(p.discount_pct ?? 0) > 0
                    ? <>{fmtProd(p.price * (1 - (p.discount_pct ?? 0) / 100), p.currency)} <span className="line-through opacity-60">{fmtProd(p.price, p.currency)}</span></>
                    : fmtProd(p.price, p.currency)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {catalogProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <Package size={32} className="opacity-20" />
          <p className="text-sm">Sin productos en este catálogo</p>
          <Button size="sm" onClick={() => onCreateProduct(catalog.id)} className="gap-1 mt-1">
            <Plus size={12} /> Crear primer producto
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {catalogProducts.map(p => (
            <div key={p.id}
              className="bg-card border rounded-2xl overflow-hidden hover:shadow-sm transition-shadow group cursor-pointer"
              onClick={() => onEditProduct(p)}>
              <div className="h-36 bg-secondary/40 overflow-hidden">
                {p.images[0] ? (
                  <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package size={28} className="text-muted-foreground/20" />
                  </div>
                )}
              </div>
              <div className="p-3.5 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold leading-tight flex-1">{p.name}</p>
                  <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={e => { e.stopPropagation(); onEditProduct(p); }}
                      className="p-1 rounded-lg hover:bg-secondary text-muted-foreground transition-colors" title="Editar producto">
                      <Pencil size={12} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); setRemoveTarget({ id: p.id, name: p.name }); }}
                      className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Quitar del catálogo">
                      <X size={12} />
                    </button>
                  </div>
                </div>
                <p className="text-sm font-medium text-primary">
                  {(p.discount_pct ?? 0) > 0
                    ? <>{fmtProd(p.price * (1 - (p.discount_pct ?? 0) / 100), p.currency)} <span className="text-xs line-through text-muted-foreground font-normal">{fmtProd(p.price, p.currency)}</span></>
                    : fmtProd(p.price, p.currency)}
                </p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {!p.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">Oculto</span>}
                  <StockBadge stock={p.stock} stockEnabled={p.stock_enabled} variantTotal={p.has_variants ? (variantStockMap.get(p.id) ?? null) : undefined} />
                  {p.deliverable_type && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30">Digital</span>}
                  {p.has_variants && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">Variantes</span>}
                </div>
                {p.stock_enabled && !p.has_variants && (
                  <div className="pt-1" onClick={e => e.stopPropagation()}>
                    <StockAdjuster productId={p.id} currentStock={p.stock ?? 0} />
                  </div>
                )}
                {p.has_variants && (
                  <VariantStockPanel productId={p.id} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  );
}

// ─── Catalog Card ─────────────────────────────────────────────────────────────
function CatalogCard({ catalog, businessSlug, onEnter, onEdit, onDelete }: {
  catalog: CrmCatalog; businessSlug: string | null;
  onEnter: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const publicUrl = businessSlug
    ? `${window.location.origin}/catalogo/${businessSlug}/${catalog.slug}`
    : null;
  const { data: products = [] } = useCatalogProducts(catalog.id);

  return (
    <div
      className="bg-card border rounded-2xl overflow-hidden hover:shadow-md transition-all group cursor-pointer active:scale-[0.99]"
      onClick={onEnter}
    >
      {/* Cover image */}
      <div className="h-32 bg-secondary/30 overflow-hidden relative">
        {catalog.cover_image ? (
          <img
            src={catalog.cover_image}
            alt={catalog.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <Package size={28} className="text-muted-foreground/20" />
          </div>
        )}
        {/* Status pill overlay */}
        <div className="absolute top-2.5 left-2.5">
          {catalog.is_active
            ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/90 text-white backdrop-blur-sm">Público</span>
            : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/40 text-white/80 backdrop-blur-sm">Privado</span>
          }
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{catalog.name}</p>
            {catalog.description
              ? <p className="text-xs text-muted-foreground truncate mt-0.5">{catalog.description}</p>
              : <p className="text-xs text-muted-foreground/40 mt-0.5">{products.length} producto{products.length !== 1 ? "s" : ""}</p>
            }
          </div>
          <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={e => { e.stopPropagation(); onEdit(); }}
              className="p-1.5 rounded-xl hover:bg-secondary text-muted-foreground transition-colors"
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[10px] font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-xl">
            {products.length} producto{products.length !== 1 ? "s" : ""}
          </span>
          {catalog.is_active && publicUrl && (
            <button
              onClick={e => {
                e.stopPropagation();
                navigator.clipboard.writeText(publicUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-xl transition-all ${
                copied
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "text-primary bg-primary/8 hover:bg-primary/15"
              }`}
            >
              {copied ? <><Check size={10} /> Copiado</> : <><Copy size={10} /> Compartir</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Catalog Form ─────────────────────────────────────────────────────────────
function CatalogForm({ initial, userId, agentPhone, onSave, onCancel, saving }: {
  initial?: CrmCatalog; userId: string; agentPhone?: string | null;
  onSave: (c: Partial<CrmCatalog> & { name: string; slug: string }) => void;
  onCancel: () => void; saving: boolean;
}) {
  const [name, setName]             = useState(initial?.name ?? "");
  const [slug, setSlug]             = useState(initial?.slug ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [isActive, setIsActive]     = useState(initial?.is_active ?? true);
  const [coverImage, setCoverImage] = useState(initial?.cover_image ?? "");
  const [whatsappNumber, setWhatsappNumber] = useState(initial?.whatsapp_number ?? agentPhone ?? "");
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverRef = useRef<HTMLInputElement>(null);
  const slugEdited = useRef(!!initial);

  const handleNameChange = (v: string) => {
    setName(v);
    if (!slugEdited.current) setSlug(generateSlug(v));
  };

  const handleCoverUpload = async (file: File) => {
    setUploadingCover(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${userId}/catalog-covers/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      setCoverImage(data.publicUrl);
    } catch (e: any) { toast.error(e.message?.slice(0,80) ?? "Error"); }
    finally { setUploadingCover(false); }
  };

  return (
    <div className="bg-card border rounded-2xl p-5 space-y-3">
      <h3 className="text-sm font-semibold">{initial ? "Editar catálogo" : "Nuevo catálogo"}</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Nombre *</label>
          <Input value={name} onChange={e => handleNameChange(e.target.value)} placeholder="Ej: Colección Verano" className="h-9 text-sm" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Slug (URL pública)</label>
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">/catalogo/</span>
            <Input value={slug} onChange={e => { slugEdited.current = true; setSlug(generateSlug(e.target.value)); }}
              placeholder="coleccion-verano" className="h-9 text-sm font-mono flex-1" />
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Descripción (opcional)</label>
        <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Breve descripción" className="h-9 text-sm" />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          WhatsApp para concretar la compra
          {agentPhone && <span className="ml-1.5 text-[10px] text-emerald-600 font-normal">(pre-cargado del Agente IA)</span>}
        </label>
        <Input
          value={whatsappNumber}
          onChange={e => setWhatsappNumber(e.target.value)}
          placeholder="Ej: 59176421171 (con código de país, sin +)"
          className="h-9 text-sm font-mono"
        />
        <p className="text-[10px] text-muted-foreground/60">El botón "Comprar por WhatsApp" en el catálogo público abrirá este número.</p>
      </div>
      <div className="flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-2 cursor-pointer">
          <div onClick={() => setIsActive(!isActive)}
            className={`relative w-8 h-4 rounded-full transition-colors ${isActive ? "bg-primary" : "bg-secondary border"}`}>
            <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${isActive ? "translate-x-4" : ""}`} />
          </div>
          <span className="text-xs text-muted-foreground">{isActive ? "Público" : "Privado"} — {isActive ? "visible en el link compartido" : "no aparece en el link compartido"}</span>
        </label>
        <div className="flex items-center gap-2">
          <input ref={coverRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); e.target.value = ""; }} />
          <Button variant="outline" size="sm" onClick={() => coverRef.current?.click()} disabled={uploadingCover} className="h-7 text-xs gap-1">
            {uploadingCover ? <Loader2 size={10} className="animate-spin" /> : <ImageIcon size={10} />}
            {coverImage ? "Cambiar portada" : "Subir portada"}
          </Button>
          {coverImage && <img src={coverImage} alt="" className="w-8 h-8 rounded-lg object-cover border" />}
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={() => onSave({ ...(initial ? { id: initial.id } : {}), name, slug, description: description || null, is_active: isActive, cover_image: coverImage || null, whatsapp_number: whatsappNumber.trim() || null })}
          disabled={saving || !name.trim() || !slug.trim()} className="h-8 text-xs gap-1">
          {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
          {initial ? "Actualizar" : "Crear catálogo"}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} className="h-8 text-xs">Cancelar</Button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CrmProductos() {
  const { user } = useCurrentUser();
  const { data: catalogs = [], isLoading } = useCatalogs();
  const { data: allProducts = [] }         = useProducts();
  const { data: orphanProducts = [] }      = useOrphanProducts();
  const { data: businessProfile }          = useBusinessProfile();
  const { data: agentConfig }              = useAIAgentConfig();
  const { data: allVariants = [] }         = useAllProductVariants();
  const upsertCatalog = useUpsertCatalog();
  const deleteCatalog = useDeleteCatalog();

  const businessSlug = businessProfile?.slug ?? null;
  const agentPhone   = agentConfig?.verified_phone ?? null;

  // Mapa productId → suma total de stocks de variantes (solo variantes con tracking: stock !== null)
  const variantStockMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of allVariants) {
      if (v.stock !== null) {
        map.set(v.product_id, (map.get(v.product_id) ?? 0) + v.stock);
      }
    }
    return map;
  }, [allVariants]);

  const [view, setView]                       = useState<"catalogs"|"catalog"|"product">("catalogs");
  const [selectedCatalog, setSelectedCatalog] = useState<CrmCatalog | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<CrmProduct | null>(null);
  const [fromCatalogId, setFromCatalogId]     = useState<string | null>(null);
  const [showCatalogForm, setShowCatalogForm] = useState(false);
  const [editingCatalog, setEditingCatalog]   = useState<CrmCatalog | null>(null);
  const [deleteTarget, setDeleteTarget]       = useState<string | null>(null);

  if (!user) return null;

  const handleCatalogSave = async (data: Parameters<typeof upsertCatalog.mutateAsync>[0]) => {
    try {
      await upsertCatalog.mutateAsync(data);
      setShowCatalogForm(false);
      setEditingCatalog(null);
      toast.success(data.id ? "Catálogo actualizado" : "Catálogo creado");
    } catch (e: any) { toast.error(e.message?.slice(0,100) ?? "Error"); }
  };

  if (view === "product") return (
    <ProductEditor
      initialProduct={selectedProduct}
      fromCatalogId={fromCatalogId}
      allCatalogs={catalogs}
      onBack={() => selectedCatalog ? setView("catalog") : setView("catalogs")}
    />
  );

  if (view === "catalog" && selectedCatalog) return (
    <CatalogView
      catalog={selectedCatalog}
      allProducts={allProducts}
      variantStockMap={variantStockMap}
      onBack={() => setView("catalogs")}
      onEditProduct={p => { setSelectedProduct(p); setFromCatalogId(selectedCatalog.id); setView("product"); }}
      onCreateProduct={catalogId => { setSelectedProduct(null); setFromCatalogId(catalogId); setView("product"); }}
    />
  );

  if (isLoading) return (
    <div className="flex items-center justify-center h-40"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
  );

  // Alertas de stock — para productos con variantes usa la suma; para el resto usa product.stock
  const getEffectiveStock = (p: CrmProduct) =>
    p.has_variants ? (variantStockMap.get(p.id) ?? null) : (p.stock_enabled ? (p.stock ?? 0) : null);

  const outOfStockProducts = allProducts.filter(p => {
    const s = getEffectiveStock(p);
    return s !== null && s === 0;
  });
  const lowStockProducts = allProducts.filter(p => {
    const s = getEffectiveStock(p);
    return s !== null && s > 0 && s <= 5;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {catalogs.length > 0
            ? `${catalogs.length} catálogo${catalogs.length !== 1 ? "s" : ""} · ${allProducts.length} producto${allProducts.length !== 1 ? "s" : ""}`
            : "Organiza y comparte tus productos en catálogos públicos"}
        </p>
        {!showCatalogForm && !editingCatalog && (
          <Button size="sm" onClick={() => setShowCatalogForm(true)} className="h-9 text-sm font-semibold gap-1.5 rounded-2xl shrink-0">
            <Plus size={13} /> Nuevo catálogo
          </Button>
        )}
      </div>

      {/* Alertas de stock */}
      {outOfStockProducts.length > 0 && (
        <div className="flex items-start gap-3 bg-destructive/5 border border-destructive/20 rounded-2xl px-4 py-3">
          <AlertTriangle size={15} className="text-destructive shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-destructive">Stock agotado</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {outOfStockProducts.map(p => p.name).join(", ")}
            </p>
          </div>
        </div>
      )}
      {lowStockProducts.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-3">
          <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Stock bajo (≤5 unidades)</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {lowStockProducts.map(p => {
                const s = p.has_variants ? (variantStockMap.get(p.id) ?? 0) : (p.stock ?? 0);
                return `${p.name} (${s} u.)`;
              }).join(", ")}
            </p>
          </div>
        </div>
      )}

      {(showCatalogForm || editingCatalog) && (
        <CatalogForm
          initial={editingCatalog ?? undefined}
          userId={user!.id}
          agentPhone={agentPhone}
          onSave={handleCatalogSave}
          onCancel={() => { setShowCatalogForm(false); setEditingCatalog(null); }}
          saving={upsertCatalog.isPending}
        />
      )}

      {deleteTarget && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 flex items-center justify-between gap-3">
          <p className="text-sm text-destructive">¿Eliminar este catálogo? Los productos no se eliminan, solo se desvinculan.</p>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="destructive" onClick={() => { deleteCatalog.mutateAsync(deleteTarget!).then(() => { setDeleteTarget(null); toast.success("Catálogo eliminado"); }); }} className="h-7 text-xs">Eliminar</Button>
            <Button size="sm" variant="outline" onClick={() => setDeleteTarget(null)} className="h-7 text-xs">Cancelar</Button>
          </div>
        </div>
      )}

      {!showCatalogForm && !editingCatalog && catalogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center bg-card border border-dashed rounded-2xl">
          <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center">
            <Package size={24} className="text-primary/60" />
          </div>
          <div>
            <p className="text-sm font-semibold">Sin catálogos todavía</p>
            <p className="text-xs text-muted-foreground mt-1">Crea tu primer catálogo para organizar y compartir tus productos</p>
          </div>
          <Button size="sm" onClick={() => setShowCatalogForm(true)} className="gap-1.5 rounded-2xl">
            <Plus size={13} /> Crear catálogo
          </Button>
        </div>
      ) : !showCatalogForm && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {catalogs.filter(cat => cat.id !== editingCatalog?.id).map(cat => (
            <CatalogCard
              key={cat.id}
              catalog={cat}
              businessSlug={businessSlug}
              onEnter={() => { setSelectedCatalog(cat); setView("catalog"); }}
              onEdit={() => { setEditingCatalog(cat); setShowCatalogForm(false); }}
              onDelete={() => setDeleteTarget(cat.id)}
            />
          ))}
        </div>
      )}

      {/* Productos sin catálogo */}
      {orphanProducts.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-border" />
            <p className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wide px-2">
              Productos sin catálogo ({orphanProducts.length})
            </p>
            <div className="flex-1 h-px bg-border" />
          </div>
          <p className="text-xs text-muted-foreground/60 text-center">
            Estos productos existen pero no están en ningún catálogo. Puedes editarlos o añadirlos a un catálogo.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {orphanProducts.map(p => (
              <div key={p.id}
                className="bg-card border border-dashed rounded-2xl overflow-hidden hover:shadow-sm transition-shadow group cursor-pointer"
                onClick={() => { setSelectedProduct(p); setFromCatalogId(null); setView("product"); }}>
                <div className="h-28 bg-secondary/30 overflow-hidden">
                  {p.images[0]
                    ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    : <div className="w-full h-full flex items-center justify-center"><Package size={24} className="text-muted-foreground/20" /></div>
                  }
                </div>
                <div className="p-3.5 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold truncate flex-1">{p.name}</p>
                    <button
                      onClick={e => { e.stopPropagation(); setSelectedProduct(p); setFromCatalogId(null); setView("product"); }}
                      className="p-1 rounded-lg hover:bg-secondary text-muted-foreground transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                      title="Editar producto">
                      <Pencil size={12} />
                    </button>
                  </div>
                  <p className="text-sm font-medium text-primary">
                    {(p.discount_pct ?? 0) > 0
                      ? <>{fmtProd(p.price * (1 - (p.discount_pct ?? 0) / 100), p.currency)} <span className="text-xs line-through text-muted-foreground font-normal">{fmtProd(p.price, p.currency)}</span></>
                      : fmtProd(p.price, p.currency)}
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {!p.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">Oculto</span>}
                    <StockBadge stock={p.stock} stockEnabled={p.stock_enabled} variantTotal={p.has_variants ? (variantStockMap.get(p.id) ?? null) : undefined} />
                    {p.has_variants && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">Variantes</span>}
                  </div>
                  {p.stock_enabled && !p.has_variants && (
                    <div onClick={e => e.stopPropagation()}>
                      <StockAdjuster productId={p.id} currentStock={p.stock ?? 0} />
                    </div>
                  )}
                  {p.has_variants && (
                    <VariantStockPanel productId={p.id} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
