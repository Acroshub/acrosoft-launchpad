import { useState, useMemo } from "react";
import { DollarSign, Plus, Loader2, Pencil, Trash2, RefreshCcw, X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useContacts, useServices, useSales, useCreateSale, useUpdateSale, useDeleteSale, useClientAccounts } from "@/hooks/useCrmData";
import { useStaffPermissions, useCurrentUser } from "@/hooks/useAuth";
import type { CrmSale } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const INTERVAL_LABELS: Record<string, string> = {
  monthly:    "Mensual",
  annual:     "Anual",
  quarterly:  "Trimestral",
  semiannual: "Semestral",
};

const CrmVentas = ({ isSuperAdmin = false }: { isSuperAdmin?: boolean }) => {
  const { user } = useCurrentUser();
  const { can } = useStaffPermissions();
  const canCreateSale = can("ventas", "create");
  const canEditSale   = can("ventas", "edit");
  const canDeleteSale = can("ventas", "delete");

  const { data: contacts = [] } = useContacts();
  const { data: services = [] } = useServices();
  const { data: salesData = [], isLoading: loadingSales } = useSales();
  const { data: clientAccounts = [] } = useClientAccounts();
  const createSale = useCreateSale();
  const updateSale = useUpdateSale();
  const deleteSale = useDeleteSale();

  const accountByContact = useMemo(
    () => Object.fromEntries(clientAccounts.map(a => [a.contact_id, a])),
    [clientAccounts]
  );

  // ─── Sale modal (edit / delete) ───
  const [saleModal, setSaleModal] = useState<
    | { mode: "edit"; sale: CrmSale }
    | { mode: "delete"; sale: CrmSale }
    | null
  >(null);
  const [justification, setJustification] = useState("");
  const [editAmount, setEditAmount]       = useState<number | "">("");
  const [editNotes, setEditNotes]         = useState("");

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

  // ─── New sale form ───
  const [selectedContact, setSelectedContact] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [saleNotes, setSaleNotes]             = useState("");
  const [saleAmount, setSaleAmount]           = useState<number | "">("");
  const [saleType, setSaleType]               = useState<"initial" | "recurring">("initial");

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sId = e.target.value;
    setSelectedService(sId);
    setSaleType("initial");
    const s = services.find(x => x.id === sId);
    setSaleAmount(s ? s.price : "");
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
      await createSale.mutateAsync({
        contact_id:   contact.id,
        contact_name: contact.name,
        service_id:   service.id,
        service_name: service.name,
        amount:       Number(saleAmount),
        currency:     service.currency ?? "USD",
        type:         saleType,
        notes:        finalNotes || null,
      });

      const existingAccount = accountByContact[contact.id];
      if ((service as any).is_saas && !existingAccount && user) {
        try {
          const { error } = await supabase.functions.invoke("create-saas-client", {
            body: { contact_id: contact.id, admin_user_id: user.id },
          });
          if (error) throw error;
          toast.success(`Venta registrada · Email de invitación enviado a ${contact.email ?? contact.name}`);
        } catch {
          toast.success("Venta registrada");
          toast.error("No se pudo crear la cuenta SaaS del cliente. Inténtalo manualmente.");
        }
      } else {
        toast.success("Venta registrada");
      }

      setSelectedContact("");
      setSelectedService("");
      setSaleNotes("");
      setSaleAmount("");
      setSaleType("initial");
      setCurrentPage(1);
    } catch {
      toast.error("Error al registrar la venta");
    }
  };

  // ─── Filters ───
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo,   setFilterDateTo]   = useState("");
  const [filterService,  setFilterService]  = useState("");
  const [filterContact,  setFilterContact]  = useState("");

  const hasFilters = !!(filterDateFrom || filterDateTo || filterService || filterContact);

  const clearFilters = () => {
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterService("");
    setFilterContact("");
    setCurrentPage(1);
  };

  // ─── KPIs (unfiltered — same as Overview) ───
  const totalVendido = useMemo(
    () => salesData.reduce((sum, s) => sum + s.amount, 0),
    [salesData]
  );

  const salesThisMonth = useMemo(() => {
    const now = new Date();
    return salesData.filter(s => {
      const d = new Date(s.created_at);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
  }, [salesData]);

  const ingresoMesActual = useMemo(() => {
    const now = new Date();
    return salesData
      .filter(s => {
        const d = new Date(s.created_at);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
      .reduce((sum, s) => sum + s.amount, 0);
  }, [salesData]);

  const recurringByInterval = useMemo(() => {
    const serviceInfo: Record<string, { interval: string; recPrice: number }> = {};
    for (const s of services) {
      if (s.is_recurring && s.recurring_interval) {
        serviceInfo[s.id] = { interval: s.recurring_interval, recPrice: s.recurring_price ?? s.price };
      }
    }
    const seen = new Set<string>();
    const totals: Record<string, number> = {};
    for (const sale of salesData) {
      if (!sale.service_id || !sale.contact_id) continue;
      const info = serviceInfo[sale.service_id];
      if (!info) continue;
      const key = `${sale.contact_id}|${sale.service_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      totals[info.interval] = (totals[info.interval] ?? 0) + info.recPrice;
    }
    return Object.entries(totals).map(([interval, total]) => ({ interval, total }));
  }, [services, salesData]);

  // ─── History with filters ───
  const [currentPage, setCurrentPage] = useState(1);
  const salesPerPage = 15;

  const allSales = useMemo(() => salesData.map(s => ({
    id: s.id,
    raw: s,
    date:        new Date(s.created_at),
    dateStr:     new Date(s.created_at).toLocaleDateString("es-ES"),
    dateKey:     s.created_at.slice(0, 10),
    contactName: s.contact_name ?? contacts.find(c => c.id === s.contact_id)?.name ?? "Contacto eliminado",
    serviceName: s.service_name ?? "Servicio eliminado",
    amount:      s.amount,
    notes:       s.notes ?? "",
    serviceId:   s.service_id ?? "",
    contactId:   s.contact_id ?? "",
  })), [salesData, contacts]);

  const filteredSales = useMemo(() => {
    let result = allSales;
    if (filterDateFrom) result = result.filter(s => s.dateKey >= filterDateFrom);
    if (filterDateTo)   result = result.filter(s => s.dateKey <= filterDateTo);
    if (filterService)  result = result.filter(s => s.serviceId === filterService);
    if (filterContact)  result = result.filter(s => s.contactId === filterContact);
    return result;
  }, [allSales, filterDateFrom, filterDateTo, filterService, filterContact]);

  const totalPages    = Math.ceil(filteredSales.length / salesPerPage);
  const pageSales     = filteredSales.slice((currentPage - 1) * salesPerPage, currentPage * salesPerPage);

  const filteredTotal = useMemo(
    () => filteredSales.reduce((sum, s) => sum + s.amount, 0),
    [filteredSales]
  );

  // Reset page when filters change
  const applyFilter = (fn: () => void) => { fn(); setCurrentPage(1); };

  // ─── Unique contacts/services that appear in sales (for filter dropdowns) ───
  const salesContactIds  = useMemo(() => new Set(salesData.map(s => s.contact_id).filter(Boolean)), [salesData]);
  const salesServiceIds  = useMemo(() => new Set(salesData.map(s => s.service_id).filter(Boolean)), [salesData]);
  const contactsWithSale = useMemo(() => contacts.filter(c => salesContactIds.has(c.id)), [contacts, salesContactIds]);
  const servicesWithSale = useMemo(() => services.filter(s => salesServiceIds.has(s.id)), [services, salesServiceIds]);

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
                <p className="text-primary font-semibold">${saleModal.sale.amount.toFixed(2)}</p>
              </div>

              {saleModal.mode === "edit" && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Nuevo monto</label>
                    <Input
                      type="number" min={0} step={0.01}
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value === "" ? "" : Number(e.target.value))}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Notas</label>
                    <Textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={2} className="text-sm resize-none"
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
                <label className="text-xs font-medium text-muted-foreground">
                  Justificación <span className="text-destructive">*</span>
                </label>
                <Textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  rows={2} className="text-sm resize-none"
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
            <p className="text-xs text-muted-foreground mt-1">
              Ingresos en {MONTHS_ES[new Date().getMonth()]}
            </p>
          </div>
          <div className="bg-card border rounded-2xl p-5">
            <Plus size={16} className="mb-4 text-muted-foreground" />
            <p className="text-2xl font-semibold">{salesThisMonth}</p>
            <p className="text-xs text-muted-foreground mt-1">Ventas este mes</p>
          </div>
          {isSuperAdmin && recurringByInterval.map(({ interval, total }) => (
            <div key={`ire-${interval}`} className="bg-card border border-primary/20 rounded-2xl p-5">
              <RefreshCcw size={16} className="mb-4 text-primary/60" />
              <p className="text-2xl font-semibold">${total.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground mt-1">IRE {INTERVAL_LABELS[interval] ?? interval}</p>
            </div>
          ))}
        </div>

        {/* Registrar venta */}
        {canCreateSale && (
          <div className="bg-card border rounded-2xl p-6">
            <h2 className="text-sm font-semibold mb-4">Registrar Venta</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Contacto</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={selectedContact}
                  onChange={(e) => setSelectedContact(e.target.value)}
                >
                  <option value="">Seleccionar...</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Servicio</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={selectedService}
                  onChange={handleServiceChange}
                >
                  <option value="">Seleccionar...</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name} — ${s.price}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Monto (USD)</label>
                <Input
                  type="number" min={0} placeholder="0.00"
                  value={saleAmount}
                  onChange={(e) => setSaleAmount(e.target.value as any)}
                  className="h-10"
                />
              </div>
              <Button
                onClick={handleRegisterSale}
                className="h-10 w-full"
                disabled={!selectedContact || !selectedService || saleAmount === "" || createSale.isPending}
              >
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
                        <input type="radio" name="saleType" checked={saleType === "initial"}
                          onChange={() => { setSaleType("initial"); setSaleAmount(s.price); }}
                          className="h-4 w-4 accent-primary" />
                        Pago Inicial (${s.price})
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" name="saleType" checked={saleType === "recurring"}
                          onChange={() => { setSaleType("recurring"); setSaleAmount(s.recurring_price ?? s.price); }}
                          className="h-4 w-4 accent-primary" />
                        Pago Recurrente{s.recurring_price ? ` ($${s.recurring_price} / ${s.recurring_label ? s.recurring_label.replace(/^[/\s]+/, "") : (s.recurring_interval ?? "mes")})` : ""}
                      </label>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="mt-4 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Notas (Opcional)</label>
              <Input
                type="text" placeholder="Detalles sobre esta venta, método de pago..."
                value={saleNotes}
                onChange={(e) => setSaleNotes(e.target.value)}
                className="h-10"
              />
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
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={12} /> Limpiar filtros
                </button>
              )}
            </div>

            {/* Filtros */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Desde</label>
                <Input
                  type="date" className="h-8 text-xs"
                  value={filterDateFrom}
                  onChange={(e) => applyFilter(() => setFilterDateFrom(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Hasta</label>
                <Input
                  type="date" className="h-8 text-xs"
                  value={filterDateTo}
                  onChange={(e) => applyFilter(() => setFilterDateTo(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Servicio</label>
                <select
                  className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={filterService}
                  onChange={(e) => applyFilter(() => setFilterService(e.target.value))}
                >
                  <option value="">Todos</option>
                  {servicesWithSale.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Cliente</label>
                <select
                  className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={filterContact}
                  onChange={(e) => applyFilter(() => setFilterContact(e.target.value))}
                >
                  <option value="">Todos</option>
                  {contactsWithSale.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {loadingSales ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="px-6 py-12 text-center text-muted-foreground">
              <DollarSign size={24} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">
                {hasFilters ? "Sin ventas con los filtros aplicados." : "No hay ventas registradas."}
              </p>
              {hasFilters && (
                <button onClick={clearFilters} className="text-xs text-primary mt-2 hover:underline">
                  Limpiar filtros
                </button>
              )}
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
                      <th className="px-6 py-3 font-medium">Notas</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pageSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-secondary/30 transition-colors group">
                        <td className="px-6 py-3 whitespace-nowrap text-muted-foreground text-xs">{sale.dateStr}</td>
                        <td className="px-6 py-3 font-medium">{sale.contactName}</td>
                        <td className="px-6 py-3">{sale.serviceName}</td>
                        <td className="px-6 py-3 font-semibold text-primary text-right">${sale.amount.toFixed(2)}</td>
                        <td className="px-6 py-3 text-muted-foreground text-xs truncate max-w-[180px]">{sale.notes || "—"}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {canEditSale && (
                              <button
                                onClick={() => openEditSale(sale.raw)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                                title="Editar transacción"
                              >
                                <Pencil size={13} />
                              </button>
                            )}
                            {canDeleteSale && (
                              <button
                                onClick={() => openDeleteSale(sale.raw)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                title="Eliminar transacción"
                              >
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

              {/* Totalizador y paginación */}
              <div className="px-6 py-3 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground">
                    {filteredSales.length === allSales.length
                      ? `${allSales.length} venta${allSales.length !== 1 ? "s" : ""}`
                      : `${filteredSales.length} de ${allSales.length} ventas`}
                  </span>
                  {hasFilters && (
                    <span className="text-xs font-semibold text-primary">
                      Total filtrado: ${filteredTotal.toFixed(2)}
                    </span>
                  )}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline" size="sm" className="h-7 px-2 text-xs"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    >
                      Anterior
                    </Button>
                    <div className="flex items-center mx-1">
                      {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                        const page = i + 1;
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-6 h-6 rounded flex items-center justify-center text-xs font-medium transition-colors ${
                              currentPage === page
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-secondary text-muted-foreground"
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline" size="sm" className="h-7 px-2 text-xs"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    >
                      Siguiente
                    </Button>
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
