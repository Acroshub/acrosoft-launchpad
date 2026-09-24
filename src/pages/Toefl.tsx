import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { saveCheckoutAttribution } from "@/lib/checkoutAttribution";
import { initMetaPixel, trackMetaEvent } from "@/lib/metaPixel";
import { uuid } from "@/lib/uuid";
import { TOEFL_PIXEL_ID, TOEFL_STRIPE_LINKS, toeflCheckoutUrl, toeflEventParams } from "@/lib/toeflConfig";

const PAGE_TITLE = "Guía en Español para Aprobar el TOEFL con Nivel B2 | Ebook + Estrategia";

const OFFER_DURATION_MS = 30 * 60 * 1000;
const OFFER_END_STORAGE_KEY = "toefl_offer_end";

// ─── A/B test de precio ($19 vs $25) ─────────────────────────────────────────
// Se sortea 50/50 en la primera visita y se recuerda en localStorage: el mismo
// dispositivo siempre ve el mismo precio. Cada variante viene de su propio
// "precio de lista" descontado un 60% (19 = 48 -60%, 25 = 63 -60%). Impresiones
// y "pago iniciado" se guardan en ab_sessions, la misma tabla que ya usa
// /frances — insert-only para anon (ver ab_track).
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const AB_EXPERIMENT_KEY = "toefl_price";
const PRICE_VARIANT_STORAGE_KEY = "toefl_price_variant";

const PRICE_VARIANTS = {
  "19": { price: 19, originalPrice: 48 },
  "25": { price: 25, originalPrice: 63 },
} as const;
type PriceVariant = keyof typeof PRICE_VARIANTS;

function getPriceVariant(): PriceVariant {
  const pickRandom = (): PriceVariant => (Math.random() < 0.5 ? "19" : "25");
  try {
    const stored = localStorage.getItem(PRICE_VARIANT_STORAGE_KEY);
    if (stored === "19" || stored === "25") return stored;
    const variant = pickRandom();
    localStorage.setItem(PRICE_VARIANT_STORAGE_KEY, variant);
    return variant;
  } catch {
    return pickRandom();
  }
}

/**
 * Momento en que vence la oferta para este navegador. Se fija en la primera
 * visita y se recuerda en localStorage: un refresh continúa el contador donde
 * iba, y una vez vencido queda en 00:00 aunque el usuario vuelva a cargar.
 */
function getOfferEnd(): number {
  try {
    const stored = Number(localStorage.getItem(OFFER_END_STORAGE_KEY));
    if (Number.isFinite(stored) && stored > 0) return stored;
    const end = Date.now() + OFFER_DURATION_MS;
    localStorage.setItem(OFFER_END_STORAGE_KEY, String(end));
    return end;
  } catch {
    return Date.now() + OFFER_DURATION_MS;
  }
}

/** Mockup del pack (guía + celular + los 4 bonos): va arriba del precio en cada CTA de sección. */
function BundleMockup() {
  return (
    <img
      src="/toefl/imagenes/mockup-bundle-completo.webp"
      alt="Mockup del pack completo: guía TOEFL + celular + los 4 bonos"
      className="pack-mockup-img"
      width={1200}
      height={676}
      loading="lazy"
      decoding="async"
      style={{ height: "auto", marginBottom: "20px" }}
    />
  );
}

function InstantAccessNote() {
  return (
    <p className="instant-access">
      <svg className="icon" aria-hidden="true"><use href="#i-mail" /></svg>
      Acceso inmediato por email
    </p>
  );
}

function PaymentIcons({ dark = false }: { dark?: boolean }) {
  return (
    <div className={`pc-payment${dark ? " on-dark" : ""}`}>
      <span className="pc-payment-label">Pago 100% seguro procesado por Stripe</span>
      <div className="pc-payment-icons">
        <svg className="pay-icon" aria-hidden="true"><use href="#pay-visa" /></svg>
        <svg className="pay-icon" aria-hidden="true"><use href="#pay-mastercard" /></svg>
        <svg className="pay-icon" aria-hidden="true"><use href="#pay-amex" /></svg>
        <svg className="pay-icon" aria-hidden="true"><use href="#pay-applepay" /></svg>
        <svg className="pay-icon" aria-hidden="true"><use href="#pay-googlepay" /></svg>
      </div>
    </div>
  );
}

/**
 * Precio + descuento + cronómetro + barra de tiempo restante — idéntico en la
 * tarjeta de producto y en el CTA de cada sección (mismo componente, para que
 * no se desalineen entre sí). `dark` lo adapta al fondo navy del CTA final.
 */
function PriceOffer({ price, originalPrice, discountPct, dark = false }: { price: number; originalPrice: number; discountPct: number; dark?: boolean }) {
  return (
    <div className={`pc-discount${dark ? " on-dark" : ""}`}>
      <p className="pc-edition-label">Edición Actualizada 2026</p>
      <div className="pc-price">
        <span className="pc-old-price">${originalPrice} USD</span>
        <span className="amount">${price} USD</span>
      </div>
      <div className="pc-price-meta">
        <span className="unit">pago único</span>
        <span className="pc-discount-chip">-{discountPct}% de Descuento</span>
      </div>

      <div className="pc-timer">
        <svg className="icon" aria-hidden="true"><use href="#i-clock" /></svg>
        <span>Te quedan <strong className="js-countdown">30:00</strong> para asegurar este precio</span>
      </div>

      <div className="pc-progress">
        <div className="pc-progress-bar"><div className="pc-progress-fill js-countdown-bar" /></div>
      </div>
    </div>
  );
}

