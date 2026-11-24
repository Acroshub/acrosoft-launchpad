/**
 * Lógica pura de la landing /website-tree (website gratis para dueños de negocios de tree service): validación del pedido, cupos del mes, datos que se guardan
 * en el formulario del CRM y el aviso push al superadmin. Sin red ni Supabase para poder probarla con `deno test`.
 *
 * Reglas del negocio (Daniel, 2026-11-19): máximo 10 websites al mes, las 4 confirmaciones son obligatorias, hasta 6 servicios y, OPCIONALMENTE, uno de
 * ellos como «servicio destacado» (es lo único opcional del formulario), el cupo del mes se cuenta en la hora de Nueva York (donde vive el cliente), no en UTC.
 */
import { isValidEmail, isValidPhone, sanitizeText } from "./validate.ts";

export const WEBSITE_TREE_SLUG = "website-tree";
export const WEBSITE_TREE_TAG = "website-tree";
/** Dejó sus datos de contacto (paso 1) pero no terminó el formulario: se le puede dar seguimiento por WhatsApp. */
export const WEBSITE_TREE_TAG_PARTIAL = "website-tree-incompleto";
/** Llegó con los cupos del mes agotados y pidió que le avisen cuando se abran. */
export const WEBSITE_TREE_TAG_WAITLIST = "website-tree-espera";
/** Split test de /website-tree: la landing normal y la gamificada se reparten el tráfico 50/50 y cada lead queda etiquetado con la versión que vio. */
export const WEBSITE_TREE_VARIANTS = ["normal", "game"] as const;
export type WebsiteTreeVariant = typeof WEBSITE_TREE_VARIANTS[number];
const WEBSITE_TREE_VARIANT_TAG_PREFIX = "website-tree-v-";
/** Etiqueta de la versión que vio el lead: website-tree-v-normal / website-tree-v-game. */
export const variantTag = (v: WebsiteTreeVariant): string => `${WEBSITE_TREE_VARIANT_TAG_PREFIX}${v}`;
/** Versión que manda la landing; cualquier otra cosa (falta, valor raro) es null y el lead se guarda sin etiqueta de versión. */
export function parseVariant(body: unknown): WebsiteTreeVariant | null {
  const v = (body && typeof body === "object" ? (body as Record<string, unknown>).variant : undefined);
  return WEBSITE_TREE_VARIANTS.find((x) => x === v) ?? null;
}
/** Agrega la etiqueta de versión SOLO si el contacto aún no tiene ninguna: gana la primera que vio (first touch), nunca queda con las dos. */
export function withVariantTag(tags: string[], variant: WebsiteTreeVariant | null): string[] {
  if (!variant || tags.some((t) => t.startsWith(WEBSITE_TREE_VARIANT_TAG_PREFIX))) return tags;
  return [...tags, variantTag(variant)];
}
/** `visitor_id` que manda la landing: un uuid. Cualquier otra cosa es null y la visita no se cuenta. */
export function parseVisitorId(body: unknown): string | null {
  const v = (body && typeof body === "object" ? (body as Record<string, unknown>).visitor_id : undefined);
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v) ? v.toLowerCase() : null;
}

/** Cupos de websites gratis por mes. */
export const WEBSITE_TREE_MONTHLY_LIMIT = 10;
/** Zona en la que «empieza el mes» para contar los cupos. */
export const WEBSITE_TREE_TZ = "America/New_York";
export const WEBSITE_TREE_MAX_SERVICES = 6;

