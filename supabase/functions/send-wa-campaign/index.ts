import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const GRAPH = "https://graph.facebook.com/v21.0";
const SEND_DELAY_MS = 120; // ~8 msg/seg — seguro bajo el límite de Meta

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

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
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
      case "contact_field":
        return String((contact as any)[entry.field] ?? "");
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

// ─── Audience building ────────────────────────────────────────────────────────

async function getFilterContactIds(
  userId: string,
  filter: Record<string, any>,
  allContacts: any[],
): Promise<Set<string>> {
  switch (filter.type) {
    case "tag": {
      return new Set(
        allContacts.filter(c => (c.tags ?? []).includes(filter.value)).map(c => c.id),
      );
    }
    case "wa_label": {
      const { data: clRows } = await supabase
        .from("crm_wa_conversation_labels")
        .select("conversation_id")
        .eq("label_id", filter.labelId);
      if (!clRows?.length) return new Set();
      const convIds = clRows.map((r: any) => r.conversation_id);
      const { data: convRows } = await supabase
        .from("crm_wa_conversations")
        .select("phone")
        .in("id", convIds)
        .eq("user_id", userId);
      const phones = new Set((convRows ?? []).map((r: any) => r.phone));
      return new Set(allContacts.filter(c => phones.has(c.phone)).map(c => c.id));
    }
    case "pipeline_stage": {
      const { data } = await supabase
        .from("crm_contact_pipeline_memberships")
        .select("contact_id")
        .eq("pipeline_id", filter.pipelineId)
        .eq("stage", filter.stage);
      return new Set((data ?? []).map((r: any) => r.contact_id));
    }
    case "has_sale_any": {
      const { data } = await supabase
        .from("crm_sales")
        .select("contact_id")
        .eq("user_id", userId)
        .neq("status", "rejected");
      return new Set((data ?? []).map((r: any) => r.contact_id).filter(Boolean));
    }
    case "has_sale_product": {
      const { data } = await supabase
        .from("crm_sales")
        .select("contact_id")
        .eq("user_id", userId)
        .eq("product_id", filter.productId)
        .neq("status", "rejected");
      return new Set((data ?? []).map((r: any) => r.contact_id).filter(Boolean));
    }
    case "has_sale_service": {
      const { data } = await supabase
        .from("crm_sales")
        .select("contact_id")
        .eq("user_id", userId)
        .eq("service_id", filter.serviceId)
        .neq("status", "rejected");
      return new Set((data ?? []).map((r: any) => r.contact_id).filter(Boolean));
    }
    case "no_sale": {
      const { data } = await supabase
        .from("crm_sales")
        .select("contact_id")
        .eq("user_id", userId)
        .neq("status", "rejected");
      const withSale = new Set((data ?? []).map((r: any) => r.contact_id).filter(Boolean));
      return new Set(allContacts.filter(c => !withSale.has(c.id)).map(c => c.id));
    }
    case "has_appointment_ever": {
      const { data } = await supabase
        .from("crm_appointments")
        .select("contact_id")
        .eq("user_id", userId)
        .neq("status", "cancelled");
      return new Set((data ?? []).map((r: any) => r.contact_id).filter(Boolean));
    }
    case "has_appointment_recent": {
      const days = Number(filter.days ?? 30);
      const cutoff = new Date(Date.now() - days * 86400_000).toISOString();
      const { data } = await supabase
        .from("crm_appointments")
        .select("contact_id")
        .eq("user_id", userId)
        .neq("status", "cancelled")
        .gte("created_at", cutoff);
      return new Set((data ?? []).map((r: any) => r.contact_id).filter(Boolean));
    }
    case "has_wa_conversation": {
      const { data } = await supabase
        .from("crm_wa_conversations")
        .select("phone")
        .eq("user_id", userId);
      const phones = new Set((data ?? []).map((r: any) => r.phone));
      return new Set(allContacts.filter(c => phones.has(c.phone)).map(c => c.id));
    }
    default:
      return new Set();
  }
}

async function buildAudienceContacts(
  userId: string,
  audienceType: string,
  filters: Record<string, any>[],
): Promise<any[]> {
  const { data: all } = await supabase
    .from("crm_contacts")
    .select("id, name, email, phone, company, tags")
    .eq("user_id", userId)
    .not("phone", "is", null)
    .neq("phone", "");

  const allContacts: any[] = all ?? [];
  if (!allContacts.length) return [];
  if (audienceType === "all" || !filters.length) return allContacts;

  const sets = await Promise.all(
    filters.map(f => getFilterContactIds(userId, f, allContacts)),
  );

  // Union of all matching IDs
  const unionSet = new Set(sets.flatMap(s => [...s]));

  return audienceType === "include"
    ? allContacts.filter(c => unionSet.has(c.id))
    : allContacts.filter(c => !unionSet.has(c.id));
}

