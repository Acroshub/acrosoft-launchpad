import { useState, useEffect, useRef } from "react";
import {
  Phone, Mail, MapPin, Menu, X, Check, Star,
  Shield, Award, Truck, Package, Layers, RotateCcw, Wrench,
  Send, Building2, Film, Droplets, Clock, Globe, ChevronRight,
  ChevronDown, ChevronUp, Loader2,
} from "lucide-react";

// ── BRAND PALETTE (unchanged) ─────────────────────────────────────────────────
const C = {
  navy:   "#1B3668",
  navyD:  "#0F2147",
  navyXD: "#091530",
  blueL:  "#EBF1FB",
  blue100:"#D4E3F5",
  gold:   "#B8922A",
  goldL:  "#FBF5E6",
  white:  "#FFFFFF",
  text:   "#0D1B2A",
  muted:  "#5B7194",
  border: "#CBD8EE",
};

const PHONE   = "(310) 372-7225";
const EMAIL   = "info@sunaired.com";
const ADDRESS = "Redondo Beach, CA 90277";

// ── DATA ──────────────────────────────────────────────────────────────────────
const PRODUCTS = [
  {
    Icon: Package,
    name: "Mesh Checking Bags",
    desc: "Heavy-duty mesh bags ventilated for air circulation. Available in multiple sizes. Built for daily high-traffic use in demanding facilities.",
    img: "photo-1544551763-46a013bb70d5", // competitive swimmer in pool lane
    badge: "Most Popular",
  },
  {
    Icon: Layers,
    name: "Wall-Mount Rack Systems",
    desc: "Fixed wall racks in 10, 20, 30, and 50-bag configurations. Space-saving design with numbered slots for fast check-in and check-out.",
    img: "photo-1534438327276-14e5300c3a48", // gym / locker room — where wall racks install
    badge: null,
  },
  {
    Icon: RotateCcw,
    name: "Carousel Rack Systems",
    desc: "Rotating carousel units for high-volume operations. Fits 40–120 bags per unit. Heavy-duty rolling casters included as standard.",
    img: "photo-1571019613454-1cb2f99b2d8b", // rec center / YMCA — high-volume environment
    badge: "High Volume",
  },
  {
    Icon: Wrench,
    name: "Accessories & Hardware",
    desc: "Replacement hooks, number tags, dividers, and mounting hardware. Everything you need to complete or expand your existing system.",
    img: "photo-1485846234645-a62644f84728", // film production set — accessories context
    badge: null,
  },
];

const INDUSTRIES = [
  {
    name: "Public Pools & Recreation Centers",
    desc: "Aquatic centers, YMCAs, and municipal rec facilities trust our systems for daily patron bag management. Durable mesh keeps belongings ventilated and easy to inspect.",
    img: "photo-1530549387789-4c1017266635", // indoor aquatic center with swim lanes
    Icon: Droplets,
    stat: "300+ aquatic facilities nationwide",
  },
  {
    name: "Correctional Facilities",
    desc: "Numbered, secure bag systems for inmate property management. Quick to audit, built for heavy use, and compliant with institutional requirements across all facility types.",
    img: "photo-1605349136563-0fc55e9cc6be", // institutional corridor / correctional facility
    Icon: Shield,
    stat: "Trusted by state & county facilities",
  },
  {
    name: "Film & TV Productions",
    desc: "On-set check-in systems for cast and crew personal items. Fast turnaround between scenes. Used by studios and production companies from Hollywood to New York.",
    img: "photo-1440404653325-ab127d49abc1", // film/TV production set with cameras and crew
    Icon: Film,
    stat: "Major studios & independent productions",
  },
];

const PILLARS = [
  { Icon: Clock,  title: "Since 1947",      body: "Over 75 years of continuous manufacturing. Generational experience in building systems that last." },
  { Icon: Award,  title: "Made in USA",      body: "All products built to American commercial standards. Engineered for heavy daily use in demanding environments." },
  { Icon: Wrench, title: "Custom Sizing",    body: "We manufacture to your facility's specifications. Standard and custom sizes available. Just call and ask." },
  { Icon: Truck,  title: "Ships Nationwide", body: "From Redondo Beach, CA to all 50 states. Reliable delivery on standard and custom orders." },
];

const TESTIMONIALS = [
  {
    name: "Robert A.",
    role: "Aquatics Director",
    org: "LA County Parks & Recreation",
    stars: 5,
    text: "We've been using Sun Aired bags at three of our pools for over 15 years. The durability is unmatched — we replace a fraction of what we used to with other suppliers.",
    img: "1560250097-0b93528c311a",
  },
  {
    name: "Sandra M.",
    role: "Facility Procurement Manager",
    org: "California State Corrections",
    stars: 5,
    text: "Numbered, durable, easy-to-inspect — exactly what we needed. Their team responded quickly, the order arrived on time, and the system has held up with zero issues.",
    img: "1494790108377-be9c29b29330",
  },
  {
    name: "Derek T.",
    role: "Production Coordinator",
    org: "Silver Screen Studios, Burbank CA",
    stars: 5,
    text: "We use their carousel systems on every major production now. Keeps everything organized on-set and the cast loves the quick check-in and check-out process.",
    img: "1507003211169-0a1dd7228f2d",
  },
];

