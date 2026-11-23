import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { ArrowRight, Globe, ListChecks, MonitorSmartphone, Palette, Rocket } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { GoogleLogo, MetaLogo } from "@/components/shared/PartnerBadgeLogos";
import PhoneInput from "@/components/shared/PhoneInput";
import WhatsAppIcon from "@/components/shared/WhatsAppIcon";
import { CT_CSS } from "@/components/estimados/consultoriaTreeStyles";
import { EST_CSS, EST_FONT_HREF } from "@/components/estimados/estimadosStyles";
import { EST_CSS_EXTRA } from "@/components/estimados/estimadosStylesExtra";
import { WT_CSS } from "@/components/website-tree/websiteTreeStyles";
import { WTG_CSS } from "@/components/website-tree/websiteTreeGameStyles";
import {
  WEBSITE_TREE_CONFIRMATIONS, WEBSITE_TREE_DELIVERY_DAYS, WEBSITE_TREE_DISPLAY_SLOTS, WEBSITE_TREE_FN, WEBSITE_TREE_FREE_MONTHS,
  WEBSITE_TREE_MAX_SERVICES, WEBSITE_TREE_MONTHLY_LIMIT, WEBSITE_TREE_PIXEL_ID, WEBSITE_TREE_SERVICE_SUGGESTIONS,
  WEBSITE_TREE_SLUG, buildWebsiteTreeBody, emptyWebsiteTreeForm, validateWebsiteTreeStep1, validateWebsiteTreeStep2, websiteTreeConfirmUrl, websiteTreeSupportUrl,
  websiteTreeEventParams,
} from "@/lib/websiteTreeConfig";
import type { WebsiteTreeConfirmId, WebsiteTreeForm } from "@/lib/websiteTreeConfig";
import { isEstimadosPreview } from "@/lib/estimadosPreview";
import { initMetaPixel, trackMetaEvent } from "@/lib/metaPixel";
import { addNoindex } from "@/lib/piscinasFunnel";
import { uuid } from "@/lib/uuid";

// /website-tree-game — versión GAMIFICADA de /website-tree (prueba). Misma oferta, mismo backend (Edge Function website-tree-request, 10 cupos al mes), mismo pixel y mismo formulario
// de 2 pasos en popup; lo que cambia es el recorrido: en vez de una página larga, la persona avanza pantalla por pantalla (como la landing gamificada «Clase gratis» de tree service):
//   0. Hero (textos y foto de /website-tree) · 1. Mini-quiz de una sola respuesta · 2. «¿Cómo te gustaría tu website?» (varias respuestas) · 3. «¿Por qué la website que te ofrecemos es gratis?» (solo la pregunta + botón circular) ·
//   4. La respuesta con icono de crecimiento y badges de Meta y Google (sin precios aún) · 5. «Qué incluye tu website gratis»: checklist directa con iconos (sin ejemplos) ·
//   6. Formulario en 3 partes (tus datos → tu website → confirmaciones Sí/No) dentro de la misma página, sin popup; al enviar, confirma por WhatsApp. Ya no hay «3 pasos» ni pantalla final de cupos/precio.
// A propósito NO se copiaron de la landing original los «N personas quieren registrarse ahora», los registros recientes inventados ni los testimonios con cifras: eran datos falsos.
// Aquí la única escasez que se muestra es la real: los cupos del mes que cuenta el servidor.
// Vista previa sin enviar nada: `?demo=1` (desarrollo) o `?demo=<ESTIMADOS_PREVIEW_KEY>` (producción). Nace con noindex como el resto del embudo.

const PAGE_TITLE = "Website gratis para negocios de tree service | Diseñada y entregada en 2 días";
const IS_DEMO = isEstimadosPreview();
const IMG = "/website-tree";

/** Mini-quiz de la pantalla 1: una sola respuesta, la que más se parece a su negocio hoy (no se envía a ningún lado). */
const QUIZ_OPTIONS = [
  "No tengo website",
  "Tengo un website, pero se ve viejo",
];

