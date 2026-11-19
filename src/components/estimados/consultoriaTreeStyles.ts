// CSS EXTRA de la landing /consultoria-mkt-tree. Se inyecta DESPUÉS de EST_CSS (landing del kit), EST_CSS_EXTRA y EST_TY_CSS (upsell del calendario)
// y reusa sus variables (--green, --orange, --head…) y sus clases (est-hero, est-nots, est-offer-card, est-items, est-guar, est-faq, est-btn,
// est-ty-video, est-ty-list, est-ty-calsec…). Aquí solo va lo propio de esta página, todo con prefijo `ct-` y dentro de `.est-page.ct`.
//
// El calendario (CalendarRenderer, de Tailwind) va FUERA de `.est-page` por la misma razón que en /estimados-ty: sus <p>, <h2>… se deformarían.

export const CT_CSS = `
.est-page.ct{min-height:0}
/* Seguro contra el scroll horizontal: si algún día algo se pasa unos píxeles del ancho (otra tipografía en Safari, barra de scroll de escritorio), se recorta en vez de mover la página.
   «hidden» primero para navegadores viejos y «clip» después (no crea contenedor de scroll, así que no afecta a las barras fijas). */
.est-ty-root{overflow-x:hidden;overflow-x:clip}

/* ── Franja superior (avatares + estrellas + texto propio; el resto del estilo es el .est-top-proof del kit) ──
   El texto va SIEMPRE en 2 líneas (cada una en un span sin saltos) y todo escala con el ancho de la pantalla para que entre desde 320 px. */
.ct .ct-proof{padding:8px 12px}
.ct .ct-proof-in{display:flex;align-items:center;justify-content:center;gap:clamp(6px,2vw,14px);max-width:560px;margin:0 auto}
/* Más específico que «.est-page .est-top-proof img» del kit (width:100%), que si no estira los avatares. */
.est-page.ct .ct-proof .ct-proof-av{display:block;height:clamp(27px,8.8vw,52px);width:auto;max-width:none;margin:0;flex:none}
.ct .ct-proof-txt{min-width:0;text-align:left;color:#EDEFEA}
.ct .ct-proof-stars{display:block;width:clamp(60px,18.5vw,104px);height:auto;aspect-ratio:5/1;fill:#fff;margin-bottom:2px}
.ct .ct-proof-txt p{margin:0;font:400 clamp(9.2px,2.88vw,15.5px)/1.22 var(--text)}
.ct .ct-proof-txt p span{display:block;white-space:nowrap}
.ct .ct-proof-txt b{color:#fff;font-weight:700}

/* ── Hero ── */
.ct .ct-hero{padding:14px 0 30px}
/* La bandera va EN LÍNEA con el texto (no en flex): si el texto baja a dos líneas, la bandera queda pegada al inicio de la primera y no sola a un lado. */
.ct .ct-flag{display:inline-block;width:17px;height:12px;margin-right:6px;vertical-align:-1px}
.ct .ct-hero h1{font-size:clamp(29px,8.4vw,50px);line-height:.98}
/* Eyebrow de una línea en casi todos los celulares (para ganar altura y que el VSL entre en la primera pantalla); si no cabe, baja a dos en vez de desbordar. */
.ct .ct-hero .ct-eyebrow{font-size:clamp(9.4px,2.7vw,12.5px);line-height:1.2;letter-spacing:.05em;margin-bottom:8px}
/* Los 3 datos bajo el botón (gratis · Zoom/Meet/WhatsApp · 30 min) siempre en una sola fila, aun en pantallas chicas */
.ct .est-trust{flex-wrap:wrap;max-width:100%;gap:6px clamp(8px,2.4vw,16px);font-size:clamp(11px,3.1vw,13.5px)}
.ct .est-trust li{white-space:nowrap;min-width:0;gap:clamp(3px,1vw,6px)}
.ct .est-trust .est-ic{width:clamp(12px,3.4vw,16px);height:clamp(12px,3.4vw,16px)}
/* El VSL: en este hero va mucho más abajo que en /estimados-ty, así que se quita el tope por altura de ventana que allí lo mantenía en la primera pantalla. */
.ct .ct-vid{padding:0 0 4px}
.ct .ct-vid .est-ty-video{max-width:100%;box-shadow:0 18px 40px rgba(17,17,17,.24);border:3px solid var(--green)}
/* En escritorio el VSL se achica lo justo para que su borde inferior quede dentro de la ventana (lo de arriba mide ~450 px); en celular manda el ancho. */
@media (min-width:760px){.ct .ct-vid .est-ty-video{max-width:min(100%,max(320px,calc((100vh - 470px) * 1.7778)));max-width:min(100%,max(320px,calc((100svh - 470px) * 1.7778)))}}

/* ── Sellos de Meta y Google (entre el hero y «¿Por qué las agencias…?») ── */
.ct .ct-badges{padding:4px 0 26px}
.ct .ct-badges ul{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.ct .ct-badges li{display:flex;align-items:center;justify-content:center;gap:9px;min-width:0;background:#fff;border:1px solid var(--line);border-radius:14px;padding:10px 8px;box-shadow:0 4px 12px rgba(17,17,17,.04);font:500 clamp(12px,3.4vw,14.5px)/1.2 var(--text);color:var(--body)}
.ct .ct-badges li b{color:var(--ink);font-weight:700}
.ct .ct-badges li span{min-width:0}
.ct .ct-badge-logo{flex:none;width:clamp(28px,8.4vw,36px);height:auto;display:block}
.ct .ct-badge-logo--g{width:clamp(21px,6vw,26px)}

/* ── Logo de Acros Software + «Expertos en…» (arriba de los sellos) ── */
.ct .ct-by{text-align:center;margin:0 0 14px}
.ct .ct-by p{margin:6px 0 0;font:600 clamp(12px,3.5vw,14.5px)/1.3 var(--text);letter-spacing:.02em;color:var(--body)}

/* ── ¿Por qué las agencias…? Carrusel de tarjetas lado a lado ──
   Se asoma un poco la tarjeta siguiente (cada una mide ~82 % del ancho) y los puntos de abajo marcan en cuál estás. El margen negativo
   deja que el carrusel llegue hasta el borde de la pantalla (el .est-wrap tiene 20 px de aire). */
.ct .ct-carousel{margin:16px -20px 0}
.ct .ct-track{position:relative;display:flex;gap:12px;overflow-x:auto;overscroll-behavior-x:contain;scroll-snap-type:x mandatory;scroll-padding-left:20px;
  padding:4px 20px 6px;scrollbar-width:none;-webkit-overflow-scrolling:touch;outline-offset:-2px}
.ct .ct-track::-webkit-scrollbar{display:none}
.ct .ct-card{flex:0 0 min(82%,400px);scroll-snap-align:start;margin:0}
.ct .ct-card p{font-size:15px}
.ct .ct-dots{display:flex;justify-content:center;gap:8px;padding:8px 0 0}
.ct .ct-dots button{width:9px;height:9px;padding:0;border:0;border-radius:99px;background:#D3CDBC;cursor:pointer;transition:width .2s,background .2s}
.ct .ct-dots button.is-on{width:24px;background:var(--orange)}
@media (prefers-reduced-motion:reduce){.ct .ct-dots button{transition:none}}

/* ── Sistema: 4 pasos cortos unidos por flechas punteadas (tarjeta de oferta) ── */
.ct .ct-puzzle{display:block;width:76px;height:76px;margin:4px auto 8px}
.ct .ct-how-intro{margin:0 0 14px;text-align:center;font-size:17px;line-height:1.35;color:var(--body)}
.ct .ct-how-intro b{color:var(--ink)}
.ct .ct-how{list-style:none;margin:0;padding:0}
.ct .ct-how li{position:relative;display:flex;gap:13px;align-items:center;background:var(--bg);border:1px solid var(--line);border-radius:14px;padding:13px 14px}
.ct .ct-how li+li{margin-top:34px}
.ct .ct-how-n{flex:none;width:36px;height:36px;border-radius:50%;background:var(--green);color:#fff;display:grid;place-items:center;font:800 22px/1 var(--head);padding-top:1px}
.ct .ct-how li>div{min-width:0}
.ct .ct-how h3{font-size:21px;line-height:1.05;margin:0 0 3px}
.ct .ct-how p{margin:0;font-size:14.5px;line-height:1.4;color:var(--body)}
.ct .ct-how li:not(:last-child)::after{content:"";position:absolute;left:30px;top:100%;height:21px;border-left:3px dotted var(--orange)}
.ct .ct-how li:not(:last-child)::before{content:"";position:absolute;left:26px;top:calc(100% + 16px);width:11px;height:11px;border-right:3px solid var(--orange);border-bottom:3px solid var(--orange);transform:rotate(45deg);border-radius:0 0 2px 0}

/* ── Qué te llevas / cómo funciona: pasos unidos por flechas de línea punteada ── */
.ct .ct-sec-head{text-align:center}
.ct .ct-flow{list-style:none;margin:18px 0 0;padding:0}
.ct .ct-flow li{position:relative;display:flex;gap:12px;align-items:flex-start;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:13px 14px;font-size:15px;line-height:1.4;color:var(--body)}
.ct .ct-flow li+li{margin-top:36px}
.ct .ct-flow li b{color:var(--ink);font-weight:700}
.ct .ct-flow .ct-n{flex:none;display:grid;place-items:center;width:30px;height:30px;border-radius:9px;background:var(--orange);color:#fff;font:800 19px/1 var(--head);padding-top:1px;box-shadow:0 2px 0 var(--orange-dark)}
/* La línea punteada baja desde el centro del número hasta la punta de flecha, que apunta a la tarjeta siguiente. */
.ct .ct-flow li:not(:last-child)::after{content:"";position:absolute;left:27px;top:100%;height:23px;border-left:3px dotted var(--orange)}
.ct .ct-flow li:not(:last-child)::before{content:"";position:absolute;left:23px;top:calc(100% + 18px);width:11px;height:11px;border-right:3px solid var(--orange);border-bottom:3px solid var(--orange);transform:rotate(45deg);border-radius:0 0 2px 0}

/* ── Confirmación al agendar (reemplaza el calendario) ── */
.ct-done{width:100%;max-width:460px;margin:0 auto;background:#fff;border:2px solid #1F4D36;border-radius:18px;padding:24px 20px 22px;text-align:center;
  box-shadow:0 0 0 4px rgba(31,77,54,.12),0 10px 28px rgba(17,17,17,.08);font:400 16px/1.5 'Inter',system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#55584F}
.ct-done-ring{display:block;width:60px;height:60px;margin:0 auto 12px}
.ct-done-ring svg{display:block;width:100%;height:100%}
.ct-ring-bg{fill:#FFF3EA;stroke:#F1D9C8;stroke-width:5}
.ct-ring-fg{fill:none;stroke:#EA5A0B;stroke-width:5;stroke-linecap:round}
.ct-ring-clock{fill:none;stroke:#EA5A0B;stroke-width:3.4;stroke-linecap:round;stroke-linejoin:round}
.ct-prog{margin:12px 0 4px}
.ct-prog-track{position:relative;height:14px;border-radius:999px;background:#EFE9DA;overflow:hidden;box-shadow:inset 0 1px 2px rgba(17,17,17,.12)}
.ct-prog-track i{position:absolute;left:0;top:0;bottom:0;width:90%;border-radius:999px;
  background:repeating-linear-gradient(135deg,#EA5A0B 0 12px,#F27A3A 12px 24px);background-size:34px 34px;
  animation:ct-prog-grow 1.3s cubic-bezier(.22,.8,.3,1) both,ct-prog-move 1.1s linear infinite}
@keyframes ct-prog-grow{from{width:0}to{width:90%}}
@keyframes ct-prog-move{from{background-position:0 0}to{background-position:34px 0}}
@media (prefers-reduced-motion:reduce){.ct-prog-track i{animation:none}}
.ct-done h2{margin:0 0 6px;font:800 clamp(30px,8.4vw,38px)/1 'Barlow Condensed','Arial Narrow',Arial,sans-serif;letter-spacing:.02em;text-transform:uppercase;color:#111}
.ct-done-when{margin:14px 0;padding:13px 10px;background:#F3F9F5;border:1px solid #BBD6C5;border-radius:14px}
.ct-done-when span{display:block}
.ct-done-day{font:800 26px/1.05 'Barlow Condensed','Arial Narrow',Arial,sans-serif;letter-spacing:.02em;text-transform:uppercase;color:#111}
.ct-done-time{margin-top:2px;font:800 34px/1 'Barlow Condensed','Arial Narrow',Arial,sans-serif;color:#1F4D36}
.ct-done-tz{margin-top:3px;font-size:13px;color:#6D7066}
.ct-done p{margin:0 0 10px}
.ct-done b{color:#111}
.ct-done ul{margin:12px 0 0;padding:12px 0 0;border-top:1px solid #E6E1D4;list-style:none;text-align:left;display:grid;gap:8px;font-size:14.5px;line-height:1.35}
.ct-done li{position:relative;padding-left:22px}
.ct-done li:before{content:"";position:absolute;left:3px;top:.45em;width:8px;height:8px;border-radius:50%;background:#EA5A0B}

/* ── Lista «Sin…» del hero (objeciones de agencias tradicionales) ── */
.ct .ct-sin{list-style:none;margin:10px auto 12px;padding:10px 12px;max-width:460px;display:grid;gap:7px;text-align:left;background:#fff;border:1px solid var(--line);border-radius:14px;box-shadow:0 5px 14px rgba(17,17,17,.05)}
.ct .ct-sin li{display:flex;gap:8px;align-items:flex-start;font:600 clamp(13px,3.7vw,15px)/1.28 var(--text);color:var(--ink)}
.ct .ct-sin li .est-ic{flex:none;width:18px;height:18px;margin-top:0;color:var(--green);stroke-width:3}

/* ── Popup del calendario (en un portal: fuera de .est-page, por eso sin variables ni scope .ct) ── */
.ct-pop-head{padding:22px 20px 4px;text-align:center}
.ct-pop-title{margin:0 28px 6px;font:800 clamp(30px,8.4vw,38px)/1 'Barlow Condensed','Arial Narrow',Arial,sans-serif!important;letter-spacing:.02em!important;text-transform:uppercase;color:#111}
.ct-pop-sub{margin:0;font:400 15px/1.4 'Inter',system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#55584F}
.ct-pills{display:flex;flex-wrap:nowrap;justify-content:center;gap:5px;margin:12px 0 0;padding:0;list-style:none}
.ct-pills li{background:#fff;border:1px solid #E6E1D4;border-radius:99px;padding:6px clamp(7px,2.4vw,11px);font:600 clamp(10.5px,3.1vw,12.5px)/1 'Inter',system-ui,sans-serif;color:#111;white-space:nowrap}
.ct-pop-body{padding:12px 14px 16px}
.ct-pop-cal{width:100%;background:#fff;border:1px solid #E6E1D4;border-radius:16px;padding:16px 15px;box-shadow:0 6px 18px rgba(17,17,17,.06)}
.ct-pop-body .est-ty-calmsg{margin-top:8px}
.ct-wa{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;margin:6px 0 4px;padding:14px 12px;border-radius:12px;background:#1DA851;color:#fff;text-decoration:none;box-shadow:0 3px 0 #11713A;font:800 21px/1.05 'Barlow Condensed','Arial Narrow',Arial,sans-serif;letter-spacing:.04em;text-transform:uppercase}
.ct-wa:hover{transform:translateY(2px);box-shadow:0 1px 0 #11713A}
.ct-wa:focus-visible{outline:3px solid #111;outline-offset:2px}
.ct-wa-ic{width:26px;height:26px;flex:none}
.ct-done-close{margin-top:14px;width:100%;padding:12px;border:0;border-radius:12px;background:#EA5A0B;color:#fff;box-shadow:0 3px 0 #B84405;cursor:pointer;font:800 20px/1 'Barlow Condensed','Arial Narrow',Arial,sans-serif;letter-spacing:.04em;text-transform:uppercase}
.ct-done-close:hover{transform:translateY(2px);box-shadow:0 1px 0 #B84405}
.ct-pop-body .ct-done{box-shadow:none;border-width:1px}

/* ── Cierre ── */
.ct .ct-final{padding:46px 0 120px}
.ct .ct-final h2{font-size:clamp(36px,10vw,50px)}
.ct .ct-final .est-checks{margin:10px 0 6px}
/* Botones: «AGENDA GRATIS AHORA» y, dentro del mismo botón y debajo (más chico), «Consultoría gratis + Website de Regalo» */
.ct .est-btn{padding:13px 20px}
.ct .ct-btn-txt{display:block;min-width:0;text-align:center}
/* Ícono y texto principal en la MISMA línea (antes el ícono quedaba centrado contra las dos líneas del botón y se veía bajo/descuadrado) */
.ct .ct-btn-main{display:inline-flex;align-items:center;justify-content:center;gap:9px}
.ct .ct-btn-main .est-ic{width:.95em;height:.95em;flex:none;margin-top:-.08em}
/* «Website de Regalo» subrayado SOLO dentro del botón (línea blanca sobre el naranja) */
.ct .est-btn .ct-gift{text-decoration:underline;font-weight:800;text-decoration-skip-ink:none;text-decoration-color:#fff;text-decoration-thickness:2px;text-underline-offset:2px}
.ct .est-trust{margin-top:14px}
.ct .ct-btn-txt small{display:block;margin-top:4px;font:600 clamp(11.5px,3.3vw,14px)/1.2 var(--text);letter-spacing:0;text-transform:none;opacity:.95;text-wrap:balance}
/* Barra fija móvil: el mismo botón, más compacto */
.ct .est-sticky .est-btn{width:100%;padding:9px 14px}
.ct .est-sticky .ct-btn-txt small{margin-top:3px;font-size:clamp(10.5px,3vw,12px)}
@media (min-width:760px){.ct .ct-final{padding:50px 0 64px}}
`;
