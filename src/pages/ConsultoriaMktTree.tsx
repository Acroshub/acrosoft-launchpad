import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import CalendarRenderer from "@/components/crm/CalendarRenderer";
import AcrosoftLogo from "@/components/shared/AcrosoftLogo";
import { EstimadosPreviewVideo, bunnyPosterFor } from "@/components/estimados/EstimadosPreviewVideo";
import WhatsAppIcon from "@/components/shared/WhatsAppIcon";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { CT_CSS } from "@/components/estimados/consultoriaTreeStyles";
import { EST_CSS, EST_FONT_HREF } from "@/components/estimados/estimadosStyles";
import { EST_CSS_EXTRA } from "@/components/estimados/estimadosStylesExtra";
import { EST_TY_CSS } from "@/components/estimados/estimadosTyStyles";
import {
  CONSULTORIA_TREE_CALENDAR_ID,
  CONSULTORIA_TREE_MIN_BUDGET,
  CONSULTORIA_TREE_MINUTES,
  CONSULTORIA_TREE_PIXEL_ID,
  CONSULTORIA_TREE_QUALIFICATION,
  CONSULTORIA_TREE_SLUG,
  CONSULTORIA_TREE_VIDEO_URL,
  consultoriaTreeConfirmUrl,
  consultoriaTreeEventParams,
} from "@/lib/consultoriaTreeConfig";
import { ESTIMADOS_IMG as IMG } from "@/lib/estimadosConfig";
import { isEstimadosPreview } from "@/lib/estimadosPreview";
import { initMetaPixel, trackMetaEvent } from "@/lib/metaPixel";
import { addNoindex } from "@/lib/piscinasFunnel";
import { formatBookingSummary } from "@/lib/slotTime";
import { uuid } from "@/lib/uuid";

// /consultoria-mkt-tree — landing de AGENDAMIENTO: el objetivo único es que un dueño de tree service latino en EE.UU. (con presupuesto para
// invertir más de US$2,000 al mes en anuncios) agende una consultoría GRATIS (30 min, por Zoom, Meet o WhatsApp) en la que SÍ sale con un plan de
// marketing claro, trabaje o no con Acrosoft después. Es una mezcla de las dos páginas del embudo del kit: la identidad y las secciones de la
// landing del kit (/estimados-lp: Barlow + naranja/verde, tarjetas, tarjeta de oferta, FAQ, barra fija móvil) y
// lo del upsell (/estimados-ty: VSL con un solo botón Play, lista numerada «qué consigues en la llamada» y calendario del CRM).
//
// Orden (método de Nico Seoane para páginas de llamadas, con el VSL arriba):
//   1. franja superior del kit (avatares + calificación), 2. hero: promesa medible + lista «Sin…» + VSL + CTA, 2b. sellos: logo de Acros Software +
//   Meta y Google, 3. «¿por qué las agencias no pueden llenarte el calendario?» (3 tarjetas deslizables con puntos), 4. el sistema validado en 3
//   pasos (4 pasos cortos: formatos virales, campañas en orden, citas automatizadas, seguimiento semanal), 5. qué te llevas de la consultoría (3 pasos
//   unidos por flechas punteadas), 6. FAQ, 7. cierre. (Quitados el 2026-11-16 a pedido de Daniel: galería de anuncios, «¿Es para tu negocio?», garantía y pie de soporte.)
// El VSL manda: la página nace solo con el hero (título, «Sin…» y el video). Todo lo demás (botón de agendar, sellos, secciones, FAQ, barra fija) se muestra
// 2:50 (lo que dura el VSL) después de que el visitante toca Play; el momento del Play se recuerda en el navegador (`ct_vsl_played_at`). Solo vale con un mp4
// propio (único que avisa del Play); sin VSL o con iframe se muestra todo. En vista previa, `?todo=1` lo muestra todo.
// EXCEPCIÓN: el logo de Acros Software con los sellos de Meta y Google (sección 2b) se ve siempre, también antes del Play.
// TODOS los botones (incluida la barra fija móvil) abren un POPUP con el calendario (el mismo de /estimados-ty); la página no tiene calendario
// incrustado. Al agendar NO se sale de la página: dentro del popup el calendario se reemplaza por la confirmación (día y hora en la zona de quien
// reservó) y salen los eventos Lead y Schedule de Meta. Nace con noindex (como el resto del embudo).
// SIEMPRE registra: no hay modo de vista previa que evite crear la cita (se quitó el 2026-11-19; `?demo` ya no afecta al calendario ni al pixel).
//
// Color de acento: naranja del kit. (2026-11-16 se probó guindo #7D1B3A y se devolvió al naranja a pedido de Daniel.)
// PENDIENTE: decidir si esta campaña usa un pixel propio. (El VSL ya está: CONSULTORIA_TREE_VIDEO_URL en src/lib/consultoriaTreeConfig.ts; sin URL, en producción la sección no se muestra.) Copy sin testimonios, cifras de resultados ni escasez inventados.

