import { CalendarDays, Users, Clock, CheckCircle, DollarSign, GripVertical, Settings2, Plus, Loader2, Pencil, Trash2, TrendingUp, RefreshCcw } from "lucide-react";
import OnboardingWizard from "@/components/crm/OnboardingWizard";
import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useContacts, useAppointments, useServices, useProducts, useProductVariants, useCourses, useSales, useCreateSale, useUpdateSale, useDeleteSale, useClientAccounts, useBusinessProfile, useUpsertBusinessProfile } from "@/hooks/useCrmData";
import type { CrmSale } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import { useCurrentUser, useStaffPermissions } from "@/hooks/useAuth";
import { toast } from "sonner";
import SalesTable from "@/components/crm/SalesTable";
import { formatAmount, getCurrencyFlag, getCurrencyFromPhone } from "@/lib/currencies";
import { usePricesByEntity } from "@/hooks/useCrmData";

const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const fmtSaleAmt = formatAmount;

function getAvatarColor(str: string) {
  const colors = ["#1877F2","#0a57d0","#00a884","#9B59B6","#E67E22","#E91E63","#3498DB","#2ECC71"];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

const initialMetrics = [
  { id: "ventas-mes",    icon: CheckCircle,  label: "Ventas este mes", isAdmin: true },
  { id: "total-vendido", icon: DollarSign,   label: "Total Vendido",   isAdmin: true },
  { id: "citas-hoy",       icon: CalendarDays, label: "Citas hoy",       isAdmin: false },
  { id: "total-contactos", icon: Users,        label: "Total contactos", isAdmin: false },
  { id: "proxima-cita",    icon: Clock,        label: "Próxima cita",    isAdmin: false },
  { id: "conversion",      icon: TrendingUp,   label: "% Conversión",    isAdmin: false },
];

const METRIC_COLORS: Record<string, { icon: string; bg: string }> = {
  "citas-hoy":       { icon: "text-muted-foreground", bg: "bg-secondary" },
  "total-contactos": { icon: "text-muted-foreground", bg: "bg-secondary" },
  "proxima-cita":    { icon: "text-muted-foreground", bg: "bg-secondary" },
  "conversion":      { icon: "text-primary",          bg: "bg-primary/10" },
  "ventas-mes":      { icon: "text-primary",          bg: "bg-primary/10" },
  "total-vendido":   { icon: "text-primary",          bg: "bg-primary/10" },
};

const INTERVAL_LABELS: Record<string, string> = {
  monthly:    "Mensual",
  annual:     "Anual",
  quarterly:  "Trimestral",
  semiannual: "Semestral",
};

type View = "overview" | "business" | "calendar" | "forms" | "contacts" | "pipeline"
  | "ventas" | "reminders" | "settings" | "soporte" | "videos" | "vendor_links"
  | "vendors" | "agente_ia";

const selectCls = "w-full h-12 px-3.5 rounded-xl border border-border bg-card text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all appearance-none cursor-pointer";
const inputCls  = "w-full h-12 px-4 rounded-xl border border-border bg-card text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all placeholder:text-muted-foreground/50";

const CrmOverview = ({ isSuperAdmin = false, isVendor = false, onNavigate }: {
  isSuperAdmin?: boolean; isVendor?: boolean; onNavigate?: (view: View, tab?: string) => void;
}) => {
  const { user } = useCurrentUser();
  const { data: contacts = [] } = useContacts();
  const { data: appointments = [] } = useAppointments();
  const { data: services = [] } = useServices();
  const { data: salesData = [], isLoading: loadingSales } = useSales();
  const { data: clientAccounts = [] } = useClientAccounts();
  const createSale = useCreateSale();
  const updateSale = useUpdateSale();
  const deleteSale = useDeleteSale();

  const accountByContact = Object.fromEntries(clientAccounts.map(a => [a.contact_id, a]));

  const [saleModal, setSaleModal] = useState<
    | { mode: "edit"; sale: CrmSale }
    | { mode: "delete"; sale: CrmSale }
    | null
  >(null);
  const [justification, setJustification] = useState("");
  const [editAmount, setEditAmount] = useState<number | "">("");
  const [editNotes, setEditNotes] = useState("");

  const openEditSale = (sale: CrmSale) => {
    setSaleModal({ mode: "edit", sale });
    setEditAmount(sale.amount);
    setEditNotes(sale.notes ?? "");
    setJustification("");
  };
  const openDeleteSale = (sale: CrmSale) => {
    setSaleModal({ mode: "delete", sale });
    setJustification("");
  };
  const closeSaleModal = () => { setSaleModal(null); setJustification(""); };

  const handleConfirmEditSale = async () => {
    if (!saleModal || saleModal.mode !== "edit") return;
    if (!justification.trim()) { toast.error("La justificación es obligatoria"); return; }
    try {
      await updateSale.mutateAsync({
        id: saleModal.sale.id,
        amount: Number(editAmount),
        notes: editNotes || null,
        justification: justification.trim(),
      });
      toast.success("Venta actualizada");
      closeSaleModal();
    } catch { toast.error("Error al actualizar la venta"); }
  };

  const handleConfirmDeleteSale = async () => {
    if (!saleModal || saleModal.mode !== "delete") return;
    if (!justification.trim()) { toast.error("La justificación es obligatoria"); return; }
    try {
      await deleteSale.mutateAsync({
        id: saleModal.sale.id,
        contactName: saleModal.sale.contact_name ?? "—",
        serviceName: saleModal.sale.service_name ?? "—",
        amount: saleModal.sale.amount,
        justification: justification.trim(),
      });
      toast.success("Venta eliminada");
      closeSaleModal();
    } catch { toast.error("Error al eliminar la venta"); }
  };

  const { can } = useStaffPermissions();
  const canCreateSale = can("ventas", "create");
  const canEditSale   = can("ventas", "edit");
  const canDeleteSale = can("ventas", "delete");

  const { data: businessProfile } = useBusinessProfile();
  const upsertProfile = useUpsertBusinessProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const orderInitialized = useRef(false);

  useEffect(() => {
    if (!businessProfile || orderInitialized.current) return;
    orderInitialized.current = true;
    const saved = Array.isArray(businessProfile.metrics_order) ? businessProfile.metrics_order as string[] : [];
    if (saved.length > 0) {
      setMetrics(prev => {
        const ordered = saved
          .map(id => prev.find(m => m.id === id))
          .filter(Boolean) as typeof initialMetrics;
        const rest = prev.filter(m => !saved.includes(m.id as string));
        return [...ordered, ...rest];
      });
    }
  }, [businessProfile]);

  const { data: products = [] } = useProducts();
  const activeProducts = useMemo(() => products.filter(p => p.is_active), [products]);
  const { data: courses = [] } = useCourses();

  const [selectedContact, setSelectedContact] = useState("");
  const [saleItemType, setSaleItemType]       = useState<"service" | "product" | "course">("service");
  const [selectedService, setSelectedService] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedVariant, setSelectedVariant] = useState("");
  const [selectedCourse, setSelectedCourse]   = useState("");
  const [saleNotes, setSaleNotes]             = useState("");
  const [saleAmount, setSaleAmount]           = useState<number | "">("");
  const [saleCurrency, setSaleCurrency]       = useState<string>("USD");
  const [saleType, setSaleType]               = useState<"initial" | "recurring">("initial");

  const { data: productVariants = [] } = useProductVariants(
    saleItemType === "product" && selectedProduct ? selectedProduct : null
  );
  const selectedProductObj = useMemo(() => activeProducts.find(p => p.id === selectedProduct), [activeProducts, selectedProduct]);

  // Multi-currency auto-select
  const { data: servicePrices = [] } = usePricesByEntity("service", selectedService || null);
  const { data: productPrices = [] } = usePricesByEntity("product", selectedProduct || null);
  const { data: coursePrices = [] }  = usePricesByEntity("course",  selectedCourse  || null);

  // Solo mostrar tipos que el usuario tiene registrados
  const availableTypes = useMemo(() => [
    ...(services.length > 0       ? ["service"] as const : []),
    ...(activeProducts.length > 0 ? ["product"] as const : []),
    ...(courses.length > 0        ? ["course"]  as const : []),
  ], [services.length, activeProducts.length, courses.length]);

  // Auto-seleccionar primer tipo disponible si el actual no tiene datos
  useEffect(() => {
    if (availableTypes.length > 0 && !availableTypes.includes(saleItemType)) {
      setSaleItemType(availableTypes[0]);
    }
  }, [availableTypes]);

  // Aplicar precio por moneda cuando los precios llegan del servidor (los hooks son async y los handlers usan datos stale)
  useEffect(() => {
    if (saleItemType !== "service" || !selectedService || !servicePrices.length) return;
    const cur = getContactCurrency(selectedContact);
    if (!cur) return;
    const match = servicePrices.find(p => p.currency.toUpperCase() === cur.toUpperCase());
    if (match) { setSaleAmount(match.price); setSaleCurrency(match.currency); }
  }, [servicePrices]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (saleItemType !== "product" || !selectedProduct || !selectedProductObj || selectedProductObj.has_variants || !productPrices.length) return;
    const cur = getContactCurrency(selectedContact);
    if (!cur) return;
    const match = productPrices.find(p => p.currency.toUpperCase() === cur.toUpperCase());
    if (match) { setSaleAmount(match.price); setSaleCurrency(match.currency); }
  }, [productPrices]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (saleItemType !== "course" || !selectedCourse || !coursePrices.length) return;
    const cur = getContactCurrency(selectedContact);
    if (!cur) return;
    const match = coursePrices.find(p => p.currency.toUpperCase() === cur.toUpperCase());
    if (match) { setSaleAmount(match.price); setSaleCurrency(match.currency); }
  }, [coursePrices]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (cur === defaultCurrency.toUpperCase()) return defaultPrice;
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

  const todayKey = useMemo(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  }, []);

  const todayAppointments = useMemo(
    () => appointments.filter(a => a.date === todayKey && a.status === "confirmed"),
    [appointments, todayKey]
  );

  const nextAppointment = useMemo(() => {
    const now = new Date();
    const upcoming = appointments
      .filter(a => a.status === "confirmed")
      .filter(a => {
        const d = new Date(a.date);
        d.setHours(a.hour, a.minute ?? 0, 0, 0);
        return d >= now;
      })
      .sort((a, b) => {
        const da = new Date(a.date); da.setHours(a.hour, a.minute ?? 0, 0, 0);
        const db = new Date(b.date); db.setHours(b.hour, b.minute ?? 0, 0, 0);
        return da.getTime() - db.getTime();
      });
    return upcoming[0] ?? null;
  }, [appointments]);

  const confirmedSales = useMemo(
    () => salesData.filter(s => s.status !== "pending_review" && s.status !== "rejected"),
    [salesData]
  );

  const totalPorMoneda = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of confirmedSales) { const c = s.currency ?? "USD"; map.set(c, (map.get(c) ?? 0) + s.amount); }
    return [...map.entries()];
  }, [confirmedSales]);

  const salesThisMonth = useMemo(() => {
    const now = new Date();
    return confirmedSales.filter(s => {
      const d = new Date(s.created_at);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
  }, [confirmedSales]);

  const recurringByInterval = useMemo(() => {
    const serviceInfo: Record<string, { interval: string; recPrice: number; currency: string }> = {};
    for (const s of services) {
      if (s.is_recurring && s.recurring_interval) {
        serviceInfo[s.id] = { interval: s.recurring_interval, recPrice: s.recurring_price ?? s.price, currency: s.currency ?? "USD" };
      }
    }
    const seen = new Set<string>();
    const totals: Record<string, Record<string, number>> = {};
    for (const sale of confirmedSales) {
      if (!sale.service_id || !sale.contact_id) continue;
      const info = serviceInfo[sale.service_id];
      if (!info) continue;
      const key = `${sale.contact_id}|${sale.service_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!totals[info.interval]) totals[info.interval] = {};
      totals[info.interval][info.currency] = (totals[info.interval][info.currency] ?? 0) + info.recPrice;
    }
    return Object.entries(totals).map(([interval, byCurObj]) => ({
      interval,
      byCurrency: Object.entries(byCurObj) as [string, number][],
    }));
  }, [services, confirmedSales]);

  const conversionRate = useMemo(() => {
    if (contacts.length === 0) return null;
    const contactsWithSale = new Set(confirmedSales.map(s => s.contact_id).filter(Boolean));
    return Math.round((contactsWithSale.size / contacts.length) * 100);
  }, [contacts, confirmedSales]);

  const newContactsThisWeek = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    return contacts.filter(c => new Date(c.created_at) >= cutoff);
  }, [contacts]);

  const getMetricValue = (id: string) => {
    switch (id) {
      case "citas-hoy": return String(todayAppointments.length);
      case "total-contactos": return String(contacts.length);
      case "proxima-cita": {
        if (!nextAppointment) return "—";
        const [, mo, dy] = nextAppointment.date.split("-").map(Number);
        const hh = String(nextAppointment.hour).padStart(2, "0");
        const mm = String(nextAppointment.minute ?? 0).padStart(2, "0");
        return `${dy} ${MONTHS_ES[mo - 1].slice(0,3)} ${hh}:${mm}`;
      }
      case "total-vendido":
        if (totalPorMoneda.length === 0) return fmtSaleAmt(0, "USD", 0);
        return totalPorMoneda.map(([c, t]) => fmtSaleAmt(t, c, 0)).join(" · ");
      case "conversion": return conversionRate !== null ? `${conversionRate}%` : "—";
      case "ventas-mes": return String(salesThisMonth);
      default: return "—";
    }
  };

  const getMetricContent = (id: string) => {
    if (id === "total-vendido") {
      if (totalPorMoneda.length === 0) return <p className="text-2xl font-bold text-foreground leading-tight">$0</p>;
      return (
        <div>
          {totalPorMoneda.map(([cur, total]) => (
            <div key={cur} className="flex items-baseline gap-1.5">
              <span className="text-base leading-none">{getCurrencyFlag(cur)}</span>
              <p className="text-2xl font-bold text-foreground leading-tight">{fmtSaleAmt(total, cur, 0)}</p>
            </div>
          ))}
        </div>
      );
    }
    return <p className="text-2xl font-bold text-foreground leading-tight">{getMetricValue(id)}</p>;
  };

  const calcDiscounted = (price: number, discountPct: number) =>
    discountPct > 0 ? Math.round(price * (1 - discountPct / 100) * 100) / 100 : price;

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sId = e.target.value;
    setSelectedService(sId);
    setSaleType("initial");
    const s = services.find(x => x.id === sId);
    if (!s) { setSaleAmount(""); return; }
    setSaleAmount(calcDiscounted(s.price, s.discount_pct));
    setSaleCurrency(s.currency ?? "USD"); // moneda base inmediata; useEffect aplica override cuando precios cargan
  };

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = e.target.value; setSelectedProduct(pId); setSelectedVariant(""); setSaleAmount("");
    const p = activeProducts.find(x => x.id === pId);
    if (!p) return;
    setSaleCurrency(p.currency ?? "USD");
    if (!p.has_variants) {
      setSaleAmount(calcProductPrice(p));
    }
  };

  const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cId = e.target.value; setSelectedCourse(cId); setSaleAmount("");
    const c = courses.find(x => x.id === cId);
    if (!c || c.price == null) return;
    setSaleAmount(c.price);
    setSaleCurrency(c.currency ?? "USD"); // moneda base inmediata; useEffect aplica override cuando precios cargan
  };

  const handleContactChange = (contactId: string) => {
    setSelectedContact(contactId);
    if (saleItemType === "service" && selectedService) {
      const s = services.find(x => x.id === selectedService);
      if (s) {
        const cur = contactId ? getContactCurrency(contactId) : null;
        const match = cur ? servicePrices.find(p => p.currency.toUpperCase() === cur.toUpperCase()) : null;
        if (match) { setSaleAmount(match.price); setSaleCurrency(match.currency); }
        else { setSaleAmount(getPriceForCurrency(servicePrices, calcDiscounted(s.price, s.discount_pct), s.currency, cur)); setSaleCurrency(s.currency ?? "USD"); }
      }
    } else if (saleItemType === "product" && selectedProduct && selectedProductObj && !selectedProductObj.has_variants) {
      const cur = contactId ? getContactCurrency(contactId) : null;
      const match = cur ? productPrices.find(p => p.currency.toUpperCase() === cur.toUpperCase()) : null;
      if (match) { setSaleAmount(match.price); setSaleCurrency(match.currency); }
      else { setSaleAmount(getPriceForCurrency(productPrices, calcProductPrice(selectedProductObj), selectedProductObj.currency, cur)); setSaleCurrency(selectedProductObj.currency ?? "USD"); }
    } else if (saleItemType === "course" && selectedCourse) {
      const c = courses.find(x => x.id === selectedCourse);
      if (c && c.price != null) {
        const cur = contactId ? getContactCurrency(contactId) : null;
        const match = cur ? coursePrices.find(p => p.currency.toUpperCase() === cur.toUpperCase()) : null;
        if (match) { setSaleAmount(match.price); setSaleCurrency(match.currency); }
        else { setSaleAmount(getPriceForCurrency(coursePrices, c.price, c.currency ?? "USD", cur)); setSaleCurrency(c.currency ?? "USD"); }
      }
    }
  };

  const handleVariantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const vId = e.target.value; setSelectedVariant(vId);
    if (!vId || !selectedProductObj) { setSaleAmount(""); return; }
    const v = productVariants.find(x => x.id === vId);
    if (v) setSaleAmount(calcProductPrice(selectedProductObj, v));
  };

  const resetSaleForm = () => {
    setSelectedContact(""); setSelectedService(""); setSelectedProduct("");
    setSelectedVariant(""); setSelectedCourse("");
    setSaleNotes(""); setSaleAmount(""); setSaleCurrency("USD"); setSaleType("initial");
  };

  const handleRegisterSale = async () => {
    const contact = contacts.find(c => c.id === selectedContact);
    if (!contact || saleAmount === "" || isNaN(Number(saleAmount))) return;

    if (saleItemType === "service") {
      const service = services.find(s => s.id === selectedService);
      if (!service) return;
      let finalNotes = saleNotes;
      if (service.is_recurring) {
        const typeLabel = saleType === "initial" ? "Pago Inicial" : "Pago Recurrente";
        finalNotes = finalNotes ? `[${typeLabel}] ${finalNotes}` : `[${typeLabel}]`;
      }
      try {
        await createSale.mutateAsync({
          contact_id: contact.id, contact_name: contact.name,
          service_id: service.id, service_name: service.name,
          amount: Number(saleAmount), currency: saleCurrency,
          type: saleType, notes: finalNotes || null,
        });
        const existingAccount = accountByContact[contact.id];
        if ((service as any).is_saas && !existingAccount && user) {
          try {
            const { error } = await supabase.functions.invoke("create-saas-client", { body: { contact_id: contact.id, admin_user_id: user.id } });
            if (error) throw error;
            toast.success(`Venta registrada · Email de invitación enviado a ${contact.email ?? contact.name}`);
          } catch {
            toast.success("Venta registrada");
            toast.error("No se pudo crear la cuenta SaaS del cliente. Inténtalo manualmente.");
          }
        } else { toast.success("Venta registrada"); }
        resetSaleForm();
      } catch { toast.error("Error al registrar la venta"); }
    } else if (saleItemType === "product") {
      const product = activeProducts.find(p => p.id === selectedProduct);
      if (!product) return;
      const selectedVariantObj = selectedVariant ? productVariants.find(v => v.id === selectedVariant) : undefined;
      const variantName = selectedVariantObj ? ` (${selectedVariantObj.name})` : "";
      try {
        await createSale.mutateAsync({
          contact_id: contact.id, contact_name: contact.name,
          product_id: product.id, product_name: product.name + variantName,
          ...(selectedVariant ? { product_variant_id: selectedVariant } : {}),
          amount: Number(saleAmount), currency: saleCurrency,
          type: "initial", notes: saleNotes || null,
        } as any);
        toast.success("Venta registrada");
        resetSaleForm();
      } catch { toast.error("Error al registrar la venta"); }
    } else {
      const course = courses.find(c => c.id === selectedCourse);
      if (!course) return;
      try {
        await createSale.mutateAsync({
          contact_id: contact.id, contact_name: contact.name,
          course_id: course.id, course_name: course.title,
          amount: Number(saleAmount), currency: saleCurrency,
          type: "initial", notes: saleNotes || null,
        } as any);
        toast.success("Venta registrada");
        resetSaleForm();
      } catch { toast.error("Error al registrar la venta"); }
    }
  };

  const salesRows = useMemo(() => confirmedSales.map(s => ({
    id: s.id,
    raw: s,
    dateStr: new Date(s.created_at).toLocaleDateString("es-ES"),
    contactName: s.contact_name ?? contacts.find(c => c.id === s.contact_id)?.name ?? "Contacto eliminado",
    serviceName: s.course_name ?? s.service_name ?? s.product_name ?? "Sin nombre",
    notes: s.notes ?? "",
  })), [confirmedSales, contacts]);

  const visibleMetrics = metrics.filter(m => isSuperAdmin || !m.isAdmin);

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    const items = [...metrics];
    const sourceIndex = items.findIndex((m) => m.id === draggedId);
    const targetIndex = items.findIndex((m) => m.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const [draggedItem] = items.splice(sourceIndex, 1);
    items.splice(targetIndex, 0, draggedItem);
    setMetrics(items);
    setDraggedId(null);
    upsertProfile.mutate({ metrics_order: items.map(m => m.id) });
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const dateLabel = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });

  const isFormValid = selectedContact && (
    saleItemType === "service" ? !!selectedService :
    saleItemType === "product" ? !!selectedProduct && (!selectedProductObj?.has_variants || !productVariants.length || !!selectedVariant) :
    !!selectedCourse
  ) && saleAmount !== "";

  return (
    <>
    {/* ─── Edit / Delete Sale Modal ─── */}
    <Dialog open={!!saleModal} onOpenChange={(o) => { if (!o) closeSaleModal(); }}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>
            {saleModal?.mode === "edit" ? "Editar transacción" : "Eliminar transacción"}
          </DialogTitle>
        </DialogHeader>
        {saleModal && (
          <div className="space-y-4 py-1">
            <div className="bg-secondary/40 rounded-xl px-4 py-3 space-y-1 text-sm">
              <p className="font-medium">{saleModal.sale.contact_name ?? "—"}</p>
              <p className="text-muted-foreground text-xs">{saleModal.sale.service_name ?? "—"}</p>
              <p className="text-primary font-semibold">{fmtSaleAmt(saleModal.sale.amount, saleModal.sale.currency)}</p>
            </div>
            {saleModal.mode === "edit" && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nuevo monto</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    className={inputCls}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notas</label>
                  <Textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={2}
                    className="text-sm resize-none rounded-xl"
                    placeholder="Observaciones sobre esta venta..."
                  />
                </div>
              </>
            )}
            {saleModal.mode === "delete" && (
              <p className="text-sm text-muted-foreground">
                Esta acción eliminará la transacción permanentemente. Quedará registrada en el log de actividad.
              </p>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Justificación <span className="text-destructive">*</span>
              </label>
              <Textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={2}
                className="text-sm resize-none rounded-xl"
                placeholder="Motivo de este cambio (obligatorio)..."
                autoFocus
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={closeSaleModal}>Cancelar</Button>
          {saleModal?.mode === "edit" ? (
            <Button
              onClick={handleConfirmEditSale}
              disabled={!justification.trim() || editAmount === "" || updateSale.isPending}
            >
              {updateSale.isPending && <Loader2 size={14} className="animate-spin mr-1.5" />}
              Guardar cambios
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={handleConfirmDeleteSale}
              disabled={!justification.trim() || deleteSale.isPending}
            >
              {deleteSale.isPending && <Loader2 size={14} className="animate-spin mr-1.5" />}
              Eliminar transacción
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{greeting}</h1>
          <p className="text-sm text-muted-foreground mt-0.5 capitalize">{dateLabel}</p>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`shrink-0 h-9 px-3.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            isEditing
              ? "bg-primary text-white shadow-sm"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
          }`}
        >
          <Settings2 size={13} className={isEditing ? "animate-spin-slow" : ""} />
          <span className="hidden sm:inline">{isEditing ? "Terminar" : "Personalizar"}</span>
        </button>
      </div>

      {/* ── Onboarding ── */}
      {!isVendor && onNavigate && (
        <OnboardingWizard onNavigate={onNavigate} />
      )}

      {/* ── Metrics Grid ── */}
      <div className={isEditing ? "p-3 border-2 border-dashed border-primary/25 rounded-3xl bg-primary/[0.03]" : ""}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {visibleMetrics.flatMap((m) => {
            const colors = METRIC_COLORS[m.id] ?? { icon: "text-muted-foreground", bg: "bg-secondary" };
            const cardCls = `bg-card border rounded-2xl p-4 relative transition-all ${
              isEditing ? "cursor-grab active:cursor-grabbing hover:border-primary/40 shadow-sm" : ""
            } ${draggedId === m.id ? "opacity-40 scale-95" : ""}`;
            const dragProps = {
              draggable: isEditing,
              onDragStart: () => setDraggedId(m.id),
              onDragOver: handleDragOver,
              onDrop: () => handleDrop(m.id),
              onDragEnd: () => setDraggedId(null),
            };

            if (m.id === "total-vendido") {
              const entries: [string, number][] = totalPorMoneda.length > 0 ? totalPorMoneda : [["USD", 0]];
              return entries.map(([cur, total], idx) => (
                <div key={`total-vendido-${cur}`} className={cardCls} {...dragProps}>
                  {isEditing && idx === 0 && (
                    <div className="absolute top-3 right-3 text-muted-foreground/30">
                      <GripVertical size={14} />
                    </div>
                  )}
                  <div className={`w-8 h-8 rounded-xl ${colors.bg} flex items-center justify-center mb-3`}>
                    <m.icon size={15} className={colors.icon} />
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-base leading-none">{getCurrencyFlag(cur)}</span>
                    <p className="text-2xl font-bold text-foreground leading-tight">{fmtSaleAmt(total, cur, 0)}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-tight">Total {cur}</p>
                </div>
              ));
            }

            return [(
              <div key={m.id} className={cardCls} {...dragProps}>
                {isEditing && (
                  <div className="absolute top-3 right-3 text-muted-foreground/30">
                    <GripVertical size={14} />
                  </div>
                )}
                <div className={`w-8 h-8 rounded-xl ${colors.bg} flex items-center justify-center mb-3`}>
                  <m.icon size={15} className={colors.icon} />
                </div>
                {getMetricContent(m.id)}
                <p className="text-xs text-muted-foreground mt-1 leading-tight">{m.label}</p>
              </div>
            )];
          })}

          {/* Ingreso Recurrente Estimado */}
          {isSuperAdmin && recurringByInterval.map(({ interval, byCurrency }) => (
            <div key={`ire-${interval}`} className="bg-card border rounded-2xl p-4 relative">
              <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center mb-3">
                <RefreshCcw size={15} className="text-muted-foreground" />
              </div>
              {byCurrency.length === 0
                ? <p className="text-2xl font-bold text-foreground leading-tight">$0</p>
                : byCurrency.map(([cur, total]) => (
                    <div key={cur} className="flex items-baseline gap-1.5">
                      <span className="text-base leading-none">{getCurrencyFlag(cur)}</span>
                      <p className="text-2xl font-bold text-foreground leading-tight">{fmtSaleAmt(total, cur, 0)}</p>
                    </div>
                  ))
              }
              <p className="text-xs text-muted-foreground mt-1 leading-tight">
                IRE {INTERVAL_LABELS[interval] ?? interval}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Citas del día + Nuevos contactos ── */}
      <div className="grid md:grid-cols-2 gap-4">

        {/* Citas de hoy */}
        <div className="bg-card border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h2 className="text-sm font-semibold">Citas de hoy</h2>
            {todayAppointments.length > 0 && (
              <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {todayAppointments.length}
              </span>
            )}
          </div>
          {todayAppointments.length === 0 ? (
            <div className="px-5 py-10 flex flex-col items-center gap-2 text-center">
              <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center">
                <CalendarDays size={18} className="text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Sin citas para hoy</p>
              <p className="text-xs text-muted-foreground/60">Las citas confirmadas aparecerán aquí.</p>
            </div>
          ) : (
            <div className="divide-y">
              {todayAppointments.map((a) => {
                const contact = contacts.find(c => c.id === a.contact_id);
                return (
                  <div key={a.id} className="px-4 py-3.5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary leading-none">
                        {String(a.hour).padStart(2, "0")}
                      </span>
                      <span className="text-[9px] text-primary/60 leading-none mt-0.5">
                        :{String(a.minute ?? 0).padStart(2, "0")}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{contact?.name ?? "Sin contacto"}</p>
                      {a.service && <p className="text-xs text-muted-foreground truncate">{a.service}</p>}
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Nuevos contactos esta semana */}
        <div className="bg-card border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h2 className="text-sm font-semibold">Nuevos esta semana</h2>
            <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {newContactsThisWeek.length}
            </span>
          </div>
          {newContactsThisWeek.length === 0 ? (
            <div className="px-5 py-10 flex flex-col items-center gap-2 text-center">
              <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center">
                <Users size={18} className="text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Sin nuevos contactos</p>
              <p className="text-xs text-muted-foreground/60">Los contactos agregados esta semana aparecerán aquí.</p>
            </div>
          ) : (
            <div className="divide-y">
              {newContactsThisWeek.slice(0, 8).map((c) => (
                <div key={c.id} className="px-4 py-3 flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ backgroundColor: getAvatarColor(c.name) }}
                  >
                    {c.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    {c.email && <p className="text-xs text-muted-foreground truncate">{c.email}</p>}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(c.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Registrar Venta ── */}
      {canCreateSale && !isVendor && (
        <div className="bg-card border rounded-2xl p-5">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center">
              <Plus size={15} className="text-muted-foreground" />
            </div>
            <h2 className="text-sm font-semibold">Registrar Venta</h2>
          </div>

          <div className="space-y-3">
            {/* Row 1: Contacto */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contacto</label>
              <div className="relative">
                <select className={selectCls} value={selectedContact} onChange={(e) => handleContactChange(e.target.value)}>
                  <option value="">Seleccionar contacto...</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              </div>
            </div>

            {/* Row 2: Tipo + Servicio/Producto/Curso */}
            <div className="grid sm:grid-cols-2 gap-3">
              {availableTypes.length > 1 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tipo</label>
                  <div className="flex rounded-xl border border-border overflow-hidden h-12">
                    {availableTypes.map((t, i) => (
                      <button key={t} type="button"
                        onClick={() => {
                          setSaleItemType(t);
                          setSelectedService(""); setSelectedProduct(""); setSelectedVariant(""); setSelectedCourse("");
                          setSaleAmount(""); setSaleType("initial");
                        }}
                        className={`flex-1 text-sm font-semibold transition-colors ${i > 0 ? "border-l border-border" : ""} ${saleItemType === t ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        {t === "service" ? "Servicio" : t === "product" ? "Producto" : "Curso"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {saleItemType === "service" ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Servicio</label>
                  <div className="relative">
                    <select className={selectCls} value={selectedService} onChange={handleServiceChange}>
                      <option value="">Seleccionar...</option>
                      {services.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} — {fmtSaleAmt(s.discount_pct > 0 ? calcDiscounted(s.price, s.discount_pct) : s.price, s.currency)}{s.discount_pct > 0 ? ` (-${s.discount_pct}%)` : ""}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  </div>
                </div>
              ) : saleItemType === "product" ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Producto</label>
                  <div className="relative">
                    <select className={selectCls} value={selectedProduct} onChange={handleProductChange}>
                      <option value="">Seleccionar...</option>
                      {activeProducts.map(p => {
                        const disc = p.discount_pct ?? 0;
                        const displayPrice = disc > 0 ? +(p.price * (1 - disc / 100)).toFixed(2) : p.price;
                        return <option key={p.id} value={p.id}>{p.name} — {fmtSaleAmt(displayPrice, p.currency)}{disc > 0 ? ` (-${disc}%)` : ""}</option>;
                      })}
                    </select>
                    <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Curso</label>
                  <div className="relative">
                    <select className={selectCls} value={selectedCourse} onChange={handleCourseChange}>
                      <option value="">Seleccionar...</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.title}{c.price != null ? ` — ${fmtSaleAmt(c.price, c.currency)}` : ""}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Variante */}
            {saleItemType === "product" && selectedProductObj?.has_variants && productVariants.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Variante</label>
                <div className="relative">
                  <select className={selectCls} value={selectedVariant} onChange={handleVariantChange}>
                    <option value="">Seleccionar variante...</option>
                    {productVariants.map(v => {
                      const price = calcProductPrice(selectedProductObj, v);
                      const base = v.price_override != null ? v.price_override : selectedProductObj.price;
                      const hasDisc = price < base;
                      return <option key={v.id} value={v.id}>{v.name} — {fmtSaleAmt(price, selectedProductObj.currency)}{hasDisc ? ` (-${v.discount_pct ?? selectedProductObj.discount_pct ?? 0}%)` : ""}</option>;
                    })}
                  </select>
                  <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                </div>
              </div>
            )}

            {/* Descuentos badge */}
            {saleItemType === "service" && (() => {
              const s = services.find(x => x.id === selectedService);
              if (!s) return null;
              const hasDiscount    = s.discount_pct > 0;
              const hasRecDiscount = (s.recurring_discount_pct ?? 0) > 0;
              if (!hasDiscount && !hasRecDiscount) return null;
              return (
                <div className="flex flex-wrap gap-2">
                  {hasDiscount    && <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">✓ {s.discount_pct}% dto. en setup</span>}
                  {hasRecDiscount && <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">✓ {s.recurring_discount_pct}% dto. recurrente</span>}
                </div>
              );
            })()}

            {/* Tipo de cobro (servicio recurrente) */}
            {saleItemType === "service" && (() => {
              const s = services.find(x => x.id === selectedService);
              if (!s?.is_recurring) return null;
              const hasDiscount    = s.discount_pct > 0;
              const hasRecDiscount = (s.recurring_discount_pct ?? 0) > 0;
              const recBase  = s.recurring_price ?? s.price;
              const recLabel = s.recurring_label ? s.recurring_label.replace(/^[/\s]+/, "") : (s.recurring_interval ?? "mes");
              return (
                <div className="p-4 bg-secondary/40 rounded-xl border border-secondary space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tipo de cobro</p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <label className="flex items-center gap-2.5 text-sm cursor-pointer flex-1 p-3 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors">
                      <input type="radio" name="saleType" checked={saleType === "initial"} onChange={() => { setSaleType("initial"); setSaleAmount(calcDiscounted(s.price, s.discount_pct)); }} className="h-4 w-4 accent-primary" />
                      <div>
                        <p className="font-semibold leading-tight">Pago Inicial</p>
                        {hasDiscount
                          ? <p className="text-xs text-muted-foreground mt-0.5"><span className="line-through">{fmtSaleAmt(s.price, s.currency)}</span> <span className="text-emerald-600 font-medium">{fmtSaleAmt(calcDiscounted(s.price, s.discount_pct), s.currency)}</span></p>
                          : <p className="text-xs text-muted-foreground mt-0.5">{fmtSaleAmt(s.price, s.currency)}</p>}
                      </div>
                    </label>
                    <label className="flex items-center gap-2.5 text-sm cursor-pointer flex-1 p-3 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors">
                      <input type="radio" name="saleType" checked={saleType === "recurring"} onChange={() => { setSaleType("recurring"); setSaleAmount(calcDiscounted(recBase, s.recurring_discount_pct ?? 0)); }} className="h-4 w-4 accent-primary" />
                      <div>
                        <p className="font-semibold leading-tight">Pago Recurrente</p>
                        {s.recurring_price && (hasRecDiscount
                          ? <p className="text-xs text-muted-foreground mt-0.5"><span className="line-through">{fmtSaleAmt(s.recurring_price, s.currency)}</span> <span className="text-emerald-600 font-medium">{fmtSaleAmt(calcDiscounted(s.recurring_price, s.recurring_discount_pct ?? 0), s.currency)}</span> / {recLabel}</p>
                          : <p className="text-xs text-muted-foreground mt-0.5">{fmtSaleAmt(s.recurring_price, s.currency)} / {recLabel}</p>)}
                      </div>
                    </label>
                  </div>
                </div>
              );
            })()}

            {/* Monto + Notas */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {saleCurrency ? `Monto ${getCurrencyFlag(saleCurrency)} ${saleCurrency}` : "Monto"}
                </label>
                <input
                  type="number"
                  value={saleAmount}
                  onChange={(e) => setSaleAmount(e.target.value as any)}
                  min={0}
                  placeholder="0.00"
                  className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notas <span className="font-normal normal-case">(opcional)</span></label>
                <input
                  type="text"
                  value={saleNotes}
                  onChange={(e) => setSaleNotes(e.target.value)}
                  placeholder="Método de pago, detalles..."
                  className={inputCls}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleRegisterSale}
              disabled={!isFormValid || createSale.isPending}
              className="w-full h-12 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
              style={{ background: isFormValid ? "linear-gradient(135deg, #1877F2, #0f5cc8)" : undefined }}
            >
              {createSale.isPending
                ? <Loader2 size={15} className="animate-spin" />
                : <><Plus size={15} /> Registrar Venta</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Historial de Ventas ── */}
      {!isVendor && (
        <div className="bg-card border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign size={13} className="text-primary" />
            </div>
            <h2 className="text-sm font-semibold">Historial de Ventas</h2>
          </div>
          <SalesTable
            rows={salesRows}
            isLoading={loadingSales}
            canEdit={canEditSale}
            canDelete={canDeleteSale}
            emptyText="No hay ventas registradas."
            onEdit={openEditSale}
            onDelete={openDeleteSale}
          />
        </div>
      )}

    </div>
    </>
  );
};

export default CrmOverview;
