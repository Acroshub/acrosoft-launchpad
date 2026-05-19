import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const RESEND_API_KEY  = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM     = `Acrosoft <${Deno.env.get("RESEND_FROM_EMAIL") ?? "noreply@acrosoftlabs.com"}>`;
const LOW_STOCK_THRESHOLD = 5;

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: RESEND_FROM, to: [to], subject, html }),
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const { product_id, variant_id, user_id } = await req.json();
  if (!product_id || !user_id) return new Response("missing fields", { status: 400 });

  try {
    // Obtener email del tenant
    const { data: profile } = await supabase
      .from("crm_business_profile")
      .select("contact_email")
      .eq("user_id", user_id)
      .single();

    const toEmail: string | null = profile?.contact_email ?? null;
    if (!toEmail) return new Response(JSON.stringify({ ok: true, reason: "no_email" }), { status: 200 });

    if (variant_id) {
      // ── Variante ──────────────────────────────────────────────────────────
      const { data: variant } = await supabase
        .from("crm_product_variants")
        .select("name, stock, notified_low_stock, notified_out_of_stock, product_id")
        .eq("id", variant_id)
        .single();

      if (!variant || variant.stock === null) {
        return new Response(JSON.stringify({ ok: true, reason: "no_stock_tracking" }), { status: 200 });
      }

      const { data: product } = await supabase
        .from("crm_products")
        .select("name")
        .eq("id", variant.product_id)
        .single();

      const itemName = `${product?.name ?? "Producto"} — ${variant.name}`;
      const stock: number = variant.stock;

      if (stock <= LOW_STOCK_THRESHOLD && stock > 0 && !variant.notified_low_stock) {
        await supabase.from("crm_product_variants").update({ notified_low_stock: true }).eq("id", variant_id);
        await sendEmail(
          toEmail,
          `Alerta de stock bajo: ${itemName}`,
          `<p>La variante <strong>${itemName}</strong> tiene solo <strong>${stock} unidad${stock !== 1 ? "es" : ""}</strong> disponible${stock !== 1 ? "s" : ""}.</p><p>Considera reabastecer pronto.</p>`,
        );
      }

      if (stock <= 0 && !variant.notified_out_of_stock) {
        await supabase.from("crm_product_variants").update({ notified_out_of_stock: true }).eq("id", variant_id);
        await sendEmail(
          toEmail,
          `Alerta de stock en cero: ${itemName}`,
          `<p>La variante <strong>${itemName}</strong> ha llegado a <strong>0 unidades</strong>.</p><p>Esta opción ya no aparece disponible en el catálogo.</p>`,
        );
      }
    } else {
      // ── Producto sin variantes ─────────────────────────────────────────────
      const { data: product } = await supabase
        .from("crm_products")
        .select("name, stock, stock_enabled, has_variants, notified_low_stock, notified_out_of_stock")
        .eq("id", product_id)
        .single();

      if (!product || !product.stock_enabled || product.stock === null || product.has_variants) {
        return new Response(JSON.stringify({ ok: true, reason: "no_stock_tracking" }), { status: 200 });
      }

      const stock: number = product.stock;

      if (stock <= LOW_STOCK_THRESHOLD && stock > 0 && !product.notified_low_stock) {
        await supabase.from("crm_products").update({ notified_low_stock: true }).eq("id", product_id);
        await sendEmail(
          toEmail,
          `Alerta de stock bajo: ${product.name}`,
          `<p>El producto <strong>${product.name}</strong> tiene solo <strong>${stock} unidad${stock !== 1 ? "es" : ""}</strong> disponible${stock !== 1 ? "s" : ""}.</p><p>Considera reabastecer pronto.</p>`,
        );
      }

      if (stock <= 0 && !product.notified_out_of_stock) {
        await supabase.from("crm_products").update({ notified_out_of_stock: true }).eq("id", product_id);
        await sendEmail(
          toEmail,
          `Alerta de stock en cero: ${product.name}`,
          `<p>El producto <strong>${product.name}</strong> ha llegado a <strong>0 unidades</strong>.</p><p>Ya no aparece en el catálogo público.</p>`,
        );
      }
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err: any) {
    console.error("[notify-stock-alert]", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
