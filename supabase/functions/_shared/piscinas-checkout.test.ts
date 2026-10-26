import { assert, assertEquals, assertFalse, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { EBOOK_CATALOG, type EnvGetter } from "./ebook-catalog.ts";
import { resolveProductSlug } from "./ebook-order.ts";
import {
  CONSENT_TEXT,
  KIT_AMOUNT_CENTS,
  UP1_AMOUNT_CENTS,
  UP2_AMOUNT_CENTS,
  buildKitSessionParams,
  buildUp1InvoiceItemParams,
  buildUp1InvoiceParams,
  buildUp1InvoicePayParams,
  invoiceStepKey,
  isStripePriceId,
  outcomeFromInvoice,
  up1PriceEnvName,
  kitPriceEnvName,
  buildUp1PaymentIntentParams,
  buildUp2SubscriptionParams,
  createCheckoutLivemode,
  describeUpsellEvent,
  evaluateFrontSession,
  hasExistingUpsell,
  idempotencyKey,
  isAllowedOrigin,
  livemodeFromSessionId,
  outcomeFromObject,
  outcomeFromStripeError,
  parseCreateCheckoutRequest,
  parseUpsellRequest,
  stripeKeyEnvName,
  toFormBody,
} from "./piscinas-checkout.ts";

const envOf = (vars: Record<string, string>): EnvGetter => (name) => vars[name];
const UUID = "6f1c2d3e-0a1b-4c5d-8e9f-0123456789ab";
const SID = "cs_test_a1B2c3D4e5F6g7H8i9J0";

// ─── origen ─────────────────────────────────────────────────────────────────

Deno.test("isAllowedOrigin - solo acrosoftlabs.com; localhost únicamente si se habilita", () => {
  assert(isAllowedOrigin("https://www.acrosoftlabs.com"));
  assert(isAllowedOrigin("https://acrosoftlabs.com"));
  assertFalse(isAllowedOrigin("http://www.acrosoftlabs.com"));
  assertFalse(isAllowedOrigin("https://acrosoftlabs.com.evil.com"));
  assertFalse(isAllowedOrigin("https://evil.com"));
  assertFalse(isAllowedOrigin(null));
  assertFalse(isAllowedOrigin(""));
  assertFalse(isAllowedOrigin("http://localhost:8080"));
  assert(isAllowedOrigin("http://localhost:8080", true));
  assert(isAllowedOrigin("http://127.0.0.1:5173", true));
  assertFalse(isAllowedOrigin("http://localhost.evil.com:8080", true));
  assertFalse(isAllowedOrigin("https://localhost:8080", true));
});

// ─── entradas ───────────────────────────────────────────────────────────────

Deno.test("parseCreateCheckoutRequest - client_reference_id estricto", () => {
  assertEquals(parseCreateCheckoutRequest({ client_reference_id: `piscinas_${UUID}` }), { clientReferenceId: `piscinas_${UUID}` });
  assertEquals(parseCreateCheckoutRequest({}), { clientReferenceId: "piscinas" });
  assertEquals(parseCreateCheckoutRequest({ client_reference_id: "piscinas" }), { clientReferenceId: "piscinas" });
  assertEquals(parseCreateCheckoutRequest({ client_reference_id: "toefl-b2_" + UUID }), null);
  assertEquals(parseCreateCheckoutRequest({ client_reference_id: "piscinas_lo-que-sea" }), null);
  assertEquals(parseCreateCheckoutRequest({ client_reference_id: 5 }), null);
  assertEquals(parseCreateCheckoutRequest(null), null);
  assertEquals(parseCreateCheckoutRequest([]), null);
  assertEquals(parseCreateCheckoutRequest("x"), null);
});

Deno.test("parseUpsellRequest - lista cerrada de ofertas y session_id con formato de Stripe", () => {
  assertEquals(parseUpsellRequest({ front_session_id: SID, offer: "up1" }), { frontSessionId: SID, offer: "up1" });
  assertEquals(parseUpsellRequest({ front_session_id: SID, offer: "up2" })?.offer, "up2");
  assertEquals(parseUpsellRequest({ front_session_id: SID, offer: "up3" }), null);
  assertEquals(parseUpsellRequest({ front_session_id: SID, offer: "constructor" }), null);
  assertEquals(parseUpsellRequest({ front_session_id: SID }), null);
  assertEquals(parseUpsellRequest({ front_session_id: "cs_test_", offer: "up1" }), null);
  assertEquals(parseUpsellRequest({ front_session_id: "pi_123456789012345", offer: "up1" }), null);
  assertEquals(parseUpsellRequest({ front_session_id: SID + "/../x", offer: "up1" }), null);
  assertEquals(parseUpsellRequest({ front_session_id: `${SID}?expand[]=x`, offer: "up1" }), null);
  assertEquals(parseUpsellRequest(null), null);
});

// ─── claves y modo ──────────────────────────────────────────────────────────

Deno.test("claves de Stripe por modo y modo de la sesión de pago", () => {
  assertEquals(stripeKeyEnvName(true), "STRIPE_PISCINAS_SECRET_KEY");
  assertEquals(stripeKeyEnvName(false), "STRIPE_PISCINAS_SECRET_KEY_TEST");
  assert(livemodeFromSessionId("cs_live_abc"));
  assertFalse(livemodeFromSessionId("cs_test_abc"));
  assert(createCheckoutLivemode("https://www.acrosoftlabs.com", undefined));
  assertFalse(createCheckoutLivemode("http://localhost:8080", undefined));
  assertFalse(createCheckoutLivemode("https://www.acrosoftlabs.com", "test"));
  assert(createCheckoutLivemode("https://www.acrosoftlabs.com", "live"));
});

// ─── form-encoding ──────────────────────────────────────────────────────────

Deno.test("toFormBody - anidados, arreglos, booleanos; omite null/undefined", () => {
  const body = new URLSearchParams(toFormBody({ a: { b: "x" }, items: [{ price: "p1" }], ok: true, n: 5, skip: undefined, nul: null }));
  assertEquals(body.get("a[b]"), "x");
  assertEquals(body.get("items[0][price]"), "p1");
  assertEquals(body.get("ok"), "true");
  assertEquals(body.get("n"), "5");
  assertFalse(body.has("skip"));
  assertFalse(body.has("nul"));
});

// ─── kit: Checkout Session ──────────────────────────────────────────────────

Deno.test("buildKitSessionParams - guarda la tarjeta, cobra US$30 y lleva consentimiento", () => {
  const p = new URLSearchParams(toFormBody(buildKitSessionParams({ clientReferenceId: `piscinas_${UUID}` })));
  assertEquals(p.get("mode"), "payment");
  assertEquals(p.get("customer_creation"), "always");
  assertEquals(p.get("payment_intent_data[setup_future_usage]"), "off_session");
  assertEquals(p.get("client_reference_id"), `piscinas_${UUID}`);
  assertEquals(p.get("payment_method_types[0]"), "card");
  assertEquals(p.get("line_items[0][price_data][unit_amount]"), String(KIT_AMOUNT_CENTS));
  assertEquals(p.get("line_items[0][price_data][currency]"), "usd");
  assertEquals(p.get("line_items[0][price_data][product_data][name]"), "Kit Llena tu Calendario de Piscinas");
  assertEquals(p.get("line_items[0][quantity]"), "1");
  assertEquals(p.get("metadata[product]"), "piscinas");
  assertEquals(p.get("metadata[step]"), "kit");
  assertEquals(p.get("success_url"), "https://www.acrosoftlabs.com/piscinas-up1?session_id={CHECKOUT_SESSION_ID}");
  assertEquals(p.get("cancel_url"), "https://www.acrosoftlabs.com/piscinas-lp");
  assertEquals(p.get("custom_text[submit][message]"), CONSENT_TEXT);
  assert(CONSENT_TEXT.length <= 1200);
  assertStringIncludes(CONSENT_TEXT, "guardemos tu método de pago");
});

Deno.test("buildKitSessionParams - siteUrl de pruebas locales", () => {
  const p = new URLSearchParams(toFormBody(buildKitSessionParams({ clientReferenceId: "piscinas", siteUrl: "http://localhost:8080" })));
  assertEquals(p.get("success_url"), "http://localhost:8080/piscinas-up1?session_id={CHECKOUT_SESSION_ID}");
});

Deno.test("el kit creado por el servidor se identifica como Piscinas en stripe-webhook (metadata y client_reference_id)", () => {
  const params = buildKitSessionParams({ clientReferenceId: `piscinas_${UUID}` }) as {
    client_reference_id: string; metadata: Record<string, string>;
  };
  assertEquals(resolveProductSlug({ client_reference_id: params.client_reference_id, metadata: params.metadata }, envOf({})), "piscinas");
  assertEquals(resolveProductSlug({ client_reference_id: params.client_reference_id }, envOf({})), "piscinas");
  assertEquals(resolveProductSlug({ metadata: params.metadata }, envOf({})), "piscinas");
  assert(Object.hasOwn(EBOOK_CATALOG, "piscinas"));
});

Deno.test("montos del servidor coinciden con los del navegador (piscinasConfig.ts)", async () => {
  const config = await Deno.readTextFile(new URL("../../../src/lib/piscinasConfig.ts", import.meta.url));
  assertEquals(KIT_AMOUNT_CENTS, Number(config.match(/PISCINAS_PRICE = (\d+)/)?.[1]) * 100);
  assertEquals(UP1_AMOUNT_CENTS, Number(config.match(/PISCINAS_UP1_PRICE = (\d+)/)?.[1]) * 100);
  assertEquals(UP2_AMOUNT_CENTS, Number(config.match(/PISCINAS_UP2_PRICE_MONTHLY = (\d+)/)?.[1]) * 100);
  assertEquals(EBOOK_CATALOG["piscinas"].name, config.match(/PISCINAS_CONTENT_NAME = "([^"]+)"/)?.[1]);
});

// ─── sesión del kit ─────────────────────────────────────────────────────────

const goodSession = () => ({
  payment_status: "paid",
  metadata: { product: "piscinas", step: "kit" },
  currency: "usd",
  customer: "cus_1",
  payment_intent: { payment_method: { id: "pm_1", customer: "cus_1" } },
});

Deno.test("evaluateFrontSession - acepta la compra del kit con tarjeta guardada", () => {
  assertEquals(evaluateFrontSession(goodSession()), { ok: true, customerId: "cus_1", paymentMethodId: "pm_1", currency: "usd" });
  assertEquals(evaluateFrontSession({ ...goodSession(), customer: { id: "cus_1" } }).ok, true);
});

Deno.test("evaluateFrontSession - rechaza sin pagar, de otro producto, sin customer o sin tarjeta guardada", () => {
  assertEquals(evaluateFrontSession({ ...goodSession(), payment_status: "unpaid" }), { ok: false, reason: "not_paid" });
  assertEquals(evaluateFrontSession({ ...goodSession(), metadata: { product: "toefl" } }), { ok: false, reason: "not_piscinas" });
  assertEquals(evaluateFrontSession({ ...goodSession(), metadata: null }), { ok: false, reason: "not_piscinas" });
  assertEquals(evaluateFrontSession({ ...goodSession(), customer: null }), { ok: false, reason: "no_customer" });
  assertEquals(evaluateFrontSession({ ...goodSession(), payment_intent: "pi_1" }), { ok: false, reason: "no_payment_method" });
  assertEquals(evaluateFrontSession({ ...goodSession(), payment_intent: { payment_method: { id: "pm_1", customer: null } } }), { ok: false, reason: "no_payment_method" });
  assertEquals(evaluateFrontSession({ ...goodSession(), payment_intent: { payment_method: { id: "pm_1", customer: "cus_OTRO" } } }), { ok: false, reason: "no_payment_method" });
});

// ─── upsells: parámetros e idempotencia ─────────────────────────────────────

Deno.test("idempotencyKey - determinista por oferta y compra", () => {
  assertEquals(idempotencyKey("up1", SID), `piscinas-up1-${SID}`);
  assertEquals(idempotencyKey("up2", SID), `piscinas-up2-${SID}`);
  assertEquals(idempotencyKey("up1", SID), idempotencyKey("up1", SID));
});

const charge = { customerId: "cus_1", paymentMethodId: "pm_1", currency: "usd", frontSessionId: SID };

Deno.test("buildUp1PaymentIntentParams - US$100 en centavos, off_session, confirm, metadata", () => {
  const p = new URLSearchParams(toFormBody(buildUp1PaymentIntentParams(charge)));
  assertEquals(p.get("amount"), "10000");
  assertEquals(p.get("currency"), "usd");
  assertEquals(p.get("customer"), "cus_1");
  assertEquals(p.get("payment_method"), "pm_1");
  assertEquals(p.get("off_session"), "true");
  assertEquals(p.get("confirm"), "true");
  assertEquals(p.get("metadata[product]"), "piscinas");
  assertEquals(p.get("metadata[step]"), "up1");
  assertEquals(p.get("metadata[front_session_id]"), SID);
});

Deno.test("buildUp2SubscriptionParams - mensual US$1,000, error_if_incomplete, con product o con price", () => {
  const a = new URLSearchParams(toFormBody(buildUp2SubscriptionParams(charge, { productId: "prod_1" })));
  assertEquals(a.get("items[0][price_data][unit_amount]"), "100000");
  assertEquals(a.get("items[0][price_data][recurring][interval]"), "month");
  assertEquals(a.get("items[0][price_data][product]"), "prod_1");
  assertEquals(a.get("items[0][price_data][currency]"), "usd");
  assertEquals(a.get("default_payment_method"), "pm_1");
  assertEquals(a.get("customer"), "cus_1");
  assertEquals(a.get("off_session"), "true");
  assertEquals(a.get("payment_behavior"), "error_if_incomplete");
  assertEquals(a.get("metadata[step]"), "up2");
  assertEquals(a.get("metadata[front_session_id]"), SID);
  const b = new URLSearchParams(toFormBody(buildUp2SubscriptionParams(charge, { priceId: "price_9" })));
  assertEquals(b.get("items[0][price]"), "price_9");
  assertFalse(b.has("items[0][price_data][unit_amount]"));
});

Deno.test("hasExistingUpsell - detecta cobros previos de ESTA compra y oferta, no de otras", () => {
  const md = (step: string, sid = SID) => ({ product: "piscinas", step, front_session_id: sid });
  assert(hasExistingUpsell("up1", SID, [{ status: "succeeded", metadata: md("up1") }]));
  assert(hasExistingUpsell("up1", SID, [{ status: "processing", metadata: md("up1") }]));
  assertFalse(hasExistingUpsell("up1", SID, [{ status: "requires_payment_method", metadata: md("up1") }]));
  assertFalse(hasExistingUpsell("up1", SID, [{ status: "succeeded", metadata: md("up1", "cs_test_OTRA") }]));
  assertFalse(hasExistingUpsell("up1", SID, [{ status: "succeeded", metadata: md("up2") }]));
  assertFalse(hasExistingUpsell("up1", SID, [{ status: "succeeded", metadata: { product: "toefl", step: "up1", front_session_id: SID } }]));
  assertFalse(hasExistingUpsell("up1", SID, []));
  assert(hasExistingUpsell("up2", SID, [{ status: "active", metadata: md("up2") }]));
  assert(hasExistingUpsell("up2", SID, [{ status: "past_due", metadata: md("up2") }]));
  assertFalse(hasExistingUpsell("up2", SID, [{ status: "canceled", metadata: md("up2") }]));
  assertFalse(hasExistingUpsell("up2", SID, [{ status: "incomplete_expired", metadata: md("up2") }]));
});

Deno.test("respuestas - succeeded / requires_action / failed sin filtrar detalles", () => {
  assertEquals(outcomeFromObject("up1", { status: "succeeded" }), { status: "succeeded" });
  assertEquals(outcomeFromObject("up1", { status: "requires_action" }), { status: "requires_action", fallback: "link" });
  assertEquals(outcomeFromObject("up1", { status: "requires_payment_method" }).status, "failed");
  assertEquals(outcomeFromObject("up2", { status: "active" }), { status: "succeeded" });
  assertEquals(outcomeFromObject("up2", { status: "incomplete" }).status, "failed");
  assertEquals(outcomeFromStripeError({ code: "authentication_required" }), { status: "requires_action", fallback: "link" });
  assertEquals(outcomeFromStripeError({ code: "card_declined", decline_code: "authentication_required" }).status, "requires_action");
  assertEquals(outcomeFromStripeError({ code: "subscription_payment_intent_requires_action" }).status, "requires_action");
  assertEquals(outcomeFromStripeError({ code: "card_declined", decline_code: "insufficient_funds", payment_intent: { status: "requires_payment_method" } }).status, "failed");
  const f = outcomeFromStripeError({ code: "card_declined", decline_code: "stolen_card" });
  assertEquals(f.status, "failed");
  assertFalse(JSON.stringify(f).includes("stolen"));
  assertEquals(outcomeFromStripeError(undefined).status, "failed");
});

// ─── webhook: eventos de upsell ─────────────────────────────────────────────

Deno.test("describeUpsellEvent - payment_intent.succeeded / customer.subscription.created / invoice.paid de un upsell", () => {
  const md = { product: "piscinas", step: "up1", front_session_id: SID };
  const pi = describeUpsellEvent({ type: "payment_intent.succeeded", data: { object: { id: "pi_1", customer: "cus_1", amount: 10000, amount_received: 10000, currency: "usd", livemode: false, metadata: md } } });
  assertEquals(pi, { event: "payment_intent.succeeded", step: "up1", front_session_id: SID, object_id: "pi_1", customer: "cus_1", amount: 10000, currency: "usd", livemode: false });
  const sub = describeUpsellEvent({ type: "customer.subscription.created", data: { object: { id: "sub_1", customer: "cus_1", currency: "usd", livemode: true, metadata: { ...md, step: "up2" } } } });
  assertEquals(sub?.step, "up2");
  assertEquals(sub?.amount, null);
  for (const invoiceObj of [
    { parent: { subscription_details: { metadata: { ...md, step: "up2" } } } },
    { subscription_details: { metadata: { ...md, step: "up2" } } },
    { lines: { data: [{ metadata: { ...md, step: "up2" } }] } },
  ]) {
    const inv = describeUpsellEvent({ type: "invoice.paid", data: { object: { id: "in_1", customer: "cus_1", amount_paid: 100000, currency: "usd", ...invoiceObj } } });
    assertEquals(inv?.step, "up2");
    assertEquals(inv?.amount, 100000);
  }
});

Deno.test("describeUpsellEvent - ignora el kit, otros productos y otros eventos; no filtra datos sensibles", () => {
  const obj = (metadata: Record<string, string>) => ({ id: "pi_1", metadata, receipt_email: "a@b.com", payment_method: "pm_1" });
  assertEquals(describeUpsellEvent({ type: "payment_intent.succeeded", data: { object: obj({ product: "piscinas", step: "kit" }) } }), null);
  assertEquals(describeUpsellEvent({ type: "payment_intent.succeeded", data: { object: obj({ product: "toefl", step: "up1" }) } }), null);
  assertEquals(describeUpsellEvent({ type: "payment_intent.succeeded", data: { object: obj({}) } }), null);
  assertEquals(describeUpsellEvent({ type: "checkout.session.completed", data: { object: obj({ product: "piscinas", step: "up1" }) } }), null);
  assertEquals(describeUpsellEvent({ type: "payment_intent.succeeded" }), null);
  const logged = JSON.stringify(describeUpsellEvent({ type: "payment_intent.succeeded", data: { object: obj({ product: "piscinas", step: "up1" }) } }));
  assertFalse(logged.includes("a@b.com"));
  assertFalse(logged.includes("pm_1"));
});

Deno.test("webhook - el checkout.session.completed de TOEFL/DELF/auxilios sigue resolviéndose igual", () => {
  assertEquals(resolveProductSlug({ client_reference_id: "toefl-b2_" + UUID }, envOf({})), "toefl-b2");
  assertEquals(resolveProductSlug({ client_reference_id: "auxilios" }, envOf({})), "auxilios");
  assertEquals(resolveProductSlug({}, envOf({})), "delf-a2");
});

Deno.test("buildKitSessionParams - con price_id usa el precio del producto creado en Stripe y sigue guardando la tarjeta", () => {
  const p = new URLSearchParams(toFormBody(buildKitSessionParams({ clientReferenceId: `piscinas_${UUID}`, priceId: "price_1Abc23DefGhi45" })));
  assertEquals(p.get("line_items[0][price]"), "price_1Abc23DefGhi45");
  assertEquals(p.get("line_items[0][quantity]"), "1");
  assertEquals(p.get("line_items[0][price_data][unit_amount]"), null);
  assertEquals(p.get("payment_intent_data[setup_future_usage]"), "off_session");
  assertEquals(p.get("customer_creation"), "always");
});

Deno.test("buildKitSessionParams - un price_id inválido se ignora y cae al precio en línea", () => {
  for (const bad of ["prod_123456789", "plink_123456789", "https://buy.stripe.com/x", "", null, undefined]) {
    const p = new URLSearchParams(toFormBody(buildKitSessionParams({ clientReferenceId: "piscinas", priceId: bad as string | null })));
    assertEquals(p.get("line_items[0][price]"), null);
    assertEquals(p.get("line_items[0][price_data][unit_amount]"), String(KIT_AMOUNT_CENTS));
  }
  assertEquals(isStripePriceId("price_1Abc23DefGhi45"), true);
  assertEquals(isStripePriceId("price_1"), false);
});

Deno.test("kitPriceEnvName - un secret por modo", () => {
  assertEquals(kitPriceEnvName(true), "PISCINAS_KIT_PRICE_ID");
  assertEquals(kitPriceEnvName(false), "PISCINAS_KIT_PRICE_ID_TEST");
});

// ─── upsell 1 con producto (factura) ────────────────────────────────────────

const CH = { customerId: "cus_123", paymentMethodId: "pm_123", currency: "usd", frontSessionId: "cs_live_a1" };

Deno.test("upsell 1 con factura - borrador con la tarjeta guardada, sin recoger otros pendientes y con metadata", () => {
  const p = new URLSearchParams(toFormBody(buildUp1InvoiceParams(CH)));
  assertEquals(p.get("customer"), "cus_123");
  assertEquals(p.get("collection_method"), "charge_automatically");
  assertEquals(p.get("auto_advance"), "false");
  assertEquals(p.get("default_payment_method"), "pm_123");
  assertEquals(p.get("pending_invoice_items_behavior"), "exclude");
  assertEquals(p.get("metadata[product]"), "piscinas");
  assertEquals(p.get("metadata[step]"), "up1");
  assertEquals(p.get("metadata[front_session_id]"), "cs_live_a1");
});

Deno.test("upsell 1 con factura - la línea usa el price del producto y se pega a esa factura", () => {
  const p = new URLSearchParams(toFormBody(buildUp1InvoiceItemParams(CH, "in_999", "price_1Abc23DefGhi45")));
  assertEquals(p.get("invoice"), "in_999");
  assertEquals(p.get("price"), "price_1Abc23DefGhi45");
  assertEquals(p.get("customer"), "cus_123");
});

Deno.test("upsell 1 con factura - se paga fuera de sesión con la misma tarjeta", () => {
  const p = new URLSearchParams(toFormBody(buildUp1InvoicePayParams(CH)));
  assertEquals(p.get("off_session"), "true");
  assertEquals(p.get("payment_method"), "pm_123");
});

Deno.test("upsell 1 con factura - claves de idempotencia distintas por paso y fijas por compra", () => {
  const keys = (["invoice", "item", "finalize", "pay"] as const).map((s) => invoiceStepKey(s, "cs_live_a1"));
  assertEquals(new Set(keys).size, 4);
  assertEquals(invoiceStepKey("pay", "cs_live_a1"), "piscinas-up1-inv-pay-cs_live_a1");
});

Deno.test("upsell 1 con factura - solo una factura pagada cuenta como ya cobrada", () => {
  const md = { product: "piscinas", step: "up1", front_session_id: "cs_live_a1" };
  assertEquals(hasExistingUpsell("up1", "cs_live_a1", [{ status: "paid", metadata: md }], "invoice"), true);
  assertEquals(hasExistingUpsell("up1", "cs_live_a1", [{ status: "void", metadata: md }], "invoice"), false);
  assertEquals(hasExistingUpsell("up1", "cs_live_a1", [{ status: "open", metadata: md }], "invoice"), false);
  assertEquals(hasExistingUpsell("up1", "cs_live_zz", [{ status: "paid", metadata: md }], "invoice"), false);
});

Deno.test("upsell 1 con factura - resultado y nombres de secret", () => {
  assertEquals(outcomeFromInvoice({ status: "paid" }), { status: "succeeded" });
  assertEquals(outcomeFromInvoice({ status: "open" }).status, "failed");
  assertEquals(outcomeFromInvoice(null).status, "failed");
  assertEquals(up1PriceEnvName(true), "PISCINAS_UP1_PRICE_ID");
  assertEquals(up1PriceEnvName(false), "PISCINAS_UP1_PRICE_ID_TEST");
});
