// Configuración de la landing de agendamiento «Consultoría de marketing gratis para Tree Services» (/consultoria-mkt-tree).
// Es un embudo corto de UNA sola acción: ver el VSL y agendar la consultoría gratis en el calendario del CRM. Reusa del kit
// (/estimados-lp) y de su upsell (/estimados-ty) el calendario, el pixel, los estilos y el contacto de soporte: ver estimadosConfig.ts.

import type { BookingQualification } from "@/components/crm/CalendarRenderer";
import {
  ESTIMADOS_CALL_CALENDAR_ID,
  ESTIMADOS_PIXEL_ID,
  ESTIMADOS_SUPPORT_EMAIL,
} from "@/lib/estimadosConfig";

export const CONSULTORIA_TREE_PATH = "/consultoria-mkt-tree";

/** Clave del producto para `data-product` y para identificar esta landing en eventos. No es un producto de Stripe: la consultoría es gratis. */
export const CONSULTORIA_TREE_SLUG = "consultoria-mkt-tree";

/** El MISMO calendario de /estimados-ty (único calendario del CRM de la cuenta admin: 30 min, aviso mínimo de 6 h, la ventana de reserva la define el calendario en el CRM). */
export const CONSULTORIA_TREE_CALENDAR_ID: string = ESTIMADOS_CALL_CALENDAR_ID;

/**
 * Pixel de Meta. Hoy es el mismo del kit (1013028214851437) para no partir la audiencia mientras no haya otro. Si Daniel crea un pixel
 * propio para esta campaña, se cambia aquí y listo. Eventos: PageView, ViewContent (al cargar) y Lead (al agendar). Nunca en localhost
 * (ver metaPixel.ts; `?fbtest=1` lo permite).
 */
export const CONSULTORIA_TREE_PIXEL_ID: string = ESTIMADOS_PIXEL_ID;

/**
 * VSL de la página. Vacío = no se muestra video (en desarrollo, un recuadro rotulado). Acepta un .mp4/.webm (se muestra de fondo, en bucle y sin
 * sonido, con un solo botón Play que lo reinicia con sonido; ver EstimadosPreviewVideo) o la URL de un reproductor (iframe).
 * PENDIENTE: el guion y la grabación del VSL; al tenerlo, pegar su URL aquí.
 */
export const CONSULTORIA_TREE_VIDEO_URL: string = "";

/** Inversión mínima mensual en anuncios (USD) con la que trabajamos; se usa para calificar al visitante en el copy. */
export const CONSULTORIA_TREE_MIN_BUDGET = 2000;

/**
 * Formulario de reserva PROPIO de esta landing (el calendario es el mismo que el del upsell /estimados-ty, que solo pide el WhatsApp).
 * Todo es obligatorio. Si cualquiera de las 3 confirmaciones se responde «No», no se puede agendar.
 * Los ids de nombre, correo y WhatsApp son los del formulario vinculado al calendario en el CRM («Formulario Básico de Calendario»), para que
 * el contacto quede con sus datos en su ficha; `field_business` es el campo «Nombre del negocio» agregado a ese mismo formulario.
 */
export const CONSULTORIA_TREE_QUALIFICATION: BookingQualification = {
  fields: [
    { id: "field_name", label: "Nombre y Apellido", type: "text", placeholder: "Ej: Juan Pérez" },
    { id: "field_email", label: "Correo electrónico", type: "email", placeholder: "tucorreo@ejemplo.com" },
    { id: "f-1788373522211", label: "WhatsApp", type: "phone", placeholder: "" },
    { id: "field_business", label: "Nombre del negocio", type: "text", placeholder: "Ej: Pérez Tree Service" },
  ],
  confirmations: [
    { id: "confirm_busca_clientes", text: "Confirmo que estoy reservando esta llamada porque busco ayuda para recibir más clientes con marketing profesional." },
    { id: "confirm_presupuesto", text: "Confirmo que puedo invertir más de $2000 USD al mes en marketing." },
    { id: "confirm_asistencia", text: "Confirmo que si no me presento a la llamada sin avisar o sin informar previamente, cualquier llamada que reserve en el futuro será cancelada." },
  ],
  blockedMessage: "Aún no cumples los requisitos para la consultoría",
  /** Etiqueta del contacto en el CRM: lo distingue de los que vienen del upsell /estimados-ty (mismo calendario). */
  source: CONSULTORIA_TREE_SLUG,
};

/** Duración de la consultoría (min), la del calendario. */
export const CONSULTORIA_TREE_MINUTES = 30;

/** Contacto de ayuda del pie (el mismo de soporte del kit). */
export const CONSULTORIA_TREE_SUPPORT_EMAIL = ESTIMADOS_SUPPORT_EMAIL;

/** Parámetros de ViewContent (al cargar) y Lead (al agendar). Sin `value`: la consultoría es gratis y no debe contaminar la optimización. */
export function consultoriaTreeEventParams() {
  return {
    content_name: "Consultoría de marketing gratis para Tree Services",
    content_ids: [CONSULTORIA_TREE_SLUG],
    content_category: "consultoria",
  };
}
