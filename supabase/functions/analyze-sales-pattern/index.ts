import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUMMARY_MODEL = "claude-sonnet-5";

// Umbrales — ver plan "Aprendizaje de patrones de venta exitosos"
const MIN_SALES_TO_LEARN = 6;   // no hay señal confiable con menos ventas que esto
const RECOMPUTE_STEP = 5;       // recalcular solo cada N ventas nuevas, no en cada una
const WINDOW_SALES = 25;        // ventana de ventas recientes usada para el resumen
const MAX_MESSAGES_PER_CONVERSATION = 60;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405, headers: corsHeaders });

  let body: { user_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("bad json", { status: 400, headers: corsHeaders });
  }

  const userId = body.user_id;
  if (!userId) return new Response("missing user_id", { status: 400, headers: corsHeaders });

  try {
    const { count: confirmedCount, error: countErr } = await supabase
      .from("crm_sales")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_ai_sale", true)
      .eq("status", "confirmed");

    if (countErr) throw countErr;
    const totalConfirmed = confirmedCount ?? 0;

    if (totalConfirmed < MIN_SALES_TO_LEARN) {
      return new Response(JSON.stringify({ ok: true, skipped: "below_minimum", totalConfirmed }), { status: 200, headers: corsHeaders });
    }

    const { data: agentConfig, error: configErr } = await supabase
      .from("crm_ai_agent_config")
      .select("sales_pattern_sale_count, agent_name")
      .eq("user_id", userId)
      .single();

    if (configErr || !agentConfig) throw configErr ?? new Error("config not found");

    const lastCount = agentConfig.sales_pattern_sale_count ?? 0;
    if (totalConfirmed - lastCount < RECOMPUTE_STEP) {
      return new Response(JSON.stringify({ ok: true, skipped: "cooldown", totalConfirmed, lastCount }), { status: 200, headers: corsHeaders });
    }

    const { data: recentSales, error: salesErr } = await supabase
      .from("crm_sales")
      .select("wa_conversation_id")
      .eq("user_id", userId)
      .eq("is_ai_sale", true)
      .eq("status", "confirmed")
      .not("wa_conversation_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(WINDOW_SALES);

    if (salesErr) throw salesErr;

    const conversationIds = [...new Set((recentSales ?? []).map(s => s.wa_conversation_id as string))];
    if (conversationIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, skipped: "no_conversations" }), { status: 200, headers: corsHeaders });
    }

    const transcripts: string[] = [];
    for (const conversationId of conversationIds) {
      const { data: msgs } = await supabase
        .from("crm_wa_messages")
        .select("role, content")
        .eq("conversation_id", conversationId)
        .eq("is_internal", false)
        .order("created_at", { ascending: false })
        .limit(MAX_MESSAGES_PER_CONVERSATION);

      const history = (msgs ?? []).reverse();
      if (history.length === 0) continue;

      const lines = history.map(m => `${m.role === "user" ? "Cliente" : "Agente"}: ${m.content}`).join("\n");
      transcripts.push(`--- Conversación ---\n${lines}`);
    }

    if (transcripts.length === 0) {
      return new Response(JSON.stringify({ ok: true, skipped: "no_messages" }), { status: 200, headers: corsHeaders });
    }

    const summarizerPrompt = `Analiza las siguientes conversaciones de WhatsApp de un mismo negocio, todas terminaron en una venta confirmada. Tu tarea es extraer el PATRÓN de venta exitosa que comparten, de forma abstracta y reutilizable:

- Estructura general de la conversación y en qué orden se presenta la información.
- Técnicas usadas para resolver objeciones o dudas del cliente antes de la compra.
- Tono y estilo de comunicación.
- En qué momento y de qué forma se invita al cliente a pagar.

Reglas estrictas:
- NO cites frases textuales de las conversaciones ni datos de clientes específicos (nombres, montos, productos puntuales).
- Describe el patrón en abstracto, como una guía de estilo que otro vendedor del mismo negocio podría seguir.
- Máximo 4 párrafos cortos. Responde solo con el resumen, sin introducción ni comentarios.

Conversaciones:

${transcripts.join("\n\n")}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: SUMMARY_MODEL,
        max_tokens: 800,
        messages: [{ role: "user", content: summarizerPrompt }],
      }),
    });

    if (!res.ok) throw new Error(`anthropic api error: ${res.status} ${await res.text()}`);
    const json = await res.json();
    const summary = (json.content?.[0]?.text ?? "").trim();
    if (!summary) throw new Error("empty summary from model");

    const { error: updateErr } = await supabase
      .from("crm_ai_agent_config")
      .update({
        sales_pattern_summary: summary,
        sales_pattern_sale_count: totalConfirmed,
        sales_pattern_updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (updateErr) throw updateErr;

    console.log(`[analyze-sales-pattern] resumen actualizado para user_id:${userId} (base: ${transcripts.length} conversaciones, ${totalConfirmed} ventas confirmadas)`);
    return new Response(JSON.stringify({ ok: true, updated: true, totalConfirmed, conversationsAnalyzed: transcripts.length }), { status: 200, headers: corsHeaders });
  } catch (e: any) {
    console.error("[analyze-sales-pattern] error:", e.message ?? e);
    return new Response(JSON.stringify({ ok: false, error: e.message ?? String(e) }), { status: 500, headers: corsHeaders });
  }
});
