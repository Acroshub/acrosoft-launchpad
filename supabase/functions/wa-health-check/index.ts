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
  /**
   * Nivel de urgencia, para problemas que empeoran con el tiempo. Cuando sube,
   * se vuelve a notificar en el acto aunque no haya pasado la hora de silencio:
   * un problema que lleva seis horas sin resolverse no merece el mismo aviso que
   * uno de veinte minutos.
   */
  nivel?: number;
};

/** Cuánto aguanta la bandeja reintentando antes de descartar. Ver wa-inbox-retry. */
const VENTANA_HORAS = 46;

function duracionLegible(ms: number): string {
  const min = Math.round(ms / 60_000);
  if (min < 60) return `${min} minutos`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h < 24) return m ? `${h} h ${m} min` : `${h} horas`;
  return `${Math.floor(h / 24)} días y ${h % 24} h`;
}

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
    body: n === 1
      ? `Un seguimiento tenía que haber salido hace más de 20 minutos y sigue en cola. El proceso que los envía no está avanzando, así que ese cliente no recibe su mensaje de recuperación.`
      : `${n} seguimientos tenían que haber salido hace más de 20 minutos y siguen en cola. El proceso que los envía no está avanzando, así que esos clientes no reciben su mensaje de recuperación.`,
    detail: { en_cola: n },
  }));
}

/** 6. Mensajes que la bandeja de entrada ya no pudo salvar. Lo más grave. */
async function checkInboxDiscarded(labels: Map<string, string>): Promise<Finding[]> {
  const since = new Date(Date.now() - 60 * 60_000).toISOString();
  const { data } = await supabase
    .from("crm_wa_inbox")
    .select("tenant_user_id, last_error")
    .eq("status", "failed")
    .gte("processed_at", since);

  if (!data?.length) return [];

  const byTenant = new Map<string, { n: number; err: string }>();
  for (const r of data) {
    const key = r.tenant_user_id ?? "global";
    const prev = byTenant.get(key);
    byTenant.set(key, { n: (prev?.n ?? 0) + 1, err: r.last_error ?? prev?.err ?? "" });
  }

  return [...byTenant].map(([tenant, { n, err }]) => ({
    kind: "wa_inbox_discarded",
    severity: "critical" as const,
    tenantUserId: tenant === "global" ? null : tenant,
    tenantLabel: labels.get(tenant) ?? null,
    title: "Mensajes perdidos definitivamente",
    body: n === 1
      ? `Un mensaje de un cliente no se pudo procesar en unas 46 horas de reintentos, así que se descartó. Ese cliente escribió y nadie lo verá nunca en el CRM. Hay que revisar qué está fallando y contactarlo a mano. Motivo: ${err || "desconocido"}`
      : `${n} mensajes de clientes no se pudieron procesar en unas 46 horas de reintentos, así que se descartaron. Esos clientes escribieron y nadie los verá nunca en el CRM. Hay que revisar qué está fallando y contactarlos a mano. Motivo: ${err || "desconocido"}`,
    detail: { descartados: n, error: err.slice(0, 300) },
  }));
}

/**
 * 7. Hay mensajes esperando en la bandeja desde hace rato.
 *
 * Cubre dos situaciones que piden lo mismo — mirar por qué no se procesan:
 *   a) la causa de fondo sigue rota y los reintentos siguen fallando;
 *   b) `wa-inbox-retry` dejó de correr y nadie los está reintentando.
 *
 * Es además lo que mantiene el aviso vivo durante una avería larga. Los
 * reintentos se espacian hasta horas, así que `wa_messages_not_saved` —que mira
 * solo los últimos 10 minutos— se cerraría sola entre intento e intento y daría
 * la falsa impresión de que ya está resuelto. Esta alerta no se cierra hasta que
 * la bandeja queda vacía de verdad.
 *
 * A los 20 minutos un mensaje ya ha fallado unas tres veces: no es un tropiezo.
 */
