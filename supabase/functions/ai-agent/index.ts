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
  can_transfer_human: boolean;
  can_answer_services: boolean;
  can_create_contacts: boolean;
  can_book_appointments: boolean;
  scheduling_calendar_id: string | null;
  notify_on_transfer: boolean;
  notify_email: string | null;
  products_mode: "all" | "selected";
  selected_product_ids: string[];
  services_mode: "all" | "selected";
  selected_service_ids: string[];
  auto_detect_payments: boolean;
  payment_notify_email: string | null;
  // Configuración estratégica B15-1
  agent_objectives: string[] | null;
  agent_personality: string | null;
  agent_proactivity: string | null;
  agent_data_collect: string[] | null;
  response_length: string | null;
  emoji_level: string | null;
  do_upsell: boolean;
  confirm_summary: boolean;
  agent_faq: Array<{ q: string; a: string }> | null;
  agent_extra_prompt: string | null;
}

interface WaMessage {
  role: "user" | "assistant" | "human";
  content: string;
}

interface WaLabel {
  id: string;
  name: string;
  hint: string | null;
}

interface PaymentMethodRow {
  id: string;
  type: string;
  label: string | null;
  content: string;
  sort_order: number;
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
  if (!schedule) return true;

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

// ─── Helpers de disponibilidad de calendario (portados desde CalendarRenderer) ──

const CALENDAR_DAY_KEYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function amPmToMinutes(t: string): number {
  const [timePart, period] = t.split(" ");
  const [h, m] = timePart.split(":").map(Number);
  const h24 = period?.toUpperCase() === "AM" ? (h === 12 ? 0 : h) : (h === 12 ? 12 : h + 12);
  return h24 * 60 + (m || 0);
}

function isSlotInSchedule(
  avail: Record<string, any> | null,
  dayOfWeek: number,
  hour: number,
  minute: number,
  duration: number,
): boolean {
  if (!avail) return true;
  const day = avail[CALENDAR_DAY_KEYS[dayOfWeek]];
  if (!day?.open) return false;
  const totalMin = hour * 60 + minute;
  return (day.slots as { from: string; to: string }[]).some(
    s => totalMin >= amPmToMinutes(s.from) && totalMin + duration <= amPmToMinutes(s.to),
  );
}

function isDayOpenInSchedule(avail: Record<string, any> | null, dayOfWeek: number): boolean {
  if (!avail) return true;
  return !!avail[CALENDAR_DAY_KEYS[dayOfWeek]]?.open;
}

function isSlotManuallyBlocked(blocked: any[], dayKey: string, hour: number, minute: number): boolean {
  return blocked.some(b => {
    if (b.type === "hours" && b.date === dayKey && b.start_hour != null && b.end_hour != null) {
      const slotStart = hour * 60 + minute;
      return slotStart >= b.start_hour * 60 + (b.start_minute ?? 0) &&
             slotStart < b.end_hour * 60 + (b.end_minute ?? 0);
    }
    if (b.type === "fullday" && b.date === dayKey) return true;
    if (b.type === "range" && b.range_start && b.range_end)
      return dayKey >= b.range_start && dayKey <= b.range_end;
    return false;
  });
}

function isDayFullyBlocked(blocked: any[], dayKey: string): boolean {
  return blocked.some(b =>
    (b.type === "fullday" && b.date === dayKey) ||
    (b.type === "range" && b.range_start && b.range_end && dayKey >= b.range_start && dayKey <= b.range_end),
  );
}

function wallClockToUtcMsCal(
  year: number, month: number, day: number,
  hour: number, minute: number, tz: string,
): number {
  const fmt = new Intl.DateTimeFormat("en", {
    timeZone: tz, year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", minute: "numeric", hour12: false,
  });
  let utcMs = Date.UTC(year, month - 1, day, hour, minute);
  for (let i = 0; i < 2; i++) {
    const parts = fmt.formatToParts(new Date(utcMs));
    const get = (t: string) => Number(parts.find(p => p.type === t)?.value ?? 0);
    const h = get("hour") % 24;
    const displayedMs = Date.UTC(get("year"), get("month") - 1, get("day"), h, get("minute"));
    utcMs += Date.UTC(year, month - 1, day, hour, minute) - displayedMs;
  }
  return utcMs;
}

function formatSlotLabel(dateKey: string, hour: number, minute: number, timezone: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  // Usar mediodía UTC (12:00) para evitar que medianoche UTC caiga en el día anterior
  // en timezones con offset negativo (UTC-N), lo que causaría nombres de día incorrectos
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  const dayName = dt.toLocaleDateString("es-ES", { timeZone: timezone, weekday: "long" });
  const dayNum  = dt.toLocaleDateString("es-ES", { timeZone: timezone, day: "numeric", month: "long" });
  const mm = String(minute).padStart(2, "0");
  const period = hour < 12 ? "AM" : "PM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${dayNum}, ${h12}:${mm} ${period}`;
}

interface AvailableSlot { date: string; hour: number; minute: number; label: string }
interface SlotsResult { slots: AvailableSlot[]; scheduleDesc: string; minAdvHours: number }

// Construye la descripción de horario para que Claude pueda razonar sobre fechas adicionales
function buildScheduleDesc(avail: Record<string, any> | null, slotStep: number, minAdvHours: number, maxFutureDays: number): string {
  const dayMap: Record<string, string> = {
    "Dom": "Domingo", "Lun": "Lunes", "Mar": "Martes", "Mié": "Miércoles",
    "Jue": "Jueves", "Vie": "Viernes", "Sáb": "Sábado",
  };
  const lines: string[] = [
    `Configuración: citas de ${slotStep} min, anticipación mínima ${minAdvHours}h, máximo ${maxFutureDays} días a futuro`,
  ];
  if (avail) {
    for (const [key, val] of Object.entries(avail)) {
      if (val?.open && val.slots?.length > 0) {
        const ranges = (val.slots as { from: string; to: string }[]).map(s => `${s.from}–${s.to}`).join(", ");
        lines.push(`${dayMap[key] ?? key}: ${ranges}`);
      }
    }
  }
  return lines.join("\n");
}

async function getAvailableSlots(calendarId: string, fromDateStr?: string): Promise<SlotsResult> {
  const { data: cal } = await supabase
    .from("crm_calendar_config")
    .select("duration_min, buffer_min, min_advance_hours, max_future_days, availability, timezone, schedule_interval")
    .eq("id", calendarId)
    .single();

  if (!cal) return { slots: [], scheduleDesc: "", minAdvHours: 1 };

  const timezone        = (cal.timezone          as string) ?? "America/Mexico_City";
  const durationMin     = (cal.duration_min       as number) ?? 60;
  // schedule_interval = paso entre inicio de slots (ej. cada 30 min aunque la cita dure 60)
  // Si no está definido, usar duration_min como fallback
  const slotStep        = (cal.schedule_interval  as number) ?? durationMin;
  const bufferMin       = (cal.buffer_min         as number) ?? 0;
  const minAdvHours     = (cal.min_advance_hours  as number) ?? 1;
  const maxFutureDays   = (cal.max_future_days    as number) ?? 60;
  const avail           = cal.availability as Record<string, any> | null;

  const now           = new Date();
  const minBookableMs = now.getTime() + minAdvHours * 3600 * 1000;
  const todayKey      = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(now);
  const [cty, ctm, ctd] = todayKey.split("-").map(Number);

  const toUtcDateKey = (y: number, m: number, d: number): string => {
    const dt = new Date(Date.UTC(y, m - 1, d));
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
  };

  // Si se pasa una fecha hint, empezar la búsqueda desde ahí (respetando min advance)
  let startKey = todayKey;
  if (fromDateStr && fromDateStr >= todayKey) startKey = fromDateStr;
  const [sty, stm, std] = startKey.split("-").map(Number);

  const searchDays = Math.min(30, maxFutureDays);
  const endDateKey = toUtcDateKey(sty, stm, std + searchDays);
  const maxDateKey = toUtcDateKey(cty, ctm, ctd + maxFutureDays);

  const [{ data: appts }, { data: blocked }] = await Promise.all([
    supabase.from("crm_appointments")
      .select("date, hour, minute, duration_min")
      .eq("calendar_id", calendarId)
      .gte("date", todayKey)
      .lte("date", endDateKey)
      .neq("status", "cancelled"),
    supabase.from("crm_blocked_slots")
      .select("*")
      .eq("calendar_id", calendarId),
  ]);

  const apptsByDate: Record<string, { startMin: number; endMin: number }[]> = {};
  for (const a of appts ?? []) {
    if (!apptsByDate[a.date]) apptsByDate[a.date] = [];
    const start = a.hour * 60 + (a.minute ?? 0);
    apptsByDate[a.date].push({ startMin: start, endMin: start + (a.duration_min ?? durationMin) });
  }

  const isBufferBlocked = (dateKey: string, candidateStart: number): boolean => {
    const existing = apptsByDate[dateKey];
    if (!existing) return false;
    const end = candidateStart + durationMin;
    return existing.some(({ startMin, endMin }) =>
      end + bufferMin > startMin && endMin + bufferMin > candidateStart,
    );
  };

  const slots: AvailableSlot[] = [];

  for (let d = 0; d <= searchDays && slots.length < 15; d++) {
    const dateKey = toUtcDateKey(sty, stm, std + d);
    const dow = new Date(Date.UTC(sty, stm - 1, std + d)).getUTCDay();

    if (dateKey < todayKey) continue;
    if (dateKey > maxDateKey) break;
    if (isDayFullyBlocked(blocked ?? [], dateKey)) continue;
    if (!isDayOpenInSchedule(avail, dow)) continue;

    // Loop de 0:00 a 23:59 usando schedule_interval como paso
    // (24*60 = 1440 para cubrir slots nocturnos como 9PM-10PM)
    for (let totalMin = 0; totalMin < 24 * 60; totalMin += slotStep) {
      if (slots.length >= 15) break;
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      const [y, mo, dy] = dateKey.split("-").map(Number);
      if (wallClockToUtcMsCal(y, mo, dy, h, m, timezone) < minBookableMs) continue;
      if (!isSlotInSchedule(avail, dow, h, m, durationMin)) continue;
      if (isBufferBlocked(dateKey, totalMin)) continue;
      if (isSlotManuallyBlocked(blocked ?? [], dateKey, h, m)) continue;
      slots.push({ date: dateKey, hour: h, minute: m, label: formatSlotLabel(dateKey, h, m, timezone) });
    }
  }

  return { slots, scheduleDesc: buildScheduleDesc(avail, slotStep, minAdvHours, maxFutureDays), minAdvHours };
}

// ─── Validar que un slot pedido por el cliente realmente está disponible ───────
// Claude puede confirmar horarios incorrectos (no sabe de conflictos con otras
// citas ni bloqueos manuales). Esta función valida en el backend antes de insertar.
async function validateSlot(
  calendarId: string,
  date: string,
  hour: number,
  minute: number,
  excludeAppointmentId?: string | null,
): Promise<{ valid: boolean; reason: string }> {
  const { data: cal } = await supabase
    .from("crm_calendar_config")
    .select("duration_min, buffer_min, min_advance_hours, max_future_days, availability, timezone")
    .eq("id", calendarId)
    .single();

  if (!cal) return { valid: false, reason: "calendar_not_found" };

  const timezone      = (cal.timezone as string) ?? "UTC";
  const slotStep      = (cal.duration_min    as number) ?? 30;
  const bufferMin     = (cal.buffer_min      as number) ?? 0;
  const minAdvHours   = (cal.min_advance_hours as number) ?? 1;
  const maxFutureDays = (cal.max_future_days  as number) ?? 60;
  const avail         = cal.availability as Record<string, any> | null;

  const now           = new Date();
  const minBookableMs = now.getTime() + minAdvHours * 3600 * 1000;
  const todayKey      = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(now);
  const maxDateKey    = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(
    new Date(now.getTime() + maxFutureDays * 86400 * 1000),
  );

  if (date < todayKey)   return { valid: false, reason: "past_date" };
  if (date > maxDateKey) return { valid: false, reason: "too_far" };

  const [y, m, d] = date.split("-").map(Number);
  if (wallClockToUtcMsCal(y, m, d, hour, minute, timezone) < minBookableMs) {
    return { valid: false, reason: "advance_notice" };
  }

  const dow = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
  if (!isDayOpenInSchedule(avail, dow))                       return { valid: false, reason: "day_closed" };
  if (!isSlotInSchedule(avail, dow, hour, minute, slotStep)) return { valid: false, reason: "outside_hours" };

  const [{ data: blocked }, { data: appts }] = await Promise.all([
    supabase.from("crm_blocked_slots").select("*").eq("calendar_id", calendarId),
    supabase.from("crm_appointments").select("id, date, hour, minute, duration_min")
      .eq("calendar_id", calendarId).eq("date", date).neq("status", "cancelled"),
  ]);

  if (isDayFullyBlocked(blocked ?? [], date))              return { valid: false, reason: "day_blocked" };
  if (isSlotManuallyBlocked(blocked ?? [], date, hour, minute)) return { valid: false, reason: "slot_blocked" };

  const totalMin = hour * 60 + minute;
  const end      = totalMin + slotStep;
  const conflict = (appts ?? []).some(a => {
    if (excludeAppointmentId && (a as any).id === excludeAppointmentId) return false;
    const aStart = a.hour * 60 + (a.minute ?? 0);
    const aEnd   = aStart + (a.duration_min ?? slotStep);
    return end + bufferMin > aStart && aEnd + bufferMin > totalMin;
  });

  if (conflict) return { valid: false, reason: "conflict" };

  return { valid: true, reason: "ok" };
}

// ─── Formatear número WA a E.164 legible: +591 701234567 ─────────────────────
// Meta Cloud API devuelve números sin "+" (ej: 591701234567).
// Usamos una tabla de prefijos de 1 y 2 dígitos; el resto se trata como 3 dígitos.
function formatPhoneForCrm(waPhone: string): string {
  const digits = waPhone.replace(/\D/g, "");
  if (!digits) return waPhone;
  const p1 = ["1", "7"];
  const p2 = ["20","27","30","31","32","33","34","35","36","37","38","39",
               "40","41","42","43","44","45","46","47","48","49",
               "51","52","53","54","55","56","57","58",
               "60","61","62","63","64","65","66","81","82","84","86",
               "90","91","92","93","94","95","96","98","99"];
  if (p1.includes(digits[0]))            return `+${digits[0]} ${digits.slice(1)}`;
  if (p2.includes(digits.slice(0, 2)))   return `+${digits.slice(0, 2)} ${digits.slice(2)}`;
  return `+${digits.slice(0, 3)} ${digits.slice(3)}`;
}

// ─── Crear cita desde el agente IA ───────────────────────────────────────────
// El contacto siempre se crea/busca al agendar una cita, independientemente
// del toggle "crear contactos". Una cita sin contacto no tiene sentido.
async function bookAppointmentFromAgent(
  calendarId: string,
  userId: string,
  conversationId: string,
  contactName: string,
  contactPhone: string,
  date: string,
  hour: number,
  minute: number,
  notes: string | null,
  rescheduleId: string | null,
): Promise<{ ok: boolean; error?: string }> {
  try {
    // Si hay rescheduleId → modificar cita existente en lugar de crear una nueva
    if (rescheduleId) {
      const { error } = await supabase
        .from("crm_appointments")
        .update({ date, hour, minute: minute ?? 0, notes: notes ?? null })
        .eq("id", rescheduleId)
        .eq("user_id", userId);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    let contactId: string | null = null;

    // Formatear teléfono WA a E.164 legible: +591 701234567
    const formattedPhone = formatPhoneForCrm(contactPhone);

    // Buscar contacto por teléfono formateado O por número raw (para no duplicar)
    const { data: existing } = await supabase
      .from("crm_contacts")
      .select("id, name")
      .eq("user_id", userId)
      .or(`phone.eq.${formattedPhone},phone.eq.${contactPhone}`)
      .maybeSingle();

    // Nombre válido = no vacío, no es el teléfono, no es un placeholder genérico
    const PLACEHOLDER_NAMES = ["pendiente", "n/a", "unknown", "desconocido", "cliente", "sin nombre", "nombre"];
    const isValidName = (n: string) =>
      n.length > 1 && n !== formattedPhone && n !== contactPhone &&
      !PLACEHOLDER_NAMES.includes(n.toLowerCase().trim());

    if (existing) {
      contactId = existing.id;
      // Actualizar nombre si el actual es un placeholder y ahora tenemos uno real
      if (contactName && isValidName(contactName) && !isValidName(existing.name ?? "")) {
        await supabase.from("crm_contacts").update({ name: contactName }).eq("id", contactId).eq("user_id", userId);
      }
    } else if (contactName || contactPhone) {
      const { data: newC } = await supabase
        .from("crm_contacts")
        .insert({ user_id: userId, name: contactName || formattedPhone, phone: formattedPhone })
        .select("id")
        .single();
      if (newC) contactId = newC.id;
    }

    const { data: cal } = await supabase
      .from("crm_calendar_config")
      .select("duration_min")
      .eq("id", calendarId)
      .single();

    const durationMin = (cal?.duration_min as number | null) ?? 30;

    const { error } = await supabase.from("crm_appointments").insert({
      calendar_id: calendarId,
      user_id: userId,
      contact_id: contactId,
      date,
      hour,
      minute: minute ?? 0,
      duration_min: durationMin,
      notes: notes ?? null,
      status: "confirmed",
      source: "ai_agent",
    });

    if (error) return { ok: false, error: error.message };

    // Vincular contacto a la conversación si se creó ahora
    if (contactId) {
      await supabase
        .from("crm_wa_conversations")
        .update({ contact_id: contactId })
        .eq("id", conversationId)
        .is("contact_id", null);
    }

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ─── Parser del marcador [SCHEDULE|...] ──────────────────────────────────────
function parseAndStripSchedule(text: string): {
  text: string;
  schedule: { date: string; hour: number; minute: number; contactName: string; contactPhone: string; notes: string | null; rescheduleId: string | null } | null;
} {
  const match = text.match(/\[SCHEDULE\|([^\]]+)\]/i);
  if (!match) return { text, schedule: null };

  const data: Record<string, string> = {};
  for (const pair of match[1].split("|")) {
    const colonIdx = pair.indexOf(":");
    if (colonIdx === -1) continue;
    data[pair.slice(0, colonIdx).trim()] = pair.slice(colonIdx + 1).trim();
  }

  const hour   = parseInt(data["hour"]   ?? "0");
  const minute = parseInt(data["minute"] ?? "0");
  if (!data["date"] || isNaN(hour)) return { text, schedule: null };

  return {
    text: text.replace(match[0], "").trim(),
    schedule: {
      date:         data["date"],
      hour,
      minute:       isNaN(minute) ? 0 : minute,
      contactName:  data["contact_name"]  ?? data["name"]  ?? "",
      contactPhone: data["contact_phone"] ?? data["phone"] ?? "",
      notes:        data["notes"] || null,
      rescheduleId: data["reschedule_id"] || null,
    },
  };
}

// Convierte formato Markdown a WhatsApp (garantizado en backend, no dependemos de Claude)
function toWhatsAppFormat(text: string): string {
  return text
    .replace(/\*\*([^*\n]+)\*\*/g, "*$1*")  // **bold** → *bold*
    .replace(/__([^_\n]+)__/g, "_$1_");       // __italic__ → _italic_
}

// Extrae el marcador [NO_PAYMENT] del texto (puede ir en cualquier posición)
function parseAndStripNoPayment(text: string): { text: string; hasNoPayment: boolean } {
  const hasNoPayment = /\[NO_PAYMENT\]/i.test(text);
  return { text: text.replace(/\[NO_PAYMENT\]/gi, "").trim(), hasNoPayment };
}

// ─── Parsear y quitar la marca |LABELS| de la respuesta de Claude ─────────────
function parseAndStripLabels(reply: string): { text: string; labelNames: string[] } {
  const markerIndex = reply.lastIndexOf("|LABELS|");
  if (markerIndex === -1) return { text: reply, labelNames: [] };

  const text = reply.slice(0, markerIndex).trimEnd();
  const labelPart = reply.slice(markerIndex + 8).trim();
  const labelNames = labelPart.split(",").map(n => n.trim()).filter(Boolean);
  return { text, labelNames };
}

// ─── Aplicar etiquetas automáticas a la conversación ─────────────────────────
async function applyAutoLabels(userId: string, conversationId: string, labelNames: string[]): Promise<void> {
  if (!labelNames.length) return;

  const { data: allLabels } = await supabase
    .from("crm_wa_labels")
    .select("id, name")
    .eq("user_id", userId);

  if (!allLabels?.length) return;

  const labelMap = new Map<string, string>();
  for (const l of allLabels) labelMap.set(l.name.toLowerCase(), l.id);

  const rows = labelNames
    .map(name => labelMap.get(name.toLowerCase()))
    .filter((id): id is string => !!id)
    .map(labelId => ({ conversation_id: conversationId, label_id: labelId }));

  if (!rows.length) return;

  await supabase
    .from("crm_wa_conversation_labels")
    .upsert(rows, { onConflict: "conversation_id,label_id" });

  console.log(`[ai-agent] auto-labels aplicadas: ${labelNames.join(", ")}`);
}

// ─── Parsear marcador [CONTACT_DATA|campo:valor|campo:valor] ─────────────────
function parseAndStripContactData(text: string): { text: string; contactData: Record<string, string> | null } {
  const match = text.match(/\[CONTACT_DATA\|([^\]]+)\]/i);
  if (!match) return { text, contactData: null };
  const data: Record<string, string> = {};
  for (const pair of match[1].split("|")) {
    const colonIdx = pair.indexOf(":");
    if (colonIdx === -1) continue;
    const key = pair.slice(0, colonIdx).trim();
    const value = pair.slice(colonIdx + 1).trim();
    if (key && value) data[key] = value;
  }
  return {
    text: text.replace(match[0], "").trim(),
    contactData: Object.keys(data).length > 0 ? data : null,
  };
}

// ─── Parsear marcador [PAYMENT_DETECTED|...] ─────────────────────────────────
function parseAndStripPayment(text: string): {
  text: string;
  payment: { product_id: string; variant_id: string | null; amount: number; method_type: string } | null;
} {
  const match = text.match(/\[PAYMENT_DETECTED\|product_id:([^|\]]+)\|variant_id:([^|\]]+)\|amount:([^|\]]+)\|method_type:([^\]]+)\]/i);
  if (!match) return { text, payment: null };
  return {
    text: text.replace(match[0], "").trim(),
    payment: {
      product_id: match[1].trim(),
      variant_id: match[2].trim().toLowerCase() === "none" ? null : match[2].trim(),
      amount: parseFloat(match[3]),
      method_type: match[4].trim(),
    },
  };
}

