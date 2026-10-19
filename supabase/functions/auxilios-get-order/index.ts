import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EBOOK_CATALOG } from "../_shared/ebook-catalog.ts";
import { platformAccess } from "../_shared/ebook-order.ts";
import { purchaseCustomData } from "../_shared/meta-capi.ts";
import { purchaseTrackingValue } from "../_shared/stripe-balance.ts";

// ─── Pública — usada por /auxilios-ty para mostrar el resumen de la compra y dar ─
// acceso a la webapp (contraseña compartida). Sin descarga: el ebook y los bonos viven en la app. El "token"
// de acceso es el propio Stripe session_id: es criptográficamente aleatorio y
// solo lo tiene quien acaba de pagar (llega en la URL de redirect de Stripe y en
// el email de confirmación). Es la misma protección que ya tiene la descarga: la
// contraseña de la plataforma no se expone a nadie que no tenga esa URL.

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405, headers: corsHeaders });
  }

  const sessionId = new URL(req.url).searchParams.get("session_id");
  if (!sessionId) {
    return new Response(JSON.stringify({ error: "missing session_id" }), { status: 400, headers: corsHeaders });
  }

  const { data: order, error } = await supabase
    .from("ebook_orders")
    .select("product_slug, customer_email, amount_total, currency, net_amount, net_currency, created_at")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();

  if (error || !order) {
    return new Response(JSON.stringify({ error: "order not found" }), { status: 404, headers: corsHeaders });
  }

  const product = Object.hasOwn(EBOOK_CATALOG, order.product_slug) ? EBOOK_CATALOG[order.product_slug] : undefined;
  if (!product) {
    return new Response(JSON.stringify({ error: "unknown product" }), { status: 500, headers: corsHeaders });
  }

  const platform = platformAccess(product);
  if (platform && !platform.password) {
    console.error(`[auxilios-get-order] ${order.product_slug}: falta el secret de la contraseña de la plataforma`);
  }

  const tracking = purchaseTrackingValue({
    amountTotal: order.amount_total,
    currency: order.currency,
    netAmount: order.net_amount,
    netCurrency: order.net_currency,
  });

  return new Response(
    JSON.stringify({
      productName: product.name,
      email: order.customer_email,
      amountTotal: order.amount_total,
      currency: order.currency,
      // custom_data del Purchase para el pixel de Meta: el mismo que manda
      // stripe-webhook por Conversions API (valor neto si se pudo obtener, más
      // producto y orden).
      tracking: purchaseCustomData(tracking.value, tracking.currency, {
        productId: order.product_slug,
        productName: product.shortName,
        orderId: sessionId,
        itemPrice: order.amount_total / 100,
      }),
      // null si el producto no trae plataforma o falta configurar la contraseña.
      platform: platform?.password ? { name: platform.name, path: platform.path, password: platform.password } : null,
    }),
    // no-store: la respuesta lleva una contraseña; que no se quede en cachés.
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } },
  );
});
