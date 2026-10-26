import { useEffect, useRef, type ReactNode } from "react";
import { DecisionCard } from "@/components/piscinas/PiscinasShared";
import { Up1Layout } from "@/components/piscinas/Up1Layout";
import { useUpsellCharge } from "@/components/piscinas/useUpsellCharge";
import { PISCINAS_UP1_PAYMENT_LINK, PISCINAS_UP1_PRICE, PISCINAS_UP1_SLUG, piscinasCheckoutUrl } from "@/lib/piscinasConfig";
import { AB_UP1_EXPERIMENT, FRONT_SESSION_KEY, UP1_FLAG_KEY, addNoindex, registerAbSession, trackAbClick, writeSession } from "@/lib/piscinasFunnel";

// Upsell 1 — /piscinas-up1 — Creación de campaña publicitaria, US$100 pago único. Formato del método (06e-funnel-interrogatorio.md): una sola decisión por página.
// Copy en Info/copy-landings.md (página 2). Llega desde el pago del kit: Stripe redirige a
// /piscinas-up1?session_id={CHECKOUT_SESSION_ID}. Ese session_id se guarda en sessionStorage
// ("piscinas_front_session") para que la thank-you pida la descarga del kit.
// Pago del upsell → Stripe redirige a /piscinas-up2?from=up1. «No, gracias» → /piscinas-up2 (sin ?from=up1; decisión de Daniel: todos pasan al upsell 2).
// Página privada: noindex.

const PAGE_TITLE = "Creación de Campaña Publicitaria | Kit Llena tu Calendario de Piscinas";
const PRICE_LABEL = `$${PISCINAS_UP1_PRICE}`;
const YES_LABEL = "¡SÍ! Quiero que armen mi campaña y empezar a recibir estimados";
const NO_LABEL = "No, gracias. Prefiero seguir solo con mi kit y esperar a que me escriban";
const TRUST = [
  { icon: "i-lock", label: "Pago seguro" },
  { icon: "i-key", label: "Todo a tu nombre" },
  { icon: "i-clock", label: "Listo en máximo 7 días o no pagas" },
];

const PiscinasUp1 = () => {
  const abSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    document.title = PAGE_TITLE;
    return addNoindex();
  }, []);

  // Guarda el session_id de Stripe de la compra del kit para la thank-you.
  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    if (sessionId) writeSession(FRONT_SESSION_KEY, sessionId);
  }, []);

  useEffect(() => {
    abSessionIdRef.current = registerAbSession(AB_UP1_EXPERIMENT, String(PISCINAS_UP1_PRICE));
  }, []);

  // Con el link vacío el botón solo registra el clic y no navega.
  const paymentLink: string = PISCINAS_UP1_PAYMENT_LINK;
  const checkoutHref = paymentLink ? piscinasCheckoutUrl(paymentLink, undefined, PISCINAS_UP1_SLUG) : "#";

  // Cobro en un clic con la tarjeta del kit (piscinas-upsell-charge); respaldo: el Payment Link de arriba.
  const { charge, cardProps } = useUpsellCharge({ offer: "up1", fallbackHref: paymentLink ? checkoutHref : "", flagKey: UP1_FLAG_KEY, nextUrl: "/piscinas-up2?from=up1", previewNote: import.meta.env.DEV });

  const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    const opensElsewhere = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;
    if (!opensElsewhere) e.preventDefault();
    if (!opensElsewhere && e.currentTarget.getAttribute("aria-disabled") === "true") return;
    trackAbClick(abSessionIdRef.current);
    if (opensElsewhere) return;
    if (await charge()) return;
    if (!paymentLink) return;
    // Pequeña espera para que salga el registro del clic antes de ir a Stripe.
    setTimeout(() => { window.location.href = checkoutHref; }, 200);
  };

  const decision = (id: string, uniqueNote: boolean, top?: ReactNode) => (
    <DecisionCard
      id={id}
      top={top}
      name="Sistema Calendario Lleno Para Negocios de Limpieza de Piscinas"
      price={PRICE_LABEL}
      priceNote="pago único"
      {...cardProps(YES_LABEL)}
      yesHref={checkoutHref}
      onYes={handleClick}
      noLabel={NO_LABEL}
      noHref="/piscinas-up2"
      trust={TRUST}
      uniqueNote={uniqueNote}
    />
  );

  return <Up1Layout decision={decision} />;
};

export default PiscinasUp1;
