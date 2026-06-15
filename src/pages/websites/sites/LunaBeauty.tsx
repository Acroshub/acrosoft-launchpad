import { useState, useMemo } from "react";
import {
  Phone, Mail, Clock, MapPin, Star, ChevronLeft, ChevronRight,
  ChevronDown, ChevronUp, Check, Calendar, Menu, X, Award,
  Sparkles, Heart, Scissors,
} from "lucide-react";

// ── TOKENS ────────────────────────────────────────────────────────────────────
const C = {
  dark:    "#1C1917",
  gold:    "#92400E",
  goldBrt: "#D97706",
  goldL:   "#FFFBEB",
  rose:    "#9D174D",
  roseL:   "#FFF1F2",
  roseMid: "#BE185D",
  cream:   "#FAFAF9",
  border:  "#E7E5E4",
  text:    "#292524",
  muted:   "#78716C",
  white:   "#FFFFFF",
};

const PHONE = "(305) 555-0174";
const EMAIL = "info@lunabeautystudio.com";
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

type Page = "home" | "services" | "team" | "gallery" | "book";

// ── SPECIALISTS ───────────────────────────────────────────────────────────────
const SPECIALISTS = [
  {
    id: "sofia",
    name: "Sofia M.",
    role: "Lead Colorist",
    bio: "Specialist in color transformations, balayage, and highlights with 8+ years of experience. Trained in Paris and New York.",
    services: ["womens-cuts","coloring","balayage","keratin"],
    workDays: [2,3,4,5,6],
    bookedOffsets: [1,4,7,9,12,16,19,22,26],
    photo: "1562322140-8baeececf3df",
    exp: "8 yrs",
    langs: ["English","Spanish"],
    rating: 4.9,
    reviews: 142,
  },
  {
    id: "isabella",
    name: "Isabella R.",
    role: "Senior Stylist",
    bio: "Expert in precision cuts, dimensional color, and balayage. Known for her ability to create perfectly customized looks.",
    services: ["womens-cuts","mens-cuts","coloring","balayage"],
    workDays: [2,3,4,5],
    bookedOffsets: [2,5,8,11,15,18,21,24],
    photo: "1526045612212-70caf35c14df",
    exp: "6 yrs",
    langs: ["English","Portuguese"],
    rating: 4.8,
    reviews: 98,
  },
  {
    id: "camila",
    name: "Camila V.",
    role: "Extensions Specialist",
    bio: "Certified in hand-tied, tape-in, and fusion hair extensions. Also a skilled colorist with a passion for natural-looking results.",
    services: ["womens-cuts","coloring","balayage","extensions"],
    workDays: [3,4,5,6],
    bookedOffsets: [3,6,10,14,17,20,23,27],
    photo: "1596755389378-c31d21fd1273",
    exp: "5 yrs",
    langs: ["English","Spanish","Portuguese"],
    rating: 4.9,
    reviews: 87,
  },
  {
    id: "diego",
    name: "Diego A.",
    role: "Men's Specialist",
    bio: "Master barber and stylist specializing in men's cuts, fades, and modern styles. Also trained for women's precision cuts.",
    services: ["mens-cuts","womens-cuts"],
    workDays: [2,3,4,5,6],
    bookedOffsets: [1,3,7,11,15,18,22,25],
    photo: "1507003211169-0a1dd7228f2d",
    exp: "7 yrs",
    langs: ["English","Spanish"],
    rating: 4.9,
    reviews: 203,
  },
  {
    id: "elena",
    name: "Elena P.",
    role: "Treatment Specialist",
    bio: "Expert in keratin treatments, deep conditioning, and texture services. Specialist in caring for damaged and curly hair types.",
    services: ["womens-cuts","keratin"],
    workDays: [2,3,4,6],
    bookedOffsets: [2,5,9,13,16,20,24,28],
    photo: "1517841905240-472988babdf9",
    exp: "5 yrs",
    langs: ["English","Spanish"],
    rating: 4.8,
    reviews: 74,
  },
  {
    id: "valentina",
    name: "Valentina S.",
    role: "Lead Makeup Artist",
    bio: "Certified MUA with experience in editorial, bridal, and commercial makeup. Your go-to for flawless, long-lasting looks.",
    services: ["makeup","bridal"],
    workDays: [5,6],
    bookedOffsets: [1,4,8,12,15,19,22,26],
    photo: "1509631179647-0177331693ae",
    exp: "6 yrs",
    langs: ["English","Spanish","French"],
    rating: 5.0,
    reviews: 116,
  },
  {
    id: "lucia",
    name: "Lucia M.",
    role: "Bridal Specialist",
    bio: "Specializes in bridal beauty packages — from trials to wedding day looks. Booked months in advance for Miami weddings.",
    services: ["makeup","bridal"],
    workDays: [5,6],
    bookedOffsets: [2,5,8,11,15,18,22,25],
    photo: "1576091160399-112ba8d25d1d",
    exp: "4 yrs",
    langs: ["English","Spanish"],
    rating: 5.0,
    reviews: 91,
  },
];

// ── SERVICES ──────────────────────────────────────────────────────────────────
const SERVICES = [
  { id:"womens-cuts",  cat:"Hair",   name:"Women's Haircut",    from:"$65",  dur:"45–60 min",  durMin:60,  photo:"1519699047748-de8e457a634e", desc:"Precision cut tailored to your face shape, texture, and lifestyle. Includes shampoo, blow-dry, and style." },
  { id:"mens-cuts",    cat:"Hair",   name:"Men's Haircut",      from:"$45",  dur:"30–45 min",  durMin:45,  photo:"1512207736890-6ffed8a84e8d", desc:"Classic cuts, tapers, and modern styles. Includes scalp massage and finishing products." },
  { id:"coloring",     cat:"Color",  name:"Hair Coloring",      from:"$120", dur:"2–3 hours",  durMin:180, photo:"1618160702438-9b02ab6515c9", desc:"Full color, roots, highlights, or vivid color. We use only premium, salon-grade hair color." },
  { id:"balayage",     cat:"Color",  name:"Balayage",           from:"$180", dur:"3–4 hours",  durMin:240, photo:"1583001931096-959e9a1a6223", desc:"Hand-painted highlights for a natural, sun-kissed look. Customized to complement your features." },
  { id:"extensions",   cat:"Hair",   name:"Hair Extensions",    from:"$300", dur:"3–5 hours",  durMin:300, photo:"1589985270826-4b7bb135bc9d", desc:"Hand-tied, tape-in, or fusion extensions. Natural look, comfortable wear, and lasting results." },
  { id:"keratin",      cat:"Treat",  name:"Keratin Treatment",  from:"$200", dur:"2–3 hours",  durMin:180, photo:"1532710093739-9470acff878f", desc:"Smoothing treatment that eliminates frizz for up to 3 months. Safe for all hair types." },
  { id:"makeup",       cat:"Beauty", name:"Makeup Services",    from:"$85",  dur:"45–60 min",  durMin:60,  photo:"1493256338651-d82f7acb2b38", desc:"Full glam, natural, editorial, or event makeup. Long-lasting formulas, premium brands." },
  { id:"bridal",       cat:"Beauty", name:"Bridal Packages",    from:"$300", dur:"3–4 hours",  durMin:240, photo:"1502823403499-6ccfcf4fb453", desc:"Bridal hair and makeup packages including trial session. Destination weddings welcome." },
];

// ── TIME SLOTS BY DURATION ────────────────────────────────────────────────────
function getTimeSlots(durMin: number): string[] {
  if (durMin <= 60)  return ["9:00 AM","10:00 AM","11:00 AM","12:00 PM","1:00 PM","2:00 PM","3:00 PM","4:00 PM","5:00 PM","6:00 PM"];
  if (durMin <= 120) return ["9:00 AM","10:30 AM","12:00 PM","1:30 PM","3:00 PM","4:30 PM"];
  if (durMin <= 180) return ["9:00 AM","11:00 AM","1:00 PM","3:00 PM","5:00 PM"];
  if (durMin <= 240) return ["9:00 AM","11:30 AM","2:00 PM"];
  return ["9:00 AM","1:00 PM"];
}

