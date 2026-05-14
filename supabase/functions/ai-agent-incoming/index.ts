// ────────────────────────────────────────────────────────────────────────────
// ai-agent-incoming
// Webhook llamado por baileys-service cada vez que llega un mensaje de WhatsApp.
// Flujo:
//   1. Validar x-webhook-secret
//   2. Resolver/crear conversación y guardar el mensaje entrante
//   3. Si mode='human' o agente desactivado → salir
//   4. Si mode='ai' → llamar a Claude Haiku con tools, loop de tool_use
//   5. Guardar respuesta y enviarla por baileys-service
// ────────────────────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const ANTHROPIC_API_KEY     = Deno.env.get("ANTHROPIC_API_KEY")!;
const BAILEYS_SERVICE_URL   = Deno.env.get("BAILEYS_SERVICE_URL")!;
const BAILEYS_API_KEY       = Deno.env.get("BAILEYS_API_KEY")!;
const WEBHOOK_SECRET        = Deno.env.get("INCOMING_WEBHOOK_SECRET")!;
const DEFAULT_MODEL         = "claude-haiku-4-5-20251001";
const MAX_TOOL_ITERATIONS   = 6;
const HISTORY_LIMIT         = 30;

function ok(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ── Tools disponibles para la IA ───────────────────────────────────────────
const TOOLS = [
  {
    name: "get_business_context",
    description: "Devuelve la información del negocio: nombre, descripción, horarios y zona horaria. Úsalo cuando el cliente pregunte por horarios, ubicación o información general.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "list_services",
    description: "Lista los servicios activos del negocio con nombre, descripción y precio. Úsalo cuando el cliente pregunte qué se ofrece, precios o duración.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "find_my_contact",
    description: "Busca al contacto del cliente actual (por su número de WhatsApp) en el CRM. Devuelve nombre, email y datos asociados si existe. Si no existe, devuelve null.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "list_available_slots",
    description: "Devuelve los horarios disponibles para agendar en una fecha específica (formato YYYY-MM-DD). Opcionalmente puedes filtrar por calendar_id.",
    input_schema: {
      type: "object",
      properties: {
        date:        { type: "string", description: "Fecha en formato YYYY-MM-DD" },
        calendar_id: { type: "string", description: "ID del calendario (opcional, usa el principal si se omite)" },
      },
      required: ["date"],
    },
  },
  {
    name: "list_calendars",
    description: "Lista los calendarios disponibles para agendar (con su duración por defecto y nombre).",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "book_appointment",
    description: "Agenda una cita para el cliente actual. Antes de llamar a esta función SIEMPRE confirma con el cliente la fecha, hora y servicio. Usa list_available_slots primero para asegurar disponibilidad.",
    input_schema: {
      type: "object",
      properties: {
        calendar_id: { type: "string", description: "ID del calendario donde agendar" },
        date:        { type: "string", description: "Fecha YYYY-MM-DD" },
        hour:        { type: "integer", description: "Hora 0-23" },
        minute:      { type: "integer", description: "Minutos 0-59" },
        contact_name:{ type: "string", description: "Nombre del cliente (si no está registrado)" },
        service:     { type: "string", description: "Servicio o nota corta para la cita" },
      },
      required: ["calendar_id", "date", "hour", "minute"],
    },
  },
  {
    name: "get_my_appointments",
    description: "Devuelve las citas próximas del cliente actual (las que aún no han pasado).",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "escalate_to_human",
    description: "Marca esta conversación para que un humano la atienda. Úsalo cuando el cliente lo pida explícitamente, esté frustrado, o pregunte algo que claramente requiere intervención humana (queja, situación delicada, info que no tienes).",
    input_schema: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Motivo corto del cambio a humano" },
      },
      required: ["reason"],
    },
  },
];

// ── Tool execution ────────────────────────────────────────────────────────
interface ToolCtx {
  userId:        string;
  conversationId:string;
  phone:         string;
  contactId:     string | null;
  pushName:      string | null;
}

