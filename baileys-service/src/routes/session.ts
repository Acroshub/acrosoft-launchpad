import { Router, Request, Response } from "express";
import { createSession, deleteSession } from "../sessions";

const router = Router();

// POST /session/:userId/start
router.post("/:userId/start", async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    await createSession(userId);
    res.json({ ok: true });
  } catch (err) {
    console.error(`[session/start] ${userId}:`, err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// DELETE /session/:userId
router.delete("/:userId", async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    await deleteSession(userId);
    res.json({ ok: true });
  } catch (err) {
    console.error(`[session/delete] ${userId}:`, err);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
