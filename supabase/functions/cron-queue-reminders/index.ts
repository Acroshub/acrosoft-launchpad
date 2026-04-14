import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

/**
 * POST /functions/v1/cron-queue-reminders
 *
 * Scheduled CRON — runs every 5 minutes via pg_cron or Supabase cron.
 *
 * For each user with auto_enabled=true:
 *   1. Find upcoming appointments within their configured window (e.g. 24h)
 *   2. Skip appointments that already have a reminder
 *   3. Check monthly limit
 *   4. Create crm_reminder + crm_reminder_queue rows
 *   5. Call send-reminders to flush the queue immediately
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SITE_URL = Deno.env.get("SITE_URL") ?? "https://rhlnjtrbydwzzuvqayfo.supabase.co";

  try {
    // ── 1. Load all users with auto reminders enabled ────────────────────────
    const { data: configs, error: cfgErr } = await supabase
      .from("crm_reminder_config")
      .select("user_id, auto_reminder_before_hours, default_type, email_limit_per_month")
      .eq("auto_enabled", true);

    if (cfgErr) throw cfgErr;
    if (!configs?.length) return new Response(JSON.stringify({ queued: 0 }));

    let totalQueued = 0;

    for (const cfg of configs) {
      const windowHours = cfg.auto_reminder_before_hours ?? 24;
      const now       = new Date();
      const windowEnd = new Date(now.getTime() + windowHours * 60 * 60 * 1000);

      // ── 2. Find upcoming confirmed appointments in window ──────────────────
      const nowDate     = now.toISOString().slice(0, 10);
      const windowDate  = windowEnd.toISOString().slice(0, 10);

      const { data: appointments } = await supabase
        .from("crm_appointments")
        .select("id, contact_id, date, hour, user_id")
        .eq("user_id", cfg.user_id)
        .eq("status", "confirmed")
        .gte("date", nowDate)
        .lte("date", windowDate);

      if (!appointments?.length) continue;

      // ── 3. Check monthly usage ─────────────────────────────────────────────
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { count: usedThisMonth } = await supabase
        .from("crm_reminders")
        .select("id", { count: "exact", head: true })
        .eq("user_id", cfg.user_id)
        .gte("created_at", monthStart)
        .in("status", ["sent", "pending"]);

      const limit     = cfg.email_limit_per_month ?? 100;
      let remaining   = limit - (usedThisMonth ?? 0);

      for (const appt of appointments) {
        // Build exact appointment datetime
        const apptTime = new Date(`${appt.date}T${String(appt.hour).padStart(2, "0")}:00:00`);

        // Skip if not within window
        if (apptTime < now || apptTime > windowEnd) continue;

        // ── 4. Skip if reminder already exists for this appointment ───────────
        const { count: existing } = await supabase
          .from("crm_reminders")
          .select("id", { count: "exact", head: true })
          .eq("appointment_id", appt.id)
          .neq("status", "failed");

        if ((existing ?? 0) > 0) continue;

        // ── 5. Respect monthly limit ──────────────────────────────────────────
        if (remaining <= 0) {
          await supabase.from("crm_reminders").insert({
            user_id:        cfg.user_id,
            appointment_id: appt.id,
            contact_id:     appt.contact_id,
            type:           cfg.default_type,
            scheduled_at:   new Date(apptTime.getTime() - windowHours * 3600000).toISOString(),
            message:        "Recordatorio automático (límite mensual alcanzado)",
            status:         "skipped",
            is_auto:        true,
          });
          continue;
        }

        // ── 6. Load contact info for recipient details ────────────────────────
        const { data: contact } = await supabase
          .from("crm_contacts")
          .select("name, email, phone")
          .eq("id", appt.contact_id)
          .single();

        const recipientEmail = contact?.email ?? null;
        const recipientPhone = contact?.phone ?? null;
        const contactName    = contact?.name ?? "Cliente";

        const message = `Hola ${contactName}, te recordamos que tienes una cita el ${appt.date} a las ${String(appt.hour).padStart(2, "0")}:00 hs.`;

        // ── 7. Create reminder + enqueue ──────────────────────────────────────
        const { data: newReminder } = await supabase
          .from("crm_reminders")
          .insert({
            user_id:         cfg.user_id,
            appointment_id:  appt.id,
            contact_id:      appt.contact_id,
            type:            cfg.default_type,
            recipient_email: cfg.default_type === "email" ? recipientEmail : null,
            recipient_phone: cfg.default_type === "whatsapp" ? recipientPhone : null,
            scheduled_at:    new Date().toISOString(),
            message,
            status:          "pending",
            is_auto:         true,
          })
          .select("id")
          .single();

        if (newReminder?.id) {
          await supabase.from("crm_reminder_queue").insert({ reminder_id: newReminder.id });
          remaining--;
          totalQueued++;
        }
      }
    }

    // ── 8. Flush queue ────────────────────────────────────────────────────────
    if (totalQueued > 0) {
      await fetch(`${SITE_URL}/functions/v1/send-reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ queued: totalQueued }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("cron-queue-reminders error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
