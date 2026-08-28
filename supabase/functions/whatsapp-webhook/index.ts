import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";
import { encodeHex } from "https://deno.land/std@0.208.0/encoding/hex.ts";
import { encodeBase64 } from "https://deno.land/std@0.208.0/encoding/base64.ts";
import { sendPushToUsers } from "../_shared/push.ts";
import { isInternalCall } from "../_shared/internal-auth.ts";
import { isBsuid, normalizeWaIdentifier, recipientField } from "../_shared/wa-recipient.ts";

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

// ─── POST — incoming messages + template status updates ──────────────────────
async function handlePost(req: Request): Promise<Response> {
  const rawBody = await req.text();
  const signatureHeader = req.headers.get("x-hub-signature-256");

  let payload: any;
  try { payload = JSON.parse(rawBody); }
  catch { return new Response("bad json", { status: 400 }); }

  if (payload?.object !== "whatsapp_business_account") return new Response("ok", { status: 200 });

  // Detect event type from first change field
  const firstChange = payload?.entry?.[0]?.changes?.[0];
  const isTemplateEvent = firstChange?.field === "message_template_status_update";

  // Look up tenant config — by waba_id for template events, by phone_number_id for messages
  let config: { user_id: string; app_secret: string | null; access_token: string | null; is_active: boolean } | null = null;

  if (isTemplateEvent) {
    const wabaId = payload?.entry?.[0]?.id;
    if (wabaId) {
      const { data } = await supabase
        .from("crm_ai_agent_config")
        .select("user_id, app_secret, access_token, is_active")
        .eq("waba_id", wabaId)
        .maybeSingle();
      config = data ?? null;
    }
  } else {
    const phoneNumberId = firstChange?.value?.metadata?.phone_number_id;
    if (phoneNumberId) {
      const { data } = await supabase
        .from("crm_ai_agent_config")
        .select("user_id, app_secret, access_token, is_active")
        .eq("phone_number_id", phoneNumberId)
        .maybeSingle();
      config = data ?? null;
    }
  }

  // Replay interno: wa-inbox-retry reenvía aquí un aviso guardado en la bandeja
  // para reprocesarlo por el mismo camino ya probado en producción. No tenemos la
  // firma original de Meta, así que se autoriza con el service role key, igual que
  // el resto de llamadas internas. Meta jamás manda ese key, así que esto no abre
  // ninguna puerta: sigue siendo imposible entrar sin firma válida desde fuera.
  const esReplayInterno = isInternalCall(req);

  if (!esReplayInterno) {
    if (!config?.app_secret) return new Response("ok", { status: 200 });
    const valid = await verifySignature(rawBody, signatureHeader, config.app_secret);
    if (!valid) return new Response("invalid signature", { status: 401 });
  }
  if (!config) return new Response("ok", { status: 200 });

  if (isTemplateEvent) {
    // Process template status updates async
    processTemplateStatusUpdates(payload, config.user_id).catch((err) =>
      console.error("[webhook] error procesando template status:", err)
    );
  } else {
    // Respond 200 immediately, process messages async
    const work = processPayload(payload, config.user_id, config.is_active, config.access_token ?? "")
      .catch((err) => console.error("[webhook] error procesando payload:", err));
    // En el replay interno sí se espera el resultado: quien reintenta necesita
    // saber si esta vez salió bien, y al otro lado no hay ningún Meta vigilando
    // la latencia del endpoint.
    if (esReplayInterno) await work;
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
}

// ─── Template status auto-sync from Meta webhook ─────────────────────────────
async function processTemplateStatusUpdates(payload: any, tenantUserId: string): Promise<void> {
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "message_template_status_update") continue;
      const val = change.value ?? {};

      const metaTemplateId = String(val.message_template_id ?? "");
      const metaStatus: string = val.event ?? "";      // APPROVED, REJECTED, FLAGGED, PAUSED, etc.
      const rejectedReason: string | null = val.reason && val.reason !== "NONE" ? val.reason : null;

      if (!metaTemplateId || !metaStatus) continue;

      const localStatus =
        metaStatus === "APPROVED"  ? "APPROVED"  :
        metaStatus === "REJECTED"  ? "REJECTED"  :
        metaStatus === "PAUSED"    ? "PAUSED"    :
        metaStatus === "FLAGGED"   ? "REJECTED"  : "PENDING";

      await supabase
        .from("crm_wa_templates")
        .update({
          local_status: localStatus,
          meta_status:  metaStatus,
          rejection_reason: rejectedReason,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", tenantUserId)
        .eq("meta_template_id", metaTemplateId);

      console.log(`[webhook] template ${metaTemplateId} → ${localStatus}`);
    }
  }
}

