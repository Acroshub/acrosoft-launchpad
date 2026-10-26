// Ajustes de estilo solo para /piscinas-lp (clase .pis-lp1): título del hero con Barlow Condensed y botones primarios con el triángulo a la derecha, pegado al texto.
export const PIS_LP1_FONT_HREF = "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&display=swap";

export const PIS_LP1_CSS = `
.pis-lp1 .hero h1{font-family:'Barlow Condensed','Plus Jakarta Sans',system-ui,sans-serif;font-weight:800;font-size:clamp(38px,9vw,64px);line-height:1.04;letter-spacing:.01em;}
.pis-lp1 .hero .sub.hero-sub{margin-top:12px;font-size:clamp(18px,3.4vw,24px);line-height:1.35;font-weight:700;color:#fff;max-width:none;}
.pis-lp1 .btn-primary{gap:9px;text-align:center;}
.pis-lp1 .btn-primary .btn-arrow{order:2;width:20px;height:20px;animation:lp1Tri 1.4s ease-in-out infinite;}
.pis-lp1 .btn-hero .btn-main{gap:9px;align-self:center;}
.pis-lp1 .btn-label{text-wrap:balance;}
.pis-lp1 .btn-hero .btn-label{max-width:16.5ch;}
@keyframes lp1Tri{0%,100%{transform:translateX(0)}50%{transform:translateX(3px)}}
@media (prefers-reduced-motion: reduce){.pis-lp1 .btn-primary .btn-arrow{animation:none;}}
`;
