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
    const { email, vendor_id, name } = await req.json();
    if (!email || !vendor_id) return respond({ error: "email y vendor_id son requeridos" }, 400);

    // ── 1. Load vendor and verify ownership ─────────────────────────────────
    const { data: vendor, error: vendorErr } = await supabase
      .from("crm_vendors")
      .select("id, name, email, slug, status")
      .eq("id", vendor_id)
      .eq("owner_user_id", owner.id)
      .single();

    if (vendorErr || !vendor) return respond({ error: "Vendedor no encontrado" }, 404);

    const siteUrl = Deno.env.get("SITE_URL") ?? "http://localhost:5173";

    // ── 2. Send invitation ───────────────────────────────────────────────────
    let vendorUserId: string;

    const { data: inviteData, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: `${siteUrl}/crm`,
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

    // 4a. Basic form
    const { data: form } = await supabase
      .from("crm_forms")
      .insert({
        user_id: vendorUserId,
        name:    "Formulario Básico",
        fields: [
          { id: "field_name",  type: "text",  label: "Nombre",             required: true },
          { id: "field_email", type: "email", label: "Correo electrónico", required: true },
        ],
        submit_label:     "Enviar",
        success_action:   "popup",
        success_message:  "¡Gracias por contactarnos!",
        success_image:    "icon",
        is_basic_form:    true,
      })
      .select("id")
      .single();

    // 4b. Calendar linked to that form
    await supabase
      .from("crm_calendar_config")
      .insert({
        user_id:        vendorUserId,
        name:           "Mi Calendario",
        duration_min:   30,
        buffer_min:     10,
        availability:   DEFAULT_AVAILABILITY,
        linked_form_id: form?.id ?? null,
        timezone:       "America/La_Paz",
      });

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
