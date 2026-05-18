import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const GRAPH_VERSION = "v21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ok  = (data: Record<string, unknown> = {}) =>
  new Response(JSON.stringify({ ok: true,  ...data }), { status: 200, headers: corsHeaders });

const err = (msg: string) =>
  new Response(JSON.stringify({ ok: false, error: msg }), { status: 200, headers: corsHeaders });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405, headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return err("no auth");

  const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (authErr || !user) return err("unauthorized");

  let body: { base64: string; mime_type: string };
  try { body = await req.json(); }
  catch { return err("bad json"); }

  const { base64, mime_type } = body;
  if (!base64 || !mime_type) return err("missing base64 or mime_type");

  // Cargar credenciales del tenant
  const { data: config, error: configErr } = await supabase
    .from("crm_ai_agent_config")
    .select("phone_number_id, access_token, waba_id")
    .eq("user_id", user.id)
    .single();

  if (configErr || !config?.access_token || !config?.waba_id || !config?.phone_number_id) {
    return err("Configura WABA ID, Phone Number ID y Access Token primero");
  }

  const { phone_number_id, access_token, waba_id } = config;

  try {
    // Decodificar base64 a binario
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
    const fileSize = bytes.length;

    // Step 1: Crear sesión de upload en Meta Resumable Upload API
    const sessionRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${waba_id}/uploads?file_name=profile.jpg&file_length=${fileSize}&file_type=${encodeURIComponent(mime_type)}`,
      { method: "POST", headers: { Authorization: `Bearer ${access_token}` } }
    );
    if (!sessionRes.ok) {
      const txt = await sessionRes.text();
      console.error("[upload-wa-profile-photo] step1:", txt);
      return err(`Error al crear sesión de upload: ${txt}`);
    }
    const sessionJson = await sessionRes.json();
    const uploadSessionId: string = sessionJson.id;
    if (!uploadSessionId) {
      console.error("[upload-wa-profile-photo] step1 no id:", JSON.stringify(sessionJson));
      return err(`Meta no devolvió session ID: ${JSON.stringify(sessionJson)}`);
    }

    // Step 2: Subir el binario (Content-Type: application/octet-stream requerido por Meta)
    const uploadRes = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${uploadSessionId}`, {
      method: "POST",
      headers: {
        Authorization: `OAuth ${access_token}`,
        "file_offset": "0",
        "Content-Type": "application/octet-stream",
      },
      body: bytes,
    });
    if (!uploadRes.ok) {
      const txt = await uploadRes.text();
      console.error("[upload-wa-profile-photo] step2:", txt);
      return err(`Error al subir imagen: ${txt}`);
    }
    const uploadJson = await uploadRes.json();
    const fileHandle: string = uploadJson.h;
    if (!fileHandle) {
      console.error("[upload-wa-profile-photo] step2 no handle:", JSON.stringify(uploadJson));
      return err(`Meta no devolvió handle de archivo: ${JSON.stringify(uploadJson)}`);
    }

    // Step 3: Actualizar foto de perfil de WhatsApp Business
    const profileRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${phone_number_id}/whatsapp_business_profile`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", profile_picture_handle: fileHandle }),
      }
    );
    if (!profileRes.ok) {
      const txt = await profileRes.text();
      console.error("[upload-wa-profile-photo] step3:", txt);
      return err(`Error al actualizar foto de perfil: ${txt}`);
    }

    return ok();

  } catch (e: any) {
    console.error("[upload-wa-profile-photo] unexpected:", e.message);
    return err(e.message);
  }
});
