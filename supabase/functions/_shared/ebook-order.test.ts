import { assert, assertEquals, assertFalse, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { EBOOK_CATALOG, resolveMeta, type EnvGetter } from "./ebook-catalog.ts";
import { buildConfirmationEmailHtml, parseClientReference, platformAccess, resolveProductSlug } from "./ebook-order.ts";

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
  assertEquals(EBOOK_CATALOG["toefl-b2"].meta.pixelId, browserPixel);
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
