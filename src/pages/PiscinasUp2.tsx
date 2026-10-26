import { useEffect, useRef, useState, type ReactNode } from "react";
import { DecisionCard } from "@/components/piscinas/PiscinasShared";
import { Up2Layout, Up2PriceSteps } from "@/components/piscinas/Up2Layout";
import { useUpsellCharge } from "@/components/piscinas/useUpsellCharge";
import { PISCINAS_UP2_PAYMENT_LINK, PISCINAS_UP2_PRICE_MONTHLY, PISCINAS_UP2_SLUG, piscinasCheckoutUrl } from "@/lib/piscinasConfig";
import { trackUpsellPageView, trackUpsellPurchase } from "@/lib/piscinasPixel";
import { AB_UP2_EXPERIMENT, UP1_FLAG_KEY, UP2_FLAG_KEY, addNoindex, readSession, registerAbSession, trackAbClick, writeSession } from "@/lib/piscinasFunnel";

// Upsell 2 — /piscinas-up2 — Gestión completa de anuncios, US$1,000/mes (suscripción). Formato del método
// (06e-funnel-interrogatorio.md): una sola decisión por página. Copy en Info/copy-landings.md (página 3).
// Por ahora se muestra siempre, aunque no haya comprado el upsell 1 (decisión de Daniel, mientras se define la lógica de sesiones/ventas;
// antes solo abría con ?from=up1 o la bandera piscinas_up1=bought y si no redirigía a /piscinas-ty).
// Pago de la suscripción → Stripe redirige a /piscinas-ty?up=2. «No, gracias» → /piscinas-ty. Página privada: noindex.

const PAGE_TITLE = "Calendario Lleno En Automático | Kit Llena tu Calendario de Piscinas";
const PRICE_LABEL = `$${PISCINAS_UP2_PRICE_MONTHLY.toLocaleString("en-US")}`;
const YES_LABEL = `¡SÍ! Quiero que gestionen mis anuncios por ${PRICE_LABEL}/mes`;
const NO_LABEL = "No, gracias. Prefiero gestionarlo yo mismo";
const TRUST = [
  { icon: "i-lock", label: "Pago seguro" },
  { icon: "i-clock", label: "Cobro mensual" },
  { icon: "i-undo", label: "Garantía de 30 días" },
];

/**
 * ¿Llegó comprando el upsell 1? Sin cambiar la URL de esta página: el cobro en un clic del upsell 1 guarda piscinas_up1=bought en la
 * sesión del navegador, y el respaldo (Payment Link) vuelve con ?from=up1. Sin ninguna de las dos señales = no compró (o abrió esta
 * página en otra pestaña/dispositivo, donde no hay forma de saberlo desde el navegador).
 */
function cameFromUp1(): boolean {
  if (new URLSearchParams(window.location.search).get("from") === "up1") {
    writeSession(UP1_FLAG_KEY, "bought");
    return true;
  }
  return readSession(UP1_FLAG_KEY) === "bought";
}

const PiscinasUp2 = () => {
  const abSessionIdRef = useRef<string | null>(null);
  const [boughtUp1] = useState(cameFromUp1);

  useEffect(() => {
    document.title = PAGE_TITLE;
    return addNoindex();
  }, []);

  // Pixel: PageView y, si llega de pagar el upsell 1 (?from=up1), el Purchase de $100 (una sola vez).
  useEffect(() => {
    trackUpsellPageView();
    if (new URLSearchParams(window.location.search).get("from") === "up1") trackUpsellPurchase("up1");
  }, []);

  useEffect(() => {
    abSessionIdRef.current = registerAbSession(AB_UP2_EXPERIMENT, String(PISCINAS_UP2_PRICE_MONTHLY));
  }, []);

  // Con el link vacío el botón solo registra el clic y no navega.
  const paymentLink: string = PISCINAS_UP2_PAYMENT_LINK;
  const checkoutHref = paymentLink ? piscinasCheckoutUrl(paymentLink, undefined, PISCINAS_UP2_SLUG) : "#";

  // Cobro en un clic con la tarjeta del kit (piscinas-upsell-charge); respaldo: el Payment Link de arriba.
  const { charge, cardProps } = useUpsellCharge({ offer: "up2", fallbackHref: paymentLink ? checkoutHref : "", flagKey: UP2_FLAG_KEY, nextUrl: "/piscinas-ty?up=2", previewNote: import.meta.env.DEV });

  const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    const opensElsewhere = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;
    if (!opensElsewhere) e.preventDefault();
    if (!opensElsewhere && e.currentTarget.getAttribute("aria-disabled") === "true") return;
    trackAbClick(abSessionIdRef.current);
    if (opensElsewhere) return;
    if (await charge()) return;
    if (!paymentLink) return;
    setTimeout(() => { window.location.href = checkoutHref; }, 200);
  };

  const decision = (id: string, uniqueNote: boolean, top?: ReactNode) => (
    <DecisionCard
      id={id}
      top={top}
      name="Servicio Profesional Completo “Calendario Lleno En Automático”"
      aside={<Up2PriceSteps />}
      price={PRICE_LABEL}
      priceNote="/mes"
      {...cardProps(YES_LABEL)}
      yesHref={checkoutHref}
      onYes={handleClick}
      noLabel={NO_LABEL}
      noHref="/piscinas-ty"
      trust={TRUST}
      uniqueNote={uniqueNote}
    />
  );

  return <Up2Layout decision={decision} boughtUp1={boughtUp1} />;
};

export default PiscinasUp2;
