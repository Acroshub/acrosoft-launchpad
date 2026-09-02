import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ProtectedRoute from "./components/shared/ProtectedRoute.tsx";

// Rutas del camino crítico: se cargan con el bundle de entrada.
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import FormPage from "./pages/FormPage.tsx";
import BookingPage from "./pages/BookingPage.tsx";
import NotFound from "./pages/NotFound.tsx";

// Todo lo demás baja bajo demanda. El CRM arrastra consigo recharts, @dnd-kit,
// tus-js-client, papaparse y emoji-mart, que solo se usan dentro de components/crm.
const Crm = lazy(() => import("./pages/Crm.tsx"));
const CrmSetup = lazy(() => import("./pages/CrmSetup.tsx"));
const TerminosPoliticas = lazy(() => import("./pages/TerminosPoliticas.tsx"));
const GoogleCalendarCallback = lazy(() => import("./pages/GoogleCalendarCallback.tsx"));
const CourseAccess = lazy(() => import("./pages/CourseAccess.tsx"));
const CoursePlayer = lazy(() => import("./pages/CoursePlayer.tsx"));
const WebsitesCatalog = lazy(() => import("./pages/websites/WebsitesCatalog.tsx"));
const WebsiteViewer = lazy(() => import("./pages/websites/WebsiteViewer.tsx"));
const ClaseGratisTreeServiceGame = lazy(() => import("./pages/ClaseGratisTreeServiceGame.tsx"));
const LlamadasAcros = lazy(() => import("./pages/LlamadasAcros.tsx"));
const LlamadasAcrosGracias = lazy(() => import("./pages/LlamadasAcrosGracias.tsx"));

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
});

/** Mismo tratamiento visual que ProtectedRoute, para que no haya salto de layout. */
const RouteFallback = () => (
  <div className="h-screen flex items-center justify-center bg-background">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* Public routes */}
            <Route path="/"              element={<Index />} />
            <Route path="/login"         element={<Login />} />
            <Route path="/f/:formId"     element={<FormPage />} />
            <Route path="/book/:calendarId" element={<BookingPage />} />
            <Route path="/terminos_y_politicas_de_privacidad" element={<TerminosPoliticas />} />
            <Route path="/privacy" element={<TerminosPoliticas />} />
            <Route path="/terms"   element={<TerminosPoliticas />} />
            <Route path="/oauth/google-calendar" element={<GoogleCalendarCallback />} />
            <Route path="/clase-gratis-tree-service-game" element={<ClaseGratisTreeServiceGame />} />
            <Route path="/llamadas-acros" element={<LlamadasAcros />} />
            <Route path="/llamadas-acros-gracias" element={<LlamadasAcrosGracias />} />

            {/* Client invitation setup — public (session comes from invite link) */}
            <Route path="/crm-setup" element={<CrmSetup />} />

            {/* Protected routes */}
            <Route path="/crm" element={<ProtectedRoute><Crm /></ProtectedRoute>} />

            {/* Curso — gate de acceso y player (públicos, sin auth Supabase) */}
            <Route path="/curso/:tenantSlug/:courseSlug"      element={<CourseAccess />} />
            <Route path="/curso/:tenantSlug/:courseSlug/ver"  element={<CoursePlayer />} />

            {/* Public websites portfolio */}
            <Route path="/websites" element={<WebsitesCatalog />} />
            <Route path="/websites/:slug" element={<WebsiteViewer />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
