import { useState, useRef, useEffect } from "react";
import * as tus from "tus-js-client";
import {
  BookOpen, Plus, Trash2, Loader2, ArrowLeft, Pencil, Users,
  Link2, Check, ExternalLink, GraduationCap, X, UserPlus, Calendar,
  Video, AlertCircle, ImageIcon, Paperclip, ChevronDown, ChevronRight, ChevronLeft, FolderOpen, GripVertical, Send, CreditCard,
  Info, DollarSign, SlidersHorizontal,
} from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";
import {
  useCourses, useUpsertCourse, useDeleteCourse,
  useCoursePlans, useUpsertCoursePlan, useDeleteCoursePlan,
  useCourseModules, useUpsertCourseModule, useDeleteCourseModule,
  useCourseLessons, useUpsertCourseLesson, useDeleteCourseLesson,
  useCourseAccess, useGrantCourseAccess, useRevokeCourseAccess,
  useContacts, useCreateContact, useInsertLog, useCreateSale,
  usePricesByEntity, useUpsertPrices, useFaqsByEntity, useUpsertFaqs,
  useUpsertPaymentMethod,
} from "@/hooks/useCrmData";
import type { CrmCourse, CrmCoursePlan, CrmCourseModule, CrmCourseLesson, CrmCourseAccess } from "@/lib/supabase";
import PriceListEditor, { type PriceEntry } from "@/components/crm/PriceListEditor";
import FaqEditor, { type FaqEntry } from "@/components/crm/FaqEditor";
import PaymentMethodsEditor from "@/components/shared/PaymentMethodsEditor";
import {
  type RecurringInterval, type DraftPlan, emptyDraftPlan, PlanFields, DraftPlanCard,
  planFinalPrice, planFinalRecurringPrice, INTERVAL_LABELS,
} from "@/components/crm/PlanEditor";
import { VideoUploadProvider, useVideoUpload } from "@/contexts/VideoUploadContext";

import { CURRENCIES, formatAmount, getCurrencyFlag } from "@/lib/currencies";

const APP_URL          = import.meta.env.VITE_APP_URL ?? "https://acrosoftlabs.com";
const BUNNY_LIBRARY_ID = import.meta.env.VITE_BUNNY_STREAM_LIBRARY_ID ?? import.meta.env.VITE_BUNNY_LIBRARY_ID ?? "628395";

