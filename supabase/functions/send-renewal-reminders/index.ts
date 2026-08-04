import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Función invocada solo por pg_cron (server-to-server) — sin llamadas desde el navegador,
// por eso no necesita manejo de CORS como las funciones que sí exponen a clientes.

/**
 * GET/POST /functions/v1/send-renewal-reminders
 *
 * Disparado a diario por pg_cron. Para cada renovación próxima (dentro de 7 días) o
 * vencida que todavía no se avisó:
 *   1. Le manda al tenant (dueño del CRM) UN correo resumen con todas sus renovaciones.
 *   2. Le manda al cliente final (el contacto que compró) un recordatorio individual de
 *      SU renovación, si tiene correo registrado.
 * Cada renovación se avisa una sola vez (renewal_reminder_sent_at) — no se reenvía cada día.
 */

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM    = `Acrosoft <${Deno.env.get("RESEND_FROM_EMAIL") ?? "noreply@acrosoftlabs.com"}>`;
const APP_URL         = Deno.env.get("APP_URL") ?? "https://acrosoftlabs.com";

type SaleRow = {
  id: string;
  user_id: string;
  contact_id: string | null;
  contact_name: string | null;
  service_id: string | null;
  service_name: string | null;
  course_plan_id: string | null;
  course_name: string | null;
  product_plan_id: string | null;
  product_name: string | null;
  created_at: string;
  next_renewal_date: string;
  next_renewal_amount: number | null;
  next_renewal_currency: string | null;
  renewal_reminder_sent_at: string | null;
};

function daysUntil(dateStr: string): number {
  const due = new Date(`${dateStr}T00:00:00`);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

// Tono interno, para el admin: "Vencido hace 2 días" / "Vence hoy" / "Vence en 3 días"
function adminDueLabel(dateStr: string): string {
  const days = daysUntil(dateStr);
  if (days < 0) return `Vencido hace ${Math.abs(days)} día${Math.abs(days) !== 1 ? "s" : ""}`;
  if (days === 0) return "Vence hoy";
  if (days === 1) return "Vence mañana";
  return `Vence en ${days} días`;
}

// Tono para el cliente final: orientado a "tu pago", con la fecha en vez de "hace X días"
function customerDueLabel(dateStr: string): string {
  const days = daysUntil(dateStr);
  const dateFmt = new Date(`${dateStr}T00:00:00`).toLocaleDateString("es-ES", { day: "numeric", month: "long" });
  if (days < 0)  return `Tu pago venció el ${dateFmt}`;
  if (days === 0) return `Tu pago vence hoy, ${dateFmt}`;
  return `Tu próximo pago es el ${dateFmt}`;
}

function fmtAmount(amount: number | null, currency: string | null): string {
  if (amount == null) return "";
  return `${currency ?? "USD"} ${amount.toFixed(2)}`;
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) return false;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: RESEND_FROM, to: [to], subject, html }),
  });
  if (!r.ok) console.error(`[send-renewal-reminders] resend error (to:${to}):`, await r.text());
  return r.ok;
}

