import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import AcrosoftLogo from "@/components/shared/AcrosoftLogo";
import PhoneInput from "@/components/shared/PhoneInput";
import WhatsAppIcon from "@/components/shared/WhatsAppIcon";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { CT_CSS } from "@/components/estimados/consultoriaTreeStyles";
import { EST_CSS, EST_FONT_HREF } from "@/components/estimados/estimadosStyles";
import { EST_CSS_EXTRA } from "@/components/estimados/estimadosStylesExtra";
import { WH_CSS } from "@/components/website-hvac/websiteHvacStyles";
import {
  WEBSITE_HVAC_AGENCY_PRICE, WEBSITE_HVAC_CALL_MINUTES, WEBSITE_HVAC_CONFIRMATIONS, WEBSITE_HVAC_DELIVERY_DAYS, WEBSITE_HVAC_DISPLAY_SLOTS, WEBSITE_HVAC_FN, WEBSITE_HVAC_FREE_MONTHS,
  WEBSITE_HVAC_MAX_SERVICES, WEBSITE_HVAC_MONTHLY_LIMIT, WEBSITE_HVAC_MONTHLY_PRICE, WEBSITE_HVAC_PIXEL_ID, WEBSITE_HVAC_SERVICE_SUGGESTIONS,
  WEBSITE_HVAC_SLUG, buildWebsiteHvacBody, emptyWebsiteHvacForm, validateWebsiteHvacStep1, validateWebsiteHvacStep2, websiteHvacConfirmUrl,
  websiteHvacEventParams,
} from "@/lib/websiteHvacConfig";
import type { WebsiteHvacConfirmId, WebsiteHvacForm } from "@/lib/websiteHvacConfig";
import { isEstimadosPreview } from "@/lib/estimadosPreview";
import { initMetaPixel, trackMetaEvent } from "@/lib/metaPixel";
import { addNoindex } from "@/lib/piscinasFunnel";
import { uuid } from "@/lib/uuid";

// /website-hvac — landing de CAPTACIÓN: se regala el diseño y la creación de un website profesional a dueños de negocios de HVAC en EE.UU. (solo pagan
// dominio y hosting, y los 3 primeros meses también son gratis; después US$20 al mes). El objetivo único es que llenen el formulario (2 pasos); el pedido
// va a la Edge Function `website-hvac-request` (máx. 10 por mes, contacto en el CRM con la etiqueta website-hvac, aviso push al superadmin) y después se
// los lleva a WhatsApp para confirmar, igual que /consultoria-mkt-tree. La website se entrega en una llamada de 30 min donde se ofrece el plan de marketing.
//
// Identidad: la misma del kit y de la consultoría (Barlow + naranja/verde); los estilos del formulario están en websiteHvacStyles.ts.
// Las capturas de «ejemplos» son DISEÑOS DE MUESTRA (public/website-hvac/ejemplo-N-*.jpg, sacadas de /websites/hvac-ejemplo-N con
// scripts/capture-hvac-examples.mjs): no son clientes reales y la página lo dice. Copy sin testimonios, cifras de resultados ni garantías inventadas.
// Vista previa sin enviar nada: `?demo=1` (desarrollo) o `?demo=<ESTIMADOS_PREVIEW_KEY>` (producción). Nace con noindex como el resto del embudo.

const PAGE_TITLE = "Website gratis para negocios de HVAC | Diseñada y entregada en 2 días";
const IS_DEMO = isEstimadosPreview();
const IMG = "/website-hvac";

const EXAMPLES = [
  { n: 1, alt: "Diseño de muestra de website para HVAC en azul y blanco", cap: "Diseño de muestra · azul y blanco" },
  { n: 2, alt: "Diseño de muestra de website para HVAC en negro y naranja", cap: "Diseño de muestra · negro y naranja" },
  { n: 3, alt: "Diseño de muestra de website para HVAC en verde y crema", cap: "Diseño de muestra · verde y crema" },
  { n: 4, alt: "Diseño de muestra de website para HVAC con calendario de reservas", cap: "Diseño de muestra · con calendario de reservas" },
  { n: 5, alt: "Diseño de muestra de website para HVAC con cotización rápida", cap: "Diseño de muestra · con formulario de cotización" },
  { n: 6, alt: "Diseño de muestra de website para HVAC con cotización por pasos", cap: "Diseño de muestra · con cotización por pasos" },
];

const INCLUDES: ReactNode[] = [
  <><b>{WEBSITE_HVAC_FREE_MONTHS} Meses gratis</b> de Dominio y Hosting<em className="wh-inc-note">Luego mantenimiento por US${WEBSITE_HVAC_MONTHLY_PRICE}/mes</em></>,
  <>Diseño profesional con <b>tu marca, tus colores y tu logo</b>.</>,
  <>Se ve perfecto en <b>celular y computadora</b>.</>,
  <>Botón de <b>llamada directa</b>.</>,
  <>Tus <b>servicios</b> destacados en un solo lugar.</>,
  <>En <b>español o en inglés</b>, el idioma que elijas.</>,
  <>Lista para publicar en <b>máximo {WEBSITE_HVAC_DELIVERY_DAYS} días</b>.</>,
];

