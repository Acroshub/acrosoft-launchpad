// Lógica pura (sin red ni Deno.serve) del cobro en un clic de los upsells de «Kit Llena tu Calendario de
// Piscinas». La usan piscinas-create-checkout, piscinas-upsell-charge y stripe-webhook, y se prueba en
// piscinas-checkout.test.ts. Nada de esto toca Stripe: solo arma parámetros, valida entradas y clasifica respuestas.
//
// Flujo: el kit se cobra con una Checkout Session creada por el servidor que GUARDA la tarjeta (customer +
// setup_future_usage=off_session). En /piscinas-up1 y /piscinas-up2 un clic cobra con esa misma tarjeta.

import { ALLOWED_ORIGINS } from "./product-events.ts";

export const PISCINAS_SLUG = "piscinas";
export const KIT_NAME = "Kit Llena tu Calendario de Piscinas";
export const KIT_AMOUNT_CENTS = 3000; // US$30 (debe coincidir con PISCINAS_PRICE de src/lib/piscinasConfig.ts)
export const KIT_CURRENCY = "usd";
export const UP1_AMOUNT_CENTS = 10000; // US$100 pago único (PISCINAS_UP1_PRICE)
export const UP2_AMOUNT_CENTS = 100000; // US$1,000/mes (PISCINAS_UP2_PRICE_MONTHLY)
export const SITE_URL = "https://www.acrosoftlabs.com";

export const UPSELL_OFFERS = ["up1", "up2"] as const;
export type UpsellOffer = (typeof UPSELL_OFFERS)[number];

/** Texto de consentimiento que Stripe muestra junto al botón de pagar (custom_text.submit.message, máx. 1200). */
export const CONSENT_TEXT =
  "Al pagar, autorizas que guardemos tu método de pago para poder cobrarte, con un solo clic, las ofertas adicionales que decidas aceptar después de tu compra.";

export const UP_LABELS: Record<UpsellOffer, string> = {
  up1: "Piscinas · Creación de campaña publicitaria (pago único)",
  up2: "Piscinas · Gestión completa de anuncios (mensual)",
};

// ─── Origen y entrada ───────────────────────────────────────────────────────

const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1):\d{2,5}$/;

/** Solo acrosoftlabs.com; localhost únicamente si el entorno lo habilita (PISCINAS_ALLOW_LOCALHOST=true, para pruebas). */
export function isAllowedOrigin(origin: string | null | undefined, allowLocalhost = false): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  return allowLocalhost && LOCAL_ORIGIN.test(origin);
}

export function isLocalOrigin(origin: string | null | undefined): boolean {
  return !!origin && LOCAL_ORIGIN.test(origin);
}

const CLIENT_REF = /^piscinas(_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?$/i;

/** Body de piscinas-create-checkout: solo `client_reference_id` ("piscinas_<uuid>"); sin él se usa "piscinas". null = inválido. */
export function parseCreateCheckoutRequest(body: unknown): { clientReferenceId: string } | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return null;
  const ref = (body as Record<string, unknown>).client_reference_id;
  if (ref === undefined || ref === null || ref === "") return { clientReferenceId: PISCINAS_SLUG };
  if (typeof ref !== "string" || !CLIENT_REF.test(ref)) return null;
  return { clientReferenceId: ref.toLowerCase() };
}

const FRONT_SESSION = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;

/** Body de piscinas-upsell-charge: session_id de Stripe del kit + oferta de la lista cerrada. null = inválido. */
export function parseUpsellRequest(body: unknown): { frontSessionId: string; offer: UpsellOffer } | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return null;
  const b = body as Record<string, unknown>;
  if (typeof b.front_session_id !== "string" || !FRONT_SESSION.test(b.front_session_id)) return null;
  if (typeof b.offer !== "string" || !(UPSELL_OFFERS as readonly string[]).includes(b.offer)) return null;
  return { frontSessionId: b.front_session_id, offer: b.offer as UpsellOffer };
}

// ─── Claves de Stripe (secret nuevo por entorno, igual que stripe-balance.ts) ─

export function stripeKeyEnvName(livemode: boolean): string {
  return livemode ? "STRIPE_PISCINAS_SECRET_KEY" : "STRIPE_PISCINAS_SECRET_KEY_TEST";
}

/** El modo de una Checkout Session se lee de su id: cs_live_… / cs_test_… */
export function livemodeFromSessionId(id: string): boolean {
  return id.startsWith("cs_live_");
}

/** Dónde se crea la sesión del kit: test si se prueba desde localhost o si PISCINAS_STRIPE_MODE=test; si no, live. */
export function createCheckoutLivemode(origin: string | null | undefined, stripeModeEnv: string | undefined): boolean {
  if (isLocalOrigin(origin)) return false;
  return stripeModeEnv?.trim().toLowerCase() !== "test";
}

