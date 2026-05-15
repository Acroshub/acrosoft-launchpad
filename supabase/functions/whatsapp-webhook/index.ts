import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";
import { encodeHex } from "https://deno.land/std@0.208.0/encoding/hex.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// ─── Verificación de firma HMAC-SHA256 ────────────────────────────────────────
// CRÍTICO: se calcula sobre el raw body, NO el JSON parseado
async function verifySignature(rawBody: string, signatureHeader: string | null, appSecret: string): Promise<boolean> {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const provided = signatureHeader.slice("sha256=".length);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected = encodeHex(new Uint8Array(sig));
  if (provided.length !== expected.length) return false;
  // Comparación en tiempo constante
  let diff = 0;
  for (let i = 0; i < provided.length; i++) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

// ─── GET — verificación del webhook con Meta ───────────────────────────────────
// Meta envía hub.verify_token cuando configuras el webhook en el panel.
// Lo comparamos contra el webhook_verify_token del tenant que tiene ese phone_number_id.
// Como en el panel solo puedes poner una URL global, el verify_token identifica al tenant.
async function handleGet(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const mode       = url.searchParams.get("hub.mode");
  const token      = url.searchParams.get("hub.verify_token");
  const challenge  = url.searchParams.get("hub.challenge");

  if (mode !== "subscribe" || !token) {
    return new Response("forbidden", { status: 403 });
  }

  // Buscar tenant por verify_token
  const { data: config } = await supabase
    .from("crm_ai_agent_config")
    .select("id")
    .eq("webhook_verify_token", token)
    .maybeSingle();

  if (!config) {
    console.error("[webhook-verify] token no encontrado:", token);
    return new Response("forbidden", { status: 403 });
  }

  // IMPORTANTE: devolver challenge como text/plain — Meta rechaza JSON
  return new Response(challenge ?? "", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

// ─── POST — recibe mensajes entrantes de Meta ──────────────────────────────────
async function handlePost(req: Request): Promise<Response> {
  // 1. Leer raw body PRIMERO (el HMAC se calcula sobre esto)
  const rawBody = await req.text();
  const signatureHeader = req.headers.get("x-hub-signature-256");

  // 2. Parsear para obtener phone_number_id y buscar el tenant
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("bad json", { status: 400 });
  }

  if (payload?.object !== "whatsapp_business_account") {
    return new Response("ok", { status: 200 });
  }

  // 3. Extraer phone_number_id del primer entry para identificar tenant
  const phoneNumberId = payload?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
  if (!phoneNumberId) {
    return new Response("ok", { status: 200 });
  }

  const { data: config } = await supabase
    .from("crm_ai_agent_config")
    .select("user_id, app_secret, is_active")
    .eq("phone_number_id", phoneNumberId)
    .maybeSingle();

  if (!config?.app_secret) {
    console.error("[webhook] tenant no encontrado para phone_number_id:", phoneNumberId);
    return new Response("ok", { status: 200 }); // Responder 200 igual para no revelar info
  }

  // 4. Verificar firma con el app_secret del tenant
  const valid = await verifySignature(rawBody, signatureHeader, config.app_secret);
  if (!valid) {
    console.error("[webhook] firma inválida para phone_number_id:", phoneNumberId);
    return new Response("invalid signature", { status: 401 });
  }

  // 5. Responder 200 INMEDIATAMENTE — Meta tiene timeout de ~10s
  //    Procesar de forma async sin bloquear la respuesta
  processPayload(payload, config.user_id, config.is_active).catch((err) =>
    console.error("[webhook] error procesando payload:", err)
  );

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

// ─── Procesamiento async del payload ──────────────────────────────────────────
async function processPayload(payload: any, tenantUserId: string, isActive: boolean): Promise<void> {
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;
      const value = change.value ?? {};

      // Statuses: solo log (sent/delivered/read)
      for (const status of value.statuses ?? []) {
        console.log(`[webhook] status ${status.status} para wamid ${status.id}`);
      }

      // Mapa phone → nombre del contacto (viene en value.contacts)
      const nameByPhone = new Map<string, string | null>(
        (value.contacts ?? []).map((c: any) => [c.wa_id, c.profile?.name ?? null])
      );

      for (const msg of value.messages ?? []) {
        await handleIncomingMessage(msg, nameByPhone.get(msg.from) ?? null, tenantUserId, isActive);
      }
    }
  }
}

async function handleIncomingMessage(
  msg: any,
  contactName: string | null,
  tenantUserId: string,
  isActive: boolean,
): Promise<void> {
  // Solo procesamos mensajes de texto en v1
  if (msg.type !== "text") {
    console.log(`[webhook] tipo no soportado: ${msg.type}, ignorando`);
    return;
  }

  const waMessageId = msg.id;
  const phone = msg.from; // E.164 sin '+'
  const text = msg.text?.body;
  if (!text) return;

  // Dedup: marcar ANTES de procesar (si crashea, preferimos perder el msg a duplicar)
  const { error: dedupErr } = await supabase
    .from("crm_wa_webhook_dedup")
    .insert({ wa_message_id: waMessageId })
    .select();

  if (dedupErr) {
    // Unique violation = ya procesado
    console.log(`[webhook] mensaje ${waMessageId} ya procesado, ignorando`);
    return;
  }

  console.log(`[webhook] ← mensaje de ${phone}: "${text.slice(0, 60)}"`);

  // Obtener o crear conversación
  const { data: conv, error: convErr } = await supabase
    .from("crm_wa_conversations")
    .upsert(
      { user_id: tenantUserId, phone, contact_name: contactName },
      { onConflict: "user_id,phone", ignoreDuplicates: false }
    )
    .select()
    .single();

  if (convErr || !conv) {
    console.error("[webhook] error creando conversación:", convErr);
    return;
  }

  // Guardar mensaje del usuario
  await supabase.from("crm_wa_messages").insert({
    conversation_id: conv.id,
    role: "user",
    content: text,
    wa_message_id: waMessageId,
  });

  // Actualizar last_message_at
  await supabase
    .from("crm_wa_conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conv.id);

  // Si el agente no está activo o la conversación está en modo HUMAN, no responder
  if (!isActive) {
    console.log(`[webhook] agente inactivo para tenant ${tenantUserId}, no se responde`);
    return;
  }

  // Re-leer el modo (puede haber cambiado mientras procesábamos)
  const { data: freshConv } = await supabase
    .from("crm_wa_conversations")
    .select("mode")
    .eq("id", conv.id)
    .single();

  if (freshConv?.mode !== "AI") {
    console.log(`[webhook] conversación en modo HUMAN, no se responde`);
    return;
  }

  // Invocar el agente de IA de forma async
  supabase.functions.invoke("ai-agent", {
    body: {
      conversation_id: conv.id,
      tenant_user_id: tenantUserId,
      phone,
    },
  }).catch((err) => console.error("[webhook] error invocando ai-agent:", err));
}

// ─── Entry point ───────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "GET")  return handleGet(req);
  if (req.method === "POST") return handlePost(req);
  return new Response("method not allowed", { status: 405 });
});
