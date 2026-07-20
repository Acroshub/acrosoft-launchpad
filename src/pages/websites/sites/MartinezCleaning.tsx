import { useState } from "react";
import { Phone, MapPin, ChevronDown, Shield, Clock, Leaf, Home, Star, CheckCheck, Sparkles, Wind, Check, Dog } from "lucide-react";

const PHONE        = "2142950378";
const PHONE_DISPLAY = "(214) 295-0378";
const PHONE2        = "4698911405";
const PHONE2_DISPLAY = "(469) 891-1405";

const SERVICES = [
  { icon: Sparkles, title: "Deep Cleaning",           subtitle: "Top-to-bottom thoroughness",    desc: "A comprehensive clean of every room — baseboards, vents, behind appliances, inside cabinets. Perfect as a first-time clean or seasonal reset. Price varies by home size.", photo: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80" },
  { icon: Clock,    title: "Regular Maintenance",     subtitle: "Weekly · Bi-weekly · Monthly",   desc: "Consistent scheduled cleaning to keep your home spotless year-round. We learn your home and deliver the same high standard every visit.", photo: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80" },
  { icon: Home,     title: "Small Home (1–2 bed)",    subtitle: "Studios & small homes",          desc: "Tailored cleaning for apartments, studios, and 1–2 bedroom homes. Efficient, thorough, and priced for smaller spaces — no corners cut.", photo: "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80" },
  { icon: Home,     title: "Medium Home (3–4 bed)",   subtitle: "Standard family homes",          desc: "Our most requested service. Full cleaning of 3–4 bedroom homes — living areas, bedrooms, bathrooms, kitchen, and all common spaces included.", photo: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80" },
  { icon: Home,     title: "Large Home (5+ bed)",     subtitle: "Large properties",               desc: "Thorough cleaning for large homes and estates. We send an experienced team to cover every square foot — same attention to detail, scaled up.", photo: "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=800&q=80" },
  { icon: Dog,      title: "Pet-Friendly Cleaning",   subtitle: "Safe for pets & kids",           desc: "We use non-toxic, pet-safe products throughout. Special attention to pet hair, dander, and odor — so your home smells fresh even with furry family members.", photo: "https://images.unsplash.com/photo-1583511655826-05700d52f4d9?auto=format&fit=crop&w=800&q=80" },
  { icon: Wind,     title: "Kitchen & Bathrooms",     subtitle: "Sanitized & streak-free",        desc: "Heavy-duty degreasing, grout scrubbing, fixture polishing, and full sanitization. The two rooms that matter most — cleaned to the highest standard.", photo: "https://images.unsplash.com/photo-1556909172-54557c7e4fb7?auto=format&fit=crop&w=800&q=80" },
  { icon: Leaf,     title: "Move-In / Move-Out",      subtitle: "Landlord-ready standard",        desc: "Deep sanitizing before or after a move. We leave the space spotless so you get your deposit back or hand over a pristine home to the next tenant.", photo: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80" },
];

const WHY_US = [
  { icon: Shield,     num: "01", title: "Bonded & Insured",        desc: "Every team member is background-checked, bonded, and fully insured. Your home and belongings are always protected." },
  { icon: Leaf,       num: "02", title: "Eco-Friendly Products",   desc: "We use green-certified, non-toxic cleaners — safe for children, pets, and your surfaces. Effective without harsh chemicals." },
  { icon: Dog,        num: "03", title: "Pet-Safe Cleaning",       desc: "All products are pet-friendly. We know how to handle fur, dander, and odors — your pets' home is in safe hands." },
  { icon: CheckCheck, num: "04", title: "Satisfaction Guaranteed", desc: "Not satisfied? We come back and re-clean at no charge. We don't leave until your home meets our standard." },
  { icon: Clock,      num: "05", title: "Flexible Scheduling",     desc: "Morning, evening, weekends — we work when it's convenient for you. Your schedule comes first." },
  { icon: Home,       num: "06", title: "Priced by Home Size",     desc: "Fair, transparent pricing based on the size of your home and your specific needs. No surprises on the bill." },
];

const FAQS = [
  { q: "How is pricing determined?", a: "Our pricing is based on the size of your home (number of bedrooms and bathrooms) and whether you have pets. Call us at (214) 295-0378 for a free quote — we'll give you a straight price with no hidden fees." },
  { q: "Do you clean homes with pets?", a: "Absolutely. We specialize in pet-friendly cleaning using non-toxic, safe products. We pay extra attention to pet hair, dander, and odors so your home feels fresh." },
  { q: "Do I need to be home during the cleaning?", a: "Not at all. Many of our clients provide a key or entry code. We'll clean while you're away and you'll come back to a spotless home." },
  { q: "What areas do you serve?", a: "We serve neighborhoods across Dallas, TX — including Uptown, Downtown, Oak Cliff, Lake Highlands, Lakewood, Preston Hollow, and North Dallas. Call to confirm your address." },
  { q: "Do you bring your own cleaning supplies?", a: "Yes — we arrive fully equipped with professional-grade, eco-friendly products and tools. You don't need to provide anything." },
  { q: "Do you offer recurring service discounts?", a: "Yes. Clients on weekly or bi-weekly plans receive a reduced rate. Ask about our recurring packages when you call." },
];

// ── SVG LOGO ──────────────────────────────────────────────────────────────────
function MartinezLogo({ variant = "light", className = "" }: { variant?: "light" | "dark"; className?: string }) {
  const ink  = variant === "light" ? "#FFFFFF" : "#0A2540";
  const mute = variant === "light" ? "rgba(255,255,255,0.5)" : "rgba(10,37,64,0.45)";
  return (
    <svg viewBox="0 0 280 52" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Martinez Cleaning Services" role="img">
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
      <text x="50" y="24" fontFamily="Georgia,serif" fontWeight="700" fontSize="20" fill={ink} letterSpacing="-0.3">MARTINEZ</text>
      <text x="51" y="35" fontFamily="Arial,sans-serif" fontWeight="600" fontSize="7" fill={ink} letterSpacing="3.2">CLEANING SERVICES</text>
      <line x1="51" y1="40" x2="278" y2="40" stroke={mute} strokeWidth="0.5"/>
      <text x="51" y="49" fontFamily="Arial,sans-serif" fontWeight="400" fontSize="6.5" fill={mute} letterSpacing="1.8">RESIDENTIAL CLEANING · DALLAS, TX</text>
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
export default function MartinezCleaning() {
  const [openService, setOpenService] = useState<number>(0);

  return (
    <div className="overflow-x-hidden bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600&display=swap');
        .mcs-h { font-family: 'Plus Jakarta Sans', sans-serif; }
        @keyframes mcs-ticker { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        .mcs-ticker { animation: mcs-ticker 40s linear infinite; }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav className="relative w-full z-50 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-[68px] flex items-center justify-between gap-4">
          <MartinezLogo variant="dark" className="h-9 w-auto" />
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

        {/* Mobile: full-width hero image */}
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
              <span className="text-sky-300 text-xs font-semibold tracking-wide">Dallas, Texas</span>
            </div>
            <h1 className="text-[2.8rem] font-black text-white leading-[1.0] tracking-[-0.025em] mcs-h">
              Your home,<br/><span className="text-sky-400">spotless</span><br/>every time.
            </h1>
          </div>
          <div className="absolute top-4 right-4 bg-sky-500 text-white rounded-xl px-3 py-2 shadow-lg">
            <div className="text-[10px] font-semibold opacity-80 uppercase tracking-widest">Serving</div>
            <div className="text-sm font-bold mcs-h">Dallas, TX</div>
          </div>
        </div>

        {/* Desktop two-column layout */}
        <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-8 lg:pt-20 pb-0">
          <div className="grid lg:grid-cols-[1fr_460px] gap-12 xl:gap-20 items-center">

            {/* Left */}
            <div className="pb-8 lg:pb-24">
              <div className="hidden lg:inline-flex items-center gap-2 bg-sky-50 border border-sky-100 rounded-full px-4 py-1.5 mb-7">
                <MapPin size={12} className="text-sky-500" />
                <span className="text-sky-600 text-xs font-semibold tracking-wide">Dallas, Texas</span>
              </div>
              <h1 className="hidden lg:block text-[clamp(2.6rem,6vw,4.4rem)] font-black text-slate-900 leading-[1.0] tracking-[-0.025em] mb-6 mcs-h">
                Your home,<br />
                <span className="text-sky-500">spotless</span><br />
                every time.
              </h1>

              <p className="text-slate-500 text-base lg:text-lg leading-relaxed mb-8 max-w-[420px]">
                Martinez Cleaning Services delivers professional residential cleaning in Dallas, TX — customized by home size and pet-friendly. Reliable, eco-friendly, and 100% satisfaction guaranteed.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-8 lg:mb-10">
                <a href={`tel:${PHONE}`} className="w-full sm:w-auto inline-flex flex-col items-center justify-center gap-0.5 bg-sky-500 hover:bg-sky-600 text-white px-8 py-4 rounded-xl font-semibold text-base transition-all duration-200 cursor-pointer shadow-md hover:shadow-[0_6px_22px_rgba(14,165,233,0.4)] hover:scale-[1.02] mcs-h">
                  <span className="font-bold text-lg">Call for a Free Quote</span>
                  <span className="text-white/70 text-sm flex items-center gap-1.5"><Phone size={12}/>{PHONE_DISPLAY}</span>
                </a>
                <a href="#services" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border-2 border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 px-8 py-4 rounded-xl font-semibold text-base transition-all duration-200 cursor-pointer">
                  See Services
                </a>
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap gap-3">
                {["Fully Insured","Pet-Friendly","Satisfaction Guaranteed","Priced by Home Size"].map(b=>(
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
                <img src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=700&q=80" alt="Clean home in Dallas Texas" className="w-full h-full object-cover" loading="eager"/>
                <div className="absolute top-4 left-4 bg-white rounded-xl px-4 py-2.5 shadow-lg flex items-center gap-2.5 border border-slate-100">
                  <div className="w-7 h-7 bg-sky-500 rounded-lg flex items-center justify-center shrink-0">
                    <Check size={13} className="text-white"/>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Result</div>
                    <div className="text-sm font-bold text-slate-800 mcs-h">Spotless & Fresh</div>
                  </div>
                </div>
                <div className="absolute bottom-4 right-4 bg-sky-500 text-white rounded-xl px-4 py-2.5 shadow-lg">
                  <div className="text-[10px] font-semibold opacity-80 uppercase tracking-widest">Serving</div>
                  <div className="text-sm font-bold mcs-h">Dallas, TX</div>
                </div>
              </div>
              <div className="absolute -left-10 bottom-20 z-20 w-36 h-36 rounded-xl overflow-hidden shadow-xl border-4 border-white">
                <img src="https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=300&q=80" alt="Professional cleaning" className="w-full h-full object-cover" loading="lazy"/>
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
                { v: "Pet",  l: "Friendly Cleaning" },
                { v: "5★",   l: "Client Rating" },
              ].map(s=>(
                <div key={s.l} className="bg-slate-50 py-5 px-5 text-center sm:text-left sm:px-8">
                  <div className="text-2xl font-black text-sky-500 mcs-h leading-none">{s.v}</div>
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
          <div className="flex mcs-ticker">
            {["Regular Cleaning","Deep Cleaning","Pet-Friendly","Small Homes","Large Homes","Eco-Friendly","Satisfaction Guaranteed","Move-In / Move-Out","Flexible Scheduling","Dallas TX",
              "Regular Cleaning","Deep Cleaning","Pet-Friendly","Small Homes","Large Homes","Eco-Friendly","Satisfaction Guaranteed","Move-In / Move-Out","Flexible Scheduling","Dallas TX"].map((item,i)=>(
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

          <div className="text-center mb-12">
            <span className="inline-block bg-sky-100 text-sky-600 text-sm font-semibold px-4 py-1.5 rounded-full mb-4 mcs-h">What we clean</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mcs-h mb-3">
              Every home is different.<br/>We clean them all.
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-md mx-auto">
              Pricing adapts to your home size and whether you have pets. Call for a free, no-pressure quote.
            </p>
          </div>

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
                      <span className={`text-[2rem] font-black leading-none mcs-h w-11 shrink-0 transition-colors ${isOpen ? "text-sky-400" : "text-slate-400 group-hover:text-sky-300"}`}>
                        {String(i+1).padStart(2,"0")}
                      </span>
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 ${isOpen ? "bg-sky-500 scale-105" : "bg-slate-200 group-hover:bg-sky-50"}`}>
                        <Icon size={15} className={isOpen ? "text-white" : "text-slate-600 group-hover:text-sky-500"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-semibold text-[0.95rem] leading-snug mcs-h transition-colors ${isOpen ? "text-sky-700" : "text-slate-800 group-hover:text-slate-900"}`}>{s.title}</div>
                        <div className="text-slate-400 text-xs mt-0.5">{s.subtitle}</div>
                      </div>
                      <ChevronDown size={16} className={`shrink-0 transition-all duration-200 ${isOpen ? "rotate-180 text-sky-400" : "text-slate-300 group-hover:text-slate-400"}`} />
                    </button>
                    {isOpen && (
                      <div className="pb-5 pl-[3.75rem]">
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
                    <p className="text-white font-bold text-xl mcs-h">{SERVICES[active].title}</p>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-10">
            <a href={`tel:${PHONE}`} className="inline-flex flex-col items-center bg-sky-500 hover:bg-sky-600 text-white px-10 py-4 rounded-xl transition-all duration-200 cursor-pointer mcs-h shadow-sm hover:shadow-[0_4px_14px_rgba(14,165,233,0.4)] hover:scale-[1.02]">
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
            <span className="inline-block bg-sky-100 text-sky-600 text-sm font-semibold px-4 py-1.5 rounded-full mb-4 mcs-h">Why choose us</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mcs-h">What makes us<br/>different.</h2>
          </div>

          {/* 5-star social proof */}
          <div className="flex flex-col items-center gap-3 mb-12 py-6 px-6 bg-white rounded-2xl border border-sky-100 shadow-sm">
            <div className="flex gap-1">
              {[1,2,3,4,5].map(i => (
                <Star key={i} size={22} className="text-amber-400 fill-amber-400"/>
              ))}
            </div>
            <p className="text-slate-700 text-base font-semibold mcs-h">
              5.0 — <span className="text-slate-500 font-normal">Trusted by families across Dallas, TX</span>
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
                    <span className="inline-flex items-center justify-center w-9 h-9 bg-sky-500 text-white text-sm font-black rounded-xl mcs-h shadow-sm group-hover:bg-sky-600 transition-colors">{item.num}</span>
                    <div className="w-10 h-10 bg-sky-50 group-hover:bg-sky-100 rounded-xl flex items-center justify-center transition-colors">
                      <Icon size={18} className="text-sky-500"/>
                    </div>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base mb-2 mcs-h">{item.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="text-center mt-10">
            <a href={`tel:${PHONE}`} className="inline-flex flex-col items-center bg-[#0A2540] hover:bg-[#0f3060] text-white px-10 py-4 rounded-xl transition-all duration-200 cursor-pointer mcs-h shadow-md hover:scale-[1.02]">
              <span className="font-bold text-base">Call Us Today</span>
              <span className="text-white/55 text-sm flex items-center gap-1.5 mt-0.5"><Phone size={12}/>{PHONE_DISPLAY}</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── COVERAGE ── */}
      <section id="areas" className="relative py-24 px-5 sm:px-8 bg-[#0A2540] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1600&q=80"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover opacity-15"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(14,165,233,0.07)_0%,transparent_70%)] pointer-events-none"/>

        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-1.5 bg-sky-400/20 text-sky-300 text-sm font-semibold px-4 py-1.5 rounded-full mb-4 mcs-h border border-sky-400/30">
              <MapPin size={13} strokeWidth={2.5}/> Service area
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white mcs-h mb-3">We come to you.</h2>
            <p className="text-white/45 text-sm leading-relaxed max-w-md mx-auto">
              Based in Dallas, TX — serving neighborhoods across the city. No travel surcharge within our coverage zone.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {[
              { name: "All Dallas, TX",      tag: "We Cover All Dallas", cities: "Uptown, Downtown, Oak Cliff, North Dallas & more", primary: true  },
              { name: "Oak Cliff",           tag: "Full Coverage",   cities: "Oak Cliff, Bishop Arts, Kessler",  primary: false },
              { name: "Lake Highlands",      tag: "Full Coverage",   cities: "Lake Highlands, Lakewood, Junius Heights", primary: false },
              { name: "North Dallas",        tag: "Full Coverage",   cities: "Preston Hollow, Far North Dallas", primary: false },
            ].map(zone => (
              <div key={zone.name} className={`rounded-2xl p-5 border transition-colors ${zone.primary ? "bg-sky-500 border-sky-400" : "bg-white border-white/80 hover:bg-sky-50"}`}>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin size={14} className={zone.primary ? "text-white shrink-0" : "text-sky-500 shrink-0"} strokeWidth={2.5}/>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${zone.primary ? "text-white/80" : "text-sky-500"}`}>{zone.tag}</span>
                </div>
                <div className={`font-black text-lg mcs-h mb-1.5 leading-tight ${zone.primary ? "text-white" : "text-slate-900"}`}>{zone.name}</div>
                <div className={`text-xs leading-relaxed ${zone.primary ? "text-white/70" : "text-slate-400"}`}>{zone.cities}</div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <a href={`tel:${PHONE}`} className="inline-flex flex-col items-center bg-sky-500 hover:bg-sky-600 text-white px-10 py-4 rounded-xl transition-all duration-200 cursor-pointer mcs-h shadow-md hover:shadow-[0_4px_20px_rgba(14,165,233,0.45)] hover:scale-[1.02]">
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
            <span className="inline-block bg-sky-100 text-sky-600 text-sm font-semibold px-4 py-1.5 rounded-full mb-4 mcs-h">Questions</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mcs-h">Common questions.</h2>
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

            <div>
              <span className="inline-block bg-sky-400/20 text-sky-300 text-sm font-semibold px-4 py-1.5 rounded-full mb-4 mcs-h border border-sky-400/30">Get started</span>
              <h2 className="text-4xl sm:text-5xl font-black text-white mb-5 leading-tight mcs-h">
                Ready for a<br/><span className="text-sky-400">spotless</span><br/>home?
              </h2>
              <p className="text-white/50 text-base leading-relaxed mb-8 max-w-sm">
                Free quote over the phone. We'll ask about your home size and pets, and give you a straight price — no surprises.
              </p>
              <div className="flex flex-col gap-2">
                {["Free quote — no obligation","Priced by home size & pets","Eco-friendly & pet-safe products","Satisfaction guaranteed"].map(item=>(
                  <div key={item} className="flex items-center gap-3 text-white/60 text-sm">
                    <Check size={14} className="text-sky-400 shrink-0"/>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Call card */}
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <div className="text-slate-400 text-xs font-bold tracking-widest uppercase mb-3 mcs-h">Call or Text Anytime</div>

              <a href={`tel:${PHONE}`} className="text-sky-500 font-black text-3xl mcs-h hover:text-sky-600 transition-colors cursor-pointer block mb-0.5">
                {PHONE_DISPLAY}
              </a>
              <a href={`tel:${PHONE2}`} className="text-sky-400 font-semibold text-lg mcs-h hover:text-sky-500 transition-colors cursor-pointer block mb-1">
                {PHONE2_DISPLAY}
              </a>
              <div className="text-slate-400 text-sm mb-6">Martinez Cleaning Services · Dallas, TX</div>

              <a href={`tel:${PHONE}`} className="w-full flex flex-col items-center bg-sky-500 hover:bg-sky-600 text-white py-4 rounded-xl transition-all duration-200 cursor-pointer mcs-h shadow-sm hover:shadow-[0_4px_18px_rgba(14,165,233,0.5)] hover:scale-[1.02]">
                <span className="font-bold text-base">Call for a Free Quote</span>
                <span className="text-white/65 text-sm flex items-center gap-1.5 mt-0.5"><Phone size={12}/>{PHONE_DISPLAY}</span>
              </a>

              <div className="flex flex-wrap gap-2 mt-5">
                {["Fully Insured","Pet-Friendly","Eco-Friendly","Guaranteed"].map(b=>(
                  <span key={b} className="text-xs text-slate-400 bg-slate-50 border border-slate-100 px-3 py-1 rounded-full">{b}</span>
                ))}
              </div>

              <div className="flex items-center gap-2 mt-5 pt-5 border-t border-slate-100">
                <div className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-sky-400 opacity-60"/>
                  <span className="relative h-2 w-2 rounded-full bg-sky-500"/>
                </div>
                <span className="text-slate-400 text-xs">Available for same-week bookings</span>
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
              <MartinezLogo variant="light" className="h-9 w-auto mb-4 opacity-70"/>
              <p className="text-white/40 text-sm leading-relaxed max-w-xs">
                Professional residential cleaning in Dallas, TX. Priced by home size, pet-friendly, fully insured, satisfaction guaranteed.
              </p>
            </div>
            <div>
              <h4 className="text-white/50 text-[10px] font-bold tracking-[3px] uppercase mb-4 mcs-h">Services</h4>
              <ul className="space-y-2 text-white/35 text-sm">
                {["Deep Cleaning","Regular Maintenance","Small Home (1–2 bed)","Medium Home (3–4 bed)","Large Home (5+ bed)","Pet-Friendly Cleaning","Kitchen & Bathrooms","Move-In / Move-Out"].map(s=>(
                  <li key={s} className="hover:text-white/60 transition-colors cursor-default">{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-white/50 text-[10px] font-bold tracking-[3px] uppercase mb-4 mcs-h">Contact</h4>
              <div className="space-y-3 text-sm">
                <a href={`tel:${PHONE}`} className="flex items-center gap-3 text-white/40 hover:text-white/70 transition-colors cursor-pointer">
                  <Phone size={13} className="text-sky-500"/> {PHONE_DISPLAY}
                </a>
                <a href={`tel:${PHONE2}`} className="flex items-center gap-3 text-white/40 hover:text-white/70 transition-colors cursor-pointer">
                  <Phone size={13} className="text-sky-500"/> {PHONE2_DISPLAY}
                </a>
                <div className="flex items-center gap-3 text-white/40">
                  <MapPin size={13} className="text-sky-500"/> Dallas, Texas
                </div>
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row justify-between items-center gap-3 text-white/20 text-xs">
            <div>© 2025 Martinez Cleaning Services. All rights reserved.</div>
            <div>Built by <span className="text-white/35 font-medium">Acrosoft Labs</span></div>
          </div>
        </div>
      </footer>
    </div>
  );
}
