import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";
import { encodeHex } from "https://deno.land/std@0.208.0/encoding/hex.ts";
import { encodeBase64 } from "https://deno.land/std@0.208.0/encoding/base64.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const MAX_MEDIA_BYTES = 10 * 1024 * 1024; // 10 MB

// ─── HMAC-SHA256 signature verification ──────────────────────────────────────
async function verifySignature(rawBody: string, signatureHeader: string | null, appSecret: string): Promise<boolean> {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const provided = signatureHeader.slice("sha256=".length);
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected = encodeHex(new Uint8Array(sig));
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < provided.length; i++) diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

// ─── GET — webhook verification ───────────────────────────────────────────────
async function handleGet(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const mode      = url.searchParams.get("hub.mode");
  const token     = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode !== "subscribe" || !token) return new Response("forbidden", { status: 403 });
  const { data: config } = await supabase
    .from("crm_ai_agent_config")
    .select("id")
    .eq("webhook_verify_token", token)
    .maybeSingle();
  if (!config) return new Response("forbidden", { status: 403 });
  return new Response(challenge ?? "", { status: 200, headers: { "Content-Type": "text/plain" } });
}

// ─── Download media from Meta ─────────────────────────────────────────────────
async function downloadMedia(mediaId: string, accessToken: string): Promise<{
  buffer: ArrayBuffer; mimeType: string;
} | null> {
  try {
    // Step 1: get media URL
    const infoRes = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!infoRes.ok) return null;
    const { url, mime_type: mimeType } = await infoRes.json();
    if (!url) return null;

    // Step 2: download binary
    const dlRes = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!dlRes.ok) return null;

    const buffer = await dlRes.arrayBuffer();
    if (buffer.byteLength > MAX_MEDIA_BYTES) {
      console.log(`[webhook] media demasiado grande (${buffer.byteLength} bytes), ignorando`);
      return null;
    }
    return { buffer, mimeType };
  } catch (err) {
    console.error("[webhook] error descargando media:", err);
    return null;
  }
}

// ─── Upload media to Supabase Storage ────────────────────────────────────────
async function uploadMedia(buffer: ArrayBuffer, path: string, mimeType: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from("wa-media")
      .upload(path, buffer, { contentType: mimeType, upsert: true });
    if (error) { console.error("[webhook] storage upload error:", error); return null; }
    const { data: urlData } = supabase.storage.from("wa-media").getPublicUrl(data.path);
    return urlData.publicUrl;
  } catch (err) {
    console.error("[webhook] error subiendo a storage:", err);
    return null;
  }
}

// ─── POST — incoming messages ─────────────────────────────────────────────────
async function handlePost(req: Request): Promise<Response> {
  const rawBody = await req.text();
  const signatureHeader = req.headers.get("x-hub-signature-256");

  let payload: any;
  try { payload = JSON.parse(rawBody); }
  catch { return new Response("bad json", { status: 400 }); }

  if (payload?.object !== "whatsapp_business_account") return new Response("ok", { status: 200 });

  const phoneNumberId = payload?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
  if (!phoneNumberId) return new Response("ok", { status: 200 });

  const { data: config } = await supabase
    .from("crm_ai_agent_config")
    .select("user_id, app_secret, access_token, is_active")
    .eq("phone_number_id", phoneNumberId)
    .maybeSingle();

  if (!config?.app_secret) return new Response("ok", { status: 200 });

  const valid = await verifySignature(rawBody, signatureHeader, config.app_secret);
  if (!valid) return new Response("invalid signature", { status: 401 });

  // Respond 200 immediately, process async
  processPayload(payload, config.user_id, config.is_active, config.access_token ?? "").catch((err) =>
    console.error("[webhook] error procesando payload:", err)
  );

  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
}

// ─── Async payload processing ─────────────────────────────────────────────────
async function processPayload(payload: any, tenantUserId: string, isActive: boolean, accessToken: string): Promise<void> {
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;
      const value = change.value ?? {};

      for (const status of value.statuses ?? []) {
        console.log(`[webhook] status ${status.status} wamid ${status.id}`);
      }

      const nameByPhone = new Map<string, string | null>(
        (value.contacts ?? []).map((c: any) => [c.wa_id, c.profile?.name ?? null])
      );

      for (const msg of value.messages ?? []) {
        // Ignorar mensajes de grupos de WhatsApp — @g.us es el sufijo de IDs de grupos en la Cloud API
        const msgFrom = String(msg.from ?? "");
        const msgTo   = String(msg.to   ?? "");
        if (msgFrom.endsWith("@g.us") || msgTo.endsWith("@g.us")) {
          console.log(`[webhook] mensaje de grupo ignorado (from=${msgFrom})`);
          continue;
        }
        await handleIncomingMessage(msg, nameByPhone.get(msg.from) ?? null, tenantUserId, isActive, accessToken);
      }
    }
  }
}

