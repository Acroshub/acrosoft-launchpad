// ─────────────────────────────────────────────────────────────────────────────
// Zona horaria deducida del prefijo del teléfono.
//
// Se usa para el modo "hora local de cada contacto": el envío no sale de golpe,
// sale por tandas según va dando la hora en cada país. Lo comparten los envíos
// con plantilla y los de mensaje libre — antes solo existía en el scheduler y
// por eso las plantillas no podían programarse así.
// ─────────────────────────────────────────────────────────────────────────────

import { isBsuid } from "./wa-recipient.ts";

// Un BSUID (ver wa-recipient.ts) trae el código de país ISO 3166 de 2 letras
// al inicio (ej. "PE.890226963914597" → Perú) — más directo que inferirlo de
// un prefijo telefónico. Mismos países que PHONE_TIMEZONE, indexados por ISO2.
export const ISO_COUNTRY_TIMEZONE: Record<string, string> = {
  US: "America/New_York",   MX: "America/Mexico_City", ES: "Europe/Madrid",
  CO: "America/Bogota",     AR: "America/Argentina/Buenos_Aires",
  BR: "America/Sao_Paulo",  CL: "America/Santiago",     PE: "America/Lima",
  VE: "America/Caracas",    BO: "America/La_Paz",       EC: "America/Guayaquil",
  PY: "America/Asuncion",   UY: "America/Montevideo",   CU: "America/Havana",
  GT: "America/Guatemala",  SV: "America/El_Salvador",  HN: "America/Tegucigalpa",
  NI: "America/Managua",    CR: "America/Costa_Rica",   PA: "America/Panama",
  GB: "Europe/London",      FR: "Europe/Paris",         DE: "Europe/Berlin",
  IT: "Europe/Rome",        PT: "Europe/Lisbon",        NL: "Europe/Amsterdam",
  AU: "Australia/Sydney",   NZ: "Pacific/Auckland",     JP: "Asia/Tokyo",
  KR: "Asia/Seoul",         CN: "Asia/Shanghai",        IN: "Asia/Kolkata",
  AE: "Asia/Dubai",         IL: "Asia/Jerusalem",       SA: "Asia/Riyadh",
  EG: "Africa/Cairo",       ZA: "Africa/Johannesburg",  NG: "Africa/Lagos",
};

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
  const p = phone ?? "";
  // BSUID: usar el código ISO2 que trae al inicio en vez de tratarlo como
  // prefijo telefónico — de lo contrario siempre cae a "unknown"/UTC y el
  // contacto queda retenido hasta que allTimezonesReached libera a todos.
  if (isBsuid(p)) return ISO_COUNTRY_TIMEZONE[p.slice(0, 2).toUpperCase()] ?? "UTC";
  return PHONE_TIMEZONE[getPhonePrefix(p)] ?? "UTC";
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
