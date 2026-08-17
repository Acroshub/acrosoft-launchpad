/**
 * wa-health-check
 * Invocada cada 5 minutos por pg_cron.
 *
 * Vigila que el Agente IA de WhatsApp esté funcionando y avisa al administrador
 * de Acros Software por notificación push. A NADIE más: ni dueños de negocio ni
 * staff reciben nada de esto.
 *
 * Nace del incidente del 16/08/2026: el webhook estuvo 21 horas sin poder crear
 * conversaciones y se perdieron ~70 leads. Nadie se enteró porque un fallo así
 * no se ve en los datos — no se pueden ver mensajes que nunca se guardaron. La
 * detección, no la recuperación, fue lo que falló ese día.
 *
 * Cada alerta se abre una sola vez por tipo y cliente, va sumando repeticiones
 * mientras el problema sigue, se re-notifica como mucho una vez por hora, y se
 * cierra sola (con aviso) cuando la condición deja de cumplirse.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireInternal } from "../_shared/internal-auth.ts";
import { sendPushToUsers } from "../_shared/push.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const GRAPH = "https://graph.facebook.com/v21.0";
const ADMIN_EMAIL = "e.daniel.acero.r@gmail.com";
/** No repetir el mismo aviso más de una vez por hora aunque el problema siga. */
const RENOTIFY_MS = 60 * 60_000;

type Finding = {
  kind: string;
  severity: "critical" | "warning";
  tenantUserId: string | null;
  tenantLabel: string | null;
  title: string;
  /** Explicación en lenguaje claro: es lo que se lee en la notificación. */
  body: string;
  detail?: Record<string, unknown>;
};

// ─── Detecciones ──────────────────────────────────────────────────────────────

/** 1. El webhook no pudo guardar mensajes. El fallo del 16/08. */
async function checkMessagesNotSaved(labels: Map<string, string>): Promise<Finding[]> {
  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const { data } = await supabase
    .from("crm_wa_health_events")
    .select("tenant_user_id, detail")
    .eq("kind", "message_not_saved")
    .gte("created_at", since);

  if (!data?.length) return [];

  const byTenant = new Map<string, { n: number; detail: string }>();
  for (const e of data) {
    const key = e.tenant_user_id ?? "global";
    const prev = byTenant.get(key);
    byTenant.set(key, { n: (prev?.n ?? 0) + 1, detail: e.detail ?? prev?.detail ?? "" });
  }

  return [...byTenant].map(([tenant, { n, detail }]) => ({
    kind: "wa_messages_not_saved",
    severity: "critical" as const,
    tenantUserId: tenant === "global" ? null : tenant,
    tenantLabel: labels.get(tenant) ?? null,
    title: "No se están guardando los mensajes",
    body: n === 1
      ? `Un mensaje de un cliente llegó pero no se pudo guardar en los últimos 10 minutos. Está escribiendo y desapareciendo sin respuesta: ni se crea la conversación ni contesta la IA. Error: ${detail || "desconocido"}`
      : `${n} mensajes de clientes llegaron pero no se pudieron guardar en los últimos 10 minutos. Están escribiendo y desapareciendo sin respuesta: ni se crean las conversaciones ni contesta la IA. Error: ${detail || "desconocido"}`,
    detail: { fallos: n, error: detail },
  }));
}

/** 2. Meta está rechazando los envíos salientes. */
async function checkSendFailures(labels: Map<string, string>): Promise<Finding[]> {
  const since = new Date(Date.now() - 15 * 60_000).toISOString();
  const { data } = await supabase
    .from("crm_wa_messages")
    .select("send_error, crm_wa_conversations!inner(user_id)")
    .not("send_error", "is", null)
    .gte("created_at", since);

  if (!data?.length) return [];

  const byTenant = new Map<string, { n: number; err: string }>();
  for (const m of data as unknown as { send_error: string; crm_wa_conversations: { user_id: string } }[]) {
    const key = m.crm_wa_conversations?.user_id ?? "global";
    const prev = byTenant.get(key);
    byTenant.set(key, { n: (prev?.n ?? 0) + 1, err: m.send_error ?? prev?.err ?? "" });
  }

  return [...byTenant]
    .filter(([, v]) => v.n >= 3)
    .map(([tenant, { n, err }]) => ({
      kind: "wa_send_failures",
      severity: "critical" as const,
      tenantUserId: tenant === "global" ? null : tenant,
      tenantLabel: labels.get(tenant) ?? null,
      title: "Meta está rechazando los envíos",
      body: `${n} mensajes no se pudieron entregar en los últimos 15 minutos. Suele ser el token de acceso vencido, la cuenta de WhatsApp bloqueada o el límite de gasto alcanzado. Los clientes escriben y no reciben respuesta. Motivo de Meta: ${err.slice(0, 160)}`,
      detail: { fallos: n, error: err.slice(0, 300) },
    }));
}

