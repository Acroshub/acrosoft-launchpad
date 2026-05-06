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

// ── Variable resolution ────────────────────────────────────────────────────────

interface TemplateVars {
  contact_name?:       string;
  contact_email?:      string;
  contact_phone?:      string;
  appointment_date?:   string;
  appointment_time?:   string;
  appointment_service?: string;
  calendar_name?:      string;
  business_name?:      string;
}

function resolveVariables(text: string, vars: TemplateVars): string {
  return text
    .replace(/\{\{contact\.name\}\}/g,           vars.contact_name        ?? "")
    .replace(/\{\{contact\.email\}\}/g,          vars.contact_email       ?? "")
    .replace(/\{\{contact\.phone\}\}/g,          vars.contact_phone       ?? "")
    .replace(/\{\{appointment\.date\}\}/g,       vars.appointment_date    ?? "")
    .replace(/\{\{appointment\.time\}\}/g,       vars.appointment_time    ?? "")
    .replace(/\{\{appointment\.service\}\}/g,    vars.appointment_service ?? "")
    .replace(/\{\{calendar\.name\}\}/g,          vars.calendar_name       ?? "")
    .replace(/\{\{business\.name\}\}/g,          vars.business_name       ?? "");
}

async function buildTemplateVars(reminder: Record<string, any>): Promise<TemplateVars> {
  const vars: TemplateVars = {};

  if (reminder.contact_id) {
    const { data: contact } = await supabase
      .from("crm_contacts")
      .select("name, email, phone")
      .eq("id", reminder.contact_id)
      .single();
    if (contact) {
      vars.contact_name  = contact.name  ?? undefined;
      vars.contact_email = contact.email ?? undefined;
      vars.contact_phone = contact.phone ?? undefined;
    }
  }

  if (reminder.appointment_id) {
    const { data: appt } = await supabase
      .from("crm_appointments")
      .select("date, hour, minute, service_name, calendar_id")
      .eq("id", reminder.appointment_id)
      .single();
    if (appt) {
      vars.appointment_date = appt.date ?? undefined;
      const h = String(appt.hour ?? 0).padStart(2, "0");
      const m = String(appt.minute ?? 0).padStart(2, "0");
      vars.appointment_time    = `${h}:${m}`;
      vars.appointment_service = appt.service_name ?? undefined;

      if (appt.calendar_id) {
        const { data: cal } = await supabase
          .from("crm_calendar_config")
          .select("name")
          .eq("id", appt.calendar_id)
          .single();
        if (cal) vars.calendar_name = cal.name ?? undefined;
      }
    }
  }

  if (reminder.user_id) {
    const { data: profile } = await supabase
      .from("crm_business_profile")
      .select("business_name, first_name, last_name")
      .eq("user_id", reminder.user_id)
      .single();
    if (profile) {
      vars.business_name = profile.business_name
        ?? [profile.first_name, profile.last_name].filter(Boolean).join(" ")
        ?? undefined;
    }
  }

  return vars;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const RESEND_FROM    = `Acrosoft <${Deno.env.get("RESEND_FROM_EMAIL") ?? "noreply@acrosoftlabs.com"}>`;
  const now            = new Date();

  // ── 1. Fetch pending queue items ─────────────────────────────────────────────
  const staleThreshold = new Date(now.getTime() - 10 * 60_000).toISOString();
  await supabase
    .from("crm_reminder_queue")
    .update({ status: "pending" })
    .eq("status", "processing")
    .lt("updated_at", staleThreshold)
    .lt("attempts", 3);

  const { data: queueItems, error: qErr } = await supabase
    .from("crm_reminder_queue")
    .select("id, reminder_id, attempts")
    .eq("status", "pending")
    .lt("attempts", 3)
    .order("created_at", { ascending: true })
    .limit(50);

  if (qErr) return respond({ error: qErr.message }, 500);
  if (!queueItems?.length) return respond({ processed: 0, sent: 0, failed: 0, skipped: 0 });

  let sent = 0, failed = 0, skipped = 0;

  for (const item of queueItems) {
    const { data: reminder } = await supabase
      .from("crm_reminders")
      .select("*")
      .eq("id", item.reminder_id)
      .single();

    if (!reminder) {
      await supabase
        .from("crm_reminder_queue")
        .update({ status: "failed", error: "Reminder not found" })
        .eq("id", item.id);
      failed++;
      continue;
    }

    // ── 2. Skip if not yet due ────────────────────────────────────────────────
    if (new Date(reminder.scheduled_at) > now) {
      skipped++;
      continue;
    }

    await supabase
      .from("crm_reminder_queue")
      .update({ status: "processing", attempts: item.attempts + 1 })
      .eq("id", item.id);

    try {
      // ── Resolve template variables ──────────────────────────────────────────
      const vars = await buildTemplateVars(reminder);

      const resolvedMessage = resolveVariables(reminder.message ?? "", vars);
      const resolvedSubject = reminder.subject
        ? resolveVariables(reminder.subject, vars)
        : "Recordatorio de tu cita";

      if (reminder.type === "email") {
        if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");
        if (!reminder.recipient_email) throw new Error("No recipient email on reminder");

        const emailHtml = buildEmailHtml(resolvedMessage);

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from:    RESEND_FROM,
            to:      [reminder.recipient_email],
            subject: resolvedSubject,
            html:    emailHtml,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Resend error ${res.status}: ${errText}`);
        }

      } else if (reminder.type === "whatsapp") {
        throw new Error("WhatsApp channel not yet configured");
      } else {
        throw new Error(`Unknown channel type: ${reminder.type}`);
      }

      // ── Success ─────────────────────────────────────────────────────────────
      await supabase
        .from("crm_reminders")
        .update({ status: "sent", sent_at: now.toISOString() })
        .eq("id", reminder.id);

      await supabase
        .from("crm_reminder_queue")
        .update({ status: "sent", processed_at: now.toISOString() })
        .eq("id", item.id);

      sent++;

    } catch (err) {
      const errMsg = (err as Error).message;
      console.error(`Reminder ${reminder.id} failed:`, errMsg);

      const nextStatus = item.attempts + 1 >= 3 ? "failed" : "pending";

      await supabase
        .from("crm_reminders")
        .update({ status: nextStatus === "failed" ? "failed" : reminder.status, error: errMsg })
        .eq("id", reminder.id);

      await supabase
        .from("crm_reminder_queue")
        .update({ status: nextStatus, error: errMsg })
        .eq("id", item.id);

      failed++;
    }
  }

  return respond({ processed: queueItems.length, sent, failed, skipped });
});

// ── Email HTML template ────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildEmailHtml(message: string): string {
  const m = escapeHtml(message);
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Notificación</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background:#18181b;padding:24px 32px;">
              <p style="margin:0;color:#ffffff;font-size:18px;font-weight:600;">Acrosoft</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:16px;color:#18181b;line-height:1.6;white-space:pre-wrap">${m}</p>
              <p style="margin:24px 0 0;font-size:13px;color:#71717a;">Si tienes alguna duda, no dudes en contactarnos.</p>
            </td>
          </tr>
          <tr>
            <td style="background:#f4f4f5;padding:16px 32px;border-top:1px solid #e4e4e7;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;text-align:center;">Este es un mensaje automático, por favor no respondas a este correo.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
