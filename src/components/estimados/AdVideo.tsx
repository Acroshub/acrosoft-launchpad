import { useEffect, useRef } from "react";
import { ESTIMADOS_IMG as IMG } from "@/lib/estimadosConfig";

/**
 * Una fila de la galería: un video corto en bucle (siete anuncios que se mueven sin salto), no un carrusel de <img> con CSS.
 * El carrusel parpadeaba en Safari de iPhone (cuadros en blanco que aparecen y desaparecen); un <video> muted + playsInline
 * lo reproduce el sistema igual en todos los navegadores. Se generan con Landing/_src/galeria/build_galeria.py. El póster es el
 * primer cuadro: si el celular no deja reproducir solo (ahorro de batería), se ve igual de bien, quieto.
 */
export function AdVideo({ lang, label }: { lang: "es" | "en"; label: string }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true; // React no refleja el atributo muted en el DOM; iOS lo exige para reproducir solo
    // play() devuelve una promesa en navegadores modernos; en otros (y en jsdom) no devuelve nada.
    const play = () => { try { void v.play()?.catch(() => undefined); } catch { /* sin reproducción automática: queda el póster */ } };
    if (typeof IntersectionObserver === "undefined") { play(); return; }
    // Solo se reproduce mientras se ve: ahorra batería y datos.
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) play(); else v.pause(); }, { threshold: 0.15 });
    io.observe(v);
    // Empieza a descargar el video cuando falta ~1,5 pantallas para llegar a la galería (no al abrir la página): así, al llegar, ya
    // está en memoria y no se entrecorta esperando datos.
    const near = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { v.preload = "auto"; near.disconnect(); } }, { rootMargin: "1500px 0px" });
    near.observe(v);
    return () => { io.disconnect(); near.disconnect(); };
  }, []);
  return (
    <div className="est-vrow">
      <video
        ref={ref}
        className="est-vid"
        src={`${IMG}/galeria-${lang}.mp4`}
        poster={`${IMG}/galeria-${lang}.jpg`}
        width={1280}
        height={534}
        muted
        loop
        autoPlay
        playsInline
        preload="metadata"
        disablePictureInPicture
        aria-label={label}
      />
    </div>
  );
}
