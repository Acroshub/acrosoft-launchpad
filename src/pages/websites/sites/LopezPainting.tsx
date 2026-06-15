import { useState, useMemo } from "react";
import {
  ChevronLeft, ChevronRight, Check, Star, MapPin, Clock,
  Phone, ChevronDown, ChevronUp, Calendar, Home, Layers,
} from "lucide-react";

// ── BRAND TOKENS ─────────────────────────────────────────────────────────────
const NAVY = "#1a3c5e";
const RED   = "#c41e3a";
const PHONE_NUM = "(407) 555-2891";

// ── DATA ─────────────────────────────────────────────────────────────────────
const SERVICES = [
  {
    id: "interior",
    title: "Interior Painting",
    desc: "Walls, ceilings, trim, and accent walls. Clean prep, zero drips, flawless finish.",
    Icon: Home,
    photo: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "exterior",
    title: "Exterior Painting",
    desc: "Full exterior refresh, power wash, priming, and premium weather-resistant paint.",
    Icon: Home,
    photo: "https://images.unsplash.com/photo-1777984947115-05de206fd91d?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "drywall",
    title: "Drywall Repair",
    desc: "Holes, cracks, water damage, popcorn ceiling removal. Seamless results.",
    Icon: Layers,
    photo: "https://images.unsplash.com/photo-1773175301539-f7e99d798624?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "texture",
    title: "Texture Matching",
    desc: "We match any existing texture — orange peel, knockdown, skip trowel — invisibly.",
    Icon: Layers,
    photo: "https://images.unsplash.com/photo-1511822148790-e7b58ba14c72?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "cabinets",
    title: "Cabinet Painting",
    desc: "Transform your kitchen without a full remodel. Factory-smooth finish, long-lasting.",
    Icon: Home,
    photo: "https://images.unsplash.com/photo-1601760561441-16420502c7e0?auto=format&fit=crop&w=600&q=80",
  },
];

const BEFORE_AFTERS = [
  {
    label: "Living Room — Interior",
    city: "Lake Nona, FL",
    photo: "https://images.unsplash.com/photo-1599619585752-c3edb42a414c?auto=format&fit=crop&w=800&q=80",
  },
  {
    label: "Kitchen Cabinets",
    city: "Winter Park, FL",
    photo: "https://images.unsplash.com/photo-1682888818620-94875adf5bb9?auto=format&fit=crop&w=800&q=80",
  },
  {
    label: "Exterior Full Paint",
    city: "Kissimmee, FL",
    photo: "https://images.unsplash.com/photo-1777984947115-05de206fd91d?auto=format&fit=crop&w=800&q=80",
  },
];

const TESTIMONIALS = [
  {
    name: "Camila T.",
    location: "Dr. Phillips, FL",
    stars: 5,
    job: "Full interior + drywall repair",
    text: "López transformed our home in 3 days. Every wall, ceiling, and closet. They even repaired the water damage in our master bedroom seamlessly. Couldn't be happier.",
  },
  {
    name: "Robert M.",
    location: "Windermere, FL",
    stars: 5,
    job: "Exterior painting — 2,800 sq ft",
    text: "Best painters in Orlando, period. They power-washed, primed, and applied two coats. My neighbors keep asking who did the work.",
  },
  {
    name: "Alicia N.",
    location: "Lake Mary, FL",
    stars: 5,
    job: "Cabinet painting — whole kitchen",
    text: "I was skeptical about painting cabinets instead of replacing them, but the result is better than new. Factory-smooth finish, zero brush marks. Saved $8,000 vs. new cabinets.",
  },
];

const FAQS = [
  { q: "How long does an interior paint job take?", a: "A typical 3-bedroom home takes 2–3 days. We work efficiently without rushing — proper prep (taping, patching, priming) is what makes the finish last." },
  { q: "Do I need to move furniture?", a: "We move and cover all furniture as part of the job. Just remove small personal items and decorations. We handle the rest." },
  { q: "What paint brands do you use?", a: "We use Sherwin-Williams and Benjamin Moore exclusively. If you prefer a specific color or brand, we're happy to work with it. All paints are included in our estimates." },
  { q: "How do you handle drywall repairs?", a: "Our drywall team patches, sands, primes, and texture-matches the repair area before painting. The result is invisible — you won't be able to tell where the damage was." },
  { q: "Are you licensed and insured in Florida?", a: "Yes. López Painting & Drywall holds Florida Contractor License #CRC-1335892, $1M general liability insurance, and worker's compensation. We provide certificates before any job." },
  { q: "Do you offer free estimates?", a: "Always. Book a slot on our calendar and we'll visit your property, measure the scope, and hand you a written quote at no charge, with no pressure." },
];

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const TIME_SLOTS = ["8:00 AM","10:00 AM","12:00 PM","2:00 PM","4:00 PM"];
const SERVICE_OPTIONS = ["Interior Painting","Exterior Painting","Drywall Repair","Texture Matching","Cabinet Painting","Not sure yet"];

