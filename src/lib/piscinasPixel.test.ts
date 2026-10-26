import { beforeEach, describe, expect, it, vi } from "vitest";

const track = vi.fn();
vi.mock("@/lib/metaPixel", () => ({ initMetaPixel: vi.fn(), trackMetaEvent: (...a: unknown[]) => track(...a) }));

import { trackUpsellPurchase, upsellEventId } from "@/lib/piscinasPixel";
import { PISCINAS_PIXEL_ID } from "@/lib/piscinasConfig";

describe("piscinasPixel", () => {
  beforeEach(() => {
    track.mockClear();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("el event_id es estable por compra del kit y por oferta", () => {
    expect(upsellEventId("up1", "cs_live_abc")).toBe("piscinas-up1-cs_live_abc");
    expect(upsellEventId("up2", "cs_live_abc")).toBe("piscinas-up2-cs_live_abc");
    expect(upsellEventId("up1", null)).toBe("piscinas-up1-sin-sesion");
  });

  it("Purchase del upsell 1 con su propio valor ($100), una sola vez", () => {
    sessionStorage.setItem("piscinas_front_session", "cs_live_abc");
    expect(trackUpsellPurchase("up1")).toBe(true);
    expect(track).toHaveBeenCalledWith(
      "Purchase",
      expect.objectContaining({ value: 100, currency: "USD", content_ids: ["piscinas-up1"] }),
      "piscinas-up1-cs_live_abc",
      PISCINAS_PIXEL_ID,
    );
    expect(trackUpsellPurchase("up1")).toBe(false); // recarga: no se repite
    expect(track).toHaveBeenCalledTimes(1);
  });

  it("Purchase del upsell 2 con $1,000 y su propio event_id (no choca con el del upsell 1)", () => {
    sessionStorage.setItem("piscinas_front_session", "cs_live_abc");
    trackUpsellPurchase("up1");
    expect(trackUpsellPurchase("up2")).toBe(true);
    expect(track).toHaveBeenLastCalledWith("Purchase", expect.objectContaining({ value: 1000 }), "piscinas-up2-cs_live_abc", PISCINAS_PIXEL_ID);
  });
});
