import { useState, useRef, useCallback } from "react";
import * as tus from "tus-js-client";
import {
  Plus, ArrowLeft, Pencil, Trash2, Play, Upload, Loader2,
  ChevronDown, ChevronRight, BookOpen, Video, Users,
  X, Check, Globe, Lock, Tag, Mail, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { CrmVideoCourse, CrmVideoModule, CrmVideo } from "@/lib/supabase";
import {
  useVideoCourses, useVideoModules, useVideosForCourse,
  useCreateVideoCourse, useUpdateVideoCourse, useDeleteVideoCourse,
  useCreateVideoModule, useUpdateVideoModule, useDeleteVideoModule,
  useCreateVideo, useUpdateVideo, useDeleteVideo,
} from "@/hooks/useCrmData";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";

// ─── Constants ────────────────────────────────────────────────────────────────

const BUNNY_LIBRARY_ID  = "628395";
const BUNNY_CDN_HOST    = "vz-72bbf19c-ff4.b-cdn.net";
const ACROSOFT_BLUE     = "#3b82f6";

const bunnyThumbnail = (videoId: string) =>
  `https://${BUNNY_CDN_HOST}/${videoId}/thumbnail.jpg`;

const bunnyEmbed = (videoId: string) =>
  `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${videoId}?autoplay=true&loop=false&muted=false&preload=true&responsive=true`;

// ─── Video Player Modal ───────────────────────────────────────────────────────

const VideoPlayerModal = ({
  video,
  onClose,
}: {
  video: CrmVideo;
  onClose: () => void;
}) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
    onClick={onClose}
  >
    <div
      className="relative w-full max-w-4xl bg-black rounded-2xl overflow-hidden shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={onClose}
        className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
      >
        <X size={16} />
      </button>
      <div className="aspect-video w-full">
        <iframe
          src={bunnyEmbed(video.bunny_video_id)}
          className="w-full h-full"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
      <div className="p-4 bg-gray-900">
        <p className="text-white font-semibold text-sm">{video.title}</p>
        {video.description && (
          <p className="text-gray-400 text-xs mt-1">{video.description}</p>
        )}
      </div>
    </div>
  </div>
);

// ─── Video Upload Row (admin) ─────────────────────────────────────────────────

