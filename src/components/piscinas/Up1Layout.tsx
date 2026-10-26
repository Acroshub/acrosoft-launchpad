import type { ReactNode } from "react";
import { PiscinasIcons, PiscinasImage } from "@/components/piscinas/PiscinasShared";
import { PIS_CAL_CSS, PIS_CSS, PIS_FONT_HREF } from "@/components/piscinas/piscinasStyles";
import { PIS_CSS_V2 } from "@/components/piscinas/piscinasStylesV2";
import { PIS_UP1_CSS } from "@/components/piscinas/piscinasUp1Styles";
import { KitToCampaignArt } from "@/components/piscinas/PiscinasUp1Art";
import { VslSlot } from "@/components/piscinas/VslSlot";
import { PISCINAS_SUPPORT_EMAIL, PISCINAS_UP1_PRICE } from "@/lib/piscinasConfig";
import { UP1_VSL_URL } from "@/lib/piscinasVersionsConfig";

// Página del upsell 1: estructura de la referencia de Daniel con el diseño de /piscinas-lp (mismos colores, tipografía y componentes) con el formato de la referencia de Daniel («MOVIL - upsell 1»): aviso rojo → «PASO 2 DE 4» con barra al 50%
// → texto con frase marcada → video → «solo verás esta página una vez» → banda azul con la promesa → precio → «Lo que recibes hoy»
// (lista con checks sobre fondo oscuro) → garantía → «Ahora por solo» + decisión. Tema v1: azul/blanco, sin glow.
// Diferencias a propósito con la referencia: sin amenaza de recargo en la tarjeta ni cifras inventadas (no hay datos reales).


const CAJAS: { img: string; title: string }[] = [
  { img: "upsell1-caja-1.png", title: "Landing Page de tu negocio con Calendario para Agendar Trabajos" },
  { img: "upsell1-caja-2.png", title: "30 Nuevos Anuncios Personalizados a Medida" },
  { img: "upsell1-caja-3.png", title: "Cuentas Publicitarias a tu Nombre" },
  { img: "upsell1-caja-4.png", title: "Campaña Lista para Publicar" },
  { img: "upsell1-caja-5.png", title: "Llamada Estratégica con Recomendaciones Importantes" },
];

