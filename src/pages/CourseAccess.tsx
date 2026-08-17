import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabasePublic } from "@/lib/supabase";
import { Loader2, BookOpen, Mail, ArrowRight, ArrowLeft } from "lucide-react";
import type { CrmCourse } from "@/lib/supabase";

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

/** Reenvío bloqueado un minuto: evita que el alumno bombardee su propio buzón. */
const RESEND_COOLDOWN_SECONDS = 60;

export default function CourseAccess() {
  const { tenantSlug, courseSlug } = useParams<{ tenantSlug: string; courseSlug: string }>();
  const navigate = useNavigate();

  const [course, setCourse]   = useState<CrmCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep]       = useState<"email" | "code">("email");
  const [email, setEmail]     = useState("");
  const [code, setCode]       = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError]     = useState("");
  const [cooldown, setCooldown] = useState(0);

  const codeInputRef = useRef<HTMLInputElement>(null);
  const storageKey = `course_token_${tenantSlug}_${courseSlug}`;

  useEffect(() => {
    if (localStorage.getItem(storageKey)) {
      navigate(`/curso/${tenantSlug}/${courseSlug}/ver`, { replace: true });
      return;
    }

    // tenantSlug es el user_id (UUID) del dueño del curso
    supabasePublic
      .from("crm_courses")
      .select("id, title, description, thumbnail_url, slug, is_published, price, currency")
      .eq("user_id", tenantSlug!)
      .eq("slug", courseSlug!)
      .eq("is_published", true)
      .maybeSingle()
      .then(({ data }) => {
        setCourse(data as CrmCourse | null);
        setLoading(false);
      });
  }, [tenantSlug, courseSlug, navigate, storageKey]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (step === "code") codeInputRef.current?.focus();
  }, [step]);

  const requestCode = async (isResend = false) => {
    if (!email.trim()) return;
    setError("");
    setSending(true);
    try {
      const res = await fetch(`${FUNCTIONS_URL}/request-course-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), tenant_id: tenantSlug, course_slug: courseSlug }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al enviar");
      if (!isResend) setStep("code");
      setCode("");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el código");
    } finally {
      setSending(false);
    }
  };

  const verifyCode = async () => {
    if (code.length !== 6) return;
    setError("");
    setSending(true);
    try {
      const res = await fetch(`${FUNCTIONS_URL}/verify-course-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(), tenant_id: tenantSlug, course_slug: courseSlug, code,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.session_token) {
        throw new Error(json.error ?? "Código incorrecto o caducado");
      }
      localStorage.setItem(storageKey, json.session_token);
      navigate(`/curso/${tenantSlug}/${courseSlug}/ver`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Código incorrecto o caducado");
      setCode("");
      codeInputRef.current?.focus();
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-2">
          <BookOpen size={36} className="mx-auto text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">Curso no encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">

        {course.thumbnail_url ? (
          <img src={course.thumbnail_url} alt={course.title} className="w-full h-44 object-cover rounded-2xl" />
        ) : (
          <div className="w-full h-44 rounded-2xl bg-muted flex items-center justify-center">
            <BookOpen size={40} className="text-muted-foreground/30" />
          </div>
        )}

        <div className="space-y-1">
          <h1 className="text-xl font-bold">{course.title}</h1>
          {course.description && (
            <p className="text-sm text-muted-foreground">{course.description}</p>
          )}
        </div>

        {step === "email" ? (
          <form
            onSubmit={e => { e.preventDefault(); requestCode(); }}
            className="space-y-3"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tu email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  required
                  autoFocus
                  className="w-full h-11 pl-9 pr-4 rounded-xl border border-border bg-background text-base md:text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={sending || !email.trim()}
              className="w-full h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #1877F2, #0f5cc8)" }}
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <>Enviarme el código <ArrowRight size={14} /></>}
            </button>
          </form>
        ) : (
          <form
            onSubmit={e => { e.preventDefault(); verifyCode(); }}
            className="space-y-3"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Código enviado a <span className="font-semibold text-foreground">{email}</span>
              </label>
              <input
                ref={codeInputRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="w-full h-14 px-4 rounded-xl border border-border bg-background text-center text-2xl font-mono font-bold tracking-[0.4em] outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
              <p className="text-[11px] text-muted-foreground/70">
                Si tu email tiene acceso, recibirás un código de 6 dígitos. Caduca en 10 minutos.
              </p>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={sending || code.length !== 6}
              className="w-full h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #1877F2, #0f5cc8)" }}
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <>Entrar al curso <ArrowRight size={14} /></>}
            </button>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => { setStep("email"); setError(""); setCode(""); }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <ArrowLeft size={12} /> Cambiar email
              </button>
              <button
                type="button"
                onClick={() => requestCode(true)}
                disabled={cooldown > 0 || sending}
                className="text-xs text-primary font-semibold disabled:text-muted-foreground/50 disabled:font-normal transition-colors"
              >
                {cooldown > 0 ? `Reenviar en ${cooldown}s` : "Reenviar código"}
              </button>
            </div>
          </form>
        )}

        <p className="text-center text-[11px] text-muted-foreground/50">
          No necesitas crear una cuenta · Solo tu email
        </p>
      </div>
    </div>
  );
}
