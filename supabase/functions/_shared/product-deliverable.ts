import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { recipientField } from "./wa-recipient.ts";

// ─── Envío de un archivo entregable (producto digital) por WhatsApp ───────────
// Compartido entre send-deliverable (envío inicial al confirmarse el pago) y
// whatsapp-webhook (reintento cuando Meta reporta que la descarga del archivo
// falló — ver RETRYABLE_MEDIA_ERROR_CODES más abajo). Una sola implementación
// para no divergir entre "cómo mandamos un PDF" en los dos lugares.

const GRAPH_VERSION = "v21.0";
const SIGNED_URL_TTL = 3600; // 1 hora — suficiente para que WhatsApp descargue el archivo

/**
 * Extrae el path de storage a partir de la URL pública guardada en el producto.
 * Ej: https://xxx.supabase.co/storage/v1/object/public/product-deliverables/uid/pid/file.pdf
 *  → uid/pid/file.pdf
 * Sirve también para reconocer si un media_url guardado en crm_wa_messages
 * corresponde a un entregable de producto (y no, por ejemplo, a un comprobante
 * de pago subido por el cliente u otro documento reenviado a mano).
 */
export function extractDeliverableStoragePath(url: string): string | null {
  try {
    const parsed = new URL(url);
    const marker = "/product-deliverables/";
    const idx = parsed.pathname.indexOf(marker);
    if (idx === -1) return null;
    return parsed.pathname.slice(idx + marker.length);
  } catch {
    return null;
  }
}

/**
 * Códigos de error de Meta que indican un fallo transitorio al descargar el
 * archivo desde nuestra signed URL (típicamente un hipo momentáneo del
 * storage) — vale la pena reintentar una vez con una URL firmada nueva. El
 * resto de errores (ventana de 24h vencida, número inválido, plantilla
 * rechazada, etc.) fallaría exactamente igual al reintentar, así que no están
 * acá — reintentarlos solo demoraría el aviso al dueño sin cambiar el resultado.
 */
export const RETRYABLE_MEDIA_ERROR_CODES = new Set([131053]);

export type SendDeliverableResult =
  | { ok: true; wa_message_id: string | null }
  | { ok: false; error: string };

/** Genera una signed URL fresca del archivo y lo envía como documento de WhatsApp. */
export async function sendDeliverableDocument(
  supabase: SupabaseClient,
  params: { storagePath: string; filename: string; phoneNumberId: string; accessToken: string; recipientPhone: string },
): Promise<SendDeliverableResult> {
  const { data: signed, error: signErr } = await supabase.storage
    .from("product-deliverables")
    .createSignedUrl(params.storagePath, SIGNED_URL_TTL);

  if (signErr || !signed?.signedUrl) {
    return { ok: false, error: signErr?.message ?? "could not generate signed url" };
  }

  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${params.phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${params.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      ...recipientField(params.recipientPhone),
      type: "document",
      document: { link: signed.signedUrl, filename: params.filename },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return { ok: false, error: `WhatsApp API error ${res.status}: ${errText}` };
  }
  const resJson = await res.json();
  return { ok: true, wa_message_id: resJson?.messages?.[0]?.id ?? null };
}
