import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const GRAPH = "https://graph.facebook.com/v21.0";
const SEND_DELAY_MS = 120; // ~8 msg/seg — bajo el límite de Meta

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

async function getAuthUser(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth) return null;
  const { data: { user }, error } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
  if (error || !user) return null;
  return user;
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

type ConvRow = { id: string; phone: string; contact_name: string | null };
type MediaType = "image" | "video" | "audio";

function buildMessageBody(
  phone: string,
  messageText: string,
  mediaType: MediaType | null,
  mediaUrl: string | null,
): object {
  const to = phone.replace(/\D/g, "");
  if (mediaType && mediaUrl) {
    if (mediaType === "audio") {
      return {
        messaging_product: "whatsapp", recipient_type: "individual", to,
        type: "audio", audio: { link: mediaUrl },
      };
    }
    const caption = messageText?.trim() || undefined;
    if (mediaType === "image") {
      return {
        messaging_product: "whatsapp", recipient_type: "individual", to,
        type: "image", image: { link: mediaUrl, ...(caption ? { caption } : {}) },
      };
    }
    if (mediaType === "video") {
      return {
        messaging_product: "whatsapp", recipient_type: "individual", to,
        type: "video", video: { link: mediaUrl, ...(caption ? { caption } : {}) },
      };
    }
  }
  return {
    messaging_product: "whatsapp", recipient_type: "individual", to,
    type: "text", text: { body: messageText, preview_url: false },
  };
}

async function sendMessages(
  campaignId: string,
  convs: ConvRow[],
  messageText: string,
  phoneNumberId: string,
  accessToken: string,
  mediaType: MediaType | null = null,
  mediaUrl: string | null = null,
): Promise<{ sent: number; failed: number }> {
  let sentCount = 0;
  let failedCount = 0;
  const logs: Array<{
    campaign_id: string; conversation_id: string; phone: string;
    contact_name: string | null; status: string; error_message: string | null;
  }> = [];

  for (const conv of convs) {
    try {
      const phone = conv.phone.replace(/\D/g, "");
      const body = buildMessageBody(phone, messageText, mediaType, mediaUrl);
      const res = await fetch(`${GRAPH}/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        sentCount++;
        logs.push({ campaign_id: campaignId, conversation_id: conv.id, phone, contact_name: conv.contact_name, status: "sent", error_message: null });
      } else {
        const errBody = await res.text();
        failedCount++;
        logs.push({ campaign_id: campaignId, conversation_id: conv.id, phone, contact_name: conv.contact_name, status: "failed", error_message: errBody.slice(0, 300) });
      }
    } catch (err) {
      failedCount++;
      logs.push({ campaign_id: campaignId, conversation_id: conv.id, phone: conv.phone, contact_name: conv.contact_name, status: "failed", error_message: String(err).slice(0, 300) });
    }
    await sleep(SEND_DELAY_MS);
  }

  if (logs.length > 0) {
    await supabase.from("crm_wa_instant_campaign_logs").insert(logs);
  }

  return { sent: sentCount, failed: failedCount };
}

// ── Main handler ───────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const user = await getAuthUser(req);
  if (!user) return json({ error: "unauthorized" }, 401);

  const { campaign_id } = await req.json();
  if (!campaign_id) return json({ error: "campaign_id required" }, 400);

  // ── Fetch campaign ─────────────────────────────────────────────────────────
  const { data: campaign, error: campErr } = await supabase
    .from("crm_wa_instant_campaigns")
    .select("*")
    .eq("id", campaign_id)
    .eq("user_id", user.id)
    .single();

  if (campErr || !campaign) return json({ error: "campaign_not_found" }, 404);
  if (campaign.status !== "draft") return json({ error: "already_processed" }, 400);

  // ── Fetch agent config ─────────────────────────────────────────────────────
  const { data: agentConfig } = await supabase
    .from("crm_ai_agent_config")
    .select("phone_number_id, access_token, is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!agentConfig?.phone_number_id || !agentConfig?.access_token) {
    return json({ error: "waba_not_configured" }, 400);
  }

  // ── Build conversation list ────────────────────────────────────────────────
  const windowMs = campaign.window_hours * 60 * 60 * 1000;
  const cutoff = new Date(Date.now() - windowMs).toISOString();

  let query = supabase
    .from("crm_wa_conversations")
    .select("id, phone, contact_name")
    .eq("user_id", user.id)
    .gt("last_message_at", cutoff);

  // Label filter
  if (campaign.audience_type === "labels" && campaign.label_ids?.length > 0) {
    const { data: labelRows } = await supabase
      .from("crm_wa_conversation_labels")
      .select("conversation_id")
      .in("label_id", campaign.label_ids);

    const labelConvIds = [...new Set((labelRows ?? []).map((r: any) => r.conversation_id))];
    if (labelConvIds.length === 0) {
      await supabase.from("crm_wa_instant_campaigns").update({
        status: "completed", total_contacts: 0, sent_count: 0, failed_count: 0,
      }).eq("id", campaign_id);
      return json({ ok: true, sent: 0, failed: 0, total: 0 });
    }
    query = query.in("id", labelConvIds);
  }

  const { data: conversations } = await query;
  let convs: ConvRow[] = conversations ?? [];

  // Country filter (AND with label filter)
  if (campaign.country_codes?.length > 0) {
    convs = convs.filter(c => campaign.country_codes.includes(getPhonePrefix(c.phone)));
  }

  // ── Mark processing ────────────────────────────────────────────────────────
  await supabase.from("crm_wa_instant_campaigns").update({
    status: "processing",
    total_contacts: convs.length,
  }).eq("id", campaign_id);

  // ── Send ───────────────────────────────────────────────────────────────────
  const { sent, failed } = await sendMessages(
    campaign_id, convs, campaign.message_text ?? "",
    agentConfig.phone_number_id, agentConfig.access_token,
    campaign.media_type ?? null, campaign.media_url ?? null,
  );

  // ── Mark completed ─────────────────────────────────────────────────────────
  await supabase.from("crm_wa_instant_campaigns").update({
    status: "completed",
    sent_count: sent,
    failed_count: failed,
  }).eq("id", campaign_id);

  return json({ ok: true, sent, failed, total: convs.length });
});
