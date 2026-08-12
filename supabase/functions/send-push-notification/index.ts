import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendPushToUsers } from "../_shared/push.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

type TargetType = "all" | "tenant" | "user";

/**
 * POST /functions/v1/send-push-notification
 *
 * Body: { title, body, url?, target_type: 'all' | 'tenant' | 'user', target_id? }
 *   - 'all'    → todas las suscripciones activas.
 *   - 'tenant' → target_id = user_id del Dueño de Negocio; incluye su Staff activo.
 *   - 'user'   → target_id = user_id de un único usuario (pruebas).
 *
 * Solo el SuperAdmin (Acros Software) puede llamar esta función.
 */
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return respond({ error: "No autorizado" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !caller) return respond({ error: "No autorizado" }, 401);

    // Cliente con el JWT del caller (no service role) para que auth.uid() dentro de
    // is_acrosoft_admin() resuelva correctamente — misma fuente de verdad que usan las
    // RLS policies y admin_push_subscriptions_count(), en vez de un email hardcodeado
    // que podría desincronizarse de esa función.
    const callerClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: isAdmin, error: adminErr } = await callerClient.rpc("is_acrosoft_admin");
    if (adminErr || !isAdmin) return respond({ error: "No autorizado" }, 403);

    const body = await req.json();
    const { title, body: message, url, target_type, target_id } = body as {
      title?: string; body?: string; url?: string; target_type?: TargetType; target_id?: string;
    };

    if (!title?.trim() || !message?.trim()) return respond({ error: "title y body son requeridos" }, 400);
    if (!["all", "tenant", "user"].includes(target_type ?? "")) {
      return respond({ error: "target_type debe ser 'all', 'tenant' o 'user'" }, 400);
    }
    if (target_type !== "all" && !target_id) {
      return respond({ error: "target_id es requerido para target_type 'tenant' o 'user'" }, 400);
    }

    // Resolver destinatarios (user_ids)
    let userIds: string[] | null = null; // null = sin filtro (todos)
    if (target_type === "user") {
      userIds = [target_id!];
    } else if (target_type === "tenant") {
      const { data: staff } = await supabase
        .from("crm_staff")
        .select("staff_user_id")
        .eq("owner_user_id", target_id!)
        .eq("status", "active");
      userIds = [target_id!, ...(staff ?? []).map((s) => s.staff_user_id as string)];
    }

    const { recipients, successCount, failureCount } = await sendPushToUsers(supabase, userIds, {
      title: title.trim(),
      body: message.trim(),
      url: url?.trim() || undefined,
    });

    const { error: logErr } = await supabase.from("crm_push_notification_log").insert({
      sent_by: caller.id,
      title: title.trim(),
      body: message.trim(),
      url: url?.trim() || null,
      target_type,
      target_id: target_type === "all" ? null : target_id,
      recipients_count: recipients,
      success_count: successCount,
      failure_count: failureCount,
    });
    // Los pushes ya se enviaron — un fallo al guardar el historial no debe convertirse
    // en un 500 que le haga creer al admin que el envío completo falló.
    if (logErr) console.error("Error guardando log de notificación:", logErr);

    return respond({ success: true, recipients, successCount, failureCount });
  } catch (err) {
    console.error("send-push-notification error:", err);
    return respond({ error: "Error interno del servidor" }, 500);
  }
});