// ─── Bandeja de entrada ───────────────────────────────────────────────────────
// El aviso de Meta se guarda ANTES de procesarlo. Si el procesamiento falla, la
// fila se queda 'pending' y wa-inbox-retry la reintenta cada minuto. A Meta se le
// responde 200 siempre, pase lo que pase: devolverle errores puede hacer que
// limite o bloquee las cuentas de WhatsApp de los clientes SaaS.
//
// Esta fila sustituye a la de crm_wa_webhook_dedup, así que no añade escrituras:
// hace de deduplicación y de respaldo a la vez.

/** Devuelve true si hay que procesar el mensaje, false si ya está atendido. */
async function claimInbox(msg: any, tenantUserId: string, contactName: string | null): Promise<boolean> {
  const waMessageId = String(msg?.id ?? "");
  if (!waMessageId) return true; // sin id no hay nada que deduplicar

  const { error } = await supabase.from("crm_wa_inbox").insert({
    wa_message_id: waMessageId,
    tenant_user_id: tenantUserId,
    contact_name: contactName,
    payload: msg,
  });
  if (!error) return true;

  if (error.code === "23505") {
    // Ya existe: o Meta lo reenvió y ya está hecho, o es un reintento nuestro.
    const { data } = await supabase
      .from("crm_wa_inbox").select("status").eq("wa_message_id", waMessageId).maybeSingle();
    if (data?.status === "pending") return true;
    console.log(`[webhook] ${waMessageId} ya atendido (${data?.status ?? "?"}), ignorando`);
    return false;
  }

  // No se pudo reclamar por otro motivo. Se procesa igual: perder el mensaje es
  // peor que arriesgar un reproceso, y crm_wa_messages.wa_message_id es único,
  // así que la base impide duplicarlo.
  console.error("[webhook] no se pudo reclamar en la bandeja:", error);
  await supabase.from("crm_wa_health_events").insert({
    kind: "inbox_claim_failed",
    tenant_user_id: tenantUserId,
    detail: `${error.code ?? ""} ${error.message ?? ""}`.trim().slice(0, 300),
  }).then(() => {}, () => {});
  return true;
}

/** Marca atendido. Se llama en cuanto el mensaje queda guardado, no al final. */
async function markInboxDone(waMessageId: string): Promise<void> {
  if (!waMessageId) return;
  await supabase.from("crm_wa_inbox")
    .update({ status: "done", processed_at: new Date().toISOString(), last_error: null })
    .eq("wa_message_id", waMessageId);
}

/** Anota el fallo; la fila sigue 'pending' y wa-inbox-retry volverá a intentarlo. */
async function markInboxFailed(waMessageId: string, err: unknown): Promise<void> {
  if (!waMessageId) return;
  await supabase.from("crm_wa_inbox")
    .update({ last_error: String(err).slice(0, 500), last_attempt_at: new Date().toISOString() })
    .eq("wa_message_id", waMessageId)
    .eq("status", "pending"); // jamás revertir uno ya marcado 'done'
}

