import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Check, CalendarDays, ArrowRight, Users, Clock, ShieldCheck,
  ChevronDown, ChevronLeft, ChevronRight, Star, MessageCircle,
  Zap, Globe, Hammer, Rocket, Scissors, Loader2,
  Stethoscope, Scale, HardHat, X, TrendingUp, Building2,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CalendarRenderer from "@/components/crm/CalendarRenderer";
import { translations } from "@/i18n/landing";
import type { CrmService } from "@/lib/supabase";

interface Props {
  calendarId: string | null | undefined;
  services: CrmService[];
}

// ─── Palette tokens ───────────────────────────────────────────────────────────
// Dark bg  : #040E1F  (deep navy blue)
// Primary  : #1877F2  Facebook corporate blue
// Deep     : #0a57d0  darker blue for gradients
// Gradient : linear-gradient(135deg, #1877F2, #0a57d0)

// ─── CRO config ───────────────────────────────────────────────────────────────
const WA_NUMBER = ""; // TODO: agregar número WhatsApp de Acrosoft (ej. "17861234567")
const WA_MSG    = encodeURIComponent("Hola! Vi su sitio web y me gustaría saber más sobre sus servicios.");

// ─── Static data ──────────────────────────────────────────────────────────────

const STEP_ICONS = [CalendarDays, Hammer, Rocket];

const INDUSTRIES = [
  { icon: TrendingUp,  name: "Agencias de Marketing", desc: "CRM, pipeline de clientes, seguimiento de campañas y automatización WhatsApp.", tag: "Más cierres"         },
  { icon: Scissors,    name: "Salones de Belleza",     desc: "Agenda de citas, recordatorios automáticos y galería de trabajo.",            tag: "Agenda llena"        },
  { icon: Stethoscope, name: "Clínicas y Consultorios",desc: "Formularios de pacientes, citas, recordatorios y seguimiento por texto.",    tag: "Menos cancelaciones" },
  { icon: Scale,       name: "Servicios Legales",      desc: "Captura de prospectos, consultas online y gestión de casos.",               tag: "Más clientes"        },
  { icon: HardHat,     name: "Construcción",           desc: "Pipeline de proyectos, presupuestos y seguimiento de clientes.",            tag: "Cotizaciones 24/7"   },
  { icon: Building2,   name: "Consultores y Coaches",  desc: "Sesiones online, pipeline de prospectos, agente IA y seguimiento por WhatsApp.", tag: "Escala tu práctica" },
];

const TESTIMONIALS = [
  {
    avatar: "MG",
    name: "María García",
    business: "Salón Rosa · Houston, TX",
    stars: 5,
    result: "Agenda llena",
    quote: "Antes llenaba mi agenda solo por recomendaciones. Ahora tengo citas llegando solas desde mi página, en inglés y en español.",
  },
  {
    avatar: "CR",
    name: "Carlos Ríos",
    business: "Nexus Marketing · Phoenix, AZ",
    stars: 5,
    result: "+40% en cierres",
    quote: "El CRM y el agente de WhatsApp cambiaron todo. Mis prospectos reciben seguimiento automático y mis cierres subieron un 40%.",
  },
  {
    avatar: "AL",
    name: "Ana López",
    business: "Dental Smile · Miami, FL",
    stars: 5,
    result: "0 cancelaciones",
    quote: "Los recordatorios automáticos redujeron las cancelaciones a casi cero. Acrosoft entiende a los negocios latinos.",
  },
];

const FAQS = [
  {
    q: "¿Cuánto tiempo tarda en estar listo mi sitio?",
    a: "La mayoría de nuestros proyectos están listos en 5 a 7 días hábiles desde que nos envías la información de tu negocio.",
  },
  {
    q: "¿El sitio estará en inglés y español?",
    a: "Sí, todos nuestros sitios son bilingües por defecto — perfectos para clientes angloparlantes e hispanohablantes por igual.",
  },
  {
    q: "¿Soy dueño del sitio web y el dominio?",
    a: "100%. El dominio y todo el contenido te pertenece desde el primer día. Sin contratos de permanencia ni letras pequeñas.",
  },
  {
    q: "¿Qué pasa si quiero cambios después de la entrega?",
    a: "Los primeros 30 días de revisiones están incluidos sin costo adicional. Después ofrecemos planes de mantenimiento mensual.",
  },
  {
    q: "¿Necesito saber de tecnología para manejar el sitio?",
    a: "No. Entregamos todo listo para funcionar. Con el plan que incluye CRM, ofrecemos capacitación de 1 hora sin costo adicional.",
  },
];

