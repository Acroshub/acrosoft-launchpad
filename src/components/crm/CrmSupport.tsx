import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Plus, Send, Loader2, X, FileText, ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/useAuth";
import {
  useMyTickets,
  useTicketMessages,
  useCreateTicket,
  useCreateSupportMessage,
  useMarkTicketSeen,
} from "@/hooks/useCrmData";
import type { SupportTicket } from "@/lib/supabase";
import { toast } from "sonner";

// ─── helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<SupportTicket["status"], string> = {
  open:        "Abierto",
  in_progress: "En proceso",
  resolved:    "Resuelto",
  read:        "Leído",
};

const STATUS_CLASS: Record<SupportTicket["status"], string> = {
  open:        "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  resolved:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  read:        "bg-secondary text-muted-foreground border-border",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function hasUnread(ticket: SupportTicket): boolean {
  if (ticket.type !== "ticket") return false;
  if (!ticket.client_last_seen_at) return true;
  return new Date(ticket.updated_at) > new Date(ticket.client_last_seen_at);
}

// ─── File upload helper ────────────────────────────────────────────────────────

async function uploadAttachment(file: File, userId: string, ticketId?: string): Promise<string> {
  const ext = file.name.split(".").pop() ?? "bin";
  const folder = ticketId ? `${userId}/${ticketId}` : userId;
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from("support-attachments")
    .upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

async function getSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("support-attachments")
    .createSignedUrl(path, 3600);
  if (error || !data) throw error;
  return data.signedUrl;
}

// ─── Attachment preview ───────────────────────────────────────────────────────

