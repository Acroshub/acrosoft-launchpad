import { useState, useRef } from "react";
import {
  XCircle, Loader2, Upload, Image, Video, Mic, FileText,
  MessageSquare, Link as LinkIcon,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { normalizeUrl } from "@/lib/utils";
import type { WaCampaignPart } from "@/lib/supabase";

// ─────────────────────────────────────────────────────────────────────────────
// Redacción de un mensaje de WhatsApp — compartido por Envíos Masivos y
// Seguimiento Automático.
//
// Un mensaje = un tipo (texto, imagen, video, audio, documento o enlace) + su
// contenido. Es el mismo repertorio que un paso de secuencia, menos "pregunta":
// ni un envío masivo ni un seguimiento esperan respuesta.
// ─────────────────────────────────────────────────────────────────────────────

export type WaMediaKind = "image" | "video" | "audio" | "file";

export function MediaUploadField({
  mediaType, value, onChange, userId,
}: {
  mediaType: WaMediaKind;
  value: string;
  onChange: (url: string, name?: string) => void;
  userId: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const accept = mediaType === "image"
    ? "image/jpeg,image/png,image/webp"
    : mediaType === "video"
    ? "video/mp4,video/3gpp"
    : mediaType === "file"
    ? ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
    : "audio/ogg,audio/mpeg,audio/mp4,audio/aac,audio/amr";

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
      const path = `wa-campaigns/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("form-uploads").upload(path, file, { upsert: false });
      if (error) { toast.error("Error al subir archivo: " + error.message); return; }
      const { data: { publicUrl } } = supabase.storage.from("form-uploads").getPublicUrl(path);
      onChange(publicUrl, file.name);
    } catch (e: any) {
      toast.error("Error al subir archivo");
    } finally {
      setUploading(false);
    }
  };

  const label = mediaType === "image" ? "imagen" : mediaType === "video" ? "video" : mediaType === "file" ? "documento" : "audio";
  const Icon = mediaType === "image" ? Image : mediaType === "video" ? Video : mediaType === "file" ? FileText : Mic;

  return (
    <div className="space-y-1.5">
      <input ref={inputRef} type="file" accept={accept} className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
      {value ? (
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border bg-muted/20">
          {mediaType === "image" ? (
            <img src={value} alt="" className="h-14 w-14 object-cover rounded-lg shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Icon size={18} className="text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{label.charAt(0).toUpperCase() + label.slice(1)} subido</p>
            <p className="text-[10px] text-muted-foreground truncate">{value.split("/").pop()}</p>
          </div>
          <button type="button" onClick={() => onChange("")}
            className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground shrink-0">
            <XCircle size={14} />
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
          className="w-full flex flex-col items-center justify-center gap-2 h-24 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/20 transition-all text-muted-foreground disabled:opacity-50 cursor-pointer">
          {uploading
            ? <Loader2 size={20} className="animate-spin" />
            : <Upload size={20} />}
          <span className="text-xs">{uploading ? "Subiendo..." : `Seleccionar ${label}`}</span>
        </button>
      )}
    </div>
  );
}


export const PART_TYPES = [
  { id: "text"  as const, icon: <MessageSquare size={14} />, label: "Texto" },
  { id: "image" as const, icon: <Image size={14} />,         label: "Imagen" },
  { id: "video" as const, icon: <Video size={14} />,         label: "Video" },
  { id: "audio" as const, icon: <Mic size={14} />,           label: "Audio" },
  { id: "file"  as const, icon: <FileText size={14} />,      label: "Documento" },
  { id: "link"  as const, icon: <LinkIcon size={14} />,      label: "Enlace" },
];

export const newPart = (type: WaCampaignPart["type"]): WaCampaignPart => ({
  id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  type,
  ...(type === "link" ? { link_label: "Ver más" } : {}),
});

// ── Vista previa: cómo se ve en el teléfono ──────────────────────────────────

export function PartPreview({ part }: { part: WaCampaignPart | null }) {
  if (!part) return null;
  const hasContent =
    part.type === "text" ? (part.text ?? "").trim()
  : part.type === "link" ? (part.link_url ?? "").trim()
  : (part.url ?? "").trim();
  if (!hasContent) return null;

  return (
    <div className="rounded-xl border border-border bg-[#E5DDD5] dark:bg-[#0B141A] p-3">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1.5">Vista previa</p>
      <div className="max-w-[85%] rounded-lg bg-[#DCF8C6] dark:bg-[#005C4B] px-2.5 py-1.5 shadow-sm">
        {part.type === "image" && part.url && <img src={part.url} alt="" className="rounded-md mb-1 max-h-40 object-cover w-full" />}
        {part.type === "video" && <div className="flex items-center gap-1.5 text-[10px] text-black/60 dark:text-white/70 mb-1"><Video size={11} /> Video</div>}
        {part.type === "audio" && <div className="flex items-center gap-1.5 text-[10px] text-black/60 dark:text-white/70"><Mic size={11} /> Nota de audio</div>}
        {part.type === "file"  && <div className="flex items-center gap-1.5 text-[10px] text-black/60 dark:text-white/70 mb-1"><FileText size={11} /> {part.name || "Documento"}</div>}
        {part.type !== "audio" && (part.text ?? "").trim() && (
          <p className="text-[11px] text-black dark:text-white whitespace-pre-wrap leading-relaxed">{part.text}</p>
        )}
        {part.type === "link" && (
          <div className="mt-1 pt-1 border-t border-black/10 dark:border-white/15 text-center">
            <span className="text-[11px] font-medium text-[#00A5F4]">{part.link_label || "Ver más"}</span>
          </div>
        )}
      </div>
    </div>
  );
}


export function MessageEditor({ part, onChange, userId }: {
  part: WaCampaignPart;
  onChange: (p: WaCampaignPart) => void;
  userId: string;
}) {
  const isMedia = part.type === "image" || part.type === "video" || part.type === "audio" || part.type === "file";

  return (
    <div className="space-y-2.5">
      {/* Selector de tipo, igual que al crear un paso de secuencia */}
      <div className="grid grid-cols-3 gap-1.5">
        {PART_TYPES.map(t => {
          const active = part.type === t.id;
          return (
            <button key={t.id} type="button"
              // Cambiar de tipo limpia el contenido anterior: una URL de imagen
              // no significa nada en un enlace, y arrastrarla confunde.
              onClick={() => onChange({ ...newPart(t.id), id: part.id })}
              className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl border transition-colors ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:bg-muted/20"
              }`}>
              {t.icon}
              <span className="text-[10px] font-medium">{t.label}</span>
            </button>
          );
        })}
      </div>

      {isMedia && (
        <MediaUploadField
          mediaType={part.type as WaMediaKind}
          value={part.url ?? ""}
          onChange={(url, name) => onChange({ ...part, url, ...(name ? { name } : {}) })}
          userId={userId}
        />
      )}

      {part.type === "link" && (() => {
        const raw = (part.link_url ?? "").trim();
        const normalized = normalizeUrl(raw);
        const invalid = raw.length > 0 && !normalized;
        return (
          <div className="space-y-1.5">
            <div className="flex gap-2">
              <input value={part.link_url ?? ""}
                onChange={e => onChange({ ...part, link_url: e.target.value })}
                // Al salir del campo se completa el https:// que Meta exige.
                onBlur={() => { if (normalized && normalized !== raw) onChange({ ...part, link_url: normalized }); }}
                placeholder="https://..."
                className={`flex-1 min-w-0 h-9 px-2.5 rounded-lg border bg-background text-base md:text-sm outline-none focus:ring-2 ${
                  invalid ? "border-destructive focus:ring-destructive/30" : "border-border focus:ring-primary/30"
                }`} />
              <input value={part.link_label ?? ""} onChange={e => onChange({ ...part, link_label: e.target.value.slice(0, 20) })}
                placeholder="Texto del botón"
                className="w-32 shrink-0 h-9 px-2.5 rounded-lg border border-border bg-background text-base md:text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            {invalid && (
              <p className="text-[10px] text-destructive">
                No parece una dirección web válida. WhatsApp necesita algo como <strong>https://ejemplo.com</strong>, o el botón llegará sin funcionar.
              </p>
            )}
          </div>
        );
      })()}

      {/* El audio de WhatsApp no admite texto acompañante */}
      {part.type !== "audio" && (
        <div className="space-y-1">
          <textarea
            value={part.text ?? ""}
            onChange={e => onChange({ ...part, text: e.target.value })}
            rows={part.type === "text" ? 5 : 2}
            placeholder={
              part.type === "text" ? "Escribe el mensaje..."
            : part.type === "link" ? "Texto que acompaña al enlace"
            : "Pie de foto (opcional)"
            }
            className="w-full px-2.5 py-2 rounded-lg border border-border bg-background text-base md:text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
          {part.type === "text" && (
            <p className="text-[10px] text-muted-foreground">{(part.text ?? "").length} caracteres · Límite sugerido: 1024</p>
          )}
        </div>
      )}
    </div>
  );
}


