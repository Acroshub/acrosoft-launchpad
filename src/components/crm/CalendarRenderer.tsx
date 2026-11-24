import { useState, useMemo, useEffect, useRef } from "react";
import PhoneInput from "@/components/shared/PhoneInput";
import WhatsAppIcon from "@/components/shared/WhatsAppIcon";
import { ChevronLeft, ChevronRight, Loader2, Check, Clock, Calendar, Globe } from "lucide-react";
import { widgetTranslations } from "@/i18n/widgets";
import type { WidgetLang } from "@/hooks/useLangWidget";
import { usePublicCalendar, usePublicAppointments } from "@/hooks/useCrmData";
import { wallClockToUtcMs, formatSlotInTz } from "@/lib/slotTime";
import { LEGAL } from "@/lib/legal";
import type { CrmBlockedSlot } from "@/lib/supabase";
import type { WeeklySchedule } from "@/components/shared/WeeklySchedulePicker";

// ─── Facebook Pixel ───────────────────────────────────────────────────────────

declare global {
  interface Window { fbq?: (...args: unknown[]) => void; }
}

const FB_PIXEL_SCRIPT_ID = "acrosoft-fb-pixel";

const loadFbPixel = (pixelId: string) => {
  const sanitized = pixelId.replace(/\D/g, "");
  if (!sanitized) return;
  if (window.fbq) { window.fbq("init", sanitized); return; }
  if (document.getElementById(FB_PIXEL_SCRIPT_ID)) return;
  const script = document.createElement("script");
  script.id = FB_PIXEL_SCRIPT_ID;
  script.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${sanitized}');fbq('track','PageView');`;
  document.head.appendChild(script);
};

const fbTrack = (event: string) => {
  if (window.fbq) window.fbq("track", event);
};

// ─── Constants ────────────────────────────────────────────────────────────────

const SCHEDULE_KEY = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// ─── Availability helpers ─────────────────────────────────────────────────────

const amPmToMinutes = (t: string): number => {
  const [timePart, period] = t.split(" ");
  const [h, m] = timePart.split(":").map(Number);
  const h24 = period === "AM" ? (h === 12 ? 0 : h) : (h === 12 ? 12 : h + 12);
  return h24 * 60 + (m || 0);
};

