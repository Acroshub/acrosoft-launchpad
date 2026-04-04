import React from "react";
import { Upload, Palette, Type, Link as LinkIcon, Camera } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionTitle, Field } from "./FormHelpers";

const Step3Identity = () => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <SectionTitle 
        title="Tu marca e identidad visual" 
        subtitle="Queremos que tu sitio web transmita la personalidad de tu negocio." 
      />
      
      <div className="grid gap-6">
        {/* Logo Upload Mockup */}
        <Field label="Logo del negocio" required>
          <div className="group relative border-2 border-dashed border-muted-foreground/20 rounded-2xl p-10 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer">
            <div className="mx-auto w-12 h-12 bg-secondary rounded-full flex items-center justify-center mb-4 transition-transform group-hover:-translate-y-1">
              <Upload className="text-primary w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-foreground">Arrastra tu logo aquí o busca en tu carpeta</p>
            <p className="text-xs text-muted-foreground mt-2">Formatos aceptados: PNG, SVG o JPG (Fondo transparente recomendado)</p>
          </div>
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-border/50">
          <Field label="Color Primario">
            <div className="flex gap-2">
              <Input type="color" defaultValue="#2563EB" className="h-11 w-14 p-1 cursor-pointer" />
              <Input placeholder="#2563EB" className="h-11 font-mono text-xs uppercase" />
            </div>
          </Field>
          <Field label="Color Secundario">
            <div className="flex gap-2">
              <Input type="color" defaultValue="#1E40AF" className="h-11 w-14 p-1 cursor-pointer" />
              <Input placeholder="#1E40AF" className="h-11 font-mono text-xs uppercase" />
            </div>
          </Field>
          <Field label="Color de Acento">
            <div className="flex gap-2">
              <Input type="color" defaultValue="#F59E0B" className="h-11 w-14 p-1 cursor-pointer" />
              <Input placeholder="#F59E0B" className="h-11 font-mono text-xs uppercase" />
            </div>
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-border/50">
          <Field label="Tipografía preferida">
            <div className="relative">
              <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select className="w-full h-11 border rounded-md pl-10 pr-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all">
                <option value="">Selecciona un estilo de fuente</option>
                <option value="modern">Moderna e Innovadora (Inter, Roboto)</option>
                <option value="classic">Clásica y Formal (Playfair, Lora)</option>
                <option value="friendly">Cálida y Amigable (Outfit, Lexend)</option>
                <option value="elegant">Elegante y Sofisticada (Montserrat, Lato)</option>
              </select>
            </div>
          </Field>
          
          <Field label="Estilo visual">
            <div className="relative">
              <Palette className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select className="w-full h-11 border rounded-md pl-10 pr-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all">
                <option value="">Selecciona un estilo visual</option>
                <option value="minimalist">Minimalista y Limpio</option>
                <option value="professional">Profesional y Corporativo</option>
                <option value="creative">Creativo y Atrevido</option>
                <option value="warm">Cálido y Familiar</option>
              </select>
            </div>
          </Field>
        </div>

        <div className="space-y-4">
          <Label className="text-sm font-bold flex items-center gap-2">
            <LinkIcon size={14} className="text-primary" /> Sitios de referencia que te inspiren
          </Label>
          <div className="grid gap-3">
            {[1, 2, 3].map((n) => (
              <Input key={n} placeholder={`Sitio de referencia ${n} (https://...)`} className="h-11" />
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Comparte enlaces a otros sitios web (competencia o de otras industrias) que te gusten por sus colores, disposición o estilo.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Step3Identity;