const Toefl = () => {
  // Variante de precio asignada una sola vez por dispositivo (ver getPriceVariant).
  const [priceVariant] = useState<PriceVariant>(() => getPriceVariant());
  const { price, originalPrice } = PRICE_VARIANTS[priceVariant];
  const discountPct = Math.round((1 - price / originalPrice) * 100);
  const abSessionIdRef = useRef<string | null>(null);

  // Registra la impresión del test de precio en ab_sessions (insert-only para
  // anon). El id se genera acá, no lo devuelve el insert, así no hace falta
  // permiso de SELECT sobre la tabla para leerlo de vuelta.
  useEffect(() => {
    const sid = uuid();
    abSessionIdRef.current = sid;
    fetch(`${SUPABASE_URL}/rest/v1/ab_sessions`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ id: sid, variants: { [AB_EXPERIMENT_KEY]: priceVariant } }),
    }).catch(() => { /* no crítico */ });
  }, [priceVariant]);

  /**
   * El checkout lo hostea Stripe (Payment Link), así que el pixel no puede
   * estar ahí: "InitiateCheckout" se dispara al click, antes de salir hacia
   * Stripe (igual que en /frances). preventDefault + navegación manual con un
   * pequeño delay le da tiempo al pixel y al ab_track a mandarse antes de que
   * el navegador abandone la página.
   *
   * Mientras TOEFL_STRIPE_LINKS esté vacío (sin link de pago) el click solo
   * queda registrado como intención de compra en ab_sessions, sin navegar.
   * El pixel tampoco se toca hasta que TOEFL_PIXEL_ID esté definido.
   */
  // El href es el link de pago real (no "#"): Ctrl/Cmd/Shift-clic y "abrir en pestaña nueva"
  // funcionan solos. Un clic normal se intercepta para registrar el evento y guardar la
  // atribución antes de ir a Stripe.
  const paymentLink = TOEFL_STRIPE_LINKS[priceVariant];
  const checkoutHref = paymentLink ? toeflCheckoutUrl(paymentLink) : "#";

  const handleCheckoutClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    const opensElsewhere = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;
    if (!opensElsewhere) e.preventDefault();

    // Nada de tracking puede impedir que la persona llegue a pagar.
    try {
      if (TOEFL_PIXEL_ID) trackMetaEvent("InitiateCheckout", toeflEventParams(price), undefined, TOEFL_PIXEL_ID);
      const sid = abSessionIdRef.current;
      if (sid) {
        fetch(`${SUPABASE_URL}/rest/v1/rpc/ab_track`, {
          method: "POST",
          headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ p_id: sid, p_converted: true }),
        }).catch(() => { /* no crítico */ });
      }
    } catch { /* no crítico */ }

    if (opensElsewhere || !paymentLink) return;

    // Cookies de Meta del comprador → checkout_attribution; su id viaja a Stripe en el
    // client_reference_id y el webhook lo usa en la Conversions API. Se espera como máximo
    // 800 ms y, en paralelo, los 250 ms que necesitan el pixel y el ab_track para salir antes
    // de abandonar la página. Si algo falla, se va a Stripe igual (solo sin el id).
    let attributionId: string | undefined;
    try {
      attributionId = uuid();
      await Promise.all([saveCheckoutAttribution(attributionId), new Promise((resolve) => setTimeout(resolve, 250))]);
    } catch {
      attributionId = undefined;
    }
    window.location.href = toeflCheckoutUrl(paymentLink, attributionId);
  };

  useEffect(() => {
    document.title = PAGE_TITLE;
  }, []);

  useEffect(() => {
    if (!TOEFL_PIXEL_ID) return;
    initMetaPixel(TOEFL_PIXEL_ID);
    trackMetaEvent("PageView", undefined, undefined, TOEFL_PIXEL_ID);
    trackMetaEvent("ViewContent", toeflEventParams(price), undefined, TOEFL_PIXEL_ID);
  }, [price]);

  // Contador de oferta: 30 min desde la primera visita (ver getOfferEnd).
  // useLayoutEffect y no useEffect: corre antes del primer pintado, así al
  // refrescar nunca se ve el "30:00" del markup por un instante.
  useLayoutEffect(() => {
    const textEls = document.querySelectorAll<HTMLElement>(".js-countdown");
    const barEls = document.querySelectorAll<HTMLElement>(".js-countdown-bar");
    if (!textEls.length && !barEls.length) return;
    const end = getOfferEnd();

    const render = (): boolean => {
      const diff = end - Date.now();
      let text = "00:00";
      if (diff > 0) {
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        text = `${m < 10 ? "0" + m : m}:${s < 10 ? "0" + s : s}`;
      }
      textEls.forEach((el) => { el.textContent = text; });
      const pct = Math.max(0, Math.min(100, (diff / OFFER_DURATION_MS) * 100));
      barEls.forEach((el) => { el.style.width = `${pct}%`; });
      return diff > 0;
    };

    if (!render()) return;
    const timer = setInterval(() => { if (!render()) clearInterval(timer); }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Mostrar/ocultar sticky CTA según scroll
  useEffect(() => {
    const trigger = document.getElementById("sticky-trigger-toefl");
    const bar = document.querySelector(".toefl-page .sticky-cta");
    if (!trigger || !bar || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.boundingClientRect.top < 0) {
          bar.classList.add("is-visible");
        } else {
          bar.classList.remove("is-visible");
        }
      });
    }, { threshold: 0 });
    observer.observe(trigger);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;500;700;900&display=swap" rel="stylesheet" />
      {TOEFL_PIXEL_ID && (
        <noscript>
          <img height="1" width="1" style={{ display: "none" }} src={`https://www.facebook.com/tr?id=${TOEFL_PIXEL_ID}&ev=PageView&noscript=1`} alt="" />
        </noscript>
      )}

      <style>{`
/* ============ DESIGN TOKENS ============ */
:root{
  --navy:#1B2A4A;
  --navy-dark:#12203A;
  --slate:#4A5D7A;
  --gold:#C9932E;
  --gold-deep:#8C6A1E;
  --cream:#FAF6EF;
  --cream-alt:#F1ECDF;
  --ink:#22262E;
  --ink-soft:#5B6270;
  --line:#DED6BC;
  --ok:#3F6B4A;
  --cta:#C1403A;
  --cta-dark:#9C312C;
  --white:#FFFFFF;
  --sans:'Lato', Arial, Helvetica, sans-serif;
  --radius:14px;
  --shadow-soft:0 10px 30px -12px rgba(27,42,74,.25);
  --shadow-lift:0 18px 40px -16px rgba(27,42,74,.35);
  --maxw:1120px;
}

.toefl-page *,.toefl-page *::before,.toefl-page *::after{box-sizing:border-box;}
.toefl-page{scroll-behavior:smooth;}
@media (prefers-reduced-motion: reduce){
  .toefl-page{scroll-behavior:auto;}
  .toefl-page *,.toefl-page *::before,.toefl-page *::after{animation-duration:.01ms !important;animation-iteration-count:1 !important;transition-duration:.01ms !important;}
}
.toefl-page{
  margin:0;background:var(--cream);color:var(--ink);
  font-family:var(--sans);font-size:16px;line-height:1.65;
  -webkit-font-smoothing:antialiased;overflow-x:hidden;
}
.toefl-page a{color:inherit;}
.toefl-page h1,.toefl-page h2,.toefl-page h3,.toefl-page h4{font-family:var(--sans);color:var(--navy);margin:0;line-height:1.15;}
.toefl-page p{margin:0;}
.toefl-page ul{margin:0;padding:0;list-style:none;}
.toefl-page .container{max-width:var(--maxw);margin:0 auto;padding:0 20px;}
.toefl-page section{padding:clamp(48px,7vw,96px) 0;}

.toefl-page ::selection{background:var(--gold);color:var(--navy-dark);}
.toefl-page :focus-visible{outline:3px solid var(--gold-deep);outline-offset:3px;}

/* ============ ICON SPRITE ============ */
.toefl-page .icon{width:22px;height:22px;flex-shrink:0;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;}

/* ============ BUTTONS ============ */
.toefl-page .btn{
  display:inline-flex;align-items:center;justify-content:center;gap:10px;
  font-family:var(--sans);font-weight:900;font-size:15px;letter-spacing:.01em;
  padding:16px 28px;border-radius:8px;text-decoration:none;cursor:pointer;
  border:2px solid transparent;transition:transform 180ms ease, box-shadow 180ms ease, background-color 180ms ease;
  min-height:44px;text-align:center;
}
@media(max-width:480px){
  .toefl-page .btn{font-size:13.5px;padding:15px 20px;}
}
.toefl-page .btn-primary{
  background:var(--cta);color:var(--white);box-shadow:var(--shadow-lift);
}
.toefl-page .btn-primary:hover{background:var(--cta-dark);transform:translateY(-2px);}
.toefl-page .btn-primary:active{transform:translateY(0);}
.toefl-page .btn-block{width:100%;}
.toefl-page .btn-arrow{width:14px;height:14px;fill:currentColor;stroke:none;flex-shrink:0;transition:transform 180ms ease;}
.toefl-page .btn-primary:hover .btn-arrow{transform:translateX(3px);}
.toefl-page .instant-access{
  display:flex;align-items:center;justify-content:center;gap:7px;margin-top:12px;
  font-size:13.5px;font-weight:700;color:var(--ink-soft);
}
.toefl-page .instant-access .icon{width:16px;height:16px;color:var(--gold-deep);}
.toefl-page .final-cta .instant-access{color:#C7D0E0;}
.toefl-page .final-cta .instant-access .icon{color:var(--gold);}

.toefl-page .pc-payment{margin-top:16px;text-align:center;}
.toefl-page .pc-payment-label{display:block;font-size:12px;color:var(--ink-soft);margin-bottom:8px;}
.toefl-page .pc-payment-icons{display:flex;justify-content:center;align-items:center;gap:14px;flex-wrap:wrap;}
.toefl-page .pay-icon{width:30px;height:30px;flex-shrink:0;fill:currentColor;stroke:none;color:var(--ink-soft);opacity:.85;}
.toefl-page .pc-payment.on-dark .pc-payment-label{color:#C7D0E0;}
.toefl-page .pc-payment.on-dark .pay-icon{color:#D7DEEB;opacity:1;}

/* ============ KICKER / EYEBROW ============ */
.toefl-page .kicker{
  display:inline-flex;align-items:center;gap:8px;
  font-family:var(--sans);font-weight:700;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;
  color:var(--gold-deep);background:var(--cream-alt);border:1px solid var(--line);
  padding:6px 14px;border-radius:999px;margin-bottom:18px;
}

/* ============ HERO ============ */
.toefl-page .hero{padding-top:clamp(44px,6vw,80px);padding-bottom:clamp(56px,8vw,100px);}
.toefl-page .hero-grid{display:grid;grid-template-columns:1fr;gap:44px;align-items:center;}
@media(min-width:960px){.toefl-page .hero-grid{grid-template-columns:1.05fr .95fr;gap:56px;}}
.toefl-page .hero h1{font-size:clamp(30px,4.6vw,46px);font-weight:900;letter-spacing:-.01em;}
.toefl-page .hero h1 .accent{color:var(--cta);}
.toefl-page .hero h1 .highlight-wavy{position:relative;display:inline-block;white-space:nowrap;padding-bottom:.14em;}
.toefl-page .hero h1 .highlight-wavy::after{
  content:"";position:absolute;left:-3%;right:-3%;bottom:-4px;height:15px;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 20'%3E%3Cfilter id='r'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.014 0.55' numOctaves='2' seed='6' result='n'/%3E%3CfeDisplacementMap in='SourceGraphic' in2='n' scale='6'/%3E%3C/filter%3E%3Cpath d='M4 11 Q100 5 196 11' fill='none' stroke='%23C1403A' stroke-width='7' stroke-linecap='round' filter='url(%23r)'/%3E%3C/svg%3E");
  background-repeat:no-repeat;background-size:100% 100%;
}
.toefl-page .hero .sub{margin-top:18px;font-size:16px;line-height:1.6;color:var(--slate);max-width:52ch;text-align:left;}

.toefl-page .hero-visual{position:relative;border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow-lift);}
.toefl-page .hero-photo{width:100%;aspect-ratio:16/9;object-fit:cover;display:block;}

/* ============ SECTION HEADINGS ============ */
.toefl-page .section-head{max-width:64ch;margin:0 auto 40px;text-align:center;}
.toefl-page .section-head.left{margin-left:0;text-align:left;}
.toefl-page .section-head h2{font-size:clamp(26px,3.6vw,36px);font-weight:700;}
.toefl-page .section-head p{margin-top:14px;font-size:17px;color:var(--slate);}

/* ============ ESTO ES PARA TI SI... ============ */
.toefl-page #para-ti{background:var(--navy);}
.toefl-page #para-ti .section-head h2{color:var(--white);}

/* ============ IDENTIFICATION LIST ============ */
.toefl-page .id-list{display:grid;grid-template-columns:1fr;gap:16px;margin-top:8px;}
@media(min-width:760px){.toefl-page .id-list{grid-template-columns:1fr 1fr;}}
.toefl-page .id-item{
  display:flex;gap:14px;align-items:flex-start;background:var(--white);border:1px solid var(--line);
  border-radius:var(--radius);padding:20px 22px;box-shadow:var(--shadow-soft);
}
.toefl-page .id-item .icon-wrap{
  flex-shrink:0;width:34px;height:34px;border-radius:50%;background:var(--cream-alt);
  display:flex;align-items:center;justify-content:center;
}
.toefl-page .id-item .icon{width:18px;height:18px;color:var(--gold-deep);}
.toefl-page .id-item p{font-size:16px;color:var(--ink);font-weight:500;min-width:0;}

/* ============ ACHIEVEMENTS + PRODUCT ============ */
.toefl-page .deliver{background:var(--cream-alt);}
.toefl-page .deliver-grid{display:grid;grid-template-columns:1fr;gap:44px;}
@media(min-width:960px){.toefl-page .deliver-grid{grid-template-columns:1.05fr .95fr;align-items:start;}}
.toefl-page .achieve-list{margin:28px 0 0;padding:0;list-style:none;counter-reset:achieve;display:flex;flex-direction:column;gap:16px;}
.toefl-page .achieve-item{display:flex;gap:14px;align-items:flex-start;}
/* Numeración automática (lista ordenada): agregar o quitar un punto renumera solo. */
.toefl-page .achieve-item .icon-wrap{
  flex-shrink:0;width:30px;height:30px;border-radius:8px;background:var(--navy);
  display:flex;align-items:center;justify-content:center;margin-top:2px;
}
.toefl-page .achieve-item .icon-wrap::before{
  counter-increment:achieve;content:counter(achieve);
  color:var(--gold);font-size:15px;font-weight:900;line-height:1;font-variant-numeric:tabular-nums;
}
.toefl-page .achieve-item p{font-size:16.5px;color:var(--ink);min-width:0;}
.toefl-page .achieve-item strong{color:var(--navy);}

.toefl-page .product-card{
  background:var(--white);border-radius:20px;box-shadow:var(--shadow-lift);
  border:1px solid var(--line);overflow:hidden;position:sticky;top:20px;
}
.toefl-page .product-card .pc-body{padding:30px 26px 30px;}
.toefl-page .pc-name{font-size:23px;font-weight:700;color:var(--navy);line-height:1.25;}
.toefl-page .pc-tag{margin-top:8px;font-size:14px;color:var(--gold-deep);font-weight:700;text-transform:uppercase;letter-spacing:.04em;}
.toefl-page .pc-includes{margin-top:20px;display:flex;flex-direction:column;gap:10px;}
.toefl-page .pc-includes li{display:flex;gap:10px;align-items:flex-start;font-size:14.5px;color:var(--ink-soft);min-width:0;}
.toefl-page .pc-includes .icon{width:15px;height:15px;color:var(--ok);margin-top:3px;}

.toefl-page .pc-discount{margin-top:24px;padding-top:22px;border-top:1px dashed var(--line);}
.toefl-page .pc-edition-label{
  font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;
  color:var(--gold-deep);margin-bottom:10px;
}
.toefl-page .pc-discount-chip{
  display:inline-block;background:var(--gold);color:var(--navy-dark);font-size:12.5px;font-weight:900;
  letter-spacing:.02em;padding:2px 9px;border-radius:5px;
}
.toefl-page .pc-price{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;}
.toefl-page .pc-price .pc-old-price{font-size:17px;font-weight:700;color:var(--ink-soft);text-decoration:line-through;margin-right:2px;}
.toefl-page .pc-price .amount{font-size:36px;font-weight:900;color:var(--navy);white-space:nowrap;}
.toefl-page .pc-price-meta{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:8px;}
.toefl-page .pc-price-meta .unit{font-size:14px;color:var(--ink-soft);}

/* Dentro de un CTA de sección o el CTA final, la caja es angosta y va centrada. */
.toefl-page .section-cta .pc-discount,.toefl-page .final-cta .pc-discount{text-align:center;}
.toefl-page .section-cta .pc-price,.toefl-page .final-cta .pc-price{justify-content:center;}
.toefl-page .section-cta .pc-price-meta,.toefl-page .final-cta .pc-price-meta{justify-content:center;}
.toefl-page .section-cta .pc-timer,.toefl-page .final-cta .pc-timer{justify-content:center;}

.toefl-page .pc-timer{
  display:flex;align-items:center;gap:10px;margin-top:16px;padding:12px 14px;border-radius:8px;
  background:#FBEAE8;border:1px solid #F0C4BE;color:var(--cta-dark);font-size:13.5px;font-weight:700;text-align:left;
}
.toefl-page .pc-timer .icon{width:18px;height:18px;color:var(--cta);flex-shrink:0;}
.toefl-page .pc-timer strong{font-variant-numeric:tabular-nums;font-size:15px;}

.toefl-page .pc-progress{margin-top:12px;}
.toefl-page .pc-progress-bar{width:100%;height:10px;border-radius:8px;background:var(--cream-alt);border:1px solid var(--line);overflow:hidden;}
.toefl-page .pc-progress-fill{
  width:100%;height:100%;border-radius:7px;background-color:var(--cta);
  background-image:repeating-linear-gradient(45deg, rgba(255,255,255,.28) 0 10px, transparent 10px 20px);
  background-size:28px 28px;animation:pc-stripes 1s linear infinite;
  transition:width 1s linear;
}
@media (prefers-reduced-motion: reduce){.toefl-page .pc-progress-fill{animation:none;}}
@keyframes pc-stripes{from{background-position:0 0;}to{background-position:28px 0;}}

.toefl-page .pc-discount.on-dark .pc-price .pc-old-price{color:#AEB9CE;}
.toefl-page .pc-discount.on-dark .pc-price .amount{color:var(--white);}
.toefl-page .pc-discount.on-dark .pc-price-meta .unit{color:#C7D0E0;}
.toefl-page .pc-discount.on-dark .pc-progress-bar{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.18);}

.toefl-page .pc-cta{margin-top:20px;}

/* ============ CTA REUTILIZABLE POR SECCIÓN ============ */
.toefl-page .section-cta{
  margin:40px auto 0;padding:30px 26px;border-radius:var(--radius);max-width:440px;text-align:center;
  background:var(--white);border:1px solid var(--line);box-shadow:var(--shadow-soft);
}
.toefl-page .section-cta .pc-discount{margin-top:0;padding-top:0;border-top:none;}
.toefl-page .section-cta .btn{width:100%;margin-top:20px;}

/* Mockup en la tarjeta de producto */
.toefl-page .pc-visual{padding:22px 22px 0;}
.toefl-page .pc-mockup-img{width:100%;aspect-ratio:1/1;object-fit:contain;display:block;}

/* Mockup del pack (Bonos y CTA final) */
.toefl-page .pack-mockup-img{width:100%;object-fit:contain;display:block;}
.toefl-page .final-mockup{margin:36px auto 0;max-width:520px;}

/* Miniatura del CTA sticky mobile */
.toefl-page .sticky-thumb{
  flex-shrink:0;width:38px;height:38px;border-radius:7px;overflow:hidden;
  background:var(--cream-alt);display:flex;align-items:center;justify-content:center;
}
.toefl-page .sticky-thumb-img{width:100%;height:100%;object-fit:cover;object-position:center 35%;}

/* ============ BONOS ============ */
.toefl-page .bonuses{background:var(--navy);color:var(--cream);}
.toefl-page .bonuses .section-head h2{color:var(--white);}
.toefl-page .bonuses .section-head p{color:#C7D0E0;max-width:60ch;margin-left:auto;margin-right:auto;font-size:14.5px;}
.toefl-page .gift-badge{
  display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;
  border-radius:50%;background:var(--gold);margin-bottom:18px;
}
.toefl-page .gift-badge .icon{width:28px;height:28px;color:var(--navy-dark);stroke-width:1.6;}
.toefl-page .bonus-urgency{
  display:inline-block;margin-top:18px;max-width:540px;line-height:1.55;
  background:rgba(201,147,46,.14);border:1.5px solid var(--gold);border-radius:10px;
  padding:12px 22px;font-size:15px;font-weight:700;color:var(--gold);
}
.toefl-page .bonus-urgency .highlight{color:var(--white);}
.toefl-page .bonus-urgency strong.js-countdown{font-variant-numeric:tabular-nums;}
.toefl-page .bonus-grid{display:grid;grid-template-columns:1fr;gap:22px;margin-top:40px;}
@media(min-width:760px){.toefl-page .bonus-grid{grid-template-columns:1fr 1fr;}}
.toefl-page .bonus-card{
  background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.14);border-radius:var(--radius);
  overflow:hidden;display:flex;flex-direction:column;
}
.toefl-page .bonus-visual{padding:16px 16px 0;}
.toefl-page .bonus-mockup-img{width:100%;aspect-ratio:1/1;object-fit:contain;display:block;}
.toefl-page .bonus-body{padding:20px 22px 24px;}
.toefl-page .bonus-num{
  display:inline-block;font-size:12.5px;font-weight:700;letter-spacing:.08em;
  color:var(--navy-dark);background:var(--gold);padding:4px 12px;border-radius:999px;margin-bottom:12px;
}
.toefl-page .bonus-body h3{color:var(--white);font-size:19px;font-weight:700;}
.toefl-page .bonus-price{margin-top:8px;display:flex;align-items:center;gap:8px;font-size:13px;}
.toefl-page .bonus-price .old{color:#8D96AC;text-decoration:line-through;}
.toefl-page .bonus-price .free{font-weight:900;color:var(--navy-dark);background:var(--gold);padding:2px 9px;border-radius:5px;text-transform:uppercase;letter-spacing:.02em;font-size:11.5px;}
.toefl-page .bonus-empathy{margin-top:10px;font-size:14px;font-style:italic;color:var(--gold);}
.toefl-page .bonus-body ul{margin-top:14px;display:flex;flex-direction:column;gap:8px;}
.toefl-page .bonus-body li{display:flex;gap:9px;align-items:flex-start;font-size:14px;color:#D7DEEB;min-width:0;}
.toefl-page .bonus-body .icon{width:14px;height:14px;color:var(--gold);margin-top:3px;flex-shrink:0;}

/* ============ EASE OF START ============ */
.toefl-page .ease-grid{display:grid;grid-template-columns:1fr;gap:20px;margin-top:36px;}
@media(min-width:760px){.toefl-page .ease-grid{grid-template-columns:repeat(3,1fr);}}
.toefl-page .ease-card{
  display:flex;gap:14px;align-items:flex-start;
  background:var(--white);border:1px solid var(--line);border-radius:var(--radius);
  padding:22px 20px;box-shadow:var(--shadow-soft);
}
.toefl-page .ease-card .icon-wrap{
  flex-shrink:0;width:44px;height:44px;border-radius:12px;background:var(--navy);
  display:flex;align-items:center;justify-content:center;
}
.toefl-page .ease-card .icon{width:22px;height:22px;color:var(--gold);}
.toefl-page .ease-card h3{font-size:16.5px;font-weight:700;}
.toefl-page .ease-card p{margin-top:6px;font-size:14px;color:var(--ink-soft);}

/* ============ TESTIMONIOS + FAQ: mismo fondo, distinto al resto ============ */
.toefl-page #opiniones,.toefl-page #faq{background:var(--cream-alt);}

/* ============ TESTIMONIOS ============ */
.toefl-page .testi-grid{display:grid;grid-template-columns:1fr;gap:20px;}
@media(min-width:760px){.toefl-page .testi-grid{grid-template-columns:repeat(3,1fr);}}
.toefl-page .testi-card{
  background:var(--white);border:1px solid var(--line);border-radius:var(--radius);padding:24px 22px;
  box-shadow:var(--shadow-soft);
}
.toefl-page .testi-card p.quote{font-size:14.5px;color:var(--ink);font-style:italic;min-height:64px;}
.toefl-page .testi-person{display:flex;align-items:center;gap:12px;margin-top:18px;}
.toefl-page .testi-avatar{
  width:44px;height:44px;border-radius:50%;background:var(--navy);
  display:flex;align-items:center;justify-content:center;font-family:var(--sans);font-size:17px;font-weight:900;color:var(--gold);flex-shrink:0;
}
.toefl-page .testi-person .name{font-size:14px;font-weight:800;color:var(--navy);}
.toefl-page .testi-person .loc{font-size:12.5px;color:var(--ink-soft);}

/* ============ FAQ ============ */
.toefl-page .faq{max-width:800px;margin:0 auto;}
.toefl-page .faq details{
  background:var(--white);border:1px solid var(--line);border-radius:12px;padding:6px 22px;margin-bottom:12px;
}
.toefl-page .faq summary{
  list-style:none;cursor:pointer;padding:16px 0;font-weight:800;color:var(--navy);font-size:16px;
  display:flex;justify-content:space-between;align-items:center;gap:16px;
}
.toefl-page .faq summary::-webkit-details-marker{display:none;}
.toefl-page .faq summary .chev{width:20px;height:20px;color:var(--gold-deep);flex-shrink:0;transition:transform 200ms ease;}
.toefl-page .faq details[open] summary .chev{transform:rotate(180deg);}
.toefl-page .faq .faq-a{padding:0 0 18px;font-size:15px;color:var(--ink-soft);}

/* ============ FINAL CTA ============ */
.toefl-page .final-cta{
  background:linear-gradient(180deg,var(--navy) 0%,var(--navy-dark) 100%);color:var(--cream);text-align:center;
}
.toefl-page .final-cta h2{color:var(--white);font-size:clamp(26px,4vw,38px);font-weight:700;}
.toefl-page .final-cta .sub{margin-top:14px;font-size:17px;color:#C7D0E0;max-width:56ch;margin-left:auto;margin-right:auto;}
.toefl-page .final-cta .cta-wrap{margin:34px auto 0;max-width:420px;}
.toefl-page .final-cta .pc-discount{margin-top:0;padding-top:0;border-top:none;}
.toefl-page .final-cta .btn{margin-top:20px;}

/* ============ FOOTER ============ */
.toefl-page footer{background:#0A0A0A;padding:28px 0 100px;}
.toefl-page footer .container{text-align:center;}
.toefl-page footer .fdisclaimer{font-size:12px;color:#9CA3AF;max-width:70ch;margin:0 auto;}

/* ============ STICKY MOBILE CTA ============ */
.toefl-page .sticky-cta{
  display:none;position:fixed;left:0;right:0;bottom:0;z-index:50;
  background:var(--white);border-top:1px solid var(--line);box-shadow:0 -8px 24px rgba(0,0,0,.12);
  padding:10px 14px;padding-bottom:calc(10px + env(safe-area-inset-bottom));
}
.toefl-page .sticky-cta-inner{display:flex;align-items:center;gap:12px;}
.toefl-page .sticky-text{flex-shrink:0;display:flex;flex-direction:column;gap:1px;}
.toefl-page .sticky-price{font-size:13.5px;font-weight:900;color:var(--navy);white-space:nowrap;}
.toefl-page .sticky-price .old{font-weight:600;color:var(--ink-soft);text-decoration:line-through;margin-right:4px;}
.toefl-page .sticky-timer{font-size:11px;font-weight:700;color:var(--cta-dark);white-space:nowrap;}
.toefl-page .sticky-timer strong{font-variant-numeric:tabular-nums;}
.toefl-page .sticky-btn{
  flex:1;min-width:0;padding:15px 12px;font-size:13.5px;line-height:1.2;
  white-space:normal;text-align:center;gap:8px;
}
.toefl-page #sticky-trigger-toefl{height:1px;}
@media(max-width:760px){
  .toefl-page .sticky-cta{display:none;}
  .toefl-page .sticky-cta.is-visible{display:block;}
  .toefl-page{padding-bottom:104px;}
}

/* ============ CENTRADO EN MOBILE ============ */
@media(max-width:760px){
  .toefl-page .hero-grid > div:first-child{text-align:center;}
  .toefl-page .kicker{justify-content:center;}
  .toefl-page .hero .sub{text-align:center;margin-left:auto;margin-right:auto;}

  .toefl-page .section-head.left{text-align:center;margin-left:auto;margin-right:auto;}
  .toefl-page .pc-tag,.toefl-page .pc-name{text-align:center;}
  .toefl-page .pc-discount{text-align:center;}
  .toefl-page .pc-price{justify-content:center;}
  .toefl-page .pc-price-meta{justify-content:center;}
  .toefl-page .pc-timer{justify-content:center;}
}
      `}</style>

      <div className="toefl-page">
        {/* ============ SPRITE DE ICONOS (SVG en línea, sin dependencias externas) ============ */}
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
          <symbol id="i-check" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></symbol>
          <symbol id="i-mail" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" /><polyline points="3 7 12 13 21 7" /></symbol>
          <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 16 14" /></symbol>
          <symbol id="i-alert" viewBox="0 0 24 24"><path d="M12 3 2 20h20z" /><line x1="12" y1="9" x2="12" y2="14" /><line x1="12" y1="17" x2="12.01" y2="17" /></symbol>
          <symbol id="i-book" viewBox="0 0 24 24"><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17Z" /><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /></symbol>
          <symbol id="i-target" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></symbol>
          <symbol id="i-chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9" /></symbol>
          <symbol id="i-mic" viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><line x1="12" y1="18" x2="12" y2="22" /></symbol>
          <symbol id="i-triangle-right" viewBox="0 0 24 24"><path d="M7 4v16l14-8z" fill="currentColor" stroke="none" /></symbol>
          <symbol id="i-gift" viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="4" rx="1" /><rect x="4" y="12" width="16" height="9" rx="1" /><line x1="12" y1="8" x2="12" y2="21" /><path d="M12 8c0-2.5-1.6-4.5-3.5-4.5S6 4.8 6 6c0 1.6 2 2 6 2Z" /><path d="M12 8c0-2.5 1.6-4.5 3.5-4.5S18 4.8 18 6c0 1.6-2 2-6 2Z" /></symbol>
          {/* Logos de métodos de pago — trazos oficiales de Simple Icons (simpleicons.org), monocromos */}
          <symbol id="pay-visa" viewBox="0 0 24 24"><path d="M9.112 8.262L5.97 15.758H3.92L2.374 9.775c-.094-.368-.175-.503-.461-.658C1.447 8.864.677 8.627 0 8.479l.046-.217h3.3a.904.904 0 01.894.764l.817 4.338 2.018-5.102zm8.033 5.049c.008-1.979-2.736-2.088-2.717-2.972.006-.269.262-.555.822-.628a3.66 3.66 0 011.913.336l.34-1.59a5.207 5.207 0 00-1.814-.333c-1.917 0-3.266 1.02-3.278 2.479-.012 1.079.963 1.68 1.698 2.04.756.367 1.01.603 1.006.931-.005.504-.602.725-1.16.734-.975.015-1.54-.263-1.992-.473l-.351 1.642c.453.208 1.289.39 2.156.398 2.037 0 3.37-1.006 3.377-2.564m5.061 2.447H24l-1.565-7.496h-1.656a.883.883 0 00-.826.55l-2.909 6.946h2.036l.405-1.12h2.488zm-2.163-2.656l1.02-2.815.588 2.815zm-8.16-4.84l-1.603 7.496H8.34l1.605-7.496z" /></symbol>
          <symbol id="pay-mastercard" viewBox="0 0 24 24"><path d="M11.343 18.031c.058.049.12.098.181.146-1.177.783-2.59 1.238-4.107 1.238C3.32 19.416 0 16.096 0 12c0-4.095 3.32-7.416 7.416-7.416 1.518 0 2.931.456 4.105 1.238-.06.051-.12.098-.165.15C9.6 7.489 8.595 9.688 8.595 12c0 2.311 1.001 4.51 2.748 6.031zm5.241-13.447c-1.52 0-2.931.456-4.105 1.238.06.051.12.098.165.15C14.4 7.489 15.405 9.688 15.405 12c0 2.31-1.001 4.507-2.748 6.031-.058.049-.12.098-.181.146 1.177.783 2.588 1.238 4.107 1.238C20.68 19.416 24 16.096 24 12c0-4.094-3.32-7.416-7.416-7.416zM12 6.174c-.096.075-.189.15-.28.231C10.156 7.764 9.169 9.765 9.169 12c0 2.236.987 4.236 2.551 5.595.09.08.185.158.28.232.096-.074.189-.152.28-.232 1.563-1.359 2.551-3.359 2.551-5.595 0-2.235-.987-4.236-2.551-5.595-.09-.08-.184-.156-.28-.231z" /></symbol>
          <symbol id="pay-amex" viewBox="0 0 24 24"><path d="M16.015 14.378c0-.32-.135-.496-.344-.622-.21-.12-.464-.135-.81-.135h-1.543v2.82h.675v-1.027h.72c.24 0 .39.024.478.125.12.13.104.38.104.55v.35h.66v-.555c-.002-.25-.017-.376-.108-.516-.06-.08-.18-.18-.33-.234l.02-.008c.18-.072.48-.297.48-.747zm-.87.407l-.028-.002c-.09.053-.195.058-.33.058h-.81v-.63h.824c.12 0 .24 0 .33.05.098.048.156.147.15.255 0 .12-.045.215-.134.27zM20.297 15.837H19v.6h1.304c.676 0 1.05-.278 1.05-.884 0-.28-.066-.448-.187-.582-.153-.133-.392-.193-.73-.207l-.376-.015c-.104 0-.18 0-.255-.03-.09-.03-.15-.105-.15-.21 0-.09.017-.166.09-.21.083-.046.177-.066.272-.06h1.23v-.602h-1.35c-.704 0-.958.437-.958.84 0 .9.776.855 1.407.87.104 0 .18.015.225.06.046.03.082.106.082.18 0 .077-.035.15-.08.18-.06.053-.15.07-.277.07zM0 0v10.096L.81 8.22h1.75l.225.464V8.22h2.043l.45 1.02.437-1.013h6.502c.295 0 .56.057.756.236v-.23h1.787v.23c.307-.17.686-.23 1.12-.23h2.606l.24.466v-.466h1.918l.254.465v-.466h1.858v3.948H20.87l-.36-.6v.585h-2.353l-.256-.63h-.583l-.27.614h-1.213c-.48 0-.84-.104-1.08-.24v.24h-2.89v-.884c0-.12-.03-.12-.105-.135h-.105v1.036H6.067v-.48l-.21.48H4.69l-.202-.48v.465H2.235l-.256-.624H1.4l-.256.624H0V24h23.786v-7.108c-.27.135-.613.18-.973.18H21.09v-.255c-.21.165-.57.255-.914.255H14.71v-.9c0-.12-.018-.12-.12-.12h-.075v1.022h-1.8v-1.066c-.298.136-.643.15-.928.136h-.214v.915h-2.18l-.54-.617-.57.6H4.742v-3.93h3.61l.518.602.554-.6h2.412c.28 0 .74.03.942.225v-.24h2.177c.202 0 .644.045.903.225v-.24h3.265v.24c.163-.164.508-.24.803-.24h1.89v.24c.194-.15.464-.24.84-.24h1.176V0H0zM21.156 14.955c.004.005.006.012.01.016.01.01.024.01.032.02l-.042-.035zM23.828 13.082h.065v.555h-.065zM23.865 15.03v-.005c-.03-.025-.046-.048-.075-.07-.15-.153-.39-.215-.764-.225l-.36-.012c-.12 0-.194-.007-.27-.03-.09-.03-.15-.105-.15-.21 0-.09.03-.16.09-.204.076-.045.15-.05.27-.05h1.223v-.588h-1.283c-.69 0-.96.437-.96.84 0 .9.78.855 1.41.87.104 0 .18.015.224.06.046.03.076.106.076.18 0 .07-.034.138-.09.18-.045.056-.136.07-.27.07h-1.288v.605h1.287c.42 0 .734-.118.9-.36h.03c.09-.134.135-.3.135-.523 0-.24-.045-.39-.135-.526zM18.597 14.208v-.583h-2.235V16.458h2.235v-.585h-1.57v-.57h1.533v-.584h-1.532v-.51M13.51 8.787h.685V11.6h-.684zM13.126 9.543l-.007.006c0-.314-.13-.5-.34-.624-.217-.125-.47-.135-.81-.135H10.43v2.82h.674v-1.034h.72c.24 0 .39.03.487.12.122.136.107.378.107.548v.354h.677v-.553c0-.25-.016-.375-.11-.516-.09-.107-.202-.19-.33-.237.172-.07.472-.3.472-.75zm-.855.396h-.015c-.09.054-.195.056-.33.056H11.1v-.623h.825c.12 0 .24.004.33.05.09.04.15.128.15.25s-.047.22-.134.266zM15.92 9.373h.632v-.6h-.644c-.464 0-.804.105-1.02.33-.286.3-.362.69-.362 1.11 0 .512.123.833.36 1.074.232.238.645.31.97.31h.78l.255-.627h1.39l.262.627h1.36v-2.11l1.272 2.11h.95l.002.002V8.786h-.684v1.963l-1.18-1.96h-1.02V11.4L18.11 8.744h-1.004l-.943 2.22h-.3c-.177 0-.362-.03-.468-.134-.125-.15-.186-.36-.186-.662 0-.285.08-.51.194-.63.133-.135.272-.165.516-.165zm1.668-.108l.464 1.118v.002h-.93l.466-1.12zM2.38 10.97l.254.628H4V9.393l.972 2.205h.584l.973-2.202.015 2.202h.69v-2.81H6.118l-.807 1.904-.876-1.905H3.343v2.663L2.205 8.787h-.997L.01 11.597h.72l.26-.626h1.39zm-.688-1.705l.46 1.118-.003.002h-.915l.457-1.12zM11.856 13.62H9.714l-.85.923-.825-.922H5.346v2.82H8l.855-.932.824.93h1.302v-.94h.838c.6 0 1.17-.164 1.17-.945l-.006-.003c0-.78-.598-.93-1.128-.93zM7.67 15.853l-.014-.002H6.02v-.557h1.47v-.574H6.02v-.51H7.7l.733.82-.764.824zm2.642.33l-1.03-1.147 1.03-1.108v2.253zm1.553-1.258h-.885v-.717h.885c.24 0 .42.098.42.344 0 .243-.15.372-.42.372zM9.967 9.373v-.586H7.73V11.6h2.237v-.58H8.4v-.564h1.527V9.88H8.4v-.507" /></symbol>
          <symbol id="pay-applepay" viewBox="0 0 24 24"><path d="M2.15 4.318a42.16 42.16 0 0 0-.454.003c-.15.005-.303.013-.452.04a1.44 1.44 0 0 0-1.06.772c-.07.138-.114.278-.14.43-.028.148-.037.3-.04.45A10.2 10.2 0 0 0 0 6.222v11.557c0 .07.002.138.003.207.004.15.013.303.04.452.027.15.072.291.142.429a1.436 1.436 0 0 0 .63.63c.138.07.278.115.43.142.148.027.3.036.45.04l.208.003h20.194l.207-.003c.15-.004.303-.013.452-.04.15-.027.291-.071.428-.141a1.432 1.432 0 0 0 .631-.631c.07-.138.115-.278.141-.43.027-.148.036-.3.04-.45.002-.07.003-.138.003-.208l.001-.246V6.221c0-.07-.002-.138-.004-.207a2.995 2.995 0 0 0-.04-.452 1.446 1.446 0 0 0-1.2-1.201 3.022 3.022 0 0 0-.452-.04 10.448 10.448 0 0 0-.453-.003zm0 .512h19.942c.066 0 .131.002.197.003.115.004.25.01.375.032.109.02.2.05.287.094a.927.927 0 0 1 .407.407.997.997 0 0 1 .094.288c.022.123.028.258.031.374.002.065.003.13.003.197v11.552c0 .065 0 .13-.003.196-.003.115-.009.25-.032.375a.927.927 0 0 1-.5.693 1.002 1.002 0 0 1-.286.094 2.598 2.598 0 0 1-.373.032l-.2.003H1.906c-.066 0-.133-.002-.196-.003a2.61 2.61 0 0 1-.375-.032c-.109-.02-.2-.05-.288-.094a.918.918 0 0 1-.406-.407 1.006 1.006 0 0 1-.094-.288 2.531 2.531 0 0 1-.032-.373 9.588 9.588 0 0 1-.002-.197V6.224c0-.065 0-.131.002-.197.004-.114.01-.248.032-.375.02-.108.05-.199.094-.287a.925.925 0 0 1 .407-.406 1.03 1.03 0 0 1 .287-.094c.125-.022.26-.029.375-.032.065-.002.131-.002.196-.003zm4.71 3.7c-.3.016-.668.199-.88.456-.191.22-.36.58-.316.918.338.03.675-.169.888-.418.205-.258.345-.603.308-.955zm2.207.42v5.493h.852v-1.877h1.18c1.078 0 1.835-.739 1.835-1.812 0-1.07-.742-1.805-1.808-1.805zm.852.719h.982c.739 0 1.161.396 1.161 1.089 0 .692-.422 1.092-1.164 1.092h-.979zm-3.154.3c-.45.01-.83.28-1.05.28-.235 0-.593-.264-.981-.257a1.446 1.446 0 0 0-1.23.747c-.527.908-.139 2.255.374 2.995.249.366.549.769.944.754.373-.014.52-.242.973-.242.454 0 .586.242.98.235.41-.007.667-.366.915-.733.286-.417.403-.82.41-.841-.007-.008-.79-.308-.797-1.209-.008-.754.615-1.113.644-1.135-.352-.52-.9-.578-1.09-.593a1.123 1.123 0 0 0-.092-.002zm8.204.397c-.99 0-1.606.533-1.652 1.256h.777c.072-.358.369-.586.845-.586.502 0 .803.266.803.711v.309l-1.097.064c-.951.054-1.488.484-1.488 1.184 0 .72.548 1.207 1.332 1.207.526 0 1.032-.281 1.264-.727h.019v.659h.788v-2.76c0-.803-.62-1.317-1.591-1.317zm1.94.072l1.446 4.009c0 .003-.073.24-.073.247-.125.41-.33.571-.711.571-.069 0-.206 0-.267-.015v.666c.06.011.267.019.335.019.83 0 1.226-.312 1.568-1.283l1.5-4.214h-.868l-1.012 3.259h-.015l-1.013-3.26zm-1.167 2.189v.316c0 .521-.45.917-1.024.917-.442 0-.731-.228-.731-.579 0-.342.278-.56.769-.593z" /></symbol>
          <symbol id="pay-googlepay" viewBox="0 0 24 24"><path d="M3.963 7.235A3.963 3.963 0 00.422 9.419a3.963 3.963 0 000 3.559 3.963 3.963 0 003.541 2.184c1.07 0 1.97-.352 2.627-.957.748-.69 1.18-1.71 1.18-2.916a4.722 4.722 0 00-.07-.806H3.964v1.526h2.14a1.835 1.835 0 01-.79 1.205c-.356.241-.814.379-1.35.379-1.034 0-1.911-.697-2.225-1.636a2.375 2.375 0 010-1.517c.314-.94 1.191-1.636 2.225-1.636a2.152 2.152 0 011.52.594l1.132-1.13a3.808 3.808 0 00-2.652-1.033zm6.501.55v6.9h.886V11.89h1.465c.603 0 1.11-.196 1.522-.588a1.911 1.911 0 00.635-1.464 1.92 1.92 0 00-.635-1.456 2.125 2.125 0 00-1.522-.598zm2.427.85a1.156 1.156 0 01.823.365 1.176 1.176 0 010 1.686 1.171 1.171 0 01-.877.357H11.35V8.635h1.487a1.156 1.156 0 01.054 0zm4.124 1.175c-.842 0-1.477.308-1.907.925l.781.491c.288-.417.68-.626 1.175-.626a1.255 1.255 0 01.856.323 1.009 1.009 0 01.366.785v.202c-.34-.193-.774-.289-1.3-.289-.617 0-1.11.145-1.479.434-.37.288-.554.677-.554 1.165a1.476 1.476 0 00.525 1.156c.35.308.785.463 1.305.463.61 0 1.098-.27 1.465-.81h.038v.655h.848v-2.909c0-.61-.19-1.09-.568-1.44-.38-.35-.896-.525-1.551-.525zm2.263.154l1.946 4.422-1.098 2.38h.915L24 9.963h-.965l-1.368 3.391h-.02l-1.406-3.39zm-2.146 2.368c.494 0 .88.11 1.156.33 0 .372-.147.696-.44.973a1.413 1.413 0 01-.997.414 1.081 1.081 0 01-.69-.232.708.708 0 01-.293-.578c0-.257.12-.47.363-.647.24-.173.54-.26.9-.26Z" /></symbol>
        </svg>

        {/* ============ HERO ============ */}
        <header className="hero">
          <div className="container hero-grid">
            <div>
              <span className="kicker">Guía especializada en TOEFL · Edición 2026</span>
              <h1>Aprueba el <span className="accent">TOEFL</span> con <span className="highlight-wavy">Nivel B2</span> a la Primera</h1>
              <p className="sub">Sabemos que enfrentarte al TOEFL sin saber bien qué te van a pedir puede ponerte nervioso. La mayoría de universidades, becas y posgrados de habla inglesa piden un nivel B2, y esta guía existe para ayudarte a llegar ahí: con ejercicios que se parecen de verdad al examen, no genéricos ni sacados de cualquier lado.</p>
            </div>

            <div className="hero-visual">
              <img src="/toefl/imagenes/hero-antes-despues.webp" alt="Antes y después: de nerviosa rindiendo el TOEFL a sonriente con su certificado de nivel B2 y la guía en mano" className="hero-photo" />
            </div>
          </div>
        </header>

        {/* ============ ESTO ES PARA TI SI... ============ */}
        <section id="para-ti">
          <div className="container">
            <div className="section-head">
              <h2>Esto Es Para Ti Si...</h2>
            </div>

            <ul className="id-list">
              <li className="id-item">
                <span className="icon-wrap"><svg className="icon" aria-hidden="true"><use href="#i-clock" /></svg></span>
                <p>Ya tienes una fecha marcada —el examen, una beca, una postulación— y solo con pensar en tener que repetirlo se te hace un nudo en el estómago.</p>
              </li>
              <li className="id-item">
                <span className="icon-wrap"><svg className="icon" aria-hidden="true"><use href="#i-book" /></svg></span>
                <p>Sientes que tu inglés ya está bastante bien, pero apenas piensas en el TOEFL no tienes idea de qué te vas a encontrar el día del examen.</p>
              </li>
              <li className="id-item">
                <span className="icon-wrap"><svg className="icon" aria-hidden="true"><use href="#i-target" /></svg></span>
                <p>Nadie te ha explicado bien qué puntaje te están pidiendo, ni por qué existen dos escalas distintas —y eso solo te genera más dudas.</p>
              </li>
              <li className="id-item">
                <span className="icon-wrap"><svg className="icon" aria-hidden="true"><use href="#i-mic" /></svg></span>
                <p>Con solo pensar en la parte de Speaking —hablar solo y grabarte, sin nadie que te diga si lo estás haciendo bien— ya te pones nervioso.</p>
              </li>
              <li className="id-item">
                <span className="icon-wrap"><svg className="icon" aria-hidden="true"><use href="#i-alert" /></svg></span>
                <p>Ya buscaste ejercicios gratis en internet y lo único que encontraste fue material genérico, viejo o que no se parece en nada al examen real.</p>
              </li>
            </ul>
          </div>
        </section>

        {/* ============ LOGRO + PRODUCTO ============ */}
        <section className="deliver" id="producto">
          <div className="container">
            <div className="deliver-grid">
              <div>
                <div className="section-head left">
                  <h2>Con Esta Guía, en los Próximos 14 Días, Vas a:</h2>
                </div>

                <ol className="achieve-list">
                  <li className="achieve-item">
                    <span className="icon-wrap" aria-hidden="true" />
                    <p><strong>Saber exactamente qué esperar el día del examen</strong> —qué evalúa cada sección, cuánto dura y cómo te puntúan— para llegar tranquilo y no a ciegas.</p>
                  </li>
                  <li className="achieve-item">
                    <span className="icon-wrap" aria-hidden="true" />
                    <p><strong>Practicar con ejercicios que se sienten como el examen real</strong> —no genéricos ni desactualizados— para que el día del TOEFL no sea la primera vez que ves algo así.</p>
                  </li>
                  <li className="achieve-item">
                    <span className="icon-wrap" aria-hidden="true" />
                    <p><strong>Tener un plan armado para tu propia fecha de examen</strong>, para saber qué estudiar cada semana sin esa sensación de ir improvisando contra el reloj.</p>
                  </li>
                  <li className="achieve-item">
                    <span className="icon-wrap" aria-hidden="true" />
                    <p><strong>Perder el miedo a hablar y escribir en inglés bajo presión</strong>, con plantillas y frases que puedes adaptar a tus propias respuestas, para sentirte seguro en vez de quedarte en blanco.</p>
                  </li>
                </ol>
              </div>

              <div>
                <div className="product-card">
                  <div className="pc-visual">
                    <img src="/toefl/imagenes/mockup-guia-toefl.webp" alt="Mockup de la Guía TOEFL: libro, versión en celular y archivo PDF" className="pc-mockup-img" />
                  </div>
                  <div className="pc-body">
                    <p className="pc-tag">Guía + sistema de preparación</p>
                    <h3 className="pc-name">Guía para Aprobar el TOEFL con Nivel B2</h3>

                    <ul className="pc-includes">
                      <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> Todo explicado en español, aunque el examen sea en inglés</li>
                      <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> Checklist para leer el puntaje exacto que te piden en tu universidad, beca o posgrado</li>
                      <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> Test de autoevaluación de tu nivel actual</li>
                      <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> Anatomía completa de las 4 secciones del examen</li>
                      <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> Estrategia y manejo del tiempo por sección</li>
                      <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> Ejercicios calibrados de Reading, Listening, Writing y Speaking</li>
                      <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> Banco de plantillas y frases para Writing y Speaking</li>
                      <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> Plan de estudio armado hacia atrás desde tu fecha de examen</li>
                    </ul>

                    <PriceOffer price={price} originalPrice={originalPrice} discountPct={discountPct} />

                    <div className="pc-cta">
                      <a href={checkoutHref} onClick={handleCheckoutClick} className="btn btn-primary btn-block"><svg className="btn-arrow" aria-hidden="true"><use href="#i-triangle-right" /></svg>Sí, Quiero Empezar Mi Preparación</a>
                    </div>

                    <InstantAccessNote />
                    <PaymentIcons />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div id="sticky-trigger-toefl" />

        {/* ============ BONOS ============ */}
        <section className="bonuses" id="bonos">
          <div className="container">
            <div className="section-head">
              <span className="gift-badge"><svg className="icon" aria-hidden="true"><use href="#i-gift" /></svg></span>
              <h2>Premiamos tu Esfuerzo</h2>
              <p>Sabemos que aprobar el examen es solo una parte del camino. Estos bonos te ayudan a llegar más tranquilo y a sacarle provecho a tu puntaje después — valen US$41, y hoy son tuyos gratis.</p>
              <p className="bonus-urgency">Todavía tienes <strong className="js-countdown">30:00</strong> para llevártelos <strong className="highlight">gratis</strong> — después vuelven a su precio normal.</p>
            </div>

            <div className="bonus-grid">
              <div className="bonus-card">
                <div className="bonus-visual">
                  <img src="/toefl/imagenes/mockup-bono1-webapp.webp" alt="Mockup del Bono 1: TOEFL Audio Lab en laptop y celular" className="bonus-mockup-img" />
                </div>
                <div className="bonus-body">
                  <span className="bonus-num">BONO 1</span>
                  <h3>Plataforma TOEFL Audio Lab</h3>
                  <div className="bonus-price"><span className="old">Valor $15 USD</span><span className="free">GRATIS hoy</span></div>
                  <p className="bonus-empathy">Para que no te quedes solo con la teoría del PDF: acá escuchas, hablas, escribes y practicas contra el reloj, todo en un solo lugar — como si ya estuvieras rindiendo el examen.</p>
                  <ul>
                    <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> 47 audios de Listening y Speaking con voz real, con transcripción de cada uno</li>
                    <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> Te grabas practicando Speaking y comparas tu voz con el audio modelo</li>
                    <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> Simulacro cronometrado de Listening, con los tiempos reales del examen</li>
                    <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> Sala de Writing con cronómetro y contador de palabras</li>
                  </ul>
                </div>
              </div>

              <div className="bonus-card">
                <div className="bonus-visual">
                  <img src="/toefl/imagenes/mockup-bono2.webp" alt="Mockup del Bono 2: Plan de Emergencia en 7 Días" className="bonus-mockup-img" />
                </div>
                <div className="bonus-body">
                  <span className="bonus-num">BONO 2</span>
                  <h3>Plan de Emergencia: Prepárate en 7 Días</h3>
                  <div className="bonus-price"><span className="old">Valor $8 USD</span><span className="free">GRATIS hoy</span></div>
                  <p className="bonus-empathy">Para cuando el tiempo se te vino encima y no llegas con las semanas que pide el plan principal.</p>
                  <ul>
                    <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> Plan día por día, pensado para una sola semana</li>
                    <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> Prioriza lo que más pesa en tu puntaje</li>
                    <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> Para cuando compraste tarde o tienes poco margen</li>
                  </ul>
                </div>
              </div>

              <div className="bonus-card">
                <div className="bonus-visual">
                  <img src="/toefl/imagenes/mockup-bono3-audio.webp" alt="Mockup del Bono 3: Audios para Calmar los Nervios antes del Examen" className="bonus-mockup-img" />
                </div>
                <div className="bonus-body">
                  <span className="bonus-num">BONO 3</span>
                  <h3>Audios para Calmar los Nervios antes del Examen</h3>
                  <div className="bonus-price"><span className="old">Valor $6 USD</span><span className="free">GRATIS hoy</span></div>
                  <p className="bonus-empathy">Para esos minutos antes de entrar a la sala, cuando los nervios pueden más que todo lo que ya estudiaste.</p>
                  <ul>
                    <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> Ejercicios simples de respiración y enfoque</li>
                    <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> Para escuchar camino a la sede o en la sala de espera</li>
                  </ul>
                </div>
              </div>

              <div className="bonus-card">
                <div className="bonus-visual">
                  <img src="/toefl/imagenes/mockup-bono4.webp" alt="Mockup del Bono 4: Cómo Generar Más Ingresos Ahora que Tienes el TOEFL" className="bonus-mockup-img" />
                </div>
                <div className="bonus-body">
                  <span className="bonus-num">BONO 4</span>
                  <h3>Cómo Generar Más Ingresos Ahora que Tienes el TOEFL</h3>
                  <div className="bonus-price"><span className="old">Valor $12 USD</span><span className="free">GRATIS hoy</span></div>
                  <p className="bonus-empathy">Porque aprobar el examen no es la meta final — es sacarle provecho a ese puntaje.</p>
                  <ul>
                    <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> Cómo mostrar tu puntaje en tu CV y LinkedIn</li>
                    <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> Trabajo remoto que valora el inglés certificado</li>
                    <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> Becas y programas cortos que piden B2, no C1</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="section-cta">
              <BundleMockup />
              <PriceOffer price={price} originalPrice={originalPrice} discountPct={discountPct} />
              <a href={checkoutHref} onClick={handleCheckoutClick} className="btn btn-primary"><svg className="btn-arrow" aria-hidden="true"><use href="#i-triangle-right" /></svg>Sí, Quiero Mis 4 Bonos Gratis</a>
              <InstantAccessNote />
              <PaymentIcons />
            </div>
          </div>
        </section>

        {/* ============ FACILIDAD DE COMIENZO ============ */}
        <section className="ease">
          <div className="container">
            <div className="section-head">
              <h2>No Importa en Qué Punto Estás Hoy</h2>
              <p>Sientas que tu inglés está fuerte o que hace tiempo no lo practicas, así de simple es empezar.</p>
            </div>

            <div className="ease-grid">
              <div className="ease-card">
                <span className="icon-wrap"><svg className="icon" aria-hidden="true"><use href="#i-target" /></svg></span>
                <div>
                  <h3>Empiezas justo donde estás</h3>
                  <p>No tienes que adivinar por dónde arrancar. En minutos, el test de autoevaluación te muestra dónde estás parado hoy, para que dediques tu tiempo a lo que de verdad necesitas mejorar.</p>
                </div>
              </div>
              <div className="ease-card">
                <span className="icon-wrap"><svg className="icon" aria-hidden="true"><use href="#i-mail" /></svg></span>
                <div>
                  <h3>Acceso inmediato por email</h3>
                  <p>Sabemos lo frustrante que es comprar algo y quedarte esperando sin noticias. Acá no: apenas se acredita tu pago, el PDF te llega directo al correo, el mismo día.</p>
                </div>
              </div>
              <div className="ease-card">
                <span className="icon-wrap"><svg className="icon" aria-hidden="true"><use href="#i-book" /></svg></span>
                <div>
                  <h3>A tu ritmo, sin presión</h3>
                  <p>Sabemos que entre el trabajo, la casa y mil cosas más, el tiempo no siempre alcanza. Por eso es un PDF que abres cuando puedes —desde el celular, la tablet o la compu— y avanzas a tu propio paso, sin que nadie te apure.</p>
                </div>
              </div>
            </div>

            <div className="section-cta">
              <BundleMockup />
              <PriceOffer price={price} originalPrice={originalPrice} discountPct={discountPct} />
              <a href={checkoutHref} onClick={handleCheckoutClick} className="btn btn-primary"><svg className="btn-arrow" aria-hidden="true"><use href="#i-triangle-right" /></svg>Quiero Empezar Hoy</a>
              <InstantAccessNote />
              <PaymentIcons />
            </div>
          </div>
        </section>

        {/* ============ TESTIMONIOS ============ */}
        <section id="opiniones">
          <div className="container">
            <div className="section-head">
              <h2>Lo Que Dicen Quienes Ya la Usaron</h2>
            </div>

            <div className="testi-grid">
              <div className="testi-card">
                <p className="quote">"Llevaba años con un inglés decente, pero no tenía idea de cómo era el examen en sí. Con la guía entendí la estructura completa y en mi primer intento saqué 4.5 —justo lo que me pedía la universidad."</p>
                <div className="testi-person">
                  <span className="testi-avatar">V</span>
                  <div>
                    <div className="name">Valentina R.</div>
                    <div className="loc">Bogotá, Colombia</div>
                  </div>
                </div>
              </div>
              <div className="testi-card">
                <p className="quote">"Le tenía pánico a la parte de Speaking, grabarme hablando sola me ponía nerviosísima. Practicar con las plantillas de la guía me dio la seguridad que me faltaba, y terminé sacando mi mejor puntaje ahí."</p>
                <div className="testi-person">
                  <span className="testi-avatar">A</span>
                  <div>
                    <div className="name">Andrés M.</div>
                    <div className="loc">Lima, Perú</div>
                  </div>
                </div>
              </div>
              <div className="testi-card">
                <p className="quote">"Antes de esto hice como mil ejercicios gratis de internet y ninguno se parecía al examen real. Los de la guía sí, y eso se notó el día del TOEFL: no me encontré con nada que no hubiera visto antes."</p>
                <div className="testi-person">
                  <span className="testi-avatar">C</span>
                  <div>
                    <div className="name">Camila S.</div>
                    <div className="loc">Ciudad de México, México</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="section-cta">
              <BundleMockup />
              <PriceOffer price={price} originalPrice={originalPrice} discountPct={discountPct} />
              <a href={checkoutHref} onClick={handleCheckoutClick} className="btn btn-primary"><svg className="btn-arrow" aria-hidden="true"><use href="#i-triangle-right" /></svg>Quiero los Mismos Resultados</a>
              <InstantAccessNote />
              <PaymentIcons />
            </div>
          </div>
        </section>

        {/* ============ FAQ ============ */}
        <section id="faq">
          <div className="container">
            <div className="section-head">
              <h2>Preguntas Frecuentes</h2>
            </div>

            <div className="faq">
              <details>
                <summary>¿Sirve para mi país o mi universidad? <svg className="icon chev" aria-hidden="true"><use href="#i-chevron" /></svg></summary>
                <p className="faq-a">Sí. El TOEFL y su escala de puntaje son iguales en todo el mundo; la guía te enseña a leer el requisito exacto de tu institución, sin importar el país.</p>
              </details>
              <details>
                <summary>¿Me enseña inglés desde cero? <svg className="icon chev" aria-hidden="true"><use href="#i-chevron" /></svg></summary>
                <p className="faq-a">No. Esta guía te entrena para el formato del examen —qué te van a preguntar, cómo responder y cómo manejar el tiempo— no para aprender inglés desde cero.</p>
              </details>
              <details>
                <summary>¿Me garantiza el puntaje? <svg className="icon chev" aria-hidden="true"><use href="#i-chevron" /></svg></summary>
                <p className="faq-a">No, nadie puede garantizarlo: depende de tu nivel y tu práctica. Te da el método y ejercicios calibrados al nivel real del examen.</p>
              </details>
              <details>
                <summary>Prefiero el IELTS o Duolingo English Test <svg className="icon chev" aria-hidden="true"><use href="#i-chevron" /></svg></summary>
                <p className="faq-a">Esta guía es específicamente para el TOEFL; si tu institución pide TOEFL, es para ti.</p>
              </details>
              <details>
                <summary>Ya tengo instituto o profesor de inglés <svg className="icon chev" aria-hidden="true"><use href="#i-chevron" /></svg></summary>
                <p className="faq-a">No lo reemplaza: tu instituto te enseña inglés, esta guía te entrena la prueba específica.</p>
              </details>
              <details>
                <summary>Mi inglés es básico, ¿me sirve igual? <svg className="icon chev" aria-hidden="true"><use href="#i-chevron" /></svg></summary>
                <p className="faq-a">Esta guía está pensada para quien ya se defiende en inglés y quiere enfocarse en el formato del examen, no para aprender el idioma desde cero.</p>
              </details>
              <details>
                <summary>¿Cómo y cuándo recibo el material? <svg className="icon chev" aria-hidden="true"><use href="#i-chevron" /></svg></summary>
                <p className="faq-a">Apenas se acredita el pago, te llega por email. Es un PDF descargable — no hay envíos ni esperas, porque no se manda nada físico a ninguna dirección.</p>
              </details>
              <details>
                <summary>¿Por cuánto tiempo tengo acceso? <svg className="icon chev" aria-hidden="true"><use href="#i-chevron" /></svg></summary>
                <p className="faq-a">Acceso permanente: el mismo link, sin vencimiento.</p>
              </details>
              <details>
                <summary>¿Cómo pago desde mi país? <svg className="icon chev" aria-hidden="true"><use href="#i-chevron" /></svg></summary>
                <p className="faq-a">Pago único con tarjeta internacional. Según tu país, verás el precio en dólares (USD) o en tu moneda local, y puedes elegir la que prefieras; el cambio se calcula al momento de pagar. El checkout no depende de tu banco ni de tu país.</p>
              </details>
            </div>

            <div className="section-cta">
              <BundleMockup />
              <PriceOffer price={price} originalPrice={originalPrice} discountPct={discountPct} />
              <a href={checkoutHref} onClick={handleCheckoutClick} className="btn btn-primary"><svg className="btn-arrow" aria-hidden="true"><use href="#i-triangle-right" /></svg>Ya No Tengo Dudas — Empezar</a>
              <InstantAccessNote />
              <PaymentIcons />
            </div>
          </div>
        </section>

        {/* ============ CTA FINAL ============ */}
        <section className="final-cta">
          <div className="container">
            <h2>Llega a tu Examen sin Esa Sensación de Estar Improvisando</h2>
            <p className="sub">Sabemos que no puedes controlar la fecha, los nervios ni cuánto cuesta repetirlo. Pero sí puedes decidir cómo te preparas. Empieza hoy, con un plan pensado para tu propia fecha de examen.</p>

            <div className="final-mockup">
              <img src="/toefl/imagenes/mockup-bundle-cuadrado.webp" alt="Mockup del pack completo: guía TOEFL + celular + los 4 bonos" className="pack-mockup-img" />
            </div>

            <div className="cta-wrap">
              <PriceOffer price={price} originalPrice={originalPrice} discountPct={discountPct} dark />
              <a href={checkoutHref} onClick={handleCheckoutClick} className="btn btn-primary btn-block"><svg className="btn-arrow" aria-hidden="true"><use href="#i-triangle-right" /></svg>Sí, Quiero Empezar Mi Preparación Ahora</a>
              <InstantAccessNote />
              <PaymentIcons dark />
            </div>
          </div>
        </section>

        {/* ============ FOOTER ============ */}
        <footer>
          <div className="container">
            <p className="fdisclaimer">Este es un material educativo de preparación para el examen TOEFL y no garantiza tu puntaje, tu admisión, beca o proceso migratorio, que depende exclusivamente de la institución correspondiente. Este producto no está afiliado a ETS (Educational Testing Service) ni a ningún organismo oficial del TOEFL.</p>
          </div>
        </footer>

        {/* ============ CTA STICKY MOBILE ============ */}
        <div className="sticky-cta">
          <div className="sticky-cta-inner">
            <div className="sticky-thumb">
              <img src="/toefl/imagenes/mockup-bundle-cuadrado.webp" alt="Guía TOEFL + bonos" className="sticky-thumb-img" />
            </div>
            <div className="sticky-text">
              <span className="sticky-price"><span className="old">${originalPrice}</span>${price} USD</span>
              <span className="sticky-timer">Termina en <strong className="js-countdown">30:00</strong></span>
            </div>
            <a href={checkoutHref} onClick={handleCheckoutClick} className="btn btn-primary sticky-btn"><svg className="btn-arrow" aria-hidden="true"><use href="#i-triangle-right" /></svg>Sí, Quiero la Guía&nbsp;+&nbsp;4&nbsp;Bonos</a>
          </div>
        </div>
      </div>
    </>
  );
};

export default Toefl;
