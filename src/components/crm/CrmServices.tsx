import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ArrowLeft, Settings, Briefcase, DollarSign, Loader2 } from "lucide-react";
import { useServices, useCreateService, useUpdateService, useDeleteService } from "@/hooks/useCrmData";
import { toast } from "sonner";

// {VAR_DB} — servicios se guardan en Supabase

export interface ServiceConfig {
  id: string;
  name: string;
  description: string;
  benefits: string[];
  price: number;
  monthlyPrice?: number;
  billingFrequency?: string;
  deliveryTime?: string;
  isRecommended?: boolean;
  is_recurring?: boolean;
}

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
  const [monthlyPrice, setMonthlyPrice] = useState(service.monthlyPrice || 0);
  const [billingFrequency, setBillingFrequency] = useState(service.billingFrequency || "");
  const [deliveryTime, setDeliveryTime] = useState(service.deliveryTime || "");
  const [isRecommended, setIsRecommended] = useState(service.isRecommended || false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate({ ...service, name, description, benefits, price, monthlyPrice, billingFrequency, deliveryTime, isRecommended });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
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
        <Button onClick={handleSave} disabled={saving} className="h-9 rounded-xl text-sm font-medium px-5">
          {saving ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
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
              placeholder="Ej: Diseño Web, Corte de Cabello, etc."
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <DollarSign size={12} />
                Precio Base / Inicial
              </label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="h-10 text-sm"
                min={0}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <DollarSign size={12} />
                Info de cobro recurrente
              </label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={monthlyPrice}
                  onChange={(e) => setMonthlyPrice(Number(e.target.value))}
                  className="h-10 text-sm w-1/3"
                  min={0}
                  placeholder="0"
                />
                <Input
                  type="text"
                  value={billingFrequency}
                  onChange={(e) => setBillingFrequency(e.target.value)}
                  className="h-10 text-sm flex-1"
                  placeholder="Frecuencia (Ej: mensual, o /sesión)"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Duración / Entrega (Opcional)</label>
            <Input
              type="text"
              value={deliveryTime}
              onChange={(e) => setDeliveryTime(e.target.value)}
              className="h-10 text-sm"
              placeholder="Ej: 3–5 días, o 1 hora"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input 
              type="checkbox"
              id="isRecommended"
              checked={isRecommended}
              onChange={(e) => setIsRecommended(e.target.checked)}
              className="rounded border-input text-primary focus:ring-primary h-4 w-4"
            />
            <label htmlFor="isRecommended" className="text-sm font-medium leading-none cursor-pointer">
              Etiqueta de "Recomendado / Destacado"
            </label>
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

// Helper: serialize ServiceConfig to DB row
function toDbRow(svc: ServiceConfig) {
  return {
    name: svc.name,
    price: svc.price,
    description: JSON.stringify({
      text: svc.description,
      benefits: svc.benefits,
      monthlyPrice: svc.monthlyPrice,
      billingFrequency: svc.billingFrequency,
      deliveryTime: svc.deliveryTime,
      isRecommended: svc.isRecommended,
    }),
    is_recurring: (svc.monthlyPrice ?? 0) > 0,
  };
}

// Helper: deserialize DB row to ServiceConfig
function fromDbRow(row: any): ServiceConfig {
  let meta: any = {};
  try { meta = JSON.parse(row.description ?? "{}"); } catch { /* */ }
  return {
    id: row.id,
    name: row.name,
    description: meta.text ?? "",
    benefits: meta.benefits ?? [],
    price: Number(row.price) || 0,
    monthlyPrice: meta.monthlyPrice ?? 0,
    billingFrequency: meta.billingFrequency ?? "",
    deliveryTime: meta.deliveryTime ?? "",
    isRecommended: meta.isRecommended ?? false,
    is_recurring: row.is_recurring,
  };
}

// ─── Main: Services Library ─────────────────────────────────────────
const CrmServices = () => {
  const { data: rawServices = [], isLoading } = useServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const services: ServiceConfig[] = rawServices.map(fromDbRow);

  const [view, setView] = useState<"list" | "editor">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = services.find((s) => s.id === selectedId);

  const handleCreateNew = async () => {
    try {
      const { id } = await createService.mutateAsync({
        name: "Nuevo Servicio",
        price: 0,
        description: JSON.stringify({ text: "", benefits: [""], monthlyPrice: 0, billingFrequency: "", deliveryTime: "", isRecommended: false }),
        is_recurring: false,
      });
      setSelectedId(id);
      setView("editor");
    } catch {
      toast.error("Error al crear servicio");
    }
  };

  const handleEdit = (id: string) => {
    setSelectedId(id);
    setView("editor");
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteService.mutateAsync(id);
      toast.success("Servicio eliminado");
    } catch {
      toast.error("Error al eliminar");
    }
  };

  if (view === "editor" && selected) {
    return (
      <ServiceEditor
        service={selected}
        onBack={() => setView("list")}
        onUpdate={async (updated) => {
          try {
            await updateService.mutateAsync({ id: updated.id, ...toDbRow(updated) });
            toast.success("Servicio actualizado");
          } catch {
            toast.error("Error al actualizar");
          }
        }}
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
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : services.length === 0 ? (
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
                    {svc.monthlyPrice ? <span className="text-muted-foreground text-xs font-normal"> + ${svc.monthlyPrice.toFixed(2)}{svc.billingFrequency ? ` ${svc.billingFrequency}` : ''}</span> : ""}
                  </p>
                  <div className="flex items-center justify-end gap-2 mt-0.5">
                    {svc.isRecommended && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                        Top
                      </span>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      {svc.benefits.filter(Boolean).length} beneficios
                    </p>
                  </div>
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
