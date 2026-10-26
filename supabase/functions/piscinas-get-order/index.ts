import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EBOOK_CATALOG, EBOOK_STORAGE_BUCKET } from "../_shared/ebook-catalog.ts";
import { purchaseCustomData } from "../_shared/meta-capi.ts";
import { purchaseTrackingValue } from "../_shared/stripe-balance.ts";

// ─── Pública — usada por /piscinas-ty para mostrar el resumen de la compra del kit y ─
// generar el link de descarga del ZIP (adaptada de toefl-get-order, sin plataforma con contraseña). El "token"
// de acceso es el propio Stripe session_id: es criptográficamente aleatorio y solo lo tiene quien acaba de pagar
// (llega en la URL de redirect de Stripe y en el email de confirmación).
//
// Dónde está el ZIP (en este orden):
//  1. secret PISCINAS_ZIP_URL  → URL https:// donde Daniel lo hospede (si el límite de Storage no deja subirlo).
//  2. secret PISCINAS_ZIP_PATH → ruta dentro del bucket privado (sobrescribe la del catálogo, sin tocar código).
//  3. product.storagePath del catálogo → URL firmada de Supabase Storage (1 hora).

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const PRODUCT_SLUG = "piscinas";
const SIGNED_URL_TTL = 3600; // 1 hora — de sobra para que el comprador descargue

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

  // Solo órdenes de este producto: un session_id de otro producto no abre esta descarga.
  if (error || !order || order.product_slug !== PRODUCT_SLUG) {
    return new Response(JSON.stringify({ error: "order not found" }), { status: 404, headers: corsHeaders });
  }

  const product = Object.hasOwn(EBOOK_CATALOG, order.product_slug) ? EBOOK_CATALOG[order.product_slug] : undefined;
  if (!product || !product.filename) {
    return new Response(JSON.stringify({ error: "unknown product" }), { status: 500, headers: corsHeaders });
  }

  let downloadUrl: string | null = null;
  const externalUrl = Deno.env.get("PISCINAS_ZIP_URL")?.trim();
  if (externalUrl && /^https:\/\//i.test(externalUrl)) {
    downloadUrl = externalUrl;
  } else {
    const storagePath = Deno.env.get("PISCINAS_ZIP_PATH")?.trim() || product.storagePath;
    if (storagePath) {
      const { data: signed, error: signError } = await supabase.storage
        .from(EBOOK_STORAGE_BUCKET)
        .createSignedUrl(storagePath, SIGNED_URL_TTL, { download: product.filename });
      if (signError) console.error(`[piscinas-get-order] no se pudo firmar ${storagePath}: ${signError.message}`);
      downloadUrl = signed?.signedUrl ?? null;
    }
  }
  if (!downloadUrl) {
    console.error("[piscinas-get-order] el ZIP no está disponible (¿se subió al bucket o se configuró PISCINAS_ZIP_URL?)");
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
      // custom_data del Purchase para el pixel de Meta (hoy sin pixel: la thank-you no lo usa). Es el mismo que mandaría
      // stripe-webhook por Conversions API cuando exista `meta` en el catálogo.
      tracking: purchaseCustomData(tracking.value, tracking.currency, {
        productId: order.product_slug,
        productName: product.shortName,
        orderId: sessionId,
        itemPrice: order.amount_total / 100,
      }),
      download: { filename: product.filename, url: downloadUrl },
    }),
    // no-store: la respuesta lleva una URL firmada; que no se quede en cachés.
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } },
  );
});
