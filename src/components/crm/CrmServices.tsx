import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ArrowLeft, Settings, Briefcase, DollarSign, Loader2, GripVertical, Tag } from "lucide-react";
import { useServices, useCreateService, useUpdateService, useDeleteService } from "@/hooks/useCrmData";
import type { CrmService } from "@/lib/supabase";
import { toast } from "sonner";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ─── Service Editor ──────────────────────────────────────────────────
const ServiceEditor = ({
  service,
  isSuperAdmin,
  onBack,
  onUpdate,
}: {
  service: CrmService;
  isSuperAdmin: boolean;
  onBack: () => void;
  onUpdate: (s: Partial<CrmService>) => Promise<void>;
}) => {
  const [name, setName]                     = useState(service.name);
  const [description, setDescription]       = useState(service.description ?? "");
  const [benefits, setBenefits]             = useState<string[]>(service.benefits ?? []);
  const [price, setPrice]                   = useState(service.price);
  const [recurringPrice, setRecurringPrice] = useState(service.recurring_price ?? 0);
  const [recurringInterval, setRecurringInterval] = useState(service.recurring_interval ?? "");
  const [recurringLabel, setRecurringLabel] = useState(service.recurring_label ?? "");
  const [deliveryTime, setDeliveryTime]     = useState(service.delivery_time ?? "");
  const [isRecommended, setIsRecommended]   = useState(service.is_recommended ?? false);
  const [active, setActive]                 = useState(service.active ?? true);
  const [isSaas, setIsSaas]                 = useState(service.is_saas ?? false);
  const [discountPct, setDiscountPct]       = useState(service.discount_pct ?? 0);
  const [saving, setSaving] = useState(false);

  const discountedPrice = discountPct > 0 ? price * (1 - discountPct / 100) : null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate({
        name,
        description: description || null,
        benefits,
        price,
        recurring_price: recurringPrice > 0 ? recurringPrice : null,
        recurring_interval: recurringInterval || null,
        recurring_label: recurringLabel || null,
        is_recurring: recurringPrice > 0,
        delivery_time: deliveryTime || null,
        is_recommended: isRecommended,
        active,
        is_saas: isSaas,
        discount_pct: discountPct,
      });
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
        <div className="flex items-center gap-3">
          {/* Activo / Inactivo */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => setActive(!active)}
              className={`relative w-10 h-5 rounded-full transition-colors ${active ? "bg-primary" : "bg-secondary"}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${active ? "translate-x-5" : ""}`} />
            </div>
            <span className="text-xs font-medium text-muted-foreground">{active ? "Activo" : "Inactivo"}</span>
          </label>
          <Button onClick={handleSave} disabled={saving} className="h-9 rounded-xl text-sm font-medium px-5">
            {saving && <Loader2 size={14} className="animate-spin mr-2" />}
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
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
              placeholder="Ej: Diseño Web, Corte de Cabello..."
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

          {/* Precio */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <DollarSign size={12} />
                Precio base / Inicial
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
                <Tag size={12} />
                Descuento (%)
              </label>
              <div className="relative">
                <Input
                  type="number"
                  value={discountPct}
                  onChange={(e) => setDiscountPct(Math.max(0, Math.min(100, Number(e.target.value))))}
                  className="h-10 text-sm pr-8"
                  min={0}
                  max={100}
                  placeholder="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
              {discountedPrice !== null && (
                <p className="text-xs text-primary font-medium">
                  Precio con descuento: ${discountedPrice.toFixed(2)}
                </p>
              )}
            </div>
          </div>

          {/* Cobro recurrente */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-muted-foreground">Cobro recurrente (opcional)</label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground/70">Precio</span>
                <Input
                  type="number"
                  value={recurringPrice}
                  onChange={(e) => setRecurringPrice(Number(e.target.value))}
                  className="h-9 text-sm"
                  min={0}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground/70">Intervalo</span>
                <Input
                  type="text"
                  value={recurringInterval}
                  onChange={(e) => setRecurringInterval(e.target.value)}
                  className="h-9 text-sm"
                  placeholder="mensual, anual..."
                />
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground/70">Etiqueta visible (ej: Mantenimiento)</span>
              <Input
                type="text"
                value={recurringLabel}
                onChange={(e) => setRecurringLabel(e.target.value)}
                className="h-9 text-sm"
                placeholder="Mantenimiento, Soporte..."
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Tiempo de entrega</label>
            <Input
              type="text"
              value={deliveryTime}
              onChange={(e) => setDeliveryTime(e.target.value)}
              className="h-10 text-sm"
              placeholder="Ej: 3–5 días, 1 hora"
            />
          </div>

          {/* Checkboxes */}
          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isRecommended}
                onChange={(e) => setIsRecommended(e.target.checked)}
                className="rounded border-input h-4 w-4 accent-primary"
              />
              <span className="text-sm font-medium">Etiqueta "Recomendado / Destacado"</span>
            </label>

            {isSuperAdmin && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSaas}
                  onChange={(e) => setIsSaas(e.target.checked)}
                  className="rounded border-input h-4 w-4 accent-primary"
                />
                <span className="text-sm font-medium">
                  Servicio SaaS{" "}
                  <span className="text-xs text-muted-foreground">(activa CRM para el cliente al venderlo)</span>
                </span>
              </label>
            )}
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

