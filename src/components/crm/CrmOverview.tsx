import { CalendarDays, Users, Clock, FolderOpen, CheckCircle, DollarSign, GripVertical, Settings2, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// {VAR_DB} — todos los valores numéricos vienen de Supabase

interface Sale {
  id: string;
  date: string;
  contactName: string;
  serviceName: string;
  amount: number;
  notes: string;
}

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

// {VAR_DB} — citas del día desde Supabase
const todayAppointments: { time: string; name: string; service: string }[] = [];

// {VAR_DB} — mocks
const dummyContacts = [
  { id: "c1", name: "{VAR_DB} - Juan Pérez" },
  { id: "c2", name: "{VAR_DB} - María Gómez" }
];

const dummyServices = [
  { id: "s1", name: "{VAR_DB} - Consultoría Básica", price: 500, monthlyPrice: 49 },
  { id: "s2", name: "{VAR_DB} - Desarrollo Web", price: 1500, monthlyPrice: 0 }
];

const initialSales: Sale[] = [
  {
    id: "sale-1",
    date: new Date().toLocaleDateString(),
    contactName: "{VAR_DB} - Cliente Piloto",
    serviceName: "{VAR_DB} - Consultoría Básica",
    amount: 500,
    notes: "[Pago Inicial] Confirmado por transferencia."
  }
];

const CrmOverview = ({ isSuperAdmin = false }: { isSuperAdmin?: boolean }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const [sales, setSales] = useState<Sale[]>(initialSales);
  const [currentPage, setCurrentPage] = useState(1);
  const salesPerPage = 10;

  const [selectedContact, setSelectedContact] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [saleNotes, setSaleNotes] = useState("");
  const [saleAmount, setSaleAmount] = useState<number | "">("");
  const [saleType, setSaleType] = useState<"setup" | "recurrent">("setup");

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sId = e.target.value;
    setSelectedService(sId);
    setSaleType("setup");
    
    const s = dummyServices.find(x => x.id === sId);
    if (s) {
      setSaleAmount(s.price);
    } else {
      setSaleAmount("");
    }
  };

  const handleRegisterSale = () => {
    if (!selectedContact || !selectedService || saleAmount === "" || isNaN(Number(saleAmount))) return;
    
    const contact = dummyContacts.find(c => c.id === selectedContact);
    const service = dummyServices.find(s => s.id === selectedService);
    if (!contact || !service) return;

    let finalNotes = saleNotes;
    if (service.monthlyPrice > 0) {
        const typeLabel = saleType === "setup" ? "Pago Inicial" : "Pago Recurrente";
        finalNotes = finalNotes ? `[${typeLabel}] ${finalNotes}` : `[${typeLabel}]`;
    }

    const newSale: Sale = {
        id: Date.now().toString(),
        date: new Date().toLocaleDateString(),
        contactName: contact.name,
        serviceName: service.name,
        amount: Number(saleAmount),
        notes: finalNotes
    };
    setSales([newSale, ...sales]);
    setSelectedContact("");
    setSelectedService("");
    setSaleNotes("");
    setSaleAmount("");
    setSaleType("setup");
    setCurrentPage(1);
  };

  const indexOfLastSale = currentPage * salesPerPage;
  const indexOfFirstSale = indexOfLastSale - salesPerPage;
  const currentSales = sales.slice(indexOfFirstSale, indexOfLastSale);
  const totalPages = Math.ceil(sales.length / salesPerPage);

  const visibleMetrics = metrics.filter(m => isSuperAdmin || !m.isAdmin);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
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
              <p className="text-2xl font-semibold text-foreground">—</p>
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
              {/* {VAR_DB} — citas del día */}
              No hay citas agendadas para hoy.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {todayAppointments.map((a, i) => (
              <div key={i} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.service}</p>
                </div>
                <span className="text-xs font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">
                  {a.time}
                </span>
              </div>
            ))}
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
              {dummyContacts.map(c => (
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
              {dummyServices.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
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
          <Button onClick={handleRegisterSale} className="h-10 w-full" disabled={!selectedContact || !selectedService || saleAmount === ""}>
            <Plus size={16} className="mr-1.5" /> Registrar Venta
          </Button>

          {(() => {
            const s = dummyServices.find(x => x.id === selectedService);
            if (s && s.monthlyPrice > 0) {
              return (
                <div className="md:col-span-4 p-3 bg-secondary/30 rounded-xl border border-secondary">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Tipo de cobro para este servicio</p>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input 
                        type="radio" 
                        name="saleType" 
                        checked={saleType === "setup"} 
                        onChange={() => {
                           setSaleType("setup");
                           setSaleAmount(s.price);
                        }} 
                        className="text-primary focus:ring-primary h-4 w-4 accent-primary" 
                      />
                      Pago Inicial / Setup (${s.price})
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input 
                        type="radio" 
                        name="saleType" 
                        checked={saleType === "recurrent"} 
                        onChange={() => {
                           setSaleType("recurrent");
                           setSaleAmount(s.monthlyPrice);
                        }} 
                        className="text-primary focus:ring-primary h-4 w-4 accent-primary" 
                      />
                      Pago Recurrente (${s.monthlyPrice})
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
        {sales.length === 0 ? (
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
