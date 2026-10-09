import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ImageOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Anuncios Click-to-WhatsApp. Se traen de la Marketing API de Meta (cuenta publicitaria
// conectada) y también se registran solos cuando alguien escribe desde uno. Aquí se les
// asigna el producto que el agente debe vender: por anuncio, o por campaña / conjunto
// (los anuncios lo heredan; la asignación directa del anuncio manda).

interface AdSource {
  id: string;
  source_id: string;
  headline: string | null;
  label: string | null;
  ad_name: string | null;
  product_id: string | null;
  thumbnail_data: string | null;
  campaign_id: string | null;
  campaign_name: string | null;
  adset_id: string | null;
  adset_name: string | null;
  effective_status: string | null;
  last_seen_at: string;
}

interface AdGroup {
  id: string;
  kind: "campaign" | "adset";
  meta_id: string;
  name: string | null;
  product_id: string | null;
}

type Product = { id: string; name: string };
type AdAccount = { id: string; account_id: string; name: string | null };

async function callSync(action: string, body: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-ads-sync?action=${action}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return await res.json().catch(() => ({ ok: false, error: "Respuesta inválida del servidor" })) as
    { ok?: boolean; error?: string; name?: string; active?: number; completed?: number; errors?: { account_id: string; error: string }[] };
}

export default function CrmWaAdSources() {
  const { user } = useCurrentUser();
  const qc = useQueryClient();
  const userId = user?.id;
  const [tab, setTab] = useState<string>("none");
  const [showInactive, setShowInactive] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["wa-ad-sources", userId] });
    qc.invalidateQueries({ queryKey: ["wa-ad-groups", userId] });
  };

  const { data: ads = [], isLoading } = useQuery({
    queryKey: ["wa-ad-sources", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_wa_ad_sources")
        .select("id, source_id, headline, label, ad_name, product_id, thumbnail_data, campaign_id, campaign_name, adset_id, adset_name, effective_status, last_seen_at")
        .eq("user_id", userId!)
        .order("last_seen_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AdSource[];
    },
  });

  const { data: groups = [] } = useQuery({
    queryKey: ["wa-ad-groups", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("crm_wa_ad_groups").select("id, kind, meta_id, name, product_id").eq("user_id", userId!);
      return (data ?? []) as AdGroup[];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["wa-ad-sources-products", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("crm_products").select("id, name").eq("user_id", userId!).order("name");
      return (data ?? []) as Product[];
    },
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["wa-ad-accounts", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("crm_wa_ad_accounts").select("id, account_id, name").eq("user_id", userId!).order("created_at");
      return (data ?? []) as AdAccount[];
    },
  });
  const connected = accounts.length > 0;

  const groupByMetaId = useMemo(() => new Map(groups.map(g => [g.meta_id, g])), [groups]);
  const knownProducts = useMemo(() => new Set(products.map(p => p.id)), [products]);
  const validProduct = (id: string | null | undefined) => (id && knownProducts.has(id) ? id : null);

  // Producto efectivo: el del anuncio; si no, el de su conjunto; si no, el de su campaña.
  const inheritedOf = (ad: AdSource) =>
    validProduct(groupByMetaId.get(ad.adset_id ?? "")?.product_id) ?? validProduct(groupByMetaId.get(ad.campaign_id ?? "")?.product_id);
  const productOf = (ad: AdSource) => validProduct(ad.product_id) ?? inheritedOf(ad);

  // Con la cuenta conectada solo se muestran los activos (los nunca sincronizados, estado null, también).
  const shown = ads.filter(a => !connected || showInactive || !a.effective_status || a.effective_status === "ACTIVE");
  const hiddenCount = ads.length - shown.length;

  const tabs = [
    { id: "none", label: "Sin producto", count: shown.filter(a => !productOf(a)).length },
    ...products.map(p => ({ id: p.id, label: p.name, count: shown.filter(a => productOf(a) === p.id).length })),
  ];
  const visible = shown.filter(a => (tab === "none" ? !productOf(a) : productOf(a) === tab));

  // campaña → conjunto → anuncios
  const tree = (() => {
    const campaigns = new Map<string, { name: string; adsets: Map<string, { name: string; ads: AdSource[] }> }>();
    for (const ad of visible) {
      const cKey = ad.campaign_id ?? "_none";
      const aKey = ad.adset_id ?? "_none";
      if (!campaigns.has(cKey)) campaigns.set(cKey, { name: ad.campaign_name ?? "Sin campaña", adsets: new Map() });
      const c = campaigns.get(cKey)!;
      if (!c.adsets.has(aKey)) c.adsets.set(aKey, { name: ad.adset_name ?? "Sin conjunto", ads: [] });
      c.adsets.get(aKey)!.ads.push(ad);
    }
    return campaigns;
  })();

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-muted-foreground" size={18} /></div>;

  return (
    <div className="space-y-4">
      <AccountCard
        userId={userId}
        accounts={accounts}
        showInactive={showInactive}
        onToggleInactive={setShowInactive}
        hiddenCount={hiddenCount}
        onChanged={() => { qc.invalidateQueries({ queryKey: ["wa-ad-accounts", userId] }); refresh(); }}
      />

      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              tab === t.id
                ? "bg-foreground text-background border-foreground"
                : "bg-card text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            {t.label}
            <span className={`tabular-nums ${tab === t.id ? "opacity-70" : "text-muted-foreground/70"}`}>{t.count}</span>
          </button>
        ))}
      </div>

      {!connected && (
        <NewAdForm userId={userId} products={products} defaultProductId={tab === "none" ? "" : tab} onSaved={refresh} />
      )}

      {visible.length === 0 && (
        <p className="text-sm text-muted-foreground py-6 text-center">
          {tab !== "none"
            ? "Ningún anuncio vinculado a este producto todavía."
            : ads.length === 0
              ? connected
                ? "Pulsa «Sincronizar» para traer tus anuncios activos."
                : "Conecta tu cuenta publicitaria, o agrega anuncios con su ID. También aparecerán solos cuando alguien te escriba tras hacer clic en uno."
              : "Todos tus anuncios ya tienen producto."}
        </p>
      )}

      {[...tree.entries()].map(([cKey, c]) => {
        const cGroup = groupByMetaId.get(cKey);
        return (
          <section key={cKey} className="space-y-2">
            <GroupHeader title={c.name} kind="Campaña" group={cGroup} products={products} onSaved={refresh} />
            <div className="space-y-2 pl-3 border-l border-border">
              {[...c.adsets.entries()].map(([aKey, a]) => {
                const aGroup = groupByMetaId.get(aKey);
                return (
                  <div key={aKey} className="space-y-2">
                    <GroupHeader title={a.name} kind="Conjunto" group={aGroup} products={products} onSaved={refresh} small />
                    {a.ads.map(ad => (
                      <AdCard
                        key={ad.id}
                        ad={ad}
                        products={products}
                        inheritedName={products.find(p => p.id === inheritedOf(ad))?.name ?? null}
                        onSaved={refresh}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function AccountCard({ userId, accounts, showInactive, onToggleInactive, hiddenCount, onChanged }: {
  userId?: string; accounts: AdAccount[]; showInactive: boolean; onToggleInactive: (v: boolean) => void;
  hiddenCount: number; onChanged: () => void;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  const reportSync = (r: Awaited<ReturnType<typeof callSync>>) => {
    if (!r.ok) { toast.error(r.error ?? "No se pudo sincronizar"); return; }
    for (const e of r.errors ?? []) toast.error(`act_${e.account_id}: ${e.error}`);
    toast.success(`${r.active ?? 0} anuncios activos sincronizados`);
  };

  const connect = async () => {
    if (!value.trim()) return;
    setBusy(true);
    const r = await callSync("connect", { ad_account_id: value });
    if (!r.ok) { setBusy(false); toast.error(r.error ?? "No se pudo conectar"); return; }
    toast.success(`Cuenta conectada: ${r.name}`);
    setValue("");
    reportSync(await callSync("sync"));
    setBusy(false);
    onChanged();
  };

  const sync = async () => {
    setBusy(true);
    reportSync(await callSync("sync"));
    setBusy(false);
    onChanged();
  };

  const disconnect = async (accountId: string) => {
    setBusy(true);
    await callSync("disconnect", { ad_account_id: accountId });
    setBusy(false);
    onChanged();
  };

  const addForm = (
    <div className="flex gap-2">
      <Input
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder={accounts.length ? "Agregar otra cuenta (act_…)" : "ID de la cuenta publicitaria (act_…)"}
        inputMode="numeric"
        disabled={busy || !userId}
      />
      <Button onClick={connect} disabled={busy || !value.trim()} variant={accounts.length ? "outline" : "default"}>
        {busy ? <Loader2 size={14} className="animate-spin" /> : accounts.length ? "Agregar" : "Conectar"}
      </Button>
    </div>
  );

  if (!accounts.length) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div>
          <p className="text-sm font-medium">Conecta tu cuenta publicitaria</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Así verás tus anuncios activos con su miniatura, ordenados por campaña y conjunto, y podrás asignarles producto antes de que
            llegue el primer mensaje. Usa el mismo token de usuario del sistema de la conexión; necesita el permiso <b>ads_read</b> y las
            cuentas publicitarias asignadas a ese usuario. Puedes conectar varias.
          </p>
        </div>
        {addForm}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-xs text-muted-foreground flex-1 min-w-[10rem]">
          {accounts.length === 1 ? "Cuenta publicitaria" : `${accounts.length} cuentas publicitarias`}
        </p>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={showInactive} onChange={e => onToggleInactive(e.target.checked)} />
          Ver inactivos{hiddenCount > 0 && !showInactive ? ` (${hiddenCount})` : ""}
        </label>
        <Button size="sm" variant="outline" onClick={sync} disabled={busy}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <><RefreshCw size={13} className="mr-1.5" />Sincronizar</>}
        </Button>
      </div>
      <ul className="space-y-1">
        {accounts.map(a => (
          <li key={a.id} className="flex items-center gap-2 text-xs">
            <span className="flex-1 min-w-0 truncate">
              <span className="font-medium">{a.name ?? "Cuenta"}</span>
              <span className="text-muted-foreground"> · act_{a.account_id}</span>
            </span>
            <button
              type="button"
              onClick={() => disconnect(a.account_id)}
              disabled={busy}
              className="text-muted-foreground hover:text-destructive transition-colors"
              aria-label={`Quitar act_${a.account_id}`}
            >
              Quitar
            </button>
          </li>
        ))}
      </ul>
      {addForm}
    </div>
  );
}

// Producto por campaña o conjunto: todos sus anuncios lo heredan salvo que tengan uno propio.
function GroupHeader({ title, kind, group, products, onSaved, small }: {
  title: string; kind: string; group?: AdGroup; products: Product[]; onSaved: () => void; small?: boolean;
}) {
  const save = async (productId: string) => {
    if (!group) return;
    const { error } = await supabase.from("crm_wa_ad_groups").update({ product_id: productId || null }).eq("id", group.id);
    if (error) { toast.error("No se pudo guardar"); return; }
    onSaved();
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{kind}</p>
        <p className={`truncate ${small ? "text-xs font-medium" : "text-sm font-semibold"}`}>{title}</p>
      </div>
      {group && (
        <select
          value={group.product_id ?? ""}
          onChange={e => save(e.target.value)}
          className="h-9 max-w-[45%] rounded-md border border-input bg-background px-2 text-base md:text-xs"
          aria-label={`Producto de toda la ${kind.toLowerCase()}`}
        >
          <option value="">Producto de toda la {kind.toLowerCase()}…</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}
    </div>
  );
}

// Alta manual por ID, para cuando no hay cuenta publicitaria conectada.
function NewAdForm({ userId, products, defaultProductId, onSaved }: { userId?: string; products: Product[]; defaultProductId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [sourceId, setSourceId] = useState("");
  const [label, setLabel] = useState("");
  const [productId, setProductId] = useState("");
  const [saving, setSaving] = useState(false);

  const add = async () => {
    const id = sourceId.trim();
    if (!userId) return;
    if (!/^\d{5,30}$/.test(id)) { toast.error("El ID del anuncio son solo números"); return; }
    if (!productId) { toast.error("Elige el producto de este anuncio"); return; }
    setSaving(true);
    const { error } = await supabase.from("crm_wa_ad_sources").insert({
      user_id: userId, source_id: id, label: label.trim() || null, product_id: productId,
    });
    setSaving(false);
    if (error) {
      toast.error(error.code === "23505" ? "Ese anuncio ya está en la lista" : "No se pudo guardar");
      return;
    }
    toast.success("Anuncio agregado");
    setSourceId(""); setLabel(""); setProductId(""); setOpen(false);
    onSaved();
  };

  if (!open) return <Button size="sm" variant="outline" onClick={() => { setProductId(defaultProductId); setOpen(true); }}>Agregar anuncio por ID</Button>;

  return (
    <div className="rounded-xl border border-dashed border-border p-4 space-y-3">
      <p className="text-xs text-muted-foreground">
        Copia el ID del anuncio en el Administrador de anuncios de Meta (es el anuncio, no la campaña ni el conjunto de anuncios).
      </p>
      <Input value={sourceId} onChange={e => setSourceId(e.target.value)} placeholder="ID del anuncio" inputMode="numeric" />
      <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Nombre interno (opcional)" maxLength={80} />
      <select
        value={productId}
        onChange={e => setProductId(e.target.value)}
        className="w-full h-10 rounded-md border border-input bg-background px-3 text-base md:text-sm"
      >
        <option value="">Elige el producto…</option>
        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <div className="flex gap-2">
        <Button size="sm" onClick={add} disabled={saving}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : "Agregar"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </div>
  );
}

function AdCard({ ad, products, inheritedName, onSaved }: { ad: AdSource; products: Product[]; inheritedName: string | null; onSaved: () => void }) {
  const [label, setLabel] = useState(ad.label ?? "");
  const [productId, setProductId] = useState(ad.product_id ?? "");
  const [saving, setSaving] = useState(false);

  const dirty = label !== (ad.label ?? "") || productId !== (ad.product_id ?? "");

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("crm_wa_ad_sources").update({
      label: label.trim() || null,
      product_id: productId || null,
    }).eq("id", ad.id);
    setSaving(false);
    if (error) { toast.error("No se pudo guardar"); return; }
    toast.success("Anuncio actualizado");
    onSaved();
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3 flex gap-3 items-start">
      {ad.thumbnail_data ? (
        <img src={ad.thumbnail_data} alt="" className="w-20 h-20 rounded-lg object-cover shrink-0 bg-secondary" />
      ) : (
        <div
          className="w-20 h-20 rounded-lg bg-secondary shrink-0 flex items-center justify-center"
          title={ad.ad_name ?? ad.headline ?? `ID ${ad.source_id}`}
        >
          <ImageOff size={20} className="text-muted-foreground/50" />
        </div>
      )}
      <div className="flex-1 min-w-0 space-y-2">
        <Input value={label} onChange={e => setLabel(e.target.value)} placeholder={ad.ad_name ?? "Nombre interno"} maxLength={80} />
        <select
          value={productId}
          onChange={e => setProductId(e.target.value)}
          className="w-full h-10 rounded-md border border-input bg-background px-3 text-base md:text-sm"
        >
          <option value="">{inheritedName ? `Heredado: ${inheritedName}` : "Sin producto asignado"}</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {dirty && (
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : "Guardar"}
          </Button>
        )}
      </div>
    </div>
  );
}
