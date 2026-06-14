import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ArrowLeft, Settings, Briefcase, DollarSign, Loader2, GripVertical, Tag, CreditCard, Globe } from "lucide-react";
import { useServices, useCreateService, useUpdateService, useDeleteService, usePricesByEntity, useUpsertPrices, useFaqsByEntity, useUpsertFaqs } from "@/hooks/useCrmData";
import type { CrmService } from "@/lib/supabase";
import PriceListEditor, { type PriceEntry } from "@/components/crm/PriceListEditor";
import FaqEditor, { type FaqEntry } from "@/components/crm/FaqEditor";
import { toast } from "sonner";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";
import PaymentMethodsEditor from "@/components/shared/PaymentMethodsEditor";

import { CURRENCIES, formatAmount } from "@/lib/currencies";
const fmtSvc = (amount: number, currency?: string | null) => formatAmount(amount, currency);
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ─── Service Editor ──────────────────────────────────────────────────
const ServiceEditor = ({
  service,
  isSuperAdmin,
  onBack,
  onUpdate,
}: {
  service: CrmService;
  isSuperAdmin: boolean;
  onBack: () => void;
  onUpdate: (s: Partial<CrmService>) => Promise<void>;
}) => {
  const [name, setName]                     = useState(service.name);
  const [description, setDescription]       = useState(service.description ?? "");
  const [benefits, setBenefits]             = useState<string[]>(service.benefits ?? []);
  const [price, setPrice]                   = useState(service.price);
  const [currency, setCurrency]             = useState(service.currency ?? "USD");
  const [recurringPrice, setRecurringPrice] = useState(service.recurring_price ?? 0);
  const [recurringInterval, setRecurringInterval] = useState(service.recurring_interval ?? "");
  const [recurringLabel, setRecurringLabel] = useState(service.recurring_label ?? "");
  const [deliveryTime, setDeliveryTime]     = useState(service.delivery_time ?? "");
  const [isRecommended, setIsRecommended]   = useState(service.is_recommended ?? false);
  const [active, setActive]                 = useState(service.active ?? true);
  const [isSaas, setIsSaas]                 = useState(service.is_saas ?? false);
  const [discountPct, setDiscountPct]                   = useState(service.discount_pct ?? 0);
  const [recurringDiscountPct, setRecurringDiscountPct] = useState(service.recurring_discount_pct ?? 0);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  // Multi-currency prices
  const upsertPrices = useUpsertPrices();
  const { data: existingPrices = [] } = usePricesByEntity("service", service.id);
  const [prices, setPrices] = useState<PriceEntry[]>([]);
  const pricesRef            = useRef(prices);
  const pricesSaveTimer      = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    setPrices(existingPrices.map(p => ({ currency: p.currency, price: p.price, discount_pct: p.discount_pct ?? null })));
  }, [existingPrices]);
  const handlePricesChange = (next: PriceEntry[]) => {
    setPrices(next);
    pricesRef.current = next;
    clearTimeout(pricesSaveTimer.current);
    pricesSaveTimer.current = setTimeout(() => {
      upsertPrices.mutate(
        { entityType: "service", entityId: service.id, prices: pricesRef.current },
        { onError: () => toast.error("Error al guardar los precios adicionales") }
      );
    }, 800);
  };

  useEffect(() => () => clearTimeout(pricesSaveTimer.current), []);

  // FAQs
  const upsertFaqs = useUpsertFaqs();
  const { data: existingFaqs = [] } = useFaqsByEntity("service", service.id);
  const [faqs, setFaqs] = useState<FaqEntry[]>([]);
  const faqsRef          = useRef(faqs);
  const faqsSaveTimer    = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    setFaqs(existingFaqs.map(f => ({ question: f.question, answer: f.answer })));
  }, [existingFaqs]);
  const handleFaqsChange = (next: FaqEntry[]) => {
    setFaqs(next);
    faqsRef.current = next;
    clearTimeout(faqsSaveTimer.current);
    faqsSaveTimer.current = setTimeout(() => {
      upsertFaqs.mutate(
        { entityType: "service", entityId: service.id, faqs: faqsRef.current },
        { onError: () => toast.error("Error al guardar las FAQs") }
      );
    }, 800);
  };
  useEffect(() => () => clearTimeout(faqsSaveTimer.current), []);

  const discountedPrice          = discountPct > 0 ? price * (1 - discountPct / 100) : null;
  const discountedRecurringPrice = recurringPrice > 0 && recurringDiscountPct > 0
    ? recurringPrice * (1 - recurringDiscountPct / 100) : null;

  const isFirstRender = useRef(true);
  const saveTimer     = useRef<ReturnType<typeof setTimeout>>();
  const onUpdateRef   = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    clearTimeout(saveTimer.current);
    setAutoSaveStatus("saving");
    saveTimer.current = setTimeout(async () => {
      try {
        await onUpdateRef.current({
          name,
          description: description || null,
          benefits,
          price,
          currency,
          recurring_price: recurringPrice > 0 ? recurringPrice : null,
          recurring_interval: recurringInterval || null,
          recurring_label: recurringLabel || null,
          is_recurring: recurringPrice > 0,
          delivery_time: deliveryTime || null,
          is_recommended: isRecommended,
          active,
          is_saas: isSaas,
          discount_pct: discountPct,
          recurring_discount_pct: recurringDiscountPct,
        });
        setAutoSaveStatus("saved");
        setTimeout(() => setAutoSaveStatus("idle"), 2000);
      } catch {
        setAutoSaveStatus("idle");
      }
    }, 800);
    return () => clearTimeout(saveTimer.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, description, benefits, price, currency, recurringPrice, recurringInterval, recurringLabel, deliveryTime, isRecommended, active, isSaas, discountPct, recurringDiscountPct]);

  return (
    <div className="space-y-8">
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
        <div className="flex items-center gap-3">
          {autoSaveStatus !== "idle" && (
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              {autoSaveStatus === "saving" ? (
                <><Loader2 size={11} className="animate-spin" />Guardando...</>
              ) : (
                <><span className="text-green-500 font-semibold">✓</span> Guardado</>
              )}
            </span>
          )}
          {/* Activo / Inactivo */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => setActive(!active)}
              className={`relative w-10 h-5 rounded-full transition-colors ${active ? "bg-primary" : "bg-secondary"}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${active ? "translate-x-5" : ""}`} />
            </div>
            <span className="text-xs font-medium text-muted-foreground">{active ? "Activo" : "Inactivo"}</span>
          </label>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Info general */}
        <div className="bg-card border rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <Briefcase size={15} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold">Información general</h2>
          </div>

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

          {/* Precio */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <DollarSign size={12} />
                Precio base / Inicial
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
                  Precio con descuento: ${discountedPrice.toFixed(2)}
                </p>
              )}
            </div>
          </div>

          {/* Precios multi-moneda */}
          <PriceListEditor value={prices} onChange={handlePricesChange} baseCurrency={currency} />

          {/* FAQs */}
          <FaqEditor value={faqs} onChange={handleFaqsChange} />

          {/* Cobro recurrente */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-muted-foreground">Cobro recurrente (opcional)</label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground/70">Precio</span>
                <Input
                  type="number"
                  value={recurringPrice}
                  onChange={(e) => setRecurringPrice(Number(e.target.value))}
                  className="h-9 text-sm"
                  min={0}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground/70">Intervalo</span>
                <Input
                  type="text"
                  value={recurringInterval}
                  onChange={(e) => setRecurringInterval(e.target.value)}
                  className="h-9 text-sm"
                  placeholder="mensual, anual..."
                />
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground/70">Etiqueta visible (ej: Mantenimiento)</span>
              <Input
                type="text"
                value={recurringLabel}
                onChange={(e) => setRecurringLabel(e.target.value)}
                className="h-9 text-sm"
                placeholder="Mantenimiento, Soporte..."
              />
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
                  Precio con descuento: ${discountedRecurringPrice.toFixed(2)}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Tiempo de entrega</label>
            <Input
              type="text"
              value={deliveryTime}
              onChange={(e) => setDeliveryTime(e.target.value)}
              className="h-10 text-sm"
              placeholder="Ej: 3–5 días, 1 hora"
            />
          </div>

          {/* Checkboxes */}
          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isRecommended}
                onChange={(e) => setIsRecommended(e.target.checked)}
                className="rounded border-input h-4 w-4 accent-primary"
              />
              <span className="text-sm font-medium">Etiqueta "Recomendado / Destacado"</span>
            </label>

            {isSuperAdmin && (
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
            )}
          </div>
        </div>

        {/* Beneficios */}
        <div className="bg-card border rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <Settings size={15} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold">Beneficios</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Lista los beneficios principales que ofrece este servicio
          </p>

          <div className="space-y-2">
            {benefits.map((b, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={b}
                  onChange={(e) => {
                    const copy = [...benefits];
                    copy[i] = e.target.value;
                    setBenefits(copy);
                  }}
                  className="h-9 text-sm flex-1"
                  placeholder={`Beneficio ${i + 1}`}
                />
                <button
                  onClick={() => setBenefits(benefits.filter((_, idx) => idx !== i))}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <button
              onClick={() => setBenefits([...benefits, ""])}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
            >
              <Plus size={12} /> Añadir beneficio
            </button>
          </div>
        </div>
      </div>

      {/* Métodos de pago */}
      <div className="bg-card border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard size={15} className="text-muted-foreground" />
          <h2 className="text-sm font-semibold">Métodos de pago</h2>
          <span className="text-xs text-muted-foreground/60 ml-1">— opcional</span>
        </div>
        <p className="text-xs text-muted-foreground -mt-1">
          El Agente IA usará estos métodos para cerrar ventas. Si no hay ninguno, transferirá a modo Manual.
        </p>
        <PaymentMethodsEditor entityType="service" entityId={service.id} prices={existingPrices} baseCurrency={currency} />
      </div>
    </div>
  );
};

// ─── Sortable Service Item ──────────────────────────────────────────
const SortableServiceItem = ({
  svc,
  handleEdit,
  handleDelete,
  handleToggleLanding,
  canEdit,
  canDelete,
  canReorder,
  isSuperAdmin,
}: {
  svc: CrmService;
  handleEdit: (id: string) => void;
  handleDelete: (id: string) => void;
  handleToggleLanding: (id: string, value: boolean) => void;
  canEdit: boolean;
  canDelete: boolean;
  canReorder: boolean;
  isSuperAdmin: boolean;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: svc.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    opacity: isDragging ? 0.85 : 1,
  };

  const finalPrice = svc.discount_pct > 0
    ? svc.price * (1 - svc.discount_pct / 100)
    : svc.price;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-card border rounded-2xl overflow-hidden transition-shadow ${
        isDragging ? "shadow-xl border-primary/40" : "hover:shadow-sm"
      } ${!svc.active ? "opacity-60" : ""}`}
    >
      <div className="flex items-stretch">
        {/* Drag handle strip */}
        <div
          className={`flex items-center px-2 border-r ${
            canReorder
              ? "cursor-grab active:cursor-grabbing text-muted-foreground/25 hover:text-muted-foreground/60 hover:bg-secondary/40"
              : "cursor-default text-muted-foreground/10"
          } transition-colors select-none`}
          {...(canReorder ? { ...attributes, ...listeners } : {})}
        >
          <GripVertical size={14} />
        </div>

        {/* Main content */}
        <div
          className={`flex items-center gap-3 flex-1 px-4 py-4 min-w-0 ${canEdit ? "cursor-pointer" : "cursor-default"}`}
          onClick={() => canEdit && handleEdit(svc.id)}
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Briefcase size={16} className="text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold leading-tight group-hover:text-primary transition-colors truncate">
                {svc.name}
              </p>
              {/* Price — desktop */}
              <div className="hidden sm:block text-right shrink-0 ml-2">
                {svc.discount_pct > 0 ? (
                  <div className="flex items-baseline gap-1.5 justify-end">
                    <span className="text-[11px] line-through text-muted-foreground/60">{fmtSvc(svc.price, svc.currency)}</span>
                    <span className="text-sm font-bold text-primary">{fmtSvc(finalPrice, svc.currency)}</span>
                  </div>
                ) : (
                  <span className="text-sm font-bold text-foreground">{fmtSvc(svc.price, svc.currency)}</span>
                )}
                {svc.recurring_price != null && svc.recurring_price > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    +{fmtSvc(
                      (svc.recurring_discount_pct ?? 0) > 0
                        ? svc.recurring_price * (1 - (svc.recurring_discount_pct ?? 0) / 100)
                        : svc.recurring_price,
                      svc.currency
                    )}{svc.recurring_interval ? ` ${svc.recurring_interval}` : ""}
                  </p>
                )}
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {svc.description || "Sin descripción"}
            </p>

            {/* Price — mobile */}
            <div className="sm:hidden mt-1.5">
              {svc.discount_pct > 0 ? (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[11px] line-through text-muted-foreground/60">{fmtSvc(svc.price, svc.currency)}</span>
                  <span className="text-sm font-bold text-primary">{fmtSvc(finalPrice, svc.currency)}</span>
                </div>
              ) : (
                <span className="text-sm font-bold text-foreground">{fmtSvc(svc.price, svc.currency)}</span>
              )}
            </div>

            {/* Badges */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
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
              {svc.is_recommended && (
                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                  Destacado
                </span>
              )}
              {isSuperAdmin && (
                <span className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${svc.show_on_landing ? "text-sky-600 bg-sky-500/10" : "text-muted-foreground bg-secondary"}`}>
                  <Globe size={9} />
                  {svc.show_on_landing ? "Landing" : "Sin landing"}
                </span>
              )}
              {(svc.benefits?.filter(Boolean).length ?? 0) > 0 && (
                <span className="text-[9px] text-muted-foreground/70">
                  {svc.benefits?.filter(Boolean).length} beneficios
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        {(canEdit || canDelete || isSuperAdmin) && (
          <div className="flex items-center gap-0.5 px-2 border-l">
            {isSuperAdmin && (
              <button
                onClick={(e) => { e.stopPropagation(); handleToggleLanding(svc.id, !svc.show_on_landing); }}
                title={svc.show_on_landing ? "Quitar de Landing Page" : "Mostrar en Landing Page"}
                className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${svc.show_on_landing ? "text-sky-500 hover:bg-sky-500/10" : "text-muted-foreground/40 hover:bg-secondary hover:text-muted-foreground"}`}
              >
                <Globe size={14} />
              </button>
            )}
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl"
                onClick={(e) => { e.stopPropagation(); handleEdit(svc.id); }}
              >
                <Settings size={14} />
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="w-9 h-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-xl"
                onClick={(e) => { e.stopPropagation(); handleDelete(svc.id); }}
              >
                <Trash2 size={13} />
              </Button>
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
  canReorder = true,
}: {
  isSuperAdmin?: boolean;
  canEdit?: boolean;
  canCreate?: boolean;
  canDelete?: boolean;
  canReorder?: boolean;
}) => {
  const { data: services = [], isLoading } = useServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  // Local order state for drag-and-drop optimistic updates
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  useEffect(() => {
    setOrderedIds(services.map((s) => s.id));
  }, [services]);

  const orderedServices = orderedIds
    .map((id) => services.find((s) => s.id === id))
    .filter((s): s is CrmService => s != null);

  const [view, setView] = useState<"list" | "editor">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const selected = services.find((s) => s.id === selectedId);

  const handleCreateNew = async () => {
    try {
      const created = await createService.mutateAsync({
        name: "Nuevo Servicio",
        price: 0,
        currency: "USD",
        description: null,
        benefits: [],
        is_recurring: false,
        is_recommended: false,
        active: true,
        is_saas: false,
        discount_pct: 0,
        recurring_discount_pct: 0,
      });
      setSelectedId(created.id);
      setView("editor");
    } catch {
      toast.error("Error al crear servicio");
    }
  };

  const handleEdit = (id: string) => {
    setSelectedId(id);
    setView("editor");
  };

  const handleDelete = (id: string) => {
    const svc = services.find((s) => s.id === id);
    setDeleteTarget({ id, name: svc?.name ?? id });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteService.mutateAsync({ id: deleteTarget.id, name: deleteTarget.name });
      toast.success("Servicio eliminado");
    } catch {
      toast.error("Error al eliminar");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleToggleLanding = async (id: string, value: boolean) => {
    try {
      await updateService.mutateAsync({ id, show_on_landing: value });
    } catch {
      toast.error("Error al actualizar");
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!canReorder) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedIds.indexOf(String(active.id));
    const newIndex = orderedIds.indexOf(String(over.id));
    const newOrder = arrayMove(orderedIds, oldIndex, newIndex);

    setOrderedIds(newOrder);

    try {
      await Promise.all(
        newOrder.map((id, idx) => updateService.mutateAsync({ id, sort_order: idx }))
      );
    } catch {
      toast.error("Error al reordenar");
      setOrderedIds(orderedIds);
    }
  };

  if (view === "editor" && selected) {
    return (
      <ServiceEditor
        service={selected}
        isSuperAdmin={isSuperAdmin}
        onBack={() => setView("list")}
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
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={handleConfirmDelete}
        isPending={deleteService.isPending}
        description="Se eliminará el servicio permanentemente."
      />
      <div className="space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">
              {orderedServices.length > 0
                ? `${orderedServices.length} servicio${orderedServices.length !== 1 ? "s" : ""} configurado${orderedServices.length !== 1 ? "s" : ""}`
                : "Define los servicios que ofreces a tus clientes"}
            </p>
          </div>
          {canCreate && (
            <Button
              onClick={handleCreateNew}
              disabled={createService.isPending}
              className="h-9 rounded-2xl text-sm font-semibold px-4 gap-2 shrink-0"
            >
              {createService.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={14} />}
              Nuevo servicio
            </Button>
          )}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="animate-spin text-muted-foreground" />
          </div>
        ) : orderedServices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center bg-card border border-dashed rounded-2xl">
            <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center">
              <Briefcase size={24} className="text-primary/60" />
            </div>
            <div>
              <p className="text-sm font-semibold">Sin servicios todavía</p>
              <p className="text-xs text-muted-foreground mt-1">Crea tu primer servicio para mostrarlo en tus propuestas y cotizaciones</p>
            </div>
            {canCreate && (
              <Button onClick={handleCreateNew} disabled={createService.isPending} size="sm" className="gap-1.5 rounded-2xl">
                {createService.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={13} />}
                Crear servicio
              </Button>
            )}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
              <div className="grid gap-2.5">
                {orderedServices.map((svc) => (
                  <SortableServiceItem
                    key={svc.id}
                    svc={svc}
                    handleEdit={handleEdit}
                    handleDelete={handleDelete}
                    handleToggleLanding={handleToggleLanding}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    canReorder={canReorder}
                    isSuperAdmin={isSuperAdmin}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </>
  );
};

export default CrmServices;
