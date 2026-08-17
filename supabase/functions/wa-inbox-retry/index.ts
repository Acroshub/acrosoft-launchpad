/**
 * wa-inbox-retry
 * Invocada cada minuto por pg_cron.
 *
 * Reprocesa los avisos de Meta que quedaron pendientes en crm_wa_inbox porque su
 * procesamiento falló. Es la mitad que faltaba del incidente del 16/08/2026: las
 * alertas avisan de que algo se rompió (detección), esto recupera los mensajes
 * que llegaron mientras estaba roto (recuperación).
 *
 * Por qué el reintento lo hacemos nosotros y no Meta: devolverle códigos de error
 * haría que Meta reintentase sola, pero Meta vigila la salud del endpoint y
 * fallos sostenidos pueden llevarla a limitar o bloquear las cuentas de WhatsApp
 * de los clientes SaaS. Perder mensajes de un día es malo; perder una cuenta es
 * peor. Así que a Meta se le responde 200 siempre y reintentamos por nuestra
 * cuenta desde aquí.
 *
 * Cómo reprocesa: reenvía el aviso guardado al propio whatsapp-webhook con el
 * service role key. Así el mensaje recorre exactamente el mismo camino ya probado
 * en producción, sin duplicar la lógica de procesamiento en dos sitios.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireInternal } from "../_shared/internal-auth.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

/**
 * Espera antes de CADA reintento, en minutos. El primero (2 min) lo pone el valor
 * por defecto de `next_attempt_at` al reclamar el mensaje; esta lista cubre del
 * segundo en adelante.
 *
 * Están escalonados a propósito. Con reintentos cada minuto, un mensaje agotaba
 * sus intentos en ~7 minutos: suficiente para un tropiezo, inútil para una avería
 * de verdad. El incidente del 16/08 duró 21 horas — con la cadencia anterior esos
 * mensajes se habrían perdido igual pese a estar guardados en la bandeja.
 *
 * Repartidos así, la bandeja aguanta unas 46 horas de avería y los mensajes
 * entran solos en cuanto se arregla la causa. De paso no se machaca cada minuto
 * un sistema que ya está caído.
 */
const BACKOFF_MIN = [5, 15, 60, 180, 360, 720, 1440];

/** Tras estos intentos el mensaje se da por perdido y se avisa al administrador. */
const MAX_ATTEMPTS = BACKOFF_MIN.length + 1; // 8

/**
 * Cuándo toca el siguiente intento después del que acaba de hacerse.
 *
 * Tras el último intento devuelve "ya", no una espera más: así la pasada
 * siguiente lo descarta y el aviso de mensaje perdido sale enseguida. Con la
 * espera del último escalón, la alerta habría tardado 24 horas de más en salir.
 */
function proximoIntento(intentosHechos: number): string {
  const min = BACKOFF_MIN[intentosHechos - 1];
  if (min === undefined) return new Date().toISOString();
  return new Date(Date.now() + min * 60_000).toISOString();
}

/** Tope por pasada. El cron corre cada minuto, así que da de sobra. */
const BATCH = 20;

type InboxRow = {
  wa_message_id: string;
  tenant_user_id: string | null;
  contact_name: string | null;
  payload: Record<string, unknown>;
  attempts: number;
};

/** Descarta el mensaje y deja constancia para que wa-health-check avise. */
async function descartar(row: InboxRow, motivo: string): Promise<void> {
  await supabase.from("crm_wa_inbox")
    .update({
      status: "failed",
      processed_at: new Date().toISOString(),
      last_error: motivo.slice(0, 500),
    })
    .eq("wa_message_id", row.wa_message_id)
    .eq("status", "pending");

  await supabase.from("crm_wa_health_events").insert({
    kind: "inbox_discarded",
    tenant_user_id: row.tenant_user_id,
    detail: `${row.wa_message_id}: ${motivo}`.slice(0, 300),
  }).then(() => {}, () => {});

  console.error(`[wa-inbox-retry] descartado ${row.wa_message_id}: ${motivo}`);
}

/**
 * Reconstruye el sobre que Meta manda alrededor del mensaje. Solo se rellenan los
 * campos que el webhook lee: el phone_number_id (con el que resuelve el tenant) y
 * el nombre del contacto.
 */
