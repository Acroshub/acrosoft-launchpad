import { Router, Request, Response } from "express";
import { getSession } from "../sessions";

const router = Router();

function formatPhone(raw: string): string {
  // Strip all non-digit characters, ensure no leading +
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

  const sock = getSession(userId);
  if (!sock) {
    res.status(404).json({ error: `No active session for user ${userId}` });
    return;
  }

  try {
    const jid = `${formatPhone(phone)}@s.whatsapp.net`;
    await sock.sendMessage(jid, { text });
    res.json({ ok: true });
  } catch (err) {
    console.error(`[message/send] ${userId} → ${phone}:`, err);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
