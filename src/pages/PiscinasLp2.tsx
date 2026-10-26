import { useEffect } from "react";
import { Icon, PaymentIcons, PiscinasIcons, PiscinasImage, TrustRow, LangFlags } from "@/components/piscinas/PiscinasShared";
import { CTA_LABEL, CheckList, GuaranteeSeal, PRICE_LABEL, PriceBlock } from "@/components/piscinas/PiscinasShared2";
import { VslSlot } from "@/components/piscinas/VslSlot";
import { PIS_CSS, PIS_FONT_HREF } from "@/components/piscinas/piscinasStyles";
import { PIS_CSS_V2 } from "@/components/piscinas/piscinasStylesV2";
import { usePiscinasBuy } from "@/components/piscinas/usePiscinasBuy";
import {
  PISCINAS_GUARANTEE_DAYS,
  PISCINAS_IMG as IMG,
  PISCINAS_PIXEL_ID,
  PISCINAS_SUPPORT_EMAIL,
} from "@/lib/piscinasConfig";
import { AB_V2_EXPERIMENT, VSL_URL } from "@/lib/piscinasVersionsConfig";

// Landing v2 de «Kit Llena tu Calendario de Piscinas» — /piscinas-lp2. Página larga (estructura de 19
// secciones de 06b-landing-v2-larga.md). Se omite lo que no podemos cumplir con honestidad: prueba
// social / resultados reales (no existen), bonos con valor en dólares y anclaje de valor tachado.
// El bloque de VSL solo aparece si VSL_URL (piscinasVersionsConfig.ts) tiene valor.
// Compra: todos los botones → Payment Link del kit (checkoutUrl con client_reference_id) → /piscinas-up1.
// Medición: ab_sessions con la clave piscinas_v2_price. Pixel/CAPI: no-op mientras PIXEL_ID = "".

const PAGE_TITLE = "Kit Llena tu Calendario de Piscinas | Publicaciones, Ofertas, Reels y Guía de Llamadas";

const NO_CHIPS = ["Sin diseñador", "Sin saber de computadoras", "Sin gastar en anuncios"];

const STACK: { title: string; text: string }[] = [
  { title: "Publica con tu marca desde el primer día", text: "60 diseños para Facebook e Instagram con espacios para tu logo, ciudad, teléfono y botón, cada uno con su copy y hashtags." },
  { title: "Lanza una oferta que sí puedes cumplir", text: "10 ofertas para nuevos clientes, con el motivo, lo que te cuesta a ti y el texto listo para pegar." },
  { title: "Graba tu primer Reel sin improvisar", text: "15 ideas de Reels con guion de 30 segundos o más: gancho, cuerpo y llamado a la acción." },
  { title: "Contesta y llama hasta agendar el estimado", text: "La Guía para Cerrar Ventas en Llamada: pasos, preguntas frecuentes, objeciones con respuestas exactas y mensajes de seguimiento." },
  { title: "Personaliza cada imagen en minutos", text: "Una guía te dice cómo completar cada espacio en Canva (gratis), PowerPoint o el editor de tu celular." },
  { title: "Háblale a todos tus clientes", text: "Cada publicación, oferta, guion y mensaje viene en español y en inglés." },
];

