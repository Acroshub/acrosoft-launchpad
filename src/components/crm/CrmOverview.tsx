import { CalendarDays, Users, Clock, CheckCircle, DollarSign, GripVertical, Settings2, Plus, Loader2, Pencil, Trash2, TrendingUp, RefreshCcw } from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useContacts, useAppointments, useServices, useSales, useCreateSale, useUpdateSale, useDeleteSale, useClientAccounts, useBusinessProfile, useUpsertBusinessProfile } from "@/hooks/useCrmData";
import type { CrmSale } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import { useCurrentUser, useStaffPermissions } from "@/hooks/useAuth";
import { toast } from "sonner";

const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const initialMetrics = [
  // Métricas de Admin
  { id: "ventas-mes",    icon: CheckCircle,  label: "Ventas este mes", isAdmin: true },
  { id: "total-vendido", icon: DollarSign,   label: "Total Vendido",   isAdmin: true },
  // Métricas de CRM
  { id: "citas-hoy",       icon: CalendarDays, label: "Citas hoy",       isAdmin: false },
  { id: "total-contactos", icon: Users,        label: "Total contactos", isAdmin: false },
  { id: "proxima-cita",    icon: Clock,        label: "Próxima cita",    isAdmin: false },
  { id: "conversion",      icon: TrendingUp,   label: "% Conversión",    isAdmin: false },
];

const INTERVAL_LABELS: Record<string, string> = {
  monthly:    "Mensual",
  annual:     "Anual",
  quarterly:  "Trimestral",
  semiannual: "Semestral",
};

