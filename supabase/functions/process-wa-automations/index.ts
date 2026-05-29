/**
 * process-wa-automations
 * Invoked every minute by pg_cron.
 * 1. Detects inactivity triggers and enqueues them.
 * 2. Processes pending automation queue items (sends messages).
 *
 * AI Agent coordination:
 * - Before sending, checks that no user message arrived in the last 2 minutes
 *   (prevents injecting automated messages mid active conversation).
 * - After sending, logs the message to crm_wa_messages so the AI Agent has context.
 * - Inactivity detection uses the last USER message (role="user") timestamp,
 *   not last_message_at (which can be updated by AI/flows too).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const GRAPH = "https://graph.facebook.com/v21.0";
const SEND_DELAY_MS = 120;
// If a user sent a message less than this many ms ago, delay the automation
// to avoid interrupting an active conversation with the AI Agent.
const ACTIVE_CONV_GUARD_MS = 2 * 60_000; // 2 minutes

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

const PHONE_PREFIX_MAP: Record<string, string> = {
  "1":"America/New_York","52":"America/Mexico_City","34":"Europe/Madrid",
  "57":"America/Bogota","54":"America/Argentina/Buenos_Aires","55":"America/Sao_Paulo",
  "56":"America/Santiago","51":"America/Lima","58":"America/Caracas",
  "591":"America/La_Paz","593":"America/Guayaquil","595":"America/Asuncion",
  "598":"America/Montevideo","53":"America/Havana",
  "502":"America/Guatemala","503":"America/El_Salvador","504":"America/Tegucigalpa",
  "505":"America/Managua","506":"America/Costa_Rica","507":"America/Panama",
  "44":"Europe/London","33":"Europe/Paris","49":"Europe/Berlin","39":"Europe/Rome",
  "351":"Europe/Lisbon","31":"Europe/Amsterdam","61":"Australia/Sydney",
  "64":"Pacific/Auckland","81":"Asia/Tokyo","82":"Asia/Seoul","86":"Asia/Shanghai",
  "91":"Asia/Kolkata","971":"Asia/Dubai","972":"Asia/Jerusalem","966":"Asia/Riyadh",
  "20":"Africa/Cairo","27":"Africa/Johannesburg","234":"Africa/Lagos",
};

function getPhonePrefix(phone: string): string {
  const d = phone.replace(/\D/g, "");
  for (const len of [3, 2, 1]) {
    const p = d.slice(0, len);
    if (PHONE_PREFIX_MAP[p]) return p;
  }
  return "unknown";
}

function resolveVars(varMap: Record<string, any>, phone: string, contactName: string | null): string[] {
  const result: string[] = [];
  const keys = Object.keys(varMap).sort((a, b) => Number(a) - Number(b));
  for (const key of keys) {
    const src = varMap[key];
    if (src?.source === "contact_field") {
      if (src.field === "name") result.push(contactName ?? phone);
      else if (src.field === "phone") result.push(phone);
      else result.push("");
    } else if (src?.source === "fixed") {
      result.push(src.value ?? "");
    } else {
      result.push("");
    }
  }
  return result;
}

async function sendText(
  phone: string, text: string, phoneNumberId: string, accessToken: string,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${GRAPH}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp", recipient_type: "individual",
      to: phone.replace(/\D/g, ""), type: "text",
      text: { body: text, preview_url: false },
    }),
  });
  if (res.ok) return { ok: true };
  return { ok: false, error: (await res.text()).slice(0, 300) };
}

async function sendTemplate(
  phone: string,
  templateName: string, templateLanguage: string,
  varValues: string[],
  phoneNumberId: string, accessToken: string,
): Promise<{ ok: boolean; error?: string }> {
  const components: any[] = [];
  if (varValues.length > 0) {
    components.push({
      type: "body",
      parameters: varValues.map(v => ({ type: "text", text: v })),
    });
  }
  const res = await fetch(`${GRAPH}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp", recipient_type: "individual",
      to: phone.replace(/\D/g, ""), type: "template",
      template: {
        name: templateName,
        language: { code: templateLanguage ?? "es" },
        ...(components.length > 0 ? { components } : {}),
      },
    }),
  });
  if (res.ok) return { ok: true };
  return { ok: false, error: (await res.text()).slice(0, 300) };
}

// ── 1. Detect inactivity ───────────────────────────────────────────────────────
// Uses the last USER message timestamp (role="user" in crm_wa_messages) instead
// of crm_wa_conversations.last_message_at, which can be updated by AI responses
// and flow events and would give incorrect inactivity readings.

async function detectInactivity() {
  const { data: automations } = await supabase
    .from("crm_wa_automations")
    .select("id, user_id, trigger_inactivity_hours, trigger_country_codes, trigger_label_ids, delay_hours")
    .eq("is_active", true)
    .eq("trigger_type", "inactivity");

  for (const auto of automations ?? []) {
    if (!auto.trigger_inactivity_hours) continue;
    const cutoff    = new Date(Date.now() - auto.trigger_inactivity_hours * 3_600_000);
    const cutoffMin = new Date(cutoff.getTime() - 2 * 60_000); // 2-min polling window

    // Find conversations whose LAST USER message fell in the 2-minute window.
    // We pull recent user messages in a wider range and group in JS.
    const windowStart = new Date(cutoffMin.getTime() - 60_000); // 1 extra minute buffer
    const { data: userMsgs } = await supabase
      .from("crm_wa_messages")
      .select("conversation_id, created_at")
      .eq("role", "user")
      .gte("created_at", windowStart.toISOString())
      .lte("created_at", cutoff.toISOString());

    // Keep only conversations where the LAST user message is in the 2-min window
    const lastUserMsgByConv: Record<string, string> = {};
    for (const msg of userMsgs ?? []) {
      const prev = lastUserMsgByConv[msg.conversation_id];
      if (!prev || msg.created_at > prev) {
        lastUserMsgByConv[msg.conversation_id] = msg.created_at;
      }
    }
    const eligibleConvIds = Object.entries(lastUserMsgByConv)
      .filter(([, ts]) => ts >= cutoffMin.toISOString() && ts < cutoff.toISOString())
      .map(([id]) => id);

    if (!eligibleConvIds.length) continue;

    const { data: convs } = await supabase
      .from("crm_wa_conversations")
      .select("id, phone, contact_name")
      .eq("user_id", auto.user_id)
      .in("id", eligibleConvIds);

    // Filtro por etiquetas: si se configuraron, obtener qué conversaciones las tienen
    const labelFilterIds: string[] = auto.trigger_label_ids ?? [];
    let convIdsWithLabel: Set<string> | null = null;
    if (labelFilterIds.length > 0) {
      const { data: convLabels } = await supabase
        .from("crm_wa_conversation_labels")
        .select("conversation_id")
        .in("label_id", labelFilterIds)
        .in("conversation_id", (convs ?? []).map(c => c.id));
      convIdsWithLabel = new Set((convLabels ?? []).map(r => r.conversation_id));
    }

    for (const conv of convs ?? []) {
      if (
        (auto.trigger_country_codes?.length ?? 0) > 0 &&
        !auto.trigger_country_codes.includes(getPhonePrefix(conv.phone))
      ) continue;

      // Filtro por etiquetas
      if (convIdsWithLabel !== null && !convIdsWithLabel.has(conv.id)) continue;

      const { data: existing } = await supabase
        .from("crm_wa_automation_queue")
        .select("id")
        .eq("automation_id", auto.id)
        .eq("conversation_id", conv.id)
        .in("status", ["pending", "sent"])
        .maybeSingle();

      if (!existing) {
        await supabase.from("crm_wa_automation_queue").insert({
          user_id:         auto.user_id,
          automation_id:   auto.id,
          conversation_id: conv.id,
          scheduled_at:    new Date(Date.now() + (auto.delay_hours ?? 0) * 3_600_000).toISOString(),
        });
      }
    }
  }
}

// ── 2. Process queue ───────────────────────────────────────────────────────────

async function processQueue() {
  const now = new Date().toISOString();
  const activeGuardCutoff = new Date(Date.now() - ACTIVE_CONV_GUARD_MS).toISOString();

  const { data: items } = await supabase
    .from("crm_wa_automation_queue")
    .select("id, user_id, automation_id, conversation_id")
    .eq("status", "pending")
    .lte("scheduled_at", now)
    .limit(50);

  if (!items?.length) return;

  // Fetch automations
  const autoIds = [...new Set(items.map(i => i.automation_id))];
  const { data: automations } = await supabase
    .from("crm_wa_automations")
    .select("id, message_type, message_text, template_id, template_var_map")
    .in("id", autoIds);
  const autoMap = Object.fromEntries((automations ?? []).map(a => [a.id, a]));

  // Fetch templates for template-type automations
  const templateIds = [...new Set(
    (automations ?? []).map(a => a.template_id).filter(Boolean)
  )];
  const { data: templates } = templateIds.length
    ? await supabase.from("crm_wa_templates")
        .select("id, name, language, body_text")
        .in("id", templateIds)
    : { data: [] };
  const tplMap = Object.fromEntries((templates ?? []).map(t => [t.id, t]));

  // Fetch conversations
  const convIds = [...new Set(items.map(i => i.conversation_id))];
  const { data: conversations } = await supabase
    .from("crm_wa_conversations")
    .select("id, phone, contact_name, last_message_at")
    .in("id", convIds);
  const convMap = Object.fromEntries((conversations ?? []).map(c => [c.id, c]));

  // Fetch agent configs
  const userIds = [...new Set(items.map(i => i.user_id))];
  const { data: configs } = await supabase
    .from("crm_ai_agent_config")
    .select("user_id, phone_number_id, access_token")
    .in("user_id", userIds);
  const configMap = Object.fromEntries((configs ?? []).map(c => [c.user_id, c]));

  // Fetch recent user messages per conversation (active conversation guard).
  // If a user sent a message in the last 2 minutes, the conversation is considered
  // active and we delay the automation until it quiets down.
  const { data: recentUserMsgs } = await supabase
    .from("crm_wa_messages")
    .select("conversation_id")
    .eq("role", "user")
    .gte("created_at", activeGuardCutoff)
    .in("conversation_id", convIds);
  const activeConvIds = new Set((recentUserMsgs ?? []).map(m => m.conversation_id));

  for (const item of items) {
    const auto   = autoMap[item.automation_id];
    const conv   = convMap[item.conversation_id];
    const config = configMap[item.user_id];

    if (!auto || !conv || !config?.phone_number_id || !config?.access_token) {
      await supabase.from("crm_wa_automation_queue")
        .update({ status: "failed", error_message: "Missing config or conversation" })
        .eq("id", item.id);
      continue;
    }

    // Active conversation guard: user wrote very recently → delay, don't send yet.
    // The item stays "pending" and will be retried next minute.
    if (activeConvIds.has(item.conversation_id)) {
      console.log(`[automations] skipping item ${item.id} — active conversation (user < 2min ago)`);
      continue;
    }

    const isWithin24h = (Date.now() - new Date(conv.last_message_at).getTime()) < 24 * 3_600_000;
    let status: string = "failed";
    let errorMsg: string | null = null;
    let sentAt: string | null = null;
    let sentContent: string | null = null; // logged to crm_wa_messages

    try {
      if (auto.message_type === "free_text") {
        if (!isWithin24h) {
          status = "skipped";
        } else {
          const r = await sendText(conv.phone, auto.message_text ?? "", config.phone_number_id, config.access_token);
          status = r.ok ? "sent" : "failed";
          errorMsg = r.error ?? null;
          if (r.ok) { sentAt = new Date().toISOString(); sentContent = auto.message_text; }
        }

      } else if (auto.message_type === "template") {
        const tpl = tplMap[auto.template_id];
        if (!tpl) { status = "failed"; errorMsg = "Template not found"; }
        else {
          const vars = resolveVars(auto.template_var_map ?? {}, conv.phone, conv.contact_name);
          const r = await sendTemplate(conv.phone, tpl.name, tpl.language, vars, config.phone_number_id, config.access_token);
          status = r.ok ? "sent" : "failed";
          errorMsg = r.error ?? null;
          if (r.ok) { sentAt = new Date().toISOString(); sentContent = `[Plantilla: ${tpl.name}]`; }
        }

      } else if (auto.message_type === "free_text_with_fallback") {
        if (isWithin24h) {
          const r = await sendText(conv.phone, auto.message_text ?? "", config.phone_number_id, config.access_token);
          status = r.ok ? "sent" : "failed";
          errorMsg = r.error ?? null;
          if (r.ok) { sentAt = new Date().toISOString(); sentContent = auto.message_text; }
        } else {
          const tpl = tplMap[auto.template_id];
          if (!tpl) { status = "skipped"; errorMsg = "Outside 24h and no template configured"; }
          else {
            const vars = resolveVars(auto.template_var_map ?? {}, conv.phone, conv.contact_name);
            const r = await sendTemplate(conv.phone, tpl.name, tpl.language, vars, config.phone_number_id, config.access_token);
            status = r.ok ? "sent" : "failed";
            errorMsg = r.error ?? null;
            if (r.ok) { sentAt = new Date().toISOString(); sentContent = `[Plantilla: ${tpl.name}]`; }
          }
        }
      }
    } catch (e) {
      status = "failed";
      errorMsg = String(e).slice(0, 300);
    }

    await supabase.from("crm_wa_automation_queue")
      .update({ status, error_message: errorMsg, sent_at: sentAt })
      .eq("id", item.id);

    // Log the sent message to crm_wa_messages so the AI Agent has full context
    // of what was said to this contact automatically. Does NOT update last_message_at
    // to keep the inactivity timer based on genuine user activity.
    if (status === "sent" && sentContent) {
      await supabase.from("crm_wa_messages").insert({
        conversation_id: item.conversation_id,
        role: "assistant",
        content: `[Automatización] ${sentContent}`,
      });
    }

    await supabase.rpc("increment_automation_counts", {
      p_id:       item.automation_id,
      p_sent:     status === "sent"    ? 1 : 0,
      p_skipped:  status === "skipped" ? 1 : 0,
      p_failed:   status === "failed"  ? 1 : 0,
    });

    await sleep(SEND_DELAY_MS);
  }
}

// ── Handler ────────────────────────────────────────────────────────────────────

Deno.serve(async (_req: Request) => {
  try {
    await detectInactivity();
    await processQueue();
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error("[automations] fatal:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
