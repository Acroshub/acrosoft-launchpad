import { useState, useEffect } from "react";
import { Check, Star, AlertTriangle, Eye, ShieldCheck, ArrowDown, Megaphone, Globe, CalendarCheck, Lock, LockOpen } from "lucide-react";

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

// ── META PIXEL ────────────────────────────────────────────────────────────────
const PIXEL_ID = "1013028214851437";

function fbq(...args: unknown[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fn = (window as any).fbq;
  if (typeof fn === "function") fn(...args);
}

function initPixel() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (w.fbq) return;
  const n = (w.fbq = function (...a: unknown[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (n as any).callMethod ? (n as any).callMethod(...a) : (n as any).queue.push(a);
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!w._fbq) w._fbq = n;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (n as any).push = n; (n as any).loaded = true; (n as any).version = "2.0"; (n as any).queue = [];
  const t = document.createElement("script");
  t.async = true;
  t.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(t);
  // noscript fallback
  const ns = document.createElement("noscript");
  const img = document.createElement("img");
  img.height = 1; img.width = 1;
  img.style.display = "none";
  img.src = `https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`;
  ns.appendChild(img);
  document.head.appendChild(ns);
}

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

  const base = "bg-[#F9F6F2] border border-[#E5E0D8] focus:border-[#1B3A2D] rounded-lg text-[#1B3A2D] text-base outline-none transition-colors";

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input type="text" placeholder="Nombre y Apellido" value={name}
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
          <span className="block text-lg">Sí, quiero más trabajos →</span>
          <span className="block text-xs font-normal opacity-70 mt-0.5">Muéstrame cómo funciona</span>
        </button>
      </div>
    </div>
  );
}

