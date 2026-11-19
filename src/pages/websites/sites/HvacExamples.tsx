import { Phone, Star, MapPin, Check, ArrowRight, Snowflake, Flame, Wind, Wrench, ShieldCheck, Clock, ChevronLeft, ChevronRight, CalendarDays, Thermometer } from "lucide-react";

// Ejemplos de diseño de website para HVAC (6 en total: 1-3 basados en el portafolio; 4-6 de composición propia, con calendario de reservas, barra de cotización rápida y cotización por pasos). Solo sirven para sacar las capturas de la landing /website-hvac (public/website-hvac/*.jpg):
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

// ───────────────────────── Ejemplo 4: crema, verde azulado y coral · calendario de reservas dentro del hero ─────────────────────────
export function HvacExample4() {
  const TEAL = "#0F4C5C", CORAL = "#F26B3A", CREAM = "#FBF6EE";
  const days = Array.from({ length: 30 }, (_, i) => i + 1); // noviembre de 2026 empieza en domingo
  const slots = ["8:00 AM", "10:30 AM", "1:00 PM", "3:30 PM"];
  return (
    <div className="overflow-x-hidden" style={{ background: CREAM, color: "#1B2A2F", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <nav className="max-w-6xl mx-auto px-5 sm:px-8 h-[72px] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white" style={{ background: TEAL }}><Wind size={18} /></div>
          <div className="font-extrabold tracking-tight text-lg" style={{ color: TEAL }}>Alpine Air Co.</div>
        </div>
        <div className="flex items-center gap-4 text-sm font-semibold">
          <span className="hidden sm:flex items-center gap-1.5" style={{ color: TEAL }}><Phone size={14} /> (303) 555-0187</span>
          <span className="px-4 py-2 rounded-full border-2" style={{ borderColor: TEAL, color: TEAL }}>Book a visit</span>
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-4 lg:pt-10 pb-10 grid lg:grid-cols-[1fr_540px] gap-8 lg:gap-6 items-start">
        <div className="lg:pt-8">
          <div className="text-xs font-bold tracking-[0.18em] uppercase mb-4" style={{ color: CORAL }}>Denver &amp; front range · AC, heating &amp; air</div>
          <h1 className="text-[2.6rem] sm:text-[3.4rem] lg:text-[4rem] font-extrabold leading-[1.02] tracking-tight mb-5" style={{ color: TEAL }}>
            A cooler home,<br />booked in<br /><span style={{ color: CORAL }}>60 seconds.</span>
          </h1>
          <p className="text-base lg:text-lg leading-relaxed text-[#4A5A5F] max-w-[26rem] mb-6">Pick a day and a time. A certified technician shows up with the right parts and a clear price before any work starts.</p>
          <ul className="space-y-2.5 text-[15px] font-medium">
            {["Same-week appointments", "Upfront, flat-rate pricing", "Licensed, background-checked techs"].map((t) => (
              <li key={t} className="flex items-center gap-2.5"><span className="w-5 h-5 rounded-full flex items-center justify-center text-white" style={{ background: TEAL }}><Check size={12} strokeWidth={3} /></span>{t}</li>
            ))}
          </ul>
        </div>

        <div className="relative lg:h-[560px]">
          <div className="relative h-[230px] lg:absolute lg:right-0 lg:top-0 lg:w-[300px] lg:h-[450px] overflow-hidden" style={{ borderRadius: "150px 150px 28px 28px" }}>
            <img src={`${IMG}/living-termostato.jpg`} alt="Comfortable living room with a smart thermostat" className="w-full h-full object-cover" />
          </div>
          <div className="relative -mt-12 mx-2 lg:mx-0 lg:mt-0 lg:absolute lg:left-0 lg:bottom-0 lg:w-[330px] bg-white rounded-3xl p-5 shadow-[0_24px_60px_rgba(15,76,92,0.22)] border border-[#EFE6D8]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 font-extrabold text-[15px]" style={{ color: TEAL }}><CalendarDays size={17} /> Pick your day</div>
              <div className="flex items-center gap-1 text-sm font-semibold text-[#6B7B80]"><ChevronLeft size={16} /> Nov 2026 <ChevronRight size={16} /></div>
            </div>
            <div className="grid grid-cols-7 gap-y-1 text-center text-[11px] font-bold text-[#9AA7AB] mb-1">{["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i}>{d}</span>)}</div>
            <div className="grid grid-cols-7 gap-y-1 text-center text-[13px]">
              {days.map((d) => {
                const dow = (d - 1) % 7, off = d <= 19 || dow === 0 || dow === 6, sel = d === 24;
                return (
                  <span key={d} className="mx-auto w-8 h-8 flex items-center justify-center rounded-full font-semibold" style={sel ? { background: CORAL, color: "#fff" } : { color: off ? "#CBD3D5" : "#1B2A2F", background: off ? "transparent" : "#F4EFE6" }}>{d}</span>
                );
              })}
            </div>
            <div className="mt-4 text-[11px] font-bold tracking-widest uppercase text-[#9AA7AB] mb-2">Tuesday, Nov 24</div>
            <div className="grid grid-cols-2 gap-2">
              {slots.map((t) => (
                <span key={t} className="text-center text-[13px] font-bold py-2 rounded-xl border-2" style={t === "10:30 AM" ? { background: TEAL, borderColor: TEAL, color: "#fff" } : { borderColor: "#E5DCCB", color: TEAL }}>{t}</span>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-center gap-2 text-white font-extrabold py-3.5 rounded-xl" style={{ background: CORAL }}>Confirm appointment <ArrowRight size={16} /></div>
            <div className="text-center text-[11px] text-[#8A989C] mt-2">Free estimate · No payment today</div>
          </div>
        </div>
      </section>

      <section style={{ background: TEAL }} className="text-white">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 grid sm:grid-cols-3 gap-6">
          {[["01", "Pick a time", "Choose the day that works for you."], ["02", "We show up", "Certified tech, right parts, flat price."], ["03", "Home feels right", "Cool, quiet and backed by our warranty."]].map(([n, t, d]) => (
            <div key={n} className="flex gap-4"><div className="text-3xl font-extrabold" style={{ color: CORAL }}>{n}</div><div><div className="font-bold text-lg">{t}</div><div className="text-white/70 text-sm mt-1">{d}</div></div></div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ───────────────────────── Ejemplo 5: azul marino y amarillo · corte diagonal y barra de cotización rápida ─────────────────────────
export function HvacExample5() {
  const NAVY = "#0B1F3A", YEL = "#FACC15";
  return (
    <div className="overflow-x-hidden" style={{ background: "#F3F5F8", color: NAVY, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="text-center text-[11px] sm:text-xs font-extrabold tracking-wider py-2 px-3" style={{ background: YEL, color: NAVY }}>OPEN NOW · 24/7 EMERGENCY SERVICE · (704) 555-0166</div>

      <section className="relative text-white overflow-hidden" style={{ background: NAVY }}>
        <div className="absolute inset-0 lg:left-auto lg:w-[56%] lg:[clip-path:polygon(16%_0,100%_0,100%_100%,0_100%)]">
          <img src={`${IMG}/techo-azotea.jpg`} alt="HVAC technician servicing a rooftop unit at sunset" className="w-full h-full object-cover" />
          <div className="absolute inset-0 lg:hidden" style={{ background: "rgba(11,31,58,0.82)" }} />
        </div>
        <nav className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 h-[68px] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ background: YEL, color: NAVY }}><Thermometer size={19} /></div>
            <div className="leading-none"><div className="font-black text-[17px] tracking-tight">BLUE RIDGE</div><div className="text-[9px] font-bold tracking-[3px] mt-1 text-white/60">HEATING &amp; COOLING</div></div>
          </div>
          <div className="flex items-center gap-2 font-extrabold px-4 py-2 rounded-full text-sm" style={{ background: YEL, color: NAVY }}><Phone size={14} /> <span className="hidden sm:inline">(704) 555-0166</span><span className="sm:hidden">Call</span></div>
        </nav>
        <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 pt-8 lg:pt-14 pb-24 lg:pb-28">
          <div className="max-w-[34rem]">
            <div className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase mb-5" style={{ color: YEL }}><span className="w-8 h-0.5" style={{ background: YEL }} />Charlotte, NC</div>
            <h1 className="text-[3rem] sm:text-[4.2rem] lg:text-[5rem] font-black leading-[0.94] tracking-tighter mb-5">
              No cool?<br /><span style={{ color: YEL }}>No problem.</span>
            </h1>
            <p className="text-base lg:text-lg text-white/70 leading-relaxed max-w-md">Tell us what&apos;s wrong and we&apos;ll call you back in minutes with a price and an arrival window.</p>
          </div>
        </div>
      </section>

      <div className="relative z-20 -mt-14 max-w-5xl mx-auto px-4">
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-[0_24px_60px_rgba(11,31,58,0.25)] border border-[#E3E8EF] grid lg:grid-cols-[0.8fr_1.4fr_1fr_auto] gap-3 items-end">
          {[["ZIP code", "28202"], ["What&apos;s going on?", "AC not cooling"], ["Mobile phone", "(704) 555-0100"]].map(([l, v], i) => (
            <div key={l}>
              <div className="text-[10px] font-extrabold tracking-widest uppercase text-[#7C8BA1] mb-1.5" dangerouslySetInnerHTML={{ __html: l }} />
              <div className="h-12 rounded-xl border-2 border-[#DDE3EC] px-3.5 flex items-center justify-between text-[15px] font-semibold">{v}{i === 1 && <ChevronRight size={16} className="rotate-90 text-[#7C8BA1]" />}</div>
            </div>
          ))}
          <div className="h-12 px-6 rounded-xl flex items-center justify-center gap-2 font-black" style={{ background: YEL, color: NAVY }}>Get my quote <ArrowRight size={16} /></div>
        </div>
        <div className="flex flex-wrap justify-center gap-2 mt-4 mb-6">
          {["No cooling", "No heat", "Strange noise", "High energy bill", "Thermostat issue"].map((c) => (
            <span key={c} className="text-xs font-bold px-3.5 py-2 rounded-full bg-white border border-[#DDE3EC]">{c}</span>
          ))}
        </div>
      </div>

      <section className="max-w-5xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[[Snowflake, "AC repair", "Fast diagnostics"], [Flame, "Furnace & heat", "Winter-ready"], [Wind, "Heat pumps", "Efficient year-round"], [Wrench, "Tune-ups", "Prevent breakdowns"]].map(([I, t, d]) => {
            const Icon = I as typeof Snowflake;
            return (
              <div key={t as string} className="bg-white rounded-2xl p-4 border border-[#E3E8EF]">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: YEL, color: NAVY }}><Icon size={19} /></div>
                <div className="font-extrabold">{t as string}</div><div className="text-sm text-[#5C6B82]">{d as string}</div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// ───────────────────────── Ejemplo 6: blanco, rojo y carbón · editorial con tipografía serif y cotización por pasos ─────────────────────────
export function HvacExample6() {
  const RED = "#B91C1C", INK = "#1F2937";
  const needs = [["AC repair", true], ["New system", false], ["Heating", false], ["Maintenance plan", false]] as const;
  return (
    <div className="overflow-x-hidden bg-white" style={{ color: INK, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <nav className="border-b border-[#ECECEC]">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-[64px] flex items-center justify-between">
          <div className="text-[22px] tracking-tight" style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 700 }}>Sunbelt<span style={{ color: RED }}> Comfort</span></div>
          <div className="hidden md:flex gap-8 text-sm font-medium text-[#5B6472]"><span>Cooling</span><span>Heating</span><span>Air quality</span><span>Plans</span></div>
          <div className="text-sm font-bold flex items-center gap-1.5" style={{ color: RED }}><Phone size={14} /> (813) 555-0123</div>
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-8 lg:pt-14 pb-12 grid lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-14 items-start">
        <div>
          <div className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#7A8393] mb-4">Heating · Cooling · Air quality — Tampa Bay since 2009</div>
          <h1 className="text-[2.7rem] sm:text-[3.6rem] lg:text-[4.3rem] leading-[1.02] tracking-tight mb-7" style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 700 }}>
            Comfort you <em style={{ color: RED }}>stop thinking</em> about.
          </h1>

          <div className="rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 shadow-[0_14px_40px_rgba(31,41,55,0.08)] max-w-[34rem]">
            <div className="flex items-center justify-between text-xs font-bold text-[#7A8393] mb-2"><span>FREE ESTIMATE</span><span>Step 1 of 3</span></div>
            <div className="h-1.5 rounded-full bg-[#EEF0F3] mb-5"><div className="h-full rounded-full w-1/3" style={{ background: RED }} /></div>
            <div className="text-lg font-bold mb-3" style={{ fontFamily: "Georgia, serif" }}>What do you need help with?</div>
            <div className="grid grid-cols-2 gap-2.5">
              {needs.map(([t, on]) => (
                <div key={t} className="flex items-center gap-2.5 rounded-xl border-2 px-3.5 py-3 text-[14px] font-semibold" style={on ? { borderColor: RED, background: "#FEF2F2" } : { borderColor: "#E5E7EB" }}>
                  <span className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0" style={{ borderColor: on ? RED : "#C3C9D3" }}>{on && <span className="w-2 h-2 rounded-full" style={{ background: RED }} />}</span>{t}
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between">
              <span className="text-xs text-[#8A93A2]">Takes about 1 minute</span>
              <span className="flex items-center gap-2 text-white font-bold px-6 py-3 rounded-xl" style={{ background: RED }}>Continue <ArrowRight size={16} /></span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:pt-6">
          <div className="row-span-2 rounded-2xl overflow-hidden"><img src={`${IMG}/instalacion-sala.jpg`} alt="Technician installing a mini-split indoors" className="w-full h-full object-cover" style={{ minHeight: 300 }} /></div>
          <div className="rounded-2xl overflow-hidden aspect-square"><img src={`${IMG}/apreton-manos.jpg`} alt="Technician greeting a homeowner" className="w-full h-full object-cover" /></div>
          <div className="rounded-2xl overflow-hidden aspect-square"><img src={`${IMG}/tecnico-condensador.jpg`} alt="Technician servicing an outdoor AC unit" className="w-full h-full object-cover" style={{ objectPosition: "70% 50%" }} /></div>
          <div className="col-span-2 flex items-center gap-3 rounded-2xl bg-[#F6F7F9] px-4 py-3.5">
            <div className="flex gap-0.5">{[0, 1, 2, 3, 4].map((i) => <Star key={i} size={15} fill="#F59E0B" style={{ color: "#F59E0B" }} />)}</div>
            <div className="text-sm font-semibold">4.9 · 400+ homes served</div>
          </div>
        </div>
      </section>

      <section className="bg-[#F6F7F9] border-t border-[#ECECEC]">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12">
          <div className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#7A8393] mb-2">Maintenance plans</div>
          <div className="text-2xl sm:text-3xl mb-6" style={{ fontFamily: "Georgia, serif", fontWeight: 700 }}>Fewer surprises. Lower bills.</div>
          <div className="grid sm:grid-cols-3 gap-4">
            {[["Essential", "$14/mo", "1 tune-up a year"], ["Plus", "$24/mo", "2 tune-ups + priority booking"], ["Complete", "$39/mo", "2 tune-ups + repair discounts"]].map(([n, pr, d], i) => (
              <div key={n} className="rounded-2xl bg-white p-5 border-2" style={{ borderColor: i === 1 ? RED : "#E5E7EB" }}>
                <div className="font-bold">{n}</div><div className="text-3xl my-1" style={{ fontFamily: "Georgia, serif", fontWeight: 700, color: i === 1 ? RED : INK }}>{pr}</div><div className="text-sm text-[#6B7280]">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
