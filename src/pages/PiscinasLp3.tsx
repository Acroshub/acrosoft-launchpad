import { useEffect, useState } from "react";
import { Icon, PaymentIcons, PiscinasIcons, PiscinasImage, TrustRow, LangFlags } from "@/components/piscinas/PiscinasShared";
import { CTA_LABEL, CheckList, GuaranteeSeal, PRICE_LABEL, PriceBlock } from "@/components/piscinas/PiscinasShared2";
import { VslSlot } from "@/components/piscinas/VslSlot";
import { PIS_CSS, PIS_FONT_HREF } from "@/components/piscinas/piscinasStyles";
import { PIS_CSS_V2 } from "@/components/piscinas/piscinasStylesV2";
import { scrollToId, usePiscinasBuy } from "@/components/piscinas/usePiscinasBuy";
import {
  PISCINAS_GUARANTEE_DAYS,
  PISCINAS_IMG as IMG,
  PISCINAS_PIXEL_ID,
  PISCINAS_SUPPORT_EMAIL,
} from "@/lib/piscinasConfig";
import { AB_V3_EXPERIMENT, OFFER_REVEAL, VSL_EMBED_URL, VSL_PRICE_EVENT } from "@/lib/piscinasVersionsConfig";

// Landing v3 de «Kit Llena tu Calendario de Piscinas» — /piscinas-lp3. Página de oferta que va bajo el VSL
// (06c-landing-v3-vsl.md). REGLA DE MEDICIÓN: el ÚNICO botón de compra de toda la página es el que
// va debajo del VSL (id="vsl"); todos los demás botones solo suben (scroll suave) al VSL y NO disparan
// InitiateCheckout ni abren el checkout. Así el embudo visita → VSL → compra se mide en un solo punto.
//
// El VSL todavía no está grabado: VslSlot muestra un recuadro rotulado si VSL_EMBED_URL está vacío.
// OFFER_REVEAL = "always" muestra la oferta; con "on-price" queda oculta hasta que el reproductor avise
// el precio (ver TODO en piscinasVersionsConfig.ts y en el efecto de abajo).
// Medición: ab_sessions con la clave piscinas_v3_price. Pixel/CAPI: no-op mientras PIXEL_ID = "".

const PAGE_TITLE = "Kit Llena tu Calendario de Piscinas | Mira el video y llena tu calendario";
const VSL_ID = "vsl";

const RUTA: { title: string; text: string; feel: string; files: string }[] = [
  {
    title: "Personaliza",
    text: "Abres la guía de espacios y cambias tu logo, tu nombre, tu ciudad y tu teléfono en las imágenes, en Canva (gratis) o en el editor de tu celular.",
    feel: "Te sientes con una marca lista para salir, sin diseñador.",
    files: "Usas: 1-Publicaciones y su guía de espacios",
  },
  {
    title: "Publica",
    text: "Eliges una oferta que puedas cumplir, subes tus publicaciones con su copy y hashtags, y grabas un Reel leyendo su guion.",
    feel: "Dejas de mirar la pantalla en blanco: ya sabes qué poner.",
    files: "Usas: 1-Publicaciones, 2-Ofertas y 3-Ideas de Reels",
  },
  {
    title: "Contesta y llama",
    text: "Cuando te escriben o te llaman, sigues los pasos de la guía con las frases exactas, hasta agendar el estimado.",
    feel: "Contestas con seguridad, sin improvisar el precio.",
    files: "Usas: 4-Guía para Cerrar Ventas en Llamada",
  },
];

const MODULOS: { img: string; title: string; text: string }[] = [
  { img: "mockup-1-publicaciones.png", title: "60 Publicaciones", text: "Con espacios para tu logo, ciudad, teléfono y botón, más su copy y hashtags." },
  { img: "mockup-2-ofertas.png", title: "10 Ofertas para nuevos clientes", text: "Cada una con el motivo, lo que te cuesta y el texto listo para pegar." },
  { img: "mockup-3-reels.png", title: "15 Ideas de Reels con guion", text: "Gancho, cuerpo y llamado a la acción, de 30 segundos o más." },
  { img: "mockup-4-guia-llamada.png", title: "Guía para Cerrar Ventas en Llamada", text: "Pasos, preguntas frecuentes, objeciones con respuestas exactas y seguimiento." },
];

const EXTRAS: { icon: string; title: string; text: string }[] = [
  { icon: "i-wrench", title: "Guía para completar los espacios", text: "Te explica cómo poner tu logo, nombre, ciudad, teléfono y botón en cada imagen." },
  { icon: "i-globe", title: "Todo en español y en inglés", text: "Cada publicación, oferta, guion y mensaje viene en los dos idiomas." },
  { icon: "i-download", title: "60 imágenes editables y descarga inmediata", text: "PNG de 1080 × 1080 en un ZIP que abres desde tu celular o tu computadora." },
];

