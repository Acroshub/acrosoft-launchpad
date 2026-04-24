import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Loader2, Check, Clock, Calendar } from "lucide-react";
import { usePublicCalendar, usePublicAppointments, usePublicBlockedSlots, usePublicForm, usePublicBusinessProfile } from "@/hooks/useCrmData";
import type { CrmBlockedSlot } from "@/lib/supabase";
import type { WeeklySchedule } from "@/components/shared/WeeklySchedulePicker";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS_ES   = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];
const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const SCHEDULE_KEY = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// ─── Availability helpers ─────────────────────────────────────────────────────

const amPmToMinutes = (t: string): number => {
  const [timePart, period] = t.split(" ");
  const [h, m] = timePart.split(":").map(Number);
  const h24 = period === "AM" ? (h === 12 ? 0 : h) : (h === 12 ? 12 : h + 12);
  return h24 * 60 + (m || 0);
};

const isSlotAvailable = (avail: WeeklySchedule | null | undefined, dayOfWeek: number, hour: number, minute: number): boolean => {
  if (!avail) return true;
  const day = (avail as any)[SCHEDULE_KEY[dayOfWeek]];
  if (!day?.open) return false;
  const totalMin = hour * 60 + minute;
  return (day.slots as { from: string; to: string }[]).some(
    (slot) => totalMin >= amPmToMinutes(slot.from) && totalMin < amPmToMinutes(slot.to),
  );
};

const isDayOpen = (avail: WeeklySchedule | null | undefined, dayOfWeek: number): boolean => {
  if (!avail) return true;
  return !!(avail as any)[SCHEDULE_KEY[dayOfWeek]]?.open;
};

