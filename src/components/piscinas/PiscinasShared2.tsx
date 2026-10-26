import { Icon } from "@/components/piscinas/PiscinasShared";
import { PISCINAS_GUARANTEE_DAYS, PISCINAS_LIST_PRICE, PISCINAS_PRICE } from "@/lib/piscinasConfig";
import { SHOW_LIST_PRICE } from "@/lib/piscinasVersionsConfig";

// Piezas extra de las landings v2/v3 (lo compartido de v1 se importa de PiscinasShared.tsx, solo lectura).

export const PRICE_LABEL = `US$${PISCINAS_PRICE}`;
export const CTA_LABEL = `Quiero mi kit por ${PRICE_LABEL}`;

const showListPrice = SHOW_LIST_PRICE && PISCINAS_LIST_PRICE !== null && PISCINAS_LIST_PRICE > PISCINAS_PRICE;

/** Precio de venta. El precio de lista tachado solo sale si SHOW_LIST_PRICE está activo y LIST_PRICE tiene valor. */
export function PriceBlock() {
  return (
    <div className="pc-price-block">
      <div className="pc-price">
        {showListPrice && <span className="old">US${PISCINAS_LIST_PRICE}</span>}
        <span className="amount">{PRICE_LABEL}</span>
      </div>
      <p className="pc-price-unit">pago único · sin membresías ni renovaciones</p>
    </div>
  );
}

/** Sello de garantía (bloque propio de la v2 y de la v3). */
export function GuaranteeSeal() {
  return (
    <div className="seal" aria-hidden="true">
      <span className="seal-n">{PISCINAS_GUARANTEE_DAYS}</span>
      <span className="seal-t">días de garantía</span>
    </div>
  );
}

/** Lista con checks. */
export function CheckList({ items, className = "" }: { items: React.ReactNode[]; className?: string }) {
  return (
    <ul className={`check-list ${className}`}>
      {items.map((t, i) => (
        <li key={i}><Icon name="i-check" /><span>{t}</span></li>
      ))}
    </ul>
  );
}
