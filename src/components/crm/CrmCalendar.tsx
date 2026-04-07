import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, CalendarDays, Clock, User, Plus, Settings, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import CrmCalendarConfig from "./CrmCalendarConfig";

// {VAR_DB} — citas reales vendrán de Supabase
const today = new Date();
const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

const appointments: {
  id: string; name: string; email: string; phone: string;
  date: string; time: string; hour: number; service: string; status: string; notes: string;
}[] = [
  {
    id: "apt-1",
    name: "{VAR_DB}",
    email: "{VAR_DB}",
    phone: "{VAR_DB}",
    date: todayKey,
    time: "10:00",
    hour: 10,
    service: "{VAR_DB}",
    status: "Confirmada",
    notes: "{VAR_DB}",
  },
];

type ViewMode = "day" | "week" | "month";

interface CalendarConfig {
  id: string;
  name: string;
}

const dummyCalendars: CalendarConfig[] = [
  { id: "cal-1", name: "Consultas Iniciales (Gratis)" },
  { id: "cal-2", name: "Soporte Técnico" },
];

const statusStyles: Record<string, string> = {
  "Confirmada": "bg-primary/10 text-primary border-primary/20",
  "Pendiente":  "bg-amber-50 text-amber-700 border-amber-200",
  "Cancelada":  "bg-destructive/10 text-destructive border-destructive/20",
  "Completada": "bg-muted text-muted-foreground border-border",
};

const DAYS_ES   = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const HOURS     = Array.from({ length: 13 }, (_, i) => i + 7); // 7:00 – 19:00

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay() || 7; // Sunday = 7, not 0
  d.setDate(d.getDate() - day + 1); // Monday
  return d;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Sub-views ───────────────────────────────────────────────

const EmptySlot = () => (
  <div className="py-10 text-center">
    <CalendarDays size={22} className="text-muted-foreground/20 mx-auto mb-2" />
    <p className="text-xs text-muted-foreground">Sin citas agendadas</p>
  </div>
);

// DAY VIEW
const DayView = ({
  current, onSelect, selected,
}: { current: Date; onSelect: (id: string) => void; selected: string | null }) => {
  const key = dateKey(current);
  const dayAppts = appointments.filter((a) => a.date === key);

  return (
    <div className="bg-card border rounded-2xl overflow-hidden">
      <div className="divide-y">
        {HOURS.map((hour) => {
          const appt = dayAppts.find((a) => a.hour === hour);
          return (
            <div key={hour} className="flex gap-4 px-5 py-3 min-h-[56px]">
              <span className="text-xs text-muted-foreground/60 w-12 shrink-0 pt-0.5 font-mono">
                {String(hour).padStart(2, "0")}:00
              </span>
              {appt ? (
                <button
                  onClick={() => onSelect(appt.id === selected ? "" : appt.id)}
                  className={`flex-1 text-left rounded-xl px-3 py-2 border transition-all text-xs ${
                    selected === appt.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-primary/20 border-primary/30 hover:bg-primary/30"
                  }`}
                >
                  <p className="font-medium">{appt.name}</p>
                  <p className="opacity-80 mt-0.5">{appt.service}</p>
                </button>
              ) : (
                <div className="flex-1 border-b border-dashed border-border/30" />
              )}
            </div>
          );
        })}
        {dayAppts.length === 0 && <EmptySlot />}
      </div>
    </div>
  );
};

