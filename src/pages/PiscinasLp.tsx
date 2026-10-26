import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon, LangFlags, PaymentIcons, PiscinasIcons, PiscinasImage, TrustRow, UsFlag } from "@/components/piscinas/PiscinasShared";
import { BrandPostArt, CallArt, OfferTagArt, ReelArt } from "@/components/piscinas/PiscinasLogrosArt";
import { MegaphoneArt, RingingPhoneArt, WaitingChatArt } from "@/components/piscinas/PiscinasParaTiArt";
import { PIS_CAL_CSS, PIS_CSS, PIS_FONT_HREF } from "@/components/piscinas/piscinasStyles";
import { PIS_LP1_CSS, PIS_LP1_FONT_HREF } from "@/components/piscinas/piscinasLp1Styles";
import { CheckoutArt, FacilTitle, GuaranteeBadge, PhoneDownloadArt, PublishTapArt } from "@/components/piscinas/PiscinasProcessArt";
import { startKitCheckout } from "@/lib/piscinasCheckout";
import { initMetaPixel, trackMetaEvent } from "@/lib/metaPixel";
import {
  PISCINAS_GUARANTEE_DAYS,
  PISCINAS_IMG as IMG,
  PISCINAS_LIST_PRICE,
  PISCINAS_PAYMENT_LINK,
  PISCINAS_PIXEL_ID,
  PISCINAS_PRICE,
  PISCINAS_PRODUCT_SLUG,
  PISCINAS_SUPPORT_EMAIL,
  piscinasCheckoutUrl,
  piscinasEventParams,
} from "@/lib/piscinasConfig";
import { AB_CHECKOUT_SESSION_KEY, AB_KIT_EXPERIMENT, registerAbSession, trackAbClick } from "@/lib/piscinasFunnel";
import { sendProductServerEvent } from "@/lib/productServerEvents";
import { uuid } from "@/lib/uuid";

// Landing de «Kit Llena tu Calendario de Piscinas» — /piscinas-lp. Una sola versión. Misma estructura que
// /toefl y /auxilios-lp: hero sin CTA, «Esto es para ti si…», resultados + tarjeta de producto con
// precio, «Dentro del kit», «No importa cuánto sepas hoy», proceso de compra y entrega, FAQ, CTA final
// y CTA sticky móvil. Copy literal de Info/copy-landings.md. Sin testimonios, cifras ni escasez inventados.
//
// Pixel de Meta / API de Conversiones: PENDIENTES (PISCINAS_PIXEL_ID = ""). Con el pixel vacío, esta
// página no inicializa nada ni dispara eventos; la estructura de eventos ya está lista (ver
// docs/piscinas-lanzamiento.md, sección «PENDIENTE: Pixel de Meta + API de Conversiones»).

const PAGE_TITLE = "Kit Llena tu Calendario de Piscinas | Publicaciones, Ofertas, Reels y Guía de Llamadas";

const price = PISCINAS_PRICE;
const listPrice = PISCINAS_LIST_PRICE;
const PRICE_LABEL = `US$${price}`;
const CTA_LABEL = "Quiero Llenar mi Calendario";

// Interruptores de la UI de confianza. Precio de lista tachado: lo define Daniel (LIST_PRICE vacío = no se muestra).
// Cronómetro: apagado (no hay escasez real definida). No lo actives sin una oferta con fecha de fin real.
const SHOW_TIMER = false;
const SHOW_LIST_PRICE = false;
const showListPrice = SHOW_LIST_PRICE && listPrice !== null && listPrice > price;

const OFFER_DURATION_MS = 30 * 60 * 1000;
const OFFER_END_KEY = "piscinas_offer_end";

function getOfferEnd(): number {
  try {
    const stored = Number(localStorage.getItem(OFFER_END_KEY));
    if (Number.isFinite(stored) && stored > 0) return stored;
    const end = Date.now() + OFFER_DURATION_MS;
    localStorage.setItem(OFFER_END_KEY, String(end));
    return end;
  } catch {
    return Date.now() + OFFER_DURATION_MS;
  }
}

