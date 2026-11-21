// CSS EXTRA de la landing /website-tree (copia de la de HVAC con paleta de tree service). Se inyecta DESPUÉS de EST_CSS (landing del kit) y CT_CSS (consultoría), y reusa sus variables (--green, --orange,
// --head…) y varias de sus clases (est-btn, est-trust, est-checks, est-faq, ct-how, ct-done, ct-wa, ct-prog…). Aquí solo va lo propio de esta página,
// con prefijo `wt-` y dentro de `.est-page.wt`. Todos los campos de texto miden 16 px o más (en iPhone, menos hace zoom al tocarlos).

export const WT_CSS = `
.est-page.wt{min-height:0}

/* ── Paleta propia de tree service: verde bosque (naturaleza, confianza) + rojo cereza (acción: botón y resaltados). Se pisan las variables del kit (verde/naranja) y los pocos colores
   fijos que traen EST_CSS y CT_CSS para las clases que usa esta página. ── */
.est-page.wt{--bg:#F5F8F1;--line:#DDE5D6;--body:#4A5648;--green:#1F5130;--green-soft:#E3F0E2;--orange:#D1382B;--orange-dark:#9C2A20;--hl:#B8281D;--red-soft:#FBE3DF}
.wt .est-btn{box-shadow:0 5px 0 var(--orange-dark),0 12px 26px rgba(209,56,43,.25)}
.wt .est-btn:hover{box-shadow:0 3px 0 var(--orange-dark),0 8px 18px rgba(209,56,43,.22)}
.wt .est-btn:active{box-shadow:0 0 0 var(--orange-dark)}
.wt .est-sec--offer{background:#E8F1E4;border-top:1px solid #CADBC4;border-bottom:1px solid #CADBC4}
.wt .est-offer-card{border-color:var(--green);box-shadow:0 20px 44px rgba(31,81,48,.15)}
.wt .ct-ring-bg{fill:#FDEDEA;stroke:#F5D2CC}
.wt .ct-ring-fg,.wt .ct-ring-clock{stroke:var(--orange)}
.wt .ct-prog-track{background:#E3EADF}
.wt .ct-prog-track i{background:repeating-linear-gradient(135deg,var(--orange) 0 12px,#E8665A 12px 24px);background-size:34px 34px}
.wt .ct-done li:before{background:var(--orange)}
.wt .ct-done-close{background:var(--orange);box-shadow:0 3px 0 var(--orange-dark)}

/* ── Hero ── */
.wt .wt-hero{padding:20px 0 30px;text-align:center}
.wt .wt-hero h1{font-size:clamp(33px,9.4vw,52px);line-height:.98;margin-bottom:10px}
/* Bandera de EE.UU. en línea con el texto de arriba del título */
.wt .wt-flag{display:inline-block;width:22px;height:15px;margin-right:8px;vertical-align:-3px}
.wt .wt-sub{font-size:clamp(16px,4.6vw,19px);line-height:1.35;margin:0 auto 16px;max-width:30em;color:var(--body)}
.wt .wt-sub b{color:var(--ink)}
/* Subtexto del hero en 2 checks */
.wt .wt-checks{list-style:none;margin:0 auto 16px;padding:0;max-width:30em;display:grid;gap:8px;justify-items:center;text-align:center}
.wt .wt-checks li{display:block;font:500 clamp(14px,3.8vw,16px)/1.3 var(--text);color:var(--body)}
.wt .wt-checks li b{color:var(--ink);font-weight:700}
.wt .wt-checks .est-ic{display:inline-block;vertical-align:-.28em;margin:0 7px 0 0;width:1.3em;height:1.3em;color:var(--green);stroke-width:3.2}
/* Precio de anclaje bajo el botón del hero */
.wt .wt-anchor{max-width:420px;margin:14px auto 0;padding:16px 14px 16px;background:var(--card);border:1px solid var(--line);border-radius:16px;box-shadow:0 6px 16px rgba(17,17,17,.07);text-align:center}
/* «¿Por qué gratis?» como título de sección, su texto y debajo dos tarjetas «Otra agencia VS Con nosotros» */
.wt .wt-why h3{margin:0 0 8px;text-align:center;font:800 clamp(28px,8vw,34px)/1 var(--head);letter-spacing:.02em;text-transform:uppercase;color:var(--hl)}
.wt .wt-why p{margin:0;font:400 13.5px/1.5 var(--text);color:var(--body)}
.wt .wt-why p u{text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:3px;text-decoration-color:currentColor}
.wt .wt-vs{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:stretch;gap:8px;margin-top:16px}
.wt .wt-vs-card{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:5px;padding:12px 8px 13px;border:1.5px solid var(--line);border-radius:14px;background:#F6F7F4}
.wt .wt-vs-card.is-us{background:var(--green-soft);border-color:var(--green)}
.wt .wt-vs-tag{white-space:nowrap;font:700 11px/1.2 var(--text);letter-spacing:.04em;text-transform:uppercase;color:#6B7280}
.wt .wt-vs-card.is-us .wt-vs-tag{color:var(--green)}
.wt .wt-vs-card p{margin:0;font:500 12.5px/1.3 var(--text);color:var(--body)}
.wt .wt-vs-card strong{margin-top:auto;font:800 34px/1 var(--head);letter-spacing:.02em;text-transform:uppercase;color:var(--ink)}
.wt .wt-vs-card.is-us strong{color:var(--green)}
.wt .wt-vs-mid{align-self:center;display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:var(--ink);color:#fff;font:800 13px/1 var(--head);letter-spacing:.04em}
.wt .wt-meter{margin:14px auto 0;max-width:420px;text-align:left}
.wt .wt-meter-row{display:flex;justify-content:space-between;gap:10px;font:600 13.5px/1.2 var(--text);color:var(--ink);margin-bottom:6px}
.wt .wt-meter-row span:last-child{color:var(--hl)}
.wt .wt-meter-bar{height:12px;border-radius:99px;background:#E0E8DB;overflow:hidden;box-shadow:inset 0 1px 2px rgba(17,17,17,.12)}
.wt .wt-meter-bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--orange),#E8665A);position:relative;overflow:hidden;transition:width .6s cubic-bezier(.22,.8,.3,1)}
/* Barra «en marcha»: franjas diagonales a 45° de ancho parejo (mosaico cuadrado: no se estrechan hacia un extremo) que corren hacia la derecha, así parece que avanza aunque el ancho no cambie. */
.wt .wt-meter-bar i::before{content:"";position:absolute;inset:0;background-image:linear-gradient(45deg,rgba(255,255,255,.18) 25%,rgba(255,255,255,0) 25%,rgba(255,255,255,0) 50%,rgba(255,255,255,.18) 50%,rgba(255,255,255,.18) 75%,rgba(255,255,255,0) 75%,rgba(255,255,255,0));background-size:28px 28px;animation:wt-meter-run 1.4s linear infinite}
@keyframes wt-meter-run{from{background-position:0 0}to{background-position:28px 0}}
.wt .est-btn small{display:block;margin-top:3px;font:600 clamp(11.5px,3.3vw,14px)/1.2 var(--text);letter-spacing:0;text-transform:none;opacity:.95}
.wt .wt-btn-txt{display:block;min-width:0;text-align:center}
.wt button.est-btn{border:0;cursor:pointer}
/* Línea de datos bajo el botón: reglas PROPIAS (esta página comparte CT_CSS con /consultoria-mkt-tree, que se edita por su lado; así un cambio allá no desacomoda aquí). */
.wt .est-trust{flex-wrap:nowrap;max-width:100%;margin-top:14px;gap:6px clamp(7px,2.4vw,16px);font-size:clamp(9.6px,2.95vw,13.5px)}
.wt .est-trust li{white-space:nowrap;min-width:0;gap:clamp(3px,1vw,6px)}
.wt .est-trust .est-ic{width:clamp(12px,3.4vw,16px);height:clamp(12px,3.4vw,16px)}

/* ── Foto del hero (dueño de tree service mostrando su website en el celular) ── */
.wt .wt-hero-pic{margin:0 auto;width:100%;max-width:560px}
.wt .wt-hero-pic img{display:block;width:100%;height:auto;aspect-ratio:3/2;object-fit:cover;border-radius:18px;box-shadow:0 16px 38px rgba(31,81,48,.22);border:3px solid var(--green)}

/* ── Maqueta de website (captura de escritorio dentro de un marco de navegador + captura de celular encima) ── */
.wt .wt-mock{position:relative;margin:0 auto;width:100%;max-width:560px;padding:0 0 22px}
.wt .wt-browser{border-radius:12px;overflow:hidden;background:#fff;border:1px solid #CBD6C5;box-shadow:0 16px 38px rgba(17,17,17,.18)}
.wt .wt-bar{display:flex;align-items:center;gap:5px;padding:7px 10px;background:#E8EEE3;border-bottom:1px solid #CBD6C5}
.wt .wt-bar i{width:8px;height:8px;border-radius:50%;background:#B9C7B3}
.wt .wt-bar span{margin-left:8px;flex:1;max-width:60%;height:14px;border-radius:99px;background:#F5F8F1;border:1px solid #D4DECF}
.wt .wt-browser img{display:block;width:100%;height:auto}
.wt .wt-phone{position:absolute;right:3%;bottom:0;width:23%;border-radius:14px;overflow:hidden;background:#111;border:3px solid #111;box-shadow:0 12px 26px rgba(17,17,17,.34)}
.wt .wt-phone img{display:block;width:100%;height:auto}

/* ── Por qué contratar: tarjetas minimalistas deslizables (icono, número y título) ── */
.wt .wt-ben-sec{padding:34px 0 8px}
.wt .wt-ben-track{position:relative;display:flex;gap:12px;overflow-x:auto;overscroll-behavior-x:contain;scroll-snap-type:x mandatory;scroll-padding-left:20px;padding:18px 20px 8px;margin:0 -20px;scrollbar-width:none;-webkit-overflow-scrolling:touch;outline-offset:-2px}
.wt .wt-ben-track::-webkit-scrollbar{display:none}
.wt .wt-ben-card{flex:0 0 clamp(224px,64vw,270px);scroll-snap-align:start;display:flex;flex-direction:column;align-items:flex-start;gap:6px;background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px 15px 18px;box-shadow:0 6px 16px rgba(31,81,48,.07)}
.wt .wt-ben-ic{display:grid;place-items:center;width:40px;height:40px;border-radius:12px;background:var(--green-soft);color:var(--green);margin-bottom:4px}
.wt .wt-ben-ic .est-ic{width:22px;height:22px;stroke-width:2.1}
.wt .wt-ben-n{font:800 clamp(52px,15vw,64px)/.9 var(--head);letter-spacing:.01em;color:var(--hl)}
.wt .wt-ben-n small{font:800 .5em/1 var(--head);margin-left:3px;letter-spacing:.02em}
.wt .wt-ben-card h3{margin:0;text-transform:none;letter-spacing:0;font:600 15.5px/1.35 var(--text);color:var(--ink)}
/* Pantallas anchas: las 4 tarjetas en una fila centrada y sin deslizar (no caben ni 3 en la columna de 640 px); los puntos solo hacen falta en celular y tablet. */
@media (min-width:900px){
  .wt .wt-ben-sec .est-wrap{max-width:1100px}
  .wt .wt-ben-track{margin:0;padding:18px 0 8px;overflow:visible;justify-content:center;scroll-snap-type:none}
  .wt .wt-ben-card{flex:1 1 0;min-width:0;max-width:270px}
  .wt .wt-ben-sec .wt-dots{display:none}
}

/* ── Ejemplos: carrusel de maquetas ── */
.wt .wt-ex-sec{padding:40px 0 34px}
.wt .wt-ex-head{text-align:center;margin-bottom:6px}
.wt .wt-ex-head p{margin:0 auto;max-width:28em;font-size:15px;line-height:1.4}
.wt .wt-track{position:relative;display:flex;gap:16px;overflow-x:auto;overscroll-behavior-x:contain;scroll-snap-type:x mandatory;padding:18px 20px 8px;margin:0 -20px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.wt .wt-track::-webkit-scrollbar{display:none}
.wt .wt-track>figure{flex:0 0 88%;scroll-snap-align:center;margin:0}
.wt .wt-track figcaption{margin-top:6px;text-align:center;font:600 13px/1.3 var(--text);color:#6D7066}
.wt .wt-dots{display:flex;justify-content:center;gap:8px;padding:8px 0 0}
.wt .wt-dots button{width:9px;height:9px;padding:0;border:0;border-radius:99px;background:#D3CDBC;cursor:pointer;transition:width .2s,background .2s}
.wt .wt-dots button.is-on{width:24px;background:var(--orange)}
.wt .wt-note{margin:10px auto 0;text-align:center;font-size:13px;line-height:1.4;color:#7A7C72;max-width:30em}

/* ── Que incluye: nota en cursiva (no negrita) bajo el primer punto ── */
.wt .est-checks .wt-inc-note{display:block;margin-top:2px;font-style:italic;font-weight:400;font-size:14px;color:var(--body)}

/* ── Precio ── */
.wt .wt-price{background:var(--card);border:2px solid var(--green);border-radius:18px;overflow:hidden;margin-top:16px;box-shadow:0 10px 26px rgba(17,17,17,.08)}
.wt .wt-price-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border-top:1px solid var(--line)}
.wt .wt-price-row:first-child{border-top:0}
.wt .wt-price-row div{min-width:0;font:600 15.5px/1.3 var(--text);color:var(--ink)}
.wt .wt-price-row small{display:block;font:400 13.5px/1.35 var(--text);color:var(--body);margin-top:2px}
.wt .wt-price-row strong{flex:none;font:800 30px/1 var(--head);letter-spacing:.02em;color:var(--green)}
.wt .wt-price-row.is-hl{background:var(--green-soft)}
.wt .wt-price-main{align-items:center}
.wt .wt-price-was{flex:none;display:grid;justify-items:end;gap:1px;text-align:right}
.wt .wt-price-was s{font:700 18px/1 var(--head);letter-spacing:.02em;color:#8A93A2;text-decoration-thickness:2px;text-decoration-color:var(--orange)}
.wt .wt-price-was s i{font:600 .7em/1 var(--text);font-style:normal}
.wt .wt-price-was strong{font:800 38px/.95 var(--head);letter-spacing:.02em;color:var(--hl)}
.wt .wt-price-was em{font:700 12.5px/1.2 var(--text);font-style:normal;color:var(--green);text-transform:uppercase;letter-spacing:.04em}
.wt .wt-price-note{margin:0;padding:12px 16px;border-top:1px solid var(--line);background:#FAFCF8;font:400 13px/1.4 var(--text);color:var(--body)}
.wt .wt-price-row.is-hl strong{color:var(--hl)}

/* ── Popup del formulario (el contenido es un portal con su propio est-page ct wt) ── */
.wt.wt-pop-body{padding:14px 12px 16px;border-radius:16px;min-height:0}
.wt .wt-pop-body .wt-card{margin:0}

/* ── Formulario ── */
.wt .wt-form-sec{padding:44px 0}
.wt .wt-card{background:var(--card);border:2px solid var(--green);border-radius:18px;padding:20px 16px 18px;box-shadow:0 0 0 4px rgba(31,81,48,.1),0 12px 30px rgba(17,17,17,.08)}
.wt .wt-card h2{text-align:center;margin-bottom:4px}
.wt .wt-card>p.wt-lead{text-align:center;font-size:15px;line-height:1.4;margin:0 0 14px}
.wt .wt-steps{display:flex;justify-content:center;gap:8px;margin:0 0 14px;padding:0;list-style:none}
.wt .wt-steps li{display:flex;align-items:center;gap:6px;font:700 12.5px/1 var(--text);letter-spacing:.04em;text-transform:uppercase;color:#9A9C92}
.wt .wt-steps li b{display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:#E6E1D4;color:#6D7066;font:800 13px/1 var(--text)}
.wt .wt-steps li.is-on{color:var(--ink)}
.wt .wt-steps li.is-on b{background:var(--green);color:#fff}
.wt .wt-steps li+li::before{content:"";width:22px;height:2px;background:#D8D2C2;margin-right:2px}
.wt .wt-field{display:block;margin:0 0 13px}
.wt .wt-field>span{display:block;margin:0 0 5px;font:700 13.5px/1.25 var(--text);color:var(--ink)}
.wt .wt-field>span em{font-style:normal;font-weight:500;color:#7A7C72}
.wt .wt-in{display:block;width:100%;min-height:48px;padding:11px 13px;border:1.5px solid #CFC9B8;border-radius:11px;background:#fff;color:#111;font:400 16px/1.3 var(--text);appearance:none;-webkit-appearance:none}
.wt .wt-in::placeholder{color:#A19F94}
.wt .wt-in:focus{outline:3px solid rgba(31,81,48,.28);outline-offset:0;border-color:var(--green)}
.wt .wt-wa-label{display:flex!important;align-items:center;gap:6px}
.wt .wt-wa-ic{width:17px;height:17px;color:#25D366;flex:none}
.wt .wt-tel select,.wt .wt-tel input{height:48px;min-height:48px;border:1.5px solid #CFC9B8;border-radius:11px;background:#fff;color:#111;font:400 16px/1.3 var(--text)}
.wt .wt-tel select{padding:0 6px}
.wt .wt-tel input::placeholder{color:#A19F94}
.wt .wt-tel input{padding:0 13px}
.wt .wt-tel select:focus,.wt .wt-tel input:focus{outline:3px solid rgba(31,81,48,.28);outline-offset:0;border-color:var(--green);box-shadow:none}
.wt .wt-seg{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.wt .wt-seg button{min-height:48px;border:1.5px solid #CFC9B8;border-radius:11px;background:#fff;color:#111;font:700 16px/1 var(--text);cursor:pointer}
.wt .wt-seg button[aria-pressed="true"]{background:var(--green);border-color:var(--green);color:#fff}
.wt .wt-chips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}
.wt .wt-chips button{padding:7px 11px;border:1.5px dashed #BDB7A5;border-radius:99px;background:#FBFAF6;color:#3D4037;font:600 13px/1 var(--text);cursor:pointer}
.wt .wt-chips button:disabled{opacity:.4;cursor:default}
.wt .wt-svc{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;margin:0 0 8px}
.wt .wt-star{display:flex;align-items:center;justify-content:center;gap:6px;min-width:48px;min-height:48px;padding:0 10px;border:1.5px solid #CFC9B8;border-radius:11px;background:#fff;color:#8C8A7E;font:700 12.5px/1 var(--text);cursor:pointer}
.wt .wt-star span{text-align:left;font-size:11.5px;line-height:1.1;max-width:68px}
.wt .wt-star svg{flex:none;width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:2;stroke-linejoin:round}
/* Servicio destacado elegido: amarillo */
.wt .wt-star[aria-pressed="true"]{background:#FFF7CC;border-color:#F5B800;color:#7A5B00}
.wt .wt-star[aria-pressed="true"] svg{fill:#FACC15;stroke:#D99A00}
.wt .wt-star:disabled{opacity:.4;cursor:default}
.wt .wt-hint{margin:2px 0 0;font-size:12.5px;line-height:1.4;color:#7A7C72}
.wt .wt-conf{border:1.5px solid var(--line);border-radius:13px;padding:12px;margin:0 0 10px;background:#FBFAF6}
.wt .wt-conf.is-no{border-color:var(--red);background:var(--red-soft)}
.wt .wt-conf p{margin:0 0 9px;font-size:14px;line-height:1.42;color:var(--ink)}
.wt .wt-conf .wt-seg button{min-height:42px;font-size:15px}
.wt .wt-conf .wt-seg button.is-no[aria-pressed="true"]{background:var(--red);border-color:var(--red)}
.wt .wt-err{margin:8px 0 0;padding:10px 12px;border-radius:10px;background:var(--red-soft);color:#8E2A1F;font:600 14px/1.35 var(--text)}
.wt .wt-actions{display:flex;gap:10px;margin-top:14px}
.wt .wt-actions .est-btn{flex:1;max-width:none}
.wt .wt-back{flex:none;min-height:52px;padding:0 16px;border:1.5px solid #CFC9B8;border-radius:12px;background:#fff;color:#3D4037;font:700 15px/1 var(--text);cursor:pointer}
.wt .est-btn[disabled]{opacity:.55;cursor:default;transform:none}
.wt .est-btn[disabled]{filter:grayscale(.3)}
.wt .wt-need{margin:9px 0 0;text-align:center;font:500 12.5px/1.35 var(--text);color:#7A7C72}
.wt .wt-legal{margin:10px 0 0;text-align:center;font-size:12px;line-height:1.4;color:#8A8C82}

/* ── Confirmación (reusa .ct-done de la consultoría) ── */
.wt .ct-done{max-width:none;margin:0}
.wt .wt-wait{padding:6px 2px 2px;text-align:center}
.wt .wt-wait h2{margin-bottom:6px}

/* ── Botón flotante de soporte por WhatsApp (sube cuando aparece la barra fija móvil; por debajo del popup, z-index 50) ── */
.wt .wt-fab{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:40;display:grid;place-items:center;width:56px;height:56px;border-radius:50%;background:#25D366;color:#fff;box-shadow:0 6px 18px rgba(0,0,0,.28);transition:bottom .25s,transform .15s}
.wt .wt-fab:hover{transform:scale(1.06)}
.wt .wt-fab:focus-visible{outline:3px solid rgba(37,211,102,.5);outline-offset:3px}
.wt .wt-fab svg{width:31px;height:31px}
.wt .wt-fab.is-up{bottom:calc(92px + env(safe-area-inset-bottom))}
@media (min-width:760px){.wt .wt-fab.is-up{bottom:calc(16px + env(safe-area-inset-bottom))}}

/* ── Barra fija móvil y pie ── */
.wt .wt-foot{padding:6px 0 110px;text-align:center}
.wt .wt-foot p{margin:8px 0 0;font-size:12.5px;color:#8A8C82}
@media (min-width:760px){.wt .wt-foot{padding-bottom:50px}.wt .wt-track>figure{flex-basis:78%}}
@media (prefers-reduced-motion:reduce){.wt .wt-meter-bar i,.wt .wt-dots button{transition:none}.wt .wt-meter-bar i::before{animation:none}}
`;