// ─── Formatear precio según moneda con símbolo correcto ─────────────────────
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£",
  BOB: "Bs.", PEN: "S/", COP: "COP$",
  MXN: "MX$", ARS: "ARS$", CLP: "CLP$",
  BRL: "R$", UYU: "$U", PYG: "Gs.",
  GTQ: "Q", HNL: "L", NIO: "C$",
  CRC: "₡", DOP: "RD$", PAB: "B/.",
};

function formatPrice(amount: number | string, currency: string | null): string {
  const cur = (currency ?? "USD").toUpperCase();
  const symbol = CURRENCY_SYMBOLS[cur];
  if (symbol) return `${symbol}${amount}`;
  return `${cur} ${amount}`;
}

// ─── Formatear un método de pago para el prompt ───────────────────────────────
function formatPaymentMethod(pm: PaymentMethodRow): string {
  const prefix = pm.label ? `${pm.label}: ` : "";
  if (pm.type === "qr_code") {
    // El backend detecta [SEND_QR:id] y envía la imagen real por WhatsApp
    return `${prefix}[SEND_QR:${pm.id}]`;
  }
  return `${prefix}${pm.content}`;
}

// Extrae marcadores [SEND_QR:id] de la respuesta de Claude
function parseAndStripQrMarkers(text: string): { text: string; qrIds: string[] } {
  const qrIds: string[] = [];
  const cleaned = text.replace(/\[SEND_QR:([^\]]+)\]/gi, (_, id) => { qrIds.push(id.trim()); return ""; }).trim();
  return { text: cleaned, qrIds };
}

