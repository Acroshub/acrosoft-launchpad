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

/**
 * Nombre del producto para los eventos de Meta: el mismo del producto de Stripe y de `estimados.name` / `tracking.contentName`
 * del catálogo (ebook-order.test.ts lo comprueba). Cambiado el 2026-11-07 del provisional «Kit de 50 anuncios virales…».
 */
export const ESTIMADOS_CONTENT_NAME = "+50 Anuncios Virales - Mega Pack para Negocios de Tree Services";

/**
 * Pixel de Meta del producto (dado por Daniel el 2026-11-07). El mismo ID va en `meta.pixelId` de la entrada `estimados` del catálogo
 * (ebook-order.test.ts lo comprueba). Eventos del navegador: PageView y ViewContent en /estimados-lp, InitiateCheckout en cada botón de compra,
 * PageView y Purchase en /estimados-ty (más Schedule al reservar) y PageView y Lead en /estimados-gracias. En localhost no se manda nada
 * (ver metaPixel.ts; `?fbtest=1` lo permite). El token de la API de Conversiones (servidor) todavía NO está: sin el secret
 * META_CAPI_ACCESS_TOKEN_ESTIMADOS el servidor no manda eventos y solo vale el pixel del navegador.
 */
export const ESTIMADOS_PIXEL_ID: string = "1013028214851437";

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
 * (/estimados-ty es la página del regalo: llamada de consultoría + descarga; ver docs/estimados-lanzamiento.md).
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

// ─── /estimados-ty: página del REGALO (no vende: regala una llamada de consultoría) ──────────────────────────────

/** Ruta de la página. Es a donde Stripe redirige tras el pago y lo que lleva el correo de compra (con ?session_id=). */
export const ESTIMADOS_TY_PATH = "/estimados-ty";

/** sessionStorage: session_id de Stripe de la compra, para poder recargar la página aunque se pierda el ?session_id= de la URL. */
export const ESTIMADOS_FRONT_SESSION_KEY = "estimados_front_session";

/**
 * Página FINAL del embudo (después de agendar la llamada): barra al 100 % con confeti, cómo descargar el kit desde el correo, resumen de la
 * cita y contacto de ayuda. Aquí se dispara el evento Lead.
 */
export const ESTIMADOS_DONE_PATH = "/estimados-gracias";
/** sessionStorage: resumen de la cita recién agendada (lo escribe /estimados-ty y lo lee /estimados-gracias). Se borra al cerrar la pestaña. */
export const ESTIMADOS_BOOKING_KEY = "estimados_booking";
/** Asunto exacto del correo de compra que manda stripe-webhook (`Descarga tu compra: ${shortName}`); ebook-order.test.ts lo compara con el catálogo. */
export const ESTIMADOS_EMAIL_SUBJECT = "Descarga tu compra: +50 Anuncios Virales Tree Services";
/** Nombre que aparece como remitente del correo de compra (el `shortName` del catálogo). */
export const ESTIMADOS_EMAIL_SENDER = "+50 Anuncios Virales Tree Services";

/**
 * Calendario de la llamada de regalo: el UUID o el slug de crm_calendar_config (lo que va en /book/<id>). Es el ÚNICO calendario del CRM de
 * la cuenta ADMIN de Acrosoft («Selecciona el día y la hora», 30 min, zona America/La_Paz, aviso mínimo de 6 h y reservas hasta 5 días
 * adelante); leído del CRM el 2026-11-07. El contacto y la cita quedan en la cuenta admin (dueña del calendario). El formulario vinculado
 * (Nombre, Correo, WhatsApp) no se muestra completo: aquí solo se pide el WhatsApp (ver `requireWhatsapp` en CalendarRenderer).
 * Vacío = la página no muestra el calendario (en producción dice «Calendario no disponible»; en desarrollo, un recuadro rotulado).
 */
export const ESTIMADOS_CALL_CALENDAR_ID: string = "24dab059-b724-4a13-b900-c2d73fc4438f";

/**
 * Video de la página: URL de un .mp4/.webm o de un reproductor (se incrusta en un iframe). PENDIENTE: el guion del video se define
 * después. Vacío = no se muestra video (en desarrollo, un recuadro rotulado).
 */
export const ESTIMADOS_TY_VIDEO_URL: string = "";

/** Lo que Acrosoft cobra normalmente por esta llamada (USD). Declarado por Daniel el 2026-11-07: para quien compró el kit es gratis. */
export const ESTIMADOS_CALL_VALUE = 100;

/** Contacto de soporte del pie de /estimados-ty (dado por Daniel el 2026-11-07). El WhatsApp va solo con dígitos, como lo pide wa.me. */
export const ESTIMADOS_SUPPORT_EMAIL = "daniel@acrosoftlabs.com";
export const ESTIMADOS_SUPPORT_WHATSAPP = "59157697071";
/** Cómo se muestra el número en pantalla. */
export const ESTIMADOS_SUPPORT_WHATSAPP_LABEL = "+591 57697071";

/** Parámetros del evento Schedule de Meta al agendar la llamada (sin `value`: la llamada es gratis y no debe contaminar la optimización). */
export function estimadosCallEventParams() {
  return {
    content_name: "Llamada de consultoría gratis: anuncios de pago en Facebook y Google (Tree Services)",
    content_category: "consultoria",
  };
}
