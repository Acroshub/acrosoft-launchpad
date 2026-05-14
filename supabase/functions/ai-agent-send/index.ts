// ────────────────────────────────────────────────────────────────────────────
// ai-agent-send
// Envía un mensaje manual (humano) en una conversación AI. Usado cuando el
// admin toma el control y responde directamente desde la UI.
// ────────────────────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const SUPER_ADMIN_EMAIL    = "e.daniel.acero.r@gmail.com";
const BAILEYS_SERVICE_URL  = Deno.env.get("BAILEYS_SERVICE_URL")!;
const BAILEYS_API_KEY      = Deno.env.get("BAILEYS_API_KEY")!;

const adminClient = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function respond(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

async function authUser(req: Request) {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
  );
  const { data } = await supabase.auth.getUser();
  return data.user;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: getCorsHeaders(req) });
  if (req.method !== "POST")     return respond(req, { error: "Method not allowed" }, 405);

  const user = await authUser(req);
  if (!user) return respond(req, { error: "Unauthorized" }, 401);
  if (user.email !== SUPER_ADMIN_EMAIL) return respond(req, { error: "Forbidden" }, 403);

  let body: any;
  try { body = await req.json(); } catch { return respond(req, { error: "Invalid JSON" }, 400); }

  const { conversation_id, text } = body ?? {};
  if (!conversation_id || !text?.trim()) {
    return respond(req, { error: "conversation_id y text son requeridos" }, 400);
  }

  const { data: conv, error: convErr } = await adminClient
    .from("ai_conversations")
    .select("id, user_id, phone")
    .eq("id", conversation_id)
    .maybeSingle();
  if (convErr || !conv) return respond(req, { error: "Conversación no encontrada" }, 404);
  if (conv.user_id !== user.id) return respond(req, { error: "Forbidden" }, 403);

  try {
    const res = await fetch(`${BAILEYS_SERVICE_URL.replace(/\/$/, "")}/message/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key":    BAILEYS_API_KEY,
      },
      body: JSON.stringify({ userId: conv.user_id, phone: conv.phone, text }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return respond(req, { error: `baileys ${res.status}: ${errText}` }, 502);
    }

    await adminClient.from("ai_messages").insert({
      conversation_id,
      role:    "human",
      content: text,
    });

    await adminClient.from("ai_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversation_id);

    return respond(req, { ok: true });
  } catch (err) {
    console.error("ai-agent-send error:", err);
    return respond(req, { error: (err as Error).message }, 500);
  }
});
