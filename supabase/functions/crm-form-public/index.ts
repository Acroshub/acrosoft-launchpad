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

function buildDocKeyMap(fields: any[], data: Record<string, any>): Record<string, any> {
  const map: Record<string, any> = {};
  for (const field of fields) {
    if (field.doc_key) map[field.doc_key] = data[field.id];
  }
  return map;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

async function createSaasCalendar(
  userId: string,
  contactId: string,
  docKeyMap: Record<string, any>,
): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from("crm_calendar_config")
      .select("id")
      .eq("contact_id", contactId)
      .maybeSingle();
    if (existing) return;

    const businessName = String(docKeyMap?.["business_name"] ?? "").trim() || "Mi Negocio";
    const availability = docKeyMap?.["schedule"] ?? {};
    const slug = `${slugify(businessName)}-${Date.now()}`;

    const { data: calendar, error } = await supabase
      .from("crm_calendar_config")
      .insert({
        user_id: userId,
        contact_id: contactId,
        name: businessName,
        slug,
        availability,
        duration_min: 60,
        buffer_min: 0,
        min_advance_hours: 1,
        max_future_days: 30,
        schedule_interval: 60,
      })
      .select("id")
      .single();

    if (error || !calendar) {
      console.error("createSaasCalendar — insert failed:", error);
      return;
    }

    const { data: contact } = await supabase
      .from("crm_contacts")
      .select("custom_fields")
      .eq("id", contactId)
      .single();

    const existingCf = (contact?.custom_fields as object) ?? {};
    await supabase
      .from("crm_contacts")
      .update({ custom_fields: { ...existingCf, _saas_calendar_id: calendar.id } })
      .eq("id", contactId);
  } catch (e) {
    console.error("createSaasCalendar (non-fatal):", e);
  }
}

/**
 * Registers a sale when a `services` field is submitted.
 * If the service has is_saas = true, creates a SaaS calendar and client account.
 */
async function handleServicesField(
  userId: string,
  contactId: string,
  contactName: string,
  serviceId: string,
  siteUrl: string,
  docKeyMap: Record<string, any>,
): Promise<void> {
  try {
    const { data: service, error } = await supabase
      .from("crm_services")
      .select("id, name, price, recurring_price, currency, is_saas, is_recurring, discount_pct, recurring_discount_pct")
      .eq("id", serviceId)
      .eq("user_id", userId)
      .single();

    if (error || !service) {
      console.error("handleServicesField — service not found:", serviceId, error);
      return;
    }

    // ── Prevent duplicate sales for same contact + service ────────────────
    const { data: existingSale } = await supabase
      .from("crm_sales")
      .select("id")
      .eq("user_id", userId)
      .eq("contact_id", contactId)
      .eq("service_id", service.id)
      .eq("type", "initial")
      .maybeSingle();

    if (existingSale) return;

    // ── Register the sale (apply setup discount) ─────────────────────────────
    const discountPct = (service as any).discount_pct ?? 0;
    const finalAmount = discountPct > 0
      ? service.price * (1 - discountPct / 100)
      : service.price;
    // recurring_discount_pct se aplica al registrar ventas recurrentes (type: "recurring")

    await supabase.from("crm_sales").insert({
      user_id: userId,
      contact_id: contactId,
      contact_name: contactName,
      service_id: service.id,
      service_name: service.name,
      amount: finalAmount,
      currency: service.currency ?? "USD",
      type: "initial",
      notes: "[Venta automática via formulario]",
    });

    // ── If SaaS service, create calendar + client account ──────────────────
    if (service.is_saas) {
      await createSaasCalendar(userId, contactId, docKeyMap);

      // Verify no existing account first
      const { data: existing } = await supabase
        .from("crm_client_accounts")
        .select("id, status")
        .eq("contact_id", contactId)
        .maybeSingle();

      if (!existing) {
        // Load contact for invite + business profile seed
        const { data: contact } = await supabase
          .from("crm_contacts")
          .select("email, custom_fields")
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

            // Seed business profile for the new SaaS client
            try {
              const cf = (contact.custom_fields as Record<string, any>) ?? {};
              const logoUrl: string | null = typeof cf._logo_url === "string" ? cf._logo_url : null;
              const { data: existingProfile } = await supabase
                .from("crm_business_profile")
                .select("id")
                .eq("user_id", inviteData.user.id)
                .maybeSingle();
              if (!existingProfile) {
                await supabase.from("crm_business_profile").insert({
                  user_id: inviteData.user.id,
                  business_name: contactName,
                  contact_email: contact.email,
                  logo_url: logoUrl,
                  color_primary: "#2563EB",
                  color_secondary: "#1E40AF",
                  color_accent: "#DBEAFE",
                });
              }
            } catch (e) {
              console.error("Business profile seed from form (non-fatal):", e);
            }
          }
        }
      }
    }
  } catch (e) {
    console.error("handleServicesField (non-fatal):", e);
  }
}