// ─── Form-encoding de la API de Stripe ──────────────────────────────────────

export type FormValue = string | number | boolean | null | undefined | FormValue[] | { [k: string]: FormValue };

/** Convierte un objeto anidado a pares `a[b][0]=c` (formato de la API de Stripe). Omite null/undefined. */
export function toFormPairs(value: FormValue, prefix = ""): [string, string][] {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value.flatMap((v, i) => toFormPairs(v, `${prefix}[${i}]`));
  if (typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => toFormPairs(v, prefix ? `${prefix}[${k}]` : k));
  }
  return [[prefix, String(value)]];
}

export function toFormBody(value: { [k: string]: FormValue }): string {
  return new URLSearchParams(toFormPairs(value)).toString();
}

// ─── Kit: Checkout Session ──────────────────────────────────────────────────

/** Secret con el `price_…` del kit creado a mano en Stripe (uno por modo: un precio de live no existe en test). */
export function kitPriceEnvName(livemode: boolean): string {
  return livemode ? "PISCINAS_KIT_PRICE_ID" : "PISCINAS_KIT_PRICE_ID_TEST";
}

export const isStripePriceId = (v: unknown): v is string => typeof v === "string" && /^price_[A-Za-z0-9]{8,}$/.test(v);

/**
 * Sesión del kit. Con `priceId` (precio creado una vez en Stripe) todas las ventas quedan bajo UN producto; sin él, se arma el precio
 * en línea (Stripe crea un producto suelto por compra). Un `priceId` inválido se ignora.
 */
export function buildKitSessionParams(opts: { clientReferenceId: string; siteUrl?: string; priceId?: string | null }): { [k: string]: FormValue } {
  const site = opts.siteUrl ?? SITE_URL;
  const metadata = { product: PISCINAS_SLUG, step: "kit", product_slug: PISCINAS_SLUG };
  return {
    mode: "payment",
    // Solo tarjeta (incluye Apple Pay / Google Pay): son los métodos que se pueden volver a cobrar sin el cliente.
    payment_method_types: ["card"],
    customer_creation: "always",
    client_reference_id: opts.clientReferenceId,
    line_items: [isStripePriceId(opts.priceId)
      ? { quantity: 1, price: opts.priceId }
      : { quantity: 1, price_data: { currency: KIT_CURRENCY, unit_amount: KIT_AMOUNT_CENTS, product_data: { name: KIT_NAME } } }],
    payment_intent_data: { setup_future_usage: "off_session", metadata },
    metadata,
    // {CHECKOUT_SESSION_ID} lo reemplaza Stripe; /piscinas-up1 guarda ese id para cobrar el upsell.
    success_url: `${site}/piscinas-up1?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site}/piscinas-lp`,
    custom_text: { submit: { message: CONSENT_TEXT } },
  };
}

// ─── Upsells ────────────────────────────────────────────────────────────────

/** Claves de idempotencia deterministas: un doble clic o una recarga reintenta la MISMA petición y Stripe no cobra dos veces. */
export function idempotencyKey(offer: UpsellOffer, frontSessionId: string): string {
  return `piscinas-${offer}-${frontSessionId}`;
}

export type StripeRef = string | { id?: string | null; customer?: string | { id?: string | null } | null } | null | undefined;

const idOf = (ref: StripeRef): string | null => (typeof ref === "string" ? ref : ref?.id ?? null);

export type FrontSessionLike = {
  payment_status?: string;
  metadata?: Record<string, string> | null;
  currency?: string | null;
  customer?: StripeRef;
  payment_intent?: { payment_method?: StripeRef } | string | null;
};

export type FrontSessionCheck =
  | { ok: true; customerId: string; paymentMethodId: string; currency: string }
  | { ok: false; reason: "not_paid" | "not_piscinas" | "no_customer" | "no_payment_method" };

/** La sesión del kit debe estar pagada, ser de Piscinas y traer customer + método de pago guardado a ese customer. */
export function evaluateFrontSession(s: FrontSessionLike): FrontSessionCheck {
  if (s.payment_status !== "paid") return { ok: false, reason: "not_paid" };
  if (s.metadata?.product !== PISCINAS_SLUG) return { ok: false, reason: "not_piscinas" };
  const customerId = idOf(s.customer);
  if (!customerId) return { ok: false, reason: "no_customer" };
  const pi = typeof s.payment_intent === "object" && s.payment_intent !== null ? s.payment_intent : null;
  const pm = pi?.payment_method;
  const paymentMethodId = idOf(pm);
  // Un método de pago que no quedó asociado al customer no se puede cobrar fuera de sesión.
  const pmCustomer = typeof pm === "object" && pm !== null ? idOf(pm.customer) : null;
  if (!paymentMethodId || !pmCustomer || pmCustomer !== customerId) return { ok: false, reason: "no_payment_method" };
  return { ok: true, customerId, paymentMethodId, currency: (s.currency ?? KIT_CURRENCY).toLowerCase() };
}

