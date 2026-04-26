import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";
import AcrosoftLogo from "@/components/shared/AcrosoftLogo";
import { signIn } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [forgotMode, setForgotMode]     = useState(false);
  const [resetSent, setResetSent]       = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);

    const { error: authError } = await signIn(email, password);

    if (authError) {
      setError("Email o contraseña incorrectos.");
      setLoading(false);
      return;
    }

    navigate("/crm");
  };

  const handleResetPassword = async () => {
    if (!email) return;
    setError("");
    setLoading(true);

    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/crm-setup`,
    });

    setLoading(false);
    if (resetErr) {
      setError("No se pudo enviar el correo. Verifica el email e intenta de nuevo.");
    } else {
      setResetSent(true);
    }
  };

  if (forgotMode) {
    return (
      <div className="min-h-screen bg-secondary/20 flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex flex-col items-center gap-2">
            <AcrosoftLogo size="md" />
            <p className="text-sm text-muted-foreground mt-2">Recuperar contraseña</p>
          </div>

          <div className="bg-card border rounded-2xl p-8 shadow-sm space-y-5">
            {resetSent ? (
              <div className="text-center space-y-3 py-2">
                <CheckCircle2 size={36} className="mx-auto text-emerald-500" />
                <p className="text-sm font-medium">Correo enviado</p>
                <p className="text-xs text-muted-foreground">
                  Revisa tu bandeja de entrada en <span className="font-medium text-foreground">{email}</span> y sigue el enlace para establecer una nueva contraseña.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <h1 className="text-base font-semibold">¿Olvidaste tu contraseña?</h1>
                  <p className="text-xs text-muted-foreground">Te enviaremos un enlace para restablecerla.</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email</label>
                  <Input
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && email && handleResetPassword()}
                    className="h-10"
                    autoFocus
                  />
                </div>

                {error && (
                  <p className="text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <Button
                  onClick={handleResetPassword}
                  disabled={loading || !email}
                  className="w-full h-10 rounded-xl font-medium"
                >
                  {loading ? "Enviando..." : "Enviar enlace"}
                </Button>
              </>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground">
            <button
              type="button"
              onClick={() => { setForgotMode(false); setResetSent(false); setError(""); }}
              className="hover:text-foreground transition-colors"
            >
              ← Volver al inicio de sesión
            </button>
          </p>

          <p className="text-center text-[10px] text-muted-foreground/40 uppercase tracking-widest">
            Acrosoft Labs · Acceso seguro
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/20 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-2">
          <AcrosoftLogo size="md" />
          <p className="text-sm text-muted-foreground mt-2">Accede a tu panel</p>
        </div>

        <div className="bg-card border rounded-2xl p-8 shadow-sm space-y-5">
          <div className="space-y-1">
            <h1 className="text-base font-semibold">Iniciar sesión</h1>
            <p className="text-xs text-muted-foreground">Ingresa tus credenciales para continuar.</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email</label>
              <Input
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="h-10"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-muted-foreground">Contraseña</label>
                <button
                  type="button"
                  onClick={() => { setForgotMode(true); setError(""); }}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button
            onClick={handleLogin}
            disabled={loading || !email || !password}
            className="w-full h-10 rounded-xl font-medium"
          >
            {loading ? "Verificando..." : "Ingresar"}
          </Button>
        </div>

        <p className="text-center text-[10px] text-muted-foreground/40 uppercase tracking-widest">
          Acrosoft Labs · Acceso seguro
        </p>
      </div>
    </div>
  );
};

export default Login;