/** «Qué incluye tu website gratis» (la misma lista de /website-tree), cada punto con su icono. */
const INCLUDES: { icon: LucideIcon; text: ReactNode }[] = [
  { icon: Globe, text: <><b>{WEBSITE_TREE_FREE_MONTHS} Meses gratis</b> de Dominio y Hosting</> },
  { icon: Palette, text: <>Diseño con <b>tu marca, tus colores y tu logo</b></> },
  { icon: MonitorSmartphone, text: <>Se ve perfecto en <b>celular y computadora</b></> },
  { icon: Rocket, text: <>Lista para publicar en <b>máximo {WEBSITE_TREE_DELIVERY_DAYS} días</b></> },
];

/** Pantalla 2: cómo le gustaría su website (se pueden marcar varias; no se envía a ningún lado). */
const WANT_OPTIONS = [
  "Que me traiga más clientes",
  "Que se vea profesional",
  "Que aparezca en Google",
  "Que sea fácil de usar",
];

/** Icono animado de «crecimiento del negocio»: barras que suben y una flecha de tendencia que se dibuja (se detiene con prefers-reduced-motion). */
const GrowthIcon = () => (
  <svg className="wtg-grow" viewBox="0 0 112 112" role="img" aria-label="Crecimiento de tu negocio">
    <rect className="wtg-grow-base" x="8" y="102" width="96" height="4" rx="2" />
    <rect className="wtg-grow-bar b1" x="14" y="80" width="16" height="22" rx="4" />
    <rect className="wtg-grow-bar b2" x="38" y="68" width="16" height="34" rx="4" />
    <rect className="wtg-grow-bar b3" x="62" y="56" width="16" height="46" rx="4" />
    <rect className="wtg-grow-bar b4" x="86" y="44" width="16" height="58" rx="4" />
    <path className="wtg-grow-line" pathLength={100} d="M10 56 L38 42 L60 32 L98 10" />
    <path className="wtg-grow-head" d="M82 8 L98 10 L92 25" />
  </svg>
);

const LAST_SCREEN = 6;

const ICON: Record<string, ReactNode> = {
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  gift: <><rect x="4" y="9" width="16" height="11" rx="2" /><path d="M12 9v11M3.5 9h17" /><path d="M12 9c-3 0-4.6-1.4-4.6-2.8S9 3.6 10.4 4.6C11.4 5.3 12 7 12 9zM12 9c3 0 4.6-1.4 4.6-2.8S15 3.6 13.6 4.6C12.6 5.3 12 7 12 9z" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  pin: <><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />,
  shield: <><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" /><path d="M9 12l2 2 4-4" /></>,
  bolt: <path d="M13 3L5 13.5h6L10 21l8-10.5h-6z" />,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z" /></>,
};
const Ic = ({ id }: { id: keyof typeof ICON }) => <svg className="est-ic" viewBox="0 0 24 24" aria-hidden="true">{ICON[id]}</svg>;

/** Bandera de Estados Unidos en SVG (los emojis de bandera no se ven en Windows: salen como «US»). */
const UsFlag = () => (
  <svg className="wt-flag" viewBox="0 0 26 18" role="img" aria-label="Estados Unidos">
    <rect width="26" height="18" rx="2.2" fill="#fff" />
    {[0, 2, 4, 6, 8, 10, 12].map((i) => <rect key={i} y={(i * 18) / 13} width="26" height={18 / 13} fill="#B22234" />)}
    <rect width="11" height={(7 * 18) / 13} fill="#3C3B6E" />
    {[0, 1, 2, 3].flatMap((r) => [0, 1, 2].map((c) => <circle key={`${r}${c}`} cx={2.2 + c * 3.3 + (r % 2) * 1.1} cy={1.6 + r * 2.1} r=".5" fill="#fff" />))}
    <rect width="26" height="18" rx="2.2" fill="none" stroke="rgba(0,0,0,.18)" />
  </svg>
);

type Slots = number | null; // null = aún no se sabe (cargando o sin respuesta)

/** Respuesta de la Edge Function website-tree-request. */
interface FnJson { ok?: boolean; already?: boolean; error?: string; slots_left?: number; waitlist?: boolean }
const errMsg = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

async function callFn(body: unknown): Promise<{ status: number; json: FnJson | null }> {
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${WEBSITE_TREE_FN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
    body: JSON.stringify(body),
  });
  let json: FnJson | null = null;
  try { json = await res.json() as FnJson; } catch { /* sin cuerpo */ }
  return { status: res.status, json };
}


