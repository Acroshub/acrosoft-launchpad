import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { EstimadosSupportFooter } from "@/components/estimados/EstimadosSupportFooter";
import { EST_CSS, EST_FONT_HREF } from "@/components/estimados/estimadosStyles";
import { EST_END_CSS } from "@/components/estimados/estimadosGraciasStyles";
import { EST_TY_CSS } from "@/components/estimados/estimadosTyStyles";
import { readBooking, type EstimadosBooking } from "@/lib/estimadosBooking";
import { initMetaPixel, trackMetaEvent } from "@/lib/metaPixel";
import { addNoindex, readSession } from "@/lib/piscinasFunnel";
import { formatBookingSummary } from "@/lib/slotTime";
import {
  ESTIMADOS_EMAIL_SENDER,
  ESTIMADOS_EMAIL_SUBJECT,
  ESTIMADOS_FRONT_SESSION_KEY,
  ESTIMADOS_PIXEL_ID,
  ESTIMADOS_PRODUCT_SLUG,
  ESTIMADOS_TY_PATH,
  estimadosCallEventParams,
} from "@/lib/estimadosConfig";
import { isEstimadosPreview } from "@/lib/estimadosPreview";

// /estimados-gracias — la página FINAL del embudo, a la que se llega al agendar la llamada en /estimados-ty (decisión de Daniel, 2026-11-07).
//   · Barra superior: la del 90 % de la página anterior ahora sube hasta el 100 % y suelta confeti (una sola vez; sin movimiento si la persona lo pidió).
//   · Sección 1: instrucciones para descargar el kit DESDE EL CORREO (el enlace de Google Drive va solo en el correo de Resend; esta página no lo muestra).
//   · Sección 2: resumen de la fecha y la hora de la llamada (en la zona de quien reservó) y aviso de que se le escribirá por WhatsApp para coordinar.
//   · Sección 3: datos de contacto para ayuda (pie oscuro): el WhatsApp y el correo de soporte.
// Pixel de Meta: PageView y, SOLO si hay una cita recién agendada, el evento Lead (una vez por cita, aunque se recargue). Nunca en localhost salvo con
// ?fbtest=1. Página privada: noindex. Sin cita (se abre directo) muestra la sección 2 como «aún no agendas» con un botón para volver a agendar.
// Vista previa: `?demo=1` (desarrollo) o `?demo=<ESTIMADOS_PREVIEW_KEY>` (producción), o venir de la vista previa de /estimados-ty: cita simulada o la que se eligió, sin eventos de Meta.

const PAGE_TITLE = "¡Todo listo! Tu llamada está agendada | +50 Anuncios Virales para Tree Services";
const CONFETTI_COLORS = ["#EA5A0B", "#1F4D36", "#FFB27A", "#F2C94C", "#7DDBA3", "#C94E08"];
const CONFETTI_PIECES = 48;
const CONFETTI_MS = 5200; // lo que dura la caída más el retraso de la barra; después se quita del DOM

/** Vista previa (ver estimadosPreview.ts). */
const IS_DEMO = isEstimadosPreview();

