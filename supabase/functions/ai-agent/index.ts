import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const GRAPH_VERSION = "v21.0";

// ─── Tipos ─────────────────────────────────────────────────────────────────────
interface AgentConfig {
  user_id: string;
  phone_number_id: string;
  access_token: string;
  agent_name: string;
  system_prompt: string | null;
  model: string;
  timezone: string;
  off_hours_message: string | null;
  schedule: Record<string, { open: boolean; slots: { from: string; to: string }[] }> | null;
}

interface WaMessage {
  role: "user" | "assistant" | "human";
  content: string;
}

// ─── Verificación de horario con schedule JSONB ───────────────────────────────
const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function parseTime12(t: string): number {
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return 0;
  let h = parseInt(m[1]);
  const min = parseInt(m[2]);
  const period = m[3].toUpperCase();
  if (period === "AM") { if (h === 12) h = 0; }
  else { if (h !== 12) h += 12; }
  return h * 60 + min;
}

function isWithinSchedule(schedule: AgentConfig["schedule"], timezone: string): boolean {
  if (!schedule) return true; // Sin schedule configurado = siempre activo

  const now = new Date();
  const localStr = now.toLocaleString("en-US", { timeZone: timezone });
  const local = new Date(localStr);
  const dayName = DAY_NAMES[local.getDay()];

  const daySchedule = schedule[dayName];
  if (!daySchedule?.open) return false;

  const currentMinutes = local.getHours() * 60 + local.getMinutes();

  for (const slot of daySchedule.slots ?? []) {
    const fromMin = parseTime12(slot.from);
    const toMin = parseTime12(slot.to);
    if (currentMinutes >= fromMin && currentMinutes <= toMin) return true;
  }

  return false;
}

// ─── Compilar system prompt con variables dinámicas ───────────────────────────
async function buildSystemPrompt(config: AgentConfig, phone: string): Promise<string> {
  const base = config.system_prompt?.trim() ||
    `Eres ${config.agent_name}, un asistente virtual amable. Responde en español neutro, en mensajes breves de 2 a 4 líneas.`;

  const { data: business } = await supabase
    .from("crm_business_profile")
    .select("name, description")
    .eq("user_id", config.user_id)
    .maybeSingle();

  const { data: services } = await supabase
    .from("crm_services")
    .select("name, price, currency, description")
    .eq("user_id", config.user_id)
    .order("name");

  const { data: conv } = await supabase
    .from("crm_wa_conversations")
    .select("contact_name")
    .eq("user_id", config.user_id)
    .eq("phone", phone)
    .maybeSingle();

  const now = new Date().toLocaleDateString("es-ES", {
    timeZone: config.timezone,
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const servicesList = services?.length
    ? services.map(s => `- ${s.name}: ${s.currency ?? "USD"} $${s.price}`).join("\n")
    : "No hay servicios configurados.";

  return base
    .replace(/\{\{negocio\.nombre\}\}/g, business?.name ?? "el negocio")
    .replace(/\{\{negocio\.descripcion\}\}/g, business?.description ?? "")
    .replace(/\{\{negocio\.servicios\}\}/g, servicesList)
    .replace(/\{\{contacto\.nombre\}\}/g, conv?.contact_name ?? "cliente")
    .replace(/\{\{fecha\.hoy\}\}/g, now)
    + `\n\nFecha actual: ${now}.`;
}

// ─── Enviar mensaje de texto por Graph API ────────────────────────────────────
async function sendWhatsAppMessage(
  phone: string,
  text: string,
  config: AgentConfig,
): Promise<{ wa_message_id: string }> {
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${config.phone_number_id}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phone,
        type: "text",
        text: { preview_url: false, body: text },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Graph API ${res.status}: ${errText}`);
  }

  const json = await res.json();
  const id = json?.messages?.[0]?.id;
  if (!id) throw new Error(`Respuesta de Graph sin message_id: ${JSON.stringify(json)}`);
  return { wa_message_id: id };
}

// ─── Llamada a Claude ──────────────────────────────────────────────────────────
async function callClaude(
  systemPrompt: string,
  history: WaMessage[],
  model: string,
): Promise<string> {
  const messages = history.map(m => ({
    role: m.role === "user" ? "user" : "assistant",
    content: m.content,
  }));

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API ${res.status}: ${errText}`);
  }

  const json = await res.json();
  const text = json?.content?.[0]?.text;
  if (!text) throw new Error("Claude no devolvió contenido");
  return text;
}