// WEEK VIEW
const WeekView = ({
  current, onSelect, selected,
}: { current: Date; onSelect: (id: string) => void; selected: string | null }) => {
  const monday = startOfWeek(current);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  return (
    <div className="bg-card border rounded-2xl overflow-hidden overflow-x-auto">
      {/* Header row */}
      <div className="flex border-b">
        {/* Hour gutter header */}
        <div className="w-14 shrink-0 border-r" />
        {weekDays.map((day) => {
          const isToday = sameDay(day, new Date());
          return (
            <div
              key={day.toISOString()}
              className={`flex-1 min-w-[90px] px-2 py-3 text-center border-r last:border-r-0 ${isToday ? "bg-primary/5" : ""}`}
            >
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{DAYS_ES[day.getDay()]}</p>
              <p className={`text-sm font-semibold mt-0.5 ${isToday ? "text-primary" : ""}`}>{day.getDate()}</p>
            </div>
          );
        })}
      </div>

      {/* Hour rows */}
      <div>
        {HOURS.map((hour) => (
          <div key={hour} className="flex border-b last:border-b-0 min-h-[52px]">
            {/* Hour label */}
            <div className="w-14 shrink-0 border-r px-2 pt-1.5 text-right">
              <span className="text-[10px] text-muted-foreground/60 font-mono">
                {String(hour).padStart(2, "0")}:00
              </span>
            </div>
            {/* Day cells */}
            {weekDays.map((day) => {
              const key = dateKey(day);
              const appt = appointments.find((a) => a.date === key && a.hour === hour);
              const isToday = sameDay(day, new Date());
              return (
                <div
                  key={key}
                  className={`flex-1 min-w-[90px] border-r last:border-r-0 px-1.5 py-1 ${isToday ? "bg-primary/5" : ""}`}
                >
                  {appt && (
                    <button
                      onClick={() => onSelect(appt.id === selected ? "" : appt.id)}
                      className={`w-full text-left rounded-lg px-2 py-1.5 text-[10px] border transition-all ${
                        selected === appt.id
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-primary/20 border-primary/30 text-primary hover:bg-primary/30"
                      }`}
                    >
                      <p className="font-semibold truncate">{appt.time}</p>
                      <p className="truncate opacity-80">{appt.name}</p>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

// MONTH VIEW
const MonthView = ({
  current, onSelect, selected,
}: { current: Date; onSelect: (id: string) => void; selected: string | null }) => {
  const year  = current.getFullYear();
  const month = current.getMonth();

  const firstDay   = new Date(year, month, 1);
  const lastDay    = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7; // 0=Monday offset
  const totalCells  = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7;

  const cells = Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i - startOffset + 1;
    if (dayNum < 1 || dayNum > lastDay.getDate()) return null;
    return new Date(year, month, dayNum);
  });

  return (
    <div className="bg-card border rounded-2xl overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b">
        {["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map((d) => (
          <div key={d} className="py-2.5 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-r last:border-r-0">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="min-h-[90px] border-r border-b last:border-r-0 bg-secondary/10" />;
          const key = dateKey(day);
          const dayAppts = appointments.filter((a) => a.date === key);
          const isToday = sameDay(day, new Date());

          return (
            <div key={key} className={`min-h-[90px] p-2 border-r border-b last:border-r-0 ${isToday ? "bg-primary/5" : ""}`}>
              <p className={`text-xs font-semibold mb-1.5 w-6 h-6 flex items-center justify-center rounded-full ${
                isToday ? "bg-primary text-primary-foreground" : "text-foreground"
              }`}>
                {day.getDate()}
              </p>
              <div className="space-y-1">
                {dayAppts.slice(0, 3).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => onSelect(a.id === selected ? "" : a.id)}
                    className={`w-full text-left rounded px-1.5 py-1 text-[10px] truncate border transition-all ${
                      selected === a.id
                        ? "bg-primary text-primary-foreground border-primary font-semibold"
                        : "bg-primary/5 border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {a.time} {a.name}
                  </button>
                ))}
                {dayAppts.length > 3 && (
                  <p className="text-[10px] text-muted-foreground px-1">+{dayAppts.length - 3} más</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────

const CrmCalendar = () => {
  const [calendars, setCalendars] = useState<CalendarConfig[]>(dummyCalendars);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(dummyCalendars[0]?.id ?? null);
  const [view, setView] = useState<ViewMode>("week");
  const [current, setCurrent] = useState(new Date());
  const [selected, setSelected] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const selectedCalendar = calendars.find(c => c.id === selectedCalendarId);
  const detail = appointments.find((a) => a.id === selected);

  const navigate = (dir: 1 | -1) => {
    const d = new Date(current);
    if (view === "day")   d.setDate(d.getDate() + dir);
    if (view === "week")  d.setDate(d.getDate() + dir * 7);
    if (view === "month") d.setMonth(d.getMonth() + dir);
    setCurrent(d);
  };

  const isTodayInView = () => {
    const td = new Date();
    if (view === "day") return sameDay(current, td);
    if (view === "week") {
      const mon = startOfWeek(current);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return td.getTime() >= mon.getTime() && td.getTime() <= sun.getTime();
    }
    if (view === "month") {
      return current.getMonth() === td.getMonth() && current.getFullYear() === td.getFullYear();
    }
    return false;
  };
  const isToday = isTodayInView();

  const headerLabel = () => {
    if (view === "day") {
      return `${DAYS_ES[current.getDay()]} ${current.getDate()} de ${MONTHS_ES[current.getMonth()]} ${current.getFullYear()}`;
    }
    if (view === "week") {
      const mon = startOfWeek(current);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      if (mon.getMonth() === sun.getMonth())
        return `${mon.getDate()} – ${sun.getDate()} ${MONTHS_ES[mon.getMonth()]} ${mon.getFullYear()}`;
      return `${mon.getDate()} ${MONTHS_ES[mon.getMonth()]} – ${sun.getDate()} ${MONTHS_ES[sun.getMonth()]} ${mon.getFullYear()}`;
    }
    return `${MONTHS_ES[current.getMonth()]} ${current.getFullYear()}`;
  };

  const handleCreateCalendar = () => {
    const newCal = { id: `cal-${Date.now()}`, name: "Nuevo Calendario" };
    setCalendars(prev => [...prev, newCal]);
    setSelectedCalendarId(newCal.id);
    setDropdownOpen(false);
    setShowConfig(true);
  };

  // Empty state — no calendars
  if (calendars.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <CalendarDays size={40} className="text-muted-foreground/20 mb-4" />
        <p className="text-sm font-medium mb-1">No hay calendarios creados</p>
        <p className="text-xs text-muted-foreground mb-5">Crea tu primer calendario para comenzar a recibir citas</p>
        <Button onClick={handleCreateCalendar} className="h-9 rounded-xl text-sm font-medium px-5 gap-2">
          <Plus size={16} /> Crear Calendario
        </Button>
      </div>
    );
  }

  // Config view
  if (showConfig) {
    return <CrmCalendarConfig onBack={() => setShowConfig(false)} />;
  }

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          {/* Calendar dropdown selector */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 text-xl font-semibold text-primary hover:text-primary/80 bg-primary/5 hover:bg-primary/10 px-4 py-2 rounded-xl border border-primary/20 transition-all"
            >
              <CalendarDays size={18} className="text-primary" />
              {selectedCalendar?.name ?? "Seleccionar calendario"}
              <ChevronDown size={16} className={`text-primary/60 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                <div className="absolute top-full left-0 mt-2 w-80 bg-popover border border-border/80 rounded-2xl shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-150">
                  <p className="px-4 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Tus calendarios</p>
                  {calendars.map(cal => (
                    <button
                      key={cal.id}
                      onClick={() => { setSelectedCalendarId(cal.id); setDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 transition-all ${
                        cal.id === selectedCalendarId
                          ? "bg-primary/10 text-primary font-semibold border-l-2 border-primary"
                          : "hover:bg-secondary/70 text-foreground"
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        cal.id === selectedCalendarId ? "bg-primary/20" : "bg-secondary"
                      }`}>
                        <CalendarDays size={13} className={cal.id === selectedCalendarId ? "text-primary" : "text-muted-foreground"} />
                      </div>
                      {cal.name}
                    </button>
                  ))}
                  <div className="border-t my-2 mx-3" />
                  <button
                    onClick={handleCreateCalendar}
                    className="w-full text-left px-4 py-3 text-sm flex items-center gap-3 text-primary font-medium hover:bg-primary/5 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Plus size={13} className="text-primary" />
                    </div>
                    Crear nuevo calendario
                  </button>
                </div>
              </>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-2">Gestión de citas agendadas</p>
        </div>

        {/* View toggle & Settings */}
        <div className="flex items-center gap-2">
          <div className="flex border rounded-xl overflow-hidden bg-card h-[38px] shadow-sm">
            {(["day", "week", "month"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-1 text-[11px] font-semibold transition-all ${
                  view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/20"
                }`}
              >
                {v === "day" ? "Diaria" : v === "week" ? "Semanal" : "Mensual"}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="rounded-xl h-[38px] w-[38px] bg-card shadow-sm border-border hover:bg-secondary text-muted-foreground hover:text-foreground"
            onClick={() => setShowConfig(true)}
            title="Configurar calendario"
          >
            <Settings size={16} />
          </Button>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="flex flex-col-reverse sm:flex-row items-start sm:items-center gap-4 py-2 border-b border-border/40 mb-2">
        <div className="flex items-center bg-secondary/40 border border-border/60 rounded-xl p-0.5">
          <button onClick={() => navigate(-1)} className="p-1 px-1.5 hover:bg-background rounded-lg transition-colors text-muted-foreground hover:text-foreground">
            <ChevronLeft size={16} />
          </button>
          <button 
            disabled={isToday}
            className={`text-xs px-3 transition-all h-7 rounded-lg mx-0.5 ${
              isToday 
                ? "text-muted-foreground/50 cursor-default font-medium" 
                : "bg-background shadow-sm text-foreground font-semibold border border-border/40 hover:bg-secondary hover:text-primary cursor-pointer"
            }`}
            onClick={() => setCurrent(new Date())}
            title={isToday ? "Ya estás viendo el día de hoy" : "Ir al día de hoy"}
          >
            Hoy
          </button>
          <button onClick={() => navigate(1)} className="p-1 px-1.5 hover:bg-background rounded-lg transition-colors text-muted-foreground hover:text-foreground">
            <ChevronRight size={16} />
          </button>
        </div>
        <h2 className="text-xl font-bold text-foreground min-w-[200px] select-none capitalize">
          {headerLabel()}
        </h2>
      </div>

      <div className={`${view !== "month" ? "grid lg:grid-cols-[1fr_300px] gap-6" : ""}`}>
        {/* Calendar view */}
        <div>
          {view === "day"   && <DayView   current={current} onSelect={setSelected} selected={selected} />}
          {view === "week"  && <WeekView  current={current} onSelect={setSelected} selected={selected} />}
          {view === "month" && <MonthView current={current} onSelect={setSelected} selected={selected} />}
        </div>

        {/* Detail panel — day & week only */}
        {view !== "month" && (
          <div className="bg-card border rounded-2xl p-5 h-fit">
            {detail ? (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center text-sm font-semibold">
                    {detail.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{detail.name}</p>
                    <Badge variant="outline" className={`text-[10px] mt-1 ${statusStyles[detail.status] || ""}`}>
                      {detail.status}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  {([
                    ["Email",    detail.email],
                    ["Teléfono", detail.phone],
                    ["Fecha",    detail.date],
                    ["Hora",     detail.time],
                    ["Servicio", detail.service],
                  ] as [string, string][]).map(([label, value]) => (
                    <div key={label}>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">{label}</p>
                      <p className="font-medium mt-0.5 text-sm">{value}</p>
                    </div>
                  ))}
                  {detail.notes && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">Notas</p>
                      <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{detail.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-10 text-center">
                <User size={22} className="text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Selecciona una cita para ver los detalles</p>
              </div>
            )}
          </div>
        )}

        {/* Detail panel — month view (below) */}
        {view === "month" && detail && (
          <div className="bg-card border rounded-2xl p-5 mt-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-sm font-semibold">
                {detail.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-sm">{detail.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <Clock size={11} /> {detail.date} · {detail.time}
                </p>
              </div>
              <Badge variant="outline" className={`text-[10px] ml-auto ${statusStyles[detail.status] || ""}`}>
                {detail.status}
              </Badge>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CrmCalendar;

