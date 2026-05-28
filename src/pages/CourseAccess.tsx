import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabasePublic } from "@/lib/supabase";
import { Loader2, BookOpen, Mail, ArrowRight, CheckCircle2 } from "lucide-react";
import type { CrmCourse } from "@/lib/supabase";

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export default function CourseAccess() {
  const { tenantSlug, courseSlug } = useParams<{ tenantSlug: string; courseSlug: string }>();
  const navigate = useNavigate();

  const [course, setCourse]   = useState<CrmCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail]     = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");

  const storageKey = `course_token_${tenantSlug}_${courseSlug}`;

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      navigate(`/curso/${tenantSlug}/${courseSlug}/ver`, { replace: true });
      return;
    }

    // tenantSlug is the user_id (UUID) of the course owner
    supabasePublic
      .from("crm_courses")
      .select("id, title, description, thumbnail_url, slug, is_published")
      .eq("user_id", tenantSlug!)
      .eq("slug", courseSlug!)
      .eq("is_published", true)
      .maybeSingle()
      .then(({ data }) => {
        setCourse(data as CrmCourse | null);
        setLoading(false);
      });
  }, [tenantSlug, courseSlug, navigate, storageKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setSent(true);
    } catch (err: any) {
      setError(err.message ?? "Error al enviar el email");
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

        {/* Logo / thumbnail */}
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

        {sent ? (
          <div className="rounded-2xl border bg-emerald-50 dark:bg-emerald-950/30 px-5 py-5 space-y-2 text-center">
            <CheckCircle2 size={28} className="mx-auto text-emerald-500" />
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">¡Revisa tu email!</p>
            <p className="text-xs text-emerald-600/80 dark:text-emerald-400/70">
              Si tu email tiene acceso, recibirás un enlace en los próximos segundos. Válido por 15 minutos.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
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
                  className="w-full h-11 pl-9 pr-4 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}

            <button
              type="submit"
              disabled={sending || !email.trim()}
              className="w-full h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #1877F2, #0f5cc8)" }}
            >
              {sending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <>Acceder al curso <ArrowRight size={14} /></>
              )}
            </button>
          </form>
        )}

        <p className="text-center text-[11px] text-muted-foreground/50">
          No necesitas crear una cuenta · Solo tu email
        </p>
      </div>
    </div>
  );
}
