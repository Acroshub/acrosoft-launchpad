// ─────────────────────────────────────────────────────────────────────────────
// Zona horaria deducida del prefijo del teléfono.
//
// Se usa para el modo "hora local de cada contacto": el envío no sale de golpe,
// sale por tandas según va dando la hora en cada país. Lo comparten los envíos
// con plantilla y los de mensaje libre — antes solo existía en el scheduler y
// por eso las plantillas no podían programarse así.
// ─────────────────────────────────────────────────────────────────────────────

export const PHONE_TIMEZONE: Record<string, string> = {
  "1":   "America/New_York",
  "52":  "America/Mexico_City",
  "34":  "Europe/Madrid",
  "57":  "America/Bogota",
  "54":  "America/Argentina/Buenos_Aires",
  "55":  "America/Sao_Paulo",
  "56":  "America/Santiago",
  "51":  "America/Lima",
  "58":  "America/Caracas",
  "591": "America/La_Paz",
  "593": "America/Guayaquil",
  "595": "America/Asuncion",
  "598": "America/Montevideo",
  "53":  "America/Havana",
  "502": "America/Guatemala",
  "503": "America/El_Salvador",
  "504": "America/Tegucigalpa",
  "505": "America/Managua",
  "506": "America/Costa_Rica",
  "507": "America/Panama",
  "44":  "Europe/London",
  "33":  "Europe/Paris",
  "49":  "Europe/Berlin",
  "39":  "Europe/Rome",
  "351": "Europe/Lisbon",
  "31":  "Europe/Amsterdam",
  "61":  "Australia/Sydney",
  "64":  "Pacific/Auckland",
  "81":  "Asia/Tokyo",
  "82":  "Asia/Seoul",
  "86":  "Asia/Shanghai",
  "91":  "Asia/Kolkata",
  "971": "Asia/Dubai",
  "972": "Asia/Jerusalem",
  "966": "Asia/Riyadh",
  "20":  "Africa/Cairo",
  "27":  "Africa/Johannesburg",
  "234": "Africa/Lagos",
};

export function getPhonePrefix(phone: string): string {
  const d = (phone ?? "").replace(/\D/g, "");
  for (const len of [3, 2, 1]) {
    const p = d.slice(0, len);
    if (PHONE_TIMEZONE[p]) return p;
  }
  return "unknown";
}

export function getTimezoneFromPhone(phone: string): string {
  return PHONE_TIMEZONE[getPhonePrefix(phone)] ?? "UTC";
}

/** true cuando en esa zona ya son las targetTime del targetDate (o más tarde). */
export function isTimeReachedInTz(targetDate: string, targetTime: string, timezone: string): boolean {
  const now = new Date();
  const localDate = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, dateStyle: "short" }).format(now);
  const localTime = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone, hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(now).replace(/^24/, "00");
  if (localDate < targetDate) return false;
  if (localDate > targetDate) return true;
  return localTime >= targetTime;
}

/** true cuando hasta la última zona del planeta (UTC-12) ya pasó la hora objetivo. */
export function allTimezonesReached(targetDate: string, targetTime: string): boolean {
  const targetUtcMs = new Date(`${targetDate}T${targetTime}:00Z`).getTime();
  return Date.now() >= targetUtcMs + 12 * 3600 * 1000;
}

/**
 * Filtra una tanda de destinatarios pendientes dejando solo aquellos cuya hora
 * local ya llegó. Si el envío no es por hora local, no filtra nada.
 *
 * Cuando ya pasó la hora en todas las zonas se deja pasar a todo el mundo: así
 * nadie se queda colgado para siempre por un prefijo que no reconocemos.
 */
export function filterByLocalTime<T extends { phone: string | null }>(
  rows: T[],
  timezoneMode: string | null,
  targetDate: string | null,
  targetLocalTime: string | null,
): T[] {
  if (timezoneMode !== "contact" || !targetDate || !targetLocalTime) return rows;
  if (allTimezonesReached(targetDate, targetLocalTime)) return rows;
  return rows.filter(r => isTimeReachedInTz(targetDate, targetLocalTime, getTimezoneFromPhone(r.phone ?? "")));
}
