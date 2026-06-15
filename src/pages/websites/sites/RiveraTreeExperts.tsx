import { useState } from "react";
import {
  Phone, Star, Check, MapPin, Clock, ChevronRight, ChevronDown, ChevronUp,
  Axe, Leaf, Scissors, Shield, Award, FileCheck, AlertTriangle,
} from "lucide-react";

const PHONE = "(713) 555-8733";
const PHONE_DISPLAY = "(713) 555-TREE";

const TICKER_ITEMS = [
  "Licensed & Insured",
  "ISA Certified Arborists",
  "25+ Years Experience",
  "24/7 Emergency Response",
  "Free Estimates",
  "Family Owned & Operated",
  "Fully Bonded",
  "Houston's #1 Tree Service",
];

const SERVICES = [
  {
    id: "removal",
    title: "Tree Removal",
    desc: "Safe removal of any tree — from a sapling to a 100-foot oak. We protect your property throughout the entire process.",
    icon: Axe,
    featured: true,
    photo: "https://images.unsplash.com/photo-1474742817425-9f91918183b7?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "trimming",
    title: "Tree Trimming",
    desc: "Expert pruning by ISA-certified arborists to improve health, shape, and safety.",
    icon: Scissors,
    featured: false,
  },
  {
    id: "stump",
    title: "Stump Grinding",
    desc: "Full removal below grade. Reclaim your yard for replanting, paving, or building.",
    icon: null,
    featured: false,
  },
  {
    id: "emergency",
    title: "24/7 Emergency",
    desc: "Tree on your roof? Storm knocked one down? We respond 24/7 — holidays included.",
    icon: AlertTriangle,
    featured: false,
    urgent: true,
  },
  {
    id: "lot",
    title: "Lot Clearing",
    desc: "Full land clearing for construction and development. Industrial equipment for any scale.",
    icon: Leaf,
    featured: false,
  },
];

const STATS = [
  { value: "25+", label: "Years in Business" },
  { value: "5,000+", label: "Trees Removed" },
  { value: "4.9★", label: "Google Rating" },
  { value: "90 min", label: "Avg. Emergency Response" },
];

const TESTIMONIALS = [
  {
    name: "Maria G.",
    location: "Katy, TX",
    stars: 5,
    job: "Emergency removal after Hurricane Harvey",
    text: "A 60-foot pine came down on my fence at 2am. Rivera answered on the first ring, showed up in under an hour, and had everything cleared before sunrise. Absolutely unreal.",
  },
  {
    name: "James P.",
    location: "Sugar Land, TX",
    stars: 5,
    job: "3 large oak removals + stump grinding",
    text: "I've used 4 different tree services over the years. Rivera is on another level — professional crew, fair pricing, and they left my yard spotless. Won't call anyone else.",
  },
  {
    name: "Sandra R.",
    location: "The Woodlands, TX",
    stars: 5,
    job: "Annual tree maintenance program",
    text: "Third generation of my family using Rivera. Carlos trimmed my grandparents' trees in the '90s, and Miguel still brings that same pride to every job. Truly a family you can trust.",
  },
];

const TRUST_ITEMS = [
  { label: "TX Tree Care License", value: "#TX-7823", Icon: FileCheck },
  { label: "General Liability", value: "$2M Insured", Icon: Shield },
  { label: "ISA Certified", value: "Every Crew", Icon: Award },
  { label: "BBB Rating", value: "A+", Icon: Star },
];

const FAQS = [
  {
    q: "How fast do you respond to emergency calls?",
    a: "For storm damage and fallen trees, our crew typically arrives within 90 minutes — 24/7, including holidays. During hurricane season we keep additional crews on standby across the Houston metro.",
  },
  {
    q: "Do you clean up after the job?",
    a: "100%. We haul away all debris — branches, logs, and wood chips. We'll rake and blow the area when we're done. You won't know we were there, except the tree will be gone.",
  },
  {
    q: "Are you licensed and insured?",
    a: "Yes. We hold Texas Tree Care License #TX-7823, $2M general liability insurance, and full worker's compensation coverage. We're also fully bonded. We provide certificates on request before any job.",
  },
  {
    q: "How much does tree removal cost?",
    a: "It depends on the tree's size, location, and access. Small trees start around $300; large or complex jobs can be $1,500+. We always provide a free, no-obligation written estimate before any work begins — no hidden fees.",
  },
  {
    q: "Can you remove a tree that's very close to my house?",
    a: "Yes — this is our specialty. We use aerial lifts, precision rigging, and sectional removal techniques to safely take down trees in tight spaces without damaging your roof, fence, or landscaping.",
  },
  {
    q: "What areas do you cover?",
    a: "We serve Greater Houston including Sugar Land, Katy, The Woodlands, Pearland, Friendswood, League City, Cypress, and all areas within 50 miles of downtown Houston.",
  },
];

