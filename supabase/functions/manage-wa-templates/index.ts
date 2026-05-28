import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const GRAPH = "https://graph.facebook.com/v21.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function getAuthUser(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth) return null;
  const { data: { user }, error } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
  if (error || !user) return null;
  return user;
}

async function getConfig(userId: string) {
  const { data } = await supabase
    .from("crm_ai_agent_config")
    .select("waba_id, access_token, phone_number_id")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

// ─── Submit template to Meta ──────────────────────────────────────────────────
async function submitToMeta(templateId: string, userId: string) {
  const cfg = await getConfig(userId);
  if (!cfg?.waba_id || !cfg?.access_token) {
    return { ok: false, error: "waba_not_configured" };
  }

  const { data: tmpl } = await supabase
    .from("crm_wa_templates")
    .select("*")
    .eq("id", templateId)
    .eq("user_id", userId)
    .single();
  if (!tmpl) return { ok: false, error: "template_not_found" };

  // Build Meta components
  const components: unknown[] = [];

  if (tmpl.header_type !== "NONE" && tmpl.header_text) {
    components.push({ type: "HEADER", format: tmpl.header_type, text: tmpl.header_text });
  }

  // Meta requires example values for every {{N}} variable or it returns INVALID_FORMAT
  const varNums = [...new Set(
    [...(tmpl.body_text as string).matchAll(/\{\{(\d+)\}\}/g)].map((m: RegExpMatchArray) => Number(m[1]))
  )].sort((a: number, b: number) => a - b);

  const bodyComponent: Record<string, unknown> = { type: "BODY", text: tmpl.body_text };
  if (varNums.length > 0) {
    const labels: string[] = tmpl.variable_labels ?? [];
    const missing = varNums.filter((num: number) => !labels[num - 1]?.trim());
    if (missing.length > 0) {
      return { ok: false, error: `Debes completar qué representa: ${missing.map((n: number) => `{{${n}}}`).join(", ")}` };
    }
    bodyComponent.example = { body_text: [varNums.map((num: number) => labels[num - 1].trim())] };
  }
  components.push(bodyComponent);

  if (tmpl.footer_text) {
    components.push({ type: "FOOTER", text: tmpl.footer_text });
  }

  const buttons: unknown[] = (tmpl.buttons ?? []).map((b: any) => {
    if (b.type === "QUICK_REPLY") return { type: "QUICK_REPLY", text: b.text };
    if (b.type === "URL")         return { type: "URL", text: b.text, url: b.url };
    if (b.type === "PHONE_NUMBER") return { type: "PHONE_NUMBER", text: b.text, phone_number: b.phone_number };
    return b;
  });
  if (buttons.length > 0) {
    components.push({ type: "BUTTONS", buttons });
  }

  const payload = {
    name: tmpl.name,
    language: tmpl.language,
    category: tmpl.category,
    components,
  };

  const res = await fetch(`${GRAPH}/${cfg.waba_id}/message_templates`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const metaJson = await res.json();

  if (!res.ok) {
    const errMsg = metaJson?.error?.message ?? `Meta ${res.status}`;
    const errDetail = metaJson?.error?.error_data?.details ?? metaJson?.error?.error_user_msg ?? null;
    const fullMsg = errDetail ? `${errMsg}: ${errDetail}` : errMsg;
    console.error("[manage-wa-templates] Meta rejected payload:", JSON.stringify(payload));
    console.error("[manage-wa-templates] Meta error:", JSON.stringify(metaJson));
    await supabase.from("crm_wa_templates").update({
      local_status: "DRAFT",
      rejection_reason: fullMsg,
      updated_at: new Date().toISOString(),
    }).eq("id", templateId);
    return { ok: false, error: fullMsg, meta: metaJson };
  }

  // Meta returns { id, status } — status can be PENDING or APPROVED (instant)
  const metaTemplateId = String(metaJson.id ?? "");
  const metaStatus: string = metaJson.status ?? "PENDING";
  const localStatus = metaStatus === "APPROVED" ? "APPROVED" : "PENDING";

  await supabase.from("crm_wa_templates").update({
    meta_template_id: metaTemplateId,
    local_status: localStatus,
    meta_status: metaStatus,
    rejection_reason: null,
    updated_at: new Date().toISOString(),
  }).eq("id", templateId);

  return { ok: true, meta_template_id: metaTemplateId, status: localStatus };
}

// ─── Sync status from Meta ────────────────────────────────────────────────────
async function syncStatus(userId: string) {
  const cfg = await getConfig(userId);
  if (!cfg?.waba_id || !cfg?.access_token) {
    return { ok: false, error: "waba_not_configured" };
  }

  const res = await fetch(
    `${GRAPH}/${cfg.waba_id}/message_templates?fields=id,name,status,rejected_reason&limit=100`,
    { headers: { Authorization: `Bearer ${cfg.access_token}` } },
  );
  if (!res.ok) return { ok: false, error: `Meta ${res.status}` };

  const { data: metaTemplates } = await res.json() as { data: Array<{ id: string; name: string; status: string; rejected_reason?: string }> };
  if (!metaTemplates?.length) return { ok: true, synced: 0 };

  let synced = 0;
  for (const mt of metaTemplates) {
    const localStatus =
      mt.status === "APPROVED"  ? "APPROVED"  :
      mt.status === "REJECTED"  ? "REJECTED"  :
      mt.status === "PAUSED"    ? "PAUSED"    : "PENDING";

    const { count } = await supabase
      .from("crm_wa_templates")
      .update({
        local_status: localStatus,
        meta_status: mt.status,
        rejection_reason: (mt.rejected_reason && mt.rejected_reason !== "NONE") ? mt.rejected_reason : null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("meta_template_id", String(mt.id))
      .select("id", { count: "exact", head: true });
    if ((count ?? 0) > 0) synced++;
  }

  return { ok: true, synced };
}

// ─── Delete template from Meta + DB ──────────────────────────────────────────
async function deleteTemplate(templateId: string, userId: string) {
  const { data: tmpl } = await supabase
    .from("crm_wa_templates")
    .select("meta_template_id, name")
    .eq("id", templateId)
    .eq("user_id", userId)
    .single();

  if (!tmpl) return { ok: false, error: "not_found" };

  if (tmpl.meta_template_id) {
    const cfg = await getConfig(userId);
    if (cfg?.waba_id && cfg?.access_token) {
      await fetch(
        `${GRAPH}/${cfg.waba_id}/message_templates?name=${encodeURIComponent(tmpl.name)}&hsm_id=${tmpl.meta_template_id}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${cfg.access_token}` } },
      ).catch(() => {});
    }
  }

  const { error } = await supabase
    .from("crm_wa_templates")
    .delete()
    .eq("id", templateId)
    .eq("user_id", userId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ─── Rewrite template body with AI ───────────────────────────────────────────
async function rewriteTemplate(bodyText: string, category: string) {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return { ok: false, error: "ANTHROPIC_API_KEY no configurada" };

  const isMarketing = category === "MARKETING";
  const systemPrompt = isMarketing
    ? `Eres un experto en plantillas de WhatsApp Business. Reescribe mensajes de marketing para que Meta los apruebe.
Reglas obligatorias:
- Saludo directo y claro, sin preguntas que impliquen conversación previa (evita "¿Lograste revisar...?")
- Propuesta de valor clara y concisa
- Sin urgencia artificial ("solo hoy", "últimas horas")
- Conserva exactamente las mismas variables {{1}}, {{2}}... en las mismas posiciones
- El texto NO incluye botones (van separados)
- Menciona que hay una opción de "No, gracias" al final (el botón de opt-out lo agrega el sistema)
- Máximo 160 caracteres idealmente
- Español natural y profesional
Responde ÚNICAMENTE con el texto del mensaje reescrito, sin explicaciones.`
    : `Eres un experto en plantillas de WhatsApp Business. Reescribe mensajes utilitarios (citas, recordatorios, confirmaciones) para que Meta los apruebe.
Reglas obligatorias:
- Tono informativo, NO promocional
- Claro sobre qué acción o información comunica (cita, pago, confirmación)
- Sin lenguaje de ventas
- Conserva exactamente las mismas variables {{1}}, {{2}}... en las mismas posiciones
- Español natural y profesional
Responde ÚNICAMENTE con el texto del mensaje reescrito, sin explicaciones.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: "user", content: `Reescribe esta plantilla:\n\n${bodyText}` }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[manage-wa-templates] Anthropic error:", err);
    return { ok: false, error: "Error al llamar a la IA" };
  }

  const data = await res.json();
  const rewritten: string = data.content?.[0]?.text?.trim() ?? "";
  if (!rewritten) return { ok: false, error: "La IA no devolvió contenido" };
  return { ok: true, rewritten };
}

// ─── Entry point ──────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const user = await getAuthUser(req);
  if (!user) return json({ error: "unauthorized" }, 401);

  const url  = new URL(req.url);
  const action = url.searchParams.get("action");

  if (req.method === "POST") {
    let body: any = {};
    try { body = await req.json(); } catch { /* no body */ }

    if (action === "submit") {
      const result = await submitToMeta(body.template_id, user.id);
      return json(result, result.ok ? 200 : 502);
    }

    if (action === "sync") {
      const result = await syncStatus(user.id);
      return json(result, result.ok ? 200 : 502);
    }

    if (action === "rewrite") {
      const result = await rewriteTemplate(body.body_text ?? "", body.category ?? "MARKETING");
      return json(result, result.ok ? 200 : 500);
    }
  }

  if (req.method === "DELETE") {
    const templateId = url.searchParams.get("id");
    if (!templateId) return json({ error: "missing id" }, 400);
    const result = await deleteTemplate(templateId, user.id);
    return json(result, result.ok ? 200 : 400);
  }

  return json({ error: "not_found" }, 404);
});
