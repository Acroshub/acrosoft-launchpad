import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeBase64(qr: string | null | undefined): string | null {
  if (!qr) return null;
  return qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`;
}

function jidToPhone(jid: string | null | undefined): string | null {
  if (!jid) return null;
  return jid.split("@")[0]?.split(":")[0] ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return respond({ error: "Unauthorized" }, 401);

  const userId = user.id;

  const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
  const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return respond({ error: "Evolution API not configured" }, 503);
  }

  const apiBase = EVOLUTION_API_URL.replace(/\/$/, "");
  const apiHeaders = {
    "Content-Type": "application/json",
    "apikey": EVOLUTION_API_KEY,
  };

  const { action, phone, text } = await req.json().catch(() => ({})) as {
    action?: string;
    phone?:  string;
    text?:   string;
  };

  const adminDb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  async function setStatus(
    status: "disconnected" | "qr_pending" | "connecting" | "connected",
    extra: Record<string, unknown> = {},
  ) {
    await adminDb.from("whatsapp_sessions").upsert(
      {
        user_id:       userId,
        instance_name: userId,
        status,
        ...extra,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  }

  async function fetchEvolutionState(): Promise<"open" | "close" | "connecting" | null> {
    const res = await fetch(`${apiBase}/instance/connectionState/${userId}`, {
      headers: apiHeaders,
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    return (json?.instance?.state ?? null) as "open" | "close" | "connecting" | null;
  }

  async function fetchOwnerPhone(): Promise<string | null> {
    const res = await fetch(`${apiBase}/instance/fetchInstances?instanceName=${userId}`, {
      headers: apiHeaders,
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    const item = Array.isArray(json) ? json[0] : json;
    const owner = item?.ownerJid ?? item?.instance?.owner ?? item?.owner ?? null;
    return jidToPhone(owner);
  }

  async function teardownInstance(): Promise<void> {
    // Evolution v2: logout first (closes WhatsApp link), then delete (removes config)
    await fetch(`${apiBase}/instance/logout/${userId}`,  { method: "DELETE", headers: apiHeaders }).catch(() => {});
    await fetch(`${apiBase}/instance/delete/${userId}`,  { method: "DELETE", headers: apiHeaders }).catch(() => {});
  }

  async function getQrFromConnect(): Promise<{ qr: string | null; debug: Record<string, unknown> }> {
    const res = await fetch(`${apiBase}/instance/connect/${userId}`, { headers: apiHeaders });
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch { /* not JSON */ }
    const qr = json?.qrcode?.base64
      ?? json?.base64
      ?? json?.qrcode?.code
      ?? json?.code
      ?? null;
    return {
      qr: normalizeBase64(qr),
      debug: {
        connect_status: res.status,
        connect_ok: res.ok,
        connect_topLevelKeys: json ? Object.keys(json) : null,
        connect_qrcodeKeys: json?.qrcode ? Object.keys(json.qrcode) : null,
        connect_rawBodyPreview: text?.slice(0, 500) ?? null,
      },
    };
  }

  switch (action) {

    // ── start: create a fresh instance and generate first QR ──────────────────
    case "start": {
      // If already connected, refresh DB and exit early
      const existingState = await fetchEvolutionState();
      if (existingState === "open") {
        const phoneNumber = await fetchOwnerPhone();
        await setStatus("connected", { phone_number: phoneNumber, qr_code: null, pairing_code: null });
        return respond({ ok: true, alreadyConnected: true });
      }

      // Wipe stale instance state, then create new one
      await teardownInstance();

      const createRes = await fetch(`${apiBase}/instance/create`, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify({
          instanceName: userId,
          integration:  "WHATSAPP-BAILEYS",
          qrcode:       true,
        }),
      });
      const createText = await createRes.text();
      let createJson: any = null;
      try { createJson = JSON.parse(createText); } catch { /* not JSON */ }

      if (!createRes.ok) {
        return respond({
          error: `Evolution create failed: ${createText}`,
          debug: { create_status: createRes.status, create_body: createText?.slice(0, 500) },
        }, 502);
      }

      // QR usually comes back in /instance/create; fall back to /instance/connect if missing.
      let qr: string | null = normalizeBase64(
        createJson?.qrcode?.base64 ?? createJson?.qrcode?.code ?? null,
      );
      let connectDebug: Record<string, unknown> = {};
      if (!qr) {
        const connectResult = await getQrFromConnect();
        qr = connectResult.qr;
        connectDebug = connectResult.debug;
      }

      if (!qr) {
        // No QR generated → don't lie in BD. Teardown and return error so UI shows actionable state.
        await teardownInstance();
        await setStatus("disconnected", { phone_number: null, qr_code: null, pairing_code: null });
        return respond({
          error: "Evolution no generó QR. Reintenta.",
          debug: {
            create_status: createRes.status,
            create_topLevelKeys: createJson ? Object.keys(createJson) : null,
            create_qrcodeKeys: createJson?.qrcode ? Object.keys(createJson.qrcode) : null,
            create_rawBodyPreview: createText?.slice(0, 500),
            ...connectDebug,
          },
        }, 502);
      }

      await setStatus("qr_pending", { qr_code: qr, phone_number: null, pairing_code: null });
      return respond({ ok: true });
    }

    // ── pairing_code: not supported by Evolution API integration ──────────────
    case "pairing_code": {
      return respond({ pairing_code: null, status: "disconnected" });
    }

    // ── qr: refresh current QR + check if connected ───────────────────────────
    case "qr": {
      const state = await fetchEvolutionState();
      if (state === "open") {
        const phoneNumber = await fetchOwnerPhone();
        await setStatus("connected", { phone_number: phoneNumber, qr_code: null });
        return respond({ qr: null, status: "connected" });
      }

      // Evolution's "connecting" state covers BOTH "waiting for QR scan" and "post-scan handshake".
      // Always try to fetch the QR first — if one comes back, user still needs to scan.
      const { qr } = await getQrFromConnect();
      if (qr) {
        await setStatus("qr_pending", { qr_code: qr });
        return respond({ qr, status: "qr_pending" });
      }

      // No QR and state=connecting → either post-scan handshake OR zombie instance.
      // Distinguish by current DB state: if we never saw qr_pending/connecting, Evolution is stale.
      if (state === "connecting") {
        const { data: dbRow } = await adminDb
          .from("whatsapp_sessions")
          .select("status")
          .eq("user_id", userId)
          .maybeSingle();

        if (dbRow?.status === "qr_pending" || dbRow?.status === "connecting") {
          await setStatus("connecting");
          return respond({ qr: null, status: "connecting" });
        }

        // Zombie: Evolution holds a stale instance with no active scan flow. Reset.
        await teardownInstance();
        await setStatus("disconnected", { phone_number: null, qr_code: null, pairing_code: null });
        return respond({ qr: null, status: "disconnected" });
      }

      // No QR, state=close/null → fall back to DB (might still hold last cached QR)
      const { data } = await adminDb
        .from("whatsapp_sessions")
        .select("qr_code, status")
        .eq("user_id", userId)
        .maybeSingle();
      return respond({ qr: data?.qr_code ?? null, status: data?.status ?? "disconnected" });
    }

    // ── status: connection state + phone number ───────────────────────────────
    case "status": {
      const state = await fetchEvolutionState();
      if (state === "open") {
        const phoneNumber = await fetchOwnerPhone();
        await setStatus("connected", { phone_number: phoneNumber, qr_code: null });
        return respond({ status: "connected", phone_number: phoneNumber });
      }
      if (state === "connecting") {
        await setStatus("connecting");
        return respond({ status: "connecting", phone_number: null });
      }

      // Evolution doesn't know about this instance (yet) — fall back to DB
      const { data } = await adminDb
        .from("whatsapp_sessions")
        .select("status, phone_number")
        .eq("user_id", userId)
        .maybeSingle();
      if (data?.status === "qr_pending") {
        return respond({ status: "qr_pending", phone_number: null });
      }
      return respond({ status: "disconnected", phone_number: null });
    }

    // ── disconnect: logout + delete + reset DB ────────────────────────────────
    case "disconnect": {
      await teardownInstance();
      await setStatus("disconnected", { phone_number: null, qr_code: null, pairing_code: null });
      return respond({ ok: true });
    }

    // ── send: send a WhatsApp text (called by send-reminders) ─────────────────
    case "send": {
      if (!phone || !text) return respond({ error: "phone and text required" }, 400);
      const cleanPhone = phone.replace(/\D/g, "");

      const res = await fetch(`${apiBase}/message/sendText/${userId}`, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify({ number: cleanPhone, text }),
      });
      if (!res.ok) {
        const err = await res.text();
        return respond({ error: `Evolution send failed: ${err}` }, 502);
      }
      return respond({ ok: true });
    }

    default:
      return respond({ error: `Unknown action: ${action}` }, 400);
  }
});
