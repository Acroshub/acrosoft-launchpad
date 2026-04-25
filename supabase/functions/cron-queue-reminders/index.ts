import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// ── Types (mirrors ReminderRulesEditor.tsx) ────────────────────────────────────

interface ReminderRule {
  id: string;
  recipient:        "contact" | "business";
  /** New multi-select array */
  businessTargets?: string[];
  /** @deprecated kept for backward-compat */
  businessTarget?:  string;
  channel:          "email" | "whatsapp";
  channelValue:     string;
  timing:           "before" | "after";
  amount:           number;
  unit:             "minutes" | "hours" | "days";
}

/** Normalize old single-target field to array */
function getTargets(rule: ReminderRule): string[] {
  if (rule.businessTargets?.length) return rule.businessTargets;
  if (rule.businessTarget)          return [rule.businessTarget];
  return ["admin"];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function unitToMs(unit: ReminderRule["unit"]): number {
  if (unit === "minutes") return 60_000;
  if (unit === "hours")   return 3_600_000;
  return 86_400_000;
}

function scheduledAtFor(apptTime: Date, rule: ReminderRule): Date {
  const offsetMs = rule.amount * unitToMs(rule.unit);
  return rule.timing === "before"
    ? new Date(apptTime.getTime() - offsetMs)
    : new Date(apptTime.getTime() + offsetMs);
}

/** Stored in business_target to deduplicate rule-based reminders */
function ruleMarker(sourceId: string, ruleId: string, targetId: string) {
  return `rule:${sourceId}:${ruleId}:${targetId}`;
}

interface Appointment {
  id: string;
  contact_id: string | null;
  date: string;
  hour: number;
  user_id: string;
  calendar_id: string | null;
}

interface Contact {
  name: string | null;
  email: string | null;
  phone: string | null;
}

async function processRules(
  rules: ReminderRule[],
  appointments: Appointment[],
  sourceId: string,
  now: Date,
  lookaheadEnd: Date,
): Promise<number> {
  let queued = 0;

  for (const appt of appointments) {
    const apptTime = new Date(`${appt.date}T${String(appt.hour).padStart(2, "0")}:00:00`);
    if (apptTime < now) continue;

    const { data: contact } = await supabase
      .from("crm_contacts")
      .select("name, email, phone")
      .eq("id", appt.contact_id)
      .single() as { data: Contact | null };

    const contactName = contact?.name ?? "Cliente";

    for (const rule of rules) {
      // on_booking rules are fired immediately by crm-calendar-book — skip here
      if ((rule as any).timing === "on_booking") continue;

      const scheduledAt = scheduledAtFor(apptTime, rule);

      // Only queue if due within the lookahead window
      if (scheduledAt > lookaheadEnd) continue;
      // Skip if already more than 1 hour past (missed)
      if (scheduledAt < new Date(now.getTime() - 3_600_000)) continue;

      if (rule.recipient === "contact") {
        // ── Contact reminder — resolve from the actual contact row ──────────
        const channelValue = rule.channel === "email"
          ? (contact?.email ?? "")
          : (contact?.phone ?? "");
        if (!channelValue) continue;

        const marker = ruleMarker(sourceId, rule.id, "contact");

        const { count: existingCount } = await supabase
          .from("crm_reminders")
          .select("id", { count: "exact", head: true })
          .eq("appointment_id", appt.id)
          .eq("business_target", marker);

        if ((existingCount ?? 0) > 0) continue;

        const message = `Hola ${contactName}, te recordamos tu cita el ${appt.date} a las ${String(appt.hour).padStart(2, "0")}:00 hs.`;

        const { data: newReminder } = await supabase
          .from("crm_reminders")
          .insert({
            user_id:         appt.user_id,
            appointment_id:  appt.id,
            contact_id:      appt.contact_id,
            type:            rule.channel,
            recipient_email: rule.channel === "email"    ? channelValue : null,
            recipient_phone: rule.channel === "whatsapp" ? channelValue : null,
            scheduled_at:    scheduledAt.toISOString(),
            message,
            status:          "pending",
            is_auto:         true,
            business_target: marker,
          })
          .select("id")
          .single();

        if (newReminder?.id) {
          await supabase.from("crm_reminder_queue").insert({ reminder_id: newReminder.id });
          queued++;
        }

      } else {
        // ── Business reminder — one per selected target ──────────────────────
        const targets = getTargets(rule);

        for (const targetId of targets) {
          const marker = ruleMarker(sourceId, rule.id, targetId);

          const { count: existingCount } = await supabase
            .from("crm_reminders")
            .select("id", { count: "exact", head: true })
            .eq("appointment_id", appt.id)
            .eq("business_target", marker);

          if ((existingCount ?? 0) > 0) continue;

          // Resolve contact info for this target from DB
          let channelValue = "";
          if (targetId === "admin") {
            const { data: profile } = await supabase
              .from("crm_business_profile")
              .select("contact_email, contact_phone, whatsapp")
              .eq("user_id", appt.user_id)
              .single();
            channelValue = rule.channel === "email"
              ? (profile?.contact_email ?? "")
              : (profile?.contact_phone ?? profile?.whatsapp ?? "");
          } else {
            const { data: staffMember } = await supabase
              .from("crm_staff")
              .select("email, phone")
              .eq("id", targetId)
              .single();
            channelValue = rule.channel === "email"
              ? (staffMember?.email ?? "")
              : (staffMember?.phone ?? "");
          }

          if (!channelValue) continue;

          const message = `Cita confirmada: ${contactName} el ${appt.date} a las ${String(appt.hour).padStart(2, "0")}:00 hs.`;

          const { data: newReminder } = await supabase
            .from("crm_reminders")
            .insert({
              user_id:         appt.user_id,
              appointment_id:  appt.id,
              contact_id:      appt.contact_id,
              type:            rule.channel,
              recipient_email: rule.channel === "email"    ? channelValue : null,
              recipient_phone: rule.channel === "whatsapp" ? channelValue : null,
              scheduled_at:    scheduledAt.toISOString(),
              message,
              status:          "pending",
              is_auto:         true,
              business_target: marker,
            })
            .select("id")
            .single();

          if (newReminder?.id) {
            await supabase.from("crm_reminder_queue").insert({ reminder_id: newReminder.id });
            queued++;
          }
        }
      }
    }
  }

  return queued;
}

/**
 * POST /functions/v1/cron-queue-reminders
 *
 * Scheduled CRON — runs every 5 minutes via pg_cron.
 *
 * Passes:
 *  A) Legacy config-based auto-reminders (crm_reminder_config.auto_enabled)
 *  B) Calendar reminder_rules (crm_calendar_config.reminder_rules)
 *  C) Form reminder_rules for forms linked to calendars
 *     (crm_forms.reminder_rules where crm_calendar_config.linked_form_id = form.id)
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SITE_URL          = Deno.env.get("SUPABASE_URL") ?? "";
  const LOOKAHEAD_MINUTES = 15;
  const LOOKAHEAD_DAYS    = 7;
  const now               = new Date();
  const lookaheadEnd      = new Date(now.getTime() + LOOKAHEAD_MINUTES * 60_000);
  const maxDate           = new Date(now.getTime() + LOOKAHEAD_DAYS * 86_400_000);
  const todayStr          = now.toISOString().slice(0, 10);
  const maxDateStr        = maxDate.toISOString().slice(0, 10);

  let totalQueued = 0;

  try {
    // ════════════════════════════════════════════════════════════════════════════
    // PASS A — Legacy auto-config (crm_reminder_config.auto_enabled = true)
    // ════════════════════════════════════════════════════════════════════════════
    const { data: configs } = await supabase
      .from("crm_reminder_config")
      .select("user_id, auto_reminder_before_hours, default_type, email_limit_per_month")
      .eq("auto_enabled", true);

    for (const cfg of configs ?? []) {
      const windowHours = cfg.auto_reminder_before_hours ?? 24;
      const windowEnd   = new Date(now.getTime() + windowHours * 3_600_000);

      const { data: appointments } = await supabase
        .from("crm_appointments")
        .select("id, contact_id, date, hour, user_id")
        .eq("user_id", cfg.user_id)
        .eq("status", "confirmed")
        .gte("date", todayStr)
        .lte("date", windowEnd.toISOString().slice(0, 10));

      if (!appointments?.length) continue;

      // Monthly limit check
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { count: usedThisMonth } = await supabase
        .from("crm_reminders")
        .select("id", { count: "exact", head: true })
        .eq("user_id", cfg.user_id)
        .gte("created_at", monthStart)
        .in("status", ["sent", "pending"]);

      const limit   = cfg.email_limit_per_month ?? 100;
      let remaining = limit - (usedThisMonth ?? 0);

      for (const appt of appointments) {
        const apptTime = new Date(`${appt.date}T${String(appt.hour).padStart(2, "0")}:00:00`);
        if (apptTime < now || apptTime > windowEnd) continue;

        const { count: existing } = await supabase
          .from("crm_reminders")
          .select("id", { count: "exact", head: true })
          .eq("appointment_id", appt.id)
          .is("business_target", null)
          .neq("status", "failed");

        if ((existing ?? 0) > 0) continue;
        if (remaining <= 0) continue;

        const { data: contact } = await supabase
          .from("crm_contacts")
          .select("name, email, phone")
          .eq("id", appt.contact_id)
          .single();

        const contactName = contact?.name ?? "Cliente";
        const message = `Hola ${contactName}, te recordamos que tienes una cita el ${appt.date} a las ${String(appt.hour).padStart(2, "0")}:00 hs.`;
        const scheduledAt = new Date(apptTime.getTime() - windowHours * 3_600_000);

        const { data: newReminder } = await supabase
          .from("crm_reminders")
          .insert({
            user_id:         cfg.user_id,
            appointment_id:  appt.id,
            contact_id:      appt.contact_id,
            type:            cfg.default_type,
            recipient_email: cfg.default_type === "email"     ? (contact?.email ?? null) : null,
            recipient_phone: cfg.default_type === "whatsapp"  ? (contact?.phone ?? null) : null,
            scheduled_at:    scheduledAt.toISOString(),
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

    // ════════════════════════════════════════════════════════════════════════════
    // PASS B — Calendar reminder_rules
    // ════════════════════════════════════════════════════════════════════════════
    const { data: calendarConfigs } = await supabase
      .from("crm_calendar_config")
      .select("id, user_id, reminder_rules, linked_form_id")
      .not("reminder_rules", "is", null);

    for (const calConfig of calendarConfigs ?? []) {
      const calRules = (calConfig.reminder_rules ?? []) as ReminderRule[];
      if (!calRules.length) continue;

      const { data: appointments } = await supabase
        .from("crm_appointments")
        .select("id, contact_id, date, hour, user_id, calendar_id")
        .eq("calendar_id", calConfig.id)
        .eq("status", "confirmed")
        .gte("date", todayStr)
        .lte("date", maxDateStr);

      if (!appointments?.length) continue;

      const n = await processRules(calRules, appointments as Appointment[], calConfig.id, now, lookaheadEnd);
      totalQueued += n;

      // ── Pass C: form rules linked to this calendar ──────────────────────────
      if (calConfig.linked_form_id) {
        const { data: form } = await supabase
          .from("crm_forms")
          .select("id, reminder_rules")
          .eq("id", calConfig.linked_form_id)
          .single();

        if (form) {
          const formRules = (form.reminder_rules ?? []) as ReminderRule[];
          if (formRules.length) {
            const m = await processRules(formRules, appointments as Appointment[], form.id, now, lookaheadEnd);
            totalQueued += m;
          }
        }
      }
    }

    // ── Flush queue immediately ───────────────────────────────────────────────
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
