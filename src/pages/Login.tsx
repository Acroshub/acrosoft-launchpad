import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Check, ArrowRight, CalendarDays, Sparkles, TrendingUp } from "lucide-react";
import AcrosoftLogo from "@/components/shared/AcrosoftLogo";
import { signIn } from "@/hooks/useAuth";

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
    try {
      const dbUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const res = await fetch(`${dbUrl}/functions/v1/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": anonKey },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error");
      setResetSent(true);
    } catch {
      setError("No se pudo enviar el correo. Intenta de nuevo en unos minutos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-opensans">

      {/* ── Panel izquierdo — branding (solo desktop) ── */}
      <div className="hidden lg:flex lg:w-[48%] xl:w-[45%] flex-col items-start justify-center gap-6 p-12 bg-[#14161F]">
        <AcrosoftLogo size="lg" variant="light" />
        <p className="text-white/55 text-sm font-opensans max-w-sm leading-relaxed">
          Accede a la herramienta CRM de Acros Software — ventas, agenda e IA, todo en un solo lugar.
        </p>
        <div className="flex items-center gap-6">
          <CalendarDays size={22} className="text-[#0F766E]" />
          <Sparkles size={22} className="text-[#0F766E]" />
          <TrendingUp size={22} className="text-[#0F766E]" />
        </div>
      </div>

      {/* ── Panel derecho — formulario ── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white px-6 py-12 lg:px-16">
        <div className="w-full max-w-[380px]">

          {/* Logo mobile */}
          <div className="lg:hidden mb-10 flex justify-center">
            <AcrosoftLogo size="md" />
          </div>

          {forgotMode ? (
            /* ── Recuperar contraseña ── */
            <div className="space-y-7 animate-fade-in">
              <div className="space-y-1.5">
                <h2 className="text-2xl font-poppins font-bold text-[#14161F] tracking-tight">Recuperar acceso</h2>
                <p className="text-sm text-[#14161F]/55">
                  Te enviamos un enlace para restablecer tu contraseña.
                </p>
              </div>

              {resetSent ? (
                <div className="py-8 flex flex-col items-center gap-4 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#0F766E]/10 border border-[#0F766E]/20 flex items-center justify-center">
                    <Check size={26} className="text-[#0F766E]" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-sm font-opensans">Correo enviado</p>
                    <p className="text-xs text-[#14161F]/55 leading-relaxed">
                      Revisa <span className="font-medium text-[#14161F]">{email}</span> y sigue el enlace para crear una nueva contraseña.
                    </p>
                  </div>
                  <button
                    onClick={() => { setForgotMode(false); setResetSent(false); setError(""); }}
                    className="text-xs text-[#0F766E] font-semibold hover:underline transition-all mt-1"
                  >
                    Volver al inicio de sesión
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#14161F]/55 uppercase tracking-wide">Email</label>
                    <input
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && email && handleResetPassword()}
                      autoFocus
                      className="w-full h-12 px-4 rounded-xl border border-[#14161F]/15 bg-white text-base md:text-sm font-medium outline-none focus:ring-2 focus:ring-[#0F766E]/25 focus:border-[#0F766E] transition-all placeholder:text-[#14161F]/30"
                    />
                  </div>

                  {error && (
                    <div className="flex items-start gap-2.5 bg-destructive/5 border border-destructive/20 rounded-xl px-3.5 py-3">
                      <p className="text-xs text-destructive leading-relaxed">{error}</p>
                    </div>
                  )}

                  <button
                    onClick={handleResetPassword}
                    disabled={loading || !email}
                    className="w-full h-12 rounded-xl text-sm font-bold font-opensans text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-[#0F766E] hover:opacity-90"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>Enviar enlace <ArrowRight size={15} /></>
                    )}
                  </button>

                  <button
                    onClick={() => { setForgotMode(false); setError(""); }}
                    className="w-full text-center text-xs text-[#14161F]/50 hover:text-[#14161F] transition-colors py-1"
                  >
                    ← Volver al inicio de sesión
                  </button>
                </div>
              )}
            </div>

          ) : (
            /* ── Iniciar sesión ── */
            <div className="space-y-7 animate-fade-in">
              <div className="space-y-1.5">
                <h2 className="text-2xl font-poppins font-bold text-[#14161F] tracking-tight">Bienvenido de nuevo</h2>
                <p className="text-sm text-[#14161F]/55">
                  Ingresa a tu panel de control.
                </p>
              </div>

              <div className="space-y-4">
                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#14161F]/55 uppercase tracking-wide">Email</label>
                  <input
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleLogin()}
                    autoFocus
                    className="w-full h-12 px-4 rounded-xl border border-[#14161F]/15 bg-white text-base md:text-sm font-medium outline-none focus:ring-2 focus:ring-[#0F766E]/25 focus:border-[#0F766E] transition-all placeholder:text-[#14161F]/30"
                  />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#14161F]/55 uppercase tracking-wide">Contraseña</label>
                    <button
                      type="button"
                      onClick={() => { setForgotMode(true); setError(""); }}
                      className="text-[11px] text-[#0F766E] font-semibold hover:underline transition-all"
                    >
                      ¿Olvidaste la contraseña?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleLogin()}
                      className="w-full h-12 px-4 pr-12 rounded-xl border border-[#14161F]/15 bg-white text-base md:text-sm font-medium outline-none focus:ring-2 focus:ring-[#0F766E]/25 focus:border-[#0F766E] transition-all placeholder:text-[#14161F]/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#14161F]/40 hover:text-[#14161F] transition-colors p-1"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 bg-destructive/5 border border-destructive/20 rounded-xl px-3.5 py-3">
                  <p className="text-xs text-destructive leading-relaxed">{error}</p>
                </div>
              )}

              <button
                onClick={handleLogin}
                disabled={loading || !email || !password}
                className="w-full h-12 rounded-xl text-sm font-bold font-opensans text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] bg-[#0F766E] hover:opacity-90"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Ingresar <ArrowRight size={15} /></>
                )}
              </button>

              <p className="text-center text-[10px] text-[#14161F]/35 uppercase tracking-widest font-medium">
                Acros Software · Acceso seguro
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