// ── TESTIMONIALS ──────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  { name:"Amanda K.", loc:"Brickell, FL",    stars:5, job:"Balayage",            text:"My balayage turned out even better than I imagined. Sofia understood exactly what I wanted and the result was absolutely stunning. I've never felt so confident leaving a salon.", img:"1587614382346-4ec70e388b28" },
  { name:"Rachel P.", loc:"Coral Gables, FL",stars:5, job:"Women's Haircut",     text:"The staff is friendly and incredibly talented. Isabella gave me the most precise cut I've ever had. She explained every step and the result was exactly what I envisioned.", img:"1573496359142-b8d87734a5a2" },
  { name:"Nicole B.", loc:"Wynwood, FL",     stars:5, job:"Bridal Package",      text:"The salon is beautiful and the service is outstanding. Valentina and Lucia did my bridal party makeup and hair for my wedding — every single one of us looked incredible. Worth every penny.", img:"1541746972996-4e0b0f43e02a" },
  { name:"Mia T.",    loc:"South Beach, FL", stars:5, job:"Hair Extensions",     text:"Camila is absolutely a magician with extensions. I've had bad experiences before but these look completely natural. No one can tell they're not my real hair.", img:"1525610553991-2bede1a236e2" },
];

// ── GALLERY ───────────────────────────────────────────────────────────────────
const GALLERY = [
  { id:1, label:"Balayage Transformation",  photo:"1583001931096-959e9a1a6223", cat:"Color",  spec:"Sofia M." },
  { id:2, label:"Bridal Updo",             photo:"1502823403499-6ccfcf4fb453", cat:"Bridal", spec:"Lucia M." },
  { id:3, label:"Color Treatment",         photo:"1618160702438-9b02ab6515c9", cat:"Color",  spec:"Isabella R." },
  { id:4, label:"Hair Extensions",        photo:"1589985270826-4b7bb135bc9d", cat:"Hair",   spec:"Camila V." },
  { id:5, label:"Keratin Smoothing",      photo:"1532710093739-9470acff878f", cat:"Treat",  spec:"Elena P." },
  { id:6, label:"Bridal Makeup",          photo:"1493256338651-d82f7acb2b38", cat:"Bridal", spec:"Valentina S." },
  { id:7, label:"Precision Cut",          photo:"1519699047748-de8e457a634e", cat:"Hair",   spec:"Sofia M." },
  { id:8, label:"Glam Makeup",            photo:"1571902943202-507ec2618e8f", cat:"Beauty", spec:"Valentina S." },
  { id:9, label:"Men's Style",            photo:"1512207736890-6ffed8a84e8d", cat:"Hair",   spec:"Diego A." },
];

const GAL_FILTERS = ["All","Hair","Color","Bridal","Beauty","Treat"] as const;
type GalFilter = typeof GAL_FILTERS[number];

// ── FAQS ──────────────────────────────────────────────────────────────────────
const FAQS = [
  { q:"How do I choose the right specialist?", a:"Each specialist has unique strengths — our Team page shows their specialties, experience, and client ratings. You can also call or text us and we'll personally recommend the best match for your service." },
  { q:"Do you offer free consultations?", a:"Yes! Every new client receives a complimentary 15-minute consultation before their service. We'll discuss your goals, hair health, and the best plan to achieve your desired look." },
  { q:"How far in advance should I book?", a:"For haircuts and makeup, 3–7 days. For color, balayage, and extensions, we recommend 1–2 weeks. Bridal packages should be booked 3–6 months in advance. Same-day is sometimes available — always worth calling!" },
  { q:"What hair products do you use?", a:"We use premium professional brands including Oribe, Kérastase, and Redken. We also carry luxury tools and retail products available for purchase so you can maintain your look at home." },
  { q:"Do you accommodate texture and curly hair?", a:"Absolutely. Elena is our texture and curl specialist, certified in DevaCurl and curly-hair cutting techniques. We welcome all hair types and textures." },
  { q:"What is your cancellation policy?", a:"We ask for 24-hour notice for cancellations or rescheduling. Late cancellations or no-shows may incur a 50% service charge. We understand life happens — just let us know as early as possible." },
];

// ── LOGO ──────────────────────────────────────────────────────────────────────
function LunaLogo({ light = false, compact = false, className = "" }: { light?: boolean; compact?: boolean; className?: string }) {
  const txt  = light ? C.white : C.dark;
  const sub  = light ? "rgba(255,255,255,0.55)" : C.muted;
  const w = compact ? 160 : 200;
  return (
    <svg viewBox="0 0 200 52" xmlns="http://www.w3.org/2000/svg" className={className} style={{ width: w }} aria-label="Luna Beauty Studio" role="img">
      {/* Crescent moon */}
      <path d="M20 8 A14 14 0 1 0 20 44 A10 10 0 1 1 20 8 Z" fill={C.goldBrt} />
      {/* Stars */}
      <path d="M36 12 L37 15.5 L40.5 16 L37.8 18.5 L38.5 22 L36 20.2 L33.5 22 L34.2 18.5 L31.5 16 L35 15.5 Z" fill={C.goldBrt} opacity="0.8" />
      <circle cx="40" cy="8" r="1.5" fill={C.goldBrt} opacity="0.6"/>
      <circle cx="32" cy="6" r="1" fill={C.goldBrt} opacity="0.5"/>
      {/* Wordmark */}
      <text x="48" y="23" fontFamily="Georgia,'Times New Roman',serif" fontWeight="700" fontSize="18" fill={txt} letterSpacing="2">LUNA</text>
      <text x="49" y="35" fontFamily="Arial,sans-serif" fontWeight="500" fontSize="9" fill={C.goldBrt} letterSpacing="4">BEAUTY STUDIO</text>
      {!compact && <text x="49" y="46" fontFamily="Arial,sans-serif" fontWeight="400" fontSize="7.5" fill={sub} letterSpacing="2">MIAMI, FL · EST. 2020</text>}
    </svg>
  );
}

// ── SHARED ────────────────────────────────────────────────────────────────────
function StarRow({ n, size = 14 }: { n: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_,i) => <Star key={i} size={size} fill={i < n ? C.goldBrt : "transparent"} style={{ color: i < n ? C.goldBrt : C.border }} />)}
    </div>
  );
}

function SectionHeader({ label, title, light = false }: { label: string; title: string; light?: boolean }) {
  return (
    <div className="mb-12">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-px w-10" style={{ background: C.goldBrt }} />
        <span className="text-xs font-semibold tracking-[0.25em] uppercase" style={{ color: C.goldBrt }}>{label}</span>
        <div className="h-px w-10" style={{ background: C.goldBrt }} />
      </div>
      <h2 className="text-4xl md:text-5xl font-bold leading-tight" style={{ fontFamily:"Georgia,serif", color: light ? C.white : C.dark }}>{title}</h2>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b" style={{ borderColor: C.border }}>
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between gap-4 py-5 text-left cursor-pointer group">
        <span className="font-semibold text-base transition-colors" style={{ color: open ? C.roseMid : C.text }}>{q}</span>
        {open
          ? <ChevronUp size={17} style={{ color: C.roseMid }} className="shrink-0"/>
          : <ChevronDown size={17} className="shrink-0 text-slate-400"/>}
      </button>
      {open && <p className="pb-5 text-sm leading-relaxed" style={{ color: C.muted }}>{a}</p>}
    </div>
  );
}

