import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildAudience, buildAudienceBase } from "../_shared/wa-audience.ts";
import { requireInternalOrUser } from "../_shared/internal-auth.ts";
import { filterByLocalTime, allTimezonesReached } from "../_shared/wa-timezone.ts";
import { isBsuid, normalizeWaIdentifier, recipientField } from "../_shared/wa-recipient.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const GRAPH = "https://graph.facebook.com/v21.0";
const SEND_DELAY_MS = 120; // ~8 msg/seg — seguro bajo el límite de Meta

// Un envío grande no cabe en una sola invocación: Supabase corta la petición a
// los 150s (request idle timeout) y a ~450ms por destinatario eso son unos 330.
// Se procesa por lotes y el cron retoma lo que quede; el tope desaparece.
const BUDGET_MS    = 100_000; // margen para cerrar limpio antes de los 150s
const BATCH_SIZE   = 400;     // techo por invocación, aunque sobre presupuesto
const INSERT_CHUNK = 500;

// El cron reinvoca cada minuto, pero un lote puede durar BUDGET_MS. Sin cerrojo,
// dos invocaciones leían los mismos logs 'pending' y el contacto recibía el
// mensaje dos veces. Caduca solo: si una invocación muere, la siguiente entra.
const LOCK_MS = 5 * 60_000;

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

// Acepta el JWT del usuario del CRM (envío inmediato desde la UI) o el service
// role key (envío programado, disparado por send-wa-instant-scheduler).

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizePhone(phone: string): string {
  return normalizeWaIdentifier(phone);
}

// ─── Variable resolution ──────────────────────────────────────────────────────

function resolveVariables(
  contact: { name: string | null; email: string | null; phone: string; company: string | null },
  varMap: Record<string, any>,
  entities: { products: any[]; services: any[]; courses: any[] },
): string[] {
  const varNums = Object.keys(varMap).map(Number).sort((a, b) => a - b);
  return varNums.map(num => {
    const entry = varMap[String(num)];
    if (!entry) return "";
    switch (entry.source) {
      case "contact_field": {
        const v = String((contact as any)[entry.field] ?? "");
        // Un BSUID (ver wa-recipient.ts) no es un teléfono — no debe filtrarse
        // tal cual al texto de la campaña que ve el cliente.
        return entry.field === "phone" && isBsuid(v) ? "" : v;
      }
      case "fixed":
        return String(entry.value ?? "");
      case "product_field": {
        const p = entities.products.find((x: any) => x.id === entry.entityId);
        if (!p) return "";
        return entry.field === "price"
          ? `${p.currency ?? ""} ${Number(p.price ?? 0).toFixed(2)}`.trim()
          : String(p.name ?? "");
      }
      case "service_field": {
        const s = entities.services.find((x: any) => x.id === entry.entityId);
        if (!s) return "";
        return entry.field === "price"
          ? `${s.currency ?? ""} ${Number(s.price ?? 0).toFixed(2)}`.trim()
          : String(s.name ?? "");
      }
      case "course_field": {
        const c = entities.courses.find((x: any) => x.id === entry.entityId);
        if (!c) return "";
        return entry.field === "price"
          ? `${c.currency ?? ""} ${Number(c.price ?? 0).toFixed(2)}`.trim()
          : String(c.title ?? "");
      }
      default:
        return "";
    }
  });
}

