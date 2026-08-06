/**
 * improve-label-hint
 * Recibe un hint escrito por el tenant en lenguaje natural y lo reescribe
 * como una instrucción precisa y accionable para el agente IA.
 * type: "add" → instrucción para AÑADIR la etiqueta
 * type: "remove" → instrucción para QUITAR la etiqueta
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logAiUsage } from "../_shared/ai-usage.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const HINT_MODEL = "claude-haiku-4-5-20251001";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

/** user_id del JWT del llamador — solo para atribuir el costo en el panel. */
async function resolveUserId(req: Request): Promise<string | null> {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data } = await supabase.auth.getUser(token);
  return data.user?.id ?? null;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  try {
    const { hint, labelName, type = "add" } = await req.json() as {
      hint: string;
      labelName: string;
      type?: "add" | "remove";
    };

    if (!hint?.trim()) {
      return new Response(JSON.stringify({ improved: hint ?? "" }), {
        status: 200,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const action = type === "remove"
      ? `QUITAR (eliminar) la etiqueta "${labelName}" de la conversación`
      : `AÑADIR (asignar) la etiqueta "${labelName}" a la conversación`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: HINT_MODEL,
        max_tokens: 200,
        messages: [{
          role: "user",
          content: `Eres experto en configurar instrucciones para agentes de IA de WhatsApp.

La acción a realizar es: ${action}
El usuario describió cuándo hacer esa acción: "${hint}"

Reescribe esa descripción como una instrucción directa para el agente IA. Requisitos:
- Empieza con "cuando" o "al" (minúscula)
- Usa tiempo presente o gerundio
- La instrucción debe dejar claro que la acción es ${type === "remove" ? "QUITAR/eliminar" : "AÑADIR/asignar"} la etiqueta
- Di exactamente en qué momento aplica: puede ser un mensaje del chat, una etiqueta asignada en la conversación, o un evento del sistema (venta registrada, cita agendada)
- Si el evento ocurre en la respuesta actual del agente, incluye "en esta misma respuesta"
- Máximo 2 oraciones cortas
- Responde SOLO con la instrucción, sin comillas ni explicaciones`,
        }],
      }),
    });

    const json = await res.json();
    const userId = await resolveUserId(req);
    if (userId) logAiUsage(supabase, { userId, model: HINT_MODEL, source: "improve-label-hint", category: "hints_etiquetas", usage: json.usage });
    const improved = (json.content?.[0]?.text ?? hint).trim();

    return new Response(JSON.stringify({ improved }), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[improve-label-hint] error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
