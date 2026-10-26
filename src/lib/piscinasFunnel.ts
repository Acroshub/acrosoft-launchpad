// Utilidades del embudo de Piscinas compartidas por las 4 páginas: banderas en sessionStorage
// (qué compró la persona en esta sesión) y registro de visitas/clics en ab_sessions / ab_track.
// Todo es "no crítico": nunca lanza ni impide pagar.

import { uuid } from "@/lib/uuid";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

/** session_id de Stripe de la compra del kit (se guarda en /piscinas-up1; lo lee /piscinas-ty). */
export const FRONT_SESSION_KEY = "piscinas_front_session";
/** "bought" cuando la persona llegó a /piscinas-up2 desde el pago del upsell 1 (?from=up1). */
export const UP1_FLAG_KEY = "piscinas_up1";
/** "bought" cuando la persona llegó a /piscinas-ty desde el pago del upsell 2 (?up=2). */
export const UP2_FLAG_KEY = "piscinas_up2";

export const AB_KIT_EXPERIMENT = "piscinas_price";
export const AB_UP1_EXPERIMENT = "piscinas_up1_offer";
export const AB_UP2_EXPERIMENT = "piscinas_up2_offer";
/** localStorage: id de la sesión de ab_sessions que hizo clic en comprar el kit (la thank-you la marca como comprada). */
export const AB_CHECKOUT_SESSION_KEY = "piscinas_ab_checkout_session";

export function readSession(key: string): string | null {
  try { return sessionStorage.getItem(key); } catch { return null; }
}

export function writeSession(key: string, value: string): void {
  try { sessionStorage.setItem(key, value); } catch { /* no crítico */ }
}

/** Registra la visita en ab_sessions (insert-only para anon) y devuelve el id de la sesión. */
export function registerAbSession(experimentKey: string, value: string): string {
  const sid = uuid();
  fetch(`${SUPABASE_URL}/rest/v1/ab_sessions`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ id: sid, variants: { [experimentKey]: value } }),
  }).catch(() => { /* no crítico */ });
  return sid;
}

/** Marca la sesión como "hizo clic en comprar". */
export function trackAbClick(sessionId: string | null): void {
  if (!sessionId) return;
  fetch(`${SUPABASE_URL}/rest/v1/rpc/ab_track`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ p_id: sessionId, p_converted: true }),
    keepalive: true,
  }).catch(() => { /* no crítico */ });
}

/** Marca la sesión de A/B del kit como comprada (una sola vez: borra el id al usarlo). */
export function trackAbPurchase(): void {
  try {
    const sid = localStorage.getItem(AB_CHECKOUT_SESSION_KEY);
    if (!sid) return;
    localStorage.removeItem(AB_CHECKOUT_SESSION_KEY);
    fetch(`${SUPABASE_URL}/rest/v1/rpc/ab_track_purchase`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ p_id: sid }),
      keepalive: true,
    }).catch(() => { /* no crítico */ });
  } catch { /* no crítico */ }
}

/** Pone/quita meta robots noindex mientras la página está montada (páginas privadas del embudo). */
export function addNoindex(): () => void {
  const robots = document.createElement("meta");
  robots.name = "robots";
  robots.content = "noindex, nofollow";
  document.head.appendChild(robots);
  return () => robots.remove();
}
