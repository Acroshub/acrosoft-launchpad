import { getCorsHeaders } from "../_shared/cors.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

const SYSTEM_PROMPT = `Valida si un trigger de WhatsApp detecta únicamente intenciones basadas en mensajes del usuario.

PERMITIDO (detectable del texto del mensaje):
- Palabra clave o emoji específico que el usuario escribe
- Intención de compra, cotización o contratación
- Pregunta frecuente: horarios, precios, ubicación, cómo funciona
- Objeción o rechazo: "muy caro", "no me interesa"
- Negociación: pide descuento, regateo
- Primer contacto: primer mensaje de alguien nuevo
- Respuesta a propuesta enviada

NO PERMITIDO (no se detecta del mensaje):
- Llamadas, videollamadas o cualquier evento de voz
- Tiempo o calendario: días, horas, cumpleaños, días de semana
- Eventos externos: clima, noticias, stock, astronomía, canciones
- Acciones del negocio: "cuando yo envíe", "cuando el agente cierre"
- Cualquier cosa que no sea la intención expresada en un mensaje de WhatsApp

Si CUALQUIER parte del trigger no es detectable del mensaje, responde invalid e indica esa parte exacta.
Responde SOLO JSON sin markdown: {"severity":"valid"|"invalid","category":"categoría detectada o null","reason":"parte inválida o categoría (máx 12 palabras)"}`;

export default async function handler(req: Request): Promise<Response> {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { trigger_text } = await req.json() as { trigger_text: string };

    // Warm-up ping — just confirms the function is alive, no Anthropic call
    if (trigger_text === "_warmup") {
      return new Response(JSON.stringify({ warmup: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!trigger_text?.trim()) {
      return new Response(
        JSON.stringify({ error: "trigger_text requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 50,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: trigger_text.trim() }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const aiData = await response.json() as { content: Array<{ text: string }> };
    const raw = aiData.content?.[0]?.text?.trim() ?? "";

    let result: { severity: string; category: string | null; reason: string };
    try {
      result = JSON.parse(raw);
    } catch {
      result = { severity: "invalid", category: null, reason: "No se pudo evaluar el trigger" };
    }

    // Normalize: treat "ambiguous" as invalid to enforce whitelist
    if (result.severity === "ambiguous") {
      result.severity = "invalid";
      result.reason = result.reason || "Intención no reconocida como categoría permitida";
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[validate-flow-trigger]", err);
    return new Response(
      JSON.stringify({ error: "Error interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
}