// ─── Sortable Service Item ──────────────────────────────────────────
const SortableServiceItem = ({
  svc,
  handleEdit,
  handleDelete,
}: {
  svc: CrmService;
  handleEdit: (id: string) => void;
  handleDelete: (id: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: svc.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-card border rounded-2xl p-5 flex items-center justify-between group ${isDragging ? "shadow-lg border-primary/50" : ""} ${!svc.active ? "opacity-60" : ""}`}
    >
      <div
        className="flex items-center gap-2 cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-foreground transition-colors p-1 -ml-2 select-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={18} />
      </div>
      <div
        className="flex items-center gap-4 cursor-pointer flex-1 ml-2"
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
            {svc.discount_pct > 0 ? (
              <>
                <span className="line-through text-muted-foreground font-normal mr-1">${svc.price.toFixed(2)}</span>
                <span className="text-primary">${(svc.price * (1 - svc.discount_pct / 100)).toFixed(2)}</span>
              </>
            ) : (
              `$${svc.price.toFixed(2)}`
            )}
            {svc.recurring_price != null && svc.recurring_price > 0 && (
              <span className="text-muted-foreground text-xs font-normal">
                {" "}+ ${svc.recurring_price.toFixed(2)}{svc.recurring_interval ? ` ${svc.recurring_interval}` : ""}
              </span>
            )}
          </p>
          <div className="flex items-center justify-end gap-2 mt-0.5">
            {!svc.active && (
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                Inactivo
              </span>
            )}
            {svc.is_saas && (
              <span className="text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                SaaS
              </span>
            )}
            {svc.is_recommended && (
              <span className="text-[9px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                Recomendado
              </span>
            )}
            <p className="text-[10px] text-muted-foreground">
              {svc.benefits?.filter(Boolean).length ?? 0} beneficios
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
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
  );
};

// ─── Main: Services Library ─────────────────────────────────────────
const CrmServices = ({ isSuperAdmin = false }: { isSuperAdmin?: boolean }) => {
  const { data: services = [], isLoading } = useServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  // Local order state for drag-and-drop optimistic updates
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  useEffect(() => {
    setOrderedIds(services.map((s) => s.id));
  }, [services]);

  const orderedServices = orderedIds
    .map((id) => services.find((s) => s.id === id))
    .filter((s): s is CrmService => s != null);

  const [view, setView] = useState<"list" | "editor">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const selected = services.find((s) => s.id === selectedId);

  const handleCreateNew = async () => {
    try {
      const created = await createService.mutateAsync({
        name: "Nuevo Servicio",
        price: 0,
        description: null,
        benefits: [],
        is_recurring: false,
        is_recommended: false,
        active: true,
        is_saas: false,
        discount_pct: 0,
      });
      setSelectedId(created.id);
      setView("editor");
    } catch {
      toast.error("Error al crear servicio");
    }
  };

  const handleEdit = (id: string) => {
    setSelectedId(id);
    setView("editor");
  };

  const handleDelete = (id: string) => {
    const svc = services.find((s) => s.id === id);
    setDeleteTarget({ id, name: svc?.name ?? id });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteService.mutateAsync({ id: deleteTarget.id, name: deleteTarget.name });
      toast.success("Servicio eliminado");
    } catch {
      toast.error("Error al eliminar");
    } finally {
      setDeleteTarget(null);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedIds.indexOf(String(active.id));
    const newIndex = orderedIds.indexOf(String(over.id));
    const newOrder = arrayMove(orderedIds, oldIndex, newIndex);

    setOrderedIds(newOrder);

    try {
      await Promise.all(
        newOrder.map((id, idx) => updateService.mutateAsync({ id, sort_order: idx }))
      );
    } catch {
      toast.error("Error al reordenar");
      setOrderedIds(orderedIds);
    }
  };

  if (view === "editor" && selected) {
    return (
      <ServiceEditor
        service={selected}
        isSuperAdmin={isSuperAdmin}
        onBack={() => setView("list")}
        onUpdate={async (updates) => {
          try {
            await updateService.mutateAsync({ id: selected.id, ...updates });
            toast.success("Servicio actualizado");
          } catch {
            toast.error("Error al actualizar");
          }
        }}
      />
    );
  }

  return (
    <>
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={handleConfirmDelete}
        isPending={deleteService.isPending}
        description="Se eliminará el servicio permanentemente."
      />
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
            disabled={createService.isPending}
            className="h-9 rounded-xl text-sm font-medium px-4 gap-2"
          >
            {createService.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={16} />}
            Crear nuevo
          </Button>
        </div>

        <div className="grid gap-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : orderedServices.length === 0 ? (
            <div className="text-center py-12 bg-card border rounded-2xl">
              <Briefcase size={32} className="mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium">No hay servicios creados.</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
                <div className="grid gap-4">
                  {orderedServices.map((svc) => (
                    <SortableServiceItem
                      key={svc.id}
                      svc={svc}
                      handleEdit={handleEdit}
                      handleDelete={handleDelete}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    </>
  );
};

export default CrmServices;
