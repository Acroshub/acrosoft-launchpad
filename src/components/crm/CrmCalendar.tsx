import { useState, useMemo, useCallback, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, CalendarDays, Clock, User, Plus, Settings, ChevronDown, Pencil, Trash2, Coffee, Loader2, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import CrmCalendarConfig from "./CrmCalendarConfig";
import { useAppointments, useCreateAppointment, useUpdateAppointment, useDeleteAppointment, useBlockedSlots, useCreateBlockedSlot, useUpdateBlockedSlot, useDeleteBlockedSlot, useContacts, useCalendars, useForms, useCreateForm, useUpdateCalendarConfig } from "@/hooks/useCrmData";
import { useStaffPermissions } from "@/hooks/useAuth";
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
  startMinute?: number;
  endHour?: number;
  endMinute?: number;
  startDate?: string;
  endDate?: string;
}

function isHourBlocked(blocked: BlockedSlot[], dayKey: string, hour: number): BlockedSlot | undefined {
  return blocked.find(b => {
    if (b.type === "hours" && b.date === dayKey && b.startHour !== undefined && b.endHour !== undefined) {
      // Hour row is blocked if the block overlaps with [hour:00, hour+1:00)
      const hourStart  = hour * 60;
      const hourEnd    = (hour + 1) * 60;
      const startTotal = b.startHour * 60 + (b.startMinute ?? 0);
      const endTotal   = b.endHour   * 60 + (b.endMinute   ?? 0);
      return hourStart < endTotal && hourEnd > startTotal;
    }
    if (b.type === "fullday" && b.date === dayKey) return true;
    if (b.type === "range" && b.startDate && b.endDate) {
      return dayKey >= b.startDate && dayKey <= b.endDate;
    }
    return false;
  });
}

function formatBlockRange(b: BlockedSlot): string {
  if (b.type !== "hours" || b.startHour == null || b.endHour == null) return "";
  const sh = String(b.startHour).padStart(2, "0");
  const sm = String(b.startMinute ?? 0).padStart(2, "0");
  const eh = String(b.endHour).padStart(2, "0");
  const em = String(b.endMinute ?? 0).padStart(2, "0");
  return `${sh}:${sm}–${eh}:${em}`;
}

