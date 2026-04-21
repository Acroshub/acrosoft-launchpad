import { useState } from "react";
import { Plus, X, Copy, Check } from "lucide-react";

// ─── Types (export so consumers can type their state) ─────────────────────────
export type DaySlot = { from: string; to: string };
export type DaySchedule = { open: boolean; slots: DaySlot[] };
export type WeeklySchedule = Record<string, DaySchedule>;

export const SCHEDULE_DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export const DEFAULT_WEEKLY_SCHEDULE: WeeklySchedule = {
  Lun: { open: true,  slots: [{ from: "9:00 AM", to: "6:00 PM" }] },
  Mar: { open: true,  slots: [{ from: "9:00 AM", to: "6:00 PM" }] },
  Mié: { open: true,  slots: [{ from: "9:00 AM", to: "6:00 PM" }] },
  Jue: { open: true,  slots: [{ from: "9:00 AM", to: "6:00 PM" }] },
  Vie: { open: true,  slots: [{ from: "9:00 AM", to: "6:00 PM" }] },
  Sáb: { open: false, slots: [{ from: "9:00 AM", to: "2:00 PM" }] },
  Dom: { open: false, slots: [{ from: "9:00 AM", to: "2:00 PM" }] },
};

const buildHours = (interval: 15 | 30 | 60): string[] => {
  const hours: string[] = [];
  for (let totalMin = 6 * 60; totalMin <= 22 * 60; totalMin += interval) {
    const h24 = Math.floor(totalMin / 60);
    const m   = totalMin % 60;
    const period = h24 < 12 ? "AM" : "PM";
    const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
    hours.push(`${h12}:${String(m).padStart(2, "0")} ${period}`);
  }
  return hours;
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface WeeklySchedulePickerProps {
  value: WeeklySchedule;
  onChange: (v: WeeklySchedule) => void;
  interval?: 15 | 30 | 60;
  /**
   * isEditing = undefined → always in edit mode (for onboarding / form fields)
   * isEditing = false     → view/summary mode  (controlled by parent)
   * isEditing = true      → edit mode          (controlled by parent)
   */
  isEditing?: boolean;
}

// ─── TimeSelect ───────────────────────────────────────────────────────────────
const TimeSelect = ({
  value,
  onChange,
  hours,
}: {
  value: string;
  onChange: (v: string) => void;
  hours: string[];
}) => {
  const opts = hours.includes(value) ? hours : [value, ...hours];
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 flex-1 min-w-0"
    >
      {opts.map((h) => (
        <option key={h} value={h}>
          {h}
        </option>
      ))}
    </select>
  );
};

