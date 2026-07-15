import { useState, useEffect } from "react";
import { Phone, MapPin, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Zap, ShieldCheck, Leaf, Check } from "lucide-react";

const PHONE_MAIN = "8634485782";
const PHONE_MAIN_DISPLAY = "(863) 448-5782";
const PHONE_ALT = "8634485519";
const PHONE_ALT_DISPLAY = "(863) 448-5519";
const OWNER = "Jairo González";
const MANAGER = "Mirna Herriquez";

const TICKER_ITEMS = [
  "Garden Design", "Lawn Trimming", "Tree Cutting", "Stone Installation",
  "Sod Planting", "Flower Planting", "Emergency Service", "Work Guarantee",
  "Lawn Maintenance", "Plant Renovation",
];

const SERVICES = [
  {
    num: "01", title: "Garden Design", subtitle: "Custom aesthetic planning",
    desc: "We design gardens that complement your property and Florida's climate — from minimalist tropical to lush arrangements. Every design is tailored to your vision and lifestyle.",
    photo: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    num: "02", title: "Lawn & Hedge Trimming", subtitle: "Precision cutting & shaping",
    desc: "Professional trimming and shaping of hedges, shrubs, and ornamental plants. We preserve plant health while keeping your property looking immaculate year-round.",
    photo: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=80",
  },
  {
    num: "03", title: "Lawn Maintenance", subtitle: "Scheduled upkeep programs",
    desc: "Recurring maintenance programs covering mowing, edging, blowing, and seasonal upkeep. We handle everything so you can simply enjoy your outdoor space.",
    photo: "https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    num: "04", title: "Full Landscaping", subtitle: "Complete property transformation",
    desc: "From bare ground to beautiful landscape — site preparation, grading, plant selection, and full installation for front and back yards. Complete transformations, no corners cut.",
    photo: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=1200&q=80",
  },
  {
    num: "05", title: "Tree Cutting & Removal", subtitle: "Safe removal, any size",
    desc: "Professional cutting and removal of trees and palms of all sizes. Full cleanup and debris removal always included. Emergency response available when storm damage strikes.",
    photo: "https://images.unsplash.com/photo-1474742817425-9f91918183b7?auto=format&fit=crop&w=1200&q=80",
  },
  {
    num: "06", title: "Stone & Rock Installation", subtitle: "Decorative & functional stonework",
    desc: "Installation of decorative rocks, river stones, pavers, and border edging. Long-lasting beauty that reduces maintenance and outperforms plain mulch or ground covers.",
    photo: "https://images.unsplash.com/photo-1564419431293-a3c7ab37f22b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    num: "07", title: "Sod & Flower Planting", subtitle: "Fresh grass and seasonal blooms",
    desc: "Installation of St. Augustine, Zoysia, and Bahia sod varieties, plus seasonal flower planting in beds and containers. Transform bare ground into a vibrant landscape.",
    photo: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    num: "08", title: "Plant Removal & Renovation", subtitle: "Out with old, in with new",
    desc: "Complete removal of dead, overgrown, or unwanted plants followed by fresh new installations. Perfect for property refresh before a sale or after storm damage.",
    photo: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=1200&q=80",
  },
];

const FAQS = [
  {
    q: "Do you respond to landscaping emergencies?",
    a: "Yes — we respond to storm damage, fallen trees, and urgent landscaping needs. Call (863) 448-5782 any time and we'll assess your situation promptly.",
  },
  {
    q: "Is there a warranty on your work?",
    a: "We stand behind every job with a satisfaction guarantee. If the results don't meet your expectations, we come back and make it right — no excuses, no extra charges.",
  },
  {
    q: "What areas do you serve?",
    a: "We primarily serve Punta Gorda and Port Charlotte, Florida, including surrounding communities in Charlotte County. Call us to confirm coverage for your address.",
  },
  {
    q: "How do I get a quote?",
    a: "Call (863) 448-5782 to request a free on-site consultation. We'll visit your property and provide a detailed estimate with no obligation to hire.",
  },
];

// ── LOGO ─────────────────────────────────────────────────────────────────────
function GHLogo({ variant = "dark", className = "" }: { variant?: "dark" | "light"; className?: string }) {
  const textColor = variant === "dark" ? "#F2EDE3" : "#162018";
  const subColor = variant === "dark" ? "rgba(242,237,227,0.5)" : "#7A6E64";
  return (
    <svg viewBox="0 0 300 72" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Gonzalez Herriquez Landscaping" role="img">
      <polygon points="36,4 60,18 60,50 36,64 12,50 12,18" fill="#2A4D33" />
      <line x1="36" y1="52" x2="36" y2="22" stroke="#5A8A6B" strokeWidth="2" strokeLinecap="round" />
      <path d="M36,40 C29,33 20,29 20,19 C27,22 34,29 36,40" fill="#7DB87F" />
      <path d="M36,36 C43,29 52,26 52,16 C45,19 38,26 36,36" fill="#5A8A6B" />
      <circle cx="36" cy="19" r="2.5" fill="#B86A30" />
      <text x="76" y="30" fontFamily="'Outfit',sans-serif" fontWeight="800" fontSize="19" fill={textColor} letterSpacing="-0.5">GONZALEZ HERRIQUEZ</text>
      <text x="77" y="46" fontFamily="'Outfit',sans-serif" fontWeight="500" fontSize="10" fill="#5A8A6B" letterSpacing="3.5">LANDSCAPING</text>
      <line x1="77" y1="53" x2="295" y2="53" stroke={variant === "dark" ? "rgba(242,237,227,0.15)" : "#D8D0C4"} strokeWidth="0.8" />
      <text x="77" y="63" fontFamily="'Work Sans',sans-serif" fontWeight="400" fontSize="8" fill={subColor} letterSpacing="1.5">PUNTA GORDA & PORT CHARLOTTE, FL</text>
    </svg>
  );
}

