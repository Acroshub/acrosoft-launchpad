import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Loader2, BookOpen, ChevronLeft, ChevronRight, LogOut,
  CheckCircle2, Circle, Menu, X,
} from "lucide-react";
import type { CrmCourse, CrmCourseLesson } from "@/lib/supabase";

const FUNCTIONS_URL    = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const BUNNY_LIBRARY_ID = import.meta.env.VITE_BUNNY_STREAM_LIBRARY_ID ?? import.meta.env.VITE_BUNNY_LIBRARY_ID ?? "628395";

async function fetchCourseContent(
  sessionToken: string,
): Promise<{ course: CrmCourse; lessons: CrmCourseLesson[] } | null> {
  try {
    const res = await fetch(`${FUNCTIONS_URL}/get-course-content`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_token: sessionToken }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default function CoursePlayer() {
  const { courseSlug } = useParams<{ courseSlug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading]           = useState(true);
  const [authError, setAuthError]       = useState("");
  const [course, setCourse]             = useState<CrmCourse | null>(null);
  const [lessons, setLessons]           = useState<CrmCourseLesson[]>([]);
  const [activeLesson, setActiveLesson] = useState<CrmCourseLesson | null>(null);
  const [sidebarOpen, setSidebarOpen]   = useState(true);
  const [completed, setCompleted]       = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(`course_done_${courseSlug}`) ?? "[]")); }
    catch { return new Set(); }
  });

  const storageKey = `course_token_${courseSlug}`;

  useEffect(() => {
    const magicToken = searchParams.get("token");

    if (magicToken) {
      fetch(`${FUNCTIONS_URL}/verify-course-magic-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: magicToken }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.session_token) {
            localStorage.setItem(storageKey, data.session_token);
            navigate(`/curso/${courseSlug}/ver`, { replace: true });
          } else {
            setAuthError(data.error ?? "Enlace inválido o expirado");
            setLoading(false);
          }
        })
        .catch(() => { setAuthError("Error al verificar el enlace"); setLoading(false); });
      return;
    }

    const stored = localStorage.getItem(storageKey);
    if (!stored) {
      navigate(`/curso/${courseSlug}`, { replace: true });
      return;
    }

    fetchCourseContent(stored).then(data => {
      if (!data) {
        localStorage.removeItem(storageKey);
        navigate(`/curso/${courseSlug}`, { replace: true });
        return;
      }
      setCourse(data.course);
      setLessons(data.lessons);
      setActiveLesson(data.lessons[0] ?? null);
      setLoading(false);
    }).catch(() => {
      localStorage.removeItem(storageKey);
      navigate(`/curso/${courseSlug}`, { replace: true });
    });
  }, [courseSlug, searchParams, navigate, storageKey]);

  const markCompleted = (lessonId: string) => {
    const next = new Set(completed);
    next.has(lessonId) ? next.delete(lessonId) : next.add(lessonId);
    setCompleted(next);
    localStorage.setItem(`course_done_${courseSlug}`, JSON.stringify([...next]));
  };

  const activeLessonIdx = lessons.findIndex(l => l.id === activeLesson?.id);

  const handleLogout = () => {
    localStorage.removeItem(storageKey);
    navigate(`/curso/${courseSlug}`, { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-3 max-w-xs">
          <BookOpen size={36} className="mx-auto text-muted-foreground/30" />
          <p className="text-sm font-semibold text-foreground">{authError}</p>
          <button
            onClick={() => navigate(`/curso/${courseSlug}`)}
            className="text-xs text-primary underline"
          >
            Volver al acceso
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Header */}
      <header className="border-b bg-card px-4 h-14 flex items-center gap-3 shrink-0">
        <button
          onClick={() => setSidebarOpen(v => !v)}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors md:hidden"
        >
          {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
        </button>
        <BookOpen size={16} className="text-primary shrink-0" />
        <span className="text-sm font-semibold truncate flex-1">{course?.title}</span>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut size={13} /> Salir
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar de lecciones */}
        <aside className={`${sidebarOpen ? "w-72" : "w-0 overflow-hidden"} shrink-0 border-r bg-card flex flex-col transition-all duration-200`}>
          <div className="px-4 py-3 border-b">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Lecciones · {completed.size}/{lessons.length} completadas
            </p>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {lessons.length === 0 ? (
              <p className="text-xs text-muted-foreground/50 text-center py-8">Sin lecciones aún</p>
            ) : lessons.map((lesson, idx) => (
              <button
                key={lesson.id}
                onClick={() => setActiveLesson(lesson)}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 ${activeLesson?.id === lesson.id ? "bg-primary/5 border-r-2 border-primary" : ""}`}
              >
                <span className="shrink-0 mt-0.5">
                  {completed.has(lesson.id)
                    ? <CheckCircle2 size={15} className="text-emerald-500" />
                    : <Circle size={15} className="text-muted-foreground/30" />
                  }
                </span>
                <span className="flex-1 min-w-0">
                  <span className="text-[11px] text-muted-foreground/60 block">Lección {idx + 1}</span>
                  <span className={`text-xs font-medium leading-snug ${activeLesson?.id === lesson.id ? "text-primary" : "text-foreground"}`}>
                    {lesson.title}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </aside>

        {/* Contenido */}
        <main className="flex-1 overflow-y-auto">
          {activeLesson ? (
            <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

              {/* Título de la lección */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground/60">Lección {activeLessonIdx + 1} de {lessons.length}</p>
                <h1 className="text-xl font-bold">{activeLesson.title}</h1>
              </div>

              {/* Video de la lección */}
              {activeLesson.bunny_video_id && (activeLesson.video_status === "ready" || activeLesson.video_status === "processing") && (
                <div className="rounded-xl overflow-hidden border aspect-video bg-muted">
                  <iframe
                    src={`https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${activeLesson.bunny_video_id}?autoplay=false&preload=false`}
                    className="w-full h-full"
                    allow="accelerometer; gyroscope; encrypted-media; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}

              {/* Contenido de la lección */}
              {activeLesson.content ? (
                <div
                  className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: activeLesson.content.replace(/\n/g, "<br />") }}
                />
              ) : (
                <p className="text-sm text-muted-foreground/50 italic">Esta lección no tiene contenido aún.</p>
              )}

              {/* Acciones */}
              <div className="flex items-center justify-between pt-4 border-t">
                <button
                  onClick={() => markCompleted(activeLesson.id)}
                  className={`flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-xl border transition-colors ${
                    completed.has(activeLesson.id)
                      ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 text-emerald-700 dark:text-emerald-400"
                      : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {completed.has(activeLesson.id)
                    ? <><CheckCircle2 size={13} /> Completada</>
                    : <><Circle size={13} /> Marcar como completada</>
                  }
                </button>

                <div className="flex gap-2">
                  {activeLessonIdx > 0 && (
                    <button
                      onClick={() => setActiveLesson(lessons[activeLessonIdx - 1])}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-xl border border-border hover:border-primary/40"
                    >
                      <ChevronLeft size={13} /> Anterior
                    </button>
                  )}
                  {activeLessonIdx < lessons.length - 1 && (
                    <button
                      onClick={() => setActiveLesson(lessons[activeLessonIdx + 1])}
                      className="flex items-center gap-1 text-xs font-medium text-white px-3 py-2 rounded-xl transition-colors"
                      style={{ background: "linear-gradient(135deg, #1877F2, #0f5cc8)" }}
                    >
                      Siguiente <ChevronRight size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Felicitación al terminar */}
              {activeLessonIdx === lessons.length - 1 && completed.size === lessons.length && (
                <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-5 py-4 text-center space-y-1">
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">¡Felicidades! Completaste el curso 🎉</p>
                  <p className="text-xs text-emerald-600/70 dark:text-emerald-400/60">Has terminado todas las lecciones.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center py-20">
              <p className="text-sm text-muted-foreground/50">Selecciona una lección para comenzar</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
