// Cobro en un clic de los upsells de Piscinas: llama a la edge function piscinas-upsell-charge con el session_id
// del kit (guardado en sessionStorage por /piscinas-up1). La función cobra con la misma tarjeta, es idempotente
// (reintentar nunca cobra dos veces) y responde: succeeded | already_paid | requires_action | failed.

import { FRONT_SESSION_KEY, readSession } from "@/lib/piscinasFunnel";

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/piscinas-upsell-charge`;
export const UPSELL_CHARGE_TIMEOUT_MS = 30000;

export type UpsellOffer = "up1" | "up2";
export type UpsellResult = "succeeded" | "requires_action" | "failed";

/** session_id del kit si hay uno guardado (sin él no hay tarjeta que reutilizar: se usa el Payment Link). */
export const frontSessionId = (): string | null => readSession(FRONT_SESSION_KEY);

type Deps = { fetchImpl?: typeof fetch; timeoutMs?: number; retryDelayMs?: number };

async function callOnce(offer: UpsellOffer, sessionId: string, deps: Deps): Promise<UpsellResult | "network"> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deps.timeoutMs ?? UPSELL_CHARGE_TIMEOUT_MS);
  try {
    const res = await (deps.fetchImpl ?? fetch)(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify({ front_session_id: sessionId, offer }),
      signal: controller.signal,
    });
    // Un error HTTP significa que la función no llegó a cobrar (validación, origen, caída): plan de reserva.
    if (!res.ok) return "failed";
    const status = (await res.json())?.status;
    if (status === "succeeded" || status === "already_paid") return "succeeded";
    if (status === "requires_action") return "requires_action";
    return "failed";
  } catch {
    return "network"; // sin respuesta: el cobro pudo haberse hecho o no
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Cobra el upsell. Si no hay respuesta (red/timeout) se reintenta UNA vez: es seguro porque la función es idempotente
 * (misma Idempotency-Key + consulta de cobros previos), así que un cobro hecho cuya respuesta se perdió vuelve como already_paid.
 */
export async function chargeUpsell(offer: UpsellOffer, sessionId: string, deps: Deps = {}): Promise<UpsellResult> {
  let r = await callOnce(offer, sessionId, deps);
  if (r === "network") {
    await new Promise((resolve) => setTimeout(resolve, deps.retryDelayMs ?? 1500));
    r = await callOnce(offer, sessionId, deps);
  }
  if (r === "network") {
    console.warn("[piscinas] el cobro del upsell no tuvo respuesta; se muestra el plan de reserva");
    return "failed";
  }
  return r;
}