function GHBadge({ size = 38 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <polygon points="36,4 62,19 62,53 36,68 10,53 10,19" fill="#2A4D33" />
      <line x1="36" y1="56" x2="36" y2="22" stroke="#5A8A6B" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M36,43 C28,35 18,30 18,19 C26,23 34,31 36,43" fill="#7DB87F" />
      <path d="M36,38 C44,30 54,26 54,15 C46,19 38,27 36,38" fill="#5A8A6B" />
      <circle cx="36" cy="19" r="3.5" fill="#B86A30" />
    </svg>
  );
}

// ── FAQ ITEM ──────────────────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border-b transition-colors ${open ? "border-[#2A4D33]" : "border-[#D8D0C4]"}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left cursor-pointer"
        aria-expanded={open}
      >
        <span className={`font-bold text-base leading-snug transition-colors ${open ? "text-[#2A4D33]" : "text-[#162018]"}`}>{q}</span>
        {open
          ? <ChevronUp size={18} className="text-[#B86A30] shrink-0" />
          : <ChevronDown size={18} className="text-[#5C5044] shrink-0" />}
      </button>
      {open && <div className="pb-5 text-[#3E3530] text-sm leading-relaxed">{a}</div>}
    </div>
  );
}

// ── CTA STRIP ────────────────────────────────────────────────────────────────
function CTAStrip({ variant = "dark", headline = "Ready to transform your outdoor space?" }: { variant?: "dark" | "terra"; headline?: string }) {
  return (
    <div className={`py-12 px-4 ${variant === "dark" ? "bg-[#162018]" : "bg-[#B86A30]"}`}>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <p className="font-black text-xl text-white gh-heading">{headline}</p>
          <p className={`text-sm mt-1.5 ${variant === "dark" ? "text-white/65" : "text-white/80"}`}>
            Free on-site consultation · Work guarantee on every job
          </p>
        </div>
        <a href="#booking"
          className={`w-full sm:w-auto sm:shrink-0 flex flex-col items-center justify-center px-8 py-3.5 rounded-xl border-2 transition-all duration-200 cursor-pointer gh-heading hover:scale-[1.04] hover:brightness-110 ${
            variant === "dark"
              ? "bg-[#B86A30] border-[#B86A30] text-white hover:shadow-[0_6px_20px_rgba(184,106,48,0.45)]"
              : "bg-white border-white text-[#B86A30]"
          }`}>
          <span className="font-black text-base">Schedule Estimate</span>
          <span className="font-semibold text-sm opacity-80">Free · No Commitment</span>
        </a>
      </div>
    </div>
  );
}


// ── BOOKING CALENDAR ─────────────────────────────────────────────────────────
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const TIME_SLOTS = ["8:00 AM","9:30 AM","11:00 AM","1:00 PM","2:30 PM","4:00 PM"];
const FAKE_BOOKED_SLOTS = new Set(["9:30 AM","2:30 PM"]);

function BookingCalendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const fakeBooked = new Set([5, 9, 14, 18, 22, 26]);

  const isPast = (d: number) => isCurrentMonth && d < today.getDate();
  const isToday = (d: number) => isCurrentMonth && d === today.getDate();

  const prevMonth = () => {
    if (!isCurrentMonth) {
      if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1);
      setSelectedDay(null); setSelectedSlot(null);
    }
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1);
    setSelectedDay(null); setSelectedSlot(null);
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const inputCls = "w-full border border-[#D8D0C4] focus:border-[#B86A30] rounded-lg px-3 py-2.5 text-sm text-[#162018] placeholder-[#ADC5B4] outline-none transition-colors";

  if (submitted) {
    return (
      <div className="min-h-[420px] flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 bg-[#2A4D33] rounded-full flex items-center justify-center mb-4 shadow-lg">
          <Check size={24} className="text-white" />
        </div>
        <h4 className="text-[#162018] font-black text-xl gh-heading">Estimate Confirmed!</h4>
        <p className="text-[#5C5044] text-sm mt-2 max-w-xs leading-relaxed">
          We'll be at your property on{" "}
          <span className="font-bold text-[#162018]">{MONTH_NAMES[month]} {selectedDay}</span> at{" "}
          <span className="font-bold text-[#162018]">{selectedSlot}</span>.
        </p>
        <div className="mt-5 p-4 bg-[#B86A30]/10 border border-[#B86A30]/25 rounded-xl text-sm text-[#5C5044] max-w-xs">
          We'll reach out to <span className="font-bold text-[#162018]">{phone}</span> to confirm your appointment.
        </div>
      </div>
    );
  }

  /* ── STEP 2: Contact form ── */
  if (step === 2) {
    return (
      <div className="min-h-[420px] flex flex-col">
        {/* Appointment chip */}
        <div className="mb-5 p-3.5 bg-[#2A4D33]/10 border border-[#2A4D33]/25 rounded-xl flex items-center justify-between gap-3">
          <div>
            <div className="text-[9px] font-black tracking-[2px] uppercase text-[#7A6E64] gh-heading mb-0.5">Your Appointment</div>
            <div className="text-[#162018] font-black text-sm gh-heading">{MONTH_NAMES[month]} {selectedDay} · {selectedSlot}</div>
          </div>
          <button onClick={() => setStep(1)} className="text-[#B86A30] text-xs font-bold hover:underline cursor-pointer gh-heading shrink-0">
            ← Change
          </button>
        </div>

        <p className="text-[9px] font-black tracking-[2px] uppercase text-[#7A6E64] mb-3 gh-heading">Your Contact Info</p>

        <div className="flex flex-col gap-2.5 flex-1">
          <input type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} className={inputCls} />
          <input type="tel" placeholder="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} className={inputCls} />
          <input type="text" placeholder="Property Address" value={address} onChange={e => setAddress(e.target.value)} className={inputCls} />
        </div>

        <button
          onClick={() => { if (name.trim() && phone.trim() && address.trim()) setSubmitted(true); }}
          disabled={!name.trim() || !phone.trim() || !address.trim()}
          className="mt-5 w-full bg-[#B86A30] text-white font-black py-3 rounded-xl text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 hover:scale-[1.02] gh-heading cursor-pointer">
          Confirm Free Estimate →
        </button>
      </div>
    );
  }

  /* ── STEP 1: Date + time ── */
  return (
    <div className="min-h-[420px] flex flex-col">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} disabled={isCurrentMonth}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5C5044] hover:bg-[#F2EDE3] disabled:opacity-25 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft size={16} />
        </button>
        <span className="font-black text-[#162018] text-sm gh-heading tracking-wide">{MONTH_NAMES[month]} {year}</span>
        <button onClick={nextMonth}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5C5044] hover:bg-[#F2EDE3] transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-[9px] font-black text-[#ADC5B4] tracking-widest uppercase py-0.5">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} />;
          const past = isPast(day);
          const booked = fakeBooked.has(day) && !past;
          const tod = isToday(day);
          const sel = day === selectedDay;
          return (
            <button key={day} disabled={past || booked}
              onClick={() => { setSelectedDay(day); setSelectedSlot(null); }}
              className={`aspect-square rounded-lg text-sm font-semibold transition-all duration-150
                ${sel ? "bg-[#B86A30] text-white font-black shadow-md cursor-pointer" : ""}
                ${tod && !sel ? "border-2 border-[#B86A30] text-[#B86A30] font-black cursor-pointer" : ""}
                ${!past && !booked && !sel && !tod ? "text-[#162018] hover:bg-[#FDE8D8] cursor-pointer" : ""}
                ${past ? "text-[#D8D0C4] cursor-not-allowed" : ""}
                ${booked && !past ? "text-[#D8D0C4] line-through cursor-not-allowed" : ""}
              `}>
              {day}
            </button>
          );
        })}
      </div>

      {/* Time slots — always visible */}
      <div className="mt-3 pt-3 border-t border-[#D8D0C4]">
        <p className="text-[9px] font-black tracking-[2px] uppercase text-[#7A6E64] mb-2 gh-heading">
          {selectedDay ? `Available Times — ${MONTH_NAMES[month]} ${selectedDay}` : "Select a date to see times"}
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {TIME_SLOTS.map(slot => {
            const slotBooked = FAKE_BOOKED_SLOTS.has(slot);
            const selSlot = slot === selectedSlot;
            const disabled = slotBooked || !selectedDay;
            return (
              <button key={slot} disabled={disabled}
                onClick={() => setSelectedSlot(slot)}
                className={`px-1 py-2 rounded-lg text-xs font-semibold border transition-all duration-150
                  ${selSlot ? "bg-[#B86A30] border-[#B86A30] text-white font-black cursor-pointer" : ""}
                  ${!disabled && !selSlot ? "border-[#D8D0C4] text-[#5C5044] hover:border-[#B86A30] hover:text-[#B86A30] cursor-pointer" : ""}
                  ${disabled ? "border-[#D8D0C4] text-[#D8D0C4] cursor-not-allowed" : ""}
                `}>
                {slot}
              </button>
            );
          })}
        </div>
      </div>

      {/* Continue */}
      <button
        onClick={() => setStep(2)}
        disabled={!selectedDay || !selectedSlot}
        className="mt-4 w-full bg-[#162018] text-white font-black py-3 rounded-xl text-sm transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed enabled:hover:bg-[#2A4D33] enabled:hover:scale-[1.02] gh-heading cursor-pointer">
        Continue →
      </button>
    </div>
  );
}

