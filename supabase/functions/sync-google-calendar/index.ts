import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";
// Watch channels expire in 7 days; we renew at 6 days
const CHANNEL_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface GoogleToken {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  token_type: string;
}

async function refreshAccessToken(token: GoogleToken): Promise<GoogleToken | null> {
  if (!token.refresh_token) return null;
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      refresh_token: token.refresh_token,
      grant_type:    "refresh_token",
    }),
  });
  const data = await res.json();
  if (data.error || !data.access_token) return null;
  return {
    ...token,
    access_token: data.access_token,
    expires_at:   Date.now() + (data.expires_in ?? 3600) * 1000,
  };
}

async function getValidToken(token: GoogleToken, calendarConfigId: string): Promise<string | null> {
  if (Date.now() < token.expires_at - 5 * 60 * 1000) return token.access_token;
  const refreshed = await refreshAccessToken(token);
  if (!refreshed) return null;
  await supabase.from("crm_calendar_config").update({ google_token: refreshed }).eq("id", calendarConfigId);
  return refreshed.access_token;
}

async function syncTenant(calendarConfigId: string, userId: string, googleCalendarId: string, token: GoogleToken) {
  const accessToken = await getValidToken(token, calendarConfigId);
  if (!accessToken) {
    console.error(`[sync-google] no valid token for calendar ${calendarConfigId}`);
    return;
  }

  const now = new Date();
  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString();

  const params = new URLSearchParams({
    timeMin, timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });

  const res = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(googleCalendarId)}/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!res.ok) {
    console.error(`[sync-google] Google API ${res.status} for ${calendarConfigId}`);
    return;
  }

  const data = await res.json();
  const items: any[] = data.items ?? [];
  const googleEventIds = items.map((e: any) => e.id);

  const upsertRows = items
    .filter((e: any) => e.start?.dateTime && e.end?.dateTime && e.status !== "cancelled")
    .map((e: any) => ({
      user_id:            userId,
      calendar_config_id: calendarConfigId,
      google_event_id:    e.id,
      title:              e.summary ?? null,
      start_at:           e.start.dateTime,
      end_at:             e.end.dateTime,
      synced_at:          new Date().toISOString(),
    }));

  if (upsertRows.length > 0) {
    const { error } = await supabase.from("crm_google_events")
      .upsert(upsertRows, { onConflict: "user_id,google_event_id" });
    if (error) console.error("[sync-google] upsert error:", error.message);
  }

  // Delete events deleted or out of range in Google
  const deleteQuery = supabase.from("crm_google_events")
    .delete()
    .eq("user_id", userId)
    .eq("calendar_config_id", calendarConfigId);

  if (googleEventIds.length > 0) {
    deleteQuery.not("google_event_id", "in", `(${googleEventIds.map((id: string) => `"${id}"`).join(",")})`);
  }
  await deleteQuery;

  console.log(`[sync-google] synced ${upsertRows.length} events for ${calendarConfigId}`);
}

// Register a Google push-notification watch channel for a calendar config
async function registerWatch(calendarConfigId: string, googleCalendarId: string, accessToken: string) {
  const channelId = crypto.randomUUID();
  const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/sync-google-calendar`;

  const res = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(googleCalendarId)}/events/watch`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        id:      channelId,
        type:    "web_hook",
        address: webhookUrl,
        expiration: String(Date.now() + CHANNEL_TTL_MS),
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    console.error(`[sync-google] watch registration failed: ${err}`);
    return;
  }

  const ch = await res.json();
  await supabase.from("crm_calendar_config").update({
    google_channel_id:          channelId,
    google_resource_id:         ch.resourceId ?? null,
    google_channel_expires_at:  new Date(Date.now() + CHANNEL_TTL_MS).toISOString(),
  }).eq("id", calendarConfigId);

  console.log(`[sync-google] watch registered for ${calendarConfigId} → channel ${channelId}`);
}

// Stop a watch channel (called before re-registering)
async function stopWatch(channelId: string, resourceId: string, accessToken: string) {
  await fetch(`${CALENDAR_API}/channels/stop`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ id: channelId, resourceId }),
  }).catch(() => {});
}

Deno.serve(async (req) => {
  const ok = (body: unknown = { ok: true }) =>
    new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

  // ── Google push notification ───────────────────────────────────────────────
  // Google sends X-Goog-Channel-Id and X-Goog-Resource-State headers
  const channelId    = req.headers.get("x-goog-channel-id");
  const resourceState = req.headers.get("x-goog-resource-state");

  if (channelId) {
    // "sync" is the initial handshake — just acknowledge
    if (resourceState === "sync") return ok();

    // Any other state ("exists", "not_exists") → find which calendar and sync it
    const { data: cfg } = await supabase
      .from("crm_calendar_config")
      .select("id, user_id, google_token, google_calendar_id")
      .eq("google_channel_id", channelId)
      .maybeSingle();

    if (cfg?.google_token && cfg?.google_calendar_id) {
      await syncTenant(cfg.id, cfg.user_id, cfg.google_calendar_id, cfg.google_token as GoogleToken);
    }
    return ok();
  }

  // ── Manual / cron invocation ───────────────────────────────────────────────
  let targetId: string | null = null;
  let registerWatchFlag = false;

  if (req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    targetId = body.calendar_config_id ?? null;
    registerWatchFlag = body.register_watch ?? false;
  }

  const query = supabase
    .from("crm_calendar_config")
    .select("id, user_id, google_token, google_calendar_id, google_channel_id, google_resource_id, google_channel_expires_at")
    .not("google_token", "is", null)
    .not("google_calendar_id", "is", null);

  if (targetId) query.eq("id", targetId);

  const { data: configs, error } = await query;
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  if (!configs || configs.length === 0) return ok({ ok: true, synced: 0 });

  await Promise.all(configs.map(async (cfg: any) => {
    const token = cfg.google_token as GoogleToken;
    const accessToken = await getValidToken(token, cfg.id);
    if (!accessToken) return;

    // Sync events
    await syncTenant(cfg.id, cfg.user_id, cfg.google_calendar_id, token);

    // Register or renew watch channel if:
    // - explicitly requested (first connect), OR
    // - channel is missing, OR
    // - channel expires within 24h
    const expiresAt = cfg.google_channel_expires_at ? new Date(cfg.google_channel_expires_at).getTime() : 0;
    const needsWatch = registerWatchFlag || !cfg.google_channel_id || expiresAt < Date.now() + 24 * 60 * 60 * 1000;

    if (needsWatch) {
      if (cfg.google_channel_id && cfg.google_resource_id) {
        await stopWatch(cfg.google_channel_id, cfg.google_resource_id, accessToken);
      }
      await registerWatch(cfg.id, cfg.google_calendar_id, accessToken);
    }
  }));

  return ok({ ok: true, synced: configs.length });
});
