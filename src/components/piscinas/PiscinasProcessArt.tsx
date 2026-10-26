// Ilustraciones SVG animadas (bucle propio, colores planos, sin brillos) para la v1/v4:
// «No importa cuánto sepas hoy», «Proceso de compra y entrega» y el sello de garantía.
import { LangFlags } from "./PiscinasShared";

const F = "'Plus Jakarta Sans',system-ui,sans-serif";

/* ───────────── Paso 1 · Checkout llenándose + tarjeta ───────────── */
export function CheckoutArt() {
  return (
    <svg className="pr-art" viewBox="0 0 300 190" role="img" aria-label="Datos llenándose en un checkout seguro y una tarjeta de crédito">
      <rect x="12" y="12" width="176" height="166" rx="12" fill="#fff" stroke="#D6DFE7" strokeWidth="2" />
      <path d="M12 24a12 12 0 0 1 12-12h152a12 12 0 0 1 12 12v14H12z" fill="#0B2F4F" />
      <rect x="24" y="22" width="9" height="8" rx="1.6" fill="none" stroke="#fff" strokeWidth="1.8" />
      <path d="M26 22v-2.5a2.5 2.5 0 0 1 5 0V22" fill="none" stroke="#fff" strokeWidth="1.8" />
      <text x="40" y="30" fontSize="9.5" fontWeight="800" fill="#fff" fontFamily={F}>Pago seguro</text>
      {/* Email */}
      <rect x="24" y="48" width="38" height="5" rx="2.5" fill="#C7D5E1" />
      <rect x="24" y="57" width="152" height="18" rx="5" fill="#F4F7FA" stroke="#D6DFE7" />
      <text x="30.0" y="72" fontSize="13" fontWeight="800" fill="#0B2F4F" fontFamily={F}>*</text><text x="36.4" y="72" fontSize="13" fontWeight="800" fill="#0B2F4F" fontFamily={F}>*</text><text x="42.8" y="72" fontSize="13" fontWeight="800" fill="#0B2F4F" fontFamily={F}>*</text><text x="49.2" y="72" fontSize="13" fontWeight="800" fill="#0B2F4F" fontFamily={F}>*</text><text x="55.6" y="72" fontSize="13" fontWeight="800" fill="#0B2F4F" fontFamily={F}>*</text><text x="62.0" y="72" fontSize="13" fontWeight="800" fill="#0B2F4F" fontFamily={F}>*</text><text x="68.4" y="72" fontSize="13" fontWeight="800" fill="#0B2F4F" fontFamily={F}>*</text><text x="74.8" y="72" fontSize="13" fontWeight="800" fill="#0B2F4F" fontFamily={F}>*</text><text x="81.2" y="72" fontSize="13" fontWeight="800" fill="#0B2F4F" fontFamily={F}>*</text><text x="87.6" y="72" fontSize="13" fontWeight="800" fill="#0B2F4F" fontFamily={F}>*</text><text x="94.0" y="72" fontSize="13" fontWeight="800" fill="#0B2F4F" fontFamily={F}>*</text><text x="100.4" y="72" fontSize="13" fontWeight="800" fill="#0B2F4F" fontFamily={F}>*</text><text x="106.8" y="72" fontSize="13" fontWeight="800" fill="#0B2F4F" fontFamily={F}>*</text><text x="113.2" y="72" fontSize="13" fontWeight="800" fill="#0B2F4F" fontFamily={F}>*</text><rect className="pr-type t1" x="28" y="59" width="144" height="14" fill="#F4F7FA" />
      {/* Tarjeta */}
      <rect x="24" y="82" width="52" height="5" rx="2.5" fill="#C7D5E1" />
      <rect x="24" y="91" width="152" height="18" rx="5" fill="#F4F7FA" stroke="#D6DFE7" />
      <text x="30.0" y="106" fontSize="13" fontWeight="800" fill="#0B2F4F" fontFamily={F}>*</text><text x="36.4" y="106" fontSize="13" fontWeight="800" fill="#0B2F4F" fontFamily={F}>*</text><text x="42.8" y="106" fontSize="13" fontWeight="800" fill="#0B2F4F" fontFamily={F}>*</text><text x="49.2" y="106" fontSize="13" fontWeight="800" fill="#0B2F4F" fontFamily={F}>*</text><text x="60.0" y="106" fontSize="13" fontWeight="800" fill="#0B2F4F" fontFamily={F}>*</text><text x="66.4" y="106" fontSize="13" fontWeight="800" fill="#0B2F4F" fontFamily={F}>*</text><text x="72.8" y="106" fontSize="13" fontWeight="800" fill="#0B2F4F" fontFamily={F}>*</text><text x="79.2" y="106" fontSize="13" fontWeight="800" fill="#0B2F4F" fontFamily={F}>*</text><text x="90.0" y="106" fontSize="13" fontWeight="800" fill="#0B2F4F" fontFamily={F}>*</text><text x="96.4" y="106" fontSize="13" fontWeight="800" fill="#0B2F4F" fontFamily={F}>*</text><text x="102.8" y="106" fontSize="13" fontWeight="800" fill="#0B2F4F" fontFamily={F}>*</text><text x="109.2" y="106" fontSize="13" fontWeight="800" fill="#0B2F4F" fontFamily={F}>*</text><text x="120.0" y="106" fontSize="13" fontWeight="800" fill="#0B2F4F" fontFamily={F}>*</text><text x="126.4" y="106" fontSize="13" fontWeight="800" fill="#0B2F4F" fontFamily={F}>*</text><text x="132.8" y="106" fontSize="13" fontWeight="800" fill="#0B2F4F" fontFamily={F}>*</text><text x="139.2" y="106" fontSize="13" fontWeight="800" fill="#0B2F4F" fontFamily={F}>*</text><rect className="pr-type t2" x="28" y="93" width="144" height="14" fill="#F4F7FA" />
      {/* Vence + CVC */}
      <rect x="24" y="116" width="30" height="5" rx="2.5" fill="#C7D5E1" />
      <rect x="24" y="125" width="72" height="18" rx="5" fill="#F4F7FA" stroke="#D6DFE7" />
      <text x="30.0" y="140" fontSize="13" fontWeight="800" fill="#0B2F4F" fontFamily={F}>*</text><text x="36.4" y="140" fontSize="13" fontWeight="800" fill="#0B2F4F" fontFamily={F}>*</text><text x="42.8" y="140" fontSize="13" fontWeight="800" fill="#0B2F4F" fontFamily={F}>*</text><text x="49.2" y="140" fontSize="13" fontWeight="800" fill="#0B2F4F" fontFamily={F}>*</text><rect className="pr-type t3" x="28" y="127" width="66" height="14" fill="#F4F7FA" />
      <rect x="104" y="116" width="22" height="5" rx="2.5" fill="#C7D5E1" />
      <rect x="104" y="125" width="72" height="18" rx="5" fill="#F4F7FA" stroke="#D6DFE7" />
      <text x="110.0" y="140" fontSize="13" fontWeight="800" fill="#0B2F4F" fontFamily={F}>*</text><text x="116.4" y="140" fontSize="13" fontWeight="800" fill="#0B2F4F" fontFamily={F}>*</text><text x="122.8" y="140" fontSize="13" fontWeight="800" fill="#0B2F4F" fontFamily={F}>*</text><rect className="pr-type t4" x="108" y="127" width="66" height="14" fill="#F4F7FA" />
      {/* Botón pagar */}
      <g className="pr-pay">
        <rect x="24" y="150" width="152" height="22" rx="7" fill="#E4572E" />
        <text x="100" y="165" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff" fontFamily={F}>Pagar</text>
      </g>
      {/* Tarjeta de crédito que entra */}
      <g className="pr-card">
        <rect x="196" y="38" width="94" height="60" rx="9" fill="#0B2F4F" />
        <rect x="196" y="50" width="94" height="10" fill="#164A74" />
        <rect x="204" y="66" width="16" height="12" rx="2.5" fill="#F2C14E" />
        <rect x="204" y="84" width="40" height="4" rx="2" fill="#BBD6E8" />
        <rect x="250" y="84" width="28" height="4" rx="2" fill="#BBD6E8" />
        <circle cx="266" cy="72" r="6" fill="#E4572E" /><circle cx="274" cy="72" r="6" fill="#F2C14E" opacity=".9" />
      </g>
      {/* Éxito */}
      <g className="pr-ok">
        <circle cx="244" cy="140" r="22" fill="#1B8A55" />
        <polyline points="233,140 241,148 256,131" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

/* ───────────── Paso 2 · Descarga en un celular ───────────── */
export function PhoneDownloadArt() {
  return (
    <svg className="pr-art" viewBox="0 0 300 190" role="img" aria-label="Un archivo descargándose en un celular">
      <rect x="92" y="8" width="116" height="176" rx="18" fill="#fff" stroke="#0B2F4F" strokeWidth="4" />
      <rect x="132" y="14" width="36" height="5" rx="2.5" fill="#0B2F4F" />
      <text x="150" y="44" textAnchor="middle" fontSize="11" fontWeight="800" fill="#0B2F4F" fontFamily={F}>Descargando…</text>
      {/* flechas que caen */}
      <g className="pr-drops">
        <path d="M52 24v22M52 46l-8-8M52 46l8-8" fill="none" stroke="#4FB3D0" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M248 24v22M248 46l-8-8M248 46l8-8" fill="none" stroke="#4FB3D0" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* archivo que entra al celular */}
      <g className="pr-file">
        <path d="M126 58h34l16 16v40a6 6 0 0 1-6 6h-44a6 6 0 0 1-6-6V64a6 6 0 0 1 6-6z" fill="#EAF1F7" stroke="#0B2F4F" strokeWidth="3.4" strokeLinejoin="round" />
        <path d="M160 58v16h16" fill="none" stroke="#0B2F4F" strokeWidth="3.4" strokeLinejoin="round" />
        <text x="147" y="104" textAnchor="middle" fontSize="12" fontWeight="800" fill="#E4572E" fontFamily={F}>ZIP</text>
      </g>
      <rect x="112" y="138" width="76" height="9" rx="4.5" fill="#D6DFE7" />
      <rect className="pr-bar" x="112" y="138" width="76" height="9" rx="4.5" fill="#1B8A55" />
      <text className="pr-pct p0" x="150" y="168" textAnchor="middle" fontSize="12" fontWeight="800" fill="#40566B" fontFamily={F}>Descargando</text>
      <g className="pr-done">
        <circle cx="150" cy="164" r="12" fill="#1B8A55" />
        <polyline points="144,164 148.5,168.5 156.5,159" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

/* ───────────── Paso 3 · Mano que aprieta «Publicar» + crecimiento con dinero ───────────── */
export function PublishTapArt() {
  return (
    <svg className="pr-art" viewBox="0 0 300 190" role="img" aria-label="Una mano presionando el botón Publicar en un teléfono y el negocio creciendo">
      <rect x="22" y="8" width="116" height="176" rx="18" fill="#fff" stroke="#0B2F4F" strokeWidth="4" />
      <rect x="62" y="14" width="36" height="5" rx="2.5" fill="#0B2F4F" />
      <rect x="32" y="26" width="96" height="50" rx="6" fill="#4FB3D0" />
      <path d="M32 62c12-8 20 6 32 0s20 6 32 0 20 6 32 0v14H32z" fill="#2E94B4" />
      <g fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round"><path d="M72 33v20M88 33v20M72 39h16M72 47h16" /></g>
      <rect x="32" y="84" width="70" height="6" rx="3" fill="#C7D5E1" />
      <rect x="32" y="95" width="52" height="6" rx="3" fill="#C7D5E1" />
      <g className="pr-btn">
        <rect x="32" y="110" width="96" height="30" rx="9" fill="#E4572E" />
        <text x="80" y="130" textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff" fontFamily={F}>Publicar</text>
      </g>
      <g className="pr-published">
        <rect x="32" y="110" width="96" height="30" rx="9" fill="#1B8A55" />
        <circle cx="52" cy="125" r="8" fill="#fff" />
        <polyline points="48,125 51,128 56,122" fill="none" stroke="#1B8A55" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <text x="66" y="129.5" fontSize="12" fontWeight="800" fill="#fff" fontFamily={F}>Publicado</text>
      </g>
      <circle className="pr-ripple" cx="80" cy="125" r="10" fill="none" stroke="#fff" strokeWidth="3" />
      {/* mano */}
      {/* crecimiento */}
      <rect className="pr-gbar g1" x="164" y="120" width="26" height="54" rx="4" fill="#9CC3DB" />
      <rect className="pr-gbar g2" x="198" y="92" width="26" height="82" rx="4" fill="#4FB3D0" />
      <rect className="pr-gbar g3" x="232" y="58" width="26" height="116" rx="4" fill="#1B8A55" />
      <g className="pr-coin">
        <circle cx="245" cy="34" r="19" fill="#F2C14E" stroke="#C99A2E" strokeWidth="2.5" />
        <text x="245" y="42" textAnchor="middle" fontSize="23" fontWeight="800" fill="#7A5A12" fontFamily={F}>$</text>
      </g>
    </svg>
  );
}

/* ───────────── «No importa cuánto sepas hoy»: solo el título se anima ───────────── */
export function FacilTitle({ kind }: { kind: "designer" | "langs" | "marketing" }) {
  if (kind === "designer") return <>No necesitas ser <span className="strike">diseñador</span>.</>;
  if (kind === "marketing") return <>Sin saber de <span className="uline">marketing</span>.</>;
  return <>Todo en dos idiomas. <span className="fl-pop"><LangFlags /></span></>;
}

/* ───────────── Sello de garantía (estático, minimalista) ───────────── */
function starPath(cx: number, cy: number, R: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? R : r;
    const a = (Math.PI * i) / 5 - Math.PI / 2;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}

export function GuaranteeBadge({ days }: { days: number }) {
  return (
    <svg className="gb-art" viewBox="0 46 240 204" role="img" aria-label={`${days} días de garantía`}>
      <text x="120" y="130" textAnchor="middle" fontSize="100" fontWeight="800" fill="#fff" fontFamily={F}>{days}</text>
      <text x="120" y="167" textAnchor="middle" fontSize="27" fontWeight="800" letterSpacing="2" fill="#fff" fontFamily={F}>DÍAS DE</text>
      <text x="120" y="197" textAnchor="middle" fontSize="27" fontWeight="800" letterSpacing="2" fill="#fff" fontFamily={F}>GARANTÍA</text>
      {[-2, -1, 0, 1, 2].map((k) => (
        <polygon key={k} points={starPath(120 + k * 28, 226, 12, 5)} fill="#F2C14E" />
      ))}
    </svg>
  );
}
