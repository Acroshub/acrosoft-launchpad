import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ArrowLeft, Settings, Briefcase, DollarSign, Loader2, Tag, CreditCard, Check, Image as ImageIcon, Info, Wallet, SlidersHorizontal, ChevronRight, ChevronLeft } from "lucide-react";
import { useServices, useCreateService, useUpdateService, useDeleteService, usePricesByEntity, useUpsertPrices, useFaqsByEntity, useUpsertFaqs, useUpsertPaymentMethod } from "@/hooks/useCrmData";
import { supabase } from "@/lib/supabase";
import { useCurrentUser, useStaffPermissions } from "@/hooks/useAuth";
import type { CrmService, CrmPaymentMethod } from "@/lib/supabase";
import PriceListEditor, { type PriceEntry } from "@/components/crm/PriceListEditor";
import FaqEditor, { type FaqEntry } from "@/components/crm/FaqEditor";
import { toast } from "sonner";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";
import PaymentMethodsEditor, { PaymentMethodsDraftEditor } from "@/components/shared/PaymentMethodsEditor";

import { CURRENCIES, formatAmount } from "@/lib/currencies";
const fmtSvc = (amount: number, currency?: string | null) => formatAmount(amount, currency);

const INTERVAL_OPTIONS = [
  { value: "semanal",    label: "Semanal" },
  { value: "mensual",    label: "Mensual" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral",  label: "Semestral" },
  { value: "anual",      label: "Anual" },
] as const;
const INTERVAL_LABELS: Record<string, string> = Object.fromEntries(INTERVAL_OPTIONS.map(o => [o.value, o.label]));

const WIZARD_STEPS = ["Información", "Precio", "Recurrente", "FAQs", "Métodos de pago"] as const;
const NEW_SERVICE_DRAFT_KEY = "crm_new_service_draft";
const readNewServiceDraft = () => { try { return JSON.parse(sessionStorage.getItem(NEW_SERVICE_DRAFT_KEY) ?? "null"); } catch { return null; } };
const clearNewServiceDraft = () => sessionStorage.removeItem(NEW_SERVICE_DRAFT_KEY);

// ─── Service Editor ──────────────────────────────────────────────────
// Maneja dos modos: nuevo servicio (wizard, solo se guarda en el último paso)
// y servicio existente (formulario completo con autoguardado), reusando las
// mismas secciones para evitar duplicar la lógica de precios/recurrencia/FAQs.
const ServiceEditor = ({
  service,
  isSuperAdmin,
  canDelete = true,
  onBack,
  onCreate,
  onCreated,
  onUpdate,
}: {
  service: CrmService | null;
  isSuperAdmin: boolean;
  canDelete?: boolean;
  onBack: () => void;
  onCreate: (payload: Partial<CrmService>) => Promise<CrmService>;
  onCreated: (id: string) => void;
  onUpdate: (s: Partial<CrmService>) => Promise<void>;
}) => {
  const { user } = useCurrentUser();
  const isNew = !service;
  const _d = useRef(isNew ? readNewServiceDraft() : null);
  const d = _d.current;

  const [activeTab, setActiveTab]           = useState<"info" | "precios" | "ajustes">("info");
  const [showMobileContent, setShowMobileContent] = useState(false);
  const [confirmDelete, setConfirmDelete]   = useState(false);
  const deleteService = useDeleteService();

  const [wizardStep, setWizardStep]         = useState(d?.wizardStep ?? (isNew ? 0 : -1));
  const [name, setName]                     = useState(d?.name ?? service?.name ?? "");
  const [description, setDescription]       = useState(d?.description ?? service?.description ?? "");
  const [images, setImages]                 = useState<string[]>(d?.images ?? service?.images ?? []);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [price, setPrice]                   = useState(d?.price ?? service?.price ?? 0);
  const [currency, setCurrency]             = useState(d?.currency ?? service?.currency ?? "USD");
  const [discountPct, setDiscountPct]       = useState(d?.discountPct ?? service?.discount_pct ?? 0);
  const [isRecurring, setIsRecurring]       = useState(d?.isRecurring ?? service?.is_recurring ?? false);
  const [recurringCurrency, setRecurringCurrency] = useState(d?.recurringCurrency ?? service?.recurring_currency ?? service?.currency ?? currency);
  const [recurringPrice, setRecurringPrice] = useState(d?.recurringPrice ?? service?.recurring_price ?? 0);
  const [recurringDiscountPct, setRecurringDiscountPct] = useState(d?.recurringDiscountPct ?? service?.recurring_discount_pct ?? 0);
  const [recurringInterval, setRecurringInterval] = useState<CrmService["recurring_interval"]>(d?.recurringInterval ?? service?.recurring_interval ?? "mensual");
  const [active, setActive]                 = useState(service?.active ?? true);
  const [isSaas, setIsSaas]                 = useState(service?.is_saas ?? false);
  const [saving, setSaving]                 = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // Precios multi-moneda
  const upsertPrices = useUpsertPrices();
  const { data: existingPrices = [] } = usePricesByEntity("service", service?.id ?? null);
  const [prices, setPrices] = useState<PriceEntry[]>(d?.prices ?? []);
  const pricesRef            = useRef(prices);
  const pricesSaveTimer      = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (isNew) return;
    setPrices(existingPrices.map(p => ({ currency: p.currency, price: p.price, discount_pct: p.discount_pct ?? null })));
  }, [existingPrices, isNew]);
  const handlePricesChange = (next: PriceEntry[]) => {
    setPrices(next);
    pricesRef.current = next;
    if (isNew) return; // en modo wizard se persiste junto con la creación
    clearTimeout(pricesSaveTimer.current);
    pricesSaveTimer.current = setTimeout(() => {
      upsertPrices.mutate(
        { entityType: "service", entityId: service!.id, prices: pricesRef.current },
        { onError: () => toast.error("Error al guardar los precios adicionales") }
      );
    }, 800);
  };
  useEffect(() => () => clearTimeout(pricesSaveTimer.current), []);

  // FAQs
  const upsertFaqs = useUpsertFaqs();
  const { data: existingFaqs = [] } = useFaqsByEntity("service", service?.id ?? null);
  const [faqs, setFaqs] = useState<FaqEntry[]>(d?.faqs ?? []);
  const faqsRef          = useRef(faqs);
  const faqsSaveTimer    = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (isNew) return;
    setFaqs(existingFaqs.map(f => ({ question: f.question, answer: f.answer })));
  }, [existingFaqs, isNew]);
  const handleFaqsChange = (next: FaqEntry[]) => {
    setFaqs(next);
    faqsRef.current = next;
    if (isNew) return;
    clearTimeout(faqsSaveTimer.current);
    faqsSaveTimer.current = setTimeout(() => {
      upsertFaqs.mutate(
        { entityType: "service", entityId: service!.id, faqs: faqsRef.current },
        { onError: () => toast.error("Error al guardar las FAQs") }
      );
    }, 800);
  };
  useEffect(() => () => clearTimeout(faqsSaveTimer.current), []);

  // Métodos de pago — en modo wizard se acumulan en memoria (sin entityId real todavía)
  // y se crean todos junto con el servicio; en edición usan el editor en vivo de siempre.
  const upsertPaymentMethod = useUpsertPaymentMethod();
  const [draftPaymentMethods, setDraftPaymentMethods] = useState<Partial<CrmPaymentMethod>[]>(d?.paymentMethods ?? []);

  // Opciones de "precio guardado" disponibles para basar la recurrencia — el base + cada moneda adicional
  const priceOptions = [
    { currency, price, discount_pct: discountPct },
    ...prices.filter(p => p.currency !== currency),
  ];

  // Si la moneda elegida para la recurrencia deja de existir (se borró de la lista), volver al precio base
  useEffect(() => {
    if (!isRecurring) return;
    if (!priceOptions.some(o => o.currency === recurringCurrency)) {
      setRecurringCurrency(currency);
      setRecurringPrice(price);
      setRecurringDiscountPct(discountPct);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecurring, priceOptions.map(o => o.currency).join(",")]);

  const handleRecurringCurrencyChange = (cur: string) => {
    const opt = priceOptions.find(o => o.currency === cur);
    setRecurringCurrency(cur);
    if (opt) {
      setRecurringPrice(opt.price);
      setRecurringDiscountPct(opt.discount_pct ?? 0);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!user) return;
    setUploadingImage(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/services/${service?.id ?? "new"}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      setImages([data.publicUrl]);
    } catch (e) {
      const message = e instanceof Error ? e.message.slice(0, 80) : "Error al subir imagen";
      toast.error(message);
    } finally {
      setUploadingImage(false);
    }
  };

  const discountedPrice          = discountPct > 0 ? price * (1 - discountPct / 100) : null;
  const discountedRecurringPrice = recurringPrice > 0 && recurringDiscountPct > 0
    ? recurringPrice * (1 - recurringDiscountPct / 100) : null;

  // Draft en sessionStorage — solo mientras el servicio no existe (modo wizard)
  useEffect(() => {
    if (!isNew) return;
    sessionStorage.setItem(NEW_SERVICE_DRAFT_KEY, JSON.stringify({
      wizardStep, name, description, images, price, currency, discountPct,
      isRecurring, recurringCurrency, recurringPrice, recurringDiscountPct, recurringInterval,
      prices, faqs, paymentMethods: draftPaymentMethods,
    }));
  }, [isNew, wizardStep, name, description, images, price, currency, discountPct,
      isRecurring, recurringCurrency, recurringPrice, recurringDiscountPct, recurringInterval,
      prices, faqs, draftPaymentMethods]);

  // Autoguardado — solo para servicios existentes
  const isFirstRender = useRef(true);
  const saveTimer     = useRef<ReturnType<typeof setTimeout>>();
  const onUpdateRef   = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (isNew) return;
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    clearTimeout(saveTimer.current);
    setAutoSaveStatus("saving");
    saveTimer.current = setTimeout(async () => {
      try {
        await onUpdateRef.current({
          name,
          description: description || null,
          images,
          price,
          currency,
          discount_pct: discountPct,
          is_recurring: isRecurring,
          recurring_price: isRecurring ? recurringPrice : null,
          recurring_currency: isRecurring ? recurringCurrency : null,
          recurring_interval: isRecurring ? recurringInterval : null,
          recurring_discount_pct: isRecurring ? recurringDiscountPct : 0,
          active,
          is_saas: isSaas,
        });
        setAutoSaveStatus("saved");
        setTimeout(() => setAutoSaveStatus("idle"), 2000);
      } catch {
        setAutoSaveStatus("idle");
      }
    }, 800);
    return () => clearTimeout(saveTimer.current);
  }, [isNew, name, description, images, price, currency, discountPct, isRecurring, recurringCurrency, recurringPrice, recurringDiscountPct, recurringInterval, active, isSaas]);

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("El nombre es obligatorio"); return; }
    setSaving(true);
    try {
      const created = await onCreate({
        name: name.trim(),
        description: description || null,
        images,
        price,
        currency,
        discount_pct: discountPct,
        is_recurring: isRecurring,
        recurring_price: isRecurring ? recurringPrice : null,
        recurring_currency: isRecurring ? recurringCurrency : null,
        recurring_interval: isRecurring ? recurringInterval : null,
        recurring_discount_pct: isRecurring ? recurringDiscountPct : 0,
        active: true,
        is_saas: false,
      });
      await Promise.all([
        upsertPrices.mutateAsync({ entityType: "service", entityId: created.id, prices }),
        upsertFaqs.mutateAsync({ entityType: "service", entityId: created.id, faqs }),
        ...draftPaymentMethods.map((pm, idx) => upsertPaymentMethod.mutateAsync({
          entity_type: "service",
          entity_id: created.id,
          type: pm.type ?? "bank_transfer",
          label: pm.label ?? null,
          content: pm.content ?? "",
          sort_order: idx,
          price_id: null,
          currency: pm.currency ?? null,
        })),
      ]);
      clearNewServiceDraft();
      toast.success("Servicio creado");
      onCreated(created.id);
    } catch {
      toast.error("Error al crear el servicio");
      setSaving(false);
    }
  };

  // ── Secciones reutilizables (wizard y edición completa) ──────────────────
  const ImageSection = () => (
    <div className="flex items-center gap-3">
      <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-secondary/40 border shrink-0 group/thumb">
        {images[0] ? (
          <img src={images[0]} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon size={18} className="text-muted-foreground/30" />
          </div>
        )}
        <div className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity ${uploadingImage ? "opacity-100" : "opacity-0 group-hover/thumb:opacity-100"}`}>
          {uploadingImage ? <Loader2 size={16} className="text-white animate-spin" /> : <ImageIcon size={16} className="text-white" />}
        </div>
      </div>
      <div className="flex-1 space-y-1">
        <p className="text-xs font-semibold text-muted-foreground">Imagen del servicio</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => !uploadingImage && imageInputRef.current?.click()}
            className="text-[11px] text-primary hover:text-primary/80 font-medium transition-colors"
          >
            {images[0] ? "Cambiar imagen" : "Subir imagen"}
          </button>
          {images[0] && (
            <button
              type="button"
              onClick={() => setImages([])}
              className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
            >
              Quitar
            </button>
          )}
        </div>
      </div>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ""; }}
      />
    </div>
  );

  const InfoSection = () => (
    <div className="space-y-4">
      {ImageSection()}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Nombre del servicio</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-10 text-sm"
          placeholder="Ej: Diseño Web, Corte de Cabello..."
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Descripción</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
          placeholder="Describe brevemente qué incluye este servicio"
        />
      </div>
    </div>
  );

  const PriceSection = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <DollarSign size={12} />
            Precio base
          </label>
          <Input
            type="number"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="h-10 text-sm"
            min={0}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Moneda</label>
          <select
            value={currency}
            onChange={e => setCurrency(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code} — {c.name.split(" (")[0]}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Tag size={12} />
            Descuento (%)
          </label>
          <div className="relative">
            <Input
              type="number"
              value={discountPct}
              onChange={(e) => setDiscountPct(Math.max(0, Math.min(100, Number(e.target.value))))}
              className="h-10 text-sm pr-8"
              min={0}
              max={100}
              placeholder="0"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
          </div>
          {discountedPrice !== null && (
            <p className="text-xs text-primary font-medium">
              Precio con descuento: {fmtSvc(discountedPrice, currency)}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Precio en otra moneda (opcional)</label>
        <PriceListEditor value={prices} onChange={handlePricesChange} baseCurrency={currency} />
      </div>
    </div>
  );

  const RecurringSection = () => (
    <div className="space-y-4">
      <label className="flex items-center gap-2.5 cursor-pointer">
        <div
          onClick={() => setIsRecurring(!isRecurring)}
          className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${isRecurring ? "bg-primary" : "bg-secondary border"}`}
        >
          <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isRecurring ? "translate-x-4" : ""}`} />
        </div>
        <span className="text-sm">Este servicio tiene un cobro recurrente</span>
      </label>

      {isRecurring && (
        <div className="space-y-3 pl-1">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Basado en el precio de</label>
            <select
              value={recurringCurrency}
              onChange={e => handleRecurringCurrencyChange(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {priceOptions.map(o => (
                <option key={o.currency} value={o.currency}>
                  {o.currency}{o.currency === currency ? " (precio base)" : ""} — {fmtSvc(o.price, o.currency)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground/70">Monto ({recurringCurrency})</span>
              <Input
                type="number"
                value={recurringPrice}
                onChange={(e) => setRecurringPrice(Number(e.target.value))}
                className="h-9 text-sm"
                min={0}
              />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground/70">Intervalo</span>
              <select
                value={recurringInterval ?? "mensual"}
                onChange={e => setRecurringInterval(e.target.value as CrmService["recurring_interval"])}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {INTERVAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground/70">Descuento recurrente (%)</span>
            <div className="relative">
              <Input
                type="number"
                value={recurringDiscountPct}
                onChange={(e) => setRecurringDiscountPct(Math.max(0, Math.min(100, Number(e.target.value))))}
                className="h-9 text-sm pr-8"
                min={0}
                max={100}
                placeholder="0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            </div>
            {discountedRecurringPrice !== null && (
              <p className="text-xs text-primary font-medium">
                Precio con descuento: {fmtSvc(discountedRecurringPrice, recurringCurrency)}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const FaqSection = () => (
    <FaqEditor value={faqs} onChange={handleFaqsChange} />
  );

  const PaymentsSection = () => (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground/70">
        El Agente IA usará estos métodos para cerrar ventas. Si no hay ninguno, transferirá a modo Manual.
      </p>
      {isNew ? (
        <PaymentMethodsDraftEditor value={draftPaymentMethods} onChange={setDraftPaymentMethods} baseCurrency={currency} />
      ) : (
        <PaymentMethodsEditor entityType="service" entityId={service!.id} prices={existingPrices} baseCurrency={currency} />
      )}
    </div>
  );

  if (!isNew) {
    // ── Edición completa (servicio existente) — mismo patrón de menú con tabs
    // que Ajustes/CrmBusiness: pill tabs en desktop, drill-down estilo iOS en mobile.
    const TABS = [
      { id: "info" as const,    label: "Información General", description: "Nombre, descripción, imagen y FAQs", icon: Info },
      { id: "precios" as const, label: "Precios",              description: "Precio base, recurrencia y pagos",   icon: Wallet },
      { id: "ajustes" as const, label: "Ajustes",               description: "Estado y eliminar servicio",         icon: SlidersHorizontal },
    ];
    const activeTabDef = TABS.find(t => t.id === activeTab) ?? TABS[0];

    const handleSelectTab = (id: typeof TABS[number]["id"]) => {
      setActiveTab(id);
      setShowMobileContent(true);
    };

    const renderTabContent = () => (
      <>
        {activeTab === "info" && (
          <div className="space-y-6">
            <div className="bg-card border rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <Briefcase size={15} className="text-muted-foreground" />
                <h2 className="text-sm font-semibold">Información general</h2>
              </div>
              {InfoSection()}
            </div>

            <div className="bg-card border rounded-2xl p-6 space-y-4">
              <h2 className="text-sm font-semibold">FAQs</h2>
              {FaqSection()}
            </div>

            {isSuperAdmin && (
              <div className="bg-card border rounded-2xl p-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSaas}
                    onChange={(e) => setIsSaas(e.target.checked)}
                    className="rounded border-input h-4 w-4 accent-primary"
                  />
                  <span className="text-sm font-medium">
                    Servicio SaaS{" "}
                    <span className="text-xs text-muted-foreground">(activa CRM para el cliente al venderlo)</span>
                  </span>
                </label>
              </div>
            )}
          </div>
        )}

        {activeTab === "precios" && (
          <div className="space-y-6">
            <div className="bg-card border rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign size={15} className="text-muted-foreground" />
                <h2 className="text-sm font-semibold">Precio</h2>
              </div>
              {PriceSection()}
            </div>

            <div className="bg-card border rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <Settings size={15} className="text-muted-foreground" />
                <h2 className="text-sm font-semibold">Cobro recurrente</h2>
              </div>
              {RecurringSection()}
            </div>

            <div className="bg-card border rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <CreditCard size={15} className="text-muted-foreground" />
                <h2 className="text-sm font-semibold">Métodos de pago</h2>
                <span className="text-xs text-muted-foreground/60 ml-1">— opcional</span>
              </div>
              {PaymentsSection()}
            </div>
          </div>
        )}

        {activeTab === "ajustes" && (
          <div className="space-y-6">
            <div className="bg-card border rounded-2xl p-6 space-y-3">
              <h2 className="text-sm font-semibold">Estado</h2>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <div
                  onClick={() => setActive(!active)}
                  className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${active ? "bg-primary" : "bg-secondary border"}`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${active ? "translate-x-5" : ""}`} />
                </div>
                <span className="text-sm">{active ? "Activo" : "Inactivo"}</span>
              </label>
              <p className="text-xs text-muted-foreground/70">Los servicios inactivos no se muestran a tus clientes.</p>
            </div>

            {canDelete && (
              <div className="bg-card border border-destructive/20 rounded-2xl p-6 space-y-3">
                <h2 className="text-sm font-semibold text-destructive">Eliminar servicio</h2>
                <p className="text-xs text-muted-foreground">Se eliminará permanentemente. Esta acción no se puede deshacer.</p>
                <Button
                  variant="outline"
                  onClick={() => setConfirmDelete(true)}
                  className="text-destructive hover:bg-destructive/10 border-destructive/30"
                >
                  <Trash2 size={13} className="mr-1.5" /> Eliminar servicio
                </Button>
              </div>
            )}
          </div>
        )}
      </>
    );

    const HeaderBlock = () => (
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-3 transition-colors"
          >
            <ArrowLeft size={12} />
            Volver a servicios
          </button>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-xl font-semibold border-none h-auto p-0 px-2 -ml-2 hover:bg-secondary/50 focus-visible:ring-0 w-full max-w-sm mb-1"
            placeholder="Nombre del servicio"
          />
          <p className="text-sm text-muted-foreground px-2 -ml-2">
            Configura los detalles de este servicio
          </p>
        </div>
        {autoSaveStatus !== "idle" && (
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            {autoSaveStatus === "saving" ? (
              <><Loader2 size={11} className="animate-spin" />Guardando...</>
            ) : (
              <><span className="text-green-500 font-semibold">✓</span> Guardado</>
            )}
          </span>
        )}
      </div>
    );

    return (
      <>
        <DeleteConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          onConfirm={async () => { await deleteService.mutateAsync({ id: service!.id, name: service!.name }); toast.success("Servicio eliminado"); onBack(); }}
          isPending={deleteService.isPending}
          description="Se eliminará el servicio permanentemente."
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
                {name || "Servicio"}
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

          {/* Tab bar — same style as CrmSettings/CrmBusiness */}
          <div className="overflow-x-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            <div className="inline-flex items-center gap-0.5 bg-secondary/60 rounded-xl p-1 min-w-max">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
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

          {renderTabContent()}
        </div>
      </>
    );
  }

  // ── Wizard (nuevo servicio) — solo se guarda al llegar al final ──────────
  const TOTAL = WIZARD_STEPS.length;
  const isLast = wizardStep === TOTAL - 1;
  const next = () => { if (wizardStep < TOTAL - 1) setWizardStep(s => s + 1); };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <button
          onClick={() => { clearNewServiceDraft(); onBack(); }}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft size={12} /> Cancelar
        </button>
        <h2 className="text-lg font-semibold">Nuevo servicio</h2>
        <p className="text-sm text-muted-foreground">{WIZARD_STEPS[wizardStep]} — Paso {wizardStep + 1} de {TOTAL}</p>
      </div>

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

      <div className="bg-card border rounded-2xl p-6">
        <h3 className="text-sm font-semibold mb-4">{WIZARD_STEPS[wizardStep]}</h3>
        {wizardStep === 0 && InfoSection()}
        {wizardStep === 1 && PriceSection()}
        {wizardStep === 2 && RecurringSection()}
        {wizardStep === 3 && FaqSection()}
        {wizardStep === 4 && PaymentsSection()}
      </div>

      <div className="flex gap-2 justify-between">
        {wizardStep > 0 && (
          <Button variant="outline" size="sm" onClick={() => setWizardStep(s => s - 1)} className="h-9 text-xs">
            <ArrowLeft size={12} className="mr-1" /> Atrás
          </Button>
        )}
        <div className="flex gap-2 ml-auto">
          {isLast ? (
            <Button onClick={handleCreate} disabled={saving || !name.trim()} className="h-9 px-5 gap-1.5">
              {saving ? <Loader2 size={13} className="animate-spin" /> : null}
              {saving ? "Creando..." : "Crear servicio"}
            </Button>
          ) : (
            <Button size="sm" onClick={next} disabled={wizardStep === 0 && !name.trim()} className="h-9 text-xs">
              Continuar →
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Service Grid Card ───────────────────────────────────────────────
const ServiceGridCard = ({
  svc,
  handleEdit,
  canEdit,
}: {
  svc: CrmService;
  handleEdit: (id: string) => void;
  canEdit: boolean;
}) => {
  const finalPrice = svc.discount_pct > 0
    ? svc.price * (1 - svc.discount_pct / 100)
    : svc.price;

  const recurringCurrency = svc.recurring_currency ?? svc.currency;

  return (
    <div
      className={`group bg-card border rounded-2xl overflow-hidden transition-all duration-200 flex flex-col ${
        canEdit ? "cursor-pointer hover:border-primary/40 hover:shadow-md" : "cursor-default"
      } ${!svc.active ? "opacity-60" : ""}`}
      onClick={() => canEdit && handleEdit(svc.id)}
    >
      {/* Banner */}
      <div className="relative h-24 bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center shrink-0">
        <Briefcase size={26} className="text-primary/30" />
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 space-y-2">
        <p className="text-sm font-semibold leading-snug line-clamp-2">{svc.name}</p>

        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed flex-1">
          {svc.description || "Sin descripción"}
        </p>

        <div className="pt-1.5 border-t border-border/60">
          {svc.discount_pct > 0 ? (
            <div className="flex items-baseline gap-1.5">
              <span className="text-[11px] line-through text-muted-foreground/60">{fmtSvc(svc.price, svc.currency)}</span>
              <span className="text-sm font-bold text-primary">{fmtSvc(finalPrice, svc.currency)}</span>
            </div>
          ) : (
            <span className="text-sm font-bold text-foreground">{fmtSvc(svc.price, svc.currency)}</span>
          )}
          {svc.is_recurring && svc.recurring_price != null && svc.recurring_price > 0 && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              +{fmtSvc(
                (svc.recurring_discount_pct ?? 0) > 0
                  ? svc.recurring_price * (1 - (svc.recurring_discount_pct ?? 0) / 100)
                  : svc.recurring_price,
                recurringCurrency
              )}{svc.recurring_interval ? ` / ${INTERVAL_LABELS[svc.recurring_interval] ?? svc.recurring_interval}` : ""}
            </p>
          )}
        </div>

        {(!svc.active || svc.is_saas) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {!svc.active && (
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                Inactivo
              </span>
            )}
            {svc.is_saas && (
              <span className="text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                SaaS
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main: Services Library ─────────────────────────────────────────
const CrmServices = ({
  isSuperAdmin = false,
  canEdit = true,
  canCreate = true,
  canDelete = true,
}: {
  isSuperAdmin?: boolean;
  canEdit?: boolean;
  canCreate?: boolean;
  canDelete?: boolean;
}) => {
  const { data: allServices = [], isLoading } = useServices();
  const { allowedIds } = useStaffPermissions();
  const allowedServiceIds = allowedIds("servicios");
  const services = allowedServiceIds
    ? allServices.filter((s) => allowedServiceIds.includes(s.id))
    : allServices;
  const createService = useCreateService();
  const updateService = useUpdateService();

  const [view, setView] = useState<"list" | "editor" | "new">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = services.find((s) => s.id === selectedId);

  const handleCreateNew = () => setView("new");

  const handleEdit = (id: string) => {
    setSelectedId(id);
    setView("editor");
  };

  if (view === "new") {
    return (
      <ServiceEditor
        service={null}
        isSuperAdmin={isSuperAdmin}
        canDelete={canDelete}
        onBack={() => setView("list")}
        onCreate={(payload) => createService.mutateAsync(payload)}
        onCreated={(id) => { setSelectedId(id); setView("editor"); }}
        onUpdate={async () => {}}
      />
    );
  }

  if (view === "editor" && selected) {
    return (
      <ServiceEditor
        service={selected}
        isSuperAdmin={isSuperAdmin}
        canDelete={canDelete}
        onBack={() => setView("list")}
        onCreate={(payload) => createService.mutateAsync(payload)}
        onCreated={() => {}}
        onUpdate={async (updates) => {
          try {
            await updateService.mutateAsync({ id: selected.id, ...updates });
            toast.success("Servicio actualizado");
          } catch {
            toast.error("Error al actualizar");
          }
        }}
      />
    );
  }

  return (
    <>
      <div className="space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">
              {services.length > 0
                ? `${services.length} servicio${services.length !== 1 ? "s" : ""} configurado${services.length !== 1 ? "s" : ""}`
                : "Define los servicios que ofreces a tus clientes"}
            </p>
          </div>
          {canCreate && (
            <Button
              onClick={handleCreateNew}
              className="h-9 rounded-2xl text-sm font-semibold px-4 gap-2 shrink-0"
            >
              <Plus size={14} />
              Nuevo servicio
            </Button>
          )}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="animate-spin text-muted-foreground" />
          </div>
        ) : services.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center bg-card border border-dashed rounded-2xl">
            <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center">
              <Briefcase size={24} className="text-primary/60" />
            </div>
            <div>
              <p className="text-sm font-semibold">Sin servicios todavía</p>
              <p className="text-xs text-muted-foreground mt-1">Crea tu primer servicio para mostrarlo en tus propuestas y cotizaciones</p>
            </div>
            {canCreate && (
              <Button onClick={handleCreateNew} size="sm" className="gap-1.5 rounded-2xl">
                <Plus size={13} /> Crear servicio
              </Button>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((svc) => (
              <ServiceGridCard
                key={svc.id}
                svc={svc}
                handleEdit={handleEdit}
                canEdit={canEdit}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default CrmServices;
