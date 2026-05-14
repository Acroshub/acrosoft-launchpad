import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  proto,
  WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import NodeCache from "node-cache";
import QRCode from "qrcode";
import pino from "pino";
import { supabase } from "./supabase";
import { useUserAuthState, clearAuthState } from "./auth-state";

const logger = pino({ level: "silent" });

const sessions = new Map<string, WASocket>();
const reconnectTimers = new Map<string, NodeJS.Timeout>();
const msgRetryCounterCache = new NodeCache();
// Per-user store for getMessage (needed to answer recipient retry requests)
const msgStores = new Map<string, Map<string, proto.IMessage>>();
// Per-user "fully ready to send" flag — only true once pre-keys are confirmed
// uploaded to WhatsApp servers. Without this, the first message to a
// never-contacted number sticks at "Waiting for the message" because the
// recipient cannot bootstrap the Signal session (no pre-keys to fetch).
const sessionReady = new Map<string, boolean>();

interface ForwardPayload {
  userId:     string;
  phone:      string;
  remoteJid:  string;
  pushName:   string | null;
  text:       string;
  waMsgId:    string | null;
}

async function forwardIncomingMessage(payload: ForwardPayload): Promise<void> {
  const supaUrl = process.env.SUPABASE_URL;
  const secret  = process.env.INCOMING_WEBHOOK_SECRET;
  if (!supaUrl || !secret) {
    console.warn(`[forward] SUPABASE_URL or INCOMING_WEBHOOK_SECRET missing — skipping`);
    return;
  }
  const url = `${supaUrl.replace(/\/$/, "")}/functions/v1/ai-agent-incoming`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type":     "application/json",
      "x-webhook-secret": secret,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.warn(`[forward] edge fn returned ${res.status}: ${errText}`);
  }
}

