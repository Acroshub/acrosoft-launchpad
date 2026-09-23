import { assert, assertEquals, assertFalse } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createHash } from "node:crypto";
import { buildUserData, sendMetaPurchaseEvent } from "./meta-capi.ts";

// Implementación independiente del hash (node:crypto) para no probar SHA-256 con SHA-256 propio.
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

// ─── buildUserData ──────────────────────────────────────────────────────────

Deno.test("buildUserData - solo email: igual que siempre ({ em: [hash] })", async () => {
  assertEquals(await buildUserData("Test@Example.com "), { em: [sha("test@example.com")] });
  assertEquals(await buildUserData("a@b.com", {}), { em: [sha("a@b.com")] });
  assertEquals(await buildUserData("a@b.com", { name: "  ", phone: "", country: null, clientIp: null }), { em: [sha("a@b.com")] });
});

Deno.test("buildUserData - nombre: primero y último, minúsculas, sin puntuación", async () => {
  const u = await buildUserData("a@b.com", { name: "María José de la Cruz" });
  assertEquals(u.fn, [sha("maría")]);
  assertEquals(u.ln, [sha("cruz")]);
  assertEquals((await buildUserData("a@b.com", { name: "Daniel" })).ln, undefined);
  assertEquals((await buildUserData("a@b.com", { name: "O'Brien-Smith Jr." })).fn, [sha("obriensmith")]);
});

Deno.test("buildUserData - teléfono: solo dígitos y con largo válido", async () => {
  assertEquals((await buildUserData("a@b.com", { phone: "+591 7123-4567" })).ph, [sha("59171234567")]);
  assertEquals((await buildUserData("a@b.com", { phone: "123" })).ph, undefined);
  assertEquals((await buildUserData("a@b.com", { phone: "1".repeat(16) })).ph, undefined);
});

Deno.test("buildUserData - país, código postal, ciudad y estado", async () => {
  const bo = await buildUserData("a@b.com", { country: "BO", zip: "1010 AB", city: "San José", state: "Cochabamba" });
  assertEquals(bo.country, [sha("bo")]);
  assertEquals(bo.zp, [sha("1010ab")]);
  assertEquals(bo.ct, [sha("sanjosé")]);
  assertEquals(bo.st, [sha("cochabamba")]);
  // En EE. UU. el ZIP se corta a 5 dígitos
  assertEquals((await buildUserData("a@b.com", { country: "US", zip: "12345-6789" })).zp, [sha("12345")]);
  // País que no es ISO de 2 letras: se omite
  assertEquals((await buildUserData("a@b.com", { country: "BOL" })).country, undefined);
});

Deno.test("buildUserData - IP, user agent, fbp y fbc viajan SIN hashear y solo si son válidos", async () => {
  const good = await buildUserData("a@b.com", {
    clientIp: "181.115.213.179", clientUserAgent: "Mozilla/5.0 (iPhone)", fbp: "fb.1.1700000000000.1234567890", fbc: "fb.1.1700000000000.IwAR0abc_-DEF",
  });
  assertEquals(good.client_ip_address, "181.115.213.179");
  assertEquals(good.client_user_agent, "Mozilla/5.0 (iPhone)");
  assertEquals(good.fbp, "fb.1.1700000000000.1234567890");
  assertEquals(good.fbc, "fb.1.1700000000000.IwAR0abc_-DEF");
  assertEquals((await buildUserData("a@b.com", { clientIp: "2800:cb0:1::1" })).client_ip_address, "2800:cb0:1::1");

  const bad = await buildUserData("a@b.com", { clientIp: "no-es-una-ip", clientUserAgent: "   ", fbp: "<script>", fbc: "fb.9.1.x" });
  assertEquals(Object.keys(bad), ["em"]);
});

