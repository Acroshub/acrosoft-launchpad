import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, CalendarDays, Clock, User, Plus, Settings, ChevronDown, Pencil, Trash2, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import CrmCalendarConfig from "./CrmCalendarConfig";

// {VAR_DB} — contactos reales vendrán de Supabase
const existingContacts = [
  { id: "c-1", name: "{VAR_DB}", email: "{VAR_DB}" },
  { id: "c-2", name: "{VAR_DB}", email: "{VAR_DB}" },
];

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

// ─── Blocked Slots ────────────────────────────────────────────
interface BlockedSlot {
  id: string;
  type: "hours" | "fullday" | "range";
  reason: string;
  // For type "hours": single date + start/end hour
  date?: string;
  startHour?: number;
  endHour?: number;
  // For type "range": start date to end date (full days)
  startDate?: string;
  endDate?: string;
}

// {VAR_DB} — bloqueos reales vendrán de Supabase
const initialBlocked: BlockedSlot[] = [
  { id: "blk-1", type: "hours", reason: "Almuerzo", date: todayKey, startHour: 12, endHour: 13 },
];

function isHourBlocked(blocked: BlockedSlot[], dayKey: string, hour: number): BlockedSlot | undefined {
  return blocked.find(b => {
    if (b.type === "hours" && b.date === dayKey && b.startHour !== undefined && b.endHour !== undefined) {
      return hour >= b.startHour && hour < b.endHour;
    }
    if (b.type === "fullday" && b.date === dayKey) return true;
    if (b.type === "range" && b.startDate && b.endDate) {
      return dayKey >= b.startDate && dayKey <= b.endDate;
    }
    return false;
  });
}

