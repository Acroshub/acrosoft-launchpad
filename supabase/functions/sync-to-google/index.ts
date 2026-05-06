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

async function getValidToken(token: any): Promise<{ accessToken: string; expiresIn?: number } | null> {
  if (!token) return null;
  if (token.expires_at && Date.now() < token.expires_at - 60_000) return { accessToken: token.access_token };
  if (!token.refresh_token) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "refresh_token",
      refresh_token: token.refresh_token,
      client_id:     Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
    }),
  });

  const data = await res.json();
  if (data.error) { console.error("Token refresh failed:", data.error); return null; }
  return { accessToken: data.access_token, expiresIn: data.expires_in as number };
}

function toGoogleDateTime(date: string, hour: number, minute: number, timezone: string) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return { dateTime: `${date}T${pad(hour)}:${pad(minute)}:00`, timeZone: timezone };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { appointment_id, action } = await req.json() as {
      appointment_id: string;
      action: "create" | "update" | "delete";
    };

    if (!appointment_id || !action) return respond({ error: "Missing fields" }, 400);

    const { data: appt, error: apptErr } = await supabase
      .from("crm_appointments").select("*").eq("id", appointment_id).single();
    if (apptErr || !appt) return respond({ error: "Appointment not found" }, 404);

    const { data: calendar, error: calErr } = await supabase
      .from("crm_calendar_config").select("*").eq("id", appt.calendar_id).single();
    if (calErr || !calendar) return respond({ skipped: true, reason: "Calendar not found" });

    if (!calendar.google_token || !calendar.google_calendar_id)
      return respond({ skipped: true, reason: "Google Calendar not connected or not selected" });

    const tokenResult = await getValidToken(calendar.google_token);
    if (!tokenResult) return respond({ skipped: true, reason: "Could not obtain valid access token" });

    const accessToken = tokenResult.accessToken;
    if (accessToken !== (calendar.google_token as any).access_token) {
      const expiresAt = tokenResult.expiresIn
        ? Date.now() + tokenResult.expiresIn * 1000
        : Date.now() + 3600_000;
      await supabase.from("crm_calendar_config").update({
        google_token: { ...(calendar.google_token as any), access_token: accessToken, expires_at: expiresAt },
      }).eq("id", calendar.id);
    }

    const timezone   = (calendar.timezone as string) || "UTC";
    const durationMin = (calendar.duration_min as number) || 30;
    const googleCalendarId = calendar.google_calendar_id as string;

    let contactName = "Cliente";
    let contactEmail: string | null = null;
    if (appt.contact_id) {
      const { data: contact } = await supabase.from("crm_contacts").select("name, email").eq("id", appt.contact_id).single();
      if (contact) { contactName = contact.name ?? "Cliente"; contactEmail = contact.email ?? null; }
    }

    const calendarApiBase = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(googleCalendarId)}/events`;
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    if (action === "delete") {
      const googleEventId = appt.google_event_id;
      if (!googleEventId) return respond({ skipped: true, reason: "No google_event_id to delete" });
      const res = await fetch(`${calendarApiBase}/${googleEventId}`, { method: "DELETE", headers: authHeader });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Google Calendar API delete error:", res.status, data);
        return respond({ error: `Google Calendar delete error: ${data.error?.message || res.statusText}` }, 400);
      }
      return respond({ success: true });
    }

    const startHour   = appt.hour as number;
    const startMinute = (appt.minute as number) ?? 0;
    const endTotalMin = startHour * 60 + startMinute + durationMin;
    const endHour     = Math.floor(endTotalMin / 60);
    const endMinute   = endTotalMin % 60;

    // Si la cita cruza medianoche, el evento termina al día siguiente
    let endDate = appt.date as string;
    if (endHour >= 24) {
      const next = new Date(`${appt.date}T00:00:00`);
      next.setDate(next.getDate() + 1);
      endDate = next.toISOString().slice(0, 10);
    }

    const eventBody: any = {
      summary:     `${calendar.name ?? "Cita"} — ${contactName}`,
      description: appt.notes ?? "",
      start: toGoogleDateTime(appt.date, startHour, startMinute, timezone),
      end:   toGoogleDateTime(endDate, endHour % 24, endMinute,  timezone),
    };

    if (action === "create") {
      const res  = await fetch(calendarApiBase, { method: "POST", headers: { ...authHeader, "Content-Type": "application/json" }, body: JSON.stringify(eventBody) });
      const data = await res.json();
      if (!res.ok) {
        console.error("Google Calendar API create error:", res.status, data);
        return respond({ error: `Google Calendar error: ${data.error?.message || res.statusText}` }, 400);
      }
      if (data.id) await supabase.from("crm_appointments").update({ google_event_id: data.id }).eq("id", appointment_id);
      return respond({ success: true, google_event_id: data.id });
    }

    if (action === "update") {
      const googleEventId = appt.google_event_id;
      if (!googleEventId) {
        const res  = await fetch(calendarApiBase, { method: "POST", headers: { ...authHeader, "Content-Type": "application/json" }, body: JSON.stringify(eventBody) });
        const data = await res.json();
        if (!res.ok) {
          console.error("Google Calendar API create-on-update error:", res.status, data);
          return respond({ error: `Google Calendar error: ${data.error?.message || res.statusText}` }, 400);
        }
        if (data.id) await supabase.from("crm_appointments").update({ google_event_id: data.id }).eq("id", appointment_id);
        return respond({ success: true, google_event_id: data.id });
      }
      const res = await fetch(`${calendarApiBase}/${googleEventId}`, { method: "PUT", headers: { ...authHeader, "Content-Type": "application/json" }, body: JSON.stringify(eventBody) });
      const data = await res.json();
      if (!res.ok) {
        console.error("Google Calendar API update error:", res.status, data);
        return respond({ error: `Google Calendar error: ${data.error?.message || res.statusText}` }, 400);
      }
      return respond({ success: true });
    }

    return respond({ skipped: true, reason: "Unknown action" });
  } catch (err) {
    console.error(err);
    return respond({ error: "Internal server error" }, 500);
  }
});
