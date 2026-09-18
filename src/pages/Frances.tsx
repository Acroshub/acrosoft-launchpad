import { useEffect } from "react";
import { META_PIXEL_ID, initMetaPixel, trackMetaEvent } from "@/lib/metaPixel";

const PAGE_TITLE = "Guía DELF A2 para tu Trámite de Residencia en Francia | Aprueba tu Examen";
const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/8x2eVcgFsa6EbDcgKCbbG02";

function PaymentIcons({ labelColor }: { labelColor?: string }) {
  return (
    <div className="pc-payment">
      <span className="pc-payment-label" style={labelColor ? { color: labelColor } : undefined}>
        Pago 100% seguro procesado por Stripe
      </span>
      <div className="pc-payment-icons">
        <svg className="pay-icon" aria-hidden="true"><use href="#pay-visa" /></svg>
        <svg className="pay-icon" aria-hidden="true"><use href="#pay-mastercard" /></svg>
        <svg className="pay-icon" aria-hidden="true"><use href="#pay-amex" /></svg>
        <svg className="pay-icon" aria-hidden="true"><use href="#pay-applepay" /></svg>
        <svg className="pay-icon" aria-hidden="true"><use href="#pay-googlepay" /></svg>
      </div>
    </div>
  );
}

/**
 * El checkout lo hostea Stripe (Payment Link) — no podemos poner el pixel
 * ahí. La forma estándar de trackear "inició el pago" en este caso es
 * disparar el evento al click del botón, antes de salir hacia Stripe.
 * preventDefault + navegación manual con un pequeño delay le da tiempo al
 * pixel a mandar el evento antes de que el navegador abandone la página
 * (un href normal podría cortar la petición a mitad de camino).
 */
function handleCheckoutClick(e: React.MouseEvent<HTMLAnchorElement>) {
  e.preventDefault();
  trackMetaEvent("InitiateCheckout", { value: 20, currency: "USD" });
  setTimeout(() => {
    window.location.href = STRIPE_PAYMENT_LINK;
  }, 250);
}