const GUARANTEE = [
  { icon: Clock,       title: "30 días de revisiones", desc: "Incluidas en todos los planes, sin costo extra" },
  { icon: ShieldCheck, title: "Tu dominio, siempre",   desc: "Propiedad 100% del cliente desde el día 1"      },
  { icon: Zap,         title: "Soporte en español",    desc: "Comunicación directa, sin barreras de idioma"   },
  { icon: Star,        title: "Precio fijo",           desc: "Sin sorpresas ni costos ocultos en tu factura"  },
];

const MARQUEE = [
  "AGENCIAS DE MARKETING", "SALONES DE BELLEZA", "CONSTRUCCIÓN", "CLÍNICAS DENTALES", "SERVICIOS LEGALES",
  "AGENCIAS DE MARKETING", "SALONES DE BELLEZA", "CONSTRUCCIÓN", "CLÍNICAS DENTALES", "SERVICIOS LEGALES",
];

const STATS = [
  { value: "+50",    label: "Negocios atendidos"   },
  { value: "5",      label: "Industrias servidas"  },
  { value: "7 días", label: "Tiempo de entrega"    },
  { value: "100%",   label: "Propiedad del cliente"},
];

const BENEFIT_ICONS = [Globe, Zap, Rocket, ShieldCheck];

// ─── Mini Calendar Widget ─────────────────────────────────────────────────────

