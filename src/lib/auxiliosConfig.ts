// Configuración de la venta de «Primeros Auxilios del Bebé» que NO es secreta pero sí depende de
// cuentas externas (Meta y Stripe). La usan la landing (/auxilios-lp) y la thank-you (/auxilios-ty).
//
// Nada sensible va acá: la contraseña de la app y el token de Conversions API viven en secrets
// de Supabase (ver docs/auxilios-lanzamiento.md).

/** Clave del producto en supabase/functions/_shared/ebook-catalog.ts. Viaja a Stripe en client_reference_id. */
export const AUXILIOS_PRODUCT_SLUG = "auxilios";

/** Nombre del producto para los eventos de Meta. */
export const AUXILIOS_CONTENT_NAME = "Primeros Auxilios del Bebé";

/**
 * Pixel de Meta del producto. El mismo ID está en supabase/functions/_shared/ebook-catalog.ts
 * (Conversions API): si cambia uno, cambia el otro (lo comprueba ebook-order.test.ts).
 */
export const AUXILIOS_PIXEL_ID = "1209613534467929";

/** Precio de venta (USD, pago único) y precio de lista tachado (definido por el dueño del producto). */
export const AUXILIOS_PRICE = 25;
export const AUXILIOS_LIST_PRICE = 50;

/** Días de garantía de reembolso. */
export const AUXILIOS_GUARANTEE_DAYS = 7;

/** Payment Link de Stripe (modo LIVE). Redirect post-pago: https://www.acrosoftlabs.com/auxilios-ty?session_id={CHECKOUT_SESSION_ID} */
export const AUXILIOS_PAYMENT_LINK = "https://buy.stripe.com/eVqbJ0bl8ceMgXw2TMbbG07";

/** Parámetros de ViewContent / InitiateCheckout. */
export function auxiliosEventParams(price: number = AUXILIOS_PRICE) {
  return {
    content_name: AUXILIOS_CONTENT_NAME,
    content_ids: [AUXILIOS_PRODUCT_SLUG],
    content_type: "product",
    value: price,
    currency: "USD",
  };
}

/**
 * Link de pago con el producto adjunto: Stripe devuelve `client_reference_id` en
 * checkout.session.completed y el webhook sabe qué entregar. Con `attributionId` el valor es
 * "auxilios_<uuid>" (fila de checkout_attribution con las cookies de Meta para la Conversions API).
 */
export function auxiliosCheckoutUrl(paymentLink: string, attributionId?: string): string {
  const url = new URL(paymentLink);
  url.searchParams.set("client_reference_id", attributionId ? `${AUXILIOS_PRODUCT_SLUG}_${attributionId}` : AUXILIOS_PRODUCT_SLUG);
  return url.toString();
}
