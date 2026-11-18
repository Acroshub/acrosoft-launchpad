import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildBookingPushPayload, notifyAdminOfBooking, type BookingPushPayload } from "./booking-push.ts";

const ADMIN = "ba68bd45-22b7-41de-87eb-e3562d7e4b03";
const OTRO = "11111111-2222-3333-4444-555555555555";
// 12:00 en La Paz (UTC-4) = 16:00 UTC
const MS = Date.UTC(2026, 10, 23, 16, 0);
const base = { source: "consultoria-mkt-tree", name: "Carlos Ramírez", business: "Ramírez Tree Service", scheduledMs: MS, tz: "America/La_Paz" };

Deno.test("payload de la consultoría: título, quién (con su negocio), cuándo en la hora del calendario y abre el CRM", () => {
  const p = buildBookingPushPayload(base);
  assertEquals(p.title, "📅 Nueva cita · Consultoría gratis");
  assertStringIncludes(p.body, "Carlos Ramírez · Ramírez Tree Service");
  assertStringIncludes(p.body, "23 de noviembre");
  assertStringIncludes(p.body, "12:00 PM"); // hora de La Paz, no la del visitante
  assertEquals(p.url, "/crm");
});

Deno.test("payload: la llamada del kit (sin source), sin negocio y sin nombre", () => {
  assertEquals(buildBookingPushPayload({ ...base, source: "" }).title, "📅 Nueva cita · Llamada del kit");
  assertEquals(buildBookingPushPayload({ ...base, source: "otra-pagina" }).title, "📅 Nueva cita · otra-pagina");
  assertEquals(buildBookingPushPayload({ ...base, business: "" }).body.split("\n")[0], "Carlos Ramírez");
  assertEquals(buildBookingPushPayload({ ...base, name: "  ", business: "" }).body.split("\n")[0], "Alguien");
});

function fakes(adminId: string | null, send?: (id: string, p: BookingPushPayload) => Promise<unknown>) {
  const calls: { id: string; p: BookingPushPayload }[] = [];
  return {
    calls,
    deps: {
      getAdminId: () => Promise.resolve(adminId),
      send: (id: string, p: BookingPushPayload) => { calls.push({ id, p }); return send ? send(id, p) : Promise.resolve({ recipients: 1 }); },
    },
  };
}

Deno.test("calendario del admin: manda el push al admin", async () => {
  const f = fakes(ADMIN);
  assertEquals(await notifyAdminOfBooking(f.deps, { ...base, calendarOwnerId: ADMIN }), "sent");
  assertEquals(f.calls.length, 1);
  assertEquals(f.calls[0].id, ADMIN);
  assertEquals(f.calls[0].p.title, "📅 Nueva cita · Consultoría gratis");
});

Deno.test("calendario de OTRO cliente: no avisa al admin (no recibe datos de clientes ajenos)", async () => {
  const f = fakes(ADMIN);
  assertEquals(await notifyAdminOfBooking(f.deps, { ...base, calendarOwnerId: OTRO }), "skipped");
  assertEquals(f.calls.length, 0);
});

Deno.test("sin admin configurado: no hace nada ni falla", async () => {
  const f = fakes(null);
  assertEquals(await notifyAdminOfBooking(f.deps, { ...base, calendarOwnerId: ADMIN }), "skipped");
  assertEquals(f.calls.length, 0);
});

Deno.test("si el envío o la consulta del admin fallan, devuelve «error» y NO lanza (la reserva sigue valiendo)", async () => {
  const boom = fakes(ADMIN, () => Promise.reject(new Error("push service caído")));
  assertEquals(await notifyAdminOfBooking(boom.deps, { ...base, calendarOwnerId: ADMIN }), "error");
  const sinRpc = { getAdminId: () => Promise.reject(new Error("rpc")), send: () => Promise.resolve() };
  assertEquals(await notifyAdminOfBooking(sinRpc, { ...base, calendarOwnerId: ADMIN }), "error");
});

Deno.test("si el envío se cuelga, deja de esperar al límite y no deja temporizadores abiertos", async () => {
  const colgado = fakes(ADMIN, () => new Promise(() => {})); // nunca responde
  const t0 = Date.now();
  assertEquals(await notifyAdminOfBooking(colgado.deps, { ...base, calendarOwnerId: ADMIN }, 50), "timeout");
  assertEquals(Date.now() - t0 < 1000, true);
});
