import { useState } from "react";
import {
  Phone, Menu, X, Star, MapPin, Clock, Shield, ChevronDown, ChevronUp,
  CheckCircle, ArrowRight, Award, Zap, Search, ChevronLeft, ChevronRight,
  Mail, Home,
} from "lucide-react";

// ── TOKENS ────────────────────────────────────────────────────────────────────
const C = {
  bg:      "#0A0A0A",
  card:    "#141414",
  border:  "#262626",
  red:     "#B91C1C",
  redBrt:  "#EF4444",
  redDark: "#7F1D1D",
  gold:    "#D97706",
  text:    "#F5F5F5",
  muted:   "#9CA3AF",
  muted2:  "#6B7280",
  accent:  "#DC2626",
};

const PHONE = "(602) 555-4178";
type Page = "home" | "services" | "gallery" | "about" | "contact";

const NAV_LINKS: { label: string; page: Page }[] = [
  { label: "Home",     page: "home"     },
  { label: "Services", page: "services" },
  { label: "Gallery",  page: "gallery"  },
  { label: "About",    page: "about"    },
  { label: "Contact",  page: "contact"  },
];

// ── LOGO ──────────────────────────────────────────────────────────────────────
function ElSolLogo({ size = "md", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const scale = size === "sm" ? 0.75 : size === "lg" ? 1.25 : 1;
  return (
    <svg
      viewBox="0 0 230 56"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ width: 185 * scale, height: 56 * scale }}
      aria-label="El Sol Roofing"
      role="img"
    >
      {/* Sun body */}
      <circle cx="26" cy="24" r="12" fill={C.redDark} />
      <circle cx="26" cy="24" r="8"  fill={C.red} />
      <circle cx="26" cy="24" r="4"  fill={C.gold} />
      {/* Sun rays — 8 directional */}
      {[0,45,90,135,180,225,270,315].map((deg, i) => {
        const r1 = 13, r2 = 19;
        const rad = (deg * Math.PI) / 180;
        return (
          <line key={i}
            x1={26 + Math.cos(rad) * r1} y1={24 + Math.sin(rad) * r1}
            x2={26 + Math.cos(rad) * r2} y2={24 + Math.sin(rad) * r2}
            stroke={C.gold} strokeWidth={deg % 90 === 0 ? 2.5 : 1.5} strokeLinecap="round"
          />
        );
      })}
      {/* Roof silhouette below sun */}
      <path d="M10 48 L26 36 L42 48 Z" fill={C.redDark} />
      <path d="M14 48 L26 39 L38 48" stroke={C.red} strokeWidth="1.5" fill="none" strokeLinejoin="round" />
      {/* Wordmark */}
      <text x="52" y="25" fontFamily="'Arial Black','Arial Bold',Arial,sans-serif" fontWeight="900" fontSize="22" fill={C.text} letterSpacing="-0.5">EL SOL</text>
      <text x="53" y="39" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="11" fill={C.red} letterSpacing="4">ROOFING</text>
      {/* Divider line */}
      <line x1="52" y1="43" x2="220" y2="43" stroke={C.border} strokeWidth="0.75" />
      <text x="53" y="52" fontFamily="Arial,sans-serif" fontWeight="400" fontSize="8" fill={C.muted2} letterSpacing="2">PHOENIX, AZ · LIC. #ROC-329481</text>
    </svg>
  );
}

// ── SERVICE DATA ──────────────────────────────────────────────────────────────
const SERVICES = [
  {
    id: "replacement",
    icon: Home,
    title: "Roof Replacement",
    tagline: "Full Tear-Off & Replacement",
    short: "Complete removal and installation of new roofing systems. Shingle, tile, or metal.",
    photo: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=80",
    includes: [
      "Full tear-off and debris removal",
      "Deck inspection and repair",
      "New underlayment and ice barrier",
      "Premium shingle or metal installation",
      "Flashing, vents, and ridge cap",
      "25-year workmanship warranty",
    ],
    badge: "Most Popular",
  },
  {
    id: "repairs",
    icon: Zap,
    title: "Roof Repairs",
    tagline: "Leaks · Missing Shingles · Flashing",
    short: "Targeted repairs for leaks, damaged shingles, failed flashing, and more.",
    photo: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80",
    includes: [
      "Free repair inspection",
      "Leak source diagnosis",
      "Single-shingle to full section repair",
      "Flashing and valley repair",
      "Skylight and chimney sealing",
      "5-year repair warranty",
    ],
    badge: null,
  },
  {
    id: "storm",
    icon: Shield,
    title: "Storm Damage",
    tagline: "Hail · Wind · Emergency Tarping",
    short: "Emergency response for monsoon and hail damage. Insurance claim specialists.",
    photo: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=800&q=80",
    includes: [
      "2-hour emergency response",
      "Emergency tarping service",
      "Hail and wind damage assessment",
      "Insurance claim documentation",
      "Direct billing to insurance",
      "Storm-grade materials",
    ],
    badge: "24/7",
  },
  {
    id: "metal",
    icon: Award,
    title: "Metal Roofing",
    tagline: "Standing Seam · Tile-Look · Corrugated",
    short: "50-year lifespan metal systems. Ideal for Phoenix's intense heat and UV.",
    photo: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80",
    includes: [
      "Standing seam and exposed fastener systems",
      "Tile-look metal panels",
      "Cool roof coatings (Energy Star)",
      "50-year paint warranty",
      "Wind resistance up to 140 mph",
      "Financing available",
    ],
    badge: "50-Year Life",
  },
  {
    id: "inspections",
    icon: Search,
    title: "Roof Inspections",
    tagline: "37-Point Free Inspection",
    short: "Comprehensive roof health assessment with drone photography and written report.",
    photo: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=800&q=80",
    includes: [
      "37-point inspection checklist",
      "Drone aerial photography",
      "Thermal imaging (optional)",
      "Written condition report",
      "Life expectancy estimate",
      "100% free, no obligation",
    ],
    badge: "Free",
  },
];

// ── GALLERY DATA ──────────────────────────────────────────────────────────────
type GalleryFilter = "all" | "replacement" | "repairs" | "storm" | "metal" | "inspections";

