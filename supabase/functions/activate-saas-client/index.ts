import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const SUPER_ADMIN_EMAIL = "e.daniel.acero.r@gmail.com";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

/**
 * POST /functions/v1/activate-saas-client
 *
 * Body:
 *   contact_id  string   — ID del contacto en crm_contacts
 *   plan_id     string?  — ID del servicio SaaS (crm_services.is_saas = true)
 *   starts_at   string?  — Fecha inicio YYYY-MM-DD (default: hoy)
 *   expires_at  string?  — Fecha vencimiento YYYY-MM-DD (null = sin vencimiento)
 *   notes       string?  — Notas internas
 *
 * Solo el superadmin puede llamar esta función.
 *
 * Flujo:
 *   1. Verificar que caller es superadmin
 *   2. Cargar contacto (requiere email)
 *   3. Buscar/crear usuario auth:
 *      a. Si ya hay crm_client_accounts → reutilizar client_user_id
 *      b. Si no → intentar invite. Si el email ya existe en auth → buscar por RPC
 *   4. Upsert crm_saas_access con plan, fechas y notas
 *   5. Crear o reactivar crm_client_accounts
 *   6. Seed business profile si es usuario completamente nuevo
 */
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ── 1. Verificar superadmin ──────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return respond({ error: "No autorizado" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !caller || caller.email !== SUPER_ADMIN_EMAIL) {
      return respond({ error: "Solo el superadmin puede activar acceso SaaS" }, 403);
    }

    const { contact_id, plan_id, starts_at, expires_at, notes } = await req.json();
    if (!contact_id) return respond({ error: "contact_id es requerido" }, 400);

    // ── 2. Cargar contacto ───────────────────────────────────────────────────
    const { data: contact, error: contactErr } = await supabase
      .from("crm_contacts")
      .select("id, name, email")
      .eq("id", contact_id)
      .single();

    if (contactErr || !contact) return respond({ error: "Contacto no encontrado" }, 404);
    if (!contact.email) return respond({ error: "El contacto no tiene email" }, 400);

    // ── 3. Obtener o crear usuario auth ──────────────────────────────────────
    let clientUserId: string;
    let isNewUser = false;

    // 3a. Buscar cuenta existente via crm_client_accounts
    const { data: existingAccount } = await supabase
      .from("crm_client_accounts")
      .select("id, status, client_user_id")
      .eq("contact_id", contact_id)
      .maybeSingle();

    if (existingAccount?.client_user_id) {
      // Cuenta ya existe — reutilizar
      clientUserId = existingAccount.client_user_id;
    } else {
      // 3b. Intentar crear usuario via invite
      const { data: inviteData, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(
        contact.email,
        {
          redirectTo: `${Deno.env.get("SITE_URL") ?? "http://localhost:5173"}/crm-setup`,
          data: {
            full_name: contact.name,
            account_type: "saas_client",
            admin_user_id: caller.id,
          },
        },
      );

      if (inviteErr) {
        // 3c. El email ya existe en auth.users — buscar su ID via RPC
        const isAlreadyRegistered =
          inviteErr.message?.toLowerCase().includes("already registered") ||
          inviteErr.message?.toLowerCase().includes("already been registered") ||
          (inviteErr as any).status === 422;

        if (!isAlreadyRegistered) throw inviteErr;

        const { data: existingUserId, error: rpcErr } = await supabase.rpc(
          "get_user_id_by_email",
          { lookup_email: contact.email },
        );

        if (rpcErr || !existingUserId) {
          return respond({
            error: `El email ${contact.email} ya tiene una cuenta pero no se pudo recuperar. Contacta soporte.`,
          }, 409);
        }

        clientUserId = existingUserId as string;
        // No es usuario nuevo — ya existía, solo vinculamos
      } else {
        clientUserId = inviteData.user.id;
        isNewUser = true;
      }
    }

    // ── 4. Upsert crm_saas_access ────────────────────────────────────────────
    const { error: accessErr } = await supabase
      .from("crm_saas_access")
      .upsert(
        {
          contact_id,
          activated_by: caller.id,
          plan_id: plan_id ?? null,
          status: "active",
          starts_at: starts_at ?? new Date().toISOString().split("T")[0],
          expires_at: expires_at ?? null,
          notes: notes ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "contact_id" },
      );
    if (accessErr) throw accessErr;

    // ── 5. Crear o reactivar crm_client_accounts ─────────────────────────────
    if (!existingAccount) {
      const { error: insertErr } = await supabase.from("crm_client_accounts").insert({
        admin_user_id: caller.id,
        contact_id,
        client_user_id: clientUserId,
        client_email: contact.email,
        status: "active",
      });
      // Ignorar conflictos si la cuenta ya existe por alguna race condition
      if (insertErr && !insertErr.message?.includes("duplicate")) throw insertErr;
    } else if (existingAccount.status === "disabled") {
      await supabase
        .from("crm_client_accounts")
        .update({ status: "active", disabled_at: null })
        .eq("id", existingAccount.id);
    }

    // ── 6. Seed business profile para usuario completamente nuevo ────────────
    if (isNewUser) {
      try {
        const { data: existingProfile } = await supabase
          .from("crm_business_profile")
          .select("id")
          .eq("user_id", clientUserId)
          .maybeSingle();

        if (!existingProfile) {
          await supabase.from("crm_business_profile").insert({
            user_id: clientUserId,
            business_name: contact.name,
            contact_email: contact.email,
            color_primary: "#2563EB",
            color_secondary: "#1E40AF",
            color_accent: "#DBEAFE",
          });
        }
      } catch (e) {
        console.error("Business profile seed (non-fatal):", e);
      }
    }

    return respond({ success: true, client_user_id: clientUserId, is_new_user: isNewUser });
  } catch (err) {
    console.error("activate-saas-client error:", err);
    return respond({ error: "Error interno del servidor" }, 500);
  }
});
