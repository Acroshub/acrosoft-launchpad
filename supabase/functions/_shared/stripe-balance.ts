// Neto real que le llega a la cuenta por una compra (monto - comisión de
// Stripe). El payload de checkout.session.completed no lo trae: hay que pedir
// el balance_transaction del cargo por API, con una restricted key de solo
// lectura. Una key por entorno, igual que los webhook secrets (test/live).

export type StripeNet = { net: number; currency: string };

/** Devuelve null ante cualquier falla — el llamador cae al monto bruto en vez de romper el flujo de compra. */
export async function fetchStripeNet(paymentIntentId: string, livemode: boolean): Promise<StripeNet | null> {
  const envName = livemode ? "STRIPE_RESTRICTED_KEY" : "STRIPE_RESTRICTED_KEY_TEST";
  const key = Deno.env.get(envName);
  if (!key) {
    console.warn(`[stripe-balance] ${envName} no configurado, el tracking usa el monto bruto`);
    return null;
  }

  try {
    const res = await fetch(
      `https://api.stripe.com/v1/payment_intents/${encodeURIComponent(paymentIntentId)}?expand[]=latest_charge.balance_transaction`,
      { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(3000) },
    );
    if (!res.ok) {
      console.warn("[stripe-balance] Stripe respondió", res.status, await res.text());
      return null;
    }
    const balanceTransaction = (await res.json())?.latest_charge?.balance_transaction;
    if (
      !balanceTransaction || typeof balanceTransaction !== "object" ||
      typeof balanceTransaction.net !== "number" || typeof balanceTransaction.currency !== "string"
    ) {
      console.warn("[stripe-balance] balance_transaction no disponible para", paymentIntentId);
      return null;
    }
    return { net: balanceTransaction.net, currency: balanceTransaction.currency };
  } catch (err) {
    console.warn("[stripe-balance] no se pudo consultar Stripe:", err);
    return null;
  }
}

/**
 * Valor que se manda a Meta en el Purchase: el neto si lo tenemos, si no el
 * bruto. Lo usan el webhook (Conversions API) y frances-get-order (pixel del
 * navegador) para que los dos lados de un mismo event_id lleven el mismo valor.
 */
export function purchaseTrackingValue(order: {
  amountTotal: number;
  currency: string;
  netAmount: number | null;
  netCurrency: string | null;
}): { value: number; currency: string } {
  if (order.netAmount != null && order.netCurrency) {
    return { value: order.netAmount / 100, currency: order.netCurrency.toUpperCase() };
  }
  return { value: order.amountTotal / 100, currency: order.currency.toUpperCase() };
}
