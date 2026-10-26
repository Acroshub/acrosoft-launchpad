// Catálogo de productos ebook vendidos vía Stripe Payment Link (landing
// pública, sin tenant de CRM detrás). Un slug por producto: stripe-webhook y
// los *-get-order leen de acá todo lo que cambia entre productos (archivo a
// entregar, thank-you page, pixel de Meta, acceso a la plataforma).

export type EbookMeta = {
  /** Pixel ID fijo… */
  pixelId?: string;
  /** …o nombre del secret que lo trae (para configurarlo sin tocar código). */
  pixelIdEnv?: string;
  /** Secret con el token de Conversions API DE ESE pixel (cada pixel tiene el suyo). */
  accessTokenEnv: string;
  /** Secret opcional con el código de "Test events" de Events Manager (también es por pixel). */
  testEventCodeEnv?: string;
};

/** Acceso a una webapp con contraseña compartida que viene incluida en la compra (ej. TOEFL Audio Lab). */
export type EbookPlatform = {
  name: string;
  /** Ruta en el frontend; el email la completa con APP_URL. */
  path: string;
  /** Secret con la contraseña. Nunca va en el repo ni en el bundle del frontend. */
  passwordEnv: string;
  /** Etiqueta del bloque en el email. Por defecto "Bono 1 · <name>" (TOEFL). */
  emailLabel?: string;
  /** Texto del bloque en el email, antes de la contraseña. Por defecto el de TOEFL Audio Lab. */
  emailBlurb?: string;
  /** Texto del botón del email. Por defecto "Abrir la plataforma". */
  emailButton?: string;
};

/**
 * Datos públicos de la landing para reenviar ViewContent/InitiateCheckout por Conversions API
 * (función product-track-event). Sin esto el producto no acepta esos eventos.
 * Deben coincidir con el config del frontend (src/lib/<palabra>Config.ts).
 */
export type EbookTracking = {
  /** content_name de los eventos (el mismo que el pixel del navegador). */
  contentName: string;
  /** Precio de venta (unidades de moneda, no centavos). Lo fija el servidor, no el cliente. */
  price: number;
  /** Por defecto USD. */
  currency?: string;
  /** Ruta de la landing, ej. "/auxilios-lp": los eventos solo se aceptan si vienen de esa URL. */
  landingPath: string;
};

export type EbookProduct = {
  name: string;
  shortName: string;
  /** Archivo a descargar. Sin él (y sin storagePath) el producto se entrega solo por su plataforma. */
  filename?: string;
  storagePath?: string;
  /** Thank-you page del producto (el email apunta acá, con ?session_id=). */
  thankYouPath: string;
  /** Pixel + token de Conversions API. Sin él (producto aún sin pixel) el webhook no manda Purchase por CAPI. */
  meta?: EbookMeta;
  tracking?: EbookTracking;
  platform?: EbookPlatform;
  /** Secret con los ids `plink_…` (separados por coma) de los Payment Links de este producto. Respaldo para reconocerlo si el link no trae el slug. */
  paymentLinkIdsEnv?: string;
};

export const EBOOK_STORAGE_BUCKET = "ebook-deliverables";

/** Los Payment Links de DELF no llevan metadata ni client_reference_id: sin pista, la compra es de este producto. */
export const DEFAULT_PRODUCT_SLUG = "delf-a2";

