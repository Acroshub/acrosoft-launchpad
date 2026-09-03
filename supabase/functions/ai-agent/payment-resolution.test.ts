import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  parseAndStripPayment,
  resolveVariant,
  resolvePlan,
  computeExpectedPriceAndCurrency,
  type VariantRow,
  type PlanRow,
} from "./payment-resolution.ts";

// ─── parseAndStripPayment ───────────────────────────────────────────────────

Deno.test("parseAndStripPayment - marcador completo, orden estándar", () => {
  const text = "¡Gracias! Confirmado 🎉 [PAYMENT_DETECTED|product_id:abc-123|variant_id:none|amount:25.00|method_type:transfer|plan_id:plan-1]";
  const { text: stripped, payment } = parseAndStripPayment(text);
  assertEquals(stripped, "¡Gracias! Confirmado 🎉");
  assertEquals(payment, {
    product_id: "abc-123",
    variant_id: null,
    plan_id: "plan-1",
    amount: 25,
    method_type: "transfer",
  });
});

Deno.test("parseAndStripPayment - formato viejo sin plan_id (compat hacia atrás)", () => {
  const text = "[PAYMENT_DETECTED|product_id:abc-123|variant_id:none|amount:25.00|method_type:transfer]";
  const { payment } = parseAndStripPayment(text);
  assert(payment !== null);
  assertEquals(payment!.plan_id, null);
  assertEquals(payment!.amount, 25);
});

Deno.test("parseAndStripPayment - campos en orden distinto al esperado", () => {
  const text = "[PAYMENT_DETECTED|amount:30|method_type:qr|product_id:xyz|plan_id:p9|variant_id:none]";
  const { payment } = parseAndStripPayment(text);
  assertEquals(payment, {
    product_id: "xyz",
    variant_id: null,
    plan_id: "p9",
    amount: 30,
    method_type: "qr",
  });
});

Deno.test("parseAndStripPayment - campo extra desconocido no rompe el parseo", () => {
  const text = "[PAYMENT_DETECTED|product_id:xyz|variant_id:none|amount:10|method_type:cash|note:algo raro]";
  const { payment } = parseAndStripPayment(text);
  assert(payment !== null);
  assertEquals(payment!.amount, 10);
});

Deno.test("parseAndStripPayment - none en mayúsculas/mixed case", () => {
  const text = "[PAYMENT_DETECTED|product_id:xyz|variant_id:NONE|amount:10|method_type:cash|plan_id:None]";
  const { payment } = parseAndStripPayment(text);
  assertEquals(payment!.variant_id, null);
  assertEquals(payment!.plan_id, null);
});

Deno.test("parseAndStripPayment - sin marcador devuelve payment null y texto intacto", () => {
  const text = "Gracias por tu mensaje, en breve te contactamos.";
  const { text: stripped, payment } = parseAndStripPayment(text);
  assertEquals(stripped, text);
  assertEquals(payment, null);
});

Deno.test("parseAndStripPayment - monto no numérico produce NaN (el caller debe filtrarlo)", () => {
  const text = "[PAYMENT_DETECTED|product_id:xyz|variant_id:none|amount:no-es-un-numero|method_type:cash]";
  const { payment } = parseAndStripPayment(text);
  assert(payment !== null);
  assert(Number.isNaN(payment!.amount));
});

Deno.test("parseAndStripPayment - falta product_id → payment null", () => {
  const text = "[PAYMENT_DETECTED|variant_id:none|amount:10|method_type:cash]";
  const { payment } = parseAndStripPayment(text);
  assertEquals(payment, null);
});

// ─── resolveVariant ──────────────────────────────────────────────────────────

const variants: VariantRow[] = [
  { id: "v1", name: "Rojo", price_override: 50, discount_pct: null, stock: 3 },
  { id: "v2", name: "Azul", price_override: null, discount_pct: 20, stock: 0 },
];

Deno.test("resolveVariant - una sola variante se auto-selecciona si Claude no indicó ninguna", () => {
  const r = resolveVariant([variants[0]], null, 100, 0);
  assertEquals(r.variantId, "v1");
  assertEquals(r.variantPrice, 50);
  assertEquals(r.invalidRequestedId, false);
});

Deno.test("resolveVariant - varias variantes sin indicación → no autoselecciona ninguna", () => {
  const r = resolveVariant(variants, null, 100, 0);
  assertEquals(r.variantId, null);
  assertEquals(r.invalidRequestedId, false);
});

Deno.test("resolveVariant - variant_id pedido existe: usa price_override si está seteado", () => {
  const r = resolveVariant(variants, "v1", 100, 10);
  assertEquals(r.variantId, "v1");
  assertEquals(r.variantPrice, 50); // price_override gana sobre el precio base
  assertEquals(r.variantName, " (Rojo)");
  assertEquals(r.variantStock, 3);
});

Deno.test("resolveVariant - sin price_override, hereda precio base y descuento del producto", () => {
  const r = resolveVariant(variants, "v2", 100, 20);
  // v2 no tiene price_override → usa baseProductPrice=100; su discount_pct propio es 20
  assertEquals(r.variantPrice, 80);
  assertEquals(r.variantStock, 0);
});

Deno.test("resolveVariant - variant_id que NO existe en la lista → invalidRequestedId true, sin fallback silencioso", () => {
  const r = resolveVariant(variants, "plan-1-confundido-con-variante", 100, 0);
  assertEquals(r.variantId, null);
  assertEquals(r.variantPrice, null);
  assertEquals(r.invalidRequestedId, true);
});

