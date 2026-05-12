import makeWASocket, {
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

export async function createSession(userId: string): Promise<void> {
  // If a session already exists, destroy it first
  const existing = sessions.get(userId);
  if (existing) {
    try { existing.end(undefined); } catch {}
    sessions.delete(userId);
  }

  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useSupabaseAuthState(userId);

  const sock = makeWASocket({
    version,
    logger,
    auth: state,
    printQRInTerminal: false,
    browser: ["Acrosoft CRM", "Chrome", "1.0"],
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
      console.log(`[${userId}] Connected as ${phone}`);
    }

    if (connection === "close") {
      const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const loggedOut = reason === DisconnectReason.loggedOut;
      console.log(`[${userId}] Connection closed. Reason: ${reason}. Logged out: ${loggedOut}`);

      sessions.delete(userId);

      if (loggedOut) {
        // Clear auth state and mark disconnected
        await supabase
          .from("whatsapp_sessions")
          .update({ status: "disconnected", phone_number: null, qr_code: null, auth_state: null })
          .eq("user_id", userId);
      } else {
        // Transient disconnect — reconnect automatically
        await updateStatus(userId, "disconnected");
        setTimeout(() => createSession(userId), 5_000);
      }
    }
  });

  // Ready for incoming messages (LLM agent hook — implement here in next iteration)
  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const msg of messages) {
      if (!msg.key.fromMe && msg.message) {
        // TODO: route to LLM agent
        console.log(`[${userId}] Incoming message from ${msg.key.remoteJid}`);
      }
    }
  });
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
