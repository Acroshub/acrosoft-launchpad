import { Flame, FlaskConical, Moon, ShieldAlert, Thermometer, Wind } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { saveCheckoutAttribution } from "@/lib/checkoutAttribution";
import { initMetaPixel, trackMetaEvent } from "@/lib/metaPixel";
import { uuid } from "@/lib/uuid";
import {
  AUXILIOS_GUARANTEE_DAYS,
  AUXILIOS_LIST_PRICE,
  AUXILIOS_PAYMENT_LINK,
  AUXILIOS_PIXEL_ID,
  AUXILIOS_PRICE,
  auxiliosCheckoutUrl,
  auxiliosEventParams,
} from "@/lib/auxiliosConfig";

// Landing de «Primeros Auxilios del Bebé» — /auxilios-lp. Misma estructura que /toefl (hero, "esto es para ti si…",
// producto, bonos, facilidad de comienzo, "cómo funciona por dentro" en vez de testimonios, garantía + FAQ, CTA final,
// CTA sticky móvil), sin cronómetro: no hay urgencia ni escasez inventadas.

const PAGE_TITLE = "Primeros Auxilios del Bebé (0 a 12 Meses) | Tarjetas de 3 Pasos para Emergencias Comunes";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const AB_EXPERIMENT_KEY = "auxilios_price";

const price = AUXILIOS_PRICE;
const originalPrice = AUXILIOS_LIST_PRICE;
const discountPct = Math.round((1 - price / originalPrice) * 100);
const IMG = "/auxilios/imagenes";

// ─── Contador de oferta (mismo mecanismo que /toefl) ─────────────────────────
// 30 min desde la primera visita, recordados en localStorage; a quien vuelve solo le quedan 9 (la barra arranca al 30%).
const OFFER_DURATION_MS = 30 * 60 * 1000;
const RETURN_OFFER_DURATION_MS = 9 * 60 * 1000;
const OFFER_END_KEY = "auxilios_offer_end";
const RETURN_OFFER_END_KEY = "auxilios_offer_end_return";
const VISIT_COUNT_KEY = "auxilios_visit_count";
const VISIT_SESSION_KEY = "auxilios_visit_counted";

function getOfferEnd(returning: boolean): number {
  const key = returning ? RETURN_OFFER_END_KEY : OFFER_END_KEY;
  const duration = returning ? RETURN_OFFER_DURATION_MS : OFFER_DURATION_MS;
  try {
    const stored = Number(localStorage.getItem(key));
    if (Number.isFinite(stored) && stored > 0) return stored;
    const end = Date.now() + duration;
    localStorage.setItem(key, String(end));
    return end;
  } catch {
    return Date.now() + duration;
  }
}

/** ¿Es una visita recurrente (2.ª o posterior)? Cuenta una visita por sesión de pestaña. */
function isReturningVisit(): boolean {
  try {
    let count = Number(localStorage.getItem(VISIT_COUNT_KEY));
    if (!Number.isFinite(count) || count < 0) count = 0;
    if (!sessionStorage.getItem(VISIT_SESSION_KEY)) {
      if (count === 0 && localStorage.getItem(OFFER_END_KEY)) count = 1;
      count += 1;
      localStorage.setItem(VISIT_COUNT_KEY, String(count));
      sessionStorage.setItem(VISIT_SESSION_KEY, "1");
    }
    return count >= 2;
  } catch {
    return false;
  }
}

const PARA_TI: { icon: string; text: string }[] = [
  { icon: "i-play", text: "Viste videos de YouTube, pero son largos y sabes que, en el momento, no los vas a encontrar." },
  { icon: "i-users", text: "Le preguntaste al grupo de mamás y cada una te dijo algo distinto. Sigues sin saber a quién creerle." },
  { icon: "i-phone", text: "Guardaste capturas en el celular. Hoy tienes 20 y ninguna a mano cuando el bebé llora." },
  { icon: "i-heart", text: "Tu mamá o tu suegra te dicen «tranquila, eso se resuelve así», pero hoy ya no se hace como antes." },
  { icon: "i-clock", text: "Pensaste en un curso presencial, pero no hay tiempo ni con quién dejar al bebé." },
];

// Mecanismo y ventajas: aquí todavía NO se revela el formato (ebook / app / bonos); eso viene en la oferta.
const LOGROS: string[] = [
  "Cada tarjeta tiene solo 3 pasos: qué ver, qué hacer ya y cuándo llamar a emergencias. Nada de párrafos.",
  "Letra grande, para leerla aunque te tiemblen las manos.",
  "Ordenadas por la edad de tu bebé (0 a 3, 3 a 6 y 6 a 12 meses), porque cada etapa trae riesgos distintos.",
  "Un repaso de 5 minutos por semana, para que no se te olvide cuando importe.",
  "Una hoja clara para que la abuela o la niñera sepan qué hacer cuando tú no estás.",
];

// Emergencias que cubre el método (mismos colores que la app).
const COVERED: { label: string; Icon: typeof Wind }[] = [
  { label: "Atragantamiento", Icon: Wind },
  { label: "Caídas y golpes en la cabeza", Icon: ShieldAlert },
  { label: "Quemaduras", Icon: Flame },
  { label: "Fiebre y señales de alarma", Icon: Thermometer },
  { label: "Intoxicación por ingestión", Icon: FlaskConical },
  { label: "Sofocación y sueño seguro", Icon: Moon },
];

const INCLUYE: string[] = [
  "Tu guía en PDF (41 páginas): una tarjeta clara para cada emergencia",
  "Tu app en el celular: abres la tarjeta en pantalla completa, repasas con un mini quiz cada semana y revisas tu casa paso a paso",
  "3 bonos de regalo, ya guardados dentro de la app",
  "Acceso inmediato desde tu celular: no tienes que instalar nada",
];

const BONOS: { n: number; title: string; empathy: string; img: string; points: string[] }[] = [
  {
    n: 1,
    title: "Casa Segura, Habitación por Habitación",
    empathy: "Porque el bebé se mueve antes de lo que crees.",
    img: "mockup-bono-1.webp",
    points: ["Checklist de riesgos: cuarto, sala, cocina y más", "Pasos para una revisión rápida de cada espacio", "Pensado para cuando empieza a rodar y a gatear"],
  },
  {
    n: 2,
    title: "Fiebre y Malestares: Cuándo Llamar al Pediatra",
    empathy: "Porque la fiebre siempre llega de madrugada.",
    img: "mockup-bono-2.webp",
    points: ["Señales de alarma en forma de semáforo", "Qué preguntar y cómo empezar la llamada al pediatra", "Fiebre, deshidratación, vómitos y diarrea, sin dosis de medicamentos"],
  },
  {
    n: 3,
    title: "Hoja para Niñeras y Abuelos",
    empathy: "Porque dejarlo con alguien más no debería darte un nudo en el estómago.",
    img: "mockup-bono-3.webp",
    points: ["Hoja imprimible para pegar en casa", "Cómo pedirlo sin ofender y frases que funcionan", "Checklist antes de salir y simulacro"],
  },
];

