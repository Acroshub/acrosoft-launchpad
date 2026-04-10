import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Loader2, Check } from "lucide-react";
import { usePublicCalendar, usePublicAppointments, usePublicBlockedSlots, usePublicForm } from "@/hooks/useCrmData";
import type { CrmCalendarConfig, CrmBlockedSlot } from "@/lib/supabase";
import type { WeeklySchedule } from "@/components/shared/WeeklySchedulePicker";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS_ES   = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];
const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const SCHEDULE_KEY = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// ─── Availability helpers ─────────────────────────────────────────────────────

const amPmToHour = (t: string): number => {
  const [timePart, period] = t.split(" ");
  const [h] = timePart.split(":").map(Number);
  if (period === "AM") return h === 12 ? 0 : h;
  return h === 12 ? 12 : h + 12;
};

const isHourAvailable = (avail: WeeklySchedule | null | undefined, dayOfWeek: number, hour: number): boolean => {
  if (!avail) return true;
  const day = (avail as any)[SCHEDULE_KEY[dayOfWeek]];
  if (!day?.open) return false;
  return (day.slots as { from: string; to: string }[]).some(
    (slot) => hour >= amPmToHour(slot.from) && hour < amPmToHour(slot.to),
  );
};

const isDayOpen = (avail: WeeklySchedule | null | undefined, dayOfWeek: number): boolean => {
  if (!avail) return true;
  return !!(avail as any)[SCHEDULE_KEY[dayOfWeek]]?.open;
};

const isSlotBlocked = (blocked: CrmBlockedSlot[], dayKey: string, hour: number): boolean =>
  blocked.some((b) => {
    if (b.type === "hours" && b.date === dayKey && b.start_hour != null && b.end_hour != null)
      return hour >= b.start_hour && hour < b.end_hour;
    if (b.type === "fullday" && b.date === dayKey) return true;
    if (b.type === "range" && b.range_start && b.range_end)
      return dayKey >= b.range_start && dayKey <= b.range_end;
    return false;
  });

const isDayBlockedFully = (blocked: CrmBlockedSlot[], dayKey: string): boolean =>
  blocked.some((b) => {
    if (b.type === "fullday" && b.date === dayKey) return true;
    if (b.type === "range" && b.range_start && b.range_end)
      return dayKey >= b.range_start && dayKey <= b.range_end;
    return false;
  });

const toDateKey = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const formatHour = (h: number) => {
  if (h === 0) return "12:00 AM";
  if (h < 12) return `${h}:00 AM`;
  if (h === 12) return "12:00 PM";
  return `${h - 12}:00 PM`;
};

// ─── Field ────────────────────────────────────────────────────────────────────

