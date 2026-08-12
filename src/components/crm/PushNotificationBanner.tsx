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

  const needsHomeScreenInstall = isIos() && !isStandalonePwa();

  // En Safari de iPhone/iPad sin instalar como app, Notification/PushManager ni siquiera
  // existen todavía (isPushSupported() da false) — por eso este caso se resuelve ANTES de
  // filtrar por soporte/permiso: no hay nada que chequear en el navegador hasta que se
  // agregue a la pantalla de inicio, pero igual hay que mostrar el tutorial para llegar ahí.
  if (dismissed) return null;
  if (!needsHomeScreenInstall && (!checked || !isPushSupported() || permission === "denied" || permission === "granted" || hasSubscription)) {
    return null;
  }

  const heading = (
    <p className="text-sm font-semibold text-teal-900 flex items-center gap-1.5 flex-wrap">
      Permitir Notificaciones en este Dispositivo
      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide bg-teal-700 text-white shrink-0">Beta</span>
    </p>
  );

  return (
    <div className="w-full flex items-start gap-3 px-5 py-3.5 rounded-2xl border border-teal-200 bg-teal-50">
      <div className="w-9 h-9 rounded-xl bg-teal-500/15 flex items-center justify-center shrink-0">
        <Bell size={16} className="text-teal-700" />
      </div>
      <div className="flex-1 min-w-0">
        {needsHomeScreenInstall ? (
          <>
            {heading}
            <p className="text-xs text-teal-700 mt-0.5">
              Safari no permite activar notificaciones directamente — agregá el CRM a tu pantalla de inicio primero:
            </p>
            <div className="mt-2.5 space-y-2">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-teal-700 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                <p className="text-xs text-teal-800 flex items-center gap-1 flex-wrap">
                  Tocá el ícono <Share size={12} className="inline shrink-0" /> "Compartir" en la barra de Safari
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-teal-700 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                <p className="text-xs text-teal-800">
                  Elegí <span className="font-semibold">"Agregar a Inicio"</span> en el menú
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-teal-700 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                <p className="text-xs text-teal-800">
                  Abrí el CRM desde el ícono nuevo en tu pantalla de inicio (no desde Safari) y ahí vas a poder activar las notificaciones
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            {heading}
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
