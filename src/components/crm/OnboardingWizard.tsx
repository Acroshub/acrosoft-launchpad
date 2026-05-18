import { useState } from "react";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, ArrowRight, X } from "lucide-react";
import { useOnboardingStatus, useUpsertBusinessProfile } from "@/hooks/useCrmData";

type View = "overview" | "business" | "calendar" | "forms" | "contacts" | "pipeline"
  | "ventas" | "reminders" | "settings" | "soporte" | "videos" | "vendor_links"
  | "vendors" | "agente_ia";

interface Props {
  onNavigate: (view: View, tab?: string) => void;
}

export default function OnboardingWizard({ onNavigate }: Props) {
  const { step1, step2, step3, step4, allDone, requiredDone, completed, flags, profile } = useOnboardingStatus();
  const upsert = useUpsertBusinessProfile();
  const [collapsed, setCollapsed] = useState(false);

  if (allDone) return null;

  const skipStep = async (flag: "logo_skipped" | "catalog_skipped") => {
    if (!profile) return;
    await upsert.mutateAsync({ onboarding_flags: { ...flags, [flag]: true } } as any);
  };

  const steps = [
    {
      id: 1,
      label: "Datos personales",
      description: "Nombre, email y teléfono de contacto",
      done: step1,
      required: true,
      actions: [{ label: "Completar", tab: "personal" }],
    },
    {
      id: 2,
      label: "Datos del negocio",
      description: "Nombre del negocio y descripción",
      done: step2,
      required: true,
      actions: [{ label: "Completar", tab: "negocio" }],
    },
    {
      id: 3,
      label: "Logo y colores",
      description: "Identidad visual de tu negocio",
      done: step3,
      required: false,
      actions: [{ label: "Agregar logo", tab: "logo" }],
      onSkip: flags.logo_skipped ? undefined : () => skipStep("logo_skipped"),
    },
    {
      id: 4,
      label: "Servicios o Productos",
      description: "Agrega lo que ofreces a tus clientes",
      done: step4,
      required: false,
      actions: [
        { label: "Añadir Servicio", tab: "servicios" },
        { label: "Añadir Producto", tab: "productos" },
      ],
      onSkip: flags.catalog_skipped ? undefined : () => skipStep("catalog_skipped"),
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
            {completed} de 4 pasos completados
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
            style={{ width: `${(completed / 4) * 100}%` }}
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
                  {step.onSkip && (
                    <button
                      onClick={step.onSkip}
                      className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
                    >
                      <X size={11} /> Omitir
                    </button>
                  )}
                  {step.actions.map(action => (
                    <button
                      key={action.tab}
                      onClick={() => onNavigate("business", action.tab)}
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
