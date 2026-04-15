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

/**
 * Contacts pipeline uses crm_contacts.stage — NOT crm_pipeline_deals.
 */
async function addContactToPipeline(userId: string, contactId: string): Promise<void> {
  try {
    const { data: pipelines } = await supabase
      .from("crm_pipelines")
      .select("id, column_names")
      .eq("user_id", userId)
      .eq("type", "contacts")
      .order("created_at", { ascending: true })
      .limit(1);

    if (!pipelines?.length) return;
    const firstStage = (pipelines[0].column_names as string[])?.[0];
    if (!firstStage) return;

    await supabase
      .from("crm_contacts")
      .update({ stage: firstStage })
      .eq("id", contactId)
      .is("stage", null);
  } catch (e) {
    console.error("addContactToPipeline (non-fatal):", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { calendar_id, date, hour, form_data } = await req.json();
    if (!calendar_id || !date || hour == null) {
      return respond({ error: "calendar_id, date and hour are required" }, 400);
    }

    const { data: calendar, error: calError } = await supabase
      .from("crm_calendar_config")
      .select("user_id, duration_min, name, linked_form_id")
      .eq("id", calendar_id)
      .single();

    if (calError || !calendar) return respond({ error: "Calendar not found" }, 404);

    const { data: existing } = await supabase
      .from("crm_appointments")
      .select("id")
      .eq("user_id", calendar.user_id)
      .eq("date", date)
      .eq("hour", hour)
      .neq("status", "cancelled")
      .maybeSingle();

    if (existing) return respond({ error: "Slot already booked" }, 409);

    let fields: any[] = [];
    if (calendar.linked_form_id) {
      const { data: form } = await supabase
        .from("crm_forms")
        .select("fields")
        .eq("id", calendar.linked_form_id)
        .single();
      if (form && Array.isArray(form.fields)) fields = form.fields as any[];
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
      await addContactToPipeline(calendar.user_id, contactId);
    }

    const { data: appointment, error: apptError } = await supabase
      .from("crm_appointments")
      .insert({
        user_id: calendar.user_id, contact_id: contactId,
        calendar_id, date, hour, duration_min: calendar.duration_min ?? 30,
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
        description: `Cita agendada con ${name || email || "cliente"} el ${date} a las ${String(hour).padStart(2, "0")}:00 hs vía ${calendar.name ?? "calendario"}`,
      });
    } catch (e) {
      console.error("Log insert (non-fatal):", e);
    }

    return respond({ appointment_id: appointment.id, contact_id: contactId });
  } catch (err) {
    console.error(err);
    return respond({ error: "Internal server error" }, 500);
  }
});
