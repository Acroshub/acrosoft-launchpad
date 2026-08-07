import { useState, useEffect } from "react";
import { Check, ArrowRight, ChevronDown, MessageCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// ─── Palette — max 3 brand colors (+ tints/shades of each) ───────────────────
// Ink    #14161F  — text, dark sections
// Paper  #FFFFFF  — background
// Accent #0F766E  — CTAs, highlights, numerals

const WA_NUMBER = "59176421171";
const WA_MSG    = "Hola! Vi la página de Acros Software y me gustaría más información sobre sus servicios.";
const waLink    = (msg: string) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;

// Servicios Profesionales es la categoría — estas son sus 4 líneas de trabajo.
const SERVICE_LINES = [
  {
    n: "01",
    title: "Consultoría",
    desc: "Análisis y estrategia para tomar mejores decisiones de negocio.",
    items: [
      "Diagnóstico y plan estratégico",
      "Optimización de modelos de negocio",
      "Análisis financiero y operativo",
      "Acompañamiento en toma de decisiones",
    ],
  },
  {
    n: "02",
    title: "Marketing Digital",
    desc: "Estrategias digitales para atraer, convertir y fidelizar clientes.",
    items: [
      "Gestión de redes sociales",
      "Publicidad digital (Meta, Google Ads)",
      "SEO y posicionamiento web",
      "Contenido y branding digital",
    ],
  },
  {
    n: "03",
    title: "Desarrollo de Software",
    desc: "Software a la medida que resuelve problemas reales de tu negocio.",
    items: [
      "Sitios web y aplicaciones a medida",
      "Sistemas CRM y automatización",
      "Integraciones y APIs",
      "Mantenimiento y soporte técnico",
    ],
  },
  {
    n: "04",
    title: "Educación — Cursos y Talleres",
    desc: "Formación práctica para equipos y emprendedores que quieren crecer.",
    items: [
      "Cursos online a tu ritmo",
      "Talleres prácticos en vivo",
      "Contenido actualizado y aplicable",
      "Certificación de finalización",
    ],
  },
];

const WHY_US = [
  { n: "01", title: "Equipo multidisciplinario",       desc: "Un solo partner para todas las áreas de tu negocio, sin coordinar múltiples proveedores." },
  { n: "02", title: "Comunicación clara, en español",   desc: "Sin tecnicismos innecesarios ni barreras de idioma." },
  { n: "03", title: "Soluciones a la medida",           desc: "Nada de plantillas genéricas — diseñamos para tu negocio específico." },
  { n: "04", title: "Acompañamiento continuo",          desc: "Seguimos presentes después de la entrega, no solo durante el proyecto." },
];

const PROCESS = [
  { n: "01", title: "Diagnóstico",           desc: "Entendemos tu negocio, tus objetivos y tus retos actuales." },
  { n: "02", title: "Propuesta a medida",    desc: "Diseñamos un plan claro con alcance, tiempos y precio definido." },
  { n: "03", title: "Ejecución",             desc: "Nuestro equipo implementa la solución con seguimiento constante." },
  { n: "04", title: "Seguimiento y soporte", desc: "Acompañamos los resultados y ajustamos lo que haga falta." },
];

const FAQS = [
  {
    q: "¿Qué tipo de negocios atienden?",
    a: "Trabajamos con emprendedores, pequeñas y medianas empresas que buscan profesionalizar su operación, su presencia digital o su tecnología.",
  },
  {
    q: "¿Puedo contratar solo una línea de trabajo o necesito varias?",
    a: "Puedes contratar la línea que necesites de forma independiente, o combinarlas según la etapa de tu negocio.",
  },
  {
    q: "¿Cómo empieza el proceso de trabajo?",
    a: "Todo comienza con una conversación inicial sin costo para entender tu negocio y definir el alcance del proyecto.",
  },
  {
    q: "¿Los cursos y talleres son en vivo o grabados?",
    a: "Ofrecemos ambas modalidades según el curso: contenido grabado a tu ritmo y talleres en vivo con interacción directa.",
  },
  {
    q: "¿Ofrecen soporte después de la entrega?",
    a: "Sí. El acompañamiento post-entrega es parte de nuestra forma de trabajar, no un extra.",
  },
];

const MARQUEE = [
  "CONSULTORÍA", "MARKETING DIGITAL", "DESARROLLO DE SOFTWARE", "EDUCACIÓN · CURSOS Y TALLERES",
  "CONSULTORÍA", "MARKETING DIGITAL", "DESARROLLO DE SOFTWARE", "EDUCACIÓN · CURSOS Y TALLERES",
];

const Eyebrow = ({ children }: { children: string }) => (
  <p className="text-xs font-bold tracking-[0.2em] uppercase font-opensans mb-4 text-[#0F766E]">
    — {children}
  </p>
);

const AcrosSoftwareLanding = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add("lp-visible"); obs.unobserve(e.target); }
      }),
      { threshold: 0.08 },
    );
    document.querySelectorAll(".lp-reveal:not(.lp-visible)").forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="min-h-screen font-opensans selection:bg-teal-700/20 pb-16 sm:pb-0 bg-white text-[#14161F]">

      {/* ── Animations ──────────────────────────────────────────────────── */}
      <style>{`
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .marquee-track { display: flex; width: max-content; animation: marquee 30s linear infinite; }
        .lp-reveal            { opacity: 0; transform: translateY(20px); transition: opacity 0.55s ease-out, transform 0.55s ease-out; }
        .lp-reveal.lp-visible { opacity: 1; transform: translateY(0); }
        .lp-d1 { transition-delay: 0.08s; }
        .lp-d2 { transition-delay: 0.16s; }
        .lp-d3 { transition-delay: 0.24s; }
        .lp-d4 { transition-delay: 0.32s; }
      `}</style>

      <Navbar />

      {/* ═══════════════════════════════════════════════════════════
          HERO
      ═══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-[1fr_460px] gap-14 items-center">

            {/* Left copy */}
            <div className="space-y-8">
              <h1 className="font-poppins text-4xl md:text-5xl lg:text-[56px] font-bold tracking-tight leading-[1.12]">
                <span className="text-[#0F766E]">Servicios Profesionales</span> que hacen crecer tu negocio.
              </h1>

              <p className="text-base md:text-lg max-w-lg leading-relaxed text-[#14161F]/65">
                Servicios Profesionales es nuestra práctica integral, con cuatro líneas de trabajo:
                Consultoría, Marketing Digital, Desarrollo de Software y Educación — para que no tengas
                que coordinar proveedores distintos para cada necesidad de tu negocio.
              </p>

              <div className="flex flex-wrap gap-3 pt-1">
                <a
                  href={waLink(WA_MSG)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-12 px-7 rounded-xl font-bold font-opensans text-sm text-white flex items-center gap-2 hover:opacity-90 transition-opacity bg-[#0F766E]"
                >
                  <MessageCircle size={16} /> Hablemos por WhatsApp
                </a>
                <a
                  href="#servicios"
                  className="h-12 px-7 rounded-xl font-semibold font-opensans text-sm flex items-center gap-2 border border-[#14161F]/15 text-[#14161F] transition-colors hover:bg-[#14161F]/[0.04]"
                >
                  Ver nuestras líneas de trabajo <ArrowRight size={15} />
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pt-1">
                {["Sin contrato de permanencia", "Precio claro desde el inicio", "Respuesta en 24h"].map(t => (
                  <span key={t} className="flex items-center gap-1.5 text-xs font-medium text-[#14161F]/50">
                    <Check size={12} className="shrink-0 text-[#0F766E]" />{t}
                  </span>
                ))}
              </div>
            </div>

            {/* Right — Service lines directory */}
            <div className="rounded-2xl border border-[#14161F]/12">
              <div className="px-7 py-6 border-b border-[#14161F]/10">
                <p className="text-xs font-bold tracking-[0.15em] uppercase font-opensans text-[#0F766E]">Servicios Profesionales</p>
                <p className="font-poppins text-lg font-bold mt-1">Nuestras líneas de trabajo</p>
              </div>
              <div>
                {SERVICE_LINES.map(s => (
                  <a
                    key={s.title}
                    href="#servicios"
                    className="flex items-center gap-4 px-7 py-4 border-b border-[#14161F]/8 last:border-b-0 group hover:bg-[#0F766E]/[0.03] transition-colors"
                  >
                    <span className="font-poppins text-xl font-bold text-[#14161F]/20">{s.n}</span>
                    <span className="text-sm font-semibold font-opensans flex-1 group-hover:text-[#0F766E] transition-colors">{s.title}</span>
                    <ArrowRight size={14} className="text-[#14161F]/25 group-hover:text-[#0F766E] group-hover:translate-x-0.5 transition-all" />
                  </a>
                ))}
              </div>
              <div className="p-5">
                <a
                  href={waLink(WA_MSG)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-11 rounded-xl text-sm font-bold font-opensans text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity bg-[#0F766E]"
                >
                  <MessageCircle size={15} /> Cuéntanos tu proyecto
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          MARQUEE
      ═══════════════════════════════════════════════════════════ */}
      <div className="overflow-hidden py-3 bg-[#14161F]">
        <div className="marquee-track">
          {MARQUEE.map((item, i) => (
            <span key={i} className="inline-flex items-center gap-3 px-6 text-[11px] font-bold font-opensans tracking-[0.2em] whitespace-nowrap text-white/80">
              {item}
              <span className="w-1 h-1 rounded-full bg-[#0F766E]" />
            </span>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SERVICIOS
      ═══════════════════════════════════════════════════════════ */}
      <section id="servicios" className="py-24 md:py-32 scroll-mt-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-xl mx-auto mb-14 lp-reveal">
            <Eyebrow>Qué hacemos</Eyebrow>
            <h2 className="font-poppins text-4xl md:text-5xl font-bold">Servicios Profesionales</h2>
            <p className="mt-4 leading-relaxed text-[#14161F]/60">Cuatro líneas de trabajo, un mismo estándar de calidad. Elige la que tu negocio necesita hoy.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {SERVICE_LINES.map((svc, i) => (
              <div
                key={svc.title}
                className={`lp-reveal lp-d${i + 1} flex flex-col rounded-2xl p-7 border border-[#14161F]/10 hover:border-[#0F766E]/30 hover:-translate-y-1 transition-all duration-300`}
              >
                <p className="font-poppins text-4xl font-bold text-[#0F766E]/25 mb-4">{svc.n}</p>
                <h3 className="font-poppins text-lg font-bold mb-2">{svc.title}</h3>
                <p className="text-sm leading-relaxed mb-5 text-[#14161F]/60">{svc.desc}</p>
                <ul className="space-y-2.5 mb-6 flex-1">
                  {svc.items.map(item => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-[#14161F]/75">
                      <Check size={13} className="shrink-0 mt-0.5 text-[#0F766E]" />
                      {item}
                    </li>
                  ))}
                </ul>
                <a
                  href={waLink(`Hola! Me interesa la línea de ${svc.title}. Quisiera más información.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-bold font-opensans hover:gap-2.5 transition-all duration-200 text-[#0F766E]"
                >
                  Más información <ArrowRight size={13} />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Inter-section CTA ─────────────────────────────────── */}
      <div className="border-y border-[#14161F]/8 bg-[#0F766E]/[0.04] py-10 md:py-12">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-5">
          <p className="font-poppins font-bold text-lg md:text-xl text-center sm:text-left">¿No sabes por dónde empezar? Cuéntanos tu situación.</p>
          <a
            href={waLink(WA_MSG)}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-2.5 h-14 px-10 rounded-xl font-bold font-opensans text-base text-white hover:opacity-90 transition-opacity bg-[#0F766E]"
          >
            <MessageCircle size={17} /> Escríbenos ahora →
          </a>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          POR QUÉ ACROS SOFTWARE — dark section
      ═══════════════════════════════════════════════════════════ */}
      <section id="nosotros" className="py-24 md:py-32 scroll-mt-20 bg-[#14161F] text-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-xl mx-auto mb-14 lp-reveal">
            <Eyebrow>Nuestra diferencia</Eyebrow>
            <h2 className="font-poppins text-4xl md:text-5xl font-bold">Lo que nos hace diferentes</h2>
            <p className="mt-4 leading-relaxed text-white/55">Trabajamos como una extensión de tu equipo, no como un proveedor más.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
            {WHY_US.map((w, i) => (
              <div
                key={w.title}
                className={`lp-reveal lp-d${i + 1} rounded-2xl p-6 border border-white/10 bg-white/[0.03] hover:-translate-y-1 transition-all duration-300`}
              >
                <p className="font-poppins text-3xl font-bold text-[#0F766E]/50 mb-3">{w.n}</p>
                <h3 className="font-poppins text-sm font-bold mb-1.5">{w.title}</h3>
                <p className="text-xs leading-relaxed text-white/50">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          CÓMO TRABAJAMOS
      ═══════════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-32 border-b border-[#14161F]/8">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-xl mx-auto mb-16 lp-reveal">
            <Eyebrow>Cómo trabajamos</Eyebrow>
            <h2 className="font-poppins text-4xl md:text-5xl font-bold">De la idea a los resultados</h2>
            <p className="mt-4 leading-relaxed text-[#14161F]/60">Un proceso simple y transparente en cada proyecto.</p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-10 max-w-5xl mx-auto">
            {PROCESS.map((step, i) => (
              <div key={step.title} className={`lp-reveal lp-d${i + 1}`}>
                <p className="font-poppins text-5xl font-bold text-[#0F766E]/25 mb-3">{step.n}</p>
                <h3 className="font-poppins text-lg font-bold mb-2">{step.title}</h3>
                <p className="text-sm leading-relaxed text-[#14161F]/60">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          FAQ
      ═══════════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-32 bg-[#0F766E]/[0.03]">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-xl mx-auto mb-14 lp-reveal">
            <Eyebrow>Preguntas frecuentes</Eyebrow>
            <h2 className="font-poppins text-4xl md:text-5xl font-bold">Preguntas frecuentes</h2>
          </div>

          <div className="max-w-2xl mx-auto space-y-3">
            {FAQS.map((faq, i) => (
              <div key={faq.q} className={`lp-reveal lp-d${Math.min(i + 1, 4)}`}>
                <div
                  className={`rounded-2xl border bg-white overflow-hidden transition-all duration-300 ${openFaq === i ? "border-[#0F766E]" : "border-[#14161F]/10"}`}
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left cursor-pointer"
                  >
                    <span className="text-sm font-semibold font-opensans">{faq.q}</span>
                    <ChevronDown
                      size={16}
                      className={`shrink-0 text-[#0F766E] transition-transform duration-300 ${openFaq === i ? "rotate-180" : ""}`}
                    />
                  </button>
                  {openFaq === i && (
                    <div className="px-6 pb-5">
                      <p className="text-sm leading-relaxed text-[#14161F]/60">{faq.a}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          CONTACTO — CTA final, dark section
      ═══════════════════════════════════════════════════════════ */}
      <section id="contacto" className="relative py-28 md:py-40 overflow-hidden scroll-mt-20 bg-[#14161F] text-white">
        <div className="container mx-auto px-4 text-center relative lp-reveal">
          <div className="max-w-2xl mx-auto space-y-8">
            <Eyebrow>Conversemos sobre tu proyecto</Eyebrow>
            <h2 className="font-poppins text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              ¿Listo para dar el siguiente paso?
            </h2>
            <p className="text-lg leading-relaxed max-w-xl mx-auto text-white/55">
              Cuéntanos qué necesita tu negocio y te respondemos con una propuesta clara, sin compromiso.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
              <a
                href={waLink(WA_MSG)}
                target="_blank"
                rel="noopener noreferrer"
                className="h-14 px-10 rounded-xl font-bold font-opensans text-sm text-white flex items-center justify-center gap-2.5 hover:opacity-90 transition-opacity group bg-[#0F766E]"
              >
                <MessageCircle size={18} />
                Escríbenos por WhatsApp
                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 pt-1">
              {["Sin compromiso", "Respuesta en 24h", "Soporte en español"].map(t => (
                <span key={t} className="flex items-center gap-1.5 text-xs font-medium text-white/45">
                  <Check size={11} className="text-[#0F766E]" />{t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {/* ── Floating WhatsApp button ─────────────────────────────── */}
      <a
        href={waLink(WA_MSG)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contactar por WhatsApp"
        className="fixed bottom-24 right-5 sm:bottom-8 sm:right-6 z-50 w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform bg-[#0F766E]"
      >
        <MessageCircle size={24} className="text-white" />
      </a>

      {/* ── Mobile sticky bottom CTA ─────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden backdrop-blur-sm border-t border-white/10 p-3 pb-safe bg-[#14161F]/97">
        <a
          href={waLink(WA_MSG)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 h-12 rounded-xl font-bold font-opensans text-sm w-full text-white hover:opacity-90 transition-opacity bg-[#0F766E]"
        >
          <MessageCircle size={16} /> Escríbenos por WhatsApp
        </a>
      </div>
    </div>
  );
};

export default AcrosSoftwareLanding;
