import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const ADMIN_EMAIL   = "e.daniel.acero.r@gmail.com";
const RESEND_FROM   = Deno.env.get("RESEND_FROM_EMAIL") ?? "soporte@acrosoft.app";
const APP_URL       = Deno.env.get("SITE_URL") ?? "https://app.acrosoft.app";

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  resendKey: string,
) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: `Acrosoft Soporte <${RESEND_FROM}>`, to, subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error ${res.status}: ${err}`);
  }
}

// ─── Email templates ──────────────────────────────────────────────────────────

function templateNewTicket(opts: {
  clientEmail: string;
  type: "ticket" | "suggestion";
  subject: string;
  content: string;
}) {
  const typeLabel = opts.type === "ticket" ? "Ticket de soporte" : "Sugerencia";
  return `
<!DOCTYPE html><html lang="es"><body style="font-family:sans-serif;background:#f4f4f5;padding:32px 0;margin:0">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7">
  <div style="background:#18181b;padding:24px 28px">
    <p style="color:#fff;font-size:15px;font-weight:600;margin:0">Acrosoft Soporte</p>
  </div>
  <div style="padding:28px">
    <p style="margin:0 0 4px;font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:.05em;font-weight:600">${typeLabel}</p>
    <h2 style="margin:0 0 20px;font-size:18px;color:#18181b">${opts.subject}</h2>
    <p style="margin:0 0 6px;font-size:12px;color:#71717a">De:</p>
    <p style="margin:0 0 20px;font-size:14px;color:#18181b">${opts.clientEmail}</p>
    <p style="margin:0 0 6px;font-size:12px;color:#71717a">Mensaje:</p>
    <div style="background:#f4f4f5;border-radius:8px;padding:14px;font-size:14px;color:#18181b;line-height:1.6;white-space:pre-wrap">${opts.content}</div>
    <div style="margin-top:24px">
      <a href="${APP_URL}/crm" style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:500">
        Ver en Acrosoft →
      </a>
    </div>
  </div>
  <div style="padding:16px 28px;border-top:1px solid #e4e4e7">
    <p style="margin:0;font-size:11px;color:#a1a1aa">Acrosoft Labs · Sistema de soporte</p>
  </div>
</div>
</body></html>`;
}

function templateAdminReply(opts: {
  ticketSubject: string;
  replyContent: string;
}) {
  return `
<!DOCTYPE html><html lang="es"><body style="font-family:sans-serif;background:#f4f4f5;padding:32px 0;margin:0">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7">
  <div style="background:#18181b;padding:24px 28px">
    <p style="color:#fff;font-size:15px;font-weight:600;margin:0">Acrosoft Soporte</p>
  </div>
  <div style="padding:28px">
    <p style="margin:0 0 4px;font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:.05em;font-weight:600">Respuesta a tu ticket</p>
    <h2 style="margin:0 0 20px;font-size:18px;color:#18181b">${opts.ticketSubject}</h2>
    <p style="margin:0 0 6px;font-size:12px;color:#71717a">El equipo de Acrosoft respondió:</p>
    <div style="background:#f4f4f5;border-radius:8px;padding:14px;font-size:14px;color:#18181b;line-height:1.6;white-space:pre-wrap">${opts.replyContent}</div>
    <div style="margin-top:24px">
      <a href="${APP_URL}/crm" style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:500">
        Ver hilo completo →
      </a>
    </div>
  </div>
  <div style="padding:16px 28px;border-top:1px solid #e4e4e7">
    <p style="margin:0;font-size:11px;color:#a1a1aa">Acrosoft Labs · Sistema de soporte</p>
  </div>
</div>
</body></html>`;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) return respond({ error: "RESEND_API_KEY not configured" }, 500);

  let body: {
    trigger: "new_ticket" | "admin_reply";
    ticketId: string;
    messageContent?: string;
  };

  try {
    body = await req.json();
  } catch {
    return respond({ error: "Invalid JSON body" }, 400);
  }

  const { trigger, ticketId, messageContent } = body;
  if (!trigger || !ticketId) return respond({ error: "Missing trigger or ticketId" }, 400);

  // ── Fetch ticket ─────────────────────────────────────────────────────────────
  const { data: ticket, error: tErr } = await supabase
    .from("support_tickets")
    .select("id, subject, type, user_id, status")
    .eq("id", ticketId)
    .single();

  if (tErr || !ticket) return respond({ error: "Ticket not found" }, 404);

  // ── Resolve client email ─────────────────────────────────────────────────────
  const { data: account } = await supabase
    .from("crm_client_accounts")
    .select("client_email")
    .eq("client_user_id", ticket.user_id)
    .maybeSingle();

  const clientEmail = account?.client_email ?? null;

  // ─────────────────────────────────────────────────────────────────────────────
  if (trigger === "new_ticket") {
    // Fetch initial message
    const { data: msg } = await supabase
      .from("support_messages")
      .select("content")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const content = msg?.content ?? "(sin contenido)";
    const typeLabel = ticket.type === "ticket" ? "ticket" : "sugerencia";

    const html = templateNewTicket({
      clientEmail: clientEmail ?? ticket.user_id,
      type: ticket.type,
      subject: ticket.subject,
      content,
    });

    // Always notify admin
    const recipients = [ADMIN_EMAIL];

    // Also notify configured staff (SP-5 — reads support_notification_recipients if table exists)
    try {
      const { data: extra } = await supabase
        .from("support_notification_recipients")
        .select("email")
        .eq("active", true);
      for (const r of extra ?? []) {
        if (r.email && !recipients.includes(r.email)) recipients.push(r.email);
      }
    } catch {
      // Table doesn't exist yet (SP-5 not implemented) — ignore
    }

    await Promise.allSettled(
      recipients.map((to) =>
        sendEmail(
          to,
          `[Soporte] Nuevo ${typeLabel}: ${ticket.subject}`,
          html,
          RESEND_API_KEY,
        )
      ),
    );

    return respond({ ok: true, trigger, recipients });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  if (trigger === "admin_reply") {
    if (!messageContent) return respond({ error: "Missing messageContent" }, 400);
    if (!clientEmail) return respond({ error: "Client email not found" }, 404);

    const html = templateAdminReply({
      ticketSubject: ticket.subject,
      replyContent: messageContent,
    });

    await sendEmail(
      clientEmail,
      `[Acrosoft Soporte] Respuesta a tu ticket: ${ticket.subject}`,
      html,
      RESEND_API_KEY,
    );

    return respond({ ok: true, trigger, to: clientEmail });
  }

  return respond({ error: "Unknown trigger" }, 400);
});
