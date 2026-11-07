// CSS de la página FINAL del embudo, /estimados-gracias (después de agendar la llamada). A MANO, se inyecta después de EST_CSS + EST_TY_CSS y reusa su barra
// compacta (.est-ty-bar…), sus variables y el pie oscuro (.est-ty-foot…). Todo acotado a `.est-end` (salvo el número de sección, que también aparece en el pie)
// y con el prefijo `est-` en todas las clases.

export const EST_END_CSS = `
/* ── Barra: la del 90 % de la página anterior, ahora sube hasta el 100 % ── */
.est-end .est-ty-fill{width:100%;animation:est-end-fill 1.2s cubic-bezier(.22,.8,.3,1) .15s both}
@keyframes est-end-fill{from{width:90%}to{width:100%}}
@media (prefers-reduced-motion:reduce){.est-end .est-ty-fill{animation:none}}
.est-end .est-ty-pct{color:#fff}

/* ── Título ── */
.est-end .est-end-hero{padding:20px 0 6px;text-align:center}
.est-end .est-end-hero h1{font-size:clamp(28px,7.8vw,42px);line-height:1.02}
.est-end .est-end-sub{margin:10px 0 0;font-size:15.5px;line-height:1.4;color:var(--body)}

/* ── Secciones 1 y 2 (tarjetas) ── */
.est-end .est-end-sec{padding:4px 0 30px}
.est-end .est-end-card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px 16px 15px;margin-top:14px}
.est-end .est-end-card h2{display:flex;align-items:center;gap:10px;font-size:clamp(22px,6vw,27px);line-height:1.05;margin:0 0 12px;text-align:left}
/* Número de sección: cuadro naranja de bordes redondeados (el mismo estilo de la lista de la página anterior). También se usa en el pie oscuro. */
.est-page .est-end-num{flex:none;display:inline-grid;place-items:center;width:30px;height:30px;border-radius:9px;background:var(--orange);color:#fff;font:800 19px/1 var(--head);letter-spacing:0;padding-top:1px;box-shadow:0 2px 0 var(--orange-dark)}
.est-page .est-end-num--dark{width:22px;height:22px;border-radius:7px;font-size:14px;margin-right:8px;vertical-align:middle;box-shadow:none}

/* Pasos para descargar el kit */
.est-end .est-end-steps{list-style:none;margin:0;padding:0;counter-reset:est-s;display:grid;gap:11px}
.est-end .est-end-steps li{counter-increment:est-s;display:flex;gap:10px;align-items:flex-start;font-size:15px;line-height:1.4;color:var(--body)}
.est-end .est-end-steps li::before{content:counter(est-s);flex:none;display:grid;place-items:center;width:22px;height:22px;border-radius:7px;background:var(--green-soft);color:var(--green);font:800 14px/1 var(--head);margin-top:1px}
.est-end .est-end-steps b{color:var(--ink);font-weight:700}

/* Resumen de la cita */
.est-end .est-end-when{display:grid;gap:3px;justify-items:center;text-align:center;background:var(--green-soft);border-radius:14px;padding:14px 12px}
.est-end .est-end-day{font:800 clamp(24px,6.6vw,30px)/1.05 var(--head);letter-spacing:.02em;text-transform:uppercase;color:var(--ink)}
.est-end .est-end-time{font:800 clamp(36px,10vw,46px)/1 var(--head);letter-spacing:.02em;color:var(--green)}
.est-end .est-end-tz{font-size:13px;line-height:1.3;color:var(--body)}
.est-end .est-end-note{margin:12px 0 0;font-size:15px;line-height:1.45;color:var(--body)}
.est-end .est-end-note b{color:var(--ink)}
.est-end .est-end-empty{margin:0 0 12px;font-size:15px;line-height:1.45;color:var(--body)}

/* ── Confeti: una sola caída (~4 s) cuando la barra llega al 100 %; sin movimiento si la persona lo pidió así ── */
.est-end .est-end-confetti{position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:60}
.est-end .est-end-confetti i{position:absolute;top:-18px;left:var(--x);width:var(--w);height:calc(var(--w) * 1.7);background:var(--c);border-radius:2px;opacity:0;
  transform:rotate(var(--r));animation:est-end-fall var(--d) cubic-bezier(.25,.6,.4,1) var(--delay) 1 both}
@keyframes est-end-fall{
  0%{opacity:1;transform:translate3d(0,0,0) rotate(var(--r))}
  85%{opacity:1}
  100%{opacity:0;transform:translate3d(var(--dx),105vh,0) rotate(calc(var(--r) + 540deg))}
}
@media (prefers-reduced-motion:reduce){.est-end .est-end-confetti{display:none}}
`;