const GALLERY_ITEMS = [
  { id: 1, filter: "replacement" as GalleryFilter, label: "Roof Replacement",  location: "Scottsdale, AZ",   size: "normal",  photo: "1541888946425-d81bb19240f5", desc: "Full tear-off, new dimensional shingles + ridge vent system." },
  { id: 2, filter: "metal" as GalleryFilter,       label: "Standing Seam Metal", location: "Chandler, AZ",  size: "wide",    photo: "1558618666-fcd25c85cd64",  desc: "Bronze standing seam metal on 3,400 sq ft commercial property." },
  { id: 3, filter: "storm" as GalleryFilter,       label: "Storm Damage Repair",  location: "Tempe, AZ",    size: "normal",  photo: "1600585154526-990dced4db0d", desc: "Hail damage from August monsoon. Full section replacement." },
  { id: 4, filter: "repairs" as GalleryFilter,     label: "Leak Repair",           location: "Mesa, AZ",     size: "normal",  photo: "1584622650111-993a426fbf0a", desc: "Valley flashing replacement and chimney resealing." },
  { id: 5, filter: "replacement" as GalleryFilter, label: "Tile Replacement",      location: "Peoria, AZ",   size: "normal",  photo: "1589939705384-5185137a7f0f", desc: "Concrete tile removal and standing seam metal installation." },
  { id: 6, filter: "metal" as GalleryFilter,       label: "Corrugated Metal",      location: "Gilbert, AZ",  size: "normal",  photo: "1631377819268-d716cd610cd2", desc: "Modern corrugated steel + energy-efficient cool coating." },
  { id: 7, filter: "storm" as GalleryFilter,       label: "Emergency Tarp & Repair", location: "Phoenix, AZ", size: "wide",  photo: "1513694203232-719a280e022f", desc: "Monsoon wind damage — 24h tarp then full repair within 72h." },
  { id: 8, filter: "replacement" as GalleryFilter, label: "Complete Re-Roof",      location: "Glendale, AZ", size: "normal",  photo: "1590725121839-892b458a74fe", desc: "40-year architectural shingles, new decking, full flashing." },
  { id: 9, filter: "repairs" as GalleryFilter,     label: "Skylight Repair",       location: "Paradise Valley, AZ", size: "normal", photo: "1598300042247-d088f8ab3a91", desc: "Leaking skylight — flashing removed, resealed, new counter-flashing." },
  { id: 10, filter: "metal" as GalleryFilter,      label: "Tile-Look Metal",       location: "Ahwatukee, AZ", size: "normal", photo: "1487958449943-2429e8be8625", desc: "Steel tile-look panels — HOA approved, cooler than real tile." },
  { id: 11, filter: "replacement" as GalleryFilter, label: "HOA Re-Roof",          location: "Cave Creek, AZ", size: "normal", photo: "1518780664697-55e3ad937233", desc: "Community of 24 homes. 3-week project, phased scheduling." },
  { id: 12, filter: "inspections" as GalleryFilter, label: "Inspection + Report",  location: "Fountain Hills, AZ", size: "normal", photo: "1584738766473-61c083514bf4", desc: "37-point + drone inspection found 6 problem areas before they failed." },
];

const FILTER_LABELS: { id: GalleryFilter; label: string }[] = [
  { id: "all",          label: "All Projects" },
  { id: "replacement",  label: "Replacement"  },
  { id: "repairs",      label: "Repairs"      },
  { id: "storm",        label: "Storm"        },
  { id: "metal",        label: "Metal"        },
  { id: "inspections",  label: "Inspections"  },
];

// ── TESTIMONIALS ──────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  { name: "Maria G.",    loc: "Scottsdale, AZ", stars: 5, job: "Full Roof Replacement",   text: "El Sol replaced our entire roof in one day. Crew was professional, cleaned up everything, and the new roof looks incredible. 5 years later — zero issues." },
  { name: "James W.",    loc: "Tempe, AZ",      stars: 5, job: "Storm Damage Repair",     text: "After a monsoon destroyed half our shingles, El Sol was on-site with a tarp within 3 hours. They handled the entire insurance claim. Could not have been easier." },
  { name: "Patricia R.", loc: "Chandler, AZ",   stars: 5, job: "Metal Roofing",           text: "Got 4 estimates. El Sol explained every option honestly and recommended metal over replacement. 2 years in and my energy bill is down 22%. Best decision I made." },
  { name: "Derek T.",    loc: "Mesa, AZ",       stars: 5, job: "Free Roof Inspection",    text: "The free inspection found two failing valleys I had no idea about. The written drone report was incredibly detailed. Fixed before any interior damage occurred." },
  { name: "Sandra L.",   loc: "Glendale, AZ",   stars: 5, job: "Leak Repair",             text: "Called at 8 AM, someone was here by noon. Diagnosed the leak immediately and had it fixed same day. Reasonable price and they followed up a week later." },
];

// ── FAQS ──────────────────────────────────────────────────────────────────────
const FAQS = [
  { q: "How long does a full roof replacement take?", a: "Most residential replacements (1,500–3,000 sq ft) are completed in 1–2 days. We bring a full crew so you're not living with an open roof overnight. Larger or complex homes may take 2–3 days." },
  { q: "Do you work with insurance companies?", a: "Yes. We specialize in storm damage claims and work directly with all major insurance carriers. We document the damage with photos and drone footage, complete the paperwork, and can bill the insurance company directly." },
  { q: "What roofing materials do you recommend for Phoenix?", a: "For Phoenix heat and UV intensity, we most often recommend 40-year dimensional shingles, concrete tile, or energy-efficient metal roofing. We're a GAF Certified contractor and offer Owens Corning products. Metal roofing dramatically reduces cooling costs." },
  { q: "Is your free inspection truly free?", a: "100% free, no obligation. We send a licensed inspector and use drone photography at no cost. You receive a written condition report. If there's nothing wrong, we'll tell you. We'd rather earn your trust for future work." },
  { q: "Are you licensed and insured in Arizona?", a: "Yes. El Sol Roofing holds Arizona ROC License #ROC-329481, $2M general liability insurance, and workers' compensation. We provide certificate copies before any job starts." },
  { q: "Do you offer financing?", a: "Yes. We partner with GreenSky and Hearth for 0% promotional and low-rate financing options. Ask during your free estimate. Many homeowners prefer financing for full replacements." },
];

// ── SHARED COMPONENTS ─────────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b" style={{ borderColor: C.border }}>
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between gap-4 py-5 text-left cursor-pointer group">
        <span className="font-semibold text-base" style={{ color: open ? C.redBrt : C.text }}>{q}</span>
        {open
          ? <ChevronUp size={18} style={{ color: C.red }} className="shrink-0" />
          : <ChevronDown size={18} className="shrink-0" style={{ color: C.muted }} />}
      </button>
      {open && <p className="pb-5 text-sm leading-relaxed" style={{ color: C.muted }}>{a}</p>}
    </div>
  );
}

function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl sm:text-4xl font-black leading-none" style={{ color: C.redBrt }}>{value}</div>
      <div className="text-xs mt-1.5" style={{ color: C.muted }}>{label}</div>
    </div>
  );
}

function TrustBadge({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: C.muted }}>
      <CheckCircle size={14} style={{ color: C.red }} className="shrink-0" />{text}
    </div>
  );
}

