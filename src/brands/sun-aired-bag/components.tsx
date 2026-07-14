import { useState } from "react";
import {
  ChevronDown, ChevronUp, ChevronRight, Check, Star,
  Send, Phone, Mail, MapPin, Loader2,
} from "lucide-react";
import { C, PHONE, EMAIL, ADDRESS } from "./brand";

// ─────────────────────────────────────────────────────────────────────────────
// PRIMITIVOS
// ─────────────────────────────────────────────────────────────────────────────

/** Motivo de rayas de la marca — usar como separador visual de secciones */
export function StripeRule({ color = C.navy, count = 3 }: { color?: string; count?: number }) {
  return (
    <div className="flex flex-col gap-[4px]" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ height: 2, background: color, opacity: 1 - i * 0.25 }} />
      ))}
    </div>
  );
}

/** Placeholder SVG hasta que el cliente entregue su logo */
export function LogoPlaceholder({ dark = false }: { dark?: boolean }) {
  const stripe = dark ? "rgba(255,255,255,0.5)" : C.navy;
  const bg     = dark ? "rgba(255,255,255,0.06)" : C.white;
  const label  = dark ? "rgba(255,255,255,0.3)"  : C.muted;
  return (
    <svg width="168" height="44" viewBox="0 0 168 44" xmlns="http://www.w3.org/2000/svg" aria-label="Logo">
      <rect x="0" y="0"  width="168" height="3" fill={stripe} />
      <rect x="0" y="5"  width="168" height="2" fill={stripe} opacity="0.55" />
      <rect x="0" y="9"  width="168" height="1" fill={stripe} opacity="0.25" />
      <rect x="0" y="12" width="168" height="20" fill={bg} />
      <ellipse cx="84" cy="22" rx="28" ry="8" fill="none" stroke={stripe} strokeWidth="1" opacity="0.3" />
      <text x="84" y="26" textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif"
        fontSize="8" fontWeight="900" fill={label} letterSpacing="1.8">TU LOGO AQUÍ</text>
      <rect x="0" y="33" width="168" height="1" fill={stripe} opacity="0.25" />
      <rect x="0" y="37" width="168" height="2" fill={stripe} opacity="0.55" />
      <rect x="0" y="41" width="168" height="3" fill={stripe} />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BOTONES
// ─────────────────────────────────────────────────────────────────────────────

/** Botón primario — fondo navy, texto blanco */
export function BtnPrimary({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href}
      className="inline-flex items-center justify-center gap-2 text-white font-black px-7 py-3.5 rounded cursor-pointer hover:opacity-90 transition-opacity"
      style={{ background: C.navy }}>
      {children}
    </a>
  );
}

/** Botón acento — fondo Vivid Blue, texto blanco */
export function BtnAccent({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href}
      className="inline-flex items-center justify-center gap-2 text-white font-black px-7 py-3.5 rounded cursor-pointer hover:opacity-90 transition-opacity"
      style={{ background: C.gold }}>
      {children}
    </a>
  );
}

/** Botón outline — borde blanco semitransparente, para usar sobre fondos oscuros */
export function BtnOutlineDark({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href}
      className="inline-flex items-center justify-center gap-2 font-black px-7 py-3.5 rounded cursor-pointer hover:bg-white/10 transition-colors"
      style={{ color: C.white, border: "2px solid rgba(255,255,255,0.35)" }}>
      {children}
    </a>
  );
}

/** Botón outline — borde navy, para usar sobre fondos claros */
export function BtnOutlineLight({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href}
      className="inline-flex items-center justify-center gap-2 font-black px-7 py-3.5 rounded border cursor-pointer hover:opacity-80 transition-opacity"
      style={{ borderColor: C.navy, color: C.navy }}>
      {children}
    </a>
  );
}

/** Link con flecha — CTA inline en cards */
export function ArrowLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href}
      className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider cursor-pointer transition-opacity hover:opacity-60"
      style={{ color: C.navy }}>
      {children} <ChevronRight size={12} />
    </a>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ENCABEZADOS DE SECCIÓN
// ─────────────────────────────────────────────────────────────────────────────

