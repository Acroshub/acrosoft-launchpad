import { useCallback, useEffect, useState } from "react";
import { Icon, PiscinasIcons, PiscinasImage } from "@/components/piscinas/PiscinasShared";
import { PIS_CAL_CSS, PIS_CSS, PIS_FONT_HREF } from "@/components/piscinas/piscinasStyles";
import { PIS_CSS_V2 } from "@/components/piscinas/piscinasStylesV2";
import { PIS_UP1_CSS } from "@/components/piscinas/piscinasUp1Styles";
import { PIS_TY_CSS } from "@/components/piscinas/piscinasTyStyles";
import { initMetaPixel, trackMetaEvent } from "@/lib/metaPixel";
import { PISCINAS_PIXEL_ID, PISCINAS_TY_EMAIL, PISCINAS_TY_WHATSAPP } from "@/lib/piscinasConfig";
import { FRONT_SESSION_KEY, UP1_FLAG_KEY, UP2_FLAG_KEY, addNoindex, readSession, trackAbPurchase, writeSession } from "@/lib/piscinasFunnel";

// Thank-you de «Kit Llena tu Calendario de Piscinas» — /piscinas-ty — noindex. Estructura de 06d-pagina-gracias.md. Copy en Info/copy-landings.md (página 4).
// El session_id sale de la URL (?session_id=… del correo) o de sessionStorage ("piscinas_front_session", guardado en
// /piscinas-up1). Pide a piscinas-get-order el resumen y la URL firmada del ZIP. Sin session → estado «no-session».
// Según lo que compró (?up=2 y banderas piscinas_up1 / piscinas_up2 en sessionStorage) muestra el bloque del servicio.
// Vista previa: SOLO con `import.meta.env.DEV`, `?demo=1` muestra la página con una orden simulada (sin llamar a
// piscinas-get-order); `&up1=1` y `&up2=1` muestran los bloques de onboarding. En producción se ignora.
// Purchase por pixel: solo con PISCINAS_PIXEL_ID (hoy vacío = no hace nada), una sola vez por compra.

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const PAGE_TITLE = "Tu compra | Kit Llena tu Calendario de Piscinas";
// Asunto exacto del correo que manda stripe-webhook: `Descarga tu compra: ${shortName}` (shortName del catálogo).
const EMAIL_SUBJECT = "Descarga tu compra: Kit Llena tu Calendario de Piscinas";
const BRAND = "Kit Llena tu Calendario de Piscinas";
const RETRY_DELAY_MS = 3000;
const MAX_AUTO_RETRIES = 4; // el webhook de Stripe puede tardar unos segundos en registrar la orden

type OrderData = {
  productName: string;
  email: string;
  amountTotal: number;
  currency: string;
  /** custom_data del Purchase para el pixel (el mismo que manda stripe-webhook por Conversions API). */
  tracking: Record<string, unknown>;
  download: { filename: string; url: string | null } | null;
};

type LoadState = "loading" | "ok" | "no-session" | "error";

const IMG = "/piscinas";
/** Vista previa: solo en desarrollo (Vite). En producción `import.meta.env.DEV` es false y el parámetro se ignora. */
const DEMO_PARAMS = import.meta.env.DEV ? new URLSearchParams(window.location.search) : null;
const IS_DEMO = !!DEMO_PARAMS && DEMO_PARAMS.get("demo") === "1";
const DEMO_ORDER: OrderData = {
  productName: BRAND,
  email: "tu-correo@ejemplo.com",
  amountTotal: 3000,
  currency: "usd",
  tracking: {},
  download: { filename: "Kit-Conseguir-Clientes-Piscinas.zip", url: "https://example.invalid/vista-previa/Kit-Conseguir-Clientes-Piscinas.zip" },
};

function readFlags() {
  const params = new URLSearchParams(window.location.search);
  if (IS_DEMO) return { up1: params.get("up1") === "1", up2: params.get("up2") === "1" };
  if (params.get("up") === "2") writeSession(UP2_FLAG_KEY, "bought");
  return {
    up1: readSession(UP1_FLAG_KEY) === "bought",
    up2: params.get("up") === "2" || readSession(UP2_FLAG_KEY) === "bought",
  };
}

