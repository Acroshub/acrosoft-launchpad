import { useState, useRef, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Plus, Trash2, Loader2, Package, ImageIcon,
  Check, Pencil, X, Link, FileText, ExternalLink,
  AlertTriangle, Minus, Layers, LayoutGrid, List,
  ChevronRight, ChevronLeft, SlidersHorizontal, DollarSign, CreditCard, Info,
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
  useProductVariants,
  useProductPlans, useUpsertProductPlan, useDeleteProductPlan,
  useOrphanProducts, useAIAgentConfig,
  useAllProductVariants, usePricesByEntity, useUpsertPrices, useFaqsByEntity, useUpsertFaqs, useUpsertPaymentMethod,
} from "@/hooks/useCrmData";
import type { CrmCatalog, CrmProduct, CrmProductPlan } from "@/lib/supabase";
import PriceListEditor, { type PriceEntry } from "@/components/crm/PriceListEditor";
import FaqEditor, { type FaqEntry } from "@/components/crm/FaqEditor";
import CrmPhysicalProductEditor from "@/components/crm/CrmPhysicalProductEditor";
import {
  type RecurringInterval, type DraftPlan, emptyDraftPlan, PlanFields, DraftPlanCard,
  planFinalPrice, planFinalRecurringPrice, INTERVAL_LABELS,
} from "@/components/crm/PlanEditor";

import { formatAmount } from "@/lib/currencies";
const fmtProd = (amount: number, cur: string) => formatAmount(amount, cur);

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

// Cada tipo (fisico/archivo) tiene su propia lista, así que la navegación persistida
// (última vista/catálogo/producto) se guarda en claves separadas por tipo — evita que
// entrar a un catálogo en "Productos Físicos" contamine la vista de "Ebooks y Archivos".
// Los catálogos solo aplican a productos físicos — para "archivo" (ebooks/archivos
// digitales) se muestra siempre una lista plana de productos, sin catálogos.
type ProductKind = "fisico" | "archivo";
const productosStorageKey = (kind: ProductKind, suffix: "view" | "catalog_id" | "product_id") =>
  `crm_productos_${kind}_${suffix}`;

// ─── Image Slot ───────────────────────────────────────────────────────────────
function ImageSlot({ url, index, pathId, userId, onUploaded, onRemove, mainLabel = "Principal" }: {
  url?: string; index: number; pathId: string; userId: string;
  onUploaded: (url: string, index: number) => void;
  onRemove: (index: number) => void;
  mainLabel?: string;
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
          {isMain && <span className="text-[10px]">{mainLabel}</span>}
        </div>
      )}
    </div>
  );
}

// ─── Product Editor (productos digitales / archivo) ────────────────────────────
const WIZARD_STEPS_DIGITAL  = ["Información", "Imágenes Complementarias del producto", "Precio", "Entregable"] as const;

type ProductTabId = "info" | "imagenes" | "precio" | "entregable" | "ajustes";
const NEW_PRODUCT_DRAFT_KEY = "crm_new_product_draft";
const readNewProductDraft = () => { try { return JSON.parse(sessionStorage.getItem(NEW_PRODUCT_DRAFT_KEY) ?? "null"); } catch { return null; } };
const clearNewProductDraft = () => sessionStorage.removeItem(NEW_PRODUCT_DRAFT_KEY);