/** Header de sección estándar — label + título con stripe */
export function SectionHeader({
  label, title, dark = false,
}: {
  label: string;
  title: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <div className="mb-14">
      <StripeRule color={dark ? C.white : C.navy} />
      <div className="mt-5">
        <p className="text-xs font-black tracking-widest uppercase mb-1"
          style={{ color: dark ? "rgba(255,255,255,0.65)" : C.gold }}>
          {label}
        </p>
        <h2 className="text-4xl font-black tracking-tight"
          style={{ color: dark ? C.white : C.navy }}>
          {title}
        </h2>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CARDS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ProductCard — imagen con número + badge opcional, contenido con ícono, nombre, desc y link.
 * Uso: grid sm:grid-cols-2 lg:grid-cols-4 gap-0 border border-b-0
 */
export function ProductCard({
  Icon, name, desc, imgId, badge, index, href = "#contact",
}: {
  Icon: React.ElementType;
  name: string;
  desc: string;
  imgId: string;
  badge?: string | null;
  index: number;
  href?: string;
}) {
  return (
    <div className="flex flex-col border-r last:border-r-0 border-b group cursor-pointer transition-all duration-200 hover:bg-[#E6F2FF]"
      style={{ borderColor: C.border }}>
      <div className="relative h-40 overflow-hidden">
        <img
          src={`https://images.unsplash.com/${imgId}?auto=format&fit=crop&w=400&q=80`}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0"
          style={{ background: `linear-gradient(to top, ${C.navy}CC 0%, transparent 50%)` }} />
        <div className="absolute top-3 left-3 w-7 h-7 rounded-sm flex items-center justify-center text-xs font-black"
          style={{ background: C.navy, color: C.white }}>
          {String(index + 1).padStart(2, "0")}
        </div>
        {badge && (
          <div className="absolute top-3 right-3 rounded-sm px-2 py-0.5 text-[10px] font-black uppercase"
            style={{ background: C.gold, color: C.white }}>
            {badge}
          </div>
        )}
      </div>
      <div className="p-6 flex flex-col flex-1 border-t-2" style={{ borderColor: C.navy }}>
        <div className="flex items-center gap-2 mb-3">
          <Icon size={16} style={{ color: C.navy }} />
          <h3 className="font-black text-sm" style={{ color: C.navy }}>{name}</h3>
        </div>
        <p className="text-sm leading-relaxed flex-1" style={{ color: C.muted }}>{desc}</p>
        <ArrowLink href={href}>Get pricing</ArrowLink>
      </div>
    </div>
  );
}

/**
 * IndustryCard — imagen con label de categoría, stat, título, desc y link.
 * Uso: grid md:grid-cols-3 gap-6 — sobre fondo navy
 */
export function IndustryCard({
  Icon, name, desc, imgId, stat, href = "#contact",
}: {
  Icon: React.ElementType;
  name: string;
  desc: string;
  imgId: string;
  stat: string;
  href?: string;
}) {
  return (
    <div className="group bg-white border overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg"
      style={{ borderColor: C.border }}>
      <div className="relative h-52 overflow-hidden">
        <img
          src={`https://images.unsplash.com/${imgId}?auto=format&fit=crop&w=600&q=80`}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0"
          style={{ background: `linear-gradient(to top, ${C.navy}D0 0%, transparent 55%)` }} />
        <div className="absolute top-4 left-4 flex items-center gap-2 rounded px-3 py-1.5"
          style={{ background: C.navy }}>
          <Icon size={13} className="text-white" />
          <span className="text-xs font-black text-white uppercase tracking-wider">
            {name.split(" ")[0]}
          </span>
        </div>
      </div>
      <div className="border-t-2 p-6" style={{ borderColor: C.navy }}>
        <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: C.gold }}>
          {stat}
        </p>
        <h3 className="font-black text-base mb-2" style={{ color: C.navy }}>{name}</h3>
        <p className="text-sm leading-relaxed" style={{ color: C.muted }}>{desc}</p>
        <ArrowLink href={href}>Request a quote</ArrowLink>
      </div>
    </div>
  );
}

/**
 * PillarCard — ícono sobre fondo navy + título + descripción.
 * Uso: grid sm:grid-cols-3 gap-6 — sobre fondo Vivid Blue (#0080FF)
 */
export function PillarCard({
  Icon, title, body,
}: {
  Icon: React.ElementType;
  title: string;
  body: string;
}) {
  return (
    <div className="p-8 rounded bg-white">
      <div className="w-12 h-12 rounded-sm flex items-center justify-center mb-5"
        style={{ background: C.navy }}>
        <Icon size={22} style={{ color: C.white }} />
      </div>
      <h3 className="font-black text-lg mb-2" style={{ color: C.navy }}>{title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: C.muted }}>{body}</p>
    </div>
  );
}

