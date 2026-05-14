import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const DEFAULT_AVAILABILITY = {
  Lun: { open: true,  slots: [{ from: "9:00 AM", to: "6:00 PM" }] },
  Mar: { open: true,  slots: [{ from: "9:00 AM", to: "6:00 PM" }] },
  Mié: { open: true,  slots: [{ from: "9:00 AM", to: "6:00 PM" }] },
  Jue: { open: true,  slots: [{ from: "9:00 AM", to: "6:00 PM" }] },
  Vie: { open: true,  slots: [{ from: "9:00 AM", to: "6:00 PM" }] },
  Sáb: { open: false, slots: [{ from: "9:00 AM", to: "2:00 PM" }] },
  Dom: { open: false, slots: [{ from: "9:00 AM", to: "2:00 PM" }] },
};

/**
 * POST /functions/v1/invite-vendor-user
 *
 * Called by the superadmin to invite a vendor.
 *
 * Body: { email: string, vendor_id: string, name: string }
 *
 * Flow:
 *   1. Verify caller JWT → owner
 *   2. Load crm_vendors row, verify ownership
 *   3. inviteUserByEmail → redirects to /crm
 *   4. Set vendor_user_id on crm_vendors record
 *   5. Create default calendar, form and pipeline under vendor's user_id
 */
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return respond({ error: "Unauthorized" }, 401);

  const { data: { user: owner }, error: authErr } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", ""),
  );
  if (authErr || !owner) return respond({ error: "Unauthorized" }, 401);

  try {
    const { email, vendor_id, name, resend } = await req.json();
    if (!email || !vendor_id) return respond({ error: "email y vendor_id son requeridos" }, 400);

    // ── 1. Load vendor and verify ownership ─────────────────────────────────
    const { data: vendor, error: vendorErr } = await supabase
      .from("crm_vendors")
      .select("id, name, email, slug, status, vendor_user_id")
      .eq("id", vendor_id)
      .eq("owner_user_id", owner.id)
      .single();

    if (vendorErr || !vendor) return respond({ error: "Vendedor no encontrado" }, 404);

    // ── 2. Si es reenvío, limpiar el auth user anterior ──────────────────────
    if (resend && vendor.vendor_user_id) {
      await supabase.auth.admin.deleteUser(vendor.vendor_user_id);
      await supabase
        .from("crm_vendors")
        .update({ vendor_user_id: null, status: "invited" })
        .eq("id", vendor_id);
    }

    const siteUrl = Deno.env.get("SITE_URL") ?? "http://localhost:5173";

    // ── 3. Send invitation ───────────────────────────────────────────────────
    let vendorUserId: string;

    const { data: inviteData, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: `${siteUrl}/crm-setup`,
        data: {
          full_name:    name ?? vendor.name,
          account_type: "vendor",
          vendor_id:    vendor.id,
          owner_user_id: owner.id,
        },
      },
    );

    if (inviteErr) {
      const msg = inviteErr.message?.toLowerCase() ?? "";
      // Already registered — find and link
      if (msg.includes("already registered") || msg.includes("already been registered")) {
        const emailLower = email.toLowerCase();
        let existingId: string | undefined;
        let page = 1;
        outer: while (true) {
          const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
          if (listErr || !users?.length) break;
          const found = users.find((u) => u.email?.toLowerCase() === emailLower);
          if (found) { existingId = found.id; break outer; }
          if (users.length < 1000) break;
          page++;
        }
        if (!existingId) return respond({ error: "No se pudo encontrar el usuario" }, 500);
        vendorUserId = existingId;
      } else {
        return respond({ error: "Error al enviar invitación: " + inviteErr.message }, 500);
      }
    } else {
      vendorUserId = inviteData.user.id;
    }

    // ── 3. Link vendor_user_id and mark invited ──────────────────────────────
    await supabase
      .from("crm_vendors")
      .update({ vendor_user_id: vendorUserId, status: "invited" })
      .eq("id", vendor_id);

    // ── 4. Create default resources under vendor's user_id ───────────────────

    // 4a. Basic form — 3 fields
    const { data: form } = await supabase
      .from("crm_forms")
      .insert({
        user_id: vendorUserId,
        name:    "Formulario Básico",
        fields: [
          { id: "field_name",  type: "text",  label: "Nombre",             required: true },
          { id: "field_email", type: "email", label: "Correo electrónico", required: true },
          { id: "field_phone", type: "phone", label: "WhatsApp",           required: true },
        ],
        submit_label:     "Agendar reunión",
        success_action:   "popup",
        success_message:  "¡Tu reunión ha sido agendada!",
        success_image:    "icon",
        is_basic_form:    true,
      })
      .select("id")
      .single();

    // 4b. Calendar with full config + 4 reminder rules
    const reminderRules = [
      {
        id: "r1",
        recipient: "contact",
        channel: "email",
        channelValue: "",
        timing: "on_booking",
        amount: 0,
        unit: "minutes",
        subject: "Cita Confirmada - Acrosoft",
        content: "Hola {{contact.name}}, tu reunión para hablar de tu sitio web está confirmada el {{appointment.date}} a las {{appointment.time}}.",
      },
      {
        id: "r2",
        recipient: "business",
        businessTargets: ["vendor"],
        businessTarget: "vendor",
        channel: "email",
        channelValue: "",
        timing: "on_booking",
        amount: 0,
        unit: "minutes",
        subject: "Cita Confirmada - Acrosoft",
        content: "Hola {{vendedor.name}}, tienes una reunión confirmada con {{contact.name}}, su teléfono es {{contact.phone}}. La reunión es el {{appointment.date}} a las {{appointment.time}}.",
      },
      {
        id: "r3",
        recipient: "contact",
        channel: "email",
        channelValue: "",
        timing: "before",
        amount: 1,
        unit: "hours",
        subject: "Recordatorio: tu reunión es pronto — {{appointment.date}}",
        content: "Hola {{contact.name}}, te recordamos que tienes una reunión el {{appointment.date}} a las {{appointment.time}}.",
      },
      {
        id: "r4",
        recipient: "business",
        businessTargets: ["vendor"],
        businessTarget: "vendor",
        channel: "email",
        channelValue: "",
        timing: "before",
        amount: 1,
        unit: "hours",
        subject: "Recordatorio: reunión en 1 hora — {{contact.name}}",
        content: "Hola {{vendedor.name}}, en 1 hora tienes una reunión con {{contact.name}}. La reunión es a las {{appointment.time}}.",
      },
    ];

    const { data: newCal } = await supabase
      .from("crm_calendar_config")
      .insert({
        user_id:          vendorUserId,
        name:             "Agenda tu Reunión",
        duration_min:     60,
        buffer_min:       0,
        min_advance_hours: 1,
        max_future_days:  5,
        availability:     DEFAULT_AVAILABILITY,
        linked_form_id:   form?.id ?? null,
        timezone:         "America/La_Paz",
        reminder_rules:   reminderRules,
      })
      .select("id")
      .single();

    // Guardar landing_calendar_id en el vendor para la landing page
    if (newCal?.id) {
      await supabase
        .from("crm_vendors")
        .update({ landing_calendar_id: newCal.id })
        .eq("id", vendor_id);
    }

    // 4c. Pipeline "Seguimiento de Leads"
    await supabase
      .from("crm_pipelines")
      .insert({
        user_id:      vendorUserId,
        name:         "Seguimiento de Leads",
        type:         "contacts",
        column_names: ["Nuevo Lead", "En contacto", "Propuesta enviada", "Cerrado"],
      });

    return respond({ success: true, vendor_user_id: vendorUserId });

  } catch (err) {
    console.error("invite-vendor-user error:", err);
    return respond({ error: "Error interno" }, 500);
  }
});
