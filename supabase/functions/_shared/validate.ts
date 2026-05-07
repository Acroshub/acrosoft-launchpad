/**
 * Shared input validation and sanitization utilities for Edge Functions.
 * Keep this file free of Supabase/Deno-specific imports so it's portable.
 */

const UUID_RE  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATE_RE  = /^\d{4}-\d{2}-\d{2}$/;
const PHONE_RE = /^[+\d\s\-().]{5,30}$/;

/** Strip HTML tags, JS event attributes, and control characters from user text. */
export function sanitizeText(val: unknown, maxLength = 500): string {
  if (val === null || val === undefined) return "";
  return String(val)
    .replace(/<[^>]*>/g, "")                          // strip HTML tags
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")      // strip inline event handlers
    .replace(/javascript\s*:/gi, "")                  // strip javascript: URIs
    .replace(/[\x00-\x08\x0B\x0E-\x1F\x7F]/g, "")   // strip control chars
    .trim()
    .slice(0, maxLength);
}

export function isValidUUID(id: unknown): boolean {
  return typeof id === "string" && UUID_RE.test(id);
}

export function isValidEmail(email: string): boolean {
  return email.length <= 254 && EMAIL_RE.test(email);
}

export function isValidPhone(phone: string): boolean {
  return PHONE_RE.test(phone);
}

/** Validates YYYY-MM-DD format and that it resolves to a real calendar date. */
export function isValidDate(date: unknown): boolean {
  if (typeof date !== "string" || !DATE_RE.test(date)) return false;
  const d = new Date(date + "T00:00:00Z");
  if (isNaN(d.getTime())) return false;
  // Make sure no day overflow (e.g. "2024-02-31" would shift to March)
  const [y, m, day] = date.split("-").map(Number);
  return d.getUTCFullYear() === y && d.getUTCMonth() + 1 === m && d.getUTCDate() === day;
}

export function isValidHour(h: unknown): boolean {
  return typeof h === "number" && Number.isInteger(h) && h >= 0 && h <= 23;
}

export function isValidMinute(m: unknown): boolean {
  return typeof m === "number" && Number.isInteger(m) && m >= 0 && m <= 59;
}
