import { Phone, Star, MapPin, Check, ArrowRight, Snowflake, Flame, Wind, Wrench, ShieldCheck, Clock } from "lucide-react";

// Ejemplos de diseño de website para HVAC. Solo sirven para sacar las capturas de la landing /website-hvac (public/website-hvac/*.jpg):
// son DISEÑOS DE MUESTRA, no clientes reales. Los tres están basados en layouts del portafolio (/websites): Martinez Cleaning (claro, foto a
// la derecha), El Sol Roofing (oscuro, foto a pantalla completa) y Gonzalez Landscaping (verde, foto grande + tarjeta flotante).
// Las fotos son imágenes generadas con IA (public/website-hvac/src). Para volver a sacar las capturas: abrir /websites/hvac-ejemplo-1|2|3
// y correr scripts/capture-hvac-examples.mjs.

const IMG = "/website-hvac/src";

// ───────────────────────── Ejemplo 1: claro, azul cielo y marino (basado en Martinez Cleaning) ─────────────────────────
export function HvacExample1() {
  const NAVY = "#0A2540";
  return (
    <div className="bg-white text-slate-900 overflow-x-hidden" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <nav className="bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-[68px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: NAVY }}><Snowflake size={19} className="text-sky-300" /></div>
            <div className="leading-none">
              <div className="font-black text-[17px] tracking-tight" style={{ color: NAVY }}>POLAR PRO</div>
              <div className="text-[9px] font-semibold tracking-[3px] text-slate-400 mt-1">HEATING &amp; AIR</div>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-500">
            <span>Services</span><span>Why Us</span><span>Coverage</span><span>Contact</span>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-sky-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm"><Phone size={13} /> (713) 555-0142</div>
        </div>
      </nav>

      <section>
        <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-8 lg:pt-16">
          <div className="grid lg:grid-cols-[1fr_470px] gap-10 xl:gap-16 items-center">
            <div className="pb-6 lg:pb-16">
              <div className="inline-flex items-center gap-2 bg-sky-50 border border-sky-100 rounded-full px-4 py-1.5 mb-6">
                <MapPin size={12} className="text-sky-500" /><span className="text-sky-600 text-xs font-semibold">Houston, Texas</span>
              </div>
              <h1 className="text-[2.7rem] sm:text-[3.4rem] lg:text-[4.1rem] font-black leading-[1.0] tracking-[-0.025em] mb-5">
                Cool comfort,<br /><span className="text-sky-500">all year</span><br />long.
              </h1>
              <p className="text-slate-500 text-base lg:text-lg leading-relaxed mb-7 max-w-[430px]">
                Polar Pro Heating &amp; Air delivers fast AC repair, installation and maintenance across Houston, TX. Licensed, insured and same-day service.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mb-7">
                <div className="inline-flex flex-col items-center justify-center bg-sky-500 text-white px-8 py-3.5 rounded-xl shadow-md">
                  <span className="font-bold text-lg">Call for a Free Estimate</span>
                  <span className="text-white/75 text-sm flex items-center gap-1.5"><Phone size={12} />(713) 555-0142</span>
                </div>
                <div className="inline-flex items-center justify-center gap-2 border-2 border-slate-200 text-slate-600 px-7 py-3.5 rounded-xl font-semibold">See Services</div>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {["Licensed & Insured", "Same-Day Service", "24/7 Emergency", "Financing"].map((b) => (
                  <span key={b} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full"><Check size={11} className="text-sky-500" /> {b}</span>
                ))}
              </div>
            </div>
            <div className="relative pb-0 lg:pb-0">
              <div className="absolute -top-5 -right-5 w-44 h-44 bg-sky-50 rounded-full" />
              <div className="relative rounded-2xl overflow-hidden shadow-xl border border-slate-100 aspect-[4/4.2] lg:aspect-[4/5]">
                <img src={`${IMG}/tecnico-condensador.jpg`} alt="HVAC technician servicing an AC unit" className="w-full h-full object-cover" style={{ objectPosition: "72% 50%" }} />
                <div className="absolute top-4 left-4 bg-white rounded-xl px-4 py-2.5 shadow-lg flex items-center gap-2.5 border border-slate-100">
                  <div className="w-7 h-7 bg-sky-500 rounded-lg flex items-center justify-center"><Check size={13} className="text-white" /></div>
                  <div><div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Result</div><div className="text-sm font-bold text-slate-800">Cool &amp; Efficient</div></div>
                </div>
                <div className="absolute bottom-4 right-4 bg-sky-500 text-white rounded-xl px-4 py-2.5 shadow-lg">
                  <div className="text-[10px] font-semibold opacity-80 uppercase tracking-widest">Serving</div><div className="text-sm font-bold">Houston, TX</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-100 bg-slate-50 mt-8 lg:mt-12">
          <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-200">
            {[["15+", "Years of Experience"], ["4.9★", "Google Rating"], ["Same-Day", "Repair Service"], ["Free", "Estimates"]].map(([v, l]) => (
              <div key={l} className="bg-slate-50 py-5 px-5 sm:px-8"><div className="text-2xl font-black text-sky-500 leading-none">{v}</div><div className="text-slate-500 text-xs mt-1">{l}</div></div>
            ))}
          </div>
        </div>
      </section>

      <div className="py-3" style={{ background: NAVY }}>
        <div className="flex gap-8 whitespace-nowrap overflow-hidden text-white/60 text-[11px] font-medium tracking-[2px] uppercase px-6">
          {["AC Repair", "AC Installation", "Heating & Furnace", "Maintenance Plans", "Duct Cleaning", "Emergency 24/7", "Houston TX"].map((t) => <span key={t}>{t} ·</span>)}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Ejemplo 2: oscuro, naranja (basado en El Sol Roofing) ─────────────────────────
export function HvacExample2() {
  const ORANGE = "#EA580C", BG = "#0A0A0A", CARD = "#141414", BORDER = "#262626";
  const services = [
    { icon: Snowflake, t: "AC Repair", d: "Same-day diagnostics and fast fixes." },
    { icon: Wind, t: "AC Installation", d: "High-efficiency systems, properly sized." },
    { icon: Flame, t: "Heating & Furnace", d: "Repairs and replacements all winter." },
    { icon: Wrench, t: "Maintenance Plans", d: "Tune-ups that prevent breakdowns." },
  ];
  return (
    <div className="text-white overflow-x-hidden" style={{ background: BG, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="py-2.5 px-4 text-center text-[11px] sm:text-xs font-bold tracking-wider" style={{ background: ORANGE }}>
        AC DOWN? SAME-DAY SERVICE · 24/7 EMERGENCY — (602) 555-0178
      </div>
      <nav className="border-b" style={{ borderColor: BORDER, background: "rgba(10,10,10,0.95)" }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-[64px] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ background: ORANGE }}><Flame size={19} /></div>
            <div className="leading-none"><div className="font-black text-lg tracking-tight">CALIENTE</div><div className="text-[9px] font-bold tracking-[4px] mt-1" style={{ color: ORANGE }}>AIR &amp; HEAT</div></div>
          </div>
          <div className="hidden lg:flex gap-7 text-sm text-white/60 font-medium"><span>Home</span><span>Services</span><span>Gallery</span><span>About</span><span>Contact</span></div>
          <div className="hidden md:flex items-center gap-2 font-bold px-4 py-2.5 rounded-lg text-sm" style={{ background: ORANGE }}><Phone size={13} /> (602) 555-0178</div>
        </div>
      </nav>

      <section className="relative min-h-[600px] lg:min-h-[640px] flex items-center overflow-hidden">
        <img src={`${IMG}/horno-ductos.jpg`} alt="Technician installing a furnace" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(10,10,10,0.97) 0%, rgba(10,10,10,0.82) 55%, rgba(10,10,10,0.35) 100%)" }} />
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-14 lg:py-16 w-full">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-bold tracking-widest uppercase mb-6 border" style={{ borderColor: `${ORANGE}60`, color: "#FB923C", background: `${ORANGE}18` }}>
              <span className="w-2 h-2 rounded-full" style={{ background: "#FB923C" }} />Phoenix&apos;s Top Rated HVAC · 3,000+ Systems
            </div>
            <h1 className="text-[2.9rem] sm:text-[4rem] lg:text-[4.8rem] font-black leading-[0.92] tracking-tighter mb-5">
              PHOENIX<br /><span style={{ color: ORANGE }}>AC REPAIR</span><br />DONE FAST.
            </h1>
            <p className="text-base lg:text-lg leading-relaxed mb-7 max-w-lg text-white/60">
              Repairs, installations and tune-ups for homes across the Valley. Licensed Arizona contractor since 2008. Free estimates. Financing available.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-9">
              <div className="flex items-center justify-center gap-2 font-black px-7 py-4 rounded-xl text-base" style={{ background: ORANGE }}><Phone size={17} /> Get a Free Estimate</div>
              <div className="flex items-center justify-center gap-2 border font-bold px-7 py-4 rounded-xl text-base" style={{ borderColor: "rgba(255,255,255,0.2)" }}>View Services <ArrowRight size={17} /></div>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2.5 text-xs text-white/70">
              {["AZ ROC Licensed", "$2M Liability Insured", "NATE Certified Techs", "BBB A+ Rating"].map((b) => (
                <span key={b} className="flex items-center gap-2"><ShieldCheck size={14} style={{ color: ORANGE }} />{b}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="hidden lg:flex absolute right-12 top-1/2 -translate-y-1/2 z-10 flex-col gap-3">
          <div className="rounded-2xl p-5 border text-center" style={{ background: "rgba(20,20,20,0.92)", borderColor: BORDER }}>
            <div className="flex gap-0.5 justify-center mb-1.5">{[0, 1, 2, 3, 4].map((i) => <Star key={i} size={14} fill="#F59E0B" style={{ color: "#F59E0B" }} />)}</div>
            <div className="text-3xl font-black">4.9</div><div className="text-xs text-white/50">318 Google Reviews</div>
          </div>
          <div className="rounded-2xl p-5 border text-center" style={{ background: "rgba(124,45,18,0.45)", borderColor: ORANGE }}>
            <div className="text-2xl font-black" style={{ color: "#FB923C" }}>Same-Day</div><div className="text-xs text-white/50">AC Repair</div>
          </div>
        </div>
      </section>

      <div className="border-y py-8 px-6" style={{ background: CARD, borderColor: BORDER }}>
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[["3,000+", "Systems Serviced"], ["15 yrs", "Serving the Valley"], ["4.9★", "Google Rating"], ["Free", "Estimates Always"]].map(([v, l]) => (
            <div key={l}><div className="text-2xl font-black" style={{ color: "#FB923C" }}>{v}</div><div className="text-xs text-white/50 mt-1">{l}</div></div>
          ))}
        </div>
      </div>
      <section className="py-14 px-6">
        <div className="max-w-7xl mx-auto">
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: ORANGE }}>What We Do</span>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight mt-2 mb-8">Our Services.</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {services.map(({ icon: I, t, d }) => (
              <div key={t} className="rounded-2xl p-6 border" style={{ background: CARD, borderColor: BORDER }}>
                <I size={22} style={{ color: ORANGE }} /><div className="font-bold mt-4 mb-1.5">{t}</div><div className="text-sm text-white/50">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

// ───────────────────────── Ejemplo 3: verde y crema (basado en Gonzalez Landscaping) ─────────────────────────
export function HvacExample3() {
  const GREEN = "#14532D", LIME = "#65A30D", CREAM = "#FAF7F0";
  return (
    <div className="overflow-x-hidden" style={{ background: CREAM, color: "#1C1917", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <nav style={{ background: GREEN }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-[66px] flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-white">
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: LIME }}><Wind size={18} /></div>
            <div className="leading-none"><div className="font-black text-[17px] tracking-tight">VERDE COMFORT</div><div className="text-[9px] tracking-[3px] text-white/60 mt-1">HEATING · COOLING · AIR</div></div>
          </div>
          <div className="hidden lg:flex gap-7 text-sm text-white/70 font-medium"><span>Services</span><span>About</span><span>Reviews</span><span>Contact</span></div>
          <div className="hidden md:flex items-center gap-2 font-bold px-4 py-2.5 rounded-lg text-sm text-white" style={{ background: LIME }}><Phone size={13} /> (407) 555-0119</div>
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-8 lg:pt-14">
        <div className="grid lg:grid-cols-[1fr_1.05fr] gap-8 lg:gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-5 text-xs font-semibold" style={{ background: "#ECFCCB", color: GREEN }}>
              <MapPin size={12} /> Orlando, Florida · Family Owned
            </div>
            <h1 className="text-[2.6rem] sm:text-[3.3rem] lg:text-[3.9rem] font-black leading-[1.02] tracking-tight mb-5" style={{ color: GREEN }}>
              Breathe easy.<br />Stay comfortable<br /><span style={{ color: LIME }}>in every season.</span>
            </h1>
            <p className="text-stone-600 text-base lg:text-lg leading-relaxed mb-7 max-w-md">
              Trusted heating, cooling and indoor air quality for Central Florida homes. Honest pricing, on-time technicians and a 100% satisfaction guarantee.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="inline-flex items-center justify-center gap-2 text-white px-8 py-4 rounded-xl font-bold" style={{ background: GREEN }}><Phone size={16} /> Call (407) 555-0119</div>
              <div className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl font-semibold border-2" style={{ borderColor: GREEN, color: GREEN }}>Book Online <ArrowRight size={16} /></div>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-stone-600">
              {["Upfront pricing", "On-time guarantee", "Licensed & insured"].map((b) => <span key={b} className="flex items-center gap-1.5"><Check size={14} style={{ color: LIME }} />{b}</span>)}
            </div>
          </div>
          <div className="relative">
            <div className="rounded-3xl overflow-hidden shadow-2xl aspect-[4/3.1] lg:aspect-[4/3.4]">
              <img src={`${IMG}/van-casa.jpg`} alt="HVAC team arriving at a home" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-5 left-4 sm:left-6 bg-white rounded-2xl shadow-xl px-5 py-3.5 flex items-center gap-3 border border-stone-100">
              <div className="flex gap-0.5">{[0, 1, 2, 3, 4].map((i) => <Star key={i} size={15} fill="#F59E0B" style={{ color: "#F59E0B" }} />)}</div>
              <div className="leading-tight"><div className="font-black text-sm">4.9 / 5</div><div className="text-[11px] text-stone-500">270+ happy homeowners</div></div>
            </div>
            <div className="absolute -top-4 right-4 sm:right-6 rounded-2xl shadow-lg px-4 py-3 text-white flex items-center gap-2" style={{ background: LIME }}>
              <Clock size={16} /><div className="leading-tight"><div className="text-[10px] uppercase tracking-widest opacity-80">Response</div><div className="font-black text-sm">Under 2 hours</div></div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-14 pb-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[[Snowflake, "AC Repair & Install"], [Flame, "Heating Systems"], [Wind, "Indoor Air Quality"], [Wrench, "Maintenance Plans"]].map(([I, t]) => {
            const Icon = I as typeof Snowflake;
            return (
              <div key={t as string} className="rounded-2xl bg-white border border-stone-200 p-5 shadow-sm">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "#ECFCCB", color: GREEN }}><Icon size={19} /></div>
                <div className="font-bold text-sm sm:text-base">{t as string}</div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