export function SentPart({ part }: { part: WaCampaignPart }) {
  const meta = PART_TYPES.find(t => t.id === part.type);
  return (
    <div className="rounded-xl border border-border bg-[#E5DDD5] dark:bg-[#0B141A] p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-muted-foreground/70">{meta?.icon}</span>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">{meta?.label ?? part.type}</span>
      </div>
      <div className="max-w-[85%] rounded-lg bg-[#DCF8C6] dark:bg-[#005C4B] px-2.5 py-1.5 shadow-sm">
        {part.type === "image" && part.url && (
          <img src={part.url} alt="" className="rounded-md mb-1 max-h-40 object-cover w-full" />
        )}
        {(part.type === "video" || part.type === "audio" || part.type === "file") && part.url && (
          <a href={part.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[10px] text-black/70 dark:text-white/80 underline mb-1">
            {part.type === "video" ? <Video size={11} /> : part.type === "audio" ? <Mic size={11} /> : <FileText size={11} />}
            {part.name || (part.type === "video" ? "Ver video" : part.type === "audio" ? "Escuchar audio" : "Abrir documento")}
          </a>
        )}
        {part.type !== "audio" && (part.text ?? "").trim() && (
          <p className="text-[11px] text-black dark:text-white whitespace-pre-wrap leading-relaxed">{part.text}</p>
        )}
        {part.type === "link" && (
          <div className="mt-1 pt-1 border-t border-black/10 dark:border-white/15 text-center">
            <a href={part.link_url} target="_blank" rel="noopener noreferrer"
              className="text-[11px] font-medium text-[#00A5F4] hover:underline">
              {part.link_label || "Ver más"}
            </a>
          </div>
        )}
      </div>
      {part.type === "link" && part.link_url && (
        <p className="text-[9px] text-muted-foreground/70 font-mono mt-1 truncate">{part.link_url}</p>
      )}
    </div>
  );
}

