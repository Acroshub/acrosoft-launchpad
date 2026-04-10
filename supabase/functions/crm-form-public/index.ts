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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { form_id, data } = await req.json();

    if (!form_id) return respond({ error: "form_id required" }, 400);

    // ── 1. Load form config ───────────────────────────────────────
    const { data: form, error: formError } = await supabase
      .from("crm_forms")
      .select("user_id, fields, auto_tags")
      .eq("id", form_id)
      .single();

    if (formError) return respond({ error: `Form load failed: ${formError.message}` }, 404);
    if (!form)     return respond({ error: "Form not found" }, 404);

    // ── 2. Record the raw submission ──────────────────────────────
    const { data: submission, error: submissionError } = await supabase
      .from("crm_form_submissions")
      .insert({ form_id, data: data ?? {} })
      .select("id")
      .single();

    if (submissionError) {
      return respond({ error: `Submission insert failed: ${submissionError.message}` }, 500);
    }

    // ── 3. Extract contact fields ─────────────────────────────────
    const fields = Array.isArray(form.fields) ? (form.fields as any[]) : [];
    let name  = "";
    let email = "";
    let phone = "";

    for (const field of fields) {
      // Arrays (file, repeatable) can't be coerced to string meaningfully
      const raw = data?.[field.id];
      if (raw === undefined || raw === null || Array.isArray(raw)) continue;
      const val = String(raw).trim();
      if (!val) continue;

      if (field.type === "text" && field.locked && !name)  name  = val;
      else if (field.type === "email" && !email)           email = val;
      else if (field.type === "phone" && !phone)           phone = val;
    }

    // ── 4. Upsert contact (best-effort — never fail the submission) ─
    const autoTags: string[] = Array.isArray(form.auto_tags) ? form.auto_tags : [];

    try {
      if (email) {
        const { data: existing } = await supabase
          .from("crm_contacts")
          .select("id, tags")
          .eq("user_id", form.user_id)
          .eq("email", email)
          .maybeSingle();

        if (existing) {
          const mergedTags = Array.from(new Set([...(existing.tags ?? []), ...autoTags]));
          await supabase
            .from("crm_contacts")
            .update({
              ...(name  ? { name  } : {}),
              ...(phone ? { phone } : {}),
              tags: mergedTags,
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("crm_contacts").insert({
            user_id:       form.user_id,
            name:          name || "Sin nombre",
            email,
            phone:         phone || null,
            tags:          autoTags,
            stage:         null,
            company:       null,
            notes:         null,
            custom_fields: {},
          });
        }
      } else if (name) {
        await supabase.from("crm_contacts").insert({
          user_id:       form.user_id,
          name,
          email:         null,
          phone:         phone || null,
          tags:          autoTags,
          stage:         null,
          company:       null,
          notes:         null,
          custom_fields: {},
        });
      }
    } catch (contactErr) {
      // Log but don't fail — the submission was already recorded
      console.error("Contact upsert error (non-fatal):", contactErr);
    }

    return respond({ submission_id: submission.id });

  } catch (err) {
    console.error("Unhandled error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return respond({ error: `Unexpected error: ${msg}` }, 500);
  }
});
