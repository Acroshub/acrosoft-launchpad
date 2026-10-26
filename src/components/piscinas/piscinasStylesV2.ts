// CSS extra de las landings v2 (/piscinas-lp2) y v3 (/piscinas-lp3). Se añade DESPUÉS de PIS_CSS
// (piscinasStyles.ts, solo lectura) y reutiliza sus variables. Texto a la izquierda salvo cards de CTA.

export const PIS_CSS_V2 = `
/* VSL / video */
.pis-page .vsl-wrap{max-width:860px;margin:0;}
.pis-page .vsl-box{position:relative;width:100%;aspect-ratio:16/9;border-radius:22px;overflow:hidden;background:#020B14;border:1px solid var(--line);box-shadow:var(--shadow);}
.pis-page .vsl-box iframe,.pis-page .vsl-box video{position:absolute;inset:0;width:100%;height:100%;border:0;display:block;background:#000;}
.pis-page .vsl-box.is-empty{background:repeating-linear-gradient(135deg,rgba(18,164,200,.08) 0 14px,rgba(18,164,200,.02) 14px 28px),#041526;border:2px dashed rgba(18,164,200,.55);}
.pis-page .vsl-empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:8px;padding:clamp(16px,4vw,40px);}
.pis-page .vsl-play{width:54px;height:54px;border-radius:50%;background:var(--aqua-soft);border:2px solid var(--aqua);display:flex;align-items:center;justify-content:center;margin-bottom:4px;}
.pis-page .vsl-play svg{width:22px;height:22px;fill:var(--aqua);margin-left:3px;}
.pis-page .vsl-empty-title{font-size:clamp(17px,3.2vw,26px);font-weight:800;color:var(--yellow);line-height:1.2;}
.pis-page .vsl-empty-note{font-size:13.5px;color:var(--ink-soft);max-width:44ch;}
.pis-page .vsl-wrap .cta-card{max-width:440px;margin:26px auto 0;}

/* Barra de amplificación */
.pis-page .amp-bar{background:linear-gradient(90deg,rgba(18,164,200,.22),rgba(18,164,200,.08));border-top:1px solid rgba(18,164,200,.4);border-bottom:1px solid rgba(18,164,200,.4);padding:16px 0;}
.pis-page .amp-bar p{font-size:clamp(15px,2.4vw,18px);font-weight:700;color:var(--ink);}
.pis-page .amp-bar strong{color:var(--yellow);}

/* Hero: objeciones derribadas */
.pis-page .no-chips{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px;}
.pis-page .no-chip{display:inline-flex;align-items:center;gap:8px;background:var(--card);border:1px solid var(--line);border-radius:999px;padding:9px 16px 9px 12px;font-weight:700;font-size:14px;}
.pis-page .no-chip .icon{width:18px;height:18px;color:var(--ok);stroke-width:3;}

/* Presentación del producto */
.pis-page .present-grid{display:grid;grid-template-columns:1fr;gap:30px;align-items:center;}
@media(min-width:900px){.pis-page .present-grid{grid-template-columns:.9fr 1.1fr;gap:56px;}}
.pis-page .present-visual{border-radius:26px;background:radial-gradient(circle at 50% 45%,rgba(18,164,200,.3),transparent 72%);padding:10px;}
.pis-page .present-visual img{width:100%;max-width:460px;aspect-ratio:1/1;object-fit:contain;display:block;margin:0 auto;}
.pis-page .present-text .lead{margin-top:14px;font-size:17.5px;color:var(--ink-soft);}
.pis-page .present-text .lead strong{color:var(--ink);}

/* Stack de «qué obtendrás» */
.pis-page .stack-list{display:grid;grid-template-columns:1fr;gap:14px;counter-reset:win;}
@media(min-width:820px){.pis-page .stack-list{grid-template-columns:1fr 1fr;}}
.pis-page .stack-item{display:flex;gap:14px;align-items:flex-start;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:18px 20px;}
.pis-page .stack-item .tick{flex-shrink:0;width:34px;height:34px;border-radius:50%;background:var(--ok-bg);border:1px solid rgba(47,191,113,.5);display:flex;align-items:center;justify-content:center;}
.pis-page .stack-item .tick .icon{width:18px;height:18px;color:var(--ok);stroke-width:3;}
.pis-page .stack-item h3{font-size:17px;line-height:1.25;}
.pis-page .stack-item p{margin-top:5px;font-size:14.5px;color:var(--ink-soft);}

/* Demostración por dentro */
.pis-page .demo-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;}
@media(min-width:700px){.pis-page .demo-grid{grid-template-columns:repeat(3,1fr);gap:18px;}}
@media(min-width:1040px){.pis-page .demo-grid{grid-template-columns:repeat(5,1fr);}}
.pis-page .demo-fig{margin:0;display:flex;flex-direction:column;gap:8px;}
.pis-page .demo-fig a{display:block;border-radius:12px;overflow:hidden;border:1px solid var(--line);background:#fff;box-shadow:var(--shadow);transition:transform 160ms ease;}
.pis-page .demo-fig a:hover{transform:translateY(-3px);}
.pis-page .demo-fig img{width:100%;aspect-ratio:595/842;object-fit:cover;display:block;}
.pis-page .demo-fig figcaption{font-size:13px;line-height:1.35;color:var(--ink-soft);font-weight:600;}
.pis-page .demo-fig figcaption strong{color:var(--ink);display:block;font-size:13.5px;}
.pis-page .demo-note{margin-top:18px;font-size:14px;color:var(--ink-dim);}

/* Mockups + precio */
.pis-page .mock-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;}
@media(min-width:1040px){.pis-page .mock-grid{grid-template-columns:repeat(4,1fr);gap:18px;}}
.pis-page .mock-card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;display:flex;flex-direction:column;}
.pis-page .mock-card .kit-visual{padding:10px 10px 0;}
.pis-page .mock-card h3{font-size:15px;line-height:1.25;padding:6px 14px 16px;}
.pis-page .price-card{max-width:480px;margin-top:34px;}
.pis-page .price-card .pc-name{margin-top:4px;}

/* Garantía */
.pis-page .guar-grid{display:grid;grid-template-columns:1fr;gap:26px;align-items:center;max-width:900px;}
@media(min-width:760px){.pis-page .guar-grid{grid-template-columns:auto 1fr;gap:44px;}}
.pis-page .seal{width:168px;height:168px;border-radius:50%;border:4px solid var(--ok);background:radial-gradient(circle,rgba(47,191,113,.22),rgba(47,191,113,.05));box-shadow:0 0 0 8px rgba(47,191,113,.12);display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;}
.pis-page .seal-n{font-size:64px;font-weight:800;line-height:1;color:var(--ok);}
.pis-page .seal-t{margin-top:4px;font-size:13px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--ink);}
.pis-page .guar-text p{margin-top:12px;font-size:17px;color:var(--ink-soft);}
.pis-page .guar-text p strong{color:var(--ink);}

/* Resumen de la oferta */
.pis-page .sum-grid{display:grid;grid-template-columns:1fr;gap:18px;}
@media(min-width:900px){.pis-page .sum-grid{grid-template-columns:1fr 1fr;}}
.pis-page .sum-box{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:22px 22px 24px;}
.pis-page .sum-box h3{font-size:15px;letter-spacing:.07em;text-transform:uppercase;color:var(--aqua);margin-bottom:14px;}
.pis-page .check-list{display:flex;flex-direction:column;gap:11px;}
.pis-page .check-list li{display:flex;gap:11px;align-items:flex-start;font-size:15.5px;color:var(--ink);min-width:0;}
.pis-page .check-list .icon{width:19px;height:19px;color:var(--ok);margin-top:3px;stroke-width:3;}
.pis-page .sum-cta{margin-top:26px;max-width:480px;}

/* Ruta exacta (v3) */
.pis-page .route{display:flex;flex-direction:column;gap:16px;}
.pis-page .route-step{position:relative;display:grid;grid-template-columns:1fr;gap:6px;background:var(--card);border:1px solid rgba(18,164,200,.4);border-radius:var(--radius);padding:22px 22px 22px 22px;}
.pis-page .route-step .n{width:40px;height:40px;border-radius:50%;background:var(--aqua);color:#04202E;font-weight:800;font-size:19px;display:flex;align-items:center;justify-content:center;margin-bottom:6px;}
.pis-page .route-step h3{font-size:19px;color:var(--aqua);text-transform:uppercase;letter-spacing:.02em;}
.pis-page .route-step p{font-size:15.5px;color:var(--ink-soft);}
.pis-page .route-step p.feel{color:var(--yellow);font-weight:600;}
.pis-page .route-step .files{font-size:13.5px;color:var(--ink-dim);}
@media(min-width:900px){.pis-page .route{flex-direction:row;}.pis-page .route-step{flex:1;}}

/* Botón que sube al VSL (v3) */
.pis-page .btn-scroll{font-family:var(--sans);}
.pis-page .scroll-hint{margin-top:10px;font-size:12.5px;color:var(--ink-dim);}
.pis-page .cta-card .scroll-hint{text-align:center;}
.pis-page .offer-hidden{display:none;}

/* Proceso: nota */
.pis-page .proc-note{margin-top:16px;font-size:14px;color:var(--ink-dim);}
.pis-page .steps-wide .step p strong{color:var(--ink);}
`;
