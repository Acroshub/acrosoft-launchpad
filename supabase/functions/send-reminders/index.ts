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
 * POST /functions/v1/send-reminders
 *
 * Processes pending items from crm_reminder_queue whose scheduled_at <= now().
 * Called by a pg_cron job every 5 minutes.
 *
 * For each queued reminder:
 *   - type "email"    → Resend API
 *   - type "whatsapp" → reserved for future WhatsApp integration
 *
 * Marks each reminder as sent/failed and updates crm_reminder_queue accordingly.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const RESEND_FROM    = Deno.env.get("RESEND_FROM_EMAIL") ?? "noreply@acrosoft.app";
  const now            = new Date();

  // ── 1. Fetch pending queue items (max 50 per run) ───────────────────────────
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
    // Load reminder details
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
    const scheduledAt = new Date(reminder.scheduled_at);
    if (scheduledAt > now) {
      skipped++;
      continue; // leave as pending, will be picked up in a future run
    }

    // Mark as processing
    await supabase
      .from("crm_reminder_queue")
      .update({ status: "processing", attempts: item.attempts + 1 })
      .eq("id", item.id);

    try {
      if (reminder.type === "email") {
        // ── Email via Resend ────────────────────────────────────────────────────
        if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");
        if (!reminder.recipient_email) throw new Error("No recipient email on reminder");

        const emailHtml = buildEmailHtml(reminder.message);

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: RESEND_FROM,
            to:   [reminder.recipient_email],
            subject: "Recordatorio de tu cita",
            html: emailHtml,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Resend error ${res.status}: ${errText}`);
        }

      } else if (reminder.type === "whatsapp") {
        // ── WhatsApp — not yet implemented ─────────────────────────────────────
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

function buildEmailHtml(message: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Recordatorio de cita</title>
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
              <p style="margin:0 0 16px;font-size:16px;color:#18181b;line-height:1.6;">${message}</p>
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