/** Aviso de que el mensaje quedó guardado. Ver saveIncoming. */
type OnSaved = () => Promise<void>;

/**
 * Guarda el mensaje entrante y marca la bandeja como atendida en el acto.
 *
 * Devuelve false si el mensaje YA estaba guardado (índice único sobre
 * wa_message_id). Eso significa que esto es un reproceso de algo ya atendido:
 * hay que darlo por hecho pero NO volver a invocar a la IA, o el cliente
 * recibiría dos respuestas.
 */
async function saveIncoming(row: Record<string, unknown>, onSaved: OnSaved): Promise<boolean> {
  const { error } = await supabase.from("crm_wa_messages").insert(row);
  if (error) {
    if (error.code === "23505") {
      console.log(`[webhook] ${row.wa_message_id} ya estaba guardado, no se reprocesa`);
      await onSaved();
      return false;
    }
    // Se lanza: el mensaje NO se guardó. La bandeja lo deja pending y se reintenta.
    throw new Error(`no se pudo guardar el mensaje: ${error.code ?? ""} ${error.message ?? ""}`);
  }
  await onSaved();
  return true;
}

// ─── Async payload processing ─────────────────────────────────────────────────
async function processPayload(payload: any, tenantUserId: string, isActive: boolean, accessToken: string): Promise<void> {
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;
      const value = change.value ?? {};

      for (const status of value.statuses ?? []) {
        const newStatus =
          status.status === "read"      ? "read"      :
          status.status === "delivered" ? "delivered" :
          status.status === "sent"      ? "sent"      :
          status.status === "failed"    ? "failed"    : null;
        if (newStatus) {
          if (newStatus === "failed") {
            const errs = status.errors ?? [];
            console.error(`[webhook] delivery FAILED wamid=${status.id} errors=${JSON.stringify(errs)}`);
          }
          await supabase
            .from("crm_wa_messages")
            .update({ delivery_status: newStatus })
            .eq("wa_message_id", status.id);
        }
      }

      // Indexado por wa_id (teléfono) y por user_id (BSUID) — Meta manda uno u
      // otro según el cliente tenga o no el número visible. Ver wa-recipient.ts.
      const nameByPhone = new Map<string, string | null>();
      for (const c of value.contacts ?? []) {
        const name = c.profile?.name ?? null;
        if (c.wa_id)   nameByPhone.set(c.wa_id, name);
        if (c.user_id) nameByPhone.set(c.user_id, name);
      }

      for (const msg of value.messages ?? []) {
        // Ignorar mensajes de grupos de WhatsApp — @g.us es el sufijo de IDs de grupos en la Cloud API
        const msgFrom = String(msg.from ?? "");
        const msgTo   = String(msg.to   ?? "");
        if (msgFrom.endsWith("@g.us") || msgTo.endsWith("@g.us")) {
          console.log(`[webhook] mensaje de grupo ignorado (from=${msgFrom})`);
          continue;
        }

        // BSUID (business-scoped user id): cuando Meta no manda el teléfono
        // real (Click-to-WhatsApp Ads, usuario con username), usa esto en su
        // lugar — sirve igual para responder, ver wa-recipient.ts.
        const identifier = msg.from || msg.from_user_id || null;
        const contactName = identifier ? (nameByPhone.get(identifier) ?? null) : null;
        const reclamado = await claimInbox(msg, tenantUserId, contactName);
        if (!reclamado) continue;

        const waMessageId = String(msg?.id ?? "");
        let guardado = false;
        try {
          await handleIncomingMessage(
            msg, contactName, tenantUserId, isActive, accessToken,
            async () => { await markInboxDone(waMessageId); guardado = true; },
          );
        } catch (err) {
          console.error(`[webhook] fallo procesando ${waMessageId}:`, err);
          // Si ya estaba guardado, el mensaje está a salvo y NO se reintenta: un
          // reintento volvería a invocar a la IA y el cliente recibiría dos
          // respuestas. Que la IA falle después ya lo cubre wa_ai_not_replying.
          if (!guardado) await markInboxFailed(waMessageId, err);
        }
      }
    }
  }
}