function reconstruirPayload(row: InboxRow, phoneNumberId: string) {
  const msg = row.payload as { from?: string };
  return {
    object: "whatsapp_business_account",
    entry: [{
      changes: [{
        field: "messages",
        value: {
          messaging_product: "whatsapp",
          metadata: { phone_number_id: phoneNumberId },
          contacts: row.contact_name && msg.from
            ? [{ wa_id: msg.from, profile: { name: row.contact_name } }]
            : [],
          messages: [row.payload],
        },
      }],
    }],
  };
}

Deno.serve(async (req: Request) => {
  const unauthorized = requireInternal(req);
  if (unauthorized) return unauthorized;

  try {
    // A quién le toca ahora. El margen antes del primer intento ya está incluido
    // en next_attempt_at (lo pone el valor por defecto al reclamar el mensaje).
    const { data: pendientes, error } = await supabase
      .from("crm_wa_inbox")
      .select("wa_message_id, tenant_user_id, contact_name, payload, attempts")
      .eq("status", "pending")
      .lte("next_attempt_at", new Date().toISOString())
      .order("next_attempt_at", { ascending: true })
      .limit(BATCH);

    if (error) throw error;
    if (!pendientes?.length) {
      return new Response(JSON.stringify({ ok: true, pendientes: 0 }), { status: 200 });
    }

    // phone_number_id de cada tenant: es lo que el webhook usa para resolver la
    // configuración al recibir el aviso.
    const { data: configs } = await supabase
      .from("crm_ai_agent_config")
      .select("user_id, phone_number_id");
    const phoneIdPorTenant = new Map<string, string>();
    for (const c of configs ?? []) {
      if (c.phone_number_id) phoneIdPorTenant.set(c.user_id, c.phone_number_id);
    }

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const webhookUrl = `${Deno.env.get("SUPABASE_URL")!}/functions/v1/whatsapp-webhook`;

    let reintentados = 0, recuperados = 0, descartados = 0;

    for (const row of (pendientes as InboxRow[])) {
      if (row.attempts >= MAX_ATTEMPTS) {
        await descartar(row, `agotados los ${MAX_ATTEMPTS} intentos a lo largo de ~46 horas`);
        descartados++;
        continue;
      }
      if (!row.tenant_user_id) {
        await descartar(row, "sin tenant asociado");
        descartados++;
        continue;
      }
      const phoneNumberId = phoneIdPorTenant.get(row.tenant_user_id);
      if (!phoneNumberId) {
        await descartar(row, "el tenant ya no tiene número de WhatsApp configurado");
        descartados++;
        continue;
      }
      if (!row.payload || typeof row.payload !== "object" || !("id" in row.payload)) {
        await descartar(row, "el aviso guardado no tiene contenido reprocesable");
        descartados++;
        continue;
      }

      // El intento se cuenta ANTES de lanzarlo, y con él se fija ya cuándo tocaría
      // el siguiente. Si el webhook ni siquiera llega a arrancar, el contador sube
      // igual y el mensaje no se queda dando vueltas para siempre ni se reintenta
      // en bucle cada minuto.
      const intentosHechos = row.attempts + 1;
      await supabase.from("crm_wa_inbox")
        .update({
          attempts: intentosHechos,
          last_attempt_at: new Date().toISOString(),
          next_attempt_at: proximoIntento(intentosHechos),
        })
        .eq("wa_message_id", row.wa_message_id);
      reintentados++;

      try {
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceKey}`,
            "apikey": serviceKey,
          },
          body: JSON.stringify(reconstruirPayload(row, phoneNumberId)),
        });
        if (!res.ok) {
          console.error(`[wa-inbox-retry] webhook devolvió ${res.status} para ${row.wa_message_id}`);
          continue;
        }
        // El webhook espera a terminar cuando el llamador es interno, así que a
        // estas alturas la fila ya refleja el resultado.
        const { data: after } = await supabase
          .from("crm_wa_inbox").select("status").eq("wa_message_id", row.wa_message_id).maybeSingle();
        if (after?.status === "done") {
          recuperados++;
          console.log(`[wa-inbox-retry] recuperado ${row.wa_message_id}`);
        }
      } catch (e) {
        console.error(`[wa-inbox-retry] error reenviando ${row.wa_message_id}:`, e);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, pendientes: pendientes.length, reintentados, recuperados, descartados }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[wa-inbox-retry] fatal:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