const DEMOS: { img: string; title: string; text: string; alt: string }[] = [
  { img: "demo-pub-portada.jpg", title: "Portada: 60 posts", text: "El PDF de publicaciones.", alt: "Portada del PDF de 60 publicaciones listas para publicar" },
  { img: "demo-pub-guia.jpg", title: "Guía de espacios", text: "Cómo completar cada imagen.", alt: "Página de la guía para completar los espacios de cada imagen" },
  { img: "demo-pub-post.jpg", title: "Posts con su copy", text: "Imagen, texto para pegar y hashtags.", alt: "Página con tres publicaciones, su texto para pegar y hashtags" },
  { img: "demo-ofertas-portada.jpg", title: "Portada: 10 ofertas", text: "El PDF de ofertas.", alt: "Portada del PDF de 10 ofertas para nuevos clientes" },
  { img: "demo-ofertas-oferta.jpg", title: "Ofertas listas para usar", text: "Para quién es, costo para ti y texto.", alt: "Página con dos ofertas: para quién es, la oferta, lo que cuesta y el texto del anuncio" },
  { img: "demo-reels-portada.jpg", title: "Portada: 15 Reels", text: "El PDF de ideas de Reels.", alt: "Portada del PDF de 15 ideas de Reels" },
  { img: "demo-reels-guion.jpg", title: "Guion de un Reel", text: "Gancho, cuerpo y llamado a la acción.", alt: "Página con el guion de un Reel: qué grabar, gancho, cuerpo y llamado a la acción" },
  { img: "demo-llamada-portada.jpg", title: "Portada: guía de llamadas", text: "El PDF para cerrar ventas.", alt: "Portada de la guía para cerrar ventas en llamada" },
  { img: "demo-llamada-pasos.jpg", title: "La llamada en 7 pasos", text: "Qué decir, con palabras exactas.", alt: "Página de la guía con los primeros pasos de la llamada y qué decir" },
  { img: "demo-llamada-objecion.jpg", title: "Objeciones con respuesta", text: "Qué responder cuando dudan.", alt: "Página de la guía con objeciones de clientes y qué responder" },
];

const MOCKS: { img: string; title: string }[] = [
  { img: "mockup-1-publicaciones.png", title: "60 Publicaciones" },
  { img: "mockup-2-ofertas.png", title: "10 Ofertas" },
  { img: "mockup-3-reels.png", title: "15 Ideas de Reels" },
  { img: "mockup-4-guia-llamada.png", title: "Guía para Cerrar Ventas en Llamada" },
];

const RESUMEN_KIT: string[] = [
  "60 publicaciones para Facebook e Instagram, con su copy y hashtags",
  "10 ofertas promocionales para nuevos clientes",
  "15 ideas de Reels con guion de 30 segundos o más",
  "Guía para cerrar ventas en llamada (cuando tú llamas y cuando te llaman)",
];
const RESUMEN_EXTRAS: string[] = [
  "Guía para completar los espacios de cada imagen",
  "60 imágenes PNG de 1080 × 1080 editables (español e inglés)",
  "Todo en español y en inglés",
  "Descarga inmediata, para tu celular o tu computadora",
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
  { title: "Ve al checkout.", text: "Toca el botón, elige tu método de pago y completa la compra en el pago seguro de Stripe." },
  { title: "Descarga tu kit.", text: "Después de pagar te mostramos una oferta opcional (puedes decir que no) y llegas a la página de descarga. El enlace también te llega por correo." },
  { title: "Empieza hoy.", text: "Elige una oferta, personaliza tres publicaciones y graba tu primer Reel." },
];

