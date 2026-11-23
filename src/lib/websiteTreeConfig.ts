import { CONSULTORIA_TREE_PIXEL_ID } from "./consultoriaTreeConfig";

// Configuración de la landing /website-tree: website GRATIS para dueños de negocios de tree service en EE.UU. (la web es el primer paso del ecosistema del
// servicio de anuncios; en la llamada de entrega se ofrece el plan de marketing). El formulario NO usa calendario: manda el pedido a la Edge Function
// `website-tree-request` (cupo de 10 por mes, contacto en el CRM, aviso push) y luego lleva a WhatsApp para confirmar, igual que /consultoria-mkt-tree.

export const WEBSITE_TREE_PATH = "/website-tree";
export const WEBSITE_TREE_SLUG = "website-tree";

/** Cupos de websites gratis por mes. El que manda es el servidor (supabase/functions/_shared/website-tree.ts); este número solo se usa para dibujar la barra. */
export const WEBSITE_TREE_MONTHLY_LIMIT = 10;
/**
 * Cupos que MUESTRA la página mientras haya más de esos disponibles (decisión de Daniel, 2026-11-19: «ya quedan solo 4», luego 3). Es un número de presentación:
 * la página muestra min(cupos reales, este número), así que cuando los cupos reales bajen de ese número se muestra el real. El servidor sigue aplicando el límite real de 10.
 */
export const WEBSITE_TREE_DISPLAY_SLOTS = 3;
export const WEBSITE_TREE_MAX_SERVICES = 6;
/** Precio mensual de dominio y hosting a partir del 4.º mes (USD). */
export const WEBSITE_TREE_MONTHLY_PRICE = 20;
export const WEBSITE_TREE_FREE_MONTHS = 3;
/**
 * Precio de ANCLAJE («Crear una website con otra agencia normalmente puede costar US$500+», junto a «Con nosotros: Gratis»). Cifra elegida por Daniel: US$800 el 2026-11-19 y US$500 desde el 2026-11-20. Es una comparación de mercado:
 * estudios de precios de 2026 ubican una website a medida de agencia entre ~US$3,000 y US$15,000, y hay opciones económicas (plantillas, freelancers, suscripciones)
 * desde unos cientos de dólares; US$500 queda muy por debajo de lo que cobra una agencia, así que la comparación es defendible. Se cambia solo aquí.
 */
export const WEBSITE_TREE_AGENCY_PRICE = 500;
export const WEBSITE_TREE_DELIVERY_DAYS = 2;
export const WEBSITE_TREE_CALL_MINUTES = 30;

/** Pixel de Meta: el MISMO que usa /consultoria-mkt-tree (CONSULTORIA_TREE_PIXEL_ID, por decisión de Daniel: misma audiencia de tree service). Eventos: PageView y ViewContent al cargar la página, y Lead cuando la persona ve «Recibimos tu pedido». */
export const WEBSITE_TREE_PIXEL_ID: string = CONSULTORIA_TREE_PIXEL_ID;

/** WhatsApp al que el cliente escribe para confirmar su pedido (solo dígitos, con código de país: +591 57697071, el mismo de la consultoría). */
export const WEBSITE_TREE_WHATSAPP = "59157697071";

export const WEBSITE_TREE_FN = "website-tree-request";

/** Confirmaciones Sí/No del formulario. Cualquier «No» bloquea el envío. Los textos son los que pidió Daniel. */
export const WEBSITE_TREE_CONFIRMATIONS = [
  { id: "confirm_material", text: "Me comprometo a enviar mi logo, fotos y videos para terminar la website." },
  { id: "confirm_cost", text: `Entiendo que mi website es gratis, con ${WEBSITE_TREE_FREE_MONTHS} meses de dominio y hosting incluidos. Después, solo pago US$${WEBSITE_TREE_MONTHLY_PRICE} al mes por mantenerla en línea.` },
  { id: "confirm_call", text: "Me comprometo a asistir a la llamada donde me entregan mi website (Zoom, Meet o WhatsApp). Si falto sin avisar, no podré recibirla después." },
  { id: "confirm_marketing", text: "Quiero recibir un plan de marketing personalizado para conseguir más clientes con la website." },
] as const;

export type WebsiteTreeConfirmId = typeof WEBSITE_TREE_CONFIRMATIONS[number]["id"];

/** Atajos para llenar los servicios sin escribir (se pueden editar). */
export const WEBSITE_TREE_SERVICE_SUGGESTIONS = [
  "Poda de árboles", "Remoción de árboles", "Remoción de tocones", "Limpieza de terrenos", "Emergencias por tormenta", "Tala de riesgo", "Poda de palmeras", "Astillado de ramas",
];

export interface WebsiteTreeForm {
  name: string;
  email: string;
  whatsapp: string;
  business: string;
  language: "" | "es" | "en";
  city: string;
  services: string[]; // siempre WEBSITE_TREE_MAX_SERVICES entradas (vacías incluidas)
  star: number; // índice del servicio destacado dentro de `services`, -1 si aún no eligió
  answers: Partial<Record<WebsiteTreeConfirmId, "yes" | "no">>;
}

