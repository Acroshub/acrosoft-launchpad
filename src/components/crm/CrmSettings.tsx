import { useState } from "react";
import { Activity, Loader2, Filter, Users, ChevronDown } from "lucide-react";
import { useLogs } from "@/hooks/useCrmData";
import type { CrmLog } from "@/hooks/useCrmData";

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

const LogsTab = () => {
  const { data: logs = [], isLoading } = useLogs();
  const [filter, setFilter] = useState<"all" | "create" | "update" | "delete">("all");

  const visible = filter === "all" ? logs : logs.filter((l) => l.action === filter);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Filter size={13} /> Filtrar:
        </div>
        {(["all", "create", "update", "delete"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
              filter === f
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
            }`}
          >
            {f === "all" ? "Todos" : ACTION_LABEL[f]}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">{visible.length} entradas</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={22} className="animate-spin text-muted-foreground" />
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-20 bg-card border rounded-2xl">
          <Activity size={30} className="mx-auto text-muted-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground">
            {filter === "all"
              ? "No hay actividad registrada aún. Los logs se generan automáticamente con cada operación."
              : "No hay entradas para este filtro."}
          </p>
        </div>
      ) : (
        <div className="bg-card border rounded-2xl overflow-hidden">
          {visible.map((log, i) => (
            <LogRow key={log.id} log={log} isLast={i === visible.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Staff Tab ────────────────────────────────────────────────────────────────

const StaffTab = () => (
  <div className="flex flex-col items-center justify-center py-20 text-center bg-card border rounded-2xl">
    <Users size={30} className="mx-auto text-muted-foreground/20 mb-3" />
    <p className="text-sm font-medium text-muted-foreground">Gestión de Staff</p>
    <p className="text-xs text-muted-foreground/60 mt-1">Próximamente podrás añadir y gestionar tu equipo de trabajo.</p>
  </div>
);

// ─── Settings shell ───────────────────────────────────────────────────────────

const TABS = [
  { id: "logs",  label: "Logs de Actividad", Component: LogsTab  },
  { id: "staff", label: "Staff",              Component: StaffTab },
] as const;

const CrmSettings = () => {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("logs");
  const { Component } = TABS.find((t) => t.id === tab)!;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Configuración</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gestión avanzada del sistema</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id
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