const PiscinasLp2 = () => {
  const { href, onClick } = usePiscinasBuy(AB_V2_EXPERIMENT);

  useEffect(() => { document.title = PAGE_TITLE; }, []);

  // CTA sticky móvil: aparece al pasar el primer CTA.
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

  const cta = (extraClass = "") => (
    <a href={href} onClick={onClick} className={`btn btn-primary${extraClass}`}>
      <svg className="btn-arrow" aria-hidden="true"><use href="#i-triangle-right" /></svg>{CTA_LABEL}
    </a>
  );

  // CTA de sección: precio, botón y fila de confianza (la garantía va siempre bajo el botón).
  const sectionCta = () => (
    <div className="cta-card section-cta">
      <PriceBlock />
      {cta()}
      <TrustRow />
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

        {/* 1. TITULAR + SUBTITULAR = LA PROMESA (derriba 3 objeciones) */}
        <header className="hero">
          <div className="container">
            <span className="kicker">Para dueños de negocios de limpieza de piscinas en EE.UU.</span>
            <h1 style={{ maxWidth: "20em" }}><span className="hl">Llena tu Calendario</span> de Piscinas con Publicaciones, Ofertas y Guiones Listos para Usar</h1>
            <p className="sub">Personalizas con tu logo, tu ciudad y tu teléfono, publicas y contestas con frases exactas. Sin diseñador, sin saber de computadoras y sin gastar en anuncios. Todo en español y en inglés, y lo abres desde tu celular.</p>
            <ul className="no-chips">
              {NO_CHIPS.map((c) => (
                <li className="no-chip" key={c}><Icon name="i-check" />{c}</li>
              ))}
            </ul>
          </div>
        </header>

        {/* 2. VIDEO DE VENTAS: solo si VSL_URL tiene valor (si está vacío no se muestra nada) */}
        {VSL_URL && (
          <section id="video" style={{ paddingTop: 0 }}>
            <div className="container">
              <VslSlot url={VSL_URL} />
            </div>
          </section>
        )}

        {/* 3. BARRA DE AMPLIFICACIÓN */}
        <div className="amp-bar">
          <div className="container">
            <p><strong>60 publicaciones + 10 ofertas + 15 guiones de Reels + guía de llamadas</strong>, listos para personalizar y publicar hoy mismo.</p>
          </div>
        </div>

        {/* 5. CTA 1 */}
        <section id="cta-1" style={{ paddingBottom: 0 }}>
          <div className="container">
            <div className="cta-card section-cta" style={{ marginTop: 0 }}>
              <PriceBlock />
              {cta()}
              <TrustRow />
              <PaymentIcons />
            </div>
          </div>
        </section>
        <div id="sticky-trigger-pis" />

        {/* 6. PRESENTACIÓN DEL PRODUCTO */}
        <section id="producto">
          <div className="container">
            <div className="present-grid">
              <PiscinasImage
                src={`${IMG}/mockup-bundle.png`}
                alt="Kit Llena tu Calendario de Piscinas: 4 guías y 60 anuncios editables en imagen"
                wrapperClass="present-visual"
                width={1024}
                height={1024}
              />
              <div className="present-text">
                <span className="kicker">Te presentamos</span>
                <h2 style={{ fontSize: "clamp(26px,4vw,40px)" }}>Kit Llena tu Calendario de Piscinas</h2>
                <p className="lead">4 guías y 60 anuncios editables en imagen, en español y en inglés, para que <strong>publiques, ofrezcas y cierres</strong> con material hecho para tu negocio de limpieza de piscinas.</p>
                <p className="lead">Sin diseñador, sin saber de computadoras y sin gastar en anuncios: cambias tu logo, tu ciudad y tu teléfono, copias el texto y publicas.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 7. QUÉ OBTENDRÁS (stack de bullets) */}
        <section id="que-obtendras" className="alt">
          <div className="container">
            <div className="section-head">
              <h2>Qué obtendrás con tu kit</h2>
            </div>
            <ul className="stack-list">
              {STACK.map((s) => (
                <li className="stack-item" key={s.title}>
                  <span className="tick"><Icon name="i-check" /></span>
                  <div>
                    <h3>{s.title}</h3>
                    <p>{s.text}</p>
                  </div>
                </li>
              ))}
            </ul>
            {/* 8. CTA 2 */}
            {sectionCta()}
          </div>
        </section>

        {/* 9. DEMOSTRACIÓN POR DENTRO (páginas reales de los PDFs) */}
        <section id="por-dentro">
          <div className="container">
            <div className="section-head">
              <h2>Mira lo que hay por dentro</h2>
              <p>Estas son páginas reales de los 4 PDFs del kit. Toca una para verla más grande.</p>
            </div>
            <div className="demo-grid">
              {DEMOS.map((d) => (
                <figure className="demo-fig" key={d.img}>
                  <a href={`${IMG}/${d.img}`} target="_blank" rel="noreferrer">
                    <img src={`${IMG}/${d.img}`} alt={d.alt} width={900} height={1273} loading="lazy" decoding="async" />
                  </a>
                  <figcaption><strong>{d.title}</strong>{d.text}</figcaption>
                </figure>
              ))}
            </div>
            <p className="demo-note">Las imágenes de las publicaciones (60 PNG, en español y en inglés) vienen aparte, en carpetas, listas para editar.</p>
          </div>
        </section>

        {/* 10. MOCKUPS + PRECIO (primer anclaje, sin tachado) */}
        <section id="precio" className="alt">
          <div className="container">
            <div className="section-head">
              <h2>Todo esto, por un solo pago de {PRICE_LABEL}</h2>
            </div>
            <div className="mock-grid">
              {MOCKS.map((m) => (
                <div className="mock-card" key={m.img}>
                  <PiscinasImage src={`${IMG}/${m.img}`} alt={m.title} className="kit-mockup-img" wrapperClass="kit-visual" width={1024} height={1024} />
                  <h3>{m.title}</h3>
                </div>
              ))}
            </div>
            <div className="cta-card price-card">
              <PiscinasImage src={`${IMG}/mockup-bundle.png`} alt="Kit Llena tu Calendario de Piscinas completo" className="pc-mockup-img" wrapperClass="pc-visual" width={1024} height={1024} />
              <h3 className="pc-name">Kit Llena tu Calendario de Piscinas</h3>
              <p className="pc-tag">4 Guías + 60 anuncios editables en imagen. En Español e Inglés <LangFlags /></p>
              <PriceBlock />
              {cta()}
              <TrustRow />
              <PaymentIcons />
            </div>
          </div>
        </section>

        {/* 13. GARANTÍA (bloque propio, además de bajo cada botón) */}
        <section id="garantia">
          <div className="container">
            <div className="guar-grid">
              <GuaranteeSeal />
              <div className="guar-text">
                <h2 style={{ fontSize: "clamp(25px,3.8vw,38px)" }}>Pruébalo {PISCINAS_GUARANTEE_DAYS} días, con el riesgo de nuestro lado</h2>
                <p>Descarga el kit, personaliza tus publicaciones y úsalo. <strong>Si no te sirve, nos escribes dentro de los {PISCINAS_GUARANTEE_DAYS} días y te devolvemos tu dinero.</strong></p>
              </div>
            </div>
          </div>
        </section>

        {/* 14. RESUMEN DE LA OFERTA */}
        <section id="resumen" className="alt">
          <div className="container">
            <div className="section-head">
              <h2>Aquí, un resumen de todo lo que obtienes hoy</h2>
            </div>
            <div className="sum-grid">
              <div className="sum-box">
                <h3>El kit</h3>
                <CheckList items={RESUMEN_KIT} />
              </div>
              <div className="sum-box">
                <h3>Y además</h3>
                <CheckList items={RESUMEN_EXTRAS} />
              </div>
            </div>
            <div className="cta-card section-cta sum-cta">
              <PriceBlock />
              {cta()}
              <TrustRow />
              <PaymentIcons />
            </div>
          </div>
        </section>

        {/* 16. PREGUNTAS Y RESPUESTAS */}
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

        {/* 18. BREAK-UP FINAL: precio + CTA */}
        <section className="final-cta">
          <div className="container">
            <h2>Empieza esta semana con material hecho para tu negocio</h2>
            <p className="sub">Sabemos que ya tienes bastante con la ruta del día. Por eso lo dejamos listo: copias, personalizas y publicas.</p>
            <div className="cta-card">
              <PriceBlock />
              {cta()}
              <TrustRow />
              <PaymentIcons />
            </div>
          </div>
        </section>

        {/* PROCESO DE COMPRA Y ENTREGA (3 pasos) */}
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

        <footer>
          <div className="container">
            <p>Este producto es material de apoyo para el marketing de tu negocio. No garantiza resultados ni una cantidad de clientes: dependen de tu zona, tu servicio, tu presupuesto y de cuánto lo apliques.</p>
            {PISCINAS_SUPPORT_EMAIL && <p>Soporte: <a href={`mailto:${PISCINAS_SUPPORT_EMAIL}`}>{PISCINAS_SUPPORT_EMAIL}</a></p>}
          </div>
        </footer>

        <div className="sticky-cta">
          {cta(" btn-block sticky-btn")}
          <p className="sticky-note"><Icon name="i-undo" />Garantía de {PISCINAS_GUARANTEE_DAYS} días · Descarga inmediata</p>
        </div>
      </div>
    </>
  );
};

export default PiscinasLp2;