async function handleIncomingMessage(
  msg: any,
  contactName: string | null,
  tenantUserId: string,
  isActive: boolean,
  accessToken: string,
): Promise<void> {
  const waMessageId = msg.id;
  const phone = msg.from;
  const msgType: string = msg.type;

  // ── Audio/Voice: download → transcribe → invoke agent ──
  if (msgType === "audio" || msgType === "voice") {
    const { error: dedupErr } = await supabase.from("crm_wa_webhook_dedup").insert({ wa_message_id: waMessageId });
    if (dedupErr) return;

    const conv = await upsertConversation(tenantUserId, phone, contactName);
    if (!conv) return;

    let transcription: string | null = null;
    const mediaId: string | undefined = msg[msgType]?.id;
    if (mediaId && accessToken) {
      const media = await downloadMedia(mediaId, accessToken);
      if (media) transcription = await transcribeAudio(media.buffer, media.mimeType);
    }

    await supabase.from("crm_wa_messages").insert({
      conversation_id: conv.id,
      role: "user",
      content: transcription ?? "[Mensaje de voz]",
      media_type: "audio",
      transcription,
      wa_message_id: waMessageId,
    });
    await supabase.rpc("increment_conversation_unread", { p_conv_id: conv.id });

    if (transcription) {
      await maybeInvokeAgent(conv, tenantUserId, phone, isActive, {});
    } else if (isActive) {
      const autoReply = "Hola, recibí tu mensaje de voz pero no pude procesarlo. Por favor escríbeme tu consulta y con gusto te ayudo 🙏";
      await sendAutoReply(phone, autoReply, tenantUserId, conv.id);
    }
    return;
  }

  // ── Text ──
  if (msgType === "text") {
    const text = msg.text?.body;
    if (!text) return;

    const { error: dedupErr } = await supabase.from("crm_wa_webhook_dedup").insert({ wa_message_id: waMessageId });
    if (dedupErr) return;

    console.log(`[webhook] ← texto de ${phone}: "${text.slice(0, 60)}"`);
    const conv = await upsertConversation(tenantUserId, phone, contactName);
    if (!conv) return;

    await supabase.from("crm_wa_messages").insert({
      conversation_id: conv.id, role: "user", content: text, wa_message_id: waMessageId,
    });
    await supabase.rpc("increment_conversation_unread", { p_conv_id: conv.id });

    await maybeInvokeAgent(conv, tenantUserId, phone, isActive, {});
    return;
  }

  // ── Image ──
  if (msgType === "image") {
    const mediaId = msg.image?.id;
    const caption = msg.image?.caption ?? "";
    if (!mediaId) return;

    const { error: dedupErr } = await supabase.from("crm_wa_webhook_dedup").insert({ wa_message_id: waMessageId });
    if (dedupErr) return;

    console.log(`[webhook] ← imagen de ${phone} (media_id: ${mediaId})`);
    const conv = await upsertConversation(tenantUserId, phone, contactName);
    if (!conv) return;

    let mediaUrl: string | null = null;
    let mediaBase64: string | null = null;
    let mediaMimeType: string | null = null;

    if (accessToken) {
      const media = await downloadMedia(mediaId, accessToken);
      if (media) {
        mediaMimeType = media.mimeType;
        mediaBase64 = encodeBase64(media.buffer);
        const ext = media.mimeType.split("/")[1] ?? "jpg";
        const path = `${tenantUserId}/${conv.id}/${waMessageId}.${ext}`;
        mediaUrl = await uploadMedia(media.buffer, path, media.mimeType);
      }
    }

    await supabase.from("crm_wa_messages").insert({
      conversation_id: conv.id,
      role: "user",
      content: caption || "[Imagen]",
      media_type: "image",
      media_url: mediaUrl,
      wa_message_id: waMessageId,
    });
    await supabase.rpc("increment_conversation_unread", { p_conv_id: conv.id });

    await maybeInvokeAgent(conv, tenantUserId, phone, isActive, {
      media_base64: mediaBase64,
      media_mime_type: mediaMimeType,
      media_type: "image",
    });
    return;
  }

  // ── Document (PDF) ──
  if (msgType === "document") {
    const mediaId = msg.document?.id;
    const mimeType: string = msg.document?.mime_type ?? "";
    const filename: string = msg.document?.filename ?? "documento";
    if (!mediaId || !mimeType.includes("pdf")) {
      console.log(`[webhook] documento no PDF (${mimeType}), ignorando`);
      return;
    }

    const { error: dedupErr } = await supabase.from("crm_wa_webhook_dedup").insert({ wa_message_id: waMessageId });
    if (dedupErr) return;

    console.log(`[webhook] ← PDF de ${phone}: ${filename}`);
    const conv = await upsertConversation(tenantUserId, phone, contactName);
    if (!conv) return;

    let mediaUrl: string | null = null;
    let mediaBase64: string | null = null;

    if (accessToken) {
      const media = await downloadMedia(mediaId, accessToken);
      if (media) {
        mediaBase64 = encodeBase64(media.buffer);
        const path = `${tenantUserId}/${conv.id}/${waMessageId}.pdf`;
        mediaUrl = await uploadMedia(media.buffer, path, "application/pdf");
      }
    }

    await supabase.from("crm_wa_messages").insert({
      conversation_id: conv.id,
      role: "user",
      content: `[PDF: ${filename}]`,
      media_type: "document",
      media_url: mediaUrl,
      wa_message_id: waMessageId,
    });
    await supabase.rpc("increment_conversation_unread", { p_conv_id: conv.id });

    await maybeInvokeAgent(conv, tenantUserId, phone, isActive, {
      media_base64: mediaBase64,
      media_mime_type: "application/pdf",
      media_type: "document",
    });
    return;
  }

  console.log(`[webhook] tipo no soportado: ${msgType}, ignorando`);
}

