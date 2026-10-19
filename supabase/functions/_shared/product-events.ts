// Validación y armado de los eventos de la landing de un producto (ViewContent, InitiateCheckout) que se
// reenvían a la API de Conversiones (product-track-event). El endpoint es público, así que NADA sensible viene
// del cliente: el evento debe estar en la lista, el producto debe tener `tracking` en el catálogo y el valor,
// la moneda y el nombre salen de ese catálogo; el resto se valida con formatos estrictos.

import { EBOOK_CATALOG, type EbookProduct } from "./ebook-catalog.ts";

export const TRACK_EVENTS = ["ViewContent", "InitiateCheckout"] as const;
export type TrackEvent = (typeof TRACK_EVENTS)[number];

export const ALLOWED_ORIGINS = ["https://www.acrosoftlabs.com", "https://acrosoftlabs.com"];
const EVENT_ID = /^[A-Za-z0-9_-]{8,64}$/;

export type TrackRequest = {
  product: string;
  event: TrackEvent;
  eventId: string;
  sourceUrl: string;
  abVersion: "A" | "B" | null;
  fbp: string | null;
  fbc: string | null;
};

type Catalog = Record<string, EbookProduct>;

/** Devuelve la petición validada y normalizada, o null si algo no cuadra. */
export function parseTrackRequest(body: unknown, catalog: Catalog = EBOOK_CATALOG): TrackRequest | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;

  // Solo productos del catálogo que declaran `tracking` (Object.hasOwn: "constructor" o "__proto__" no cuentan).
  if (typeof b.product !== "string" || !Object.hasOwn(catalog, b.product)) return null;
  const tracking = catalog[b.product].tracking;
  if (!tracking) return null;

  if (typeof b.event !== "string" || !(TRACK_EVENTS as readonly string[]).includes(b.event)) return null;
  if (typeof b.event_id !== "string" || !EVENT_ID.test(b.event_id)) return null;

  let source: URL;
  try {
    source = new URL(String(b.source_url));
  } catch {
    return null;
  }
  if (!ALLOWED_ORIGINS.includes(source.origin) || source.pathname.replace(/\/$/, "") !== tracking.landingPath) return null;

  const str = (v: unknown, max: number) => (typeof v === "string" && v.length <= max ? v : null);
  return {
    product: b.product,
    event: b.event as TrackEvent,
    eventId: b.event_id,
    sourceUrl: source.toString().slice(0, 500),
    abVersion: b.ab_version === "A" || b.ab_version === "B" ? b.ab_version : null,
    fbp: str(b.fbp, 100),
    fbc: str(b.fbc, 200),
  };
}

/** custom_data del evento: mismos campos que manda el pixel del navegador (los fija el catálogo). */
export function customDataFor(req: TrackRequest, catalog: Catalog = EBOOK_CATALOG): Record<string, unknown> {
  const t = catalog[req.product].tracking!;
  return {
    content_name: t.contentName,
    content_ids: [req.product],
    content_type: "product",
    value: t.price,
    currency: t.currency ?? "USD",
    ...(req.abVersion ? { ab_version: req.abVersion } : {}),
  };
}

/** IP del visitante: cf-connecting-ip lo pone Cloudflare; x-forwarded-for de respaldo. */
export function clientIpFrom(headers: Headers): string | null {
  const raw = headers.get("cf-connecting-ip") ?? headers.get("x-forwarded-for") ?? "";
  return raw.split(",")[0].trim() || null;
}

/** Límite simple por IP (en memoria del isolate: frena ráfagas, no sustituye a un WAF). */
export function makeRateLimiter(max: number, windowMs: number, now: () => number = Date.now) {
  const hits = new Map<string, number[]>();
  return (key: string): boolean => {
    const t = now();
    const recent = (hits.get(key) ?? []).filter((x) => t - x < windowMs);
    if (recent.length >= max) {
      hits.set(key, recent);
      return false;
    }
    recent.push(t);
    hits.set(key, recent);
    if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((x) => t - x < windowMs)) hits.delete(k);
    return true;
  };
}