const VideoUploadRow = ({
  courseId,
  moduleId,
  onCreated,
}: {
  courseId: string;
  moduleId: string;
  onCreated: () => void;
}) => {
  const [title, setTitle]           = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile]             = useState<File | null>(null);
  const [progress, setProgress]     = useState(0);
  const [uploading, setUploading]   = useState(false);
  const fileRef                     = useRef<HTMLInputElement>(null);
  const createVideo                 = useCreateVideo();

  const handleUpload = async () => {
    if (!file || !title.trim()) { toast.error("Título y archivo son requeridos"); return; }
    setUploading(true);
    setProgress(0);
    try {
      // 1. Create video in Bunny + get TUS credentials
      const { data: fnData, error: fnErr } = await supabase.functions.invoke("bunny-video", {
        body: { action: "create", title: title.trim() },
      });
      if (fnErr || fnData?.error) throw new Error(fnData?.error ?? fnErr?.message ?? "Error al crear video en Bunny");

      const { bunnyVideoId, tusExpire, tusSignature, libraryId } = fnData as {
        bunnyVideoId: string; tusExpire: number; tusSignature: string; libraryId: string;
      };

      // 2. Upload via TUS
      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(file, {
          endpoint: "https://video.bunnycdn.com/tusupload",
          retryDelays: [0, 3000, 5000, 10000],
          headers: {
            AuthorizationSignature: tusSignature,
            AuthorizationExpire: String(tusExpire),
            VideoId: bunnyVideoId,
            LibraryId: libraryId,
          },
          metadata: { filetype: file.type, title: title.trim() },
          onError: reject,
          onProgress: (uploaded, total) => setProgress(Math.round((uploaded / total) * 100)),
          onSuccess: () => resolve(),
        });
        upload.start();
      });

      // 3. Save to DB
      await createVideo.mutateAsync({
        course_id:      courseId,
        module_id:      moduleId,
        title:          title.trim(),
        description:    description.trim() || null,
        bunny_video_id: bunnyVideoId,
        thumbnail_url:  bunnyThumbnail(bunnyVideoId),
        duration_seconds: null,
        sort_order:     0,
      });

      toast.success("Video subido exitosamente");
      setTitle(""); setDescription(""); setFile(null); setProgress(0);
      onCreated();
    } catch (err: any) {
      console.error(err);
      toast.error("Error al subir el video: " + (err?.message ?? ""));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-secondary/30 border border-dashed border-border rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nuevo video</p>
      <Input
        placeholder="Título del video *"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="h-9 text-sm"
        disabled={uploading}
      />
      <Input
        placeholder="Descripción (opcional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="h-9 text-sm"
        disabled={uploading}
      />
      <div className="flex items-center gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-50"
        >
          <Upload size={13} />
          {file ? file.name : "Seleccionar archivo"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>
      {uploading && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Subiendo a Bunny Stream…</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%`, backgroundColor: ACROSOFT_BLUE }}
            />
          </div>
        </div>
      )}
      <Button
        onClick={handleUpload}
        disabled={uploading || !file || !title.trim()}
        size="sm"
        className="w-full h-9 text-xs"
        style={{ backgroundColor: ACROSOFT_BLUE, borderColor: ACROSOFT_BLUE }}
      >
        {uploading ? <><Loader2 size={13} className="animate-spin mr-1.5" />Subiendo…</> : <><Upload size={13} className="mr-1.5" />Subir video</>}
      </Button>
    </div>
  );
};

// ─── Module Editor (admin) ────────────────────────────────────────────────────

const ModuleEditor = ({
  module,
  courseId,
  videos,
  onRefreshVideos,
}: {
  module: CrmVideoModule;
  courseId: string;
  videos: CrmVideo[];
  onRefreshVideos: () => void;
}) => {
  const [open, setOpen]           = useState(true);
  const [editingTitle, setEditing] = useState(false);
  const [title, setTitle]         = useState(module.title);
  const [addingVideo, setAdding]  = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const updateModule = useUpdateVideoModule();
  const deleteModule = useDeleteVideoModule();
  const deleteVideo  = useDeleteVideo();

  const saveTitle = async () => {
    if (!title.trim()) return;
    try {
      await updateModule.mutateAsync({ id: module.id, course_id: courseId, title: title.trim() });
      setEditing(false);
    } catch { toast.error("Error al guardar"); }
  };

  const handleDeleteModule = async () => {
    try {
      await deleteModule.mutateAsync({ id: module.id, course_id: courseId });
      toast.success("Módulo eliminado");
    } catch { toast.error("Error al eliminar módulo"); }
  };

  const handleDeleteVideo = async (v: CrmVideo) => {
    try {
      // Delete from Bunny
      await supabase.functions.invoke("bunny-video", {
        body: { action: "delete", bunnyVideoId: v.bunny_video_id },
      });
      await deleteVideo.mutateAsync({ id: v.id, course_id: courseId });
      toast.success("Video eliminado");
      onRefreshVideos();
    } catch { toast.error("Error al eliminar video"); }
  };

  const moduleVideos = videos.filter((v) => v.module_id === module.id);

  return (
    <>
      <DeleteConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        onConfirm={handleDeleteModule}
        isPending={deleteModule.isPending}
        description="Se eliminarán el módulo y todos sus videos permanentemente."
      />
      <div className="bg-card border rounded-2xl overflow-hidden">
        {/* Module header */}
        <div className="flex items-center gap-2 px-4 py-3 bg-secondary/30">
          <button onClick={() => setOpen(!open)} className="text-muted-foreground">
            {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </button>
          {editingTitle ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-7 text-sm flex-1"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") { setTitle(module.title); setEditing(false); } }}
              />
              <button onClick={saveTitle} className="text-primary"><Check size={14} /></button>
              <button onClick={() => { setTitle(module.title); setEditing(false); }} className="text-muted-foreground"><X size={14} /></button>
            </div>
          ) : (
            <span className="flex-1 text-sm font-semibold">{module.title}</span>
          )}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[11px] text-muted-foreground">{moduleVideos.length} videos</span>
            <button onClick={() => setEditing(true)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <Pencil size={12} />
            </button>
            <button onClick={() => setDeleting(true)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {open && (
          <div className="p-3 space-y-2">
            {moduleVideos.map((v) => (
              <div key={v.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-secondary/30 group">
                <div className="w-16 h-10 rounded-lg overflow-hidden bg-secondary shrink-0">
                  <img src={v.thumbnail_url ?? bunnyThumbnail(v.bunny_video_id)} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{v.title}</p>
                  {v.description && <p className="text-[11px] text-muted-foreground truncate">{v.description}</p>}
                </div>
                <button
                  onClick={() => handleDeleteVideo(v)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}

            {addingVideo ? (
              <VideoUploadRow
                courseId={courseId}
                moduleId={module.id}
                onCreated={() => { setAdding(false); onRefreshVideos(); }}
              />
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                <Plus size={12} /> Agregar video
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
};

// ─── Access Control (admin) ───────────────────────────────────────────────────

const AccessControl = ({
  course,
  allTags,
  onSave,
}: {
  course: CrmVideoCourse;
  allTags: string[];
  onSave: (data: Partial<CrmVideoCourse>) => Promise<void>;
}) => {
  const [type, setType]           = useState<"all" | "specific">(course.access_type);
  const [emails, setEmails]       = useState<string[]>(course.access_emails);
  const [tags, setTags]           = useState<string[]>(course.access_tags);
  const [emailInput, setEmailInput] = useState("");
  const [saving, setSaving]       = useState(false);
  const csvRef                    = useRef<HTMLInputElement>(null);

  const addEmail = () => {
    const e = emailInput.trim().toLowerCase();
    if (e && !emails.includes(e)) setEmails([...emails, e]);
    setEmailInput("");
  };

  const loadCsv = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = text.split(/[\n,;]+/).map((s) => s.trim().toLowerCase()).filter((s) => s.includes("@"));
      setEmails((prev) => [...new Set([...prev, ...parsed])]);
      toast.success(`${parsed.length} emails importados`);
    };
    reader.readAsText(file);
  };

  const toggleTag = (tag: string) =>
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);

  const save = async () => {
    setSaving(true);
    try {
      await onSave({ access_type: type, access_emails: emails, access_tags: tags });
      toast.success("Configuración de acceso guardada");
    } catch { toast.error("Error al guardar"); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      {/* Access type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {([
          { v: "all", icon: Globe, label: "Todos los clientes", desc: "Visible para todos los SaaS clientes activos" },
          { v: "specific", icon: Lock, label: "Clientes específicos", desc: "Solo los clientes que especifiques" },
        ] as const).map(({ v, icon: Icon, label, desc }) => (
          <button
            key={v}
            onClick={() => setType(v)}
            className={`flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
              type === v ? "border-blue-500 bg-blue-50/50" : "border-border hover:border-border/80"
            }`}
          >
            <Icon size={16} className={type === v ? "text-blue-500 mt-0.5" : "text-muted-foreground mt-0.5"} />
            <div>
              <p className="text-sm font-semibold">{label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
            </div>
          </button>
        ))}
      </div>

      {type === "specific" && (
        <div className="space-y-4">
          {/* Manual emails */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Mail size={12} /> Emails individuales
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="cliente@email.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addEmail()}
                className="h-9 text-sm"
              />
              <Button variant="outline" size="sm" onClick={addEmail} className="h-9 shrink-0">
                Agregar
              </Button>
            </div>
            {/* CSV upload */}
            <button
              onClick={() => csvRef.current?.click()}
              className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 transition-colors"
            >
              <FileText size={12} /> Importar desde CSV
            </button>
            <input
              ref={csvRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) loadCsv(e.target.files[0]); }}
            />
            {emails.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2 max-h-32 overflow-y-auto">
                {emails.map((email) => (
                  <span key={email} className="flex items-center gap-1 bg-secondary rounded-lg px-2 py-1 text-xs">
                    {email}
                    <button onClick={() => setEmails(emails.filter((e) => e !== email))} className="text-muted-foreground hover:text-destructive ml-0.5">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          {allTags.length > 0 && (
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Tag size={12} /> Por etiquetas de contactos
              </label>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                      tags.includes(tag)
                        ? "bg-blue-500 text-white border-blue-500"
                        : "border-border text-muted-foreground hover:border-blue-300"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Button
        onClick={save}
        disabled={saving}
        className="h-10 px-6 text-sm font-medium"
        style={{ backgroundColor: ACROSOFT_BLUE }}
      >
        {saving ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Check size={14} className="mr-1.5" />}
        Guardar acceso
      </Button>
    </div>
  );
};

// ─── Admin Course Editor ──────────────────────────────────────────────────────

const AdminCourseEditor = ({
  course,
  onBack,
}: {
  course: CrmVideoCourse | null;
  onBack: (created?: CrmVideoCourse) => void;
}) => {
  const isNew = !course;

  const [tab, setTab]           = useState<"content" | "access">("content");
  const [title, setTitle]       = useState(course?.title ?? "");
  const [description, setDesc]  = useState(course?.description ?? "");
  const [thumbFile, setThumb]   = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(course?.thumbnail_url ?? null);
  const [saving, setSaving]     = useState(false);
  const [activeCourse, setActiveCourse] = useState<CrmVideoCourse | null>(course);
  const [addingModule, setAddingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const thumbRef                = useRef<HTMLInputElement>(null);

  const createCourse = useCreateVideoCourse();
  const updateCourse = useUpdateVideoCourse();
  const { data: modules = [] } = useVideoModules(activeCourse?.id ?? null);
  const { data: videos = [], refetch: refetchVideos } = useVideosForCourse(activeCourse?.id ?? null);
  const createModule = useCreateVideoModule();

  // Collect all tags from contacts (we'll just use the course's current tags as seed)
  const [allTags] = useState<string[]>([]);

  const selectThumb = (file: File) => {
    setThumb(file);
    setThumbPreview(URL.createObjectURL(file));
  };

  const uploadThumbnail = async (file: File): Promise<string> => {
    const ext  = file.name.split(".").pop();
    const path = `courses/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("video-thumbnails").upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from("video-thumbnails").getPublicUrl(path);
    return publicUrl;
  };

  const handleSaveCourse = async () => {
    if (!title.trim()) { toast.error("El título es requerido"); return; }
    setSaving(true);
    try {
      let thumbnailUrl = activeCourse?.thumbnail_url ?? null;
      if (thumbFile) thumbnailUrl = await uploadThumbnail(thumbFile);

      if (isNew) {
        const created = await createCourse.mutateAsync({
          title: title.trim(),
          description: description.trim() || null,
          thumbnail_url: thumbnailUrl,
          access_type: "all",
          access_emails: [],
          access_tags: [],
          sort_order: 0,
        });
        setActiveCourse(created);
        toast.success("Curso creado");
      } else {
        const updated = await updateCourse.mutateAsync({
          id: activeCourse!.id,
          title: title.trim(),
          description: description.trim() || null,
          thumbnail_url: thumbnailUrl,
        });
        setActiveCourse(updated);
        toast.success("Curso guardado");
      }
    } catch { toast.error("Error al guardar curso"); }
    finally { setSaving(false); }
  };

  const handleSaveAccess = async (data: Partial<CrmVideoCourse>) => {
    if (!activeCourse) return;
    const updated = await updateCourse.mutateAsync({ id: activeCourse.id, ...data });
    setActiveCourse(updated);
  };

  const handleAddModule = async () => {
    if (!newModuleTitle.trim() || !activeCourse) return;
    try {
      await createModule.mutateAsync({
        course_id: activeCourse.id,
        title: newModuleTitle.trim(),
        description: null,
        sort_order: modules.length,
      });
      setNewModuleTitle(""); setAddingModule(false);
    } catch { toast.error("Error al crear módulo"); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => onBack(activeCourse ?? undefined)}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft size={12} /> Volver a cursos
        </button>
        <h1 className="text-xl font-semibold">{isNew ? "Nuevo Curso" : "Editar Curso"}</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-card border rounded-2xl w-fit">
        {(["content", "access"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            disabled={isNew && !activeCourse && t === "access"}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 ${
              tab === t ? "text-white" : "text-muted-foreground hover:text-foreground"
            }`}
            style={tab === t ? { backgroundColor: ACROSOFT_BLUE } : {}}
          >
            {t === "content" ? "Contenido" : "Acceso"}
          </button>
        ))}
      </div>

      {tab === "content" && (
        <div className="space-y-6">
          {/* Course info card */}
          <div className="bg-card border rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-semibold">Información del curso</h2>

            {/* Thumbnail */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Miniatura</label>
              <div
                onClick={() => thumbRef.current?.click()}
                className="relative w-full aspect-video max-w-xs bg-secondary rounded-2xl overflow-hidden cursor-pointer hover:opacity-80 transition-opacity border-2 border-dashed border-border hover:border-blue-400"
              >
                {thumbPreview ? (
                  <img src={thumbPreview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Upload size={20} />
                    <span className="text-xs">Subir miniatura</span>
                  </div>
                )}
              </div>
              <input ref={thumbRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) selectThumb(e.target.files[0]); }} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Título *</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Marketing Digital Avanzado" className="h-10 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Descripción</label>
              <textarea
                value={description}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Describe de qué trata el curso..."
                className="w-full border border-input rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none bg-background"
                rows={3}
              />
            </div>

            <Button
              onClick={handleSaveCourse}
              disabled={saving}
              className="h-10 px-6 text-sm font-medium"
              style={{ backgroundColor: ACROSOFT_BLUE }}
            >
              {saving ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Check size={14} className="mr-1.5" />}
              {isNew && !activeCourse ? "Crear curso" : "Guardar cambios"}
            </Button>
          </div>

          {/* Modules — only shown after course is created */}
          {activeCourse && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Módulos</h2>
                <span className="text-xs text-muted-foreground">{modules.length} módulo{modules.length !== 1 ? "s" : ""}</span>
              </div>

              {modules.map((m) => (
                <ModuleEditor
                  key={m.id}
                  module={m}
                  courseId={activeCourse.id}
                  videos={videos}
                  onRefreshVideos={refetchVideos}
                />
              ))}

              {addingModule ? (
                <div className="flex items-center gap-2 p-3 bg-secondary/30 rounded-2xl border">
                  <Input
                    autoFocus
                    placeholder="Título del módulo"
                    value={newModuleTitle}
                    onChange={(e) => setNewModuleTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddModule(); if (e.key === "Escape") { setNewModuleTitle(""); setAddingModule(false); } }}
                    className="h-9 text-sm"
                  />
                  <Button size="sm" onClick={handleAddModule} className="h-9 shrink-0" style={{ backgroundColor: ACROSOFT_BLUE }}>
                    <Check size={14} />
                  </Button>
                  <button onClick={() => { setNewModuleTitle(""); setAddingModule(false); }} className="text-muted-foreground hover:text-foreground">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingModule(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                >
                  <Plus size={15} /> Agregar módulo
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "access" && activeCourse && (
        <div className="bg-card border rounded-2xl p-5">
          <h2 className="text-sm font-semibold mb-4">Control de acceso</h2>
          <AccessControl
            course={activeCourse}
            allTags={allTags}
            onSave={handleSaveAccess}
          />
        </div>
      )}
    </div>
  );
};

// ─── Admin Course List ────────────────────────────────────────────────────────

const AdminCourseList = ({
  courses,
  onEdit,
  onCreate,
}: {
  courses: CrmVideoCourse[];
  onEdit: (c: CrmVideoCourse) => void;
  onCreate: () => void;
}) => {
  const [deleting, setDeleting]   = useState<string | null>(null);
  const deleteCourse = useDeleteVideoCourse();

  const handleDelete = async (id: string) => {
    try {
      await deleteCourse.mutateAsync(id);
      toast.success("Curso eliminado");
    } catch { toast.error("Error al eliminar"); }
    finally { setDeleting(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Videos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gestiona los cursos y tutoriales para tus clientes</p>
        </div>
        <Button
          onClick={onCreate}
          className="h-10 text-sm font-medium shrink-0"
          style={{ backgroundColor: ACROSOFT_BLUE }}
        >
          <Plus size={15} className="mr-1.5" /> Nuevo curso
        </Button>
      </div>

      {courses.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-border rounded-3xl">
          <BookOpen size={32} className="text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No hay cursos todavía</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Crea el primer curso para tus clientes</p>
          <Button onClick={onCreate} className="mt-5 h-10 text-sm" style={{ backgroundColor: ACROSOFT_BLUE }}>
            <Plus size={14} className="mr-1.5" /> Crear primer curso
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((c) => (
            <div key={c.id}>
              <DeleteConfirmDialog
                open={deleting === c.id}
                onOpenChange={(o) => !o && setDeleting(null)}
                onConfirm={() => handleDelete(c.id)}
                isPending={deleteCourse.isPending}
                description="Se eliminarán el curso, todos sus módulos y videos permanentemente."
              />
              <div className="bg-card border rounded-2xl overflow-hidden group hover:shadow-md transition-shadow">
                <div className="aspect-video bg-secondary relative overflow-hidden">
                  {c.thumbnail_url ? (
                    <img src={c.thumbnail_url} alt={c.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Video size={28} className="text-muted-foreground/20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-sm leading-tight line-clamp-2">{c.title}</h3>
                  {c.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${c.access_type === "all" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                      {c.access_type === "all" ? "Todos" : "Específico"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      onClick={() => onEdit(c)}
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs"
                    >
                      <Pencil size={11} className="mr-1" /> Gestionar
                    </Button>
                    <button
                      onClick={() => setDeleting(c.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 border transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Client Course Grid ───────────────────────────────────────────────────────

const ClientCourseGrid = ({
  courses,
  onOpen,
}: {
  courses: CrmVideoCourse[];
  onOpen: (c: CrmVideoCourse) => void;
}) => (
  <div className="space-y-6">
    <div>
      <h1 className="text-xl font-semibold">Videos</h1>
      <p className="text-sm text-muted-foreground mt-0.5">Cursos y tutoriales disponibles para ti</p>
    </div>

    {courses.length === 0 ? (
      <div className="text-center py-20 border-2 border-dashed border-border rounded-3xl">
        <BookOpen size={32} className="text-muted-foreground/20 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No hay cursos disponibles aún</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map((c) => (
          <button
            key={c.id}
            onClick={() => onOpen(c)}
            className="bg-card border rounded-2xl overflow-hidden text-left group hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="aspect-video bg-secondary relative overflow-hidden">
              {c.thumbnail_url ? (
                <img src={c.thumbnail_url} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Video size={28} className="text-muted-foreground/20" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                  <Play size={18} className="text-gray-900 ml-0.5" fill="currentColor" />
                </div>
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-sm leading-tight line-clamp-2">{c.title}</h3>
              {c.description && (
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{c.description}</p>
              )}
              <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                <BookOpen size={11} />
                <span>Ver curso</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    )}
  </div>
);

// ─── Client Course Viewer ─────────────────────────────────────────────────────

const ClientCourseViewer = ({
  course,
  onBack,
}: {
  course: CrmVideoCourse;
  onBack: () => void;
}) => {
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());
  const [playing, setPlaying]         = useState<CrmVideo | null>(null);
  const { data: modules = [] }        = useVideoModules(course.id);
  const { data: videos = [] }         = useVideosForCourse(course.id);

  const toggle = (id: string) =>
    setOpenModules((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const totalVideos = videos.length;

  return (
    <>
      {playing && <VideoPlayerModal video={playing} onClose={() => setPlaying(null)} />}

      <div className="space-y-6">
        {/* Back + header */}
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft size={12} /> Volver a cursos
          </button>

          <div className="bg-card border rounded-2xl overflow-hidden">
            {course.thumbnail_url && (
              <div className="aspect-video w-full max-h-56 overflow-hidden">
                <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-5">
              <h1 className="text-xl font-bold leading-tight">{course.title}</h1>
              {course.description && (
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{course.description}</p>
              )}
              <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><BookOpen size={11} /> {modules.length} módulos</span>
                <span className="flex items-center gap-1"><Video size={11} /> {totalVideos} videos</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modules accordion */}
        <div className="space-y-2">
          {modules.map((m, idx) => {
            const moduleVideos = videos.filter((v) => v.module_id === m.id);
            const isOpen = openModules.has(m.id) || idx === 0;
            return (
              <div key={m.id} className="bg-card border rounded-2xl overflow-hidden">
                <button
                  onClick={() => toggle(m.id)}
                  className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-secondary/30 transition-colors"
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                    style={{ backgroundColor: ACROSOFT_BLUE }}
                  >
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{m.title}</p>
                    {m.description && <p className="text-xs text-muted-foreground">{m.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">{moduleVideos.length} videos</span>
                    {isOpen ? <ChevronDown size={15} className="text-muted-foreground" /> : <ChevronRight size={15} className="text-muted-foreground" />}
                  </div>
                </button>

                {isOpen && moduleVideos.length > 0 && (
                  <div className="border-t divide-y">
                    {moduleVideos.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setPlaying(v)}
                        className="w-full flex items-center gap-4 px-5 py-3 text-left hover:bg-secondary/20 transition-colors group"
                      >
                        <div className="w-20 h-12 rounded-xl overflow-hidden bg-secondary shrink-0 relative">
                          <img
                            src={v.thumbnail_url ?? bunnyThumbnail(v.bunny_video_id)}
                            alt={v.title}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                            <div className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Play size={12} className="text-gray-900 ml-0.5" fill="currentColor" />
                            </div>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-1">{v.title}</p>
                          {v.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{v.description}</p>
                          )}
                        </div>
                        <Play size={14} className="text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                )}

                {isOpen && moduleVideos.length === 0 && (
                  <div className="border-t px-5 py-4 text-xs text-muted-foreground">
                    No hay videos en este módulo aún.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  isAdmin: boolean;
}

type AdminView = { type: "list" } | { type: "editor"; course: CrmVideoCourse | null };
type ClientView = { type: "grid" } | { type: "viewer"; course: CrmVideoCourse };

const CrmVideos = ({ isAdmin }: Props) => {
  const { data: courses = [], isLoading } = useVideoCourses();

  const [adminView, setAdminView]   = useState<AdminView>({ type: "list" });
  const [clientView, setClientView] = useState<ClientView>({ type: "grid" });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Admin ──
  if (isAdmin) {
    if (adminView.type === "editor") {
      return (
        <AdminCourseEditor
          course={adminView.course}
          onBack={() => setAdminView({ type: "list" })}
        />
      );
    }
    return (
      <AdminCourseList
        courses={courses}
        onEdit={(c) => setAdminView({ type: "editor", course: c })}
        onCreate={() => setAdminView({ type: "editor", course: null })}
      />
    );
  }

  // ── Client ──
  if (clientView.type === "viewer") {
    return (
      <ClientCourseViewer
        course={clientView.course}
        onBack={() => setClientView({ type: "grid" })}
      />
    );
  }
  return (
    <ClientCourseGrid
      courses={courses}
      onOpen={(c) => setClientView({ type: "viewer", course: c })}
    />
  );
};

export default CrmVideos;