function slugify(text: string): string {
  return text.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim().replace(/\s+/g, "-");
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function CrmCourses({ onExit }: { onExit: () => void }) {
  return <VideoUploadProvider><CrmCoursesContent onExit={onExit} /></VideoUploadProvider>;
}

// ─── Portada (wizard de curso nuevo) ───────────────────────────────────────────
function CoverUploader({ url, onChange, draftId }: { url: string | null; onChange: (url: string | null) => void; draftId: string }) {
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setLoading(true);
    try {
      const ext  = file.name.split(".").pop() ?? "jpg";
      const path = `course-thumbnails/draft-${draftId}.${ext}`;
      const { error } = await supabase.storage.from("form-uploads").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("form-uploads").getPublicUrl(path);
      onChange(publicUrl);
    } catch {
      toast.error("Error al subir la portada");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">Portada <span className="text-[10px] font-normal">(opcional)</span></label>
      <div
        className={`relative aspect-video w-full max-w-xs rounded-xl overflow-hidden border-2 border-dashed border-border bg-secondary/30 flex items-center justify-center group ${loading ? "cursor-wait" : "cursor-pointer"}`}
        onClick={() => !loading && ref.current?.click()}
      >
        <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
        {url ? (
          <>
            <img src={url} alt="Portada" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button onClick={e => { e.stopPropagation(); ref.current?.click(); }}
                className="p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30"><Pencil size={12} /></button>
              <button onClick={e => { e.stopPropagation(); onChange(null); }}
                className="p-1.5 rounded-lg bg-red-500/80 text-white hover:bg-red-600"><X size={12} /></button>
            </div>
          </>
        ) : loading ? (
          <Loader2 size={18} className="animate-spin text-muted-foreground" />
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-muted-foreground/50">
            <ImageIcon size={20} />
            <span className="text-[11px]">Subir imagen</span>
          </div>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground/40">1280×720 · JPG o PNG · máx 2 MB</p>
    </div>
  );
}

// ─── Wizard: nuevo curso ────────────────────────────────────────────────────────
const COURSE_WIZARD_STEPS = ["info", "planes"] as const;
type CourseWizardStep = typeof COURSE_WIZARD_STEPS[number];
const COURSE_WIZARD_LABELS: Record<CourseWizardStep, string> = { info: "Información Básica", planes: "Planes" };

// ─── Planes de precio (recurrente o pago único) ────────────────────────────────
function addInterval(date: Date, interval: RecurringInterval): Date {
  const d = new Date(date);
  switch (interval) {
    case "semanal": d.setDate(d.getDate() + 7); break;
    case "trimestral": d.setMonth(d.getMonth() + 3); break;
    case "semestral": d.setMonth(d.getMonth() + 6); break;
    case "anual": d.setFullYear(d.getFullYear() + 1); break;
    default: d.setMonth(d.getMonth() + 1); break; // mensual (y fallback)
  }
  return d;
}

function NewCourseWizard({ onCancel, onCreated }: { onCancel: () => void; onCreated: (course: CrmCourse) => void }) {
  const upsertCourse        = useUpsertCourse();
  const upsertCoursePlan    = useUpsertCoursePlan();
  const upsertPrices        = useUpsertPrices();
  const upsertPaymentMethod = useUpsertPaymentMethod();
  const draftId = useRef(crypto.randomUUID()).current;

  const [step, setStep]                 = useState(0);
  const [title, setTitle]               = useState("");
  const [description, setDescription]   = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [slug, setSlug]                 = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const slugEdited = useRef(false);
  const [draftPlans, setDraftPlans]     = useState<DraftPlan[]>([]);
  const planKeyRef = useRef(0);
  const [saving, setSaving]             = useState(false);

  const handleTitleChange = (v: string) => {
    setTitle(v);
    if (!slugEdited.current) setSlug(slugify(v));
  };

  const addDraftPlan = () => setDraftPlans(list => [...list, emptyDraftPlan(planKeyRef.current++)]);
  const updateDraftPlan = (key: number, next: DraftPlan) => setDraftPlans(list => list.map(p => p._key === key ? next : p));
  const removeDraftPlan = (key: number) => setDraftPlans(list => list.filter(p => p._key !== key));

  const safeStep    = Math.min(step, COURSE_WIZARD_STEPS.length - 1);
  const currentStep = COURSE_WIZARD_STEPS[safeStep];
  const TOTAL       = COURSE_WIZARD_STEPS.length;
  const isLast      = safeStep === TOTAL - 1;

  const handleCreate = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const manualSlug = slugEdited.current;
      const baseSlug = (slug.trim() ? slugify(slug.trim()) : slugify(title.trim())) || "curso";
      const maxAttempts = manualSlug ? 1 : 6;
      let course: CrmCourse | null = null;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const trySlug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
        try {
          course = await upsertCourse.mutateAsync({
            title: title.trim(), description: description || null, slug: trySlug,
            is_published: false, thumbnail_url: thumbnailUrl,
          });
          break;
        } catch (err) {
          const message = err instanceof Error ? err.message : "";
          if (!message.includes("unique") || attempt === maxAttempts - 1) throw err;
        }
      }
      if (!course) throw new Error("No se pudo crear el curso");

      for (let i = 0; i < draftPlans.length; i++) {
        const dp = draftPlans[i];
        if (!dp.name.trim()) continue;
        const plan = await upsertCoursePlan.mutateAsync({
          course_id: course.id,
          name: dp.name.trim(),
          price: dp.price ? parseFloat(dp.price) : 0,
          currency: dp.currency,
          discount_pct: dp.discountPct,
          is_recurring: dp.isRecurring,
          recurring_price: dp.isRecurring && dp.recurringPrice ? parseFloat(dp.recurringPrice) : null,
          recurring_currency: dp.isRecurring ? dp.currency : null,
          recurring_interval: dp.isRecurring ? dp.recurringInterval : null,
          recurring_discount_pct: dp.isRecurring ? dp.recurringDiscountPct : 0,
          sort_order: i,
        });
        if (dp.prices.length > 0) {
          await upsertPrices.mutateAsync({ entityType: "course_plan", entityId: plan.id, prices: dp.prices });
        }
        for (const pm of dp.paymentMethods) {
          await upsertPaymentMethod.mutateAsync({
            entity_type: "course_plan",
            entity_id: plan.id,
            type: pm.type!,
            label: pm.label ?? null,
            content: pm.content!,
            sort_order: pm.sort_order ?? 0,
            price_id: null,
            currency: pm.currency ?? null,
          });
        }
      }

      onCreated(course);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("unique")) {
        setShowAdvanced(true);
        toast.error("Ya existe un curso con esa URL — personalízala en Opciones avanzadas");
      } else {
        toast.error("Error al crear curso");
      }
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <button onClick={onCancel} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-3 transition-colors">
          <ArrowLeft size={12} /> Cancelar
        </button>
        <h2 className="text-lg font-semibold">Nuevo curso</h2>
        <p className="text-sm text-muted-foreground">{COURSE_WIZARD_LABELS[currentStep]} — Paso {safeStep + 1} de {TOTAL}</p>
      </div>

      <div className="flex items-center gap-2">
        {COURSE_WIZARD_STEPS.map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold transition-colors ${
              i <= safeStep ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}>
              {i < safeStep ? <Check size={12} /> : i + 1}
            </div>
            {i < TOTAL - 1 && <div className={`flex-1 h-0.5 rounded w-6 ${i < safeStep ? "bg-primary" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      <div className="bg-card border rounded-2xl p-6">
        <h3 className="text-sm font-semibold mb-4">{COURSE_WIZARD_LABELS[currentStep]}</h3>

        {currentStep === "info" && (
          <div className="space-y-4">
            <CoverUploader url={thumbnailUrl} onChange={setThumbnailUrl} draftId={draftId} />
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Nombre del curso *</label>
              <Input value={title} onChange={e => handleTitleChange(e.target.value)} placeholder="Ej: Marketing Digital desde Cero" className="h-9 text-sm" autoFocus />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Descripción <span className="text-[10px]">(opcional)</span></label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Breve descripción del curso" className="h-9 text-sm" />
            </div>

            <div className="pt-1 border-t border-border/50">
              <button onClick={() => setShowAdvanced(v => !v)}
                className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors pt-2">
                {showAdvanced ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                Opciones avanzadas
              </button>
              {showAdvanced && (
                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-medium text-muted-foreground">Slug (URL)</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground/60 shrink-0">/curso/</span>
                    <Input
                      value={slug}
                      onChange={e => { slugEdited.current = true; setSlug(slugify(e.target.value)); }}
                      placeholder={slugify(title) || "marketing-digital"}
                      className="h-9 text-sm font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground/40">Se genera automáticamente a partir del nombre. Solo cámbialo si necesitas una URL específica.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === "planes" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Crea uno o más planes de precio (pago único o recurrente). Si no creas ninguno, el curso queda sin precio — podrás dar acceso a alumnos igual, solo que no se registrará venta automática.
            </p>
            {draftPlans.map(p => (
              <DraftPlanCard key={p._key} plan={p} onChange={next => updateDraftPlan(p._key, next)} onRemove={() => removeDraftPlan(p._key)} />
            ))}
            <button onClick={addDraftPlan} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Plus size={12} /> Añadir plan
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-2 justify-between">
        {safeStep > 0 && (
          <Button variant="outline" size="sm" onClick={() => setStep(s => s - 1)} className="h-9 text-xs">
            <ArrowLeft size={12} className="mr-1" /> Atrás
          </Button>
        )}
        <div className="flex gap-2 ml-auto">
          {isLast ? (
            <Button onClick={handleCreate} disabled={saving || !title.trim()} className="h-9 px-5 gap-1.5">
              {saving ? <Loader2 size={13} className="animate-spin" /> : null}
              {saving ? "Creando..." : "Crear curso"}
            </Button>
          ) : (
            <Button size="sm" onClick={() => setStep(s => s + 1)} disabled={!title.trim()} className="h-9 text-xs">
              Continuar →
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

type CourseTab = "contenido" | "alumnos" | "informacion" | "planes" | "ajustes";

function CrmCoursesContent({ onExit }: { onExit: () => void }) {
  const { data: courses = [], isLoading } = useCourses();
  const upsertCourse = useUpsertCourse();

  const [selected, setSelected]   = useState<CrmCourse | null>(null);
  const [activeTab, setActiveTab] = useState<CourseTab>("contenido");
  const [creating, setCreating]   = useState(false);

  const handleTogglePublish = async (course: CrmCourse) => {
    try {
      await upsertCourse.mutateAsync({ id: course.id, is_published: !course.is_published });
      toast.success(course.is_published ? "Curso despublicado" : "Curso publicado");
      if (selected?.id === course.id) setSelected(prev => prev ? { ...prev, is_published: !prev.is_published } : null);
    } catch {
      toast.error("Error al cambiar estado");
    }
  };

  // ── Wizard: nuevo curso ──
  if (creating) {
    return (
      <NewCourseWizard
        onCancel={() => setCreating(false)}
        onCreated={course => { setCreating(false); setSelected(course); setActiveTab("contenido"); }}
      />
    );
  }

  // ── Vista detalle ──
  if (selected) {
    return (
      <CourseDetail
        course={selected}
        tab={activeTab}
        onTabChange={setActiveTab}
        onBack={() => setSelected(null)}
        onTogglePublish={() => handleTogglePublish(selected)}
      />
    );
  }

  // ── Lista de cursos ──
  return (
    <div className="space-y-4">

      <button onClick={onExit} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={12} /> Volver
      </button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Cursos</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Crea y gestiona cursos con acceso por email</p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)} className="h-9 gap-1.5">
          <Plus size={14} /> Nuevo curso
        </Button>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin text-muted-foreground/50" />
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto">
            <GraduationCap size={26} className="text-muted-foreground/30" />
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Aún no tienes cursos</p>
            <p className="text-xs text-muted-foreground/50 mt-0.5">Crea tu primer curso y comparte el link con tus alumnos</p>
          </div>
          <Button size="sm" onClick={() => setCreating(true)} className="gap-1.5 mx-auto"><Plus size={13} /> Nuevo curso</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map(course => (
            <CourseGridCard key={course.id} course={course} onClick={() => { setSelected(course); setActiveTab("contenido"); }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Card del grid de cursos ────────────────────────────────────────────────────
function CourseGridCard({ course, onClick }: { course: CrmCourse; onClick: () => void }) {
  const { data: plans = [] } = useCoursePlans(course.id);
  const cheapestPlan = plans
    .filter(p => p.is_active)
    .reduce<CrmCoursePlan | null>((min, p) => (min === null || planFinalPrice(p) < planFinalPrice(min) ? p : min), null);

  return (
    <div
      className="group bg-card border rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-muted overflow-hidden">
        {course.thumbnail_url ? (
          <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary/5 to-primary/10">
            <BookOpen size={28} className="text-primary/30" />
          </div>
        )}
        {/* Status badge overlay */}
        <div className="absolute top-2.5 left-2.5">
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full backdrop-blur-sm ${
            course.is_published
              ? "bg-emerald-500/90 text-white"
              : "bg-black/50 text-white/70"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              course.is_published ? "bg-white animate-pulse" : "bg-white/40"
            }`} />
            {course.is_published ? "Online" : "Offline"}
          </span>
        </div>
        {cheapestPlan && (
          <div className="absolute top-2.5 right-2.5">
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-primary/90 text-white backdrop-blur-sm">
              Desde {getCurrencyFlag(cheapestPlan.currency)} {formatAmount(planFinalPrice(cheapestPlan), cheapestPlan.currency)}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex-1 space-y-1">
          <p className="text-sm font-semibold leading-snug line-clamp-2">{course.title}</p>
          {course.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{course.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Vista detalle del curso ──────────────────────────────────────────────────
function CourseDetail({
  course, tab, onTabChange, onBack, onTogglePublish,
}: {
  course: CrmCourse;
  tab: CourseTab;
  onTabChange: (t: CourseTab) => void;
  onBack: () => void;
  onTogglePublish: () => void;
}) {
  const upsertCourse   = useUpsertCourse();
  const deleteCourse   = useDeleteCourse();
  const insertLog      = useInsertLog();
  const upsertFaqs     = useUpsertFaqs();
  const upsertPlan     = useUpsertCoursePlan();
  const upsertPlanPrices        = useUpsertPrices();
  const upsertPlanPaymentMethod = useUpsertPaymentMethod();
  const { data: plans = [] } = useCoursePlans(course.id);
  const thumbInputRef  = useRef<HTMLInputElement>(null);

  const [showMobileContent, setShowMobileContent] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // Nuevo plan — se muestra como borrador en memoria; solo se guarda al hacer clic en "Guardar plan"
  const [newPlanDraft, setNewPlanDraft] = useState<DraftPlan | null>(null);
  const [savingNewPlan, setSavingNewPlan] = useState(false);
  const handleStartAddPlan = () => setNewPlanDraft(emptyDraftPlan(0));
  const handleCancelAddPlan = () => setNewPlanDraft(null);
  const handleSaveNewPlan = async () => {
    if (!newPlanDraft || !newPlanDraft.name.trim()) return;
    setSavingNewPlan(true);
    try {
      const created = await upsertPlan.mutateAsync({
        course_id: course.id,
        name: newPlanDraft.name.trim(),
        price: newPlanDraft.price ? parseFloat(newPlanDraft.price) : 0,
        currency: newPlanDraft.currency,
        discount_pct: newPlanDraft.discountPct,
        is_recurring: newPlanDraft.isRecurring,
        recurring_price: newPlanDraft.isRecurring && newPlanDraft.recurringPrice ? parseFloat(newPlanDraft.recurringPrice) : null,
        recurring_currency: newPlanDraft.isRecurring ? newPlanDraft.currency : null,
        recurring_interval: newPlanDraft.isRecurring ? newPlanDraft.recurringInterval : null,
        recurring_discount_pct: newPlanDraft.isRecurring ? newPlanDraft.recurringDiscountPct : 0,
        sort_order: plans.length,
      });
      if (newPlanDraft.prices.length > 0) {
        await upsertPlanPrices.mutateAsync({ entityType: "course_plan", entityId: created.id, prices: newPlanDraft.prices });
      }
      for (const pm of newPlanDraft.paymentMethods) {
        await upsertPlanPaymentMethod.mutateAsync({
          entity_type: "course_plan",
          entity_id: created.id,
          type: pm.type!,
          label: pm.label ?? null,
          content: pm.content!,
          sort_order: pm.sort_order ?? 0,
          price_id: null,
          currency: pm.currency ?? null,
        });
      }
      toast.success("Plan creado");
      setNewPlanDraft(null);
    } catch {
      toast.error("Error al crear el plan");
    } finally {
      setSavingNewPlan(false);
    }
  };

  // Portada
  const [thumbLoading, setThumbLoading] = useState(false);
  const [thumbUrl, setThumbUrl]         = useState<string | null>(course.thumbnail_url);

  // Información
  const [name, setName]               = useState(course.title);
  const [description, setDescription] = useState(course.description ?? "");
  const [slug, setSlug]               = useState(course.slug);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Copiar link (usa el slug editado en vivo, no el de props que puede quedar desactualizado)
  const [copied, setCopied] = useState(false);
  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${APP_URL}/curso/${course.user_id}/${slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // FAQs
  const { data: existingFaqs = [] } = useFaqsByEntity("course", course.id);
  const [faqs, setFaqs] = useState<FaqEntry[]>([]);
  const faqsRef       = useRef(faqs);
  const faqsSaveTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    setFaqs(existingFaqs.map(f => ({ question: f.question, answer: f.answer })));
  }, [existingFaqs]);
  const handleFaqsChange = (next: FaqEntry[]) => {
    setFaqs(next);
    faqsRef.current = next;
    clearTimeout(faqsSaveTimer.current);
    faqsSaveTimer.current = setTimeout(() => {
      upsertFaqs.mutate(
        { entityType: "course", entityId: course.id, faqs: faqsRef.current },
        { onError: () => toast.error("Error al guardar las FAQs") }
      );
    }, 800);
  };
  useEffect(() => () => clearTimeout(faqsSaveTimer.current), []);

  // Autoguardado de nombre/descripción/slug
  const isFirstRender = useRef(true);
  const saveTimer      = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    clearTimeout(saveTimer.current);
    setAutoSaveStatus("saving");
    saveTimer.current = setTimeout(async () => {
      try {
        await upsertCourse.mutateAsync({
          id: course.id,
          title: name.trim() || course.title,
          description: description || null,
          slug: slugify(slug.trim()) || course.slug,
        });
        setAutoSaveStatus("saved");
        setTimeout(() => setAutoSaveStatus("idle"), 2000);
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        toast.error(message.includes("unique") ? "Ya existe un curso con esa URL — cámbiala en Opciones avanzadas" : "Error al guardar");
        setAutoSaveStatus("idle");
      }
    }, 800);
    return () => clearTimeout(saveTimer.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, description, slug]);

  // Eliminar curso
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]           = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteCourse.mutateAsync(course.id);
      insertLog.mutateAsync({ action: "delete", entity: "curso", entity_id: course.id, description: `Curso eliminado: ${name}` }).catch(() => {});
      toast.success("Curso eliminado");
      onBack();
    } catch {
      toast.error("Error al eliminar el curso");
      setDeleting(false);
    }
  };

  const handleThumbChange = async (file: File) => {
    setThumbLoading(true);
    try {
      const ext  = file.name.split(".").pop() ?? "jpg";
      const path = `course-thumbnails/${course.id}.${ext}`;
      const { error } = await supabase.storage.from("form-uploads").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("form-uploads").getPublicUrl(path);
      await upsertCourse.mutateAsync({ id: course.id, thumbnail_url: publicUrl });
      setThumbUrl(publicUrl);
      toast.success("Portada actualizada");
    } catch {
      toast.error("Error al subir la portada");
    } finally {
      setThumbLoading(false);
    }
  };

  const TABS = [
    { id: "contenido"   as const, label: "Contenido",   description: "Módulos y lecciones",              icon: BookOpen },
    { id: "alumnos"     as const, label: "Alumnos",      description: "Acceso de alumnos",                icon: Users },
    { id: "informacion" as const, label: "Información",  description: "Portada, nombre, descripción y FAQs", icon: Info },
    { id: "planes"      as const, label: "Planes",       description: "Planes de precio, pago único o recurrente", icon: DollarSign },
    { id: "ajustes"     as const, label: "Ajustes",      description: "Publicación y eliminar curso",     icon: SlidersHorizontal },
  ];
  const activeTabDef = TABS.find(t => t.id === tab) ?? TABS[0];

  const StatusPill = () => (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
      course.is_published
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
        : "bg-muted text-muted-foreground"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${course.is_published ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40"}`} />
      {course.is_published ? "Online" : "Offline"}
    </span>
  );

  const handleSelectTab = (id: CourseTab) => {
    onTabChange(id);
    setShowMobileContent(true);
  };

  const PortadaSection = () => (
    <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/20">
      <div
        className={`relative w-28 h-16 sm:w-36 sm:h-20 rounded-lg overflow-hidden border shrink-0 group/thumb ${thumbLoading ? "cursor-wait" : "cursor-pointer"}`}
        onClick={() => !thumbLoading && thumbInputRef.current?.click()}
      >
        {thumbUrl ? (
          <img src={thumbUrl} alt="Portada" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center">
            <ImageIcon size={14} className="text-muted-foreground/30" />
          </div>
        )}
        <div className={`absolute inset-0 bg-black/60 transition-opacity flex items-center justify-center ${thumbLoading ? "opacity-100" : "opacity-0 group-hover/thumb:opacity-100"}`}>
          {thumbLoading
            ? <Loader2 size={14} className="text-white animate-spin" />
            : <ImageIcon size={14} className="text-white" />}
        </div>
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-xs font-semibold text-muted-foreground">Portada del curso</p>
        <button
          onClick={() => !thumbLoading && thumbInputRef.current?.click()}
          className="text-[11px] text-primary hover:text-primary/80 font-medium transition-colors cursor-pointer"
        >
          {thumbUrl ? "Cambiar imagen" : "Subir imagen"}
        </button>
        <p className="text-[10px] text-muted-foreground/40 leading-tight">1280×720 · JPG o PNG · máx 2 MB</p>
      </div>
      <input ref={thumbInputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleThumbChange(f); e.target.value = ""; }} />
    </div>
  );

  const renderTabContent = () => (
    <>
      {tab === "contenido" && <LessonsTab course={course} />}
      {tab === "alumnos"   && <AlumnosTab course={course} />}

      {tab === "informacion" && (
        <div className="space-y-6">
          <div className="bg-card border rounded-2xl p-6 space-y-4">
            <PortadaSection />
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Nombre del curso</label>
              <Input value={name} onChange={e => setName(e.target.value)} className="h-9 text-sm" placeholder="Ej: Marketing Digital desde Cero" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Descripción <span className="text-[10px]">(opcional)</span></label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Breve descripción del curso" className="h-9 text-sm" />
            </div>

            <div className="pt-1 border-t border-border/50">
              <button onClick={() => setShowAdvanced(v => !v)}
                className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors pt-2">
                {showAdvanced ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                Opciones avanzadas
              </button>
              {showAdvanced && (
                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-medium text-muted-foreground">Slug (URL)</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground/60 shrink-0">/curso/</span>
                    <Input value={slug} onChange={e => setSlug(slugify(e.target.value))} className="h-9 text-sm font-mono" />
                  </div>
                  <p className="text-[10px] text-muted-foreground/40">Cambiarlo invalida los links que ya compartiste con tus alumnos.</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-card border rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-semibold">FAQs</h2>
            <FaqEditor value={faqs} onChange={handleFaqsChange} />
          </div>
        </div>
      )}

      {tab === "planes" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Cada plan puede ser de pago único o recurrente, con sus propios precios en otras monedas y métodos de pago.
            Si no hay ningún plan, el curso queda sin precio (acceso gratuito o venta manual).
          </p>

          {plans.map(p => <PlanRow key={p.id} plan={p} courseId={course.id} />)}

          {newPlanDraft && (
            <div className="space-y-2">
              <DraftPlanCard plan={newPlanDraft} onChange={setNewPlanDraft} onRemove={handleCancelAddPlan} />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveNewPlan} disabled={savingNewPlan || !newPlanDraft.name.trim()} className="gap-1.5">
                  {savingNewPlan && <Loader2 size={12} className="animate-spin" />} Guardar plan
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancelAddPlan}>Cancelar</Button>
              </div>
            </div>
          )}

          {!newPlanDraft && (
            plans.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border py-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto">
                  <DollarSign size={22} className="text-muted-foreground/30" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Aún no tienes planes</p>
                  <p className="text-xs text-muted-foreground/50 mt-0.5">Crea tu primer plan de precio para este curso</p>
                </div>
                <Button size="sm" onClick={handleStartAddPlan} className="gap-1.5 mx-auto">
                  <Plus size={13} /> Añadir plan
                </Button>
              </div>
            ) : (
              <button onClick={handleStartAddPlan} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Plus size={12} /> Añadir plan
              </button>
            )
          )}
        </div>
      )}

      {tab === "ajustes" && (
        <div className="space-y-6">
          <div className="bg-card border rounded-2xl p-6 space-y-3">
            <h2 className="text-sm font-semibold">Estado</h2>
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <div
                onClick={onTogglePublish}
                className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${course.is_published ? "bg-primary" : "bg-secondary border"}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${course.is_published ? "translate-x-5" : ""}`} />
              </div>
              <span className="text-sm">{course.is_published ? "Online" : "Offline"}</span>
            </label>
            <p className="text-xs text-muted-foreground/70">Los cursos offline no son visibles ni accesibles para tus alumnos.</p>
          </div>

          <div className="bg-card border rounded-2xl p-6 space-y-3">
            <h2 className="text-sm font-semibold">Link público</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <code className="flex-1 min-w-0 text-xs font-mono px-3 py-2 rounded-lg bg-muted/50 border truncate">
                {`${APP_URL}/curso/${course.user_id}/${slug}`}
              </code>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button variant="outline" size="sm" onClick={handleCopyLink} className="h-8 text-xs gap-1.5">
                  {copied ? <Check size={12} className="text-emerald-500" /> : <Link2 size={12} />} Copiar
                </Button>
                <a href={`/curso/${course.user_id}/${slug}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                    <ExternalLink size={12} /> Ir
                  </Button>
                </a>
              </div>
            </div>
          </div>

          <div className="bg-card border border-destructive/20 rounded-2xl p-6 space-y-3">
            <h2 className="text-sm font-semibold text-destructive">Eliminar curso</h2>
            <p className="text-xs text-muted-foreground">Se eliminarán todos los módulos, lecciones y accesos de alumnos. Esta acción no se puede deshacer.</p>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(true)}
              className="text-destructive hover:bg-destructive/10 border-destructive/30"
            >
              <Trash2 size={13} className="mr-1.5" /> Eliminar curso
            </Button>
          </div>
        </div>
      )}
    </>
  );

  const HeaderBlock = () => (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div className="min-w-0">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-3 transition-colors">
          <ArrowLeft size={12} /> Volver a cursos
        </button>
        <h2 className="text-lg font-semibold truncate">{name || "Curso"}</h2>
      </div>
      {autoSaveStatus !== "idle" && (
        <span className="text-xs text-muted-foreground flex items-center gap-1.5 shrink-0">
          {autoSaveStatus === "saving" ? (
            <><Loader2 size={11} className="animate-spin" />Guardando...</>
          ) : (
            <><span className="text-green-500 font-semibold">✓</span> Guardado</>
          )}
        </span>
      )}
    </div>
  );

  return (
    <>
      <DeleteConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        onConfirm={handleDelete}
        isPending={deleting}
        description={`Se eliminarán todos los módulos, lecciones y accesos de alumnos de "${name}". Esta acción no se puede deshacer.`}
      />

      {/* ── Mobile ── */}
      <div className="lg:hidden">
        {!showMobileContent ? (
          <div className="space-y-6">
            <HeaderBlock />
            <div className="bg-card border rounded-2xl overflow-hidden divide-y divide-border/50">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleSelectTab(t.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-secondary/60 transition-colors"
                >
                  <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                    <t.icon size={15} className="text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight flex items-center gap-1.5">
                      {t.label}
                      {t.id === "ajustes" && <StatusPill />}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{t.description}</p>
                  </div>
                  <ChevronRight size={14} className="shrink-0 text-muted-foreground/30" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <button
              onClick={() => setShowMobileContent(false)}
              className="flex items-center gap-0.5 text-primary text-sm font-medium -ml-1 hover:opacity-75 transition-opacity"
            >
              <ChevronLeft size={20} />
              {name || "Curso"}
            </button>
            <div>
              <h2 className="text-xl font-semibold leading-tight flex items-center gap-2">
                {activeTabDef.label}
                {tab === "ajustes" && <StatusPill />}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">{activeTabDef.description}</p>
            </div>
            {renderTabContent()}
          </div>
        )}
      </div>

      {/* ── Desktop ── */}
      <div className="hidden lg:block space-y-6">
        <HeaderBlock />

        <div className="overflow-x-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          <div className="inline-flex items-center gap-0.5 bg-secondary/60 rounded-xl p-1 min-w-max">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => onTabChange(t.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  tab === t.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}>
                <t.icon size={13} className="shrink-0" /> {t.label}
                {t.id === "ajustes" && <StatusPill />}
              </button>
            ))}
          </div>
        </div>
        {renderTabContent()}
      </div>
    </>
  );
}