// ─── View summary ─────────────────────────────────────────────────────────────
const ScheduleSummary = ({ value }: { value: WeeklySchedule }) => (
  <div className="divide-y rounded-xl border overflow-hidden">
    {SCHEDULE_DAYS.map((day) => {
      const d = value[day] ?? { open: false, slots: [] };
      return (
        <div
          key={day}
          className={`flex items-center gap-4 px-4 py-2.5 text-sm ${d.open ? "" : "bg-secondary/20"}`}
        >
          <span
            className={`w-10 font-semibold text-xs shrink-0 ${
              d.open ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {day}
          </span>
          {d.open && d.slots.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {d.slots.map((s, i) => (
                <span key={i} className="text-xs text-foreground">
                  {i > 0 && <span className="text-muted-foreground/40 mr-2">·</span>}
                  {s.from} – {s.to}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground/50 italic">Cerrado</span>
          )}
        </div>
      );
    })}
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
const WeeklySchedulePicker = ({ value, onChange, isEditing, interval = 30 }: WeeklySchedulePickerProps) => {
  const alwaysEdit = isEditing === undefined;
  const editing = alwaysEdit || isEditing === true;
  const hours = buildHours(interval);

  const [copySource, setCopySource] = useState<string | null>(null);
  const [copyTargets, setCopyTargets] = useState<string[]>([]);

  if (!editing) {
    return <ScheduleSummary value={value} />;
  }

  // ── Helpers ──
  const update = (day: string, patch: Partial<DaySchedule>) =>
    onChange({ ...value, [day]: { ...(value[day] ?? DEFAULT_WEEKLY_SCHEDULE[day]), ...patch } });

  const toggleDay = (day: string) => {
    if (copySource) return;
    const d = value[day] ?? DEFAULT_WEEKLY_SCHEDULE[day];
    update(day, { open: !d.open });
  };

  const updateSlot = (day: string, idx: number, field: keyof DaySlot, val: string) => {
    const d = value[day] ?? DEFAULT_WEEKLY_SCHEDULE[day];
    const slots = [...d.slots];
    slots[idx] = { ...slots[idx], [field]: val };
    update(day, { slots });
  };

  const addSlot = (day: string) => {
    const d = value[day] ?? DEFAULT_WEEKLY_SCHEDULE[day];
    update(day, { slots: [...d.slots, { from: "2:00 PM", to: "6:00 PM" }] });
  };

  const removeSlot = (day: string, idx: number) => {
    const d = value[day] ?? DEFAULT_WEEKLY_SCHEDULE[day];
    const slots = d.slots.filter((_, i) => i !== idx);
    update(day, { slots: slots.length ? slots : [{ from: "9:00 AM", to: "6:00 PM" }] });
  };

  // ── Copy/paste ──
  const toggleCopyTarget = (day: string) =>
    setCopyTargets((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );

  const applyPaste = () => {
    if (!copySource || !copyTargets.length) return;
    const srcSlots = (value[copySource] ?? DEFAULT_WEEKLY_SCHEDULE[copySource]).slots;
    const next = { ...value };
    copyTargets.forEach((day) => {
      next[day] = { ...(next[day] ?? DEFAULT_WEEKLY_SCHEDULE[day]), slots: srcSlots.map((s) => ({ ...s })) };
    });
    onChange(next);
    setCopySource(null);
    setCopyTargets([]);
  };

  const cancelCopy = () => { setCopySource(null); setCopyTargets([]); };

  const inCopyMode = copySource !== null;
  const srcDay = copySource ? (value[copySource] ?? DEFAULT_WEEKLY_SCHEDULE[copySource]) : null;

  return (
    <div className="rounded-xl border overflow-hidden divide-y">
      {SCHEDULE_DAYS.map((day) => {
        const d = value[day] ?? DEFAULT_WEEKLY_SCHEDULE[day];
        const { open, slots } = d;

        const isCopySrc = copySource === day;
        const isTarget = copyTargets.includes(day);
        const isOther = inCopyMode && !isCopySrc;

        return (
          <div
            key={day}
            className={`px-4 py-3 transition-colors ${
              isCopySrc
                ? "bg-primary/5"
                : isTarget
                ? "bg-primary/8"
                : open
                ? ""
                : "bg-secondary/20"
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Day toggle */}
              <button
                type="button"
                onClick={() => toggleDay(day)}
                disabled={isOther}
                className={`text-xs font-semibold rounded-md px-3 py-1.5 border transition-all w-12 shrink-0 mt-0.5 ${
                  open
                    ? "bg-primary text-white border-primary"
                    : "bg-background text-muted-foreground border-border"
                } ${isOther ? "opacity-40 cursor-default" : ""}`}
              >
                {day}
              </button>

              {/* Content */}
              {open ? (
                <div className="flex-1 space-y-1.5">
                  {slots.map((slot, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <TimeSelect value={slot.from} onChange={(v) => updateSlot(day, idx, "from", v)} hours={hours} />
                      <span className="text-muted-foreground text-sm shrink-0">–</span>
                      <TimeSelect value={slot.to} onChange={(v) => updateSlot(day, idx, "to", v)} hours={hours} />
                      {slots.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSlot(day, idx)}
                          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ))}

                  {!inCopyMode && (
                    <button
                      type="button"
                      onClick={() => addSlot(day)}
                      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Plus size={11} /> Añadir horario
                    </button>
                  )}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground/40 italic mt-1.5">Cerrado</span>
              )}

              {/* Copy/paste actions */}
              <div className="shrink-0 flex items-start pt-1">
                {isCopySrc ? (
                  <span className="text-[10px] text-primary font-semibold">Origen</span>
                ) : isOther && open ? (
                  <button
                    type="button"
                    onClick={() => toggleCopyTarget(day)}
                    className={`text-[10px] font-semibold border rounded-md px-2 py-1 transition-all ${
                      isTarget
                        ? "bg-primary text-white border-primary"
                        : "text-muted-foreground border-border hover:border-primary/40 hover:text-primary"
                    }`}
                  >
                    {isTarget ? <Check size={11} /> : "Seleccionar"}
                  </button>
                ) : !inCopyMode && open ? (
                  <button
                    type="button"
                    title="Copiar horarios a otros días"
                    onClick={() => { setCopySource(day); setCopyTargets([]); }}
                    className="p-1.5 rounded-md text-muted-foreground/30 hover:text-primary hover:bg-primary/5 transition-colors"
                  >
                    <Copy size={13} />
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}

      {/* Copy mode action bar */}
      {inCopyMode && srcDay && (
        <div className="px-4 py-3 bg-primary/5 flex items-center justify-between gap-4">
          <p className="text-[11px] text-primary font-medium">
            Copiando <strong>{copySource}</strong>:{" "}
            {srcDay.slots.map((s) => `${s.from} – ${s.to}`).join(", ")}
            {copyTargets.length > 0 && (
              <span className="text-muted-foreground font-normal ml-1">
                → {copyTargets.join(", ")}
              </span>
            )}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={cancelCopy}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={applyPaste}
              disabled={!copyTargets.length}
              className="text-[11px] font-semibold bg-primary text-white px-3 py-1.5 rounded-lg disabled:opacity-40 hover:bg-primary/90 transition-colors"
            >
              Aplicar a {copyTargets.length > 0 ? `${copyTargets.length} día${copyTargets.length > 1 ? "s" : ""}` : "días seleccionados"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklySchedulePicker;