type Charge = { customerId: string; paymentMethodId: string; currency: string; frontSessionId: string };

const upsellMetadata = (offer: UpsellOffer, frontSessionId: string) => ({
  product: PISCINAS_SLUG, step: offer, front_session_id: frontSessionId,
});

/** Upsell 1: PaymentIntent de US$100, confirmado de inmediato con la tarjeta guardada, sin que el cliente esté en sesión. */
export function buildUp1PaymentIntentParams(c: Charge): { [k: string]: FormValue } {
  return {
    amount: UP1_AMOUNT_CENTS,
    currency: c.currency,
    customer: c.customerId,
    payment_method: c.paymentMethodId,
    off_session: true,
    confirm: true,
    description: UP_LABELS.up1,
    metadata: upsellMetadata("up1", c.frontSessionId),
  };
}

/** Secret con el `price_…` del upsell 1 ($100, pago único) creado en Stripe, uno por modo. Con él, el cobro del upsell 1 se hace con una factura y queda bajo ese producto. */
export function up1PriceEnvName(livemode: boolean): string {
  return livemode ? "PISCINAS_UP1_PRICE_ID" : "PISCINAS_UP1_PRICE_ID_TEST";
}

/**
 * Upsell 1 con producto (secret PISCINAS_UP1_PRICE_ID): en vez de un pago suelto se crea una factura de ese precio y se cobra al instante con la
 * tarjeta guardada. Pasos: (1) factura en borrador, (2) línea con el price, (3) finalizar, (4) pagar. Todos con Idempotency-Key determinista.
 */
export function buildUp1InvoiceParams(c: Charge): { [k: string]: FormValue } {
  return {
    customer: c.customerId,
    collection_method: "charge_automatically",
    auto_advance: false,
    default_payment_method: c.paymentMethodId,
    currency: c.currency,
    pending_invoice_items_behavior: "exclude",
    description: UP_LABELS.up1,
    metadata: upsellMetadata("up1", c.frontSessionId),
  };
}

export function buildUp1InvoiceItemParams(c: Charge, invoiceId: string, priceId: string): { [k: string]: FormValue } {
  return { customer: c.customerId, invoice: invoiceId, price: priceId, metadata: upsellMetadata("up1", c.frontSessionId) };
}

export function buildUp1InvoicePayParams(c: Charge): { [k: string]: FormValue } {
  return { off_session: true, payment_method: c.paymentMethodId };
}

/** Claves de idempotencia por paso de la factura del upsell 1 (una compra del kit = una sola factura). */
export function invoiceStepKey(step: "invoice" | "item" | "finalize" | "pay", frontSessionId: string): string {
  return `piscinas-up1-inv-${step}-${frontSessionId}`;
}

/** Factura pagada → éxito; cualquier otro estado → fallo (el que llama anula la factura). */
export function outcomeFromInvoice(inv: { status?: string } | null | undefined): ChargeOutcome {
  return inv?.status === "paid" ? { status: "succeeded" } : { status: "failed", message: FAILED_MESSAGE };
}

/** Upsell 2 con el price creado/reutilizado (`items[0][price]`) o con el secret PISCINAS_UP2_PRICE_ID. */
export function buildUp2SubscriptionParams(c: Charge, price: { priceId: string } | { productId: string }): { [k: string]: FormValue } {
  const item = "priceId" in price
    ? { price: price.priceId }
    : { price_data: { currency: c.currency, unit_amount: UP2_AMOUNT_CENTS, recurring: { interval: "month" }, product: price.productId } };
  return {
    customer: c.customerId,
    default_payment_method: c.paymentMethodId,
    items: [item],
    off_session: true,
    payment_behavior: "error_if_incomplete",
    description: UP_LABELS.up2,
    metadata: upsellMetadata("up2", c.frontSessionId),
  };
}

export function buildUp2ProductParams(): { [k: string]: FormValue } {
  return { name: "Gestión completa de anuncios (Piscinas)", metadata: { piscinas_offer: "up2" } };
}

type Existing = { status?: string; metadata?: Record<string, string> | null };

const PI_PAID = ["succeeded", "processing"];
const SUB_LIVE = ["active", "trialing", "past_due", "unpaid"];

