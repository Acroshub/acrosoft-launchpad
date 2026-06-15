import { useState, useMemo } from "react";
import {
  Phone, Mail, Clock, Star, MapPin, ChevronDown, ChevronUp,
  Check, ChevronLeft, ChevronRight, Calendar, Leaf, Shield,
  Zap, Award, Repeat, ArrowRight, Menu, X, Home,
} from "lucide-react";

// ── TOKENS ────────────────────────────────────────────────────────────────────
const C = {
  cyan:     "#0891B2",
  cyanD:    "#164E63",
  cyanL:    "#ECFEFF",
  cyan100:  "#CFFAFE",
  cyan200:  "#A5F3FC",
  mint:     "#10B981",
  mintL:    "#ECFDF5",
  yellow:   "#F59E0B",
  yellowL:  "#FFFBEB",
  white:    "#FFFFFF",
  gray:     "#64748B",
  grayL:    "#F1F5F9",
  dark:     "#0F172A",
  text:     "#1E293B",
  muted:    "#64748B",
  border:   "#E2E8F0",
};

const PHONE  = "(214) 555-0198";
const EMAIL  = "hello@bellashinecleaning.com";
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS   = ["Su","Mo","Tu","We","Th","Fr","Sa"];

// ── SERVICES DATA ─────────────────────────────────────────────────────────────
const SERVICES = [
  { id:"house",    Icon:Home,     label:"House Cleaning",        color:"#0891B2", light:"#ECFEFF", desc:"Regular maintenance cleaning for kitchens, bathrooms, bedrooms, and living areas.",    from:"$99",  time:"2–3h" },
  { id:"deep",     Icon:Zap,      label:"Deep Cleaning",         color:"#0D9488", light:"#F0FDFA", desc:"Top-to-bottom intensive clean — baseboards, vents, inside appliances, grout.",         from:"$189", time:"4–5h" },
  { id:"movein",   Icon:ArrowRight,label:"Move-In / Move-Out",   color:"#7C3AED", light:"#F5F3FF", desc:"Full property clean for landlords, tenants, and real estate transactions.",            from:"$229", time:"5–6h" },
  { id:"airbnb",   Icon:Star,     label:"Airbnb Cleaning",       color:"#EC4899", light:"#FDF2F8", desc:"Quick, thorough turnover cleans between guests. Same-day available.",                  from:"$79",  time:"1–2h" },
  { id:"office",   Icon:Award,    label:"Office Cleaning",       color:"#2563EB", light:"#EFF6FF", desc:"Professional commercial cleaning for offices, lobbies, and shared workspaces.",        from:"$149", time:"Custom" },
  { id:"post",     Icon:Shield,   label:"Post-Construction",     color:"#D97706", light:"#FFFBEB", desc:"Construction dust, debris, and residue removal after renovation or new builds.",       from:"$299", time:"Custom" },
  { id:"recur",    Icon:Repeat,   label:"Weekly & Bi-Weekly",    color:"#10B981", light:"#ECFDF5", desc:"Save up to 20% with a recurring schedule. Consistent team every visit.",              from:"$79",  time:"2–3h"  },
];

const TESTIMONIALS = [
  { name:"Sarah M.",   loc:"Highland Park, TX",  stars:5, job:"Weekly House Cleaning",  text:"The team was punctual, professional, and left my house spotless. I've been a client for two years and wouldn't trade them for anything.",  img:"1494790108377-be9c29b29330" },
  { name:"David R.",   loc:"Uptown, Dallas, TX", stars:5, job:"Office Cleaning",        text:"Best cleaning company we've hired for our office. They work around our schedule, never miss a spot, and the team is incredibly trustworthy.", img:"1506794778202-cad84cf45f1d" },
  { name:"Jessica T.", loc:"Frisco, TX",         stars:5, job:"Move-Out Deep Clean",    text:"Amazing attention to detail. They cleaned areas I didn't even think about. Got my full deposit back. Highly recommend for move-out cleans!", img:"1560250097-0b93528c311a" },
  { name:"Carlos V.",  loc:"Plano, TX",          stars:5, job:"Airbnb Turnover",        text:"My Airbnb rating jumped from 4.6 to 4.9 after switching to Bella Shine. Guests always comment on how clean the place is.",               img:"1587614382346-4ec70e388b28" },
];

const FAQS = [
  { q:"Do I need to be home during the cleaning?", a:"No, most of our clients give us access via a key or lockbox. Our team is fully vetted, background-checked, and bonded. You're welcome to be home or away — whatever you prefer." },
  { q:"What products do you use?", a:"We use EPA-approved, eco-friendly cleaning products that are safe for children, pets, and allergy-sensitive households. If you have specific product preferences, just let us know." },
  { q:"How do I pay?", a:"We accept all major credit cards, Zelle, and Venmo. Payment is due upon completion of service. Recurring clients can set up auto-billing." },
  { q:"What if I'm not satisfied?", a:"We have a 100% satisfaction guarantee. If you're not happy with any area of the clean, call us within 24 hours and we'll return to re-clean at no charge." },
  { q:"Do you bring your own supplies and equipment?", a:"Yes. We bring all cleaning products, microfiber cloths, mops, and vacuum cleaners. You don't need to provide anything." },
  { q:"Is same-day cleaning available?", a:"Yes! We often have same-day and next-day availability, especially for apartment and Airbnb cleans. Call or book online and we'll confirm within 30 minutes." },
];

const TIME_SLOTS = ["8:00 AM","9:00 AM","10:00 AM","11:00 AM","12:00 PM","1:00 PM","2:00 PM","3:00 PM","4:00 PM"];
const HOME_SIZES = ["Studio / 1BR","2 Bedrooms","3 Bedrooms","4 Bedrooms","5+ Bedrooms","Commercial Space"];

