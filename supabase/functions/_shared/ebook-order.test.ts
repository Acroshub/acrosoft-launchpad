import { assert, assertEquals, assertFalse, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { EBOOK_CATALOG, resolveMeta, SERVICE_ORDERS, type EnvGetter } from "./ebook-catalog.ts";
import { buildConfirmationEmailHtml, isServiceOrder, parseClientReference, platformAccess, resolveProductSlug } from "./ebook-order.ts";

const envOf = (vars: Record<string, string>): EnvGetter => (name) => vars[name];

// ─── resolveProductSlug ─────────────────────────────────────────────────────

Deno.test("resolveProductSlug - sin ninguna pista es DELF (los links de DELF no llevan nada)", () => {
  assertEquals(resolveProductSlug({}, envOf({})), "delf-a2");
  assertEquals(resolveProductSlug({ metadata: {}, client_reference_id: null, payment_link: null }, envOf({})), "delf-a2");
});

Deno.test("resolveProductSlug - metadata.product_slug manda sobre todo lo demás", () => {
  assertEquals(resolveProductSlug({ metadata: { product_slug: "toefl-b2" }, client_reference_id: "delf-a2" }, envOf({})), "toefl-b2");
  // Un slug desconocido se devuelve tal cual: el webhook lo rechaza con 400, como antes.
  assertEquals(resolveProductSlug({ metadata: { product_slug: "otro" } }, envOf({})), "otro");
});

Deno.test("resolveProductSlug - client_reference_id que la landing agrega al link", () => {
  assertEquals(resolveProductSlug({ client_reference_id: "toefl-b2" }, envOf({})), "toefl-b2");
});

Deno.test("resolveProductSlug - client_reference_id desconocido o con nombre de propiedad de Object no cuenta", () => {
  assertEquals(resolveProductSlug({ client_reference_id: "algo-random" }, envOf({})), "delf-a2");
  assertEquals(resolveProductSlug({ client_reference_id: "constructor" }, envOf({})), "delf-a2");
  assertEquals(resolveProductSlug({ client_reference_id: "__proto__" }, envOf({})), "delf-a2");
});

Deno.test("resolveProductSlug - reconoce el Payment Link por su id si el link no trae el slug", () => {
  const env = envOf({ TOEFL_PAYMENT_LINK_IDS: "plink_AAA, plink_BBB" });
  assertEquals(resolveProductSlug({ payment_link: "plink_BBB" }, env), "toefl-b2");
  assertEquals(resolveProductSlug({ payment_link: "plink_ZZZ" }, env), "delf-a2");
  assertEquals(resolveProductSlug({ payment_link: "plink_BBB" }, envOf({})), "delf-a2");
});

Deno.test("parseClientReference - producto solo, producto + id de atribución, y basura", () => {
  const id = "0b7e3f1a-92c4-4d5e-8a61-3f2c9d7e4b10";
  assertEquals(parseClientReference("toefl-b2"), { slug: "toefl-b2", attributionId: null });
  assertEquals(parseClientReference(`toefl-b2_${id}`), { slug: "toefl-b2", attributionId: id });
  assertEquals(parseClientReference(`toefl-b2_${id.toUpperCase()}`), { slug: "toefl-b2", attributionId: id });
  assertEquals(parseClientReference("toefl-b2_no-es-un-uuid"), { slug: "toefl-b2", attributionId: null });
  assertEquals(parseClientReference(`toefl-b2_${id}_extra`), { slug: "toefl-b2", attributionId: id });
  assertEquals(parseClientReference("  "), null);
  assertEquals(parseClientReference(null), null);
  assertEquals(parseClientReference("_" + id), null);
});

Deno.test("resolveProductSlug - reconoce el producto aunque el client_reference_id lleve el id de atribución", () => {
  const id = "0b7e3f1a-92c4-4d5e-8a61-3f2c9d7e4b10";
  assertEquals(resolveProductSlug({ client_reference_id: `toefl-b2_${id}` }, envOf({})), "toefl-b2");
  assertEquals(resolveProductSlug({ client_reference_id: "toefl-b2_lo-que-sea" }, envOf({})), "toefl-b2");
  assertEquals(resolveProductSlug({ client_reference_id: `otro_${id}` }, envOf({})), "delf-a2");
  assertEquals(resolveProductSlug({ client_reference_id: `constructor_${id}` }, envOf({})), "delf-a2");
});

// ─── platformAccess ─────────────────────────────────────────────────────────

Deno.test("platformAccess - DELF no trae plataforma", () => {
  assertEquals(platformAccess(EBOOK_CATALOG["delf-a2"], envOf({ TOEFL_LAB_PASSWORD: "x" })), null);
});

Deno.test("platformAccess - TOEFL toma la contraseña del secret, nunca del código", () => {
  assertEquals(platformAccess(EBOOK_CATALOG["toefl-b2"], envOf({ TOEFL_LAB_PASSWORD: "  clave-123 " })), {
    name: "TOEFL Audio Lab",
    path: "/toefl-plataforma",
    password: "clave-123",
  });
  assertEquals(platformAccess(EBOOK_CATALOG["toefl-b2"], envOf({}))?.password, null);
  assertEquals(platformAccess(EBOOK_CATALOG["toefl-b2"], envOf({ TOEFL_LAB_PASSWORD: "   " }))?.password, null);
});

// ─── resolveMeta ────────────────────────────────────────────────────────────

Deno.test("resolveMeta - DELF conserva su pixel de siempre y el token/código globales", () => {
  const meta = resolveMeta(EBOOK_CATALOG["delf-a2"], envOf({ META_CAPI_ACCESS_TOKEN: "tok", META_CAPI_TEST_EVENT_CODE: "TEST1" }));
  assertEquals(meta, { pixelId: "1147228644816086", accessToken: "tok", testEventCode: "TEST1" });
  assertEquals(resolveMeta(EBOOK_CATALOG["delf-a2"], envOf({ META_CAPI_ACCESS_TOKEN: "tok" }))?.testEventCode, null);
  assertEquals(resolveMeta(EBOOK_CATALOG["delf-a2"], envOf({})), null);
});

Deno.test("resolveMeta - TOEFL usa SU pixel y SU token; sin token no manda nada (nunca cae al token de DELF)", () => {
  assertEquals(resolveMeta(EBOOK_CATALOG["toefl-b2"], envOf({ META_CAPI_ACCESS_TOKEN: "del-otro-pixel" })), null);
  assertEquals(resolveMeta(EBOOK_CATALOG["toefl-b2"], envOf({ META_CAPI_ACCESS_TOKEN_TOEFL: "   " })), null);
  assertEquals(
    resolveMeta(EBOOK_CATALOG["toefl-b2"], envOf({ META_CAPI_ACCESS_TOKEN_TOEFL: " t ", META_CAPI_TEST_EVENT_CODE: "DELF-CODE" })),
    { pixelId: "1446406424021779", accessToken: "t", testEventCode: null }, // el código de test de DELF no se hereda
  );
  assertEquals(
    resolveMeta(EBOOK_CATALOG["toefl-b2"], envOf({ META_CAPI_ACCESS_TOKEN_TOEFL: "t", META_CAPI_TEST_EVENT_CODE_TOEFL: "TEST9" }))?.testEventCode,
    "TEST9",
  );
});

Deno.test("catálogo - el pixel de TOEFL del servidor es el mismo que usa el navegador", async () => {
  // Si alguien cambia uno y no el otro, los eventos del navegador y de Conversions API irían a pixels distintos.
  const config = await Deno.readTextFile(new URL("../../../src/lib/toeflConfig.ts", import.meta.url));
  const browserPixel = config.match(/TOEFL_PIXEL_ID = "(\d+)"/)?.[1];
  assertEquals(EBOOK_CATALOG["toefl-b2"].meta?.pixelId, browserPixel);
});

// ─── email ──────────────────────────────────────────────────────────────────

// Copia literal del email de DELF tal como estaba en stripe-webhook antes de agregar la plataforma.
function legacyDelfEmail(p: { productName: string; thankYouUrl: string; amountLabel: string }): string {
  const { productName, thankYouUrl, amountLabel } = p;
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#FAF6EF;padding:32px 16px;">
    <div style="max-width:480px;margin:0 auto;background:#FFFFFF;border-radius:14px;overflow:hidden;border:1px solid #DED6BC;">
      <div style="background:#1B2A4A;padding:28px 28px 24px;text-align:center;">
        <p style="margin:0;color:#C9932E;font-weight:700;font-size:12.5px;letter-spacing:.08em;text-transform:uppercase;">Compra confirmada</p>
        <h1 style="margin:10px 0 0;color:#FFFFFF;font-size:22px;font-family:Georgia,serif;">¡Gracias por tu compra!</h1>
      </div>
      <div style="padding:28px;">
        <p style="margin:0 0 16px;font-size:15px;color:#22262E;line-height:1.6;">Tu pago de <strong>${amountLabel}</strong> por <strong>${productName}</strong> fue aprobado. Ya puedes descargar tus archivos.</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${thankYouUrl}" style="display:inline-block;background:#C1403A;color:#FFFFFF;font-weight:900;font-size:16px;padding:16px 28px;border-radius:8px;text-decoration:none;">Ver mi compra y descargar</a>
        </div>
        <p style="margin:0;font-size:13px;color:#5B6270;line-height:1.5;">Guarda este correo — este mismo enlace te sirve para volver a descargar tus archivos cuando quieras.</p>
      </div>
    </div>
  </div>`;
}

const base = { productName: "Guía X", thankYouUrl: "https://acrosoftlabs.com/ty?session_id=cs_1", amountLabel: "$19.00 USD" };

Deno.test("email - sin plataforma es idéntico, byte a byte, al de DELF de antes", () => {
  assertEquals(buildConfirmationEmailHtml(base), legacyDelfEmail(base));
  assertEquals(buildConfirmationEmailHtml({ ...base, platform: null }), legacyDelfEmail(base));
});

Deno.test("email - con plataforma lleva el link y la contraseña", () => {
  const html = buildConfirmationEmailHtml({
    ...base,
    platform: { name: "TOEFL Audio Lab", url: "https://acrosoftlabs.com/toefl-plataforma", password: "test-pass-2026" },
  });
  assertStringIncludes(html, 'href="https://acrosoftlabs.com/toefl-plataforma"');
  assertStringIncludes(html, "Abrir la plataforma");
  assertStringIncludes(html, "test-pass-2026");
  assertStringIncludes(html, "Bono 1 · TOEFL Audio Lab");
  assertStringIncludes(html, `href="${base.thankYouUrl}"`); // la descarga sigue estando
});

Deno.test("email - un bloque de plataforma sin contraseña no se muestra (queda como el email normal)", () => {
  const html = buildConfirmationEmailHtml({ ...base, platform: { name: "TOEFL Audio Lab", url: "https://x/toefl-plataforma", password: null } });
  assertEquals(html, legacyDelfEmail(base));
  assertFalse(html.includes("toefl-plataforma"));
});

Deno.test("email - la contraseña se escapa (no se puede colar HTML)", () => {
  const html = buildConfirmationEmailHtml({ ...base, platform: { name: "Lab", url: "https://x", password: `<b>"a"&b` } });
  assert(!html.includes("<b>"));
  assertStringIncludes(html, "&lt;b&gt;&quot;a&quot;&amp;b");
});

// ─── auxilios (sin ZIP: solo webapp) ─────────────────────────────────────────

Deno.test("auxilios - se reconoce por client_reference_id y no trae archivo para descargar", () => {
  assertEquals(resolveProductSlug({ client_reference_id: "auxilios" }, envOf({})), "auxilios");
  assertEquals(resolveProductSlug({ client_reference_id: "auxilios_6f1c2d3e-0a1b-4c5d-8e9f-0123456789ab" }, envOf({})), "auxilios");
  assertEquals(EBOOK_CATALOG["auxilios"].storagePath, undefined);
  assertEquals(EBOOK_CATALOG["auxilios"].filename, undefined);
});

Deno.test("auxilios - pixel propio y token propio (no reutiliza el de TOEFL ni el de DELF)", () => {
  const meta = resolveMeta(EBOOK_CATALOG["auxilios"], envOf({ META_CAPI_ACCESS_TOKEN_AUXILIOS: "tok" }));
  assertEquals(meta?.pixelId, "1209613534467929");
  assertEquals(meta?.accessToken, "tok");
  assertEquals(resolveMeta(EBOOK_CATALOG["auxilios"], envOf({ META_CAPI_ACCESS_TOKEN_TOEFL: "otro" })), null);
});

Deno.test("auxilios - la contraseña sale del secret de la app", () => {
  assertEquals(platformAccess(EBOOK_CATALOG["auxilios"], envOf({ PRIMEROS_AUXILIOS_BEBE_APP_PASSWORD: " clave " }))?.password, "clave");
  assertEquals(platformAccess(EBOOK_CATALOG["auxilios"], envOf({}))?.password, null);
});

Deno.test("email - sin descarga y con textos propios de la plataforma", () => {
  const html = buildConfirmationEmailHtml({
    ...base,
    hasDownload: false,
    platform: { name: "App", url: "https://x/app", password: "abc", label: "Tu app", blurb: "Entra con esta contraseña:", button: "Abrir la app" },
  });
  assertStringIncludes(html, "Tu app");
  assertStringIncludes(html, "Abrir la app");
  assertStringIncludes(html, "Ver mi compra<");
  assert(!html.includes("descargar"));
  assert(!html.includes("Bono 1"));
});

Deno.test("catálogo - el pixel de auxilios del servidor es el mismo que usa el navegador", async () => {
  const config = await Deno.readTextFile(new URL("../../../src/lib/auxiliosConfig.ts", import.meta.url));
  const browserPixel = config.match(/AUXILIOS_PIXEL_ID = "(\d+)"/)?.[1];
  assertEquals(EBOOK_CATALOG["auxilios"].meta?.pixelId, browserPixel);
});

Deno.test("catálogo - tracking de auxilios (nombre, precio, slug) coincide con el config del navegador", async () => {
  const config = await Deno.readTextFile(new URL("../../../src/lib/auxiliosConfig.ts", import.meta.url));
  const t = EBOOK_CATALOG["auxilios"].tracking!;
  assertEquals(t.contentName, config.match(/AUXILIOS_CONTENT_NAME = "([^"]+)"/)?.[1]);
  assertEquals(t.price, Number(config.match(/AUXILIOS_PRICE = (\d+)/)?.[1]));
  assertEquals("auxilios", config.match(/AUXILIOS_PRODUCT_SLUG = "([^"]+)"/)?.[1]);
});

// ─── piscinas (ZIP, sin pixel) + upsells (servicios sin entrega) ─────────────

Deno.test("piscinas - se reconoce por client_reference_id (con y sin id de atribución) y entrega un ZIP", () => {
  assertEquals(resolveProductSlug({ client_reference_id: "piscinas" }, envOf({})), "piscinas");
  assertEquals(resolveProductSlug({ client_reference_id: "piscinas_6f1c2d3e-0a1b-4c5d-8e9f-0123456789ab" }, envOf({})), "piscinas");
  const p = EBOOK_CATALOG["piscinas"];
  assertEquals(p.filename, "Kit-Conseguir-Clientes-Piscinas.zip");
  assertEquals(p.thankYouPath, "/piscinas-ty");
  assert(!!p.storagePath);
  assertEquals(p.platform, undefined); // sin plataforma con contraseña
  assertEquals(platformAccess(p, envOf({})), null);
});

Deno.test("piscinas - reconoce su Payment Link por id aunque el link no traiga el slug", () => {
  const env = envOf({ PISCINAS_PAYMENT_LINK_IDS: "plink_KIT" });
  assertEquals(resolveProductSlug({ payment_link: "plink_KIT" }, env), "piscinas");
  assertEquals(resolveProductSlug({ payment_link: "plink_OTRO" }, env), "delf-a2");
});

Deno.test("piscinas - sin pixel ni tracking a propósito (pendiente de Daniel): no manda Purchase por CAPI ni acepta eventos de servidor", () => {
  const p = EBOOK_CATALOG["piscinas"];
  assertEquals(p.meta, undefined);
  assertEquals(p.tracking, undefined);
  // Ni con un token de otro producto en el entorno se manda nada al pixel equivocado.
  assertEquals(resolveMeta(p, envOf({ META_CAPI_ACCESS_TOKEN: "x", META_CAPI_ACCESS_TOKEN_TOEFL: "y", META_CAPI_ACCESS_TOKEN_AUXILIOS: "z" })), null);
});

Deno.test("piscinas - el email de confirmación lleva el link a /piscinas-ty?session_id= y habla de descarga (no de plataforma)", () => {
  const p = EBOOK_CATALOG["piscinas"];
  const html = buildConfirmationEmailHtml({
    productName: p.name,
    thankYouUrl: `https://www.acrosoftlabs.com${p.thankYouPath}?session_id=cs_test_1`,
    amountLabel: "$30.00 USD",
    platform: null,
    hasDownload: !!p.storagePath,
  });
  assertStringIncludes(html, 'href="https://www.acrosoftlabs.com/piscinas-ty?session_id=cs_test_1"');
  assertStringIncludes(html, "Ver mi compra y descargar");
  assert(!html.includes("plataforma de práctica"));
});

