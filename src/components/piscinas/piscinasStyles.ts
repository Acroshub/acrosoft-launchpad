// CSS compartido de las 4 páginas del embudo de Piscinas (tema oscuro azul marino, acento aqua,
// resaltes amarillos y CTA coral). Todo va acotado a `.pis-page`. Regla de la casa: el texto va
// alineado a la izquierda, salvo el de las cards de CTA (`.cta-card`).

export const PIS_FONT_HREF = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap";

export const PIS_CSS = `
.pis-page{
  --bg:#071E33;
  --bg-2:#0A2E4D;
  --card:#0C3052;
  --card-2:#0F3A60;
  --line:rgba(255,255,255,.12);
  --aqua:#12A4C8;
  --aqua-soft:rgba(18,164,200,.16);
  --yellow:#FFD23F;
  --cta-from:#F26B3A;
  --cta-to:#E0452B;
  --ok:#2FBF71;
  --ok-bg:rgba(47,191,113,.14);
  --ink:#F2F8FC;
  --ink-soft:#A9C2D6;
  --ink-dim:#7C9AB1;
  --sans:'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;
  --radius:20px;
  --shadow:0 18px 40px -18px rgba(0,0,0,.55);
  --maxw:1080px;
}
.pis-page *,.pis-page *::before,.pis-page *::after{box-sizing:border-box;}
.pis-page{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:hidden;min-height:100vh;text-align:left;}
@media (prefers-reduced-motion: reduce){.pis-page *,.pis-page *::before,.pis-page *::after{animation-duration:.01ms !important;animation-iteration-count:1 !important;transition-duration:.01ms !important;}}
.pis-page a{color:inherit;}
.pis-page h1,.pis-page h2,.pis-page h3{font-family:var(--sans);color:var(--ink);margin:0;line-height:1.14;letter-spacing:-.02em;font-weight:800;text-align:left;}
.pis-page p{margin:0;}
.pis-page ul,.pis-page ol{margin:0;padding:0;list-style:none;}
.pis-page img{max-width:100%;}
.pis-page .container{max-width:var(--maxw);margin:0 auto;padding:0 20px;}
.pis-page section{padding:clamp(44px,7vw,84px) 0;}
.pis-page :focus-visible{outline:3px solid var(--yellow);outline-offset:3px;}
.pis-page .icon{width:22px;height:22px;flex-shrink:0;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;}
.pis-page .hl{color:var(--yellow);}
.pis-page .alt{background:var(--bg-2);}

/* Botones */
.pis-page .btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;font-family:var(--sans);font-weight:800;font-size:17px;line-height:1.2;padding:17px 28px;border-radius:14px;text-decoration:none;cursor:pointer;border:0;min-height:56px;transition:transform 160ms ease,filter 160ms ease;}
@media(max-width:480px){.pis-page .btn{font-size:15.5px;padding:16px 18px;}}
.pis-page .btn-primary{background:linear-gradient(180deg,var(--cta-from),var(--cta-to));color:#fff;box-shadow:0 14px 28px -10px rgba(242,107,58,.65);}
.pis-page .btn-primary:hover{transform:translateY(-2px);filter:brightness(1.06);}
.pis-page .btn-green{background:linear-gradient(180deg,#34CF7E,#1FA95F);color:#04210F;box-shadow:0 14px 28px -10px rgba(47,191,113,.55);}
.pis-page .btn-green:hover{transform:translateY(-2px);filter:brightness(1.05);}
.pis-page .btn-outline{background:transparent;color:var(--ink);border:2px solid var(--line);}
.pis-page .btn-outline:hover{border-color:var(--aqua);}
.pis-page .btn-block{width:100%;}
.pis-page .btn-arrow{width:13px;height:13px;fill:currentColor;stroke:none;flex-shrink:0;}

/* Badge */
.pis-page .kicker{display:inline-flex;align-items:center;gap:8px;font-weight:700;font-size:12.5px;letter-spacing:.03em;color:var(--aqua);background:var(--aqua-soft);border:1px solid rgba(18,164,200,.35);padding:7px 14px;border-radius:999px;margin-bottom:18px;}

/* Hero */
.pis-page .hero{padding-top:clamp(32px,6vw,68px);padding-bottom:clamp(36px,6vw,76px);background:radial-gradient(circle at 0% 0%,rgba(18,164,200,.18) 0,transparent 46%),var(--bg);}
.pis-page .hero-grid{display:grid;grid-template-columns:1fr;gap:34px;align-items:center;}
@media(min-width:960px){.pis-page .hero-grid.has-visual{grid-template-columns:1.05fr .95fr;gap:52px;}}
.pis-page .hero h1{font-size:clamp(30px,5vw,50px);}
.pis-page .hero .sub{margin-top:18px;font-size:17px;line-height:1.62;color:var(--ink-soft);max-width:56ch;}
.pis-page .hero-visual{border-radius:26px;overflow:hidden;box-shadow:var(--shadow);border:1px solid var(--line);background:var(--card);}
.pis-page .hero-photo{width:100%;aspect-ratio:4/3;object-fit:cover;display:block;}

.pis-page .section-head{max-width:46em;margin:0 0 32px;}
.pis-page .section-head h2{font-size:clamp(25px,3.8vw,38px);}
.pis-page .section-head p{margin-top:12px;font-size:17px;color:var(--ink-soft);}

/* Para ti */
.pis-page .id-list{display:grid;grid-template-columns:1fr;gap:14px;}
@media(min-width:760px){.pis-page .id-list{grid-template-columns:1fr 1fr;}}
.pis-page .id-item{display:flex;gap:14px;align-items:flex-start;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:20px 22px;}
.pis-page .id-item .icon-wrap{flex-shrink:0;width:42px;height:42px;border-radius:14px;background:rgba(255,210,63,.14);display:flex;align-items:center;justify-content:center;}
.pis-page .id-item .icon{width:21px;height:21px;color:var(--yellow);}
.pis-page .id-item p{font-size:16px;font-weight:600;min-width:0;}

/* Resultados + producto */
.pis-page .deliver-grid{display:grid;grid-template-columns:1fr;gap:38px;}
@media(min-width:960px){.pis-page .deliver-grid{grid-template-columns:1.05fr .95fr;align-items:start;}}
.pis-page .achieve-list{margin-top:6px;display:flex;flex-direction:column;gap:18px;counter-reset:achieve;}
.pis-page .achieve-item{display:flex;gap:14px;align-items:flex-start;}
.pis-page .achieve-item .num{flex-shrink:0;width:34px;height:34px;border-radius:50%;background:var(--aqua);display:flex;align-items:center;justify-content:center;margin-top:1px;}
.pis-page .achieve-item .num::before{counter-increment:achieve;content:counter(achieve);color:#04202E;font-size:16px;font-weight:800;line-height:1;}
.pis-page .achieve-item p{font-size:16.5px;color:var(--ink-soft);min-width:0;}
.pis-page .achieve-item p strong{color:var(--ink);}

/* Cards de CTA: SOLO aquí el texto va centrado */
.pis-page .cta-card{background:var(--card);border:1px solid var(--line);border-radius:26px;box-shadow:var(--shadow);padding:26px 24px 24px;}
.pis-page .cta-card,.pis-page .cta-card *{text-align:center;}
.pis-page .cta-card .pc-includes,.pis-page .cta-card .pc-includes *{text-align:left;}
.pis-page .cta-card h2,.pis-page .cta-card h3{text-align:center;}
.pis-page .cta-card .btn{margin-top:18px;width:100%;}
.pis-page .pc-visual{margin:-4px -4px 14px;border-radius:20px;background:radial-gradient(circle at 50% 40%,rgba(18,164,200,.28),transparent 70%);padding:10px;}
.pis-page .pc-mockup-img{width:100%;max-width:380px;margin:0 auto;aspect-ratio:1/1;object-fit:contain;display:block;}
.pis-page .pc-name{font-size:23px;line-height:1.2;}
.pis-page .pc-tag{margin-top:8px;font-size:14px;color:var(--aqua);font-weight:700;}
.pis-page .pc-includes-label{margin-top:18px;font-size:13px;font-weight:800;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em;}
.pis-page .pc-includes{margin-top:10px;display:flex;flex-direction:column;gap:10px;}
.pis-page .pc-includes li{display:flex;gap:10px;align-items:flex-start;font-size:14.5px;color:var(--ink-soft);min-width:0;}
.pis-page .pc-includes .icon{width:17px;height:17px;color:var(--ok);margin-top:3px;stroke-width:2.8;}
.pis-page .pc-price{margin-top:20px;padding-top:18px;border-top:1px dashed var(--line);display:flex;align-items:baseline;justify-content:center;gap:10px;flex-wrap:wrap;}
.pis-page .pc-price .old{font-size:18px;font-weight:700;color:var(--ink-dim);text-decoration:line-through;}
.pis-page .pc-price .amount{font-size:44px;font-weight:800;color:var(--yellow);letter-spacing:-.03em;white-space:nowrap;}
.pis-page .section-cta .pc-price,.pis-page .final-cta .pc-price{margin-top:0;padding-top:0;border-top:0;}
.pis-page .pc-price-unit{margin-top:2px;font-size:14px;color:var(--ink-soft);}
.pis-page .pc-offer-end{margin-top:14px;}
.pis-page .pc-offer-text{display:flex;align-items:center;justify-content:center;gap:7px;font-size:13px;font-weight:600;color:var(--ink-soft);margin-bottom:8px;}
.pis-page .pc-offer-text .icon{width:15px;height:15px;color:var(--yellow);}
.pis-page .pc-offer-text strong{font-variant-numeric:tabular-nums;color:var(--yellow);}
.pis-page .pc-progress-bar{width:100%;height:6px;border-radius:999px;background:rgba(255,255,255,.14);overflow:hidden;}
.pis-page .pc-progress-fill{width:100%;height:100%;border-radius:999px;background:var(--yellow);transition:width 1s linear;}

/* Confianza bajo cada botón */
.pis-page .trust-row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:16px 0 0;font-size:12px;font-weight:700;line-height:1.25;color:var(--ink-soft);}
.pis-page .trust-row li{display:flex;flex-direction:column;align-items:center;gap:5px;}
.pis-page .trust-row .icon{width:20px;height:20px;color:var(--aqua);stroke-width:2;}
.pis-page .pc-payment{margin-top:16px;}
.pis-page .pc-payment-label{display:block;font-size:12px;color:var(--ink-dim);margin-bottom:8px;}
.pis-page .pc-payment-icons{display:flex;justify-content:center;align-items:center;gap:14px;flex-wrap:wrap;}
.pis-page .pay-icon{width:30px;height:30px;flex-shrink:0;fill:currentColor;stroke:none;color:var(--ink-soft);opacity:.9;}
.pis-page .guarantee-line{margin-top:12px;font-size:13.5px;font-weight:700;color:var(--ink-soft);}

.pis-page .section-cta{margin:38px 0 0;max-width:440px;}

/* Dentro del kit */
.pis-page .kit-grid{display:grid;grid-template-columns:1fr;gap:18px;}
@media(min-width:700px){.pis-page .kit-grid{grid-template-columns:1fr 1fr;}}
@media(min-width:1040px){.pis-page .kit-grid{grid-template-columns:repeat(4,1fr);}}
.pis-page .kit-card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;display:flex;flex-direction:column;}
.pis-page .kit-visual{padding:14px 14px 0;background:radial-gradient(circle at 50% 45%,rgba(18,164,200,.26),transparent 72%);}
.pis-page .kit-mockup-img{width:100%;aspect-ratio:1/1;object-fit:contain;display:block;}
.pis-page .kit-body{padding:16px 20px 22px;}
.pis-page .kit-body h3{font-size:18px;line-height:1.25;}
.pis-page .kit-problem{margin-top:8px;font-size:14px;font-weight:700;font-style:italic;color:var(--yellow);}
.pis-page .kit-body p.kit-desc{margin-top:10px;font-size:14.5px;color:var(--ink-soft);}
.pis-page .kit-extra{margin-top:24px;font-size:16.5px;font-weight:600;color:var(--ink);}

/* Tarjetas (facilidad, upsells) */
.pis-page .ease-grid{display:grid;grid-template-columns:1fr;gap:16px;}
@media(min-width:760px){.pis-page .ease-grid.cols-3{grid-template-columns:repeat(3,1fr);}.pis-page .ease-grid.cols-2{grid-template-columns:repeat(2,1fr);}}
.pis-page .ease-card{display:flex;gap:14px;align-items:flex-start;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:22px 20px;}
.pis-page .ease-card .icon-wrap{flex-shrink:0;width:46px;height:46px;border-radius:15px;background:var(--aqua-soft);display:flex;align-items:center;justify-content:center;}
.pis-page .ease-card .icon{width:22px;height:22px;color:var(--aqua);}
.pis-page .ease-card h3{font-size:17px;}
.pis-page .ease-card p{margin-top:6px;font-size:14.5px;color:var(--ink-soft);}

/* Pasos */
.pis-page .steps{display:grid;grid-template-columns:1fr;gap:16px;}
@media(min-width:760px){.pis-page .steps{grid-template-columns:repeat(3,1fr);}}
.pis-page .step{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:22px 20px;}
.pis-page .step .n{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:var(--yellow);color:#241A00;font-weight:800;font-size:17px;margin-bottom:12px;}
.pis-page .step h3{font-size:17.5px;}
.pis-page .step p{margin-top:6px;font-size:14.5px;color:var(--ink-soft);}

/* Bloques informativos y avisos */
.pis-page .info-block{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--aqua);border-radius:var(--radius);padding:20px 22px;}
.pis-page .info-block h3{font-size:18px;}
.pis-page .info-block p{margin-top:8px;font-size:15.5px;color:var(--ink-soft);}
.pis-page .info-grid{display:grid;grid-template-columns:1fr;gap:16px;margin-top:22px;}
@media(min-width:760px){.pis-page .info-grid{grid-template-columns:1fr 1fr;}}
.pis-page .notice{background:rgba(255,210,63,.1);border:1px solid rgba(255,210,63,.5);border-radius:var(--radius);padding:18px 22px;font-size:15.5px;color:var(--ink);}
.pis-page .notice strong{color:var(--yellow);}
.pis-page .guarantee-block{background:var(--ok-bg);border:1px solid rgba(47,191,113,.45);border-radius:var(--radius);padding:18px 22px;font-size:15.5px;}
.pis-page .guarantee-block strong{color:var(--ok);}
.pis-page .stack{display:flex;flex-direction:column;gap:18px;}
.pis-page .offer-wrap{margin-top:36px;max-width:480px;}
.pis-page .offer-small{font-size:13.5px;color:var(--ink-soft);}
.pis-page .offer-name{font-size:20px;}
.pis-page .offer-price{margin-top:12px;font-size:46px;font-weight:800;color:var(--yellow);letter-spacing:-.03em;line-height:1.1;}
.pis-page .offer-price small{display:block;margin-top:4px;font-size:15px;font-weight:600;color:var(--ink-soft);letter-spacing:0;}
.pis-page .offer-why{margin-top:12px;font-size:14.5px;color:var(--ink-soft);}

/* Cinta superior de upsells */
.pis-page .ribbon{background:var(--ok-bg);border-bottom:1px solid rgba(47,191,113,.45);color:#C9F5DC;font-weight:700;font-size:14.5px;padding:12px 0;}
.pis-page .ribbon .container{display:flex;gap:10px;align-items:flex-start;}
.pis-page .ribbon .icon{width:19px;height:19px;color:var(--ok);margin-top:2px;stroke-width:2.6;}

/* FAQ */
.pis-page .faq{max-width:820px;}
.pis-page .faq details{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:4px 22px;margin-bottom:12px;}
.pis-page .faq summary{list-style:none;cursor:pointer;padding:16px 0;font-weight:700;font-size:16px;display:flex;justify-content:space-between;align-items:center;gap:16px;}
.pis-page .faq summary::-webkit-details-marker{display:none;}
.pis-page .faq summary .chev{width:20px;height:20px;color:var(--aqua);transition:transform 200ms ease;}
.pis-page .faq details[open] summary .chev{transform:rotate(180deg);}
.pis-page .faq .faq-a{padding:0 0 18px;font-size:15px;color:var(--ink-soft);}

/* Rechazo de upsell */
.pis-page .decline{margin-top:30px;font-size:13.5px;}
.pis-page .decline a{color:var(--ink-dim);text-decoration:underline;text-underline-offset:3px;}
.pis-page .decline a:hover{color:var(--ink);}

/* CTA final */
.pis-page .final-cta{background:linear-gradient(180deg,var(--bg-2) 0%,var(--bg) 100%);}
.pis-page .final-cta h2{font-size:clamp(26px,4vw,40px);max-width:22em;}
.pis-page .final-cta .sub{margin-top:14px;font-size:17px;color:var(--ink-soft);max-width:54ch;}
.pis-page .final-cta .cta-card{margin-top:28px;max-width:440px;}

/* Footer */
.pis-page footer{background:#041526;padding:28px 0 110px;border-top:1px solid var(--line);}
.pis-page footer.no-sticky{padding-bottom:28px;}
.pis-page footer p{font-size:12.5px;color:var(--ink-dim);max-width:72ch;}
.pis-page footer p + p{margin-top:10px;}
.pis-page footer a{color:var(--ink-soft);}

/* Sticky móvil */
.pis-page .sticky-cta{display:none;position:fixed;left:0;right:0;bottom:0;z-index:50;background:rgba(7,30,51,.96);backdrop-filter:blur(10px);border-top:1px solid var(--line);box-shadow:0 -8px 24px rgba(0,0,0,.4);padding:10px 14px;padding-bottom:calc(10px + env(safe-area-inset-bottom));}
.pis-page .sticky-btn{width:100%;min-height:50px;padding:13px 14px;font-size:15.5px;}
.pis-page .sticky-note{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:6px;font-size:11.5px;font-weight:700;color:var(--ink-soft);}
.pis-page .sticky-note .icon{width:13px;height:13px;color:var(--aqua);}
.pis-page #sticky-trigger-pis{height:1px;}
@media(max-width:760px){.pis-page .sticky-cta.is-visible{display:block;}}

/* Thank-you */
.pis-page .ty-hero{background:linear-gradient(180deg,#0B3A5F 0%,var(--bg) 100%);padding-bottom:12px;}
.pis-page .ty-badge{display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:22px;background:var(--ok-bg);border:1px solid rgba(47,191,113,.5);margin-bottom:16px;}
.pis-page .ty-badge .icon{width:32px;height:32px;color:var(--ok);stroke-width:2.6;}
.pis-page .ty-hero h1{font-size:clamp(28px,4.4vw,42px);}
.pis-page .ty-hero .sub{margin-top:12px;font-size:17px;color:var(--ink-soft);max-width:52ch;}
.pis-page .ty-hero .sub strong{color:var(--ink);}
.pis-page .sub-lines{font-size:17px;color:var(--ink-soft);margin:-8px 0 18px;}
.pis-page .sub-lines strong{color:var(--ink);}
.pis-page .mail-note{display:flex;gap:10px;align-items:flex-start;margin-top:20px;max-width:760px;font-size:15px;color:var(--ink-soft);}
.pis-page .mail-note .icon{width:18px;height:18px;color:var(--aqua);margin-top:3px;}
.pis-page .download-card{max-width:520px;}
.pis-page .download-note{margin-top:12px;font-size:13px;color:var(--ink-soft);}
.pis-page .ty-steps{margin-top:6px;display:flex;flex-direction:column;gap:14px;max-width:760px;}
.pis-page .ty-step{display:flex;gap:14px;align-items:flex-start;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:16px 18px;}
.pis-page .ty-step .n{flex-shrink:0;width:34px;height:34px;border-radius:50%;background:var(--aqua);color:#04202E;font-weight:800;display:flex;align-items:center;justify-content:center;}
.pis-page .ty-step p{font-size:15.5px;color:var(--ink-soft);}
.pis-page .ty-step p strong,.pis-page .ty-step p code{color:var(--ink);}
.pis-page .checklist{display:flex;flex-direction:column;gap:12px;max-width:760px;}
.pis-page .checklist li{display:flex;gap:12px;align-items:flex-start;font-size:15.5px;color:var(--ink-soft);}
.pis-page .checklist .box{flex-shrink:0;width:22px;height:22px;border-radius:7px;border:2px solid var(--aqua);margin-top:2px;}
.pis-page .checklist code{color:var(--ink);}
.pis-page .service-card{max-width:760px;background:var(--card);border:1px solid rgba(255,210,63,.45);border-radius:var(--radius);padding:24px 24px 26px;}
.pis-page .service-card h2{font-size:22px;}
.pis-page .service-card p{margin-top:10px;font-size:15.5px;color:var(--ink-soft);}
.pis-page .service-card .btn{margin-top:18px;}
.pis-page .soft-card{max-width:760px;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:20px 22px;}
.pis-page .soft-card p{font-size:15.5px;color:var(--ink-soft);}
.pis-page .soft-card a{color:var(--ink-soft);font-size:14px;text-decoration:underline;text-underline-offset:3px;}
.pis-page .help-row{max-width:760px;}
.pis-page .state-box{max-width:520px;padding:60px 20px;}
.pis-page .state-box h2{font-size:24px;}
.pis-page .state-box p{margin-top:12px;font-size:15.5px;color:var(--ink-soft);}
.pis-page .state-box .btn{margin-top:20px;}
.pis-page .spinner{width:34px;height:34px;border-radius:50%;border:3px solid var(--line);border-top-color:var(--yellow);animation:pis-spin .8s linear infinite;margin:0 0 20px;}
@keyframes pis-spin{to{transform:rotate(360deg);}}
/* ===== Formato del método (upsells + thank-you) ===== */
/* Presentación visual (recorrido) */
.pis-page .journey{margin-top:26px;display:grid;grid-template-columns:1fr auto 1fr auto 1fr;gap:6px;align-items:stretch;max-width:640px;}
.pis-page .journey .node{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px 8px 12px;display:flex;flex-direction:column;align-items:flex-start;gap:8px;font-size:12.5px;font-weight:700;line-height:1.25;color:var(--ink);text-align:left;}
.pis-page .journey .node .icon{width:26px;height:26px;color:var(--aqua);}
.pis-page .journey .node.goal{border-color:rgba(255,210,63,.55);background:rgba(255,210,63,.08);}
.pis-page .journey .node.goal .icon{color:var(--yellow);}
.pis-page .journey .arrow{display:flex;align-items:center;color:var(--ink-dim);}
.pis-page .journey .arrow .icon{width:16px;height:16px;transform:rotate(-90deg);}
@media(min-width:760px){.pis-page .journey .node{font-size:14.5px;padding:18px 14px 16px;}.pis-page .journey .arrow .icon{width:20px;height:20px;}}
.pis-page .section-tight{padding-top:0;}
.pis-page .ease-grid.cols-2 .ease-card:last-child:nth-child(odd){grid-column:1/-1;}

/* Tarjeta de decisión (un botón «Sí» + un enlace «No») */
.pis-page .decision-card{max-width:520px;}
.pis-page .decision-card .offer-name{font-size:19px;}
.pis-page .decision-card .offer-small{margin-top:10px;}
.pis-page .btn-yes{font-size:18px;line-height:1.28;padding:20px 20px;min-height:72px;border-radius:16px;white-space:normal;}
@media(max-width:480px){.pis-page .btn-yes{font-size:16.5px;padding:18px 16px;}}
.pis-page .btn[aria-disabled="true"]{opacity:.7;cursor:progress;pointer-events:none;transform:none;filter:none;}
.pis-page .yes-note{margin:10px 0 0;font-size:13.5px;line-height:1.4;font-weight:600;color:var(--ink-soft);text-align:center;}
.pis-page .charge-notice{margin:12px 0 0;padding:14px 16px;border-radius:12px;background:rgba(255,210,63,.1);border:1px solid rgba(255,210,63,.5);font-size:14.5px;line-height:1.45;color:var(--ink);text-align:center;}
.pis-page .charge-notice p{margin:0;}
.pis-page .charge-notice .btn{margin-top:12px;min-height:48px;font-size:15px;}
.pis-page .decline-link{display:block;margin:6px auto 0;padding:12px 6px;max-width:420px;font-size:14.5px;line-height:1.4;font-weight:600;color:var(--ink-soft);text-decoration:underline;text-underline-offset:3px;}
.pis-page .decline-link:hover{color:var(--ink);}
.pis-page .decision-card .trust-row{margin-top:10px;}
.pis-page .unique-note{margin-top:16px;padding-top:14px;border-top:1px dashed var(--line);font-size:13.5px;font-weight:600;color:var(--ink-soft);}
.pis-page .unique-note .icon{display:inline-block;vertical-align:-3px;margin-right:6px;width:16px;height:16px;color:var(--yellow);}
.pis-page .decision-wrap{max-width:520px;}

/* Thank-you según 06d */
.pis-page .demo-banner{background:rgba(255,210,63,.14);border-bottom:1px solid rgba(255,210,63,.5);color:var(--yellow);font-size:13px;font-weight:700;padding:8px 0;}
.pis-page .ty-top{padding-top:clamp(28px,5vw,56px);padding-bottom:8px;background:linear-gradient(180deg,#0B3A5F 0%,var(--bg) 100%);}
.pis-page .ty-check{width:104px;height:104px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#7BF0AC,#1FA95F 70%);display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 8px rgba(47,191,113,.18),0 18px 36px -12px rgba(47,191,113,.6);}
.pis-page .ty-check .icon{width:58px;height:58px;color:#fff;stroke-width:3.2;}
.pis-page .ty-pill{display:inline-block;margin-top:22px;padding:10px 22px;border-radius:14px;background:rgba(47,191,113,.2);border:1px solid rgba(47,191,113,.55);color:#7BF0AC;font-weight:800;font-size:20px;letter-spacing:.02em;text-transform:uppercase;}
.pis-page .ty-top h1{margin-top:18px;font-size:clamp(28px,4.4vw,40px);}
.pis-page .ty-thanks{margin-top:22px;max-width:640px;background:var(--card);border:1px solid var(--line);border-left:4px solid var(--aqua);border-radius:var(--radius);padding:18px 22px;}
.pis-page .ty-thanks p{font-size:17px;font-weight:700;color:var(--ink);}
.pis-page .ty-thanks span{display:block;margin-top:6px;font-size:14px;font-weight:600;color:var(--aqua);}
.pis-page .ty-lines{max-width:640px;margin-top:22px;display:flex;flex-direction:column;gap:12px;font-size:17px;color:var(--ink-soft);}
.pis-page .ty-lines strong{color:var(--ink);}
.pis-page .btn-green-xl,.pis-page .btn-red-xl{width:100%;min-height:78px;padding:20px 18px;border-radius:16px;font-size:clamp(19px,5.4vw,25px);font-weight:800;text-transform:uppercase;letter-spacing:.02em;line-height:1.15;color:#fff;text-shadow:0 2px 3px rgba(0,0,0,.35);text-align:center;}
.pis-page .btn-green-xl{background:linear-gradient(180deg,#2FD06A 0%,#16A04A 55%,#0D7A33 100%);box-shadow:0 16px 30px -10px rgba(47,191,113,.65),inset 0 1px 0 rgba(255,255,255,.35);}
.pis-page .btn-red-xl{background:linear-gradient(180deg,#E5392E 0%,#B91F17 55%,#8E1510 100%);box-shadow:0 16px 30px -10px rgba(217,48,37,.6),inset 0 1px 0 rgba(255,255,255,.3);}
.pis-page .btn-green-xl:hover,.pis-page .btn-red-xl:hover{transform:translateY(-2px);filter:brightness(1.07);}
.pis-page .btn-green-xl .icon{width:28px;height:28px;stroke-width:2.6;}
.pis-page .btn-aqua{background:linear-gradient(180deg,#22BADF,#0E86A6);color:#fff;box-shadow:0 14px 28px -10px rgba(18,164,200,.6);}
.pis-page .btn-aqua:hover{transform:translateY(-2px);filter:brightness(1.06);}
.pis-page .cta-card.access-card{max-width:560px;margin-top:26px;}
.pis-page .cta-card.access-card .btn{margin-top:0;}
.pis-page .cta-card.help-card{max-width:560px;}
.pis-page .cta-card.help-card p{font-size:16.5px;color:var(--ink-soft);}
.pis-page .cta-card.help-card p strong{color:var(--ink);}
.pis-page .cta-card.help-card .btn{margin-top:18px;}
.pis-page .help-plain{max-width:640px;font-size:16.5px;color:var(--ink-soft);}
.pis-page .help-plain strong{color:var(--ink);}
.pis-page .ty-bullets{max-width:640px;display:flex;flex-direction:column;gap:12px;}
.pis-page .ty-bullets li{display:flex;gap:12px;align-items:flex-start;font-size:16px;color:var(--ink-soft);}
.pis-page .ty-bullets .dot{flex-shrink:0;width:26px;height:26px;border-radius:50%;background:var(--aqua);color:#04202E;font-weight:800;font-size:14px;display:flex;align-items:center;justify-content:center;margin-top:1px;}
.pis-page .ty-bullets code{color:var(--ink);}
.pis-page .state-ico{width:72px;height:72px;border-radius:50%;background:var(--aqua-soft);border:1px solid rgba(18,164,200,.4);display:flex;align-items:center;justify-content:center;margin-bottom:20px;}
.pis-page .state-ico .icon{width:34px;height:34px;color:var(--aqua);}
.pis-page .state-box .ty-bullets{margin-top:18px;}
.pis-page .state-box .btn-red-xl{margin-top:22px;}
.pis-page footer .brand{font-weight:800;color:var(--ink-soft);}
.pis-page .kicker .us-flag{flex-shrink:0;border-radius:2px;box-shadow:0 0 0 1px rgba(255,255,255,.25);}
.pis-page .sub-lines span{display:block;}
.pis-page .sub-lines span + span{margin-top:14px;}
.pis-page .hero-right{display:flex;flex-direction:column;gap:16px;}
.pis-page .hero-cta{width:100%;}
.pis-page .btn-hero{flex-direction:column;gap:4px;padding:16px 20px;min-height:72px;font-size:clamp(16px,4.4vw,19px);text-align:center;white-space:normal;}
.pis-page .btn-hero .btn-main{display:block;line-height:1.22;}
.pis-page .btn-hero .btn-subline{display:block;font-size:.82em;font-weight:700;opacity:.95;}
.pis-page .btn-hero .btn-subline s{opacity:.75;margin-left:2px;text-decoration-thickness:2px;}

/* v1: hero en una sola columna (título → imagen → CTA → checks → subtítulo) */
.pis-v1 .hero-stack{max-width:760px;}
.pis-v1 .hero-stack .hero-visual{margin:22px 0 16px;}
.pis-v1 .hero-stack .hero-checks{margin:26px 0 20px;}
.pis-v1 .hero-stack .hero-cta{margin-top:0;}
/* ===== Versión 1: secciones azul/blanco, sin glow, aspecto sobrio (pedido de Daniel 2026-10-24) ===== */
.pis-v1{--bg:#0B2F4F;--bg-2:#0B2F4F;--card:#10395E;--card-2:#10395E;--aqua:#4FB3D0;--aqua-soft:rgba(79,179,208,.14);--yellow:#F2C14E;--cta-from:#E4572E;--cta-to:#E4572E;--shadow:none;background:#0B2F4F;}
.pis-v1 *{text-shadow:none !important;}
.pis-v1 .alt{background:transparent;}
.pis-v1 .sec-dark{background:#0B2F4F;}
.pis-v1 .sec-light{background:#fff;color:#0B2238;--ink:#0B2238;--ink-soft:#40566B;--ink-dim:#64798C;--card:#F4F7FA;--card-2:#EAF0F5;--line:#D6DFE7;--aqua:#0F7C9B;--aqua-soft:rgba(15,124,155,.10);--yellow:#0B2F4F;--ok:#1B8A55;--ok-bg:rgba(27,138,85,.10);}
.pis-v1 .sec-light h1,.pis-v1 .sec-light h2,.pis-v1 .sec-light h3{color:#0B2238;}
.pis-v1 .sec-light .hl{color:#0F7C9B;}
.pis-v1 .hero{background:#0B2F4F;}
.pis-v1 .final-cta{background:#0B2F4F;}
.pis-v1 .btn-primary{background:var(--cta-from);box-shadow:none;}
.pis-v1 .btn-primary:hover{background:#CC4A24;transform:none;filter:none;}
.pis-v1 .btn{box-shadow:none;transition:background-color 150ms ease;}
.pis-v1 .hero-visual,.pis-v1 .cta-card,.pis-v1 .pc-visual,.pis-v1 .kit-visual{box-shadow:none;}
.pis-v1 .pc-visual,.pis-v1 .kit-visual{background:rgba(255,255,255,.05);}
.pis-v1 .sec-light .pc-visual,.pis-v1 .sec-light .kit-visual{background:#EEF3F7;}
.pis-v1 .sticky-cta{background:#0B2F4F;backdrop-filter:none;box-shadow:none;border-top:1px solid var(--line);}
.pis-v1 .kicker{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.22);color:#DCEBF5;}
.pis-v1 .hero-checks{display:flex;flex-direction:column;gap:10px;margin:28px 0 24px;}
.pis-v1 .hero-checks li{display:flex;align-items:center;gap:10px;font-weight:700;font-size:15.5px;color:var(--ink);}
.pis-v1 .hero-checks .icon{width:20px;height:20px;color:#5CC48A;stroke-width:2.6;}
.pis-v1 .hero-cta{margin-top:2px;}
.pis-v1 .hero-cta .trust-row{justify-content:center;margin-top:14px;}
.pis-v1 .hero-cta .pc-payment{text-align:center;margin-top:12px;}
.pis-v1 .hero-cta .pc-payment-icons{justify-content:center;}
.pis-v1 .sec-light .id-item,.pis-v1 .sec-light .step,.pis-v1 .sec-light .kit-card,.pis-v1 .sec-light .ease-card,.pis-v1 .sec-light .faq-item{background:#F4F7FA;border-color:#D6DFE7;}
.pis-v1 .sec-light .id-item .icon-wrap{background:rgba(15,124,155,.10);}
.pis-v1 .sec-light .id-item .icon{color:#0F7C9B;}
.pis-v1 .sec-light .step .n{background:#0B2F4F;color:#fff;}
.pis-v1 .sec-light .btn-outline{color:#0B2238;border-color:#C5D0DA;}
.pis-v1 .pc-lead{font-size:clamp(20px,2.6vw,24px);line-height:1.2;margin:0 0 16px;text-align:center;}
.pis-page .lang-flags{display:inline-flex;gap:6px;vertical-align:-3px;margin-left:6px;}
.pis-page .lang-flags .us-flag{border-radius:2px;box-shadow:0 0 0 1px rgba(128,128,128,.35);}
.pis-v1 .hero-cta .btn-hero .btn-main{display:inline-flex;align-items:center;justify-content:center;gap:10px;}
.pis-page .mock-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;}
@media(min-width:1040px){.pis-page .mock-grid{grid-template-columns:repeat(4,1fr);gap:18px;}}
.pis-page .mock-card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;display:flex;flex-direction:column;}
.pis-page .mock-card .kit-visual{padding:10px 10px 0;}
.pis-page .mock-card h3{font-size:15px;line-height:1.25;padding:6px 14px 16px;}
.pis-v1 .pc-tag{line-height:1.45;}
.pis-v1 .btn .btn-old{font-size:.78em;font-weight:700;opacity:.8;margin-left:4px;text-decoration-thickness:2px;}
.pis-v1 .btn-hero .btn-subline{font-size:.74em;}


/* precio y «pago único» en una sola línea */
.pis-v1 .pc-price{flex-wrap:nowrap;gap:10px;align-items:baseline;}
.pis-v1 .pc-price .amount{font-size:clamp(34px,9vw,44px);}
.pis-v1 .pc-price .old{font-size:clamp(14px,4vw,17px);}
.pis-v1 .pc-price .pc-unit{font-size:14px;color:var(--ink-soft);white-space:nowrap;}
.pis-v1 .cta-mockup{max-width:300px;margin:0 auto 10px;background:transparent !important;padding:0;}
/* garantía */
.pis-v1 .guar-v1{display:flex;flex-direction:column;align-items:flex-start;gap:24px;max-width:760px;margin:0 auto;}
.pis-v1 .guar-v1 .seal{align-self:center;width:176px;height:176px;border-radius:50%;border:4px solid #2FBF71;background:transparent;box-shadow:none;display:flex;flex-direction:column;align-items:center;justify-content:center;}
.pis-v1 .guar-v1 .seal-n{font-size:66px;font-weight:800;line-height:1;color:#2FBF71;}
.pis-v1 .guar-v1 .seal-t{margin-top:4px;font-size:13px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--ink);}
.pis-v1 .guar-v1 .guar-text h2{font-size:clamp(25px,3.8vw,38px);}
.pis-v1 .guar-v1 .guar-text p{margin-top:20px;font-size:17px;line-height:1.65;color:var(--ink-soft);}
.pis-v1 .guar-v1 .guar-text p strong{color:var(--ink);}
/* ilustraciones del proceso */
.pis-v1 .step-art{height:150px;display:flex;align-items:center;justify-content:center;background:#fff;border:1px solid var(--line);border-radius:14px;margin-bottom:16px;overflow:hidden;}
.pis-v1 .step-art .art{width:100%;max-width:240px;height:100%;display:block;}
@keyframes artType{0%{stroke-dashoffset:1}20%,82%{stroke-dashoffset:0}100%{stroke-dashoffset:1}}
@keyframes artPop{0%,55%{transform:scale(0)}65%,90%{transform:scale(1)}100%{transform:scale(0)}}
@keyframes artArrow{0%,100%{transform:translateY(-6px)}50%{transform:translateY(8px)}}
@keyframes artProgress{0%{transform:scaleX(0)}80%,100%{transform:scaleX(1)}}
@keyframes artPost{0%{transform:translateY(-14px);opacity:0}25%,85%{transform:translateY(0);opacity:1}100%{opacity:0}}
@keyframes artReel{0%,35%{transform:scale(0)}50%,90%{transform:scale(1)}100%{transform:scale(0)}}
@keyframes artBar{0%,40%{transform:scaleY(.15)}65%,90%{transform:scaleY(1)}100%{transform:scaleY(.15)}}
.pis-v1 .art-type{stroke-dasharray:1;stroke-dashoffset:1;animation:artType 5s ease-in-out infinite;animation-delay:calc(var(--i) * .45s);}
.pis-v1 .art-pop,.pis-v1 .art-reel{transform-box:fill-box;transform-origin:center;}
.pis-v1 .art-pop{animation:artPop 5s ease-in-out infinite;}
.pis-v1 .art-reel{animation:artReel 5s ease-in-out infinite;}
.pis-v1 .art-arrow{animation:artArrow 1.6s ease-in-out infinite;}
.pis-v1 .art-progress{transform-box:fill-box;transform-origin:left center;animation:artProgress 3.2s ease-in-out infinite;}
.pis-v1 .art-post{animation:artPost 5s ease-in-out infinite;}
.pis-v1 .art-bar{transform-box:fill-box;transform-origin:center bottom;animation:artBar 5s ease-in-out infinite;}
.pis-v1 .art-bar.b2{animation-delay:.15s;}
.pis-v1 .art-bar.b3{animation-delay:.3s;}
@media (prefers-reduced-motion: reduce){
  .pis-v1 .art-type{animation:none;stroke-dashoffset:0;}
  .pis-v1 .art-pop,.pis-v1 .art-reel{animation:none;transform:scale(1);}
  .pis-v1 .art-arrow,.pis-v1 .art-post,.pis-v1 .art-bar,.pis-v1 .art-progress{animation:none;}
}
.pis-v1 .section-cta{margin-left:auto;margin-right:auto;}
/* sticky móvil estilo TOEFL: miniatura del bundle + precio con descuento + botón */
.pis-v1 .sticky-cta{padding:10px 12px;padding-bottom:calc(10px + env(safe-area-inset-bottom));}
.pis-v1 .sticky-cta-inner{display:flex;align-items:center;gap:10px;}
.pis-v1 .sticky-thumb{width:52px;height:52px;flex-shrink:0;border-radius:10px;background:rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center;overflow:hidden;}
.pis-v1 .sticky-thumb-img{width:100%;height:100%;object-fit:contain;}
.pis-v1 .sticky-text{flex-shrink:0;display:flex;flex-direction:column;gap:0;}
.pis-v1 .sticky-price{font-size:17px;font-weight:800;color:#fff;white-space:nowrap;line-height:1.15;}
.pis-v1 .sticky-price .old{font-size:12px;font-weight:600;color:var(--ink-dim);text-decoration:line-through;margin-right:5px;}
.pis-v1 .sticky-sub{font-size:11px;font-weight:600;color:var(--ink-soft);}
.pis-v1 .sticky-cta .sticky-btn{flex:1;min-width:0;min-height:48px;padding:10px 10px;font-size:14px;line-height:1.15;}
/* sticky móvil: más aire y sin tapar el final de la página */
.pis-v1 .sticky-cta{padding:12px 14px;padding-bottom:calc(12px + env(safe-area-inset-bottom));border-top:1px solid rgba(255,255,255,.16);background:#0B2F4F;}
.pis-v1 .sticky-cta-inner{gap:12px;max-width:560px;margin:0 auto;}
.pis-v1 .sticky-thumb{width:58px;height:58px;border-radius:12px;border:1px solid rgba(255,255,255,.14);}
.pis-v1 .sticky-price{font-size:19px;}
.pis-v1 .sticky-price .old{font-size:12.5px;display:block;margin:0 0 -1px;}
.pis-v1 .sticky-cta .sticky-btn{min-height:52px;padding:12px 14px;font-size:14.5px;border-radius:12px;}
@media(max-width:760px){.pis-v1 .final-cta{padding-bottom:calc(clamp(44px,7vw,84px) + 96px);}}
`;