const PARA_TI: { icon: string; art: React.ReactNode; text: string }[] = [
  { icon: "i-chat", art: <WaitingChatArt />, text: "Intentas publicar en Facebook o Instagram, pero nadie te llama." },
  { icon: "i-megaphone", art: <MegaphoneArt />, text: "No sabes qué publicar ni qué oferta lanzar para atraer clientes nuevos." },
  { icon: "i-phone", art: <RingingPhoneArt />, text: "Te llaman preguntando el precio y no sabes cómo cerrar la venta." },
];

const LOGRO_ARTS: React.ReactNode[] = [<BrandPostArt key="a" />, <OfferTagArt key="b" />, <ReelArt key="c" />, <CallArt key="d" />];

const LOGROS: React.ReactNode[] = [
  <><strong>Publicar con tu marca desde el primer día.</strong> Eliges entre 60 diseños, pones tu logo, tu ciudad y tu teléfono, y los subes en minutos.</>,
  <><strong>Lanzar una oferta que sí puedes cumplir.</strong> Escoges entre 10 ofertas para nuevos clientes, con su costo para ti, para no regalar tu trabajo.</>,
  <><strong>Grabar tu primer video reel viral.</strong> Solo lees el guion que te daremos y grabas con tu celular.</>,
  <><strong>Contestar llamadas sin improvisar.</strong> Sabrás qué frases exactas usar para cada pregunta y cada objeción, hasta cerrar la venta.</>,
];

const INCLUYE: string[] = [
  "60 publicaciones para Facebook e Instagram (30 en español y 30 en inglés), con su copy y hashtags",
  "10 ofertas promocionales para nuevos clientes",
  "15 ideas de videos Reels virales con guiones ya hechos",
  "Guía para cerrar ventas en llamada",
];

const MOCKS: { img: string; title: string }[] = [
  { img: "mockup-1-publicaciones.png", title: "60 Publicaciones en Inglés y Español" },
  { img: "mockup-2-ofertas.png", title: "10 Ofertas para ofrecer a tus nuevos clientes" },
  { img: "mockup-3-reels.png", title: "15 Ideas de Reels" },
  { img: "mockup-4-guia-llamada.png", title: "Guía para Cerrar Ventas en Llamada" },
];

const FACILIDAD: { icon: string; kind: "designer" | "langs" | "marketing"; text: string }[] = [
  { icon: "i-wrench", kind: "designer", text: "Cambias tu logo, ciudad y teléfono en Canva (gratis) o en el editor de tu celular." },
  { icon: "i-globe", kind: "langs", text: "Cada publicación, oferta, guion y mensaje viene en español y en inglés." },
  { icon: "i-megaphone", kind: "marketing", text: "Las publicaciones, las ofertas y los guiones ya vienen hechos: tú solo los personalizas y los publicas." },
];

const PASOS: { title: string; text: string; art: React.ReactNode }[] = [
  { title: "Ve al pago seguro.", text: "Elige tu método de pago y completa la compra.", art: <CheckoutArt /> },
  { title: "Descarga tu kit.", text: "Al terminar te llevamos a la página de descarga, y el enlace también te llega por correo.", art: <PhoneDownloadArt /> },
  { title: "Empieza hoy.", text: "Publica tu primer post y anuncio. Graba tu primer Reel y Cierra más ventas.", art: <PublishTapArt /> },
];

