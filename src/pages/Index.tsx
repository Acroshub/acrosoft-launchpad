import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Globe, Sparkles, Zap, DollarSign, ClipboardList, Hammer, Rocket, Phone, Star, Shield, ArrowRight, MessageSquare, Users } from "lucide-react";
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
    color: "from-blue-500/10 to-blue-600/5",
    border: "hover:border-blue-400/50",
  },
  {
    name: "Multi Page Website",
    setup: "$1,500",
    monthly: "$99/mes",
    features: ["Hasta 6 páginas", "SEO local", "Galería dinámica", "Bilingüe + IA", "Formulario de contacto"],
    delivery: "10–14 días hábiles",
    popular: true,
    color: "from-primary/10 to-primary/5",
    border: "border-primary/50 shadow-xl shadow-primary/10",
  },
  {
    name: "Custom Booking",
    setup: "$5,000",
    monthly: "$250/mes",
    features: ["Todo lo anterior", "Sistema de citas", "Dashboard de gestión", "Notificaciones email", "Soporte prioritario WhatsApp"],
    delivery: "21–30 días hábiles",
    popular: false,
    color: "from-amber-500/10 to-amber-600/5",
    border: "hover:border-amber-400/50",
  },
];

const steps = [
  { icon: ClipboardList, title: "Llenas el formulario", desc: "Nos cuentas todo sobre tu negocio en 8 minutos." },
  { icon: Hammer, title: "Nosotros construimos", desc: "Tu sitio web profesional y bilingüe." },
  { icon: Rocket, title: "Tú creces online", desc: "Listo para recibir clientes desde el día 1." },
];

const benefits = [
  { icon: Globe, title: "Bilingüe por defecto", desc: "Español e inglés desde el inicio." },
  { icon: Sparkles, title: "Contenido profesional", desc: "Textos escritos por expertos para tu negocio." },
  { icon: Zap, title: "Entrega en días, no meses", desc: "Rapidez sin sacrificar calidad." },
  { icon: DollarSign, title: "Precios para latinos", desc: "Precios para negocios latinos, no corporativos." },
];