// ── LOGO ──────────────────────────────────────────────────────────────────────
function RiveraLogo({ variant = "dark", className = "" }: { variant?: "dark" | "light"; className?: string }) {
  const wordmark = variant === "dark" ? "#ffffff" : "#0d2e1a";
  const tagline = variant === "dark" ? "rgba(255,255,255,0.35)" : "#9ca3af";
  return (
    <svg viewBox="0 0 272 70" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Rivera Tree Experts" role="img">
      <circle cx="35" cy="35" r="34" fill="#0d2e1a" />
      <circle cx="35" cy="35" r="29" fill="none" stroke="#f97316" strokeWidth="1.5" />
      <circle cx="35" cy="35" r="23" fill="none" stroke="#f97316" strokeWidth="0.6" strokeDasharray="2.5 3.5" />
      <rect x="32" y="40" width="6" height="18" rx="2" fill="#f97316" />
      <path d="M32,56 C29,59 22,62 20,60 C23,55 29,52 32,49 Z" fill="#f97316" opacity="0.75" />
      <path d="M38,56 C41,59 48,62 50,60 C47,55 41,52 38,49 Z" fill="#f97316" opacity="0.75" />
      <circle cx="35" cy="27" r="14" fill="#22c55e" />
      <circle cx="23" cy="33" r="11" fill="#16a34a" />
      <circle cx="47" cy="31" r="11" fill="#16a34a" />
      <circle cx="28" cy="19" r="10" fill="#4ade80" />
      <circle cx="43" cy="20" r="10" fill="#22c55e" />
      <circle cx="35" cy="15" r="9" fill="#4ade80" />
      <circle cx="26" cy="26" r="7" fill="#22c55e" />
      <circle cx="44" cy="27" r="7" fill="#22c55e" />
      <circle cx="29" cy="16" r="5" fill="#bbf7d0" opacity="0.45" />
      <circle cx="41" cy="19" r="3.5" fill="#bbf7d0" opacity="0.3" />
      <text x="80" y="30" fontFamily="'Arial Black', 'Arial Bold', Arial, sans-serif" fontWeight="900" fontSize="25" fill={wordmark} letterSpacing="-0.5">RIVERA</text>
      <text x="81" y="46" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="11" fill="#f97316" letterSpacing="4">TREE EXPERTS</text>
      <line x1="81" y1="52" x2="268" y2="52" stroke={variant === "dark" ? "rgba(255,255,255,0.12)" : "#e5e7eb"} strokeWidth="0.8" />
      <text x="81" y="63" fontFamily="Arial, sans-serif" fontWeight="400" fontSize="8.5" fill={tagline} letterSpacing="1.8">HOUSTON, TX  ·  EST. 1998</text>
    </svg>
  );
}

function RiveraLogoBadge({ size = 38 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 70 70" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="35" cy="35" r="34" fill="#0d2e1a" />
      <circle cx="35" cy="35" r="29" fill="none" stroke="#f97316" strokeWidth="2" />
      <circle cx="35" cy="35" r="23" fill="none" stroke="#f97316" strokeWidth="0.8" strokeDasharray="2.5 3.5" />
      <rect x="32" y="40" width="6" height="18" rx="2" fill="#f97316" />
      <path d="M32,56 C29,59 22,62 20,60 C23,55 29,52 32,49 Z" fill="#f97316" opacity="0.75" />
      <path d="M38,56 C41,59 48,62 50,60 C47,55 41,52 38,49 Z" fill="#f97316" opacity="0.75" />
      <circle cx="35" cy="27" r="14" fill="#22c55e" />
      <circle cx="23" cy="33" r="11" fill="#16a34a" />
      <circle cx="47" cy="31" r="11" fill="#16a34a" />
      <circle cx="28" cy="19" r="10" fill="#4ade80" />
      <circle cx="43" cy="20" r="10" fill="#22c55e" />
      <circle cx="35" cy="15" r="9" fill="#4ade80" />
      <circle cx="26" cy="26" r="7" fill="#22c55e" />
      <circle cx="44" cy="27" r="7" fill="#22c55e" />
      <circle cx="29" cy="16" r="5" fill="#bbf7d0" opacity="0.45" />
    </svg>
  );
}

// ── FAQ ITEM ──────────────────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border rounded-xl overflow-hidden transition-colors duration-200 ${open ? "border-[#f97316]" : "border-gray-200 hover:border-gray-300"}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 p-5 text-left cursor-pointer"
        aria-expanded={open}
      >
        <span className="font-bold text-[#0d2e1a] text-base leading-snug">{q}</span>
        {open ? <ChevronUp size={18} className="text-[#f97316] shrink-0" /> : <ChevronDown size={18} className="text-gray-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-5 text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-4">
          {a}
        </div>
      )}
    </div>
  );
}

// ── ESTIMATE FORM ─────────────────────────────────────────────────────────────
function EstimateForm() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", service: "", message: "" });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-12">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <Check size={28} className="text-green-600" />
        </div>
        <h3 className="text-xl font-black text-[#0d2e1a] mb-2">Request Received!</h3>
        <p className="text-gray-500 text-sm max-w-xs">We'll call you back within 2 hours during business hours, or first thing in the morning for after-hours requests.</p>
        <a href={`tel:${PHONE}`} className="mt-6 flex items-center gap-2 text-[#f97316] font-bold hover:text-[#ea6c10] transition-colors cursor-pointer">
          <Phone size={16} /> Or call us right now
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-1.5">Your Name</label>
          <input
            id="name"
            type="text"
            required
            placeholder="John Rivera"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316] focus:border-transparent transition"
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number</label>
          <input
            id="phone"
            type="tel"
            required
            placeholder="(713) 000-0000"
            value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316] focus:border-transparent transition"
          />
        </div>
      </div>
      <div>
        <label htmlFor="service" className="block text-sm font-semibold text-gray-700 mb-1.5">Service Needed</label>
        <select
          id="service"
          required
          value={form.service}
          onChange={e => setForm({ ...form, service: e.target.value })}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316] focus:border-transparent transition bg-white cursor-pointer"
        >
          <option value="">Select a service…</option>
          <option>Tree Removal</option>
          <option>Tree Trimming</option>
          <option>Stump Grinding</option>
          <option>Emergency Service</option>
          <option>Lot Clearing</option>
          <option>Not sure yet</option>
        </select>
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-semibold text-gray-700 mb-1.5">Describe Your Situation <span className="text-gray-400 font-normal">(optional)</span></label>
        <textarea
          id="message"
          rows={3}
          placeholder="E.g., large oak tree near the house, neighbor's tree fell on fence…"
          value={form.message}
          onChange={e => setForm({ ...form, message: e.target.value })}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316] focus:border-transparent transition resize-none"
        />
      </div>
      <button
        type="submit"
        className="w-full bg-[#f97316] hover:bg-[#ea6c10] text-white font-black py-4 rounded-xl text-base transition-all duration-200 hover:shadow-[0_8px_30px_rgba(249,115,22,0.35)] cursor-pointer flex items-center justify-center gap-2"
      >
        Request Free Estimate <ChevronRight size={18} />
      </button>
      <p className="text-center text-gray-400 text-xs">No obligation. No hidden fees. We'll call you back within 2 hours.</p>
    </form>
  );
}

