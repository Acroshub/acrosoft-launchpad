import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { META_PIXEL_ID, initMetaPixel, trackMetaCustomEvent, trackMetaEvent } from "./metaPixel";
import { TOEFL_PRODUCT_SLUG, toeflCheckoutUrl } from "./toeflConfig";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const w = window as any;

function resetPixel() {
  delete w.fbq;
  delete w._fbq;
  delete w.__metaPixelsInited;
  document.head.querySelectorAll("script").forEach((s) => s.remove());
}

beforeEach(() => {
  resetPixel();
  w.__metaPixelAllowLocal = true; // jsdom corre en «localhost»: estas pruebas ejercitan el pixel real, así que permiten local
  document.head.appendChild(document.createElement("script")); // initMetaPixel inserta antes del primer <script>
});
afterEach(() => {
  resetPixel();
  delete w.__metaPixelAllowLocal;
  sessionStorage.removeItem("__metaPixelFbtest");
  window.history.pushState({}, "", "/");
});

describe("protección en desarrollo local (localhost)", () => {
  it("en localhost no carga el pixel ni manda eventos (no ensucia el pixel real con visitas de tu computadora)", () => {
    delete w.__metaPixelAllowLocal;
    initMetaPixel("999");
    trackMetaEvent("PageView", undefined, undefined, "999");
    trackMetaCustomEvent("Algo", {}, undefined, "999");
    expect(w.fbq).toBeUndefined();
    expect(document.head.querySelectorAll('script[src*="fbevents"]')).toHaveLength(0);
  });

  it("con ?fbtest=1 sí funciona en local (para probar con Meta Pixel Helper)", () => {
    delete w.__metaPixelAllowLocal;
    window.history.pushState({}, "", "/estimados-lp?fbtest=1");
    initMetaPixel("999");
    trackMetaEvent("PageView", undefined, undefined, "999");
    expect(w.fbq.queue).toEqual([["init", "999"], ["trackSingle", "999", "PageView", {}]]);
  });

  it("?fbtest=1 se recuerda en la sesión de la pestaña: al pasar a otra página del embudo (sin el parámetro en la URL) sigue funcionando", () => {
    delete w.__metaPixelAllowLocal;
    window.history.pushState({}, "", "/estimados-ty?session_id=cs_1&fbtest=1");
    initMetaPixel("999");
    window.history.pushState({}, "", "/estimados-gracias"); // navegación dentro de la app: se pierde el parámetro
    trackMetaEvent("Lead", { content_name: "x" }, "lead_1", "999");
    expect(w.fbq.queue.at(-1)).toEqual(["trackSingle", "999", "Lead", { content_name: "x" }, { eventID: "lead_1" }]);
  });

  it("sin haber usado ?fbtest=1 en esa pestaña, una URL de localhost normal sigue bloqueada", () => {
    delete w.__metaPixelAllowLocal;
    sessionStorage.removeItem("__metaPixelFbtest");
    window.history.pushState({}, "", "/estimados-gracias");
    initMetaPixel("999");
    expect(w.fbq).toBeUndefined();
  });
});

describe("initMetaPixel / trackMetaEvent", () => {
  it("sin argumentos se comporta como siempre: pixel de DELF y `track`", () => {
    initMetaPixel();
    expect(w.fbq.queue).toEqual([["init", META_PIXEL_ID]]);
    trackMetaEvent("Purchase", { value: 1 }, "evt_1");
    expect(w.fbq.queue.at(-1)).toEqual(["track", "Purchase", { value: 1 }, { eventID: "evt_1" }]);
  });

  it("con pixelId inicializa ese pixel una sola vez y los eventos van solo a él (trackSingle)", () => {
    initMetaPixel("999");
    initMetaPixel("999");
    expect(w.fbq.queue.filter((c: unknown[]) => c[0] === "init")).toEqual([["init", "999"]]);

    trackMetaEvent("InitiateCheckout", { value: 19, currency: "USD" }, undefined, "999");
    trackMetaEvent("Purchase", { value: 17, currency: "USD" }, "cs_test_1", "999");
    expect(w.fbq.queue.slice(-2)).toEqual([
      ["trackSingle", "999", "InitiateCheckout", { value: 19, currency: "USD" }],
      ["trackSingle", "999", "Purchase", { value: 17, currency: "USD" }, { eventID: "cs_test_1" }],
    ]);
  });

  it("si otro producto ya cargó fbq, un pixel nuevo igual se inicializa (y no se pisa el otro)", () => {
    initMetaPixel(); // DELF
    initMetaPixel("999"); // TOEFL, misma sesión
    const inits = w.fbq.queue.filter((c: unknown[]) => c[0] === "init");
    expect(inits).toEqual([["init", META_PIXEL_ID], ["init", "999"]]);
  });

  it("no hace nada si fbq no existe", () => {
    expect(() => trackMetaEvent("PageView", undefined, undefined, "999")).not.toThrow();
  });
});

describe("toeflCheckoutUrl", () => {
  it("adjunta el producto para que el webhook sepa qué entregar", () => {
    const url = new URL(toeflCheckoutUrl("https://buy.stripe.com/abc123"));
    expect(url.origin + url.pathname).toBe("https://buy.stripe.com/abc123");
    expect(url.searchParams.get("client_reference_id")).toBe(TOEFL_PRODUCT_SLUG);
  });

  it("respeta parámetros que el link ya traiga", () => {
    const url = new URL(toeflCheckoutUrl("https://buy.stripe.com/abc123?prefilled_promo_code=X"));
    expect(url.searchParams.get("prefilled_promo_code")).toBe("X");
    expect(url.searchParams.get("client_reference_id")).toBe("toefl-b2");
  });
});
