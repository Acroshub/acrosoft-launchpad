/**
 * Ajustes de la landing /estimados-lp que NO salen del prototipo. Van aparte de `estimadosStyles.ts` (que se REGENERA desde
 * Landing/index.html con port_estilos.py) para que regenerar no los borre. Todo acotado a `.est-page`.
 */
export const EST_CSS_EXTRA = `
/* «Listos en 3 pasos» dentro de la tarjeta de la oferta, debajo del texto de arriba. */
.est-page .est-offer-card .est-steps--offer{margin:0 0 22px;gap:8px}
.est-page .est-offer-card .est-steps--offer .est-step{padding:11px 13px}
/* Galería: dos videos en bucle (ver AdVideo). En celular se recortan los lados (2,5 anuncios a la vista, como antes); en pantallas anchas se ve entero. */
.est-page .est-vrow{position:relative;width:100%;height:228px;overflow:hidden;background:var(--bg)}
@media (min-width:700px){.est-page .est-vrow{height:auto;aspect-ratio:1280/534}}
.est-page .est-vid{display:block;width:100%;height:100%;object-fit:cover;background:var(--bg);pointer-events:none}
`;
