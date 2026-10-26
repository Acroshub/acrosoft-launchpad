import { beforeEach, describe, expect, it, vi } from "vitest";

const track = vi.fn();
const trackStd = vi.fn();
vi.mock("@/lib/metaPixel", () => ({
  initMetaPixel: vi.fn(),
  trackMetaEvent: (...a: unknown[]) => trackStd(...a),
  trackMetaCustomEvent: (...a: unknown[]) => track(...a),
}));

import { trackUpsellPurchase, upsellEventId } from "@/lib/piscinasPixel";
import { PISCINAS_PIXEL_ID } from "@/lib/piscinasConfig";

describe("piscinasPixel", () => {
  beforeEach(() => {
    track.mockClear();
    trackStd.mockClear();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("el event_id es estable por compra del kit y por oferta", () => {
    expect(upsellEventId("up1", "cs_live_abc")).toBe("piscinas-up1-cs_live_abc");
    expect(upsellEventId("up2", "cs_live_abc")).toBe("piscinas-up2-cs_live_abc");
    expect(upsellEventId("up1", null)).toBe("piscinas-up1-sin-sesion");
  });

  it("Upsell1Purchase con su propio valor ($100), una sola vez, y SIN Purchase estándar", () => {
    sessionStorage.setItem("piscinas_front_session", "cs_live_abc");
    expect(trackUpsellPurchase("up1")).toBe(true);
    expect(trackStd).not.toHaveBeenCalled();
    expect(track).toHaveBeenCalledWith(
      "Upsell1Purchase",
      expect.objectContaining({ value: 100, currency: "USD", content_ids: ["piscinas-up1"] }),
      "piscinas-up1-cs_live_abc",
      PISCINAS_PIXEL_ID,
    );
    expect(trackUpsellPurchase("up1")).toBe(false); // recarga: no se repite
    expect(track).toHaveBeenCalledTimes(1);
  });

  it("Upsell2Purchase con $1,000 y su propio event_id (no choca con el del upsell 1)", () => {
    sessionStorage.setItem("piscinas_front_session", "cs_live_abc");
    trackUpsellPurchase("up1");
    expect(trackUpsellPurchase("up2")).toBe(true);
    expect(track).toHaveBeenLastCalledWith("Upsell2Purchase", expect.objectContaining({ value: 1000 }), "piscinas-up2-cs_live_abc", PISCINAS_PIXEL_ID);
  });
});
