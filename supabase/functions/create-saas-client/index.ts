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

/**
 * POST /functions/v1/create-saas-client
 *
 * Body:
 *   contact_id    string   — ID del contacto en crm_contacts
 *   admin_user_id string   — ID del admin Acrosoft que vende el servicio
 *
 * Flow:
 *   1. Load contact from crm_contacts
 *   2. Check no existing account for this contact
 *   3. Create Supabase Auth user for client (invite link)
 *   4. Create crm_client_accounts row
 *   5. Create invitation token
 *   6. Send invitation email via Supabase invite
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { contact_id, admin_user_id } = await req.json();

    if (!contact_id || !admin_user_id) {
      return respond({ error: "contact_id and admin_user_id are required" }, 400);
    }

    // ── 1. Load contact ──────────────────────────────────────────────────────
    const { data: contact, error: contactErr } = await supabase
      .from("crm_contacts")
      .select("id, name, email, custom_fields")
      .eq("id", contact_id)
      .eq("user_id", admin_user_id)
      .single();

    if (contactErr || !contact) {
      return respond({ error: "Contact not found" }, 404);
    }

    if (!contact.email) {
      return respond({ error: "Contact has no email address" }, 400);
    }

    // ── 2. Check for existing account ────────────────────────────────────────
    const { data: existing } = await supabase
      .from("crm_client_accounts")
      .select("id, status")
      .eq("contact_id", contact_id)
      .maybeSingle();

    if (existing) {
      // If disabled, re-enable it instead of creating a new one
      if (existing.status === "disabled") {
        const { error: reactivateErr } = await supabase
          .from("crm_client_accounts")
          .update({ status: "active", disabled_at: null })
          .eq("id", existing.id);

        if (reactivateErr) throw reactivateErr;
        return respond({ account_id: existing.id, reactivated: true });
      }
      return respond({ error: "Client account already exists", account_id: existing.id }, 409);
    }

    // ── 3. Create Supabase Auth user via admin invite ────────────────────────
    // This sends an invitation email automatically with a magic link
    const { data: inviteData, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(
      contact.email,
      {
        redirectTo: `${Deno.env.get("SITE_URL") ?? "http://localhost:5173"}/crm-setup`,
        data: {
          full_name: contact.name,
          account_type: "saas_client",
          admin_user_id,
        },
      }
    );

    if (inviteErr) throw inviteErr;

    const clientUserId = inviteData.user.id;

    // ── 4. Create client account record ──────────────────────────────────────
    const { data: account, error: accountErr } = await supabase
      .from("crm_client_accounts")
      .insert({
        admin_user_id,
        contact_id,
        client_user_id: clientUserId,
        client_email: contact.email,
        status: "pending",
      })
      .select()
      .single();

    if (accountErr) throw accountErr;

    // ── 5. Transfer SaaS calendar ownership to client user ───────────────────
    try {
      const { data: calendar } = await supabase
        .from("crm_calendar_config")
        .select("id")
        .eq("contact_id", contact_id)
        .maybeSingle();

      if (calendar) {
        await supabase
          .from("crm_calendar_config")
          .update({ user_id: clientUserId, contact_id: null })
          .eq("id", calendar.id);
      }
    } catch (e) {
      console.error("Calendar transfer (non-fatal):", e);
    }

    // ── 6. Create/seed business profile for new SaaS client ─────────────────
    try {
      const cf = (contact.custom_fields as Record<string, any>) ?? {};
      const logoUrl: string | null = typeof cf._logo_url === "string" ? cf._logo_url : null;

      // Check if profile already exists (edge case: client set it up before activation)
      const { data: existingProfile } = await supabase
        .from("crm_business_profile")
        .select("id")
        .eq("user_id", clientUserId)
        .maybeSingle();

      if (!existingProfile) {
        await supabase.from("crm_business_profile").insert({
          user_id: clientUserId,
          business_name: contact.name,
          contact_email: contact.email,
          logo_url: logoUrl,
          color_primary: "#2563EB",
          color_secondary: "#1E40AF",
          color_accent: "#DBEAFE",
        });
      } else if (logoUrl) {
        // Profile exists but logo not set — backfill it
        await supabase
          .from("crm_business_profile")
          .update({ logo_url: logoUrl })
          .eq("id", existingProfile.id)
          .is("logo_url", null);
      }
    } catch (e) {
      console.error("Business profile seed (non-fatal):", e);
    }

    // ── 7. Seed crm_services from onboarding ob-4-1 field ───────────────────
    try {
      const cf = (contact.custom_fields as Record<string, any>) ?? {};
      // Find the onboarding form entry — it's the first key that has ob-4-1
      const onboardingEntry = Object.values(cf).find(
        (v) => typeof v === "object" && v !== null && "ob-4-1" in v
      ) as Record<string, any> | undefined;

      const rawServices = onboardingEntry?.["ob-4-1"];
      const serviceNames: string[] = Array.isArray(rawServices)
        ? rawServices.filter((s: unknown) => typeof s === "string" && s.trim())
        : typeof rawServices === "string" && rawServices.trim()
          ? [rawServices.trim()]
          : [];

      if (serviceNames.length > 0) {
        // Only insert if client has no services yet
        const { count } = await supabase
          .from("crm_services")
          .select("id", { count: "exact", head: true })
          .eq("user_id", clientUserId);

        if ((count ?? 0) === 0) {
          await supabase.from("crm_services").insert(
            serviceNames.map((name, i) => ({
              user_id: clientUserId,
              name: name.trim(),
              active: true,
              sort_order: i,
            }))
          );
        }
      }
    } catch (e) {
      console.error("Services seed (non-fatal):", e);
    }

    return respond({
      success: true,
      account_id: account.id,
      client_user_id: clientUserId,
      email: contact.email,
    });

  } catch (err) {
    console.error("create-saas-client error:", err);
    return respond({ error: (err as Error).message ?? "Internal error" }, 500);
  }
});
