import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { requestPasswordReset } from "@/hooks/useAuth";
import { checkPasswordPwned } from "@/lib/password-security";

type LinkResult = "none" | "ok" | "invalid";

/**
 * Convierte el enlace del correo en una sesión. Llegan dos formatos:
 *  - ?token_hash=…&type=…  → lo arma la Edge Function reset-password. Se canjea aquí con
 *    verifyOtp, así que una vista previa de WhatsApp o un escáner de correo que abra el
 *    enlace no lo gasta.
 *  - #access_token=…&refresh_token=… → lo manda Supabase (inviteUserByEmail). El cliente
 *    está en modo PKCE y descarta este formato por su cuenta, así que la sesión se fija a mano.
 */
async function consumeAuthLink(): Promise<LinkResult> {
  const query = new URLSearchParams(window.location.search);
  const hash  = new URLSearchParams(window.location.hash.slice(1));

  const tokenHash    = query.get("token_hash");
  const type         = query.get("type");
  const accessToken  = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");
  // Enlace vencido o ya usado: Supabase redirige con #error=…&error_code=otp_expired
  const linkFailed   = hash.has("error") || hash.has("error_code") || query.has("error") || query.has("error_code");

  if (!tokenHash && !accessToken && !linkFailed) return "none";

  // Sacar los tokens de la barra de direcciones y del historial antes de usarlos
  window.history.replaceState(null, "", window.location.pathname);
  if (linkFailed) return "invalid";

  // Esperar a que el cliente termine de inicializarse: si no, al restaurar una sesión
  // vieja guardada en este navegador podría pisar la que crea el enlace.
  await supabase.auth.getSession();

  if (tokenHash) {
    if (type !== "invite" && type !== "recovery") return "invalid";
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    return error ? "invalid" : "ok";
  }

  if (!accessToken || !refreshToken) return "invalid";
  const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  return error ? "invalid" : "ok";
}

/**
 * /crm-setup
 *
 * Landing page for invitation (SaaS clients, staff) and password-recovery links.
 * The link is turned into a session here; then the user sets a password.
 * If the link expired or was already used, offers to email a new one.
 */
const CrmSetup = () => {
  const navigate = useNavigate();

  const [phase, setPhase]             = useState<"checking" | "ready" | "invalid">("checking");
  const [password, setPassword]       = useState("");
  const [confirm, setConfirm]         = useState("");
  const [showPw, setShowPw]           = useState(false);
  const [loading, setLoading]         = useState(false);
  const [done, setDone]               = useState(false);
  const [error, setError]             = useState("");
  const [userEmail, setUserEmail]     = useState("");
  const [linkSent, setLinkSent]       = useState(false);
  const linkHandled = useRef(false);

  // On mount, turn the email link into a session (or detect it's no longer valid)
  useEffect(() => {
    // Una sola vez: en StrictMode el efecto corre dos veces y el enlace es de un solo uso
    if (linkHandled.current) return;
    linkHandled.current = true;

    (async () => {
      if (await consumeAuthLink() === "invalid") {
        setPhase("invalid");
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setPhase("invalid");
        return;
      }
      setUserEmail(data.session.user.email ?? "");
      setPhase("ready");
    })().catch(() => setPhase("invalid"));
  }, []);

  const isValid =
    password.length >= 8 &&
    password === confirm;

  const handleSubmit = async () => {
    if (!isValid) return;
    setError("");
    setLoading(true);

    try {
      // 0. Rechazar contraseñas que ya aparecieron en filtraciones conocidas.
      //    Equivale a la protección que Supabase ofrece solo desde el plan Pro.
      //    Si HIBP no responde (unavailable) se deja pasar: más vale una contraseña
      //    sin verificar que un usuario que no puede entrar a su cuenta.
      const pwned = await checkPasswordPwned(password);
      if (pwned.pwned) {
        setError(
          `Esta contraseña ya apareció ${pwned.count.toLocaleString("es")} veces en filtraciones de ` +
          `datos públicas. Aunque parezca segura, está en las listas que los atacantes prueban ` +
          `primero. Elige otra distinta.`,
        );
        setLoading(false);
        return;
      }

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
      console.error("crm-setup error:", err);
      setError("Error al establecer la contraseña. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestLink = async () => {
    if (!userEmail.trim()) return;
    setError("");
    setLoading(true);
    try {
      await requestPasswordReset(userEmail);
      setLinkSent(true);
    } catch {
      setError("No se pudo enviar el correo. Intenta de nuevo en unos minutos.");
    } finally {
      setLoading(false);
    }
  };

  if (phase === "checking") {
    return (
      <div className="min-h-screen bg-secondary/20 flex items-center justify-center p-4">
        <Loader2 size={20} className="animate-spin text-muted-foreground/50" />
      </div>
    );
  }

  if (phase === "invalid") {
    return (
      <div className="min-h-screen bg-secondary/20 flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-1">
            <h1 className="text-xl font-semibold">Este enlace ya no es válido</h1>
            <p className="text-sm text-muted-foreground">
              Los enlaces para crear tu contraseña sirven una sola vez y vencen. Escribe tu email y te enviamos uno nuevo.
            </p>
          </div>

          <div className="bg-card border rounded-2xl p-8 shadow-sm space-y-5">
            {linkSent ? (
              <p className="text-sm text-center text-muted-foreground">
                Te enviamos un enlace nuevo a <span className="font-medium text-foreground">{userEmail.trim()}</span>.
                Si no aparece en unos minutos, revisa la carpeta de spam.
              </p>
            ) : (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Email
                  </label>
                  <Input
                    type="email"
                    placeholder="tu@email.com"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRequestLink()}
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
                  onClick={handleRequestLink}
                  disabled={!userEmail.trim() || loading}
                  className="w-full h-11 rounded-xl font-medium"
                >
                  {loading ? (
                    <><Loader2 size={14} className="animate-spin mr-2" /> Enviando...</>
                  ) : (
                    "Enviar enlace nuevo"
                  )}
                </Button>
              </>
            )}

            <button
              type="button"
              onClick={() => navigate("/login")}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Ya tengo contraseña, ir a iniciar sesión
            </button>
          </div>

          <p className="text-center text-[10px] text-muted-foreground/40 uppercase tracking-widest">
            Acrosoft Labs · Acceso seguro
          </p>
        </div>
      </div>
    );
  }

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
            className="w-full h-11 rounded-xl font-medium"
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
