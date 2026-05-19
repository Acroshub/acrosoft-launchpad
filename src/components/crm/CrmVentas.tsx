import { useState, useMemo, useRef } from "react";
import { DollarSign, Plus, Loader2, Pencil, Trash2, RefreshCcw, X, Filter, Crown, CheckCircle2, ExternalLink, UserCheck, TrendingUp, Percent, Calendar, Upload, AlertTriangle, Bot, Check, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£",
  BOB: "Bs.", PEN: "S/", COP: "COP$",
  MXN: "MX$", ARS: "ARS$", CLP: "CLP$",
};

const fmtSaleAmt = (amount: number, currency?: string | null, decimals = 2) => {
  const cur = (currency ?? "USD").toUpperCase();
  const sym = CURRENCY_SYMBOLS[cur] ?? `${cur} `;
  return `${sym}${amount.toFixed(decimals)}`;
};

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
                  <th className="px-6 py-3 font-medium">Servicio / Producto</th>
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
                      <td className="px-6 py-3 text-muted-foreground">{sale.product_name ?? sale.service_name ?? "—"}</td>
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
    setSaleAmount(discountPct > 0 ? +(s.price * (1 - discountPct / 100)).toFixed(2) : s.price);
  };

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = e.target.value; setSelectedProduct(pId); setSelectedVariant(""); setSaleAmount("");
    const p = activeProducts.find(x => x.id === pId);
    if (!p) return;
    if (!p.has_variants) setSaleAmount(calcProductPrice(p));
  };

  const handleVariantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const vId = e.target.value; setSelectedVariant(vId);
    if (!vId || !selectedProductObj) { setSaleAmount(""); return; }
    const v = productVariants.find(x => x.id === vId);
    if (v) setSaleAmount(calcProductPrice(selectedProductObj, v));
  };

  const resetSaleForm = () => {
    setSelectedContact(""); setSelectedService(""); setSelectedProduct(""); setSelectedVariant("");
    setSaleNotes(""); setSaleAmount(""); setSaleType("initial"); setCurrentPage(1);
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
            toast.error("No se pudo crear la cuenta SaaS del cliente. Inténtalo manualmente.");
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
  const [filterDateFrom, setFilterDateFrom]   = useState("");
  const [filterDateTo,   setFilterDateTo]     = useState("");
  const [filterService,  setFilterService]    = useState("");
  const [filterContact,  setFilterContact]    = useState("");
  const [filterVip,      setFilterVip]        = useState(false);
  const [filterVendor,   setFilterVendor]     = useState("");
  const [filterCurrency, setFilterCurrency]   = useState("");

  const hasFilters = !!(filterDateFrom || filterDateTo || filterService || filterContact || filterVip || filterVendor || filterCurrency);

  const clearFilters = () => {
    setFilterDateFrom(""); setFilterDateTo(""); setFilterService("");
    setFilterContact(""); setFilterVip(false); setFilterVendor(""); setFilterCurrency(""); setCurrentPage(1);
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
          id: sale.id,
          status: "confirmed" as any,
          is_paid: true as any,
          paid_at: new Date().toISOString() as any,
          justification: "Confirmado manualmente desde panel de Ventas",
        });
        if (sale.product_id) {
          supabase.functions.invoke("send-deliverable", { body: { sale_id: sale.id } }).catch(() => {});
        }
        toast.success("Venta confirmada");
      } else {
        await updateSale.mutateAsync({
          id: sale.id,
          status: "rejected" as any,
          justification: "Rechazado manualmente desde panel de Ventas",
        });
        toast.success("Venta rechazada");
      }
    } catch (e: any) { toast.error(`Error: ${e.message}`); }
    finally { setConfirmingAiSale(null); }
  };

  const pendingAiSales = useMemo(
    () => salesData.filter(s => s.is_ai_sale && s.status === "pending_review"),
    [salesData]
  );

  // Solo ventas confirmadas cuentan para KPIs (excluye pending_review y rejected)
  const confirmedSales = useMemo(
    () => salesData.filter(s => s.status !== "pending_review" && s.status !== "rejected"),
    [salesData]
  );

  // ─── KPIs ─────────────────────────────────────────────────────────────────
  const totalVendido = useMemo(() => confirmedSales.reduce((s, x) => s + x.amount, 0), [confirmedSales]);
  const totalComisiones = useMemo(
    () => confirmedSales.reduce((s, x) => s + (x.vendor_id ? x.amount * (x.commission_pct || 0) / 100 : 0), 0),
    [confirmedSales]
  );
  const gananciaAdmin = totalVendido - totalComisiones;

  const comisionesPorMoneda = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of confirmedSales) {
      if (!s.vendor_id) continue;
      const c = s.currency ?? "USD";
      const comm = s.amount * (s.commission_pct > 0 ? s.commission_pct : 0) / 100;
      map.set(c, (map.get(c) ?? 0) + comm);
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

  const salesThisMonth = useMemo(() => {
    const now = new Date();
    return confirmedSales.filter(s => { const d = new Date(s.created_at); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); }).length;
  }, [confirmedSales]);

  const ingresoMesActual = useMemo(() => {
    const now = new Date();
    return confirmedSales.filter(s => { const d = new Date(s.created_at); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); }).reduce((s, x) => s + x.amount, 0);
  }, [confirmedSales]);

  // Totales agrupados por moneda para KPIs
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
    const totals: Record<string, Record<string, number>> = {}; // interval → currency → total
    for (const sale of salesData) {
      if (!sale.service_id || !sale.contact_id) continue;
      const info = serviceInfo[sale.service_id]; if (!info) continue;
      const key = `${sale.contact_id}|${sale.service_id}`; if (seen.has(key)) continue;
      seen.add(key);
      if (!totals[info.interval]) totals[info.interval] = {};
      totals[info.interval][info.currency] = (totals[info.interval][info.currency] ?? 0) + info.recPrice;
    }
    return Object.entries(totals).map(([interval, byCurrency]) => ({
      interval,
      byCurrency: Object.entries(byCurrency) as [string, number][],
    }));
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
    const byVendor: Record<string, { vendor: CrmVendor; amount: number; count: number; currency: string }> = {};
    for (const sale of salesData) {
      if (sale.type !== "recurring" || !sale.vendor_id) continue;
      if (firstRecurringSaleIds.has(sale.id)) continue;
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

  const allSales = useMemo(() => salesData.map(s => ({
    id: s.id, raw: s,
    date:        new Date(s.created_at),
    dateStr:     new Date(s.created_at).toLocaleDateString("es-ES"),
    dateKey:     s.created_at.slice(0, 10),
    contactName: s.contact_name ?? contacts.find(c => c.id === s.contact_id)?.name ?? "Contacto eliminado",
    serviceName: s.product_name ?? s.service_name ?? "—",
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
    if (filterCurrency) r = r.filter(s => (s.raw.currency ?? "USD") === filterCurrency);
    return r;
  }, [allSales, filterDateFrom, filterDateTo, filterService, filterContact, filterVip, filterVendor, filterCurrency]);

  const filteredTotal = useMemo(() => filteredSales.filter(s => s.raw.status !== "pending_review" && s.raw.status !== "rejected").reduce((s, x) => s + x.amount, 0), [filteredSales]);

  const applyFilter = (fn: () => void) => { fn(); };

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
                <p className="text-muted-foreground text-xs">{saleModal.sale.product_name ?? saleModal.sale.service_name ?? "—"}</p>
                <p className="text-primary font-semibold">{fmtSaleAmt(saleModal.sale.amount, saleModal.sale.currency)}</p>
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
                <p className="text-muted-foreground text-xs">{payModal.product_name ?? payModal.service_name ?? "—"}</p>
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
            {totalPorMoneda.length === 0
              ? <p className="text-2xl font-semibold">$0</p>
              : totalPorMoneda.map(([cur, total]) => (
                  <p key={cur} className="text-2xl font-semibold leading-tight">{fmtSaleAmt(total, cur, 0)}</p>
                ))
            }
            <p className="text-xs text-muted-foreground mt-1">Total vendido</p>
          </div>
          <div className="bg-card border rounded-2xl p-5">
            <DollarSign size={16} className="mb-4 text-muted-foreground" />
            {ingresoMesPorMoneda.length === 0
              ? <p className="text-2xl font-semibold">$0</p>
              : ingresoMesPorMoneda.map(([cur, total]) => (
                  <p key={cur} className="text-2xl font-semibold leading-tight">{fmtSaleAmt(total, cur, 0)}</p>
                ))
            }
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
              {gananciaPorMoneda.map(([cur, total]) => (
                <p key={cur} className="text-2xl font-semibold leading-tight">{fmtSaleAmt(total, cur, 0)}</p>
              ))}
              <p className="text-xs text-muted-foreground mt-1">Tu ganancia neta</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Comisiones: {comisionesPorMoneda.map(([cur, t]) => fmtSaleAmt(t, cur, 0)).join(" · ")}
              </p>
            </div>
          )}
          {isSuperAdmin && recurringByInterval.map(({ interval, byCurrency }) => (
            <div key={`ire-${interval}`} className="bg-card border border-primary/20 rounded-2xl p-5">
              <RefreshCcw size={16} className="mb-4 text-primary/60" />
              {byCurrency.map(([cur, total]) => (
                <p key={cur} className="text-2xl font-semibold leading-tight">{fmtSaleAmt(total, cur, 0)}</p>
              ))}
              <p className="text-xs text-muted-foreground mt-1">IRE {INTERVAL_LABELS[interval] ?? interval}</p>
            </div>
          ))}
        </div>

        {/* Ventas IA pendientes de revisión */}
        {pendingAiSales.length > 0 && (
          <div className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-blue-200 dark:border-blue-800 flex items-center gap-2">
              <Bot size={15} className="text-blue-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Comprobantes detectados por IA</p>
                <p className="text-[11px] text-blue-600 dark:text-blue-400">Revisa y confirma o rechaza cada venta</p>
              </div>
            </div>
            <div className="divide-y divide-blue-100 dark:divide-blue-800/50">
              {pendingAiSales.map(sale => (
                <div key={sale.id} className="px-5 py-3.5 flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{sale.contact_name ?? "Cliente desconocido"}</p>
                    <p className="text-xs text-muted-foreground">
                      {sale.product_name ?? sale.service_name ?? "Producto"} · ${sale.amount.toFixed(2)}
                      {sale.payment_method_type && <span className="ml-1.5 capitalize">· {sale.payment_method_type}</span>}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={!!confirmingAiSale}
                      onClick={() => handleConfirmAiSale(sale, "confirm")}
                    >
                      {confirmingAiSale === sale.id + "confirm"
                        ? <Loader2 size={12} className="animate-spin" />
                        : <Check size={12} />}
                      Confirmar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                      disabled={!!confirmingAiSale}
                      onClick={() => handleConfirmAiSale(sale, "reject")}
                    >
                      {confirmingAiSale === sale.id + "reject"
                        ? <Loader2 size={12} className="animate-spin" />
                        : <XCircle size={12} />}
                      Rechazar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DIA DE PAGO RECURRENTE — solo día 1 de cada mes, mientras haya pagos pendientes */}
        {isSuperAdmin && today.getDate() === 1 && maintByVendorLastMonth.length > 0 && maintByVendorLastMonth.some(r => !r.paid) && (
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
                  {maintByVendor.map(({ vendor, amount, count, commissionAmount, currency }) => (
                    <tr key={vendor.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-6 py-3 font-medium">{vendor.name}</td>
                      <td className="px-6 py-3 text-right">{count}</td>
                      <td className="px-6 py-3 text-right">{fmtSaleAmt(amount, currency)}</td>
                      <td className="px-6 py-3 text-right font-semibold text-emerald-600">{fmtSaleAmt(commissionAmount, currency)}</td>
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
              {/* Toggle Servicio / Producto */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Tipo</label>
                <div className="flex rounded-md border overflow-hidden h-10">
                  <button type="button" onClick={() => { setSaleItemType("service"); setSelectedProduct(""); setSaleAmount(""); }} className={`flex-1 text-sm font-medium transition-colors ${saleItemType === "service" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"}`}>Servicio</button>
                  <button type="button" onClick={() => { setSaleItemType("product"); setSelectedService(""); setSaleAmount(""); setSaleType("initial"); }} className={`flex-1 text-sm font-medium transition-colors ${saleItemType === "product" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"}`}>Producto</button>
                </div>
              </div>

              {saleItemType === "service" ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Servicio</label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={selectedService} onChange={handleServiceChange}>
                    <option value="">Seleccionar...</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name} — {fmtSaleAmt(s.price, s.currency)}</option>)}
                  </select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Producto</label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={selectedProduct} onChange={handleProductChange}>
                    <option value="">Seleccionar...</option>
                    {activeProducts.map(p => {
                      const disc = p.discount_pct ?? 0;
                      const displayPrice = disc > 0 ? +(p.price * (1 - disc / 100)).toFixed(2) : p.price;
                      return <option key={p.id} value={p.id}>{p.name} — {fmtSaleAmt(displayPrice, p.currency)}{disc > 0 ? ` (-${disc}%)` : ""}</option>;
                    })}
                  </select>
                </div>
              )}

              {/* Variante — solo cuando el producto seleccionado tiene variantes */}
              {saleItemType === "product" && selectedProductObj?.has_variants && productVariants.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Variante</label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={selectedVariant} onChange={handleVariantChange}>
                    <option value="">Seleccionar variante...</option>
                    {productVariants.map(v => {
                      const price = calcProductPrice(selectedProductObj, v);
                      const base = v.price_override != null ? v.price_override : selectedProductObj.price;
                      const hasDisc = price < base;
                      return <option key={v.id} value={v.id}>{v.name} — {fmtSaleAmt(price, selectedProductObj.currency)}{hasDisc ? ` (-${v.discount_pct ?? selectedProductObj.discount_pct ?? 0}%)` : ""}</option>;
                    })}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  {saleItemType === "service"
                    ? `Monto${selectedService ? ` (${services.find(x => x.id === selectedService)?.currency ?? "USD"})` : ""}`
                    : `Monto${selectedProduct ? ` (${activeProducts.find(x => x.id === selectedProduct)?.currency ?? "USD"})` : ""}`}
                </label>
                <Input type="number" min={0} placeholder="0.00" value={saleAmount} onChange={(e) => setSaleAmount(e.target.value as any)} className="h-10" />
              </div>
              <Button onClick={handleRegisterSale} className="h-10 w-full" disabled={!selectedContact || (saleItemType === "service" ? !selectedService : !selectedProduct || (selectedProductObj?.has_variants && productVariants.length > 0 && !selectedVariant)) || saleAmount === "" || createSale.isPending}>
                {createSale.isPending ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Plus size={16} className="mr-1.5" />}
                Registrar Venta
              </Button>
              {saleItemType === "service" && (() => {
                const s = services.find(x => x.id === selectedService);
                if (!s?.is_recurring) return null;
                return (
                  <div className="md:col-span-4 p-3 bg-secondary/30 rounded-xl border border-secondary">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Tipo de cobro</p>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" name="saleType" checked={saleType === "initial"} onChange={() => { setSaleType("initial"); setSaleAmount(s.price); }} className="h-4 w-4 accent-primary" />
                        Pago Inicial ({fmtSaleAmt(s.price, s.currency)})
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" name="saleType" checked={saleType === "recurring"} onChange={() => { setSaleType("recurring"); setSaleAmount(s.recurring_price ?? s.price); }} className="h-4 w-4 accent-primary" />
                        Pago Recurrente{s.recurring_price ? ` (${fmtSaleAmt(s.recurring_price, s.currency)})` : ""}
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
              {availableCurrencies.length > 1 && (
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Moneda</label>
                  <select className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={filterCurrency} onChange={(e) => applyFilter(() => setFilterCurrency(e.target.value))}>
                    <option value="">Todas</option>
                    {availableCurrencies.map(c => <option key={c} value={c}>{c} ({CURRENCY_SYMBOLS[c] ?? c})</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>

          {hasFilters && filteredSales.length === 0 && !loadingSales && (
            <div className="px-6 py-4 text-center">
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