// ── LOGO ──────────────────────────────────────────────────────────────────────
function BellaLogo({ dark = false, className = "" }: { dark?: boolean; className?: string }) {
  const textCol  = dark ? C.white : C.cyanD;
  const subCol   = dark ? "rgba(255,255,255,0.55)" : C.muted;
  return (
    <svg viewBox="0 0 260 56" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Bella Shine Cleaning Services" role="img">
      {/* Sparkle/shine icon: 4-pointed star */}
      <path d="M26 6 L28.5 22 L44 24 L28.5 26 L26 42 L23.5 26 L8 24 L23.5 22 Z" fill={C.cyan} />
      <path d="M26 14 L27.2 22.5 L35 24 L27.2 25.5 L26 34 L24.8 25.5 L17 24 L24.8 22.5 Z" fill={C.yellow} />
      {/* Small accent sparkle */}
      <path d="M42 10 L43.2 14 L47 14 L44.2 16.5 L45.2 20.5 L42 18 L38.8 20.5 L39.8 16.5 L37 14 L40.8 14 Z" fill={C.cyan} opacity="0.45" />
      <circle cx="11" cy="34" r="2.5" fill={C.yellow} opacity="0.55" />
      {/* Wordmark */}
      <text x="56" y="24" fontFamily="'Arial Black','Arial Bold',Arial,sans-serif" fontWeight="900" fontSize="20" fill={textCol} letterSpacing="-0.3">BELLA SHINE</text>
      <text x="57" y="37" fontFamily="Arial,sans-serif" fontWeight="600" fontSize="9.5" fill={C.cyan} letterSpacing="3">CLEANING SERVICES</text>
      <text x="57" y="49" fontFamily="Arial,sans-serif" fontWeight="400" fontSize="8" fill={subCol} letterSpacing="2">DALLAS, TX · EST. 2018</text>
    </svg>
  );
}

// ── WAVY DIVIDER ──────────────────────────────────────────────────────────────
function WaveDivider({ topColor, bottomColor, flip = false }: { topColor: string; bottomColor: string; flip?: boolean }) {
  return (
    <div style={{ background: topColor, marginBottom: -1 }}>
      <svg viewBox="0 0 1440 60" preserveAspectRatio="none" className="w-full block" style={{ transform: flip ? "scaleY(-1)" : undefined }}>
        <path d="M0,0 C240,60 480,0 720,30 C960,60 1200,0 1440,30 L1440,60 L0,60 Z" fill={bottomColor} />
      </svg>
    </div>
  );
}

// ── FAQ ITEM ──────────────────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded-2xl overflow-hidden transition-all duration-200" style={{ borderColor: open ? C.cyan : C.border, background: C.white }}>
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between gap-4 p-5 text-left cursor-pointer hover:bg-slate-50 transition-colors">
        <span className="font-bold text-base" style={{ color: C.text }}>{q}</span>
        {open
          ? <ChevronUp size={18} style={{ color: C.cyan }} className="shrink-0" />
          : <ChevronDown size={18} className="shrink-0 text-slate-400" />}
      </button>
      {open && <p className="px-5 pb-5 text-sm leading-relaxed" style={{ color: C.muted }}>{a}</p>}
    </div>
  );
}

// ── BOOKING CALENDAR ──────────────────────────────────────────────────────────
type BookStep = "service" | "size" | "date" | "time" | "info" | "done";

