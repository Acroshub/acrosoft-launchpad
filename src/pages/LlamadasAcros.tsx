import { useEffect } from "react";
import { Play, Check, X, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CalendarRenderer from "@/components/crm/CalendarRenderer";

// ─── Palette — misma identidad de Acros Software (máx. 3 colores) ────────────
// Ink #14161F · Paper #FFFFFF · Accent guindo #8C1414

const ADMIN_CALENDAR_ID = "24dab059-b724-4a13-b900-c2d73fc4438f";

const PARA_TI = [
  "Eres dueño de una empresa de control de plagas que opera en Florida.",
  "Tu negocio factura al menos $300,000 al año.",
  "Estás dispuesto a invertir al menos $1,500/mes en anuncios.",
  "Quieres delegar tus anuncios en vez de manejarlos tú mismo.",
];

const NO_ES_PARA_TI = [
  "Negocios que recién arrancan y todavía no pueden invertir en anuncios.",
  "Dueños que quieren manejar ellos mismos las campañas.",
  "Quien busca el proveedor más barato, sin compromiso de resultados.",
];

const CASOS = [
  {
    tag: "Tree Service · Florida",
    quote: "Hoy reciben entre 15 y 20 estimados nuevos cada semana, algo que antes dependía solo del boca a boca.",
    name: "Hermanos Álvarez",
  },
  {
    tag: "Limpieza · Florida",
    quote: "Pasaron de 2 a 10 estimados por semana, con un +43% de facturación en el mes.",
    name: "Cliente de limpieza residencial",
  },
  {
    tag: "Servicio Eléctrico · Florida",
    quote: "Su facturación mensual creció un 37% al ordenar el flujo de anuncios.",
    name: "Cliente de servicio eléctrico",
  },
];

const LlamadasAcros = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("lp-visible");
            obs.unobserve(e.target);
          }
        }),
      { threshold: 0.08 },
    );
    document.querySelectorAll(".lp-reveal:not(.lp-visible)").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="min-h-screen font-opensans bg-white text-[#14161F]">
      <style>{`
        .lp-reveal            { opacity: 0; transform: translateY(16px); transition: opacity 0.5s ease-out, transform 0.5s ease-out; }
        .lp-reveal.lp-visible { opacity: 1; transform: translateY(0); }
      `}</style>

      {/* ═══════════════════════════════════════════════════════════
          HERO + VIDEO + GARANTÍA + AGENDA — todo en una sola sección
      ═══════════════════════════════════════════════════════════ */}
      <section id="agenda" className="pt-14 pb-6 md:pt-20 md:pb-8 scroll-mt-8">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <p className="text-sm md:text-base font-bold text-[#8C1414] mb-5 leading-snug">
            Solo para latinos dueños de empresas de control de plagas en Florida que facturan al menos $300,000 al año.
          </p>
          <p className="text-xs md:text-sm font-semibold text-[#14161F]/45 mb-3">
            Un video de X minutos te muestra...
          </p>
          <h1 className="font-poppins text-xl md:text-2xl font-bold leading-[1.3] mb-6">
            Cómo conseguir <span className="text-[#8C1414]">un flujo constante de estimados cada semana</span> — sin
            depender solo del boca a boca y sin lidiar con agencias de marketing que solo te cobran pero no te ayudan.
          </h1>
          <p className="text-xs md:text-sm font-semibold text-[#14161F]/45 mb-8">
            Funciona aún si eres un hombre muy ocupado.
          </p>
        </div>

        <div className="container mx-auto px-4 max-w-3xl space-y-5">
          <div className="rounded-2xl border border-[#14161F]/12 overflow-hidden">
            <div className="bg-[#14161F] text-white text-center text-xs md:text-sm font-semibold py-2.5 px-4">
              🔊 Activa el audio para ver el video completo.
            </div>
            <div className="relative w-full aspect-video bg-[#14161F]/[0.03] flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-full bg-[#8C1414] flex items-center justify-center">
                <Play size={26} className="text-white ml-1" fill="white" />
              </div>
              <p className="text-sm font-semibold text-[#14161F]/50">Video: aquí va el Método Estimados Sin Pausa</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl border border-[#8C1414]/25 bg-[#8C1414]/[0.05] px-5 py-3.5">
            <ShieldCheck size={20} className="shrink-0 text-[#8C1414]" />
            <p className="text-xs md:text-sm text-[#14161F]/75 leading-snug text-left">
              <span className="font-bold text-[#14161F]">Garantía de arranque:</span> Si tu campaña y tu landing no
              quedan activas en los primeros 7 días hábiles, trabajaré para ti 1 mes <span className="font-bold">GRATIS</span>.
            </p>
          </div>

          <div className="rounded-2xl bg-[#14161F] px-6 py-6 md:px-10 md:py-8 text-center lp-reveal">
            <h2 className="font-poppins text-xl md:text-2xl font-bold text-white leading-snug">
              <span className="underline decoration-2 underline-offset-4">Último Paso:</span> Agenda tu Consultoría en
              una llamada Gratis
            </h2>
          </div>
          <p className="text-center text-sm md:text-base italic text-[#14161F]/60 max-w-lg mx-auto leading-relaxed">
            20-30 minutos para conocer tu negocio y ver si mi “Método Estimados Sin Pausa” tiene sentido para ti.
          </p>
          <div className="rounded-2xl border border-[#14161F]/10 bg-white p-5 md:p-8 shadow-sm lp-reveal">
            <CalendarRenderer
              calendarId={ADMIN_CALENDAR_ID}
              lang="es"
              primaryColorOverride="#8C1414"
              onBookingSuccess={(booking) => navigate("/llamadas-acros-gracias", { state: booking })}
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          POLARIZACIÓN — para quién es y para quién no
      ═══════════════════════════════════════════════════════════ */}
      <section className="pt-8 pb-16 md:pt-10 md:pb-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <p className="text-center text-sm text-[#14161F]/55 max-w-xl mx-auto mb-10 leading-relaxed lp-reveal">
            Ya sea que hayas probado anuncios antes sin buenos resultados, o nunca hayas invertido en marketing —
            esto es para ti si:
          </p>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-[#8C1414]/25 bg-[#8C1414]/[0.04] p-6 lp-reveal">
              <p className="font-poppins font-bold text-sm mb-4">Es para ti si:</p>
              <ul className="space-y-3">
                {PARA_TI.map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-sm text-[#14161F]/75">
                    <Check size={14} className="shrink-0 mt-0.5 text-[#8C1414]" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-[#14161F]/10 p-6 lp-reveal">
              <p className="font-poppins font-bold text-sm mb-4">No es para ti si:</p>
              <ul className="space-y-3">
                {NO_ES_PARA_TI.map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-sm text-[#14161F]/55">
                    <X size={14} className="shrink-0 mt-0.5 text-[#14161F]/35" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          RESULTADOS REALES — dark section, transferencia honesta desde rubros hermanos
      ═══════════════════════════════════════════════════════════ */}
      <section className="py-16 md:py-24 bg-black text-white">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center max-w-xl mx-auto mb-12 lp-reveal">
            <h2 className="font-poppins text-2xl md:text-3xl font-bold mb-3">Ya ayudé a negocios como el tuyo en Florida</h2>
            <p className="text-sm text-white/55 leading-relaxed">
              Logré traer estimados todos los días para negocios de Tree Service, Limpieza y Servicio Eléctrico —
              y ahora quiero aplicar este mismo método a negocios de Control de Plagas. Sé parte de mis primeros
              casos de éxito, antes de que otro negocio se te adelante.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {CASOS.map((c) => (
              <div key={c.name} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 lp-reveal">
                <p className="text-[11px] font-bold tracking-wider uppercase text-[#FF6259] mb-3">{c.tag}</p>
                <p className="text-sm text-white/70 leading-relaxed mb-4">{c.quote}</p>
                <p className="text-xs font-semibold text-white/45">{c.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default LlamadasAcros;