/**
 * Procesa un mensaje entrante.
 *
 * Contrato con la bandeja de entrada:
 *  - Llama a `onSaved()` en cuanto el mensaje queda a salvo, y también cuando el
 *    mensaje no aplica (tipo no soportado, sin contenido): en ambos casos no hay
 *    nada más que hacer con él.
 *  - LANZA si algo falla de verdad. Sin excepción el fallo pasaría por éxito y la
 *    bandeja daría por atendido un mensaje perdido — que es exactamente el bug
 *    que esto viene a arreglar.
 */
async function handleIncomingMessage(
  msg: any,
  contactName: string | null,
  tenantUserId: string,
  isActive: boolean,
  accessToken: string,
  onSaved: OnSaved,
): Promise<void> {
  const waMessageId = msg.id;
  // BSUID (business-scoped user id): algunos clics a WhatsApp desde anuncios
  // de Instagram/Facebook (Click-to-WhatsApp Ads) o clientes con username de
  // WhatsApp llegan sin el campo "from" estándar — en su lugar Meta manda
  // "from_user_id" (ej. "PE.890226963914597"). No es un número de teléfono,
  // pero sí sirve como destinatario para responder por Graph API (con
  // "recipient" en vez de "to" — ver wa-recipient.ts), así que se usa igual
  // que un teléfono en toda la cadena de conversación/envío.
  const phone = msg.from || msg.from_user_id || null;
  const msgType: string = msg.type;

  // ── Mensaje sin ningún identificador (ni from ni from_user_id) ──
  // Caso extremo no documentado por Meta: sin nada que identifique al
  // remitente no hay forma de crear conversación ni de responder. No es un
  // fallo transitorio que se arregle reintentando, así que no se lanza — eso
  // solo lo dejaría reintentando 46 horas para terminar perdiéndose igual.
  if (!phone) {
    console.error(
      `[webhook] mensaje sin "from" ni "from_user_id" — ` +
      `id=${waMessageId} contacto=${contactName ?? "?"} ` +
      `referral=${JSON.stringify(msg?.referral ?? null).slice(0, 300)}`
    );
    await onSaved();
    return;
  }

  // ── Simulacro de fallo, solo para pruebas ──
  // Inerte salvo que exista el secreto WA_TEST_FAIL_TARGET con el formato exacto
  // "<tenant_user_id>:<telefono>". Permite comprobar que la bandeja retiene y
  // reintenta de verdad sin romper nada: cualquier otro número —y el mismo número
  // escribiéndole a otro cliente SaaS— sigue su curso normal. El tenant va en la
  // clave a propósito: un mismo teléfono puede tener conversación abierta con
  // varios clientes a la vez.
  const testFailTarget = Deno.env.get("WA_TEST_FAIL_TARGET");
  if (testFailTarget && testFailTarget === `${tenantUserId}:${phone}`) {
    throw new Error(`[simulacro] fallo forzado para ${phone} (WA_TEST_FAIL_TARGET)`);
  }

  // ── Audio/Voice: download → transcribe → invoke agent ──
  if (msgType === "audio" || msgType === "voice") {
    const conv = await upsertConversation(tenantUserId, phone, contactName);

    let transcription: string | null = null;
    const mediaId: string | undefined = msg[msgType]?.id;
    if (mediaId && accessToken) {
      const media = await downloadMedia(mediaId, accessToken);
      if (media) transcription = await transcribeAudio(media.buffer, media.mimeType);
    }

    const nuevo = await saveIncoming({
      conversation_id: conv.id,
      role: "user",
      content: transcription ?? "[Mensaje de voz]",
      media_type: "audio",
      transcription,
      wa_message_id: waMessageId,
    }, onSaved);
    if (!nuevo) return;
    await supabase.rpc("increment_conversation_unread", { p_conv_id: conv.id });

    await maybeInvokeAgent(conv, tenantUserId, phone, isActive, { preview: transcription ?? "[Mensaje de voz]", contact_name: contactName });
    return;
  }

  // ── Text ──
  if (msgType === "text") {
    const text = msg.text?.body;
    if (!text) { await onSaved(); return; }   // no aplica: nada que guardar

    console.log(`[webhook] ← texto de ${phone}: "${text.slice(0, 60)}"`);
    const conv = await upsertConversation(tenantUserId, phone, contactName);

    const nuevo = await saveIncoming({
      conversation_id: conv.id, role: "user", content: text, wa_message_id: waMessageId,
    }, onSaved);
    if (!nuevo) return;
    await supabase.rpc("increment_conversation_unread", { p_conv_id: conv.id });

    await maybeInvokeAgent(conv, tenantUserId, phone, isActive, { preview: text, contact_name: contactName });
    return;
  }

  // ── Image ──
  if (msgType === "image") {
    const mediaId = msg.image?.id;
    const caption = msg.image?.caption ?? "";
    if (!mediaId) { await onSaved(); return; }   // no aplica

    console.log(`[webhook] ← imagen de ${phone} (media_id: ${mediaId})`);
    const conv = await upsertConversation(tenantUserId, phone, contactName);

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

    const nuevo = await saveIncoming({
      conversation_id: conv.id,
      role: "user",
      content: caption || "[Imagen]",
      media_type: "image",
      media_url: mediaUrl,
      wa_message_id: waMessageId,
    }, onSaved);
    if (!nuevo) return;
    await supabase.rpc("increment_conversation_unread", { p_conv_id: conv.id });

    await maybeInvokeAgent(conv, tenantUserId, phone, isActive, {
      media_base64: mediaBase64,
      media_mime_type: mediaMimeType,
      media_type: "image",
      preview: caption || "[Imagen]",
      contact_name: contactName,
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
      await onSaved();   // no aplica: no se reintenta
      return;
    }

    console.log(`[webhook] ← PDF de ${phone}: ${filename}`);
    const conv = await upsertConversation(tenantUserId, phone, contactName);

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

    const nuevo = await saveIncoming({
      conversation_id: conv.id,
      role: "user",
      content: `[PDF: ${filename}]`,
      media_type: "document",
      media_url: mediaUrl,
      wa_message_id: waMessageId,
    }, onSaved);
    if (!nuevo) return;
    await supabase.rpc("increment_conversation_unread", { p_conv_id: conv.id });

    await maybeInvokeAgent(conv, tenantUserId, phone, isActive, {
      media_base64: mediaBase64,
      media_mime_type: "application/pdf",
      media_type: "document",
      preview: `[PDF: ${filename}]`,
      contact_name: contactName,
    });
    return;
  }

  // ── Interactive (button reply) ──
  if (msgType === "interactive") {
    const buttonReply = msg.interactive?.button_reply;
    const listReply   = msg.interactive?.list_reply;
    const text = buttonReply?.title ?? listReply?.title ?? "";
    if (!text) { await onSaved(); return; }   // no aplica

    console.log(`[webhook] ← button reply de ${phone}: "${text}"`);
    const conv = await upsertConversation(tenantUserId, phone, contactName);

    const nuevo = await saveIncoming({
      conversation_id: conv.id, role: "user", content: text, wa_message_id: waMessageId,
      button_reply_id: buttonReply?.id ?? null,
    }, onSaved);
    if (!nuevo) return;
    await supabase.rpc("increment_conversation_unread", { p_conv_id: conv.id });
    await maybeInvokeAgent(conv, tenantUserId, phone, isActive, {
      button_reply_id: buttonReply?.id,
      preview: text,
      contact_name: contactName,
    });
    return;
  }

  // Tipo no soportado: no es un fallo, no hay nada que reintentar.
  console.log(`[webhook] tipo no soportado: ${msgType}, ignorando`);
  await onSaved();
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
  // Normalizar teléfono: quitar "+" y espacios para comparación con crm_contacts.
  // Un BSUID (ver wa-recipient.ts) se deja intacto — no es un teléfono.
  const normalizedPhone = normalizeWaIdentifier(phone);

  // Buscar contacto ya existente con este teléfono (para foto de perfil y para enlazarlo)
  const { data: contact } = await supabase
    .from("crm_contacts")
    .select("id, profile_pic_url")
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
  if (error) {
    console.error("[webhook] error upsert conversación:", error);
    // Se deja constancia en la base, no solo en el log. Un fallo aquí descarta
    // el mensaje entero y es INVISIBLE mirando los datos: no se pueden ver
    // mensajes que nunca se guardaron. El 16/08 esto estuvo 21h pasando en
    // silencio. wa-health-check lee esta tabla y avisa al administrador.
    await supabase.from("crm_wa_health_events").insert({
      kind: "message_not_saved",
      tenant_user_id: userId,
      detail: `${error.code ?? ""} ${error.message ?? ""}`.trim().slice(0, 300),
    }).then(() => {}, () => {}); // nunca debe tumbar el webhook
    // Se lanza en vez de devolver null: así el mensaje se queda 'pending' en la
    // bandeja y se reintenta. Antes se hacía `return null` y quien llamaba hacía
    // `if (!conv) return;` — el mensaje se perdía en silencio.
    throw new Error(`no se pudo crear la conversación: ${error.code ?? ""} ${error.message ?? ""}`);
  }

  // Conversación sin contacto vinculado: enlazar uno existente por teléfono o, si el tenant
  // tiene "crear contacto" activo, crear uno nuevo — así cada chat nuevo queda guardado en el
  // CRM sin depender de que el agente IA extraiga datos de la conversación primero.
  if (!data.contact_id) {
    let contactId = contact?.id ?? null;
    if (!contactId) {
      const { data: cfg } = await supabase
        .from("crm_ai_agent_config")
        .select("can_create_contacts")
        .eq("user_id", userId)
        .maybeSingle();
      if (cfg?.can_create_contacts) {
        const { data: newContact } = await supabase
          .from("crm_contacts")
          .insert({ user_id: userId, name: contactName ?? phone, phone })
          .select("id")
          .single();
        contactId = newContact?.id ?? null;
      }
    }
    if (contactId) {
      await supabase.from("crm_wa_conversations").update({ contact_id: contactId }).eq("id", data.id);
      data.contact_id = contactId;
    }
  }

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
    body: JSON.stringify({ messaging_product: "whatsapp", ...recipientField(phone), type: "text", text: { body: text } }),
  }).catch(() => {});

  await supabase.from("crm_wa_messages").insert({ conversation_id: conversationId, role: "assistant", content: text });
  await supabase.from("crm_wa_conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);
}

