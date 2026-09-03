import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { normalizeWaIdentifier, recipientField } from "../_shared/wa-recipient.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const GRAPH_VERSION = "v21.0";
const SIGNED_URL_TTL = 3600; // 1 hora — suficiente para que WhatsApp descargue el archivo

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-key",
};

// Extrae el path de storage a partir de la URL completa de Supabase
// Ej: https://xxx.supabase.co/storage/v1/object/public/product-deliverables/uid/pid/file.pdf
//  → uid/pid/file.pdf
function extractStoragePath(deliverableUrl: string): string | null {
  try {
    const url = new URL(deliverableUrl);
    const marker = "/product-deliverables/";
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return null;
    return url.pathname.slice(idx + marker.length);
  } catch {
    return null;
  }
}

function cleanPhone(phone: string): string {
  return normalizeWaIdentifier(phone);
}

type DeliverableFile = { url: string; filename: string };

async function sendWaMessage(
  phoneNumberId: string,
  accessToken: string,
  payload: Record<string, unknown>,
): Promise<{ ok: true; wa_message_id: string | null } | { ok: false; error: string }> {
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    return { ok: false, error: `WhatsApp API error ${res.status}: ${errText}` };
  }
  const resJson = await res.json();
  return { ok: true, wa_message_id: resJson?.messages?.[0]?.id ?? null };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405, headers: corsHeaders });

  // Auth: acepta JWT de usuario O header interno de service role
  const authHeader = req.headers.get("Authorization") ?? "";
  const internalKey = req.headers.get("x-internal-key");
  const isInternal = internalKey === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  let callerId: string | null = null;
  if (!isInternal) {
    const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (error || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });
    }
    callerId = user.id;
  }

  let body: { sale_id: string };
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: "bad json" }), { status: 400, headers: corsHeaders }); }

  const { sale_id } = body;
  if (!sale_id) {
    return new Response(JSON.stringify({ error: "missing sale_id" }), { status: 400, headers: corsHeaders });
  }

  // 1. Cargar la venta con producto y conversación
  const { data: sale, error: saleErr } = await supabase
    .from("crm_sales")
    .select("id, user_id, product_id, wa_conversation_id, deliverable_sent_at")
    .eq("id", sale_id)
    .single();

  if (saleErr || !sale) {
    return new Response(JSON.stringify({ error: "sale not found" }), { status: 404, headers: corsHeaders });
  }

  // Verificar acceso si es llamada de usuario (no interna)
  if (!isInternal && callerId !== sale.user_id) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: corsHeaders });
  }

  if (!sale.product_id) {
    return new Response(JSON.stringify({ error: "sale has no product" }), { status: 400, headers: corsHeaders });
  }

  if (!sale.wa_conversation_id) {
    return new Response(JSON.stringify({ error: "sale has no whatsapp conversation" }), { status: 400, headers: corsHeaders });
  }

  // 2. Cargar el producto para obtener el entregable
  const { data: product, error: prodErr } = await supabase
    .from("crm_products")
    .select("name, deliverable_type, deliverable_url, deliverable_files, deliverable_text")
    .eq("id", sale.product_id)
    .single();

  if (prodErr || !product) {
    return new Response(JSON.stringify({ error: "product not found" }), { status: 404, headers: corsHeaders });
  }

  if (!product.deliverable_type) {
    return new Response(JSON.stringify({ error: "product has no deliverable" }), { status: 400, headers: corsHeaders });
  }

  // 3. Cargar la conversación para obtener el teléfono del destinatario
  const { data: conv, error: convErr } = await supabase
    .from("crm_wa_conversations")
    .select("phone")
    .eq("id", sale.wa_conversation_id)
    .single();

  if (convErr || !conv) {
    return new Response(JSON.stringify({ error: "conversation not found" }), { status: 404, headers: corsHeaders });
  }

  // 4. Cargar credenciales del Agente IA del tenant
  const { data: config, error: configErr } = await supabase
    .from("crm_ai_agent_config")
    .select("phone_number_id, access_token")
    .eq("user_id", sale.user_id)
    .single();

  if (configErr || !config?.phone_number_id || !config?.access_token) {
    return new Response(JSON.stringify({ error: "agent not configured" }), { status: 400, headers: corsHeaders });
  }

  const recipientPhone = cleanPhone(conv.phone);

  // 5. Construir y enviar los mensajes según tipo de entregable — un mensaje de
  // documento por cada archivo si es "file" (soporta múltiples PDFs/ZIPs por producto)
  if (product.deliverable_type === "file") {
    const files: DeliverableFile[] =
      Array.isArray(product.deliverable_files) && product.deliverable_files.length > 0
        ? product.deliverable_files
        : product.deliverable_url
        ? [{
            url: product.deliverable_url,
            filename: `${product.name.replace(/[^a-zA-Z0-9\s]/g, "").trim().replace(/\s+/g, "-")}.${(product.deliverable_url.split(".").pop() ?? "pdf").toLowerCase()}`,
          }]
        : [];

    if (files.length === 0) {
      return new Response(JSON.stringify({ error: "deliverable file url missing" }), { status: 400, headers: corsHeaders });
    }

    for (const file of files) {
      // Extraer el path de storage y generar signed URL temporal
      const storagePath = extractStoragePath(file.url);
      if (!storagePath) {
        return new Response(JSON.stringify({ error: "could not extract storage path" }), { status: 500, headers: corsHeaders });
      }

      const { data: signed, error: signErr } = await supabase.storage
        .from("product-deliverables")
        .createSignedUrl(storagePath, SIGNED_URL_TTL);

      if (signErr || !signed?.signedUrl) {
        return new Response(JSON.stringify({ error: "could not generate signed url" }), { status: 500, headers: corsHeaders });
      }

      const sendResult = await sendWaMessage(config.phone_number_id, config.access_token, {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        ...recipientField(recipientPhone),
        type: "document",
        document: { link: signed.signedUrl, filename: file.filename },
      });

      if (!sendResult.ok) {
        return new Response(JSON.stringify({ ok: false, error: sendResult.error }), { status: 502, headers: corsHeaders });
      }

      await supabase.from("crm_wa_messages").insert({
        conversation_id: sale.wa_conversation_id,
        role: "assistant",
        content: file.filename,
        media_type: "document",
        media_url: file.url,
        wa_message_id: sendResult.wa_message_id,
        delivery_status: "sent",
      });
    }
  } else {
    // deliverable_type === "text"
    if (!product.deliverable_text) {
      return new Response(JSON.stringify({ error: "deliverable text missing" }), { status: 400, headers: corsHeaders });
    }

    const sendResult = await sendWaMessage(config.phone_number_id, config.access_token, {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      ...recipientField(recipientPhone),
      type: "text",
      text: { preview_url: true, body: product.deliverable_text },
    });

    if (!sendResult.ok) {
      return new Response(JSON.stringify({ ok: false, error: sendResult.error }), { status: 502, headers: corsHeaders });
    }

    await supabase.from("crm_wa_messages").insert({
      conversation_id: sale.wa_conversation_id,
      role: "assistant",
      content: product.deliverable_text,
      wa_message_id: sendResult.wa_message_id,
      delivery_status: "sent",
    });
  }

  // 6. Marcar entregable como enviado en la venta
  await supabase
    .from("crm_sales")
    .update({ deliverable_sent_at: new Date().toISOString() })
    .eq("id", sale_id);

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
});
