import { describe, expect, it } from "vitest";
import vercelRaw from "../../vercel.json?raw";
import {
  ESTIMADOS_CONTENT_NAME,
  ESTIMADOS_LIST_PRICE,
  ESTIMADOS_PRICE,
  ESTIMADOS_PRODUCT_SLUG,
  ESTIMADOS_TY_VIDEO_URL,
  estimadosCheckoutUrl,
  estimadosEventParams,
} from "./estimadosConfig";

describe("estimadosCheckoutUrl", () => {
  const link = "https://buy.stripe.com/test_abc123";

  it("sin atribución: client_reference_id es solo el slug", () => {
    const url = new URL(estimadosCheckoutUrl(link));
    expect(url.searchParams.get("client_reference_id")).toBe("estimados");
  });

  it("con atribución: client_reference_id es estimados_<uuid>", () => {
    const id = "123e4567-e89b-12d3-a456-426614174000";
    const url = new URL(estimadosCheckoutUrl(link, id));
    expect(url.searchParams.get("client_reference_id")).toBe(`estimados_${id}`);
  });

  it("conserva el host y la ruta del Payment Link", () => {
    const url = new URL(estimadosCheckoutUrl(link, "x"));
    expect(`${url.origin}${url.pathname}`).toBe(link);
  });
});

describe("estimadosEventParams", () => {
  it("manda el producto, el valor y la moneda del precio vigente", () => {
    expect(estimadosEventParams()).toEqual({
      content_name: ESTIMADOS_CONTENT_NAME,
      content_ids: [ESTIMADOS_PRODUCT_SLUG],
      content_type: "product",
      value: ESTIMADOS_PRICE,
      currency: "USD",
    });
  });

  it("el precio de lista, si existe, es mayor que el de venta (nunca se muestra un tachado menor)", () => {
    if (ESTIMADOS_LIST_PRICE !== null) expect(ESTIMADOS_LIST_PRICE).toBeGreaterThan(ESTIMADOS_PRICE);
  });
});

describe("video de /estimados-ty", () => {
  const csp = () => {
    const value = (JSON.parse(vercelRaw).headers as { headers: { key: string; value: string }[] }[])
      .flatMap((h) => h.headers)
      .find((h) => h.key === "Content-Security-Policy")!.value;
    return (name: string) => (value.split(";").map((d) => d.trim()).find((d) => d.startsWith(name)) ?? "").split(/\s+/).slice(1);
  };

  it("la URL del video es https y el CSP de vercel.json la deja cargar (si no, el navegador la bloquea en producción)", () => {
    expect(ESTIMADOS_TY_VIDEO_URL).toMatch(/^https:\/\//);
    const dir = csp();
    if (/\.(mp4|webm|m4v)(\?|#|$)/i.test(ESTIMADOS_TY_VIDEO_URL)) {
      // <video>: manda media-src (y el póster, img-src)
      expect(dir("media-src")).toContain("https:");
      expect(dir("img-src")).toContain("https:");
    } else {
      // iframe: manda frame-src, con el origen exacto
      expect(dir("frame-src")).toContain(new URL(ESTIMADOS_TY_VIDEO_URL).origin);
    }
  });
});
