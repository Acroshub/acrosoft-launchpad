import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Globe, Sparkles, Zap, DollarSign, ClipboardList, Hammer, Rocket } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Var from "@/components/Var";

const plans = [
  {
    name: "Single Page Website",
    setup: "$500",
    monthly: "$49/mes",
    features: ["1 página bilingüe", "Textos con IA", "Formulario de contacto", "Responsive", "Deploy en Vercel"],
    delivery: "3–5 días hábiles",
    popular: false,
  },
  {
    name: "Multi Page Website",
    setup: "$1,500",
    monthly: "$99/mes",
    features: ["Hasta 6 páginas", "SEO local", "Galería dinámica", "Bilingüe + IA", "Formulario de contacto"],
    delivery: "10–14 días hábiles",
    popular: true,
  },
  {
    name: "Custom Booking",
    setup: "$5,000",
    monthly: "$250/mes",
    features: ["Todo lo anterior", "Sistema de citas", "Dashboard de gestión", "Notificaciones email", "Soporte prioritario WhatsApp"],
    delivery: "21–30 días hábiles",
    popular: false,
  },
];

const steps = [
  { icon: ClipboardList, title: "Llenas el formulario", desc: "Nos cuentas todo sobre tu negocio en 8 minutos" },
  { icon: Hammer, title: "Nosotros construimos", desc: "Tu sitio web profesional y bilingüe" },
  { icon: Rocket, title: "Tú creces online", desc: "Listo para recibir clientes desde el día 1" },
];

const benefits = [
  { icon: Globe, title: "Bilingüe por defecto", desc: "Español e inglés desde el inicio" },
  { icon: Sparkles, title: "Textos generados con IA", desc: "Inteligencia Artificial para tu contenido" },
  { icon: Zap, title: "Entrega en días, no meses", desc: "Rapidez sin sacrificar calidad" },
  { icon: DollarSign, title: "Precios para latinos", desc: "Precios para negocios latinos, no corporativos" },
];

const Index = () => (
  <div className="min-h-screen bg-background">
    <Navbar />

    {/* Hero */}
    <section className="container mx-auto px-4 py-20 md:py-28">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <Badge variant="secondary" className="text-xs font-medium">
            Agencia #1 para negocios latinos en USA
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-tight">
            Tu negocio en internet, sin complicaciones.
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg">
            Creamos sitios web profesionales para restaurantes, salones, clínicas y más. Bilingüe, rápido y sin pagar precios de agencia americana.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <a href="#planes">Ver planes →</a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="#como-funciona">¿Cómo funciona?</a>
            </Button>
          </div>
        </div>

        {/* Laptop mockup */}
        <div className="hidden md:flex justify-center">
          <div className="relative w-full max-w-md">
            <div className="bg-card border-2 rounded-xl shadow-xl overflow-hidden">
              <div className="bg-secondary flex items-center gap-1.5 px-4 py-2">
                <div className="w-3 h-3 rounded-full bg-destructive/40" />
                <div className="w-3 h-3 rounded-full bg-warning/40" />
                <div className="w-3 h-3 rounded-full bg-success/40" />
                <span className="ml-3 text-xs text-muted-foreground">acrosoft-client.vercel.app</span>
              </div>
              <div className="p-8 space-y-4">
                <div className="h-4 bg-primary/20 rounded w-1/3" />
                <h3 className="text-xl font-bold"><Var name="Business_Name" /></h3>
                <p className="text-sm text-muted-foreground"><Var name="Business_Tagline" /></p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-secondary rounded-lg p-3 h-20" />
                  <div className="bg-secondary rounded-lg p-3 h-20" />
                </div>
                <div className="bg-primary/10 rounded-lg p-3 text-center">
                  <span className="text-xs text-primary font-medium">Llámanos: <Var name="Contact_Phone" /></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* Planes */}
    <section id="planes" className="bg-card py-20 border-y">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">Elige tu plan</h2>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`bg-background rounded-xl p-6 border-2 transition-shadow hover:shadow-lg relative ${
                plan.popular ? "border-primary shadow-md" : "border-border"
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Más popular</Badge>
              )}
              <h3 className="text-lg font-bold mt-2">{plan.name}</h3>
              <div className="mt-3 mb-4">
                <span className="text-3xl font-bold text-primary">{plan.setup}</span>
                <span className="text-sm text-muted-foreground ml-1">setup</span>
                <span className="text-muted-foreground mx-1">·</span>
                <span className="text-sm font-medium">{plan.monthly}</span>
              </div>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check size={16} className="text-primary mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground mb-4">Entrega: {plan.delivery}</p>
              <Button asChild className="w-full" variant={plan.popular ? "default" : "outline"}>
                <Link to="/onboarding">Comenzar →</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Cómo funciona */}
    <section id="como-funciona" className="py-20">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">De cero a online en 3 pasos</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {steps.map((step, i) => (
            <div key={step.title} className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-accent flex items-center justify-center">
                <step.icon size={28} className="text-primary" />
              </div>
              <div className="text-sm font-bold text-primary">Paso {i + 1}</div>
              <h3 className="text-lg font-bold">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Por qué Acrosoft */}
    <section className="bg-card py-20 border-y">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">¿Por qué Acrosoft?</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {benefits.map((b) => (
            <div key={b.title} className="bg-background rounded-xl p-6 border hover:shadow-md transition-shadow">
              <b.icon size={28} className="text-primary mb-3" />
              <h3 className="font-bold mb-1">{b.title}</h3>
              <p className="text-sm text-muted-foreground">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    <Footer />
  </div>
);

export default Index;
