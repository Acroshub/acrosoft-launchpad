// Ilustraciones SVG del hero animado por scroll (v4). Todo se controla con las variables CSS --p (progreso del hero) y
// --s/--e (tramo de cada pieza) puestas en línea; el CSS calcula --r (0→1). Colores planos, sin brillos.
import type { CSSProperties } from "react";

const t = (s: number, e: number) => ({ "--s": s, "--e": e }) as CSSProperties;
const FONT = "'Plus Jakarta Sans',system-ui,sans-serif";

/** Olas continuas al fondo de la escena 1 (movimiento propio, no depende del scroll). */
export function WavesArt() {
  return (
    <svg className="waves" viewBox="0 0 1200 140" preserveAspectRatio="none" aria-hidden="true">
      <g className="wv wv1"><path d="M0 70c100-40 200 40 300 0s200-40 300 0 200 40 300 0 200-40 300 0V140H0z" fill="#4FB3D0" opacity=".22" /><path d="M1200 70c100-40 200 40 300 0s200-40 300 0 200 40 300 0 200-40 300 0V140H1200z" fill="#4FB3D0" opacity=".22" /></g>
      <g className="wv wv2"><path d="M0 92c100-30 200 30 300 0s200-30 300 0 200 30 300 0 200-30 300 0V140H0z" fill="#4FB3D0" opacity=".16" /><path d="M1200 92c100-30 200 30 300 0s200-30 300 0 200 30 300 0 200-30 300 0V140H1200z" fill="#4FB3D0" opacity=".16" /></g>
    </svg>
  );
}

/** Check 1 — «Sin ser diseñador»: paleta y pincel que se dibujan, con una X que cae al final. */
export function NoDesignerArt() {
  return (
    <svg className="chk-art" viewBox="0 0 96 96" aria-hidden="true">
      <circle cx="48" cy="48" r="44" fill="#fff" />
      <g fill="none" stroke="#0B2F4F" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path className="draw rs" style={t(0.3, 0.34)} pathLength={1} d="M48 18c-16 0-28 11-28 25 0 12 9 19 19 19 5 0 6-3 6-6 0-4 3-6 7-6h8c8 0 11-6 11-12 0-13-10-20-23-20z" />
      </g>
      <circle className="rs pop" style={t(0.31, 0.35)} cx="36" cy="38" r="4" fill="#E4572E" />
      <circle className="rs pop" style={t(0.32, 0.36)} cx="50" cy="32" r="4" fill="#F2C14E" />
      <circle className="rs pop" style={t(0.33, 0.37)} cx="63" cy="40" r="4" fill="#1B8A55" />
      <g className="rs slash" style={t(0.345, 0.375)}><path d="M20 76L76 20" stroke="#E4572E" strokeWidth="6" strokeLinecap="round" /></g>
    </svg>
  );
}

/** Check 2 — «Sin saber de marketing»: megáfono que se dibuja con ondas y X. */
export function NoMarketingArt() {
  return (
    <svg className="chk-art" viewBox="0 0 96 96" aria-hidden="true">
      <circle cx="48" cy="48" r="44" fill="#fff" />
      <g fill="none" stroke="#0B2F4F" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path className="draw rs" style={t(0.36, 0.4)} pathLength={1} d="M24 40v16h10l22 12V28L34 40z" />
        <path className="draw rs" style={t(0.385, 0.42)} pathLength={1} d="M64 38c4 3 4 17 0 20M70 31c8 6 8 28 0 34" stroke="#4FB3D0" />
      </g>
      <g className="rs slash" style={t(0.405, 0.435)}><path d="M20 76L76 20" stroke="#E4572E" strokeWidth="6" strokeLinecap="round" /></g>
    </svg>
  );
}

/** Check 3 — «Diseños virales»: barras que suben y corazón. */
export function ViralArt() {
  return (
    <svg className="chk-art" viewBox="0 0 96 96" aria-hidden="true">
      <circle cx="48" cy="48" r="44" fill="#fff" />
      <rect className="rs grow" style={t(0.42, 0.46)} x="22" y="56" width="14" height="20" rx="3" fill="#9CC3DB" />
      <rect className="rs grow" style={t(0.435, 0.475)} x="41" y="44" width="14" height="32" rx="3" fill="#4FB3D0" />
      <rect className="rs grow" style={t(0.45, 0.49)} x="60" y="30" width="14" height="46" rx="3" fill="#1B8A55" />
      <path className="rs pop" style={t(0.47, 0.5)} d="M48 30c-3-6-12-4-12 3 0 6 12 12 12 12s12-6 12-12c0-7-9-9-12-3z" fill="#E4572E" transform="translate(0 -6) scale(.8) translate(12 0)" />
    </svg>
  );
}

