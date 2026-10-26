import type { ReactNode } from "react";
import { Icon, PiscinasIcons, PiscinasImage } from "@/components/piscinas/PiscinasShared";
import { PIS_CAL_CSS, PIS_CSS, PIS_FONT_HREF } from "@/components/piscinas/piscinasStyles";
import { PIS_CSS_V2 } from "@/components/piscinas/piscinasStylesV2";
import { PIS_UP1_CSS } from "@/components/piscinas/piscinasUp1Styles";
import { KitCampaignCareArt, KitToCampaignArt } from "@/components/piscinas/PiscinasUp1Art";
import { VslSlot } from "@/components/piscinas/VslSlot";
import { PISCINAS_SUPPORT_EMAIL, PISCINAS_UP2_PRICE_MONTHLY } from "@/lib/piscinasConfig";
import { UP2_VSL_URL } from "@/lib/piscinasVersionsConfig";

// Página del upsell 2 (/piscinas-up2): mismo diseño y estructura que Up1Layout (aviso rojo, «Ya casi terminas…» con barra de avance,
// VSL, franja naranja, tarjetas, tarjeta de «Todo tuyo al 100%», oferta con glow y garantía), con el contenido de la gestión de anuncios.
// Barra de avance al 80% (8 de 10 segmentos). Estilos compartidos con Up1Layout (PIS_UP1_CSS).

const SEGMENTS = 10;
const FILLED = 8;
const DONE_BEFORE = 5; // los 5 primeros ya estaban llenos en el upsell 1 (50%); los 3 nuevos se llenan aquí con otro color

const HACEMOS: { icon: string; title: string; text: string }[] = [
  { icon: "i-eye", title: "Tu cuenta vigilada todos los días", text: "Revisamos todos los días que no haya problemas con tu cuenta de Facebook." },
  { icon: "i-trend", title: "Optimización de Anuncios cada semana", text: "Cada semana optimizamos y creamos anuncios a la medida de tu negocio." },
  { icon: "i-calendar", title: "Tu calendario de estimados y citas en orden", text: "Administramos tu calendario de estimados y citas." },
];

/** Icono de calendario con el número de mes («1er», «2do», «3er»). */
function CalMonth({ n }: { n: string }) {
  return (
    <svg className="up2-cal" viewBox="0 0 48 48" role="img" aria-label={`${n} mes`}>
      <rect x="2" y="5" width="44" height="41" rx="7" fill="#fff" stroke="#0B2F4F" strokeWidth="3" />
      <path d="M2 12a7 7 0 0 1 7-7h30a7 7 0 0 1 7 7v7H2z" fill="#E4572E" />
      <rect x="12" y="1" width="4" height="9" rx="2" fill="#0B2F4F" />
      <rect x="32" y="1" width="4" height="9" rx="2" fill="#0B2F4F" />
      <text x="24" y="38" textAnchor="middle" fontSize="22" fontWeight="800" fill="#0B2238" fontFamily="'Plus Jakarta Sans',system-ui,sans-serif">{n}</text>
    </svg>
  );
}

/** Precio por mes: 1.er y 2.º mes tachados, 3.er mes (premio de antigüedad) vigente. */
export function Up2PriceSteps() {
  return (
    <div className="up2-steps">
      <div className="up2-step old"><CalMonth n="1er" /><s>$1,500</s></div>
      <div className="up2-step old"><CalMonth n="2do" /><s>$1,250</s></div>
      <div className="up2-step now"><CalMonth n="3er" /><span>$1,000</span></div>
      <p className="up2-steps-note">Como ya compraste tu kit con nosotros, te damos de entrada el precio del premio de antigüedad. <strong>Este precio especial solo está disponible en esta página.</strong> Si decides adquirir el servicio después, empezarías con el precio oficial de $1,500.</p>
    </div>
  );
}

