import { useEffect, useRef } from "react";
import { initMetaPixel, trackMetaEvent } from "@/lib/metaPixel";
import {
  PISCINAS_PAYMENT_LINK,
  PISCINAS_PIXEL_ID,
  PISCINAS_PRICE,
  PISCINAS_PRODUCT_SLUG,
  piscinasCheckoutUrl,
  piscinasEventParams,
} from "@/lib/piscinasConfig";
import { startKitCheckout } from "@/lib/piscinasCheckout";
import { AB_CHECKOUT_SESSION_KEY, registerAbSession, trackAbClick } from "@/lib/piscinasFunnel";
import { sendProductServerEvent } from "@/lib/productServerEvents";
import { uuid } from "@/lib/uuid";

/**
 * Medición y compra de las landings v2/v3 (misma lógica que /piscinas-lp):
 * visita en ab_sessions, PageView + ViewContent (solo con PIXEL_ID) y el handler del botón de compra
 * (InitiateCheckout + clic en ab_track + checkout del servidor con cobro en un clic; respaldo: Payment Link). Con PAYMENT_LINK vacío
 * el botón solo registra el clic y no navega. Con PIXEL_ID vacío no se dispara ningún evento de Meta.
 */
export function usePiscinasBuy(experimentKey: string) {
  const abSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    abSessionIdRef.current = registerAbSession(experimentKey, String(PISCINAS_PRICE));
  }, [experimentKey]);

  useEffect(() => {
    if (!PISCINAS_PIXEL_ID) return;
    initMetaPixel(PISCINAS_PIXEL_ID);
    trackMetaEvent("PageView", undefined, undefined, PISCINAS_PIXEL_ID);
    const eventId = uuid();
    trackMetaEvent("ViewContent", piscinasEventParams(PISCINAS_PRICE), eventId, PISCINAS_PIXEL_ID);
    void sendProductServerEvent({ product: PISCINAS_PRODUCT_SLUG, event: "ViewContent", eventId, waitForFbpMs: 1500 });
  }, []);

  const paymentLink: string = PISCINAS_PAYMENT_LINK;
  const href = paymentLink ? piscinasCheckoutUrl(paymentLink) : "#";

  const onClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    const opensElsewhere = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;
    if (!opensElsewhere) e.preventDefault();
    try {
      if (PISCINAS_PIXEL_ID) {
        const eventId = uuid();
        trackMetaEvent("InitiateCheckout", piscinasEventParams(PISCINAS_PRICE), eventId, PISCINAS_PIXEL_ID);
        void sendProductServerEvent({ product: PISCINAS_PRODUCT_SLUG, event: "InitiateCheckout", eventId });
      }
      const sid = abSessionIdRef.current;
      if (sid) {
        try { localStorage.setItem(AB_CHECKOUT_SESSION_KEY, sid); } catch { /* no crítico */ }
        trackAbClick(sid);
      }
    } catch { /* no crítico */ }

    if (opensElsewhere || !paymentLink) return;

    await startKitCheckout();
  };

  return { href, onClick };
}

/** Scroll suave a un id (respeta prefers-reduced-motion). Lo usan los botones de la v3 que suben al VSL. */
export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}
