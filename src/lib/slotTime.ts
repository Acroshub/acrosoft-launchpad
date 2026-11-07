// Horas de las citas del calendario público. Extraído de CalendarRenderer.tsx SIN cambiar su lógica (wallClockToUtcMs y formatSlotInTz son las mismas
// de siempre) para que la página final del embudo de Estimados (/estimados-gracias) muestre la cita exactamente igual que el calendario.
//
// Una cita llega como (fecha, hora, minuto) en la ZONA DEL CALENDARIO (ej. America/La_Paz). A quien reserva se le muestra en SU zona.

/**
 * Converts a wall-clock time in a given IANA timezone to absolute UTC ms.
 * Uses 2-iteration convergence to handle DST transitions correctly.
 */
export const wallClockToUtcMs = (
  year: number, month: number, day: number,
  hour: number, minute: number,
  tz: string,
): number => {
  const fmt = new Intl.DateTimeFormat("en", {
    timeZone: tz,
    year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", minute: "numeric", hour12: false,
  });
  let utcMs = Date.UTC(year, month - 1, day, hour, minute);
  for (let i = 0; i < 2; i++) {
    const parts = fmt.formatToParts(new Date(utcMs));
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
    const h = get("hour") % 24;
    const displayedMs = Date.UTC(get("year"), get("month") - 1, get("day"), h, get("minute"));
    utcMs += Date.UTC(year, month - 1, day, hour, minute) - displayedMs;
  }
  return utcMs;
};

/**
 * Formats a wall-clock slot (in calendarTz) for display in displayTz.
 * Returns a label like "3:00 PM" in the visitor's local time.
 */
export const formatSlotInTz = (
  date: string, hour: number, minute: number,
  calendarTz: string, displayTz: string,
): string => {
  const [y, m, d] = date.split("-").map(Number);
  const utcMs = wallClockToUtcMs(y, m, d, hour, minute, calendarTz);
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: displayTz,
    hour: "numeric", minute: "2-digit", hour12: true,
  }).formatToParts(new Date(utcMs));
  return parts.map((p) => p.value).join("").replace(/\s?(AM|PM)/, " $1").trim();
};

export type BookingSummary = {
  /** «Lunes, 9 de noviembre», en la zona de quien reservó (la fecha puede cambiar respecto a la del calendario). */
  dateLabel: string;
  /** «11:00 AM», en la zona de quien reservó. */
  timeLabel: string;
  /** «America/New York (EST)». */
  tzLabel: string;
};

const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/**
 * Resumen legible de una cita en español, en la zona `displayTz` (la de la persona). Si `displayTz` no es una zona válida cae a la del calendario.
 */
export function formatBookingSummary(
  date: string, hour: number, minute: number,
  calendarTz: string, displayTz: string,
): BookingSummary {
  let tz = displayTz;
  try { new Intl.DateTimeFormat("en", { timeZone: tz }); } catch { tz = calendarTz; }

  const [y, m, d] = date.split("-").map(Number);
  const at = new Date(wallClockToUtcMs(y, m, d, hour, minute, calendarTz));
  const dateLabel = capitalize(new Intl.DateTimeFormat("es-US", { timeZone: tz, weekday: "long", day: "numeric", month: "long" }).format(at));
  const tzShort = new Intl.DateTimeFormat("es-US", { timeZone: tz, timeZoneName: "short" }).formatToParts(at).find((p) => p.type === "timeZoneName")?.value;
  return {
    dateLabel,
    timeLabel: formatSlotInTz(date, hour, minute, calendarTz, tz),
    tzLabel: `${tz.replace(/_/g, " ")}${tzShort ? ` (${tzShort})` : ""}`,
  };
}
