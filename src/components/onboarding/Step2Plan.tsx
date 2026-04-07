import { Badge } from "@/components/ui/badge";
import { Check, Info } from "lucide-react";
import { SectionTitle } from "./FormHelpers";

const plans = [
  {
    id: "single_page",
    name: "Single Page Website",
    price: "$500",
    monthly: "$49/mes",
    features: [
      "1 página profesional bilingüe (ES / EN)",
      "Diseño moderno enfocado en conversión",
      "Textos optimizados con IA",
      "Formulario de contacto integrado",
      "Botones directos (WhatsApp / llamada)",
      "100% adaptable a celular",
      "Publicación online incluida",
    ],
    delivery: "3–5 días hábiles",
    recommended: false,
  },
  {
    id: "multi_page",
    name: "Multi Page Website",
    price: "$1,500",
    monthly: "$99/mes",
    features: [
      "Todo lo incluido en Single Page",
      "Hasta 6 páginas completas",
      "SEO local (para aparecer en Google)",
      "Galería dinámica de imágenes",
      "Integración de analytics y píxeles",
      "Navegación clara y optimizada",
      "Diseño escalable para crecer",
    ],
    delivery: "10–14 días hábiles",
    recommended: false,
  },
  {
    id: "custom_booking",
    name: "Custom Booking System",
    price: "$5,000",
    monthly: "$250/mes",
    features: [
      "Todo lo incluido en Multi Page",
      "Sistema de reservas online 24/7",
      "Calendario para agendar citas",
      "Panel de administración (dashboard)",
      "Base de datos de clientes organizada",
      "Recordatorios automáticos por email",
      "Soporte prioritario por WhatsApp",
    ],
    delivery: "21–30 días hábiles",
    recommended: true,
  },
];

interface Step2PlanProps {
  selected?: string;
  onSelect?: (id: string) => void;
}

const Step2Plan = ({ selected = "single_page", onSelect }: Step2PlanProps) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <SectionTitle
        title="¿Qué plan te interesa?"
        subtitle="Selecciona el plan que mejor se adapte a las necesidades de tu negocio."
      />

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
                  <span className="text-sm text-muted-foreground">{plan.monthly} mantenimiento</span>
                  <p className="text-[11px] text-muted-foreground/60 mt-1">Entrega: {plan.delivery}</p>
                </div>

                <ul className="grid gap-1.5 sm:max-w-xs">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check size={13} className="text-primary shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            </button>
          );
        })}
      </div>

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
