import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  parseWebsiteTreeLead, buildSubmissionData, buildWebsiteTreePush, monthStartIso, parseWebsiteTreeRequest, slotsLeft, WT_FIELD,
} from "./website-tree.ts";

const ok = {
  name: "Carlos Ramírez", email: "Carlos@Ejemplo.com", whatsapp: "+1 (713) 555-0101", business: "Ramírez Tree Service",
  language: "es", city: "Houston, TX", services: ["Poda de árboles", "Remoción de tocones", "Limpieza de terrenos"], star: "remoción de tocones",
  confirm_material: true, confirm_cost: true, confirm_call: true, confirm_marketing: true,
};

Deno.test("pedido válido: normaliza correo y toma el servicio destacado tal como lo escribió en la lista", () => {
  const r = parseWebsiteTreeRequest(ok);
  assert(r.ok);
  if (r.ok) {
    assertEquals(r.value.email, "carlos@ejemplo.com");
    assertEquals(r.value.star, "Remoción de tocones");
    assertEquals(r.value.language, "es");
  }
});

Deno.test("pedido: cada confirmación es obligatoria y tiene que ser true", () => {
  for (const k of ["confirm_material", "confirm_cost", "confirm_call", "confirm_marketing"]) {
    assertEquals(parseWebsiteTreeRequest({ ...ok, [k]: false }).ok, false);
    assertEquals(parseWebsiteTreeRequest({ ...ok, [k]: "true" }).ok, false);
    const { [k]: _omit, ...rest } = ok as Record<string, unknown>;
    assertEquals(parseWebsiteTreeRequest(rest).ok, false);
  }
});

Deno.test("pedido: servicios (1 a 6, sin repetidos); el destacado es opcional", () => {
  assertEquals(parseWebsiteTreeRequest({ ...ok, services: [] }).ok, false);
  assertEquals(parseWebsiteTreeRequest({ ...ok, services: ["a", "b", "c", "d", "e", "f", "g"], star: "a" }).ok, false);
  // El servicio destacado es lo ÚNICO opcional: sin él (o con uno que no está en la lista) el pedido es válido y queda vacío.
  const sinDestacado = parseWebsiteTreeRequest({ ...ok, star: "" });
  assert(sinDestacado.ok);
  if (sinDestacado.ok) assertEquals(sinDestacado.value.star, "");
  const sinCampo = parseWebsiteTreeRequest({ ...ok, star: undefined });
  assert(sinCampo.ok);
  const otro = parseWebsiteTreeRequest({ ...ok, star: "Otro" });
  assert(otro.ok);
  if (otro.ok) assertEquals(otro.value.star, "");
  const dup = parseWebsiteTreeRequest({ ...ok, services: ["Remoción de tocones", "remoción de tocones", " "], star: "Remoción de tocones" });
  assert(dup.ok);
  if (dup.ok) assertEquals(dup.value.services, ["Remoción de tocones"]);
});

Deno.test("pedido: datos de contacto inválidos y HTML se limpia", () => {
  assertEquals(parseWebsiteTreeRequest({ ...ok, email: "no-es-correo" }).ok, false);
  assertEquals(parseWebsiteTreeRequest({ ...ok, whatsapp: "abc" }).ok, false);
  assertEquals(parseWebsiteTreeRequest({ ...ok, language: "fr" }).ok, false);
  assertEquals(parseWebsiteTreeRequest(null).ok, false);
  const r = parseWebsiteTreeRequest({ ...ok, business: "<b>Frío</b> Total" });
  assert(r.ok);
  if (r.ok) assertEquals(r.value.business, "Frío Total");
});

Deno.test("datos guardados: llaves del formulario del CRM e idioma legible", () => {
  const r = parseWebsiteTreeRequest(ok);
  assert(r.ok);
  if (!r.ok) return;
  const d = buildSubmissionData(r.value);
  assertEquals(d[WT_FIELD.language], "Español");
  assertEquals(d[WT_FIELD.services], "Poda de árboles, Remoción de tocones, Limpieza de terrenos");
  assertEquals(d[WT_FIELD.star], "Remoción de tocones");
  assertEquals(buildSubmissionData({ ...r.value, star: "" })[WT_FIELD.star], "No indicó");
  assertEquals(d[WT_FIELD.marketing], "Sí");
});

Deno.test("mes en hora de Nueva York: invierno (UTC-5) y verano (UTC-4)", () => {
  assertEquals(monthStartIso(Date.UTC(2026, 10, 19, 12)), "2026-11-01T04:00:00.000Z"); // 1 nov 2026: aún EDT (el cambio es el 1 nov a las 2 AM) → 00:00 EDT = 04:00Z
  assertEquals(monthStartIso(Date.UTC(2026, 11, 15, 12)), "2026-12-01T05:00:00.000Z"); // diciembre: EST
  assertEquals(monthStartIso(Date.UTC(2026, 6, 4, 12)), "2026-07-01T04:00:00.000Z"); // julio: EDT
  // 1 dic 2026 a las 02:00Z todavía es 30 nov en Nueva York → sigue siendo el mes de noviembre
  assertEquals(monthStartIso(Date.UTC(2026, 11, 1, 2)), "2026-11-01T04:00:00.000Z");
});

Deno.test("cupos y aviso push", () => {
  assertEquals(slotsLeft(0), 10);
  assertEquals(slotsLeft(7), 3);
  assertEquals(slotsLeft(12), 0);
  const r = parseWebsiteTreeRequest(ok);
  assert(r.ok);
  if (!r.ok) return;
  assertEquals(buildWebsiteTreePush(r.value, 3).body, "Carlos Ramírez · Ramírez Tree Service\nHouston, TX · quedan 3 cupos este mes");
  assert(buildWebsiteTreePush(r.value, 0).body.includes("agotados"));
});

Deno.test("paso 1 (lead): solo pide contacto y negocio", () => {
  const r = parseWebsiteTreeLead({ name: "Carlos Ramírez", email: "C@x.com", whatsapp: "7135550101", business: "Frío Total" });
  assert(r.ok);
  if (r.ok) assertEquals(r.value.email, "c@x.com");
  assertEquals(parseWebsiteTreeLead({ name: "Carlos Ramírez", email: "c@x.com", whatsapp: "7135550101" }).ok, false);
  assertEquals(parseWebsiteTreeLead({ name: "Ca", email: "c@x.com", whatsapp: "7135550101", business: "x" }).ok, false);
});