const FAQ: { q: string; a: string }[] = [
  { q: "No sé nada de marketing ni de diseño, ¿igual me sirve?", a: "Sí, justo para eso es. Las publicaciones, las ofertas y los guiones ya vienen hechos: abres la imagen, cambias tu logo, tu ciudad y tu teléfono, y publicas. La guía del kit te lo explica paso a paso." },
  { q: "Ya publiqué antes y no me funcionó, ¿qué cambia con este kit?", a: "No empiezas de cero: cada publicación viene con su texto y su botón, tienes ofertas pensadas para nuevos clientes y una guía que te dice qué decir cuando alguien te escribe o te llama. Publicar sin una oferta y sin saber cerrar la conversación es lo que suele fallar." },
  { q: "¿Cómo edito las imágenes?", a: "Son PNG de 1080 × 1080 con espacios vacíos para tu logo, nombre, ciudad, teléfono y botón. Se editan en Canva (gratis), PowerPoint o el editor de tu celular." },
  { q: "Mis clientes hablan inglés, ¿viene en inglés?", a: "Sí. Cada pieza trae su versión en español y su versión en inglés, para que uses la que mejor le hable a cada cliente." },
  { q: "¿Tengo que pagar anuncios para usarlo?", a: "No. Las publicaciones, las ofertas y los guiones los usas gratis en tus redes. Los anuncios pagados son opcionales; si después quieres que armemos tus campañas, lo podemos hacer con un plan adicional." },
  { q: "¿Cómo pido el reembolso si no me sirve?", a: "Tenemos equipo de soporte. Nos escribes dentro de los 30 días y te devolvemos tu dinero." },
  { q: "¿Cuándo recibo el kit?", a: "Al instante: pagas y descargas." },
];

function PriceBlock({ strike = false }: { strike?: boolean }) {
  return (
    <div className="pc-price-block">
      <div className="pc-price">
        {(showListPrice || (listPrice !== null && listPrice > price)) && <span className="old">US${listPrice}</span>}
        <span className="amount">{PRICE_LABEL}</span>
        <span className="pc-unit">pago único</span>
      </div>
      {SHOW_TIMER && (
        <div className="pc-offer-end">
          <p className="pc-offer-text"><Icon name="i-clock" />Asegura este precio: te quedan <strong className="js-countdown">30:00</strong></p>
          <div className="pc-progress-bar" aria-hidden="true"><div className="pc-progress-fill js-countdown-bar" /></div>
        </div>
      )}
    </div>
  );
}

