import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractContact(fields: any[], data: Record<string, any>) {
  let name = "", email = "", phone = "", firstTextFieldId: string | null = null;
  for (const field of fields) {
    const raw = data?.[field.id];
    if (raw === undefined || raw === null || Array.isArray(raw)) continue;
    const val = String(raw).trim();
    if (!val) continue;
    if (field.type === "email" && !email) { email = val; continue; }
    if (field.type === "phone" && !phone) { phone = val; continue; }
    if (field.type === "text") {
      if (field.locked && !name) { name = val; continue; }
      if (!firstTextFieldId) firstTextFieldId = field.id;
    }
  }
  if (!name) {
    for (const field of fields) {
      if (field.type !== "text") continue;
      const label = String(field.label ?? "").toLowerCase();
      if ((label.includes("nombre") || label.includes("name")) && data?.[field.id]) {
        const val = String(data[field.id]).trim();
        if (val) { name = val; break; }
      }
    }
  }
  if (!name && firstTextFieldId && data?.[firstTextFieldId]) name = String(data[firstTextFieldId]).trim();
  if (!name)  name  = String(data?.name  ?? data?.["f-name"]  ?? "").trim();
  if (!email) email = String(data?.email ?? data?.["f-email"] ?? "").trim();
  if (!phone) phone = String(data?.phone ?? data?.["f-phone"] ?? "").trim();
  return { name, email, phone };
}

const SCHEDULE_KEY = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function amPmToMinutes(t: string): number {
  const [timePart, period] = t.split(" ");
  const [h, m] = timePart.split(":").map(Number);
  const h24 = period === "AM" ? (h === 12 ? 0 : h) : (h === 12 ? 12 : h + 12);
  return h24 * 60 + (m || 0);
}

function slotFitsAvailability(
  avail: any,
  dayOfWeek: number,
  slotStartMin: number,
  duration: number,
): boolean {
  if (!avail || typeof avail !== "object") return true;
  const day = avail[SCHEDULE_KEY[dayOfWeek]];
  if (!day?.open) return false;
  const slotEndMin = slotStartMin + duration;
  const slots = (day.slots as { from: string; to: string }[] | undefined) ?? [];
  return slots.some((s) => {
    const from = amPmToMinutes(s.from);
    const to   = amPmToMinutes(s.to);
    return slotStartMin >= from && slotEndMin <= to;
  });
}

function isBlockedBySlots(
  blocks: any[],
  dateKey: string,
  slotStartMin: number,
): boolean {
  return blocks.some((b) => {
    if (b.type === "fullday" && b.date === dateKey) return true;
    if (b.type === "range" && b.range_start && b.range_end) {
      return dateKey >= b.range_start && dateKey <= b.range_end;
    }
    if (b.type === "hours" && b.date === dateKey && b.start_hour != null && b.end_hour != null) {
      const startTotal = b.start_hour * 60 + (b.start_minute ?? 0);
      const endTotal   = b.end_hour   * 60 + (b.end_minute   ?? 0);
      return slotStartMin >= startTotal && slotStartMin < endTotal;
    }
    return false;
  });
}