// ─── Fila de plan (edición en vivo, autoguardado) ──────────────────────────────
function PlanRow({ plan, courseId }: { plan: CrmCoursePlan; courseId: string }) {
  const upsertPlan   = useUpsertCoursePlan();
  const deletePlan   = useDeleteCoursePlan();
  const upsertPrices = useUpsertPrices();

  const [expanded, setExpanded] = useState(false);
  const [name, setName]                             = useState(plan.name);
  const [price, setPrice]                           = useState(plan.price != null ? String(plan.price) : "");
  const [currency, setCurrency]                     = useState(plan.currency);
  const [discountPct, setDiscountPct]               = useState(plan.discount_pct ?? 0);
  const [isRecurring, setIsRecurring]               = useState(plan.is_recurring);
  const [recurringPrice, setRecurringPrice]         = useState(plan.recurring_price != null ? String(plan.recurring_price) : "");
  const [recurringInterval, setRecurringInterval]   = useState<CrmCoursePlan["recurring_interval"]>(plan.recurring_interval ?? "mensual");
  const [recurringDiscountPct, setRecurringDiscountPct] = useState(plan.recurring_discount_pct ?? 0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]           = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const { data: existingPrices = [] } = usePricesByEntity("course_plan", plan.id);
  const [prices, setPrices] = useState<PriceEntry[]>([]);
  useEffect(() => {
    setPrices(existingPrices.map(p => ({ currency: p.currency, price: p.price, discount_pct: p.discount_pct ?? null })));
  }, [existingPrices]);
  const pricesSaveTimer = useRef<ReturnType<typeof setTimeout>>();
  const handlePricesChange = (next: PriceEntry[]) => {
    setPrices(next);
    clearTimeout(pricesSaveTimer.current);
    pricesSaveTimer.current = setTimeout(() => {
      upsertPrices.mutate(
        { entityType: "course_plan", entityId: plan.id, prices: next },
        { onError: () => toast.error("Error al guardar los precios adicionales del plan") }
      );
    }, 800);
  };
  useEffect(() => () => clearTimeout(pricesSaveTimer.current), []);

  const isFirstRender = useRef(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    clearTimeout(saveTimer.current);
    setAutoSaveStatus("saving");
    saveTimer.current = setTimeout(async () => {
      try {
        await upsertPlan.mutateAsync({
          id: plan.id,
          course_id: courseId,
          name: name.trim() || plan.name,
          price: price ? parseFloat(price) : 0,
          currency,
          discount_pct: discountPct,
          is_recurring: isRecurring,
          recurring_price: isRecurring && recurringPrice ? parseFloat(recurringPrice) : null,
          recurring_currency: isRecurring ? currency : null,
          recurring_interval: isRecurring ? recurringInterval : null,
          recurring_discount_pct: isRecurring ? recurringDiscountPct : 0,
        });
        setAutoSaveStatus("saved");
        setTimeout(() => setAutoSaveStatus("idle"), 1500);
      } catch {
        toast.error("Error al guardar el plan");
        setAutoSaveStatus("idle");
      }
    }, 800);
    return () => clearTimeout(saveTimer.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, price, currency, discountPct, isRecurring, recurringPrice, recurringInterval, recurringDiscountPct]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deletePlan.mutateAsync({ id: plan.id, courseId });
      toast.success("Plan eliminado");
    } catch {
      toast.error("Error al eliminar el plan");
      setDeleting(false);
    }
  };

  const recurringFinal = planFinalRecurringPrice(plan);
  const priceSummary = `${formatAmount(planFinalPrice(plan), plan.currency)}${
    plan.is_recurring && recurringFinal != null
      ? ` + ${formatAmount(recurringFinal, plan.recurring_currency ?? plan.currency)}/${INTERVAL_LABELS[plan.recurring_interval ?? "mensual"]}`
      : ""
  }`;

  const deleteDialog = (
    <DeleteConfirmDialog
      open={confirmDelete}
      onOpenChange={setConfirmDelete}
      onConfirm={handleDelete}
      isPending={deleting}
      description={`Se eliminará el plan "${plan.name}" permanentemente.`}
    />
  );

  if (!expanded) {
    return (
      <>
        {deleteDialog}
        <button
          onClick={() => setExpanded(true)}
          className="w-full flex items-center gap-3 bg-secondary/20 border rounded-xl px-4 py-3 hover:border-primary/40 transition-colors text-left"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{plan.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{priceSummary}</p>
          </div>
          <ChevronRight size={14} className="shrink-0 text-muted-foreground/40" />
        </button>
      </>
    );
  }

  return (
    <div className="bg-secondary/20 border rounded-xl p-4 space-y-3">
      {deleteDialog}
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => setExpanded(false)} className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
          <ChevronDown size={13} />
          {plan.name}
          {autoSaveStatus === "saving" && <Loader2 size={11} className="animate-spin" />}
          {autoSaveStatus === "saved" && <Check size={11} className="text-emerald-500" />}
        </button>
        <button onClick={() => setConfirmDelete(true)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 size={13} />
        </button>
      </div>
      <PlanFields
        name={name} price={price} currency={currency} discountPct={discountPct}
        isRecurring={isRecurring} recurringPrice={recurringPrice} recurringInterval={recurringInterval} recurringDiscountPct={recurringDiscountPct}
        onChange={patch => {
          if (patch.name !== undefined) setName(patch.name);
          if (patch.price !== undefined) setPrice(patch.price);
          if (patch.currency !== undefined) setCurrency(patch.currency);
          if (patch.discountPct !== undefined) setDiscountPct(patch.discountPct);
          if (patch.isRecurring !== undefined) setIsRecurring(patch.isRecurring);
          if (patch.recurringPrice !== undefined) setRecurringPrice(patch.recurringPrice);
          if (patch.recurringInterval !== undefined) setRecurringInterval(patch.recurringInterval);
          if (patch.recurringDiscountPct !== undefined) setRecurringDiscountPct(patch.recurringDiscountPct);
        }}
      />
      <div className="pt-2 border-t border-border/50 space-y-1.5">
        <label className="text-[11px] text-muted-foreground">Precio en otra moneda (opcional)</label>
        <PriceListEditor value={prices} onChange={handlePricesChange} baseCurrency={currency} />
      </div>
      <div className="pt-2 border-t border-border/50 space-y-2">
        <div className="flex items-center gap-1.5">
          <CreditCard size={12} className="text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Métodos de pago</span>
        </div>
        <PaymentMethodsEditor entityType="course_plan" entityId={plan.id} prices={existingPrices} baseCurrency={currency} />
      </div>
    </div>
  );
}

