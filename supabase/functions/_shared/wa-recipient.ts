/**
 * Business-Scoped User ID (BSUID) — identificador que Meta introdujo junto con
 * los usernames de WhatsApp: cuando un cliente oculta su número o llega sin
 * teléfono real en el webhook (ej. Click-to-WhatsApp Ads, usuarios con
 * username de WhatsApp), Meta manda este ID en vez del número. Formato: código
 * de país ISO 3166 de 2 letras + "." + hasta 128 caracteres alfanuméricos, ej.
 * "PE.890226963914597".
 *
 * Se puede usar como destinatario para enviar mensajes igual que un número de
 * teléfono — solo cambia el campo del body en el POST a Graph API: "recipient"
 * en vez de "to" (Meta: "to send a message using only the user's BSUID... set
 * recipient to the user's BSUID; omit the to property"). Único límite real: no
 * sirve para plantillas de autenticación (one-tap/zero-tap/copy-code), que
 * exigen número real — no aplica a plantillas de venta/marketing/utility.
 *
 * Fuente: https://developers.facebook.com/documentation/business-messaging/whatsapp/business-scoped-user-ids/
 */
const BSUID_RE = /^[A-Za-z]{2}\.[A-Za-z0-9]{1,128}$/;

export function isBsuid(value: string | null | undefined): boolean {
  return !!value && BSUID_RE.test(value);
}

/** Arma el campo de destinatario correcto para el body de POST /messages. */
export function recipientField(value: string): { to: string } | { recipient: string } {
  return isBsuid(value) ? { recipient: value } : { to: value };
}

/**
 * Normaliza un identificador de contacto para guardar/comparar/filtrar: un
 * teléfono real se limpia a solo dígitos (comportamiento de siempre); un BSUID
 * se deja intacto — quitarle el punto y las letras del código de país lo
 * destruye y ya no sirve para enviarle mensajes.
 */
export function normalizeWaIdentifier(value: string): string {
  return isBsuid(value) ? value : value.replace(/\D/g, "");
}
