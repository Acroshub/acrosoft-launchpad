import { clientIpFrom, makeRateLimiter } from "../_shared/product-events.ts";
import {
  FAILED_MESSAGE,
  SITE_URL,
  buildUp1InvoiceItemParams,
  buildUp1InvoiceParams,
  buildUp1InvoicePayParams,
  buildUp1PaymentIntentParams,
  buildUp2ProductParams,
  buildUp2SubscriptionParams,
  evaluateFrontSession,
  hasExistingUpsell,
  idempotencyKey,
  invoiceStepKey,
  isAllowedOrigin,
  livemodeFromSessionId,
  isStripePriceId,
  outcomeFromInvoice,
  outcomeFromObject,
  outcomeFromStripeError,
  parseUpsellRequest,
  stripeKeyEnvName,
  up1PriceEnvName,
  type ChargeOutcome,
  type StripeErrorLike,
  type UpsellOffer,
} from "../_shared/piscinas-checkout.ts";
import { stripeCall, stripeErrorSummary, type StripeResult } from "../_shared/stripe-call.ts";

// ─── Pública — la llaman /piscinas-up1 y /piscinas-up2 al tocar «Sí». Cobra el upsell con la MISMA tarjeta que el
// cliente usó para el kit (guardada por piscinas-create-checkout), sin pedirla otra vez:
//   up1 → PaymentIntent US$100 (off_session, confirm)      up2 → Subscription mensual US$1,000 (error_if_incomplete)
// Seguridad: el "token" es el session_id de Stripe del kit (solo lo tiene quien acaba de pagar); lista cerrada de
// ofertas; origen permitido; límite por IP; el monto sale del servidor. Nunca cobra dos veces: (1) consulta si ya hay
// un cobro/suscripción con esa metadata y responde already_paid, (2) Idempotency-Key determinista por oferta + compra.
// Respuestas: succeeded | already_paid | requires_action (+fallback:"link") | failed (+message genérico).
// Clave: STRIPE_PISCINAS_SECRET_KEY (live) / _TEST (test), según el prefijo cs_live_/cs_test_ del session_id.
// Opcional: PISCINAS_UP1_PRICE_ID (price_… de US$100) → el upsell 1 se cobra con una factura de ese price y queda bajo su producto (sin él, PaymentIntent suelto).
// Opcional: PISCINAS_UP2_PRICE_ID (price_… de US$1,000/mes) para no crear/buscar el Product desde la función.

const allowRequest = makeRateLimiter(10, 60_000);
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

const errorOf = (r: StripeResult): StripeErrorLike => (r.body.error ?? {}) as StripeErrorLike;

/** ¿Hay ya una factura PAGADA del upsell 1 para esta compra del kit? null = no se pudo comprobar. */
async function invoiceAlreadyPaid(key: string, customerId: string, frontSessionId: string): Promise<boolean | null> {
  const r = await stripeCall(key, "GET", "/invoices", { customer: customerId, limit: 100 });
  if (!r.ok) {
    console.warn(`[piscinas-upsell-charge] no se pudo consultar facturas previas: ${stripeErrorSummary(r)}`);
    return null;
  }
  const data = Array.isArray(r.body.data) ? r.body.data as { status?: string; metadata?: Record<string, string> }[] : [];
  return hasExistingUpsell("up1", frontSessionId, data, "invoice");
}

/** Upsell 1 con producto: factura de ese price, finalizada y pagada con la tarjeta guardada. Si algo falla, anula la factura y devuelve el error de Stripe. */
async function chargeUp1WithInvoice(key: string, priceId: string, charge: { customerId: string; paymentMethodId: string; currency: string; frontSessionId: string }): Promise<StripeResult> {
  const inv = await stripeCall(key, "POST", "/invoices", buildUp1InvoiceParams(charge), { idempotencyKey: invoiceStepKey("invoice", charge.frontSessionId) });
  const invoiceId = inv.body.id;
  if (!inv.ok || typeof invoiceId !== "string") return inv;
  const voidInvoice = async () => { await stripeCall(key, "POST", `/invoices/${invoiceId}/void`, {}); };

  const item = await stripeCall(key, "POST", "/invoiceitems", buildUp1InvoiceItemParams(charge, invoiceId, priceId), { idempotencyKey: invoiceStepKey("item", charge.frontSessionId) });
  if (!item.ok) { await voidInvoice(); return item; }
  const fin = await stripeCall(key, "POST", `/invoices/${invoiceId}/finalize_invoice`, { auto_advance: false }, { idempotencyKey: invoiceStepKey("finalize", charge.frontSessionId) });
  if (!fin.ok) return fin; // sigue en borrador: Stripe la limpia sola; no se puede anular un borrador
  const paid = await stripeCall(key, "POST", `/invoices/${invoiceId}/pay`, buildUp1InvoicePayParams(charge), { idempotencyKey: invoiceStepKey("pay", charge.frontSessionId) });
  if (!paid.ok || paid.body.status !== "paid") await voidInvoice();
  return paid;
}

/** ¿Ya existe el cobro/suscripción de esta oferta para esta compra del kit? null = no se pudo comprobar (se sigue con la idempotency key). */
async function alreadyCharged(key: string, offer: UpsellOffer, customerId: string, frontSessionId: string): Promise<boolean | null> {
  const r = offer === "up1"
    ? await stripeCall(key, "GET", "/payment_intents", { customer: customerId, limit: 100 })
    : await stripeCall(key, "GET", "/subscriptions", { customer: customerId, status: "all", limit: 100 });
  if (!r.ok) {
    console.warn(`[piscinas-upsell-charge] no se pudo consultar cobros previos: ${stripeErrorSummary(r)}`);
    return null;
  }
  const data = Array.isArray(r.body.data) ? r.body.data as { status?: string; metadata?: Record<string, string> }[] : [];
  return hasExistingUpsell(offer, frontSessionId, data);
}