// CRO: FAQ data — handles objections before the form
const FAQS = [
  {
    q: "Do you ship to my state?",
    a: "Yes — we ship to all 50 states from Redondo Beach, CA. Standard orders typically arrive within 5–7 business days. Expedited shipping available on request.",
  },
  {
    q: "Is there a minimum order quantity?",
    a: "No minimum. Whether you need 10 bags or 1,000, we process every order the same way. Volume discounts kick in at 100+ units.",
  },
  {
    q: "How fast can I receive my order?",
    a: "Standard orders ship within 3–5 business days. If you have a tight deadline, mention it in your quote request and we'll do our best to accommodate.",
  },
  {
    q: "Can I get a custom bag size or rack configuration?",
    a: "Absolutely. We manufacture to your facility's exact specifications. Just call us or include your dimensions in the quote request form below.",
  },
  {
    q: "Do you offer volume discounts?",
    a: "Yes. Orders of 100+ units qualify for tiered volume pricing. The more you order, the more you save. Ask about current discount tiers in your quote.",
  },
];

// CRO: Process steps — reduces buying friction
const HOW_STEPS = [
  {
    n: "01",
    title: "Call or Submit a Request",
    body: "Call us at (310) 372-7225 or fill out the quote form. Tell us your facility type, product interest, and quantity needed.",
    Icon: Phone,
  },
  {
    n: "02",
    title: "Receive a Free Quote",
    body: "We respond within 1 business day with accurate pricing. No commitment, no pressure — just the numbers you need to make a decision.",
    Icon: Send,
  },
  {
    n: "03",
    title: "Your Order Ships Fast",
    body: "Once you approve, standard orders ship within 3–5 business days to any location in the United States. Track your shipment directly.",
    Icon: Truck,
  },
];

// ── BRAND COMPONENTS (unchanged) ──────────────────────────────────────────────
function StripeRule({ color = C.navy, count = 3 }: { color?: string; count?: number }) {
  return (
    <div className="flex flex-col gap-[4px]" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ height: 2, background: color, opacity: 1 - i * 0.25 }} />
      ))}
    </div>
  );
}

function LogoPlaceholder({ dark = false }: { dark?: boolean }) {
  const stripe = dark ? "rgba(255,255,255,0.5)" : C.navy;
  const bg     = dark ? "rgba(255,255,255,0.06)" : C.white;
  const label  = dark ? "rgba(255,255,255,0.3)"  : C.muted;
  return (
    <svg width="168" height="44" viewBox="0 0 168 44" xmlns="http://www.w3.org/2000/svg" aria-label="Logo placeholder">
      <rect x="0" y="0"  width="168" height="3" fill={stripe} />
      <rect x="0" y="5"  width="168" height="2" fill={stripe} opacity="0.55" />
      <rect x="0" y="9"  width="168" height="1" fill={stripe} opacity="0.25" />
      <rect x="0" y="12" width="168" height="20" fill={bg} rx="0" />
      <ellipse cx="84" cy="22" rx="28" ry="8" fill="none" stroke={stripe} strokeWidth="1" opacity="0.3" />
      <text x="84" y="26" textAnchor="middle" fontFamily="'Arial Black', 'Arial Bold', Arial, sans-serif"
        fontSize="8" fontWeight="900" fill={label} letterSpacing="1.8">TU LOGO AQUÍ</text>
      <rect x="0" y="33" width="168" height="1" fill={stripe} opacity="0.25" />
      <rect x="0" y="37" width="168" height="2" fill={stripe} opacity="0.55" />
      <rect x="0" y="41" width="168" height="3" fill={stripe} />
    </svg>
  );
}

// ── CRO: FAQ ACCORDION ────────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b" style={{ borderColor: C.border }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-4 py-4 text-left cursor-pointer"
        style={{ color: C.navy }}
      >
        <span className="font-bold text-sm">{q}</span>
        {open
          ? <ChevronUp size={16} style={{ color: C.muted }} className="shrink-0" />
          : <ChevronDown size={16} style={{ color: C.muted }} className="shrink-0" />}
      </button>
      {open && (
        <p className="pb-4 text-sm leading-relaxed" style={{ color: C.muted }}>{a}</p>
      )}
    </div>
  );
}

