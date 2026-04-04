import React from "react";
import { Camera, Users, Video, Upload, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SectionTitle, Field } from "./FormHelpers";

const Step6Content = () => {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <SectionTitle 
        title="Contenido visual" 
        subtitle="Las fotos y videos reales de tu negocio aumentan la confianza de tus clientes en un 200%." 
      />
      
      <div className="grid gap-10">
        <Field label="Fotos del negocio (Galería principal)" required>
          <div className="group relative border-2 border-dashed border-muted-foreground/20 rounded-2xl p-14 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer">
            <div className="mx-auto w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-6 transition-transform group-hover:scale-110">
              <Camera className="text-primary w-8 h-8" />
            </div>
            <p className="text-base font-bold text-foreground">Sube hasta 10 fotos reales de tu negocio</p>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
              Muestra tu local, tus herramientas de trabajo y tus mejores resultados.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <span className="text-[10px] bg-secondary px-3 py-1 rounded-full font-bold uppercase tracking-wider text-muted-foreground">JPG</span>
              <span className="text-[10px] bg-secondary px-3 py-1 rounded-full font-bold uppercase tracking-wider text-muted-foreground">PNG</span>
              <span className="text-[10px] bg-secondary px-3 py-1 rounded-full font-bold uppercase tracking-wider text-muted-foreground">MÁX. 10MB</span>
            </div>
          </div>
        </Field>

        <div className="grid md:grid-cols-2 gap-10">
          <Field label="Fotos del equipo (Opcional)">
            <div className="group border border-muted-foreground/10 rounded-2xl p-8 text-center hover:bg-secondary/30 transition-all cursor-pointer">
              <Users className="mx-auto mb-4 text-muted-foreground/60 group-hover:text-primary transition-colors" size={32} />
              <p className="text-sm font-bold text-foreground">Fotos del equipo</p>
              <p className="text-xs text-muted-foreground mt-1">Humaniza tu marca con fotos reales.</p>
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-background border rounded-lg text-xs font-bold text-primary hover:bg-primary/5 transition-colors">
                <Upload size={14} /> Seleccionar fotos
              </div>
            </div>
          </Field>
          
          <div className="space-y-6">
            <Field label="Video de presentación (YouTube / Vimeo)">
              <div className="relative">
                <Video className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                <Input 
                  placeholder="https://www.youtube.com/watch?v=..." 
                  className="h-11 pl-10 bg-background border-muted-foreground/10 focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </Field>
            
            <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 flex gap-3">
              <Info size={18} className="text-amber-500 shrink-0" />
              <p className="text-[11px] text-amber-800 leading-normal">
                Si no tienes fotos profesionales, ¡no te preocupes! Toma fotos claras con tu celular en un lugar bien iluminado. Nosotros las optimizaremos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step6Content;
