import { useState, useEffect, useRef } from "react";
import { Check, Star, AlertTriangle, ChevronRight, Eye, Calendar } from "lucide-react";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const WA_LINK = "https://chat.whatsapp.com/E6TRKY81nbk0ipYxgV3r0P?s=cl&p=i&ilr=1&amv=2";
const EVENT_DATE = new Date("2026-08-02T22:00:00.000Z");
const TOTAL_SPOTS = 100;
const TAKEN_SPOTS = 78;

// Palette: #1B3A2D (forest green) · #F97316 (orange) · #FDF8F3 (cream)

// ── HOOKS ────────────────────────────────────────────────────────────────────
function useCountdown() {
  const calc = () => {
    const diff = EVENT_DATE.getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, over: true };
    return {
      days:    Math.floor(diff / 86400000),
      hours:   Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
      over: false,
    };
  };
  const [t, setT] = useState(calc);
  useEffect(() => { const id = setInterval(() => setT(calc()), 1000); return () => clearInterval(id); }, []);
  return t;
}

function useFakeViewers(base: number) {
  const [n, setN] = useState(base);
  useEffect(() => {
    const id = setInterval(() => {
      setN(p => Math.max(base - 10, Math.min(base + 18, p + Math.floor(Math.random() * 7) - 3)));
    }, 3500);
    return () => clearInterval(id);
  }, [base]);
  return n;
}

// ── META LOGO ─────────────────────────────────────────────────────────────────
function MetaLogo({ className = "" }: { className?: string }) {
  return (
    <img
      src="https://asset.brandfetch.io/idWvz5T3V7/idqXDhX7JG.png"
      alt="Meta"
      className={className}
    />
  );
}

// ── COUNTDOWN BOX ─────────────────────────────────────────────────────────────
function CountBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-[#1B3A2D] rounded-xl w-[60px] h-[60px] flex items-center justify-center">
        <span className="text-white font-black text-[1.75rem] tabular-nums leading-none"
          style={{ fontFamily: "'Poppins', sans-serif" }}>
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span className="text-[9px] text-[#9CA3AF] font-bold tracking-widest uppercase mt-1.5">{label}</span>
    </div>
  );
}

// ── STAR ROW ─────────────────────────────────────────────────────────────────
function Stars({ light = false }: { light?: boolean }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={14} className={light ? "text-[#FCD34D] fill-[#FCD34D]" : "text-[#F97316] fill-[#F97316]"}/>
      ))}
    </div>
  );
}