// ── PAGE: HOME ─────────────────────────────────────────────────────────────────
function HomePage({ nav }: { nav: (p: Page, extras?: Record<string,string>) => void }) {
  const [tIdx, setTIdx] = useState(0);
  return (
    <div>
      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-end pb-16 md:pb-0 md:items-center overflow-hidden" style={{ background: C.dark }}>
        <img src={`https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1600&q=85`}
          alt="Luxury beauty salon interior at Luna Beauty Studio Miami"
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
        {/* Gradient */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(28,25,23,0.98) 0%, rgba(28,25,23,0.7) 50%, rgba(28,25,23,0.3) 100%)" }} />

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 w-full py-24">
          <div className="max-w-2xl">
            {/* Decorative line */}
            <div className="flex items-center gap-3 mb-8">
              <div className="h-px w-16" style={{ background: C.goldBrt }} />
              <span className="text-xs tracking-[0.3em] uppercase font-medium" style={{ color: C.goldBrt }}>Miami, Florida · Est. 2020</span>
            </div>
            <h1 className="font-bold leading-[1.0] tracking-tight mb-6" style={{ fontFamily:"Georgia,serif", fontSize:"clamp(3rem,6vw,5.5rem)", color: C.white }}>
              Where Beauty<br />
              <em className="not-italic" style={{ color: C.goldBrt }}>Meets</em><br />
              Confidence.
            </h1>
            <p className="text-lg leading-relaxed mb-10 max-w-md" style={{ color:"rgba(255,255,255,0.6)" }}>
              Miami's premier beauty studio — specializing in color, cuts, extensions, and bridal services. Every visit, a transformation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <button onClick={() => nav("book")} className="flex items-center justify-center gap-2 text-white font-semibold px-8 py-4 rounded-full text-sm tracking-wide transition-all duration-300 cursor-pointer hover:opacity-90" style={{ background: C.roseMid }}>
                <Calendar size={16}/> Book Appointment
              </button>
              <button onClick={() => nav("services")} className="flex items-center justify-center gap-2 font-semibold px-8 py-4 rounded-full text-sm tracking-wide transition-all duration-300 cursor-pointer border hover:border-white/60" style={{ borderColor:"rgba(255,255,255,0.25)", color:C.white }}>
                Our Services <ChevronRight size={16}/>
              </button>
            </div>
            {/* Social proof */}
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-3 rounded-full px-4 py-2.5 border" style={{ borderColor:"rgba(255,255,255,0.15)", background:"rgba(255,255,255,0.06)" }}>
                <StarRow n={5} size={13}/>
                <span className="text-white text-sm font-semibold">4.9 · 500+ reviews</span>
              </div>
              <div className="flex items-center gap-2 text-sm" style={{ color:"rgba(255,255,255,0.6)" }}>
                <Award size={14} style={{ color:C.goldBrt }}/><span>Certified Stylists</span>
              </div>
              <div className="flex items-center gap-2 text-sm" style={{ color:"rgba(255,255,255,0.6)" }}>
                <Sparkles size={14} style={{ color:C.goldBrt }}/><span>Free Consultation</span>
              </div>
            </div>
          </div>
        </div>

        {/* Floating team tease on desktop */}
        <div className="hidden lg:flex absolute right-12 bottom-16 flex-col gap-3 z-10">
          <div className="text-right mb-1 text-xs tracking-widest uppercase" style={{ color:"rgba(255,255,255,0.35)" }}>Our Team</div>
          <div className="flex gap-2 justify-end">
            {SPECIALISTS.slice(0,5).map(s => (
              <div key={s.id} className="w-12 h-12 rounded-full overflow-hidden border-2 cursor-pointer transition-transform hover:scale-110" style={{ borderColor:C.goldBrt }} onClick={() => nav("team")} title={s.name}>
                <img src={`https://images.unsplash.com/photo-${s.photo}?auto=format&fit=crop&w=96&h=96&q=80`} alt={s.name} className="w-full h-full object-cover"/>
              </div>
            ))}
            <button onClick={() => nav("team")} className="w-12 h-12 rounded-full border-2 flex items-center justify-center cursor-pointer text-xs font-bold transition-colors hover:bg-white/20" style={{ borderColor:"rgba(255,255,255,0.3)", color:"rgba(255,255,255,0.6)" }}>
              +{SPECIALISTS.length - 5}
            </button>
          </div>
        </div>
      </section>

      {/* ── TRUST STRIP ── */}
      <div className="py-5 px-6 border-b" style={{ background:C.goldL, borderColor:"#FDE68A" }}>
        <div className="max-w-5xl mx-auto flex flex-wrap justify-center md:justify-between items-center gap-5">
          {[
            [Sparkles,"Free Consultation on Every Visit"],
            [Award,"Certified & Licensed Stylists"],
            [Heart,"Premium Oribe & Kérastase Products"],
            [Check,"Satisfaction Guaranteed"],
          ].map(([Icon, text]) => (
            <div key={text as string} className="flex items-center gap-2 text-sm font-medium" style={{ color:C.gold }}>
              {/* @ts-ignore */}
              <Icon size={14} style={{ color:C.goldBrt }}/>{text as string}
            </div>
          ))}
        </div>
      </div>

      {/* ── SERVICES PREVIEW ── */}
      <section className="py-24 px-6" style={{ background:C.cream }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-14">
            <SectionHeader label="Our Expertise" title={"Services Crafted\nfor You."} />
            <button onClick={() => nav("services")} className="shrink-0 flex items-center gap-2 font-semibold text-sm px-5 py-3 rounded-full border transition-colors cursor-pointer hover:border-stone-500" style={{ borderColor:C.border, color:C.muted }}>
              All Services <ChevronRight size={14}/>
            </button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SERVICES.slice(0,4).map(svc => (
              <button key={svc.id} onClick={() => nav("book", {service: svc.id})} className="group text-left rounded-2xl overflow-hidden border cursor-pointer transition-all duration-200 hover:shadow-xl hover:-translate-y-1" style={{ borderColor:C.border, background:C.white }}>
                <div className="aspect-video overflow-hidden">
                  <img src={`https://images.unsplash.com/photo-${svc.photo}?auto=format&fit=crop&w=500&q=80`} alt={svc.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy"/>
                </div>
                <div className="p-4">
                  <div className="text-[10px] uppercase tracking-widest font-semibold mb-1.5" style={{ color:C.goldBrt }}>{svc.cat}</div>
                  <div className="font-bold text-base mb-0.5" style={{ color:C.dark, fontFamily:"Georgia,serif" }}>{svc.name}</div>
                  <div className="flex items-center justify-between text-xs mt-2" style={{ color:C.muted }}>
                    <span>{svc.dur}</span>
                    <span className="font-semibold" style={{ color:C.roseMid }}>From {svc.from}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            {SERVICES.slice(4).map(svc => (
              <button key={svc.id} onClick={() => nav("book", {service: svc.id})} className="group text-left rounded-2xl overflow-hidden border cursor-pointer transition-all duration-200 hover:shadow-xl hover:-translate-y-1" style={{ borderColor:C.border, background:C.white }}>
                <div className="aspect-video overflow-hidden">
                  <img src={`https://images.unsplash.com/photo-${svc.photo}?auto=format&fit=crop&w=500&q=80`} alt={svc.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy"/>
                </div>
                <div className="p-4">
                  <div className="text-[10px] uppercase tracking-widest font-semibold mb-1.5" style={{ color:C.goldBrt }}>{svc.cat}</div>
                  <div className="font-bold text-base mb-0.5" style={{ color:C.dark, fontFamily:"Georgia,serif" }}>{svc.name}</div>
                  <div className="flex items-center justify-between text-xs mt-2" style={{ color:C.muted }}>
                    <span>{svc.dur}</span>
                    <span className="font-semibold" style={{ color:C.roseMid }}>From {svc.from}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── TEAM TEASER ── */}
      <section className="py-20 px-6" style={{ background:C.dark }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <SectionHeader label="Our Team" title={"Award-Winning\nStylists."} light />
              <p className="text-base leading-relaxed mb-8" style={{ color:"rgba(255,255,255,0.55)" }}>
                Our 11-specialist team brings decades of combined experience in hair, color, makeup, and bridal beauty. Trained locally and internationally, each artist brings a unique perspective.
              </p>
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[["8","Professional Stylists"],["2","Makeup Artists"],["500+","Happy Clients"]].map(([v,l]) => (
                  <div key={l} className="rounded-2xl p-4 text-center border" style={{ background:"rgba(255,255,255,0.05)", borderColor:"rgba(255,255,255,0.1)" }}>
                    <div className="text-2xl font-bold" style={{ fontFamily:"Georgia,serif", color:C.goldBrt }}>{v}</div>
                    <div className="text-xs mt-1" style={{ color:"rgba(255,255,255,0.45)" }}>{l}</div>
                  </div>
                ))}
              </div>
              <button onClick={() => nav("team")} className="flex items-center gap-2 font-semibold text-sm px-6 py-3 rounded-full border cursor-pointer transition-colors hover:border-white/50" style={{ borderColor:"rgba(255,255,255,0.25)", color:C.white }}>
                Meet the Team <ChevronRight size={15}/>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {SPECIALISTS.slice(0,6).map(s => (
                <button key={s.id} onClick={() => nav("team")} className="group cursor-pointer">
                  <div className="aspect-square rounded-2xl overflow-hidden border-2 transition-all duration-200 group-hover:border-opacity-100" style={{ borderColor:`${C.goldBrt}40` }}>
                    <img src={`https://images.unsplash.com/photo-${s.photo}?auto=format&fit=crop&w=300&h=300&q=80`} alt={s.name} className="w-full h-full object-cover transition-transform duration-400 group-hover:scale-105" loading="lazy"/>
                  </div>
                  <div className="mt-2 text-center">
                    <div className="text-xs font-semibold truncate" style={{ color:C.white }}>{s.name}</div>
                    <div className="text-[10px] truncate" style={{ color:"rgba(255,255,255,0.4)" }}>{s.role}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-24 px-6" style={{ background:C.cream }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <SectionHeader label="Client Stories" title={"Real Results.\nReal Love."} />
          </div>
          <div className="relative rounded-3xl overflow-hidden border p-10" style={{ background:C.white, borderColor:C.border }}>
            {/* Decorative quote — KEEP as luxury design element */}
            <svg className="absolute top-6 left-6 opacity-[0.06]" width="100" height="75" viewBox="0 0 100 75" aria-hidden>
              <path d="M0,0 L38,0 L26,37 L38,37 L38,75 L0,75 Z M62,0 L100,0 L88,37 L100,37 L100,75 L62,75 Z" fill={C.dark}/>
            </svg>
            <div className="relative z-10">
              <StarRow n={TESTIMONIALS[tIdx].stars} size={16}/>
              <p className="text-xl md:text-2xl leading-relaxed my-6 italic font-medium" style={{ fontFamily:"Georgia,serif", color:C.dark }}>
                "{TESTIMONIALS[tIdx].text}"
              </p>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2" style={{ borderColor:C.goldBrt }}>
                    <img src={`https://images.unsplash.com/photo-${TESTIMONIALS[tIdx].img}?auto=format&fit=crop&w=96&h=96&q=80`} alt={TESTIMONIALS[tIdx].name} className="w-full h-full object-cover"/>
                  </div>
                  <div>
                    <div className="font-bold text-sm" style={{ color:C.dark }}>{TESTIMONIALS[tIdx].name}</div>
                    <div className="text-xs flex items-center gap-1" style={{ color:C.muted }}><MapPin size={9}/>{TESTIMONIALS[tIdx].loc}</div>
                  </div>
                </div>
                <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background:C.roseL, color:C.roseMid }}>{TESTIMONIALS[tIdx].job}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-5">
            <div className="flex gap-2">
              {TESTIMONIALS.map((_,i) => (
                <button key={i} onClick={() => setTIdx(i)} className="rounded-full transition-all duration-200 cursor-pointer" style={{ width: i === tIdx ? 24 : 8, height:8, background: i === tIdx ? C.roseMid : C.border }}/>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setTIdx(i => (i-1+TESTIMONIALS.length)%TESTIMONIALS.length)} className="w-10 h-10 rounded-full border flex items-center justify-center cursor-pointer hover:border-stone-400 transition-colors" style={{ borderColor:C.border }}><ChevronLeft size={16} style={{ color:C.muted }}/></button>
              <button onClick={() => setTIdx(i => (i+1)%TESTIMONIALS.length)} className="w-10 h-10 rounded-full border flex items-center justify-center cursor-pointer hover:border-stone-400 transition-colors" style={{ borderColor:C.border }}><ChevronRight size={16} style={{ color:C.muted }}/></button>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="py-16 px-6 text-center" style={{ background:`linear-gradient(135deg, ${C.roseMid} 0%, #9D174D 100%)` }}>
        <h2 className="text-3xl font-bold mb-3" style={{ fontFamily:"Georgia,serif", color:C.white }}>Ready for Your Transformation?</h2>
        <p className="mb-8 text-base" style={{ color:"rgba(255,255,255,0.7)" }}>Book a free consultation today. No obligation, just great advice.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={() => nav("book")} className="flex items-center justify-center gap-2 text-sm font-semibold px-8 py-4 rounded-full cursor-pointer transition-all hover:opacity-90 text-white" style={{ background:C.goldBrt }}>
            <Calendar size={16}/> Book Appointment
          </button>
          <a href={`tel:${PHONE}`} className="flex items-center justify-center gap-2 text-sm font-semibold px-8 py-4 rounded-full cursor-pointer border transition-colors hover:border-white/70 text-white" style={{ borderColor:"rgba(255,255,255,0.35)" }}>
            <Phone size={16}/>{PHONE}
          </a>
        </div>
      </section>
    </div>
  );
}

// ── PAGE: SERVICES ─────────────────────────────────────────────────────────────
function ServicesPage({ nav }: { nav: (p: Page, extras?: Record<string,string>) => void }) {
  return (
    <div>
      <div className="py-20 px-6 border-b" style={{ background:C.dark, borderColor:"rgba(255,255,255,0.08)" }}>
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-10" style={{ background:C.goldBrt }}/>
            <span className="text-xs tracking-widest uppercase font-medium" style={{ color:C.goldBrt }}>What We Offer</span>
            <div className="h-px w-10" style={{ background:C.goldBrt }}/>
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-4 text-white" style={{ fontFamily:"Georgia,serif" }}>Our Services.</h1>
          <p style={{ color:"rgba(255,255,255,0.5)" }}>Premium beauty services, each tailored to your unique style and goals.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16">
        {["Hair","Color","Treat","Beauty"].map(cat => {
          const svcs = SERVICES.filter(s => s.cat === cat);
          const catNames: Record<string,string> = { Hair:"Hair Services", Color:"Color Services", Treat:"Treatments", Beauty:"Beauty & Makeup" };
          return (
            <div key={cat} className="mb-16">
              <div className="flex items-center gap-3 mb-7">
                <h3 className="text-xl font-bold" style={{ fontFamily:"Georgia,serif", color:C.dark }}>{catNames[cat]}</h3>
                <div className="flex-1 h-px" style={{ background:C.border }}/>
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                {svcs.map(svc => {
                  const specs = SPECIALISTS.filter(s => s.services.includes(svc.id));
                  return (
                    <div key={svc.id} className="flex gap-5 rounded-2xl border overflow-hidden transition-shadow duration-200 hover:shadow-lg" style={{ background:C.white, borderColor:C.border }}>
                      <div className="w-32 sm:w-40 shrink-0">
                        <img src={`https://images.unsplash.com/photo-${svc.photo}?auto=format&fit=crop&w=240&q=80`} alt={svc.name} className="w-full h-full object-cover" loading="lazy"/>
                      </div>
                      <div className="flex flex-col py-5 pr-5 gap-3 flex-1">
                        <div>
                          <div className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color:C.goldBrt }}>{svc.cat}</div>
                          <div className="font-bold text-lg leading-tight" style={{ fontFamily:"Georgia,serif", color:C.dark }}>{svc.name}</div>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color:C.muted }}>{svc.desc}</p>
                        <div className="flex items-center gap-4 text-xs" style={{ color:C.muted }}>
                          <span className="flex items-center gap-1"><Clock size={12}/>{svc.dur}</span>
                          <span className="font-bold" style={{ color:C.roseMid }}>From {svc.from}</span>
                        </div>
                        {/* Specialists who can do this service */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] uppercase tracking-wider" style={{ color:C.muted }}>With:</span>
                          {specs.map(s => (
                            <button key={s.id} onClick={() => nav("book", {service:svc.id, specialist:s.id})} className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full cursor-pointer transition-colors" style={{ background:C.roseL, color:C.roseMid }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = C.roseMid; (e.currentTarget as HTMLButtonElement).style.color = "white"; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = C.roseL; (e.currentTarget as HTMLButtonElement).style.color = C.roseMid; }}
                            >
                              {s.name}
                            </button>
                          ))}
                        </div>
                        <button onClick={() => nav("book", {service:svc.id})} className="self-start flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full cursor-pointer transition-all hover:opacity-90" style={{ background:C.roseMid, color:"white" }}>
                          <Calendar size={12}/> Book Now
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* FAQ */}
      <div className="border-t px-6 py-16" style={{ borderColor:C.border, background:C.cream }}>
        <div className="max-w-3xl mx-auto">
          <SectionHeader label="Questions" title="Frequently Asked." />
          <div>{FAQS.map(f => <FaqItem key={f.q} {...f}/>)}</div>
        </div>
      </div>
    </div>
  );
}

// ── PAGE: TEAM ─────────────────────────────────────────────────────────────────
function TeamPage({ nav }: { nav: (p: Page, extras?: Record<string,string>) => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = SPECIALISTS.find(s => s.id === selectedId);
  return (
    <div>
      <div className="py-20 px-6 border-b" style={{ background:C.dark, borderColor:"rgba(255,255,255,0.08)" }}>
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-10" style={{ background:C.goldBrt }}/>
            <span className="text-xs tracking-widest uppercase font-medium" style={{ color:C.goldBrt }}>The Team</span>
            <div className="h-px w-10" style={{ background:C.goldBrt }}/>
          </div>
          <h1 className="text-5xl font-bold text-white mb-4" style={{ fontFamily:"Georgia,serif" }}>Meet Our Artists.</h1>
          <p style={{ color:"rgba(255,255,255,0.5)" }}>Click any specialist to learn more and book directly with them.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {SPECIALISTS.map(s => (
            <button key={s.id} onClick={() => setSelectedId(selectedId === s.id ? null : s.id)}
              className="group text-left rounded-2xl border overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-xl"
              style={{ borderColor: selectedId === s.id ? C.roseMid : C.border, background:C.white }}>
              <div className="aspect-[4/3] overflow-hidden relative">
                <img src={`https://images.unsplash.com/photo-${s.photo}?auto=format&fit=crop&w=480&q=80`} alt={s.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy"/>
                <div className="absolute inset-0" style={{ background:"linear-gradient(to top, rgba(28,25,23,0.7) 0%, transparent 50%)" }}/>
                <div className="absolute bottom-3 left-3">
                  <StarRow n={5} size={11}/>
                  <div className="text-white text-[10px] mt-0.5">{s.rating} · {s.reviews} reviews</div>
                </div>
              </div>
              <div className="p-4">
                <div className="font-bold text-base mb-0.5" style={{ fontFamily:"Georgia,serif", color:C.dark }}>{s.name}</div>
                <div className="text-xs font-medium mb-2" style={{ color:C.goldBrt }}>{s.role}</div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {s.langs.map(l => (
                    <span key={l} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background:C.goldL, color:C.gold }}>{l}</span>
                  ))}
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background:C.roseL, color:C.roseMid }}>{s.exp}</span>
                </div>
                {selectedId === s.id && selected && (
                  <div className="mt-2 pt-3 border-t" style={{ borderColor:C.border }}>
                    <p className="text-xs leading-relaxed mb-3" style={{ color:C.muted }}>{s.bio}</p>
                    <div className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color:C.muted }}>Specialties:</div>
                    <div className="flex flex-wrap gap-1 mb-4">
                      {s.services.map(sid => {
                        const svc = SERVICES.find(sv => sv.id === sid);
                        return svc ? <span key={sid} className="text-[10px] px-2 py-0.5 rounded-full border" style={{ borderColor:C.border, color:C.muted }}>{svc.name}</span> : null;
                      })}
                    </div>
                    <button onClick={e => { e.stopPropagation(); nav("book", {specialist: s.id}); }} className="w-full flex items-center justify-center gap-2 text-white text-xs font-semibold py-2.5 rounded-xl cursor-pointer transition-all hover:opacity-90" style={{ background:C.roseMid }}>
                      <Calendar size={13}/> Book with {s.name.split(" ")[0]}
                    </button>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── PAGE: GALLERY ──────────────────────────────────────────────────────────────
function GalleryPage({ nav }: { nav: (p: Page) => void }) {
  const [filter, setFilter] = useState<GalFilter>("All");
  const filtered = filter === "All" ? GALLERY : GALLERY.filter(g => g.cat === filter);
  return (
    <div>
      <div className="py-20 px-6 border-b" style={{ background:C.dark, borderColor:"rgba(255,255,255,0.08)" }}>
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-10" style={{ background:C.goldBrt }}/>
            <span className="text-xs tracking-widest uppercase font-medium" style={{ color:C.goldBrt }}>Portfolio</span>
            <div className="h-px w-10" style={{ background:C.goldBrt }}/>
          </div>
          <h1 className="text-5xl font-bold text-white mb-4" style={{ fontFamily:"Georgia,serif" }}>Our Work.</h1>
          <p style={{ color:"rgba(255,255,255,0.5)" }}>Every look is a collaboration between client and artist.</p>
        </div>
      </div>

      {/* Filter */}
      <div className="sticky top-16 z-30 px-6 py-4 border-b" style={{ background:"rgba(250,250,249,0.97)", borderColor:C.border, backdropFilter:"blur(8px)" }}>
        <div className="max-w-7xl mx-auto flex gap-2 overflow-x-auto">
          {GAL_FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} className="shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 cursor-pointer" style={{
              background: filter === f ? C.dark : "transparent",
              color:       filter === f ? C.white : C.muted,
              border:      filter === f ? "none" : `1px solid ${C.border}`,
            }}>
              {f}
            </button>
          ))}
          <span className="ml-auto shrink-0 flex items-center text-xs" style={{ color:C.muted }}>{filtered.length} photos</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((g, i) => (
            <div key={g.id} className={`group relative rounded-2xl overflow-hidden border cursor-pointer transition-all duration-200 hover:shadow-xl ${i % 5 === 0 ? "sm:col-span-2 aspect-[16/7]" : "aspect-square"}`} style={{ borderColor:C.border }}>
              <img src={`https://images.unsplash.com/photo-${g.photo}?auto=format&fit=crop&w=800&q=80`} alt={g.label} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy"/>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200"/>
              <div className="absolute top-3 left-3">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full text-white" style={{ background:"rgba(28,25,23,0.7)" }}>{g.cat}</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200">
                <div className="font-bold text-base text-white">{g.label}</div>
                <div className="text-xs text-white/60 mt-0.5">by {g.spec}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <button onClick={() => nav("book")} className="inline-flex items-center gap-2 text-white font-semibold px-8 py-4 rounded-full cursor-pointer transition-all hover:opacity-90" style={{ background:C.roseMid }}>
            <Calendar size={17}/> Book Your Appointment
          </button>
        </div>
      </div>
    </div>
  );
}

// ── BOOKING PAGE ──────────────────────────────────────────────────────────────
type BookStep = "service" | "specialist" | "date" | "time" | "info" | "done";

function BookPage({ initService = "", initSpecialist = "" }: { initService?: string; initSpecialist?: string }) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);

  const [step, setStep]          = useState<BookStep>(initSpecialist ? "date" : initService ? "specialist" : "service");
  const [selService, setSelSvc]  = useState(initService);
  const [selSpec, setSelSpec]    = useState(initSpecialist);
  const [monthOff, setMonthOff]  = useState(0);
  const [selDate, setSelDate]    = useState<Date | null>(null);
  const [selTime, setSelTime]    = useState("");
  const [form, setForm]          = useState({ name:"", phone:"", email:"", notes:"" });

  const svc  = SERVICES.find(s => s.id === selService);
  const spec = SPECIALISTS.find(s => s.id === selSpec);

  // Available specialists for selected service
  const availSpecs = useMemo(() =>
    selService ? SPECIALISTS.filter(s => s.services.includes(selService)) : SPECIALISTS,
    [selService]);

  // Calendar for selected specialist
  const viewMonth = useMemo(() => new Date(today.getFullYear(), today.getMonth() + monthOff, 1), [today, monthOff]);

  const bookedSet = useMemo(() => {
    const s = new Set<string>();
    if (spec) {
      spec.bookedOffsets.forEach(n => {
        const d = new Date(today); d.setDate(today.getDate() + n);
        s.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
      });
    }
    return s;
  }, [spec, today]);

  const dk       = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const workDays = spec?.workDays ?? [1,2,3,4,5,6];
  const isWork   = (d: Date) => workDays.includes(d.getDay());
  const isPast   = (d: Date) => d < today;
  const isBooked = (d: Date) => bookedSet.has(dk(d));
  const isTooFar = (d: Date) => d > new Date(today.getFullYear(), today.getMonth() + 2, today.getDate());
  const isAvail  = (d: Date) => isWork(d) && !isPast(d) && !isBooked(d) && !isTooFar(d);
  const isSel    = (d: Date) => !!selDate && dk(d) === dk(selDate);
  const isToday  = (d: Date) => dk(d) === dk(today);

  const calDays = useMemo(() => {
    const y = viewMonth.getFullYear(), m = viewMonth.getMonth();
    const first = new Date(y, m, 1).getDay();
    const total = new Date(y, m+1, 0).getDate();
    const arr: (Date|null)[] = Array(first).fill(null);
    for (let i = 1; i <= total; i++) arr.push(new Date(y, m, i));
    return arr;
  }, [viewMonth]);

  const timeSlots = svc ? getTimeSlots(svc.durMin) : [];
  const fmtDate = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

  const STEP_LIST: BookStep[] = ["service","specialist","date","time","info","done"];
  const stepIdx = STEP_LIST.indexOf(step);

  function selectDate(d: Date) {
    if (!isAvail(d)) return;
    setSelDate(d); setSelTime(""); setStep("time");
  }

  function handleSubmit(e: React.FormEvent) { e.preventDefault(); setStep("done"); }

  return (
    <div>
      <div className="py-16 px-6 border-b" style={{ background:C.dark, borderColor:"rgba(255,255,255,0.08)" }}>
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-10" style={{ background:C.goldBrt }}/>
            <span className="text-xs tracking-widest uppercase font-medium" style={{ color:C.goldBrt }}>Appointments</span>
            <div className="h-px w-10" style={{ background:C.goldBrt }}/>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3" style={{ fontFamily:"Georgia,serif" }}>Book Your Appointment.</h1>
          <p style={{ color:"rgba(255,255,255,0.5)" }}>Free consultation included. Confirmed within 1 hour.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-14">
        {/* Progress */}
        {step !== "done" && (
          <div className="flex items-center gap-2 mb-10">
            {(["service","specialist","date","time","info"] as BookStep[]).map((s, i) => {
              const labels = ["Service","Specialist","Date","Time","Info"];
              const past = stepIdx > i;
              const active = stepIdx === i;
              return (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                      style={{ background: past || active ? C.roseMid : C.border, color: past || active ? "white" : C.muted }}>
                      {past ? <Check size={13}/> : i + 1}
                    </div>
                    <span className="text-[10px] font-medium hidden sm:block" style={{ color: active ? C.roseMid : C.muted }}>{labels[i]}</span>
                  </div>
                  {i < 4 && <div className="flex-1 h-0.5 rounded-full transition-all duration-300 mb-3.5" style={{ background: past ? C.roseMid : C.border }}/>}
                </div>
              );
            })}
          </div>
        )}

        <div className="rounded-3xl border overflow-hidden" style={{ background:C.white, borderColor:C.border }}>

          {/* STEP: SERVICE */}
          {step === "service" && (
            <div className="p-7">
              <h2 className="text-xl font-bold mb-6" style={{ fontFamily:"Georgia,serif", color:C.dark }}>Which service?</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {SERVICES.map(s => {
                  const sel = selService === s.id;
                  return (
                    <button key={s.id} onClick={() => setSelSvc(s.id)}
                      className="flex items-start gap-3.5 p-4 rounded-2xl border-2 text-left cursor-pointer transition-all duration-150"
                      style={{ borderColor: sel ? C.roseMid : C.border, background: sel ? C.roseL : C.white }}>
                      <div className="flex-1">
                        <div className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: sel ? C.roseMid : C.goldBrt }}>{s.cat}</div>
                        <div className="font-semibold text-sm" style={{ color:C.dark }}>{s.name}</div>
                        <div className="flex items-center gap-3 mt-1 text-xs" style={{ color:C.muted }}>
                          <span>{s.dur}</span>
                          <span className="font-semibold" style={{ color: sel ? C.roseMid : C.muted }}>From {s.from}</span>
                        </div>
                      </div>
                      {sel && <Check size={16} style={{ color:C.roseMid }} className="shrink-0 mt-0.5"/>}
                    </button>
                  );
                })}
              </div>
              <button disabled={!selService} onClick={() => setStep("specialist")}
                className="mt-6 w-full py-4 rounded-2xl font-semibold text-white text-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background:C.roseMid }}>
                Continue →
              </button>
            </div>
          )}

          {/* STEP: SPECIALIST */}
          {step === "specialist" && (
            <div className="p-7">
              <button onClick={() => setStep("service")} className="text-xs cursor-pointer flex items-center gap-1 mb-5 transition-colors" style={{ color:C.muted }}>
                <ChevronLeft size={13}/> Back
              </button>
              <div className="flex items-center gap-2 mb-6">
                <h2 className="text-xl font-bold" style={{ fontFamily:"Georgia,serif", color:C.dark }}>Choose your specialist</h2>
                {svc && <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background:C.roseL, color:C.roseMid }}>{svc.name}</span>}
              </div>
              {availSpecs.length === 0 ? (
                <p className="text-sm" style={{ color:C.muted }}>No specialists available for this service. Please call us.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {availSpecs.map(s => {
                    const sel = selSpec === s.id;
                    const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
                    return (
                      <button key={s.id} onClick={() => setSelSpec(s.id)}
                        className="flex items-center gap-4 p-4 rounded-2xl border-2 text-left cursor-pointer transition-all duration-150"
                        style={{ borderColor: sel ? C.roseMid : C.border, background: sel ? C.roseL : C.white }}>
                        <div className="w-14 h-14 rounded-full overflow-hidden border-2 shrink-0" style={{ borderColor: sel ? C.roseMid : C.border }}>
                          <img src={`https://images.unsplash.com/photo-${s.photo}?auto=format&fit=crop&w=112&h=112&q=80`} alt={s.name} className="w-full h-full object-cover"/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-base" style={{ color:C.dark }}>{s.name}</div>
                          <div className="text-xs font-medium" style={{ color:C.goldBrt }}>{s.role}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <StarRow n={5} size={10}/>
                            <span className="text-xs" style={{ color:C.muted }}>{s.rating} · {s.reviews} reviews</span>
                          </div>
                          <div className="text-[10px] mt-1.5 flex flex-wrap gap-1">
                            {s.workDays.map(d => (
                              <span key={d} className="px-1.5 py-0.5 rounded" style={{ background:sel ? C.roseMid+"25" : C.goldL, color:sel ? C.roseMid : C.gold }}>{dayNames[d]}</span>
                            ))}
                          </div>
                        </div>
                        {sel && <Check size={18} style={{ color:C.roseMid }} className="shrink-0"/>}
                      </button>
                    );
                  })}
                </div>
              )}
              <button disabled={!selSpec} onClick={() => setStep("date")}
                className="mt-6 w-full py-4 rounded-2xl font-semibold text-white text-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background:C.roseMid }}>
                Continue →
              </button>
            </div>
          )}

          {/* STEP: DATE */}
          {step === "date" && spec && (
            <div className="p-7">
              <button onClick={() => setStep("specialist")} className="text-xs cursor-pointer flex items-center gap-1 mb-5 transition-colors" style={{ color:C.muted }}>
                <ChevronLeft size={13}/> Back
              </button>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 shrink-0" style={{ borderColor:C.roseMid }}>
                  <img src={`https://images.unsplash.com/photo-${spec.photo}?auto=format&fit=crop&w=80&h=80&q=80`} alt={spec.name} className="w-full h-full object-cover"/>
                </div>
                <div>
                  <h2 className="text-base font-bold" style={{ fontFamily:"Georgia,serif", color:C.dark }}>With {spec.name}</h2>
                  <div className="text-xs" style={{ color:C.muted }}>Select an available date</div>
                </div>
              </div>
              {/* Month nav */}
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setMonthOff(o => Math.max(0, o-1))} disabled={monthOff===0}
                  className="w-9 h-9 rounded-xl border flex items-center justify-center cursor-pointer hover:bg-stone-50 disabled:opacity-30 transition-colors"
                  style={{ borderColor:C.border }}>
                  <ChevronLeft size={16} className="text-stone-400"/>
                </button>
                <span className="font-bold text-sm" style={{ color:C.dark }}>{MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}</span>
                <button onClick={() => setMonthOff(o => Math.min(2, o+1))} disabled={monthOff===2}
                  className="w-9 h-9 rounded-xl border flex items-center justify-center cursor-pointer hover:bg-stone-50 disabled:opacity-30 transition-colors"
                  style={{ borderColor:C.border }}>
                  <ChevronRight size={16} className="text-stone-400"/>
                </button>
              </div>
              <div className="grid grid-cols-7 mb-1">
                {DAY_LABELS.map(d => <div key={d} className="text-center py-2 text-xs font-bold text-stone-400">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calDays.map((d, i) => {
                  if (!d) return <div key={`e${i}`}/>;
                  const avail = isAvail(d);
                  const sel   = isSel(d);
                  const tod   = isToday(d);
                  return (
                    <button key={dk(d)} disabled={!avail} onClick={() => selectDate(d)}
                      className="relative h-10 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer disabled:cursor-not-allowed"
                      style={{
                        background: sel ? C.roseMid : "transparent",
                        color: sel ? "white" : !avail ? "#D6D3D1" : tod ? C.roseMid : C.text,
                        border: tod && !sel ? `1.5px solid ${C.roseMid}` : "none",
                        fontWeight: tod ? 700 : 500,
                      }}
                      onMouseEnter={e => { if (avail && !sel) (e.currentTarget as HTMLButtonElement).style.background = C.roseL; }}
                      onMouseLeave={e => { if (avail && !sel) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>
              {/* Legend */}
              <div className="mt-4 flex flex-wrap gap-4 text-xs" style={{ color:C.muted }}>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ background:C.roseMid }}/> Available</div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border" style={{ borderColor:C.roseMid }}/> Today</div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-stone-200"/> Unavailable</div>
              </div>
              <div className="mt-4 rounded-xl p-3 text-xs" style={{ background:C.goldL, color:C.gold }}>
                <span className="font-semibold">{spec.name}</span> is available: {spec.workDays.map(d => ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d]).join(", ")}
              </div>
            </div>
          )}

          {/* STEP: TIME */}
          {step === "time" && selDate && spec && svc && (
            <div className="p-7">
              <button onClick={() => setStep("date")} className="text-xs cursor-pointer flex items-center gap-1 mb-5 transition-colors" style={{ color:C.muted }}>
                <ChevronLeft size={13}/> Back
              </button>
              <h2 className="text-xl font-bold mb-1" style={{ fontFamily:"Georgia,serif", color:C.dark }}>Select a time.</h2>
              <p className="text-sm mb-6" style={{ color:C.muted }}>{fmtDate(selDate)} · {svc.name} ({svc.dur})</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {timeSlots.map(t => (
                  <button key={t} onClick={() => setSelTime(t)}
                    className="py-3 rounded-xl border-2 text-sm font-medium transition-all duration-150 cursor-pointer"
                    style={{ borderColor: selTime===t ? C.roseMid : C.border, background: selTime===t ? C.roseL : C.white, color: selTime===t ? C.roseMid : C.text }}>
                    {t}
                  </button>
                ))}
              </div>
              <button disabled={!selTime} onClick={() => setStep("info")}
                className="mt-6 w-full py-4 rounded-2xl font-semibold text-white text-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background:C.roseMid }}>
                Continue →
              </button>
            </div>
          )}

          {/* STEP: INFO */}
          {step === "info" && (
            <div className="p-7">
              <button onClick={() => setStep("time")} className="text-xs cursor-pointer flex items-center gap-1 mb-5 transition-colors" style={{ color:C.muted }}>
                <ChevronLeft size={13}/> Back
              </button>
              {/* Summary */}
              <div className="rounded-2xl p-4 mb-6 flex flex-wrap gap-2" style={{ background:C.roseL, border:`1px solid ${C.roseMid}25` }}>
                {[svc?.name, spec?.name, selDate && fmtDate(selDate), selTime].filter(Boolean).map(v => (
                  <span key={v as string} className="text-xs font-semibold px-2.5 py-1 rounded-full text-white" style={{ background:C.roseMid }}>{v}</span>
                ))}
              </div>
              <h2 className="text-xl font-bold mb-6" style={{ fontFamily:"Georgia,serif", color:C.dark }}>Your details.</h2>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  {[["Full Name","text","Amanda Martinez","name"],["Phone","tel","(305) 000-0000","phone"]].map(([l,t,p,k]) => (
                    <div key={k}>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color:C.muted }}>{l}</label>
                      <input required type={t} placeholder={p} value={form[k as keyof typeof form]} onChange={e => setForm({...form,[k]:e.target.value})}
                        className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors" style={{ borderColor:C.border, color:C.text }}
                        onFocus={e => e.target.style.borderColor = C.roseMid}
                        onBlur={e => e.target.style.borderColor = C.border}
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color:C.muted }}>Email</label>
                  <input type="email" placeholder="you@email.com" value={form.email} onChange={e => setForm({...form,email:e.target.value})}
                    className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors" style={{ borderColor:C.border, color:C.text }}
                    onFocus={e => e.target.style.borderColor = C.roseMid}
                    onBlur={e => e.target.style.borderColor = C.border}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color:C.muted }}>Special Requests (optional)</label>
                  <textarea rows={3} placeholder="Hair goals, inspiration photos, allergies…" value={form.notes} onChange={e => setForm({...form,notes:e.target.value})}
                    className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors resize-none" style={{ borderColor:C.border, color:C.text }}
                    onFocus={e => e.target.style.borderColor = C.roseMid}
                    onBlur={e => e.target.style.borderColor = C.border}
                  />
                </div>
                <button type="submit" className="w-full py-4 rounded-2xl font-semibold text-white text-sm transition-all cursor-pointer hover:opacity-90" style={{ background:C.roseMid }}>
                  <Calendar size={15} className="inline mr-2 -mt-0.5"/> Confirm Appointment
                </button>
              </form>
            </div>
          )}

          {/* STEP: DONE */}
          {step === "done" && (
            <div className="p-10 text-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background:C.roseL }}>
                <Sparkles size={32} style={{ color:C.roseMid }}/>
              </div>
              <h2 className="text-2xl font-bold mb-2" style={{ fontFamily:"Georgia,serif", color:C.dark }}>See you soon!</h2>
              <p className="text-sm mb-8" style={{ color:C.muted }}>
                Your appointment is confirmed. We'll text you within 1 hour.<br/>
                <span className="font-semibold" style={{ color:C.dark }}>{svc?.name}</span> with <span className="font-semibold" style={{ color:C.dark }}>{spec?.name}</span>
                {selDate && ` · ${fmtDate(selDate)}`} {selTime && `at ${selTime}`}
              </p>
              <div className="rounded-2xl p-5 text-left mb-6" style={{ background:C.roseL }}>
                {["Confirmation text within 1 hour","15-min free consultation included","Bring inspiration photos — we love those!","Free cancellation up to 24h before"].map(item => (
                  <div key={item} className="flex items-center gap-2.5 py-2 text-sm" style={{ color:C.dark }}>
                    <Check size={13} style={{ color:C.roseMid }} className="shrink-0"/>{item}
                  </div>
                ))}
              </div>
              <a href={`tel:${PHONE}`} className="text-sm font-medium cursor-pointer" style={{ color:C.roseMid }}>Questions? {PHONE}</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function LunaBeauty() {
  const [page, setPage]       = useState<Page>("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [bookExtras, setBookExtras] = useState<Record<string,string>>({});

  function nav(p: Page, extras?: Record<string,string>) {
    setPage(p);
    setBookExtras(extras ?? {});
    setMenuOpen(false);
    window.scrollTo({ top:0, behavior:"smooth" });
  }

  const NAV: { label:string; page:Page }[] = [
    { label:"Home",     page:"home"     },
    { label:"Services", page:"services" },
    { label:"Team",     page:"team"     },
    { label:"Gallery",  page:"gallery"  },
  ];

  return (
    <div className="font-sans overflow-x-hidden" style={{ background:C.cream, color:C.text }}>
      {/* ── TOP STRIP ── */}
      <div className="hidden md:flex items-center justify-between px-8 py-2 text-xs border-b" style={{ background:C.goldL, borderColor:"#FDE68A", color:C.gold }}>
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-1.5"><Clock size={11}/> Tue–Sat: 9:00 AM – 7:00 PM</span>
          <span className="flex items-center gap-1.5"><MapPin size={11}/> Miami, Florida</span>
        </div>
        <div className="flex items-center gap-6">
          <a href={`tel:${PHONE}`} className="flex items-center gap-1.5 cursor-pointer hover:underline"><Phone size={11}/>{PHONE}</a>
          <a href={`mailto:${EMAIL}`} className="flex items-center gap-1.5 cursor-pointer hover:underline"><Mail size={11}/>{EMAIL}</a>
        </div>
      </div>

      {/* ── NAVBAR — CENTERED LOGO ── */}
      <nav className="sticky top-0 z-50 border-b" style={{ background:"rgba(250,250,249,0.97)", borderColor:C.border, backdropFilter:"blur(12px)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Left links */}
          <div className="hidden lg:flex items-center gap-1 flex-1">
            {NAV.slice(0,2).map(({ label, page:p }) => (
              <button key={p} onClick={() => nav(p)}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer"
                style={{ color: page === p ? C.roseMid : C.muted, background: page === p ? C.roseL : "transparent" }}>
                {label}
              </button>
            ))}
          </div>
          {/* Center logo */}
          <button onClick={() => nav("home")} className="cursor-pointer mx-auto lg:mx-0">
            <LunaLogo />
          </button>
          {/* Right links */}
          <div className="hidden lg:flex items-center gap-1 flex-1 justify-end">
            {NAV.slice(2).map(({ label, page:p }) => (
              <button key={p} onClick={() => nav(p)}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer"
                style={{ color: page === p ? C.roseMid : C.muted, background: page === p ? C.roseL : "transparent" }}>
                {label}
              </button>
            ))}
            <button onClick={() => nav("book")} className="ml-2 flex items-center gap-1.5 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-all cursor-pointer hover:opacity-90" style={{ background:C.roseMid }}>
              <Calendar size={14}/> Book Appointment
            </button>
          </div>
          {/* Mobile hamburger */}
          <button onClick={() => setMenuOpen(v => !v)} className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl cursor-pointer" style={{ background:C.cream }}>
            {menuOpen ? <X size={20} style={{ color:C.text }}/> : <Menu size={20} style={{ color:C.text }}/>}
          </button>
        </div>
        {/* Mobile menu */}
        {menuOpen && (
          <div className="lg:hidden border-t px-4 py-3 flex flex-col gap-1" style={{ background:"rgba(250,250,249,0.98)", borderColor:C.border }}>
            {[...NAV,{label:"Book Appointment",page:"book" as Page}].map(({ label, page:p }) => (
              <button key={p} onClick={() => nav(p)}
                className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium cursor-pointer transition-colors"
                style={{ color: page === p ? C.roseMid : C.text, background: page === p ? C.roseL : "transparent" }}>
                {label}
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* ── PAGES ── */}
      <div>
        {page === "home"     && <HomePage     nav={nav}/>}
        {page === "services" && <ServicesPage nav={nav}/>}
        {page === "team"     && <TeamPage     nav={nav}/>}
        {page === "gallery"  && <GalleryPage  nav={nav}/>}
        {page === "book"     && <BookPage initService={bookExtras.service ?? ""} initSpecialist={bookExtras.specialist ?? ""}/>}
      </div>

      {/* ── FOOTER ── */}
      <footer className="border-t pb-24 lg:pb-0" style={{ background:C.dark, borderColor:"rgba(255,255,255,0.08)" }}>
        <div className="max-w-7xl mx-auto px-6 py-14 grid md:grid-cols-4 gap-10 mb-10">
          <div className="md:col-span-2">
            <LunaLogo light className="mb-5"/>
            <p className="text-sm leading-relaxed mb-5 max-w-xs" style={{ color:"rgba(255,255,255,0.4)" }}>
              Miami's premier beauty studio. Haircuts, color, extensions, treatments, and bridal packages — all in one elegant space.
            </p>
            <div className="space-y-2.5 text-sm" style={{ color:"rgba(255,255,255,0.4)" }}>
              <div className="flex items-center gap-2"><Phone size={13} style={{ color:C.goldBrt }}/><a href={`tel:${PHONE}`} className="hover:text-white cursor-pointer transition-colors">{PHONE}</a></div>
              <div className="flex items-center gap-2"><Mail size={13} style={{ color:C.goldBrt }}/><a href={`mailto:${EMAIL}`} className="hover:text-white cursor-pointer transition-colors">{EMAIL}</a></div>
              <div className="flex items-center gap-2"><Clock size={13} style={{ color:C.goldBrt }}/><span>Tue–Sat: 9:00 AM – 7:00 PM</span></div>
              <div className="flex items-center gap-2"><MapPin size={13} style={{ color:C.goldBrt }}/><span>Miami, Florida</span></div>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-xs uppercase tracking-widest mb-4" style={{ color:"rgba(255,255,255,0.3)" }}>Services</h4>
            <ul className="space-y-2.5 text-sm" style={{ color:"rgba(255,255,255,0.4)" }}>
              {SERVICES.map(s => (
                <li key={s.id}><button onClick={() => nav("services")} className="hover:text-white cursor-pointer transition-colors text-left">{s.name}</button></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-xs uppercase tracking-widest mb-4" style={{ color:"rgba(255,255,255,0.3)" }}>Studio</h4>
            <ul className="space-y-2.5 text-sm mb-6" style={{ color:"rgba(255,255,255,0.4)" }}>
              {NAV.map(({ label, page:p }) => (
                <li key={p}><button onClick={() => nav(p)} className="hover:text-white cursor-pointer transition-colors">{label}</button></li>
              ))}
              <li><button onClick={() => nav("book")} className="hover:text-white cursor-pointer transition-colors">Book Appointment</button></li>
            </ul>
            <div className="flex flex-col gap-2">
              {["Free Consultation","Certified Stylists","Premium Products"].map(b => (
                <div key={b} className="flex items-center gap-2 text-xs" style={{ color:"rgba(255,255,255,0.3)" }}>
                  <Sparkles size={10} style={{ color:C.goldBrt }}/>{b}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 pb-8 border-t flex flex-col sm:flex-row items-center justify-between gap-3 pt-8" style={{ borderColor:"rgba(255,255,255,0.08)" }}>
          <div className="text-xs" style={{ color:"rgba(255,255,255,0.25)" }}>© 2024 Luna Beauty Studio LLC · Miami, Florida</div>
          <div className="text-xs" style={{ color:"rgba(255,255,255,0.25)" }}>Built by <span className="font-semibold" style={{ color:"rgba(255,255,255,0.4)" }}>Acrosoft Labs</span></div>
        </div>
      </footer>

      {/* ── MOBILE STICKY ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t px-4 py-3 flex gap-3" style={{ background:"rgba(250,250,249,0.98)", borderColor:C.border, backdropFilter:"blur(8px)" }}>
        <button onClick={() => nav("book")} className="flex-1 flex items-center justify-center gap-2 text-white font-semibold py-3.5 rounded-2xl text-sm cursor-pointer hover:opacity-90" style={{ background:C.roseMid }}>
          <Calendar size={16}/> Book Appointment
        </button>
        <a href={`tel:${PHONE}`} className="flex-1 flex items-center justify-center gap-2 font-semibold py-3.5 rounded-2xl text-sm border cursor-pointer" style={{ borderColor:C.border, color:C.text }}>
          <Phone size={15}/> Call Us
        </a>
      </div>
    </div>
  );
}