// ── PAGE ──────────────────────────────────────────────────────────────────────
export default function RiveraTreeExperts() {
  return (
    <div className="font-sans overflow-x-hidden">
      <style>{`
        @keyframes rivera-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes rivera-ping-slow {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.6); opacity: 0; }
        }
        .rivera-marquee { animation: rivera-marquee 32s linear infinite; }
        .rivera-ping { animation: rivera-ping-slow 2s ease-in-out infinite; }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0d2e1a]/96 backdrop-blur-sm border-b border-[#1a4a2e]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <RiveraLogoBadge size={36} />
            <div className="hidden sm:block">
              <div className="text-white font-black text-sm tracking-tight leading-none">RIVERA TREE EXPERTS</div>
              <div className="text-white/35 text-[10px] leading-none tracking-widest uppercase mt-0.5">Houston, TX · Est. 1998</div>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-8">
            {[["Services", "#services"], ["About", "#about"], ["Reviews", "#reviews"], ["FAQ", "#faq"]].map(([label, href]) => (
              <a key={label} href={href} className="text-white/60 hover:text-white text-sm transition-colors duration-200 cursor-pointer">{label}</a>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a href="#estimate" className="hidden sm:flex items-center gap-1.5 border border-white/25 hover:border-white/50 text-white/80 hover:text-white text-sm font-semibold px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer">
              Free Estimate
            </a>
            <a href={`tel:${PHONE}`} className="flex items-center gap-2 bg-[#f97316] hover:bg-[#ea6c10] text-white font-bold px-4 py-2 rounded-lg transition-colors duration-200 cursor-pointer text-sm">
              <Phone size={15} />
              <span className="hidden sm:inline">{PHONE_DISPLAY}</span>
              <span className="sm:hidden">Call Now</span>
            </a>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen bg-[#0d2e1a] pt-16 flex items-center overflow-hidden">
        {/* Grid texture */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(#4ade80 1px, transparent 1px), linear-gradient(90deg, #4ade80 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
        <div className="absolute top-0 right-0 w-2/5 h-full opacity-[0.06]" style={{ background: "linear-gradient(135deg, transparent 40%, #f97316 100%)" }} />

        {/* Decorative tree silhouette — KEEP */}
        <div className="absolute left-0 bottom-0 w-1/3 opacity-[0.05] pointer-events-none select-none">
          <svg viewBox="0 0 300 420" xmlns="http://www.w3.org/2000/svg">
            <rect x="127" y="295" width="46" height="125" rx="5" fill="#4ade80" />
            <ellipse cx="150" cy="265" rx="130" ry="105" fill="#22c55e" />
            <ellipse cx="150" cy="195" rx="105" ry="85" fill="#16a34a" />
            <ellipse cx="150" cy="130" rx="82" ry="68" fill="#15803d" />
            <ellipse cx="150" cy="73" rx="58" ry="52" fill="#166534" />
          </svg>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Copy */}
          <div>
            {/* Response time badge — CRO: urgency above fold */}
            <div className="inline-flex items-center gap-2.5 bg-[#f97316]/15 border border-[#f97316]/35 text-[#f97316] text-xs font-bold px-3.5 py-1.5 rounded-full mb-6 tracking-widest uppercase">
              <span className="relative flex h-2 w-2">
                <span className="rivera-ping absolute inline-flex h-full w-full rounded-full bg-[#f97316] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#f97316]" />
              </span>
              Emergency Response · Avg. 90 Minutes
            </div>

            <h1 className="text-[clamp(3rem,8vw,5.5rem)] font-black text-white leading-[0.92] tracking-tighter mb-5">
              TREES<br />
              <span className="text-[#f97316]">HANDLED.</span>
              <br />
              PROPERTY<br />
              PROTECTED.
            </h1>

            <p className="text-white/60 text-lg mb-7 max-w-md leading-relaxed">
              Houston's most trusted family-owned tree service since 1998. From routine trimming to emergency removal — done right, guaranteed.
            </p>

            {/* CRO: Phone as PRIMARY action, estimate secondary */}
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <a
                href={`tel:${PHONE}`}
                className="flex items-center justify-center gap-3 bg-[#f97316] hover:bg-[#ea6c10] text-white font-black px-7 py-4 rounded-xl text-lg transition-all duration-200 hover:shadow-[0_8px_30px_rgba(249,115,22,0.4)] cursor-pointer"
              >
                <Phone size={20} />
                {PHONE_DISPLAY}
              </a>
              <a
                href="#estimate"
                className="flex items-center justify-center gap-2 border-2 border-white/25 hover:border-white/60 hover:bg-white/5 text-white font-bold px-7 py-4 rounded-xl text-base transition-all duration-200 cursor-pointer"
              >
                Free Estimate <ChevronRight size={18} />
              </a>
            </div>

            {/* Trust micro-badges */}
            <div className="flex flex-wrap gap-x-5 gap-y-2 mb-8">
              {["Licensed & Insured", "ISA Certified", "Free Estimates", "No Hidden Fees"].map(item => (
                <div key={item} className="flex items-center gap-1.5 text-white/50 text-sm">
                  <Check size={13} className="text-[#f97316]" /> {item}
                </div>
              ))}
            </div>

            {/* CRO: Social proof strip INSIDE hero — visible above fold */}
            <div className="border-t border-white/10 pt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { value: "4.9★", sub: "200+ Google Reviews" },
                { value: "5,000+", sub: "Jobs Completed" },
                { value: "25+", sub: "Years Experience" },
                { value: "24/7", sub: "Emergency Service" },
              ].map(item => (
                <div key={item.sub}>
                  <div className="text-[#f97316] font-black text-xl leading-none">{item.value}</div>
                  <div className="text-white/40 text-xs mt-0.5 leading-tight">{item.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Photo with floating stat cards */}
          <div className="hidden md:block relative">
            <div className="rounded-2xl overflow-hidden border border-[#1a4a2e] shadow-2xl aspect-[4/5] relative bg-[#0f3520]">
              <img
                src="https://images.unsplash.com/photo-1626828476637-5bd713ef9f22?auto=format&fit=crop&w=900&q=80"
                alt="Arborist climbing and cutting a large tree"
                className="w-full h-full object-cover"
                loading="eager"
              />
              <div className="absolute inset-0 bg-[#0d2e1a]/35" />
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#0d2e1a]/70 to-transparent" />
            </div>

            {/* Floating cards — CRO: reinforce trust without scrolling */}
            <div className="absolute -left-8 top-10 bg-[#f97316] text-white rounded-2xl px-5 py-4 shadow-2xl">
              <div className="text-4xl font-black leading-none">25+</div>
              <div className="text-[11px] font-semibold opacity-90 mt-0.5">Years Serving Houston</div>
            </div>
            <div className="absolute -right-6 top-1/2 -translate-y-1/2 bg-white text-[#0d2e1a] rounded-2xl px-5 py-4 shadow-2xl">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-green-500 opacity-60" />
                  <span className="relative h-2.5 w-2.5 rounded-full bg-green-500" />
                </span>
                <span className="text-green-600 text-[10px] font-black uppercase tracking-wider">Available Now</span>
              </div>
              <div className="text-2xl font-black leading-none text-[#0d2e1a]">90 min</div>
              <div className="text-[11px] text-gray-400 mt-0.5">Emergency response</div>
            </div>
            <div className="absolute -right-4 bottom-12 bg-white text-[#0d2e1a] rounded-2xl px-5 py-3 shadow-2xl">
              <div className="flex gap-0.5 mb-0.5">
                {[...Array(5)].map((_, i) => <Star key={i} size={12} fill="#f97316" className="text-[#f97316]" />)}
              </div>
              <div className="text-xl font-black leading-none">4.9 / 5</div>
              <div className="text-[10px] text-gray-400">200+ Reviews</div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-white/25">
          <span className="text-[10px] tracking-widest uppercase">Scroll</span>
          <ChevronDown size={18} className="animate-bounce" />
        </div>

        {/* Bottom diagonal */}
        <div className="absolute bottom-0 left-0 right-0 h-16 overflow-hidden pointer-events-none">
          <svg viewBox="0 0 1440 64" preserveAspectRatio="none" className="w-full h-full">
            <polygon points="0,64 1440,0 1440,64" fill="#f97316" />
          </svg>
        </div>
      </section>

      {/* ── MARQUEE TICKER ── */}
      <div className="bg-[#f97316] py-3.5 overflow-hidden">
        <div className="flex whitespace-nowrap">
          <div className="flex rivera-marquee">
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
              <span key={i} className="inline-flex items-center gap-3 mx-5 text-[#0d2e1a] font-black text-xs tracking-widest uppercase">
                {item}<span className="w-1.5 h-1.5 bg-[#0d2e1a]/40 rounded-full" />
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── SERVICES BENTO ── */}
      <section id="services" className="bg-[#f5f2ec] py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
            <div>
              <span className="text-[#f97316] font-bold text-xs tracking-widest uppercase">What We Do</span>
              <h2 className="text-4xl md:text-5xl font-black text-[#0d2e1a] tracking-tight mt-2 leading-tight">
                Tree Services,<br />Done Right.
              </h2>
            </div>
            {/* CRO: section-level CTA */}
            <a href={`tel:${PHONE}`} className="shrink-0 inline-flex items-center gap-2 bg-[#0d2e1a] hover:bg-[#1a4a2e] text-white font-bold px-5 py-3 rounded-xl transition-colors duration-200 cursor-pointer text-sm">
              <Phone size={15} /> Call for Pricing
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4" style={{ gridAutoRows: "minmax(220px, auto)" }}>

            {/* Tree Removal — hero card with real photo */}
            <div className="sm:col-span-2 md:row-span-2 rounded-2xl flex flex-col justify-between relative overflow-hidden group cursor-pointer">
              <img
                src="https://images.unsplash.com/photo-1474742817425-9f91918183b7?auto=format&fit=crop&w=900&q=80"
                alt="Professional tree removal in action"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {/* Base dark layer */}
              <div className="absolute inset-0 bg-[#0d2e1a]/60 group-hover:bg-[#0d2e1a]/50 transition-colors duration-300" />
              {/* Top gradient — heavy where title and icon live */}
              <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(13,46,26,0.92) 0%, rgba(13,46,26,0.55) 55%, rgba(13,46,26,0.80) 100%)" }} />
              {/* Decorative silhouette — KEEP */}
              <div className="absolute right-0 bottom-0 w-48 opacity-15 pointer-events-none" aria-hidden="true">
                <svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
                  <rect x="104" y="240" width="32" height="80" rx="3" fill="#4ade80" />
                  <ellipse cx="120" cy="215" rx="98" ry="78" fill="#22c55e" />
                  <ellipse cx="120" cy="158" rx="78" ry="64" fill="#16a34a" />
                  <ellipse cx="120" cy="105" rx="60" ry="52" fill="#15803d" />
                  <ellipse cx="120" cy="58" rx="42" ry="38" fill="#166534" />
                </svg>
              </div>
              <div className="relative z-10 p-8 flex flex-col h-full justify-between">
                <div>
                  <div className="w-12 h-12 bg-[#f97316] rounded-xl flex items-center justify-center mb-5">
                    <Axe size={22} className="text-white" />
                  </div>
                  <h3 className="text-3xl md:text-4xl font-black text-white mb-3 leading-tight">Tree Removal</h3>
                  <p className="text-white/65 text-base leading-relaxed max-w-sm">
                    Safe removal of any tree — from a sapling to a 100-foot oak. We protect your structure, landscaping, and neighbors throughout.
                  </p>
                </div>
                {/* CRO: micro-CTA per service */}
                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <a href={`tel:${PHONE}`} className="flex items-center gap-2 bg-[#f97316] hover:bg-[#ea6c10] text-white font-bold px-5 py-3 rounded-xl text-sm transition-all duration-200 cursor-pointer">
                    <Phone size={15} /> Call for Estimate
                  </a>
                  <a href="#estimate" className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold px-5 py-3 rounded-xl text-sm transition-all duration-200 cursor-pointer">
                    Request Quote <ChevronRight size={15} />
                  </a>
                </div>
              </div>
            </div>

            {/* Tree Trimming */}
            <div className="bg-[#1a4a2e] rounded-2xl p-6 flex flex-col justify-between group cursor-pointer transition-colors duration-200 hover:bg-[#1e5c35]">
              <div>
                <div className="w-10 h-10 bg-[#f97316]/20 rounded-lg flex items-center justify-center mb-3">
                  <Scissors size={18} className="text-[#f97316]" />
                </div>
                <h3 className="text-xl font-black text-white mb-2">Tree Trimming</h3>
                <p className="text-white/50 text-sm leading-relaxed">Expert pruning by ISA-certified arborists to improve health, shape, and safety.</p>
              </div>
              <a href={`tel:${PHONE}`} className="flex items-center gap-2 text-[#f97316] text-sm font-bold group-hover:gap-3 transition-all duration-200 mt-4 cursor-pointer">
                <Phone size={14} /> Get a Quote
              </a>
            </div>

            {/* Stump Grinding */}
            <div className="bg-white border-2 border-[#e8e3da] rounded-2xl p-6 flex flex-col justify-between group cursor-pointer transition-all duration-200 hover:border-[#f97316] hover:shadow-lg">
              <div>
                <div className="w-10 h-10 bg-[#0d2e1a] rounded-lg flex items-center justify-center mb-3">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 2v4M12 18v4M2 12h4M18 12h4M5.636 5.636l2.828 2.828M15.536 15.536l2.828 2.828M5.636 18.364l2.828-2.828M15.536 8.464l2.828-2.828" />
                  </svg>
                </div>
                <h3 className="text-xl font-black text-[#0d2e1a] mb-2">Stump Grinding</h3>
                <p className="text-[#0d2e1a]/55 text-sm leading-relaxed">Grind stumps below grade. Reclaim your yard for replanting, paving, or building.</p>
              </div>
              <a href={`tel:${PHONE}`} className="flex items-center gap-2 text-[#f97316] text-sm font-bold group-hover:gap-3 transition-all duration-200 mt-4 cursor-pointer">
                <Phone size={14} /> Get a Quote
              </a>
            </div>

            {/* Emergency */}
            <div className="bg-[#f97316] rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group cursor-pointer transition-colors duration-200 hover:bg-[#ea6c10]">
              <div className="absolute top-0 right-0 w-28 h-28 bg-white/10 rounded-full -translate-y-10 translate-x-10 pointer-events-none" />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
                  </span>
                  <span className="text-white text-[10px] font-black tracking-widest uppercase">Available Now</span>
                </div>
                <h3 className="text-xl font-black text-white mb-2">24/7 Emergency</h3>
                <p className="text-white/80 text-sm leading-relaxed">Tree on your roof? We respond 24/7 — 365 days, holidays included. Avg 90 min.</p>
              </div>
              <a href={`tel:${PHONE}`} className="flex items-center gap-2 text-white font-black text-sm mt-4 group-hover:gap-3 transition-all duration-200 cursor-pointer">
                <Phone size={15} /> Call Now — It's Free
              </a>
            </div>

            {/* Lot Clearing */}
            <div className="sm:col-span-2 bg-[#0d2e1a] rounded-2xl p-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between group cursor-pointer transition-colors duration-200 hover:bg-[#0f3520]">
              <div>
                <div className="w-10 h-10 bg-[#f97316]/20 rounded-lg flex items-center justify-center mb-3">
                  <Leaf size={18} className="text-[#f97316]" />
                </div>
                <h3 className="text-xl font-black text-white mb-2">Lot Clearing</h3>
                <p className="text-white/50 text-sm leading-relaxed max-w-sm">Full land clearing for construction, landscaping, or development. We bring industrial equipment for any scale.</p>
              </div>
              <a href="#estimate" className="shrink-0 inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold px-5 py-3 rounded-xl transition-all duration-200 text-sm cursor-pointer">
                Request Quote <ChevronRight size={15} />
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* ── EMERGENCY CTA — moved higher, key revenue driver ── */}
      <section className="bg-[#f97316] py-20 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-16 pointer-events-none overflow-hidden">
          <svg viewBox="0 0 1440 64" preserveAspectRatio="none" className="w-full h-full">
            <polygon points="0,0 1440,0 1440,64" fill="#f5f2ec" />
          </svg>
        </div>
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full -translate-x-48 pointer-events-none" />
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full translate-x-32 pointer-events-none" />

        <div className="max-w-5xl mx-auto relative z-10 pt-8 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="flex items-center gap-3 mb-5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-50" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
              </span>
              <span className="text-white font-black tracking-widest text-xs uppercase">Responding Right Now · 24/7 · 365 Days</span>
            </div>
            <h2 className="text-[clamp(2.5rem,7vw,5rem)] font-black text-white leading-[0.9] tracking-tighter mb-5">
              TREE DOWN?<br />
              DON'T WAIT.
            </h2>
            <p className="text-white/80 text-lg mb-8 leading-relaxed">
              Storm damage, fallen tree, broken limb on your roof. Every minute counts. We answer on the first ring — no voicemail, no callback queue.
            </p>
            <a
              href={`tel:${PHONE}`}
              className="inline-flex items-center gap-4 bg-[#0d2e1a] hover:bg-[#1a4a2e] text-white font-black text-2xl md:text-3xl px-8 py-5 rounded-2xl transition-all duration-200 hover:shadow-2xl cursor-pointer"
            >
              <Phone size={28} className="text-[#f97316]" />
              {PHONE_DISPLAY}
            </a>
            <p className="mt-4 text-white/60 text-sm">Real person answers. Always.</p>
          </div>

          {/* CRO: specific numbers on the right reinforce trust */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: "90 min", label: "Average response time" },
              { value: "24/7", label: "Available all year round" },
              { value: "$0", label: "Emergency call charge" },
              { value: "100%", label: "Clean-up included" },
            ].map(item => (
              <div key={item.label} className="bg-white/15 backdrop-blur-sm rounded-2xl p-5 text-center">
                <div className="text-3xl font-black text-white leading-none mb-1">{item.value}</div>
                <div className="text-white/70 text-xs leading-tight">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST CREDENTIALS ── CRO: specific license/insurance kills doubt */}
      <section className="bg-[#0d2e1a] py-14 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {TRUST_ITEMS.map(({ label, value, Icon }) => (
              <div key={label} className="flex items-center gap-4 bg-[#1a4a2e] rounded-xl p-4">
                <div className="w-10 h-10 bg-[#f97316]/20 rounded-lg flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-[#f97316]" />
                </div>
                <div>
                  <div className="text-white font-black text-sm leading-none">{value}</div>
                  <div className="text-white/40 text-xs mt-0.5">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS + ABOUT ── */}
      <section id="about" className="bg-[#0d2e1a] pb-24 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 mb-20 rounded-2xl overflow-hidden border border-[#1a4a2e]">
            {STATS.map((stat, i) => (
              <div
                key={stat.label}
                className={`p-8 text-center ${i < STATS.length - 1 ? "border-r border-[#1a4a2e]" : ""} ${i >= 2 ? "border-t md:border-t-0 border-[#1a4a2e]" : ""}`}
              >
                <div className="text-4xl md:text-5xl font-black text-[#f97316] mb-1 leading-none">{stat.value}</div>
                <div className="text-white/40 text-sm font-medium">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Story grid */}
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-[#f97316] font-bold text-xs tracking-widest uppercase">Our Story</span>
              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mt-2 mb-6 leading-tight">
                Family Owned.<br /><span className="text-[#f97316]">Houston Trusted.</span>
              </h2>
              <p className="text-white/55 leading-relaxed mb-4">
                Rivera Tree Experts was founded in 1998 by Carlos Rivera, a third-generation arborist from Central Texas. What started as a one-truck operation has grown into Houston's most trusted tree service company — without ever becoming a franchise.
              </p>
              <p className="text-white/55 leading-relaxed mb-8">
                Today, Carlos's sons Miguel and Diego lead the crew. Every job is still treated like it's in our own backyard. When you call Rivera, you talk to family.
              </p>
              <div className="flex flex-col gap-3 mb-8">
                {[
                  "ISA Certified Arborists on every crew",
                  "Full liability insurance & worker's compensation",
                  "Free, no-obligation written estimates",
                  "We clean up — you won't know we were there",
                ].map(item => (
                  <div key={item} className="flex items-center gap-3 text-white/75 text-sm">
                    <div className="w-5 h-5 bg-[#f97316] rounded-full flex items-center justify-center shrink-0">
                      <Check size={11} className="text-white" />
                    </div>
                    {item}
                  </div>
                ))}
              </div>
              {/* CRO: CTA after the story, while trust is high */}
              <a href={`tel:${PHONE}`} className="inline-flex items-center gap-2 bg-[#f97316] hover:bg-[#ea6c10] text-white font-bold px-6 py-3.5 rounded-xl transition-all duration-200 cursor-pointer text-sm hover:shadow-lg">
                <Phone size={16} /> Call the Rivera Family — {PHONE_DISPLAY}
              </a>
            </div>

            {/* Real photo */}
            <div className="relative">
              <div className="rounded-2xl overflow-hidden border border-[#1a4a2e] shadow-2xl aspect-square relative bg-[#0f3520]">
                <img
                  src="https://images.unsplash.com/photo-1657730391002-bf55ff069a80?auto=format&fit=crop&w=800&q=80"
                  alt="Arborist working on tree removal with professional equipment"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-[#0d2e1a]/30" />
              </div>
              <div className="absolute -bottom-5 -right-5 w-28 h-28 bg-[#f97316] rounded-full flex flex-col items-center justify-center text-white shadow-2xl select-none">
                <div className="text-3xl font-black leading-none">25+</div>
                <div className="text-[10px] text-center leading-tight opacity-90 font-semibold mt-0.5">Years of<br />Experience</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="reviews" className="bg-[#f5f2ec] py-24 px-4">
        <div className="max-w-7xl mx-auto">
          {/* CRO: combined header + aggregate rating */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
            <div>
              <span className="text-[#f97316] font-bold text-xs tracking-widest uppercase">What Clients Say</span>
              <h2 className="text-4xl md:text-5xl font-black text-[#0d2e1a] tracking-tight mt-2 leading-tight">
                Trusted by Houston<br />Homeowners.
              </h2>
            </div>
            <div className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 px-5 py-4 shadow-sm shrink-0">
              <div className="text-5xl font-black text-[#0d2e1a] leading-none">4.9</div>
              <div>
                <div className="flex gap-0.5 mb-1">
                  {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="#f97316" className="text-[#f97316]" />)}
                </div>
                <div className="text-gray-400 text-xs">200+ Google Reviews</div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-5 mb-10">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={t.name}
                className={`rounded-2xl p-8 flex flex-col ${i === 1 ? "bg-[#0d2e1a] text-white md:-translate-y-3 shadow-xl" : "bg-white border border-gray-100 shadow-sm"}`}
              >
                <div className="flex gap-0.5 mb-3">
                  {[...Array(t.stars)].map((_, j) => <Star key={j} size={14} fill="#f97316" className="text-[#f97316]" />)}
                </div>
                {/* CRO: specific job detail builds credibility */}
                <div className={`text-xs font-bold tracking-wider uppercase mb-3 ${i === 1 ? "text-[#f97316]" : "text-[#f97316]"}`}>{t.job}</div>
                <p className={`text-base leading-relaxed mb-6 flex-1 ${i === 1 ? "text-white/65" : "text-gray-600"}`}>"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#f97316] rounded-full flex items-center justify-center text-white font-black text-sm shrink-0">
                    {t.name[0]}
                  </div>
                  <div>
                    <div className={`font-bold text-sm ${i === 1 ? "text-white" : "text-[#0d2e1a]"}`}>{t.name}</div>
                    <div className={`text-xs flex items-center gap-1 ${i === 1 ? "text-white/40" : "text-gray-400"}`}>
                      <MapPin size={10} />{t.location}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CRO: CTA after reviews, trust is highest here */}
          <div className="flex flex-col sm:flex-row items-center gap-4 p-6 bg-[#0d2e1a] rounded-2xl">
            <div className="text-white/60 text-sm flex-1">
              <span className="text-white font-bold">Ready to join 5,000+ Houston homeowners</span> who've trusted Rivera with their trees?
            </div>
            <div className="flex gap-3 shrink-0">
              <a href={`tel:${PHONE}`} className="flex items-center gap-2 bg-[#f97316] hover:bg-[#ea6c10] text-white font-bold px-5 py-3 rounded-xl text-sm transition-all duration-200 cursor-pointer">
                <Phone size={15} /> {PHONE_DISPLAY}
              </a>
              <a href="#estimate" className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold px-5 py-3 rounded-xl text-sm transition-all duration-200 cursor-pointer">
                Free Estimate
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ — CRO: handles objections before user leaves ── */}
      <section id="faq" className="bg-white py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-[#f97316] font-bold text-xs tracking-widest uppercase">Common Questions</span>
            <h2 className="text-4xl font-black text-[#0d2e1a] tracking-tight mt-2">Got Questions?<br />We've Got Answers.</h2>
          </div>
          <div className="flex flex-col gap-3 mb-12">
            {FAQS.map(faq => <FaqItem key={faq.q} {...faq} />)}
          </div>
          {/* CRO: CTA after FAQ — user is now fully informed */}
          <div className="text-center">
            <p className="text-gray-500 mb-4">Still have questions? Just call us — we pick up.</p>
            <a href={`tel:${PHONE}`} className="inline-flex items-center gap-3 bg-[#f97316] hover:bg-[#ea6c10] text-white font-black px-8 py-4 rounded-xl text-lg transition-all duration-200 hover:shadow-[0_8px_30px_rgba(249,115,22,0.35)] cursor-pointer">
              <Phone size={20} /> {PHONE_DISPLAY}
            </a>
          </div>
        </div>
      </section>

      {/* ── ESTIMATE FORM — CRO: low-friction lead capture for non-callers ── */}
      <section id="estimate" className="bg-[#f5f2ec] py-24 px-4">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-start">

          {/* Left: Form */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <span className="text-[#f97316] font-bold text-xs tracking-widest uppercase">Free Quote</span>
            <h2 className="text-3xl font-black text-[#0d2e1a] tracking-tight mt-2 mb-2 leading-tight">Get Your Free<br />Tree Removal Estimate</h2>
            <p className="text-gray-500 text-sm mb-6">We'll call you back within 2 hours. No obligation. No hidden fees.</p>
            <EstimateForm />
          </div>

          {/* Right: Why choose us — CRO: reassurance while form is visible */}
          <div className="flex flex-col gap-6 pt-4">
            <div>
              <span className="text-[#f97316] font-bold text-xs tracking-widest uppercase">Why Rivera</span>
              <h3 className="text-3xl font-black text-[#0d2e1a] mt-2 mb-6 leading-tight">The Rivera Difference</h3>
            </div>

            {[
              { title: "We answer the phone", body: "No voicemail, no callback queue. A real Rivera family member picks up — even at 2am during a storm." },
              { title: "Upfront, written quotes", body: "You'll know exactly what the job costs before we start. Zero hidden fees. Zero surprises." },
              { title: "Full clean-up, always", body: "We haul away everything — logs, branches, wood chips. Your yard will be cleaner than we found it." },
              { title: "100% licensed & insured", body: "TX License #TX-7823 + $2M liability + worker's comp. If anything goes wrong, you're covered." },
            ].map(item => (
              <div key={item.title} className="flex gap-4">
                <div className="w-8 h-8 bg-[#f97316] rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <Check size={14} className="text-white" />
                </div>
                <div>
                  <div className="font-black text-[#0d2e1a] text-base mb-1">{item.title}</div>
                  <div className="text-gray-500 text-sm leading-relaxed">{item.body}</div>
                </div>
              </div>
            ))}

            <div className="mt-4 p-5 bg-[#0d2e1a] rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 bg-[#f97316] rounded-xl flex items-center justify-center shrink-0">
                <Phone size={20} className="text-white" />
              </div>
              <div>
                <div className="text-white/50 text-xs">Prefer to call?</div>
                <a href={`tel:${PHONE}`} className="text-white font-black text-xl hover:text-[#f97316] transition-colors cursor-pointer">{PHONE_DISPLAY}</a>
                <div className="text-white/40 text-xs mt-0.5">Available 24/7 for emergencies</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer id="contact" className="bg-[#0d2e1a] text-white py-16 px-4 pb-32 md:pb-16">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-2">
            <RiveraLogo variant="dark" className="w-64 mb-5" />
            <p className="text-white/45 leading-relaxed mb-5 max-w-sm text-sm">
              Family-owned tree service covering Greater Houston and surrounding areas. Licensed, insured, and dedicated to quality work on every job.
            </p>
            <a href={`tel:${PHONE}`} className="inline-flex items-center gap-3 text-[#f97316] hover:text-white font-bold text-xl transition-colors duration-200 cursor-pointer">
              <Phone size={20} />{PHONE_DISPLAY}
            </a>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 text-xs tracking-widest uppercase">Services</h4>
            <ul className="space-y-2.5 text-white/40 text-sm">
              {["Tree Removal", "Tree Trimming", "Stump Grinding", "Emergency Service", "Lot Clearing"].map(s => (
                <li key={s} className="hover:text-white/80 transition-colors duration-200 cursor-pointer">{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 text-xs tracking-widest uppercase">Contact</h4>
            <div className="space-y-3.5 text-white/40 text-sm">
              <div className="flex items-start gap-2.5">
                <MapPin size={14} className="mt-0.5 shrink-0 text-[#f97316]" />
                <span>4820 Westheimer Rd<br />Houston, TX 77056</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone size={14} className="text-[#f97316] shrink-0" />
                <a href={`tel:${PHONE}`} className="hover:text-white/80 transition-colors cursor-pointer">{PHONE_DISPLAY}</a>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock size={14} className="text-[#f97316] shrink-0" />
                <span>24/7 Emergency Service</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Shield size={14} className="text-[#f97316] shrink-0" />
                <span>Licensed &amp; Fully Insured</span>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-3 text-white/25 text-xs">
          <div>© 2024 Rivera Tree Experts. All rights reserved.</div>
          <div>Built by <span className="text-white/50 font-semibold">Acrosoft Labs</span></div>
        </div>
      </footer>

      {/* ── STICKY MOBILE CTA — CRO: always-on conversion on mobile ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#0d2e1a]/98 backdrop-blur-sm border-t border-[#1a4a2e] px-4 py-3 flex gap-3">
        <a
          href={`tel:${PHONE}`}
          className="flex-1 flex items-center justify-center gap-2 bg-[#f97316] hover:bg-[#ea6c10] text-white font-black py-3.5 rounded-xl text-base transition-colors duration-200 cursor-pointer"
        >
          <Phone size={18} /> Call Now
        </a>
        <a
          href="#estimate"
          className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold py-3.5 rounded-xl text-sm border border-white/20 transition-colors duration-200 cursor-pointer"
        >
          Free Estimate
        </a>
      </div>
    </div>
  );
}
