// Llamadas a la API de Stripe por fetch plano (el repo no usa el SDK), para las functions del cobro en un clic de
// Piscinas. La clave viene del llamador (secret de Supabase) y NUNCA se registra; en los logs solo van el tipo y el
// código del error de Stripe, jamás el cuerpo completo (podría traer datos del cliente).

import { type FormValue, toFormBody } from "./piscinas-checkout.ts";

export type StripeResult = { ok: boolean; status: number; body: Record<string, unknown> };

export async function stripeCall(
  key: string,
  method: "GET" | "POST" | "DELETE",
  path: string,
  params?: { [k: string]: FormValue },
  opts: { idempotencyKey?: string; timeoutMs?: number } = {},
): Promise<StripeResult> {
  const headers: Record<string, string> = { Authorization: `Bearer ${key}` };
  let url = `https://api.stripe.com/v1${path}`;
  let body: string | undefined;
  if (method === "POST") {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;
    body = toFormBody(params ?? {});
  } else if (params && Object.keys(params).length) {
    url += `${path.includes("?") ? "&" : "?"}${toFormBody(params)}`;
  }
  const res = await fetch(url, { method, headers, body, signal: AbortSignal.timeout(opts.timeoutMs ?? 12_000) });
  let json: Record<string, unknown> = {};
  try {
    json = await res.json();
  } catch { /* cuerpo vacío o no JSON */ }
  return { ok: res.ok, status: res.status, body: json };
}

/** Error de Stripe sin datos sensibles, para el log. */
export function stripeErrorSummary(r: StripeResult): string {
  const e = (r.body.error ?? {}) as { type?: string; code?: string; decline_code?: string };
  return `http ${r.status} type=${e.type ?? "?"} code=${e.code ?? "?"}${e.decline_code ? ` decline=${e.decline_code}` : ""}`;
}
