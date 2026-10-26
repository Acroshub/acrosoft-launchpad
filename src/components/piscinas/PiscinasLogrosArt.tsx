// SVG animados (bucle propio) para las tarjetas de «En los próximos 7 días, vas a:». Colores planos, sin brillos.
const L = "#BBD6E8"; // trazo claro (fondo oscuro)

/** 1 — Publicar con tu marca: post con tu logo que aparece y un corazón. */
export function BrandPostArt() {
  return (
    <svg className="lg-art" viewBox="0 0 64 64" aria-hidden="true">
      <rect x="10" y="6" width="44" height="52" rx="7" fill="none" stroke={L} strokeWidth="3" />
      <rect x="15" y="11" width="34" height="22" rx="3" fill="#4FB3D0" opacity=".85" />
      <path d="M15 28c5-4 9 3 14 0s9 3 14 0 4 1 6 0v5H15z" fill="#2E94B4" />
      <g className="lg-logo"><circle cx="24" cy="22" r="6" fill="#F2C14E" /><path d="M21.5 22.2l2 2 3.5-4" fill="none" stroke="#0B2F4F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></g>
      <rect className="lg-line l1" x="15" y="38" width="28" height="4" rx="2" fill={L} />
      <rect className="lg-line l2" x="15" y="46" width="20" height="4" rx="2" fill={L} />
      <path className="lg-heart" d="M46 45c-1.2-2.4-4.6-1.6-4.6 1 0 2.4 4.6 4.6 4.6 4.6s4.6-2.2 4.6-4.6c0-2.6-3.4-3.4-4.6-1z" fill="#E4572E" />
    </svg>
  );
}

/** 2 — Una oferta que sí puedes cumplir: etiqueta que se balancea con destellos. */
export function OfferTagArt() {
  return (
    <svg className="lg-art" viewBox="0 0 64 64" aria-hidden="true">
      <g className="lg-tag">
        <path d="M10 30L32 8h22v22L32 52 10 30z" fill="none" stroke={L} strokeWidth="3" strokeLinejoin="round" />
        <circle cx="44" cy="18" r="3.4" fill={L} />
        <path d="M24 33l8-8M24 25l1 1M31 32l1 1" stroke="#F2C14E" strokeWidth="3.4" strokeLinecap="round" />
        <circle cx="25" cy="26" r="2.4" fill="#F2C14E" /><circle cx="32.5" cy="33.5" r="2.4" fill="#F2C14E" />
      </g>
      <path className="lg-spark s1" d="M52 38l1.6 3.4 3.4 1.6-3.4 1.6L52 48l-1.6-3.4L47 43l3.4-1.6z" fill="#F2C14E" />
      <path className="lg-spark s2" d="M12 12l1.2 2.6 2.6 1.2-2.6 1.2L12 19.6l-1.2-2.6L8.2 15.8l2.6-1.2z" fill="#E4572E" />
    </svg>
  );
}

/** 3 — Tu primer video Reel: cuadro vertical con play que late, punto REC y barra de progreso. */
export function ReelArt() {
  return (
    <svg className="lg-art" viewBox="0 0 64 64" aria-hidden="true">
      <rect x="16" y="5" width="32" height="54" rx="7" fill="none" stroke={L} strokeWidth="3" />
      <circle className="lg-rec" cx="23" cy="13" r="3" fill="#E4572E" />
      <g className="lg-play"><circle cx="32" cy="31" r="10" fill="#E4572E" /><path d="M29 26.5l9 4.5-9 4.5z" fill="#fff" /></g>
      <rect x="21" y="49" width="22" height="3.5" rx="1.75" fill={L} opacity=".35" />
      <rect className="lg-prog" x="21" y="49" width="22" height="3.5" rx="1.75" fill="#F2C14E" />
    </svg>
  );
}

/** 4 — Contestar llamadas sin improvisar: teléfono con globo de diálogo que se marca con check. */
export function CallArt() {
  return (
    <svg className="lg-art" viewBox="0 0 64 64" aria-hidden="true">
      <g className="lg-handset"><path d="M10 14h8l4 10-5 4a28 28 0 0 0 14 14l4-5 10 4v8a5 5 0 0 1-5 5C26 54 8 36 8 19a5 5 0 0 1 2-5z" fill="none" stroke={L} strokeWidth="3" strokeLinejoin="round" /></g>
      <g className="lg-bubble">
        <path d="M32 6h24a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4H46l-6 5v-5h-8a4 4 0 0 1-4-4V10a4 4 0 0 1 4-4z" fill="#1B8A55" />
        <path className="lg-check" d="M38 17.5l4 4 8-8" pathLength={1} fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
