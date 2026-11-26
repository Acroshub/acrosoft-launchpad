import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  parseWebsiteHvacLead, buildSubmissionData, buildWebsiteHvacPush, monthStartIso, parseWebsiteHvacRequest, WH_FIELD,
} from "./website-hvac.ts";

const ok = {
  name: "Carlos Ramírez", email: "Carlos@Ejemplo.com", whatsapp: "+1 (713) 555-0101", business: "Ramírez Heating & Air",
  language: "es", city: "Houston, TX", services: ["Reparación de A/C", "Instalación", "Mantenimiento"], star: "instalación",
  confirm_material: true, confirm_cost: true, confirm_call: true, confirm_marketing: true,
};

Deno.test("pedido válido: normaliza correo y toma el servicio destacado tal como lo escribió en la lista", () => {
  const r = parseWebsiteHvacRequest(ok);
  assert(r.ok);
  if (r.ok) {
    assertEquals(r.value.email, "carlos@ejemplo.com");
    assertEquals(r.value.star, "Instalación");
    assertEquals(r.value.language, "es");
  }
});

Deno.test("pedido: cada confirmación es obligatoria y tiene que ser true", () => {
  for (const k of ["confirm_material", "confirm_cost", "confirm_call", "confirm_marketing"]) {
    assertEquals(parseWebsiteHvacRequest({ ...ok, [k]: false }).ok, false);
    assertEquals(parseWebsiteHvacRequest({ ...ok, [k]: "true" }).ok, false);
    const { [k]: _omit, ...rest } = ok as Record<string, unknown>;
    assertEquals(parseWebsiteHvacRequest(rest).ok, false);
  }
});

Deno.test("pedido: servicios (1 a 6, sin repetidos); el destacado es opcional", () => {
  assertEquals(parseWebsiteHvacRequest({ ...ok, services: [] }).ok, false);
  assertEquals(parseWebsiteHvacRequest({ ...ok, services: ["a", "b", "c", "d", "e", "f", "g"], star: "a" }).ok, false);
  // El servicio destacado es lo ÚNICO opcional: sin él (o con uno que no está en la lista) el pedido es válido y queda vacío.
  const sinDestacado = parseWebsiteHvacRequest({ ...ok, star: "" });
  assert(sinDestacado.ok);
  if (sinDestacado.ok) assertEquals(sinDestacado.value.star, "");
  const sinCampo = parseWebsiteHvacRequest({ ...ok, star: undefined });
  assert(sinCampo.ok);
  const otro = parseWebsiteHvacRequest({ ...ok, star: "Otro" });
  assert(otro.ok);
  if (otro.ok) assertEquals(otro.value.star, "");
  const dup = parseWebsiteHvacRequest({ ...ok, services: ["Instalación", "instalación", " "], star: "Instalación" });
  assert(dup.ok);
  if (dup.ok) assertEquals(dup.value.services, ["Instalación"]);
});

Deno.test("pedido: datos de contacto inválidos y HTML se limpia", () => {
  assertEquals(parseWebsiteHvacRequest({ ...ok, email: "no-es-correo" }).ok, false);
  assertEquals(parseWebsiteHvacRequest({ ...ok, whatsapp: "abc" }).ok, false);
  assertEquals(parseWebsiteHvacRequest({ ...ok, language: "fr" }).ok, false);
  assertEquals(parseWebsiteHvacRequest(null).ok, false);
  const r = parseWebsiteHvacRequest({ ...ok, business: "<b>Frío</b> Total" });
  assert(r.ok);
  if (r.ok) assertEquals(r.value.business, "Frío Total");
});

Deno.test("datos guardados: llaves del formulario del CRM e idioma legible", () => {
  const r = parseWebsiteHvacRequest(ok);
  assert(r.ok);
  if (!r.ok) return;
  const d = buildSubmissionData(r.value);
  assertEquals(d[WH_FIELD.language], "Español");
  assertEquals(d[WH_FIELD.services], "Reparación de A/C, Instalación, Mantenimiento");
  assertEquals(d[WH_FIELD.star], "Instalación");
  assertEquals(buildSubmissionData({ ...r.value, star: "" })[WH_FIELD.star], "No indicó");
  assertEquals(d[WH_FIELD.marketing], "Sí");
});

Deno.test("mes en hora de Nueva York: invierno (UTC-5) y verano (UTC-4)", () => {
  assertEquals(monthStartIso(Date.UTC(2026, 10, 19, 12)), "2026-11-01T04:00:00.000Z"); // 1 nov 2026: aún EDT (el cambio es el 1 nov a las 2 AM) → 00:00 EDT = 04:00Z
  assertEquals(monthStartIso(Date.UTC(2026, 11, 15, 12)), "2026-12-01T05:00:00.000Z"); // diciembre: EST
  assertEquals(monthStartIso(Date.UTC(2026, 6, 4, 12)), "2026-07-01T04:00:00.000Z"); // julio: EDT
  // 1 dic 2026 a las 02:00Z todavía es 30 nov en Nueva York → sigue siendo el mes de noviembre
  assertEquals(monthStartIso(Date.UTC(2026, 11, 1, 2)), "2026-11-01T04:00:00.000Z");
});

Deno.test("aviso push: sin conteo de cupos", () => {
  const r = parseWebsiteHvacRequest(ok);
  assert(r.ok);
  if (!r.ok) return;
  assertEquals(buildWebsiteHvacPush(r.value).body, "Carlos Ramírez · Ramírez Heating & Air\nHouston, TX");
  assert(!buildWebsiteHvacPush(r.value).body.includes("cupos"));
});

Deno.test("paso 1 (lead): solo pide contacto y negocio", () => {
  const r = parseWebsiteHvacLead({ name: "Carlos Ramírez", email: "C@x.com", whatsapp: "7135550101", business: "Frío Total" });
  assert(r.ok);
  if (r.ok) assertEquals(r.value.email, "c@x.com");
  assertEquals(parseWebsiteHvacLead({ name: "Carlos Ramírez", email: "c@x.com", whatsapp: "7135550101" }).ok, false);
  assertEquals(parseWebsiteHvacLead({ name: "Ca", email: "c@x.com", whatsapp: "7135550101", business: "x" }).ok, false);
});
