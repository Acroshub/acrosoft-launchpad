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
import { requireInternal } from "../_shared/internal-auth.ts";
import { buildAudience } from "../_shared/wa-audience.ts";
import { normalizeUrl } from "../_shared/wa-url.ts";

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
  // Norte América
  "1":"America/New_York","52":"America/Mexico_City",
  // Centro América
  "53":"America/Havana","502":"America/Guatemala","503":"America/El_Salvador",
  "504":"America/Tegucigalpa","505":"America/Managua","506":"America/Costa_Rica","507":"America/Panama",
  // Sud América
  "57":"America/Bogota","58":"America/Caracas","593":"America/Guayaquil",
  "51":"America/Lima","591":"America/La_Paz","55":"America/Sao_Paulo",
  "595":"America/Asuncion","54":"America/Argentina/Buenos_Aires",
  "56":"America/Santiago","598":"America/Montevideo",
  // Europa
  "351":"Europe/Lisbon","34":"Europe/Madrid","33":"Europe/Paris",
  "44":"Europe/London","49":"Europe/Berlin","39":"Europe/Rome","31":"Europe/Amsterdam",
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

type MediaType = "image" | "video" | "audio";

async function sendMessage(
  phone: string,
  text: string,
  phoneNumberId: string,
  accessToken: string,
  mediaType?: MediaType | null,
  mediaUrl?: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const to = phone.replace(/\D/g, "");
  let body: object;

  if (mediaType && mediaUrl) {
    if (mediaType === "audio") {
      body = { messaging_product: "whatsapp", recipient_type: "individual", to, type: "audio", audio: { link: mediaUrl } };
    } else {
      const caption = text?.trim() || undefined;
      body = {
        messaging_product: "whatsapp", recipient_type: "individual", to,
        type: mediaType,
        [mediaType]: { link: mediaUrl, ...(caption ? { caption } : {}) },
      };
    }
  } else {
    body = {
      messaging_product: "whatsapp", recipient_type: "individual",
      to, type: "text", text: { body: text, preview_url: false },
    };
  }

  const res = await fetch(`${GRAPH}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
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


// ── Contenido del seguimiento ─────────────────────────────────────────────────
// Misma forma que un envío masivo: un tipo + su contenido. Los seguimientos
// antiguos guardaban texto y adjunto en columnas sueltas; se convierten al vuelo.

type Part = {
  type: "text" | "image" | "video" | "audio" | "file" | "link";
  text?: string; url?: string; name?: string; link_url?: string; link_label?: string;
};

function automationPart(auto: any): Part {
  const parts: Part[] = Array.isArray(auto.parts) ? auto.parts : [];
  if (parts.length) return parts[0];
  const text = (auto.message_text ?? "").trim();
  if (auto.media_type && auto.media_url) {
    return { type: auto.media_type, url: auto.media_url, text: text || undefined };
  }
  return { type: "text", text };
}

function partSummary(part: Part): string {
  if (part.type === "text") return part.text ?? "";
  if (part.type === "link") return `[enlace] ${part.text ?? ""} ${part.link_url ?? ""}`.trim();
  return `[${part.type}] ${part.text ?? ""}`.trim();
}

async function sendPart(
  phone: string, part: Part, phoneNumberId: string, accessToken: string,
): Promise<{ ok: boolean; error?: string }> {
  const to = phone.replace(/\D/g, "");
  let body: Record<string, unknown> | null = null;

  if (part.type === "text") {
    const text = (part.text ?? "").trim();
    if (!text) return { ok: false, error: "Mensaje vacío" };
    body = { messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { body: text, preview_url: false } };
  } else if (part.type === "link") {
    const url = normalizeUrl(part.link_url);
    const caption = (part.text ?? "").trim();
    if (!url) {
      const fallback = [caption, part.link_url].filter(Boolean).join("\n");
      if (!fallback) return { ok: false, error: "Enlace vacío" };
      body = { messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { body: fallback, preview_url: true } };
    } else {
      body = {
        messaging_product: "whatsapp", recipient_type: "individual", to,
        type: "interactive",
        interactive: {
          type: "cta_url",
          body: { text: caption || url },
          action: { name: "cta_url", parameters: { display_text: (part.link_label ?? "Ver más").slice(0, 20), url } },
        },
      };
    }
  } else {
    const link = (part.url ?? "").trim();
    if (!link) return { ok: false, error: "Archivo no configurado" };
    const waType = part.type === "file" ? "document" : part.type;
    const media: Record<string, unknown> = { link };
    const caption = (part.text ?? "").trim();
    if (caption && part.type !== "audio") media.caption = caption;
    if (part.type === "file" && part.name) media.filename = part.name;
    body = { messaging_product: "whatsapp", recipient_type: "individual", to, type: waType, [waType]: media };
  }

  const res = await fetch(`${GRAPH}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.ok) return { ok: true };
  return { ok: false, error: (await res.text()).slice(0, 300) };
}

