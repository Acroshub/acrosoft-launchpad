import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  checkAdAccount, fetchAdThumbnail, getAd, listActiveAds, MetaApiError, normalizeAdAccountId, saveMetaAd,
  type MetaAd,
} from "../_shared/meta-ads.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

async function getAuthUser(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth) return null;
  const { data: { user }, error } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
  return error || !user ? null : user;
}

/** Mensaje en español para los fallos típicos de la Marketing API. */
function explain(e: unknown): string {
  if (e instanceof MetaApiError) {
    if (e.code === 190) return "El token de acceso es inválido o venció. Genera uno nuevo en Meta y guárdalo en Conexión.";
    if (e.code === 10 || e.code === 200 || e.code === 294) {
      return "El token no tiene permiso para leer anuncios. Genera un token de usuario del sistema con el permiso ads_read y asigna la cuenta publicitaria a ese usuario.";
    }
    if (e.code === 100) return "Meta no encontró esa cuenta publicitaria o el token no tiene acceso a ella. Revisa el ID y que esté asignada al usuario del sistema.";
    return `Meta respondió: ${e.message}`;
  }
  return e instanceof Error ? e.message : "Error desconocido";
}

/** Ejecuta `fn` sobre `items` con un máximo de `n` en paralelo. */
async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) await fn(items[i++]);
  }));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "not_found" }, 404);

  const user = await getAuthUser(req);
  if (!user) return json({ error: "unauthorized" }, 401);

  const action = new URL(req.url).searchParams.get("action");
  let body: any = {};
  try { body = await req.json(); } catch { /* sin cuerpo */ }

  const { data: cfg } = await supabase.from("crm_ai_agent_config")
    .select("access_token").eq("user_id", user.id).maybeSingle();
  if (!cfg?.access_token) return json({ ok: false, error: "Primero configura la conexión de WhatsApp (token de acceso)." }, 400);
  const token: string = cfg.access_token;

  // ── Agregar una cuenta publicitaria, comprobando antes que el token la ve ──
  if (action === "connect") {
    const accountId = normalizeAdAccountId(body.ad_account_id);
    if (!accountId) return json({ ok: false, error: "El ID de la cuenta publicitaria son solo números (puedes pegarlo con o sin act_)." }, 400);
    try {
      const { name } = await checkAdAccount(accountId, token);
      const { error } = await supabase.from("crm_wa_ad_accounts")
        .upsert({ user_id: user.id, account_id: accountId, name }, { onConflict: "user_id,account_id" });
      if (error) throw new Error(error.message);
      return json({ ok: true, ad_account_id: accountId, name });
    } catch (e) {
      return json({ ok: false, error: explain(e) }, 502);
    }
  }

  // Quitar una cuenta solo deja de sincronizarla: sus anuncios y las asignaciones de producto se conservan.
  if (action === "disconnect") {
    const accountId = normalizeAdAccountId(body.ad_account_id);
    if (!accountId) return json({ ok: false, error: "Falta el ID de la cuenta." }, 400);
    await supabase.from("crm_wa_ad_accounts").delete().eq("user_id", user.id).eq("account_id", accountId);
    return json({ ok: true });
  }

  // ── Sincronizar anuncios activos de todas las cuentas (+ completar los conocidos que ya no lo están) ──
  if (action === "sync") {
    const { data: accounts } = await supabase.from("crm_wa_ad_accounts")
      .select("account_id, name").eq("user_id", user.id).order("created_at");
    if (!accounts?.length) return json({ ok: false, error: "Agrega primero el ID de una cuenta publicitaria." }, 400);

    // Anuncios que ya conocemos, para no volver a bajar miniaturas que ya tenemos.
    const { data: known } = await supabase.from("crm_wa_ad_sources")
      .select("source_id, thumbnail_data, synced_at, ad_account_id").eq("user_id", user.id);
    const knownMap = new Map<string, { thumbnail_data: string | null; synced_at: string | null; ad_account_id: string | null }>(
      (known ?? []).map((k: any) => [k.source_id, k]),
    );

    // Una cuenta que falla (permiso, token…) no tumba a las demás.
    const errors: { account_id: string; error: string }[] = [];
    const activeByAccount = new Map<string, Set<string>>();
    const activeAds: MetaAd[] = [];
    for (const acc of accounts) {
      try {
        const ads = await listActiveAds(acc.account_id, token);
        for (const ad of ads) ad.account_id ??= acc.account_id;
        activeAds.push(...ads);
        activeByAccount.set(acc.account_id, new Set(ads.map(a => a.id)));
      } catch (e) {
        console.error("[meta-ads-sync]", acc.account_id, e);
        errors.push({ account_id: acc.account_id, error: explain(e) });
      }
    }
    if (activeByAccount.size === 0) return json({ ok: false, error: errors[0]?.error ?? "No se pudo sincronizar" }, 502);

    const activeIds = new Set(activeAds.map(a => a.id));

    // Conocidos que nunca se sincronizaron (llegaron por mensaje) y no están activos: se piden uno a uno
    // para traerles cuenta, campaña, conjunto, estado y miniatura. Tope por ejecución.
    const pendingIds = [...knownMap.entries()]
      .filter(([id, k]) => !activeIds.has(id) && !k.synced_at)
      .map(([id]) => id).slice(0, 40);
    const extra: MetaAd[] = [];
    await pool(pendingIds, 5, async id => { const ad = await getAd(id, token); if (ad) extra.push(ad); });

    // Ya sincronizados de una cuenta que sí se consultó con éxito y que ya no vienen como activos: se marcan inactivos.
    const stale = [...knownMap.entries()]
      .filter(([id, k]) => k.synced_at && !activeIds.has(id) && k.ad_account_id && activeByAccount.has(k.ad_account_id))
      .map(([id]) => id);
    if (stale.length) {
      await supabase.from("crm_wa_ad_sources").update({ effective_status: "INACTIVE" })
        .eq("user_id", user.id).in("source_id", stale);
    }

    let thumbsLeft = 60; // tope de descargas por ejecución
    await pool([...activeAds, ...extra], 6, async ad => {
      const needs = !knownMap.get(ad.id)?.thumbnail_data;
      let thumb: string | null = null;
      if (needs && thumbsLeft > 0) { thumbsLeft--; thumb = await fetchAdThumbnail(ad.creative?.thumbnail_url); }
      await saveMetaAd(supabase, user.id, ad, thumb);
    });

    return json({ ok: true, active: activeAds.length, completed: extra.length, marked_inactive: stale.length, errors });
  }

  return json({ error: "not_found" }, 404);
});
