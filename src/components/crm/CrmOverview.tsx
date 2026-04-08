import { CalendarDays, Users, Clock, FolderOpen, CheckCircle, DollarSign, GripVertical, Settings2, Plus, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useContacts, useAppointments, useServices, useSales, useCreateSale } from "@/hooks/useCrmData";
import { toast } from "sonner";

const initialMetrics = [
  // Métricas de Admin
  { id: "proyectos-activos", icon: FolderOpen,   label: "Proyectos activos", isAdmin: true },
  { id: "entregados-mes", icon: CheckCircle,  label: "Entregados (mes)",  isAdmin: true },
  { id: "mrr", icon: DollarSign,   label: "MRR", isAdmin: true },
  // Métricas de CRM
  { id: "citas-hoy", icon: CalendarDays, label: "Citas hoy",       isAdmin: false },
  { id: "total-contactos", icon: Users,        label: "Total contactos", isAdmin: false },
  { id: "proxima-cita", icon: Clock,        label: "Próxima cita", isAdmin: false },
];

const CrmOverview = ({ isSuperAdmin = false }: { isSuperAdmin?: boolean }) => {
  // ─── Supabase hooks ───
  const { data: contacts = [] } = useContacts();
  const { data: appointments = [] } = useAppointments();
  const { data: services = [] } = useServices();
  const { data: salesData = [], isLoading: loadingSales } = useSales();
  const createSale = useCreateSale();

  const [isEditing, setIsEditing] = useState(false);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [draggedId, setDraggedId] = useState<string | null>(null);

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
        d.setHours(a.hour, 0, 0, 0);
        return d >= now;
      })
      .sort((a, b) => {
        const da = new Date(a.date); da.setHours(a.hour);
        const db = new Date(b.date); db.setHours(b.hour);
        return da.getTime() - db.getTime();
      });
    return upcoming[0] ?? null;
  }, [appointments]);

  const mrr = useMemo(() => {
    return salesData
      .filter(s => s.type === "recurring")
      .reduce((sum, s) => sum + s.amount, 0);
  }, [salesData]);

  const getMetricValue = (id: string) => {
    switch (id) {
      case "citas-hoy": return String(todayAppointments.length);
      case "total-contactos": return String(contacts.length);
      case "proxima-cita": {
        if (!nextAppointment) return "—";
        return `${nextAppointment.date} ${String(nextAppointment.hour).padStart(2, "0")}:00`;
      }
      case "mrr": return `$${mrr.toFixed(0)}`;
      case "proyectos-activos": return String(contacts.filter(c => c.stage === "client").length);
      case "entregados-mes": return "—";
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
        service_id: service.id,
        service_name: service.name,
        amount: Number(saleAmount),
        currency: service.currency ?? "USD",
        type: saleType,
        notes: finalNotes || null,
      });
      toast.success("Venta registrada");
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
    contactName: contacts.find(c => c.id === s.contact_id)?.name ?? "—",
    serviceName: s.service_name ?? "—",
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
  };

  return (
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
        </div>
      </div>

      {/* Citas del día */}
      <div className="bg-card border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-sm font-semibold">Citas de hoy</h2>
        </div>
        {todayAppointments.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <CalendarDays size={24} className="text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No hay citas agendadas para hoy.
            </p>
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
                    {String(a.hour).padStart(2, "0")}:00
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Registrar Venta */}
      <div className="bg-card border rounded-2xl p-6">
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
                           // Use same price for recurring for now
                           setSaleAmount(s.price);
                        }} 
                        className="text-primary focus:ring-primary h-4 w-4 accent-primary" 
                      />
                      Pago Recurrente
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
      </div>

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
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {currentSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-6 py-3 whitespace-nowrap text-muted-foreground text-xs">{sale.date}</td>
                      <td className="px-6 py-3 font-medium">{sale.contactName}</td>
                      <td className="px-6 py-3">{sale.serviceName}</td>
                      <td className="px-6 py-3 font-semibold text-primary text-right">${sale.amount.toFixed(2)}</td>
                      <td className="px-6 py-3 text-muted-foreground text-xs truncate max-w-[200px]">{sale.notes || "-"}</td>
                    </tr>
                  ))}
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
  );
};

export default CrmOverview;
