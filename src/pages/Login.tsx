import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import AcrosoftLogo from "@/components/shared/AcrosoftLogo";

// {VAR_DB} — La lógica de autenticación real se conectará a Supabase Auth.
// El rol del usuario (admin / client) y el slug del negocio vendrán del perfil en la DB.
// Por ahora se simula con credenciales hardcodeadas para demostración.

const MOCK_USERS = [
  { email: "admin@acrosoft.com", password: "admin123", role: "admin", slug: null },
  { email: "cliente@negocio.com", password: "cliente123", role: "client", slug: "mi-negocio" },
];

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setError("");
    setLoading(true);

    // {VAR_DB} — reemplazar con llamada real a Supabase Auth
    setTimeout(() => {
      const user = MOCK_USERS.find(
        (u) => u.email === email && u.password === password
      );

      if (!user) {
        setError("Email o contraseña incorrectos.");
        setLoading(false);
        return;
      }

      if (user.role === "admin") {
        navigate("/admin");
      } else {
        navigate(`/${user.slug}`);
      }

      setLoading(false);
    }, 600);
  };

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
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Contraseña</label>
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