// ─── Subida de video ──────────────────────────────────────────────────────────
function VideoSection({ lesson }: { lesson: CrmCourseLesson }) {
  const upsertLesson = useUpsertCourseLesson();
  const [removing, setRemoving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadCtx = useVideoUpload();
  const entry = uploadCtx.get(lesson.id);

  // Estado local para video ID y status (fuente de verdad cuando no hay upload activo)
  const [localVideoId, setLocalVideoId] = useState(lesson.bunny_video_id);
  const [localStatus, setLocalStatus]   = useState<CrmCourseLesson["video_status"]>(lesson.video_status ?? "none");

  // Cuando un upload en contexto termina (posiblemente mientras el editor estaba cerrado),
  // sincronizar el estado local y limpiar el contexto
  useEffect(() => {
    if (!entry) return;
    if (!entry.uploading) {
      setLocalVideoId(entry.videoId);
      setLocalStatus(entry.error ? "error" : "ready");
      uploadCtx.clear(lesson.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.uploading]);

  const uploading = entry?.uploading ?? false;
  const progress  = entry?.progress ?? 0;
  const videoId   = entry ? entry.videoId : localVideoId;
  const status    = uploading ? "uploading" : (localStatus ?? "none");
  const hasVideo  = !!videoId && (status === "ready" || status === "processing");

  const startUpload = async (file: File) => {
    try {
      const { data, error } = await supabase.functions.invoke("get-bunny-upload-url", {
        body: { action: "create", title: lesson.title },
      });
      if (error || !data?.bunnyVideoId) throw new Error("Error al iniciar la subida");
      const { bunnyVideoId, tusExpire, tusSignature, libraryId } = data as {
        bunnyVideoId: string; tusExpire: number; tusSignature: string; libraryId: string;
      };
      setLocalVideoId(bunnyVideoId);
      await upsertLesson.mutateAsync({ id: lesson.id, course_id: lesson.course_id, bunny_video_id: bunnyVideoId, video_status: "uploading" });

      // Capturar IDs en variables para que los callbacks no dependan del closure de lesson
      const lessonId   = lesson.id;
      const courseId   = lesson.course_id;

      const upload = new tus.Upload(file, {
        endpoint: "https://video.bunnycdn.com/tusupload",
        retryDelays: [0, 3000, 5000, 10000],
        headers: { AuthorizationSignature: tusSignature, AuthorizationExpire: String(tusExpire), VideoId: bunnyVideoId, LibraryId: libraryId },
        metadata: { filetype: file.type, title: lesson.title },
        onProgress: (up, total) => uploadCtx.setProgress(lessonId, Math.round((up / total) * 100)),
        onSuccess: async () => {
          uploadCtx.complete(lessonId);
          await upsertLesson.mutateAsync({ id: lessonId, course_id: courseId, video_status: "ready" });
          toast.success("Video subido correctamente");
        },
        onError: async () => {
          uploadCtx.fail(lessonId);
          await upsertLesson.mutateAsync({ id: lessonId, course_id: courseId, video_status: "error" });
          toast.error("Error al subir el video");
        },
      });

      uploadCtx.register(lessonId, bunnyVideoId, upload);
      upload.start();
    } catch (err: any) {
      toast.error(err.message ?? "Error al iniciar la subida");
    }
  };

  const handleRemove = async () => {
    if (!videoId) return;
    setRemoving(true);
    try { await supabase.functions.invoke("get-bunny-upload-url", { body: { action: "delete", bunnyVideoId: videoId } }); } catch {}
    await upsertLesson.mutateAsync({ id: lesson.id, course_id: lesson.course_id, bunny_video_id: null, video_status: "none" });
    setLocalVideoId(null);
    setLocalStatus("none");
    setRemoving(false);
    toast.success("Video eliminado");
  };

  const handleCancelUpload = () => uploadCtx.cancel(lesson.id);

  if (uploading) return (
    <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">Subiendo video...</span>
        <div className="flex items-center gap-3">
          <span className="text-xs tabular-nums text-muted-foreground">{progress}%</span>
          <button onClick={handleCancelUpload} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
        </div>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );

  if (hasVideo) return (
    <div className="space-y-2">
      <div className="rounded-xl overflow-hidden border aspect-video bg-muted">
        <iframe src={`https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${videoId}?autoplay=false&preload=false`}
          className="w-full h-full" allow="accelerometer; gyroscope; encrypted-media; picture-in-picture" allowFullScreen />
      </div>
      {status === "processing" && <p className="text-[11px] text-muted-foreground flex items-center gap-1.5"><Loader2 size={10} className="animate-spin" /> Procesando...</p>}
      <button onClick={handleRemove} disabled={removing} className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 disabled:opacity-50 transition-colors">
        {removing ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />} Eliminar video
      </button>
    </div>
  );

  return (
    <div className="space-y-1.5">
      {status === "error" && <p className="text-xs text-red-500 flex items-center gap-1.5"><AlertCircle size={11} /> Error en la subida anterior</p>}
      <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) startUpload(f); e.target.value = ""; }} />
      <button onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl border border-dashed hover:border-primary/40 text-muted-foreground hover:text-foreground transition-colors">
        <Video size={13} /> {status === "error" ? "Reintentar subida" : "Subir video"}
      </button>
      <p className="text-[10px] text-muted-foreground/50">MP4, MOV, AVI · máx 2 GB</p>
    </div>
  );
}

