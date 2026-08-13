import { useState, useEffect, useRef } from "react";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, ArrowRight, Loader2, Share } from "lucide-react";
import { toast } from "sonner";
import { useOnboardingStatus } from "@/hooks/useCrmData";
import { usePushSubscriptionStatus, useSubscribeToPush, isIos, isStandalonePwa } from "@/hooks/usePushNotifications";
import type { View } from "@/pages/Crm";

interface Props {
  onNavigate: (view: View) => void;
}

type StepAction = { label: string; view?: View; onClick?: () => void; pending?: boolean; prominent?: boolean };
type Step = {
  id: number;
  label: string;
  description: string;
  done: boolean;
  required: boolean;
  actions: StepAction[];
  extraContent?: React.ReactNode;
};

const TOTAL_STEPS = 3;

export default function OnboardingWizard({ onNavigate }: Props) {
  const { step1, step2, completed: profileCompleted } = useOnboardingStatus();
  const { permission, hasSubscription, checked } = usePushSubscriptionStatus();
  const subscribe = useSubscribeToPush();
  const [collapsed, setCollapsed] = useState(false);
  const autoSubscribeAttempted = useRef(false);

  // El permiso puede haber sido concedido antes (mismo origen, otra app/sesión) sin que
  // exista todavía una suscripción guardada para este CRM — completarla en silencio.
  useEffect(() => {
    if (checked && permission === "granted" && !hasSubscription && !autoSubscribeAttempted.current) {
      autoSubscribeAttempted.current = true;
      subscribe.mutate();
    }
  }, [checked, permission, hasSubscription]);

  const step3 = hasSubscription;
  const allDone = step1 && step2 && step3;
  const requiredDone = step1 && step3;
  const completed = profileCompleted + (step3 ? 1 : 0);

  if (allDone) return null;

  const needsHomeScreenInstall = isIos() && !isStandalonePwa();

  const handleActivateNotifications = () => {
    subscribe.mutate(undefined, {
      onError: (err) => toast.error(err instanceof Error ? err.message : "No se pudo activar las notificaciones"),
      onSuccess: () => toast.success("¡Notificaciones activadas!"),
    });
  };

  const notificationsTutorial = (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Safari no permite activar notificaciones directamente — agregá el CRM a tu pantalla de inicio primero:
      </p>
      <div className="space-y-1.5">
        <div className="flex items-start gap-2.5">
          <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
          <p className="text-xs text-foreground flex items-center gap-1 flex-wrap">
            Tocá el ícono <Share size={12} className="inline shrink-0" /> "Compartir" en la barra de Safari
          </p>
        </div>
        <div className="flex items-start gap-2.5">
          <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
          <p className="text-xs text-foreground">
            Elegí <span className="font-semibold">"Agregar a Inicio"</span> en el menú
          </p>
        </div>
        <div className="flex items-start gap-2.5">
          <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
          <p className="text-xs text-foreground">
            Abrí el CRM desde el ícono nuevo en tu pantalla de inicio (no desde Safari) y ahí vas a poder activar las notificaciones
          </p>
        </div>
      </div>
    </div>
  );

  const steps: Step[] = [
    {
      id: 1,
      label: "Datos personales",
      description: "Nombre, email y teléfono de contacto",
      done: step1,
      required: true,
      actions: [{ label: "Completar", view: "mi_cuenta" }],
    },
    {
      id: 2,
      label: "Datos del negocio",
      description: "Nombre del negocio y descripción",
      done: step2,
      required: false,
      actions: [{ label: "Completar", view: "business" }],
    },
    {
      id: 3,
      label: "Activar notificaciones",
      description: "Recibe notificaciones importantes incluso con el sistema cerrado",
      done: step3,
      required: true,
      actions: needsHomeScreenInstall
        ? []
        : [{ label: "Activar", onClick: handleActivateNotifications, pending: !checked || subscribe.isPending, prominent: true }],
      extraContent: needsHomeScreenInstall ? notificationsTutorial : undefined,
    },
  ];

  const canCollapse = requiredDone;

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all ${
      !requiredDone ? "border-primary/30 bg-primary/5" : "border-border bg-card"
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <p className="text-sm font-semibold">
            {!requiredDone ? "⚡ Configura tu negocio" : "Configuración inicial"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {completed} de {TOTAL_STEPS} pasos completados
          </p>
        </div>
        {canCollapse && (
          <button
            onClick={() => setCollapsed(v => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {collapsed ? <><ChevronDown size={14} /> Mostrar</> : <><ChevronUp size={14} /> Ocultar</>}
          </button>
        )}
      </div>

      {/* Barra de progreso */}
      <div className="px-5 pb-3">
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${(completed / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      {!collapsed && (
        <div className="divide-y border-t">
          {steps.map(step => (
            <div key={step.id} className={step.done ? "opacity-60" : ""}>
              <div className="flex items-center gap-3 px-5 py-3">
                {/* Icono */}
                <div className="shrink-0">
                  {step.done
                    ? <CheckCircle2 size={18} className="text-emerald-500" />
                    : <Circle size={18} className={step.required ? "text-primary" : "text-muted-foreground"} />
                  }
                </div>

                {/* Texto */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">
                    {step.label}
                    {step.required && !step.done && (
                      <span className="ml-1.5 text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">Requerido</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>

                {/* Acciones */}
                {!step.done && step.actions.length > 0 && (
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {step.actions.map(action => (
                      <button
                        key={action.label}
                        onClick={() => (action.onClick ? action.onClick() : action.view && onNavigate(action.view))}
                        disabled={action.pending}
                        className={action.prominent
                          ? "flex items-center gap-1.5 h-8 px-4 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none shrink-0"
                          : "flex items-center gap-1 text-xs font-medium text-primary hover:underline whitespace-nowrap disabled:opacity-50 disabled:pointer-events-none"
                        }
                      >
                        {action.pending && <Loader2 size={12} className="animate-spin" />}
                        {action.label} {!action.prominent && <ArrowRight size={12} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {!step.done && step.extraContent && (
                <div className="px-5 pb-4 pl-[46px]">{step.extraContent}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
