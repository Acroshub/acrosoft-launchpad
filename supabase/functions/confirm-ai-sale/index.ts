import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const GRAPH_VERSION = "v21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405, headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "no auth" }), { status: 401, headers: corsHeaders });

  const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (authErr || !user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });

  let body: { sale_id: string; action: "confirm" | "reject" };
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: "bad json" }), { status: 400, headers: corsHeaders }); }

  const { sale_id, action } = body;
  if (!sale_id || !["confirm", "reject"].includes(action)) {
    return new Response(JSON.stringify({ error: "missing fields" }), { status: 400, headers: corsHeaders });
  }

  // Cargar la venta (incluir product_variant_id para el decremento de stock)
  const { data: sale, error: saleErr } = await supabase
    .from("crm_sales")
    .select("id, user_id, product_id, product_variant_id, wa_conversation_id, status, is_ai_sale")
    .eq("id", sale_id)
    .single();

  if (saleErr || !sale) return new Response(JSON.stringify({ error: "sale not found" }), { status: 404, headers: corsHeaders });

  // Solo el owner puede confirmar/rechazar
  if (sale.user_id !== user.id) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: corsHeaders });
  }

  if (sale.status !== "pending_review") {
    return new Response(JSON.stringify({ error: "sale is not pending_review" }), { status: 400, headers: corsHeaders });
  }

  if (action === "confirm") {
    await supabase
      .from("crm_sales")
      .update({ status: "confirmed", is_paid: true, paid_at: new Date().toISOString() })
      .eq("id", sale_id);

    // Decrementar stock del producto o variante (awaited — asegura atomicidad antes de responder)
    if (sale.product_id) {
      await supabase.rpc("decrement_sale_stock", {
        p_product_id: sale.product_id,
        p_variant_id: sale.product_variant_id ?? null,
      }).catch(err => console.error("[confirm-ai-sale] stock decrement error:", err));
    }

    // Enviar entregable (fire-and-forget — no bloquea la respuesta al usuario)
    if (sale.wa_conversation_id) {
      supabase.functions.invoke("send-deliverable", { body: { sale_id } }).catch(() => {});
    }

    return new Response(JSON.stringify({ ok: true, action: "confirmed" }), { status: 200, headers: corsHeaders });
  }

  // action === "reject"
  await supabase.from("crm_sales").update({ status: "rejected" }).eq("id", sale_id);

  // Notificar al cliente por WhatsApp si hay conversación
  if (sale.wa_conversation_id) {
    const { data: conv } = await supabase
      .from("crm_wa_conversations")
      .select("phone")
      .eq("id", sale.wa_conversation_id)
      .single();

    const { data: config } = await supabase
      .from("crm_ai_agent_config")
      .select("phone_number_id, access_token")
      .eq("user_id", sale.user_id)
      .single();

    if (conv?.phone && config?.phone_number_id && config?.access_token) {
      const rejectMsg = "Hola, revisamos tu comprobante pero no pudimos verificar el pago. Por favor contáctanos para aclarar la situación.";
      await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${config.phone_number_id}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${config.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: conv.phone.replace(/\D/g, ""),
          type: "text",
          text: { body: rejectMsg },
        }),
      }).catch(() => {});

      await supabase.from("crm_wa_messages").insert({
        conversation_id: sale.wa_conversation_id,
        role: "assistant",
        content: rejectMsg,
      });
    }
  }

  return new Response(JSON.stringify({ ok: true, action: "rejected" }), { status: 200, headers: corsHeaders });
});
