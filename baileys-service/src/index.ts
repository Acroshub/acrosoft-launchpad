import "dotenv/config";
import express from "express";
import sessionRouter  from "./routes/session";
import messageRouter  from "./routes/message";
import { reconnectActiveSessions } from "./sessions";

const app  = express();
const PORT = parseInt(process.env.PORT ?? "3000", 10);
const API_KEY = process.env.BAILEYS_API_KEY;

if (!API_KEY) {
  console.error("FATAL: BAILEYS_API_KEY env var is not set");
  process.exit(1);
}

app.use(express.json());

// API key middleware — all routes below require the header
app.use((req, res, next) => {
  if (req.path === "/" && req.method === "GET") return next(); // health check exempt
  const key = req.headers["x-api-key"];
  if (key !== API_KEY) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
});

app.get("/", (_req, res) => res.json({ ok: true, service: "baileys-service" }));

app.use("/session", sessionRouter);
app.use("/message", messageRouter);

app.listen(PORT, "0.0.0.0", async () => {
  console.log(`baileys-service running on port ${PORT}`);
  await reconnectActiveSessions();
});
