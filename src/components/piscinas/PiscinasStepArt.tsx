// Ilustraciones animadas (SVG + CSS) para «Proceso de compra y entrega» de la landing v1.
// Colores planos, sin brillos ni resplandores. Las animaciones se apagan con prefers-reduced-motion
// (regla global en piscinasStyles.ts).

export function PayArt() {
  const lines = [
    { x1: 48, x2: 84 }, { x1: 92, x2: 128 }, { x1: 136, x2: 172 }, { x1: 180, x2: 196 },
  ];
  return (
    <svg className="art" viewBox="0 0 240 150" role="img" aria-label="Alguien llenando los datos de su tarjeta en un pago seguro">
      <rect x="28" y="16" width="184" height="118" rx="14" fill="#0B2F4F" />
      <rect x="28" y="38" width="184" height="20" fill="#164A74" />
      <rect x="48" y="70" width="30" height="22" rx="4" fill="#F2C14E" />
      {lines.map((l, i) => (
        <line key={i} className="art-type" style={{ ["--i" as string]: i }} x1={l.x1} x2={l.x2} y1="112" y2="112" stroke="#BBD6E8" strokeWidth="6" strokeLinecap="round" pathLength={1} />
      ))}
      <g className="art-pop">
        <circle cx="196" cy="30" r="12" fill="#1B8A55" />
        <polyline points="190,30 195,35 203,25" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export function DownloadArt() {
  return (
    <svg className="art" viewBox="0 0 240 150" role="img" aria-label="Un archivo descargándose">
      <path d="M92 16h42l24 24v66a8 8 0 0 1-8 8H92a8 8 0 0 1-8-8V24a8 8 0 0 1 8-8z" fill="#fff" stroke="#0B2F4F" strokeWidth="4" strokeLinejoin="round" />
      <path d="M134 16v24h24" fill="none" stroke="#0B2F4F" strokeWidth="4" strokeLinejoin="round" />
      <rect x="98" y="52" width="48" height="6" rx="3" fill="#C7D5E1" />
      <rect x="98" y="66" width="36" height="6" rx="3" fill="#C7D5E1" />
      <g className="art-arrow">
        <circle cx="121" cy="98" r="15" fill="#E4572E" />
        <path d="M121 90v14M114 98l7 7 7-7" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <rect x="64" y="132" width="112" height="9" rx="4.5" fill="#D6DFE7" />
      <rect className="art-progress" x="64" y="132" width="112" height="9" rx="4.5" fill="#1B8A55" />
    </svg>
  );
}

export function GrowArt() {
  return (
    <svg className="art" viewBox="0 0 240 150" role="img" aria-label="Publicando un post, grabando un Reel y cerrando más ventas">
      <rect x="48" y="14" width="74" height="122" rx="12" fill="#0B2F4F" />
      <rect x="54" y="24" width="62" height="102" rx="6" fill="#fff" />
      <g className="art-post">
        <rect x="59" y="30" width="52" height="36" rx="4" fill="#4FB3D0" />
        <path d="M59 58l14-12 12 10 8-6 18 14v2H59z" fill="#0B2F4F" opacity=".35" />
        <rect x="59" y="72" width="40" height="5" rx="2.5" fill="#C7D5E1" />
        <rect x="59" y="82" width="52" height="5" rx="2.5" fill="#C7D5E1" />
      </g>
      <g className="art-reel">
        <circle cx="85" cy="108" r="11" fill="#E4572E" />
        <path d="M82 102l10 6-10 6z" fill="#fff" />
      </g>
      <rect className="art-bar b1" x="148" y="96" width="16" height="40" rx="3" fill="#9CC3DB" />
      <rect className="art-bar b2" x="170" y="76" width="16" height="60" rx="3" fill="#4FB3D0" />
      <rect className="art-bar b3" x="192" y="46" width="16" height="90" rx="3" fill="#1B8A55" />
      <g className="art-pop">
        <circle cx="200" cy="28" r="13" fill="#1B8A55" />
        <text x="200" y="34" textAnchor="middle" fontSize="17" fontWeight="800" fill="#fff" fontFamily="system-ui,sans-serif">$</text>
      </g>
    </svg>
  );
}

// ---- Animación «calendario vacío → post publicado → calendario lleno de citas» (v1, sección «No importa cuánto sepas hoy») ----
const CAL_X = 30;
const CAL_Y = 108;
const COL_W = 400 / 7;
const ROW_H = 44;
const CAL_CHIPS: { r: number; c: number; color: string }[] = [
  { r: 0, c: 1, color: "#4FB3D0" }, { r: 0, c: 4, color: "#E4572E" },
  { r: 1, c: 0, color: "#1B8A55" }, { r: 1, c: 2, color: "#4FB3D0" }, { r: 1, c: 5, color: "#0B2F4F" },
  { r: 2, c: 1, color: "#E4572E" }, { r: 2, c: 3, color: "#1B8A55" }, { r: 2, c: 4, color: "#4FB3D0" },
  { r: 3, c: 0, color: "#0B2F4F" }, { r: 3, c: 2, color: "#E4572E" }, { r: 3, c: 5, color: "#1B8A55" },
  { r: 4, c: 3, color: "#4FB3D0" },
];
const WEEK = ["L", "M", "M", "J", "V", "S", "D"];

export function CalendarArt() {
  return (
    <svg className="cal-art" viewBox="0 0 650 350" role="img" aria-label="Animación: un calendario vacío, un post publicado y el calendario llenándose de citas de limpieza de piscinas">
      {/* Calendario */}
      <rect x={CAL_X} y="40" width="400" height="296" rx="14" fill="#fff" stroke="#D6DFE7" strokeWidth="2" />
      <path d={`M${CAL_X} 84V54a14 14 0 0 1 14-14h372a14 14 0 0 1 14 14v30z`} fill="#0B2F4F" />
      {/* Icono de piscina (escalera + agua) */}
      <g transform="translate(48 48)" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3v12M19 3v12M9 3a4 4 0 0 1 4-2.5M19 3a4 4 0 0 0-4-2.5M9 8h10M9 12h10" />
        <path d="M2 24c3-3 5 3 8 0s5 3 8 0 5 3 8 0 3 1.5 4 0" stroke="#7CCBE3" />
      </g>
      <text x="92" y="68" fontSize="15" fontWeight="800" fill="#fff" fontFamily="'Plus Jakarta Sans',system-ui,sans-serif">Mi agenda de piscinas</text>
      <rect x="330" y="50" width="86" height="26" rx="13" fill="#164A74" />
      <text className="cal-c0" x="373" y="68" textAnchor="middle" fontSize="12.5" fontWeight="800" fill="#fff" fontFamily="'Plus Jakarta Sans',system-ui,sans-serif">0 citas</text>
      <text className="cal-c1" x="373" y="68" textAnchor="middle" fontSize="12.5" fontWeight="800" fill="#7FE0A8" fontFamily="'Plus Jakarta Sans',system-ui,sans-serif">12 citas</text>
      {/* Días de la semana */}
      {WEEK.map((d, i) => (
        <text key={i} x={CAL_X + COL_W * i + COL_W / 2} y="101" textAnchor="middle" fontSize="11" fontWeight="700" fill="#64798C" fontFamily="'Plus Jakarta Sans',system-ui,sans-serif">{d}</text>
      ))}
      {/* Cuadrícula */}
      {[0, 1, 2, 3, 4, 5].map((r) => (
        <line key={`h${r}`} x1={CAL_X} x2={CAL_X + 400} y1={CAL_Y + r * ROW_H} y2={CAL_Y + r * ROW_H} stroke="#E3E9EF" strokeWidth="1.5" />
      ))}
      {[1, 2, 3, 4, 5, 6].map((c) => (
        <line key={`v${c}`} x1={CAL_X + COL_W * c} x2={CAL_X + COL_W * c} y1={CAL_Y} y2={CAL_Y + 5 * ROW_H} stroke="#E3E9EF" strokeWidth="1.5" />
      ))}
      {Array.from({ length: 35 }, (_, n) => {
        const r = Math.floor(n / 7), c = n % 7;
        const day = n + 1;
        return day <= 31 ? (
          <text key={n} x={CAL_X + COL_W * c + 6} y={CAL_Y + r * ROW_H + 14} fontSize="10" fill="#8EA0B1" fontFamily="'Plus Jakarta Sans',system-ui,sans-serif">{day}</text>
        ) : null;
      })}
      {/* Citas que van apareciendo */}
      {CAL_CHIPS.map((ch, i) => (
        <g key={i} className={`cal-chip cal-chip-${i}`}>
          <rect x={CAL_X + COL_W * ch.c + 4} y={CAL_Y + ch.r * ROW_H + 20} width={COL_W - 8} height="17" rx="5" fill={ch.color} />
          <circle cx={CAL_X + COL_W * ch.c + 13} cy={CAL_Y + ch.r * ROW_H + 28.5} r="3" fill="#fff" />
          <rect x={CAL_X + COL_W * ch.c + 20} y={CAL_Y + ch.r * ROW_H + 26} width={COL_W - 34} height="5" rx="2.5" fill="#fff" opacity=".85" />
        </g>
      ))}

      {/* Flecha causa → efecto */}
      <g className="cal-arrow">
        <path d="M436 190h22" stroke="#E4572E" strokeWidth="4" strokeLinecap="round" />
        <path d="M452 181l10 9-10 9" fill="none" stroke="#E4572E" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* Post publicado */}
      <g className="cal-post">
        <rect x="468" y="50" width="172" height="250" rx="14" fill="#fff" stroke="#D6DFE7" strokeWidth="2" />
        <rect x="478" y="62" width="152" height="112" rx="8" fill="#4FB3D0" />
        <path d="M478 140c12-8 22 8 34 0s22 8 34 0 22 8 34 0 22 8 34 0 3 3 4 2v32H478z" fill="#2E94B4" />
        <g transform="translate(540 78)" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
          <path d="M6 0v28M26 0v28M6 8h20M6 18h20" />
        </g>
        <rect x="480" y="188" width="116" height="9" rx="4.5" fill="#C7D5E1" />
        <rect x="480" y="204" width="86" height="9" rx="4.5" fill="#C7D5E1" />
        <rect x="480" y="222" width="148" height="30" rx="8" fill="#E4572E" />
        <rect x="506" y="233" width="96" height="8" rx="4" fill="#fff" opacity=".9" />
        <g className="cal-badge">
          <rect x="520" y="266" width="104" height="26" rx="13" fill="#1B8A55" />
          <polyline points="532,279 538,285 548,273" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <text x="587" y="284" textAnchor="middle" fontSize="12" fontWeight="800" fill="#fff" fontFamily="'Plus Jakarta Sans',system-ui,sans-serif">Publicado</text>
        </g>
      </g>
    </svg>
  );
}