function resolveSessionId(): string | null {
  if (IS_DEMO) return null;
  const fromUrl = new URLSearchParams(window.location.search).get("session_id");
  if (fromUrl) {
    writeSession(FRONT_SESSION_KEY, fromUrl);
    return fromUrl;
  }
  return readSession(FRONT_SESSION_KEY);
}

const PiscinasTy = () => {
  const [state, setState] = useState<LoadState>(IS_DEMO ? "ok" : "loading");
  const [order, setOrder] = useState<OrderData | null>(IS_DEMO ? DEMO_ORDER : null);
  const [sessionId] = useState<string | null>(resolveSessionId);
  const [flags] = useState(readFlags);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    document.title = PAGE_TITLE;
    return addNoindex(); // Página privada: muestra una compra y su descarga.
  }, []);

  useEffect(() => {
    if (IS_DEMO || !PISCINAS_PIXEL_ID) return;
    initMetaPixel(PISCINAS_PIXEL_ID);
    trackMetaEvent("PageView", undefined, undefined, PISCINAS_PIXEL_ID);
  }, []);

  const load = useCallback((id: string, retriesLeft: number) => {
    setState("loading");
    fetch(`${FUNCTIONS_URL}/piscinas-get-order?session_id=${encodeURIComponent(id)}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data: OrderData) => {
        setOrder(data);
        setState("ok");
      })
      .catch(() => {
        if (retriesLeft > 0) setTimeout(() => load(id, retriesLeft - 1), RETRY_DELAY_MS);
        else setState("error");
      });
  }, []);

  useEffect(() => {
    if (IS_DEMO) return;
    if (!sessionId) {
      setState("no-session");
      return;
    }
    load(sessionId, MAX_AUTO_RETRIES);
  }, [sessionId, load, attempt]);

  // Purchase una sola vez por compra confirmada (event_id = session_id de Stripe, igual que el servidor). Sin pixel, no hace nada.
  useEffect(() => {
    if (IS_DEMO || !PISCINAS_PIXEL_ID || state !== "ok" || !order || !sessionId) return;
    const dedupeKey = `fb_purchase_fired_${sessionId}`;
    try {
      if (localStorage.getItem(dedupeKey)) return;
      trackMetaEvent("Purchase", order.tracking, sessionId, PISCINAS_PIXEL_ID);
      localStorage.setItem(dedupeKey, "1");
    } catch {
      trackMetaEvent("Purchase", order.tracking, sessionId, PISCINAS_PIXEL_ID);
    }
  }, [state, order, sessionId]);

  // Marca como comprada la sesión de ab_sessions que hizo clic en comprar el kit (una sola vez).
  useEffect(() => {
    if (!IS_DEMO && state === "ok" && order) trackAbPurchase();
  }, [state, order]);

  const downloadUrl = order?.download?.url ?? null;
  const anyService = flags.up1 || flags.up2;

  const Tri = () => <svg className="ty2-tri" aria-hidden="true"><use href="#i-triangle-right" /></svg>;

  // Contacto: WhatsApp (verde) + correo. Sirve para pedir ayuda con la descarga y para iniciar el onboarding de los servicios.
  const waHref = `https://wa.me/${PISCINAS_TY_WHATSAPP}`;
  const contactButtons = (waText: string) => (
    <div className="ty2-contact">
      <a href={`${waHref}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener noreferrer" className="ty2-btn wa">
        <svg className="ty2-wa" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3C8.8 3 3 8.7 3 15.8c0 2.5.7 4.8 2 6.8L3.5 29l6.6-1.7a13 13 0 0 0 5.9 1.4c7.2 0 13-5.700 13-12.800S23.200 3 16 3z" fill="#fff" /><path d="M22.300 19.300c-.3-.2-1.900-.9-2.200-1s-.5-.2-.7.2-.8 1-1 1.200-.4.2-.7.1a8.700 8.700 0 0 1-4.300-3.800c-.3-.5.3-.5.9-1.600.1-.2 0-.4 0-.5l-1-2.300c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.500s1.100 2.900 1.200 3.100c.2.2 2.100 3.300 5.200 4.600 2 .8 2.800.9 3.800.7.600-.1 1.900-.8 2.200-1.500.3-.7.3-1.400.2-1.500-.1-.1-.3-.2-.6-.4z" fill="#178A43" /></svg>
        Escríbenos por WhatsApp
      </a>
      <a href={`mailto:${PISCINAS_TY_EMAIL}`} className="ty2-btn mail">
        <Icon name="i-mail" />
        Escríbenos por correo
      </a>
    </div>
  );

  const serviceBlock = (
    <>
      {flags.up1 && (
        <div className="ty2-service">
          <PiscinasImage src={`${IMG}/upsell1-cajas.png`} alt="Sistema Calendario Lleno" className="pc-mockup-img" wrapperClass="ty2-box" width={1024} height={1024} />
          <h3>Tu campaña: falta un paso</h3>
          <p><strong>Para iniciar tu onboarding es indispensable que nos escribas</strong> por WhatsApp o por correo, con los botones que están al final de esta página. Con tu mensaje empezamos a preparar tus anuncios, tu landing con calendario y tu cuenta.</p>
          <p><strong>Qué pasa después:</strong> preparamos todo y lo tienes listo en máximo 7 días desde que nos envías toda la información de tu negocio; agendamos tu llamada de estrategia de 1 hora.</p>
        </div>
      )}
      {flags.up2 && (
        <div className="ty2-service">
          <PiscinasImage src={`${IMG}/upsell2-bundle.png`} alt="Servicio Profesional Completo Calendario Lleno En Automático" className="pc-mockup-img" wrapperClass="ty2-box" width={1024} height={1024} />
          <h3>Bienvenido al servicio completo</h3>
          <p><strong>Para iniciar tu onboarding es indispensable que nos escribas</strong> por WhatsApp o por correo, con los botones que están al final de esta página. Con tu mensaje empezamos tu gestión.</p>
        </div>
      )}
    </>
  );

  const stateIntro = (icon: string, title: string, text: React.ReactNode) => (
    <>
      <span className="ty2-state-ico"><Icon name={icon} /></span>
      <h2>{title}</h2>
      <p>{text}</p>
    </>
  );

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href={PIS_FONT_HREF} rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&display=swap" rel="stylesheet" />
      {!IS_DEMO && PISCINAS_PIXEL_ID && (
        <noscript>
          <img height="1" width="1" style={{ display: "none" }} src={`https://www.facebook.com/tr?id=${PISCINAS_PIXEL_ID}&ev=PageView&noscript=1`} alt="" />
        </noscript>
      )}
      <style>{PIS_CSS + PIS_CSS_V2 + PIS_CAL_CSS + PIS_UP1_CSS + PIS_TY_CSS}</style>

      <div className="pis-page pis-v1">
        <PiscinasIcons />

        {IS_DEMO && (
          <div className="ty2-demo"><div className="container">Vista previa (solo en desarrollo): orden simulada, el botón de descarga no descarga nada.</div></div>
        )}

        {state === "loading" && (
          <section className="sec-dark ty2-state">
            <div className="container">
              <div className="ty2-spin" />
              <h2>Cargando tu compra…</h2>
              <p>Estamos preparando tu descarga. Tarda solo unos segundos.</p>
            </div>
          </section>
        )}

        {state === "no-session" && (
          <>
            <section className="sec-dark ty2-state">
              <div className="container">
                {stateIntro("i-mail", "No encontramos ninguna compra en este enlace", "No te preocupes: si acabas de pagar, tu descarga está en tu correo.")}
                <ol className="ty2-steps">
                  <li className="ty2-step"><span className="n">1</span><p>Revisa tu correo y busca el que dice «{EMAIL_SUBJECT}». Ahí está tu enlace directo.</p></li>
                  <li className="ty2-step"><span className="n">2</span><p>Si no lo ves, revisa spam o promociones.</p></li>
                  <li className="ty2-step"><span className="n">3</span><p>¿Sigue sin aparecer? Escríbenos y te ayudamos: contesta una persona.</p></li>
                </ol>
                {contactButtons("Hola, necesito ayuda con mi compra del Kit Llena tu Calendario de Piscinas.")}
              </div>
            </section>
            {anyService && (
              <section className="sec-light ty2-body" style={{ paddingTop: 36 }}>
                <div className="container">{serviceBlock}</div>
              </section>
            )}
          </>
        )}

        {state === "error" && (
          <section className="sec-dark ty2-state">
            <div className="container">
              {stateIntro("i-clock", "Aún no vemos tu compra", <>A veces el pago tarda unos segundos en confirmarse. Toca el botón para intentarlo de nuevo. Si el problema sigue, usa el enlace del correo de confirmación («{EMAIL_SUBJECT}»).</>)}
              <button type="button" className="ty2-btn green" onClick={() => setAttempt((n) => n + 1)}>Reintentar<Tri /></button>
              {contactButtons("Hola, necesito ayuda con mi compra del Kit Llena tu Calendario de Piscinas.")}
            </div>
          </section>
        )}

        {state === "ok" && order && (
          <>
            {/* Confirmación */}
            <header className="hero sec-dark ty2-hero">
              <div className="container up1-wrap">
                <svg className="ty2-check" viewBox="0 0 96 96" role="img" aria-label="Compra aprobada">
                  <circle className="u1f-badge" cx="48" cy="48" r="44" fill="#1B8A55" />
                  <path className="u1f-check" pathLength={1} d="M28 50l14 14 27-30" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="ty2-pill">¡Compra aprobada!</span>
                <h1>Instrucciones de acceso</h1>
                <p className="sub ty2-thanks">¡Felicidades por tu compra! Gracias por confiar en nosotros. <mark>Tu kit ya es tuyo: vamos a ayudarte a empezar.</mark></p>
                <PiscinasImage src={`${IMG}/mockup-bundle.png`} alt={BRAND} className="pc-mockup-img" wrapperClass="ty2-bundle" width={1024} height={1024} />
              </div>
            </header>

            {/* Descarga */}
            <section className="sec-light ty2-body" style={{ paddingTop: "clamp(36px,6vw,56px)" }}>
              <div className="container">
                <p className="ty2-lead">Para descargar tu <strong>{BRAND}</strong>, toca el botón verde de abajo.</p>

                <div className="ty2-dl">
                  {downloadUrl ? (
                    <>
                      <a
                        href={downloadUrl}
                        className="ty2-btn green"
                        download={order.download?.filename}
                        onClick={IS_DEMO ? (e) => e.preventDefault() : undefined}
                      >
                        <Icon name="i-download" />Descargar mi kit (ZIP)<Tri />
                      </a>
                      <p className="ty2-dl-note">Este botón sirve durante 1 hora. Si vence, vuelve a abrir el enlace de tu correo.</p>
                    </>
                  ) : (
                    <>
                      <p className="ty2-dl-note" style={{ marginTop: 0 }}>No pudimos preparar tu descarga en este momento.</p>
                      <button type="button" className="ty2-btn green" style={{ marginTop: 14 }} onClick={() => setAttempt((n) => n + 1)}>Reintentar<Tri /></button>
                    </>
                  )}
                  <p className="ty2-mail"><Icon name="i-mail" /><span>Los mismos datos te llegan a tu correo ({order.email}). Busca el que dice <strong>«{EMAIL_SUBJECT}»</strong>. Si no lo ves, revisa spam o promociones.</span></p>
                </div>
              </div>
            </section>

            {/* Onboarding según lo comprado */}
            {anyService && (
              <section className="sec-light ty2-body" style={{ paddingTop: "clamp(36px,6vw,56px)" }}>
                <div className="container">{serviceBlock}</div>
              </section>
            )}

            {/* Soporte humano */}
            <section className="sec-light ty2-body" style={{ paddingTop: anyService ? 0 : "clamp(36px,6vw,56px)" }}>
              <div className="container">
                <div className="ty2-help">
                  {anyService ? (
                    <p><strong>Escríbenos para iniciar tu onboarding.</strong> Es indispensable para empezar. Por aquí también te ayudamos si tienes problemas con tu descarga — contesta una persona.</p>
                  ) : (
                    <p><strong>¿No te llegó o no puedes descargar?</strong> Escríbenos y te ayudamos — contesta una persona.</p>
                  )}
                  {contactButtons(anyService ? "Hola, compré un servicio del Sistema Calendario Lleno y quiero iniciar mi onboarding." : "Hola, necesito ayuda con mi compra del Kit Llena tu Calendario de Piscinas.")}
                </div>
              </div>
            </section>
          </>
        )}

      </div>
    </>
  );
};

export default PiscinasTy;