export const emptyWebsiteTreeForm = (): WebsiteTreeForm => ({
  name: "", email: "", whatsapp: "", business: "", language: "", city: "",
  services: Array.from({ length: WEBSITE_TREE_MAX_SERVICES }, () => ""), star: -1, answers: {},
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+\d\s\-().]{5,30}$/;

/** Paso 1: datos de contacto. Devuelve el primer problema (para mostrarlo) o null si está bien. */
export function validateWebsiteTreeStep1(f: WebsiteTreeForm, requireEmail = true): string | null {
  if (f.name.trim().length < 3) return "Escribe tu nombre y apellido";
  if (requireEmail || f.email.trim()) { if (!EMAIL_RE.test(f.email.trim())) return "Escribe un correo válido"; }
  if (!PHONE_RE.test(f.whatsapp.trim()) || f.whatsapp.replace(/\D/g, "").length < 7) return "Escribe tu WhatsApp con código de país o área";
  if (!f.business.trim()) return "Escribe el nombre de tu negocio";
  return null;
}

/** Servicios escritos (sin vacíos ni repetidos) y el índice del destacado dentro de esa lista, o -1. */
export function cleanServices(f: WebsiteTreeForm): { services: string[]; star: string } {
  const out: string[] = [];
  let star = "";
  f.services.forEach((raw, i) => {
    const t = raw.trim();
    if (!t) return;
    if (out.some((x) => x.toLowerCase() === t.toLowerCase())) return;
    out.push(t);
    if (i === f.star) star = t;
  });
  return { services: out, star };
}

/** Paso 2: datos del website y confirmaciones. */
export function validateWebsiteTreeStep2(f: WebsiteTreeForm): string | null {
  if (!f.language) return "Elige el idioma de tu website";
  if (!f.city.trim()) return "Escribe la ciudad y el estado donde trabajas";
  const { services } = cleanServices(f);
  if (services.length === 0) return "Agrega al menos un servicio";
  if (WEBSITE_TREE_CONFIRMATIONS.some((c) => !f.answers[c.id])) return "Responde las 4 confirmaciones";
  if (WEBSITE_TREE_CONFIRMATIONS.some((c) => f.answers[c.id] === "no")) return "Aún no cumples los requisitos para recibir tu website gratis";
  return null;
}

/** Cuerpo que recibe la Edge Function (ver parseWebsiteTreeRequest en supabase/functions/_shared/website-tree.ts). */
export function buildWebsiteTreeBody(f: WebsiteTreeForm) {
  const { services, star } = cleanServices(f);
  return {
    name: f.name.trim(), email: f.email.trim(), whatsapp: f.whatsapp.trim(), business: f.business.trim(),
    language: f.language, city: f.city.trim(), services, star,
    confirm_material: f.answers.confirm_material === "yes",
    confirm_cost: f.answers.confirm_cost === "yes",
    confirm_call: f.answers.confirm_call === "yes",
    confirm_marketing: f.answers.confirm_marketing === "yes",
  };
}

/** Mensaje con el que el cliente confirma su pedido por WhatsApp: la frase y, debajo, nombre, negocio y ciudad. */
export function websiteTreeConfirmMessage(f: Pick<WebsiteTreeForm, "name" | "business" | "city">): string {
  return [
    "Hola, confirmo mi pedido de website gratis para mi negocio de tree service",
    "",
    `Nombre: ${f.name.trim()}`,
    `Negocio: ${f.business.trim()}`,
    `Ciudad: ${f.city.trim()}`,
  ].join("\n");
}

export function websiteTreeConfirmUrl(f: Pick<WebsiteTreeForm, "name" | "business" | "city">): string {
  return `https://wa.me/${WEBSITE_TREE_WHATSAPP}?text=${encodeURIComponent(websiteTreeConfirmMessage(f))}`;
}

/** Mensaje que envía el botón flotante de soporte por WhatsApp (el mismo número con el que se confirma el pedido). Muestra interés en la website gratis (de qué página viene) y termina en «Mi pregunta es: » para que la persona escriba su duda a continuación. */
export const WEBSITE_TREE_SUPPORT_MESSAGE = "Hola, quiero mi website gratis para mi negocio de tree service, pero antes tengo una pregunta. Mi pregunta es: ";

export function websiteTreeSupportUrl(): string {
  return `https://wa.me/${WEBSITE_TREE_WHATSAPP}?text=${encodeURIComponent(WEBSITE_TREE_SUPPORT_MESSAGE)}`;
}

export function websiteTreeEventParams() {
  return {
    content_name: "Website gratis para negocios de tree service",
    content_ids: [WEBSITE_TREE_SLUG],
    content_category: "website-gratis",
  };
}