// Enviar imagen por WhatsApp Graph API
async function sendWhatsAppImage(phone: string, imageUrl: string, caption: string | null, config: AgentConfig): Promise<void> {
  const payload: Record<string, unknown> = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: phone,
    type: "image",
    image: { link: imageUrl, ...(caption ? { caption } : {}) },
  };
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${config.phone_number_id}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`[ai-agent] error enviando QR image: ${err}`);
  }
}

// ─── Cargar catálogo de productos con variantes y métodos de pago ─────────────
async function buildProductsCatalog(config: AgentConfig): Promise<string> {
  if (config.products_mode === "none") return "";

  let productsQuery = supabase
    .from("crm_products")
    .select("id, name, price, discount_pct, currency, description, has_variants, deliverable_type, stock_enabled, stock")
    .eq("user_id", config.user_id)
    .eq("is_active", true)
    .order("name");

  if (config.products_mode === "selected" && config.selected_product_ids?.length) {
    productsQuery = productsQuery.in("id", config.selected_product_ids);
  }

  const { data: allProducts } = await productsQuery;
  if (!allProducts?.length) return "";

  const allProductIds = allProducts.map(p => p.id);

  // Cargar variantes y métodos de pago en paralelo (variantes necesarias ANTES del filtro — B16-4)
  const [variantsRes, paymentMethodsRes] = await Promise.all([
    supabase
      .from("crm_product_variants")
      .select("id, product_id, name, price_override, discount_pct, sort_order, stock")
      .in("product_id", allProductIds)
      .order("sort_order"),
    supabase
      .from("crm_payment_methods")
      .select("id, entity_id, entity_type, type, label, content, sort_order")
      .in("entity_id", allProductIds)
      .eq("entity_type", "product")
      .order("sort_order"),
  ]);

  const variants = variantsRes.data ?? [];
  const paymentMethods = paymentMethodsRes.data ?? [];

  // Agrupar variantes por product_id
  const variantsByProduct = new Map<string, typeof variants>();
  for (const v of variants) {
    if (!variantsByProduct.has(v.product_id)) variantsByProduct.set(v.product_id, []);
    variantsByProduct.get(v.product_id)!.push(v);
  }

  // Filtrar productos sin stock — modelo B16-4:
  // has_variants=true → tracking por variante (v.stock !== null), ignorar product.stock_enabled
  // has_variants=false → tracking por product.stock_enabled + product.stock
  const products = allProducts.filter(p => {
    if (p.has_variants) {
      const pvs = variantsByProduct.get(p.id) ?? [];
      const tracked = pvs.filter((v: any) => v.stock !== null);
      if (tracked.length === 0) return true; // sin tracking → siempre visible
      return tracked.some((v: any) => v.stock > 0); // al menos una variante con stock
    }
    return !(p.stock_enabled && p.stock !== null && p.stock <= 0);
  });
  if (!products.length) return "";

  const pmByProduct = new Map<string, PaymentMethodRow[]>();
  for (const pm of paymentMethods) {
    if (!pmByProduct.has(pm.entity_id)) pmByProduct.set(pm.entity_id, []);
    pmByProduct.get(pm.entity_id)!.push(pm as PaymentMethodRow);
  }

  const lines: string[] = ["CATÁLOGO DE PRODUCTOS:"];

  for (const p of products) {
    const disc = p.discount_pct ?? 0;
    const finalPrice = disc > 0 ? p.price * (1 - disc / 100) : p.price;
    const price = disc > 0
      ? `${formatPrice(finalPrice, p.currency)} (antes ${formatPrice(p.price, p.currency)}, ${disc}% de descuento)`
      : formatPrice(p.price, p.currency);

    // Nota de stock bajo — modelo B16-4
    let stockNote = "";
    if (p.has_variants) {
      const pvs = variantsByProduct.get(p.id) ?? [];
      const lowVariants = pvs.filter((v: any) => v.stock !== null && v.stock > 0 && v.stock <= 5);
      if (lowVariants.length > 0) stockNote = ` ⚠️ Pocas unidades disponibles en algunas variantes`;
    } else if (p.stock_enabled && p.stock !== null && p.stock <= 5) {
      stockNote = ` ⚠️ Últimas ${p.stock} unidades`;
    }

    lines.push(`- ${p.name}: ${price}${stockNote} [product_id:${p.id}]`);

    if (p.description) {
      lines.push(`  Descripción: ${p.description}`);
    }

    // Variantes — solo mostrar las que tienen stock disponible
    const allVariants = variantsByProduct.get(p.id) ?? [];
    const productVariants = allVariants.filter((v: any) =>
      !(v.stock !== null && v.stock <= 0)
    );
    if (p.has_variants && productVariants.length > 0) {
      const variantList = productVariants.map((v: any) => {
        // Misma lógica que calcProductPrice en el frontend:
        // Si tiene price_override → usa ese como base; si no → usa precio del producto
        const base = v.price_override != null ? v.price_override : p.price;
        // Descuento: usa el de la variante si existe; si no y no tiene price_override → hereda del producto
        const disc = (v.discount_pct ?? 0) > 0
          ? (v.discount_pct ?? 0)
          : (v.price_override == null ? (p.discount_pct ?? 0) : 0);
        const finalVPrice = disc > 0 ? +(base * (1 - disc / 100)).toFixed(2) : base;
        const priceLabel = disc > 0
          ? `${formatPrice(finalVPrice, p.currency)} (antes ${formatPrice(base, p.currency)}, ${disc}% de descuento)`
          : (v.price_override != null ? formatPrice(finalVPrice, p.currency) : `igual al base ${formatPrice(p.discount_pct && p.discount_pct > 0 ? +(p.price * (1 - p.discount_pct / 100)).toFixed(2) : p.price, p.currency)}`);
        const variantStock = v.stock !== null && v.stock <= 5 ? ` ⚠️ ${v.stock} u.` : "";
        return `${v.name} (${priceLabel}${variantStock}) [variant_id:${v.id}]`;
      }).join(", ");
      lines.push(`  Variantes: ${variantList}`);
    }

    // Entregable digital
    if (p.deliverable_type) {
      lines.push(`  Entrega: automática por WhatsApp al confirmar el pago`);
    }

    // Métodos de pago
    const pms = pmByProduct.get(p.id) ?? [];
    if (pms.length > 0) {
      lines.push(`  Métodos de pago:`);
      for (const pm of pms) {
        lines.push(`    · ${formatPaymentMethod(pm)}`);
      }
    } else {
      lines.push(`  ⚠️ Sin métodos de pago`);
    }
  }

  return lines.join("\n");
}

