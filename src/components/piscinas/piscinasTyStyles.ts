// Estilos de la thank-you (/piscinas-ty): mismo lenguaje visual que /piscinas-lp y los upsells (azul marino/blanco, CTA naranja, Barlow Condensed en títulos, sin glow).
// Se suman a PIS_CSS + PIS_CSS_V2 + PIS_CAL_CSS + PIS_UP1_CSS (franja naranja, tarjetas con mockups, SVG animados). Tema v1.
export const PIS_TY_CSS = `
.pis-v1 .ty2-demo{background:#F2C14E;color:#0B2238;padding:9px 0;font-size:13.5px;font-weight:700;text-align:center;}
.pis-v1 .ty2-hero{padding:clamp(30px,5vw,56px) 0 clamp(34px,5vw,60px);text-align:center;}
.pis-v1 .ty2-check{width:84px;height:84px;display:block;margin:0 auto;}
.pis-v1 .ty2-pill{display:inline-block;margin-top:18px;padding:8px 20px;border-radius:999px;background:#1B8A55;color:#fff;font-weight:800;font-size:15px;letter-spacing:.06em;text-transform:uppercase;}
.pis-v1 .ty2-hero h1{margin-top:16px;font-family:'Barlow Condensed','Plus Jakarta Sans',system-ui,sans-serif;font-weight:800;font-size:clamp(40px,10vw,64px);line-height:1.04;letter-spacing:.02em;text-transform:uppercase;text-align:center;}
.pis-v1 .ty2-hero .sub.ty2-thanks{margin:16px auto 0;max-width:34em;font-size:clamp(18px,2.8vw,22px);line-height:1.55;font-weight:600;color:#fff;text-align:center;}
.pis-v1 .ty2-hero .ty2-thanks mark{background:#F2C14E;color:#0B2238;font-weight:800;padding:2px 7px;border-radius:3px;box-decoration-break:clone;-webkit-box-decoration-break:clone;}
.pis-v1 .ty2-bundle{max-width:420px;margin:22px auto 0;background:transparent !important;padding:0;}
.pis-v1 .ty2-bundle img{width:100%;height:auto;display:block;}
.pis-v1 .ty2-body{padding:0 0 clamp(40px,6vw,64px);display:flow-root;}
.pis-v1 .ty2-body .container{max-width:820px;}
.pis-v1 .ty2-h{margin:0 0 16px;font-size:clamp(24px,4vw,32px);line-height:1.15;font-weight:800;color:#0B2238;}
.pis-v1 .ty2-steps{display:flex;flex-direction:column;gap:12px;margin:0;padding:0;list-style:none;}
.pis-v1 .ty2-step{display:flex;gap:14px;align-items:flex-start;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px 18px;}
.pis-v1 .ty2-step .n{flex:none;width:36px;height:36px;border-radius:50%;background:#0B2F4F;color:#fff;font-weight:800;font-size:17px;display:flex;align-items:center;justify-content:center;}
.pis-v1 .sec-dark .ty2-step .n{background:#F2C14E;color:#0B2238;}
.pis-v1 .ty2-step p{margin:0;font-size:clamp(16px,2.2vw,18px);line-height:1.55;color:var(--ink);}
.pis-v1 .ty2-step code{font-size:.92em;background:rgba(15,124,155,.12);padding:1px 6px;border-radius:5px;}
.pis-v1 .ty2-lead{margin:0;font-size:clamp(18px,2.6vw,21px);line-height:1.55;color:#0B2238;text-align:center;}
.pis-v1 .ty2-dl{margin-top:22px;padding:22px;background:#fff;border:2px solid #1B8A55;border-radius:18px;text-align:center;}
.pis-v1 .ty2-dl-note{margin:12px 0 0;font-size:14.5px;color:#40566B;}
.pis-v1 .ty2-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;min-height:66px;padding:16px 20px;border-radius:14px;border:0;cursor:pointer;font-family:inherit;font-weight:800;font-size:clamp(17px,4.6vw,21px);line-height:1.2;text-align:center;color:#fff;text-decoration:none;transition:background-color 150ms ease;}
.pis-v1 .ty2-btn.green{background:#1B8A55;}.pis-v1 .ty2-btn.green:hover{background:#157345;}
.pis-v1 .ty2-btn.orange{background:#E4572E;}.pis-v1 .ty2-btn.orange:hover{background:#CC4A24;}
.pis-v1 .ty2-btn.red{background:#D9261C;}.pis-v1 .ty2-btn.red:hover{background:#B91F17;}
.pis-v1 .ty2-btn.wa{background:#178A43;}.pis-v1 .ty2-btn.wa:hover{background:#12703A;}
.pis-v1 .ty2-btn.mail{background:#0B2F4F;}.pis-v1 .ty2-btn.mail:hover{background:#082338;}
.pis-v1 .ty2-wa{width:28px;height:28px;flex:none;}
.pis-v1 .ty2-contact{display:flex;flex-direction:column;gap:10px;margin-top:16px;}
.pis-v1 .ty2-contact .ty2-btn{font-size:clamp(16px,4.2vw,19px);}
.pis-v1 .ty2-state .ty2-contact .ty2-btn.mail{background:rgba(255,255,255,.14);}
.pis-v1 .ty2-btn .icon{width:24px;height:24px;stroke-width:2.6;flex:none;}
.pis-v1 .ty2-btn .ty2-tri{order:2;width:20px;height:20px;fill:currentColor;stroke:none;flex:none;animation:ty2Tri 1.4s ease-in-out infinite;}
@keyframes ty2Tri{0%,100%{transform:translateX(0)}50%{transform:translateX(3px)}}
.pis-v1 .ty2-mail{display:flex;gap:10px;align-items:flex-start;margin:18px 0 0;font-size:15.5px;line-height:1.55;color:#40566B;text-align:left;}
.pis-v1 .ty2-mail .icon{width:20px;height:20px;flex:none;margin-top:2px;color:#0F7C9B;}
.pis-v1 .ty2-mail strong{color:#0B2238;}
.pis-v1 .ty2-inside{padding-top:clamp(36px,6vw,60px);}
.pis-v1 .ty2-inside .container{max-width:820px;}
.pis-v1 .ty2-inside .mock-grid{grid-template-columns:repeat(2,1fr);}
.pis-v1 .ty2-service{margin-top:18px;background:#fff;border:2px solid #1B8A55;border-radius:18px;padding:22px;text-align:center;color:#0B2238;}
.pis-v1 .ty2-service h3{text-align:center !important;margin:0;font-size:clamp(22px,3.4vw,28px);line-height:1.2;font-weight:800;color:#E4572E;}
.pis-v1 .ty2-service p{margin:12px 0 0;font-size:clamp(16px,2.2vw,18px);line-height:1.6;color:#40566B;}
.pis-v1 .ty2-service p strong{color:#0B2238;}
.pis-v1 .ty2-service .ty2-box{max-width:300px;margin:0 auto 12px;background:transparent !important;padding:0;}
.pis-v1 .ty2-service .ty2-box img{width:100%;height:auto;display:block;}
.pis-v1 .ty2-service .ty2-contact{margin-bottom:6px;}
.pis-v1 .ty2-help{background:#F4F7FA;border:1px solid #D6DFE7;border-radius:18px;padding:22px;text-align:center;}
.pis-v1 .ty2-help p{margin:0;font-size:clamp(16px,2.2vw,18px);line-height:1.55;color:#40566B;}
.pis-v1 .ty2-help p strong{color:#0B2238;}

.pis-v1 .ty2-state{padding:clamp(44px,8vw,80px) 0;text-align:center;}
.pis-v1 .ty2-state .container{max-width:560px;}
.pis-v1 .ty2-state h2{font-family:'Barlow Condensed','Plus Jakarta Sans',system-ui,sans-serif;font-weight:800;font-size:clamp(32px,8vw,46px);line-height:1.08;letter-spacing:.02em;text-transform:uppercase;color:#fff;}
.pis-v1 .ty2-state p{margin:14px 0 0;font-size:clamp(17px,2.4vw,19px);line-height:1.6;color:#fff;}
.pis-v1 .ty2-state .ty2-steps{margin-top:22px;text-align:left;}
.pis-v1 .ty2-state .ty2-step{background:rgba(255,255,255,.07);border-color:rgba(255,255,255,.18);}
.pis-v1 .ty2-state .ty2-step p{margin:0;color:#fff;font-size:16px;}
.pis-v1 .ty2-state > .container > .ty2-btn{margin-top:22px;}
.pis-v1 .ty2-state-ico{width:72px;height:72px;margin:0 auto 14px;border-radius:50%;background:#F2C14E;color:#0B2238;display:flex;align-items:center;justify-content:center;}
.pis-v1 .ty2-state-ico .icon{width:34px;height:34px;stroke-width:2.4;}
.pis-v1 .ty2-spin{width:46px;height:46px;margin:0 auto 18px;border-radius:50%;border:5px solid rgba(255,255,255,.25);border-top-color:#F2C14E;animation:ty2Spin 1s linear infinite;}
@keyframes ty2Spin{to{transform:rotate(360deg)}}
.pis-v1 .ty2-foot{padding:26px 0;}
.pis-v1 .ty2-foot p{font-size:13px;color:#64798C;}
.pis-v1 .ty2-foot p + p{margin-top:8px;}
.pis-v1 .ty2-foot a{color:#40566B;}
@media (prefers-reduced-motion: reduce){.pis-v1 .ty2-btn .ty2-tri,.pis-v1 .ty2-spin{animation:none;}}
`;
