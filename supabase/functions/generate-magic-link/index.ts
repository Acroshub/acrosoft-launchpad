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
 * POST /functions/v1/generate-magic-link
 *
 * Called by Admin clicking "Acceder a CRM" on an active SaaS client.
 * Generates a one-time Supabase magic link for the client and returns it.
 *
 * Body:
 *   contact_id    string  — contact in admin's CRM
 *   admin_user_id string  — must match calling user
 *
 * Returns:
 *   { magic_link: string }  — redirect the admin's browser to this URL
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Verify caller is authenticated
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return respond({ error: "Unauthorized" }, 401);

  const { data: { user: caller }, error: authErr } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", "")
  );
  if (authErr || !caller) return respond({ error: "Unauthorized" }, 401);

  try {
    const { contact_id } = await req.json();
    if (!contact_id) return respond({ error: "contact_id required" }, 400);

    // ── 1. Verify the account belongs to the calling admin ──────────────────
    const { data: account, error: accErr } = await supabase
      .from("crm_client_accounts")
      .select("id, client_user_id, client_email, status")
      .eq("contact_id", contact_id)
      .eq("admin_user_id", caller.id)
      .single();

    if (accErr || !account) return respond({ error: "Account not found" }, 404);
    if (account.status !== "active") return respond({ error: "Account is not active" }, 403);
    if (!account.client_user_id) return respond({ error: "Client has not accepted invitation yet" }, 400);

    // ── 2. Generate OTP link for the client user ─────────────────────────────
    const siteUrl = Deno.env.get("SITE_URL") ?? "http://localhost:5173";
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: account.client_email,
      options: {
        redirectTo: `${siteUrl}/crm`,
      },
    });

    if (linkErr) throw linkErr;

    return respond({ magic_link: linkData.properties.action_link });

  } catch (err) {
    console.error("generate-magic-link error:", err);
    return respond({ error: (err as Error).message ?? "Internal error" }, 500);
  }
});