const RESUMEN_HERRAMIENTAS: string[] = [
  "60 publicaciones para Facebook e Instagram, con su copy y hashtags",
  "10 ofertas promocionales para nuevos clientes",
  "15 ideas de Reels con guion de 30 segundos o más",
  "Guía para cerrar ventas en llamada (cuando tú llamas y cuando te llaman)",
];
const RESUMEN_EXTRAS: string[] = [
  "Guía para completar los espacios de cada imagen",
  "60 imágenes PNG de 1080 × 1080 editables",
  "Todo en español y en inglés",
  `Garantía de ${PISCINAS_GUARANTEE_DAYS} días`,
];

const FAQ: { q: string; a: string }[] = [
  { q: "¿Sirve si tengo pocas piscinas o estoy empezando?", a: "Sí. Mientras más pequeña tu ruta, más huecos tienes por llenar. El kit funciona igual con 10 piscinas que con 60." },
  { q: "¿Necesito saber de diseño o de computadoras?", a: "No. Abres la imagen, cambias tu logo, tu ciudad y tu teléfono, y publicas. La guía del kit te lo explica paso a paso." },
  { q: "¿Cómo edito las imágenes?", a: "Son PNG de 1080 × 1080 con espacios vacíos para tu logo, nombre, ciudad, teléfono y botón. Se editan en Canva (gratis), PowerPoint o el editor de tu celular." },
  { q: "¿Viene en inglés?", a: "Sí. Cada pieza trae su versión en español y su versión en inglés, para que uses la que mejor le hable a cada cliente." },
  { q: "¿Incluye anuncios pagados?", a: "No. El kit es para publicar, ofrecer y vender, sin gastar en anuncios. Si después quieres que armemos tus campañas, lo verás al terminar tu compra." },
  { q: "¿Me aseguran clientes nuevos?", a: "No. Te damos el material y los guiones para atraer y cerrar; los resultados dependen de tu zona, tu servicio, tu presupuesto y de cuánto lo apliques." },
  { q: "¿Qué pasa si no me sirve?", a: `Tienes ${PISCINAS_GUARANTEE_DAYS} días de garantía: si el kit no te sirve, nos escribes y te devolvemos tu dinero.` },
  { q: "¿Cuándo recibo el kit?", a: "Al instante: pagas y descargas." },
];

const PASOS: { title: string; text: string }[] = [
  { title: "Ve al checkout.", text: "Toca el botón que está debajo del video, elige tu método de pago y completa la compra en el pago seguro de Stripe." },
  { title: "Descarga tu kit.", text: "Después de pagar te mostramos una oferta opcional (puedes decir que no) y llegas a la página de descarga. El enlace también te llega por correo." },
  { title: "Empieza hoy.", text: "Elige una oferta, personaliza tres publicaciones y graba tu primer Reel." },
];