// ─── Formatear precio de servicio con descuentos ─────────────────────────────
function formatServicePriceLines(s: {
  price: number; currency: string | null;
  discount_pct: number | null;
  is_recurring: boolean | null;
  recurring_price: number | null;
  recurring_interval: string | null;
  recurring_label: string | null;
  recurring_discount_pct: number | null;
}): string[] {
  const lines: string[] = [];

  const disc = s.discount_pct ?? 0;
  if (disc > 0) {
    const final = (s.price * (1 - disc / 100)).toFixed(2);
    lines.push(`  Precio: ${formatPrice(final, s.currency)} (antes ${formatPrice(s.price, s.currency)}, ${disc}% de descuento)`);
  } else {
    lines.push(`  Precio: ${formatPrice(s.price, s.currency)}`);
  }

  if (s.is_recurring && s.recurring_price != null && s.recurring_price > 0) {
    const interval = s.recurring_label ?? s.recurring_interval ?? "mes";
    const recDisc = s.recurring_discount_pct ?? 0;
    if (recDisc > 0) {
      const finalRec = (s.recurring_price * (1 - recDisc / 100)).toFixed(2);
      lines.push(`  Plan recurrente: ${formatPrice(finalRec, s.currency)}/${interval} (antes ${formatPrice(s.recurring_price, s.currency)}, ${recDisc}% de descuento)`);
    } else {
      lines.push(`  Plan recurrente: ${formatPrice(s.recurring_price, s.currency)}/${interval}`);
    }
  }

  return lines;
}

// ─── Cargar catálogo de servicios con métodos de pago ─────────────────────────
async function buildServicesCatalog(config: AgentConfig): Promise<string> {
  if (config.services_mode === "none") return "";

  let servicesQuery = supabase
    .from("crm_services")
    .select("id, name, price, currency, description, discount_pct, is_recurring, recurring_price, recurring_interval, recurring_label, recurring_discount_pct")
    .eq("user_id", config.user_id)
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (config.services_mode === "selected" && config.selected_service_ids?.length) {
    servicesQuery = servicesQuery.in("id", config.selected_service_ids);
  }

  const { data: services } = await servicesQuery;
  if (!services?.length) return "";

  const serviceIds = services.map(s => s.id);

  const { data: paymentMethods } = await supabase
    .from("crm_payment_methods")
    .select("id, entity_id, type, label, content, sort_order")
    .in("entity_id", serviceIds)
    .eq("entity_type", "service")
    .order("sort_order");

  const pmByService = new Map<string, PaymentMethodRow[]>();
  for (const pm of paymentMethods ?? []) {
    if (!pmByService.has(pm.entity_id)) pmByService.set(pm.entity_id, []);
    pmByService.get(pm.entity_id)!.push(pm as PaymentMethodRow);
  }

  const lines: string[] = ["CATÁLOGO DE SERVICIOS:"];

  for (const s of services) {
    lines.push(`- ${s.name} [service_id:${s.id}]`);

    if (s.description) lines.push(`  Descripción: ${s.description}`);

    for (const priceLine of formatServicePriceLines(s)) lines.push(priceLine);

    const pms = pmByService.get(s.id) ?? [];
    if (pms.length > 0) {
      lines.push(`  Métodos de pago:`);
      for (const pm of pms) lines.push(`    · ${formatPaymentMethod(pm)}`);
    } else {
      lines.push(`  ⚠️ Sin métodos de pago`);
    }
  }

  return lines.join("\n");
}

// ─── Construir instrucciones estratégicas desde config B15-1 ─────────────────
function buildStrategicInstructions(config: AgentConfig): string {
  const parts: string[] = [];

  // Objectives — primero = CTA implícito
  if (config.agent_objectives?.length) {
    const primary = config.agent_objectives[0];
    const secondary = config.agent_objectives.slice(1);
    parts.push(
      `Tu objetivo principal es: ${primary}.` +
      (secondary.length ? ` También puedes: ${secondary.join(", ")}.` : "")
    );
    const ctaMap: Record<string, string> = {
      "Agendar citas": "Siempre que sea pertinente, invita al cliente a agendar una cita.",
      "Vender productos": "Siempre que sea pertinente, orienta al cliente hacia la compra.",
      "Capturar leads": "Procura obtener los datos de contacto del cliente para hacer seguimiento.",
      "Calificar prospectos": "Haz las preguntas necesarias para calificar si el cliente es un prospecto válido.",
      "Dar soporte postventa": "Enfócate en resolver el problema del cliente de forma eficiente.",
      "Responder dudas": "Responde con claridad y precisión las preguntas del cliente.",
    };
    if (ctaMap[primary]) parts.push(ctaMap[primary]);
  }

  // Personality
  const personalityMap: Record<string, string> = {
    "Profesional y formal": "Tu tono es profesional y formal. Usa un lenguaje respetuoso y estructurado.",
    "Amigable y cercano": "Tu tono es amigable y cercano. Usa un lenguaje casual pero respetuoso.",
    "Entusiasta y dinámico": "Tu tono es entusiasta y dinámico. Muestra energía y positivismo en cada mensaje.",
    "Empático y tranquilizador": "Tu tono es empático y tranquilizador. Valida las emociones del cliente y responde con calma.",
    "Directo y conciso": "Tu tono es directo y conciso. Ve al punto sin rodeos, respeta el tiempo del cliente.",
  };
  if (config.agent_personality && personalityMap[config.agent_personality]) {
    parts.push(personalityMap[config.agent_personality]);
  }

  // Proactivity
  const proactivityMap: Record<string, string> = {
    "reactivo": "Responde únicamente lo que el cliente pregunta. No hagas sugerencias a menos que te las pidan.",
    "moderado": "Responde lo que el cliente pregunta y, cuando notes una oportunidad natural, haz una sugerencia breve.",
    "proactivo": "Orienta activamente cada conversación hacia el objetivo principal. Si hay oportunidad, toma la iniciativa.",
  };
  if (config.agent_proactivity && proactivityMap[config.agent_proactivity]) {
    parts.push(proactivityMap[config.agent_proactivity]);
  }

  // Response length
  const lengthMap: Record<string, string> = {
    "short": "Escribe respuestas muy cortas: máximo 2-3 líneas por mensaje.",
    "normal": "Escribe respuestas de longitud normal: 3-4 líneas, sin ser demasiado extenso.",
    "detailed": "Puedes escribir respuestas detalladas cuando el tema lo requiera, explicando con profundidad.",
  };
  if (config.response_length && lengthMap[config.response_length]) {
    parts.push(lengthMap[config.response_length]);
  }

  // Emoji level
  const emojiMap: Record<string, string> = {
    "none": "No uses emojis en ningún mensaje.",
    "poco": "Usa emojis de forma muy esporádica, solo cuando sea muy natural.",
    "medio": "Usa emojis con moderación, 1-2 por mensaje cuando sea apropiado.",
    "mucho": "Usa emojis con frecuencia para dar energía y calidez a los mensajes.",
  };
  if (config.emoji_level && emojiMap[config.emoji_level]) {
    parts.push(emojiMap[config.emoji_level]);
  }

  // Data collection (solo si también puede crear contactos)
  if (config.agent_data_collect?.length && config.can_create_contacts) {
    const fields = config.agent_data_collect.join(", ");
    parts.push(
      `Durante la conversación, intenta obtener de forma natural los siguientes datos del cliente: ${fields}.\n` +
      `Cuando el cliente proporcione alguno de esos datos, añade al FINAL de tu respuesta (invisible para el cliente) el marcador:\n` +
      `[CONTACT_DATA|campo1:valor1|campo2:valor2]\n` +
      `Usa el nombre exacto del campo en español, en minúsculas sin espacios (ej: nombre, presupuesto, email). ` +
      `Solo incluye los datos obtenidos en ESTE mensaje. No repitas datos ya mencionados antes.`
    );
  }

  // Upsell
  if (config.do_upsell) {
    parts.push("Cuando sea relevante y natural, sugiere productos o servicios complementarios que podrían interesarle al cliente.");
  }

  // Confirmation summary
  if (config.confirm_summary) {
    parts.push("Antes de cerrar una venta o agendar una cita, resume brevemente lo acordado para que el cliente confirme.");
  }

  // FAQ
  if (config.agent_faq?.length) {
    const faqBlock = config.agent_faq
      .map(pair => `P: ${pair.q}\nR: ${pair.a}`)
      .join("\n\n");
    parts.push(
      `PREGUNTAS FRECUENTES (responde estas preguntas exactas con las respuestas definidas, sin modificarlas):\n${faqBlock}`
    );
  }

  return parts.join("\n\n");
}