async function runTool(name: string, input: any, ctx: ToolCtx): Promise<any> {
  switch (name) {
    case "get_business_context": {
      const { data: profile } = await supabase
        .from("crm_business_profile")
        .select("business_name, industry, timezone, first_name, last_name, business_description")
        .eq("user_id", ctx.userId)
        .maybeSingle();
      const { data: calendars } = await supabase
        .from("crm_calendar_config")
        .select("name, availability, timezone")
        .eq("user_id", ctx.userId);
      return {
        business_name: profile?.business_name
          ?? [profile?.first_name, profile?.last_name].filter(Boolean).join(" ")
          ?? null,
        industry:     profile?.industry ?? null,
        description:  (profile as any)?.business_description ?? null,
        timezone:     profile?.timezone ?? null,
        calendars:    (calendars ?? []).map((c) => ({
          name: c.name,
          timezone: (c as any).timezone,
          availability: (c as any).availability,
        })),
      };
    }

    case "list_services": {
      const { data } = await supabase
        .from("crm_services")
        .select("id, name, description, price, currency, delivery_time")
        .eq("user_id", ctx.userId)
        .eq("active", true);
      return { services: data ?? [] };
    }

    case "find_my_contact": {
      if (ctx.contactId) {
        const { data } = await supabase
          .from("crm_contacts")
          .select("id, name, email, phone, company, stage, tags, notes")
          .eq("id", ctx.contactId)
          .maybeSingle();
        return { contact: data ?? null };
      }
      return { contact: null };
    }

    case "list_calendars": {
      const { data } = await supabase
        .from("crm_calendar_config")
        .select("id, name, duration_min, timezone")
        .eq("user_id", ctx.userId);
      return { calendars: data ?? [] };
    }

    case "list_available_slots": {
      const date = String(input?.date ?? "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return { error: "Formato de fecha inválido. Usa YYYY-MM-DD" };
      }
      let calendarId: string | null = input?.calendar_id ?? null;
      if (!calendarId) {
        const { data: first } = await supabase
          .from("crm_calendar_config")
          .select("id")
          .eq("user_id", ctx.userId)
          .limit(1)
          .maybeSingle();
        calendarId = first?.id ?? null;
      }
      if (!calendarId) return { error: "No hay calendarios configurados" };

      const { data: cal } = await supabase
        .from("crm_calendar_config")
        .select("duration_min, buffer_min, availability, timezone")
        .eq("id", calendarId)
        .maybeSingle();
      if (!cal) return { error: "Calendario no encontrado" };

      return computeAvailableSlots(cal, calendarId, date);
    }

    case "book_appointment": {
      return await bookAppointment(input, ctx);
    }

    case "get_my_appointments": {
      if (!ctx.contactId) return { appointments: [] };
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("crm_appointments")
        .select("id, date, hour, minute, duration_min, service, status, notes, calendar_id")
        .eq("contact_id", ctx.contactId)
        .neq("status", "cancelled")
        .gte("date", today)
        .order("date", { ascending: true })
        .limit(20);
      return { appointments: data ?? [] };
    }

    case "escalate_to_human": {
      await supabase
        .from("ai_conversations")
        .update({ mode: "human" })
        .eq("id", ctx.conversationId);
      return { ok: true, escalated: true, reason: input?.reason ?? null };
    }

    default:
      return { error: `Tool ${name} no implementada` };
  }
}

// ── Slot computation helpers ───────────────────────────────────────────────
const DAY_KEYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function amPmToMinutes(t: string): number {
  const [timePart, period] = t.split(" ");
  const [h, m] = timePart.split(":").map(Number);
  const h24 = period === "AM" ? (h === 12 ? 0 : h) : (h === 12 ? 12 : h + 12);
  return h24 * 60 + (m || 0);
}

function minutesToHHMM(min: number): { h: number; m: number; label: string } {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const label = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  return { h, m, label };
}

