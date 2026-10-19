import { EBOOK_CATALOG, resolveMeta } from "../_shared/ebook-catalog.ts";
import { sendMetaWebEvent } from "../_shared/meta-capi.ts";
import { ALLOWED_ORIGINS, clientIpFrom, customDataFor, makeRateLimiter, parseTrackRequest } from "../_shared/product-events.ts";

// ─── Pública — la llaman las landings de los productos (/<palabra>-lp) para reenviar ViewContent e
// InitiateCheckout a la API de Conversiones de Meta (el pixel del navegador manda el mismo evento con el mismo
// event_id y Meta deduplica). UNA sola función para todos los productos: pixel, token, nombre, precio y
// landing salen del catálogo (ebook-catalog.ts, bloque `tracking`). Al ser pública no confía en nada del
// cliente: lista cerrada de eventos, producto del catálogo, origen permitido, valor/moneda fijados acá y
// límite por IP.

const allowRequest = makeRateLimiter(30, 60_000);

function corsFor(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

const reply = (req: Request, status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsFor(req), "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsFor(req) });
  if (req.method !== "POST") return reply(req, 405, { error: "method not allowed" });

  const origin = req.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) return reply(req, 403, { error: "origin not allowed" });

  const ip = clientIpFrom(req.headers);
  if (!allowRequest(ip ?? "unknown")) return reply(req, 429, { error: "too many requests" });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return reply(req, 400, { error: "invalid json" });
  }
  const parsed = parseTrackRequest(body);
  if (!parsed) return reply(req, 400, { error: "invalid event" });

  // Pixel y token son del producto: si falta cualquiera NO se manda (mejor sin evento que al pixel equivocado).
  const meta = resolveMeta(EBOOK_CATALOG[parsed.product]);
  if (!meta) {
    console.warn(`[product-track-event] ${parsed.product}: pixel o token sin configurar; evento no enviado`);
    return reply(req, 200, { sent: false });
  }

  const result = await sendMetaWebEvent({
    eventName: parsed.event,
    eventId: parsed.eventId,
    eventSourceUrl: parsed.sourceUrl,
    visitor: { clientIp: ip, clientUserAgent: req.headers.get("user-agent"), fbp: parsed.fbp, fbc: parsed.fbc },
    customData: customDataFor(parsed),
    pixelId: meta.pixelId,
    accessToken: meta.accessToken,
    testEventCode: meta.testEventCode,
  });
  if (!result.ok) console.warn(`[product-track-event] ${parsed.product} ${parsed.event}:`, result.error);
  // Nunca se rompe la landing por esto: el cliente ignora la respuesta.
  return reply(req, 200, { sent: result.ok });
});