// ── PAGE ──────────────────────────────────────────────────────────────────────
export default function GonzalesLandscaping2() {
  const [activeService, setActiveService] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setActiveService(i => (i + 1) % SERVICES.length), 4500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="overflow-x-hidden bg-[#F2EDE3]" style={{ fontFamily: "'Work Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Work+Sans:wght@300;400;500;600;700&display=swap');
        .gh-heading { font-family: 'Outfit', sans-serif; }
        @keyframes gh-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .gh-marquee { animation: gh-marquee 32s linear infinite; }
        @keyframes gh-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
        .gh-float { animation: gh-float 4s ease-in-out infinite; }
        @keyframes gh-pulse-dot { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.7); opacity: 0; } }
        .gh-pulse-dot { animation: gh-pulse-dot 2s ease-in-out infinite; }
        .gh-tab-wrap { -ms-overflow-style: none; scrollbar-width: none; }
        .gh-tab-wrap::-webkit-scrollbar { display: none; }
        @keyframes gh-progress { from { width: 0%; } to { width: 100%; } }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav className="relative w-full z-50 bg-[#162018] border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-center md:justify-between gap-4">
          <div className="flex items-center shrink-0">
            <div className="border-2 border-dashed border-white/30 rounded-lg px-3 py-2">
              <span className="text-white/45 text-[10px] font-semibold tracking-wider gh-heading">Tu logo va aquí</span>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-8">
            {[["Services", "#services"], ["Why Us", "#why-us"], ["Areas", "#areas"], ["Contact", "#contact"]].map(([label, href]) => (
              <a key={label} href={href} className="text-white/65 hover:text-white text-[11px] tracking-[3px] uppercase transition-colors duration-200 cursor-pointer font-semibold gh-heading">{label}</a>
            ))}
          </div>
          <div className="hidden md:flex items-center shrink-0">
            <a href="#booking" className="flex items-center gap-2 bg-[#B86A30] border-2 border-[#B86A30] text-white font-bold px-4 py-2 rounded-lg transition-all duration-200 cursor-pointer text-xs tracking-wide gh-heading hover:scale-[1.05] hover:brightness-110 hover:shadow-[0_4px_14px_rgba(184,106,48,0.5)]">
              Book Free Estimate
            </a>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen overflow-hidden"
        style={{ backgroundImage: "url('/images/gh-hero.jpg')", backgroundSize: "cover", backgroundPosition: "center top" }}>
        <div className="absolute inset-0 bg-[#071209]/[0.88]" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#1A4020]/45 via-[#0D2415]/15 to-transparent" />
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #7DB87F 1px, transparent 0)", backgroundSize: "28px 28px" }} />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 min-h-[calc(100vh-64px)] flex flex-col justify-center py-16">
          <div className="grid lg:grid-cols-[1fr_420px] gap-10 xl:gap-16 items-start">
            <div>
              <div className="flex items-center gap-2 mb-8">
                <MapPin size={18} className="text-[#B86A30] shrink-0" />
                <span className="text-[#B86A30] text-[11px] font-black tracking-[4px] uppercase gh-heading">Punta Gorda & Port Charlotte, FL</span>
              </div>
              <h1 className="text-[clamp(2.8rem,7.5vw,5.4rem)] font-black text-white leading-[0.88] tracking-[-0.02em] mb-6 gh-heading">
                PROFESSIONAL<br />
                <span className="text-[#7DB87F]">LANDSCAPE</span><br />
                CARE.
              </h1>
              <p className="text-white/75 text-lg leading-relaxed mb-8 max-w-lg">
                Gonzalez Herriquez Landscaping brings precision, creativity, and a satisfaction guarantee to every outdoor project in Southwest Florida.
              </p>
              <div className="flex flex-wrap gap-5 mb-8">
                {["Emergency Service", "Work Guaranteed", "Local Experts"].map(item => (
                  <div key={item} className="flex items-center gap-2 text-white/65 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#B86A30]" />
                    {item}
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-4 mb-10">
                <a href="#booking"
                  className="w-full sm:w-auto flex flex-col items-center justify-center gap-0.5 bg-[#B86A30] border-2 border-[#B86A30] text-white px-8 py-4 rounded-xl transition-all duration-200 cursor-pointer gh-heading hover:scale-[1.04] hover:brightness-110 hover:shadow-[0_8px_30px_rgba(184,106,48,0.5)]">
                  <span className="font-black text-xl">Schedule Free Estimate</span>
                  <span className="font-semibold text-sm opacity-80">Free · No Commitment</span>
                </a>
                <a href="#services"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-transparent border-2 border-white/30 text-white font-semibold px-8 py-5 rounded-xl text-base transition-all duration-200 cursor-pointer hover:scale-[1.03] hover:border-white/55">
                  View Services <ChevronRight size={18} />
                </a>
              </div>
              <div className="flex flex-wrap gap-8 pt-6 border-t border-white/[0.1]">
                {[{ v: "8+", l: "Services" }, { v: "100%", l: "Guaranteed" }, { v: "24/7", l: "Emergency" }, { v: "2", l: "Service Areas" }].map(s => (
                  <div key={s.l}>
                    <div className="text-2xl font-black text-[#B86A30] leading-none gh-heading">{s.v}</div>
                    <div className="text-white/55 text-xs mt-0.5 tracking-wide">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            <div id="booking" className="relative">
              <div className="bg-white rounded-2xl shadow-2xl border border-white/[0.08] overflow-hidden">
                <div className="bg-[#162018] px-6 pt-6 pb-5 border-b border-[#D8D0C4]/20">
                  <span className="text-[#B86A30] text-[10px] font-black tracking-[3px] uppercase gh-heading">100% Free · No Commitment</span>
                  <h3 className="text-white font-black text-xl mt-1.5 gh-heading leading-tight">Schedule Your Free Estimate</h3>
                  <p className="text-white/60 text-sm mt-1.5 leading-relaxed">Pick a date and time. Jairo visits your property at no cost.</p>
                </div>
                <div className="p-6">
                  <BookingCalendar />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 pointer-events-none overflow-hidden h-20">
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="w-full h-full">
            <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" fill="#F2EDE3" />
          </svg>
        </div>
      </section>

      {/* ── MARQUEE ── */}
      <div className="bg-[#2A4D33] py-3.5 overflow-hidden">
        <div className="flex whitespace-nowrap">
          <div className="flex gh-marquee">
            {[...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
              <span key={i} className="inline-flex items-center gap-4 mx-6 text-white/85 font-semibold text-[11px] tracking-[3px] uppercase gh-heading">
                {item} <span className="w-1.5 h-1.5 rounded-full bg-[#5A8A6B] shrink-0 opacity-70" />
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── SERVICES ── */}
      <section id="services" className="py-24 px-4 bg-[#F2EDE3]">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <span className="text-[#B86A30] text-[11px] font-bold tracking-[4px] uppercase gh-heading">What We Do</span>
            <h2 className="text-4xl md:text-5xl font-black text-[#162018] mt-2 leading-tight tracking-tight gh-heading">
              8 Services.<br />One Expert Team.
            </h2>
          </div>

          {/* Carousel panel — auto-advances every 4.5s */}
          <div className="relative rounded-2xl overflow-hidden bg-[#162018] min-h-[480px] md:min-h-[560px] flex flex-col justify-end">
            {SERVICES.map((s, i) => (
              <img key={i} src={s.photo} alt={s.title}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${i === activeService ? "opacity-100" : "opacity-0"}`}
                loading="lazy" />
            ))}
            <div className="absolute inset-0 bg-[#162018]/40" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#162018] via-[#162018]/45 to-transparent" />
            <div className="absolute top-5 right-7 text-[clamp(100px,18vw,180px)] font-black leading-none text-white/[0.06] pointer-events-none select-none gh-heading">
              {SERVICES[activeService].num}
            </div>
            {/* Progress bar */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/10">
              <div key={activeService} className="h-full bg-[#B86A30]" style={{ animation: "gh-progress 4.5s linear forwards" }} />
            </div>
            <div className="relative z-10 p-7 md:p-10">
              <span className="text-[#7DB87F] text-[10px] font-bold tracking-[3px] uppercase gh-heading">{SERVICES[activeService].subtitle}</span>
              <h3 className="text-3xl md:text-4xl font-black text-white mt-1 leading-tight gh-heading">{SERVICES[activeService].title}</h3>
              <p className="text-white/80 text-sm md:text-base leading-relaxed mt-3 max-w-2xl">{SERVICES[activeService].desc}</p>
            </div>
          </div>

          {/* Service cards list */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            {SERVICES.map((s, i) => (
              <button key={i}
                onClick={() => setActiveService(i)}
                className={`text-left p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                  activeService === i
                    ? "bg-[#2A4D33] border-[#2A4D33]"
                    : "bg-white border-[#D8D0C4] hover:border-[#2A4D33]"
                }`}>
                <span className={`text-[10px] font-black block mb-1 gh-heading ${activeService === i ? "text-[#7DB87F]" : "text-[#ADC5B4]"}`}>{s.num}</span>
                <div className={`font-bold text-sm leading-tight gh-heading ${activeService === i ? "text-white" : "text-[#162018]"}`}>{s.title}</div>
                <div className={`text-xs mt-0.5 ${activeService === i ? "text-white/65" : "text-[#7A6E64]"}`}>{s.subtitle}</div>
              </button>
            ))}
          </div>

          {/* CTA call */}
          <div className="mt-10 flex flex-col items-center gap-3 text-center">
            <p className="text-[#5C5044] text-sm font-semibold">We visit your property at no cost — pick a date and lock in your free estimate.</p>
            <a href="#booking"
              className="w-full sm:w-auto flex flex-col items-center justify-center gap-0.5 bg-[#B86A30] border-2 border-[#B86A30] text-white px-10 py-4 rounded-xl transition-all duration-200 cursor-pointer gh-heading hover:scale-[1.04] hover:brightness-110 hover:shadow-[0_6px_20px_rgba(184,106,48,0.45)]">
              <span className="font-black text-lg">Schedule Free Estimate</span>
              <span className="font-semibold text-sm opacity-80">Free · No Commitment</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── WHY US ── */}
      <section id="why-us" className="py-24 px-4 bg-[#0D1B0F]">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-[360px_1fr] gap-14 items-start">

            <div className="lg:sticky lg:top-24">
              <span className="text-[#B86A30] text-[11px] font-bold tracking-[4px] uppercase gh-heading">Why Choose Us</span>
              <h2 className="text-4xl md:text-5xl font-black text-white mt-4 leading-[0.92] tracking-tight gh-heading">
                The reason<br />clients choose<br />us <span className="text-[#7DB87F]">again</span><br />and again.
              </h2>
              <p className="text-white/60 text-sm leading-relaxed mt-5 max-w-xs">
                More than landscaping — a relationship built on consistency, quality, and keeping our word on every job.
              </p>
              {/* Desktop-only button in sticky column */}
              <a href="#booking"
                className="hidden lg:flex flex-col items-center gap-0.5 mt-8 bg-[#B86A30] border-2 border-[#B86A30] text-white px-7 py-3.5 rounded-xl transition-all duration-200 cursor-pointer gh-heading hover:scale-[1.04] hover:brightness-110 hover:shadow-[0_6px_20px_rgba(184,106,48,0.4)]">
                <span className="font-black text-sm">Schedule Estimate</span>
                <span className="font-semibold text-xs opacity-80">Free · No Commitment</span>
              </a>
            </div>

            <div className="grid sm:grid-cols-2 gap-px bg-[#0A1509] rounded-2xl overflow-hidden">

              {/* Emergency */}
              <div className="bg-[#162C1A] p-8 flex flex-col gap-4 relative overflow-hidden hover:bg-[#1A3320] transition-colors duration-200">
                <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-[#B86A30]/10 pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2.5 mb-1">
                    <Zap size={16} className="text-[#B86A30]" />
                    <span className="text-[#7DB87F] text-xs font-black gh-heading">01</span>
                  </div>
                  <h3 className="text-xl font-black text-white mt-1 leading-tight gh-heading">Emergency Service</h3>
                  <p className="text-white/70 text-sm leading-relaxed mt-3">We respond when others can't. Available for urgent tree removal and storm damage work — call any time, any day.</p>
                </div>
              </div>

              {/* Guarantee */}
              <div className="bg-[#1A3320] p-8 flex flex-col gap-4 hover:bg-[#1E3A25] transition-colors duration-200">
                <div className="flex items-center gap-2.5 mb-1">
                  <ShieldCheck size={16} className="text-[#B86A30]" />
                  <span className="text-[#7DB87F] text-xs font-black gh-heading">02</span>
                </div>
                <h3 className="text-xl font-black text-white leading-tight gh-heading">Work Guarantee</h3>
                <p className="text-white/70 text-sm leading-relaxed">Every job is backed by our satisfaction promise. If the result isn't right, we come back and fix it — no questions asked.</p>
              </div>

              {/* Plant renovation */}
              <div className="bg-[#1A3320] p-8 flex flex-col gap-4 hover:bg-[#1E3A25] transition-colors duration-200">
                <div className="flex items-center gap-2.5 mb-1">
                  <Leaf size={16} className="text-[#B86A30]" />
                  <span className="text-[#7DB87F] text-xs font-black gh-heading">03</span>
                </div>
                <h3 className="text-xl font-black text-white leading-tight gh-heading">Plant Renovation</h3>
                <p className="text-white/70 text-sm leading-relaxed">We remove old, dead, or overgrown plants and install fresh, thriving ones. Full landscape transformation from the ground up.</p>
              </div>

              {/* Local experts */}
              <div className="bg-[#162C1A] p-8 flex flex-col gap-4 hover:bg-[#1A3320] transition-colors duration-200">
                <div className="flex items-center gap-2.5 mb-1">
                  <MapPin size={16} className="text-[#B86A30]" />
                  <span className="text-[#7DB87F] text-xs font-black gh-heading">04</span>
                </div>
                <h3 className="text-xl font-black text-white leading-tight gh-heading">Local Expertise</h3>
                <p className="text-white/70 text-sm leading-relaxed">Charlotte County specialists who understand Florida's soil, heat, and seasonal conditions. Work that's built to last in this climate.</p>
              </div>

            </div>
          </div>

          {/* Mobile-only button — below the cards grid */}
          <a href="#booking"
            className="lg:hidden mt-8 w-full flex flex-col items-center gap-0.5 bg-[#B86A30] border-2 border-[#B86A30] text-white py-4 rounded-xl transition-all duration-200 cursor-pointer gh-heading hover:scale-[1.04] hover:brightness-110 hover:shadow-[0_6px_20px_rgba(184,106,48,0.4)]">
            <span className="font-black text-base">Schedule Estimate</span>
            <span className="font-semibold text-sm opacity-80">Free · No Commitment</span>
          </a>
        </div>
      </section>

      {/* ── COVERAGE ── */}
      <section id="areas" className="py-24 px-4 bg-[#F2EDE3]">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="flex items-start gap-4 mb-12">
            <div className="w-12 h-12 bg-[#B86A30] rounded-xl flex items-center justify-center shrink-0 mt-1">
              <MapPin size={22} className="text-white" />
            </div>
            <div>
              <span className="text-[#B86A30] text-[11px] font-bold tracking-[4px] uppercase gh-heading">Service Coverage</span>
              <h2 className="text-4xl md:text-5xl font-black text-[#162018] mt-1 leading-tight tracking-tight gh-heading">
                Where We Serve.
              </h2>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-10 items-center">

            {/* Areas list */}
            <div>
              <p className="text-[#5C5044] text-base leading-relaxed mb-8 max-w-md">
                We serve residential and commercial clients across Charlotte County, Florida. Call us to confirm your address is within our coverage zone — no extra charges for travel within our service area.
              </p>
              <div className="flex flex-col gap-3">
                {[
                  { name: "Punta Gorda, FL", label: "Primary Area", accent: "#B86A30", border: "border-[#B86A30]/30" },
                  { name: "Port Charlotte, FL", label: "Service Area", accent: "#B86A30", border: "border-[#D8D0C4]" },
                  { name: "Surrounding Areas", label: "Extended Zone", accent: "#B86A30", border: "border-[#D8D0C4]" },
                ].map((area, i) => (
                  <div key={area.name} className={`flex items-center gap-4 p-5 bg-white rounded-xl border-2 ${area.border}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${i === 0 ? "bg-[#B86A30]" : "bg-[#F2EDE3]"}`}>
                      <MapPin size={16} className={i === 0 ? "text-white" : "text-[#B86A30]"} />
                    </div>
                    <div>
                      <div className="font-black text-[#162018] text-lg gh-heading leading-none">{area.name}</div>
                      <div className="text-[10px] font-bold tracking-[2px] uppercase mt-1 text-[#B86A30]">{area.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Landscaping image */}
            <div className="rounded-2xl overflow-hidden aspect-[4/3] relative border-2 border-[#B86A30]/20 shadow-lg">
              <img
                src="https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80"
                alt="Professional landscaping work in Charlotte County, Florida"
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#162018]/50 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <div className="inline-flex items-center gap-2 bg-[#B86A30] text-white text-[10px] font-black tracking-[2px] uppercase px-3 py-2 rounded-lg gh-heading">
                  <MapPin size={11} /> Charlotte County, Florida
                </div>
              </div>
            </div>

          </div>

          {/* CTA call */}
          <div className="mt-10 flex flex-col items-center gap-3 text-center">
            <p className="text-[#5C5044] text-sm font-semibold">Serving your neighborhood — schedule a free on-site estimate online in seconds.</p>
            <a href="#booking"
              className="w-full sm:w-auto flex flex-col items-center justify-center gap-0.5 bg-[#B86A30] border-2 border-[#B86A30] text-white px-10 py-4 rounded-xl transition-all duration-200 cursor-pointer gh-heading hover:scale-[1.04] hover:brightness-110 hover:shadow-[0_6px_20px_rgba(184,106,48,0.45)]">
              <span className="font-black text-lg">Schedule Free Estimate</span>
              <span className="font-semibold text-sm opacity-80">Free · No Commitment</span>
            </a>
          </div>

        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 px-4 bg-[#F2EDE3] border-t border-[#D8D0C4]">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-[#B86A30] text-[11px] font-bold tracking-[4px] uppercase gh-heading">Questions</span>
            <h2 className="text-3xl font-black text-[#162018] mt-3 gh-heading">Frequently Asked</h2>
          </div>
          {FAQS.map(faq => <FaqItem key={faq.q} q={faq.q} a={faq.a} />)}
        </div>
      </section>

      {/* ── CONTACT / CALL ── */}
      <section id="contact" className="py-24 px-4 bg-[#162018]">
        <div className="max-w-4xl mx-auto">

          <div className="text-center mb-12">
            <span className="text-[#7DB87F] text-[11px] font-bold tracking-[4px] uppercase gh-heading">Get Started</span>
            <h2 className="text-5xl md:text-6xl font-black text-white mt-3 leading-[0.9] tracking-tight gh-heading">
              Let's Build<br /><span className="text-[#7DB87F]">Something</span><br />Beautiful.
            </h2>
            <p className="text-white/70 text-base mt-5 max-w-sm mx-auto leading-relaxed">
              Free on-site consultation. Free quote. No commitment required.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-5">

            {/* Primary CTA — booking */}
            <a href="#booking"
              className="relative flex flex-col gap-5 p-8 bg-[#B86A30] border-2 border-[#B86A30] rounded-2xl cursor-pointer overflow-hidden transition-all duration-200 hover:brightness-110 hover:scale-[1.02]">
              <div className="absolute -right-8 -top-8 w-36 h-36 bg-white/10 rounded-full pointer-events-none" />
              <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-white/[0.07] rounded-full pointer-events-none" />
              <div className="relative z-10">
                <div className="text-white/70 text-[10px] font-bold tracking-widest uppercase mb-1 gh-heading">Free · No Commitment</div>
                <div className="text-white font-black text-2xl gh-heading">Book Your Estimate</div>
              </div>
              <div className="relative z-10 flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 border-2 border-white/30">
                  <ChevronRight size={22} className="text-white" />
                </div>
                <div>
                  <div className="text-white/70 text-xs mb-0.5">Use our calendar above</div>
                  <div className="text-white font-black text-xl leading-tight gh-heading">Pick a date<br />& time online</div>
                </div>
              </div>
              <div className="relative z-10 flex items-center gap-1.5 text-white/70 text-xs gh-heading">
                <ChevronRight size={13} />
                Jairo visits your property at no cost
              </div>
            </a>

            {/* Secondary — direct phone contacts */}
            <div className="relative flex flex-col gap-4 p-8 bg-[#1A2E1C] border-2 border-[#2A4D33] rounded-2xl overflow-hidden">
              <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-white/[0.04] rounded-full pointer-events-none" />
              <div className="relative z-10">
                <div className="text-[#7DB87F] text-[10px] font-bold tracking-widest uppercase mb-4 gh-heading">Or Call Us Directly</div>
                <div className="flex flex-col gap-5">
                  <div>
                    <div className="text-white/55 text-[10px] font-bold tracking-widest uppercase mb-1.5 gh-heading">{OWNER} — Owner</div>
                    <a href={`tel:${PHONE_MAIN}`} className="flex items-center gap-3 group cursor-pointer">
                      <div className="w-9 h-9 bg-white/[0.08] rounded-xl flex items-center justify-center shrink-0 border border-[#3A6345] group-hover:bg-white/[0.15] transition-colors">
                        <Phone size={14} className="text-[#7DB87F]" />
                      </div>
                      <span className="font-black text-xl text-white gh-heading group-hover:text-[#E8A06A] transition-colors">{PHONE_MAIN_DISPLAY}</span>
                    </a>
                  </div>
                  <div>
                    <div className="text-white/55 text-[10px] font-bold tracking-widest uppercase mb-1.5 gh-heading">{MANAGER} — Manager</div>
                    <a href={`tel:${PHONE_ALT}`} className="flex items-center gap-3 group cursor-pointer">
                      <div className="w-9 h-9 bg-white/[0.08] rounded-xl flex items-center justify-center shrink-0 border border-[#3A6345] group-hover:bg-white/[0.15] transition-colors">
                        <Phone size={14} className="text-[#7DB87F]" />
                      </div>
                      <span className="font-black text-xl text-white gh-heading group-hover:text-[#E8A06A] transition-colors">{PHONE_ALT_DISPLAY}</span>
                    </a>
                  </div>
                </div>
              </div>
              <div className="relative z-10 flex items-center gap-1.5 text-white/45 text-xs gh-heading mt-1">
                <ChevronRight size={13} />
                Prefer to call? We're always ready.
              </div>
            </div>
          </div>

          {/* Emergency strip */}
          <div className="flex items-center justify-center gap-3 p-4 bg-[#B86A30]/[0.1] border border-[#B86A30]/25 rounded-xl">
            <div className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute h-full w-full rounded-full bg-[#B86A30] opacity-55" />
              <span className="relative h-2.5 w-2.5 rounded-full bg-[#B86A30]" />
            </div>
            <span className="text-[#E8A06A] text-sm font-semibold">
              Emergency service available — call{" "}
              <a href={`tel:${PHONE_MAIN}`} className="font-black text-white underline underline-offset-2 cursor-pointer">{PHONE_MAIN_DISPLAY}</a>
              {" "}anytime.
            </span>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#0E1A10] text-white py-14 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-10 mb-10">
            <div>
              <div className="border-2 border-dashed border-white/20 rounded-xl px-5 py-3 inline-block mb-4">
                <span className="text-white/40 text-sm font-semibold tracking-wider gh-heading">Tu logo va aquí</span>
              </div>
              <p className="text-white/60 text-sm leading-relaxed max-w-xs">
                Professional landscaping and garden care serving Punta Gorda & Port Charlotte, Florida. Quality work, guaranteed results.
              </p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4 text-[10px] tracking-[3px] uppercase gh-heading">Our Services</h4>
              <ul className="space-y-2.5 text-white/55 text-sm">
                {["Garden Design", "Lawn & Hedge Trimming", "Lawn Maintenance", "Full Landscaping", "Tree Cutting & Removal", "Stone Installation", "Sod & Flower Planting", "Plant Renovation"].map(s => (
                  <li key={s} className="hover:text-white/90 transition-colors cursor-pointer">{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4 text-[10px] tracking-[3px] uppercase gh-heading">Contact</h4>
              <div className="space-y-5 text-sm">
                <div>
                  <div className="text-[#7DB87F] text-[10px] font-bold tracking-widest uppercase mb-1.5 gh-heading">{OWNER} — Owner</div>
                  <a href={`tel:${PHONE_MAIN}`} className="text-white/65 hover:text-white transition-colors cursor-pointer flex items-center gap-2">
                    <Phone size={12} className="text-[#B86A30]" /> {PHONE_MAIN_DISPLAY}
                  </a>
                </div>
                <div>
                  <div className="text-[#7DB87F] text-[10px] font-bold tracking-widest uppercase mb-1.5 gh-heading">{MANAGER} — Manager</div>
                  <a href={`tel:${PHONE_ALT}`} className="text-white/65 hover:text-white transition-colors cursor-pointer flex items-center gap-2">
                    <Phone size={12} className="text-[#B86A30]" /> {PHONE_ALT_DISPLAY}
                  </a>
                </div>
                <div className="flex items-start gap-2 text-white/55">
                  <MapPin size={12} className="text-[#B86A30] mt-0.5 shrink-0" />
                  <span>Punta Gorda & Port Charlotte, FL</span>
                </div>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-white/[0.08] flex flex-col sm:flex-row justify-between items-center gap-3 text-white/35 text-xs">
            <div>© 2025 Gonzalez Herriquez Landscaping. All rights reserved.</div>
            <div>Built by <span className="text-white/55 font-semibold">Acrosoft Labs</span></div>
          </div>
        </div>
      </footer>

    </div>
  );
}