/** Price del upsell 2: el del secret PISCINAS_UP2_PRICE_ID, o un Product reutilizado/creado (el price se crea inline). */
async function up2Price(key: string): Promise<{ priceId: string } | { productId: string } | null> {
  const priceId = Deno.env.get("PISCINAS_UP2_PRICE_ID")?.trim();
  if (priceId) return { priceId };
  const found = await stripeCall(key, "GET", "/products/search", { query: `metadata["piscinas_offer"]:"up2" AND active:"true"`, limit: 1 });
  const existing = found.ok && Array.isArray(found.body.data) ? (found.body.data[0] as { id?: string } | undefined)?.id : undefined;
  if (existing) return { productId: existing };
  const created = await stripeCall(key, "POST", "/products", buildUp2ProductParams(), { idempotencyKey: "piscinas-up2-product-v1" });
  const id = created.body.id;
  if (!created.ok || typeof id !== "string") {
    console.error(`[piscinas-upsell-charge] no se pudo crear el Product del upsell 2: ${stripeErrorSummary(created)}`);
    return null;
  }
  return { productId: id };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsFor(req) });
  if (req.method !== "POST") return reply(req, 405, { error: "method not allowed" });

  if (!isAllowedOrigin(req.headers.get("origin"), allowLocalhost())) return reply(req, 403, { error: "origin not allowed" });

  const ip = clientIpFrom(req.headers);
  if (!allowRequest(ip ?? "unknown")) return reply(req, 429, { error: "too many requests" });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return reply(req, 400, { error: "invalid json" });
  }
  const parsed = parseUpsellRequest(body);
  if (!parsed) return reply(req, 400, { error: "invalid request" });
  const { frontSessionId, offer } = parsed;

  const failed: ChargeOutcome = { status: "failed", message: FAILED_MESSAGE };
  const keyName = stripeKeyEnvName(livemodeFromSessionId(frontSessionId));
  const key = Deno.env.get(keyName)?.trim();
  if (!key) {
    console.error(`[piscinas-upsell-charge] ${keyName} no configurado`);
    return reply(req, 200, failed);
  }

  try {
    // (a) La compra del kit: pagada, de Piscinas, con customer y tarjeta guardada.
    const sessionRes = await stripeCall(key, "GET", `/checkout/sessions/${encodeURIComponent(frontSessionId)}`, { expand: ["payment_intent.payment_method"] });
    if (!sessionRes.ok) {
      console.warn(`[piscinas-upsell-charge] no se pudo leer la sesión del kit: ${stripeErrorSummary(sessionRes)}`);
      return reply(req, 200, failed);
    }
    const front = evaluateFrontSession(sessionRes.body);
    if (!front.ok) {
      console.warn(`[piscinas-upsell-charge] ${offer}: sesión del kit no cobrable (${front.reason})`);
      return reply(req, 200, failed);
    }

    // Upsell 1 con producto: si hay price del upsell 1 en los secrets, se cobra con factura (queda bajo ese producto).
    const up1PriceId = offer === "up1" ? Deno.env.get(up1PriceEnvName(livemodeFromSessionId(frontSessionId)))?.trim() : undefined;
    const useInvoice = isStripePriceId(up1PriceId);

    // (d) Ya cobrado → no se duplica (con factura se revisan facturas y pagos sueltos, por si se cambió de modo).
    const paidBefore = await alreadyCharged(key, offer, front.customerId, frontSessionId) === true ||
      (useInvoice && await invoiceAlreadyPaid(key, front.customerId, frontSessionId) === true);
    if (paidBefore) {
      console.log(`[piscinas-upsell-charge] ${offer} ya estaba cobrado para ${frontSessionId}`);
      return reply(req, 200, { status: "already_paid" } satisfies ChargeOutcome);
    }

    const charge = { customerId: front.customerId, paymentMethodId: front.paymentMethodId, currency: front.currency, frontSessionId };
    let result: StripeResult;
    if (offer === "up1" && useInvoice) {
      // (b') Factura del price del upsell 1, finalizada y pagada.
      result = await chargeUp1WithInvoice(key, up1PriceId as string, charge);
    } else if (offer === "up1") {
      // (b) PaymentIntent US$100 con Idempotency-Key determinista.
      result = await stripeCall(key, "POST", "/payment_intents", buildUp1PaymentIntentParams(charge), { idempotencyKey: idempotencyKey("up1", frontSessionId) });
    } else {
      // (c) Suscripción mensual US$1,000.
      const price = await up2Price(key);
      if (!price) return reply(req, 200, failed);
      result = await stripeCall(key, "POST", "/subscriptions", buildUp2SubscriptionParams(charge, price), { idempotencyKey: idempotencyKey("up2", frontSessionId) });
    }

    const outcome = result.ok
      ? (offer === "up1" && useInvoice ? outcomeFromInvoice(result.body as { status?: string }) : outcomeFromObject(offer, result.body as { status?: string }))
      : outcomeFromStripeError(errorOf(result));
    // Log sin datos de tarjeta ni de cliente: oferta, sesión, resultado y código de error de Stripe.
    console.log(`[piscinas-upsell-charge] ${offer} ${frontSessionId} → ${outcome.status}${result.ok ? "" : ` (${stripeErrorSummary(result)})`}`);
    return reply(req, 200, outcome);
  } catch (err) {
    console.error("[piscinas-upsell-charge] error:", err instanceof Error ? err.name : "unknown");
    return reply(req, 200, failed);
  }
});
