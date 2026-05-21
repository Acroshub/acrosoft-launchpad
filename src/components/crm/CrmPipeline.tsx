import { useState, useMemo, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  Plus, X, GripVertical, Check, ChevronDown, Loader2,
  Mail, Phone, Tag, User, Users, ListTodo, Kanban,
  AlertCircle, AlertTriangle, Minus, Pencil, Building2, Trash2,
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

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

// ─── Avatar color ─────────────────────────────────────────────
const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
];
function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function initials(name: string): string {
  return name.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

// ─── Contact Card ─────────────────────────────────────────────
const ContactCard = ({
  contact, forms, canEdit, onDelete, onDragStart, onDragOverCard, onDragEnd,
  columns, currentCol, onMoveToCol,
}: {
  contact: CrmContact; forms: CrmForm[]; canEdit: boolean;
  onDelete?: () => void; onDragStart?: () => void;
  onDragOverCard?: () => void; onDragEnd: () => void;
  columns?: string[]; currentCol?: string; onMoveToCol?: (col: string) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [expandedForms, setExpandedForms] = useState<Set<string>>(new Set());
  const [newTag, setNewTag] = useState("");
  const updateContact = useUpdateContact();

  const customFields = (contact.custom_fields as Record<string, Record<string, string>>) ?? {};
  const formsWithData = forms.filter((form) => {
    const vals = customFields[form.id] ?? {};
    return Object.values(vals).some((v) => typeof v === "string" && v.trim());
  });
  const toggleForm = (id: string) =>
    setExpandedForms((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const av = avatarColor(contact.name ?? "");
  const ini = initials(contact.name ?? "?");

  return (
    <div
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      onDragOver={onDragOverCard ? (e) => { e.preventDefault(); onDragOverCard(); } : undefined}
      onDragEnd={onDragEnd}
      className={`bg-card border rounded-2xl overflow-hidden transition-all hover:shadow-sm ${onDragStart ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      {/* Main row */}
      <div className="flex items-center gap-3 px-3.5 py-3">
        {onDragStart && (
          <GripVertical size={13} className="text-muted-foreground/25 shrink-0 hover:text-muted-foreground/60" />
        )}
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${av}`}>
          {ini}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate leading-tight">{contact.name}</p>
          {contact.email && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{contact.email}</p>
          )}
          {!contact.email && contact.notes && (
            <p className="text-xs text-muted-foreground truncate mt-0.5 italic">{contact.notes}</p>
          )}
        </div>
        <div className="flex items-center shrink-0">
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary transition-colors"
          >
            <ChevronDown size={14} className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
          </button>
          {onDelete && (
            <button onClick={onDelete} className="w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Tags strip */}
      {(contact.tags ?? []).length > 0 && (
        <div className="flex gap-1 flex-wrap px-3.5 pb-3 -mt-1">
          {(contact.tags ?? []).map((t) => (
            <span key={t} className="inline-flex items-center gap-0.5 text-[10px] font-medium bg-primary/8 text-primary border border-primary/15 rounded-full px-2 py-0.5">
              {t}
              {canEdit && (
                <button
                  onClick={() => updateContact.mutate({ id: contact.id, tags: (contact.tags ?? []).filter(tag => tag !== t) })}
                  className="rounded-full hover:text-destructive p-0.5 ml-0.5"
                >
                  <X size={8} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Expanded: iOS-style rows */}
      {expanded && (
        <div className="border-t">
          <div className="divide-y divide-border/40">
            {contact.email && (
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <Mail size={12} className="text-muted-foreground/50 shrink-0" />
                  <span className="text-xs text-muted-foreground">Email</span>
                </div>
                <a href={`mailto:${contact.email}`} className="text-xs font-medium text-primary hover:underline truncate max-w-[55%] text-right">
                  {contact.email}
                </a>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <Phone size={12} className="text-muted-foreground/50 shrink-0" />
                  <span className="text-xs text-muted-foreground">Teléfono</span>
                </div>
                <a href={`tel:${contact.phone}`} className="text-xs font-medium text-primary hover:underline">
                  {contact.phone}
                </a>
              </div>
            )}
            {contact.company && (
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <Building2 size={12} className="text-muted-foreground/50 shrink-0" />
                  <span className="text-xs text-muted-foreground">Empresa</span>
                </div>
                <span className="text-xs font-medium truncate max-w-[55%] text-right">{contact.company}</span>
              </div>
            )}
            {contact.notes && contact.email && (
              <div className="px-4 py-3">
                <p className="text-[10px] text-muted-foreground/60 mb-1 uppercase tracking-wider font-semibold">Notas</p>
                <p className="text-xs text-foreground leading-relaxed">{contact.notes}</p>
              </div>
            )}
            {canEdit && (
              <div className="flex items-center gap-2 px-4 py-3">
                <Tag size={12} className="text-muted-foreground/50 shrink-0" />
                <input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    const tag = newTag.trim();
                    if (!tag) return;
                    const current = contact.tags ?? [];
                    if (!current.includes(tag)) updateContact.mutate({ id: contact.id, tags: [...current, tag] });
                    setNewTag("");
                  }}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Añadir etiqueta..."
                  className="flex-1 text-xs bg-transparent border-b border-border/50 focus:border-primary outline-none py-0.5 placeholder:text-muted-foreground/40"
                />
              </div>
            )}
            {formsWithData.map((form) => {
              const vals = customFields[form.id] ?? {};
              const filledFields = (form.fields as Array<{ id: string; label: string }>).filter(
                (f) => vals[f.id] && String(vals[f.id]).trim()
              );
              const isFormOpen = expandedForms.has(form.id);
              return (
                <div key={form.id}>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleForm(form.id); }}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors"
                  >
                    <span className="text-xs font-medium text-muted-foreground">{form.name}</span>
                    <ChevronDown size={12} className={`text-muted-foreground/50 transition-transform ${isFormOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isFormOpen && (
                    <div className="px-4 pb-3 space-y-1.5 bg-secondary/10">
                      {filledFields.map((f) => (
                        <div key={f.id} className="flex justify-between items-start">
                          <span className="text-[10px] text-muted-foreground/60">{f.label}</span>
                          <span className="text-[10px] text-foreground ml-3 text-right max-w-[60%]">{String(vals[f.id])}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {/* Mobile: mover a columna */}
            {onMoveToCol && columns && columns.length > 1 && (
              <div className="lg:hidden px-4 py-3 border-t border-border/40">
                <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest mb-2">Mover a</p>
                <div className="flex flex-wrap gap-1.5">
                  {columns.filter(c => c !== currentCol).map(col => (
                    <button
                      key={col}
                      onClick={(e) => { e.stopPropagation(); onMoveToCol(col); }}
                      className="text-xs font-medium px-3 py-1.5 rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground transition-all active:scale-95"
                    >
                      {col}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Task Card ────────────────────────────────────────────────
const TaskCard = ({
  task, contact, allContacts, onDelete, onDragStart, onDragOverCard, onDragEnd,
  columns, currentCol, onMoveToCol,
}: {
  task: CrmTask; contact?: CrmContact | null; allContacts: CrmContact[];
  onDelete?: () => void; onDragStart?: () => void;
  onDragOverCard?: () => void; onDragEnd: () => void;
  columns?: string[]; currentCol?: string; onMoveToCol?: (col: string) => void;
}) => {
  const updateTask = useUpdateTask();
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
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return;
    try {
      await updateTask.mutateAsync({ id: task.id, title: editTitle.trim(), description: editDesc.trim() || null, priority: editPri, contact_id: editContact || null });
      setIsEditing(false);
    } catch { toast.error("Error al guardar los cambios"); }
  };

  const priority = task.priority ? PRIORITY_STYLES[task.priority] : null;
  const PriorityIcon = priority?.icon;

  const priorityBorderClass = task.priority === "high"
    ? "border-l-[3px] border-l-destructive"
    : task.priority === "medium"
    ? "border-l-[3px] border-l-amber-400"
    : task.priority === "low"
    ? "border-l-[3px] border-l-muted-foreground/30"
    : "";

  // ── Inline edit mode ─────────────────────────────────────────
  if (isEditing) {
    return (
      <div
        className="bg-card border rounded-2xl p-3.5 space-y-2.5 shadow-sm animate-in fade-in zoom-in-95"
        onKeyDown={(e) => { if (e.key === "Escape") setIsEditing(false); }}
      >
        <Input autoFocus value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Título *" className="h-8 text-sm" />
        <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Descripción (opcional)" rows={2} className="text-xs resize-none min-h-0" />
        <div className="flex gap-1.5">
          {(["", "low", "medium", "high"] as const).map((p) => {
            const style  = p ? PRIORITY_STYLES[p] : null;
            const active = editPri === (p || null);
            return (
              <button key={p} type="button" onClick={() => setEditPri(p || null)}
                className={`flex-1 text-[10px] font-semibold rounded-xl border py-2 transition-all ${active ? (p ? style!.className : "bg-secondary text-foreground border-border") : "text-muted-foreground border-transparent hover:bg-secondary/50"}`}
              >
                {p ? style!.label : "—"}
              </button>
            );
          })}
        </div>
        {allContacts.length > 0 && (
          <div className="relative">
            <select value={editContact} onChange={(e) => setEditContact(e.target.value)}
              className="w-full h-9 rounded-xl border bg-background text-xs pl-3 pr-7 appearance-none focus:outline-none focus:ring-1 focus:ring-primary text-muted-foreground">
              <option value="">Sin contacto</option>
              {allContacts.map((c) => <option key={c.id} value={c.id}>{c.name}{c.email ? ` — ${c.email}` : ""}</option>)}
            </select>
            <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        )}
        <div className="flex gap-2 pt-0.5">
          <Button size="sm" className="flex-1 h-9 rounded-xl" disabled={!editTitle.trim() || updateTask.isPending} onClick={handleSaveEdit}>
            {updateTask.isPending ? <Loader2 size={12} className="animate-spin mr-1" /> : null} Guardar
          </Button>
          <button onClick={() => setIsEditing(false)} className="h-9 px-3 rounded-xl border text-muted-foreground hover:bg-secondary transition-colors"><X size={13} /></button>
        </div>
      </div>
    );
  }

  // ── View mode ────────────────────────────────────────────────
  return (
    <div
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      onDragOver={onDragOverCard ? (e) => { e.preventDefault(); onDragOverCard(); } : undefined}
      onDragEnd={onDragEnd}
      className={`bg-card border rounded-2xl overflow-hidden transition-all hover:shadow-sm ${priorityBorderClass} ${onDragStart ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <div className="flex items-start gap-2.5 px-3.5 py-3">
        {onDragStart && <GripVertical size={13} className="text-muted-foreground/25 mt-0.5 shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">{task.title}</p>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{task.description}</p>
          )}
          {(priority || contact) && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {priority && PriorityIcon && (
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold border rounded-full px-2 py-0.5 ${priority.className}`}>
                  <PriorityIcon size={9} /> {priority.label}
                </span>
              )}
              {contact && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium border rounded-full px-2 py-0.5 bg-secondary text-muted-foreground">
                  <User size={9} /> {contact.name}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center shrink-0">
          {onDelete && (
            <button onClick={openEdit} className="w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary transition-colors">
              <Pencil size={13} />
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} className="w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
              <X size={14} />
            </button>
          )}
        </div>
      </div>
      {/* Mobile: mover a columna */}
      {onMoveToCol && columns && columns.length > 1 && (
        <div className="lg:hidden flex items-center gap-2 px-3.5 pb-3 flex-wrap">
          <span className="text-[10px] text-muted-foreground/60 shrink-0">Mover:</span>
          {columns.filter(c => c !== currentCol).map(col => (
            <button
              key={col}
              onClick={(e) => { e.stopPropagation(); onMoveToCol(col); }}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground transition-all active:scale-95"
            >
              {col}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Board Column (desktop) ───────────────────────────────────
const BoardColumn = ({
  name, count, cardDragOver, colDragOver, isBeingDragged,
  onCardDragOver, onCardDrop, onCardDragLeave,
  onColDragStart, onColDragEnd, onRename, onDelete, children, footer,
}: {
  name: string; count: number; cardDragOver: boolean; colDragOver: boolean; isBeingDragged: boolean;
  onCardDragOver: () => void; onCardDrop: () => void; onCardDragLeave: () => void;
  onColDragStart?: () => void; onColDragEnd?: () => void;
  onRename?: (newName: string) => void; onDelete?: () => void;
  children: React.ReactNode; footer: React.ReactNode;
}) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(name);
  const commit = () => { if (val.trim() && val.trim() !== name) onRename?.(val.trim()); setEditing(false); };

  return (
    <div
      className={`flex flex-col w-72 rounded-2xl border bg-secondary/30 overflow-hidden transition-all duration-150 ${
        colDragOver ? "ring-2 ring-primary/60 scale-[1.01]" : cardDragOver ? "ring-2 ring-primary/40" : ""
      } ${isBeingDragged ? "opacity-40" : ""}`}
      onDragOver={(e) => { e.preventDefault(); onCardDragOver(); }}
      onDrop={onCardDrop}
      onDragLeave={onCardDragLeave}
    >
      {/* Header */}
      <div className="px-4 py-3.5 flex items-center gap-2 bg-card border-b">
        {onColDragStart && (
          <div draggable onDragStart={(e) => { e.stopPropagation(); onColDragStart(); }} onDragEnd={onColDragEnd}
            className="cursor-grab active:cursor-grabbing p-0.5 rounded text-muted-foreground/25 hover:text-muted-foreground/60 transition-colors shrink-0">
            <GripVertical size={14} />
          </div>
        )}
        {editing ? (
          <div className="flex items-center gap-2 flex-1">
            <Input value={val} onChange={(e) => setVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setVal(name); setEditing(false); } }}
              className="h-7 text-xs flex-1" autoFocus />
            <button onClick={commit} className="p-1 rounded-lg hover:bg-secondary text-primary transition-colors"><Check size={13} /></button>
          </div>
        ) : (
          <>
            {onRename ? (
              <button onClick={() => { setVal(name); setEditing(true); }} className="text-sm font-semibold flex-1 truncate text-left hover:text-primary transition-colors" title="Renombrar columna">
                {name}
              </button>
            ) : (
              <span className="text-sm font-semibold flex-1 truncate">{name}</span>
            )}
            <span className="text-[11px] font-semibold text-muted-foreground bg-secondary w-6 h-6 rounded-full flex items-center justify-center shrink-0">{count}</span>
            {onDelete && (
              <button onClick={onDelete} className="w-6 h-6 flex items-center justify-center rounded-lg text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0">
                <X size={12} />
              </button>
            )}
          </>
        )}
      </div>
      {/* Cards */}
      <div className="flex-1 p-3 space-y-2.5 min-h-[120px]">
        {children}
        {footer}
      </div>
    </div>
  );
};

// ─── Contacts Board ───────────────────────────────────────────
const ContactsBoard = ({
  pipeline, allContacts, forms, onUpdatePipeline,
}: {
  pipeline: CrmPipeline; allContacts: CrmContact[]; forms: CrmForm[];
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
  const updateContact               = useUpdateContact();

  const [dragCard, setDragCard]             = useState<{ id: string; fromCol: string } | null>(null);
  const [dragOver, setDragOver]             = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
  const [addingTo, setAddingTo]             = useState<string | null>(null);
  const [pickedId, setPickedId]             = useState("");
  const [newNotes, setNewNotes]             = useState("");
  const [deleteTarget, setDeleteTarget]     = useState<string | null>(null);

  const resetDrag = () => { setDragCard(null); setDragOver(null); setDragOverCardId(null); };
  const columns = pipeline.column_names;

  const membershipContactIds = useMemo(() => new Set(memberships.map((m) => m.contact_id)), [memberships]);
  const availableContacts    = useMemo(() => allContacts.filter((c) => !membershipContactIds.has(c.id)), [allContacts, membershipContactIds]);
  const contactMap           = useMemo(() => { const m: Record<string, CrmContact> = {}; for (const c of allContacts) m[c.id] = c; return m; }, [allContacts]);

  const handleReorder = async (col: string, draggedId: string, targetId: string) => {
    const sorted = memberships.filter((m) => m.stage === col).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const dragged = sorted.find((m) => m.id === draggedId);
    if (!dragged) return;
    const without = sorted.filter((m) => m.id !== draggedId);
    const targetIdx = without.findIndex((m) => m.id === targetId);
    if (targetIdx === -1) return;
    without.splice(targetIdx, 0, dragged);
    try { await batchUpdateMembershipPos.mutateAsync(without.map((m, idx) => ({ id: m.id, position: idx * 10, pipelineId: pipeline.id }))); }
    catch { toast.error("Error al reordenar"); }
  };

  const handleDrop = async (toCol: string) => {
    if (!dragCard || !canEdit) { resetDrag(); return; }
    if (dragCard.fromCol === toCol) {
      if (dragOverCardId && dragOverCardId !== dragCard.id) await handleReorder(toCol, dragCard.id, dragOverCardId);
    } else {
      try { await updateMembershipStage.mutateAsync({ membershipId: dragCard.id, stage: toCol, pipelineId: pipeline.id }); }
      catch { toast.error("Error al mover contacto"); }
    }
    resetDrag();
  };

  const handleRenameCol = async (oldName: string, newName: string) => {
    try {
      await onUpdatePipeline({ column_names: columns.map((c) => (c === oldName ? newName : c)) });
      await batchUpdateMembershipStage.mutateAsync({ pipelineId: pipeline.id, oldStage: oldName, newStage: newName });
      toast.success("Columna renombrada");
    } catch { toast.error("Error al renombrar la columna"); }
  };

  const [deleteColTarget, setDeleteColTarget] = useState<string | null>(null);
  const handleDeleteCol = (colName: string) => {
    if (memberships.filter((m) => m.stage === colName).length > 0) { toast.error(`"${colName}" tiene contactos — muévelos antes.`); return; }
    setDeleteColTarget(colName);
  };
  const handleConfirmDeleteCol = async () => {
    if (!deleteColTarget) return;
    try { await onUpdatePipeline({ column_names: columns.filter((c) => c !== deleteColTarget) }); toast.success(`Columna eliminada`); }
    catch { toast.error("Error al eliminar la columna"); }
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
      if (newNotes.trim()) await updateContact.mutateAsync({ id: pickedId, notes: newNotes.trim() });
      toast.success(`${contact?.name ?? "Contacto"} añadido`);
      setAddingTo(null);
    } catch { toast.error("Error al añadir contacto"); }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try { await removeContactMembership.mutateAsync({ membershipId: deleteTarget, pipelineId: pipeline.id }); toast.success("Contacto removido"); }
    catch { toast.error("Error al remover"); }
    setDeleteTarget(null);
  };

  const handleMoveMobile = async (membershipId: string, toCol: string) => {
    try { await updateMembershipStage.mutateAsync({ membershipId, stage: toCol, pipelineId: pipeline.id }); }
    catch { toast.error("Error al mover contacto"); }
  };

  const renderAddForm = (col: string) =>
    canEdit && addingTo === col ? (
      <div className="bg-card border rounded-2xl p-3.5 space-y-2.5 shadow-sm animate-in fade-in zoom-in-95">
        {availableContacts.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">Todos los contactos ya están en este pipeline</p>
        ) : (
          <>
            <div className="relative">
              <select autoFocus value={pickedId} onChange={(e) => setPickedId(e.target.value)}
                className="w-full h-9 rounded-xl border bg-background text-xs pl-3 pr-7 appearance-none focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">Seleccionar contacto *</option>
                {availableContacts.map((c) => <option key={c.id} value={c.id}>{c.name}{c.email ? ` — ${c.email}` : ""}</option>)}
              </select>
              <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
            <Textarea placeholder="Notas (opcional)" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} rows={2} className="text-xs resize-none min-h-0" />
          </>
        )}
        <div className="flex gap-2">
          <Button size="sm" className="flex-1 h-9 rounded-xl" disabled={!pickedId || addContactMembership.isPending} onClick={() => handleSaveCard(col)}>
            {addContactMembership.isPending ? <Loader2 size={12} className="animate-spin mr-1" /> : null} Añadir
          </Button>
          <button onClick={() => setAddingTo(null)} className="h-9 px-3 rounded-xl border text-muted-foreground hover:bg-secondary"><X size={13} /></button>
        </div>
      </div>
    ) : canEdit ? (
      <button
        onClick={() => { setAddingTo(col); setPickedId(""); setNewNotes(""); }}
        className="w-full flex items-center justify-center gap-1.5 h-10 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors border border-dashed border-border/60 hover:border-border mt-1"
      >
        <Plus size={13} /> Añadir contacto
      </button>
    ) : null;

  return (
    <>
      <DeleteConfirmDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }} onConfirm={handleConfirmDelete} isPending={removeContactMembership.isPending} description="El contacto se removerá del pipeline pero no se eliminará del CRM." />
      <DeleteConfirmDialog open={!!deleteColTarget} onOpenChange={(o) => { if (!o) setDeleteColTarget(null); }} onConfirm={handleConfirmDeleteCol} isPending={false} description={`¿Eliminar la columna "${deleteColTarget}"?`} />
      <BoardGrid
        columns={columns}
        dragOver={dragOver}
        onDragOver={canEdit ? setDragOver : () => {}}
        onDrop={handleDrop}
        onDragLeave={() => { setDragOver(null); setDragOverCardId(null); }}
        onRenameCol={canEdit ? handleRenameCol : undefined}
        onDeleteCol={canEdit ? handleDeleteCol : undefined}
        onAddCol={canEdit ? handleAddCol : undefined}
        onReorderCols={canEdit ? (newOrder) => onUpdatePipeline({ column_names: newOrder }) : undefined}
        getCount={(col) => memberships.filter((m) => m.stage === col).length}
        renderCards={(col) => {
          const sorted = memberships.filter((m) => m.stage === col).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
          return (
            <>
              {sorted.map((membership) => {
                const contact = contactMap[membership.contact_id];
                if (!contact) return null;
                const showIndicator = dragCard?.fromCol === col && dragOverCardId === membership.id && dragCard.id !== membership.id;
                return (
                  <Fragment key={membership.id}>
                    {showIndicator && <div className="h-0.5 bg-primary/60 rounded-full mx-1" />}
                    <ContactCard contact={contact} forms={forms} canEdit={canEdit}
                      onDelete={canEdit ? () => setDeleteTarget(membership.id) : undefined}
                      onDragStart={canEdit ? () => { setDragCard({ id: membership.id, fromCol: col }); setDragOverCardId(null); } : undefined}
                      onDragOverCard={canEdit ? () => setDragOverCardId(membership.id) : undefined}
                      onDragEnd={resetDrag}
                      columns={columns} currentCol={col}
                      onMoveToCol={canEdit ? (toCol) => handleMoveMobile(membership.id, toCol) : undefined} />
                  </Fragment>
                );
              })}
            </>
          );
        }}
        renderCreation={renderAddForm}
      />
    </>
  );
};

// ─── Tasks Board ──────────────────────────────────────────────
const TasksBoard = ({
  pipeline, allContacts, onUpdatePipeline,
}: {
  pipeline: CrmPipeline; allContacts: CrmContact[];
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
  const columns   = pipeline.column_names;

  const sortTasks = (list: CrmTask[]) =>
    [...list].sort((a, b) =>
      (PRIORITY_ORDER[a.priority ?? ""] ?? 3) - (PRIORITY_ORDER[b.priority ?? ""] ?? 3) ||
      (a.position ?? 0) - (b.position ?? 0) ||
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

  const handleReorder = async (col: string, draggedId: string, targetId: string) => {
    const sorted = sortTasks(tasks.filter((t) => t.stage === col));
    const draggedTask = sorted.find((t) => t.id === draggedId);
    const targetTask  = sorted.find((t) => t.id === targetId);
    if (!draggedTask || !targetTask || draggedTask.priority !== targetTask.priority) return;
    const group   = sorted.filter((t) => t.priority === draggedTask.priority);
    const without = group.filter((t) => t.id !== draggedId);
    const targetIdx = without.findIndex((t) => t.id === targetId);
    if (targetIdx === -1) return;
    without.splice(targetIdx, 0, draggedTask);
    try { await batchUpdateTaskPos.mutateAsync(without.map((t, idx) => ({ id: t.id, position: idx * 10, pipelineId: pipeline.id }))); }
    catch { toast.error("Error al reordenar"); }
  };

  const handleDrop = async (toCol: string) => {
    if (!dragCard || !canEdit) { resetDrag(); return; }
    if (dragCard.fromCol === toCol) {
      if (dragOverCardId && dragOverCardId !== dragCard.id) await handleReorder(toCol, dragCard.id, dragOverCardId);
    } else {
      try { await updateTask.mutateAsync({ id: dragCard.id, stage: toCol }); }
      catch { toast.error("Error al mover tarea"); }
    }
    resetDrag();
  };

  const handleRenameCol = async (oldName: string, newName: string) => {
    try {
      await onUpdatePipeline({ column_names: columns.map((c) => (c === oldName ? newName : c)) });
      await batchUpdateTasks.mutateAsync({ pipelineId: pipeline.id, oldStage: oldName, newStage: newName });
      toast.success("Columna renombrada");
    } catch { toast.error("Error al renombrar"); }
  };

  const [deleteColTarget, setDeleteColTarget] = useState<string | null>(null);
  const handleDeleteCol = (colName: string) => {
    if (tasks.filter((t) => t.stage === colName).length > 0) { toast.error(`"${colName}" tiene tareas — muévelas antes.`); return; }
    setDeleteColTarget(colName);
  };
  const handleConfirmDeleteCol = async () => {
    if (!deleteColTarget) return;
    try { await onUpdatePipeline({ column_names: columns.filter((c) => c !== deleteColTarget) }); toast.success("Columna eliminada"); }
    catch { toast.error("Error al eliminar"); }
    setDeleteColTarget(null);
  };
  const handleAddCol = async (name: string) => {
    if (columns.includes(name)) { toast.error("Esa columna ya existe"); return; }
    await onUpdatePipeline({ column_names: [...columns, name] });
  };
  const handleSaveCard = async (col: string) => {
    if (!newTitle.trim()) return;
    const priority = newPri || null;
    const group = tasks.filter((t) => t.stage === col && t.priority === priority);
    const maxPos = group.length > 0 ? Math.max(...group.map((t) => t.position ?? 0)) : -10;
    try {
      await createTask.mutateAsync({ pipeline_id: pipeline.id, title: newTitle.trim(), description: newDesc.trim() || null, priority, stage: col, contact_id: newContactId || null, position: maxPos + 10 });
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

  const handleMoveMobile = async (taskId: string, toCol: string) => {
    try { await updateTask.mutateAsync({ id: taskId, stage: toCol }); }
    catch { toast.error("Error al mover tarea"); }
  };

  const renderAddForm = (col: string) =>
    canEdit && addingTo === col ? (
      <div className="bg-card border rounded-2xl p-3.5 space-y-2.5 shadow-sm animate-in fade-in zoom-in-95">
        <Input autoFocus placeholder="Título *" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") setAddingTo(null); }} className="h-9 text-sm" />
        <Textarea placeholder="Descripción (opcional)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={2} className="text-xs resize-none min-h-0" />
        <div className="flex gap-1.5">
          {(["", "low", "medium", "high"] as const).map((p) => {
            const style = p ? PRIORITY_STYLES[p] : null;
            return (
              <button key={p} onClick={() => setNewPri(p)}
                className={`flex-1 text-[10px] font-semibold rounded-xl border py-2 transition-all ${newPri === p ? (p ? style!.className : "bg-secondary text-foreground border-border") : "text-muted-foreground border-transparent hover:bg-secondary/50"}`}>
                {p ? style!.label : "—"}
              </button>
            );
          })}
        </div>
        {allContacts.length > 0 && (
          <div className="relative">
            <select value={newContactId} onChange={(e) => setNewContactId(e.target.value)}
              className="w-full h-9 rounded-xl border bg-background text-xs pl-3 pr-7 appearance-none focus:outline-none focus:ring-1 focus:ring-primary text-muted-foreground">
              <option value="">Contacto (opcional)</option>
              {allContacts.map((c) => <option key={c.id} value={c.id}>{c.name}{c.email ? ` — ${c.email}` : ""}</option>)}
            </select>
            <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        )}
        <div className="flex gap-2">
          <Button size="sm" className="flex-1 h-9 rounded-xl" disabled={!newTitle.trim() || createTask.isPending} onClick={() => handleSaveCard(col)}>
            {createTask.isPending ? <Loader2 size={12} className="animate-spin mr-1" /> : null} Guardar
          </Button>
          <button onClick={() => setAddingTo(null)} className="h-9 px-3 rounded-xl border text-muted-foreground hover:bg-secondary"><X size={13} /></button>
        </div>
      </div>
    ) : canEdit ? (
      <button
        onClick={() => { setAddingTo(col); setNewTitle(""); setNewDesc(""); setNewPri(""); setNewContactId(""); }}
        className="w-full flex items-center justify-center gap-1.5 h-10 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors border border-dashed border-border/60 hover:border-border mt-1"
      >
        <Plus size={13} /> Añadir tarea
      </button>
    ) : null;

  return (
    <>
      <DeleteConfirmDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }} onConfirm={handleConfirmDelete} isPending={deleteTask.isPending} description="Se eliminará la tarea permanentemente." />
      <DeleteConfirmDialog open={!!deleteColTarget} onOpenChange={(o) => { if (!o) setDeleteColTarget(null); }} onConfirm={handleConfirmDeleteCol} isPending={false} description={`¿Eliminar la columna "${deleteColTarget}"?`} />
      <BoardGrid
        columns={columns}
        dragOver={dragOver}
        onDragOver={canEdit ? setDragOver : () => {}}
        onDrop={handleDrop}
        onDragLeave={() => { setDragOver(null); setDragOverCardId(null); }}
        onRenameCol={canEdit ? handleRenameCol : undefined}
        onDeleteCol={canEdit ? handleDeleteCol : undefined}
        onAddCol={canEdit ? handleAddCol : undefined}
        onReorderCols={canEdit ? (newOrder) => onUpdatePipeline({ column_names: newOrder }) : undefined}
        getCount={(col) => tasks.filter((t) => t.stage === col).length}
        renderCards={(col) => {
          const sorted = sortTasks(tasks.filter((t) => t.stage === col));
          const draggedTask = dragCard ? tasks.find((t) => t.id === dragCard.id) : null;
          return (
            <>
              {sorted.map((task) => {
                const showIndicator = dragCard?.fromCol === col && dragOverCardId === task.id && dragCard.id !== task.id && draggedTask?.priority === task.priority;
                return (
                  <Fragment key={task.id}>
                    {showIndicator && <div className="h-0.5 bg-primary/60 rounded-full mx-1" />}
                    <TaskCard task={task}
                      contact={task.contact_id ? (allContacts.find((c) => c.id === task.contact_id) ?? null) : null}
                      allContacts={allContacts}
                      onDelete={canEdit ? () => setDeleteTarget({ id: task.id, name: task.title }) : undefined}
                      onDragStart={canEdit ? () => { setDragCard({ id: task.id, fromCol: col }); setDragOverCardId(null); } : undefined}
                      onDragOverCard={canEdit ? () => setDragOverCardId(task.id) : undefined}
                      onDragEnd={resetDrag}
                      columns={columns} currentCol={col}
                      onMoveToCol={canEdit ? (toCol) => handleMoveMobile(task.id, toCol) : undefined} />
                  </Fragment>
                );
              })}
            </>
          );
        }}
        renderCreation={renderAddForm}
      />
    </>
  );
};

// ─── Board Grid ───────────────────────────────────────────────
const BoardGrid = ({
  columns, dragOver, onDragOver, onDrop, onDragLeave,
  onRenameCol, onDeleteCol, onAddCol, onReorderCols,
  getCount, renderCards, renderCreation,
}: {
  columns: string[]; dragOver: string | null;
  onDragOver: (col: string) => void; onDrop: (col: string) => void; onDragLeave: () => void;
  onRenameCol?: (old: string, next: string) => void; onDeleteCol?: (col: string) => void;
  onAddCol?: (name: string) => void; onReorderCols?: (newOrder: string[]) => void;
  getCount: (col: string) => number;
  renderCards: (col: string) => React.ReactNode;
  renderCreation: (col: string) => React.ReactNode;
}) => {
  const [addingCol, setAddingCol]     = useState(false);
  const [newColName, setNewColName]   = useState("");
  const [draggingCol, setDraggingCol] = useState<string | null>(null);
  const [colDragOver, setColDragOver] = useState<string | null>(null);
  const [mobileCol, setMobileCol]     = useState(columns[0] ?? "");

  const activeMobileCol = columns.includes(mobileCol) ? mobileCol : (columns[0] ?? "");

  const handleColDrop = (targetCol: string) => {
    if (!draggingCol || draggingCol === targetCol) return;
    const from = columns.indexOf(draggingCol);
    const to   = columns.indexOf(targetCol);
    const next = [...columns];
    next.splice(from, 1);
    next.splice(to, 0, draggingCol);
    onReorderCols?.(next);
    setDraggingCol(null);
    setColDragOver(null);
  };

  return (
    <>
      {/* ── Mobile ── */}
      <div className="lg:hidden space-y-4">
        {/* Column tabs + add button */}
        <div className="flex items-center gap-2">
          <div className="flex-1 overflow-x-auto scrollbar-none">
            <div className="flex gap-1 bg-secondary/60 rounded-xl p-1 w-max">
              {columns.map((col) => {
                const count    = getCount(col);
                const isActive = col === activeMobileCol;
                return (
                  <button key={col} onClick={() => setMobileCol(col)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {col}
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                      isActive ? "bg-white/20" : "bg-background text-muted-foreground"
                    }`}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {onAddCol && !addingCol && (
            <button
              onClick={() => setAddingCol(true)}
              className="w-9 h-9 rounded-xl bg-secondary/60 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
              title="Nueva columna"
            >
              <Plus size={16} />
            </button>
          )}
        </div>

        {/* Add column inline form */}
        {addingCol && onAddCol && (
          <div className="bg-card border rounded-2xl p-4 space-y-3">
            <p className="text-xs font-semibold">Nueva columna</p>
            <Input placeholder="Nombre de la columna" value={newColName} onChange={(e) => setNewColName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && newColName.trim()) { onAddCol(newColName.trim()); setNewColName(""); setAddingCol(false); } if (e.key === "Escape") { setAddingCol(false); setNewColName(""); } }}
              className="h-10" autoFocus />
            <div className="flex gap-2">
              <Button className="flex-1 h-10 rounded-xl" disabled={!newColName.trim()} onClick={() => { onAddCol(newColName.trim()); setNewColName(""); setAddingCol(false); }}>Añadir</Button>
              <button onClick={() => { setAddingCol(false); setNewColName(""); }} className="px-4 h-10 rounded-xl border text-muted-foreground hover:bg-secondary transition-colors"><X size={14} /></button>
            </div>
          </div>
        )}

        {/* Active column cards */}
        <div
          onDragOver={(e) => { e.preventDefault(); onDragOver(activeMobileCol); }}
          onDrop={() => onDrop(activeMobileCol)}
          onDragLeave={onDragLeave}
          className="space-y-2.5 min-h-[200px]"
        >
          {renderCards(activeMobileCol)}
          {renderCreation(activeMobileCol)}
          {getCount(activeMobileCol) === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mb-3">
                <Kanban size={20} className="text-muted-foreground/40" />
              </div>
              <p className="text-xs text-muted-foreground">Sin elementos en esta columna</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Desktop: horizontal scroll kanban ── */}
      <div className="hidden lg:block overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {columns.map((col) => (
            <div key={col}
              onDragOver={(e) => { e.preventDefault(); if (draggingCol) setColDragOver(col); }}
              onDrop={() => { if (draggingCol) handleColDrop(col); else onDrop(col); }}
              onDragLeave={() => { if (draggingCol) setColDragOver(null); else onDragLeave(); }}
            >
              <BoardColumn
                name={col} count={getCount(col)}
                cardDragOver={!draggingCol && dragOver === col}
                colDragOver={!!draggingCol && colDragOver === col}
                isBeingDragged={draggingCol === col}
                onCardDragOver={() => { if (!draggingCol) onDragOver(col); }}
                onCardDrop={() => { if (!draggingCol) onDrop(col); }}
                onCardDragLeave={() => { if (!draggingCol) onDragLeave(); }}
                onColDragStart={onReorderCols ? () => setDraggingCol(col) : undefined}
                onColDragEnd={onReorderCols ? () => { setDraggingCol(null); setColDragOver(null); } : undefined}
                onRename={onRenameCol ? (next) => onRenameCol(col, next) : undefined}
                onDelete={onDeleteCol ? () => onDeleteCol(col) : undefined}
                footer={renderCreation(col)}
              >
                {renderCards(col)}
                {getCount(col) === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <p className="text-xs text-muted-foreground/50">Sin elementos</p>
                  </div>
                )}
              </BoardColumn>
            </div>
          ))}

          {/* Add column (desktop) */}
          {onAddCol && (addingCol ? (
            <div className="w-72 rounded-2xl border bg-card p-4 h-fit space-y-3">
              <Input placeholder="Nombre de la columna" value={newColName} onChange={(e) => setNewColName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && newColName.trim()) { onAddCol(newColName.trim()); setNewColName(""); setAddingCol(false); } if (e.key === "Escape") setAddingCol(false); }}
                className="h-9 text-sm" autoFocus />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => { onAddCol(newColName.trim()); setNewColName(""); setAddingCol(false); }} className="flex-1 h-8 text-xs rounded-xl" disabled={!newColName.trim()}>Añadir</Button>
                <button onClick={() => { setAddingCol(false); setNewColName(""); }} className="px-3 rounded-xl border text-muted-foreground hover:bg-secondary transition-colors"><X size={13} /></button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingCol(true)}
              className="flex items-center gap-2 h-10 px-4 rounded-2xl border border-dashed text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors self-start">
              <Plus size={14} /> Nueva columna
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

// ─── Create Pipeline Dialog ───────────────────────────────────
const CreatePipelineDialog = ({
  open, onClose, onCreate,
}: {
  open: boolean; onClose: () => void;
  onCreate: (name: string, type: CrmPipeline["type"]) => Promise<void>;
}) => {
  const [name, setName]     = useState("");
  const [type, setType]     = useState<CrmPipeline["type"] | null>(null);
  const [saving, setSaving] = useState(false);
  const reset = () => { setName(""); setType(null); setSaving(false); };
  const handleCreate = async () => {
    if (!name.trim() || !type) return;
    setSaving(true);
    try { await onCreate(name.trim(), type); onClose(); reset(); }
    catch { toast.error("Error al crear pipeline"); }
    finally { setSaving(false); }
  };
  const TYPES: { id: CrmPipeline["type"]; icon: React.ElementType; title: string; desc: string; cols: string }[] = [
    { id: "contacts", icon: Users, title: "Seguimiento de Contactos", desc: "Tarjetas vinculadas a contactos del CRM.", cols: "Nuevo Lead → Contactado → Propuesta → Cliente" },
    { id: "tasks",    icon: ListTodo, title: "Tablero de Tareas", desc: "Gestiona tareas con prioridad al estilo Kanban.", cols: "Por hacer → En progreso → Completado" },
  ];
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); reset(); } }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Nuevo Pipeline</DialogTitle>
          <DialogDescription>Elige el tipo y ponle un nombre.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="grid grid-cols-2 gap-3">
            {TYPES.map((t) => {
              const Icon = t.icon;
              const active = type === t.id;
              return (
                <button key={t.id} onClick={() => setType(t.id)}
                  className={`rounded-2xl border p-4 text-left transition-all space-y-2 ${active ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border hover:border-primary/30 hover:bg-secondary/30"}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                    <Icon size={18} />
                  </div>
                  <p className="text-sm font-semibold leading-tight">{t.title}</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{t.desc}</p>
                  <p className="text-[9px] text-muted-foreground/50 font-medium">{t.cols}</p>
                </button>
              );
            })}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nombre del pipeline <span className="text-destructive">*</span></label>
            <Input value={name} onChange={(e) => setName(e.target.value)}
              placeholder={type === "contacts" ? "Ej: Leads 2026" : type === "tasks" ? "Ej: Tareas del equipo" : "Nombre..."}
              className="h-10" onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { onClose(); reset(); }}>Cancelar</Button>
          <Button disabled={!name.trim() || !type || saving} onClick={handleCreate} className="gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Crear pipeline
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
  const { data: forms = [] }    = useForms();
  const createPipeline = useCreatePipeline();
  const updatePipeline = useUpdatePipeline();
  const deletePipeline = useDeletePipeline();

  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [showCreate, setShowCreate]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [pickerOpen, setPickerOpen]     = useState(false);

  const selected = useMemo(
    () => pipelines.find((p) => p.id === selectedId) ?? pipelines[0] ?? null,
    [pipelines, selectedId]
  );

  const handleCreate = async (name: string, type: CrmPipeline["type"]) => {
    const data = await createPipeline.mutateAsync({ name, type, column_names: DEFAULT_COLUMNS[type] });
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
    contacts: { label: "Contactos", icon: Users },
    tasks:    { label: "Tareas",    icon: ListTodo },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={22} className="animate-spin text-muted-foreground" />
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
      <CreatePipelineDialog open={showCreate} onClose={() => setShowCreate(false)} onCreate={handleCreate} />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Pipeline</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Gestiona tus oportunidades y seguimientos</p>
          </div>
          {canCreatePipeline && (
            <Button onClick={() => setShowCreate(true)} className="h-9 rounded-xl text-sm font-medium px-4 gap-2 shrink-0">
              <Plus size={14} /> Nuevo Pipeline
            </Button>
          )}
        </div>

        {/* Empty state */}
        {pipelines.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-5">
            <div className="w-16 h-16 rounded-3xl bg-secondary flex items-center justify-center">
              <Kanban size={28} className="text-muted-foreground/40" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold">Sin pipelines</p>
              <p className="text-sm text-muted-foreground max-w-xs">Crea un pipeline para organizar tus contactos o tareas en columnas Kanban.</p>
            </div>
            {canCreatePipeline && (
              <Button onClick={() => setShowCreate(true)} className="gap-2 rounded-xl px-5 h-10">
                <Plus size={14} /> Crear primer pipeline
              </Button>
            )}
          </div>
        )}

        {/* Pipeline selector + board */}
        {pipelines.length > 0 && selected && (
          <>
            {/* Pipeline dropdown selector */}
            <div className="relative">
              {(() => {
                const SelIcon = TYPE_META[selected.type].icon;
                return (
                  <button
                    onClick={() => setPickerOpen(v => !v)}
                    className="flex items-center gap-2 h-9 px-3.5 rounded-xl border bg-card hover:bg-secondary/50 transition-colors text-sm font-medium min-w-0 max-w-xs"
                  >
                    <SelIcon size={14} className="text-muted-foreground shrink-0" />
                    <span className="truncate">{selected.name}</span>
                    <ChevronDown size={13} className={`text-muted-foreground shrink-0 transition-transform duration-200 ${pickerOpen ? "rotate-180" : ""}`} />
                  </button>
                );
              })()}

              {pickerOpen && (
                <>
                  {/* Backdrop */}
                  <div className="fixed inset-0 z-10" onClick={() => setPickerOpen(false)} />
                  {/* Dropdown list */}
                  <div className="absolute top-full left-0 mt-1.5 w-64 bg-card border rounded-2xl shadow-lg z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    {pipelines.map((p) => {
                      const Icon = TYPE_META[p.type].icon;
                      const isActive = p.id === selected.id;
                      return (
                        <div key={p.id} className={`flex items-center gap-2 px-3.5 transition-colors ${isActive ? "bg-secondary/40" : "hover:bg-secondary/30"}`}>
                          <button
                            onClick={() => { setSelectedId(p.id); setPickerOpen(false); }}
                            className="flex items-center gap-3 flex-1 min-w-0 py-3 text-left"
                          >
                            <Icon size={14} className="text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm truncate ${isActive ? "font-semibold" : "font-medium"}`}>{p.name}</p>
                              <p className="text-[10px] text-muted-foreground">{TYPE_META[p.type].label}</p>
                            </div>
                            {isActive && <Check size={13} className="text-primary shrink-0" />}
                          </button>
                          {canDeletePipeline && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: p.id, name: p.name }); setPickerOpen(false); }}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Board */}
            {selected.type === "contacts" && (
              <ContactsBoard pipeline={selected} allContacts={contacts} forms={forms} onUpdatePipeline={handleUpdatePipeline} />
            )}
            {selected.type === "tasks" && (
              <TasksBoard pipeline={selected} allContacts={contacts} onUpdatePipeline={handleUpdatePipeline} />
            )}

            <p className="hidden lg:block text-[11px] text-muted-foreground/60">
              Arrastra tarjetas entre columnas · Haz clic en el nombre de una columna para renombrarla
            </p>
          </>
        )}
      </div>
    </>
  );
};

export default CrmPipeline;
