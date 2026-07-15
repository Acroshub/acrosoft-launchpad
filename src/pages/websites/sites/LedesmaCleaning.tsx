import { useState } from "react";
import { Phone, MapPin, ChevronDown, Shield, Clock, Leaf, Home, Building2, Star, CheckCheck, Sparkles, Wind, Check } from "lucide-react";

const PHONE = "7062646654";
const PHONE_DISPLAY = "(706) 264-6654";

const SERVICES = [
  { icon: Home,       title: "Home Deep Cleaning",     subtitle: "Top-to-bottom thoroughness",   desc: "Every room, every corner — baseboards, vents, behind appliances, and the hard-to-reach spots your regular routine misses. We leave nothing untouched.", photo: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80" },
  { icon: Clock,      title: "Regular Maintenance",    subtitle: "Weekly · Bi-weekly · Monthly",  desc: "Consistent scheduled cleaning to keep your home or office spotless year-round. Set a schedule, and we handle the rest.", photo: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80" },
  { icon: Building2,  title: "Commercial Cleaning",    subtitle: "Offices, retail & more",        desc: "Professional cleaning for offices, storefronts, and commercial spaces. We work around your hours — evenings and weekends available.", photo: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80" },
  { icon: Sparkles,   title: "Move-In / Move-Out",     subtitle: "Landlord-ready standard",       desc: "Deep sanitizing before or after a move. We leave the space spotless so you get your deposit back or hand over a pristine home.", photo: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80" },
  { icon: Leaf,       title: "Kitchen & Bathrooms",    subtitle: "Sanitized & streak-free",       desc: "Heavy-duty degreasing, grout scrubbing, fixture polishing, and full sanitization — the two rooms that deserve the most attention.", photo: "https://images.unsplash.com/photo-1556909172-54557c7e4fb7?auto=format&fit=crop&w=800&q=80" },
  { icon: Wind,       title: "Floor Care",             subtitle: "Sweep, mop & vacuum",           desc: "Hardwood, tile, laminate, and carpet — we use the right technique and products for each surface to extend its life and restore its shine.", photo: "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=800&q=80" },
  { icon: Star,       title: "Post-Construction",      subtitle: "Remodel cleanup",               desc: "Drywall dust, paint splatter, debris — we clear everything after renovation so your space is move-in ready from day one.", photo: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80" },
  { icon: Shield,     title: "Sanitization Service",   subtitle: "Hospital-grade disinfection",   desc: "EPA-approved disinfectants on all high-touch surfaces — handles, counters, switches. Safe for homes, daycares, clinics, and offices.", photo: "https://images.unsplash.com/photo-1584744982491-665216d95f8b?auto=format&fit=crop&w=800&q=80" },
];

const WHY_US = [
  { icon: Shield,     num: "01", title: "Bonded & Insured",        desc: "Every team member is background-checked, bonded, and fully insured. Your property is always protected." },
  { icon: Leaf,       num: "02", title: "Eco-Friendly Products",   desc: "We use green-certified, non-toxic cleaners — effective on dirt, safe for children, pets, and your surfaces." },
  { icon: Clock,      num: "03", title: "Flexible Scheduling",     desc: "Morning, evening, weekends — we work when it's convenient for you, not the other way around." },
  { icon: CheckCheck, num: "04", title: "Satisfaction Guaranteed", desc: "Not satisfied? We come back and re-clean at no charge. We don't leave until you're happy." },
  { icon: Sparkles,   num: "05", title: "Detail-Oriented",        desc: "We clean corners, vents, baseboards, and spots others skip. Real cleaning — not surface-level." },
  { icon: Home,       num: "06", title: "Locally Based",          desc: "We live and work in Dalton, GA. Responsive, reliable, and proud to serve our community." },
];

const FAQS = [
  { q: "Do I need to be home during the cleaning?", a: "Not at all. Many of our clients provide a key or entry code. We'll clean while you're away and you'll come back to a spotless space." },
  { q: "What areas do you serve?", a: "We're based in Dalton, GA and serve Whitfield County, Catoosa County, and nearby communities. Call to confirm your address." },
  { q: "Do you bring your own cleaning supplies?", a: "Yes — we arrive fully equipped with professional-grade, eco-friendly products and tools. You don't need to provide anything." },
  { q: "How do I get a quote?", a: "Call us at (706) 264-6654. We'll ask a few quick questions and give you a straight price — no hidden fees, no surprises." },
  { q: "Do you offer recurring service discounts?", a: "Yes. Clients on weekly or bi-weekly plans receive a reduced rate. Ask about our recurring packages when you call." },
];

// ── SVG LOGO ──────────────────────────────────────────────────────────────────
function LedesmaLogo({ variant = "light", className = "" }: { variant?: "light" | "dark"; className?: string }) {
  const ink  = variant === "light" ? "#FFFFFF" : "#0A2540";
  const mute = variant === "light" ? "rgba(255,255,255,0.5)" : "rgba(10,37,64,0.45)";
  return (
    <svg viewBox="0 0 252 52" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Ledesma Cleaning Services" role="img">
      <g transform="translate(2,3)">
        <polyline points="23,18 11,30 35,30" fill="none" stroke={ink} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
        <rect x="14" y="30" width="18" height="12" fill="none" stroke={ink} strokeWidth="2" strokeLinejoin="round"/>
        <rect x="19" y="32" width="8" height="7" rx="0.5" fill="none" stroke={ink} strokeWidth="1.4"/>
        <line x1="23" y1="32" x2="23" y2="39" stroke={ink} strokeWidth="0.9"/>
        <line x1="19" y1="35.5" x2="27" y2="35.5" stroke={ink} strokeWidth="0.9"/>
        <path d="M9,17 L9.7,15.2 L10.4,17 L12,17 L10.7,18.1 L11.1,19.8 L9.7,18.8 L8.3,19.8 L8.7,18.1 L7.4,17Z" fill={ink}/>
        <path d="M20,8 L20.5,6.6 L21,8 L22.2,8 L21.2,9 L21.5,10.3 L20.5,9.5 L19.5,10.3 L19.8,9 L18.8,8Z" fill={ink}/>
        <path d="M33,13 L33.5,11.6 L34,13 L35.2,13 L34.2,14 L34.5,15.3 L33.5,14.5 L32.5,15.3 L32.8,14 L31.8,13Z" fill={ink}/>
        <path d="M37,22 L37.4,21 L37.8,22 L38.7,22 L37.9,22.8 L38.1,23.8 L37.4,23.2 L36.7,23.8 L36.9,22.8 L36.1,22Z" fill={ink}/>
      </g>
      <text x="50" y="24" fontFamily="Georgia,serif" fontWeight="700" fontSize="21" fill={ink} letterSpacing="-0.3">LEDESMA</text>
      <text x="51" y="35" fontFamily="Arial,sans-serif" fontWeight="600" fontSize="7" fill={ink} letterSpacing="3.2">CLEANING SERVICES</text>
      <line x1="51" y1="40" x2="250" y2="40" stroke={mute} strokeWidth="0.5"/>
      <text x="51" y="49" fontFamily="Arial,sans-serif" fontWeight="400" fontSize="6.5" fill={mute} letterSpacing="1.8">COMMERCIAL & RESIDENTIAL · DALTON, GA</text>
    </svg>
  );
}

// ── FAQ ITEM ──────────────────────────────────────────────────────────────────
function FaqRow({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border-b border-slate-200 last:border-0 transition-colors ${open ? "border-sky-200" : ""}`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-start justify-between gap-6 py-5 text-left cursor-pointer group" aria-expanded={open}>
        <span className={`text-base leading-snug transition-colors ${open ? "font-semibold text-sky-700" : "font-medium text-slate-700 group-hover:text-slate-900"}`}>{q}</span>
        <ChevronDown size={17} className={`mt-0.5 shrink-0 transition-transform duration-200 ${open ? "rotate-180 text-sky-500" : "text-slate-400"}`} />
      </button>
      {open && <p className="pb-5 text-slate-500 text-sm leading-relaxed">{a}</p>}
    </div>
  );
}

// ── PAGE ──────────────────────────────────────────────────────────────────────
export default function LedesmaCleaning() {
  const [openService, setOpenService] = useState<number>(0);

  return (
    <div className="overflow-x-hidden bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600&display=swap');
        .lcs-h { font-family: 'Plus Jakarta Sans', sans-serif; }
        @keyframes lcs-ticker { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        .lcs-ticker { animation: lcs-ticker 40s linear infinite; }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav className="relative w-full z-50 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-[68px] flex items-center justify-between gap-4">
          <LedesmaLogo variant="dark" className="h-9 w-auto" />
          <div className="hidden lg:flex items-center gap-7">
            {[["Services","#services"],["Why Us","#why-us"],["Coverage","#areas"],["Contact","#contact"]].map(([l,h])=>(
              <a key={l} href={h} className="text-slate-500 hover:text-slate-900 text-sm font-medium transition-colors cursor-pointer">{l}</a>
            ))}
          </div>
          <a href={`tel:${PHONE}`} className="hidden md:flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-all duration-200 cursor-pointer shadow-sm hover:shadow-[0_4px_12px_rgba(14,165,233,0.4)]">
            <Phone size={13} /> {PHONE_DISPLAY}
          </a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="bg-white">

        {/* Mobile: full-width hero image — hidden on lg+ */}
        <div className="lg:hidden relative w-full overflow-hidden" style={{ aspectRatio: "3/4" }}>
          <img
            src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80"
            alt="Professional cleaning service"
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A2540] via-[#0A2540]/50 to-transparent"/>
          <div className="absolute inset-x-0 bottom-0 p-6 pb-8">
            <div className="inline-flex items-center gap-2 bg-sky-400/20 border border-sky-400/30 rounded-full px-3 py-1.5 mb-4">
              <MapPin size={11} className="text-sky-300"/>
              <span className="text-sky-300 text-xs font-semibold tracking-wide">Dalton, Georgia</span>
            </div>
            <h1 className="text-[2.8rem] font-black text-white leading-[1.0] tracking-[-0.025em] lcs-h">
              A clean space.<br/><span className="text-sky-400">Every single</span><br/>time.
            </h1>
          </div>
          <div className="absolute top-4 right-4 bg-sky-500 text-white rounded-xl px-3 py-2 shadow-lg">
            <div className="text-[10px] font-semibold opacity-80 uppercase tracking-widest">Serving</div>
            <div className="text-sm font-bold lcs-h">Dalton, GA</div>
          </div>
        </div>

        {/* Desktop two-column layout */}
        <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-8 lg:pt-20 pb-0">
          <div className="grid lg:grid-cols-[1fr_460px] gap-12 xl:gap-20 items-center">

            {/* Left */}
            <div className="pb-8 lg:pb-24">
              {/* Desktop-only: location badge + headline */}
              <div className="hidden lg:inline-flex items-center gap-2 bg-sky-50 border border-sky-100 rounded-full px-4 py-1.5 mb-7">
                <MapPin size={12} className="text-sky-500" />
                <span className="text-sky-600 text-xs font-semibold tracking-wide">Dalton, Georgia</span>
              </div>
              <h1 className="hidden lg:block text-[clamp(2.6rem,6vw,4.4rem)] font-black text-slate-900 leading-[1.0] tracking-[-0.025em] mb-6 lcs-h">
                A clean space.<br />
                <span className="text-sky-500">Every single</span><br />
                time.
              </h1>

              <p className="text-slate-500 text-base lg:text-lg leading-relaxed mb-8 max-w-[420px]">
                Ledesma Cleaning Services delivers professional residential and commercial cleaning across Dalton, GA — reliable, eco-friendly, and 100% satisfaction guaranteed.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-8 lg:mb-10">
                <a href={`tel:${PHONE}`} className="w-full sm:w-auto inline-flex flex-col items-center justify-center gap-0.5 bg-sky-500 hover:bg-sky-600 text-white px-8 py-4 rounded-xl font-semibold text-base transition-all duration-200 cursor-pointer shadow-md hover:shadow-[0_6px_22px_rgba(14,165,233,0.4)] hover:scale-[1.02] lcs-h">
                  <span className="font-bold text-lg">Call for a Free Quote</span>
                  <span className="text-white/70 text-sm flex items-center gap-1.5"><Phone size={12}/>{PHONE_DISPLAY}</span>
                </a>
                <a href="#services" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border-2 border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 px-8 py-4 rounded-xl font-semibold text-base transition-all duration-200 cursor-pointer">
                  See Services
                </a>
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap gap-3">
                {["Fully Insured","Eco-Friendly","Satisfaction Guaranteed","Same-Day Available"].map(b=>(
                  <span key={b} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full">
                    <Check size={11} className="text-sky-500"/> {b}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: Photo stack (desktop only) */}
            <div className="hidden lg:block relative pb-0">
              <div className="absolute -top-6 -right-6 w-48 h-48 bg-sky-50 rounded-full z-0" />
              <div className="absolute -bottom-4 -left-4 w-28 h-28 bg-sky-100 rounded-full z-0" />
              <div className="relative z-10 rounded-2xl overflow-hidden shadow-xl border border-slate-100 aspect-[4/5]">
                <img src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=700&q=80" alt="Clean bright home interior" className="w-full h-full object-cover" loading="eager"/>
                <div className="absolute top-4 left-4 bg-white rounded-xl px-4 py-2.5 shadow-lg flex items-center gap-2.5 border border-slate-100">
                  <div className="w-7 h-7 bg-sky-500 rounded-lg flex items-center justify-center shrink-0">
                    <Check size={13} className="text-white"/>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Result</div>
                    <div className="text-sm font-bold text-slate-800 lcs-h">Spotless & Fresh</div>
                  </div>
                </div>
                <div className="absolute bottom-4 right-4 bg-sky-500 text-white rounded-xl px-4 py-2.5 shadow-lg">
                  <div className="text-[10px] font-semibold opacity-80 uppercase tracking-widest">Serving</div>
                  <div className="text-sm font-bold lcs-h">Dalton, GA</div>
                </div>
              </div>
              <div className="absolute -left-10 bottom-20 z-20 w-36 h-36 rounded-xl overflow-hidden shadow-xl border-4 border-white">
                <img src="https://images.unsplash.com/photo-1556909172-54557c7e4fb7?auto=format&fit=crop&w=300&q=80" alt="Sparkling clean kitchen" className="w-full h-full object-cover" loading="lazy"/>
              </div>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="border-t border-slate-100 bg-slate-50 mt-8 lg:mt-0">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-200">
              {[
                { v: "8+",   l: "Services Offered" },
                { v: "100%", l: "Satisfaction Rate" },
                { v: "2",    l: "Service Categories" },
                { v: "5★",   l: "Client Rating" },
              ].map(s=>(
                <div key={s.l} className="bg-slate-50 py-5 px-5 text-center sm:text-left sm:px-8">
                  <div className="text-2xl font-black text-sky-500 lcs-h leading-none">{s.v}</div>
                  <div className="text-slate-500 text-xs mt-1">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TICKER ── */}
      <div className="overflow-hidden bg-[#0A2540] py-3 border-y border-[#0A2540]">
        <div className="flex whitespace-nowrap">
          <div className="flex lcs-ticker">
            {["Home Deep Cleaning","Commercial Cleaning","Move-In/Move-Out","Floor Care","Kitchen & Bath","Eco-Friendly","Sanitization","Post-Construction","Flexible Hours","Insured Team",
              "Home Deep Cleaning","Commercial Cleaning","Move-In/Move-Out","Floor Care","Kitchen & Bath","Eco-Friendly","Sanitization","Post-Construction","Flexible Hours","Insured Team"].map((item,i)=>(
              <span key={i} className="inline-flex items-center gap-3 mx-6 text-white/60 text-[11px] font-medium tracking-[2px] uppercase">
                {item}<span className="w-1 h-1 rounded-full bg-sky-400/60 shrink-0"/>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── SERVICES ── */}
      <section id="services" className="py-24 px-5 sm:px-8 bg-white">
        <div className="max-w-6xl mx-auto">

          {/* Centered header */}
          <div className="text-center mb-12">
            <span className="inline-block bg-sky-100 text-sky-600 text-sm font-semibold px-4 py-1.5 rounded-full mb-4 lcs-h">What we clean</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 lcs-h mb-3">
              Eight services,<br/>one reliable team.
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-md mx-auto">
              Not sure which service fits? We'll walk you through it — free call, zero pressure.
            </p>
          </div>

          {/* Two columns */}
          <div className="grid lg:grid-cols-2 gap-8 items-start">

            {/* Left: Accordion */}
            <div>
              {SERVICES.map((s, i) => {
                const Icon = s.icon;
                const isOpen = openService === i;
                return (
                  <div key={i} className={`border-b transition-colors ${isOpen ? "border-sky-200" : "border-slate-100"}`}>
                    <button
                      onClick={() => setOpenService(isOpen ? -1 : i)}
                      className="w-full flex items-center gap-4 py-4 text-left cursor-pointer group"
                    >
                      <span className={`text-[2rem] font-black leading-none lcs-h w-11 shrink-0 transition-colors ${isOpen ? "text-sky-400" : "text-slate-400 group-hover:text-sky-300"}`}>
                        {String(i+1).padStart(2,"0")}
                      </span>
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 ${isOpen ? "bg-sky-500 scale-105" : "bg-slate-200 group-hover:bg-sky-50"}`}>
                        <Icon size={15} className={isOpen ? "text-white" : "text-slate-600 group-hover:text-sky-500"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-semibold text-[0.95rem] leading-snug lcs-h transition-colors ${isOpen ? "text-sky-700" : "text-slate-800 group-hover:text-slate-900"}`}>{s.title}</div>
                        <div className="text-slate-400 text-xs mt-0.5">{s.subtitle}</div>
                      </div>
                      <ChevronDown size={16} className={`shrink-0 transition-all duration-200 ${isOpen ? "rotate-180 text-sky-400" : "text-slate-300 group-hover:text-slate-400"}`} />
                    </button>
                    {isOpen && (
                      <div className="pb-5 pl-[3.75rem]">
                        {/* Mobile: 2 columns — text + image. Desktop: text only (image in right panel) */}
                        <div className="grid grid-cols-[1fr_96px] sm:block gap-3 items-start">
                          <p className="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
                          <div className="sm:hidden rounded-xl overflow-hidden aspect-square shrink-0">
                            <img src={s.photo} alt={s.title} className="w-full h-full object-cover" loading="lazy"/>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Right: Changing image (desktop only) */}
            <div className="hidden lg:block lg:sticky lg:top-8 rounded-2xl overflow-hidden relative lg:h-[560px] shadow-lg border border-slate-100">
              {SERVICES.map((s, i) => {
                const active = openService >= 0 ? openService : 0;
                return (
                  <img key={i} src={s.photo} alt={s.title}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${i === active ? "opacity-100" : "opacity-0"}`}
                    loading="lazy"/>
                );
              })}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A2540]/75 via-[#0A2540]/10 to-transparent"/>
              {(() => {
                const active = openService >= 0 ? openService : 0;
                const Icon = SERVICES[active].icon;
                return (
                  <div className="absolute bottom-6 left-6 right-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon size={14} className="text-sky-300"/>
                      <span className="text-sky-300 text-xs font-semibold tracking-wide">{SERVICES[active].subtitle}</span>
                    </div>
                    <p className="text-white font-bold text-xl lcs-h">{SERVICES[active].title}</p>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-10">
            <a href={`tel:${PHONE}`} className="inline-flex flex-col items-center bg-sky-500 hover:bg-sky-600 text-white px-10 py-4 rounded-xl transition-all duration-200 cursor-pointer lcs-h shadow-sm hover:shadow-[0_4px_14px_rgba(14,165,233,0.4)] hover:scale-[1.02]">
              <span className="font-bold text-base">Call for a Free Quote</span>
              <span className="text-white/70 text-sm flex items-center gap-1.5 mt-0.5"><Phone size={12}/>{PHONE_DISPLAY}</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── WHY US ── */}
      <section id="why-us" className="py-24 px-5 sm:px-8 bg-sky-300">
        <div className="max-w-6xl mx-auto">
          <div className="mb-14 text-center">
            <span className="inline-block bg-sky-100 text-sky-600 text-sm font-semibold px-4 py-1.5 rounded-full mb-4 lcs-h">Why choose us</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 lcs-h">What makes us<br/>different.</h2>
          </div>

          {/* 5-star social proof */}
          <div className="flex flex-col items-center gap-3 mb-12 py-6 px-6 bg-white rounded-2xl border border-sky-100 shadow-sm">
            <div className="flex gap-1">
              {[1,2,3,4,5].map(i => (
                <Star key={i} size={22} className="text-amber-400 fill-amber-400"/>
              ))}
            </div>
            <p className="text-slate-700 text-base font-semibold lcs-h">
              5.0 — <span className="text-slate-500 font-normal">Trusted by hundreds of clients across Dalton, GA</span>
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1"><Check size={11} className="text-sky-500"/>Google Reviews</span>
              <span className="flex items-center gap-1"><Check size={11} className="text-sky-500"/>Facebook Reviews</span>
              <span className="flex items-center gap-1"><Check size={11} className="text-sky-500"/>Nextdoor Recommended</span>
            </div>
          </div>

          {/* Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {WHY_US.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-sky-300 hover:shadow-lg transition-all duration-200 group cursor-default">
                  <div className="flex items-center justify-between mb-5">
                    <span className="inline-flex items-center justify-center w-9 h-9 bg-sky-500 text-white text-sm font-black rounded-xl lcs-h shadow-sm group-hover:bg-sky-600 transition-colors">{item.num}</span>
                    <div className="w-10 h-10 bg-sky-50 group-hover:bg-sky-100 rounded-xl flex items-center justify-center transition-colors">
                      <Icon size={18} className="text-sky-500"/>
                    </div>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base mb-2 lcs-h">{item.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="text-center mt-10">
            <a href={`tel:${PHONE}`} className="inline-flex flex-col items-center bg-[#0A2540] hover:bg-[#0f3060] text-white px-10 py-4 rounded-xl transition-all duration-200 cursor-pointer lcs-h shadow-md hover:scale-[1.02]">
              <span className="font-bold text-base">Call Us Today</span>
              <span className="text-white/55 text-sm flex items-center gap-1.5 mt-0.5"><Phone size={12}/>{PHONE_DISPLAY}</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── COVERAGE ── */}
      <section id="areas" className="relative py-24 px-5 sm:px-8 bg-[#0A2540] overflow-hidden">
        {/* Background image with overlay */}
        <img
          src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1600&q=80"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover opacity-15"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(14,165,233,0.07)_0%,transparent_70%)] pointer-events-none"/>

        <div className="relative max-w-6xl mx-auto">

          {/* Header */}
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-1.5 bg-sky-400/20 text-sky-300 text-sm font-semibold px-4 py-1.5 rounded-full mb-4 lcs-h border border-sky-400/30">
              <MapPin size={13} strokeWidth={2.5}/> Service area
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white lcs-h mb-3">We come to you.</h2>
            <p className="text-white/45 text-sm leading-relaxed max-w-md mx-auto">
              Based in Dalton, GA — no travel surcharge within our coverage zone. Not sure if we reach you? Just call.
            </p>
          </div>

          {/* Zone cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {[
              { name: "Dalton, GA",        tag: "Primary Area",    cities: "City center & all zip codes",      primary: true  },
              { name: "Whitfield County",  tag: "Full Coverage",   cities: "Tunnel Hill, Varnell, Rocky Face", primary: false },
              { name: "Catoosa County",    tag: "Full Coverage",   cities: "Ringgold, Fort Oglethorpe",        primary: false },
              { name: "Surrounding Areas", tag: "Call to Confirm", cities: "Ask about your location",          primary: false },
            ].map(zone => (
              <div key={zone.name} className={`rounded-2xl p-5 border transition-colors ${zone.primary ? "bg-sky-500 border-sky-400" : "bg-white border-white/80 hover:bg-sky-50"}`}>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin size={14} className={zone.primary ? "text-white shrink-0" : "text-sky-500 shrink-0"} strokeWidth={2.5}/>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${zone.primary ? "text-white/80" : "text-sky-500"}`}>{zone.tag}</span>
                </div>
                <div className={`font-black text-lg lcs-h mb-1.5 leading-tight ${zone.primary ? "text-white" : "text-slate-900"}`}>{zone.name}</div>
                <div className={`text-xs leading-relaxed ${zone.primary ? "text-white/70" : "text-slate-400"}`}>{zone.cities}</div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center">
            <a href={`tel:${PHONE}`} className="inline-flex flex-col items-center bg-sky-500 hover:bg-sky-600 text-white px-10 py-4 rounded-xl transition-all duration-200 cursor-pointer lcs-h shadow-md hover:shadow-[0_4px_20px_rgba(14,165,233,0.45)] hover:scale-[1.02]">
              <span className="font-bold text-base">Book Your Cleaning</span>
              <span className="text-white/70 text-sm flex items-center gap-1.5 mt-0.5"><Phone size={12}/>{PHONE_DISPLAY}</span>
            </a>
          </div>

        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 px-5 sm:px-8 bg-slate-50 border-t border-slate-100">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <span className="inline-block bg-sky-100 text-sky-600 text-sm font-semibold px-4 py-1.5 rounded-full mb-4 lcs-h">Questions</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 lcs-h">Common questions.</h2>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-7 py-2">
            {FAQS.map(f => <FaqRow key={f.q} q={f.q} a={f.a}/>)}
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="contact" className="py-24 px-5 sm:px-8 bg-[#0A2540]">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-[1fr_400px] gap-12 items-center">

            {/* Left */}
            <div>
              <span className="inline-block bg-sky-400/20 text-sky-300 text-sm font-semibold px-4 py-1.5 rounded-full mb-4 lcs-h border border-sky-400/30">Get started</span>
              <h2 className="text-4xl sm:text-5xl font-black text-white mb-5 leading-tight lcs-h">
                Ready for a<br/><span className="text-sky-400">spotless</span><br/>space?
              </h2>
              <p className="text-white/50 text-base leading-relaxed mb-8 max-w-sm">
                Free quote over the phone. We answer fast, schedule quickly, and show up when we say we will.
              </p>
              <div className="flex flex-col gap-2">
                {["Free quote — no obligation","Same-day scheduling available","Commercial & residential","Eco-friendly products"].map(item=>(
                  <div key={item} className="flex items-center gap-3 text-white/60 text-sm">
                    <Check size={14} className="text-sky-400 shrink-0"/>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Call card */}
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <div className="text-slate-400 text-xs font-bold tracking-widest uppercase mb-3 lcs-h">Call or Text Anytime</div>
              <a href={`tel:${PHONE}`} className="text-sky-500 font-black text-3xl lcs-h hover:text-sky-600 transition-colors cursor-pointer block mb-1">
                {PHONE_DISPLAY}
              </a>
              <div className="text-slate-400 text-sm mb-6">Ledesma Cleaning Services · Dalton, GA</div>

              <a href={`tel:${PHONE}`} className="w-full flex flex-col items-center bg-sky-500 hover:bg-sky-600 text-white py-4 rounded-xl transition-all duration-200 cursor-pointer lcs-h shadow-sm hover:shadow-[0_4px_18px_rgba(14,165,233,0.5)] hover:scale-[1.02]">
                <span className="font-bold text-base">Call for a Free Quote</span>
                <span className="text-white/65 text-sm flex items-center gap-1.5 mt-0.5"><Phone size={12}/>{PHONE_DISPLAY}</span>
              </a>

              <div className="flex flex-wrap gap-2 mt-5">
                {["Fully Insured","Eco-Friendly","Guaranteed"].map(b=>(
                  <span key={b} className="text-xs text-slate-400 bg-slate-50 border border-slate-100 px-3 py-1 rounded-full">{b}</span>
                ))}
              </div>

              <div className="flex items-center gap-2 mt-5 pt-5 border-t border-slate-100">
                <div className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-sky-400 opacity-60"/>
                  <span className="relative h-2 w-2 rounded-full bg-sky-500"/>
                </div>
                <span className="text-slate-400 text-xs">Available for same-day bookings</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#071829] text-white py-12 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-10 mb-10">
            <div>
              <LedesmaLogo variant="light" className="h-9 w-auto mb-4 opacity-70"/>
              <p className="text-white/40 text-sm leading-relaxed max-w-xs">
                Professional residential and commercial cleaning in Dalton, GA. Eco-friendly, insured, satisfaction guaranteed.
              </p>
            </div>
            <div>
              <h4 className="text-white/50 text-[10px] font-bold tracking-[3px] uppercase mb-4 lcs-h">Services</h4>
              <ul className="space-y-2 text-white/35 text-sm">
                {["Home Deep Cleaning","Regular Maintenance","Commercial Cleaning","Move-In/Move-Out","Kitchen & Bathrooms","Floor Care","Post-Construction","Sanitization Service"].map(s=>(
                  <li key={s} className="hover:text-white/60 transition-colors cursor-default">{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-white/50 text-[10px] font-bold tracking-[3px] uppercase mb-4 lcs-h">Contact</h4>
              <div className="space-y-3 text-sm">
                <a href={`tel:${PHONE}`} className="flex items-center gap-3 text-white/40 hover:text-white/70 transition-colors cursor-pointer">
                  <Phone size={13} className="text-sky-500"/> {PHONE_DISPLAY}
                </a>
                <div className="flex items-center gap-3 text-white/40">
                  <MapPin size={13} className="text-sky-500"/> Dalton, Georgia
                </div>
                <div className="flex items-center gap-3 text-white/40">
                  <Building2 size={13} className="text-sky-500"/> Commercial & Residential
                </div>
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row justify-between items-center gap-3 text-white/20 text-xs">
            <div>© 2025 Ledesma Cleaning Services. All rights reserved.</div>
            <div>Built by <span className="text-white/35 font-medium">Acrosoft Labs</span></div>
          </div>
        </div>
      </footer>
    </div>
  );
}
