import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildAudience } from "../_shared/wa-audience.ts";
import { requireInternalOrUser } from "../_shared/internal-auth.ts";
import { filterByLocalTime, allTimezonesReached } from "../_shared/wa-timezone.ts";
import { normalizeUrl } from "../_shared/wa-url.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const GRAPH = "https://graph.facebook.com/v21.0";
const SEND_DELAY_MS = 120; // ~8 msg/seg — bajo el límite de Meta

// Supabase corta la petición a los 150s. A ~450ms por destinatario eso son unos
// 330: se procesa por lotes y el cron retoma lo que quede.
const BUDGET_MS    = 100_000;
const BATCH_SIZE   = 400;
const INSERT_CHUNK = 500;
// Respiro entre partes del mismo mensaje, para que lleguen en orden al teléfono.
const PART_DELAY_MS = 400;

// El cron reinvoca cada minuto, pero un lote puede durar BUDGET_MS. Sin cerrojo,
// dos invocaciones leían los mismos logs 'pending' y el contacto recibía el
// mensaje dos veces. Caduca solo: si una invocación muere, la siguiente entra.
const LOCK_MS = 5 * 60_000;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}


function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Country/Timezone helpers ───────────────────────────────────────────────────

const PHONE_TIMEZONE: Record<string, string> = {
  "1":   "America/New_York",
  "52":  "America/Mexico_City",
  "34":  "Europe/Madrid",
  "57":  "America/Bogota",
  "54":  "America/Argentina/Buenos_Aires",
  "55":  "America/Sao_Paulo",
  "56":  "America/Santiago",
  "51":  "America/Lima",
  "58":  "America/Caracas",
  "591": "America/La_Paz",
  "593": "America/Guayaquil",
  "595": "America/Asuncion",
  "598": "America/Montevideo",
  "53":  "America/Havana",
  "502": "America/Guatemala",
  "503": "America/El_Salvador",
  "504": "America/Tegucigalpa",
  "505": "America/Managua",
  "506": "America/Costa_Rica",
  "507": "America/Panama",
  "44":  "Europe/London",
  "33":  "Europe/Paris",
  "49":  "Europe/Berlin",
  "39":  "Europe/Rome",
  "351": "Europe/Lisbon",
  "31":  "Europe/Amsterdam",
  "61":  "Australia/Sydney",
  "64":  "Pacific/Auckland",
  "81":  "Asia/Tokyo",
  "82":  "Asia/Seoul",
  "86":  "Asia/Shanghai",
  "91":  "Asia/Kolkata",
  "971": "Asia/Dubai",
  "972": "Asia/Jerusalem",
  "966": "Asia/Riyadh",
  "20":  "Africa/Cairo",
  "27":  "Africa/Johannesburg",
  "234": "Africa/Lagos",
};

function getPhonePrefix(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  for (const len of [3, 2, 1]) {
    const prefix = digits.slice(0, len);
    if (PHONE_TIMEZONE[prefix]) return prefix;
  }
  return "unknown";
}

function getTimezoneFromPhone(phone: string): string {
  return PHONE_TIMEZONE[getPhonePrefix(phone)] ?? "UTC";
}

// ── Core send logic (reusable by scheduler) ────────────────────────────────────


// ── Partes del mensaje ────────────────────────────────────────────────────────
// Un envío libre es una lista de partes que salen en orden. Los envíos viejos
// (un texto + un adjunto) se convierten a esa forma para tener un solo camino.

type Part = {
  id?: string;
  type: "text" | "image" | "video" | "audio" | "file" | "link";
  text?: string;
  url?: string;
  name?: string;
  link_url?: string;
  link_label?: string;
};

function campaignParts(campaign: any): Part[] {
  const parts: Part[] = Array.isArray(campaign.parts) ? campaign.parts : [];
  if (parts.length) return parts;

  // Legado: media con pie de foto era UNA sola parte, no dos.
  const text = (campaign.message_text ?? "").trim();
  if (campaign.media_type && campaign.media_url) {
    return [{ type: campaign.media_type, url: campaign.media_url, text: text || undefined }];
  }
  return text ? [{ type: "text", text }] : [];
}

function partPayload(part: Part, to: string): object | null {
  switch (part.type) {
    case "text": {
      const body = (part.text ?? "").trim();
      if (!body) return null;
      return { messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { body, preview_url: false } };
    }
    case "link": {
      const raw  = (part.link_url ?? "").trim();
      const url  = normalizeUrl(raw);
      const body = (part.text ?? "").trim();
      if (!url) {
        // No se pudo convertir en URL absoluta: mejor mandar el texto con el
        // enlace en crudo que un botón que no abre nada.
        const fallback = [body, raw].filter(Boolean).join("\n");
        if (!fallback) return null;
        return { messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { body: fallback, preview_url: true } };
      }
      return {
        messaging_product: "whatsapp", recipient_type: "individual", to,
        type: "interactive",
        interactive: {
          type: "cta_url",
          body: { text: body || url },
          action: { name: "cta_url", parameters: { display_text: (part.link_label ?? "Ver más").slice(0, 20), url } },
        },
      };
    }
    default: {
      const link = (part.url ?? "").trim();
      if (!link) return null;
      const waType = part.type === "file" ? "document" : part.type;
      const media: Record<string, unknown> = { link };
      // El audio de WhatsApp no admite pie de foto.
      const caption = (part.text ?? "").trim();
      if (caption && part.type !== "audio") media.caption = caption;
      if (part.type === "file" && part.name) media.filename = part.name;
      return { messaging_product: "whatsapp", recipient_type: "individual", to, type: waType, [waType]: media };
    }
  }
}