const WebsiteTreeGame = () => {
  /** Lead una sola vez, y solo si el pedido es nuevo (un correo repetido en el mes no cuenta como lead nuevo). */
  const leadSent = useRef(false);
  const newLead = useRef(false);
  const [slots, setSlots] = useState<Slots>(null);
  const [form, setForm] = useState<WebsiteTreeForm>(emptyWebsiteTreeForm);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  /** La persona ya está en la lista de espera (cupos agotados): se le avisa cuando abran. */
  const [waitlisted, setWaitlisted] = useState(false);
  const [confirmedWa, setConfirmedWa] = useState(false);

  // ── Recorrido del juego ──
  const [screen, setScreen] = useState(0);
  const [fading, setFading] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [wants, setWants] = useState<Set<number>>(new Set());
  const toggleWant = (i: number) => setWants((p) => { const n = new Set(p); if (n.has(i)) n.delete(i); else n.add(i); return n; });
  const advance = () => {
    setFading(true);
    window.setTimeout(() => {
      setScreen((s) => Math.min(s + 1, LAST_SCREEN));
      setFading(false);
      window.scrollTo({ top: 0 });
    }, 380);
  };

  useEffect(() => {
    document.title = PAGE_TITLE;
    return addNoindex();
  }, []);

  useEffect(() => {
    if (IS_DEMO || !WEBSITE_TREE_PIXEL_ID) return;
    initMetaPixel(WEBSITE_TREE_PIXEL_ID);
    trackMetaEvent("PageView", undefined, undefined, WEBSITE_TREE_PIXEL_ID);
    trackMetaEvent("ViewContent", websiteTreeEventParams(), uuid(), WEBSITE_TREE_PIXEL_ID);
  }, []);

  // Lead: cuando la persona ve «Recibimos tu pedido. Solo falta confirmar.» (no en vista previa, ni si el correo ya había pedido este mes).
  useEffect(() => {
    if (!done || IS_DEMO || !WEBSITE_TREE_PIXEL_ID || leadSent.current || !newLead.current) return;
    leadSent.current = true;
    try { trackMetaEvent("Lead", websiteTreeEventParams(), uuid(), WEBSITE_TREE_PIXEL_ID); } catch { /* no crítico */ }
  }, [done]);

  // Cupos que quedan este mes (los calcula el servidor). Si no responde, la página sigue funcionando y el servidor decide al enviar.
  useEffect(() => {
    if (IS_DEMO) { setSlots(WEBSITE_TREE_MONTHLY_LIMIT); return; }
    let alive = true;
    callFn({ action: "slots" }).then(({ json }) => { if (alive && typeof json?.slots_left === "number") setSlots(json.slots_left); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // Cupos REALES (los cuenta el servidor): solo sirven para saber si se agotaron. Lo que se MUESTRA es min(reales, WEBSITE_TREE_DISPLAY_SLOTS):
  // «quedan 4» mientras haya más de 4 y, cuando los reales bajen de 4, el número real. Antes de que responda el servidor ya se muestra el número de presentación.
  const soldOut = slots === 0;
  const shown = slots === null ? WEBSITE_TREE_DISPLAY_SLOTS : Math.min(slots, WEBSITE_TREE_DISPLAY_SLOTS);
  /** Texto de cupos que acompaña a los botones de las vistas 0 y 1 (el número real lo calcula el servidor). */
  const cuposLabel = soldOut ? "Cupos agotados · anótate en la lista de espera" : `Quedan ${shown} de ${WEBSITE_TREE_MONTHLY_LIMIT} cupos este mes`;
  /** Al pasar de la parte 1 a la 2 del formulario (o al terminar), vuelve arriba. */
  const scrollPop = () => window.scrollTo?.({ top: 0 });
  const set = <K extends keyof WebsiteTreeForm>(k: K, v: WebsiteTreeForm[K]) => { setForm((f) => ({ ...f, [k]: v })); setError(""); };

  const setService = (i: number, value: string) => {
    setForm((f) => {
      const services = f.services.slice();
      services[i] = value;
      // Si borra el servicio que era el destacado, el destacado queda sin elegir.
      return { ...f, services, star: f.star === i && !value.trim() ? -1 : f.star };
    });
    setError("");
  };
  const addSuggestion = (text: string) => {
    setForm((f) => {
      if (f.services.some((s) => s.trim().toLowerCase() === text.toLowerCase())) return f;
      const i = f.services.findIndex((s) => !s.trim());
      if (i < 0) return f;
      const services = f.services.slice();
      services[i] = text;
      return { ...f, services };
    });
    setError("");
  };

  // Paso 1 → guarda el contacto (sin gastar cupo) y pasa al paso 2. Si los cupos están agotados, aquí termina: queda en lista de espera.
  const submitStep1 = async (e: FormEvent) => {
    e.preventDefault();
    const problem = validateWebsiteTreeStep1(form, false);
    if (problem) { setError(problem); return; }
    setError("");
    if (soldOut) {
      setBusy(true);
      try {
        if (!IS_DEMO) {
          const r = await callFn({ action: "lead", name: form.name, whatsapp: form.whatsapp, business: form.business });
          if (r.status !== 200) throw new Error(r.json?.error ?? "No pudimos guardar tus datos. Intenta de nuevo.");
        }
        setWaitlisted(true);
      } catch (err) { setError(errMsg(err, "No pudimos guardar tus datos. Intenta de nuevo.")); }
      finally { setBusy(false); }
      return;
    }
    if (!IS_DEMO) {
      // Se guarda en segundo plano: si falla, la persona igual sigue con su formulario.
      callFn({ action: "lead", name: form.name, whatsapp: form.whatsapp, business: form.business }).catch(() => {});
    }
    setStep(2);
    requestAnimationFrame(scrollPop);
  };

  const submitStep2 = async (e: FormEvent) => {
    e.preventDefault();
    const problem = validateWebsiteTreeStep2(form);
    if (problem) { setError(problem); return; }
    setError("");
    setBusy(true);
    try {
      if (IS_DEMO) { await new Promise((r) => setTimeout(r, 700)); }
      else {
        const r = await callFn(buildWebsiteTreeBody(form));
        if (r.status === 409) { setSlots(0); setWaitlisted(true); return; }
        if (r.status === 429) throw new Error("Demasiados intentos. Prueba de nuevo en un rato.");
        if (r.status !== 200 || !r.json?.ok) throw new Error(r.json?.error ?? "No pudimos enviar tu pedido. Intenta de nuevo.");
        if (typeof r.json.slots_left === "number") setSlots(r.json.slots_left);
        newLead.current = !r.json.already;
      }
      setDone(true);
      requestAnimationFrame(scrollPop);
    } catch (err) {
      setError(errMsg(err, "No pudimos enviar tu pedido. Intenta de nuevo."));
    } finally {
      setBusy(false);
    }
  };

  const answer = (id: WebsiteTreeConfirmId, v: "yes" | "no") => { setForm((f) => ({ ...f, answers: { ...f.answers, [id]: v } })); setError(""); };
  const starIdx = form.star;
  // Todos los datos son obligatorios (los servicios 2 a 6 son opcionales: «hasta 6»): mientras falte algo, «Continuar» y «Enviar» quedan deshabilitados.
  const step1Problem = validateWebsiteTreeStep1(form, false);
  const step2Problem = validateWebsiteTreeStep2(form);
  // Paso 2 (datos de la website): lo mismo que el validador completo pero sin exigir las confirmaciones, que ahora van en el paso 3.
  const websiteDataProblem = validateWebsiteTreeStep2({ ...form, answers: Object.fromEntries(WEBSITE_TREE_CONFIRMATIONS.map((c) => [c.id, "yes"])) as WebsiteTreeForm["answers"] });
  const someNo = WEBSITE_TREE_CONFIRMATIONS.some((c) => form.answers[c.id] === "no");
  const hasAnyService = form.services.some((s) => s.trim());


  // Avance: 0 a 5 = las vistas previas; 6 = formulario parte 1; 7 = parte 2; 8 = parte 3 (confirmaciones); 9 = pedido enviado.
  const progressIdx = screen < LAST_SCREEN ? screen : done || waitlisted ? 9 : step + 5;
  const progress = Math.round((progressIdx / 9) * 100);

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href={EST_FONT_HREF} rel="stylesheet" />
      {!IS_DEMO && WEBSITE_TREE_PIXEL_ID && (
        <noscript><img height="1" width="1" style={{ display: "none" }} src={`https://www.facebook.com/tr?id=${WEBSITE_TREE_PIXEL_ID}&ev=PageView&noscript=1`} alt="" /></noscript>
      )}
      <style>{EST_CSS + EST_CSS_EXTRA + CT_CSS + WT_CSS + WTG_CSS}</style>

      <div className="est-ty-root">
        <div className="est-page ct wt wtg" data-product={WEBSITE_TREE_SLUG} data-testid="game-root" data-screen={screen} aria-label="Website gratis para negocios de tree service">
          <div className="wtg-top" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Avance"><i style={{ width: `${progress}%` }} /></div>

          <div className={`wtg-fade${fading ? " is-out" : ""}`}>

            {/* ============ 0. PRIMERA VISTA: mismos textos y foto que el hero de /website-tree ============ */}
            {screen === 0 && (
              <section className="wtg-screen is-hero">
                <header className="est-hero wt-hero">
                  <div className="est-wrap">
                    <span className="est-eyebrow"><UsFlag />Dueños de negocio de tree service en USA</span>
                    <h1>Te regalamos tu <span className="est-hl">website profesional</span> para tu negocio de tree service</h1>
                    <ul className="wt-checks" aria-label="Lo que incluye">
                      <li><Ic id="check" /><span>Recíbelo en <b>Máximo {WEBSITE_TREE_DELIVERY_DAYS} Días</b></span></li>
                      <li><Ic id="check" /><span>Incluye <b>{WEBSITE_TREE_FREE_MONTHS} meses gratis</b> de mantenimiento (Hosting y Dominio)</span></li>
                    </ul>
                    <figure className="wt-hero-pic">
                      <img src={`${IMG}/hero-dueno.jpg`} width={1400} height={933} alt="Dueño de un negocio de tree service sonriendo y mostrando su website nueva en el celular y en la laptop, mientras un arborista poda un árbol grande" decoding="async" />
                    </figure>
                    <div style={{ marginTop: 20 }}>
                      <button type="button" className="wtg-btn" onClick={advance} data-testid="game-start">Quiero mi website gratis →<small>{cuposLabel}</small></button>
                    </div>
                  </div>
                </header>
              </section>
            )}

            {/* ============ 1. MINI-QUIZ (una sola respuesta) ============ */}
            {screen === 1 && (
              <section className="wtg-screen">
                <div className="wtg-in">
                  <span className="wtg-ico" aria-hidden="true"><ListChecks size={30} strokeWidth={2.2} /></span>
                  <h2 className="wtg-h2">¿Cuál de estas frases describe a tu negocio hoy?</h2>
                  <p className="wtg-note" style={{ margin: "10px 0 20px" }}>Elige la que más se parece a ti</p>
                  <div className="wtg-opts" role="radiogroup" aria-label="Elige la que más se parece a tu negocio">
                    {QUIZ_OPTIONS.map((opt, i) => (
                      <button key={opt} type="button" role="radio" aria-checked={picked === i} className={`wtg-opt${picked === i ? " is-on" : ""}`} onClick={() => setPicked(i)}>
                        <i aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></i>
                        <span>{opt}</span>
                      </button>
                    ))}
                  </div>
                  {picked !== null && (
                    <button type="button" className="wtg-btn" onClick={advance}>Sí, quiero resolverlo gratis →<small>{cuposLabel}</small></button>
                  )}
                </div>
              </section>
            )}

            {/* ============ 2. ¿CÓMO TE GUSTARÍA TU WEBSITE? (varias respuestas) ============ */}
            {screen === 2 && (
              <section className="wtg-screen">
                <div className="wtg-in">
                  <span className="wtg-ico" aria-hidden="true"><MonitorSmartphone size={30} strokeWidth={2.2} /></span>
                  <h2 className="wtg-h2">¿Cómo te gustaría tu website?</h2>
                  <p className="wtg-note" style={{ margin: "10px 0 20px" }}>Marca todo lo que quieras</p>
                  <div className="wtg-opts" role="group" aria-label="Marca todo lo que quieras">
                    {WANT_OPTIONS.map((opt, i) => (
                      <button key={opt} type="button" aria-pressed={wants.has(i)} className={`wtg-opt${wants.has(i) ? " is-on" : ""}`} onClick={() => toggleWant(i)}>
                        <i aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></i>
                        <span>{opt}</span>
                      </button>
                    ))}
                  </div>
                  {wants.size > 0 && (
                    <button type="button" className="wtg-btn" onClick={advance}>Así quiero mi website →<small>{cuposLabel}</small></button>
                  )}
                </div>
              </section>
            )}

            {/* ============ 3. ¿POR QUÉ LA WEBSITE ES GRATIS? Solo la pregunta y el botón circular de siguiente ============ */}
            {screen === 3 && (
              <section className="wtg-screen">
                <div className="wtg-in wtg-center">
                  <h2 className="wtg-h2 wtg-big">¿Por qué la website que te ofrecemos es <span className="wtg-hl">gratis?</span></h2>
                  <button type="button" className="wtg-round" onClick={advance} aria-label="Continuar" data-testid="game-round"><ArrowRight size={30} strokeWidth={2.6} /></button>
                </div>
              </section>
            )}

            {/* ============ 4. LA RESPUESTA: texto + icono animado de crecimiento + badges de Meta y Google. Sin precios todavía ============ */}
            {screen === 4 && (
              <section className="wtg-screen">
                <div className="wtg-in wtg-center">
                  <GrowthIcon />
                  <p className="wtg-why-text">Porque también ayudamos a negocios a conseguir más clientes usando Anuncios en Facebook y Google. <u>Y queremos que conozcas nuestro trabajo, así si nos llevamos bien, en un futuro podemos seguir trabajando juntos.</u></p>
                  <ul className="wt-badges" aria-label="Respaldo profesional">
                    <li><MetaLogo /><span><b>Meta</b> Media Buying Professional</span></li>
                    <li><GoogleLogo /><span><b>Google</b> Marketing Certified</span></li>
                  </ul>
                  <button type="button" className="wtg-btn" onClick={advance} data-testid="game-why-next">Sí, sigamos con mi website →<small>Mira ejemplos y todo lo que incluye</small></button>
                </div>
              </section>
            )}

            {/* ============ 5. QUÉ INCLUYE tu website gratis: checklist directa, cada punto con su icono ============ */}
            {screen === 5 && (
              <section className="wtg-screen">
                <div className="wtg-in">
                  <h2 className="wtg-h2 wtg-h2--sm">Qué incluye tu website <span className="wtg-hl">gratis</span></h2>
                  <ul className="wtg-inc" aria-label="Qué incluye tu website gratis">
                    {INCLUDES.map(({ icon: Icon, text }, i) => (
                      <li key={i}><span className="wtg-inc-ico" aria-hidden="true"><Icon size={26} strokeWidth={2} /></span><span className="wtg-inc-txt">{text}</span></li>
                    ))}
                  </ul>
                  <button type="button" className="wtg-btn" onClick={advance} data-testid="game-to-form">{soldOut ? "Anotarme en la lista" : "Quiero mi website gratis"} →<small>{cuposLabel}</small></button>
                </div>
              </section>
            )}

            {/* ============ 6. FORMULARIO: parte 1 (tus datos) y parte 2 (tu website), dentro de la misma tarjeta; al enviar, confirma por WhatsApp ============ */}
            {screen === 6 && (
              <section className="wtg-screen is-form">
                <div className="wtg-in">
            <div className="wt-card" data-testid="formulario-popup">
              {done ? (
                <div className="ct-done" role="status" data-testid="website-pedido-recibido" style={{ border: 0, padding: "8px 0 0", boxShadow: "none" }}>
                  <span className="ct-done-ring" aria-hidden="true">
                    <svg viewBox="0 0 54 54" focusable="false">
                      <circle className="ct-ring-bg" cx="27" cy="27" r="23" />
                      <circle className="ct-ring-fg" cx="27" cy="27" r="23" pathLength={100} strokeDasharray="90 100" transform="rotate(-90 27 27)" />
                      <path className="ct-ring-clock" d="M27 16v11.5l7 4" />
                    </svg>
                  </span>
                  <h2>Recibimos tu pedido. Solo falta confirmar.</h2>
                  <div className="ct-prog" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={90} aria-label="Avance de tu pedido: 90 %"><div className="ct-prog-track"><i /></div></div>
                  <p><b>Toca el botón y envíanos el mensaje por WhatsApp</b> para confirmar tu pedido. Así sabemos que eres tú y coordinamos los detalles.</p>
                  <a className="ct-wa" data-testid="confirmar-whatsapp" href={websiteTreeConfirmUrl(form)} target="_blank" rel="noopener noreferrer" onClick={() => setConfirmedWa(true)}>
                    <WhatsAppIcon className="ct-wa-ic" />Confirmar mi website gratis
                  </a>
                  <ul>
                    <li>La diseñamos en máximo {WEBSITE_TREE_DELIVERY_DAYS} días hábiles.</li>
                    <li>Te escribimos por WhatsApp cuando esté lista para coordinar la llamada de entrega.</li>
                    <li>Ve preparando tu logo, fotos y videos de tus trabajos.</li>
                  </ul>
                  {confirmedWa && <p className="wt-hint" style={{ marginTop: 12 }}>Si el mensaje no se abrió, escríbenos por WhatsApp y dinos tu nombre y el de tu negocio.</p>}
                </div>
              ) : waitlisted ? (
                <div className="wt-wait" role="status" data-testid="website-lista-espera">
                  <h2>Cupos de este mes agotados</h2>
                  <p>Ya guardamos tus datos en la lista de espera. <b>Te escribimos por WhatsApp cuando abramos nuevos cupos.</b></p>
                </div>
              ) : (
                <>
                  <h2>{soldOut ? "Anótate en la lista de espera" : "Pide tu website gratis"}</h2>
                  {soldOut && <p className="wt-lead">Los 10 cupos de este mes ya se usaron. Deja tus datos y te avisamos cuando abramos cupos.</p>}
                  {!soldOut && (
                    <ol className="wt-steps" aria-label="Pasos del formulario">
                      <li className={step === 1 ? "is-on" : ""}><b>1</b>Datos</li>
                      <li className={step === 2 ? "is-on" : ""}><b>2</b>Website</li>
                      <li className={step === 3 ? "is-on" : ""}><b>3</b>Confirmar</li>
                    </ol>
                  )}

                  {step === 1 || soldOut ? (
                    <form key="paso-1" onSubmit={submitStep1} noValidate>
                      <label className="wt-field"><span>Nombre y Apellido</span>
                        <input className="wt-in" value={form.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" placeholder="Ej: Carlos Ramírez" /></label>
                      <div className="wt-field">
                        <span className="wt-wa-label"><WhatsAppIcon className="wt-wa-ic" />WhatsApp</span>
                        <div className="wt-tel"><PhoneInput value={form.whatsapp || "+1 "} onChange={(v) => set("whatsapp", v)} placeholder="713 555 0101" /></div>
                      </div>
                      <label className="wt-field"><span>Nombre del negocio</span>
                        <input className="wt-in" value={form.business} onChange={(e) => set("business", e.target.value)} autoComplete="organization" placeholder="Ej: Ramírez Tree Service" /></label>
                      {error && <div className="wt-err" role="alert">{error}</div>}
                      <div className="wt-actions">
                        <button type="submit" className="est-btn" disabled={busy || !!step1Problem}>
                          <span className="wt-btn-txt">{busy ? "Guardando…" : soldOut ? "Anotarme en la lista" : "Continuar"}</span>{!busy && !soldOut && <Ic id="arrow" />}
                        </button>
                      </div>
                      {step1Problem && <p className="wt-need">Completa todos los datos para continuar.</p>}
                    </form>
                  ) : step === 2 ? (
                    <form key="paso-2" onSubmit={(e) => { e.preventDefault(); if (websiteDataProblem) { setError(websiteDataProblem); return; } setError(""); setStep(3); requestAnimationFrame(scrollPop); }} noValidate>
                      <div className="wt-intro">
                        <h3>¿Cómo quieres que sea tu website?</h3>
                      </div>
                      <div className="wt-field" role="group" aria-label="Idioma de tu website">
                        <span>Idioma de tu website</span>
                        <div className="wt-seg">
                          <button type="button" aria-pressed={form.language === "es"} onClick={() => set("language", "es")}>Español</button>
                          <button type="button" aria-pressed={form.language === "en"} onClick={() => set("language", "en")}>Inglés</button>
                        </div>
                      </div>
                      <label className="wt-field"><span>Ciudad y estado donde trabajas</span>
                        <input className="wt-in" value={form.city} onChange={(e) => set("city", e.target.value)} autoComplete="address-level2" placeholder="Ej: Orlando, FL" /></label>

                      <div className="wt-field" role="group" aria-label="Servicios que ofreces">
                        <span>Servicios que ofreces <em>(hasta {WEBSITE_TREE_MAX_SERVICES})</em></span>
                        <div className="wt-chips">
                          {WEBSITE_TREE_SERVICE_SUGGESTIONS.map((s) => {
                            const taken = form.services.some((x) => x.trim().toLowerCase() === s.toLowerCase());
                            return <button type="button" key={s} disabled={taken || form.services.every((x) => x.trim())} onClick={() => addSuggestion(s)}>{taken ? "✓ " : "+ "}{s}</button>;
                          })}
                        </div>
                        {form.services.map((s, i) => (
                          <div className="wt-svc" key={i}>
                            <input className="wt-in" value={s} onChange={(e) => setService(i, e.target.value)} aria-label={`Servicio ${i + 1}`} placeholder={i === 0 ? "Ej: Poda de árboles" : `Servicio ${i + 1} (opcional)`} maxLength={80} />
                            <button type="button" className="wt-star" aria-pressed={starIdx === i} disabled={!s.trim()} onClick={() => set("star", starIdx === i ? -1 : i)} aria-label={`Marcar el servicio ${i + 1} como servicio destacado`}>
                              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.9 6.9 7.4.6-5.6 4.8 1.7 7.2L12 17.6 5.6 21.5l1.7-7.2L1.7 9.5l7.4-.6z" /></svg>
                              <span>{starIdx === i ? "Servicio destacado" : ""}</span>
                            </button>
                          </div>
                        ))}
                        {!hasAnyService && <p className="wt-hint">Escribe tus servicios o toca los atajos de arriba.</p>}
                      </div>

                      {error && <div className="wt-err" role="alert">{error}</div>}
                      <div className="wt-actions">
                        <button type="button" className="wt-back" onClick={(e) => { e.preventDefault(); setStep(1); setError(""); requestAnimationFrame(scrollPop); }}>Atrás</button>
                        <button type="submit" className="est-btn" disabled={!!websiteDataProblem}>
                          <span className="wt-btn-txt">Continuar</span><Ic id="arrow" />
                        </button>
                      </div>
                      {websiteDataProblem && <p className="wt-need">Completa todos los datos para continuar.</p>}
                    </form>
                  ) : (
                    <form key="paso-3" onSubmit={submitStep2} noValidate>
                      <div className="wt-intro">
                        <h3>Antes de enviar, confirma</h3>
                      </div>
                      <div role="group" aria-label="Confirmaciones">
                        {WEBSITE_TREE_CONFIRMATIONS.map((c) => {
                          const a = form.answers[c.id];
                          return (
                            <div className={`wt-conf${a === "no" ? " is-no" : ""}`} key={c.id}>
                              <p>{c.text}</p>
                              <div className="wt-seg">
                                <button type="button" aria-pressed={a === "yes"} onClick={() => answer(c.id, "yes")}>Sí</button>
                                <button type="button" className="is-no" aria-pressed={a === "no"} onClick={() => answer(c.id, "no")}>No</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {(error || someNo) && (
                        <div className="wt-err" role="alert">{error || "Aún no cumples los requisitos para recibir tu website gratis"}</div>
                      )}
                      <div className="wt-actions">
                        <button type="button" className="wt-back" onClick={(e) => { e.preventDefault(); setStep(2); setError(""); requestAnimationFrame(scrollPop); }}>Atrás</button>
                        <button type="submit" className="est-btn" disabled={busy || !!step2Problem}>
                          <span className="wt-btn-txt">{busy ? "Enviando…" : "Enviar mi pedido"}</span>
                        </button>
                      </div>
                      {step2Problem && !someNo && <p className="wt-need">Responde las 4 preguntas para enviar tu pedido.</p>}
                    </form>
                  )}
                </>
              )}
            </div>
                  {!done && <p className="wtg-ask-wa">¿Tienes una pregunta? <a href={websiteTreeSupportUrl()} target="_blank" rel="noopener noreferrer" data-testid="soporte-whatsapp">Escríbenos por WhatsApp</a></p>}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default WebsiteTreeGame;