// ── Arranque de secuencia ─────────────────────────────────────────────────────
// El runtime de flujos avanza leyendo active_sequence_id de la conversación. Un
// seguimiento no tiene flujo detrás, así que se deja active_flow_id en null: es
// justo lo que distingue "secuencia lanzada por seguimiento" de "flujo activo".

// Una Pregunta son botones de verdad en WhatsApp, no texto. Los ids opt_N tienen
// que coincidir con los que espera ai-agent al enrutar la respuesta: son la
// posición entre las opciones CON texto, igual que en sendInteractiveQuestion.
async function sendQuestionStep(
  phone: string, step: any, phoneNumberId: string, accessToken: string,
): Promise<{ ok: boolean; error?: string }> {
  const options = (step.options ?? []).filter((o: any) => o.label?.trim()).slice(0, 3);
  const bodyText = (step.text ?? "").trim();

  // Sin botones o con un texto que Meta no acepta en interactivo: se manda plano.
  // El contacto puede responder igual y ai-agent enruta por texto.
  if (!options.length || bodyText.length > 1024) {
    return await sendPart(phone, { type: "text", text: bodyText || "¿Qué prefieres?" }, phoneNumberId, accessToken);
  }

  const res = await fetch(`${GRAPH}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp", recipient_type: "individual",
      to: phone.replace(/\D/g, ""), type: "interactive",
      interactive: {
        type: "button",
        body: { text: bodyText || "Elige una opción:" },
        action: {
          buttons: options.map((opt: any, i: number) => ({
            type: "reply", reply: { id: `opt_${i}`, title: opt.label.slice(0, 20) },
          })),
        },
      },
    }),
  });
  if (res.ok) return { ok: true };
  return { ok: false, error: (await res.text()).slice(0, 300) };
}

function stepToPart(step: any): Part {
  if (step.type === "link")    return { type: "link", text: step.text, link_url: step.link_url, link_label: step.link_label };
  if (step.type === "message") return { type: "text", text: step.text };
  return { type: step.type, url: step.media?.[0]?.url, name: step.media?.[0]?.name, text: step.text };
}

// Respiro entre pasos para que lleguen en orden al teléfono — mismos valores que
// usa ai-agent al ejecutar un flujo.
function stepDelay(type: string): number {
  if (type === "audio" || type === "video") return 3000;
  if (type === "image" || type === "file")  return 2500;
  return 1500;
}

/**
 * Manda los pasos desde `startIdx` siguiendo las aristas del grafo y se detiene
 * en la primera Pregunta (después de enviarla): ahí la conversación queda a la
 * espera de la respuesta, que recogerá ai-agent.
 *
 * Devuelve el índice en el que quedó, que es lo que se guarda en `flow_step`.
 * Antes se mandaba solo `steps[0]` y se guardaba `flow_step = 0`, así que cuando
 * el contacto respondía ai-agent volvía a enviar ese mismo primer paso.
 */
async function runSequenceFrom(
  steps: any[], startIdx: number, phone: string, phoneNumberId: string, accessToken: string,
  conversationId: string,
): Promise<{ idx: number; completed: boolean; error?: string }> {
  let idx = startIdx;
  let prevType: string | null = null;

  // Cada paso queda en el chat, igual que cuando los manda ai-agent. Si no, el
  // contacto recibe mensajes que no aparecen por ningún lado: el operador ve una
  // respuesta suelta sin la pregunta, y la IA pierde ese contexto.
  const log = (step: any) => supabase.from("crm_wa_messages").insert({
    conversation_id: conversationId,
    role: "assistant",
    content: (step.text ?? "").trim() || `[${step.type}]`,
    delivery_status: "sent",
    origin: "automation",
    ...(step.type === "question"
      ? {
          media_type: "interactive_question",
          interactive_options: (step.options ?? [])
            .filter((o: any) => o.label?.trim())
            .map((o: any) => ({ label: o.label })),
        }
      : {}),
    ...(step.media?.[0]?.url ? { media_type: step.type, media_url: step.media[0].url } : {}),
  });

  while (idx >= 0 && idx < steps.length) {
    const step = steps[idx];
    if (prevType) await sleep(stepDelay(prevType));

    if (step.type === "question") {
      const r = await sendQuestionStep(phone, step, phoneNumberId, accessToken);
      if (r.ok) await log(step);
      // Se queda EN la pregunta: es el paso que ai-agent tiene que resolver.
      return { idx, completed: false, error: r.ok ? undefined : r.error };
    }

    const r = await sendPart(phone, stepToPart(step), phoneNumberId, accessToken);
    if (!r.ok) return { idx, completed: false, error: r.error };
    await log(step);
    prevType = step.type;

    if (!step.next_step_id) { idx = steps.length; break; }
    const nextIdx = steps.findIndex((s: any) => s.id === step.next_step_id);
    idx = nextIdx >= 0 ? nextIdx : steps.length;
  }

  return { idx, completed: idx >= steps.length };
}

async function startSequence(
  auto: any, conversationId: string, phone: string, config: any,
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  if (!auto.sequence_id) return { ok: false, error: "Sin secuencia configurada" };

  // Si ya hay un flujo o secuencia corriendo, no se pisa: el contacto está a
  // mitad de otra conversación guiada.
  const { data: conv } = await supabase
    .from("crm_wa_conversations")
    .select("active_flow_id, active_sequence_id")
    .eq("id", conversationId)
    .single();
  if (conv?.active_flow_id || conv?.active_sequence_id) {
    return { ok: false, skipped: true, error: "Ya hay un flujo activo en la conversación" };
  }

  const { data: seq } = await supabase
    .from("crm_wa_sequences")
    .select("steps, status")
    .eq("id", auto.sequence_id)
    .single();
  const steps = (seq?.steps ?? []) as any[];
  if (seq?.status !== "published" || !steps.length) {
    return { ok: false, error: "La secuencia no está publicada o está vacía" };
  }

  // Se marca la conversación y se avanza como un flujo: salen los pasos hasta la
  // primera Pregunta, y ahí queda esperando. El resto lo continúa ai-agent en
  // cuanto el contacto responda.
  await supabase.from("crm_wa_conversations")
    .update({ active_sequence_id: auto.sequence_id, flow_step: 0 })
    .eq("id", conversationId);

  const run = await runSequenceFrom(steps, 0, phone, config.phone_number_id, config.access_token, conversationId);

  if (run.error && run.idx === 0) {
    // Ni el primer paso salió: se deja la conversación como estaba, sin secuencia
    // colgada bloqueando futuros flujos.
    await supabase.from("crm_wa_conversations")
      .update({ active_sequence_id: null, flow_step: 0 })
      .eq("id", conversationId);
    return { ok: false, error: run.error };
  }

  // Una secuencia sin preguntas se agota de una: se libera la conversación en vez
  // de dejarla marcada como "en secuencia" para siempre.
  await supabase.from("crm_wa_conversations")
    .update(run.completed
      ? { active_sequence_id: null, flow_step: 0 }
      : { flow_step: run.idx })
    .eq("id", conversationId);

  return { ok: true, error: run.error };
}

// ── 1. Detect inactivity ───────────────────────────────────────────────────────
// Uses the last USER message timestamp (role="user" in crm_wa_messages) instead
// of crm_wa_conversations.last_message_at, which can be updated by AI responses
// and flow events and would give incorrect inactivity readings.

async function detectInactivity() {
  const { data: automations } = await supabase
    .from("crm_wa_automations")
    .select("id, user_id, trigger_inactivity_hours, audience_type, audience_filters, audience_match")
    .eq("is_active", true)
    .eq("trigger_type", "inactivity");

  for (const auto of automations ?? []) {
    if (!auto.trigger_inactivity_hours) continue;
    const cutoff    = new Date(Date.now() - auto.trigger_inactivity_hours * 3_600_000);
    const cutoffMin = new Date(cutoff.getTime() - 2 * 60_000); // ventana de sondeo de 2 min

    // Se mira el último mensaje DEL CONTACTO, no last_message_at: ese campo lo
    // pisan la IA, los recordatorios y los envíos manuales del operador, y daría
    // lecturas de inactividad falsas.
    const windowStart = new Date(cutoffMin.getTime() - 60_000);
    const { data: userMsgs } = await supabase
      .from("crm_wa_messages")
      .select("conversation_id, created_at")
      .eq("role", "user")
      .gte("created_at", windowStart.toISOString())
      .lte("created_at", cutoff.toISOString());

    const lastUserMsgByConv: Record<string, string> = {};
    for (const msg of userMsgs ?? []) {
      const prev = lastUserMsgByConv[msg.conversation_id];
      if (!prev || msg.created_at > prev) lastUserMsgByConv[msg.conversation_id] = msg.created_at;
    }
    const candidateConvIds = Object.entries(lastUserMsgByConv)
      .filter(([, ts]) => ts >= cutoffMin.toISOString() && ts < cutoff.toISOString())
      .map(([id]) => id);

    if (!candidateConvIds.length) continue;

    // La consulta de arriba solo mira una ventana de 3 minutos alrededor del
    // corte, así que su "último mensaje" es el último DE ESA VENTANA. Si el
    // contacto escribió también DESPUÉS del corte, no lleva las horas de
    // silencio que pide el seguimiento y no debe recibirlo: con 6h configuradas,
    // alguien que escribió a las 10:00 y otra vez a las 14:00 se disparaba a las
    // 16:00, cuando en realidad llevaba 2h callado, no 6.
    const recent = new Set<string>();
    const CHUNK = 200;
    for (let i = 0; i < candidateConvIds.length; i += CHUNK) {
      const { data } = await supabase
        .from("crm_wa_messages")
        .select("conversation_id")
        .eq("role", "user")
        .in("conversation_id", candidateConvIds.slice(i, i + CHUNK))
        .gt("created_at", cutoff.toISOString());
      for (const m of data ?? []) recent.add(m.conversation_id);
    }
    const eligibleConvIds = candidateConvIds.filter(id => !recent.has(id));
    if (!eligibleConvIds.length) continue;

    // La audiencia usa los mismos filtros que los envíos masivos. Antes tenía su
    // propio modelo (etiquetas + países) que respondía distinto a la misma pregunta.
    const members = await buildAudience(
      supabase,
      auto.user_id,
      auto.audience_type ?? "all",
      auto.audience_filters ?? [],
      { match: auto.audience_match ?? "any" },
    );
    const allowedConvIds = new Set(members.map(m => m.conversationId).filter(Boolean) as string[]);

    for (const convId of eligibleConvIds) {
      if (!allowedConvIds.has(convId)) continue;

      // Un seguimiento salta UNA sola vez por conversación. Si el contacto
      // responde y vuelve a quedarse callado, no se le insiste: la decisión es
      // deliberada — un recordatorio se agradece, dos ya es acoso.
      // maybeSingle() daba error (y por tanto "no existe") si por lo que fuera
      // había más de una fila, que es justo el caso que hay que detectar.
      const { data: existing } = await supabase
        .from("crm_wa_automation_queue")
        .select("id")
        .eq("automation_id", auto.id)
        .eq("conversation_id", convId)
        .in("status", ["pending", "sent"])
        .limit(1);
      if (existing?.length) continue;

      // El índice único (automation_id, conversation_id) sobre pending/sent es
      // la última palabra: si dos pasadas se solapan, una de las dos rebota aquí
      // en vez de encolar el aviso dos veces.
      const { error } = await supabase.from("crm_wa_automation_queue").insert({
        user_id:         auto.user_id,
        automation_id:   auto.id,
        conversation_id: convId,
        scheduled_at:    new Date().toISOString(),
      });
      if (error && error.code !== "23505") {
        console.error(`[automations] no se pudo encolar ${auto.id}/${convId}:`, error.message);
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
    .select("id, user_id, automation_id, conversation_id, created_at")
    .eq("status", "pending")
    .lte("scheduled_at", now)
    .limit(50);

  if (!items?.length) return;

  // Fetch automations
  const autoIds = [...new Set(items.map(i => i.automation_id))];
  const { data: automations } = await supabase
    .from("crm_wa_automations")
    .select("id, message_type, parts, sequence_id, message_text, media_type, media_url, template_id, template_var_map, user_id")
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

  // Último mensaje del contacto por conversación. Sirve para dos cosas:
  //   · medir de verdad la ventana de 24h de Meta
  //   · revalidar que sigue callado desde que se encoló el seguimiento
  // Sin lo segundo, alguien que responde entre encolar y enviar recibía igual el
  // "¿sigues ahí?" — que es exactamente lo que no debe pasar.
  // Solo hace falta mirar desde la más antigua de estas dos fechas: la ventana de
  // 24h de Meta y el momento en que se encoló el aviso más viejo. Sin ese recorte
  // la consulta traía el historial ENTERO de cada conversación y PostgREST corta
  // a 1000 filas en silencio: bastaban unas pocas conversaciones habladoras para
  // que el último mensaje de otras no entrara en el corte, se leyera como "fuera
  // de la ventana" y el seguimiento se saltara sin motivo.
  const oldestItemAt = items.reduce(
    (min, i) => (i.created_at < min ? i.created_at : min),
    items[0].created_at as string,
  );
  const lookbackFrom = new Date(
    Math.min(Date.now() - 24 * 3_600_000, new Date(oldestItemAt).getTime()),
  ).toISOString();

  const lastUserMsgAt: Record<string, string> = {};
  const MSG_CHUNK = 200;
  for (let i = 0; i < convIds.length; i += MSG_CHUNK) {
    const { data } = await supabase
      .from("crm_wa_messages")
      .select("conversation_id, created_at")
      .eq("role", "user")
      .in("conversation_id", convIds.slice(i, i + MSG_CHUNK))
      .gte("created_at", lookbackFrom)
      .order("created_at", { ascending: false });
    for (const m of data ?? []) {
      if (!lastUserMsgAt[m.conversation_id]) lastUserMsgAt[m.conversation_id] = m.created_at;
    }
  }

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

    // Conversación activa: el contacto escribió hace nada → se espera al
    // siguiente minuto en vez de interrumpirle.
    if (activeConvIds.has(item.conversation_id)) {
      console.log(`[automations] item ${item.id} en espera — conversación activa (<2min)`);
      continue;
    }

    // Revalidación: si respondió DESPUÉS de encolarse, el seguimiento ya no
    // tiene sentido. Se cancela en vez de mandarle un "¿sigues ahí?" a alguien
    // que acaba de contestar.
    const lastUserAt = lastUserMsgAt[item.conversation_id];
    if (lastUserAt && new Date(lastUserAt).getTime() > new Date(item.created_at).getTime()) {
      await supabase.from("crm_wa_automation_queue")
        .update({ status: "cancelled", error_message: "El contacto respondió antes del envío" })
        .eq("id", item.id);
      console.log(`[automations] item ${item.id} cancelado — el contacto respondió`);
      continue;
    }

    // La ventana de Meta se cuenta desde el último mensaje DEL CONTACTO. Usar
    // last_message_at la inflaba, porque lo pisan la IA, los recordatorios y los
    // envíos manuales del operador — y el envío acababa rebotando en Meta.
    const lastUser = lastUserMsgAt[item.conversation_id];
    const isWithin24h = !!lastUser && (Date.now() - new Date(lastUser).getTime()) < 24 * 3_600_000;
    let status: string = "failed";
    let errorMsg: string | null = null;
    let sentAt: string | null = null;
    let sentContent: string | null = null; // logged to crm_wa_messages

    try {
      if (auto.message_type === "free_text") {
        if (!isWithin24h) {
          status = "skipped";
          errorMsg = "Fuera de la ventana de 24h";
        } else {
          const r = await sendPart(conv.phone, automationPart(auto), config.phone_number_id, config.access_token);
          status = r.ok ? "sent" : "failed";
          errorMsg = r.error ?? null;
          if (r.ok) { sentAt = new Date().toISOString(); sentContent = partSummary(automationPart(auto)); }
        }

      } else if (auto.message_type === "template") {
        const tpl = tplMap[auto.template_id];
        if (!tpl) { status = "failed"; errorMsg = "Plantilla no encontrada"; }
        else {
          const vars = resolveVars(auto.template_var_map ?? {}, conv.phone, conv.contact_name);
          const r = await sendTemplate(conv.phone, tpl.name, tpl.language, vars, config.phone_number_id, config.access_token);
          status = r.ok ? "sent" : "failed";
          errorMsg = r.error ?? null;
          if (r.ok) { sentAt = new Date().toISOString(); sentContent = `[Plantilla: ${tpl.name}]`; }
        }

      } else if (auto.message_type === "free_text_with_fallback") {
        if (isWithin24h) {
          const r = await sendPart(conv.phone, automationPart(auto), config.phone_number_id, config.access_token);
          status = r.ok ? "sent" : "failed";
          errorMsg = r.error ?? null;
          if (r.ok) { sentAt = new Date().toISOString(); sentContent = partSummary(automationPart(auto)); }
        } else {
          const tpl = tplMap[auto.template_id];
          if (!tpl) { status = "skipped"; errorMsg = "Fuera de 24h y sin plantilla de respaldo"; }
          else {
            const vars = resolveVars(auto.template_var_map ?? {}, conv.phone, conv.contact_name);
            const r = await sendTemplate(conv.phone, tpl.name, tpl.language, vars, config.phone_number_id, config.access_token);
            status = r.ok ? "sent" : "failed";
            errorMsg = r.error ?? null;
            if (r.ok) { sentAt = new Date().toISOString(); sentContent = `[Plantilla: ${tpl.name}]`; }
          }
        }

      } else if (auto.message_type === "sequence") {
        // Una secuencia solo puede correr dentro de la ventana: sus pasos son
        // mensajes libres.
        if (!isWithin24h) {
          status = "skipped";
          errorMsg = "Fuera de la ventana de 24h";
        } else {
          const r = await startSequence(auto, item.conversation_id, conv.phone, config);
          status = r.ok ? "sent" : (r.skipped ? "skipped" : "failed");
          errorMsg = r.error ?? null;
          // sentContent se queda en null a propósito: runSequenceFrom ya dejó en el
          // chat cada paso que envió, con su texto real. Una línea extra diciendo
          // "[Secuencia iniciada]" solo duplicaría ruido encima de eso.
          if (r.ok) sentAt = new Date().toISOString();
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
        // El prefijo "[Automatización]" sobraba: `origin` ya lo dice, y la UI lo
        // pinta como etiqueta en vez de ensuciar el texto del mensaje.
        content: sentContent,
        delivery_status: "sent",
        origin: "automation",
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


// ── 3. Caducar secuencias fuera de ventana ────────────────────────────────────
// Una secuencia lanzada por un seguimiento solo puede mandar mensajes libres. Si
// el contacto no responde y pasan 24h desde su último mensaje, los pasos que
// falten ya no se pueden enviar nunca. Dejarla activa acumula conversaciones
// zombi que además BLOQUEAN cualquier otro flujo, porque el runtime corta en
// cuanto ve una secuencia en curso.

async function expireStaleSequences() {
  const { data: running } = await supabase
    .from("crm_wa_conversations")
    .select("id")
    .is("active_flow_id", null)
    .not("active_sequence_id", "is", null)
    .limit(500);

  if (!running?.length) return;

  const ids = running.map(c => c.id);
  const cutoff = new Date(Date.now() - 24 * 3_600_000).toISOString();

  // Conversaciones con algún mensaje del contacto dentro de las últimas 24h:
  // esas siguen vivas.
  const { data: fresh } = await supabase
    .from("crm_wa_messages")
    .select("conversation_id")
    .eq("role", "user")
    .in("conversation_id", ids)
    .gte("created_at", cutoff);

  const alive = new Set((fresh ?? []).map(m => m.conversation_id));
  const stale = ids.filter(id => !alive.has(id));
  if (!stale.length) return;

  await supabase.from("crm_wa_conversations")
    .update({ active_sequence_id: null, flow_step: 0 })
    .in("id", stale);

  console.log(`[automations] ${stale.length} secuencia(s) caducadas por cierre de ventana`);
}

// ── Handler ────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Solo invocación interna (pg_cron cada minuto) — envía WhatsApp a contactos reales
  const unauthorized = requireInternal(req);
  if (unauthorized) return unauthorized;

  try {
    await detectInactivity();
    await processQueue();
    await expireStaleSequences();
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error("[automations] fatal:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