const Index = () => (
  <div className="min-h-screen bg-background selection:bg-primary/10">
    <Navbar />

    {/* Hero Section */}
    <section className="relative overflow-hidden pt-20 pb-20 md:pt-32 md:pb-32">
      {/* Background blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 pointer-events-none opacity-50">
        <div className="absolute top-[10%] left-[10%] w-72 h-72 bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[10%] right-[10%] w-96 h-96 bg-blue-400/20 rounded-full blur-[120px] animate-pulse delay-700" />
      </div>

      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-1000">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-wider uppercase">
              <Star size={14} className="fill-primary" /> Agencia #1 para negocios latinos en USA
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-foreground leading-[1.1]">
              Tu negocio en internet, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">sin complicaciones.</span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-lg leading-relaxed">
              Creamos sitios web profesionales para restaurantes, salones, clínicas y más. Bilingüe, rápido y sin pagar precios de agencia americana.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <Button asChild size="lg" className="h-14 px-8 rounded-2xl font-black text-lg shadow-xl shadow-primary/25 hover:scale-105 transition-all group">
                <Link to="/onboarding">
                  Empezar Ahora <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-14 px-8 rounded-2xl font-bold border-2 hover:bg-secondary transition-all">
                <a href="#como-funciona">¿Cómo funciona?</a>
              </Button>
            </div>

            <div className="flex items-center gap-6 pt-4">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-[10px] font-bold">
                    {i === 4 ? "+50" : <Users size={16} className="text-muted-foreground" />}
                  </div>
                ))}
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                <span className="text-foreground font-bold">+50 negocios</span> ya están creciendo con nosotros.
              </p>
            </div>
          </div>

          {/* Dynamic Mockup */}
          <div className="relative animate-in fade-in slide-in-from-right-8 duration-1000 delay-300">
            <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 to-blue-400/20 rounded-[40px] blur-2xl -z-10 opacity-60" />
            <div className="bg-card border-4 border-slate-200/50 rounded-[32px] shadow-2xl overflow-hidden glassmorphism">
              <div className="bg-slate-100/80 dark:bg-slate-800/80 flex items-center gap-1.5 px-6 py-4 border-b">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <div className="mx-auto bg-white/50 dark:bg-black/20 rounded-full px-4 py-1 text-[10px] font-bold text-muted-foreground flex items-center gap-2">
                  <Shield size={10} /> acrosoft-labs.com/tu-negocio
                </div>
              </div>
              
              <div className="p-10 space-y-8">
                <div className="flex justify-between items-center">
                  <div className="w-32 h-8 bg-primary/20 rounded-lg animate-pulse" />
                  <div className="flex gap-4">
                    <div className="w-16 h-2 bg-slate-200 rounded animate-pulse" />
                    <div className="w-16 h-2 bg-slate-200 rounded animate-pulse delay-75" />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="h-10 bg-slate-100 rounded-xl w-3/4 animate-pulse" />
                  <div className="h-4 bg-slate-100 rounded-lg w-full animate-pulse delay-150" />
                  <div className="h-4 bg-slate-100 rounded-lg w-5/6 animate-pulse delay-300" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl animate-pulse" />
                  <div className="aspect-video bg-gradient-to-br from-slate-200 to-slate-100 rounded-2xl animate-pulse delay-500" />
                </div>

                <div className="h-14 bg-primary rounded-2xl flex items-center justify-center gap-2 text-white font-bold">
                  <Phone size={18} /> Contactar Ahora
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* Trusted By */}
    <div className="container mx-auto px-4 pb-20">
      <p className="text-center text-xs font-bold text-muted-foreground/50 uppercase tracking-[0.3em] mb-8">Especialistas en Industrias de Servicios</p>
      <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-40 grayscale">
        {["RESTAURANTES", "SALONES DE BELLEZA", "CONSTRUCCIÓN", "CLÍNICAS DENTALES", "SERVICIOS LEGALES"].map((text) => (
          <span key={text} className="text-sm font-black tracking-tighter">{text}</span>
        ))}
      </div>
    </div>

    {/* Planes Section */}
    <section id="planes" className="relative bg-secondary/30 py-24 md:py-32 overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
          <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 transition-colors">Precios Claros</Badge>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight">Inversión Inteligente para tu Negocio</h2>
          <p className="text-lg text-muted-foreground">Selecciona el plan que se adapte a tu etapa actual. Escala cuando estés listo.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`flex flex-col bg-background rounded-[32px] p-8 border-2 transition-all duration-500 hover:-translate-y-2 relative group ${
                plan.border
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-b ${plan.color} opacity-0 group-hover:opacity-100 transition-opacity rounded-[32px] -z-10`} />
              
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-white text-xs font-bold shadow-lg">MÁS RECOMENDADO</Badge>
              )}
              
              <div className="space-y-2 mb-8">
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-foreground">{plan.setup}</span>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Setup inicial</span>
                </div>
                <div className="flex items-center gap-2 text-primary font-bold">
                  <Badge variant="secondary" className="bg-primary/10 text-primary">{plan.monthly}</Badge>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Mantenimiento</span>
                </div>
              </div>

              <ul className="space-y-4 mb-10 flex-grow">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                    <div className="mt-1 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Check size={12} className="text-primary font-bold" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
              
              <div className="space-y-6 pt-6 border-t border-border/50">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-muted-foreground uppercase tracking-tight">Tiempo de entrega:</span>
                  <span className="text-foreground">{plan.delivery}</span>
                </div>
                <Button asChild className={`w-full h-14 rounded-2xl font-black text-base transition-all ${plan.popular ? "shadow-lg shadow-primary/20" : ""}`} variant={plan.popular ? "default" : "outline"}>
                  <Link to="/onboarding">Comenzar Ahora</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Cómo funciona */}
    <section id="como-funciona" className="py-24 md:py-32">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
          <Badge variant="outline" className="border-primary/30 text-primary">Flujo de Trabajo</Badge>
          <h2 className="text-4xl font-black">De cero a online en 3 pasos</h2>
          <p className="text-muted-foreground font-medium">Hemos optimizado el proceso para que no pierdas tiempo.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto relative">
          {/* Connector line for desktop */}
          <div className="hidden md:block absolute top-12 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-transparent via-primary/20 to-transparent -z-10" />
          
          {steps.map((step, i) => (
            <div key={step.title} className="text-center space-y-6 group">
              <div className="relative mx-auto w-24 h-24 rounded-[32px] bg-secondary flex items-center justify-center transition-all duration-500 group-hover:rotate-6 group-hover:scale-110 group-hover:bg-primary group-hover:shadow-xl group-hover:shadow-primary/30">
                <step.icon size={40} className="text-primary group-hover:text-white transition-colors" />
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-background border-2 border-primary flex items-center justify-center text-xs font-black">
                  {i + 1}
                </div>
              </div>
              <div className="space-y-2 px-4">
                <h3 className="text-xl font-bold group-hover:text-primary transition-colors">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Why Acrosoft / Benefits */}
    <section className="bg-card py-24 md:py-32 border-y">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
          <div className="space-y-8">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
              ¿Por qué elegir <span className="text-primary">Acrosoft?</span>
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Sabemos lo que necesita un negocio latino en USA: presencia profesional, en ambos idiomas, sin pagar precios de agencia corporativa.
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-background rounded-2xl border border-border/50 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Check className="text-emerald-500" size={20} />
                </div>
                <p className="text-sm font-bold">Sin contratos de permanencia a largo plazo.</p>
              </div>
              <div className="flex items-center gap-3 p-4 bg-background rounded-2xl border border-border/50 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Check className="text-emerald-500" size={20} />
                </div>
                <p className="text-sm font-bold">Propiedad total de tu dominio y contenido.</p>
              </div>
            </div>
            <Button asChild size="lg" className="rounded-2xl font-black px-10 h-14">
              <Link to="/onboarding">Quiero más información</Link>
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {benefits.map((b) => (
              <div key={b.title} className="bg-background rounded-3xl p-8 border hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all group">
                <b.icon size={32} className="text-primary mb-6 transition-transform group-hover:scale-110" />
                <h3 className="text-lg font-bold mb-2">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>

    {/* CTA Final */}
    <section className="py-24 md:py-40 relative overflow-hidden">
      <div className="absolute inset-0 bg-primary -z-10" />
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white rounded-full blur-[160px]" />
      </div>
      
      <div className="container mx-auto px-4 text-center space-y-10">
        <h2 className="text-4xl md:text-6xl font-black text-white leading-tight max-w-4xl mx-auto">
          ¿Listo para subir de nivel tu negocio en Estados Unidos?
        </h2>
        <p className="text-xl text-primary-foreground/80 max-w-2xl mx-auto font-medium">
          Únete a la nueva generación de emprendedores latinos que dominan el mercado bilingüe.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button asChild size="lg" className="h-16 px-12 rounded-2xl bg-white text-primary hover:bg-slate-100 font-extrabold text-xl shadow-2xl">
            <Link to="/onboarding">Hacer mi Brief ahora</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-16 px-12 rounded-2xl border-2 border-white/30 text-white hover:bg-white/10 font-bold text-lg">
            <a href="https://wa.me/something" className="flex items-center gap-2">
              <MessageSquare size={20} /> Hablar por WhatsApp
            </a>
          </Button>
        </div>
      </div>
    </section>

    <Footer />
  </div>
);

export default Index;