export function Up2Layout({ decision, boughtUp1 }: { decision: (id: string, uniqueNote: boolean, top?: ReactNode) => ReactNode; boughtUp1: boolean }) {
  const price = `$${PISCINAS_UP2_PRICE_MONTHLY.toLocaleString("en-US")}`;
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href={PIS_FONT_HREF} rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&display=swap" rel="stylesheet" />
      <style>{PIS_CSS + PIS_CSS_V2 + PIS_CAL_CSS + PIS_UP1_CSS}</style>

      <div className="pis-page pis-v1" data-bought-up1={boughtUp1 ? "yes" : "no"}>
        <PiscinasIcons />

        <div className="up1-alert" role="note">
          <div className="container"><span className="tag">ATENCIÓN</span>No cierres esta ventana ni regreses a la anterior. Tu tarjeta podría tener un recargo y se podrían generar ERRORES en tu pedido.</div>
        </div>

        <header className="hero up1-hero sec-dark">
          <div className="container up1-wrap">
            <h1>¡Último paso!</h1>
            <div className="up1-seg" role="progressbar" aria-valuenow={80} aria-valuemin={0} aria-valuemax={100} aria-label="Avance de tu pedido">
              <div className="up1-seg-bar up2-seg">
                {Array.from({ length: SEGMENTS }, (_, i) => <i key={i} className={i < DONE_BEFORE ? "on prev" : i < FILLED ? "on new" : ""} style={{ "--i": i - DONE_BEFORE } as React.CSSProperties} />)}
              </div>
              <span className="up1-seg-pct">80% completado</span>
            </div>
            <p className="sub up1-lead">
              {boughtUp1
                ? "¡Felicidades! Ya tienes tus posts, anuncios, cuentas y campañas. "
                : "¡Felicidades! Ya tienes tus posts, anuncios y guías. "}
              Pero sabemos que lo tuyo es enfocarte en las piscinas, no revisar tu cuenta de Facebook cada día. <mark>Hay una forma sencilla de que nuestro equipo cuide tus anuncios cada día mientras tú te dedicas a atender clientes.</mark>
            </p>
            <VslSlot url={UP2_VSL_URL} showPlaceholder id="vsl">
              <p className="up1-once">👉 Míralo hasta el final. No vas a volver a ver esta página.</p>
            </VslSlot>
          </div>
        </header>

        <section className="sec-light up1-promise">
          <div className="up1-band up2-band"><div className="container up1-wrap"><span className="up1-band-t">Servicio Profesional Completo <span className="up1-pen">“Calendario Lleno En Automático”</span></span></div></div>
          <div className="container up1-wrap">
            <div className="up1-promise-in">
              <h2>Nuestro equipo cuida tus anuncios todos los días</h2>
              <p>Tú atiendes a tus clientes. Nosotros vigilamos, optimizamos y mantenemos tus anuncios.</p>
              <p>{boughtUp1 ? "Ya tienes tu campaña lista para publicar. Puedes encargarte de ella tú mismo, pero si prefieres, " : "Con tu kit ya sabes qué publicar y cómo cerrar ventas. Puedes encargarte de tus anuncios tú mismo, pero si prefieres, "}<mark>nosotros lo hacemos por ti.</mark></p>
            </div>
            {boughtUp1 ? (
              <KitCampaignCareArt />
            ) : (
              <KitToCampaignArt
                right={{ l1: "Gestión de tus anuncios", l2: "todos los días", sub: "Nuestro equipo la cuida" }}
                label="Paso listo: tu kit de ofertas y publicaciones. Paso pendiente: la gestión de tus anuncios todos los días por nuestro equipo."
              />
            )}
            <h3 className="up1-recibiras">Esto es lo que hacemos por ti:</h3>
            <div className="up2-cards">
              {HACEMOS.map((c) => (
                <div className="up2-card" key={c.title}>
                  <span className="up2-ico"><Icon name={c.icon} /></span>
                  <div>
                    <h3>{c.title}</h3>
                    <p>{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="up2-offer">
              {decision("decision-1", true, <><div className="up1-cont">Continúa aquí… <span aria-hidden="true">👇</span></div><PiscinasImage src="/piscinas/upsell2-bundle.png" alt="Servicio Profesional Completo Calendario Lleno En Automático: cuenta vigilada todos los días, optimización de anuncios cada semana y calendario de estimados y citas en orden" className="pc-mockup-img" wrapperClass="up1-boxes" width={1024} height={1024} /></>)}
            </div>
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
                <svg className="gb-art" viewBox="0 54 240 168" role="img" aria-label="30 días de garantía">
                  <text x="120" y="140" textAnchor="middle" fontSize="104" fontWeight="800" fill="#fff" fontFamily="'Plus Jakarta Sans',system-ui,sans-serif">30</text>
                  <text x="120" y="176" textAnchor="middle" fontSize="27" fontWeight="800" letterSpacing="2" fill="#fff" fontFamily="'Plus Jakarta Sans',system-ui,sans-serif">DÍAS</text>
                  <text x="120" y="206" textAnchor="middle" fontSize="19" fontWeight="800" letterSpacing="1" fill="#fff" fontFamily="'Plus Jakarta Sans',system-ui,sans-serif">DE GARANTÍA</text>
                </svg>
              </div>
              <div className="guar-text">
                <h2>Si en 30 días no recibes estimados ni citas, el siguiente mes va por nuestra cuenta</h2>
                <p>Seguimos trabajando tus anuncios el siguiente mes <strong>sin costo</strong>. Aplica si tus anuncios tienen presupuesto activo y atiendes a tus prospectos.</p>
                <p className="up1-note"><strong>Importante:</strong> el presupuesto de anuncios no está incluido en estos {price} al mes. Lo pagas tú directamente a Facebook con tu tarjeta, y tú decides cuánto invertir.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
