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
.pis-lp1 .hero .sub.hero-sub .kit-ul{color:inherit;text-decoration:underline;text-decoration-color:#F2C14E;text-decoration-thickness:2px;text-underline-offset:2px;text-decoration-skip-ink:none;}
.pis-lp1 #para-ti .section-head h2{font-size:clamp(30px,5.4vw,50px);line-height:1.12;}
/* Sin animaciones en los íconos de «Este Kit de Anuncios es para ti si…» y de «En los próximos 7 días, vas a:» (mismos estados finales que usa reduced-motion). */
.pis-lp1 .pt-dot,.pis-lp1 .pt-mega,.pis-lp1 .pt-wave,.pis-lp1 .pt-q,.pis-lp1 .pt-ring-phone,.pis-lp1 .pt-ripple{animation:none !important;opacity:1;}
.pis-lp1 .lg-logo,.pis-lp1 .lg-line,.pis-lp1 .lg-heart,.pis-lp1 .lg-tag,.pis-lp1 .lg-spark,.pis-lp1 .lg-rec,.pis-lp1 .lg-play,.pis-lp1 .lg-prog,.pis-lp1 .lg-handset,.pis-lp1 .lg-bubble{animation:none !important;transform:none;opacity:1;}
.pis-lp1 .lg-check{animation:none !important;stroke-dashoffset:0;}
@keyframes lp1Tri{0%,100%{transform:translateX(0)}50%{transform:translateX(3px)}}
@media (prefers-reduced-motion: reduce){.pis-lp1 .btn-primary .btn-arrow{animation:none;}}
`;
