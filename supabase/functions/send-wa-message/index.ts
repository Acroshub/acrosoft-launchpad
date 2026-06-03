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

  let body: {
    conversation_id: string;
    text?: string;
    media_url?: string;
    media_type?: "image" | "document";
    media_filename?: string;
    reply_to_id?: string;
  };
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: "bad json" }), { status: 400, headers: corsHeaders }); }

  const { conversation_id, text, media_url, media_type, media_filename, reply_to_id } = body;

  // Debe tener texto o media
  if (!conversation_id || (!text?.trim() && !media_url)) {
    return new Response(JSON.stringify({ error: "missing fields" }), { status: 400, headers: corsHeaders });
  }

  // Cargar la conversación
  const { data: conv, error: convErr } = await supabase
    .from("crm_wa_conversations")
    .select("phone, user_id")
    .eq("id", conversation_id)
    .single();

  if (convErr || !conv) {
    return new Response(JSON.stringify({ error: "conversation not found" }), { status: 404, headers: corsHeaders });
  }

  // Verificar acceso: dueño o staff con perm_agente_ia.read
  const isOwner = conv.user_id === user.id;
  let isAuthorizedStaff = false;
  if (!isOwner) {
    const { data: staffRow } = await supabase
      .from("crm_staff")
      .select("perm_agente_ia")
      .eq("owner_user_id", conv.user_id)
      .eq("staff_user_id", user.id)
      .maybeSingle();
    isAuthorizedStaff = !!(staffRow?.perm_agente_ia as any)?.read;
  }

  if (!isOwner && !isAuthorizedStaff) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: corsHeaders });
  }

  // Cargar credenciales del agente
  const { data: config, error: configErr } = await supabase
    .from("crm_ai_agent_config")
    .select("phone_number_id, access_token")
    .eq("user_id", conv.user_id)
    .single();

  if (configErr || !config?.phone_number_id || !config?.access_token) {
    return new Response(JSON.stringify({ error: "agent not configured" }), { status: 400, headers: corsHeaders });
  }

  // Resolver wa_message_id y preview del mensaje citado (para context reply nativo WhatsApp)
  let replyWaMessageId: string | null = null;
  let repliedToPreview: string | null = null;
  if (reply_to_id) {
    const { data: replyMsg } = await supabase
      .from("crm_wa_messages")
      .select("wa_message_id, content, media_type")
      .eq("id", reply_to_id)
      .maybeSingle();
    replyWaMessageId = replyMsg?.wa_message_id ?? null;
    if (replyMsg) {
      repliedToPreview = replyMsg.media_type === "image" ? "[Imagen]"
        : replyMsg.media_type === "document" ? "[Documento]"
        : replyMsg.media_type === "video" ? "[Video]"
        : replyMsg.media_type === "audio" ? "[Mensaje de voz]"
        : (replyMsg.content ?? null);
    }
  }

  // Construir payload para WhatsApp y registro en DB
  let waPayload: Record<string, unknown>;
  let dbContent: string;
  let dbMediaType: string | null = null;
  let dbMediaUrl: string | null = null;

  if (media_url && media_type) {
    dbMediaType = media_type;
    dbMediaUrl = media_url;

    if (media_type === "image") {
      dbContent = "[Imagen]";
      waPayload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: conv.phone,
        ...(replyWaMessageId ? { context: { message_id: replyWaMessageId } } : {}),
        type: "image",
        image: { link: media_url },
      };
    } else {
      const fname = media_filename ?? "archivo";
      dbContent = fname;
      waPayload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: conv.phone,
        ...(replyWaMessageId ? { context: { message_id: replyWaMessageId } } : {}),
        type: "document",
        document: { link: media_url, filename: fname },
      };
    }
  } else {
    dbContent = text!.trim();
    waPayload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: conv.phone,
      ...(replyWaMessageId ? { context: { message_id: replyWaMessageId } } : {}),
      type: "text",
      text: { preview_url: false, body: text!.trim() },
    };
  }

  // Insertar en DB
  const { data: savedMsg, error: insertErr } = await supabase
    .from("crm_wa_messages")
    .insert({
      conversation_id,
      role: "human",
      content: dbContent,
      ...(dbMediaType ? { media_type: dbMediaType } : {}),
      ...(dbMediaUrl ? { media_url: dbMediaUrl } : {}),
      ...(reply_to_id ? { reply_to_id } : {}),
      ...(repliedToPreview ? { replied_to_preview: repliedToPreview } : {}),
    })
    .select()
    .single();

  if (insertErr || !savedMsg) {
    return new Response(JSON.stringify({ error: "db error" }), { status: 500, headers: corsHeaders });
  }

  // Enviar por Graph API
  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${config.phone_number_id}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(waPayload),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      const is24hError = errText.includes("131047");
      // Extraer código de error de Meta para mejor diagnóstico
      let metaCode = "";
      try { metaCode = JSON.parse(errText)?.error?.code ?? ""; } catch { /* noop */ }
      const sendError = is24hError ? "24h_window_expired"
        : metaCode ? `Graph ${res.status} (${metaCode})`
        : `Graph ${res.status}`;
      console.error(`[send-wa-message] Meta error: ${errText}`);
      await supabase
        .from("crm_wa_messages")
        .update({ send_error: sendError })
        .eq("id", savedMsg.id);
      return new Response(
        JSON.stringify({ ok: false, error: is24hError ? "24h_window_expired" : errText }),
        { status: 502, headers: corsHeaders }
      );
    }

    const json = await res.json();
    const wa_message_id = json?.messages?.[0]?.id;
    if (wa_message_id) {
      await supabase.from("crm_wa_messages").update({ wa_message_id, delivery_status: "sent" }).eq("id", savedMsg.id);
    }

    await supabase
      .from("crm_wa_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversation_id);

    return new Response(JSON.stringify({ ok: true, message_id: savedMsg.id }), { status: 200, headers: corsHeaders });

  } catch (err: any) {
    await supabase.from("crm_wa_messages").update({ send_error: err.message }).eq("id", savedMsg.id);
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 502, headers: corsHeaders });
  }
});
