/**
 * Lógica pura de la landing /website-hvac (website gratis para dueños de HVAC): validación del pedido, cupos del mes, datos que se guardan
 * en el formulario del CRM y el aviso push al superadmin. Sin red ni Supabase para poder probarla con `deno test`.
 *
 * Reglas del negocio (Daniel, 2026-11-19): máximo 10 websites al mes, las 4 confirmaciones son obligatorias, hasta 6 servicios con uno de
 * ellos como «servicio estrella», el cupo del mes se cuenta en la hora de Nueva York (donde vive el cliente), no en UTC.
 */
import { isValidEmail, isValidPhone, sanitizeText } from "./validate.ts";

export const WEBSITE_HVAC_SLUG = "website-hvac";
export const WEBSITE_HVAC_TAG = "website-hvac";
/** Dejó sus datos de contacto (paso 1) pero no terminó el formulario: se le puede dar seguimiento por WhatsApp. */
export const WEBSITE_HVAC_TAG_PARTIAL = "website-hvac-incompleto";
/** Llegó con los cupos del mes agotados y pidió que le avisen cuando se abran. */
export const WEBSITE_HVAC_TAG_WAITLIST = "website-hvac-espera";
/** Cupos de websites gratis por mes. */
export const WEBSITE_HVAC_MONTHLY_LIMIT = 10;
/** Zona en la que «empieza el mes» para contar los cupos. */
export const WEBSITE_HVAC_TZ = "America/New_York";
export const WEBSITE_HVAC_MAX_SERVICES = 6;

/** Ids de los campos del formulario del CRM «Website HVAC gratis» (el mismo JSON se creó en la base de datos). */
export const WH_FIELD = {
  name: "field_name",
  email: "field_email",
  whatsapp: "field_whatsapp",
  business: "field_business",
  language: "field_language",
  city: "field_city",
  services: "field_services",
  star: "field_star",
  material: "field_confirm_material",
  cost: "field_confirm_costo",
  call: "field_confirm_llamada",
  marketing: "field_confirm_marketing",
} as const;

export interface WebsiteHvacRequest {
  name: string;
  email: string;
  whatsapp: string;
  business: string;
  language: "es" | "en";
  city: string;
  services: string[];
  star: string;
}

export type ParseResult = { ok: true; value: WebsiteHvacRequest } | { ok: false; error: string };

/** Valida el cuerpo que manda la landing. Las 4 confirmaciones tienen que venir en `true` (no basta con que falten). */
export function parseWebsiteHvacRequest(body: unknown): ParseResult {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const name = sanitizeText(b.name, 120);
  const email = sanitizeText(b.email, 254).toLowerCase();
  const whatsapp = sanitizeText(b.whatsapp, 30);
  const business = sanitizeText(b.business, 120);
  const city = sanitizeText(b.city, 120);
  const language = b.language === "en" ? "en" : b.language === "es" ? "es" : null;

  if (name.length < 3) return { ok: false, error: "Falta tu nombre y apellido" };
  if (!isValidEmail(email)) return { ok: false, error: "Correo inválido" };
  if (!isValidPhone(whatsapp)) return { ok: false, error: "WhatsApp inválido" };
  if (!business) return { ok: false, error: "Falta el nombre del negocio" };
  if (!language) return { ok: false, error: "Elige el idioma de tu website" };
  if (!city) return { ok: false, error: "Falta la ciudad y el estado" };

  const rawServices = Array.isArray(b.services) ? b.services : [];
  const services: string[] = [];
  for (const s of rawServices) {
    const t = sanitizeText(s, 80);
    if (t && !services.some((x) => x.toLowerCase() === t.toLowerCase())) services.push(t);
  }
  if (services.length === 0) return { ok: false, error: "Agrega al menos un servicio" };
  if (services.length > WEBSITE_HVAC_MAX_SERVICES) return { ok: false, error: `Máximo ${WEBSITE_HVAC_MAX_SERVICES} servicios` };

  const star = sanitizeText(b.star, 80);
  const starMatch = services.find((s) => s.toLowerCase() === star.toLowerCase());
  if (!starMatch) return { ok: false, error: "Elige tu servicio estrella" };

  if (b.confirm_material !== true || b.confirm_cost !== true || b.confirm_call !== true || b.confirm_marketing !== true) {
    return { ok: false, error: "Debes aceptar las 4 confirmaciones" };
  }

  return { ok: true, value: { name, email, whatsapp, business, language, city, services, star: starMatch } };
}

