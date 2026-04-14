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
 * Adds a contact to the configured pipeline.
 * - For "contacts" pipelines: sets crm_contacts.stage to the first column.
 * - For "tasks" pipelines: creates a crm_tasks row in the first column.
 */
async function addContactToPipeline(
  userId: string,
  contactId: string,
  contactName: string,
  pipelineId: string | null,
): Promise<void> {
  try {
    let pipeline: { id: string; type: string; column_names: string[] } | null = null;

    if (pipelineId) {
      // User explicitly chose this pipeline — don't filter by type
      const { data } = await supabase
        .from("crm_pipelines")
        .select("id, type, column_names")
        .eq("id", pipelineId)
        .eq("user_id", userId)
        .single();
      pipeline = data as typeof pipeline;
    } else {
      // Fallback: pick first contacts pipeline
      const { data } = await supabase
        .from("crm_pipelines")
        .select("id, type, column_names")
        .eq("user_id", userId)
        .eq("type", "contacts")
        .order("created_at", { ascending: true })
        .limit(1);
      pipeline = (data as typeof pipeline[])?.[0] ?? null;
    }

    if (!pipeline) return;

    const firstStage = (pipeline.column_names as string[])?.[0];
    if (!firstStage) return;

    if (pipeline.type === "contacts") {
      // Set the contact's stage to the first column
      await supabase
        .from("crm_contacts")
        .update({ stage: firstStage })
        .eq("id", contactId)
        .is("stage", null); // only set if not already in a pipeline
    } else if (pipeline.type === "tasks") {
      // Create a task card in the first column of the tasks pipeline
      await supabase.from("crm_tasks").insert({
        user_id: userId,
        pipeline_id: pipeline.id,
        title: contactName || "Nuevo contacto",
        description: `Contacto añadido automáticamente desde formulario (ID: ${contactId})`,
        stage: firstStage,
        position: 0,
        priority: null,
      });
    }
  } catch (e) {
    console.error("addContactToPipeline (non-fatal):", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { form_id, data } = await req.json();
    if (!form_id) return respond({ error: "form_id required" }, 400);

    const { data: form, error: formError } = await supabase
      .from("crm_forms")
      .select("user_id, fields, auto_tags, pipeline_id")
      .eq("id", form_id)
      .single();

    if (formError) return respond({ error: `Form load failed: ${formError.message}` }, 404);
    if (!form) return respond({ error: "Form not found" }, 404);

    const { data: submission, error: submissionError } = await supabase
      .from("crm_form_submissions")
      .insert({ form_id, data: data ?? {} })
      .select("id")
      .single();

    if (submissionError) return respond({ error: `Submission insert failed: ${submissionError.message}` }, 500);

    const fields = Array.isArray(form.fields) ? (form.fields as any[]) : [];
    const { name, email, phone } = extractContact(fields, data ?? {});
    const formDataToStore = data && Object.keys(data).length > 0 ? { [form_id]: data } : {};
    const autoTags: string[] = Array.isArray(form.auto_tags) ? form.auto_tags : [];

    let contactId: string | null = null;
    let isNewContact = false;

    try {
      if (email) {
        const { data: existing } = await supabase
          .from("crm_contacts")
          .select("id, tags, custom_fields")
          .eq("user_id", form.user_id)
          .eq("email", email)
          .maybeSingle();

        if (existing) {
          contactId = existing.id;
          const mergedTags = Array.from(new Set([...(existing.tags ?? []), ...autoTags]));
          const mergedFields = { ...((existing.custom_fields as object) ?? {}), ...formDataToStore };
          await supabase.from("crm_contacts").update({
            ...(name ? { name } : {}),
            ...(phone ? { phone } : {}),
            tags: mergedTags,
            custom_fields: mergedFields,
          }).eq("id", existing.id);
        } else {
          isNewContact = true;
          const { data: nc } = await supabase.from("crm_contacts").insert({
            user_id: form.user_id, name: name || "Sin nombre", email,
            phone: phone || null, tags: autoTags, stage: null,
            company: null, notes: null, custom_fields: formDataToStore,
          }).select("id").single();
          contactId = nc?.id ?? null;
        }
      } else if (name) {
        isNewContact = true;
        const { data: nc } = await supabase.from("crm_contacts").insert({
          user_id: form.user_id, name, email: null,
          phone: phone || null, tags: autoTags, stage: null,
          company: null, notes: null, custom_fields: formDataToStore,
        }).select("id").single();
        contactId = nc?.id ?? null;
      }
    } catch (e) {
      console.error("Contact upsert (non-fatal):", e);
    }

    if (isNewContact && contactId) {
      await addContactToPipeline(form.user_id, contactId, name, form.pipeline_id ?? null);
    }

    return respond({ submission_id: submission.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return respond({ error: `Unexpected error: ${msg}` }, 500);
  }
});
