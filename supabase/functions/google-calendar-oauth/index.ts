import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // ── Verify caller is authenticated ───────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return respond({ error: "Unauthorized" }, 401);

  const { data: { user: caller }, error: authErr } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", "")
  );
  if (authErr || !caller) return respond({ error: "Unauthorized" }, 401);

  try {
    const { code, calendar_id, redirect_uri } = await req.json();
    if (!code || !calendar_id) return respond({ error: "Missing code or calendar_id" }, 400);

    // ── Verify the calendar belongs to the authenticated user ─────────────────
    const { data: calRow, error: calErr } = await supabase
      .from("crm_calendar_config")
      .select("id")
      .eq("id", calendar_id)
      .eq("user_id", caller.id)
      .maybeSingle();

    if (calErr || !calRow) return respond({ error: "Calendar not found" }, 404);

    const clientId     = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
    const siteUrl      = Deno.env.get("SITE_URL") ?? "http://localhost:5173";

    // Only allow redirect_uri from our own origin
    let redirectUri = `${siteUrl}/oauth/google-calendar`;
    if (redirect_uri) {
      try {
        const parsed = new URL(redirect_uri);
        const site   = new URL(siteUrl);
        if (parsed.origin === site.origin) redirectUri = redirect_uri;
      } catch { /* invalid URL — use default */ }
    }

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
    if (tokenData.error) {
      console.error("google-calendar-oauth token exchange error:", tokenData.error, tokenData.error_description);
      return respond({ error: "Error al conectar con Google Calendar" }, 400);
    }

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

    if (!calendarsRes.ok) {
      console.error("Failed to fetch calendars:", calendarsRes.status);
      return respond({ error: "Error al obtener los calendarios de Google" }, 400);
    }
    const calendarsData = await calendarsRes.json();
    const calendars = (calendarsData.items ?? []).map((cal: { id: string; summary: string; primary?: boolean }) => ({
      id: cal.id,
      summary: cal.summary,
      primary: cal.primary ?? false,
    }));

    // Save token to DB
    const { error } = await supabase
      .from("crm_calendar_config")
      .update({ google_token: googleToken })
      .eq("id", calendar_id);

    if (error) throw error;

    return respond({ success: true, calendars });
  } catch (err) {
    console.error("google-calendar-oauth error:", err);
    return respond({ error: "Error interno al conectar con Google Calendar" }, 500);
  }
});