// CSS generado de la animación del calendario (una @keyframes por cita para escalonar su aparición).
export const PIS_CAL_CSS = `
.pis-v1 .cal-anim{max-width:760px;margin:34px auto 8px;}
.pis-v1 .cal-art{width:100%;height:auto;display:block;}
@keyframes calPost{0%,19%{opacity:0;transform:translateX(40px)}27%,92%{opacity:1;transform:translateX(0)}97%,100%{opacity:0;transform:translateX(0)}}
@keyframes calBadge{0%,30%{transform:scale(0)}36%{transform:scale(1.15)}40%,92%{transform:scale(1)}97%,100%{transform:scale(0)}}
@keyframes calArrow{0%,33%{opacity:0}38%,48%{opacity:1}52%,100%{opacity:0}}
@keyframes calC0{0%,46%{opacity:1}49%,94%{opacity:0}98%,100%{opacity:1}}
@keyframes calC1{0%,48%{opacity:0}52%,92%{opacity:1}96%,100%{opacity:0}}
.pis-v1 .cal-post{animation:calPost 10s ease-in-out infinite;}
.pis-v1 .cal-badge{transform-box:fill-box;transform-origin:center;animation:calBadge 10s ease-in-out infinite;}
.pis-v1 .cal-arrow{animation:calArrow 10s ease-in-out infinite;}
.pis-v1 .cal-c0{animation:calC0 10s ease-in-out infinite;}
.pis-v1 .cal-c1{animation:calC1 10s ease-in-out infinite;}
.pis-v1 .cal-chip{transform-box:fill-box;transform-origin:center;}
${Array.from({ length: 12 }, (_, i) => {
  const a = 46 + i * 2.6;
  return `@keyframes calChip${i}{0%,${a.toFixed(1)}%{opacity:0;transform:scale(.4)}${(a + 3).toFixed(1)}%,93%{opacity:1;transform:scale(1)}97%,100%{opacity:0;transform:scale(1)}}
