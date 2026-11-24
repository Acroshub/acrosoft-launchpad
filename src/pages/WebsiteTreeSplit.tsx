import { Suspense, lazy, useEffect, useState } from "react";
import { isEstimadosPreview } from "@/lib/estimadosPreview";
import { WEBSITE_TREE_FN } from "@/lib/websiteTreeConfig";
import { resolveWebsiteTreeSplit, trackWebsiteTreeVisit } from "@/lib/websiteTreeSplit";

// /website-tree — SPLIT TEST (2026-11-24): la landing normal y la gamificada se reparten el tráfico 50/50 en la misma URL, sin redirigir. Solo se descarga
// el código de la versión que le tocó a la persona. La versión se recuerda en el navegador; cada lead queda etiquetado con website-tree-v-normal / -v-game
// y cada visitante único se cuenta en Supabase (vista website_tree_split_stats). `?v=normal` / `?v=game` fuerzan una versión sin contar. Cada versión
// sigue disponible por separado: la gamificada en /website-tree-game (sin etiqueta de versión) y la normal con /website-tree?v=normal.
const WebsiteTree = lazy(() => import("./WebsiteTree.tsx"));
const WebsiteTreeGame = lazy(() => import("./WebsiteTreeGame.tsx"));

const IS_DEMO = isEstimadosPreview();

const WebsiteTreeSplit = () => {
  const [{ variant, split }] = useState(() => resolveWebsiteTreeSplit());

  useEffect(() => {
    if (split && !IS_DEMO) trackWebsiteTreeVisit(split, WEBSITE_TREE_FN);
  }, [split]);

  const Page = variant === "game" ? WebsiteTreeGame : WebsiteTree;
  return <Suspense fallback={null}><Page split={split ?? undefined} /></Suspense>;
};

export default WebsiteTreeSplit;
