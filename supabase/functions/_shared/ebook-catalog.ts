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
  meta: EbookMeta;
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
  const pixelId = (product.meta.pixelId ?? (product.meta.pixelIdEnv ? env(product.meta.pixelIdEnv) : undefined))?.trim();
  const accessToken = env(product.meta.accessTokenEnv)?.trim();
  if (!pixelId || !accessToken) return null;
  const testEventCode = (product.meta.testEventCodeEnv ? env(product.meta.testEventCodeEnv)?.trim() : undefined) || null;
  return { pixelId, accessToken, testEventCode };
}
