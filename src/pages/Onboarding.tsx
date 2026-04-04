import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, ChevronLeft, ChevronRight, Shield, Upload, Plus, Trash2, CheckCircle2 } from "lucide-react";
import AcrosoftLogo from "@/components/AcrosoftLogo";
import Var from "@/components/Var";
import { Link } from "react-router-dom";

const STEP_NAMES = ["Negocio", "Plan", "Identidad", "Servicios", "Audiencia", "Contenido", "Contacto", "Confirmación"];

const Onboarding = () => {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(1);
  const [services, setServices] = useState([{ name: "", desc: "", price: "", featured: false }]);

  const next = () => setStep((s) => Math.min(s + 1, 7));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const addService = () => {
    if (services.length < 6) setServices([...services, { name: "", desc: "", price: "", featured: false }]);
  };

  const removeService = (i: number) => {
    if (services.length > 1) setServices(services.filter((_, idx) => idx !== i));
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-md animate-fade-in">
          <div className="mx-auto w-20 h-20 rounded-full bg-success/10 flex items-center justify-center animate-check-bounce">
            <CheckCircle2 size={48} className="text-success" />
          </div>
          <h1 className="text-2xl font-bold">¡Recibimos tu información!</h1>
          <p className="text-muted-foreground">El equipo de Acrosoft Labs se pondrá en contacto en las próximas 24 horas.</p>
          <div className="bg-card border rounded-lg p-4">
            <span className="text-sm text-muted-foreground">ID de seguimiento:</span>
            <div className="mt-1"><Var name="Submission_ID" /></div>
          </div>
          <Button asChild><Link to="/">Volver al inicio</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex flex-col items-center gap-2">
          <Link to="/"><AcrosoftLogo size="sm" /></Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground border rounded-full px-2 py-0.5">
              <span className="font-semibold text-foreground">ES</span><span>/</span><span>EN</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Shield size={12} /> Tu información está segura y protegida
            </div>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center gap-1 max-w-2xl mx-auto mb-2">
          {STEP_NAMES.map((_, i) => (
            <div key={i} className="flex items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                  i < step ? "bg-primary text-primary-foreground" :
                  i === step ? "bg-primary text-primary-foreground ring-4 ring-accent" :
                  "bg-secondary text-muted-foreground"
                }`}
              >
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              {i < 7 && <div className={`h-0.5 flex-1 mx-1 ${i < step ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>
        <p className="text-center text-sm font-medium text-primary">{STEP_NAMES[step]}</p>
      </div>

      {/* Step content */}
      <div className="container mx-auto px-4 pb-24">
        <div className="max-w-[680px] mx-auto bg-card border rounded-xl p-6 md:p-8 animate-fade-in" key={step}>
          {step === 0 && <Step1 />}
          {step === 1 && <Step2 selected={selectedPlan} setSelected={setSelectedPlan} />}
          {step === 2 && <Step3 />}
          {step === 3 && <Step4 services={services} addService={addService} removeService={removeService} />}
          {step === 4 && <Step5 />}
          {step === 5 && <Step6 />}
          {step === 6 && <Step7 />}
          {step === 7 && <Step8 onSubmit={() => setSubmitted(true)} />}
        </div>

        {/* Nav buttons */}
        <div className="max-w-[680px] mx-auto flex justify-between mt-6">
          <Button variant="outline" onClick={prev} disabled={step === 0}>
            <ChevronLeft size={16} className="mr-1" /> Anterior
          </Button>
          {step < 7 ? (
            <Button onClick={next}>Siguiente <ChevronRight size={16} className="ml-1" /></Button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const SectionTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="mb-6">
    <h2 className="text-xl font-bold">{title}</h2>
    {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
  </div>
);

const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-sm font-medium">{label}{required && <span className="text-destructive ml-0.5">*</span>}</Label>
    {children}
  </div>
);

/* STEP 1 */
const Step1 = () => (
  <>
    <SectionTitle title="Cuéntanos sobre tu negocio" subtitle="Esta información aparecerá en tu sitio web" />
    <div className="space-y-4">
      <Field label="Nombre del negocio" required><Input placeholder="{{Business_Name}}" /></Field>
      <Field label="Rubro / Industria" required>
        <select className="w-full border rounded-md px-3 py-2 text-sm bg-background">
          <option>Restaurante</option><option>Salón de belleza</option><option>Construcción</option><option>Clínica dental</option><option>Otro</option>
        </select>
      </Field>
      <Field label="Ciudad y Estado" required><Input placeholder="{{Business_City_State}}" /></Field>
      <Field label="Años en operación"><Input type="number" placeholder="{{Business_Years}}" /></Field>
      <Field label="Descripción breve del negocio" required>
        <Textarea placeholder="Ej: Somos un restaurante de comida mexicana en Miami con más de 10 años sirviendo a la comunidad latina..." />
      </Field>
      <Field label="Historia del negocio"><Textarea placeholder="{{Business_History}}" /></Field>
    </div>
  </>
);

/* STEP 2 */
const planOptions = [
  { name: "Single Page Website", price: "$500 setup" },
  { name: "Multi Page Website", price: "$1,500 setup" },
  { name: "Custom Booking", price: "$5,000 setup" },
];
const Step2 = ({ selected, setSelected }: { selected: number; setSelected: (n: number) => void }) => (
  <>
    <SectionTitle title="¿Qué plan elegiste?" />
    <div className="grid gap-3 mb-6">
      {planOptions.map((p, i) => (
        <button
          key={p.name}
          onClick={() => setSelected(i)}
          className={`text-left border-2 rounded-lg p-4 transition-all ${selected === i ? "border-primary bg-accent" : "border-border hover:border-primary/30"}`}
        >
          <div className="font-semibold">{p.name}</div>
          <div className="text-sm text-muted-foreground">{p.price}</div>
        </button>
      ))}
    </div>
    <div className="space-y-4">
      <Field label="Forma de pago">
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm"><input type="radio" name="payment" defaultChecked /> Pago único</label>
          <label className="flex items-center gap-2 text-sm"><input type="radio" name="payment" /> 3 cuotas (50%·25%·25%)</label>
        </div>
      </Field>
      <Field label="Fecha estimada de inicio"><Input type="date" /></Field>
    </div>
  </>
);

/* STEP 3 */
const Step3 = () => (
  <>
    <SectionTitle title="Tu marca e identidad visual" />
    <div className="space-y-4">
      <Field label="Logo del negocio">
        <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground hover:border-primary/50 transition-colors cursor-pointer">
          <Upload size={24} className="mx-auto mb-2" />
          <p className="text-sm">Arrastra tu logo aquí o haz click para subir</p>
          <p className="text-xs mt-1">PNG, SVG o JPG</p>
        </div>
      </Field>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Color primario"><Input type="color" defaultValue="#2563EB" className="h-10" /></Field>
        <Field label="Color secundario"><Input type="color" defaultValue="#1E40AF" className="h-10" /></Field>
        <Field label="Color de acento"><Input type="color" defaultValue="#F59E0B" className="h-10" /></Field>
      </div>
      <Field label="Tipografía preferida">
        <select className="w-full border rounded-md px-3 py-2 text-sm bg-background">
          <option>Moderna</option><option>Clásica</option><option>Elegante</option><option>Quiero sugerir una</option>
        </select>
      </Field>
      <Field label="Estilo visual">
        <select className="w-full border rounded-md px-3 py-2 text-sm bg-background">
          <option>Moderno y tech</option><option>Cálido y familiar</option><option>Minimalista</option><option>Profesional y formal</option>
        </select>
      </Field>
      <Field label="Sitio de referencia 1"><Input placeholder="{{Reference_URL_1}}" /></Field>
      <Field label="Sitio de referencia 2"><Input placeholder="{{Reference_URL_2}}" /></Field>
      <Field label="Sitio de referencia 3"><Input placeholder="{{Reference_URL_3}}" /></Field>
    </div>
  </>
);

/* STEP 4 */
const Step4 = ({ services, addService, removeService }: { services: any[]; addService: () => void; removeService: (i: number) => void }) => (
  <>
    <SectionTitle title="¿Qué servicios ofreces?" subtitle="Agrega hasta 6 servicios. Al menos 1 es requerido." />
    <div className="space-y-4">
      {services.map((_, i) => (
        <div key={i} className="border rounded-lg p-4 space-y-3 relative">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-muted-foreground">Servicio {i + 1}</span>
            {services.length > 1 && (
              <button onClick={() => removeService(i)} className="text-destructive hover:text-destructive/80"><Trash2 size={16} /></button>
            )}
          </div>
          <Input placeholder={`{{Service_${i + 1}_Name}}`} />
          <Textarea placeholder={`{{Service_${i + 1}_Description}}`} className="min-h-[60px]" />
          <Input placeholder={`{{Service_${i + 1}_Price}}`} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" /> ¿Es tu servicio estrella?</label>
        </div>
      ))}
      {services.length < 6 && (
        <Button variant="outline" onClick={addService} className="w-full"><Plus size={16} className="mr-1" /> Agregar otro servicio</Button>
      )}
    </div>
  </>
);

/* STEP 5 */
const Step5 = () => (
  <>
    <SectionTitle title="¿A quién le sirves?" />
    <div className="space-y-4">
      <Field label="¿Quién es tu cliente ideal?" required><Textarea placeholder="{{Target_Audience}}" /></Field>
      <Field label="¿Qué problema resuelves?" required><Textarea placeholder="{{Problem_Solved}}" /></Field>
      <Field label="¿Qué te hace diferente?" required><Textarea placeholder="{{Differentiator}}" /></Field>
      <div className="border-t pt-4 mt-4">
        <h3 className="font-semibold mb-3">Testimonios de clientes</h3>
        {[1, 2, 3].map((n) => (
          <div key={n} className="border rounded-lg p-4 mb-3 space-y-2">
            <Input placeholder={`{{Testimonial_${n}_Name}}`} />
            <Textarea placeholder={`{{Testimonial_${n}_Text}}`} className="min-h-[60px]" />
          </div>
        ))}
      </div>
      <div className="border-t pt-4 mt-4">
        <h3 className="font-semibold mb-3">Preguntas frecuentes</h3>
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n} className="border rounded-lg p-4 mb-3 space-y-2">
            <Input placeholder={`{{FAQ_${n}_Question}}`} />
            <Textarea placeholder={`{{FAQ_${n}_Answer}}`} className="min-h-[60px]" />
          </div>
        ))}
      </div>
    </div>
  </>
);

/* STEP 6 */
const Step6 = () => (
  <>
    <SectionTitle title="Fotos y videos de tu negocio" />
    <div className="space-y-4">
      <Field label="Fotos del negocio (máx 10)">
        <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground hover:border-primary/50 transition-colors cursor-pointer">
          <Upload size={24} className="mx-auto mb-2" />
          <p className="text-sm">Arrastra tus fotos aquí o haz click para subir</p>
        </div>
      </Field>
      <Field label="Fotos del equipo (opcional)">
        <div className="border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground hover:border-primary/50 transition-colors cursor-pointer">
          <Upload size={20} className="mx-auto mb-1" />
          <p className="text-sm">Subir fotos del equipo</p>
        </div>
      </Field>
      <Field label="Video de presentación (opcional)"><Input placeholder="{{Video_URL}} — URL de YouTube o Vimeo" /></Field>
    </div>
  </>
);

/* STEP 7 */
const Step7 = () => (
  <>
    <SectionTitle title="¿Cómo te contactan?" />
    <div className="grid sm:grid-cols-2 gap-4">
      <Field label="Teléfono / WhatsApp" required><Input placeholder="{{Contact_Phone}}" /></Field>
      <Field label="Email de contacto" required><Input placeholder="{{Contact_Email}}" /></Field>
      <Field label="Dirección física"><Input placeholder="{{Business_Address}}" /></Field>
      <Field label="Horario de atención"><Input placeholder="{{Business_Schedule}}" /></Field>
      <Field label="Instagram"><Input placeholder="{{Social_Instagram}}" /></Field>
      <Field label="Facebook"><Input placeholder="{{Social_Facebook}}" /></Field>
      <Field label="TikTok"><Input placeholder="{{Social_TikTok}}" /></Field>
      <Field label="Google Maps (URL)"><Input placeholder="{{Google_Maps_URL}}" /></Field>
      <div className="sm:col-span-2">
        <Field label="Dominio comprado o deseado"><Input placeholder="{{Domain}}" /></Field>
      </div>
    </div>
  </>
);

/* STEP 8 */
const Step8 = ({ onSubmit }: { onSubmit: () => void }) => (
  <>
    <SectionTitle title="¡Todo listo! Revisa tu información" />
    <div className="space-y-3">
      {[
        { title: "Negocio", vars: ["Business_Name", "Business_Industry", "Business_City_State"] },
        { title: "Plan", vars: ["Selected_Plan", "Payment_Method"] },
        { title: "Identidad", vars: ["Brand_Visual_Style", "Brand_Color_Primary"] },
        { title: "Servicios", vars: ["Service_1_Name", "Service_2_Name"] },
        { title: "Contacto", vars: ["Contact_Phone", "Contact_Email", "Domain"] },
      ].map((section) => (
        <details key={section.title} className="border rounded-lg" open>
          <summary className="font-semibold text-sm px-4 py-3 cursor-pointer hover:bg-secondary/50 transition-colors">
            {section.title}
          </summary>
          <div className="px-4 pb-3 flex flex-wrap gap-2">
            {section.vars.map((v) => <Var key={v} name={v} />)}
          </div>
        </details>
      ))}
    </div>
    <Button onClick={onSubmit} className="w-full mt-6" size="lg">
      Confirmar y enviar información →
    </Button>
  </>
);

export default Onboarding;
