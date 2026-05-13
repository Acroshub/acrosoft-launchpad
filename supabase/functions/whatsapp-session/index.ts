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

  const BAILEYS_SERVICE_URL = Deno.env.get("BAILEYS_SERVICE_URL");
  const BAILEYS_API_KEY     = Deno.env.get("BAILEYS_API_KEY");

  if (!BAILEYS_SERVICE_URL || !BAILEYS_API_KEY) {
    return respond({ error: "Baileys service not configured" }, 503);
  }

  const { action, phone, text, phoneNumber } = await req.json().catch(() => ({})) as {
    action?:      string;
    phone?:       string;
    text?:        string;
    phoneNumber?: string;
  };

  const baileysHeaders = {
    "Content-Type": "application/json",
    "x-api-key": BAILEYS_API_KEY,
  };

  const adminDb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  switch (action) {

    case "start": {
      const res = await fetch(`${BAILEYS_SERVICE_URL}/session/${userId}/start`, {
        method: "POST",
        headers: baileysHeaders,
        body: JSON.stringify({ phoneNumber: phoneNumber ?? null }),
      });
      if (!res.ok) {
        const err = await res.text();
        return respond({ error: `Baileys error: ${err}` }, 502);
      }
      const json = await res.json();
      return respond({ ok: true, pairingCode: json.pairingCode ?? null });
    }

    case "pairing_code": {
      const { data } = await adminDb
        .from("whatsapp_sessions")
        .select("pairing_code, status")
        .eq("user_id", userId)
        .maybeSingle();
      if (!data) return respond({ pairing_code: null, status: "disconnected" });
      return respond({ pairing_code: data.pairing_code ?? null, status: data.status });
    }

    case "qr": {
      const { data } = await adminDb
        .from("whatsapp_sessions")
        .select("qr_code, status")
        .eq("user_id", userId)
        .maybeSingle();
      if (!data) return respond({ qr: null, status: "disconnected" });
      return respond({ qr: data.qr_code ?? null, status: data.status });
    }

    case "status": {
      const { data } = await adminDb
        .from("whatsapp_sessions")
        .select("status, phone_number")
        .eq("user_id", userId)
        .maybeSingle();
      if (!data) return respond({ status: "disconnected", phone_number: null });
      return respond({ status: data.status, phone_number: data.phone_number ?? null });
    }

    case "disconnect": {
      const res = await fetch(`${BAILEYS_SERVICE_URL}/session/${userId}`, {
        method: "DELETE",
        headers: baileysHeaders,
      });
      if (!res.ok) {
        const err = await res.text();
        return respond({ error: `Baileys error: ${err}` }, 502);
      }
      return respond({ ok: true });
    }

    case "send": {
      if (!phone || !text) return respond({ error: "phone and text required" }, 400);
      const res = await fetch(`${BAILEYS_SERVICE_URL}/message/send`, {
        method: "POST",
        headers: baileysHeaders,
        body: JSON.stringify({ userId, phone, text }),
      });
      if (!res.ok) {
        const err = await res.text();
        return respond({ error: `Baileys error: ${err}` }, 502);
      }
      return respond({ ok: true });
    }

    default:
      return respond({ error: `Unknown action: ${action}` }, 400);
  }
});
