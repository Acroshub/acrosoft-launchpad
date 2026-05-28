import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Loader2, BookOpen, ChevronLeft, ChevronRight, LogOut,
  CheckCircle2, Circle, Menu, X, PlayCircle, FileText,
  ChevronDown, Award, Paperclip,
} from "lucide-react";
import type { CrmCourse, CrmCourseLesson, CrmCourseModule } from "@/lib/supabase";

const FUNCTIONS_URL    = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const BUNNY_LIBRARY_ID = import.meta.env.VITE_BUNNY_STREAM_LIBRARY_ID ?? import.meta.env.VITE_BUNNY_LIBRARY_ID ?? "628395";

async function fetchCourseContent(
  sessionToken: string,
): Promise<{ course: CrmCourse; modules: CrmCourseModule[]; lessons: CrmCourseLesson[] } | null> {
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

  const [loading, setLoading]                 = useState(true);
  const [authError, setAuthError]             = useState("");
  const [course, setCourse]                   = useState<CrmCourse | null>(null);
  const [modules, setModules]                 = useState<CrmCourseModule[]>([]);
  const [lessons, setLessons]                 = useState<CrmCourseLesson[]>([]);
  const [activeLesson, setActiveLesson]       = useState<CrmCourseLesson | null>(null);
  const [sidebarOpen, setSidebarOpen]         = useState(true);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [completed, setCompleted]             = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(`course_done_${courseSlug}`) ?? "[]")); }
    catch { return new Set(); }
  });

  const storageKey = `course_token_${courseSlug}`;

  useEffect(() => {
    if (activeLesson?.module_id) {
      setExpandedModules(prev => new Set([...prev, activeLesson.module_id!]));
    }
  }, [activeLesson?.module_id]);

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
      setModules(data.modules);
      setLessons(data.lessons);
      const ordered = data.modules.length > 0
        ? [...data.modules]
            .sort((a, b) => a.sort_order - b.sort_order)
            .flatMap(mod =>
              data.lessons.filter(l => l.module_id === mod.id).sort((a, b) => a.sort_order - b.sort_order),
            )
        : [...data.lessons].sort((a, b) => a.sort_order - b.sort_order);
      setActiveLesson(ordered[0] ?? null);
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

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      next.has(moduleId) ? next.delete(moduleId) : next.add(moduleId);
      return next;
    });
  };

  const orderedLessons = modules.length > 0
    ? [...modules]
        .sort((a, b) => a.sort_order - b.sort_order)
        .flatMap(mod =>
          lessons.filter(l => l.module_id === mod.id).sort((a, b) => a.sort_order - b.sort_order),
        )
    : [...lessons].sort((a, b) => a.sort_order - b.sort_order);

  const activeLessonIdx = orderedLessons.findIndex(l => l.id === activeLesson?.id);
  const activeModule    = modules.find(m => m.id === activeLesson?.module_id);
  const progressPct     = lessons.length > 0 ? Math.round((completed.size / lessons.length) * 100) : 0;
  const hasVideo        = !!(activeLesson?.bunny_video_id && (activeLesson.video_status === "ready" || activeLesson.video_status === "processing"));
  const allDone         = lessons.length > 0 && completed.size === lessons.length;

  const handleLogout = () => {
    localStorage.removeItem(storageKey);
    navigate(`/curso/${courseSlug}`, { replace: true });
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <BookOpen size={18} className="text-primary" />
          </div>
          <Loader2 className="animate-spin text-primary" size={18} />
          <p className="text-sm text-muted-foreground">Cargando curso...</p>
        </div>
      </div>
    );
  }

  // ── Auth error ───────────────────────────────────────────────────────────
  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4 max-w-sm w-full">
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
            <BookOpen size={22} className="text-destructive" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{authError}</p>
            <p className="text-xs text-muted-foreground">El enlace puede haber expirado o ya fue utilizado.</p>
          </div>
          <button
            onClick={() => navigate(`/curso/${courseSlug}`)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Solicitar nuevo acceso
          </button>
        </div>
      </div>
    );
  }

  // ── Main player ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* ── Header ── */}
      <header className="shrink-0 h-14 flex items-center gap-3 px-4 bg-card border-b border-border z-10">
        <button
          onClick={() => setSidebarOpen(v => !v)}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer shrink-0"
          aria-label={sidebarOpen ? "Cerrar menú" : "Abrir menú"}
        >
          {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
        </button>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <BookOpen size={12} className="text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground truncate">{course?.title}</span>
        </div>

        {/* Progress (desktop) */}
        <div className="hidden md:flex items-center gap-2.5 shrink-0">
          <span className="text-xs text-muted-foreground tabular-nums">{completed.size}/{lessons.length}</span>
          <div className="w-28 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPct}%`,
                background: allDone ? "hsl(var(--success))" : "hsl(var(--primary))",
              }}
            />
          </div>
          <span
            className="text-xs font-semibold tabular-nums"
            style={{ color: allDone ? "hsl(var(--success))" : "hsl(var(--primary))" }}
          >
            {progressPct}%
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-muted transition-colors cursor-pointer shrink-0"
        >
          <LogOut size={13} />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ── */}
        <aside
          className="shrink-0 flex flex-col bg-card border-r border-border overflow-hidden transition-all duration-200"
          style={{ width: sidebarOpen ? 288 : 0 }}
        >
          {/* Sidebar header */}
          <div className="shrink-0 px-4 pt-4 pb-3 border-b border-border">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Contenido del curso
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {completed.size} / {lessons.length}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progressPct}%`,
                  background: allDone ? "hsl(var(--success))" : "hsl(var(--primary))",
                }}
              />
            </div>
          </div>

          {/* Lessons list */}
          <div className="flex-1 overflow-y-auto py-2">
            {lessons.length === 0 ? (
              <p className="text-xs text-center py-12 text-muted-foreground/40">Sin lecciones disponibles</p>
            ) : modules.length > 0 ? (
              // ── Grouped by modules ──
              [...modules]
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((mod, modIdx) => {
                  const modLessons = lessons
                    .filter(l => l.module_id === mod.id)
                    .sort((a, b) => a.sort_order - b.sort_order);
                  if (modLessons.length === 0) return null;

                  const isExpanded      = expandedModules.has(mod.id);
                  const modDoneCount    = modLessons.filter(l => completed.has(l.id)).length;
                  const modAllDone      = modDoneCount === modLessons.length;
                  const hasActiveLesson = modLessons.some(l => l.id === activeLesson?.id);

                  return (
                    <div key={mod.id}>
                      {/* Module header */}
                      <button
                        onClick={() => toggleModule(mod.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer transition-colors min-h-[52px] ${hasActiveLesson ? "bg-accent/60" : "hover:bg-muted/50"}`}
                      >
                        <div
                          className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-[11px] font-bold border ${
                            modAllDone
                              ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                              : "bg-primary/10 border-primary/20 text-primary"
                          }`}
                        >
                          {modAllDone ? <CheckCircle2 size={12} /> : modIdx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate leading-snug">{mod.title}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{modDoneCount}/{modLessons.length} completadas</p>
                        </div>
                        <ChevronDown
                          size={13}
                          className="text-muted-foreground/60 shrink-0 transition-transform duration-200"
                          style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                        />
                      </button>

                      {/* Lesson rows */}
                      {isExpanded && modLessons.map((lesson) => {
                        const globalIdx = orderedLessons.findIndex(l => l.id === lesson.id);
                        const isActive  = activeLesson?.id === lesson.id;
                        const isDone    = completed.has(lesson.id);
                        const hasVid    = !!(lesson.bunny_video_id);

                        return (
                          <button
                            key={lesson.id}
                            onClick={() => setActiveLesson(lesson)}
                            className={`w-full flex items-center gap-3 pl-8 pr-4 text-left cursor-pointer transition-colors min-h-[52px] border-r-2 ${
                              isActive
                                ? "bg-primary/5 border-r-primary"
                                : "border-r-transparent hover:bg-muted/40"
                            }`}
                          >
                            <div className="shrink-0 w-[18px] flex items-center justify-center">
                              {isDone ? (
                                <CheckCircle2 size={14} className="text-emerald-500" />
                              ) : isActive ? (
                                <div className="w-3.5 h-3.5 rounded-full bg-primary/20 border-2 border-primary" />
                              ) : (
                                <Circle size={14} className="text-muted-foreground/25" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0 py-2">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                {hasVid
                                  ? <PlayCircle size={10} className={isActive ? "text-primary" : "text-muted-foreground/50"} />
                                  : <FileText size={10} className="text-muted-foreground/40" />
                                }
                                <span className="text-[10px] text-muted-foreground/50 tabular-nums">{globalIdx + 1}</span>
                              </div>
                              <p className={`text-xs font-medium leading-snug truncate ${isActive ? "text-primary" : "text-foreground/80"}`}>
                                {lesson.title}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })
            ) : (
              // ── Flat list (no modules) ──
              orderedLessons.map((lesson, idx) => {
                const isActive = activeLesson?.id === lesson.id;
                const isDone   = completed.has(lesson.id);
                const hasVid   = !!(lesson.bunny_video_id);
                return (
                  <button
                    key={lesson.id}
                    onClick={() => setActiveLesson(lesson)}
                    className={`w-full flex items-center gap-3 px-4 text-left cursor-pointer transition-colors min-h-[52px] border-r-2 ${
                      isActive ? "bg-primary/5 border-r-primary" : "border-r-transparent hover:bg-muted/40"
                    }`}
                  >
                    <div className="shrink-0 w-[18px] flex items-center justify-center">
                      {isDone ? (
                        <CheckCircle2 size={14} className="text-emerald-500" />
                      ) : isActive ? (
                        <div className="w-3.5 h-3.5 rounded-full bg-primary/20 border-2 border-primary" />
                      ) : (
                        <Circle size={14} className="text-muted-foreground/25" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 py-2">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {hasVid
                          ? <PlayCircle size={10} className={isActive ? "text-primary" : "text-muted-foreground/50"} />
                          : <FileText size={10} className="text-muted-foreground/40" />
                        }
                        <span className="text-[10px] text-muted-foreground/50 tabular-nums">{idx + 1}</span>
                      </div>
                      <p className={`text-xs font-medium leading-snug truncate ${isActive ? "text-primary" : "text-foreground/80"}`}>
                        {lesson.title}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Completion badge */}
          {allDone && (
            <div className="mx-3 mb-3 rounded-xl p-3 flex items-center gap-3 bg-emerald-50 border border-emerald-200">
              <Award size={17} className="text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-bold text-emerald-700">¡Curso completado!</p>
                <p className="text-[10px] text-emerald-600/70">Terminaste todas las lecciones.</p>
              </div>
            </div>
          )}
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 overflow-y-auto bg-background">
          {activeLesson ? (
            <div className="max-w-4xl mx-auto px-5 md:px-10 py-8 space-y-6">

              {/* Breadcrumb */}
              <div className="flex items-center gap-2 flex-wrap">
                {activeModule && (
                  <>
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {activeModule.title}
                    </span>
                    <ChevronRight size={11} className="text-muted-foreground/40" />
                  </>
                )}
                <span className="text-[11px] text-muted-foreground">
                  Lección {activeLessonIdx + 1} de {lessons.length}
                </span>
              </div>

              {/* Lesson title */}
              <h1 className="text-xl md:text-2xl font-bold text-foreground leading-tight">
                {activeLesson.title}
              </h1>

              {/* ── Video player ── */}
              {hasVideo && (
                <div
                  className="w-full rounded-2xl overflow-hidden border border-border bg-black"
                  style={{ aspectRatio: "16/9", boxShadow: "0 4px 24px hsl(var(--primary) / 0.12)" }}
                >
                  <iframe
                    src={`https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${activeLesson.bunny_video_id}?autoplay=false&preload=false`}
                    className="w-full h-full"
                    allow="accelerometer; gyroscope; encrypted-media; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}

              {/* No content placeholder */}
              {!hasVideo && !activeLesson.content && (
                <div className="rounded-2xl flex items-center gap-4 p-5 bg-card border border-border">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <FileText size={18} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground italic">Esta lección no tiene contenido aún.</p>
                </div>
              )}

              {/* ── Lesson content ── */}
              {activeLesson.content && (
                <div className="rounded-2xl p-6 bg-card border border-border">
                  <div
                    className="prose prose-sm max-w-none text-foreground/80 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: activeLesson.content.replace(/\n/g, "<br />") }}
                  />
                </div>
              )}

              {/* ── Attachment ── */}
              {activeLesson.attachment_url && (
                <a
                  href={activeLesson.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer no-underline group"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Paperclip size={14} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {activeLesson.attachment_name ?? "Archivo adjunto"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Haz clic para descargar</p>
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </a>
              )}

              {/* ── Navigation bar ── */}
              <div className="rounded-2xl flex items-center gap-3 p-3 bg-card border border-border">
                {/* Previous */}
                <div className="flex-1">
                  {activeLessonIdx > 0 && (
                    <button
                      onClick={() => setActiveLesson(orderedLessons[activeLessonIdx - 1])}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground bg-muted hover:bg-muted/80 hover:text-foreground transition-colors cursor-pointer min-h-[44px] border border-border"
                    >
                      <ChevronLeft size={15} />
                      <span className="hidden sm:inline">Anterior</span>
                    </button>
                  )}
                </div>

                {/* Mark complete */}
                <button
                  onClick={() => markCompleted(activeLesson.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer min-h-[44px] border ${
                    completed.has(activeLesson.id)
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                      : "bg-muted border-border text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  {completed.has(activeLesson.id)
                    ? <><CheckCircle2 size={15} /> <span className="hidden sm:inline">Completada</span></>
                    : <><Circle size={15} /> <span className="hidden sm:inline">Marcar completada</span></>
                  }
                </button>

                {/* Next / Finish */}
                <div className="flex-1 flex justify-end">
                  {activeLessonIdx < orderedLessons.length - 1 ? (
                    <button
                      onClick={() => setActiveLesson(orderedLessons[activeLessonIdx + 1])}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors cursor-pointer min-h-[44px]"
                    >
                      <span className="hidden sm:inline">Siguiente</span>
                      <ChevronRight size={15} />
                    </button>
                  ) : (
                    <button
                      onClick={() => markCompleted(activeLesson.id)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors cursor-pointer min-h-[44px]"
                    >
                      <CheckCircle2 size={15} />
                      <span className="hidden sm:inline">Finalizar</span>
                    </button>
                  )}
                </div>
              </div>

              {/* ── Completion banner ── */}
              {allDone && activeLessonIdx === orderedLessons.length - 1 && (
                <div className="rounded-2xl p-5 flex items-center gap-4 bg-emerald-50 border border-emerald-200">
                  <div className="w-11 h-11 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0">
                    <Award size={22} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-emerald-700">¡Felicidades! Completaste el curso</p>
                    <p className="text-sm text-emerald-600/80">Has terminado todas las lecciones. ¡Excelente trabajo!</p>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="flex items-center justify-center h-full py-24">
              <div className="text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                  <BookOpen size={22} className="text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground">Selecciona una lección para comenzar</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