function AttachmentPreview({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState(false);

  useEffect(() => {
    getSignedUrl(path).then(setUrl).catch(() => null);
  }, [path]);

  return (
    <>
      <button
        onClick={() => url && setLightbox(true)}
        className="relative w-20 h-20 rounded-xl overflow-hidden border bg-secondary shrink-0 hover:opacity-80 transition-opacity"
        title="Ver imagen"
      >
        {url ? (
          <img src={url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 size={14} className="animate-spin text-muted-foreground" />
          </div>
        )}
      </button>

      {lightbox && url && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-6"
          onClick={() => setLightbox(false)}
        >
          <img
            src={url}
            alt=""
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

// ─── Thread view ──────────────────────────────────────────────────────────────

function TicketThread({
  ticket,
  onBack,
}: {
  ticket: SupportTicket;
  onBack: () => void;
}) {
  const { user } = useCurrentUser();
  const { data: messages = [], isLoading } = useTicketMessages(ticket.id);
  const createMessage = useCreateSupportMessage();
  const markSeen = useMarkTicketSeen();
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Mark as seen when thread opens
  useEffect(() => {
    markSeen.mutate(ticket.id);
  }, [ticket.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const isClosed = ticket.status === "resolved" || ticket.status === "read";

  const handleSend = async () => {
    if (!content.trim() && files.length === 0) return;
    if (!user) return;
    setUploading(true);
    try {
      let paths: string[] = [];
      if (files.length > 0) {
        paths = await Promise.all(
          files.map((f) => uploadAttachment(f, user.id, ticket.id))
        );
      }
      await createMessage.mutateAsync({
        ticketId: ticket.id,
        content: content.trim(),
        attachments: paths,
      });
      setContent("");
      setFiles([]);
    } catch {
      toast.error("Error al enviar el mensaje");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b shrink-0 flex items-start gap-3">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground mt-0.5 shrink-0"
        >
          <ArrowLeft size={15} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{ticket.subject}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={`text-[10px] px-2 py-0 border ${STATUS_CLASS[ticket.status]}`}>
              {STATUS_LABEL[ticket.status]}
            </Badge>
            <span className="text-[11px] text-muted-foreground">{formatDate(ticket.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={18} className="animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">Sin mensajes aún.</p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_role === "client";
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[78%] space-y-1.5 ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                      isMe
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-secondary text-foreground rounded-bl-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {msg.attachments.map((p, i) => <AttachmentPreview key={i} path={p} />)}
                    </div>
                  )}
                  <span className="text-[10px] text-muted-foreground px-1">
                    {isMe ? "Tú" : "Acrosoft"} · {formatDate(msg.created_at)}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply — only for tickets, not resolved/read */}
      {ticket.type === "ticket" && !isClosed && (
        <div className="p-4 border-t shrink-0 space-y-2">
          {files.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-1 text-[11px] bg-secondary rounded-md px-2 py-0.5 border">
                  <FileText size={11} className="text-muted-foreground" />
                  <span className="truncate max-w-[120px]">{f.name}</span>
                  <button onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}>
                    <X size={11} className="text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 items-end">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escribe tu respuesta..."
              className="min-h-[60px] max-h-[120px] text-sm resize-none flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
                title="Adjuntar imagen"
              >
                <ImageIcon size={15} />
              </button>
              <Button
                size="icon"
                className="h-9 w-9 rounded-xl"
                onClick={handleSend}
                disabled={(!content.trim() && files.length === 0) || uploading || createMessage.isPending}
              >
                {uploading || createMessage.isPending
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Send size={14} />
                }
              </Button>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])])}
          />
        </div>
      )}

      {isClosed && ticket.type === "ticket" && (
        <div className="p-4 border-t shrink-0 text-center">
          <p className="text-xs text-muted-foreground">Este ticket ha sido cerrado.</p>
        </div>
      )}
    </div>
  );
}

// ─── New ticket form ──────────────────────────────────────────────────────────

function NewTicketForm({
  type,
  onSuccess,
  onCancel,
}: {
  type: "ticket" | "suggestion";
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { user } = useCurrentUser();
  const createTicket = useCreateTicket();
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isValid = subject.trim().length > 0 && content.trim().length > 0;

  const handleSubmit = async () => {
    if (!isValid || !user) return;
    setUploading(true);
    try {
      // Upload files first (no ticketId needed — path uses userId only)
      const paths = files.length > 0
        ? await Promise.all(files.map((f) => uploadAttachment(f, user.id)))
        : [];
      await createTicket.mutateAsync({
        type,
        subject: subject.trim(),
        content: content.trim(),
        attachments: paths,
      });
      toast.success(type === "ticket" ? "Ticket enviado" : "Sugerencia enviada");
      onSuccess();
    } catch {
      toast.error("Error al enviar");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b shrink-0 flex items-center gap-3">
        <button
          onClick={onCancel}
          className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
        >
          <ArrowLeft size={15} />
        </button>
        <p className="text-sm font-semibold">
          {type === "ticket" ? "Nuevo Ticket" : "Nueva Sugerencia"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Asunto</label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={type === "ticket" ? "Describe brevemente el problema..." : "Título de tu sugerencia..."}
            className="h-10"
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            {type === "ticket" ? "Descripción del problema" : "Tu sugerencia"}
          </label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={type === "ticket"
              ? "Explica con detalle qué está pasando, pasos para reproducirlo, etc."
              : "Cuéntanos tu idea o mejora..."}
            className="min-h-[140px] text-sm resize-none"
          />
        </div>

        {type === "ticket" && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Imágenes <span className="text-muted-foreground/60">(opcional · JPG, PNG, WEBP, GIF)</span>
            </label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full h-16 border-2 border-dashed rounded-xl text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors flex items-center justify-center gap-2"
            >
              <ImageIcon size={14} />
              Seleccionar imágenes
            </button>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])])}
            />
            {files.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-1 text-[11px] bg-secondary rounded-md px-2 py-0.5 border">
                    <FileText size={11} className="text-muted-foreground" />
                    <span className="truncate max-w-[140px]">{f.name}</span>
                    <button onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}>
                      <X size={11} className="text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-t shrink-0">
        <Button
          className="w-full h-10 rounded-xl font-medium"
          onClick={handleSubmit}
          disabled={!isValid || uploading || createTicket.isPending}
        >
          {uploading || createTicket.isPending
            ? <><Loader2 size={14} className="animate-spin mr-2" /> Enviando...</>
            : type === "ticket" ? "Enviar Ticket" : "Enviar Sugerencia"
          }
        </Button>
      </div>
    </div>
  );
}

// ─── Ticket list item ─────────────────────────────────────────────────────────

function TicketItem({
  ticket,
  onClick,
}: {
  ticket: SupportTicket;
  onClick: () => void;
}) {
  const unread = hasUnread(ticket);

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3.5 hover:bg-secondary/40 transition-colors border-b last:border-b-0 flex items-start gap-3"
    >
      {unread && (
        <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
      )}
      {!unread && <span className="w-2 shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm truncate ${unread ? "font-semibold" : "font-medium"}`}>
            {ticket.subject}
          </p>
          <Badge className={`text-[10px] px-2 py-0 border shrink-0 ${STATUS_CLASS[ticket.status]}`}>
            {STATUS_LABEL[ticket.status]}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">{formatDate(ticket.updated_at)}</p>
      </div>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const CrmSupport = () => {
  const [tab, setTab] = useState<"ticket" | "suggestion">("ticket");
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [showNew, setShowNew] = useState(false);

  const { data: tickets = [], isLoading } = useMyTickets(tab);

  // Reset selection when tab changes
  const handleTabChange = (t: "ticket" | "suggestion") => {
    setTab(t);
    setSelected(null);
    setShowNew(false);
  };

  if (selected) {
    return (
      <div className="h-full">
        <TicketThread ticket={selected} onBack={() => setSelected(null)} />
      </div>
    );
  }

  if (showNew) {
    return (
      <div className="h-full">
        <NewTicketForm
          type={tab}
          onSuccess={() => setShowNew(false)}
          onCancel={() => setShowNew(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-5 border-b shrink-0 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Soporte</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Envía tickets o sugerencias al equipo de Acrosoft.
          </p>
        </div>
        <Button
          size="sm"
          className="h-8 rounded-xl text-xs gap-1.5 shrink-0"
          onClick={() => setShowNew(true)}
        >
          <Plus size={13} />
          {tab === "ticket" ? "Nuevo Ticket" : "Nueva Sugerencia"}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b shrink-0">
        {(["ticket", "suggestion"] as const).map((t) => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
              tab === t
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "ticket" ? "Tickets" : "Sugerencias"}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={18} className="animate-spin text-muted-foreground" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center">
              <FileText size={20} className="text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              {tab === "ticket"
                ? "No tienes tickets abiertos."
                : "Aún no has enviado sugerencias."}
            </p>
          </div>
        ) : (
          tickets.map((t) => (
            <TicketItem key={t.id} ticket={t} onClick={() => setSelected(t)} />
          ))
        )}
      </div>
    </div>
  );
};

export default CrmSupport;