const STEPS = [
  { name: "Llenas el formulario", text: "Son 2 pasos cortos: tus datos, tus servicios y tu ciudad. Lo llenas en menos de 3 minutos." },
  { name: `La diseñamos en máximo ${WEBSITE_HVAC_DELIVERY_DAYS} días`, text: "Armamos tu website con la información que nos diste. Las fotos y el logo reales los agregamos después." },
  { name: "Te la entregamos por llamada", text: `Una llamada de ${WEBSITE_HVAC_CALL_MINUTES} minutos por Zoom, Meet o WhatsApp: te explicamos cómo funciona tu website y te mostramos un plan de marketing para conseguir más clientes.` },
  { name: "Tu website queda publicada", text: `En la llamada activamos tu dominio y hosting. No pagas nada durante ${WEBSITE_HVAC_FREE_MONTHS} meses; después son US$${WEBSITE_HVAC_MONTHLY_PRICE} al mes.` },
];

const FAQ = [
  { q: "¿De verdad es gratis?", a: `Sí. El diseño y la creación de tu website no tienen costo. Solo se paga el dominio y el hosting (US$${WEBSITE_HVAC_MONTHLY_PRICE} al mes), y los primeros ${WEBSITE_HVAC_FREE_MONTHS} meses también van por nuestra cuenta.` },
  { q: "¿Por qué la regalan?", a: "Porque queremos que nos conozcas. Una website sin visitas no trae clientes, así que en la llamada de entrega también te mostramos cómo conseguir más clientes con ella. Puedes escucharlo sin ningún compromiso." },
  { q: "¿Qué pasa después de los 3 meses gratis?", a: `Se cobran US$${WEBSITE_HVAC_MONTHLY_PRICE} al mes por el dominio y el hosting. Para activarlos, en la llamada de entrega registras tu tarjeta; no se te cobra nada hasta el mes ${WEBSITE_HVAC_FREE_MONTHS + 1}.` },
  { q: "¿Qué tengo que enviarles?", a: "Tu logo, fotos y videos de tus trabajos. Si todavía no los tienes a mano, empezamos con imágenes de muestra y los reemplazamos cuando los envíes." },
  { q: "¿Cuánto tarda?", a: `Máximo ${WEBSITE_HVAC_DELIVERY_DAYS} días hábiles. Te avisamos por WhatsApp cuando esté lista y coordinamos la llamada de entrega.` },
  { q: "¿Qué pasa si no me presento a la llamada?", a: "La llamada de entrega es la única forma de recibir la website. Si no te presentas sin avisar antes, no podrás recibirla en otra oportunidad. Si te surge algo, avísanos y la reprogramamos." },
  { q: "¿Por qué hay solo 10 cupos al mes?", a: "Cada website se diseña a mano y la entregamos en una llamada personal. Con 10 por mes podemos hacerlo bien. Si se agotan, puedes dejar tus datos y te avisamos cuando abran cupos." },
  { q: "¿Mi website puede estar en español?", a: "Sí. Eliges si quieres tu website en español o en inglés (o nos dices en la llamada si quieres los dos idiomas)." },
];

/**
 * Tarjetas «¿Por qué contratar una website con nuestra metodología?»: PROMESAS = beneficios de TENER una website (no de nuestro servicio: nada de precio, días de entrega ni meses gratis), todos verdaderos por la propia naturaleza de una website.
 * Daniel pidió (2026-11-19) promesas de resultado con números («% más de clientes», «más personas que conocen tu negocio»): NO se inventan cifras de
 * resultados. Cuando haya datos propios que se puedan demostrar (primeras websites entregadas, Google Business Profile, anuncios), se agregan aquí.
 * (Los datos de estudios de Google/Stanford que había antes se quitaron de las tarjetas por pedido de Daniel.)
 */
const BENEFITS: { icon: string; n: string; unit?: string; title: string }[] = [
  { icon: "globe", n: "24/7", title: "Tu negocio abierto en internet, de día y de noche" },
  { icon: "phone", n: "1", unit: "toque", title: "y tus clientes te llaman desde su celular" },
  { icon: "pin", n: "1", unit: "lugar", title: "con todos tus servicios, fotos y zonas que atiendes, para que te conozcan en minutos" },
  { icon: "shield", n: "100", unit: "%", title: "tu marca: tu logo, tu nombre y tus colores al frente para verte más profesional" },
];

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

