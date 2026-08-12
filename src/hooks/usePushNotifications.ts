import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/useAuth";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64Url: string) {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function detectDeviceType(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

export function isIos() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

export function isStandalonePwa() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function isPushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

const STATUS_QUERY_KEY = ["push_subscription_status"];

/** Estado de la suscripción push del dispositivo actual (solo lado cliente, no consulta la DB). */
export const usePushSubscriptionStatus = () => {
  const query = useQuery({
    queryKey: STATUS_QUERY_KEY,
    queryFn: async () => {
      if (!isPushSupported()) return { permission: "unsupported" as const, hasSubscription: false };
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      return { permission: Notification.permission, hasSubscription: !!sub };
    },
    staleTime: Infinity,
  });

  return {
    permission: query.data?.permission ?? (isPushSupported() ? Notification.permission : "unsupported"),
    hasSubscription: query.data?.hasSubscription ?? false,
    checked: query.isFetched,
  };
};

export const useSubscribeToPush = () => {
  const { user } = useCurrentUser();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!isPushSupported()) throw new Error("Este navegador no soporta notificaciones push.");
      if (!VAPID_PUBLIC_KEY) throw new Error("Falta configurar VITE_VAPID_PUBLIC_KEY.");
      if (!user) throw new Error("No autenticado.");

      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Permiso de notificaciones denegado.");

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const json = subscription.toJSON();
      // RPC (SECURITY DEFINER) en vez de upsert directo: si el mismo endpoint de navegador
      // ya estaba asociado a otro usuario (dispositivo compartido), reasigna la fila al
      // usuario actual en vez de chocar contra la RLS policy "owner" con un unique-violation.
      const { error } = await supabase.rpc("upsert_push_subscription", {
        p_endpoint: json.endpoint!,
        p_p256dh: json.keys!.p256dh,
        p_auth: json.keys!.auth,
        p_device_type: detectDeviceType(),
        p_user_agent: navigator.userAgent,
      });
      if (error) throw error;

      return subscription;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm_push_subscriptions"] });
      qc.invalidateQueries({ queryKey: STATUS_QUERY_KEY });
    },
  });
};

/** Apaga las notificaciones push en este dispositivo (unsubscribe del browser + borra la fila en la DB). */
export const useUnsubscribeFromPush = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!isPushSupported()) return;
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return;

      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      // RLS ("owner", user_id = auth.uid()) ya limita esto a la propia fila del usuario,
      // aunque el endpoint coincida con el de otro dispositivo/usuario no afecta nada ajeno.
      const { error } = await supabase.from("crm_push_subscriptions").delete().eq("endpoint", endpoint);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm_push_subscriptions"] });
      qc.invalidateQueries({ queryKey: STATUS_QUERY_KEY });
    },
  });
};
