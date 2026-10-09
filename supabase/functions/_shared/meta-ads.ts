/**
 * Marketing API — lectura de anuncios para atribución Click-to-WhatsApp.
 * Solo lectura (ads_read). El ID de anuncio que devuelve la API es el mismo
 * `source_id` del `referral` que Meta manda en el primer mensaje.
 */
import { encodeBase64 } from "https://deno.land/std@0.208.0/encoding/base64.ts";

const GRAPH = "https://graph.facebook.com/v21.0";

export const AD_FIELDS =
  "id,name,account_id,effective_status,campaign{id,name},adset{id,name},creative.thumbnail_width(300).thumbnail_height(300){thumbnail_url}";
// Respaldo si Meta rechaza los modificadores de tamaño de la miniatura.
const AD_FIELDS_PLAIN = "id,name,account_id,effective_status,campaign{id,name},adset{id,name},creative{thumbnail_url}";

export interface MetaAd {
  id: string;
  name?: string;
  account_id?: string;
  effective_status?: string;
  campaign?: { id: string; name?: string };
  adset?: { id: string; name?: string };
  creative?: { thumbnail_url?: string };
}

export class MetaApiError extends Error {
  constructor(message: string, public code?: number) { super(message); }
}

async function graphGet(path: string, token: string): Promise<any> {
  const res = await fetch(`${GRAPH}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.error) {
    throw new MetaApiError(body?.error?.message ?? `HTTP ${res.status}`, body?.error?.code);
  }
  return body;
}

/** Acepta "act_123", "123" o con espacios; devuelve solo los dígitos o null. */
export function normalizeAdAccountId(input: unknown): string | null {
  const digits = String(input ?? "").trim().replace(/^act_/i, "");
  return /^\d{5,30}$/.test(digits) ? digits : null;
}

/** Comprueba que el token ve la cuenta publicitaria. Lanza MetaApiError si no. */
export async function checkAdAccount(accountId: string, token: string): Promise<{ name: string }> {
  const r = await graphGet(`act_${accountId}?fields=name,account_status`, token);
  return { name: r.name ?? `act_${accountId}` };
}

/** Anuncios ACTIVE de la cuenta, con paginación (tope de seguridad de 10 páginas). */
export async function listActiveAds(accountId: string, token: string): Promise<MetaAd[]> {
  const out: MetaAd[] = [];
  const filter = encodeURIComponent(JSON.stringify(["ACTIVE"]));
  const q = (fields: string) => `act_${accountId}/ads?fields=${encodeURIComponent(fields)}&effective_status=${filter}&limit=100`;
  let page: any;
  try { page = await graphGet(q(AD_FIELDS), token); }
  catch (e) {
    if (e instanceof MetaApiError && e.code === 100) page = await graphGet(q(AD_FIELDS_PLAIN), token);
    else throw e;
  }
  for (let i = 0; i < 10; i++) {
    out.push(...((page.data ?? []) as MetaAd[]));
    const next: string | undefined = page.paging?.next;
    if (!next) break;
    const res = await fetch(next, { signal: AbortSignal.timeout(15000) });
    page = await res.json();
    if (!res.ok || page?.error) throw new MetaApiError(page?.error?.message ?? `HTTP ${res.status}`, page?.error?.code);
  }
  return out;
}

/** Un anuncio por ID (activo o no). null si Meta no lo devuelve o el token no lo ve. */
export async function getAd(adId: string, token: string): Promise<MetaAd | null> {
  try {
    return await graphGet(`${adId}?fields=${encodeURIComponent(AD_FIELDS)}`, token) as MetaAd;
  } catch (e) {
    if (e instanceof MetaApiError && e.code === 100) {
      try { return await graphGet(`${adId}?fields=${encodeURIComponent(AD_FIELDS_PLAIN)}`, token) as MetaAd; } catch { return null; }
    }
    return null;
  }
}

/** Descarga una miniatura como data URI (los enlaces de Meta caducan). null si falla. */
export async function fetchAdThumbnail(url: unknown): Promise<string | null> {
  try {
    if (typeof url !== "string" || !/^https:\/\//.test(url)) return null;
    const host = new URL(url).hostname;
    if (!/(^|\.)(fbcdn\.net|facebook\.com|fbsbx\.com|cdninstagram\.com)$/.test(host)) return null;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !type.startsWith("image/")) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.length === 0 || buf.length > 250_000) return null;
    return `data:${type};base64,${encodeBase64(buf)}`;
  } catch {
    return null;
  }
}

/**
 * Guarda un anuncio de Meta en crm_wa_ad_sources (y sus grupos campaña/conjunto)
 * SIN tocar label, product_id ni el producto de los grupos que el usuario ya eligió.
 */
// deno-lint-ignore no-explicit-any
export async function saveMetaAd(supabase: any, userId: string, ad: MetaAd, thumbnail: string | null) {
  const now = new Date().toISOString();
  const row: Record<string, unknown> = {
    user_id: userId,
    source_id: ad.id,
    ad_account_id: ad.account_id ?? null,
    ad_name: ad.name?.slice(0, 200) ?? null,
    campaign_id: ad.campaign?.id ?? null,
    campaign_name: ad.campaign?.name?.slice(0, 200) ?? null,
    adset_id: ad.adset?.id ?? null,
    adset_name: ad.adset?.name?.slice(0, 200) ?? null,
    effective_status: ad.effective_status ?? null,
    synced_at: now,
  };
  if (thumbnail) row.thumbnail_data = thumbnail;
  const { error } = await supabase.from("crm_wa_ad_sources").upsert(row, { onConflict: "user_id,source_id" });
  if (error) throw new Error(error.message);

  const groups = [
    ad.campaign?.id ? { user_id: userId, kind: "campaign", meta_id: ad.campaign.id, name: ad.campaign.name?.slice(0, 200) ?? null } : null,
    ad.adset?.id ? { user_id: userId, kind: "adset", meta_id: ad.adset.id, name: ad.adset.name?.slice(0, 200) ?? null } : null,
  ].filter(Boolean);
  if (groups.length) await supabase.from("crm_wa_ad_groups").upsert(groups, { onConflict: "user_id,meta_id" });
}

/**
 * Consulta un anuncio recién visto y lo enriquece. Nunca lanza: es un extra
 * que no debe frenar ni tumbar el procesamiento del mensaje.
 */
// deno-lint-ignore no-explicit-any
export async function enrichAdFromMeta(supabase: any, userId: string, adId: string, hasThumbnail: boolean) {
  try {
    const { data: cfg } = await supabase.from("crm_ai_agent_config")
      .select("access_token").eq("user_id", userId).maybeSingle();
    if (!cfg?.access_token) return;
    // Solo si el tenant conectó alguna cuenta publicitaria (si no, no usa esta función).
    const { count } = await supabase.from("crm_wa_ad_accounts")
      .select("id", { count: "exact", head: true }).eq("user_id", userId);
    if (!count) return;
    const ad = await getAd(adId, cfg.access_token);
    if (!ad) return;
    const thumb = hasThumbnail ? null : await fetchAdThumbnail(ad.creative?.thumbnail_url);
    await saveMetaAd(supabase, userId, ad, thumb);
  } catch (err) {
    console.error("[meta-ads] no se pudo enriquecer el anuncio", adId, err);
  }
}
