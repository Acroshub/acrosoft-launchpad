import { useState, useMemo, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  Plus, X, GripVertical, Check, ChevronDown, Loader2,
  Mail, Phone, Tag, User, Users, ListTodo, CalendarDays,
  AlertCircle, AlertTriangle, Minus, Pencil, Building2,
} from "lucide-react";
import { useStaffPermissions } from "@/hooks/useAuth";
import {
  usePipelines, useCreatePipeline, useUpdatePipeline, useDeletePipeline,
  useTasks, useCreateTask, useUpdateTask, useDeleteTask,
  useContacts, useUpdateContact, useForms,
  useBatchUpdateTaskStage, useBatchUpdateTaskPositions,
  useContactMemberships, useAddContactMembership, useRemoveContactMembership,
  useUpdateMembershipStage, useBatchUpdateMembershipStage, useBatchUpdateMembershipPositions,
} from "@/hooks/useCrmData";
import type { CrmPipeline, CrmContact, CrmTask, CrmForm } from "@/lib/supabase";
import { toast } from "sonner";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";

// ─── Constants ───────────────────────────────────────────────
const DEFAULT_COLUMNS: Record<CrmPipeline["type"], string[]> = {
  contacts: ["Nuevo Lead", "Contactado", "Propuesta", "Cliente", "Post-venta"],
  tasks:    ["Por hacer", "En progreso", "Completado"],
};

const PRIORITY_STYLES: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  low:    { label: "Baja",  className: "bg-muted text-muted-foreground border-border",                    icon: Minus },
  medium: { label: "Media", className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/40", icon: AlertTriangle },
  high:   { label: "Alta",  className: "bg-destructive/10 text-destructive border-destructive/20",         icon: AlertCircle },
};

// high → medium → low → sin prioridad
const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

