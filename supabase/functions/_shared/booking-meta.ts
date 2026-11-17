/**
 * Datos extra que una página manda al reservar (crm-calendar-book → `booking_meta`) y los marcadores que completan los correos de reserva.
 * Todo es opcional y se sanitiza: lo manda un navegador anónimo.
 *
 *   source      etiqueta de origen que se agrega a los tags del contacto (p. ej. «consultoria-mkt-tree»)
 *   visitor_tz  zona horaria del visitante: la hora del correo de confirmación se dice en SU hora, no en la del calendario
 *   answers     respuestas de confirmación (pregunta + «Sí»/«No»)
 *
 * Marcadores para el texto de las reglas «al reservar»: {{booking.business}}, {{booking.when}} y {{booking.answers}}.
 */
import { sanitizeText } from "./validate.ts";

export interface BookingMeta {
  source: string;
  visitorTz: string;
  answers: { label: string; value: string }[];
}

/** Zona horaria IANA válida o "" si no lo es. */
export function validTimeZone(tz: unknown): string {
  if (typeof tz !== "string" || tz.length === 0 || tz.length > 64) return "";
  try { new Intl.DateTimeFormat("en", { timeZone: tz }); return tz; } catch { return ""; }
}

export function parseBookingMeta(raw: unknown): BookingMeta {
  const m = (raw && typeof raw === "object" && !Array.isArray(raw)) ? raw as Record<string, unknown> : {};
  const source = typeof m.source === "string" && /^[a-z0-9-]{1,50}$/i.test(m.source) ? m.source.toLowerCase() : "";
  const answers = Array.isArray(m.answers)
    ? (m.answers as Record<string, unknown>[]).slice(0, 10)
        .map((a) => ({ label: sanitizeText(a?.label, 300), value: sanitizeText(a?.value, 20) }))
        .filter((a) => a.label && a.value)
    : [];
  return { source, visitorTz: validTimeZone(m.visitor_tz), answers };
}

/** «miércoles, 18 de noviembre a las 10:00 AM EST» en la zona indicada. */
export function formatWhen(ms: number, timeZone: string): string {
  const day = new Intl.DateTimeFormat("es", { timeZone, weekday: "long", day: "numeric", month: "long" }).format(new Date(ms));
  const time = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(ms));
  return `${day} a las ${time}`;
}

export function buildBookingVars(o: { business: string; scheduledMs: number; visitorTz: string; answers: { label: string; value: string }[] }): Record<string, string> {
  return {
    business: o.business,
    when: formatWhen(o.scheduledMs, o.visitorTz),
    answers: o.answers.length > 0 ? `Confirmaciones:\n${o.answers.map((a) => `• ${a.label} → ${a.value}`).join("\n")}` : "",
  };
}

/** Reemplaza los marcadores. Si el valor de un marcador viene vacío se quita la línea entera (no queda «Negocio: » en blanco). */
export function applyBookingPlaceholders(text: string, vars: Record<string, string>): string {
  return text.split("\n").flatMap((line) => {
    const found = [...line.matchAll(/\{\{booking\.(business|when|answers)\}\}/g)];
    if (found.length === 0) return [line];
    let out = line;
    for (const f of found) {
      const v = vars[f[1]] ?? "";
      if (!v) return [];
      out = out.replace(f[0], () => v);
    }
    return [out];
  }).join("\n");
}
