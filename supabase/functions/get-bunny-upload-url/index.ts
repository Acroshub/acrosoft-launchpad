import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const BUNNY_API_KEY     = Deno.env.get("BUNNY_API_KEY")!;
// Usa librería separada para cursos si está configurada, si no reutiliza la de tutoriales
const BUNNY_LIBRARY     = Deno.env.get("BUNNY_STREAM_LIBRARY_ID") ?? Deno.env.get("BUNNY_LIBRARY_ID") ?? "628395";
const BUNNY_BASE        = `https://video.bunnycdn.com/library/${BUNNY_LIBRARY}`;

async function sha256Hex(data: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Verificar autenticación
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json() as { action: string; title?: string; bunnyVideoId?: string };
    const { action } = body;

    if (!["create", "auth", "delete"].includes(action)) {
      return new Response(JSON.stringify({ error: "Acción inválida" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Crear video en Bunny + credenciales TUS ────────────────────────────────
    if (action === "create") {
      const title = (body.title ?? "Sin título").trim().slice(0, 200);
      const createRes = await fetch(`${BUNNY_BASE}/videos`, {
        method: "POST",
        headers: { AccessKey: BUNNY_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!createRes.ok) {
        console.error("[get-bunny-upload-url] create error:", await createRes.text());
        return new Response(JSON.stringify({ error: "Error al crear video en Bunny" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { guid: bunnyVideoId } = await createRes.json();
      const expiry    = Math.floor(Date.now() / 1000) + 3600;
      const signature = await sha256Hex(`${BUNNY_LIBRARY}${BUNNY_API_KEY}${expiry}${bunnyVideoId}`);
      return new Response(
        JSON.stringify({ bunnyVideoId, tusExpire: expiry, tusSignature: signature, libraryId: BUNNY_LIBRARY }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Refrescar credenciales TUS para video existente (resume) ──────────────
    if (action === "auth") {
      const { bunnyVideoId } = body;
      if (!bunnyVideoId || !/^[a-f0-9-]{36}$/.test(bunnyVideoId)) {
        return new Response(JSON.stringify({ error: "bunnyVideoId inválido" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const expiry    = Math.floor(Date.now() / 1000) + 3600;
      const signature = await sha256Hex(`${BUNNY_LIBRARY}${BUNNY_API_KEY}${expiry}${bunnyVideoId}`);
      return new Response(
        JSON.stringify({ bunnyVideoId, tusExpire: expiry, tusSignature: signature, libraryId: BUNNY_LIBRARY }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Eliminar video de Bunny ────────────────────────────────────────────────
    if (action === "delete") {
      const { bunnyVideoId } = body;
      if (!bunnyVideoId || !/^[a-f0-9-]{36}$/.test(bunnyVideoId)) {
        return new Response(JSON.stringify({ error: "bunnyVideoId inválido" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const delRes = await fetch(`${BUNNY_BASE}/videos/${bunnyVideoId}`, {
        method: "DELETE",
        headers: { AccessKey: BUNNY_API_KEY },
      });
      if (!delRes.ok && delRes.status !== 404) {
        console.error("[get-bunny-upload-url] delete error:", delRes.status);
        return new Response(JSON.stringify({ error: "Error al eliminar video" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (err: any) {
    console.error("[get-bunny-upload-url]", err);
    return new Response(JSON.stringify({ error: "Error interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
