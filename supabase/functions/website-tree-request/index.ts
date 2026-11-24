// Recibe los pedidos de la landing /website-tree (website gratis para dueños de negocios de tree service) y calcula los cupos del mes.
//  - { action: "slots" }  → { slots_left, limit }   (la landing lo pide al cargar para mostrar «quedan N cupos»)
//  - { action: "lead", name, email, whatsapp, business } → paso 1 del formulario: guarda el contacto con la etiqueta website-tree-incompleto
//                           (o website-tree-espera si ya no quedan cupos) sin gastar cupo ni avisar por push.
//  - { action: "visit", variant, visitor_id } → cuenta una visita única al split test (tabla website_tree_split_visits); un mismo visitor_id no se repite.
//  - Los pasos «lead» y el pedido aceptan además `variant` ("normal" | "game"): el contacto queda con la etiqueta website-tree-v-<variante> (la primera que vio).
//  - { ...pedido }        → guarda el pedido como envío del formulario del CRM «Website Tree Service gratis» (slug website-tree, de la cuenta del
//                           superadmin), crea/actualiza el contacto con la etiqueta website-tree y avisa por push al superadmin.
// Límite: 10 pedidos por mes (hora de Nueva York). Un mismo correo (o, si no dejó correo, un mismo WhatsApp) no gasta dos cupos. verify_jwt = false (visitante anónimo): se protege
// con límite por IP (check_rate_limit) y validando todo en website-tree.ts.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PUBLIC_CORS_HEADERS } from "../_shared/cors.ts";
import { sendPushToUsers } from "../_shared/push.ts";
import {
  WEBSITE_TREE_MONTHLY_LIMIT, WEBSITE_TREE_SLUG, WEBSITE_TREE_TAG, WEBSITE_TREE_TAG_PARTIAL, WEBSITE_TREE_TAG_WAITLIST, WT_FIELD,
  buildSubmissionData, buildWebsiteTreePush, monthStartIso, parseVariant, parseVisitorId, parseWebsiteTreeLead, parseWebsiteTreeRequest, slotsLeft, withVariantTag,
} from "../_shared/website-tree.ts";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const PUSH_TIMEOUT_MS = 4000;

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...PUBLIC_CORS_HEADERS, "Content-Type": "application/json" } });
}

/** Formulario del CRM donde caen los pedidos (de la cuenta del superadmin). */
async function loadForm(): Promise<{ id: string; user_id: string } | null> {
  const { data: adminId } = await supabase.rpc("get_admin_user_id");
  if (!adminId) return null;
  const { data: form } = await supabase
    .from("crm_forms").select("id, user_id").eq("user_id", adminId as string).eq("slug", WEBSITE_TREE_SLUG).maybeSingle();
  return form ?? null;
}

async function usedThisMonth(formId: string): Promise<number> {
  const { count, error } = await supabase
    .from("crm_form_submissions").select("id", { count: "exact", head: true })
    .eq("form_id", formId).gte("created_at", monthStartIso(Date.now()));
  if (error) throw error;
  return count ?? 0;
}