// ─── Contact Card ─────────────────────────────────────────────
const ContactCard = ({
  contact,
  forms,
  onDelete,
  onDragStart,
  onDragOverCard,
  onDragEnd,
}: {
  contact: CrmContact;
  forms: CrmForm[];
  onDelete?: () => void;
  onDragStart?: () => void;
  onDragOverCard?: () => void;
  onDragEnd: () => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [expandedForms, setExpandedForms] = useState<Set<string>>(new Set());
  const [newTag, setNewTag] = useState("");
  const updateContact = useUpdateContact();

  const customFields = (contact.custom_fields as Record<string, Record<string, string>>) ?? {};

  const toggleForm = (id: string) =>
    setExpandedForms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });

  // Only forms that have at least one non-empty value for this contact
  const formsWithData = forms.filter((form) => {
    const vals = customFields[form.id] ?? {};
    return Object.values(vals).some((v) => typeof v === "string" && v.trim());
  });

  const hasBasicInfo = !!(contact.email || contact.phone);

  return (
    <div
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      onDragOver={onDragOverCard ? (e) => { e.preventDefault(); onDragOverCard(); } : undefined}
      onDragEnd={onDragEnd}
      className={`bg-card border rounded-xl hover:shadow-sm transition-all group ${onDragStart ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      {/* Always visible */}
      <div className="px-3 pt-3 pb-2.5 flex items-start gap-2">
        {onDragStart && <GripVertical size={12} className="text-muted-foreground/30 mt-0.5 group-hover:text-muted-foreground/60 shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate leading-tight">{contact.name}</p>
          {contact.email && (
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{contact.email}</p>
          )}
          {contact.notes && (
            <p className="text-[10px] text-muted-foreground/70 mt-1 line-clamp-2 leading-relaxed italic">
              {contact.notes}
            </p>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? "Ocultar detalles" : "Ver información completa"}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <ChevronDown size={13} className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
          </button>
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Eliminar del pipeline"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Expandable: contact info + form data */}
      {expanded && (
        <div className="border-t mx-3 mb-3 pt-2.5 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Basic contact info */}
          {contact.email && (
            <div className="flex items-center gap-1.5">
              <Mail size={10} className="shrink-0 text-muted-foreground/40" />
              <a href={`mailto:${contact.email}`} onClick={(e) => e.stopPropagation()}
                className="text-[10px] text-muted-foreground hover:text-foreground truncate transition-colors">
                {contact.email}
              </a>
            </div>
          )}
          {contact.phone && (
            <div className="flex items-center gap-1.5">
              <Phone size={10} className="shrink-0 text-muted-foreground/40" />
              <a href={`tel:${contact.phone}`} onClick={(e) => e.stopPropagation()}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                {contact.phone}
              </a>
            </div>
          )}
          {/* Tags editor */}
          <div className="flex items-start gap-1.5">
            <Tag size={10} className="shrink-0 text-muted-foreground/40 mt-0.5" />
            <div className="flex-1 min-w-0 space-y-1">
              {(contact.tags ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {(contact.tags ?? []).map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-0.5 text-[9px] border rounded-full pl-1.5 pr-0.5 py-0.5 bg-secondary/60 text-muted-foreground"
                    >
                      {t}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const next = (contact.tags ?? []).filter((tag) => tag !== t);
                          updateContact.mutate({ id: contact.id, tags: next });
                        }}
                        className="rounded-full hover:bg-destructive/20 hover:text-destructive p-0.5 transition-colors"
                        title={`Eliminar etiqueta "${t}"`}
                      >
                        <X size={8} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-1">
                <input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    const tag = newTag.trim();
                    if (!tag) return;
                    const current = contact.tags ?? [];
                    if (current.includes(tag)) { setNewTag(""); return; }
                    updateContact.mutate({ id: contact.id, tags: [...current, tag] });
                    setNewTag("");
                  }}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="+ etiqueta"
                  className="text-[9px] h-5 px-1.5 rounded-full border border-dashed bg-transparent text-muted-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary w-20"
                />
              </div>
            </div>
          </div>

          {/* Form data — one collapsible row per form that has data */}
          {formsWithData.length > 0 && (
            <div className={`space-y-1 ${hasBasicInfo ? "pt-1 border-t border-border/40" : ""}`}>
              {formsWithData.map((form) => {
                const vals = customFields[form.id] ?? {};
                const filledFields = (form.fields as Array<{ id: string; label: string }>).filter(
                  (f) => vals[f.id] && String(vals[f.id]).trim()
                );
                const isFormOpen = expandedForms.has(form.id);

                return (
                  <div key={form.id} className="rounded-lg border border-border/50 overflow-hidden">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleForm(form.id); }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-secondary/30 transition-colors text-left"
                    >
                      <span className="text-[10px] font-semibold text-muted-foreground truncate">{form.name}</span>
                      <ChevronDown
                        size={11}
                        className={`shrink-0 text-muted-foreground/50 transition-transform duration-150 ${isFormOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {isFormOpen && (
                      <div className="px-2.5 pb-2 pt-1.5 border-t border-border/40 bg-secondary/10 space-y-1.5">
                        {filledFields.map((f) => (
                          <div key={f.id}>
                            <span className="text-[9px] uppercase tracking-widest text-muted-foreground/50 font-medium block">
                              {f.label}
                            </span>
                            <span className="text-[10px] text-foreground leading-snug">
                              {String(vals[f.id])}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}
    </div>
  );
};

// ─── Task Card ────────────────────────────────────────────────
const TaskCard = ({
  task,
  contact,
  allContacts,
  onDelete,
  onDragStart,
  onDragOverCard,
  onDragEnd,
}: {
  task: CrmTask;
  contact?: CrmContact | null;
  allContacts: CrmContact[];
  onDelete?: () => void;
  onDragStart?: () => void;
  onDragOverCard?: () => void;
  onDragEnd: () => void;
}) => {
  const updateTask = useUpdateTask();

  const [expanded,    setExpanded]    = useState(false);
  const [isEditing,   setIsEditing]   = useState(false);
  const [editTitle,   setEditTitle]   = useState(task.title);
  const [editDesc,    setEditDesc]    = useState(task.description ?? "");
  const [editPri,     setEditPri]     = useState<CrmTask["priority"]>(task.priority);
  const [editContact, setEditContact] = useState(task.contact_id ?? "");

  const openEdit = () => {
    setEditTitle(task.title);
    setEditDesc(task.description ?? "");
    setEditPri(task.priority);
    setEditContact(task.contact_id ?? "");
    setExpanded(false);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return;
    try {
      await updateTask.mutateAsync({
        id:          task.id,
        title:       editTitle.trim(),
        description: editDesc.trim() || null,
        priority:    editPri,
        contact_id:  editContact || null,
      });
      setIsEditing(false);
    } catch {
      toast.error("Error al guardar los cambios");
    }
  };

  const priority     = task.priority ? PRIORITY_STYLES[task.priority] : null;
  const PriorityIcon = priority?.icon;
  const hasExpandable = !!(task.description || contact);

  // ── Inline edit mode ──────────────────────────────────────────
  if (isEditing) {
    return (
      <div
        className="bg-card border rounded-xl p-3 space-y-2 shadow-sm animate-in fade-in zoom-in-95"
        onKeyDown={(e) => { if (e.key === "Escape") setIsEditing(false); }}
      >
        <Input
          autoFocus
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          placeholder="Título *"
          className="h-7 text-xs bg-secondary/50 border-transparent focus-visible:border-primary px-2"
        />
        <Textarea
          value={editDesc}
          onChange={(e) => setEditDesc(e.target.value)}
          placeholder="Descripción (opcional)"
          rows={2}
          className="text-xs bg-secondary/50 border-transparent focus-visible:border-primary px-2 py-1.5 resize-none min-h-0"
        />
        {/* Priority */}
        <div className="flex gap-1.5">
          {(["", "low", "medium", "high"] as const).map((p) => {
            const style  = p ? PRIORITY_STYLES[p] : null;
            const active = editPri === (p || null);
            return (
              <button
                key={p}
                type="button"
                onClick={() => setEditPri(p || null)}
                className={`flex-1 text-[9px] font-semibold rounded-lg border px-1 py-1 transition-all ${
                  active
                    ? p ? style!.className : "bg-secondary text-foreground border-border"
                    : "text-muted-foreground border-transparent hover:bg-secondary/50"
                }`}
              >
                {p ? style!.label : "Sin prioridad"}
              </button>
            );
          })}
        </div>
        {/* Contact */}
        {allContacts.length > 0 && (
          <div className="relative">
            <select
              value={editContact}
              onChange={(e) => setEditContact(e.target.value)}
              className="w-full h-7 rounded-md border bg-secondary/50 border-transparent text-xs pl-2 pr-6 appearance-none focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-muted-foreground"
            >
              <option value="">Sin contacto</option>
              {allContacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.email ? ` — ${c.email}` : ""}
                </option>
              ))}
            </select>
            <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        )}
        <div className="flex gap-2 pt-0.5">
          <Button
            size="sm"
            className="h-7 text-[11px] flex-1 rounded-lg"
            disabled={!editTitle.trim() || updateTask.isPending}
            onClick={handleSaveEdit}
          >
            {updateTask.isPending ? <Loader2 size={12} className="animate-spin mr-1" /> : null}
            Guardar
          </Button>
          <button
            onClick={() => setIsEditing(false)}
            className="h-7 px-2.5 rounded-lg border text-muted-foreground hover:bg-secondary"
          >
            <X size={12} />
          </button>
        </div>
      </div>
    );
  }

  // ── View mode ─────────────────────────────────────────────────
  return (
    <div
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      onDragOver={onDragOverCard ? (e) => { e.preventDefault(); onDragOverCard(); } : undefined}
      onDragEnd={onDragEnd}
      className={`bg-card border rounded-xl hover:shadow-sm transition-all ${onDragStart ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      {/* Always-visible header */}
      <div className="px-3 pt-3 pb-2.5 flex items-start gap-2">
        {onDragStart && <GripVertical size={12} className="text-muted-foreground/30 mt-0.5 shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold leading-tight truncate">{task.title}</p>
          {(priority || contact) && (
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {priority && PriorityIcon && (
                <span className={`inline-flex items-center gap-1 text-[9px] font-medium border rounded-full px-1.5 py-0.5 ${priority.className}`}>
                  <PriorityIcon size={9} />
                  {priority.label}
                </span>
              )}
              {contact && (
                <span className="inline-flex items-center gap-1 text-[9px] font-medium border rounded-full px-1.5 py-0.5 bg-secondary text-muted-foreground border-border">
                  <User size={9} />
                  {contact.name}
                </span>
              )}
            </div>
          )}
        </div>
        {/* Action buttons — always visible */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={openEdit}
            title="Editar tarea"
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Pencil size={12} />
          </button>
          {hasExpandable && (
            <button
              onClick={() => setExpanded((v) => !v)}
              title={expanded ? "Ocultar detalles" : "Ver detalles"}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <ChevronDown size={13} className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              title="Eliminar tarea"
              className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Expandable details */}
      {expanded && hasExpandable && (
        <div className="border-t mx-3 mb-3 pt-2.5 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
          {task.description && (
            <p className="text-[10px] text-muted-foreground leading-relaxed">{task.description}</p>
          )}
          {contact && (
            <div className="space-y-1.5 pt-1 border-t">
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground/50 font-semibold">Contacto</p>
              {contact.email && (
                <div className="flex items-center gap-1.5">
                  <Mail size={10} className="shrink-0 text-muted-foreground/40" />
                  <a href={`mailto:${contact.email}`} onClick={(e) => e.stopPropagation()}
                    className="text-[10px] text-muted-foreground hover:text-foreground truncate transition-colors">
                    {contact.email}
                  </a>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone size={10} className="shrink-0 text-muted-foreground/40" />
                  <a href={`tel:${contact.phone}`} onClick={(e) => e.stopPropagation()}
                    className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                    {contact.phone}
                  </a>
                </div>
              )}
              {contact.company && (
                <div className="flex items-center gap-1.5">
                  <Building2 size={10} className="shrink-0 text-muted-foreground/40" />
                  <span className="text-[10px] text-muted-foreground truncate">{contact.company}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Column (shared) ─────────────────────────────────────────
const BoardColumn = ({
  name,
  count,
  cardDragOver,
  colDragOver,
  isBeingDragged,
  onCardDragOver,
  onCardDrop,
  onCardDragLeave,
  onColDragStart,
  onColDragEnd,
  onRename,
  onDelete,
  children,
  footer,
}: {
  name: string;
  count: number;
  cardDragOver: boolean;
  colDragOver: boolean;
  isBeingDragged: boolean;
  onCardDragOver: () => void;
  onCardDrop: () => void;
  onCardDragLeave: () => void;
  onColDragStart: () => void;
  onColDragEnd: () => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(name);

  const commit = () => {
    if (val.trim() && val.trim() !== name) onRename(val.trim());
    setEditing(false);
  };

  return (
    <div
      className={`flex flex-col w-64 rounded-2xl border bg-secondary/30 overflow-hidden transition-all duration-150 ${
        colDragOver ? "ring-2 ring-primary/60 scale-[1.01]"
        : cardDragOver ? "ring-2 ring-primary/40"
        : ""
      } ${isBeingDragged ? "opacity-40" : ""}`}
      onDragOver={(e) => { e.preventDefault(); onCardDragOver(); }}
      onDrop={onCardDrop}
      onDragLeave={onCardDragLeave}
    >
      {/* Header */}
      <div className="px-3 py-3 flex items-center gap-1.5 bg-card border-b">
        {/* Column drag handle */}
        <div
          draggable
          onDragStart={(e) => { e.stopPropagation(); onColDragStart(); }}
          onDragEnd={onColDragEnd}
          className="cursor-grab active:cursor-grabbing p-0.5 rounded text-muted-foreground/25 hover:text-muted-foreground/60 transition-colors shrink-0"
          title="Arrastrar para mover columna"
        >
          <GripVertical size={14} />
        </div>

        {editing ? (
          <div className="flex items-center gap-2 flex-1">
            <Input
              value={val}
              onChange={(e) => setVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setVal(name); setEditing(false); } }}
              className="h-7 text-xs flex-1"
              autoFocus
            />
            <button onClick={commit} className="p-1 rounded hover:bg-secondary text-primary transition-colors">
              <Check size={13} />
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => { setVal(name); setEditing(true); }}
              className="text-xs font-semibold flex-1 truncate text-left hover:text-primary transition-colors"
              title="Renombrar columna"
            >
              {name}
            </button>
            <span className="text-[10px] text-muted-foreground bg-secondary rounded-full px-2 py-0.5 font-medium shrink-0">
              {count}
            </span>
            <button
              onClick={onDelete}
              className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-destructive transition-colors shrink-0"
              title="Eliminar columna"
            >
              <X size={12} />
            </button>
          </>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 p-3 space-y-2 min-h-[150px]">
        {children}
        {footer}
      </div>
    </div>
  );
};

// ─── Contacts Board ───────────────────────────────────────────
const ContactsBoard = ({
  pipeline,
  allContacts,
  forms,
  onUpdatePipeline,
}: {
  pipeline: CrmPipeline;
  allContacts: CrmContact[];
  forms: CrmForm[];
  onUpdatePipeline: (patch: Partial<CrmPipeline>) => Promise<void>;
}) => {
  const { canItem } = useStaffPermissions();
  const canEdit = canItem("pipeline", pipeline.id, "edit");

  const { data: memberships = [] }  = useContactMemberships(pipeline.id);
  const addContactMembership        = useAddContactMembership();
  const removeContactMembership     = useRemoveContactMembership();
  const updateMembershipStage       = useUpdateMembershipStage();
  const batchUpdateMembershipStage  = useBatchUpdateMembershipStage();
  const batchUpdateMembershipPos    = useBatchUpdateMembershipPositions();
  // Still needed to optionally write notes when adding a contact
  const updateContact               = useUpdateContact();

  const [dragCard, setDragCard]             = useState<{ id: string; fromCol: string } | null>(null);
  const [dragOver, setDragOver]             = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
  const [addingTo, setAddingTo]             = useState<string | null>(null);
  const [pickedId, setPickedId]             = useState("");
  const [newNotes, setNewNotes]             = useState("");
  const [deleteTarget, setDeleteTarget]     = useState<string | null>(null); // membership id

  const resetDrag = () => { setDragCard(null); setDragOver(null); setDragOverCardId(null); };

  const columns = pipeline.column_names;

  // Set of contact IDs already in this pipeline
  const membershipContactIds = useMemo(
    () => new Set(memberships.map((m) => m.contact_id)),
    [memberships]
  );
  // Contacts not yet in this pipeline
  const availableContacts = useMemo(
    () => allContacts.filter((c) => !membershipContactIds.has(c.id)),
    [allContacts, membershipContactIds]
  );
  // Fast lookup: contact_id → CrmContact
  const contactMap = useMemo(() => {
    const map: Record<string, CrmContact> = {};
    for (const c of allContacts) map[c.id] = c;
    return map;
  }, [allContacts]);

  const handleReorder = async (col: string, draggedId: string, targetId: string) => {
    const sorted = memberships
      .filter((m) => m.stage === col)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

    const dragged = sorted.find((m) => m.id === draggedId);
    if (!dragged) return;

    const without = sorted.filter((m) => m.id !== draggedId);
    const targetIdx = without.findIndex((m) => m.id === targetId);
    if (targetIdx === -1) return;

    without.splice(targetIdx, 0, dragged);

    const updates = without.map((m, idx) => ({ id: m.id, position: idx * 10, pipelineId: pipeline.id }));
    try {
      await batchUpdateMembershipPos.mutateAsync(updates);
    } catch {
      toast.error("Error al reordenar");
    }
  };

  const handleDrop = async (toCol: string) => {
    if (!dragCard || !canEdit) { resetDrag(); return; }
    if (dragCard.fromCol === toCol) {
      if (dragOverCardId && dragOverCardId !== dragCard.id) {
        await handleReorder(toCol, dragCard.id, dragOverCardId);
      }
    } else {
      try {
        await updateMembershipStage.mutateAsync({ membershipId: dragCard.id, stage: toCol, pipelineId: pipeline.id });
      } catch { toast.error("Error al mover contacto"); }
    }
    resetDrag();
  };

  const handleRenameCol = async (oldName: string, newName: string) => {
    const newCols = columns.map((c) => (c === oldName ? newName : c));
    try {
      await onUpdatePipeline({ column_names: newCols });
      await batchUpdateMembershipStage.mutateAsync({ pipelineId: pipeline.id, oldStage: oldName, newStage: newName });
      toast.success("Columna renombrada");
    } catch {
      toast.error("Error al renombrar la columna");
    }
  };

  const [deleteColTarget, setDeleteColTarget] = useState<string | null>(null);

  const handleDeleteCol = (colName: string) => {
    const count = memberships.filter((m) => m.stage === colName).length;
    if (count > 0) { toast.error(`"${colName}" tiene ${count} contactos — muévelos antes de eliminar.`); return; }
    setDeleteColTarget(colName);
  };

  const handleConfirmDeleteCol = async () => {
    if (!deleteColTarget) return;
    try {
      await onUpdatePipeline({ column_names: columns.filter((c) => c !== deleteColTarget) });
      toast.success(`Columna "${deleteColTarget}" eliminada`);
    } catch {
      toast.error("Error al eliminar la columna");
    }
    setDeleteColTarget(null);
  };

  const handleAddCol = async (name: string) => {
    if (columns.includes(name)) { toast.error("Esa columna ya existe"); return; }
    await onUpdatePipeline({ column_names: [...columns, name] });
  };

  const handleSaveCard = async (colName: string) => {
    if (!pickedId) return;
    const contact = allContacts.find((c) => c.id === pickedId);
    const colMemberships = memberships.filter((m) => m.stage === colName);
    const maxPos = colMemberships.length > 0 ? Math.max(...colMemberships.map((m) => m.position ?? 0)) : -10;
    try {
      await addContactMembership.mutateAsync({ contactId: pickedId, pipelineId: pipeline.id, stage: colName, position: maxPos + 10 });
      if (newNotes.trim()) {
        await updateContact.mutateAsync({ id: pickedId, notes: newNotes.trim() });
      }
      toast.success(`${contact?.name ?? "Contacto"} añadido a "${colName}"`);
      setAddingTo(null);
    } catch { toast.error("Error al añadir contacto"); }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await removeContactMembership.mutateAsync({ membershipId: deleteTarget, pipelineId: pipeline.id });
      toast.success("Contacto removido del pipeline");
    } catch { toast.error("Error al remover"); }
    setDeleteTarget(null);
  };

  return (
    <>
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={handleConfirmDelete}
        isPending={removeContactMembership.isPending}
        description="El contacto se removerá del pipeline pero no se eliminará del CRM."
      />
      <DeleteConfirmDialog
        open={!!deleteColTarget}
        onOpenChange={(open) => { if (!open) setDeleteColTarget(null); }}
        onConfirm={handleConfirmDeleteCol}
        isPending={false}
        description={`¿Eliminar la columna "${deleteColTarget}"? Esta acción no se puede deshacer.`}
      />
      <BoardGrid
        columns={columns}
        dragOver={dragOver}
        onDragOver={canEdit ? setDragOver : () => {}}
        onDrop={handleDrop}
        onDragLeave={() => { setDragOver(null); setDragOverCardId(null); }}
        onRenameCol={canEdit ? handleRenameCol : async () => {}}
        onDeleteCol={canEdit ? handleDeleteCol : () => {}}
        onAddCol={canEdit ? handleAddCol : async () => {}}
        onReorderCols={canEdit ? (newOrder) => onUpdatePipeline({ column_names: newOrder }) : async () => {}}
        getCount={(col) => memberships.filter((m) => m.stage === col).length}
        renderCards={(col) => {
          const sorted = memberships
            .filter((m) => m.stage === col)
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
          return (
            <>
              {sorted.map((membership) => {
                const contact = contactMap[membership.contact_id];
                if (!contact) return null;
                const showIndicator =
                  dragCard?.fromCol === col &&
                  dragOverCardId === membership.id &&
                  dragCard.id !== membership.id;
                return (
                  <Fragment key={membership.id}>
                    {showIndicator && <div className="h-0.5 bg-primary/60 rounded-full mx-1" />}
                    <ContactCard
                      contact={contact}
                      forms={forms}
                      onDelete={canEdit ? () => setDeleteTarget(membership.id) : undefined}
                      onDragStart={canEdit ? () => { setDragCard({ id: membership.id, fromCol: col }); setDragOverCardId(null); } : undefined}
                      onDragOverCard={canEdit ? () => setDragOverCardId(membership.id) : undefined}
                      onDragEnd={resetDrag}
                    />
                  </Fragment>
                );
              })}
            </>
          );
        }}
        renderCreation={(col) =>
          canEdit && addingTo === col ? (
            <div className="bg-card border rounded-xl p-3 space-y-2 shadow-sm animate-in fade-in zoom-in-95">
              {availableContacts.length === 0 ? (
                <p className="text-[10px] text-muted-foreground/60 italic text-center py-1">
                  Todos los contactos ya están en este pipeline
                </p>
              ) : (
                <>
                  <div className="relative">
                    <select
                      autoFocus
                      value={pickedId}
                      onChange={(e) => setPickedId(e.target.value)}
                      className="w-full h-7 rounded-md border bg-secondary/50 border-transparent text-xs pl-2 pr-6 appearance-none focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                    >
                      <option value="">Seleccionar contacto *</option>
                      {availableContacts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}{c.email ? ` — ${c.email}` : ""}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>
                  <Textarea
                    placeholder="Notas (opcional)"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    rows={2}
                    className="text-xs bg-secondary/50 border-transparent focus-visible:border-primary px-2 py-1.5 resize-none min-h-0"
                  />
                </>
              )}
              <div className="flex gap-2 pt-0.5">
                <Button
                  size="sm"
                  className="h-7 text-[11px] flex-1 rounded-lg"
                  disabled={!pickedId || addContactMembership.isPending}
                  onClick={() => handleSaveCard(col)}
                >
                  {addContactMembership.isPending ? <Loader2 size={12} className="animate-spin mr-1" /> : null}
                  Añadir
                </Button>
                <button onClick={() => setAddingTo(null)} className="h-7 px-2.5 rounded-lg border text-muted-foreground hover:bg-secondary">
                  <X size={12} />
                </button>
              </div>
            </div>
          ) : canEdit ? (
            <button
              onClick={() => { setAddingTo(col); setPickedId(""); setNewNotes(""); }}
              className="w-full flex items-center justify-center gap-1.5 py-2 mt-1 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors border border-transparent hover:border-border/50 border-dashed"
            >
              <Plus size={13} /> Añadir contacto
            </button>
          ) : null
        }
      />
    </>
  );
};

// ─── Tasks Board ──────────────────────────────────────────────
const TasksBoard = ({
  pipeline,
  allContacts,
  onUpdatePipeline,
}: {
  pipeline: CrmPipeline;
  allContacts: CrmContact[];
  onUpdatePipeline: (patch: Partial<CrmPipeline>) => Promise<void>;
}) => {
  const { canItem } = useStaffPermissions();
  const canEdit = canItem("pipeline", pipeline.id, "edit");

  const { data: tasks = [] } = useTasks(pipeline.id);
  const createTask            = useCreateTask();
  const updateTask            = useUpdateTask();
  const deleteTask            = useDeleteTask();
  const batchUpdateTasks      = useBatchUpdateTaskStage();
  const batchUpdateTaskPos    = useBatchUpdateTaskPositions();

  const [dragCard, setDragCard]             = useState<{ id: string; fromCol: string } | null>(null);
  const [dragOver, setDragOver]             = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
  const [addingTo, setAddingTo]             = useState<string | null>(null);
  const [newTitle, setNewTitle]             = useState("");
  const [newDesc, setNewDesc]               = useState("");
  const [newPri, setNewPri]                 = useState<"low" | "medium" | "high" | "">("");
  const [newContactId, setNewContactId]     = useState("");
  const [deleteTarget, setDeleteTarget]     = useState<{ id: string; name: string } | null>(null);

  const resetDrag = () => { setDragCard(null); setDragOver(null); setDragOverCardId(null); };

  // Sort tasks: priority group first (Opción C), then position, then created_at as tiebreaker
  const sortTasks = (list: CrmTask[]) =>
    [...list].sort((a, b) =>
      (PRIORITY_ORDER[a.priority ?? ""] ?? 3) - (PRIORITY_ORDER[b.priority ?? ""] ?? 3) ||
      (a.position ?? 0) - (b.position ?? 0) ||
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

  const columns = pipeline.column_names;

  const handleReorder = async (col: string, draggedId: string, targetId: string) => {
    const sorted = sortTasks(tasks.filter((t) => t.stage === col));
    const draggedTask = sorted.find((t) => t.id === draggedId);
    const targetTask  = sorted.find((t) => t.id === targetId);
    if (!draggedTask || !targetTask) return;

    // Opción C: only reorder within the same priority group
    if (draggedTask.priority !== targetTask.priority) return;

    const group   = sorted.filter((t) => t.priority === draggedTask.priority);
    const without = group.filter((t) => t.id !== draggedId);
    const targetIdx = without.findIndex((t) => t.id === targetId);
    if (targetIdx === -1) return;

    without.splice(targetIdx, 0, draggedTask);

    const updates = without.map((t, idx) => ({
      id: t.id,
      position: idx * 10,
      pipelineId: pipeline.id,
    }));

    try {
      await batchUpdateTaskPos.mutateAsync(updates);
    } catch {
      toast.error("Error al reordenar");
    }
  };

  const handleDrop = async (toCol: string) => {
    if (!dragCard || !canEdit) { resetDrag(); return; }
    if (dragCard.fromCol === toCol) {
      if (dragOverCardId && dragOverCardId !== dragCard.id) {
        await handleReorder(toCol, dragCard.id, dragOverCardId);
      }
    } else {
      try { await updateTask.mutateAsync({ id: dragCard.id, stage: toCol }); }
      catch { toast.error("Error al mover tarea"); }
    }
    resetDrag();
  };

  const handleRenameCol = async (oldName: string, newName: string) => {
    const newCols = columns.map((c) => (c === oldName ? newName : c));
    try {
      await onUpdatePipeline({ column_names: newCols });
      await batchUpdateTasks.mutateAsync({ pipelineId: pipeline.id, oldStage: oldName, newStage: newName });
      toast.success("Columna renombrada");
    } catch {
      toast.error("Error al renombrar la columna");
    }
  };

  const [deleteColTarget, setDeleteColTarget] = useState<string | null>(null);

  const handleDeleteCol = (colName: string) => {
    const count = tasks.filter((t) => t.stage === colName).length;
    if (count > 0) { toast.error(`"${colName}" tiene ${count} tareas — muévelas antes de eliminar.`); return; }
    setDeleteColTarget(colName);
  };

  const handleConfirmDeleteCol = async () => {
    if (!deleteColTarget) return;
    try {
      await onUpdatePipeline({ column_names: columns.filter((c) => c !== deleteColTarget) });
      toast.success(`Columna "${deleteColTarget}" eliminada`);
    } catch {
      toast.error("Error al eliminar la columna");
    }
    setDeleteColTarget(null);
  };

  const handleAddCol = async (name: string) => {
    if (columns.includes(name)) { toast.error("Esa columna ya existe"); return; }
    await onUpdatePipeline({ column_names: [...columns, name] });
  };

  const handleSaveCard = async (col: string) => {
    if (!newTitle.trim()) return;
    const priority = newPri || null;
    // Place new task at the end of its priority group within the column
    const group = tasks.filter((t) => t.stage === col && t.priority === priority);
    const maxPos = group.length > 0 ? Math.max(...group.map((t) => t.position ?? 0)) : -10;
    try {
      await createTask.mutateAsync({
        pipeline_id: pipeline.id,
        title:       newTitle.trim(),
        description: newDesc.trim() || null,
        priority,
        stage:       col,
        contact_id:  newContactId || null,
        position:    maxPos + 10,
      });
      toast.success("Tarea creada");
      setAddingTo(null);
    } catch { toast.error("Error al crear tarea"); }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try { await deleteTask.mutateAsync({ id: deleteTarget.id, pipelineId: pipeline.id, name: deleteTarget.name }); toast.success("Tarea eliminada"); }
    catch { toast.error("Error al eliminar"); }
    setDeleteTarget(null);
  };

  return (
    <>
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={handleConfirmDelete}
        isPending={deleteTask.isPending}
        description="Se eliminará la tarea permanentemente."
      />
      <DeleteConfirmDialog
        open={!!deleteColTarget}
        onOpenChange={(open) => { if (!open) setDeleteColTarget(null); }}
        onConfirm={handleConfirmDeleteCol}
        isPending={false}
        description={`¿Eliminar la columna "${deleteColTarget}"? Esta acción no se puede deshacer.`}
      />
      <BoardGrid
        columns={columns}
        dragOver={dragOver}
        onDragOver={canEdit ? setDragOver : () => {}}
        onDrop={handleDrop}
        onDragLeave={() => { setDragOver(null); setDragOverCardId(null); }}
        onRenameCol={canEdit ? handleRenameCol : async () => {}}
        onDeleteCol={canEdit ? handleDeleteCol : () => {}}
        onAddCol={canEdit ? handleAddCol : async () => {}}
        onReorderCols={canEdit ? (newOrder) => onUpdatePipeline({ column_names: newOrder }) : async () => {}}
        getCount={(col) => tasks.filter((t) => t.stage === col).length}
        renderCards={(col) => {
          const sorted = sortTasks(tasks.filter((t) => t.stage === col));
          const draggedTask = dragCard ? tasks.find((t) => t.id === dragCard.id) : null;
          return (
            <>
              {sorted.map((task) => {
                const showIndicator =
                  dragCard?.fromCol === col &&
                  dragOverCardId === task.id &&
                  dragCard.id !== task.id &&
                  draggedTask?.priority === task.priority;
                return (
                  <Fragment key={task.id}>
                    {showIndicator && (
                      <div className="h-0.5 bg-primary/60 rounded-full mx-1" />
                    )}
                    <TaskCard
                      task={task}
                      contact={task.contact_id
                        ? (allContacts.find((c) => c.id === task.contact_id) ?? null)
                        : null
                      }
                      allContacts={allContacts}
                      onDelete={canEdit ? () => setDeleteTarget({ id: task.id, name: task.title }) : undefined}
                      onDragStart={canEdit ? () => { setDragCard({ id: task.id, fromCol: col }); setDragOverCardId(null); } : undefined}
                      onDragOverCard={canEdit ? () => setDragOverCardId(task.id) : undefined}
                      onDragEnd={resetDrag}
                    />
                  </Fragment>
                );
              })}
            </>
          );
        }}
        renderCreation={(col) =>
          canEdit && addingTo === col ? (
            <div className="bg-card border rounded-xl p-3 space-y-2 shadow-sm animate-in fade-in zoom-in-95">
              <Input
                autoFocus
                placeholder="Título *"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") setAddingTo(null); }}
                className="h-7 text-xs bg-secondary/50 border-transparent focus-visible:border-primary px-2"
              />
              <Textarea
                placeholder="Descripción (opcional)"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={2}
                className="text-xs bg-secondary/50 border-transparent focus-visible:border-primary px-2 py-1.5 resize-none min-h-0"
              />
              {/* Priority selector */}
              <div className="flex gap-1.5">
                {(["", "low", "medium", "high"] as const).map((p) => {
                  const style = p ? PRIORITY_STYLES[p] : null;
                  return (
                    <button
                      key={p}
                      onClick={() => setNewPri(p)}
                      className={`flex-1 text-[9px] font-semibold rounded-lg border px-1 py-1 transition-all ${
                        newPri === p
                          ? p ? style!.className : "bg-secondary text-foreground border-border"
                          : "text-muted-foreground border-transparent hover:bg-secondary/50"
                      }`}
                    >
                      {p ? style!.label : "Sin prioridad"}
                    </button>
                  );
                })}
              </div>
              {/* Contact selector (optional) */}
              {allContacts.length > 0 && (
                <div className="relative">
                  <select
                    value={newContactId}
                    onChange={(e) => setNewContactId(e.target.value)}
                    className="w-full h-7 rounded-md border bg-secondary/50 border-transparent text-xs pl-2 pr-6 appearance-none focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-muted-foreground"
                  >
                    <option value="">Contacto (opcional)</option>
                    {allContacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.email ? ` — ${c.email}` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              )}
              <div className="flex gap-2 pt-0.5">
                <Button
                  size="sm"
                  className="h-7 text-[11px] flex-1 rounded-lg"
                  disabled={!newTitle.trim() || createTask.isPending}
                  onClick={() => handleSaveCard(col)}
                >
                  {createTask.isPending ? <Loader2 size={12} className="animate-spin mr-1" /> : null}
                  Guardar
                </Button>
                <button onClick={() => setAddingTo(null)} className="h-7 px-2.5 rounded-lg border text-muted-foreground hover:bg-secondary">
                  <X size={12} />
                </button>
              </div>
            </div>
          ) : canEdit ? (
            <button
              onClick={() => { setAddingTo(col); setNewTitle(""); setNewDesc(""); setNewPri(""); setNewContactId(""); }}
              className="w-full flex items-center justify-center gap-1.5 py-2 mt-1 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors border border-transparent hover:border-border/50 border-dashed"
            >
              <Plus size={13} /> Añadir tarea
            </button>
          ) : null
        }
      />
    </>
  );
};

// ─── Board Grid (shared layout) ───────────────────────────────
const BoardGrid = ({
  columns,
  dragOver,
  onDragOver,
  onDrop,
  onDragLeave,
  onRenameCol,
  onDeleteCol,
  onAddCol,
  onReorderCols,
  getCount,
  renderCards,
  renderCreation,
}: {
  columns: string[];
  dragOver: string | null;
  onDragOver: (col: string) => void;
  onDrop: (col: string) => void;
  onDragLeave: () => void;
  onRenameCol: (old: string, next: string) => void;
  onDeleteCol: (col: string) => void;
  onAddCol: (name: string) => void;
  onReorderCols: (newOrder: string[]) => void;
  getCount: (col: string) => number;
  renderCards: (col: string) => React.ReactNode;
  renderCreation: (col: string) => React.ReactNode;
}) => {
  const [addingCol, setAddingCol]     = useState(false);
  const [newColName, setNewColName]   = useState("");
  const [draggingCol, setDraggingCol] = useState<string | null>(null);
  const [colDragOver, setColDragOver] = useState<string | null>(null);

  const handleColDrop = (targetCol: string) => {
    if (!draggingCol || draggingCol === targetCol) return;
    const from = columns.indexOf(draggingCol);
    const to   = columns.indexOf(targetCol);
    const next = [...columns];
    next.splice(from, 1);
    next.splice(to, 0, draggingCol);
    onReorderCols(next);
    setDraggingCol(null);
    setColDragOver(null);
  };

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {columns.map((col) => (
          // Wrapper intercepts column-level drag events
          <div
            key={col}
            onDragOver={(e) => {
              e.preventDefault();
              if (draggingCol) setColDragOver(col);
              // card drag-over handled inside BoardColumn
            }}
            onDrop={() => {
              if (draggingCol) handleColDrop(col);
              else onDrop(col);
            }}
            onDragLeave={() => {
              if (draggingCol) setColDragOver(null);
              else onDragLeave();
            }}
          >
            <BoardColumn
              name={col}
              count={getCount(col)}
              cardDragOver={!draggingCol && dragOver === col}
              colDragOver={!!draggingCol && colDragOver === col}
              isBeingDragged={draggingCol === col}
              onCardDragOver={() => { if (!draggingCol) onDragOver(col); }}
              onCardDrop={() => { if (!draggingCol) onDrop(col); }}
              onCardDragLeave={() => { if (!draggingCol) onDragLeave(); }}
              onColDragStart={() => setDraggingCol(col)}
              onColDragEnd={() => { setDraggingCol(null); setColDragOver(null); }}
              onRename={(next) => onRenameCol(col, next)}
              onDelete={() => onDeleteCol(col)}
              footer={renderCreation(col)}
            >
              {renderCards(col)}
            </BoardColumn>
          </div>
        ))}

        {/* Add column */}
        {addingCol ? (
          <div className="w-64 rounded-2xl border bg-card p-3 h-fit space-y-2">
            <Input
              placeholder="Nombre de la columna"
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { onAddCol(newColName.trim()); setNewColName(""); setAddingCol(false); }
                if (e.key === "Escape") setAddingCol(false);
              }}
              className="h-8 text-xs"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => { onAddCol(newColName.trim()); setNewColName(""); setAddingCol(false); }}
                className="flex-1 h-8 text-xs rounded-lg"
                disabled={!newColName.trim()}
              >
                Añadir
              </Button>
              <button onClick={() => { setAddingCol(false); setNewColName(""); }}
                className="px-3 py-1.5 rounded-lg border text-xs text-muted-foreground hover:bg-secondary transition-colors">
                <X size={13} />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingCol(true)}
            className="flex items-center gap-2 h-10 px-4 rounded-2xl border border-dashed text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors self-start mt-0"
          >
            <Plus size={14} /> Nueva columna
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Create Pipeline Dialog ───────────────────────────────────
const CreatePipelineDialog = ({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, type: CrmPipeline["type"]) => Promise<void>;
}) => {
  const [name, setName]       = useState("");
  const [type, setType]       = useState<CrmPipeline["type"] | null>(null);
  const [saving, setSaving]   = useState(false);

  const reset = () => { setName(""); setType(null); setSaving(false); };

  const handleCreate = async () => {
    if (!name.trim() || !type) return;
    setSaving(true);
    try { await onCreate(name.trim(), type); onClose(); reset(); }
    catch { toast.error("Error al crear pipeline"); }
    finally { setSaving(false); }
  };

  const TYPES: { id: CrmPipeline["type"]; icon: React.ElementType; title: string; desc: string; cols: string }[] = [
    {
      id: "contacts",
      icon: Users,
      title: "Seguimiento de Contactos",
      desc: "Tarjetas vinculadas a contactos. Los nuevos contactos aparecen automáticamente.",
      cols: "Nuevo Lead → Contactado → Propuesta → Cliente → Post-venta",
    },
    {
      id: "tasks",
      icon: ListTodo,
      title: "Tablero de Tareas",
      desc: "Gestiona tareas con título, descripción y prioridad al estilo Kanban.",
      cols: "Por hacer → En progreso → Completado",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); reset(); } }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Nuevo Pipeline</DialogTitle>
          <DialogDescription>Elige el tipo y ponle un nombre.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Type selection */}
          <div className="grid grid-cols-2 gap-3">
            {TYPES.map((t) => {
              const Icon = t.icon;
              const active = type === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={`rounded-2xl border p-4 text-left transition-all space-y-2 ${
                    active ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border hover:border-primary/30 hover:bg-secondary/30"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                    <Icon size={18} />
                  </div>
                  <p className="text-sm font-semibold leading-tight">{t.title}</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{t.desc}</p>
                  <p className="text-[9px] text-muted-foreground/60 font-medium mt-1">{t.cols}</p>
                </button>
              );
            })}
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nombre del pipeline <span className="text-destructive">*</span></label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={type === "contacts" ? "Ej: Leads 2026" : type === "tasks" ? "Ej: Tareas del equipo" : "Nombre..."}
              className="h-9"
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => { onClose(); reset(); }}>Cancelar</Button>
          <Button
            disabled={!name.trim() || !type || saving}
            onClick={handleCreate}
            className="gap-2"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Crear pipeline
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main Component ───────────────────────────────────────────
const CrmPipeline = () => {
  const { allowedIds, can } = useStaffPermissions();
  const canCreatePipeline = can("pipeline", "create");
  const canDeletePipeline = can("pipeline", "delete");
  const { data: allPipelines = [], isLoading } = usePipelines();
  const allowedPipelineIds = allowedIds("pipeline");
  const pipelines = allowedPipelineIds
    ? allPipelines.filter(p => allowedPipelineIds.includes(p.id))
    : allPipelines;
  const { data: contacts = [] } = useContacts();
  const { data: forms = [] } = useForms();
  const createPipeline = useCreatePipeline();
  const updatePipeline = useUpdatePipeline();
  const deletePipeline = useDeletePipeline();

  const [selectedId, setSelectedId]         = useState<string | null>(null);
  const [showCreate, setShowCreate]         = useState(false);
  const [dropdownOpen, setDropdownOpen]     = useState(false);
  const [deleteTarget, setDeleteTarget]     = useState<{ id: string; name: string } | null>(null);

  const selected = useMemo(
    () => pipelines.find((p) => p.id === selectedId) ?? pipelines[0] ?? null,
    [pipelines, selectedId]
  );

  const handleCreate = async (name: string, type: CrmPipeline["type"]) => {
    const data = await createPipeline.mutateAsync({
      name,
      type,
      column_names: DEFAULT_COLUMNS[type],
    });
    setSelectedId(data.id);
  };

  const handleUpdatePipeline = async (patch: Partial<CrmPipeline>) => {
    if (!selected) return;
    await updatePipeline.mutateAsync({ id: selected.id, ...patch });
  };

  const handleDeletePipeline = async () => {
    if (!deleteTarget) return;
    await deletePipeline.mutateAsync({ id: deleteTarget.id, name: deleteTarget.name });
    setDeleteTarget(null);
    setSelectedId(null);
  };

  const TYPE_META: Record<CrmPipeline["type"], { label: string; icon: React.ElementType }> = {
    contacts: { label: "Seguimiento de Contactos", icon: Users },
    tasks:    { label: "Tablero de Tareas",         icon: ListTodo },
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
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={handleDeletePipeline}
        isPending={deletePipeline.isPending}
        description="Se eliminará el pipeline y todas sus tarjetas permanentemente."
      />
      <CreatePipelineDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Pipeline</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Gestiona tus oportunidades y seguimientos</p>
          </div>
          {canCreatePipeline && (
            <Button onClick={() => setShowCreate(true)} className="h-9 rounded-xl text-xs font-medium px-4 gap-2">
              <Plus size={14} /> Nuevo Pipeline
            </Button>
          )}
        </div>

        {/* Empty state */}
        {pipelines.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center">
              <CalendarDays size={24} className="text-muted-foreground/40" />
            </div>
            <div>
              <p className="text-sm font-semibold mb-1">No hay pipelines creados</p>
              <p className="text-xs text-muted-foreground">Crea un pipeline para empezar a organizar tus contactos o tareas.</p>
            </div>
            {canCreatePipeline && (
              <Button onClick={() => setShowCreate(true)} className="gap-2 rounded-xl px-5">
                <Plus size={14} /> Crear primer pipeline
              </Button>
            )}
          </div>
        )}

        {/* Pipeline selector + board */}
        {pipelines.length > 0 && selected && (
          <>
            {/* Selector */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2.5 text-base font-semibold text-primary hover:text-primary/80 bg-primary/5 hover:bg-primary/10 px-4 py-2 rounded-xl border border-primary/20 transition-all"
                >
                  {(() => { const m = TYPE_META[selected.type]; const Icon = m.icon; return <Icon size={16} className="text-primary" />; })()}
                  {selected.name}
                  <ChevronDown size={15} className={`text-primary/60 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {dropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                    <div className="absolute top-full left-0 mt-2 w-80 bg-popover border border-border/80 rounded-2xl shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-150">
                      <p className="px-4 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Tus pipelines</p>
                      {pipelines.map((p) => {
                        const m = TYPE_META[p.type];
                        const Icon = m.icon;
                        const isActive = p.id === selected.id;
                        return (
                          <button
                            key={p.id}
                            onClick={() => { setSelectedId(p.id); setDropdownOpen(false); }}
                            className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 transition-all ${
                              isActive ? "bg-primary/10 text-primary font-semibold border-l-2 border-primary" : "hover:bg-secondary/90 text-foreground"
                            }`}
                          >
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isActive ? "bg-primary/20" : "bg-secondary"}`}>
                              <Icon size={13} className={isActive ? "text-primary" : "text-muted-foreground"} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="truncate">{p.name}</p>
                              <p className="text-[10px] text-muted-foreground/70 font-normal">{m.label}</p>
                            </div>
                            {canDeletePipeline && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: p.id, name: p.name }); setDropdownOpen(false); }}
                                className="p-1 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground/40 transition-colors"
                                title="Eliminar pipeline"
                              >
                                <Trash size={12} />
                              </button>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-primary/20 bg-primary/5 text-primary font-medium">
                {TYPE_META[selected.type].label}
              </Badge>
            </div>

            {/* Board */}
            {selected.type === "contacts" && (
              <ContactsBoard
                pipeline={selected}
                allContacts={contacts}
                forms={forms}
                onUpdatePipeline={handleUpdatePipeline}
              />
            )}
            {selected.type === "tasks" && (
              <TasksBoard
                pipeline={selected}
                allContacts={contacts}
                onUpdatePipeline={handleUpdatePipeline}
              />
            )}

            <p className="text-[11px] text-muted-foreground italic">
              Arrastra tarjetas entre columnas · Haz clic en el nombre de una columna para renombrarla
            </p>
          </>
        )}
      </div>
    </>
  );
};

// tiny helper referenced in dropdown
const Trash = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
  </svg>
);

export default CrmPipeline;
