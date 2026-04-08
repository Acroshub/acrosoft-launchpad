import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useAuth";

/**
 * Wraps protected routes. Redirects to /login if the user is not authenticated.
 * Shows a loading screen while the session is being verified.
 */
const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useCurrentUser();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