/** Captura de escritorio dentro de un marco de navegador y, encima, la captura de celular. */
function Mock({ n, alt, eager }: { n: number; alt: string; eager?: boolean }) {
  return (
    <div className="wh-mock">
      <div className="wh-browser">
        <div className="wh-bar" aria-hidden="true"><i /><i /><i /><span /></div>
        <img src={`${IMG}/ejemplo-${n}-desktop.jpg`} width={1366} height={860} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async" />
      </div>
      <div className="wh-phone" aria-hidden="true">
        <img src={`${IMG}/ejemplo-${n}-mobile.jpg`} width={780} height={1688} alt="" loading={eager ? "eager" : "lazy"} decoding="async" />
      </div>
    </div>
  );
}

/** Bandera de Estados Unidos en SVG (los emojis de bandera no se ven en Windows: salen como «US»). */
const UsFlag = () => (
  <svg className="wh-flag" viewBox="0 0 26 18" role="img" aria-label="Estados Unidos">
    <rect width="26" height="18" rx="2.2" fill="#fff" />
    {[0, 2, 4, 6, 8, 10, 12].map((i) => <rect key={i} y={(i * 18) / 13} width="26" height={18 / 13} fill="#B22234" />)}
    <rect width="11" height={(7 * 18) / 13} fill="#3C3B6E" />
    {[0, 1, 2, 3].flatMap((r) => [0, 1, 2].map((c) => <circle key={`${r}${c}`} cx={2.2 + c * 3.3 + (r % 2) * 1.1} cy={1.6 + r * 2.1} r=".5" fill="#fff" />))}
    <rect width="26" height="18" rx="2.2" fill="none" stroke="rgba(0,0,0,.18)" />
  </svg>
);

type Slots = number | null; // null = aún no se sabe (cargando o sin respuesta)

/** Respuesta de la Edge Function website-hvac-request. */
interface FnJson { ok?: boolean; already?: boolean; error?: string; slots_left?: number; waitlist?: boolean }
const errMsg = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

async function callFn(body: unknown): Promise<{ status: number; json: FnJson | null }> {
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${WEBSITE_HVAC_FN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
    body: JSON.stringify(body),
  });
  let json: FnJson | null = null;
  try { json = await res.json() as FnJson; } catch { /* sin cuerpo */ }
  return { status: res.status, json };
}