const PASOS: { icon: string; title: string; text: string }[] = [
  { icon: "i-card", title: "1. Haces tu pago", text: "Pago único. Sin suscripciones." },
  { icon: "i-mail", title: "2. Recibes tu acceso", text: "El link y la contraseña te llegan de inmediato a tu correo." },
  { icon: "i-phone", title: "3. Abres la app", text: "Tienes las tarjetas y los libros a la mano para cualquier emergencia, desde tu celular." },
];

const FAQ: { q: string; a: string }[] = [
  { q: "Ya vi videos de YouTube. ¿En qué es distinto?", a: "Un video hay que buscarlo, esperar a que cargue y ver minutos para llegar a lo importante. Aquí la respuesta ya está resuelta en una tarjeta de 3 pasos, a pantalla completa, para abrirla en segundos y leerla con nervios." },
  { q: "Si pasa algo de verdad, ¿voy a poder abrir esto a tiempo?", a: "Está hecho para ese momento: abres la app, tocas la emergencia y aparece la tarjeta con letra grande. Puedes dejar el acceso en la pantalla de inicio de tu celular, y el repaso de 5 minutos por semana te ayuda a saber dónde está cada cosa antes de necesitarla." },
  { q: "¿Es información confiable o es solo \"lo que dice internet\"?", a: "Cada tarjeta se basa en guías públicas de la Cruz Roja, la Academia Americana de Pediatría y la OMS, escritas en pasos cortos. No incluye diagnósticos ni dosis de medicamentos, justamente para que no tengas que improvisar con tu bebé." },
  { q: "¿Esto reemplaza un curso de primeros auxilios o al pediatra?", a: "No, y no pretende hacerlo. Es el apoyo para los primeros segundos y para saber cuándo llamar a emergencias. Un curso presencial y tu pediatra siguen siendo lo ideal." },
  { q: "¿Puedo dárselo a la abuela o a la niñera?", a: "Sí. Es una contraseña compartida: quien cuide a tu bebé puede abrir las tarjetas desde su propio celular, y el bono incluye una hoja imprimible con qué hacer y cómo pedírselo sin ofender." },
];

function InstantAccessNote() {
  return (
    <div className="cta-notes">
      <p className="instant-access">
        <svg className="icon" aria-hidden="true"><use href="#i-mail" /></svg>
        Acceso inmediato en tu celular
      </p>
      <p className="instant-access guarantee-note">
        <svg className="icon" aria-hidden="true"><use href="#i-shield" /></svg>
        Garantía de {AUXILIOS_GUARANTEE_DAYS} días
      </p>
    </div>
  );
}

function CoveredList({ compact = false }: { compact?: boolean }) {
  return (
    <ul className={`covered${compact ? " compact" : ""}`}>
      {COVERED.map(({ label, Icon }) => (
        <li key={label} className="covered-item">
          <span className="covered-ico" aria-hidden="true"><Icon /></span>
          <span>{label}</span>
        </li>
      ))}
    </ul>
  );
}

