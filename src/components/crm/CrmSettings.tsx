import { useState, useMemo, useEffect, useRef, useCallback, Fragment } from "react";
import { Activity, Loader2, Filter, Users, ChevronDown, ChevronRight, ChevronLeft, Search, X, Plus, Trash2, Mail, Pencil, ToggleLeft, ToggleRight, BellOff, CheckCircle2, AlertCircle, Clock, Send, UserCog, Bell, Bot } from "lucide-react";
import { useLogs, useStaff, useCreateStaff, useUpdateStaff, useDeleteStaff, useInviteStaff, useReminderConfig, useUpsertReminderConfig, useReminders, useCalendars, useForms, useContacts, useServices, useProducts } from "@/hooks/useCrmData";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/useAuth";
import type { CrmLog, CrmStaff, StaffPermission, StaffItemPermission, CrmReminder } from "@/lib/supabase";
import type { ItemSection } from "@/lib/permissions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import PhoneInputField from "@/components/shared/PhoneInput";
import ContactPicker from "@/components/crm/ContactPicker";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";
import DateRangePicker, { type DateRange } from "@/components/crm/DateRangePicker";

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
  | "perm_productos_fisicos"
  | "perm_productos_digitales"
  | "perm_dashboard"
  | "perm_ventas_reporte"
  | "perm_ventas_registrar"
  | "perm_calendarios"
  | "perm_formularios"
  | "perm_contactos"
  | "perm_recordatorios"
  | "perm_agente_ia"
>;

type PermSectionDef = { key: PermKey; label: string; actions: (keyof StaffPermission)[] };

// Agrupadas en el mismo orden que el menú principal de la izquierda (Crm.tsx: navItems).
const PERM_GROUPS: { label: string; sections: PermSectionDef[] }[] = [
  {
    label: "Inicio",
    sections: [
      { key: "perm_dashboard", label: "Inicio", actions: ["read"] },
    ],
  },
  {
    label: "Productos",
    sections: [
      { key: "perm_servicios",           label: "Servicios",           actions: ["read", "edit", "create", "delete"] },
      { key: "perm_productos_fisicos",   label: "Productos Físicos",   actions: ["read", "edit", "create", "delete"] },
      { key: "perm_productos_digitales", label: "Productos Digitales", actions: ["read", "edit", "create", "delete"] },
    ],
  },
  {
    label: "Ventas",
    sections: [
      { key: "perm_ventas_reporte",   label: "Reporte General e Historial",     actions: ["read", "edit", "delete"] },
      { key: "perm_ventas_registrar", label: "Registrar Manual y Renovaciones", actions: ["read", "create"] },
    ],
  },
  {
    label: "CRM",
    sections: [
      { key: "perm_contactos",   label: "Contactos",   actions: ["read", "edit", "create", "delete"] },
      { key: "perm_calendarios", label: "Calendarios", actions: ["read", "edit", "create", "delete"] },
      { key: "perm_formularios", label: "Formularios", actions: ["read", "edit", "create", "delete"] },
    ],
  },
  {
    label: "IA",
    sections: [
      { key: "perm_agente_ia", label: "WhatsApp IA (solo conversaciones)", actions: ["read"] },
    ],
  },
  {
    label: "Otros",
    sections: [
      { key: "perm_mi_negocio_datos", label: "Mi Negocio — Datos del negocio", actions: ["read", "edit"] },
      { key: "perm_recordatorios",    label: "Recordatorios",                 actions: ["read", "create"] },
    ],
  },
];

const PERM_SECTIONS: PermSectionDef[] = PERM_GROUPS.flatMap((g) => g.sections);

const DEFAULT_PERMS = (): Pick<CrmStaff,
  "perm_mi_negocio_datos" | "perm_mi_negocio_personal" | "perm_servicios" | "perm_productos_fisicos" | "perm_productos_digitales" |
  "perm_dashboard" | "perm_ventas_reporte" | "perm_ventas_registrar" | "perm_calendarios" | "perm_formularios" |
  "perm_contactos" | "perm_recordatorios" | "perm_agente_ia"