const isSlotBlocked = (
  blocked: CrmBlockedSlot[],
  dayKey: string,
  hour: number,
  minute = 0,
): boolean =>
  blocked.some((b) => {
    if (b.type === "hours" && b.date === dayKey && b.start_hour != null && b.end_hour != null) {
      const slotStart  = hour * 60 + minute;
      const startTotal = b.start_hour * 60 + (b.start_minute ?? 0);
      const endTotal   = b.end_hour   * 60 + (b.end_minute   ?? 0);
      return slotStart >= startTotal && slotStart < endTotal;
    }
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

const formatSlot = (h: number, m: number): string => {
  const mm = String(m).padStart(2, "0");
  if (h === 0)  return `12:${mm} AM`;
  if (h < 12)  return `${h}:${mm} AM`;
  if (h === 12) return `12:${mm} PM`;
  return `${h - 12}:${mm} PM`;
};

// ─── Step indicator ───────────────────────────────────────────────────────────

const StepLabel = ({
  number,
  label,
  primaryColor,
}: {
  number: number;
  label: string;
  primaryColor: string;
}) => (
  <div className="flex items-center gap-2.5 mb-3 md:mb-2">
    <span
      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
      style={{ backgroundColor: primaryColor }}
    >
      {number}
    </span>
    <span className="text-sm font-semibold text-gray-700">{label}</span>
  </div>
);

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
  "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-gray-400 transition-colors bg-white";

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
  selectedMinute: number;
  calendarName: string;
  durationMin: number;
  primaryColor: string;
  onSuccess: () => void;
  onBack: () => void;
}

const BookingForm = ({
  calendarId,
  linkedFormId,
  selectedDate,
  selectedHour,
  selectedMinute,
  calendarName,
  durationMin,
  primaryColor,
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
        body: JSON.stringify({ calendar_id: calendarId, date: selectedDate, hour: selectedHour, minute: selectedMinute, form_data: values }),
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
  const dateLabel = `${d} de ${MONTHS_ES[m - 1]}, ${y}`;

  return (
    <div className="space-y-6 font-sans">
      {/* Appointment summary */}
      <div
        className="rounded-lg px-4 py-3.5 border-l-4"
        style={{ borderLeftColor: primaryColor, backgroundColor: `${primaryColor}08` }}
      >
        <p className="text-sm font-semibold text-gray-800">{calendarName}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <Calendar size={11} className="text-gray-400" />
          <p className="text-xs text-gray-500">{dateLabel}</p>
          <span className="text-gray-300 text-xs">·</span>
          <Clock size={11} className="text-gray-400" />
          <p className="text-xs text-gray-500">{formatSlot(selectedHour, selectedMinute)}</p>
          <span className="text-gray-300 text-xs">·</span>
          <p className="text-xs text-gray-500">{durationMin} min</p>
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-3.5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tus datos</p>
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
        <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex gap-2.5">
        <button
          onClick={onBack}
          className="flex-none border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
        >
          ← Volver
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          style={{ backgroundColor: primaryColor }}
          className="flex-1 text-white rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-50 transition-all hover:opacity-90"
        >
          {isSubmitting ? "Confirmando…" : "Confirmar cita"}
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
  const [selectedSlot, setSelectedSlot] = useState<{ hour: number; minute: number } | null>(null);
  const [step, setStep] = useState<"calendar" | "form" | "success">("calendar");

  const { data: calendar, isLoading } = usePublicCalendar(calendarId);
  const userId = (calendar as any)?.user_id as string | undefined;

  // Always use the resolved UUID from the calendar record, not the raw prop.
  // The prop may be a slug (e.g. "acrosoft-pruebas"). Passing a slug to
  // usePublicAppointments / usePublicBlockedSlots would make Supabase try to
  // compare a text slug against a uuid column → 400 error.
  const resolvedCalendarId = calendar?.id ?? null;

  const { data: appointments = [] } = usePublicAppointments(resolvedCalendarId, viewYear, viewMonth);
  const { data: blockedSlots   = [] } = usePublicBlockedSlots(resolvedCalendarId);
  const { data: branding } = usePublicBusinessProfile(userId);

  const primaryColor = branding?.color_primary ?? "#3b82f6";

  const avail = useMemo((): WeeklySchedule | null => {
    const raw = calendar?.availability;
    if (!raw || typeof raw !== "object") return null;
    return raw as unknown as WeeklySchedule;
  }, [calendar]);

  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const isCurrentMonth =
    viewYear === today.getFullYear() && viewMonth === today.getMonth();

  const slotStep        = (calendar as any)?.duration_min      ?? 30;
  const bufferMin       = (calendar as any)?.buffer_min        ?? 0;
  const minAdvanceHours = (calendar as any)?.min_advance_hours ?? 1;
  const maxFutureDays   = (calendar as any)?.max_future_days   ?? 60;

  // Absolute cutoff: slots before this timestamp cannot be booked
  const minBookableMs = today.getTime() + minAdvanceHours * 3600 * 1000;

  // Last bookable date key
  const maxDate    = new Date(today.getFullYear(), today.getMonth(), today.getDate() + maxFutureDays);
  const maxDateKey = toDateKey(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());

  const appointmentsByDate = useMemo(() => {
    const map: Record<string, { startMin: number; endMin: number }[]> = {};
    for (const a of appointments) {
      if (!map[a.date]) map[a.date] = [];
      const start = a.hour * 60 + (a.minute ?? 0);
      map[a.date].push({ startMin: start, endMin: start + (a.duration_min ?? slotStep) });
    }
    return map;
  }, [appointments, slotStep]);

  const isBufferBlocked = (dateKey: string, candidateStart: number, candidateDur: number): boolean => {
    const appts = appointmentsByDate[dateKey];
    if (!appts) return false;
    const candidateEnd = candidateStart + candidateDur;
    return appts.some(({ startMin, endMin }) =>
      candidateEnd + bufferMin > startMin && endMin + bufferMin > candidateStart,
    );
  };

  const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  const isDayAvailable = (day: number) => {
    const key = toDateKey(viewYear, viewMonth, day);
    if (key < todayKey) return false;
    if (key > maxDateKey) return false;
    if (isDayBlockedFully(blockedSlots, key)) return false;
    const dow = new Date(viewYear, viewMonth, day).getDay();
    if (!isDayOpen(avail, dow)) return false;
    for (let totalMin = 6 * 60; totalMin < 21 * 60; totalMin += slotStep) {
      const h  = Math.floor(totalMin / 60);
      const m  = totalMin % 60;
      const slotMs = new Date(viewYear, viewMonth, day, h, m).getTime();
      if (slotMs < minBookableMs) continue;
      if (!isSlotAvailable(avail, dow, h, m)) continue;
      if (isBufferBlocked(key, totalMin, slotStep)) continue;
      if (isSlotBlocked(blockedSlots, key, h, m)) continue;
      return true;
    }
    return false;
  };

  const availableSlots = useMemo(() => {
    if (!selectedDate) return [];
    const [y, m, d] = selectedDate.split("-").map(Number);
    const dayOfWeek = new Date(y, m - 1, d).getDay();

    const slots: { hour: number; minute: number }[] = [];
    for (let totalMin = 6 * 60; totalMin < 21 * 60; totalMin += slotStep) {
      const h      = Math.floor(totalMin / 60);
      const mn     = totalMin % 60;
      const slotMs = new Date(y, m - 1, d, h, mn).getTime();
      if (slotMs < minBookableMs) continue;
      if (!isSlotAvailable(avail, dayOfWeek, h, mn)) continue;
      if (isBufferBlocked(selectedDate, totalMin, slotStep)) continue;
      if (isSlotBlocked(blockedSlots, selectedDate, h, mn)) continue;
      slots.push({ hour: h, minute: mn });
    }
    return slots;
  }, [selectedDate, avail, appointmentsByDate, blockedSlots, minBookableMs, slotStep, bufferMin]);

  // First day of the next view-month — used to block navigation past maxFutureDays
  const nextMonthFirstKey = (() => {
    const nm = viewMonth === 11 ? 0 : viewMonth + 1;
    const ny = viewMonth === 11 ? viewYear + 1 : viewYear;
    return toDateKey(ny, nm, 1);
  })();
  const isLastAllowedMonth = nextMonthFirstKey > maxDateKey;

  const prevMonth = () => {
    if (isCurrentMonth) return;
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
    setSelectedDate(null); setSelectedSlot(null);
  };

  const nextMonth = () => {
    if (isLastAllowedMonth) return;
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
    setSelectedDate(null); setSelectedSlot(null);
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={20} className="animate-spin" style={{ color: primaryColor }} />
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
      <div className="text-center py-12 space-y-5 font-sans">
        <div
          className="mx-auto w-14 h-14 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${primaryColor}15` }}
        >
          <Check size={26} strokeWidth={2.5} style={{ color: primaryColor }} />
        </div>
        <div className="space-y-1.5">
          <p className="text-lg font-bold text-gray-900">¡Cita confirmada!</p>
          <p className="text-sm text-gray-400 max-w-xs mx-auto">
            Hemos registrado tu solicitud. Nuestro equipo se pondrá en contacto contigo pronto.
          </p>
        </div>
      </div>
    );
  }

  // ── Booking form ────────────────────────────────────────────────────────────
  if (step === "form" && selectedDate && selectedSlot !== null) {
    return (
      <BookingForm
        calendarId={resolvedCalendarId ?? calendarId}
        linkedFormId={calendar.linked_form_id}
        selectedDate={selectedDate}
        selectedHour={selectedSlot.hour}
        selectedMinute={selectedSlot.minute}
        calendarName={calendar.name ?? "Cita"}
        durationMin={calendar.duration_min ?? 30}
        primaryColor={primaryColor}
        onSuccess={() => setStep("success")}
        onBack={() => setStep("calendar")}
      />
    );
  }

  // ── Calendar picker ─────────────────────────────────────────────────────────
  return (
    <div className="font-sans space-y-0" style={{ borderTop: `3px solid ${primaryColor}` }}>

      {/* ── Service header ── */}
      <div className="pt-5 pb-4 md:pt-4 md:pb-3 space-y-2.5">
        <h2 className="text-xl font-bold text-gray-900 leading-tight">
          {calendar.name ?? "Reservar cita"}
        </h2>
        {calendar.description && (
          <p className="text-sm text-gray-500 leading-relaxed">{calendar.description}</p>
        )}
        {/* Duration badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: `${primaryColor}12`, color: primaryColor }}
          >
            <Clock size={11} strokeWidth={2.5} />
            {calendar.duration_min ?? 30} min por sesión
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
            <Calendar size={11} strokeWidth={2} />
            Agenda online
          </span>
        </div>
      </div>

      <div className="border-t border-gray-100" />

      {/* ── Step 1 + Step 2 side by side ── */}
      <div className="pt-4 md:pt-3 flex gap-0 items-stretch">

        {/* Left column: calendar */}
        <div className="flex-1 min-w-0 pb-1">
          <StepLabel number={1} label="Elige una fecha" primaryColor={primaryColor} />

          {/* Month nav */}
          <div className="flex items-center justify-between mb-3 md:mb-2">
            <span className="text-sm font-semibold text-gray-800">
              {MONTHS_ES[viewMonth]} {viewYear}
            </span>
            <div className="flex items-center gap-0.5">
              <button
                onClick={prevMonth}
                disabled={isCurrentMonth}
                className={[
                  "w-7 h-7 flex items-center justify-center rounded-md transition-colors",
                  isCurrentMonth
                    ? "text-gray-200 cursor-not-allowed"
                    : "text-gray-400 hover:bg-gray-100 hover:text-gray-700",
                ].join(" ")}
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={nextMonth}
                disabled={isLastAllowedMonth}
                className={[
                  "w-7 h-7 flex items-center justify-center rounded-md transition-colors",
                  isLastAllowedMonth
                    ? "text-gray-200 cursor-not-allowed"
                    : "text-gray-400 hover:bg-gray-100 hover:text-gray-700",
                ].join(" ")}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1.5">
            {DAYS_ES.map((d) => (
              <div key={d} className="text-center text-[10px] text-gray-300 uppercase tracking-widest py-1 font-semibold">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-y-1">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day     = i + 1;
              const key     = toDateKey(viewYear, viewMonth, day);
              const avbl    = isDayAvailable(day);
              const sel     = key === selectedDate;
              const isToday = key === todayKey;
              const isPast  = key < todayKey;

              return (
                <button
                  key={day}
                  onClick={() => { if (avbl) { setSelectedDate(key); setSelectedSlot(null); } }}
                  disabled={!avbl}
                  style={
                    sel
                      ? { backgroundColor: primaryColor }
                      : isToday && avbl
                      ? { boxShadow: `inset 0 0 0 1.5px ${primaryColor}`, color: primaryColor }
                      : undefined
                  }
                  className={[
                    "h-12 w-full flex items-center justify-center text-xs rounded-md transition-all",
                    sel     ? "text-white font-bold"                                    : "",
                    !sel && avbl && !isToday ? "text-gray-700 hover:bg-gray-100 cursor-pointer font-medium" : "",
                    !sel && avbl && isToday  ? "font-bold cursor-pointer hover:opacity-80"                  : "",
                    isPast           ? "text-gray-200 cursor-not-allowed"               : "",
                    !avbl && !isPast ? "text-gray-200 cursor-not-allowed"               : "",
                  ].join(" ")}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right column: slides in from right when a date is selected */}
        <div
          className="shrink-0 flex flex-col overflow-hidden transition-all duration-300 ease-in-out"
          style={{
            width:       selectedDate ? 108 : 0,
            paddingLeft: selectedDate ? 16  : 0,
            marginLeft:  selectedDate ? 16  : 0,
            opacity:     selectedDate ? 1   : 0,
            borderLeftWidth: selectedDate ? 1 : 0,
            borderLeftColor: '#f3f4f6',
            borderLeftStyle: 'solid',
          }}
        >
          <StepLabel number={2} label="Horario" primaryColor={primaryColor} />
          {availableSlots.length === 0 ? (
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Sin disponibilidad.<br />Elige otra fecha.
            </p>
          ) : (
            <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-0.5">
              {availableSlots.map(({ hour: h, minute: m }) => {
                const isSelected = selectedSlot?.hour === h && selectedSlot?.minute === m;
                return (
                  <button
                    key={`${h}:${m}`}
                    onClick={() => setSelectedSlot({ hour: h, minute: m })}
                    style={isSelected ? { backgroundColor: primaryColor, borderColor: primaryColor } : undefined}
                    className={[
                      "w-full text-center py-2 rounded-lg text-xs font-medium transition-all border shrink-0",
                      isSelected
                        ? "text-white"
                        : "border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900 bg-white",
                    ].join(" ")}
                  >
                    {formatSlot(h, m)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── CTA ── */}
      {selectedDate && selectedSlot !== null && (
        <div className="pt-4">
          <button
            onClick={() => setStep("form")}
            style={{ backgroundColor: primaryColor }}
            className="w-full text-white rounded-lg py-3 text-sm font-semibold transition-all hover:opacity-90 flex items-center justify-center gap-2"
          >
            Continuar con {formatSlot(selectedSlot.hour, selectedSlot.minute)}
            <ChevronRight size={15} strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  );
};

export default CalendarRenderer;
