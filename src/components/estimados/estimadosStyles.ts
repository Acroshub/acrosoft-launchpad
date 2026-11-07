// CSS de la landing /estimados-lp («Kit de 50 anuncios virales para negocios de tree services»).
// GENERADO desde Landing/index.html con Landing/_src/port_estilos.py (carpeta «Kit Clientes Tree Services»).
// Todo va acotado a `.est-page` y todas las clases llevan el prefijo `est-` para no chocar con los estilos globales del proyecto.

export const EST_FONT_HREF = "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Inter:wght@400;500;600;700&display=swap";

export const EST_CSS = `
.est-page{--bg:#F9F8F5; --card:#fff; --line:#E6E1D4; --ink:#111; --body:#55584F;
  --green:#1F4D36; --green-soft:#E5EFE8; --orange:#EA5A0B; --orange-dark:#B84405; --hl:#C94E08; --red:#C0392B; --red-soft:#F8E1DD;
  --head:'Barlow Condensed','Arial Narrow',Arial,sans-serif;
  --text:'Inter',system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;}
.est-page *,.est-page *::before,.est-page *::after{box-sizing:border-box}
.est-page{margin:0;background:var(--bg);color:var(--body);font:400 16.5px/1.55 var(--text);-webkit-font-smoothing:antialiased}
.est-page .est-wrap{width:100%;max-width:600px;margin:0 auto;padding:0 20px}
.est-page .est-sec{padding:46px 0}
.est-page .est-sec--dark{background:var(--green);color:#DCE8E0}
.est-page h1,.est-page h2,.est-page h3{font-family:var(--head);font-weight:800;text-transform:uppercase;letter-spacing:.02em;color:var(--ink);margin:0}
.est-page h1{font-size:clamp(38px,10.8vw,54px);line-height:1}
.est-page h2{font-size:clamp(34px,9.2vw,46px);line-height:1;margin-bottom:12px}
.est-page h3{font-size:22px;line-height:1.05}
.est-page .est-sec--dark h2,.est-page .est-sec--dark h3{color:#fff}
.est-page .est-hl{color:var(--hl)}
.est-page .est-sec--dark .est-hl{color:#FFB27A}
.est-page p{margin:0 0 12px}
.est-page .est-eyebrow{display:block;font:700 12.5px/1 var(--text);letter-spacing:.14em;text-transform:uppercase;color:var(--hl);margin-bottom:10px}
.est-page .est-sec--dark .est-eyebrow{color:#fff}
.est-page .est-small{font-size:13px;line-height:1.45;color:#7A7C72}
.est-page .est-sec--dark .est-small{color:#A9C2B3}
.est-page .est-ic{width:1em;height:1em;stroke:currentColor;fill:none;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
.est-page .est-top-proof{background:var(--green);text-align:center;padding:11px 14px}
.est-page .est-top-proof img{display:block;width:100%;max-width:540px;height:auto;margin:0 auto}
.est-page .est-top-proof[hidden]{display:none}
.est-page .est-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;max-width:520px;margin:0 auto;background:var(--orange);color:#fff;text-decoration:none;font:800 clamp(21px,5.8vw,26px)/1.05 var(--head);letter-spacing:.03em;text-transform:uppercase;padding:17px 20px;border-radius:12px;box-shadow:0 5px 0 var(--orange-dark),0 12px 26px rgba(234,90,11,.25);transition:transform .12s,box-shadow .12s;text-align:center}
.est-page .est-btn:hover{transform:translateY(2px);box-shadow:0 3px 0 var(--orange-dark),0 8px 18px rgba(234,90,11,.22)}
.est-page .est-btn:active{transform:translateY(5px);box-shadow:0 0 0 var(--orange-dark)}
.est-page .est-btn svg{width:22px;height:22px;flex:none}
.est-page .est-trust{list-style:none;margin:14px 0 0;padding:0;display:flex;flex-wrap:wrap;justify-content:center;gap:8px 16px;font-size:13.5px;line-height:1.2;color:#5E6158}
.est-page .est-trust li{display:flex;align-items:center;gap:6px}
.est-page .est-trust .est-ic{width:16px;height:16px;color:var(--green);stroke-width:2.2;flex:none}
.est-page .est-cta{margin-top:20px;text-align:center}
.est-page .est-micro{margin:12px 0 0;font-size:13.5px;line-height:1.5;color:#6D7066}
.est-page .est-micro b{color:var(--ink)}
.est-page .est-micro .est-ok{color:var(--green);font-weight:600}
.est-page .est-hero{padding:26px 0 40px}
.est-page .est-hero-pic{display:block;margin:0 0 18px}
.est-page .est-hero-pic img{display:block;width:100%;height:auto;border-radius:16px;box-shadow:0 14px 34px rgba(17,17,17,.2)}
.est-page h2.est-long{font-size:clamp(30px,8.2vw,42px)}
.est-page .est-hero .est-sub{font-size:20px;line-height:1.3;margin:12px 0 16px;color:var(--body)}
.est-page .est-hero .est-sub b{color:var(--ink);font-weight:700}
.est-page .est-nokno{display:flex;align-items:center;justify-content:center;gap:11px;max-width:100%;width:fit-content;margin:0 auto 18px;background:#fff;border:1px solid var(--line);border-radius:14px;padding:12px 16px}
.est-page .est-nokno .est-ic{width:27px;height:27px;color:var(--green);stroke-width:1.9;flex:none}
.est-page .est-nokno p{margin:0;font:500 16px/1.3 var(--text);color:var(--body);text-align:left}
.est-page .est-nokno b{color:var(--ink);font-weight:700}
.est-page .est-hero--center{text-align:center}
.est-page .est-nots{display:grid;gap:10px;margin:18px 0}
.est-page .est-not{display:flex;gap:13px;align-items:flex-start;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:15px 16px}
.est-page .est-not .est-x{flex:none;width:30px;height:30px;border-radius:50%;background:var(--red-soft);color:var(--red);display:grid;place-items:center;font-size:15px;margin-top:1px}
.est-page .est-not .est-x .est-ic{stroke-width:3.2}
.est-page .est-not h3{font-size:22px;line-height:1.05;margin-bottom:3px}
.est-page .est-not p{margin:0;color:var(--body);font-size:15px;line-height:1.4}
.est-page .est-steps{display:grid;gap:10px;margin-top:16px}
.est-page .est-step{display:flex;gap:14px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 15px}
.est-page .est-step .est-n{flex:none;width:36px;height:36px;border-radius:50%;background:var(--green);color:#fff;display:grid;place-items:center;font:800 21px/1 var(--head)}
.est-page .est-step b{display:block;color:var(--ink);font-size:16.5px;line-height:1.25}
.est-page .est-step span{font-size:14.5px;line-height:1.4}
.est-page .est-gal{margin:16px -20px 0}
.est-page .est-gal .est-lab{display:inline-block;margin:0 20px 8px;font:700 11.5px/1 var(--text);letter-spacing:.12em;text-transform:uppercase;color:var(--green);background:var(--green-soft);padding:6px 10px;border-radius:999px}
.est-page .est-marq{overflow:hidden;padding:4px 0 16px;-webkit-mask-image:linear-gradient(90deg,transparent,#000 26px,#000 calc(100% - 26px),transparent);mask-image:linear-gradient(90deg,transparent,#000 26px,#000 calc(100% - 26px),transparent)}
.est-page .est-track{display:flex;width:max-content;will-change:transform}
.est-page .est-track--left{animation:est-marq-left 30s linear infinite}
.est-page .est-track--right{animation:est-marq-right 26s linear infinite}
@keyframes est-marq-left{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes est-marq-right{from{transform:translateX(-50%)}to{transform:translateX(0)}}
.est-page .est-ad{flex:0 0 156px;margin-right:10px;aspect-ratio:3/4;border-radius:14px;overflow:hidden;background:#fff;border:1px solid var(--line);box-shadow:0 8px 18px rgba(30,40,34,.16)}
.est-page .est-ad img{display:block;width:100%;height:100%;object-fit:cover}
@media (prefers-reduced-motion:reduce){
  .est-page .est-marq{overflow-x:auto;scrollbar-width:none;-webkit-mask-image:none;mask-image:none;scroll-snap-type:x mandatory;padding-left:20px;scroll-padding-left:20px}
  .est-page .est-marq::-webkit-scrollbar{display:none}
  .est-page .est-track{animation:none!important;width:auto}
  .est-page .est-ad{scroll-snap-align:start}
  .est-page .est-ad.est-dup{display:none}
}
.est-page .est-sec--night{background:#0C1322;padding:54px 0 52px}
.est-page .est-sec--night h2{color:#fff}
.est-page .est-sec--night .est-w{background:#151E31;border:1px solid #26324A}
.est-page .est-sec--night .est-w .est-lbl{color:#9DB0CC}
.est-page .est-sec--night .est-w .est-num{color:#fff}
.est-page .est-sec--night .est-w .est-num small{color:#8794A8}
.est-page .est-sec--night .est-w q{color:#F2F5FA}
.est-page .est-when{display:grid;gap:10px;margin-top:16px}
.est-page .est-w{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:15px 16px}
.est-page .est-w .est-top{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:6px}
.est-page .est-w .est-lbl{font:700 11.5px/1.2 var(--text);letter-spacing:.1em;text-transform:uppercase;color:var(--hl)}
.est-page .est-w .est-num{font:800 34px/1 var(--head);color:var(--ink);white-space:nowrap}
.est-page .est-w .est-num small{font:700 13px/1 var(--text);letter-spacing:.04em;color:#7A7C72;margin-left:4px;text-transform:uppercase}
.est-page .est-w q{display:block;font:600 15px/1.4 var(--text);color:var(--ink);quotes:"“" "”"}
.est-page .est-bundle{display:block;margin:0 -10px 14px}
.est-page .est-bundle img{display:block;width:100%;height:auto}
.est-page .est-sec--offer{background:#FFF1E2;border-top:1px solid #F3D5B8;border-bottom:1px solid #F3D5B8;padding:54px 0 48px}
.est-page .est-offer-card{position:relative;background:#fff;border:3px solid var(--orange);border-radius:24px;padding:34px 18px 22px;box-shadow:0 20px 44px rgba(234,90,11,.16)}
.est-page .est-offer-tag{position:absolute;top:-19px;left:50%;transform:translateX(-50%);background:var(--orange);color:#fff;font:800 clamp(15px,4.5vw,19px)/1 var(--head);letter-spacing:.07em;text-transform:uppercase;padding:10px 18px;border-radius:999px;box-shadow:0 4px 0 var(--orange-dark);white-space:nowrap}
.est-page .est-offer-card h2.est-product,.est-page .est-offer-card .est-tagline,.est-page .est-offer-card .est-inc-label{text-align:center}
.est-page .est-sec--offer .est-it{background:var(--bg);border:1px solid var(--line)}
.est-page .est-sec--offer .est-price-card{background:#FFF6EC;border:1px solid #F3D5B8;margin-top:16px}
.est-page h2.est-product{font-size:clamp(31px,8.6vw,46px);line-height:.98;margin-bottom:8px}
.est-page .est-tagline{font-size:17px;line-height:1.4;color:var(--body);margin:0 0 20px}
.est-page .est-inc-label{font:800 15px/1 var(--head);letter-spacing:.12em;text-transform:uppercase;color:var(--hl);margin:4px 0 10px}
.est-page .est-items{display:grid;gap:10px}
.est-page .est-it{display:flex;gap:12px;background:#fff;color:var(--body);border-radius:14px;padding:14px 15px}
.est-page .est-it .est-ck{flex:none;width:28px;height:28px;border-radius:50%;background:var(--green-soft);color:var(--green);display:grid;place-items:center;font-size:15px}
.est-page .est-it .est-ck .est-ic{stroke-width:3.2}
.est-page .est-it b{display:block;color:var(--ink);font-size:16px;line-height:1.25;margin-bottom:2px}
.est-page .est-it span{font-size:14px;line-height:1.4}
.est-page .est-it strong{color:var(--ink);font-weight:700}
.est-page .est-it .est-sublist{list-style:none;margin:5px 0 0;padding:0;display:grid;gap:3px}
.est-page .est-it .est-sublist li{position:relative;padding-left:15px;font-size:14px;line-height:1.35}
.est-page .est-it .est-sublist li:before{content:"";position:absolute;left:2px;top:.55em;width:6px;height:6px;border-radius:50%;background:var(--orange)}
.est-page .est-price-card{background:#fff;color:var(--body);border-radius:18px;padding:22px 18px 20px;margin-top:14px;text-align:center}
.est-page .est-price-card .est-amount{font:800 64px/1 var(--head);color:var(--ink)}
.est-page .est-price-card .est-amount-label{margin:0 0 6px;font:800 14px/1 var(--head);letter-spacing:.2em;text-transform:uppercase;color:#7A7C72}
.est-page .est-pay{margin-top:16px;text-align:center}
.est-page .est-pay-label{display:block;font-size:12px;color:#6D7066;margin-bottom:8px}
.est-page .est-pay-icons{display:flex;justify-content:center;align-items:center;gap:14px;flex-wrap:wrap}
.est-page .est-pay-icon{width:30px;height:30px;flex:none;fill:currentColor;stroke:none;color:#55584F;opacity:.85}
.est-page .est-price-card s{font:600 22px/1 var(--head);color:#9A9C92;margin-right:8px}
.est-page .est-price-card .est-micro{margin-top:14px}
.est-page .est-guar{display:flex;gap:14px;align-items:flex-start;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px}
.est-page .est-seal{flex:none;width:78px;height:78px;border-radius:50%;background:var(--green);color:#fff;border:4px double #BFD6C8;display:grid;place-content:center;text-align:center;font:800 13px/1 var(--head);letter-spacing:.1em;text-transform:uppercase}
.est-page .est-seal b{display:block;font-size:34px;line-height:.9;letter-spacing:0}
.est-page .est-guar h2{font-size:28px;margin-bottom:6px}
.est-page .est-guar .est-seal{margin-top:4px}
.est-page .est-guar p{margin:0;font-size:15px;line-height:1.45}
.est-page .est-sec--cool{background:#E8EDF4;border-top:1px solid #D5DDE8;border-bottom:1px solid #D5DDE8;padding:52px 0 50px}
.est-page .est-sec--cool details{border-color:#D5DDE8}
.est-page .est-faq{display:grid;gap:9px;margin-top:14px}
.est-page details{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:0 15px}
.est-page summary{cursor:pointer;list-style:none;padding:14px 26px 14px 0;font:600 15.5px/1.35 var(--text);color:var(--ink);position:relative}
.est-page summary::-webkit-details-marker{display:none}
.est-page summary:after{content:"+";position:absolute;right:0;top:9px;font:800 26px/1 var(--head);color:var(--hl)}
.est-page details[open] summary:after{content:"\\2212"}
.est-page details p{margin:0 0 14px;font-size:15px;line-height:1.5}
.est-page .est-final h2{font-size:clamp(36px,10vw,50px)}
.est-page .est-checks{list-style:none;margin:6px 0 4px;padding:0;display:grid;gap:10px}
.est-page .est-checks li{display:flex;gap:10px;align-items:flex-start;font-weight:600;color:var(--ink);font-size:15.5px}
.est-page .est-checks .est-ic{color:var(--green);font-size:20px;stroke-width:3;flex:none;margin-top:2px}
.est-page .est-final{padding:46px 0 116px}
.est-page .est-final .est-bundle{margin:22px -8px 10px}
.est-page .est-sticky{position:fixed;left:0;right:0;bottom:0;z-index:50;background:#fff;border-top:1px solid var(--line);box-shadow:0 -8px 24px rgba(0,0,0,.08);padding:10px 14px calc(10px + env(safe-area-inset-bottom));display:flex;align-items:center;gap:12px;transform:translateY(115%);transition:transform .25s}
.est-page .est-sticky.est-is-visible{transform:none}
.est-page .est-sticky .est-p{font:800 28px/1 var(--head);color:var(--ink);white-space:nowrap}
.est-page .est-sticky .est-p small{display:block;font:500 11px/1.1 var(--text);color:#7A7C72}
.est-page .est-sticky .est-btn{padding:14px 14px;gap:8px;font-size:clamp(17px,5.3vw,21px);box-shadow:0 3px 0 var(--orange-dark)}
.est-page .est-sticky .est-btn svg{width:20px;height:20px}
@media (min-width:760px){
  .est-page{font-size:17px}
  .est-page .est-wrap{max-width:680px}
  .est-page .est-sec{padding:60px 0}
  .est-page .est-gal{margin-left:0;margin-right:0}
  .est-page .est-gal .est-lab{margin-left:0}
  .est-page .est-ad{flex-basis:176px}
  .est-page .est-nokno p{font-size:15px}
  .est-page .est-sticky{display:none}
  .est-page .est-final{padding:46px 0 64px}
}
`;
