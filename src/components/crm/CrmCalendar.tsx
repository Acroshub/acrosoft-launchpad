import { useState, useMemo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, CalendarDays, Clock, User, Plus, Settings, ChevronDown, Pencil, Trash2, Coffee, Loader2, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import CrmCalendarConfig from "./CrmCalendarConfig";
import { useAppointments, useCreateAppointment, useUpdateAppointment, useDeleteAppointment, useBlockedSlots, useCreateBlockedSlot, useDeleteBlockedSlot, useContacts, useCalendars, useForms, useCreateForm, useUpdateCalendarConfig } from "@/hooks/useCrmData";
import type { CrmCalendarConfig as CalendarData } from "@/lib/supabase";
import type { WeeklySchedule } from "@/components/shared/WeeklySchedulePicker";
import { toast } from "sonner";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";

// Contacts, appointments, and blocked slots are now loaded from Supabase hooks
const today = new Date();
const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

type ViewMode = "day" | "week" | "month";

// ─── Blocked Slots ────────────────────────────────────────────
interface BlockedSlot {
  id: string;
  type: "hours" | "fullday" | "range";
  reason: string;
  date?: string;
  startHour?: number;
  endHour?: number;
  startDate?: string;
  endDate?: string;
}

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


// ─── Availability helpers ─────────────────────────────────────

const SCHEDULE_KEY = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const amPmToHour = (t: string): number => {
  const [timePart, period] = t.split(" ");
  const [h] = timePart.split(":").map(Number);
  if (period === "AM") return h === 12 ? 0 : h;
  return h === 12 ? 12 : h + 12;
};

const isHourAvailable = (avail: WeeklySchedule | null | undefined, dayOfWeek: number, hour: number): boolean => {
  if (!avail) return true;
  const dayKey = SCHEDULE_KEY[dayOfWeek];
  const day = avail[dayKey];
  if (!day || !day.open) return false;
  return day.slots.some((slot) => hour >= amPmToHour(slot.from) && hour < amPmToHour(slot.to));
};

// ─── Status styles ────────────────────────────────────────────

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

// ─── Slot Dialog (two-tab: Agendar / Reservar) ───────────────

interface SlotDialogProps {
  newAppt: { open: boolean; date: string; hour: number; contactId: string; notes: string; service: string } | null;
  contacts: any[];
  onClose: () => void;
  onChangeAppt: (patch: Partial<{ date: string; hour: number; contactId: string; notes: string; service: string }>) => void;
  onSaveAppt: () => Promise<void>;
  onSaveBlock: (payload: { type: "hours" | "fullday" | "range"; date: string; startHour: number; endHour: number; reason: string }) => Promise<void>;
  isSavingAppt: boolean;
  isSavingBlock: boolean;
}

const SlotDialog = ({ newAppt, contacts, onClose, onChangeAppt, onSaveAppt, onSaveBlock, isSavingAppt, isSavingBlock }: SlotDialogProps) => {
  const [slotTab, setSlotTab] = useState<"appt" | "block">("appt");
  const [blockType, setBlockType] = useState<"hours" | "fullday">("hours");
  const [blockReason, setBlockReason] = useState("");
  const [blockEndHour, setBlockEndHour] = useState((newAppt?.hour ?? 12) + 1);

  if (!newAppt) return null;

  const canSave = !!newAppt.contactId && !!newAppt.date && newAppt.hour >= 0;

  const handleSaveBlock = () =>
    onSaveBlock({ type: blockType, date: newAppt.date, startHour: newAppt.hour, endHour: blockEndHour, reason: blockReason });

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {slotTab === "appt" ? "Nueva cita" : "Reservar tiempo"}
        </DialogTitle>
        <DialogDescription>
          {slotTab === "appt"
            ? `${newAppt.date} · ${String(newAppt.hour).padStart(2, "0")}:00`
            : "Bloquea este horario. No se aceptarán citas en este espacio."}
        </DialogDescription>
      </DialogHeader>

      {/* Tab switcher */}
      <div className="flex border rounded-xl overflow-hidden h-9 -mt-1">
        <button
          onClick={() => setSlotTab("appt")}
          className={`flex-1 text-xs font-semibold transition-all ${slotTab === "appt" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary/50"}`}
        >
          Agendar cita
        </button>
        <button
          onClick={() => setSlotTab("block")}
          className={`flex-1 text-xs font-semibold border-l transition-all ${slotTab === "block" ? "bg-amber-500 text-white" : "text-muted-foreground hover:bg-secondary/50"}`}
        >
          Reservar tiempo
        </button>
      </div>

      {slotTab === "appt" ? (
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Contacto <span className="text-destructive">*</span></label>
            <div className="relative">
              <select
                value={newAppt.contactId}
                onChange={(e) => onChangeAppt({ contactId: e.target.value })}
                className="w-full h-9 rounded-lg border bg-background text-sm pl-3 pr-8 appearance-none focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Seleccionar contacto...</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} — {c.email ?? ""}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Fecha <span className="text-destructive">*</span></label>
              <Input type="date" value={newAppt.date} onChange={(e) => onChangeAppt({ date: e.target.value })} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Hora <span className="text-destructive">*</span></label>
              <div className="relative">
                <select
                  value={newAppt.hour}
                  onChange={(e) => onChangeAppt({ hour: Number(e.target.value) })}
                  className="w-full h-9 rounded-lg border bg-background text-sm pl-3 pr-8 appearance-none focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {HOURS.map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Notas <span className="text-xs font-normal">(opcional)</span></label>
            <textarea
              value={newAppt.notes}
              onChange={(e) => onChangeAppt({ notes: e.target.value })}
              placeholder="Motivo de la cita, instrucciones especiales..."
              rows={3}
              className="w-full rounded-lg border bg-background text-sm px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} className="h-9">Cancelar</Button>
            <Button disabled={!canSave || isSavingAppt} onClick={onSaveAppt} className="h-9">
              {isSavingAppt ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
              Agendar cita
            </Button>
          </DialogFooter>
        </div>
      ) : (
        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo de reserva</label>
            <div className="flex border rounded-xl overflow-hidden h-9">
              {(["hours", "fullday"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setBlockType(t)}
                  className={`flex-1 text-xs font-semibold transition-all ${
                    blockType === t ? "bg-amber-500 text-white" : "bg-card text-muted-foreground hover:bg-secondary/50"
                  } ${t !== "hours" ? "border-l" : ""}`}
                >
                  {t === "hours" ? "Horas" : "Día completo"}
                </button>
              ))}
            </div>
          </div>

          {blockType === "hours" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Fecha</label>
                <Input type="date" value={newAppt.date} onChange={(e) => onChangeAppt({ date: e.target.value })} className="h-9 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Desde</label>
                  <div className="relative">
                    <select value={newAppt.hour} onChange={(e) => onChangeAppt({ hour: Number(e.target.value) })} className="w-full h-9 rounded-lg border bg-background text-sm pl-3 pr-8 appearance-none focus:outline-none focus:ring-1 focus:ring-amber-400/50">
                      {HOURS.map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
                    </select>
                    <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Hasta</label>
                  <div className="relative">
                    <select value={blockEndHour} onChange={(e) => setBlockEndHour(Number(e.target.value))} className="w-full h-9 rounded-lg border bg-background text-sm pl-3 pr-8 appearance-none focus:outline-none focus:ring-1 focus:ring-amber-400/50">
                      {HOURS.map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
                    </select>
                    <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {blockType === "fullday" && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Fecha a bloquear</label>
              <Input type="date" value={newAppt.date} onChange={(e) => onChangeAppt({ date: e.target.value })} className="h-9 text-sm" />
            </div>
          )}

<div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Motivo <span className="text-xs font-normal">(opcional)</span></label>
            <Input value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="Ej: Reunión interna, vacaciones..." className="h-9 text-sm" />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} className="h-9">Cancelar</Button>
            <Button disabled={isSavingBlock} onClick={handleSaveBlock} className="h-9 bg-amber-500 hover:bg-amber-600 text-white">
              {isSavingBlock ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Coffee size={14} className="mr-1.5" />}
              Reservar tiempo
            </Button>
          </DialogFooter>
        </div>
      )}
    </>
  );
};

// ─── Sub-views ───────────────────────────────────────────────

const EmptySlot = () => (
  <div className="py-10 text-center">
    <CalendarDays size={22} className="text-muted-foreground/20 mx-auto mb-2" />
    <p className="text-xs text-muted-foreground">Sin citas agendadas</p>
  </div>
);

// DAY VIEW
const DayView = ({
  current, onSelect, selected, onSlotClick, blocked, appointments, availability,
}: { current: Date; onSelect: (id: string) => void; selected: string | null; onSlotClick: (date: string, hour: number) => void; blocked: BlockedSlot[]; appointments: any[]; availability?: WeeklySchedule | null }) => {
  const key = dateKey(current);
  const dayAppts = appointments.filter((a) => a.date === key);
  const dow = current.getDay();

  return (
    <div className="bg-card border rounded-2xl overflow-hidden">
      <div className="divide-y">
        {HOURS.map((hour) => {
          const appt = dayAppts.find((a) => a.hour === hour);
          const blk = isHourBlocked(blocked, key, hour);
          const unavailable = !appt && !blk && !isHourAvailable(availability, dow, hour);
          return (
            <div key={hour} className={`flex gap-4 px-5 py-3 min-h-[56px] ${unavailable ? "bg-muted/70" : ""}`}>
              <span className={`text-xs w-12 shrink-0 pt-0.5 font-mono ${unavailable ? "text-muted-foreground/30" : "text-muted-foreground/60"}`}>
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
              ) : unavailable ? (
                <div className="flex-1" />
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
  current, onSelect, selected, onSlotClick, blocked, appointments, availability,
}: { current: Date; onSelect: (id: string) => void; selected: string | null; onSlotClick: (date: string, hour: number) => void; blocked: BlockedSlot[]; appointments: any[]; availability?: WeeklySchedule | null }) => {
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
              className={`flex-1 min-w-[90px] px-2 py-3 text-center border-r last:border-r-0 ${dayBlk ? "bg-amber-100/60 dark:bg-amber-900/30" : isToday ? "bg-primary/10" : ""}`}
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
              const unavailable = !appt && !blk && !isHourAvailable(availability, day.getDay(), hour);
              return (
                <div
                  key={key}
                  onClick={() => { if (!appt && !blk && !unavailable) onSlotClick(key, hour); }}
                  className={`flex-1 min-w-[90px] border-r last:border-r-0 px-1.5 py-1 group ${
                    blk ? "bg-amber-100 dark:bg-amber-900/40"
                    : unavailable ? "bg-muted/70"
                    : isToday ? "bg-primary/10" : ""
                  } ${!appt && !blk && !unavailable ? "hover:bg-primary/5 cursor-pointer" : ""}`}
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
                  ) : unavailable ? null : (
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
  current, onSelect, selected, blocked, appointments,
}: { current: Date; onSelect: (id: string) => void; selected: string | null; blocked: BlockedSlot[]; appointments: any[] }) => {
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
              dayBlk ? "bg-amber-100 dark:bg-amber-900/40" : isToday ? "bg-primary/10" : ""
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
  // ─── Supabase hooks ───
  const { data: calendars = [], isLoading: loadingConfig } = useCalendars();
  const { data: forms = [], isLoading: loadingForms } = useForms();
  const createForm    = useCreateForm();
  const updateConfig  = useUpdateCalendarConfig();
  const { data: rawAppointments = [], isLoading: loadingAppts } = useAppointments();
  const { data: rawBlocked = [], isLoading: loadingBlocked } = useBlockedSlots();
  const { data: contacts = [] } = useContacts();
  const createAppointment = useCreateAppointment();
  const updateAppointment = useUpdateAppointment();
  const deleteAppointment = useDeleteAppointment();
  const createBlockedSlot = useCreateBlockedSlot();
  const deleteBlockedSlotMut = useDeleteBlockedSlot();

  // Map raw appointments to the shape the view components expect
  const appointments = useMemo(() => rawAppointments.map(a => {
    const contact = contacts.find(c => c.id === a.contact_id);
    return {
      id: a.id,
      name: contact?.name ?? "Sin contacto",
      email: contact?.email ?? "",
      phone: contact?.phone ?? "",
      date: a.date,
      time: `${String(a.hour).padStart(2, "0")}:00`,
      hour: a.hour,
      service: a.service ?? "",
      status: a.status === "confirmed" ? "Confirmada" : "Cancelada",
      notes: a.notes ?? "",
      rawStatus: a.status,
      contact_id: a.contact_id ?? null,
    };
  }), [rawAppointments, contacts]);

  // Map raw blocked slots to the local BlockedSlot shape
  const blockedSlots: BlockedSlot[] = useMemo(() => rawBlocked.map(b => ({
    id: b.id,
    type: b.type,
    reason: b.reason ?? "",
    date: b.date ?? undefined,
    startHour: b.start_hour ?? undefined,
    endHour: b.end_hour ?? undefined,
    startDate: b.range_start ?? undefined,
    endDate: b.range_end ?? undefined,
  })), [rawBlocked]);

  const [view, setView] = useState<ViewMode>(() =>
    (localStorage.getItem("crm_calendar_view") as ViewMode | null) ?? "week"
  );
  const handleSetView = useCallback((v: ViewMode) => {
    setView(v);
    localStorage.setItem("crm_calendar_view", v);
  }, []);
  const [current, setCurrent] = useState(new Date());
  const [selected, setSelected] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen]   = useState(false);
  const [editingApptId, setEditingApptId] = useState<string | null>(null);
  const [editDate, setEditDate]           = useState("");
  const [editHour, setEditHour]           = useState(10);
  const [deleteApptTarget, setDeleteApptTarget] = useState<{ id: string; name: string } | null>(null);

  // New appointment modal
  const [newAppt, setNewAppt] = useState<{ open: boolean; date: string; hour: number; contactId: string; notes: string; service: string } | null>(null);

  const openNewAppt = (date: string, hour: number) =>
    setNewAppt({ open: true, date, hour, contactId: "", notes: "", service: "" });

  const closeNewAppt = () => setNewAppt(null);

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

  const saveBlock = async () => {
    if (!blockModal) return;
    try {
      await createBlockedSlot.mutateAsync({
        type: blockModal.type,
        reason: blockModal.reason || null,
        date: blockModal.type !== "range" ? blockModal.date : null,
        start_hour: blockModal.type === "hours" ? blockModal.startHour : null,
        end_hour: blockModal.type === "hours" ? blockModal.endHour : null,
        range_start: blockModal.type === "range" ? blockModal.startDate : null,
        range_end: blockModal.type === "range" ? blockModal.endDate : null,
      });
      toast.success("Tiempo reservado");
      closeBlockModal();
    } catch {
      toast.error("Error al reservar tiempo");
    }
  };

  // Which calendar is selected in the dropdown
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null);
  // null = new calendar form; CalendarData = edit form; undefined = not in config mode
  const [editingCalendar, setEditingCalendar] = useState<CalendarData | null | undefined>(undefined);

  const selectedCalendar = calendars.find((c) => c.id === selectedCalendarId) ?? calendars[0] ?? null;
  const availability = selectedCalendar?.availability as WeeklySchedule | null | undefined;
  const detail = appointments.find((a) => a.id === selected);

  const isLoading = loadingConfig || loadingForms || loadingAppts || loadingBlocked;

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

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Config / create view
  if (editingCalendar !== undefined) {
    return (
      <CrmCalendarConfig
        existingCalendar={editingCalendar}
        onBack={() => setEditingCalendar(undefined)}
      />
    );
  }

  // No calendar yet — force creation
  if (calendars.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <CalendarDays size={40} className="text-muted-foreground/20 mb-4" />
        <p className="text-sm font-medium mb-1">No hay ningún calendario configurado</p>
        <p className="text-xs text-muted-foreground mb-5">
          Crea y vincula un calendario a un formulario para comenzar a recibir citas
        </p>
        <Button onClick={() => setEditingCalendar(null)} className="h-9 rounded-xl text-sm font-medium px-5 gap-2">
          <Plus size={16} /> Crear Calendario
        </Button>
      </div>
    );
  }

  // Selected calendar exists but its linked form was deleted — block and offer recovery
  const linkedFormExists = selectedCalendar?.linked_form_id
    ? forms.some((f) => f.id === selectedCalendar.linked_form_id)
    : false;

  if (selectedCalendar && !linkedFormExists) {
    const BASIC_FORM_NAME = "Formulario Básico de Calendario";

    const handleLinkExisting = async (formId: string) => {
      try {
        await updateConfig.mutateAsync({ id: selectedCalendar.id, linked_form_id: formId });
        toast.success("Formulario vinculado correctamente");
      } catch {
        toast.error("Error al vincular formulario");
      }
    };

    const handleCreateBasic = async () => {
      try {
        const existing = forms.find((f) => f.name === BASIC_FORM_NAME);
        const form = existing ?? await createForm.mutateAsync({
          name: BASIC_FORM_NAME,
          fields: [
            { id: "field_name",  type: "text",  label: "Nombre",             required: true },
            { id: "field_email", type: "email", label: "Correo electrónico", required: true },
          ],
          submit_label: "Confirmar reserva",
          success_action: "popup",
          success_message: "¡Tu cita ha sido agendada!",
          success_image: "icon",
          redirect_url: null,
          slug: null,
        });
        await updateConfig.mutateAsync({ id: selectedCalendar.id, linked_form_id: form.id });
        toast.success("Formulario básico vinculado");
      } catch {
        toast.error("Error al crear el formulario");
      }
    };

    const isBusy = createForm.isPending || updateConfig.isPending;

    return (
      <div className="flex flex-col items-center justify-center py-24 max-w-md mx-auto text-center gap-5">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <ClipboardList size={22} className="text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <p className="text-sm font-semibold mb-1">El formulario vinculado fue eliminado</p>
          <p className="text-xs text-muted-foreground">
            Este calendario no puede recibir citas sin un formulario. Vincula uno existente o crea un formulario básico.
          </p>
        </div>

        {forms.length > 0 && (
          <div className="w-full space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-left">
              Vincular formulario existente
            </p>
            <div className="border rounded-xl overflow-hidden divide-y">
              {forms.map((f) => (
                <button
                  key={f.id}
                  onClick={() => handleLinkExisting(f.id)}
                  disabled={isBusy}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-secondary transition-colors flex items-center justify-between gap-3 disabled:opacity-50"
                >
                  <span>{f.name}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">Seleccionar →</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <Button
          onClick={handleCreateBasic}
          disabled={isBusy}
          variant="outline"
          className="w-full rounded-xl h-10 gap-2"
        >
          {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Crear formulario básico
        </Button>
      </div>
    );
  }

  const handleConfirmDeleteAppt = async () => {
    if (!deleteApptTarget) return;
    try {
      await deleteAppointment.mutateAsync({ id: deleteApptTarget.id, name: deleteApptTarget.name });
      toast.success("Cita eliminada");
      setSelected(null);
    } catch {
      toast.error("Error al eliminar");
    } finally {
      setDeleteApptTarget(null);
    }
  };

  return (
    <>
    <DeleteConfirmDialog
      open={!!deleteApptTarget}
      onOpenChange={(open) => { if (!open) setDeleteApptTarget(null); }}
      onConfirm={handleConfirmDeleteAppt}
      isPending={deleteAppointment.isPending}
      description="Se eliminará la cita permanentemente."
    />
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
                  {calendars.map((cal) => {
                    const isActive = cal.id === (selectedCalendar?.id);
                    return (
                      <button
                        key={cal.id}
                        onClick={() => { setSelectedCalendarId(cal.id); setDropdownOpen(false); }}
                        className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 transition-all ${
                          isActive ? "bg-primary/10 text-primary font-semibold border-l-2 border-primary" : "hover:bg-secondary/90 text-foreground"
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isActive ? "bg-primary/20" : "bg-secondary"}`}>
                          <CalendarDays size={13} className={isActive ? "text-primary" : "text-muted-foreground"} />
                        </div>
                        {cal.name ?? "Sin nombre"}
                      </button>
                    );
                  })}
                  <div className="border-t my-2 mx-3" />
                  <button
                    onClick={() => { setDropdownOpen(false); setEditingCalendar(null); }}
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
                onClick={() => handleSetView(v)}
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
            onClick={() => setEditingCalendar(selectedCalendar)}
            title="Configurar calendario"
          >
            <Settings size={16} />
          </Button>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="flex flex-col-reverse sm:flex-row items-start sm:items-center gap-4 py-2 border-b border-border/40 mb-2">
        <div className="flex items-center bg-secondary/90 border border-border/60 rounded-xl p-0.5">
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
          {view === "day"   && <DayView   current={current} onSelect={setSelected} selected={selected} onSlotClick={openNewAppt} blocked={blockedSlots} appointments={appointments} availability={availability} />}
          {view === "week"  && <WeekView  current={current} onSelect={setSelected} selected={selected} onSlotClick={openNewAppt} blocked={blockedSlots} appointments={appointments} availability={availability} />}
          {view === "month" && <MonthView current={current} onSelect={setSelected} selected={selected} blocked={blockedSlots} appointments={appointments} />}
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
                        value={detail.status} 
                        onChange={async (e) => {
                          const newStatus = e.target.value === "Cancelada" ? "cancelled" : "confirmed";
                          try {
                            await updateAppointment.mutateAsync({ id: detail.id, status: newStatus });
                            toast.success("Estado actualizado");
                          } catch { toast.error("Error al actualizar"); }
                        }}
                        className={`text-[10px] appearance-none bg-background border px-2.5 py-0.5 rounded-full pr-6 cursor-pointer hover:bg-secondary/20 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 ${statusStyles[detail.status] || ""}`}
                      >
                        <option value="Confirmada">Confirmada</option>
                        <option value="Cancelada">Cancelada</option>
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
                    <button
                      onClick={() => setDeleteApptTarget({ id: detail.id, name: `Cita con ${detail.name} el ${detail.date}` })}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Borrar cita">
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
                  ] as [string, string][]).filter(([, v]) => !!v).map(([label, value]) => (
                    <div key={label}>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">{label}</p>
                      <p className="font-medium mt-0.5 text-sm">{value}</p>
                    </div>
                  ))}
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
                    value={detail.status} 
                    onChange={async (e) => {
                      const newStatus = e.target.value === "Cancelada" ? "cancelled" : "confirmed";
                      try {
                        await updateAppointment.mutateAsync({ id: detail.id, status: newStatus });
                        toast.success("Estado actualizado");
                      } catch { toast.error("Error al actualizar"); }
                    }}
                    className={`text-[10px] appearance-none bg-background border px-2 py-0.5 rounded-full pr-5 cursor-pointer hover:bg-secondary/20 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 ${statusStyles[detail.status] || ""}`}
                  >
                    <option value="Confirmada">Confirmada</option>
                    <option value="Cancelada">Cancelada</option>
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
                  <button
                    onClick={() => setDeleteApptTarget({ id: detail.id, name: `Cita con ${detail.name} el ${detail.date}` })}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Borrar cita">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── New Appointment / Block Time Modal ─── */}
      <Dialog open={!!newAppt?.open} onOpenChange={(open) => !open && closeNewAppt()}>
        <DialogContent className="sm:max-w-[440px]">
          <SlotDialog
            newAppt={newAppt}
            contacts={contacts}
            onClose={closeNewAppt}
            onChangeAppt={(patch) => setNewAppt((p) => p && ({ ...p, ...patch }))}
            onSaveAppt={async () => {
              if (!newAppt) return;
              try {
                await createAppointment.mutateAsync({
                  contact_id: newAppt.contactId || null,
                  date: newAppt.date,
                  hour: newAppt.hour,
                  service: newAppt.service || null,
                  notes: newAppt.notes || null,
                  status: "confirmed",
                });
                toast.success("Cita agendada");
                closeNewAppt();
              } catch {
                toast.error("Error al agendar cita");
              }
            }}
            onSaveBlock={async ({ type, date, startHour, endHour, reason }) => {
              try {
                await createBlockedSlot.mutateAsync({
                  type,
                  reason: reason || null,
                  date: type !== "range" ? date : null,
                  start_hour: type === "hours" ? startHour : null,
                  end_hour: type === "hours" ? endHour : null,
                  range_start: type === "range" ? date : null,
                  range_end: type === "range" ? date : null,
                });
                toast.success("Tiempo reservado");
                closeNewAppt();
              } catch {
                toast.error("Error al reservar tiempo");
              }
            }}
            isSavingAppt={createAppointment.isPending}
            isSavingBlock={createBlockedSlot.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingApptId} onOpenChange={(open) => {
        if (!open) setEditingApptId(null);
        else {
          const appt = appointments.find(a => a.id === editingApptId);
          if (appt) { setEditDate(appt.date); setEditHour(appt.hour); }
        }
      }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Editar Cita</DialogTitle>
            <DialogDescription>
              Modifica la fecha u hora agendada para {appointments.find(a => a.id === editingApptId)?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="edit-date" className="text-right text-sm font-medium">Fecha</label>
              <Input 
                id="edit-date" 
                type="date" 
                value={editDate || appointments.find(a => a.id === editingApptId)?.date || ""}
                onChange={(e) => setEditDate(e.target.value)}
                className="col-span-3 h-9 text-sm" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="edit-hour" className="text-right text-sm font-medium">Hora</label>
              <div className="col-span-3 relative">
                <select
                  value={editHour || appointments.find(a => a.id === editingApptId)?.hour || 10}
                  onChange={(e) => setEditHour(Number(e.target.value))}
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingApptId(null)} className="h-9">Cancelar</Button>
            <Button 
              disabled={updateAppointment.isPending}
              onClick={async () => {
                if (!editingApptId) return;
                try {
                  await updateAppointment.mutateAsync({
                    id: editingApptId,
                    date: editDate,
                    hour: editHour,
                  });
                  toast.success("Cita actualizada");
                  setEditingApptId(null);
                } catch {
                  toast.error("Error al actualizar");
                }
              }} 
              className="h-9"
            >
              {updateAppointment.isPending ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
              Guardar cambios
            </Button>
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
    </>
  );
};

export default CrmCalendar;