function isSlotBlockedAt(blocked: BlockedSlot[], dayKey: string, hour: number, minute: number): BlockedSlot | undefined {
  const slotStart = hour * 60 + minute;
  return blocked.find(b => {
    if (b.type === "hours" && b.date === dayKey && b.startHour !== undefined && b.endHour !== undefined) {
      const startTotal = b.startHour * 60 + (b.startMinute ?? 0);
      const endTotal   = b.endHour   * 60 + (b.endMinute   ?? 0);
      return slotStart >= startTotal && slotStart < endTotal;
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

const amPmToMinutes = (t: string): number => {
  const [timePart, period] = t.split(" ");
  const [h, m] = timePart.split(":").map(Number);
  const h24 = period === "AM" ? (h === 12 ? 0 : h) : (h === 12 ? 12 : h + 12);
  return h24 * 60 + (m || 0);
};

const isSlotAvailable = (avail: WeeklySchedule | null | undefined, dayOfWeek: number, hour: number, minute: number, duration = 0): boolean => {
  if (!avail) return true;
  const dayKey = SCHEDULE_KEY[dayOfWeek];
  const day = avail[dayKey];
  if (!day || !day.open) return false;
  const totalMin = hour * 60 + minute;
  return day.slots.some((slot) => totalMin >= amPmToMinutes(slot.from) && totalMin + duration <= amPmToMinutes(slot.to));
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
function availabilityHourRange(avail: WeeklySchedule | null | undefined): { min: number; max: number } {
  const DEFAULT = { min: 7, max: 20 };
  if (!avail) return DEFAULT;
  let min = 24, max = 0;
  for (const key of SCHEDULE_KEY) {
    const day = (avail as any)[key];
    if (!day?.open || !Array.isArray(day.slots)) continue;
    for (const slot of day.slots as { from: string; to: string }[]) {
      const fromMin = amPmToMinutes(slot.from);
      const toMin   = amPmToMinutes(slot.to);
      min = Math.min(min, Math.floor(fromMin / 60));
      max = Math.max(max, Math.ceil(toMin / 60));
    }
  }
  return min < max ? { min, max } : DEFAULT;
}

const buildSlots = (interval: number, avail?: WeeklySchedule | null): { hour: number; minute: number }[] => {
  const { min, max } = availabilityHourRange(avail);
  const slots: { hour: number; minute: number }[] = [];
  const step = interval > 0 ? interval : 60;
  for (let total = min * 60; total < max * 60; total += step) {
    slots.push({ hour: Math.floor(total / 60), minute: total % 60 });
  }
  return slots;
};

const minutesForInterval = (interval: number): number[] => {
  if (interval === 15) return [0, 15, 30, 45];
  if (interval === 30) return [0, 30];
  if (interval === 60) return [0];
  return [0, 15, 30, 45];
};

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
  newAppt: { open: boolean; date: string; hour: number; minute: number; contactId: string; notes: string; service: string } | null;
  contacts: any[];
  onClose: () => void;
  onChangeAppt: (patch: Partial<{ date: string; hour: number; minute: number; contactId: string; notes: string; service: string }>) => void;
  onSaveAppt: () => Promise<void>;
  onSaveBlock: (payload: { type: "hours" | "fullday" | "range"; date: string; startHour: number; startMinute: number; endHour: number; endMinute: number; reason: string }) => Promise<void>;
  isSavingAppt: boolean;
  isSavingBlock: boolean;
  apptMinuteOptions: number[];
  apptHourOptions: number[];
}

const SlotDialog = ({ newAppt, contacts, onClose, onChangeAppt, onSaveAppt, onSaveBlock, isSavingAppt, isSavingBlock, apptMinuteOptions, apptHourOptions }: SlotDialogProps) => {
  const [slotTab, setSlotTab] = useState<"appt" | "block">("appt");
  const [blockType, setBlockType]       = useState<"hours" | "fullday">("hours");
  const [blockReason, setBlockReason]   = useState("");
  const [blockEndHour, setBlockEndHour] = useState((newAppt?.hour ?? 12) + 1);
  const [blockEndMinute, setBlockEndMinute] = useState(0);

  if (!newAppt) return null;

  const canSave = !!newAppt.contactId && !!newAppt.date && newAppt.hour >= 0;

  const handleSaveBlock = () =>
    onSaveBlock({
      type: blockType,
      date: newAppt.date,
      startHour: newAppt.hour,
      startMinute: newAppt.minute ?? 0,
      endHour: blockEndHour,
      endMinute: blockEndMinute,
      reason: blockReason,
    });

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {slotTab === "appt" ? "Nueva cita" : "Reservar tiempo"}
        </DialogTitle>
        <DialogDescription>
          {slotTab === "appt"
            ? `${newAppt.date} · ${String(newAppt.hour).padStart(2, "0")}:${String(newAppt.minute).padStart(2, "0")}`
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

          <div className="grid grid-cols-3 gap-3">
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
                  {apptHourOptions.map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Min.</label>
              <div className="relative">
                <select
                  value={newAppt.minute}
                  onChange={(e) => onChangeAppt({ minute: Number(e.target.value) })}
                  className="w-full h-9 rounded-lg border bg-background text-sm pl-3 pr-8 appearance-none focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {apptMinuteOptions.map((m) => <option key={m} value={m}>{String(m).padStart(2, "0")}</option>)}
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
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="relative">
                      <select value={newAppt.hour} onChange={(e) => onChangeAppt({ hour: Number(e.target.value) })} className="w-full h-9 rounded-lg border bg-background text-sm pl-3 pr-7 appearance-none focus:outline-none focus:ring-1 focus:ring-amber-400/50">
                        {apptHourOptions.map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}</option>)}
                      </select>
                      <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    </div>
                    <div className="relative">
                      <select value={newAppt.minute ?? 0} onChange={(e) => onChangeAppt({ minute: Number(e.target.value) })} className="w-full h-9 rounded-lg border bg-background text-sm pl-3 pr-7 appearance-none focus:outline-none focus:ring-1 focus:ring-amber-400/50">
                        {apptMinuteOptions.map((m) => <option key={m} value={m}>{String(m).padStart(2, "0")}</option>)}
                      </select>
                      <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Hasta</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="relative">
                      <select value={blockEndHour} onChange={(e) => setBlockEndHour(Number(e.target.value))} className="w-full h-9 rounded-lg border bg-background text-sm pl-3 pr-7 appearance-none focus:outline-none focus:ring-1 focus:ring-amber-400/50">
                        {apptHourOptions.map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}</option>)}
                      </select>
                      <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    </div>
                    <div className="relative">
                      <select value={blockEndMinute} onChange={(e) => setBlockEndMinute(Number(e.target.value))} className="w-full h-9 rounded-lg border bg-background text-sm pl-3 pr-7 appearance-none focus:outline-none focus:ring-1 focus:ring-amber-400/50">
                        {apptMinuteOptions.map((m) => <option key={m} value={m}>{String(m).padStart(2, "0")}</option>)}
                      </select>
                      <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    </div>
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
const ROW_HEIGHT_DAY = 56;

const DayView = ({
  current, onSelect, selected, onSlotClick, onBlockClick, blocked, appointments, availability, interval,
}: { current: Date; onSelect: (id: string) => void; selected: string | null; onSlotClick: (date: string, hour: number, minute: number) => void; onBlockClick: (blk: BlockedSlot) => void; blocked: BlockedSlot[]; appointments: any[]; availability?: WeeklySchedule | null; interval: number }) => {
  const key = dateKey(current);
  const dayAppts = appointments.filter((a) => a.date === key);
  const dow = current.getDay();
  const slots = buildSlots(interval, availability);
  const firstSlotMin = slots.length ? slots[0].hour * 60 + slots[0].minute : 0;
  const pxPerMin = ROW_HEIGHT_DAY / interval;
  const totalHeight = slots.length * ROW_HEIGHT_DAY;

  // Left offset for overlays: px-5 (20px) + w-12 (48px) + gap-4 (16px) = 84px
  const OVERLAY_LEFT = 84;
  const OVERLAY_RIGHT = 20;

  return (
    <div className="bg-card border rounded-2xl overflow-hidden">
      <div className="relative" style={{ height: totalHeight }}>

        {/* Background grid rows — labels + click targets */}
        {slots.map(({ hour, minute }, idx) => {
          const slotMin = hour * 60 + minute;
          const isOccupied = dayAppts.some((a) => {
            const aStart = a.hour * 60 + (a.minute ?? 0);
            return slotMin >= aStart && slotMin < aStart + (a.duration_min ?? interval);
          });
          const isBlockedHere = isSlotBlockedAt(blocked, key, hour, minute);
          const unavailable = !isOccupied && !isBlockedHere && !isSlotAvailable(availability, dow, hour, minute, interval);
          const canClick = !isOccupied && !isBlockedHere && !unavailable;
          const label = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

          return (
            <div
              key={`${hour}-${minute}`}
              style={{ top: idx * ROW_HEIGHT_DAY, height: ROW_HEIGHT_DAY }}
              className={`absolute left-0 right-0 flex items-start gap-4 px-5 pt-2 border-b ${
                unavailable ? "bg-slate-100 dark:bg-slate-800/70" : ""
              } ${canClick ? "cursor-pointer hover:bg-primary/5 group" : ""}`}
              onClick={canClick ? () => onSlotClick(key, hour, minute) : undefined}
            >
              <span className={`text-xs w-12 shrink-0 font-mono ${unavailable ? "text-muted-foreground/40" : "text-muted-foreground/60"}`}>
                {label}
              </span>
              {canClick && (
                <div className="flex-1 flex items-center h-full">
                  <Plus size={12} className="text-primary/0 group-hover:text-primary/40 transition-colors" />
                </div>
              )}
            </div>
          );
        })}

        {/* Blocked "hours" overlays — span exact minutes */}
        {blocked
          .filter((b) => b.type === "hours" && b.date === key && b.startHour != null && b.endHour != null)
          .map((blk) => {
            const startMin = blk.startHour! * 60 + (blk.startMinute ?? 0);
            const endMin   = blk.endHour!   * 60 + (blk.endMinute   ?? 0);
            const top    = (startMin - firstSlotMin) * pxPerMin;
            const height = (endMin - startMin) * pxPerMin;
            if (height <= 0) return null;
            return (
              <button
                key={blk.id}
                type="button"
                onClick={() => onBlockClick(blk)}
                style={{ top: Math.max(0, top), height: Math.max(height, 32), left: OVERLAY_LEFT, right: OVERLAY_RIGHT }}
                className="absolute rounded-xl px-3 py-1.5 bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 flex items-center gap-2 text-xs hover:bg-amber-200 dark:hover:bg-amber-800/60 transition-colors text-left z-10 overflow-hidden"
              >
                <Coffee size={13} className="shrink-0 text-amber-600 dark:text-amber-400" />
                <span className="font-semibold truncate">{blk.reason || "Reservado"}</span>
                <span className="ml-auto font-mono text-[10px] text-amber-700/80 dark:text-amber-300/80 shrink-0">{formatBlockRange(blk)}</span>
              </button>
            );
          })}

        {/* Appointment overlays — span exact duration */}
        {dayAppts.map((appt) => {
          const startMin    = appt.hour * 60 + (appt.minute ?? 0);
          const durationMin = appt.duration_min ?? interval;
          const top    = (startMin - firstSlotMin) * pxPerMin;
          const height = durationMin * pxPerMin;
          const isSelected = selected === appt.id;
          return (
            <button
              key={appt.id}
              onClick={() => onSelect(isSelected ? "" : appt.id)}
              style={{ top, height: Math.max(height, 36), left: OVERLAY_LEFT, right: OVERLAY_RIGHT }}
              className={`absolute rounded-xl px-3 py-1.5 border transition-all text-xs text-left z-20 overflow-hidden ${
                isSelected
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-primary/20 border-primary/30 hover:bg-primary/30"
              }`}
            >
              <p className="font-medium leading-tight">
                <span className="font-mono opacity-70 mr-1.5">{appt.time}</span>
                {appt.name}
              </p>
              {height > 44 && appt.service && (
                <p className="opacity-75 mt-0.5 truncate text-[11px]">{appt.service}</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// WEEK VIEW
const ROW_HEIGHT_WEEK = 52;

const WeekView = ({
  current, onSelect, selected, onSlotClick, onBlockClick, blocked, appointments, availability, interval,
}: { current: Date; onSelect: (id: string) => void; selected: string | null; onSlotClick: (date: string, hour: number, minute: number) => void; onBlockClick: (blk: BlockedSlot) => void; blocked: BlockedSlot[]; appointments: any[]; availability?: WeeklySchedule | null; interval: number }) => {
  const monday = startOfWeek(current);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
  const slots = buildSlots(interval, availability);
  const firstSlotMin = slots.length ? slots[0].hour * 60 + slots[0].minute : 0;
  const pxPerMin = ROW_HEIGHT_WEEK / interval;
  const totalHeight = slots.length * ROW_HEIGHT_WEEK;

  return (
    <div className="bg-card border rounded-2xl overflow-hidden overflow-x-auto">
      {/* Header row */}
      <div className="flex border-b">
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

      {/* Body */}
      <div className="flex" style={{ height: totalHeight }}>
        {/* Time gutter */}
        <div className="w-14 shrink-0 border-r relative" style={{ height: totalHeight }}>
          {slots.map(({ hour, minute }, idx) => (
            <div
              key={`label-${hour}-${minute}`}
              style={{ top: idx * ROW_HEIGHT_WEEK, height: ROW_HEIGHT_WEEK }}
              className="absolute left-0 right-0 border-b px-2 pt-1.5 text-right"
            >
              <span className="text-[10px] text-muted-foreground/60 font-mono">
                {String(hour).padStart(2, "0")}:{String(minute).padStart(2, "0")}
              </span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {weekDays.map((day) => {
          const key = dateKey(day);
          const dayAppts = appointments.filter((a) => a.date === key);
          const dayBlk = isDayBlocked(blocked, key);
          const isToday = sameDay(day, new Date());

          return (
            <div
              key={key}
              className={`flex-1 min-w-[90px] border-r last:border-r-0 relative ${
                dayBlk ? "bg-amber-50/60 dark:bg-amber-900/20" : isToday ? "bg-primary/5" : ""
              }`}
              style={{ height: totalHeight }}
            >
              {/* Background grid rows — click targets */}
              {slots.map(({ hour, minute }, idx) => {
                const slotMin = hour * 60 + minute;
                const isOccupied = dayAppts.some((a) => {
                  const aStart = a.hour * 60 + (a.minute ?? 0);
                  return slotMin >= aStart && slotMin < aStart + (a.duration_min ?? interval);
                });
                const isBlockedHere = isSlotBlockedAt(blocked, key, hour, minute);
                const unavailable = !isOccupied && !isBlockedHere && !isSlotAvailable(availability, day.getDay(), hour, minute, interval);
                const canClick = !isOccupied && !isBlockedHere && !unavailable && !dayBlk;

                return (
                  <div
                    key={`${hour}-${minute}`}
                    style={{ top: idx * ROW_HEIGHT_WEEK, height: ROW_HEIGHT_WEEK }}
                    className={`absolute left-0 right-0 border-b ${
                      unavailable ? "bg-slate-100 dark:bg-slate-800/70" : ""
                    } ${canClick ? "hover:bg-primary/5 cursor-pointer group" : ""}`}
                    onClick={canClick ? () => onSlotClick(key, hour, minute) : undefined}
                  >
                    {canClick && (
                      <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus size={11} className="text-primary/50" />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Blocked "hours" overlays */}
              {blocked
                .filter((b) => b.type === "hours" && b.date === key && b.startHour != null && b.endHour != null)
                .map((blk) => {
                  const startMin = blk.startHour! * 60 + (blk.startMinute ?? 0);
                  const endMin   = blk.endHour!   * 60 + (blk.endMinute   ?? 0);
                  const top    = (startMin - firstSlotMin) * pxPerMin;
                  const height = (endMin - startMin) * pxPerMin;
                  if (height <= 0) return null;
                  return (
                    <button
                      key={blk.id}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onBlockClick(blk); }}
                      style={{ top: Math.max(0, top), height: Math.max(height, 20), left: 2, right: 2 }}
                      className="absolute rounded-lg flex items-start gap-1 px-1.5 py-1 bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800/60 transition-colors z-10 overflow-hidden"
                      title={blk.reason || "Bloqueo"}
                    >
                      <Coffee size={10} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                      {height > 28 && (
                        <span className="text-[10px] font-semibold leading-tight truncate">{blk.reason || "Reservado"}</span>
                      )}
                    </button>
                  );
                })}

              {/* Appointment overlays — span exact duration */}
              {dayAppts.map((appt) => {
                const startMin    = appt.hour * 60 + (appt.minute ?? 0);
                const durationMin = appt.duration_min ?? interval;
                const top    = (startMin - firstSlotMin) * pxPerMin;
                const height = durationMin * pxPerMin;
                const isSelected = selected === appt.id;
                return (
                  <button
                    key={appt.id}
                    onClick={(e) => { e.stopPropagation(); onSelect(isSelected ? "" : appt.id); }}
                    style={{ top, height: Math.max(height, 24), left: 2, right: 2 }}
                    className={`absolute rounded-lg px-1.5 py-1 text-[10px] border transition-all text-left z-20 overflow-hidden ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-primary/20 border-primary/30 text-primary hover:bg-primary/30"
                    }`}
                  >
                    <p className="font-semibold truncate leading-tight">{appt.time}</p>
                    {height > 36 && <p className="truncate opacity-80 leading-tight">{appt.name}</p>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// MONTH VIEW
const MonthView = ({
  current, onSelect, selected, onBlockClick, selectedBlockId, blocked, appointments,
}: { current: Date; onSelect: (id: string) => void; selected: string | null; onBlockClick: (blk: BlockedSlot) => void; selectedBlockId: string | null; blocked: BlockedSlot[]; appointments: any[] }) => {
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
                  <button
                    onClick={() => onBlockClick(dayBlk)}
                    className={`w-full rounded px-1.5 py-1 text-[9px] text-amber-900 dark:text-amber-100 border flex items-center justify-center gap-1.5 truncate transition-colors ${
                      selectedBlockId === dayBlk.id
                        ? "bg-amber-400 dark:bg-amber-600 border-amber-500 dark:border-amber-500"
                        : "bg-amber-100 dark:bg-amber-900/40 border-amber-200/40 dark:border-amber-800/60 hover:bg-amber-200 dark:hover:bg-amber-800/60"
                    }`}
                  >
                    <Coffee size={10} className="shrink-0 text-amber-600 dark:text-amber-400" />
                    <span className="truncate">{dayBlk.reason || "Reservado"}</span>
                  </button>
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

// ─── Block Detail Panel ───────────────────────────────────────

const BLOCK_TYPE_LABEL: Record<string, string> = {
  hours:   "Horas específicas",
  fullday: "Día completo",
  range:   "Rango de días",
};

const BlockDetailPanel = ({
  block, canEdit, onEdit, onDelete,
}: { block: BlockedSlot; canEdit: boolean; onEdit: () => void; onDelete: () => void }) => {
  const rows: [string, string][] = [];
  rows.push(["Tipo", BLOCK_TYPE_LABEL[block.type] ?? block.type]);
  if (block.type === "hours" && block.date)  rows.push(["Fecha", block.date]);
  if (block.type === "fullday" && block.date) rows.push(["Fecha", block.date]);
  if (block.type === "range")  rows.push(["Período", `${block.startDate ?? "—"} → ${block.endDate ?? "—"}`]);
  if (block.type === "hours" && block.startHour != null && block.endHour != null) {
    const sh = `${String(block.startHour).padStart(2,"0")}:${String(block.startMinute ?? 0).padStart(2,"0")}`;
    const eh = `${String(block.endHour).padStart(2,"0")}:${String(block.endMinute ?? 0).padStart(2,"0")}`;
    rows.push(["Horario", `${sh} – ${eh}`]);
  }
  if (block.reason) rows.push(["Motivo", block.reason]);

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
          <Coffee size={18} className="text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{block.reason || "Tiempo reservado"}</p>
          <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">{BLOCK_TYPE_LABEL[block.type]}</p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={onEdit}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Editar bloqueo"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={onDelete}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Eliminar bloqueo"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
      <div className="space-y-3 text-sm">
        {rows.map(([label, value]) => (
          <div key={label}>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">{label}</p>
            <p className="font-medium mt-0.5 text-sm">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────

const CrmCalendar = () => {
  // ─── Supabase hooks ───
  const { allowedIds, canItem } = useStaffPermissions();
  const { data: allCalendars = [], isLoading: loadingConfig, isFetching: fetchingConfig, refetch: refetchCalendars } = useCalendars();
  const allowedCalendarIds = allowedIds("calendarios");
  const calendars = allowedCalendarIds
    ? allCalendars.filter(c => allowedCalendarIds.includes(c.id))
    : allCalendars;
  const { data: forms = [], isLoading: loadingForms } = useForms();
  const createForm    = useCreateForm();
  const updateConfig  = useUpdateCalendarConfig();
  const { data: contacts = [] } = useContacts();

  // Which calendar is selected — declared early so hooks below can use it
  const [selectedCalendarId, setSelectedCalendarIdState] = useState<string | null>(() =>
    localStorage.getItem("crm_selected_calendar_id")
  );
  const handleSelectCalendar = useCallback((id: string | null) => {
    setSelectedCalendarIdState(id);
    if (id) localStorage.setItem("crm_selected_calendar_id", id);
    else    localStorage.removeItem("crm_selected_calendar_id");
  }, []);
  const selectedCalendar = calendars.find((c) => c.id === selectedCalendarId) ?? calendars[0] ?? null;
  const canEditCalendar = selectedCalendar ? canItem("calendarios", selectedCalendar.id, "edit") : false;

  // Clean up stale localStorage id if the calendar was deleted elsewhere.
  // Skip while the query is refetching — otherwise a freshly-created calendar
  // (set via onCreated before the invalidation resolves) gets wiped.
  useEffect(() => {
    if (fetchingConfig) return;
    if (!selectedCalendarId || calendars.length === 0) return;
    if (!calendars.some((c) => c.id === selectedCalendarId)) {
      handleSelectCalendar(null);
    }
  }, [selectedCalendarId, calendars, fetchingConfig, handleSelectCalendar]);

  const { data: rawAppointments = [], isLoading: loadingAppts } = useAppointments(selectedCalendar?.id);
  const { data: rawBlocked = [], isLoading: loadingBlocked } = useBlockedSlots(selectedCalendar?.id);
  const createAppointment = useCreateAppointment();
  const updateAppointment = useUpdateAppointment();
  const deleteAppointment = useDeleteAppointment();
  const createBlockedSlot = useCreateBlockedSlot();
  const updateBlockedSlotMut = useUpdateBlockedSlot();
  const deleteBlockedSlotMut = useDeleteBlockedSlot();

  // Map raw appointments to the shape the view components expect.
  // Server-side filter via useAppointments(calendarId); defensive client filter kept
  // for the transitional render while selectedCalendar resolves.
  const appointments = useMemo(() => rawAppointments
    .filter(a => selectedCalendar ? a.calendar_id === selectedCalendar.id : true)
    .map(a => {
      const contact = contacts.find(c => c.id === a.contact_id);
      const min = a.minute ?? 0;
      return {
        id: a.id,
        name: contact?.name ?? "Sin contacto",
        email: contact?.email ?? "",
        phone: contact?.phone ?? "",
        date: a.date,
        time: `${String(a.hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`,
        hour: a.hour,
        minute: min,
        service: a.service ?? "",
        status: a.status === "confirmed" ? "Confirmada" : "Cancelada",
        notes: a.notes ?? "",
        rawStatus: a.status,
        duration_min: a.duration_min ?? null,
        contact_id: a.contact_id ?? null,
      };
    }), [rawAppointments, contacts, selectedCalendar]);

  // Map raw blocked slots to the local BlockedSlot shape
  const blockedSlots: BlockedSlot[] = useMemo(() => rawBlocked.map(b => ({
    id: b.id,
    type: b.type,
    reason: b.reason ?? "",
    date: b.date ?? undefined,
    startHour:   b.start_hour   ?? undefined,
    startMinute: b.start_minute ?? undefined,
    endHour:     b.end_hour     ?? undefined,
    endMinute:   b.end_minute   ?? undefined,
    startDate: b.range_start ?? undefined,
    endDate:   b.range_end   ?? undefined,
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
  const [editMinute, setEditMinute]       = useState(0);
  const [deleteApptTarget, setDeleteApptTarget] = useState<{ id: string; name: string } | null>(null);
  const [selectedBlockId, setSelectedBlockId]   = useState<string | null>(null);
  const [deleteBlockTarget, setDeleteBlockTarget] = useState<{ id: string; name: string } | null>(null);

  // New appointment modal
  const [newAppt, setNewAppt] = useState<{ open: boolean; date: string; hour: number; minute: number; contactId: string; notes: string; service: string } | null>(null);

  const openNewAppt = (date: string, hour: number, minute: number = 0) =>
    setNewAppt({ open: true, date, hour, minute, contactId: "", notes: "", service: "" });

  const closeNewAppt = () => setNewAppt(null);

  const [blockModal, setBlockModal] = useState<{
    open: boolean;
    editingId?: string;
    type: "hours" | "fullday" | "range";
    date: string;
    startHour: number;
    startMinute: number;
    endHour: number;
    endMinute: number;
    startDate: string;
    endDate: string;
    reason: string;
  } | null>(null);

  const openBlockModal = () => setBlockModal({
    open: true, type: "hours",
    date: dateKey(current),
    startHour: hourMin, startMinute: 0,
    endHour: Math.min(hourMin + 1, hourMax - 1), endMinute: 0,
    startDate: dateKey(current), endDate: dateKey(current),
    reason: "",
  });

  const openEditBlockModal = (blk: BlockedSlot) => setBlockModal({
    open: true,
    editingId: blk.id,
    type: blk.type,
    date: blk.date ?? dateKey(current),
    startHour: blk.startHour ?? hourMin,
    startMinute: blk.startMinute ?? 0,
    endHour: blk.endHour ?? Math.min(hourMin + 1, hourMax - 1),
    endMinute: blk.endMinute ?? 0,
    startDate: blk.startDate ?? dateKey(current),
    endDate: blk.endDate ?? dateKey(current),
    reason: blk.reason ?? "",
  });

  const closeBlockModal = () => setBlockModal(null);

  const saveBlock = async () => {
    if (!blockModal || !selectedCalendar) return;

    if (blockModal.type === "hours") {
      const startTotal = blockModal.startHour * 60 + blockModal.startMinute;
      const endTotal   = blockModal.endHour   * 60 + blockModal.endMinute;
      if (endTotal <= startTotal) {
        toast.error("La hora de fin debe ser posterior a la hora de inicio");
        return;
      }
    }

    if (blockModal.type === "range") {
      if (!blockModal.startDate || !blockModal.endDate) {
        toast.error("Debes seleccionar fecha de inicio y fin");
        return;
      }
      if (blockModal.endDate < blockModal.startDate) {
        toast.error("La fecha de fin debe ser igual o posterior a la de inicio");
        return;
      }
    }

    const payload = {
      type: blockModal.type,
      reason: blockModal.reason || null,
      date: blockModal.type !== "range" ? blockModal.date : null,
      start_hour:   blockModal.type === "hours" ? blockModal.startHour   : null,
      start_minute: blockModal.type === "hours" ? blockModal.startMinute : 0,
      end_hour:     blockModal.type === "hours" ? blockModal.endHour     : null,
      end_minute:   blockModal.type === "hours" ? blockModal.endMinute   : 0,
      range_start: blockModal.type === "range" ? blockModal.startDate : null,
      range_end:   blockModal.type === "range" ? blockModal.endDate   : null,
    };

    try {
      if (blockModal.editingId) {
        await updateBlockedSlotMut.mutateAsync({ id: blockModal.editingId, ...payload });
        toast.success("Bloqueo actualizado");
      } else {
        await createBlockedSlot.mutateAsync({ calendar_id: selectedCalendar.id, ...payload });
        toast.success("Tiempo reservado");
      }
      closeBlockModal();
    } catch {
      toast.error("Error al guardar bloqueo");
    }
  };

  // null = new calendar form; CalendarData = edit form; undefined = not in config mode
  const [editingCalendar, setEditingCalendar] = useState<CalendarData | null | undefined>(undefined);

  const availability = selectedCalendar?.availability as WeeklySchedule | null | undefined;
  const calendarInterval = selectedCalendar?.duration_min ?? 30;
  const slotMinuteOptions = minutesForInterval(calendarInterval);
  const { min: hourMin, max: hourMax } = availabilityHourRange(availability);
  const slotHourOptions = Array.from({ length: hourMax - hourMin + 1 }, (_, i) => i + hourMin);
  const detail      = appointments.find((a) => a.id === selected);
  const blockDetail = blockedSlots.find((b) => b.id === selectedBlockId);

  const handleSelectAppt = (id: string) => {
    setSelected(id || null);
    if (id) setSelectedBlockId(null);
  };

  const handleSelectBlock = (blk: BlockedSlot) => {
    const newId = blk.id === selectedBlockId ? null : blk.id;
    setSelectedBlockId(newId);
    if (newId) setSelected(null);
  };

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
        onCreated={(id) => handleSelectCalendar(id)}
        onGoogleConnected={() => refetchCalendars()}
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
    <DeleteConfirmDialog
      open={!!deleteBlockTarget}
      onOpenChange={(open) => { if (!open) setDeleteBlockTarget(null); }}
      onConfirm={async () => {
        if (!deleteBlockTarget) return;
        try {
          await deleteBlockedSlotMut.mutateAsync({ id: deleteBlockTarget.id, name: deleteBlockTarget.name });
          toast.success("Bloqueo eliminado");
          setDeleteBlockTarget(null);
          setSelectedBlockId(null);
        } catch {
          toast.error("Error al eliminar bloqueo");
        }
      }}
      isPending={deleteBlockedSlotMut.isPending}
      description="Se eliminará el bloqueo permanentemente."
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
                        onClick={() => { handleSelectCalendar(cal.id); setDropdownOpen(false); }}
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
          {canEditCalendar && (
            <Button
              variant="outline"
              onClick={openBlockModal}
              className="h-[38px] rounded-xl text-xs font-semibold px-4 gap-2 text-amber-700 dark:text-amber-400 hover:text-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/20 border-amber-300 dark:border-amber-700/40"
            >
              <Coffee size={14} /> Reservar tiempo
            </Button>
          )}
          {canEditCalendar && (
            <Button
              onClick={() => openNewAppt(dateKey(current), 10, 0)}
              className="h-[38px] rounded-xl text-xs font-semibold px-4 gap-2"
            >
              <Plus size={14} /> Nueva cita
            </Button>
          )}
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
          {view === "day"   && <DayView   current={current} onSelect={handleSelectAppt} selected={selected} onSlotClick={canEditCalendar ? openNewAppt : () => {}} onBlockClick={handleSelectBlock} blocked={blockedSlots} appointments={appointments} availability={availability} interval={calendarInterval} />}
          {view === "week"  && <WeekView  current={current} onSelect={handleSelectAppt} selected={selected} onSlotClick={canEditCalendar ? openNewAppt : () => {}} onBlockClick={handleSelectBlock} blocked={blockedSlots} appointments={appointments} availability={availability} interval={calendarInterval} />}
          {view === "month" && <MonthView current={current} onSelect={handleSelectAppt} selected={selected} onBlockClick={handleSelectBlock} selectedBlockId={selectedBlockId} blocked={blockedSlots} appointments={appointments} />}
        </div>

        {/* Detail panel — day & week only */}
        {view !== "month" && (
          <div className="bg-card border rounded-2xl p-5 h-fit">
            {blockDetail ? (
              <BlockDetailPanel
                block={blockDetail}
                canEdit={canEditCalendar}
                onEdit={() => openEditBlockModal(blockDetail)}
                onDelete={() => setDeleteBlockTarget({ id: blockDetail.id, name: blockDetail.reason || "Bloqueo" })}
              />
            ) : detail ? (
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
                        disabled={!canEditCalendar}
                        onChange={async (e) => {
                          const newStatus = e.target.value === "Cancelada" ? "cancelled" : "confirmed";
                          try {
                            await updateAppointment.mutateAsync({ id: detail.id, status: newStatus });
                            toast.success("Estado actualizado");
                          } catch { toast.error("Error al actualizar"); }
                        }}
                        className={`text-[10px] appearance-none bg-background border px-2.5 py-0.5 rounded-full pr-6 ${canEditCalendar ? "cursor-pointer hover:bg-secondary/20" : "cursor-default opacity-70"} transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 ${statusStyles[detail.status] || ""}`}
                      >
                        <option value="Confirmada">Confirmada</option>
                        <option value="Cancelada">Cancelada</option>
                      </select>
                      <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                    </div>
                  </div>

                  {canEditCalendar && (
                    <div className="flex items-center gap-0.5 mt-0.5 shrink-0">
                      <button
                        onClick={() => { setEditingApptId(detail.id); setEditDate(detail.date); setEditHour(detail.hour); setEditMinute(detail.minute ?? 0); }}
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
                  )}
                </div>
                <div className="space-y-4 text-sm">
                  {/* Cita Details */}
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium mb-2">Información de la Cita</p>
                    <div className="space-y-2.5">
                      {([
                        ["Fecha",    detail.date],
                        ["Hora",     detail.time],
                        ["Duración", `${detail.duration_min} min`],
                        detail.service ? ["Servicio", detail.service] : null,
                      ] as (readonly [string, string] | null)[]).filter((v): v is readonly [string, string] => !!v && !!v[1]).map(([label, value]) => (
                        <div key={label}>
                          <p className="text-[10px] text-muted-foreground/70">{label}</p>
                          <p className="font-medium text-xs">{value}</p>
                        </div>
                      ))}
                      {detail.google_event_id && (
                        <div className="pt-1">
                          <p className="text-[10px] text-green-600 flex items-center gap-1">
                            <span>✓ Sincronizada con Google</span>
                          </p>
                        </div>
                      )}
                      {detail.notes && (
                        <div className="pt-1 border-t">
                          <p className="text-[10px] text-muted-foreground/70">Notas</p>
                          <p className="text-xs mt-1">{detail.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contact Details */}
                  {detail.contact_id && (() => {
                    const contact = contacts.find(c => c.id === detail.contact_id);
                    if (!contact) return null;
                    return (
                      <div className="border-t pt-4">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium mb-2">Información del Contacto</p>
                        <div className="space-y-2.5">
                          {([
                            ["Email",    contact.email],
                            ["Teléfono", contact.phone],
                            ["Empresa",  contact.company],
                          ] as readonly (readonly [string, string | undefined])[]).filter((pair): pair is readonly [string, string] => !!pair[1]).map(([label, value]) => (
                            <div key={label}>
                              <p className="text-[10px] text-muted-foreground/70">{label}</p>
                              <p className="font-medium text-xs">{value}</p>
                            </div>
                          ))}
                          {contact.tags && Array.isArray(contact.tags) && contact.tags.length > 0 && (
                            <div>
                              <p className="text-[10px] text-muted-foreground/70 mb-1">Tags</p>
                              <div className="flex flex-wrap gap-1">
                                {contact.tags.map(tag => (
                                  <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/50 text-secondary-foreground">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {contact.notes && (
                            <div className="pt-1 border-t">
                              <p className="text-[10px] text-muted-foreground/70">Notas del Contacto</p>
                              <p className="text-xs mt-1">{contact.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <div className="py-10 text-center">
                <User size={22} className="text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Selecciona una cita o bloqueo para ver los detalles</p>
              </div>
            )}
          </div>
        )}

        {/* Block detail — month view (below) */}
        {view === "month" && blockDetail && !detail && (
          <div className="bg-card border rounded-2xl p-5 mt-4">
            <BlockDetailPanel
              block={blockDetail}
              canEdit={canEditCalendar}
              onEdit={() => openEditBlockModal(blockDetail)}
              onDelete={() => setDeleteBlockTarget({ id: blockDetail.id, name: blockDetail.reason || "Bloqueo" })}
            />
          </div>
        )}

        {/* Detail panel — month view (below) */}
        {view === "month" && detail && (
          <div className="bg-card border rounded-2xl p-5 mt-4 space-y-4">
            <div className="flex justify-between items-start">
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
                {canEditCalendar && (
                  <div className="flex items-center gap-1 sm:border-l sm:pl-3 border-border/40">
                    <button
                      onClick={() => { setEditingApptId(detail.id); setEditDate(detail.date); setEditHour(detail.hour); setEditMinute(detail.minute ?? 0); }}
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
                )}
              </div>
            </div>

            {/* Expanded details */}
            <div className="space-y-4 text-sm pt-3 border-t">
              {/* Cita Details */}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium mb-2">Información de la Cita</p>
                <div className="space-y-2.5">
                  {([
                    ["Duración", `${detail.duration_min} min`],
                    detail.service ? ["Servicio", detail.service] : null,
                  ] as (readonly [string, string] | null)[]).filter((v): v is readonly [string, string] => !!v && !!v[1]).map(([label, value]) => (
                    <div key={label}>
                      <p className="text-[10px] text-muted-foreground/70">{label}</p>
                      <p className="font-medium text-xs">{value}</p>
                    </div>
                  ))}
                  {detail.google_event_id && (
                    <div className="pt-1">
                      <p className="text-[10px] text-green-600 flex items-center gap-1">
                        <span>✓ Sincronizada con Google</span>
                      </p>
                    </div>
                  )}
                  {detail.notes && (
                    <div className="pt-1 border-t">
                      <p className="text-[10px] text-muted-foreground/70">Notas</p>
                      <p className="text-xs mt-1">{detail.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Details */}
              {detail.contact_id && (() => {
                const contact = contacts.find(c => c.id === detail.contact_id);
                if (!contact) return null;
                return (
                  <div className="border-t pt-4">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium mb-2">Información del Contacto</p>
                    <div className="space-y-2.5">
                      {([
                        ["Email",    contact.email],
                        ["Teléfono", contact.phone],
                        ["Empresa",  contact.company],
                      ] as readonly (readonly [string, string | undefined])[]).filter((pair): pair is readonly [string, string] => !!pair[1]).map(([label, value]) => (
                        <div key={label}>
                          <p className="text-[10px] text-muted-foreground/70">{label}</p>
                          <p className="font-medium text-xs">{value}</p>
                        </div>
                      ))}
                      {contact.tags && Array.isArray(contact.tags) && contact.tags.length > 0 && (
                        <div>
                          <p className="text-[10px] text-muted-foreground/70 mb-1">Tags</p>
                          <div className="flex flex-wrap gap-1">
                            {contact.tags.map((tag: string) => (
                              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/50 text-secondary-foreground">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {contact.notes && (
                        <div className="pt-1 border-t">
                          <p className="text-[10px] text-muted-foreground/70">Notas del Contacto</p>
                          <p className="text-xs mt-1">{contact.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
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
              if (!selectedCalendar) { toast.error("Selecciona un calendario primero"); return; }

              const apptDate   = newAppt.date;
              const apptHour   = newAppt.hour;
              const apptMinute = newAppt.minute ?? 0;
              const duration   = calendarInterval;
              const buffer     = (selectedCalendar as any).buffer_min ?? 0;
              const [_y, _m, _d] = apptDate.split("-").map(Number);
              const dow        = new Date(Date.UTC(_y, _m - 1, _d)).getUTCDay();
              const reqStart   = apptHour * 60 + apptMinute;
              const reqEnd     = reqStart + duration;

              if (!isSlotAvailable(availability, dow, apptHour, apptMinute, duration)) {
                toast.error("El horario está fuera de la disponibilidad del calendario");
                return;
              }
              if (isSlotBlockedAt(blockedSlots, apptDate, apptHour, apptMinute)) {
                toast.error("El horario está bloqueado");
                return;
              }
              const hasConflict = appointments
                .filter(a => a.date === apptDate && a.rawStatus !== "cancelled")
                .some(a => {
                  const aStart = a.hour * 60 + (a.minute ?? 0);
                  const aEnd   = aStart + (a.duration_min ?? duration);
                  return reqEnd + buffer > aStart && aEnd + buffer > reqStart;
                });
              if (hasConflict) {
                toast.error("Ya existe una cita en ese horario");
                return;
              }

              try {
                await createAppointment.mutateAsync({
                  calendar_id: selectedCalendar.id,
                  contact_id: newAppt.contactId || null,
                  date: newAppt.date,
                  hour: newAppt.hour,
                  minute: newAppt.minute,
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
            onSaveBlock={async ({ type, date, startHour, startMinute, endHour, endMinute, reason }) => {
              if (!selectedCalendar) { toast.error("Selecciona un calendario primero"); return; }
              if (type === "hours") {
                const startTotal = startHour * 60 + startMinute;
                const endTotal   = endHour   * 60 + endMinute;
                if (endTotal <= startTotal) {
                  toast.error("La hora de fin debe ser posterior a la hora de inicio");
                  return;
                }
              }
              try {
                await createBlockedSlot.mutateAsync({
                  calendar_id: selectedCalendar.id,
                  type,
                  reason: reason || null,
                  date: type !== "range" ? date : null,
                  start_hour:   type === "hours" ? startHour   : null,
                  start_minute: type === "hours" ? startMinute : 0,
                  end_hour:     type === "hours" ? endHour     : null,
                  end_minute:   type === "hours" ? endMinute   : 0,
                  range_start: type === "range" ? date : null,
                  range_end:   type === "range" ? date : null,
                });
                toast.success("Tiempo reservado");
                closeNewAppt();
              } catch {
                toast.error("Error al reservar tiempo");
              }
            }}
            isSavingAppt={createAppointment.isPending}
            isSavingBlock={createBlockedSlot.isPending}
            apptMinuteOptions={slotMinuteOptions}
            apptHourOptions={slotHourOptions}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingApptId} onOpenChange={(open) => { if (!open) setEditingApptId(null); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Editar Cita</DialogTitle>
            <DialogDescription>
              Modifica la fecha u hora agendada para {appointments.find(a => a.id === editingApptId)?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label htmlFor="edit-date" className="text-sm font-medium">Fecha</label>
              <Input
                id="edit-date"
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="edit-hour" className="text-sm font-medium">Hora</label>
                <div className="relative">
                  <select
                    value={editHour}
                    onChange={(e) => setEditHour(Number(e.target.value))}
                    className="w-full h-9 rounded-lg border bg-background text-sm pl-3 pr-8 appearance-none focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {slotHourOptions.map((h) => (
                      <option key={h} value={h}>{String(h).padStart(2, "0")}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="edit-minute" className="text-sm font-medium">Min.</label>
                <div className="relative">
                  <select
                    value={editMinute}
                    onChange={(e) => setEditMinute(Number(e.target.value))}
                    className="w-full h-9 rounded-lg border bg-background text-sm pl-3 pr-8 appearance-none focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {[...new Set([...slotMinuteOptions, editMinute])].sort((a, b) => a - b).map((m) => (
                      <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingApptId(null)} className="h-9">Cancelar</Button>
            <Button 
              disabled={updateAppointment.isPending}
              onClick={async () => {
                if (!editingApptId) return;

                const duration = calendarInterval;
                const buffer   = (selectedCalendar as any)?.buffer_min ?? 0;
                const [ey, em, ed] = editDate.split("-").map(Number);
                const dow      = new Date(Date.UTC(ey, em - 1, ed)).getUTCDay();
                const reqStart = editHour * 60 + editMinute;
                const reqEnd   = reqStart + duration;

                if (!isSlotAvailable(availability, dow, editHour, editMinute, duration)) {
                  toast.error("El horario está fuera de la disponibilidad del calendario");
                  return;
                }
                if (isSlotBlockedAt(blockedSlots, editDate, editHour, editMinute)) {
                  toast.error("El horario está bloqueado");
                  return;
                }
                const hasConflict = appointments
                  .filter(a => a.date === editDate && a.rawStatus !== "cancelled" && a.id !== editingApptId)
                  .some(a => {
                    const aStart = a.hour * 60 + (a.minute ?? 0);
                    const aEnd   = aStart + (a.duration_min ?? duration);
                    return reqEnd + buffer > aStart && aEnd + buffer > reqStart;
                  });
                if (hasConflict) {
                  toast.error("Ya existe una cita en ese horario");
                  return;
                }

                try {
                  await updateAppointment.mutateAsync({
                    id: editingApptId,
                    date: editDate,
                    hour: editHour,
                    minute: editMinute,
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

      {/* ─── Block Time Modal (create + edit) ─── */}
      <Dialog open={!!blockModal?.open} onOpenChange={(open) => !open && closeBlockModal()}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Coffee size={18} /> {blockModal?.editingId ? "Editar bloqueo" : "Reservar tiempo personal"}
            </DialogTitle>
            <DialogDescription>
              {blockModal?.editingId
                ? "Modifica los datos del bloqueo o elimínalo definitivamente."
                : "Reserva un espacio para ti. El calendario no aceptará citas en ese horario."}
            </DialogDescription>
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
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="relative">
                          <select
                            value={blockModal.startHour}
                            onChange={e => setBlockModal(prev => prev && ({ ...prev, startHour: Number(e.target.value) }))}
                            className="w-full h-9 rounded-lg border bg-background text-sm pl-3 pr-7 appearance-none focus:outline-none focus:ring-1 focus:ring-amber-400/50"
                          >
                            {slotHourOptions.map(h => <option key={h} value={h}>{String(h).padStart(2, "0")}</option>)}
                          </select>
                          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        </div>
                        <div className="relative">
                          <select
                            value={blockModal.startMinute}
                            onChange={e => setBlockModal(prev => prev && ({ ...prev, startMinute: Number(e.target.value) }))}
                            className="w-full h-9 rounded-lg border bg-background text-sm pl-3 pr-7 appearance-none focus:outline-none focus:ring-1 focus:ring-amber-400/50"
                          >
                            {slotMinuteOptions.map(m => <option key={m} value={m}>{String(m).padStart(2, "0")}</option>)}
                          </select>
                          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Hasta</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="relative">
                          <select
                            value={blockModal.endHour}
                            onChange={e => setBlockModal(prev => prev && ({ ...prev, endHour: Number(e.target.value) }))}
                            className="w-full h-9 rounded-lg border bg-background text-sm pl-3 pr-7 appearance-none focus:outline-none focus:ring-1 focus:ring-amber-400/50"
                          >
                            {slotHourOptions.map(h => <option key={h} value={h}>{String(h).padStart(2, "0")}</option>)}
                          </select>
                          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        </div>
                        <div className="relative">
                          <select
                            value={blockModal.endMinute}
                            onChange={e => setBlockModal(prev => prev && ({ ...prev, endMinute: Number(e.target.value) }))}
                            className="w-full h-9 rounded-lg border bg-background text-sm pl-3 pr-7 appearance-none focus:outline-none focus:ring-1 focus:ring-amber-400/50"
                          >
                            {slotMinuteOptions.map(m => <option key={m} value={m}>{String(m).padStart(2, "0")}</option>)}
                          </select>
                          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        </div>
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

          <DialogFooter className="flex-row items-center gap-2 flex-wrap">
            {blockModal?.editingId && (
              <Button
                variant="ghost"
                onClick={async () => {
                  if (!blockModal.editingId) return;
                  try {
                    await deleteBlockedSlotMut.mutateAsync({ id: blockModal.editingId, name: blockModal.reason || "Bloqueo" });
                    toast.success("Bloqueo eliminado");
                    setSelectedBlockId(null);
                    closeBlockModal();
                  } catch {
                    toast.error("Error al eliminar bloqueo");
                  }
                }}
                disabled={deleteBlockedSlotMut.isPending}
                className="h-9 text-destructive hover:text-destructive hover:bg-destructive/10 mr-auto"
              >
                <Trash2 size={14} className="mr-1.5" /> Eliminar
              </Button>
            )}
            <Button variant="outline" onClick={closeBlockModal} className="h-9">Cancelar</Button>
            <Button
              onClick={saveBlock}
              disabled={!selectedCalendar || createBlockedSlot.isPending || updateBlockedSlotMut.isPending}
              className="h-9 bg-amber-500 hover:bg-amber-600 text-white"
            >
              <Coffee size={14} className="mr-1.5" /> {blockModal?.editingId ? "Guardar cambios" : "Reservar tiempo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
};

export default CrmCalendar;

