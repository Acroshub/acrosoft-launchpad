import { useState } from "react";
import { Phone, Mail, MapPin, Globe, Link as LinkIcon, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SectionTitle, Field } from "./FormHelpers";

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const HOURS = [
  "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM",
  "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM",
];

type DaySchedule = { open: boolean; from: string; to: string };
type Schedule = Record<string, DaySchedule>;

const DEFAULT_SCHEDULE: Schedule = {
  Lun: { open: true,  from: "9:00 AM", to: "6:00 PM" },
  Mar: { open: true,  from: "9:00 AM", to: "6:00 PM" },
  Mié: { open: true,  from: "9:00 AM", to: "6:00 PM" },
  Jue: { open: true,  from: "9:00 AM", to: "6:00 PM" },
  Vie: { open: true,  from: "9:00 AM", to: "6:00 PM" },
  Sáb: { open: false, from: "9:00 AM", to: "2:00 PM" },
  Dom: { open: false, from: "9:00 AM", to: "2:00 PM" },
};

const TimeSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
  >
    {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
  </select>
);

const SchedulePicker = () => {
  const [schedule, setSchedule] = useState<Schedule>(DEFAULT_SCHEDULE);
  const [copySource, setCopySource] = useState<string | null>(null);
  const [copyTargets, setCopyTargets] = useState<string[]>([]);

  const update = (day: string, field: keyof DaySchedule, value: string | boolean) =>
    setSchedule((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }));

  const toggleCopyTarget = (day: string) =>
    setCopyTargets((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );

  const applyPaste = () => {
    if (!copySource || copyTargets.length === 0) return;
    const { from, to } = schedule[copySource];
    setSchedule((prev) => {
      const next = { ...prev };
      copyTargets.forEach((d) => { next[d] = { ...next[d], from, to }; });
      return next;
    });
    setCopySource(null);
    setCopyTargets([]);
  };

  const cancelCopy = () => { setCopySource(null); setCopyTargets([]); };

  const src = copySource ? schedule[copySource] : null;

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      {DAYS.map((day) => {
        const s = schedule[day];
        const isCopySource = copySource === day;
        const isTarget = copyTargets.includes(day);
        const inCopyMode = copySource !== null;
        const isOtherDay = inCopyMode && !isCopySource;

        return (
          <div
            key={day}
            style={{
              display: "grid",
              gridTemplateColumns: "48px 1fr 12px 1fr auto",
              alignItems: "center",
              gap: "8px",
              padding: "10px 16px",
              borderBottom: "1px solid hsl(var(--border) / 0.5)",
              background: isCopySource
                ? "hsl(var(--primary) / 0.05)"
                : isTarget
                ? "hsl(var(--primary) / 0.08)"
                : s.open
                ? ""
                : "hsl(var(--secondary) / 0.2)",
            }}
          >
            {/* Toggle día */}
            <button
              type="button"
              onClick={() => !inCopyMode && update(day, "open", !s.open)}
              disabled={inCopyMode && !isCopySource}
              className={`text-xs font-semibold rounded-md py-1.5 border transition-all ${
                s.open
                  ? "bg-primary text-white border-primary"
                  : "bg-background text-muted-foreground border-border"
              } ${inCopyMode && !isCopySource ? "opacity-40 cursor-default" : ""}`}
            >
              {day}
            </button>

            {/* Hora apertura */}
            {s.open
              ? <TimeSelect value={s.from} onChange={(v) => update(day, "from", v)} />
              : <span className="text-xs text-muted-foreground/40 italic" style={{ gridColumn: "2 / 5" }}>Cerrado</span>
            }

            {/* Guión separador */}
            {s.open && (
              <span className="text-center text-muted-foreground text-sm">–</span>
            )}

            {/* Hora cierre */}
            {s.open && (
              <TimeSelect value={s.to} onChange={(v) => update(day, "to", v)} />
            )}

            {/* Acciones */}
            <div className="flex justify-end">
              {isCopySource ? (
                <span className="text-[10px] text-primary font-semibold">Origen</span>
              ) : isOtherDay && s.open ? (
                <button
                  type="button"
                  onClick={() => toggleCopyTarget(day)}
                  className={`text-[10px] font-semibold border rounded-md px-2 py-1 transition-all ${
                    isTarget
                      ? "bg-primary text-white border-primary"
                      : "text-muted-foreground border-border hover:border-primary/40 hover:text-primary"
                  }`}
                >
                  {isTarget ? "Seleccionado" : "Seleccionar"}
                </button>
              ) : !inCopyMode && s.open ? (
                <button
                  type="button"
                  onClick={() => { setCopySource(day); setCopyTargets([]); }}
                  title="Copiar este horario a otros días"
                  className="p-1.5 rounded-md text-muted-foreground/40 hover:text-primary hover:bg-primary/5 transition-colors"
                >
                  <Copy size={13} />
                </button>
              ) : null}
            </div>
          </div>
        );
      })}

      {/* Barra de acción modo copia */}
      {copySource && src && (
        <div className="px-4 py-3 bg-primary/5 border-t border-primary/10 flex items-center justify-between gap-4">
          <p className="text-[11px] text-primary font-medium">
            Copiando <strong>{copySource}</strong>: {src.from} – {src.to}
            {copyTargets.length > 0 && (
              <span className="text-muted-foreground font-normal ml-1">
                → {copyTargets.join(", ")}
              </span>
            )}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={cancelCopy}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={applyPaste}
              disabled={copyTargets.length === 0}
              className="text-[11px] font-semibold bg-primary text-white px-3 py-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
            >
              Aplicar a {copyTargets.length > 0 ? `${copyTargets.length} día${copyTargets.length > 1 ? "s" : ""}` : "días seleccionados"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Step7Contact = () => {
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
              <Input placeholder="+1 (000) 000-0000" className="h-11 pl-10 bg-background border-muted-foreground/10 focus:ring-2 focus:ring-primary/20" />
            </div>
          </Field>

          <Field label="Email de contacto" required>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
              <Input type="email" placeholder="hola@tunegocio.com" className="h-11 pl-10 bg-background border-muted-foreground/10 focus:ring-2 focus:ring-primary/20" />
            </div>
          </Field>
        </div>

        {/* Fila 2: Dirección — ancho completo */}
        <Field label="Dirección física">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <Input placeholder="Ej: 123 Miami St, FL 33101" className="h-11 pl-10 bg-background border-muted-foreground/10 focus:ring-2 focus:ring-primary/20" />
          </div>
        </Field>

        {/* Fila 3: Horario — ancho completo para que quepan todos los controles */}
        <Field label="Horario de atención">
          <SchedulePicker />
        </Field>

        <div className="pt-8 border-t border-border/50">
          <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 mb-6 uppercase tracking-wider">
            <Globe size={14} /> Redes sociales y dominio
          </h3>
          <div className="grid sm:grid-cols-3 gap-8">
            <Field label="Instagram">
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                <Input placeholder="@tu_usuario" className="h-11 pl-10 bg-background border-muted-foreground/10 focus:ring-2 focus:ring-primary/20" />
              </div>
            </Field>
            <Field label="Facebook">
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
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
              Si ya lo tienes, dinos cuál es. Si no, dinos cuál te gustaría.
            </p>
          </Field>
        </div>
      </div>
    </div>
  );
};

export default Step7Contact;
