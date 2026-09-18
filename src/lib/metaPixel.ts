// Meta Pixel — carga perezosa vía useEffect (no <script> crudo en JSX) para
// evitar los quirks de scripts inline dentro de React. Compartido entre
// /frances y /ty-frances porque son el mismo funnel y no tiene sentido tener
// dos bootstraps del mismo pixel. Mismo patrón (window as any) que ya usa
// ClaseGratisTreeServiceGame.tsx para su propio pixel, para no chocar con la
// declaración global de Window.fbq que ya existe en el proyecto.

export const META_PIXEL_ID = "1147228644816086";

/** Bootstrap del pixel — no-op si ya está cargado (doble mount en dev, u otra página del mismo funnel ya lo inició). */
export function initMetaPixel(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (w.fbq) return;

  const n = (w.fbq = function (...args: unknown[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (n as any).callMethod ? (n as any).callMethod(...args) : (n as any).queue.push(args);
  });
  if (!w._fbq) w._fbq = n;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (n as any).push = n; (n as any).loaded = true; (n as any).version = "2.0"; (n as any).queue = [];

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  const firstScript = document.getElementsByTagName("script")[0];
  firstScript.parentNode?.insertBefore(script, firstScript);

  w.fbq("init", META_PIXEL_ID);
}

/**
 * eventId es opcional pero clave para Purchase: si el mismo evento también se
 * manda por Conversions API (server-side, ver stripe-webhook), Meta necesita
 * el mismo event_id de los dos lados para deduplicar y no contar la compra
 * dos veces.
 */
export function trackMetaEvent(event: string, params?: Record<string, unknown>, eventId?: string): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fn = (window as any).fbq;
  if (typeof fn !== "function") return;
  if (eventId) fn("track", event, params, { eventID: eventId });
  else fn("track", event, params);
}