/**
 * Deja el envío en el chat de la conversación, igual que cualquier otro mensaje.
 * Sin esto, el contacto recibía un envío masivo que en el CRM no aparecía por
 * ningún lado: el operador veía la respuesta sin saber a qué contestaba.
 */
function logPartToChat(conversationId: string, part: Part) {
  const caption = (part.text ?? "").trim();
  const row: Record<string, unknown> = {
    conversation_id: conversationId,
    role: "assistant",
    delivery_status: "sent",
    origin: "campaign",
  };

  if (part.type === "text") {
    row.content = caption;
  } else if (part.type === "link") {
    const url = normalizeUrl(part.link_url) ?? (part.link_url ?? "").trim();
    row.content = caption ? `${caption} → ${url}` : url;
  } else {
    row.content = caption || `[${part.type}]`;
    row.media_type = part.type;
    row.media_url = (part.url ?? "").trim() || null;
  }

  return supabase.from("crm_wa_messages").insert(row);
}

async function sendBatch(
  campaignId: string,
  parts: Part[],
  phoneNumberId: string,
  accessToken: string,
  startedAt: number,
  campaign: any,
): Promise<{ sent: number; failed: number }> {
  const { data: pendingAll } = await supabase
    .from("crm_wa_instant_campaign_logs")
    .select("id, phone, contact_name, conversation_id")
    .eq("campaign_id", campaignId)
    .eq("status", "pending")
    // Sin ORDER BY, "los primeros 400" no es un conjunto estable entre lotes.
    .order("id", { ascending: true })
    .limit(BATCH_SIZE);

  // Modo "hora local de cada contacto": solo salen los que ya alcanzaron su hora.
  const pending = filterByLocalTime(
    pendingAll ?? [],
    campaign.timezone_mode,
    campaign.target_date,
    campaign.target_local_time,
  );

  let sent = 0;
  let failed = 0;

  for (const row of pending) {
    // Se corta ANTES de agotar el presupuesto para poder cerrar limpio; lo que
    // quede sigue en 'pending' y lo retoma el cron.
    if (Date.now() - startedAt > BUDGET_MS) break;

    const phone = (row.phone ?? "").replace(/\D/g, "");
    try {
      // Las partes salen en orden. Si una falla, el destinatario se marca
      // fallido y no se sigue con el resto: mandar la mitad de un mensaje
      // confunde más que no mandar nada.
      let firstError: string | null = null;
      for (const part of parts) {
        const body = partPayload(part, phone);
        if (!body) continue;
        const res = await fetch(`${GRAPH}/${phoneNumberId}/messages`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) { firstError = await res.text(); break; }
        // Solo lo entregado se registra: un envío que rebotó en Meta no debe
        // aparecer en el chat como si el contacto lo hubiera recibido.
        if (row.conversation_id) await logPartToChat(row.conversation_id, part);
        if (parts.length > 1) await sleep(PART_DELAY_MS);
      }

      if (!firstError) {
        await supabase.from("crm_wa_instant_campaign_logs")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", row.id);
        sent++;
      } else {
        await supabase.from("crm_wa_instant_campaign_logs")
          .update({ status: "failed", error_message: firstError.slice(0, 300), sent_at: new Date().toISOString() })
          .eq("id", row.id);
        failed++;
      }
    } catch (err) {
      await supabase.from("crm_wa_instant_campaign_logs")
        .update({ status: "failed", error_message: String(err).slice(0, 300), sent_at: new Date().toISOString() })
        .eq("id", row.id);
      failed++;
    }
    await sleep(SEND_DELAY_MS);
  }

  return { sent, failed };
}

