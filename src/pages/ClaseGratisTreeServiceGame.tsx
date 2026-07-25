import { useState, useEffect } from "react";
import { Check, Star, AlertTriangle, Eye } from "lucide-react";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const WA_LINK     = "https://chat.whatsapp.com/E6TRKY81nbk0ipYxgV3r0P?s=cl&p=i&ilr=1&amv=2";
const EVENT_DATE  = new Date("2026-08-09T22:00:00.000Z");
const TOTAL_SPOTS = 100;
const TAKEN_SPOTS = 78;
const PP = { fontFamily: "'Poppins', sans-serif" };

const WA_SVG = (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white shrink-0">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const COUNTRIES = [
  { code: "1",   label: "🇺🇸 +1"   },
  { code: "52",  label: "🇲🇽 +52"  },
  { code: "502", label: "🇬🇹 +502" },
  { code: "503", label: "🇸🇻 +503" },
  { code: "504", label: "🇭🇳 +504" },
  { code: "505", label: "🇳🇮 +505" },
  { code: "506", label: "🇨🇷 +506" },
  { code: "507", label: "🇵🇦 +507" },
  { code: "53",  label: "🇨🇺 +53"  },
  { code: "57",  label: "🇨🇴 +57"  },
  { code: "58",  label: "🇻🇪 +58"  },
  { code: "593", label: "🇪🇨 +593" },
  { code: "51",  label: "🇵🇪 +51"  },
  { code: "591", label: "🇧🇴 +591" },
  { code: "56",  label: "🇨🇱 +56"  },
  { code: "54",  label: "🇦🇷 +54"  },
  { code: "595", label: "🇵🇾 +595" },
  { code: "598", label: "🇺🇾 +598" },
  { code: "55",  label: "🇧🇷 +55"  },
];

// ── HOOKS ─────────────────────────────────────────────────────────────────────
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

// ── SHARED UI ─────────────────────────────────────────────────────────────────
function Stars() {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={13} className="text-[#F97316] fill-[#F97316]"/>
      ))}
    </div>
  );
}

function CountBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-white/10 border border-white/20 rounded-xl w-[56px] h-[56px] flex items-center justify-center">
        <span className="text-white font-black text-[1.6rem] tabular-nums leading-none" style={PP}>
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span className="text-[9px] text-white/30 font-bold tracking-widest uppercase mt-1.5">{label}</span>
    </div>
  );
}

// ── REG FORM ─────────────────────────────────────────────────────────────────
function RegForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName]               = useState("");
  const [phone, setPhone]             = useState("");
  const [countryCode, setCountryCode] = useState("1");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");

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
      <div className="flex gap-2">
        <select value={countryCode} onChange={e => setCountryCode(e.target.value)}
          className={`${base} px-2 py-3.5 shrink-0`} style={{ width: "96px" }}>
          {COUNTRIES.map((c, i) => (
            <option key={i} value={c.code}>{c.label}</option>
          ))}
        </select>
        <input type="tel" placeholder="Número de WhatsApp" value={phone}
          onChange={e => setPhone(e.target.value)}
          className={`flex-1 ${base} px-4 py-3.5 placeholder-[#A89F96]`} required/>
      </div>
      <p className="text-[#6B7280] text-[11px] leading-snug">
        Necesita tener <strong className="text-[#25D366]">WhatsApp</strong> — por ahí te enviamos el acceso a la clase.
      </p>
      {error && (
        <p className="text-red-500 text-xs flex items-center gap-1">
          <AlertTriangle size={11}/>{error}
        </p>
      )}
      <button type="submit" disabled={loading}
        className="w-full bg-[#F97316] hover:bg-[#EA6B00] disabled:opacity-60 text-white font-bold py-4 rounded-xl transition-colors duration-200 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
        style={PP}>
        {loading
          ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" className="opacity-75"/></svg>Registrando…</>
          : <>{WA_SVG}<div className="flex flex-col items-start leading-tight"><span className="text-[0.95rem]">Reservar mi cupo gratis</span><span className="text-[11px] font-normal opacity-70">Clase en vivo · Dom 9 Ago · 6 PM EST</span></div></>
        }
      </button>
      <p className="text-[#A89F96] text-[10px] text-center">100% gratis · Sin tarjeta · Sin compromisos</p>
    </form>
  );
}

