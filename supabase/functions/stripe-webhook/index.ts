import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";
import { encodeHex } from "https://deno.land/std@0.208.0/encoding/hex.ts";
import { EBOOK_CATALOG } from "../_shared/ebook-catalog.ts";

// ─── Webhook de Stripe — checkout.session.completed de un Payment Link ───────
// No usamos el SDK de Stripe (igual que el resto de las functions, que hablan
// con APIs externas por fetch plano) ni la Secret Key: el propio payload del
// evento ya trae la sesión completa (email, monto, payment_intent), así que
// lo único que necesitamos verificar es la firma con STRIPE_WEBHOOK_SECRET.

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Dos secretos porque Stripe test/live son entornos separados: cada uno tiene
// su propio webhook con su propio signing secret. Probamos contra los dos así
// se puede seguir probando en test sin tocar el webhook de producción.
const STRIPE_WEBHOOK_SECRETS = [
  Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "",
  Deno.env.get("STRIPE_WEBHOOK_SECRET_TEST") ?? "",
].filter(Boolean);
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "noreply@acrosoftlabs.com";
const APP_URL = Deno.env.get("APP_URL") ?? "https://acrosoftlabs.com";

// Tolerancia estándar de Stripe contra replay de webhooks viejos.
const TIMESTAMP_TOLERANCE_SECONDS = 5 * 60;

/** Verifica la firma `Stripe-Signature: t=...,v1=...` sobre el body crudo. */
async function verifyStripeSignature(rawBody: string, signatureHeader: string | null, secret: string): Promise<boolean> {
  if (!signatureHeader || !secret) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => p.split("=") as [string, string]),
  );
  const timestamp = parts["t"];
  const providedSig = parts["v1"];
  if (!timestamp || !providedSig) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > TIMESTAMP_TOLERANCE_SECONDS) return false;

  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${rawBody}`));
  const expected = encodeHex(new Uint8Array(sig));

  if (providedSig.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < providedSig.length; i++) diff |= providedSig.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

function buildConfirmationEmailHtml(params: { productName: string; thankYouUrl: string; amountLabel: string }): string {
  const { productName, thankYouUrl, amountLabel } = params;
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#FAF6EF;padding:32px 16px;">
    <div style="max-width:480px;margin:0 auto;background:#FFFFFF;border-radius:14px;overflow:hidden;border:1px solid #DED6BC;">
      <div style="background:#1B2A4A;padding:28px 28px 24px;text-align:center;">
        <p style="margin:0;color:#C9932E;font-weight:700;font-size:12.5px;letter-spacing:.08em;text-transform:uppercase;">Compra confirmada</p>
        <h1 style="margin:10px 0 0;color:#FFFFFF;font-size:22px;font-family:Georgia,serif;">¡Gracias por tu compra!</h1>
      </div>
      <div style="padding:28px;">
        <p style="margin:0 0 16px;font-size:15px;color:#22262E;line-height:1.6;">Tu pago de <strong>${amountLabel}</strong> por <strong>${productName}</strong> fue aprobado. Ya puedes descargar tus archivos.</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${thankYouUrl}" style="display:inline-block;background:#C1403A;color:#FFFFFF;font-weight:900;font-size:16px;padding:16px 28px;border-radius:8px;text-decoration:none;">Ver mi compra y descargar</a>
        </div>
        <p style="margin:0;font-size:13px;color:#5B6270;line-height:1.5;">Guarda este correo — este mismo enlace te sirve para volver a descargar tus archivos cuando quieras.</p>
      </div>
    </div>
  </div>`;
}

async function sendConfirmationEmail(params: { to: string; html: string; shortName: string }): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn("[stripe-webhook] RESEND_API_KEY no configurado, no se envía email");
    return false;
  }
  const { to, html, shortName } = params;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `${shortName} <${RESEND_FROM_EMAIL}>`,
      to: [to],
      subject: `Descarga tu compra: ${shortName}`,
      html,
    }),
  });
  if (!res.ok) {
    console.error("[stripe-webhook] Resend error:", res.status, await res.text());
  }
  return res.ok;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  let valid = false;
  for (const secret of STRIPE_WEBHOOK_SECRETS) {
    if (await verifyStripeSignature(rawBody, signature, secret)) { valid = true; break; }
  }
  if (!valid) {
    console.warn("[stripe-webhook] firma inválida o ningún STRIPE_WEBHOOK_SECRET* configurado");
    return new Response(JSON.stringify({ error: "invalid signature" }), { status: 401 });
  }

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: "bad json" }), { status: 400 });
  }

  // Solo nos importa la sesión de checkout pagada — el resto lo confirmamos
  // (200) para que Stripe no siga reintentando un evento que no vamos a usar.
  if (event.type !== "checkout.session.completed") {
    return new Response(JSON.stringify({ received: true, ignored: event.type }), { status: 200 });
  }

  const session = event.data.object as {
    id: string;
    payment_intent: string | null;
    payment_status: string;
    amount_total: number | null;
    currency: string | null;
    customer_details?: { email?: string | null } | null;
    customer_email?: string | null;
    metadata?: Record<string, string> | null;
  };

  if (session.payment_status !== "paid") {
    return new Response(JSON.stringify({ received: true, skipped: "not paid" }), { status: 200 });
  }

  const email = session.customer_details?.email ?? session.customer_email ?? null;
  if (!email) {
    console.error("[stripe-webhook] sesión pagada sin email:", session.id);
    return new Response(JSON.stringify({ error: "session has no email" }), { status: 400 });
  }

  const productSlug = session.metadata?.product_slug ?? "delf-a2";
  const catalogEntry = EBOOK_CATALOG[productSlug];
  if (!catalogEntry) {
    console.error("[stripe-webhook] product_slug desconocido:", productSlug);
    return new Response(JSON.stringify({ error: "unknown product_slug" }), { status: 400 });
  }

  // Idempotente: Stripe puede reintentar el mismo evento varias veces.
  const { data: existing } = await supabase
    .from("ebook_orders")
    .select("id, deliverable_sent_at")
    .eq("stripe_session_id", session.id)
    .maybeSingle();

  let orderId = existing?.id as string | undefined;

  if (!existing) {
    const { data: inserted, error: insertErr } = await supabase
      .from("ebook_orders")
      .insert({
        product_slug: productSlug,
        stripe_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent,
        customer_email: email,
        amount_total: session.amount_total ?? 0,
        currency: session.currency ?? "usd",
      })
      .select("id")
      .single();

    if (insertErr || !inserted) {
      console.error("[stripe-webhook] error insertando orden:", insertErr);
      return new Response(JSON.stringify({ error: "could not save order" }), { status: 500 });
    }
    orderId = inserted.id;
  }

  if (existing?.deliverable_sent_at) {
    return new Response(JSON.stringify({ received: true, already_sent: true }), { status: 200 });
  }

  const thankYouUrl = `${APP_URL}/ty-frances?session_id=${encodeURIComponent(session.id)}`;
  const amountLabel = `$${((session.amount_total ?? 0) / 100).toFixed(2)} ${(session.currency ?? "usd").toUpperCase()}`;
  const html = buildConfirmationEmailHtml({ productName: catalogEntry.name, thankYouUrl, amountLabel });

  const sent = await sendConfirmationEmail({ to: email, html, shortName: catalogEntry.shortName });
  if (sent && orderId) {
    await supabase.from("ebook_orders").update({ deliverable_sent_at: new Date().toISOString() }).eq("id", orderId);
  }

  return new Response(JSON.stringify({ received: true, email_sent: sent }), { status: 200 });
});
