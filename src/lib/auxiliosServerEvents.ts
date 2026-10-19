import { getFbc, getFbp } from "@/lib/checkoutAttribution";

// Reenvío de ViewContent / InitiateCheckout de /auxilios-lp a la API de Conversiones (edge function
// auxilios-track-event). El navegador manda el mismo evento con el mismo `eventID`: Meta deduplica y,
// si el pixel se pierde (bloqueadores, iOS, navegador interno), queda la señal del servidor.
// Nunca lanza ni bloquea: la landing y el pago no dependen de esto.

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auxilios-track-event`;

export type AuxiliosServerEvent = "ViewContent" | "InitiateCheckout";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * `waitForFbpMs`: la cookie `_fbp` la crea el pixel después de cargar; en la primera visita aún no existe
 * al disparar ViewContent, así que se espera un poco para que el servidor pueda emparejar mejor.
 */
export async function sendAuxiliosServerEvent(opts: {
  event: AuxiliosServerEvent;
  eventId: string;
  abVersion: "A" | "B";
  waitForFbpMs?: number;
}): Promise<void> {
  try {
    for (let waited = 0; !getFbp() && waited < (opts.waitForFbpMs ?? 0); waited += 100) await sleep(100);
    await fetch(ENDPOINT, {
      method: "POST",
      // text/plain evita el preflight CORS (no se pierde si el clic navega a Stripe); la función lee el JSON igual.
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify({
        event: opts.event,
        event_id: opts.eventId,
        source_url: window.location.href,
        ab_version: opts.abVersion,
        fbp: getFbp(),
        fbc: getFbc(),
      }),
      keepalive: true,
    });
  } catch {
    /* no crítico */
  }
}
