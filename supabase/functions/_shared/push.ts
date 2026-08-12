import webpush from "npm:web-push@3.6.7";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

let vapidConfigured = false;
function ensureVapid() {
  if (vapidConfigured) return;
  webpush.setVapidDetails(
    Deno.env.get("VAPID_SUBJECT") ?? "mailto:soporte@acrossoftware.com",
    Deno.env.get("VAPID_PUBLIC_KEY")!,
    Deno.env.get("VAPID_PRIVATE_KEY")!,
  );
  vapidConfigured = true;
}

// Cuántas suscripciones se envían en paralelo por tanda (evita saturar CPU/memoria de la
// función o el rate limit del push service en broadcasts grandes).
const SEND_BATCH_SIZE = 25;

type PushSubscriptionRow = { id: string; endpoint: string; p256dh: string; auth_key: string };

/**
 * Envía una notificación push a las suscripciones activas de la lista de user_ids dada.
 * `userIds: null` = sin filtro, le pega a TODAS las suscripciones existentes.
 * Limpia automáticamente las suscripciones vencidas (404/410) que encuentre.
 */
export async function sendPushToUsers(
  supabase: SupabaseClient,
  userIds: string[] | null,
  payload: { title: string; body: string; url?: string },
): Promise<{ recipients: number; successCount: number; failureCount: number }> {
  if (userIds && userIds.length === 0) return { recipients: 0, successCount: 0, failureCount: 0 };
  ensureVapid();

  let query = supabase.from("crm_push_subscriptions").select("id, endpoint, p256dh, auth_key");
  if (userIds) query = query.in("user_id", userIds);
  const { data: subscriptions, error } = await query;
  if (error) throw error;

  const all = (subscriptions ?? []) as PushSubscriptionRow[];
  const json = JSON.stringify(payload);
  let successCount = 0;
  let failureCount = 0;
  const expiredIds: string[] = [];

  const sendOne = async (sub: PushSubscriptionRow) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        json,
      );
      successCount++;
    } catch (err) {
      failureCount++;
      const statusCode = (err as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) expiredIds.push(sub.id);
    }
  };

  for (let i = 0; i < all.length; i += SEND_BATCH_SIZE) {
    await Promise.all(all.slice(i, i + SEND_BATCH_SIZE).map(sendOne));
  }

  if (expiredIds.length > 0) {
    await supabase.from("crm_push_subscriptions").delete().in("id", expiredIds);
  }

  return { recipients: all.length, successCount, failureCount };
}
