import { useState, useEffect, useRef } from "react";
import { Bell, X, Share, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  usePushSubscriptionStatus, useSubscribeToPush, isIos, isStandalonePwa, isPushSupported,
} from "@/hooks/usePushNotifications";
import { useCurrentUser } from "@/hooks/useAuth";

const DISMISS_KEY_PREFIX = "acros_push_banner_dismissed_";

const PushNotificationBanner = () => {
  const { user } = useCurrentUser();
  const { permission, hasSubscription, checked } = usePushSubscriptionStatus();
  const subscribe = useSubscribeToPush();
  const dismissKey = user ? `${DISMISS_KEY_PREFIX}${user.id}` : null;
  const [dismissed, setDismissed] = useState(false);
  const autoSubscribeAttempted = useRef(false);

  useEffect(() => {
    setDismissed(dismissKey ? localStorage.getItem(dismissKey) === "1" : false);
  }, [dismissKey]);

  const handleDismiss = () => {
    if (dismissKey) localStorage.setItem(dismissKey, "1");
    setDismissed(true);
  };

  const handleActivate = () => {
    subscribe.mutate(undefined, {
      onError: (err) => toast.error(err instanceof Error ? err.message : "No se pudo activar las notificaciones"),
      onSuccess: () => toast.success("¡Notificaciones activadas!"),
    });
  };

  // El permiso puede haber sido concedido antes (mismo origen, otra app/sesión) sin que
  // exista todavía una suscripción guardada para este CRM — completarla en silencio,
  // sin mostrar banner, ya que el navegador ya autorizó y no hay nada que pedirle al usuario.
  useEffect(() => {
    if (checked && permission === "granted" && !hasSubscription && !autoSubscribeAttempted.current) {
      autoSubscribeAttempted.current = true;
      subscribe.mutate();
    }
  }, [checked, permission, hasSubscription]);

  if (!checked || dismissed || !isPushSupported()) return null;
  if (permission === "denied" || permission === "granted" || hasSubscription) return null;

  const needsHomeScreenInstall = isIos() && !isStandalonePwa();

  return (
    <div className="w-full flex items-start gap-3 px-5 py-3.5 rounded-2xl border border-teal-200 bg-teal-50">
      <div className="w-9 h-9 rounded-xl bg-teal-500/15 flex items-center justify-center shrink-0">
        <Bell size={16} className="text-teal-700" />
      </div>
      <div className="flex-1 min-w-0">
        {needsHomeScreenInstall ? (
          <>
            <p className="text-sm font-semibold text-teal-900 flex items-center gap-1.5 flex-wrap">
              Permitir Notificaciones en este Dispositivo
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide bg-teal-700 text-white shrink-0">Beta</span>
            </p>
            <p className="text-xs text-teal-700 mt-0.5 flex items-center gap-1 flex-wrap">
              Tocá <Share size={12} className="inline shrink-0" /> "Compartir" y luego "Agregar a Inicio" — después abrí el CRM desde ese ícono para activar las notificaciones.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-teal-900 flex items-center gap-1.5 flex-wrap">
              Permitir Notificaciones en este Dispositivo
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide bg-teal-700 text-white shrink-0">Beta</span>
            </p>
            <p className="text-xs text-teal-700 mt-0.5">Cada dispositivo pide permiso por separado — si usás el CRM en el celular y en la compu, activalo en cada uno.</p>
            <button
              onClick={handleActivate}
              disabled={subscribe.isPending}
              className="mt-2 h-8 px-3.5 rounded-lg text-xs font-semibold bg-teal-700 text-white hover:bg-teal-800 transition-colors inline-flex items-center gap-1.5 disabled:opacity-60"
            >
              {subscribe.isPending && <Loader2 size={12} className="animate-spin" />}
              Permitir Notificaciones
            </button>
          </>
        )}
      </div>
      <button
        onClick={handleDismiss}
        title="Cerrar"
        className="w-7 h-7 rounded-lg flex items-center justify-center text-teal-600 hover:bg-teal-100 transition-colors shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
};

export default PushNotificationBanner;
