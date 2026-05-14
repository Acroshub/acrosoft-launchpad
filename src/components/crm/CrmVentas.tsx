import { useState, useMemo, useRef } from "react";
import { DollarSign, Plus, Loader2, Pencil, Trash2, RefreshCcw, X, Filter, Crown, CheckCircle2, ExternalLink, UserCheck, TrendingUp, Percent, Calendar, Upload, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  useContacts, useServices, useSales, useCreateSale, useUpdateSale, useDeleteSale,
  useClientAccounts, useVendors, useMarkSalePaid, useMaintenancePayments, useUpsertMaintenancePayment,
} from "@/hooks/useCrmData";
import { useStaffPermissions, useCurrentUser } from "@/hooks/useAuth";
import type { CrmSale, CrmVendor } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

// ─── Proof Upload ─────────────────────────────────────────────────────────────

const ProofUpload = ({
  onUploaded,
}: {
  onUploaded: (url: string) => void;
}) => {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview]     = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const ext  = file.name.split(".").pop() ?? "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage
        .from("payment-proofs")
        .upload(path, file, { upsert: false });
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
      <input
        ref={ref}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
      {preview ? (
        <div className="relative">
          <img src={preview} alt="Comprobante" className="w-full max-h-32 object-contain rounded-xl border" />
          <button
            type="button"
            onClick={() => { setPreview(null); onUploaded(""); if (ref.current) ref.current.value = ""; }}
            className="absolute top-1 right-1 bg-background border rounded-full p-0.5 text-muted-foreground hover:text-destructive"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-4 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all"
        >
          {uploading
            ? <><Loader2 size={14} className="animate-spin" /> Subiendo...</>
            : <><Upload size={14} /> Subir imagen o PDF</>
          }
        </button>
      )}
    </div>
  );
};
const INTERVAL_LABELS: Record<string, string> = {
  monthly:    "Mensual",
  annual:     "Anual",
  quarterly:  "Trimestral",
  semiannual: "Semestral",
};

// ─── Vendor Sales View ────────────────────────────────────────────────────────