function ProductEditor({ initialProduct, onBack, canDelete = true, kind }: {
  initialProduct: CrmProduct | null;
  onBack: () => void;
  canDelete?: boolean;
  kind: ProductKind;
}) {
  const { user } = useCurrentUser();
  const upsertProduct  = useUpsertProduct();
  const deleteProduct  = useDeleteProduct();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeTab, setActiveTab]         = useState<ProductTabId>("info");
  const [showMobileContent, setShowMobileContent] = useState(false);

  const isNew = !initialProduct;
  // Read draft synchronously on mount — sessionStorage is sync so safe in useState initializers.
  // Only relevant for new (unsaved) products; existing products load from DB.
  const _d = useRef(isNew ? readNewProductDraft() : null);
  const d = _d.current;

  const [wizardStep, setWizardStep]       = useState(d?.wizardStep ?? (isNew ? 0 : -1));
  const [product, setProduct]             = useState<CrmProduct | null>(initialProduct);
  const [saving, setSaving]               = useState(false);
  const [name, setName]                   = useState(d?.name ?? initialProduct?.name ?? "");
  const [description, setDescription]     = useState(d?.description ?? initialProduct?.description ?? "");
  const [images, setImages]               = useState<string[]>(d?.images ?? initialProduct?.images ?? []);
  const [delivType, setDelivType]         = useState<"file"|"text">(d?.delivType ?? initialProduct?.deliverable_type ?? "file");
  const [delivText, setDelivText]         = useState(d?.delivText ?? initialProduct?.deliverable_text ?? "");
  const [delivUrl, setDelivUrl]           = useState(d?.delivUrl ?? initialProduct?.deliverable_url ?? "");
  const [uploadingDeliv, setUploadingDeliv] = useState(false);
  const delivRef = useRef<HTMLInputElement>(null);

  // Planes de precio (pago único o recurrente) — requieren que el producto ya exista
  const { data: plans = [] } = useProductPlans(product?.id ?? null);
  const upsertPlan = useUpsertProductPlan();
  const [newPlanDraft, setNewPlanDraft] = useState<DraftPlan | null>(null);
  const [savingNewPlan, setSavingNewPlan] = useState(false);
  const handleStartAddPlan = () => setNewPlanDraft(emptyDraftPlan(0));
  const handleCancelAddPlan = () => setNewPlanDraft(null);
  const handleSaveNewPlan = async () => {
    if (!newPlanDraft || !newPlanDraft.name.trim() || !product) return;
    setSavingNewPlan(true);
    try {
      const created = await upsertPlan.mutateAsync({
        product_id: product.id,
        name: newPlanDraft.name.trim(),
        price: newPlanDraft.price ? parseFloat(newPlanDraft.price) : 0,
        currency: newPlanDraft.currency,
        discount_pct: newPlanDraft.discountPct,
        is_recurring: newPlanDraft.isRecurring,
        recurring_price: newPlanDraft.isRecurring && newPlanDraft.recurringPrice ? parseFloat(newPlanDraft.recurringPrice) : null,
        recurring_currency: newPlanDraft.isRecurring ? newPlanDraft.currency : null,
        recurring_interval: newPlanDraft.isRecurring ? newPlanDraft.recurringInterval : null,
        recurring_discount_pct: newPlanDraft.isRecurring ? newPlanDraft.recurringDiscountPct : 0,
        sort_order: plans.length,
      });
      if (newPlanDraft.prices.length > 0) {
        await upsertPrices.mutateAsync({ entityType: "product_plan", entityId: created.id, prices: newPlanDraft.prices });
      }
      for (const pm of newPlanDraft.paymentMethods) {
        await upsertPaymentMethod.mutateAsync({
          entity_type: "product_plan",
          entity_id: created.id,
          type: pm.type!,
          label: pm.label ?? null,
          content: pm.content!,
          sort_order: pm.sort_order ?? 0,
          price_id: null,
          currency: pm.currency ?? null,
        });
      }
      toast.success("Plan creado");
      setNewPlanDraft(null);
    } catch {
      toast.error("Error al crear el plan");
    } finally {
      setSavingNewPlan(false);
    }
  };

  const upsertPrices = useUpsertPrices();
  const upsertPaymentMethod = useUpsertPaymentMethod();
  const upsertFaqs = useUpsertFaqs();
  const { data: existingFaqs = [] } = useFaqsByEntity("product", product?.id ?? null);
  const [faqs, setFaqs] = useState<FaqEntry[]>(d?.faqs ?? []);
  useEffect(() => {
    if (!product?.id) return;
    setFaqs(existingFaqs.map(f => ({ question: f.question, answer: f.answer })));
  }, [existingFaqs, product?.id]);

  // Persist draft to sessionStorage for recovery after tab switch / remount.
  // Only active while the product has no ID yet (before first save).
  useEffect(() => {
    if (!isNew || product?.id) return;
    sessionStorage.setItem(NEW_PRODUCT_DRAFT_KEY, JSON.stringify({
      wizardStep, name, description, images, delivType, delivText, delivUrl, faqs,
    }));
  }, [wizardStep, name, description, images, delivType, delivText, delivUrl, faqs]);

  // Once the product gets saved and has an ID: update localStorage so the
  // parent can restore to this product on next remount, and clear the draft.
  useEffect(() => {
    if (!product?.id) return;
    localStorage.setItem(productosStorageKey(kind, "product_id"), product.id);
    clearNewProductDraft();
  }, [product?.id, kind]);

  const buildPayload = () => ({
    ...(product?.id ? { id: product.id } : {}),
    name: name.trim(),
    description: description || null,
    is_active: true,
    images,
    product_kind: kind,
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
      await upsertFaqs.mutateAsync({ entityType: "product", entityId: saved.id, faqs });
      toast.success(product ? "Producto actualizado" : "Producto creado");
      if (andNext) setWizardStep(1);
    } catch (e: any) { toast.error(e.message?.slice(0,100) ?? "Error al guardar"); }
    finally { setSaving(false); }
  };

  const handleImageUploaded = async (url: string, index: number) => {
    const updated = [...images];
    if (index >= updated.length) updated.push(url);
    else updated[index] = url;
    setImages(updated);
    if (product) await upsertProduct.mutateAsync({ id: product.id, name, images: updated });
  };

  const handleImageRemove = async (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    setImages(updated);
    if (product) await upsertProduct.mutateAsync({ id: product.id, name, images: updated });
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
      await upsertProduct.mutateAsync({ id: product.id, name, deliverable_type: "file", deliverable_url: data.publicUrl });
      toast.success("Archivo subido");
    } catch (e: any) { toast.error(e.message?.slice(0,80) ?? "Error"); }
    finally { setUploadingDeliv(false); }
  };

  const handleDelivSave = async () => {
    if (!product) return;
    await upsertProduct.mutateAsync({ id: product.id, name, deliverable_type: delivType, deliverable_url: delivType === "file" ? (delivUrl || null) : null, deliverable_text: delivType === "text" ? (delivText || null) : null });
    toast.success("Entregable guardado");
  };

  // ── Secciones reutilizables (llamadas como funciones, no como componentes JSX)
  const InfoSection = () => (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Imagen principal</label>
        <div className="max-w-[200px]">
          <ImageSlot url={images[0]} index={0} pathId={product?.id ?? "new"} userId={user!.id}
            onUploaded={handleImageUploaded} onRemove={handleImageRemove} />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Nombre <span className="text-destructive">*</span></label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Ebook de Marketing Digital" className="h-9 text-sm" />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Descripción</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Describe tu producto..."
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      </div>
      <FaqEditor value={faqs} onChange={setFaqs} />
    </div>
  );

  const ImagesSection = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {[...images.map((url, i) => ({ url, i })), { url: undefined as string | undefined, i: images.length }].map(({ url, i }) => (
          <ImageSlot key={i} url={url} index={i} pathId={product?.id ?? "new"} userId={user!.id}
            onUploaded={handleImageUploaded} onRemove={handleImageRemove} mainLabel="Agregar Imágenes" />
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground/60">Sin límite de imágenes</p>
    </div>
  );

  const PriceSection = () => (
    <div className="space-y-3">
      {!product ? (
        <p className="text-xs text-muted-foreground/60 italic">Guarda la información básica primero para poder crear planes.</p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Cada plan puede ser de pago único o recurrente, con sus propios precios en otras monedas y métodos de pago.
            Si no hay ningún plan, el producto queda sin precio.
          </p>
          {plans.map(p => <ProductPlanRow key={p.id} plan={p} productId={product.id} />)}
          {newPlanDraft && (
            <div className="space-y-2">
              <DraftPlanCard plan={newPlanDraft} onChange={setNewPlanDraft} onRemove={handleCancelAddPlan} />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveNewPlan} disabled={savingNewPlan || !newPlanDraft.name.trim()} className="gap-1.5">
                  {savingNewPlan && <Loader2 size={12} className="animate-spin" />} Guardar plan
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancelAddPlan}>Cancelar</Button>
              </div>
            </div>
          )}
          {!newPlanDraft && (
            plans.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border py-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto">
                  <DollarSign size={22} className="text-muted-foreground/30" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Aún no tienes planes</p>
                  <p className="text-xs text-muted-foreground/50 mt-0.5">Crea tu primer plan de precio para este producto</p>
                </div>
                <Button size="sm" onClick={handleStartAddPlan} className="gap-1.5 mx-auto">
                  <Plus size={13} /> Añadir plan
                </Button>
              </div>
            ) : (
              <button onClick={handleStartAddPlan} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Plus size={12} /> Añadir plan
              </button>
            )
          )}
        </>
      )}
    </div>
  );

  const DelivSection = () => (
    <div className="space-y-4">
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
            <Button variant="outline" size="sm" onClick={() => delivRef.current?.click()} disabled={uploadingDeliv || !product} className="h-8 text-xs gap-1.5">
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
      <p className="text-xs text-emerald-600 flex items-center gap-1.5"><Check size={11} /> Si usas Agente IA, podrá enviar automáticamente el producto digital al confirmar la venta</p>
    </div>
  );

  const AjustesSection = () => (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Elimina este producto permanentemente, junto con sus planes y métodos de pago.</p>
      {canDelete && (
        <Button
          variant="outline"
          onClick={() => setConfirmDelete(true)}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
        >
          <Trash2 size={13} className="mr-1.5" /> Eliminar producto
        </Button>
      )}
    </div>
  );

  if (!user) return null;

  const WIZARD_STEPS = WIZARD_STEPS_DIGITAL;

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
          {wizardStep === 2 && PriceSection()}
          {wizardStep === 3 && DelivSection()}
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
            ) : wizardStep === 3 ? (
              <Button size="sm" onClick={async () => { await handleDelivSave(); next(); }} disabled={saving} className="h-9 text-xs gap-1.5">
                {saving && <Loader2 size={12} className="animate-spin" />} Guardar y finalizar
              </Button>
            ) : (
              <Button size="sm" onClick={next} className="h-9 text-xs">
                {isLast ? "Finalizar" : "Continuar →"}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Full edit mode (existing product) — menú de tabs (mismo patrón que Ajustes/CrmServices) ──
  const TABS: { id: ProductTabId; label: string; description: string; icon: typeof Info }[] = [
    { id: "info",       label: "Información", description: "Imagen principal, nombre, descripción y FAQ", icon: Info },
    { id: "imagenes",   label: "Imágenes",    description: "Imágenes complementarias del producto",       icon: ImageIcon },
    { id: "precio",     label: "Precio",      description: "Planes de precio, pago único o recurrente",   icon: DollarSign },
    { id: "entregable", label: "Entregable",  description: "Archivo o texto que recibe el cliente",        icon: FileText },
    { id: "ajustes",    label: "Ajustes",     description: "Eliminar producto",                            icon: SlidersHorizontal },
  ];
  const activeTabDef = TABS.find(t => t.id === activeTab) ?? TABS[0];
  const handleSelectTab = (id: ProductTabId) => { setActiveTab(id); setShowMobileContent(true); };

  const renderTabContent = () => (
    <>
      {activeTab === "info" && InfoSection()}
      {activeTab === "imagenes" && ImagesSection()}
      {activeTab === "precio" && PriceSection()}
      {activeTab === "entregable" && DelivSection()}
      {activeTab === "ajustes" && AjustesSection()}
    </>
  );

  const HeaderBlock = () => (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-2 transition-colors">
          <ArrowLeft size={12} /> Volver
        </button>
        <h2 className="text-lg font-semibold">{name}</h2>
      </div>
      <Button onClick={() => handleSave()} disabled={saving} className="h-9 px-5">
        {saving && <Loader2 size={13} className="animate-spin mr-1.5" />}
        {saving ? "Guardando..." : "Guardar cambios"}
      </Button>
    </div>
  );

  return (
    <>
      <DeleteConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        onConfirm={async () => { await deleteProduct.mutateAsync(product!.id); toast.success("Producto eliminado"); onBack(); }}
        isPending={deleteProduct.isPending}
        description="Se eliminará el producto permanentemente junto con sus planes y métodos de pago. Esta acción no se puede deshacer."
      />

      {/* ── Mobile ── */}
      <div className="lg:hidden">
        {!showMobileContent ? (
          <div className="space-y-6">
            <HeaderBlock />
            <div className="bg-card border rounded-2xl overflow-hidden divide-y divide-border/50">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleSelectTab(t.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-secondary/60 transition-colors"
                >
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
            <button
              onClick={() => setShowMobileContent(false)}
              className="flex items-center gap-0.5 text-primary text-sm font-medium -ml-1 hover:opacity-75 transition-opacity"
            >
              <ChevronLeft size={20} />
              {name || "Producto"}
            </button>
            <div>
              <h2 className="text-xl font-semibold leading-tight">{activeTabDef.label}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{activeTabDef.description}</p>
            </div>
            {renderTabContent()}
          </div>
        )}
      </div>

      {/* ── Desktop ── */}
      <div className="hidden lg:block space-y-6">
        <HeaderBlock />

        <div className="overflow-x-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          <div className="inline-flex items-center gap-0.5 bg-secondary/60 rounded-xl p-1 min-w-max">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === t.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}>
                <t.icon size={13} className="shrink-0" /> {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-card border rounded-2xl p-6">
          {renderTabContent()}
        </div>
      </div>
    </>
  );
}

// ─── Fila de plan de producto (edición en vivo, autoguardado) ─────────────────
function ProductPlanRow({ plan, productId }: { plan: CrmProductPlan; productId: string }) {
  const upsertPlan   = useUpsertProductPlan();
  const deletePlan   = useDeleteProductPlan();
  const upsertPrices = useUpsertPrices();

  const [expanded, setExpanded] = useState(false);
  const [name, setName]                             = useState(plan.name);
  const [price, setPrice]                           = useState(plan.price != null ? String(plan.price) : "");
  const [currency, setCurrency]                     = useState(plan.currency);
  const [discountPct, setDiscountPct]               = useState(plan.discount_pct ?? 0);
  const [isRecurring, setIsRecurring]               = useState(plan.is_recurring);
  const [recurringPrice, setRecurringPrice]         = useState(plan.recurring_price != null ? String(plan.recurring_price) : "");
  const [recurringInterval, setRecurringInterval]   = useState<RecurringInterval>(plan.recurring_interval ?? "mensual");
  const [recurringDiscountPct, setRecurringDiscountPct] = useState(plan.recurring_discount_pct ?? 0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]           = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const { data: existingPrices = [] } = usePricesByEntity("product_plan", plan.id);
  const [prices, setPrices] = useState<PriceEntry[]>([]);
  useEffect(() => {
    setPrices(existingPrices.map(p => ({ currency: p.currency, price: p.price, discount_pct: p.discount_pct ?? null })));
  }, [existingPrices]);
  const pricesSaveTimer = useRef<ReturnType<typeof setTimeout>>();
  const handlePricesChange = (next: PriceEntry[]) => {
    setPrices(next);
    clearTimeout(pricesSaveTimer.current);
    pricesSaveTimer.current = setTimeout(() => {
      upsertPrices.mutate(
        { entityType: "product_plan", entityId: plan.id, prices: next },
        { onError: () => toast.error("Error al guardar los precios adicionales del plan") }
      );
    }, 800);
  };
  useEffect(() => () => clearTimeout(pricesSaveTimer.current), []);

  const isFirstRender = useRef(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    clearTimeout(saveTimer.current);
    setAutoSaveStatus("saving");
    saveTimer.current = setTimeout(async () => {
      try {
        await upsertPlan.mutateAsync({
          id: plan.id,
          product_id: productId,
          name: name.trim() || plan.name,
          price: price ? parseFloat(price) : 0,
          currency,
          discount_pct: discountPct,
          is_recurring: isRecurring,
          recurring_price: isRecurring && recurringPrice ? parseFloat(recurringPrice) : null,
          recurring_currency: isRecurring ? currency : null,
          recurring_interval: isRecurring ? recurringInterval : null,
          recurring_discount_pct: isRecurring ? recurringDiscountPct : 0,
        });
        setAutoSaveStatus("saved");
        setTimeout(() => setAutoSaveStatus("idle"), 1500);
      } catch {
        toast.error("Error al guardar el plan");
        setAutoSaveStatus("idle");
      }
    }, 800);
    return () => clearTimeout(saveTimer.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, price, currency, discountPct, isRecurring, recurringPrice, recurringInterval, recurringDiscountPct]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deletePlan.mutateAsync({ id: plan.id, productId });
      toast.success("Plan eliminado");
    } catch {
      toast.error("Error al eliminar el plan");
      setDeleting(false);
    }
  };

  const recurringFinal = planFinalRecurringPrice(plan);
  const priceSummary = `${formatAmount(planFinalPrice(plan), plan.currency)}${
    plan.is_recurring && recurringFinal != null
      ? ` + ${formatAmount(recurringFinal, plan.recurring_currency ?? plan.currency)}/${INTERVAL_LABELS[plan.recurring_interval ?? "mensual"]}`
      : ""
  }`;

  const deleteDialog = (
    <DeleteConfirmDialog
      open={confirmDelete}
      onOpenChange={setConfirmDelete}
      onConfirm={handleDelete}
      isPending={deleting}
      description={`Se eliminará el plan "${plan.name}" permanentemente.`}
    />
  );

  if (!expanded) {
    return (
      <>
        {deleteDialog}
        <button
          onClick={() => setExpanded(true)}
          className="w-full flex items-center gap-3 bg-secondary/20 border rounded-xl px-4 py-3 hover:border-primary/40 transition-colors text-left"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{plan.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{priceSummary}</p>
          </div>
          <ChevronRight size={14} className="shrink-0 text-muted-foreground/40" />
        </button>
      </>
    );
  }

  return (
    <div className="bg-secondary/20 border rounded-xl p-4 space-y-3">
      {deleteDialog}
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => setExpanded(false)} className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={13} />
          {plan.name}
          {autoSaveStatus === "saving" && <Loader2 size={11} className="animate-spin" />}
          {autoSaveStatus === "saved" && <Check size={11} className="text-emerald-500" />}
        </button>
        <button onClick={() => setConfirmDelete(true)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 size={13} />
        </button>
      </div>
      <PlanFields
        name={name} price={price} currency={currency} discountPct={discountPct}
        isRecurring={isRecurring} recurringPrice={recurringPrice} recurringInterval={recurringInterval} recurringDiscountPct={recurringDiscountPct}
        onChange={patch => {
          if (patch.name !== undefined) setName(patch.name);
          if (patch.price !== undefined) setPrice(patch.price);
          if (patch.currency !== undefined) setCurrency(patch.currency);
          if (patch.discountPct !== undefined) setDiscountPct(patch.discountPct);
          if (patch.isRecurring !== undefined) setIsRecurring(patch.isRecurring);
          if (patch.recurringPrice !== undefined) setRecurringPrice(patch.recurringPrice);
          if (patch.recurringInterval !== undefined) setRecurringInterval(patch.recurringInterval);
          if (patch.recurringDiscountPct !== undefined) setRecurringDiscountPct(patch.recurringDiscountPct);
        }}
      />
      <div className="pt-2 border-t border-border/50 space-y-1.5">
        <label className="text-[11px] text-muted-foreground">Precio en otra moneda (opcional)</label>
        <PriceListEditor value={prices} onChange={handlePricesChange} baseCurrency={currency} />
      </div>
      <div className="pt-2 border-t border-border/50 space-y-2">
        <div className="flex items-center gap-1.5">
          <CreditCard size={12} className="text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Métodos de pago</span>
        </div>
        <PaymentMethodsEditor entityType="product_plan" entityId={plan.id} prices={existingPrices} baseCurrency={currency} />
      </div>
    </div>
  );
}

// ─── Catalog View ─────────────────────────────────────────────────────────────
function ProductListRow({ product: p, canEdit, variantStockMap, onEdit }: {
  product: CrmProduct; canEdit: boolean; variantStockMap: Map<string, number>;
  onEdit: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 bg-card border rounded-2xl px-3 py-2.5 transition-shadow ${canEdit ? "cursor-pointer hover:shadow-sm" : "cursor-default"}`}
      onClick={() => canEdit && onEdit()}
    >
      <div className="w-11 h-11 rounded-xl bg-secondary/30 overflow-hidden shrink-0 flex items-center justify-center">
        {p.images[0]
          ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
          : <Package size={16} className="text-muted-foreground/20" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{p.name}</p>
        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
          {!p.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">Oculto</span>}
          <StockBadge stock={p.stock} stockEnabled={p.stock_enabled} variantTotal={p.has_variants ? (variantStockMap.get(p.id) ?? null) : undefined} />
          {p.deliverable_type && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30">Digital</span>}
          {p.has_variants && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">Variantes</span>}
        </div>
      </div>
      <p className="text-sm font-medium text-primary shrink-0">
        {(p.discount_pct ?? 0) > 0
          ? <>{fmtProd(p.price * (1 - (p.discount_pct ?? 0) / 100), p.currency)} <span className="text-xs line-through text-muted-foreground font-normal">{fmtProd(p.price, p.currency)}</span></>
          : fmtProd(p.price, p.currency)}
      </p>
      {canEdit && (
        <div className="flex gap-1 shrink-0">
          <button onClick={e => { e.stopPropagation(); onEdit(); }}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors" title="Editar producto">
            <Pencil size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Catalog View — menú de tabs (mismo patrón que Ajustes/CrmBusiness) ────────
function CatalogView({
  catalog, allProducts, variantStockMap, catalogKind, onBack, onDeleted, onEditProduct, onCreateProduct,
  activeTab, onActiveTabChange, showMobileContent, onShowMobileContentChange,
  canCreate = true, canEdit = true, canDelete = true,
}: {
  catalog: CrmCatalog; allProducts: CrmProduct[]; variantStockMap: Map<string, number>;
  catalogKind: CrmCatalog["catalog_kind"];
  onBack: () => void;
  onDeleted: () => void;
  onEditProduct: (p: CrmProduct) => void;
  onCreateProduct: (catalogId: string) => void;
  // Estado de navegación móvil "elevado" al componente padre — así sobrevive
  // cuando se entra a editar un producto (lo que desmonta CatalogView) y se
  // vuelve, en vez de resetear siempre a la vista de menú.
  activeTab: "productos" | "ajustes";
  onActiveTabChange: (tab: "productos" | "ajustes") => void;
  showMobileContent: boolean;
  onShowMobileContentChange: (show: boolean) => void;
  canCreate?: boolean; canEdit?: boolean; canDelete?: boolean;
}) {
  const { user } = useCurrentUser();
  const { data: agentConfig } = useAIAgentConfig();
  const agentPhone = agentConfig?.verified_phone ?? null;
  const { data: catalogProducts = [], refetch } = useCatalogProducts(catalog.id);
  const toggleCatalog = useToggleCatalogProduct();
  const upsertCatalog = useUpsertCatalog();
  const deleteCatalog = useDeleteCatalog();

  const [viewMode, setViewMode]                   = useState<"grid" | "list">("grid");
  const [showAddExisting, setShowAddExisting]     = useState(false);
  const [addSearch, setAddSearch]                 = useState("");
  const [confirmDeleteCatalog, setConfirmDeleteCatalog] = useState(false);

  const inCatalogIds = new Set(catalogProducts.map(p => p.id));
  const available = allProducts.filter(p =>
    !inCatalogIds.has(p.id) && (!addSearch || p.name.toLowerCase().includes(addSearch.toLowerCase()))
  );

  const handleCatalogSave = async (data: Parameters<typeof upsertCatalog.mutateAsync>[0]) => {
    try {
      await upsertCatalog.mutateAsync(data);
      toast.success("Catálogo actualizado");
    } catch (e) {
      const message = e instanceof Error ? e.message.slice(0, 100) : "Error";
      toast.error(message);
    }
  };

  const TABS = [
    { id: "productos" as const, label: "Productos", description: `${catalogProducts.length} producto${catalogProducts.length !== 1 ? "s" : ""} en este catálogo`, icon: Package },
    { id: "ajustes" as const,   label: "Ajustes",    description: "Editar o eliminar catálogo", icon: SlidersHorizontal },
  ];
  const activeTabDef = TABS.find(t => t.id === activeTab) ?? TABS[0];
  const handleSelectTab = (id: typeof TABS[number]["id"]) => { onActiveTabChange(id); onShowMobileContentChange(true); };

  const ProductosTabContent = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {canCreate && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAddExisting(v => !v)} className="h-8 text-xs gap-1">
              <Plus size={12} /> Añadir existente
            </Button>
            <Button size="sm" onClick={() => onCreateProduct(catalog.id)} className="h-8 text-xs gap-1">
              <Plus size={12} /> Nuevo producto
            </Button>
          </div>
        )}
        {catalogProducts.length > 0 && (
          <div className="flex items-center gap-0.5 bg-secondary/60 rounded-lg p-0.5 ml-auto">
            <button onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              title="Vista en grid">
              <LayoutGrid size={13} />
            </button>
            <button onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              title="Vista en lista">
              <List size={13} />
            </button>
          </div>
        )}
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
          {canCreate && (
            <Button size="sm" onClick={() => onCreateProduct(catalog.id)} className="gap-1 mt-1">
              <Plus size={12} /> Crear primer producto
            </Button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {catalogProducts.map(p => (
            <div key={p.id}
              className={`bg-card border rounded-2xl overflow-hidden hover:shadow-sm transition-shadow group ${canEdit ? "cursor-pointer" : "cursor-default"}`}
              onClick={() => canEdit && onEditProduct(p)}>
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
      ) : (
        <div className="space-y-2">
          {catalogProducts.map(p => (
            <ProductListRow key={p.id} product={p} canEdit={canEdit} variantStockMap={variantStockMap}
              onEdit={() => onEditProduct(p)} />
          ))}
        </div>
      )}
    </div>
  );

  const AjustesTabContent = () => (
    <div className="space-y-6">
      {user && (
        <CatalogForm
          initial={catalog}
          userId={user.id}
          agentPhone={agentPhone}
          catalogKind={catalogKind}
          onSave={handleCatalogSave}
          onCancel={onBack}
          saving={upsertCatalog.isPending}
        />
      )}

      {canDelete && (
        <div className="bg-card border border-destructive/20 rounded-2xl p-6 space-y-3">
          <h2 className="text-sm font-semibold text-destructive">Eliminar catálogo</h2>
          <p className="text-xs text-muted-foreground">Los productos no se eliminan, solo se desvinculan de este catálogo. Esta acción no se puede deshacer.</p>
          <Button
            variant="outline"
            onClick={() => setConfirmDeleteCatalog(true)}
            className="text-destructive hover:bg-destructive/10 border-destructive/30"
          >
            <Trash2 size={13} className="mr-1.5" /> Eliminar catálogo
          </Button>
        </div>
      )}
    </div>
  );

  const HeaderBlock = () => (
    <div>
      <button onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-2 transition-colors">
        <ArrowLeft size={12} /> Todos los catálogos
      </button>
      <h2 className="text-lg font-semibold">{catalog.name}</h2>
      <p className="text-xs text-muted-foreground">{catalogProducts.length} producto{catalogProducts.length !== 1 ? "s" : ""}</p>
    </div>
  );

  return (
    <>
      <DeleteConfirmDialog
        open={confirmDeleteCatalog}
        onOpenChange={setConfirmDeleteCatalog}
        onConfirm={async () => { await deleteCatalog.mutateAsync(catalog.id); toast.success("Catálogo eliminado"); onDeleted(); }}
        isPending={deleteCatalog.isPending}
        description="Los productos no se eliminarán, solo se desvincularán de este catálogo."
      />

      {/* ── Mobile ── */}
      <div className="lg:hidden">
        {!showMobileContent ? (
          <div className="space-y-6">
            <HeaderBlock />
            <div className="bg-card border rounded-2xl overflow-hidden divide-y divide-border/50">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleSelectTab(t.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-secondary/60 transition-colors"
                >
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
            <button
              onClick={() => onShowMobileContentChange(false)}
              className="flex items-center gap-0.5 text-primary text-sm font-medium -ml-1 hover:opacity-75 transition-opacity"
            >
              <ChevronLeft size={20} />
              {catalog.name}
            </button>
            <div>
              <h2 className="text-xl font-semibold leading-tight">{activeTabDef.label}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{activeTabDef.description}</p>
            </div>
            {activeTab === "productos" ? <ProductosTabContent /> : <AjustesTabContent />}
          </div>
        )}
      </div>

      {/* ── Desktop ── */}
      <div className="hidden lg:block space-y-6">
        <HeaderBlock />

        <div className="overflow-x-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          <div className="inline-flex items-center gap-0.5 bg-secondary/60 rounded-xl p-1 min-w-max">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => onActiveTabChange(t.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === t.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon size={13} className="shrink-0" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "productos" ? <ProductosTabContent /> : <AjustesTabContent />}
      </div>
    </>
  );
}

// ─── Catalog Card ─────────────────────────────────────────────────────────────
function CatalogCard({ catalog, onEnter }: {
  catalog: CrmCatalog;
  onEnter: () => void;
}) {
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
        </div>

        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[10px] font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-xl">
            {products.length} producto{products.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Tarjeta "Productos Sin Catálogo" ──────────────────────────────────────────
// Se muestra dentro del mismo grid de catálogos — representa los productos que no
// pertenecen a ningún catálogo (no borra nada, no crea un catálogo real en la BD).
function UncategorizedCard({ count, onEnter }: { count: number; onEnter: () => void }) {
  return (
    <div
      className="bg-card border border-dashed rounded-2xl overflow-hidden hover:shadow-md transition-all group cursor-pointer active:scale-[0.99]"
      onClick={onEnter}
    >
      <div className="h-32 bg-secondary/20 overflow-hidden flex items-center justify-center">
        <Package size={28} className="text-muted-foreground/20" />
      </div>
      <div className="p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold truncate">Productos Sin Catálogo</p>
          <p className="text-xs text-muted-foreground/60 mt-0.5">Productos sin catálogo asignado</p>
        </div>
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[10px] font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-xl">
            {count} producto{count !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Vista "Productos Sin Catálogo" ────────────────────────────────────────────
function OrphanProductsView({ products, variantStockMap, onBack, onEditProduct, onCreateProduct, canCreate = true, canEdit = true }: {
  products: CrmProduct[]; variantStockMap: Map<string, number>;
  onBack: () => void;
  onEditProduct: (p: CrmProduct) => void;
  onCreateProduct: () => void;
  canCreate?: boolean; canEdit?: boolean;
}) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <button onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-2 transition-colors">
            <ArrowLeft size={12} /> Todos los catálogos
          </button>
          <h2 className="text-lg font-semibold">Productos Sin Catálogo</h2>
          <p className="text-xs text-muted-foreground">{products.length} producto{products.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          {canCreate && (
            <Button size="sm" onClick={onCreateProduct} className="h-8 text-xs gap-1">
              <Plus size={12} /> Nuevo producto
            </Button>
          )}
          {products.length > 0 && (
            <div className="flex items-center gap-0.5 bg-secondary/60 rounded-lg p-0.5">
              <button onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                title="Vista en grid">
                <LayoutGrid size={13} />
              </button>
              <button onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                title="Vista en lista">
                <List size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground/70">
        Estos productos no pertenecen a ningún catálogo. Puedes editarlos o añadirlos a uno desde su ficha.
      </p>

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <Package size={32} className="opacity-20" />
          <p className="text-sm">No hay productos sin categoría</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(p => (
            <ProductGridCard key={p.id} product={p} canEdit={canEdit} variantStockMap={variantStockMap} dashed
              onEdit={() => onEditProduct(p)} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {products.map(p => (
            <ProductListRow key={p.id} product={p} canEdit={canEdit} variantStockMap={variantStockMap}
              onEdit={() => onEditProduct(p)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Catalog Form ─────────────────────────────────────────────────────────────
function CatalogForm({ initial, userId, agentPhone, onSave, onCancel, saving, catalogKind }: {
  initial?: CrmCatalog; userId: string; agentPhone?: string | null;
  onSave: (c: Partial<CrmCatalog> & { name: string; slug: string; catalog_kind: CrmCatalog["catalog_kind"] }) => void;
  onCancel: () => void; saving: boolean;
  catalogKind: CrmCatalog["catalog_kind"];
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
          <label className="text-xs font-medium text-muted-foreground">Slug</label>
          <Input value={slug} onChange={e => { slugEdited.current = true; setSlug(generateSlug(e.target.value)); }}
            placeholder="coleccion-verano" className="h-9 text-sm font-mono" />
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
        <Button size="sm" onClick={() => onSave({ ...(initial ? { id: initial.id } : {}), name, slug, description: description || null, is_active: isActive, cover_image: coverImage || null, whatsapp_number: whatsappNumber.trim() || null, catalog_kind: catalogKind })}
          disabled={saving || !name.trim() || !slug.trim()} className="h-8 text-xs gap-1">
          {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
          {initial ? "Actualizar" : "Crear catálogo"}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} className="h-8 text-xs">Cancelar</Button>
      </div>
    </div>
  );
}

// ─── Product Grid Card ─────────────────────────────────────────────────────────
// Tarjeta compacta reusada tanto para "productos sin catálogo" (físico) como
// para la lista plana de productos digitales (sin catálogos en absoluto).
function ProductGridCard({ product: p, canEdit, variantStockMap, dashed, onEdit }: {
  product: CrmProduct; canEdit: boolean; variantStockMap: Map<string, number>;
  dashed?: boolean; onEdit: () => void;
}) {
  // Los productos archivo usan Planes de precio — el "price" propio del producto queda legado/sin usar.
  const { data: plans = [] } = useProductPlans(p.product_kind === "archivo" ? p.id : null);
  const cheapestPlan = plans
    .filter(pl => pl.is_active)
    .reduce<CrmProductPlan | null>((min, pl) => (min === null || planFinalPrice(pl) < planFinalPrice(min) ? pl : min), null);

  return (
    <div
      className={`bg-card border ${dashed ? "border-dashed" : ""} rounded-2xl overflow-hidden hover:shadow-sm transition-shadow group ${canEdit ? "cursor-pointer" : "cursor-default"}`}
      onClick={() => canEdit && onEdit()}>
      <div className="h-28 bg-secondary/30 overflow-hidden">
        {p.images[0]
          ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center"><Package size={24} className="text-muted-foreground/20" /></div>
        }
      </div>
      <div className="p-3.5 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold truncate flex-1">{p.name}</p>
        </div>
        <p className="text-sm font-medium text-primary">
          {p.product_kind === "archivo" ? (
            cheapestPlan ? `Desde ${fmtProd(planFinalPrice(cheapestPlan), cheapestPlan.currency)}` : <span className="text-xs text-muted-foreground font-normal">Sin precio</span>
          ) : (p.discount_pct ?? 0) > 0 ? (
            <>{fmtProd(p.price * (1 - (p.discount_pct ?? 0) / 100), p.currency)} <span className="text-xs line-through text-muted-foreground font-normal">{fmtProd(p.price, p.currency)}</span></>
          ) : fmtProd(p.price, p.currency)}
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
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CrmProductos({ kind, canEdit = true, canCreate = true, canDelete = true, onExit }: {
  kind: ProductKind;
  canEdit?: boolean; canCreate?: boolean; canDelete?: boolean;
  onExit?: () => void;
}) {
  const { user } = useCurrentUser();
  const catalogKind: CrmCatalog["catalog_kind"] = kind === "fisico" ? "fisico" : "digital";
  // Los catálogos solo existen para productos físicos — para digitales siempre se
  // muestra una lista plana de productos, sin ningún concepto de catálogo en la UI.
  const catalogsEnabled = kind === "fisico";
  const { data: allCatalogsRaw = [], isLoading: catalogsLoading } = useCatalogs();
  const { data: allProductsRaw = [], isLoading: productsLoading } = useProducts();
  const isLoading = catalogsLoading || productsLoading;
  const { data: orphanProductsRaw = [] }   = useOrphanProducts();
  const { data: agentConfig }              = useAIAgentConfig();
  const { data: allVariants = [] }         = useAllProductVariants();
  const upsertCatalog = useUpsertCatalog();

  // Cada instancia de CrmProductos está escopeada a un solo tipo (físico/archivo) —
  // filtramos aquí en vez de en los hooks para mantenerlos genéricos y reusables.
  const catalogs       = useMemo(() => allCatalogsRaw.filter(c => c.catalog_kind === catalogKind), [allCatalogsRaw, catalogKind]);
  const allProducts    = useMemo(() => allProductsRaw.filter(p => p.product_kind === kind), [allProductsRaw, kind]);
  const orphanProducts = useMemo(() => orphanProductsRaw.filter(p => p.product_kind === kind), [orphanProductsRaw, kind]);

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

  // Always start at catalogs — restored atomically by the effect below once data loads.
  // For the new-product case (no savedProdId), we can safely start at "product" immediately —
  // ProductEditor handles null initialProduct as a new product wizard.
  // For existing product/catalog, we start at "catalogs" and restore once data loads.
  const [view, setViewRaw] = useState<"catalogs"|"catalog"|"product"|"orphans">(() => {
    const savedView  = localStorage.getItem(productosStorageKey(kind, "view"));
    const savedProdId = localStorage.getItem(productosStorageKey(kind, "product_id"));
    return savedView === "product" && !savedProdId && canCreate ? "product" : "catalogs";
  });
  const [selectedCatalog, setSelectedCatalogRaw] = useState<CrmCatalog | null>(null);
  const [viewingOrphans, setViewingOrphans]      = useState(false);
  // Estado del menú de tabs de CatalogView, elevado aquí para que sobreviva
  // cuando se entra a editar/crear un producto (eso desmonta CatalogView) y
  // se vuelve — así el botón "Atrás" regresa a la lista de productos en vez
  // de resetear siempre al menú de tabs (Productos/Ajustes).
  const [catalogActiveTab, setCatalogActiveTab]         = useState<"productos" | "ajustes">("productos");
  const [catalogShowMobileContent, setCatalogShowMobileContent] = useState(false);
  const [selectedProduct, setSelectedProductRaw] = useState<CrmProduct | null>(null);
  const [fromCatalogId, setFromCatalogId]        = useState<string | null>(null);
  const [showCatalogForm, setShowCatalogForm]    = useState(false);
  const navRestored                              = useRef(false);

  const setView = (v: "catalogs"|"catalog"|"product"|"orphans") => {
    localStorage.setItem(productosStorageKey(kind, "view"), v);
    setViewRaw(v);
  };
  const setSelectedCatalog = (c: CrmCatalog | null) => {
    if (c) localStorage.setItem(productosStorageKey(kind, "catalog_id"), c.id);
    else localStorage.removeItem(productosStorageKey(kind, "catalog_id"));
    setSelectedCatalogRaw(c);
  };
  const setSelectedProduct = (p: CrmProduct | null) => {
    if (p?.id) localStorage.setItem(productosStorageKey(kind, "product_id"), p.id);
    else localStorage.removeItem(productosStorageKey(kind, "product_id"));
    setSelectedProductRaw(p);
  };

  // Restore navigation from localStorage once both catalogs + products have loaded.
  // Runs only once (navRestored ref) to avoid overriding user navigation on subsequent refetches.
  useEffect(() => {
    if (navRestored.current || isLoading) return;
    navRestored.current = true;
    const savedView   = localStorage.getItem(productosStorageKey(kind, "view")) as "catalogs"|"catalog"|"product"|"orphans" | null;
    const savedProdId = localStorage.getItem(productosStorageKey(kind, "product_id"));
    const savedCatId  = localStorage.getItem(productosStorageKey(kind, "catalog_id"));
    const savedCat    = catalogs.find(c => c.id === savedCatId) ?? null;
    const savedProd   = savedProdId ? allProducts.find(p => p.id === savedProdId) ?? null : null;
    if (savedView === "product") {
      if (savedProdId && !savedProd) {
        // Product ID was saved but no longer exists (deleted) → reset to list
        localStorage.setItem(productosStorageKey(kind, "view"), "catalogs");
      } else if (savedProdId ? !canEdit : !canCreate) {
        // No permission to view this editor (permissions changed since last visit) → reset to list
        localStorage.setItem(productosStorageKey(kind, "view"), "catalogs");
      } else {
        // Either editing an existing product (savedProd found) or creating a new one (no savedProdId)
        setSelectedCatalogRaw(savedCat);
        setSelectedProductRaw(savedProd);
        setFromCatalogId(savedCat?.id ?? null);
        setViewRaw("product");
      }
    } else if (savedView === "catalog" && savedCat) {
      setSelectedCatalogRaw(savedCat);
      setViewRaw("catalog");
    } else if (savedView === "catalog" && !savedCat) {
      // Catalog was deleted
      localStorage.setItem(productosStorageKey(kind, "view"), "catalogs");
    }
  }, [isLoading, catalogs, allProducts, canEdit, canCreate, kind]);

  if (!user) return null;

  const handleCatalogSave = async (data: Parameters<typeof upsertCatalog.mutateAsync>[0]) => {
    try {
      await upsertCatalog.mutateAsync(data);
      setShowCatalogForm(false);
      toast.success("Catálogo creado");
    } catch (e: any) { toast.error(e.message?.slice(0,100) ?? "Error"); }
  };

  if (view === "product" && kind === "fisico") return (
    <CrmPhysicalProductEditor
      initialProduct={selectedProduct}
      fromCatalogId={fromCatalogId}
      canDelete={canDelete}
      onBack={() => {
        clearNewProductDraft();
        setView(selectedCatalog ? "catalog" : viewingOrphans ? "orphans" : "catalogs");
        setSelectedProduct(null);
      }}
    />
  );

  if (view === "product") return (
    <ProductEditor
      initialProduct={selectedProduct}
      canDelete={canDelete}
      kind={kind}
      onBack={() => {
        clearNewProductDraft();
        setView(selectedCatalog ? "catalog" : viewingOrphans ? "orphans" : "catalogs");
        setSelectedProduct(null);
      }}
    />
  );

  if (view === "catalog" && selectedCatalog) return (
    <CatalogView
      catalog={catalogs.find(c => c.id === selectedCatalog.id) ?? selectedCatalog}
      allProducts={allProducts}
      variantStockMap={variantStockMap}
      catalogKind={catalogKind}
      canCreate={canCreate}
      canEdit={canEdit}
      canDelete={canDelete}
      onBack={() => setView("catalogs")}
      onDeleted={() => { setSelectedCatalog(null); setView("catalogs"); }}
      onEditProduct={p => { if (canEdit) { setSelectedProduct(p); setFromCatalogId(selectedCatalog.id); setView("product"); } }}
      onCreateProduct={catalogId => { if (canCreate) { setSelectedProduct(null); setFromCatalogId(catalogId); setView("product"); } }}
      activeTab={catalogActiveTab}
      onActiveTabChange={setCatalogActiveTab}
      showMobileContent={catalogShowMobileContent}
      onShowMobileContentChange={setCatalogShowMobileContent}
    />
  );

  if (view === "orphans") return (
    <OrphanProductsView
      products={orphanProducts}
      variantStockMap={variantStockMap}
      canCreate={canCreate}
      canEdit={canEdit}
      onBack={() => setView("catalogs")}
      onEditProduct={p => { if (canEdit) { setSelectedProduct(p); setFromCatalogId(null); setView("product"); } }}
      onCreateProduct={() => { if (canCreate) { setSelectedProduct(null); setFromCatalogId(null); setView("product"); } }}
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
      {onExit && (
        <button onClick={onExit} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={12} /> Volver
        </button>
      )}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {catalogsEnabled
            ? (catalogs.length > 0
                ? `${catalogs.length} catálogo${catalogs.length !== 1 ? "s" : ""} · ${allProducts.length} producto${allProducts.length !== 1 ? "s" : ""}`
                : "Organiza y comparte tus productos en catálogos públicos")
            : `${allProducts.length} producto${allProducts.length !== 1 ? "s" : ""}`}
        </p>
        {catalogsEnabled && !showCatalogForm && canCreate && (
          <Button size="sm" onClick={() => setShowCatalogForm(true)} className="h-9 text-sm font-semibold gap-1.5 rounded-2xl shrink-0">
            <Plus size={13} /> Nuevo catálogo
          </Button>
        )}
        {!catalogsEnabled && canCreate && (
          <Button size="sm" onClick={() => { setSelectedProduct(null); setFromCatalogId(null); setView("product"); }} className="h-9 text-sm font-semibold gap-1.5 rounded-2xl shrink-0">
            <Plus size={13} /> Nuevo producto
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

      {catalogsEnabled && showCatalogForm && (
        <CatalogForm
          userId={user!.id}
          agentPhone={agentPhone}
          catalogKind={catalogKind}
          onSave={handleCatalogSave}
          onCancel={() => setShowCatalogForm(false)}
          saving={upsertCatalog.isPending}
        />
      )}

      {catalogsEnabled && (
        <>
          {!showCatalogForm && catalogs.length === 0 && orphanProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-6 text-center bg-card border border-dashed rounded-2xl px-6">
              {/* Diagrama: un catálogo (categoría) contiene varios productos */}
              <div className="relative w-full max-w-[260px]">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-card border border-primary/30 rounded-full px-3 py-1 shadow-sm z-10">
                  <Layers size={12} className="text-primary" />
                  <span className="text-[11px] font-semibold text-primary">Catálogo (categoría)</span>
                </div>
                <div className="border-2 border-dashed border-primary/25 rounded-2xl bg-primary/5 p-4 pt-7">
                  <div className="flex items-center justify-center gap-2.5">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-11 h-11 rounded-xl bg-card border shadow-sm flex items-center justify-center">
                        <Package size={16} className="text-muted-foreground/60" />
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground/70 mt-2.5">productos dentro del catálogo</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold">Primero crea un catálogo</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[280px] leading-relaxed">
                  Cada catálogo funciona como una categoría (ej. "Playeras", "Accesorios") y puede contener varios productos. Crea tu primer catálogo para poder empezar a agregar productos físicos.
                </p>
              </div>

              {canCreate && (
                <Button size="sm" onClick={() => setShowCatalogForm(true)} className="gap-1.5 rounded-2xl">
                  <Plus size={13} /> Crear catálogo
                </Button>
              )}
            </div>
          ) : !showCatalogForm && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-muted-foreground" />
                <h2 className="text-sm font-semibold">Catálogo / Categoría</h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {catalogs.map(cat => (
                  <CatalogCard
                    key={cat.id}
                    catalog={cat}
                    onEnter={() => { setSelectedCatalog(cat); setViewingOrphans(false); setCatalogActiveTab("productos"); setCatalogShowMobileContent(false); setView("catalog"); }}
                  />
                ))}
                {orphanProducts.length > 0 && (
                  <UncategorizedCard
                    count={orphanProducts.length}
                    onEnter={() => { setSelectedCatalog(null); setViewingOrphans(true); setView("orphans"); }}
                  />
                )}
              </div>
            </div>
          )}
        </>
      )}

      {!catalogsEnabled && (
        allProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center bg-card border border-dashed rounded-2xl">
            <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center">
              <Package size={24} className="text-primary/60" />
            </div>
            <div>
              <p className="text-sm font-semibold">Sin productos todavía</p>
              <p className="text-xs text-muted-foreground mt-1">Crea tu primer producto para empezar a vender</p>
            </div>
            {canCreate && (
              <Button size="sm" onClick={() => { setSelectedProduct(null); setFromCatalogId(null); setView("product"); }} className="gap-1.5 rounded-2xl">
                <Plus size={13} /> Crear producto
              </Button>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allProducts.map(p => (
              <ProductGridCard key={p.id} product={p} canEdit={canEdit} variantStockMap={variantStockMap}
                onEdit={() => { setSelectedProduct(p); setFromCatalogId(null); setView("product"); }} />
            ))}
          </div>
        )
      )}
    </div>
  );
}