async function computeAvailableSlots(cal: any, calendarId: string, date: string) {
  const duration: number = cal.duration_min ?? 30;
  const buffer: number   = cal.buffer_min   ?? 0;
  const avail = cal.availability;
  if (!avail) return { slots: [] };

  const [yy, mm, dd] = date.split("-").map(Number);
  const dayOfWeek = new Date(Date.UTC(yy, mm - 1, dd)).getUTCDay();
  const day = avail[DAY_KEYS[dayOfWeek]];
  if (!day?.open) return { slots: [], reason: "Día cerrado" };

  const { data: appts } = await supabase
    .from("crm_appointments")
    .select("hour, minute, duration_min")
    .eq("calendar_id", calendarId)
    .eq("date", date)
    .neq("status", "cancelled");

  const { data: blocks } = await supabase
    .from("crm_blocked_slots")
    .select("type, date, start_hour, start_minute, end_hour, end_minute, range_start, range_end")
    .eq("calendar_id", calendarId);

  const isBlocked = (slotStart: number): boolean => {
    return (blocks ?? []).some((b: any) => {
      if (b.type === "fullday" && b.date === date) return true;
      if (b.type === "range" && b.range_start && b.range_end) {
        return date >= b.range_start && date <= b.range_end;
      }
      if (b.type === "hours" && b.date === date && b.start_hour != null && b.end_hour != null) {
        const s = b.start_hour * 60 + (b.start_minute ?? 0);
        const e = b.end_hour   * 60 + (b.end_minute   ?? 0);
        return slotStart >= s && slotStart < e;
      }
      return false;
    });
  };

  const slots: string[] = [];
  for (const range of (day.slots ?? [])) {
    const from = amPmToMinutes(range.from);
    const to   = amPmToMinutes(range.to);
    for (let t = from; t + duration <= to; t += duration) {
      if (isBlocked(t)) continue;
      const conflict = (appts ?? []).some((a: any) => {
        const aStart = a.hour * 60 + (a.minute ?? 0);
        const aEnd   = aStart + (a.duration_min ?? duration);
        return t + duration + buffer > aStart && aEnd + buffer > t;
      });
      if (conflict) continue;
      slots.push(minutesToHHMM(t).label);
    }
  }
  return { slots, duration_min: duration };
}

async function bookAppointment(input: any, ctx: ToolCtx) {
  const calendarId = String(input?.calendar_id ?? "");
  const date       = String(input?.date ?? "");
  const hour       = Number(input?.hour);
  const minute     = Number(input?.minute ?? 0);
  if (!calendarId || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isInteger(hour) || hour < 0 || hour > 23 ||
      !Number.isInteger(minute) || minute < 0 || minute > 59) {
    return { error: "Parámetros inválidos para agendar" };
  }

  const { data: cal } = await supabase
    .from("crm_calendar_config")
    .select("user_id, duration_min, buffer_min, availability")
    .eq("id", calendarId)
    .maybeSingle();
  if (!cal || cal.user_id !== ctx.userId) return { error: "Calendario no encontrado" };

  const duration = cal.duration_min ?? 30;
  const buffer   = (cal as any).buffer_min ?? 0;
  const start    = hour * 60 + minute;

  // Validar disponibilidad básica
  const slotsResp = await computeAvailableSlots(cal, calendarId, date);
  if (slotsResp.slots && !slotsResp.slots.includes(minutesToHHMM(start).label)) {
    return { error: "Ese horario no está disponible. Pide otro." };
  }

  // Resolver/crear contacto
  let contactId = ctx.contactId;
  if (!contactId) {
    const name = String(input?.contact_name ?? ctx.pushName ?? "Cliente WhatsApp");
    const { data: nc } = await supabase
      .from("crm_contacts")
      .insert({
        user_id: ctx.userId,
        name,
        email: null,
        phone: ctx.phone,
        tags: ["WhatsApp"],
        stage: null, company: null, notes: null, custom_fields: {},
      })
      .select("id")
      .single();
    contactId = nc?.id ?? null;
  }

  const { data: appt, error: apptErr } = await supabase
    .from("crm_appointments")
    .insert({
      user_id:     ctx.userId,
      contact_id:  contactId,
      calendar_id: calendarId,
      date, hour, minute,
      duration_min: duration,
      service:     input?.service ?? null,
      status:      "confirmed",
      notes:       "Agendada por Agente IA (WhatsApp)",
    })
    .select("id")
    .single();

  if (apptErr) return { error: `No se pudo agendar: ${apptErr.message}` };
  return { ok: true, appointment_id: appt.id, date, time: minutesToHHMM(start).label };
}

