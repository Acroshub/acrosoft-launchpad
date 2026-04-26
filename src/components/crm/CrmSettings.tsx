import { useState, useMemo, useEffect } from "react";
import { Activity, Loader2, Filter, Users, ChevronDown, Search, X, Plus, Trash2, Mail, Pencil, ToggleLeft, ToggleRight, BellOff, CheckCircle2, AlertCircle, Clock, Send, Globe, CalendarDays } from "lucide-react";
import { useLogs, useStaff, useCreateStaff, useUpdateStaff, useDeleteStaff, useInviteStaff, useReminderConfig, useUpsertReminderConfig, useReminders, useCalendars, useBusinessProfile, useUpsertBusinessProfile } from "@/hooks/useCrmData";
import type { CrmLog } from "@/hooks/useCrmData";
import type { CrmStaff, StaffPermission, CrmReminder } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";

// ─── Logs Tab ─────────────────────────────────────────────────────────────────

const ACTION_STYLE: Record<string, string> = {
  create: "text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30",
  update: "text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30",
  delete: "text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30",
};

const ACTION_LABEL: Record<string, string> = {
  create: "Creado",
  update: "Actualizado",
  delete: "Eliminado",
};

const LogRow = ({ log, isLast }: { log: CrmLog; isLast: boolean }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={isLast ? "" : "border-b"}>
      <div className="px-5 py-3.5 flex items-center gap-4">
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0 ${
            ACTION_STYLE[log.action] ?? "text-muted-foreground bg-secondary"
          }`}
        >
          {ACTION_LABEL[log.action] ?? log.action}
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{log.description ?? "—"}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">
            {log.entity}
          </p>
        </div>

        <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
          {new Date(log.created_at).toLocaleString("es-ES", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>

        <button
          onClick={() => setExpanded((v) => !v)}
          className="p-1 rounded-md text-muted-foreground/40 hover:text-muted-foreground hover:bg-secondary transition-colors shrink-0"
          title={expanded ? "Contraer" : "Expandir detalle"}
        >
          <ChevronDown size={14} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      </div>

      {expanded && (
        <div className="px-5 pb-4 pt-0 bg-secondary/30 border-t">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-2 mt-3">
            <div>
              <dt className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">Acción</dt>
              <dd className="text-xs text-foreground mt-0.5">{ACTION_LABEL[log.action] ?? log.action}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">Entidad</dt>
              <dd className="text-xs text-foreground mt-0.5">{log.entity}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">Descripción</dt>
              <dd className="text-xs text-foreground mt-0.5">{log.description ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">ID del registro</dt>
              <dd className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate">{log.entity_id ?? "—"}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">Fecha y hora exacta</dt>
              <dd className="text-xs text-foreground mt-0.5">
                {new Date(log.created_at).toLocaleString("es-ES", {
                  weekday: "long", year: "numeric", month: "long",
                  day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
                })}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
};

const LOGS_PER_PAGE = 20;

const LogsTab = () => {
  const { data: logs = [], isLoading } = useLogs();
  const [actionFilter, setActionFilter] = useState<"all" | "create" | "update" | "delete">("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]   = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return logs.filter((l) => {
      if (actionFilter !== "all" && l.action !== actionFilter) return false;
      if (dateFrom && l.created_at < dateFrom) return false;
      if (dateTo   && l.created_at.slice(0, 10) > dateTo) return false;
      if (q) {
        const haystack = [l.description, l.entity, l.entity_id].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [logs, actionFilter, search, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / LOGS_PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const visible    = filtered.slice((safePage - 1) * LOGS_PER_PAGE, safePage * LOGS_PER_PAGE);

  const resetFilters = () => { setSearch(""); setDateFrom(""); setDateTo(""); setActionFilter("all"); setPage(1); };
  const hasFilters = search || dateFrom || dateTo || actionFilter !== "all";

  return (
    <div className="space-y-5">
      {/* ─── Filtros ─── */}
      <div className="space-y-3">
        {/* Buscador */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por descripción, entidad, ID..."
            className="h-9 pl-8 pr-8 text-sm"
          />
          {search && (
            <button onClick={() => { setSearch(""); setPage(1); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Acción + fechas */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
            <Filter size={12} /> Acción:
          </div>
          {(["all", "create", "update", "delete"] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setActionFilter(f); setPage(1); }}
              className={`text-xs font-semibold px-3 py-1 rounded-full border transition-all ${
                actionFilter === f
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
              }`}
            >
              {f === "all" ? "Todos" : ACTION_LABEL[f]}
            </button>
          ))}

          <div className="flex items-center gap-1.5 ml-auto">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="h-7 text-xs border rounded-lg px-2 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              title="Desde"
            />
            <span className="text-muted-foreground text-xs">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="h-7 text-xs border rounded-lg px-2 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              title="Hasta"
            />
            {hasFilters && (
              <button onClick={resetFilters}
                className="text-xs text-muted-foreground hover:text-foreground underline ml-1">
                Limpiar
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{filtered.length} {filtered.length === 1 ? "entrada" : "entradas"}</span>
          {totalPages > 1 && (
            <span>Página {safePage} de {totalPages}</span>
          )}
        </div>
      </div>

      {/* ─── Contenido ─── */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={22} className="animate-spin text-muted-foreground" />
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-20 bg-card border rounded-2xl">
          <Activity size={30} className="mx-auto text-muted-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground">
            {hasFilters ? "No hay entradas para estos filtros." : "No hay actividad registrada aún."}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-card border rounded-2xl overflow-hidden">
            {visible.map((log, i) => (
              <LogRow key={log.id} log={log} isLast={i === visible.length - 1} />
            ))}
          </div>

          {/* ─── Paginación ─── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 pt-1">
              <button
                disabled={safePage === 1}
                onClick={() => setPage(p => p - 1)}
                className="h-7 px-3 text-xs rounded-lg border text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
                .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "…" ? (
                    <span key={`ellipsis-${i}`} className="text-xs text-muted-foreground px-1">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                        safePage === p
                          ? "bg-primary text-primary-foreground"
                          : "border text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}

              <button
                disabled={safePage === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="h-7 px-3 text-xs rounded-lg border text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ─── Staff helpers ────────────────────────────────────────────────────────────

type PermKey = keyof Pick<
  CrmStaff,
  | "perm_mi_negocio_datos"
  | "perm_mi_negocio_personal"
  | "perm_servicios"
  | "perm_dashboard"
  | "perm_ventas"
  | "perm_calendarios"
  | "perm_formularios"
  | "perm_contactos"
  | "perm_pipeline"
>;

const PERM_SECTIONS: { key: PermKey; label: string; actions: (keyof StaffPermission)[] }[] = [
  { key: "perm_mi_negocio_datos",    label: "Mi Negocio — Datos del negocio",  actions: ["read", "edit"] },
  { key: "perm_mi_negocio_personal", label: "Mi Negocio — Datos personales",   actions: ["read", "edit"] },
  { key: "perm_servicios",           label: "Servicios",                        actions: ["read", "edit", "create", "delete"] },
  { key: "perm_dashboard",           label: "Dashboard",                        actions: ["read"] },
  { key: "perm_ventas",              label: "Registro de Ventas",               actions: ["read", "edit", "create", "delete"] },
  { key: "perm_calendarios",         label: "Calendarios",                      actions: ["read", "edit", "create", "delete"] },
  { key: "perm_formularios",         label: "Formularios",                      actions: ["read", "edit", "create", "delete"] },
  { key: "perm_contactos",           label: "Contactos",                        actions: ["read", "edit", "create", "delete"] },
  { key: "perm_pipeline",            label: "Pipeline",                         actions: ["read", "edit", "create", "delete"] },
];

const PERM_ACTION_LABEL: Record<keyof StaffPermission, string> = {
  read:   "Ver",
  edit:   "Editar",
  create: "Crear",
  delete: "Eliminar",
};

const DEFAULT_PERMS = (): Pick<CrmStaff,
  "perm_mi_negocio_datos" | "perm_mi_negocio_personal" | "perm_servicios" |
  "perm_dashboard" | "perm_ventas" | "perm_calendarios" | "perm_formularios" |
  "perm_contactos" | "perm_pipeline"
> => ({
  perm_mi_negocio_datos:    { read: true,  edit: false },
  perm_mi_negocio_personal: { read: true,  edit: false },
  perm_servicios:           { read: true,  edit: false, create: false, delete: false },
  perm_dashboard:           { read: false },
  perm_ventas:              { read: false, edit: false, create: false, delete: false },
  perm_calendarios:         { read: false, edit: false, create: false, delete: false },
  perm_formularios:         { read: false, edit: false, create: false, delete: false },
  perm_contactos:           { read: false, edit: false, create: false, delete: false },
  perm_pipeline:            { read: false, edit: false, create: false, delete: false },
});

// ─── Permission Matrix ────────────────────────────────────────────────────────

const PermMatrix = ({
  perms,
  onChange,
}: {
  perms: ReturnType<typeof DEFAULT_PERMS>;
  onChange: (perms: ReturnType<typeof DEFAULT_PERMS>) => void;
}) => {
  const toggle = (key: PermKey, action: keyof StaffPermission) => {
    const current = perms[key] as StaffPermission;
    const newVal = !current[action];

    // "read" controls access — if disabling read, disable all others too
    // If enabling a non-read action, also enable read
    let updated: StaffPermission;
    if (action === "read" && !newVal) {
      updated = Object.fromEntries(
        Object.keys(current).map((k) => [k, false])
      ) as StaffPermission;
    } else if (action !== "read" && newVal) {
      updated = { ...current, read: true, [action]: true };
    } else {
      updated = { ...current, [action]: newVal };
    }

    onChange({ ...perms, [key]: updated });
  };

  return (
    <div className="space-y-1">
      {PERM_SECTIONS.map((section) => {
        const perm = perms[section.key] as StaffPermission;
        return (
          <div key={section.key} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-secondary/30 transition-colors">
            <span className="text-xs text-foreground flex-1 min-w-0">{section.label}</span>
            <div className="flex items-center gap-1 shrink-0">
              {section.actions.map((action) => {
                const checked = !!perm[action];
                return (
                  <button
                    key={action}
                    type="button"
                    onClick={() => toggle(section.key, action)}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all ${
                      checked
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {PERM_ACTION_LABEL[action]}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Staff Form Dialog ────────────────────────────────────────────────────────

const StaffDialog = ({
  open,
  onOpenChange,
  initial,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: CrmStaff;
  onSave: (data: Omit<CrmStaff, "id" | "created_at" | "owner_user_id" | "staff_user_id" | "status">) => void;
  isSaving: boolean;
}) => {
  const [name, setName]           = useState(initial?.name ?? "");
  const [email, setEmail]         = useState(initial?.email ?? "");
  const [description, setDesc]    = useState(initial?.description ?? "");
  const [perms, setPerms]         = useState<ReturnType<typeof DEFAULT_PERMS>>(
    initial
      ? {
          perm_mi_negocio_datos:    initial.perm_mi_negocio_datos,
          perm_mi_negocio_personal: initial.perm_mi_negocio_personal,
          perm_servicios:           initial.perm_servicios,
          perm_dashboard:           initial.perm_dashboard,
          perm_ventas:              initial.perm_ventas,
          perm_calendarios:         initial.perm_calendarios,
          perm_formularios:         initial.perm_formularios,
          perm_contactos:           initial.perm_contactos,
          perm_pipeline:            initial.perm_pipeline,
        }
      : DEFAULT_PERMS()
  );

  const handleSubmit = () => {
    if (!name.trim() || !email.trim()) return;
    onSave({ name: name.trim(), email: email.trim(), description: description.trim() || null, ...perms });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {initial ? "Editar Staff" : "Agregar Staff"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5 py-2 pr-1">
          {/* Basic info */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre completo" className="h-9" autoFocus={!initial} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Email *</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@ejemplo.com" type="email" className="h-9" disabled={!!initial} />
              {!initial && <p className="text-[10px] text-muted-foreground/60 mt-1">Se enviará un email de invitación para establecer contraseña.</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Rol / Cargo</label>
              <Input value={description} onChange={(e) => setDesc(e.target.value)} placeholder="Ej: Asistente, Coordinador..." className="h-9" />
            </div>
          </div>

          {/* Permissions */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">Permisos</p>
            <div className="border rounded-xl overflow-hidden">
              <PermMatrix perms={perms} onChange={setPerms} />
            </div>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || !email.trim() || isSaving}
            className="rounded-xl"
          >
            {isSaving && <Loader2 size={14} className="animate-spin mr-2" />}
            {initial ? "Guardar cambios" : "Agregar staff"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Staff Tab ────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<CrmStaff["status"], string> = {
  invited:  "bg-yellow-50 text-yellow-700 border-yellow-200",
  active:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactive: "bg-secondary text-muted-foreground border-border",
};
const STATUS_LABEL: Record<CrmStaff["status"], string> = {
  invited:  "Invitado",
  active:   "Activo",
  inactive: "Inactivo",
};

const StaffTab = () => {
  const { data: staff = [], isLoading } = useStaff();
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const deleteStaff = useDeleteStaff();
  const inviteStaff = useInviteStaff();

  const [showCreate, setShowCreate]     = useState(false);
  const [editing, setEditing]           = useState<CrmStaff | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [invitingId, setInvitingId]     = useState<string | null>(null);

  const handleCreate = async (data: Parameters<typeof createStaff.mutateAsync>[0]) => {
    try {
      const newStaff = await createStaff.mutateAsync(data);
      setShowCreate(false);
      // Send invitation email
      try {
        const result = await inviteStaff.mutateAsync(newStaff.id);
        if (result.linked) {
          toast.success("Staff agregado y vinculado a cuenta existente.");
        } else {
          toast.success("Staff agregado. Se envió el email de invitación.");
        }
      } catch {
        toast.success("Staff agregado, pero no se pudo enviar la invitación. Usa 'Re-enviar' para intentarlo de nuevo.");
      }
    } catch {
      toast.error("Error al crear el staff");
    }
  };

  const handleResendInvite = async (member: CrmStaff) => {
    setInvitingId(member.id);
    try {
      const result = await inviteStaff.mutateAsync(member.id);
      if (result.linked) {
        toast.success("Cuenta existente vinculada correctamente.");
      } else {
        toast.success("Invitación re-enviada.");
      }
    } catch (e) {
      toast.error((e as Error).message ?? "Error al re-enviar invitación");
    } finally {
      setInvitingId(null);
    }
  };

  const handleUpdate = async (data: Parameters<typeof createStaff.mutateAsync>[0]) => {
    if (!editing) return;
    try {
      await updateStaff.mutateAsync({ id: editing.id, ...data });
      toast.success("Staff actualizado");
      setEditing(null);
    } catch {
      toast.error("Error al actualizar el staff");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteStaff.mutateAsync(deleteTarget);
      toast.success("Staff eliminado");
    } catch {
      toast.error("Error al eliminar el staff");
    } finally {
      setDeleteTarget(null);
    }
  };

  const toggleActive = async (member: CrmStaff) => {
    const next = member.status === "inactive" ? "active" : "inactive";
    try {
      await updateStaff.mutateAsync({ id: member.id, status: next });
      toast.success(next === "active" ? "Staff reactivado" : "Staff desactivado");
    } catch {
      toast.error("Error al cambiar el estado");
    }
  };

  return (
    <>
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={handleDelete}
        isPending={deleteStaff.isPending}
        description="Se eliminará el staff permanentemente. Esta acción no se puede deshacer."
      />

      {showCreate && (
        <StaffDialog
          open
          onOpenChange={setShowCreate}
          onSave={handleCreate}
          isSaving={createStaff.isPending}
        />
      )}

      {editing && (
        <StaffDialog
          open
          onOpenChange={(v) => { if (!v) setEditing(null); }}
          initial={editing}
          onSave={handleUpdate}
          isSaving={updateStaff.isPending}
        />
      )}

      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{staff.length} miembro{staff.length !== 1 ? "s" : ""}</p>
          <Button onClick={() => setShowCreate(true)} className="rounded-xl gap-2 h-9 text-xs font-medium">
            <Plus size={14} /> Agregar staff
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={22} className="animate-spin text-muted-foreground" />
          </div>
        ) : staff.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-card border rounded-2xl">
            <Users size={30} className="mx-auto text-muted-foreground/20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Sin miembros de staff</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Agrega tu equipo y configura sus permisos.</p>
          </div>
        ) : (
          <div className="bg-card border rounded-2xl overflow-hidden">
            {staff.map((member, i) => (
              <div key={member.id} className={i < staff.length - 1 ? "border-b" : ""}>
                <div className="px-5 py-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-xs font-semibold shrink-0">
                    {member.name.substring(0, 2).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{member.name}</p>
                      <Badge className={`text-[10px] px-2 py-0 border shrink-0 ${STATUS_STYLE[member.status]}`}>
                        {STATUS_LABEL[member.status]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Mail size={11} className="text-muted-foreground/50 shrink-0" />
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      {member.description && (
                        <span className="text-[10px] text-muted-foreground/50 truncate">· {member.description}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {member.status === "invited" && (
                      <button
                        onClick={() => handleResendInvite(member)}
                        disabled={invitingId === member.id}
                        className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
                        title="Re-enviar invitación"
                      >
                        {invitingId === member.id
                          ? <Loader2 size={14} className="animate-spin" />
                          : <Send size={14} />
                        }
                      </button>
                    )}
                    {member.status !== "invited" && (
                      <button
                        onClick={() => toggleActive(member)}
                        className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
                        title={member.status === "active" ? "Desactivar" : "Reactivar"}
                      >
                        {member.status === "active"
                          ? <ToggleRight size={16} className="text-emerald-600" />
                          : <ToggleLeft size={16} />
                        }
                      </button>
                    )}
                    <button
                      onClick={() => setEditing(member)}
                      className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget({ id: member.id, name: member.name })}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

// ─── Reminders Tab ───────────────────────────────────────────────────────────

const STATUS_ICON: Record<CrmReminder["status"], React.ReactNode> = {
  pending:  <Clock size={12} className="text-yellow-500" />,
  sent:     <CheckCircle2 size={12} className="text-emerald-500" />,
  failed:   <AlertCircle size={12} className="text-destructive" />,
  skipped:  <BellOff size={12} className="text-muted-foreground" />,
};
const STATUS_LABEL_R: Record<CrmReminder["status"], string> = {
  pending: "Pendiente", sent: "Enviado", failed: "Error", skipped: "Omitido",
};

const RemindersTab = () => {
  const { data: config, isLoading: loadingConfig } = useReminderConfig();
  const { data: reminders = [], isLoading: loadingReminders } = useReminders();
  const upsert = useUpsertReminderConfig();

  const [limit_, setLimit_] = useState<number | "">(config?.email_limit_per_month ?? 100);
  const [dirty, setDirty] = useState(false);

  useMemo(() => {
    if (config) setLimit_(config.email_limit_per_month);
  }, [config?.id]);

  const thisMonth = new Date();
  thisMonth.setDate(1); thisMonth.setHours(0, 0, 0, 0);
  const sentThisMonth = reminders.filter(
    r => r.status === "sent" && new Date(r.sent_at ?? r.created_at) >= thisMonth
  ).length;
  const limit = config?.email_limit_per_month ?? 100;
  const usedPct = Math.min(100, Math.round((sentThisMonth / limit) * 100));

  const handleSaveLimit = async () => {
    if (limit_ === "" || Number(limit_) < 1) return;
    try {
      await upsert.mutateAsync({ email_limit_per_month: Number(limit_) });
      toast.success("Límite guardado");
      setDirty(false);
    } catch { toast.error("Error al guardar"); }
  };

  if (loadingConfig) return (
    <div className="flex justify-center py-16">
      <Loader2 size={22} className="animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-6">

      {/* ─── Monthly usage + limit ─── */}
      <div className="bg-card border rounded-2xl p-5 space-y-4">
        <p className="text-sm font-semibold">Límite mensual</p>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            min={1}
            value={limit_}
            onChange={(e) => { setLimit_(e.target.value === "" ? "" : Number(e.target.value)); setDirty(true); }}
            className="h-9 text-sm w-28"
          />
          <span className="text-xs text-muted-foreground">recordatorios / mes</span>
          {dirty && (
            <Button size="sm" onClick={handleSaveLimit} disabled={upsert.isPending} className="h-8 text-xs ml-auto">
              {upsert.isPending && <Loader2 size={12} className="animate-spin mr-1.5" />}
              Guardar
            </Button>
          )}
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">Uso este mes</span>
            <span className="text-xs text-muted-foreground tabular-nums">{sentThisMonth} / {limit}</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                usedPct >= 90 ? "bg-destructive" : usedPct >= 70 ? "bg-yellow-500" : "bg-primary"
              }`}
              style={{ width: `${usedPct}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            {limit - sentThisMonth} disponibles este mes
          </p>
        </div>
      </div>

      {/* ─── History ─── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
          Historial ({reminders.length})
        </p>

        {loadingReminders ? (
          <div className="flex justify-center py-10">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : reminders.length === 0 ? (
          <div className="text-center py-16 bg-card border rounded-2xl">
            <Send size={28} className="mx-auto text-muted-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground">Sin recordatorios enviados aún.</p>
          </div>
        ) : (
          <div className="bg-card border rounded-2xl overflow-hidden">
            {reminders.slice(0, 50).map((r, i) => (
              <div key={r.id} className={`px-5 py-3.5 flex items-center gap-3 ${i < reminders.length - 1 ? "border-b" : ""}`}>
                <div className="shrink-0">{STATUS_ICON[r.status]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{r.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {r.type === "email" ? "Email" : "WhatsApp"}
                    {r.recipient_email && ` · ${r.recipient_email}`}
                    {r.recipient_phone && ` · ${r.recipient_phone}`}
                    {r.is_auto && " · Auto"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    r.status === "sent"    ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                    r.status === "failed"  ? "bg-red-50 text-red-700 border-red-200" :
                    r.status === "skipped" ? "bg-secondary text-muted-foreground border-border" :
                                            "bg-yellow-50 text-yellow-700 border-yellow-200"
                  }`}>
                    {STATUS_LABEL_R[r.status]}
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">
                    {new Date(r.scheduled_at).toLocaleString("es-ES", {
                      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── General Tab (admin only) ─────────────────────────────────────────────────

const GeneralTab = () => {
  const { data: calendars = [], isLoading: loadingCals } = useCalendars();
  const { data: profile, isLoading: loadingProfile }     = useBusinessProfile();
  const upsert = useUpsertBusinessProfile();

  const [selected, setSelected] = useState<string>("");
  const [dirty, setDirty]       = useState(false);

  useEffect(() => {
    if (profile !== undefined) {
      setSelected(profile?.landing_calendar_id ?? "");
      setDirty(false);
    }
  }, [profile?.landing_calendar_id]);

  const handleSave = async () => {
    try {
      await upsert.mutateAsync({ landing_calendar_id: selected || null });
      toast.success("Calendario de landing actualizado");
      setDirty(false);
    } catch {
      toast.error("Error al guardar");
    }
  };

  if (loadingCals || loadingProfile) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 size={22} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-card border rounded-2xl p-5 space-y-4">
        <div className="flex items-start gap-3">
          <Globe size={16} className="text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Calendario de la Landing Page</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Elige qué calendario se mostrará en la página pública de reservas.
            </p>
          </div>
        </div>

        {calendars.length === 0 ? (
          <div className="text-center py-8 bg-secondary/30 rounded-xl">
            <CalendarDays size={24} className="mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No hay calendarios creados aún.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              {calendars.map((cal) => {
                const isActive = selected === cal.id;
                return (
                  <button
                    key={cal.id}
                    type="button"
                    onClick={() => { setSelected(cal.id); setDirty(true); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                      isActive
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40 hover:bg-secondary/30"
                    }`}
                  >
                    <CalendarDays
                      size={15}
                      className={isActive ? "text-primary shrink-0" : "text-muted-foreground/50 shrink-0"}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isActive ? "text-primary" : ""}`}>
                        {cal.name ?? "Sin nombre"}
                      </p>
                      {cal.slug && (
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate font-mono">
                          /{cal.slug}
                        </p>
                      )}
                    </div>
                    {isActive && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary text-primary-foreground shrink-0">
                        Activo
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Option to clear selection (use fallback) */}
              <button
                type="button"
                onClick={() => { setSelected(""); setDirty(true); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                  selected === ""
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40 hover:bg-secondary/30"
                }`}
              >
                <Globe
                  size={15}
                  className={selected === "" ? "text-primary shrink-0" : "text-muted-foreground/50 shrink-0"}
                />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${selected === "" ? "text-primary" : "text-muted-foreground"}`}>
                    Automático (más antiguo)
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    Usa el primer calendario creado como fallback.
                  </p>
                </div>
                {selected === "" && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary text-primary-foreground shrink-0">
                    Activo
                  </span>
                )}
              </button>
            </div>

            {dirty && (
              <div className="flex justify-end pt-1">
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={upsert.isPending}
                  className="h-8 text-xs rounded-xl"
                >
                  {upsert.isPending && <Loader2 size={12} className="animate-spin mr-1.5" />}
                  Guardar cambios
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Settings shell ───────────────────────────────────────────────────────────

type TabId = "general" | "logs" | "staff" | "reminders" | "saas";

const ALL_TABS: { id: TabId; label: string; Component: React.ComponentType; adminOnly?: boolean }[] = [
  { id: "general",   label: "General",        Component: GeneralTab,   adminOnly: true },
  { id: "logs",      label: "Logs",           Component: LogsTab       },
  { id: "staff",     label: "Staff",          Component: StaffTab      },
  { id: "reminders", label: "Recordatorios",  Component: RemindersTab  },
];

const CrmSettings = ({ isSuperAdmin }: { isSuperAdmin?: boolean }) => {
  const visibleTabs = ALL_TABS.filter((t) => !t.adminOnly || isSuperAdmin);
  const defaultTab  = isSuperAdmin ? "general" : "logs";
  const [tab, setTab] = useState<TabId>(defaultTab);

  const activeTab = visibleTabs.find((t) => t.id === tab) ?? visibleTabs[0];
  const { Component } = activeTab;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Configuración</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gestión avanzada del sistema</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b overflow-x-auto">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              activeTab.id === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Component />
    </div>
  );
};

export default CrmSettings;
