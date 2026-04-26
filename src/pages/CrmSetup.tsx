import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

/**
 * /crm-setup
 *
 * Landing page for new SaaS clients arriving from an invitation email.
 * Supabase's invite flow automatically creates a session before redirecting here,
 * so the user is already authenticated — they just need to set a password.
 */
const CrmSetup = () => {
  const navigate = useNavigate();

  const [password, setPassword]       = useState("");
  const [confirm, setConfirm]         = useState("");
  const [showPw, setShowPw]           = useState(false);
  const [loading, setLoading]         = useState(false);
  const [done, setDone]               = useState(false);
  const [error, setError]             = useState("");
  const [userEmail, setUserEmail]     = useState("");

  // On mount, confirm there's an active session (from invite link)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        // No session — invalid or expired link
        navigate("/login");
      } else {
        setUserEmail(data.session.user.email ?? "");
      }
    });
  }, [navigate]);

  const isValid =
    password.length >= 8 &&
    password === confirm;

  const handleSubmit = async () => {
    if (!isValid) return;
    setError("");
    setLoading(true);

    try {
      // 1. Set the new password
      const { error: pwErr } = await supabase.auth.updateUser({ password });
      if (pwErr) throw pwErr;

      // 2. Activate account based on invitation type
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const accountType = user.user_metadata?.account_type;

        if (accountType === "staff") {
          // Link this auth user to the crm_staff row via SECURITY DEFINER RPC
          const { error: rpcErr } = await supabase.rpc("activate_staff_invitation");
          if (rpcErr) console.error("activate_staff_invitation (non-fatal):", rpcErr);
        } else {
          // Default: SaaS client activation
          await supabase
            .from("crm_client_accounts")
            .update({ status: "active" })
            .eq("client_user_id", user.id)
            .eq("status", "pending");
        }
      }

      setDone(true);
      setTimeout(() => navigate("/crm"), 2500);
    } catch (err) {
      setError((err as Error).message ?? "Error al establecer la contraseña");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-secondary/20 flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <CheckCircle2 size={48} className="mx-auto text-emerald-500" />
          <h1 className="text-lg font-semibold">¡Listo! Cuenta activada</h1>
          <p className="text-sm text-muted-foreground">
            Tu contraseña fue establecida correctamente. Te estamos redirigiendo a tu CRM...
          </p>
          <Loader2 size={18} className="animate-spin mx-auto text-muted-foreground/50" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/20 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-semibold">Configura tu contraseña</h1>
          <p className="text-sm text-muted-foreground">
            {userEmail ? (
              <>Bienvenido/a. Establece una contraseña para <span className="font-medium text-foreground">{userEmail}</span></>
            ) : (
              "Establece tu contraseña para acceder al CRM."
            )}
          </p>
        </div>

        <div className="bg-card border rounded-2xl p-8 shadow-sm space-y-5">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Nueva contraseña <span className="text-muted-foreground/50">(mín. 8 caracteres)</span>
              </label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 pr-10"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Confirmar contraseña
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && isValid && handleSubmit()}
                className={`h-10 ${confirm && confirm !== password ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              {confirm && confirm !== password && (
                <p className="text-[11px] text-destructive mt-1">Las contraseñas no coinciden</p>
              )}
            </div>
          </div>

          {error && (
            <p className="text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!isValid || loading}
            className="w-full h-10 rounded-xl font-medium"
          >
            {loading ? (
              <><Loader2 size={14} className="animate-spin mr-2" /> Guardando...</>
            ) : (
              "Activar cuenta"
            )}
          </Button>
        </div>

        <p className="text-center text-[10px] text-muted-foreground/40 uppercase tracking-widest">
          Acrosoft Labs · Acceso seguro
        </p>
      </div>
    </div>
  );
};

export default CrmSetup;