const isSlotAvailable = (avail: WeeklySchedule | null | undefined, dayOfWeek: number, hour: number, minute: number, duration = 0): boolean => {
  if (!avail) return true;
  const day = (avail as any)[SCHEDULE_KEY[dayOfWeek]];
  if (!day?.open) return false;
  const totalMin = hour * 60 + minute;
  return (day.slots as { from: string; to: string }[]).some(
    (slot) => totalMin >= amPmToMinutes(slot.from) && totalMin + duration <= amPmToMinutes(slot.to),
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

const formatSlot = (h: number, m: number): string => {
  const mm = String(m).padStart(2, "0");
  if (h === 0)  return `12:${mm} AM`;
  if (h < 12)  return `${h}:${mm} AM`;
  if (h === 12) return `12:${mm} PM`;
  return `${h - 12}:${mm} PM`;
};

// Timezone utilities (wallClockToUtcMs, formatSlotInTz): viven en src/lib/slotTime.ts para compartirlas con la página final de Estimados.

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
      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
      style={{ backgroundColor: primaryColor }}
    >
      {number}
    </span>
    <span className="text-sm font-bold text-gray-800">{label}</span>
  </div>
);

// ─── Field ────────────────────────────────────────────────────────────────────

const Field = ({
  label,
  required,
  error,
  children,
}: {
  label: React.ReactNode;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-1">
    <label className="block text-xs font-medium text-gray-500">
      {label}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    {children}
  </div>
);

const inputCls =
  "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-base md:text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-gray-400 transition-colors bg-white";

// ─── Booking Form ─────────────────────────────────────────────────────────────


/**
 * Datos que la página que incrusta el calendario ya conoce (p. ej. el nombre y el correo de una compra en Stripe). Esos campos no
 * se vuelven a pedir, pero SÍ viajan con la reserva: el CRM recibe el contacto completo. Sin esto el formulario es el de siempre.
 */
export interface BookingPrefill {
  name?: string;
  email?: string;
}

/**
 * Formulario propio de una página (reemplaza al del calendario): campos de texto/correo/teléfono + preguntas de confirmación Sí / No.
 * Si CUALQUIER confirmación se responde «No» no se puede reservar: el botón se bloquea y se muestra `blockedMessage`. Las respuestas viajan
 * en `form_data` como «Sí» / «No» bajo el id de cada confirmación. No usa `prefill` ni `requireWhatsapp`.
 */
export interface BookingQualification {
  fields: { id: string; label: string; type: "text" | "email" | "phone"; placeholder?: string }[];
  confirmations: { id: string; text: string }[];
  blockedMessage: string;
  /** Etiqueta (slug) que el servidor agrega a los tags del contacto para saber de qué página vino. */
  source?: string;
}

/** Forma mínima de un campo del formulario de reserva (los del formulario vinculado al calendario traen más propiedades). */
interface BookingField {
  id: string;
  label?: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  locked?: boolean;
}

/** Desplaza hasta `el` (suave, salvo que la persona pida menos movimiento). Sin `scrollIntoView` (jsdom) no hace nada. */
function scrollToEl(el: Element | null | undefined, block: ScrollLogicalPosition) {
  if (!el || typeof (el as HTMLElement).scrollIntoView !== "function") return;
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  (el as HTMLElement).scrollIntoView({ behavior: reduce ? "auto" : "smooth", block });
}

interface BookingFormProps {
  calendarId: string;
  formFields: any[] | null;
  prefill?: BookingPrefill;
  /** El teléfono pasa a ser obligatorio y se llama «WhatsApp» (la persona solo escribe eso cuando nombre y correo vienen precargados). */
  requireWhatsapp?: boolean;
  /** Prefijo con el que arranca el selector de país del teléfono (ej. "+1"). Sin esto arranca en el país por defecto del selector (Bolivia). */
  phoneDefaultDial?: string;
  /** Vista previa: recorre todo el formulario pero NO reserva (no llama a crm-calendar-book): no se crea ninguna cita ni contacto. */
  previewOnly?: boolean;
  /** Formulario propio de la página con confirmaciones Sí / No (ver BookingQualification). */
  qualification?: BookingQualification;
  /**
   * Presente solo si el calendario tiene SMS activado: muestra el checkbox de consentimiento de recordatorios por SMS (opcional, sin
   * marcar de fábrica, SEPARADO de los términos). `businessName` es el negocio en cuyo nombre se mandan los mensajes.
   */
  smsConsent?: { businessName: string };
  selectedDate: string;
  selectedHour: number;
  selectedMinute: number;
  durationMin: number;
  primaryColor: string;
  calendarTz: string;
  visitorTz: string;
  /** Recibe los datos que la persona llenó (los precargados y los del formulario), para que la página los use después de reservar. */
  onSuccess: (formData: Record<string, string>) => void;
  onBack: () => void;
  lang?: WidgetLang;
}

const BookingForm = ({
  calendarId,
  formFields,
  prefill,
  requireWhatsapp = false,
  phoneDefaultDial,
  previewOnly = false,
  qualification,
  smsConsent,
  selectedDate,
  selectedHour,
  selectedMinute,
  durationMin,
  primaryColor,
  calendarTz,
  visitorTz,
  onSuccess,
  onBack,
  lang = "es",
}: BookingFormProps) => {
  const T  = widgetTranslations[lang].calendar;
  const TF = widgetTranslations[lang].form;
  const [values, setValues]           = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [smsAccepted, setSmsAccepted] = useState(false);
  // Confirmaciones Sí / No del formulario propio de la página: sin responder = undefined.
  const [answers, setAnswers] = useState<Record<string, "yes" | "no">>({});
  const [answersError, setAnswersError] = useState(false);
  // Al abrir el formulario se vuelve arriba: se ve la fecha elegida y el primer campo.
  const summaryRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollToEl(summaryRef.current, "start"); }, []);
  const failedRequirement = !!qualification && qualification.confirmations.some((c) => answers[c.id] === "no");

  const defaultBookingFields = useMemo(() => [
    { id: "f-name",  label: T.fieldName,  type: "text",  required: true,  placeholder: T.fieldNamePh  },
    { id: "f-email", label: T.fieldEmail, type: "email", required: true,  placeholder: T.fieldEmailPh },
    { id: "f-phone", label: T.fieldPhone, type: "phone", required: false, placeholder: T.fieldPhonePh },
  ], [T]);

  const fields = useMemo(() => {
    if (qualification) return qualification.fields.map((f) => ({ ...f, required: true }));
    if (!formFields) return defaultBookingFields;
    const f = (formFields as any[]).filter(
      (f: any) => ["text", "email", "phone", "textarea"].includes(f.type),
    );
    return f.length > 0 ? f : defaultBookingFields;
  }, [formFields, defaultBookingFields, qualification]);

  // Campos que la página ya conoce: no se piden otra vez, pero se envían con la reserva. Misma regla que `extractContact` de la función
  // crm-calendar-book para decidir cuál es el campo del nombre (el bloqueado o «f-name»; si no, el primero cuya etiqueta dice nombre/name)
  // y cuál el del correo (el primero de tipo email). Solo se rellena un campo de cada uno, así «Nombre de tu empresa» no recibe el nombre.
  const prefilled = useMemo(() => {
    const out: Record<string, string> = {};
    if (qualification) return out; // el formulario propio pide todo: nada viene precargado
    const name = prefill?.name?.trim();
    const email = prefill?.email?.trim();
    const all = fields as BookingField[];
    if (name) {
      const target = all.find((f) => f.type === "text" && (f.id === "f-name" || f.locked))
        ?? all.find((f) => f.type === "text" && /nombre|name/i.test(String(f.label ?? "")));
      if (target) out[target.id] = name;
    }
    if (email) {
      const target = all.find((f) => f.type === "email");
      if (target) out[target.id] = email;
    }
    return out;
  }, [fields, prefill?.name, prefill?.email, qualification]);

  // Campos que se le muestran a la persona: los precargados se omiten. Con `requireWhatsapp` se muestra ÚNICAMENTE el WhatsApp (obligatorio),
  // aunque el formulario vinculado al calendario traiga otros campos: la página ya tiene los demás datos y no debe pedirlos. El servidor
  // (crm-calendar-book) no exige los campos del formulario, solo lee nombre/correo/teléfono, así que omitirlos no rompe la reserva. Si el
  // formulario del calendario no tiene teléfono se agrega uno: sin WhatsApp la reserva no sirve de nada.
  const shownFields = useMemo(() => {
    const visible = (fields as BookingField[]).filter((f) => !(f.id in prefilled));
    if (!requireWhatsapp || qualification) return visible;
    const phones = visible.filter((f) => f.type === "phone");
    const onlyPhone: BookingField[] = phones.length > 0 ? phones : [{ id: "f-phone", label: "WhatsApp", type: "phone", required: true, placeholder: T.fieldPhonePh }];
    return onlyPhone.map((f) => ({ ...f, required: true, label: "WhatsApp" }));
  }, [fields, prefilled, requireWhatsapp, qualification, T]);

  // El checkbox de SMS solo tiene sentido si el formulario le pide teléfono a la persona (sin número no hay a quién escribir).
  const smsShown = !!smsConsent && !qualification && (shownFields as BookingField[]).some((f) => f.type === "phone");
  const smsLabel = T.smsConsent(LEGAL.brand, smsConsent?.businessName?.trim() || (lang === "en" ? "this business" : "este negocio"));
  // Páginas legales: en inglés van las dos páginas en inglés; en español, la página combinada de siempre.
  const legalLinkProps = { target: "_blank", rel: "noopener noreferrer", onClick: (e: React.MouseEvent) => e.stopPropagation() } as const;

  const validateField = (field: any, value: string): string | null => {
    const trimmed = value?.trim() ?? "";
    if (!trimmed) return null; // vacío lo maneja el check de required
    if (field.type === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return TF.invalidEmail;
    }
    if (field.type === "phone") {
      const digits = trimmed.replace(/\D/g, "");
      if (digits.length < 7) return TF.invalidPhone;
    }
    if (field.type === "url") {
      if (!/^https?:\/\/.+/.test(trimmed)) return TF.invalidUrl;
    }
    return null;
  };

  // Formulario propio: sin TODOS los datos válidos y las confirmaciones respondidas, el botón queda bloqueado (no se puede enviar a medias).
  const qualificationIncomplete = !!qualification && (
    (shownFields as BookingField[]).some((f) => {
      const v = values[f.id]?.trim() ?? "";
      return !v || validateField(f, v) !== null;
    }) || qualification.confirmations.some((c) => !answers[c.id])
  );

  const handleBlur = (fieldId: string) => {
    const field = shownFields.find((f: any) => f.id === fieldId);
    if (!field) return;
    const err = validateField(field, values[fieldId] ?? "");
    if (err) setFieldErrors(fe => ({ ...fe, [fieldId]: err }));
  };

  const handleSubmit = async () => {
    if (failedRequirement || qualificationIncomplete) return; // el botón ya está bloqueado; esto es solo una red de seguridad
    const newErrors: Record<string, string> = {};
    for (const f of shownFields as any[]) {
      const val = values[f.id]?.trim() ?? "";
      if (f.required && !val) {
        newErrors[f.id] = TF.requiredError(f.label);
      } else if (val) {
        const typeErr = validateField(f, val);
        if (typeErr) newErrors[f.id] = typeErr;
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      setSubmitError("");
      return;
    }
    if (qualification && qualification.confirmations.some((c) => !answers[c.id])) {
      setAnswersError(true);
      return;
    }
    if (!termsAccepted) {
      setTermsError(true);
      return;
    }
    setFieldErrors({});
    setSubmitError("");
    setTermsError(false);
    setIsSubmitting(true);
    const termsAt = new Date().toISOString();
    const confirmationData: Record<string, string> = Object.fromEntries(
      (qualification?.confirmations ?? []).map((c) => [c.id, answers[c.id] === "yes" ? "Sí" : "No"]),
    );
    try {
      if (previewOnly) { await new Promise((r) => setTimeout(r, 700)); onSuccess({ ...prefilled, ...values }); return; }
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crm-calendar-book`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ calendar_id: calendarId, date: selectedDate, hour: selectedHour, minute: selectedMinute, form_data: { ...prefilled, ...values, ...confirmationData }, terms_accepted_at: termsAt,
          // Consentimiento de SMS: solo si lo marcó. Se manda el texto EXACTO que vio, como prueba (el servidor la guarda en el contacto).
          ...(smsShown && smsAccepted ? { sms_consent: { accepted: true, text: `${smsLabel} ${T.smsDisclosure}` } } : {}),
          // El servidor completa los correos de reserva: la hora en la zona del visitante, el negocio y las confirmaciones; y etiqueta al contacto.
          booking_meta: {
            visitor_tz: visitorTz,
            ...(qualification?.source ? { source: qualification.source } : {}),
            ...(qualification ? { answers: qualification.confirmations.map((c) => ({ label: c.text, value: confirmationData[c.id] })) } : {}),
          },
        }),
      });
      if (!res.ok) throw new Error((await res.json())?.error ?? T.errorBooking);
      onSuccess({ ...prefilled, ...values });
    } catch (e: any) {
      setSubmitError(e.message ?? T.errorGeneral);
    } finally {
      setIsSubmitting(false);
    }
  };

  const [y, m, d] = selectedDate.split("-").map(Number);
  const dateLabel = T.dateLabel(d, T.months[m - 1], y);

  return (
    <div className="space-y-6 font-sans">
      {/* Appointment summary */}
      <div
        ref={summaryRef}
        className="rounded-lg px-4 py-3.5 border-l-4 scroll-mt-3"
        style={{ borderLeftColor: primaryColor, backgroundColor: `${primaryColor}08` }}
      >
        <p className="text-sm font-semibold text-gray-800">{T.yourDateTime}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <Calendar size={11} className="text-gray-400" />
          <p className="text-xs text-gray-500">{dateLabel}</p>
          <span className="text-gray-300 text-xs">·</span>
          <Clock size={11} className="text-gray-400" />
          <p className="text-xs text-gray-500">{formatSlotInTz(selectedDate, selectedHour, selectedMinute, calendarTz, visitorTz)}</p>
          <span className="text-gray-300 text-xs">·</span>
          <p className="text-xs text-gray-500">{durationMin} min</p>
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-3.5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{T.yourData}</p>
        {Object.keys(prefilled).length > 0 && (
          <p className="text-xs text-gray-500" data-testid="booking-prefill-note">
            {lang === "en" ? "Booking as" : "Reservando como"}{" "}
            <span className="font-medium text-gray-700">{[prefill?.name?.trim(), prefill?.email?.trim()].filter(Boolean).join(" · ")}</span>
          </p>
        )}
        {shownFields.map((field: any) => (
          <Field
            key={field.id}
            label={qualification && field.type === "phone"
              ? <span className="inline-flex items-center gap-1.5"><WhatsAppIcon className="h-4 w-4 text-[#25D366]" data-testid="whatsapp-icon" />{field.label}</span>
              : field.label}
            required={field.required}
            error={fieldErrors[field.id]}
          >
            {field.type === "textarea" ? (
              <textarea
                value={values[field.id] ?? ""}
                onChange={(e) => { setValues((v) => ({ ...v, [field.id]: e.target.value })); if (fieldErrors[field.id]) setFieldErrors(fe => ({ ...fe, [field.id]: "" })); }}
                onBlur={() => handleBlur(field.id)}
                placeholder={field.placeholder ?? ""}
                rows={3}
                className={`${inputCls} resize-none`}
              />
            ) : field.type === "phone" ? (
              <div onBlur={() => handleBlur(field.id)}>
                <PhoneInput
                  value={values[field.id] ?? (phoneDefaultDial ? `${phoneDefaultDial} ` : "")}
                  onChange={(v) => { setValues((sv) => ({ ...sv, [field.id]: v })); if (fieldErrors[field.id]) setFieldErrors(fe => ({ ...fe, [field.id]: "" })); }}
                  placeholder={field.placeholder}
                />
              </div>
            ) : (
              <input
                type={field.type === "email" ? "email" : "text"}
                value={values[field.id] ?? ""}
                onChange={(e) => { setValues((v) => ({ ...v, [field.id]: e.target.value })); if (fieldErrors[field.id]) setFieldErrors(fe => ({ ...fe, [field.id]: "" })); }}
                onBlur={() => handleBlur(field.id)}
                placeholder={field.placeholder ?? ""}
                className={inputCls}
              />
            )}
          </Field>
        ))}
      </div>

      {submitError && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{submitError}</p>
      )}

      {/* Confirmaciones Sí / No (formulario propio de la página) */}
      {qualification && (
        <div className="space-y-3" data-testid="booking-confirmations">
          {qualification.confirmations.map((c) => {
            const answer = answers[c.id];
            const missing = answersError && !answer;
            return (
              <div key={c.id} className={`rounded-lg border px-3.5 py-3 ${missing ? "border-red-300 bg-red-50/40" : answer === "no" ? "border-red-200 bg-red-50/40" : "border-gray-200 bg-white"}`}>
                <p className="text-sm text-gray-700 leading-snug">{c.text}</p>
                <div className="mt-2.5 grid grid-cols-2 gap-2" role="radiogroup" aria-label={c.text}>
                  {(["yes", "no"] as const).map((opt) => {
                    const on = answer === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => { setAnswers((a) => ({ ...a, [c.id]: opt })); setAnswersError(false); }}
                        className={`rounded-lg border-2 px-3 py-2 text-sm font-semibold transition-all ${on ? "text-white border-transparent" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}
                        style={on ? { backgroundColor: opt === "yes" ? primaryColor : "#B91C1C" } : undefined}
                      >
                        {opt === "yes" ? "Sí" : "No"}
                      </button>
                    );
                  })}
                </div>
                {missing && <p className="text-xs text-red-500 mt-1.5">Elige Sí o No.</p>}
              </div>
            );
          })}
        </div>
      )}

      {/* Terms checkbox */}
      <div className="space-y-1">
        <label
          className="flex items-start gap-3 cursor-pointer group"
          onClick={() => { setTermsAccepted(v => !v); setTermsError(false); }}
        >
          <div className={`mt-0.5 w-5 h-5 rounded border-2 flex-none flex items-center justify-center transition-all ${
            termsAccepted ? "border-transparent" : termsError ? "border-red-400" : "border-gray-300 group-hover:border-gray-400"
          }`} style={termsAccepted ? { backgroundColor: primaryColor, borderColor: primaryColor } : undefined}>
            {termsAccepted && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <span className="text-sm text-gray-500 leading-snug select-none">
            {T.termsAccept}{" "}
            <a
              href={lang === "en" ? LEGAL.termsPath : "/terminos_y_politicas_de_privacidad"}
              {...legalLinkProps}
              className="underline underline-offset-2 hover:opacity-80 transition-opacity"
              style={{ color: primaryColor }}
            >
              {T.termsLink}
            </a>
            {lang === "en" && (
              <>
                {" "}{T.termsAnd}{" "}
                <a
                  href={LEGAL.privacyPath}
                  {...legalLinkProps}
                  className="underline underline-offset-2 hover:opacity-80 transition-opacity"
                  style={{ color: primaryColor }}
                >
                  {T.privacyLink}
                </a>
              </>
            )}
          </span>
        </label>
        {termsError && (
          <p className="text-xs text-red-500 ml-8">{T.termsError}</p>
        )}
      </div>

      {/* Consentimiento de SMS: checkbox propio (no va mezclado con los términos), opcional y sin marcar de fábrica */}
      {smsShown && (
        <div className="space-y-1.5" data-testid="sms-consent-block">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              data-testid="sms-consent-checkbox"
              checked={smsAccepted}
              onChange={(e) => setSmsAccepted(e.target.checked)}
              className="mt-0.5 w-5 h-5 flex-none cursor-pointer"
              style={{ accentColor: primaryColor }}
            />
            <span className="text-sm text-gray-500 leading-snug">{smsLabel}</span>
          </label>
          <p className="text-xs text-gray-400 leading-snug ml-8">
            {T.smsDisclosure}{" "}
            <a href={lang === "en" ? LEGAL.privacyPath : "/terminos_y_politicas_de_privacidad"} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2" style={{ color: primaryColor }}>
              {lang === "en" ? T.privacyLink : T.termsLink}
            </a>
            {lang === "en" && (
              <>
                {" · "}
                <a href={LEGAL.termsPath} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2" style={{ color: primaryColor }}>{T.termsLink}</a>
              </>
            )}
          </p>
        </div>
      )}

      {failedRequirement ? (
        <p role="alert" data-testid="booking-blocked" className="text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-center">
          {qualification!.blockedMessage}
        </p>
      ) : qualificationIncomplete ? (
        <p data-testid="booking-incomplete" className="text-xs text-gray-500 text-center">
          Completa todos los datos para agendar.
        </p>
      ) : null}

      <div className="flex gap-2.5">
        <button
          onClick={onBack}
          className="flex-none border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
        >
          {T.back}
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || failedRequirement || qualificationIncomplete}
          style={{ backgroundColor: primaryColor }}
          className="flex-1 text-white rounded-lg px-4 py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:opacity-90"
        >
          {isSubmitting ? T.confirming : T.confirm}
        </button>
      </div>
    </div>
  );
};