Deno.test("buildUserData - nada del comprador aparece en claro", async () => {
  const u = await buildUserData("secreto@correo.com", { name: "Ana Torres", phone: "+573001112233", city: "Bogotá", zip: "110111", country: "CO", state: "DC" });
  const json = JSON.stringify(u).toLowerCase();
  for (const plain of ["secreto@correo.com", "ana", "torres", "573001112233", "bogotá", "110111"]) assertFalse(json.includes(plain), plain);
});

// ─── sendMetaPurchaseEvent (con fetch simulado) ─────────────────────────────

async function withFetchStub<T>(status: number, run: (calls: { url: string; body: any }[]) => Promise<T>): Promise<T> {
  const original = globalThis.fetch;
  const calls: { url: string; body: any }[] = [];
  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), body: JSON.parse(String(init?.body ?? "{}")) });
    return Promise.resolve(new Response(JSON.stringify({ events_received: 1 }), { status }));
  }) as typeof fetch;
  try {
    return await run(calls);
  } finally {
    globalThis.fetch = original;
  }
}

Deno.test("sendMetaPurchaseEvent - evento web completo con user_data del navegador y de Stripe", async () => {
  await withFetchStub(200, async (calls) => {
    const res = await sendMetaPurchaseEvent({
      email: "a@b.com", value: 17.91, currency: "USD", eventId: "cs_live_123", eventSourceUrl: "https://www.acrosoftlabs.com/toefl-ty?session_id=cs_live_123",
      pixelId: "1446406424021779", accessToken: "TOKEN", testEventCode: null,
      customer: { name: "Ana Torres", country: "CO", clientIp: "181.115.213.179", clientUserAgent: "Mozilla/5.0", fbp: "fb.1.1700000000000.1234567890", fbc: "fb.1.1700000000000.AbC" },
    });
    assert(res.ok);
    assertEquals(res.ok && res.fields.sort(), ["client_ip_address", "client_user_agent", "country", "em", "fbc", "fbp", "fn", "ln"]);

    assertEquals(calls.length, 1);
    assertEquals(calls[0].url, "https://graph.facebook.com/v21.0/1446406424021779/events?access_token=TOKEN");
    const ev = calls[0].body.data[0];
    assertEquals(ev.event_name, "Purchase");
    assertEquals(ev.event_id, "cs_live_123");
    assertEquals(ev.action_source, "website");
    assertEquals(ev.event_source_url, "https://www.acrosoftlabs.com/toefl-ty?session_id=cs_live_123");
    assertEquals(ev.custom_data, { value: 17.91, currency: "USD" });
    assertEquals(ev.user_data.client_user_agent, "Mozilla/5.0"); // lo que Meta exige en eventos web
    assertEquals(calls[0].body.test_event_code, undefined);
  });
});

Deno.test("sendMetaPurchaseEvent - sin datos del comprador manda solo el email (como antes)", async () => {
  await withFetchStub(200, async (calls) => {
    const res = await sendMetaPurchaseEvent({ email: "A@B.com", value: 20, currency: "USD", eventId: "cs_1", eventSourceUrl: "https://x/ty", pixelId: "1", accessToken: "T", testEventCode: null });
    assertEquals(res, { ok: true, fields: ["em"] });
    assertEquals(calls[0].body.data[0].user_data, { em: [sha("a@b.com")] });
  });
});

Deno.test("sendMetaPurchaseEvent - código de prueba solo si se pide; errores de Meta no lanzan", async () => {
  await withFetchStub(200, async (calls) => {
    await sendMetaPurchaseEvent({ email: "a@b.com", value: 1, currency: "USD", eventId: "e", eventSourceUrl: "u", pixelId: "1", accessToken: "T", testEventCode: "TEST123" });
    assertEquals(calls[0].body.test_event_code, "TEST123");
  });
  await withFetchStub(400, async () => {
    const res = await sendMetaPurchaseEvent({ email: "a@b.com", value: 1, currency: "USD", eventId: "e", eventSourceUrl: "u", pixelId: "1", accessToken: "T", testEventCode: null });
    assertFalse(res.ok);
  });
});
