// Diagrama de 2 pasos del upsell 1: «Tu kit» (listo, con check) → «Campaña en Facebook e Instagram» (pendiente).
// SVG con animación propia (check que se dibuja, punteado que avanza, puntos de espera). Sin glow.
const F = "'Plus Jakarta Sans',system-ui,sans-serif";

type FlowCard = { l1: string; l2: string; sub: string };
const KIT_LEFT: FlowCard = { l1: "Tu kit de ofertas", l2: "y publicaciones", sub: "Ya es tuyo" };
const KIT_RIGHT: FlowCard = { l1: "Tu campaña de anuncios", l2: "lista para publicar", sub: "Ya configurada por nosotros" };

/** Diagrama listo → pendiente. Por defecto, el del upsell 1; el upsell 2 pasa sus propios textos. */
export function KitToCampaignArt({ left = KIT_LEFT, right = KIT_RIGHT, label = "Paso 1 listo: tu kit de ofertas y publicaciones. Paso 2 pendiente: tu campaña de anuncios, ya configurada y lista para publicar." }: { left?: FlowCard; right?: FlowCard; label?: string }) {
  return (
    <div className="u1flow" role="img" aria-label={label}>
      <svg className="u1flow-svg" viewBox="0 0 640 230" aria-hidden="true">
        {/* Tarjeta 1: kit (listo) */}
        <g>
          <rect x="6" y="14" width="272" height="196" rx="16" fill="#EAF6EF" stroke="#1B8A55" strokeWidth="3" />
          <g transform="translate(24 30)">
            <rect x="0" y="0" width="70" height="86" rx="8" fill="#fff" stroke="#0B2F4F" strokeWidth="3" />
            <rect x="9" y="10" width="52" height="30" rx="4" fill="#4FB3D0" />
            <path d="M9 34c9-6 15 4 26 0s15 4 26 0v6H9z" fill="#2E94B4" />
            <rect x="9" y="48" width="38" height="5" rx="2.5" fill="#C7D5E1" />
            <rect x="9" y="58" width="28" height="5" rx="2.5" fill="#C7D5E1" />
            <rect x="9" y="68" width="44" height="9" rx="4.5" fill="#E4572E" />
          </g>
          <g className="u1f-badge">
            <circle cx="108" cy="46" r="20" fill="#1B8A55" />
            <path className="u1f-check" pathLength={1} d="M98 46l7 7 12-14" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <text x="142" y="52" fontSize="18" fontWeight="800" fill="#1B8A55" fontFamily={F}>LISTO</text>
          <text x="24" y="146" fontSize="21" fontWeight="800" fill="#0B2238" fontFamily={F}>{left.l1}</text>
          <text x="24" y="173" fontSize="21" fontWeight="800" fill="#0B2238" fontFamily={F}>{left.l2}</text>
          <text x="24" y="198" fontSize="16" fontWeight="600" fill="#40566B" fontFamily={F}>{left.sub}</text>
        </g>
        {/* Flecha */}
        <g className="u1f-arrow">
          <path d="M290 112h40" stroke="#64798C" strokeWidth="4" strokeLinecap="round" />
          <path d="M322 100l14 12-14 12" fill="none" stroke="#64798C" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        {/* Tarjeta 2: campaña (pendiente) */}
        <g>
          <rect className="u1f-dash" x="350" y="14" width="284" height="196" rx="16" fill="#fff" stroke="#E4572E" strokeWidth="3" strokeDasharray="10 8" />
          <g transform="translate(368 30)">
            <rect x="0" y="0" width="86" height="86" rx="14" fill="#F4F7FA" stroke="#D6DFE7" strokeWidth="2" />
            <circle cx="43" cy="43" r="20" fill="none" stroke="#1D5FD1" strokeWidth="5" />
            <path d="M43 31v12l9 6" fill="none" stroke="#1D5FD1" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <rect x="474" y="34" width="120" height="30" rx="15" fill="#FFF1EB" stroke="#E4572E" strokeWidth="2" />
          <text x="534" y="55" textAnchor="middle" fontSize="16" fontWeight="800" fill="#E4572E" fontFamily={F}>PENDIENTE</text>
          <circle className="u1f-dot d1" cx="582" cy="49" r="0" fill="#E4572E" />
          <text x="368" y="146" fontSize="21" fontWeight="800" fill="#0B2238" fontFamily={F}>{right.l1}</text>
          <text x="368" y="173" fontSize="21" fontWeight="800" fill="#0B2238" fontFamily={F}>{right.l2}</text>
          <text x="368" y="198" fontSize="16" fontWeight="600" fill="#40566B" fontFamily={F}>{right.sub}</text>
        </g>
      </svg>

    </div>
  );
}

