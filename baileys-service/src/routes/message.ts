import { Router, Request, Response } from "express";
import { ensureSession, storeOutgoingMessage, waitUntilReady } from "../sessions";

const router = Router();

function formatPhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

// POST /message/send
// Body: { userId: string, phone: string, text: string }
router.post("/send", async (req: Request, res: Response) => {
  const { userId, phone, text } = req.body as {
    userId: string;
    phone:  string;
    text:   string;
  };

  if (!userId || !phone || !text) {
    res.status(400).json({ error: "userId, phone and text are required" });
    return;
  }

  const digits = formatPhone(phone);
  if (digits.length < 10) {
    res.status(400).json({ error: `Invalid phone number: ${phone}` });
    return;
  }

  const sock = await ensureSession(userId);
  if (!sock) {
    res.status(404).json({ error: `No active WhatsApp session for user ${userId}` });
    return;
  }

  const ready = await waitUntilReady(userId, 60_000);
  if (!ready) {
    res.status(503).json({ error: "WhatsApp session not fully ready (pre-keys upload pending). Retry in a moment." });
    return;
  }

  try {
    // 1. Resolve canonical JID via WhatsApp server. This also confirms the
    //    number has WhatsApp before we try to encrypt for it.
    const probe = await sock.onWhatsApp(`${digits}@s.whatsapp.net`);
    const hit = probe?.[0];
    if (!hit?.exists) {
      res.status(404).json({ error: `Number ${digits} is not on WhatsApp` });
      return;
    }
    const jid = hit.jid;
    console.log(`[message/send] ${userId} → ${jid} | text length: ${text.length}`);

    // 2. Force a fresh Signal session handshake. Without this, the first send
    //    to a never-contacted number ships ciphertext the recipient can't
    //    decrypt yet, producing "Waiting for the message".
    try {
      await sock.assertSessions([jid], true);
      console.log(`[message/send] session asserted for ${jid}`);
    } catch (err) {
      console.warn(`[message/send] assertSessions failed for ${jid}:`, err);
    }

    const result = await sock.sendMessage(jid, { text });
    if (result?.key?.id && result.message) {
      storeOutgoingMessage(userId, result.key.id, result.message);
    }
    console.log(`[message/send] sent ok | msgId: ${result?.key?.id} | status: ${result?.status}`);
    res.json({ ok: true, msgId: result?.key?.id, jid });
  } catch (err) {
    console.error(`[message/send] ERROR ${userId} → ${phone}:`, err);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