// ─── Archivo complementario ───────────────────────────────────────────────────
function AttachmentSection({ lesson }: { lesson: CrmCourseLesson }) {
  const upsertLesson = useUpsertCourseLesson();
  const fileRef      = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving]   = useState(false);

  // Estado local para reflejar cambios sin depender del prop re-render
  const [localUrl, setLocalUrl]   = useState(lesson.attachment_url);
  const [localName, setLocalName] = useState(lesson.attachment_name);

  const handleUpload = async (file: File) => {
    if (file.size > 50 * 1024 * 1024) { toast.error("El archivo no puede superar 50 MB"); return; }
    setUploading(true);
    try {
      const ext  = file.name.split(".").pop() ?? "bin";
      const path = `course-attachments/${lesson.id}.${ext}`;
      const { error } = await supabase.storage.from("form-uploads").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("form-uploads").getPublicUrl(path);
      await upsertLesson.mutateAsync({ id: lesson.id, course_id: lesson.course_id, attachment_url: publicUrl, attachment_name: file.name });
      setLocalUrl(publicUrl);
      setLocalName(file.name);
      toast.success("Archivo adjunto guardado");
    } catch { toast.error("Error al subir el archivo"); }
    finally { setUploading(false); }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      if (localUrl) {
        const path = localUrl.split("/form-uploads/")[1];
        if (path) await supabase.storage.from("form-uploads").remove([path]);
      }
      await upsertLesson.mutateAsync({ id: lesson.id, course_id: lesson.course_id, attachment_url: null, attachment_name: null });
      setLocalUrl(null);
      setLocalName(null);
      toast.success("Archivo eliminado");
    } catch { toast.error("Error al eliminar el archivo"); }
    finally { setRemoving(false); }
  };

  if (localUrl) return (
    <div className="flex items-center gap-3 rounded-xl border bg-muted/30 px-3 py-2.5">
      <Paperclip size={12} className="text-muted-foreground shrink-0" />
      <p className="flex-1 text-xs font-medium truncate">{localName ?? "Archivo adjunto"}</p>
      <a href={localUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary hover:underline shrink-0">Ver</a>
      <button onClick={handleRemove} disabled={removing} className="text-muted-foreground hover:text-red-500 disabled:opacity-50 transition-colors shrink-0">
        {removing ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
      </button>
    </div>
  );

  return (
    <div className="space-y-1">
      <input ref={fileRef} type="file" accept=".pdf,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }} />
      <button onClick={() => fileRef.current?.click()} disabled={uploading}
        className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl border border-dashed hover:border-primary/40 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
        {uploading ? <Loader2 size={13} className="animate-spin" /> : <Paperclip size={13} />}
        {uploading ? "Subiendo..." : "Adjuntar archivo"}
      </button>
      <p className="text-[10px] text-muted-foreground/50">PDF, ZIP, Word, Excel · máx 50 MB</p>
    </div>
  );
}

// ─── Editor de lección (inline) ───────────────────────────────────────────────
function LessonEditor({
  courseId, moduleId, lesson, sortOrder, onSaved, onCancel, onDraftCreated,
}: {
  courseId: string; moduleId: string;
  lesson: CrmCourseLesson | null;
  sortOrder: number;
  onSaved: (l: CrmCourseLesson) => void;
  onCancel: () => void;
  onDraftCreated?: (id: string) => void;
}) {
  const upsertLesson = useUpsertCourseLesson();
  const deleteLesson = useDeleteCourseLesson();
  const [form, setForm]   = useState({ title: lesson?.title ?? "", content: lesson?.content ?? "" });
  const [saving, setSaving]   = useState(false);
  const [draft, setDraft]     = useState<CrmCourseLesson | null>(null);
  const [drafting, setDrafting] = useState(false);

  // Para lección nueva: crear borrador en DB al montar para tener ID inmediato
  useEffect(() => {
    if (lesson) return;
    setDrafting(true);
    upsertLesson.mutateAsync({ course_id: courseId, module_id: moduleId, title: "—", sort_order: sortOrder })
      .then(r => { setDraft(r); setDrafting(false); onDraftCreated?.(r.id); })
      .catch(() => { toast.error("Error al preparar lección"); setDrafting(false); onCancel(); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const current = lesson ?? draft;

  const handleSave = async () => {
    if (!form.title.trim() || !current) return;
    setSaving(true);
    try {
      const result = await upsertLesson.mutateAsync({
        id: current.id,
        course_id: courseId,
        module_id: moduleId,
        title: form.title.trim(),
        content: form.content || null,
        sort_order: current.sort_order,
      });
      toast.success(lesson ? "Lección guardada" : "Lección creada");
      onSaved(result);
    } catch { toast.error("Error al guardar la lección"); }
    finally { setSaving(false); }
  };

  const handleCancel = () => {
    // Borrar borrador vacío para no dejar huérfanos
    if (!lesson && draft && !draft.bunny_video_id && !draft.attachment_url) {
      deleteLesson.mutateAsync({ id: draft.id, courseId }).catch(() => {});
    }
    onCancel();
  };

  if (drafting) return (
    <div className="rounded-2xl border bg-card p-4 flex items-center gap-2.5">
      <Loader2 size={14} className="animate-spin text-muted-foreground shrink-0" />
      <p className="text-xs text-muted-foreground">Preparando lección...</p>
    </div>
  );

  return (
    <div className="rounded-2xl border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold text-muted-foreground flex-1">{lesson ? "Editar lección" : "Nueva lección"}</p>
        <button onClick={handleCancel} className="text-muted-foreground hover:text-foreground transition-colors"><X size={14} /></button>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Título *</label>
        <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ej: Introducción al módulo" className="h-9 text-sm" autoFocus />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Descripción</label>
        <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={3}
          placeholder="Descripción de la lección..."
          className="w-full rounded-xl border border-border bg-background text-sm px-3 py-2.5 resize-none outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
      </div>

      {current && (
        <div className="border-t pt-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Video size={11} /> Video</label>
            <VideoSection lesson={current} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Paperclip size={11} /> Archivo complementario</label>
            <AttachmentSection lesson={current} />
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={handleCancel} className="flex-1">Cancelar</Button>
        <Button size="sm" onClick={handleSave} disabled={saving || !form.title.trim() || !current} className="flex-1 gap-1.5">
          {saving && <Loader2 size={12} className="animate-spin" />}
          {lesson ? "Guardar cambios" : "Guardar lección"}
        </Button>
      </div>
    </div>
  );
}

// ─── Lección sortable ────────────────────────────────────────────────────────
function SortableLessonItem({
  lesson, idx, course, moduleId, isEditing, onEdit, onSaved, onCancelEdit, onDelete,
}: {
  lesson: CrmCourseLesson; idx: number; course: CrmCourse; moduleId: string;
  isEditing: boolean;
  onEdit: () => void; onSaved: () => void; onCancelEdit: () => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lesson.id,
    disabled: isEditing,
  });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const uploadCtx = useVideoUpload();
  const uploadEntry = uploadCtx.get(lesson.id);

  if (isEditing) {
    return (
      <div ref={setNodeRef} style={style}>
        <LessonEditor
          courseId={course.id} moduleId={moduleId}
          lesson={lesson} sortOrder={idx}
          onSaved={onSaved} onCancel={onCancelEdit}
        />
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style}
      className="group/lesson flex items-center gap-2 rounded-xl border bg-card px-3 py-2.5 hover:border-primary/30 hover:bg-muted/20 transition-all duration-150">
      <button {...attributes} {...listeners} title="Arrastrar para reordenar"
        className="cursor-grab active:cursor-grabbing text-muted-foreground/20 hover:text-muted-foreground/60 touch-none transition-colors shrink-0">
        <GripVertical size={12} />
      </button>
      <span className="text-[10px] font-bold text-muted-foreground/30 w-4 text-center shrink-0 tabular-nums">{idx + 1}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate">{lesson.title}</p>
        {lesson.content && <p className="text-[11px] text-muted-foreground/50 truncate mt-0.5">{lesson.content.slice(0, 60)}{lesson.content.length > 60 ? "…" : ""}</p>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {uploadEntry?.uploading && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center gap-0.5 font-medium">
            <Loader2 size={8} className="animate-spin" /> {uploadEntry.progress}%
          </span>
        )}
        {!uploadEntry?.uploading && lesson.bunny_video_id && lesson.video_status === "ready" && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5 font-medium">
            <Video size={8} /> Video
          </span>
        )}
        {lesson.attachment_url && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 flex items-center gap-0.5 font-medium">
            <Paperclip size={8} /> PDF
          </span>
        )}
        <div className="flex items-center gap-0.5 opacity-0 group-hover/lesson:opacity-100 transition-opacity">
          <button onClick={onEdit} className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <Pencil size={11} />
          </button>
          <button onClick={onDelete} className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sección de módulo (sortable) ────────────────────────────────────────────
function ModuleSection({
  mod, moduleIndex, lessons, course, expanded, onToggle, onDelete,
}: {
  mod: CrmCourseModule; moduleIndex: number;
  lessons: CrmCourseLesson[]; course: CrmCourse;
  expanded: boolean; onToggle: () => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: mod.id });
  const dragStyle = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 10 : undefined };

  const upsertModule  = useUpsertCourseModule();
  const upsertLesson  = useUpsertCourseLesson();
  const deleteLesson  = useDeleteCourseLesson();
  const insertLog     = useInsertLog();
  const [editingTitle, setEditingTitle]     = useState(false);
  const [modTitle, setModTitle]             = useState(mod.title);
  const [savingTitle, setSavingTitle]       = useState(false);
  const [editingLesson, setEditingLesson]   = useState<string | "new" | null>(null);
  const [draftLessonId, setDraftLessonId]   = useState<string | null>(null);
  const [orderedLessons, setOrderedLessons] = useState<CrmCourseLesson[]>(lessons);
  const [pendingDeleteLessonId, setPendingDeleteLessonId] = useState<string | null>(null);
  const [deletingLesson, setDeletingLesson] = useState(false);

  const lessonSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => { setOrderedLessons(lessons); }, [lessons]);

  const handleLessonDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const visible = orderedLessons.filter(l => l.id !== draftLessonId);
    const oldIdx = visible.findIndex(l => l.id === active.id);
    const newIdx = visible.findIndex(l => l.id === over.id);
    const reordered = arrayMove(visible, oldIdx, newIdx);
    const draft = orderedLessons.find(l => l.id === draftLessonId);
    setOrderedLessons(draft ? [...reordered, draft] : reordered);
    reordered.forEach((l, i) => {
      if (l.sort_order !== i) {
        upsertLesson.mutateAsync({ id: l.id, course_id: course.id, sort_order: i }).catch(() => {});
      }
    });
  };

  const handleSaveTitle = async () => {
    if (!modTitle.trim()) return;
    setSavingTitle(true);
    try {
      await upsertModule.mutateAsync({ id: mod.id, course_id: course.id, title: modTitle.trim() });
      setEditingTitle(false);
    } catch { toast.error("Error al guardar"); }
    finally { setSavingTitle(false); }
  };

  const handleDeleteLesson = async () => {
    if (!pendingDeleteLessonId) return;
    const lesson = lessons.find(l => l.id === pendingDeleteLessonId);
    if (lesson?.bunny_video_id) {
      supabase.functions.invoke("get-bunny-upload-url", { body: { action: "delete", bunnyVideoId: lesson.bunny_video_id } }).catch(() => {});
    }
    setDeletingLesson(true);
    try {
      await deleteLesson.mutateAsync({ id: pendingDeleteLessonId, courseId: course.id });
      insertLog.mutateAsync({ action: "delete", entity: "leccion_curso", entity_id: pendingDeleteLessonId, description: `Lección eliminada: ${lesson?.title}` }).catch(() => {});
      toast.success("Lección eliminada");
      setPendingDeleteLessonId(null);
    } catch { toast.error("Error al eliminar la lección"); }
    finally { setDeletingLesson(false); }
  };

  return (
    <div ref={setNodeRef} style={dragStyle} className="rounded-2xl border bg-card overflow-hidden">
      <DeleteConfirmDialog
        open={!!pendingDeleteLessonId}
        onOpenChange={open => !open && setPendingDeleteLessonId(null)}
        onConfirm={handleDeleteLesson}
        isPending={deletingLesson}
        description="Se eliminará la lección y su video permanentemente."
      />
      {/* Cabecera del módulo */}
      <div className="flex items-center gap-2.5 px-3.5 py-3 bg-muted/20 border-b hover:bg-muted/40 transition-colors">
        <button {...attributes} {...listeners} title="Arrastrar para reordenar"
          className="cursor-grab active:cursor-grabbing text-muted-foreground/20 hover:text-muted-foreground/60 shrink-0 touch-none transition-colors">
          <GripVertical size={13} />
        </button>
        <button onClick={onToggle} className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer group/toggle">
          <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-primary">{moduleIndex + 1}</span>
          </div>
          {editingTitle ? null : (
            <>
              <p className="text-sm font-semibold truncate flex-1 group-hover/toggle:text-primary transition-colors">{mod.title}</p>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground/60 shrink-0">
                {lessons.length}
              </span>
              <span className="text-muted-foreground/40 shrink-0 transition-transform duration-200" style={{ transform: expanded ? "rotate(0deg)" : "rotate(-90deg)" }}>
                <ChevronDown size={14} />
              </span>
            </>
          )}
        </button>
        {editingTitle ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Input value={modTitle} onChange={e => setModTitle(e.target.value)} className="h-7 text-xs flex-1"
              onKeyDown={e => { if (e.key === "Enter") handleSaveTitle(); if (e.key === "Escape") setEditingTitle(false); }} autoFocus />
            <button onClick={handleSaveTitle} disabled={savingTitle} className="text-primary hover:text-primary/80 transition-colors shrink-0">
              {savingTitle ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            </button>
            <button onClick={() => setEditingTitle(false)} className="text-muted-foreground hover:text-foreground transition-colors shrink-0"><X size={13} /></button>
          </div>
        ) : (
          <div className="flex gap-1 shrink-0">
            <button onClick={() => setEditingTitle(true)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-colors">
              <Pencil size={11} />
            </button>
            <button onClick={onDelete} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
              <Trash2 size={11} />
            </button>
          </div>
        )}
      </div>

      {/* Lecciones */}
      {expanded && (
        <div className="p-3 space-y-1.5">
          <DndContext sensors={lessonSensors} collisionDetection={closestCenter} onDragEnd={handleLessonDragEnd}>
            <SortableContext
              items={orderedLessons.filter(l => l.id !== draftLessonId).map(l => l.id)}
              strategy={verticalListSortingStrategy}>
              {orderedLessons.filter(l => l.id !== draftLessonId).map((lesson, idx) => (
                <SortableLessonItem
                  key={lesson.id}
                  lesson={lesson} idx={idx}
                  course={course} moduleId={mod.id}
                  isEditing={editingLesson === lesson.id}
                  onEdit={() => setEditingLesson(lesson.id)}
                  onSaved={() => setEditingLesson(null)}
                  onCancelEdit={() => setEditingLesson(null)}
                  onDelete={() => setPendingDeleteLessonId(lesson.id)}
                />
              ))}
            </SortableContext>
          </DndContext>

          {editingLesson === "new" ? (
            <LessonEditor
              courseId={course.id} moduleId={mod.id}
              lesson={null} sortOrder={orderedLessons.length}
              onDraftCreated={id => setDraftLessonId(id)}
              onSaved={() => { setDraftLessonId(null); setEditingLesson(null); }}
              onCancel={() => { setDraftLessonId(null); setEditingLesson(null); }}
            />
          ) : (
            <button onClick={() => setEditingLesson("new")}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
              <Plus size={12} /> Añadir lección
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Contenido ───────────────────────────────────────────────────────────
function LessonsTab({ course }: { course: CrmCourse }) {
  const { data: modules = [], isLoading } = useCourseModules(course.id);
  const { data: lessons = [] }            = useCourseLessons(course.id);
  const upsertModule = useUpsertCourseModule();
  const deleteModule = useDeleteCourseModule();

  const insertLog     = useInsertLog();
  const [addingModule, setAddingModule] = useState(false);
  const [newModTitle, setNewModTitle]   = useState("");
  const [savingMod, setSavingMod]       = useState(false);
  const [expanded, setExpanded]         = useState<Set<string>>(new Set());
  const [orderedModules, setOrderedModules] = useState<typeof modules>([]);
  const [pendingDeleteModuleId, setPendingDeleteModuleId] = useState<string | null>(null);
  const [deletingMod, setDeletingMod]   = useState(false);

  // Sincronizar orden local con datos del servidor
  useEffect(() => { setOrderedModules(modules); }, [modules]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const toggleExpand = (id: string) =>
    setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = orderedModules.findIndex(m => m.id === active.id);
    const newIdx = orderedModules.findIndex(m => m.id === over.id);
    const next   = arrayMove(orderedModules, oldIdx, newIdx);
    setOrderedModules(next);
    // Persistir nuevos sort_order solo para los que cambiaron
    next.forEach((m, i) => {
      if (m.sort_order !== i) {
        upsertModule.mutateAsync({ id: m.id, course_id: course.id, sort_order: i }).catch(() => {});
      }
    });
  };

  const handleAddModule = async () => {
    if (!newModTitle.trim()) return;
    setSavingMod(true);
    try {
      const m = await upsertModule.mutateAsync({ course_id: course.id, title: newModTitle.trim(), sort_order: orderedModules.length });
      setNewModTitle(""); setAddingModule(false);
      setExpanded(prev => new Set([...prev, m.id]));
    } catch { toast.error("Error al crear módulo"); }
    finally { setSavingMod(false); }
  };

  const handleDeleteModule = async () => {
    if (!pendingDeleteModuleId) return;
    const mod = orderedModules.find(m => m.id === pendingDeleteModuleId);
    setDeletingMod(true);
    try {
      await deleteModule.mutateAsync({ id: pendingDeleteModuleId, courseId: course.id });
      insertLog.mutateAsync({ action: "delete", entity: "modulo_curso", entity_id: pendingDeleteModuleId, description: `Módulo eliminado: ${mod?.title}` }).catch(() => {});
      toast.success("Módulo eliminado");
      setPendingDeleteModuleId(null);
    } catch { toast.error("Error al eliminar el módulo"); }
    finally { setDeletingMod(false); }
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-muted-foreground/50" /></div>;

  return (
    <div className="space-y-3">
      <DeleteConfirmDialog
        open={!!pendingDeleteModuleId}
        onOpenChange={open => !open && setPendingDeleteModuleId(null)}
        onConfirm={handleDeleteModule}
        isPending={deletingMod}
        description="Se eliminará el módulo y todas sus lecciones permanentemente."
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{orderedModules.length} módulo{orderedModules.length !== 1 ? "s" : ""}</p>
        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => setAddingModule(true)}>
          <Plus size={13} /> Añadir módulo
        </Button>
      </div>

      {addingModule && (
        <div className="rounded-2xl border bg-card p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground">Nuevo módulo</p>
          <Input value={newModTitle} onChange={e => setNewModTitle(e.target.value)} placeholder="Ej: Introducción al curso" className="h-9 text-sm" autoFocus
            onKeyDown={e => { if (e.key === "Enter") handleAddModule(); if (e.key === "Escape") setAddingModule(false); }} />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setAddingModule(false)} className="flex-1">Cancelar</Button>
            <Button size="sm" onClick={handleAddModule} disabled={savingMod || !newModTitle.trim()} className="flex-1 gap-1.5">
              {savingMod && <Loader2 size={12} className="animate-spin" />} Crear
            </Button>
          </div>
        </div>
      )}

      {orderedModules.length === 0 && !addingModule && (
        <div className="rounded-2xl border border-dashed py-12 text-center space-y-3">
          <FolderOpen size={28} className="mx-auto text-muted-foreground/20" />
          <div>
            <p className="text-sm font-medium text-muted-foreground/60">Aún no hay módulos</p>
            <p className="text-xs text-muted-foreground/40">Crea módulos para organizar las lecciones del curso</p>
          </div>
          <Button size="sm" onClick={() => setAddingModule(true)} className="gap-1.5 mx-auto">
            <Plus size={13} /> Añadir módulo
          </Button>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={orderedModules.map(m => m.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {orderedModules.map((mod, idx) => (
              <ModuleSection
                key={mod.id}
                mod={mod}
                moduleIndex={idx}
                lessons={lessons.filter(l => l.module_id === mod.id).sort((a, b) => a.sort_order - b.sort_order)}
                course={course}
                expanded={expanded.has(mod.id)}
                onToggle={() => toggleExpand(mod.id)}
                onDelete={() => setPendingDeleteModuleId(mod.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

// ─── Tab: Alumnos ─────────────────────────────────────────────────────────────
function AlumnosTab({ course }: { course: CrmCourse }) {
  const { data: accesses = [], isLoading } = useCourseAccess(course.id);
  const { data: contacts = [] }            = useContacts();
  const { data: plans = [] }               = useCoursePlans(course.id);
  const grantAccess   = useGrantCourseAccess();
  const revokeAccess  = useRevokeCourseAccess();
  const createContact = useCreateContact();
  const createSale    = useCreateSale();

  const [showForm, setShowForm]           = useState(false);
  const [newEmail, setNewEmail]           = useState("");
  const [newExpiry, setNewExpiry]         = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [saving, setSaving]               = useState(false);
  const [resendingId, setResendingId]     = useState<string | null>(null);

  const handleResend = async (access: CrmCourseAccess) => {
    setResendingId(access.id);
    try {
      const { error } = await supabase.functions.invoke("send-course-invitation", {
        body: { email: access.email, course_id: course.id },
      });
      if (error) {
        const msg = (error as any)?.message ?? "";
        toast.error(msg.includes("publicado") ? "Publica el curso antes de enviar invitaciones" : "Error al reenviar");
      } else {
        toast.success("Invitación reenviada");
      }
    } catch { toast.error("Error al reenviar"); }
    finally { setResendingId(null); }
  };
  // Plan seleccionado — determina el monto/moneda de la venta automática
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const selectedPlan = plans.find(p => p.id === selectedPlanId) ?? null;

  const handlePlanSelect = (planId: string) => {
    setSelectedPlanId(planId);
    const plan = plans.find(p => p.id === planId);
    if (plan?.is_recurring) {
      setNewExpiry(addInterval(new Date(), plan.recurring_interval).toISOString().split("T")[0]);
    }
  };

  const accessedEmails = new Set(accesses.map(a => a.email.toLowerCase()));
  const filteredContacts = contactSearch.trim().length >= 1
    ? contacts.filter(c =>
        c.email &&
        !accessedEmails.has(c.email.toLowerCase()) &&
        (c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
         c.email.toLowerCase().includes(contactSearch.toLowerCase()))
      ).slice(0, 6)
    : [];

  const resetForm = () => {
    setNewEmail(""); setContactSearch(""); setNewExpiry("");
    setSelectedPlanId("");
    setShowForm(false);
  };

  const handleGrant = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email) return;
    setSaving(true);
    try {
      await grantAccess.mutateAsync({ course_id: course.id, email, expires_at: newExpiry || null });

      // Crear contacto si no existe
      const existingContact = contacts.find(c => c.email?.toLowerCase() === email);
      if (!existingContact) {
        await createContact.mutateAsync({ name: email.split("@")[0], email });
      }

      // Enviar email de invitación (solo si el curso está publicado)
      if (course.is_published) {
        supabase.functions.invoke("send-course-invitation", {
          body: { email, course_id: course.id },
        }).catch(() => {});
      }

      // Registrar venta automáticamente si se seleccionó un plan
      if (selectedPlan) {
        const contact = existingContact ?? contacts.find(c => c.email?.toLowerCase() === email);
        createSale.mutateAsync({
          course_id: course.id,
          course_name: course.title,
          course_plan_id: selectedPlan.id,
          amount: planFinalPrice(selectedPlan),
          currency: selectedPlan.currency,
          contact_id: contact?.id ?? undefined,
          contact_name: contact?.name ?? email.split("@")[0],
          notes: `Acceso al curso: ${course.title} — Plan: ${selectedPlan.name}`,
          type: "initial",
          status: "confirmed",
        }).catch(() => {});
      }

      resetForm();
      toast.success(
        course.is_published
          ? "Acceso concedido — se enviará un email de invitación"
          : "Acceso concedido — publica el curso para que el alumno pueda ingresar",
      );
    } catch (err: any) {
      toast.error(err.message?.includes("unique") ? "Este email ya tiene acceso" : "Error al conceder acceso");
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (access: CrmCourseAccess) => {
    try {
      await revokeAccess.mutateAsync({ id: access.id, courseId: course.id });
      toast.success("Acceso revocado");
    } catch { toast.error("Error al revocar"); }
  };

  const getStatusBadge = (access: CrmCourseAccess) => {
    const expired = !!access.expires_at && new Date(access.expires_at) < new Date();
    if (expired) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400">Vencido</span>;
    if (access.status === "active") return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">Activo</span>;
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">Invitado</span>;
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-muted-foreground/50" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{accesses.length} alumno{accesses.length !== 1 ? "s" : ""} con acceso</p>
        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => setShowForm(v => !v)}>
          <UserPlus size={13} /> Dar acceso
        </Button>
      </div>

      {showForm && (
        <div className="rounded-2xl border bg-card p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground">Dar acceso a alumno</p>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Users size={11} /> Buscar contacto</label>
            <Input value={contactSearch} onChange={e => { setContactSearch(e.target.value); setNewEmail(e.target.value); }}
              placeholder="Nombre o email del contacto..." className="h-9 text-sm" />
            {filteredContacts.length > 0 && (
              <div className="border rounded-xl overflow-hidden divide-y bg-background shadow-sm">
                {filteredContacts.map(c => (
                  <button key={c.id} type="button"
                    onClick={() => { setNewEmail(c.email!); setContactSearch(c.email!); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/50 transition-colors">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">
                      {c.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{c.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Email *</label>
            <Input type="email" value={newEmail} onChange={e => { setNewEmail(e.target.value); setContactSearch(e.target.value); }}
              placeholder="alumno@email.com" className="h-9 text-sm" />
            {newEmail && !contacts.some(c => c.email?.toLowerCase() === newEmail.trim().toLowerCase()) && (
              <p className="text-[11px] text-muted-foreground/60">Se creará un nuevo contacto con este email.</p>
            )}
          </div>

          {plans.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <DollarSign size={11} /> Plan <span className="text-[10px] text-muted-foreground/60">(opcional)</span>
              </label>
              <select value={selectedPlanId} onChange={e => handlePlanSelect(e.target.value)}
                className="h-9 w-full rounded-xl border border-border bg-background text-xs px-2 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all">
                <option value="">Sin plan — no registrar venta</option>
                {plans.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatAmount(planFinalPrice(p), p.currency)}
                    {p.is_recurring && planFinalRecurringPrice(p) != null ? ` (+ ${formatAmount(planFinalRecurringPrice(p)!, p.recurring_currency ?? p.currency)}/${INTERVAL_LABELS[p.recurring_interval ?? "mensual"]})` : ""}
                  </option>
                ))}
              </select>
              {selectedPlan && (
                <p className="text-[10px] text-muted-foreground/60">
                  Se registrará una venta de {formatAmount(planFinalPrice(selectedPlan), selectedPlan.currency)} al conceder el acceso.
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Calendar size={11} /> Vencimiento <span className="text-[10px] text-muted-foreground/60">{selectedPlan?.is_recurring ? "(sugerido según el plan)" : "(opcional)"}</span>
            </label>
            <Input type="date" value={newExpiry} onChange={e => setNewExpiry(e.target.value)}
              className="h-9 text-sm" min={new Date().toISOString().split("T")[0]} />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={resetForm}>Cancelar</Button>
            <Button size="sm" className="flex-1 gap-1.5" onClick={handleGrant} disabled={saving || !newEmail.trim()}>
              {saving && <Loader2 size={12} className="animate-spin" />} Conceder acceso
            </Button>
          </div>
        </div>
      )}

      {accesses.length === 0 && !showForm ? (
        <div className="rounded-2xl border border-dashed py-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto">
            <GraduationCap size={22} className="text-muted-foreground/25" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground/70">Sin alumnos todavía</p>
            <p className="text-[11px] text-muted-foreground/40 mt-0.5">Da acceso a tu primer alumno</p>
          </div>
          <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5 mx-auto">
            <UserPlus size={13} /> Dar acceso
          </Button>
        </div>
      ) : (
        <div className="space-y-1.5">
          {accesses.map(access => {
            const contact = contacts.find(c => c.email?.toLowerCase() === access.email.toLowerCase());
            const initials = (contact?.name ?? access.email).substring(0, 2).toUpperCase();
            const expired  = !!access.expires_at && new Date(access.expires_at) < new Date();
            return (
              <div key={access.id}
                className="group/row flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 hover:border-primary/30 hover:bg-muted/10 transition-all duration-150">
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  expired
                    ? "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400"
                    : "bg-primary/10 text-primary"
                }`}>
                  {initials}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  {contact ? (
                    <p className="text-xs font-semibold truncate">{contact.name}</p>
                  ) : null}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className={`truncate ${contact ? "text-[11px] text-muted-foreground/60" : "text-xs font-semibold"}`}>{access.email}</p>
                    {/* Estado visible en mobile */}
                    <span className="sm:hidden shrink-0">{getStatusBadge(access)}</span>
                  </div>
                </div>
                {/* Status + expiry — solo desktop */}
                <div className="hidden sm:flex items-center gap-2 shrink-0">
                  {access.expires_at && (
                    <span className={`text-[10px] font-medium ${expired ? "text-red-500" : "text-muted-foreground/50"}`}>
                      {expired ? "Venció " : ""}{new Date(access.expires_at).toLocaleDateString("es", { day: "2-digit", month: "short" })}
                    </span>
                  )}
                  {getStatusBadge(access)}
                </div>
                {/* Actions */}
                <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover/row:opacity-100 transition-opacity">
                  <button onClick={() => handleResend(access)} disabled={resendingId === access.id}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-40 transition-colors"
                    title="Reenviar invitación">
                    {resendingId === access.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                  </button>
                  <button onClick={() => handleRevoke(access)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                    title="Revocar acceso">
                    <X size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
