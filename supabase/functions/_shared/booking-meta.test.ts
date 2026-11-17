import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { applyBookingPlaceholders, buildBookingVars, formatWhen, parseBookingMeta, validTimeZone } from "./booking-meta.ts";

Deno.test("parseBookingMeta: sanea origen, zona y respuestas", () => {
  const m = parseBookingMeta({
    source: "Consultoria-MKT-Tree", visitor_tz: "America/New_York",
    answers: [{ label: "<b>¿Puedes invertir?</b>", value: "Sí" }, { label: "", value: "Sí" }, { label: "x", value: "" }],
  });
  assertEquals(m.source, "consultoria-mkt-tree");
  assertEquals(m.visitorTz, "America/New_York");
  assertEquals(m.answers, [{ label: "¿Puedes invertir?", value: "Sí" }]);
});

Deno.test("parseBookingMeta: valores raros se descartan", () => {
  assertEquals(parseBookingMeta(undefined), { source: "", visitorTz: "", answers: [] });
  assertEquals(parseBookingMeta([1, 2]), { source: "", visitorTz: "", answers: [] });
  assertEquals(parseBookingMeta({ source: "a b; drop", visitor_tz: "Nope/Zone", answers: "x" }), { source: "", visitorTz: "", answers: [] });
  assertEquals(validTimeZone("x".repeat(100)), "");
});

Deno.test("formatWhen: dice la hora en la zona del visitante, con su sigla", () => {
  const ms = Date.UTC(2026, 10, 18, 15, 0); // 15:00 UTC
  assertStringIncludes(formatWhen(ms, "America/New_York"), "10:00 AM");
  assertStringIncludes(formatWhen(ms, "America/New_York"), "18 de noviembre");
  assertStringIncludes(formatWhen(ms, "America/Los_Angeles"), "7:00 AM");
});

Deno.test("applyBookingPlaceholders: rellena y quita las líneas con valores vacíos", () => {
  const vars = buildBookingVars({ business: "Ramírez Tree", scheduledMs: Date.UTC(2026, 10, 18, 15, 0), visitorTz: "America/New_York", answers: [{ label: "Presupuesto", value: "Sí" }] });
  const tpl = "Nueva reunión\nNegocio: {{booking.business}}\nHora del cliente: {{booking.when}}\n\n{{booking.answers}}";
  const out = applyBookingPlaceholders(tpl, vars);
  assertStringIncludes(out, "Negocio: Ramírez Tree");
  assertStringIncludes(out, "Hora del cliente: miércoles, 18 de noviembre a las 10:00 AM");
  assertStringIncludes(out, "Confirmaciones:\n• Presupuesto → Sí");

  const empty = buildBookingVars({ business: "", scheduledMs: Date.UTC(2026, 10, 18, 15, 0), visitorTz: "America/La_Paz", answers: [] });
  assertEquals(applyBookingPlaceholders(tpl, empty).includes("Negocio"), false);
  assertEquals(applyBookingPlaceholders(tpl, empty).includes("Confirmaciones"), false);
  assertEquals(applyBookingPlaceholders("Hola sin marcadores", empty), "Hola sin marcadores");
  // un `$&` en el valor no se interpreta como patrón de reemplazo
  assertEquals(applyBookingPlaceholders("N: {{booking.business}}", { business: "A$&B", when: "x", answers: "" }), "N: A$&B");
});
