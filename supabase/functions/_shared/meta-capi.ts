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

export type SendMetaPurchaseParams = {
  email: string;
  value: number;
  currency: string;
  eventId: string;
  eventSourceUrl: string;
  /** Si no se pasan, se usan el pixel y el token de DELF. */
  pixelId?: string;
  accessToken?: string;
  /** undefined → el código global (DELF, como siempre); null o un string → el de ese producto. */
  testEventCode?: string | null;
};

export type SendMetaPurchaseResult = { ok: true } | { ok: false; error: string };

/** Envía el evento Purchase a Meta CAPI. No lanza — devuelve el resultado para loguear sin romper el webhook de Stripe. */
export async function sendMetaPurchaseEvent(params: SendMetaPurchaseParams): Promise<SendMetaPurchaseResult> {
  const accessToken = params.accessToken ?? Deno.env.get("META_CAPI_ACCESS_TOKEN");
  if (!accessToken) {
    return { ok: false, error: "META_CAPI_ACCESS_TOKEN no configurado" };
  }
  const pixelId = params.pixelId ?? META_PIXEL_ID;

  const hashedEmail = await sha256Hex(params.email);
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
          user_data: { em: [hashedEmail] },
          custom_data: { value: params.value, currency: params.currency },
        }],
        ...(testEventCode ? { test_event_code: testEventCode } : {}),
      }),
    },
  );

  if (!res.ok) {
    return { ok: false, error: `Meta CAPI error ${res.status}: ${await res.text()}` };
  }
  return { ok: true };
}