const DAYS = Array.from({ length: 28 }, (_, i) => i);
const GAPS = [3, 8, 11, 16, 20, 24]; // «huecos» de la agenda
const KIT = [
  { i: 3, color: "#4FB3D0", glyph: "post" }, { i: 8, color: "#E4572E", glyph: "tag" }, { i: 11, color: "#1B8A55", glyph: "reel" },
  { i: 16, color: "#0B2F4F", glyph: "phone" }, { i: 20, color: "#4FB3D0", glyph: "post" }, { i: 24, color: "#E4572E", glyph: "tag" },
];
const cellXY = (i: number) => ({ x: 22 + (i % 7) * 44, y: 74 + Math.floor(i / 7) * 46 });

function Glyph({ g, cx, cy }: { g: string; cx: number; cy: number }) {
  const common = { fill: "none", stroke: "#fff", strokeWidth: 2.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (g === "post") return <g {...common}><rect x={cx - 8} y={cy - 7} width="16" height="14" rx="2.5" /><path d={`M${cx - 8} ${cy + 3}l5-5 4 4 3-3 4 4`} /></g>;
  if (g === "tag") return <g {...common}><path d={`M${cx - 8} ${cy - 2}l7-7h8v8l-7 7z`} /><circle cx={cx + 3} cy={cy - 4} r="1.4" fill="#fff" /></g>;
  if (g === "reel") return <g {...common}><rect x={cx - 8} y={cy - 7} width="16" height="14" rx="3" /><path d={`M${cx - 2} ${cy - 3}l6 3-6 3z`} fill="#fff" /></g>;
  return <g {...common}><path d={`M${cx - 5} ${cy - 8}h10v16h-10z`} /><path d={`M${cx - 1.5} ${cy + 5}h3`} /></g>;
}

/** Escena 3 — agenda con huecos que se llenan al avanzar el texto. */
export function AgendaArt() {
  return (
    <svg className="agenda-art" viewBox="-4 -4 338 278" role="img" aria-label="Una agenda de piscinas con huecos que se va llenando de citas">
      <g className="rs fadein" style={t(0.5, 0.55)}>
        <rect x="6" y="6" width="318" height="258" rx="16" fill="#fff" />
        <path d="M6 54V22A16 16 0 0 1 22 6h286a16 16 0 0 1 16 16v32z" fill="#0B2F4F" />
        <g transform="translate(24 16)" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"><path d="M7 2v13M17 2v13M7 7h10M7 12h10" /><path d="M0 22c3-3 5 3 8 0s5 3 8 0 5 3 8 0" stroke="#7CCBE3" /></g>
        <text x="62" y="36" fontSize="14" fontWeight="800" fill="#fff" fontFamily={FONT}>Mi agenda de piscinas</text>
        {DAYS.map((i) => { const { x, y } = cellXY(i); return <rect key={i} x={x} y={y} width="38" height="38" rx="7" fill="#F1F5F9" />; })}
      </g>
      {/* huecos que se marcan */}
      {GAPS.map((i, k) => { const { x, y } = cellXY(i); return (
        <rect key={`g${i}`} className="rs gap" style={t(0.625 + k * 0.004, 0.66 + k * 0.004)} x={x} y={y} width="38" height="38" rx="7" fill="none" stroke="#E4572E" strokeWidth="2.5" strokeDasharray="5 4" />
      ); })}
      {/* piezas del kit que llenan los huecos */}
      {KIT.map((k, n) => { const { x, y } = cellXY(k.i); return (
        <g key={`k${n}`} className="rs fill-in" style={t(0.69 + n * 0.012, 0.73 + n * 0.012)}>
          <rect x={x} y={y} width="38" height="38" rx="7" fill={k.color} />
          <Glyph g={k.glyph} cx={x + 19} cy={y + 19} />
        </g>
      ); })}
    </svg>
  );
}

/** Escena 4 — destellos y anillo alrededor del bundle. */
export function SparkRing() {
  const stars = [[20, 30, 0], [88, 12, 0.5], [92, 70, 1], [10, 78, 1.5], [50, 4, 0.8], [52, 94, 0.2]];
  return (
    <svg className="spark-ring" viewBox="0 0 100 100" aria-hidden="true">
      <circle className="ring-draw rs" style={t(0.82, 0.92)} cx="50" cy="50" r="46" pathLength={1} fill="none" stroke="#4FB3D0" strokeWidth="1.2" />
      <circle className="ring-spin" cx="50" cy="50" r="40" fill="none" stroke="#F2C14E" strokeWidth=".8" strokeDasharray="1.5 5" strokeLinecap="round" />
      {stars.map(([x, y, d], i) => (
        <path key={i} className="twinkle" style={{ animationDelay: `${d}s` } as CSSProperties} d={`M${x} ${(y as number) - 4}l1.2 2.8 2.8 1.2-2.8 1.2L${x} ${(y as number) + 4}l-1.2-2.8-2.8-1.2 2.8-1.2z`} fill="#F2C14E" />
      ))}
    </svg>
  );
}
