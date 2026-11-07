// Configuración de la landing «Kit de 50 anuncios virales para negocios de tree services» (/estimados-lp)
// para dueños de tree service en EE.UU. NO es secreta, pero depende de cuentas externas (Stripe, Meta).
//
// Nada sensible va acá: el token de la API de Conversiones (cuando exista) vive en secrets de Supabase
// (ver docs/estimados-lanzamiento.md).
//
// Los valores vacíos ("") son pendientes de Daniel: el botón de compra registra el clic pero no navega, y con el
// pixel vacío la página no inicializa ni dispara ningún evento de Meta.

/** Clave del producto (futura entrada en supabase/functions/_shared/ebook-catalog.ts). Viaja a Stripe en client_reference_id. */
export const ESTIMADOS_PRODUCT_SLUG = "estimados";

/** Nombre del producto para los eventos de Meta. Nombre provisional elegido por Daniel (2026-11-05). */
export const ESTIMADOS_CONTENT_NAME = "Kit de 50 anuncios virales para negocios de tree services";

/**
 * Pixel de Meta del producto. PENDIENTE (Daniel). Mientras esté vacío, la landing no carga el pixel ni manda eventos
 * al navegador ni a la API de Conversiones. Cuando se complete, el mismo ID va en la entrada del catálogo.
 */
export const ESTIMADOS_PIXEL_ID: string = "";

/** Precio de venta (USD, pago único) y precio de lista tachado (null = no se muestra; lo define Daniel, nunca se inventa). */
export const ESTIMADOS_PRICE = 30;
export const ESTIMADOS_LIST_PRICE: number | null = null;

/** Días de la garantía (diseños nuevos y personalizados gratis si no hay mejora tras publicar constantemente). */
export const ESTIMADOS_GUARANTEE_DAYS = 7;

/**
 * Payment Link de Stripe (modo LIVE) del producto «+50 Anuncios Virales - Mega Pack para Negocios de Tree Services»
 * (prod_VVDEkbY4CnH4nv, US$30, price_1UUCnYBeHVZCHGk0es0RS3L3). Creado 2026-11-07: plink_1UZ0rIBeHVZCHGk0vL0ycOEX.
 * Vacío = el botón registra el clic pero no navega.
 * Redirect post-pago: https://www.acrosoftlabs.com/estimados-ty?session_id={CHECKOUT_SESSION_ID}
 * (la thank-you /estimados-ty todavía no existe: ver docs/estimados-lanzamiento.md; hay que construirla ANTES de desplegar).
 */
export const ESTIMADOS_PAYMENT_LINK: string = "https://buy.stripe.com/aFa8wOgFsceM36G2TMbbG0b";

/** Experimento de ab_sessions para medir visitas y clics de la landing (misma mecánica que /toefl y /auxilios-lp). */
export const ESTIMADOS_AB_EXPERIMENT = "estimados_price";
/** localStorage: id de la sesión de ab_sessions que hizo clic en comprar (la thank-you la marcará como comprada). */
export const ESTIMADOS_AB_CHECKOUT_SESSION_KEY = "estimados_ab_checkout_session";

/** Carpeta pública de las imágenes (public/estimados/). */
export const ESTIMADOS_IMG = "/estimados";

/** Parámetros de ViewContent / InitiateCheckout. */
export function estimadosEventParams(price: number = ESTIMADOS_PRICE) {
  return {
    content_name: ESTIMADOS_CONTENT_NAME,
    content_ids: [ESTIMADOS_PRODUCT_SLUG],
    content_type: "product",
    value: price,
    currency: "USD",
  };
}

/**
 * Link de pago con el producto adjunto: Stripe devuelve `client_reference_id` en checkout.session.completed
 * y el webhook sabe qué entregar. Con `attributionId` el valor es "estimados_<uuid>" (fila de
 * checkout_attribution con las cookies de Meta para la Conversions API).
 */
export function estimadosCheckoutUrl(paymentLink: string, attributionId?: string): string {
  const url = new URL(paymentLink);
  url.searchParams.set("client_reference_id", attributionId ? `${ESTIMADOS_PRODUCT_SLUG}_${attributionId}` : ESTIMADOS_PRODUCT_SLUG);
  return url.toString();
}
