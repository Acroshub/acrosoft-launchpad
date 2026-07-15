import { lazy, Suspense } from "react";
import { useParams, Navigate } from "react-router-dom";

const SITES: Record<string, React.LazyExoticComponent<() => JSX.Element>> = {
  "rivera-tree-experts": lazy(() => import("./sites/RiveraTreeExperts")),
  "lopez-painting-drywall": lazy(() => import("./sites/LopezPainting")),
  "el-sol-roofing":         lazy(() => import("./sites/ElSolRoofing")),
  "bella-shine-cleaning":   lazy(() => import("./sites/BellaShine")),
  "luna-beauty-studio":     lazy(() => import("./sites/LunaBeauty")),
  "sun-aired-bag":          lazy(() => import("./sites/SunAiredBag")),
  "sun-aired-bag-ecom":     lazy(() => import("./sites/SunAiredBagEcom")),
  "gonzales":               lazy(() => import("./sites/GonzalesLandscaping")),
  "gonzales-2":             lazy(() => import("./sites/GonzalesLandscaping2")),
  "ledesma":                lazy(() => import("./sites/LedesmaCleaning")),
};

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
        <div className="text-white/40 text-sm">Loading...</div>
      </div>
    </div>
  );
}

export default function WebsiteViewer() {
  const { slug } = useParams<{ slug: string }>();
  const Site = slug ? SITES[slug] : undefined;

  if (!Site) return <Navigate to="/websites" replace />;

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Site />
    </Suspense>
  );
}