async function invokeAgentWithRetry(
  url: string,
  body: string,
  headers: Record<string, string>,
  maxAttempts = 2,
): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, { method: "POST", headers, body });
      if (res.ok || res.status < 500) return;
      console.warn(`[webhook] ai-agent intento ${attempt}/${maxAttempts} → status ${res.status}`);
    } catch (err) {
      console.warn(`[webhook] ai-agent intento ${attempt}/${maxAttempts} → error:`, err);
    }
    if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, 1000 * attempt));
  }
  console.error("[webhook] ai-agent falló después de todos los intentos");
}

/**
 * Ventana de agrupación para mensajes de texto. Los clientes suelen fragmentar
 * una idea en varios mensajes seguidos ("Hola" → "Precio" → "?"); responder a
 * cada uno cuesta una llamada al modelo y produce tres respuestas sueltas.
 * Esperamos esta ventana y el agente descarta la invocación si mientras tanto
 * llegó otro mensaje, de modo que solo la última responde — a todos a la vez.
 */
const DEBOUNCE_MS = 25_000;

const waitUntilFn = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime?.waitUntil;

/** Push al negocio (dueño + staff activo) por cada mensaje que le llega al Agente IA. Siempre activo, sin toggle. */
async function notifyNewMessage(tenantUserId: string, phone: string, contactName: string | null, preview: string, mode: string) {
  const { data: staff } = await supabase
    .from("crm_staff")
    .select("staff_user_id")
    .eq("owner_user_id", tenantUserId)
    .eq("status", "active");
  const userIds = [tenantUserId, ...(staff ?? []).map((s) => s.staff_user_id as string)];

  // 🤖 = responde la IA (modo AI/FLOW) — 🧑 = modo Manual, necesita respuesta humana.
  const modeEmoji = mode === "AI" || mode === "FLOW" ? "🤖" : "🧑";
  // Un BSUID (ver wa-recipient.ts) no tiene nada legible que mostrar en la notificación.
  const phoneLabel = isBsuid(phone) ? "Usuario de WhatsApp" : phone;
  const contactLabel = contactName ? `${contactName} (${phoneLabel})` : phoneLabel;

  await sendPushToUsers(supabase, userIds, {
    title: `${modeEmoji} ${contactLabel}`,
    body: preview.slice(0, 120),
    url: "/crm",
  });
}