// ── SCREEN 0 — IDENTIFICACIÓN ────────────────────────────────────────────────
function Screen0({ onNext }: { onNext: () => void }) {
  return (
    <div className="min-h-screen bg-[#1B3A2D] flex flex-col items-center justify-center px-6 py-20 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <img src="/tree-service.jpg" alt="" className="w-full h-full object-cover opacity-[0.13]"/>
        <div className="absolute inset-0 bg-[#1B3A2D]/65"/>
      </div>

      <div className="max-w-lg w-full text-center relative z-10">

        {/* Qualifying question */}
        <p className="text-[#FDF8F3]/70 font-bold mb-5 leading-snug"
          style={{ ...PP, fontSize: "clamp(1.1rem, 2.8vw, 1.4rem)" }}>
          ¿Tienes un negocio de Tree Service
          <br/>en Estados Unidos? 🇺🇸
        </p>

        {/* Main promise headline */}
        <h1 className="text-[#FDF8F3] leading-[1.08] mb-3"
          style={{ ...PP, fontSize: "clamp(2.2rem, 5.5vw, 3.6rem)", fontWeight: 900 }}>
          Consigue{" "}
          <span className="text-[#F97316]">+20 trabajos nuevos</span>{" "}
          de Tree Service cada mes
        </h1>

        <p className="text-[#F97316] font-bold italic mb-12 leading-snug"
          style={{ ...PP, fontSize: "clamp(1rem, 2.2vw, 1.25rem)" }}>
          Sin contratar agencias de marketing costosas
        </p>

        <button onClick={onNext}
          className="bg-[#F97316] hover:bg-[#EA6B00] text-white font-bold px-10 py-5 rounded-2xl transition-colors duration-200 cursor-pointer"
          style={PP}>
          <span className="block text-lg">Sí, ese soy yo →</span>
          <span className="block text-xs font-normal opacity-70 mt-0.5">Quiero conseguir más trabajos cada mes</span>
        </button>
      </div>
    </div>
  );
}

// ── SCREEN 1 — LA HERIDA ──────────────────────────────────────────────────────
function Screen1({ onNext }: { onNext: () => void }) {
  return (
    <div className="min-h-screen bg-[#FDF8F3] flex flex-col items-center justify-center px-6 py-20">
      <div className="max-w-lg w-full">

        <p className="text-[#F97316] text-[10px] font-bold tracking-[4px] uppercase mb-7">
          El problema
        </p>

        <h2 className="text-[#1B3A2D] font-black leading-[1.2] mb-8"
          style={{ ...PP, fontSize: "clamp(1.8rem, 4.5vw, 2.7rem)" }}>
          Hay otros con peor trabajo que tú.
          <br/>
          <span className="text-[#F97316]">Y tienen más clientes.</span>
        </h2>

        <div className="space-y-5 text-[#374151] leading-relaxed" style={{ fontSize: "1.05rem" }}>
          <p>
            No es porque sean mejores.
            Es porque saben cómo{" "}
            <strong className="text-[#1B3A2D]">conseguir clientes por internet.</strong>
          </p>
          <p>
            Tú sigues esperando que te llamen.
            Esperando referidos. Esperando que el teléfono suene.
          </p>
          <p>
            Y hay meses buenos... y meses en que{" "}
            <strong className="text-[#F97316]">el trabajo no alcanza.</strong>
          </p>
        </div>

        <button onClick={onNext}
          className="mt-12 w-full bg-[#1B3A2D] hover:bg-[#142D22] text-white font-bold px-8 py-5 rounded-2xl transition-colors duration-200 cursor-pointer"
          style={PP}>
          <span className="block text-base">Quiero saber su secreto →</span>
          <span className="block text-xs font-normal opacity-55 mt-0.5">La diferencia entre ellos y tú te va a sorprender</span>
        </button>
      </div>
    </div>
  );
}

