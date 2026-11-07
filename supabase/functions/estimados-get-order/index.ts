import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EBOOK_CATALOG } from "../_shared/ebook-catalog.ts";
import { purchaseCustomData } from "../_shared/meta-capi.ts";
import { purchaseTrackingValue } from "../_shared/stripe-balance.ts";

// ─── Pública — usada por /estimados-ty (la página del regalo: llamada de consultoría) para: ─
//  · mostrar la confirmación de la compra, y
//  · devolver el nombre y el correo con los que se pagó, para precargarlos en el calendario de la llamada: la persona solo
//    escribe su WhatsApp y el CRM recibe nombre + correo de la compra + ese WhatsApp.
// NO entrega el kit: el enlace de descarga (Google Drive, secret ESTIMADOS_ZIP_URL) viaja solo en el correo de confirmación que manda
// stripe-webhook por Resend, así que esta función pública nunca lo expone.
// El "token" de acceso es el propio Stripe session_id: es criptográficamente aleatorio y solo lo tiene quien acaba de pagar
// (llega en la URL de redirect de Stripe y en el email de confirmación).

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const PRODUCT_SLUG = "estimados";

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

  // select("*") a propósito: customer_name lo agrega una migración posterior; si todavía no está aplicada, pedirla por nombre
  // haría fallar la consulta entera y la página no mostraría ni la compra. Con "*" simplemente llega sin nombre.
  const { data: order, error } = await supabase
    .from("ebook_orders")
    .select("*")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();

  // Solo órdenes de este producto: un session_id de otro producto no abre esta página.
  if (error || !order || order.product_slug !== PRODUCT_SLUG) {
    return new Response(JSON.stringify({ error: "order not found" }), { status: 404, headers: corsHeaders });
  }

  const product = Object.hasOwn(EBOOK_CATALOG, order.product_slug) ? EBOOK_CATALOG[order.product_slug] : undefined;
  if (!product) {
    return new Response(JSON.stringify({ error: "unknown product" }), { status: 500, headers: corsHeaders });
  }

  const tracking = purchaseTrackingValue({
    amountTotal: order.amount_total,
    currency: order.currency,
    netAmount: order.net_amount,
    netCurrency: order.net_currency,
  });

  const customerName = typeof order.customer_name === "string" && order.customer_name.trim() ? order.customer_name.trim() : null;

  return new Response(
    JSON.stringify({
      productName: product.name,
      name: customerName,
      email: order.customer_email,
      amountTotal: order.amount_total,
      currency: order.currency,
      // custom_data del Purchase para el pixel de Meta (hoy sin pixel: la página no lo usa hasta que exista ESTIMADOS_PIXEL_ID).
      // Es el mismo que mandaría stripe-webhook por Conversions API cuando exista `meta` en el catálogo.
      tracking: purchaseCustomData(tracking.value, tracking.currency, {
        productId: order.product_slug,
        productName: product.shortName,
        orderId: sessionId,
        itemPrice: order.amount_total / 100,
      }),
    }),
    // no-store: la respuesta lleva datos personales; que no se queden en cachés.
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } },
  );
});
