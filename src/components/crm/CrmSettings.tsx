import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Activity, Loader2, Filter, Users, ChevronDown, ChevronRight, ChevronLeft, Search, X, Plus, Trash2, Mail, Pencil, ToggleLeft, ToggleRight, BellOff, CheckCircle2, AlertCircle, Clock, Send, Globe, CalendarDays, UserCog, Bell, Store, Link, MessageCircle, Bot, User } from "lucide-react";
import { useLogs, useStaff, useCreateStaff, useUpdateStaff, useDeleteStaff, useInviteStaff, useReminderConfig, useUpsertReminderConfig, useReminders, useCalendars, useForms, usePipelines, useBusinessProfile, useUpsertBusinessProfile, useNotificationRecipients, useAddNotificationRecipient, useToggleNotificationRecipient, useVendorProfile, useUpdateVendor, useVendorLinks, useUpsertVendorLinks } from "@/hooks/useCrmData";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/useAuth";
import type { CrmLog, CrmStaff, StaffPermission, StaffItemPermission, CrmReminder } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import PhoneInputField from "@/components/shared/PhoneInput";
import { Badge } from "@/components/ui/badge";
import CrmVendors from "@/components/crm/CrmVendors";
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

const LogRow = ({
  log,
  isLast,
  ownerUserId,
  staffMap,
}: {
  log: CrmLog;
  isLast: boolean;
  ownerUserId: string | null;
  staffMap: Record<string, string>;
}) => {
  const [expanded, setExpanded] = useState(false);

  const isOwnerAction =
    !log.performed_by_user_id || log.performed_by_user_id === ownerUserId;
  const actorLabel = isOwnerAction
    ? "Dueño"
    : (staffMap[log.performed_by_user_id!] ?? "Staff");

  return (
    <div className={isLast ? "" : "border-b"}>
      <div className="px-5 py-3.5 flex items-center gap-3">
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0 ${
            ACTION_STYLE[log.action] ?? "text-muted-foreground bg-secondary"
          }`}
        >
          {ACTION_LABEL[log.action] ?? log.action}
        </span>

        {/* Actor badge */}
        <span
          className={`inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
            isOwnerAction
              ? "bg-primary/8 text-primary border-primary/20"
              : "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800/40"
          }`}
          title={isOwnerAction ? "Acción del dueño" : `Staff: ${actorLabel}`}
        >
          {isOwnerAction ? null : <UserCog size={9} />}
          {actorLabel}
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
              <dt className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">Realizado por</dt>
              <dd className="text-xs text-foreground mt-0.5">{actorLabel}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">Entidad</dt>
              <dd className="text-xs text-foreground mt-0.5">{log.entity}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">ID del registro</dt>
              <dd className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate">{log.entity_id ?? "—"}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">Descripción</dt>
              <dd className="text-xs text-foreground mt-0.5">{log.description ?? "—"}</dd>
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
  const { user } = useCurrentUser();
  const { data: logs = [], isLoading } = useLogs();
  const { data: staffList = [] } = useStaff();

  // Map staff_user_id → display name (name or email)
  const staffMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of staffList) {
      map[s.staff_user_id] = (s as any).name || s.email || "Staff";
    }
    return map;
  }, [staffList]);

  const ownerUserId = user?.id ?? null;

  const [actionFilter, setActionFilter] = useState<"all" | "create" | "update" | "delete">("all");
  const [actorFilter, setActorFilter]   = useState<"all" | "owner" | "staff">("all");
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
      if (actorFilter === "owner") {
        if (l.performed_by_user_id && l.performed_by_user_id !== ownerUserId) return false;
      }
      if (actorFilter === "staff") {
        if (!l.performed_by_user_id || l.performed_by_user_id === ownerUserId) return false;
      }
      if (q) {
        const haystack = [l.description, l.entity, l.entity_id].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [logs, actionFilter, actorFilter, ownerUserId, search, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / LOGS_PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const visible    = filtered.slice((safePage - 1) * LOGS_PER_PAGE, safePage * LOGS_PER_PAGE);

  const resetFilters = () => { setSearch(""); setDateFrom(""); setDateTo(""); setActionFilter("all"); setActorFilter("all"); setPage(1); };
  const hasFilters = search || dateFrom || dateTo || actionFilter !== "all" || actorFilter !== "all";

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
        </div>

        {/* Actor filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
            <UserCog size={12} /> Actor:
          </div>
          {(["all", "owner", "staff"] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setActorFilter(f); setPage(1); }}
              className={`text-xs font-semibold px-3 py-1 rounded-full border transition-all ${
                actorFilter === f
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
              }`}
            >
              {f === "all" ? "Todos" : f === "owner" ? "Dueño" : "Staff"}
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
              <LogRow
                key={log.id}
                log={log}
                isLast={i === visible.length - 1}
                ownerUserId={ownerUserId}
                staffMap={staffMap}
              />
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
  | "perm_recordatorios"
  | "perm_agente_ia"
>;

const PERM_SECTIONS: { key: PermKey; label: string; actions: (keyof StaffPermission)[] }[] = [
  { key: "perm_mi_negocio_datos",    label: "Mi Negocio — Datos del negocio",  actions: ["read", "edit"] },
  { key: "perm_servicios",           label: "Servicios",                        actions: ["read", "edit", "create", "delete"] },
  { key: "perm_dashboard",           label: "Dashboard",                        actions: ["read"] },
  { key: "perm_ventas",              label: "Registro de Ventas",               actions: ["read", "edit", "create", "delete"] },
  { key: "perm_calendarios",         label: "Calendarios",                      actions: ["read", "edit", "create", "delete"] },
  { key: "perm_formularios",         label: "Formularios",                      actions: ["read", "edit", "create", "delete"] },
  { key: "perm_contactos",           label: "Contactos",                        actions: ["read", "edit", "create", "delete"] },
  { key: "perm_pipeline",            label: "Pipeline",                         actions: ["read", "edit", "create", "delete"] },
  { key: "perm_recordatorios",       label: "Recordatorios",                    actions: ["read", "create"] },
  { key: "perm_agente_ia",           label: "Agente IA (solo conversaciones)",  actions: ["read"] },
];

const DEFAULT_PERMS = (): Pick<CrmStaff,
  "perm_mi_negocio_datos" | "perm_mi_negocio_personal" | "perm_servicios" |
  "perm_dashboard" | "perm_ventas" | "perm_calendarios" | "perm_formularios" |
  "perm_contactos" | "perm_pipeline" | "perm_recordatorios" | "perm_agente_ia"
> => ({
  perm_mi_negocio_datos:    { read: true,  edit: false },
  perm_mi_negocio_personal: { read: true,  edit: true  }, // always on — staff can always see/edit their own info
  perm_servicios:           { read: true,  edit: false, create: false, delete: false },
  perm_dashboard:           { read: false },
  perm_ventas:              { read: false, edit: false, create: false, delete: false },
  perm_calendarios:         { read: false, edit: false, create: false, delete: false },
  perm_formularios:         { read: false, edit: false, create: false, delete: false },
  perm_contactos:           { read: false, edit: false, create: false, delete: false },
  perm_pipeline:            { read: false, edit: false, create: false, delete: false },
  perm_recordatorios:       { read: false, create: false },
  perm_agente_ia:           { read: false },
});

// ─── Permission Matrix ────────────────────────────────────────────────────────

type ItemPerms = Record<string, StaffItemPermission>

const ITEM_SECTION_KEYS = new Set<PermKey>(["perm_calendarios", "perm_formularios", "perm_pipeline"]);

type ItemSectionMode = "none" | "ver_todos" | "admin_todos" | "seleccionar";

function getItemMode(perm: StaffPermission, items: ItemPerms | null): ItemSectionMode {
  if (items !== null) return "seleccionar";
  if (!perm.read) return "none";
  if (perm.edit) return "admin_todos";
  return "ver_todos";
}

const ITEM_MODE_LABELS: { id: ItemSectionMode; label: string }[] = [
  { id: "ver_todos",   label: "Ver Todos" },
  { id: "admin_todos", label: "Administrar Todos" },
  { id: "seleccionar", label: "Seleccionar" },
];

const PermMatrix = ({
  perms,
  onChange,
  itemData,
  onItemData,
}: {
  perms: ReturnType<typeof DEFAULT_PERMS>;
  onChange: (perms: ReturnType<typeof DEFAULT_PERMS>) => void;
  itemData: {
    calendarios: { items: ItemPerms | null; available: { id: string; name: string }[] };
    formularios:  { items: ItemPerms | null; available: { id: string; name: string }[] };
    pipeline:     { items: ItemPerms | null; available: { id: string; name: string }[] };
  };
  onItemData: (section: "calendarios" | "formularios" | "pipeline", items: ItemPerms | null) => void;
}) => {
  const toggleRead = (key: PermKey) => {
    const current = perms[key] as StaffPermission;
    const updated = current.read
      ? (Object.fromEntries(Object.keys(current).map((k) => [k, false])) as StaffPermission)
      : { ...current, read: true };
    onChange({ ...perms, [key]: updated });
  };

  const toggleAdmin = (key: PermKey, adminActions: (keyof StaffPermission)[]) => {
    const current = perms[key] as StaffPermission;
    const allOn = adminActions.every((a) => !!current[a]);
    const patch = Object.fromEntries(adminActions.map((a) => [a, !allOn]));
    const updated: StaffPermission = allOn
      ? { ...current, ...patch }
      : { ...current, read: true, ...patch };
    onChange({ ...perms, [key]: updated });
  };

  const setItemMode = (section: "calendarios" | "formularios" | "pipeline", mode: ItemSectionMode) => {
    const key = `perm_${section}` as PermKey;
    const current = getItemMode(perms[key] as StaffPermission, itemData[section].items);
    // Clicking the active mode toggles it off → "none"
    const next = current === mode ? "none" : mode;
    switch (next) {
      case "none":
        onChange({ ...perms, [key]: { read: false, edit: false, create: false, delete: false } });
        onItemData(section, null);
        break;
      case "ver_todos":
        onChange({ ...perms, [key]: { read: true, edit: false, create: false, delete: false } });
        onItemData(section, null);
        break;
      case "admin_todos":
        onChange({ ...perms, [key]: { read: true, edit: true, create: true, delete: true } });
        onItemData(section, null);
        break;
      case "seleccionar":
        onChange({ ...perms, [key]: { read: true, edit: false, create: false, delete: false } });
        onItemData(section, itemData[section].items ?? {});
        break;
    }
  };

  const toggleItemRead = (section: "calendarios" | "formularios" | "pipeline", id: string) => {
    const current = itemData[section].items ?? {};
    const perm = current[id];
    if (perm?.read) {
      const next = { ...current };
      delete next[id];
      onItemData(section, next);
    } else {
      onItemData(section, { ...current, [id]: { read: true, edit: false } });
    }
  };

  const toggleItemEdit = (section: "calendarios" | "formularios" | "pipeline", id: string) => {
    const current = itemData[section].items ?? {};
    const perm = current[id] ?? { read: false, edit: false };
    onItemData(section, { ...current, [id]: { read: true, edit: !perm.edit } });
  };

  return (
    <div className="space-y-1">
      {PERM_SECTIONS.map((section) => {
        const perm = perms[section.key] as StaffPermission;
        const adminActions = section.actions.filter((a) => a !== "read") as (keyof StaffPermission)[];
        const isRead  = !!perm.read;
        const isAdmin = adminActions.length > 0 && adminActions.every((a) => !!perm[a]);

        // Item-expandable sections
        if (ITEM_SECTION_KEYS.has(section.key)) {
          const sectionName = section.key.replace("perm_", "") as "calendarios" | "formularios" | "pipeline";
          const { items, available } = itemData[sectionName];
          const mode = getItemMode(perm, items);
          return (
            <div key={section.key} className="px-3 py-2 rounded-xl hover:bg-secondary/30 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-xs text-foreground flex-1 min-w-0">{section.label}</span>
                <div className="flex items-center gap-1 shrink-0">
                  {ITEM_MODE_LABELS.map(({ id, label }) => {
                    // "Ver Todos" also lights up when "Administrar Todos" is active
                    const active = mode === id || (id === "ver_todos" && mode === "admin_todos");
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setItemMode(sectionName, id)}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all ${
                          active
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {mode === "seleccionar" && (
                <div className="mt-2 ml-2 space-y-0.5 border-l pl-3">
                  {available.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground/50 py-1">No hay ítems creados aún.</p>
                  ) : (
                  <>
                  {Object.keys(items ?? {}).filter(id => (items ?? {})[id]?.read).length === 0 && (
                    <p className="text-[10px] text-amber-500/80 py-0.5">Sin selección = sin acceso a ningún ítem.</p>
                  )}
                  {available.map((item) => {
                    const ip = (items ?? {})[item.id];
                    const itemRead = !!ip?.read || !!ip?.edit;
                    const itemEdit = !!ip?.edit;
                    return (
                      <div key={item.id} className="flex items-center gap-2 py-0.5">
                        <span className="text-xs text-foreground/80 flex-1 min-w-0 truncate">{item.name}</span>
                        <button type="button" onClick={() => toggleItemRead(sectionName, item.id)}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all ${itemRead ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                          Ver
                        </button>
                        <button type="button" onClick={() => toggleItemEdit(sectionName, item.id)}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all ${itemEdit ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                          Admin
                        </button>
                      </div>
                    );
                  })}
                  </>
                  )}
                </div>
              )}
            </div>
          );
        }

        // Simple sections
        return (
          <div key={section.key} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-secondary/30 transition-colors">
            <span className="text-xs text-foreground flex-1 min-w-0">{section.label}</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button type="button" onClick={() => toggleRead(section.key)}
                className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border transition-all ${isRead ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                Ver
              </button>
              {adminActions.length > 0 && (
                <button type="button" onClick={() => toggleAdmin(section.key, adminActions)}
                  className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border transition-all ${isAdmin ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                  Administrar
                </button>
              )}
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
  const { data: calendars = [] }  = useCalendars();
  const { data: rawForms = [] }   = useForms();
  const { data: pipelines = [] }  = usePipelines();

  const [name, setName]        = useState(initial?.name ?? "");
  const [email, setEmail]      = useState(initial?.email ?? "");
  const [description, setDesc] = useState(initial?.description ?? "");
  const [phone, setPhone]      = useState(initial?.phone ?? "");
  const [perms, setPerms]      = useState<ReturnType<typeof DEFAULT_PERMS>>(
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
          perm_recordatorios:       initial.perm_recordatorios,
          perm_agente_ia:           initial.perm_agente_ia ?? { read: false },
        }
      : DEFAULT_PERMS()
  );

  const [calItems,  setCalItems]  = useState<ItemPerms | null>(initial?.perm_calendarios_items ?? null);
  const [formItems, setFormItems] = useState<ItemPerms | null>(initial?.perm_formularios_items ?? null);
  const [pipeItems, setPipeItems] = useState<ItemPerms | null>(initial?.perm_pipeline_items    ?? null);

  const itemData = {
    calendarios: { items: calItems,  available: calendars.map(c => ({ id: c.id, name: c.name ?? c.slug ?? c.id })) },
    formularios:  { items: formItems, available: rawForms.map(f => ({ id: f.id, name: f.name })) },
    pipeline:     { items: pipeItems, available: pipelines.map(p => ({ id: p.id, name: p.name })) },
  };

  const handleItemData = (section: "calendarios" | "formularios" | "pipeline", items: ItemPerms | null) => {
    if (section === "calendarios") setCalItems(items);
    else if (section === "formularios") setFormItems(items);
    else setPipeItems(items);
  };

  const phoneDigits = phone.replace(/\D/g, "");
  const phoneValid  = phoneDigits.length >= 10;

  const handleSubmit = () => {
    if (!name.trim() || !email.trim()) return;
    if (!initial && !phoneValid) return;
    onSave({
      name:        name.trim(),
      email:       email.trim(),
      description: description.trim() || null,
      phone:       phone.trim() || null,
      ...perms,
      perm_calendarios_items: calItems,
      perm_formularios_items: formItems,
      perm_pipeline_items:    pipeItems,
    });
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
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                WhatsApp / Teléfono {!initial && <span className="text-destructive">*</span>}
              </label>
              <PhoneInputField value={phone} onChange={setPhone} placeholder="71234567" />
              {!initial && !phoneValid && phone && (
                <p className="text-[10px] text-destructive mt-1">Ingresa un número válido con código de país.</p>
              )}
            </div>
          </div>

          {/* Permissions */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">Permisos</p>
            <div className="border rounded-xl overflow-hidden">
              <PermMatrix
                perms={perms}
                onChange={setPerms}
                itemData={itemData}
                onItemData={handleItemData}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || !email.trim() || (!initial && !phoneValid) || isSaving}
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
  const { data: reminders = [], isLoading: loadingReminders } = useReminders();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const thisMonth = new Date();
  thisMonth.setDate(1); thisMonth.setHours(0, 0, 0, 0);
  const sentThisMonth = reminders.filter(
    r => r.status === "sent" && new Date(r.sent_at ?? r.created_at) >= thisMonth
  ).length;

  return (
    <div className="space-y-6">

      {/* ─── History ─── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
            Historial ({reminders.length})
          </p>
          {sentThisMonth > 0 && (
            <span className="text-[11px] text-muted-foreground bg-secondary border rounded-lg px-2.5 py-1 font-medium">
              {sentThisMonth} enviados este mes
            </span>
          )}
        </div>

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
            {reminders.slice(0, 50).map((r, i) => {
              const isExpanded = expandedId === r.id;
              return (
                <div key={r.id} className={i < reminders.length - 1 ? "border-b" : ""}>
                  {/* Row */}
                  <button
                    className="w-full px-5 py-3.5 flex items-center gap-3 text-left hover:bg-secondary/30 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : r.id)}
                  >
                    <div className="shrink-0">{STATUS_ICON[r.status]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{r.subject ?? r.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {r.type === "email" ? "Email" : "WhatsApp"}
                        {r.recipient_email && ` · ${r.recipient_email}`}
                        {r.recipient_phone && ` · ${r.recipient_phone}`}
                        {r.is_auto && " · Auto"}
                      </p>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        r.status === "sent"    ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        r.status === "failed"  ? "bg-red-50 text-red-700 border-red-200" :
                        r.status === "skipped" ? "bg-secondary text-muted-foreground border-border" :
                                                "bg-yellow-50 text-yellow-700 border-yellow-200"
                      }`}>
                        {STATUS_LABEL_R[r.status]}
                      </span>
                      <p className="text-[10px] text-muted-foreground tabular-nums">
                        {new Date(r.scheduled_at).toLocaleString("es-ES", {
                          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <ChevronDown
                      size={13}
                      className={`text-muted-foreground shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-5 pb-4 pt-1 bg-secondary/10 border-t space-y-2">
                      {r.subject && (
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Asunto</p>
                          <p className="text-xs text-foreground">{r.subject}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Mensaje</p>
                        <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{r.message}</p>
                      </div>
                      {r.error && (
                        <div>
                          <p className="text-[10px] font-semibold text-destructive uppercase tracking-wider mb-1">Error</p>
                          <p className="text-xs text-destructive/80">{r.error}</p>
                        </div>
                      )}
                      {r.sent_at && (
                        <p className="text-[10px] text-muted-foreground">
                          Enviado: {new Date(r.sent_at).toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
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

// ─── Support Notifications Tab (admin only) ───────────────────────────────────

const SupportTab = () => {
  const { data: staff = [], isLoading: loadingStaff }             = useStaff();
  const { data: recipients = [], isLoading: loadingRecipients }   = useNotificationRecipients();
  const addRecipient    = useAddNotificationRecipient();
  const toggleRecipient = useToggleNotificationRecipient();

  const isLoading = loadingStaff || loadingRecipients;

  // Map email → recipient row for quick lookup
  const recipientByEmail = useMemo(
    () => Object.fromEntries(recipients.map((r) => [r.email, r])),
    [recipients],
  );

  const handleToggle = async (email: string) => {
    const existing = recipientByEmail[email];
    try {
      if (existing) {
        if (existing.active) {
          // disable: just mark inactive
          await toggleRecipient.mutateAsync({ id: existing.id, active: false });
        } else {
          // re-enable
          await toggleRecipient.mutateAsync({ id: existing.id, active: true });
        }
      } else {
        // first time enabling
        await addRecipient.mutateAsync(email);
      }
    } catch {
      toast.error("Error al actualizar");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 size={22} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-card border rounded-2xl p-5 space-y-4">
        <div className="flex items-start gap-3">
          <Bell size={16} className="text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Notificaciones de soporte por email</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Activa los miembros del equipo que recibirán un email cuando un cliente abra o responda un ticket.
            </p>
          </div>
        </div>

        {staff.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            No hay miembros de staff registrados.
          </p>
        ) : (
          <div className="space-y-2">
            {staff.map((member) => {
              const rec = recipientByEmail[member.email];
              const isActive = !!rec && rec.active;
              return (
                <div key={member.id} className="flex items-center gap-3 px-3 py-2.5 border rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{member.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  </div>
                  <button
                    onClick={() => handleToggle(member.email)}
                    className="shrink-0 transition-colors"
                    title={isActive ? "Desactivar notificaciones" : "Activar notificaciones"}
                  >
                    {isActive
                      ? <ToggleRight size={22} className="text-primary" />
                      : <ToggleLeft size={22} className="text-muted-foreground" />
                    }
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Vendor Profile Tab ───────────────────────────────────────────────────────

const VendorProfileTab = () => {
  const { data: vendorProfile, isLoading } = useVendorProfile();
  const { data: calendars = [] }           = useCalendars();
  const updateVendor = useUpdateVendor();
  const [name, setName]               = useState("");
  const [whatsapp, setWhatsapp]       = useState("");
  const [landingCal, setLandingCal]   = useState("");
  const [saving, setSaving]           = useState(false);
  const initialized                   = useRef(false);

  useEffect(() => {
    if (vendorProfile && !initialized.current) {
      initialized.current = true;
      setName(vendorProfile.name);
      setWhatsapp(vendorProfile.whatsapp ?? "");
      setLandingCal(vendorProfile.landing_calendar_id ?? "");
    }
  }, [vendorProfile]);

  const handleSave = async () => {
    if (!vendorProfile || !name.trim()) return;
    setSaving(true);
    try {
      await updateVendor.mutateAsync({
        id: vendorProfile.id,
        name: name.trim(),
        whatsapp: whatsapp || null,
        landing_calendar_id: landingCal || null,
      });
      toast.success("Perfil actualizado");
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return null;

  return (
    <div className="space-y-5 max-w-md">
      <div>
        <h2 className="text-sm font-semibold">Mi Perfil</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Edita tus datos personales</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Nombre *</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-sm" />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Correo electrónico</label>
        <Input value={vendorProfile?.email ?? ""} disabled className="h-9 text-sm opacity-60" />
        <p className="text-[10px] text-muted-foreground">El correo no se puede modificar.</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">WhatsApp</label>
        <PhoneInputField value={whatsapp} onChange={setWhatsapp} />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Calendario de mi landing</label>
        <select
          value={landingCal}
          onChange={(e) => setLandingCal(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Sin calendario</option>
          {calendars.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <p className="text-[10px] text-muted-foreground">
          El calendario que verán tus clientes al visitar tu landing page.
        </p>
      </div>

      <Button onClick={handleSave} disabled={saving || !name.trim()} className="rounded-xl h-9 text-sm">
        {saving && <Loader2 size={13} className="animate-spin mr-1.5" />}
        Guardar cambios
      </Button>
    </div>
  );
};

// ─── Vendor Links Admin Tab ───────────────────────────────────────────────────

const VendorLinksAdminTab = () => {
  const { data: links }     = useVendorLinks();
  const upsertLinks         = useUpsertVendorLinks();
  const [paymentTitle,    setPaymentTitle]    = useState("");
  const [paymentLink,     setPaymentLink]     = useState("");
  const [onboardingTitle, setOnboardingTitle] = useState("");
  const [onboardingLink,  setOnboardingLink]  = useState("");
  const [saving, setSaving] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (links && !initialized.current) {
      initialized.current = true;
      setPaymentTitle(links.payment_link_title ?? "Link de Pago");
      setPaymentLink(links.payment_link ?? "");
      setOnboardingTitle(links.onboarding_link_title ?? "Link de Onboarding");
      setOnboardingLink(links.onboarding_link ?? "");
    }
  }, [links]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertLinks.mutateAsync({
        payment_link_title:    paymentTitle.trim() || "Link de Pago",
        payment_link:          paymentLink.trim() || null,
        onboarding_link_title: onboardingTitle.trim() || "Link de Onboarding",
        onboarding_link:       onboardingLink.trim() || null,
      });
      toast.success("Links guardados");
    } catch {
      toast.error("Error al guardar links");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="text-sm font-semibold">Links para Vendedores</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Estos links aparecerán en el tab "Links" de cada vendedor con su código de seguimiento ya incluido.
        </p>
      </div>

      <div className="space-y-4 bg-card border rounded-2xl p-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Link de Pago</p>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Título</label>
          <Input value={paymentTitle} onChange={(e) => setPaymentTitle(e.target.value)} placeholder="Link de Pago" className="h-9 text-sm" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">URL</label>
          <Input value={paymentLink} onChange={(e) => setPaymentLink(e.target.value)} placeholder="https://..." className="h-9 text-sm" />
        </div>
      </div>

      <div className="space-y-4 bg-card border rounded-2xl p-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Link de Onboarding</p>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Título</label>
          <Input value={onboardingTitle} onChange={(e) => setOnboardingTitle(e.target.value)} placeholder="Link de Onboarding" className="h-9 text-sm" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">URL del formulario</label>
          <Input value={onboardingLink} onChange={(e) => setOnboardingLink(e.target.value)} placeholder={`${window.location.origin}/f/...`} className="h-9 text-sm" />
          <p className="text-[10px] text-muted-foreground">
            Ingresa el link de tu formulario de onboarding. El código <span className="font-mono">?ref=slug</span> del vendedor se agrega automáticamente.
          </p>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="rounded-xl h-9 text-sm">
        {saving && <Loader2 size={13} className="animate-spin mr-1.5" />}
        Guardar links
      </Button>
    </div>
  );
};

// ─── Settings shell ───────────────────────────────────────────────────────────

// ─── Tab: Costos IA ──────────────────────────────────────────────────────────
type UsageRow = {
  user_id: string; business_name: string | null; contact_email: string | null;
  total_calls: number; total_input: number; total_output: number;
  total_cache_read: number; total_cache_creation: number; total_cost: number;
};

// Costo que hubiera tenido SIN caching (todos los tokens al precio normal de entrada)
const costWithoutCache = (r: UsageRow) => {
  const allInput = Number(r.total_input) + Number(r.total_cache_read) + Number(r.total_cache_creation);
  return (allInput * 0.25 + Number(r.total_output) * 1.25) / 1_000_000;
};

const IACostosTab = () => {
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [rows, setRows] = useState<UsageRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const [y, m] = month.split("-").map(Number);
    const from = new Date(y, m - 1, 1).toISOString();
    const to = new Date(y, m, 0, 23, 59, 59).toISOString();
    setLoading(true);
    supabase.rpc("get_ai_usage_by_account", { p_from: from, p_to: to })
      .then(({ data, error }) => {
        if (!error && data) setRows(data as UsageRow[]);
        setLoading(false);
      });
  }, [month]);

  const totals = rows.reduce(
    (acc, r) => ({
      calls:       acc.calls       + Number(r.total_calls),
      costReal:    acc.costReal    + Number(r.total_cost),
      costWithout: acc.costWithout + costWithoutCache(r),
    }),
    { calls: 0, costReal: 0, costWithout: 0 }
  );
  const totalSaved   = totals.costWithout - totals.costReal;
  const totalSavedPct = totals.costWithout > 0 ? (totalSaved / totals.costWithout) * 100 : 0;

  const fmtUsd  = (n: number) => `$${n.toFixed(4)}`;
  const fmtPct  = (n: number) => `${n.toFixed(1)}%`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Costos de IA por cuenta</h3>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm bg-background"
        />
      </div>

      {/* KPI cards resumen */}
      {!loading && rows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Llamadas totales</p>
            <p className="text-xl font-semibold">{totals.calls.toLocaleString("es-MX")}</p>
          </div>
          <div className="border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Costo real</p>
            <p className="text-xl font-semibold">{fmtUsd(totals.costReal)}</p>
          </div>
          <div className="border rounded-xl p-4 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10">
            <p className="text-xs text-muted-foreground mb-1">Ahorro por caching</p>
            <p className="text-xl font-semibold text-emerald-600">{fmtUsd(totalSaved)}</p>
          </div>
          <div className="border rounded-xl p-4 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10">
            <p className="text-xs text-muted-foreground mb-1">% Ahorro global</p>
            <p className="text-xl font-semibold text-emerald-600">{fmtPct(totalSavedPct)}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-8 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando...
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Sin datos para este mes.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Negocio</th>
                <th className="text-left px-3 py-2 font-medium">Email</th>
                <th className="text-right px-3 py-2 font-medium">Llamadas</th>
                <th className="text-right px-3 py-2 font-medium">Costo real</th>
                <th className="text-right px-3 py-2 font-medium">Sin caching</th>
                <th className="text-right px-3 py-2 font-medium text-emerald-600">Ahorro $</th>
                <th className="text-right px-3 py-2 font-medium text-emerald-600">Ahorro %</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map(r => {
                const without = costWithoutCache(r);
                const saved   = without - Number(r.total_cost);
                const savedPct = without > 0 ? (saved / without) * 100 : 0;
                return (
                  <tr key={r.user_id} className="hover:bg-muted/30">
                    <td className="px-3 py-2 font-medium">{r.business_name ?? <span className="text-muted-foreground italic">Sin nombre</span>}</td>
                    <td className="px-3 py-2 text-muted-foreground text-xs">{r.contact_email ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{Number(r.total_calls).toLocaleString("es-MX")}</td>
                    <td className="px-3 py-2 text-right font-medium">{fmtUsd(Number(r.total_cost))}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{fmtUsd(without)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-emerald-600">{saved > 0 ? fmtUsd(saved) : "—"}</td>
                    <td className="px-3 py-2 text-right">
                      {savedPct > 0
                        ? <span className="inline-block bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold px-1.5 py-0.5 rounded-full">{fmtPct(savedPct)}</span>
                        : <span className="text-muted-foreground">—</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-muted/50 font-semibold border-t-2">
              <tr>
                <td className="px-3 py-2" colSpan={2}>Total</td>
                <td className="px-3 py-2 text-right">{totals.calls.toLocaleString("es-MX")}</td>
                <td className="px-3 py-2 text-right">{fmtUsd(totals.costReal)}</td>
                <td className="px-3 py-2 text-right text-muted-foreground">{fmtUsd(totals.costWithout)}</td>
                <td className="px-3 py-2 text-right text-emerald-600">{fmtUsd(totalSaved)}</td>
                <td className="px-3 py-2 text-right">
                  <span className="inline-block bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold px-1.5 py-0.5 rounded-full">{fmtPct(totalSavedPct)}</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        "Sin caching" = costo hipotético si todos los tokens se cobraran al precio normal ($0.25/M entrada). El ahorro refleja el beneficio real del prompt caching.
      </p>
    </div>
  );
};

type TabId = "general" | "logs" | "staff" | "reminders" | "saas" | "soporte" | "perfil" | "vendor_links" | "vendedores" | "ia_costos";

type TabDef = {
  id: TabId;
  label: string;
  description: string;
  icon: React.ElementType;
  group: string;
  Component: React.ComponentType;
  adminOnly?: boolean;
  saasClientVisible?: boolean; // override adminOnly para clientes SaaS
  vendorOnly?: boolean;
};

const ALL_TABS: TabDef[] = [
  { id: "general",      label: "Mi Negocio",       description: "Perfil, marca y servicios",  icon: Store,         group: "General",      adminOnly: true,                           Component: GeneralTab          },
  { id: "staff",        label: "Staff",             description: "Equipo y permisos",          icon: Users,         group: "General",      adminOnly: true,  saasClientVisible: true,   Component: StaffTab            },
  { id: "vendedores",   label: "Vendedores",        description: "Gestión de vendedores",      icon: UserCog,       group: "General",      adminOnly: true,                           Component: CrmVendors          },
  { id: "vendor_links", label: "Links Vendedores",  description: "URLs y recursos externos",   icon: Link,          group: "General",      adminOnly: true,                           Component: VendorLinksAdminTab },
  { id: "reminders",    label: "Recordatorios",     description: "Email y WhatsApp",           icon: Bell,          group: "Comunicación",                                             Component: RemindersTab        },
  { id: "soporte",      label: "Soporte",           description: "Canal de soporte",           icon: MessageCircle, group: "Comunicación", adminOnly: true,                           Component: SupportTab          },
  { id: "logs",         label: "Logs",              description: "Historial de actividad",     icon: Activity,      group: "Sistema",      adminOnly: true,  saasClientVisible: true,   Component: LogsTab             },
  { id: "ia_costos",    label: "Costos IA",         description: "Uso y costo del agente IA",  icon: Bot,           group: "Sistema",      adminOnly: true,                           Component: IACostosTab         },
  { id: "perfil",       label: "Mi Perfil",         description: "Datos del vendedor",         icon: User,          group: "Mi Cuenta",    vendorOnly: true,                          Component: VendorProfileTab    },
];

const SETTINGS_GROUPS = ["General", "Comunicación", "Sistema", "Mi Cuenta"];

const CrmSettings = ({ isSuperAdmin, isSaasClient, isVendor, vendorId: _vendorId }: { isSuperAdmin?: boolean; isSaasClient?: boolean; isVendor?: boolean; vendorId?: string | null }) => {
  const visibleTabs = ALL_TABS.filter((t) => {
    if (t.adminOnly && !isSuperAdmin && !(t.saasClientVisible && isSaasClient)) return false;
    if (t.vendorOnly && !isVendor) return false;
    if (isVendor && (t.id === "staff" || t.id === "logs" || t.id === "general" || t.id === "soporte")) return false;
    return true;
  });

  const defaultTab = (isSuperAdmin ? "general" : isVendor ? "perfil" : "reminders") as TabId;
  const [selectedId, setSelectedId] = useState<TabId>(defaultTab);
  const [showMobileContent, setShowMobileContent] = useState(false);

  const activeTab = visibleTabs.find((t) => t.id === selectedId) ?? visibleTabs[0];
  const { Component } = activeTab;

  const handleSelect = (id: TabId) => {
    setSelectedId(id);
    setShowMobileContent(true);
  };

  const renderMenu = (activeSel?: TabId) => (
    <div className="space-y-4">
      {SETTINGS_GROUPS.map((group) => {
        const items = visibleTabs.filter((t) => t.group === group);
        if (!items.length) return null;
        return (
          <div key={group}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 px-1 mb-1.5">
              {group}
            </p>
            <div className="bg-card border rounded-2xl overflow-hidden divide-y divide-border/50">
              {items.map((t) => {
                const Icon = t.icon;
                const isActive = t.id === activeSel;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleSelect(t.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${
                      isActive ? "bg-primary/8" : "hover:bg-secondary/60"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isActive ? "bg-primary/15" : "bg-secondary"
                    }`}>
                      <Icon size={15} className={isActive ? "text-primary" : "text-muted-foreground"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium leading-tight ${isActive ? "text-primary" : "text-foreground"}`}>
                        {t.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{t.description}</p>
                    </div>
                    <ChevronRight size={14} className={`shrink-0 ${isActive ? "text-primary" : "text-muted-foreground/30"}`} />
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      {/* ── Mobile ── */}
      <div className="lg:hidden">
        {!showMobileContent ? (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-semibold">Configuración</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Gestión avanzada del sistema</p>
            </div>
            {renderMenu()}
          </div>
        ) : (
          <div className="space-y-5">
            <button
              onClick={() => setShowMobileContent(false)}
              className="flex items-center gap-0.5 text-primary text-sm font-medium -ml-1 hover:opacity-75 transition-opacity"
            >
              <ChevronLeft size={20} />
              Configuración
            </button>
            <div>
              <h2 className="text-xl font-semibold leading-tight">{activeTab.label}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{activeTab.description}</p>
            </div>
            <Component />
          </div>
        )}
      </div>

      {/* ── Desktop ── */}
      <div className="hidden lg:block space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Configuración</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gestión avanzada del sistema</p>
        </div>

        {/* Tab bar — same style as CrmBusiness */}
        <div className="overflow-x-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          <div className="inline-flex items-center gap-0.5 bg-secondary/60 rounded-xl p-1 min-w-max">
            {visibleTabs.map(({ id, label, icon: Icon }) => {
              const active = selectedId === id;
              return (
                <button
                  key={id}
                  onClick={() => setSelectedId(id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    active
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon size={13} className="shrink-0" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <Component />
      </div>
    </>
  );
};

export default CrmSettings;