// ─── Compilar system prompt con variables dinámicas ───────────────────────────
async function buildSystemPrompt(
  config: AgentConfig,
  phone: string,
  canTransfer = false,
): Promise<{ prompt: string; contactId: string | null; contactName: string | null; availableSlots: AvailableSlot[] }> {
  const strategicInstructions = buildStrategicInstructions(config);
  const hasStrategicConfig = strategicInstructions.length > 0;

  const canSchedule = !!(config.can_book_appointments && config.scheduling_calendar_id);

  const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: config.timezone ?? "UTC" }).format(new Date());

  const [businessRes, servicesRes, convRes, labelsRes, productsCatalog, servicesCatalog, slotsResult] = await Promise.all([
    supabase.from("crm_business_profile").select("business_name, description").eq("user_id", config.user_id).maybeSingle(),
    supabase.from("crm_services").select("name, price, currency, description, discount_pct, is_recurring, recurring_price, recurring_interval, recurring_label, recurring_discount_pct").eq("user_id", config.user_id).eq("active", true).order("sort_order", { ascending: true }),
    supabase.from("crm_wa_conversations").select("contact_name, contact_id").eq("user_id", config.user_id).eq("phone", phone).maybeSingle(),
    supabase.from("crm_wa_labels").select("id, name, hint").eq("user_id", config.user_id).not("hint", "is", null),
    buildProductsCatalog(config),
    buildServicesCatalog(config),
    canSchedule ? getAvailableSlots(config.scheduling_calendar_id!) : Promise.resolve({ slots: [], scheduleDesc: "", minAdvHours: 1 } as SlotsResult),
  ]);

  const business = businessRes.data;
  const services = servicesRes.data;
  const conv = convRes.data;
  const contactId = conv?.contact_id ?? null;
  const slotsRes = slotsResult as SlotsResult;
  const availableSlots = slotsRes.slots;

  // Citas próximas del contacto — en paralelo con slots (ya tenemos contact_id del batch anterior)
  let existingAppts: Array<{ id: string; date: string; hour: number; minute: number; notes: string | null }> = [];
  if (canSchedule && contactId) {
    const { data: appts } = await supabase
      .from("crm_appointments")
      .select("id, date, hour, minute, notes")
      .eq("calendar_id", config.scheduling_calendar_id!)
      .eq("contact_id", contactId)
      .eq("status", "confirmed")
      .gte("date", todayKey)
      .order("date").order("hour")
      .limit(5);
    existingAppts = (appts ?? []) as typeof existingAppts;
  }

  const now = new Date().toLocaleDateString("es-ES", {
    timeZone: config.timezone,
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const servicesList = services?.length
    ? services.map(s => {
        const disc = s.discount_pct ?? 0;
        const priceStr = disc > 0
          ? `${formatPrice((s.price * (1 - disc / 100)).toFixed(2), s.currency)} (antes ${formatPrice(s.price, s.currency)}, ${disc}% off)`
          : formatPrice(s.price, s.currency);
        return `- ${s.name}: ${priceStr}`;
      }).join("\n")
    : "No hay servicios configurados.";

  const transferInstruction = canTransfer
    ? "\n\nSi el usuario pide explícitamente hablar con una persona, un humano o un agente, responde ÚNICAMENTE con el texto: [TRANSFER]. No agregues nada más."
    : "";

  // Catálogo de productos y servicios con métodos de pago
  const catalogSections: string[] = [];
  if (productsCatalog) catalogSections.push(productsCatalog);
  if (servicesCatalog) catalogSections.push(servicesCatalog);

  let catalogInstruction = "";
  if (catalogSections.length > 0) {
    catalogInstruction = "\n\n" + catalogSections.join("\n\n");
    catalogInstruction += "\n\nREGLA DE PAGO:\n- Si el producto/servicio SÍ tiene métodos de pago: compártelos directamente. Si hay [SEND_QR:xxx], inclúyelo tal cual en tu respuesta — el sistema enviará la imagen automáticamente.\n- Si tiene ⚠️ Sin métodos de pago: escribe SOLO algo como «Perfecto, en breve te pasamos los datos para el pago 😊» (máx 1 línea, sin explicar nada más) y añade [NO_PAYMENT] al final. NUNCA uses palabras como 'asesor', 'representante', 'comunicará', 'configurado', 'sistema'.";
  }

  // Instrucción de etiquetas automáticas
  let labelInstruction = "";
  const activeLabels = (labelsRes.data ?? []).filter((l: WaLabel) => l.hint?.trim());
  if (activeLabels.length > 0) {
    const labelList = activeLabels.map(l => `- ${l.name}: ${l.hint}`).join("\n");
    labelInstruction = `\n\nETIQUETADO AUTOMÁTICO: Si la conversación actual encaja claramente en alguna de las siguientes categorías, añade al FINAL de tu respuesta (después del mensaje al usuario) la marca: |LABELS|NombreEtiqueta\nSi aplica más de una, sepáralas con coma: |LABELS|Etiqueta1,Etiqueta2\nSolo añade la marca si hay una coincidencia clara. Si no aplica ninguna, no añadas nada.\n\nCategorías disponibles:\n${labelList}`;
  }

  // Instrucciones globales fijas — aplican a TODOS los tenants, sin excepción
  const globalRules = `\n\nREGLAS GLOBALES (obligatorias siempre):
1. IDENTIDAD: Eres una persona del equipo de atención, no una IA ni un bot. NUNCA menciones que eres inteligencia artificial, asistente virtual, sistema automático ni nada similar. Habla siempre como una persona real.
2. LENGUAJE: Usa lenguaje natural y humano. NUNCA uses términos técnicos o de sistema como "configurado", "módulo", "plataforma", "base de datos", "sistema" al hablar con clientes.
3. FORMATO WHATSAPP: Para negrilla usa *un solo asterisco* por lado — NUNCA doble asterisco **. Para cursiva _guion bajo_. Para tachado ~virgulilla~.`;

  // Instrucción de detección de pagos
  let paymentInstruction = "";
  if (config.auto_detect_payments && catalogSections.length > 0) {
    paymentInstruction = `\n\nDETECCIÓN DE PAGOS — analiza visualmente la imagen recibida:
Cuando el cliente envíe una imagen, inspecciona su contenido visual para determinar si es un comprobante de pago.

Para registrar el pago deben cumplirse OBLIGATORIAMENTE estos 2 requisitos:
1. COMPROBANTE: La imagen muestra claramente un comprobante de pago completado (recibo de transferencia, voucher bancario, QR con monto confirmado, captura de pago exitoso, etc.). NO aplica si es una foto de producto, captura de app sin transacción completada, o imagen genérica.
2. MONTO CORRECTO: El monto numérico visible en el comprobante coincide con el precio FINAL del producto o servicio discutido en esta conversación. Si el producto tiene descuento, el monto válido es el precio CON descuento aplicado (el precio final que aparece en el catálogo, no el precio original tachado). Compara el número exacto contra el precio final — si no coincide, no registres el pago.

IMPORTANTE — lo que NO debes revisar:
- NO verifiques el nombre del destinatario ni de quién está a nombre el QR o cuenta. Los pagos pueden ir a nombres personales, apodos, o nombres distintos al negocio — eso es completamente normal y válido.
- NO rechaces un comprobante por el banco, app de pago o método usado.
- Solo importa: ¿es un comprobante real? ¿el monto es correcto?

Si ambos requisitos se cumplen:
- Identifica el producto o servicio del catálogo al que corresponde (elige el más probable según la conversación).
- Responde brevemente (1-2 líneas): «¡Gracias! Comprobante recibido y verificado. Tu compra de [nombre_producto] está confirmada 🎉»
- Al FINAL añade EXACTAMENTE (sin espacios extra): [PAYMENT_DETECTED|product_id:{id}|variant_id:{variant_id_o_none}|amount:{monto_numerico}|method_type:{tipo}]
  · product_id: copia el valor exacto de [product_id:...] o [service_id:...] que aparece en el catálogo junto al producto/servicio identificado
  · variant_id: si el producto tiene variantes listadas (ves [variant_id:...] en el catálogo), DEBES poner el variant_id de la variante que compró el cliente. Si el producto tiene una sola variante, usa siempre ese variant_id. Solo escribe "none" si el producto NO tiene variantes en absoluto.
  · amount: el número exacto visible en el comprobante, sin símbolo de moneda (ej: 25.00)
  · method_type: "transfer" | "qr" | "cash" | "card" | "other"

Si algún requisito NO se cumple:
- NO añadas el marcador [PAYMENT_DETECTED]
- Responde: «Gracias por enviarlo, pero el comprobante no coincide con el pago esperado. Por favor envía el comprobante correcto del pago de [producto] por [monto].»`;
  }

  // Construir el base según si hay config estratégica o config libre legacy
  let base: string;
  if (hasStrategicConfig) {
    const identidad = `Eres ${config.agent_name}${business?.business_name ? `, del equipo de ${business.business_name}` : ""}.`;
    base = identidad + "\n\n" + strategicInstructions;
    // Añadir instrucciones adicionales — omitir si contiene variables de plantilla legacy ({{negocio.nombre}})
    const rawExtra = (config.agent_extra_prompt ?? config.system_prompt ?? "").trim();
    const isLegacyTemplate = rawExtra.includes("{{negocio.");
    if (rawExtra && !isLegacyTemplate) base += "\n\n" + rawExtra;
  } else {
    base = config.system_prompt?.trim() ||
      `Eres ${config.agent_name}, un asistente virtual amable. Responde en español neutro, en mensajes breves de 2 a 4 líneas.`;
  }

  // Instrucción de agendamiento: slots frescos en prompt + tool para validar/agendar
  let schedulingInstruction = "";
  if (canSchedule) {
    if (availableSlots.length > 0) {
      const slotList = availableSlots
        .map((s, i) => `${i + 1}. ${s.label} [date:${s.date}|hour:${s.hour}|minute:${s.minute}]`)
        .join("\n");

      let existingSection = "";
      if (existingAppts.length > 0) {
        const lines = existingAppts.map(a => {
          const lbl = formatSlotLabel(a.date, a.hour, a.minute, config.timezone);
          return `- ${lbl}${a.notes ? ` — ${a.notes}` : ""} [appointment_id:${a.id}]`;
        }).join("\n");
        existingSection = `\n\nCITAS YA AGENDADAS DE ESTE CLIENTE:\n${lines}`;
      }

      schedulingInstruction = `\n\nAGENDAMIENTO DE CITAS:
${existingSection}
Los siguientes horarios están disponibles según el sistema (consultados en tiempo real desde el calendario de este negocio, verificados contra citas existentes, bloqueos y anticipación mínima):

${slotList}

REGLAS:
- Presenta hasta 5 opciones cuando el cliente pida disponibilidad.
- Si el cliente pide un día específico, muestra las opciones de ese día. Si no hay ese día, díselo y ofrece las más próximas.
- NUNCA ofrezcas un horario que no esté en la lista.
- Para CONFIRMAR una cita: usa la herramienta check_and_book_slot. Si retorna booked:true, confirma al cliente. Si retorna booked:false, presenta las alternativas que retorna.
- Para MOVER una cita existente: usa check_and_book_slot con reschedule_id del appointment_id de arriba.`;
    } else {
      schedulingInstruction = `\n\nAGENDAMIENTO: No hay horarios disponibles en los próximos días según la configuración actual del calendario. Si el cliente quiere agendar, sugiérele contactar directamente al negocio.`;
    }
  }

  const prompt = base
    .replace(/\{\{negocio\.nombre\}\}/g, business?.business_name ?? "el negocio")
    .replace(/\{\{negocio\.descripcion\}\}/g, business?.description ?? "")
    .replace(/\{\{negocio\.servicios\}\}/g, servicesList)
    .replace(/\{\{contacto\.nombre\}\}/g, conv?.contact_name ?? "cliente")
    .replace(/\{\{fecha\.hoy\}\}/g, now)
    + `\n\nFecha actual: ${now}.`
    + globalRules
    + catalogInstruction
    + paymentInstruction
    + transferInstruction
    + schedulingInstruction
    + labelInstruction;

  const contactName = conv?.contact_name ?? null;
  return { prompt, contactId, contactName, availableSlots };
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

// ─── Transferir conversación a HUMAN y notificar al owner ─────────────────────
async function transferToHuman(
  config: AgentConfig,
  phone: string,
  conversation_id: string,
  clientMessage: string,
  notifySubject: string,
  notifyBody: string,
): Promise<void> {
  try {
    await sendWhatsAppMessage(phone, clientMessage, config);
    await supabase.from("crm_wa_messages").insert({ conversation_id, role: "assistant", content: clientMessage });
  } catch (e) {
    console.error("[ai-agent] error enviando mensaje de transferencia:", e);
  }

  await supabase
    .from("crm_wa_conversations")
    .update({ mode: "HUMAN", last_message_at: new Date().toISOString() })
    .eq("id", conversation_id);

  if (config.notify_on_transfer && config.notify_email) {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const RESEND_FROM = `Acrosoft <${Deno.env.get("RESEND_FROM_EMAIL") ?? "noreply@acrosoftlabs.com"}>`;
    if (RESEND_API_KEY) {
      const { data: conv } = await supabase
        .from("crm_wa_conversations")
        .select("contact_name, phone")
        .eq("id", conversation_id)
        .single();
      const contactLabel = conv?.contact_name ?? conv?.phone ?? phone;
      const crmUrl = Deno.env.get("SITE_URL") ?? "https://app.acrosoftlabs.com";
      const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
<tr><td style="background:#18181b;padding:24px 32px;"><p style="margin:0;color:#ffffff;font-size:18px;font-weight:600;">Acrosoft</p></td></tr>
<tr><td style="padding:32px;">
  <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#18181b;">Chat requiere tu atención</p>
  <p style="margin:0 0 20px;font-size:14px;color:#52525b;line-height:1.6;">
    ${notifyBody.replace(/\n/g, "<br/>")}
  </p>
  <a href="${crmUrl}/crm" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:500;">
    Ir al CRM &rarr; Agente IA
  </a>
  <p style="margin:24px 0 0;font-size:12px;color:#a1a1aa;">Mensaje automático de Acrosoft.</p>
</td></tr>
</table></td></tr></table>
</body></html>`;
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: RESEND_FROM,
          to: [config.notify_email],
          subject: notifySubject,
          html,
        }),
      }).catch(() => {});
    }
  }
}

// ─── Precios por modelo (USD por millón de tokens) ───────────────────────────
// Fuente: console.anthropic.com/settings/usage — cacheWrite = 1.25× input, cacheRead = 0.10× input
const MODEL_PRICES: Record<string, { input: number; output: number; cacheWrite: number; cacheRead: number }> = {
  "claude-haiku-4-5-20251001": { input: 0.25, output: 1.25, cacheWrite: 0.30, cacheRead: 0.03 },
  "claude-haiku-4-5":          { input: 0.25, output: 1.25, cacheWrite: 0.30, cacheRead: 0.03 },
  "claude-3-haiku-20240307":   { input: 0.25, output: 1.25, cacheWrite: 0.30, cacheRead: 0.03 },
  "claude-sonnet-4-5":         { input: 3.00, output: 15.00, cacheWrite: 3.75, cacheRead: 0.30 },
  "claude-sonnet-4-6":         { input: 3.00, output: 15.00, cacheWrite: 3.75, cacheRead: 0.30 },
  "claude-opus-4-7":           { input: 15.00, output: 75.00, cacheWrite: 18.75, cacheRead: 1.50 },
};

// ─── Llamada a Claude (con soporte de visión/PDF + prompt caching) ───────────
async function callClaude(
  systemPrompt: string,
  history: WaMessage[],
  model: string,
  media?: { base64: string; mimeType: string; type: "image" | "document" } | null,
): Promise<{ text: string; inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheCreationTokens: number }> {
  const messages: any[] = history.slice(0, -1).map(m => ({
    role: m.role === "user" ? "user" : "assistant",
    content: m.content,
  }));

  const lastMsg = history[history.length - 1];
  if (lastMsg) {
    if (media) {
      const mediaBlock = media.type === "image"
        ? { type: "image", source: { type: "base64", media_type: media.mimeType, data: media.base64 } }
        : { type: "document", source: { type: "base64", media_type: "application/pdf", data: media.base64 } };

      messages.push({
        role: "user",
        content: [
          mediaBlock,
          { type: "text", text: lastMsg.content || (media.type === "image" ? "¿Qué ves en esta imagen?" : "¿Qué dice este documento?") },
        ],
      });
    } else {
      messages.push({ role: lastMsg.role === "user" ? "user" : "assistant", content: lastMsg.content });
    }
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "prompt-caching-2024-07-31",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 512,
      // El system prompt se cachea por 5 min — ahorra ~90% de tokens de entrada en conversaciones activas
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
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
  return {
    text,
    inputTokens:         json.usage?.input_tokens              ?? 0,
    outputTokens:        json.usage?.output_tokens             ?? 0,
    cacheReadTokens:     json.usage?.cache_read_input_tokens   ?? 0,
    cacheCreationTokens: json.usage?.cache_creation_input_tokens ?? 0,
  };
}

// ─── Herramientas de agendamiento (tool use dinámico) ────────────────────────
// Solo check_and_book_slot como tool — los slots disponibles se inyectan en el system prompt
// (frescos en cada mensaje, consultados desde BD con todas las restricciones reales)
const SCHEDULING_TOOLS = [
  {
    name: "check_and_book_slot",
    description: "Verifica si un horario específico está disponible y lo agenda. Si NO está disponible, retorna horarios alternativos cercanos. Debes llamar a esta herramienta SIEMPRE antes de confirmar una cita al cliente.",
    input_schema: {
      type: "object",
      properties: {
        date:         { type: "string",  description: "Fecha en formato YYYY-MM-DD (copia exacta de la lista de horarios disponibles)" },
        hour:         { type: "integer", description: "Hora en formato 24h (0-23)" },
        minute:       { type: "integer", description: "Minuto (normalmente 0)" },
        contact_name: { type: "string",  description: "Nombre completo del cliente" },
        notes:        { type: "string",  description: "Motivo o notas de la cita (puede estar vacío)" },
        reschedule_id:{ type: "string",  description: "ID de la cita a modificar (solo para reagendamiento)" },
      },
      required: ["date", "hour", "minute", "contact_name"],
    },
  },
];

function makeSchedulingToolExecutor(
  calendarId: string,
  userId: string,
  conversationId: string,
  clientPhone: string,
  contactId: string | null,
  timezone: string,
  preloadedSlots: AvailableSlot[],
  convContactName: string | null,
) {
  return async (name: string, input: any): Promise<string> => {
    if (name === "check_and_book_slot") {
      const { date, hour, minute, notes, reschedule_id } = input;
      const rescheduleId = reschedule_id || null;
      // Filtrar nombres placeholder que Claude podría poner cuando aún no tiene el nombre
      const PLACEHOLDER_NAMES_TOOL = ["pendiente", "n/a", "unknown", "desconocido", "cliente", "sin nombre", "nombre", "por confirmar", "a confirmar"];
      const isPlaceholder = (n: string) => !n || PLACEHOLDER_NAMES_TOOL.includes(n.toLowerCase().trim());
      const rawName: string = input.contact_name ?? "";
      // Si Claude no tiene nombre real → usar el nombre ya guardado en la conversación (si es válido)
      const contact_name = !isPlaceholder(rawName) ? rawName
        : (convContactName && !isPlaceholder(convContactName) ? convContactName : "");

      const validation = await validateSlot(calendarId, date, hour, minute, rescheduleId);

      if (!validation.valid) {
        // Reusar los slots ya cargados en el system prompt para evitar una query extra
        const alts = preloadedSlots.length > 0
          ? preloadedSlots.slice(0, 5)
          : (await getAvailableSlots(calendarId, date)).slots.slice(0, 5);
        return JSON.stringify({
          booked: false,
          reason: validation.reason,
          alternatives: alts.map(s => ({ date: s.date, hour: s.hour, minute: s.minute, label: s.label })),
          message: "El horario solicitado no está disponible. Presenta las alternativas al cliente.",
        });
      }

      const bookResult = await bookAppointmentFromAgent(
        calendarId, userId, conversationId,
        contact_name || clientPhone,
        clientPhone,
        date, hour, minute,
        notes || null,
        rescheduleId,
      );

      if (!bookResult.ok) {
        return JSON.stringify({ booked: false, reason: bookResult.error, message: "Error al agendar." });
      }

      return JSON.stringify({
        booked: true,
        date, hour, minute,
        label: formatSlotLabel(date, hour, minute, timezone),
        message: `Cita ${rescheduleId ? "modificada" : "agendada"} correctamente. Confirma al cliente.`,
      });
    }

    return JSON.stringify({ error: "Tool desconocida" });
  };
}

// ─── Llamada a Claude con soporte de tool use (loop agéntico) ─────────────────
async function callClaudeAgentLoop(
  systemPrompt: string,
  history: WaMessage[],
  model: string,
  tools: any[],
  toolExecutor: (name: string, input: any) => Promise<string>,
  media?: { base64: string; mimeType: string; type: "image" | "document" } | null,
): Promise<{ text: string; inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheCreationTokens: number }> {
  const messages: any[] = history.slice(0, -1).map(m => ({
    role: m.role === "user" ? "user" : "assistant",
    content: m.content,
  }));

  const lastMsg = history[history.length - 1];
  if (lastMsg) {
    if (media) {
      const mediaBlock = media.type === "image"
        ? { type: "image", source: { type: "base64", media_type: media.mimeType, data: media.base64 } }
        : { type: "document", source: { type: "base64", media_type: "application/pdf", data: media.base64 } };
      messages.push({ role: "user", content: [mediaBlock, { type: "text", text: lastMsg.content || "¿Qué ves?" }] });
    } else {
      messages.push({ role: "user", content: lastMsg.content });
    }
  }

  let totalInput = 0, totalOutput = 0, totalCacheRead = 0, totalCacheCreation = 0;

  for (let iteration = 0; iteration < 6; iteration++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 512,
        system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
        tools,
        messages,
      }),
    });

    if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);

    const json = await res.json();
    totalInput        += json.usage?.input_tokens               ?? 0;
    totalOutput       += json.usage?.output_tokens              ?? 0;
    totalCacheRead    += json.usage?.cache_read_input_tokens    ?? 0;
    totalCacheCreation+= json.usage?.cache_creation_input_tokens ?? 0;

    if (json.stop_reason === "end_turn") {
      const textBlock = json.content?.find((b: any) => b.type === "text");
      if (!textBlock?.text) throw new Error("Claude no devolvió texto");
      return { text: textBlock.text, inputTokens: totalInput, outputTokens: totalOutput, cacheReadTokens: totalCacheRead, cacheCreationTokens: totalCacheCreation };
    }

    if (json.stop_reason === "tool_use") {
      const toolBlocks = (json.content as any[]).filter(b => b.type === "tool_use");
      messages.push({ role: "assistant", content: json.content });
      const toolResults = await Promise.all(toolBlocks.map(async (block: any) => ({
        type: "tool_result",
        tool_use_id: block.id,
        content: await toolExecutor(block.name, block.input),
      })));
      messages.push({ role: "user", content: toolResults });
      continue;
    }

    throw new Error(`stop_reason inesperado: ${json.stop_reason}`);
  }

  throw new Error("Máximo de iteraciones de tool use alcanzado");
}

// ─── Entry point ───────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  let body: {
    conversation_id: string;
    tenant_user_id: string;
    phone: string;
    media_base64?: string;
    media_mime_type?: string;
    media_type?: string;
  };
  try {
    body = await req.json();
  } catch {
    return new Response("bad json", { status: 400 });
  }

  const { conversation_id, tenant_user_id, phone, media_base64, media_mime_type, media_type } = body;
  const media = (media_base64 && media_mime_type && media_type)
    ? { base64: media_base64, mimeType: media_mime_type, type: media_type as "image" | "document" }
    : null;
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
      const offMsg = toWhatsAppFormat(config.off_hours_message?.trim() ||
        "Gracias por escribirnos. En este momento estamos fuera del horario de atención. Te responderemos a la brevedad.");
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

    // 3. Cargar historial reciente (últimos 15 mensajes — balance contexto/costo)
    const { data: rawHistory } = await supabase
      .from("crm_wa_messages")
      .select("role, content")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: false })
      .limit(15);

    const history: WaMessage[] = ((rawHistory ?? []) as WaMessage[]).reverse();

    // 4. Construir system prompt con catálogo, variables y etiquetas
    const t0 = Date.now();
    const { prompt: systemPrompt, contactId: convContactId, contactName: convContactName, availableSlots: preloadedSlots } =
      await buildSystemPrompt(config as AgentConfig, phone, config.can_transfer_human ?? false);

    // 5. Llamar a Claude — con tool use para agendamiento, sin tools para el resto
    const model = "claude-haiku-4-5-20251001";
    const canSchedule = !!(config.can_book_appointments && config.scheduling_calendar_id);

    let rawReply: string;
    let inputTokens: number, outputTokens: number, cacheReadTokens: number, cacheCreationTokens: number;

    if (canSchedule) {
      // contactId ya viene del buildSystemPrompt — no hay query duplicada
      const toolExecutor = makeSchedulingToolExecutor(
        config.scheduling_calendar_id!, tenant_user_id, conversation_id,
        phone, convContactId, config.timezone ?? "UTC",
        preloadedSlots, convContactName,
      );
      ({ text: rawReply, inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens } =
        await callClaudeAgentLoop(systemPrompt, history, model, SCHEDULING_TOOLS, toolExecutor, media));
    } else {
      ({ text: rawReply, inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens } =
        await callClaude(systemPrompt, history, model, media));
    }

    console.log(`[ai-agent] Claude respondió en ${Date.now() - t0}ms tokens:${inputTokens}in/${outputTokens}out cacheRead:${cacheReadTokens} cacheWrite:${cacheCreationTokens}`);

    const _prices = MODEL_PRICES[model] ?? { input: 0.25, output: 1.25, cacheWrite: 0.30, cacheRead: 0.03 };
    const _costUsd = (inputTokens * _prices.input + outputTokens * _prices.output + cacheCreationTokens * _prices.cacheWrite + cacheReadTokens * _prices.cacheRead) / 1_000_000;
    supabase.from("crm_ai_usage_log").insert({ user_id: tenant_user_id, conversation_id, model, input_tokens: inputTokens, output_tokens: outputTokens, cache_read_tokens: cacheReadTokens, cache_creation_tokens: cacheCreationTokens, cost_usd: _costUsd }).then(() => {}).catch(() => {});

    // 6. Extraer marcadores del reply (agendamiento ya fue procesado por tool use)
    const { text: withoutPayment, payment } = parseAndStripPayment(rawReply);
    const { text: withoutNoPayment, hasNoPayment } = parseAndStripNoPayment(withoutPayment);
    const { text: withoutQr, qrIds } = parseAndStripQrMarkers(withoutNoPayment);
    const { text: withoutContactData, contactData } = parseAndStripContactData(withoutQr);
    const { text: replyRaw, labelNames } = parseAndStripLabels(withoutContactData);

    // 6a. [TRANSFER] — verificar sobre el texto limpio (sin marcadores ni etiquetas)
    if (config.can_transfer_human && /^\[TRANSFER\]\s*$/i.test(replyRaw.trim())) {
      console.log(`[ai-agent] IA detectó intención de hablar con humano → HUMAN para ${phone}`);
      const waitingMsg = "Entendido, en un momento te contacta alguien de nuestro equipo 😊";
      await transferToHuman(config as AgentConfig, phone, conversation_id, waitingMsg,
        `💬 Chat requiere atención`,
        `El cliente solicitó hablar con una persona. Conversación transferida a modo Manual.`);
      return new Response(JSON.stringify({ ok: true, reason: "ai_transfer" }), { status: 200 });
    }

    // 7. Convertir Markdown → WhatsApp
    const reply = toWhatsAppFormat(replyRaw);

    // 8 & 9. Solo guardar y enviar texto si hay contenido (puede ser vacío si Claude solo envió marcadores)
    let savedMsg: { id: string } | null = null;
    if (reply.trim()) {
      const { data } = await supabase
        .from("crm_wa_messages")
        .insert({ conversation_id, role: "assistant", content: reply })
        .select()
        .single();
      savedMsg = data;

      try {
        const { wa_message_id } = await sendWhatsAppMessage(phone, reply, config as AgentConfig);
        if (savedMsg) await supabase.from("crm_wa_messages").update({ wa_message_id }).eq("id", savedMsg.id);
      } catch (sendErr: any) {
        console.error("[ai-agent] error enviando texto:", sendErr.message);
        if (savedMsg) await supabase.from("crm_wa_messages").update({ send_error: String(sendErr.message) }).eq("id", savedMsg.id);
      }
    }

    // 9b. Enviar imágenes QR (una por cada marcador [SEND_QR:id])
    for (const qrId of qrIds) {
      const { data: pm } = await supabase.from("crm_payment_methods").select("content, label").eq("id", qrId).single();
      if (pm?.content) {
        await sendWhatsAppImage(phone, pm.content, null, config as AgentConfig);
        await supabase.from("crm_wa_messages").insert({
          conversation_id, role: "assistant",
          content: "[Imagen]",
          media_type: "image",
          media_url: pm.content,
        });
      }
    }

    // 10b. Etiquetas automáticas (fire & forget)
    if (labelNames.length > 0) {
      applyAutoLabels(tenant_user_id, conversation_id, labelNames).catch(err =>
        console.error("[ai-agent] error labels:", err.message)
      );
    }

    // 10c. Si Claude recopiló datos del prospecto → guardar en crm_contacts
    if (contactData && Object.keys(contactData).length > 0 && config.can_create_contacts) {
      try {
        const { data: convRow } = await supabase
          .from("crm_wa_conversations")
          .select("contact_id, contact_name")
          .eq("id", conversation_id)
          .single();

        let contactId = convRow?.contact_id ?? null;

        if (!contactId) {
          // Crear contacto nuevo
          const contactName = contactData["nombre"] ?? contactData["name"] ?? convRow?.contact_name ?? phone;
          const { data: newContact } = await supabase
            .from("crm_contacts")
            .insert({
              user_id: tenant_user_id,
              name: contactName,
              phone,
              email: contactData["email"] ?? null,
              company: contactData["empresa"] ?? contactData["company"] ?? null,
              ai_collected_data: contactData,
            })
            .select("id")
            .single();

          if (newContact) {
            contactId = newContact.id;
            await supabase
              .from("crm_wa_conversations")
              .update({ contact_id: newContact.id })
              .eq("id", conversation_id);
            console.log(`[ai-agent] contacto creado: ${newContact.id}`);
          }
        } else {
          // Fusionar nuevos datos con los existentes
          const { data: existing } = await supabase
            .from("crm_contacts")
            .select("ai_collected_data")
            .eq("id", contactId)
            .single();

          const merged = { ...(existing?.ai_collected_data ?? {}), ...contactData };
          await supabase
            .from("crm_contacts")
            .update({ ai_collected_data: merged })
            .eq("id", contactId);
          console.log(`[ai-agent] datos de contacto actualizados: ${contactId}`);
        }
      } catch (e: any) {
        console.error("[ai-agent] error guardando datos del contacto:", e.message);
      }
    }

    // 10d. Si Claude detectó un comprobante de pago → crear venta en CRM
    if (payment && !isNaN(payment.amount) && payment.product_id) {
      console.log(`[ai-agent] pago detectado → item_id:${payment.product_id} amount:${payment.amount} auto:${config.auto_detect_payments}`);
      try {
        const { data: convData } = await supabase
          .from("crm_wa_conversations")
          .select("contact_id, contact_name")
          .eq("id", conversation_id)
          .single();

        // Resolver si el UUID es un producto o un servicio — incluir precio y stock para validación
        const itemId = payment.product_id;
        const { data: productRow } = await supabase
          .from("crm_products")
          .select("id, name, currency, price, discount_pct, stock_enabled, stock")
          .eq("id", itemId)
          .eq("user_id", config.user_id)
          .eq("is_active", true)
          .maybeSingle();

        let serviceRow: { id: string; name: string; currency: string | null; price: number; discount_pct: number | null } | null = null;
        if (!productRow) {
          const { data } = await supabase
            .from("crm_services")
            .select("id, name, currency, price, discount_pct")
            .eq("id", itemId)
            .eq("user_id", config.user_id)
            .eq("active", true)
            .maybeSingle();
          serviceRow = data;
        }

        if (!productRow && !serviceRow) {
          console.error(`[ai-agent] item_id ${itemId} no existe/no está activo — venta no registrada`);
        } else {
          const isProduct = !!productRow;
          const itemInfo = productRow ?? serviceRow!;

          // Resolver variante con precio y stock reales
          let variantName = "";
          let variantPrice: number | null = null;
          let variantStock: number | null = null;
          if (isProduct) {
            // Si Claude no detectó variante pero el producto tiene variantes, consultar todas
            // y auto-seleccionar si hay solo una (caso común: 1 variante sin que el cliente la mencione)
            let resolvedVariantId = payment.variant_id || null;

            if (!resolvedVariantId) {
              const { data: allVariants } = await supabase
                .from("crm_product_variants")
                .select("id, name, price_override, discount_pct, stock")
                .eq("product_id", itemId)
                .order("sort_order");

              if (allVariants?.length === 1) {
                // Único variante disponible → auto-seleccionar
                resolvedVariantId = allVariants[0].id;
                console.log(`[ai-agent] variante auto-seleccionada: ${resolvedVariantId} (única del producto)`);
              }
              // Si hay múltiples variantes y Claude no indicó cuál → variant_id queda null
            }

            if (resolvedVariantId) {
              // Actualizar payment.variant_id para que el stock se decremente correctamente
              payment.variant_id = resolvedVariantId;

              const { data: vRow } = await supabase
                .from("crm_product_variants")
                .select("name, price_override, discount_pct, stock")
                .eq("id", resolvedVariantId)
                .single();
              if (vRow) {
                variantName = ` (${vRow.name})`;
                // Precio final de la variante (misma lógica que el frontend)
                const vBase = vRow.price_override != null ? vRow.price_override : (itemInfo as any).price;
                const vDisc = (vRow.discount_pct ?? 0) > 0 ? (vRow.discount_pct ?? 0)
                  : (vRow.price_override == null ? ((itemInfo as any).discount_pct ?? 0) : 0);
                variantPrice = vDisc > 0 ? +(vBase * (1 - vDisc / 100)).toFixed(2) : vBase;
                variantStock = vRow.stock ?? null;
              }
            }
          }

          // Precio esperado del ítem (producto base o variante)
          const disc = (itemInfo as any).discount_pct ?? 0;
          const basePrice = (itemInfo as any).price ?? 0;
          const expectedPrice = variantPrice ?? (disc > 0 ? +(basePrice * (1 - disc / 100)).toFixed(2) : basePrice);

          // Validar stock antes de crear la venta (modelo B16-4)
          // has_variants=true → tracking por variante, ignorar product.stock_enabled
          // has_variants=false → tracking por product.stock_enabled + product.stock
          if (isProduct) {
            const hasVariants = !!(productRow as any).has_variants;
            let outOfStock = false;

            if (hasVariants) {
              // Variante resuelta y sin stock → bloquear
              if (payment.variant_id && variantStock !== null && variantStock <= 0) {
                outOfStock = true;
              }
              // Si no hay variante resuelta (múltiples variantes) → no bloqueamos aquí;
              // el agente debería haber pedido al cliente que elija variante
            } else {
              const pStockEnabled = (productRow as any).stock_enabled;
              const pStock = (productRow as any).stock;
              if (pStockEnabled && pStock !== null && pStock <= 0) {
                outOfStock = true;
              }
            }

            if (outOfStock) {
              console.warn(`[ai-agent] producto/variante sin stock — venta no registrada: ${itemId} variant:${payment.variant_id}`);
              try {
                const noStockMsg = toWhatsAppFormat("Lo sentimos, ese producto ya no está disponible en este momento.");
                await sendWhatsAppMessage(phone, noStockMsg, config as AgentConfig);
                await supabase.from("crm_wa_messages").insert({ conversation_id, role: "assistant", content: noStockMsg });
              } catch {}
              return new Response(JSON.stringify({ ok: true, reason: "out_of_stock" }), { status: 200 });
            }
          }

          // Validar que el monto reportado por Claude sea razonable (≥ 90% del precio esperado)
          // Solo cuando auto_detect_payments está ON — si está OFF el admin lo revisa manualmente
          const autoConfirm = config.auto_detect_payments ?? false;
          if (autoConfirm && expectedPrice > 0) {
            const ratio = payment.amount / expectedPrice;
            if (ratio < 0.9) {
              console.warn(`[ai-agent] monto sospechoso: reportado=${payment.amount} esperado=${expectedPrice} ratio=${ratio.toFixed(2)} → forzando revisión manual`);
              (payment as any)._forceReview = true;
            }
          }

          const saleStatus = (autoConfirm && !(payment as any)._forceReview) ? "confirmed" : "pending_review";
          const now = new Date().toISOString();

          // Re-consultar conversación para obtener contact_id más actualizado
          // (puede haber sido actualizado en pasos anteriores del mismo ciclo)
          const { data: freshConv } = await supabase
            .from("crm_wa_conversations")
            .select("contact_id, contact_name")
            .eq("id", conversation_id)
            .single();
          const resolvedContactId = freshConv?.contact_id ?? convData?.contact_id ?? null;
          const resolvedContactName = freshConv?.contact_name ?? convData?.contact_name ?? null;

          const salePayload: Record<string, unknown> = {
            user_id: config.user_id,
            type: "initial",                                          // campo requerido, siempre "initial" para ventas IA
            product_id: isProduct ? itemId : null,
            product_variant_id: isProduct ? (payment.variant_id ?? null) : null,
            product_name: isProduct ? (itemInfo.name + variantName) : null,
            service_id: !isProduct ? itemId : null,
            service_name: !isProduct ? itemInfo.name : null,
            wa_conversation_id: conversation_id,
            amount: payment.amount,
            currency: itemInfo.currency ?? "USD",
            status: saleStatus,
            is_ai_sale: true,
            is_paid: autoConfirm && !(payment as any)._forceReview,
            paid_at: (autoConfirm && !(payment as any)._forceReview) ? now : null,
            contact_id: resolvedContactId,
            contact_name: resolvedContactName,
            payment_method_type: payment.method_type,
            commission_pct: 0,                                        // ventas IA no aplican comisión por defecto
          };

          const { data: newSale, error: saleErr } = await supabase
            .from("crm_sales")
            .insert(salePayload)
            .select("id")
            .single();

          if (saleErr) {
            console.error("[ai-agent] error creando venta:", saleErr.message);
          }

          if (newSale) {
            console.log(`[ai-agent] venta creada: ${newSale.id} status:${saleStatus}`);

            const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
            const itemName = itemInfo.name ?? (isProduct ? "producto" : "servicio");
            const amountFormatted = formatPrice(payment.amount, itemInfo.currency ?? null);

            const isConfirmed = saleStatus === "confirmed";
            const emailSubject = isConfirmed
              ? `Venta confirmada por Agente IA: ${itemName}`
              : `Acción requerida: pago pendiente de confirmación – ${itemName}`;
            const emailHtml = isConfirmed
              ? `<p>El agente IA confirmó una venta de <strong>${itemName}</strong> por <strong>${amountFormatted}</strong>.</p><p>El entregable (si aplica) ya fue enviado al cliente por WhatsApp.</p>`
              : `<p>El agente IA recibió un comprobante de pago para <strong>${itemName}</strong> por <strong>${amountFormatted}</strong>.</p><p>Entra al CRM y revisa los chats del Agente IA para confirmar o rechazar este pago.</p>`;

            // Query fresca y explícita para email — bypassa cualquier problema de schema cache
            const { data: emailRow } = await supabase
              .from("crm_ai_agent_config")
              .select("payment_notify_email, notify_email")
              .eq("user_id", config.user_id)
              .single();
            const saleToEmail: string | null =
              (emailRow as any)?.payment_notify_email ||
              (emailRow as any)?.notify_email ||
              null;
            console.log(`[ai-agent] saleToEmail=${saleToEmail}`);

            // Email fire-and-forget ANTES de Promise.allSettled — mismo patrón que notificaciones de transferencia
            // El fetch (~800ms) completa durante los ~1001ms que tarda send-deliverable en paralelo
            const _RESEND_KEY = Deno.env.get("RESEND_API_KEY");
            const _RESEND_FROM = `Acrosoft <${Deno.env.get("RESEND_FROM_EMAIL") ?? "noreply@acrosoftlabs.com"}>`;
            if (_RESEND_KEY && saleToEmail) {
              fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: { Authorization: `Bearer ${_RESEND_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({ from: _RESEND_FROM, to: [saleToEmail], subject: emailSubject, html: emailHtml }),
              }).then(async r => console.log(`[ai-agent] sale email sent: ${r.status} ${(await r.text()).slice(0,60)}`)).catch(e => console.error("[ai-agent] sale email error:", e.message));
            } else {
              console.warn(`[ai-agent] sale email omitido — key:${!!_RESEND_KEY} to:${saleToEmail}`);
            }

            // Ejecutar en paralelo: entregable + stock
            await Promise.allSettled([
              // Entregable solo si la venta quedó confirmed (no pending_review por monto sospechoso)
              ...(isConfirmed && isProduct ? [
                supabase.functions.invoke("send-deliverable", {
                  body: { sale_id: newSale.id },
                  headers: { "x-internal-key": SERVICE_ROLE_KEY },
                }).then(r => {
                  if (r.error) console.error("[ai-agent] send-deliverable error:", r.error);
                  else console.log("[ai-agent] send-deliverable: ok");
                }),
              ] : []),

              // Decrementar stock siempre que sea un producto con stock habilitado
              // (tanto auto-confirm como pending_review — evita vender lo mismo dos veces)
              ...(isProduct ? [
                supabase.rpc("decrement_sale_stock", {
                  p_product_id: itemId,
                  p_variant_id: payment.variant_id ?? null,
                }).catch(e => console.error("[ai-agent] stock decrement error:", e)),
              ] : []),
            ]);
          }
        }
      } catch (payErr: any) {
        console.error("[ai-agent] error procesando pago:", payErr.message);
      }
    }

    // 10e. Si Claude detectó que no hay métodos de pago → transferir a HUMAN
    if (hasNoPayment) {
      console.log(`[ai-agent] sin método de pago detectado → HUMAN para ${phone}`);
      await supabase
        .from("crm_wa_conversations")
        .update({ mode: "HUMAN", last_message_at: new Date().toISOString() })
        .eq("id", conversation_id);
      if (config.notify_on_transfer && config.notify_email) {
        const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
        const RESEND_FROM = `Acrosoft <${Deno.env.get("RESEND_FROM_EMAIL") ?? "noreply@acrosoftlabs.com"}>`;
        if (RESEND_API_KEY) {
          const crmUrl = Deno.env.get("SITE_URL") ?? "https://app.acrosoftlabs.com";
          fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: RESEND_FROM,
              to: [config.notify_email],
              subject: `💳 Cliente quiere comprar — envíale los métodos de pago`,
              html: `<p>Un cliente en WhatsApp quiere comprar pero no hay métodos de pago configurados para ese producto/servicio.</p><p><a href="${crmUrl}/crm">Ir al CRM para enviarle los datos →</a></p>`,
            }),
          }).catch(() => {});
        }
      }
      return new Response(JSON.stringify({ ok: true, reason: "no_payment" }), { status: 200 });
    }

    // 11. Actualizar last_message_at
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
