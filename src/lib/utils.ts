import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normaliza una URL para los botones cta_url de WhatsApp, que exigen URL
 * absoluta. Escribir "google.com" hacía que el mensaje llegara con un botón
 * que no abría nada — sin error ni aviso.
 *
 * Espeja supabase/functions/_shared/wa-url.ts, que aplica lo mismo al enviar.
 *
 * "google.com" → "https://google.com"   ·   "tel:123" → null
 */
export function normalizeUrl(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return null;   // ftp:, tel:, mailto:...
  if (!/^[^\s/]+\.[^\s/]{2,}/.test(s)) return null;  // no parece un dominio
  return `https://${s}`;
}
