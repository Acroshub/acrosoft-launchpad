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
 * POST /functions/v1/invite-staff-user
 *
 * Called by the business owner to send an invitation email to a staff member.
 *
 * Auth: owner's JWT (Authorization header)
 * Body: { staff_id: string }
 *
 * Flow:
 *   1. Verify JWT → get owner
 *   2. Load crm_staff row, verify it belongs to owner
 *   3. inviteUserByEmail → redirects to /crm-setup
 *   4. Update crm_staff.status = 'invited'
 *   5. If email already registered, link existing auth user directly
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return respond({ error: "Unauthorized" }, 401);

  const { data: { user: owner }, error: authErr } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", ""),
  );
  if (authErr || !owner) return respond({ error: "Unauthorized" }, 401);

  try {
    const { staff_id } = await req.json();
    if (!staff_id) return respond({ error: "staff_id is required" }, 400);

    // ── 1. Load staff and verify ownership ──────────────────────────────────
    const { data: staff, error: staffErr } = await supabase
      .from("crm_staff")
      .select("id, name, email, status")
      .eq("id", staff_id)
      .eq("owner_user_id", owner.id)
      .single();

    if (staffErr || !staff) return respond({ error: "Staff not found" }, 404);
    if (!staff.email)       return respond({ error: "Staff has no email address" }, 400);

    const siteUrl = Deno.env.get("SITE_URL") ?? "http://localhost:5173";

    // ── 2. Send invitation email ─────────────────────────────────────────────
    const { data: inviteData, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(
      staff.email,
      {
        redirectTo: `${siteUrl}/crm-setup`,
        data: {
          full_name:      staff.name,
          account_type:   "staff",
          staff_id:       staff.id,
          owner_user_id:  owner.id,
        },
      },
    );

    if (inviteErr) {
      // User already has a confirmed Supabase account — link them directly
      if (inviteErr.message?.toLowerCase().includes("already registered")) {
        const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const existing = users.find(u => u.email === staff.email);
        if (existing) {
          await supabase
            .from("crm_staff")
            .update({ staff_user_id: existing.id, status: "active" })
            .eq("id", staff_id);
          return respond({ linked: true, staff_user_id: existing.id });
        }
      }
      return respond({ error: inviteErr.message }, 500);
    }

    // ── 3. Mark staff as invited ─────────────────────────────────────────────
    await supabase
      .from("crm_staff")
      .update({ status: "invited" })
      .eq("id", staff_id);

    return respond({ success: true, user_id: inviteData.user.id });

  } catch (err) {
    console.error("invite-staff-user error:", err);
    return respond({ error: (err as Error).message ?? "Internal error" }, 500);
  }
});
