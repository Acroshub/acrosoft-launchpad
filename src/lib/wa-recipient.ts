/**
 * Business-Scoped User ID (BSUID) — identificador que Meta introdujo junto con
 * los usernames de WhatsApp: cuando un cliente oculta su número o llega sin
 * teléfono real en el webhook (ej. Click-to-WhatsApp Ads, usuarios con
 * username de WhatsApp), Meta manda este ID en vez del número. Formato: código
 * de país ISO 3166 de 2 letras + "." + hasta 128 caracteres alfanuméricos, ej.
 * "PE.890226963914597". Sirve igual que un teléfono para enviar mensajes (ver
 * supabase/functions/_shared/wa-recipient.ts, la versión de este mismo helper
 * usada en las edge functions), pero en la UI no tiene sentido mostrarlo como
 * si fuera un número — no hay nada que discar ni que reconocer visualmente.
 */
const BSUID_RE = /^[A-Za-z]{2}\.[A-Za-z0-9]{1,128}$/;

export function isBsuid(value: string | null | undefined): boolean {
  return !!value && BSUID_RE.test(value);
}

/**
 * Cómo mostrar el identificador de un contacto de WhatsApp cuando no hay
 * nombre: un teléfono se antepone con "+" como siempre; un BSUID se muestra
 * como "Usuario de WhatsApp" — mostrar "+PE.890226963914597" no le dice nada
 * a nadie.
 */
export function formatWaIdentifier(phone: string | null | undefined): string {
  if (!phone) return "";
  return isBsuid(phone) ? "Usuario de WhatsApp" : `+${phone}`;
}

/**
 * Normaliza un identificador para comparar/matchear (ej. cruzar el teléfono
 * de una conversación con el de un contacto): un teléfono se reduce a solo
 * dígitos como siempre; un BSUID se deja intacto — reducirlo a dígitos le
 * quita el código de país y ya no compara igual con nada.
 */
export function normalizeWaIdentifier(value: string): string {
  return isBsuid(value) ? value : value.replace(/\D/g, "");
}
