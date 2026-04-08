import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Code, Copy, Check, Globe, Clock, Calendar, ArrowLeft, Pencil, Link2 } from "lucide-react";

// {VAR_DB} — configuración real del calendario vendrá de Supabase
const defaultConfig = {
  name:        "{VAR_DB}",
  description: "{VAR_DB}",
  duration:    30,
  bufferTime:  10,
  slug:        "{VAR_DB}",
};

const CrmCalendarConfig = ({ onBack }: { onBack: () => void }) => {
  const [config, setConfig]       = useState(defaultConfig);
  const [embedTab, setEmbedTab]   = useState<"iframe" | "js">("iframe");
  const [copied, setCopied]       = useState(false);
  const [isEditingHours, setIsEditingHours] = useState(false);

  const publicUrl   = `https://acrosoft-labs.com/book/${config.slug}`;
  const iframeCode  = `<iframe\n  src="${publicUrl}"\n  width="100%"\n  height="700"\n  frameborder="0"\n  style="border-radius:12px;"\n></iframe>`;
  const jsCode      = `<div id="acrosoft-calendar"></div>\n<script>\n  window.AcrosoftCalendar = {\n    slug: "${config.slug}",\n    target: "#acrosoft-calendar"\n  };\n</script>\n<script src="https://acrosoft-labs.com/embed/calendar.js" defer></script>`;

  const activeCode = embedTab === "iframe" ? iframeCode : jsCode;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <button 
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft size={12} />
          Volver al calendario
        </button>
        <h1 className="text-xl font-semibold">Configuración del Calendario</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Personaliza cómo los clientes agendan contigo</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Configuración general */}
        <div className="bg-card border rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={15} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold">Información general</h2>
          </div>

          <Field label="Nombre del calendario">
            {/* {VAR_DB} */}
            <Input
              value={config.name}
              onChange={(e) => setConfig({ ...config, name: e.target.value })}
              className="h-10 text-sm"
            />
          </Field>

          <Field label="Descripción breve">
            {/* {VAR_DB} */}
            <Input
              value={config.description}
              onChange={(e) => setConfig({ ...config, description: e.target.value })}
              className="h-10 text-sm"
              placeholder="Ej: Consulta inicial sin costo"
            />
          </Field>

          <Field label="Formulario vinculado">
            {/* {VAR_DB} — select de formularios disponibles creados por el dev */}
            <div className="relative">
              <select className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none">
                <option value="f-1">Formulario de Contacto Principal</option>
                <option value="f-2">Cuestionario de Cualificación B2B</option>
              </select>
            </div>
          </Field>

          <Field label="URL pública del calendario">
            <div className="flex items-center gap-2">
              <Globe size={14} className="text-muted-foreground shrink-0" />
              {/* {VAR_DB} — slug del negocio */}
              <span className="text-xs text-muted-foreground">acrosoft-labs.com/book/</span>
              <Input
                value={config.slug}
                onChange={(e) => setConfig({ ...config, slug: e.target.value })}
                className="h-9 text-sm flex-1"
              />
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Duración de la cita (min)">
              {/* {VAR_DB} */}
              <Input
                type="number"
                value={config.duration}
                onChange={(e) => setConfig({ ...config, duration: Number(e.target.value) })}
                className="h-10 text-sm"
              />
            </Field>
            <Field label="Tiempo entre citas (min)">
              {/* {VAR_DB} */}
              <Input
                type="number"
                value={config.bufferTime}
                onChange={(e) => setConfig({ ...config, bufferTime: Number(e.target.value) })}
                className="h-10 text-sm"
              />
            </Field>
          </div>

          <Button className="w-full rounded-xl h-10 font-medium text-sm mt-2">
            Guardar cambios
          </Button>
        </div>

        {/* Disponibilidad */}
        <div className="bg-card border rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-muted-foreground" />
              <h2 className="text-sm font-semibold">Disponibilidad</h2>
            </div>
            <Button 
              variant={isEditingHours ? "default" : "outline"}
              size="sm" 
              className="h-7 text-xs px-2.5 gap-1.5" 
              onClick={() => setIsEditingHours(!isEditingHours)}
            >
              {isEditingHours ? <Check size={11} /> : <Pencil size={11} />} 
              {isEditingHours ? "Guardar" : "Editar horarios"}
            </Button>
          </div>
          {/* {VAR_DB} — horarios disponibles sincronizados con el horario del negocio */}
          {["Lun", "Mar", "Mié", "Jue", "Vie"].map((day) => (
            <div key={day} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
              <span className="text-sm font-medium w-10">{day}</span>
              {isEditingHours ? (
                <div className="flex items-center gap-1.5">
                   <Input defaultValue="09:00" className="h-6 text-xs w-[72px] px-2 text-center bg-transparent" />
                   <span className="text-[10px] text-muted-foreground">-</span>
                   <Input defaultValue="18:00" className="h-6 text-xs w-[72px] px-2 text-center bg-transparent" />
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">09:00 – 18:00</span>
              )}
              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium shrink-0">Activo</span>
            </div>
          ))}
          {["Sáb", "Dom"].map((day) => (
            <div key={day} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
              <span className="text-sm font-medium w-10 text-muted-foreground">{day}</span>
              {isEditingHours ? (
                <div className="flex items-center gap-1.5 opacity-50">
                   <Input defaultValue="" placeholder="--" className="h-6 text-xs w-[72px] px-2 text-center bg-transparent" disabled />
                   <span className="text-[10px] text-muted-foreground">-</span>
                   <Input defaultValue="" placeholder="--" className="h-6 text-xs w-[72px] px-2 text-center bg-transparent" disabled />
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
              <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium shrink-0">Cerrado</span>
            </div>
          ))}
          <p className="text-[11px] text-muted-foreground italic pt-2">
            La disponibilidad se sincroniza con tu horario de atención configurado en el onboarding.
          </p>
        </div>
      </div>

      {/* Integraciones */}
      <div className="bg-card border rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Link2 size={15} className="text-muted-foreground" />
          <h2 className="text-sm font-semibold">Integraciones Externas</h2>
        </div>

        <div className="grid gap-4">
          <div className="flex items-center justify-between p-5 rounded-2xl border bg-secondary/10 group hover:border-primary/30 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white border flex items-center justify-center p-2 shadow-sm shrink-0">
                <img 
                  src="https://www.gstatic.com/images/branding/product/1x/calendar_2020q4_48dp.png" 
                  alt="Google Calendar" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Google Calendar</p>
                <p className="text-xs text-muted-foreground mt-1">Sincroniza tus citas y evita duplicidad automáticamente en tiempo real.</p>
              </div>
            </div>
            <Button className="h-11 px-6 rounded-xl text-sm font-bold bg-primary hover:bg-primary/90 text-white shadow-md transition-all">
              Conectar cuenta
            </Button>
          </div>
        </div>
      </div>

      {/* Código de incrustación */}
      <div className="bg-card border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Code size={15} className="text-muted-foreground" />
          <h2 className="text-sm font-semibold">Incrustar en tu sitio web</h2>
        </div>

        <div className="flex gap-2">
          {(["iframe", "js"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setEmbedTab(tab)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${
                embedTab === tab
                  ? "bg-primary text-white border-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "iframe" ? "iFrame" : "JavaScript"}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          {embedTab === "iframe"
            ? "Copia y pega este código HTML donde quieras mostrar el calendario en tu sitio."
            : "Ideal si quieres mayor control sobre el estilo y comportamiento del calendario."}
        </p>

        <div className="relative">
          <pre className="bg-secondary/40 border rounded-xl p-5 text-xs font-mono text-foreground overflow-x-auto leading-relaxed whitespace-pre">
            {activeCode}
          </pre>
          <button
            onClick={handleCopy}
            className="absolute top-3 right-3 flex items-center gap-1.5 text-[11px] font-medium border rounded-lg px-3 py-1.5 bg-background hover:bg-secondary transition-all"
          >
            {copied ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t">
          <span className="text-xs text-muted-foreground">URL directa:</span>
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-primary hover:underline"
          >
            {publicUrl}
          </a>
        </div>
      </div>
    </div>
  );
};

export default CrmCalendarConfig;