// ── Main handler ───────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const startedAt = Date.now();

  const { caller, error: authError } = await requireInternalOrUser(req, supabase);
  if (authError) return authError;

  const { campaign_id } = await req.json();
  if (!campaign_id) return json({ error: "campaign_id required" }, 400);

  // ── Fetch campaign ─────────────────────────────────────────────────────────
  const { data: campaign, error: campErr } = await supabase
    .from("crm_wa_instant_campaigns")
    .select("*")
    .eq("id", campaign_id)
    .single();

  if (campErr || !campaign) return json({ error: "campaign_not_found" }, 404);
  if (caller!.kind === "user" && campaign.user_id !== caller!.userId) {
    return json({ error: "campaign_not_found" }, 404);
  }

  // Desde la UI solo se lanzan borradores. El cron además dispara las programadas
  // y retoma las que quedaron a medias.
  const launchable = caller!.kind === "internal"
    ? ["draft", "scheduled", "processing"]
    : ["draft"];
  if (!launchable.includes(campaign.status)) return json({ error: "already_processed" }, 400);

  const ownerId: string = campaign.user_id;

  // ── Cerrojo ────────────────────────────────────────────────────────────────
  // Se toma ANTES de preparar o enviar nada. La condición va en el propio UPDATE,
  // así que si dos invocaciones llegan a la vez solo una se lleva la fila: la
  // otra ve 0 resultados y se retira sin enviar.
  const { data: locked } = await supabase
    .from("crm_wa_instant_campaigns")
    .update({ locked_until: new Date(Date.now() + LOCK_MS).toISOString() })
    .eq("id", campaign_id)
    .or(`locked_until.is.null,locked_until.lt.${new Date().toISOString()}`)
    .select("id");

  if (!locked?.length) {
    return json({ ok: true, busy: true, message: "otra invocación ya está enviando este envío" });
  }

  try {
    return await run();
  } finally {
    await supabase.from("crm_wa_instant_campaigns")
      .update({ locked_until: null }).eq("id", campaign_id);
  }

  async function run(): Promise<Response> {

  // ── Fetch agent config ─────────────────────────────────────────────────────
  const { data: agentConfig } = await supabase
    .from("crm_ai_agent_config")
    .select("phone_number_id, access_token, is_active")
    .eq("user_id", ownerId)
    .maybeSingle();

  if (!agentConfig?.phone_number_id || !agentConfig?.access_token) {
    return json({ error: "waba_not_configured" }, 400);
  }

  // ── Preparar (solo en la primera invocación) ───────────────────────────────
  // La audiencia se congela aquí en forma de logs 'pending'. Ojo: la ventana de
  // 24h se evalúa en este momento, no en cada lote — si se reevaluara, alguien
  // podría salirse de la ventana a mitad del envío y quedar a medias sin razón.
  if (campaign.status === "draft" || campaign.status === "scheduled") {
    const windowHours = Math.min(campaign.window_hours ?? 24, 24);
    const members = await buildAudience(
      supabase,
      ownerId,
      campaign.audience_type ?? "all",
      campaign.audience_filters ?? [],
      { withinHours: windowHours, match: campaign.audience_match ?? "any" },
    );

    // Un mensaje libre exige conversación abierta; sin ella no hay a qué responder.
    const rows = members
      .filter(m => m.conversationId)
      .map(m => ({
        campaign_id:     campaign_id,
        conversation_id: m.conversationId,
        phone:           m.phone,
        contact_name:    m.name,
        status:          "pending",
        error_message:   null,
      }));

    if (!rows.length) {
      await supabase.from("crm_wa_instant_campaigns").update({
        status: "completed", total_contacts: 0, sent_count: 0, failed_count: 0,
      }).eq("id", campaign_id);
      return json({ ok: true, done: true, sent: 0, failed: 0, total: 0 });
    }

    for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
      const { error } = await supabase
        .from("crm_wa_instant_campaign_logs")
        .insert(rows.slice(i, i + INSERT_CHUNK));
      if (error) return json({ error: "log_insert_failed", detail: error.message }, 500);
    }

    await supabase.from("crm_wa_instant_campaigns").update({
      status: "processing",
      total_contacts: rows.length,
    }).eq("id", campaign_id);
  }

  // ── Procesar un lote ───────────────────────────────────────────────────────
  const batch = await sendBatch(
    campaign_id,
    campaignParts(campaign),
    agentConfig.phone_number_id,
    agentConfig.access_token,
    startedAt,
    campaign,
  );

  // ── ¿Queda trabajo? ────────────────────────────────────────────────────────
  const [{ count: remaining }, { count: totalSent }, { count: totalFailed }] = await Promise.all([
    supabase.from("crm_wa_instant_campaign_logs").select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign_id).eq("status", "pending"),
    supabase.from("crm_wa_instant_campaign_logs").select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign_id).eq("status", "sent"),
    supabase.from("crm_wa_instant_campaign_logs").select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign_id).eq("status", "failed"),
  ]);

  // Con hora local, quedar pendientes es lo esperado hasta que dé la hora en el
  // último país: no se cierra la campaña hasta entonces.
  const waitingForTimezones =
    campaign.timezone_mode === "contact" &&
    campaign.target_date && campaign.target_local_time &&
    !allTimezonesReached(campaign.target_date, campaign.target_local_time);

  const done = (remaining ?? 0) === 0 && !waitingForTimezones;

  await supabase.from("crm_wa_instant_campaigns").update({
    status:       done ? ((totalSent ?? 0) === 0 ? "failed" : "completed") : "processing",
    sent_count:   totalSent   ?? 0,
    failed_count: totalFailed ?? 0,
  }).eq("id", campaign_id);

  return json({
    ok: true,
    done,
    sent:      totalSent   ?? 0,
    failed:    totalFailed ?? 0,
    total:     (totalSent ?? 0) + (totalFailed ?? 0) + (remaining ?? 0),
    remaining: remaining ?? 0,
    batch,
  });

  } // fin de run()
});
