import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import FormPage from "./pages/FormPage.tsx";
import BookingPage from "./pages/BookingPage.tsx";
import Login from "./pages/Login.tsx";
import Crm from "./pages/Crm.tsx";
import CrmSetup from "./pages/CrmSetup.tsx";
import NotFound from "./pages/NotFound.tsx";
import TerminosPoliticas from "./pages/TerminosPoliticas.tsx";
import ProtectedRoute from "./components/shared/ProtectedRoute.tsx";
import GoogleCalendarCallback from "./pages/GoogleCalendarCallback.tsx";
import CourseAccess from "./pages/CourseAccess.tsx";
import CoursePlayer from "./pages/CoursePlayer.tsx";
import WebsitesCatalog from "./pages/websites/WebsitesCatalog.tsx";
import WebsiteViewer from "./pages/websites/WebsiteViewer.tsx";
import ClaseGratisTreeServiceGame from "./pages/ClaseGratisTreeServiceGame.tsx";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
