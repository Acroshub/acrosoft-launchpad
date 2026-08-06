// Registro centralizado de consumo de Claude para el panel Ajustes → Costos IA.
// Toda función que llame a la API de Anthropic debe reportar aquí, o el panel
// mostrará menos gasto del real.

// Precio base en USD por millón de tokens. Los multiplicadores de caché son
// fijos: escritura 5m = 1.25× input, escritura 1h = 2× input, lectura = 0.10×.
const MODEL_PRICES: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5-20251001": { input: 1.00, output: 5.00 },
  "claude-haiku-4-5":          { input: 1.00, output: 5.00 },
  "claude-3-haiku-20240307":   { input: 0.25, output: 1.25 },
  "claude-sonnet-4-5":         { input: 3.00, output: 15.00 },
  "claude-sonnet-4-6":         { input: 3.00, output: 15.00 },
  "claude-sonnet-5":           { input: 3.00, output: 15.00 },
  "claude-opus-4-7":           { input: 5.00, output: 25.00 },
  "claude-opus-4-8":           { input: 5.00, output: 25.00 },
  "claude-opus-5":             { input: 5.00, output: 25.00 },
};

const FALLBACK_PRICE = { input: 1.00, output: 5.00 };

const CACHE_WRITE_5M = 1.25;
const CACHE_WRITE_1H = 2.00;
const CACHE_READ     = 0.10;

/** `usage` tal como lo devuelve la API de Anthropic. */
export type AnthropicUsage = {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  /** Total escrito a caché — suma de los dos TTL de `cache_creation`. */
  cache_creation_input_tokens?: number;
  /** Desglose por TTL. Sin él se asume todo a 5m, que subestimaría un write de 1h. */
  cache_creation?: {
    ephemeral_5m_input_tokens?: number;
    ephemeral_1h_input_tokens?: number;
  };
};

/**
 * Operación concreta que gastó los tokens. `source` dice qué función llamó;
 * `category` dice para qué, que es lo que permite ver dónde se va el dinero.
 */
export type AiCategory =
  | "respuesta_texto"        // respuesta conversacional a un mensaje de texto
  | "respuesta_media"        // mensaje con imagen/PDF: visión + detección de comprobantes
  | "agendamiento"           // respuesta con tool use de calendario
  | "deteccion_intencion"    // clasificador que decide si un mensaje dispara un flujo
  | "personalizacion_flujo"  // reescritura de un paso de flujo (ai_enhance)
  | "aprendizaje_ventas"     // resumen del patrón de ventas del negocio
  | "plantillas_whatsapp"    // reescritura de plantillas para aprobación de Meta
  | "hints_etiquetas"        // mejora de hints de etiquetas automáticas
  | "validacion_triggers";   // validación de triggers de flujo

export type AiUsageEntry = {
  userId: string;
  model: string;
  /** Nombre de la edge function que hizo la llamada (columna `source`). */
  source: string;
  category: AiCategory;
  usage: AnthropicUsage;
  conversationId?: string | null;
};

export function calcCostUsd(model: string, usage: AnthropicUsage): number {
  const p = MODEL_PRICES[model] ?? FALLBACK_PRICE;
  const totalWrite = usage.cache_creation_input_tokens ?? 0;
  const write1h = usage.cache_creation?.ephemeral_1h_input_tokens ?? 0;
  // Si la API no mandó el desglose, el resto se cobra como 5m.
  const write5m = usage.cache_creation?.ephemeral_5m_input_tokens ?? (totalWrite - write1h);
  return (
    (usage.input_tokens ?? 0) * p.input +
    (usage.output_tokens ?? 0) * p.output +
    write5m * p.input * CACHE_WRITE_5M +
    write1h * p.input * CACHE_WRITE_1H +
    (usage.cache_read_input_tokens ?? 0) * p.input * CACHE_READ
  ) / 1_000_000;
}

/**
 * Inserta el consumo. Fire-and-forget: nunca lanza ni bloquea la respuesta al
 * usuario — un fallo de telemetría no debe tumbar la función que la reporta.
 */
export function logAiUsage(
  supabase: { from: (t: string) => { insert: (v: unknown) => PromiseLike<unknown> } },
  { userId, model, source, category, usage, conversationId = null }: AiUsageEntry,
): void {
  if (!userId) return;
  try {
    Promise.resolve(
      supabase.from("crm_ai_usage_log").insert({
        user_id: userId,
        conversation_id: conversationId,
        model,
        source,
        category,
        input_tokens: usage.input_tokens ?? 0,
        output_tokens: usage.output_tokens ?? 0,
        cache_read_tokens: usage.cache_read_input_tokens ?? 0,
        cache_creation_tokens: usage.cache_creation_input_tokens ?? 0,
        cost_usd: calcCostUsd(model, usage),
      }),
    ).then(
      () => {},
      (e: unknown) => console.error(`[ai-usage] insert falló (${source}):`, e),
    );
  } catch (e) {
    console.error(`[ai-usage] error inesperado (${source}):`, e);
  }
}