Deno.serve(async (_req: Request) => {
  const jsonHeaders = { "Content-Type": "application/json" };

  try {
    const { data: sales, error } = await supabase
      .from("crm_sales")
      .select("id,user_id,contact_id,contact_name,service_id,service_name,course_plan_id,course_name,product_plan_id,product_name,created_at,next_renewal_date,next_renewal_amount,next_renewal_currency,renewal_reminder_sent_at")
      .not("next_renewal_date", "is", null);

    if (error) throw error;
    if (!sales?.length) {
      return new Response(JSON.stringify({ ok: true, tenants_notified: 0, customers_notified: 0 }), { headers: jsonHeaders });
    }

    // Solo la venta más reciente por (tenant + contacto + servicio/plan) representa la
    // suscripción vigente — se calcula sobre TODAS las filas, sin filtrar aún por si ya
    // se avisó, para no confundir una venta vieja con la actual.
    const latestBySub = new Map<string, SaleRow>();
    for (const s of sales as SaleRow[]) {
      const entityId = s.service_id ?? s.course_plan_id ?? s.product_plan_id;
      if (!entityId || !s.contact_id) continue;
      const key = `${s.user_id}|${s.contact_id}|${entityId}`;
      const existing = latestBySub.get(key);
      if (!existing || new Date(s.created_at) > new Date(existing.created_at)) {
        latestBySub.set(key, s);
      }
    }

    // Ventana: hasta 7 días antes del vencimiento (incluye las ya vencidas), y que no se
    // haya avisado todavía de ESTE ciclo de renovación.
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 7);
    cutoff.setHours(23, 59, 59, 999);
    const due = [...latestBySub.values()].filter(s =>
      new Date(`${s.next_renewal_date}T00:00:00`) <= cutoff && !s.renewal_reminder_sent_at
    );

    if (!due.length) {
      return new Response(JSON.stringify({ ok: true, tenants_notified: 0, customers_notified: 0 }), { headers: jsonHeaders });
    }

    // Datos de los clientes finales (contactos) — para el recordatorio individual.
    const contactIds = [...new Set(due.map(s => s.contact_id!).filter(Boolean))];
    const { data: contactRows } = await supabase
      .from("crm_contacts")
      .select("id, name, email")
      .in("id", contactIds);
    const contactById = new Map((contactRows ?? []).map(c => [c.id, c]));

    const byTenant = new Map<string, SaleRow[]>();
    for (const s of due) {
      if (!byTenant.has(s.user_id)) byTenant.set(s.user_id, []);
      byTenant.get(s.user_id)!.push(s);
    }

    let tenantsNotified = 0;
    let customersNotified = 0;

    for (const [userId, items] of byTenant) {
      const { data: profile } = await supabase
        .from("crm_business_profile")
        .select("contact_email, business_name, whatsapp")
        .eq("user_id", userId)
        .maybeSingle();

      const businessName = profile?.business_name ?? "tu proveedor";

      // ── 1. Resumen para el admin/tenant ──────────────────────────────────
      if (profile?.contact_email) {
        items.sort((a, b) => new Date(a.next_renewal_date).getTime() - new Date(b.next_renewal_date).getTime());

        const itemsHtml = items.map(s => {
          const itemName = s.course_name ?? s.product_name ?? s.service_name ?? "Producto";
          return `
            <div style="padding:12px 0;border-bottom:1px solid #fde68a;">
              <p style="margin:0;font-size:14px;color:#1f2937;"><strong>${s.contact_name ?? "Cliente"}</strong> — ${itemName}</p>
              <p style="margin:2px 0 0;font-size:13px;color:#92400e;">${adminDueLabel(s.next_renewal_date)} · ${fmtAmount(s.next_renewal_amount, s.next_renewal_currency)}</p>
            </div>
          `;
        }).join("");

        const n = items.length;
        const subject = `Tienes ${n} renovación${n !== 1 ? "es" : ""} por atender`;
        const html = `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#ffffff;">
            <h2 style="font-size:20px;font-weight:700;margin:0 0 8px;color:#111827;">Tienes ${n} renovación${n !== 1 ? "es" : ""} por atender</h2>
            <p style="font-size:14px;color:#4b5563;margin:0 0 20px;">
              Estos pagos recurrentes de tus clientes están próximos o ya vencieron. Regístralos manualmente en tu CRM cuando confirmes el cobro.
            </p>
            <div style="border:1px solid #fde68a;background:#fffbeb;border-radius:12px;padding:0 16px;margin-bottom:24px;">
              ${itemsHtml}
            </div>
            <a href="${APP_URL}/crm" style="display:inline-block;background:#f59e0b;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">
              Ir a Ventas → Renovaciones →
            </a>
            <p style="color:#9ca3af;font-size:12px;margin-top:28px;border-top:1px solid #eee;padding-top:16px;">
              Recordatorio automático de Acrosoft Labs. Si ya registraste estos pagos, puedes ignorar este mensaje.
            </p>
          </div>
        `;

        if (await sendEmail(profile.contact_email, subject, html)) tenantsNotified++;
      }

      // ── 2. Recordatorio individual para cada cliente final ───────────────
      const whatsappLine = profile?.whatsapp
        ? `<p style="font-size:14px;margin:0 0 20px;"><a href="https://wa.me/${profile.whatsapp.replace(/\D/g, "")}" style="color:#2563eb;text-decoration:none;font-weight:600;">Escríbenos por WhatsApp →</a></p>`
        : "";

      for (const s of items) {
        const contact = s.contact_id ? contactById.get(s.contact_id) : null;
        if (!contact?.email) continue;

        const itemName = s.course_name ?? s.product_name ?? s.service_name ?? "tu servicio";
        const firstName = (contact.name ?? s.contact_name ?? "").split(" ")[0] || "Hola";
        const subject = `Recordatorio de pago — ${itemName}`;
        const html = `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#ffffff;">
            <h2 style="font-size:18px;font-weight:700;margin:0 0 12px;color:#111827;">Hola ${firstName},</h2>
            <p style="font-size:14px;color:#374151;margin:0 0 20px;">
              Este es un recordatorio de tu suscripción con <strong>${businessName}</strong>:
            </p>
            <div style="border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:20px;">
              <p style="margin:0;font-size:15px;font-weight:600;color:#111827;">${itemName}</p>
              <p style="margin:4px 0 0;font-size:14px;color:#6b7280;">${fmtAmount(s.next_renewal_amount, s.next_renewal_currency)} · ${customerDueLabel(s.next_renewal_date)}</p>
            </div>
            <p style="font-size:14px;color:#374151;margin:0 0 16px;">
              Si ya realizaste tu pago, puedes ignorar este mensaje.
            </p>
            ${whatsappLine}
            <p style="color:#9ca3af;font-size:12px;margin-top:24px;border-top:1px solid #eee;padding-top:16px;">
              Enviado por ${businessName} a través de Acrosoft.
            </p>
          </div>
        `;

        if (await sendEmail(contact.email, subject, html)) customersNotified++;
      }
    }

    // Se marca como "avisado" todo lo procesado en este ciclo, haya o no correo disponible
    // para enviar — evita reintentos infinitos cuando falta configuración (correo, etc.).
    await supabase
      .from("crm_sales")
      .update({ renewal_reminder_sent_at: new Date().toISOString() })
      .in("id", due.map(s => s.id));

    return new Response(JSON.stringify({
      ok: true, tenants_notified: tenantsNotified, customers_notified: customersNotified, renewals_marked: due.length,
    }), { headers: jsonHeaders });
  } catch (err) {
    console.error("[send-renewal-reminders]", err);
    return new Response(JSON.stringify({ error: "Error interno" }), {
      status: 500, headers: jsonHeaders,
    });
  }
});