/** Upsell 2 (quien ya compró el upsell 1): 3 tarjetas verticales — kit listo, campaña creada lista, gestión pendiente. */
export function KitCampaignCareArt() {
  const done = (y: number, l1: string, l2: string) => (
    <g>
      <rect x="4" y={y} width="392" height="100" rx="14" fill="#EAF6EF" stroke="#1B8A55" strokeWidth="3" />
      <g className="u1f-badge"><circle cx="46" cy={y + 50} r="22" fill="#1B8A55" /><path className="u1f-check" pathLength={1} d={`M36 ${y + 50}l7 7 13-15`} fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /></g>
      <text x="88" y={y + 28} fontSize="14" fontWeight="800" letterSpacing="1" fill="#1B8A55" fontFamily={F}>LISTO</text>
      <text x="88" y={y + 55} fontSize="20" fontWeight="800" fill="#0B2238" fontFamily={F}>{l1}</text>
      <text x="88" y={y + 80} fontSize="20" fontWeight="800" fill="#0B2238" fontFamily={F}>{l2}</text>
    </g>
  );
  const down = (y: number) => (
    <g className="u1f-arrow-v"><path d={`M200 ${y}v14`} stroke="#64798C" strokeWidth="4" strokeLinecap="round" /><path d={`M192 ${y + 8}l8 9 8-9`} fill="none" stroke="#64798C" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></g>
  );
  return (
    <div className="u1flow u1flow-3" role="img" aria-label="Listo: tu kit de ofertas y publicaciones. Listo: tu campaña creada. Pendiente: administración de tus anuncios, con vigilancia diaria y optimización semanal.">
      <svg className="u1flow-svg" viewBox="0 0 400 380" aria-hidden="true">
        {done(4, "Tu kit de ofertas", "y publicaciones")}
        {down(108)}
        {done(132, "Tu campaña", "de anuncios creada")}
        {down(236)}
        <g>
          <rect className="u1f-dash" x="4" y="260" width="392" height="116" rx="14" fill="#fff" stroke="#E4572E" strokeWidth="3" strokeDasharray="10 8" />
          <g transform="translate(22 288)">
            <rect x="0" y="0" width="48" height="48" rx="10" fill="#F4F7FA" stroke="#D6DFE7" strokeWidth="2" />
            <circle cx="24" cy="24" r="12" fill="none" stroke="#1D5FD1" strokeWidth="4" />
            <path d="M24 17v7l5 4" fill="none" stroke="#1D5FD1" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <rect x="88" y="272" width="104" height="24" rx="12" fill="#FFF1EB" stroke="#E4572E" strokeWidth="2" />
          <text x="140" y="289" textAnchor="middle" fontSize="13" fontWeight="800" fill="#E4572E" fontFamily={F}>PENDIENTE</text>
          <text x="88" y="322" fontSize="18.5" fontWeight="800" fill="#0B2238" fontFamily={F}>Administración de tus anuncios</text>
          <text x="88" y="346" fontSize="14.5" fontWeight="600" fill="#40566B" fontFamily={F}>Vigilancia diaria y optimización</text>
          <text x="88" y="365" fontSize="14.5" fontWeight="600" fill="#40566B" fontFamily={F}>semanal</text>
        </g>
      </svg>
    </div>
  );
}
