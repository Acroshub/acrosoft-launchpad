// ────────────────────────────────────────────────────────────────────────────
// ai-agent-config
// Endpoint que toma los datos del wizard (frontend) y genera un system_prompt
// pulido usando Claude Haiku. El admin puede editar el resultado antes de
// guardarlo. Acceso restringido al superadmin.
// ────────────────────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPER_ADMIN_EMAIL = "e.daniel.acero.r@gmail.com";

function respond(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

async function authUser(req: Request) {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
  );
  const { data } = await supabase.auth.getUser();
  return data.user;
}

interface WizardInput {
  business_name?:        string;
  business_description?: string;
  tone?:                 string;
  language?:             string;
  escalation_phrase?:    string;
  custom_instructions?:  string;
  services_summary?:     string;
  hours_summary?:        string;
}

function buildBasePrompt(w: WizardInput): string {
  const name        = w.business_name?.trim() || "el negocio";
  const description = w.business_description?.trim() || "";
  const tone        = w.tone?.trim() || "amable y profesional";
  const lang        = w.language?.trim() || "español";
  const escalation  = w.escalation_phrase?.trim() || "un humano te responderá pronto";
  const extra       = w.custom_instructions?.trim() || "";

  return `Eres el asistente virtual de "${name}". Respondes mensajes de WhatsApp en nombre del negocio.

${description ? `SOBRE EL NEGOCIO: ${description}\n` : ""}
ESTILO:
- Tono ${tone}.
- Responde en ${lang}.
- Mensajes cortos y claros (1-3 frases siempre que sea posible).
- Sin emojis excesivos.

USO DE HERRAMIENTAS:
- Antes de dar info de precios, servicios u horarios, SIEMPRE consulta con las herramientas (list_services, get_business_context).
- Si el cliente quiere agendar, usa list_calendars y list_available_slots, confirma la fecha y hora, y luego book_appointment.
- Si ya conoces al cliente (find_my_contact), salúdalo por su nombre.
- Si el cliente está molesto, pide hablar con humano, o hace una solicitud delicada → escalate_to_human con la razón. Después responde: "${escalation}".

NO HAGAS:
- No inventes datos. Si no encuentras la info con las herramientas, dilo o escala.
- No agendes sin confirmar antes con el cliente la fecha y hora exactas.
- No respondas mensajes que no sean del negocio.

${extra ? `INSTRUCCIONES ADICIONALES DEL DUEÑO:\n${extra}\n` : ""}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: getCorsHeaders(req) });

  const user = await authUser(req);
  if (!user) return respond(req, { error: "Unauthorized" }, 401);
  if (user.email !== SUPER_ADMIN_EMAIL) return respond(req, { error: "Forbidden" }, 403);

  let body: any;
  try { body = await req.json(); } catch { return respond(req, { error: "Invalid JSON" }, 400); }

  const action = body?.action;
  if (action !== "generate_prompt") {
    return respond(req, { error: "Acción no soportada" }, 400);
  }

  const wizard: WizardInput = body?.wizard ?? {};
  const basePrompt = buildBasePrompt(wizard);

  // Usar Claude Haiku para pulir el prompt
  const polishInput = `A continuación tienes un borrador de instrucciones para un agente de WhatsApp. Mejóralo:
- Mantén toda la estructura y reglas existentes intactas.
- Hazlo más natural y específico al negocio.
- No inventes información que no esté en el borrador.
- Devuelve SOLO el prompt final, sin comentarios ni explicaciones, sin markdown extra.

BORRADOR:
${basePrompt}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        temperature: 0.4,
        messages: [{ role: "user", content: polishInput }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(`Anthropic polish failed (${res.status}): ${errText}. Fallback to base prompt.`);
      return respond(req, { system_prompt: basePrompt, polished: false });
    }

    const data = await res.json();
    const polished = (data.content ?? [])
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n")
      .trim();

    return respond(req, { system_prompt: polished || basePrompt, polished: !!polished });
  } catch (err) {
    console.error("polish error:", err);
    return respond(req, { system_prompt: basePrompt, polished: false });
  }
});