/**
 * Extracts the first URL from any `file` field in the submitted data.
 * Saves it to:
 *   1. crm_contacts.custom_fields._logo_url  (always, for later SaaS provisioning)
 *   2. crm_business_profile.logo_url          (if a profile already exists for this user)
 *
 * Only runs when at least one file field has a URL value (not a bare filename).
 */
async function handleLogoField(
  userId: string,
  contactId: string,
  fields: any[],
  data: Record<string, any>,
): Promise<void> {
  try {
    const fileFields = fields.filter((f: any) => f.type === "file");
    if (!fileFields.length) return;

    // Pick the first file field that contains a URL (uploaded by FormRenderer)
    let logoUrl: string | null = null;
    for (const f of fileFields) {
      const val = data[f.id];
      const urls: string[] = Array.isArray(val) ? val : typeof val === "string" ? [val] : [];
      const firstUrl = urls.find((u) => u.startsWith("http"));
      if (firstUrl) { logoUrl = firstUrl; break; }
    }

    if (!logoUrl) return; // no real upload happened (only filenames or empty)

    // Persist on the contact so create-saas-client / handleServicesField can read it later
    const { data: contact } = await supabase
      .from("crm_contacts")
      .select("custom_fields")
      .eq("id", contactId)
      .single();

    const existingCf = (contact?.custom_fields as object) ?? {};
    await supabase
      .from("crm_contacts")
      .update({ custom_fields: { ...existingCf, _logo_url: logoUrl } })
      .eq("id", contactId);
  } catch (e) {
    console.error("handleLogoField (non-fatal):", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { form_id, data, terms_accepted_at } = await req.json();
    if (!form_id) return respond({ error: "form_id required" }, 400);

    const { data: form, error: formError } = await supabase
      .from("crm_forms")
      .select("user_id, fields, sections, auto_tags, pipeline_ids, slug, reminder_rules")
      .eq("id", form_id)
      .single();

    if (formError) return respond({ error: `Form load failed: ${formError.message}` }, 404);
    if (!form) return respond({ error: "Form not found" }, 404);

    const termsAt: string | null = typeof terms_accepted_at === "string" ? terms_accepted_at : null;
    const { data: submission, error: submissionError } = await supabase
      .from("crm_form_submissions")
      .insert({
        form_id,
        data: data ?? {},
        terms_accepted: termsAt !== null,
        terms_accepted_at: termsAt,
      })
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

    // ── Handle logo upload — save URL to contact custom_fields ───────────────
    // Must run BEFORE handleServicesField so the logo is in custom_fields
    // when the SaaS business profile is seeded.
    if (contactId) {
      await handleLogoField(form.user_id, contactId, allFields, data ?? {});
    }

    // ── Handle `services` field type — register sale automatically ─────────
    if (contactId) {
      const servicesField = allFields.find((f: any) => f.type === "services");
      if (servicesField) {
        const selectedServiceId = data?.[servicesField.id];
        if (selectedServiceId && typeof selectedServiceId === "string") {
          // deno-lint-ignore no-explicit-any
          const siteUrl = (globalThis as any).Deno?.env?.get("SITE_URL") ?? "http://localhost:5173";
          const docKeyMap = buildDocKeyMap(allFields, data ?? {});
          await handleServicesField(form.user_id, contactId, contactName || name || "Sin nombre", selectedServiceId, siteUrl, docKeyMap);
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

    // ── Fire form submission reminder rules ─────────────────────────────────
    if (contactId) {
      try {
        const formRules = ((form as any).reminder_rules ?? []) as any[];
        // "on_booking" timing on a form means "on_submission" (same field, different context)
        const submissionRules = formRules.filter((r: any) =>
          r.timing === "on_booking" || r.timing === "on_submission"
        );

        if (submissionRules.length > 0) {
          const nowIso = new Date().toISOString();
          let queued = 0;

          for (const rule of submissionRules) {
            if (rule.recipient === "contact") {
              const channelValue = rule.channel === "email" ? (email || null) : (phone || null);
              if (!channelValue) continue;

              const marker = `rule:${form_id}:${rule.id}:contact`;
              const { count: existing } = await supabase
                .from("crm_reminders").select("id", { count: "exact", head: true })
                .eq("contact_id", contactId).eq("business_target", marker);
              if ((existing ?? 0) > 0) continue;

              const msg = `Hola ${name || "Cliente"}, gracias por completar nuestro formulario. Nos pondremos en contacto contigo pronto.`;
              const { data: rem } = await supabase.from("crm_reminders").insert({
                user_id: form.user_id, contact_id: contactId,
                type: rule.channel,
                recipient_email: rule.channel === "email" ? channelValue : null,
                recipient_phone: rule.channel === "whatsapp" ? channelValue : null,
                scheduled_at: nowIso, message: msg, status: "pending", is_auto: true,
                business_target: marker,
              }).select("id").single();
              if (rem?.id) { await supabase.from("crm_reminder_queue").insert({ reminder_id: rem.id }); queued++; }

            } else {
              const targets: string[] = rule.businessTargets?.length
                ? rule.businessTargets
                : rule.businessTarget ? [rule.businessTarget] : ["admin"];

              for (const targetId of targets) {
                const marker = `rule:${form_id}:${rule.id}:${targetId}`;
                const { count: existing } = await supabase
                  .from("crm_reminders").select("id", { count: "exact", head: true })
                  .eq("contact_id", contactId).eq("business_target", marker);
                if ((existing ?? 0) > 0) continue;

                let channelValue = "";
                if (targetId === "admin") {
                  const { data: profile } = await supabase
                    .from("crm_business_profile").select("contact_email, contact_phone, whatsapp")
                    .eq("user_id", form.user_id).single();
                  channelValue = rule.channel === "email"
                    ? (profile?.contact_email ?? "")
                    : (profile?.contact_phone ?? profile?.whatsapp ?? "");
                  // Fallback: use auth email when contact_email is not configured
                  if (!channelValue && rule.channel === "email") {
                    const { data: { user: authUser } } = await supabase.auth.admin.getUserById(form.user_id);
                    channelValue = authUser?.email ?? "";
                  }
                } else {
                  const { data: staffMember } = await supabase
                    .from("crm_staff").select("email, phone").eq("id", targetId).single();
                  channelValue = rule.channel === "email"
                    ? (staffMember?.email ?? "")
                    : (staffMember?.phone ?? "");
                }
                if (!channelValue) continue;

                const msg = `Nuevo formulario completado: ${name || email || "Contacto"}.`;
                const { data: rem } = await supabase.from("crm_reminders").insert({
                  user_id: form.user_id, contact_id: contactId,
                  type: rule.channel,
                  recipient_email: rule.channel === "email" ? channelValue : null,
                  recipient_phone: rule.channel === "whatsapp" ? channelValue : null,
                  scheduled_at: nowIso, message: msg, status: "pending", is_auto: true,
                  business_target: marker,
                }).select("id").single();
                if (rem?.id) { await supabase.from("crm_reminder_queue").insert({ reminder_id: rem.id }); queued++; }
              }
            }
          }

          if (queued > 0) {
            const supabaseUrl = (globalThis as any).Deno?.env?.get("SUPABASE_URL") ?? "";
            const serviceKey  = (globalThis as any).Deno?.env?.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
            fetch(`${supabaseUrl}/functions/v1/send-reminders`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
            }).catch(() => {});
          }
        }
      } catch (e) {
        console.error("form submission reminders (non-fatal):", e);
      }
    }

    return respond({ submission_id: submission.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return respond({ error: `Unexpected error: ${msg}` }, 500);
  }
});
