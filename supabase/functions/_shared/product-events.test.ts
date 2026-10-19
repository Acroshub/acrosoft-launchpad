import { assert, assertEquals, assertFalse } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildWebUserData, sendMetaWebEvent } from "./meta-capi.ts";
import { clientIpFrom, customDataFor, makeRateLimiter, parseTrackRequest } from "./product-events.ts";
import { EBOOK_CATALOG, type EbookProduct } from "./ebook-catalog.ts";

const valid = {
  product: "auxilios",
  event: "ViewContent",
  event_id: "0b7e3f1a-92c4-4d5e-8a61-3f2c9d7e4b10",
  source_url: "https://www.acrosoftlabs.com/auxilios-lp?fbclid=abc",
  ab_version: "B",
  fbp: "fb.1.1792440802683.64856671888511552",
  fbc: "fb.1.1792440802674.abc",
};

Deno.test("parseTrackRequest - acepta un evento válido", () => {
  const r = parseTrackRequest(valid);
  assert(r);
  assertEquals(r.event, "ViewContent");
  assertEquals(r.abVersion, "B");
  assertEquals(r.eventId, valid.event_id);
});

Deno.test("parseTrackRequest - InitiateCheckout y la ruta con barra final", () => {
  assert(parseTrackRequest({ ...valid, event: "InitiateCheckout", source_url: "https://acrosoftlabs.com/auxilios-lp/" }));
});

Deno.test("parseTrackRequest - rechaza eventos fuera de la lista (Purchase no se puede inyectar)", () => {
  assertEquals(parseTrackRequest({ ...valid, event: "Purchase" }), null);
  assertEquals(parseTrackRequest({ ...valid, event: "constructor" }), null);
  assertEquals(parseTrackRequest({ ...valid, event: undefined }), null);
});

Deno.test("parseTrackRequest - rechaza event_id inválido, origen ajeno y ruta ajena", () => {
  assertEquals(parseTrackRequest({ ...valid, event_id: "x" }), null);
  assertEquals(parseTrackRequest({ ...valid, event_id: "a b c d e f g h" }), null);
  assertEquals(parseTrackRequest({ ...valid, source_url: "https://evil.com/auxilios-lp" }), null);
  assertEquals(parseTrackRequest({ ...valid, source_url: "https://www.acrosoftlabs.com.evil.com/auxilios-lp" }), null);
  assertEquals(parseTrackRequest({ ...valid, source_url: "https://www.acrosoftlabs.com/otra" }), null);
  assertEquals(parseTrackRequest({ ...valid, source_url: "no es url" }), null);
  assertEquals(parseTrackRequest(null), null);
  assertEquals(parseTrackRequest("hola"), null);
});

Deno.test("parseTrackRequest - ab_version raro queda en null y fbp/fbc enormes se descartan", () => {
  const r = parseTrackRequest({ ...valid, ab_version: "C", fbp: "x".repeat(500), fbc: 5 });
  assert(r);
  assertEquals(r.abVersion, null);
  assertEquals(r.fbp, null);
  assertEquals(r.fbc, null);
});

// Catálogo de mentira con DOS productos (distinto nicho/precio/landing) y uno sin `tracking`.
const fake = (over: Partial<EbookProduct>): EbookProduct => ({
  name: "x", shortName: "x", thankYouPath: "/x-ty", meta: { pixelId: "1", accessTokenEnv: "T" }, ...over,
});
const multi = {
  auxilios: EBOOK_CATALOG.auxilios,
  keto: fake({ tracking: { contentName: "Keto en 7 Días", price: 19, currency: "USD", landingPath: "/keto-lp" } }),
  euros: fake({ tracking: { contentName: "Producto EUR", price: 9.9, currency: "EUR", landingPath: "/euros-lp" } }),
  sin: fake({}),
};

Deno.test("varios productos - cada uno usa su propio nombre, precio, moneda y landing", () => {
  const k = parseTrackRequest({ ...valid, product: "keto", source_url: "https://www.acrosoftlabs.com/keto-lp?x=1" }, multi);
  assert(k);
  assertEquals(customDataFor(k, multi), { content_name: "Keto en 7 Días", content_ids: ["keto"], content_type: "product", value: 19, currency: "USD", ab_version: "B" });
  const e = parseTrackRequest({ ...valid, product: "euros", source_url: "https://www.acrosoftlabs.com/euros-lp" }, multi)!;
  assertEquals(customDataFor(e, multi).currency, "EUR");
  assertEquals(customDataFor(e, multi).value, 9.9);
});

