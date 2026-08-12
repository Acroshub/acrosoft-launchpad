import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { getCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

// Cuántas suscripciones se envían en paralelo por tanda (evita saturar CPU/memoria de la
// función o el rate limit del push service en broadcasts grandes con target_type: 'all').
const SEND_BATCH_SIZE = 25;

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:soporte@acrossoftware.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

type TargetType = "all" | "tenant" | "user";
type Subscription = { id: string; endpoint: string; p256dh: string; auth_key: string };

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

    let query = supabase.from("crm_push_subscriptions").select("id, endpoint, p256dh, auth_key");
    if (userIds) query = query.in("user_id", userIds);
    const { data: subscriptions, error: subsErr } = await query;
    if (subsErr) throw subsErr;

    const payload = JSON.stringify({ title: title.trim(), body: message.trim(), url: url?.trim() || undefined });

    let successCount = 0;
    let failureCount = 0;
    const expiredIds: string[] = [];
    const allSubscriptions = (subscriptions ?? []) as Subscription[];

    const sendOne = async (sub: Subscription) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          payload,
        );
        successCount++;
      } catch (err) {
        failureCount++;
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) expiredIds.push(sub.id);
      }
    };

    for (let i = 0; i < allSubscriptions.length; i += SEND_BATCH_SIZE) {
      const batch = allSubscriptions.slice(i, i + SEND_BATCH_SIZE);
      await Promise.all(batch.map(sendOne));
    }

    if (expiredIds.length > 0) {
      await supabase.from("crm_push_subscriptions").delete().in("id", expiredIds);
    }

    const { error: logErr } = await supabase.from("crm_push_notification_log").insert({
      sent_by: caller.id,
      title: title.trim(),
      body: message.trim(),
      url: url?.trim() || null,
      target_type,
      target_id: target_type === "all" ? null : target_id,
      recipients_count: subscriptions?.length ?? 0,
      success_count: successCount,
      failure_count: failureCount,
    });
    // Los pushes ya se enviaron — un fallo al guardar el historial no debe convertirse
    // en un 500 que le haga creer al admin que el envío completo falló.
    if (logErr) console.error("Error guardando log de notificación:", logErr);

    return respond({ success: true, recipients: subscriptions?.length ?? 0, successCount, failureCount });
  } catch (err) {
    console.error("send-push-notification error:", err);
    return respond({ error: "Error interno del servidor" }, 500);
  }
});
