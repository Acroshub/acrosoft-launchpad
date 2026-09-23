// Configuración de la venta del ebook TOEFL que NO es secreta pero sí depende de
// cuentas externas (Meta y Stripe). La usan la landing (/toefl) y la thank-you
// page (/toefl-ty).
//
// Nada sensible va acá: la contraseña de la plataforma y el token de Conversions
// API viven en secrets de Supabase (ver docs/toefl-lanzamiento.md).

/** Clave del producto en supabase/functions/_shared/ebook-catalog.ts. Se envía al pagar (client_reference_id) para que el webhook sepa qué entregar. */
export const TOEFL_PRODUCT_SLUG = "toefl-b2";

/** Nombre del producto para los eventos de Meta. */
export const TOEFL_CONTENT_NAME = "Guía TOEFL B2";

/**
 * Pixel de Meta de TOEFL. El mismo ID está en supabase/functions/_shared/ebook-catalog.ts
 * (Conversions API): si cambia uno, cambia el otro.
 */
export const TOEFL_PIXEL_ID = "1446406424021779";

/**
 * Payment Links de Stripe (modo LIVE), uno por variante del test de precio.
 * Vacío = el botón todavía no lleva a pagar (solo registra el clic en el A/B).
 */
export const TOEFL_STRIPE_LINKS = {
  "19": "https://buy.stripe.com/14A3cu1Ky6Us36GbqibbG05",
  "25": "https://buy.stripe.com/dRmeVccpc4Mk8r02TMbbG06",
} as const;

/** Parámetros de ViewContent / InitiateCheckout: el precio de lista de la variante que ve la persona. */
export function toeflEventParams(price: number) {
  return {
    content_name: TOEFL_CONTENT_NAME,
    content_ids: [TOEFL_PRODUCT_SLUG],
    content_type: "product",
    value: price,
    currency: "USD",
  };
}

/**
 * Link de pago con el producto adjunto. Stripe devuelve `client_reference_id`
 * en checkout.session.completed; así el webhook entrega el ZIP y la plataforma
 * de TOEFL aunque el Payment Link no tenga metadata.
 *
 * Con `attributionId` el valor es "toefl-b2_<uuid>": el uuid es la fila de
 * checkout_attribution (cookies de Meta) que el webhook usa para la Conversions API.
 */
export function toeflCheckoutUrl(paymentLink: string, attributionId?: string): string {
  const url = new URL(paymentLink);
  url.searchParams.set("client_reference_id", attributionId ? `${TOEFL_PRODUCT_SLUG}_${attributionId}` : TOEFL_PRODUCT_SLUG);
  return url.toString();
}