/** Ids de los campos del formulario del CRM «Website Tree Service gratis» (el mismo JSON se creó en la base de datos). */
export const WT_FIELD = {
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

export interface WebsiteTreeRequest {
  name: string;
  /** "" si la persona no dejó correo. */
  email: string;
  whatsapp: string;
  business: string;
  language: "es" | "en";
  city: string;
  services: string[];
  /** Servicio destacado: opcional, "" si la persona no eligió ninguno. */
  star: string;
}

export type ParseResult = { ok: true; value: WebsiteTreeRequest } | { ok: false; error: string };

/** Valida el cuerpo que manda la landing. Las 4 confirmaciones tienen que venir en `true` (no basta con que falten). */
export function parseWebsiteTreeRequest(body: unknown): ParseResult {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const name = sanitizeText(b.name, 120);
  const email = sanitizeText(b.email, 254).toLowerCase();
  const whatsapp = sanitizeText(b.whatsapp, 30);
  const business = sanitizeText(b.business, 120);
  const city = sanitizeText(b.city, 120);
  const language = b.language === "en" ? "en" : b.language === "es" ? "es" : null;

  if (name.length < 3) return { ok: false, error: "Falta tu nombre y apellido" };
  // El correo es OPCIONAL (la versión /website-tree-game no lo pide): si viene, tiene que ser válido; si no, la persona se identifica por su WhatsApp.
  if (email && !isValidEmail(email)) return { ok: false, error: "Correo inválido" };
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
  if (services.length > WEBSITE_TREE_MAX_SERVICES) return { ok: false, error: `Máximo ${WEBSITE_TREE_MAX_SERVICES} servicios` };

  // El servicio destacado es OPCIONAL: si no viene (o no coincide con ningún servicio de la lista) queda vacío; nunca bloquea el envío.
  const star = sanitizeText(b.star, 80);
  const starMatch = star ? services.find((s) => s.toLowerCase() === star.toLowerCase()) ?? "" : "";

  if (b.confirm_material !== true || b.confirm_cost !== true || b.confirm_call !== true || b.confirm_marketing !== true) {
    return { ok: false, error: "Debes aceptar las 4 confirmaciones" };
  }

  return { ok: true, value: { name, email, whatsapp, business, language, city, services, star: starMatch } };
}

export interface WebsiteTreeLead { name: string; email: string; whatsapp: string; business: string }

/** Paso 1 del formulario (solo contacto): se guarda como contacto con etiqueta aparte, sin gastar cupo. */
export function parseWebsiteTreeLead(body: unknown): { ok: true; value: WebsiteTreeLead } | { ok: false; error: string } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const name = sanitizeText(b.name, 120);
  const email = sanitizeText(b.email, 254).toLowerCase();
  const whatsapp = sanitizeText(b.whatsapp, 30);
  const business = sanitizeText(b.business, 120);
  if (name.length < 3) return { ok: false, error: "Falta tu nombre y apellido" };
  // El correo es OPCIONAL (la versión /website-tree-game no lo pide): si viene, tiene que ser válido; si no, la persona se identifica por su WhatsApp.
  if (email && !isValidEmail(email)) return { ok: false, error: "Correo inválido" };
  if (!isValidPhone(whatsapp)) return { ok: false, error: "WhatsApp inválido" };
  if (!business) return { ok: false, error: "Falta el nombre del negocio" };
  return { ok: true, value: { name, email, whatsapp, business } };
}

/** Lo que se guarda en `crm_form_submissions.data` (y en la ficha del contacto): llaves = ids del formulario del CRM. */
export function buildSubmissionData(v: WebsiteTreeRequest): Record<string, string> {
  return {
    [WT_FIELD.name]: v.name,
    [WT_FIELD.email]: v.email,
    [WT_FIELD.whatsapp]: v.whatsapp,
    [WT_FIELD.business]: v.business,
    [WT_FIELD.language]: v.language === "es" ? "Español" : "Inglés",
    [WT_FIELD.city]: v.city,
    [WT_FIELD.services]: v.services.join(", "),
    [WT_FIELD.star]: v.star || "No indicó",
    [WT_FIELD.material]: "Sí",
    [WT_FIELD.cost]: "Sí",
    [WT_FIELD.call]: "Sí",
    [WT_FIELD.marketing]: "Sí",
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
export function monthStartIso(nowMs: number, tz: string = WEBSITE_TREE_TZ): string {
  const { y, m } = zonedYearMonth(nowMs, tz);
  const guess = Date.UTC(y, m - 1, 1, 0, 0, 0);
  let start = guess - tzOffsetMs(guess, tz);
  // El desfase puede cambiar entre la estimación y el instante real (cambio de horario el 1 del mes): se corrige una vez.
  start = guess - tzOffsetMs(start, tz);
  return new Date(start).toISOString();
}

/** Cupos que quedan este mes (nunca negativo). */
export function slotsLeft(used: number, limit: number = WEBSITE_TREE_MONTHLY_LIMIT): number {
  return Math.max(0, limit - Math.max(0, used));
}

export interface WebsiteTreePushPayload { title: string; body: string; url: string }

export function buildWebsiteTreePush(v: WebsiteTreeRequest, left: number): WebsiteTreePushPayload {
  return {
    title: "🌐 Nuevo pedido · Website Tree Service gratis",
    body: `${v.name} · ${v.business}\n${v.city} · ${left === 0 ? "cupos del mes agotados" : `quedan ${left} cupos este mes`}`,
    url: "/crm",
  };
}