// ── SCROLL-TO CTA BUTTON ──────────────────────────────────────────────────────
// variant="onDark"  → sección verde oscura: botón blanco con texto verde
// variant="onLight" → sección clara: botón verde con texto blanco
function SectionCTA({ formId, variant = "onLight" }: { formId: string; variant?: "onLight" | "onDark" }) {
  const scroll = () => {
    document.getElementById(formId)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const cls = variant === "onDark"
    ? "bg-white text-[#1B3A2D] hover:bg-[#F0FDF4]"
    : "bg-[#1B3A2D] text-white hover:bg-[#142D22]";
  return (
    <div className="flex justify-center mt-12">
      <button onClick={scroll}
        className={`inline-flex items-center gap-2.5 font-bold px-8 py-4 rounded-xl text-base transition-all duration-200 cursor-pointer hover:scale-[1.01] ${cls}`}
        style={{ fontFamily: "'Poppins', sans-serif" }}>
        Reservar mi cupo gratis <ChevronRight size={16}/>
      </button>
    </div>
  );
}

const WA_SVG = (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white shrink-0">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const COUNTRIES = [
  { code: "1",   flag: "🇺🇸", label: "+1"   },
  { code: "52",  flag: "🇲🇽", label: "+52"  },
  { code: "502", flag: "🇬🇹", label: "+502" },
  { code: "503", flag: "🇸🇻", label: "+503" },
  { code: "504", flag: "🇭🇳", label: "+504" },
  { code: "505", flag: "🇳🇮", label: "+505" },
  { code: "506", flag: "🇨🇷", label: "+506" },
  { code: "57",  flag: "🇨🇴", label: "+57"  },
  { code: "58",  flag: "🇻🇪", label: "+58"  },
  { code: "51",  flag: "🇵🇪", label: "+51"  },
  { code: "56",  flag: "🇨🇱", label: "+56"  },
  { code: "55",  flag: "🇧🇷", label: "+55"  },
];

// ── REG FORM ─────────────────────────────────────────────────────────────────
function RegForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) { setError("Completa tu nombre y número."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/clase-gratis-register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY },
        body: JSON.stringify({ name: name.trim(), phone: `+${countryCode}${phone.replace(/\D/g, "")}` }),
      });
      if (!res.ok) throw new Error();
      onSuccess();
    } catch {
      setError("Error al registrar. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const base = "bg-[#F9F6F2] border border-[#E5E0D8] focus:border-[#1B3A2D] rounded-lg text-[#1B3A2D] text-sm outline-none transition-colors";

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input type="text" placeholder="Tu nombre completo" value={name}
        onChange={e => setName(e.target.value)}
        className={`w-full ${base} px-4 py-3.5 placeholder-[#A89F96]`} required/>

      {/* Phone row: country selector + number */}
      <div className="flex gap-2">
        <select value={countryCode} onChange={e => setCountryCode(e.target.value)}
          className={`${base} px-2 py-3.5 shrink-0`} style={{ width: "96px" }}>
          {COUNTRIES.map(c => (
            <option key={c.code} value={c.code}>{c.flag} {c.label}</option>
          ))}
        </select>
        <input type="tel" placeholder="Número de WhatsApp" value={phone}
          onChange={e => setPhone(e.target.value)}
          className={`flex-1 ${base} px-4 py-3.5 placeholder-[#A89F96]`} required/>
      </div>

      {/* WhatsApp helper */}
      <div className="flex items-start gap-1.5">
        {WA_SVG && <span className="shrink-0 mt-0.5">{/* wa icon */}</span>}
        <p className="text-[#6B7280] text-[11px] leading-snug">
          Asegúrate que este número tenga{" "}
          <strong className="text-[#25D366]">WhatsApp</strong> — por ahí te enviaremos el acceso a la clase.
        </p>
      </div>

      {error && <p className="text-red-500 text-xs flex items-center gap-1"><AlertTriangle size={11}/>{error}</p>}

      <button type="submit" disabled={loading}
        className="w-full bg-[#F97316] hover:bg-[#EA6B00] disabled:opacity-60 text-white font-bold py-4 rounded-xl transition-all duration-200 cursor-pointer disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2.5"
        style={{ fontFamily: "'Poppins', sans-serif" }}>
        {loading
          ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" className="opacity-75"/></svg>Registrando…</>
          : <>{WA_SVG}<div className="flex flex-col items-center leading-tight"><span className="text-[0.95rem]">Quiero mi cupo gratis</span><span className="text-[11px] font-normal opacity-75">A la clase gratis en vivo</span></div></>
        }
      </button>
      <p className="text-[#A89F96] text-[10px] text-center">100% gratis · Sin tarjeta · Sin compromisos</p>
    </form>
  );
}

// ── SUCCESS ───────────────────────────────────────────────────────────────────
function SuccessCard() {
  return (
    <div className="text-center py-2">
      <div className="w-14 h-14 rounded-full bg-[#1B3A2D]/10 border-2 border-[#1B3A2D]/20 flex items-center justify-center mx-auto mb-4">
        <Check size={24} className="text-[#1B3A2D]"/>
      </div>
      <h4 className="text-[#1B3A2D] font-black text-xl mb-1" style={{ fontFamily: "'Poppins', sans-serif" }}>¡Cupo Confirmado!</h4>
      <p className="text-[#6B7280] text-sm mb-5 leading-relaxed">
        Te esperamos el <strong className="text-[#1B3A2D]">Sábado 2 de Agosto</strong> a las{" "}
        <strong className="text-[#F97316]">6:00 PM EST</strong>.
        Únete al grupo para recibir el link.
      </p>
      <a href={WA_LINK} target="_blank" rel="noopener noreferrer"
        className="w-full flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#1DB954] text-white font-bold py-4 rounded-xl transition-all duration-200 cursor-pointer hover:scale-[1.02]"
        style={{ fontFamily: "'Poppins', sans-serif" }}>
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        Entrar al grupo de WhatsApp
      </a>
    </div>
  );
}

// ── FORM CARD ─────────────────────────────────────────────────────────────────
function FormCard({ done, onSuccess, anchorId }: { done: boolean; onSuccess: () => void; anchorId?: string }) {
  const timer   = useCountdown();
  const viewers = useFakeViewers(63);
  const pct     = Math.round((TAKEN_SPOTS / TOTAL_SPOTS) * 100);

  return (
    <div id={anchorId} className="bg-white border border-[#E5DDD5] rounded-2xl overflow-hidden shadow-xl shadow-[#1B3A2D]/10">
      {/* Header */}
      <div className="bg-[#1B3A2D] px-6 py-4">
        <p className="text-white/50 text-[10px] font-bold tracking-[2px] uppercase mb-0.5">Evento 100% Gratuito</p>
        <p className="text-white font-black text-xl leading-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>
          Reserva tu cupo ahora
        </p>
      </div>

      <div className="p-6">

        {/* 1. DATE FIRST */}
        <div className="bg-[#FDF8F3] border border-[#E5DDD5] rounded-xl px-4 py-3.5 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#F97316]/10 border border-[#F97316]/20 flex items-center justify-center shrink-0">
              <Calendar size={16} className="text-[#F97316]"/>
            </div>
            <div>
              <p className="text-[#1B3A2D] text-sm leading-none">
                <strong className="font-black">Sábado 2 de Agosto, 2026</strong>
                {" "}·{" "}
                <strong className="text-[#F97316] font-black">6:00 PM EST</strong>
              </p>
              <p className="text-[#9CA3AF] text-xs mt-1">En vivo · Online · Gratis</p>
            </div>
          </div>
        </div>

        {/* 2. COUNTDOWN */}
        <div className="mb-4">
          <p className="text-[#9CA3AF] text-[10px] font-bold tracking-[2px] uppercase mb-3 text-center">La clase comienza en</p>
          <div className="flex items-start justify-center gap-2.5">
            <CountBox value={timer.days}    label="Días"/>
            <span className="text-[#1B3A2D] text-2xl font-black mt-3.5">:</span>
            <CountBox value={timer.hours}   label="Horas"/>
            <span className="text-[#1B3A2D] text-2xl font-black mt-3.5">:</span>
            <CountBox value={timer.minutes} label="Min"/>
            <span className="text-[#1B3A2D] text-2xl font-black mt-3.5">:</span>
            <CountBox value={timer.seconds} label="Seg"/>
          </div>
        </div>

        {/* Live viewers */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <Eye size={13} className="text-[#F97316]"/>
          <span className="text-[#4B5563] text-xs">
            <strong className="text-[#F97316] font-black">{viewers}</strong> personas viendo esto ahora
          </span>
        </div>

        {/* % occupancy */}
        <div className="mb-5 p-3.5 bg-[#FFF4EC] border border-[#F97316]/20 rounded-xl">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[#4B5563] text-xs font-medium">Ocupación actual</span>
            <span className="text-[#F97316] text-xs font-black">{pct}% lleno · ¡Se está llenando!</span>
          </div>
          <div className="h-2.5 bg-[#E5E0D8] rounded-full overflow-hidden">
            <div className="h-full bg-[#F97316] rounded-full" style={{ width: `${pct}%` }}/>
          </div>
          <p className="text-[#9CA3AF] text-[10px] mt-1.5">Ya el {pct}% de los cupos está reservado</p>
        </div>

        {done ? <SuccessCard/> : <RegForm onSuccess={onSuccess}/>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function ClaseGratisTreeService() {
  const [done, setDone] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const PP = { fontFamily: "'Poppins', sans-serif" };

  const handleSuccess = () => { setDone(true); setShowOverlay(true); };

  return (
    <div className="min-h-screen text-[#1B3A2D]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600&display=swap');
        @keyframes live-ring {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.25; }
        }
        .live-ring-1 { animation: live-ring 1.6s ease-in-out infinite; }
        .live-ring-2 { animation: live-ring 1.6s ease-in-out 0.4s infinite; }
      `}</style>

      {/* ── BANNER ── */}
      <div className="bg-[#1B3A2D] py-2.5">
        <div className="flex items-center justify-center gap-2.5">
          {/* Animated live icon on red circle */}
          <span className="w-7 h-7 bg-red-600 rounded-full flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="2.8" fill="white"/>
              <path className="live-ring-1" d="M7.8 16.2A6 6 0 0 1 7.8 7.8" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
              <path className="live-ring-1" d="M16.2 7.8A6 6 0 0 1 16.2 16.2" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
              <path className="live-ring-2" d="M4.5 19.5A10.5 10.5 0 0 1 4.5 4.5" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
              <path className="live-ring-2" d="M19.5 4.5A10.5 10.5 0 0 1 19.5 19.5" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
            </svg>
          </span>
          <p className="text-white text-[11px] font-semibold tracking-[1.5px] uppercase">
            Clase Gratis · En Vivo · 2 de Agosto · 6 PM EST
          </p>
        </div>
      </div>

      {/* ══════ HERO — CREAM ══════════════════════════════════════════════════ */}
      <section className="bg-[#FDF8F3] pt-10 pb-16 px-5 sm:px-8">
        <div className="max-w-7xl mx-auto">

          {/* FOR WHO — prominent banner */}
          <div className="bg-[#1B3A2D] rounded-2xl px-6 py-5 mb-10 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
            <div className="w-10 h-10 rounded-xl bg-[#F97316] flex items-center justify-center shrink-0">
              <span className="text-lg">🌲</span>
            </div>
            <div className="flex-1">
              <p className="text-white/80 text-xs font-bold tracking-[2px] uppercase mb-1">Esta clase gratis en vivo es para</p>
              <p className="text-white font-black text-lg sm:text-xl leading-snug" style={PP}>
                Dueños de negocios de <span className="text-[#F97316]">Tree Service</span> en Estados Unidos 🇺🇸
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-[1fr_420px] gap-10 xl:gap-14 items-start">

            {/* LEFT */}
            <div>
              <h1 className="leading-[1.06] mb-6 text-[#1B3A2D]"
                style={{ ...PP, fontSize: "clamp(2.2rem, 5.2vw, 3.8rem)", fontWeight: 900 }}>
                Llena tu agenda con{" "}
                <span className="text-[#F97316]">10 Clientes Nuevos</span>{" "}
                en Menos de{" "}
                <span className="text-[#F97316]">30 Días</span>
              </h1>

              {/* 3 Sin... */}
              <div className="space-y-3 mb-8">
                {[
                  "Sin importar que no sepas nada de tecnología",
                  "Sin importar que tengas poco presupuesto",
                  "Sin importar tu idioma. La clase es en Español",
                ].map(t => (
                  <div key={t} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#1B3A2D] flex items-center justify-center shrink-0">
                      <Check size={11} className="text-white"/>
                    </div>
                    <p className="text-[#4B5563] text-base font-medium">{t}</p>
                  </div>
                ))}
              </div>

              {/* Hero image — user's photo */}
              <div className="rounded-2xl overflow-hidden">
                <img
                  src="/tree-service.jpg"
                  alt="Servicio profesional de Tree Service"
                  className="w-full h-64 sm:h-80 object-cover"
                />
              </div>
            </div>

            {/* RIGHT: form */}
            <div ref={formRef} className="lg:sticky lg:top-5">
              <FormCard done={done} onSuccess={handleSuccess} anchorId="registro"/>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ PAIN — DARK GREEN ════════════════════════════════════════════ */}
      <section className="relative bg-[#1B3A2D] py-20 px-5 sm:px-8 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <img
            src="https://images.unsplash.com/photo-1542621334-a254cf47733d?auto=format&fit=crop&w=1600&q=40"
            alt=""
            className="w-full h-full object-cover opacity-10"
          />
          <div className="absolute inset-0 bg-[#1B3A2D]/80"/>
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="grid lg:grid-cols-[1fr_1fr] gap-12 items-start">
            <div>
              <span className="text-[#F97316] text-xs font-bold tracking-[2px] uppercase block mb-4">El problema real</span>
              <h2 style={{ ...PP, fontSize: "clamp(1.8rem, 4vw, 3rem)", fontWeight: 900 }} className="leading-[1.1] mb-5 text-white">
                Si no llegan clientes nuevos, hay semanas en que el dinero no alcanza
              </h2>
              <p className="text-white/60 text-base leading-relaxed">
                Muchos dueños de tree service viven del boca a boca — y así pierden trabajos de $500, $1,500, hasta $5,000 porque otra empresa salió primero en Facebook y el cliente los llamó a ellos.
              </p>
            </div>
            <div className="space-y-3">
              {/* "Este curso gratis es para ti si..." */}
              <div className="bg-[#F97316] rounded-xl px-4 py-3.5 mb-1">
                <p className="text-white font-bold text-sm" style={PP}>
                  Este curso gratis es para ti si…
                </p>
              </div>

              {[
                "Hay meses buenos y meses en que casi no entra trabajo",
                "Otras empresas de tree service salen antes que tú en Facebook",
                "Ya intentaste poner publicidad pero no te funcionó",
                "Puedes trabajar más, pero no sabes cómo conseguir más clientes",
                "No tienes tiempo de aprender publicidad — tienes que estar en el trabajo",
              ].map(pain => (
                <div key={pain} className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3.5">
                  <div className="w-5 h-5 rounded-full bg-[#F97316]/20 border border-[#F97316]/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={11} className="text-[#F97316]"/>
                  </div>
                  <p className="text-white/70 text-sm leading-snug">{pain}</p>
                </div>
              ))}
            </div>
          </div>

          <SectionCTA formId="registro" variant="onDark"/>
        </div>
      </section>

      {/* ══════ WHAT YOU'LL LEARN — CREAM ════════════════════════════════════ */}
      <section className="bg-[#FDF8F3] py-20 px-5 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 style={{ ...PP, fontSize: "clamp(1.6rem, 4vw, 2.6rem)", fontWeight: 900 }} className="leading-[1.3] text-[#1B3A2D]">
              ¿Qué aprenderás el día{" "}
              <span className="relative inline-block text-[#F97316]">
                Sábado 2 de Agosto
                <svg className="absolute -bottom-2 left-0 w-full overflow-visible" height="8" viewBox="0 0 300 8" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M0 4 C37 0,63 8,100 4 C137 0,163 8,200 4 C237 0,263 8,300 4" stroke="#F97316" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                </svg>
              </span>{" "}
              a las 6:00 PM EST?
            </h2>
          </div>

          <div className="space-y-5">
            {[
              {
                num: "01",
                title: "Cómo conseguir 10 o más clientes nuevos por mes con Facebook",
                body: "Te mostramos paso a paso cómo poner un anuncio en Facebook para que te llamen clientes nuevos. Empieza desde $10 al día. No necesitas saber de computadoras — lo hacemos fácil.",
                badge: "Empieza desde $10 al día",
              },
              {
                num: "02",
                title: "Qué decir en tu anuncio para que la gente te llame",
                body: "Te damos el texto exacto y el tipo de foto o video que hace que la gente llame. Vamos a ver ejemplos reales de anuncios que consiguieron trabajos de $1,500 a $8,000 para otros dueños de tree service.",
                badge: "Ejemplos reales de anuncios que funcionan",
              },
              {
                num: "03",
                title: "El error que hace que muchos pierdan más de $2,000 al mes",
                body: "La mayoría de dueños de tree service comete este error sin darse cuenta. En la clase te decimos cuál es y cómo arreglarlo rápido — para que no sigas perdiendo clientes por eso.",
                badge: "Lo puedes arreglar ese mismo día",
              },
            ].map((item) => (
              <div key={item.num} className="flex gap-0 rounded-2xl overflow-hidden border border-[#E5DDD5] bg-white group hover:border-[#1B3A2D]/30 transition-colors">
                <div className="bg-[#FFF4EC] flex items-center justify-center px-5 shrink-0 border-r border-[#E5DDD5] group-hover:bg-[#FEE8D0] transition-colors">
                  <span className="text-[#F97316]/50 font-black text-5xl group-hover:text-[#F97316]/80 transition-colors" style={PP}>{item.num}</span>
                </div>
                <div className="p-5 sm:p-6 flex-1">
                  <h3 className="text-[#1B3A2D] font-bold text-base sm:text-lg mb-2 leading-snug" style={PP}>{item.title}</h3>
                  <p className="text-[#4B5563] text-sm leading-relaxed mb-3">{item.body}</p>
                  <span className="inline-flex items-center gap-1.5 text-[#1B3A2D] text-xs font-semibold bg-[#1B3A2D]/8 border border-[#1B3A2D]/15 px-3 py-1 rounded-full">
                    <Check size={11}/> {item.badge}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <SectionCTA formId="registro"/>
        </div>
      </section>

      {/* ══════ BEFORE / AFTER — WHITE ════════════════════════════════════════ */}
      <section className="bg-white py-20 px-5 sm:px-8 border-y border-[#E5DDD5]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 style={{ ...PP, fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 900 }} className="text-[#1B3A2D] leading-[1.1]">
              Tu negocio antes y después de la clase gratis
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-[#FEF2F2] border border-red-200 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="text-red-400 text-sm font-black">✕</span>
                </div>
                <span className="text-red-400 text-xs font-bold tracking-[2px] uppercase">Sin la clase</span>
              </div>
              {[
                "Solo consigues trabajo cuando alguien te recomienda",
                "Hay meses buenos y meses en que casi no entra nada",
                "No sabes cuánto dinero va a entrar el mes que viene",
                "Otras empresas te quitan los clientes porque los ven en Facebook primero",
                "Trabajas mucho pero el negocio sigue igual",
              ].map(t => (
                <div key={t} className="flex items-start gap-2.5 mb-3 last:mb-0">
                  <span className="text-red-300 mt-0.5 shrink-0">—</span>
                  <p className="text-[#6B7280] text-sm leading-snug">{t}</p>
                </div>
              ))}
            </div>
            <div className="bg-[#F0FDF4] border border-[#1B3A2D]/20 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-6 h-6 rounded-full bg-[#1B3A2D]/10 flex items-center justify-center">
                  <Check size={12} className="text-[#1B3A2D]"/>
                </div>
                <span className="text-[#1B3A2D] text-xs font-bold tracking-[2px] uppercase">Después de la clase</span>
              </div>
              {[
                "Te llaman clientes nuevos todos los meses, sin que tú tengas que buscarlos",
                "Tienes trabajo asegurado antes de que empiece el mes",
                "Sabes cuánto dinero va a entrar el mes que viene",
                "Tu anuncio sale antes que el de otros cuando alguien busca tree service en Facebook",
                "El negocio crece mientras tú estás trabajando",
              ].map(t => (
                <div key={t} className="flex items-start gap-2.5 mb-3 last:mb-0">
                  <Check size={13} className="text-[#1B3A2D] mt-0.5 shrink-0"/>
                  <p className="text-[#374151] text-sm leading-snug">{t}</p>
                </div>
              ))}
            </div>
          </div>

          <SectionCTA formId="registro"/>
        </div>
      </section>

      {/* ══════ TESTIMONIALS — DARK GREEN ════════════════════════════════════ */}
      <section className="bg-[#1B3A2D] py-20 px-5 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-[#F97316] text-xs font-bold tracking-[2px] uppercase block mb-3">Casos de éxito</span>
            <h2 style={{ ...PP, fontSize: "clamp(1.8rem, 4vw, 3rem)", fontWeight: 900 }} className="text-white leading-[1.1]">
              Lo que dicen los que tomaron la clase
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              {
                ini: "JH", bg: "#2D6A4F",
                name: "Juan Hernández",
                biz:  "JH Tree Services · Houston, TX",
                result: "+12 clientes nuevos en el primer mes",
                quote: "Antes solo recibía 2–3 llamadas por semana. Después de aplicar lo que aprendí en la clase me llegaron 12 trabajos nuevos en el primer mes. Uno solo de esos pagó más de lo que gasté en publicidad en todo el mes.",
              },
              {
                ini: "CR", bg: "#1F5C41",
                name: "Carlos Reyes",
                biz:  "Reyes Tree & Landscaping · Orlando, FL",
                result: "De $7k/mes a $18k/mes en 45 días",
                quote: "No sabía nada de Facebook Ads y le tenía miedo a gastar dinero. La clase fue paso a paso. En 45 días mi ingreso mensual subió de $7,000 a más de $18,000. Tuve que contratar helpers más para cubrir el trabajo.",
              },
              {
                ini: "RM", bg: "#155534",
                name: "Roberto Martínez",
                biz:  "Martinez Tree Experts · Atlanta, GA",
                result: "Agenda llena para los próximos 3 meses",
                quote: "Nunca pensé que lo que enseñaron en esa clase gratis iba a cambiar tanto mi negocio. Hoy tengo trabajo programado para los próximos 3 meses y seguimos creciendo.",
              },
            ].map(t => (
              <div key={t.name} className="bg-white/8 border border-white/10 rounded-2xl p-5 flex flex-col hover:bg-white/12 transition-colors">
                <Stars light/>
                <p className="text-white/65 text-sm leading-relaxed mt-3 mb-4 flex-1">"{t.quote}"</p>
                <div className="pt-4 border-t border-white/10">
                  <div className="inline-block bg-[#F97316]/15 border border-[#F97316]/25 text-[#F97316] text-xs font-semibold px-3 py-1 rounded-full mb-3">
                    {t.result}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0" style={{ backgroundColor: t.bg }}>
                      {t.ini}
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm leading-none">{t.name}</p>
                      <p className="text-white/35 text-xs mt-0.5">{t.biz}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Aggregate */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 py-5 bg-white/5 border border-white/10 rounded-2xl">
            <div className="text-center sm:text-left">
              <p className="text-white font-black text-4xl" style={PP}>4.9 / 5</p>
              <div className="flex justify-center sm:justify-start gap-0.5 mt-1">
                {[1,2,3,4,5].map(i => <Star key={i} size={14} className="text-[#FCD34D] fill-[#FCD34D]"/>)}
              </div>
            </div>
            <div className="w-px h-10 bg-white/15 hidden sm:block"/>
            <p className="text-white/50 text-sm text-center sm:text-left">
              Basado en testimonios reales de dueños de tree service que asistieron a la clase
            </p>
          </div>

          <SectionCTA formId="registro" variant="onDark"/>
        </div>
      </section>

      {/* ══════ INSTRUCTOR — CREAM ════════════════════════════════════════════ */}
      <section className="bg-[#FDF8F3] py-20 px-5 sm:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid lg:grid-cols-[1fr_300px] gap-10 items-start">
            <div>
              <span className="text-[#F97316] text-xs font-bold tracking-[2px] uppercase block mb-4">Tu instructor</span>
              <h2 style={{ ...PP, fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 900 }} className="text-[#1B3A2D] leading-[1.1] mb-5">
                Especialista en hacer crecer negocios latinos en Estados Unidos
              </h2>
              <p className="text-[#4B5563] text-base leading-relaxed mb-4">
                Daniel Acero ha ayudado a decenas de dueños de tree service, limpieza y otros negocios latinos en USA a conseguir más clientes usando Facebook e Instagram — sin necesitar ser expertos en tecnología.
              </p>
              <p className="text-[#4B5563] text-base leading-relaxed mb-6">
                Esta clase gratis es para personas que apenas saben usar el teléfono y nunca han puesto un anuncio en Facebook. Si eres así, esta clase es para ti.
              </p>
            </div>

            <div className="bg-white border border-[#E5DDD5] rounded-2xl overflow-hidden shadow-md">
              <div className="relative">
                <img
                  src="/instructor.jpg"
                  alt="Ing. Daniel Acero — Instructor"
                  className="w-full h-56 object-cover object-top"
                />
                <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-white/90 to-transparent"/>
              </div>
              <div className="px-5 pb-5 pt-2 text-center">
                <p className="text-[#1B3A2D] font-black text-lg mb-0.5" style={PP}>Ing. Daniel Acero</p>
                <p className="text-[#6B7280] text-xs mb-0.5">Experto en Meta Ads</p>
                <p className="text-[#F97316] text-xs font-semibold mb-3">Ayudó a más de 50 negocios latinos en USA</p>
                <div className="border-t border-[#E5DDD5] pt-3 flex justify-center">
                  <div className="inline-flex items-center gap-2 bg-[#EEF4FF] border border-blue-200 rounded-lg px-3 py-2">
                    <MetaLogo className="h-4 w-auto"/>
                    <div>
                      <p className="text-[#6B7280] text-[9px] leading-none mb-0.5">Estrategias basadas en</p>
                      <p className="text-[#0082FB] text-[11px] font-black leading-none" style={{ fontFamily: "'Poppins', sans-serif" }}>Facebook & Instagram Ads</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <SectionCTA formId="registro"/>
        </div>
      </section>

      {/* ══════ FINAL CTA — DARK GREEN ═══════════════════════════════════════ */}
      <section className="bg-[#1B3A2D] py-20 px-5 sm:px-8">
        <div className="max-w-xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-5">
            <AlertTriangle size={15} className="text-[#F97316] shrink-0"/>
            <p className="text-[#F97316] text-sm font-semibold">
              Ya el <strong>{Math.round((TAKEN_SPOTS / TOTAL_SPOTS) * 100)}%</strong> de los cupos está reservado
            </p>
          </div>

          <h2 style={{ ...PP, fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 900 }} className="leading-[1.1] mb-4 text-white">
            Si tú no aprendes esto ahora, tu competencia lo hará
          </h2>
          <p className="text-white/60 text-base mb-10 leading-relaxed max-w-sm mx-auto">
            Cada semana que pasa sin clientes nuevos es dinero que no entra. Esta clase es gratis y solo ocurre una vez.
          </p>

          <FormCard done={done} onSuccess={handleSuccess}/>

          <div className="flex flex-wrap justify-center gap-5 mt-6">
            {["100% Gratis", "Sin tarjeta de crédito", "Solo para Tree Services", "En Español"].map(b => (
              <span key={b} className="flex items-center gap-1.5 text-white/40 text-xs">
                <Check size={11} className="text-white/60"/> {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FULL-PAGE SUCCESS OVERLAY ── */}
      {showOverlay && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center px-5" style={{ fontFamily: "'Inter', sans-serif" }}>
          <div className="text-center max-w-sm w-full">
            <div className="w-20 h-20 rounded-full bg-[#25D366]/15 border-2 border-[#25D366]/30 flex items-center justify-center mx-auto mb-6">
              <Check size={36} className="text-[#25D366]"/>
            </div>
            <h3 className="text-white font-black text-3xl mb-2" style={PP}>¡Cupo Confirmado!</h3>
            <p className="text-white/50 text-sm leading-relaxed mb-2">
              Te esperamos el{" "}
              <strong className="text-white">Sábado 2 de Agosto</strong>{" "}
              a las{" "}
              <strong className="text-[#F97316]">6:00 PM EST</strong>.
            </p>
            <p className="text-white/40 text-sm mb-8">
              Únete al grupo para recibir el link de la clase.
            </p>
            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setShowOverlay(false)}
              className="flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#1DB954] text-white font-bold py-5 rounded-xl transition-all duration-200 cursor-pointer text-lg"
              style={PP}>
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Entrar al grupo de WhatsApp
            </a>
            <p className="text-white/25 text-xs mt-4">
              Debes unirte al grupo para recibir el link de la clase el día del evento
            </p>
          </div>
        </div>
      )}

      {/* ── FOOTER — DARK GREEN ── */}
      <footer className="bg-[#1B3A2D] py-8 px-5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 text-white/25 text-xs">
          <p>© 2026 Acrosoft Labs · Todos los derechos reservados</p>
          <p>Esta clase es 100% gratuita. Al registrarte aceptas recibir comunicaciones del evento.</p>
        </div>
      </footer>
    </div>
  );
}
