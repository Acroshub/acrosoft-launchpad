import React from "react";
import { Phone, Mail, MapPin, Calendar, Globe, Instagram, Facebook, Link as LinkIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SectionTitle, Field } from "./FormHelpers";

const Step7Contact = () => {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <SectionTitle 
        title="¿Cómo te contactan tus clientes?" 
        subtitle="Esta información aparecerá en tu página web y facilitará que tus clientes te encuentren." 
      />
      
      <div className="grid gap-10">
        <div className="grid sm:grid-cols-2 gap-8">
          <Field label="Teléfono / WhatsApp" required>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
              <Input placeholder="+1 (000) 000-0000" className="h-11 pl-10 bg-background border-muted-foreground/10 focus:ring-2 focus:ring-primary/20" />
            </div>
          </Field>
          
          <Field label="Email de contacto" required>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
              <Input type="email" placeholder="hola@tunegocio.com" className="h-11 pl-10 bg-background border-muted-foreground/10 focus:ring-2 focus:ring-primary/20" />
            </div>
          </Field>
          
          <Field label="Dirección física">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
              <Input placeholder="Ej: 123 Miami St, FL 33101" className="h-11 pl-10 bg-background border-muted-foreground/10 focus:ring-2 focus:ring-primary/20" />
            </div>
          </Field>
          
          <Field label="Horario de atención">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
              <Input placeholder="Ej: Lun-Vie 9:00 AM - 6:00 PM" className="h-11 pl-10 bg-background border-muted-foreground/10 focus:ring-2 focus:ring-primary/20" />
            </div>
          </Field>
        </div>

        <div className="pt-8 border-t border-border/50">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
            <Globe size={18} className="text-primary" /> Redes sociales y dominio
          </h3>
          <div className="grid sm:grid-cols-3 gap-8">
            <Field label="Instagram">
              <div className="relative">
                <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                <Input placeholder="@tu_usuario" className="h-11 pl-10 bg-background border-muted-foreground/10 focus:ring-2 focus:ring-primary/20" />
              </div>
            </Field>
            <Field label="Facebook">
              <div className="relative">
                <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                <Input placeholder="facebook.com/tu_pagina" className="h-11 pl-10 bg-background border-muted-foreground/10 focus:ring-2 focus:ring-primary/20" />
              </div>
            </Field>
            <Field label="TikTok">
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                <Input placeholder="@tu_usuario" className="h-11 pl-10 bg-background border-muted-foreground/10 focus:ring-2 focus:ring-primary/20" />
              </div>
            </Field>
          </div>
        </div>

        <div className="pt-8 border-t border-border/50 pb-6">
          <Field label="Nombre del dominio (URL)">
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
              <Input placeholder="Ej: www.tunegocio.com" className="h-12 pl-10 bg-primary/5 border-primary/20 focus:ring-2 focus:ring-primary/20 font-bold" />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 px-2 italic">
              Si ya lo tienes, dinos cuál es. Si no, dinos cuál te gustaría y nosotros lo compramos por ti.
            </p>
          </Field>
        </div>
      </div>
    </div>
  );
};

export default Step7Contact;
