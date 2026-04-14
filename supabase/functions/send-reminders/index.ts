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
 * Processes pending items from crm_reminder_queue.
 * Called by the cron-queue-reminders function or manually.
 *
 * For each queued reminder:
 *   - type "email"    → Resend API
 *   - type "whatsapp" → Twilio API (uses per-user crm_whatsapp_config)
 *
 * Marks each reminder as sent/failed and updates crm_reminders.status.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const RESEND_API_KEY  = Deno.env.get("RESEND_API_KEY");
  const RESEND_FROM     = Deno.env.get("RESEND_FROM_EMAIL") ?? "noreply@acrosoft.app";

  // ── 1. Fetch pending queue items (max 50 per run) ───────────────────────────
  const { data: queueItems, error: qErr } = await supabase
    .from("crm_reminder_queue")
    .select("id, reminder_id, attempts")
    .eq("status", "pending")
    .lt("attempts", 3)          // max 3 attempts
    .order("created_at", { ascending: true })
    .limit(50);

  if (qErr) return respond({ error: qErr.message }, 500);
  if (!queueItems?.length) return respond({ processed: 0 });

  let sent = 0, failed = 0;

  for (const item of queueItems) {
    // Mark as processing
    await supabase
      .from("crm_reminder_queue")
      .update({ status: "processing", attempts: item.attempts + 1 })
      .eq("id", item.id);

    // Load reminder details
    const { data: reminder } = await supabase
      .from("crm_reminders")
      .select("*")
      .eq("id", item.reminder_id)
      .single();

    if (!reminder) {
      await supabase.from("crm_reminder_queue").update({ status: "failed", error: "Reminder not found" }).eq("id", item.id);
      failed++;
      continue;
    }

    try {
      if (reminder.type === "email") {
        // ── Email via Resend ──────────────────────────────────────────────────
        if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");
        if (!reminder.recipient_email) throw new Error("No recipient email");

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: RESEND_FROM,
            to: [reminder.recipient_email],
            subject: "Recordatorio de tu cita",
            html: `<p>${reminder.message}</p>`,
          }),
        });

        if (!res.ok) {
          const err = await res.text();
          throw new Error(`Resend error: ${err}`);
        }

      } else if (reminder.type === "whatsapp") {
        // ── WhatsApp via Twilio ───────────────────────────────────────────────
        const { data: wpConfig } = await supabase
          .from("crm_whatsapp_config")
          .select("twilio_account_sid, twilio_auth_token, twilio_phone_number")
          .eq("user_id", reminder.user_id)
          .single();

        if (!wpConfig) throw new Error("WhatsApp no configurado para este usuario");
        if (!reminder.recipient_phone) throw new Error("No recipient phone");

        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${wpConfig.twilio_account_sid}/Messages.json`;
        const body = new URLSearchParams({
          From: `whatsapp:${wpConfig.twilio_phone_number}`,
          To:   `whatsapp:${reminder.recipient_phone}`,
          Body: reminder.message,
        });

        const res = await fetch(twilioUrl, {
          method: "POST",
          headers: {
            "Authorization": `Basic ${btoa(`${wpConfig.twilio_account_sid}:${wpConfig.twilio_auth_token}`)}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body,
        });

        if (!res.ok) {
          const err = await res.text();
          throw new Error(`Twilio error: ${err}`);
        }
      }

      // ── Success ──────────────────────────────────────────────────────────────
      await supabase.from("crm_reminders").update({
        status: "sent",
        sent_at: new Date().toISOString(),
      }).eq("id", reminder.id);

      await supabase.from("crm_reminder_queue").update({
        status: "sent",
        processed_at: new Date().toISOString(),
      }).eq("id", item.id);

      sent++;

    } catch (err) {
      const errMsg = (err as Error).message;
      console.error(`Reminder ${reminder.id} failed:`, errMsg);

      await supabase.from("crm_reminders").update({
        status: "failed",
        error: errMsg,
      }).eq("id", reminder.id);

      await supabase.from("crm_reminder_queue").update({
        status: item.attempts + 1 >= 3 ? "failed" : "pending",  // retry if < 3 attempts
        error: errMsg,
      }).eq("id", item.id);

      failed++;
    }
  }

  return respond({ processed: queueItems.length, sent, failed });
});
