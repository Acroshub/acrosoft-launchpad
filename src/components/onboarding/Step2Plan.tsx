import { Badge } from "@/components/ui/badge";
import { Check, Info, Loader2 } from "lucide-react";
import { SectionTitle } from "./FormHelpers";
import { useServices } from "@/hooks/useCrmData";

interface Step2PlanProps {
  selected?: string;
  onSelect?: (id: string) => void;
  allowedServiceIds?: string[];
}

const Step2Plan = ({ selected = "", onSelect, allowedServiceIds }: Step2PlanProps) => {
  const { data: rawServices = [], isLoading } = useServices();

  const visibleServices = allowedServiceIds?.length
    ? rawServices.filter(svc => allowedServiceIds.includes(svc.id))
    : rawServices;

  // Mapeamos los servicios del CRM al formato que espera la tarjeta del Onboarding
  const plans = visibleServices.map((svc) => ({
    id: svc.id,
    name: svc.name,
    price: `$${svc.price}`,
    monthly: svc.recurring_price ? `$${svc.recurring_price}/${svc.recurring_interval}` : "",
    recurringLabel: svc.recurring_label ?? "",
    features: svc.benefits || [],
    delivery: svc.delivery_time || "Por definir",
    recommended: svc.is_recommended ?? false,
  }));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <SectionTitle
        title="¿Qué plan te interesa?"
        subtitle="Selecciona el plan que mejor se adapte a las necesidades de tu negocio."
      />

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
           <Loader2 className="animate-spin w-8 h-8 text-primary/50" />
           <p className="text-sm">Cargando planes disponibles...</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {plans.map((plan) => {
            const isSelected = selected === plan.id;
            return (
              <button
                key={plan.id}
                onClick={() => onSelect?.(plan.id)}
                className={`text-left border-2 rounded-2xl p-6 transition-all relative ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                    : plan.recommended
                    ? "border-border bg-card hover:border-primary/40"
                    : "border-border bg-card hover:border-border/80"
                }`}
              >
                {plan.recommended && (
                  <Badge className="absolute -top-3 left-6 px-3 py-0.5 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-widest shadow-sm">
                    Recomendado
                  </Badge>
                )}

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                  <div className="shrink-0">
                    <h3 className="font-semibold text-base text-foreground">{plan.name}</h3>
                    <div className="flex items-baseline gap-1.5 mt-2">
                      <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                      <span className="text-xs text-muted-foreground uppercase tracking-tight">setup</span>
                    </div>
                    {plan.monthly && (
                      <span className="text-sm text-muted-foreground">{plan.monthly}{plan.recurringLabel ? ` ${plan.recurringLabel}` : ""}</span>
                    )}
                    <p className="text-[11px] text-muted-foreground/60 mt-1">{plan.delivery}</p>
                  </div>

                  <ul className="grid gap-1.5 sm:max-w-xs">
                    {plan.features.map((f: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Check size={13} className="text-primary shrink-0 mt-0.5" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="bg-secondary/40 border rounded-xl p-4 flex gap-3">
        <Info size={16} className="text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">Política de pagos:</span>{" "}
          50% inicial para comenzar · 50% al entregar el proyecto final.
        </p>
      </div>
    </div>
  );
};

export default Step2Plan;