/** 3. Llegan mensajes pero la IA no contesta. */
async function checkAiNotReplying(labels: Map<string, string>): Promise<Finding[]> {
  const cutoff = new Date(Date.now() - 10 * 60_000).toISOString();
  const floor  = new Date(Date.now() - 60 * 60_000).toISOString();

  // Conversaciones en modo IA cuyo último mensaje es del cliente y ya tiene rato.
  const { data: convs } = await supabase
    .from("crm_wa_conversations")
    .select("id, user_id, mode")
    .eq("mode", "AI")
    .gte("last_message_at", floor);

  if (!convs?.length) return [];

  const byTenant = new Map<string, number>();
  for (const c of convs) {
    const { data: last } = await supabase
      .from("crm_wa_messages")
      .select("role, created_at")
      .eq("conversation_id", c.id)
      .eq("is_internal", false)
      .order("created_at", { ascending: false })
      .limit(1);
    const m = last?.[0];
    if (!m || m.role !== "user" || m.created_at > cutoff) continue;
    byTenant.set(c.user_id, (byTenant.get(c.user_id) ?? 0) + 1);
  }

  return [...byTenant]
    .filter(([, n]) => n >= 3)
    .map(([tenant, n]) => ({
      kind: "wa_ai_not_replying",
      severity: "critical" as const,
      tenantUserId: tenant,
      tenantLabel: labels.get(tenant) ?? null,
      title: "La IA dejó de responder",
      body: `${n} clientes llevan más de 10 minutos esperando respuesta. Los mensajes SÍ están llegando y guardándose, así que el webhook funciona: el problema está en el agente. Suele ser la API de Claude caída o sin crédito.`,
      detail: { conversaciones_esperando: n },
    }));
}

/** 4. Meta ya no nos manda eventos: la suscripción del WABA se cayó. */
async function checkWebhookSubscription(
  configs: { user_id: string; waba_id: string | null; access_token: string | null }[],
  labels: Map<string, string>,
): Promise<Finding[]> {
  const out: Finding[] = [];

  for (const cfg of configs) {
    if (!cfg.waba_id || !cfg.access_token) continue;
    try {
      const res = await fetch(`${GRAPH}/${cfg.waba_id}/subscribed_apps`, {
        headers: { Authorization: `Bearer ${cfg.access_token}` },
      });
      // Un fallo de red o un 5xx de Meta no significa que la suscripción esté
      // caída: no se alerta por eso, o saltaría cada vez que Meta tosa.
      if (!res.ok) {
        if (res.status >= 500) continue;
        const txt = await res.text();
        out.push({
          kind: "wa_webhook_disconnected",
          severity: "critical",
          tenantUserId: cfg.user_id,
          tenantLabel: labels.get(cfg.user_id) ?? null,
          title: "WhatsApp desconectado de Meta",
          body: `Meta rechazó la consulta sobre este número de WhatsApp, normalmente porque el token dejó de ser válido o se revocó el acceso. Mientras siga así no llega ningún mensaje de clientes. Respuesta de Meta: ${txt.slice(0, 160)}`,
          detail: { status: res.status, error: txt.slice(0, 300) },
        });
        continue;
      }
      const json = await res.json();
      const apps = (json?.data ?? []) as unknown[];
      if (apps.length === 0) {
        out.push({
          kind: "wa_webhook_disconnected",
          severity: "critical",
          tenantUserId: cfg.user_id,
          tenantLabel: labels.get(cfg.user_id) ?? null,
          title: "WhatsApp desconectado de Meta",
          body: `La cuenta de WhatsApp ya no tiene ninguna aplicación suscrita, así que Meta no nos está enviando los mensajes de los clientes. Escriben y no llega nada al CRM. Hay que volver a suscribir la app desde Conexión.`,
          detail: { subscribed_apps: 0 },
        });
      }
    } catch (_e) {
      // Sin red hacia Meta: no se puede concluir nada, mejor callar.
      continue;
    }
  }
  return out;
}

/** 5. Los seguimientos encolados no salen. */
async function checkStuckFollowups(labels: Map<string, string>): Promise<Finding[]> {
  const cutoff = new Date(Date.now() - 20 * 60_000).toISOString();
  const { data } = await supabase
    .from("crm_wa_automation_queue")
    .select("user_id")
    .eq("status", "pending")
    .lte("scheduled_at", cutoff);

  if (!data?.length) return [];

  const byTenant = new Map<string, number>();
  for (const q of data) byTenant.set(q.user_id, (byTenant.get(q.user_id) ?? 0) + 1);

  return [...byTenant].map(([tenant, n]) => ({
    kind: "wa_followups_stuck",
    severity: "warning" as const,
    tenantUserId: tenant,
    tenantLabel: labels.get(tenant) ?? null,
    title: "Seguimientos automáticos atascados",
    body: `${n} seguimiento${n === 1 ? "" : "s"} tenían que haber salido hace más de 20 minutos y siguen en cola. El proceso que los envía no está avanzando, así que esos clientes no reciben su mensaje de recuperación.`,
    detail: { en_cola: n },
  }));
}

// ─── Alta, repetición y cierre de alertas ─────────────────────────────────────