// ── CRO: QUOTE FORM (enhanced) ────────────────────────────────────────────────
function QuoteForm() {
  const [form, setForm] = useState({ name: "", company: "", phone: "", email: "", type: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  // CRO: simulated loading state gives confidence that something is happening
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); setSent(true); }, 1100);
  };

  const inputCls = {
    width: "100%",
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    padding: "11px 14px",
    fontSize: 14,
    color: C.text,
    outline: "none",
    background: C.white,
    transition: "border-color 150ms",
  };

  return (
    <section id="contact" className="py-24 px-6" style={{ background: C.blueL }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <StripeRule />
          <div className="mt-5">
            <p className="text-xs font-black tracking-widest uppercase mb-1" style={{ color: C.gold }}>GET A QUOTE</p>
            <h2 className="text-4xl font-black tracking-tight" style={{ color: C.navy }}>Request a Free Quote</h2>
            {/* CRO: Micro-copy to reduce hesitation */}
            <p className="mt-2 text-base max-w-lg" style={{ color: C.muted }}>
              No commitment. No minimum order. We respond within 1 business day.
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Form card */}
          <div className="rounded-lg border bg-white p-8" style={{ borderColor: C.border }}>
            {/* CRO: Social proof above the form */}
            {!sent && (
              <div className="flex flex-wrap gap-3 mb-6 pb-6 border-b" style={{ borderColor: C.border }}>
                {["500+ facilities served", "Free quote", "No minimums"].map(t => (
                  <span key={t} className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded"
                    style={{ background: C.blueL, color: C.navy }}>
                    <Check size={10} style={{ color: C.gold }} />{t}
                  </span>
                ))}
              </div>
            )}

            {sent ? (
              <div className="py-10 text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: "#ECFDF5" }}>
                  <Check size={30} style={{ color: "#16A34A" }} />
                </div>
                <h3 className="text-xl font-black mb-2" style={{ color: C.navy }}>Quote Request Sent!</h3>
                <p className="text-sm mb-5" style={{ color: C.muted }}>
                  We'll respond within <strong>1 business day</strong> with pricing for your facility.
                </p>
                {/* CRO: Phone fallback after submission */}
                <div className="rounded border p-4 text-sm font-bold" style={{ borderColor: C.border, color: C.navy }}>
                  Need it faster? Call us now:<br />
                  <a href={`tel:${PHONE}`} className="text-lg" style={{ color: C.navy }}>{PHONE}</a>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { label: "Full Name *", key: "name", type: "text", ph: "John Smith", req: true },
                    { label: "Company / Facility *", key: "company", type: "text", ph: "City Aquatics Center", req: true },
                  ].map(f => (
                    <div key={f.key}>
                      <label htmlFor={`field-${f.key}`}
                        className="block text-xs font-black uppercase tracking-wider mb-1.5"
                        style={{ color: C.muted }}>
                        {f.label}
                      </label>
                      <input
                        id={`field-${f.key}`}
                        required={f.req} type={f.type} placeholder={f.ph}
                        value={form[f.key as keyof typeof form]}
                        onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                        style={inputCls}
                        onFocus={e => (e.target as HTMLInputElement).style.borderColor = C.navy}
                        onBlur={e => (e.target as HTMLInputElement).style.borderColor = C.border}
                      />
                    </div>
                  ))}
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { label: "Phone *", key: "phone", type: "tel", ph: "(310) 000-0000", req: true },
                    { label: "Email", key: "email", type: "email", ph: "you@facility.gov", req: false },
                  ].map(f => (
                    <div key={f.key}>
                      <label htmlFor={`field-${f.key}`}
                        className="block text-xs font-black uppercase tracking-wider mb-1.5"
                        style={{ color: C.muted }}>
                        {f.label}
                      </label>
                      <input
                        id={`field-${f.key}`}
                        required={f.req} type={f.type} placeholder={f.ph}
                        value={form[f.key as keyof typeof form]}
                        onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                        style={inputCls}
                        onFocus={e => (e.target as HTMLInputElement).style.borderColor = C.navy}
                        onBlur={e => (e.target as HTMLInputElement).style.borderColor = C.border}
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <label htmlFor="field-type"
                    className="block text-xs font-black uppercase tracking-wider mb-1.5"
                    style={{ color: C.muted }}>
                    Facility Type
                  </label>
                  <select
                    id="field-type"
                    value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                    style={{ ...inputCls, cursor: "pointer", color: form.type ? C.text : C.muted }}
                    onFocus={e => (e.target as HTMLSelectElement).style.borderColor = C.navy}
                    onBlur={e => (e.target as HTMLSelectElement).style.borderColor = C.border}
                  >
                    <option value="">Select facility type...</option>
                    <option value="pool">Public Pool / Recreation Center</option>
                    <option value="correctional">Correctional Facility</option>
                    <option value="film">Film / TV Production</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="field-message"
                    className="block text-xs font-black uppercase tracking-wider mb-1.5"
                    style={{ color: C.muted }}>
                    Notes / Requirements
                  </label>
                  <textarea
                    id="field-message"
                    placeholder="Describe your facility, quantity needed, bag sizes, and any special requirements..."
                    value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                    rows={3}
                    style={{ ...inputCls, resize: "none" }}
                    onFocus={e => (e.target as HTMLTextAreaElement).style.borderColor = C.navy}
                    onBlur={e => (e.target as HTMLTextAreaElement).style.borderColor = C.border}
                  />
                </div>

                {/* CRO: Risk reversal just before the submit button */}
                <p className="text-xs text-center" style={{ color: C.muted }}>
                  No commitment required · We never share your information
                </p>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center gap-2 text-white font-black px-7 py-4 rounded cursor-pointer transition-opacity disabled:opacity-70"
                  style={{ background: C.navy, fontSize: 15 }}
                  onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.opacity = "0.9"; }}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = "1"}
                >
                  {loading
                    ? <><Loader2 size={16} className="animate-spin" /> Sending...</>
                    : <><Send size={16} /> Get My Free Quote</>}
                </button>
              </form>
            )}
          </div>

          {/* Contact info + FAQ */}
          <div className="flex flex-col gap-5">
            {/* CRO: Phone as primary option for B2B buyers who prefer calling */}
            <a href={`tel:${PHONE}`}
              className="flex items-center gap-4 rounded-lg border bg-white p-5 cursor-pointer group transition-all hover:shadow-md"
              style={{ borderColor: C.navy, borderWidth: 2 }}>
              <div className="w-12 h-12 rounded flex items-center justify-center shrink-0"
                style={{ background: C.navy }}>
                <Phone size={20} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider mb-0.5" style={{ color: C.muted }}>
                  Prefer to talk? Call us directly
                </p>
                <p className="font-black text-lg group-hover:opacity-80 transition-opacity" style={{ color: C.navy }}>
                  {PHONE}
                </p>
                <p className="text-xs" style={{ color: C.muted }}>Mon–Fri 8:00 AM – 5:00 PM PT</p>
              </div>
            </a>

            {/* Contact details */}
            <div className="rounded-lg border bg-white p-6" style={{ borderColor: C.border }}>
              <div className="flex flex-col gap-4">
                {[
                  { Icon: Mail,   val: EMAIL,   href: `mailto:${EMAIL}`,  label: "Email" },
                  { Icon: MapPin, val: ADDRESS,  href: null,               label: "Location" },
                ].map(({ Icon, val, href, label }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded flex items-center justify-center shrink-0"
                      style={{ background: C.blueL, border: `1px solid ${C.border}` }}>
                      <Icon size={15} style={{ color: C.navy }} />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider" style={{ color: C.muted }}>{label}</p>
                      {href
                        ? <a href={href} className="text-sm font-bold transition-opacity hover:opacity-70" style={{ color: C.navy }}>{val}</a>
                        : <p className="text-sm font-bold" style={{ color: C.navy }}>{val}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CRO: Objection-handling checklist */}
            <div className="rounded-lg p-6" style={{ background: C.navy }}>
              <p className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
                Why Buyers Choose Us
              </p>
              {[
                "No minimum order requirement",
                "Custom sizing available on request",
                "Volume discounts for 100+ units",
                "Ships within 3–5 business days",
                "Dedicated account support",
              ].map(item => (
                <div key={item} className="flex items-center gap-3 py-2.5 border-b last:border-0 text-sm"
                  style={{ color: "rgba(255,255,255,0.80)", borderColor: "rgba(255,255,255,0.08)" }}>
                  <Check size={13} style={{ color: C.gold }} className="shrink-0" />{item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function SunAiredBag() {
  const [menuOpen, setMenuOpen] = useState(false);
  // CRO: scroll-aware nav — shows CTA more prominently after hero
  const [scrolled, setScrolled] = useState(false);
  // CRO: active section tracking for nav highlight
  const [activeSection, setActiveSection] = useState("");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 320);
      // Find active section for nav highlight
      const ids = ["products", "industries", "why", "contact"];
      let current = "";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && window.scrollY >= el.offsetTop - 120) current = id;
      }
      setActiveSection(current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const NAV_LINKS = [
    ["Products",   "#products"],
    ["Industries", "#industries"],
    ["Why Us",     "#why"],
    ["Contact",    "#contact"],
  ];

  return (
    <div className="font-sans bg-white overflow-x-hidden" style={{ color: C.text }}>

      {/* ── TOP STRIPE BAR ── */}
      <div style={{ background: C.navy, height: 6 }} />

      {/* ── NAVBAR (CRO: scroll-aware, phone visible, active section) ── */}
      <header className="sticky top-0 z-50 bg-white border-b transition-shadow duration-200"
        style={{ borderColor: C.border, boxShadow: scrolled ? "0 2px 12px rgba(11,21,48,0.10)" : "none" }}>
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-6">
          <LogoPlaceholder />

          {/* Desktop nav — CRO: active section highlight */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(([l, h]) => {
              const sectionId = h.replace("#", "");
              const isActive = activeSection === sectionId;
              return (
                <a key={l} href={h}
                  className="px-4 py-2 text-sm font-bold transition-all cursor-pointer rounded border-b-2"
                  style={{
                    color: isActive ? C.navy : C.muted,
                    borderBottomColor: isActive ? C.navy : "transparent",
                    background: isActive ? C.blueL : "transparent",
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLAnchorElement).style.color = C.navy;
                      (e.currentTarget as HTMLAnchorElement).style.background = C.blueL;
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLAnchorElement).style.color = C.muted;
                      (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                    }
                  }}
                >{l}</a>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            {/* CRO: phone always visible on desktop, more prominent when scrolled */}
            <a href={`tel:${PHONE}`}
              className="hidden lg:flex items-center gap-1.5 font-bold cursor-pointer transition-all rounded px-3 py-2"
              style={{
                color: scrolled ? C.white : C.navy,
                fontSize: 13,
                background: scrolled ? C.navy : "transparent",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.opacity = "0.8"}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.opacity = "1"}
            >
              <Phone size={13} /> {PHONE}
            </a>
            {/* CRO: CTA changes label when scrolled */}
            <a href="#contact"
              className="text-white text-sm font-black px-5 py-2.5 rounded cursor-pointer hover:opacity-90 transition-opacity"
              style={{ background: scrolled ? C.gold : C.navy }}>
              {scrolled ? "Get Free Quote" : "Get a Quote"}
            </a>
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="md:hidden w-11 h-11 flex items-center justify-center rounded cursor-pointer"
              style={{ background: C.blueL }}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={18} style={{ color: C.navy }} /> : <Menu size={18} style={{ color: C.navy }} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown — CRO: phone as first visible action */}
        {menuOpen && (
          <div className="md:hidden border-t px-6 py-4 flex flex-col gap-1" style={{ borderColor: C.border }}>
            {/* CRO: phone first in mobile menu */}
            <a href={`tel:${PHONE}`}
              className="flex items-center gap-3 py-3.5 text-sm font-black rounded mb-1 px-3 cursor-pointer"
              style={{ background: C.navy, color: C.white }}
              onClick={() => setMenuOpen(false)}>
              <Phone size={15} /> Call Now: {PHONE}
            </a>
            {NAV_LINKS.map(([l, h]) => (
              <a key={l} href={h} onClick={() => setMenuOpen(false)}
                className="py-3 text-sm font-bold border-b cursor-pointer transition-opacity hover:opacity-70"
                style={{ color: C.navy, borderColor: C.border }}>
                {l}
              </a>
            ))}
          </div>
        )}
      </header>

      {/* ── TRUST STRIP (hidden on mobile — those pixels belong to the headline) ── */}
      <div className="hidden md:block border-b" style={{ background: C.navyD, borderColor: C.navyXD }}>
        <div className="max-w-7xl mx-auto px-6 py-2.5 flex flex-wrap items-center justify-center gap-6 text-xs font-bold tracking-wider uppercase"
          style={{ color: "rgba(255,255,255,0.65)" }}>
          {[
            [Award,  "Est. 1947 — Redondo Beach, CA"],
            [Globe,  "Ships to All 50 States"],
            [Shield, "No Minimum Order"],
            [Truck,  "Ships in 3–5 Business Days"],
          ].map(([Icon, label]) => (
            <div key={label as string} className="flex items-center gap-1.5">
              {/* @ts-ignore */}
              <Icon size={11} style={{ color: C.gold }} />
              {label as string}
            </div>
          ))}
        </div>
      </div>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden md:min-h-[88vh]" style={{ background: C.navyD }}>
        {/* Mesh texture */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }} />
        <div className="absolute inset-0 pointer-events-none" aria-hidden
          style={{ background: `linear-gradient(135deg, ${C.navyXD} 0%, transparent 70%)` }} />

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-10 pb-16 md:py-24 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            {/* Heritage badge */}
            <div className="inline-flex items-center gap-2 rounded px-4 py-2 mb-8 text-xs font-black tracking-wider uppercase"
              style={{ background: C.goldL, color: C.gold, border: `1px solid ${C.gold}40` }}>
              <Award size={11} /> The Most Trustable Checking Storage System Since 1947
            </div>

            <h1 className="text-[clamp(2.6rem,5.5vw,4rem)] font-black leading-[1.05] tracking-tight mb-6 text-white">
              Professional<br />
              Bag Systems Built<br />
              <span style={{ color: C.blue100 }}>for Demanding</span><br />
              Facilities.
            </h1>

            <p className="text-lg leading-relaxed mb-8 max-w-md" style={{ color: "rgba(255,255,255,0.65)" }}>
              Sun Aired Bag Co. supplies mesh checking bags, wall racks, and carousel systems to public pools, correctional facilities, and film productions across the United States.
            </p>

            {/* CRO: Primary CTA clearly labeled "Free" + no commitment copy */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <a href="#contact"
                className="flex items-center justify-center gap-2 text-white font-black px-8 py-4 rounded cursor-pointer hover:opacity-90 transition-opacity"
                style={{ background: C.navy, border: `2px solid ${C.blue100}40` }}>
                <Send size={16} /> Get My Free Quote
              </a>
              <a href={`tel:${PHONE}`}
                className="flex items-center justify-center gap-2 font-black px-8 py-4 rounded cursor-pointer hover:bg-white/10 transition-colors"
                style={{ color: C.white, border: `2px solid rgba(255,255,255,0.25)` }}>
                <Phone size={16} /> {PHONE}
              </a>
            </div>

            {/* CRO: micro-copy below CTAs — removes hesitation */}
            <p className="text-xs mb-8" style={{ color: "rgba(255,255,255,0.4)" }}>
              Free quote · No minimum order · Response within 1 business day
            </p>

            {/* Logo stripe motif */}
            <div className="flex flex-col gap-[3px] w-24 mb-8" aria-hidden>
              <div style={{ height: 3, background: C.gold }} />
              <div style={{ height: 2, background: C.gold, opacity: 0.55 }} />
              <div style={{ height: 1, background: C.gold, opacity: 0.25 }} />
            </div>

            {/* CRO: Social proof numbers as text — scannable in 2 seconds */}
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm font-bold" style={{ color: "rgba(255,255,255,0.5)" }}>
              <span>· 500+ Facilities Served</span>
              <span>· 75+ Years in Business</span>
              <span>· All 50 States</span>
            </div>
          </div>

          {/* Hero image card */}
          <div className="hidden lg:block relative">
            <div className="absolute -top-2 left-0 right-16 flex flex-col gap-[3px]" aria-hidden>
              <div style={{ height: 3, background: C.gold }} />
              <div style={{ height: 2, background: C.gold, opacity: 0.5 }} />
            </div>
            <div className="rounded-sm overflow-hidden border-2" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
              <img
                src="https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=800&q=85"
                alt="Indoor aquatic center with swim lanes — primary market for Sun Aired Bag systems"
                className="w-full h-[440px] object-cover"
                loading="eager"
              />
              <div className="absolute bottom-4 left-4 right-4 rounded px-4 py-3"
                style={{ background: "rgba(11,21,48,0.88)", backdropFilter: "blur(8px)" }}>
                <p className="text-xs font-black uppercase tracking-wider text-white/40 mb-0.5">Primary Market</p>
                <p className="text-sm font-black text-white">Public Pools & Aquatic Centers</p>
              </div>
            </div>
            <div className="absolute -bottom-2 right-0 left-16 flex flex-col gap-[3px] items-end" aria-hidden>
              <div style={{ height: 2, background: C.gold, opacity: 0.5, width: "100%" }} />
              <div style={{ height: 3, background: C.gold, width: "100%" }} />
            </div>
          </div>
        </div>

        {/* CRO: scroll invitation arrow — desktop only, no extra space on mobile */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center gap-1 cursor-pointer"
          style={{ color: "rgba(255,255,255,0.3)" }}
          onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })}>
          <span className="text-[10px] font-black uppercase tracking-widest">See how it works</span>
          <ChevronDown size={20} />
        </div>
      </section>

      {/* ── CRO: HOW IT WORKS — reduces buying friction ── */}
      <section id="how" className="py-16 px-6 bg-white border-b" style={{ borderColor: C.border }}>
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-black tracking-widest uppercase text-center mb-10" style={{ color: C.gold }}>
            How It Works
          </p>
          <div className="grid md:grid-cols-3 gap-0 border" style={{ borderColor: C.border }}>
            {HOW_STEPS.map((step, i) => {
              const Icon = step.Icon;
              return (
                <div key={step.n}
                  className="flex flex-col p-8 border-b last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
                  style={{ borderColor: C.border }}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl font-black leading-none" style={{ color: C.blue100 }}>
                      {step.n}
                    </span>
                    <div className="w-9 h-9 rounded-sm flex items-center justify-center"
                      style={{ background: C.blueL }}>
                      <Icon size={17} style={{ color: C.navy }} />
                    </div>
                  </div>
                  <h3 className="font-black text-base mb-2" style={{ color: C.navy }}>{step.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: C.muted }}>{step.body}</p>
                  {/* CRO: link to next action from step 1 */}
                  {i === 0 && (
                    <a href="#contact"
                      className="mt-4 inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider cursor-pointer transition-opacity hover:opacity-60"
                      style={{ color: C.navy }}>
                      Start here <ChevronRight size={12} />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── PRODUCTS ── */}
      <section id="products" className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 items-end mb-14">
            <div>
              <StripeRule />
              <div className="mt-5">
                <p className="text-xs font-black tracking-widest uppercase mb-1" style={{ color: C.gold }}>Our Products</p>
                <h2 className="text-4xl font-black tracking-tight" style={{ color: C.navy }}>
                  Complete Checking<br />Bag Systems
                </h2>
              </div>
            </div>
            <div className="self-end">
              <p className="text-base leading-relaxed mb-4" style={{ color: C.muted }}>
                From individual bags to full rack systems — everything your facility needs to manage personal belongings efficiently.
              </p>
              {/* CRO: section-level CTA for users who are already sold */}
              <a href="#contact"
                className="inline-flex items-center gap-2 text-white text-sm font-black px-5 py-3 rounded cursor-pointer hover:opacity-90 transition-opacity"
                style={{ background: C.navy }}>
                <Send size={14} /> Request All Pricing
              </a>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-0 border border-b-0" style={{ borderColor: C.border }}>
            {PRODUCTS.map((prod, i) => {
              const Icon = prod.Icon;
              return (
                <div key={prod.name}
                  className="flex flex-col border-r last:border-r-0 border-b group cursor-pointer transition-all duration-200 hover:bg-[#F4F8FF]"
                  style={{ borderColor: C.border }}>
                  <div className="relative h-40 overflow-hidden">
                    <img
                      src={`https://images.unsplash.com/${prod.img}?auto=format&fit=crop&w=400&q=80`}
                      alt={prod.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0"
                      style={{ background: `linear-gradient(to top, ${C.navyD}CC 0%, transparent 50%)` }} />
                    <div className="absolute top-3 left-3 w-7 h-7 rounded-sm flex items-center justify-center text-xs font-black"
                      style={{ background: C.navy, color: C.white }}>
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    {/* CRO: badge for Most Popular / High Volume products */}
                    {prod.badge && (
                      <div className="absolute top-3 right-3 rounded-sm px-2 py-0.5 text-[10px] font-black uppercase"
                        style={{ background: C.gold, color: C.white }}>
                        {prod.badge}
                      </div>
                    )}
                  </div>
                  <div className="p-6 flex flex-col flex-1 border-t-2" style={{ borderColor: C.navy }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Icon size={16} style={{ color: C.navy }} />
                      <h3 className="font-black text-sm" style={{ color: C.navy }}>{prod.name}</h3>
                    </div>
                    <p className="text-sm leading-relaxed flex-1" style={{ color: C.muted }}>{prod.desc}</p>
                    {/* CRO: specific CTA copy — "Get pricing" is more actionable than "Learn more" */}
                    <a href="#contact"
                      className="mt-5 inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider cursor-pointer transition-opacity hover:opacity-60"
                      style={{ color: C.navy }}>
                      Get pricing <ChevronRight size={12} />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-x border-b" style={{ borderColor: C.border, height: 0 }} />
        </div>
      </section>

      {/* ── INDUSTRIES ── */}
      <section id="industries" className="py-20 px-6" style={{ background: C.blueL }}>
        <div className="max-w-7xl mx-auto">
          <div className="mb-14">
            <StripeRule color={C.navy} />
            <div className="mt-5">
              <p className="text-xs font-black tracking-widest uppercase mb-1" style={{ color: C.gold }}>Industries Served</p>
              <h2 className="text-4xl font-black tracking-tight" style={{ color: C.navy }}>Who We Work With</h2>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {INDUSTRIES.map(ind => {
              const Icon = ind.Icon;
              return (
                <div key={ind.name}
                  className="group bg-white border overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg"
                  style={{ borderColor: C.border }}>
                  <div className="relative h-52 overflow-hidden">
                    <img
                      src={`https://images.unsplash.com/${ind.img}?auto=format&fit=crop&w=600&q=80`}
                      alt={ind.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0"
                      style={{ background: `linear-gradient(to top, ${C.navyD}D0 0%, transparent 55%)` }} />
                    <div className="absolute top-4 left-4 flex items-center gap-2 rounded px-3 py-1.5"
                      style={{ background: C.navy }}>
                      <Icon size={13} className="text-white" />
                      <span className="text-xs font-black text-white uppercase tracking-wider">
                        {ind.name.split(" ")[0]}
                      </span>
                    </div>
                  </div>
                  <div className="border-t-2 p-6" style={{ borderColor: C.navy }}>
                    {/* CRO: social proof stat per industry */}
                    <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: C.gold }}>
                      {ind.stat}
                    </p>
                    <h3 className="font-black text-base mb-2" style={{ color: C.navy }}>{ind.name}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: C.muted }}>{ind.desc}</p>
                    <a href="#contact"
                      className="mt-4 inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider cursor-pointer transition-opacity hover:opacity-60"
                      style={{ color: C.navy }}>
                      Request a quote <ChevronRight size={12} />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── WHY SUN AIRED ── */}
      <section id="why" className="py-20 px-6" style={{ background: C.navy }}>
        <div className="max-w-7xl mx-auto">
          <div className="mb-14">
            <StripeRule color={C.gold} />
            <div className="mt-5">
              <p className="text-xs font-black tracking-widest uppercase mb-1" style={{ color: C.gold }}>Why Sun Aired</p>
              <h2 className="text-4xl font-black tracking-tight text-white">
                The Standard in Checking<br />Bag Systems
              </h2>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-0 border border-b-0"
            style={{ borderColor: "rgba(255,255,255,0.1)" }}>
            {PILLARS.map(p => {
              const Icon = p.Icon;
              return (
                <div key={p.title} className="p-8 border-r last:border-r-0 border-b"
                  style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                  <div className="w-12 h-12 rounded-sm flex items-center justify-center mb-5"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                    <Icon size={22} style={{ color: C.gold }} />
                  </div>
                  <h3 className="font-black text-lg mb-2 text-white">{p.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>{p.body}</p>
                </div>
              );
            })}
          </div>
          <div className="border-x border-b" style={{ borderColor: "rgba(255,255,255,0.1)", height: 0 }} />
        </div>
      </section>

      {/* ── STATS STRIP ── */}
      <div style={{ background: C.navyXD }}>
        <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[["1947","Year Founded"],["500+","Facilities Served"],["50","States Covered"],["75+","Years of Excellence"]].map(([v, l]) => (
            <div key={l}>
              <div className="text-4xl font-black text-white leading-none mb-1.5">{v}</div>
              <div className="text-xs font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── TESTIMONIALS ── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="mb-14">
            <StripeRule />
            <div className="mt-5">
              <p className="text-xs font-black tracking-widest uppercase mb-1" style={{ color: C.gold }}>Testimonials</p>
              <h2 className="text-4xl font-black tracking-tight" style={{ color: C.navy }}>
                Trusted by Facility<br />Managers Nationwide
              </h2>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <div key={t.name}
                className="border flex flex-col p-7 transition-all duration-200 hover:shadow-md"
                style={{ borderColor: C.border, borderTopWidth: 2, borderTopColor: C.navy }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-0.5">
                    {[...Array(t.stars)].map((_, i) => (
                      <Star key={i} size={13} fill={C.gold} style={{ color: C.gold }} />
                    ))}
                  </div>
                  {/* CRO: "Verified customer" badge adds credibility */}
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded"
                    style={{ background: C.blueL, color: C.navy }}>
                    Verified Customer
                  </span>
                </div>
                <p className="text-sm leading-relaxed flex-1 mb-6 italic" style={{ color: C.muted }}>
                  "{t.text}"
                </p>
                <div className="flex items-center gap-3 pt-5 border-t" style={{ borderColor: C.border }}>
                  <div className="w-10 h-10 rounded-sm overflow-hidden shrink-0 border"
                    style={{ borderColor: C.border }}>
                    <img
                      src={`https://images.unsplash.com/photo-${t.img}?auto=format&fit=crop&w=80&h=80&q=80`}
                      alt={t.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-black text-sm" style={{ color: C.navy }}>{t.name}</p>
                    <p className="text-xs" style={{ color: C.muted }}>{t.role}</p>
                    <p className="text-xs font-bold mt-0.5" style={{ color: C.navy }}>{t.org}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <div style={{ background: C.navy }}>
        <div className="max-w-7xl mx-auto px-6 py-16 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <StripeRule color={C.gold} count={2} />
            {/* CRO: specific, benefit-led headline */}
            <h2 className="mt-4 text-3xl font-black text-white">
              Join 500+ facilities that trust<br />Sun Aired Bag Co.
            </h2>
            <p className="mt-2 text-base" style={{ color: "rgba(255,255,255,0.55)" }}>
              Free quote · No commitment · Ships in 3–5 business days
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <a href="#contact"
              className="flex items-center justify-center gap-2 text-white font-black px-8 py-4 rounded cursor-pointer hover:opacity-90 transition-opacity"
              style={{ background: C.gold }}>
              <Send size={16} /> Get My Free Quote
            </a>
            <a href={`tel:${PHONE}`}
              className="flex items-center justify-center gap-2 font-black px-8 py-4 rounded cursor-pointer hover:bg-white/10 transition-colors"
              style={{ color: C.white, border: `2px solid rgba(255,255,255,0.25)` }}>
              <Phone size={16} /> {PHONE}
            </a>
          </div>
        </div>
      </div>

      {/* ── CRO: FAQ — handles objections before the contact form ── */}
      <section className="py-20 px-6 bg-white border-b" style={{ borderColor: C.border }}>
        <div className="max-w-4xl mx-auto">
          <div className="mb-10">
            <StripeRule />
            <div className="mt-5">
              <p className="text-xs font-black tracking-widest uppercase mb-1" style={{ color: C.gold }}>FAQ</p>
              <h2 className="text-3xl font-black tracking-tight" style={{ color: C.navy }}>Common Questions</h2>
            </div>
          </div>
          <div className="border-t" style={{ borderColor: C.border }}>
            {FAQS.map(f => <FaqItem key={f.q} {...f} />)}
          </div>
          {/* CRO: CTA after FAQ — users are primed after objections are resolved */}
          <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
            <p className="text-sm" style={{ color: C.muted }}>Still have questions?</p>
            <div className="flex gap-3">
              <a href="#contact"
                className="inline-flex items-center gap-2 text-white text-sm font-black px-5 py-3 rounded cursor-pointer hover:opacity-90 transition-opacity"
                style={{ background: C.navy }}>
                <Send size={14} /> Get a Free Quote
              </a>
              <a href={`tel:${PHONE}`}
                className="inline-flex items-center gap-2 text-sm font-black px-5 py-3 rounded border cursor-pointer hover:opacity-80 transition-opacity"
                style={{ borderColor: C.navy, color: C.navy }}>
                <Phone size={14} /> Call Us
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── CONTACT / QUOTE FORM ── */}
      <QuoteForm />

      {/* ── FOOTER ── */}
      <footer className="pb-20 md:pb-0" style={{ background: C.navyXD }}>
        <div className="flex flex-col gap-[3px]" aria-hidden>
          <div style={{ height: 1, background: C.gold, opacity: 0.2 }} />
          <div style={{ height: 2, background: C.gold, opacity: 0.45 }} />
          <div style={{ height: 4, background: C.gold }} />
        </div>
        <div className="max-w-7xl mx-auto px-6 py-14 grid md:grid-cols-3 gap-12">
          <div>
            <LogoPlaceholder dark />
            <p className="mt-5 text-sm leading-relaxed max-w-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
              Sun Aired Bag Co. has been manufacturing professional checking bag systems for American facilities since 1947. Based in Redondo Beach, CA.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h4 className="font-black text-xs uppercase tracking-widest mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>Products</h4>
              <ul className="space-y-2.5">
                {PRODUCTS.map(p => (
                  <li key={p.name}>
                    <a href="#products" className="text-sm cursor-pointer transition-opacity hover:opacity-60"
                      style={{ color: "rgba(255,255,255,0.6)" }}>{p.name}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-black text-xs uppercase tracking-widest mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>Industries</h4>
              <ul className="space-y-2.5">
                {INDUSTRIES.map(ind => (
                  <li key={ind.name}>
                    <a href="#industries" className="text-sm cursor-pointer transition-opacity hover:opacity-60"
                      style={{ color: "rgba(255,255,255,0.6)" }}>{ind.name}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div>
            <h4 className="font-black text-xs uppercase tracking-widest mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>Contact</h4>
            <div className="flex flex-col gap-3">
              <a href={`tel:${PHONE}`} className="flex items-center gap-2 text-sm font-bold cursor-pointer transition-opacity hover:opacity-70 text-white">
                <Phone size={14} /> {PHONE}
              </a>
              <a href={`mailto:${EMAIL}`} className="flex items-center gap-2 text-sm cursor-pointer transition-opacity hover:opacity-70"
                style={{ color: "rgba(255,255,255,0.55)" }}>
                <Mail size={14} /> {EMAIL}
              </a>
              <div className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
                <MapPin size={14} /> {ADDRESS}
              </div>
              <div className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
                <Clock size={14} /> Mon–Fri 8:00 AM – 5:00 PM PT
              </div>
            </div>
          </div>
        </div>
        <div className="border-t max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2"
          style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
            © 2025 Sun Aired Bag Co. · Redondo Beach, CA · All rights reserved.
          </p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
            Website proposal by <span className="font-bold" style={{ color: "rgba(255,255,255,0.45)" }}>Acrosoft Labs</span>
          </p>
        </div>
      </footer>

      {/* ── CRO: STICKY MOBILE BAR (enhanced for mobile conversion) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t"
        style={{ background: "rgba(255,255,255,0.98)", borderColor: C.border, backdropFilter: "blur(8px)" }}>
        {/* CRO: trust micro-copy above bar */}
        <div className="text-center py-1.5 text-[10px] font-bold uppercase tracking-wider border-b"
          style={{ color: C.gold, borderColor: C.border, background: C.goldL }}>
          Free quote · No minimums · 1-day response
        </div>
        <div className="px-4 py-3 flex gap-3">
          <a href="#contact"
            className="flex-1 flex items-center justify-center gap-2 text-white font-black py-3.5 rounded text-sm cursor-pointer hover:opacity-90 transition-opacity"
            style={{ background: C.navy }}>
            <Send size={14} /> Get Free Quote
          </a>
          {/* CRO: Phone is the most frictionless action on mobile */}
          <a href={`tel:${PHONE}`}
            className="flex items-center justify-center gap-2 font-black py-3.5 px-4 rounded text-sm border cursor-pointer"
            style={{ borderColor: C.navy, color: C.navy }}>
            <Phone size={14} /> Call
          </a>
        </div>
      </div>
    </div>
  );
}
