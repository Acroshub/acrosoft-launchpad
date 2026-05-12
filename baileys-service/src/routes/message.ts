import { Router, Request, Response } from "express";
import { ensureSession } from "../sessions";

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

  try {
    const jid = `${digits}@s.whatsapp.net`;

    // Verify number on WhatsApp and pre-establish Signal session
    const waResults = await sock.onWhatsApp(jid).catch(() => [] as { jid: string; exists: boolean }[]) ?? [];
    const waResult = waResults[0] ?? null;
    if (waResult && !waResult.exists) {
      res.status(400).json({ error: `Phone ${phone} is not on WhatsApp` });
      return;
    }
    const resolvedJid = waResult?.jid ?? jid;

    await sock.sendMessage(resolvedJid, { text });
    res.json({ ok: true });
  } catch (err) {
    console.error(`[message/send] ${userId} → ${phone}:`, err);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
