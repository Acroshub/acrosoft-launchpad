// Meta Pixel — carga perezosa vía useEffect (no <script> crudo en JSX) para
// evitar los quirks de scripts inline dentro de React. Compartido entre
// /frances y /ty-frances porque son el mismo funnel y no tiene sentido tener
// dos bootstraps del mismo pixel. Mismo patrón (window as any) que ya usa
// ClaseGratisTreeServiceGame.tsx para su propio pixel, para no chocar con la
// declaración global de Window.fbq que ya existe en el proyecto.
//
// Pixel por producto: sin argumentos todo funciona como siempre (el pixel de
// DELF, con `track`). Pasando un pixelId (ej. el de TOEFL) se inicializa ese
// pixel y los eventos salen con `trackSingle` SOLO hacia él, para que un
// visitante que pasó por otro producto en la misma sesión no contamine ni
// reciba eventos del pixel equivocado.

export const META_PIXEL_ID = "1147228644816086";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FbqWindow = any;

/** Crea window.fbq y carga fbevents.js. No-op si ya existe. */
function bootstrapFbq(w: FbqWindow): void {
  if (w.fbq) return;

  const n = (w.fbq = function (...args: unknown[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const self = n as any;
    if (self.callMethod) self.callMethod(...args);
    else self.queue.push(args);
  });
  if (!w._fbq) w._fbq = n;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (n as any).push = n; (n as any).loaded = true; (n as any).version = "2.0"; (n as any).queue = [];

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  const firstScript = document.getElementsByTagName("script")[0];
  firstScript.parentNode?.insertBefore(script, firstScript);
}

/** Bootstrap del pixel — no-op si ya está cargado (doble mount en dev, u otra página del mismo funnel ya lo inició). */
export function initMetaPixel(pixelId?: string): void {
  const w = window as FbqWindow;

  if (pixelId === undefined) {
    // Comportamiento original (DELF): un solo pixel, se inicializa al cargar por primera vez.
    if (w.fbq) return;
    bootstrapFbq(w);
    w.fbq("init", META_PIXEL_ID);
    return;
  }

  bootstrapFbq(w);
  const inited: Set<string> = (w.__metaPixelsInited ??= new Set<string>());
  if (inited.has(pixelId)) return;
  inited.add(pixelId);
  w.fbq("init", pixelId);
}

/**
 * eventId es opcional pero clave para Purchase: si el mismo evento también se
 * manda por Conversions API (server-side, ver stripe-webhook), Meta necesita
 * el mismo event_id de los dos lados para deduplicar y no contar la compra
 * dos veces.
 *
 * pixelId (opcional): manda el evento únicamente a ese pixel (trackSingle).
 */
export function trackMetaEvent(event: string, params?: Record<string, unknown>, eventId?: string, pixelId?: string): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fn = (window as any).fbq;
  if (typeof fn !== "function") return;
  if (pixelId) {
    if (eventId) fn("trackSingle", pixelId, event, params ?? {}, { eventID: eventId });
    else fn("trackSingle", pixelId, event, params ?? {});
    return;
  }
  if (eventId) fn("track", event, params, { eventID: eventId });
  else fn("track", event, params);
}