// ── PHOENIX MAP SVG ───────────────────────────────────────────────────────────
function PhoenixMapSVG() {
  return (
    <svg viewBox="0 0 500 380" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" aria-label="Phoenix AZ service area map">
      {/* Background */}
      <rect width="500" height="380" fill="#0D0D0D" />
      {/* Grid lines (Phoenix has a famous grid) */}
      {[0,1,2,3,4,5,6,7].map(i => (
        <line key={`h${i}`} x1="0" y1={40 + i*45} x2="500" y2={40 + i*45} stroke="#1E1E1E" strokeWidth="1" />
      ))}
      {[0,1,2,3,4,5,6,7,8,9].map(i => (
        <line key={`v${i}`} x1={i*55} y1="0" x2={i*55} y2="380" stroke="#1E1E1E" strokeWidth="1" />
      ))}
      {/* I-10 (diagonal NW to SE through Phoenix) */}
      <path d="M0 100 L180 200 L350 300 L500 340" stroke="#3D2222" strokeWidth="4" fill="none" strokeLinecap="round" />
      <text x="35" y="88" fontFamily="Arial" fontSize="9" fill="#6B2323" fontWeight="bold">I-10</text>
      {/* I-17 (N-S) */}
      <line x1="165" y1="0" x2="165" y2="380" stroke="#3D2222" strokeWidth="4" />
      <text x="170" y="15" fontFamily="Arial" fontSize="9" fill="#6B2323" fontWeight="bold">I-17</text>
      {/* SR-51 */}
      <line x1="275" y1="0" x2="275" y2="220" stroke="#2A2A2A" strokeWidth="2.5" />
      <text x="278" y="15" fontFamily="Arial" fontSize="8" fill="#444" fontWeight="bold">SR-51</text>
      {/* Loop 101 (beltway E side) */}
      <path d="M390 0 L395 180 L350 310 L250 370" stroke="#2A2A2A" strokeWidth="2.5" strokeDasharray="8,4" fill="none" />
      <text x="396" y="60" fontFamily="Arial" fontSize="8" fill="#444" fontWeight="bold">101</text>
      {/* Major roads */}
      <line x1="0" y1="130" x2="500" y2="130" stroke="#1A1A1A" strokeWidth="1.5" />
      <text x="8" y="127" fontFamily="Arial" fontSize="8" fill="#3A3A3A">CAMELBACK RD</text>
      <line x1="0" y1="175" x2="500" y2="175" stroke="#1A1A1A" strokeWidth="1.5" />
      <text x="8" y="172" fontFamily="Arial" fontSize="8" fill="#3A3A3A">INDIAN SCHOOL RD</text>
      <line x1="0" y1="220" x2="500" y2="220" stroke="#1A1A1A" strokeWidth="1.5" />
      <text x="8" y="217" fontFamily="Arial" fontSize="8" fill="#3A3A3A">THOMAS RD</text>
      <line x1="0" y1="265" x2="500" y2="265" stroke="#1A1A1A" strokeWidth="1.5" />
      <text x="8" y="262" fontFamily="Arial" fontSize="8" fill="#3A3A3A">MCDOWELL RD</text>
      {/* Area labels */}
      <text x="60"  y="80"  fontFamily="Arial" fontSize="11" fill="#333" fontWeight="bold">GLENDALE</text>
      <text x="335" y="80"  fontFamily="Arial" fontSize="11" fill="#333" fontWeight="bold">SCOTTSDALE</text>
      <text x="180" y="310" fontFamily="Arial" fontSize="11" fill="#333" fontWeight="bold">TEMPE</text>
      <text x="330" y="310" fontFamily="Arial" fontSize="11" fill="#333" fontWeight="bold">MESA</text>
      <text x="60"  y="310" fontFamily="Arial" fontSize="11" fill="#333" fontWeight="bold">CHANDLER</text>
      <text x="195" y="160" fontFamily="Arial" fontSize="14" fill="#3D1111" fontWeight="bold">PHOENIX</text>
      {/* Service area circle */}
      <circle cx="220" cy="200" r="155" fill="none" stroke={C.red} strokeWidth="1.5" strokeDasharray="10,6" opacity="0.3" />
      <text x="370" y="65" fontFamily="Arial" fontSize="9" fill={C.red} opacity="0.6">SERVICE AREA</text>
      {/* Company location pin */}
      <circle cx="220" cy="195" r="14" fill={C.redDark} opacity="0.3" />
      <circle cx="220" cy="195" r="8"  fill={C.red} />
      <circle cx="220" cy="195" r="3"  fill="white" />
      {/* Ping animation rings */}
      <circle cx="220" cy="195" r="18" fill="none" stroke={C.red} strokeWidth="1" opacity="0.5">
        <animate attributeName="r" values="8;22" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;0" dur="2s" repeatCount="indefinite" />
      </circle>
      {/* Label */}
      <rect x="228" y="181" width="82" height="18" rx="3" fill={C.redDark} />
      <text x="233" y="194" fontFamily="Arial" fontSize="9" fill="white" fontWeight="bold">EL SOL ROOFING</text>
      {/* North indicator */}
      <text x="465" y="30" fontFamily="Arial" fontSize="12" fill="#444" fontWeight="bold">N</text>
      <line x1="470" y1="32" x2="470" y2="18" stroke="#444" strokeWidth="1.5" />
      <polygon points="470,14 467,22 473,22" fill="#444" />
    </svg>
  );
}

