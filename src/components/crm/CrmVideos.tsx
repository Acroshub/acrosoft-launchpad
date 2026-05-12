import { useState, useRef, useCallback, useEffect } from "react";
import * as tus from "tus-js-client";
import {
  Plus, ArrowLeft, Pencil, Trash2, Play, Upload, Loader2,
  ChevronDown, ChevronRight, BookOpen, Video, Users,
  X, Check, Globe, Lock, Tag, Mail, FileText, Camera, GripVertical,
} from "lucide-react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, useSortable,
  verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { CrmVideoCourse, CrmVideoModule, CrmVideo } from "@/lib/supabase";
import {
  useVideoCourses, useVideoModules, useVideosForCourse,
  useCreateVideoCourse, useUpdateVideoCourse, useDeleteVideoCourse,
  useCreateVideoModule, useUpdateVideoModule, useDeleteVideoModule,
  useCreateVideo, useUpdateVideo, useDeleteVideo, useAllContactTags,
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

// ─── Pending upload persistence ──────────────────────────────────────────────

const PENDING_KEY = "acros_pending_video_uploads";

type PendingUpload = {
  id: string;          // moduleId used as key
  moduleId: string;
  courseId: string;
  bunnyVideoId: string;
  title: string;
  progress: number;
  startedAt: string;
};

const getPending = (): PendingUpload[] => {
  try { return JSON.parse(localStorage.getItem(PENDING_KEY) ?? "[]"); }
  catch { return []; }
};
const savePending = (u: PendingUpload) => {
  const list = getPending().filter((p) => p.id !== u.id);
  localStorage.setItem(PENDING_KEY, JSON.stringify([...list, u]));
};
const removePending = (id: string) => {
  localStorage.setItem(PENDING_KEY, JSON.stringify(getPending().filter((p) => p.id !== id)));
};

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
  const [pending, setPending]       = useState<PendingUpload | null>(null);
  const fileRef                     = useRef<HTMLInputElement>(null);
  const uploadRef                   = useRef<tus.Upload | null>(null);
  const createVideo                 = useCreateVideo();

  useEffect(() => {
    const found = getPending().find((p) => p.moduleId === moduleId) ?? null;
    if (found) { setPending(found); setTitle(found.title); setProgress(found.progress); }
  }, [moduleId]);

  const dismissPending = () => {
    removePending(moduleId);
    setPending(null);
    setTitle(""); setProgress(0);
  };

  const handleCancel = async () => {
    uploadRef.current?.abort();
    uploadRef.current = null;
    setUploading(false);
    setFile(null);
    setProgress(0);
    if (fileRef.current) fileRef.current.value = "";
  };

  const startUpload = useCallback(async (selectedFile: File, titleOverride?: string) => {
    const trimmedTitle = (titleOverride ?? title).trim().slice(0, 200);
    if (!trimmedTitle) { toast.error("Escribe el título antes de seleccionar el archivo"); return; }
    if (selectedFile.size > 2 * 1024 * 1024 * 1024) { toast.error("El archivo no puede superar 2 GB"); return; }
    if (!selectedFile.type.startsWith("video/")) { toast.error("Solo se permiten archivos de video"); return; }

    setUploading(true);
    setProgress(0);
    try {
      const isResume = !!pending?.bunnyVideoId;
      const { data: fnData, error: fnErr } = await supabase.functions.invoke("bunny-video", {
        body: isResume
          ? { action: "auth", bunnyVideoId: pending!.bunnyVideoId }
          : { action: "create", title: trimmedTitle },
      });
      if (fnErr || fnData?.error) throw new Error(fnData?.error ?? fnErr?.message ?? "Error al obtener credenciales");

      const { bunnyVideoId, tusExpire, tusSignature, libraryId } = fnData as {
        bunnyVideoId: string; tusExpire: number; tusSignature: string; libraryId: string;
      };
      if (!/^[a-f0-9-]{36}$/.test(bunnyVideoId)) throw new Error("Respuesta inválida del servidor");
      if (typeof tusExpire !== "number" || typeof tusSignature !== "string") throw new Error("Respuesta inválida del servidor");

      const startedAt = pending?.startedAt ?? new Date().toISOString();
      const record: PendingUpload = { id: moduleId, moduleId, courseId, bunnyVideoId, title: trimmedTitle, progress: 0, startedAt };
      savePending(record);
      if (!isResume) setPending(record);

      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(selectedFile, {
          endpoint: "https://video.bunnycdn.com/tusupload",
          retryDelays: [0, 3000, 5000, 10000, 20000],
          storeFingerprintForResuming: true,
          headers: {
            AuthorizationSignature: tusSignature,
            AuthorizationExpire: String(tusExpire),
            VideoId: bunnyVideoId,
            LibraryId: libraryId,
          },
          metadata: { filetype: selectedFile.type, title: trimmedTitle },
          onError: reject,
          onProgress: (uploaded, total) => {
            const pct = Math.round((uploaded / total) * 100);
            setProgress(pct);
            savePending({ ...record, progress: pct });
          },
          onSuccess: () => resolve(),
        });
        uploadRef.current = upload;
        upload.start();
      });

      await createVideo.mutateAsync({
        course_id:        courseId,
        module_id:        moduleId,
        title:            trimmedTitle,
        description:      description.trim() || null,
        bunny_video_id:   bunnyVideoId,
        thumbnail_url:    bunnyThumbnail(bunnyVideoId),
        duration_seconds: null,
        sort_order:       0,
      });

      removePending(moduleId);
      setPending(null);
      toast.success("Video subido exitosamente");
      setTitle(""); setDescription(""); setFile(null); setProgress(0);
      uploadRef.current = null;
      onCreated();
    } catch (err: any) {
      if (err?.message?.includes("abort") || err?.message?.includes("cancel")) return;
      console.error(err);
      toast.error("Error al subir el video: " + (err?.message ?? ""));
    } finally {
      setUploading(false);
    }
  }, [title, description, pending, courseId, moduleId, createVideo, onCreated]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    // Pre-fill title from filename if empty
    if (!title.trim()) {
      const guessed = selected.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ").trim();
      setTitle(guessed);
      startUpload(selected, guessed);
    } else {
      startUpload(selected);
    }
  };

  return (
    <div className="border border-border rounded-2xl overflow-hidden">

      {/* Interrupted upload banner */}
      {pending && !uploading && (
        <div className="flex items-start gap-3 bg-amber-50 border-b border-amber-200 px-4 py-3">
          <Loader2 size={13} className="text-amber-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-800">Subida interrumpida</p>
            <p className="text-[11px] text-amber-700 truncate mt-0.5">"{pending.title}" · {pending.progress}% completado</p>
            <p className="text-[10px] text-amber-600 mt-1">Selecciona el mismo archivo para retomar automáticamente</p>
          </div>
          <button onClick={dismissPending} className="text-amber-400 hover:text-amber-600 transition-colors shrink-0">
            <X size={13} />
          </button>
        </div>
      )}

      <div className="p-4 space-y-3 bg-secondary/20">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          {pending ? "Retomar video" : "Nuevo video"}
        </p>

        {/* Title + description */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
        </div>

        {/* File picker / progress */}
        {uploading ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 size={12} className="animate-spin" />
                <span className="truncate max-w-[200px]">{file?.name}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-semibold tabular-nums" style={{ color: ACROSOFT_BLUE }}>{progress}%</span>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X size={11} /> Cancelar
                </button>
              </div>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%`, backgroundColor: ACROSOFT_BLUE }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground/60">Subiendo a Bunny Stream… puedes cerrar esta ventana, el progreso se guardará.</p>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border hover:border-blue-400 hover:bg-blue-50/30 transition-all text-sm text-muted-foreground hover:text-foreground"
          >
            <Upload size={15} style={{ color: ACROSOFT_BLUE }} />
            {file
              ? <span className="truncate max-w-[240px] text-xs">{file.name}</span>
              : <span>{pending ? "Seleccionar archivo para retomar" : "Seleccionar archivo de video"}</span>
            }
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
};

// ─── Edit Video Panel ─────────────────────────────────────────────────────────

const EditVideoPanel = ({
  video,
  courseId,
  onSaved,
  onCancel,
}: {
  video: CrmVideo;
  courseId: string;
  onSaved: () => void;
  onCancel: () => void;
}) => {
  const [title, setTitle]         = useState(video.title);
  const [description, setDesc]    = useState(video.description ?? "");
  const [saving, setSaving]       = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [file, setFile]           = useState<File | null>(null);
  const [progress, setProgress]   = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileRef                   = useRef<HTMLInputElement>(null);
  const uploadRef                 = useRef<tus.Upload | null>(null);
  const updateVideo               = useUpdateVideo();

  const handleSaveMeta = async () => {
    const trimmedTitle = title.trim().slice(0, 200);
    if (!trimmedTitle) { toast.error("El título es requerido"); return; }
    setSaving(true);
    try {
      await updateVideo.mutateAsync({ id: video.id, course_id: courseId, title: trimmedTitle, description: description.trim() || null });
      toast.success("Video actualizado");
      onSaved();
    } catch { toast.error("Error al guardar"); }
    finally { setSaving(false); }
  };

  const handleCancelUpload = () => {
    uploadRef.current?.abort();
    uploadRef.current = null;
    setUploading(false); setFile(null); setProgress(0);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.size > 2 * 1024 * 1024 * 1024) { toast.error("El archivo no puede superar 2 GB"); return; }
    if (!selected.type.startsWith("video/")) { toast.error("Solo se permiten archivos de video"); return; }
    e.target.value = "";
    setFile(selected); setUploading(true); setProgress(0);
    const trimmedTitle = title.trim().slice(0, 200) || video.title;
    try {
      const { data: fnData, error: fnErr } = await supabase.functions.invoke("bunny-video", {
        body: { action: "create", title: trimmedTitle },
      });
      if (fnErr || fnData?.error) throw new Error(fnData?.error ?? fnErr?.message);
      const { bunnyVideoId: newId, tusExpire, tusSignature, libraryId } = fnData;
      if (!/^[a-f0-9-]{36}$/.test(newId)) throw new Error("Respuesta inválida del servidor");

      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(selected, {
          endpoint: "https://video.bunnycdn.com/tusupload",
          retryDelays: [0, 3000, 5000, 10000],
          storeFingerprintForResuming: false,
          headers: {
            AuthorizationSignature: tusSignature,
            AuthorizationExpire: String(tusExpire),
            VideoId: newId,
            LibraryId: libraryId,
          },
          metadata: { filetype: selected.type, title: trimmedTitle },
          onError: reject,
          onProgress: (up, total) => setProgress(Math.round((up / total) * 100)),
          onSuccess: () => resolve(),
        });
        uploadRef.current = upload;
        upload.start();
      });

      await supabase.functions.invoke("bunny-video", {
        body: { action: "delete", bunnyVideoId: video.bunny_video_id },
      });
      await updateVideo.mutateAsync({
        id: video.id, course_id: courseId,
        title: trimmedTitle, description: description.trim() || null,
        bunny_video_id: newId, thumbnail_url: bunnyThumbnail(newId),
      });
      toast.success("Video reemplazado exitosamente");
      onSaved();
    } catch (err: any) {
      if (err?.message?.includes("abort") || err?.message?.includes("cancel")) return;
      toast.error("Error al reemplazar: " + (err?.message ?? ""));
      setFile(null); setProgress(0);
    } finally {
      setUploading(false); uploadRef.current = null;
    }
  };

  return (
    <div className="border-2 border-blue-200 rounded-2xl overflow-hidden">
      <div className="px-4 py-2.5 bg-blue-50/70 border-b border-blue-100 flex items-center gap-2">
        <Pencil size={12} className="text-blue-500" />
        <p className="text-xs font-semibold text-blue-700 flex-1">Editar video</p>
        <button onClick={onCancel} disabled={uploading} className="text-blue-400 hover:text-blue-600 disabled:opacity-40 transition-colors">
          <X size={13} />
        </button>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-20 h-12 rounded-xl overflow-hidden bg-secondary shrink-0">
            <img src={video.thumbnail_url ?? bunnyThumbnail(video.bunny_video_id)} alt={video.title}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          </div>
          <div className="flex-1 space-y-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título *" className="h-9 text-sm" disabled={uploading} />
            <Input value={description} onChange={(e) => setDesc(e.target.value)} placeholder="Descripción (opcional)" className="h-9 text-sm" disabled={uploading} />
          </div>
        </div>

        <div className="border border-border rounded-xl overflow-hidden">
          <button
            onClick={() => setReplacing(!replacing)}
            disabled={uploading}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors disabled:opacity-50"
          >
            <Video size={12} />
            Reemplazar video
            {replacing ? <ChevronDown size={11} className="ml-auto" /> : <ChevronRight size={11} className="ml-auto" />}
          </button>
          {replacing && (
            <div className="border-t px-3 py-3 bg-secondary/10 space-y-2">
              {uploading ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 size={11} className="animate-spin" />
                      <span className="truncate max-w-[180px]">{file?.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-semibold tabular-nums" style={{ color: ACROSOFT_BLUE }}>{progress}%</span>
                      <button onClick={handleCancelUpload} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive transition-colors">
                        <X size={10} /> Cancelar
                      </button>
                    </div>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: ACROSOFT_BLUE }} />
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-border hover:border-blue-400 hover:bg-blue-50/30 transition-all text-xs text-muted-foreground hover:text-foreground"
                >
                  <Upload size={13} style={{ color: ACROSOFT_BLUE }} />
                  Seleccionar nuevo archivo de video
                </button>
              )}
              <p className="text-[10px] text-muted-foreground/60">El video actual se eliminará al completar la subida del nuevo.</p>
            </div>
          )}
        </div>

        <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={handleReplaceFile} />

        <div className="flex items-center gap-2">
          <Button onClick={handleSaveMeta} disabled={saving || uploading} size="sm" className="h-9 px-5 text-xs font-semibold" style={{ backgroundColor: ACROSOFT_BLUE }}>
            {saving ? <Loader2 size={11} className="animate-spin mr-1.5" /> : <Check size={11} className="mr-1.5" />}
            Guardar cambios
          </Button>
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={uploading} className="h-9 px-4 text-xs">
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── Sortable Video Item ──────────────────────────────────────────────────────

const SortableVideoItem = ({
  video,
  index,
  courseId,
  thumbnailLoadingId,
  onThumbnailClick,
  onDelete,
  onVideoUpdated,
}: {
  video: CrmVideo;
  index: number;
  courseId: string;
  thumbnailLoadingId: string | null;
  onThumbnailClick: (id: string) => void;
  onDelete: (v: CrmVideo) => void;
  onVideoUpdated: () => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: video.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  if (isEditing) {
    return (
      <div ref={setNodeRef} style={style}>
        <EditVideoPanel
          video={video}
          courseId={courseId}
          onSaved={() => { setIsEditing(false); onVideoUpdated(); }}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 rounded-2xl border bg-secondary/10 hover:bg-secondary/30 transition-colors group"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground shrink-0 touch-none"
        title="Arrastrar para reordenar"
      >
        <GripVertical size={14} />
      </button>
      <span className="text-[11px] font-bold text-muted-foreground/40 w-4 text-center shrink-0">
        {index + 1}
      </span>
      <div
        className="w-20 h-12 rounded-xl overflow-hidden bg-secondary shrink-0 relative cursor-pointer"
        title="Cambiar miniatura"
        onClick={() => onThumbnailClick(video.id)}
      >
        <img
          src={video.thumbnail_url ?? bunnyThumbnail(video.bunny_video_id)}
          alt={video.title}
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/50 transition-colors">
          {thumbnailLoadingId === video.id
            ? <Loader2 size={14} className="text-white animate-spin" />
            : <Camera size={13} className="text-white opacity-0 hover:opacity-100 transition-opacity" />
          }
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{video.title}</p>
        {video.description && (
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{video.description}</p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setIsEditing(true)}
          title="Editar video"
          className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <Pencil size={12} />
        </button>
        <button
          onClick={() => onDelete(video)}
          title="Eliminar video"
          className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
};

// ─── Module Editor (admin) ────────────────────────────────────────────────────

const ModuleEditor = ({
  module,
  courseId,
  index,
  videos,
  onRefreshVideos,
  dragHandle,
}: {
  module: CrmVideoModule;
  courseId: string;
  index: number;
  videos: CrmVideo[];
  onRefreshVideos: () => void;
  dragHandle?: React.ReactNode;
}) => {
  const [open, setOpen]             = useState(true);
  const [editingTitle, setEditing]  = useState(false);
  const [title, setTitle]           = useState(module.title);
  const [saving, setSaving]         = useState(false);
  const [addingVideo, setAdding]    = useState(false);
  const [deletingModule, setDeletingModule] = useState(false);
  const [deletingVideo, setDeletingVideo]   = useState<CrmVideo | null>(null);
  const [thumbnailLoadingId, setThumbnailLoadingId] = useState<string | null>(null);
  const [localVideos, setLocalVideos]               = useState<CrmVideo[]>([]);
  const pendingThumbVideoId = useRef<string | null>(null);
  const thumbInputRef       = useRef<HTMLInputElement>(null);
  const updateModule = useUpdateVideoModule();
  const deleteModule = useDeleteVideoModule();
  const deleteVideo  = useDeleteVideo();
  const updateVideo  = useUpdateVideo();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    setLocalVideos(videos.filter((v) => v.module_id === module.id));
  }, [videos, module.id]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = localVideos.findIndex((v) => v.id === active.id);
    const newIdx = localVideos.findIndex((v) => v.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(localVideos, oldIdx, newIdx);
    setLocalVideos(reordered);
    await Promise.all(
      reordered.map((v, idx) =>
        supabase.from("crm_videos").update({ sort_order: idx }).eq("id", v.id),
      ),
    );
    onRefreshVideos();
  };

  const THUMB_ALLOWED: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
  };

  const handleThumbnailClick = (videoId: string) => {
    pendingThumbVideoId.current = videoId;
    thumbInputRef.current?.click();
  };

  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const videoId = pendingThumbVideoId.current;
    if (!file || !videoId) return;
    e.target.value = "";

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!THUMB_ALLOWED[ext] || !file.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes JPG, PNG o WebP"); return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("La imagen no puede superar 10 MB"); return;
    }

    setThumbnailLoadingId(videoId);
    try {
      const safeName = `${Date.now()}.${ext}`;
      const path = `videos/${videoId}/${safeName}`;
      const { error: upErr } = await supabase.storage.from("video-thumbnails").upload(path, file, {
        upsert: true, contentType: THUMB_ALLOWED[ext],
      });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("video-thumbnails").getPublicUrl(path);
      await updateVideo.mutateAsync({ id: videoId, course_id: courseId, thumbnail_url: publicUrl });
      toast.success("Miniatura actualizada");
      onRefreshVideos();
    } catch (err: any) {
      toast.error("Error al actualizar miniatura: " + (err?.message ?? ""));
    } finally {
      setThumbnailLoadingId(null);
      pendingThumbVideoId.current = null;
    }
  };

  const saveTitle = async () => {
    if (!title.trim() || title.trim() === module.title) { setEditing(false); return; }
    setSaving(true);
    try {
      await updateModule.mutateAsync({ id: module.id, course_id: courseId, title: title.trim().slice(0, 200) });
      setEditing(false);
      toast.success("Módulo guardado");
    } catch { toast.error("Error al guardar"); }
    finally { setSaving(false); }
  };

  const cancelEdit = () => { setTitle(module.title); setEditing(false); };

  const handleDeleteModule = async () => {
    try {
      await deleteModule.mutateAsync({ id: module.id, course_id: courseId });
      toast.success("Módulo eliminado");
    } catch { toast.error("Error al eliminar módulo"); }
  };

  const handleDeleteVideo = async () => {
    if (!deletingVideo) return;
    try {
      await supabase.functions.invoke("bunny-video", {
        body: { action: "delete", bunnyVideoId: deletingVideo.bunny_video_id },
      });
      await deleteVideo.mutateAsync({ id: deletingVideo.id, course_id: courseId });
      toast.success("Video eliminado");
      onRefreshVideos();
    } catch { toast.error("Error al eliminar video"); }
    finally { setDeletingVideo(null); }
  };


  return (
    <>
      <DeleteConfirmDialog
        open={deletingModule}
        onOpenChange={setDeletingModule}
        onConfirm={handleDeleteModule}
        isPending={deleteModule.isPending}
        description="Se eliminarán el módulo y todos sus videos permanentemente."
      />
      <DeleteConfirmDialog
        open={!!deletingVideo}
        onOpenChange={(o) => !o && setDeletingVideo(null)}
        onConfirm={handleDeleteVideo}
        isPending={deleteVideo.isPending}
        description={`¿Eliminar el video "${deletingVideo?.title}"? Esta acción no se puede deshacer.`}
      />
      <input
        ref={thumbInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleThumbnailChange}
      />

      <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">

        {/* ── Module header ── */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b bg-secondary/20">
          {/* Drag handle (optional, injected by SortableModuleWrapper) */}
          {dragHandle}
          {/* Number badge */}
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
            style={{ backgroundColor: ACROSOFT_BLUE }}
          >
            {index + 1}
          </div>

          {/* Title / edit mode */}
          {editingTitle ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-8 text-sm flex-1 font-semibold"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") cancelEdit(); }}
              />
              <button
                onClick={saveTitle}
                disabled={saving}
                className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                Guardar
              </button>
              <button
                onClick={cancelEdit}
                className="h-8 px-3 rounded-lg border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <>
              <p className="flex-1 text-sm font-semibold leading-tight">{module.title}</p>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[11px] text-muted-foreground mr-1">
                  {localVideos.length} {localVideos.length === 1 ? "video" : "videos"}
                </span>
                <button
                  onClick={() => setEditing(true)}
                  title="Editar nombre"
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => setDeletingModule(true)}
                  title="Eliminar módulo"
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
                <button
                  onClick={() => setOpen(!open)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── Video list ── */}
        {open && (
          <div className="p-4 space-y-2">
            {localVideos.length === 0 && !addingVideo && (
              <div className="py-6 flex flex-col items-center gap-2 text-muted-foreground/50">
                <Video size={22} />
                <p className="text-xs">Sin videos — agrega el primero</p>
              </div>
            )}

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={localVideos.map((v) => v.id)} strategy={verticalListSortingStrategy}>
                {localVideos.map((v, vIdx) => (
                  <SortableVideoItem
                    key={v.id}
                    video={v}
                    index={vIdx}
                    courseId={courseId}
                    thumbnailLoadingId={thumbnailLoadingId}
                    onThumbnailClick={handleThumbnailClick}
                    onDelete={setDeletingVideo}
                    onVideoUpdated={onRefreshVideos}
                  />
                ))}
              </SortableContext>
            </DndContext>

            {/* Upload row or Add button */}
            {addingVideo ? (
              <div className="mt-2">
                <VideoUploadRow
                  courseId={courseId}
                  moduleId={module.id}
                  onCreated={() => { setAdding(false); onRefreshVideos(); }}
                />
                <button
                  onClick={() => setAdding(false)}
                  className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="w-full flex items-center justify-center gap-2 py-3 mt-1 rounded-2xl border-2 border-dashed border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-blue-300 hover:bg-blue-50/30 transition-all"
              >
                <Plus size={14} style={{ color: ACROSOFT_BLUE }} />
                <span>Agregar video</span>
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

// ─── Sortable Module Wrapper ──────────────────────────────────────────────────

type ModuleEditorProps = React.ComponentProps<typeof ModuleEditor>;

const SortableModuleWrapper = (props: ModuleEditorProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.module.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  };
  const dragHandle = (
    <button
      {...attributes}
      {...listeners}
      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/20 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none shrink-0 -ml-1"
      title="Arrastrar módulo"
    >
      <GripVertical size={15} />
    </button>
  );
  return (
    <div ref={setNodeRef} style={style}>
      <ModuleEditor {...props} dragHandle={dragHandle} />
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

  const [tab, setTab]           = useState<"info" | "access" | "content">("info");
  const [title, setTitle]       = useState(course?.title ?? "");
  const [description, setDesc]  = useState(course?.description ?? "");
  const [coverFile, setCover]   = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(course?.thumbnail_url ?? null);
  const [saving, setSaving]     = useState(false);
  const [activeCourse, setActiveCourse] = useState<CrmVideoCourse | null>(course);
  const [addingModule, setAddingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const coverRef                = useRef<HTMLInputElement>(null);

  const createCourse = useCreateVideoCourse();
  const updateCourse = useUpdateVideoCourse();
  const { data: modules = [] } = useVideoModules(activeCourse?.id ?? null);
  const { data: videos = [], refetch: refetchVideos } = useVideosForCourse(activeCourse?.id ?? null);
  const createModule = useCreateVideoModule();

  const { data: allTags = [] } = useAllContactTags();

  const [localModules, setLocalModules] = useState<typeof modules>([]);
  useEffect(() => { setLocalModules(modules); }, [modules]);

  const moduleSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleModuleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = localModules.findIndex((m) => m.id === active.id);
    const newIdx = localModules.findIndex((m) => m.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(localModules, oldIdx, newIdx);
    setLocalModules(reordered);
    await Promise.all(
      reordered.map((m, idx) =>
        supabase.from("crm_video_modules").update({ sort_order: idx }).eq("id", m.id),
      ),
    );
  };

  const ALLOWED_IMAGE_TYPES: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
  };
  const MAX_COVER_SIZE = 10 * 1024 * 1024; // 10 MB

  const selectCover = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_IMAGE_TYPES[ext] || !file.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes JPG, PNG o WebP"); return;
    }
    if (file.size > MAX_COVER_SIZE) {
      toast.error("La imagen no puede superar 10 MB"); return;
    }
    setCover(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const uploadCover = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_IMAGE_TYPES[ext]) throw new Error("Tipo de archivo no permitido");
    const safeName = `${Date.now()}.${ext}`;
    const path = `courses/${safeName}`;
    const { error } = await supabase.storage.from("video-thumbnails").upload(path, file, {
      upsert: true,
      contentType: ALLOWED_IMAGE_TYPES[ext],
    });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from("video-thumbnails").getPublicUrl(path);
    return publicUrl;
  };

  const handleSaveCourse = async () => {
    const trimmedTitle = title.trim().slice(0, 200);
    if (!trimmedTitle) { toast.error("El título es requerido"); return; }
    setSaving(true);
    try {
      let thumbnailUrl = activeCourse?.thumbnail_url ?? null;
      if (coverFile) thumbnailUrl = await uploadCover(coverFile);

      const safeDescription = description.trim().slice(0, 1000) || null;

      if (isNew) {
        const created = await createCourse.mutateAsync({
          title: trimmedTitle,
          description: safeDescription,
          thumbnail_url: thumbnailUrl,
          access_type: "all",
          access_emails: [],
          access_tags: [],
          sort_order: 0,
        });
        setActiveCourse(created);
        toast.success("Curso creado — ahora configura el acceso y agrega módulos");
        setTab("access");
      } else {
        const updated = await updateCourse.mutateAsync({
          id: activeCourse!.id,
          title: trimmedTitle,
          description: safeDescription,
          thumbnail_url: thumbnailUrl,
        });
        setActiveCourse(updated);
        toast.success("Información guardada");
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

  const TABS = [
    { id: "info",    label: "Información" },
    { id: "access",  label: "Acceso" },
    { id: "content", label: "Contenido" },
  ] as const;

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
        {TABS.map((t) => {
          const locked = isNew && !activeCourse && t.id !== "info";
          return (
            <button
              key={t.id}
              onClick={() => !locked && setTab(t.id)}
              disabled={locked}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 ${
                tab === t.id ? "text-white" : "text-muted-foreground hover:text-foreground"
              }`}
              style={tab === t.id ? { backgroundColor: ACROSOFT_BLUE } : {}}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab: Información ── */}
      {tab === "info" && (
        <div className="bg-card border rounded-2xl p-5 space-y-5">
          {/* Cover + fields side by side */}
          <div className="flex flex-col sm:flex-row gap-5">
            {/* Cover image */}
            <div className="space-y-1.5 shrink-0">
              <label className="text-xs font-semibold text-muted-foreground">Foto de portada</label>
              <div
                onClick={() => coverRef.current?.click()}
                className="relative w-full sm:w-56 aspect-video bg-secondary rounded-2xl overflow-hidden cursor-pointer hover:opacity-80 transition-opacity border-2 border-dashed border-border hover:border-blue-400"
              >
                {coverPreview ? (
                  <img src={coverPreview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-muted-foreground">
                    <Upload size={18} />
                    <span className="text-xs font-medium">Subir portada</span>
                    <span className="text-[10px] text-muted-foreground/60">1280 × 720 px</span>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground/60">JPG, PNG o WebP · 16:9</p>
              <input ref={coverRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { if (e.target.files?.[0]) selectCover(e.target.files[0]); }} />
            </div>

            {/* Title + Description stacked beside the cover */}
            <div className="flex flex-col gap-4 flex-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Título *</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Marketing Digital Avanzado"
                  className="h-10 text-sm"
                />
              </div>
              <div className="space-y-1.5 flex-1">
                <label className="text-xs font-semibold text-muted-foreground">Descripción</label>
                <textarea
                  value={description}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Describe de qué trata el curso..."
                  className="w-full h-full min-h-[80px] border border-input rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none bg-background"
                />
              </div>
            </div>
          </div>

          <Button
            onClick={handleSaveCourse}
            disabled={saving}
            className="h-10 px-6 text-sm font-medium"
            style={{ backgroundColor: ACROSOFT_BLUE }}
          >
            {saving ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Check size={14} className="mr-1.5" />}
            {isNew && !activeCourse ? "Crear curso" : "Guardar información"}
          </Button>
        </div>
      )}

      {/* ── Tab: Acceso ── */}
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

      {/* ── Tab: Contenido (módulos) ── */}
      {tab === "content" && activeCourse && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Módulos</h2>
            <span className="text-xs text-muted-foreground">{localModules.length} módulo{localModules.length !== 1 ? "s" : ""}</span>
          </div>

          <DndContext sensors={moduleSensors} collisionDetection={closestCenter} onDragEnd={handleModuleDragEnd}>
            <SortableContext items={localModules.map((m) => m.id)} strategy={verticalListSortingStrategy}>
              {localModules.map((m, idx) => (
                <SortableModuleWrapper
                  key={m.id}
                  module={m}
                  index={idx}
                  courseId={activeCourse.id}
                  videos={videos}
                  onRefreshVideos={refetchVideos}
                />
              ))}
            </SortableContext>
          </DndContext>

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
  const [selected, setSelected]       = useState<CrmVideo | null>(null);
  const [started, setStarted]         = useState(false);
  const initializedRef                = useRef(false);
  const { data: modules = [], isLoading: loadingModules } = useVideoModules(course.id);
  const { data: videos = [], isLoading: loadingVideos }   = useVideosForCourse(course.id);

  useEffect(() => {
    if (initializedRef.current || modules.length === 0) return;
    setOpenModules(new Set(modules.map((m) => m.id)));
    initializedRef.current = true;
  }, [modules]);

  const selectVideo = (v: CrmVideo) => {
    setSelected(v);
    setStarted(false);
  };

  const toggle = (id: string) =>
    setOpenModules((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const isLoading = loadingModules || loadingVideos;

  return (
    <div className="space-y-4">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={12} /> Volver a cursos
      </button>

      {/* Main layout: sidebar + player */}
      <div className="flex flex-col lg:flex-row rounded-2xl border overflow-hidden bg-card min-h-[480px] lg:min-h-[600px]">

        {/* ── Left sidebar: curriculum ── */}
        <div className="lg:w-80 shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r">
          {/* Course info */}
          <div className="p-4 border-b bg-secondary/10 shrink-0">
            <h1 className="font-bold text-base leading-tight">{course.title}</h1>
            {course.description && (
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-3">{course.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2.5 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><BookOpen size={10} /> {modules.length} módulos</span>
              <span className="flex items-center gap-1"><Video size={10} /> {videos.length} videos</span>
            </div>
          </div>

          {/* Scrollable module + video list */}
          <div className="flex-1 overflow-y-auto max-h-64 lg:max-h-none">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={18} className="animate-spin text-muted-foreground" />
              </div>
            ) : modules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/50 gap-2">
                <Video size={22} />
                <p className="text-xs">Sin contenido aún</p>
              </div>
            ) : (
              modules.map((m, idx) => {
                const moduleVideos = videos.filter((v) => v.module_id === m.id);
                const isOpen = openModules.has(m.id);
                return (
                  <div key={m.id} className="border-b last:border-b-0">
                    {/* Module header */}
                    <button
                      onClick={() => toggle(m.id)}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-secondary/30 transition-colors"
                    >
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                        style={{ backgroundColor: ACROSOFT_BLUE }}
                      >
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{m.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{moduleVideos.length} {moduleVideos.length === 1 ? "video" : "videos"}</p>
                      </div>
                      {isOpen
                        ? <ChevronDown size={13} className="text-muted-foreground shrink-0" />
                        : <ChevronRight size={13} className="text-muted-foreground shrink-0" />
                      }
                    </button>

                    {/* Video list */}
                    {isOpen && (
                      <div className="bg-secondary/5">
                        {moduleVideos.length === 0 ? (
                          <p className="px-4 py-3 text-[11px] text-muted-foreground italic">Sin videos</p>
                        ) : moduleVideos.map((v) => {
                          const isSelected = selected?.id === v.id;
                          return (
                            <button
                              key={v.id}
                              onClick={() => selectVideo(v)}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-t border-border/40 ${
                                isSelected
                                  ? "bg-blue-50 dark:bg-blue-950/30"
                                  : "hover:bg-secondary/30"
                              }`}
                            >
                              {/* Thumbnail */}
                              <div className="w-14 h-9 rounded-lg overflow-hidden bg-secondary shrink-0 relative">
                                <img
                                  src={v.thumbnail_url ?? bunnyThumbnail(v.bunny_video_id)}
                                  alt={v.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                />
                                {isSelected && started && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-blue-500/50">
                                    <Play size={10} className="text-white" fill="currentColor" />
                                  </div>
                                )}
                              </div>
                              {/* Title */}
                              <p className={`text-xs flex-1 line-clamp-2 leading-tight ${isSelected ? "font-semibold text-blue-700 dark:text-blue-400" : "text-foreground"}`}>
                                {v.title}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right: video player ── */}
        <div className="flex-1 flex flex-col bg-black/95 min-h-[260px]">
          {!selected && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-white/30 p-8">
              <Play size={48} />
              <p className="text-sm">Selecciona un video del menú para comenzar</p>
            </div>
          )}

          {selected && !started && (
            <>
              <div
                className="flex-1 relative cursor-pointer group min-h-[260px]"
                onClick={() => setStarted(true)}
              >
                <img
                  src={selected.thumbnail_url ?? bunnyThumbnail(selected.bunny_video_id)}
                  alt={selected.title}
                  className="w-full h-full object-cover absolute inset-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-white/95 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                    <Play size={26} className="text-gray-900 ml-1" fill="currentColor" />
                  </div>
                </div>
              </div>
              <div className="px-5 py-4 bg-card border-t shrink-0">
                <p className="font-semibold text-sm leading-tight">{selected.title}</p>
                {selected.description && (
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{selected.description}</p>
                )}
              </div>
            </>
          )}

          {selected && started && (
            <>
              <div className="flex-1 min-h-0">
                <iframe
                  key={selected.id}
                  src={bunnyEmbed(selected.bunny_video_id)}
                  className="w-full h-full min-h-[260px]"
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="px-5 py-4 bg-card border-t shrink-0">
                <p className="font-semibold text-sm leading-tight">{selected.title}</p>
                {selected.description && (
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{selected.description}</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
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
