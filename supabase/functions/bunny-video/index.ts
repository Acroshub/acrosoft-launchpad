import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUNNY_API_KEY   = Deno.env.get("BUNNY_API_KEY")!;
const BUNNY_LIBRARY   = Deno.env.get("BUNNY_LIBRARY_ID") ?? "628395";
const SUPER_ADMIN     = "e.daniel.acero.r@gmail.com";
const BUNNY_BASE      = `https://video.bunnycdn.com/library/${BUNNY_LIBRARY}`;

async function sha256Hex(data: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(data),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    if (user.email !== SUPER_ADMIN) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    // ── Create video in Bunny + return TUS credentials ────────────────────────
    if (action === "create") {
      const { title } = body as { title: string };

      const createRes = await fetch(`${BUNNY_BASE}/videos`, {
        method: "POST",
        headers: {
          AccessKey: BUNNY_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title }),
      });

      if (!createRes.ok) {
        const text = await createRes.text();
        console.error("Bunny create error:", text);
        return new Response(JSON.stringify({ error: "Failed to create video in Bunny" }), {
          status: 500, headers: { ...CORS, "Content-Type": "application/json" },
        });
      }

      const { guid: bunnyVideoId } = await createRes.json();

      const expiry    = Math.floor(Date.now() / 1000) + 3600;
      const signature = await sha256Hex(`${BUNNY_LIBRARY}${BUNNY_API_KEY}${expiry}${bunnyVideoId}`);

      return new Response(
        JSON.stringify({ bunnyVideoId, tusExpire: expiry, tusSignature: signature, libraryId: BUNNY_LIBRARY }),
        { headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    // ── Delete video from Bunny ───────────────────────────────────────────────
    if (action === "delete") {
      const { bunnyVideoId } = body as { bunnyVideoId: string };

      const delRes = await fetch(`${BUNNY_BASE}/videos/${bunnyVideoId}`, {
        method: "DELETE",
        headers: { AccessKey: BUNNY_API_KEY },
      });

      if (!delRes.ok && delRes.status !== 404) {
        console.error("Bunny delete error:", delRes.status);
        return new Response(JSON.stringify({ error: "Failed to delete video" }), {
          status: 500, headers: { ...CORS, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("bunny-video error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
