/**
 * wa-meta-events
 * Invocada cada minuto por pg_cron (solo si hay eventos pendientes).
 *
 * Envía a la Conversions API de Meta para mensajería empresarial los eventos que
 * generan las etiquetas (Compra → Purchase, etc.). Un trigger encola una fila en
 * crm_wa_meta_events al aplicar la etiqueta; aquí se procesa.
 *
 * Reglas:
 *  - Solo se puede atribuir un chat que llegó desde un anuncio: sin ctwa_clid se marca
 *    'skipped' (Meta exige ese identificador).
 *  - Meta no deduplica; la unicidad (chat, etiqueta) de la tabla lo garantiza.
 *  - Fallos temporales (red, 5xx, límites) se reintentan con espera creciente; los
 *    permanentes (token, permisos, parámetros) quedan 'failed' con el motivo a la vista.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireInternal } from "../_shared/internal-auth.ts";
import { resolveAdProduct } from "../_shared/ad-product.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const GRAPH = "https://graph.facebook.com/v21.0";
const BATCH = 40;
const MAX_ATTEMPTS = 5;
// Espera antes del reintento n (minutos).
const BACKOFF_MIN = [2, 10, 30, 120, 360];
// Códigos de Meta que son temporales (límite de llamadas, servicio no disponible).
const RETRYABLE_CODES = new Set([1, 2, 4, 17, 32, 341, 613]);

class MetaError extends Error {
  constructor(message: string, public code?: number, public retryable = false) { super(message); }
}

function explain(e: MetaError): string {
  if (e.code === 190) return "El token de acceso es inválido o venció.";
  if (e.code === 10 || e.code === 200 || e.code === 294) {
    return "El token no tiene el permiso whatsapp_business_manage_events (o la app no tiene Advanced Access para él).";
  }
  return `Meta respondió: ${e.message}`;
}

async function graph(path: string, token: string, body?: unknown) {
  let res: Response;
  try {
    res = await fetch(`${GRAPH}/${path}`, {
      method: body ? "POST" : "GET",
      headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000),
    });
  } catch (e) {
    throw new MetaError(`sin conexión con Meta (${e instanceof Error ? e.message : e})`, undefined, true);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) {
    const code = json?.error?.code as number | undefined;
    const retryable = res.status >= 500 || (code !== undefined && RETRYABLE_CODES.has(code));
    throw new MetaError(json?.error?.message ?? `HTTP ${res.status}`, code, retryable);
  }
  return json;
}

/** Dataset de Meta del WABA: lo guardado, o lo crea (la llamada devuelve el existente si ya hay uno). */
async function getDatasetId(userId: string, wabaId: string, token: string, stored: string | null): Promise<string> {
  if (stored) return stored;
  const r = await graph(`${wabaId}/dataset`, token, {});
  const id = r?.id ?? r?.dataset_id;
  if (!id) throw new MetaError("Meta no devolvió el dataset del WABA");
  await supabase.from("crm_ai_agent_config").update({ meta_dataset_id: String(id) }).eq("user_id", userId);
  return String(id);
}

type Row = {
  id: string; user_id: string; conversation_id: string; label_id: string | null; event_name: string; event_time: string; attempts: number;
};

