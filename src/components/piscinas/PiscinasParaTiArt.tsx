// Íconos SVG animados (movimiento propio en bucle) para «Esto es para ti si…». Colores planos, sin brillos.
// Con «reducir movimiento» las animaciones se detienen (regla en PIS_CAL_CSS).

/** Un mensaje esperando respuesta: burbuja con tres puntos que rebotan. */
export function WaitingChatArt() {
  return (
    <svg className="pt-art" viewBox="0 0 48 48" aria-hidden="true">
      <path d="M8 9h32a3 3 0 0 1 3 3v17a3 3 0 0 1-3 3H21l-8 7v-7H8a3 3 0 0 1-3-3V12a3 3 0 0 1 3-3z" fill="none" stroke="#0F7C9B" strokeWidth="2.6" strokeLinejoin="round" />
      <circle className="pt-dot d1" cx="16" cy="21" r="2.6" fill="#0F7C9B" />
      <circle className="pt-dot d2" cx="24" cy="21" r="2.6" fill="#0F7C9B" />
      <circle className="pt-dot d3" cx="32" cy="21" r="2.6" fill="#0F7C9B" />
    </svg>
  );
}

/** No sabes cómo publicar: megáfono con ondas que salen y un «?» que flota. */
export function MegaphoneArt() {
  return (
    <svg className="pt-art" viewBox="0 0 48 48" aria-hidden="true">
      <g className="pt-mega">
        <path d="M7 19v10h7l15 8V11l-15 8z" fill="none" stroke="#0F7C9B" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
        <path d="M14 29l2 9h5l-2-8" fill="none" stroke="#0F7C9B" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
      </g>
      <path className="pt-wave w1" d="M34 19c3 3 3 7 0 10" fill="none" stroke="#E4572E" strokeWidth="2.6" strokeLinecap="round" />
      <path className="pt-wave w2" d="M38 15c5 5 5 13 0 18" fill="none" stroke="#E4572E" strokeWidth="2.6" strokeLinecap="round" />
      <text className="pt-q" x="41" y="12" fontSize="13" fontWeight="800" fill="#E4572E" fontFamily="'Plus Jakarta Sans',system-ui,sans-serif">?</text>
    </svg>
  );
}

/** Te llaman por el precio: auricular que vibra con anillos de timbre. */
export function RingingPhoneArt() {
  return (
    <svg className="pt-art" viewBox="0 0 48 48" aria-hidden="true">
      <g className="pt-ring-phone">
        <path d="M13 8h6l3 8-4 3a22 22 0 0 0 11 11l3-4 8 3v6a4 4 0 0 1-4 4C23 39 9 25 9 12a4 4 0 0 1 4-4z" fill="none" stroke="#0F7C9B" strokeWidth="2.6" strokeLinejoin="round" />
      </g>
      <path className="pt-ripple r1" d="M30 9a10 10 0 0 1 9 9" fill="none" stroke="#E4572E" strokeWidth="2.6" strokeLinecap="round" />
      <path className="pt-ripple r2" d="M30 3a16 16 0 0 1 15 15" fill="none" stroke="#E4572E" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}