function BookingSection() {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const [step, setStep]             = useState<BookStep>("service");
  const [svc, setSvc]               = useState<string>("");
  const [size, setSize]             = useState<string>("");
  const [monthOffset, setMonthOffset] = useState(0);
  const [selDate, setSelDate]       = useState<Date | null>(null);
  const [selTime, setSelTime]       = useState<string>("");
  const [recurring, setRecurring]   = useState<"once" | "weekly" | "biweekly">("once");
  const [form, setForm]             = useState({ name:"", phone:"", email:"", notes:"" });

  const viewMonth = useMemo(() =>
    new Date(today.getFullYear(), today.getMonth() + monthOffset, 1),
    [today, monthOffset]);

  const bookedSet = useMemo(() => {
    const s = new Set<string>();
    [2, 5, 8, 11, 15, 18, 22, 25, 29, 33, 38].forEach(n => {
      const d = new Date(today); d.setDate(today.getDate() + n);
      s.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    });
    return s;
  }, [today]);

  const dk = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const isWeekend  = (d: Date) => d.getDay() === 0;
  const isPast     = (d: Date) => d < today;
  const isBooked   = (d: Date) => bookedSet.has(dk(d));
  const isTooFar   = (d: Date) => d > new Date(today.getFullYear(), today.getMonth() + 2, today.getDate());
  const isAvail    = (d: Date) => !isWeekend(d) && !isPast(d) && !isBooked(d) && !isTooFar(d);
  const isSel      = (d: Date) => !!selDate && dk(d) === dk(selDate);
  const isToday    = (d: Date) => dk(d) === dk(today);
  const isSameDay  = (d: Date) => dk(d) === dk(today) && isAvail(d);

  const calDays = useMemo(() => {
    const y = viewMonth.getFullYear(), m = viewMonth.getMonth();
    const first = new Date(y, m, 1).getDay();
    const total = new Date(y, m+1, 0).getDate();
    const arr: (Date|null)[] = Array(first).fill(null);
    for (let i = 1; i <= total; i++) arr.push(new Date(y, m, i));
    return arr;
  }, [viewMonth]);

  const fmtDate = (d: Date) => `${MONTHS[d.getMonth()].slice(0,3)} ${d.getDate()}, ${d.getFullYear()}`;

  const STEPS: BookStep[] = ["service","size","date","time","info","done"];
  const stepIdx = STEPS.indexOf(step);

  // Skip "size" for commercial services
  const skipSize = svc === "office" || svc === "post";

  function goNext() {
    if (step === "service") setStep(skipSize ? "date" : "size");
    else if (step === "size") setStep("date");
    else if (step === "date") setStep("time");
    else if (step === "time") setStep("info");
    else if (step === "info") setStep("done");
  }

  const selectedSvc = SERVICES.find(s => s.id === svc);

  return (
    <section id="book" className="py-24 px-4" style={{ background: C.cyanL }}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="inline-block text-xs font-bold tracking-widest uppercase rounded-full px-3 py-1 mb-4" style={{ background: C.cyan100, color: C.cyan }}>Book a Cleaning</span>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight" style={{ color: C.cyanD }}>Schedule in 60 Seconds.</h2>
          <p className="mt-3 text-base" style={{ color: C.muted }}>Free estimate · No credit card · Confirmed within 30 min</p>
        </div>

        {/* Progress bar */}
        {step !== "done" && (
          <div className="flex items-center gap-2 mb-8">
            {(["service","size","date","time","info"] as BookStep[]).map((s, i) => {
              const sLabel = ["Service","Size","Date","Time","Info"][i];
              const active = STEPS.indexOf(step) >= i;
              return (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                      style={{ background: active ? C.cyan : C.border, color: active ? "white" : C.muted }}>
                      {STEPS.indexOf(step) > i ? <Check size={12}/> : i+1}
                    </div>
                    <span className="text-[10px] font-semibold hidden sm:block" style={{ color: active ? C.cyan : C.muted }}>{sLabel}</span>
                  </div>
                  {i < 4 && <div className="flex-1 h-0.5 rounded-full transition-all duration-300" style={{ background: STEPS.indexOf(step) > i ? C.cyan : C.border }} />}
                </div>
              );
            })}
          </div>
        )}

        {/* Card */}
        <div className="rounded-3xl shadow-xl overflow-hidden border" style={{ background: C.white, borderColor: C.border }}>
          {/* Step: Service */}
          {step === "service" && (
            <div className="p-7">
              <h3 className="text-xl font-black mb-6" style={{ color: C.cyanD }}>What type of cleaning?</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {SERVICES.map(s => {
                  const Icon = s.Icon;
                  const sel = svc === s.id;
                  return (
                    <button key={s.id} onClick={() => setSvc(s.id)}
                      className="flex items-start gap-3.5 p-4 rounded-2xl border-2 transition-all duration-150 cursor-pointer text-left"
                      style={{ borderColor: sel ? s.color : C.border, background: sel ? s.light : C.white }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: sel ? s.color : C.grayL }}>
                        <Icon size={18} color={sel ? "white" : C.muted} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm" style={{ color: sel ? s.color : C.text }}>{s.label}</div>
                        <div className="text-xs mt-0.5" style={{ color: C.muted }}>From {s.from} · {s.time}</div>
                      </div>
                      {sel && <Check size={16} style={{ color: s.color }} className="shrink-0 mt-0.5" />}
                    </button>
                  );
                })}
              </div>
              <button disabled={!svc} onClick={goNext}
                className="mt-6 w-full py-4 rounded-2xl font-black text-white text-base transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: C.cyan }}>
                Continue →
              </button>
            </div>
          )}

          {/* Step: Size */}
          {step === "size" && (
            <div className="p-7">
              <button onClick={() => setStep("service")} className="text-xs text-slate-400 hover:text-slate-600 mb-5 flex items-center gap-1 cursor-pointer transition-colors">
                <ChevronLeft size={13}/> Back
              </button>
              <h3 className="text-xl font-black mb-2" style={{ color: C.cyanD }}>What size is your space?</h3>
              <p className="text-sm mb-6" style={{ color: C.muted }}>This helps us estimate the time and price for your clean.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {HOME_SIZES.map(s => (
                  <button key={s} onClick={() => setSize(s)}
                    className="py-4 px-3 rounded-2xl border-2 text-sm font-bold transition-all duration-150 cursor-pointer"
                    style={{ borderColor: size === s ? C.cyan : C.border, background: size === s ? C.cyanL : C.white, color: size === s ? C.cyan : C.text }}>
                    {s}
                    {size === s && <span className="block text-xs font-normal mt-0.5" style={{ color: C.cyan }}>Selected</span>}
                  </button>
                ))}
              </div>
              <button disabled={!size} onClick={goNext}
                className="mt-6 w-full py-4 rounded-2xl font-black text-white text-base transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: C.cyan }}>
                Continue →
              </button>
            </div>
          )}

          {/* Step: Date */}
          {step === "date" && (
            <div className="p-7">
              <button onClick={() => setStep(skipSize ? "service" : "size")} className="text-xs text-slate-400 hover:text-slate-600 mb-5 flex items-center gap-1 cursor-pointer transition-colors">
                <ChevronLeft size={13}/> Back
              </button>
              <h3 className="text-xl font-black mb-6" style={{ color: C.cyanD }}>Pick a date.</h3>
              {/* Month nav */}
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setMonthOffset(o => Math.max(0, o-1))} disabled={monthOffset === 0}
                  className="w-9 h-9 rounded-xl flex items-center justify-center border cursor-pointer hover:bg-slate-50 disabled:opacity-30 transition-colors"
                  style={{ borderColor: C.border }}>
                  <ChevronLeft size={16} className="text-slate-500"/>
                </button>
                <span className="font-black text-base" style={{ color: C.cyanD }}>{MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}</span>
                <button onClick={() => setMonthOffset(o => Math.min(2, o+1))} disabled={monthOffset === 2}
                  className="w-9 h-9 rounded-xl flex items-center justify-center border cursor-pointer hover:bg-slate-50 disabled:opacity-30 transition-colors"
                  style={{ borderColor: C.border }}>
                  <ChevronRight size={16} className="text-slate-500"/>
                </button>
              </div>
              <div className="grid grid-cols-7 mb-1">
                {DAYS.map(d => <div key={d} className="text-center py-2 text-xs font-bold text-slate-400">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calDays.map((d, i) => {
                  if (!d) return <div key={`e${i}`} />;
                  const avail = isAvail(d);
                  const sel = isSel(d);
                  const tod = isToday(d);
                  const sameDay = isSameDay(d);
                  return (
                    <button key={dk(d)} onClick={() => { if (avail) { setSelDate(d); setStep("time"); } }}
                      disabled={!avail}
                      className="relative h-10 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer disabled:cursor-not-allowed"
                      style={{
                        background: sel ? C.cyan : sameDay ? C.yellowL : "transparent",
                        color: sel ? "white" : tod ? C.yellow : avail ? C.text : "#CBD5E1",
                        border: tod && !sel ? `1.5px solid ${C.yellow}` : "none",
                      }}
                      onMouseEnter={e => { if (avail && !sel) (e.currentTarget as HTMLButtonElement).style.background = C.cyanL; }}
                      onMouseLeave={e => { if (avail && !sel) (e.currentTarget as HTMLButtonElement).style.background = sameDay ? C.yellowL : "transparent"; }}
                    >
                      {d.getDate()}
                      {sameDay && !sel && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-bold" style={{ color: C.yellow }}>TODAY</span>}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-xs" style={{ color: C.muted }}>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ background: C.cyan }}/> Available</div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border" style={{ borderColor: C.yellow }}/>Today</div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-200"/>Booked</div>
              </div>
            </div>
          )}

          {/* Step: Time */}
          {step === "time" && selDate && (
            <div className="p-7">
              <button onClick={() => setStep("date")} className="text-xs text-slate-400 hover:text-slate-600 mb-5 flex items-center gap-1 cursor-pointer transition-colors">
                <ChevronLeft size={13}/> Back
              </button>
              <h3 className="text-xl font-black mb-1" style={{ color: C.cyanD }}>Choose a time.</h3>
              <p className="text-sm mb-5" style={{ color: C.muted }}>{fmtDate(selDate)}</p>
              <div className="grid grid-cols-3 gap-2 mb-6">
                {TIME_SLOTS.map(t => (
                  <button key={t} onClick={() => setSelTime(t)}
                    className="py-3 rounded-xl border-2 text-sm font-semibold transition-all duration-150 cursor-pointer"
                    style={{ borderColor: selTime === t ? C.cyan : C.border, background: selTime === t ? C.cyanL : C.white, color: selTime === t ? C.cyan : C.text }}>
                    {t}
                  </button>
                ))}
              </div>
              {/* Recurring toggle */}
              <div className="rounded-2xl p-4 mb-6" style={{ background: C.mintL, border: `1px solid #A7F3D0` }}>
                <div className="text-sm font-bold mb-3" style={{ color: "#065F46" }}>Save 15–20% with a recurring plan:</div>
                <div className="flex gap-2 flex-wrap">
                  {([["once","One-Time"],["weekly","Every Week"],["biweekly","Bi-Weekly"]] as const).map(([v,l]) => (
                    <button key={v} onClick={() => setRecurring(v)}
                      className="px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      style={{ background: recurring === v ? C.mint : "white", color: recurring === v ? "white" : C.muted, border: `1px solid ${recurring === v ? C.mint : C.border}` }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <button disabled={!selTime} onClick={goNext}
                className="w-full py-4 rounded-2xl font-black text-white text-base transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: C.cyan }}>
                Continue →
              </button>
            </div>
          )}

          {/* Step: Info */}
          {step === "info" && (
            <div className="p-7">
              <button onClick={() => setStep("time")} className="text-xs text-slate-400 hover:text-slate-600 mb-5 flex items-center gap-1 cursor-pointer transition-colors">
                <ChevronLeft size={13}/> Back
              </button>
              {/* Summary pill */}
              <div className="flex flex-wrap gap-2 mb-6">
                {[selectedSvc?.label, selDate && fmtDate(selDate), selTime, recurring !== "once" ? (recurring === "weekly" ? "Every Week" : "Bi-Weekly") : "One-Time"].filter(Boolean).map(v => (
                  <span key={v} className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: C.cyanL, color: C.cyan }}>{v}</span>
                ))}
              </div>
              <h3 className="text-xl font-black mb-6" style={{ color: C.cyanD }}>Your details.</h3>
              <form onSubmit={e => { e.preventDefault(); setStep("done"); }} className="flex flex-col gap-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: C.muted }}>Full Name</label>
                    <input required type="text" placeholder="Sarah Martinez" value={form.name} onChange={e => setForm({...form,name:e.target.value})}
                      className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors" style={{ borderColor:C.border, color:C.text }}
                      onFocus={e => e.target.style.borderColor = C.cyan}
                      onBlur={e => e.target.style.borderColor = C.border}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: C.muted }}>Phone</label>
                    <input required type="tel" placeholder="(214) 000-0000" value={form.phone} onChange={e => setForm({...form,phone:e.target.value})}
                      className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors" style={{ borderColor:C.border, color:C.text }}
                      onFocus={e => e.target.style.borderColor = C.cyan}
                      onBlur={e => e.target.style.borderColor = C.border}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: C.muted }}>Email</label>
                  <input type="email" placeholder="you@email.com" value={form.email} onChange={e => setForm({...form,email:e.target.value})}
                    className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors" style={{ borderColor:C.border, color:C.text }}
                    onFocus={e => e.target.style.borderColor = C.cyan}
                    onBlur={e => e.target.style.borderColor = C.border}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: C.muted }}>Service Address</label>
                  <input required type="text" placeholder="1234 Oak St, Dallas, TX 75201" value={form.notes} onChange={e => setForm({...form,notes:e.target.value})}
                    className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors" style={{ borderColor:C.border, color:C.text }}
                    onFocus={e => e.target.style.borderColor = C.cyan}
                    onBlur={e => e.target.style.borderColor = C.border}
                  />
                </div>
                <button type="submit" className="w-full py-4 rounded-2xl font-black text-white text-base transition-all cursor-pointer hover:opacity-90" style={{ background: C.cyan }}>
                  <Calendar size={17} className="inline mr-2 -mt-0.5"/> Confirm Booking
                </button>
              </form>
            </div>
          )}

          {/* Step: Done */}
          {step === "done" && (
            <div className="p-10 text-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: C.mintL }}>
                <Check size={36} style={{ color: C.mint }} />
              </div>
              <h3 className="text-2xl font-black mb-2" style={{ color: C.cyanD }}>You're on the schedule!</h3>
              <p className="text-sm mb-8" style={{ color: C.muted }}>
                We'll confirm your booking by text within 30 minutes.
                <br />
                <span className="font-semibold">{selectedSvc?.label}</span> · {selDate && fmtDate(selDate)} · {selTime}
              </p>
              <div className="rounded-2xl p-5 text-left mb-6" style={{ background: C.cyanL }}>
                {["Confirmation text sent within 30 min","Team arrives in uniform with all supplies","100% satisfaction guarantee — we'll re-clean if anything's off"].map(item => (
                  <div key={item} className="flex items-center gap-2.5 py-2 text-sm" style={{ color: C.cyanD }}>
                    <Check size={14} style={{ color: C.cyan }} className="shrink-0"/>{item}
                  </div>
                ))}
              </div>
              <a href={`tel:${PHONE}`} className="text-sm font-bold cursor-pointer" style={{ color: C.cyan }}>Questions? Call us: {PHONE}</a>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function BellaShine() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [testimonialIdx, setTestimonialIdx] = useState(0);

  const prevT = () => setTestimonialIdx(i => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  const nextT = () => setTestimonialIdx(i => (i + 1) % TESTIMONIALS.length);

  return (
    <div className="font-sans bg-white overflow-x-hidden" style={{ color: C.text }}>
      <style>{`
        @keyframes blob-drift {
          0%, 100% { transform: translate(0,0) scale(1); }
          33% { transform: translate(20px,-15px) scale(1.04); }
          66% { transform: translate(-10px, 20px) scale(0.97); }
        }
        @keyframes sparkle-ping {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50%       { transform: scale(1.3); opacity: 1; }
        }
        .blob { animation: blob-drift 10s ease-in-out infinite; }
        .sparkle-anim { animation: sparkle-ping 2.5s ease-in-out infinite; }
      `}</style>

      {/* ── FLOATING PILL NAVBAR ── */}
      <div className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4">
        <nav className="w-full max-w-5xl rounded-2xl shadow-xl border flex items-center justify-between px-4 py-3 gap-3" style={{ background:"rgba(255,255,255,0.97)", borderColor:C.border, backdropFilter:"blur(12px)" }}>
          <BellaLogo className="w-44 shrink-0" />
          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {[["Services","#services"],["How It Works","#how"],["Reviews","#reviews"],["FAQ","#faq"]].map(([l,h]) => (
              <a key={l} href={h} className="px-3 py-1.5 rounded-xl text-sm font-medium transition-colors cursor-pointer hover:text-cyan-600" style={{ color:C.muted }}>
                {l}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a href={`tel:${PHONE}`} className="hidden sm:flex items-center gap-1.5 text-sm font-semibold transition-colors cursor-pointer" style={{ color:C.muted }}>
              <Phone size={13}/>{PHONE}
            </a>
            <a href="#book" className="flex items-center gap-1.5 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer hover:opacity-90 shadow-sm" style={{ background:C.cyan }}>
              <Calendar size={13}/> Book Now
            </a>
            <button onClick={() => setMenuOpen(v => !v)} className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer" style={{ background:C.grayL }}>
              {menuOpen ? <X size={18} color={C.text}/> : <Menu size={18} color={C.text}/>}
            </button>
          </div>
        </nav>
        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="absolute top-full mt-2 left-4 right-4 rounded-2xl border shadow-xl py-3 px-4" style={{ background:"rgba(255,255,255,0.98)", borderColor:C.border }}>
            {[["Services","#services"],["How It Works","#how"],["Reviews","#reviews"],["FAQ","#faq"],["Book Now","#book"]].map(([l,h]) => (
              <a key={l} href={h} onClick={() => setMenuOpen(false)}
                className="block px-3 py-3 rounded-xl text-sm font-semibold transition-colors cursor-pointer hover:bg-slate-50" style={{ color:C.text }}>
                {l}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center pt-24 pb-16 px-6 overflow-hidden" style={{ background:`linear-gradient(135deg, ${C.cyanL} 0%, white 45%, ${C.mintL} 100%)` }}>
        {/* Decorative blobs — KEEP as brand organic feel */}
        <div className="blob absolute -top-20 -left-24 w-96 h-96 rounded-full pointer-events-none" style={{ background:`${C.cyan}18`, filter:"blur(60px)" }} aria-hidden />
        <div className="blob absolute -bottom-24 -right-20 w-80 h-80 rounded-full pointer-events-none" style={{ background:`${C.mint}15`, filter:"blur(60px)", animationDelay:"3s" }} aria-hidden />
        <div className="blob absolute top-1/3 right-1/3 w-56 h-56 rounded-full pointer-events-none" style={{ background:`${C.yellow}18`, filter:"blur(50px)", animationDelay:"6s" }} aria-hidden />

        <div className="relative z-10 max-w-7xl mx-auto w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: text */}
            <div>
              {/* CRO: credibility hook above headline */}
              <div className="inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-xs font-bold mb-7 border" style={{ borderColor:`${C.cyan}40`, background:C.white, color:C.cyan }}>
                <div className="sparkle-anim w-2 h-2 rounded-full" style={{ background:C.yellow }}/>
                4.9★ · Dallas's Most Trusted Cleaning Team
              </div>
              <h1 className="text-[clamp(2.8rem,5.5vw,4.5rem)] font-black leading-[0.95] tracking-tight mb-6" style={{ color:C.cyanD }}>
                A Cleaner Home,<br />
                <span style={{ color:C.cyan }}>A Brighter Life.</span>
              </h1>
              <p className="text-lg leading-relaxed mb-8 max-w-md" style={{ color:C.muted }}>
                Bella Shine brings professional, eco-friendly cleaning to homes and offices across Dallas. Punctual, pet-safe, and satisfaction guaranteed.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3 mb-10">
                <a href="#book" className="flex items-center justify-center gap-2 text-white font-black px-7 py-4 rounded-2xl text-base transition-all cursor-pointer hover:opacity-90 hover:shadow-xl" style={{ background:C.cyan }}>
                  <Calendar size={18}/> Book a Cleaning
                </a>
                <a href={`tel:${PHONE}`} className="flex items-center justify-center gap-2 font-bold px-7 py-4 rounded-2xl text-base border transition-all cursor-pointer" style={{ borderColor:C.border, color:C.text }}
                  onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.borderColor = C.cyan}
                  onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.borderColor = C.border}
                >
                  <Phone size={18}/> Free Estimate
                </a>
              </div>

              {/* Trust pills */}
              <div className="flex flex-wrap gap-2">
                {[
                  [Leaf,   "Eco-Friendly",       C.mint],
                  [Shield, "Licensed & Insured",  C.cyan],
                  [Zap,    "Same-Day Available",  C.yellow],
                  [Award,  "Pet-Safe Products",   "#8B5CF6"],
                ].map(([Icon, label, color]) => (
                  <div key={label as string} className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-full border" style={{ borderColor:`${color}30`, background:`${color}10`, color:color as string }}>
                    {/* @ts-ignore */}
                    <Icon size={12}/>{label as string}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: circular photo + floating cards */}
            <div className="relative flex items-center justify-center" style={{ minHeight:420 }}>
              {/* Main circular image */}
              <div className="relative w-72 h-72 md:w-80 md:h-80 rounded-full overflow-hidden border-4 shadow-2xl" style={{ borderColor:C.cyan }}>
                <img
                  src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=640&q=85"
                  alt="Freshly cleaned bright living room by Bella Shine"
                  className="w-full h-full object-cover"
                  loading="eager"
                />
                {/* Teal ring */}
                <div className="absolute inset-0 rounded-full" style={{ boxShadow:`inset 0 0 0 4px ${C.cyan}` }} />
              </div>

              {/* Floating cards */}
              <div className="absolute -top-4 -left-4 md:-left-10 rounded-2xl px-4 py-3 shadow-lg border" style={{ background:C.white, borderColor:C.border }}>
                <div className="flex gap-0.5 mb-0.5">{[...Array(5)].map((_,i) => <Star key={i} size={11} fill={C.yellow} style={{ color:C.yellow }}/>)}</div>
                <div className="font-black text-lg leading-none" style={{ color:C.cyanD }}>4.9</div>
                <div className="text-[10px]" style={{ color:C.muted }}>300+ reviews</div>
              </div>

              <div className="absolute -bottom-2 -left-6 md:-left-12 rounded-2xl px-4 py-3 shadow-lg border" style={{ background:C.white, borderColor:C.border }}>
                <div className="font-black text-2xl leading-none" style={{ color:C.cyan }}>1,500+</div>
                <div className="text-[10px] mt-0.5" style={{ color:C.muted }}>Homes Cleaned</div>
              </div>

              <div className="absolute -top-2 -right-4 md:-right-10 rounded-2xl px-4 py-3 shadow-lg border" style={{ background:`${C.mintL}`, borderColor:"#A7F3D0" }}>
                <div className="flex items-center gap-1.5">
                  <Leaf size={14} style={{ color:C.mint }}/>
                  <span className="font-bold text-sm" style={{ color:"#065F46" }}>Eco-Safe</span>
                </div>
                <div className="text-[10px] mt-0.5" style={{ color:C.muted }}>Pet & kid friendly</div>
              </div>

              <div className="absolute -bottom-4 -right-2 md:-right-8 rounded-2xl px-4 py-3 shadow-lg border" style={{ background:C.yellowL, borderColor:"#FDE68A" }}>
                <div className="flex items-center gap-1.5">
                  <Zap size={14} style={{ color:C.yellow }}/>
                  <span className="font-bold text-sm" style={{ color:"#92400E" }}>Same Day</span>
                </div>
                <div className="text-[10px] mt-0.5" style={{ color:C.muted }}>Available now</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <WaveDivider topColor="white" bottomColor={C.grayL} />

      {/* ── SERVICES ── */}
      <section id="services" className="py-20 px-6" style={{ background:C.grayL }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-12">
            <div>
              <span className="text-xs font-bold tracking-widest uppercase" style={{ color:C.cyan }}>Our Services</span>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight mt-2" style={{ color:C.cyanD }}>Clean Anything.<br />We Handle It.</h2>
            </div>
            <a href="#book" className="shrink-0 flex items-center gap-2 text-white font-bold px-5 py-3 rounded-xl text-sm cursor-pointer hover:opacity-90 transition-opacity" style={{ background:C.cyan }}>
              <Calendar size={14}/> Book Online
            </a>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {SERVICES.map((svc, i) => {
              const Icon = svc.Icon;
              return (
                <a href="#book" key={svc.id}
                  className="group relative bg-white rounded-2xl p-5 border transition-all duration-200 hover:shadow-lg cursor-pointer flex flex-col"
                  style={{ borderColor:C.border, borderTopWidth:3, borderTopColor:svc.color }}>
                  {/* Large number in bg */}
                  <span className="absolute right-4 top-3 text-6xl font-black leading-none select-none pointer-events-none" style={{ color:`${svc.color}10` }}>
                    {String(i+1).padStart(2,"0")}
                  </span>
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4" style={{ background:svc.light }}>
                    <Icon size={20} style={{ color:svc.color }}/>
                  </div>
                  <div className="font-black text-base mb-1 group-hover:text-[var(--clr)] transition-colors" style={{ color:C.text, "--clr":svc.color } as React.CSSProperties}>{svc.label}</div>
                  <p className="text-xs leading-relaxed flex-1" style={{ color:C.muted }}>{svc.desc}</p>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t" style={{ borderColor:C.border }}>
                    <span className="text-xs font-bold" style={{ color:svc.color }}>From {svc.from}</span>
                    <span className="text-xs" style={{ color:C.muted }}>{svc.time}</span>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <WaveDivider topColor={C.grayL} bottomColor={C.white} />

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color:C.cyan }}>The Process</span>
          <h2 className="text-4xl font-black tracking-tight mt-2 mb-14" style={{ color:C.cyanD }}>Simple. Fast. Spotless.</h2>
          <div className="relative grid md:grid-cols-3 gap-8">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-8 left-1/6 right-1/6 h-0.5" style={{ background:`linear-gradient(to right, ${C.cyan}, ${C.mint})`, left:"18%", right:"18%" }} />
            {[
              { n:"01", title:"Book in 60 Seconds", body:"Pick your service and date online — or call us. We confirm within 30 minutes.", Icon:Calendar },
              { n:"02", title:"We Show Up On Time", body:"Your dedicated Bella Shine team arrives in uniform with all eco-friendly supplies.", Icon:Clock },
              { n:"03", title:"Enjoy a Spotless Space", body:"Come home (or back to the office) to a freshly cleaned space. Guaranteed.", Icon:Award },
            ].map(step => {
              const Icon = step.Icon;
              return (
                <div key={step.n} className="flex flex-col items-center text-center gap-4">
                  <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg" style={{ background:`linear-gradient(135deg, ${C.cyan}, ${C.mint})` }}>
                    <Icon size={24} color="white"/>
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black text-white" style={{ background:C.yellow }}>
                      {step.n.slice(1)}
                    </div>
                  </div>
                  <h3 className="font-black text-lg" style={{ color:C.cyanD }}>{step.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color:C.muted }}>{step.body}</p>
                </div>
              );
            })}
          </div>
          <a href="#book" className="inline-flex items-center gap-2 text-white font-black px-8 py-4 rounded-2xl mt-14 text-base cursor-pointer hover:opacity-90 transition-opacity shadow-lg" style={{ background:C.cyan }}>
            <Calendar size={18}/> Book My Cleaning
          </a>
        </div>
      </section>

      {/* ── STATS STRIP ── */}
      <div className="py-12 px-6" style={{ background:`linear-gradient(135deg, ${C.cyan} 0%, #0E7490 100%)` }}>
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[["1,500+","Clients Served"],["4.9★","Google Rating"],["12","Cleaning Specialists"],["2018","Est. in Dallas"]].map(([v,l]) => (
            <div key={l}>
              <div className="text-4xl font-black text-white leading-none">{v}</div>
              <div className="text-xs mt-1.5 text-white/60">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── TESTIMONIALS ── */}
      <section id="reviews" className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
            <div>
              <span className="text-xs font-bold tracking-widest uppercase" style={{ color:C.cyan }}>Reviews</span>
              <h2 className="text-4xl font-black tracking-tight mt-2" style={{ color:C.cyanD }}>Dallas Loves<br />Bella Shine.</h2>
            </div>
            <div className="flex items-center gap-3 rounded-2xl p-4 border" style={{ borderColor:C.border }}>
              <div className="text-4xl font-black" style={{ color:C.cyanD }}>4.9</div>
              <div>
                <div className="flex gap-0.5 mb-0.5">{[...Array(5)].map((_,i) => <Star key={i} size={13} fill={C.yellow} style={{ color:C.yellow }}/>)}</div>
                <div className="text-xs" style={{ color:C.muted }}>300+ Google Reviews</div>
              </div>
            </div>
          </div>

          {/* Featured testimonial (large card) */}
          <div className="relative rounded-3xl p-8 sm:p-10 mb-5 border overflow-hidden" style={{ background:C.cyanL, borderColor:C.cyan100 }}>
            {/* Giant quote mark — KEEP as design element */}
            <svg className="absolute top-4 right-6 opacity-10" width="80" height="60" viewBox="0 0 80 60" aria-hidden>
              <path d="M0,0 L30,0 L20,30 L30,30 L30,60 L0,60 Z M50,0 L80,0 L70,30 L80,30 L80,60 L50,60 Z" fill={C.cyan}/>
            </svg>
            <div className="relative z-10">
              <div className="flex gap-0.5 mb-4">{[...Array(TESTIMONIALS[testimonialIdx].stars)].map((_,i) => <Star key={i} size={15} fill={C.yellow} style={{ color:C.yellow }}/>)}</div>
              <p className="text-lg sm:text-xl leading-relaxed font-medium mb-6" style={{ color:C.cyanD }}>
                "{TESTIMONIALS[testimonialIdx].text}"
              </p>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full overflow-hidden border-2" style={{ borderColor:C.cyan200 }}>
                    <img src={`https://images.unsplash.com/photo-${TESTIMONIALS[testimonialIdx].img}?auto=format&fit=crop&w=80&h=80&q=80`} alt={TESTIMONIALS[testimonialIdx].name} className="w-full h-full object-cover"/>
                  </div>
                  <div>
                    <div className="font-black text-sm" style={{ color:C.cyanD }}>{TESTIMONIALS[testimonialIdx].name}</div>
                    <div className="text-xs flex items-center gap-1" style={{ color:C.muted }}><MapPin size={9}/>{TESTIMONIALS[testimonialIdx].loc}</div>
                  </div>
                </div>
                <span className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background:C.cyan200, color:C.cyanD }}>{TESTIMONIALS[testimonialIdx].job}</span>
              </div>
            </div>
          </div>

          {/* Carousel nav + mini dots */}
          <div className="flex items-center gap-3 justify-between">
            <div className="flex gap-2">
              {TESTIMONIALS.map((_, i) => (
                <button key={i} onClick={() => setTestimonialIdx(i)} className="transition-all duration-200 rounded-full cursor-pointer" style={{ width:i === testimonialIdx ? 24 : 8, height:8, background:i === testimonialIdx ? C.cyan : C.border }}/>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={prevT} className="w-10 h-10 rounded-xl border flex items-center justify-center cursor-pointer hover:border-cyan-400 transition-colors" style={{ borderColor:C.border }}>
                <ChevronLeft size={16} style={{ color:C.muted }}/>
              </button>
              <button onClick={nextT} className="w-10 h-10 rounded-xl border flex items-center justify-center cursor-pointer hover:border-cyan-400 transition-colors" style={{ borderColor:C.border }}>
                <ChevronRight size={16} style={{ color:C.muted }}/>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── BOOKING CALENDAR ── */}
      <WaveDivider topColor={C.white} bottomColor={C.cyanL} />
      <BookingSection />
      <WaveDivider topColor={C.cyanL} bottomColor={C.grayL} />

      {/* ── FAQ ── */}
      <section id="faq" className="py-20 px-6" style={{ background:C.grayL }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color:C.cyan }}>FAQ</span>
            <h2 className="text-4xl font-black tracking-tight mt-2" style={{ color:C.cyanD }}>Got Questions?</h2>
          </div>
          <div className="flex flex-col gap-3 mb-12">
            {FAQS.map(f => <FaqItem key={f.q} {...f}/>)}
          </div>
          <div className="text-center">
            <p className="mb-4 text-sm" style={{ color:C.muted }}>Still have questions? We're happy to talk.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href="#book" className="flex items-center justify-center gap-2 text-white font-black px-7 py-4 rounded-2xl text-base cursor-pointer hover:opacity-90 transition-opacity" style={{ background:C.cyan }}>
                <Calendar size={17}/> Book a Cleaning
              </a>
              <a href={`tel:${PHONE}`} className="flex items-center justify-center gap-2 font-bold px-7 py-4 rounded-2xl text-base border cursor-pointer transition-colors" style={{ borderColor:C.border, color:C.text }}>
                <Phone size={17}/>{PHONE}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER — two-panel ── */}
      <footer className="pb-24 md:pb-0">
        <div className="grid md:grid-cols-2">
          {/* Left: teal panel */}
          <div className="px-8 py-14" style={{ background:`linear-gradient(135deg, ${C.cyanD} 0%, ${C.cyan} 100%)` }}>
            <BellaLogo dark className="w-52 mb-6"/>
            <p className="text-white/60 text-sm leading-relaxed mb-8 max-w-sm">
              Family-owned cleaning company serving Dallas and surrounding areas since 2018. Eco-friendly, reliable, and always on time.
            </p>
            <div className="flex flex-col gap-3">
              <a href={`tel:${PHONE}`} className="flex items-center gap-3 text-white font-bold text-base cursor-pointer hover:opacity-80 transition-opacity">
                <Phone size={17}/>{PHONE}
              </a>
              <a href={`mailto:${EMAIL}`} className="flex items-center gap-3 text-white/60 text-sm cursor-pointer hover:text-white transition-colors">
                <Mail size={15}/>{EMAIL}
              </a>
              <div className="flex items-center gap-3 text-white/60 text-sm">
                <Clock size={15}/> Mon–Sat: 8:00 AM – 6:00 PM
              </div>
              <div className="flex items-center gap-3 text-white/60 text-sm">
                <MapPin size={15}/> Dallas, TX & Surrounding Areas
              </div>
            </div>
          </div>
          {/* Right: white panel */}
          <div className="px-8 py-14 bg-white">
            <div className="grid grid-cols-2 gap-8 mb-10">
              <div>
                <h4 className="font-black text-xs uppercase tracking-widest mb-4" style={{ color:C.muted }}>Services</h4>
                <ul className="space-y-2.5">
                  {SERVICES.map(s => (
                    <li key={s.id}><a href="#book" className="text-sm cursor-pointer transition-colors" style={{ color:C.muted }}
                      onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = C.cyan}
                      onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = C.muted}
                    >{s.label}</a></li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-black text-xs uppercase tracking-widest mb-4" style={{ color:C.muted }}>Benefits</h4>
                <ul className="space-y-2.5">
                  {["Free Estimates","Licensed & Insured","Eco-Friendly Products","Same-Day Available","Satisfaction Guaranteed","Pet-Safe Products"].map(b => (
                    <li key={b} className="flex items-center gap-2 text-sm" style={{ color:C.muted }}>
                      <Check size={12} style={{ color:C.mint }}/>{b}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3" style={{ borderColor:C.border }}>
              <p className="text-xs" style={{ color:C.muted }}>© 2024 Bella Shine Cleaning Services LLC · Dallas, TX</p>
              <p className="text-xs" style={{ color:C.muted }}>Built by <span className="font-bold" style={{ color:C.cyan }}>Acrosoft Labs</span></p>
            </div>
          </div>
        </div>
      </footer>

      {/* ── STICKY MOBILE BAR ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t px-4 py-3 flex gap-3" style={{ background:"rgba(255,255,255,0.98)", borderColor:C.border, backdropFilter:"blur(8px)" }}>
        <a href="#book" className="flex-1 flex items-center justify-center gap-2 text-white font-black py-3.5 rounded-2xl text-base cursor-pointer hover:opacity-90 transition-opacity" style={{ background:C.cyan }}>
          <Calendar size={17}/> Book Cleaning
        </a>
        <a href={`tel:${PHONE}`} className="flex-1 flex items-center justify-center gap-2 font-bold py-3.5 rounded-2xl text-sm border cursor-pointer transition-colors" style={{ borderColor:C.border, color:C.text }}>
          <Phone size={15}/>{PHONE}
        </a>
      </div>
    </div>
  );
}
