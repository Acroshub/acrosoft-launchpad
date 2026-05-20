import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const GRAPH_VERSION = "v21.0";

const jsonHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function respond(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function metaErrMsg(body: string): string {
  try {
    const j = JSON.parse(body);
    const e = j.error ?? j;
    const code = e.code;
    if (code === 100) {
      return `Token sin permiso 'whatsapp_business_management'. Ve a Meta Developer Portal → tu App → Permisos → agrega whatsapp_business_management al System User, luego regenera el token. (Meta: ${e.message})`;
    }
    if (code === 190) {
      return `Token expirado o inválido. Regenera el Access Token en Meta Business Suite → Configuración → Usuarios del sistema. (Meta: ${e.message})`;
    }
    return e.message ?? body;
  } catch {
    return body;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: jsonHeaders });
  if (req.method !== "POST") return respond({ ok: false, error: "method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return respond({ ok: false, error: "no auth" }, 401);

  const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (authErr || !user) return respond({ ok: false, error: "unauthorized" }, 401);

  let body: { base64: string; mime_type: string };
  try { body = await req.json(); }
  catch { return respond({ ok: false, error: "bad json" }, 400); }

  const { base64, mime_type } = body;
  if (!base64 || !mime_type) return respond({ ok: false, error: "missing base64 or mime_type" }, 400);

  const { data: config, error: configErr } = await supabase
    .from("crm_ai_agent_config")
    .select("phone_number_id, access_token, waba_id")
    .eq("user_id", user.id)
    .single();

  if (configErr || !config?.access_token || !config?.waba_id || !config?.phone_number_id) {
    return respond({ ok: false, error: "Configura WABA ID, Phone Number ID y Access Token primero" });
  }

  const { phone_number_id, access_token, waba_id } = config;

  try {
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
    const fileSize = bytes.length;

    // Obtener App ID desde el token (el upload session requiere app-id, no waba-id)
    const appRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/app`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    const appBody = await appRes.text();
    if (!appRes.ok) return respond({ ok: false, error: `No se pudo obtener App ID: ${appBody}` });
    const appJson = JSON.parse(appBody);
    const appId: string = appJson.id;
    if (!appId) return respond({ ok: false, error: `Meta no devolvió App ID: ${appBody}` });

    // Step 1: Upload session usando app-id (no waba-id)
    const s1Res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${appId}/uploads?file_name=profile.jpg&file_length=${fileSize}&file_type=${encodeURIComponent(mime_type)}`,
      { method: "POST", headers: { Authorization: `Bearer ${access_token}` } }
    );
    const s1Body = await s1Res.text();
    if (!s1Res.ok) return respond({ ok: false, error: metaErrMsg(s1Body) });
    const s1Json = JSON.parse(s1Body);
    const uploadSessionId: string = s1Json.id;
    if (!uploadSessionId) return respond({ ok: false, error: `No session ID: ${s1Body}` });

    // Step 2: Upload binary
    const s2Res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${uploadSessionId}`, {
      method: "POST",
      headers: {
        Authorization: `OAuth ${access_token}`,
        "file_offset": "0",
        "Content-Type": "application/octet-stream",
      },
      body: bytes,
    });
    const s2Body = await s2Res.text();
    if (!s2Res.ok) return respond({ ok: false, error: metaErrMsg(s2Body) });
    const s2Json = JSON.parse(s2Body);
    const fileHandle: string = s2Json.h;
    if (!fileHandle) return respond({ ok: false, error: `No handle: ${s2Body}` });

    // Step 3: Set profile photo
    const s3Res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${phone_number_id}/whatsapp_business_profile`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", profile_picture_handle: fileHandle }),
      }
    );
    const s3Body = await s3Res.text();
    let s3Json: Record<string, unknown> = {};
    try { s3Json = JSON.parse(s3Body); } catch { /**/ }

    if (!s3Res.ok || s3Json.error) {
      return respond({ ok: false, error: metaErrMsg(s3Body) });
    }

    return respond({ ok: true });

  } catch (e: any) {
    return respond({ ok: false, error: `Error inesperado: ${e.message}` });
  }
});
