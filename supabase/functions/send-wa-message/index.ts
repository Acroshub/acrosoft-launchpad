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

// Envío manual desde el dashboard en modo HUMAN
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405, headers: corsHeaders });
  }

  // Obtener el usuario autenticado del JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "no auth" }), { status: 401, headers: corsHeaders });
  }

  const { data: { user }, error: authErr } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", "")
  );
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });
  }

  let body: { conversation_id: string; text: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "bad json" }), { status: 400, headers: corsHeaders });
  }

  const { conversation_id, text } = body;
  if (!conversation_id || !text?.trim()) {
    return new Response(JSON.stringify({ error: "missing fields" }), { status: 400, headers: corsHeaders });
  }

  // Verificar que la conversación pertenece al usuario
  const { data: conv, error: convErr } = await supabase
    .from("crm_wa_conversations")
    .select("phone, user_id")
    .eq("id", conversation_id)
    .eq("user_id", user.id)
    .single();

  if (convErr || !conv) {
    return new Response(JSON.stringify({ error: "conversation not found" }), { status: 404, headers: corsHeaders });
  }

  // Cargar credenciales del tenant
  const { data: config, error: configErr } = await supabase
    .from("crm_ai_agent_config")
    .select("phone_number_id, access_token")
    .eq("user_id", user.id)
    .single();

  if (configErr || !config?.phone_number_id || !config?.access_token) {
    return new Response(JSON.stringify({ error: "agent not configured" }), { status: 400, headers: corsHeaders });
  }

  // Insertar el mensaje en DB inmediatamente (visible en dashboard)
  const { data: savedMsg, error: insertErr } = await supabase
    .from("crm_wa_messages")
    .insert({
      conversation_id,
      role: "human",
      content: text.trim(),
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
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: conv.phone,
          type: "text",
          text: { preview_url: false, body: text.trim() },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      // Error 131047 = fuera de ventana de 24h
      const is24hError = errText.includes("131047");
      await supabase
        .from("crm_wa_messages")
        .update({ send_error: is24hError ? "24h_window_expired" : `Graph ${res.status}` })
        .eq("id", savedMsg.id);

      return new Response(
        JSON.stringify({ ok: false, error: is24hError ? "24h_window_expired" : errText }),
        { status: 502, headers: corsHeaders }
      );
    }

    const json = await res.json();
    const wa_message_id = json?.messages?.[0]?.id;
    if (wa_message_id) {
      await supabase
        .from("crm_wa_messages")
        .update({ wa_message_id })
        .eq("id", savedMsg.id);
    }

    await supabase
      .from("crm_wa_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversation_id);

    return new Response(
      JSON.stringify({ ok: true, message_id: savedMsg.id }),
      { status: 200, headers: corsHeaders }
    );

  } catch (err: any) {
    await supabase
      .from("crm_wa_messages")
      .update({ send_error: err.message })
      .eq("id", savedMsg.id);

    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 502, headers: corsHeaders }
    );
  }
});
