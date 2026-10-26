import type { ReactNode } from "react";

/**
 * Espacio del VSL (video de ventas). Nunca inventa video:
 *  - con `url` (.mp4/.webm → <video>; otra URL → iframe de reproductor) lo incrusta;
 *  - sin `url` y `showPlaceholder` (v3) muestra un recuadro rotulado «Espacio del VSL — aún no grabado»;
 *  - sin `url` y sin `showPlaceholder` (v2) no renderiza nada.
 * `children` va justo debajo del video (en la v3, el ÚNICO botón de compra).
 */
export function VslSlot({
  url, showPlaceholder = false, id, children,
}: { url: string; showPlaceholder?: boolean; id?: string; children?: ReactNode }) {
  if (!url && !showPlaceholder) return null;
  const isFile = /\.(mp4|webm|m4v)(\?|#|$)/i.test(url);
  return (
    <div className="vsl-wrap" id={id}>
      <div className={`vsl-box${url ? "" : " is-empty"}`}>
        {url ? (
          isFile ? (
            <video src={url} controls playsInline preload="metadata" title="Video de ventas" />
          ) : (
            <iframe
              src={url}
              title="Video de ventas"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          )
        ) : (
          <div className="vsl-empty">
            <span className="vsl-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 4v16l14-8z" /></svg></span>
            <p className="vsl-empty-title">Espacio del VSL — aún no grabado</p>
            <p className="vsl-empty-note">Aquí va el video de ventas. Cuando exista, se pega su URL en VSL_EMBED_URL y esta página lo muestra.</p>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
