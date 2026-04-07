import { CalendarDays, Users, Clock, FolderOpen, CheckCircle, DollarSign, GripVertical, Settings2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

// {VAR_DB} — todos los valores numéricos vienen de Supabase

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

const CrmOverview = ({ isSuperAdmin = false }: { isSuperAdmin?: boolean }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [draggedId, setDraggedId] = useState<string | null>(null);

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
    </div>
  );
};

export default CrmOverview;
