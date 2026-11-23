// CSS de la versión gamificada /website-tree-game. Se inyecta DESPUÉS de WT_CSS (que trae el formulario, la barra de cupos, la tarjeta «¿Por qué gratis?» y la paleta verde bosque + rojo cereza)
// y solo agrega lo propio del juego, con prefijo `wtg-` y dentro de `.wtg`: pantallas a pantalla completa, mini-quiz, mapa de pasos con candados y barra de progreso superior.

export const WTG_CSS = `
/* Paleta: la misma de /website-tree (WT_CSS). Los botones son SIEMPRE rojos; el verde bosque solo resalta iconos, bordes y detalles (nunca rellena secciones, botones ni opciones marcadas). */
/* Barra de avance fija arriba: cuánto del recorrido lleva la persona. */
.wtg .wtg-top{position:fixed;left:0;right:0;top:0;height:5px;background:rgba(23,63,39,.14);z-index:30}
.wtg .wtg-top i{display:block;height:100%;width:0;background:var(--orange);border-radius:0 4px 4px 0;transition:width .5s cubic-bezier(.25,.46,.45,.94)}

.wtg .wtg-fade{transition:opacity .38s ease}
.wtg .wtg-fade.is-out{opacity:0}

.wtg .wtg-screen{min-height:100vh;min-height:100svh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:64px 20px 48px;position:relative;overflow:hidden}
.wtg .wtg-screen.is-end{justify-content:flex-start;padding-top:44px}
.wtg .wtg-screen.is-hero{justify-content:flex-start;padding:14px 0 30px}
.wtg .wtg-in{width:100%;max-width:480px;position:relative;z-index:1}
.wtg .wtg-center{text-align:center}

.wtg h1.wtg-h1,.wtg h2.wtg-h2{font-family:var(--head);font-weight:800;text-transform:uppercase;letter-spacing:.015em;margin:0}
.wtg h2.wtg-h2{font-size:clamp(32px,9.4vw,44px);line-height:1.02;color:var(--ink)}
.wtg .wtg-hl{color:var(--hl)}
.wtg .wtg-p{margin:0 0 14px;font:400 16.5px/1.55 var(--text);color:var(--body)}
.wtg .wtg-p b{color:var(--ink)}
.wtg .wtg-note{margin:0 0 6px;font:500 14px/1.4 var(--text);color:#7A7C72}

/* Botón grande de avance (rojo cereza, 3D como el resto de la landing). */
.wtg .wtg-btn{display:block;width:100%;border:0;cursor:pointer;background:var(--orange);color:#fff;border-radius:16px;padding:16px 20px;text-align:center;font:800 clamp(21px,5.8vw,26px)/1.05 var(--head);letter-spacing:.03em;text-transform:uppercase;box-shadow:0 5px 0 var(--orange-dark),0 12px 26px rgba(209,56,43,.25);transition:transform .15s ease,box-shadow .15s ease}
.wtg .wtg-btn:hover{transform:translateY(2px);box-shadow:0 3px 0 var(--orange-dark),0 8px 18px rgba(209,56,43,.22)}
.wtg .wtg-btn:active{transform:translateY(5px);box-shadow:0 0 0 var(--orange-dark)}
.wtg .wtg-btn small{display:block;margin-top:5px;font:500 12.5px/1.2 var(--text);letter-spacing:0;text-transform:none;opacity:.86}
.wtg .wtg-btn.is-flex{display:flex;align-items:center;justify-content:center;gap:12px}

/* Pantalla 1: mini-quiz con opciones que se marcan y barra de «urgencia». */
.wtg .wtg-ico{display:grid;place-items:center;width:58px;height:58px;margin:0 0 14px;border-radius:18px;background:var(--green-soft);color:var(--green);border:2px solid var(--green)}
.wtg .wtg-opts{display:grid;gap:10px;margin:0 0 22px}
.wtg .wtg-opt{display:flex;align-items:center;gap:12px;width:100%;text-align:left;cursor:pointer;background:#fff;border:2px solid var(--line);border-radius:14px;padding:14px 16px;font:600 15.5px/1.3 var(--text);color:var(--ink);transition:background .15s,border-color .15s,color .15s}
.wtg .wtg-opt:hover{border-color:rgba(31,81,48,.4)}
.wtg .wtg-opt i{flex:none;width:22px;height:22px;border-radius:50%;border:2px solid #C9D3C2;display:grid;place-items:center;color:#fff}
.wtg .wtg-opt i svg{width:12px;height:12px;stroke:currentColor;stroke-width:3.4;fill:none;stroke-linecap:round;stroke-linejoin:round;opacity:0}
.wtg .wtg-opt.is-on{background:var(--green-soft);border-color:var(--green)}
.wtg .wtg-opt.is-on i{background:var(--green);border-color:var(--green)}
.wtg .wtg-opt.is-on i svg{opacity:1}

/* Pantalla 3: la pregunta sola, grande, y el botón circular de siguiente. */
.wtg h2.wtg-big{font-size:clamp(36px,11vw,54px);line-height:1}
.wtg .wtg-round{display:grid;place-items:center;width:68px;height:68px;margin:30px auto 0;padding:0;border:0;border-radius:50%;cursor:pointer;background:var(--orange);color:#fff;box-shadow:0 5px 0 var(--orange-dark),0 12px 26px rgba(209,56,43,.25);transition:transform .15s ease,box-shadow .15s ease}
.wtg .wtg-round:hover{transform:translateY(2px);box-shadow:0 3px 0 var(--orange-dark),0 8px 18px rgba(209,56,43,.22)}
.wtg .wtg-round:active{transform:translateY(5px);box-shadow:0 0 0 var(--orange-dark)}
.wtg .wtg-round svg{animation:wtg-nudge 1.4s ease-in-out infinite}
@keyframes wtg-nudge{0%,100%{transform:translateX(0)}50%{transform:translateX(4px)}}

/* Pantalla 4: texto de «por qué es gratis» con icono animado de crecimiento (barras que suben y flecha que se dibuja) y badges. */
.wtg .wtg-grow{display:block;width:112px;height:112px;margin:0 auto 16px;overflow:visible}
.wtg .wtg-grow-base{fill:var(--line)}
.wtg .wtg-grow-bar{fill:var(--green);transform-box:fill-box;transform-origin:50% 100%;transform:scaleY(0)}
.wtg .wtg-grow-bar.b1{animation:wtg-b1 4.2s cubic-bezier(.3,.7,.3,1) infinite}
.wtg .wtg-grow-bar.b2{animation:wtg-b2 4.2s cubic-bezier(.3,.7,.3,1) infinite}
.wtg .wtg-grow-bar.b3{animation:wtg-b3 4.2s cubic-bezier(.3,.7,.3,1) infinite}
.wtg .wtg-grow-bar.b4{animation:wtg-b4 4.2s cubic-bezier(.3,.7,.3,1) infinite}
.wtg .wtg-grow-line,.wtg .wtg-grow-head{fill:none;stroke:var(--orange);stroke-width:5;stroke-linecap:round;stroke-linejoin:round}
.wtg .wtg-grow-line{stroke-dasharray:100;stroke-dashoffset:100;animation:wtg-draw 4.2s ease-in-out infinite}
.wtg .wtg-grow-head{opacity:0;animation:wtg-head 4.2s ease-in-out infinite}
/* Secuencia sin que nada se cruce: 1) suben las barras de una en una, 2) después se dibuja la flecha por encima de ellas, 3) se queda un momento y 4) todo se desvanece y vuelve a empezar. */
@keyframes wtg-b1{0%{transform:scaleY(0);opacity:1}14%,86%{transform:scaleY(1);opacity:1}96%,100%{transform:scaleY(1);opacity:0}}
@keyframes wtg-b2{0%,4%{transform:scaleY(0);opacity:1}18%,86%{transform:scaleY(1);opacity:1}96%,100%{transform:scaleY(1);opacity:0}}
@keyframes wtg-b3{0%,8%{transform:scaleY(0);opacity:1}22%,86%{transform:scaleY(1);opacity:1}96%,100%{transform:scaleY(1);opacity:0}}
@keyframes wtg-b4{0%,12%{transform:scaleY(0);opacity:1}26%,86%{transform:scaleY(1);opacity:1}96%,100%{transform:scaleY(1);opacity:0}}
@keyframes wtg-draw{0%,30%{stroke-dashoffset:100;opacity:1}56%,86%{stroke-dashoffset:0;opacity:1}96%,100%{stroke-dashoffset:0;opacity:0}}
@keyframes wtg-head{0%,54%{opacity:0}60%,86%{opacity:1}96%,100%{opacity:0}}
.wtg .wtg-why-text{margin:0 0 20px;font:600 clamp(17px,4.8vw,19.5px)/1.5 var(--text);color:var(--body)}
.wtg .wtg-why-text u{text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:3px}
.wtg .wtg-in>.wt-badges{margin:0 0 22px}

/* Pantalla 5: «Qué incluye» directo, una lista de una columna con un icono por punto (sin ejemplos ni título de ejemplos). */
.wtg h2.wtg-h2--sm{font-size:clamp(28px,8vw,34px);line-height:1.02;text-align:center;margin:0 0 18px}
.wtg .wtg-inc{display:flex;flex-direction:column;gap:0;margin:0 0 26px;padding:0;list-style:none}
.wtg .wtg-inc li{display:flex;align-items:center;gap:14px;padding:14px 2px;border-bottom:1px solid var(--line)}
.wtg .wtg-inc li:last-child{border-bottom:0}
.wtg .wtg-inc-ico{flex:none;display:grid;place-items:center;width:28px;height:28px;color:var(--green)}
.wtg .wtg-inc-txt{font:500 17px/1.35 var(--text);color:var(--body)}
.wtg .wtg-inc-txt b{color:var(--ink);font-weight:700}

/* Pantalla 6: el formulario (partes 1 y 2) en la misma página, sin popup. Aquí SÍ puede haber scroll: la parte 2 es larga. */
.wtg .wtg-screen.is-form{justify-content:flex-start;padding:34px 16px 40px}
.wtg .wtg-screen.is-form .wtg-in{max-width:500px}
.wtg .wt-intro h3{margin:0}
/* Indicador de 3 pasos: etiquetas cortas, en una sola línea y sin rozar los bordes de la tarjeta, aun a 360 px. */
.wtg .wt-steps{gap:6px;flex-wrap:nowrap}
.wtg .wt-steps li{gap:5px;font-size:12px;white-space:nowrap}
.wtg .wt-steps li+li::before{width:14px;margin-right:0}
.wtg .wtg-ask-wa{margin:16px 0 0;text-align:center;font:500 13.5px/1.4 var(--text);color:#7A7C72}
.wtg .wtg-ask-wa a{color:var(--green);font-weight:700;text-decoration:underline;text-underline-offset:3px}



/* Las pantallas 0 a 4 caben en una sola vista, sin scroll vertical, aun en celulares chicos (640 px de alto) y en laptops (720 px): al bajar el alto disponible se compactan espacios y tamaños. La pantalla 5 (final) es larga a propósito. */
@media (max-height:780px){
.wtg .wtg-ico{width:48px;height:48px;margin-bottom:10px;border-radius:15px}
.wtg .wtg-ico svg{width:26px;height:26px}
.wtg .wtg-screen{padding:34px 20px 20px}
.wtg .wtg-screen.is-hero{padding:8px 0 16px}
.wtg .wt-hero{padding:8px 0 4px}
.wtg .wt-hero-pic img{max-height:31svh;object-fit:cover;object-position:50% 30%}
.wtg h2.wtg-h2{font-size:clamp(26px,7.6vw,36px)}
.wtg .wtg-opts{gap:7px;margin-bottom:14px}
.wtg .wtg-opt{padding:10px 14px;font-size:14.5px}
.wtg .wtg-btn{padding:12px 16px}
.wtg .wtg-inc{margin-bottom:18px}
.wtg .wtg-inc li{padding:11px 2px}
.wtg h2.wtg-h2--sm{margin-bottom:12px}
.wtg .wtg-grow{width:88px;height:88px;margin-bottom:10px}
.wtg .wtg-round{width:60px;height:60px;margin-top:20px}
.wtg .wtg-why-text{margin-bottom:14px}
}
@media (max-height:700px){
.wtg h2.wtg-h2--sm{font-size:clamp(24px,7vw,28px);margin-bottom:10px}
.wtg .wtg-inc{margin-bottom:14px}
.wtg .wtg-inc li{padding:9px 2px}
.wtg .wtg-inc-txt{font-size:15.5px;line-height:1.3}
.wtg .wtg-grow{width:72px;height:72px}
.wtg .wtg-why-text{font-size:15.5px;line-height:1.45}
.wtg h2.wtg-big{font-size:clamp(30px,9.4vw,40px)}
.wtg .wtg-screen{padding:28px 20px 16px}
.wtg h2.wtg-h2{font-size:clamp(24px,7vw,32px)}
.wtg .est-hero h1{font-size:clamp(30px,8.4vw,38px);line-height:1}
.wtg .est-eyebrow{margin-bottom:6px}
.wtg .wt-hero-pic img{max-height:27svh}
.wtg .wtg-opt{padding:8px 12px;font-size:14px}
.wtg .wtg-p{font-size:15px;margin-bottom:10px}
}

@media (prefers-reduced-motion:reduce){.wtg .wtg-fade,.wtg .wtg-top i,`;
