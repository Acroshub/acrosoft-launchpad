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
      .select("id, name, email")
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
