import { useState, useMemo, useRef, useEffect } from "react";
import {
  Plus, Loader2, X, Filter, CheckCircle2, DollarSign,
  Upload, Bot, Check, XCircle, RefreshCcw, Search, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  useContacts, useServices, useProducts, useProductVariants, useProductPlans, useCourses, useCoursePlans, useSales, useCreateSale, useUpdateSale, useDeleteSale,
  useClientAccounts, useActivateSaasClient, useUpdateSaasAccess,
} from "@/hooks/useCrmData";
import { useStaffPermissions, useCurrentUser } from "@/hooks/useAuth";
import type { CrmSale } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import SalesTable from "@/components/crm/SalesTable";
import SalesTrendCard from "@/components/crm/SalesTrendCard";
import ContactPicker from "@/components/crm/ContactPicker";
import RenewalsPanel, { getOverdueRenewals, getUpcomingRenewals } from "@/components/crm/RenewalsPanel";
import { planFinalPrice, planFinalRecurringPrice, addInterval } from "@/components/crm/PlanEditor";

// ─── Constants ────────────────────────────────────────────────────────────────
import { CURRENCIES, formatAmount, getCurrencyFlag, getCurrencyFromPhone } from "@/lib/currencies";
import { usePricesByEntity } from "@/hooks/useCrmData";

const fmtSaleAmt = (amount: number, currency?: string | null, decimals = 2) =>
  formatAmount(amount, currency, decimals);