async function processRow(row: Row) {
  const finish = (patch: Record<string, unknown>) =>
    supabase.from("crm_wa_meta_events").update(patch).eq("id", row.id);

  const { data: conv } = await supabase.from("crm_wa_conversations")
    .select("ad_ctwa_clid, ad_source_id").eq("id", row.conversation_id).maybeSingle();
  if (!conv?.ad_ctwa_clid) {
    await finish({ status: "skipped", error: "El chat no llegó desde un anuncio (sin ctwa_clid): Meta no puede atribuirlo." });
    return;
  }

  const { data: cfg } = await supabase.from("crm_ai_agent_config")
    .select("access_token, waba_id, meta_dataset_id, meta_test_event_code").eq("user_id", row.user_id).maybeSingle();
  if (!cfg?.access_token || !cfg?.waba_id) {
    await finish({ status: "failed", error: "Falta el token de acceso o el WABA ID en Conexión." });
    return;
  }

  // Etiqueta de un producto: el evento solo se envía si el chat llegó por un anuncio de ESE producto
  // (si el producto del anuncio no se conoce no hay con qué comparar y se envía).
  let labelProductId: string | null = null;
  if (row.label_id) {
    const { data: lbl } = await supabase.from("crm_wa_labels").select("product_id").eq("id", row.label_id).maybeSingle();
    labelProductId = lbl?.product_id ?? null;
  }
  if (labelProductId) {
    const { productId: chatProductId } = await resolveAdProduct(supabase, row.user_id, conv.ad_source_id);
    if (chatProductId && chatProductId !== labelProductId) {
      await finish({ status: "skipped", error: "El chat llegó por un anuncio de otro producto: se omite para no atribuir la compra al anuncio equivocado." });
      return;
    }
  }

  // Valor de la compra: la venta más reciente del chat; si la etiqueta es de un producto, la de ESE producto.
  let custom: Record<string, unknown> | undefined;
  let value: number | null = null;
  let currency: string | null = null;
  if (row.event_name === "Purchase") {
    let saleQuery = supabase.from("crm_sales")
      .select("amount, currency").eq("user_id", row.user_id).eq("wa_conversation_id", row.conversation_id);
    if (labelProductId) saleQuery = saleQuery.eq("product_id", labelProductId);
    const { data: sale } = await saleQuery.order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (sale && Number(sale.amount) > 0 && /^[A-Za-z]{3}$/.test(sale.currency ?? "")) {
      value = Number(sale.amount);
      currency = String(sale.currency).toUpperCase();
      custom = { value, currency };
    }
  }

  try {
    const datasetId = await getDatasetId(row.user_id, cfg.waba_id, cfg.access_token, cfg.meta_dataset_id);
    const partner = Deno.env.get("META_PARTNER_AGENT");
    const body: Record<string, unknown> = {
      data: [{
        event_name: row.event_name,
        event_time: Math.floor(new Date(row.event_time).getTime() / 1000),
        action_source: "business_messaging",
        messaging_channel: "whatsapp",
        user_data: { whatsapp_business_account_id: cfg.waba_id, ctwa_clid: conv.ad_ctwa_clid },
        ...(custom ? { custom_data: custom } : {}),
      }],
      ...(partner ? { partner_agent: partner } : {}),
      ...(cfg.meta_test_event_code ? { test_event_code: cfg.meta_test_event_code } : {}),
    };
    const r = await graph(`${datasetId}/events`, cfg.access_token, body);
    if (!(Number(r?.events_received) >= 1)) throw new MetaError("Meta no registró el evento");
    await finish({ status: "sent", sent_at: new Date().toISOString(), error: null, attempts: row.attempts + 1, value, currency });
  } catch (e) {
    const err = e instanceof MetaError ? e : new MetaError(e instanceof Error ? e.message : String(e), undefined, true);
    const attempts = row.attempts + 1;
    console.error("[wa-meta-events]", row.id, err.message);
    if (err.retryable && attempts < MAX_ATTEMPTS) {
      const mins = BACKOFF_MIN[Math.min(attempts - 1, BACKOFF_MIN.length - 1)];
      await finish({ attempts, error: explain(err), next_attempt_at: new Date(Date.now() + mins * 60_000).toISOString() });
    } else {
      await finish({ status: "failed", attempts, error: explain(err) });
    }
  }
}

Deno.serve(async (req: Request) => {
  const denied = requireInternal(req);
  if (denied) return denied;

  const nowIso = new Date().toISOString();
  const { data: due } = await supabase.from("crm_wa_meta_events")
    .select("id").eq("status", "pending").lte("next_attempt_at", nowIso)
    .order("next_attempt_at").limit(BATCH);
  if (!due?.length) return new Response(JSON.stringify({ ok: true, processed: 0 }), { headers: { "Content-Type": "application/json" } });

  // Reclamo: se adelanta next_attempt_at para que una invocación solapada no procese los mismos.
  const { data: claimed } = await supabase.from("crm_wa_meta_events")
    .update({ next_attempt_at: new Date(Date.now() + 5 * 60_000).toISOString() })
    .in("id", due.map(d => d.id)).eq("status", "pending").lte("next_attempt_at", nowIso)
    .select("id, user_id, conversation_id, label_id, event_name, event_time, attempts");

  for (const row of (claimed ?? []) as Row[]) await processRow(row);

  return new Response(JSON.stringify({ ok: true, processed: claimed?.length ?? 0 }), { headers: { "Content-Type": "application/json" } });
});
