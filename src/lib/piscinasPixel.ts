// Pixel de Meta de los upsells de Piscinas (solo navegador). `Purchase` queda SOLO para el kit (una venta por persona: lo dispara
// /piscinas-ty con el valor real de la orden). Cada upsell es un evento PERSONALIZADO con su valor y su event_id, para ver cuánto
// facturó cada anuncio sin contar dos ventas de la misma persona:
//   Upsell1Purchase ($100)       → al llegar a /piscinas-up2?from=up1
//   Upsell2Purchase ($1,000/mes) → al llegar a /piscinas-ty?up=2   (primer mes; las renovaciones no se reportan)
// (el cobro en un clic y el Payment Link de reserva terminan en la misma URL.) Una sola vez por compra (localStorage). Sin PISCINAS_PIXEL_ID no hace nada.
import { initMetaPixel, trackMetaCustomEvent, trackMetaEvent } from "@/lib/metaPixel";
import { PISCINAS_PIXEL_ID, PISCINAS_UP1_PRICE, PISCINAS_UP1_SLUG, PISCINAS_UP2_PRICE_MONTHLY, PISCINAS_UP2_SLUG } from "@/lib/piscinasConfig";
import { FRONT_SESSION_KEY, readSession } from "@/lib/piscinasFunnel";

export type PixelUpsell = "up1" | "up2";

/** Nombre del evento personalizado de cada upsell (así se busca en Events Manager / Ads Manager). */
export const UPSELL_EVENT_NAMES: Record<PixelUpsell, string> = { up1: "Upsell1Purchase", up2: "Upsell2Purchase" };

const UPSELLS: Record<PixelUpsell, { slug: string; name: string; value: number }> = {
  up1: { slug: PISCINAS_UP1_SLUG, name: "Sistema Calendario Lleno Para Negocios de Limpieza de Piscinas", value: PISCINAS_UP1_PRICE },
  up2: { slug: PISCINAS_UP2_SLUG, name: "Servicio Profesional Completo Calendario Lleno En Automático", value: PISCINAS_UP2_PRICE_MONTHLY },
};

/** event_id estable por compra: una sola compra del kit + la oferta (sirve también para la API de Conversiones). */
export function upsellEventId(offer: PixelUpsell, frontSessionId: string | null): string {
  return `piscinas-${offer}-${frontSessionId ?? "sin-sesion"}`;
}

/** PageView en las páginas de upsell (inicializa el pixel). */
export function trackUpsellPageView(): void {
  if (!PISCINAS_PIXEL_ID) return;
  initMetaPixel(PISCINAS_PIXEL_ID);
  trackMetaEvent("PageView", undefined, undefined, PISCINAS_PIXEL_ID);
}

/** Evento personalizado de compra del upsell. Devuelve true si lo disparó (false: sin pixel o ya reportado). */
export function trackUpsellPurchase(offer: PixelUpsell): boolean {
  if (!PISCINAS_PIXEL_ID) return false;
  const u = UPSELLS[offer];
  const eventId = upsellEventId(offer, readSession(FRONT_SESSION_KEY));
  const dedupeKey = `fb_upsell_fired_${eventId}`;
  try {
    if (localStorage.getItem(dedupeKey)) return false;
    localStorage.setItem(dedupeKey, "1");
  } catch { /* sin localStorage: se dispara igual (Meta deduplica por event_id) */ }
  initMetaPixel(PISCINAS_PIXEL_ID);
  trackMetaCustomEvent(UPSELL_EVENT_NAMES[offer], { content_name: u.name, content_ids: [u.slug], content_type: "product", value: u.value, currency: "USD" }, eventId, PISCINAS_PIXEL_ID);
  return true;
}