export function Up1Layout({ decision }: { decision: (id: string, uniqueNote: boolean, top?: ReactNode) => ReactNode }) {
  const price = `$${PISCINAS_UP1_PRICE}`;
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href={PIS_FONT_HREF} rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&display=swap" rel="stylesheet" />
      <style>{PIS_CSS + PIS_CSS_V2 + PIS_CAL_CSS + PIS_UP1_CSS}</style>

      <div className="pis-page pis-v1">
        <PiscinasIcons />

        {/* Aviso superior */}
        <div className="up1-alert" role="note">
          <div className="container"><span className="tag">ATENCIÓN</span>No cierres esta ventana ni regreses a la anterior. Tu tarjeta podría tener un recargo y se podrían generar ERRORES en tu pedido.</div>
        </div>

        {/* Hero: ya casi terminas + barra al 50% + video */}
        <header className="hero up1-hero sec-dark">
          <div className="container up1-wrap">
            <h1>Ya casi terminas…</h1>
            <div className="up1-seg" role="progressbar" aria-valuenow={50} aria-valuemin={0} aria-valuemax={100} aria-label="Avance de tu pedido">
              <div className="up1-seg-bar">
                {Array.from({ length: 10 }, (_, i) => <i key={i} className={i < 5 ? "on" : ""} style={{ "--i": i } as React.CSSProperties} />)}
              </div>
              <span className="up1-seg-pct">50% completado</span>
            </div>
            <p className="sub up1-lead">
              Acabas de comprar tu <strong>Kit “Llena tu Calendario de Piscinas”</strong>. Pero tu pedido todavía no está completo: hay algo más que puede <mark>ayudarte a llenar tu calendario de estimados de forma sencilla y rápida sin que tengas que armar nada técnico.</mark>
            </p>
            <VslSlot url={UP1_VSL_URL} showPlaceholder id="vsl">
              <p className="up1-once">👉 Solo verás esta página una vez. Así que mira el video con mucha atención.</p>

            </VslSlot>
          </div>
        </header>

        {/* Sistema Calendario Lleno: promesa, qué recibe, bundle y decisión (sección blanca) */}
        <section className="sec-light up1-promise">
          <div className="up1-band"><div className="container up1-wrap"><span className="up1-band-t">Sistema <span className="up1-pen">“Calendario Lleno”</span></span></div></div>
          <div className="container up1-wrap">
            <div className="up1-promise-in">
              <h2>Te dejamos lista tu estrategia y tu campaña de anuncios a medida</h2>
              <p>Nosotros nos encargamos de lo técnico y difícil. Tú solo haces clic en Publicar</p>
              <p>En este momento ya tienes tus ofertas, posts y guías, pero podemos ayudarte también creando tus campañas en Facebook e Instagram para que genere estimados de forma automática. <mark>Nos encargamos de todo lo técnico para que no tengas que pelearte con la computadora.</mark></p>
            </div>
            <KitToCampaignArt />
            <h3 className="up1-recibiras">Recibirás:</h3>
            <div className="mock-grid up1-mocks">
              {CAJAS.map((c, i) => (
                <div className="mock-card" key={c.img}>
                  <PiscinasImage src={`/piscinas/${c.img}`} alt={c.title} className="kit-mockup-img" wrapperClass="kit-visual" width={640} height={640} />
                  <h3>{i + 1}. {c.title}</h3>
                </div>
              ))}
            </div>
            <div className="up1-own-card">
              <svg className="up1-own-ico" viewBox="0 0 96 96" role="img" aria-label="Llave: las cuentas son tuyas">
                <circle className="uo-ring" cx="48" cy="48" r="42" fill="none" stroke="#4FB3D0" strokeWidth="3" strokeDasharray="6 8" />
                <circle cx="48" cy="48" r="34" fill="#0B2F4F" />
                <g className="uo-key">
                  <circle cx="40" cy="42" r="11" fill="none" stroke="#F2C14E" strokeWidth="6" />
                  <path d="M49 49l22 22M62 62l7-7M68 68l6-6" fill="none" stroke="#F2C14E" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                </g>
                <g className="uo-badge">
                  <circle cx="72" cy="26" r="13" fill="#1B8A55" />
                  <path className="uo-check" d="M66 26l4.5 4.5L78 22" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" pathLength="1" />
                </g>
              </svg>
              <div>
                <h3 className="up1-own-title">Todo tuyo al 100%</h3>
                <p><strong>Te entregamos todo a tu nombre y listo para funcionar. Después, tú eliges quién administra tus anuncios: tú, un familiar, <em className="up1-own-hl">nuestro equipo de expertos</em> o quien quieras.</strong></p>
              </div>
            </div>
            {decision("decision-1", true, <><div className="up1-cont">Continúa aquí… <span aria-hidden="true">👇</span></div><PiscinasImage src="/piscinas/upsell1-cajas.png" alt="Sistema Calendario Lleno: landing page con calendario, 30 anuncios personalizados a medida, cuentas publicitarias, campaña lista para publicar y llamada estratégica incluida" className="pc-mockup-img" wrapperClass="up1-boxes" width={1024} height={1024} /></>)}
            {PISCINAS_SUPPORT_EMAIL && (
              <a className="up1-doubts up1-doubts-l" href={`mailto:${PISCINAS_SUPPORT_EMAIL}`}>¿Tienes dudas? Cuéntanos en qué podemos ayudarte</a>
            )}
          </div>
        </section>

        {/* Garantía en 2 columnas (mismo diseño que la landing) */}
        <section id="garantia" className="sec-dark up1-guar">
          <div className="container">
            <div className="guar-v1">
              <div className="gb-wrap">
                <svg className="gb-art" viewBox="0 54 240 168" role="img" aria-label="Listo en 7 días o no pagas">
                  <text x="120" y="140" textAnchor="middle" fontSize="110" fontWeight="800" fill="#fff" fontFamily="'Plus Jakarta Sans',system-ui,sans-serif">7</text>
                  <text x="120" y="176" textAnchor="middle" fontSize="27" fontWeight="800" letterSpacing="2" fill="#fff" fontFamily="'Plus Jakarta Sans',system-ui,sans-serif">DÍAS</text>
                  <text x="120" y="206" textAnchor="middle" fontSize="19" fontWeight="800" letterSpacing="1" fill="#fff" fontFamily="'Plus Jakarta Sans',system-ui,sans-serif">LISTO O NO PAGAS</text>
                </svg>
              </div>
              <div className="guar-text">
                <h2>Listo en máximo 7 días o no pagas</h2>
                <p>Los 7 días cuentan desde que nos envías toda la información de tu negocio. <strong>Si no lo entregamos a tiempo, te devolvemos tu dinero sin preguntas.</strong></p>
                <p className="up1-note"><strong>Importante:</strong> Estos {price} cubren nuestro trabajo de creación y configuración. Para que los anuncios se muestren, tú debes pagar por separado directamente a Facebook con tu tarjeta. Es un pago aparte de este precio, y tú decides cuánto invertir.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