Deno.test("resolveVariant - lista vacía y sin variant_id pedido → sin variante, sin marcar inválido", () => {
  const r = resolveVariant([], null, 100, 0);
  assertEquals(r.variantId, null);
  assertEquals(r.invalidRequestedId, false);
});

// ─── resolvePlan ─────────────────────────────────────────────────────────────

const plans: PlanRow[] = [
  { id: "p1", price: 30, currency: "BOB", discount_pct: null },
  { id: "p2", price: 15, currency: "PEN", discount_pct: 0 },
];

Deno.test("resolvePlan - un solo plan se auto-selecciona", () => {
  const r = resolvePlan([plans[0]], null, 30);
  assertEquals(r.planId, "p1");
  assertEquals(r.planPrice, 30);
  assertEquals(r.planCurrency, "BOB");
  assertEquals(r.ambiguous, false);
});

Deno.test("resolvePlan - plan_id pedido explícito gana aunque el monto no coincida exacto", () => {
  const r = resolvePlan(plans, "p2", 14.5);
  assertEquals(r.planId, "p2");
  assertEquals(r.planCurrency, "PEN");
});

Deno.test("resolvePlan - varios planes, sin plan_id, monto coincide con uno solo (±10%) → lo resuelve", () => {
  const r = resolvePlan(plans, null, 29.5); // 29.5 está a ~1.7% de 30 (p1), lejos de 15 (p2)
  assertEquals(r.planId, "p1");
  assertEquals(r.ambiguous, false);
});

Deno.test("resolvePlan - varios planes, sin plan_id, monto no coincide con ninguno → ambiguo, NO auto-confirma nada", () => {
  const r = resolvePlan(plans, null, 999);
  assertEquals(r.planId, null);
  assertEquals(r.planPrice, null);
  assertEquals(r.ambiguous, true);
});

Deno.test("resolvePlan - varios planes con precios muy cercanos, el monto podría matchear a más de uno → ambiguo", () => {
  const closePlans: PlanRow[] = [
    { id: "a", price: 20, currency: "USD", discount_pct: null },
    { id: "b", price: 21, currency: "USD", discount_pct: null },
  ];
  const r = resolvePlan(closePlans, null, 20.5); // dentro del 10% de AMBOS
  assertEquals(r.ambiguous, true);
  assertEquals(r.planId, null);
});

Deno.test("resolvePlan - plan_id pedido que NO existe (ej. Claude mandó un id inventado o de otro producto)", () => {
  const r = resolvePlan(plans, "plan-inexistente", 30);
  assertEquals(r.planId, null);
  assertEquals(r.invalidRequestedId, true);
  assertEquals(r.ambiguous, false); // esto no es "ambiguo", es un id inválido — distinción importante para el mensaje de log
});

Deno.test("resolvePlan - producto sin planes en absoluto → no ambiguo, no inválido, simplemente vacío", () => {
  const r = resolvePlan([], null, 30);
  assertEquals(r.planId, null);
  assertEquals(r.ambiguous, false);
  assertEquals(r.invalidRequestedId, false);
});

Deno.test("resolvePlan - descuento del plan se aplica antes de comparar contra el monto", () => {
  const discounted: PlanRow[] = [{ id: "d1", price: 100, currency: "USD", discount_pct: 50 }];
  const r = resolvePlan(discounted, null, 50); // el cliente pagó 50, que es el precio CON 50% off
  assertEquals(r.planId, "d1");
  assertEquals(r.planPrice, 50);
});

// ─── computeExpectedPriceAndCurrency ────────────────────────────────────────

Deno.test("computeExpectedPriceAndCurrency - variante gana sobre plan y sobre base", () => {
  const r = computeExpectedPriceAndCurrency({
    variantPrice: 40, planPrice: 999, planCurrency: "EUR",
    baseProductPrice: 5, baseProductDiscountPct: 0, baseProductCurrency: "USD",
  });
  assertEquals(r.expectedPrice, 40);
  // La variante no tiene moneda propia → usa la del producto base, NUNCA la del plan
  assertEquals(r.saleCurrency, "USD");
});

Deno.test("computeExpectedPriceAndCurrency - plan gana sobre precio base cuando no hay variante", () => {
  const r = computeExpectedPriceAndCurrency({
    variantPrice: null, planPrice: 30, planCurrency: "BOB",
    baseProductPrice: 0, baseProductDiscountPct: 0, baseProductCurrency: "USD",
  });
  assertEquals(r.expectedPrice, 30);
  assertEquals(r.saleCurrency, "BOB"); // el bug original: esto se guardaba en USD
});

Deno.test("computeExpectedPriceAndCurrency - sin variante ni plan, usa precio base con descuento aplicado", () => {
  const r = computeExpectedPriceAndCurrency({
    variantPrice: null, planPrice: null, planCurrency: null,
    baseProductPrice: 100, baseProductDiscountPct: 25, baseProductCurrency: "PEN",
  });
  assertEquals(r.expectedPrice, 75);
  assertEquals(r.saleCurrency, "PEN");
});

Deno.test("computeExpectedPriceAndCurrency - sin nada configurado, moneda cae a USD como último recurso", () => {
  const r = computeExpectedPriceAndCurrency({
    variantPrice: null, planPrice: null, planCurrency: null,
    baseProductPrice: 0, baseProductDiscountPct: 0, baseProductCurrency: null,
  });
  assertEquals(r.expectedPrice, 0);
  assertEquals(r.saleCurrency, "USD");
});