// ── LOGO ─────────────────────────────────────────────────────────────────────
function LopezLogo({ variant = "dark", className = "" }: { variant?: "dark" | "light"; className?: string }) {
  const nameColor = variant === "light" ? "#ffffff" : NAVY;
  const subColor  = variant === "light" ? "rgba(255,255,255,0.6)" : "#64748b";
  return (
    <svg viewBox="0 0 260 56" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="López Painting & Drywall" role="img">
      {/* Paint roller icon */}
      <rect x="2" y="10" width="30" height="20" rx="4" fill={nameColor} />
      <rect x="6" y="14" width="22" height="12" rx="2" fill="white" opacity="0.25" />
      <rect x="2" y="30" width="4" height="18" rx="1" fill={nameColor} />
      <rect x="4" y="45" width="18" height="4" rx="1" fill={RED} />
      {/* Paint drip */}
      <path d="M13 34 Q13 42 10 45" stroke={RED} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="10" cy="47" r="2.5" fill={RED} />
      {/* Wordmark */}
      <text x="42" y="24" fontFamily="'Arial Black','Arial Bold',Arial,sans-serif" fontWeight="900" fontSize="20" fill={nameColor} letterSpacing="-0.3">LÓPEZ</text>
      <text x="43" y="39" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="9.5" fill={RED} letterSpacing="2.5">PAINTING &amp; DRYWALL</text>
      {/* Brush stroke underline */}
      <path d="M42,44 Q130,47 210,43" stroke={RED} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.5" />
      <text x="43" y="54" fontFamily="Arial,sans-serif" fontWeight="400" fontSize="8" fill={subColor} letterSpacing="1.5">ORLANDO, FL · EST. 2012</text>
    </svg>
  );
}