// ─── Entry point ───────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  let body: { conversation_id: string; tenant_user_id: string; phone: string };
  try {
    body = await req.json();
  } catch {
    return new Response("bad json", { status: 400 });
  }

  const { conversation_id, tenant_user_id, phone } = body;
  if (!conversation_id || !tenant_user_id || !phone) {
    return new Response("missing fields", { status: 400 });
  }

  try {
    // 1. Cargar config del tenant
    const { data: config, error: configErr } = await supabase
      .from("crm_ai_agent_config")
      .select("*")
      .eq("user_id", tenant_user_id)
      .single();

    if (configErr || !config) {
      console.error("[ai-agent] config no encontrada para:", tenant_user_id);
      return new Response("config not found", { status: 404 });
    }

    // 2. Verificar horario usando schedule JSONB
    if (!isWithinSchedule(config.schedule, config.timezone ?? "America/Mexico_City")) {
      const offMsg = config.off_hours_message?.trim() ||
        "Gracias por escribirnos. En este momento estamos fuera del horario de atención. Te responderemos a la brevedad.";
      console.log(`[ai-agent] fuera de horario para ${phone}, enviando mensaje off-hours`);
      await sendWhatsAppMessage(phone, offMsg, config);
      await supabase.from("crm_wa_messages").insert({
        conversation_id,
        role: "assistant",
        content: offMsg,
      });
      await supabase
        .from("crm_wa_conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversation_id);
      return new Response(JSON.stringify({ ok: true, reason: "off_hours" }), { status: 200 });
    }

    // 3. Cargar historial reciente (últimos 20 mensajes)
    const { data: rawHistory } = await supabase
      .from("crm_wa_messages")
      .select("role, content")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: false })
      .limit(20);

    const history: WaMessage[] = ((rawHistory ?? []) as WaMessage[]).reverse();

    // 4. Construir system prompt con variables del CRM
    const t0 = Date.now();
    const systemPrompt = await buildSystemPrompt(config, phone);

    // 5. Llamar a Claude
    const reply = await callClaude(systemPrompt, history, config.model ?? "claude-haiku-4-5-20251001");
    console.log(`[ai-agent] Claude respondió en ${Date.now() - t0}ms`);

    // 6. Guardar respuesta en DB
    const { data: savedMsg } = await supabase
      .from("crm_wa_messages")
      .insert({ conversation_id, role: "assistant", content: reply })
      .select()
      .single();

    // 7. Enviar a WhatsApp por Graph API
    try {
      const { wa_message_id } = await sendWhatsAppMessage(phone, reply, config);
      console.log(`[ai-agent] → enviado a ${phone} (wamid: ${wa_message_id})`);
      if (savedMsg) {
        await supabase
          .from("crm_wa_messages")
          .update({ wa_message_id })
          .eq("id", savedMsg.id);
      }
    } catch (sendErr: any) {
      console.error("[ai-agent] error enviando a Graph API:", sendErr.message);
      if (savedMsg) {
        await supabase
          .from("crm_wa_messages")
          .update({ send_error: String(sendErr.message) })
          .eq("id", savedMsg.id);
      }
    }

    // 8. Actualizar last_message_at
    await supabase
      .from("crm_wa_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversation_id);

    return new Response(JSON.stringify({ ok: true }), { status: 200 });

  } catch (err: any) {
    console.error("[ai-agent] error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
