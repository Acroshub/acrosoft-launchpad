/**
 * Ajustes de la landing /estimados-lp que NO salen del prototipo. Van aparte de `estimadosStyles.ts` (que se REGENERA desde
 * Landing/index.html con port_estilos.py) para que regenerar no los borre. Todo acotado a `.est-page`.
 */
export const EST_CSS_EXTRA = `
/* Mientras carga un anuncio de la galería, un gris suave y no un cuadro blanco que parece roto. */
.est-page .est-ad{background:#E9EDE8}
/* «Listos en 3 pasos» dentro de la tarjeta de la oferta, debajo del texto de arriba. */
.est-page .est-offer-card .est-steps--offer{margin:0 0 22px;gap:8px}
.est-page .est-offer-card .est-steps--offer .est-step{padding:11px 13px}
`;