// ── WhatsApp send ──────────────────────────────────────────────────────────
async function sendWhatsApp(userId: string, phone: string, text: string): Promise<void> {
  const res = await fetch(`${BAILEYS_SERVICE_URL.replace(/\/$/, "")}/message/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key":    BAILEYS_API_KEY,
    },
    body: JSON.stringify({ userId, phone, text }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`baileys-service ${res.status}: ${errText}`);
  }
}

// ── Anthropic call con tool loop ───────────────────────────────────────────
async function runAgent(
  systemPrompt: string,
  model: string,
  temperature: number,
  history: { role: string; content: any }[],
  ctx: ToolCtx,
): Promise<{ text: string; toolCalls: any[]; tokensIn: number; tokensOut: number }> {
  const messages = [...history];
  let tokensIn = 0;
  let tokensOut = 0;
  const toolCalls: any[] = [];

  for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":       "application/json",
        "x-api-key":          ANTHROPIC_API_KEY,
        "anthropic-version":  "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        temperature,
        system: systemPrompt,
        tools: TOOLS,
        messages,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Anthropic ${res.status}: ${errText}`);
    }
    const data = await res.json();
    tokensIn  += data.usage?.input_tokens  ?? 0;
    tokensOut += data.usage?.output_tokens ?? 0;

    const blocks = data.content ?? [];
    const toolUses = blocks.filter((b: any) => b.type === "tool_use");

    if (toolUses.length === 0) {
      const text = blocks
        .filter((b: any) => b.type === "text")
        .map((b: any) => b.text)
        .join("\n")
        .trim();
      return { text, toolCalls, tokensIn, tokensOut };
    }

    // Run all tool calls and feed results back
    messages.push({ role: "assistant", content: blocks });
    const toolResults: any[] = [];
    for (const tu of toolUses) {
      const result = await runTool(tu.name, tu.input ?? {}, ctx);
      toolCalls.push({ name: tu.name, input: tu.input, result });
      toolResults.push({
        type: "tool_result",
        tool_use_id: tu.id,
        content: JSON.stringify(result),
      });
    }
    messages.push({ role: "user", content: toolResults });
  }

  return {
    text: "Disculpa, tuve un problema procesando tu mensaje. Un humano te responderá pronto.",
    toolCalls,
    tokensIn,
    tokensOut,
  };
}

// ── Default system prompt fallback ─────────────────────────────────────────
function defaultSystemPrompt(): string {
  return `Eres un asistente virtual amable y profesional que responde mensajes de WhatsApp por nuestro negocio.

REGLAS:
- Responde siempre en español, de forma breve y clara (idealmente 1-3 frases).
- Usa las herramientas (tools) disponibles para consultar datos reales del CRM antes de inventar.
- Cuando agendes una cita confirma SIEMPRE la fecha y hora antes de ejecutarla.
- Si no sabes algo o el cliente pide algo delicado, usa escalate_to_human.
- No inventes precios, horarios ni servicios — siempre consulta primero.
- No uses emojis excesivos. Mantén un tono cordial y profesional.`;
}

