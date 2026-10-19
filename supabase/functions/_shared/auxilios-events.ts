// Validación y armado de los eventos de la landing /auxilios-lp que se reenvían a la API de
// Conversiones (auxilios-track-event). El endpoint es público, así que NADA sensible viene del
// cliente: el evento debe estar en la lista, el producto, el valor y la moneda los fija el servidor
// y el resto se valida con formatos estrictos.

export const AUXILIOS_EVENTS = ["ViewContent", "InitiateCheckout"] as const;
export type AuxiliosEvent = (typeof AUXILIOS_EVENTS)[number];

// Deben coincidir con src/lib/auxiliosConfig.ts (precio, nombre y slug del producto).
const PRODUCT_SLUG = "auxilios";
const CONTENT_NAME = "Primeros Auxilios del Bebé";
const PRICE = 25;

export const ALLOWED_ORIGINS = ["https://www.acrosoftlabs.com", "https://acrosoftlabs.com"];
const SOURCE_PATH = "/auxilios-lp";
const EVENT_ID = /^[A-Za-z0-9_-]{8,64}$/;

export type TrackRequest = {
  event: AuxiliosEvent;
  eventId: string;
  sourceUrl: string;
  abVersion: "A" | "B" | null;
  fbp: string | null;
  fbc: string | null;
};

/** Devuelve la petición validada y normalizada, o null si algo no cuadra. */
export function parseTrackRequest(body: unknown): TrackRequest | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  if (typeof b.event !== "string" || !(AUXILIOS_EVENTS as readonly string[]).includes(b.event)) return null;
  if (typeof b.event_id !== "string" || !EVENT_ID.test(b.event_id)) return null;

  let source: URL;
  try {
    source = new URL(String(b.source_url));
  } catch {
    return null;
  }
  if (!ALLOWED_ORIGINS.includes(source.origin) || source.pathname.replace(/\/$/, "") !== SOURCE_PATH) return null;

  const str = (v: unknown, max: number) => (typeof v === "string" && v.length <= max ? v : null);
  return {
    event: b.event as AuxiliosEvent,
    eventId: b.event_id,
    // Solo origen + ruta + utm/fbclid útiles; se acota por si llega algo enorme.
    sourceUrl: source.toString().slice(0, 500),
    abVersion: b.ab_version === "A" || b.ab_version === "B" ? b.ab_version : null,
    fbp: str(b.fbp, 100),
    fbc: str(b.fbc, 200),
  };
}

/** custom_data del evento: mismos campos que manda el pixel del navegador. */
export function customDataFor(req: TrackRequest): Record<string, unknown> {
  return {
    content_name: CONTENT_NAME,
    content_ids: [PRODUCT_SLUG],
    content_type: "product",
    value: PRICE,
    currency: "USD",
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