/** ¿Ya hay un cobro/suscripción de esta oferta para esta compra del kit? (lista de PaymentIntents o Subscriptions del customer) */
export function hasExistingUpsell(offer: UpsellOffer, frontSessionId: string, items: Existing[], kind: "default" | "invoice" = "default"): boolean {
  const live = kind === "invoice" ? ["paid"] : offer === "up1" ? PI_PAID : SUB_LIVE;
  return items.some((i) =>
    i.metadata?.product === PISCINAS_SLUG && i.metadata?.step === offer &&
    i.metadata?.front_session_id === frontSessionId && !!i.status && live.includes(i.status)
  );
}

export type StripeErrorLike = {
  type?: string;
  code?: string;
  decline_code?: string;
  payment_intent?: { status?: string } | null;
};

/** El banco pide autenticación (3DS) → no se puede cobrar sin el cliente: plan de reserva con el Payment Link. */
export function isAuthenticationRequired(err: StripeErrorLike | null | undefined): boolean {
  if (!err) return false;
  return err.code === "authentication_required" || err.decline_code === "authentication_required" ||
    err.code === "subscription_payment_intent_requires_action" || err.payment_intent?.status === "requires_action";
}

export type ChargeOutcome =
  | { status: "succeeded" }
  | { status: "already_paid" }
  | { status: "requires_action"; fallback: "link" }
  | { status: "failed"; message: string };

export const FAILED_MESSAGE = "No pudimos completar el cobro con tu tarjeta.";

export function outcomeFromStripeError(err: StripeErrorLike | null | undefined): ChargeOutcome {
  return isAuthenticationRequired(err) ? { status: "requires_action", fallback: "link" } : { status: "failed", message: FAILED_MESSAGE };
}

/** Estado del PaymentIntent (up1) o de la Subscription (up2) creados → respuesta para el navegador. */
export function outcomeFromObject(offer: UpsellOffer, obj: { status?: string } | null | undefined): ChargeOutcome {
  const st = obj?.status;
  if (offer === "up1") {
    if (st === "succeeded" || st === "processing") return { status: "succeeded" };
    if (st === "requires_action") return { status: "requires_action", fallback: "link" };
  } else if (st === "active" || st === "trialing") {
    return { status: "succeeded" };
  }
  return { status: "failed", message: FAILED_MESSAGE };
}

// ─── Webhook: eventos de upsells para el cumplimiento manual ───────────────

export type UpsellEventLog = {
  event: string;
  step: UpsellOffer;
  front_session_id: string | null;
  object_id: string | null;
  customer: string | null;
  amount: number | null;
  currency: string | null;
  livemode: boolean;
};

/**
 * Si el evento es de un upsell de Piscinas (metadata.product==="piscinas" y step up1/up2) devuelve un resumen SIN datos
 * sensibles (solo ids, monto y moneda) para el log; si no, null. El del kit (step "kit") lo atiende checkout.session.completed.
 */
export function describeUpsellEvent(event: { type?: string; data?: { object?: Record<string, unknown> } }): UpsellEventLog | null {
  const type = event.type ?? "";
  if (!["payment_intent.succeeded", "invoice.paid", "customer.subscription.created"].includes(type)) return null;
  const obj = (event.data?.object ?? {}) as Record<string, unknown>;

  const md = (v: unknown): Record<string, string> | undefined =>
    typeof v === "object" && v !== null ? (v as Record<string, string>) : undefined;
  let metadata = md(obj.metadata);
  if (type === "invoice.paid") {
    // La metadata de la suscripción llega en la factura según la versión de la API.
    const parent = md((md(obj.parent) as Record<string, unknown> | undefined)?.subscription_details);
    const fromParent = md((parent as Record<string, unknown> | undefined)?.metadata);
    const fromLegacy = md((md(obj.subscription_details) as Record<string, unknown> | undefined)?.metadata);
    const line = ((obj.lines as { data?: { metadata?: Record<string, string> }[] } | undefined)?.data ?? [])[0]?.metadata;
    metadata = [metadata, fromParent, fromLegacy, line].find((m) => m?.product === PISCINAS_SLUG) ?? metadata;
  }
  if (metadata?.product !== PISCINAS_SLUG) return null;
  const step = metadata.step;
  if (step !== "up1" && step !== "up2") return null;

  const str = (v: unknown) => (typeof v === "string" ? v : null);
  const num = (v: unknown) => (typeof v === "number" ? v : null);
  const amount = type === "invoice.paid" ? num(obj.amount_paid)
    : type === "payment_intent.succeeded" ? num(obj.amount_received) ?? num(obj.amount)
    : null;
  return {
    event: type,
    step,
    front_session_id: str(metadata.front_session_id),
    object_id: str(obj.id),
    customer: str(obj.customer),
    amount,
    currency: str(obj.currency),
    livemode: obj.livemode === true,
  };
}