// ─── Main CalendarRenderer ────────────────────────────────────────────────────

interface CalendarRendererProps {
  calendarId: string;
  lang?: WidgetLang;
  /** Overrides the calendar's stored branding color (used by standalone campaign pages that need to match their own brand instead of the calendar owner's). */
  primaryColorOverride?: string;
  /** Called right after a booking succeeds, in addition to showing the built-in success step (e.g. to redirect to a dedicated thank-you page). */
  onBookingSuccess?: (booking: { date: string; hour: number; minute: number; calendarTz: string; visitorTz: string; calendarName: string; formData?: Record<string, string> }) => void;
  /** Nombre/correo ya conocidos: no se piden de nuevo en el formulario, pero se envían con la reserva (ver BookingPrefill). */
  prefill?: BookingPrefill;
  /** Pide solo el WhatsApp como dato obligatorio (úsese junto con `prefill`). */
  requireWhatsapp?: boolean;
  /** Prefijo con el que arranca el selector de país del teléfono (ej. "+1" para público de EE.UU.). */
  phoneDefaultDial?: string;
  /** Vista previa: no reserva de verdad (ver BookingFormProps.previewOnly). */
  previewOnly?: boolean;
  /** Formulario propio de la página (campos + confirmaciones Sí / No que bloquean la reserva). Reemplaza al formulario del calendario. */
  qualification?: BookingQualification;
  /**
   * Si al reservar el calendario manda él mismo el evento `Lead` de Meta (por defecto sí). Una página que ya manda su propio `Lead`
   * (con `event_id`) lo pone en `false` para que la reserva no cuente dos Leads.
   */
  fireLead?: boolean;
}

