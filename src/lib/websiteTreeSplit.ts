import { uuid } from "@/lib/uuid";

// Split test de /website-tree: la landing normal y la gamificada (/website-tree-game) se reparten el tráfico 50/50 en la MISMA URL, sin redirigir.
// Cada visitante queda con la versión que le tocó (localStorage) para que no vea una y, al volver, la otra. La versión viaja al servidor para etiquetar
// el lead (website-tree-v-normal / website-tree-v-game), se cuenta la visita única en Supabase y va como parámetro en los eventos del pixel.
//
// `?v=normal` o `?v=game` fuerzan una versión para previsualizarla: esa visita NO se guarda, NO se cuenta y NO etiqueta (no ensucia el test).

export type WebsiteTreeVariant = "normal" | "game";

export interface WebsiteTreeSplit {
  variant: WebsiteTreeVariant;
  /** uuid del visitante (guardado en su navegador). */
  visitorId: string;
}

export const WEBSITE_TREE_SPLIT_KEY = "wt_split_v1";

const isVariant = (v: unknown): v is WebsiteTreeVariant => v === "normal" || v === "game";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Decide qué versión ve esta persona. `forced` = vista previa con `?v=`: no cuenta para el test.
 * Si el navegador no deja guardar (modo privado, storage bloqueado), igual se reparte 50/50 en cada carga; el visitante se cuenta una vez por carga.
 */
export function resolveWebsiteTreeSplit(
  search: string = typeof window === "undefined" ? "" : window.location.search,
  random: () => number = Math.random,
): { variant: WebsiteTreeVariant; split: WebsiteTreeSplit | null } {
  const forced = new URLSearchParams(search).get("v");
  if (isVariant(forced)) return { variant: forced, split: null };

  try {
    const saved = JSON.parse(localStorage.getItem(WEBSITE_TREE_SPLIT_KEY) ?? "null") as Partial<WebsiteTreeSplit> | null;
    if (saved && isVariant(saved.variant) && typeof saved.visitorId === "string" && UUID_RE.test(saved.visitorId)) {
      return { variant: saved.variant, split: { variant: saved.variant, visitorId: saved.visitorId } };
    }
  } catch { /* sin storage o JSON roto: se sortea de nuevo */ }

  const split: WebsiteTreeSplit = { variant: random() < 0.5 ? "normal" : "game", visitorId: uuid() };
  try { localStorage.setItem(WEBSITE_TREE_SPLIT_KEY, JSON.stringify(split)); } catch { /* sin storage: no pasa nada */ }
  return { variant: split.variant, split };
}

/** Cuenta la visita única en Supabase (un mismo visitorId no se repite). Nunca lanza: contar no puede romper la página. */
export function trackWebsiteTreeVisit(split: WebsiteTreeSplit, fn: string): void {
  fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fn}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
    body: JSON.stringify({ action: "visit", variant: split.variant, visitor_id: split.visitorId }),
  }).catch(() => { /* no crítico */ });
}
