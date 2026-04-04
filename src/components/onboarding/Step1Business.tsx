import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SectionTitle, Field } from "./FormHelpers";

const Step1Business = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <SectionTitle 
        title="Cuéntanos sobre tu negocio" 
        subtitle="Esta información es la base para crear tu sitio web profesional y bilingüe." 
      />
      
      <div className="grid gap-4">
        <Field label="Nombre del negocio" required>
          <Input placeholder="Ej: El Sabor de México" className="h-11" />
        </Field>
        
        <Field label="Rubro / Industria" required>
          <select className="w-full h-11 border rounded-md px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all">
            <option value="">Selecciona un rubro</option>
            <option value="restaurant">Restaurante / Comida</option>
            <option value="beauty">Salón de belleza / Barbería</option>
            <option value="construction">Construcción / Remodelación</option>
            <option value="health">Clínica / Salud</option>
            <option value="service">Servicios profesionales</option>
            <option value="other">Otro</option>
          </select>
        </Field>
        
        <Field label="Ciudad y Estado" required>
          <Input placeholder="Ej: Miami, FL" className="h-11" />
        </Field>
        
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Años en operación">
            <Input type="number" placeholder="Ej: 5" className="h-11" />
          </Field>
        </div>

        <Field label="Descripción breve del negocio" required>
          <Textarea 
            placeholder="Ej: Somos un restaurante familiar en Miami con más de 10 años sirviendo la mejor comida mexicana auténtica de la zona..." 
            className="min-h-[120px] resize-none"
          />
        </Field>
        
        <Field label="Historia del negocio (Opcional)">
          <Textarea 
            placeholder="¿Cómo empezó tu negocio? Cuéntanos tu pasión." 
            className="min-h-[100px] resize-none"
          />
        </Field>
      </div>
    </div>
  );
};

export default Step1Business;
