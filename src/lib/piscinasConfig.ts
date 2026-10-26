// Configuración del embudo de «Kit Llena tu Calendario de Piscinas» que NO es secreta pero sí depende de
// cuentas externas (Stripe, Meta, formulario de onboarding). La usan /piscinas-lp, /piscinas-up1,
// /piscinas-up2 y /piscinas-ty.
//
// Nada sensible va acá: el token de Conversions API (cuando exista) vive en secrets de Supabase
// (ver docs/piscinas-lanzamiento.md).
//
// Los valores vacíos ("") son pendientes de Daniel: el botón de compra registra el clic pero no
// navega, y los elementos que dependen de un valor vacío (correo de soporte, formulario) se ocultan.

/** Clave del producto en supabase/functions/_shared/ebook-catalog.ts. Viaja a Stripe en client_reference_id. */
export const PISCINAS_PRODUCT_SLUG = "piscinas";

/** Slugs de los upsells (servicios). Viajan a Stripe en client_reference_id; el webhook los reconoce y NO envía el ZIP. */
export const PISCINAS_UP1_SLUG = "piscinas-up1";
export const PISCINAS_UP2_SLUG = "piscinas-up2";

/** Nombre del producto para los eventos de Meta. */
export const PISCINAS_CONTENT_NAME = "Kit Llena tu Calendario de Piscinas";

/**
 * Pixel de Meta del producto. VACÍO a propósito: Daniel pidió avanzar sin pixel ni API de Conversiones.
 * Con "" la landing no inicializa el pixel ni dispara eventos. Cuando exista, ver la sección
 * «PENDIENTE: Pixel de Meta + API de Conversiones» de docs/piscinas-lanzamiento.md.
 */
export const PISCINAS_PIXEL_ID: string = "";

/** Precio de venta del kit (USD, pago único) y precio de lista tachado (vacío = no se muestra; lo define Daniel). */
export const PISCINAS_PRICE = 30;
export const PISCINAS_LIST_PRICE: number | null = 60; // definido por Daniel (2026-10-24); el tachado de la tarjeta sigue apagado (SHOW_LIST_PRICE)

/** Precios de los upsells (solo para mostrar en pantalla; el cobro real lo define el Payment Link de Stripe). */
export const PISCINAS_UP1_PRICE = 100;
export const PISCINAS_UP2_PRICE_MONTHLY = 1000;

/** Días de garantía de reembolso del kit. */
export const PISCINAS_GUARANTEE_DAYS = 30;

/**
 * Payment Links de Stripe (modo LIVE). Vacío = el botón todavía no lleva a pagar (solo registra el clic).
 * Redirecciones post-pago (Stripe → Payment link → Después del pago → Redirigir a tu sitio web):
 *   kit      → https://www.acrosoftlabs.com/piscinas-up1?session_id={CHECKOUT_SESSION_ID}
 *   upsell 1 → https://www.acrosoftlabs.com/piscinas-up2?from=up1
 *   upsell 2 → https://www.acrosoftlabs.com/piscinas-ty?up=2
 */
export const PISCINAS_PAYMENT_LINK: string = "https://buy.stripe.com/dRmbJ0fBo6Us5eOgKCbbG08";
export const PISCINAS_UP1_PAYMENT_LINK: string = "https://buy.stripe.com/7sY6oG88W4Mk7mWamebbG09";
export const PISCINAS_UP2_PAYMENT_LINK: string = "https://buy.stripe.com/4gMeVc0Gu2Ec5eO65YbbG0a";

/**
 * Reservados para las páginas de downsell que se construirán después (/piscinas-dn1, /piscinas-dn2).
 * Aún no hay páginas ni rutas: solo dejan lista la config para añadir sus links.
 */
export const PISCINAS_DN1_PAYMENT_LINK: string = "";
export const PISCINAS_DN2_PAYMENT_LINK: string = "";
export const PISCINAS_DN1_SLUG = "piscinas-dn1";
export const PISCINAS_DN2_SLUG = "piscinas-dn2";

/** Formulario de onboarding de la campaña (upsell 1). Vacío = el botón de la thank-you se oculta. */
export const PISCINAS_ONBOARDING_FORM_URL: string = "";

/** Correo de soporte. Vacío = los botones/enlaces de contacto se ocultan. */
export const PISCINAS_SUPPORT_EMAIL: string = "";

/**
 * Contacto de la thank-you (/piscinas-ty): WhatsApp (solo dígitos, con código de país) y correo. Aquí inician el onboarding quienes compran
 * el upsell 1 y/o el 2 (no hay formulario automático) y piden ayuda con la descarga. Separado de PISCINAS_SUPPORT_EMAIL a propósito:
 * las landings siguen sin mostrar soporte.
 */
export const PISCINAS_TY_WHATSAPP = "59157697071";
export const PISCINAS_TY_EMAIL = "daniel@acrosoftlabs.com";

/** Carpeta pública de las imágenes del embudo (public/piscinas/). */
export const PISCINAS_IMG = "/piscinas";

/** Parámetros de ViewContent / InitiateCheckout. */
export function piscinasEventParams(price: number = PISCINAS_PRICE) {
  return {
    content_name: PISCINAS_CONTENT_NAME,
    content_ids: [PISCINAS_PRODUCT_SLUG],
    content_type: "product",
    value: price,
    currency: "USD",
  };
}

/**
 * Link de pago con el producto adjunto: Stripe devuelve `client_reference_id` en
 * checkout.session.completed y el webhook sabe qué es. Con `attributionId` el valor es
 * "piscinas_<uuid>" (fila de checkout_attribution con las cookies de Meta para la Conversions API).
 * `slug` permite reutilizarla para los upsells ("piscinas-up1" / "piscinas-up2").
 */
export function piscinasCheckoutUrl(paymentLink: string, attributionId?: string, slug: string = PISCINAS_PRODUCT_SLUG): string {
  const url = new URL(paymentLink);
  url.searchParams.set("client_reference_id", attributionId ? `${slug}_${attributionId}` : slug);
  return url.toString();
}