// ─── Entry point ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const startedAt = Date.now();

  const { caller, error: authError } = await requireInternalOrUser(req, supabase);
  if (authError) return authError;

  let body: any = {};
  try { body = await req.json(); } catch { /* no body */ }

  const campaignId: string | undefined = body.campaign_id;
  if (!campaignId) return json({ error: "missing campaign_id" }, 400);

  // ── Load campaign ──
  const { data: campaign } = await supabase
    .from("crm_wa_campaigns")
    .select("*, crm_wa_templates(*)")
    .eq("id", campaignId)
    .single();

  if (!campaign) return json({ error: "campaign_not_found" }, 404);
  // Un usuario solo puede disparar sus propias campañas. La llamada interna ya
  // viene del scheduler, que las seleccionó por su propio user_id.
  if (caller!.kind === "user" && campaign.user_id !== caller!.userId) {
    return json({ error: "campaign_not_found" }, 404);
  }

  // Desde la UI solo se lanzan borradores. El cron además dispara las programadas
  // ('scheduled') y retoma las que quedaron a medias ('processing').
  const launchable = caller!.kind === "internal"
    ? ["draft", "scheduled", "processing"]
    : ["draft"];
  if (!launchable.includes(campaign.status)) return json({ error: "already_processed" }, 400);

  const ownerId: string = campaign.user_id;

  // ── Cerrojo ────────────────────────────────────────────────────────────────
  // Se toma ANTES de preparar o enviar nada. La condición va en el propio UPDATE,
  // así que si dos invocaciones llegan a la vez solo una se lleva la fila: la
  // otra ve 0 resultados y se retira sin enviar.
  const { data: locked } = await supabase
    .from("crm_wa_campaigns")
    .update({ locked_until: new Date(Date.now() + LOCK_MS).toISOString() })
    .eq("id", campaignId)
    .or(`locked_until.is.null,locked_until.lt.${new Date().toISOString()}`)
    .select("id");

  if (!locked?.length) {
    return json({ ok: true, busy: true, message: "otra invocación ya está enviando esta campaña" });
  }

  const releaseLock = () =>
    supabase.from("crm_wa_campaigns").update({ locked_until: null }).eq("id", campaignId);

  try {
    return await run();
  } finally {
    await releaseLock();
  }

  async function run(): Promise<Response> {

  // ── Load WABA config ──
  const { data: cfg } = await supabase
    .from("crm_ai_agent_config")
    .select("phone_number_id, access_token")
    .eq("user_id", ownerId)
    .maybeSingle();

  if (!cfg?.phone_number_id || !cfg?.access_token) {
    return json({ error: "waba_not_configured" }, 400);
  }

  const template = campaign.crm_wa_templates;
  if (!template) return json({ error: "template_not_found" }, 404);

  // ── Preparar (solo en la primera invocación) ───────────────────────────────
  // Los logs 'pending' SON la lista de trabajo: se escriben una vez, antes de
  // enviar nada, y a partir de ahí cada invocación consume los que queden. Eso
  // es lo que permite reanudar sin volver a calcular la audiencia ni arriesgar
  // envíos duplicados.
  if (campaign.status === "draft" || campaign.status === "scheduled") {
    const audience = await buildAudience(
      supabase,
      ownerId,
      campaign.audience_type,
      campaign.audience_filters ?? [],
      { match: campaign.audience_match ?? "any" },
    );

    if (!audience.length) {
      await supabase
        .from("crm_wa_campaigns")
        .update({ status: "completed", total_contacts: 0, completed_at: new Date().toISOString() })
        .eq("id", campaignId);
      return json({ ok: true, done: true, sent: 0, failed: 0, total: 0 });
    }

    // Insert en trozos: 1000 filas en un solo insert revientan el payload.
    const rows = audience.map(c => ({
      campaign_id:  campaignId,
      contact_id:   c.contactId,   // null si el teléfono no tiene ficha de contacto
      phone:        normalizePhone(c.phone),
      contact_name: c.name ?? null,
      status:       "pending",
    }));
    for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
      const { error } = await supabase.from("crm_wa_campaign_logs").insert(rows.slice(i, i + INSERT_CHUNK));
      if (error) return json({ error: "log_insert_failed", detail: error.message }, 500);
    }

    await supabase
      .from("crm_wa_campaigns")
      .update({
        status: "processing",
        total_contacts: rows.length,
        started_at: campaign.started_at ?? new Date().toISOString(),
      })
      .eq("id", campaignId);
  }

  // ── Datos para resolver variables ──────────────────────────────────────────
  const varMap  = campaign.variable_map ?? {};
  const hasVars = Object.keys(varMap).length > 0;

  // Solo hace falta si la plantilla usa variables. Se reconstruye en cada
  // invocación porque el log solo guarda teléfono y nombre, no email ni empresa.
  let byPhone = new Map<string, any>();
  let entities = { products: [] as any[], services: [] as any[], courses: [] as any[] };
  if (hasVars) {
    const [prodRes, svcRes, courseRes, audience] = await Promise.all([
      supabase.from("crm_products").select("id, name, price, currency").eq("user_id", ownerId),
      supabase.from("crm_services").select("id, name, price, currency").eq("user_id", ownerId),
      supabase.from("crm_courses").select("id, title, price, currency").eq("user_id", ownerId),
      buildAudienceBase(supabase, ownerId),
    ]);
    entities = {
      products: prodRes.data ?? [],
      services: svcRes.data ?? [],
      courses:  courseRes.data ?? [],
    };
    byPhone = new Map(audience.map(m => [m.phoneKey, m]));
  }

  // ── Procesar un lote ───────────────────────────────────────────────────────
  const { data: pendingAll } = await supabase
    .from("crm_wa_campaign_logs")
    .select("id, phone, contact_name")
    .eq("campaign_id", campaignId)
    .eq("status", "pending")
    // Sin ORDER BY, "los primeros 400" no es un conjunto estable entre lotes.
    .order("id", { ascending: true })
    .limit(BATCH_SIZE);

  // Modo "hora local de cada contacto": de los pendientes solo salen ahora
  // aquellos en cuyo país ya dio la hora. El resto sigue en 'pending' y lo
  // recoge una pasada posterior del cron.
  const pending = filterByLocalTime(
    pendingAll ?? [],
    campaign.timezone_mode,
    campaign.target_date,
    campaign.target_local_time,
  );

  // ── Conversaciones donde dejar constancia del envío ────────────────────────
  // El log de la campaña guarda teléfono, no conversación, así que hay que
  // resolverla. A quien nunca escribió se le crea: una plantilla ABRE el hilo en
  // el teléfono del contacto, y si aquí no existe, el operador ve llegar una
  // respuesta a un mensaje que no aparece por ningún lado.
  const batchKeys = [...new Set(pending.map(r => normalizePhone(r.phone)).filter(p => isBsuid(p) || p.length >= 7))];
  const convByPhone = new Map<string, string>();

  if (batchKeys.length) {
    const CHUNK = 200;
    for (let i = 0; i < batchKeys.length; i += CHUNK) {
      const slice = batchKeys.slice(i, i + CHUNK);
      const { data } = await supabase
        .from("crm_wa_conversations")
        .select("id, phone")
        .eq("user_id", ownerId)
        .in("phone", slice);
      for (const c of data ?? []) convByPhone.set(normalizePhone(c.phone), c.id);
    }

    const missing = pending.filter(r => {
      const k = normalizePhone(r.phone);
      return (isBsuid(k) || k.length >= 7) && !convByPhone.has(k);
    });
    if (missing.length) {
      const seen = new Set<string>();
      const rows = missing.flatMap(r => {
        const k = normalizePhone(r.phone);
        if (seen.has(k)) return [];
        seen.add(k);
        return [{ user_id: ownerId, phone: k, contact_name: r.contact_name ?? null }];
      });
      const { data: created } = await supabase
        .from("crm_wa_conversations").insert(rows).select("id, phone");
      for (const c of created ?? []) convByPhone.set(normalizePhone(c.phone), c.id);
    }
  }

  // Lo que el contacto ve de verdad: el cuerpo de la plantilla con sus variables
  // ya sustituidas, no un "[Plantilla: nombre]" que no dice nada.
  const renderTemplate = (values: string[]): string => {
    const body = template.body_text ?? `[Plantilla: ${template.name}]`;
    return body.replace(/\{\{(\d+)\}\}/g, (m: string, n: string) => values[Number(n) - 1] ?? m);
  };

  let sent = 0;
  let failed = 0;

  for (const row of pending) {
    // Corte por tiempo: se para ANTES de agotar el presupuesto para poder cerrar
    // limpio. Lo que quede sigue en 'pending' y lo retoma el cron.
    if (Date.now() - startedAt > BUDGET_MS) break;

    const phone = normalizePhone(row.phone);

    if (!isBsuid(phone) && phone.length < 7) {
      await supabase.from("crm_wa_campaign_logs")
        .update({ status: "failed", error_message: "Número inválido", sent_at: new Date().toISOString() })
        .eq("id", row.id);
      failed++;
      continue;
    }

    const member = byPhone.get(phone);
    const contactForVars = {
      name:    member?.name    ?? row.contact_name ?? null,
      email:   member?.email   ?? null,
      phone:   row.phone,
      company: member?.company ?? null,
    };
    const resolvedValues = hasVars ? resolveVariables(contactForVars, varMap, entities) : [];

    const msgPayload: any = {
      messaging_product: "whatsapp",
      ...recipientField(phone),
      type: "template",
      template: {
        name:     template.name,
        language: { code: template.language },
      },
    };

    if (resolvedValues.length > 0) {
      msgPayload.template.components = [{
        type:       "body",
        parameters: resolvedValues.map(v => ({ type: "text", text: v || " " })),
      }];
    }

    try {
      const res = await fetch(`${GRAPH}/${cfg.phone_number_id}/messages`, {
        method:  "POST",
        headers: {
          Authorization:  `Bearer ${cfg.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(msgPayload),
      });

      const resData = await res.json().catch(() => ({}));

      if (res.ok) {
        await supabase.from("crm_wa_campaign_logs")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", row.id);
        const convId = convByPhone.get(phone);
        if (convId) {
          await supabase.from("crm_wa_messages").insert({
            conversation_id: convId,
            role: "assistant",
            content: renderTemplate(resolvedValues),
            wa_message_id: (resData as any)?.messages?.[0]?.id ?? null,
            delivery_status: "sent",
            origin: "campaign",
          });
        }
        sent++;
      } else {
        const errMsg = (resData as any)?.error?.message ?? `Meta ${res.status}`;
        await supabase.from("crm_wa_campaign_logs")
          .update({ status: "failed", error_message: errMsg, sent_at: new Date().toISOString() })
          .eq("id", row.id);
        failed++;
        console.error("[send-wa-campaign] Meta error:", JSON.stringify(resData));
      }
    } catch (_err) {
      await supabase.from("crm_wa_campaign_logs")
        .update({ status: "failed", error_message: "Error de red", sent_at: new Date().toISOString() })
        .eq("id", row.id);
      failed++;
    }

    await sleep(SEND_DELAY_MS);
  }

  // ── ¿Queda trabajo? ────────────────────────────────────────────────────────
  const { count: remaining } = await supabase
    .from("crm_wa_campaign_logs")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("status", "pending");

  // Los contadores se leen de los logs, no de este lote: con varias invocaciones
  // un contador en memoria solo conocería su propia tanda.
  const [{ count: totalSent }, { count: totalFailed }] = await Promise.all([
    supabase.from("crm_wa_campaign_logs").select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId).eq("status", "sent"),
    supabase.from("crm_wa_campaign_logs").select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId).eq("status", "failed"),
  ]);

  // En modo hora local quedan pendientes a propósito hasta que dé la hora en su
  // país: eso no es estar a medias, así que no se cierra hasta que pase la
  // última zona horaria.
  const waitingForTimezones =
    campaign.timezone_mode === "contact" &&
    campaign.target_date && campaign.target_local_time &&
    !allTimezonesReached(campaign.target_date, campaign.target_local_time);

  const done = (remaining ?? 0) === 0 && !waitingForTimezones;

  await supabase
    .from("crm_wa_campaigns")
    .update({
      status:       done ? ((totalSent ?? 0) === 0 ? "failed" : "completed") : "processing",
      sent_count:   totalSent   ?? 0,
      failed_count: totalFailed ?? 0,
      ...(done ? { completed_at: new Date().toISOString() } : {}),
    })
    .eq("id", campaignId);

  return json({
    ok: true,
    done,
    sent:      totalSent   ?? 0,
    failed:    totalFailed ?? 0,
    total:     (totalSent ?? 0) + (totalFailed ?? 0) + (remaining ?? 0),
    remaining: remaining ?? 0,
    batch:     { sent, failed },
  });

  } // fin de run()
});