Deno.test("upsells - un pago de upsell se reconoce como servicio (no cae en DELF) y no es un producto del catálogo", () => {
  assertEquals(resolveProductSlug({ client_reference_id: "piscinas-up1" }, envOf({})), "piscinas-up1");
  assertEquals(resolveProductSlug({ client_reference_id: "piscinas-up2" }, envOf({})), "piscinas-up2");
  assertEquals(resolveProductSlug({ client_reference_id: "piscinas-up2_6f1c2d3e-0a1b-4c5d-8e9f-0123456789ab" }, envOf({})), "piscinas-up2");
  assert(isServiceOrder("piscinas-up1"));
  assert(isServiceOrder("piscinas-up2"));
  assertFalse(isServiceOrder("piscinas"));
  assertFalse(isServiceOrder("toefl-b2"));
  assertFalse(isServiceOrder("delf-a2"));
  assertFalse(isServiceOrder("constructor"));
  assertFalse(Object.hasOwn(EBOOK_CATALOG, "piscinas-up1"));
});

Deno.test("upsells - también se reconocen por el id de su Payment Link y DELF/TOEFL/auxilios siguen igual", () => {
  const env = envOf({ PISCINAS_UP1_PAYMENT_LINK_IDS: "plink_U1", PISCINAS_UP2_PAYMENT_LINK_IDS: "plink_U2a, plink_U2b", TOEFL_PAYMENT_LINK_IDS: "plink_T" });
  assertEquals(resolveProductSlug({ payment_link: "plink_U1" }, env), "piscinas-up1");
  assertEquals(resolveProductSlug({ payment_link: "plink_U2b" }, env), "piscinas-up2");
  assertEquals(resolveProductSlug({ payment_link: "plink_T" }, env), "toefl-b2");
  assertEquals(resolveProductSlug({ payment_link: "plink_X" }, env), "delf-a2");
  assertEquals(resolveProductSlug({ client_reference_id: "auxilios" }, env), "auxilios");
});