const Frances = () => {
  useEffect(() => {
    document.title = PAGE_TITLE;
  }, []);

  useEffect(() => {
    initMetaPixel();
    trackMetaEvent("PageView");
    trackMetaEvent("ViewContent");
  }, []);

  // Contador de oferta: 30 min desde que entra el usuario
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".js-countdown");
    if (!els.length) return;
    const DURATION_MS = 30 * 60 * 1000;
    const end = Date.now() + DURATION_MS;
    let timer: ReturnType<typeof setInterval>;
    const render = () => {
      const diff = end - Date.now();
      let text: string;
      if (diff <= 0) {
        text = "00:00";
        clearInterval(timer);
      } else {
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        text = `${m < 10 ? "0" + m : m}:${s < 10 ? "0" + s : s}`;
      }
      els.forEach((el) => { el.textContent = text; });
    };
    render();
    timer = setInterval(render, 1000);
    return () => clearInterval(timer);
  }, []);

  // Mostrar/ocultar sticky CTA según scroll
  useEffect(() => {
    const trigger = document.getElementById("sticky-trigger");
    const bar = document.querySelector(".sticky-cta");
    if (!trigger || !bar || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.boundingClientRect.top < 0) {
          bar.classList.add("is-visible");
        } else {
          bar.classList.remove("is-visible");
        }
      });
    }, { threshold: 0 });
    observer.observe(trigger);
    return () => observer.disconnect();
  }, []);

  // Kicker dinámico según país del visitante (geo-IP)
  useEffect(() => {
    const el = document.getElementById("origin-kicker-text");
    if (!el || !("fetch" in window)) return;
    const demonyms: Record<string, string> = {
      AR: "argentinos", BO: "bolivianos", CL: "chilenos", CO: "colombianos", CR: "costarricenses",
      CU: "cubanos", DO: "dominicanos", EC: "ecuatorianos", SV: "salvadoreños", GT: "guatemaltecos",
      HN: "hondureños", MX: "mexicanos", NI: "nicaragüenses", PA: "panameños", PY: "paraguayos",
      PE: "peruanos", UY: "uruguayos", VE: "venezolanos",
    };
    const controller = "AbortController" in window ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 2500) : null;
    fetch("https://get.geojs.io/v1/ip/country.json", controller ? { signal: controller.signal } : {})
      .then((res) => res.json())
      .then((data) => {
        if (timeoutId) clearTimeout(timeoutId);
        const demonym = data && demonyms[data.country];
        if (demonym) {
          el.textContent = `Para ${demonym} en proceso de migrar a Francia`;
        }
      })
      .catch(() => { /* sin conexión o API caída: se queda el texto genérico */ });
    return () => {
      if (controller) controller.abort();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;500;700;900&display=swap" rel="stylesheet" />
      <noscript>
        <img height="1" width="1" style={{ display: "none" }} src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`} alt="" />
      </noscript>

      <style>{`
/* ============ DESIGN TOKENS ============ */
:root{
  --navy:#1B2A4A;
  --navy-dark:#12203A;
  --slate:#4A5D7A;
  --gold:#C9932E;
  --gold-deep:#8C6A1E;
  --cream:#FAF6EF;
  --cream-alt:#F1ECDF;
  --ink:#22262E;
  --ink-soft:#5B6270;
  --line:#DED6BC;
  --warn:#A6472E;
  --ok:#3F6B4A;
  --cta:#C1403A;
  --cta-dark:#9C312C;
  --white:#FFFFFF;
  --serif:'Lato', Arial, Helvetica, sans-serif;
  --sans:'Lato', Arial, Helvetica, sans-serif;
  --radius:14px;
  --shadow-soft:0 10px 30px -12px rgba(27,42,74,.25);
  --shadow-lift:0 18px 40px -16px rgba(27,42,74,.35);
  --maxw:1120px;
}

.frances-page *,.frances-page *::before,.frances-page *::after{box-sizing:border-box;}
.frances-page{scroll-behavior:smooth;}
@media (prefers-reduced-motion: reduce){
  .frances-page{scroll-behavior:auto;}
  .frances-page *,.frances-page *::before,.frances-page *::after{animation-duration:.01ms !important;animation-iteration-count:1 !important;transition-duration:.01ms !important;}
}
.frances-page{
  margin:0;background:var(--cream);color:var(--ink);
  font-family:var(--sans);font-size:16px;line-height:1.65;
  -webkit-font-smoothing:antialiased;overflow-x:hidden;
}
.frances-page img{max-width:100%;display:block;}
.frances-page a{color:inherit;}
.frances-page h1,.frances-page h2,.frances-page h3,.frances-page h4{font-family:var(--serif);color:var(--navy);margin:0;line-height:1.15;}
.frances-page p{margin:0;}
.frances-page ul{margin:0;padding:0;list-style:none;}
.frances-page .container{max-width:var(--maxw);margin:0 auto;padding:0 20px;}
.frances-page section{padding:clamp(48px,7vw,96px) 0;}

.frances-page ::selection{background:var(--gold);color:var(--navy-dark);}
.frances-page :focus-visible{outline:3px solid var(--gold-deep);outline-offset:3px;}

/* ============ ICON SPRITE ============ */
.frances-page .icon{width:22px;height:22px;flex-shrink:0;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;}
.frances-page .pay-icon{width:30px;height:30px;flex-shrink:0;fill:currentColor;stroke:none;color:var(--ink-soft);opacity:.85;}

/* ============ BUTTONS ============ */
.frances-page .btn{
  display:inline-flex;align-items:center;justify-content:center;gap:10px;
  font-family:var(--sans);font-weight:900;font-size:17px;letter-spacing:.01em;
  padding:18px 30px;border-radius:8px;text-decoration:none;cursor:pointer;
  border:2px solid transparent;transition:transform 180ms ease, box-shadow 180ms ease, background-color 180ms ease;
  min-height:44px;text-align:center;
}
.frances-page .btn-primary{
  background:var(--cta);color:var(--white);box-shadow:var(--shadow-lift);
}
.frances-page .btn-primary:hover{background:var(--cta-dark);transform:translateY(-2px);}
.frances-page .btn-primary:active{transform:translateY(0);}
.frances-page .btn-block{width:100%;}
.frances-page .btn-sub{
  display:block;text-align:center;margin-top:12px;font-size:13.5px;color:var(--ink-soft);
}
.frances-page .btn-sub strong{color:var(--navy);}

/* ============ KICKER / EYEBROW ============ */
.frances-page .id-item p,.frances-page .achieve-item p,.frances-page .bonus-body li,.frances-page .pc-includes li,.frances-page .law-row span:last-child{min-width:0;}
.frances-page .kicker{
  display:inline-flex;align-items:center;gap:8px;
  font-family:var(--sans);font-weight:700;font-size:12.5px;letter-spacing:.09em;text-transform:uppercase;
  color:var(--gold-deep);background:var(--cream-alt);border:1px solid var(--line);
  padding:7px 16px;border-radius:999px;margin-bottom:18px;
}
.frances-page #origin-kicker-text{text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1.5px;}

/* ============ HERO ============ */
.frances-page .hero{padding-top:clamp(44px,6vw,80px);padding-bottom:clamp(56px,8vw,104px);}
.frances-page .hero-grid{display:grid;grid-template-columns:1fr;gap:48px;align-items:center;}
@media(min-width:960px){.frances-page .hero-grid{grid-template-columns:1.05fr .95fr;gap:56px;}}
.frances-page .hero h1{font-size:clamp(30px,4.6vw,46px);font-weight:900;letter-spacing:-.01em;}
.frances-page .hero h1 .accent{color:var(--cta);}
.frances-page .hero .sub{margin-top:20px;font-size:18px;color:var(--slate);max-width:56ch;}
.frances-page .flag-fr{width:20px;height:14px;border-radius:2px;overflow:hidden;flex-shrink:0;box-shadow:0 0 0 1px rgba(0,0,0,.1);}

/* ============ IMAGE PLACEHOLDER SKELETON ============ */
.frances-page .img-placeholder{
  border:2px dashed var(--gold);background:var(--cream-alt);border-radius:var(--radius);
  display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;
  gap:10px;padding:28px 20px;color:var(--slate);
}
.frances-page .img-placeholder .icon{width:34px;height:34px;color:var(--gold-deep);}
.frances-page .img-placeholder .ph-label{font-family:var(--sans);font-weight:800;font-size:13px;letter-spacing:.03em;text-transform:uppercase;color:var(--navy);}
.frances-page .img-placeholder .ph-desc{font-size:13.5px;color:var(--ink-soft);max-width:34ch;}
.frances-page .img-placeholder .ph-spec{font-size:11.5px;color:var(--gold-deep);font-weight:700;background:var(--cream);border:1px solid var(--line);border-radius:999px;padding:3px 12px;margin-top:4px;}
.frances-page .ph-ratio-hero{aspect-ratio:4/3;}
.frances-page .ph-ratio-square{aspect-ratio:1/1;}

.frances-page .hero-visual{position:relative;border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow-lift);}
.frances-page .hero-photo{width:100%;aspect-ratio:4/3;object-fit:cover;display:block;}
.frances-page .hero-badge-img{
  position:absolute;bottom:14px;left:14px;width:150px;height:auto;
  filter:drop-shadow(0 6px 14px rgba(0,0,0,.25));
}
.frances-page .ph-ratio-wide{aspect-ratio:16/9;}

/* ============ SECTION HEADINGS ============ */
.frances-page .section-head{max-width:64ch;margin:0 auto 40px;text-align:center;}
.frances-page .section-head.left{margin-left:0;text-align:left;}
.frances-page .section-head h2{font-size:clamp(26px,3.6vw,36px);font-weight:700;}
.frances-page .section-head p{margin-top:14px;font-size:17px;color:var(--slate);}

/* ============ LEY / URGENCIA SECTION ============ */
.frances-page .law{background:var(--navy);color:var(--cream);}
.frances-page .law .section-head h2{color:var(--white);}
.frances-page .law .section-head p{color:#C7D0E0;}
.frances-page .law-cards{display:flex;justify-content:center;margin-top:36px;}
.frances-page .law-card{
  background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.14);border-radius:var(--radius);
  padding:30px 32px;width:100%;max-width:440px;
}
.frances-page .law-card .tramite{font-family:var(--serif);font-size:19px;font-weight:700;color:var(--gold);margin-bottom:16px;text-align:center;}
.frances-page .law-row{display:flex;justify-content:space-between;align-items:center;font-size:15.5px;padding:10px 0;border-top:1px solid rgba(255,255,255,.12);}
.frances-page .law-row:first-of-type{border-top:none;}
.frances-page .law-row .tag{color:#AEB9CE;}
.frances-page .law-row .val{font-weight:800;}
.frances-page .law-row .val.before{color:#AEB9CE;text-decoration:line-through;text-decoration-color:rgba(255,255,255,.35);}
.frances-page .law-row .val.after{color:var(--gold);}
.frances-page .law-cite{margin-top:28px;text-align:center;font-size:13px;color:#AEB9CE;}
.frances-page .law-cite strong{color:var(--cream);}

/* ============ IDENTIFICATION LIST ============ */
.frances-page .id-list{display:grid;grid-template-columns:1fr;gap:16px;margin-top:8px;}
@media(min-width:760px){.frances-page .id-list{grid-template-columns:1fr 1fr;}}
.frances-page .id-item{
  display:flex;gap:14px;align-items:flex-start;background:var(--white);border:1px solid var(--line);
  border-radius:var(--radius);padding:20px 22px;box-shadow:var(--shadow-soft);
}
.frances-page .id-item .icon-wrap{
  flex-shrink:0;width:34px;height:34px;border-radius:50%;background:var(--cream-alt);
  display:flex;align-items:center;justify-content:center;
}
.frances-page .id-item .icon{width:18px;height:18px;color:var(--cta);}
.frances-page .id-item p{font-size:16px;color:var(--ink);font-weight:500;}

/* ============ ACHIEVEMENTS + PRODUCT ============ */
.frances-page .deliver{background:var(--cream-alt);}
.frances-page .deliver-grid{display:grid;grid-template-columns:1fr;gap:44px;}
@media(min-width:960px){.frances-page .deliver-grid{grid-template-columns:1.05fr .95fr;align-items:start;}}
.frances-page .achieve-list{margin-top:28px;display:flex;flex-direction:column;gap:16px;}
.frances-page .achieve-item{display:flex;gap:14px;align-items:flex-start;}
.frances-page .achieve-item .icon-wrap{
  flex-shrink:0;width:30px;height:30px;border-radius:8px;background:var(--navy);
  display:flex;align-items:center;justify-content:center;margin-top:2px;
}
.frances-page .achieve-item .icon{width:16px;height:16px;color:var(--gold);}
.frances-page .achieve-item p{font-size:16.5px;color:var(--ink);}
.frances-page .achieve-item strong{color:var(--navy);}

.frances-page .product-card{
  background:var(--white);border-radius:20px;box-shadow:var(--shadow-lift);
  border:1px solid var(--line);overflow:hidden;position:sticky;top:20px;
}
.frances-page .product-card .pc-visual{padding:22px 22px 0;}
.frances-page .pc-mockup-img{width:100%;aspect-ratio:1/1;object-fit:contain;display:block;}
.frances-page .product-card .pc-body{padding:26px 26px 30px;}
.frances-page .pc-name{font-family:var(--serif);font-size:23px;font-weight:700;color:var(--navy);line-height:1.25;}
.frances-page .pc-tag{margin-top:8px;font-size:14px;color:var(--gold-deep);font-weight:700;text-transform:uppercase;letter-spacing:.04em;}
.frances-page .pc-includes{margin-top:20px;display:flex;flex-direction:column;gap:10px;}
.frances-page .pc-includes li{display:flex;gap:10px;align-items:flex-start;font-size:14.5px;color:var(--ink-soft);}
.frances-page .pc-includes .icon{width:15px;height:15px;color:var(--ok);margin-top:3px;}
.frances-page .pc-trust-badge{margin-top:24px;padding-top:20px;border-top:1px dashed var(--line);display:flex;flex-direction:column;align-items:center;text-align:center;gap:5px;}
.frances-page .pc-stars{display:flex;gap:2px;flex-shrink:0;}
.frances-page .pc-stars .icon{width:16px;height:16px;color:var(--gold-deep);}
.frances-page .pc-star-half{position:relative;display:inline-block;width:16px;height:16px;flex-shrink:0;}
.frances-page .pc-star-half .icon{position:absolute;top:0;left:0;}
.frances-page .pc-star-half .icon-muted{color:var(--line);}
.frances-page .pc-star-half .icon-fill-half{color:var(--gold-deep);clip-path:inset(0 50% 0 0);}
.frances-page .pc-trust-rating{font-size:13px;color:var(--navy);}
.frances-page .pc-trust-rating strong{color:var(--navy);font-weight:800;}
.frances-page .pc-trust-desc{font-size:12.5px;color:var(--ink-soft);line-height:1.35;max-width:44ch;}
.frances-page .pc-discount{margin-top:16px;padding-top:20px;border-top:1px dashed var(--line);}
.frances-page .pc-discount-badge{
  display:inline-block;background:var(--cta);color:var(--white);font-size:12px;font-weight:900;
  letter-spacing:.03em;text-transform:uppercase;padding:6px 12px;border-radius:6px;margin-bottom:12px;
}
.frances-page .pc-price{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;}
.frances-page .pc-price .pc-old-price{font-size:17px;font-weight:700;color:var(--ink-soft);text-decoration:line-through;margin-right:2px;}
.frances-page .pc-price .amount{font-family:var(--serif);font-size:40px;font-weight:900;color:var(--navy);}
.frances-page .pc-price .unit{font-size:14px;color:var(--ink-soft);}

.frances-page .pc-timer{
  display:flex;align-items:center;gap:10px;margin-top:16px;padding:12px 14px;border-radius:8px;
  background:#FBEAE8;border:1px solid #F0C4BE;color:var(--cta-dark);font-size:13.5px;font-weight:700;
}
.frances-page .pc-timer .icon{width:18px;height:18px;color:var(--cta);flex-shrink:0;}
.frances-page .pc-timer strong{font-variant-numeric:tabular-nums;font-size:15px;}

.frances-page .pc-progress{margin-top:16px;}
.frances-page .pc-progress-label{
  display:flex;justify-content:space-between;gap:10px;font-size:12.5px;font-weight:700;
  color:var(--ink-soft);margin-bottom:6px;
}
.frances-page .pc-progress-label span:last-child{color:var(--cta-dark);}
.frances-page .pc-progress-bar{width:100%;height:14px;border-radius:8px;background:var(--cream-alt);border:1px solid var(--line);overflow:hidden;}
.frances-page .pc-progress-fill{
  width:75%;height:100%;border-radius:7px;background-color:var(--cta);
  background-image:repeating-linear-gradient(45deg, rgba(255,255,255,.28) 0 10px, transparent 10px 20px);
  background-size:28px 28px;animation:pc-stripes 1s linear infinite;
}
@media (prefers-reduced-motion: reduce){.frances-page .pc-progress-fill{animation:none;}}
@keyframes pc-stripes{from{background-position:0 0;}to{background-position:28px 0;}}

.frances-page .pc-cta{margin-top:20px;}
.frances-page .pc-payment{margin-top:16px;text-align:center;}
.frances-page .pc-payment-label{display:block;font-size:12px;color:var(--ink-soft);margin-bottom:8px;}
.frances-page .pc-payment-icons{display:flex;justify-content:center;align-items:center;gap:14px;flex-wrap:wrap;}

/* ============ CTA REUTILIZABLE POR SECCIÓN ============ */
.frances-page .section-cta{
  margin:40px auto 0;padding:26px 24px;border-radius:var(--radius);max-width:440px;text-align:center;
  background:var(--white);border:1px solid var(--line);box-shadow:var(--shadow-soft);
}
.frances-page .section-cta-price{font-size:15px;font-weight:900;color:var(--navy);margin-bottom:14px;}
.frances-page .section-cta-price .old{font-weight:600;color:var(--ink-soft);text-decoration:line-through;margin-right:6px;font-size:13.5px;}
.frances-page .section-cta-timer{
  display:flex;align-items:center;justify-content:center;gap:7px;
  font-size:14px;font-weight:700;color:var(--cta-dark);margin-top:-6px;margin-bottom:16px;
}
.frances-page .section-cta-timer .icon{width:17px;height:17px;flex-shrink:0;}
.frances-page .section-cta .btn{width:100%;}
.frances-page .section-cta .pc-payment{margin-top:16px;}
.frances-page .section-cta.on-dark{background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.14);}
.frances-page .section-cta.on-dark .section-cta-price{color:var(--white);}
.frances-page .section-cta.on-dark .section-cta-price .old{color:#AEB9CE;}
.frances-page .section-cta.on-dark .section-cta-timer{color:var(--gold);}
.frances-page .section-cta.on-dark .pc-payment-label{color:#C7D0E0;}
.frances-page .section-cta.on-dark .pay-icon,.frances-page .final-cta .pay-icon{color:#D7DEEB;opacity:1;}

/* ============ EASE OF START ============ */
.frances-page .ease-grid{display:grid;grid-template-columns:1fr;gap:20px;margin-top:36px;}
@media(min-width:760px){.frances-page .ease-grid{grid-template-columns:repeat(3,1fr);}}
.frances-page .ease-card{
  display:flex;gap:14px;align-items:flex-start;
  background:var(--white);border:1px solid var(--line);border-radius:var(--radius);
  padding:22px 20px;box-shadow:var(--shadow-soft);
}
.frances-page .ease-card .icon-wrap{
  flex-shrink:0;width:44px;height:44px;border-radius:12px;background:var(--navy);
  display:flex;align-items:center;justify-content:center;
}
.frances-page .ease-card .icon{width:22px;height:22px;color:var(--gold);}
.frances-page .ease-card h3{font-size:16.5px;font-weight:700;}
.frances-page .ease-card p{margin-top:6px;font-size:14px;color:var(--ink-soft);}

/* ============ BONUSES ============ */
.frances-page .bonuses{background:var(--navy);color:var(--cream);}
.frances-page .bonuses .section-head h2{color:var(--white);}
.frances-page .bonuses .section-head p{color:#C7D0E0;}
.frances-page .gift-badge{
  display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;
  border-radius:50%;background:var(--gold);margin-bottom:18px;
}
.frances-page .gift-badge .icon{width:28px;height:28px;color:var(--navy-dark);stroke-width:1.6;}
.frances-page .bonus-urgency{
  display:inline-block;margin-top:18px;max-width:540px;line-height:1.55;
  background:rgba(201,147,46,.14);border:1.5px solid var(--gold);border-radius:10px;
  padding:12px 22px;font-size:15px;font-weight:700;color:var(--gold);
}
.frances-page .time-chip{
  display:inline-block;background:var(--gold);color:var(--navy-dark);
  padding:2px 10px;border-radius:6px;font-size:16.5px;font-weight:900;
  font-variant-numeric:tabular-nums;margin:0 2px;
}
.frances-page .bonus-urgency .highlight{color:var(--white);}
.frances-page .bonus-grid{display:grid;grid-template-columns:1fr;gap:22px;margin-top:40px;}
@media(min-width:760px){.frances-page .bonus-grid{grid-template-columns:1fr 1fr;}}
.frances-page .bonus-card{
  background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.14);border-radius:var(--radius);
  overflow:hidden;display:flex;flex-direction:column;
}
.frances-page .bonus-visual{padding:16px 16px 0;}
.frances-page .bonus-mockup-img{width:100%;aspect-ratio:1/1;object-fit:contain;display:block;}
.frances-page .pack-mockup-img{width:100%;aspect-ratio:16/9;object-fit:contain;display:block;}
.frances-page .bonus-body{padding:20px 22px 24px;}
.frances-page .bonus-num{
  display:inline-block;font-family:var(--serif);font-size:12.5px;font-weight:700;letter-spacing:.08em;
  color:var(--navy-dark);background:var(--gold);padding:4px 12px;border-radius:999px;margin-bottom:12px;
}
.frances-page .bonus-body h3{font-family:var(--serif);color:var(--white);font-size:19px;font-weight:700;}
.frances-page .bonus-price{margin-top:8px;display:flex;align-items:center;gap:8px;font-size:13px;}
.frances-page .bonus-price .old{color:#8D96AC;text-decoration:line-through;}
.frances-page .bonus-price .free{font-weight:900;color:var(--navy-dark);background:var(--gold);padding:2px 9px;border-radius:5px;text-transform:uppercase;letter-spacing:.02em;font-size:11.5px;}
.frances-page .bonus-empathy{margin-top:10px;font-size:14px;font-style:italic;color:var(--gold);}
.frances-page .bonus-body ul{margin-top:14px;display:flex;flex-direction:column;gap:8px;}
.frances-page .bonus-body li{display:flex;gap:9px;align-items:flex-start;font-size:14px;color:#D7DEEB;}
.frances-page .bonus-body .icon{width:14px;height:14px;color:var(--gold);margin-top:3px;}

/* ============ TESTIMONIALS ============ */
.frances-page .testi-grid{display:grid;grid-template-columns:1fr;gap:20px;}
@media(min-width:760px){.frances-page .testi-grid{grid-template-columns:repeat(3,1fr);}}
.frances-page .testi-card{
  background:var(--white);border:1px solid var(--line);border-radius:var(--radius);padding:24px 22px;
  box-shadow:var(--shadow-soft);
}
.frances-page .testi-card p.quote{font-size:14.5px;color:var(--ink);font-style:italic;min-height:64px;}
.frances-page .testi-person{display:flex;align-items:center;gap:12px;margin-top:18px;}
.frances-page .testi-avatar{
  width:44px;height:44px;border-radius:50%;background:var(--navy);
  display:flex;align-items:center;justify-content:center;font-family:var(--sans);font-size:17px;font-weight:900;color:var(--gold);flex-shrink:0;
}
.frances-page .testi-person .name{font-size:14px;font-weight:800;color:var(--navy);}
.frances-page .testi-person .loc{font-size:12.5px;color:var(--ink-soft);}

/* ============ FAQ ============ */
.frances-page .faq{max-width:800px;margin:0 auto;}
.frances-page .faq details{
  background:var(--white);border:1px solid var(--line);border-radius:12px;padding:6px 22px;margin-bottom:12px;
}
.frances-page .faq summary{
  list-style:none;cursor:pointer;padding:16px 0;font-weight:800;color:var(--navy);font-size:16px;
  display:flex;justify-content:space-between;align-items:center;gap:16px;
}
.frances-page .faq summary::-webkit-details-marker{display:none;}
.frances-page .faq summary .chev{width:20px;height:20px;color:var(--gold-deep);flex-shrink:0;transition:transform 200ms ease;}
.frances-page .faq details[open] summary .chev{transform:rotate(180deg);}
.frances-page .faq .faq-a{padding:0 0 18px;font-size:15px;color:var(--ink-soft);}

/* ============ FINAL CTA ============ */
.frances-page .final-cta{
  background:linear-gradient(180deg,var(--navy) 0%,var(--navy-dark) 100%);color:var(--cream);text-align:center;
}
.frances-page .final-cta h2{color:var(--white);font-size:clamp(26px,4vw,38px);font-weight:700;}
.frances-page .final-cta .sub{margin-top:14px;font-size:17px;color:#C7D0E0;max-width:56ch;margin-left:auto;margin-right:auto;}
.frances-page .final-mockup{margin:36px auto 0;max-width:520px;}
.frances-page .final-mockup .img-placeholder{border-color:var(--gold);background:rgba(255,255,255,.04);}
.frances-page .final-mockup .icon{color:var(--gold);}
.frances-page .final-mockup .ph-label{color:var(--white);}
.frances-page .final-mockup .ph-desc{color:#C7D0E0;}
.frances-page .final-cta .cta-wrap{margin:34px auto 0;max-width:420px;}

/* ============ FOOTER ============ */
.frances-page footer{background:#0A0A0A;padding:28px 0 100px;}
.frances-page footer .container{text-align:center;}
.frances-page footer .fdisclaimer{font-size:12px;color:#9CA3AF;max-width:70ch;margin:0 auto;}

/* ============ STICKY MOBILE CTA ============ */
.frances-page .sticky-cta{
  display:none;position:fixed;left:0;right:0;bottom:0;z-index:50;
  background:var(--white);border-top:1px solid var(--line);box-shadow:0 -8px 24px rgba(0,0,0,.12);
  padding:10px 14px;padding-bottom:calc(10px + env(safe-area-inset-bottom));
}
.frances-page .sticky-cta-inner{display:flex;align-items:center;gap:10px;}
.frances-page .sticky-thumb{
  flex-shrink:0;width:38px;height:38px;border-radius:7px;overflow:hidden;
  background:var(--cream-alt);display:flex;align-items:center;justify-content:center;
}
.frances-page .sticky-thumb-img{width:100%;height:100%;object-fit:cover;object-position:center 35%;}
.frances-page .sticky-text{flex-shrink:0;display:flex;flex-direction:column;gap:1px;}
.frances-page .sticky-price{font-size:13.5px;font-weight:900;color:var(--navy);white-space:nowrap;}
.frances-page .sticky-price .old{font-weight:600;color:var(--ink-soft);text-decoration:line-through;margin-right:4px;}
.frances-page .sticky-timer{font-size:11px;font-weight:700;color:var(--cta-dark);white-space:nowrap;}
.frances-page .sticky-timer strong{font-variant-numeric:tabular-nums;}
.frances-page .sticky-btn{
  flex:1;min-width:0;padding:15px 12px;font-size:13.5px;line-height:1.2;
  white-space:normal;text-align:center;gap:8px;
}
.frances-page .sticky-btn .arrow{width:13px;height:13px;fill:currentColor;stroke:none;flex-shrink:0;}
.frances-page #sticky-trigger{height:1px;}
@media(max-width:760px){
  .frances-page .sticky-cta{display:none;}
  .frances-page .sticky-cta.is-visible{display:block;}
  .frances-page{padding-bottom:104px;}
}

/* ============ CENTRADO EN MOBILE ============ */
@media(max-width:760px){
  .frances-page .hero-grid > div:first-child{text-align:center;}
  .frances-page .hero .sub{margin-left:auto;margin-right:auto;}
  .frances-page .kicker{justify-content:center;}

  .frances-page .section-head.left{text-align:center;margin-left:auto;margin-right:auto;}

  .frances-page .law-card{text-align:center;}

  .frances-page .pc-tag,.frances-page .pc-name{text-align:center;}
  .frances-page .pc-discount{text-align:center;}
  .frances-page .pc-price{justify-content:center;}
  .frances-page .pc-timer{justify-content:center;}

  .frances-page .bonus-body h3,.frances-page .bonus-body .bonus-num,.frances-page .bonus-empathy{text-align:center;display:block;}
  .frances-page .bonus-price{justify-content:center;}
  .frances-page .bonus-body .bonus-num{margin-left:auto;margin-right:auto;}

  .frances-page .testi-card{text-align:center;}
  .frances-page .testi-person{justify-content:center;}
}
      `}</style>

      <div className="frances-page">
        {/* ============ SPRITE DE ICONOS (SVG en línea, sin dependencias externas) ============ */}
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
          <symbol id="i-check" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></symbol>
          <symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 2 4 5v6c0 5 3.4 9 8 11 4.6-2 8-6 8-11V5z" /><polyline points="9 12 11.5 14.5 16 9.5" /></symbol>
          <symbol id="i-mail" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" /><polyline points="3 7 12 13 21 7" /></symbol>
          <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 16 14" /></symbol>
          <symbol id="i-alert" viewBox="0 0 24 24"><path d="M12 3 2 20h20z" /><line x1="12" y1="9" x2="12" y2="14" /><line x1="12" y1="17" x2="12.01" y2="17" /></symbol>
          <symbol id="i-image" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.6" /><polyline points="21 15 15 9 5 19" /></symbol>
          <symbol id="i-quote" viewBox="0 0 24 24"><path d="M7 7c-2.5 0-4 2-4 4.5S4.5 16 7 16v3c-3.9 0-7-3.1-7-7s3.1-7 7-7zM19 7c-2.5 0-4 2-4 4.5S16.5 16 19 16v3c-3.9 0-7-3.1-7-7s3.1-7 7-7z" fill="currentColor" stroke="none" /></symbol>
          <symbol id="i-book" viewBox="0 0 24 24"><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17Z" /><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /></symbol>
          <symbol id="i-user" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></symbol>
          <symbol id="i-map" viewBox="0 0 24 24"><path d="M9 20 3 17V5l6 3 6-3 6 3v12l-6-3-6 3Z" /><line x1="9" y1="8" x2="9" y2="20" /><line x1="15" y1="5" x2="15" y2="17" /></symbol>
          <symbol id="i-target" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></symbol>
          <symbol id="i-chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9" /></symbol>
          <symbol id="i-mic" viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><line x1="12" y1="18" x2="12" y2="22" /></symbol>
          <symbol id="i-calendar" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="16" y1="2" x2="16" y2="6" /></symbol>
          {/* Logos de métodos de pago — trazos oficiales de Simple Icons (simpleicons.org), monocromos */}
          <symbol id="pay-visa" viewBox="0 0 24 24"><path d="M9.112 8.262L5.97 15.758H3.92L2.374 9.775c-.094-.368-.175-.503-.461-.658C1.447 8.864.677 8.627 0 8.479l.046-.217h3.3a.904.904 0 01.894.764l.817 4.338 2.018-5.102zm8.033 5.049c.008-1.979-2.736-2.088-2.717-2.972.006-.269.262-.555.822-.628a3.66 3.66 0 011.913.336l.34-1.59a5.207 5.207 0 00-1.814-.333c-1.917 0-3.266 1.02-3.278 2.479-.012 1.079.963 1.68 1.698 2.04.756.367 1.01.603 1.006.931-.005.504-.602.725-1.16.734-.975.015-1.54-.263-1.992-.473l-.351 1.642c.453.208 1.289.39 2.156.398 2.037 0 3.37-1.006 3.377-2.564m5.061 2.447H24l-1.565-7.496h-1.656a.883.883 0 00-.826.55l-2.909 6.946h2.036l.405-1.12h2.488zm-2.163-2.656l1.02-2.815.588 2.815zm-8.16-4.84l-1.603 7.496H8.34l1.605-7.496z" /></symbol>
          <symbol id="pay-mastercard" viewBox="0 0 24 24"><path d="M11.343 18.031c.058.049.12.098.181.146-1.177.783-2.59 1.238-4.107 1.238C3.32 19.416 0 16.096 0 12c0-4.095 3.32-7.416 7.416-7.416 1.518 0 2.931.456 4.105 1.238-.06.051-.12.098-.165.15C9.6 7.489 8.595 9.688 8.595 12c0 2.311 1.001 4.51 2.748 6.031zm5.241-13.447c-1.52 0-2.931.456-4.105 1.238.06.051.12.098.165.15C14.4 7.489 15.405 9.688 15.405 12c0 2.31-1.001 4.507-2.748 6.031-.058.049-.12.098-.181.146 1.177.783 2.588 1.238 4.107 1.238C20.68 19.416 24 16.096 24 12c0-4.094-3.32-7.416-7.416-7.416zM12 6.174c-.096.075-.189.15-.28.231C10.156 7.764 9.169 9.765 9.169 12c0 2.236.987 4.236 2.551 5.595.09.08.185.158.28.232.096-.074.189-.152.28-.232 1.563-1.359 2.551-3.359 2.551-5.595 0-2.235-.987-4.236-2.551-5.595-.09-.08-.184-.156-.28-.231z" /></symbol>
          <symbol id="pay-amex" viewBox="0 0 24 24"><path d="M16.015 14.378c0-.32-.135-.496-.344-.622-.21-.12-.464-.135-.81-.135h-1.543v2.82h.675v-1.027h.72c.24 0 .39.024.478.125.12.13.104.38.104.55v.35h.66v-.555c-.002-.25-.017-.376-.108-.516-.06-.08-.18-.18-.33-.234l.02-.008c.18-.072.48-.297.48-.747zm-.87.407l-.028-.002c-.09.053-.195.058-.33.058h-.81v-.63h.824c.12 0 .24 0 .33.05.098.048.156.147.15.255 0 .12-.045.215-.134.27zM20.297 15.837H19v.6h1.304c.676 0 1.05-.278 1.05-.884 0-.28-.066-.448-.187-.582-.153-.133-.392-.193-.73-.207l-.376-.015c-.104 0-.18 0-.255-.03-.09-.03-.15-.105-.15-.21 0-.09.017-.166.09-.21.083-.046.177-.066.272-.06h1.23v-.602h-1.35c-.704 0-.958.437-.958.84 0 .9.776.855 1.407.87.104 0 .18.015.225.06.046.03.082.106.082.18 0 .077-.035.15-.08.18-.06.053-.15.07-.277.07zM0 0v10.096L.81 8.22h1.75l.225.464V8.22h2.043l.45 1.02.437-1.013h6.502c.295 0 .56.057.756.236v-.23h1.787v.23c.307-.17.686-.23 1.12-.23h2.606l.24.466v-.466h1.918l.254.465v-.466h1.858v3.948H20.87l-.36-.6v.585h-2.353l-.256-.63h-.583l-.27.614h-1.213c-.48 0-.84-.104-1.08-.24v.24h-2.89v-.884c0-.12-.03-.12-.105-.135h-.105v1.036H6.067v-.48l-.21.48H4.69l-.202-.48v.465H2.235l-.256-.624H1.4l-.256.624H0V24h23.786v-7.108c-.27.135-.613.18-.973.18H21.09v-.255c-.21.165-.57.255-.914.255H14.71v-.9c0-.12-.018-.12-.12-.12h-.075v1.022h-1.8v-1.066c-.298.136-.643.15-.928.136h-.214v.915h-2.18l-.54-.617-.57.6H4.742v-3.93h3.61l.518.602.554-.6h2.412c.28 0 .74.03.942.225v-.24h2.177c.202 0 .644.045.903.225v-.24h3.265v.24c.163-.164.508-.24.803-.24h1.89v.24c.194-.15.464-.24.84-.24h1.176V0H0zM21.156 14.955c.004.005.006.012.01.016.01.01.024.01.032.02l-.042-.035zM23.828 13.082h.065v.555h-.065zM23.865 15.03v-.005c-.03-.025-.046-.048-.075-.07-.15-.153-.39-.215-.764-.225l-.36-.012c-.12 0-.194-.007-.27-.03-.09-.03-.15-.105-.15-.21 0-.09.03-.16.09-.204.076-.045.15-.05.27-.05h1.223v-.588h-1.283c-.69 0-.96.437-.96.84 0 .9.78.855 1.41.87.104 0 .18.015.224.06.046.03.076.106.076.18 0 .07-.034.138-.09.18-.045.056-.136.07-.27.07h-1.288v.605h1.287c.42 0 .734-.118.9-.36h.03c.09-.134.135-.3.135-.523 0-.24-.045-.39-.135-.526zM18.597 14.208v-.583h-2.235V16.458h2.235v-.585h-1.57v-.57h1.533v-.584h-1.532v-.51M13.51 8.787h.685V11.6h-.684zM13.126 9.543l-.007.006c0-.314-.13-.5-.34-.624-.217-.125-.47-.135-.81-.135H10.43v2.82h.674v-1.034h.72c.24 0 .39.03.487.12.122.136.107.378.107.548v.354h.677v-.553c0-.25-.016-.375-.11-.516-.09-.107-.202-.19-.33-.237.172-.07.472-.3.472-.75zm-.855.396h-.015c-.09.054-.195.056-.33.056H11.1v-.623h.825c.12 0 .24.004.33.05.09.04.15.128.15.25s-.047.22-.134.266zM15.92 9.373h.632v-.6h-.644c-.464 0-.804.105-1.02.33-.286.3-.362.69-.362 1.11 0 .512.123.833.36 1.074.232.238.645.31.97.31h.78l.255-.627h1.39l.262.627h1.36v-2.11l1.272 2.11h.95l.002.002V8.786h-.684v1.963l-1.18-1.96h-1.02V11.4L18.11 8.744h-1.004l-.943 2.22h-.3c-.177 0-.362-.03-.468-.134-.125-.15-.186-.36-.186-.662 0-.285.08-.51.194-.63.133-.135.272-.165.516-.165zm1.668-.108l.464 1.118v.002h-.93l.466-1.12zM2.38 10.97l.254.628H4V9.393l.972 2.205h.584l.973-2.202.015 2.202h.69v-2.81H6.118l-.807 1.904-.876-1.905H3.343v2.663L2.205 8.787h-.997L.01 11.597h.72l.26-.626h1.39zm-.688-1.705l.46 1.118-.003.002h-.915l.457-1.12zM11.856 13.62H9.714l-.85.923-.825-.922H5.346v2.82H8l.855-.932.824.93h1.302v-.94h.838c.6 0 1.17-.164 1.17-.945l-.006-.003c0-.78-.598-.93-1.128-.93zM7.67 15.853l-.014-.002H6.02v-.557h1.47v-.574H6.02v-.51H7.7l.733.82-.764.824zm2.642.33l-1.03-1.147 1.03-1.108v2.253zm1.553-1.258h-.885v-.717h.885c.24 0 .42.098.42.344 0 .243-.15.372-.42.372zM9.967 9.373v-.586H7.73V11.6h2.237v-.58H8.4v-.564h1.527V9.88H8.4v-.507" /></symbol>
          <symbol id="pay-applepay" viewBox="0 0 24 24"><path d="M2.15 4.318a42.16 42.16 0 0 0-.454.003c-.15.005-.303.013-.452.04a1.44 1.44 0 0 0-1.06.772c-.07.138-.114.278-.14.43-.028.148-.037.3-.04.45A10.2 10.2 0 0 0 0 6.222v11.557c0 .07.002.138.003.207.004.15.013.303.04.452.027.15.072.291.142.429a1.436 1.436 0 0 0 .63.63c.138.07.278.115.43.142.148.027.3.036.45.04l.208.003h20.194l.207-.003c.15-.004.303-.013.452-.04.15-.027.291-.071.428-.141a1.432 1.432 0 0 0 .631-.631c.07-.138.115-.278.141-.43.027-.148.036-.3.04-.45.002-.07.003-.138.003-.208l.001-.246V6.221c0-.07-.002-.138-.004-.207a2.995 2.995 0 0 0-.04-.452 1.446 1.446 0 0 0-1.2-1.201 3.022 3.022 0 0 0-.452-.04 10.448 10.448 0 0 0-.453-.003zm0 .512h19.942c.066 0 .131.002.197.003.115.004.25.01.375.032.109.02.2.05.287.094a.927.927 0 0 1 .407.407.997.997 0 0 1 .094.288c.022.123.028.258.031.374.002.065.003.13.003.197v11.552c0 .065 0 .13-.003.196-.003.115-.009.25-.032.375a.927.927 0 0 1-.5.693 1.002 1.002 0 0 1-.286.094 2.598 2.598 0 0 1-.373.032l-.2.003H1.906c-.066 0-.133-.002-.196-.003a2.61 2.61 0 0 1-.375-.032c-.109-.02-.2-.05-.288-.094a.918.918 0 0 1-.406-.407 1.006 1.006 0 0 1-.094-.288 2.531 2.531 0 0 1-.032-.373 9.588 9.588 0 0 1-.002-.197V6.224c0-.065 0-.131.002-.197.004-.114.01-.248.032-.375.02-.108.05-.199.094-.287a.925.925 0 0 1 .407-.406 1.03 1.03 0 0 1 .287-.094c.125-.022.26-.029.375-.032.065-.002.131-.002.196-.003zm4.71 3.7c-.3.016-.668.199-.88.456-.191.22-.36.58-.316.918.338.03.675-.169.888-.418.205-.258.345-.603.308-.955zm2.207.42v5.493h.852v-1.877h1.18c1.078 0 1.835-.739 1.835-1.812 0-1.07-.742-1.805-1.808-1.805zm.852.719h.982c.739 0 1.161.396 1.161 1.089 0 .692-.422 1.092-1.164 1.092h-.979zm-3.154.3c-.45.01-.83.28-1.05.28-.235 0-.593-.264-.981-.257a1.446 1.446 0 0 0-1.23.747c-.527.908-.139 2.255.374 2.995.249.366.549.769.944.754.373-.014.52-.242.973-.242.454 0 .586.242.98.235.41-.007.667-.366.915-.733.286-.417.403-.82.41-.841-.007-.008-.79-.308-.797-1.209-.008-.754.615-1.113.644-1.135-.352-.52-.9-.578-1.09-.593a1.123 1.123 0 0 0-.092-.002zm8.204.397c-.99 0-1.606.533-1.652 1.256h.777c.072-.358.369-.586.845-.586.502 0 .803.266.803.711v.309l-1.097.064c-.951.054-1.488.484-1.488 1.184 0 .72.548 1.207 1.332 1.207.526 0 1.032-.281 1.264-.727h.019v.659h.788v-2.76c0-.803-.62-1.317-1.591-1.317zm1.94.072l1.446 4.009c0 .003-.073.24-.073.247-.125.41-.33.571-.711.571-.069 0-.206 0-.267-.015v.666c.06.011.267.019.335.019.83 0 1.226-.312 1.568-1.283l1.5-4.214h-.868l-1.012 3.259h-.015l-1.013-3.26zm-1.167 2.189v.316c0 .521-.45.917-1.024.917-.442 0-.731-.228-.731-.579 0-.342.278-.56.769-.593z" /></symbol>
          <symbol id="pay-googlepay" viewBox="0 0 24 24"><path d="M3.963 7.235A3.963 3.963 0 00.422 9.419a3.963 3.963 0 000 3.559 3.963 3.963 0 003.541 2.184c1.07 0 1.97-.352 2.627-.957.748-.69 1.18-1.71 1.18-2.916a4.722 4.722 0 00-.07-.806H3.964v1.526h2.14a1.835 1.835 0 01-.79 1.205c-.356.241-.814.379-1.35.379-1.034 0-1.911-.697-2.225-1.636a2.375 2.375 0 010-1.517c.314-.94 1.191-1.636 2.225-1.636a2.152 2.152 0 011.52.594l1.132-1.13a3.808 3.808 0 00-2.652-1.033zm6.501.55v6.9h.886V11.89h1.465c.603 0 1.11-.196 1.522-.588a1.911 1.911 0 00.635-1.464 1.92 1.92 0 00-.635-1.456 2.125 2.125 0 00-1.522-.598zm2.427.85a1.156 1.156 0 01.823.365 1.176 1.176 0 010 1.686 1.171 1.171 0 01-.877.357H11.35V8.635h1.487a1.156 1.156 0 01.054 0zm4.124 1.175c-.842 0-1.477.308-1.907.925l.781.491c.288-.417.68-.626 1.175-.626a1.255 1.255 0 01.856.323 1.009 1.009 0 01.366.785v.202c-.34-.193-.774-.289-1.3-.289-.617 0-1.11.145-1.479.434-.37.288-.554.677-.554 1.165a1.476 1.476 0 00.525 1.156c.35.308.785.463 1.305.463.61 0 1.098-.27 1.465-.81h.038v.655h.848v-2.909c0-.61-.19-1.09-.568-1.44-.38-.35-.896-.525-1.551-.525zm2.263.154l1.946 4.422-1.098 2.38h.915L24 9.963h-.965l-1.368 3.391h-.02l-1.406-3.39zm-2.146 2.368c.494 0 .88.11 1.156.33 0 .372-.147.696-.44.973a1.413 1.413 0 01-.997.414 1.081 1.081 0 01-.69-.232.708.708 0 01-.293-.578c0-.257.12-.47.363-.647.24-.173.54-.26.9-.26Z" /></symbol>
          <symbol id="i-gift" viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="4" rx="1" /><rect x="4" y="12" width="16" height="9" rx="1" /><line x1="12" y1="8" x2="12" y2="21" /><path d="M12 8c0-2.5-1.6-4.5-3.5-4.5S6 4.8 6 6c0 1.6 2 2 6 2Z" /><path d="M12 8c0-2.5 1.6-4.5 3.5-4.5S18 4.8 18 6c0 1.6-2 2-6 2Z" /></symbol>
          <symbol id="i-triangle-right" viewBox="0 0 24 24"><path d="M7 4v16l14-8z" fill="currentColor" stroke="none" /></symbol>
          <symbol id="i-star" viewBox="0 0 24 24"><path d="M12 2.5l2.9 6.3 6.9.7-5.2 4.7 1.5 6.8L12 17.6l-6.1 3.4 1.5-6.8L2.2 9.5l6.9-.7z" fill="currentColor" stroke="none" /></symbol>
        </svg>

        {/* ============ HERO ============ */}
        <header className="hero">
          <div className="container hero-grid">
            <div>
              <span className="kicker">
                <svg className="flag-fr" viewBox="0 0 30 20" aria-hidden="true">
                  <rect width="30" height="20" fill="#fff" />
                  <rect width="10" height="20" fill="#0055A4" />
                  <rect x="20" width="10" height="20" fill="#EF4135" />
                </svg>
                <span id="origin-kicker-text">Para latinoamericanos en proceso de migrar a Francia</span>
              </span>
              <h1>Aprueba tu Examen <span className="accent">DELF A2</span> en Menos de 14 Días y Cumple el Requisito de tu Trámite en Francia</h1>
              <p className="sub">Deja de pensar «no sé si voy a llegar list@ a mi cita». Preséntate a tu examen con un plan claro: nuestra guía está diseñada específicamente para el DELF/TCF A2 — no para «aprender francés en general».</p>
            </div>

            <div>
              <div className="hero-visual">
                <img src="/frances/imagenes/hero-vida-en-francia-v2.webp" alt="Dos amigos latinoamericanos sonriendo en la terraza de un café en una calle francesa, con una bandera de Francia de fondo" className="hero-photo" />
                <img src="/frances/imagenes/badge-delf-a2-aprobado.webp" alt="Sello: DELF A2 Aprobado" className="hero-badge-img" />
              </div>
            </div>
          </div>
        </header>

        {/* ============ POR QUÉ URGE AHORA (CONTEXTO LEGAL) ============ */}
        <section className="law">
          <div className="container">
            <div className="section-head">
              <h2>La Ley Cambió — Y tu Trámite No Puede Esperar</h2>
              <p>Desde el 1° de enero de 2026, la ley n.º 2024-42 y su decreto n.º 2025-648 subieron el nivel de francés exigido en cada etapa del proceso migratorio. Esto no es a futuro: aplica también a expedientes ya iniciados o incompletos.</p>
            </div>

            <div className="law-cards">
              <div className="law-card">
                <div className="tramite">Carte de séjour pluriannuelle<br />(primer permiso)</div>
                <div className="law-row"><span className="tag">Antes</span><span className="val before">Sin nivel exigido</span></div>
                <div className="law-row"><span className="tag">Desde 2026</span><span className="val after">Nivel A2</span></div>
              </div>
            </div>

            <p className="law-cite">Sin el certificado de A2, la préfecture no avanza tu trámite — así de simple. Si estás en tu primer permiso, es justo el examen para el que te prepara esta guía.</p>
          </div>
        </section>

        {/* ============ ESTO ES PARA TI SI... ============ */}
        <section id="para-ti">
          <div className="container">
            <div className="section-head">
              <h2>Esto Es Para Ti Si...</h2>
            </div>

            <ul className="id-list">
              <li className="id-item">
                <span className="icon-wrap"><svg className="icon" aria-hidden="true"><use href="#i-map" /></svg></span>
                <p>Tienes (o vas a tener pronto) una cita en la préfecture y necesitas certificar tu nivel de francés para tu carte de séjour.</p>
              </li>
              <li className="id-item">
                <span className="icon-wrap"><svg className="icon" aria-hidden="true"><use href="#i-book" /></svg></span>
                <p>Ya estás tomando clases o estudiando por tu cuenta, pero nadie te explicó el formato exacto del examen DELF o TCF.</p>
              </li>
              <li className="id-item">
                <span className="icon-wrap"><svg className="icon" aria-hidden="true"><use href="#i-alert" /></svg></span>
                <p>Iniciaste tu trámite antes de 2026 y ahora te enteras de que te exigen un nivel que antes no te pedían.</p>
              </li>
              <li className="id-item">
                <span className="icon-wrap"><svg className="icon" aria-hidden="true"><use href="#i-clock" /></svg></span>
                <p>Te da miedo presentarte al examen, reprobar, y tener que esperar meses por una nueva fecha disponible.</p>
              </li>
              <li className="id-item">
                <span className="icon-wrap"><svg className="icon" aria-hidden="true"><use href="#i-target" /></svg></span>
                <p>Quieres un plan concreto con fecha límite, no seguir estudiando "francés en general" sin saber si vas a llegar a tiempo.</p>
              </li>
            </ul>
          </div>
        </section>

        {/* ============ LOGRO + PRODUCTO ============ */}
        <section className="deliver" id="producto">
          <div className="container">
            <div className="deliver-grid">
              <div>
                <div className="section-head left">
                  <h2>En Menos de 14 Días, Vas a:</h2>
                </div>

                <div className="achieve-list">
                  <div className="achieve-item">
                    <span className="icon-wrap"><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg></span>
                    <p><strong>Saber exactamente qué examen te corresponde</strong> — DELF o TCF, A2 o B1 — según tu tipo de carte de séjour, sin dudas ni trámites de más.</p>
                  </div>
                  <div className="achieve-item">
                    <span className="icon-wrap"><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg></span>
                    <p><strong>Conocer a fondo las 4 pruebas del DELF A2:</strong> tiempos exactos, puntaje mínimo por prueba y cómo se corrige cada una.</p>
                  </div>
                  <div className="achieve-item">
                    <span className="icon-wrap"><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg></span>
                    <p><strong>Evitar los errores típicos de hispanohablantes</strong> que bajan puntos sin que te des cuenta: interferencias del español, falsos amigos.</p>
                  </div>
                  <div className="achieve-item">
                    <span className="icon-wrap"><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg></span>
                    <p><strong>Tener un cronograma armado hacia atrás</strong> desde tu fecha de cita o examen, para estudiar lo justo y no perder tiempo.</p>
                  </div>
                  <div className="achieve-item">
                    <span className="icon-wrap"><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg></span>
                    <p><strong>Llegar al día del examen habiendo rendido ya un simulacro completo</strong> — no vas a enfrentarte a nada por primera vez.</p>
                  </div>
                </div>
              </div>

              <div>
                <div className="product-card">
                  <div className="pc-visual">
                    <img src="/frances/imagenes/mockup-producto-principal-v2.webp" alt="Mockup de la Guía DELF A2: libro, versión en celular y archivo PDF" className="pc-mockup-img" />
                  </div>
                  <div className="pc-body">
                    <p className="pc-tag">Guía + sistema de preparación</p>
                    <h3 className="pc-name">Guía para Aprobar tu Examen DELF A2 y Cumplir el Requisito de tu Trámite en Francia</h3>

                    <ul className="pc-includes">
                      <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> Checklist de trámite: qué examen corresponde según tu carte de séjour</li>
                      <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> Test de autoevaluación de tu nivel actual</li>
                      <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> Anatomía completa de las 4 pruebas del examen</li>
                      <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> Estrategia por sección y manejo del tiempo</li>
                      <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> Entrenamiento específico de comprensión oral</li>
                      <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> Plantillas comentadas de expresión escrita, con ejemplos resueltos</li>
                      <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> Cómo es la entrevista oral real y cómo estructurar tus respuestas</li>
                      <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> Puente A2 → B1 para tu próxima renovación</li>
                      <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> + 4 bonos de regalo (más abajo)</li>
                    </ul>

                    <div className="pc-trust-badge">
                      <div className="pc-stars">
                        <svg className="icon" aria-hidden="true"><use href="#i-star" /></svg>
                        <svg className="icon" aria-hidden="true"><use href="#i-star" /></svg>
                        <svg className="icon" aria-hidden="true"><use href="#i-star" /></svg>
                        <svg className="icon" aria-hidden="true"><use href="#i-star" /></svg>
                        <span className="pc-star-half">
                          <svg className="icon icon-muted" aria-hidden="true"><use href="#i-star" /></svg>
                          <svg className="icon icon-fill-half" aria-hidden="true"><use href="#i-star" /></svg>
                        </span>
                      </div>
                      <span className="pc-trust-rating"><strong>4.5/5</strong> · +127 reseñas</span>
                      <span className="pc-trust-desc">Contenido diseñado sobre el formato oficial del DELF, actualizado a la ley vigente desde 2026</span>
                    </div>

                    <div className="pc-discount">
                      <span className="pc-discount-badge">-49% Descuento en la Edición Actualizada 2026</span>
                      <div className="pc-price">
                        <span className="pc-old-price">$39 USD</span>
                        <span className="amount">$20</span>
                        <span className="unit">USD · pago único</span>
                      </div>
                    </div>

                    <div className="pc-timer">
                      <svg className="icon" aria-hidden="true"><use href="#i-clock" /></svg>
                      <span>Este precio de la edición 2026 termina en <strong className="js-countdown">30:00</strong></span>
                    </div>

                    <div className="pc-progress">
                      <div className="pc-progress-label">
                        <span>Cupos con precio de edición 2026</span>
                      </div>
                      <div className="pc-progress-bar"><div className="pc-progress-fill" /></div>
                    </div>

                    <div className="pc-cta">
                      <a href={STRIPE_PAYMENT_LINK} onClick={handleCheckoutClick} className="btn btn-primary btn-block">Sí, Quiero Mi Guía DELF A2</a>
                    </div>

                    <PaymentIcons />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ FACILIDAD DE COMIENZO ============ */}
        <div id="sticky-trigger" />
        <section className="ease">
          <div className="container">
            <div className="section-head">
              <h2>No Importa en Qué Punto Estás Hoy</h2>
              <p>Tengas experiencia con el francés o estés arrancando ahora, así es como funciona.</p>
            </div>

            <div className="ease-grid">
              <div className="ease-card">
                <span className="icon-wrap"><svg className="icon" aria-hidden="true"><use href="#i-target" /></svg></span>
                <div>
                  <h3>Empiezas justo donde estás</h3>
                  <p>No hace falta que sepas si estás en A1 o casi en A2 — el test de autoevaluación te lo dice en minutos, así arrancas por lo que de verdad te falta, sin perder tiempo ni frustrarte.</p>
                </div>
              </div>
              <div className="ease-card">
                <span className="icon-wrap"><svg className="icon" aria-hidden="true"><use href="#i-mail" /></svg></span>
                <div>
                  <h3>Acceso inmediato por email</h3>
                  <p>Sabemos lo que es comprar algo y quedarte esperando. Con esta guía no: apenas se acredita el pago, te llega todo al correo — el mismo día, sin vueltas.</p>
                </div>
              </div>
              <div className="ease-card">
                <span className="icon-wrap"><svg className="icon" aria-hidden="true"><use href="#i-book" /></svg></span>
                <div>
                  <h3>A tu ritmo, sin presión</h3>
                  <p>Entre el trabajo, la casa y todo lo demás, sabemos que no siempre sobra tiempo. Por eso es un PDF que abres cuando puedes —desde el celular, la tablet o la compu— y avanzas con tu propio cronograma, a tu paso.</p>
                </div>
              </div>
            </div>

            <div className="section-cta">
              <div className="section-cta-price"><span className="old">$39 USD</span>$20 USD · pago único</div>
              <a href={STRIPE_PAYMENT_LINK} onClick={handleCheckoutClick} className="btn btn-primary">Quiero Empezar Hoy</a>
              <PaymentIcons />
            </div>
          </div>
        </section>

        {/* ============ BONOS ============ */}
        <section className="bonuses" id="bonos">
          <div className="container">
            <div className="section-head">
              <span className="gift-badge"><svg className="icon" aria-hidden="true"><use href="#i-gift" /></svg></span>
              <h2>Además, Te Llevas 4 Bonos de Regalo</h2>
              <p>Aprobar el examen es solo una parte del camino. Estos bonos están para que también te puedas defender en tu día a día en Francia — en el banco, con el casero, en el médico — no solo frente al examinador.</p>
              <p className="bonus-urgency">Solo por los próximos <strong className="js-countdown time-chip">30:00</strong> te los llevas <strong className="highlight">GRATIS</strong> con tu compra — después vuelven a su precio normal.</p>
            </div>

            <div className="bonus-grid">
              <div className="bonus-card">
                <div className="bonus-visual">
                  <img src="/frances/imagenes/mockup-bono-1.webp" alt="Mockup del Bono 1: Simulacro Completo del DELF A2" className="bonus-mockup-img" />
                </div>
                <div className="bonus-body">
                  <span className="bonus-num">BONO 1</span>
                  <h3>Simulacro Completo del DELF A2</h3>
                  <div className="bonus-price"><span className="old">Valor $15 USD</span><span className="free">GRATIS hoy</span></div>
                  <p className="bonus-empathy">Para que el día del examen no sea la primera vez que te enfrentas a algo así — llegas sabiendo exactamente qué esperar.</p>
                  <ul>
                    <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> Examen completo con las 4 pruebas, cronometrado con tiempos reales</li>
                    <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> Comprensión oral con guion de audio incluido</li>
                    <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> Hoja de respuestas + corrección explicada pregunta por pregunta</li>
                    <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> Tabla de equivalencia: sabes si aprobarías si lo rindieras hoy</li>
                  </ul>
                </div>
              </div>

              <div className="bonus-card">
                <div className="bonus-visual">
                  <img src="/frances/imagenes/mockup-bono-2.webp" alt="Mockup del Bono 2: Glosario de Vocabulario de Trámites" className="bonus-mockup-img" />
                </div>
                <div className="bonus-body">
                  <span className="bonus-num">BONO 2</span>
                  <h3>Glosario de Vocabulario de Trámites</h3>
                  <div className="bonus-price"><span className="old">Valor $12 USD</span><span className="free">GRATIS hoy</span></div>
                  <p className="bonus-empathy">Para que no te quedes en blanco justo cuando más lo necesitas: en la préfecture, el banco o el alquiler.</p>
                  <ul>
                    <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> Vocabulario por situación: préfecture/OFII, banco, alquiler, salud, trabajo/CAF</li>
                    <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> Frases armadas y listas para usar, no solo palabras sueltas</li>
                    <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> Pronunciación figurada de cada término clave</li>
                    <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> Mini diálogos de ejemplo por categoría</li>
                  </ul>
                </div>
              </div>

              <div className="bonus-card">
                <div className="bonus-visual">
                  <img src="/frances/imagenes/mockup-bono-3.webp" alt="Mockup del Bono 3: Guiones de Diálogos Reales" className="bonus-mockup-img" />
                </div>
                <div className="bonus-body">
                  <span className="bonus-num">BONO 3</span>
                  <h3>Guiones de Diálogos Reales</h3>
                  <div className="bonus-price"><span className="old">Valor $12 USD</span><span className="free">GRATIS hoy</span></div>
                  <p className="bonus-empathy">Para que puedas practicar antes de que la situación sea real — y no te agarre desprevenido lo que te respondan.</p>
                  <ul>
                    <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> Diálogos completos: préfecture, banco, médico, casero, entrevista laboral</li>
                    <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> Indicaciones de pronunciación</li>
                    <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> Variantes de respuesta según lo que te contesten</li>
                    <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> Espacio pensado para practicar en voz alta</li>
                  </ul>
                </div>
              </div>

              <div className="bonus-card">
                <div className="bonus-visual">
                  <img src="/frances/imagenes/mockup-bono-4.webp" alt="Mockup del Bono 4: Plantilla de Cronograma de Estudio" className="bonus-mockup-img" />
                </div>
                <div className="bonus-body">
                  <span className="bonus-num">BONO 4</span>
                  <h3>Plantilla de Cronograma de Estudio</h3>
                  <div className="bonus-price"><span className="old">Valor $9 USD</span><span className="free">GRATIS hoy</span></div>
                  <p className="bonus-empathy">Para que sepas exactamente qué estudiar cada semana, sin esa sensación de estar improvisando contra el reloj.</p>
                  <ul>
                    <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> Plantilla editable e imprimible, armada hacia atrás desde tu fecha</li>
                    <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> Casilleros semana a semana</li>
                    <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> Cuánto tiempo dedicarle a cada sección de la guía principal</li>
                    <li><svg className="icon" aria-hidden="true"><use href="#i-check" /></svg> Espacio para marcar tu avance real</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="section-cta on-dark">
              <img src="/frances/imagenes/mockup-pack-completo-v2.webp" alt="Mockup del pack completo: guía DELF A2 + celular + los 4 bonos" className="pack-mockup-img" style={{ marginBottom: "20px" }} />
              <div className="section-cta-price"><span className="old">$39 USD</span>$20 USD · guía + 4 bonos</div>
              <div className="section-cta-timer"><svg className="icon" aria-hidden="true"><use href="#i-clock" /></svg> Bonos gratis por <strong className="js-countdown time-chip">30:00</strong></div>
              <a href={STRIPE_PAYMENT_LINK} onClick={handleCheckoutClick} className="btn btn-primary">Sí, Quiero Mis 4 Bonos Gratis</a>
              <PaymentIcons />
            </div>
          </div>
        </section>

        {/* ============ TESTIMONIOS (PLACEHOLDER) ============ */}
        <section id="opiniones">
          <div className="container">
            <div className="section-head">
              <h2>Lo Que Dicen Quienes Ya lo Usaron</h2>
            </div>

            <div className="testi-grid">
              <div className="testi-card">
                <p className="quote">"Llegué a mi cita en la préfecture sabiendo exactamente qué esperar. Hice el simulacro tres veces y el examen real fue casi idéntico — aprobé con 78/100."</p>
                <div className="testi-person">
                  <span className="testi-avatar">C</span>
                  <div>
                    <div className="name">Camila R.</div>
                    <div className="loc">Bogotá, Colombia</div>
                  </div>
                </div>
              </div>
              <div className="testi-card">
                <p className="quote">"Tomaba clases hacía meses, pero nadie me había explicado el formato del examen. En dos semanas con la guía entendí la estructura completa y aprobé el A2 a la primera."</p>
                <div className="testi-person">
                  <span className="testi-avatar">A</span>
                  <div>
                    <div className="name">Andrés M.</div>
                    <div className="loc">Lima, Perú</div>
                  </div>
                </div>
              </div>
              <div className="testi-card">
                <p className="quote">"El glosario de trámites lo uso todavía para hablar con el banco y la CAF. Me sirvió tanto como el examen en sí — mucho más allá del DELF."</p>
                <div className="testi-person">
                  <span className="testi-avatar">V</span>
                  <div>
                    <div className="name">Valentina S.</div>
                    <div className="loc">Montevideo, Uruguay</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="section-cta">
              <div className="section-cta-price"><span className="old">$39 USD</span>$20 USD · pago único</div>
              <a href={STRIPE_PAYMENT_LINK} onClick={handleCheckoutClick} className="btn btn-primary">Quiero los Mismos Resultados</a>
              <PaymentIcons />
            </div>
          </div>
        </section>

        {/* ============ FAQ ============ */}
        <section id="faq">
          <div className="container">
            <div className="section-head">
              <h2>Preguntas Frecuentes</h2>
            </div>

            <div className="faq">
              <details>
                <summary>¿Este ebook reemplaza mis clases de francés? <svg className="icon chev" aria-hidden="true"><use href="#i-chevron" /></svg></summary>
                <p className="faq-a">No, y no busca reemplazarlas. Es el complemento que cubre lo que ninguna academia enseña: el formato exacto del examen y el vocabulario específico de trámites. Si ya estás en clases o estudiando por tu cuenta, esto se suma a lo que ya vienes haciendo.</p>
              </details>
              <details>
                <summary>¿Puedo aprender francés desde cero solo con este ebook? <svg className="icon chev" aria-hidden="true"><use href="#i-chevron" /></svg></summary>
                <p className="faq-a">No es para eso, y preferimos decírtelo de una: esta guía prepara específicamente el examen DELF A2/TCF, no enseña francés desde cero. Pero si ya tienes una base básica o estás estudiando en paralelo, es justo lo que te falta.</p>
              </details>
              <details>
                <summary>¿En qué se diferencia de Duolingo o apps gratis? <svg className="icon chev" aria-hidden="true"><use href="#i-chevron" /></svg></summary>
                <p className="faq-a">Duolingo está bien para practicar francés en general, pero nunca te va a mostrar cómo es una consigna real del DELF, ni enseñarte el vocabulario que vas a necesitar en la préfecture, el banco o al alquilar. Eso es justo lo que hace esta guía.</p>
              </details>
              <details>
                <summary>¿Cómo sé si me corresponde el DELF o el TCF, A2 o B1? <svg className="icon chev" aria-hidden="true"><use href="#i-chevron" /></svg></summary>
                <p className="faq-a">Es una de las primeras dudas que resuelve la guía: trae un checklist de trámite que te indica exactamente cuál te corresponde según tu tipo de carte de séjour, para que no te anotes al examen equivocado.</p>
              </details>
              <details>
                <summary>¿Y si mi trámite pide B1 y no A2? <svg className="icon chev" aria-hidden="true"><use href="#i-chevron" /></svg></summary>
                <p className="faq-a">Tienes eso cubierto: la guía incluye un módulo puente A2 → B1 con lo que cambia y cómo seguir avanzando para tu próxima renovación (carte de résident).</p>
              </details>
              <details>
                <summary>¿Cómo y cuándo recibo el material? <svg className="icon chev" aria-hidden="true"><use href="#i-chevron" /></svg></summary>
                <p className="faq-a">Apenas se acredita el pago, te llega por email. Es un PDF descargable — no hay envíos ni esperas, porque no se manda nada físico a ninguna dirección.</p>
              </details>
              <details>
                <summary>¿Cómo puedo pagar? <svg className="icon chev" aria-hidden="true"><use href="#i-chevron" /></svg></summary>
                <p className="faq-a">Con tarjeta de crédito o débito, directo desde esta página y de forma segura.</p>
              </details>
            </div>

            <div className="section-cta">
              <div className="section-cta-price"><span className="old">$39 USD</span>$20 USD · pago único</div>
              <a href={STRIPE_PAYMENT_LINK} onClick={handleCheckoutClick} className="btn btn-primary">Ya No Tengo Dudas — Empezar</a>
              <PaymentIcons />
            </div>
          </div>
        </section>

        {/* ============ CTA FINAL ============ */}
        <section className="final-cta">
          <div className="container">
            <h2>Tu Cita en la Préfecture Ya Tiene Fecha. ¿Tu Preparación También?</h2>
            <p className="sub">No puedes elegir cuándo es la cita, pero sí puedes elegir cómo llegar a ella. Empieza hoy, con el cronograma armado para tu propia fecha.</p>

            <div className="final-mockup">
              <img src="/frances/imagenes/mockup-pack-completo-v2.webp" alt="Mockup del pack completo: guía DELF A2 + celular + los 4 bonos" className="pack-mockup-img" />
            </div>

            <div className="cta-wrap">
              <div className="section-cta-price" style={{ color: "var(--white)" }}><span className="old" style={{ color: "#AEB9CE" }}>$39 USD</span>$20 USD · pago único</div>
              <a href={STRIPE_PAYMENT_LINK} onClick={handleCheckoutClick} className="btn btn-primary btn-block">Empezar Mi Preparación Ahora</a>
              <span className="btn-sub" style={{ color: "#C7D0E0" }}>Acceso inmediato por email</span>
              <PaymentIcons labelColor="#C7D0E0" />
            </div>
          </div>
        </section>

        {/* ============ FOOTER ============ */}
        <footer>
          <div className="container">
            <p className="fdisclaimer">Este es un material educativo de preparación para el examen DELF/TCF y no garantiza el resultado de tu trámite migratorio, que depende exclusivamente de la préfecture correspondiente. Este producto no está afiliado a France Éducation international, al CIEP, ni a ninguna embajada o consulado de Francia.</p>
          </div>
        </footer>

        {/* ============ CTA STICKY MOBILE ============ */}
        <div className="sticky-cta">
          <div className="sticky-cta-inner">
            <div className="sticky-thumb">
              <img src="/frances/imagenes/mockup-pack-completo-v2.webp" alt="Guía DELF A2 + bonos" className="sticky-thumb-img" />
            </div>
            <div className="sticky-text">
              <span className="sticky-price"><span className="old">$39</span>$20 USD</span>
              <span className="sticky-timer">Termina en <strong className="js-countdown">30:00</strong></span>
            </div>
            <a href={STRIPE_PAYMENT_LINK} onClick={handleCheckoutClick} className="btn btn-primary sticky-btn"><svg className="arrow" aria-hidden="true"><use href="#i-triangle-right" /></svg>Sí, Quiero Mi Guía DELF A2</a>
          </div>
        </div>
      </div>
    </>
  );
};

export default Frances;
