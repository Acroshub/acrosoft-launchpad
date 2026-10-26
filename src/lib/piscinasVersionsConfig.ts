// Configuración de las versiones de landing v2 (/piscinas-lp2) y v3 (/piscinas-lp3) del kit.
// Igual que piscinasConfig.ts: nada secreto. Los valores vacíos son pendientes de Daniel y la
// interfaz oculta (o rotula) lo que depende de ellos.

/** Claves de medición en ab_sessions / ab_track (una por versión; sin A/B, sin sorteo). */
export const AB_V2_EXPERIMENT = "piscinas_v2_price";
export const AB_V3_EXPERIMENT = "piscinas_v3_price";
export const AB_V4_EXPERIMENT = "piscinas_v4_price";

/** Interruptores de la UI de confianza (apagados, igual que v1: no hay escasez real ni precio de lista definido). */
export const SHOW_TIMER = false;
export const SHOW_LIST_PRICE = false;

/**
 * v2: video de ventas de la página larga. VACÍO = no se muestra nada de video (no hay video falso).
 * Acepta un .mp4/.webm directo (se reproduce con <video>) o una URL de reproductor embebible (iframe).
 */
export const VSL_URL: string = "";

/**
 * v3: reproductor del VSL (URL embebible tipo iframe, p. ej. el player de Biturbo/Vimeo/YouTube).
 * VACÍO = se muestra un recuadro rotulado «Espacio del VSL — aún no grabado».
 */
export const VSL_EMBED_URL: string = "";

/**
 * v3: cuándo se ve la página de oferta bajo el VSL.
 *  - "always"   → siempre visible (valor por defecto).
 *  - "on-price" → oculta hasta que el reproductor avise que el VSL dijo el precio.
 * TODO (Daniel): el mecanismo exacto de aviso lo define Daniel (Biturbo u otro reproductor). La página ya
 * escucha dos señales, para que cualquiera de las dos sirva sin tocar el diseño:
 *   window.dispatchEvent(new CustomEvent("piscinas:vsl-price"))
 *   window.postMessage({ type: "piscinas:vsl-price" }, "*")   // desde un iframe o script del reproductor
 */
export type OfferReveal = "always" | "on-price";
export const OFFER_REVEAL: OfferReveal = "always";
export const VSL_PRICE_EVENT = "piscinas:vsl-price";

/**
 * Upsell 1 (/piscinas-up1): video de ventas corto (VSL). VACÍO = se muestra el recuadro rotulado
 * «Espacio del VSL — aún no grabado». Acepta .mp4/.webm directo o una URL de reproductor embebible (iframe).
 */
export const UP1_VSL_URL: string = "";

/** Upsell 2 (/piscinas-up2): video corto (VSL). VACÍO = recuadro rotulado «Espacio del VSL — aún no grabado». Mismo formato que UP1_VSL_URL. */
export const UP2_VSL_URL: string = "";