/** Imagen del mecanismo: una tarjeta de 3 pasos al frente y dos más detrás. SVG propio, sin imágenes externas. */
function CardsMechanism() {
  return (
    <svg className="mech-svg" viewBox="0 0 560 352" role="img" aria-label="Tres notas amarillas tipo post-it apiladas; la de al frente muestra los 3 pasos: qué ver, qué hacer ya y cuándo llamar a emergencias. Junto a ellas, los iconos de Guía en PDF y de App para Android y Apple">
      <defs>
        <filter id="postit-shadow" x="-10%" y="-10%" width="125%" height="130%">
          <feDropShadow dx="0" dy="10" stdDeviation="9" floodColor="#7A5B00" floodOpacity="0.28" />
        </filter>
      </defs>
      <g fontFamily="'Plus Jakarta Sans', system-ui, sans-serif">
        <g transform="rotate(-8 130 180)" filter="url(#postit-shadow)"><rect x="12" y="44" width="236" height="232" rx="8" fill="#FFE27A" /><text x="36" y="92" fontSize="18" fontWeight="800" fill="#5C4400">Caídas</text></g>
        <g transform="rotate(8 430 180)" filter="url(#postit-shadow)"><rect x="312" y="44" width="236" height="232" rx="8" fill="#FFD84D" /><text x="524" y="92" fontSize="18" fontWeight="800" fill="#5C4400" textAnchor="end">Fiebre</text></g>
        <g filter="url(#postit-shadow)">
          <rect x="130" y="52" width="300" height="258" rx="8" fill="#FFF08A" />
          <path d="M430 270 L430 310 L390 310 Z" fill="#E9C93B" />
          <rect x="130" y="52" width="300" height="12" rx="6" fill="#FFE55C" />
          <circle cx="170" cy="105" r="22" fill="#FFFFFF" />
          <path d="M160 100h14a4 4 0 1 0-4-4M160 106h18a4 4 0 1 1-4 4M160 112h9" fill="none" stroke="#0F4C5C" strokeWidth="2.6" strokeLinecap="round" />
          <text x="204" y="112" fontSize="20" fontWeight="800" fill="#3D2F00">Atragantamiento</text>
          <circle cx="164" cy="166" r="15" fill="#0F4C5C" /><text x="164" y="172" fontSize="15" fontWeight="800" fill="#fff" textAnchor="middle">1</text>
          <text x="192" y="172" fontSize="18" fontWeight="700" fill="#3D2F00">Qué ver</text>
          <circle cx="164" cy="218" r="15" fill="#0F4C5C" /><text x="164" y="224" fontSize="15" fontWeight="800" fill="#fff" textAnchor="middle">2</text>
          <text x="192" y="224" fontSize="18" fontWeight="700" fill="#3D2F00">Qué hacer ya</text>
          <circle cx="164" cy="270" r="15" fill="#B93C1A" /><text x="164" y="276" fontSize="15" fontWeight="800" fill="#fff" textAnchor="middle">3</text>
          <text x="192" y="276" fontSize="18" fontWeight="700" fill="#B93C1A">Cuándo llamar</text>
        </g>
              <g filter="url(#postit-shadow)">
          <svg x="388" y="246" width="70" height="86" viewBox="0 0 70 86">
            <path d="M8 2h40l18 18v60a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4Z" fill="#E03A2F" />
            <path d="M48 2l18 18H52a4 4 0 0 1-4-4Z" fill="#9C231B" />
            <text x="35" y="62" fontSize="19" fontWeight="900" fill="#fff" textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif">PDF</text>
          </svg>
          <svg x="458" y="258" width="82" height="82" viewBox="0 0 512 512">
            <defs><linearGradient id="appg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3D8BFF" /><stop offset="1" stopColor="#1F4FE0" /></linearGradient></defs>
            <rect x="16" y="16" width="480" height="480" rx="110" fill="url(#appg)" />
            <g fill="#fff">
              <g transform="translate(58 70) scale(7.2)"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" /></g>
              <g transform="translate(262 92) scale(7.6)"><path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.2439 13.8533 7.8508 12 7.8508s-3.5902.3931-5.1367 1.0989L4.841 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3435-4.1021-2.6892-7.5743-6.1185-9.4396" /></g>
            </g>
            <text x="256" y="440" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="92" fill="#fff" textAnchor="middle" letterSpacing="6">APP</text>
          </svg>
        </g>
      </g>
    </svg>
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

function PriceOffer({ dark = false }: { dark?: boolean }) {
  return (
    <div className={`pc-discount${dark ? " on-dark" : ""}`}>
      <div className="pc-price">
        <span className="pc-old-price">${originalPrice} USD</span>
        <span className="amount">${price} USD</span>
      </div>
      <div className="pc-price-meta">
        <span className="unit">pago único</span>
        <span className="pc-discount-chip">-{discountPct}%</span>
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

const AuxiliosLp = () => {
  const abSessionIdRef = useRef<string | null>(null);
  const [returning] = useState(isReturningVisit);

  // Registra la visita en ab_sessions (insert-only para anon); el id se genera acá.
  useEffect(() => {
    const sid = uuid();
    abSessionIdRef.current = sid;
    fetch(`${SUPABASE_URL}/rest/v1/ab_sessions`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ id: sid, variants: { [AB_EXPERIMENT_KEY]: String(price) } }),
    }).catch(() => { /* no crítico */ });
  }, []);

  useEffect(() => {
    document.title = PAGE_TITLE;
  }, []);

  // PageView + ViewContent al cargar la landing.
  useEffect(() => {
    if (!AUXILIOS_PIXEL_ID) return;
    initMetaPixel(AUXILIOS_PIXEL_ID);
    trackMetaEvent("PageView", undefined, undefined, AUXILIOS_PIXEL_ID);
    trackMetaEvent("ViewContent", auxiliosEventParams(price), undefined, AUXILIOS_PIXEL_ID);
  }, []);

  // El checkout lo hostea Stripe (Payment Link): InitiateCheckout se dispara al clic en cualquier CTA, antes de salir.
  // El href es el link real (Ctrl/Cmd-clic y "abrir en pestaña nueva" funcionan solos); un clic normal se intercepta
  // para registrar el evento y guardar la atribución de Meta antes de ir a Stripe. Nada de tracking impide pagar.
  const paymentLink: string = AUXILIOS_PAYMENT_LINK;
  const checkoutHref = paymentLink ? auxiliosCheckoutUrl(paymentLink) : "#";

  const handleCheckoutClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    const opensElsewhere = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;
    if (!opensElsewhere) e.preventDefault();

    try {
      if (AUXILIOS_PIXEL_ID) trackMetaEvent("InitiateCheckout", auxiliosEventParams(price), undefined, AUXILIOS_PIXEL_ID);
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

    // Cookies de Meta del comprador → checkout_attribution; su id viaja a Stripe en client_reference_id y el
    // webhook lo usa en la Conversions API. Máximo 800 ms de espera (y 250 ms para que salgan pixel y ab_track).
    let attributionId: string | undefined;
    try {
      attributionId = uuid();
      await Promise.all([saveCheckoutAttribution(attributionId), new Promise((resolve) => setTimeout(resolve, 250))]);
    } catch {
      attributionId = undefined;
    }
    window.location.href = auxiliosCheckoutUrl(paymentLink, attributionId);
  };

  // Cuenta regresiva de la oferta: useLayoutEffect para no mostrar un instante el "30:00" del markup al refrescar.
  useLayoutEffect(() => {
    const textEls = document.querySelectorAll<HTMLElement>(".js-countdown");
    const barEls = document.querySelectorAll<HTMLElement>(".js-countdown-bar");
    if (!textEls.length && !barEls.length) return;
    const end = getOfferEnd(returning);
    const render = (): boolean => {
      const diff = end - Date.now();
      let text = "00:00";
      if (diff > 0) {
        const m = Math.floor(diff / 60000);
        const sec = Math.floor((diff % 60000) / 1000);
        text = `${m < 10 ? "0" + m : m}:${sec < 10 ? "0" + sec : sec}`;
      }
      textEls.forEach((el) => { el.textContent = text; });
      const pct = Math.max(0, Math.min(100, (diff / OFFER_DURATION_MS) * 100));
      barEls.forEach((el) => { el.style.width = `${pct}%`; });
      return diff > 0;
    };
    if (!render()) return;
    const timer = setInterval(() => { if (!render()) clearInterval(timer); }, 1000);
    return () => clearInterval(timer);
  }, [returning]);

  // CTA sticky móvil: aparece al pasar el hero.
  useEffect(() => {
    const trigger = document.getElementById("sticky-trigger-aux");
    const bar = document.querySelector(".aux-page .sticky-cta");
    if (!trigger || !bar || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.boundingClientRect.top < 0) bar.classList.add("is-visible");
        else bar.classList.remove("is-visible");
      });
    }, { threshold: 0 });
    observer.observe(trigger);
    return () => observer.disconnect();
  }, []);

  const Cta = ({ children, block = false }: { children: React.ReactNode; block?: boolean }) => (
    <a href={checkoutHref} onClick={handleCheckoutClick} className={`btn btn-primary${block ? " btn-block" : ""}`}>
      <svg className="btn-arrow" aria-hidden="true"><use href="#i-triangle-right" /></svg>{children}
    </a>
  );

  const sectionCta = (label: string) => (
    <div className="section-cta">
      <img src={`${IMG}/mockup-bundle.webp`} alt="Ebook, app y 3 bonos de Primeros Auxilios del Bebé" className="pack-mockup-img" width={1024} height={1024} loading="lazy" decoding="async" />
      <PriceOffer />
      <Cta>{label}</Cta>
      <InstantAccessNote />
      <PaymentIcons />
    </div>
  );

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet" />
      {AUXILIOS_PIXEL_ID && (
        <noscript>
          <img height="1" width="1" style={{ display: "none" }} src={`https://www.facebook.com/tr?id=${AUXILIOS_PIXEL_ID}&ev=PageView&noscript=1`} alt="" />
        </noscript>
      )}

      <style>{`
:root{
  --teal:#0F4C5C;
  --teal-dark:#0B3A47;
  --teal-soft:#E3F0F0;
  --coral:#E4572E;
  --cta:#B93C1A;
  --cta-dark:#9A3115;
  --peach:#FFE6DD;
  --butter:#FFF0C9;
  --mint:#DCF1E4;
  --cream:#FFF9F4;
  --cream-alt:#F7EFE4;
  --ink:#1E2A32;
  --ink-soft:#5C6770;
  --line:#EBE2D6;
  --ok:#2F7D55;
  --white:#FFFFFF;
  --sans:'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;
  --radius:22px;
  --shadow-soft:0 1px 2px rgba(30,42,50,.04),0 10px 30px -12px rgba(30,42,50,.16);
  --shadow-lift:0 2px 4px rgba(30,42,50,.06),0 22px 44px -18px rgba(30,42,50,.28);
  --maxw:1080px;
}
.aux-page *,.aux-page *::before,.aux-page *::after{box-sizing:border-box;}
.aux-page{scroll-behavior:smooth;}
@media (prefers-reduced-motion: reduce){
  .aux-page{scroll-behavior:auto;}
  .aux-page *,.aux-page *::before,.aux-page *::after{animation-duration:.01ms !important;animation-iteration-count:1 !important;transition-duration:.01ms !important;}
}
.aux-page{margin:0;background:var(--cream);color:var(--ink);font-family:var(--sans);font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:hidden;}
.aux-page a{color:inherit;}
.aux-page h1,.aux-page h2,.aux-page h3{font-family:var(--sans);color:var(--ink);margin:0;line-height:1.15;letter-spacing:-.02em;font-weight:800;}
.aux-page p{margin:0;}
.aux-page ul,.aux-page ol{margin:0;padding:0;list-style:none;}
.aux-page img{max-width:100%;}
.aux-page .container{max-width:var(--maxw);margin:0 auto;padding:0 20px;}
.aux-page section{padding:clamp(44px,7vw,88px) 0;}
.aux-page :focus-visible{outline:3px solid var(--teal);outline-offset:3px;}
.aux-page .icon{width:22px;height:22px;flex-shrink:0;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;}

/* Botones */
.aux-page .btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;font-family:var(--sans);font-weight:800;font-size:16px;padding:17px 30px;border-radius:14px;text-decoration:none;cursor:pointer;border:0;transition:transform 160ms ease,box-shadow 160ms ease,background-color 160ms ease;min-height:54px;text-align:left;}
@media(max-width:480px){.aux-page .btn{font-size:15px;padding:16px 20px;}}
.aux-page .btn-primary{background:var(--cta);color:var(--white);box-shadow:0 12px 26px -8px rgba(185,60,26,.55);}
.aux-page .btn-primary:hover{background:var(--cta-dark);transform:translateY(-2px);}
.aux-page .btn-primary:active{transform:translateY(0);}
.aux-page .btn-block{width:100%;}
.aux-page .btn-arrow{width:13px;height:13px;fill:currentColor;stroke:none;flex-shrink:0;transition:transform 160ms ease;}
.aux-page .btn-primary:hover .btn-arrow{transform:translateX(3px);}
.aux-page .instant-access{display:flex;align-items:center;justify-content:flex-start;gap:7px;margin-top:12px;font-size:13.5px;font-weight:600;color:var(--ink-soft);}
.aux-page .instant-access .icon{width:16px;height:16px;color:var(--teal);}
.aux-page .final-cta .instant-access{color:#CFE3E3;}
.aux-page .final-cta .instant-access .icon{color:#fff;}
.aux-page .pc-payment{margin-top:16px;text-align:left;}
.aux-page .pc-payment-label{display:block;font-size:12px;color:var(--ink-soft);margin-bottom:8px;}
.aux-page .pc-payment-icons{display:flex;justify-content:flex-start;align-items:center;gap:14px;flex-wrap:wrap;}
.aux-page .pay-icon{width:30px;height:30px;flex-shrink:0;fill:currentColor;stroke:none;color:var(--ink-soft);opacity:.85;}
.aux-page .pc-payment.on-dark .pc-payment-label{color:#CFE3E3;}
.aux-page .pc-payment.on-dark .pay-icon{color:#fff;opacity:1;}

.aux-page .kicker{display:inline-flex;align-items:center;gap:8px;font-weight:700;font-size:12px;letter-spacing:.04em;color:var(--teal);background:var(--teal-soft);padding:7px 14px;border-radius:999px;margin-bottom:18px;}

/* Hero */
.aux-page .hero{padding-top:clamp(36px,6vw,72px);padding-bottom:clamp(40px,7vw,88px);background:radial-gradient(circle at 0% 0%,var(--peach) 0,transparent 42%),radial-gradient(circle at 100% 100%,var(--mint) 0,transparent 40%),var(--cream);}
.aux-page .hero-grid{display:grid;grid-template-columns:1fr;gap:36px;align-items:center;}
@media(min-width:960px){.aux-page .hero-grid{grid-template-columns:1.05fr .95fr;gap:56px;}}
.aux-page .hero h1{font-size:clamp(30px,4.8vw,48px);}
.aux-page .hero h1 .accent{color:var(--cta);}
.aux-page .hl{color:var(--cta);background:linear-gradient(transparent 62%,rgba(228,87,46,.18) 62%);padding:0 2px;}
.aux-page .section-head.left.mech-head{max-width:none;margin-left:0;text-align:left;}
.aux-page .section-head.left.mech-head h2{max-width:40em;margin:0;text-align:left;}
.aux-page .section-head.left.mech-head h2{font-size:clamp(21px,2.9vw,29px);}
.aux-page .mech-name{display:inline;font-size:1.6em;line-height:1.18;letter-spacing:-.03em;font-weight:800;color:var(--cta);background:linear-gradient(transparent 70%,rgba(228,87,46,.22) 70%);padding:0 4px;-webkit-box-decoration-break:clone;box-decoration-break:clone;}
@media(max-width:560px){.aux-page .mech-name{font-size:1.38em;}}
.aux-page .hero .sub{margin-top:18px;font-size:17px;line-height:1.6;color:var(--ink-soft);max-width:54ch;}
.aux-page .hero-visual{border-radius:28px;overflow:hidden;box-shadow:var(--shadow-lift);background:#fff;}
.aux-page .hero-photo{width:100%;aspect-ratio:4/3;object-fit:cover;display:block;}

.aux-page .section-head{max-width:62ch;margin:0 0 36px;text-align:left;}
.aux-page .section-head.left{max-width:40em;margin-left:0;text-align:left;}
.aux-page .section-head h2{font-size:clamp(25px,3.6vw,36px);}
.aux-page .section-head p{margin-top:12px;font-size:17px;color:var(--ink-soft);}

/* Para ti */
.aux-page #para-ti{background:var(--teal);}
.aux-page #para-ti .section-head h2{color:var(--white);}
.aux-page .id-list{display:grid;grid-template-columns:1fr;gap:14px;}
@media(min-width:760px){.aux-page .id-list{grid-template-columns:1fr 1fr;}}
.aux-page .id-item{display:flex;gap:14px;align-items:flex-start;background:var(--white);border-radius:var(--radius);padding:20px 22px;box-shadow:var(--shadow-soft);}
.aux-page .id-item .icon-wrap{flex-shrink:0;width:40px;height:40px;border-radius:14px;background:var(--peach);display:flex;align-items:center;justify-content:center;}
.aux-page .id-item .icon{width:20px;height:20px;color:var(--cta);}
.aux-page .id-item p{font-size:16px;font-weight:600;min-width:0;}

.aux-page .no-es{margin:26px 0 0;max-width:62ch;font-size:17px;font-weight:600;color:#fff;}

/* Logro + producto */
.aux-page .deliver{background:var(--cream-alt);}
.aux-page .deliver-grid{display:grid;grid-template-columns:1fr;gap:40px;}
@media(min-width:960px){.aux-page .deliver-grid{grid-template-columns:1.05fr .95fr;align-items:start;}}
.aux-page .achieve-list{margin-top:26px;counter-reset:achieve;display:flex;flex-direction:column;gap:16px;}
.aux-page .achieve-item{display:flex;gap:14px;align-items:flex-start;}
.aux-page .achieve-item .icon-wrap{flex-shrink:0;width:32px;height:32px;border-radius:50%;background:var(--teal);display:flex;align-items:center;justify-content:center;margin-top:1px;}
.aux-page .achieve-item .icon-wrap::before{counter-increment:achieve;content:counter(achieve);color:#fff;font-size:15px;font-weight:800;line-height:1;}
.aux-page .achieve-item p{font-size:16.5px;min-width:0;}
.aux-page .product-card{background:var(--white);border-radius:28px;box-shadow:var(--shadow-lift);overflow:hidden;display:grid;grid-template-columns:1fr;max-width:980px;}
@media(min-width:860px){.aux-page .product-card{grid-template-columns:.85fr 1.15fr;}}
.aux-page .pc-visual{padding:12px;background:#FFEDE6;display:flex;align-items:center;}
.aux-page .pc-mockup-img{width:100%;aspect-ratio:1/1;object-fit:contain;display:block;}
.aux-page .product-card .pc-body{padding:26px 26px 30px;}
.aux-page .pc-name{font-size:22px;line-height:1.25;}
.aux-page .pc-tag{margin-top:8px;font-size:12.5px;color:var(--cta);font-weight:800;text-transform:uppercase;letter-spacing:.06em;}
.aux-page .pc-includes{margin-top:18px;display:flex;flex-direction:column;gap:10px;}
.aux-page .pc-includes li{display:flex;gap:10px;align-items:flex-start;font-size:14.5px;color:var(--ink-soft);min-width:0;}
.aux-page .pc-includes .icon{width:16px;height:16px;color:var(--ok);margin-top:3px;stroke-width:2.6;}
.aux-page .pc-discount{margin-top:22px;padding-top:20px;border-top:1px dashed var(--line);}
.aux-page .pc-edition-label{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--teal);margin-bottom:10px;}
.aux-page .pc-price{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;}
.aux-page .pc-price .pc-old-price{font-size:18px;font-weight:700;color:var(--ink-soft);text-decoration:line-through;}
.aux-page .pc-price .amount{font-size:40px;font-weight:800;color:var(--ink);white-space:nowrap;letter-spacing:-.03em;}
.aux-page .pc-price-meta{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:6px;}
.aux-page .pc-price-meta .unit{font-size:14px;color:var(--ink-soft);}
.aux-page .pc-discount-chip{display:inline-block;background:var(--butter);color:#7A4B00;font-size:13px;font-weight:800;padding:3px 11px;border-radius:999px;}
.aux-page .section-cta .pc-discount,.aux-page .final-cta .pc-discount{margin-top:0;padding-top:0;border-top:none;text-align:left;}
.aux-page .section-cta .pc-price-meta,.aux-page .final-cta .pc-price-meta{justify-content:flex-start;gap:16px;}
.aux-page .pc-discount.on-dark .pc-edition-label{color:#CFE3E3;}
.aux-page .pc-discount.on-dark .pc-price .pc-old-price{color:#A9C7C7;}
.aux-page .pc-discount.on-dark .pc-price .amount{color:var(--white);}
.aux-page .pc-discount.on-dark .pc-price-meta .unit{color:#CFE3E3;}
.aux-page .pc-cta{margin-top:20px;}

.aux-page .section-cta{margin:40px 0 0;padding:28px 24px;border-radius:var(--radius);max-width:440px;text-align:left;background:var(--white);box-shadow:var(--shadow-soft);}
.aux-page .section-cta .btn{width:100%;margin-top:20px;}
.aux-page .pack-mockup-img{width:100%;max-width:300px;object-fit:contain;display:block;margin:0 0 14px;}
.aux-page .final-mockup{margin:30px 0 0;max-width:340px;}

/* Bonos */
.aux-page .bonuses{background:var(--cream);}
.aux-page .bonus-head{display:flex;align-items:center;gap:16px;margin:0 0 36px;text-align:left;}
.aux-page .bonus-head h2{font-size:clamp(25px,3.6vw,36px);}
.aux-page .bonus-head p{margin-top:6px;font-size:17px;color:var(--ink-soft);}
.aux-page .gift-badge{flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:20px;background:var(--butter);}
.aux-page .gift-badge .icon{width:28px;height:28px;color:#7A4B00;}
.aux-page .bonus-grid{display:grid;grid-template-columns:1fr;gap:20px;}
@media(min-width:760px){.aux-page .bonus-grid{grid-template-columns:repeat(3,1fr);}}
.aux-page .bonus-card{background:var(--white);border-radius:var(--radius);box-shadow:var(--shadow-soft);overflow:hidden;display:flex;flex-direction:column;}
.aux-page .bonus-visual{padding:14px 14px 0;background:linear-gradient(180deg,var(--mint),var(--white));}
.aux-page .bonus-mockup-img{width:100%;aspect-ratio:1/1;object-fit:contain;display:block;}
.aux-page .bonus-body{padding:18px 20px 24px;}
.aux-page .bonus-num{display:inline-block;font-size:12px;font-weight:800;letter-spacing:.06em;color:#7A4B00;background:var(--butter);padding:4px 12px;border-radius:999px;margin-bottom:10px;text-transform:uppercase;}
.aux-page .bonus-body h3{font-size:18px;line-height:1.25;}
.aux-page .bonus-empathy{margin-top:8px;font-size:14px;font-weight:600;color:var(--cta);}
.aux-page .bonus-body ul{margin-top:12px;display:flex;flex-direction:column;gap:8px;}
.aux-page .bonus-body li{display:flex;gap:9px;align-items:flex-start;font-size:14px;color:var(--ink-soft);min-width:0;}
.aux-page .bonus-body .icon{width:15px;height:15px;color:var(--ok);margin-top:3px;stroke-width:2.6;}

/* Facilidad */
.aux-page .ease-grid{display:grid;grid-template-columns:1fr;gap:16px;}
@media(min-width:760px){.aux-page .ease-grid{grid-template-columns:repeat(3,1fr);}}
.aux-page .ease-card{display:flex;gap:14px;align-items:flex-start;background:var(--white);border-radius:var(--radius);padding:22px 20px;box-shadow:var(--shadow-soft);}
.aux-page .ease-card .icon-wrap{flex-shrink:0;width:46px;height:46px;border-radius:16px;background:var(--teal);display:flex;align-items:center;justify-content:center;}
.aux-page .ease-card .icon{width:22px;height:22px;color:#fff;}
.aux-page .ease-card h3{font-size:16.5px;}
.aux-page .ease-card p{margin-top:6px;font-size:14px;color:var(--ink-soft);}

/* Mecanismo: imagen y emergencias que cubre */
.aux-page .mech-svg{display:block;width:100%;max-width:560px;height:auto;margin:6px 0 30px;}
.aux-page .mech-copy{max-width:56ch;margin:0 0 30px;font-size:17px;line-height:1.6;color:var(--ink);}
.aux-page .mech-copy strong{color:var(--cta);}
.aux-page .covered-title{font-size:18px;margin:0 0 14px;}
.aux-page .covered{display:grid;grid-template-columns:1fr;gap:10px;margin-bottom:6px;}
@media(min-width:480px){.aux-page .covered{grid-template-columns:1fr 1fr;}}
@media(min-width:760px){.aux-page .covered{grid-template-columns:repeat(3,1fr);}}
.aux-page .covered-item span:last-child{min-width:0;overflow-wrap:anywhere;}
.aux-page .covered-item{display:flex;align-items:center;gap:12px;background:var(--teal-soft);border-radius:18px;padding:12px 14px;font-weight:700;font-size:15px;line-height:1.25;color:var(--ink);min-width:0;}
.aux-page .covered-ico{flex-shrink:0;width:38px;height:38px;border-radius:12px;background:#fff;color:var(--teal);display:flex;align-items:center;justify-content:center;}
.aux-page .covered-ico svg{width:21px;height:21px;}
.aux-page .covered.compact{grid-template-columns:1fr;gap:8px;margin:14px 0 0;}
@media(min-width:520px){.aux-page .covered.compact{grid-template-columns:1fr 1fr;}}
.aux-page .covered.compact .covered-item{padding:8px 10px;font-size:13px;border-radius:14px;gap:9px;}
.aux-page .covered.compact .covered-ico{width:30px;height:30px;border-radius:10px;}
.aux-page .covered.compact .covered-ico svg{width:17px;height:17px;}
.aux-page .pc-covers-label{margin-top:18px;font-size:13px;font-weight:800;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em;}

/* Solo los textos de las cards de CTA van centrados; el resto, a la izquierda */
.aux-page .section-cta,.aux-page .section-cta *,.aux-page .pc-cta,.aux-page .pc-cta *,.aux-page .product-card .pc-discount,.aux-page .final-cta .cta-wrap,.aux-page .final-cta .cta-wrap *{text-align:center;}
.aux-page .section-cta .instant-access,.aux-page .pc-cta .instant-access,.aux-page .final-cta .cta-wrap .instant-access,.aux-page .section-cta .pc-payment-icons,.aux-page .pc-cta .pc-payment-icons,.aux-page .final-cta .cta-wrap .pc-payment-icons,.aux-page .section-cta .pc-price,.aux-page .section-cta .pc-price-meta,.aux-page .product-card .pc-price,.aux-page .product-card .pc-price-meta,.aux-page .final-cta .pc-price,.aux-page .final-cta .pc-price-meta{justify-content:center;}
.aux-page .cta-notes{margin-top:12px;display:flex;flex-direction:column;gap:6px;}
.aux-page .cta-notes .instant-access{margin-top:0;}
.aux-page .cta-notes .guarantee-note{font-weight:800;color:var(--teal);font-size:14.5px;}
.aux-page .final-cta .cta-notes .guarantee-note{color:#fff;}

/* Contador y barra en reversa (como /toefl) */
.aux-page .pc-timer{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:16px;padding:12px 14px;border-radius:14px;background:#FFEDE6;color:var(--cta-dark);font-size:13.5px;font-weight:700;text-align:center;}
.aux-page .pc-timer .icon{width:18px;height:18px;color:var(--cta);}
.aux-page .pc-timer strong{font-variant-numeric:tabular-nums;font-size:15px;}
.aux-page .pc-progress{margin-top:12px;}
.aux-page .pc-progress-bar{width:100%;height:10px;border-radius:999px;background:#F3E6DC;overflow:hidden;}
.aux-page .pc-progress-fill{width:100%;height:100%;border-radius:999px;background-color:var(--cta);background-image:repeating-linear-gradient(45deg,rgba(255,255,255,.28) 0 10px,transparent 10px 20px);background-size:28px 28px;animation:pc-stripes 1s linear infinite;transition:width 1s linear;}
@keyframes pc-stripes{from{background-position:0 0;}to{background-position:28px 0;}}
@media (prefers-reduced-motion: reduce){.aux-page .pc-progress-fill{animation:none;}}
.aux-page .pc-discount.on-dark .pc-timer{background:rgba(255,255,255,.1);color:#fff;}
.aux-page .pc-discount.on-dark .pc-timer .icon{color:#fff;}
.aux-page .pc-discount.on-dark .pc-progress-bar{background:rgba(255,255,255,.14);}
.aux-page .sticky-text{flex-shrink:0;display:flex;flex-direction:column;gap:1px;}
.aux-page .sticky-timer{font-size:11px;font-weight:700;color:var(--cta-dark);white-space:nowrap;}
.aux-page .sticky-timer strong{font-variant-numeric:tabular-nums;}

/* FAQ */
.aux-page .faq{max-width:800px;margin:0;}
.aux-page .faq details{background:var(--white);border-radius:18px;box-shadow:var(--shadow-soft);padding:4px 22px;margin-bottom:12px;}
.aux-page .faq summary{list-style:none;cursor:pointer;padding:16px 0;font-weight:700;font-size:16px;display:flex;justify-content:space-between;align-items:center;gap:16px;}
.aux-page .faq summary::-webkit-details-marker{display:none;}
.aux-page .faq summary .chev{width:20px;height:20px;color:var(--teal);flex-shrink:0;transition:transform 200ms ease;}
.aux-page .faq details[open] summary .chev{transform:rotate(180deg);}
.aux-page .faq .faq-a{padding:0 0 18px;font-size:15px;color:var(--ink-soft);}

/* CTA final */
.aux-page .final-cta{background:linear-gradient(180deg,var(--teal) 0%,var(--teal-dark) 100%);color:var(--cream);text-align:left;}
.aux-page .final-cta h2{color:var(--white);font-size:clamp(26px,4vw,38px);}
.aux-page .final-cta .sub{margin:14px 0 0;font-size:17px;color:#CFE3E3;max-width:54ch;}
.aux-page .final-cta .cta-wrap{margin:30px 0 0;max-width:420px;}
.aux-page .final-cta .btn{margin-top:20px;}

/* Footer */
.aux-page footer{background:#10181D;padding:28px 0 110px;}
.aux-page footer .container{text-align:left;}
.aux-page footer .fdisclaimer{font-size:12px;color:#4A555E;max-width:72ch;margin:0;}

/* Sticky móvil */
.aux-page .sticky-cta{display:none;position:fixed;left:0;right:0;bottom:0;z-index:50;background:rgba(255,255,255,.96);backdrop-filter:blur(10px);border-top:1px solid var(--line);box-shadow:0 -8px 24px rgba(0,0,0,.10);padding:10px 14px;padding-bottom:calc(10px + env(safe-area-inset-bottom));}
.aux-page .sticky-cta-inner{display:flex;align-items:center;gap:12px;}
.aux-page .sticky-thumb{flex-shrink:0;width:42px;height:42px;border-radius:12px;overflow:hidden;background:var(--peach);display:flex;align-items:center;justify-content:center;}
.aux-page .sticky-thumb-img{width:100%;height:100%;object-fit:contain;}
.aux-page .sticky-price{font-size:15px;font-weight:800;white-space:nowrap;flex-shrink:0;}
.aux-page .sticky-price .old{font-weight:600;color:var(--ink-soft);text-decoration:line-through;margin-right:5px;font-size:13px;}
.aux-page .sticky-btn{flex:1;min-width:0;padding:14px 12px;font-size:14.5px;line-height:1.2;min-height:50px;}
.aux-page #sticky-trigger-aux{height:1px;}
@media(max-width:760px){
  .aux-page .sticky-cta.is-visible{display:block;}
  .aux-page{padding-bottom:0;}
}

      `}</style>

      <div className="aux-page">
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
          <symbol id="i-check" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></symbol>
          <symbol id="i-mail" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" /><polyline points="3 7 12 13 21 7" /></symbol>
          <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 16 14" /></symbol>
          <symbol id="i-chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9" /></symbol>
          <symbol id="i-play" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><polygon points="10 8 16 12 10 16" /></symbol>
          <symbol id="i-users" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.6" /><path d="M16.5 14.2c2.6.3 4.5 2.4 4.5 5.1" /></symbol>
          <symbol id="i-phone" viewBox="0 0 24 24"><rect x="7" y="2" width="10" height="20" rx="2.5" /><line x1="11" y1="18.5" x2="13" y2="18.5" /></symbol>
          <symbol id="i-heart" viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" /></symbol>
          <symbol id="i-card" viewBox="0 0 24 24"><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><line x1="2.5" y1="10" x2="21.5" y2="10" /></symbol>
          <symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 3 4.5 6v5.5c0 4.4 3 8 7.5 9.5 4.5-1.5 7.5-5.1 7.5-9.5V6Z" /><polyline points="9 12 11.2 14.2 15.2 10" /></symbol>
          <symbol id="i-layers" viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="3" /><line x1="8" y1="9" x2="16" y2="9" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="12" y2="17" /></symbol>
          <symbol id="i-triangle-right" viewBox="0 0 24 24"><path d="M7 4v16l14-8z" fill="currentColor" stroke="none" /></symbol>
          <symbol id="i-gift" viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="4" rx="1" /><rect x="4" y="12" width="16" height="9" rx="1" /><line x1="12" y1="8" x2="12" y2="21" /><path d="M12 8c0-2.5-1.6-4.5-3.5-4.5S6 4.8 6 6c0 1.6 2 2 6 2Z" /><path d="M12 8c0-2.5 1.6-4.5 3.5-4.5S18 4.8 18 6c0 1.6-2 2-6 2Z" /></symbol>
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
              <span className="kicker">Para mamás y papás de bebés de 0 a 12 meses</span>
              <h1>Si tu bebé tiene una emergencia, ¿sabrías qué hacer en los <span className="accent">primeros 30 segundos</span>?</h1>
              <p className="sub">Viste videos, guardaste capturas y le preguntaste al grupo de mamás. Pero cuando imaginas el momento real, sientes que te quedarías en blanco. No es falta de cuidado: nadie te enseñó a reaccionar con el miedo encima.</p>
            </div>

            <div className="hero-visual">
              <img src={`${IMG}/hero-antes-despues.webp`} alt="Antes: una mamá angustiada con el bebé llorando y sin saber qué hacer. Después: la misma mamá tranquila, con el celular en la mano y el bebé seguro" className="hero-photo" width={1400} height={1050} decoding="async" />
            </div>
          </div>
        </header>

        {/* ============ ESTO ES PARA TI SI... ============ */}
        <section id="para-ti">
          <div className="container">
            <div className="section-head">
              <h2>¿Te Ha Pasado Antes?</h2>
            </div>
            <ul className="id-list">
              {PARA_TI.map((item, i) => (
                <li className="id-item" key={i}>
                  <span className="icon-wrap"><svg className="icon" aria-hidden="true"><use href={`#${item.icon}`} /></svg></span>
                  <p>{item.text}</p>
                </li>
              ))}
            </ul>
            <p className="no-es">Si ya probaste todo eso y sigues con ese nudo en el estómago, respira: no es tu culpa. Nadie te enseñó a reaccionar cuando el corazón se acelera. Existe una forma más fácil.</p>
          </div>
        </section>

        {/* ============ MECANISMO + VENTAJAS (sin revelar el formato) ============ */}
        <section className="deliver" id="mecanismo">
          <div className="container">
            <div className="section-head left mech-head">
              <h2>La forma más fácil de saber qué hacer en los <span className="hl">primeros 30 segundos</span> de una emergencia es usar...<br /><span className="mech-name">Una Guía con Tarjetas Rápidas de 3 Pasos para Emergencias Comunes</span></h2>
            </div>
            <CardsMechanism />
            <p className="mech-copy">En una emergencia, con el susto, nadie piensa con claridad. Por eso <strong>los videos de YouTube y las capturas que guardaste</strong> no te sirven. Con nuestra guía en PDF y la App, tendrás <strong>tarjetas rápidas de 3 pasos</strong> para que no tengas que recordar nada: las abres en tu celular, ves qué hacer de un vistazo y actúas.</p>
            <h3 className="covered-title">Las emergencias que cubre:</h3>
            <CoveredList />
            <ol className="achieve-list">
              {LOGROS.map((text, i) => (
                <li className="achieve-item" key={i}>
                  <span className="icon-wrap" aria-hidden="true" />
                  <p>{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ============ OFERTA: aquí recién se revela el formato ============ */}
        <div id="sticky-trigger-aux" />
        <section id="producto">
          <div className="container">
            <aside className="product-card">
              <div className="pc-visual">
                <img src={`${IMG}/mockup-mini-bundle.webp`} alt="Ebook en PDF y app de Primeros Auxilios del Bebé en un celular" className="pc-mockup-img" width={1024} height={1024} loading="lazy" decoding="async" />
              </div>
              <div className="pc-body">
                <h3 className="pc-name">Primeros Auxilios del Bebé (0 a 12 Meses)</h3>
                <p className="pc-tag">Guía en PDF y App para Celular: Tarjetas de 3 Pasos para Emergencias Comunes · Edición 2026</p>
                <p className="pc-covers-label">Cubre estas emergencias:</p>
                <CoveredList compact />
                <ul className="pc-includes">
                  {INCLUYE.map((t) => (
                    <li key={t}><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg><span>{t}</span></li>
                  ))}
                </ul>
                <PriceOffer />
                <div className="pc-cta">
                  <Cta block>Sí, Quiero Mi Guía + App</Cta>
                  <InstantAccessNote />
                  <PaymentIcons />
                </div>
              </div>
            </aside>
          </div>
        </section>

        {/* ============ BONOS ============ */}
        <section className="bonuses" id="bonos">
          <div className="container">
            <div className="bonus-head">
              <span className="gift-badge"><svg className="icon" aria-hidden="true"><use href="#i-gift" /></svg></span>
              <div>
                <h2>Además, Incluye 3 Bonos</h2>
                <p>Para los momentos que nadie te cuenta que van a llegar.</p>
              </div>
            </div>
            <div className="bonus-grid">
              {BONOS.map((b) => (
                <article className="bonus-card" key={b.n}>
                  <div className="bonus-visual">
                    <img src={`${IMG}/${b.img}`} alt={`Bono ${b.n}: ${b.title}`} className="bonus-mockup-img" width={1024} height={1024} loading="lazy" decoding="async" />
                  </div>
                  <div className="bonus-body">
                    <span className="bonus-num">Bono {b.n} · Incluido</span>
                    <h3>{b.title}</h3>
                    <p className="bonus-empathy">{b.empathy}</p>
                    <ul>
                      {b.points.map((p) => (
                        <li key={p}><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg><span>{p}</span></li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
            </div>
            {sectionCta("Quiero la Guía + App con los 3 Bonos")}
          </div>
        </section>

        {/* ============ FACILIDAD DE COMIENZO ============ */}
        <section id="como-empiezo">
          <div className="container">
            <div className="section-head">
              <h2>Empiezas Hoy, en 3 Pasos</h2>
            </div>
            <div className="ease-grid">
              {PASOS.map((p) => (
                <div className="ease-card" key={p.title}>
                  <span className="icon-wrap"><svg className="icon" aria-hidden="true"><use href={`#${p.icon}`} /></svg></span>
                  <div>
                    <h3>{p.title}</h3>
                    <p>{p.text}</p>
                  </div>
                </div>
              ))}
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
              {FAQ.map((f) => (
                <details key={f.q}>
                  <summary>{f.q} <svg className="icon chev" aria-hidden="true"><use href="#i-chevron" /></svg></summary>
                  <p className="faq-a">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ============ CTA FINAL ============ */}
        <section className="final-cta">
          <div className="container">
            <h2>La Próxima Emergencia, No Tendrás Que Acordarte de Nada</h2>
            <p className="sub">Si pasa una emergencia, solo abres la tarjeta correcta. Tenla lista hoy, antes de necesitarla.</p>
            <div className="final-mockup">
              <img src={`${IMG}/mockup-bundle.webp`} alt="Ebook, app y 3 bonos de Primeros Auxilios del Bebé" className="pack-mockup-img" width={1024} height={1024} loading="lazy" decoding="async" />
            </div>
            <div className="cta-wrap">
              <PriceOffer dark />
              <Cta block>Sí, Quiero Mi Guía + App Ahora</Cta>
              <InstantAccessNote />
              <PaymentIcons dark />
            </div>
          </div>
        </section>

        {/* ============ FOOTER ============ */}
        <footer>
          <div className="container">
            <p className="fdisclaimer">Material educativo. No sustituye un curso presencial de primeros auxilios, la consulta con un profesional de la salud ni a los servicios de emergencia, y no da diagnósticos ni dosis de medicamentos. Ante una emergencia real, llama de inmediato a los servicios de emergencia de tu país. Basado en guías públicas de la Cruz Roja, la AAP y la OMS; este producto no está afiliado a estas organizaciones.</p>
                      </div>
        </footer>

        {/* ============ CTA STICKY MOBILE ============ */}
        <div className="sticky-cta">
          <div className="sticky-cta-inner">
            <div className="sticky-thumb">
              <img src={`${IMG}/mockup-bundle.webp`} alt="" className="sticky-thumb-img" />
            </div>
            <span className="sticky-text"><span className="sticky-price"><span className="old">${originalPrice}</span>${price} USD</span><span className="sticky-timer">Termina en <strong className="js-countdown">30:00</strong></span></span>
            <a href={checkoutHref} onClick={handleCheckoutClick} className="btn btn-primary sticky-btn"><svg className="btn-arrow" aria-hidden="true"><use href="#i-triangle-right" /></svg>Quiero Mi Guía + App</a>
          </div>
        </div>
      </div>
    </>
  );
};

export default AuxiliosLp;