// ── Handler ────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method !== "POST") return ok({ error: "Method not allowed" }, 405);

  // Validar secret
  const provided = req.headers.get("x-webhook-secret");
  if (!WEBHOOK_SECRET || provided !== WEBHOOK_SECRET) {
    return ok({ error: "Unauthorized" }, 401);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return ok({ error: "Invalid JSON" }, 400);
  }

  const { userId, phone, remoteJid, pushName, text, waMsgId } = body ?? {};
  if (!userId || !phone || !text) return ok({ error: "Missing fields" }, 400);

  try {
    // Dedupe por wa_msg_id
    if (waMsgId) {
      const { data: dup } = await supabase
        .from("ai_messages")
        .select("id")
        .eq("wa_msg_id", waMsgId)
        .maybeSingle();
      if (dup) return ok({ ok: true, dedup: true });
    }

    // Buscar contacto en CRM por teléfono (match flexible)
    const phoneDigits = phone.replace(/\D/g, "");
    const last10 = phoneDigits.slice(-10);
    const { data: matches } = await supabase
      .from("crm_contacts")
      .select("id, name, phone")
      .eq("user_id", userId)
      .not("phone", "is", null);
    const contact = (matches ?? []).find(
      (c: any) => (c.phone ?? "").replace(/\D/g, "").endsWith(last10),
    );
    const contactId = contact?.id ?? null;
    const contactName = contact?.name ?? pushName ?? null;

    // Upsert de conversación
    const { data: convUpsert, error: convErr } = await supabase
      .from("ai_conversations")
      .upsert(
        {
          user_id: userId,
          phone:    phoneDigits,
          remote_jid: remoteJid ?? null,
          contact_name: contactName,
          contact_id:   contactId,
          last_message_at: new Date().toISOString(),
        },
        { onConflict: "user_id,phone" },
      )
      .select("id, mode")
      .single();
    if (convErr || !convUpsert) {
      console.error("ai_conversations upsert error:", convErr);
      return ok({ error: "Cannot upsert conversation" }, 500);
    }

    const conversationId = convUpsert.id;
    const mode           = convUpsert.mode as "ai" | "human";

    // Guardar el mensaje entrante
    await supabase.from("ai_messages").insert({
      conversation_id: conversationId,
      role:    "user",
      content: text,
      wa_msg_id: waMsgId ?? null,
    });

    // Si la conversación está en modo humano → no responder
    if (mode !== "ai") return ok({ ok: true, mode });

    // Cargar configuración del agente
    const { data: config } = await supabase
      .from("ai_agent_config")
      .select("system_prompt, model, temperature, enabled")
      .eq("user_id", userId)
      .maybeSingle();

    if (config && config.enabled === false) {
      return ok({ ok: true, disabled: true });
    }

    const systemPrompt = config?.system_prompt?.trim() || defaultSystemPrompt();
    const model        = config?.model || DEFAULT_MODEL;
    const temperature  = typeof config?.temperature === "number" ? config.temperature : 0.5;

    // Cargar historial (últimos N mensajes en orden cronológico)
    const { data: history } = await supabase
      .from("ai_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(HISTORY_LIMIT);

    const messages = (history ?? [])
      .reverse()
      .map((m: any) => ({
        role:    m.role === "user" ? "user" : "assistant",
        content: m.content,
      }));

    const ctx: ToolCtx = {
      userId,
      conversationId,
      phone: phoneDigits,
      contactId,
      pushName: pushName ?? null,
    };

    const agentRes = await runAgent(systemPrompt, model, temperature, messages, ctx);

    // Guardar respuesta del agente
    const reply = agentRes.text || "Disculpa, no pude generar una respuesta.";
    await supabase.from("ai_messages").insert({
      conversation_id: conversationId,
      role:    "assistant",
      content: reply,
      tokens_input:  agentRes.tokensIn,
      tokens_output: agentRes.tokensOut,
      tool_calls:    agentRes.toolCalls.length ? agentRes.toolCalls : null,
    });

    // Enviar respuesta por WhatsApp
    try {
      await sendWhatsApp(userId, phoneDigits, reply);
    } catch (err) {
      console.error("sendWhatsApp failed:", err);
    }

    return ok({ ok: true, mode: "ai", reply_length: reply.length });
  } catch (err) {
    console.error("ai-agent-incoming error:", err);
    return ok({ error: (err as Error).message }, 500);
  }
});
