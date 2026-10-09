/**
 * Producto de un anuncio Click-to-WhatsApp.
 * Orden: producto del anuncio → de su conjunto → de su campaña.
 * Lo usan el agente (prompt, flujos, etiquetas) y el envío de eventos a Meta, para que todos coincidan.
 */
// deno-lint-ignore no-explicit-any
export async function resolveAdProduct(supabase: any, userId: string, adSourceId: string | null | undefined): Promise<{
  productId: string | null; label: string | null;
}> {
  if (!adSourceId) return { productId: null, label: null };
  const { data: adSrc } = await supabase
    .from("crm_wa_ad_sources")
    .select("label, ad_name, product_id, adset_id, campaign_id")
    .eq("user_id", userId)
    .eq("source_id", adSourceId)
    .maybeSingle();
  if (!adSrc) return { productId: null, label: null };
  let productId: string | null = adSrc.product_id ?? null;
  if (!productId) {
    const groupIds = [adSrc.adset_id, adSrc.campaign_id].filter(Boolean) as string[];
    if (groupIds.length) {
      const { data: groups } = await supabase.from("crm_wa_ad_groups")
        .select("meta_id, product_id").eq("user_id", userId).in("meta_id", groupIds);
      // deno-lint-ignore no-explicit-any
      const byId = new Map((groups ?? []).map((g: any) => [g.meta_id, g.product_id as string | null]));
      productId = (byId.get(adSrc.adset_id ?? "") ?? byId.get(adSrc.campaign_id ?? "") ?? null) as string | null;
    }
  }
  return { productId, label: adSrc.label || adSrc.ad_name || null };
}
