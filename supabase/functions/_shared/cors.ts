/**
 * Shared CORS helpers for Edge Functions.
 *
 * Two modes:
 *   PUBLIC_CORS_HEADERS  — wildcard (*), for publicly embeddable widgets
 *                          (crm-form-public, crm-calendar-book).
 *                          These MUST allow any origin because clients embed
 *                          the forms/calendars on their own domains.
 *
 *   getCorsHeaders(req)  — origin-reflective, for private CRM functions.
 *                          Reads ALLOWED_ORIGINS env var (comma-separated).
 *                          Falls back to wildcard when not set (dev mode).
 */

/** Wildcard CORS — only for publicly embeddable widget functions. */
export const PUBLIC_CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const _allowedOrigins: string[] = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/**
 * Returns CORS headers for private CRM-facing functions.
 * - If ALLOWED_ORIGINS is set and the request Origin matches → reflect it back.
 * - If ALLOWED_ORIGINS is set but origin doesn't match → return the first allowed
 *   origin (browser will block the cross-origin request).
 * - If ALLOWED_ORIGINS is not set (local dev) → fall back to wildcard.
 * - If there is no Origin header (server-to-server call) → no CORS header needed.
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const base = { "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
  const origin = req.headers.get("Origin") ?? "";

  if (!origin) return base; // server-to-server: CORS headers not relevant

  if (_allowedOrigins.length === 0) {
    // Dev mode: no restriction configured
    return { ...base, "Access-Control-Allow-Origin": "*" };
  }

  if (_allowedOrigins.includes(origin)) {
    return { ...base, "Access-Control-Allow-Origin": origin };
  }

  // Origin not in allow-list — return first allowed origin so browser blocks it
  return { ...base, "Access-Control-Allow-Origin": _allowedOrigins[0] };
}
