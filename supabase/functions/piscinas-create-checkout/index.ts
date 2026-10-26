import { clientIpFrom, makeRateLimiter } from "../_shared/product-events.ts";
import {
  SITE_URL,
  buildKitSessionParams,
  kitPriceEnvName,
  createCheckoutLivemode,
  isAllowedOrigin,
  isLocalOrigin,
  parseCreateCheckoutRequest,
  stripeKeyEnvName,
} from "../_shared/piscinas-checkout.ts";
import { stripeCall, stripeErrorSummary } from "../_shared/stripe-call.ts";

// ─── Pública — la llaman las 4 landings (/piscinas-lp…lp4) al hacer clic en comprar el kit. Crea la Checkout Session
// del kit (US$30) que GUARDA la tarjeta (customer + setup_future_usage=off_session) para poder cobrar los upsells con
// un clic, y devuelve { url }. Si falla, la landing cae al Payment Link normal (compra sin cobro en un clic).
// No confía en el cliente: precio, moneda, nombre y URLs salen de piscinas-checkout.ts; solo se acepta un
// client_reference_id con formato "piscinas_<uuid>". Origen permitido y límite por IP.
// Clave: secret STRIPE_PISCINAS_SECRET_KEY (live) / STRIPE_PISCINAS_SECRET_KEY_TEST (test). Ver docs/piscinas-lanzamiento.md.

const allowRequest = makeRateLimiter(20, 60_000);
const allowLocalhost = () => Deno.env.get("PISCINAS_ALLOW_LOCALHOST") === "true";

function corsFor(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin(origin, allowLocalhost()) ? origin : SITE_URL,
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

const reply = (req: Request, status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsFor(req), "Content-Type": "application/json", "Cache-Control": "no-store" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsFor(req) });
  if (req.method !== "POST") return reply(req, 405, { error: "method not allowed" });

  const origin = req.headers.get("origin");
  if (!isAllowedOrigin(origin, allowLocalhost())) return reply(req, 403, { error: "origin not allowed" });

  const ip = clientIpFrom(req.headers);
  if (!allowRequest(ip ?? "unknown")) return reply(req, 429, { error: "too many requests" });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return reply(req, 400, { error: "invalid json" });
  }
  const parsed = parseCreateCheckoutRequest(body);
  if (!parsed) return reply(req, 400, { error: "invalid request" });

  const livemode = createCheckoutLivemode(origin, Deno.env.get("PISCINAS_STRIPE_MODE"));
  const keyName = stripeKeyEnvName(livemode);
  const key = Deno.env.get(keyName)?.trim();
  if (!key) {
    console.error(`[piscinas-create-checkout] ${keyName} no configurado`);
    return reply(req, 500, { error: "checkout unavailable" });
  }

  try {
    const result = await stripeCall(key, "POST", "/checkout/sessions", buildKitSessionParams({
      clientReferenceId: parsed.clientReferenceId,
      priceId: Deno.env.get(kitPriceEnvName(livemode))?.trim() || null,
      // En pruebas locales la sesión vuelve al localhost de quien prueba; en producción siempre al dominio oficial.
      siteUrl: isLocalOrigin(origin) ? origin! : SITE_URL,
    }));
    const url = result.body.url;
    if (!result.ok || typeof url !== "string" || !url.startsWith("https://checkout.stripe.com/")) {
      console.error(`[piscinas-create-checkout] Stripe no creó la sesión: ${stripeErrorSummary(result)}`);
      return reply(req, 502, { error: "checkout unavailable" });
    }
    return reply(req, 200, { url });
  } catch (err) {
    console.error("[piscinas-create-checkout] error llamando a Stripe:", err instanceof Error ? err.name : "unknown");
    return reply(req, 502, { error: "checkout unavailable" });
  }
});
