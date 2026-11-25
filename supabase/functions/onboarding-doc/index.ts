// Documento público «Onboarding para Google Ads» (/onboarding-google/:token).
//  - { action: "get",  token }                    → { content, version }
//  - { action: "save", token, content, version }  → { version }   ó 409 { content, version } si alguien guardó antes
// verify_jwt = false: lo usa cualquiera que tenga el link. La llave de acceso es el token (64 hex aleatorios); además hay límite por IP.
// Solo lee y escribe crm_onboarding_docs: nunca devuelve ni toca la ficha del contacto. El HTML lo limpia el navegador antes de pintarlo
// (sanitizeDocHtml en src/lib/onboardingDoc.ts).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PUBLIC_CORS_HEADERS } from "../_shared/cors.ts";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const TOKEN_RE = /^[0-9a-f]{64}$/;
const MAX_CONTENT_CHARS = 100_000;
const TABLE = "crm_onboarding_docs";

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...PUBLIC_CORS_HEADERS, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function readDoc(token: string): Promise<{ content_html: string; version: number } | null> {
  const { data, error } = await supabase.from(TABLE).select("content_html, version").eq("token", token).maybeSingle();
  if (error) throw error;
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: PUBLIC_CORS_HEADERS });

  // deno-lint-ignore no-explicit-any
  let body: any;
  try { body = await req.json(); } catch { return respond({ error: "JSON inválido" }, 400); }

  const action = body?.action;
  if (action !== "get" && action !== "save") return respond({ error: "Acción inválida" }, 400);
  const token = body?.token;
  if (typeof token !== "string" || !TOKEN_RE.test(token)) return respond({ error: "Documento no encontrado" }, 404);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "unknown";
  const { data: allowed, error: rlErr } = await supabase.rpc("check_rate_limit", {
    p_key: `onboarding-doc-${action}:${ip}`,
    p_window_seconds: 3600,
    // El guardado automático dispara varias veces por minuto mientras se escribe.
    p_max_count: action === "save" ? 2000 : 600,
  });
  if (rlErr) console.error("rate_limit check error (non-blocking):", rlErr);
  if (allowed === false) return respond({ error: "Demasiadas solicitudes. Intenta más tarde." }, 429);

  try {
    if (action === "get") {
      const doc = await readDoc(token);
      if (!doc) return respond({ error: "Documento no encontrado" }, 404);
      return respond({ content: doc.content_html, version: doc.version });
    }

    const { content, version } = body;
    if (typeof content !== "string" || !Number.isInteger(version)) return respond({ error: "Datos inválidos" }, 400);
    if (content.length > MAX_CONTENT_CHARS) return respond({ error: "El documento es demasiado largo." }, 413);

    // Solo se guarda sobre la versión que el editor tenía a la vista: así dos personas no se pisan sin enterarse.
    const { data: saved, error } = await supabase
      .from(TABLE)
      .update({ content_html: content, version: version + 1, updated_at: new Date().toISOString() })
      .eq("token", token)
      .eq("version", version)
      .select("version")
      .maybeSingle();
    if (error) throw error;
    if (saved) return respond({ version: saved.version });

    const current = await readDoc(token);
    if (!current) return respond({ error: "Documento no encontrado" }, 404);
    return respond({ error: "conflict", content: current.content_html, version: current.version }, 409);
  } catch (e) {
    console.error("onboarding-doc:", e);
    return respond({ error: "No se pudo procesar el documento" }, 500);
  }
});
