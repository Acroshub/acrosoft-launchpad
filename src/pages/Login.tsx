import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, CheckCircle2, ArrowRight, Bot, CalendarDays, Users, Kanban } from "lucide-react";
import AcrosoftLogo from "@/components/shared/AcrosoftLogo";
import { signIn } from "@/hooks/useAuth";

const FEATURES = [
  { icon: Bot,          label: "Agente IA en WhatsApp",       desc: "Atiende clientes 24/7 automáticamente" },
  { icon: CalendarDays, label: "Calendario inteligente",       desc: "Agenda y recordatorios automáticos" },
  { icon: Users,        label: "CRM completo",                 desc: "Contactos, pipeline y ventas unificados" },
  { icon: Kanban,       label: "Pipeline visual",              desc: "Gestiona tu flujo de ventas en un vistazo" },
];

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
    <div className="min-h-screen flex">

      {/* ── Panel izquierdo — branding (solo desktop) ── */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[55%] relative flex-col justify-between p-12 overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0d1b3b 0%, #0f3380 45%, #1877F2 100%)" }}>

        {/* Decorative circles */}
        <div className="absolute top-[-80px] right-[-80px] w-[340px] h-[340px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #ffffff 0%, transparent 70%)" }} />
        <div className="absolute bottom-[-60px] left-[-60px] w-[280px] h-[280px] rounded-full opacity-8"
          style={{ background: "radial-gradient(circle, #60a5fa 0%, transparent 70%)" }} />
        <div className="absolute top-[40%] left-[-40px] w-[180px] h-[180px] rounded-full opacity-5"
          style={{ background: "radial-gradient(circle, #ffffff 0%, transparent 70%)" }} />

        {/* Logo */}
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <Bot size={20} className="text-white" />
            </div>
            <div>
              <p className="text-white font-black text-xl tracking-tight leading-none">Acrosoft</p>
              <p className="text-blue-300 text-[10px] font-bold uppercase tracking-widest">Labs</p>
            </div>
          </div>
        </div>

        {/* Tagline */}
        <div className="relative space-y-8">
          <div className="space-y-3">
            <p className="text-blue-300 text-sm font-semibold uppercase tracking-widest">Tu CRM Inteligente</p>
            <h1 className="text-white text-4xl xl:text-5xl font-black leading-tight tracking-tight">
              Crece más rápido<br />
              <span className="text-blue-300">con IA.</span>
            </h1>
            <p className="text-blue-200/70 text-base leading-relaxed max-w-sm">
              Automatiza la atención al cliente, gestiona tus ventas y escala tu negocio desde un solo lugar.
            </p>
          </div>

          {/* Feature list */}
          <div className="space-y-3">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                  <Icon size={16} className="text-blue-200" />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold leading-tight">{label}</p>
                  <p className="text-blue-200/60 text-xs mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer branding */}
        <div className="relative">
          <p className="text-blue-200/40 text-[11px] uppercase tracking-widest font-medium">
            Acrosoft Labs · Plataforma segura
          </p>
        </div>
      </div>

      {/* ── Panel derecho — formulario ── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-background px-6 py-12 lg:px-16">
        <div className="w-full max-w-[380px]">

          {/* Logo mobile */}
          <div className="lg:hidden mb-10 flex justify-center">
            <AcrosoftLogo size="md" />
          </div>

          {forgotMode ? (
            /* ── Recuperar contraseña ── */
            <div className="space-y-7 animate-fade-in">
              <div className="space-y-1.5">
                <h2 className="text-2xl font-black text-foreground tracking-tight">Recuperar acceso</h2>
                <p className="text-sm text-muted-foreground">
                  Te enviamos un enlace para restablecer tu contraseña.
                </p>
              </div>

              {resetSent ? (
                <div className="py-8 flex flex-col items-center gap-4 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                    <CheckCircle2 size={28} className="text-emerald-500" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-sm">Correo enviado</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Revisa <span className="font-medium text-foreground">{email}</span> y sigue el enlace para crear una nueva contraseña.
                    </p>
                  </div>
                  <button
                    onClick={() => { setForgotMode(false); setResetSent(false); setError(""); }}
                    className="text-xs text-primary font-semibold hover:underline transition-all mt-1"
                  >
                    Volver al inicio de sesión
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</label>
                    <input
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && email && handleResetPassword()}
                      autoFocus
                      className="w-full h-12 px-4 rounded-xl border border-border bg-card text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all placeholder:text-muted-foreground/50"
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
                    className="w-full h-12 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: "linear-gradient(135deg, #1877F2, #0f5cc8)" }}
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>Enviar enlace <ArrowRight size={15} /></>
                    )}
                  </button>

                  <button
                    onClick={() => { setForgotMode(false); setError(""); }}
                    className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
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
                <h2 className="text-2xl font-black text-foreground tracking-tight">Bienvenido de nuevo</h2>
                <p className="text-sm text-muted-foreground">
                  Ingresa a tu panel de control.
                </p>
              </div>

              <div className="space-y-4">
                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</label>
                  <input
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleLogin()}
                    autoFocus
                    className="w-full h-12 px-4 rounded-xl border border-border bg-card text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all placeholder:text-muted-foreground/50"
                  />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contraseña</label>
                    <button
                      type="button"
                      onClick={() => { setForgotMode(true); setError(""); }}
                      className="text-[11px] text-primary font-semibold hover:underline transition-all"
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
                      className="w-full h-12 px-4 pr-12 rounded-xl border border-border bg-card text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all placeholder:text-muted-foreground/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
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
                className="w-full h-12 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                style={{ background: !loading && email && password ? "linear-gradient(135deg, #1877F2, #0f5cc8)" : undefined }}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Ingresar <ArrowRight size={15} /></>
                )}
              </button>

              <p className="text-center text-[10px] text-muted-foreground/40 uppercase tracking-widest font-medium">
                Acrosoft Labs · Acceso seguro
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