// ── PAGE: HOME ─────────────────────────────────────────────────────────────────
function HomePage({ nav }: { nav: (p: Page) => void }) {
  return (
    <div>
      {/* Emergency strip */}
      <div className="py-2.5 px-4 text-center text-xs font-bold tracking-wider" style={{ background: C.red }}>
        <span className="text-white">STORM DAMAGE? 24/7 EMERGENCY RESPONSE — </span>
        <a href={`tel:${PHONE}`} className="text-white underline cursor-pointer">{PHONE}</a>
      </div>

      {/* HERO */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1629904853893-c2c8981a1dc5?auto=format&fit=crop&w=1600&q=85"
          alt="Professional roofing crew on Phoenix roof"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(10,10,10,0.97) 0%, rgba(10,10,10,0.80) 55%, rgba(10,10,10,0.35) 100%)" }} />
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold tracking-widest uppercase mb-7 border" style={{ borderColor: `${C.red}60`, color: C.redBrt, background: `${C.red}15` }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: C.redBrt }} />
              Phoenix's #1 Rated Roofing Company · 1,200+ Roofs
            </div>
            <h1 className="text-[clamp(3rem,6vw,5rem)] font-black leading-[0.9] tracking-tighter mb-6" style={{ color: C.text }}>
              PHOENIX<br />
              <span style={{ color: C.red }}>ROOFING</span><br />
              DONE RIGHT.
            </h1>
            <p className="text-lg leading-relaxed mb-8 max-w-lg" style={{ color: C.muted }}>
              Replacement, repairs, storm damage, and metal roofing. Licensed Arizona contractor serving the Valley since 2003. Free inspections. Financing available.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-12">
              <button onClick={() => nav("contact")} className="flex items-center justify-center gap-2 text-white font-black px-7 py-4 rounded-xl text-base transition-all duration-200 hover:opacity-90 hover:shadow-xl cursor-pointer" style={{ background: C.red }}>
                <Phone size={17}/> Free Inspection
              </button>
              <button onClick={() => nav("gallery")} className="flex items-center justify-center gap-2 border font-bold px-7 py-4 rounded-xl text-base transition-all duration-200 cursor-pointer hover:border-white/50" style={{ borderColor: "rgba(255,255,255,0.2)", color: C.text }}>
                View Our Work <ArrowRight size={17}/>
              </button>
            </div>
            {/* Trust badges */}
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              <TrustBadge text="AZ ROC Licensed #ROC-329481" />
              <TrustBadge text="$2M Liability Insured" />
              <TrustBadge text="GAF Certified Contractor" />
              <TrustBadge text="BBB A+ Rating" />
            </div>
          </div>
        </div>
        {/* Right side: social proof block */}
        <div className="hidden lg:flex absolute right-12 top-1/2 -translate-y-1/2 z-10 flex-col gap-3">
          <div className="rounded-2xl p-5 border text-center" style={{ background: "rgba(20,20,20,0.92)", borderColor: C.border }}>
            <div className="flex gap-0.5 justify-center mb-1.5">{[...Array(5)].map((_,i) => <Star key={i} size={14} fill={C.gold} style={{ color: C.gold }}/>)}</div>
            <div className="text-3xl font-black" style={{ color: C.text }}>4.9</div>
            <div className="text-xs" style={{ color: C.muted }}>212 Google Reviews</div>
          </div>
          <div className="rounded-2xl p-5 border text-center" style={{ background: "rgba(20,20,20,0.92)", borderColor: C.border }}>
            <div className="text-3xl font-black" style={{ color: C.redBrt }}>20+</div>
            <div className="text-xs" style={{ color: C.muted }}>Yrs in Phoenix</div>
          </div>
          <div className="rounded-2xl p-5 border text-center" style={{ background: "rgba(127,29,29,0.4)", borderColor: C.red }}>
            <div className="text-2xl font-black" style={{ color: C.redBrt }}>2hr</div>
            <div className="text-xs" style={{ color: C.muted }}>Storm Response</div>
          </div>
        </div>
      </section>

      {/* Stats band */}
      <div className="border-y py-10 px-6" style={{ background: C.card, borderColor: C.border }}>
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8">
          <StatPill value="1,200+"  label="Roofs Completed" />
          <StatPill value="20 yrs"  label="Serving the Valley" />
          <StatPill value="4.9★"    label="Google Rating" />
          <StatPill value="Free"    label="Inspections Always" />
        </div>
      </div>

      {/* Services grid — home preview */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-14">
            <div>
              <span className="text-xs font-bold tracking-widest uppercase" style={{ color: C.red }}>What We Do</span>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight mt-2" style={{ color: C.text }}>Our Services.</h2>
            </div>
            <button onClick={() => nav("services")} className="shrink-0 flex items-center gap-2 font-bold text-sm border px-5 py-3 rounded-xl transition-all cursor-pointer hover:border-white/40" style={{ borderColor: C.border, color: C.muted }}>
              View All Services <ArrowRight size={15}/>
            </button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SERVICES.slice(0,3).map(svc => (
              <button key={svc.id} onClick={() => nav("services")} className="group relative rounded-2xl overflow-hidden aspect-video cursor-pointer text-left">
                <img src={svc.photo} alt={svc.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(10,10,10,0.95) 0%, rgba(10,10,10,0.4) 60%, transparent 100%)" }} />
                {svc.badge && (
                  <div className="absolute top-3 right-3 text-xs font-black px-2.5 py-1 rounded-full text-white" style={{ background: C.red }}>
                    {svc.badge}
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <div className="font-black text-lg leading-tight mb-1" style={{ color: C.text }}>{svc.title}</div>
                  <div className="text-xs" style={{ color: C.muted }}>{svc.tagline}</div>
                </div>
              </button>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            {SERVICES.slice(3).map(svc => (
              <button key={svc.id} onClick={() => nav("services")} className="group relative rounded-2xl overflow-hidden aspect-video cursor-pointer text-left">
                <img src={svc.photo} alt={svc.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(10,10,10,0.95) 0%, rgba(10,10,10,0.4) 60%, transparent 100%)" }} />
                {svc.badge && (
                  <div className="absolute top-3 right-3 text-xs font-black px-2.5 py-1 rounded-full text-white" style={{ background: svc.badge === "Free" ? C.gold : C.red }}>
                    {svc.badge}
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <div className="font-black text-lg leading-tight mb-1" style={{ color: C.text }}>{svc.title}</div>
                  <div className="text-xs" style={{ color: C.muted }}>{svc.tagline}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials strip */}
      <section className="py-20 px-6 border-t" style={{ borderColor: C.border, background: C.card }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: C.red }}>Reviews</span>
            <h2 className="text-3xl font-black mt-2" style={{ color: C.text }}>What Phoenix Homeowners Say.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.slice(0,3).map((t, i) => (
              <div key={t.name} className="rounded-2xl p-6 border flex flex-col gap-3" style={{ background: i === 1 ? C.redDark : C.bg, borderColor: i === 1 ? C.red : C.border }}>
                <div className="flex gap-0.5">{[...Array(t.stars)].map((_,j) => <Star key={j} size={13} fill={C.gold} style={{ color: C.gold }}/>)}</div>
                <div className="text-xs font-bold uppercase tracking-wider" style={{ color: C.red }}>{t.job}</div>
                <p className="text-sm leading-relaxed flex-1" style={{ color: C.muted }}>"{t.text}"</p>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm text-white shrink-0" style={{ background: C.red }}>{t.name[0]}</div>
                  <div>
                    <div className="font-bold text-sm" style={{ color: C.text }}>{t.name}</div>
                    <div className="text-xs flex items-center gap-1" style={{ color: C.muted2 }}><MapPin size={9}/>{t.loc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-16 px-6 text-center" style={{ background: C.redDark }}>
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-black mb-3" style={{ color: C.text }}>Your Roof. Inspected Free.</h2>
          <p className="mb-8" style={{ color: "rgba(245,245,245,0.6)" }}>No obligation, no pressure. Just a 37-point inspection, drone photos, and a written report.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => nav("contact")} className="flex items-center justify-center gap-2 text-white font-black px-8 py-4 rounded-xl text-base transition-all cursor-pointer hover:opacity-90" style={{ background: C.redBrt }}>
              <Phone size={18}/> Schedule Free Inspection
            </button>
            <a href={`tel:${PHONE}`} className="flex items-center justify-center gap-2 border font-bold px-8 py-4 rounded-xl text-base transition-all cursor-pointer hover:border-white/50" style={{ borderColor: "rgba(255,255,255,0.25)", color: C.text }}>
              {PHONE}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

// ── PAGE: SERVICES ─────────────────────────────────────────────────────────────
function ServicesPage({ nav }: { nav: (p: Page) => void }) {
  const [open, setOpen] = useState<string | null>("replacement");
  return (
    <div>
      {/* Header */}
      <div className="relative py-20 px-6 overflow-hidden border-b" style={{ background: C.card, borderColor: C.border }}>
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: `repeating-linear-gradient(0deg, ${C.red} 0px, ${C.red} 1px, transparent 1px, transparent 60px), repeating-linear-gradient(90deg, ${C.red} 0px, ${C.red} 1px, transparent 1px, transparent 60px)` }} />
        <div className="relative max-w-4xl mx-auto text-center">
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: C.red }}>What We Offer</span>
          <h1 className="text-5xl font-black tracking-tight mt-2 mb-4" style={{ color: C.text }}>Our Services.</h1>
          <p className="text-lg max-w-xl mx-auto" style={{ color: C.muted }}>From a single leak to a full re-roof, we handle every job with the same crew, same standards, and the same no-surprise pricing.</p>
        </div>
      </div>

      {/* Services accordion */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex flex-col gap-3">
          {SERVICES.map(svc => {
            const isOpen = open === svc.id;
            const Icon = svc.icon;
            return (
              <div key={svc.id} className="rounded-2xl border overflow-hidden transition-all duration-200" style={{ background: C.card, borderColor: isOpen ? C.red : C.border }}>
                <button
                  onClick={() => setOpen(isOpen ? null : svc.id)}
                  className="w-full flex items-center gap-4 p-6 text-left cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: isOpen ? C.red : C.border }}>
                    <Icon size={20} color={isOpen ? "white" : C.muted} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-lg flex items-center gap-3" style={{ color: C.text }}>
                      {svc.title}
                      {svc.badge && <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white shrink-0" style={{ background: svc.badge === "Free" ? C.gold : C.red }}>{svc.badge}</span>}
                    </div>
                    <div className="text-sm mt-0.5" style={{ color: C.muted }}>{svc.tagline}</div>
                  </div>
                  {isOpen
                    ? <ChevronUp size={20} style={{ color: C.red }} className="shrink-0" />
                    : <ChevronDown size={20} style={{ color: C.muted2 }} className="shrink-0" />}
                </button>
                {isOpen && (
                  <div className="grid md:grid-cols-2 gap-0">
                    <div className="aspect-video md:aspect-auto md:h-64 relative overflow-hidden">
                      <img src={svc.photo} alt={svc.title} className="w-full h-full object-cover" loading="lazy" />
                      <div className="absolute inset-0" style={{ background: "linear-gradient(to right, transparent 60%, rgba(20,20,20,0.8) 100%)" }} />
                    </div>
                    <div className="p-6 flex flex-col justify-between">
                      <div>
                        <p className="text-sm leading-relaxed mb-5" style={{ color: C.muted }}>{svc.short}</p>
                        <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: C.red }}>What's Included</div>
                        <ul className="space-y-2">
                          {svc.includes.map(item => (
                            <li key={item} className="flex items-start gap-2.5 text-sm" style={{ color: C.muted }}>
                              <CheckCircle size={14} style={{ color: C.red }} className="mt-0.5 shrink-0" />{item}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <button onClick={() => nav("contact")} className="mt-6 flex items-center justify-center gap-2 text-white font-bold py-3 rounded-xl text-sm transition-all cursor-pointer hover:opacity-90" style={{ background: C.red }}>
                        <Phone size={14}/> Get Free Estimate
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* FAQ */}
      <div className="border-t px-6 py-16" style={{ borderColor: C.border, background: C.card }}>
        <div className="max-w-3xl mx-auto">
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: C.red }}>Questions</span>
          <h2 className="text-3xl font-black mt-2 mb-8" style={{ color: C.text }}>Frequently Asked.</h2>
          {FAQS.map(f => <FaqItem key={f.q} {...f} />)}
        </div>
      </div>
    </div>
  );
}

// ── PAGE: GALLERY ──────────────────────────────────────────────────────────────
function GalleryPage({ nav }: { nav: (p: Page) => void }) {
  const [filter, setFilter] = useState<GalleryFilter>("all");
  const [lightbox, setLightbox] = useState<typeof GALLERY_ITEMS[0] | null>(null);
  const [lbIdx, setLbIdx] = useState(0);

  const filtered = filter === "all" ? GALLERY_ITEMS : GALLERY_ITEMS.filter(i => i.filter === filter);

  function openLightbox(item: typeof GALLERY_ITEMS[0]) {
    const idx = filtered.findIndex(i => i.id === item.id);
    setLbIdx(idx); setLightbox(item);
  }
  function prevPhoto() { const ni = (lbIdx - 1 + filtered.length) % filtered.length; setLbIdx(ni); setLightbox(filtered[ni]); }
  function nextPhoto() { const ni = (lbIdx + 1) % filtered.length; setLbIdx(ni); setLightbox(filtered[ni]); }

  return (
    <div>
      {/* Header */}
      <div className="py-16 px-6 border-b" style={{ background: C.card, borderColor: C.border }}>
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: C.red }}>Our Work</span>
          <h1 className="text-5xl font-black tracking-tight mt-2 mb-4" style={{ color: C.text }}>Project Gallery.</h1>
          <p style={{ color: C.muted }}>Real projects across the Phoenix Valley. Every job, same crew, same standards.</p>
        </div>
      </div>

      {/* Filter */}
      <div className="sticky top-16 z-30 px-6 py-4 border-b" style={{ background: "rgba(10,10,10,0.95)", borderColor: C.border, backdropFilter: "blur(8px)" }}>
        <div className="max-w-7xl mx-auto flex gap-2 overflow-x-auto pb-0.5">
          {FILTER_LABELS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-150 cursor-pointer"
              style={filter === f.id
                ? { background: C.red, color: "white" }
                : { background: C.card, color: C.muted, border: `1px solid ${C.border}` }}
            >
              {f.label}
            </button>
          ))}
          <span className="shrink-0 flex items-center text-xs ml-auto" style={{ color: C.muted2 }}>{filtered.length} projects</span>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item, i) => (
            <div
              key={item.id}
              onClick={() => openLightbox(item)}
              className={`group relative rounded-2xl overflow-hidden cursor-pointer border hover:border-opacity-100 transition-all duration-200 ${item.size === "wide" ? "sm:col-span-2" : ""}`}
              style={{ borderColor: C.border, aspectRatio: item.size === "wide" ? "16/7" : "4/3" }}
            >
              <img
                src={`https://images.unsplash.com/photo-${item.photo}?auto=format&fit=crop&w=800&q=80`}
                alt={item.label}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200" />
              {/* Service badge */}
              <div className="absolute top-3 left-3">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white" style={{ background: C.red }}>{item.label}</span>
              </div>
              {/* Hover info */}
              <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-200">
                <div className="font-black text-base mb-0.5" style={{ color: C.text }}>{item.label}</div>
                <div className="flex items-center gap-1 text-xs mb-2" style={{ color: C.muted }}><MapPin size={9}/>{item.location}</div>
                <p className="text-xs leading-relaxed" style={{ color: C.muted }}>{item.desc}</p>
              </div>
              {/* Number overlay */}
              <div className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: C.border }}>
                {i + 1}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <button onClick={() => nav("contact")} className="inline-flex items-center gap-2 text-white font-black px-8 py-4 rounded-xl text-base transition-all cursor-pointer hover:opacity-90" style={{ background: C.red }}>
            <Phone size={18}/> Book a Similar Project
          </button>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.95)" }} onClick={() => setLightbox(null)}>
          <button onClick={e => { e.stopPropagation(); prevPhoto(); }} className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-colors" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <ChevronLeft size={20} color={C.text} />
          </button>
          <div className="max-w-4xl w-full rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()} style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="relative aspect-video">
              <img src={`https://images.unsplash.com/photo-${lightbox.photo}?auto=format&fit=crop&w=1200&q=90`} alt={lightbox.label} className="w-full h-full object-cover" />
            </div>
            <div className="p-5 flex items-start justify-between gap-4">
              <div>
                <div className="font-black text-lg mb-0.5" style={{ color: C.text }}>{lightbox.label}</div>
                <div className="flex items-center gap-1 text-xs mb-2" style={{ color: C.muted }}><MapPin size={10}/>{lightbox.location}</div>
                <p className="text-sm" style={{ color: C.muted }}>{lightbox.desc}</p>
              </div>
              <button onClick={() => setLightbox(null)} className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 cursor-pointer" style={{ background: C.border }}>
                <X size={16} color={C.muted} />
              </button>
            </div>
            <div className="px-5 pb-5">
              <div className="text-xs" style={{ color: C.muted2 }}>{lbIdx + 1} / {filtered.length}</div>
            </div>
          </div>
          <button onClick={e => { e.stopPropagation(); nextPhoto(); }} className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-colors" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <ChevronRight size={20} color={C.text} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── PAGE: ABOUT ───────────────────────────────────────────────────────────────
function AboutPage({ nav }: { nav: (p: Page) => void }) {
  return (
    <div>
      {/* Hero */}
      <div className="relative py-28 px-6 overflow-hidden">
        <img src="https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=1600&q=80" alt="El Sol Roofing crew at work" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(10,10,10,0.95), rgba(10,10,10,0.6))" }} />
        <div className="relative max-w-3xl mx-auto">
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: C.red }}>Our Story</span>
          <h1 className="text-5xl font-black tracking-tight mt-2 mb-5" style={{ color: C.text }}>Phoenix Born. Phoenix Built.</h1>
          <p className="text-lg leading-relaxed max-w-2xl" style={{ color: C.muted }}>
            El Sol Roofing was founded in 2003 by Marco Solis, a third-generation roofer who grew up on job sites in Sonora, Mexico and moved to Phoenix with one truck and a crew of three. Today, we run 8 crews and have completed over 1,200 roofs across the Valley — still family-owned, still personally supervised.
          </p>
        </div>
      </div>

      {/* Milestones */}
      <div className="px-6 py-16 border-t" style={{ borderColor: C.border }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 items-center mb-20">
            <div>
              <span className="text-xs font-bold tracking-widest uppercase mb-3 block" style={{ color: C.red }}>20 Years in Phoenix</span>
              <h2 className="text-3xl font-black mb-5" style={{ color: C.text }}>We Know Arizona Roofs.</h2>
              <p className="text-sm leading-relaxed mb-4" style={{ color: C.muted }}>
                Phoenix roofing is different. Monsoon moisture, UV intensity, 120°F attic temps — these conditions destroy roofs that would last 40 years elsewhere. Our crew has seen every failure mode, and we build against all of them.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: C.muted }}>
                We use only materials rated for Arizona conditions: cool-roof coatings, desert-rated underlayments, and high-temp starter strips. Every roof we install is built to survive the Valley.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { v: "2003", l: "Founded in Phoenix" },
                { v: "1,200+", l: "Roofs Completed" },
                { v: "8", l: "Active Crews" },
                { v: "212", l: "5-Star Reviews" },
              ].map(s => (
                <div key={s.l} className="rounded-2xl p-5 border text-center" style={{ background: C.card, borderColor: C.border }}>
                  <div className="text-3xl font-black" style={{ color: C.redBrt }}>{s.v}</div>
                  <div className="text-xs mt-1.5" style={{ color: C.muted }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Certifications */}
          <div className="rounded-2xl p-8 border mb-16" style={{ background: C.card, borderColor: C.border }}>
            <span className="text-xs font-bold tracking-widest uppercase mb-6 block" style={{ color: C.red }}>Certifications & Licenses</span>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: "AZ ROC License", sub: "#ROC-329481", note: "State-verified contractor" },
                { title: "GAF Certified", sub: "Master Elite®", note: "Top 3% of roofers nationwide" },
                { title: "Owens Corning", sub: "Preferred Contractor", note: "Extended warranties available" },
                { title: "BBB Accredited", sub: "A+ Rating", note: "Since 2008, zero complaints" },
              ].map(c => (
                <div key={c.title} className="flex flex-col gap-1.5 pb-6 border-b sm:border-b-0 sm:border-r last:border-0 pl-0 sm:pl-4 first:pl-0" style={{ borderColor: C.border }}>
                  <div className="font-black text-base" style={{ color: C.text }}>{c.title}</div>
                  <div className="font-bold text-sm" style={{ color: C.red }}>{c.sub}</div>
                  <div className="text-xs" style={{ color: C.muted }}>{c.note}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Team */}
          <span className="text-xs font-bold tracking-widest uppercase mb-6 block" style={{ color: C.red }}>Our Team</span>
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              { name: "Marco Solis", role: "Founder & Owner", since: "2003", img: "1557804506-669a67965ba0" },
              { name: "Elena Solis", role: "Operations Manager", since: "2010", img: "1621905251918-48416bd8575a" },
              { name: "David Torres", role: "Lead Inspector", since: "2015", img: "1503596476-1c12a8ba09a9" },
            ].map(person => (
              <div key={person.name} className="rounded-2xl overflow-hidden border" style={{ borderColor: C.border }}>
                <div className="aspect-square relative overflow-hidden">
                  <img
                    src={`https://images.unsplash.com/photo-${person.img}?auto=format&fit=crop&w=400&q=80`}
                    alt={person.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(10,10,10,0.7) 0%, transparent 50%)" }} />
                </div>
                <div className="p-4" style={{ background: C.card }}>
                  <div className="font-black text-base" style={{ color: C.text }}>{person.name}</div>
                  <div className="text-sm" style={{ color: C.red }}>{person.role}</div>
                  <div className="text-xs mt-0.5" style={{ color: C.muted2 }}>With El Sol since {person.since}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="border-t py-16 px-6 text-center" style={{ borderColor: C.border, background: C.card }}>
        <h2 className="text-3xl font-black mb-3" style={{ color: C.text }}>Ready to Work with Us?</h2>
        <p className="mb-8" style={{ color: C.muted }}>Get a free inspection from Phoenix's most trusted roofing team.</p>
        <button onClick={() => nav("contact")} className="inline-flex items-center gap-2 text-white font-black px-8 py-4 rounded-xl text-base cursor-pointer hover:opacity-90 transition-opacity" style={{ background: C.red }}>
          <Phone size={18}/> Schedule Free Inspection
        </button>
      </div>
    </div>
  );
}

// ── PAGE: CONTACT ──────────────────────────────────────────────────────────────
function ContactPage() {
  const [form, setForm] = useState({ name: "", phone: "", email: "", service: "", message: "" });
  const [sent, setSent] = useState(false);
  function handleSubmit(e: React.FormEvent) { e.preventDefault(); setSent(true); }
  const inputBase = "w-full rounded-xl px-4 py-3.5 text-sm transition-colors focus:outline-none border";
  const inputStyle = { background: C.bg, borderColor: C.border, color: C.text };

  return (
    <div>
      {/* Header */}
      <div className="py-16 px-6 border-b" style={{ background: C.card, borderColor: C.border }}>
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: C.red }}>Get In Touch</span>
          <h1 className="text-5xl font-black tracking-tight mt-2 mb-4" style={{ color: C.text }}>Contact Us.</h1>
          <p style={{ color: C.muted }}>Free inspections always. Emergency calls answered 24/7.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Form */}
          <div>
            <h2 className="text-2xl font-black mb-8" style={{ color: C.text }}>Request a Free Inspection</h2>
            {sent ? (
              <div className="rounded-2xl p-10 text-center border" style={{ background: C.card, borderColor: C.red }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: `${C.red}20` }}>
                  <CheckCircle size={32} style={{ color: C.red }} />
                </div>
                <h3 className="text-xl font-black mb-2" style={{ color: C.text }}>We Got Your Request!</h3>
                <p className="text-sm" style={{ color: C.muted }}>We'll call you within 2 hours to schedule your free inspection. For immediate assistance: <a href={`tel:${PHONE}`} className="font-bold" style={{ color: C.red }}>{PHONE}</a></p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: C.muted }}>Full Name</label>
                    <input required type="text" placeholder="Robert Martinez" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                      className={inputBase} style={inputStyle}
                      onFocus={e => e.target.style.borderColor = C.red}
                      onBlur={e => e.target.style.borderColor = C.border}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: C.muted }}>Phone</label>
                    <input required type="tel" placeholder="(602) 000-0000" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                      className={inputBase} style={inputStyle}
                      onFocus={e => e.target.style.borderColor = C.red}
                      onBlur={e => e.target.style.borderColor = C.border}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: C.muted }}>Email</label>
                  <input type="email" placeholder="you@email.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                    className={inputBase} style={inputStyle}
                    onFocus={e => e.target.style.borderColor = C.red}
                    onBlur={e => e.target.style.borderColor = C.border}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: C.muted }}>Service Needed</label>
                  <select required value={form.service} onChange={e => setForm({...form, service: e.target.value})}
                    className={inputBase} style={{ ...inputStyle, cursor: "pointer" }}
                    onFocus={e => e.target.style.borderColor = C.red}
                    onBlur={e => e.target.style.borderColor = C.border}
                  >
                    <option value="">Select a service…</option>
                    {SERVICES.map(s => <option key={s.id}>{s.title}</option>)}
                    <option>Not sure — need inspection</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: C.muted }}>Additional Notes</label>
                  <textarea rows={4} placeholder="Describe your situation…" value={form.message} onChange={e => setForm({...form, message: e.target.value})}
                    className={inputBase + " resize-none"} style={inputStyle}
                    onFocus={e => e.target.style.borderColor = C.red}
                    onBlur={e => e.target.style.borderColor = C.border}
                  />
                </div>
                <button type="submit" className="flex items-center justify-center gap-2 text-white font-black py-4 rounded-xl text-base transition-all cursor-pointer hover:opacity-90" style={{ background: C.red }}>
                  <Phone size={18}/> Request Free Inspection
                </button>
                <p className="text-xs text-center" style={{ color: C.muted2 }}>We respond within 2 hours. Emergency? Call us directly at {PHONE}</p>
              </form>
            )}
          </div>

          {/* Right: map + contact info */}
          <div className="flex flex-col gap-6">
            {/* Contact info cards */}
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { Icon: Phone, label: "Call or Text", value: PHONE, href: `tel:${PHONE}` },
                { Icon: Mail,  label: "Email Us",     value: "info@elsolroofing.com", href: "mailto:info@elsolroofing.com" },
                { Icon: MapPin, label: "Office",      value: "4821 N 19th Ave, Phoenix, AZ 85015", href: "#" },
                { Icon: Clock,  label: "Hours",       value: "Mon–Fri 7am–6pm · 24/7 Emergency", href: "#" },
              ].map(({ Icon, label, value, href }) => (
                <a key={label} href={href} className="flex items-start gap-3 rounded-xl p-4 border transition-colors cursor-pointer group" style={{ background: C.card, borderColor: C.border }}
                  onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.borderColor = C.red}
                  onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.borderColor = C.border}
                >
                  <Icon size={18} style={{ color: C.red }} className="mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs uppercase tracking-wider font-bold mb-0.5" style={{ color: C.muted2 }}>{label}</div>
                    <div className="text-sm font-semibold" style={{ color: C.text }}>{value}</div>
                  </div>
                </a>
              ))}
            </div>

            {/* Map */}
            <div className="rounded-2xl overflow-hidden border" style={{ borderColor: C.border }}>
              <div className="px-4 py-3 border-b flex items-center justify-between" style={{ background: C.card, borderColor: C.border }}>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: C.red }} />
                  <span className="text-sm font-bold" style={{ color: C.text }}>Service Area — Phoenix Metro</span>
                </div>
                <span className="text-xs" style={{ color: C.muted2 }}>~40mi radius</span>
              </div>
              <div style={{ height: 300 }}>
                <PhoenixMapSVG />
              </div>
              <div className="px-4 py-3 border-t flex flex-wrap gap-4" style={{ background: C.card, borderColor: C.border }}>
                {["Phoenix", "Scottsdale", "Tempe", "Mesa", "Chandler", "Glendale", "Peoria", "Gilbert"].map(city => (
                  <span key={city} className="flex items-center gap-1 text-xs" style={{ color: C.muted }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.border }} />{city}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────────
export default function ElSolRoofing() {
  const [page, setPage] = useState<Page>("home");
  const [menuOpen, setMenuOpen] = useState(false);

  function nav(p: Page) { setPage(p); setMenuOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); }

  return (
    <div className="font-sans min-h-screen overflow-x-hidden" style={{ background: C.bg, color: C.text }}>
      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b" style={{ background: "rgba(10,10,10,0.97)", borderColor: C.border, backdropFilter: "blur(8px)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <button onClick={() => nav("home")} className="cursor-pointer shrink-0">
            <ElSolLogo />
          </button>
          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map(({ label, page: p }) => (
              <button
                key={p}
                onClick={() => nav(p)}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer"
                style={{ color: page === p ? C.redBrt : C.muted, background: page === p ? `${C.red}15` : "transparent" }}
              >
                {label}
              </button>
            ))}
          </div>
          {/* Right actions */}
          <div className="flex items-center gap-2 shrink-0">
            <a href={`tel:${PHONE}`} className="hidden sm:flex items-center gap-1.5 text-sm font-semibold transition-colors cursor-pointer" style={{ color: C.muted }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = C.text}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = C.muted}
            >
              <Phone size={14}/>{PHONE}
            </a>
            <button onClick={() => nav("contact")} className="flex items-center gap-2 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all cursor-pointer hover:opacity-90"
              style={{ background: C.red }}>
              <Phone size={14} className="hidden sm:block"/> Free Inspection
            </button>
            <button onClick={() => setMenuOpen(v => !v)} className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl cursor-pointer" style={{ background: C.card }}>
              {menuOpen ? <X size={20} style={{ color: C.text }} /> : <Menu size={20} style={{ color: C.text }} />}
            </button>
          </div>
        </div>
        {/* Mobile menu */}
        {menuOpen && (
          <div className="lg:hidden border-t px-4 py-4 flex flex-col gap-1" style={{ background: C.card, borderColor: C.border }}>
            {NAV_LINKS.map(({ label, page: p }) => (
              <button key={p} onClick={() => nav(p)}
                className="w-full text-left px-4 py-3 rounded-xl text-base font-semibold transition-all cursor-pointer"
                style={{ color: page === p ? C.redBrt : C.text, background: page === p ? `${C.red}15` : "transparent" }}>
                {label}
              </button>
            ))}
            <a href={`tel:${PHONE}`} className="flex items-center gap-2 px-4 py-3 font-semibold mt-1 cursor-pointer" style={{ color: C.red }}>
              <Phone size={16}/>{PHONE}
            </a>
          </div>
        )}
      </nav>

      {/* ── PAGE CONTENT (offset for fixed navbar) ── */}
      <div className="pt-16">
        {page === "home"     && <HomePage     nav={nav} />}
        {page === "services" && <ServicesPage nav={nav} />}
        {page === "gallery"  && <GalleryPage  nav={nav} />}
        {page === "about"    && <AboutPage    nav={nav} />}
        {page === "contact"  && <ContactPage />}
      </div>

      {/* ── FOOTER ── */}
      <footer className="border-t px-6 py-14 pb-28 md:pb-14" style={{ background: C.card, borderColor: C.border }}>
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-10 mb-10">
          <div className="md:col-span-2">
            <ElSolLogo className="mb-5" />
            <p className="text-sm leading-relaxed max-w-xs mb-5" style={{ color: C.muted2 }}>
              Phoenix's most trusted roofing contractor since 2003. Licensed, insured, and committed to no-surprise pricing.
            </p>
            <a href={`tel:${PHONE}`} className="flex items-center gap-2 font-black text-lg cursor-pointer" style={{ color: C.red }}>
              <Phone size={18}/>{PHONE}
            </a>
          </div>
          <div>
            <h4 className="font-bold mb-4 text-xs tracking-widest uppercase" style={{ color: C.muted2 }}>Services</h4>
            <ul className="space-y-2.5 text-sm" style={{ color: C.muted2 }}>
              {SERVICES.map(s => (
                <li key={s.id}>
                  <button onClick={() => nav("services")} className="hover:text-white transition-colors cursor-pointer">{s.title}</button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4 text-xs tracking-widest uppercase" style={{ color: C.muted2 }}>Company</h4>
            <ul className="space-y-2.5 text-sm" style={{ color: C.muted2 }}>
              {NAV_LINKS.map(({ label, page: p }) => (
                <li key={p}><button onClick={() => nav(p)} className="hover:text-white transition-colors cursor-pointer">{label}</button></li>
              ))}
            </ul>
            <div className="mt-6 space-y-2">
              <TrustBadge text="AZ ROC #ROC-329481" />
              <TrustBadge text="GAF Master Elite®" />
              <TrustBadge text="BBB A+" />
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-8 border-t flex flex-col sm:flex-row justify-between items-center gap-3 text-xs" style={{ borderColor: C.border, color: C.muted2 }}>
          <div>© 2024 El Sol Roofing LLC. All rights reserved. Phoenix, AZ.</div>
          <div>Built by <span className="font-semibold" style={{ color: C.muted }}>Acrosoft Labs</span></div>
        </div>
      </footer>

      {/* ── STICKY MOBILE BAR ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t px-4 py-3 flex gap-3" style={{ background: "rgba(10,10,10,0.98)", borderColor: C.border, backdropFilter: "blur(8px)" }}>
        <a href={`tel:${PHONE}`} className="flex-1 flex items-center justify-center gap-2 text-white font-black py-3.5 rounded-xl text-sm transition-opacity cursor-pointer hover:opacity-90"
          style={{ background: C.red }}>
          <Phone size={16}/> Call Now
        </a>
        <button onClick={() => nav("contact")} className="flex-1 flex items-center justify-center gap-2 text-white font-bold py-3.5 rounded-xl text-sm border transition-colors cursor-pointer"
          style={{ borderColor: C.border, background: C.card }}>
          Free Inspection
        </button>
      </div>
    </div>
  );
}