// ─── Groq Whisper transcription ──────────────────────────────────────────────
async function transcribeAudio(buffer: ArrayBuffer, mimeType: string): Promise<string | null> {
  const groqKey = Deno.env.get("GROQ_API_KEY");
  if (!groqKey) return null;
  try {
    const ext = mimeType.includes("ogg") ? "ogg"
      : mimeType.includes("mp4") || mimeType.includes("m4a") ? "m4a"
      : mimeType.includes("wav") ? "wav"
      : "ogg";
    const form = new FormData();
    form.append("file", new Blob([buffer], { type: mimeType }), `audio.${ext}`);
    form.append("model", "whisper-large-v3");
    form.append("language", "es");
    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${groqKey}` },
      body: form,
    });
    if (!res.ok) {
      console.error(`[webhook] Groq transcripción error: ${res.status} ${await res.text()}`);
      return null;
    }
    const { text } = await res.json();
    return (text as string)?.trim() || null;
  } catch (err) {
    console.error("[webhook] error transcribiendo audio:", err);
    return null;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function upsertConversation(userId: string, phone: string, contactName: string | null) {
  // Normalizar teléfono: quitar "+" y espacios para comparación con crm_contacts
  const normalizedPhone = phone.replace(/\D/g, "");

  // Buscar foto de perfil del contacto (si el tenant tiene uno registrado con este teléfono)
  const { data: contact } = await supabase
    .from("crm_contacts")
    .select("profile_pic_url")
    .eq("user_id", userId)
    .or(`phone.eq.${phone},phone.eq.+${normalizedPhone},phone.eq.${normalizedPhone}`)
    .maybeSingle();

  const profilePic: string | null = contact?.profile_pic_url ?? null;

  const { data, error } = await supabase
    .from("crm_wa_conversations")
    .upsert(
      { user_id: userId, phone, contact_name: contactName, ...(profilePic ? { contact_profile_pic: profilePic } : {}) },
      { onConflict: "user_id,phone", ignoreDuplicates: false }
    )
    .select().single();
  if (error) { console.error("[webhook] error upsert conversación:", error); return null; }
  return data;
}

async function sendAutoReply(phone: string, text: string, tenantUserId: string, conversationId: string) {
  const { data: cfg } = await supabase
    .from("crm_ai_agent_config")
    .select("phone_number_id, access_token")
    .eq("user_id", tenantUserId)
    .maybeSingle();
  if (!cfg?.phone_number_id || !cfg.access_token) return;

  await fetch(`https://graph.facebook.com/v21.0/${cfg.phone_number_id}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: phone, type: "text", text: { body: text } }),
  }).catch(() => {});

  await supabase.from("crm_wa_messages").insert({ conversation_id: conversationId, role: "assistant", content: text });
  await supabase.from("crm_wa_conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);
}

async function maybeInvokeAgent(
  conv: { id: string; mode: string },
  tenantUserId: string,
  phone: string,
  isActive: boolean,
  media: { media_base64?: string | null; media_mime_type?: string | null; media_type?: string },
) {
  if (!isActive) return;
  const { data: freshConv } = await supabase.from("crm_wa_conversations").select("mode").eq("id", conv.id).single();
  if (freshConv?.mode !== "AI") return;

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  fetch(`${supabaseUrl}/functions/v1/ai-agent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${serviceKey}`,
      "apikey": serviceKey,
    },
    body: JSON.stringify({ conversation_id: conv.id, tenant_user_id: tenantUserId, phone, ...media }),
  }).catch((err) => console.error("[webhook] error invocando ai-agent:", err));
}

// ─── Entry point ───────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "GET")  return handleGet(req);
  if (req.method === "POST") return handlePost(req);
  return new Response("method not allowed", { status: 405 });
});