function isDayBlocked(blocked: BlockedSlot[], dayKey: string): BlockedSlot | undefined {
  return blocked.find(b => {
    if (b.type === "fullday" && b.date === dayKey) return true;
    if (b.type === "range" && b.startDate && b.endDate) {
      return dayKey >= b.startDate && dayKey <= b.endDate;
    }
    return false;
  });
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
  current, onSelect, selected, onSlotClick, blocked,
}: { current: Date; onSelect: (id: string) => void; selected: string | null; onSlotClick: (date: string, hour: number) => void; blocked: BlockedSlot[] }) => {
  const key = dateKey(current);
  const dayAppts = appointments.filter((a) => a.date === key);

  return (
    <div className="bg-card border rounded-2xl overflow-hidden">
      <div className="divide-y">
        {HOURS.map((hour) => {
          const appt = dayAppts.find((a) => a.hour === hour);
          const blk = isHourBlocked(blocked, key, hour);
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
              ) : blk ? (
                <div className="flex-1 rounded-xl px-3 py-2 bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 flex items-center gap-2 text-xs">
                  <Coffee size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
                  <span className="font-semibold">{blk.reason || "Reservado"}</span>
                </div>
              ) : (
                <button
                  onClick={() => onSlotClick(key, hour)}
                  className="flex-1 border-b border-dashed border-border/30 hover:bg-primary/5 hover:border-primary/30 rounded transition-all group"
                >
                  <Plus size={12} className="text-primary/0 group-hover:text-primary/40 transition-all mx-auto" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// WEEK VIEW
const WeekView = ({
  current, onSelect, selected, onSlotClick, blocked,
}: { current: Date; onSelect: (id: string) => void; selected: string | null; onSlotClick: (date: string, hour: number) => void; blocked: BlockedSlot[] }) => {
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
          const dayBlk = isDayBlocked(blocked, dateKey(day));
          return (
            <div
              key={day.toISOString()}
              className={`flex-1 min-w-[90px] px-2 py-3 text-center border-r last:border-r-0 ${dayBlk ? "bg-amber-100/60 dark:bg-amber-900/30" : isToday ? "bg-primary/5" : ""}`}
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
              const blk = isHourBlocked(blocked, key, hour);
              const isToday = sameDay(day, new Date());
              return (
                <div
                  key={key}
                  onClick={() => { if (!appt && !blk) onSlotClick(key, hour); }}
                  className={`flex-1 min-w-[90px] border-r last:border-r-0 px-1.5 py-1 group ${
                    blk ? "bg-amber-100 dark:bg-amber-900/40" : isToday ? "bg-primary/5" : ""
                  } ${!appt && !blk ? "hover:bg-primary/5 cursor-pointer" : ""}`}
                >
                  {appt ? (
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
                   ) : blk ? (
                    <div className="w-full h-full flex items-center justify-center text-amber-600 dark:text-amber-400">
                      <Coffee size={12} />
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus size={12} className="text-primary/50" />
                    </div>
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
  current, onSelect, selected, blocked,
}: { current: Date; onSelect: (id: string) => void; selected: string | null; blocked: BlockedSlot[] }) => {
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
          const dayBlk = isDayBlocked(blocked, key);

          return (
            <div key={key} className={`min-h-[90px] p-2 border-r border-b last:border-r-0 ${
              dayBlk ? "bg-amber-100 dark:bg-amber-900/40" : isToday ? "bg-primary/5" : ""
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <p className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                  isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                }`}>
                  {day.getDate()}
                </p>
                {dayBlk && <Coffee size={12} className="text-amber-500 dark:text-amber-400" />}
              </div>
              <div className="space-y-1">
                {dayBlk && (
                  <div className="w-full rounded px-1.5 py-1 text-[9px] bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 border border-amber-200/40 dark:border-amber-800/60 flex items-center justify-center gap-1.5 truncate">
                    <Coffee size={10} className="shrink-0 text-amber-600 dark:text-amber-400" />
                    <span className="truncate">{dayBlk.reason || "Reservado"}</span>
                  </div>
                )}
                {dayAppts.slice(0, dayBlk ? 2 : 3).map((a) => (
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
                {dayAppts.length > (dayBlk ? 2 : 3) && (
                  <p className="text-[10px] text-muted-foreground px-1">+{dayAppts.length - (dayBlk ? 2 : 3)} más</p>
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
  const [showConfig, setShowConfig]       = useState(false);
  const [dropdownOpen, setDropdownOpen]   = useState(false);
  const [editingApptId, setEditingApptId] = useState<string | null>(null);

  // New appointment modal
  const [newAppt, setNewAppt] = useState<{ open: boolean; date: string; hour: number; contactId: string; notes: string } | null>(null);

  const openNewAppt = (date: string, hour: number) =>
    setNewAppt({ open: true, date, hour, contactId: "", notes: "" });

  const closeNewAppt = () => setNewAppt(null);

  // Blocked slots
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>(initialBlocked);
  const [blockModal, setBlockModal] = useState<{
    open: boolean;
    type: "hours" | "fullday" | "range";
    date: string;
    startHour: number;
    endHour: number;
    startDate: string;
    endDate: string;
    reason: string;
  } | null>(null);

  const openBlockModal = () => setBlockModal({
    open: true, type: "hours",
    date: dateKey(current), startHour: 12, endHour: 14,
    startDate: dateKey(current), endDate: dateKey(current),
    reason: "",
  });

  const closeBlockModal = () => setBlockModal(null);

  const saveBlock = () => {
    if (!blockModal) return;
    const newBlock: BlockedSlot = {
      id: `blk-${Date.now()}`,
      type: blockModal.type,
      reason: blockModal.reason,
      ...(blockModal.type === "hours" ? { date: blockModal.date, startHour: blockModal.startHour, endHour: blockModal.endHour } : {}),
      ...(blockModal.type === "fullday" ? { date: blockModal.date } : {}),
      ...(blockModal.type === "range" ? { startDate: blockModal.startDate, endDate: blockModal.endDate } : {}),
    };
    setBlockedSlots(prev => [...prev, newBlock]);
    closeBlockModal();
  };

  const canSaveAppt = newAppt && newAppt.contactId && newAppt.date && newAppt.hour >= 0;

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
          <Button
            variant="outline"
            onClick={openBlockModal}
            className="h-[38px] rounded-xl text-xs font-semibold px-4 gap-2 text-amber-700 dark:text-amber-400 hover:text-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/20 border-amber-300 dark:border-amber-700/40"
          >
            <Coffee size={14} /> Reservar tiempo
          </Button>
          <Button
            onClick={() => openNewAppt(dateKey(current), 10)}
            className="h-[38px] rounded-xl text-xs font-semibold px-4 gap-2"
          >
            <Plus size={14} /> Nueva cita
          </Button>
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
          {view === "day"   && <DayView   current={current} onSelect={setSelected} selected={selected} onSlotClick={openNewAppt} blocked={blockedSlots} />}
          {view === "week"  && <WeekView  current={current} onSelect={setSelected} selected={selected} onSlotClick={openNewAppt} blocked={blockedSlots} />}
          {view === "month" && <MonthView current={current} onSelect={setSelected} selected={selected} blocked={blockedSlots} />}
        </div>

        {/* Detail panel — day & week only */}
        {view !== "month" && (
          <div className="bg-card border rounded-2xl p-5 h-fit">
            {detail ? (
              <div className="space-y-5">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center text-sm font-semibold shrink-0">
                    {detail.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{detail.name}</p>
                    <div className="relative mt-1 inline-block">
                      <select 
                        defaultValue={detail.status} 
                        className={`text-[10px] appearance-none bg-background border px-2.5 py-0.5 rounded-full pr-6 cursor-pointer hover:bg-secondary/20 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 ${statusStyles[detail.status] || ""}`}
                      >
                        <option value="Confirmada">Confirmada</option>
                        <option value="Cancelada">Cancelada</option>
                        <option value="Pendiente">Pendiente</option>
                      </select>
                      <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 mt-0.5 shrink-0">
                    <button 
                      onClick={() => setEditingApptId(detail.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" 
                      title="Editar cita (fecha y hora)"
                    >
                      <Pencil size={14} />
                    </button>
                    <button className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Borrar cita">
                      <Trash2 size={14} />
                    </button>
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
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-sm font-semibold shrink-0">
                  {detail.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{detail.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 truncate">
                    <Clock size={11} className="shrink-0" /> {detail.date} · {detail.time}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 shrink-0 ml-4 max-sm:gap-1.5">
                <div className="relative inline-block max-sm:hidden">
                  <select 
                    defaultValue={detail.status} 
                    className={`text-[10px] appearance-none bg-background border px-2 py-0.5 rounded-full pr-5 cursor-pointer hover:bg-secondary/20 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 ${statusStyles[detail.status] || ""}`}
                  >
                    <option value="Confirmada">Confirmada</option>
                    <option value="Cancelada">Cancelada</option>
                    <option value="Pendiente">Pendiente</option>
                  </select>
                  <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                </div>
                <div className="flex items-center gap-1 sm:border-l sm:pl-3 border-border/40">
                  <button 
                    onClick={() => setEditingApptId(detail.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" 
                    title="Editar cita (fecha y hora)"
                  >
                    <Pencil size={13} />
                  </button>
                  <button className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Borrar cita">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── New Appointment Modal ─── */}
      <Dialog open={!!newAppt?.open} onOpenChange={(open) => !open && closeNewAppt()}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Nueva cita</DialogTitle>
            <DialogDescription>Completa los datos obligatorios para agendar la cita.</DialogDescription>
          </DialogHeader>

          {newAppt && (
            <div className="space-y-4 py-2">
              {/* Contacto */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Contacto <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <select
                    value={newAppt.contactId}
                    onChange={(e) => setNewAppt((p) => p && ({ ...p, contactId: e.target.value }))}
                    className="w-full h-9 rounded-lg border bg-background text-sm pl-3 pr-8 appearance-none focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Seleccionar contacto...</option>
                    {existingContacts.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} — {c.email}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Fecha y Hora */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    Fecha <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="date"
                    value={newAppt.date}
                    onChange={(e) => setNewAppt((p) => p && ({ ...p, date: e.target.value }))}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    Hora <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={newAppt.hour}
                      onChange={(e) => setNewAppt((p) => p && ({ ...p, hour: Number(e.target.value) }))}
                      className="w-full h-9 rounded-lg border bg-background text-sm pl-3 pr-8 appearance-none focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {HOURS.map((h) => (
                        <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Notas */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Notas <span className="text-xs font-normal">(opcional)</span></label>
                <textarea
                  value={newAppt.notes}
                  onChange={(e) => setNewAppt((p) => p && ({ ...p, notes: e.target.value }))}
                  placeholder="Motivo de la cita, instrucciones especiales..."
                  rows={3}
                  className="w-full rounded-lg border bg-background text-sm px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeNewAppt} className="h-9">Cancelar</Button>
            <Button
              disabled={!canSaveAppt}
              onClick={() => {
                // {VAR_DB} — guardar en Supabase
                closeNewAppt();
              }}
              className="h-9"
            >
              Agendar cita
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingApptId} onOpenChange={(open) => !open && setEditingApptId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Editar Cita</DialogTitle>
            <DialogDescription>
              Modifica la fecha u hora agendada para {appointments.find(a => a.id === editingApptId)?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="date" className="text-right text-sm font-medium">Fecha</label>
              <Input 
                id="date" 
                type="date" 
                defaultValue={appointments.find(a => a.id === editingApptId)?.date} 
                className="col-span-3 h-9 text-sm" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="time" className="text-right text-sm font-medium">Hora</label>
              <Input 
                id="time" 
                type="time" 
                defaultValue={appointments.find(a => a.id === editingApptId)?.time} 
                className="col-span-3 h-9 text-sm" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingApptId(null)} className="h-9">Cancelar</Button>
            <Button onClick={() => setEditingApptId(null)} className="h-9">Guardar cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Block Time Modal ─── */}
      <Dialog open={!!blockModal?.open} onOpenChange={(open) => !open && closeBlockModal()}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Coffee size={18} /> Reservar tiempo personal
            </DialogTitle>
            <DialogDescription>Reserva un espacio para ti. El calendario no aceptará citas en ese horario, sin modificar tu disponibilidad general.</DialogDescription>
          </DialogHeader>

          {blockModal && (
            <div className="space-y-5 py-2">
              {/* Block type selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo de reserva</label>
                <div className="flex border rounded-xl overflow-hidden h-10">
                  {(["hours", "fullday", "range"] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setBlockModal(prev => prev && ({ ...prev, type: t }))}
                      className={`flex-1 text-xs font-semibold transition-all ${
                        blockModal.type === t ? "bg-amber-500 text-white" : "bg-card text-muted-foreground hover:bg-secondary/50"
                      } ${t !== "hours" ? "border-l" : ""}`}
                    >
                      {t === "hours" ? "Horas específicas" : t === "fullday" ? "Día completo" : "Rango de días"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hours mode */}
              {blockModal.type === "hours" && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Fecha</label>
                    <Input
                      type="date"
                      value={blockModal.date}
                      onChange={e => setBlockModal(prev => prev && ({ ...prev, date: e.target.value }))}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Desde</label>
                      <div className="relative">
                        <select
                          value={blockModal.startHour}
                          onChange={e => setBlockModal(prev => prev && ({ ...prev, startHour: Number(e.target.value) }))}
                          className="w-full h-9 rounded-lg border bg-background text-sm pl-3 pr-8 appearance-none focus:outline-none focus:ring-1 focus:ring-amber-400/50"
                        >
                          {HOURS.map(h => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
                        </select>
                        <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Hasta</label>
                      <div className="relative">
                        <select
                          value={blockModal.endHour}
                          onChange={e => setBlockModal(prev => prev && ({ ...prev, endHour: Number(e.target.value) }))}
                          className="w-full h-9 rounded-lg border bg-background text-sm pl-3 pr-8 appearance-none focus:outline-none focus:ring-1 focus:ring-amber-400/50"
                        >
                          {HOURS.map(h => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
                        </select>
                        <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Full day mode */}
              {blockModal.type === "fullday" && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Fecha a bloquear</label>
                  <Input
                    type="date"
                    value={blockModal.date}
                    onChange={e => setBlockModal(prev => prev && ({ ...prev, date: e.target.value }))}
                    className="h-9 text-sm"
                  />
                </div>
              )}

              {/* Date range mode */}
              {blockModal.type === "range" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Desde</label>
                    <Input
                      type="date"
                      value={blockModal.startDate}
                      onChange={e => setBlockModal(prev => prev && ({ ...prev, startDate: e.target.value }))}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Hasta</label>
                    <Input
                      type="date"
                      value={blockModal.endDate}
                      onChange={e => setBlockModal(prev => prev && ({ ...prev, endDate: e.target.value }))}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Reason */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Motivo <span className="text-xs font-normal">(opcional)</span></label>
                <Input
                  value={blockModal.reason}
                  onChange={e => setBlockModal(prev => prev && ({ ...prev, reason: e.target.value }))}
                  placeholder="Ej: Vacaciones, cita personal, almuerzo..."
                  className="h-9 text-sm"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeBlockModal} className="h-9">Cancelar</Button>
            <Button
              onClick={saveBlock}
              className="h-9 bg-amber-500 hover:bg-amber-600 text-white"
            >
              <Coffee size={14} className="mr-1.5" /> Reservar tiempo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CrmCalendar;

