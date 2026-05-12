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
import { useSupabaseAuthState } from "./auth-state";

const logger = pino({ level: "warn" });

const sessions = new Map<string, WASocket>();
const retryCount = new Map<string, number>();
const msgRetryCounterCache = new NodeCache();
// Per-user store for getMessage (needed to answer recipient retry requests)
const msgStores = new Map<string, Map<string, proto.IMessage>>();

async function updateStatus(
  userId: string,
  status: "disconnected" | "qr_pending" | "connected" | "connecting",
  extra: { phone_number?: string | null; qr_code?: string | null } = {},
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
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
}

export async function createSession(userId: string, phoneNumber?: string | null): Promise<string | null> {
  // Destroy existing session first to prevent listener leaks
  const existing = sessions.get(userId);
  if (existing) {
    try { existing.end(undefined); } catch {}
    sessions.delete(userId);
    await new Promise(r => setTimeout(r, 500));
  }

  // Phone pairing requires a clean slate — existing credentials (e.g. from a prior QR
  // connection) cause requestPairingCode to be skipped because creds.registered is true.
  if (phoneNumber) {
    await supabase
      .from("whatsapp_sessions")
      .update({ auth_state: null, status: "qr_pending", qr_code: null, pairing_code: null })
      .eq("user_id", userId);
  }

  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useSupabaseAuthState(userId);

  if (!msgStores.has(userId)) msgStores.set(userId, new Map());
  const msgStore = msgStores.get(userId)!;

  const sock = makeWASocket({
    version,
    logger,
    auth: state,
    printQRInTerminal: false,
    browser: Browsers.ubuntu("Chrome"),
    markOnlineOnConnect: false,
    syncFullHistory: false,
    keepAliveIntervalMs: 10_000,
    connectTimeoutMs: 90_000,
    defaultQueryTimeoutMs: 90_000,
    msgRetryCounterCache,
    getMessage: async (key) => msgStore.get(key.id!) ?? undefined,
  });

  sessions.set(userId, sock);

  sock.ev.on("creds.update", saveCreds);

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

    if (connection === "open") {
      retryCount.delete(userId);
      const phone = sock.user?.id?.split(":")[0] ?? null;
      await updateStatus(userId, "connected", { phone_number: phone, qr_code: null });
      await supabase.from("whatsapp_sessions").update({ pairing_code: null }).eq("user_id", userId);
      console.log(`[${userId}] Connected as ${phone}`);
    }

    if (connection === "close") {
      const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const loggedOut = reason === DisconnectReason.loggedOut;
      console.log(`[${userId}] Connection closed. Reason: ${reason}. Logged out: ${loggedOut}`);

      sessions.delete(userId);

      if (loggedOut) {
        await supabase
          .from("whatsapp_sessions")
          .update({ status: "disconnected", phone_number: null, qr_code: null, pairing_code: null, auth_state: null })
          .eq("user_id", userId);
      } else if (reason === DisconnectReason.restartRequired || reason === 515) {
        console.log(`[${userId}] Restart required (${reason}), reconnecting in 3s...`);
        await updateStatus(userId, "connecting");
        setTimeout(() => createSession(userId), 3_000);
      } else if (reason === 440) {
        console.log(`[${userId}] Connection replaced (440), reconnecting in 15s...`);
        await updateStatus(userId, "connecting");
        setTimeout(() => createSession(userId), 15_000);
      } else if (reason === undefined) {
        // "undefined" can mean two things:
        //  (A) WhatsApp is processing the pairing code the user just entered — it closes the
        //      pre-auth socket and expects us to reconnect; 515 follows on the new socket.
        //  (B) The socket died prematurely before the user entered the code.
        //
        // Strategy: reconnect exactly ONCE. If undefined fires a second time without ever
        // reaching "open", it is case (B) and we require a manual reconnect.
        const retries = (retryCount.get(userId) ?? 0) + 1;
        retryCount.set(userId, retries);
        if (retries === 1) {
          console.log(`[${userId}] Socket closed (undefined) — reconnecting once for pairing handshake...`);
          await updateStatus(userId, "connecting");
          setTimeout(() => createSession(userId), 2_000);
        } else {
          console.log(`[${userId}] Socket closed again (undefined, attempt ${retries}) — session expired, manual reconnect required.`);
          retryCount.delete(userId);
          await supabase
            .from("whatsapp_sessions")
            .update({ status: "disconnected", qr_code: null, pairing_code: null })
            .eq("user_id", userId);
        }
      } else {
        console.log(`[${userId}] Session ended (reason: ${reason}). Manual reconnect required.`);
        await supabase
          .from("whatsapp_sessions")
          .update({ status: "disconnected", qr_code: null, pairing_code: null })
          .eq("user_id", userId);
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const msg of messages) {
      // Store all messages so getMessage can fulfill retry requests
      if (msg.message && msg.key.id) {
        msgStore.set(msg.key.id, msg.message);
      }
      if (!msg.key.fromMe && msg.message) {
        console.log(`[${userId}] Incoming message from ${msg.key.remoteJid}`);
      }
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
  const sock = sessions.get(userId);
  if (sock) {
    try { sock.end(undefined); } catch {}
    sessions.delete(userId);
  }
  await supabase
    .from("whatsapp_sessions")
    .update({ status: "disconnected", phone_number: null, qr_code: null, auth_state: null })
    .eq("user_id", userId);
}

export function getSession(userId: string): WASocket | undefined {
  return sessions.get(userId);
}

/**
 * Returns an active session. If not in memory but DB shows status=connected,
 * triggers reconnect and waits up to 20s for the socket to reach "open" state.
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
  // createSession() puts the socket in the map immediately.
  // Baileys internally queues sendMessage until connection is open.
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