const PAGE_TITLE = "Consultoría de marketing gratis para Tree Services | Plan claro con Google Ads y Facebook Ads";
const NOINDEX = true;
/** Verde de la marca de la página (el mismo de /estimados-ty); el calendario (de otro dueño) lo usa en vez de su color guardado. */
const CALENDAR_COLOR = "#1F4D36";

const BUDGET = `US$${CONSULTORIA_TREE_MIN_BUDGET.toLocaleString("en-US")}`;

/** El VSL dura 2:50: el resto de la página (botones, secciones, preguntas…) aparece cuando pasó ese tiempo desde que el visitante tocó Play. */
const VSL_REVEAL_MS = (2 * 60 + 50) * 1000;
/** Momento (ms) en que el visitante tocó Play: se recuerda en el navegador para que recargar la página no vuelva a esconder todo ni reinicie la cuenta. */
const VSL_PLAYED_KEY = "ct_vsl_played_at";
const VSL_IS_FILE = (url: string) => /\.(mp4|webm|m4v)(\?|#|$)/i.test(url);

const readPlayedAt = (): number | null => {
  try {
    const n = Number(localStorage.getItem(VSL_PLAYED_KEY));
    return Number.isFinite(n) && n > 0 && n <= Date.now() ? n : null;
  } catch { return null; }
};

type Booking = { date: string; hour: number; minute: number; calendarTz: string; visitorTz: string; calendarName: string; formData?: Record<string, string> };

const NOTS = [
  { t: "Queman tu dinero probando estrategias a ver si funcionan", d: "No tienen un plan claro, solo quieren cobrar y aprender con tu dinero." },
  { t: "Reportes con Datos Maquillados", d: "Te pasan un PDF mensual con datos que ellos maquillan para que se vea lindo, pero en realidad no te entra dinero a tu negocio." },
  { t: "Compran Datos Compartidos", d: "Te consiguen datos de clientes potenciales, pero lo comparten con tu competencia. Tú pagas, pero aún así te quedas sin el cliente." },
];

/** Subtítulo del hero: objeciones de malas experiencias con agencias tradicionales, en formato «Sin…». */
const SIN = [
  "Sin quemar tu presupuesto “probando estrategias a ver si funciona”",
  "Sin compartir leads con otros negocios. Los estimados serán 100% tuyos",
  "Sin reportes mediocres de “likes y seguidores”",
];

/** El sistema en 4 pasos: explicación neutra de CÓMO funciona (lo que se ve en la consultoría), no una oferta de servicio. Una o dos líneas, sin jerga. */
const HOW = [
  { name: "Anuncios que atraen clientes", text: "Anuncios con formatos virales ya probados, hechos para llamar la atención de quien necesita un tree service." },
  { name: "Campañas en el orden correcto", text: "Google va primero: el anuncio le sale a quien ya está buscando un tree service. Facebook va después: le vuelve a salir a quien ya vio tu negocio." },
  { name: "Citas que se agendan solas", text: "El cliente agenda su estimado sin que tengas que contestar el teléfono mientras trabajas." },
  { name: "Se revisa y se mejora cada semana", text: "Cada semana se revisan los números y se ajustan los anuncios para que rindan más." },
];

/** Icono de rompecabezas 2×2 en líneas: 3 piezas solo con borde y 1 rellena (la que encaja). Cada borde interior es una espiga (1) en una pieza y el hueco (-1) en su vecina. */
const PUZZLE = [
  { x: 3, y: 3, filled: false, sides: [0, 1, 1, 0] },
  { x: 32, y: 3, filled: false, sides: [0, 0, -1, -1] },
  { x: 32, y: 32, filled: true, sides: [1, 0, 0, 1] },
  { x: 3, y: 32, filled: false, sides: [-1, -1, 0, 0] },
]; // lados en orden [arriba, derecha, abajo, izquierda]

function puzzlePath(x: number, y: number, sides: number[]): string {
  const S = 29, HC = 4.9, R = 5.5; // piezas pegadas: la espiga de una es exactamente el hueco de la vecina
  const corners: [number, number][] = [[x, y], [x + S, y], [x + S, y + S], [x, y + S]];
  let d = `M${x} ${y}`;
  for (let i = 0; i < 4; i++) {
    const [ax, ay] = corners[i];
    const [bx, by] = corners[(i + 1) % 4];
    const dx = (bx - ax) / S, dy = (by - ay) / S;
    const mx = ax + dx * S / 2, my = ay + dy * S / 2;
    const t = sides[i];
    if (t === 0) { d += ` L${bx} ${by}`; continue; }
    d += ` L${mx - dx * HC} ${my - dy * HC} A${R} ${R} 0 1 ${t === 1 ? 1 : 0} ${mx + dx * HC} ${my + dy * HC} L${bx} ${by}`;
  }
  return d + " Z";
}

function PuzzleIcon() {
  return (
    <svg className="ct-puzzle" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      {PUZZLE.map((p, i) => (
        <path key={i} d={puzzlePath(p.x, p.y, p.sides)} fill={p.filled ? "#EA5A0B" : "none"} stroke="#1F4D36" strokeWidth="2.4" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

const GETS = [
  <>Revisamos <b>cómo estás consiguiendo clientes hoy</b> y qué te está costando.</>,
  <>Te decimos <b>cómo organizar tus anuncios en Google y Facebook</b> para sacarle el máximo provecho a tu presupuesto.</>,
  <>Te vas con <b>un plan de marketing claro</b>, adaptado a tu negocio, listo para ponerlo en marcha. <b>Totalmente Gratis.</b> Sin importar si luego trabajas o no con nosotros.</>,
  <>Al asistir a la consultoría, <b>te regalamos un website para tu negocio.</b> Es nuestro regalo por tomarte el tiempo de asistir.</>,
];

const FAQ = [
  { q: "¿De verdad es gratis?", a: "Sí. La consultoría no tiene costo ni compromiso, y para agendarla no te pedimos tarjeta." },
  { q: "¿Y si después no quiero trabajar con ustedes?", a: "Te llevas tu plan igual. Puedes ponerlo en marcha por tu cuenta, con tu equipo o con quien tú quieras. Si decides trabajar con nosotros en alguno de nuestros planes de pago, perfecto; si no, sin presión." },
  { q: "¿Cómo funciona el website de regalo?", a: "Cuando asistes a tu consultoría, te regalamos un website para tu negocio de tree service. Es nuestro regalo por asistir a la llamada, y es tuyo trabajes o no con nosotros después." },
  { q: "¿Cómo es la reunión?", a: `Dura ${CONSULTORIA_TREE_MINUTES} minutos y es por Zoom, Google Meet o WhatsApp, lo que te quede más cómodo. Después de agendar, confirmas tu cita con un mensaje por WhatsApp y coordinamos el detalle.` },
  { q: "¿Cuánto tengo que invertir en anuncios?", a: `Trabajamos con negocios de tree service que pueden invertir más de ${BUDGET} al mes en anuncios. En la llamada vemos cuánto te conviene según tu zona, tus servicios y tu meta de estimados.` },
  { q: "¿En qué se diferencian de otras agencias de marketing?", a: "Una agencia tradicional prueba estrategias hasta que alguna funciona, y ese aprendizaje lo pagas tú. Nosotros tenemos un sistema armado: formatos de anuncios virales validados, Google Ads y Facebook Ads, y más de 5 años de experiencia." },
  { q: "¿Sirve para poda, remoción de árboles y tocones?", a: "Sí. El sistema está pensado para negocios de tree service: poda, remoción de árboles, tocones, ramas sobre el techo, preparación para tormentas y estimados." },
  { q: "¿Necesito hablar inglés?", a: "No. La consultoría es en español. Tus anuncios pueden salir en español, en inglés o en los dos idiomas, según tu zona y tus clientes." },
  { q: "¿Qué tengo que preparar?", a: "Solo tu negocio: qué servicios ofreces, en qué ciudades trabajas y cómo consigues clientes hoy. De lo demás nos encargamos nosotros." },
];

const ICON_PATHS: Record<string, ReactNode> = {
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  bolt: <path d="M13 3L5 13.5h6L10 21l8-10.5h-6z" />,
  shield: <><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" /><path d="M9 12l2 2 4-4" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  video: <><rect x="3" y="6" width="12" height="12" rx="2.2" /><path d="M15 10.5l6-3.2v9.4l-6-3.2z" /></>,
  gift: <><rect x="4" y="9" width="16" height="11" rx="2" /><path d="M12 9v11M3.5 9h17" /><path d="M12 9c-3 0-4.6-1.4-4.6-2.8S9 3.6 10.4 4.6C11.4 5.3 12 7 12 9zM12 9c3 0 4.6-1.4 4.6-2.8S15 3.6 13.6 4.6C12.6 5.3 12 7 12 9z" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>,
  users: <><circle cx="9" cy="8.5" r="3.2" /><path d="M3 19.5c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" /><circle cx="17" cy="9.5" r="2.4" /><path d="M16.5 14.2c2.6.1 4.5 1.8 4.5 4.3" /></>,
  calendar: <><rect x="4" y="5" width="16" height="15" rx="2.2" /><path d="M4 10h16M9 3v4M15 3v4" /></>,
};

const Ic = ({ id }: { id: keyof typeof ICON_PATHS }) => (
  <svg className="est-ic" viewBox="0 0 24 24" aria-hidden="true">{ICON_PATHS[id]}</svg>
);

/** VSL. Nunca inventa video: con URL lo muestra (.mp4/.webm → de fondo con un solo botón Play; otra URL → reproductor en iframe); sin URL, solo en desarrollo hay un recuadro rotulado. */
function Vsl({ url, onPlay }: { url: string; onPlay?: () => void }) {
  if (!url) {
    if (!import.meta.env.DEV) return null;
    return (
      <div className="ct-vid">
        <div className="est-ty-video est-ty-video--empty">
          <p><b>Espacio del VSL</b>Aún no hay video. Cuando exista, se pega su URL en CONSULTORIA_TREE_VIDEO_URL (src/lib/consultoriaTreeConfig.ts) y la página lo muestra.</p>
        </div>
      </div>
    );
  }
  const isFile = /\.(mp4|webm|m4v)(\?|#|$)/i.test(url);
  return (
    <div className="ct-vid">
      <div className="est-ty-video">
        {isFile ? (
          <EstimadosPreviewVideo url={url} poster={bunnyPosterFor(url)} title="Video: cómo conseguir más estimados para tu tree service" onStart={onPlay} />
        ) : (
          <iframe src={url} title="Video: cómo conseguir más estimados para tu tree service" allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy" />
        )}
      </div>
    </div>
  );
}

const STAR = "M12 2l2.9 6.9 7.4.6-5.6 4.8 1.7 7.2L12 17.6 5.6 21.5l1.7-7.2L1.7 9.5l7.4-.6z";

/** Cinco estrellas. */
const Stars = () => (
  <svg className="ct-proof-stars" viewBox="0 0 120 24" role="img" aria-label="Calificación de 5 estrellas">
    {[0, 1, 2, 3, 4].map((i) => <path key={i} d={STAR} transform={`translate(${i * 24} 0)`} />)}
  </svg>
);

/** Logo de Meta: el símbolo oficial (trazado de Simple Icons, https://simpleicons.org, icono «Meta») en el azul de la marca. */
const MetaLogo = () => (
  <svg className="ct-badge-logo" viewBox="0 3.6 24 16.8" role="img" aria-label="Meta">
    <path fill="#0081FB" d="M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a6.624 6.624 0 0 0 .265.86 5.297 5.297 0 0 0 .371.761c.696 1.159 1.818 1.927 3.593 1.927 1.497 0 2.633-.671 3.965-2.444.76-1.012 1.144-1.626 2.663-4.32l.756-1.339.186-.325c.061.1.121.196.183.3l2.152 3.595c.724 1.21 1.665 2.556 2.47 3.314 1.046.987 1.992 1.22 3.06 1.22 1.075 0 1.876-.355 2.455-.843a3.743 3.743 0 0 0 .81-.973c.542-.939.861-2.127.861-3.745 0-2.72-.681-5.357-2.084-7.45-1.282-1.912-2.957-2.93-4.716-2.93-1.047 0-2.088.467-3.053 1.308-.652.57-1.257 1.29-1.82 2.05-.69-.875-1.335-1.547-1.958-2.056-1.182-.966-2.315-1.303-3.454-1.303zm10.16 2.053c1.147 0 2.188.758 2.992 1.999 1.132 1.748 1.647 4.195 1.647 6.4 0 1.548-.368 2.9-1.839 2.9-.58 0-1.027-.23-1.664-1.004-.496-.601-1.343-1.878-2.832-4.358l-.617-1.028a44.908 44.908 0 0 0-1.255-1.98c.07-.109.141-.224.211-.327 1.12-1.667 2.118-2.602 3.358-2.602zm-10.201.553c1.265 0 2.058.791 2.675 1.446.307.327.737.871 1.234 1.579l-1.02 1.566c-.757 1.163-1.882 3.017-2.837 4.338-1.191 1.649-1.81 1.817-2.486 1.817-.524 0-1.038-.237-1.383-.794-.263-.426-.464-1.13-.464-2.046 0-2.221.63-4.535 1.66-6.088.454-.687.964-1.226 1.533-1.533a2.264 2.264 0 0 1 1.088-.285z" />
  </svg>
);

/** Logo de Google (la «G» de cuatro colores). */
const GoogleLogo = () => (
  <svg className="ct-badge-logo ct-badge-logo--g" viewBox="0 0 48 48" role="img" aria-label="Google">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

/** Bandera de Estados Unidos en SVG (los emojis de bandera no se ven en Windows: salen como «US»). */
const UsFlag = () => (
  <svg className="ct-flag" viewBox="0 0 26 18" role="img" aria-label="Estados Unidos">
    <rect width="26" height="18" rx="2.2" fill="#fff" />
    {[0, 2, 4, 6, 8, 10, 12].map((i) => <rect key={i} y={(i * 18) / 13} width="26" height={18 / 13} fill="#B22234" />)}
    <rect width="11" height={(7 * 18) / 13} fill="#3C3B6E" />
    {[0, 1, 2, 3].flatMap((r) => [0, 1, 2].map((c) => <circle key={`${r}${c}`} cx={2.2 + c * 3.3 + (r % 2) * 1.1} cy={1.6 + r * 2.1} r=".5" fill="#fff" />))}
    <rect width="26" height="18" rx="2.2" fill="none" stroke="rgba(0,0,0,.18)" />
  </svg>
);

const ConsultoriaMktTree = () => {
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [stickyVisible, setStickyVisible] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  /** La persona ya tocó «Confirmar Consultoría Gratis» (abrió WhatsApp): recién entonces aparece el botón para cerrar el popup. */
  const [confirmed, setConfirmed] = useState(false);

  // Hasta que el VSL se vea, la página es solo el hero (título + «Sin…» + video). Se esconde TODO lo demás (incluido el botón de agendar) desde que carga
  // hasta 2:50 después de que el visitante toque Play. Solo se esconde si el VSL es un mp4 propio (es el único que avisa del Play); sin VSL o con un
  // reproductor en iframe no hay forma de saber cuándo lo vio, así que se muestra todo. En vista previa, `?todo=1` también lo muestra todo.
  const [gated] = useState(() => VSL_IS_FILE(CONSULTORIA_TREE_VIDEO_URL) && !(isEstimadosPreview() && new URLSearchParams(window.location.search).has("todo")));
  const [playedAt, setPlayedAt] = useState<number | null>(() => (gated ? readPlayedAt() : null));
  const [now, setNow] = useState(() => Date.now());
  const revealed = !gated || (playedAt !== null && now - playedAt >= VSL_REVEAL_MS);
  useEffect(() => {
    if (revealed || playedAt === null) return;
    const check = () => setNow(Date.now());
    const timer = window.setTimeout(check, Math.max(0, playedAt + VSL_REVEAL_MS - Date.now()));
    document.addEventListener("visibilitychange", check); // pestaña en segundo plano: el temporizador puede atrasarse, se revisa al volver
    return () => { window.clearTimeout(timer); document.removeEventListener("visibilitychange", check); };
  }, [revealed, playedAt]);
  const onVslPlay = () => {
    if (playedAt !== null) return; // la cuenta empieza con el primer Play y no se reinicia
    const t = Date.now();
    try { localStorage.setItem(VSL_PLAYED_KEY, String(t)); } catch { /* sin storage: la cuenta vale solo en esta visita */ }
    setPlayedAt(t);
    setNow(t);
  };
  const [open, setOpen] = useState(false);
  const [slide, setSlide] = useState(0);
  const trackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    document.title = PAGE_TITLE;
    return NOINDEX ? addNoindex() : undefined;
  }, []);

  // PageView + ViewContent al cargar. Con PIXEL_ID vacío no hace nada.
  useEffect(() => {
    if (!CONSULTORIA_TREE_PIXEL_ID) return;
    initMetaPixel(CONSULTORIA_TREE_PIXEL_ID);
    trackMetaEvent("PageView", undefined, undefined, CONSULTORIA_TREE_PIXEL_ID);
    trackMetaEvent("ViewContent", consultoriaTreeEventParams(), uuid(), CONSULTORIA_TREE_PIXEL_ID);
  }, []);

  // Barra fija móvil: aparece cuando el hero ya quedó arriba de la pantalla.
  useEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      setStickyVisible(trigger.getBoundingClientRect().top < 0);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // Carrusel «¿Por qué las agencias…?»: el punto activo sigue a la tarjeta que está más a la izquierda (o a la última si ya no hay más a dónde deslizar).
  const onTrackScroll = () => {
    const track = trackRef.current;
    const first = track?.firstElementChild as HTMLElement | null;
    if (!track || !first) return;
    const step = first.offsetWidth + 12; // ancho de la tarjeta + el espacio entre tarjetas (12 px, ver .ct-track)
    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    setSlide(atEnd ? NOTS.length - 1 : Math.max(0, Math.min(NOTS.length - 1, Math.round(track.scrollLeft / step))));
  };
  const goToSlide = (i: number) => {
    const track = trackRef.current;
    const card = track?.children[i] as HTMLElement | undefined;
    setSlide(i);
    if (!track || !card || typeof track.scrollTo !== "function") return;
    const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollTo({ left: card.offsetLeft - 20, behavior: reduce ? "auto" : "smooth" }); // 20 px = el aire del borde (padding de .ct-track)
  };

  // La consultoría quedó agendada: Lead (la señal para optimizar) y Schedule, solo del navegador y con event_id propio. Después, el calendario del
  // popup se reemplaza por la confirmación (y el popup vuelve a su inicio para que se vea completa).
  const handleBooked = (b: Booking) => {
    if (CONSULTORIA_TREE_PIXEL_ID) {
      try {
        trackMetaEvent("Lead", consultoriaTreeEventParams(), uuid(), CONSULTORIA_TREE_PIXEL_ID);
        trackMetaEvent("Schedule", consultoriaTreeEventParams(), uuid(), CONSULTORIA_TREE_PIXEL_ID);
      } catch { /* no crítico */ }
    }
    setBooking(b);
    requestAnimationFrame(() => popupRef.current?.scrollTo?.({ top: 0 }));
  };

  // TODOS los botones abren el popup del calendario. Una vez agendada la consultoría ya no hay nada más que agendar: se quitan.
  // Mismo texto en todos: «AGENDA GRATIS AHORA» (con el ícono en la misma línea) y, debajo (dentro del botón), «Consultoría gratis + Website de Regalo».
  // Debajo de cada botón van siempre los 3 textos de confianza (salvo en la barra fija móvil, que no tiene espacio: ahí solo el botón).
  const book = (withTrust = true) => booking ? null : (
    <>
      <button type="button" className="est-btn" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <span className="ct-btn-txt">
          <span className="ct-btn-main"><Ic id="calendar" />Agenda gratis ahora</span>
          <small>Consultoría gratis + <span className="ct-gift">Website de Regalo</span></small>
        </span>
      </button>
      {withTrust && (
        <ul className="est-trust">
          <li><Ic id="gift" />Website gratis por asistir</li>
          <li><Ic id="video" />Zoom, Meet o WhatsApp</li>
          <li><Ic id="clock" />{CONSULTORIA_TREE_MINUTES} minutos</li>
        </ul>
      )}
    </>
  );

  const summary = booking ? formatBookingSummary(booking.date, booking.hour, booking.minute, booking.calendarTz, booking.visitorTz) : null;

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href={EST_FONT_HREF} rel="stylesheet" />
      {CONSULTORIA_TREE_PIXEL_ID && (
        <noscript>
          <img height="1" width="1" style={{ display: "none" }} src={`https://www.facebook.com/tr?id=${CONSULTORIA_TREE_PIXEL_ID}&ev=PageView&noscript=1`} alt="" />
        </noscript>
      )}
      <style>{EST_CSS + EST_CSS_EXTRA + EST_TY_CSS + CT_CSS}</style>

      <div className="est-ty-root">
        <div className="est-page est-ty ct" data-product={CONSULTORIA_TREE_SLUG} aria-label="Consultoría de marketing gratis para negocios de tree service">
          {/* ============ 1. FRANJA SUPERIOR: avatares + estrellas del kit (/estimados-lp), con el texto propio de esta página. Ver el aviso de SHOW_RATING_STRIP en el kit: la calificación no es real. ============ */}
          <div className="est-top-proof ct-proof">
            <div className="ct-proof-in">
              <picture>
                <source srcSet={`${IMG}/avatares.webp`} type="image/webp" />
                <img className="ct-proof-av" src={`${IMG}/avatares.png`} width={720} height={167} alt="" />
              </picture>
              <div className="ct-proof-txt">
                <Stars />
                <p><span>Experiencia con <b>+50 Dueños de</b></span>{" "}<span><b>Tree Service</b> en Estados Unidos</span></p>
              </div>
            </div>
          </div>

          {/* ============ 2. HERO: PROMESA MEDIBLE + «SIN…» + VSL + CTA ============ */}
          <header className="est-hero est-hero--center ct-hero">
            <div className="est-wrap">
              <span className="est-eyebrow ct-eyebrow"><UsFlag />Para dueños de tree service latinos en USA</span>
              <h1>Consigue <span className="est-hl">+10 estimados nuevos al mes</span> con un sistema probado de 4 sencillos pasos</h1>
              <ul className="ct-sin" aria-label="Lo que no vas a vivir con nosotros">
                {SIN.map((t) => (
                  <li key={t}><Ic id="check" /><span>{t}</span></li>
                ))}
              </ul>

              <Vsl url={CONSULTORIA_TREE_VIDEO_URL} onPlay={onVslPlay} />

              {revealed && (
                <div className="est-cta">
                  {book()}
                </div>
              )}
            </div>
          </header>
          <div ref={triggerRef} />

          {/* ============ 2b. SELLOS: logo de Acros Software + Meta y Google (texto en inglés, empieza con la marca). ÚNICA parte de debajo del VSL que se ve siempre, antes de tocar Play ============ */}
          <section className="ct-badges" aria-label="Respaldo profesional">
            <div className="est-wrap">
              <div className="ct-by">
                <AcrosoftLogo size="lg" className="!text-[clamp(27px,8.4vw,36px)] !cursor-default" />
                <p>Expertos en Marketing y Tecnología</p>
              </div>
              <ul>
                <li><MetaLogo /><span><b>Meta</b> Media Buying Professional</span></li>
                <li><GoogleLogo /><span><b>Google</b> Marketing Certified</span></li>
              </ul>
            </div>
          </section>

          {revealed && (
            <>
            {/* ============ 3. POR QUÉ LAS AGENCIAS NO TE LLENAN EL CALENDARIO ============ */}
            <section className="est-sec">
              <div className="est-wrap">
                <h2 className="est-long">¿Por qué la mayoría de las agencias de marketing <span className="est-hl">no pueden llenarte el calendario</span>?</h2>
                {/* Carrusel: tarjetas lado a lado, se asoma la siguiente y los puntos marcan en cuál estás (se desliza con el dedo o con el trackpad). */}
                <div className="ct-carousel">
                  <div className="ct-track" ref={trackRef} onScroll={onTrackScroll} role="group" aria-label="Desliza para ver los tres motivos" tabIndex={0}>
                    {NOTS.map((n) => (
                      <div className="est-not ct-card" key={n.t}>
                        <span className="est-x"><Ic id="x" /></span>
                        <div><h3>{n.t}</h3><p>{n.d}</p></div>
                      </div>
                    ))}
                  </div>
                  <div className="ct-dots">
                    {NOTS.map((n, i) => (
                      <button key={n.t} type="button" className={i === slide ? "is-on" : ""} aria-label={`Ir al motivo ${i + 1} de ${NOTS.length}`} aria-current={i === slide ? "true" : undefined} onClick={() => goToSlide(i)} />
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* ============ 4. EL SISTEMA ============ */}
            <section className="est-sec est-sec--offer">
              <div className="est-wrap">
                <div className="est-offer-card">
                  <span className="est-offer-tag">Entonces, ¿qué sí funciona?</span>
                  <PuzzleIcon />
                  <h2 className="est-product">UN <span className="est-hl">SISTEMA VALIDADO</span> PARA CONSEGUIR ESTIMADOS GARANTIZADOS</h2>

                  <p className="ct-how-intro">Así funciona el sistema, en <b>4 pasos</b>:</p>
                  <ol className="ct-how">
                    {HOW.map((h, i) => (
                      <li key={h.name}>
                        <span className="ct-how-n" aria-hidden="true">{i + 1}</span>
                        <div>
                          <h3>{h.name}</h3>
                          <p>{h.text}</p>
                        </div>
                      </li>
                    ))}
                  </ol>

                  <div className="est-cta" style={{ marginTop: 18 }}>
                    {book()}
                  </div>
                </div>
              </div>
            </section>

            {/* ============ 5. QUÉ TE LLEVAS DE LA CONSULTORÍA ============ */}
            <section className="est-sec ct-get" style={{ paddingTop: 20 }}>
              <div className="est-wrap">
                <div className="ct-sec-head">
                  <h2>Qué te llevas de la consultoría</h2>
                </div>
                <ol className="ct-flow">
                  {GETS.map((g, i) => (
                    <li key={i}><span className="ct-n" aria-hidden="true">{i + 1}</span><span>{g}</span></li>
                  ))}
                </ol>
              </div>
            </section>

            {/* Barra fija móvil */}
            <div className={`est-sticky${stickyVisible && !booking && !open ? " est-is-visible" : ""}`}>
              {book(false)}
            </div>

            {/* ============ 6. PREGUNTAS FRECUENTES ============ */}
            <section className="est-sec">
              <div className="est-wrap">
                <h2>Preguntas frecuentes</h2>
                <div className="est-faq">
                  {FAQ.map((f) => (
                    <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>
                  ))}
                </div>
              </div>
            </section>

            {/* ============ 7. CIERRE ============ */}
            <section className="est-sec est-final ct-final">
              <div className="est-wrap">
                <h2>Tu plan para conseguir más estimados, <span className="est-hl">gratis y sin compromiso</span></h2>
                <ul className="est-checks">
                  <li><Ic id="check" />Una consultoría de {CONSULTORIA_TREE_MINUTES} minutos con un plan claro para tu negocio</li>
                  <li><Ic id="check" />Google Ads y Facebook Ads con un sistema que ya funciona</li>
                  <li><Ic id="check" />El plan es tuyo, trabajes o no con nosotros</li>
                  <li><Ic id="check" />Un website de regalo para tu negocio cuando asistas a la consultoría</li>
                </ul>
                <div className="est-cta">
                  {book()}
                </div>
              </div>
            </section>
            </>
          )}
        </div>

        {/* ============ POPUP DEL CALENDARIO (el mismo de /estimados-ty). Va en un portal, FUERA de .est-page: sus estilos de Tailwind se deformarían dentro. ============ */}
        <Dialog open={open} onOpenChange={(o) => { if (!o && booking && !confirmed) return; setOpen(o); }}>
          <DialogContent ref={popupRef} hideClose={!!booking && !confirmed} className="ct-pop gap-0 border-0 p-0 w-[calc(100%-24px)] max-w-[480px] max-h-[94vh] overflow-y-auto rounded-2xl bg-[#F9F8F5]">
            <div className="ct-pop-head">
              <DialogTitle className={booking ? "sr-only" : "ct-pop-title"}>{booking ? "Cita reservada, falta confirmar" : "Agenda tu consultoría gratis"}</DialogTitle>
              <DialogDescription className={booking ? "sr-only" : "ct-pop-sub"}>
                {booking ? "Tu cita quedó reservada. Falta confirmarla por WhatsApp." : "Elige el día y la hora que mejor te queden. Al terminar, confirmas tu cita por WhatsApp."}
              </DialogDescription>
              {!booking && (
                <ul className="ct-pills">
                  <li>Gratis</li>
                  <li>Zoom, Meet o WhatsApp</li>
                  <li>{CONSULTORIA_TREE_MINUTES} min</li>
                </ul>
              )}
            </div>
            <div className="ct-pop-body">
              {booking && summary ? (
                <div className="ct-done" role="status" data-testid="consultoria-agendada">
                  {/* Icono de «falta un paso»: un aro a medio llenar (90 %) con un reloj, no un check. El check aparecería recién al confirmar por WhatsApp. */}
                  <span className="ct-done-ring" aria-hidden="true">
                    <svg viewBox="0 0 54 54" focusable="false">
                      <circle className="ct-ring-bg" cx="27" cy="27" r="23" />
                      <circle className="ct-ring-fg" cx="27" cy="27" r="23" pathLength={100} strokeDasharray="90 100" transform="rotate(-90 27 27)" />
                      <path className="ct-ring-clock" d="M27 16v11.5l7 4" />
                    </svg>
                  </span>
                  <h2>Ya reservamos tu cita. Solo falta confirmar.</h2>
                  {/* Barra al 90 %: la reserva aún no termina hasta que el cliente confirma por WhatsApp. */}
                  <div className="ct-prog" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={90} aria-label="Avance de tu reserva: 90 %" data-testid="avance-reserva">
                    <div className="ct-prog-track"><i /></div>
                  </div>
                  <div className="ct-done-when" data-testid="resumen-cita">
                    <span className="ct-done-day">{summary.dateLabel}</span>
                    <span className="ct-done-time">{summary.timeLabel}</span>
                    <span className="ct-done-tz">{summary.tzLabel}</span>
                  </div>
                  <p><b>Toca el botón y envíanos el mensaje por WhatsApp</b> para confirmar tu consultoría y coordinar si la hacemos por Zoom, Meet o WhatsApp.</p>
                  <a className="ct-wa" data-testid="confirmar-whatsapp" href={consultoriaTreeConfirmUrl(booking.formData)} target="_blank" rel="noopener noreferrer" onClick={() => setConfirmed(true)}>
                    <WhatsAppIcon className="ct-wa-ic" />Confirmar Consultoría Gratis
                  </a>
                  {/* Sin «X» y sin «Cerrar» hasta que toque el botón verde: lo único que puede hacer es confirmar por WhatsApp. */}
                  {confirmed && <button type="button" className="ct-done-close" onClick={() => setOpen(false)}>Cerrar</button>}
                </div>
              ) : CONSULTORIA_TREE_CALENDAR_ID ? (
                <div className="ct-pop-cal">
                  <CalendarRenderer
                    calendarId={CONSULTORIA_TREE_CALENDAR_ID}
                    lang="es"
                    primaryColorOverride={CALENDAR_COLOR}
                    phoneDefaultDial="+1"
                    qualification={CONSULTORIA_TREE_QUALIFICATION}
                    fireLead={false} /* el Lead de esta página sale en handleBooked (con event_id): el del calendario lo contaría dos veces */
                    onBookingSuccess={handleBooked}
                  />
                </div>
              ) : (
                <div className="est-ty-calmsg"><b>Calendario no disponible</b>Por ahora no podemos mostrar los horarios. Vuelve a abrir esta página más tarde.</div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default ConsultoriaMktTree;
