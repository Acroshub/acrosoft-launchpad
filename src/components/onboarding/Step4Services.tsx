import React, { useState } from "react";
import { Plus, Trash2, Star, Briefcase, FileText, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionTitle, Field } from "./FormHelpers";

interface Service {
  name: string;
  description: string;
  price: string;
  featured: boolean;
}

const Step4Services = () => {
  const [services, setServices] = useState<Service[]>([
    { name: "", description: "", price: "", featured: false }
  ]);

  const addService = () => {
    if (services.length < 6) {
      setServices([...services, { name: "", description: "", price: "", featured: false }]);
    }
  };

  const removeService = (index: number) => {
    if (services.length > 1) {
      setServices(services.filter((_, i) => i !== index));
    }
  };

  const updateService = (index: number, field: keyof Service, value: any) => {
    const updated = [...services];
    updated[index] = { ...updated[index], [field]: value };
    setServices(updated);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <SectionTitle 
        title="¿Qué servicios ofreces?" 
        subtitle="Agrega hasta 6 servicios. Al menos uno es requerido para crear tu página." 
      />
      
      <div className="grid gap-6">
        {services.map((service, index) => (
          <div key={index} className="group relative bg-card border border-border/60 hover:border-primary/40 rounded-2xl p-6 transition-all shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider h-6 bg-secondary/50">
                  Servicio {index + 1}
                </Badge>
                {index === 0 && (
                  <Badge className="text-[10px] font-bold uppercase tracking-wider h-6 bg-primary text-white">Requerido</Badge>
                )}
              </div>
              
              {services.length > 1 && (
                <button 
                  onClick={() => removeService(index)}
                  className="p-2 text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                  aria-label="Eliminar servicio"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            <div className="grid gap-5">
              <Field label="Nombre del servicio" required>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <Input 
                    placeholder="Ej: Corte de Cabello, Limpieza Dental, Asesoría Legal" 
                    className="h-11 pl-10 bg-background/50 border-muted-foreground/10 focus:bg-background transition-colors"
                    value={service.name}
                    onChange={(e) => updateService(index, "name", e.target.value)}
                  />
                </div>
              </Field>

              <Field label="Descripción detallada">
                <div className="relative">
                  <FileText className="absolute left-3 top-4 w-4 h-4 text-muted-foreground/60" />
                  <Textarea 
                    placeholder="Describe qué incluye el servicio y sus beneficios principales..." 
                    className="min-h-[100px] pl-10 bg-background/50 border-muted-foreground/10 focus:bg-background transition-colors resize-none"
                    value={service.description}
                    onChange={(e) => updateService(index, "description", e.target.value)}
                  />
                </div>
              </Field>

              <div className="grid sm:grid-cols-2 gap-5">
                <Field label="Precio / Desde">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground/60">$</span>
                    <Input 
                      placeholder="Ej: 50.00 o Consultar" 
                      className="h-11 pl-7 bg-background/50 border-muted-foreground/10 focus:bg-background transition-colors"
                      value={service.price}
                      onChange={(e) => updateService(index, "price", e.target.value)}
                    />
                  </div>
                </Field>

                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2.5 cursor-pointer group/star w-full">
                    <div className={`p-2 rounded-lg transition-colors ${service.featured ? "bg-amber-100/50" : "bg-secondary"}`}>
                      <Star size={18} className={`transition-colors ${service.featured ? "text-amber-500 fill-amber-500" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-foreground group-hover/star:text-primary transition-colors">Servicio Estrella</span>
                      <span className="text-[10px] text-muted-foreground font-medium">Se destacará visualmente en tu web</span>
                    </div>
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={service.featured} 
                      onChange={(e) => updateService(index, "featured", e.target.checked)} 
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        ))}

        {services.length < 6 && (
          <Button 
            variant="outline" 
            onClick={addService} 
            className="w-full h-14 border-2 border-dashed border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 rounded-2xl transition-all font-bold group"
          >
            <Plus size={18} className="mr-2 text-primary transition-transform group-hover:scale-125 group-hover:rotate-90" />
            Empieza a agregar otro servicio
          </Button>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground text-center italic bg-secondary/30 py-2 rounded-lg">
        Recomendamos agregar al menos 3 servicios para que tu sitio web se vea completo y profesional.
      </p>
    </div>
  );
};

export default Step4Services;