.pis-v1 .cal-chip-${i}{animation:calChip${i} 10s ease-in-out infinite;}
/* íconos animados de «Esto es para ti si…» */
.pis-v1 .id-item .icon-wrap{width:58px;height:58px;border-radius:16px;}
.pis-v1 .id-item .pt-art{width:40px;height:40px;display:block;overflow:visible;}
@keyframes ptDot{0%,60%,100%{transform:translateY(0);opacity:.45}30%{transform:translateY(-6px);opacity:1}}
@keyframes ptWave{0%{opacity:0;transform:translateX(-4px)}35%,70%{opacity:1;transform:translateX(0)}100%{opacity:0;transform:translateX(4px)}}
@keyframes ptMega{0%,100%{transform:rotate(0)}50%{transform:rotate(-4deg)}}
@keyframes ptQ{0%,100%{transform:translateY(0) rotate(-8deg)}50%{transform:translateY(-3px) rotate(8deg)}}
@keyframes ptShake{0%,50%,100%{transform:rotate(0)}6%{transform:rotate(-14deg)}12%{transform:rotate(12deg)}18%{transform:rotate(-12deg)}24%{transform:rotate(10deg)}30%{transform:rotate(-6deg)}36%{transform:rotate(0)}}
@keyframes ptRipple{0%,8%{opacity:0}18%{opacity:1}40%,100%{opacity:0}}
.pis-v1 .pt-dot{transform-box:fill-box;transform-origin:center;animation:ptDot 1.4s ease-in-out infinite;}
.pis-v1 .pt-dot.d2{animation-delay:.18s;}
.pis-v1 .pt-dot.d3{animation-delay:.36s;}
.pis-v1 .pt-mega{transform-box:fill-box;transform-origin:20% 60%;animation:ptMega 2.6s ease-in-out infinite;}
.pis-v1 .pt-wave{animation:ptWave 2s ease-in-out infinite;}
.pis-v1 .pt-wave.w2{animation-delay:.35s;}
.pis-v1 .pt-q{transform-box:fill-box;transform-origin:center;animation:ptQ 2.2s ease-in-out infinite;}
.pis-v1 .pt-ring-phone{transform-box:fill-box;transform-origin:50% 60%;animation:ptShake 3s ease-in-out infinite;}
.pis-v1 .pt-ripple{animation:ptRipple 3s ease-out infinite;}
.pis-v1 .pt-ripple.r2{animation-delay:.2s;}
@media (prefers-reduced-motion: reduce){
  .pis-v1 .pt-dot,.pis-v1 .pt-mega,.pis-v1 .pt-wave,.pis-v1 .pt-q,.pis-v1 .pt-ring-phone,.pis-v1 .pt-ripple{animation:none !important;opacity:1;}
}

