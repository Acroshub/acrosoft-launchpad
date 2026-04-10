import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { calendar_id, date, hour, form_data } = await req.json();

    if (!calendar_id || !date || hour == null) {
      return new Response(
        JSON.stringify({ error: "calendar_id, date and hour are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Load calendar config ──────────────────────────────────────
    const { data: calendar, error: calError } = await supabase
      .from("crm_calendar_config")
      .select("user_id, duration_min, name, linked_form_id")
      .eq("id", calendar_id)
      .single();

    if (calError || !calendar) {
      return new Response(JSON.stringify({ error: "Calendar not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Double-booking guard ──────────────────────────────────────
    const { data: existing } = await supabase
      .from("crm_appointments")
      .select("id")
      .eq("user_id", calendar.user_id)
      .eq("date", date)
      .eq("hour", hour)
      .neq("status", "cancelled")
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "Slot already booked" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Extract contact info from form_data ───────────────────────
    let name = "";
    let email = "";
    let phone = "";

    // First pass: field-type-based extraction using linked form config
    if (calendar.linked_form_id) {
      const { data: form } = await supabase
        .from("crm_forms")
        .select("fields")
        .eq("id", calendar.linked_form_id)
        .single();

      if (form) {
        const fields = Array.isArray(form.fields) ? (form.fields as any[]) : [];
        for (const field of fields) {
          const val = String(form_data?.[field.id] ?? "").trim();
          if (!val) continue;
          if (field.type === "text" && field.locked && !name) name = val;
          else if (field.type === "email" && !email) email = val;
          else if (field.type === "phone" && !phone) phone = val;
        }
      }
    }

    // Fallback: try common field IDs if linked form didn't yield results
    if (!name) name = String(form_data?.name ?? form_data?.["f-name"] ?? "").trim();
    if (!email) email = String(form_data?.email ?? form_data?.["f-email"] ?? "").trim();
    if (!phone) phone = String(form_data?.phone ?? form_data?.["f-phone"] ?? "").trim();

    // ── Upsert contact ────────────────────────────────────────────
    let contactId: string | null = null;

    if (email) {
      const { data: existingContact } = await supabase
        .from("crm_contacts")
        .select("id")
        .eq("user_id", calendar.user_id)
        .eq("email", email)
        .maybeSingle();

      if (existingContact) {
        contactId = existingContact.id;
        await supabase
          .from("crm_contacts")
          .update({
            ...(name ? { name } : {}),
            ...(phone ? { phone } : {}),
          })
          .eq("id", contactId);
      } else {
        const { data: newContact } = await supabase
          .from("crm_contacts")
          .insert({
            user_id: calendar.user_id,
            name: name || "Sin nombre",
            email,
            phone: phone || null,
            tags: [],
            stage: null,
            company: null,
            notes: null,
            custom_fields: {},
          })
          .select("id")
          .single();
        contactId = newContact?.id ?? null;
      }
    } else if (name) {
      const { data: newContact } = await supabase
        .from("crm_contacts")
        .insert({
          user_id: calendar.user_id,
          name,
          email: null,
          phone: phone || null,
          tags: [],
          stage: null,
          company: null,
          notes: null,
          custom_fields: {},
        })
        .select("id")
        .single();
      contactId = newContact?.id ?? null;
    }

    // ── Create appointment ────────────────────────────────────────
    const { data: appointment, error: apptError } = await supabase
      .from("crm_appointments")
      .insert({
        user_id: calendar.user_id,
        contact_id: contactId,
        date,
        hour,
        duration_min: calendar.duration_min ?? 30,
        service: calendar.name ?? "Cita",
        status: "confirmed",
        notes: form_data ? JSON.stringify(form_data) : null,
      })
      .select("id")
      .single();

    if (apptError) throw apptError;

    return new Response(
      JSON.stringify({ appointment_id: appointment.id, contact_id: contactId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
