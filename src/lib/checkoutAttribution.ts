// Datos del navegador que Meta necesita para hacer coincidir una compra con el
// anuncio que la originó. El pago ocurre en Stripe (otro dominio), así que al
// hacer clic en un CTA guardamos acá las cookies de Meta y pasamos el id de esa
// fila en el client_reference_id del link de pago; stripe-webhook la lee cuando
// llega la compra (ver supabase/migrations/20260923_checkout_attribution.sql).
//
// El user agent y la IP NO se envían desde acá: los pone la base a partir de los
// headers de la petición, así el navegador no puede falsearlos.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export function getCookie(name: string): string | null {
  try {
    const hit = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
    return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null;
  } catch {
    return null;
  }
}

/** Cookie `_fbp` que crea el pixel de Meta. */
export const getFbp = (): string | null => getCookie("_fbp");

/**
 * Cookie `_fbc` (clic en un anuncio). Si el pixel todavía no la creó pero la URL
 * trae `?fbclid=`, se arma con el formato de Meta: fb.<subdomainIndex>.<timestamp>.<fbclid>.
 */
export function getFbc(): string | null {
  const cookie = getCookie("_fbc");
  if (cookie) return cookie;
  try {
    const fbclid = new URLSearchParams(window.location.search).get("fbclid");
    return fbclid ? `fb.1.${Date.now()}.${fbclid}` : null;
  } catch {
    return null;
  }
}

/**
 * Guarda la atribución del clic. Nunca lanza ni bloquea el pago: espera como
 * máximo `timeoutMs` y, si falla o tarda, la compra sigue igual (solo se pierde
 * la mejora de coincidencia en Meta para esa venta).
 */
export async function saveCheckoutAttribution(id: string, timeoutMs = 800): Promise<void> {
  const request = fetch(`${SUPABASE_URL}/rest/v1/checkout_attribution`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ id, fbp: getFbp(), fbc: getFbc() }),
    keepalive: true, // sigue aunque la página navegue a Stripe
  })
    .then(() => undefined)
    .catch(() => undefined);

  await Promise.race([request, new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))]);
}
