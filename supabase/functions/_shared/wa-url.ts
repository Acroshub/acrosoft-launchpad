// ─────────────────────────────────────────────────────────────────────────────
// Normalización de URLs para botones cta_url de WhatsApp.
//
// Meta exige una URL ABSOLUTA. Si se manda "google.com", la API acepta el
// mensaje y el usuario lo recibe — pero el botón no abre nada. Es el peor tipo
// de fallo: no hay error, no hay log, solo un botón muerto.
//
// Lo usan tanto las secuencias (ai-agent) como los envíos masivos
// (send-wa-instant): el mismo bug estaba en los dos.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Devuelve la URL lista para Meta, o null si no hay forma de arreglarla.
 * "google.com" → "https://google.com"   ·   "tel:123" → null
 */
export function normalizeUrl(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;

  // Ya viene con esquema web: se deja tal cual.
  if (/^https?:\/\//i.test(s)) return s;

  // Otro esquema (ftp:, tel:, mailto:...) no sirve para un botón cta_url.
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return null;

  // Sin esquema: solo se asume https si de verdad parece un dominio.
  if (!/^[^\s/]+\.[^\s/]{2,}/.test(s)) return null;

  return `https://${s}`;
}