async function updateStatus(
  userId: string,
  status: "disconnected" | "qr_pending" | "connected" | "connecting",
  extra: { phone_number?: string | null; qr_code?: string | null; pairing_code?: string | null } = {},
) {
  await supabase
    .from("whatsapp_sessions")
    .upsert(
      {
        user_id:       userId,
        instance_name: userId,
        status,
        ...(extra.phone_number !== undefined && { phone_number: extra.phone_number }),
        ...(extra.qr_code      !== undefined && { qr_code:      extra.qr_code }),
        ...(extra.pairing_code !== undefined && { pairing_code: extra.pairing_code }),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
}

function scheduleReconnect(userId: string, code: number | undefined): void {
  if (reconnectTimers.has(userId)) return;
  // Code 440 (connectionReplaced) needs 15s — happens right after pairing when WhatsApp
  // opens a "definitive" socket and kicks the pairing one. Reconnecting too fast loops.
  const delay = code === 440 ? 15_000 : 5_000;
  console.log(`[${userId}] Scheduling reconnect in ${delay}ms (code: ${code})`);
  const timer = setTimeout(() => {
    reconnectTimers.delete(userId);
    const existing = sessions.get(userId);
    if (existing) {
      try { existing.end(undefined); } catch {}
      sessions.delete(userId);
    }
    createSession(userId).catch((err) =>
      console.error(`[${userId}] Reconnect failed:`, err),
    );
  }, delay);
  reconnectTimers.set(userId, timer);
}

export async function createSession(userId: string, phoneNumber?: string | null): Promise<string | null> {
  // Destroy existing session first to prevent listener leaks
  const existing = sessions.get(userId);
  if (existing) {
    try { existing.end(undefined); } catch {}
    sessions.delete(userId);
    await new Promise(r => setTimeout(r, 500));
  }

  // Phone pairing requires a clean slate — existing credentials cause
  // requestPairingCode to be skipped because creds.registered is true.
  if (phoneNumber) {
    await clearAuthState(userId);
    await supabase
      .from("whatsapp_sessions")
      .update({ status: "qr_pending", qr_code: null, pairing_code: null })
      .eq("user_id", userId);
  }

  // WhatsApp rejects outdated versions with code 405. Always fetch the latest.
  let version: [number, number, number] | undefined;
  try {
    const fetched = await fetchLatestBaileysVersion();
    version = fetched.version;
  } catch (err) {
    console.warn(`[${userId}] fetchLatestBaileysVersion failed, using bundled:`, err);
  }

  const { state, saveCreds } = await useUserAuthState(userId);

  if (!msgStores.has(userId)) msgStores.set(userId, new Map());
  const msgStore = msgStores.get(userId)!;

  const sock = makeWASocket({
    version,
    logger,
    auth: state,
    // Validated WhatsApp fingerprint. Custom fingerprints trigger code 440 in loop.
    browser: Browsers.macOS("Desktop"),
    // false: appearing online floods WhatsApp with presence events and trips spam
    // heuristics. The bot does not need to look "online" to send/receive.
    markOnlineOnConnect: false,
    syncFullHistory: false,
    msgRetryCounterCache,
    getMessage: async (key) => {
      const found = msgStore.get(key.id!);
      console.log(`[${userId}] getMessage called for id=${key.id} | found=${!!found}`);
      return found ?? undefined;
    },
  });

  sessions.set(userId, sock);

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("message-receipt.update", (updates) => {
    for (const u of updates) {
      console.log(`[${userId}] receipt | id=${u.key.id} | to=${u.key.remoteJid} | type=${u.receipt?.receiptTimestamp ? "delivered" : u.receipt?.readTimestamp ? "read" : JSON.stringify(u.receipt)}`);
    }
  });

  sock.ev.on("messages.update", (updates) => {
    for (const u of updates) {
      console.log(`[${userId}] msg.update | id=${u.key.id} | status=${u.update?.status}`);
    }
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        const qrBase64 = await QRCode.toDataURL(qr);
        await updateStatus(userId, "qr_pending", { qr_code: qrBase64 });
      } catch (err) {
        console.error(`[${userId}] QR generation failed:`, err);
      }
    }

    if (connection === "connecting") {
      // Only set 'connecting' from 'disconnected' (first boot). Never degrade
      // from 'qr_pending' or 'connected' — would confuse the dashboard.
      const { data } = await supabase
        .from("whatsapp_sessions")
        .select("status")
        .eq("user_id", userId)
        .maybeSingle();
      if (!data || data.status === "disconnected") {
        await updateStatus(userId, "connecting");
      }
    }

    if (connection === "open") {
      const phone = sock.user?.id?.split(":")[0]?.split("@")[0] ?? null;
      await updateStatus(userId, "connected", { phone_number: phone, qr_code: null, pairing_code: null });
      console.log(`[${userId}] Connected as ${phone}`);

      // Force pre-keys upload BEFORE marking session ready to send. WhatsApp
      // recipients need our pre-keys to bootstrap the Signal session for the
      // first incoming message from us; if they aren't on the server yet, the
      // recipient sees "Waiting for the message" forever.
      try {
        await sock.uploadPreKeysToServerIfRequired();
        console.log(`[${userId}] Pre-keys verified on server`);
      } catch (err) {
        console.warn(`[${userId}] uploadPreKeysToServerIfRequired failed:`, err);
      }

      sessionReady.set(userId, true);
    }

    if (connection === "close") {
      const code = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const loggedOut = code === DisconnectReason.loggedOut;
      console.log(`[${userId}] Connection closed. Code: ${code}. Logged out: ${loggedOut}`);

      sessionReady.set(userId, false);
      sessions.delete(userId);

      if (loggedOut) {
        // Only loggedOut wipes the DB state. Other codes are transient; we keep
        // status (e.g. 'connected') so the dashboard doesn't flicker while we reconnect.
        await clearAuthState(userId);
        await supabase
          .from("whatsapp_sessions")
          .update({ status: "disconnected", phone_number: null, qr_code: null, pairing_code: null })
          .eq("user_id", userId);
        return;
      }

      scheduleReconnect(userId, code);
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    console.log(`[${userId}] messages.upsert type=${type} count=${messages.length}`);
    for (const msg of messages) {
      // Store all messages so getMessage can fulfill retry requests
      if (msg.message && msg.key.id) {
        msgStore.set(msg.key.id, msg.message);
      }

      // Only forward inbound text messages from individual chats.
      // Accept both "notify" (realtime) and "append" (catch-up after reconnect)
      // but skip "append" messages older than 5 minutes to avoid replaying history.
      const remoteJid = msg.key.remoteJid ?? "";
      const isGroup     = remoteJid.endsWith("@g.us");
      const isBroadcast = remoteJid.endsWith("@broadcast");
      const isLid       = remoteJid.endsWith("@lid");
      const isS         = remoteJid.endsWith("@s.whatsapp.net");

      const _msgJson = msg.message != null ? (JSON.stringify(msg.message) ?? "circular").slice(0, 200) : "undefined";
      console.log(`[${userId}] msg fromMe=${msg.key.fromMe} jid=${remoteJid} stubType=${(msg as any).messageStubType ?? "none"} conv=${msg.message?.conversation ?? "nil"} extText=${msg.message?.extendedTextMessage?.text ?? "nil"} msgJson=${_msgJson}`);

      if (msg.key.fromMe) continue;
      if (isGroup || isBroadcast) continue;         // skip groups and broadcasts
      if (!isS && !isLid) continue;                  // skip status, newsletter, etc.

      // For "append" (history sync), only process very recent messages
      if (type === "append") {
        const msgTs = Number(msg.messageTimestamp ?? 0) * 1000;
        if (Date.now() - msgTs > 5 * 60_000) continue;
      }

      const text =
        msg.message?.conversation ??
        msg.message?.extendedTextMessage?.text ??
        null;
      if (!text) {
        console.log(`[${userId}] non-text/empty from ${remoteJid} type=${type} — skipped`);
        continue;
      }

      // @s.whatsapp.net → número de teléfono; @lid → ID numérico (no es el teléfono real pero es único)
      const phone = isS
        ? (remoteJid.split("@")[0]?.split(":")[0] ?? "")
        : (remoteJid.split("@")[0] ?? "");
      const pushName = msg.pushName ?? null;
      console.log(`[${userId}] Incoming text from ${phone} (type=${type} lid=${isLid}): ${text.slice(0, 60)}`);

      // Fire-and-forget POST to the Supabase edge function.
      forwardIncomingMessage({
        userId,
        phone,
        remoteJid,
        pushName,
        text,
        waMsgId: msg.key.id ?? null,
      }).catch((err) => console.error(`[${userId}] forwardIncomingMessage failed:`, err));
    }
  });

  // Phone-number pairing: request code after socket initializes
  if (phoneNumber && !state.creds.registered) {
    await new Promise(r => setTimeout(r, 2000));
    try {
      const digits = phoneNumber.replace(/\D/g, "");
      const code = await sock.requestPairingCode(digits);
      await supabase
        .from("whatsapp_sessions")
        .upsert({ user_id: userId, instance_name: userId, status: "qr_pending", pairing_code: code, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      console.log(`[${userId}] Pairing code: ${code}`);
      return code;
    } catch (err) {
      console.error(`[${userId}] requestPairingCode failed:`, err);
    }
  }

  return null;
}

export async function deleteSession(userId: string): Promise<void> {
  const timer = reconnectTimers.get(userId);
  if (timer) {
    clearTimeout(timer);
    reconnectTimers.delete(userId);
  }

  sessionReady.set(userId, false);

  const sock = sessions.get(userId);
  if (sock) {
    try { await sock.logout(); } catch {}
    try { sock.end(undefined); } catch {}
    sessions.delete(userId);
  }

  await clearAuthState(userId);

  await supabase
    .from("whatsapp_sessions")
    .update({ status: "disconnected", phone_number: null, qr_code: null, pairing_code: null })
    .eq("user_id", userId);
}

export function getSession(userId: string): WASocket | undefined {
  return sessions.get(userId);
}

/**
 * Guarda un mensaje saliente en el store de retry. WhatsApp puede pedir un retry
 * inmediato tras el send — si el mensaje no está en el store cuando llega el receipt,
 * el destinatario queda en "Waiting for the message". Esta función cierra la ventana
 * race entre sock.sendMessage() y el messages.upsert que Baileys dispara internamente.
 */
export function storeOutgoingMessage(userId: string, msgId: string, content: proto.IMessage): void {
  let store = msgStores.get(userId);
  if (!store) {
    store = new Map();
    msgStores.set(userId, store);
  }
  store.set(msgId, content);
}

/**
 * Block until the session is fully ready to send (pre-keys uploaded).
 * Prevents the "Waiting for the message" bug on first message to a
 * never-contacted recipient. Returns false on timeout.
 */
export async function waitUntilReady(userId: string, timeoutMs = 60_000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (sessionReady.get(userId)) return true;
    await new Promise(r => setTimeout(r, 250));
  }
  return sessionReady.get(userId) === true;
}

/**
 * Returns an active session. If not in memory but DB shows status=connected,
 * triggers reconnect.
 */
export async function ensureSession(userId: string): Promise<WASocket | null> {
  const existing = sessions.get(userId);
  if (existing) return existing;

  const { data } = await supabase
    .from("whatsapp_sessions")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();

  if (data?.status !== "connected") return null;

  console.log(`[${userId}] Session not in memory but DB says connected — reconnecting...`);
  await createSession(userId);
  return sessions.get(userId) ?? null;
}

/** On service startup: reconnect all users with status=connected */
export async function reconnectActiveSessions(): Promise<void> {
  const { data } = await supabase
    .from("whatsapp_sessions")
    .select("user_id")
    .eq("status", "connected");

  if (!data?.length) return;
  console.log(`[startup] Reconnecting ${data.length} active session(s)...`);
  for (const { user_id } of data) {
    await createSession(user_id).catch((err) =>
      console.error(`[startup] Failed to reconnect ${user_id}:`, err),
    );
  }
}
