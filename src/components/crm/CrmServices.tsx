import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ArrowLeft, Settings, Briefcase, DollarSign } from "lucide-react";

// {VAR_DB} — servicios se guardarán en Supabase por negocio

export interface ServiceConfig {
  id: string;
  name: string;
  description: string;
  benefits: string[];
  price: number;
}

// {VAR_DB}
const dummyServices: ServiceConfig[] = [
  {
    id: "svc-1",
    name: "{VAR_DB}",
    description: "{VAR_DB}",
    benefits: ["{VAR_DB}", "{VAR_DB}", "{VAR_DB}"],
    price: 0,
  },
];

// ─── Service Editor ──────────────────────────────────────────────────
const ServiceEditor = ({
  service,
  onBack,
  onUpdate,
}: {
  service: ServiceConfig;
  onBack: () => void;
  onUpdate: (s: ServiceConfig) => void;
}) => {
  const [name, setName] = useState(service.name);
  const [description, setDescription] = useState(service.description);
  const [benefits, setBenefits] = useState<string[]>(service.benefits);
  const [price, setPrice] = useState(service.price);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onUpdate({ ...service, name, description, benefits, price });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-3 transition-colors"
          >
            <ArrowLeft size={12} />
            Volver a servicios
          </button>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-xl font-semibold border-none h-auto p-0 px-2 -ml-2 hover:bg-secondary/50 focus-visible:ring-0 w-full max-w-sm mb-1"
            placeholder="Nombre del servicio"
          />
          <p className="text-sm text-muted-foreground px-2 -ml-2">
            Configura los detalles de este servicio
          </p>
        </div>
        <Button onClick={handleSave} className="h-9 rounded-xl text-sm font-medium px-5">
          {saved ? "Guardado ✓" : "Guardar cambios"}
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Info general */}
        <div className="bg-card border rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <Briefcase size={15} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold">Información general</h2>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Nombre del servicio</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 text-sm"
              placeholder="Ej: Consultoría Estratégica"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              placeholder="Describe brevemente qué incluye este servicio"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <DollarSign size={12} />
              Precio (USD)
            </label>
            <Input
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="h-10 text-sm"
              min={0}
            />
          </div>
        </div>

        {/* Beneficios */}
        <div className="bg-card border rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <Settings size={15} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold">Beneficios</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Lista los beneficios principales que ofrece este servicio
          </p>

          <div className="space-y-2">
            {benefits.map((b, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={b}
                  onChange={(e) => {
                    const copy = [...benefits];
                    copy[i] = e.target.value;
                    setBenefits(copy);
                  }}
                  className="h-9 text-sm flex-1"
                  placeholder={`Beneficio ${i + 1}`}
                />
                <button
                  onClick={() => setBenefits(benefits.filter((_, idx) => idx !== i))}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <button
              onClick={() => setBenefits([...benefits, ""])}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
            >
              <Plus size={12} /> Añadir beneficio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main: Services Library ─────────────────────────────────────────
const CrmServices = () => {
  const [view, setView] = useState<"list" | "editor">("list");
  const [services, setServices] = useState<ServiceConfig[]>(dummyServices);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = services.find((s) => s.id === selectedId);

  const handleCreateNew = () => {
    const newSvc: ServiceConfig = {
      id: `svc-${Date.now()}`,
      name: "Nuevo Servicio",
      description: "",
      benefits: [""],
      price: 0,
    };
    setServices([...services, newSvc]);
    setSelectedId(newSvc.id);
    setView("editor");
  };

  const handleEdit = (id: string) => {
    setSelectedId(id);
    setView("editor");
  };

  const handleDelete = (id: string) => {
    setServices(services.filter((s) => s.id !== id));
  };

  if (view === "editor" && selected) {
    return (
      <ServiceEditor
        service={selected}
        onBack={() => setView("list")}
        onUpdate={(updated) =>
          setServices(services.map((s) => (s.id === updated.id ? updated : s)))
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Servicios</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Define los servicios que ofreces a tus clientes
          </p>
        </div>
        <Button
          onClick={handleCreateNew}
          className="h-9 rounded-xl text-sm font-medium px-4 gap-2"
        >
          <Plus size={16} /> Crear nuevo
        </Button>
      </div>

      <div className="grid gap-4">
        {services.length === 0 ? (
          <div className="text-center py-12 bg-card border rounded-2xl">
            <Briefcase size={32} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium">No hay servicios creados.</p>
          </div>
        ) : (
          services.map((svc) => (
            <div
              key={svc.id}
              className="bg-card border rounded-2xl p-5 flex items-center justify-between group"
            >
              <div
                className="flex items-center gap-4 cursor-pointer flex-1"
                onClick={() => handleEdit(svc.id)}
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Briefcase size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold group-hover:text-primary transition-colors">
                    {svc.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {svc.description || "Sin descripción"}
                  </p>
                </div>
                <div className="text-right shrink-0 mr-4">
                  <p className="text-sm font-bold text-foreground">
                    ${svc.price.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {svc.benefits.filter(Boolean).length} beneficios
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground hover:bg-secondary"
                  onClick={() => handleEdit(svc.id)}
                >
                  <Settings size={15} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => handleDelete(svc.id)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CrmServices;