const CalendarRenderer = ({ calendarId, lang: langProp, primaryColorOverride, onBookingSuccess, prefill, requireWhatsapp, phoneDefaultDial, previewOnly, qualification, fireLead = true }: CalendarRendererProps) => {
  const today = new Date();
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ hour: number; minute: number } | null>(null);
  const [step, setStep] = useState<"calendar" | "form" | "success">("calendar");
  const [visitorTz, setVisitorTz] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  // Desplazamientos automáticos: fecha → sección de horarios; horario → botón Continuar.
  const slotsMobileRef = useRef<HTMLDivElement>(null);
  const slotsSideRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!selectedDate) return;
    // Hay dos secciones de horarios (debajo del calendario en celular, al costado en pantallas anchas): se va a la que se ve.
    const visible = [slotsMobileRef.current, slotsSideRef.current].find((el) => el && el.offsetParent !== null);
    scrollToEl(visible ?? slotsMobileRef.current, "start"); // (jsdom no calcula el diseño: ahí se usa la de celular)
  }, [selectedDate]);
  useEffect(() => {
    if (selectedSlot) scrollToEl(ctaRef.current, "nearest");
  }, [selectedSlot]);

  const { data: publicCalendar, isLoading } = usePublicCalendar(calendarId);
  const calendar     = publicCalendar?.calendar;
  const branding     = publicCalendar?.profile ?? null;
  const blockedSlots = publicCalendar?.blockedSlots ?? [];
  const formFields   = publicCalendar?.formFields ?? null;
  // URL param overrides stored language; stored language overrides default "es"
  const lang: WidgetLang = langProp ?? (calendar?.language as WidgetLang | undefined) ?? "es";
  const T = widgetTranslations[lang].calendar;

  // Always use the resolved UUID from the calendar record, not the raw prop.
  // The prop may be a slug (e.g. "acrosoft-pruebas"). Passing a slug to
  // usePublicAppointments would make the Edge Function try to compare a text
  // slug against a uuid column → validation error.
  const resolvedCalendarId = calendar?.id ?? null;

  const { data: appointments = [] } = usePublicAppointments(resolvedCalendarId, viewYear, viewMonth);
  const isBranded   = branding?.theme === "branded";
  const brandLogo   = isBranded ? (branding?.logo_url ?? null) : null;

  const primaryColor = primaryColorOverride ?? branding?.color_primary ?? "#1877F2";

  const pixelId = (calendar as any)?.facebook_pixel_id as string | null ?? null;

  useEffect(() => {
    if (calendar && pixelId) {
      loadFbPixel(pixelId);
      fbTrack("ViewContent");
    }
  }, [calendar?.id, pixelId]);

  useEffect(() => {
    if (step === "success" && fireLead) {
      fbTrack("Lead");
    }
  }, [step, fireLead]);

  const calendarTz = (calendar as any)?.timezone ?? "America/La_Paz";

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

  // Absolute cutoff in UTC — uses calendar timezone for accurate min_advance_hours
  const minBookableMs = today.getTime() + minAdvanceHours * 3600 * 1000;

  // Last bookable date key — derived in calendar timezone
  const todayInCalTz = new Intl.DateTimeFormat("en-CA", { timeZone: calendarTz, year: "numeric", month: "2-digit", day: "2-digit" }).format(today);
  const [cty, ctm, ctd] = todayInCalTz.split("-").map(Number);
  const maxDateMs  = Date.UTC(cty, ctm - 1, ctd + maxFutureDays);
  // `maxDateMs` ya es la fecha de calendario (a medianoche UTC): se lee en UTC. Leerla en la zona del calendario la corría un día atrás en
  // zonas al oeste de Greenwich (p. ej. La Paz): con `max_future_days = 2` solo dejaba reservar mañana, aunque el servidor acepta hasta pasado mañana.
  const maxDateKey = new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(new Date(maxDateMs));

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

  // todayKey in calendar timezone so past-day detection is accurate for remote TZs
  const todayKey = todayInCalTz;

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
      // Use calendar timezone to convert wall-clock → UTC for min_advance_hours check
      const slotMs = wallClockToUtcMs(viewYear, viewMonth + 1, day, h, m, calendarTz);
      if (slotMs < minBookableMs) continue;
      if (!isSlotAvailable(avail, dow, h, m, slotStep)) continue;
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
      const slotMs = wallClockToUtcMs(y, m, d, h, mn, calendarTz);
      if (slotMs < minBookableMs) continue;
      if (!isSlotAvailable(avail, dayOfWeek, h, mn, slotStep)) continue;
      if (isBufferBlocked(selectedDate, totalMin, slotStep)) continue;
      if (isSlotBlocked(blockedSlots, selectedDate, h, mn)) continue;
      slots.push({ hour: h, minute: mn });
    }
    return slots;
  }, [selectedDate, avail, appointmentsByDate, blockedSlots, minBookableMs, slotStep, bufferMin, calendarTz]);

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
      <div className="flex items-center justify-center min-h-[280px]">
        <Loader2 size={20} className="animate-spin" style={{ color: primaryColor }} />
      </div>
    );
  }

  if (!calendar) {
    return (
      <p className="text-center py-10 text-sm text-gray-400">{T.loadError}</p>
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
          <p className="text-lg font-bold text-gray-900">{T.successTitle}</p>
          <p className="text-sm text-gray-400 max-w-xs mx-auto">{T.successMessage}</p>
        </div>
      </div>
    );
  }

  // ── Booking form ────────────────────────────────────────────────────────────
  if (step === "form" && selectedDate && selectedSlot !== null) {
    return (
      <BookingForm
        calendarId={resolvedCalendarId ?? calendarId}
        formFields={formFields}
        prefill={prefill}
        requireWhatsapp={requireWhatsapp}
        phoneDefaultDial={phoneDefaultDial}
        previewOnly={previewOnly}
        qualification={qualification}
        smsConsent={calendar.sms_reminders_enabled ? { businessName: branding?.business_name ?? "" } : undefined}
        selectedDate={selectedDate}
        selectedHour={selectedSlot.hour}
        selectedMinute={selectedSlot.minute}
        lang={lang}
        durationMin={calendar.duration_min ?? 30}
        primaryColor={primaryColor}
        calendarTz={calendarTz}
        visitorTz={visitorTz}
        onSuccess={(formData) => {
          setStep("success");
          onBookingSuccess?.({
            date: selectedDate,
            hour: selectedSlot.hour,
            minute: selectedSlot.minute,
            calendarTz,
            visitorTz,
            calendarName: calendar.name ?? T.appointmentName,
            formData,
          });
        }}
        onBack={() => setStep("calendar")}
      />
    );
  }

  // ── Calendar picker ─────────────────────────────────────────────────────────
  return (
    <div className="font-sans">

      {/* ── Service header ── */}
      <div className="pt-5 pb-4 md:pt-4 md:pb-3 space-y-2.5">
        {brandLogo && (
          <img src={brandLogo} alt="Logo" className="h-8 max-w-[160px] object-contain mb-1" />
        )}
        <h2 className="text-2xl font-bold text-gray-900 leading-tight">
          {calendar.name ?? T.bookingTitle}
        </h2>
        {calendar.description && (
          <p className="text-sm text-gray-500 leading-relaxed">{calendar.description}</p>
        )}
        {/* Duration + timezone badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
            style={{ backgroundColor: `${primaryColor}12`, color: primaryColor }}
          >
            <Clock size={11} strokeWidth={2.5} />
            {T.minPerSession(calendar.duration_min ?? 30)}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
            <Calendar size={11} strokeWidth={2} />
            {T.onlineBooking}
          </span>
          {/* Timezone selector */}
          <label className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 cursor-pointer hover:bg-gray-200 transition-colors">
            <Globe size={11} strokeWidth={2} />
            <select
              value={visitorTz}
              onChange={(e) => setVisitorTz(e.target.value)}
              className="bg-transparent text-base md:text-xs text-gray-500 focus:outline-none cursor-pointer max-w-[110px] sm:max-w-[160px] truncate"
            >
              {((Intl as any).supportedValuesOf?.("timeZone") ?? [calendarTz]).map((tz: string) => (
                <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="border-t border-gray-100" />

      {/* ── Step 1: Calendar + Step 2 (desktop: side panel / mobile: below) ── */}
      <div className="pt-4 md:pt-3">

        {/* Row layout for sm+ screens */}
        <div className="flex gap-0 items-stretch">

          {/* Calendar column */}
          <div className="flex-1 min-w-0 pb-1">
            <StepLabel number={1} label={T.step1} primaryColor={primaryColor} />

            {/* Month nav */}
            <div className="flex items-center justify-between mb-3 md:mb-2">
              <span className="text-base font-bold text-gray-800">
                {T.months[viewMonth]} {viewYear}
              </span>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={prevMonth}
                  disabled={isCurrentMonth}
                  className={[
                    "w-8 h-8 flex items-center justify-center rounded-md transition-colors",
                    isCurrentMonth
                      ? "text-gray-200 cursor-not-allowed"
                      : "text-gray-400 hover:bg-blue-50 hover:text-blue-600",
                  ].join(" ")}
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  onClick={nextMonth}
                  disabled={isLastAllowedMonth}
                  className={[
                    "w-8 h-8 flex items-center justify-center rounded-md transition-colors",
                    isLastAllowedMonth
                      ? "text-gray-200 cursor-not-allowed"
                      : "text-gray-400 hover:bg-blue-50 hover:text-blue-600",
                  ].join(" ")}
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1.5">
              {T.days.map((d) => (
                <div key={d} className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wider py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-y-0.5 justify-items-center">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} className="w-9 h-9" />)}
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
                        ? { backgroundColor: primaryColor, boxShadow: `0 4px 12px ${primaryColor}50` }
                        : isToday && avbl
                        ? { boxShadow: `inset 0 0 0 1.5px ${primaryColor}`, color: primaryColor }
                        : avbl
                        ? { backgroundColor: `${primaryColor}15` }
                        : undefined
                    }
                    className={[
                      "w-9 h-9 flex items-center justify-center text-xs rounded-xl transition-all",
                      sel                      ? "text-white font-bold"                                      : "",
                      !sel && avbl && !isToday ? "text-gray-800 hover:opacity-80 cursor-pointer font-medium" : "",
                      !sel && avbl && isToday  ? "font-bold cursor-pointer hover:opacity-80"                 : "",
                      isPast                   ? "text-gray-200 cursor-not-allowed"                          : "",
                      !avbl && !isPast         ? "text-gray-200 cursor-not-allowed"                          : "",
                    ].join(" ")}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right column (sm+): slides in from right when date selected */}
          <div
            ref={slotsSideRef}
            className="hidden sm:flex shrink-0 flex-col overflow-hidden transition-all duration-300 ease-in-out"
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
            <StepLabel number={2} label={T.step2} primaryColor={primaryColor} />
            {availableSlots.length === 0 ? (
              <p className="text-[11px] text-gray-400 leading-relaxed">
                {T.noSlots}<br />{T.noSlotsHint}
              </p>
            ) : (
              <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-0.5">
                {availableSlots.map(({ hour: h, minute: m }) => {
                  const isSelected = selectedSlot?.hour === h && selectedSlot?.minute === m;
                  const label = selectedDate
                    ? formatSlotInTz(selectedDate, h, m, calendarTz, visitorTz)
                    : formatSlot(h, m);
                  return (
                    <button
                      key={`${h}:${m}`}
                      onClick={() => setSelectedSlot({ hour: h, minute: m })}
                      style={isSelected ? { backgroundColor: primaryColor, borderColor: primaryColor, boxShadow: `0 2px 8px ${primaryColor}50` } : undefined}
                      className={[
                        "w-full text-center py-2.5 rounded-lg text-xs font-semibold transition-all border shrink-0",
                        isSelected
                          ? "text-white"
                          : "border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900 bg-white",
                      ].join(" ")}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Mobile slots: shown below calendar as a 3-column grid (hidden on sm+) */}
        {selectedDate && (
          <div ref={slotsMobileRef} className="sm:hidden mt-4 border-t border-gray-100 pt-3 scroll-mt-3">
            <StepLabel number={2} label={T.step2} primaryColor={primaryColor} />
            {availableSlots.length === 0 ? (
              <p className="text-[11px] text-gray-400 leading-relaxed">
                {T.noSlots}<br />{T.noSlotsHint}
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-52 overflow-y-auto pb-1">
                {availableSlots.map(({ hour: h, minute: m }) => {
                  const isSelected = selectedSlot?.hour === h && selectedSlot?.minute === m;
                  const label = selectedDate
                    ? formatSlotInTz(selectedDate, h, m, calendarTz, visitorTz)
                    : formatSlot(h, m);
                  return (
                    <button
                      key={`${h}:${m}-mobile`}
                      onClick={() => setSelectedSlot({ hour: h, minute: m })}
                      style={isSelected ? { backgroundColor: primaryColor, borderColor: primaryColor, boxShadow: `0 2px 8px ${primaryColor}50` } : undefined}
                      className={[
                        "w-full text-center py-3.5 rounded-lg text-xs font-semibold transition-all border",
                        isSelected
                          ? "text-white"
                          : "border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900 bg-white",
                      ].join(" ")}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── CTA ── */}
      {selectedDate && selectedSlot !== null && (
        <div ref={ctaRef} className="pt-4 scroll-mb-4">
          <button
            onClick={() => setStep("form")}
            style={{ backgroundColor: primaryColor }}
            className="w-full text-white rounded-lg py-3.5 text-sm font-bold transition-all hover:opacity-90 flex items-center justify-center gap-2"
          >
            {T.continueWith} {selectedDate ? formatSlotInTz(selectedDate, selectedSlot.hour, selectedSlot.minute, calendarTz, visitorTz) : formatSlot(selectedSlot.hour, selectedSlot.minute)}
            <ChevronRight size={15} strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  );
};

export default CalendarRenderer;
