// ─── Lógica pura de resolución de pagos detectados por Claude ─────────────────
// Sin I/O: no toca Supabase ni la red, así se puede testear con datos sintéticos
// (ver payment-resolution.test.ts). index.ts trae los datos (variantes/planes del
// producto) y le pasa el resultado a estas funciones para decidir qué variante o
// plan aplica y a qué precio/moneda se registra la venta.

// ─── Parsear marcador [PAYMENT_DETECTED|campo:valor|campo:valor|...] ─────────
export type ParsedPayment = {
  product_id: string;
  variant_id: string | null;
  plan_id: string | null;
  amount: number;
  method_type: string;
};

export function parseAndStripPayment(text: string): { text: string; payment: ParsedPayment | null } {
  const match = text.match(/\[PAYMENT_DETECTED\|([^\]]+)\]/i);
  if (!match) return { text, payment: null };
  const data: Record<string, string> = {};
  for (const pair of match[1].split("|")) {
    const colonIdx = pair.indexOf(":");
    if (colonIdx === -1) continue;
    const key = pair.slice(0, colonIdx).trim();
    const value = pair.slice(colonIdx + 1).trim();
    if (key) data[key] = value;
  }
  if (!data.product_id || data.amount === undefined) return { text, payment: null };
  const idOrNone = (v: string | undefined) => (!v || v.toLowerCase() === "none") ? null : v;
  return {
    text: text.replace(match[0], "").trim(),
    payment: {
      product_id: data.product_id,
      variant_id: idOrNone(data.variant_id),
      plan_id: idOrNone(data.plan_id),
      amount: parseFloat(data.amount),
      method_type: data.method_type ?? "other",
    },
  };
}

// ─── Resolver variante ─────────────────────────────────────────────────────
export type VariantRow = {
  id: string;
  name: string;
  price_override: number | null;
  discount_pct: number | null;
  stock: number | null;
};

export type VariantResolution = {
  variantId: string | null;
  variantName: string;          // " (Nombre)" o "" — se concatena tal cual al nombre del producto
  variantPrice: number | null;  // precio final, con descuento ya aplicado
  variantStock: number | null;
  // El id pedido (por Claude, no por auto-selección) no corresponde a ninguna
  // variante real de este producto — quien llama debe tratar esto como "sin
  // variante" y no dejar el id inválido en la venta (rompería la FK al insertar).
  invalidRequestedId: boolean;
};

export function resolveVariant(
  variants: VariantRow[],
  requestedVariantId: string | null,
  baseProductPrice: number,
  baseProductDiscountPct: number,
): VariantResolution {
  const empty: VariantResolution = { variantId: null, variantName: "", variantPrice: null, variantStock: null, invalidRequestedId: false };

  // Auto-seleccionar solo si Claude no indicó variante y el producto tiene exactamente una.
  const targetId = requestedVariantId ?? (variants.length === 1 ? variants[0].id : null);
  if (!targetId) return empty;

  const row = variants.find(v => v.id === targetId);
  if (!row) {
    // Solo puede pasar si targetId vino de Claude (la auto-selección siempre
    // apunta a un elemento real de `variants`) — o sea, id inventado/de otro producto.
    return { ...empty, invalidRequestedId: !!requestedVariantId };
  }

  const base = row.price_override != null ? row.price_override : baseProductPrice;
  const disc = (row.discount_pct ?? 0) > 0
    ? (row.discount_pct ?? 0)
    : (row.price_override == null ? baseProductDiscountPct : 0);
  const price = disc > 0 ? +(base * (1 - disc / 100)).toFixed(2) : base;

  return {
    variantId: row.id,
    variantName: ` (${row.name})`,
    variantPrice: price,
    variantStock: row.stock ?? null,
    invalidRequestedId: false,
  };
}

// ─── Resolver plan de precio ────────────────────────────────────────────────
export type PlanRow = {
  id: string;
  price: number;
  currency: string;
  discount_pct: number | null;
};

export type PlanResolution = {
  planId: string | null;
  planPrice: number | null;     // precio final, con descuento ya aplicado
  planCurrency: string | null;
  // Había 2+ planes y no se pudo determinar cuál — ni Claude lo indicó ni el
  // monto coincide (±10%) con uno solo. Quien llama debe forzar revisión manual
  // en vez de auto-confirmar sin haber podido validar el monto contra nada real.
  ambiguous: boolean;
  invalidRequestedId: boolean;
};

export function resolvePlan(plans: PlanRow[], requestedPlanId: string | null, amount: number): PlanResolution {
  const empty: PlanResolution = { planId: null, planPrice: null, planCurrency: null, ambiguous: false, invalidRequestedId: false };
  if (plans.length === 0) return empty;

  const finalPriceOf = (p: PlanRow) => {
    const disc = p.discount_pct ?? 0;
    return disc > 0 ? +(p.price * (1 - disc / 100)).toFixed(2) : p.price;
  };

  let targetId = requestedPlanId;

  if (!targetId) {
    if (plans.length === 1) {
      targetId = plans[0].id;
    } else {
      // Varios planes y Claude no indicó cuál — último recurso: si el monto del
      // comprobante coincide (±10%) con el precio final de un solo plan, usar ese.
      const amountMatches = plans.filter(p => {
        const fp = finalPriceOf(p);
        return fp > 0 && Math.abs(amount / fp - 1) < 0.1;
      });
      if (amountMatches.length === 1) {
        targetId = amountMatches[0].id;
      } else {
        return { ...empty, ambiguous: true };
      }
    }
  }

  const row = plans.find(p => p.id === targetId);
  if (!row) {
    return { ...empty, invalidRequestedId: !!requestedPlanId };
  }

  return {
    planId: row.id,
    planPrice: finalPriceOf(row),
    planCurrency: row.currency,
    ambiguous: false,
    invalidRequestedId: false,
  };
}

// ─── Precio esperado y moneda final de la venta ────────────────────────────
// Prioridad: variante > plan > precio base del producto/servicio. Es seguro
// llamarla incluso si tanto variantPrice como planPrice vienen no-nulos (no
// debería pasar si el caller resuelve el plan solo cuando no hay variante,
// pero la prioridad queda garantizada igual por construcción, no por disciplina
// del caller).
export function computeExpectedPriceAndCurrency(params: {
  variantPrice: number | null;
  planPrice: number | null;
  planCurrency: string | null;
  baseProductPrice: number;
  baseProductDiscountPct: number;
  baseProductCurrency: string | null;
}): { expectedPrice: number; saleCurrency: string } {
  const { variantPrice, planPrice, planCurrency, baseProductPrice, baseProductDiscountPct, baseProductCurrency } = params;
  const baseFinal = baseProductDiscountPct > 0
    ? +(baseProductPrice * (1 - baseProductDiscountPct / 100)).toFixed(2)
    : baseProductPrice;
  const expectedPrice = variantPrice ?? planPrice ?? baseFinal;
  // La moneda del plan solo aplica cuando el precio también vino del plan — si
  // ganó la variante, la variante siempre hereda la moneda del producto base
  // (crm_product_variants no tiene columna de moneda propia).
  const saleCurrency = (variantPrice == null && planCurrency) ? planCurrency : (baseProductCurrency ?? "USD");
  return { expectedPrice, saleCurrency };
}
