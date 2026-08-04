import { useState } from "react";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { useOnboardingStatus } from "@/hooks/useCrmData";
import type { View } from "@/pages/Crm";

interface Props {
  onNavigate: (view: View) => void;
}

const TOTAL_STEPS = 2;

export default function OnboardingWizard({ onNavigate }: Props) {
  const { step1, step2, allDone, requiredDone, completed } = useOnboardingStatus();
  const [collapsed, setCollapsed] = useState(false);

  if (allDone) return null;

  const steps = [
    {
      id: 1,
      label: "Datos personales",
      description: "Nombre, email y teléfono de contacto",
      done: step1,
      required: true,
      actions: [{ label: "Completar", view: "mi_cuenta" as const }],
    },
    {
      id: 2,
      label: "Datos del negocio",
      description: "Nombre del negocio y descripción",
      done: step2,
      required: false,
      actions: [{ label: "Completar", view: "business" as const }],
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
            <div key={step.id} className={`flex items-center gap-3 px-5 py-3 ${step.done ? "opacity-60" : ""}`}>
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
              {!step.done && (
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  {step.actions.map(action => (
                    <button
                      key={action.view}
                      onClick={() => onNavigate(action.view)}
                      className="flex items-center gap-1 text-xs font-medium text-primary hover:underline whitespace-nowrap"
                    >
                      {action.label} <ArrowRight size={12} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