// ── SCREEN 2 — EL GIRO ───────────────────────────────────────────────────────
function Screen2({ onNext }: { onNext: () => void }) {
  const bullets = [
    "Cómo poner anuncios en Facebook para conseguir clientes de tree service",
    "Con cuánto dinero puedes empezar (desde $10 al día)",
    "Cómo conseguir +20 trabajos nuevos cada mes",
  ];

  return (
    <div className="min-h-screen bg-[#1B3A2D] flex flex-col items-center justify-center px-6 py-20 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <img src="/tree-service.jpg" alt="" className="w-full h-full object-cover opacity-[0.13]"/>
        <div className="absolute inset-0 bg-[#1B3A2D]/65"/>
      </div>

      <div className="max-w-lg w-full relative z-10">

        <p className="text-[#F97316]/60 text-[10px] font-bold tracking-[4px] uppercase mb-7">
          La solución
        </p>

        <h2 className="text-[#FDF8F3] font-black leading-[1.1] mb-2"
          style={{ ...PP, fontSize: "clamp(1.6rem, 4vw, 2.4rem)" }}>
          Usan Facebook Ads.
        </h2>

        <p className="text-[#F97316] font-black leading-tight mb-4"
          style={{ ...PP, fontSize: "clamp(1.15rem, 2.8vw, 1.5rem)" }}>
          Desde $10 al día. Sin agencias. Ellos mismos.
        </p>

        <p className="text-[#FDF8F3]/55 text-base leading-relaxed mb-8">
          Y tú también puedes aprender a hacerlo.
          <br/>
          Este <strong className="text-white">Domingo 9 de Agosto</strong> te enseño cómo,
          en una clase en vivo y{" "}
          <strong className="text-white">100% gratis.</strong>
        </p>

        {/* What you'll learn */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
          <p className="text-[#FDF8F3]/40 text-[10px] font-bold tracking-[2px] uppercase mb-5">
            En la clase vas a aprender
          </p>
          <div className="space-y-4">
            {bullets.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#F97316] flex items-center justify-center shrink-0 mt-0.5">
                  <Check size={10} className="text-white" strokeWidth={3}/>
                </div>
                <p className="text-[#FDF8F3]/80 text-sm leading-snug">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <button onClick={onNext}
          className="w-full bg-[#F97316] hover:bg-[#EA6B00] text-white font-bold px-8 py-5 rounded-2xl transition-colors duration-200 cursor-pointer shadow-xl shadow-[#F97316]/20"
          style={PP}>
          <span className="block text-base">Quiero aprender a hacerlo →</span>
          <span className="block text-xs font-normal opacity-70 mt-0.5">Clase gratis · Dom 9 de Agosto · 6 PM EST</span>
        </button>
      </div>
    </div>
  );
}

// ── SCREEN 3 — LA PRUEBA ─────────────────────────────────────────────────────
function Screen3({ onNext }: { onNext: () => void }) {
  const testimonials = [
    {
      name: "Miguel Hernández",
      location: "Houston, TX",
      text: "El primer mes cerré 7 trabajos nuevos solo con los anuncios. Antes esperaba semanas para llenar la agenda.",
    },
    {
      name: "Carlos Reyes",
      location: "Dallas, TX",
      text: "Gasto $15 al día en Facebook y me llaman 4 clientes nuevos cada semana. No necesité ninguna agencia.",
    },
    {
      name: "Luis Mendoza",
      location: "Miami, FL",
      text: "En 30 días triplicamos los trabajos. Antes dependía solo del boca a boca.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#FDF8F3] flex flex-col items-center justify-center px-6 py-20">
      <div className="max-w-lg w-full">

        <p className="text-[#F97316] text-[10px] font-bold tracking-[4px] uppercase mb-7">
          Ya lo están haciendo
        </p>

        <h2 className="text-[#1B3A2D] font-black leading-[1.2] mb-8"
          style={{ ...PP, fontSize: "clamp(1.65rem, 4.2vw, 2.5rem)" }}>
          Otros dueños de tree service
          <br/>
          ya lo están usando.
        </h2>

        {/* Testimonials */}
        <div className="space-y-4 mb-8">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-white border border-[#E5DDD5] rounded-2xl p-5 shadow-sm">
              <Stars/>
              <p className="text-[#374151] text-sm leading-relaxed mt-2.5 mb-3 italic">
                "{t.text}"
              </p>
              <div>
                <p className="text-[#1B3A2D] text-xs font-black">{t.name}</p>
                <p className="text-[#9CA3AF] text-[11px]">{t.location}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Instructor */}
        <div className="bg-[#1B3A2D] rounded-2xl p-5 mb-8">
          <p className="text-[#FDF8F3]/40 text-[10px] font-bold tracking-[2px] uppercase mb-4">
            Quien te enseña
          </p>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-[#F97316]/15 border-2 border-[#F97316]/30 flex items-center justify-center shrink-0">
              <span className="text-[#F97316] font-black text-xl" style={PP}>DA</span>
            </div>
            <div>
              <p className="text-white font-black text-base mb-1" style={PP}>Daniel Acero</p>
              <div className="flex flex-wrap gap-2">
                {["+$100K en ads gestionados", "6 años de experiencia", "50+ negocios ayudados"].map((b, i) => (
                  <span key={i} className="bg-white/8 border border-white/10 rounded-lg px-2.5 py-1 text-[#FDF8F3]/60 text-[10px] font-bold">
                    {b}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <button onClick={onNext}
          className="w-full bg-[#F97316] hover:bg-[#EA6B00] text-white font-bold px-8 py-5 rounded-2xl transition-colors duration-200 cursor-pointer"
          style={PP}>
          <span className="block text-base">Guardar mi cupo ahora →</span>
          <span className="block text-xs font-normal opacity-70 mt-0.5">Es gratis · Quedan solo {TOTAL_SPOTS - TAKEN_SPOTS} lugares</span>
        </button>
      </div>
    </div>
  );
}

// ── SCREEN 4 — EL REGISTRO ───────────────────────────────────────────────────
function Screen4({ viewers, done, onSuccess }: { viewers: number; done: boolean; onSuccess: () => void }) {
  const timer = useCountdown();
  const pct   = Math.round((TAKEN_SPOTS / TOTAL_SPOTS) * 100);
  const [barFilled, setBarFilled] = useState(false);
  useEffect(() => { const t = setTimeout(() => setBarFilled(true), 250); return () => clearTimeout(t); }, []);

  return (
    <div className="min-h-screen bg-[#1B3A2D] flex flex-col items-center justify-center px-4 py-20 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <img src="/tree-service.jpg" alt="" className="w-full h-full object-cover opacity-[0.13]"/>
        <div className="absolute inset-0 bg-[#1B3A2D]/65"/>
      </div>

      <div className="max-w-md w-full relative z-10">

        {/* Heading */}
        <div className="text-center mb-7">
          <p className="text-[#F97316]/70 text-[10px] font-bold tracking-[4px] uppercase mb-3">
            ¡Último paso!
          </p>
          <h2 className="text-[#FDF8F3] font-black text-2xl leading-tight mb-1" style={PP}>
            Guarda tu lugar en la clase
          </h2>
          <p className="text-[#FDF8F3]/40 text-sm">
            Domingo 9 de Agosto · 6 PM EST · En vivo · Gratis
          </p>
        </div>

        {/* Countdown */}
        <div className="mb-6">
          <p className="text-[#FDF8F3]/30 text-[10px] font-bold tracking-[2px] uppercase mb-3 text-center">
            La clase comienza en
          </p>
          <div className="flex items-start justify-center gap-2.5">
            <CountBox value={timer.days}    label="Días"/>
            <span className="text-white/40 text-2xl font-black mt-3">:</span>
            <CountBox value={timer.hours}   label="Horas"/>
            <span className="text-white/40 text-2xl font-black mt-3">:</span>
            <CountBox value={timer.minutes} label="Min"/>
            <span className="text-white/40 text-2xl font-black mt-3">:</span>
            <CountBox value={timer.seconds} label="Seg"/>
          </div>
        </div>

        {/* Viewers + occupancy */}
        <div className="mb-6 space-y-3">
          <div className="flex items-center justify-center gap-2">
            <Eye size={13} className="text-[#F97316]"/>
            <span className="text-[#FDF8F3]/50 text-xs">
              <strong className="text-[#F97316] font-black">{viewers}</strong>{" "}
              personas viendo esto ahora
            </span>
          </div>
          <div>
            <div className="flex justify-between text-[10px] mb-1.5">
              <span className="text-[#FDF8F3]/30 font-bold uppercase tracking-widest">Cupos tomados</span>
              <span className="text-[#F97316] font-black">{pct}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full occ-bar"
                style={{ width: barFilled ? `${pct}%` : "0%" }}/>
            </div>
            <p className="text-[#FDF8F3]/25 text-[10px] mt-1 text-right">
              Solo {TOTAL_SPOTS - TAKEN_SPOTS} lugares disponibles
            </p>
          </div>
        </div>

        {/* Form card */}
        <div className="bg-white border border-[#E5DDD5] rounded-2xl overflow-hidden shadow-2xl shadow-black/30">
          <div className="bg-[#1B3A2D] px-6 py-4 text-center border-b border-white/10">
            <p className="text-white/50 text-[10px] font-bold tracking-[2px] uppercase mb-0.5">
              Clase gratis · Domingo 9 de Agosto · 6 PM EST
            </p>
            <p className="text-white font-black text-xl leading-tight" style={PP}>
              Regístrate Aquí
            </p>
          </div>
          <div className="p-6">
            {done ? <SuccessState/> : <RegForm onSuccess={onSuccess}/>}
          </div>
        </div>
      </div>
    </div>
  );
}

function SuccessState() {
  return (
    <div className="text-center py-2">
      <div className="w-14 h-14 rounded-full bg-[#1B3A2D] flex items-center justify-center mx-auto mb-4">
        <Check size={24} className="text-white"/>
      </div>
      <h4 className="text-[#1B3A2D] font-black text-xl mb-1" style={PP}>¡Cupo Confirmado!</h4>
      <p className="text-[#6B7280] text-sm mb-5 leading-relaxed">
        Te esperamos el <strong className="text-[#1B3A2D]">Domingo 9 de Agosto</strong> a las{" "}
        <strong className="text-[#F97316]">6:00 PM EST</strong>.
        Únete al grupo para recibir el link.
      </p>
      <a href={WA_LINK} target="_blank" rel="noopener noreferrer"
        className="w-full flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#1DB954] text-white font-bold py-4 rounded-xl transition-all duration-200 cursor-pointer hover:scale-[1.02]"
        style={PP}>
        {WA_SVG}
        Entrar al grupo de WhatsApp
      </a>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function ClaseGratisTreeServiceGame() {
  const [screen, setScreen]         = useState(0);
  const [fading, setFading]         = useState(false);
  const [done, setDone]             = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const viewers = useFakeViewers(63);

  const advance = () => {
    setFading(true);
    setTimeout(() => {
      setScreen(s => s + 1);
      setFading(false);
      window.scrollTo({ top: 0 });
    }, 380);
  };

  const handleSuccess = () => { setDone(true); setShowOverlay(true); };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@700;800;900&display=swap');
        @keyframes bar-stripes {
          0%   { background-position: 0 0; }
          100% { background-position: 17px 0; }
        }
        .occ-bar {
          background-color: #F97316;
          background-image: repeating-linear-gradient(45deg, transparent 0px, transparent 6px, rgba(255,255,255,0.2) 6px, rgba(255,255,255,0.2) 12px);
          background-size: 17px 17px;
          transition: width 1.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          animation: bar-stripes 0.7s linear infinite;
        }
      `}</style>

      <div
        className="transition-opacity"
        style={{ transitionDuration: "380ms", opacity: fading ? 0 : 1 }}
      >
        {screen === 0 && <Screen0 onNext={advance}/>}
        {screen === 1 && <Screen1 onNext={advance}/>}
        {screen === 2 && <Screen2 onNext={advance}/>}
        {screen === 3 && <Screen3 onNext={advance}/>}
        {screen === 4 && (
          <Screen4 viewers={viewers} done={done} onSuccess={handleSuccess}/>
        )}
      </div>

      {/* Success overlay */}
      {showOverlay && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center px-5">
          <div className="text-center max-w-sm w-full">
            <div className="w-20 h-20 rounded-full bg-[#25D366] flex items-center justify-center mx-auto mb-6">
              <Check size={36} className="text-white"/>
            </div>
            <h3 className="text-white font-black text-3xl mb-2" style={PP}>¡Cupo Confirmado!</h3>
            <p className="text-white/60 mb-1">
              Te esperamos el{" "}
              <strong className="text-white">Domingo 9 de Agosto</strong>
            </p>
            <p className="text-[#F97316] font-black text-xl mb-8">6:00 PM EST · En vivo</p>
            <a href={WA_LINK}
              onClick={() => setShowOverlay(false)}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full bg-[#25D366] hover:bg-[#1DB954] text-white font-bold py-5 rounded-2xl text-lg transition-all duration-200 cursor-pointer hover:scale-[1.02]"
              style={PP}>
              {WA_SVG}
              Entrar al grupo de WhatsApp
            </a>
            <p className="text-white/25 text-xs mt-4">
              Recibirás el link de la clase en el grupo
            </p>
          </div>
        </div>
      )}
    </>
  );
}