// ── SCREEN 1 — MINI-QUIZ ──────────────────────────────────────────────────────
function Screen1({ onNext }: { onNext: () => void }) {
  const options = [
    "Dependo de que me recomienden — y los referidos no siempre llegan",
    "Ya gasté en publicidad y el dinero se fue sin resultado",
    "Hay meses que casi no hay trabajo. Pero igual hay que pagar el truck, el seguro y la renta.",
    "No soy muy bueno con la tecnología ni con el internet",
    "Tengo meses buenos y meses en que casi no hay trabajo",
  ];

  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggle = (i: number) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(i)) next.delete(i); else next.add(i);
    return next;
  });

  const pct = Math.round((selected.size / options.length) * 100);

  const urgencyLabel =
    selected.size === 0 ? "" :
    selected.size === 1 ? "Tu negocio puede mejorar" :
    selected.size === 2 ? "Esto te está costando clientes" :
    selected.size === 3 ? "Necesitas aprender esto cuanto antes" :
    selected.size === 4 ? "¡Esto tiene solución! No pares, sigue para ver cómo" :
    "¡Entendemos exactamente lo que vives. Hay solución!";

  const urgencyColor = selected.size <= 2 ? "#F97316" : "#dc2626";

  return (
    <div className="min-h-screen bg-[#FDF8F3] flex flex-col items-center justify-center px-6 py-20">
      <div className="max-w-lg w-full">

        <h2 className="text-[#1B3A2D] font-black leading-[1.2] mb-2"
          style={{ ...PP, fontSize: "clamp(1.6rem, 4vw, 2.2rem)" }}>
          ¿Cuál de estas frases te describe a ti y tu negocio hoy mismo?
        </h2>
        <p className="text-[#9CA3AF] text-sm mb-8">Selecciona todo lo que te aplica</p>

        <div className="space-y-3 mb-8">
          {options.map((opt, i) => (
            <button key={i} onClick={() => toggle(i)}
              className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-colors duration-150 cursor-pointer ${
                selected.has(i)
                  ? "bg-[#1B3A2D] border-[#1B3A2D] text-white"
                  : "bg-white border-[#E5DDD5] text-[#1B3A2D] hover:border-[#1B3A2D]/40"
              }`} style={PP}>
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                  selected.has(i) ? "bg-[#F97316] border-[#F97316]" : "border-[#D1C9BF]"
                }`}>
                  {selected.has(i) && <Check size={10} className="text-white" strokeWidth={3}/>}
                </div>
                <span className="text-sm font-medium leading-snug">{opt}</span>
              </div>
            </button>
          ))}
        </div>

        {selected.size > 0 && (
          <>
            <div className="mb-7">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-black" style={{ color: urgencyColor }}>{urgencyLabel}</span>
                <span className="text-xs font-black" style={{ color: urgencyColor }}>{pct}%</span>
              </div>
              <div className="h-3 bg-[#E5DDD5] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: urgencyColor }}/>
              </div>
            </div>

            <button onClick={onNext}
              className="w-full bg-[#1B3A2D] hover:bg-[#142D22] text-white font-bold px-8 py-5 rounded-2xl transition-colors duration-200 cursor-pointer"
              style={PP}>
              <span className="block text-base">Esto me está pasando a mí →</span>
              <span className="block text-xs font-normal opacity-55 mt-0.5">Quiero ver qué puedo hacer</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── SCREEN 2 — EMPATÍA ───────────────────────────────────────────────────────
function Screen2({ onNext }: { onNext: () => void }) {
  return (
    <div className="min-h-screen bg-[#FDF8F3] flex flex-col items-center justify-center px-6 py-20">
      <div className="max-w-lg w-full">

        <h2 className="text-[#1B3A2D] font-black leading-[1.2] mb-5"
          style={{ ...PP, fontSize: "clamp(1.75rem, 4.5vw, 2.6rem)" }}>
          Te entendemos.{" "}
          <span className="text-[#F97316]">No es que tu trabajo sea malo.</span>{" "}
        </h2>

        <div className="space-y-4 mb-8">        
          <p className="text-[#374151] text-base leading-relaxed">
            Es que nadie te enseñó cómo conseguir clientes — sin esperar referidos, sin depender de agencias, y sin necesitar saber de tecnología.
          </p>
          <p className="text-[#1B3A2D] font-black text-base leading-relaxed">
            Eso no es culpa tuya. Pero sí tiene solución.
          </p>
        </div>

        <button onClick={onNext}
          className="w-full bg-[#1B3A2D] hover:bg-[#142D22] text-white font-bold px-8 py-5 rounded-2xl transition-colors duration-200 cursor-pointer"
          style={PP}>
          <span className="block text-base">Quiero ver cuál es la solución →</span>
        </button>
      </div>
    </div>
  );
}

// ── SCREEN 3 — REVELACIÓN APC ─────────────────────────────────────────────────
function Screen3({ onNext }: { onNext: () => void }) {
  return (
    <div className="min-h-screen bg-[#FDF8F3] flex flex-col items-center justify-center px-6 py-20">
      <div className="max-w-lg w-full">

        <h2 className="text-[#1B3A2D] font-black leading-[1.2] mb-6"
          style={{ ...PP, fontSize: "clamp(1.6rem, 4vw, 2.2rem)" }}>
          El secreto está en un{" "}
          <span className="text-[#F97316]">Método de 3 Pasos</span>{" "}
          para que:
        </h2>

        <div className="bg-[#1B3A2D] rounded-2xl p-6 mb-8">
          <ul className="text-[#FDF8F3] leading-relaxed text-base space-y-3">
            {[
              "Puedas cobrar caro y aún así cerrar ventas sin quejas.",
              "No dependas de referidos.",
              "No gastes dinero cada mes con agencias de marketing carísimas que no conocen tu negocio.",
              "Los clientes te encuentren solos en internet y te llamen directamente a ti.",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="shrink-0 w-2 h-2 rounded-full bg-[#F97316]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[#1B3A2D] leading-relaxed text-base font-semibold mb-8" style={PP}>
          Este método es{" "}
          <span className="text-[#F97316] font-black">"El Método APC"</span>.{" "}
          <strong>Y mientras tú lees esto, hay otros que ya lo están usando y te están quitando clientes.</strong>
        </p>

        <button onClick={onNext}
          className="w-full bg-[#F97316] hover:bg-[#EA6B00] text-white font-bold px-8 py-5 rounded-2xl transition-colors duration-200 cursor-pointer"
          style={PP}>
          <span className="block text-base">Quiero conocer el "Método de 3 pasos APC" →</span>
        </button>
      </div>
    </div>
  );
}

// ── SCREEN 4 — LA SOLUCIÓN ───────────────────────────────────────────────────
function Screen4({ onNext }: { onNext: () => void }) {
  const [sub, setSub] = useState(0);

  const steps = [
    {
      num: 1, letter: "A", label: "Anuncios",
      icon: <Megaphone size={20} className="text-[#F97316]"/>,
      body: "No sirve cualquier anuncio. Las agencias de marketing no conocen tu negocio al 100% y hacen anuncios genéricos que no funcionan para tree service. Lo que sí funciona son anuncios que otros dueños de tree service ya probaron y dieron resultado. Adáptalos para tu negocio.",
    },
    {
      num: 2, letter: "P", label: "Página Web",
      icon: <Globe size={20} className="text-[#F97316]"/>,
      body: "No sirve cualquier página. La mayoría tiene una página bonita pero nadie llama. Eso pasa porque no está hecha para tree service. Una página que funciona le dice al cliente en segundos por qué llamarte a ti — y no a tu competencia.",
    },
    {
      num: 3, letter: "C", label: "Calendario",
      icon: <CalendarCheck size={20} className="text-[#F97316]"/>,
      body: "No sirve solo tener un número de teléfono. Cuando el cliente llama y tú no contestas, llama al siguiente. Y ese trabajo se pierde. Con un calendario, el cliente agenda solo — aunque tú estés en el trabajo. Es la única forma de no perder ninguna cita.",
    },
  ];

  // Sub-screens 0-2: one step each. Sub-screen 3: summary + CTA.
  if (sub <= 2) {
    const step = steps[sub];
    return (
      <div className="min-h-screen bg-[#1B3A2D] flex flex-col items-center justify-center px-6 py-20">
        <style>{`
          @keyframes unlock-shake {
            0%,60%,100% { transform: rotate(0deg) translateY(0); }
            15% { transform: rotate(-14deg) translateY(-3px); }
            30% { transform: rotate(0deg) translateY(-5px); }
            45% { transform: rotate(14deg) translateY(-3px); }
          }
          .lock-anim { animation: unlock-shake 2.2s ease-in-out infinite; }
        `}</style>
        <div className="max-w-lg w-full">

          {/* Intro text — always visible */}
          <h2 className="text-[#FDF8F3] font-black leading-[1.1] mb-2"
            style={{ ...PP, fontSize: "clamp(1.7rem, 4vw, 2.5rem)" }}>
            ¿Qué es el{" "}
            <span className="text-[#F97316]">Método APC?</span>
          </h2>
          <p className="text-[#F97316] font-bold leading-snug mb-4"
            style={{ ...PP, fontSize: "clamp(0.95rem, 2.2vw, 1.1rem)" }}>
            Es importante que lo aprendas ahora, antes de que tu competencia lo aplique primero.
          </p>
          <p className="text-[#FDF8F3]/60 text-base leading-relaxed mb-6">
            Son 3 pasos simples. Cada uno por separado no funcionará.{" "}
            <strong className="text-white">Pero si lo haces bien desde un inicio te traen clientes nuevos cada semana.</strong>
          </p>

          {/* Roadmap */}
          <div className="flex items-center gap-1.5 mb-6">
            {steps.map((s, i) => {
              const unlocked = i <= sub;
              return (
                <div key={i} className="flex items-center gap-1.5 flex-1">
                  <div className={`flex-1 rounded-xl px-2.5 py-2 flex flex-col gap-1 border transition-all duration-300 ${
                    unlocked ? "bg-[#F97316]/15 border-[#F97316]/40" : "bg-white/5 border-white/10"
                  }`}>
                    <span className={`text-[8px] font-bold tracking-widest uppercase leading-none ${unlocked ? "text-[#F97316]/60" : "text-white/20"}`}>
                      Paso {i + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      {unlocked
                        ? <LockOpen size={10} className="text-[#F97316] shrink-0" />
                        : <Lock size={10} className="text-white/25 shrink-0" />
                      }
                      <span className={`text-[10px] font-bold leading-none truncate tracking-widest ${unlocked ? "text-[#F97316]" : "text-white/25"}`}>
                        {unlocked ? s.label : "••••••"}
                      </span>
                    </div>
                  </div>
                  {i < 2 && <span className="text-white/20 text-xs shrink-0">›</span>}
                </div>
              );
            })}
          </div>

          {/* Step card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-8">
            <p className="text-[#F97316]/70 text-xs font-bold tracking-widest uppercase mb-4">
              Paso {step.num} de 3 · Método APC
            </p>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-[#F97316] flex items-center justify-center shrink-0">
                <span className="text-white font-black text-2xl leading-none" style={PP}>{step.num}</span>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  {step.icon}
                  <h2 className="text-[#F97316] font-black text-2xl leading-none" style={PP}>{step.label}</h2>
                </div>
                <p className="text-white/30 text-[10px] font-bold tracking-widest uppercase">{step.letter} — Método APC</p>
              </div>
            </div>
            <p className="text-[#FDF8F3]/85 text-sm leading-relaxed">{step.body}</p>
          </div>

          {/* Next button */}
          {sub < 2 ? (
            <button onClick={() => setSub(s => s + 1)}
              className="w-full bg-[#F97316] hover:bg-[#EA6B00] text-white font-bold px-8 py-5 rounded-2xl transition-colors duration-200 cursor-pointer flex items-center justify-center gap-3"
              style={PP}>
              <span className="text-lg">{`Ver paso ${step.num + 1}`}</span>
              <LockOpen size={22} className="lock-anim shrink-0" />
            </button>
          ) : (
            <>
              <button onClick={onNext}
                className="w-full bg-[#F97316] hover:bg-[#EA6B00] text-white font-bold px-8 py-5 rounded-2xl transition-colors duration-200 cursor-pointer"
                style={PP}>
                <span className="block text-lg">Quiero aprender este método Gratis →</span>
                <span className="block text-xs font-normal opacity-80 mt-1">Antes de que mi competencia lo haga</span>
              </button>
              <p className="text-center text-[#FDF8F3]/40 text-xs mt-3">
                Clase en vivo · Domingo 9 de Agosto · 6 PM EST · 100% gratis
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  // Sub-screen 4: summary + CTA
  return (
    <div className="min-h-screen bg-[#1B3A2D] flex flex-col items-center justify-center px-6 py-20">
      <div className="max-w-lg w-full">

        <div className="text-center mb-8">
          <p className="text-[#FDF8F3] font-black leading-tight mb-3"
            style={{ ...PP, fontSize: "clamp(1.6rem, 4vw, 2.2rem)" }}>
            ¿Quieres que te enseñemos a aplicar este método{" "}
            <span className="text-[#F97316]">Rápido, Fácil y Gratis?</span>
          </p>
          <p className="text-[#FDF8F3]/50 text-base">Antes de que tu competencia lo haga</p>
        </div>

        <button onClick={onNext}
          className="w-full bg-[#F97316] hover:bg-[#EA6B00] text-white font-bold px-8 py-5 rounded-2xl transition-colors duration-200 cursor-pointer"
          style={PP}>
          <span className="block text-lg">Sí, quiero la clase gratis →</span>
          <span className="block text-xs font-normal opacity-70 mt-0.5">Clase en vivo · Domingo 9 de Agosto · 6 PM EST · 100% gratis</span>
        </button>
      </div>
    </div>
  );
}

// ── SCREEN 5 — FECHA + REGISTRO + TESTIMONIOS ────────────────────────────────
function Screen5({ viewers, done, onSuccess }: { viewers: number; done: boolean; onSuccess: () => void }) {
  const timer = useCountdown();
  const pct   = Math.round((TAKEN_SPOTS / TOTAL_SPOTS) * 100);
  const [barFilled, setBarFilled] = useState(false);
  useEffect(() => { const t = setTimeout(() => setBarFilled(true), 300); return () => clearTimeout(t); }, []);

  const testimonials = [
    {
      name: "Miguel Hernández",
      location: "Houston, TX",
      result: "De 3 a 22 trabajos en 4 semanas",
      text: "El primer mes cerré 22 trabajos. Antes con suerte llegaba a 3 en todo el mes.",
    },
    {
      name: "Carlos Reyes",
      location: "Dallas, TX",
      result: "4 clientes nuevos por semana · $15/día",
      text: "Gasto $15 al día y me llaman 4 clientes nuevos cada semana. Sin ninguna agencia.",
    },
    {
      name: "Luis Mendoza",
      location: "Miami, FL",
      result: "Triplicó trabajos en 30 días",
      text: "En 30 días triplicamos los trabajos. Llevaba 2 años esperando que me recomendaran.",
    },
  ];

  return (
    <div className="bg-[#FDF8F3] px-5 py-16">
      <div className="max-w-md mx-auto">

        {/* Fecha */}
        <h2 className="text-[#1B3A2D] font-black leading-[1.15] mb-2 text-center"
          style={{ ...PP, fontSize: "clamp(1.7rem, 4vw, 2.5rem)" }}>
          Este{" "}
          <span className="text-[#F97316]">Domingo 9 de Agosto</span>{" "}
          aprenderás{" "}
          <span className="text-[#F97316]">Gratis</span>{" "}
          a aplicar el Método APC
        </h2>

        <p className="text-[#4B5563] text-sm mb-6 leading-relaxed text-center">
          <strong className="text-[#F97316]">6:00 PM EST</strong> · En vivo.{" "}
          <strong className="text-[#1B3A2D]">La grabación solo para los que se registren.</strong>
        </p>

        {/* Tarjeta única: urgencia + formulario */}
        <div className="bg-white border border-[#E5DDD5] rounded-2xl overflow-hidden shadow-xl mb-10">

          {/* Zona verde: countdown + viewers + barra */}
          <div className="bg-[#1B3A2D] px-5 pt-5 pb-4">
            <p className="text-white/30 text-[10px] font-bold tracking-[2px] uppercase mb-3 text-center">
              La clase empieza en
            </p>
            <div className="flex items-start justify-center gap-2 mb-4">
              <CountBox value={timer.days}    label="Días"/>
              <span className="text-white/20 text-xl font-black mt-3">:</span>
              <CountBox value={timer.hours}   label="Horas"/>
              <span className="text-white/20 text-xl font-black mt-3">:</span>
              <CountBox value={timer.minutes} label="Min"/>
              <span className="text-white/20 text-xl font-black mt-3">:</span>
              <CountBox value={timer.seconds} label="Seg"/>
            </div>

            {/* Viewers + barra integrados */}
            <div className="bg-white/[0.07] rounded-xl px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Eye size={11} className="text-[#F97316]"/>
                  <span className="text-white/50 text-[11px]">
                    <strong className="text-[#F97316] font-black">{viewers}</strong> personas quieren registrarse ahora
                  </span>
                </div>
                <span className="text-[#F97316] font-black text-[11px]">{pct}% lugares tomados</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full occ-bar" style={{ width: barFilled ? `${pct}%` : "0%" }}/>
              </div>
            </div>
          </div>

          {/* Separador con label */}
          <div className="border-b border-[#F0E8E0] px-6 py-3 text-center bg-[#FDF8F3]">
            <p className="text-[#1B3A2D] font-black text-lg flex items-center justify-center gap-2" style={PP}>
              <ArrowDown size={18} strokeWidth={3} className="text-[#1B3A2D]"/>
              Regístrate Aquí
              <ArrowDown size={18} strokeWidth={3} className="text-[#1B3A2D]"/>
            </p>
          </div>

          {/* Formulario */}
          <div className="p-6">
            {done ? <SuccessState/> : <RegForm onSuccess={onSuccess}/>}
          </div>
        </div>

        {/* Instructor */}
        <div className="bg-[#1B3A2D] rounded-2xl overflow-hidden mb-8">
          <div className="flex items-start gap-4 p-5">
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <img
                src="/picprofilewebsite.jpg"
                alt="Ing. Daniel Acero"
                className="w-20 h-20 rounded-xl object-cover object-top"
              />
              <div className="bg-white rounded-xl px-3 py-1.5 flex items-center justify-center w-20">
                <img src="https://asset.brandfetch.io/idWvz5T3V7/idqXDhX7JG.png" alt="Meta" className="h-6 w-auto"/>
              </div>
            </div>
            <div className="min-w-0">
              <span className="text-[#F97316] text-[10px] font-bold tracking-[2px] uppercase block mb-1">Tu instructor</span>
              <p className="text-white font-black text-base leading-tight mb-0.5" style={PP}>Ing. Daniel Acero</p>
              <p className="text-white/50 text-xs mb-2">Experto en Meta Ads · Facebook & Instagram</p>
              <p className="text-white/70 text-xs leading-relaxed">
                Ha ayudado a más de 50 negocios latinos en USA a conseguir clientes sin ser expertos en tecnología.
              </p>
            </div>
          </div>
          <div className="border-t border-white/10 px-4 py-4 grid grid-cols-3 gap-2">
            {[
              { value: "+$100K", label: "en Meta Ads gestionados" },
              { value: "6 años", label: "de experiencia" },
              { value: "50+",    label: "negocios latinos ayudados" },
            ].map((b) => (
              <div key={b.value} className="bg-white/[0.07] border border-white/10 rounded-xl p-3 flex flex-col items-center text-center gap-1.5">
                <ShieldCheck size={16} className="text-[#F97316] shrink-0"/>
                <span className="text-white font-black text-base leading-none" style={PP}>{b.value}</span>
                <span className="text-white/75 text-[10px] leading-snug">{b.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Social proof */}
        <p className="text-[#9CA3AF] text-xs font-bold text-center uppercase tracking-widest mb-5">
          Lo que dicen otros dueños de tree service
        </p>
        <div className="space-y-3">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-white border border-[#E5DDD5] rounded-xl p-4 shadow-sm">
              <Stars/>
              <div className="mt-2.5 mb-2.5 inline-block bg-[#1B3A2D]/6 border border-[#1B3A2D]/10 rounded-lg px-3 py-1">
                <p className="text-[#1B3A2D] text-xs font-black">{t.result}</p>
              </div>
              <p className="text-[#374151] text-sm leading-relaxed italic mb-2.5">"{t.text}"</p>
              <div>
                <p className="text-[#1B3A2D] text-xs font-black">{t.name}</p>
                <p className="text-[#9CA3AF] text-[11px]">Tree Service · {t.location}</p>
              </div>
            </div>
          ))}
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
        onClick={() => fbq("track", "Lead")}
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

  useEffect(() => {
    initPixel();
    fbq("init", PIXEL_ID);
    fbq("track", "PageView");
    fbq("track", "ViewContent");
  }, []);

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
        {screen === 4 && <Screen4 onNext={advance}/>}
        {screen === 5 && <Screen5 viewers={viewers} done={done} onSuccess={handleSuccess}/>}
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
              onClick={() => { fbq("track", "Lead"); setShowOverlay(false); }}
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
