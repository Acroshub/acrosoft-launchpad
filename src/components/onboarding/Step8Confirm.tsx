import React from "react";
import { CheckCircle2, ChevronDown, Edit3, ClipboardCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionTitle } from "./FormHelpers";

interface Step8ConfirmProps {
  onSubmit?: () => void;
}

const Step8Confirm = ({ onSubmit }: Step8ConfirmProps) => {
  const sections = [
    { title: "Negocio", items: ["Nombre: El Sabor de México", "Rubro: Restaurante", "Ubicación: Miami, FL"] },
    { title: "Plan Seleccionado", items: ["Multi Page Website", "Pago único (50/50)", "Inicio: 2024-04-15"] },
    { title: "Identidad Visual", items: ["Colores: Azul, Blanco, Dorado", "Estilo: Moderno y Cálido", "Logo: Cargado"] },
    { title: "Servicios", items: ["Menú Digital", "Reserva de Mesas", "Pedidos Online"] },
    { title: "Contacto", items: ["+1 (305) 555-0123", "hola@sabor.com", "sabordemexico.com"] },
  ];

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

      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <CheckCircle2 size={24} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Al hacer clic en el botón, nuestro equipo recibirá tu brief.</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Iniciaremos el proceso de diseño y copywriting profesional. Recibirás un correo electrónico de confirmación en los próximos minutos.
            </p>
          </div>
        </div>
      </div>

      <Button 
        onClick={onSubmit} 
        size="lg" 
        className="w-full h-16 rounded-2xl text-lg font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all group"
      >
        Confirmar y Enviar Brief
        <ArrowRight size={20} className="ml-2 transition-transform group-hover:translate-x-1" />
      </Button>
      
      <p className="text-center text-[11px] text-muted-foreground">
        Al enviar, aceptas nuestros Términos de Servicio y Política de Privacidad.
      </p>
    </div>
  );
};

export default Step8Confirm;