async function addContactToPipelines(
  userId: string,
  contactId: string,
  pipelineIds: string[],
): Promise<void> {
  try {
    let pipelines: { id: string; column_names: string[] }[] = [];

    if (pipelineIds.length > 0) {
      const { data } = await supabase
        .from("crm_pipelines")
        .select("id, column_names")
        .eq("user_id", userId)
        .eq("type", "contacts")
        .in("id", pipelineIds);
      pipelines = data ?? [];
    } else {
      const { data } = await supabase
        .from("crm_pipelines")
        .select("id, column_names")
        .eq("user_id", userId)
        .eq("type", "contacts")
        .order("created_at", { ascending: true })
        .limit(1);
      pipelines = data ?? [];
    }

    if (!pipelines.length) return;

    for (const pipeline of pipelines) {
      const firstStage = (pipeline.column_names as string[])?.[0];
      if (!firstStage) continue;

      await supabase
        .from("crm_contact_pipeline_memberships")
        .upsert(
          { contact_id: contactId, pipeline_id: pipeline.id, stage: firstStage, position: 0 },
          { onConflict: "contact_id,pipeline_id", ignoreDuplicates: true },
        );
    }
  } catch (e) {
    console.error("addContactToPipelines (non-fatal):", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { calendar_id, date, hour, minute: rawMinute, form_data } = await req.json();
    const minute: number = typeof rawMinute === "number" ? rawMinute : 0;
    if (!calendar_id || !date || hour == null) {
      return respond({ error: "calendar_id, date and hour are required" }, 400);
    }

    const { data: calendar, error: calError } = await supabase
      .from("crm_calendar_config")
      .select("user_id, duration_min, buffer_min, min_advance_hours, max_future_days, name, linked_form_id, availability, reminder_rules")
      .eq("id", calendar_id)
      .single();

    if (calError || !calendar) return respond({ error: "Calendar not found" }, 404);

    const duration: number = calendar.duration_min ?? 30;
    const buffer: number   = (calendar as any).buffer_min ?? 0;
    const minAdvanceHours: number = (calendar as any).min_advance_hours ?? 1;
    const maxFutureDays: number   = (calendar as any).max_future_days ?? 60;

    // TODO(F-5): replace hardcoded La Paz offset with calendar.timezone (IANA).
    // All existing calendars are America/La_Paz (UTC-4, no DST).
    const TZ_OFFSET_HOURS = -4;
    const TZ_OFFSET_MS = TZ_OFFSET_HOURS * 3600_000;

    const [yy, mm, dd] = date.split("-").map(Number);
    // Booking local wall-clock → absolute UTC ms (La Paz = UTC-4, so UTC = local + 4h)
    const scheduledMs = Date.UTC(yy, mm - 1, dd, hour, minute) - TZ_OFFSET_MS;
    const nowMs = Date.now();

    if (scheduledMs < nowMs + minAdvanceHours * 3600_000) {
      return respond({ error: `Debe reservar con al menos ${minAdvanceHours}h de anticipación` }, 422);
    }

    // "Today" in the business timezone
    const nowLocal = new Date(nowMs + TZ_OFFSET_MS);
    const tyr = nowLocal.getUTCFullYear();
    const tmo = nowLocal.getUTCMonth();
    const tdy = nowLocal.getUTCDate();
    const maxMs = Date.UTC(tyr, tmo, tdy + maxFutureDays);
    const bookingMs = Date.UTC(yy, mm - 1, dd);
    if (bookingMs > maxMs) {
      return respond({ error: `No se puede reservar más allá de ${maxFutureDays} días en el futuro` }, 422);
    }

    const requestedStart   = hour * 60 + minute;
    const requestedEnd     = requestedStart + duration;

    // Validate the slot fits the weekly availability (day open + slot_start+duration within open range).
    // L-26: catches the past-closing case (e.g., 17:30 + 60 min when business closes at 18:00).
    const dayOfWeek = new Date(Date.UTC(yy, mm - 1, dd)).getUTCDay();
    if (!slotFitsAvailability((calendar as any).availability, dayOfWeek, requestedStart, duration)) {
      return respond({ error: "El horario solicitado está fuera de la disponibilidad del calendario" }, 422);
    }

    // Validate against user-defined blocked slots (hours / fullday / range).
    const { data: blocks } = await supabase
      .from("crm_blocked_slots")
      .select("type, date, start_hour, start_minute, end_hour, end_minute, range_start, range_end")
      .eq("calendar_id", calendar_id);

    if (isBlockedBySlots(blocks ?? [], date, requestedStart)) {
      return respond({ error: "El horario solicitado está reservado" }, 409);
    }

    const { data: dayAppts } = await supabase
      .from("crm_appointments")
      .select("hour, minute, duration_min")
      .eq("calendar_id", calendar_id)
      .eq("date", date)
      .neq("status", "cancelled");

    const hasConflict = (dayAppts ?? []).some((a: any) => {
      const aStart = a.hour * 60 + (a.minute ?? 0);
      const aEnd   = aStart + (a.duration_min ?? duration);
      return requestedEnd + buffer > aStart && aEnd + buffer > requestedStart;
    });

    if (hasConflict) return respond({ error: "Slot already booked" }, 409);

    let fields: any[] = [];
    let formPipelineIds: string[] = [];
    if (calendar.linked_form_id) {
      const { data: form } = await supabase
        .from("crm_forms")
        .select("fields, pipeline_ids")
        .eq("id", calendar.linked_form_id)
        .single();
      if (form) {
        if (Array.isArray(form.fields)) fields = form.fields as any[];
        if (Array.isArray((form as any).pipeline_ids)) formPipelineIds = (form as any).pipeline_ids;
      }
    }

    const { name, email, phone } = extractContact(fields, form_data ?? {});

    const formKey = calendar.linked_form_id ?? "booking";
    const formDataToStore = form_data && Object.keys(form_data).length > 0
      ? { [formKey]: form_data } : {};

    let contactId: string | null = null;
    let isNewContact = false;

    if (email) {
      const { data: existingContact } = await supabase
        .from("crm_contacts")
        .select("id, custom_fields")
        .eq("user_id", calendar.user_id)
        .eq("email", email)
        .maybeSingle();

      if (existingContact) {
        contactId = existingContact.id;
        const mergedFields = { ...((existingContact.custom_fields as object) ?? {}), ...formDataToStore };
        await supabase.from("crm_contacts").update({
          ...(name ? { name } : {}),
          ...(phone ? { phone } : {}),
          custom_fields: mergedFields,
        }).eq("id", contactId);
      } else {
        isNewContact = true;
        const { data: nc } = await supabase.from("crm_contacts").insert({
          user_id: calendar.user_id, name: name || "Sin nombre", email,
          phone: phone || null, tags: [], stage: null,
          company: null, notes: null, custom_fields: formDataToStore,
        }).select("id").single();
        contactId = nc?.id ?? null;
      }
    } else if (name) {
      isNewContact = true;
      const { data: nc } = await supabase.from("crm_contacts").insert({
        user_id: calendar.user_id, name, email: null,
        phone: phone || null, tags: [], stage: null,
        company: null, notes: null, custom_fields: formDataToStore,
      }).select("id").single();
      contactId = nc?.id ?? null;
    }

    if (isNewContact && contactId) {
      await addContactToPipelines(calendar.user_id, contactId, formPipelineIds);
    }

    const { data: appointment, error: apptError } = await supabase
      .from("crm_appointments")
      .insert({
        user_id: calendar.user_id, contact_id: contactId,
        calendar_id, date, hour, minute, duration_min: calendar.duration_min ?? 30,
        service: null, status: "confirmed", notes: null,
      })
      .select("id")
      .single();

    if (apptError) throw apptError;

    try {
      await supabase.from("crm_logs").insert({
        user_id: calendar.user_id,
        action: "create",
        entity: "appointment",
        entity_id: appointment.id,
        description: `Cita agendada con ${name || email || "cliente"} el ${date} a las ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} hs vía ${calendar.name ?? "calendario"}`,
      });
    } catch (e) {
      console.error("Log insert (non-fatal):", e);
    }

    // ── Fire on_booking confirmation rules immediately ────────────────────────
    try {
      const allRules = ((calendar as any).reminder_rules ?? []) as any[];
      const onBookingRules = allRules.filter((r: any) => r.timing === "on_booking");

      if (onBookingRules.length > 0) {
        const nowIso = new Date().toISOString();
        let queued = 0;

        for (const rule of onBookingRules) {
          if (rule.recipient === "contact") {
            const channelValue = rule.channel === "email" ? (email || null) : (phone || null);
            if (!channelValue) continue;
            const msg = `Hola ${name || "Cliente"}, confirmamos tu cita el ${date} a las ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} hs con ${calendar.name ?? "nosotros"}.`;
            const { data: rem } = await supabase.from("crm_reminders").insert({
              user_id: calendar.user_id, appointment_id: appointment.id, contact_id: contactId,
              type: rule.channel,
              recipient_email: rule.channel === "email" ? channelValue : null,
              recipient_phone: rule.channel === "whatsapp" ? channelValue : null,
              scheduled_at: nowIso, message: msg, status: "pending", is_auto: true,
              business_target: `rule:${calendar_id}:${rule.id}:contact`,
            }).select("id").single();
            if (rem?.id) { await supabase.from("crm_reminder_queue").insert({ reminder_id: rem.id }); queued++; }

          } else {
            const targets: string[] = rule.businessTargets?.length
              ? rule.businessTargets
              : rule.businessTarget ? [rule.businessTarget] : ["admin"];

            for (const targetId of targets) {
              let channelValue = "";
              if (targetId === "admin") {
                const { data: profile } = await supabase
                  .from("crm_business_profile").select("contact_email, contact_phone, whatsapp")
                  .eq("user_id", calendar.user_id).single();
                channelValue = rule.channel === "email"
                  ? (profile?.contact_email ?? "")
                  : (profile?.contact_phone ?? (profile as any)?.whatsapp ?? "");
              } else {
                const { data: staff } = await supabase
                  .from("crm_staff").select("email, phone").eq("id", targetId).single();
                channelValue = rule.channel === "email" ? (staff?.email ?? "") : (staff?.phone ?? "");
              }
              if (!channelValue) continue;
              const msg = `Cita confirmada: ${name || email || "Cliente"} el ${date} a las ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} hs.`;
              const { data: rem } = await supabase.from("crm_reminders").insert({
                user_id: calendar.user_id, appointment_id: appointment.id, contact_id: contactId,
                type: rule.channel,
                recipient_email: rule.channel === "email" ? channelValue : null,
                recipient_phone: rule.channel === "whatsapp" ? channelValue : null,
                scheduled_at: nowIso, message: msg, status: "pending", is_auto: true,
                business_target: `rule:${calendar_id}:${rule.id}:${targetId}`,
              }).select("id").single();
              if (rem?.id) { await supabase.from("crm_reminder_queue").insert({ reminder_id: rem.id }); queued++; }
            }
          }
        }

        if (queued > 0) {
          const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
          const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
          fetch(`${supabaseUrl}/functions/v1/send-reminders`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
          }).catch(() => {});
        }
      }
    } catch (e) {
      console.error("on_booking reminders (non-fatal):", e);
    }

    return respond({ appointment_id: appointment.id, contact_id: contactId });
  } catch (err) {
    console.error(err);
    return respond({ error: "Internal server error" }, 500);
  }
});
