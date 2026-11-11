import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CalendarRenderer from "@/components/crm/CalendarRenderer";
import { EstimadosSupportFooter } from "@/components/estimados/EstimadosSupportFooter";
import { EST_CSS, EST_FONT_HREF } from "@/components/estimados/estimadosStyles";
import { EST_TY_CSS } from "@/components/estimados/estimadosTyStyles";
import { saveBooking } from "@/lib/estimadosBooking";
import { initMetaPixel, trackMetaEvent } from "@/lib/metaPixel";
import { addNoindex, readSession, trackAbPurchase, writeSession } from "@/lib/piscinasFunnel";
import { uuid } from "@/lib/uuid";
import {
  ESTIMADOS_AB_CHECKOUT_SESSION_KEY,
  ESTIMADOS_CALL_CALENDAR_ID,
  ESTIMADOS_CALL_VALUE,
  ESTIMADOS_CONTENT_NAME,
  ESTIMADOS_DONE_PATH,
  ESTIMADOS_FRONT_SESSION_KEY,
  ESTIMADOS_IMG as IMG,
  ESTIMADOS_PIXEL_ID,
  ESTIMADOS_PRODUCT_SLUG,
  ESTIMADOS_TY_VIDEO_URL,
  estimadosCallEventParams,
} from "@/lib/estimadosConfig";

// /estimados-ty — la página que ve quien acaba de pagar el kit de US$30. NO es una thank-you de agradecimiento ni un upsell que vende:
// REGALA una llamada de consultoría (valor normal US$100, «aquí y ahora» gratis) sobre cómo conseguir más clientes con anuncios de pago en
// Facebook y Google Ads. Corta a propósito: el VIDEO tiene que quedar en la primera pantalla, sin hacer scroll (decisión de Daniel,
// 2026-11-07), así que arriba solo hay una barra compacta, la imagen 3D del regalo, el título y una caja corta. Orden (método de Nico
// Seoane para páginas de llamadas):
//   1. barra compacta de confirmación con progreso al 90 %,
//   2. imagen 3D de regalo + título («recibiste un regalo valuado en US$100») + caja con ícono de laptop,
//   3. VIDEO (el guion se define después: sin URL no se muestra en producción),
//   4. «valor normal → aquí y ahora gratis» en una sola línea y la lista numerada de qué se consigue en la llamada,
//   5. calendario del CRM de la cuenta ADMIN, directo (sin título propio: el calendario trae el suyo), con un formulario de SOLO el
//      WhatsApp: el nombre y el correo salen de la compra en Stripe (estimados-get-order) y viajan con la reserva, así que el CRM
//      recibe el contacto completo,
//   6. pie con el contacto de soporte (correo y WhatsApp), visible también cuando la compra no se encuentra.
// (Quitados a pedido de Daniel el 2026-11-07: la nota «Cómo funciona…» y el título «Elige el día y la hora de tu llamada».)
// AL RESERVAR la llamada se pasa a la página FINAL del embudo (/estimados-gracias: barra al 100 % con confeti, cómo descargar el kit, resumen de la
// cita y ayuda), donde se dispara el evento Lead. Aquí se guarda el resumen de la cita (src/lib/estimadosBooking.ts) y sale el evento Schedule.
//
// El kit NO se descarga desde esta página: el enlace de Google Drive le llega por correo (Resend, desde stripe-webhook).
// Antes de pautar tráfico falta ESTIMADOS_TY_VIDEO_URL (src/lib/estimadosConfig.ts). Eventos de Meta (solo con ESTIMADOS_PIXEL_ID, y nunca en
// localhost salvo con ?fbtest=1): PageView y Purchase aquí, Schedule al reservar. Página privada: noindex.
// Vista previa: SOLO con `import.meta.env.DEV`, `?demo=1` usa una compra simulada (sin llamar a estimados-get-order) y `&calendar=<id>`
// prueba un calendario real. En producción esos parámetros se ignoran.

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const PAGE_TITLE = "Recibiste un regalo de US$100: llamada de consultoría gratis | +50 Anuncios Virales para Tree Services";
const RETRY_DELAY_MS = 3000;
const MAX_AUTO_RETRIES = 4; // el webhook de Stripe puede tardar unos segundos en registrar la compra
/** Verde de la marca de la página; el calendario (de otro dueño) lo usa en vez de su color guardado. */
const CALENDAR_COLOR = "#1F4D36";

/** Lo que el calendario entrega al confirmar una reserva (ver onBookingSuccess en CalendarRenderer). */
type CalendarBooking = { date: string; hour: number; minute: number; calendarTz: string; visitorTz: string; calendarName: string };

