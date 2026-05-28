import { useState, useRef, useEffect } from "react";
import * as tus from "tus-js-client";
import {
  BookOpen, Plus, Trash2, Loader2, ArrowLeft, Pencil, Users,
  Link2, Check, ExternalLink, GraduationCap, X, UserPlus, Calendar,
  Video, AlertCircle, ImageIcon, Paperclip, ChevronDown, ChevronRight, FolderOpen, GripVertical, Send,
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
  useCourseModules, useUpsertCourseModule, useDeleteCourseModule,
  useCourseLessons, useUpsertCourseLesson, useDeleteCourseLesson,
  useCourseAccess, useGrantCourseAccess, useRevokeCourseAccess,
  useContacts, useCreateContact, useInsertLog, useCreateSale,
  usePricesByEntity, useUpsertPrices,
} from "@/hooks/useCrmData";
import type { CrmCourse, CrmCourseModule, CrmCourseLesson, CrmCourseAccess } from "@/lib/supabase";
import PriceListEditor, { type PriceEntry } from "@/components/crm/PriceListEditor";
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
export default function CrmCourses() {
  return <VideoUploadProvider><CrmCoursesContent /></VideoUploadProvider>;
}

function CrmCoursesContent() {
  const { data: courses = [], isLoading } = useCourses();
  const upsertCourse  = useUpsertCourse();
  const deleteCourse  = useDeleteCourse();
  const upsertPrices  = useUpsertPrices();

  const [selected, setSelected]     = useState<CrmCourse | null>(null);
  const [activeTab, setActiveTab]   = useState<"contenido" | "alumnos">("contenido");
  const [creating, setCreating]     = useState(false);
  const [form, setForm]             = useState({ title: "", description: "", slug: "", price: "", currency: "USD" });
  const [formPrices, setFormPrices] = useState<PriceEntry[]>([]);
  const [saving, setSaving]         = useState(false);
  const [copiedSlug, setCopiedSlug] = useState(false);

  const openNew = () => {
    setForm({ title: "", description: "", slug: "", price: "", currency: "USD" });
    setFormPrices([]);
    setCreating(true);
  };

  const handleCreate = async () => {
    if (!form.title.trim() || !form.slug.trim()) return;
    setSaving(true);
    try {
      const price = form.price ? parseFloat(form.price) : null;
      const course = await upsertCourse.mutateAsync({ title: form.title.trim(), description: form.description || null, slug: form.slug.trim(), is_published: false, price, currency: form.currency });
      if (formPrices.length > 0) {
        await upsertPrices.mutateAsync({ entityType: "course", entityId: course.id, prices: formPrices });
      }
      setCreating(false);
      setSelected(course);
      setActiveTab("contenido");
    } catch (err: any) {
      toast.error(err.message?.includes("unique") ? "Ya existe un curso con ese slug" : "Error al crear curso");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (course: CrmCourse) => {
    try {
      await upsertCourse.mutateAsync({ id: course.id, is_published: !course.is_published });
      toast.success(course.is_published ? "Curso despublicado" : "Curso publicado");
      if (selected?.id === course.id) setSelected(prev => prev ? { ...prev, is_published: !prev.is_published } : null);
    } catch {
      toast.error("Error al cambiar estado");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCourse.mutateAsync(id);
      if (selected?.id === id) setSelected(null);
      toast.success("Curso eliminado");
    } catch {
      toast.error("Error al eliminar");
    }
  };

  const copyLink = (course: CrmCourse) => {
    navigator.clipboard.writeText(`${APP_URL}/curso/${course.user_id}/${course.slug}`);
    setCopiedSlug(true);
    setTimeout(() => setCopiedSlug(false), 2000);
  };

  // ── Vista detalle ──
  if (selected) {
    return (
      <CourseDetail
        course={selected}
        tab={activeTab}
        onTabChange={setActiveTab}
        onBack={() => setSelected(null)}
        onTogglePublish={() => handleTogglePublish(selected)}
        onDelete={() => { handleDelete(selected.id); }}
        onCopyLink={() => copyLink(selected)}
        copiedSlug={copiedSlug}
      />
    );
  }

  // ── Lista de cursos ──
  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Cursos</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Crea y gestiona cursos con acceso por email</p>
        </div>
        <Button size="sm" onClick={openNew} className="h-9 gap-1.5">
          <Plus size={14} /> Nuevo curso
        </Button>
      </div>

      {/* Modal crear curso */}
      {creating && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4" onClick={() => setCreating(false)}>
          <div className="bg-card border rounded-2xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Nuevo curso</h3>
              <button onClick={() => setCreating(false)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Título *</label>
                <Input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value, slug: f.slug || slugify(e.target.value) }))}
                  placeholder="Ej: Marketing Digital desde Cero"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Slug (URL) *</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground/60 shrink-0">/curso/</span>
                  <Input
                    value={form.slug}
                    onChange={e => setForm(f => ({ ...f, slug: slugify(e.target.value) }))}
                    placeholder="marketing-digital"
                    className="h-9 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Descripción <span className="text-[10px]">(opcional)</span></label>
                <Input
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Breve descripción del curso"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Precio <span className="text-[10px]">(opcional — vacío = gratuito)</span></label>
                <div className="flex gap-2">
                  <select
                    value={form.currency}
                    onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                    className="h-9 rounded-xl border border-border bg-background text-xs px-2 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all shrink-0"
                  >
                    {CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    placeholder="0.00"
                    className="h-9 text-sm flex-1"
                  />
                </div>
              </div>
              <PriceListEditor
                value={formPrices}
                onChange={setFormPrices}
                baseCurrency={form.currency}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setCreating(false)} className="flex-1">Cancelar</Button>
              <Button size="sm" onClick={handleCreate} disabled={saving || !form.title.trim() || !form.slug.trim()} className="flex-1 gap-1.5">
                {saving && <Loader2 size={12} className="animate-spin" />} Crear
              </Button>
            </div>
          </div>
        </div>
      )}

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
          <Button size="sm" onClick={openNew} className="gap-1.5 mx-auto"><Plus size={13} /> Nuevo curso</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map(course => (
            <div
              key={course.id}
              className="group bg-card border rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col"
              onClick={() => { setSelected(course); setActiveTab("contenido"); }}
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
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-full backdrop-blur-sm ${
                    course.is_published
                      ? "bg-emerald-500/90 text-white"
                      : "bg-black/40 text-white/80"
                  }`}>
                    {course.is_published ? "Publicado" : "Borrador"}
                  </span>
                </div>
                {course.price != null && (
                  <div className="absolute top-2.5 right-2.5">
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-primary/90 text-white backdrop-blur-sm">
                      {getCurrencyFlag(course.currency ?? "USD")} {formatAmount(course.price, course.currency)}
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4 flex flex-col flex-1 space-y-3">
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-semibold leading-snug line-clamp-2">{course.title}</p>
                  {course.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{course.description}</p>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-1 border-t border-border/60">
                  <span className="text-[10px] text-muted-foreground/50 font-mono truncate max-w-[120px]">{course.slug}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={e => { e.stopPropagation(); copyLink(course); }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                      title="Copiar link"
                    >
                      {copiedSlug ? <Check size={12} className="text-emerald-500" /> : <Link2 size={12} />}
                    </button>
                    <a
                      href={`/curso/${course.user_id}/${course.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                      title="Abrir curso"
                    >
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Vista detalle del curso ──────────────────────────────────────────────────
function CourseDetail({
  course, tab, onTabChange, onBack, onTogglePublish, onDelete, onCopyLink, copiedSlug,
}: {
  course: CrmCourse;
  tab: "contenido" | "alumnos";
  onTabChange: (t: "contenido" | "alumnos") => void;
  onBack: () => void;
  onTogglePublish: () => void;
  onDelete: () => void;
  onCopyLink: () => void;
  copiedSlug: boolean;
}) {
  const upsertCourse  = useUpsertCourse();
  const deleteCourse  = useDeleteCourse();
  const insertLog     = useInsertLog();
  const upsertPrices  = useUpsertPrices();
  const thumbInputRef = useRef<HTMLInputElement>(null);

  // Local display state (se actualiza tras guardar sin esperar re-render del padre)
  const [localTitle, setLocalTitle] = useState(course.title);
  const [localSlug, setLocalSlug]   = useState(course.slug);

  // Portada
  const [thumbLoading, setThumbLoading] = useState(false);
  const [thumbUrl, setThumbUrl]         = useState<string | null>(course.thumbnail_url);

  // Edición de metadatos
  const [editingMeta, setEditingMeta] = useState(false);
  const [editForm, setEditForm]       = useState({ title: course.title, description: course.description ?? "", slug: course.slug, price: course.price?.toString() ?? "", currency: course.currency ?? "USD" });
  const [savingMeta, setSavingMeta]   = useState(false);

  // Precios multi-moneda
  const { data: existingPrices = [] } = usePricesByEntity("course", course.id);
  const [editPrices, setEditPrices]   = useState<PriceEntry[]>([]);
  useEffect(() => {
    setEditPrices(existingPrices.map(p => ({ currency: p.currency, price: p.price })));
  }, [existingPrices]);

  // Eliminar curso
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]           = useState(false);

  const openEdit = () => {
    setEditForm({ title: localTitle, description: course.description ?? "", slug: localSlug, price: course.price?.toString() ?? "", currency: course.currency ?? "USD" });
    setEditingMeta(true);
  };

  const handleSaveMeta = async () => {
    if (!editForm.title.trim() || !editForm.slug.trim()) return;
    setSavingMeta(true);
    try {
      const price = editForm.price ? parseFloat(editForm.price) : null;
      await upsertCourse.mutateAsync({ id: course.id, title: editForm.title.trim(), description: editForm.description || null, slug: editForm.slug.trim(), price, currency: editForm.currency });
      await upsertPrices.mutateAsync({ entityType: "course", entityId: course.id, prices: editPrices });
      setLocalTitle(editForm.title.trim());
      setLocalSlug(editForm.slug.trim());
      setEditingMeta(false);
      toast.success("Curso actualizado");
    } catch (err: any) {
      toast.error(err.message?.includes("unique") ? "Ya existe un curso con ese slug" : "Error al guardar");
    } finally {
      setSavingMeta(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteCourse.mutateAsync(course.id);
      insertLog.mutateAsync({ action: "delete", entity: "curso", entity_id: course.id, description: `Curso eliminado: ${localTitle}` }).catch(() => {});
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

  return (
    <div className="space-y-4">

      {/* Modal: editar metadatos */}
      {editingMeta && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4" onClick={() => setEditingMeta(false)}>
          <div className="bg-card border rounded-2xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Editar curso</h3>
              <button onClick={() => setEditingMeta(false)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Título *</label>
                <Input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Slug (URL) *</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground/60 shrink-0">/curso/</span>
                  <Input value={editForm.slug} onChange={e => setEditForm(f => ({ ...f, slug: slugify(e.target.value) }))} className="h-9 text-sm" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Descripción</label>
                <Input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="Breve descripción del curso" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Precio <span className="text-[10px]">(vacío = gratuito)</span></label>
                <div className="flex gap-2">
                  <select
                    value={editForm.currency}
                    onChange={e => setEditForm(f => ({ ...f, currency: e.target.value }))}
                    className="h-9 rounded-xl border border-border bg-background text-xs px-2 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all shrink-0"
                  >
                    {CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                    ))}
                  </select>
                  <Input type="number" min="0" step="0.01" value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" className="h-9 text-sm flex-1" />
                </div>
              </div>
              <PriceListEditor value={editPrices} onChange={setEditPrices} baseCurrency={editForm.currency} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditingMeta(false)} className="flex-1">Cancelar</Button>
              <Button size="sm" onClick={handleSaveMeta} disabled={savingMeta || !editForm.title.trim() || !editForm.slug.trim()} className="flex-1 gap-1.5">
                {savingMeta && <Loader2 size={12} className="animate-spin" />} Guardar
              </Button>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        onConfirm={handleDelete}
        isPending={deleting}
        description={`Se eliminarán todos los módulos, lecciones y accesos de alumnos de "${localTitle}". Esta acción no se puede deshacer.`}
      />

      {/* Barra superior */}
      <div className="flex items-center gap-2 pb-1">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-xl border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors cursor-pointer shrink-0"
        >
          <ArrowLeft size={14} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h2 className="text-sm font-bold truncate max-w-[160px] sm:max-w-none">{localTitle}</h2>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
              course.is_published
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
            }`}>
              {course.is_published ? "Publicado" : "Borrador"}
            </span>
            {course.price != null && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                {getCurrencyFlag(course.currency ?? "USD")} {formatAmount(course.price, course.currency)}
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground/40 font-mono mt-0.5 truncate">/…/{localSlug}</p>
        </div>
        {/* Acciones — compactas en mobile */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={openEdit} title="Editar"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer">
            <Pencil size={13} />
          </button>
          <button onClick={onCopyLink} title="Copiar link"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer">
            {copiedSlug ? <Check size={13} className="text-emerald-500" /> : <Link2 size={13} />}
          </button>
          <a href={`/curso/${course.user_id}/${localSlug}`} target="_blank" rel="noopener noreferrer"
            className="hidden sm:flex w-8 h-8 rounded-xl items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer">
            <ExternalLink size={13} />
          </a>
          <div className="w-px h-5 bg-border mx-1" />
          <Button
            size="sm"
            variant={course.is_published ? "outline" : "default"}
            className="h-8 text-xs font-semibold px-2.5 sm:px-3"
            onClick={onTogglePublish}
          >
            {course.is_published ? <span className="hidden sm:inline">Despublicar</span> : <span className="hidden sm:inline">Publicar</span>}
            <span className="sm:hidden">{course.is_published ? "↓" : "↑"}</span>
          </Button>
          <button onClick={() => setConfirmDelete(true)} title="Eliminar"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Portada — compacto */}
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

      {/* Tabs — pill style */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-xl border border-border/50">
        {(["contenido", "alumnos"] as const).map(t => (
          <button key={t} onClick={() => onTabChange(t)}
            className={`flex flex-1 items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              tab === t
                ? "bg-card text-foreground shadow-sm border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            }`}>
            {t === "contenido" ? <BookOpen size={12} /> : <Users size={12} />}
            {t === "contenido" ? "Contenido" : "Alumnos"}
          </button>
        ))}
      </div>

      {tab === "contenido" && <LessonsTab course={course} />}
      {tab === "alumnos"   && <AlumnosTab course={course} />}
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
        <div className="rounded-2xl border border-dashed py-12 text-center space-y-2">
          <FolderOpen size={28} className="mx-auto text-muted-foreground/20" />
          <p className="text-sm font-medium text-muted-foreground/60">Aún no hay módulos</p>
          <p className="text-xs text-muted-foreground/40">Crea módulos para organizar las lecciones del curso</p>
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
  // Registrar venta
  const [registerSale, setRegisterSale]   = useState(false);
  const [saleAmount, setSaleAmount]       = useState(course.price != null ? String(course.price) : "");
  const [saleNotes, setSaleNotes]         = useState(`Acceso al curso: ${course.title}`);

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
    setRegisterSale(false);
    setSaleAmount(course.price != null ? String(course.price) : "");
    setSaleNotes(`Acceso al curso: ${course.title}`);
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

      // Registrar venta si se solicitó
      if (registerSale && saleAmount && parseFloat(saleAmount) > 0) {
        const contact = existingContact ?? contacts.find(c => c.email?.toLowerCase() === email);
        createSale.mutateAsync({
          service_name: course.title,
          amount: parseFloat(saleAmount),
          contact_id: contact?.id ?? undefined,
          contact_name: contact?.name ?? email.split("@")[0],
          notes: saleNotes || undefined,
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

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Calendar size={11} /> Vencimiento <span className="text-[10px] text-muted-foreground/60">(opcional)</span>
            </label>
            <Input type="date" value={newExpiry} onChange={e => setNewExpiry(e.target.value)}
              className="h-9 text-sm" min={new Date().toISOString().split("T")[0]} />
          </div>

          {/* Registrar venta */}
          <div className="border rounded-xl p-3 space-y-2.5 bg-muted/20">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={registerSale} onChange={e => setRegisterSale(e.target.checked)}
                className="w-4 h-4 rounded accent-primary" />
              <span className="text-xs font-medium">Registrar venta</span>
            </label>
            {registerSale && (
              <div className="space-y-2 pl-6">
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">Monto</label>
                  <Input type="number" min="0" step="0.01" value={saleAmount}
                    onChange={e => setSaleAmount(e.target.value)}
                    placeholder="0.00" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">Notas</label>
                  <Input value={saleNotes} onChange={e => setSaleNotes(e.target.value)}
                    className="h-8 text-sm" />
                </div>
              </div>
            )}
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
            <p className="text-[11px] text-muted-foreground/40 mt-0.5">Da acceso al primer alumno con el botón de arriba</p>
          </div>
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