function getAvatarColor(str: string) {
  const colors = ["#1877F2","#0a57d0","#00a884","#9B59B6","#E67E22","#E91E63","#3498DB","#2ECC71"];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

type VentasSection = "reporte" | "registrar" | "historial" | "renovaciones";

type HistorySaleRow = {
  id: string; raw: CrmSale;
  date: Date; dateStr: string; dateKey: string;
  contactName: string; contactId: string;
  serviceName: string; amount: number; notes: string;
};

// Filtra el historial de ventas; `skip` omite una dimensión (para calcular las opciones de esa misma dimensión en cascada).
function applyHistoryFilters(
  rows: HistorySaleRow[],
  dateFrom: string, dateTo: string, product: string, contact: string, currency: string,
  skip?: "product" | "contact" | "currency"
) {
  let r = rows;
  if (dateFrom) r = r.filter(s => s.dateKey >= dateFrom);
  if (dateTo)   r = r.filter(s => s.dateKey <= dateTo);
  if (skip !== "product"  && product)  r = r.filter(s => s.serviceName === product);
  if (skip !== "contact"  && contact)  r = r.filter(s => s.contactName.toLowerCase().includes(contact.trim().toLowerCase()));
  if (skip !== "currency" && currency) r = r.filter(s => (s.raw.currency ?? "USD") === currency);
  return r;
}

const SELECT_CLS = "w-full h-12 px-3.5 rounded-xl border border-border bg-card text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all appearance-none cursor-pointer";
const INPUT_CLS  = "w-full h-12 px-4 rounded-xl border border-border bg-card text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all placeholder:text-muted-foreground/50";
const F_SELECT   = "w-full h-9 px-3 rounded-xl border border-border bg-card text-xs font-medium outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all appearance-none cursor-pointer";
const F_INPUT    = "w-full h-9 px-3 rounded-xl border border-border bg-card text-xs font-medium outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all";

const Chevron = () => (
  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
);

// ─── Proof Upload ─────────────────────────────────────────────────────────────

const ProofUpload = ({ onUploaded }: { onUploaded: (url: string) => void }) => {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview]     = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const ext  = file.name.split(".").pop() ?? "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("payment-proofs").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("payment-proofs").getPublicUrl(path);
      setPreview(data.publicUrl);
      onUploaded(data.publicUrl);
    } catch {
      toast.error("Error al subir el comprobante");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <input ref={ref} type="file" accept="image/*,application/pdf" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      {preview ? (
        <div className="relative">
          <img src={preview} alt="Comprobante" className="w-full max-h-32 object-contain rounded-xl border" />
          <button type="button"
            onClick={() => { setPreview(null); onUploaded(""); if (ref.current) ref.current.value = ""; }}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-background border flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors">
            <X size={11} />
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current?.click()} disabled={uploading}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-4 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all">
          {uploading
            ? <><Loader2 size={14} className="animate-spin" /> Subiendo...</>
            : <><Upload size={14} /> Subir imagen o PDF</>}
        </button>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const CrmVentas = ({ section, onNavigate }: { section: VentasSection; onNavigate?: (view: "ventas_registrar") => void }) => {
  const { user }      = useCurrentUser();
  const { can }       = useStaffPermissions();
  const canCreateSale = can("ventas", "create");
  const canEditSale   = can("ventas", "edit");
  const canDeleteSale = can("ventas", "delete");

  const { data: contacts = [] }                            = useContacts();
  const { data: services = [] }                            = useServices();
  const { data: salesData = [], isLoading: loadingSales }  = useSales();
  const { data: clientAccounts = [] }                      = useClientAccounts();
  const createSale  = useCreateSale();
  const updateSale  = useUpdateSale();
  const deleteSale  = useDeleteSale();
  const activateSaas = useActivateSaasClient();
  const updateSaasAccess = useUpdateSaasAccess();

  const accountByContact = useMemo(
    () => Object.fromEntries(clientAccounts.map(a => [a.contact_id, a])),
    [clientAccounts]
  );

  // ─── Sale modal ───────────────────────────────────────────────────────────
  const [saleModal, setSaleModal] = useState<
    | { mode: "edit";   sale: CrmSale }
    | { mode: "delete"; sale: CrmSale }
    | null
  >(null);
  const [justification, setJustification] = useState("");
  const [editAmount, setEditAmount]       = useState<number | "">("");
  const [editNotes, setEditNotes]         = useState("");
  const [editRecurrenceStart, setEditRecurrenceStart] = useState("");
  const [editNextRenewal, setEditNextRenewal]         = useState("");

  const openEditSale = (sale: CrmSale) => {
    setSaleModal({ mode: "edit", sale });
    setEditAmount(sale.amount);
    setEditNotes(sale.notes ?? "");
    setEditRecurrenceStart(sale.recurrence_start_date ?? "");
    setEditNextRenewal(sale.next_renewal_date ?? "");
    setJustification("");
  };
  const openDeleteSale = (sale: CrmSale) => { setSaleModal({ mode: "delete", sale }); setJustification(""); };
  const closeSaleModal = () => { setSaleModal(null); setJustification(""); };

  const handleConfirmEditSale = async () => {
    if (!saleModal || saleModal.mode !== "edit") return;
    if (!justification.trim()) { toast.error("La justificación es obligatoria"); return; }
    try {
      await updateSale.mutateAsync({
        id: saleModal.sale.id, amount: Number(editAmount), notes: editNotes || null,
        recurrence_start_date: editRecurrenceStart || null,
        next_renewal_date: editNextRenewal || null,
        justification: justification.trim(),
      });
      toast.success("Venta actualizada"); closeSaleModal();
    } catch { toast.error("Error al actualizar la venta"); }
  };

  const handleConfirmDeleteSale = async () => {
    if (!saleModal || saleModal.mode !== "delete") return;
    if (!justification.trim()) { toast.error("La justificación es obligatoria"); return; }
    try {
      await deleteSale.mutateAsync({ id: saleModal.sale.id, contactName: saleModal.sale.contact_name ?? "—", serviceName: saleModal.sale.service_name ?? "—", amount: saleModal.sale.amount, justification: justification.trim() });
      toast.success("Venta eliminada"); closeSaleModal();
    } catch { toast.error("Error al eliminar la venta"); }
  };

  // ─── New sale form ────────────────────────────────────────────────────────
  const { data: products = [] } = useProducts();
  const activeProducts = useMemo(() => products.filter(p => p.is_active), [products]);
  const { data: courses = [] } = useCourses();

  const [selectedContact, setSelectedContact] = useState("");
  const [saleItemType, setSaleItemType]       = useState<"service" | "product" | "course">("service");
  const [selectedService, setSelectedService] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedVariant, setSelectedVariant] = useState("");
  const [selectedProductPlan, setSelectedProductPlan] = useState("");
  const [selectedCourse, setSelectedCourse]   = useState("");
  const [selectedCoursePlan, setSelectedCoursePlan] = useState("");
  const [saleNotes, setSaleNotes]             = useState("");
  const [saleAmount, setSaleAmount]           = useState<number | "">("");
  const [saleCurrency, setSaleCurrency]       = useState<string>("USD");
  const [isRenewal, setIsRenewal]             = useState(false);
  const [renewalSearch, setRenewalSearch]     = useState("");
  const [recurrenceStartDate, setRecurrenceStartDate] = useState("");
  const [persistRenewalAmount, setPersistRenewalAmount] = useState(false);

  const { data: productVariants = [] } = useProductVariants(
    saleItemType === "product" && selectedProduct ? selectedProduct : null
  );
  const selectedProductObj = useMemo(() => activeProducts.find(p => p.id === selectedProduct), [activeProducts, selectedProduct]);
  const fisicoProducts  = useMemo(() => activeProducts.filter(p => p.product_kind === "fisico"),  [activeProducts]);
  const digitalProducts = useMemo(() => activeProducts.filter(p => p.product_kind === "archivo"), [activeProducts]);

  // Multi-currency auto-select
  const { data: servicePrices = [] } = usePricesByEntity("service", selectedService || null);
  const { data: productPrices = [] } = usePricesByEntity("product", selectedProduct || null);
  const { data: coursePlans = [] }   = useCoursePlans(selectedCourse || null);
  const { data: productPlans = [] } = useProductPlans(
    saleItemType === "product" && selectedProduct && selectedProductObj?.product_kind === "archivo" ? selectedProduct : null
  );

  // El servicio/plan actualmente seleccionado en el formulario, si es recurrente — usado para
  // mostrar la fecha de inicio de recurrencia y el checkbox de monto persistente.
  const recurringSelection =
    saleItemType === "service" ? services.find(x => x.id === selectedService) :
    saleItemType === "course"  ? coursePlans.find(x => x.id === selectedCoursePlan) :
    saleItemType === "product" ? productPlans.find(x => x.id === selectedProductPlan) :
    null;
  const isRecurringSelection = !!recurringSelection?.is_recurring;

  // Aplicar precio por moneda cuando los precios llegan del servidor (los hooks son async y los handlers usan datos stale)
  useEffect(() => {
    if (saleItemType !== "service" || !selectedService || !servicePrices.length) return;
    const cur = getContactCurrency(selectedContact);
    if (!cur) return;
    const match = servicePrices.find(p => p.currency.toUpperCase() === cur.toUpperCase());
    if (match) { setSaleAmount(match.price); setSaleCurrency(match.currency); }
  }, [servicePrices]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (saleItemType !== "product" || !selectedProduct || !selectedProductObj || selectedProductObj.product_kind !== "fisico" || selectedProductObj.has_variants || !productPrices.length) return;
    const cur = getContactCurrency(selectedContact);
    if (!cur) return;
    const match = productPrices.find(p => p.currency.toUpperCase() === cur.toUpperCase());
    if (match) { setSaleAmount(match.price); setSaleCurrency(match.currency); }
  }, [productPrices]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fecha de inicio de la recurrencia: si el contacto ya tiene una venta previa para este mismo
  // servicio/plan, se hereda la fecha original de esa cadena; si no, se propone hoy (editable).
  useEffect(() => {
    if (!selectedContact) { setRecurrenceStartDate(""); return; }
    let entityId: string | null = null;
    let field: "service_id" | "course_plan_id" | "product_plan_id" | null = null;
    if (saleItemType === "service" && selectedService) { entityId = selectedService; field = "service_id"; }
    else if (saleItemType === "course" && selectedCoursePlan) { entityId = selectedCoursePlan; field = "course_plan_id"; }
    else if (saleItemType === "product" && selectedProductPlan) { entityId = selectedProductPlan; field = "product_plan_id"; }

    if (!entityId || !field) { setRecurrenceStartDate(""); return; }

    const prior = salesData
      .filter(s => s.contact_id === selectedContact && s[field!] === entityId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];

    setRecurrenceStartDate(prior ? (prior.recurrence_start_date ?? prior.created_at.slice(0, 10)) : new Date().toISOString().slice(0, 10));
  }, [selectedContact, selectedService, selectedCoursePlan, selectedProductPlan, saleItemType]); // eslint-disable-line react-hooks/exhaustive-deps

  const getContactCurrency = (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    return contact?.phone ? getCurrencyFromPhone(contact.phone) : null;
  };
  const getPriceForCurrency = (
    prices: { currency: string; price: number }[],
    defaultPrice: number,
    defaultCurrency: string,
    currency: string | null
  ) => {
    if (!currency) return defaultPrice;
    const cur = currency.toUpperCase();
    const match = prices.find(p => p.currency.toUpperCase() === cur);
    if (match) return match.price;
    return defaultPrice;
  };

  const calcProductPrice = (prod: typeof activeProducts[0], variant?: typeof productVariants[0]) => {
    if (variant) {
      const base = variant.price_override != null ? variant.price_override : prod.price;
      const disc = (variant.discount_pct ?? 0) > 0 ? variant.discount_pct : (variant.price_override == null ? prod.discount_pct ?? 0 : 0);
      return disc > 0 ? +(base * (1 - disc / 100)).toFixed(2) : base;
    }
    const disc = prod.discount_pct ?? 0;
    return disc > 0 ? +(prod.price * (1 - disc / 100)).toFixed(2) : prod.price;
  };

  const calcCoursePlanPrice = (plan: typeof coursePlans[0], useRecurring: boolean) => {
    if (useRecurring && plan.recurring_price != null) {
      const disc = plan.recurring_discount_pct ?? 0;
      return disc > 0 ? +(plan.recurring_price * (1 - disc / 100)).toFixed(2) : plan.recurring_price;
    }
    const disc = plan.discount_pct ?? 0;
    return disc > 0 ? +(plan.price * (1 - disc / 100)).toFixed(2) : plan.price;
  };

  const calcServicePrice = (svc: typeof services[0] & { discount_pct?: number }, useRecurring: boolean) => {
    if (useRecurring && svc.recurring_price != null) {
      const disc = svc.recurring_discount_pct ?? 0;
      return disc > 0 ? +(svc.recurring_price * (1 - disc / 100)).toFixed(2) : svc.recurring_price;
    }
    const disc = svc.discount_pct ?? 0;
    return disc > 0 ? +(svc.price * (1 - disc / 100)).toFixed(2) : svc.price;
  };

  const handleServiceChange = (sId: string) => {
    setSelectedService(sId);
    const s = services.find(x => x.id === sId);
    if (!s) { setSaleAmount(""); return; }
    const discountPct = s.discount_pct ?? 0;
    const defaultAmt = discountPct > 0 ? +(s.price * (1 - discountPct / 100)).toFixed(2) : s.price;
    setSaleAmount(defaultAmt);
    setSaleCurrency(s.currency ?? "USD"); // moneda base inmediata; useEffect aplica override cuando precios cargan
  };

  const handleProductChange = (pId: string) => {
    setSelectedProduct(pId); setSelectedVariant(""); setSelectedProductPlan(""); setSaleAmount("");
    const p = activeProducts.find(x => x.id === pId);
    if (!p) return;
    setSaleCurrency(p.currency ?? "USD");
    if (p.product_kind === "fisico" && !p.has_variants) {
      setSaleAmount(calcProductPrice(p));
    }
  };

  const handleProductPlanChange = (planId: string) => {
    setSelectedProductPlan(planId);
    const p = productPlans.find(x => x.id === planId);
    if (!p) { setSaleAmount(""); return; }
    setSaleAmount(planFinalPrice(p));
    setSaleCurrency(p.currency ?? "USD");
  };

  const handleContactChange = (contactId: string) => {
    setSelectedContact(contactId);
    if (saleItemType === "service" && selectedService) {
      const s = services.find(x => x.id === selectedService);
      if (s) {
        const discountPct = s.discount_pct ?? 0;
        const defaultAmt = discountPct > 0 ? +(s.price * (1 - discountPct / 100)).toFixed(2) : s.price;
        const cur = contactId ? getContactCurrency(contactId) : null;
        const match = cur ? servicePrices.find(p => p.currency.toUpperCase() === cur.toUpperCase()) : null;
        if (match) { setSaleAmount(match.price); setSaleCurrency(match.currency); }
        else { setSaleAmount(getPriceForCurrency(servicePrices, defaultAmt, s.currency, cur)); setSaleCurrency(s.currency ?? "USD"); }
      }
    } else if (saleItemType === "product" && selectedProduct && selectedProductObj?.product_kind === "fisico" && !selectedProductObj.has_variants) {
      const cur = contactId ? getContactCurrency(contactId) : null;
      const match = cur ? productPrices.find(p => p.currency.toUpperCase() === cur.toUpperCase()) : null;
      if (match) { setSaleAmount(match.price); setSaleCurrency(match.currency); }
      else { setSaleAmount(getPriceForCurrency(productPrices, calcProductPrice(selectedProductObj), selectedProductObj.currency, cur)); setSaleCurrency(selectedProductObj.currency ?? "USD"); }
    } else if (saleItemType === "course" && selectedCoursePlan) {
      const p = coursePlans.find(x => x.id === selectedCoursePlan);
      if (p) {
        setSaleAmount(calcCoursePlanPrice(p, false));
        setSaleCurrency(p.currency ?? "USD");
      }
    }
  };

  const handleVariantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const vId = e.target.value; setSelectedVariant(vId);
    if (!vId || !selectedProductObj) { setSaleAmount(""); return; }
    const v = productVariants.find(x => x.id === vId);
    if (v) setSaleAmount(calcProductPrice(selectedProductObj, v));
  };

  const handleCourseChange = (cId: string) => {
    setSelectedCourse(cId); setSelectedCoursePlan(""); setSaleAmount("");
  };

  const handleCoursePlanChange = (planId: string) => {
    setSelectedCoursePlan(planId);
    const p = coursePlans.find(x => x.id === planId);
    if (!p) { setSaleAmount(""); return; }
    setSaleAmount(calcCoursePlanPrice(p, false));
    setSaleCurrency(p.currency ?? "USD");
  };

  // Selector unificado "Productos" — combina tipo + entidad en un solo campo (valor: "categoria:id")
  const productPickerValue =
    saleItemType === "service" && selectedService ? `service:${selectedService}` :
    saleItemType === "product" && selectedProduct ? `product:${selectedProduct}` :
    saleItemType === "course"  && selectedCourse  ? `course:${selectedCourse}` :
    "";

  const handleProductPick = (raw: string) => {
    setSelectedVariant(""); setSelectedCoursePlan(""); setSelectedProductPlan("");
    if (!raw) {
      setSelectedService(""); setSelectedProduct(""); setSelectedCourse("");
      setSaleAmount("");
      return;
    }
    const idx = raw.indexOf(":");
    const cat = raw.slice(0, idx);
    const id  = raw.slice(idx + 1);
    if (cat === "service") {
      setSaleItemType("service"); setSelectedProduct(""); setSelectedCourse("");
      handleServiceChange(id);
    } else if (cat === "product") {
      setSaleItemType("product"); setSelectedService(""); setSelectedCourse("");
      handleProductChange(id);
    } else if (cat === "course") {
      setSaleItemType("course"); setSelectedService(""); setSelectedProduct("");
      handleCourseChange(id);
    }
  };

  const resetSaleForm = () => {
    setSelectedContact(""); setSelectedService(""); setSelectedProduct("");
    setSelectedVariant(""); setSelectedProductPlan("");
    setSelectedCourse(""); setSelectedCoursePlan("");
    setSaleNotes(""); setSaleAmount(""); setSaleCurrency("USD"); setIsRenewal(false);
    setRecurrenceStartDate(""); setPersistRenewalAmount(false);
  };

  // Calcula cuándo y cuánto toca el siguiente cobro recurrente, y guarda la fecha de inicio de la
  // recurrencia. `overrideAmount` permite usar el monto editado a mano (en vez del recurrente por
  // defecto del plan) también para las próximas renovaciones, cuando el admin lo pide explícitamente.
  const nextRenewalFields = (recurring: {
    is_recurring: boolean;
    recurring_interval: "semanal" | "mensual" | "trimestral" | "semestral" | "anual" | null;
    recurring_currency: string | null;
    currency: string;
  } | null | undefined, defaultRecurringAmount: number | null, overrideAmount?: number | null): Partial<CrmSale> => {
    if (!recurring?.is_recurring || !recurring.recurring_interval) return {};
    const fields: Partial<CrmSale> = {
      recurrence_start_date: recurrenceStartDate || new Date().toISOString().slice(0, 10),
    };
    const amount = overrideAmount ?? defaultRecurringAmount;
    if (amount != null) {
      fields.next_renewal_date = addInterval(new Date(), recurring.recurring_interval).toISOString().slice(0, 10);
      fields.next_renewal_amount = amount;
      fields.next_renewal_currency = recurring.recurring_currency ?? recurring.currency ?? "USD";
    }
    return fields;
  };

  // Detecta si el contacto ya tiene alguna venta previa para este mismo servicio/plan —
  // si es así, esto es una renovación aunque no se haya llegado aquí desde el panel de Renovaciones.
  const hasPriorSaleFor = (
    contactId: string,
    entityId: string,
    field: "service_id" | "course_plan_id" | "product_plan_id"
  ) => salesData.some(s => s.contact_id === contactId && s[field] === entityId);

  const handleRegisterSale = async () => {
    const contact = contacts.find(c => c.id === selectedContact);
    if (!contact) return;

    if (saleItemType === "service") {
      if (!selectedService || saleAmount === "" || isNaN(Number(saleAmount))) return;
      const service = services.find(s => s.id === selectedService);
      if (!service) return;
      const isRenewalSale = isRenewal || hasPriorSaleFor(contact.id, service.id, "service_id");
      const paymentLabel = isRenewalSale ? "Renovación" : "Pago Inicial";
      let finalNotes = saleNotes;
      if (service.is_recurring) {
        finalNotes = finalNotes ? `[${paymentLabel}] ${finalNotes}` : `[${paymentLabel}]`;
      }
      const renewal = nextRenewalFields(service, calcServicePrice(service, true), persistRenewalAmount ? Number(saleAmount) : null);
      try {
        await createSale.mutateAsync({
          contact_id: contact.id, contact_name: contact.name,
          service_id: service.id, service_name: service.name,
          amount: Number(saleAmount), currency: saleCurrency,
          type: isRenewalSale ? "recurring" : "initial", notes: finalNotes || null,
          ...renewal,
        });
        if (service.is_saas && user) {
          if (!contact.email) {
            toast.success("Venta registrada");
            toast.error("El contacto no tiene correo — no se pudo activar su acceso SaaS. Agrégale uno desde Contactos.");
          } else {
            const existingAccount = accountByContact[contact.id];
            try {
              if (!existingAccount) {
                const result = await activateSaas.mutateAsync({
                  contact_id: contact.id,
                  plan_id: service.id,
                  starts_at: new Date().toISOString().slice(0, 10),
                  expires_at: renewal.next_renewal_date ?? null,
                });
                toast.success(
                  result.is_new_user
                    ? `Venta registrada · Email de invitación enviado a ${contact.email ?? contact.name}`
                    : "Venta registrada · Acceso SaaS activado"
                );
              } else {
                // Ya tiene cuenta — solo asegurar que el acceso quede activo (se estaba bloqueado o no)
                // y extender el vencimiento hasta la nueva fecha de renovación.
                await updateSaasAccess.mutateAsync({
                  contact_id: contact.id,
                  status: "active",
                  plan_id: service.id,
                  expires_at: renewal.next_renewal_date ?? null,
                });
                toast.success("Venta registrada · Acceso SaaS activo" + (renewal.next_renewal_date ? ` hasta ${renewal.next_renewal_date}` : ""));
              }
            } catch (err) {
              toast.success("Venta registrada");
              toast.error(err instanceof Error ? err.message : "No se pudo actualizar el acceso SaaS del cliente.");
            }
          }
        } else { toast.success("Venta registrada"); }
        resetSaleForm();
      } catch { toast.error("Error al registrar la venta"); }
    } else if (saleItemType === "product") {
      if (!selectedProduct || saleAmount === "" || isNaN(Number(saleAmount))) return;
      const product = activeProducts.find(p => p.id === selectedProduct);
      if (!product) return;

      let payload: Partial<CrmSale>;
      if (product.product_kind === "archivo") {
        const plan = productPlans.find(p => p.id === selectedProductPlan);
        const isRenewalSale = isRenewal || (!!plan && hasPriorSaleFor(contact.id, plan.id, "product_plan_id"));
        const paymentLabel = isRenewalSale ? "Renovación" : "Pago Inicial";
        let finalNotes = saleNotes;
        if (plan?.is_recurring) {
          finalNotes = finalNotes ? `[${paymentLabel}] ${finalNotes}` : `[${paymentLabel}]`;
        }
        payload = {
          contact_id: contact.id, contact_name: contact.name,
          product_id: product.id, product_name: product.name,
          product_plan_id: plan?.id ?? null,
          amount: Number(saleAmount), currency: saleCurrency,
          type: isRenewalSale ? "recurring" : "initial", notes: finalNotes || null,
          ...nextRenewalFields(plan, plan ? planFinalRecurringPrice(plan) : null, persistRenewalAmount ? Number(saleAmount) : null),
        };
      } else {
        const selectedVariantObj = selectedVariant ? productVariants.find(v => v.id === selectedVariant) : undefined;
        const variantName = selectedVariantObj ? ` (${selectedVariantObj.name})` : "";
        payload = {
          contact_id: contact.id, contact_name: contact.name,
          product_id: product.id, product_name: product.name + variantName,
          ...(selectedVariant ? { product_variant_id: selectedVariant } : {}),
          amount: Number(saleAmount), currency: saleCurrency,
          type: "initial", notes: saleNotes || null,
        };
      }
      try {
        await createSale.mutateAsync(payload);
        toast.success("Venta registrada");
        resetSaleForm();
      } catch { toast.error("Error al registrar la venta"); }
    } else {
      if (!selectedCourse || saleAmount === "" || isNaN(Number(saleAmount))) return;
      const course = courses.find(c => c.id === selectedCourse);
      if (!course) return;
      const plan = coursePlans.find(p => p.id === selectedCoursePlan);
      const isRenewalSale = isRenewal || (!!plan && hasPriorSaleFor(contact.id, plan.id, "course_plan_id"));
      const paymentLabel = isRenewalSale ? "Renovación" : "Pago Inicial";
      let finalNotes = saleNotes;
      if (plan?.is_recurring) {
        finalNotes = finalNotes ? `[${paymentLabel}] ${finalNotes}` : `[${paymentLabel}]`;
      }
      try {
        await createSale.mutateAsync({
          contact_id: contact.id, contact_name: contact.name,
          course_id: course.id, course_name: course.title,
          course_plan_id: plan?.id ?? null,
          amount: Number(saleAmount), currency: saleCurrency,
          type: isRenewalSale ? "recurring" : "initial", notes: finalNotes || null,
          ...nextRenewalFields(plan, plan ? planFinalRecurringPrice(plan) : null, persistRenewalAmount ? Number(saleAmount) : null),
        });
        toast.success("Venta registrada");
        resetSaleForm();
      } catch { toast.error("Error al registrar la venta"); }
    }
  };

  // ─── Filters ──────────────────────────────────────────────────────────────
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo,   setFilterDateTo]   = useState("");
  const [filterProduct,  setFilterProduct]  = useState("");
  const [filterContact,  setFilterContact]  = useState("");
  const [filterCurrency, setFilterCurrency] = useState("");

  const hasFilters = !!(filterDateFrom || filterDateTo || filterProduct || filterContact || filterCurrency);

  const clearFilters = () => {
    setFilterDateFrom(""); setFilterDateTo(""); setFilterProduct("");
    setFilterContact(""); setFilterCurrency("");
  };

  // ─── Confirmar/rechazar ventas pendientes de aprobación (IA o cualquier otro origen) ──
  const [confirmingSaleId, setConfirmingSaleId] = useState<string | null>(null);

  const handleConfirmSale = async (sale: CrmSale, action: "confirm" | "reject") => {
    setConfirmingSaleId(sale.id + action);
    try {
      if (action === "confirm") {
        await updateSale.mutateAsync({
          id: sale.id, status: "confirmed", is_paid: true,
          paid_at: new Date().toISOString(),
          justification: "Confirmado manualmente desde panel de Ventas",
        });
        if (sale.product_id) supabase.functions.invoke("send-deliverable", { body: { sale_id: sale.id } }).catch(() => {});
        toast.success("Venta confirmada");
      } else {
        await updateSale.mutateAsync({ id: sale.id, status: "rejected", justification: "Rechazado manualmente desde panel de Ventas" });
        toast.success("Venta rechazada");
      }
    } catch (e) { toast.error(`Error: ${e instanceof Error ? e.message : String(e)}`); }
    finally { setConfirmingSaleId(null); }
  };

  // Cualquier venta pendiente de aprobación — hoy solo las genera el Agente IA al detectar un comprobante,
  // pero el panel no asume ese origen (podría venir de otras fuentes en el futuro).
  const pendingApprovalSales = useMemo(
    () => salesData.filter(s => s.status === "pending_review"),
    [salesData]
  );

  // ─── Renovaciones próximas (pagos recurrentes por registrar manualmente) ──
  const handleStartRenewal = (s: CrmSale) => {
    setSelectedContact(s.contact_id ?? "");
    if (s.service_id) {
      setSaleItemType("service"); setSelectedProduct(""); setSelectedCourse(""); setSelectedProductPlan(""); setSelectedCoursePlan("");
      setSelectedService(s.service_id);
    } else if (s.course_plan_id) {
      setSaleItemType("course"); setSelectedService(""); setSelectedProduct(""); setSelectedProductPlan("");
      setSelectedCourse(s.course_id ?? "");
      setSelectedCoursePlan(s.course_plan_id);
    } else if (s.product_plan_id) {
      setSaleItemType("product"); setSelectedService(""); setSelectedCourse(""); setSelectedCoursePlan("");
      setSelectedProduct(s.product_id ?? "");
      setSelectedProductPlan(s.product_plan_id);
    }
    setSaleAmount(s.next_renewal_amount ?? "");
    setSaleCurrency(s.next_renewal_currency ?? "USD");
    setSaleNotes("");
    setIsRenewal(true);
  };

  // Desde la sección Renovaciones: pre-llena el formulario y lleva a Registrar Venta.
  const handleGoToRegistrarFromRenewal = (s: CrmSale) => {
    handleStartRenewal(s);
    onNavigate?.("ventas_registrar");
  };

  // ─── Filtered history ─────────────────────────────────────────────────────
  const allSales: HistorySaleRow[] = useMemo(() => salesData.map(s => ({
    id: s.id, raw: s,
    date:        new Date(s.created_at),
    dateStr:     new Date(s.created_at).toLocaleDateString("es-ES"),
    dateKey:     s.created_at.slice(0, 10),
    contactName: s.contact_name ?? contacts.find(c => c.id === s.contact_id)?.name ?? "Contacto eliminado",
    serviceName: s.course_name ?? s.product_name ?? s.service_name ?? "—",
    amount:      s.amount, notes: s.notes ?? "",
    contactId:   s.contact_id ?? "",
  })), [salesData, contacts]);

  const filteredSales = useMemo(
    () => applyHistoryFilters(allSales, filterDateFrom, filterDateTo, filterProduct, filterContact, filterCurrency),
    [allSales, filterDateFrom, filterDateTo, filterProduct, filterContact, filterCurrency]
  );

  const filteredConfirmedSales = useMemo(
    () => filteredSales.filter(s => s.raw.status !== "pending_review" && s.raw.status !== "rejected"),
    [filteredSales]
  );

  const filteredTotal = useMemo(
    () => filteredConfirmedSales.reduce((s, x) => s + x.amount, 0),
    [filteredConfirmedSales]
  );

  const filteredTotalsPorMoneda = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of filteredConfirmedSales) { const c = s.raw.currency ?? "USD"; map.set(c, (map.get(c) ?? 0) + s.amount); }
    return [...map.entries()];
  }, [filteredConfirmedSales]);

  // Opciones de cada filtro, en cascada según los demás filtros activos.
  const productOptions = useMemo(() => {
    const set = new Set<string>();
    for (const s of applyHistoryFilters(allSales, filterDateFrom, filterDateTo, filterProduct, filterContact, filterCurrency, "product")) set.add(s.serviceName);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [allSales, filterDateFrom, filterDateTo, filterProduct, filterContact, filterCurrency]);

  const historyCurrencyOptions = useMemo(() => {
    const set = new Set<string>();
    for (const s of applyHistoryFilters(allSales, filterDateFrom, filterDateTo, filterProduct, filterContact, filterCurrency, "currency")) set.add(s.raw.currency ?? "USD");
    return [...set].sort();
  }, [allSales, filterDateFrom, filterDateTo, filterProduct, filterContact, filterCurrency]);

  const isFormValid = selectedContact && (
    saleItemType === "service" ? !!selectedService :
    saleItemType === "product" ? !!selectedProduct && (!selectedProductObj?.has_variants || !productVariants.length || !!selectedVariant) :
    !!selectedCourse
  ) && saleAmount !== "";

  const SECTION_META: Record<VentasSection, { title: string; subtitle: string }> = {
    reporte:      { title: "Reporte General",  subtitle: "Resumen de ventas y tendencia" },
    historial:    { title: "Historial",        subtitle: "Historial completo de transacciones" },
    registrar:    { title: "Registrar Manual", subtitle: "Registra una venta o aprueba pendientes" },
    renovaciones: { title: "Renovaciones",     subtitle: "Pagos recurrentes por registrar manualmente" },
  };

  const renderReporte = () => (
    <SalesTrendCard sales={salesData} />
  );

  const renderRenovaciones = () => {
    const hasAnyRenewal = getOverdueRenewals(salesData).length > 0 || getUpcomingRenewals(salesData).length > 0;
    if (!hasAnyRenewal) {
      return (
        <div className="py-16 flex flex-col items-center gap-2 text-center">
          <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center">
            <RefreshCcw size={18} className="text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Sin renovaciones por atender</p>
          <p className="text-xs text-muted-foreground/60">Aparecerán aquí a medida que se acerquen sus fechas de cobro.</p>
        </div>
      );
    }

    const q = renewalSearch.trim().toLowerCase();
    const filteredSales = !q ? salesData : salesData.filter(s => {
      const contactName = (contacts.find(c => c.id === s.contact_id)?.name ?? s.contact_name ?? "").toLowerCase();
      const itemName = (s.course_name ?? s.product_name ?? s.service_name ?? "").toLowerCase();
      return contactName.includes(q) || itemName.includes(q);
    });
    const overdue  = getOverdueRenewals(filteredSales);
    const upcoming = getUpcomingRenewals(filteredSales);

    return (
      <div className="space-y-4">
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          <input
            value={renewalSearch}
            onChange={(e) => setRenewalSearch(e.target.value)}
            placeholder="Buscar por cliente o producto..."
            className="w-full h-10 pl-9 pr-8 rounded-xl border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
          {renewalSearch && (
            <button type="button" onClick={() => setRenewalSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              <X size={14} />
            </button>
          )}
        </div>

        {overdue.length === 0 && upcoming.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-muted-foreground">Sin resultados para "{renewalSearch}"</p>
            <button onClick={() => setRenewalSearch("")} className="text-xs text-primary hover:underline mt-1">Limpiar búsqueda</button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4 items-start">
            <RenewalsPanel sales={filteredSales} contacts={contacts} onActionClick={handleGoToRegistrarFromRenewal} actionLabel="Ir a Registrar Venta" variant="overdue" />
            <RenewalsPanel sales={filteredSales} contacts={contacts} onActionClick={handleGoToRegistrarFromRenewal} actionLabel="Ir a Registrar Venta" variant="upcoming" />
          </div>
        )}
      </div>
    );
  };

  const renderRegistrar = () => (
    <>
      {/* ── Ventas pendientes de aprobación ── */}
      {pendingApprovalSales.length > 0 && (
        <div className="border border-blue-200 bg-blue-50 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-blue-200 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
              <Bot size={15} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-800">Ventas pendientes de aprobación</p>
              <p className="text-xs text-blue-600">Revisa y confirma o rechaza cada venta</p>
            </div>
            <span className="ml-auto text-xs font-bold bg-blue-500/15 text-blue-700 px-2 py-0.5 rounded-full">
              {pendingApprovalSales.length}
            </span>
          </div>
          <div className="divide-y divide-blue-100">
            {pendingApprovalSales.map(sale => (
              <div key={sale.id} className="px-5 py-3.5 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate flex items-center gap-1.5">
                    {sale.contact_name ?? "Cliente desconocido"}
                    {sale.is_ai_sale && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 shrink-0">
                        <Bot size={9} /> IA
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {sale.product_name ?? sale.service_name ?? "Producto"} · ${sale.amount.toFixed(2)}
                    {sale.payment_method_type && <span className="ml-1.5 capitalize">· {sale.payment_method_type}</span>}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    disabled={!!confirmingSaleId}
                    onClick={() => handleConfirmSale(sale, "confirm")}
                    className="h-9 px-3.5 rounded-xl text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {confirmingSaleId === sale.id + "confirm" ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    Confirmar
                  </button>
                  <button
                    disabled={!!confirmingSaleId}
                    onClick={() => handleConfirmSale(sale, "reject")}
                    className="h-9 px-3.5 rounded-xl text-xs font-bold text-destructive border border-destructive/30 hover:bg-destructive/5 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {confirmingSaleId === sale.id + "reject" ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Registrar Venta ── */}
      {canCreateSale && (
        <div className="bg-card border rounded-2xl p-5">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center">
              <Plus size={15} className="text-muted-foreground" />
            </div>
            <h2 className="text-sm font-semibold">Registrar Venta</h2>
          </div>

          <div className="space-y-3">
            {/* Contacto */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contacto</label>
              <ContactPicker contacts={contacts} value={selectedContact} onChange={handleContactChange} />
            </div>

            {/* Productos */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Productos</label>
              <div className="relative">
                <select className={SELECT_CLS} value={productPickerValue} onChange={(e) => handleProductPick(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {services.length > 0 && (
                    <optgroup label="Servicios">
                      {services.map(s => (
                        <option key={`service:${s.id}`} value={`service:${s.id}`}>
                          {s.name} — {fmtSaleAmt(s.price, s.currency)}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {fisicoProducts.length > 0 && (
                    <optgroup label="Productos Físicos">
                      {fisicoProducts.map(p => {
                        const disc = p.discount_pct ?? 0;
                        const displayPrice = disc > 0 ? +(p.price * (1 - disc / 100)).toFixed(2) : p.price;
                        return (
                          <option key={`product:${p.id}`} value={`product:${p.id}`}>
                            {p.name} — {fmtSaleAmt(displayPrice, p.currency)}{disc > 0 ? ` (-${disc}%)` : ""}
                          </option>
                        );
                      })}
                    </optgroup>
                  )}
                  {digitalProducts.length > 0 && (
                    <optgroup label="Productos Digitales">
                      {digitalProducts.map(p => (
                        <option key={`product:${p.id}`} value={`product:${p.id}`}>{p.name}</option>
                      ))}
                    </optgroup>
                  )}
                  {courses.length > 0 && (
                    <optgroup label="Cursos">
                      {courses.map(c => (
                        <option key={`course:${c.id}`} value={`course:${c.id}`}>{c.title}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <Chevron />
              </div>
            </div>

            {/* Plan del curso */}
            {saleItemType === "course" && selectedCourse && coursePlans.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Plan</label>
                <div className="relative">
                  <select className={SELECT_CLS} value={selectedCoursePlan} onChange={e => handleCoursePlanChange(e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {coursePlans.map(p => (
                      <option key={p.id} value={p.id}>{p.name} — {fmtSaleAmt(calcCoursePlanPrice(p, false), p.currency)}</option>
                    ))}
                  </select>
                  <Chevron />
                </div>
              </div>
            )}

            {/* Plan del producto digital */}
            {saleItemType === "product" && selectedProductObj?.product_kind === "archivo" && productPlans.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Plan</label>
                <div className="relative">
                  <select className={SELECT_CLS} value={selectedProductPlan} onChange={e => handleProductPlanChange(e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {productPlans.map(p => (
                      <option key={p.id} value={p.id}>{p.name} — {fmtSaleAmt(planFinalPrice(p), p.currency)}</option>
                    ))}
                  </select>
                  <Chevron />
                </div>
              </div>
            )}

            {/* Variante */}
            {saleItemType === "product" && selectedProductObj?.has_variants && productVariants.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Variante</label>
                <div className="relative">
                  <select className={SELECT_CLS} value={selectedVariant} onChange={handleVariantChange}>
                    <option value="">Seleccionar variante...</option>
                    {productVariants.map(v => {
                      const price = calcProductPrice(selectedProductObj, v);
                      const base  = v.price_override != null ? v.price_override : selectedProductObj.price;
                      return <option key={v.id} value={v.id}>{v.name} — {fmtSaleAmt(price, selectedProductObj.currency)}{price < base ? ` (-${v.discount_pct ?? selectedProductObj.discount_pct ?? 0}%)` : ""}</option>;
                    })}
                  </select>
                  <Chevron />
                </div>
              </div>
            )}

            {/* Fecha de inicio de recurrencia */}
            {isRecurringSelection && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fecha de inicio de la recurrencia</label>
                <input type="date" value={recurrenceStartDate} onChange={(e) => setRecurrenceStartDate(e.target.value)} className={INPUT_CLS} />
                <p className="text-[10px] text-muted-foreground/60">Se usa para llevar el registro del ciclo de pagos de este cliente. Ajústala si estás registrando historial atrasado.</p>
              </div>
            )}

            {/* Aviso de recurrencia — servicio */}
            {saleItemType === "service" && (() => {
              const s = services.find(x => x.id === selectedService);
              if (!s?.is_recurring) return null;
              const recLabel = s.recurring_label ? s.recurring_label.replace(/^[/\s]+/, "") : (s.recurring_interval ?? "mes");
              return (
                <div className="p-3 bg-secondary/40 rounded-xl border border-secondary">
                  <p className="text-xs font-semibold text-foreground">
                    {isRenewal ? "Registrando renovación — pago recurrente" : "Servicio recurrente — se registra el pago inicial"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {isRenewal
                      ? (s.recurring_price != null && <>{fmtSaleAmt(calcServicePrice(s, true), s.currency)} / {recLabel}</>)
                      : <>{fmtSaleAmt(calcServicePrice(s, false), s.currency)} ahora
                          {s.recurring_price != null && <> · luego {fmtSaleAmt(calcServicePrice(s, true), s.currency)} / {recLabel} (los cobros recurrentes se registran aparte)</>}
                        </>}
                  </p>
                </div>
              );
            })()}

            {/* Aviso: servicio SaaS pero el contacto no tiene correo */}
            {saleItemType === "service" && (() => {
              const s = services.find(x => x.id === selectedService);
              const contact = contacts.find(c => c.id === selectedContact);
              if (!s?.is_saas || !selectedContact || contact?.email) return null;
              return (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                  <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    Este servicio activa acceso SaaS, pero el contacto no tiene correo. Agrégale uno desde Contactos antes de registrar la venta, o el acceso no podrá activarse.
                  </p>
                </div>
              );
            })()}

            {/* Aviso de recurrencia — plan de curso */}
            {saleItemType === "course" && (() => {
              const p = coursePlans.find(x => x.id === selectedCoursePlan);
              if (!p?.is_recurring) return null;
              const recLabel = p.recurring_label ? p.recurring_label.replace(/^[/\s]+/, "") : (p.recurring_interval ?? "mes");
              return (
                <div className="p-3 bg-secondary/40 rounded-xl border border-secondary">
                  <p className="text-xs font-semibold text-foreground">
                    {isRenewal ? "Registrando renovación — pago recurrente" : "Plan recurrente — se registra el pago inicial"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {isRenewal
                      ? (p.recurring_price != null && <>{fmtSaleAmt(calcCoursePlanPrice(p, true), p.recurring_currency ?? p.currency)} / {recLabel}</>)
                      : <>{fmtSaleAmt(calcCoursePlanPrice(p, false), p.currency)} ahora
                          {p.recurring_price != null && <> · luego {fmtSaleAmt(calcCoursePlanPrice(p, true), p.recurring_currency ?? p.currency)} / {recLabel} (los cobros recurrentes se registran aparte)</>}
                        </>}
                  </p>
                </div>
              );
            })()}

            {/* Aviso de recurrencia — plan de producto digital */}
            {saleItemType === "product" && selectedProductObj?.product_kind === "archivo" && (() => {
              const p = productPlans.find(x => x.id === selectedProductPlan);
              if (!p?.is_recurring) return null;
              const recLabel = p.recurring_label ? p.recurring_label.replace(/^[/\s]+/, "") : (p.recurring_interval ?? "mes");
              const recPrice = planFinalRecurringPrice(p);
              return (
                <div className="p-3 bg-secondary/40 rounded-xl border border-secondary">
                  <p className="text-xs font-semibold text-foreground">
                    {isRenewal ? "Registrando renovación — pago recurrente" : "Plan recurrente — se registra el pago inicial"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {isRenewal
                      ? (recPrice != null && <>{fmtSaleAmt(recPrice, p.recurring_currency ?? p.currency)} / {recLabel}</>)
                      : <>{fmtSaleAmt(planFinalPrice(p), p.currency)} ahora
                          {recPrice != null && <> · luego {fmtSaleAmt(recPrice, p.recurring_currency ?? p.currency)} / {recLabel} (los cobros recurrentes se registran aparte)</>}
                        </>}
                  </p>
                </div>
              );
            })()}

            {/* Monto + Notas */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {saleCurrency ? `Monto ${getCurrencyFlag(saleCurrency)} ${saleCurrency}` : "Monto"}
                </label>
                <input type="number" value={saleAmount} onChange={(e) => setSaleAmount(e.target.value === "" ? "" : Number(e.target.value))} min={0} placeholder="0.00" className={INPUT_CLS} />
                {isRecurringSelection && (
                  <label className="flex items-start gap-2 text-[11px] text-muted-foreground cursor-pointer p-2.5 bg-secondary/30 rounded-xl border border-secondary">
                    <input type="checkbox" checked={persistRenewalAmount} onChange={(e) => setPersistRenewalAmount(e.target.checked)} className="mt-0.5 h-3.5 w-3.5 accent-primary shrink-0" />
                    <span>Usar este monto también para las próximas renovaciones de este cliente (si no, solo aplica a este registro).</span>
                  </label>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notas <span className="font-normal normal-case">(opcional)</span></label>
                <input type="text" value={saleNotes} onChange={(e) => setSaleNotes(e.target.value)} placeholder="Método de pago, detalles..." className={INPUT_CLS} />
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleRegisterSale}
              disabled={!isFormValid || createSale.isPending}
              className="w-full h-12 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
              style={{ background: isFormValid ? "linear-gradient(135deg, #1877F2, #0f5cc8)" : undefined }}
            >
              {createSale.isPending ? <Loader2 size={15} className="animate-spin" /> : <><Plus size={15} /> Registrar Venta</>}
            </button>
          </div>
        </div>
      )}
    </>
  );

  const renderHistorial = () => (
    <div className="bg-card border rounded-2xl overflow-hidden">
      {/* Header + filters */}
      <div className="px-5 py-4 border-b space-y-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Filter size={13} className="text-primary" />
          </div>
          <h2 className="text-sm font-semibold flex-1">Historial de Ventas</h2>
          {hasFilters && (
            <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {filteredSales.length} resultado{filteredSales.length !== 1 ? "s" : ""}
            </span>
          )}
          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <X size={11} /> Limpiar
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Desde</label>
            <input type="date" className={F_INPUT} value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Hasta</label>
            <input type="date" className={F_INPUT} value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Producto</label>
            <div className="relative">
              <select className={F_SELECT} value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)}>
                <option value="">Todos</option>
                {productOptions.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <Chevron />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Cliente</label>
            <div className="relative">
              <input
                type="text"
                value={filterContact}
                onChange={(e) => setFilterContact(e.target.value)}
                placeholder="Buscar por nombre..."
                className={`${F_INPUT} ${filterContact ? "pr-7" : ""}`}
              />
              {filterContact && (
                <button type="button" onClick={() => setFilterContact("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Moneda</label>
            <div className="relative">
              <select className={F_SELECT} value={filterCurrency} onChange={(e) => setFilterCurrency(e.target.value)}>
                <option value="">Todas</option>
                {historyCurrencyOptions.map(c => <option key={c} value={c}>{getCurrencyFlag(c)} {c} — {formatAmount(1, c, 0).replace("1", "").trim()}</option>)}
              </select>
              <Chevron />
            </div>
          </div>
        </div>

        {/* Cantidad y monto de ventas según los filtros activos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-secondary/30 border rounded-xl p-3">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <CheckCircle2 size={13} className="text-primary" />
            </div>
            <p className="text-lg font-bold text-foreground leading-tight">{filteredConfirmedSales.length}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Ventas</p>
          </div>
          {(filteredTotalsPorMoneda.length > 0 ? filteredTotalsPorMoneda : ([["USD", 0]] as [string, number][])).map(([cur, total]) => (
            <div key={`hist-total-${cur}`} className="bg-secondary/30 border rounded-xl p-3">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <DollarSign size={13} className="text-primary" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm leading-none">{getCurrencyFlag(cur)}</span>
                <p className="text-lg font-bold text-foreground leading-tight">{fmtSaleAmt(total, cur, 0)}</p>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Total {cur}</p>
            </div>
          ))}
        </div>
      </div>

      {hasFilters && filteredSales.length === 0 && !loadingSales && (
        <div className="px-5 py-4 text-center">
          <button onClick={clearFilters} className="text-xs text-primary hover:underline">Sin resultados — limpiar filtros</button>
        </div>
      )}

      <SalesTable
        rows={filteredSales}
        isLoading={loadingSales}
        canEdit={canEditSale}
        canDelete={canDeleteSale}
        emptyText="No hay ventas registradas."
        totalCount={allSales.length}
        filteredTotal={filteredTotal}
        hasFilters={hasFilters}
        onEdit={openEditSale}
        onDelete={openDeleteSale}
      />
    </div>
  );

  return (
    <>
      {/* ─── Edit / Delete Sale Modal ─── */}
      <Dialog open={!!saleModal} onOpenChange={(o) => { if (!o) closeSaleModal(); }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader><DialogTitle>{saleModal?.mode === "edit" ? "Editar transacción" : "Eliminar transacción"}</DialogTitle></DialogHeader>
          {saleModal && (
            <div className="space-y-4 py-1">
              <div className="bg-secondary/40 rounded-xl px-4 py-3 space-y-1 text-sm">
                <p className="font-medium">{saleModal.sale.contact_name ?? "—"}</p>
                <p className="text-muted-foreground text-xs">{saleModal.sale.product_name ?? saleModal.sale.service_name ?? "—"}</p>
                <p className="text-primary font-semibold">{fmtSaleAmt(saleModal.sale.amount, saleModal.sale.currency)}</p>
              </div>
              {saleModal.mode === "edit" && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nuevo monto</label>
                    <input type="number" min={0} step={0.01} value={editAmount} onChange={(e) => setEditAmount(e.target.value === "" ? "" : Number(e.target.value))} className={INPUT_CLS} />
                  </div>
                  {(saleModal.sale.type === "recurring" || saleModal.sale.next_renewal_date != null || saleModal.sale.recurrence_start_date != null) && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Inicio recurrencia</label>
                        <input type="date" value={editRecurrenceStart} onChange={(e) => setEditRecurrenceStart(e.target.value)} className={INPUT_CLS} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Próxima renovación</label>
                        <input type="date" value={editNextRenewal} onChange={(e) => setEditNextRenewal(e.target.value)} className={INPUT_CLS} />
                      </div>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notas</label>
                    <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} className="text-sm resize-none rounded-xl" placeholder="Observaciones..." />
                  </div>
                </>
              )}
              {saleModal.mode === "delete" && <p className="text-sm text-muted-foreground">Esta acción eliminará la transacción permanentemente.</p>}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Justificación <span className="text-destructive">*</span></label>
                <Textarea value={justification} onChange={(e) => setJustification(e.target.value)} rows={2} className="text-sm resize-none rounded-xl" placeholder="Motivo de este cambio..." autoFocus />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={closeSaleModal}>Cancelar</Button>
            {saleModal?.mode === "edit" ? (
              <Button onClick={handleConfirmEditSale} disabled={!justification.trim() || editAmount === "" || updateSale.isPending}>
                {updateSale.isPending && <Loader2 size={14} className="animate-spin mr-1.5" />} Guardar
              </Button>
            ) : (
              <Button variant="destructive" onClick={handleConfirmDeleteSale} disabled={!justification.trim() || deleteSale.isPending}>
                {deleteSale.isPending && <Loader2 size={14} className="animate-spin mr-1.5" />} Eliminar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{SECTION_META[section].title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{SECTION_META[section].subtitle}</p>
        </div>

        {section === "reporte" && renderReporte()}
        {section === "registrar" && renderRegistrar()}
        {section === "historial" && renderHistorial()}
        {section === "renovaciones" && renderRenovaciones()}
      </div>
    </>
  );
};

export default CrmVentas;
