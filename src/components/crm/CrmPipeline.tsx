import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, GripVertical, Settings2, Check, ChevronDown, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useDeals, useCreateDeal, useUpdateDeal, useDeleteDeal, useContacts, useForms } from "@/hooks/useCrmData";
import { toast } from "sonner";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";

// ─── Default stage names ───
const DEFAULT_STAGES = ["Nuevo Lead", "Contactado", "Negociación", "Cerrado"];

type Card = { 
  id: string; 
  name: string; 
  email: string; 
  value?: string;
  contactId?: string | null;
  customFields?: { label: string; value: string }[];
};
type Column = { id: string; name: string; cards: Card[] };

const CrmPipeline = () => {
  const { data: deals = [], isLoading } = useDeals();
  const { data: contacts = [] } = useContacts();
  const { data: forms = [] } = useForms();
  const createDeal = useCreateDeal();
  const updateDeal = useUpdateDeal();
  const deleteDeal = useDeleteDeal();

  const [stageNames, setStageNames] = useState<string[]>(DEFAULT_STAGES);
  const [editingCol, setEditingCol] = useState<string | null>(null);
  const [editName, setEditName]     = useState("");
  const [newColName, setNewColName] = useState("");
  const [addingCol, setAddingCol]   = useState(false);
  const [dragCard, setDragCard]     = useState<{ card: Card; fromColId: string } | null>(null);
  const [dragOver, setDragOver]     = useState<string | null>(null);

  // Build columns from deals grouped by stages
  const columns: Column[] = useMemo(() => {
    return stageNames.map((stage) => ({
      id: stage,
      name: stage,
      cards: deals
        .filter((d) => d.stage === stage)
        .map((d) => ({
          id: d.id,
          name: d.title,
          email: contacts.find(c => c.id === d.contact_id)?.email ?? "",
          value: d.value ? `$${Number(d.value).toFixed(0)}` : undefined,
          contactId: d.contact_id,
        })),
    }));
  }, [deals, stageNames, contacts]);

  // Available form fields for card configuration
  const availableFormFields = useMemo(() => {
    const fields: { id: string; label: string; formName: string }[] = [];
    forms.forEach((form) => {
      const formFields = Array.isArray(form.fields) ? form.fields : [];
      formFields.forEach((field: any) => {
        if (field.label && field.id) {
          fields.push({ id: `${form.id}__${field.id}`, label: field.label, formName: form.name });
        }
      });
    });
    return fields;
  }, [forms]);

  // Card creation state
  const [addingCardToCol, setAddingCardToCol] = useState<string | null>(null);
  const [newCardName, setNewCardName]         = useState("");
  const [newCardEmail, setNewCardEmail]       = useState("");
  const [newCardValue, setNewCardValue]       = useState("");
  const [newCardContact, setNewCardContact]   = useState("");

  const [configCard, setConfigCard]     = useState<Card | null>(null);
  const [cardConfig, setCardConfig]     = useState<{ showValue: boolean; showService: boolean; showPhone: boolean }>({
    showValue: true, showService: false, showPhone: false,
  });
  const [extraFields, setExtraFields]   = useState<string[]>([]);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const openConfig = (card: Card) => {
    setConfigCard(card);
    setCardConfig({
      showValue:   !!card.value,
      showService: !!card.customFields?.some(f => f.label === "Servicio"),
      showPhone:   !!card.customFields?.some(f => f.label === "Teléfono"),
    });
    setExtraFields([]);
  };

  const toggleExtraField = (id: string) =>
    setExtraFields((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );

  const startAddCard = (colId: string) => {
    setAddingCardToCol(colId);
    setNewCardName("");
    setNewCardEmail("");
    setNewCardValue("");
    setNewCardContact("");
  };

  const saveCard = async (colId: string) => {
    if (!newCardName.trim()) return;
    try {
      await createDeal.mutateAsync({
        title: newCardName.trim(),
        stage: colId,
        value: newCardValue ? Number(newCardValue) : 0,
        contact_id: newCardContact || null,
        notes: newCardEmail.trim() || null,
      });
      toast.success("Deal creado");
      setAddingCardToCol(null);
    } catch {
      toast.error("Error al crear deal");
    }
  };

  /* ─── Column management ─── */
  const startEditCol = (col: Column) => {
    setEditingCol(col.id);
    setEditName(col.name);
  };

  const saveColName = async (colId: string) => {
    if (!editName.trim() || editName.trim() === colId) {
      setEditingCol(null);
      return;
    }
    const newName = editName.trim();
    // Update all deals in this stage to the new stage name
    const dealsInStage = deals.filter(d => d.stage === colId);
    try {
      await Promise.all(
        dealsInStage.map(d => updateDeal.mutateAsync({ id: d.id, stage: newName }))
      );
      setStageNames(prev => prev.map(s => s === colId ? newName : s));
      setEditingCol(null);
      if (dealsInStage.length > 0) toast.success("Columna renombrada");
    } catch {
      toast.error("Error al renombrar columna");
    }
  };

  const addColumn = () => {
    if (!newColName.trim()) return;
    if (stageNames.includes(newColName.trim())) {
      toast.error("Esta columna ya existe");
      return;
    }
    setStageNames(prev => [...prev, newColName.trim()]);
    setNewColName("");
    setAddingCol(false);
  };

  const removeColumn = (colId: string) => {
    const dealsInCol = deals.filter(d => d.stage === colId);
    if (dealsInCol.length > 0) {
      toast.error(`No puedes eliminar "${colId}" — tiene ${dealsInCol.length} deals.`);
      return;
    }
    setStageNames(prev => prev.filter(s => s !== colId));
  };

  /* ─── Drag & drop ─── */
  const handleDragStart = (card: Card, fromColId: string) => {
    setDragCard({ card, fromColId });
  };

  const handleDrop = async (toColId: string) => {
    if (!dragCard || dragCard.fromColId === toColId) {
      setDragCard(null);
      setDragOver(null);
      return;
    }
    try {
      await updateDeal.mutateAsync({ id: dragCard.card.id, stage: toColId });
      toast.success(`Deal movido a "${toColId}"`);
    } catch {
      toast.error("Error al mover deal");
    }
    setDragCard(null);
    setDragOver(null);
  };

  /* ─── Delete deal ─── */
  const handleDeleteDeal = (dealId: string) => {
    setDeleteTargetId(dealId);
  };

  const handleConfirmDeleteDeal = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteDeal.mutateAsync(deleteTargetId);
      toast.success("Deal eliminado");
    } catch {
      toast.error("Error al eliminar deal");
    } finally {
      setDeleteTargetId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
    <DeleteConfirmDialog
      open={!!deleteTargetId}
      onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}
      onConfirm={handleConfirmDeleteDeal}
      isPending={deleteDeal.isPending}
      description="Se eliminará el deal del pipeline permanentemente."
    />
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gestiona tus oportunidades y seguimientos</p>
        </div>
          <button
            onClick={() => setAddingCol(true)}
            className="flex items-center gap-2 text-xs font-semibold border rounded-xl px-4 py-2 hover:bg-secondary transition-colors"
          >
            <Plus size={14} />
            Nueva columna
          </button>
      </div>

      {/* Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {columns.map((col) => (
            <div
              key={col.id}
              className={`flex flex-col w-64 rounded-2xl border bg-secondary/30 overflow-hidden transition-all ${
                dragOver === col.id ? "ring-2 ring-primary/40" : ""
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(col.id); }}
              onDrop={() => handleDrop(col.id)}
              onDragLeave={() => setDragOver(null)}
            >
              {/* Column header */}
              <div className="px-4 py-3 flex items-center gap-2 bg-card border-b">
                {editingCol === col.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveColName(col.id);
                        if (e.key === "Escape") setEditingCol(null);
                      }}
                      className="h-7 text-xs flex-1"
                      autoFocus
                    />
                    <button
                      onClick={() => saveColName(col.id)}
                      className="p-1 rounded hover:bg-secondary transition-colors text-primary"
                    >
                      <Check size={13} />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-xs font-semibold flex-1 truncate">{col.name}</span>
                    <span className="text-[10px] text-muted-foreground bg-secondary rounded-full px-2 py-0.5 font-medium">
                      {col.cards.length}
                    </span>
                    <button
                      onClick={() => startEditCol(col)}
                      className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground"
                    >
                      <Settings2 size={12} />
                    </button>
                    <button
                      onClick={() => removeColumn(col.id)}
                      className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-destructive"
                    >
                      <X size={12} />
                    </button>
                  </>
                )}
              </div>

              {/* Cards */}
              <div className="flex-1 p-3 space-y-2 min-h-[150px]">
                {col.cards.map((card) => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={() => handleDragStart(card, col.id)}
                    className="bg-card border rounded-xl px-3 py-3 cursor-grab active:cursor-grabbing hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-start gap-2 relative">
                      <GripVertical size={12} className="text-muted-foreground/30 mt-0.5 group-hover:text-muted-foreground/60 shrink-0" />
                      <div className="flex-1 min-w-0 pr-5">
                        <p className="text-xs font-medium truncate">{card.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{card.email}</p>
                        {card.value && (
                          <p className="text-[10px] font-semibold text-primary mt-1">{card.value}</p>
                        )}
                        {card.customFields && card.customFields.length > 0 && (
                          <div className="mt-2.5 space-y-1">
                            {card.customFields.map((f, i) => (
                              <div key={i} className="flex justify-between items-center text-[9px] bg-secondary/50 rounded overflow-hidden">
                                <span className="text-muted-foreground px-1.5 py-1 border-r border-border/40 bg-card/40 shrink-0">{f.label}</span>
                                <span className="font-semibold text-foreground px-1.5 py-1 truncate">{f.value}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="absolute top-0 right-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => openConfig(card)}
                          className="p-1 hover:bg-secondary rounded-md text-muted-foreground bg-card"
                          title="Configurar campos de la tarjeta"
                        >
                          <Settings2 size={13} />
                        </button>
                        <button 
                          onClick={() => handleDeleteDeal(card.id)}
                          className="p-1 hover:bg-destructive/10 rounded-md text-muted-foreground hover:text-destructive bg-card"
                          title="Eliminar deal"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Inline Card Creation */}
                {addingCardToCol === col.id ? (
                  <div className="bg-card border rounded-xl p-3 space-y-2.5 shadow-sm animate-in fade-in zoom-in-95">
                    <Input
                      autoFocus
                      placeholder="Título del deal (obligatorio)"
                      value={newCardName}
                      onChange={(e) => setNewCardName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveCard(col.id);
                        if (e.key === "Escape") setAddingCardToCol(null);
                      }}
                      className="h-7 text-xs bg-secondary/50 border-transparent focus-visible:border-primary px-2"
                    />
                    {/* Contact selector */}
                    <div className="relative">
                      <select
                        value={newCardContact}
                        onChange={(e) => setNewCardContact(e.target.value)}
                        className="w-full h-7 rounded-md border bg-secondary/50 text-xs pl-2 pr-6 appearance-none focus:outline-none focus:ring-1 focus:ring-primary border-transparent"
                      >
                        <option value="">Sin contacto</option>
                        {contacts.map(c => (
                          <option key={c.id} value={c.id}>{c.name} — {c.email ?? ""}</option>
                        ))}
                      </select>
                      <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    </div>
                    <Input
                      placeholder="Valor $ (opcional)"
                      type="number"
                      value={newCardValue}
                      onChange={(e) => setNewCardValue(e.target.value)}
                      className="h-7 text-xs bg-secondary/50 border-transparent focus-visible:border-primary px-2"
                    />
                    <div className="flex gap-2 pt-1">
                      <Button 
                        size="sm" 
                        className="h-7 text-[11px] flex-1 rounded-lg" 
                        disabled={!newCardName.trim() || createDeal.isPending}
                        onClick={() => saveCard(col.id)}
                      >
                        {createDeal.isPending ? <Loader2 size={12} className="animate-spin mr-1" /> : null}
                        Guardar
                      </Button>
                      <button onClick={() => setAddingCardToCol(null)} className="h-7 px-2.5 rounded-lg border text-muted-foreground hover:bg-secondary"><X size={12}/></button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => startAddCard(col.id)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 mt-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors border border-transparent hover:border-border/50 border-dashed"
                  >
                    <Plus size={13} /> Añadir tarjeta
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Add column input */}
          {addingCol ? (
            <div className="w-64 rounded-2xl border bg-card p-3 h-fit space-y-2">
              <Input
                placeholder="Nombre de la columna"
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addColumn();
                  if (e.key === "Escape") setAddingCol(false);
                }}
                className="h-8 text-xs"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={addColumn}
                  className="flex-1 h-8 text-xs rounded-lg"
                  disabled={!newColName.trim()}
                >
                  Añadir
                </Button>
                <button
                  onClick={() => { setAddingCol(false); setNewColName(""); }}
                  className="px-3 py-1.5 rounded-lg border text-xs text-muted-foreground hover:bg-secondary transition-colors"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground italic">
        Puedes arrastrar tarjetas entre columnas. Las columnas y sus nombres son completamente personalizables.
      </p>

      {/* Card Settings Modal */}
      <Dialog open={!!configCard} onOpenChange={(open) => !open && setConfigCard(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Configurar tarjeta</DialogTitle>
            <DialogDescription>
              Selecciona qué variables adicionales de {configCard?.name} deseas visualizar.
            </DialogDescription>
          </DialogHeader>
          
          {configCard && (
            <div className="py-2 space-y-6">
              {/* Fixed fields */}
              <div className="space-y-4">
                <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/60">Campos fijos</p>
                {([
                  ["showValue",   "Valor del trato",     "Muestra el monto en la tarjeta ($)"],
                  ["showService", "Servicio interesado", "Variable recogida del formulario"],
                  ["showPhone",   "Teléfono principal",  "Variable recogida del formulario"],
                ] as [keyof typeof cardConfig, string, string][]).map(([key, label, desc]) => (
                  <div key={key} className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium leading-none">{label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                    </div>
                    <Switch
                      checked={cardConfig[key]}
                      onCheckedChange={(val) => setCardConfig((prev) => ({ ...prev, [key]: val }))}
                    />
                  </div>
                ))}
              </div>

              {/* Form fields */}
              <div className="space-y-3">
                <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/60">Campos de tus formularios</p>
                {availableFormFields.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No hay formularios creados aún.</p>
                ) : (
                  <div className="space-y-2">
                    {availableFormFields.map((ff) => (
                      <div key={ff.id} className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium leading-none">{ff.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{ff.formName}</p>
                        </div>
                        <Switch
                          checked={extraFields.includes(ff.id)}
                          onCheckedChange={() => toggleExtraField(ff.id)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
};

export default CrmPipeline;
