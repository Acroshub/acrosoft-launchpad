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
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { code, calendar_id, redirect_uri } = await req.json();
    if (!code || !calendar_id) return respond({ error: "Missing code or calendar_id" }, 400);

    const clientId     = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
    const redirectUri  = redirect_uri ?? `${Deno.env.get("SITE_URL")}/oauth/google-calendar`;

    // Exchange authorization code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  redirectUri,
        grant_type:    "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error) return respond({ error: tokenData.error_description ?? tokenData.error }, 400);

    const googleToken = {
      access_token:  tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at:    Date.now() + tokenData.expires_in * 1000,
      token_type:    tokenData.token_type,
      scope:         tokenData.scope,
    };

    // Get list of calendars
    const calendarsRes = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const calendarsData = await calendarsRes.json();
    const calendars = (calendarsData.items ?? []).map((cal: any) => ({
      id: cal.id,
      summary: cal.summary,
      primary: cal.primary ?? false,
    }));

    // Save token to DB (without calendar_id yet - user will choose)
    const { error } = await supabase
      .from("crm_calendar_config")
      .update({ google_token: googleToken })
      .eq("id", calendar_id);

    if (error) throw error;

    return respond({ success: true, calendars });
  } catch (err) {
    console.error(err);
    return respond({ error: "Internal server error" }, 500);
  }
});