const WebsiteHvac = () => {
  const popupRef = useRef<HTMLDivElement | null>(null);
  /** Lead una sola vez, y solo si el pedido es nuevo (un correo repetido en el mes no cuenta como lead nuevo). */
  const leadSent = useRef(false);
  const newLead = useRef(false);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const benRef = useRef<HTMLDivElement | null>(null);
  const [benSlide, setBenSlide] = useState(0);
  const [slots, setSlots] = useState<Slots>(null);
  const [form, setForm] = useState<WebsiteHvacForm>(emptyWebsiteHvacForm);
  const [step, setStep] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  /** La persona ya está en la lista de espera (cupos agotados): se le avisa cuando abran. */
  const [waitlisted, setWaitlisted] = useState(false);
  const [confirmedWa, setConfirmedWa] = useState(false);
  const [stickyVisible, setStickyVisible] = useState(false);
  /** El formulario vive en un popup que se abre con cualquier botón CTA. */
  const [open, setOpen] = useState(false);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    document.title = PAGE_TITLE;
    return addNoindex();
  }, []);

  useEffect(() => {
    if (IS_DEMO || !WEBSITE_HVAC_PIXEL_ID) return;
    initMetaPixel(WEBSITE_HVAC_PIXEL_ID);
    trackMetaEvent("PageView", undefined, undefined, WEBSITE_HVAC_PIXEL_ID);
    trackMetaEvent("ViewContent", websiteHvacEventParams(), uuid(), WEBSITE_HVAC_PIXEL_ID);
  }, []);

  // Lead: cuando la persona ve «Recibimos tu pedido. Solo falta confirmar.» (no en vista previa, ni si el correo ya había pedido este mes).
  useEffect(() => {
    if (!done || IS_DEMO || !WEBSITE_HVAC_PIXEL_ID || leadSent.current || !newLead.current) return;
    leadSent.current = true;
    try { trackMetaEvent("Lead", websiteHvacEventParams(), uuid(), WEBSITE_HVAC_PIXEL_ID); } catch { /* no crítico */ }
  }, [done]);

  // Cupos que quedan este mes (los calcula el servidor). Si no responde, la página sigue funcionando y el servidor decide al enviar.
  useEffect(() => {
    if (IS_DEMO) { setSlots(WEBSITE_HVAC_MONTHLY_LIMIT); return; }
    let alive = true;
    callFn({ action: "slots" }).then(({ json }) => { if (alive && typeof json?.slots_left === "number") setSlots(json.slots_left); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // Barra fija móvil: aparece al pasar el hero y se esconde mientras el popup del formulario está abierto o ya se envió.
  useEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    let frame = 0;
    const update = () => { frame = 0; setStickyVisible(trigger.getBoundingClientRect().top < 0); };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => { window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); if (frame) cancelAnimationFrame(frame); };
  }, []);

  // Cupos REALES (los cuenta el servidor): solo sirven para saber si se agotaron. Lo que se MUESTRA es min(reales, WEBSITE_HVAC_DISPLAY_SLOTS):
  // «quedan 4» mientras haya más de 4 y, cuando los reales bajen de 4, el número real. Antes de que responda el servidor ya se muestra el número de presentación.
  const soldOut = slots === 0;
  const shown = slots === null ? WEBSITE_HVAC_DISPLAY_SLOTS : Math.min(slots, WEBSITE_HVAC_DISPLAY_SLOTS);
  const used = WEBSITE_HVAC_MONTHLY_LIMIT - shown;
  const openForm = () => setOpen(true);
  /** Al cambiar de paso, el popup vuelve a su inicio. */
  const scrollPop = () => popupRef.current?.scrollTo?.({ top: 0 });
  const set = <K extends keyof WebsiteHvacForm>(k: K, v: WebsiteHvacForm[K]) => { setForm((f) => ({ ...f, [k]: v })); setError(""); };

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
    const problem = validateWebsiteHvacStep1(form);
    if (problem) { setError(problem); return; }
    setError("");
    if (soldOut) {
      setBusy(true);
      try {
        if (!IS_DEMO) {
          const r = await callFn({ action: "lead", name: form.name, email: form.email, whatsapp: form.whatsapp, business: form.business });
          if (r.status !== 200) throw new Error(r.json?.error ?? "No pudimos guardar tus datos. Intenta de nuevo.");
        }
        setWaitlisted(true);
      } catch (err) { setError(errMsg(err, "No pudimos guardar tus datos. Intenta de nuevo.")); }
      finally { setBusy(false); }
      return;
    }
    if (!IS_DEMO) {
      // Se guarda en segundo plano: si falla, la persona igual sigue con su formulario.
      callFn({ action: "lead", name: form.name, email: form.email, whatsapp: form.whatsapp, business: form.business }).catch(() => {});
    }
    setStep(2);
    requestAnimationFrame(scrollPop);
  };

  const submitStep2 = async (e: FormEvent) => {
    e.preventDefault();
    const problem = validateWebsiteHvacStep2(form);
    if (problem) { setError(problem); return; }
    setError("");
    setBusy(true);
    try {
      if (IS_DEMO) { await new Promise((r) => setTimeout(r, 700)); }
      else {
        const r = await callFn(buildWebsiteHvacBody(form));
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

  const cta = (label = "Quiero mi website gratis") => (
    <button type="button" className="est-btn" onClick={openForm} aria-haspopup="dialog">
      <Ic id="gift" />
      <span className="wh-btn-txt">{label}{!soldOut && <small>Quedan {shown} de {WEBSITE_HVAC_MONTHLY_LIMIT} cupos este mes</small>}{soldOut && <small>Cupos agotados · anótate en la lista de espera</small>}</span>
    </button>
  );

  const onTrackScroll = () => {
    const t = trackRef.current;
    const first = t?.firstElementChild as HTMLElement | null;
    if (!t || !first) return;
    const atEnd = t.scrollLeft + t.clientWidth >= t.scrollWidth - 4;
    setSlide(atEnd ? EXAMPLES.length - 1 : Math.max(0, Math.min(EXAMPLES.length - 1, Math.round(t.scrollLeft / (first.offsetWidth + 16)))));
  };
  const onBenScroll = () => {
    const t = benRef.current;
    const first = t?.firstElementChild as HTMLElement | null;
    if (!t || !first) return;
    const atEnd = t.scrollLeft + t.clientWidth >= t.scrollWidth - 4;
    setBenSlide(atEnd ? BENEFITS.length - 1 : Math.max(0, Math.min(BENEFITS.length - 1, Math.round(t.scrollLeft / (first.offsetWidth + 12)))));
  };
  const goBen = (i: number) => {
    const t = benRef.current;
    const card = t?.children[i] as HTMLElement | undefined;
    setBenSlide(i);
    if (t && card && typeof t.scrollTo === "function") t.scrollTo({ left: card.offsetLeft - 20, behavior: "smooth" });
  };
  const goSlide = (i: number) => {
    const t = trackRef.current;
    const card = t?.children[i] as HTMLElement | undefined;
    setSlide(i);
    if (!t || !card || typeof t.scrollTo !== "function") return;
    t.scrollTo({ left: card.offsetLeft - (t.clientWidth - card.offsetWidth) / 2, behavior: "smooth" });
  };

  const answer = (id: WebsiteHvacConfirmId, v: "yes" | "no") => { setForm((f) => ({ ...f, answers: { ...f.answers, [id]: v } })); setError(""); };
  const starIdx = form.star;
  // Todos los datos son obligatorios (los servicios 2 a 6 son opcionales: «hasta 6»): mientras falte algo, «Continuar» y «Enviar» quedan deshabilitados.
  const step1Problem = validateWebsiteHvacStep1(form);
  const step2Problem = validateWebsiteHvacStep2(form);
  const someNo = WEBSITE_HVAC_CONFIRMATIONS.some((c) => form.answers[c.id] === "no");
  const hasAnyService = form.services.some((s) => s.trim());

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href={EST_FONT_HREF} rel="stylesheet" />
      {!IS_DEMO && WEBSITE_HVAC_PIXEL_ID && (
        <noscript><img height="1" width="1" style={{ display: "none" }} src={`https://www.facebook.com/tr?id=${WEBSITE_HVAC_PIXEL_ID}&ev=PageView&noscript=1`} alt="" /></noscript>
      )}
      <style>{EST_CSS + EST_CSS_EXTRA + CT_CSS + WH_CSS}</style>

      <div className="est-ty-root">
        <div className="est-page ct wh" data-product={WEBSITE_HVAC_SLUG} aria-label="Website gratis para negocios de HVAC">
          {/* ============ 2. HERO ============ */}
          <header className="est-hero wh-hero">
            <div className="est-wrap">
              <span className="est-eyebrow"><UsFlag />Para dueños de HVAC en EE.UU.</span>
              <h1>Te regalamos tu <span className="est-hl">website profesional</span> para tu negocio de HVAC</h1>
              <ul className="wh-checks" aria-label="Lo que incluye">
                <li><Ic id="check" /><span>Recíbelo en <b>Máximo {WEBSITE_HVAC_DELIVERY_DAYS} Días</b></span></li>
                <li><Ic id="check" /><span>Incluye <b>{WEBSITE_HVAC_FREE_MONTHS} meses gratis</b> de mantenimiento (Hosting y Dominio)</span></li>
              </ul>
              <figure className="wh-hero-pic">
                <img src={`${IMG}/hero-dueno.jpg`} width={1400} height={933} alt="Dueño de un negocio de HVAC sonriendo y mostrando su website nueva en el celular y en la laptop, mientras un técnico instala un aire acondicionado" decoding="async" />
              </figure>
              <div className="est-cta" style={{ marginTop: 18 }}>
                {cta()}
                <ul className="est-trust">
                  <li><Ic id="gift" />Diseño 100% gratis</li>
                  <li><Ic id="clock" />Entrega en {WEBSITE_HVAC_DELIVERY_DAYS} días</li>
                  <li><Ic id="globe" />Español o inglés</li>
                </ul>
              </div>
              {/* Precio de anclaje bajo el botón: lo que cuesta normalmente (tachado) vs. aquí */}
              <div className="wh-anchor" role="group" aria-label={`Con otra agencia una website cuesta desde US$${WEBSITE_HVAC_AGENCY_PRICE.toLocaleString("en-US")}. Aquí es gratis.`}>
                <div><span>Con otra agencia:</span><s>US${WEBSITE_HVAC_AGENCY_PRICE.toLocaleString("en-US")}+</s></div>
                <Ic id="arrow" />
                <div><span>Aquí:</span><strong>Gratis</strong></div>
              </div>
              <div className="wh-meter" role="img" aria-label={`${used} de ${WEBSITE_HVAC_MONTHLY_LIMIT} cupos usados este mes`}>
                <div className="wh-meter-row"><span>Cupos de este mes</span><span>{soldOut ? "Agotados" : `Quedan ${shown}`}</span></div>
                <div className="wh-meter-bar"><i style={{ width: `${Math.round((used / WEBSITE_HVAC_MONTHLY_LIMIT) * 100)}%` }} /></div>
              </div>
            </div>
          </header>
          <div ref={triggerRef} />

          {/* ============ 2b. POR QUÉ CONTRATAR (4 tarjetas minimalistas deslizables: icono, número y título) ============ */}
          <section className="est-sec wh-ben-sec" aria-label="Por qué contratar una website con nuestra metodología">
            <div className="est-wrap">
              <h2 style={{ textAlign: "center" }}>¿Por qué contratar una website con <span className="est-hl">nuestra metodología</span>?</h2>
              <div className="wh-ben-track" ref={benRef} onScroll={onBenScroll} role="group" aria-label="Desliza para ver los 4 motivos" tabIndex={0}>
              {BENEFITS.map((b) => (
                <div className="wh-ben-card" key={b.title}>
                  <span className="wh-ben-ic" aria-hidden="true"><Ic id={b.icon} /></span>
                  <span className="wh-ben-n">{b.n}{b.unit && <small>{b.unit}</small>}</span>
                  <h3>{b.title}</h3>
                </div>
              ))}
              </div>
              <div className="wh-dots">
                {BENEFITS.map((b, i) => (
                  <button key={b.title} type="button" className={i === benSlide ? "is-on" : ""} aria-label={`Ver motivo ${i + 1} de ${BENEFITS.length}`} aria-current={i === benSlide ? "true" : undefined} onClick={() => goBen(i)} />
                ))}
              </div>
            </div>
          </section>

          {/* ============ 3. EJEMPLOS DE DISEÑO (capturas de diseños de muestra) ============ */}
          <section className="est-sec wh-ex-sec" aria-label="Ejemplos de diseño">
            <div className="est-wrap">
              <div className="wh-ex-head">
                <h2>Así se ven nuestras <span className="est-hl">websites</span></h2>
              </div>
              <div className="wh-track" ref={trackRef} onScroll={onTrackScroll} role="group" aria-label="Desliza para ver los ejemplos" tabIndex={0}>
                {EXAMPLES.map((ex) => (
                  <figure key={ex.n}><Mock n={ex.n} alt={ex.alt} /><figcaption>{ex.cap}</figcaption></figure>
                ))}
              </div>
              <div className="wh-dots">
                {EXAMPLES.map((ex, i) => (
                  <button key={ex.n} type="button" className={i === slide ? "is-on" : ""} aria-label={`Ver ejemplo ${i + 1} de ${EXAMPLES.length}`} aria-current={i === slide ? "true" : undefined} onClick={() => goSlide(i)} />
                ))}
              </div>
              <p className="wh-note">Son diseños de muestra con imágenes ilustrativas.</p>
            </div>
          </section>

          {/* ============ 4. QUÉ INCLUYE ============ */}
          <section className="est-sec" style={{ paddingTop: 8 }}>
            <div className="est-wrap">
              <h2>Qué incluye tu website <span className="est-hl">gratis</span></h2>
              <ul className="est-checks">
                {INCLUDES.map((t, i) => <li key={i}><Ic id="check" /><span>{t}</span></li>)}
              </ul>
            </div>
          </section>

          {/* ============ 5. CÓMO FUNCIONA ============ */}
          <section className="est-sec est-sec--offer" style={{ paddingTop: 20 }}>
            <div className="est-wrap">
              <div className="est-offer-card">
                <h2 className="est-product">Cómo <span className="est-hl">funciona</span></h2>
                <ol className="ct-how" style={{ marginTop: 14 }}>
                  {STEPS.map((s, i) => (
                    <li key={s.name}>
                      <span className="ct-how-n" aria-hidden="true">{i + 1}</span>
                      <div><h3>{s.name}</h3><p>{s.text}</p></div>
                    </li>
                  ))}
                </ol>
                <div className="est-cta" style={{ marginTop: 20 }}>{cta()}</div>
              </div>
            </div>
          </section>

          {/* ============ 6. CUÁNTO CUESTA ============ */}
          <section className="est-sec" style={{ paddingTop: 10 }}>
            <div className="est-wrap">
              <h2>Cuánto <span className="est-hl">cuesta</span></h2>
              <div className="wh-price">
                <div className="wh-price-row is-hl"><div>Diseño y creación de tu website<small>Con tu marca, tus servicios y tu ciudad</small></div><strong>US$0</strong></div>
                <div className="wh-price-row wh-price-main">
                  <div>Mantenimiento<small>Hosting y Dominio</small></div>
                  <span className="wh-price-was" aria-label={`Normalmente US$${WEBSITE_HVAC_MONTHLY_PRICE} al mes`}>
                    <s>US${WEBSITE_HVAC_MONTHLY_PRICE}<i>/mes</i></s>
                    <strong>US$0</strong>
                    <em>por {WEBSITE_HVAC_FREE_MONTHS} meses</em>
                  </span>
                </div>
                <p className="wh-price-note">Después de los {WEBSITE_HVAC_FREE_MONTHS} meses, el mantenimiento cuesta US${WEBSITE_HVAC_MONTHLY_PRICE} al mes. Se registra tu tarjeta en la llamada de entrega y no se cobra nada antes.</p>
              </div>
            </div>
          </section>

          {/* ============ 7. CIERRE: abre el popup del formulario ============ */}
          <section className="est-sec" style={{ paddingTop: 10, paddingBottom: 30 }}>
            <div className="est-wrap">
              <h2 style={{ textAlign: "center" }}>¿Listo para tener tu <span className="est-hl">website gratis</span>?</h2>
              <div className="est-cta">{cta()}</div>
            </div>
          </section>

          {/* ============ 8. PREGUNTAS FRECUENTES ============ */}
          <section className="est-sec" style={{ paddingTop: 10 }}>
            <div className="est-wrap">
              <h2>Preguntas frecuentes</h2>
              <div className="est-faq">
                {FAQ.map((f) => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}
              </div>
            </div>
          </section>

          <footer className="wh-foot">
            <div className="est-wrap">
              <AcrosoftLogo size="lg" className="!text-[clamp(24px,7vw,30px)] !cursor-default" />
              <p>Servicios de marketing y tecnología para negocios en Estados Unidos.</p>
            </div>
          </footer>

          {/* Barra fija móvil */}
          <div className={`est-sticky${stickyVisible && !open && !done && !waitlisted ? " est-is-visible" : ""}`}>{cta(soldOut ? "Anotarme en la lista" : "Quiero mi website gratis")}</div>
        </div>

        {/* ============ POPUP DEL FORMULARIO. Va en un portal (fuera de .est-page), por eso el contenido lleva su propio `est-page ct wh` para heredar la paleta y los estilos. ============ */}
        <Dialog open={open} onOpenChange={(o) => { if (!o && done && !confirmedWa) return; setOpen(o); }}>
          <DialogContent ref={popupRef} hideClose={done && !confirmedWa} className="gap-0 border-0 p-0 w-[calc(100%-24px)] max-w-[480px] max-h-[94vh] overflow-y-auto rounded-2xl bg-[#F5F8FC]">
            <DialogTitle className="sr-only">{done ? "Pedido recibido, falta confirmar" : waitlisted ? "Lista de espera" : soldOut ? "Lista de espera" : "Pide tu website gratis"}</DialogTitle>
            <DialogDescription className="sr-only">Formulario para pedir tu website gratis. Al terminar, confirmas tu pedido por WhatsApp.</DialogDescription>
            <div className="est-page ct wh wh-pop-body">
              <div className="wh-card" data-testid="formulario-popup">
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
                    <a className="ct-wa" data-testid="confirmar-whatsapp" href={websiteHvacConfirmUrl(form)} target="_blank" rel="noopener noreferrer" onClick={() => setConfirmedWa(true)}>
                      <WhatsAppIcon className="ct-wa-ic" />Confirmar mi website gratis
                    </a>
                    <ul>
                      <li>La diseñamos en máximo {WEBSITE_HVAC_DELIVERY_DAYS} días hábiles.</li>
                      <li>Te escribimos por WhatsApp cuando esté lista para coordinar la llamada de entrega.</li>
                      <li>Ve preparando tu logo, fotos y videos de tus trabajos.</li>
                    </ul>
                    {confirmedWa && <p className="wh-hint" style={{ marginTop: 12 }}>Si el mensaje no se abrió, escríbenos por WhatsApp y dinos tu nombre y el de tu negocio.</p>}
                    {confirmedWa && <button type="button" className="ct-done-close" onClick={() => setOpen(false)}>Cerrar</button>}
                  </div>
                ) : waitlisted ? (
                  <div className="wh-wait" role="status" data-testid="website-lista-espera">
                    <h2>Cupos de este mes agotados</h2>
                    <p>Ya guardamos tus datos en la lista de espera. <b>Te escribimos por WhatsApp cuando abramos nuevos cupos.</b></p>
                  </div>
                ) : (
                  <>
                    <h2>{soldOut ? "Anótate en la lista de espera" : "Pide tu website gratis"}</h2>
                    <p className="wh-lead">{soldOut ? "Los 10 cupos de este mes ya se usaron. Deja tus datos y te avisamos cuando abramos cupos." : "Completa este formulario en menos de 3 minutos."}</p>
                    {!soldOut && (
                      <ol className="wh-steps" aria-label="Pasos del formulario">
                        <li className={step === 1 ? "is-on" : ""}><b>1</b>Tus datos</li>
                        <li className={step === 2 ? "is-on" : ""}><b>2</b>Tu website</li>
                      </ol>
                    )}

                    {step === 1 || soldOut ? (
                      <form key="paso-1" onSubmit={submitStep1} noValidate>
                        <label className="wh-field"><span>Nombre y Apellido</span>
                          <input className="wh-in" value={form.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" placeholder="Ej: Carlos Ramírez" /></label>
                        <label className="wh-field"><span>Correo electrónico</span>
                          <input className="wh-in" type="email" inputMode="email" value={form.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" placeholder="tucorreo@ejemplo.com" /></label>
                        <div className="wh-field">
                          <span className="wh-wa-label"><WhatsAppIcon className="wh-wa-ic" />WhatsApp</span>
                          <div className="wh-tel"><PhoneInput value={form.whatsapp || "+1 "} onChange={(v) => set("whatsapp", v)} placeholder="713 555 0101" /></div>
                        </div>
                        <label className="wh-field"><span>Nombre del negocio</span>
                          <input className="wh-in" value={form.business} onChange={(e) => set("business", e.target.value)} autoComplete="organization" placeholder="Ej: Ramírez Heating & Air" /></label>
                        {error && <div className="wh-err" role="alert">{error}</div>}
                        <div className="wh-actions">
                          <button type="submit" className="est-btn" disabled={busy || !!step1Problem}>
                            <span className="wh-btn-txt">{busy ? "Guardando…" : soldOut ? "Anotarme en la lista" : "Continuar"}</span>{!busy && !soldOut && <Ic id="arrow" />}
                          </button>
                        </div>
                        {step1Problem && <p className="wh-need">Completa todos los datos para continuar.</p>}
                      </form>
                    ) : (
                      <form key="paso-2" onSubmit={submitStep2} noValidate>
                        <div className="wh-field" role="group" aria-label="Idioma de tu website">
                          <span>Idioma de tu website</span>
                          <div className="wh-seg">
                            <button type="button" aria-pressed={form.language === "es"} onClick={() => set("language", "es")}>Español</button>
                            <button type="button" aria-pressed={form.language === "en"} onClick={() => set("language", "en")}>Inglés</button>
                          </div>
                        </div>
                        <label className="wh-field"><span>Ciudad y estado donde trabajas</span>
                          <input className="wh-in" value={form.city} onChange={(e) => set("city", e.target.value)} autoComplete="address-level2" placeholder="Ej: Houston, TX" /></label>

                        <div className="wh-field" role="group" aria-label="Servicios que ofreces">
                          <span>Servicios que ofreces <em>(hasta {WEBSITE_HVAC_MAX_SERVICES})</em></span>
                          <div className="wh-chips">
                            {WEBSITE_HVAC_SERVICE_SUGGESTIONS.map((s) => {
                              const taken = form.services.some((x) => x.trim().toLowerCase() === s.toLowerCase());
                              return <button type="button" key={s} disabled={taken || form.services.every((x) => x.trim())} onClick={() => addSuggestion(s)}>{taken ? "✓ " : "+ "}{s}</button>;
                            })}
                          </div>
                          {form.services.map((s, i) => (
                            <div className="wh-svc" key={i}>
                              <input className="wh-in" value={s} onChange={(e) => setService(i, e.target.value)} aria-label={`Servicio ${i + 1}`} placeholder={i === 0 ? "Ej: Reparación de A/C" : `Servicio ${i + 1} (opcional)`} maxLength={80} />
                              <button type="button" className="wh-star" aria-pressed={starIdx === i} disabled={!s.trim()} onClick={() => set("star", starIdx === i ? -1 : i)} aria-label={`Marcar el servicio ${i + 1} como servicio destacado`}>
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.9 6.9 7.4.6-5.6 4.8 1.7 7.2L12 17.6 5.6 21.5l1.7-7.2L1.7 9.5l7.4-.6z" /></svg>
                                <span>{starIdx === i ? "Servicio destacado" : ""}</span>
                              </button>
                            </div>
                          ))}
                          <p className="wh-hint">{hasAnyService ? "Opcional: toca la estrella del servicio que más quieres vender para marcarlo como tu Servicio Destacado." : "Escribe tus servicios o toca los atajos de arriba. Si quieres, marca con la estrella tu Servicio Destacado (opcional)."}</p>
                        </div>

                        <div role="group" aria-label="Confirmaciones" style={{ marginTop: 16 }}>
                          {WEBSITE_HVAC_CONFIRMATIONS.map((c) => {
                            const a = form.answers[c.id];
                            return (
                              <div className={`wh-conf${a === "no" ? " is-no" : ""}`} key={c.id}>
                                <p>{c.text}</p>
                                <div className="wh-seg">
                                  <button type="button" aria-pressed={a === "yes"} onClick={() => answer(c.id, "yes")}>Sí</button>
                                  <button type="button" className="is-no" aria-pressed={a === "no"} onClick={() => answer(c.id, "no")}>No</button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {(error || someNo) && (
                          <div className="wh-err" role="alert">{error || "Aún no cumples los requisitos para recibir tu website gratis"}</div>
                        )}
                        <div className="wh-actions">
                          <button type="button" className="wh-back" onClick={(e) => { e.preventDefault(); setStep(1); setError(""); requestAnimationFrame(scrollPop); }}>Atrás</button>
                          <button type="submit" className="est-btn" disabled={busy || !!step2Problem}>
                            <span className="wh-btn-txt">{busy ? "Enviando…" : "Enviar mi pedido"}</span>
                          </button>
                        </div>
                        {step2Problem && !someNo && <p className="wh-need">Completa todos los datos para enviar tu pedido.</p>}
                        <p className="wh-legal">Al enviar, aceptas que te contactemos por WhatsApp y correo sobre tu website.</p>
                      </form>
                    )}
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default WebsiteHvac;