const Field = ({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) => (
  <div className="space-y-1">
    <label className="block text-xs font-medium text-gray-500">
      {label}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const inputCls =
  "w-full border border-gray-200 rounded px-3 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-gray-400 transition-colors bg-white";

// ─── Booking Form ─────────────────────────────────────────────────────────────

const defaultBookingFields = [
  { id: "f-name",  label: "Nombre",             type: "text",  required: true,  placeholder: "Tu nombre completo" },
  { id: "f-email", label: "Correo electrónico",  type: "email", required: true,  placeholder: "hola@ejemplo.com"  },
  { id: "f-phone", label: "WhatsApp / Teléfono", type: "phone", required: false, placeholder: "+1 (000) 000-0000" },
];

interface BookingFormProps {
  calendarId: string;
  linkedFormId: string | null;
  selectedDate: string;
  selectedHour: number;
  calendarName: string;
  durationMin: number;
  onSuccess: () => void;
  onBack: () => void;
}

const BookingForm = ({
  calendarId,
  linkedFormId,
  selectedDate,
  selectedHour,
  calendarName,
  durationMin,
  onSuccess,
  onBack,
}: BookingFormProps) => {
  const { data: form } = usePublicForm(linkedFormId ?? "");
  const [values, setValues] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fields = useMemo(() => {
    if (!form?.fields) return defaultBookingFields;
    const f = (form.fields as any[]).filter(
      (f: any) => ["text", "email", "phone", "textarea"].includes(f.type),
    );
    return f.length > 0 ? f : defaultBookingFields;
  }, [form]);

  const handleSubmit = async () => {
    const missing = fields.filter((f: any) => f.required && !values[f.id]?.trim());
    if (missing.length > 0) {
      setError(`Completa los campos requeridos: ${missing.map((f: any) => f.label).join(", ")}`);
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crm-calendar-book`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ calendar_id: calendarId, date: selectedDate, hour: selectedHour, form_data: values }),
      });
      if (!res.ok) throw new Error((await res.json())?.error ?? "Error al agendar");
      onSuccess();
    } catch (e: any) {
      setError(e.message ?? "Hubo un problema. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const [y, m, d] = selectedDate.split("-").map(Number);
  const dateDisplay = `${d} de ${MONTHS_ES[m - 1]}, ${y}`;

  return (
    <div className="space-y-5">
      {/* Appointment summary */}
      <div className="border border-gray-100 rounded bg-gray-50 px-4 py-3 text-sm">
        <p className="font-medium text-gray-800">{calendarName}</p>
        <p className="text-gray-400 text-xs mt-0.5">{dateDisplay} · {formatHour(selectedHour)} · {durationMin} min</p>
      </div>

      {/* Fields */}
      <div className="space-y-3">
        {fields.map((field: any) => (
          <Field key={field.id} label={field.label} required={field.required}>
            {field.type === "textarea" ? (
              <textarea
                value={values[field.id] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [field.id]: e.target.value }))}
                placeholder={field.placeholder ?? ""}
                rows={3}
                className={`${inputCls} resize-none`}
              />
            ) : (
              <input
                type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
                value={values[field.id] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [field.id]: e.target.value }))}
                placeholder={field.placeholder ?? ""}
                className={inputCls}
              />
            )}
          </Field>
        ))}
      </div>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded px-3 py-2">{error}</p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={onBack}
          className="flex-1 border border-gray-200 rounded px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
        >
          ← Cambiar horario
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-1 bg-gray-900 text-white rounded px-4 py-2.5 text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? "Agendando…" : "Confirmar cita"}
        </button>
      </div>
    </div>
  );
};

// ─── Main CalendarRenderer ────────────────────────────────────────────────────

const CalendarRenderer = ({ calendarId }: { calendarId: string }) => {
  const today = new Date();
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [step, setStep] = useState<"calendar" | "form" | "success">("calendar");

  const { data: calendar, isLoading } = usePublicCalendar(calendarId);
  const userId = (calendar as any)?.user_id as string | undefined;

  const { data: appointments = [] } = usePublicAppointments(userId, viewYear, viewMonth);
  const { data: blockedSlots   = [] } = usePublicBlockedSlots(userId);

  const avail = useMemo((): WeeklySchedule | null => {
    const raw = calendar?.availability;
    if (!raw || typeof raw !== "object") return null;
    return raw as unknown as WeeklySchedule;
  }, [calendar]);

  const firstDay   = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const bookedMap = useMemo(() => {
    const map: Record<string, Set<number>> = {};
    for (const a of appointments) {
      if (!map[a.date]) map[a.date] = new Set();
      map[a.date].add(a.hour);
    }
    return map;
  }, [appointments]);

  const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  const isDayAvailable = (day: number) => {
    const key = toDateKey(viewYear, viewMonth, day);
    if (key < todayKey) return false;
    if (isDayBlockedFully(blockedSlots, key)) return false;
    return isDayOpen(avail, new Date(viewYear, viewMonth, day).getDay());
  };

  const availableHours = useMemo(() => {
    if (!selectedDate) return [];
    const [y, m, d] = selectedDate.split("-").map(Number);
    const dayOfWeek  = new Date(y, m - 1, d).getDay();
    const booked     = bookedMap[selectedDate] ?? new Set<number>();
    const isToday    = selectedDate === todayKey;
    const nowHour    = today.getHours();

    const hours: number[] = [];
    for (let h = 6; h <= 21; h++) {
      if (isToday && h <= nowHour) continue;
      if (!isHourAvailable(avail, dayOfWeek, h)) continue;
      if (booked.has(h)) continue;
      if (isSlotBlocked(blockedSlots, selectedDate, h)) continue;
      hours.push(h);
    }
    return hours;
  }, [selectedDate, avail, bookedMap, blockedSlots, todayKey]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
    setSelectedDate(null); setSelectedHour(null);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
    setSelectedDate(null); setSelectedHour(null);
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin text-gray-300" />
      </div>
    );
  }

  if (!calendar) {
    return (
      <p className="text-center py-10 text-sm text-gray-400">No se pudo cargar el calendario.</p>
    );
  }

  // ── Success ─────────────────────────────────────────────────────────────────
  if (step === "success") {
    return (
      <div className="text-center py-10 space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full border-2 border-gray-900 flex items-center justify-center">
          <Check size={22} strokeWidth={2.5} className="text-gray-900" />
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-base">Cita confirmada</p>
          <p className="text-sm text-gray-400 mt-1">Nuestro equipo se pondrá en contacto pronto.</p>
        </div>
      </div>
    );
  }

  // ── Booking form ────────────────────────────────────────────────────────────
  if (step === "form" && selectedDate && selectedHour !== null) {
    return (
      <BookingForm
        calendarId={calendarId}
        linkedFormId={calendar.linked_form_id}
        selectedDate={selectedDate}
        selectedHour={selectedHour}
        calendarName={calendar.name ?? "Cita"}
        durationMin={calendar.duration_min ?? 30}
        onSuccess={() => setStep("success")}
        onBack={() => { setStep("calendar"); }}
      />
    );
  }

  // ── Calendar picker ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 font-sans">
      {/* Service info */}
      <div className="pb-3 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-800">{calendar.name ?? "Reservar cita"}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {calendar.duration_min ?? 30} min
          {calendar.description ? ` · ${calendar.description}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-4 items-start">
        {/* Month grid */}
        <div>
          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">
              {MONTHS_ES[viewMonth]} {viewYear}
            </span>
            <div className="flex items-center gap-0.5">
              <button
                onClick={prevMonth}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={nextMonth}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS_ES.map((d) => (
              <div key={d} className="text-center text-[10px] text-gray-300 uppercase tracking-wide py-1 font-medium">
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day  = i + 1;
              const key  = toDateKey(viewYear, viewMonth, day);
              const avbl = isDayAvailable(day);
              const sel  = key === selectedDate;
              const isPast = key < todayKey;

              return (
                <button
                  key={day}
                  onClick={() => { if (avbl) { setSelectedDate(key); setSelectedHour(null); }}}
                  disabled={!avbl}
                  className={[
                    "aspect-square flex items-center justify-center text-xs rounded transition-colors",
                    sel   ? "bg-gray-900 text-white font-semibold"               : "",
                    !sel && avbl  ? "text-gray-800 hover:bg-gray-100 cursor-pointer font-medium" : "",
                    !avbl && !isPast ? "text-gray-200 cursor-not-allowed"        : "",
                    isPast          ? "text-gray-200 cursor-not-allowed"         : "",
                  ].join(" ")}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time slots */}
        {selectedDate && (
          <div className="w-24 space-y-1 pt-0.5">
            <p className="text-[10px] uppercase tracking-wide text-gray-300 font-medium mb-2">Hora</p>
            {availableHours.length === 0 ? (
              <p className="text-[11px] text-gray-300 leading-relaxed">Sin disponibilidad este día</p>
            ) : (
              availableHours.map((h) => (
                <button
                  key={h}
                  onClick={() => setSelectedHour(h)}
                  className={[
                    "w-full text-center py-1.5 rounded text-xs transition-colors border",
                    selectedHour === h
                      ? "bg-gray-900 text-white border-gray-900 font-semibold"
                      : "border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900",
                  ].join(" ")}
                >
                  {formatHour(h)}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Confirm button — appears only when both date + hour are selected */}
      {selectedDate && selectedHour !== null && (
        <div className="pt-2 border-t border-gray-100">
          <button
            onClick={() => setStep("form")}
            className="w-full bg-gray-900 text-white rounded py-2.5 text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            Continuar con {formatHour(selectedHour)} →
          </button>
        </div>
      )}
    </div>
  );
};

export default CalendarRenderer;