const PiscinasLp = () => {
  const abSessionIdRef = useRef<string | null>(null);
  const [heroVisual, setHeroVisual] = useState(true);

  // Registra la visita en ab_sessions (insert-only para anon).
  useEffect(() => {
    abSessionIdRef.current = registerAbSession(AB_KIT_EXPERIMENT, String(price));
  }, []);

  useEffect(() => {
    document.title = PAGE_TITLE;
  }, []);

  // PageView + ViewContent al cargar la landing. Con PIXEL_ID vacío no hace nada.
  useEffect(() => {
    if (!PISCINAS_PIXEL_ID) return;
    initMetaPixel(PISCINAS_PIXEL_ID);
    trackMetaEvent("PageView", undefined, undefined, PISCINAS_PIXEL_ID);
    // Mismo event_id en navegador y servidor (Conversions API): Meta cuenta un solo ViewContent.
    const eventId = uuid();
    trackMetaEvent("ViewContent", piscinasEventParams(price), eventId, PISCINAS_PIXEL_ID);
    void sendProductServerEvent({ product: PISCINAS_PRODUCT_SLUG, event: "ViewContent", eventId, waitForFbpMs: 1500 });
  }, []);

  // InitiateCheckout (cuando haya pixel) y clic en ab_sessions al hacer clic en cualquier CTA, antes de salir a Stripe.
  // El href es el link real (Ctrl/Cmd-clic funciona solo); un clic normal se intercepta para registrar el evento y guardar
  // la atribución de Meta. Con el link vacío solo se registra el clic y no se navega. Nada de tracking impide pagar.
  const paymentLink: string = PISCINAS_PAYMENT_LINK;
  const checkoutHref = paymentLink ? piscinasCheckoutUrl(paymentLink) : "#";

  const handleCheckoutClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    const opensElsewhere = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;
    if (!opensElsewhere) e.preventDefault();

    try {
      if (PISCINAS_PIXEL_ID) {
        const eventId = uuid();
        trackMetaEvent("InitiateCheckout", piscinasEventParams(price), eventId, PISCINAS_PIXEL_ID);
        void sendProductServerEvent({ product: PISCINAS_PRODUCT_SLUG, event: "InitiateCheckout", eventId });
      }
      const sid = abSessionIdRef.current;
      if (sid) {
        try { localStorage.setItem(AB_CHECKOUT_SESSION_KEY, sid); } catch { /* no crítico */ }
        trackAbClick(sid);
      }
    } catch { /* no crítico */ }

    if (opensElsewhere || !paymentLink) return;

    // Atribución de Meta + checkout del servidor que guarda la tarjeta (cobro en un clic de los upsells); si la función
    // falla o tarda, va al Payment Link normal. Toda la lógica vive en src/lib/piscinasCheckout.ts.
    await startKitCheckout();
  };

  // Cuenta regresiva (solo si SHOW_TIMER está activo).
  useLayoutEffect(() => {
    if (!SHOW_TIMER) return;
    const textEls = document.querySelectorAll<HTMLElement>(".js-countdown");
    const barEls = document.querySelectorAll<HTMLElement>(".js-countdown-bar");
    if (!textEls.length && !barEls.length) return;
    const end = getOfferEnd();
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
  }, []);

  // CTA sticky móvil: aparece al pasar la sección de la tarjeta de producto.
  useEffect(() => {
    const trigger = document.getElementById("sticky-trigger-pis");
    const bar = document.querySelector(".pis-page .sticky-cta");
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

  const cta = (extraClass = "", label?: string) => (
    <a href={checkoutHref} onClick={handleCheckoutClick} className={`btn btn-primary${extraClass}`}>
      <svg className="btn-arrow" aria-hidden="true"><use href="#i-triangle-right" /></svg>
      <span className="btn-label">{label ?? CTA_LABEL}</span>
    </a>
  );


  // CTA de sección: mockup del bundle, precio, botón (texto coherente con la sección) y confianza de pago.
  const sectionCta = (label: string) => (
    <div className="cta-card section-cta">
      <PiscinasImage src={`${IMG}/mockup-bundle.png`} alt="Kit Llena tu Calendario de Piscinas: guías y anuncios editables" className="pc-mockup-img" wrapperClass="pc-visual cta-mockup" width={1024} height={1024} />
      <PriceBlock />
      {cta("", label)}
      <TrustRow />
      <PaymentIcons />
    </div>
  );

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href={PIS_FONT_HREF} rel="stylesheet" />
      <link href={PIS_LP1_FONT_HREF} rel="stylesheet" />
      {PISCINAS_PIXEL_ID && (
        <noscript>
          <img height="1" width="1" style={{ display: "none" }} src={`https://www.facebook.com/tr?id=${PISCINAS_PIXEL_ID}&ev=PageView&noscript=1`} alt="" />
        </noscript>
      )}

      <style>{PIS_CSS + PIS_CAL_CSS + PIS_LP1_CSS}</style>

      <div className="pis-page pis-v1 pis-lp1">
        <PiscinasIcons />

        {/* ============ HERO (CTA bajo la imagen, por pedido de Daniel 2026-10-24) ============ */}
        <header className="hero sec-dark">
          <div className="container hero-stack">
            <span className="kicker">
              <UsFlag />
              Para dueños de negocios de limpieza de piscinas en EE.UU.
            </span>
            <h1><span className="hl">Consigue Clientes Nuevos</span> para tu Negocio de Limpieza de Piscinas</h1>
            <p className="sub hero-sub">Con un <span className="hl">Kit de Anuncios Virales</span> Listos para Publicar y Empezar a Vender</p>
            {heroVisual && (
              <PiscinasImage
                src={`${IMG}/antes-despues.jpg`}
                alt="Antes: un dueño de negocio de piscinas con un calendario completamente vacío. Después: el mismo dueño limpiando una piscina, con su agenda llena de citas y el kit al lado."
                className="hero-photo"
                wrapperClass="hero-visual"
                width={1400}
                height={1050}
                onMissing={() => setHeroVisual(false)}
              />
            )}
            <div className="hero-cta">
              <a href={checkoutHref} onClick={handleCheckoutClick} className="btn btn-primary btn-hero btn-block">
                <span className="btn-main"><svg className="btn-arrow" aria-hidden="true"><use href="#i-triangle-right" /></svg><span className="btn-label">Kit “Llena tu Calendario de Piscinas”</span></span>
                <span className="btn-subline">Anuncios Virales y Guías por solo ${price}{listPrice !== null && listPrice > price && <> <s>${listPrice}</s></>}</span>
              </a>
              <PaymentIcons />
            </div>
            <ul className="hero-checks">
              <li><Icon name="i-check" />Sin ser diseñador</li>
              <li><Icon name="i-check" />Sin saber de marketing</li>
              <li><Icon name="i-check" />Diseños virales 100% probados</li>
            </ul>
            <p className="sub sub-lines">
              <span>Sabemos que tu trabajo es dejar piscinas impecables, no hacer posts ni marketing. Pero cada semana sin clientes nuevos deja huecos en tu agenda.</span>
              <span>Este kit ya viene hecho: 60 publicaciones, 10 ofertas, 15 guiones de Reels y una guía para cerrar ventas por teléfono, en español y en inglés. Lo abres desde tu celular y empiezas hoy.</span>
            </p>
          </div>
        </header>

        {/* ============ ESTO ES PARA TI SI... ============ */}
        <section id="para-ti" className="sec-light">
          <div className="container">
            <div className="section-head">
              <h2>Este Kit de Anuncios es para ti si...</h2>
            </div>
            <ul className="id-list">
              {PARA_TI.map((item) => (
                <li className="id-item" key={item.text}>
                  <span className="icon-wrap">{item.art}</span>
                  <p>{item.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ============ RESULTADOS + TARJETA DE PRODUCTO ============ */}
        <section id="producto" className="sec-dark">
          <div className="container">
            <div className="deliver-grid">
              <div>
                <div className="section-head">
                  <h2>En los próximos 7 días, vas a:</h2>
                </div>
                <ol className="achieve-list">
                  {LOGROS.map((text, i) => (
                    <li className="achieve-card" key={i}>
                      <span className="num" aria-hidden="true" />
                      <span className="lg-wrap">{LOGRO_ARTS[i]}</span>
                      <p>{text}</p>
                    </li>
                  ))}
                </ol>
              </div>

              <aside className="cta-card product-card">
                <h3 className="pc-lead">Ten listo lo que necesitas para publicar, ofrecer y cerrar</h3>
                <PiscinasImage
                  src={`${IMG}/mockup-bundle.png`}
                  alt="Kit Llena tu Calendario de Piscinas: 4 guías y 60 anuncios editables en imagen"
                  className="pc-mockup-img"
                  wrapperClass="pc-visual"
                  width={1024}
                  height={1024}
                />
                <h3 className="pc-name">Kit “Llena tu Calendario de Piscinas”</h3>
                <p className="pc-tag">4 Guías + 60 anuncios editables en imagen.<br />En Español e Inglés <LangFlags /></p>
                <p className="pc-includes-label">Dentro del kit:</p>
                <ul className="pc-includes">
                  {INCLUYE.map((t) => (
                    <li key={t}><Icon name="i-check" /><span>{t}</span></li>
                  ))}
                </ul>
                <PriceBlock strike />
                {cta("", "Sí, Quiero Más Clientes Para mi Negocio de Limpieza de Piscinas")}
                <TrustRow />
                <PaymentIcons />
              </aside>
            </div>
          </div>
        </section>

        <div id="sticky-trigger-pis" />

        {/* ============ DENTRO DEL KIT ============ */}
        <section id="dentro-del-kit" className="sec-light">
          <div className="container">
            <div className="section-head">
              <h2>Mira lo que hay por dentro</h2>
            </div>
            <div className="mock-grid">
              {MOCKS.map((m) => (
                <div className="mock-card" key={m.img}>
                  <PiscinasImage src={`${IMG}/${m.img}`} alt={m.title} className="kit-mockup-img" wrapperClass="kit-visual" width={1024} height={1024} />
                  <h3>{m.title}</h3>
                </div>
              ))}
            </div>
            {sectionCta("Sí, Quiero Más Clientes Para mi Negocio de Limpieza de Piscinas")}
          </div>
        </section>

        {/* ============ FACILIDAD DE COMIENZO ============ */}
        <section id="como-empiezo" className="sec-dark">
          <div className="container">
            <div className="section-head">
              <h2>No importa cuánto sepas hoy</h2>
            </div>
            <div className="ease-grid cols-3">
              {FACILIDAD.map((p) => (
                <div className="ease-card" key={p.kind}>
                  <span className="icon-wrap"><Icon name={p.icon} /></span>
                  <div>
                    <h3><FacilTitle kind={p.kind} /></h3>
                    <p>{p.text}</p>
                  </div>
                </div>
              ))}
            </div>
            {sectionCta("Sí, Quiero Más Clientes Para mi Negocio de Limpieza de Piscinas")}
          </div>
        </section>

        {/* ============ PROCESO DE COMPRA Y ENTREGA ============ */}
        <section id="proceso" className="sec-light">
          <div className="container">
            <div className="section-head">
              <h2>Proceso de compra y entrega</h2>
            </div>
            <ol className="steps">
              {PASOS.map((p, i) => (
                <li className="step" key={p.title}>
                  <div className="step-art">{p.art}</div>
                  <span className="n">{i + 1}</span>
                  <h3>{p.title}</h3>
                  <p>{p.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ============ GARANTÍA ============ */}
        <section id="garantia" className="sec-dark">
          <div className="container">
            <div className="guar-v1">
              <div className="guar-text">
                <h2>Pruébalo {PISCINAS_GUARANTEE_DAYS} días, con el riesgo de nuestro lado</h2>
                <p>Descarga el kit, personaliza tus publicaciones y usa las guías. <strong>Si no logras conseguir más clientes dentro de los próximos {PISCINAS_GUARANTEE_DAYS} días, te devolvemos tu dinero.</strong></p>
              </div>
              <div className="gb-wrap"><GuaranteeBadge days={PISCINAS_GUARANTEE_DAYS} /></div>
            </div>
          </div>
        </section>

        {/* ============ FAQ ============ */}
        <section id="faq" className="sec-light">
          <div className="container">
            <div className="section-head">
              <h2>Preguntas frecuentes</h2>
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
        <section className="final-cta sec-dark">
          <div className="container">
            <h2>Empieza esta semana con material hecho para tu negocio</h2>
            <p className="sub">Sabemos que ya tienes bastante con atender tus piscinas y a tus clientes. Por eso te dejamos los anuncios listos: los personalizas, los publicas y sigues enfocado en tu trabajo, sin preocuparte por el marketing.</p>
            {sectionCta("Quiero Empezar a Publicar Esta Semana")}
          </div>
        </section>

        {/* ============ CTA STICKY MÓVIL ============ */}
        <div className="sticky-cta">
          <div className="sticky-cta-inner">
            <div className="sticky-thumb">
              <img src={`${IMG}/mockup-bundle.png`} alt="Kit Llena tu Calendario de Piscinas" className="sticky-thumb-img" width={52} height={52} />
            </div>
            <div className="sticky-text">
              <span className="sticky-price">
                {listPrice !== null && listPrice > price && <span className="old">US${listPrice}</span>}
                {PRICE_LABEL}
              </span>
              <span className="sticky-sub">pago único</span>
            </div>
            {cta(" sticky-btn", "Sí, Quiero Más Clientes")}
          </div>
        </div>
      </div>
    </>
  );
};

export default PiscinasLp;