async function raise(finding: Finding, adminId: string | null): Promise<"nueva" | "repetida" | "silenciada"> {
  let q = supabase
    .from("crm_admin_alerts")
    .select("id, occurrences, notified_at")
    .eq("type", finding.kind)
    .is("resolved_at", null);
  q = finding.tenantUserId ? q.eq("user_id", finding.tenantUserId) : q.is("user_id", null);
  const { data: open } = await q.limit(1);

  const existing = open?.[0];
  const now = new Date().toISOString();

  if (!existing) {
    await supabase.from("crm_admin_alerts").insert({
      type: finding.kind,
      severity: finding.severity,
      user_id: finding.tenantUserId,
      tenant_label: finding.tenantLabel,
      title: finding.title,
      message: finding.body,
      metadata: finding.detail ?? {},
      notified_at: now,
    });
    await push(finding, adminId);
    return "nueva";
  }

  const debeReNotificar =
    !existing.notified_at || Date.now() - new Date(existing.notified_at).getTime() > RENOTIFY_MS;

  await supabase.from("crm_admin_alerts")
    .update({
      occurrences: (existing.occurrences ?? 1) + 1,
      last_occurred_at: now,
      message: finding.body,
      ...(debeReNotificar ? { notified_at: now } : {}),
    })
    .eq("id", existing.id);

  if (debeReNotificar) { await push(finding, adminId); return "repetida"; }
  return "silenciada";
}

function push(finding: Finding, adminId: string | null) {
  if (!adminId) return Promise.resolve();
  const dueño = finding.tenantLabel ? `${finding.tenantLabel}` : "Todos los clientes";
  return sendPushToUsers(supabase, [adminId], {
    title: `${finding.severity === "critical" ? "🔴" : "🟠"} ${dueño}: ${finding.title}`,
    body: finding.body,
    url: "/crm/ajustes?panel=alertas",
  }).catch(() => {});
}

/** Cierra las alertas cuya condición ya no se cumple y avisa de la mejoría. */
async function resolveGone(vigentes: Finding[], adminId: string | null): Promise<number> {
  const vivos = new Set(vigentes.map(f => `${f.kind}::${f.tenantUserId ?? "global"}`));
  const gestionados = [
    "wa_messages_not_saved", "wa_send_failures", "wa_ai_not_replying",
    "wa_webhook_disconnected", "wa_followups_stuck",
  ];

  const { data: abiertas } = await supabase
    .from("crm_admin_alerts")
    .select("id, type, user_id, title, tenant_label")
    .is("resolved_at", null)
    .in("type", gestionados);

  let cerradas = 0;
  for (const a of abiertas ?? []) {
    if (vivos.has(`${a.type}::${a.user_id ?? "global"}`)) continue;
    await supabase.from("crm_admin_alerts")
      .update({ resolved_at: new Date().toISOString() })
      .eq("id", a.id);
    cerradas++;
    if (adminId) {
      await sendPushToUsers(supabase, [adminId], {
        title: `🟢 ${a.tenant_label ?? "Sistema"}: se normalizó`,
        body: `Ya se resolvió: ${a.title}. El servicio volvió a funcionar con normalidad.`,
        url: "/crm/ajustes?panel=alertas",
      }).catch(() => {});
    }
  }
  return cerradas;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const unauthorized = requireInternal(req);
  if (unauthorized) return unauthorized;

  try {
    // Destinatario único: el administrador de Acros Software. Ningún otro
    // usuario recibe estas notificaciones.
    const { data: adminUser } = await supabase.rpc("get_admin_user_id");
    const adminId = (adminUser as string | null) ?? null;
    if (!adminId) console.error("[wa-health-check] no se encontró el usuario administrador");

    const { data: configs } = await supabase
      .from("crm_ai_agent_config")
      .select("user_id, waba_id, access_token, verified_business_name, verified_phone, is_active");

    // Etiqueta legible de cada cliente SaaS, para que la notificación diga de
    // quién se trata. Sale de get_tenant_labels() porque verified_business_name
    // suele venir vacío y quedaba el teléfono crudo en vez del nombre.
    const labels = new Map<string, string>();
    const { data: etiquetas } = await supabase.rpc("get_tenant_labels");
    for (const t of (etiquetas ?? []) as { user_id: string; label: string }[]) {
      if (t.label) labels.set(t.user_id, t.label);
    }

    const activos = (configs ?? []).filter(c => c.is_active);

    const findings: Finding[] = [
      ...(await checkMessagesNotSaved(labels)),
      ...(await checkSendFailures(labels)),
      ...(await checkAiNotReplying(labels)),
      ...(await checkWebhookSubscription(activos, labels)),
      ...(await checkStuckFollowups(labels)),
    ];

    const resultados: Record<string, string> = {};
    for (const f of findings) {
      resultados[`${f.kind}:${f.tenantLabel ?? "global"}`] = await raise(f, adminId);
    }
    const cerradas = await resolveGone(findings, adminId);

    return new Response(JSON.stringify({ ok: true, problemas: findings.length, cerradas, resultados }), { status: 200 });
  } catch (err) {
    console.error("[wa-health-check] fatal:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
