// Estilos de la página del upsell 1: usa el tema v1 de /piscinas-lp (azul marino/blanco, CTA naranja, sin glow). Se suman a PIS_CSS + PIS_CSS_V2.
export const PIS_UP1_CSS = `
.pis-v1 .up1-alert{background:#D9261C;color:#fff;padding:12px 0;font-size:14.5px;line-height:1.45;text-align:center;font-weight:600;}
.pis-v1 .up1-alert .container{display:block;}
.pis-v1 .up1-alert .tag{display:inline;background:#fff;color:#D9261C;font-weight:800;font-size:13px;letter-spacing:.02em;padding:2px 8px;border-radius:3px;margin-right:6px;vertical-align:baseline;}
.pis-v1 .up1-hero{padding:clamp(30px,5vw,56px) 0 clamp(36px,6vw,64px);}
.pis-v1 .up1-wrap{max-width:820px;}
.pis-v1 .up1-hero h1{font-size:clamp(30px,5.4vw,48px);text-align:center;}
.pis-v1 .up1-seg{margin:22px auto 0;max-width:620px;}
.pis-v1 .up1-seg-bar{display:grid;grid-template-columns:repeat(10,1fr);gap:5px;}
.pis-v1 .up1-seg-bar i{display:block;height:14px;border-radius:2px;background:rgba(255,255,255,.16);}
.pis-v1 .up1-seg-bar i.on{background:#4FB3D0;animation:up1Seg .5s ease-out both;animation-delay:calc(var(--i) * .22s);}
.pis-v1 .up2-seg i.on.prev{animation:none;opacity:1;transform:none;}
.pis-v1 .up2-seg i.on.new{background:#F2C14E;animation:up1Seg .5s ease-out both;animation-delay:calc(.5s + var(--i) * .3s);}
.pis-v1 .up2-seg i.on:nth-child(5){animation:none;}
.pis-v1 .up2-seg i.on.new:nth-child(8){animation-name:up1Seg,up1Pulse;animation-duration:.5s,1.6s;animation-delay:calc(.5s + var(--i) * .3s),2s;animation-iteration-count:1,infinite;animation-fill-mode:both,none;}
@keyframes up1Seg{from{opacity:.15;transform:scaleY(.4)}to{opacity:1;transform:scaleY(1)}}
.pis-v1 .up1-seg-bar i.on:nth-child(5){animation-name:up1Seg,up1Pulse;animation-duration:.5s,1.6s;animation-delay:calc(var(--i) * .22s),1.4s;animation-iteration-count:1,infinite;animation-fill-mode:both,none;}
@keyframes up1Pulse{0%,100%{opacity:1}50%{opacity:.45}}
.pis-v1 .up1-seg-pct{display:block;margin-top:10px;text-align:right;font-size:14px;font-weight:700;color:var(--ink);letter-spacing:.01em;}
.pis-v1 .up1-hero .sub.up1-lead{margin-top:22px;font-size:clamp(19px,2.8vw,23px);line-height:1.6;color:#fff;font-weight:500;text-align:left;}
.pis-v1 .up1-hero .sub.up1-lead strong{color:#fff;font-weight:800;}
.pis-v1 .up1-hero .sub.up1-lead mark{background:#F2C14E;color:#0B2238;font-weight:800;padding:2px 7px;border-radius:3px;box-decoration-break:clone;-webkit-box-decoration-break:clone;}
.pis-v1 .up1-hero .vsl-wrap{max-width:none;margin-top:26px;}
.pis-v1 .vsl-box{border-radius:22px;border:1px solid var(--line);box-shadow:none;background:var(--card);}
.pis-v1 .vsl-box.is-empty{background:var(--card);border:2px dashed rgba(255,255,255,.3);}
.pis-v1 .vsl-empty{align-items:center;text-align:center;}
.pis-v1 .vsl-play{background:transparent;border-color:#fff;}
.pis-v1 .vsl-play svg{fill:#fff;}
.pis-v1 .vsl-empty-title{color:#fff;}
.pis-v1 .vsl-empty-note{color:var(--ink-soft);}
.pis-v1 .up1-once{margin-top:16px;font-size:16px;font-weight:700;color:var(--ink);}
.pis-v1 .up1-promise .container,.pis-v1 .up1-final .container{max-width:820px;}
.pis-v1 .up1-promise{padding:0 0 clamp(40px,6vw,64px);}
.pis-v1 .up1-band{background:#E4572E;color:#fff;text-align:center;font-weight:800;font-family:'Barlow Condensed','Plus Jakarta Sans',system-ui,sans-serif;font-size:clamp(34px,9.6vw,54px);letter-spacing:.06em;text-transform:uppercase;line-height:1.1;padding:clamp(22px,4vw,38px) 0;margin-bottom:clamp(30px,5vw,48px);}
.pis-v1 .up1-band-t{font-weight:800;}
.pis-v1 .up2-band{font-size:clamp(20px,5.6vw,50px);}
.pis-v1 .up2-band .up1-band-t{letter-spacing:.04em;}
.pis-v1 .up2-band .up1-pen{display:block;width:fit-content;margin:8px auto 0;}
.pis-v1 .up1-pen{position:relative;display:inline-block;white-space:nowrap;}
.pis-v1 .up1-pen::after{content:"";position:absolute;left:0;right:0;bottom:-.1em;height:.07em;min-height:3px;background:#F2C14E;}
.pis-v1 .up1-promise-in mark{background:#F2C14E;color:#0B2238;font-weight:800;padding:2px 7px;border-radius:3px;box-decoration-break:clone;-webkit-box-decoration-break:clone;}
.pis-v1 .up1-promise-in p{font-size:clamp(19px,2.8vw,23px);}
.pis-v1 .u1flow.u1flow-3{max-width:440px;}
.pis-v1 .up2-steps{display:flex;flex-direction:column;align-items:center;gap:3px;margin:8px 0 2px;}
.pis-v1 .up2-step{display:flex;align-items:center;gap:8px;font-weight:800;font-size:18px;line-height:1;color:#0B2238;}
.pis-v1 .up2-step.old s{color:#8A9BAA;text-decoration-thickness:3px;}
.pis-v1 .up2-step.now{color:#1B8A55;}
.pis-v1 .up2-cal{width:24px;height:24px;flex:none;}
.pis-v1 .up2-steps-note strong{color:#0B2238;}
.pis-v1 .up2-steps-note{margin:10px 0 0;max-width:40ch;font-size:15px;line-height:1.5;color:#40566B;}
.pis-v1 .up2-offer .decision-card .offer-price small{display:inline;margin:0 0 0 4px;font-family:'Plus Jakarta Sans',system-ui,sans-serif;font-size:.26em;font-weight:700;letter-spacing:0;color:#40566B;}
.pis-v1 .up2-cards{display:grid;grid-template-columns:1fr;gap:14px;}
.pis-v1 .up2-card{display:flex;gap:16px;align-items:flex-start;background:#F4F7FA;border:1px solid #D6DFE7;border-radius:16px;padding:18px;}
.pis-v1 .up2-ico{flex:none;width:54px;height:54px;border-radius:50%;background:#0B2F4F;color:#F2C14E;display:flex;align-items:center;justify-content:center;}
.pis-v1 .up2-ico .icon{width:26px;height:26px;stroke-width:2;}
.pis-v1 .up2-card h3{margin:0;font-size:clamp(18px,2.6vw,21px);line-height:1.25;font-weight:800;color:#0B2238;}
.pis-v1 .up2-card p{margin:6px 0 0;font-size:16px;line-height:1.55;color:#40566B;}
.pis-v1 .up1-recibiras{margin:34px 0 14px;font-size:clamp(24px,4vw,32px);color:#0B2238;font-weight:800;}
.pis-v1 .up1-mocks.mock-grid{grid-template-columns:repeat(2,1fr);margin-top:0;}
.pis-v1 .up1-mocks .mock-card:last-child{grid-column:1/-1;justify-self:center;width:calc(50% - 7px);}
.pis-v1 .up1-own-card{display:flex;flex-direction:column;gap:14px;align-items:center;text-align:center;margin-top:26px;padding:22px;background:#fff;border:2px solid #1B8A55;border-radius:18px;}
.pis-v1 .up1-own-ico{flex:none;width:76px;height:76px;}
.pis-v1 .up1-own-card h3.up1-own-title{text-align:center !important;margin:0 0 10px;font-size:clamp(20px,3vw,24px);line-height:1.2;font-weight:800;color:#E4572E !important;}
.pis-v1 .up1-own-card p{margin:0;font-size:clamp(16px,2.2vw,18px);line-height:1.6;color:#0B2238;}
.pis-v1 .up1-own-card p strong{font-weight:800;}
.pis-v1 .up1-own-hl{font-style:normal;color:#E4572E;}
@media(max-width:560px){.pis-v1 .up1-own-card{padding:20px 18px;}}
.pis-v1 .uo-ring{transform-box:fill-box;transform-origin:center;animation:uoSpin 14s linear infinite;}
.pis-v1 .uo-key{transform-box:fill-box;transform-origin:40px 42px;animation:uoKey 3.2s ease-in-out infinite;}
.pis-v1 .uo-badge{transform-box:fill-box;transform-origin:center;animation:uoPop 3.2s ease-in-out infinite;}
.pis-v1 .uo-check{stroke-dasharray:1;animation:uoCheck 3.2s ease-out infinite;}
@keyframes uoSpin{to{transform:rotate(360deg)}}
@keyframes uoKey{0%,55%,100%{transform:rotate(0)}65%{transform:rotate(-16deg)}78%{transform:rotate(12deg)}90%{transform:rotate(-5deg)}}
@keyframes uoPop{0%,8%{transform:scale(0)}22%{transform:scale(1.18)}32%,100%{transform:scale(1)}}
@keyframes uoCheck{0%,18%{stroke-dashoffset:1}40%,100%{stroke-dashoffset:0}}
@media (prefers-reduced-motion: reduce){.pis-v1 .uo-ring,.pis-v1 .uo-key,.pis-v1 .uo-badge,.pis-v1 .uo-check{animation:none;stroke-dashoffset:0;}}
.pis-v1 .up1-doubts-l{display:block;text-align:center;color:#40566B;}
.pis-v1 .up1-guar{padding:0;}
.pis-v1 .up1-guar .container{max-width:none;padding:0;}
@media(max-width:700px){.pis-v1 .up1-guar .guar-v1{grid-template-columns:1fr;}.pis-v1 .up1-guar .guar-v1 .gb-wrap{padding:34px 22px;}.pis-v1 .up1-guar .gb-art{max-width:190px;}.pis-v1 .up1-guar .guar-v1 .guar-text{padding:28px 20px 34px;}.pis-v1 .up1-guar .guar-v1 .guar-text h2{font-size:24px;}.pis-v1 .up1-guar .guar-v1 .guar-text p{font-size:16px;line-height:1.6;}.pis-v1 .up1-guar .up1-note{font-size:15px;}}
.pis-v1 .up1-boxes{max-width:480px;margin:0 auto 14px;background:transparent !important;padding:0;}
.pis-v1 .up1-boxes img{width:100%;height:auto;display:block;}
.pis-v1 .up1-promise-in{text-align:left;}
.pis-v1 .up1-promise-in h2{font-size:clamp(24px,4.2vw,36px);line-height:1.18;color:#0B2238;}
.pis-v1 .up1-promise-in p{margin-top:14px;font-size:clamp(16px,2.2vw,19px);line-height:1.65;color:#40566B;}
.pis-v1 .up1-promise-in p strong{color:#0B2238;}
.pis-v1 .up1-promise .decision-card{margin:26px 0 0;max-width:none;text-align:center;background:#F4F7FA;border:1px solid #D6DFE7;}
.pis-v1 .up1-promise .decision-card{border-color:#E4572E;animation:up1Glow 2.4s ease-in-out infinite;}
@keyframes up1Glow{0%,100%{box-shadow:0 0 0 0 rgba(228,87,46,.0),0 0 8px 1px rgba(228,87,46,.22)}50%{box-shadow:0 0 0 4px rgba(228,87,46,.10),0 0 20px 4px rgba(228,87,46,.38)}}
@media (prefers-reduced-motion: reduce){.pis-v1 .up1-promise .decision-card{animation:none;box-shadow:0 0 14px 2px rgba(228,87,46,.28);}}
.pis-v1 .up1-promise .decision-card{overflow:hidden;}
.pis-v1 .up1-promise .decision-card .btn-yes{display:flex;align-items:center;justify-content:center;gap:12px;text-align:center;}
.pis-v1 .up1-promise .decision-card .btn-yes::after{content:"";flex:none;width:16px;height:18px;background:#fff;clip-path:polygon(0 0,100% 50%,0 100%);animation:up1Tri 1.4s ease-in-out infinite;}
@keyframes up1Tri{0%,100%{transform:translateX(0)}50%{transform:translateX(5px)}}
@media (prefers-reduced-motion: reduce){.pis-v1 .up1-promise .decision-card .btn-yes::after{animation:none;}}
.pis-v1 .up1-cont{margin:-26px -24px 20px;padding:12px 16px;background:#E4572E;color:#fff;font-weight:800;font-size:clamp(18px,3.4vw,22px);letter-spacing:.01em;text-align:center;}
.pis-v1 .up1-promise .decision-card h2.offer-name{font-family:'Barlow Condensed','Plus Jakarta Sans',system-ui,sans-serif;font-weight:800;font-size:clamp(27px,6.9vw,38px);line-height:1.1;letter-spacing:.02em;text-transform:uppercase;}
.pis-v1 .up1-promise .decision-card .yes-note{margin-top:12px;font-size:14.5px;font-weight:500;color:#40566B;}
.pis-v1 .up1-promise .decision-card .yes-note a{color:#E4572E;font-weight:800;text-decoration:underline;}
.pis-v1 .up1-promise .decision-card .offer-name{color:#0B2238;}
.pis-v1 .up1-promise .decision-card .offer-price{color:#E4572E;font-family:'Barlow Condensed','Plus Jakarta Sans',system-ui,sans-serif;font-weight:800;font-size:clamp(68px,19vw,96px);line-height:1;letter-spacing:.01em;margin:6px 0 4px;}
.pis-v1 .up1-promise .decision-card .offer-price small,.pis-v1 .up1-promise .decision-card .decline-link,.pis-v1 .up1-promise .decision-card .unique-note{color:#40566B;}
.pis-v1 .up1-promise .decision-card .trust-row li{color:#40566B;}
.pis-v1 .up1-text{margin-top:16px;font-size:clamp(16px,2.2vw,18px);line-height:1.65;color:var(--ink-soft);}
.pis-v1 .up1-text strong{color:var(--ink);}
.pis-v1 .up1-final h2{font-size:clamp(26px,4.4vw,40px);}
.pis-v1 .up1-final .sub{margin-top:12px;color:var(--ink-soft);font-size:18px;}
.pis-v1 .up1-final .decision-card{margin:26px 0 0;max-width:none;text-align:center;}
.pis-v1 .up1-doubts{display:inline-block;margin-top:22px;font-size:15px;font-weight:700;color:var(--ink-soft);text-decoration:underline;}
.pis-v1 .up1-note{margin-top:16px;padding-top:14px;border-top:1px solid var(--line);font-size:15px;color:var(--ink-soft);}
.pis-v1 .up1-note strong{color:var(--yellow);}
.pis-v1 .guar-v1 .guar-text p strong{color:var(--ink);}
.pis-v1 .sec-light .steps .step{background:#F4F7FA;}
.pis-v1 .u1flow{max-width:640px;margin:30px 0 0;}
.pis-v1 .u1flow-svg{width:100%;height:auto;display:block;}

@keyframes u1fCheck{0%,10%{stroke-dashoffset:1}40%,100%{stroke-dashoffset:0}}
@keyframes u1fPop{0%,5%{transform:scale(0)}20%{transform:scale(1.15)}30%,100%{transform:scale(1)}}
@keyframes u1fDash{to{stroke-dashoffset:-36}}
@keyframes u1fArrow{0%,100%{transform:translateX(0)}50%{transform:translateX(6px)}}
@keyframes u1fArrowV{0%,100%{transform:translateY(0)}50%{transform:translateY(6px)}}
.pis-v1 .u1f-check{stroke-dasharray:1;animation:u1fCheck 2.6s ease-out both;}
.pis-v1 .u1f-badge{transform-box:fill-box;transform-origin:center;animation:u1fPop 1.6s ease-out both;}
.pis-v1 .u1f-dash{animation:u1fDash 1.6s linear infinite;}
.pis-v1 .u1f-arrow{animation:u1fArrow 1.4s ease-in-out infinite;}
.pis-v1 .u1f-arrow-v{animation:u1fArrowV 1.4s ease-in-out infinite;}
@media(max-width:600px){.pis-v1 .u1flow *{animation:none !important;stroke-dashoffset:0;}}
@media (prefers-reduced-motion: reduce){.pis-v1 .up1-seg-bar i.on{animation:none !important;}.pis-v1 .u1f-check,.pis-v1 .u1f-badge,.pis-v1 .u1f-dash,.pis-v1 .u1f-arrow,.pis-v1 .u1f-arrow-v{animation:none;stroke-dashoffset:0;}}
`;
