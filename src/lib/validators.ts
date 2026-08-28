// ─── Shared field validators ──────────────────────────────────────────────────
// Returns an error message string, or null if the value is valid.
// All functions treat empty/null values as valid (required check is separate).

import { isBsuid } from "@/lib/wa-recipient";

export const isEmptyValue = (v: any): boolean =>
  v === undefined || v === null || v === "" ||
  (typeof v === "string" && v.trim() === "");

export const validateEmail = (v: string): string | null => {
  if (!v?.trim()) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
    ? null
    : "Ingresa un email válido";
};

export const validatePhone = (v: string): string | null => {
  if (!v?.trim()) return null;
  // Un BSUID (ver src/lib/wa-recipient.ts) llega automáticamente cuando Meta no
  // manda el teléfono real del contacto — no es algo que el usuario tipee, pero
  // sí algo que puede quedar guardado en el campo y volver a este formulario al
  // editar otros datos del contacto. No debe bloquear el guardado.
  if (isBsuid(v.trim())) return null;
  const digits = v.replace(/\D/g, "");
  return digits.length >= 7 ? null : "Ingresa un teléfono válido (mínimo 7 dígitos)";
};

export const validateUrl = (v: string): string | null => {
  if (!v?.trim()) return null;
  return /^https?:\/\/.+/.test(v.trim())
    ? null
    : "Ingresa una URL válida (debe iniciar con https://)";
};

export const validateSlug = (v: string): string | null => {
  if (!v?.trim()) return null;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v.trim())
    ? null
    : "Solo letras minúsculas, números y guiones (ej: mi-calendario)";
};