export interface WebsiteHvacLead { name: string; email: string; whatsapp: string; business: string }

/** Paso 1 del formulario (solo contacto): se guarda como contacto con etiqueta aparte, sin gastar cupo. */
export function parseWebsiteHvacLead(body: unknown): { ok: true; value: WebsiteHvacLead } | { ok: false; error: string } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const name = sanitizeText(b.name, 120);
  const email = sanitizeText(b.email, 254).toLowerCase();
  const whatsapp = sanitizeText(b.whatsapp, 30);
  const business = sanitizeText(b.business, 120);
  if (name.length < 3) return { ok: false, error: "Falta tu nombre y apellido" };
  if (!isValidEmail(email)) return { ok: false, error: "Correo inválido" };
  if (!isValidPhone(whatsapp)) return { ok: false, error: "WhatsApp inválido" };
  if (!business) return { ok: false, error: "Falta el nombre del negocio" };
  return { ok: true, value: { name, email, whatsapp, business } };
}

/** Lo que se guarda en `crm_form_submissions.data` (y en la ficha del contacto): llaves = ids del formulario del CRM. */
export function buildSubmissionData(v: WebsiteHvacRequest): Record<string, string> {
  return {
    [WH_FIELD.name]: v.name,
    [WH_FIELD.email]: v.email,
    [WH_FIELD.whatsapp]: v.whatsapp,
    [WH_FIELD.business]: v.business,
    [WH_FIELD.language]: v.language === "es" ? "Español" : "Inglés",
    [WH_FIELD.city]: v.city,
    [WH_FIELD.services]: v.services.join(", "),
    [WH_FIELD.star]: v.star,
    [WH_FIELD.material]: "Sí",
    [WH_FIELD.cost]: "Sí",
    [WH_FIELD.call]: "Sí",
    [WH_FIELD.marketing]: "Sí",
  };
}

/** Año y mes (1-12) de `ms` en la zona dada. */
function zonedYearMonth(ms: number, tz: string): { y: number; m: number } {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "numeric" }).formatToParts(new Date(ms));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get("year"), m: get("month") };
}

/** Desfase (ms) de la zona respecto a UTC en el instante `ms`: hora local − hora UTC. */
function tzOffsetMs(ms: number, tz: string): number {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric",
  }).formatToParts(new Date(ms));
  const g = (t: string) => Number(p.find((x) => x.type === t)?.value);
  return Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second")) - Math.floor(ms / 1000) * 1000;
}

/** Instante UTC (ISO) en que empezó el mes actual a las 00:00 de la zona dada. */
export function monthStartIso(nowMs: number, tz: string = WEBSITE_HVAC_TZ): string {
  const { y, m } = zonedYearMonth(nowMs, tz);
  const guess = Date.UTC(y, m - 1, 1, 0, 0, 0);
  let start = guess - tzOffsetMs(guess, tz);
  // El desfase puede cambiar entre la estimación y el instante real (cambio de horario el 1 del mes): se corrige una vez.
  start = guess - tzOffsetMs(start, tz);
  return new Date(start).toISOString();
}

/** Cupos que quedan este mes (nunca negativo). */
export function slotsLeft(used: number, limit: number = WEBSITE_HVAC_MONTHLY_LIMIT): number {
  return Math.max(0, limit - Math.max(0, used));
}

export interface WebsiteHvacPushPayload { title: string; body: string; url: string }

export function buildWebsiteHvacPush(v: WebsiteHvacRequest, left: number): WebsiteHvacPushPayload {
  return {
    title: "🌐 Nuevo pedido · Website HVAC gratis",
    body: `${v.name} · ${v.business}\n${v.city} · ${left === 0 ? "cupos del mes agotados" : `quedan ${left} cupos este mes`}`,
    url: "/crm",
  };
}
