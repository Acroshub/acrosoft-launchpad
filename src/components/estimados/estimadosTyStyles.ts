// CSS de la página /estimados-ty (el regalo: llamada de consultoría). A MANO (a diferencia de estimadosStyles.ts, que se genera del
// prototipo): solo agrega lo propio de esta página y se inyecta DESPUÉS de EST_CSS, reusando sus variables (--green, --orange, --head…).
// Todo va acotado a `.est-ty` y todas las clases llevan el prefijo `est-` (como en la landing, para no chocar con las globales).
//
// COMPACTA A PROPÓSITO: el video tiene que quedar en la primera pantalla sin hacer scroll (barra de ~90 px + regalo + título + caja + video 16:9).
// Si se agrega algo ARRIBA del video, volver a comprobar que su borde inferior sigue dentro de 360×560 y de 1366×600 (y ajustar la constante de
// `.est-ty-video`).
//
// El calendario de Acrosoft (CalendarRenderer) está hecho con Tailwind y NO debe quedar dentro de `.est-page`: ese contenedor da estilo
// a todos los <p>, <h2>… (mayúsculas, Barlow, márgenes) y deformaría el calendario. Por eso `.est-ty-calsec` es un bloque hermano que
// solo repite el fondo de la página.

export const EST_TY_CSS = `
.est-page.est-ty{min-height:0}
/* Columna a pantalla completa: el pie negro se pega al fondo aunque el contenido sea corto (estados sin compra / cargando / error). */
.est-ty-root{display:flex;flex-direction:column;min-height:100vh;min-height:100svh;background:#F9F8F5}
.est-ty-root>.est-ty-footwrap{margin-top:auto}

/* ── 1. Barra compacta de confirmación ── */
.est-ty .est-ty-bar{background:var(--green);color:#fff;padding:9px 0 10px}
.est-ty .est-ty-bar-head{display:flex;align-items:center;gap:9px}
.est-ty .est-ty-check{flex:none;width:26px;height:26px;border-radius:50%;background:#fff;color:var(--green);display:grid;place-items:center}
.est-ty .est-ty-check svg{width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:3.4;stroke-linecap:round;stroke-linejoin:round}
.est-ty .est-ty-bar-title{flex:1;min-width:0;font:800 clamp(21px,5.9vw,25px)/1 var(--head);letter-spacing:.02em;text-transform:uppercase;color:#fff}
.est-ty .est-ty-pct{flex:none;font:800 21px/1 var(--head);letter-spacing:.02em;color:#FFB27A}
.est-ty .est-ty-track{height:8px;margin-top:8px;border-radius:99px;background:rgba(255,255,255,.18);overflow:hidden}
.est-ty .est-ty-fill{height:100%;width:90%;border-radius:99px;background:linear-gradient(90deg,#FFB27A,var(--orange));animation:est-ty-fill 1.4s cubic-bezier(.22,.8,.3,1) both}
@keyframes est-ty-fill{from{width:0}to{width:90%}}
@media (prefers-reduced-motion:reduce){.est-ty .est-ty-fill{animation:none}}
.est-ty .est-ty-bar-sub{margin:5px 0 0;font-size:12.5px;line-height:1.35;color:#DCE8E0;overflow-wrap:anywhere}
.est-ty .est-ty-bar-sub b{color:#fff;font-weight:600}
/* Solo en teléfonos con la ventana muy baja (≤ 600 px de alto, p. ej. iPhone SE con las barras de Safari): se oculta esta línea para que el video
   siga entrando en la primera pantalla. Es redundante con el texto de bienvenida de abajo («recibirás tu kit en tu correo electrónico»). En el resto
   de pantallas se ve siempre. */
@media (max-height:600px) and (max-width:600px){.est-ty .est-ty-bar-sub{display:none}}

/* ── 2. Regalo 3D, título y caja de la llamada ── */
.est-ty .est-ty-gift{padding:16px 0 6px;text-align:center} /* 16 px de aire entre la barra de arriba y el billete (a pedido de Daniel); el espacio de abajo se recortó para que el video siga en la primera pantalla */
.est-ty .est-ty-gift3d{display:block;width:fit-content;margin:0 auto}
.est-ty .est-ty-gift3d img{display:block;height:54px;width:auto;filter:drop-shadow(0 6px 8px rgba(17,17,17,.22))}
/* Texto entre el billete y el título: la misma tipografía que «Valor normal» (est-ty-lbl: Inter 600, color de texto); solo cambia el tamaño, porque
   aquí es una frase y no una etiqueta de una línea. */
.est-ty .est-ty-intro{margin:8px 0;padding:0 6px;font:600 13px/1.32 var(--text);color:var(--body)} /* 8 px de aire con el billete (arriba) y con el título (abajo), a pedido de Daniel */
.est-ty .est-ty-gift h1{font-size:clamp(26px,7.4vw,40px);line-height:1.02}
.est-ty .est-ty-callbox{display:flex;align-items:center;gap:10px;margin:6px 0 0;padding:6px 12px;background:#fff;border:1px solid var(--line);border-radius:14px;text-align:left;box-shadow:0 4px 12px rgba(17,17,17,.05)}
.est-ty .est-ty-callico{flex:none;width:32px;height:32px;color:var(--green);display:grid;place-items:center}
.est-ty .est-ty-callico svg{width:32px;height:32px;stroke:currentColor;fill:none;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.est-ty .est-ty-callbox p{margin:0;font-size:14px;line-height:1.3;color:var(--body)}
.est-ty .est-ty-callbox p b{color:var(--ink);font-weight:700}

/* ── 3. Video ── */
.est-ty .est-ty-vid{padding:0}
/* En pantallas anchas pero bajas (portátiles) el video se achica para que su borde inferior quede dentro de la ventana: lo de arriba
   (barra + billete + texto + título + caja) ocupa ~340 px en escritorio, así que el alto del video es como mucho (alto de ventana - 358 px) y
   el ancho sale de 16:9. En teléfonos no cambia nada (ahí manda el 100 % del ancho). Nunca baja de 300 px. La segunda regla usa svh (alto
   estable con las barras del navegador). Si cambia lo de arriba del video, ajustar esta constante (se mide con la prueba de navegador). */
.est-ty .est-ty-video{position:relative;aspect-ratio:16/9;width:100%;margin:0 auto;border-radius:14px;overflow:hidden;background:#0F2A1C;box-shadow:0 10px 26px rgba(17,17,17,.18);
  max-width:min(100%,max(300px,calc((100vh - 358px) * 1.7778)));
  max-width:min(100%,max(300px,calc((100svh - 358px) * 1.7778)))}
.est-ty .est-ty-video iframe,.est-ty .est-ty-video video{position:absolute;inset:0;width:100%;height:100%;border:0;background:#000}
.est-ty .est-ty-video--empty{display:grid;place-items:center;text-align:center;padding:14px;border:2px dashed rgba(255,255,255,.35)}
.est-ty .est-ty-video--empty p{margin:0;font-size:13px;line-height:1.4;color:#DCE8E0}
.est-ty .est-ty-video--empty b{display:block;margin-bottom:4px;font:800 21px/1 var(--head);letter-spacing:.03em;text-transform:uppercase;color:#fff}

/* ── 4. Valor (UNA sola línea) y lista numerada ── */
.est-ty .est-ty-get{padding:14px 0 18px}
/* Todo en una fila y sin saltos de línea. Los tamaños escalan con el ancho de la pantalla (hasta un tope) para que entre en una línea desde
   320 px: medido en navegador, la fila ocupa ~95 % del ancho disponible en 320-412 px. Las dos etiquetas («Valor normal» y «Aquí y ahora»)
   usan EXACTAMENTE la misma tipografía (clase est-ty-lbl). */
.est-ty .est-ty-value{display:flex;flex-wrap:nowrap;align-items:center;justify-content:center;gap:min(1.1vw,8px);margin:0;white-space:nowrap;text-align:center}
.est-ty .est-ty-lbl{font:600 min(3.2vw,15px)/1 var(--text);color:var(--body)}
.est-ty .est-ty-old{font:800 min(5.35vw,24px)/1 var(--head);letter-spacing:.02em;color:#9A9C92;text-decoration:line-through;text-decoration-thickness:2.5px;text-decoration-color:var(--red)}
.est-ty .est-ty-arrow{flex:none;width:min(3.75vw,18px);height:min(3.75vw,18px);stroke:var(--orange);fill:none;stroke-width:2.8;stroke-linecap:round;stroke-linejoin:round}
.est-ty .est-ty-free{font:800 min(6.4vw,28px)/1 var(--head);letter-spacing:.03em;text-transform:uppercase;color:var(--green)}
.est-ty .est-ty-get h2{font-size:clamp(24px,6.4vw,30px);line-height:1;text-align:center;margin:24px 0 10px}
.est-ty .est-ty-list{list-style:none;margin:0;padding:0;counter-reset:est-n;background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden}
.est-ty .est-ty-list li{counter-increment:est-n;display:flex;gap:12px;align-items:flex-start;padding:12px 14px;font-size:15px;line-height:1.35;color:var(--body);border-top:1px solid var(--line)}
.est-ty .est-ty-list li:first-child{border-top:0}
.est-ty .est-ty-list li::before{content:counter(est-n);flex:none;display:grid;place-items:center;width:30px;height:30px;border-radius:9px;background:var(--orange);color:#fff;font:800 19px/1 var(--head);padding-top:1px;box-shadow:0 2px 0 var(--orange-dark)}
.est-ty .est-ty-list li b{color:var(--ink);font-weight:700}

/* ── 5. Calendario (directo, sin título propio: el calendario trae el suyo) ── */
.est-ty-calsec{background:#F9F8F5;padding:8px 20px 36px}
/* Resplandor naranja ESTÁTICO (sin animación) que señala dónde se agenda la llamada: aro fino + halo suave, del naranja de la marca (los
   números de la lista y el botón). Al reservar se pasa a la página final (/estimados-gracias), así que no hace falta apagarlo. */
.est-ty-cal{width:100%;max-width:460px;margin:0 auto;background:#fff;border:2px solid #EA5A0B;border-radius:18px;padding:19px 17px;
  box-shadow:0 0 0 4px rgba(234,90,11,.18),0 0 26px 5px rgba(234,90,11,.42),0 10px 28px rgba(17,17,17,.08)}
.est-ty-calmsg{width:100%;max-width:460px;margin:0 auto;text-align:center;background:#fff;border:1px dashed #E6E1D4;border-radius:18px;padding:26px 18px;color:#55584F;font:400 15px/1.5 'Inter',system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif}
.est-ty-calmsg b{display:block;margin-bottom:4px;font:800 22px/1 'Barlow Condensed','Arial Narrow',Arial,sans-serif;letter-spacing:.03em;text-transform:uppercase;color:#111}

/* ── 6. Pie de soporte (fondo negro, estilo oscuro) ── */
.est-ty .est-ty-foot{background:#0B0B0B;padding:26px 0 32px;text-align:center}
.est-ty .est-ty-foot-title{margin:0 0 12px;font:700 13px/1.2 var(--text);letter-spacing:.1em;text-transform:uppercase;color:#9A9A9A}
.est-ty .est-ty-foot-links{display:flex;flex-wrap:wrap;justify-content:center;gap:8px 10px}
.est-ty .est-ty-foot-link{display:inline-flex;align-items:center;gap:8px;padding:10px 15px;background:#181818;border:1px solid #303030;border-radius:99px;color:#F2F2F2;font:600 14px/1.2 var(--text);text-decoration:none;overflow-wrap:anywhere}
.est-ty .est-ty-foot-link:hover{border-color:#6FD09A;color:#fff;background:#202020}
.est-ty .est-ty-foot-link svg{flex:none;width:18px;height:18px;stroke:#6FD09A;fill:none;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}

/* ── Estados (cargando / sin compra / error) ── */
.est-ty .est-ty-state{padding:72px 0;text-align:center}
.est-ty .est-ty-state h2{font-size:clamp(30px,8vw,40px)}
.est-ty .est-ty-state p{color:var(--body)}
.est-ty button.est-btn{border:0;cursor:pointer;font-family:var(--head)}
.est-ty .est-ty-spin{display:block;width:34px;height:34px;margin:0 auto 14px;border-radius:50%;border:4px solid var(--green-soft);border-top-color:var(--green);animation:est-ty-spin .9s linear infinite}
@keyframes est-ty-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.est-ty .est-ty-spin{animation-duration:2.4s}}
`;
