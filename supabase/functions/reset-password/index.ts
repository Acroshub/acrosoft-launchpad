import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // ── Rate limiting: 5 reset attempts per IP per hour ──────────────────────────
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("x-real-ip")
    ?? "unknown";
  const { data: allowed, error: rlErr } = await supabase.rpc("check_rate_limit", {
    p_key: `reset-password:${clientIp}`,
    p_window_seconds: 3600,
    p_max_count: 5,
  });
  if (rlErr) console.error("rate_limit check error (non-blocking):", rlErr);
  if (allowed === false) {
    return new Response(JSON.stringify({ error: "Demasiados intentos. Intenta más tarde." }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "3600" },
    });
  }

  try {
    const body = await req.json();
    // El autocompletado de iOS deja un espacio al final: sin limpiarlo, Supabase no
    // encuentra la cuenta y el correo nunca sale.
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) return respond({ error: "email is required" }, 400);

    const siteUrl = Deno.env.get("SITE_URL") ?? "http://localhost:5173";

    // Generate a password recovery token
    const { data, error: linkErr } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
    });

    if (linkErr) {
      // Don't reveal if email exists or not
      return respond({ success: true });
    }

    // El enlace va directo a la app con el token_hash, y /crm-setup lo canjea con verifyOtp.
    // No se usa action_link: pasa por /auth/v1/verify, que gasta el token con cualquier GET
    // (vistas previas de WhatsApp, escáneres de correo) y entrega la sesión en el #hash,
    // formato que el cliente PKCE del frontend rechaza.
    const tokenHash = data.properties?.hashed_token;
    if (!tokenHash) return respond({ success: true });
    const recoveryLink = `${siteUrl}/crm-setup?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`;

    // Send via Resend directly
    const RESEND_API_KEY  = Deno.env.get("RESEND_API_KEY");
    const RESEND_FROM     = Deno.env.get("RESEND_FROM_EMAIL") ?? "noreply@acrosoftlabs.com";

    if (!RESEND_API_KEY) return respond({ error: "Email service not configured" }, 500);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [email],
        subject: "Restablece tu contraseña — Acrosoft",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
            <h2 style="font-size:20px;font-weight:600;margin-bottom:8px">Restablece tu contraseña</h2>
            <p style="color:#6b7280;margin-bottom:24px">Haz clic en el botón para establecer una nueva contraseña. El enlace expira en 1 hora.</p>
            <a href="${recoveryLink}"
               style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:500;font-size:14px">
              Establecer contraseña
            </a>
            <p style="color:#9ca3af;font-size:12px;margin-top:24px">Si no solicitaste esto, puedes ignorar este correo.</p>
            <p style="color:#d1d5db;font-size:11px;margin-top:32px;text-transform:uppercase;letter-spacing:.05em">Acrosoft Labs · Acceso seguro</p>
          </div>
        `,
      }),
    });

    // Antes no se revisaba la respuesta: si Resend rechazaba el envío, el usuario veía
    // "Correo enviado" y el correo nunca llegaba, sin rastro en los logs.
    const resendBody = await res.text();
    if (!res.ok) {
      console.error(`reset-password: Resend rechazó el envío (${res.status}):`, resendBody);
      return respond({ error: "No se pudo enviar el correo" }, 502);
    }
    console.log("reset-password: correo aceptado por Resend", resendBody);

    return respond({ success: true });

  } catch (err) {
    console.error("reset-password error:", err);
    return respond({ error: "Error interno" }, 500);
  }
});
