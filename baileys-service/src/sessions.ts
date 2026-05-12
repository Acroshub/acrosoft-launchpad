import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import QRCode from "qrcode";
import pino from "pino";
import { supabase } from "./supabase";
import { useSupabaseAuthState } from "./auth-state";

const logger = pino({ level: "warn" });

const sessions = new Map<string, WASocket>();

async function updateStatus(
  userId: string,
  status: "disconnected" | "qr_pending" | "connected",
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

  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useSupabaseAuthState(userId);

  const sock = makeWASocket({
    version,
    logger,
    auth: state,
    printQRInTerminal: false,
    browser: Browsers.macOS("Desktop"),
    markOnlineOnConnect: false,
    syncFullHistory: false,
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
        await updateStatus(userId, "disconnected");
        setTimeout(() => createSession(userId), 3_000);
      } else if (reason === 440) {
        console.log(`[${userId}] Connection replaced (440), reconnecting in 15s...`);
        await updateStatus(userId, "disconnected");
        setTimeout(() => createSession(userId), 15_000);
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
