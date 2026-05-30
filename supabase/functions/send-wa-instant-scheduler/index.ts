/**
 * send-wa-instant-scheduler
 * Invocado cada minuto por pg_cron. Procesa campañas programadas:
 *   Modo A (timezone_mode='user'):   scheduled_at <= now() → envío completo.
 *   Modo B (timezone_mode='contact'): envío por lote según zona horaria del contacto.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const GRAPH = "https://graph.facebook.com/v21.0";
const SEND_DELAY_MS = 120;

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── Phone → timezone helpers ───────────────────────────────────────────────────

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
  const d = phone.replace(/\D/g, "");
  for (const len of [3, 2, 1]) {
    const p = d.slice(0, len);
    if (PHONE_TIMEZONE[p]) return p;
  }
  return "unknown";
}

function getTimezoneFromPhone(phone: string): string {
  return PHONE_TIMEZONE[getPhonePrefix(phone)] ?? "UTC";
}

// Returns true when now >= targetTime on targetDate in the given timezone
function isTimeReachedInTz(targetDate: string, targetTime: string, timezone: string): boolean {
  const now = new Date();
  const localDate = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, dateStyle: "short" }).format(now);
  const localTime = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone, hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(now).replace(/^24/, "00");
  if (localDate < targetDate) return false;
  if (localDate > targetDate) return true;
  return localTime >= targetTime;
}

// True when the last timezone on Earth (UTC-12) has also reached targetTime on targetDate
function allTimezonesReached(targetDate: string, targetTime: string): boolean {
  const targetUtcMs = new Date(`${targetDate}T${targetTime}:00Z`).getTime();
  return Date.now() >= targetUtcMs + 12 * 3600 * 1000;
}

// ── Core send logic ────────────────────────────────────────────────────────────

type ConvRow = { id: string; phone: string; contact_name: string | null };
type MediaType = "image" | "video" | "audio";

function buildMessageBody(phone: string, messageText: string, mediaType: MediaType | null, mediaUrl: string | null): object {
  const to = phone.replace(/\D/g, "");
  if (mediaType && mediaUrl) {
    if (mediaType === "audio") {
      return { messaging_product: "whatsapp", recipient_type: "individual", to, type: "audio", audio: { link: mediaUrl } };
    }
    const caption = messageText?.trim() || undefined;
    return {
      messaging_product: "whatsapp", recipient_type: "individual", to,
      type: mediaType, [mediaType]: { link: mediaUrl, ...(caption ? { caption } : {}) },
    };
  }
  return { messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { body: messageText, preview_url: false } };
}

async function sendBatch(
  campaignId: string,
  convs: ConvRow[],
  messageText: string,
  phoneNumberId: string,
  accessToken: string,
  mediaType: MediaType | null = null,
  mediaUrl: string | null = null,
): Promise<{ sent: number; failed: number }> {
  let sent = 0, failed = 0;
  const logs: any[] = [];

  for (const conv of convs) {
    try {
      const phone = conv.phone.replace(/\D/g, "");
      const body = buildMessageBody(phone, messageText, mediaType, mediaUrl);
      const res = await fetch(`${GRAPH}/${phoneNumberId}/messages`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        sent++;
        logs.push({ campaign_id: campaignId, conversation_id: conv.id, phone, contact_name: conv.contact_name, status: "sent", error_message: null });
      } else {
        const err = await res.text();
        failed++;
        logs.push({ campaign_id: campaignId, conversation_id: conv.id, phone, contact_name: conv.contact_name, status: "failed", error_message: err.slice(0, 300) });
      }
    } catch (e) {
      failed++;
      logs.push({ campaign_id: campaignId, conversation_id: conv.id, phone: conv.phone, contact_name: conv.contact_name, status: "failed", error_message: String(e).slice(0, 300) });
    }
    await sleep(SEND_DELAY_MS);
  }

  if (logs.length > 0) await supabase.from("crm_wa_instant_campaign_logs").insert(logs);
  return { sent, failed };
}

// ── Build eligible conversations for a campaign ────────────────────────────────

async function getEligibleConvs(campaign: any): Promise<ConvRow[]> {
  const cutoff = new Date(Date.now() - campaign.window_hours * 3600 * 1000).toISOString();

  let query = supabase
    .from("crm_wa_conversations")
    .select("id, phone, contact_name")
    .eq("user_id", campaign.user_id)
    .gt("last_message_at", cutoff);

  if (campaign.label_ids?.length > 0) {
    const { data: labelRows } = await supabase
      .from("crm_wa_conversation_labels")
      .select("conversation_id")
      .in("label_id", campaign.label_ids);
    const ids = [...new Set((labelRows ?? []).map((r: any) => r.conversation_id))];
    if (ids.length === 0) return [];
    query = query.in("id", ids);
  }

  const { data } = await query;
  let convs: ConvRow[] = data ?? [];

  if (campaign.country_codes?.length > 0) {
    convs = convs.filter(c => campaign.country_codes.includes(getPhonePrefix(c.phone)));
  }

  return convs;
}

// ── Process Mode A (user timezone) ────────────────────────────────────────────

async function processModeA(campaign: any, agentConfig: any) {
  await supabase.from("crm_wa_instant_campaigns").update({ status: "processing" }).eq("id", campaign.id);

  const convs = await getEligibleConvs(campaign);

  await supabase.from("crm_wa_instant_campaigns").update({ total_contacts: convs.length }).eq("id", campaign.id);

  const { sent, failed } = await sendBatch(
    campaign.id, convs, campaign.message_text ?? "",
    agentConfig.phone_number_id, agentConfig.access_token,
    campaign.media_type ?? null, campaign.media_url ?? null,
  );

  await supabase.from("crm_wa_instant_campaigns").update({
    status: "completed", sent_count: sent, failed_count: failed,
  }).eq("id", campaign.id);

  console.log(`[scheduler] ModeA ${campaign.id}: ${sent} sent, ${failed} failed`);
}

// ── Process Mode B (per-contact timezone) ─────────────────────────────────────

async function processModeB(campaign: any, agentConfig: any) {
  const { target_date, target_local_time } = campaign;
  if (!target_date || !target_local_time) return;

  // Activate if still in 'scheduled'
  if (campaign.status === "scheduled") {
    await supabase.from("crm_wa_instant_campaigns").update({ status: "processing" }).eq("id", campaign.id);
  }

  // Get eligible conversations
  const allConvs = await getEligibleConvs(campaign);

  // Get already-sent conversation IDs for this campaign
  const { data: sentLogs } = await supabase
    .from("crm_wa_instant_campaign_logs")
    .select("conversation_id")
    .eq("campaign_id", campaign.id);

  const sentIds = new Set((sentLogs ?? []).map((r: any) => r.conversation_id));
  const pending = allConvs.filter(c => !sentIds.has(c.id));

  // Group pending by timezone and filter those whose local time has arrived
  const readyToSend: ConvRow[] = [];
  for (const conv of pending) {
    const tz = getTimezoneFromPhone(conv.phone);
    if (isTimeReachedInTz(target_date, target_local_time, tz)) {
      readyToSend.push(conv);
    }
  }

  if (readyToSend.length > 0) {
    const { sent, failed } = await sendBatch(
      campaign.id, readyToSend, campaign.message_text ?? "",
      agentConfig.phone_number_id, agentConfig.access_token,
      campaign.media_type ?? null, campaign.media_url ?? null,
    );
    // Atomic increment — avoids race conditions when scheduler overlaps across minutes
    await supabase.rpc("increment_instant_campaign_counts", {
      p_campaign_id: campaign.id,
      p_sent:        sent,
      p_failed:      failed,
      p_total:       allConvs.length,
    });

    console.log(`[scheduler] ModeB ${campaign.id}: batch ${sent}/${readyToSend.length}`);
  } else if (allConvs.length > 0) {
    // Keep total_contacts up to date even when no batch fired this tick
    await supabase.from("crm_wa_instant_campaigns")
      .update({ total_contacts: allConvs.length })
      .eq("id", campaign.id);
  }

  // Mark complete when all timezones have passed AND no contacts remain unsent.
  // Note: contacts that exit the 24h window before their timezone fires are intentionally
  // excluded — the window is re-evaluated at actual send time, not at schedule creation.
  const remaining = pending.length - readyToSend.length;
  if (allTimezonesReached(target_date, target_local_time) && remaining === 0) {
    await supabase.from("crm_wa_instant_campaigns").update({ status: "completed" }).eq("id", campaign.id);
    console.log(`[scheduler] ModeB ${campaign.id}: completed`);
  }
}

// ── Main handler ───────────────────────────────────────────────────────────────

Deno.serve(async (_req: Request) => {
  try {
    const now = new Date().toISOString();

    // ── Mode A: user timezone, fire when scheduled_at <= now ──────────────────
    const { data: modeACampaigns } = await supabase
      .from("crm_wa_instant_campaigns")
      .select("*")
      .eq("status", "scheduled")
      .eq("timezone_mode", "user")
      .lte("scheduled_at", now);

    // ── Mode B: contact timezone, fire per timezone group ─────────────────────
    const { data: modeBCampaigns } = await supabase
      .from("crm_wa_instant_campaigns")
      .select("*")
      .in("status", ["scheduled", "processing"])
      .eq("timezone_mode", "contact");

    const all = [...(modeACampaigns ?? []), ...(modeBCampaigns ?? [])];
    if (all.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), { status: 200 });
    }

    // Collect unique user_ids to fetch agent configs
    const userIds = [...new Set(all.map((c: any) => c.user_id))];
    const { data: agentConfigs } = await supabase
      .from("crm_ai_agent_config")
      .select("user_id, phone_number_id, access_token")
      .in("user_id", userIds);

    const configByUser = Object.fromEntries(
      (agentConfigs ?? []).map((c: any) => [c.user_id, c]),
    );

    let processed = 0;
    for (const campaign of all) {
      const agentConfig = configByUser[campaign.user_id];
      if (!agentConfig?.phone_number_id || !agentConfig?.access_token) continue;

      try {
        if (campaign.timezone_mode === "user") {
          await processModeA(campaign, agentConfig);
        } else {
          await processModeB(campaign, agentConfig);
        }
        processed++;
      } catch (err) {
        console.error(`[scheduler] campaign ${campaign.id} error:`, err);
        await supabase.from("crm_wa_instant_campaigns")
          .update({ status: "failed" }).eq("id", campaign.id);
      }
    }

    return new Response(JSON.stringify({ ok: true, processed }), { status: 200 });
  } catch (err) {
    console.error("[scheduler] fatal:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