// ── INTERACTIVE BOOKING CALENDAR ─────────────────────────────────────────────
function BookingCalendar() {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [step, setStep] = useState<"date" | "time" | "form" | "done">("date");
  const [form, setForm] = useState({ name: "", phone: "", service: "", notes: "" });

  const viewMonth = useMemo(() => new Date(today.getFullYear(), today.getMonth() + monthOffset, 1), [today, monthOffset]);

  // Pre-generate a realistic set of booked dates
  const bookedSet = useMemo(() => {
    const s = new Set<string>();
    [3, 5, 9, 12, 16, 19, 23, 26, 30, 33, 37].forEach(n => {
      const d = new Date(today); d.setDate(today.getDate() + n);
      s.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    });
    return s;
  }, [today]);

  const dk = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const isWeekend  = (d: Date) => d.getDay() === 0 || d.getDay() === 6;
  const isPast     = (d: Date) => d < today;
  const isBooked   = (d: Date) => bookedSet.has(dk(d));
  const isTooFar   = (d: Date) => d > new Date(today.getFullYear(), today.getMonth() + 2, today.getDate());
  const isAvail    = (d: Date) => !isWeekend(d) && !isPast(d) && !isBooked(d) && !isTooFar(d);
  const isSel      = (d: Date) => !!selectedDate && dk(d) === dk(selectedDate);
  const isToday    = (d: Date) => dk(d) === dk(today);

  const calDays = useMemo(() => {
    const y = viewMonth.getFullYear(), m = viewMonth.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const total = new Date(y, m + 1, 0).getDate();
    const days: (Date | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= total; d++) days.push(new Date(y, m, d));
    return days;
  }, [viewMonth]);

  function selectDate(d: Date) {
    if (!isAvail(d)) return;
    setSelectedDate(d); setSelectedTime(null); setStep("time");
  }
  function selectTime(t: string) { setSelectedTime(t); setStep("form"); }
  function handleSubmit(e: React.FormEvent) { e.preventDefault(); setStep("done"); }

  const fmtDate = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

  return (
    <div className="grid lg:grid-cols-2 gap-8 items-start">
      {/* Calendar grid */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        {/* Month nav */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100" style={{ background: NAVY }}>
          <button
            onClick={() => setMonthOffset(o => Math.max(0, o - 1))}
            disabled={monthOffset === 0}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors cursor-pointer"
          >
            <ChevronLeft size={18} className="text-white" />
          </button>
          <span className="text-white font-bold text-base">
            {MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
          </span>
          <button
            onClick={() => setMonthOffset(o => Math.min(2, o + 1))}
            disabled={monthOffset === 2}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors cursor-pointer"
          >
            <ChevronRight size={18} className="text-white" />
          </button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {DAY_LABELS.map(l => (
            <div key={l} className="text-center py-3 text-xs font-bold text-gray-400">{l}</div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 p-2 gap-1">
          {calDays.map((d, i) => {
            if (!d) return <div key={`empty-${i}`} />;
            const avail  = isAvail(d);
            const booked = isBooked(d);
            const sel    = isSel(d);
            const past   = isPast(d);
            const wknd   = isWeekend(d);
            const tod    = isToday(d);

            let cls = "relative flex items-center justify-center h-9 w-full rounded-lg text-sm font-medium transition-all duration-150 ";
            if (sel)            cls += "text-white font-black shadow-md";
            else if (booked)    cls += "text-gray-300 line-through cursor-not-allowed";
            else if (past || wknd || isTooFar(d)) cls += "text-gray-300 cursor-not-allowed";
            else                cls += "text-gray-700 hover:text-white cursor-pointer";

            return (
              <button
                key={dk(d)}
                onClick={() => selectDate(d)}
                disabled={!avail}
                className={cls}
                style={sel ? { background: RED } : avail ? { } : {}}
                onMouseEnter={e => { if (avail && !sel) (e.currentTarget as HTMLButtonElement).style.background = NAVY; }}
                onMouseLeave={e => { if (avail && !sel) (e.currentTarget as HTMLButtonElement).style.background = ""; }}
              >
                {d.getDate()}
                {tod && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: sel ? "white" : RED }} />}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 px-4 py-3 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-3 h-3 rounded-sm" style={{ background: RED }} />Available
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-3 h-3 rounded-sm bg-gray-200" />Booked
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-3 h-3 rounded-sm bg-gray-100" />Unavailable
          </div>
        </div>
      </div>

      {/* Right panel: time → form → confirmation */}
      <div>
        {step === "date" && (
          <div className="flex flex-col items-center justify-center text-center py-16 text-white/60">
            <Calendar size={40} className="mb-4 opacity-40" />
            <p className="text-base">Select an available date<br />to choose your time slot.</p>
          </div>
        )}

        {step === "time" && selectedDate && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100" style={{ background: NAVY }}>
              <div className="text-white/60 text-xs uppercase tracking-wider mb-0.5">Selected Date</div>
              <div className="text-white font-black text-lg">{fmtDate(selectedDate)}</div>
            </div>
            <div className="p-5">
              <p className="text-sm font-semibold text-gray-600 mb-4">Choose a time slot for your free estimate:</p>
              <div className="grid grid-cols-1 gap-2">
                {TIME_SLOTS.map(t => (
                  <button
                    key={t}
                    onClick={() => selectTime(t)}
                    className="flex items-center justify-between w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 hover:border-opacity-100 text-gray-700 font-semibold text-sm transition-all duration-150 cursor-pointer group"
                    style={{ }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = RED; (e.currentTarget as HTMLButtonElement).style.color = RED; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = ""; (e.currentTarget as HTMLButtonElement).style.color = ""; }}
                  >
                    <span className="flex items-center gap-2"><Clock size={15} />{t}</span>
                    <ChevronRight size={15} className="text-gray-300" />
                  </button>
                ))}
              </div>
              <button onClick={() => setStep("date")} className="mt-4 text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
                ← Change date
              </button>
            </div>
          </div>
        )}

        {step === "form" && selectedDate && selectedTime && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100" style={{ background: NAVY }}>
              <div className="text-white/60 text-xs uppercase tracking-wider mb-0.5">Your Appointment</div>
              <div className="text-white font-black text-base">{fmtDate(selectedDate)} · {selectedTime}</div>
            </div>
            <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Full Name</label>
                <input required type="text" placeholder="Carlos López" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 transition"
                  style={{ '--tw-ring-color': RED } as React.CSSProperties}
                  onFocus={e => e.target.style.borderColor = RED}
                  onBlur={e => e.target.style.borderColor = ""}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Phone Number</label>
                <input required type="tel" placeholder="(407) 000-0000" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none transition"
                  onFocus={e => e.target.style.borderColor = RED}
                  onBlur={e => e.target.style.borderColor = ""}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Service</label>
                <select required value={form.service} onChange={e => setForm({...form, service: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 bg-white focus:outline-none transition cursor-pointer"
                  onFocus={e => e.target.style.borderColor = RED}
                  onBlur={e => e.target.style.borderColor = ""}
                >
                  <option value="">Select a service…</option>
                  {SERVICE_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <button type="submit" className="w-full py-3.5 rounded-xl font-black text-white text-sm transition-all duration-200 hover:opacity-90 hover:shadow-lg cursor-pointer flex items-center justify-center gap-2" style={{ background: RED }}>
                <Calendar size={16} /> Confirm Estimate
              </button>
              <button type="button" onClick={() => setStep("time")} className="text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer text-center">
                ← Change time
              </button>
            </form>
          </div>
        )}

        {step === "done" && selectedDate && selectedTime && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: `${RED}15` }}>
              <Check size={28} style={{ color: RED }} />
            </div>
            <h3 className="text-xl font-black mb-1" style={{ color: NAVY }}>You're on the calendar!</h3>
            <p className="text-gray-500 text-sm mb-5">We'll call to confirm your appointment at <strong>{fmtDate(selectedDate)} at {selectedTime}</strong>.</p>
            <div className="bg-gray-50 rounded-xl p-4 text-left text-sm space-y-2 mb-6">
              {[
                "We'll call to confirm within 2 hours",
                "Estimate is free — no obligation",
                "We'll bring paint samples if you want",
              ].map(i => (
                <div key={i} className="flex items-center gap-2 text-gray-600">
                  <Check size={14} style={{ color: RED }} />{i}
                </div>
              ))}
            </div>
            <p className="text-gray-400 text-xs">Questions? Call us: <a href={`tel:${PHONE_NUM}`} className="font-bold" style={{ color: NAVY }}>{PHONE_NUM}</a></p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── BEFORE/AFTER CARD ─────────────────────────────────────────────────────────
function BeforeAfterCard({ label, city, photo }: { label: string; city: string; photo: string }) {
  const [showAfter, setShowAfter] = useState(false);
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm group">
      <div className="relative aspect-video overflow-hidden">
        {/* Before (desaturated) */}
        <img
          src={photo}
          alt={`Before — ${label}`}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
          style={{ filter: "grayscale(60%) brightness(0.7) saturate(0.5)", opacity: showAfter ? 0 : 1 }}
        />
        {/* After (full color) */}
        <img
          src={photo}
          alt={`After — ${label}`}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
          style={{ opacity: showAfter ? 1 : 0 }}
        />
        {/* Label */}
        <div className="absolute top-3 left-3 flex gap-2 z-10">
          <span
            className="text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider transition-all duration-300"
            style={{ background: showAfter ? RED : "#374151", color: "white" }}
          >
            {showAfter ? "AFTER" : "BEFORE"}
          </span>
        </div>
        {/* Toggle button */}
        <button
          onClick={() => setShowAfter(v => !v)}
          className="absolute bottom-3 right-3 z-10 text-xs font-bold px-3 py-1.5 rounded-full bg-white/90 hover:bg-white transition-colors cursor-pointer shadow-md"
          style={{ color: NAVY }}
        >
          {showAfter ? "← See Before" : "See After →"}
        </button>
        {/* Instruction hint on first load */}
        {!showAfter && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-white/0 group-hover:text-white/80 transition-all duration-300 text-xs font-semibold bg-black/40 px-3 py-1.5 rounded-full">
              Tap to reveal the transformation
            </span>
          </div>
        )}
      </div>
      <div className="px-5 py-4 flex items-center justify-between bg-white">
        <div>
          <div className="font-bold text-sm" style={{ color: NAVY }}>{label}</div>
          <div className="text-gray-400 text-xs flex items-center gap-1 mt-0.5"><MapPin size={10}/>{city}</div>
        </div>
        <a href="#book" className="text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer" style={{ background: `${RED}15`, color: RED }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = RED; (e.currentTarget as HTMLAnchorElement).style.color = "white"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = `${RED}15`; (e.currentTarget as HTMLAnchorElement).style.color = RED; }}
        >
          Book similar →
        </a>
      </div>
    </div>
  );
}

// ── FAQ ITEM ──────────────────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border rounded-xl overflow-hidden transition-all duration-200 ${open ? "shadow-sm" : ""}`} style={{ borderColor: open ? RED : "#e5e7eb" }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-4 p-5 text-left cursor-pointer bg-white hover:bg-gray-50 transition-colors">
        <span className="font-bold text-base" style={{ color: NAVY }}>{q}</span>
        {open ? <ChevronUp size={18} style={{ color: RED }} className="shrink-0" /> : <ChevronDown size={18} className="text-gray-400 shrink-0" />}
      </button>
      {open && <div className="px-5 pb-5 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-4 bg-white">{a}</div>}
    </div>
  );
}

// ── PAGE ──────────────────────────────────────────────────────────────────────
export default function LopezPainting() {
  return (
    <div className="font-sans overflow-x-hidden bg-white">
      <style>{`
        @keyframes lopez-fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .lopez-fade { animation: lopez-fade-up 0.5s ease both; }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/96 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <LopezLogo className="w-52 shrink-0" />
          <div className="hidden lg:flex items-center gap-8">
            {[["Services","#services"],["Projects","#projects"],["Reviews","#reviews"],["FAQ","#faq"]].map(([l,h]) => (
              <a key={l} href={h} className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors cursor-pointer">{l}</a>
            ))}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a href={`tel:${PHONE_NUM}`} className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors cursor-pointer">
              <Phone size={14}/>{PHONE_NUM}
            </a>
            <a href="#book" className="flex items-center gap-2 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all duration-200 hover:opacity-90 cursor-pointer shadow-sm"
              style={{ background: RED }}>
              <Calendar size={14}/> Book Estimate
            </a>
          </div>
        </div>
      </nav>

      {/* ── HERO — diagonal split: navy left / photo right ── */}
      <section className="relative min-h-screen flex items-stretch overflow-hidden pt-16">
        {/* Left: navy panel */}
        <div className="relative z-10 flex items-center w-full md:w-[55%] px-6 sm:px-10 lg:px-16 py-20" style={{ background: NAVY }}>
          {/* Decorative paint strokes — KEEP (illustrative, brand) */}
          <div className="absolute top-0 right-0 w-32 h-32 opacity-10 pointer-events-none" aria-hidden="true">
            <svg viewBox="0 0 80 80"><path d="M0,40 Q20,10 40,40 Q60,70 80,40" stroke="white" strokeWidth="8" fill="none" strokeLinecap="round"/></svg>
          </div>
          <div className="absolute bottom-20 left-6 w-20 h-20 opacity-10 pointer-events-none" aria-hidden="true">
            <svg viewBox="0 0 60 60"><ellipse cx="30" cy="30" rx="28" ry="12" fill="white" transform="rotate(-30 30 30)"/></svg>
          </div>

          <div className="relative max-w-xl">
            {/* CRO: credibility badge above headline */}
            <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold tracking-widest uppercase mb-7 border" style={{ borderColor: `${RED}60`, color: RED, background: `${RED}15` }}>
              <span className="w-2 h-2 rounded-full" style={{ background: RED }} />
              Orlando's Trusted Painting Pros · 500+ Projects
            </div>

            <h1 className="text-[clamp(2.8rem,6vw,4.5rem)] font-black text-white leading-[0.95] tracking-tighter mb-6">
              YOUR HOME.<br />
              <span style={{ color: RED }}>REPAINTED.</span><br />
              TRANSFORMED.
            </h1>

            <p className="text-white/65 text-lg leading-relaxed mb-8 max-w-md">
              Interior &amp; exterior painting, drywall repair, and cabinet refinishing done right the first time. Serving Orlando and surrounding areas since 2012.
            </p>

            {/* CRO: Primary CTA → calendar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <a href="#book" className="flex items-center justify-center gap-2 text-white font-black px-7 py-4 rounded-xl text-base transition-all duration-200 hover:opacity-90 hover:shadow-xl cursor-pointer"
                style={{ background: RED }}>
                <Calendar size={18}/> Book Free Estimate
              </a>
              <a href={`tel:${PHONE_NUM}`} className="flex items-center justify-center gap-2 border-2 border-white/25 hover:border-white/50 text-white font-bold px-7 py-4 rounded-xl text-base transition-all duration-200 cursor-pointer">
                <Phone size={18}/>{PHONE_NUM}
              </a>
            </div>

            {/* CRO: social proof strip in hero */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-white/10 pt-8">
              {[
                { v: "500+", l: "Projects Done" },
                { v: "4.9★", l: "Google Rating" },
                { v: "12 yrs", l: "In Business" },
                { v: "Free", l: "Estimates" },
              ].map(({ v, l }) => (
                <div key={l}>
                  <div className="font-black text-xl leading-none" style={{ color: RED }}>{v}</div>
                  <div className="text-white/40 text-xs mt-0.5">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: photo with diagonal clip */}
        <div className="hidden md:block absolute top-0 right-0 w-1/2 h-full" style={{ clipPath: "polygon(8% 0, 100% 0, 100% 100%, 0% 100%)" }}>
          <img
            src="https://images.unsplash.com/photo-1599619585752-c3edb42a414c?auto=format&fit=crop&w=1200&q=85"
            alt="Freshly painted living room by López Painting"
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0" style={{ background: `linear-gradient(to right, ${NAVY}/40, transparent 40%)` }} />
        </div>
      </section>

      {/* ── TRUST STRIP ── */}
      <div className="bg-gray-50 border-y border-gray-100 py-5 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-center md:justify-between items-center gap-6">
          {[
            { icon: "✓", text: "FL License #CRC-1335892" },
            { icon: "✓", text: "$1M Liability Insurance" },
            { icon: "✓", text: "Sherwin-Williams Certified" },
            { icon: "✓", text: "Written Estimates, No Pressure" },
            { icon: "✓", text: "Same-Week Scheduling" },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-sm font-semibold text-gray-600">
              <span className="font-black" style={{ color: RED }}>{icon}</span>{text}
            </div>
          ))}
        </div>
      </div>

      {/* ── SERVICES ── */}
      <section id="services" className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-14">
            <div>
              <span className="text-xs font-bold tracking-widest uppercase" style={{ color: RED }}>What We Do</span>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight mt-2 leading-tight" style={{ color: NAVY }}>
                Expert Painting &amp;<br />Drywall Services.
              </h2>
            </div>
            <a href="#book" className="shrink-0 inline-flex items-center gap-2 text-white font-bold px-5 py-3 rounded-xl text-sm transition-all duration-200 hover:opacity-90 cursor-pointer"
              style={{ background: NAVY }}>
              <Calendar size={15}/> Schedule Estimate
            </a>
          </div>

          {/* 3 + 2 grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-5">
            {SERVICES.slice(0, 3).map(svc => (
              <ServiceCard key={svc.id} {...svc} />
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {SERVICES.slice(3).map(svc => (
              <ServiceCard key={svc.id} {...svc} />
            ))}
          </div>
        </div>
      </section>

      {/* ── BEFORE / AFTER ── */}
      <section id="projects" className="py-24 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: RED }}>Our Work</span>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mt-2 leading-tight" style={{ color: NAVY }}>
              See the Transformation.
            </h2>
            <p className="text-gray-500 mt-3 text-base max-w-md mx-auto">Click each card to reveal the after. Real projects, real results.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {BEFORE_AFTERS.map(p => <BeforeAfterCard key={p.label} {...p} />)}
          </div>
          {/* CRO: CTA after gallery while transformation is top of mind */}
          <div className="mt-10 text-center">
            <a href="#book" className="inline-flex items-center gap-2 text-white font-black px-8 py-4 rounded-xl text-base transition-all duration-200 hover:opacity-90 hover:shadow-xl cursor-pointer"
              style={{ background: RED }}>
              <Calendar size={18}/> Book Your Free Estimate
            </a>
            <p className="mt-3 text-gray-400 text-sm">Free visit · Written quote · No pressure</p>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <div className="py-16 px-4 bg-white border-y border-gray-100">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: RED }}>The Process</span>
            <h2 className="text-3xl font-black mt-2" style={{ color: NAVY }}>Simple. Fast. Beautiful.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { n: "01", title: "Book a Free Estimate", body: "Pick a date on our calendar. We visit, measure, and walk through the scope with you — no sales pressure.", cta: true },
              { n: "02", title: "Get Your Written Quote", body: "You receive a detailed, itemized quote within 24 hours. No surprises, no hidden fees.", cta: false },
              { n: "03", title: "We Transform Your Space", body: "Our crew shows up on time, protects your space, and delivers a flawless finish. We clean up completely.", cta: false },
            ].map(step => (
              <div key={step.n} className="flex flex-col gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-white shrink-0" style={{ background: RED }}>
                  {step.n}
                </div>
                <h3 className="font-black text-lg" style={{ color: NAVY }}>{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed flex-1">{step.body}</p>
                {step.cta && (
                  <a href="#book" className="inline-flex items-center gap-1.5 text-sm font-bold transition-colors cursor-pointer" style={{ color: RED }}>
                    <Calendar size={14}/> Book now →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── BOOKING CALENDAR ── */}
      <section id="book" className="py-24 px-4" style={{ background: NAVY }}>
        {/* Decorative paint stroke — KEEP */}
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: RED }}>Schedule</span>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mt-2 leading-tight">
              Book Your Free Estimate.
            </h2>
            <p className="text-white/50 mt-3 text-base max-w-md mx-auto">
              Pick a date that works for you. We'll visit, assess, and hand you a written quote — no obligation.
            </p>
          </div>
          <BookingCalendar />
          <div className="mt-10 flex flex-wrap justify-center gap-8 text-white/50 text-sm">
            {["Estimate visits are free","No obligation quote","We bring paint samples","Crew available Mon–Fri"].map(i => (
              <div key={i} className="flex items-center gap-2"><Check size={14} style={{ color: RED }}/>{i}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="reviews" className="py-24 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-14">
            <div>
              <span className="text-xs font-bold tracking-widest uppercase" style={{ color: RED }}>Reviews</span>
              <h2 className="text-4xl font-black mt-2 leading-tight" style={{ color: NAVY }}>
                Orlando Homeowners<br />Love the Results.
              </h2>
            </div>
            <div className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 px-5 py-4 shadow-sm shrink-0">
              <div className="text-5xl font-black leading-none" style={{ color: NAVY }}>4.9</div>
              <div>
                <div className="flex gap-0.5 mb-1">{[...Array(5)].map((_,i) => <Star key={i} size={15} fill={RED} style={{ color: RED }}/>)}</div>
                <div className="text-gray-400 text-xs">180+ Google Reviews</div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-5 mb-10">
            {TESTIMONIALS.map((t, i) => (
              <div key={t.name} className={`rounded-2xl p-8 flex flex-col ${i === 1 ? "text-white shadow-xl md:-translate-y-3" : "bg-white border border-gray-100 shadow-sm"}`}
                style={i === 1 ? { background: NAVY } : {}}>
                <div className="flex gap-0.5 mb-2">{[...Array(t.stars)].map((_,j) => <Star key={j} size={13} fill={RED} style={{ color: RED }}/>)}</div>
                <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: RED }}>{t.job}</div>
                <p className={`text-sm leading-relaxed mb-6 flex-1 ${i === 1 ? "text-white/65" : "text-gray-600"}`}>"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0" style={{ background: RED }}>{t.name[0]}</div>
                  <div>
                    <div className={`font-bold text-sm ${i === 1 ? "text-white" : ""}`} style={i !== 1 ? { color: NAVY } : {}}>{t.name}</div>
                    <div className={`text-xs flex items-center gap-1 ${i === 1 ? "text-white/40" : "text-gray-400"}`}><MapPin size={9}/>{t.location}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CRO: CTA when trust is highest */}
          <div className="flex flex-col sm:flex-row items-center gap-4 p-6 rounded-2xl" style={{ background: NAVY }}>
            <p className="text-white/60 text-sm flex-1">
              <span className="text-white font-bold">Ready to transform your space?</span> Join 500+ Orlando homeowners who trust López.
            </p>
            <a href="#book" className="shrink-0 flex items-center gap-2 text-white font-bold px-5 py-3 rounded-xl text-sm transition-all duration-200 hover:opacity-90 cursor-pointer"
              style={{ background: RED }}>
              <Calendar size={15}/> Book Free Estimate
            </a>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: RED }}>FAQ</span>
            <h2 className="text-4xl font-black mt-2" style={{ color: NAVY }}>Common Questions.</h2>
          </div>
          <div className="flex flex-col gap-3 mb-12">
            {FAQS.map(f => <FaqItem key={f.q} {...f} />)}
          </div>
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-4">More questions? We're happy to talk.</p>
            <a href="#book" className="inline-flex items-center gap-2 text-white font-black px-8 py-4 rounded-xl text-base transition-all duration-200 hover:opacity-90 hover:shadow-xl cursor-pointer"
              style={{ background: RED }}>
              <Calendar size={18}/> Book Free Estimate
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="text-white py-16 px-4 pb-28 md:pb-16" style={{ background: NAVY }}>
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-2">
            <LopezLogo variant="light" className="w-56 mb-5" />
            <p className="text-white/40 text-sm leading-relaxed mb-5 max-w-xs">
              Residential and commercial painting &amp; drywall serving Orlando, FL and surrounding areas. Licensed, insured, quality guaranteed.
            </p>
            <a href={`tel:${PHONE_NUM}`} className="inline-flex items-center gap-3 font-bold text-lg transition-colors cursor-pointer hover:opacity-80" style={{ color: RED }}>
              <Phone size={18}/>{PHONE_NUM}
            </a>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 text-xs tracking-widest uppercase">Services</h4>
            <ul className="space-y-2.5 text-white/40 text-sm">
              {SERVICE_OPTIONS.slice(0,5).map(s => <li key={s} className="hover:text-white/80 transition-colors cursor-pointer">{s}</li>)}
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 text-xs tracking-widest uppercase">Contact</h4>
            <div className="space-y-3.5 text-white/40 text-sm">
              <div className="flex items-start gap-2.5"><MapPin size={14} className="mt-0.5 shrink-0" style={{ color: RED }}/><span>1820 E Colonial Dr<br />Orlando, FL 32803</span></div>
              <div className="flex items-center gap-2.5"><Phone size={14} style={{ color: RED }}/><a href={`tel:${PHONE_NUM}`} className="hover:text-white/80 cursor-pointer">{PHONE_NUM}</a></div>
              <div className="flex items-center gap-2.5"><Clock size={14} style={{ color: RED }}/><span>Mon–Fri 8am–6pm</span></div>
              <div className="flex items-center gap-2.5"><Calendar size={14} style={{ color: RED }}/><a href="#book" className="hover:text-white/80 cursor-pointer">Book online 24/7</a></div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-3 text-white/25 text-xs">
          <div>© 2024 López Painting &amp; Drywall. All rights reserved.</div>
          <div>Built by <span className="text-white/50 font-semibold">Acrosoft Labs</span></div>
        </div>
      </footer>

      {/* ── STICKY MOBILE CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t px-4 py-3 flex gap-3" style={{ background: NAVY, borderColor: "rgba(255,255,255,0.1)" }}>
        <a href="#book" className="flex-1 flex items-center justify-center gap-2 text-white font-black py-3.5 rounded-xl text-base transition-opacity cursor-pointer hover:opacity-90"
          style={{ background: RED }}>
          <Calendar size={18}/> Book Estimate
        </a>
        <a href={`tel:${PHONE_NUM}`} className="flex-1 flex items-center justify-center gap-2 text-white font-bold py-3.5 rounded-xl text-sm border transition-colors cursor-pointer"
          style={{ borderColor: "rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)" }}>
          <Phone size={16}/> Call Us
        </a>
      </div>
    </div>
  );
}

// ── SERVICE CARD ──────────────────────────────────────────────────────────────
function ServiceCard({ title, desc, photo }: { title: string; desc: string; photo: string; id: string; Icon: React.ComponentType<{size?: number}> }) {
  return (
    <div className="group rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-200 bg-white flex flex-col cursor-pointer">
      <div className="aspect-video relative overflow-hidden">
        <img src={photo} alt={title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-200" />
      </div>
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-black text-lg mb-1.5" style={{ color: NAVY }}>{title}</h3>
        <p className="text-gray-500 text-sm leading-relaxed flex-1">{desc}</p>
        <a href="#book" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold transition-colors cursor-pointer" style={{ color: RED }}>
          <Calendar size={13}/> Book Estimate →
        </a>
      </div>
    </div>
  );
}
