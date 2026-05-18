import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const RESEND_API_KEY  = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM     = `Acrosoft <${Deno.env.get("RESEND_FROM_EMAIL") ?? "noreply@acrosoftlabs.com"}>`;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  // Auth: sólo llamadas internas (desde ai-agent)
  const internalKey = req.headers.get("x-internal-key");
  if (internalKey !== SERVICE_ROLE_KEY) {
    return new Response("unauthorized", { status: 401 });
  }

  const { to, subject, html } = await req.json();

  if (!to || !subject || !html) {
    return new Response(JSON.stringify({ error: "missing fields" }), { status: 400 });
  }

  if (!RESEND_API_KEY) {
    console.warn("[notify-sale] RESEND_API_KEY no configurado");
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not set" }), { status: 500 });
  }

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: RESEND_FROM, to: [to], subject, html }),
  });

  const body = await r.text();
  console.log(`[notify-sale] status:${r.status} to:${to} body:${body.slice(0, 200)}`);

  return new Response(JSON.stringify({ status: r.status, body }), { status: r.ok ? 200 : 500 });
});
