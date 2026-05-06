import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/hooks/useLanguage";
import Index from "./pages/Index.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import FormPage from "./pages/FormPage.tsx";
import BookingPage from "./pages/BookingPage.tsx";
import Login from "./pages/Login.tsx";
import Crm from "./pages/Crm.tsx";
import CrmSetup from "./pages/CrmSetup.tsx";
import NotFound from "./pages/NotFound.tsx";
import TerminosPoliticas from "./pages/TerminosPoliticas.tsx";
import ProtectedRoute from "./components/shared/ProtectedRoute.tsx";
import GoogleCalendarCallback from "./pages/GoogleCalendarCallback.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/"              element={<Index />} />
          <Route path="/onboarding"    element={<Onboarding />} />
          <Route path="/login"         element={<Login />} />
          <Route path="/f/:formId"     element={<FormPage />} />
          <Route path="/book/:calendarId" element={<BookingPage />} />
          <Route path="/terminos_y_politicas_de_privacidad" element={<TerminosPoliticas />} />
          <Route path="/privacy" element={<TerminosPoliticas />} />
          <Route path="/terms"   element={<TerminosPoliticas />} />
          <Route path="/oauth/google-calendar" element={<GoogleCalendarCallback />} />

          {/* Client invitation setup — public (session comes from invite link) */}
          <Route path="/crm-setup" element={<CrmSetup />} />

          {/* Protected routes */}
          <Route path="/crm" element={<ProtectedRoute><Crm /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
