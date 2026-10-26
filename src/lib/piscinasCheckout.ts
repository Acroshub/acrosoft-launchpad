// Compra del kit de Piscinas con cobro en un clic de los upsells. El checkout lo crea el servidor
// (edge function piscinas-create-checkout): guarda la tarjeta para cobrar /piscinas-up1 y /piscinas-up2 con un clic.
// Las 4 landings llaman a startKitCheckout(); si la función falla o tarda más de ~6 s, se cae al Payment Link
// normal (compra sin cobro en un clic) y el fallo se registra en consola. Nunca deja a la persona sin poder pagar.

import { saveCheckoutAttribution } from "@/lib/checkoutAttribution";
import { PISCINAS_PAYMENT_LINK, piscinasCheckoutUrl } from "@/lib/piscinasConfig";
import { uuid } from "@/lib/uuid";

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/piscinas-create-checkout`;

export const CREATE_CHECKOUT_TIMEOUT_MS = 6000;
/** Espera mínima para que salgan el pixel y ab_track antes de abandonar la página (igual que antes). */
const MIN_WAIT_MS = 250;

type Deps = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  navigate?: (url: string) => void;
};

/** Pide la URL de Stripe Checkout al servidor. Devuelve null (y registra el motivo) si falla, tarda o responde algo raro. */
export async function createKitCheckoutUrl(clientReferenceId: string, deps: Deps = {}): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deps.timeoutMs ?? CREATE_CHECKOUT_TIMEOUT_MS);
  try {
    const res = await (deps.fetchImpl ?? fetch)(ENDPOINT, {
      method: "POST",
      // text/plain evita el preflight CORS; la función lee el JSON igual.
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify({ client_reference_id: clientReferenceId }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`http ${res.status}`);
    const url = (await res.json())?.url;
    if (typeof url !== "string" || new URL(url).protocol !== "https:" || !new URL(url).hostname.endsWith("stripe.com")) {
      throw new Error("respuesta sin url de Stripe");
    }
    return url;
  } catch (err) {
    console.warn("[piscinas] no se pudo crear el checkout en un clic; se usa el Payment Link normal:", err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Guarda la atribución de Meta y resuelve a dónde ir: el checkout del servidor o, si falla, el Payment Link.
 * null = no hay a dónde ir (sin servidor y sin Payment Link configurado).
 */
export async function resolveKitCheckoutUrl(deps: Deps = {}): Promise<string | null> {
  let attributionId: string | undefined;
  try {
    attributionId = uuid();
  } catch {
    attributionId = undefined;
  }
  const clientReferenceId = attributionId ? `piscinas_${attributionId}` : "piscinas";
  const [url] = await Promise.all([
    createKitCheckoutUrl(clientReferenceId, deps),
    (async () => {
      if (!attributionId) return;
      await Promise.all([saveCheckoutAttribution(attributionId), new Promise((resolve) => setTimeout(resolve, MIN_WAIT_MS))]);
    })(),
  ]);
  if (url) return url;
  return PISCINAS_PAYMENT_LINK ? piscinasCheckoutUrl(PISCINAS_PAYMENT_LINK, attributionId) : null;
}

/** Handler común de los botones de compra del kit: guarda atribución, crea el checkout y redirige. */
export async function startKitCheckout(deps: Deps = {}): Promise<void> {
  const url = await resolveKitCheckoutUrl(deps);
  if (!url) return;
  (deps.navigate ?? ((u: string) => { window.location.href = u; }))(url);
}