const VendorSalesView = ({ vendorProfile }: { vendorProfile: CrmVendor }) => {
  const { data: salesData = [], isLoading } = useSales();
  const { data: maint = [] }                = useMaintenancePayments();
  const commissionPct                       = vendorProfile.commission_pct;

  const totalVentas          = salesData.length;
  const initialSales         = salesData.filter(s => s.type === "initial");
  const recurringSales       = salesData.filter(s => s.type === "recurring");

  // First recurring sale per (contact, service) = included in initial, no commission
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

  const comisionesIniciales  = initialSales.reduce(
    (s, x) => s + (x.amount * effectivePct(x) / 100), 0
  );
  const comisionesRecurrentes = recurringSales
    .filter(x => !firstRecurringSaleIds.has(x.id))
    .reduce((s, x) => s + (x.amount * effectivePct(x) / 100), 0);
  const totalComisiones = comisionesIniciales + comisionesRecurrentes;

  // Comisiones de mantenimiento pagadas (del historial)
  const maintPagadas = maint.filter(m => m.is_paid).reduce((s, m) => s + m.commission_amount, 0);
  const maintPendientes = maint.filter(m => !m.is_paid).reduce((s, m) => s + m.commission_amount, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Mis Ventas</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Resumen de tus comisiones y actividad de ventas</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border rounded-2xl p-5">
          <TrendingUp size={16} className="mb-4 text-muted-foreground" />
          <p className="text-2xl font-semibold">{totalVentas}</p>
          <p className="text-xs text-muted-foreground mt-1">Ventas totales</p>
        </div>
        <div className="bg-card border border-primary/20 rounded-2xl p-5">
          <DollarSign size={16} className="mb-4 text-primary/60" />
          <p className="text-2xl font-semibold">${totalComisiones.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground mt-1">Total comisiones ({commissionPct}%)</p>
        </div>
        <div className="bg-card border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5">
          <Percent size={16} className="mb-4 text-emerald-600/60" />
          <p className="text-2xl font-semibold">${comisionesIniciales.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground mt-1">Comis. pagos iniciales</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{initialSales.length} venta{initialSales.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="bg-card border border-blue-200 dark:border-blue-800 rounded-2xl p-5">
          <RefreshCcw size={16} className="mb-4 text-blue-600/60" />
          <p className="text-2xl font-semibold">${comisionesRecurrentes.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground mt-1">Comis. mantenimientos</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{recurringSales.length} activo{recurringSales.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Sales table */}
      <div className="bg-card border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center gap-2">
          <DollarSign size={14} className="text-muted-foreground" />
          <h2 className="text-sm font-semibold">Historial de Ventas</h2>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
        ) : salesData.length === 0 ? (
          <div className="px-6 py-12 text-center text-muted-foreground">
            <DollarSign size={24} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No hay ventas registradas todavía</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-secondary/50 text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="px-6 py-3 font-medium">Fecha</th>
                  <th className="px-6 py-3 font-medium">Cliente</th>
                  <th className="px-6 py-3 font-medium">Servicio</th>
                  <th className="px-6 py-3 font-medium">Tipo</th>
                  <th className="px-6 py-3 font-medium text-right">Mi Comisión</th>
                  <th className="px-6 py-3 font-medium">Estado pago</th>
                  <th className="px-6 py-3 font-medium">Comprobante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {salesData.map((sale) => {
                  const isFirstRec = firstRecurringSaleIds.has(sale.id);
                  const commission = isFirstRec ? 0 : sale.amount * effectivePct(sale) / 100;
                  return (
                    <tr key={sale.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-6 py-3 text-muted-foreground text-xs whitespace-nowrap">
                        {new Date(sale.created_at).toLocaleDateString("es-ES")}
                      </td>
                      <td className="px-6 py-3 font-medium">{sale.contact_name ?? "—"}</td>
                      <td className="px-6 py-3 text-muted-foreground">{sale.service_name ?? "—"}</td>
                      <td className="px-6 py-3">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          sale.type === "recurring"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-secondary text-muted-foreground"
                        }`}>
                          {sale.type === "recurring" ? "Mantenimiento" : "Inicial"}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        {isFirstRec
                          ? <span className="text-[10px] text-muted-foreground italic">Incluido en inicial</span>
                          : <span className="font-semibold text-emerald-600">${commission.toFixed(2)}</span>
                        }
                      </td>
                      <td className="px-6 py-3">
                        {sale.is_paid ? (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                            <CheckCircle2 size={12} /> Pagado
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Pendiente</span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        {sale.payment_proof_url ? (
                          <a
                            href={sale.payment_proof_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                          >
                            <ExternalLink size={11} /> Ver comprobante
                          </a>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mantenimientos pagados */}
      {maint.length > 0 && (
        <div className="bg-card border rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center gap-2">
            <Calendar size={14} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold">Historial de Mantenimientos</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-secondary/50 text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="px-6 py-3 font-medium">Mes</th>
                  <th className="px-6 py-3 font-medium text-right">Monto</th>
                  <th className="px-6 py-3 font-medium text-right">Mi Comisión</th>
                  <th className="px-6 py-3 font-medium">Estado</th>
                  <th className="px-6 py-3 font-medium">Comprobante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {maint.map(m => (
                  <tr key={m.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-6 py-3 font-medium">{m.month}</td>
                    <td className="px-6 py-3 text-right">${m.amount.toFixed(2)}</td>
                    <td className="px-6 py-3 text-right font-medium text-emerald-600">${m.commission_amount.toFixed(2)}</td>
                    <td className="px-6 py-3">
                      {m.is_paid ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                          <CheckCircle2 size={12} /> Pagado
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">Pendiente</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      {m.proof_url ? (
                        <a href={m.proof_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] text-primary hover:underline">
                          <ExternalLink size={11} /> Ver
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
  const { user }   = useCurrentUser();
  const { can }    = useStaffPermissions();
  const canCreateSale = can("ventas", "create");
  const canEditSale   = can("ventas", "edit");
  const canDeleteSale = can("ventas", "delete");

  const { data: contacts = [] }               = useContacts();
  const { data: services = [] }               = useServices();
  const { data: salesData = [], isLoading: loadingSales } = useSales();
  const { data: clientAccounts = [] }         = useClientAccounts();
  const { data: vendors = [] }                = useVendors();
  const { data: maintPayments = [] }          = useMaintenancePayments();
  const createSale              = useCreateSale();
  const updateSale              = useUpdateSale();
  const deleteSale              = useDeleteSale();
  const markSalePaid            = useMarkSalePaid();
  const upsertMaint             = useUpsertMaintenancePayment();

  // Vendor lookup map: vendor_id → vendor
  const vendorMap = useMemo(
    () => Object.fromEntries(vendors.map(v => [v.id, v])),
    [vendors]
  );

  // vendor_user_id → vendor (for auto-detecting vendor when admin registers sale manually)
  const vendorByUserId = useMemo(
    () => Object.fromEntries(vendors.filter(v => v.vendor_user_id).map(v => [v.vendor_user_id!, v])),
    [vendors]
  );

  const accountByContact = useMemo(
    () => Object.fromEntries(clientAccounts.map(a => [a.contact_id, a])),
    [clientAccounts]
  );

  // ─── Vendor sales view ────────────────────────────────────────────────────
  if (isVendor && vendorProfile) {
    return <VendorSalesView vendorProfile={vendorProfile} />;
  }

  // ─── Sale modal (edit / delete) ───────────────────────────────────────────
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
  const [payModal, setPayModal]     = useState<CrmSale | null>(null);
  const [proofUrl, setProofUrl]     = useState("");
  const [paying, setPaying]         = useState(false);

  const openPayModal = (sale: CrmSale) => { setPayModal(sale); setProofUrl(""); };
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
  const [maintModal, setMaintModal]     = useState<{ vendor: CrmVendor; month: string; amount: number; commissionAmount: number } | null>(null);
  const [maintProofUrl, setMaintProofUrl] = useState("");
  const [payingMaint, setPayingMaint]   = useState(false);
  const today = new Date();

  const handleMarkMaintPaid = async () => {
    if (!maintModal) return;
    setPayingMaint(true);
    try {
      await upsertMaint.mutateAsync({
        vendor_id:         maintModal.vendor.id,
        month:             maintModal.month,
        amount:            maintModal.amount,
        commission_pct:    maintModal.vendor.commission_pct,
        commission_amount: maintModal.commissionAmount,
        is_paid:           true,
        paid_at:           new Date().toISOString(),
        proof_url:         maintProofUrl.trim() || null,
        notes:             null,
      });
      toast.success("Mantenimiento marcado como pagado");
      setMaintModal(null); setMaintProofUrl("");
    } catch { toast.error("Error al marcar mantenimiento"); }
    finally { setPayingMaint(false); }
  };

  // ─── New sale form ────────────────────────────────────────────────────────
  const [selectedContact, setSelectedContact] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [saleNotes, setSaleNotes]             = useState("");
  const [saleAmount, setSaleAmount]           = useState<number | "">("");
  const [saleType, setSaleType]               = useState<"initial" | "recurring">("initial");

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sId = e.target.value; setSelectedService(sId); setSaleType("initial");
    const s = services.find(x => x.id === sId);
    if (!s) { setSaleAmount(""); return; }
    const discountPct = (s as any).discount_pct ?? 0;
    setSaleAmount(discountPct > 0 ? +(s.price * (1 - discountPct / 100)).toFixed(2) : s.price);
  };

  const handleRegisterSale = async () => {
    if (!selectedContact || !selectedService || saleAmount === "" || isNaN(Number(saleAmount))) return;
    const contact = contacts.find(c => c.id === selectedContact);
    const service = services.find(s => s.id === selectedService);
    if (!contact || !service) return;
    let finalNotes = saleNotes;
    if (service.is_recurring) {
      const typeLabel = saleType === "initial" ? "Pago Inicial" : "Pago Recurrente";
      finalNotes = finalNotes ? `[${typeLabel}] ${finalNotes}` : `[${typeLabel}]`;
    }
    try {
      // Auto-detect vendor: if the contact was created via a vendor's form, their user_id matches the vendor's vendor_user_id
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
          toast.error("No se pudo crear la cuenta SaaS del cliente. Inténtalo manualmente.");
        }
      } else { toast.success("Venta registrada"); }
      setSelectedContact(""); setSelectedService(""); setSaleNotes(""); setSaleAmount(""); setSaleType("initial"); setCurrentPage(1);
    } catch { toast.error("Error al registrar la venta"); }
  };

  // ─── Filters ──────────────────────────────────────────────────────────────
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo,   setFilterDateTo]   = useState("");
  const [filterService,  setFilterService]  = useState("");
  const [filterContact,  setFilterContact]  = useState("");
  const [filterVip,      setFilterVip]      = useState(false);
  const [filterVendor,   setFilterVendor]   = useState("");

  const hasFilters = !!(filterDateFrom || filterDateTo || filterService || filterContact || filterVip || filterVendor);

  const clearFilters = () => {
    setFilterDateFrom(""); setFilterDateTo(""); setFilterService("");
    setFilterContact(""); setFilterVip(false); setFilterVendor(""); setCurrentPage(1);
  };

  const handleToggleVip = async (sale: CrmSale) => {
    try { await updateSale.mutateAsync({ id: sale.id, is_vip: !sale.is_vip, justification: "VIP toggle" } as any); }
    catch { toast.error("Error al cambiar estado VIP"); }
  };

  // ─── KPIs ─────────────────────────────────────────────────────────────────
  const totalVendido = useMemo(() => salesData.reduce((s, x) => s + x.amount, 0), [salesData]);
  const totalComisiones = useMemo(
    () => salesData.reduce((s, x) => s + (x.vendor_id ? x.amount * (x.commission_pct || 0) / 100 : 0), 0),
    [salesData]
  );
  const gananciaAdmin = totalVendido - totalComisiones;

  const salesThisMonth = useMemo(() => {
    const now = new Date();
    return salesData.filter(s => { const d = new Date(s.created_at); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); }).length;
  }, [salesData]);

  const ingresoMesActual = useMemo(() => {
    const now = new Date();
    return salesData.filter(s => { const d = new Date(s.created_at); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); }).reduce((s, x) => s + x.amount, 0);
  }, [salesData]);

  const recurringByInterval = useMemo(() => {
    const serviceInfo: Record<string, { interval: string; recPrice: number }> = {};
    for (const s of services) { if (s.is_recurring && s.recurring_interval) serviceInfo[s.id] = { interval: s.recurring_interval, recPrice: s.recurring_price ?? s.price }; }
    const seen = new Set<string>(); const totals: Record<string, number> = {};
    for (const sale of salesData) {
      if (!sale.service_id || !sale.contact_id) continue;
      const info = serviceInfo[sale.service_id]; if (!info) continue;
      const key = `${sale.contact_id}|${sale.service_id}`; if (seen.has(key)) continue;
      seen.add(key); totals[info.interval] = (totals[info.interval] ?? 0) + info.recPrice;
    }
    return Object.entries(totals).map(([interval, total]) => ({ interval, total }));
  }, [services, salesData]);

  // ─── Maintenance section (current month) ─────────────────────────────────
  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  // First recurring sale per (contact_id, service_id) with a vendor = included in initial payment, no commission owed
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
    const byVendor: Record<string, { vendor: CrmVendor; amount: number; count: number }> = {};
    for (const sale of salesData) {
      if (sale.type !== "recurring" || !sale.vendor_id) continue;
      if (firstRecurringSaleIds.has(sale.id)) continue; // first month included in initial
      const now = new Date(); const d = new Date(sale.created_at);
      if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) continue;
      const vendor = vendorMap[sale.vendor_id]; if (!vendor) continue;
      if (!byVendor[vendor.id]) byVendor[vendor.id] = { vendor, amount: 0, count: 0 };
      byVendor[vendor.id].amount += sale.amount;
      byVendor[vendor.id].count++;
    }
    return Object.values(byVendor).map(({ vendor, amount, count }) => ({
      vendor, amount, count,
      commissionAmount: amount * vendor.commission_pct / 100,
      paid: maintPayments.find(m => m.vendor_id === vendor.id && m.month === currentMonth)?.is_paid ?? false,
    }));
  }, [isSuperAdmin, vendors, salesData, vendorMap, maintPayments, currentMonth, firstRecurringSaleIds]);

  // ─── Last month recurring commissions (for "DIA DE PAGO RECURRENTE") ─────
  const lastMonthStr = useMemo(() => {
    const d = new Date();
    const lm = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    return `${lm.getFullYear()}-${String(lm.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const lastMonthLabel = useMemo(() => {
    const d = new Date();
    d.setDate(1); d.setMonth(d.getMonth() - 1);
    return `${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`;
  }, []);

  const maintByVendorLastMonth = useMemo(() => {
    if (!isSuperAdmin || vendors.length === 0) return [] as Array<{ vendor: CrmVendor; amount: number; count: number; commissionAmount: number; paid: boolean; isMock: boolean }>;
    const now = new Date();
    const lmYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const lmMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const byVendor: Record<string, { vendor: CrmVendor; amount: number; count: number }> = {};
    for (const sale of salesData) {
      if (sale.type !== "recurring" || !sale.vendor_id) continue;
      if (firstRecurringSaleIds.has(sale.id)) continue; // first month included in initial
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
      isMock: false,
    }));
  }, [isSuperAdmin, vendors, salesData, vendorMap, maintPayments, lastMonthStr, firstRecurringSaleIds]);

  // ─── History with filters ─────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const salesPerPage = 15;

  const allSales = useMemo(() => salesData.map(s => ({
    id: s.id, raw: s,
    date:        new Date(s.created_at),
    dateStr:     new Date(s.created_at).toLocaleDateString("es-ES"),
    dateKey:     s.created_at.slice(0, 10),
    contactName: s.contact_name ?? contacts.find(c => c.id === s.contact_id)?.name ?? "Contacto eliminado",
    serviceName: s.service_name ?? "Servicio eliminado",
    amount:      s.amount,
    notes:       s.notes ?? "",
    serviceId:   s.service_id ?? "",
    contactId:   s.contact_id ?? "",
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
    return r;
  }, [allSales, filterDateFrom, filterDateTo, filterService, filterContact, filterVip, filterVendor]);

  const totalPages    = Math.ceil(filteredSales.length / salesPerPage);
  const pageSales     = filteredSales.slice((currentPage - 1) * salesPerPage, currentPage * salesPerPage);
  const filteredTotal = useMemo(() => filteredSales.reduce((s, x) => s + x.amount, 0), [filteredSales]);

  const applyFilter = (fn: () => void) => { fn(); setCurrentPage(1); };

  const salesContactIds  = useMemo(() => new Set(salesData.map(s => s.contact_id).filter(Boolean)), [salesData]);
  const salesServiceIds  = useMemo(() => new Set(salesData.map(s => s.service_id).filter(Boolean)), [salesData]);
  const contactsWithSale = useMemo(() => contacts.filter(c => salesContactIds.has(c.id)), [contacts, salesContactIds]);
  const servicesWithSale = useMemo(() => services.filter(s => salesServiceIds.has(s.id)), [services, salesServiceIds]);

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
                <p className="text-muted-foreground text-xs">{saleModal.sale.service_name ?? "—"}</p>
                <p className="text-primary font-semibold">${saleModal.sale.amount.toFixed(2)}</p>
              </div>
              {saleModal.mode === "edit" && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Nuevo monto</label>
                    <Input type="number" min={0} step={0.01} value={editAmount} onChange={(e) => setEditAmount(e.target.value === "" ? "" : Number(e.target.value))} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Notas</label>
                    <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} className="text-sm resize-none" placeholder="Observaciones..." />
                  </div>
                </>
              )}
              {saleModal.mode === "delete" && <p className="text-sm text-muted-foreground">Esta acción eliminará la transacción permanentemente.</p>}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Justificación <span className="text-destructive">*</span></label>
                <Textarea value={justification} onChange={(e) => setJustification(e.target.value)} rows={2} className="text-sm resize-none" placeholder="Motivo de este cambio..." autoFocus />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={closeSaleModal}>Cancelar</Button>
            {saleModal?.mode === "edit" ? (
              <Button onClick={handleConfirmEditSale} disabled={!justification.trim() || editAmount === "" || updateSale.isPending}>
                {updateSale.isPending && <Loader2 size={14} className="animate-spin mr-1.5" />} Guardar cambios
              </Button>
            ) : (
              <Button variant="destructive" onClick={handleConfirmDeleteSale} disabled={!justification.trim() || deleteSale.isPending}>
                {deleteSale.isPending && <Loader2 size={14} className="animate-spin mr-1.5" />} Eliminar transacción
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
                <p className="text-muted-foreground text-xs">{payModal.service_name ?? "—"}</p>
                <p className="text-primary font-semibold">${payModal.amount.toFixed(2)}</p>
                {payModal.vendor_id && vendorMap[payModal.vendor_id] && (
                  <p className="text-[11px] text-muted-foreground">
                    Vendedor: {vendorMap[payModal.vendor_id].name} ·
                    Comisión: ${(payModal.amount * (payModal.commission_pct || vendorMap[payModal.vendor_id].commission_pct) / 100).toFixed(2)}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Comprobante de pago</label>
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
                <p className="text-foreground font-semibold">Total: ${maintModal.amount.toFixed(2)}</p>
                <p className="text-emerald-600 text-xs font-medium">Comisión a pagar: ${maintModal.commissionAmount.toFixed(2)} ({maintModal.vendor.commission_pct}%)</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Comprobante de pago</label>
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

      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold">Ventas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Historial completo de transacciones y métricas de ingresos</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border rounded-2xl p-5">
            <DollarSign size={16} className="mb-4 text-muted-foreground" />
            <p className="text-2xl font-semibold">${totalVendido.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground mt-1">Total vendido</p>
          </div>
          <div className="bg-card border rounded-2xl p-5">
            <DollarSign size={16} className="mb-4 text-muted-foreground" />
            <p className="text-2xl font-semibold">${ingresoMesActual.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground mt-1">Ingresos en {MONTHS_ES[new Date().getMonth()]}</p>
          </div>
          <div className="bg-card border rounded-2xl p-5">
            <Plus size={16} className="mb-4 text-muted-foreground" />
            <p className="text-2xl font-semibold">{salesThisMonth}</p>
            <p className="text-xs text-muted-foreground mt-1">Ventas este mes</p>
          </div>
          {isSuperAdmin && totalComisiones > 0 && (
            <div className="bg-card border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5">
              <Percent size={16} className="mb-4 text-emerald-600/60" />
              <p className="text-2xl font-semibold">${gananciaAdmin.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground mt-1">Tu ganancia neta</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Comisiones vendedores: ${totalComisiones.toFixed(0)}</p>
            </div>
          )}
          {isSuperAdmin && recurringByInterval.map(({ interval, total }) => (
            <div key={`ire-${interval}`} className="bg-card border border-primary/20 rounded-2xl p-5">
              <RefreshCcw size={16} className="mb-4 text-primary/60" />
              <p className="text-2xl font-semibold">${total.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground mt-1">IRE {INTERVAL_LABELS[interval] ?? interval}</p>
            </div>
          ))}
        </div>

        {/* DIA DE PAGO RECURRENTE — last month recurring commissions */}
        {isSuperAdmin && maintByVendorLastMonth.length > 0 && (
          <div className="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-amber-200 dark:border-amber-800 flex items-center gap-3">
              <AlertTriangle size={16} className="text-amber-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-800 dark:text-amber-300 tracking-wide">DIA DE PAGO RECURRENTE</p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                  Comisiones de mantenimientos — {lastMonthLabel}
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-amber-100/50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs uppercase">
                  <tr>
                    <th className="px-6 py-3 font-medium text-left">Vendedor</th>
                    <th className="px-6 py-3 font-medium text-right">Clientes activos</th>
                    <th className="px-6 py-3 font-medium text-right">Total cobrado</th>
                    <th className="px-6 py-3 font-medium text-right">Comisión a pagar</th>
                    <th className="px-6 py-3 font-medium text-center">Estado</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100 dark:divide-amber-900/40">
                  {maintByVendorLastMonth.map(({ vendor, amount, count, commissionAmount, paid }) => (
                    <tr key={`lm-${vendor.id}`} className="hover:bg-amber-100/30 dark:hover:bg-amber-900/20 transition-colors">
                      <td className="px-6 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-xs font-bold text-amber-700 dark:text-amber-400 shrink-0">
                            {vendor.name.charAt(0)}
                          </div>
                          {vendor.name}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right">{count}</td>
                      <td className="px-6 py-3 text-right font-medium">${amount.toFixed(2)}</td>
                      <td className="px-6 py-3 text-right font-bold text-amber-700 dark:text-amber-400">${commissionAmount.toFixed(2)}</td>
                      <td className="px-6 py-3 text-center">
                        {paid ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                            <CheckCircle2 size={12} /> Pagado
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Pendiente</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!paid && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                            onClick={() => { setMaintModal({ vendor, month: lastMonthStr, amount, commissionAmount }); setMaintProofUrl(""); }}
                          >
                            <CheckCircle2 size={11} /> Pagar
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Comisiones por vendedor (superadmin) */}
        {isSuperAdmin && vendors.length > 0 && (
          <div className="bg-card border rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center gap-2">
              <UserCheck size={14} className="text-muted-foreground" />
              <h2 className="text-sm font-semibold">Comisiones por Vendedor</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-muted-foreground text-xs uppercase">
                  <tr>
                    <th className="px-6 py-3 font-medium text-left">Vendedor</th>
                    <th className="px-6 py-3 font-medium text-right">Ventas</th>
                    <th className="px-6 py-3 font-medium text-right">Ingresos generados</th>
                    <th className="px-6 py-3 font-medium text-right">Comisión (%)</th>
                    <th className="px-6 py-3 font-medium text-right">Total comisión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {vendors.map(v => {
                    const vSales = allSales.filter(s => s.vendorId === v.id);
                    const vRevenue = vSales.reduce((s, x) => s + x.amount, 0);
                    const vComm = vSales.reduce((s, x) => s + x.commission, 0);
                    return (
                      <tr key={v.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-6 py-3 font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                              {v.name.charAt(0)}
                            </div>
                            {v.name}
                          </div>
                        </td>
                        <td className="px-6 py-3 text-right">{vSales.length}</td>
                        <td className="px-6 py-3 text-right font-medium">${vRevenue.toFixed(2)}</td>
                        <td className="px-6 py-3 text-right text-muted-foreground">{v.commission_pct}%</td>
                        <td className="px-6 py-3 text-right font-semibold text-emerald-600">${vComm.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Mantenimientos del mes (superadmin) — solo informativo, sin pago */}
        {isSuperAdmin && maintByVendor.length > 0 && (
          <div className="bg-card border rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center gap-3">
              <Calendar size={14} className="text-muted-foreground" />
              <div className="flex-1">
                <h2 className="text-sm font-semibold">Mantenimientos del mes — {MONTHS_ES[new Date().getMonth()]} {new Date().getFullYear()}</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">El pago a vendedores se habilitará el 1° de {MONTHS_ES[(new Date().getMonth() + 1) % 12]}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-muted-foreground text-xs uppercase">
                  <tr>
                    <th className="px-6 py-3 font-medium text-left">Vendedor</th>
                    <th className="px-6 py-3 font-medium text-right">Clientes activos</th>
                    <th className="px-6 py-3 font-medium text-right">Total cobrado</th>
                    <th className="px-6 py-3 font-medium text-right">Comisión proyectada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {maintByVendor.map(({ vendor, amount, count, commissionAmount }) => (
                    <tr key={vendor.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-6 py-3 font-medium">{vendor.name}</td>
                      <td className="px-6 py-3 text-right">{count}</td>
                      <td className="px-6 py-3 text-right">${amount.toFixed(2)}</td>
                      <td className="px-6 py-3 text-right font-semibold text-emerald-600">${commissionAmount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Registrar venta */}
        {canCreateSale && (
          <div className="bg-card border rounded-2xl p-6">
            <h2 className="text-sm font-semibold mb-4">Registrar Venta</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Contacto</label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={selectedContact} onChange={(e) => setSelectedContact(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Servicio</label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={selectedService} onChange={handleServiceChange}>
                  <option value="">Seleccionar...</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name} — ${s.price}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Monto (USD)</label>
                <Input type="number" min={0} placeholder="0.00" value={saleAmount} onChange={(e) => setSaleAmount(e.target.value as any)} className="h-10" />
              </div>
              <Button onClick={handleRegisterSale} className="h-10 w-full" disabled={!selectedContact || !selectedService || saleAmount === "" || createSale.isPending}>
                {createSale.isPending ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Plus size={16} className="mr-1.5" />}
                Registrar Venta
              </Button>
              {(() => {
                const s = services.find(x => x.id === selectedService);
                if (!s?.is_recurring) return null;
                return (
                  <div className="md:col-span-4 p-3 bg-secondary/30 rounded-xl border border-secondary">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Tipo de cobro</p>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" name="saleType" checked={saleType === "initial"} onChange={() => { setSaleType("initial"); setSaleAmount(s.price); }} className="h-4 w-4 accent-primary" />
                        Pago Inicial (${s.price})
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" name="saleType" checked={saleType === "recurring"} onChange={() => { setSaleType("recurring"); setSaleAmount(s.recurring_price ?? s.price); }} className="h-4 w-4 accent-primary" />
                        Pago Recurrente{s.recurring_price ? ` ($${s.recurring_price})` : ""}
                      </label>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="mt-4 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Notas (Opcional)</label>
              <Input type="text" placeholder="Detalles sobre esta venta..." value={saleNotes} onChange={(e) => setSaleNotes(e.target.value)} className="h-10" />
            </div>
          </div>
        )}

        {/* Historial filtrado */}
        <div className="bg-card border rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <Filter size={14} className="text-muted-foreground shrink-0" />
                <h2 className="text-sm font-semibold">Historial de Ventas</h2>
                {hasFilters && (
                  <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {filteredSales.length} resultado{filteredSales.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isSuperAdmin && (
                  <button onClick={() => applyFilter(() => setFilterVip(v => !v))} className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${filterVip ? "bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-400" : "border-border text-muted-foreground hover:text-foreground"}`}>
                    <Crown size={11} /> Solo VIP
                  </button>
                )}
                {hasFilters && <button onClick={clearFilters} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"><X size={12} /> Limpiar</button>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-4">
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Desde</label>
                <Input type="date" className="h-8 text-xs" value={filterDateFrom} onChange={(e) => applyFilter(() => setFilterDateFrom(e.target.value))} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Hasta</label>
                <Input type="date" className="h-8 text-xs" value={filterDateTo} onChange={(e) => applyFilter(() => setFilterDateTo(e.target.value))} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Servicio</label>
                <select className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={filterService} onChange={(e) => applyFilter(() => setFilterService(e.target.value))}>
                  <option value="">Todos</option>
                  {servicesWithSale.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Cliente</label>
                <select className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={filterContact} onChange={(e) => applyFilter(() => setFilterContact(e.target.value))}>
                  <option value="">Todos</option>
                  {contactsWithSale.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {isSuperAdmin && vendors.length > 0 && (
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Vendedor</label>
                  <select className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={filterVendor} onChange={(e) => applyFilter(() => setFilterVendor(e.target.value))}>
                    <option value="">Todos</option>
                    <option value="__direct__">Sin vendedor</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>

          {loadingSales ? (
            <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>
          ) : filteredSales.length === 0 ? (
            <div className="px-6 py-12 text-center text-muted-foreground">
              <DollarSign size={24} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">{hasFilters ? "Sin ventas con los filtros aplicados." : "No hay ventas registradas."}</p>
              {hasFilters && <button onClick={clearFilters} className="text-xs text-primary mt-2 hover:underline">Limpiar filtros</button>}
            </div>
          ) : (
            <div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-secondary/50 text-muted-foreground text-xs uppercase">
                    <tr>
                      <th className="px-6 py-3 font-medium">Fecha</th>
                      <th className="px-6 py-3 font-medium">Contacto</th>
                      <th className="px-6 py-3 font-medium">Servicio</th>
                      <th className="px-6 py-3 font-medium text-right">Monto</th>
                      {isSuperAdmin && <th className="px-6 py-3 font-medium">Vendedor</th>}
                      {isSuperAdmin && <th className="px-6 py-3 font-medium text-right">Comisión</th>}
                      {isSuperAdmin && <th className="px-6 py-3 font-medium text-center">Pagado</th>}
                      <th className="px-6 py-3 font-medium">Notas</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pageSales.map((sale) => (
                      <tr key={sale.id} className={`transition-colors group ${sale.vendorId && sale.commission > 0 && !sale.raw.is_paid ? "bg-amber-50/70 dark:bg-amber-900/15 hover:bg-amber-100/60 dark:hover:bg-amber-900/25" : "hover:bg-secondary/30"}`}>
                        <td className="px-6 py-3 whitespace-nowrap text-muted-foreground text-xs">{sale.dateStr}</td>
                        <td className="px-6 py-3 font-medium">
                          <span className="flex items-center gap-2">
                            {sale.contactName}
                            {sale.raw.is_vip && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-700 shrink-0">
                                <Crown size={9} /> VIP
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-3">{sale.serviceName}</td>
                        <td className="px-6 py-3 font-semibold text-primary text-right">${sale.amount.toFixed(2)}</td>
                        {isSuperAdmin && (
                          <td className="px-6 py-3">
                            {sale.vendorName ? (
                              <span className="text-xs font-medium text-muted-foreground">{sale.vendorName}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground/50">Directo</span>
                            )}
                          </td>
                        )}
                        {isSuperAdmin && (
                          <td className="px-6 py-3 text-right">
                            {sale.commission > 0 ? (
                              <span className="text-xs font-medium text-emerald-600">${sale.commission.toFixed(2)}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground/50">—</span>
                            )}
                          </td>
                        )}
                        {isSuperAdmin && (
                          <td className="px-6 py-3 text-center">
                            {sale.vendorId && sale.commission > 0 ? (
                              sale.raw.is_paid ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                                  <CheckCircle2 size={11} /> Pagado
                                </span>
                              ) : (
                                <button
                                  onClick={() => openPayModal(sale.raw)}
                                  className="text-[11px] text-amber-700 dark:text-amber-400 hover:underline font-semibold"
                                >
                                  Marcar pagado
                                </button>
                              )
                            ) : (
                              <span className="text-[11px] text-muted-foreground/40">—</span>
                            )}
                          </td>
                        )}
                        <td className="px-6 py-3 text-muted-foreground text-xs truncate max-w-[160px]">{sale.notes || "—"}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {isSuperAdmin && (
                              <button onClick={() => handleToggleVip(sale.raw)} className={`p-1.5 rounded-lg transition-colors ${sale.raw.is_vip ? "text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/30" : "text-muted-foreground hover:text-amber-500 hover:bg-secondary"}`} title={sale.raw.is_vip ? "Quitar VIP" : "Marcar como VIP"}>
                                <Crown size={13} />
                              </button>
                            )}
                            {canEditSale && (
                              <button onClick={() => openEditSale(sale.raw)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="Editar transacción">
                                <Pencil size={13} />
                              </button>
                            )}
                            {canDeleteSale && (
                              <button onClick={() => openDeleteSale(sale.raw)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Eliminar transacción">
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-6 py-3 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground">
                    {filteredSales.length === allSales.length ? `${allSales.length} venta${allSales.length !== 1 ? "s" : ""}` : `${filteredSales.length} de ${allSales.length} ventas`}
                  </span>
                  {hasFilters && <span className="text-xs font-semibold text-primary">Total filtrado: ${filteredTotal.toFixed(2)}</span>}
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>Anterior</Button>
                    <div className="flex items-center mx-1">
                      {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                        const page = i + 1;
                        return (
                          <button key={page} onClick={() => setCurrentPage(page)} className={`w-6 h-6 rounded flex items-center justify-center text-xs font-medium transition-colors ${currentPage === page ? "bg-primary text-primary-foreground" : "hover:bg-secondary text-muted-foreground"}`}>
                            {page}
                          </button>
                        );
                      })}
                    </div>
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>Siguiente</Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CrmVentas;