async function checkInboxStuck(labels: Map<string, string>): Promise<Finding[]> {
  const cutoff = new Date(Date.now() - 20 * 60_000).toISOString();
  const { data } = await supabase
    .from("crm_wa_inbox")
    .select("tenant_user_id, created_at")
    .eq("status", "pending")
    .lt("created_at", cutoff);

  if (!data?.length) return [];

  const byTenant = new Map<string, { n: number; masViejoMs: number }>();
  for (const r of data) {
    const key = r.tenant_user_id ?? "global";
    const edad = Date.now() - new Date(r.created_at as string).getTime();
    const prev = byTenant.get(key);
    byTenant.set(key, {
      n: (prev?.n ?? 0) + 1,
      masViejoMs: Math.max(prev?.masViejoMs ?? 0, edad),
    });
  }

  return [...byTenant].map(([tenant, { n, masViejoMs }]) => {
    const horas = masViejoMs / 3_600_000;
    const restantes = Math.round(Math.max(0, VENTANA_HORAS - horas));
    const desde = duracionLegible(masViejoMs);

    /** Elige singular o plural. Toda la concordancia del texto sale de aquí. */
    const p = (sing: string, plur: string) => (n === 1 ? sing : plur);

    // El aviso sube de tono según pasa el tiempo. A las 2 h ya está claro que no
    // se va a arreglar solo; a las 6 h queda menos de un día de margen.
    const nivel = horas >= 6 ? 3 : horas >= 2 ? 2 : 1;

    const title =
      nivel === 3 ? "🚨 MUY URGENTE: mensajes a punto de perderse" :
      nivel === 2 ? "⚠️ URGENTE: mensajes sin procesar hace horas" :
                    "Mensajes esperando sin procesarse";

    const comun = `${p("Un mensaje de un cliente lleva", `${n} mensajes de clientes llevan`)} ${desde} en la bandeja sin poder procesarse. ${p("Sigue guardado y se reintenta solo", "Siguen guardados y se reintentan solos")}, así que en cuanto se arregle la causa ${p("entrará", "entrarán")} al chat sin que hagas nada.`;

    const body =
      nivel === 1
        ? `${comun} Hasta entonces ${p("ese cliente escribió y no aparece", "esos clientes escribieron y no aparecen")} en el CRM. Hay que averiguar qué está fallando.`
        : nivel === 2
        ? `URGENTE. ${comun} Pero ${p("lleva", "llevan")} ${desde} fallando: esto ya NO se va a arreglar solo, el problema de fondo sigue ahí. Quedan unas ${restantes} horas antes de que ${p("se descarte y se pierda", "empiecen a descartarse y se pierdan")} para siempre. Hay que revisarlo ya.`
        : `MUY URGENTE. ${comun} ${p("Lleva", "Llevan")} ${desde} fallando y quedan solo unas ${restantes} horas antes de que ${p("se descarte y se pierda", "se descarten y se pierdan")} definitivamente. Si nadie arregla la causa antes de ese plazo, ${p("ese cliente desaparece", "esos clientes desaparecen")} sin dejar rastro en el CRM. Hay que atenderlo ahora.`;

    return {
      kind: "wa_inbox_stuck",
      severity: "critical" as const,
      tenantUserId: tenant === "global" ? null : tenant,
      tenantLabel: labels.get(tenant) ?? null,
      title,
      body,
      detail: { esperando: n, esperando_desde: desde, horas_restantes: restantes, nivel },
      nivel,
    };
  });
}

// ─── Alta, repetición y cierre de alertas ─────────────────────────────────────

async function raise(finding: Finding, adminId: string | null): Promise<"nueva" | "repetida" | "silenciada"> {
  let q = supabase
    .from("crm_admin_alerts")
    .select("id, occurrences, notified_at, metadata")
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

  // Si el problema ha subido de nivel (lleva más tiempo sin resolverse), se avisa
  // en el acto aunque no haya pasado la hora de silencio: es información nueva.
  const nivelPrevio = Number((existing.metadata as Record<string, unknown> | null)?.nivel ?? 0);
  const subioNivel = (finding.nivel ?? 0) > nivelPrevio;

  const debeReNotificar = subioNivel
    || !existing.notified_at
    || Date.now() - new Date(existing.notified_at).getTime() > RENOTIFY_MS;

  await supabase.from("crm_admin_alerts")
    .update({
      occurrences: (existing.occurrences ?? 1) + 1,
      last_occurred_at: now,
      title: finding.title,      // el título cambia al escalar de urgencia
      message: finding.body,
      metadata: finding.detail ?? {},
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
    "wa_webhook_disconnected", "wa_followups_stuck", "wa_inbox_discarded",
    "wa_inbox_stuck",
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
      ...(await checkInboxDiscarded(labels)),
      ...(await checkInboxStuck(labels)),
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