/** Cita simulada: mañana a las 12:00 en La Paz (la zona del calendario del admin), mostrada en la zona de quien abre la página. */
function demoBooking(): EstimadosBooking {
  const t = new Date(Date.now() + 24 * 3600 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`,
    hour: 12, minute: 0,
    calendarTz: "America/La_Paz",
    visitorTz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    calendarName: "Selecciona el día y la hora",
    email: "carlos@ejemplo.com", name: "Carlos Ramírez", sessionId: null, bookedAt: 1,
  };
}

const firstNameOf = (name: string | null | undefined): string | null => {
  const first = name?.trim().split(/\s+/)[0];
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : null;
};

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);

/** Confeti de una sola caída. Posiciones y tiempos salen de la posición de cada pieza (sin azar), así la página se ve igual en cada carga. */
function Confetti() {
  const pieces = useMemo(() => Array.from({ length: CONFETTI_PIECES }, (_, i) => ({
    "--x": `${(i * 53) % 100}%`,
    "--dx": `${((i * 29) % 90) - 45}px`,
    "--w": `${7 + (i % 3) * 2}px`,
    "--r": `${(i * 47) % 360}deg`,
    "--c": CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    "--d": `${(2.2 + ((i * 3) % 7) * 0.25).toFixed(2)}s`,
    "--delay": `${(1.0 + ((i * 7) % 10) * 0.07).toFixed(2)}s`, // arranca cuando la barra ya llegó al 100 %
  } as CSSProperties)), []);
  return (
    <div className="est-end-confetti" aria-hidden="true" data-testid="confeti">
      {pieces.map((style, i) => <i key={i} style={style} />)}
    </div>
  );
}

const EstimadosGracias = () => {
  const [booking] = useState<EstimadosBooking | null>(() => (IS_DEMO ? readBooking() ?? demoBooking() : readBooking()));
  const [showConfetti, setShowConfetti] = useState(() => {
    const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return !reduce;
  });

  // Se llega desde /estimados-ty con la pantalla bajada hasta el calendario y el navegador conserva ese scroll al cambiar de página dentro de la app:
  // sin esto la persona caería a mitad de la página, sin ver la barra al 100 % ni el confeti. Se sube ANTES de pintar para que no se vea el salto.
  useLayoutEffect(() => {
    try { window.scrollTo(0, 0); } catch { /* sin scroll (entornos sin ventana real) */ }
  }, []);

  useEffect(() => {
    document.title = PAGE_TITLE;
    return addNoindex(); // Página privada: habla de una compra y de una cita.
  }, []);

  // PageView al cargar. Con PIXEL_ID vacío no hace nada.
  useEffect(() => {
    if (IS_DEMO || !ESTIMADOS_PIXEL_ID) return;
    initMetaPixel(ESTIMADOS_PIXEL_ID);
    trackMetaEvent("PageView", undefined, undefined, ESTIMADOS_PIXEL_ID);
  }, []);

  // Lead: solo si hay una cita recién agendada, y una sola vez por cita (event_id = lead_<momento de la reserva>; localStorage evita repetirlo al recargar).
  useEffect(() => {
    if (IS_DEMO || !ESTIMADOS_PIXEL_ID || !booking) return;
    const eventId = `lead_${booking.bookedAt}`;
    const dedupeKey = `fb_${eventId}_fired`;
    try {
      if (localStorage.getItem(dedupeKey)) return;
      trackMetaEvent("Lead", estimadosCallEventParams(), eventId, ESTIMADOS_PIXEL_ID);
      localStorage.setItem(dedupeKey, "1");
    } catch {
      trackMetaEvent("Lead", estimadosCallEventParams(), eventId, ESTIMADOS_PIXEL_ID);
    }
  }, [booking]);

  // El confeti se quita del DOM cuando termina de caer.
  useEffect(() => {
    if (!showConfetti) return;
    const t = setTimeout(() => setShowConfetti(false), CONFETTI_MS);
    return () => clearTimeout(t);
  }, [showConfetti]);

  const summary = booking ? formatBookingSummary(booking.date, booking.hour, booking.minute, booking.calendarTz, booking.visitorTz) : null;
  const firstName = firstNameOf(booking?.name);
  // Para volver a agendar si abrió esta página sin cita: /estimados-ty necesita el session_id de la compra.
  const sessionId = booking?.sessionId ?? readSession(ESTIMADOS_FRONT_SESSION_KEY);
  const backHref = `${ESTIMADOS_TY_PATH}${sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ""}`;

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
      <style>{EST_CSS + EST_TY_CSS + EST_END_CSS}</style>

      <div className="est-ty-root">
        <div className="est-page est-ty est-end" data-product={ESTIMADOS_PRODUCT_SLUG} aria-label="Tu compra y tu llamada están listas">
          {showConfetti && <Confetti />}

          {/* ============ BARRA: del 90 % al 100 % ============ */}
          <section className="est-ty-bar">
            <div className="est-wrap">
              <div className="est-ty-bar-head">
                <span className="est-ty-check"><CheckIcon /></span>
                <strong className="est-ty-bar-title">¡Todo listo!</strong>
                <b className="est-ty-pct">100%</b>
              </div>
              <div className="est-ty-track" role="progressbar" aria-label="Progreso de tu pedido" aria-valuemin={0} aria-valuemax={100} aria-valuenow={100}>
                <div className="est-ty-fill" />
              </div>
              <p className="est-ty-bar-sub">{booking ? "Tu compra y tu llamada están confirmadas." : "Tu compra está confirmada."}</p>
            </div>
          </section>

          <section className="est-end-hero">
            <div className="est-wrap">
              <h1>{booking ? `${firstName ? `${firstName}, tu` : "Tu"} llamada ya está agendada` : "Tu compra está confirmada"}</h1>
              <p className="est-end-sub">Sigue estos pasos y estate pendiente de tu WhatsApp.</p>
            </div>
          </section>

          <section className="est-end-sec">
            <div className="est-wrap">
              {/* ============ SECCIÓN 1: DESCARGAR EL KIT DESDE EL CORREO ============ */}
              <article className="est-end-card">
                <h2><span className="est-end-num">1</span>Descarga tu kit desde tu correo</h2>
                <ol className="est-end-steps">
                  <li><span>Abre el correo con el que compraste{booking?.email ? <> (<b>{booking.email}</b>)</> : null}.</span></li>
                  <li><span>Busca el mensaje <b>«{ESTIMADOS_EMAIL_SUBJECT}»</b>, enviado por «{ESTIMADOS_EMAIL_SENDER}». Si no lo ves en unos minutos, revisa Spam o Promociones.</span></li>
                  <li><span>Pulsa el botón <b>«Descargar mi kit»</b>: se abre Google Drive.</span></li>
                  <li><span>En Google Drive pulsa el ícono de <b>descarga</b> (la flecha hacia abajo) y espera a que termine. Es un archivo grande: mejor con WiFi.</span></li>
                  <li><span>Descomprime el archivo ZIP: ahí están tus anuncios y la guía para editarlos.</span></li>
                </ol>
              </article>

              {/* ============ SECCIÓN 2: RESUMEN DE LA LLAMADA ============ */}
              <article className="est-end-card">
                <h2><span className="est-end-num">2</span>Tu llamada de consultoría</h2>
                {summary ? (
                  <>
                    <div className="est-end-when" data-testid="resumen-cita">
                      <span className="est-end-day">{summary.dateLabel}</span>
                      <span className="est-end-time">{summary.timeLabel}</span>
                      <span className="est-end-tz">{summary.tzLabel}</span>
                    </div>
                    <p className="est-end-note"><b>Te hablaremos por WhatsApp</b> para coordinar la reunión.</p>
                  </>
                ) : (
                  <>
                    <p className="est-end-empty">Todavía no agendas tu llamada de consultoría gratis.</p>
                    <a className="est-btn" href={backHref}>Agendar mi llamada gratis</a>
                  </>
                )}
              </article>
            </div>
          </section>
        </div>

        {/* ============ SECCIÓN 3: DATOS DE CONTACTO PARA AYUDA ============ */}
        <EstimadosSupportFooter badge="3" title="Datos de contacto para ayuda" />
      </div>
    </>
  );
};

export default EstimadosGracias;
