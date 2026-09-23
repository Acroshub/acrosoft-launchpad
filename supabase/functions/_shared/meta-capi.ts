// Meta Conversions API — complemento server-side del pixel del navegador.
// Se usa el mismo event_id en ambos lados (acá y en el fbq('track', ...,
// {eventID}) del frontend) para que Meta deduplique: un solo evento real
// contado una vez, pero con dos señales (browser + server) para optimizar
// mejor la entrega de los anuncios.

// Pixel y token por defecto (el de DELF). Cada producto puede traer los suyos
// (ver resolveMeta en ebook-catalog.ts): el token de Conversions API es de UN
// pixel, así que un pixel distinto necesita su propio token.
const META_PIXEL_ID = "1147228644816086";
const GRAPH_VERSION = "v21.0";

async function sha256Hex(input: string): Promise<string> {
  const normalized = input.trim().toLowerCase();
  const data = new TextEncoder().encode(normalized);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── user_data ───────────────────────────────────────────────────────────────
// Meta pide client_user_agent en los eventos web enviados por servidor (sin él el
// evento puede descartarse) y premia con mejor coincidencia cuantos más datos
// del comprador lleguen. Reglas de normalización y hash: developers.facebook.com
// → Conversions API → Customer Information Parameters. Todo lo que se hashea va
// en SHA-256; IP, user agent, fbp y fbc van SIN hashear.

export type MetaCustomer = {
  /** "Nombre Apellido": se separa en fn / ln. */
  name?: string | null;
  /** E.164 (como lo entrega Stripe) o con símbolos: se dejan solo los dígitos. */
  phone?: string | null;
  /** ISO de 2 letras. */
  country?: string | null;
  zip?: string | null;
  city?: string | null;
  state?: string | null;
  clientIp?: string | null;
  clientUserAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
};

const onlyLetters = (s: string) => s.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{M}]/gu, "");
const FB_COOKIE = /^fb\.[0-2]\.\d{10,13}\.[A-Za-z0-9_-]+$/;
const IP_CHARS = /^[0-9a-fA-F:.]{3,45}$/;

/** Devuelve el user_data listo para enviar. Solo incluye lo que llegó y es válido. */
export async function buildUserData(email: string, customer: MetaCustomer = {}): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = { em: [await sha256Hex(email)] };

  const nameParts = (customer.name ?? "").normalize("NFKC").trim().split(/\s+/).filter(Boolean);
  const fn = nameParts.length ? onlyLetters(nameParts[0]) : "";
  const ln = nameParts.length > 1 ? onlyLetters(nameParts[nameParts.length - 1]) : "";
  if (fn) out.fn = [await sha256Hex(fn)];
  if (ln) out.ln = [await sha256Hex(ln)];

  const phone = (customer.phone ?? "").replace(/\D/g, "");
  if (phone.length >= 7 && phone.length <= 15) out.ph = [await sha256Hex(phone)];

  const country = (customer.country ?? "").trim().toLowerCase();
  if (/^[a-z]{2}$/.test(country)) out.country = [await sha256Hex(country)];

  let zip = (customer.zip ?? "").toLowerCase().replace(/[\s-]/g, "");
  if (country === "us" && /^\d{5,9}$/.test(zip)) zip = zip.slice(0, 5);
  if (zip) out.zp = [await sha256Hex(zip)];

  const city = onlyLetters(customer.city ?? "");
  if (city) out.ct = [await sha256Hex(city)];
  const state = onlyLetters(customer.state ?? "");
  if (state) out.st = [await sha256Hex(state)];

  const ip = (customer.clientIp ?? "").trim();
  if (IP_CHARS.test(ip)) out.client_ip_address = ip;
  const ua = (customer.clientUserAgent ?? "").trim().slice(0, 500);
  if (ua) out.client_user_agent = ua;
  const fbp = (customer.fbp ?? "").trim();
  if (FB_COOKIE.test(fbp)) out.fbp = fbp;
  const fbc = (customer.fbc ?? "").trim();
  if (FB_COOKIE.test(fbc)) out.fbc = fbc;

  return out;
}

// ─── Envío ───────────────────────────────────────────────────────────────────
export type SendMetaPurchaseParams = {
  email: string;
  value: number;
  currency: string;
  eventId: string;
  eventSourceUrl: string;
  /** Datos del comprador (Stripe + navegador). Sin ellos solo viaja el email, como antes. */
  customer?: MetaCustomer;
  /** Si no se pasan, se usan el pixel y el token de DELF. */
  pixelId?: string;
  accessToken?: string;
  /** undefined → el código global (DELF, como siempre); null o un string → el de ese producto. */
  testEventCode?: string | null;
};

/** `fields` = nombres (nunca valores) de lo que viajó en user_data, para poder auditarlo en los logs. */
export type SendMetaPurchaseResult = { ok: true; fields: string[] } | { ok: false; error: string };

/** Envía el evento Purchase a Meta CAPI. No lanza — devuelve el resultado para loguear sin romper el webhook de Stripe. */
export async function sendMetaPurchaseEvent(params: SendMetaPurchaseParams): Promise<SendMetaPurchaseResult> {
  const accessToken = params.accessToken ?? Deno.env.get("META_CAPI_ACCESS_TOKEN");
  if (!accessToken) {
    return { ok: false, error: "META_CAPI_ACCESS_TOKEN no configurado" };
  }
  const pixelId = params.pixelId ?? META_PIXEL_ID;

  const userData = await buildUserData(params.email, params.customer);
  // Código temporal de Meta Events Manager (pestaña "Test events") para
  // verificar que los eventos llegan bien antes de confiar en el flujo real.
  // Se deja puesto o se saca sin tocar código — solo un secret opcional.
  const testEventCode = params.testEventCode === undefined ? Deno.env.get("META_CAPI_TEST_EVENT_CODE") : params.testEventCode;

  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${accessToken}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [{
          event_name: "Purchase",
          event_time: Math.floor(Date.now() / 1000),
          event_id: params.eventId,
          action_source: "website",
          event_source_url: params.eventSourceUrl,
          user_data: userData,
          custom_data: { value: params.value, currency: params.currency },
        }],
        ...(testEventCode ? { test_event_code: testEventCode } : {}),
      }),
    },
  );

  if (!res.ok) {
    return { ok: false, error: `Meta CAPI error ${res.status}: ${await res.text()}` };
  }
  return { ok: true, fields: Object.keys(userData) };
}
