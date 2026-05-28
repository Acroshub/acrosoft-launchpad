import { useState, useMemo, useRef } from "react";
import {
  DollarSign, Plus, Loader2, RefreshCcw, X, Filter, Crown,
  CheckCircle2, ExternalLink, UserCheck, TrendingUp, Percent,
  Calendar, Upload, AlertTriangle, Bot, Check, XCircle, Pencil, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  useContacts, useServices, useProducts, useProductVariants, useSales, useCreateSale, useUpdateSale, useDeleteSale,
  useClientAccounts, useVendors, useMarkSalePaid, useMaintenancePayments, useUpsertMaintenancePayment,
} from "@/hooks/useCrmData";
import { useStaffPermissions, useCurrentUser } from "@/hooks/useAuth";
import type { CrmSale, CrmVendor } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import SalesTable from "@/components/crm/SalesTable";

// ─── Constants ────────────────────────────────────────────────────────────────
import { CURRENCIES, formatAmount, getCurrencyFlag, getCurrencyFromPhone } from "@/lib/currencies";
import { usePricesByEntity } from "@/hooks/useCrmData";

const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const fmtSaleAmt = (amount: number, currency?: string | null, decimals = 2) =>
  formatAmount(amount, currency, decimals);

function getAvatarColor(str: string) {
  const colors = ["#1877F2","#0a57d0","#00a884","#9B59B6","#E67E22","#E91E63","#3498DB","#2ECC71"];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
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

const INTERVAL_LABELS: Record<string, string> = {
  monthly: "Mensual", annual: "Anual", quarterly: "Trimestral", semiannual: "Semestral",
};

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

// ─── Vendor Sales View ────────────────────────────────────────────────────────

const VendorSalesView = ({ vendorProfile }: { vendorProfile: CrmVendor }) => {
  const { data: salesData = [], isLoading } = useSales();
  const { data: maint = [] }                = useMaintenancePayments();
  const commissionPct                       = vendorProfile.commission_pct;

  const totalVentas    = salesData.length;
  const initialSales   = salesData.filter(s => s.type === "initial");
  const recurringSales = salesData.filter(s => s.type === "recurring");

  const firstRecurringSaleIds = useMemo(() => {
    const firstByKey: Record<string, string> = {};
    const sorted = [...salesData].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    for (const sale of sorted) {
      if (sale.type !== "recurring" || !sale.contact_id || !sale.service_id) continue;
      const key = `${sale.contact_id}|${sale.service_id}`;
      if (!firstByKey[key]) firstByKey[key] = sale.id;
    }
    return new Set(Object.values(firstByKey));
  }, [salesData]);

  const effectivePct = (sale: CrmSale) =>
    sale.commission_pct > 0 ? sale.commission_pct : commissionPct;

  const comisionesIniciales   = initialSales.reduce((s, x) => s + (x.amount * effectivePct(x) / 100), 0);
  const comisionesRecurrentes = recurringSales
    .filter(x => !firstRecurringSaleIds.has(x.id))
    .reduce((s, x) => s + (x.amount * effectivePct(x) / 100), 0);
  const totalComisiones = comisionesIniciales + comisionesRecurrentes;

  const vendorCurrency = useMemo(() => {
    if (!salesData.length) return "USD";
    const counts: Record<string, number> = {};
    for (const s of salesData) counts[s.currency] = (counts[s.currency] || 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "USD";
  }, [salesData]);

  const KPIS = [
    { icon: TrendingUp,  label: "Ventas totales",              value: String(totalVentas),                                      iconCls: "text-muted-foreground", bgCls: "bg-secondary"  },
    { icon: DollarSign,  label: `Total comisiones (${commissionPct}%)`, value: fmtSaleAmt(totalComisiones, vendorCurrency, 0),   iconCls: "text-primary",          bgCls: "bg-primary/10" },
    { icon: Percent,     label: `Iniciales · ${initialSales.length} vta${initialSales.length !== 1 ? "s" : ""}`, value: fmtSaleAmt(comisionesIniciales, vendorCurrency, 0),   iconCls: "text-muted-foreground", bgCls: "bg-secondary"  },
    { icon: RefreshCcw,  label: `Mantenimientos · ${recurringSales.length} activo${recurringSales.length !== 1 ? "s" : ""}`, value: fmtSaleAmt(comisionesRecurrentes, vendorCurrency, 0), iconCls: "text-muted-foreground", bgCls: "bg-secondary"  },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Mis Ventas</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Resumen de comisiones y actividad</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {KPIS.map(({ icon: Icon, label, value, iconCls, bgCls }) => (
          <div key={label} className="bg-card border rounded-2xl p-4">
            <div className={`w-8 h-8 rounded-xl ${bgCls} flex items-center justify-center mb-3`}>
              <Icon size={15} className={iconCls} />
            </div>
            <p className="text-2xl font-bold text-foreground leading-tight">{value}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* Historial de ventas */}
      <div className="bg-card border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <DollarSign size={13} className="text-primary" />
          </div>
          <h2 className="text-sm font-semibold">Historial de Ventas</h2>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : salesData.length === 0 ? (
          <div className="px-5 py-10 flex flex-col items-center gap-2 text-center">
            <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center">
              <DollarSign size={18} className="text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No hay ventas registradas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b bg-secondary/30">
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Fecha</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Cliente</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Servicio / Producto</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Tipo</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 text-right">Mi Comisión</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Estado</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Comprobante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {salesData.map((sale) => {
                  const isFirstRec = firstRecurringSaleIds.has(sale.id);
                  const commission = isFirstRec ? 0 : sale.amount * effectivePct(sale) / 100;
                  return (
                    <tr key={sale.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(sale.created_at).toLocaleDateString("es-ES")}
                      </td>
                      <td className="px-5 py-3.5 font-medium">{sale.contact_name ?? "—"}</td>
                      <td className="px-5 py-3.5 text-muted-foreground text-sm">{sale.product_name ?? sale.service_name ?? "—"}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          sale.type === "recurring"
                            ? "bg-blue-500/10 text-blue-600"
                            : "bg-secondary text-muted-foreground"
                        }`}>
                          {sale.type === "recurring" ? "Mantenimiento" : "Inicial"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {isFirstRec
                          ? <span className="text-[10px] text-muted-foreground italic">Incluido en inicial</span>
                          : <span className="font-semibold text-emerald-600">{fmtSaleAmt(commission, sale.currency, 2)}</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        {sale.is_paid ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                            <CheckCircle2 size={11} /> Pagado
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Pendiente</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {sale.payment_proof_url ? (
                          <a href={sale.payment_proof_url} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline">
                            <ExternalLink size={10} /> Ver
                          </a>
                        ) : <span className="text-[11px] text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Historial de mantenimientos */}
      {maint.length > 0 && (
        <div className="bg-card border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center">
              <Calendar size={13} className="text-muted-foreground" />
            </div>
            <h2 className="text-sm font-semibold">Historial de Mantenimientos</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b bg-secondary/30">
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Mes</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 text-right">Monto</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 text-right">Mi Comisión</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Estado</th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Comprobante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {maint.map(m => (
                  <tr key={m.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-5 py-3.5 font-medium">{m.month}</td>
                    <td className="px-5 py-3.5 text-right">{fmtSaleAmt(m.amount, undefined, 2)}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-emerald-600">{fmtSaleAmt(m.commission_amount, undefined, 2)}</td>
                    <td className="px-5 py-3.5">
                      {m.is_paid ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                          <CheckCircle2 size={11} /> Pagado
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">Pendiente</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {m.proof_url ? (
                        <a href={m.proof_url} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline">
                          <ExternalLink size={10} /> Ver
                        </a>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const CrmVentas = ({
  isSuperAdmin = false,
  isVendor = false,
  vendorProfile = null,
}: {
  isSuperAdmin?: boolean;
  isVendor?: boolean;
  vendorProfile?: CrmVendor | null;
}) => {
  const { user }      = useCurrentUser();
  const { can }       = useStaffPermissions();
  const canCreateSale = can("ventas", "create");
  const canEditSale   = can("ventas", "edit");
  const canDeleteSale = can("ventas", "delete");

  const { data: contacts = [] }                            = useContacts();
  const { data: services = [] }                            = useServices();
  const { data: salesData = [], isLoading: loadingSales }  = useSales();
  const { data: clientAccounts = [] }                      = useClientAccounts();
  const { data: vendors = [] }                             = useVendors();
  const { data: maintPayments = [] }                       = useMaintenancePayments();
  const createSale  = useCreateSale();
  const updateSale  = useUpdateSale();
  const deleteSale  = useDeleteSale();
  const markSalePaid = useMarkSalePaid();
  const upsertMaint  = useUpsertMaintenancePayment();

  const vendorMap = useMemo(
    () => Object.fromEntries(vendors.map(v => [v.id, v])),
    [vendors]
  );
  const vendorByUserId = useMemo(
    () => Object.fromEntries(vendors.filter(v => v.vendor_user_id).map(v => [v.vendor_user_id!, v])),
    [vendors]
  );
  const accountByContact = useMemo(
    () => Object.fromEntries(clientAccounts.map(a => [a.contact_id, a])),
    [clientAccounts]
  );

  if (isVendor && vendorProfile) {
    return <VendorSalesView vendorProfile={vendorProfile} />;
  }

  // ─── Sale modal ───────────────────────────────────────────────────────────
  const [saleModal, setSaleModal] = useState<
    | { mode: "edit";   sale: CrmSale }
    | { mode: "delete"; sale: CrmSale }
    | null
  >(null);
  const [justification, setJustification] = useState("");
  const [editAmount, setEditAmount]       = useState<number | "">("");
  const [editNotes, setEditNotes]         = useState("");

  const openEditSale   = (sale: CrmSale) => { setSaleModal({ mode: "edit", sale }); setEditAmount(sale.amount); setEditNotes(sale.notes ?? ""); setJustification(""); };
  const openDeleteSale = (sale: CrmSale) => { setSaleModal({ mode: "delete", sale }); setJustification(""); };
  const closeSaleModal = () => { setSaleModal(null); setJustification(""); };

  const handleConfirmEditSale = async () => {
    if (!saleModal || saleModal.mode !== "edit") return;
    if (!justification.trim()) { toast.error("La justificación es obligatoria"); return; }
    try {
      await updateSale.mutateAsync({ id: saleModal.sale.id, amount: Number(editAmount), notes: editNotes || null, justification: justification.trim() });
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

  // ─── Mark as paid modal ───────────────────────────────────────────────────
  const [payModal, setPayModal] = useState<CrmSale | null>(null);
  const [proofUrl, setProofUrl] = useState("");
  const [paying, setPaying]     = useState(false);

  const openPayModal  = (sale: CrmSale) => { setPayModal(sale); setProofUrl(""); };
  const closePayModal = () => { setPayModal(null); setProofUrl(""); };

  const handleMarkPaid = async () => {
    if (!payModal) return;
    setPaying(true);
    try {
      await markSalePaid.mutateAsync({ id: payModal.id, proof_url: proofUrl || undefined });
      toast.success("Venta marcada como pagada");
      closePayModal();
    } catch { toast.error("Error al marcar como pagada"); }
    finally { setPaying(false); }
  };

  // ─── Maintenance pay modal ────────────────────────────────────────────────
  const [maintModal, setMaintModal]       = useState<{ vendor: CrmVendor; month: string; amount: number; commissionAmount: number } | null>(null);
  const [maintProofUrl, setMaintProofUrl] = useState("");
  const [payingMaint, setPayingMaint]     = useState(false);
  const today = new Date();

  const handleMarkMaintPaid = async () => {
    if (!maintModal) return;
    setPayingMaint(true);
    try {
      await upsertMaint.mutateAsync({
        vendor_id: maintModal.vendor.id, month: maintModal.month,
        amount: maintModal.amount, commission_pct: maintModal.vendor.commission_pct,
        commission_amount: maintModal.commissionAmount, is_paid: true,
        paid_at: new Date().toISOString(), proof_url: maintProofUrl.trim() || null, notes: null,
      });
      toast.success("Mantenimiento marcado como pagado");
      setMaintModal(null); setMaintProofUrl("");
    } catch { toast.error("Error al marcar mantenimiento"); }
    finally { setPayingMaint(false); }
  };

  // ─── New sale form ────────────────────────────────────────────────────────
  const { data: products = [] } = useProducts();
  const activeProducts = useMemo(() => products.filter(p => p.is_active), [products]);

  const [selectedContact, setSelectedContact] = useState("");
  const [saleItemType, setSaleItemType]       = useState<"service" | "product">("service");
  const [selectedService, setSelectedService] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedVariant, setSelectedVariant] = useState("");
  const [saleNotes, setSaleNotes]             = useState("");
  const [saleAmount, setSaleAmount]           = useState<number | "">("");
  const [saleType, setSaleType]               = useState<"initial" | "recurring">("initial");

  const { data: productVariants = [] } = useProductVariants(
    saleItemType === "product" && selectedProduct ? selectedProduct : null
  );
  const selectedProductObj = useMemo(() => activeProducts.find(p => p.id === selectedProduct), [activeProducts, selectedProduct]);

  // Multi-currency auto-select
  const { data: servicePrices = [] } = usePricesByEntity("service", selectedService || null);
  const { data: productPrices = [] } = usePricesByEntity("product", selectedProduct || null);
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

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sId = e.target.value; setSelectedService(sId); setSaleType("initial");
    const s = services.find(x => x.id === sId);
    if (!s) { setSaleAmount(""); return; }
    const discountPct = (s as any).discount_pct ?? 0;
    const defaultAmt = discountPct > 0 ? +(s.price * (1 - discountPct / 100)).toFixed(2) : s.price;
    const cur = getContactCurrency(selectedContact);
    setSaleAmount(getPriceForCurrency(servicePrices, defaultAmt, s.currency, cur));
  };

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = e.target.value; setSelectedProduct(pId); setSelectedVariant(""); setSaleAmount("");
    const p = activeProducts.find(x => x.id === pId);
    if (!p) return;
    if (!p.has_variants) {
      const cur = getContactCurrency(selectedContact);
      setSaleAmount(getPriceForCurrency(productPrices, calcProductPrice(p), p.currency, cur));
    }
  };

  const handleContactChange = (contactId: string) => {
    setSelectedContact(contactId);
    if (saleItemType === "service" && selectedService) {
      const s = services.find(x => x.id === selectedService);
      if (s) {
        const discountPct = (s as any).discount_pct ?? 0;
        const defaultAmt = discountPct > 0 ? +(s.price * (1 - discountPct / 100)).toFixed(2) : s.price;
        const cur = contactId ? getContactCurrency(contactId) : null;
        setSaleAmount(getPriceForCurrency(servicePrices, defaultAmt, s.currency, cur));
      }
    } else if (saleItemType === "product" && selectedProduct && selectedProductObj && !selectedProductObj.has_variants) {
      const cur = contactId ? getContactCurrency(contactId) : null;
      setSaleAmount(getPriceForCurrency(productPrices, calcProductPrice(selectedProductObj), selectedProductObj.currency, cur));
    }
  };

  const handleVariantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const vId = e.target.value; setSelectedVariant(vId);
    if (!vId || !selectedProductObj) { setSaleAmount(""); return; }
    const v = productVariants.find(x => x.id === vId);
    if (v) setSaleAmount(calcProductPrice(selectedProductObj, v));
  };

  const resetSaleForm = () => {
    setSelectedContact(""); setSelectedService(""); setSelectedProduct(""); setSelectedVariant("");
    setSaleNotes(""); setSaleAmount(""); setSaleType("initial");
  };

  const handleRegisterSale = async () => {
    const contact = contacts.find(c => c.id === selectedContact);
    if (!contact) return;

    if (saleItemType === "service") {
      if (!selectedService || saleAmount === "" || isNaN(Number(saleAmount))) return;
      const service = services.find(s => s.id === selectedService);
      if (!service) return;
      let finalNotes = saleNotes;
      if (service.is_recurring) {
        const typeLabel = saleType === "initial" ? "Pago Inicial" : "Pago Recurrente";
        finalNotes = finalNotes ? `[${typeLabel}] ${finalNotes}` : `[${typeLabel}]`;
      }
      try {
        const vendorForContact = vendorByUserId[contact.user_id] ?? null;
        await createSale.mutateAsync({
          contact_id: contact.id, contact_name: contact.name,
          service_id: service.id, service_name: service.name,
          amount: Number(saleAmount), currency: service.currency ?? "USD",
          type: saleType, notes: finalNotes || null,
          ...(vendorForContact ? { vendor_id: vendorForContact.id, commission_pct: vendorForContact.commission_pct } : {}),
        });
        const existingAccount = accountByContact[contact.id];
        if ((service as any).is_saas && !existingAccount && user) {
          try {
            const { error } = await supabase.functions.invoke("create-saas-client", { body: { contact_id: contact.id, admin_user_id: user.id } });
            if (error) throw error;
            toast.success(`Venta registrada · Email de invitación enviado a ${contact.email ?? contact.name}`);
          } catch {
            toast.success("Venta registrada");
            toast.error("No se pudo crear la cuenta SaaS del cliente.");
          }
        } else { toast.success("Venta registrada"); }
        resetSaleForm();
      } catch { toast.error("Error al registrar la venta"); }
    } else {
      if (!selectedProduct || saleAmount === "" || isNaN(Number(saleAmount))) return;
      const product = activeProducts.find(p => p.id === selectedProduct);
      if (!product) return;
      const selectedVariantObj = selectedVariant ? productVariants.find(v => v.id === selectedVariant) : undefined;
      const variantName = selectedVariantObj ? ` (${selectedVariantObj.name})` : "";
      try {
        const vendorForContact = vendorByUserId[contact.user_id] ?? null;
        await createSale.mutateAsync({
          contact_id: contact.id, contact_name: contact.name,
          product_id: product.id, product_name: product.name + variantName,
          ...(selectedVariant ? { product_variant_id: selectedVariant } : {}),
          amount: Number(saleAmount), currency: product.currency ?? "USD",
          type: "initial", notes: saleNotes || null,
          ...(vendorForContact ? { vendor_id: vendorForContact.id, commission_pct: vendorForContact.commission_pct } : {}),
        } as any);
        toast.success("Venta registrada");
        resetSaleForm();
      } catch { toast.error("Error al registrar la venta"); }
    }
  };

  // ─── Filters ──────────────────────────────────────────────────────────────
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo,   setFilterDateTo]   = useState("");
  const [filterService,  setFilterService]  = useState("");
  const [filterContact,  setFilterContact]  = useState("");
  const [filterVip,      setFilterVip]      = useState(false);
  const [filterVendor,   setFilterVendor]   = useState("");
  const [filterCurrency, setFilterCurrency] = useState("");

  const hasFilters = !!(filterDateFrom || filterDateTo || filterService || filterContact || filterVip || filterVendor || filterCurrency);

  const clearFilters = () => {
    setFilterDateFrom(""); setFilterDateTo(""); setFilterService("");
    setFilterContact(""); setFilterVip(false); setFilterVendor(""); setFilterCurrency("");
  };

  const handleToggleVip = async (sale: CrmSale) => {
    try { await updateSale.mutateAsync({ id: sale.id, is_vip: !sale.is_vip, justification: "VIP toggle" } as any); }
    catch { toast.error("Error al cambiar estado VIP"); }
  };

  // ─── AI sale confirm/reject ────────────────────────────────────────────────
  const [confirmingAiSale, setConfirmingAiSale] = useState<string | null>(null);

  const handleConfirmAiSale = async (sale: CrmSale, action: "confirm" | "reject") => {
    setConfirmingAiSale(sale.id + action);
    try {
      if (action === "confirm") {
        await updateSale.mutateAsync({
          id: sale.id, status: "confirmed" as any, is_paid: true as any,
          paid_at: new Date().toISOString() as any,
          justification: "Confirmado manualmente desde panel de Ventas",
        });
        if (sale.product_id) supabase.functions.invoke("send-deliverable", { body: { sale_id: sale.id } }).catch(() => {});
        toast.success("Venta confirmada");
      } else {
        await updateSale.mutateAsync({ id: sale.id, status: "rejected" as any, justification: "Rechazado manualmente desde panel de Ventas" });
        toast.success("Venta rechazada");
      }
    } catch (e: any) { toast.error(`Error: ${e.message}`); }
    finally { setConfirmingAiSale(null); }
  };

  const pendingAiSales = useMemo(
    () => salesData.filter(s => s.is_ai_sale && s.status === "pending_review"),
    [salesData]
  );

  // ─── KPIs ─────────────────────────────────────────────────────────────────
  const confirmedSales = useMemo(
    () => salesData.filter(s => s.status !== "pending_review" && s.status !== "rejected"),
    [salesData]
  );

  const totalComisiones = useMemo(
    () => confirmedSales.reduce((s, x) => s + (x.vendor_id ? x.amount * (x.commission_pct || 0) / 100 : 0), 0),
    [confirmedSales]
  );

  const totalPorMoneda = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of confirmedSales) { const c = s.currency ?? "USD"; map.set(c, (map.get(c) ?? 0) + s.amount); }
    return [...map.entries()];
  }, [confirmedSales]);

  const ingresoMesPorMoneda = useMemo(() => {
    const now = new Date();
    const map = new Map<string, number>();
    for (const s of confirmedSales) {
      const d = new Date(s.created_at);
      if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) continue;
      const c = s.currency ?? "USD"; map.set(c, (map.get(c) ?? 0) + s.amount);
    }
    return [...map.entries()];
  }, [confirmedSales]);

  const salesThisMonth = useMemo(() => {
    const now = new Date();
    return confirmedSales.filter(s => { const d = new Date(s.created_at); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); }).length;
  }, [confirmedSales]);

  const comisionesPorMoneda = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of confirmedSales) {
      if (!s.vendor_id) continue;
      const c = s.currency ?? "USD";
      map.set(c, (map.get(c) ?? 0) + s.amount * (s.commission_pct > 0 ? s.commission_pct : 0) / 100);
    }
    return [...map.entries()];
  }, [confirmedSales]);

  const gananciaPorMoneda = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of confirmedSales) {
      const c = s.currency ?? "USD";
      const comm = s.vendor_id ? s.amount * (s.commission_pct > 0 ? s.commission_pct : 0) / 100 : 0;
      map.set(c, (map.get(c) ?? 0) + s.amount - comm);
    }
    return [...map.entries()];
  }, [confirmedSales]);

  const availableCurrencies = useMemo(() => {
    const s = new Set(salesData.map(x => x.currency ?? "USD"));
    return [...s].sort();
  }, [salesData]);

  const recurringByInterval = useMemo(() => {
    const serviceInfo: Record<string, { interval: string; recPrice: number; currency: string }> = {};
    for (const s of services) {
      if (s.is_recurring && s.recurring_interval) {
        serviceInfo[s.id] = { interval: s.recurring_interval, recPrice: s.recurring_price ?? s.price, currency: s.currency ?? "USD" };
      }
    }
    const seen = new Set<string>();
    const totals: Record<string, Record<string, number>> = {};
    for (const sale of salesData) {
      if (!sale.service_id || !sale.contact_id) continue;
      const info = serviceInfo[sale.service_id]; if (!info) continue;
      const key = `${sale.contact_id}|${sale.service_id}`; if (seen.has(key)) continue;
      seen.add(key);
      if (!totals[info.interval]) totals[info.interval] = {};
      totals[info.interval][info.currency] = (totals[info.interval][info.currency] ?? 0) + info.recPrice;
    }
    return Object.entries(totals).map(([interval, byCurrency]) => ({
      interval, byCurrency: Object.entries(byCurrency) as [string, number][],
    }));
  }, [services, salesData]);

  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const firstRecurringSaleIds = useMemo(() => {
    const firstByKey: Record<string, string> = {};
    const sorted = [...salesData].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    for (const sale of sorted) {
      if (sale.type !== "recurring" || !sale.contact_id || !sale.service_id || !sale.vendor_id) continue;
      const key = `${sale.contact_id}|${sale.service_id}`;
      if (!firstByKey[key]) firstByKey[key] = sale.id;
    }
    return new Set(Object.values(firstByKey));
  }, [salesData]);

  const maintByVendor = useMemo(() => {
    if (!isSuperAdmin || vendors.length === 0) return [];
    const byVendor: Record<string, { vendor: CrmVendor; amount: number; count: number; currency: string }> = {};
    for (const sale of salesData) {
      if (sale.type !== "recurring" || !sale.vendor_id || firstRecurringSaleIds.has(sale.id)) continue;
      const now = new Date(); const d = new Date(sale.created_at);
      if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) continue;
      const vendor = vendorMap[sale.vendor_id]; if (!vendor) continue;
      if (!byVendor[vendor.id]) byVendor[vendor.id] = { vendor, amount: 0, count: 0, currency: sale.currency ?? "USD" };
      byVendor[vendor.id].amount += sale.amount;
      byVendor[vendor.id].count++;
    }
    return Object.values(byVendor).map(({ vendor, amount, count, currency }) => ({
      vendor, amount, count, currency,
      commissionAmount: amount * vendor.commission_pct / 100,
      paid: maintPayments.find(m => m.vendor_id === vendor.id && m.month === currentMonth)?.is_paid ?? false,
    }));
  }, [isSuperAdmin, vendors, salesData, vendorMap, maintPayments, currentMonth, firstRecurringSaleIds]);

  const lastMonthStr = useMemo(() => {
    const d = new Date();
    const lm = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    return `${lm.getFullYear()}-${String(lm.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const lastMonthLabel = useMemo(() => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1);
    return `${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`;
  }, []);

  const maintByVendorLastMonth = useMemo(() => {
    if (!isSuperAdmin || vendors.length === 0) return [] as Array<{ vendor: CrmVendor; amount: number; count: number; commissionAmount: number; paid: boolean }>;
    const now = new Date();
    const lmYear  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const lmMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const byVendor: Record<string, { vendor: CrmVendor; amount: number; count: number }> = {};
    for (const sale of salesData) {
      if (sale.type !== "recurring" || !sale.vendor_id || firstRecurringSaleIds.has(sale.id)) continue;
      const d = new Date(sale.created_at);
      if (d.getFullYear() !== lmYear || d.getMonth() !== lmMonth) continue;
      const vendor = vendorMap[sale.vendor_id]; if (!vendor) continue;
      if (!byVendor[vendor.id]) byVendor[vendor.id] = { vendor, amount: 0, count: 0 };
      byVendor[vendor.id].amount += sale.amount;
      byVendor[vendor.id].count++;
    }
    return Object.values(byVendor).map(({ vendor, amount, count }) => ({
      vendor, amount, count,
      commissionAmount: amount * vendor.commission_pct / 100,
      paid: maintPayments.find(m => m.vendor_id === vendor.id && m.month === lastMonthStr)?.is_paid ?? false,
    }));
  }, [isSuperAdmin, vendors, salesData, vendorMap, maintPayments, lastMonthStr, firstRecurringSaleIds]);

  // ─── Filtered history ─────────────────────────────────────────────────────
  const allSales = useMemo(() => salesData.map(s => ({
    id: s.id, raw: s,
    date:        new Date(s.created_at),
    dateStr:     new Date(s.created_at).toLocaleDateString("es-ES"),
    dateKey:     s.created_at.slice(0, 10),
    contactName: s.contact_name ?? contacts.find(c => c.id === s.contact_id)?.name ?? "Contacto eliminado",
    serviceName: s.product_name ?? s.service_name ?? "—",
    amount:      s.amount, notes: s.notes ?? "",
    serviceId:   s.service_id ?? "", contactId: s.contact_id ?? "",
    vendorId:    s.vendor_id ?? "",
    vendorName:  s.vendor_id ? (vendorMap[s.vendor_id]?.name ?? "Vendedor") : "",
    commission:  (s.vendor_id && !firstRecurringSaleIds.has(s.id)) ? s.amount * (s.commission_pct > 0 ? s.commission_pct : (vendorMap[s.vendor_id]?.commission_pct ?? 0)) / 100 : 0,
    isFirstRecurring: firstRecurringSaleIds.has(s.id),
  })), [salesData, contacts, vendorMap, firstRecurringSaleIds]);

  const filteredSales = useMemo(() => {
    let r = allSales;
    if (filterDateFrom) r = r.filter(s => s.dateKey >= filterDateFrom);
    if (filterDateTo)   r = r.filter(s => s.dateKey <= filterDateTo);
    if (filterService)  r = r.filter(s => s.serviceId === filterService);
    if (filterContact)  r = r.filter(s => s.contactId === filterContact);
    if (filterVip)      r = r.filter(s => s.raw.is_vip);
    if (filterVendor)   r = r.filter(s => s.vendorId === filterVendor);
    if (filterCurrency) r = r.filter(s => (s.raw.currency ?? "USD") === filterCurrency);
    return r;
  }, [allSales, filterDateFrom, filterDateTo, filterService, filterContact, filterVip, filterVendor, filterCurrency]);

  const filteredTotal = useMemo(
    () => filteredSales.filter(s => s.raw.status !== "pending_review" && s.raw.status !== "rejected").reduce((s, x) => s + x.amount, 0),
    [filteredSales]
  );

  const salesContactIds  = useMemo(() => new Set(salesData.map(s => s.contact_id).filter(Boolean)), [salesData]);
  const salesServiceIds  = useMemo(() => new Set(salesData.map(s => s.service_id).filter(Boolean)), [salesData]);
  const contactsWithSale = useMemo(() => contacts.filter(c => salesContactIds.has(c.id)), [contacts, salesContactIds]);
  const servicesWithSale = useMemo(() => services.filter(s => salesServiceIds.has(s.id)), [services, salesServiceIds]);

  const isFormValid = selectedContact && (
    saleItemType === "service"
      ? !!selectedService
      : !!selectedProduct && (!selectedProductObj?.has_variants || !productVariants.length || !!selectedVariant)
  ) && saleAmount !== "";

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

      {/* ─── Mark as Paid Modal ─── */}
      <Dialog open={!!payModal} onOpenChange={(o) => { if (!o) closePayModal(); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Marcar como pagado</DialogTitle></DialogHeader>
          {payModal && (
            <div className="space-y-4 py-1">
              <div className="bg-secondary/40 rounded-xl px-4 py-3 space-y-1 text-sm">
                <p className="font-medium">{payModal.contact_name ?? "—"}</p>
                <p className="text-muted-foreground text-xs">{payModal.product_name ?? payModal.service_name ?? "—"}</p>
                <p className="text-primary font-semibold">{fmtSaleAmt(payModal.amount, payModal.currency, 2)}</p>
                {payModal.vendor_id && vendorMap[payModal.vendor_id] && (
                  <p className="text-[11px] text-muted-foreground">
                    Vendedor: {vendorMap[payModal.vendor_id].name} · Comisión: {fmtSaleAmt(payModal.amount * (payModal.commission_pct || vendorMap[payModal.vendor_id].commission_pct) / 100, payModal.currency, 2)}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Comprobante de pago</label>
                <ProofUpload onUploaded={setProofUrl} />
                <p className="text-[10px] text-muted-foreground">Opcional. El vendedor podrá verlo.</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={closePayModal}>Cancelar</Button>
            <Button onClick={handleMarkPaid} disabled={paying} className="gap-1.5">
              {paying ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              Confirmar pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Mark Maintenance as Paid Modal ─── */}
      <Dialog open={!!maintModal} onOpenChange={(o) => { if (!o) { setMaintModal(null); setMaintProofUrl(""); } }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Marcar mantenimiento como pagado</DialogTitle></DialogHeader>
          {maintModal && (
            <div className="space-y-4 py-1">
              <div className="bg-secondary/40 rounded-xl px-4 py-3 space-y-1 text-sm">
                <p className="font-medium">{maintModal.vendor.name}</p>
                <p className="text-muted-foreground text-xs">Mes: {maintModal.month}</p>
                <p className="font-semibold">Total: {fmtSaleAmt(maintModal.amount, undefined, 2)}</p>
                <p className="text-emerald-600 text-xs font-semibold">Comisión a pagar: {fmtSaleAmt(maintModal.commissionAmount, undefined, 2)} ({maintModal.vendor.commission_pct}%)</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Comprobante</label>
                <ProofUpload onUploaded={setMaintProofUrl} />
                <p className="text-[10px] text-muted-foreground">Opcional. El vendedor podrá verlo.</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setMaintModal(null); setMaintProofUrl(""); }}>Cancelar</Button>
            <Button onClick={handleMarkMaintPaid} disabled={payingMaint} className="gap-1.5">
              {payingMaint ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              Confirmar pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-6">

        {/* ── Header ── */}
        <div>
          <h1 className="text-xl font-bold tracking-tight">Ventas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Historial completo de transacciones y métricas de ingresos</p>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Total vendido — un card por moneda */}
          {(totalPorMoneda.length === 0 ? [["USD", 0]] as [string, number][] : totalPorMoneda).map(([cur, total]) => (
            <div key={`total-${cur}`} className="bg-card border rounded-2xl p-4">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                <DollarSign size={15} className="text-primary" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-base leading-none">{getCurrencyFlag(cur)}</span>
                <p className="text-2xl font-bold leading-tight">{fmtSaleAmt(total, cur, 0)}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total {cur}</p>
            </div>
          ))}

          {/* Ingresos del mes — un card por moneda */}
          {(ingresoMesPorMoneda.length === 0 ? [["USD", 0]] as [string, number][] : ingresoMesPorMoneda).map(([cur, total]) => (
            <div key={`mes-${cur}`} className="bg-card border rounded-2xl p-4">
              <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center mb-3">
                <Calendar size={15} className="text-muted-foreground" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-base leading-none">{getCurrencyFlag(cur)}</span>
                <p className="text-2xl font-bold leading-tight">{fmtSaleAmt(total, cur, 0)}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{MONTHS_ES[new Date().getMonth()]} {cur}</p>
            </div>
          ))}

          {/* Ventas este mes */}
          <div className="bg-card border rounded-2xl p-4">
            <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center mb-3">
              <CheckCircle2 size={15} className="text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{salesThisMonth}</p>
            <p className="text-xs text-muted-foreground mt-1">Ventas este mes</p>
          </div>

          {/* Ganancia neta — un card por moneda */}
          {isSuperAdmin && totalComisiones > 0 && gananciaPorMoneda.map(([cur, total]) => (
            <div key={`ganancia-${cur}`} className="bg-card border rounded-2xl p-4">
              <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center mb-3">
                <Percent size={15} className="text-muted-foreground" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-base leading-none">{getCurrencyFlag(cur)}</span>
                <p className="text-2xl font-bold leading-tight">{fmtSaleAmt(total, cur, 0)}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Ganancia {cur}</p>
            </div>
          ))}

          {/* IRE — un card por intervalo */}
          {isSuperAdmin && recurringByInterval.map(({ interval, byCurrency }) =>
            (byCurrency.length === 0 ? [["USD", 0]] as [string, number][] : byCurrency).map(([cur, total]) => (
              <div key={`ire-${interval}-${cur}`} className="bg-card border rounded-2xl p-4">
                <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center mb-3">
                  <RefreshCcw size={15} className="text-muted-foreground" />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-base leading-none">{getCurrencyFlag(cur)}</span>
                  <p className="text-2xl font-bold leading-tight">{fmtSaleAmt(total, cur, 0)}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">IRE {INTERVAL_LABELS[interval] ?? interval} {cur}</p>
              </div>
            ))
          )}
        </div>

        {/* ── Ventas IA pendientes ── */}
        {pendingAiSales.length > 0 && (
          <div className="border border-blue-200 bg-blue-50 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-blue-200 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
                <Bot size={15} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-800">Comprobantes detectados por IA</p>
                <p className="text-xs text-blue-600">Revisa y confirma o rechaza cada venta</p>
              </div>
              <span className="ml-auto text-xs font-bold bg-blue-500/15 text-blue-700 px-2 py-0.5 rounded-full">
                {pendingAiSales.length}
              </span>
            </div>
            <div className="divide-y divide-blue-100">
              {pendingAiSales.map(sale => (
                <div key={sale.id} className="px-5 py-3.5 flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{sale.contact_name ?? "Cliente desconocido"}</p>
                    <p className="text-xs text-muted-foreground">
                      {sale.product_name ?? sale.service_name ?? "Producto"} · ${sale.amount.toFixed(2)}
                      {sale.payment_method_type && <span className="ml-1.5 capitalize">· {sale.payment_method_type}</span>}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      disabled={!!confirmingAiSale}
                      onClick={() => handleConfirmAiSale(sale, "confirm")}
                      className="h-9 px-3.5 rounded-xl text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {confirmingAiSale === sale.id + "confirm" ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      Confirmar
                    </button>
                    <button
                      disabled={!!confirmingAiSale}
                      onClick={() => handleConfirmAiSale(sale, "reject")}
                      className="h-9 px-3.5 rounded-xl text-xs font-bold text-destructive border border-destructive/30 hover:bg-destructive/5 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {confirmingAiSale === sale.id + "reject" ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                      Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Día de pago recurrente ── */}
        {isSuperAdmin && today.getDate() === 1 && maintByVendorLastMonth.length > 0 && maintByVendorLastMonth.some(r => !r.paid) && (
          <div className="border border-amber-200 bg-amber-50 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-amber-200 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                <AlertTriangle size={15} className="text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-800">Día de Pago Recurrente</p>
                <p className="text-xs text-amber-700 mt-0.5">Comisiones de mantenimientos — {lastMonthLabel}</p>
              </div>
            </div>
            <div className="divide-y divide-amber-100">
              {maintByVendorLastMonth.map(({ vendor, amount, count, commissionAmount, paid }) => (
                <div key={`lm-${vendor.id}`} className="px-5 py-3.5 flex items-center gap-3 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: getAvatarColor(vendor.name) }}>
                      {vendor.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{vendor.name}</p>
                      <p className="text-xs text-muted-foreground">{count} cliente{count !== 1 ? "s" : ""} · Total: ${amount.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold text-amber-700">${commissionAmount.toFixed(2)}</p>
                      <p className="text-[10px] text-amber-600/70">{vendor.commission_pct}%</p>
                    </div>
                    {paid ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                        <CheckCircle2 size={11} /> Pagado
                      </span>
                    ) : (
                      <button
                        onClick={() => { setMaintModal({ vendor, month: lastMonthStr, amount, commissionAmount }); setMaintProofUrl(""); }}
                        className="h-8 px-3 rounded-xl text-xs font-bold text-amber-700 border border-amber-300 bg-white hover:bg-amber-50 transition-colors flex items-center gap-1"
                      >
                        <CheckCircle2 size={11} /> Pagar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Comisiones por vendedor ── */}
        {isSuperAdmin && vendors.length > 0 && (
          <div className="bg-card border rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center">
                <UserCheck size={13} className="text-muted-foreground" />
              </div>
              <h2 className="text-sm font-semibold">Comisiones por Vendedor</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-secondary/30">
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 text-left">Vendedor</th>
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 text-right">Ventas</th>
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 text-right">Ingresos</th>
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 text-right">Comisión</th>
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {vendors.map(v => {
                    const vSales   = allSales.filter(s => s.vendorId === v.id);
                    const vRevenue = vSales.reduce((s, x) => s + x.amount, 0);
                    const vComm    = vSales.reduce((s, x) => s + x.commission, 0);
                    return (
                      <tr key={v.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                              style={{ backgroundColor: getAvatarColor(v.name) }}>
                              {v.name.charAt(0)}
                            </div>
                            <span className="font-medium">{v.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right text-muted-foreground">{vSales.length}</td>
                        <td className="px-5 py-3.5 text-right font-medium">${vRevenue.toFixed(2)}</td>
                        <td className="px-5 py-3.5 text-right text-muted-foreground">{v.commission_pct}%</td>
                        <td className="px-5 py-3.5 text-right font-semibold text-emerald-600">${vComm.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Mantenimientos del mes (solo info) ── */}
        {isSuperAdmin && maintByVendor.length > 0 && (
          <div className="bg-card border rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center">
                <Calendar size={13} className="text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold">Mantenimientos — {MONTHS_ES[new Date().getMonth()]} {new Date().getFullYear()}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">El pago se habilitará el 1° de {MONTHS_ES[(new Date().getMonth() + 1) % 12]}</p>
              </div>
            </div>
            <div className="divide-y divide-border">
              {maintByVendor.map(({ vendor, amount, count, commissionAmount, currency }) => (
                <div key={vendor.id} className="px-5 py-3.5 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ backgroundColor: getAvatarColor(vendor.name) }}>
                    {vendor.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{vendor.name}</p>
                    <p className="text-xs text-muted-foreground">{count} cliente{count !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium">{fmtSaleAmt(amount, currency)}</p>
                    <p className="text-xs text-emerald-600 font-semibold">+{fmtSaleAmt(commissionAmount, currency)}</p>
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
                <div className="relative">
                  <select className={SELECT_CLS} value={selectedContact} onChange={(e) => handleContactChange(e.target.value)}>
                    <option value="">Seleccionar contacto...</option>
                    {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <Chevron />
                </div>
              </div>

              {/* Tipo + Servicio/Producto */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tipo</label>
                  <div className="flex rounded-xl border border-border overflow-hidden h-12">
                    <button type="button"
                      onClick={() => { setSaleItemType("service"); setSelectedProduct(""); setSaleAmount(""); }}
                      className={`flex-1 text-sm font-semibold transition-colors ${saleItemType === "service" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}>
                      Servicio
                    </button>
                    <button type="button"
                      onClick={() => { setSaleItemType("product"); setSelectedService(""); setSaleAmount(""); setSaleType("initial"); }}
                      className={`flex-1 text-sm font-semibold transition-colors border-l border-border ${saleItemType === "product" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}>
                      Producto
                    </button>
                  </div>
                </div>

                {saleItemType === "service" ? (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Servicio</label>
                    <div className="relative">
                      <select className={SELECT_CLS} value={selectedService} onChange={handleServiceChange}>
                        <option value="">Seleccionar...</option>
                        {services.map(s => <option key={s.id} value={s.id}>{s.name} — {fmtSaleAmt(s.price, s.currency)}</option>)}
                      </select>
                      <Chevron />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Producto</label>
                    <div className="relative">
                      <select className={SELECT_CLS} value={selectedProduct} onChange={handleProductChange}>
                        <option value="">Seleccionar...</option>
                        {activeProducts.map(p => {
                          const disc = p.discount_pct ?? 0;
                          const displayPrice = disc > 0 ? +(p.price * (1 - disc / 100)).toFixed(2) : p.price;
                          return <option key={p.id} value={p.id}>{p.name} — {fmtSaleAmt(displayPrice, p.currency)}{disc > 0 ? ` (-${disc}%)` : ""}</option>;
                        })}
                      </select>
                      <Chevron />
                    </div>
                  </div>
                )}
              </div>

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

              {/* Tipo de cobro (servicio recurrente) */}
              {saleItemType === "service" && (() => {
                const s = services.find(x => x.id === selectedService);
                if (!s?.is_recurring) return null;
                const recLabel = s.recurring_label ? s.recurring_label.replace(/^[/\s]+/, "") : (s.recurring_interval ?? "mes");
                return (
                  <div className="p-4 bg-secondary/40 rounded-xl border border-secondary space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tipo de cobro</p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <label className="flex items-center gap-2.5 text-sm cursor-pointer flex-1 p-3 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors">
                        <input type="radio" name="saleType" checked={saleType === "initial"} onChange={() => { setSaleType("initial"); setSaleAmount(s.price); }} className="h-4 w-4 accent-primary" />
                        <div>
                          <p className="font-semibold leading-tight">Pago Inicial</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{fmtSaleAmt(s.price, s.currency)}</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-2.5 text-sm cursor-pointer flex-1 p-3 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors">
                        <input type="radio" name="saleType" checked={saleType === "recurring"} onChange={() => { setSaleType("recurring"); setSaleAmount(s.recurring_price ?? s.price); }} className="h-4 w-4 accent-primary" />
                        <div>
                          <p className="font-semibold leading-tight">Pago Recurrente</p>
                          {s.recurring_price && <p className="text-xs text-muted-foreground mt-0.5">{fmtSaleAmt(s.recurring_price, s.currency)} / {recLabel}</p>}
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
                    {(() => {
                      const cur = saleItemType === "service"
                        ? (services.find(x => x.id === selectedService)?.currency ?? "")
                        : (activeProducts.find(x => x.id === selectedProduct)?.currency ?? "");
                      return cur ? `Monto ${getCurrencyFlag(cur)} ${cur}` : "Monto";
                    })()}
                  </label>
                  <input type="number" value={saleAmount} onChange={(e) => setSaleAmount(e.target.value as any)} min={0} placeholder="0.00" className={INPUT_CLS} />
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

        {/* ── Historial filtrado ── */}
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
              {isSuperAdmin && (
                <button
                  onClick={() => setFilterVip(v => !v)}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl border font-semibold transition-colors ${
                    filterVip
                      ? "bg-amber-100 border-amber-300 text-amber-700"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Crown size={11} /> VIP
                </button>
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
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Servicio</label>
                <div className="relative">
                  <select className={F_SELECT} value={filterService} onChange={(e) => setFilterService(e.target.value)}>
                    <option value="">Todos</option>
                    {servicesWithSale.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <Chevron />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Cliente</label>
                <div className="relative">
                  <select className={F_SELECT} value={filterContact} onChange={(e) => setFilterContact(e.target.value)}>
                    <option value="">Todos</option>
                    {contactsWithSale.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <Chevron />
                </div>
              </div>
              {isSuperAdmin && vendors.length > 0 && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Vendedor</label>
                  <div className="relative">
                    <select className={F_SELECT} value={filterVendor} onChange={(e) => setFilterVendor(e.target.value)}>
                      <option value="">Todos</option>
                      <option value="__direct__">Sin vendedor</option>
                      {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                    <Chevron />
                  </div>
                </div>
              )}
              {availableCurrencies.length > 1 && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Moneda</label>
                  <div className="relative">
                    <select className={F_SELECT} value={filterCurrency} onChange={(e) => setFilterCurrency(e.target.value)}>
                      <option value="">Todas</option>
                      {availableCurrencies.map(c => <option key={c} value={c}>{getCurrencyFlag(c)} {c} — {formatAmount(1, c, 0).replace("1", "").trim()}</option>)}
                    </select>
                    <Chevron />
                  </div>
                </div>
              )}
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
            isSuperAdmin={isSuperAdmin}
            canEdit={canEditSale}
            canDelete={canDeleteSale}
            emptyText="No hay ventas registradas."
            totalCount={allSales.length}
            filteredTotal={filteredTotal}
            hasFilters={hasFilters}
            onEdit={openEditSale}
            onDelete={openDeleteSale}
            onToggleVip={handleToggleVip}
            onMarkPaid={openPayModal}
          />
        </div>

      </div>
    </>
  );
};

export default CrmVentas;