function MiniCalendar() {
  const now    = new Date();
  const year   = now.getFullYear();
  const month  = now.getMonth();
  const today  = now.getDate();

  const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const DAYS   = ["Lu","Ma","Mi","Ju","Vi","Sá","Do"];

  const firstDay    = new Date(year, month, 1).getDay();
  const startOffset = (firstDay + 6) % 7;
  const total       = new Date(year, month + 1, 0).getDate();

  const booked = new Set([3, 7, 10, 14, 17, 21]);
  const free   = new Set(
    [today + 2, today + 4, today + 7, today + 9].filter(d => d <= total && !booked.has(d)),
  );

  const cells: (number | null)[] = Array(startOffset).fill(null);
  for (let d = 1; d <= total; d++) cells.push(d);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <button className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
          <ChevronLeft size={16} />
        </button>
        <span className="text-base font-bold text-slate-900">{MONTHS[month]} {year}</span>
        <button className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {DAYS.map(d => (
          <div key={d} className="text-center text-xs font-bold text-slate-400 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`_${i}`} />;
          const isToday  = day === today;
          const isBooked = booked.has(day);
          const isFree   = free.has(day);
          return (
            <div
              key={day}
              className={`relative h-10 flex items-center justify-center rounded-xl text-sm font-medium transition-colors
                ${isToday  ? "bg-blue-600 text-white font-bold" :
                  isBooked ? "text-slate-300" :
                  isFree   ? "text-slate-800 hover:bg-blue-50 cursor-pointer" :
                             "text-slate-600 hover:bg-slate-50 cursor-pointer"}
              `}
            >
              {day}
              {isFree && !isToday && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />
              )}
              {isBooked && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-slate-200" />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-5 border-t border-slate-100 flex items-center gap-4">
        <div className="flex gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />Disponible
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />Ocupado
          </span>
        </div>
        <span className="ml-auto text-xs font-bold text-blue-600">{free.size} horarios libres</span>
      </div>
      <button
        className="mt-4 w-full h-11 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
        style={{ background: "linear-gradient(135deg, #1877F2, #0a57d0)" }}
      >
        <CalendarDays size={15} /> Selecciona un horario
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const LandingContent = ({ calendarId, services }: Props) => {
  const T     = translations.es;
  const steps = T.steps.items.map((item, i) => ({ icon: STEP_ICONS[i], ...item }));
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add("lp-visible"); obs.unobserve(e.target); }
      }),
      { threshold: 0.08 },
    );
    // Re-observe when services load — cards rendered after initial mount
    // start with opacity:0 and never become visible without re-observing.
    document.querySelectorAll(".lp-reveal:not(.lp-visible)").forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [services]);

  return (
    <div className="min-h-screen bg-background selection:bg-blue-500/20 pb-16 sm:pb-0">

      {/* ── Animations ──────────────────────────────────────────────────── */}
      <style>{`
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .marquee-track { display: flex; width: max-content; animation: marquee 28s linear infinite; }
        .lp-reveal            { opacity: 0; transform: translateY(20px); transition: opacity 0.55s ease-out, transform 0.55s ease-out; }
        .lp-reveal.lp-visible { opacity: 1; transform: translateY(0); }
        .lp-d1 { transition-delay: 0.08s; }
        .lp-d2 { transition-delay: 0.16s; }
        .lp-d3 { transition-delay: 0.24s; }
        .lp-d4 { transition-delay: 0.32s; }
        .lp-d5 { transition-delay: 0.40s; }
      `}</style>

      <Navbar />

      {/* ═══════════════════════════════════════════════════════════
          HERO — Deep navy blue, shimmer headline, floating calendar
      ═══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-[#040E1F] pt-24 pb-16 md:pt-36 md:pb-28">
        {/* Subtle blue grid */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: "linear-gradient(rgb(24 119 242/0.5) 1px,transparent 1px),linear-gradient(90deg,rgb(24 119 242/0.5) 1px,transparent 1px)",
            backgroundSize: "52px 52px",
          }}
        />
        {/* Blue glows */}
        <div className="absolute -top-32 -left-16 w-[600px] h-[600px] bg-blue-800/20 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-900/15 rounded-full blur-[120px] pointer-events-none" />

        <div className="container mx-auto px-4 relative">
          <div className="grid lg:grid-cols-[1fr_540px] gap-10 lg:gap-14 items-center">

            {/* Left copy */}
            <div className="space-y-8">
              <div className="flex flex-wrap gap-2">
                <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-blue-600/25 bg-blue-600/[0.08]">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span className="text-blue-300 text-xs font-semibold tracking-[0.12em] uppercase">
                    Agencia #1 para Latinos en USA
                  </span>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/30 bg-emerald-500/[0.08]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-300 text-xs font-semibold">Agenda disponible esta semana</span>
                </div>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-[68px] font-black tracking-tight leading-[1.05]">
                <span className="text-white">Tu negocio</span>
                <br />
                <span className="text-white">en internet,</span>
                <br />
                <span style={{ color: "#60a5fa" }}>sin complicaciones.</span>
              </h1>

              <p className="text-base text-slate-400 max-w-lg leading-relaxed">{T.hero.p}</p>

              <div className="flex flex-wrap gap-3 pt-1">
                <Button
                  asChild size="lg"
                  className="h-12 px-7 rounded-xl font-semibold text-sm border-0 hover:brightness-110 transition-all group"
                  style={{ background: "#1877F2" }}
                >
                  <a href="#agendar" className="flex items-center gap-2 text-white">
                    {T.hero.cta1}
                    <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                  </a>
                </Button>
                {WA_NUMBER && (
                  <Button
                    asChild size="lg"
                    className="h-12 px-7 rounded-xl font-semibold text-sm border-0 hover:brightness-110 transition-all"
                    style={{ background: "#25D366" }}
                  >
                    <a href={`https://wa.me/${WA_NUMBER}?text=${WA_MSG}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-white">
                      <MessageCircle size={16} /> Escribir por WhatsApp
                    </a>
                  </Button>
                )}
                <Button
                  asChild variant="outline" size="lg"
                  className="h-12 px-7 rounded-xl font-medium bg-transparent border-white/15 text-white/70 hover:bg-white/[0.06] hover:border-white/25 hover:text-white transition-all"
                >
                  <a href="#como-funciona">{T.hero.cta2}</a>
                </Button>
              </div>

              {/* Risk reversal */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                {["Sin contrato", "Sin tarjeta requerida", "Respuesta en 24h"].map(t => (
                  <span key={t} className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Check size={11} className="text-emerald-400 shrink-0" />{t}
                  </span>
                ))}
              </div>

              {/* Social proof */}
              <div className="flex items-center gap-4 pt-1">
                <div className="flex -space-x-2.5">
                  {[0, 1, 2, 3].map(i => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full border-2 border-[#040E1F] flex items-center justify-center text-white"
                      style={{ background: i < 3 ? `hsl(${220 - i * 12} 70% ${45 + i * 5}%)` : "#1e3a5f", fontSize: "9px", fontWeight: 800 }}
                    >
                      {i === 3 ? "+50" : <Users size={11} />}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-slate-400">
                  <span className="text-white font-semibold">{T.hero.socialBold}</span> {T.hero.social}
                </p>
              </div>

              {/* Stats bar */}
              <div className="pt-5 border-t border-white/8 grid grid-cols-2 sm:grid-cols-4 gap-5">
                {STATS.map(({ value, label }) => (
                  <div key={label}>
                    <p className="text-2xl font-black text-white">{value}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-tight">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Calendar card */}
            <div id="agendar" className="relative scroll-mt-24">
              {!calendarId && (
                <div
                  className="absolute -inset-8 rounded-[64px] blur-3xl opacity-30 pointer-events-none"
                  style={{ background: "radial-gradient(circle, #bfdbfe, transparent 70%)" }}
                />
              )}
              <div
                className="relative rounded-3xl overflow-hidden border border-slate-200 shadow-lg bg-white"
              >
                <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #1877F2, #0a57d0)" }}
                  >
                    <CalendarDays size={15} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 leading-none">Agenda tu consulta gratis</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">30 min · sin compromiso · en español</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[10px] text-blue-600 font-semibold">En vivo</span>
                  </div>
                </div>

                {calendarId ? (
                  <div className="bg-white px-6 pb-6">
                    <CalendarRenderer calendarId={calendarId} />
                  </div>
                ) : calendarId === null ? (
                  <div className="p-8 relative">
                    <div className="blur-sm pointer-events-none select-none opacity-50">
                      <MiniCalendar />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center px-6">
                      <div className="text-center bg-white/95 backdrop-blur-sm rounded-2xl px-7 py-5 shadow-lg border border-slate-100 space-y-3 w-full max-w-xs">
                        <div className="w-11 h-11 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto">
                          <CalendarDays size={20} style={{ color: "#1877F2" }} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">Sin disponibilidad actual</p>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">Contáctanos directamente para coordinar tu cita</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // calendarId === undefined → still loading, show neutral skeleton
                  <div className="p-8 flex items-center justify-center min-h-[320px]">
                    <Loader2 size={22} className="animate-spin text-blue-400" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          QUÉ PASA DESPUÉS — reduce ansiedad de booking
      ═══════════════════════════════════════════════════════════ */}
      <section className="py-10 bg-[#040E1F] border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-0 sm:gap-0 max-w-3xl mx-auto">
            {[
              { n: "1", title: "Agendas la llamada",   desc: "Gratis, 30 min, en español" },
              { n: "2", title: "Te contamos el plan",   desc: "Sin presión ni letra chica"  },
              { n: "3", title: "Tu sitio en 7 días",    desc: "Listo para recibir clientes" },
            ].map((step, i) => (
              <div key={step.n} className="flex items-center">
                <div className="flex flex-col sm:flex-row items-center gap-3 px-6 py-4 text-center sm:text-left">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
                    style={{ background: "linear-gradient(135deg, #1877F2, #0a57d0)" }}>
                    {step.n}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{step.title}</p>
                    <p className="text-xs text-slate-500">{step.desc}</p>
                  </div>
                </div>
                {i < 2 && <span className="hidden sm:block text-slate-700 text-lg font-thin mx-1">→</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          MARQUEE
      ═══════════════════════════════════════════════════════════ */}
      <div className="overflow-hidden bg-blue-800 py-3 border-y border-blue-700/50">
        <div className="marquee-track">
          {MARQUEE.concat(MARQUEE).map((item, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-3 px-6 text-white/85 text-[11px] font-black tracking-[0.2em] whitespace-nowrap"
            >
              {item}
              <span className="w-1 h-1 rounded-full bg-blue-300/50" />
            </span>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          ANTES / DESPUÉS
      ═══════════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-32 bg-[#040E1F] overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-xl mx-auto mb-14 lp-reveal">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-600/25 bg-blue-600/[0.08] text-blue-300 text-xs font-bold tracking-widest uppercase mb-5">
              La diferencia
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white">El antes y el después</h2>
            <p className="text-slate-500 mt-4 leading-relaxed">Así se ve la diferencia entre operar sin herramientas y operar con Acrosoft.</p>
          </div>

          <div className="max-w-4xl mx-auto rounded-3xl overflow-hidden border border-white/8 lp-reveal lp-d1">
            <div className="grid md:grid-cols-2">
              {/* ANTES */}
              <div className="p-8 md:p-10" style={{ background: "rgba(255,255,255,0.02)" }}>
                <div className="flex items-center gap-2.5 mb-7">
                  <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center">
                    <X size={11} className="text-slate-400" />
                  </div>
                  <span className="text-slate-400 font-bold text-sm">Sin presencia digital</span>
                </div>
                <ul className="space-y-4">
                  {[
                    "Clientes llaman y nadie contesta",
                    "Reservas por WhatsApp sin orden",
                    "Sin perfil en Google en inglés",
                    "Se pierden entre negocios americanos",
                    "Agenda en papel o en la memoria",
                    "Cancelaciones sin previo aviso",
                  ].map(item => (
                    <li key={item} className="flex items-start gap-3 text-sm text-slate-600">
                      <X size={13} className="shrink-0 mt-0.5 text-slate-700" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* DESPUÉS */}
              <div
                className="p-8 md:p-10 border-t md:border-t-0 md:border-l border-blue-600/15"
                style={{ background: "rgba(29, 78, 216, 0.07)" }}
              >
                <div className="flex items-center gap-2.5 mb-7">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #1877F2, #0a57d0)" }}
                  >
                    <Check size={11} className="text-white" />
                  </div>
                  <span className="text-blue-300 font-bold text-sm">Con Acrosoft</span>
                </div>
                <ul className="space-y-4">
                  {[
                    "Agenda online 24/7 desde tu sitio web",
                    "Sistema de citas con historial completo",
                    "Aparece en Google en inglés y español",
                    "Sitio profesional que inspira confianza",
                    "CRM con tu agenda completa en la nube",
                    "Recordatorios automáticos a tus clientes",
                  ].map(item => (
                    <li key={item} className="flex items-start gap-3 text-sm text-white/75">
                      <Check size={13} className="shrink-0 mt-0.5 text-blue-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          TESTIMONIOS
      ═══════════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-32 bg-slate-50 border-y border-slate-200/60">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-xl mx-auto mb-14 lp-reveal">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold tracking-widest uppercase mb-5">
              Testimonios
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900">Lo que dicen nuestros clientes</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={t.name}
                className={`lp-reveal lp-d${i + 1} bg-white rounded-2xl p-7 border border-slate-200 hover:border-blue-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-0.5">
                    {Array(t.stars).fill(0).map((_, j) => (
                      <Star key={j} size={14} className="fill-blue-500 text-blue-500" />
                    ))}
                  </div>
                  <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {t.result}
                  </span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed mb-6 flex-1">"{t.quote}"</p>
                <div className="flex items-center gap-3 pt-5 border-t border-slate-100">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0"
                    style={{ background: "linear-gradient(135deg, #1877F2, #0a57d0)" }}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{t.name}</p>
                    <p className="text-xs text-slate-400">{t.business}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          INDUSTRIAS
      ═══════════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-32 bg-white border-y border-slate-100">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-xl mx-auto mb-14 lp-reveal">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold tracking-widest uppercase mb-5">
              Para tu industria
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900">Hecho para tu tipo de negocio</h2>
            <p className="text-slate-500 mt-4 leading-relaxed">Cada industria tiene necesidades distintas. Nosotros ya las conocemos.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {INDUSTRIES.map((ind, i) => {
              const Icon = ind.icon;
              return (
                <div
                  key={ind.name}
                  className={`lp-reveal lp-d${(i % 3) + 1} group rounded-2xl p-6 border border-slate-200 hover:border-blue-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-white`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center"
                      style={{
                        background: "linear-gradient(135deg, rgb(24 119 242/0.1), rgb(10 87 208/0.06))",
                        border: "1px solid rgb(24 119 242/0.15)",
                      }}
                    >
                      <Icon size={20} className="text-blue-600" />
                    </div>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">
                      {ind.tag}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1.5">{ind.name}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{ind.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          CÓMO FUNCIONA
      ═══════════════════════════════════════════════════════════ */}
      <section id="como-funciona" className="py-24 md:py-32 bg-slate-50 border-b border-slate-200/60">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-xl mx-auto mb-16 lp-reveal">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold tracking-widest uppercase mb-5">
              {T.steps.badge}
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900">{T.steps.h2}</h2>
            <p className="text-slate-500 mt-4 leading-relaxed">{T.steps.p}</p>
          </div>

          <div className="relative max-w-4xl mx-auto">
            <div className="hidden md:block absolute top-9 left-[calc(16.66%+36px)] right-[calc(16.66%+36px)] h-px"
              style={{ background: "linear-gradient(90deg, rgb(24 119 242/0.2), rgb(24 119 242/0.5), rgb(24 119 242/0.2))" }}
            />
            <div className="grid md:grid-cols-3 gap-10">
              {steps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className={`lp-reveal lp-d${i + 1} text-center`}>
                    <div className="relative inline-flex mb-6">
                      <div
                        className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg, #1877F2, #0a57d0)" }}
                      >
                        <Icon size={28} className="text-white" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-50 border-2 border-blue-600 flex items-center justify-center text-[10px] font-black text-blue-600">
                        {i + 1}
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          POR QUÉ ACROSOFT — Dark navy blue
      ═══════════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-32 bg-[#040E1F] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-800/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="container mx-auto px-4 relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center max-w-5xl mx-auto">

            <div className="lp-reveal">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-600/25 bg-blue-600/[0.08] text-blue-300 text-xs font-bold tracking-widest uppercase mb-6">
                Nuestra diferencia
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white leading-tight mb-5">
                {T.why.h2a}{" "}
                <span style={{ color: "#60a5fa" }}>Acrosoft?</span>
              </h2>
              <p className="text-slate-400 leading-relaxed mb-7">{T.why.p}</p>
              <div className="space-y-3 mb-8">
                {[T.why.check1, T.why.check2].map(c => (
                  <div key={c} className="flex items-center gap-3 p-4 rounded-xl border border-white/8 bg-white/[0.03]">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "linear-gradient(135deg, #1877F2, #0a57d0)" }}
                    >
                      <Check size={13} className="text-white" />
                    </div>
                    <p className="text-sm text-white/80 font-medium">{c}</p>
                  </div>
                ))}
              </div>
              <div>
                <Button
                  asChild size="lg"
                  className="rounded-2xl font-bold px-8 h-12 hover:opacity-90 transition-all border-0 text-white"
                  style={{ background: "linear-gradient(135deg, #1877F2, #0a57d0)" }}
                >
                  <a href="#agendar" className="flex items-center gap-2">
                    {T.why.cta} <ArrowRight size={15} />
                  </a>
                </Button>
                <p className="text-xs text-slate-600 mt-3 flex flex-wrap gap-x-3">
                  {["Sin contrato", "Sin tarjeta requerida", "Respuesta en 24h"].map(t => (
                    <span key={t} className="flex items-center gap-1"><Check size={10} className="text-emerald-400" />{t}</span>
                  ))}
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {T.benefits.map((b, i) => {
                const Icon = BENEFIT_ICONS[i];
                return (
                  <div
                    key={b.title}
                    className={`lp-reveal lp-d${i + 1} rounded-2xl p-6 border border-white/8 hover:border-blue-600/30 hover:-translate-y-1 transition-all duration-300`}
                    style={{ background: "rgba(255,255,255,0.03)" }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                      style={{
                        background: "linear-gradient(135deg, rgb(24 119 242/0.2), rgb(10 87 208/0.12))",
                        border: "1px solid rgb(24 119 242/0.2)",
                      }}
                    >
                      <Icon size={18} className="text-blue-400" />
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1.5">{b.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{b.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          PLANES
      ═══════════════════════════════════════════════════════════ */}
      <section id="planes" className="py-24 md:py-32 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-xl mx-auto mb-14 lp-reveal">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold tracking-widest uppercase mb-5">
              {T.plans.badge}
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900">{T.plans.h2}</h2>
            <p className="text-slate-500 mt-4 leading-relaxed">{T.plans.p}</p>
            <p className="mt-3 text-xs font-semibold text-slate-400 flex items-center justify-center gap-1.5">
              <span className="line-through text-slate-300">$3,000–$10,000</span>
              <span>con agencias americanas · Nosotros lo hacemos por una fracción</span>
            </p>
          </div>

          {/* Trust strip */}
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 mb-10 max-w-2xl mx-auto lp-reveal">
            {[
              { icon: ShieldCheck, text: "Sin contrato de permanencia" },
              { icon: Star,        text: "Precio fijo, sin sorpresas"  },
              { icon: Zap,         text: "Soporte en español incluido" },
            ].map(({ icon: Icon, text }) => (
              <span key={text} className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                <Icon size={15} className="text-blue-500 shrink-0" />{text}
              </span>
            ))}
          </div>

          {services.length === 0 ? (
            <p className="text-center text-slate-400 text-sm">Cargando planes…</p>
          ) : (
            <div className={`grid gap-6 max-w-5xl mx-auto ${
              services.length === 1 ? "max-w-sm" :
              services.length === 2 ? "md:grid-cols-2 max-w-2xl" :
              "md:grid-cols-3"
            }`}>
              {services.map((svc, idx) => {
                const popular    = svc.is_recommended ?? false;
                const features   = (svc.benefits ?? []) as string[];
                const discounted = svc.discount_pct > 0
                  ? svc.price * (1 - svc.discount_pct / 100)
                  : svc.price;

                return (
                  <div
                    key={svc.id}
                    className={`lp-reveal lp-d${idx + 1} relative flex flex-col rounded-3xl border-2 overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
                      popular
                        ? "border-amber-500 shadow-lg"
                        : "border-slate-200 hover:border-blue-300 hover:shadow-lg"
                    }`}
                  >
                    <div
                      className="h-1.5"
                      style={{ background: popular ? "linear-gradient(90deg, #f59e0b, #d97706)" : "#e2e8f0" }}
                    />

                    {popular && (
                      <div className="absolute top-4 right-4">
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black text-white tracking-wider"
                          style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
                        >
                          <Star size={9} className="fill-white" /> {T.plans.recommended}
                        </span>
                      </div>
                    )}

                    <div className="p-7 bg-white flex flex-col flex-1">
                      <div className="mb-7 pb-7 border-b border-slate-100 space-y-2">
                        <h3 className="text-lg font-bold text-slate-900">{svc.name}</h3>
                        <div className="flex items-baseline gap-2 flex-wrap">
                          {svc.discount_pct > 0 && (
                            <span className="text-base font-bold text-slate-300 line-through">${svc.price.toLocaleString()}</span>
                          )}
                          <span className={`text-4xl font-black ${popular ? "text-amber-700" : "text-[#1877F2]"}`}>
                            ${discounted.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                          {svc.discount_pct > 0 && (
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                              popular ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-blue-50 text-blue-600 border-blue-200"
                            }`}>
                              -{svc.discount_pct}%
                            </span>
                          )}
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            {svc.is_recurring && svc.recurring_price == null
                              ? `/ ${svc.recurring_label?.replace(/^[/\s]+/, "") ?? svc.recurring_interval ?? "mes"}`
                              : svc.is_recurring ? T.plans.setupLabel : T.plans.oneTime}
                          </span>
                        </div>
                        {svc.is_recurring && svc.recurring_price != null && (
                          <div className={`text-xs font-semibold inline-block px-3 py-1 rounded-full border ${
                            popular ? "text-amber-600 bg-amber-50 border-amber-100" : "text-blue-600 bg-blue-50 border-blue-100"
                          }`}>
                            {(svc.recurring_discount_pct ?? 0) > 0
                              ? `$${Math.round(svc.recurring_price * (1 - (svc.recurring_discount_pct ?? 0) / 100)).toLocaleString()}`
                              : `$${svc.recurring_price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                            }
                            {" "}/ {svc.recurring_label?.replace(/^[/\s]+/, "") ?? svc.recurring_interval ?? "mes"}
                          </div>
                        )}
                        {svc.description && (
                          <p className="text-sm text-slate-500 leading-relaxed pt-1">{svc.description}</p>
                        )}
                      </div>

                      <ul className="space-y-3 flex-1 mb-7">
                        {features.map(f => (
                          <li key={f} className="flex items-start gap-3 text-sm text-slate-600">
                            <div
                              className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                              style={{ background: popular ? "linear-gradient(135deg, #f59e0b, #d97706)" : "linear-gradient(135deg, #1877F2, #0a57d0)" }}
                            >
                              <Check size={10} className="text-white" />
                            </div>
                            {f}
                          </li>
                        ))}
                      </ul>

                      {svc.delivery_time && (
                        <div className="flex justify-between text-xs font-medium text-slate-400 mb-4">
                          <span>{T.plans.deliveryLabel}</span>
                          <span className="font-bold text-slate-700">{svc.delivery_time}</span>
                        </div>
                      )}

                      <button
                        onClick={() => document.getElementById("agendar")?.scrollIntoView({ behavior: "smooth" })}
                        className="w-full h-11 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                        style={popular ? {
                          background: "linear-gradient(135deg, #f59e0b, #d97706)",
                        } : {
                          background: "linear-gradient(135deg, #1877F2, #0a57d0)",
                        }}
                      >
                        <MessageCircle size={14} /> {T.plans.cta}
                      </button>
                      <p className="text-center text-[11px] text-slate-400 mt-2">Sin contrato · Precio fijo garantizado</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          FAQ
      ═══════════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-32 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-xl mx-auto mb-14 lp-reveal">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold tracking-widest uppercase mb-5">
              FAQ
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900">Preguntas frecuentes</h2>
          </div>

          <div className="max-w-2xl mx-auto space-y-3">
            {FAQS.map((faq, i) => (
              <div key={faq.q} className={`lp-reveal lp-d${Math.min(i + 1, 5)}`}>
                <div
                  className={`rounded-2xl border overflow-hidden transition-all duration-300 bg-white ${
                    openFaq === i ? "border-blue-200 shadow-md shadow-blue-700/[0.08]" : "border-slate-200 hover:border-blue-200"
                  }`}
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left cursor-pointer"
                  >
                    <span className="text-sm font-semibold text-slate-900">{faq.q}</span>
                    <ChevronDown
                      size={16}
                      className={`shrink-0 text-blue-500 transition-transform duration-300 ${openFaq === i ? "rotate-180" : ""}`}
                    />
                  </button>
                  {openFaq === i && (
                    <div className="px-6 pb-5">
                      <p className="text-sm text-slate-500 leading-relaxed">{faq.a}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          GARANTÍA
      ═══════════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-24 bg-white border-y border-slate-100">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-xl mx-auto mb-12 lp-reveal">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold tracking-widest uppercase mb-5">
              Garantía
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900">Sin riesgo. Sin letra pequeña.</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
            {GUARANTEE.map((g, i) => {
              const Icon = g.icon;
              return (
                <div
                  key={g.title}
                  className={`lp-reveal lp-d${i + 1} text-center p-6 rounded-2xl border border-slate-200 hover:border-blue-200 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300`}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                    style={{
                      background: "linear-gradient(135deg, rgb(24 119 242/0.1), rgb(10 87 208/0.06))",
                      border: "1px solid rgb(24 119 242/0.15)",
                    }}
                  >
                    <Icon size={20} className="text-blue-600" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">{g.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{g.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          CTA FINAL — Deep navy blue
      ═══════════════════════════════════════════════════════════ */}
      <section className="relative py-28 md:py-44 overflow-hidden bg-[#040E1F]">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(rgb(24 119 242/0.5) 1px,transparent 1px),linear-gradient(90deg,rgb(24 119 242/0.5) 1px,transparent 1px)",
            backgroundSize: "52px 52px",
          }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-blue-800/[0.15] rounded-full blur-[160px] pointer-events-none" />

        <div className="container mx-auto px-4 text-center relative lp-reveal">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full border border-blue-600/25 bg-blue-600/[0.08]">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span className="text-blue-300 text-xs font-bold tracking-widest uppercase">
                Agenda gratuita · Sin compromiso
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight">
              {T.cta.h2}
            </h2>
            <p className="text-lg text-slate-400 leading-relaxed max-w-xl mx-auto">
              {T.cta.p}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
              <Button
                asChild size="lg"
                className="h-14 px-10 rounded-2xl font-bold text-sm border-0 hover:opacity-90 transition-all text-white group"
                style={{ background: "#1877F2" }}
              >
                <a href="#agendar" className="flex items-center gap-2.5">
                  <CalendarDays size={18} />
                  {T.cta.btn}
                  <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                </a>
              </Button>
            </div>
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 pt-1">
              {["Sin tarjeta de crédito", "Sin contrato", "Respuesta en 24h", "Soporte en español"].map(t => (
                <span key={t} className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Check size={11} className="text-emerald-400" />{t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {/* ── Floating WhatsApp button ─────────────────────────────── */}
      {WA_NUMBER && (
        <a
          href={`https://wa.me/${WA_NUMBER}?text=${WA_MSG}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contactar por WhatsApp"
          className="fixed bottom-24 right-5 sm:bottom-8 sm:right-6 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
          style={{ background: "#25D366" }}
        >
          <svg viewBox="0 0 24 24" fill="white" width="26" height="26">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </a>
      )}

      {/* ── Mobile sticky bottom CTA ─────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-[#040E1F]/95 backdrop-blur-sm border-t border-white/10 p-3 pb-safe">
        <a
          href="#agendar"
          className="flex items-center justify-center gap-2 h-12 rounded-xl font-bold text-sm text-white w-full hover:opacity-90 transition-opacity"
          style={{ background: "linear-gradient(135deg, #1877F2, #0a57d0)" }}
        >
          <CalendarDays size={16} /> Agendar Llamada Gratuita
        </a>
      </div>
    </div>
  );
};

export default LandingContent;