> => ({
  perm_mi_negocio_datos:    { read: true,  edit: false },
  perm_mi_negocio_personal: { read: true,  edit: true  }, // always on — staff can always see/edit their own info
  perm_servicios:           { read: true,  edit: false, create: false, delete: false },
  perm_productos_fisicos:   { read: true,  edit: false, create: false, delete: false },
  perm_productos_digitales: { read: true,  edit: false, create: false, delete: false },
  perm_dashboard:           { read: false },
  perm_ventas_reporte:      { read: false, edit: false, create: false, delete: false },
  perm_ventas_registrar:    { read: false, edit: false, create: false, delete: false },
  perm_calendarios:         { read: false, edit: false, create: false, delete: false },
  perm_formularios:         { read: false, edit: false, create: false, delete: false },
  perm_contactos:           { read: false, edit: false, create: false, delete: false },
  perm_recordatorios:       { read: false, create: false },
  perm_agente_ia:           { read: false },
});

// ─── Permission Matrix ────────────────────────────────────────────────────────

type ItemPerms = Record<string, StaffItemPermission>

const ITEM_SECTION_KEYS = new Set<PermKey>(["perm_calendarios", "perm_formularios", "perm_servicios", "perm_productos_fisicos", "perm_productos_digitales"]);

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
  itemData: Record<ItemSection, { items: ItemPerms | null; available: { id: string; name: string }[] }>;
  onItemData: (section: ItemSection, items: ItemPerms | null) => void;
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

  const setItemMode = (section: ItemSection, mode: ItemSectionMode) => {
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

  const toggleItemRead = (section: ItemSection, id: string) => {
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

  const toggleItemEdit = (section: ItemSection, id: string) => {
    const current = itemData[section].items ?? {};
    const perm = current[id] ?? { read: false, edit: false };
    onItemData(section, { ...current, [id]: { read: true, edit: !perm.edit } });
  };

  const renderSection = (section: PermSectionDef) => {
        const perm = perms[section.key] as StaffPermission;
        const adminActions = section.actions.filter((a) => a !== "read") as (keyof StaffPermission)[];
        const isRead  = !!perm.read;
        const isAdmin = adminActions.length > 0 && adminActions.every((a) => !!perm[a]);

        // Item-expandable sections
        if (ITEM_SECTION_KEYS.has(section.key)) {
          const sectionName = section.key.replace("perm_", "") as ItemSection;
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
  };

  return (
    <div className="space-y-3">
      {PERM_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 px-3 mb-0.5">
            {group.label}
          </p>
          <div className="space-y-1">
            {group.sections.map((section) => (
              <div key={section.key}>{renderSection(section)}</div>
            ))}
          </div>
        </div>
      ))}
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
  onSave: (data: Omit<CrmStaff, "id" | "created_at" | "owner_user_id" | "staff_user_id" | "status" | "perm_productos">) => void;
  isSaving: boolean;
}) => {
  const { data: calendars = [] }  = useCalendars();
  const { data: rawForms = [] }   = useForms();
  const { data: contacts = [] }   = useContacts();
  const { data: services = [] }   = useServices();
  const { data: allProducts = [] } = useProducts();
  const physicalProducts = allProducts.filter((p) => p.product_kind === "fisico");
  const digitalProducts  = allProducts.filter((p) => p.product_kind === "archivo");

  const [name, setName]        = useState(initial?.name ?? "");
  const [email, setEmail]      = useState(initial?.email ?? "");
  const [description, setDesc] = useState(initial?.description ?? "");
  const [phone, setPhone]      = useState(initial?.phone ?? "");
  const [selectedContactId, setSelectedContactId] = useState(initial?.contact_id ?? "");
  const selectedContact = contacts.find((c) => c.id === selectedContactId) ?? null;
  const [perms, setPerms]      = useState<ReturnType<typeof DEFAULT_PERMS>>(
    initial
      ? {
          perm_mi_negocio_datos:    initial.perm_mi_negocio_datos,
          perm_mi_negocio_personal: initial.perm_mi_negocio_personal,
          perm_servicios:           initial.perm_servicios,
          perm_productos_fisicos:   initial.perm_productos_fisicos,
          perm_productos_digitales: initial.perm_productos_digitales,
          perm_dashboard:           initial.perm_dashboard,
          perm_ventas_reporte:      initial.perm_ventas_reporte,
          perm_ventas_registrar:    initial.perm_ventas_registrar,
          perm_calendarios:         initial.perm_calendarios,
          perm_formularios:         initial.perm_formularios,
          perm_contactos:           initial.perm_contactos,
          perm_recordatorios:       initial.perm_recordatorios,
          perm_agente_ia:           initial.perm_agente_ia ?? { read: false },
        }
      : DEFAULT_PERMS()
  );

  const [calItems,  setCalItems]  = useState<ItemPerms | null>(initial?.perm_calendarios_items ?? null);
  const [formItems, setFormItems] = useState<ItemPerms | null>(initial?.perm_formularios_items ?? null);
  const [servItems, setServItems] = useState<ItemPerms | null>(initial?.perm_servicios_items ?? null);
  const [prodFisicoItems,   setProdFisicoItems]   = useState<ItemPerms | null>(initial?.perm_productos_fisicos_items ?? null);
  const [prodDigitalItems,  setProdDigitalItems]  = useState<ItemPerms | null>(initial?.perm_productos_digitales_items ?? null);

  const itemData: Record<ItemSection, { items: ItemPerms | null; available: { id: string; name: string }[] }> = {
    calendarios: { items: calItems,  available: calendars.map(c => ({ id: c.id, name: c.name ?? c.slug ?? c.id })) },
    formularios:  { items: formItems, available: rawForms.map(f => ({ id: f.id, name: f.name })) },
    servicios:            { items: servItems,       available: services.map(s => ({ id: s.id, name: s.name })) },
    productos_fisicos:    { items: prodFisicoItems,  available: physicalProducts.map(p => ({ id: p.id, name: p.name })) },
    productos_digitales:  { items: prodDigitalItems, available: digitalProducts.map(p => ({ id: p.id, name: p.name })) },
  };

  const handleItemData = (section: ItemSection, items: ItemPerms | null) => {
    if (section === "calendarios") setCalItems(items);
    else if (section === "formularios") setFormItems(items);
    else if (section === "servicios") setServItems(items);
    else if (section === "productos_fisicos") setProdFisicoItems(items);
    else setProdDigitalItems(items);
  };

  const canSubmit = initial ? !!name.trim() && !!email.trim() : !!selectedContact && !!selectedContact.email;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSave({
      contact_id:  initial ? (initial.contact_id ?? null) : selectedContact!.id,
      name:        initial ? name.trim() : selectedContact!.name,
      email:       initial ? email.trim() : selectedContact!.email!,
      description: description.trim() || null,
      phone:       initial ? (phone.trim() || null) : selectedContact!.phone,
      ...perms,
      perm_calendarios_items: calItems,
      perm_formularios_items: formItems,
      perm_servicios_items: servItems,
      perm_productos_fisicos_items: prodFisicoItems,
      perm_productos_digitales_items: prodDigitalItems,
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
            {!initial ? (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Contacto *</label>
                  <ContactPicker
                    contacts={contacts}
                    value={selectedContactId}
                    onChange={setSelectedContactId}
                    requireEmail
                    placeholder="Buscar contacto por nombre, correo o teléfono..."
                  />
                  {selectedContact && !selectedContact.email && (
                    <p className="text-[10px] text-destructive mt-1">
                      Este contacto no tiene correo — agrégale uno desde Contactos antes de invitarlo como staff.
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground/60 mt-1">Se enviará un email de invitación para establecer contraseña.</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Rol / Cargo</label>
                  <Input value={description} onChange={(e) => setDesc(e.target.value)} placeholder="Ej: Asistente, Coordinador..." className="h-9" />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre *</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre completo" className="h-9" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Email *</label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@ejemplo.com" type="email" className="h-9" disabled />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Rol / Cargo</label>
                  <Input value={description} onChange={(e) => setDesc(e.target.value)} placeholder="Ej: Asistente, Coordinador..." className="h-9" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">WhatsApp / Teléfono</label>
                  <PhoneInputField value={phone} onChange={setPhone} placeholder="71234567" />
                </div>
              </>
            )}
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
            disabled={!canSubmit || isSaving}
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

// ─── Settings shell ───────────────────────────────────────────────────────────

// ─── Tab: Costos IA ──────────────────────────────────────────────────────────
type UsageRow = {
  user_id: string; business_name: string | null; email: string | null;
  // Filtrados por el rango de fecha seleccionado:
  total_calls: number; total_input: number; total_output: number;
  total_cache_read: number; total_cache_creation: number; total_cost: number;
  // Globales — TODO el historial, nunca afectados por el filtro de fecha:
  revenue_usd: number | null; revenue_has_data: boolean;
  margin_cost_usd: number; covered_by_admin_usd: number;
  is_admin_account: boolean;
};

// Desglose por función (`source`) y operación concreta (`category`)
type SourceRow = {
  source: string; category: string; total_calls: number;
  total_input: number; total_output: number;
  total_cache_read: number; total_cache_creation: number; total_cost: number;
};

const SOURCE_LABELS: Record<string, string> = {
  "ai-agent":              "Agente IA (WhatsApp)",
  "analyze-sales-pattern": "Aprendizaje de ventas",
  "manage-wa-templates":   "Plantillas de WhatsApp",
  "improve-label-hint":    "Etiquetas automáticas",
  "validate-flow-trigger": "Flujos: validación",
};

const CATEGORY_LABELS: Record<string, { label: string; desc: string }> = {
  respuesta_texto:       { label: "Responder mensajes de texto", desc: "Genera la respuesta al cliente" },
  respuesta_media:       { label: "Analizar imágenes y PDFs",    desc: "Visión + detección de comprobantes de pago" },
  agendamiento:          { label: "Agendar citas",               desc: "Respuesta con acceso al calendario" },
  deteccion_intencion:   { label: "Detectar intención",          desc: "Decide si el mensaje dispara un flujo" },
  personalizacion_flujo: { label: "Personalizar flujos",         desc: "Reescribe cada paso con contexto" },
  aprendizaje_ventas:    { label: "Aprender de ventas",          desc: "Resume el patrón de ventas exitosas" },
  plantillas_whatsapp:   { label: "Reescribir plantillas",       desc: "Adapta plantillas para aprobación de Meta" },
  hints_etiquetas:       { label: "Mejorar hints",               desc: "Reescribe las reglas de etiquetado" },
  validacion_triggers:   { label: "Validar triggers",            desc: "Comprueba que un trigger sea detectable" },
  historico_sin_clasificar: { label: "Sin clasificar (histórico)", desc: "Registrado antes de que existieran las categorías" },
};

// Costo que hubiera tenido SIN caching (todos los tokens al precio normal de entrada).
// Precios de Haiku 4.5, el modelo del agente IA (USD por millón de tokens).
const costWithoutCache = (r: UsageRow) => {
  const allInput = Number(r.total_input) + Number(r.total_cache_read) + Number(r.total_cache_creation);
  return (allInput * 1.0 + Number(r.total_output) * 5.0) / 1_000_000;
};

// Margen = (ingreso TOTAL histórico del cliente − costo TOTAL histórico de IA
// de esa cuenta) / ingreso. Global a propósito — nunca usa total_cost (que sí
// respeta el filtro de fecha de la tabla): el margen responde "en toda la
// relación con este cliente, ¿estoy ganando o perdiendo?", no "¿y esta semana?".
// Colores: ≥50% verde, 10-50% amarillo, ≤10% (incluye 0 y negativo) rojo.
// Sin registro de pago → se trata como 0% de margen, en rojo: ese costo de IA
// no lo está cubriendo ningún cliente, lo está cubriendo Acrosoft directamente.
// Esto incluye la propia cuenta del admin (Acros Software LLC): no tiene
// ingreso porque no es un cliente, así que cae en el mismo 0% que cualquier
// cuenta sin pago — su costo también es dinero real que sale del bolsillo.
const RED = "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
function marginInfo(r: UsageRow): { pct: number; label: string; classes: string; noPayment: boolean } {
  if (!r.revenue_has_data || !r.revenue_usd) {
    return { pct: 0, label: "0%", classes: RED, noPayment: true };
  }
  const pct = ((r.revenue_usd - r.margin_cost_usd) / r.revenue_usd) * 100;
  if (pct >= 50) return { pct, label: `${pct.toFixed(0)}%`, classes: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400", noPayment: false };
  if (pct >= 10) return { pct, label: `${pct.toFixed(0)}%`, classes: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400", noPayment: false };
  return { pct, label: `${pct.toFixed(0)}%`, classes: RED, noPayment: false };
}

const IACostosTab = () => {
  const [range, setRange] = useState<DateRange>(() => {
    const to = new Date();
    const from = new Date(to.getFullYear(), to.getMonth(), 1);
    return { from, to };
  });
  const [rows, setRows] = useState<UsageRow[]>([]);
  const [sourceRows, setSourceRows] = useState<SourceRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const from = range.from.toISOString();
    const to = range.to.toISOString();
    setLoading(true);
    Promise.all([
      supabase.rpc("get_ai_usage_by_account", { p_from: from, p_to: to }),
      supabase.rpc("get_ai_usage_by_source",  { p_from: from, p_to: to }),
    ]).then(([byAccount, bySource]) => {
      if (!byAccount.error && byAccount.data) setRows(byAccount.data as UsageRow[]);
      if (!bySource.error  && bySource.data)  setSourceRows(bySource.data as SourceRow[]);
      setLoading(false);
    });
  }, [range]);

  const totals = rows.reduce(
    (acc, r) => ({
      calls:       acc.calls       + Number(r.total_calls),
      costReal:    acc.costReal    + Number(r.total_cost),
      costWithout: acc.costWithout + costWithoutCache(r),
      revenue:     acc.revenue     + (!r.is_admin_account && r.revenue_has_data ? Number(r.revenue_usd) : 0),
      marginCost:  acc.marginCost  + (!r.is_admin_account && r.revenue_has_data ? r.margin_cost_usd : 0),
      // covered_by_admin_usd es global (histórico completo), sin filtrar por
      // fecha. Incluye la propia cuenta del admin (Acros): no es un cliente
      // subsidiado, pero sigue siendo dinero real que sale de su bolsillo.
      coveredByMe: acc.coveredByMe + Number(r.covered_by_admin_usd),
    }),
    { calls: 0, costReal: 0, costWithout: 0, revenue: 0, marginCost: 0, coveredByMe: 0 }
  );
  const totalSaved   = totals.costWithout - totals.costReal;
  const totalSavedPct = totals.costWithout > 0 ? (totalSaved / totals.costWithout) * 100 : 0;
  // Global, igual que por fila: usa el costo histórico total (marginCost), no
  // el costo filtrado por fecha (costReal).
  const totalMarginPct = totals.revenue > 0 ? ((totals.revenue - totals.marginCost) / totals.revenue) * 100 : null;

  const fmtUsd  = (n: number) => `$${n.toFixed(4)}`;
  const fmtPct  = (n: number) => `${n.toFixed(1)}%`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold">Costos de IA por cuenta</h3>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {/* KPI cards resumen */}
      {!loading && rows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Llamadas <span className="opacity-60">(filtro)</span></p>
            <p className="text-xl font-semibold">{totals.calls.toLocaleString("es-MX")}</p>
          </div>
          <div className="border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Costo real <span className="opacity-60">(filtro)</span></p>
            <p className="text-xl font-semibold">{fmtUsd(totals.costReal)}</p>
          </div>
          <div className="border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Ingreso <span className="opacity-60">(global)</span></p>
            <p className="text-xl font-semibold">{fmtUsd(totals.revenue)}</p>
          </div>
          <div className={`border rounded-xl p-4 ${totalMarginPct === null ? "" :
            totalMarginPct >= 50 ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10" :
            totalMarginPct >= 10 ? "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10" :
            "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10"}`}>
            <p className="text-xs text-muted-foreground mb-1">Margen <span className="opacity-60">(global)</span></p>
            <p className={`text-xl font-semibold ${totalMarginPct === null ? "text-muted-foreground" :
              totalMarginPct >= 50 ? "text-emerald-600" : totalMarginPct >= 10 ? "text-amber-600" : "text-red-600"}`}>
              {totalMarginPct === null ? "—" : fmtPct(totalMarginPct)}
            </p>
          </div>
          <div className={`border rounded-xl p-4 ${totals.coveredByMe > 0 ? "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10" : "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10"}`}>
            <p className="text-xs text-muted-foreground mb-1">Lo cubres tú <span className="opacity-60">(global)</span></p>
            <p className={`text-xl font-semibold ${totals.coveredByMe > 0 ? "text-red-600" : "text-emerald-600"}`}>
              {fmtUsd(totals.coveredByMe)}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-8 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando...
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Sin datos para este rango de fechas.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-1 font-medium" colSpan={2} />
                <th className="text-center px-3 py-1 font-semibold text-[10px] uppercase tracking-wide text-muted-foreground border-l-2 border-border" colSpan={2}>
                  Global — todo el historial
                </th>
                <th className="text-center px-3 py-1 font-semibold text-[10px] uppercase tracking-wide text-muted-foreground border-l-2 border-border" colSpan={3}>
                  Filtrado por fecha
                </th>
              </tr>
              <tr>
                <th className="text-left px-3 py-2 font-medium">Negocio</th>
                <th className="text-left px-3 py-2 font-medium">Email</th>
                <th className="text-right px-3 py-2 font-medium border-l-2 border-border">Ingreso (USD)</th>
                <th className="text-right px-3 py-2 font-medium">Margen</th>
                <th className="text-right px-3 py-2 font-medium border-l-2 border-border">Llamadas</th>
                <th className="text-right px-3 py-2 font-medium">Costo real</th>
                <th className="text-right px-3 py-2 font-medium text-emerald-600">Ahorro caché</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map(r => {
                const cost    = Number(r.total_cost);
                const without = costWithoutCache(r);
                const saved   = without - cost;
                const margin  = marginInfo(r);
                return (
                  <tr key={r.user_id} className={margin.pct < 10 ? "bg-red-50/50 dark:bg-red-900/10" : "hover:bg-muted/30"}>
                    <td className="px-3 py-2 font-medium">
                      {r.business_name ?? <span className="text-muted-foreground italic">Sin nombre</span>}
                      {r.is_admin_account && <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">(tú)</span>}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground text-xs">{r.email ?? "—"}</td>
                    <td className="px-3 py-2 text-right border-l-2 border-border">
                      {r.revenue_has_data ? fmtUsd(Number(r.revenue_usd)) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className={`inline-block text-xs font-semibold px-1.5 py-0.5 rounded-full ${margin.classes}`}>
                        {margin.label}
                      </span>
                      {margin.noPayment && <p className="text-[10px] text-red-500 mt-0.5">lo cubres tú</p>}
                    </td>
                    <td className="px-3 py-2 text-right border-l-2 border-border">{Number(r.total_calls).toLocaleString("es-MX")}</td>
                    <td className="px-3 py-2 text-right font-medium">{fmtUsd(cost)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-emerald-600">{saved > 0 ? fmtUsd(saved) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-muted/50 font-semibold border-t-2">
              <tr>
                <td className="px-3 py-2" colSpan={2}>Total</td>
                <td className="px-3 py-2 text-right border-l-2 border-border">{fmtUsd(totals.revenue)}</td>
                <td className="px-3 py-2 text-right">
                  {totalMarginPct === null ? "—" : fmtPct(totalMarginPct)}
                </td>
                <td className="px-3 py-2 text-right border-l-2 border-border">{totals.calls.toLocaleString("es-MX")}</td>
                <td className="px-3 py-2 text-right">{fmtUsd(totals.costReal)}</td>
                <td className="px-3 py-2 text-right text-emerald-600">
                  {fmtUsd(totalSaved)} <span className="font-normal">({fmtPct(totalSavedPct)})</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {!loading && sourceRows.length > 0 && (() => {
        // Agrupar categorías bajo su función, ambas ordenadas por costo desc.
        const byFn = new Map<string, SourceRow[]>();
        for (const r of sourceRows) {
          if (!byFn.has(r.source)) byFn.set(r.source, []);
          byFn.get(r.source)!.push(r);
        }
        const groups = [...byFn.entries()]
          .map(([source, cats]) => ({
            source,
            cats: [...cats].sort((a, b) => Number(b.total_cost) - Number(a.total_cost)),
            calls: cats.reduce((n, c) => n + Number(c.total_calls), 0),
            cost:  cats.reduce((n, c) => n + Number(c.total_cost), 0),
          }))
          .sort((a, b) => b.cost - a.cost);
        const grandTotal = groups.reduce((n, g) => n + g.cost, 0);

        return (
          <div className="space-y-2 pt-2">
            <h4 className="font-semibold text-sm">Consumo por función</h4>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Función / operación</th>
                    <th className="text-right px-3 py-2 font-medium">Llamadas</th>
                    <th className="text-right px-3 py-2 font-medium">Entrada</th>
                    <th className="text-right px-3 py-2 font-medium">Salida</th>
                    <th className="text-right px-3 py-2 font-medium">Caché (lee/escribe)</th>
                    <th className="text-right px-3 py-2 font-medium">Costo</th>
                    <th className="text-right px-3 py-2 font-medium">% del total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {groups.map(g => (
                    <Fragment key={g.source}>
                      <tr className="bg-muted/30 font-semibold">
                        <td className="px-3 py-2">{SOURCE_LABELS[g.source] ?? g.source}</td>
                        <td className="px-3 py-2 text-right">{g.calls.toLocaleString("es-MX")}</td>
                        <td className="px-3 py-2" colSpan={3} />
                        <td className="px-3 py-2 text-right">{fmtUsd(g.cost)}</td>
                        <td className="px-3 py-2 text-right">
                          {grandTotal > 0 ? fmtPct((g.cost / grandTotal) * 100) : "—"}
                        </td>
                      </tr>
                      {g.cats.map(c => {
                        const meta = CATEGORY_LABELS[c.category];
                        return (
                          <tr key={`${c.source}-${c.category}`} className="hover:bg-muted/20">
                            <td className="px-3 py-2 pl-8">
                              <span>{meta?.label ?? c.category}</span>
                              {meta && <p className="text-xs text-muted-foreground">{meta.desc}</p>}
                            </td>
                            <td className="px-3 py-2 text-right">{Number(c.total_calls).toLocaleString("es-MX")}</td>
                            <td className="px-3 py-2 text-right text-muted-foreground">{Number(c.total_input).toLocaleString("es-MX")}</td>
                            <td className="px-3 py-2 text-right text-muted-foreground">{Number(c.total_output).toLocaleString("es-MX")}</td>
                            <td className="px-3 py-2 text-right text-muted-foreground text-xs">
                              {Number(c.total_cache_read).toLocaleString("es-MX")} / {Number(c.total_cache_creation).toLocaleString("es-MX")}
                            </td>
                            <td className="px-3 py-2 text-right font-medium">{fmtUsd(Number(c.total_cost))}</td>
                            <td className="px-3 py-2 text-right text-muted-foreground">
                              {grandTotal > 0 ? fmtPct((Number(c.total_cost) / grandTotal) * 100) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              Enviar y recibir mensajes de WhatsApp no consume tokens: el gasto ocurre solo cuando la IA genera o analiza contenido.
            </p>
          </div>
        );
      })()}

      <p className="text-xs text-muted-foreground">
        "Sin caching" = costo hipotético si todos los tokens se cobraran al precio normal ($1.00/M entrada). El ahorro refleja el beneficio real del prompt caching.
        <br />
"Ingreso" y "Margen" son globales: suman TODOS los pagos históricos del negocio (crm_sales, convertidos a USD con crm_fx_rates) contra su costo de IA histórico completo — el filtro de fecha de arriba nunca los afecta. Solo "Llamadas", "Costo real" y "Ahorro caché" respetan el filtro. Sin registro de pago = margen 0% en rojo, y ese costo cuenta en "Lo cubres tú". "Acros Software LLC (tú)" es tu propia cuenta — no tiene margen aplicable (no eres tu propio cliente), pero su costo de IA sí suma en "Lo cubres tú": sigue siendo gasto real tuyo.
      </p>
    </div>
  );
};

type TabId = "logs" | "staff" | "reminders" | "saas" | "ia_costos";

type TabDef = {
  id: TabId;
  label: string;
  description: string;
  icon: React.ElementType;
  group: string;
  Component: React.ComponentType;
  adminOnly?: boolean;
  saasClientVisible?: boolean; // override adminOnly para clientes SaaS
};

const ALL_TABS: TabDef[] = [
  { id: "staff",        label: "Staff",             description: "Equipo y permisos",          icon: Users,         group: "General",      adminOnly: true,  saasClientVisible: true,   Component: StaffTab            },
  { id: "reminders",    label: "Historial de Comunicaciones", description: "Email y WhatsApp", icon: Bell,          group: "Comunicación",                                             Component: RemindersTab        },
  { id: "logs",         label: "Logs",              description: "Historial de actividad",     icon: Activity,      group: "Sistema",      adminOnly: true,  saasClientVisible: true,   Component: LogsTab             },
  { id: "ia_costos",    label: "Costos IA",         description: "Uso y costo del agente IA",  icon: Bot,           group: "Sistema",      adminOnly: true,                           Component: IACostosTab         },
];

const SETTINGS_GROUPS = ["General", "Comunicación", "Sistema"];

const CrmSettings = ({ isSuperAdmin, isSaasClient }: { isSuperAdmin?: boolean; isSaasClient?: boolean }) => {
  const visibleTabs = ALL_TABS.filter((t) => {
    if (t.adminOnly && !isSuperAdmin && !(t.saasClientVisible && isSaasClient)) return false;
    return true;
  });

  const defaultTab: TabId = "staff";
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
