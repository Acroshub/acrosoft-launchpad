import { useEffect, useRef, useState } from "react";

/** Segundos de la vista previa de fondo (sin sonido, en bucle) antes de que la persona le dé play. */
export const PREVIEW_SECONDS = 20;

/**
 * Video de /estimados-ty: de fondo se reproduce solo, sin sonido y en bucle (los primeros PREVIEW_SECONDS), con UN solo botón encima: Play.
 * Al tocarlo, el video empieza DESDE CERO, con sonido, sin bucle y con los controles normales (pausa, barra, pantalla completa).
 *
 * Es un <video> propio y no el iframe de Bunny a propósito: con el iframe, el «quitar el sonido de fondo y reiniciar con sonido» tendría que
 * pasar por postMessage, y iOS solo deja activar el sonido dentro del mismo toque de la persona. Aquí todo ocurre en el mismo gesto.
 * Sin reproducción automática (ahorro de batería, movimiento reducido), se ve el póster quieto y el botón Play funciona igual.
 */
export function EstimadosPreviewVideo({ url, poster }: { url: string; poster?: string }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const startedRef = useRef(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true; // React no refleja el atributo muted en el DOM; iOS lo exige para reproducir solo
    const reduceMotion = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduceMotion) {
      try { void v.play()?.catch(() => undefined); } catch { /* sin reproducción automática: queda el póster */ }
    }
    const onTime = () => { if (!startedRef.current && v.currentTime >= PREVIEW_SECONDS) v.currentTime = 0; };
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, []);

  const start = () => {
    const v = ref.current;
    if (!v) return;
    startedRef.current = true;
    setStarted(true);
    v.loop = false;
    v.muted = false;
    v.volume = 1;
    v.currentTime = 0;
    v.controls = true;
    try { void v.play()?.catch(() => undefined); } catch { /* el navegador pidió otro toque: los controles quedan a la vista */ }
  };

  return (
    <>
      <video
        ref={ref}
        className={started ? "est-ty-vid-on" : "est-ty-vid-bg"}
        src={url}
        poster={poster}
        muted
        loop
        autoPlay
        playsInline
        preload="metadata"
        disablePictureInPicture={!started}
        title="Video sobre tu regalo"
      />
      {!started && (
        <button type="button" className="est-ty-play" onClick={start} aria-label="Reproducir el video con sonido">
          <span aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" /></svg>
          </span>
        </button>
      )}
    </>
  );
}

/** Póster automático para los mp4 de Bunny Stream (…/<id>/play_720p.mp4 → …/<id>/thumbnail.jpg); otros mp4 salen sin póster. */
export function bunnyPosterFor(url: string): string | undefined {
  return /\/play_\d+p\.mp4(\?|#|$)/i.test(url) ? url.replace(/\/play_\d+p\.mp4.*$/i, "/thumbnail.jpg") : undefined;
}