// ─── Entry point ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const user = await getAuthUser(req);
  if (!user) return json({ error: "unauthorized" }, 401);

  let body: any = {};
  try { body = await req.json(); } catch { /* no body */ }

  const campaignId: string | undefined = body.campaign_id;
  if (!campaignId) return json({ error: "missing campaign_id" }, 400);

  // ── Load campaign ──
  const { data: campaign } = await supabase
    .from("crm_wa_campaigns")
    .select("*, crm_wa_templates(*)")
    .eq("id", campaignId)
    .eq("user_id", user.id)
    .single();

  if (!campaign) return json({ error: "campaign_not_found" }, 404);
  if (campaign.status !== "draft") return json({ error: "already_processed" }, 400);

  // ── Load WABA config ──
  const { data: cfg } = await supabase
    .from("crm_ai_agent_config")
    .select("phone_number_id, access_token")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!cfg?.phone_number_id || !cfg?.access_token) {
    return json({ error: "waba_not_configured" }, 400);
  }

  const template = campaign.crm_wa_templates;
  if (!template) return json({ error: "template_not_found" }, 404);

  // ── Mark processing ──
  await supabase
    .from("crm_wa_campaigns")
    .update({ status: "processing", started_at: new Date().toISOString() })
    .eq("id", campaignId);

  // ── Load entities for variable resolution ──
  const [prodRes, svcRes, courseRes] = await Promise.all([
    supabase.from("crm_products").select("id, name, price, currency").eq("user_id", user.id),
    supabase.from("crm_services").select("id, name, price, currency").eq("user_id", user.id),
    supabase.from("crm_courses").select("id, title, price, currency").eq("user_id", user.id),
  ]);

  const entities = {
    products: prodRes.data ?? [],
    services: svcRes.data ?? [],
    courses:  courseRes.data ?? [],
  };

  // ── Build audience ──
  const contacts = await buildAudienceContacts(
    user.id,
    campaign.audience_type,
    campaign.audience_filters ?? [],
  );

  await supabase
    .from("crm_wa_campaigns")
    .update({ total_contacts: contacts.length })
    .eq("id", campaignId);

  if (!contacts.length) {
    await supabase
      .from("crm_wa_campaigns")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", campaignId);
    return json({ ok: true, sent: 0, failed: 0, total: 0 });
  }

  // ── Insert pending log rows ──
  await supabase.from("crm_wa_campaign_logs").insert(
    contacts.map(c => ({
      campaign_id:  campaignId,
      contact_id:   c.id,
      phone:        normalizePhone(c.phone),
      contact_name: c.name ?? null,
      status:       "pending",
    })),
  );

  // ── Send messages ──
  const varMap = campaign.variable_map ?? {};
  const hasVars = Object.keys(varMap).length > 0;
  let sentCount = 0;
  let failedCount = 0;

  for (const contact of contacts) {
    const phone = normalizePhone(contact.phone);

    if (phone.length < 7) {
      await supabase
        .from("crm_wa_campaign_logs")
        .update({ status: "failed", error_message: "Número inválido", sent_at: new Date().toISOString() })
        .eq("campaign_id", campaignId)
        .eq("contact_id", contact.id);
      failedCount++;
      continue;
    }

    const resolvedValues = hasVars ? resolveVariables(contact, varMap, entities) : [];

    const msgPayload: any = {
      messaging_product: "whatsapp",
      to: phone,
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
        await supabase
          .from("crm_wa_campaign_logs")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("campaign_id", campaignId)
          .eq("contact_id", contact.id);
        sentCount++;
      } else {
        const errMsg = (resData as any)?.error?.message ?? `Meta ${res.status}`;
        await supabase
          .from("crm_wa_campaign_logs")
          .update({ status: "failed", error_message: errMsg, sent_at: new Date().toISOString() })
          .eq("campaign_id", campaignId)
          .eq("contact_id", contact.id);
        failedCount++;
        console.error("[send-wa-campaign] Meta error:", JSON.stringify(resData));
      }
    } catch (err) {
      await supabase
        .from("crm_wa_campaign_logs")
        .update({ status: "failed", error_message: "Error de red", sent_at: new Date().toISOString() })
        .eq("campaign_id", campaignId)
        .eq("contact_id", contact.id);
      failedCount++;
    }

    await sleep(SEND_DELAY_MS);
  }

  // ── Finalize ──
  await supabase
    .from("crm_wa_campaigns")
    .update({
      status:       failedCount === contacts.length ? "failed" : "completed",
      completed_at: new Date().toISOString(),
      sent_count:   sentCount,
      failed_count: failedCount,
    })
    .eq("id", campaignId);

  return json({ ok: true, sent: sentCount, failed: failedCount, total: contacts.length });
});
