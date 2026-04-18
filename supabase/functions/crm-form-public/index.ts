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

/** Flatten all fields from the form, whether in form.fields or form.sections[].fields */
function getAllFields(form: any): any[] {
  const flat: any[] = [];
  if (Array.isArray(form.fields)) flat.push(...form.fields);
  if (Array.isArray(form.sections)) {
    for (const section of form.sections) {
      if (Array.isArray(section?.fields)) flat.push(...section.fields);
    }
  }
  return flat;
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
 * Adds the contact to ALL selected contacts pipelines via crm_contact_pipeline_memberships.
 * Each pipeline gets its own membership row (stage = first column of that pipeline).
 * If pipelineIds is empty, falls back to the user's first contacts pipeline.
 * Uses upsert so re-submissions don't create duplicates or overwrite existing stage.
 */
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
      // Fallback: first contacts pipeline
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

    // Insert a membership row for EACH selected pipeline
    for (const pipeline of pipelines) {
      const firstStage = (pipeline.column_names as string[])?.[0];
      if (!firstStage) continue;

      await supabase
        .from("crm_contact_pipeline_memberships")
        .upsert(
          { contact_id: contactId, pipeline_id: pipeline.id, stage: firstStage, position: 0 },
          { onConflict: "contact_id,pipeline_id", ignoreDuplicates: true }
        );
    }
  } catch (e) {
    console.error("addContactToPipelines (non-fatal):", e);
  }
}

/**
 * Registers a sale when a `services` field is submitted.
 * If the service has is_saas = true, calls create-saas-client.
 */
async function handleServicesField(
  userId: string,
  contactId: string,
  contactName: string,
  serviceId: string,
  siteUrl: string,
): Promise<void> {
  try {
    const { data: service, error } = await supabase
      .from("crm_services")
      .select("id, name, price, currency, is_saas, is_recurring")
      .eq("id", serviceId)
      .eq("user_id", userId)
      .single();

    if (error || !service) {
      console.error("handleServicesField — service not found:", serviceId, error);
      return;
    }

    // ── Register the sale ──────────────────────────────────────────────────
    await supabase.from("crm_sales").insert({
      user_id: userId,
      contact_id: contactId,
      contact_name: contactName,
      service_id: service.id,
      service_name: service.name,
      amount: service.price,
      currency: service.currency ?? "USD",
      type: "initial",
      notes: "[Venta automática via formulario]",
    });

    // ── If SaaS service, create client account ─────────────────────────────
    if (service.is_saas) {
      // Verify no existing account first
      const { data: existing } = await supabase
        .from("crm_client_accounts")
        .select("id, status")
        .eq("contact_id", contactId)
        .maybeSingle();

      if (!existing) {
        // Load contact email for invite
        const { data: contact } = await supabase
          .from("crm_contacts")
          .select("email")
          .eq("id", contactId)
          .single();

        if (contact?.email) {
          const { data: inviteData, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(
            contact.email,
            {
              redirectTo: `${siteUrl}/crm-setup`,
              data: { full_name: contactName, account_type: "saas_client", admin_user_id: userId },
            }
          );
          if (!inviteErr && inviteData) {
            await supabase.from("crm_client_accounts").insert({
              admin_user_id: userId,
              contact_id: contactId,
              client_user_id: inviteData.user.id,
              client_email: contact.email,
              status: "pending",
            });
          }
        }
      }
    }
  } catch (e) {
    console.error("handleServicesField (non-fatal):", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { form_id, data } = await req.json();
    if (!form_id) return respond({ error: "form_id required" }, 400);

    const { data: form, error: formError } = await supabase
      .from("crm_forms")
      .select("user_id, fields, sections, auto_tags, pipeline_ids, slug")
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

    const allFields = getAllFields(form);
    const { name, email, phone } = extractContact(allFields, data ?? {});
    const formDataToStore = data && Object.keys(data).length > 0 ? { [form_id]: data } : {};
    const autoTags: string[] = Array.isArray(form.auto_tags) ? form.auto_tags : [];

    let contactId: string | null = null;
    let contactName = name;

    try {
      if (email) {
        const { data: existing } = await supabase
          .from("crm_contacts")
          .select("id, name, tags, custom_fields")
          .eq("user_id", form.user_id)
          .eq("email", email)
          .maybeSingle();

        if (existing) {
          contactId = existing.id;
          contactName = existing.name;
          const mergedTags = Array.from(new Set([...(existing.tags ?? []), ...autoTags]));
          const mergedFields = { ...((existing.custom_fields as object) ?? {}), ...formDataToStore };
          await supabase.from("crm_contacts").update({
            ...(name ? { name } : {}),
            ...(phone ? { phone } : {}),
            tags: mergedTags,
            custom_fields: mergedFields,
          }).eq("id", existing.id);
        } else {
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

    if (contactId) {
      const pipelineIds: string[] = Array.isArray(form.pipeline_ids) ? form.pipeline_ids : [];
      await addContactToPipelines(form.user_id, contactId, pipelineIds);
    }

    // ── Handle `services` field type — register sale automatically ─────────
    if (contactId) {
      const servicesField = allFields.find((f: any) => f.type === "services");
      if (servicesField) {
        const selectedServiceId = data?.[servicesField.id];
        if (selectedServiceId && typeof selectedServiceId === "string") {
          // deno-lint-ignore no-explicit-any
          const siteUrl = (globalThis as any).Deno?.env?.get("SITE_URL") ?? "http://localhost:5173";
          await handleServicesField(form.user_id, contactId, contactName || name || "Sin nombre", selectedServiceId, siteUrl);
        }
      }
    }

    // ── Trigger master doc generation for onboarding forms ────────────────────
    const formSlug: string = (form as any).slug ?? "";
    if (contactId && formSlug.toLowerCase().includes("onboarding")) {
      // Use globalThis pattern (consistent with rest of file — no Deno types in workspace)
      const supabaseUrl = (globalThis as any).Deno?.env?.get("SUPABASE_URL") ?? "";
      const serviceKey  = (globalThis as any).Deno?.env?.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      // Fire-and-forget — does not block the form submission response
      fetch(`${supabaseUrl}/functions/v1/generate-master-doc`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          contact_id: contactId,
          form_id,
          data: data ?? {},
          user_id: form.user_id,
        }),
      }).catch((e) => console.error("generate-master-doc trigger (non-fatal):", e));
    }

    return respond({ submission_id: submission.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return respond({ error: `Unexpected error: ${msg}` }, 500);
  }
});
