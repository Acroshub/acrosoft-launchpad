/**
 * send-wa-instant-scheduler
 * Invocado cada minuto por pg_cron. Es solo un despachador: no envía nada por sí
 * mismo, llama a send-wa-campaign / send-wa-instant, que son quienes saben
 * enviar. Dos trabajos:
 *
 *   1. Arrancar lo programado que ya venció (plantilla y mensaje libre).
 *   2. RETOMAR lo que quedó a medias: un envío grande no cabe en una invocación
 *      (Supabase corta a los 150s), así que se procesa por lotes dejando el
 *      resto en 'pending' y esta pasada vuelve a llamar hasta vaciarlos.
 *
 * El modo "hora local de cada contacto" también cae aquí: los pendientes que
 * todavía no alcanzaron su hora simplemente no salen en esa tanda, y la campaña
 * sigue en 'processing' hasta que pase la última zona horaria.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireInternal } from "../_shared/internal-auth.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req: Request) => {
  // Solo invocación interna (pg_cron cada minuto) — dispara campañas de WhatsApp
  const unauthorized = requireInternal(req);
  if (unauthorized) return unauthorized;

  try {
    const now = new Date().toISOString();

    // ── Envíos programados y a medias ─────────────────────────────────────────
    // Dos trabajos en uno:
    //   · 'scheduled' con la hora ya cumplida → arrancar
    //   · 'processing'                        → retomar el lote siguiente
    //
    // Lo segundo es lo que quita el techo de ~330 destinatarios. Y también cubre
    // el modo por hora local: esas campañas se quedan en 'processing' mientras
    // van saliendo las tandas de cada país.
    const invoke = async (fn: string, campaignId: string) => {
      const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/${fn}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ campaign_id: campaignId }),
      });
      return await res.json().catch(() => ({}));
    };

    const [{ data: tplDue }, { data: tplRunning }, { data: freeDue }, { data: freeRunning }] = await Promise.all([
      supabase.from("crm_wa_campaigns").select("id").eq("status", "scheduled").lte("scheduled_at", now),
      supabase.from("crm_wa_campaigns").select("id").eq("status", "processing"),
      supabase.from("crm_wa_instant_campaigns").select("id")
        .eq("status", "scheduled").lte("scheduled_at", now),
      supabase.from("crm_wa_instant_campaigns").select("id")
        .eq("status", "processing"),
    ]);

    let tplProcessed = 0;

    // Una campaña puede terminar entre el SELECT de arriba y la llamada: ahí la
    // función responde 'already_processed', que NO es un fallo. Marcarla como
    // fallida pisaba una campaña recién completada con éxito.
    const isBenign = (js: any) => js?.error === "already_processed";

    const dispatch = async (fn: string, table: string, ids: { id: string }[]) => {
      for (const c of ids) {
        try {
          const js = await invoke(fn, c.id);
          if (js?.ok) tplProcessed++;
          else if (isBenign(js)) {
            console.log(`[scheduler] ${fn} ${c.id}: ya procesada, se ignora`);
          } else {
            console.error(`[scheduler] ${fn} ${c.id}:`, JSON.stringify(js));
            await supabase.from(table).update({ status: "failed" }).eq("id", c.id);
          }
        } catch (err) {
          console.error(`[scheduler] ${fn} ${c.id} lanzó:`, err);
          await supabase.from(table).update({ status: "failed" }).eq("id", c.id);
        }
      }
    };

    await dispatch("send-wa-campaign", "crm_wa_campaigns", [...(tplDue ?? []), ...(tplRunning ?? [])]);
    await dispatch("send-wa-instant", "crm_wa_instant_campaigns", [...(freeDue ?? []), ...(freeRunning ?? [])]);

    return new Response(JSON.stringify({ ok: true, processed: tplProcessed }), { status: 200 });
  } catch (err) {
    console.error("[scheduler] fatal:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
