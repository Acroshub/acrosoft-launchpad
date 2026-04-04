import React from "react";
import { Badge } from "@/components/ui/badge";
import { Check, Info } from "lucide-react";
import { SectionTitle, Field } from "./FormHelpers";
import { Input } from "@/components/ui/input";

const plans = [
  {
    id: "single_page",
    name: "Single Page Website",
    price: "$500",
    setup: "Setup una sola vez",
    monthly: "$50/mes",
    features: ["1 página bilingüe", "3 rondas de revisiones", "3–5 días hábiles"],
    color: "border-blue-200 hover:border-blue-500",
    selectedColor: "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20",
  },
  {
    id: "multi_page",
    name: "Multi Page Website",
    price: "$1,500",
    setup: "Setup una sola vez",
    monthly: "$100/mes",
    popular: true,
    features: ["Hasta 6 páginas", "Galería dinámica", "SEO local avanzado", "5 rondas de revisiones", "10–14 días hábiles"],
    color: "border-purple-200 hover:border-purple-500",
    selectedColor: "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20",
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
        title="¿Qué plan elegiste?" 
        subtitle="Selecciona el plan que se adapte mejor a las necesidades de tu negocio." 
      />
      
      <div className="grid gap-4">
        {plans.map((plan) => (
          <button
            key={plan.id}
            onClick={() => onSelect?.(plan.id)}
            className={`text-left border-2 rounded-2xl p-6 transition-all relative ${
              selected === plan.id ? plan.selectedColor : plan.color + " bg-card"
            }`}
          >
            {plan.popular && (
              <Badge className="absolute -top-3 left-6 px-3 py-0.5 bg-primary text-white text-[10px] font-bold uppercase tracking-widest">
                Más popular
              </Badge>
            )}
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg text-foreground">{plan.name}</h3>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-2xl font-black text-primary">{plan.price}</span>
                  <span className="text-xs text-muted-foreground uppercase font-bold tracking-tight">{plan.setup}</span>
                  <span className="mx-1 text-muted-foreground/30">|</span>
                  <span className="text-sm font-semibold text-muted-foreground">{plan.monthly} manteni.</span>
                </div>
              </div>
              
              <ul className="grid gap-1.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Check size={14} className="text-primary shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          </button>
        ))}
      </div>

      <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex gap-3 mt-6">
        <Info size={20} className="text-blue-500 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed text-blue-800">
          <p className="font-bold">Política de pagos:</p>
          <p>50% inicial para comenzar y 50% al entregar el proyecto final.</p>
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t">
        <Field label="Forma de pago preferida">
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <input 
                type="radio" 
                name="payment" 
                defaultChecked 
                className="w-4 h-4 text-primary border-gray-300 focus:ring-primary focus:ring-offset-0" 
              />
              <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Pago único (50/50)</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <input 
                type="radio" 
                name="payment" 
                className="w-4 h-4 text-primary border-gray-300 focus:ring-primary focus:ring-offset-0" 
              />
              <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">3 cuotas (50% / 25% / 25%)</span>
            </label>
          </div>
        </Field>
        
        <Field label="Fecha estimada de inicio">
          <Input type="date" className="h-11 w-full sm:w-auto" />
        </Field>
      </div>
    </div>
  );
};

export default Step2Plan;