// Un solo ZIP por producto (guía + bonos adentro) — un único botón de
// descarga en la thank-you page en vez de un botón por archivo. shortName se
// usa como remitente y en el asunto del email de confirmación (name es muy
// largo para eso).
export const EBOOK_CATALOG: Record<string, EbookProduct> = {
  "delf-a2": {
    name: "Guía para Aprobar tu Examen DELF A2 + 4 Bonos",
    shortName: "Guía DELF A2",
    filename: "DELF-A2-Guia-Completa-Bonos.zip",
    storagePath: "delf-a2/DELF-A2-Guia-Completa-Bonos.zip",
    thankYouPath: "/ty-frances",
    meta: { pixelId: "1147228644816086", accessTokenEnv: "META_CAPI_ACCESS_TOKEN", testEventCodeEnv: "META_CAPI_TEST_EVENT_CODE" },
  },
  "toefl-b2": {
    name: "Guía en Español para Aprobar el TOEFL con Nivel B2 + 4 Bonos",
    shortName: "Guía TOEFL B2",
    filename: "TOEFL-B2-Guia-Completa-Bonos.zip",
    storagePath: "toefl-b2/TOEFL-B2-Guia-Completa-Bonos.zip",
    thankYouPath: "/toefl-ty",
    // Mismo pixel que src/lib/toeflConfig.ts. Solo el token (secreto) va en Supabase.
    meta: { pixelId: "1446406424021779", accessTokenEnv: "META_CAPI_ACCESS_TOKEN_TOEFL", testEventCodeEnv: "META_CAPI_TEST_EVENT_CODE_TOEFL" },
    platform: { name: "TOEFL Audio Lab", path: "/toefl-plataforma", passwordEnv: "TOEFL_LAB_PASSWORD" },
    paymentLinkIdsEnv: "TOEFL_PAYMENT_LINK_IDS",
  },
  // Kit Llena tu Calendario de Piscinas: ZIP (4 PDFs + 60 imágenes). SIN `meta` ni `tracking` a propósito: Daniel pidió
  // avanzar sin Pixel de Meta ni API de Conversiones. Cuando existan, ver docs/piscinas-lanzamiento.md
  // (sección «PENDIENTE: Pixel de Meta + API de Conversiones»). Sin `meta`, resolveMeta devuelve null y el
  // webhook no manda Purchase; sin `tracking`, product-track-event rechaza los eventos de este producto.
  // storagePath: ruta del ZIP en el bucket privado (piscinas-get-order permite sobrescribirla con el secret
  // PISCINAS_ZIP_PATH, o servir el ZIP desde otra URL con PISCINAS_ZIP_URL).
  piscinas: {
    name: "Kit Llena tu Calendario de Piscinas",
    shortName: "Kit Llena tu Calendario de Piscinas",
    filename: "Kit-Conseguir-Clientes-Piscinas.zip",
    storagePath: "piscinas/Kit-Conseguir-Clientes-Piscinas.zip",
    thankYouPath: "/piscinas-ty",
    paymentLinkIdsEnv: "PISCINAS_PAYMENT_LINK_IDS",
  },
  // Sin ZIP: el ebook y los 3 bonos viven cifrados dentro de la webapp (pestaña Biblioteca).
  // Mismo pixel que src/lib/auxiliosConfig.ts. Solo el token (secreto) va en Supabase.
  auxilios: {
    name: "Primeros Auxilios del Bebé (0 a 12 Meses) + 3 Bonos",
    shortName: "Primeros Auxilios del Bebé",
    thankYouPath: "/auxilios-ty",
    meta: { pixelId: "1209613534467929", accessTokenEnv: "META_CAPI_ACCESS_TOKEN_AUXILIOS", testEventCodeEnv: "META_CAPI_TEST_EVENT_CODE_AUXILIOS" },
    tracking: { contentName: "Primeros Auxilios del Bebé", price: 25, landingPath: "/auxilios-lp" },
    platform: {
      name: "Primeros Auxilios del Bebé",
      path: "/primeros-auxilios-bebe-app",
      passwordEnv: "PRIMEROS_AUXILIOS_BEBE_APP_PASSWORD",
      emailLabel: "Tu app y tus libros",
      emailBlurb: "Tu ebook, tus 3 bonos y las tarjetas de emergencia están dentro de la app (pestaña Biblioteca). Entra con esta contraseña:",
      emailButton: "Abrir la app",
    },
    paymentLinkIdsEnv: "AUXILIOS_PAYMENT_LINK_IDS",
  },
};

/**
 * Compras de SERVICIOS que no entregan archivo ni plataforma (hoy: los upsells del embudo de Piscinas). Se reconocen
 * por client_reference_id ("piscinas-up1", "piscinas-up2", que la página del upsell agrega al Payment Link) o por el
 * id del Payment Link listado en el secret `paymentLinkIdsEnv`. El webhook las registra en el log y responde 200
 * SIN enviar el email del producto ni tocar ebook_orders: el servicio se cumple a mano (Stripe + formulario de
 * onboarding). Sin esto, un Payment Link sin pista caería en el producto por defecto (DELF) y mandaría el email equivocado.
 * Deben coincidir con PISCINAS_UP1_SLUG / PISCINAS_UP2_SLUG de src/lib/piscinasConfig.ts (lo comprueba ebook-order.test.ts).
 */
export type ServiceOrder = { label: string; paymentLinkIdsEnv?: string };

export const SERVICE_ORDERS: Record<string, ServiceOrder> = {
  "piscinas-up1": { label: "Piscinas · Upsell 1 · Creación de campaña (US$100)", paymentLinkIdsEnv: "PISCINAS_UP1_PAYMENT_LINK_IDS" },
  "piscinas-up2": { label: "Piscinas · Upsell 2 · Gestión de anuncios (US$1,000/mes)", paymentLinkIdsEnv: "PISCINAS_UP2_PAYMENT_LINK_IDS" },
};

export type EnvGetter = (name: string) => string | undefined;
const denoEnv: EnvGetter = (name) => Deno.env.get(name);

/**
 * Pixel + token de Conversions API del producto. null si falta cualquiera de
 * los dos: es preferible NO mandar el evento a mandarlo al pixel equivocado.
 */
export function resolveMeta(
  product: EbookProduct,
  env: EnvGetter = denoEnv,
): { pixelId: string; accessToken: string; testEventCode: string | null } | null {
  const productMeta = product.meta;
  if (!productMeta) return null; // producto sin pixel todavía: no se manda nada
  const pixelId = (productMeta.pixelId ?? (productMeta.pixelIdEnv ? env(productMeta.pixelIdEnv) : undefined))?.trim();
  const accessToken = env(productMeta.accessTokenEnv)?.trim();
  if (!pixelId || !accessToken) return null;
  const testEventCode = (productMeta.testEventCodeEnv ? env(productMeta.testEventCodeEnv)?.trim() : undefined) || null;
  return { pixelId, accessToken, testEventCode };
}