/**
 * TestimonialCard — estrellas + quote + avatar circular + nombre y rol.
 * Uso: grid md:grid-cols-3 gap-6 — sobre fondo #F1F1F1
 */
export function TestimonialCard({
  name, role, stars, text, imgId,
}: {
  name: string;
  role: string;
  stars: number;
  text: string;
  imgId: string;
}) {
  return (
    <div className="bg-white rounded-lg flex flex-col p-7 transition-all duration-200 hover:shadow-md"
      style={{ border: `1px solid ${C.border}` }}>
      <div className="flex gap-1 mb-4">
        {[...Array(stars)].map((_, i) => (
          <Star key={i} size={16} fill={C.gold} style={{ color: C.gold }} />
        ))}
      </div>
      <p className="text-sm leading-relaxed flex-1 mb-6" style={{ color: C.text }}>
        "{text}"
      </p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
          <img
            src={`https://images.unsplash.com/photo-${imgId}?auto=format&fit=crop&w=80&h=80&q=80`}
            alt={name}
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <p className="font-black text-sm" style={{ color: C.navy }}>{name}</p>
          <p className="text-xs" style={{ color: C.muted }}>{role}</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATS STRIP
// ─────────────────────────────────────────────────────────────────────────────

/**
 * StatsStrip — 4 stats en grid flotante entre secciones.
 * Uso: colocar justo después del hero con -mt-10 para efecto overlap
 */
export function StatsStrip({
  stats,
}: {
  stats: [string, string][];
}) {
  return (
    <div className="px-6 relative z-10 -mt-10">
      <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-0 text-center"
        style={{ background: C.navy }}>
        {stats.map(([v, l], i) => (
          <div key={l}
            className={`py-8 px-4 border-white/10
              ${i % 2 === 0 ? "border-r" : ""}
              ${i < 2 ? "border-b" : ""}
              md:border-b-0
              ${i < 3 ? "md:border-r" : "md:border-r-0"}
            `}>
            <div className="text-3xl md:text-4xl font-black text-white leading-none mb-1.5">{v}</div>
            <div className="text-[10px] md:text-xs font-bold uppercase tracking-wider"
              style={{ color: "rgba(255,255,255,0.4)" }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FAQ
// ─────────────────────────────────────────────────────────────────────────────

export function FaqItem({ q, a }: { q: string; a: string }) {
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
      {open && <p className="pb-4 text-sm leading-relaxed" style={{ color: C.muted }}>{a}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QUOTE FORM
// ─────────────────────────────────────────────────────────────────────────────

export function QuoteForm() {
  const [form, setForm] = useState({ name: "", company: "", phone: "", email: "", type: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); setSent(true); }, 1100);
  };

  const inputCls = {
    width: "100%", border: `1px solid ${C.border}`, borderRadius: 6,
    padding: "11px 14px", fontSize: 14, color: C.text, outline: "none",
    background: C.white, transition: "border-color 150ms",
  };

  return (
    <section id="contact" className="py-24 px-6" style={{ background: C.blueL }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-12">
          <StripeRule />
          <div className="mt-5">
            <p className="text-xs font-black tracking-widest uppercase mb-1" style={{ color: C.gold }}>GET A QUOTE</p>
            <h2 className="text-4xl font-black tracking-tight" style={{ color: C.navy }}>Request a Free Quote</h2>
            <p className="mt-2 text-base max-w-lg" style={{ color: C.muted }}>
              No commitment. No minimum order. We respond within 1 business day.
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Form */}
          <div className="rounded-lg border bg-white p-8" style={{ borderColor: C.border }}>
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
                  style={{ background: C.blueL }}>
                  <Check size={30} style={{ color: C.gold }} />
                </div>
                <h3 className="text-xl font-black mb-2" style={{ color: C.navy }}>Quote Request Sent!</h3>
                <p className="text-sm mb-5" style={{ color: C.muted }}>
                  We'll respond within <strong>1 business day</strong> with pricing for your facility.
                </p>
                <div className="rounded border p-4 text-sm font-bold" style={{ borderColor: C.border, color: C.navy }}>
                  Need it faster? Call us now:<br />
                  <a href={`tel:${PHONE}`} className="text-lg" style={{ color: C.navy }}>{PHONE}</a>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { label: "Full Name *",         key: "name",    type: "text",  ph: "John Smith",           req: true  },
                    { label: "Company / Facility *", key: "company", type: "text",  ph: "City Aquatics Center",  req: true  },
                  ].map(f => (
                    <div key={f.key}>
                      <label htmlFor={`field-${f.key}`} className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: C.muted }}>{f.label}</label>
                      <input id={`field-${f.key}`} required={f.req} type={f.type} placeholder={f.ph}
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
                    { label: "Phone *", key: "phone", type: "tel",   ph: "(310) 000-0000",    req: true  },
                    { label: "Email",   key: "email", type: "email", ph: "you@facility.gov",  req: false },
                  ].map(f => (
                    <div key={f.key}>
                      <label htmlFor={`field-${f.key}`} className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: C.muted }}>{f.label}</label>
                      <input id={`field-${f.key}`} required={f.req} type={f.type} placeholder={f.ph}
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
                  <label htmlFor="field-type" className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: C.muted }}>Facility Type</label>
                  <select id="field-type" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
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
                  <label htmlFor="field-message" className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: C.muted }}>Notes / Requirements</label>
                  <textarea id="field-message"
                    placeholder="Describe your facility, quantity needed, bag sizes, and any special requirements..."
                    value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                    rows={3} style={{ ...inputCls, resize: "none" }}
                    onFocus={e => (e.target as HTMLTextAreaElement).style.borderColor = C.navy}
                    onBlur={e => (e.target as HTMLTextAreaElement).style.borderColor = C.border}
                  />
                </div>
                <p className="text-xs text-center" style={{ color: C.muted }}>
                  No commitment required · We never share your information
                </p>
                <button type="submit" disabled={loading}
                  className="flex items-center justify-center gap-2 text-white font-black px-7 py-4 rounded cursor-pointer transition-opacity disabled:opacity-70"
                  style={{ background: C.navy, fontSize: 15 }}
                  onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.opacity = "0.9"; }}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = "1"}
                >
                  {loading ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : <><Send size={16} /> Get My Free Quote</>}
                </button>
              </form>
            )}
          </div>

          {/* Contact sidebar */}
          <div className="flex flex-col gap-5">
            <a href={`tel:${PHONE}`}
              className="flex items-center gap-4 rounded-lg border bg-white p-5 cursor-pointer group transition-all hover:shadow-md"
              style={{ borderColor: C.navy, borderWidth: 2 }}>
              <div className="w-12 h-12 rounded flex items-center justify-center shrink-0" style={{ background: C.navy }}>
                <Phone size={20} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider mb-0.5" style={{ color: C.muted }}>Prefer to talk? Call us directly</p>
                <p className="font-black text-lg group-hover:opacity-80 transition-opacity" style={{ color: C.navy }}>{PHONE}</p>
                <p className="text-xs" style={{ color: C.muted }}>Mon–Fri 8:00 AM – 5:00 PM PT</p>
              </div>
            </a>

            <div className="rounded-lg border bg-white p-6" style={{ borderColor: C.border }}>
              {[
                { Icon: Mail,   val: EMAIL,   href: `mailto:${EMAIL}`, label: "Email" },
                { Icon: MapPin, val: ADDRESS, href: null,              label: "Location" },
              ].map(({ Icon, val, href, label }) => (
                <div key={label} className="flex items-center gap-3 mb-4 last:mb-0">
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

// ─────────────────────────────────────────────────────────────────────────────
// STICKY MOBILE BAR
// ─────────────────────────────────────────────────────────────────────────────

/** Barra fija inferior para mobile con CTA principal y botón de llamada */
export function StickyMobileBar() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t"
      style={{ background: "rgba(255,255,255,0.98)", borderColor: C.border, backdropFilter: "blur(8px)" }}>
      <div className="text-center py-1.5 text-[10px] font-bold uppercase tracking-wider border-b"
        style={{ color: C.gold, borderColor: C.border, background: C.blueL }}>
        Free quote · No minimums · 1-day response
      </div>
      <div className="px-4 py-3 flex gap-3">
        <a href="#contact"
          className="flex-1 flex items-center justify-center gap-2 text-white font-black py-3.5 rounded text-sm cursor-pointer hover:opacity-90 transition-opacity"
          style={{ background: C.navy }}>
          <Send size={14} /> Get Free Quote
        </a>
        <a href={`tel:${PHONE}`}
          className="flex items-center justify-center gap-2 font-black py-3.5 px-4 rounded text-sm border cursor-pointer"
          style={{ borderColor: C.navy, color: C.navy }}>
          <Phone size={14} /> Call
        </a>
      </div>
    </div>
  );
}