const CrmOverview = ({ isSuperAdmin = false }: { isSuperAdmin?: boolean }) => {
  // ─── Supabase hooks ───
  const { user } = useCurrentUser();
  const { data: contacts = [] } = useContacts();
  const { data: appointments = [] } = useAppointments();
  const { data: services = [] } = useServices();
  const { data: salesData = [], isLoading: loadingSales } = useSales();
  const { data: clientAccounts = [] } = useClientAccounts();
  const createSale = useCreateSale();
  const updateSale = useUpdateSale();
  const deleteSale = useDeleteSale();

  // Map contact_id → account for quick SaaS status lookup
  const accountByContact = Object.fromEntries(clientAccounts.map(a => [a.contact_id, a]));

  // ─── Edit / delete sale modal state ───
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

  // Restore saved metric order from Supabase on first load
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

  const [currentPage, setCurrentPage] = useState(1);
  const salesPerPage = 10;

  const [selectedContact, setSelectedContact] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [saleNotes, setSaleNotes] = useState("");
  const [saleAmount, setSaleAmount] = useState<number | "">("");
  const [saleType, setSaleType] = useState<"initial" | "recurring">("initial");

  // ─── Compute metrics from real data ───
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

  const totalVendido = useMemo(() => {
    return salesData.reduce((sum, s) => sum + s.amount, 0);
  }, [salesData]);

  const salesThisMonth = useMemo(() => {
    const now = new Date();
    return salesData.filter(s => {
      const d = new Date(s.created_at);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
  }, [salesData]);

  // Ingreso Recurrente Estimado: unique (contact, service) pairs grouped by recurring_interval
  const recurringByInterval = useMemo(() => {
    const serviceInfo: Record<string, { interval: string; recPrice: number }> = {};
    for (const s of services) {
      if (s.is_recurring && s.recurring_interval) {
        serviceInfo[s.id] = {
          interval: s.recurring_interval,
          recPrice: s.recurring_price ?? s.price,
        };
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

  const conversionRate = useMemo(() => {
    if (contacts.length === 0) return null;
    const contactsWithSale = new Set(salesData.map(s => s.contact_id).filter(Boolean));
    return Math.round((contactsWithSale.size / contacts.length) * 100);
  }, [contacts, salesData]);

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
        return `${dy} de ${MONTHS_ES[mo - 1]} a las ${hh}:${mm}`;
      }
      case "total-vendido": return `$${totalVendido.toFixed(0)}`;
      case "conversion": return conversionRate !== null ? `${conversionRate}%` : "—";
      case "ventas-mes": return String(salesThisMonth);
      default: return "—";
    }
  };

  // ─── Sales form ───

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sId = e.target.value;
    setSelectedService(sId);
    setSaleType("initial");
    
    const s = services.find(x => x.id === sId);
    if (s) {
      setSaleAmount(s.price);
    } else {
      setSaleAmount("");
    }
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
        contact_id: contact.id,
        contact_name: contact.name,
        service_id: service.id,
        service_name: service.name,
        amount: Number(saleAmount),
        currency: service.currency ?? "USD",
        type: saleType,
        notes: finalNotes || null,
      });

      // ── SaaS trigger: if this is a SaaS service and client has no account yet ──
      const existingAccount = accountByContact[contact.id];
      if ((service as any).is_saas && !existingAccount && user) {
        try {
          const { error } = await supabase.functions.invoke("create-saas-client", {
            body: { contact_id: contact.id, admin_user_id: user.id },
          });
          if (error) throw error;
          toast.success(`Venta registrada · Email de invitación enviado a ${contact.email ?? contact.name}`);
        } catch (saasErr) {
          // Sale succeeded — log SaaS error but don't block
          console.error("create-saas-client failed:", saasErr);
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

  // ─── Sales table ───
  const sales = useMemo(() => salesData.map(s => ({
    id: s.id,
    date: new Date(s.created_at).toLocaleDateString("es-ES"),
    // contact_name es el snapshot guardado al crear la venta — sobrevive al borrado del contacto
    contactName: s.contact_name ?? contacts.find(c => c.id === s.contact_id)?.name ?? "Contacto eliminado",
    serviceName: s.service_name ?? "Servicio eliminado",
    amount: s.amount,
    notes: s.notes ?? "",
  })), [salesData, contacts]);

  const indexOfLastSale = currentPage * salesPerPage;
  const indexOfFirstSale = indexOfLastSale - salesPerPage;
  const currentSales = sales.slice(indexOfFirstSale, indexOfLastSale);
  const totalPages = Math.ceil(sales.length / salesPerPage);

  const visibleMetrics = metrics.filter(m => isSuperAdmin || !m.isAdmin);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

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

    // Persist order to Supabase
    upsertProfile.mutate({ metrics_order: items.map(m => m.id) });
  };

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
            {/* Resumen de la venta */}
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
                    type="number"
                    min={0}
                    step={0.01}
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
                    rows={2}
                    className="text-sm resize-none"
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
                rows={2}
                className="text-sm resize-none"
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Resumen</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Panel de gestión de tu negocio</p>
        </div>
        <Button 
          variant={isEditing ? "default" : "outline"} 
          size="sm" 
          onClick={() => setIsEditing(!isEditing)}
          className="shrink-0 flex items-center gap-1.5"
        >
          <Settings2 size={14} className={isEditing ? "animate-spin-slow" : ""} />
          {isEditing ? "Terminar edición" : "Personalizar panel"}
        </Button>
      </div>

      {/* Métricas Combinadas */}
      <div className={isEditing ? "p-4 border-2 border-dashed border-primary/20 rounded-3xl bg-primary/5" : ""}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {visibleMetrics.map((m) => (
            <div
              key={m.id}
              className={`bg-card border rounded-2xl p-5 relative transition-all ${
                isEditing ? "cursor-grab active:cursor-grabbing hover:border-primary/50 shadow-sm" : ""
              } ${draggedId === m.id ? "opacity-50 scale-95" : ""}`}
              draggable={isEditing}
              onDragStart={() => setDraggedId(m.id)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(m.id)}
              onDragEnd={() => setDraggedId(null)}
            >
              {isEditing && (
                <div className="absolute top-3 right-3 text-muted-foreground/30 hover:text-primary transition-colors">
                  <GripVertical size={16} />
                </div>
              )}
              <m.icon size={16} className={`mb-4 ${isEditing ? "text-primary" : "text-muted-foreground"}`} />
              <p className="text-2xl font-semibold text-foreground">{getMetricValue(m.id)}</p>
              <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
            </div>
          ))}

          {/* Ingreso Recurrente Estimado — una card por intervalo */}
          {isSuperAdmin && recurringByInterval.map(({ interval, total }) => (
            <div key={`ire-${interval}`} className="bg-card border border-primary/20 rounded-2xl p-5 relative">
              <RefreshCcw size={16} className="mb-4 text-primary/60" />
              <p className="text-2xl font-semibold text-foreground">${total.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                IRE {INTERVAL_LABELS[interval] ?? interval}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Citas del día + Nuevos contactos */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Citas de hoy */}
        <div className="bg-card border rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-sm font-semibold">Citas de hoy</h2>
          </div>
          {todayAppointments.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <CalendarDays size={24} className="text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No hay citas agendadas para hoy.</p>
            </div>
          ) : (
            <div className="divide-y">
              {todayAppointments.map((a) => {
                const contact = contacts.find(c => c.id === a.contact_id);
                return (
                  <div key={a.id} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{contact?.name ?? "Sin contacto"}</p>
                      <p className="text-xs text-muted-foreground">{a.service ?? ""}</p>
                    </div>
                    <span className="text-xs font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">
                      {String(a.hour).padStart(2, "0")}:{String(a.minute ?? 0).padStart(2, "0")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Nuevos contactos esta semana */}
        <div className="bg-card border rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h2 className="text-sm font-semibold">Nuevos esta semana</h2>
            <span className="text-xs font-semibold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
              {newContactsThisWeek.length}
            </span>
          </div>
          {newContactsThisWeek.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Users size={24} className="text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Sin nuevos contactos esta semana.</p>
            </div>
          ) : (
            <div className="divide-y">
              {newContactsThisWeek.slice(0, 8).map((c) => (
                <div key={c.id} className="px-6 py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    {c.email && <p className="text-xs text-muted-foreground truncate">{c.email}</p>}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 ml-3">
                    {new Date(c.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Registrar Venta */}
      {canCreateSale && <div className="bg-card border rounded-2xl p-6">
        <h2 className="text-sm font-semibold mb-4">Registrar Venta</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Contacto</label>
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              type="number"
              value={saleAmount}
              onChange={(e) => setSaleAmount(e.target.value as any)}
              min={0}
              placeholder="0.00"
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
            if (s && s.is_recurring) {
              return (
                <div className="md:col-span-4 p-3 bg-secondary/30 rounded-xl border border-secondary">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Tipo de cobro para este servicio</p>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input 
                        type="radio" 
                        name="saleType" 
                        checked={saleType === "initial"} 
                        onChange={() => {
                           setSaleType("initial");
                           setSaleAmount(s.price);
                        }} 
                        className="text-primary focus:ring-primary h-4 w-4 accent-primary" 
                      />
                      Pago Inicial (${s.price})
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="saleType"
                        checked={saleType === "recurring"}
                        onChange={() => {
                           setSaleType("recurring");
                           setSaleAmount(s.recurring_price ?? s.price);
                        }}
                        className="text-primary focus:ring-primary h-4 w-4 accent-primary"
                      />
                      Pago Recurrente{s.recurring_price ? ` ($${s.recurring_price}${s.recurring_interval ? ` ${s.recurring_interval}` : ""})` : ""}
                    </label>
                  </div>
                </div>
              );
            }
            return null;
          })()}
        </div>
        <div className="mt-4 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Notas (Opcional)</label>
          <Input
            type="text"
            value={saleNotes}
            onChange={(e) => setSaleNotes(e.target.value)}
            placeholder="Detalles sobre esta venta, método de pago..."
            className="h-10"
          />
        </div>
      </div>}

      {/* Historial de Ventas */}
      <div className="bg-card border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-sm font-semibold">Historial de Ventas</h2>
        </div>
        {loadingSales ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : sales.length === 0 ? (
          <div className="px-6 py-12 text-center text-muted-foreground">
            <DollarSign size={24} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No hay ventas registradas.</p>
            <p className="text-xs mt-1">Utiliza el formulario de arriba para registrar tu primera venta.</p>
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
                  {currentSales.map((sale) => {
                    const raw = salesData.find(s => s.id === sale.id)!;
                    return (
                      <tr key={sale.id} className="hover:bg-secondary/30 transition-colors group">
                        <td className="px-6 py-3 whitespace-nowrap text-muted-foreground text-xs">{sale.date}</td>
                        <td className="px-6 py-3 font-medium">{sale.contactName}</td>
                        <td className="px-6 py-3">{sale.serviceName}</td>
                        <td className="px-6 py-3 font-semibold text-primary text-right">${sale.amount.toFixed(2)}</td>
                        <td className="px-6 py-3 text-muted-foreground text-xs truncate max-w-[160px]">{sale.notes || "-"}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {canEditSale && <button
                              onClick={() => openEditSale(raw)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                              title="Editar transacción"
                            >
                              <Pencil size={13} />
                            </button>}
                            {canDeleteSale && <button
                              onClick={() => openDeleteSale(raw)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              title="Eliminar transacción"
                            >
                              <Trash2 size={13} />
                            </button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="px-6 py-3 border-t flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Mostrando {indexOfFirstSale + 1} a {Math.min(indexOfLastSale, sales.length)} de {sales.length}
                </span>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 px-2 text-xs"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  >
                    Anterior
                  </Button>
                  <div className="flex items-center mx-1">
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`w-6 h-6 rounded flex items-center justify-center text-xs font-medium transition-colors ${
                          currentPage === i + 1 
                            ? "bg-primary text-primary-foreground" 
                            : "hover:bg-secondary text-muted-foreground"
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 px-2 text-xs"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default CrmOverview;