const PiscinasLp3 = () => {
  const { href, onClick } = usePiscinasBuy(AB_V3_EXPERIMENT);
  // "always": la oferta se ve desde el inicio. "on-price": se revela cuando el reproductor avisa el precio.
  const [offerVisible, setOfferVisible] = useState(OFFER_REVEAL === "always");

  useEffect(() => { document.title = PAGE_TITLE; }, []);

  // TODO (Daniel): con OFFER_REVEAL = "on-price", el mecanismo exacto que avisa «el VSL dijo el precio»
  // lo define Daniel (Biturbo u otro reproductor). Mientras tanto la página acepta cualquiera de estas dos señales:
  //   window.dispatchEvent(new CustomEvent("piscinas:vsl-price"))
  //   window.postMessage({ type: "piscinas:vsl-price" }, "*")
  useEffect(() => {
    if (OFFER_REVEAL !== "on-price") return;
    const reveal = () => setOfferVisible(true);
    const onMessage = (e: MessageEvent) => {
      const d = e.data as { type?: string } | null;
      if (d && typeof d === "object" && d.type === VSL_PRICE_EVENT) reveal();
    };
    window.addEventListener(VSL_PRICE_EVENT, reveal);
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener(VSL_PRICE_EVENT, reveal);
      window.removeEventListener("message", onMessage);
    };
  }, []);

  // CTA sticky móvil (solo sube al VSL): aparece al pasar el bloque del VSL.
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

  // ÚNICO botón de compra de la página (va debajo del VSL).
  const buyButton = (
    <a href={href} onClick={onClick} className="btn btn-primary js-buy" data-buy="true">
      <svg className="btn-arrow" aria-hidden="true"><use href="#i-triangle-right" /></svg>{CTA_LABEL}
    </a>
  );

  // Todos los demás botones: suben al VSL. No son enlaces de pago y no disparan InitiateCheckout.
  const scrollBtn = (extraClass = "") => (
    <button type="button" className={`btn btn-primary btn-scroll${extraClass}`} onClick={() => scrollToId(VSL_ID)}>
      <svg className="btn-arrow" aria-hidden="true"><use href="#i-triangle-right" /></svg>{CTA_LABEL}
    </button>
  );

  const priceCard = () => (
    <div className="cta-card price-card">
      <PiscinasImage src={`${IMG}/mockup-bundle.png`} alt="Kit Llena tu Calendario de Piscinas completo" className="pc-mockup-img" wrapperClass="pc-visual" width={1024} height={1024} />
      <h3 className="pc-name">Kit Llena tu Calendario de Piscinas</h3>
      <p className="pc-tag">4 Guías + 60 anuncios editables en imagen. En Español e Inglés <LangFlags /></p>
      <PriceBlock />
      {scrollBtn()}
      <p className="scroll-hint">Te llevamos al botón de compra, debajo del video.</p>
      <TrustRow />
      <PaymentIcons />
    </div>
  );

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href={PIS_FONT_HREF} rel="stylesheet" />
      {PISCINAS_PIXEL_ID && (
        <noscript>
          <img height="1" width="1" style={{ display: "none" }} src={`https://www.facebook.com/tr?id=${PISCINAS_PIXEL_ID}&ev=PageView&noscript=1`} alt="" />
        </noscript>
      )}
      <style>{PIS_CSS}{PIS_CSS_V2}</style>

      <div className="pis-page">
        <PiscinasIcons />

        {/* PROMESA + VSL + ÚNICO BOTÓN DE COMPRA */}
        <header className="hero" style={{ paddingBottom: "clamp(32px,5vw,60px)" }}>
          <div className="container">
            <span className="kicker">Para dueños de negocios de limpieza de piscinas en EE.UU.</span>
            <h1 style={{ maxWidth: "20em" }}><span className="hl">Llena tu Calendario</span> de Piscinas con Publicaciones, Ofertas y Guiones Listos para Usar</h1>
            <p className="sub" style={{ marginBottom: 28 }}>Mira el video: en pocos minutos ves cómo funciona el kit, sin diseñador, sin saber de computadoras y sin gastar en anuncios.</p>
            <VslSlot url={VSL_EMBED_URL} showPlaceholder id={VSL_ID}>
              <div className="cta-card section-cta" style={{ marginTop: 26 }}>
                <PriceBlock />
                {buyButton}
                <TrustRow />
                <PaymentIcons />
              </div>
            </VslSlot>
          </div>
        </header>
        <div id="sticky-trigger-pis" />

        {/* ============ PÁGINA DE OFERTA (bajo el VSL) ============ */}
        <div className={offerVisible ? undefined : "offer-hidden"} id="oferta" aria-hidden={!offerVisible}>
          {/* 1. Promesa + botón (sube al VSL) */}
          <section className="alt">
            <div className="container">
              <div className="section-head" style={{ marginBottom: 0 }}>
                <h2>Ten listo lo que necesitas para publicar, ofrecer y cerrar</h2>
                <p>Un kit de publicaciones, ofertas, Reels y guía de llamadas para tu negocio de piscinas, en español y en inglés. Sin diseñador, sin saber de computadoras y sin gastar en anuncios.</p>
              </div>
              <div className="cta-card section-cta">
                {scrollBtn()}
                <p className="scroll-hint">Te llevamos al botón de compra, debajo del video.</p>
              </div>
            </div>
          </section>

          {/* 3. Ruta exacta en 3 pasos */}
          <section id="ruta">
            <div className="container">
              <div className="section-head">
                <h2>Esta es la <span className="hl">ruta exacta</span> que sigues dentro del Kit Llena tu Calendario de Piscinas</h2>
              </div>
              <ol className="route">
                {RUTA.map((r, i) => (
                  <li className="route-step" key={r.title}>
                    <span className="n">{i + 1}</span>
                    <h3>{r.title}</h3>
                    <p>{r.text}</p>
                    <p className="feel">{r.feel}</p>
                    <p className="files">{r.files}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* 4. Qué obtienes (mockups) */}
          <section id="dentro" className="alt">
            <div className="container">
              <div className="section-head">
                <h2>Dentro vas a <span className="hl">tener</span>:</h2>
              </div>
              <div className="kit-grid">
                {MODULOS.map((m) => (
                  <article className="kit-card" key={m.title}>
                    <PiscinasImage src={`${IMG}/${m.img}`} alt={m.title} className="kit-mockup-img" wrapperClass="kit-visual" width={1024} height={1024} />
                    <div className="kit-body">
                      <h3>{m.title}</h3>
                      <p className="kit-desc">{m.text}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* 5. Pero eso no es todo (extras) */}
          <section id="extras">
            <div className="container">
              <div className="section-head">
                <h2>Pero eso no es todo</h2>
                <p>Además te llevas estos extras incluidos:</p>
              </div>
              <div className="ease-grid cols-3">
                {EXTRAS.map((x) => (
                  <div className="ease-card" key={x.title}>
                    <span className="icon-wrap"><Icon name={x.icon} /></span>
                    <div>
                      <h3>{x.title}</h3>
                      <p>{x.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 6. Tarjeta de precio 1 */}
          <section className="alt">
            <div className="container">
              <div className="section-head" style={{ marginBottom: 0 }}>
                <h2>Todo esto, por un solo pago de {PRICE_LABEL}</h2>
              </div>
              {priceCard()}
            </div>
          </section>

          {/* 7. Garantía + segundo botón */}
          <section id="garantia">
            <div className="container">
              <div className="guar-grid">
                <GuaranteeSeal />
                <div className="guar-text">
                  <h2 style={{ fontSize: "clamp(25px,3.8vw,38px)" }}>Garantía de {PISCINAS_GUARANTEE_DAYS} días</h2>
                  <p>Descarga el kit, aplícalo y <strong>si no te sirve, nos escribes dentro de los {PISCINAS_GUARANTEE_DAYS} días y te devolvemos tu dinero.</strong></p>
                </div>
              </div>
              <div className="cta-card section-cta">
                {scrollBtn()}
                <p className="scroll-hint">Te llevamos al botón de compra, debajo del video.</p>
                <TrustRow />
              </div>
            </div>
          </section>

          {/* 8. Resumen */}
          <section id="resumen" className="alt">
            <div className="container">
              <div className="section-head">
                <h2>Aquí, un resumen de todo lo que obtienes al ingresar ahora</h2>
              </div>
              <div className="sum-grid">
                <div className="sum-box">
                  <h3>Herramientas</h3>
                  <CheckList items={RESUMEN_HERRAMIENTAS} />
                </div>
                <div className="sum-box">
                  <h3>Extras</h3>
                  <CheckList items={RESUMEN_EXTRAS} />
                </div>
              </div>
            </div>
          </section>

          {/* 9. Segunda tarjeta de precio + medios de pago */}
          <section>
            <div className="container">{priceCard()}</div>
          </section>

          {/* 10. Proceso de compra y entrega */}
          <section id="proceso" className="alt">
            <div className="container">
              <div className="section-head">
                <h2>Proceso de compra y entrega</h2>
              </div>
              <ol className="steps">
                {PASOS.map((p, i) => (
                  <li className="step" key={p.title}>
                    <span className="n">{i + 1}</span>
                    <h3>{p.title}</h3>
                    <p>{p.text}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section id="faq">
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

          {/* 11. Cierre */}
          <section className="final-cta">
            <div className="container">
              <h2>Empieza esta semana con material hecho para tu negocio</h2>
              <p className="sub">Sabemos que ya tienes bastante con la ruta del día. Por eso lo dejamos listo: copias, personalizas y publicas.</p>
              <div className="cta-card">
                <PriceBlock />
                {scrollBtn()}
                <p className="scroll-hint">Te llevamos al botón de compra, debajo del video.</p>
                <TrustRow />
                <PaymentIcons />
              </div>
              {PISCINAS_SUPPORT_EMAIL && (
                <p className="sub" style={{ fontSize: 15 }}>¿Dudas antes de comprar? Escríbenos a <a href={`mailto:${PISCINAS_SUPPORT_EMAIL}`}>{PISCINAS_SUPPORT_EMAIL}</a>.</p>
              )}
            </div>
          </section>
        </div>

        <footer>
          <div className="container">
            <p>Este producto es material de apoyo para el marketing de tu negocio. No garantiza resultados ni una cantidad de clientes: dependen de tu zona, tu servicio, tu presupuesto y de cuánto lo apliques.</p>
            {PISCINAS_SUPPORT_EMAIL && <p>Soporte: <a href={`mailto:${PISCINAS_SUPPORT_EMAIL}`}>{PISCINAS_SUPPORT_EMAIL}</a></p>}
          </div>
        </footer>

        {/* Sticky móvil: solo sube al VSL */}
        <div className="sticky-cta">
          {scrollBtn(" btn-block sticky-btn")}
          <p className="sticky-note"><Icon name="i-undo" />Garantía de {PISCINAS_GUARANTEE_DAYS} días · Descarga inmediata</p>
        </div>
      </div>
    </>
  );
};

export default PiscinasLp3;