/* tarjetas de «En los próximos 7 días» con SVG animado */
.pis-v1 .achieve-list{gap:14px;margin-top:4px;}
.pis-v1 .achieve-card{position:relative;display:grid;grid-template-columns:168px 1fr;gap:0;align-items:stretch;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:0;overflow:hidden;min-height:132px;}
.pis-v1 .achieve-card .lg-wrap{grid-column:1;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.07);border-right:1px solid var(--line);padding:16px;}
.pis-v1 .achieve-card .lg-art{width:100px;height:100px;display:block;overflow:visible;}
.pis-v1 .achieve-card .num{position:absolute;top:10px;left:10px;z-index:1;width:30px;height:30px;border-radius:50%;background:var(--aqua);display:flex;align-items:center;justify-content:center;}
.pis-v1 .achieve-card .num::before{counter-increment:achieve;content:counter(achieve);color:#04202E;font-size:15px;font-weight:800;line-height:1;}
.pis-v1 .achieve-card p{grid-column:2;align-self:center;padding:20px 22px;font-size:16px;color:var(--ink-soft);min-width:0;}
.pis-v1 .achieve-card p strong{color:var(--ink);}
@media(max-width:520px){.pis-v1 .achieve-card{grid-template-columns:104px 1fr;min-height:120px;}.pis-v1 .achieve-card .lg-wrap{padding:10px;}.pis-v1 .achieve-card .lg-art{width:68px;height:68px;}.pis-v1 .achieve-card .num{top:8px;left:8px;width:26px;height:26px;}.pis-v1 .achieve-card .num::before{font-size:13px;}.pis-v1 .achieve-card p{padding:14px 14px;font-size:14.5px;}}
@keyframes lgLogo{0%,10%{transform:scale(0)}22%{transform:scale(1.2)}30%,88%{transform:scale(1)}100%{transform:scale(0)}}
@keyframes lgLine{0%,30%{transform:scaleX(0)}48%,90%{transform:scaleX(1)}100%{transform:scaleX(0)}}
@keyframes lgHeart{0%,50%{transform:scale(0)}60%{transform:scale(1.35)}68%,90%{transform:scale(1)}100%{transform:scale(0)}}
@keyframes lgTag{0%,100%{transform:rotate(0)}25%{transform:rotate(-9deg)}75%{transform:rotate(9deg)}}
@keyframes lgSpark{0%,100%{transform:scale(.3);opacity:.2}50%{transform:scale(1);opacity:1}}
@keyframes lgRec{0%,100%{opacity:1}50%{opacity:.15}}
@keyframes lgPlay{0%,100%{transform:scale(1)}50%{transform:scale(1.14)}}
@keyframes lgProg{0%{transform:scaleX(0)}90%,100%{transform:scaleX(1)}}
@keyframes lgHandset{0%,55%,100%{transform:rotate(0)}8%{transform:rotate(-10deg)}16%{transform:rotate(9deg)}24%{transform:rotate(-8deg)}32%{transform:rotate(0)}}
@keyframes lgBubble{0%,38%{transform:scale(0)}50%{transform:scale(1.1)}56%,92%{transform:scale(1)}100%{transform:scale(0)}}
@keyframes lgCheck{0%,52%{stroke-dashoffset:1}70%,92%{stroke-dashoffset:0}100%{stroke-dashoffset:1}}
.pis-v1 .lg-logo,.pis-v1 .lg-heart,.pis-v1 .lg-tag,.pis-v1 .lg-spark,.pis-v1 .lg-play,.pis-v1 .lg-bubble,.pis-v1 .lg-handset{transform-box:fill-box;transform-origin:center;}
.pis-v1 .lg-logo{animation:lgLogo 4.5s ease-in-out infinite;}
.pis-v1 .lg-line{transform-box:fill-box;transform-origin:left center;animation:lgLine 4.5s ease-in-out infinite;}
.pis-v1 .lg-line.l2{animation-delay:.2s;}
.pis-v1 .lg-heart{animation:lgHeart 4.5s ease-in-out infinite;}
.pis-v1 .lg-tag{transform-origin:70% 20%;animation:lgTag 3s ease-in-out infinite;}
.pis-v1 .lg-spark{animation:lgSpark 2s ease-in-out infinite;}
.pis-v1 .lg-spark.s2{animation-delay:.9s;}
.pis-v1 .lg-rec{animation:lgRec 1.2s ease-in-out infinite;}
.pis-v1 .lg-play{animation:lgPlay 1.8s ease-in-out infinite;}
.pis-v1 .lg-prog{transform-box:fill-box;transform-origin:left center;animation:lgProg 4s ease-in-out infinite;}
.pis-v1 .lg-handset{animation:lgHandset 4s ease-in-out infinite;}
.pis-v1 .lg-bubble{transform-origin:bottom left;animation:lgBubble 4s ease-in-out infinite;}
.pis-v1 .lg-check{stroke-dasharray:1;stroke-dashoffset:1;animation:lgCheck 4s ease-in-out infinite;}
@media (prefers-reduced-motion: reduce){
  .pis-v1 .lg-logo,.pis-v1 .lg-line,.pis-v1 .lg-heart,.pis-v1 .lg-tag,.pis-v1 .lg-spark,.pis-v1 .lg-rec,.pis-v1 .lg-play,.pis-v1 .lg-prog,.pis-v1 .lg-handset,.pis-v1 .lg-bubble{animation:none !important;transform:none;opacity:1;}
  .pis-v1 .lg-check{animation:none !important;stroke-dashoffset:0;}
}

/* ===== Proceso, «No importa cuánto sepas hoy» y garantía (v1/v4) ===== */
.pis-v1 .step-art{height:200px;}
.pis-v1 .step-art .pr-art{width:100%;max-width:300px;height:100%;display:block;}
.pis-v1 .pr-art .pr-card,.pis-v1 .pr-art .pr-ok,.pis-v1 .pr-art .pr-done,.pis-v1 .pr-art .pr-coin,.pis-v1 .pr-art .pr-pay,.pis-v1 .pr-art .pr-btn,.pis-v1 .pr-art .pr-published,.pis-v1 .pr-art .pr-gbar,.pis-v1 .pr-art .pr-file,.pis-v1 .pr-art .pr-ripple,.pis-v1 .pr-art .pr-type,.pis-v1 .pr-art .pr-bar{transform-box:fill-box;}
/* checkout 6s (asteriscos que se revelan) */
@keyframes prT1{0%,4%{transform:scaleX(1)}16%,94%{transform:scaleX(0)}98%,100%{transform:scaleX(1)}}
@keyframes prT2{0%,17%{transform:scaleX(1)}38%,94%{transform:scaleX(0)}98%,100%{transform:scaleX(1)}}
@keyframes prT3{0%,40%{transform:scaleX(1)}50%,94%{transform:scaleX(0)}98%,100%{transform:scaleX(1)}}
@keyframes prT4{0%,50%{transform:scaleX(1)}58%,94%{transform:scaleX(0)}98%,100%{transform:scaleX(1)}}
@keyframes prCard{0%{transform:translateX(70px) rotate(8deg);opacity:0}8%,92%{transform:translateX(0) rotate(0);opacity:1}98%,100%{transform:translateX(0);opacity:0}}
@keyframes prPay{0%,62%{transform:scale(1)}66%{transform:scale(.94)}70%,100%{transform:scale(1)}}
@keyframes prOk{0%,68%{transform:scale(0)}75%{transform:scale(1.15)}80%,96%{transform:scale(1)}100%{transform:scale(0)}}
.pis-v1 .pr-type{transform-origin:right center;animation-duration:6s;animation-timing-function:steps(10,end);animation-iteration-count:infinite;}
.pis-v1 .pr-type.t1{animation-name:prT1;}.pis-v1 .pr-type.t2{animation-name:prT2;}.pis-v1 .pr-type.t3{animation-name:prT3;}.pis-v1 .pr-type.t4{animation-name:prT4;}
.pis-v1 .pr-card{animation:prCard 6s ease-out infinite;}
.pis-v1 .pr-pay{transform-origin:center;animation:prPay 6s ease-in-out infinite;}
.pis-v1 .pr-ok{transform-origin:center;animation:prOk 6s ease-in-out infinite;}
/* descarga 6s */
@keyframes prDrop{0%,100%{transform:translateY(-8px);opacity:.25}50%{transform:translateY(8px);opacity:1}}
@keyframes prFile{0%{transform:translateY(-70px);opacity:0}14%{opacity:1}34%,86%{transform:translateY(0);opacity:1}96%,100%{transform:translateY(0);opacity:0}}
@keyframes prBar{0%,30%{transform:scaleX(0)}78%,100%{transform:scaleX(1)}}
@keyframes prPct{0%,76%{opacity:1}80%,100%{opacity:0}}
@keyframes prDone{0%,78%{transform:scale(0)}86%{transform:scale(1.2)}92%,100%{transform:scale(1)}}
.pis-v1 .pr-drops{animation:prDrop 1.5s ease-in-out infinite;}
.pis-v1 .pr-file{animation:prFile 6s ease-in-out infinite;}
.pis-v1 .pr-bar{transform-origin:left center;animation:prBar 6s ease-in-out infinite;}
.pis-v1 .pr-pct{animation:prPct 6s ease-in-out infinite;}
.pis-v1 .pr-done{transform-origin:center;animation:prDone 6s ease-in-out infinite;}
/* publicar 8s */
@keyframes prBtn{0%,22%{transform:scale(1);opacity:1}26%{transform:scale(.92)}30%{transform:scale(1);opacity:1}38%,100%{opacity:0}}
@keyframes prPublished{0%,31%{opacity:0}38%,90%{opacity:1}96%,100%{opacity:0}}
@keyframes prRipple{0%,23%{transform:scale(.4);opacity:0}27%{opacity:1}40%,100%{transform:scale(3);opacity:0}}
@keyframes prGrow{0%,44%{transform:scaleY(.08)}64%,92%{transform:scaleY(1)}98%,100%{transform:scaleY(.08)}}
@keyframes prCoin{0%,64%{transform:scale(0)}72%{transform:scale(1.2)}78%,92%{transform:scale(1)}98%,100%{transform:scale(0)}}
.pis-v1 .pr-btn{transform-origin:center;animation:prBtn 8s ease-in-out infinite;}
.pis-v1 .pr-published{animation:prPublished 8s ease-in-out infinite;}
.pis-v1 .pr-ripple{transform-origin:center;animation:prRipple 8s ease-out infinite;}
.pis-v1 .pr-gbar{transform-origin:center bottom;animation:prGrow 8s ease-in-out infinite;}
.pis-v1 .pr-gbar.g2{animation-delay:.18s;}.pis-v1 .pr-gbar.g3{animation-delay:.36s;}
.pis-v1 .pr-coin{transform-origin:center;animation:prCoin 8s ease-in-out infinite;}
/* «No importa cuánto sepas hoy» */
.pis-v1 .ease-card h3{font-size:18px;}
.pis-v1 .strike,.pis-v1 .uline{position:relative;display:inline-block;}
.pis-v1 .strike::after{content:"";position:absolute;left:-2px;right:-2px;top:54%;height:3px;border-radius:2px;background:#E4572E;transform-origin:left center;animation:fcStrike 4.5s ease-in-out infinite;}
.pis-v1 .uline::after{content:"";position:absolute;left:0;right:0;bottom:-2px;height:4px;border-radius:2px;background:#F2C14E;transform-origin:left center;animation:fcStrike 4.5s ease-in-out infinite;}
@keyframes fcStrike{0%,15%{transform:scaleX(0)}32%,88%{transform:scaleX(1)}100%{transform:scaleX(0)}}
.pis-v1 .fl-pop .lang-flags{display:inline-flex;gap:6px;vertical-align:-3px;margin-left:4px;}
.pis-v1 .fl-pop .lang-flags>*{transform-origin:center;animation:fcFlag 4.5s ease-in-out infinite;}
.pis-v1 .fl-pop .lang-flags>*:nth-child(2){animation-delay:.35s;}
@keyframes fcFlag{0%,12%{transform:scale(0);opacity:0}22%{transform:scale(1.25);opacity:1}30%,88%{transform:scale(1);opacity:1}100%{transform:scale(0);opacity:0}}
@keyframes fcDot{0%,100%{transform:scale(1)}50%{transform:scale(1.35)}}
@keyframes fcBrush{0%,100%{transform:rotate(0)}50%{transform:rotate(-14deg)}}
@keyframes fcBub{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}
@keyframes fcBar{0%,15%{transform:scaleY(.15)}45%,88%{transform:scaleY(1)}100%{transform:scaleY(.15)}}
@keyframes fcTrend{0%,30%{stroke-dashoffset:1;opacity:1}60%,88%{stroke-dashoffset:0;opacity:1}100%{stroke-dashoffset:1;opacity:1}}
@keyframes fcHead{0%,55%{opacity:0}62%,88%{opacity:1}100%{opacity:0}}
.pis-v1 .fc-dot,.pis-v1 .fc-brush,.pis-v1 .fc-bub,.pis-v1 .fc-bar{transform-box:fill-box;transform-origin:center;}
.pis-v1 .fc-dot{animation:fcDot 2s ease-in-out infinite;}
.pis-v1 .fc-dot.d2{animation-delay:.25s}.pis-v1 .fc-dot.d3{animation-delay:.5s}.pis-v1 .fc-dot.d4{animation-delay:.75s}
.pis-v1 .fc-brush{transform-origin:100% 100%;animation:fcBrush 2.2s ease-in-out infinite;}
.pis-v1 .fc-bub{animation:fcBub 3s ease-in-out infinite;}
.pis-v1 .fc-bub.b2{animation-delay:1.5s;}
.pis-v1 .fc-bar{transform-origin:center bottom;animation:fcBar 4.5s ease-in-out infinite;}
.pis-v1 .fc-bar.f2{animation-delay:.15s}.pis-v1 .fc-bar.f3{animation-delay:.3s}
.pis-v1 .fc-trend{stroke-dasharray:1;animation:fcTrend 4.5s ease-in-out infinite;}
.pis-v1 .fc-arrowhead{animation:fcHead 4.5s ease-in-out infinite;}
/* garantía: tarjeta en 2 columnas; la columna izquierda va pintada de verde con el sello */
#garantia.sec-dark{padding:0;}
.pis-v1 #garantia .container{max-width:none;padding:0;}
.pis-v1 .guar-v1{display:grid;grid-template-columns:clamp(210px,30vw,440px) 1fr;gap:0;align-items:stretch;max-width:none;margin:0;background:transparent;border:0;border-radius:0;overflow:visible;}
.pis-v1 .guar-v1 .gb-wrap{order:1;position:relative;background:#1B8A55;display:flex;align-items:center;justify-content:center;padding:clamp(48px,6.5vw,88px) clamp(36px,6vw,80px);}
.pis-v1 .guar-v1 .gb-wrap::before{content:"";position:absolute;inset:clamp(14px,2vw,26px);border:2px solid #fff;border-radius:10px;pointer-events:none;}
.pis-v1 .guar-v1 .guar-text{order:2;align-self:center;padding:clamp(40px,6vw,80px) clamp(28px,7vw,112px);max-width:800px;}
.pis-v1 .gb-art{width:100%;max-width:240px;height:auto;display:block;}
@media(max-width:700px){.pis-v1 .guar-v1{grid-template-columns:140px 1fr;}.pis-v1 .guar-v1 .gb-wrap{padding:36px 22px;}.pis-v1 .guar-v1 .gb-wrap::before{inset:10px;}.pis-v1 .guar-v1 .guar-text{padding:32px 18px 32px 20px;}.pis-v1 .guar-v1 .guar-text h2{font-size:19px;}.pis-v1 .guar-v1 .guar-text p{font-size:13.5px;line-height:1.55;margin-top:12px;}}
@media (prefers-reduced-motion: reduce){
  .pis-v1 .pr-art *,.pis-v1 .fc-art *,.pis-v1 .gb-art *,.pis-v1 .strike::after,.pis-v1 .uline::after,.pis-v1 .fl-pop .lang-flags>*{animation:none !important;}
  .pis-v1 .strike::after,.pis-v1 .uline::after{transform:scaleX(1);}
  .pis-v1 .pr-art .pr-ripple,.pis-v1 .pr-art .pr-pct,.pis-v1 .pr-art .pr-btn,.pis-v1 .pr-art .pr-drops{opacity:0;}
  .pis-v1 .pr-art .pr-published,.pis-v1 .pr-art .pr-ok,.pis-v1 .pr-art .pr-done{opacity:1;}
  .pis-v1 .gb-ring{stroke-dashoffset:0;}
}
`;
}).join("\n")}
@media (prefers-reduced-motion: reduce){
  .pis-v1 .cal-post,.pis-v1 .cal-badge,.pis-v1 .cal-c1,.pis-v1 .cal-chip{animation:none !important;opacity:1;transform:none;}
  .pis-v1 .cal-c0,.pis-v1 .cal-arrow{animation:none !important;opacity:0;}
}
`;

// Hero v4: 4 escenas a pantalla completa fijadas mientras se hace scroll. --p (0..1) y --o0..--o3 los pone el efecto en JS.
export const PIS_V4_CSS = `
.pis-page.pis-v4{overflow:visible;overflow-x:clip;}
.pis-v4 .hero4{--p:1;--o0:1;--o1:0;--o2:0;--o3:0;position:relative;height:calc(100svh + 300svh);padding:0;background:#0B2F4F;}
.pis-v4 .hero4-stick{position:sticky;top:0;height:100svh;overflow:hidden;}
.pis-v4 .scene{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:clamp(20px,4svh,48px) 0;pointer-events:none;}
.pis-v4 .scene{will-change:opacity,transform;}
.pis-v4 .sc0{opacity:var(--o0);transform:scale(calc(1 - (1 - var(--o0)) * .05)) translateY(calc((1 - var(--o0)) * -24px));}
.pis-v4 .sc1{opacity:var(--o1);transform:translateY(calc((1 - var(--o1)) * 26px)) scale(calc(.97 + var(--o1) * .03));}
.pis-v4 .sc2{opacity:var(--o2);transform:translateY(calc((1 - var(--o2)) * 26px)) scale(calc(.97 + var(--o2) * .03));}
.pis-v4 .sc3{opacity:var(--o3);transform:translateY(calc((1 - var(--o3)) * 26px)) scale(calc(.97 + var(--o3) * .03));}
.pis-v4 .hero4[data-scene="3"] .sc3{pointer-events:auto;}
.pis-v4 .scene-in{width:100%;}
.pis-v4 .rv2{--r:clamp(0, calc((var(--p) - var(--s)) / (var(--e) - var(--s))), 1);opacity:var(--r);transform:translateY(calc((1 - var(--r)) * 30px));}
.pis-v4 .rs{--r:clamp(0, calc((var(--p) - var(--s)) / (var(--e) - var(--s))), 1);}
/* Escena 1 */
.pis-v4 .scene-in-1{display:flex;flex-direction:column;align-items:center;gap:clamp(14px,3svh,28px);}
.pis-v4 .scene1-text{width:100%;}
.pis-v4 .scene1-text .kicker{margin-bottom:12px;}
.pis-v4 .scene1-text h1{font-size:clamp(25px,7vw,34px);}
.pis-v4 .scene1-img{width:100%;max-width:min(100%,calc(46svh * 4 / 3));margin:0 auto;}
@media(min-width:960px){
  .pis-v4 .scene-in-1{flex-direction:row;align-items:center;justify-content:space-between;gap:clamp(24px,4vw,64px);}
  .pis-v4 .scene1-text{flex:1 1 44%;}
  .pis-v4 .scene1-text h1{font-size:clamp(32px,3.6vw,50px);}
  .pis-v4 .scene1-img{flex:1 1 56%;max-width:min(56%,calc(78svh * 4 / 3));margin:0;}
}
/* Escena 2: checks con ilustración */
.pis-v4 .scene-checks{display:flex;flex-direction:column;gap:clamp(16px,3.5svh,32px);max-width:780px;margin:0 auto;}
.pis-v4 .scene-checks li{position:relative;display:flex;align-items:center;gap:clamp(16px,3vw,28px);}
.pis-v4 .chk-art{flex-shrink:0;width:clamp(72px,17vw,116px);height:clamp(72px,17vw,116px);display:block;}
.pis-v4 .scene-checks b{font-size:clamp(22px,5.4vw,42px);font-weight:800;line-height:1.15;letter-spacing:-.02em;color:var(--ink);}
.pis-v4 .scene-checks .chk{position:absolute;left:clamp(50px,12vw,82px);top:clamp(-4px,-.5vw,0px);width:clamp(26px,5.4vw,38px);height:clamp(26px,5.4vw,38px);border-radius:50%;background:#1B8A55;border:3px solid #0B2F4F;display:flex;align-items:center;justify-content:center;}
.pis-v4 .scene-checks .chk .icon{width:60%;height:60%;color:#fff;stroke-width:3.2;}
.pis-v4 .draw{stroke-dasharray:1;stroke-dashoffset:calc(1 - var(--r));}
.pis-v4 .pop,.pis-v4 .grow,.pis-v4 .slash,.pis-v4 .fill-in{transform-box:fill-box;transform-origin:center;}
.pis-v4 .pop{opacity:var(--r);transform:scale(calc(.3 + var(--r) * .7));}
.pis-v4 .grow{transform-origin:center bottom;transform:scaleY(var(--r));}
.pis-v4 .slash{opacity:var(--r);transform:scale(calc(1.5 - var(--r) * .5)) rotate(calc((1 - var(--r)) * -14deg));}
.pis-v4 .fadein{opacity:var(--r);}
.pis-v4 .gap{opacity:var(--r);}
.pis-v4 .fill-in{opacity:var(--r);transform:scale(calc(.4 + var(--r) * .6));}
/* Escena 3: texto + agenda */
.pis-v4 .scene-in-3{display:flex;flex-direction:column;gap:clamp(12px,2.5svh,26px);align-items:center;}
.pis-v4 .scene-lines{display:flex;flex-direction:column;gap:clamp(12px,2.6svh,32px);max-width:820px;margin:0 auto;}
.pis-v4 .scene-lines p{font-size:clamp(16px,4.2vw,30px);line-height:1.36;font-weight:600;color:var(--ink-soft);}
.pis-v4 .scene-lines p.strong{color:var(--yellow);font-weight:800;font-size:clamp(19px,5vw,36px);line-height:1.22;}
.pis-v4 .scene3-art{width:min(100%,calc(34svh * 330 / 270));flex-shrink:0;}
.pis-v4 .agenda-art{width:100%;height:auto;display:block;}
@media(min-width:960px){
  .pis-v4 .scene-in-3{flex-direction:row;justify-content:space-between;gap:clamp(28px,5vw,80px);}
  .pis-v4 .scene-lines{flex:1 1 52%;margin:0;}
  .pis-v4 .scene3-art{flex:0 1 44%;width:auto;max-width:calc(70svh * 330 / 270);}
}
/* Escena 4: CTA */
.pis-v4 .scene-in-4{display:flex;flex-direction:column;align-items:center;gap:clamp(12px,2.5svh,24px);max-width:620px;}
.pis-v4 .scene4-mock{background:transparent !important;padding:0;margin:0 auto;}
.pis-v4 .scene4-cta{width:100%;}
.pis-v4 .scene4-cta .btn-hero{min-height:clamp(68px,10svh,92px);font-size:clamp(17px,4.4vw,22px);}
.pis-v4 .scene4-cta .pc-payment{text-align:center;margin-top:14px;}
.pis-v4 .scene4-cta .pc-payment-icons{justify-content:center;}
.pis-v4 .scene4-mockwrap{position:relative;width:min(86%,calc(40svh * 1));margin:0 auto;}
.pis-v4 .scene4-mockwrap .scene4-mock{position:relative;width:100%;}
.pis-v4 .spark-ring{position:absolute;inset:-8%;width:116%;height:116%;overflow:visible;}
.pis-v4 .ring-draw{stroke-dasharray:1;stroke-dashoffset:calc(1 - var(--r));}
.pis-v4 .ring-spin{transform-origin:50px 50px;animation:ringSpin 40s linear infinite;}
@keyframes ringSpin{to{transform:rotate(360deg)}}
.pis-v4 .twinkle{transform-box:fill-box;transform-origin:center;animation:twinkle 2.4s ease-in-out infinite;}
@keyframes twinkle{0%,100%{transform:scale(.4);opacity:.3}50%{transform:scale(1);opacity:1}}
.pis-v4 .waves{position:absolute;left:0;bottom:0;width:100%;height:clamp(70px,14svh,140px);pointer-events:none;}
.pis-v4 .wv{animation:waveMove 14s linear infinite;}
.pis-v4 .wv2{animation-duration:22s;animation-direction:reverse;}
@keyframes waveMove{to{transform:translateX(-1200px)}}
/* Pista de scroll y puntos de progreso */
.pis-v4 .hero4-hint{position:absolute;left:0;right:0;bottom:16px;display:flex;flex-direction:column;align-items:center;gap:2px;font-size:12.5px;font-weight:700;color:var(--ink-soft);opacity:calc(var(--o0) * 1);pointer-events:none;}
.pis-v4 .hero4-hint .icon{width:22px;height:22px;animation:hintBounce 1.4s ease-in-out infinite;}
@keyframes hintBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(6px)}}
.pis-v4 .hero4-dots{position:absolute;right:12px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:10px;pointer-events:none;}
.pis-v4 .hero4-dots i{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.28);display:block;}
.pis-v4 .hero4[data-scene="0"] .hero4-dots i:nth-child(1),.pis-v4 .hero4[data-scene="1"] .hero4-dots i:nth-child(2),.pis-v4 .hero4[data-scene="2"] .hero4-dots i:nth-child(3),.pis-v4 .hero4[data-scene="3"] .hero4-dots i:nth-child(4){background:#fff;}
/* Sin animación (reducir movimiento): escenas apiladas, todo visible */
.pis-v4 .hero4.is-static{height:auto;}
.pis-v4 .hero4.is-static .hero4-stick{position:static;height:auto;overflow:visible;}
.pis-v4 .hero4.is-static .scene{position:relative;inset:auto;opacity:1;pointer-events:auto;padding:clamp(28px,6vw,56px) 0;}
.pis-v4 .hero4.is-static .rv2{opacity:1;transform:none;}
.pis-v4 .hero4.is-static .waves{display:none;}
.pis-v4 .hero4.is-static{--p:1;}
.pis-v4 .hero4.is-static .hero4-hint,.pis-v4 .hero4.is-static .hero4-dots{display:none;}
@media (prefers-reduced-motion: reduce){.pis-v4 .hero4-hint .icon,.pis-v4 .wv,.pis-v4 .ring-spin,.pis-v4 .twinkle{animation:none;}}
`;