type OrderData = {
  productName: string;
  /** Nombre que se escribió en el checkout de Stripe; null si no se guardó (compras anteriores a la migración). */
  name: string | null;
  email: string;
  amountTotal: number;
  currency: string;
  /** custom_data del Purchase para el pixel (el mismo que mandaría stripe-webhook por Conversions API). */
  tracking: Record<string, unknown>;
};

type LoadState = "loading" | "ok" | "no-session" | "error";

/** Vista previa: solo en desarrollo (Vite). En producción `import.meta.env.DEV` es false y los parámetros se ignoran. */
const DEMO_PARAMS = import.meta.env.DEV ? new URLSearchParams(window.location.search) : null;
const IS_DEMO = !!DEMO_PARAMS && DEMO_PARAMS.get("demo") === "1";
const DEMO_ORDER: OrderData = {
  productName: ESTIMADOS_CONTENT_NAME,
  name: "Carlos Ramírez",
  email: "carlos@ejemplo.com",
  amountTotal: 3000,
  currency: "usd",
  tracking: {},
};

function resolveSessionId(): string | null {
  if (IS_DEMO) return null;
  const fromUrl = new URLSearchParams(window.location.search).get("session_id");
  if (fromUrl) {
    writeSession(ESTIMADOS_FRONT_SESSION_KEY, fromUrl);
    return fromUrl;
  }
  return readSession(ESTIMADOS_FRONT_SESSION_KEY);
}