async function maybeInvokeAgent(
  conv: { id: string; mode: string },
  tenantUserId: string,
  phone: string,
  isActive: boolean,
  extra: {
    media_base64?: string | null;
    media_mime_type?: string | null;
    media_type?: string;
    button_reply_id?: string;
    preview?: string;
    contact_name?: string | null;
  },
) {
  if (!isActive) return;

  const { data: freshConv } = await supabase.from("crm_wa_conversations").select("mode").eq("id", conv.id).single();
  const mode = freshConv?.mode ?? conv.mode;

  // La notificación va sin importar el modo de la conversación — si está en modo Manual
  // (asignada a un humano) el negocio necesita enterarse todavía más, ya que ahí la IA
  // no está respondiendo automáticamente por él.
  const notifyPromise = notifyNewMessage(tenantUserId, phone, extra.contact_name ?? null, extra.preview ?? "Nuevo mensaje", mode)
    .catch((err) => console.error("[webhook] error notificando nuevo mensaje:", err));
  if (waitUntilFn) waitUntilFn(notifyPromise);

  if (mode !== "AI" && mode !== "FLOW") return;

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${serviceKey}`,
    "apikey": serviceKey,
  };

  // Solo se agrupa el texto: un adjunto o un botón son acciones puntuales que el
  // cliente espera ver atendidas de inmediato.
  const debounced = !extra.media_base64 && !extra.button_reply_id;
  const body = JSON.stringify({ conversation_id: conv.id, tenant_user_id: tenantUserId, phone, debounced, ...extra });
  const url = `${supabaseUrl}/functions/v1/ai-agent`;

  if (!debounced) {
    invokeAgentWithRetry(url, body, headers)
      .catch((err) => console.error("[webhook] error inesperado en retry:", err));
    return;
  }

  const pending = (async () => {
    await new Promise((r) => setTimeout(r, DEBOUNCE_MS));
    await invokeAgentWithRetry(url, body, headers);
  })();

  // Sin waitUntil el runtime puede cortar la función al responder a Meta y la
  // invocación diferida nunca saldría.
  const waitUntil = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime?.waitUntil;
  if (waitUntil) waitUntil(pending);
  pending.catch((err) => console.error("[webhook] error inesperado en retry:", err));
}

// ─── Entry point ───────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "GET")  return handleGet(req);
  if (req.method === "POST") return handlePost(req);
  return new Response("method not allowed", { status: 405 });
});
