import React from "react";
import { CheckCircle2, ChevronDown, Edit3, ClipboardCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionTitle } from "./FormHelpers";

import { useOnboarding } from "./OnboardingContext";

interface Step8ConfirmProps {
  onSubmit?: (submissionId: string) => void;
  confirmationMessage?: string;
}

const Step8Confirm = ({ onSubmit, confirmationMessage }: Step8ConfirmProps) => {
  const { data } = useOnboarding();
  
  const sections = [
    { title: "Negocio", items: [`Nombre: ${data.businessName || "N/A"}`, `Rubro: ${data.industry || "N/A"}`, `Ciudad: ${data.city || "N/A"}`] },
    { title: "Plan Seleccionado", items: [data.plan ? `Plan ID: ${data.plan}` : "Ninguno", "Pago 50/50"] },
    { title: "Identidad Visual", items: [`Color 1: ${data.primaryColor}`, `Fuente: ${data.typography || "No elegida"}`, `Estilo: ${data.visualStyle || "N/A"}`] },
    { title: "Servicios", items: data.services.map(s => s.name).filter(Boolean).length > 0 ? data.services.map(s => s.name).filter(Boolean) : ["No declarados"] },
    { title: "Contacto", items: [data.phone || "Sin teléfono", data.email || "Sin email", data.domain || "Sin dominio"] },
  ];

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const dbUrl = import.meta.env.VITE_SUPABASE_URL;
      const functionUrl = `${dbUrl}/functions/v1/crm-form-public`;
      const res = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        // Usamos el ID del formulario "Onboarding Oficial v3"
        // Este form fue creado en CrmForms previamente
        body: JSON.stringify({
          form_id: "b733e0c5-60d4-414d-896a-5ce459b07eaf", 
          data: data 
        }),
      });

      if (!res.ok) throw new Error("Fallo al enviar");
      const result = await res.json();
      if (onSubmit) onSubmit(result.submission_id);
    } catch (e) {
      console.error(e);
      alert("Hubo un problema enviando tu solicitud. Por favor intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <SectionTitle 
        title="¡Todo listo! Revisa tu información" 
        subtitle="Confirma que todos los datos sean correctos antes de enviarlos a nuestro equipo." 
      />
      
      <div className="grid gap-4">
        {sections.map((section, idx) => (
          <div key={idx} className="bg-secondary/20 rounded-2xl border border-secondary/50 overflow-hidden group">
            <div className="flex items-center justify-between px-6 py-4 bg-secondary/10 group-hover:bg-secondary/20 transition-colors">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <ClipboardCheck size={16} className="text-primary" /> {section.title}
              </h3>
              <button className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Edit3 size={12} /> Editar
              </button>
            </div>
            <div className="p-6">
              <div className="flex flex-wrap gap-2">
                {section.items.map((item, i) => (
                  <Badge 
                    key={i} 
                    variant="secondary" 
                    className="bg-background border-border/50 text-xs font-medium px-3 py-1 text-muted-foreground"
                  >
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {confirmationMessage && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <CheckCircle2 size={24} className="text-primary" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">{confirmationMessage}</p>
          </div>
        </div>
      )}

      <Button 
        onClick={handleSubmit} 
        disabled={isSubmitting}
        size="lg" 
        className="w-full h-16 rounded-2xl text-lg font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all group"
      >
        {isSubmitting ? "Enviando..." : "Confirmar y Enviar Brief"}
        {!isSubmitting && <ArrowRight size={20} className="ml-2 transition-transform group-hover:translate-x-1" />}
      </Button>
      
      <p className="text-center text-[11px] text-muted-foreground">
        Al enviar, aceptas nuestros Términos de Servicio y Política de Privacidad.
      </p>
    </div>
  );
};

export default Step8Confirm;