const firstNameOf = (name: string | null | undefined): string | null => {
  const first = name?.trim().split(/\s+/)[0];
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : null;
};

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
const ArrowIcon = () => (
  <svg className="est-ty-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
/**
 * Regalo: un billete de US$100 con un moño naranja (ilustración 3D), para que se entienda que es un regalo valuado en US$100. Imagen con
 * transparencia en public/estimados/regalo.{webp,png} (348×176; se muestra a ~62 px de alto), generada con GPT Image 2 en la cuenta KIE de
 * Daniel el 2026-11-07 (variante B; la A, un fajo de billetes, queda en Landing/_src/regalo/). Billete estilizado, sin retrato ni seriales.
 */
const GiftImage = () => (
  <picture className="est-ty-gift3d">
    <source srcSet={`${IMG}/regalo.webp`} type="image/webp" />
    <img src={`${IMG}/regalo.png`} width={107} height={54} alt="Un billete de 100 dólares con un moño de regalo" />
  </picture>
);
/** La llamada es por computadora: laptop (sin círculo detrás). */
const LaptopIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="4.5" y="4.5" width="15" height="10.5" rx="1.6" />
    <path d="M2.5 19h19" />
    <path d="M9.5 17h5" />
  </svg>
);
/** Video de la página. Nunca inventa video: con URL lo incrusta (.mp4/.webm → <video>; otra URL → reproductor en iframe); sin URL, solo en desarrollo muestra un recuadro rotulado. */
function VideoSlot({ url }: { url: string }) {
  if (!url) {
    if (!import.meta.env.DEV) return null;
    return (
      <div className="est-ty-vid">
        <div className="est-wrap">
          <div className="est-ty-video est-ty-video--empty">
            <p><b>Espacio del video</b>Aún no hay video. Cuando exista, se pega su URL en ESTIMADOS_TY_VIDEO_URL y esta página lo muestra.</p>
          </div>
        </div>
      </div>
    );
  }
  const isFile = /\.(mp4|webm|m4v)(\?|#|$)/i.test(url);
  return (
    <div className="est-ty-vid">
      <div className="est-wrap">
        <div className="est-ty-video">
          {isFile ? (
            <video src={url} controls playsInline preload="metadata" title="Video sobre tu regalo" />
          ) : (
            <iframe src={url} title="Video sobre tu regalo" allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy" />
          )}
        </div>
      </div>
    </div>
  );
}

const EstimadosTy = () => {
  const navigate = useNavigate();
  const [sessionId] = useState<string | null>(resolveSessionId);
  const [state, setState] = useState<LoadState>(IS_DEMO ? "ok" : "loading");
  const [order, setOrder] = useState<OrderData | null>(IS_DEMO ? DEMO_ORDER : null);
  const [attempt, setAttempt] = useState(0);

  // Se lee en cada render (no a nivel de módulo) para que las pruebas puedan cambiarla.
  const calendarId = ((IS_DEMO && DEMO_PARAMS?.get("calendar")) || ESTIMADOS_CALL_CALENDAR_ID).trim();

  useEffect(() => {
    document.title = PAGE_TITLE;
    return addNoindex(); // Página privada: muestra una compra.
  }, []);

  // PageView al cargar. Con PIXEL_ID vacío no hace nada.
  useEffect(() => {
    if (IS_DEMO || !ESTIMADOS_PIXEL_ID) return;
    initMetaPixel(ESTIMADOS_PIXEL_ID);
    trackMetaEvent("PageView", undefined, undefined, ESTIMADOS_PIXEL_ID);
  }, []);

  // Pide la compra a estimados-get-order. El webhook de Stripe puede tardar unos segundos en registrarla: se reintenta solo.
  useEffect(() => {
    if (IS_DEMO) return;
    if (!sessionId) {
      setState("no-session");
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = (retriesLeft: number) => {
      setState("loading");
      fetch(`${FUNCTIONS_URL}/estimados-get-order?session_id=${encodeURIComponent(sessionId)}`)
        .then((res) => {
          if (!res.ok) throw new Error("not found");
          return res.json();
        })
        .then((data: OrderData) => {
          if (cancelled) return;
          setOrder(data);
          setState("ok");
        })
        .catch(() => {
          if (cancelled) return;
          if (retriesLeft > 0) timer = setTimeout(() => run(retriesLeft - 1), RETRY_DELAY_MS);
          else setState("error");
        });
    };
    run(MAX_AUTO_RETRIES);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId, attempt]);

  // Purchase una sola vez por compra confirmada (event_id = session_id de Stripe, igual que el servidor). Sin pixel, no hace nada.
  useEffect(() => {
    if (IS_DEMO || !ESTIMADOS_PIXEL_ID || state !== "ok" || !order || !sessionId) return;
    const dedupeKey = `fb_purchase_fired_${sessionId}`;
    try {
      if (localStorage.getItem(dedupeKey)) return;
      trackMetaEvent("Purchase", order.tracking, sessionId, ESTIMADOS_PIXEL_ID);
      localStorage.setItem(dedupeKey, "1");
    } catch {
      trackMetaEvent("Purchase", order.tracking, sessionId, ESTIMADOS_PIXEL_ID);
    }
  }, [state, order, sessionId]);

  // Marca como comprada la sesión de ab_sessions que hizo clic en comprar en la landing (una sola vez).
  useEffect(() => {
    if (!IS_DEMO && state === "ok" && order) trackAbPurchase(ESTIMADOS_AB_CHECKOUT_SESSION_KEY);
  }, [state, order]);

  // La llamada quedó reservada: (1) evento Schedule de Meta (sin value: es gratis; solo del navegador, porque la lista de eventos del servidor
  // —product-track-event— es cerrada y no incluye Schedule), (2) se guarda el resumen de la cita y (3) se pasa a la página FINAL del embudo
  // (/estimados-gracias), que muestra la cita y dispara el evento Lead. Es navegación dentro de la app (sin recargar), así el evento de arriba sale completo.
  const handleBooked = (booking: CalendarBooking) => {
    if (ESTIMADOS_PIXEL_ID) {
      try {
        trackMetaEvent("Schedule", estimadosCallEventParams(), uuid(), ESTIMADOS_PIXEL_ID);
      } catch { /* no crítico */ }
    }
    saveBooking({ ...booking, email: order?.email ?? null, name: order?.name ?? null, sessionId, bookedAt: Date.now() });
    navigate(ESTIMADOS_DONE_PATH);
  };

  const firstName = firstNameOf(order?.name);

  const stateCard = (spinner: boolean, title: string, text: string, retry?: boolean) => (
    <section className="est-ty-state">
      <div className="est-wrap">
        {spinner && <span className="est-ty-spin" role="status" aria-label="Cargando" />}
        <h2>{title}</h2>
        <p>{text}</p>
        {retry && (
          <button type="button" className="est-btn" onClick={() => setAttempt((a) => a + 1)}>Reintentar</button>
        )}
      </div>
    </section>
  );

  const ok = state === "ok" && order;

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href={EST_FONT_HREF} rel="stylesheet" />
      {!IS_DEMO && ESTIMADOS_PIXEL_ID && (
        <noscript>
          <img height="1" width="1" style={{ display: "none" }} src={`https://www.facebook.com/tr?id=${ESTIMADOS_PIXEL_ID}&ev=PageView&noscript=1`} alt="" />
        </noscript>
      )}
      <style>{EST_CSS + EST_TY_CSS}</style>

      {/* est-ty-root: columna a pantalla completa para que el pie negro quede siempre pegado al fondo (también en los estados cortos). */}
      <div className="est-ty-root">
      <div className="est-page est-ty" data-product={ESTIMADOS_PRODUCT_SLUG} aria-label="Tu regalo: llamada de consultoría gratis">
        {state === "loading" && stateCard(true, "Confirmando tu compra", "Un momento, estamos confirmando tu pago.")}
        {state === "no-session" && stateCard(false, "No encontramos tu compra", "Abre esta página desde el enlace del correo de confirmación que te enviamos al pagar.")}
        {state === "error" && stateCard(false, "Todavía no vemos tu compra", "A veces el pago tarda un minuto en registrarse. Vuelve a intentarlo en unos segundos.", true)}

        {ok && (
          <>
            {/* ============ 1. BARRA COMPACTA DE CONFIRMACIÓN ============ */}
            <section className="est-ty-bar">
              <div className="est-wrap">
                <div className="est-ty-bar-head">
                  <span className="est-ty-check"><CheckIcon /></span>
                  <strong className="est-ty-bar-title">¡Compra confirmada!</strong>
                  <b className="est-ty-pct">90%</b>
                </div>
                <div className="est-ty-track" role="progressbar" aria-label="Progreso de tu pedido" aria-valuemin={0} aria-valuemax={100} aria-valuenow={90}>
                  <div className="est-ty-fill" />
                </div>
                <p className="est-ty-bar-sub">Estamos enviando tu kit a <b>{order.email || "tu correo"}</b>.</p>
              </div>
            </section>

            {/* ============ 2. ÍCONO DE REGALO, TÍTULO Y CAJA DE LA LLAMADA ============ */}
            <section className="est-ty-gift">
              <div className="est-wrap">
                <GiftImage />
                {/* Mismo estilo que «Valor normal» (Inter 600, color de texto): ver .est-ty-intro y .est-ty-lbl en estimadosTyStyles.ts. */}
                <p className="est-ty-intro">Tu compra se realizó con éxito y recibirás tu kit en tu correo electrónico. Mientras tanto, déjame contarte una buena noticia...</p>
                <h1>{firstName ? `${firstName}, recibiste` : "Recibiste"} un regalo valuado en <span className="est-hl">US${ESTIMADOS_CALL_VALUE}</span></h1>
                <div className="est-ty-callbox">
                  <span className="est-ty-callico"><LaptopIcon /></span>
                  <p>Una <b>llamada de consultoría GRATIS</b> para conseguir más clientes con anuncios de pago en <b>Facebook y Google Ads</b>.</p>
                </div>
              </div>
            </section>

            {/* ============ 3. VIDEO (queda en la primera pantalla) ============ */}
            <VideoSlot url={ESTIMADOS_TY_VIDEO_URL} />

            {/* ============ 4. VALOR Y QUÉ PASA EN LA LLAMADA ============ */}
            <section className="est-ty-get">
              <div className="est-wrap">
                {/* Una sola línea: las dos etiquetas («Valor normal» y «Aquí y ahora») comparten tipografía (clase est-ty-lbl). */}
                <p className="est-ty-value">
                  <span className="est-ty-lbl">Valor normal</span>{" "}
                  <s className="est-ty-old">US${ESTIMADOS_CALL_VALUE}</s>{" "}
                  <ArrowIcon />{" "}
                  <span className="est-ty-lbl">Aquí y ahora</span>{" "}
                  <b className="est-ty-free">Gratis</b>
                </p>

                <h2>Qué vas a conseguir en la llamada</h2>
                <ol className="est-ty-list">
                  <li><span>Revisamos <b>cómo estás consiguiendo clientes hoy</b>.</span></li>
                  <li><span>Te decimos <b>qué anuncios en Facebook y Google te convienen</b> y con cuánto presupuesto empezar.</span></li>
                  <li><span>Te vas con <b>un plan claro</b> para ponerlo en marcha.</span></li>
                </ol>
              </div>
            </section>
          </>
        )}
      </div>

      {/* El calendario va FUERA de .est-page a propósito: sus <p>, <h2>… son de Tailwind y los estilos de la página los deformarían. */}
      {ok && (
        <div className="est-ty-calsec">
          {calendarId ? (
            <div className="est-ty-cal">
              <CalendarRenderer
                calendarId={calendarId}
                lang="es"
                primaryColorOverride={CALENDAR_COLOR}
                prefill={{ name: order.name ?? undefined, email: order.email }}
                requireWhatsapp
                phoneDefaultDial="+1"
                onBookingSuccess={handleBooked}
              />
            </div>
          ) : (
            <div className="est-ty-calmsg">
              {import.meta.env.DEV ? (
                <><b>Espacio del calendario</b>Aún no hay calendario. Cuando exista, se pega su id en ESTIMADOS_CALL_CALENDAR_ID (o prueba uno con ?calendar=&lt;id&gt;).</>
              ) : (
                <><b>Calendario no disponible</b>Por ahora no podemos mostrar los horarios. Vuelve a abrir esta página más tarde.</>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============ 6. PIE: SOPORTE (siempre visible, también si la compra no se encuentra) ============ */}
      <EstimadosSupportFooter />
      </div>
    </>
  );
};

export default EstimadosTy;