Deno.test("upsells - el catálogo de servicios tiene los slugs que usan las páginas del navegador", async () => {
  const config = await Deno.readTextFile(new URL("../../../src/lib/piscinasConfig.ts", import.meta.url));
  assertEquals(Object.keys(SERVICE_ORDERS).sort(), [
    config.match(/PISCINAS_UP1_SLUG = "([^"]+)"/)?.[1],
    config.match(/PISCINAS_UP2_SLUG = "([^"]+)"/)?.[1],
  ].sort());
});

Deno.test("catálogo - piscinas: slug, nombre y precio del navegador; el pixel sigue vacío mientras el catálogo no tenga `meta`", async () => {
  const config = await Deno.readTextFile(new URL("../../../src/lib/piscinasConfig.ts", import.meta.url));
  assertEquals("piscinas", config.match(/PISCINAS_PRODUCT_SLUG = "([^"]+)"/)?.[1]);
  assertEquals(config.match(/PISCINAS_CONTENT_NAME = "([^"]+)"/)?.[1], EBOOK_CATALOG["piscinas"].name);
  assertEquals(Number(config.match(/PISCINAS_PRICE = (\d+)/)?.[1]), 30);
  // Pixel del navegador y del servidor van juntos: si algún día uno se llena, el otro también (y se agrega `tracking`).
  const browserPixel = config.match(/PISCINAS_PIXEL_ID: string = "(\d*)"/)?.[1];
  assertEquals(browserPixel, EBOOK_CATALOG["piscinas"].meta?.pixelId ?? "");
});
