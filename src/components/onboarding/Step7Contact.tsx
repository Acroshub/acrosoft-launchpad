import { useState } from "react";
import { Phone, Mail, MapPin, Globe, Link as LinkIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SectionTitle, Field } from "./FormHelpers";
import WeeklySchedulePicker, { WeeklySchedule, DEFAULT_WEEKLY_SCHEDULE } from "@/components/shared/WeeklySchedulePicker";
import { useOnboarding } from "./OnboardingContext";

const Step7Contact = () => {
  const { data, updateData } = useOnboarding();
  const [schedule, setSchedule] = useState<WeeklySchedule>(DEFAULT_WEEKLY_SCHEDULE);
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <SectionTitle
        title="¿Cómo te contactan tus clientes?"
        subtitle="Esta información aparecerá en tu página web y facilitará que tus clientes te encuentren."
      />

      <div className="grid gap-8">
        {/* Fila 1: Teléfono + Email */}
        <div className="grid sm:grid-cols-2 gap-6">
          <Field label="Teléfono / WhatsApp" required>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
              <Input value={data.phone} onChange={(e) => updateData({ phone: e.target.value })} placeholder="+1 (000) 000-0000" className="h-11 pl-10 bg-background border-muted-foreground/10 focus:ring-2 focus:ring-primary/20" />
            </div>
          </Field>

          <Field label="Email de contacto" required>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
              <Input type="email" value={data.email} onChange={(e) => updateData({ email: e.target.value })} placeholder="hola@tunegocio.com" className="h-11 pl-10 bg-background border-muted-foreground/10 focus:ring-2 focus:ring-primary/20" />
            </div>
          </Field>
        </div>

        {/* Fila 2: Dirección — ancho completo */}
        <Field label="Dirección física">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <Input value={data.address} onChange={(e) => updateData({ address: e.target.value })} placeholder="Ej: 123 Miami St, FL 33101" className="h-11 pl-10 bg-background border-muted-foreground/10 focus:ring-2 focus:ring-primary/20" />
          </div>
        </Field>

        {/* Fila 3: Horario — ancho completo para que quepan todos los controles */}
        <Field label="Horario de atención">
          <WeeklySchedulePicker value={schedule} onChange={setSchedule} />
        </Field>

        <div className="pt-8 border-t border-border/50">
          <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 mb-6 uppercase tracking-wider">
            <Globe size={14} /> Redes sociales y dominio
          </h3>
          <div className="grid sm:grid-cols-3 gap-8">
            <Field label="Instagram">
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                <Input value={data.instagram} onChange={(e) => updateData({ instagram: e.target.value })} placeholder="@tu_usuario" className="h-11 pl-10 bg-background border-muted-foreground/10 focus:ring-2 focus:ring-primary/20" />
              </div>
            </Field>
            <Field label="Facebook">
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                <Input value={data.facebook} onChange={(e) => updateData({ facebook: e.target.value })} placeholder="facebook.com/tu_pagina" className="h-11 pl-10 bg-background border-muted-foreground/10 focus:ring-2 focus:ring-primary/20" />
              </div>
            </Field>
            <Field label="TikTok">
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                <Input value={data.tiktok} onChange={(e) => updateData({ tiktok: e.target.value })} placeholder="@tu_usuario" className="h-11 pl-10 bg-background border-muted-foreground/10 focus:ring-2 focus:ring-primary/20" />
              </div>
            </Field>
          </div>
        </div>

        <div className="pt-8 border-t border-border/50 pb-6">
          <Field label="Nombre del dominio (URL)">
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
              <Input value={data.domain} onChange={(e) => updateData({ domain: e.target.value })} placeholder="Ej: www.tunegocio.com" className="h-12 pl-10 bg-primary/5 border-primary/20 focus:ring-2 focus:ring-primary/20 font-bold" />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 px-2 italic">
              Si ya lo tienes, dinos cuál es. Si no, dinos cuál te gustaría.
            </p>
          </Field>
        </div>
      </div>
    </div>
  );
};

export default Step7Contact;
