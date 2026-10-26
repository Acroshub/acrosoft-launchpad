import { useEffect, useRef, useState } from "react";
import { PISCINAS_SUPPORT_EMAIL } from "@/lib/piscinasConfig";
import { writeSession } from "@/lib/piscinasFunnel";
import { chargeUpsell, frontSessionId, type UpsellOffer } from "@/lib/piscinasUpsell";

const PROCESSING_LABEL = "Procesando tu pago…";
const DONE_LABEL = "¡Listo! Un momento…";

type Phase = "idle" | "processing" | "done" | "requires_action" | "failed";

/**
 * Lógica del botón «Sí» de /piscinas-up1 y /piscinas-up2 con cobro en un clic. Con session_id del kit guardado:
 * cobra con la misma tarjeta (piscinas-upsell-charge); éxito → marca la bandera y va al siguiente paso;
 * requires_action / failed → mensaje breve + botón al Payment Link normal del upsell (o «Escríbenos» si no hay link).
 * Sin session_id (o con el link y sin función disponible) todo funciona como antes: Payment Link.
 */
export function useUpsellCharge(opts: {
  offer: UpsellOffer;
  /** Payment Link normal ya con client_reference_id; "" si todavía no está configurado. */
  fallbackHref: string;
  flagKey: string;
  nextUrl: string;
  /** Solo para revisar el diseño en desarrollo: muestra la línea del método de pago aunque no haya compra del kit guardada (si no, el «Sí» va al Payment Link y la frase no sería cierta). */
  previewNote?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const busy = useRef(false); // barrera síncrona contra doble clic (el estado de React llega un render después)
  // Se lee después de montar: /piscinas-up1 guarda el session_id de la URL en un efecto.
  const [hasSession, setHasSession] = useState(false);
  useEffect(() => setHasSession(!!frontSessionId()), []);

  /** true = el clic quedó atendido por el cobro en un clic; false = no hay session_id, que siga el flujo con Payment Link. */
  const charge = async (): Promise<boolean> => {
    const sessionId = frontSessionId();
    if (!sessionId) return false;
    if (busy.current) return true;
    busy.current = true;
    setPhase("processing");
    const result = await chargeUpsell(opts.offer, sessionId);
    if (result === "succeeded") {
      writeSession(opts.flagKey, "bought");
      setPhase("done");
      window.location.href = opts.nextUrl;
      return true; // busy queda activo: ya se está navegando
    }
    setPhase(result);
    busy.current = false;
    return true;
  };

  const processing = phase === "processing" || phase === "done";
  const showFallback = phase === "requires_action" || phase === "failed";

  const notice = showFallback ? (
    <>
      <p>
        {phase === "requires_action"
          ? "Tu banco pidió confirmar este pago, así que no pudimos cobrarlo con un clic."
          : "No pudimos cobrar con tu tarjeta guardada."}
        {opts.fallbackHref || PISCINAS_SUPPORT_EMAIL ? " Puedes completar tu compra aquí, de forma segura:" : " Escríbenos y lo resolvemos."}
      </p>
      {opts.fallbackHref ? (
        <a href={opts.fallbackHref} className="btn btn-primary" data-fallback="link">Completar mi compra</a>
      ) : PISCINAS_SUPPORT_EMAIL ? (
        <a href={`mailto:${PISCINAS_SUPPORT_EMAIL}`} className="btn btn-primary" data-fallback="support">Escríbenos</a>
      ) : null}
    </>
  ) : null;

  return {
    charge,
    /** Props para <DecisionCard>: etiqueta del botón, estado, línea de confianza y aviso. */
    cardProps: (yesLabel: string) => ({
      yesLabel: processing ? (phase === "done" ? DONE_LABEL : PROCESSING_LABEL) : yesLabel,
      yesDisabled: processing || showFallback,
      yesNote: (hasSession || opts.previewNote) && !showFallback ? (
        <>
          Se usará el mismo método de pago que acabas de usar. Si quieres usar un nuevo método de pago{" "}
          <a
            href={opts.fallbackHref || "#"}
            data-fallback="new-card"
            onClick={(e) => { if (!opts.fallbackHref || processing) e.preventDefault(); }}
          >haz clic aquí</a>.
        </>
      ) : undefined,
      notice,
    }),
  };
}