Deno.test("varios productos - un evento de un producto no vale desde la landing de otro", () => {
  assertEquals(parseTrackRequest({ ...valid, product: "keto" }, multi), null); // source_url es /auxilios-lp
  assertEquals(parseTrackRequest({ ...valid, product: "auxilios", source_url: "https://www.acrosoftlabs.com/keto-lp" }, multi), null);
});

Deno.test("varios productos - sin `tracking`, desconocido o con nombre de propiedad de Object no cuentan", () => {
  assertEquals(parseTrackRequest({ ...valid, product: "sin", source_url: "https://www.acrosoftlabs.com/sin-lp" }, multi), null);
  assertEquals(parseTrackRequest({ ...valid, product: "nope" }, multi), null);
  assertEquals(parseTrackRequest({ ...valid, product: "constructor" }, multi), null);
  assertEquals(parseTrackRequest({ ...valid, product: "__proto__" }, multi), null);
  assertEquals(parseTrackRequest({ ...valid, product: undefined }, multi), null);
  // DELF y TOEFL (pagos existentes) no declaran tracking: la función no les manda nada.
  assertEquals(parseTrackRequest({ ...valid, product: "delf-a2" }), null);
  assertEquals(parseTrackRequest({ ...valid, product: "toefl-b2" }), null);
});

Deno.test("customDataFor - valor, moneda y producto los fija el servidor, igual que el pixel", () => {
  const r = parseTrackRequest({ ...valid, value: 9999, currency: "EUR" })!;
  assertEquals(customDataFor(r), {
    content_name: "Primeros Auxilios del Bebé",
    content_ids: ["auxilios"],
    content_type: "product",
    value: 25,
    currency: "USD",
    ab_version: "B",
  });
});

Deno.test("buildWebUserData - solo campos válidos, sin hashear", () => {
  assertEquals(
    buildWebUserData({ clientIp: "1.2.3.4", clientUserAgent: "UA", fbp: valid.fbp, fbc: valid.fbc }),
    { client_ip_address: "1.2.3.4", client_user_agent: "UA", fbp: valid.fbp, fbc: valid.fbc },
  );
  assertEquals(buildWebUserData({ clientIp: "no ip!", fbp: "basura", fbc: null }), {});
});

Deno.test("clientIpFrom - prefiere cf-connecting-ip y toma la primera de x-forwarded-for", () => {
  assertEquals(clientIpFrom(new Headers({ "cf-connecting-ip": "9.9.9.9", "x-forwarded-for": "1.1.1.1" })), "9.9.9.9");
  assertEquals(clientIpFrom(new Headers({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" })), "1.1.1.1");
  assertEquals(clientIpFrom(new Headers()), null);
});

Deno.test("makeRateLimiter - corta al pasar el máximo y se libera con la ventana", () => {
  let t = 0;
  const allow = makeRateLimiter(2, 1000, () => t);
  assert(allow("a")); assert(allow("a"));
  assertFalse(allow("a"));
  assert(allow("b"));
  t = 1500;
  assert(allow("a"));
});

Deno.test("sendMetaWebEvent - manda event_id, user_data y código de prueba; sin user agent no envía", async () => {
  const realFetch = globalThis.fetch;
  let sent: { url: string; body: Record<string, unknown> } | null = null;
  globalThis.fetch = ((url: string, init: RequestInit) => {
    sent = { url, body: JSON.parse(init.body as string) };
    return Promise.resolve(new Response("{}", { status: 200 }));
  }) as typeof fetch;
  try {
    const base = {
      eventName: "ViewContent", eventId: "evt_12345678", eventSourceUrl: "https://www.acrosoftlabs.com/auxilios-lp",
      customData: { value: 25 }, pixelId: "123", accessToken: "tok",
    };
    assertEquals(await sendMetaWebEvent({ ...base, visitor: { clientIp: "1.2.3.4" } }), { ok: false, error: "falta client_user_agent" });
    assertEquals(sent, null);

    const r = await sendMetaWebEvent({ ...base, visitor: { clientUserAgent: "UA", fbp: valid.fbp }, testEventCode: "TEST1" });
    assertEquals(r, { ok: true });
    const s = sent as unknown as { url: string; body: { data: Record<string, unknown>[]; test_event_code: string } };
    assert(s.url.includes("/123/events"));
    assertEquals(s.body.test_event_code, "TEST1");
    assertEquals(s.body.data[0].event_name, "ViewContent");
    assertEquals(s.body.data[0].event_id, "evt_12345678");
    assertEquals(s.body.data[0].action_source, "website");
  } finally {
    globalThis.fetch = realFetch;
  }
});