/** Contacto ya existente de esa cuenta: por correo si lo dejó; si no, por WhatsApp (el correo es opcional). */
// deno-lint-ignore no-explicit-any
function findContact(userId: string, email: string, phone: string, cols: string): Promise<{ data: any }> {
  const q = supabase.from("crm_contacts").select(cols).eq("user_id", userId);
  return (email ? q.eq("email", email) : q.eq("phone", phone)).limit(1).maybeSingle() as unknown as Promise<{ data: any }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: PUBLIC_CORS_HEADERS });

  let body: any;
  try { body = await req.json(); } catch { return respond({ error: "JSON inválido" }, 400); }
  const isSlots = body?.action === "slots";
  const isLead = body?.action === "lead";
  const isVisit = body?.action === "visit";

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "unknown";
  const { data: allowed, error: rlErr } = await supabase.rpc("check_rate_limit", {
    p_key: isSlots ? `website-tree-slots:${ip}` : isVisit ? `website-tree-visit:${ip}` : `website-tree:${ip}`,
    p_window_seconds: 3600,
    p_max_count: isSlots || isVisit ? 120 : 10,
  });
  if (rlErr) console.error("rate_limit check error (non-blocking):", rlErr);
  if (allowed === false) return respond({ error: "Demasiadas solicitudes. Intenta más tarde." }, 429);

  if (isVisit) {
    const variant = parseVariant(body);
    const visitorId = parseVisitorId(body);
    if (!variant || !visitorId) return respond({ error: "Visita inválida" }, 400);
    // Un visitante cuenta una sola vez (la primera versión que vio): si ya estaba, no se toca nada.
    const { error } = await supabase.from("website_tree_split_visits").upsert({ visitor_id: visitorId, variant }, { onConflict: "visitor_id", ignoreDuplicates: true });
    if (error) { console.error("visit:", error); return respond({ error: "No se pudo contar la visita" }, 500); }
    return respond({ ok: true });
  }

  try {
    const form = await loadForm();
    if (!form) return respond({ error: "Formulario no disponible" }, 503);

    if (isSlots) {
      const left = slotsLeft(await usedThisMonth(form.id));
      return respond({ slots_left: left, limit: WEBSITE_TREE_MONTHLY_LIMIT });
    }

    if (isLead) {
      const variant = parseVariant(body);
      const lead = parseWebsiteTreeLead(body);
      if (!lead.ok) return respond({ error: lead.error }, 400);
      const l = lead.value;
      const left = slotsLeft(await usedThisMonth(form.id));
      const tag = left === 0 ? WEBSITE_TREE_TAG_WAITLIST : WEBSITE_TREE_TAG_PARTIAL;
      try {
        const { data: existing } = await findContact(form.user_id, l.email, l.whatsapp, "id, tags");
        if (existing) {
          const tags: string[] = existing.tags ?? [];
          // Quien ya completó el formulario (o ya está en la lista de espera) no se vuelve a etiquetar como incompleto.
          const base = !tags.includes(WEBSITE_TREE_TAG) && !tags.includes(tag) ? [...tags, tag] : tags;
          const next = withVariantTag(base, variant);
          if (next.length !== tags.length) await supabase.from("crm_contacts").update({ tags: next }).eq("id", existing.id);
        } else {
          await supabase.from("crm_contacts").insert({
            user_id: form.user_id, name: l.name, email: l.email || null, phone: l.whatsapp, company: l.business, tags: withVariantTag([tag], variant), notes: null, custom_fields: {},
          });
        }
      } catch (e) {
        console.error("lead (contacto):", e);
        return respond({ error: "No pudimos guardar tus datos" }, 500);
      }
      return respond({ ok: true, slots_left: left, waitlist: left === 0 });
    }

    const parsed = parseWebsiteTreeRequest(body);
    if (!parsed.ok) return respond({ error: parsed.error }, 400);
    const v = parsed.value;
    const variant = parseVariant(body);

    // Un mismo correo no gasta dos cupos: si ya pidió este mes, se responde como éxito sin duplicar nada.
    const { count: dup } = await supabase
      .from("crm_form_submissions").select("id", { count: "exact", head: true })
      .eq("form_id", form.id).gte("created_at", monthStartIso(Date.now()))
      .filter(`data->>${v.email ? WT_FIELD.email : WT_FIELD.whatsapp}`, "eq", v.email || v.whatsapp);
    if ((dup ?? 0) > 0) return respond({ ok: true, already: true, slots_left: slotsLeft(await usedThisMonth(form.id)) });

    if (slotsLeft(await usedThisMonth(form.id)) === 0) return respond({ error: "cupos_agotados", slots_left: 0 }, 409);

    const data = buildSubmissionData(v);
    const { data: sub, error: subErr } = await supabase
      .from("crm_form_submissions").insert({ form_id: form.id, data, terms_accepted: true, terms_accepted_at: new Date().toISOString() })
      .select("id").single();
    if (subErr || !sub) { console.error("insert submission:", subErr); return respond({ error: "No pudimos guardar tu pedido" }, 500); }

    // Dos pedidos simultáneos en el último cupo: si el conteo se pasó del límite, este es el que sobra y se deshace.
    const used = await usedThisMonth(form.id);
    if (used > WEBSITE_TREE_MONTHLY_LIMIT) {
      await supabase.from("crm_form_submissions").delete().eq("id", sub.id);
      return respond({ error: "cupos_agotados", slots_left: 0 }, 409);
    }

    // Contacto del CRM (sin duplicar por correo) con la etiqueta de la landing y las respuestas en su ficha.
    try {
      const { data: existing } = await findContact(form.user_id, v.email, v.whatsapp, "id, tags, custom_fields");
      if (existing) {
        await supabase.from("crm_contacts").update({
          name: v.name, phone: v.whatsapp, company: v.business,
          // Ya completó el formulario: deja de ser «incompleto» o «en espera».
          tags: withVariantTag(Array.from(new Set([...((existing.tags ?? []) as string[]).filter((t) => t !== WEBSITE_TREE_TAG_PARTIAL && t !== WEBSITE_TREE_TAG_WAITLIST), WEBSITE_TREE_TAG])), variant),
          custom_fields: { ...((existing.custom_fields as object) ?? {}), [form.id]: data },
        }).eq("id", existing.id);
      } else {
        await supabase.from("crm_contacts").insert({
          user_id: form.user_id, name: v.name, email: v.email || null, phone: v.whatsapp, company: v.business,
          tags: withVariantTag([WEBSITE_TREE_TAG], variant), notes: null, custom_fields: { [form.id]: data },
        });
      }
    } catch (e) {
      console.error("contacto (no crítico, el pedido ya está guardado):", e);
    }

    // Aviso push al superadmin: nunca hace fallar el pedido y no espera más de PUSH_TIMEOUT_MS.
    try {
      let timer: ReturnType<typeof setTimeout> | undefined;
      await Promise.race([
        sendPushToUsers(supabase, [form.user_id], buildWebsiteTreePush(v, slotsLeft(used))),
        new Promise((resolve) => { timer = setTimeout(resolve, PUSH_TIMEOUT_MS); }),
      ]).finally(() => { if (timer) clearTimeout(timer); });
    } catch (e) {
      console.error("push (no crítico):", e);
    }

    return respond({ ok: true, slots_left: slotsLeft(used) });
  } catch (e) {
    console.error("website-tree-request:", e);
    return respond({ error: "Error inesperado" }, 500);
  }
});
