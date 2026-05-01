import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Send, Loader2, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import {
  useAllTickets,
  useTicketMessages,
  useAdminSendMessage,
  useUpdateTicketStatus,
  useClientEmailMap,
} from "@/hooks/useCrmData";
import type { SupportTicket } from "@/lib/supabase";
import { toast } from "sonner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

const FILTER_OPTIONS: { value: SupportTicket["status"] | "all"; label: string }[] = [
  { value: "all",         label: "Todos"      },
  { value: "open",        label: "Abiertos"   },
  { value: "in_progress", label: "En proceso" },
  { value: "resolved",    label: "Resueltos"  },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

async function getSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("support-attachments")
    .createSignedUrl(path, 3600);
  if (error || !data) throw error ?? new Error("No URL");
  return data.signedUrl;
}

// ─── Attachment chip ──────────────────────────────────────────────────────────

function AttachmentChip({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const name = path.split("/").pop() ?? path;

  useEffect(() => {
    getSignedUrl(path).then(setUrl).catch(() => null);
  }, [path]);

  return (
    <a
      href={url ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-secondary hover:bg-secondary/80 transition-colors border text-muted-foreground"
    >
      <FileText size={11} />
      {name.substring(0, 30)}
    </a>
  );
}

// ─── Status action buttons ────────────────────────────────────────────────────

function StatusActions({
  ticket,
  onStatusChange,
  loading,
}: {
  ticket: SupportTicket;
  onStatusChange: (s: SupportTicket["status"]) => void;
  loading: boolean;
}) {
  if (ticket.type === "suggestion") {
    if (ticket.status === "read") return null;
    return (
      <button
        onClick={() => onStatusChange("read")}
        disabled={loading}
        className="h-7 px-3 text-xs rounded-lg border border-border bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
      >
        Marcar como leída
      </button>
    );
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {/* En proceso — acción secundaria, solo desde open */}
      {ticket.status === "open" && (
        <button
          onClick={() => onStatusChange("in_progress")}
          disabled={loading}
          className="h-7 px-3 text-xs rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-colors"
        >
          Tomar ticket
        </button>
      )}
      {/* Resolver — acción principal, siempre el más prominente */}
      {(ticket.status === "open" || ticket.status === "in_progress") && (
        <button
          onClick={() => onStatusChange("resolved")}
          disabled={loading}
          className="h-7 px-3 text-xs rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors font-medium"
        >
          Marcar como resuelto
        </button>
      )}
      {/* Reabrir — solo desde resolved o in_progress */}
      {(ticket.status === "resolved" || ticket.status === "in_progress") && (
        <button
          onClick={() => onStatusChange("open")}
          disabled={loading}
          className="h-7 px-3 text-xs rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
        >
          Reabrir
        </button>
      )}
    </div>
  );
}

// ─── Thread view ──────────────────────────────────────────────────────────────

function AdminTicketThread({
  ticket,
  clientEmail,
  onBack,
  onStatusChange,
}: {
  ticket: SupportTicket;
  clientEmail: string;
  onBack: () => void;
  onStatusChange: (updated: SupportTicket) => void;
}) {
  const { data: messages = [], isLoading } = useTicketMessages(ticket.id);
  const sendMessage = useAdminSendMessage();
  const updateStatus = useUpdateTicketStatus();
  const [content, setContent] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const [localStatus, setLocalStatus] = useState(ticket.status);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    if (!content.trim()) return;
    try {
      await sendMessage.mutateAsync({ ticketId: ticket.id, content: content.trim() });
      setContent("");
      // Auto-set to in_progress when admin first replies on open ticket
      if (localStatus === "open" && ticket.type === "ticket") {
        await handleStatusChange("in_progress");
      }
    } catch {
      toast.error("Error al enviar mensaje");
    }
  };

  const handleStatusChange = async (status: SupportTicket["status"]) => {
    try {
      await updateStatus.mutateAsync({ ticketId: ticket.id, status });
      setLocalStatus(status);
      onStatusChange({ ...ticket, status });
    } catch {
      toast.error("Error al cambiar estado");
    }
  };

  const canReply = ticket.type === "ticket" && localStatus !== "resolved";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b shrink-0 space-y-2">
        <div className="flex items-start gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground mt-0.5 shrink-0"
          >
            <ArrowLeft size={15} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{ticket.subject}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <Badge className={`text-[10px] px-2 py-0 border pointer-events-none ${STATUS_CLASS[localStatus]}`}>
                {STATUS_LABEL[localStatus]}
              </Badge>
              <span className="text-[11px] text-muted-foreground truncate">{clientEmail}</span>
              <span className="text-[11px] text-muted-foreground">{formatDate(ticket.created_at)}</span>
            </div>
          </div>
        </div>
        <div className="pl-9">
          <StatusActions
            ticket={{ ...ticket, status: localStatus }}
            onStatusChange={handleStatusChange}
            loading={updateStatus.isPending}
          />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={18} className="animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">Sin mensajes.</p>
        ) : (
          messages.map((msg) => {
            const isAdmin = msg.sender_role === "admin";
            return (
              <div key={msg.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[78%] space-y-1.5 ${isAdmin ? "items-end" : "items-start"} flex flex-col`}>
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                      isAdmin
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-secondary text-foreground rounded-bl-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {msg.attachments.map((p, i) => <AttachmentChip key={i} path={p} />)}
                    </div>
                  )}
                  <span className="text-[10px] text-muted-foreground px-1">
                    {isAdmin ? "Tú (Admin)" : clientEmail} · {formatDate(msg.created_at)}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply */}
      {canReply && (
        <div className="p-4 border-t shrink-0">
          <div className="flex gap-2 items-end">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escribe tu respuesta..."
              className="min-h-[60px] max-h-[120px] text-sm resize-none flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
            />
            <Button
              size="icon"
              className="h-9 w-9 rounded-xl shrink-0"
              onClick={handleSend}
              disabled={!content.trim() || sendMessage.isPending}
            >
              {sendMessage.isPending
                ? <Loader2 size={14} className="animate-spin" />
                : <Send size={14} />
              }
            </Button>
          </div>
        </div>
      )}

      {!canReply && ticket.type === "ticket" && (
        <div className="p-4 border-t shrink-0 text-center">
          <p className="text-xs text-muted-foreground">Ticket resuelto. Reabre el ticket para responder.</p>
        </div>
      )}
    </div>
  );
}

// ─── Ticket list item ─────────────────────────────────────────────────────────

function AdminTicketItem({
  ticket,
  clientEmail,
  onClick,
}: {
  ticket: SupportTicket;
  clientEmail: string;
  onClick: () => void;
}) {
  const isNew = ticket.status === "open";

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3.5 hover:bg-secondary/40 transition-colors border-b last:border-b-0 flex items-start gap-3"
    >
      <div className="w-2 shrink-0 flex justify-center pt-1.5">
        {isNew && <span className="w-2 h-2 rounded-full bg-blue-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm truncate ${isNew ? "font-semibold" : "font-medium"}`}>
            {ticket.subject}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            {isNew && (
              <span className="text-[9px] font-bold bg-blue-500 text-white px-1.5 py-0.5 rounded-md uppercase tracking-wide">
                Nuevo
              </span>
            )}
            <Badge className={`text-[10px] px-2 py-0 border pointer-events-none ${STATUS_CLASS[ticket.status]}`}>
              {STATUS_LABEL[ticket.status]}
            </Badge>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{clientEmail}</p>
        <p className="text-[11px] text-muted-foreground">{formatDate(ticket.updated_at)}</p>
      </div>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const CrmSupportAdmin = () => {
  const [tab, setTab] = useState<"ticket" | "suggestion">("ticket");
  const [statusFilter, setStatusFilter] = useState<SupportTicket["status"] | "all">("all");
  const [selected, setSelected] = useState<SupportTicket | null>(null);

  const { data: tickets = [], isLoading } = useAllTickets(tab);
  const { data: emailMap = {} } = useClientEmailMap();

  const filtered = statusFilter === "all"
    ? tickets
    : tickets.filter((t) => t.status === statusFilter);

  const handleTabChange = (t: "ticket" | "suggestion") => {
    setTab(t);
    setSelected(null);
    setStatusFilter("all");
  };

  const handleStatusChange = (updated: SupportTicket) => {
    if (selected?.id === updated.id) setSelected(updated);
  };

  if (selected) {
    return (
      <div className="h-full">
        <AdminTicketThread
          ticket={selected}
          clientEmail={emailMap[selected.user_id] ?? "Cliente sin email"}
          onBack={() => setSelected(null)}
          onStatusChange={handleStatusChange}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-5 border-b shrink-0">
        <h2 className="text-base font-semibold">Soporte</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Bandeja de tickets y sugerencias de clientes.</p>
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

      {/* Status filter */}
      <div className="flex gap-1.5 px-4 py-2.5 border-b shrink-0 overflow-x-auto">
        {FILTER_OPTIONS
          .filter((o) => tab === "ticket" || o.value === "all" || o.value === "open" || o.value === "read")
          .map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
                statusFilter === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={18} className="animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center">
              <FileText size={20} className="text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              {statusFilter === "all"
                ? tab === "ticket" ? "No hay tickets aún." : "No hay sugerencias aún."
                : `No hay elementos con estado "${STATUS_LABEL[statusFilter as SupportTicket["status"]]}".`}
            </p>
          </div>
        ) : (
          filtered.map((t) => (
            <AdminTicketItem
              key={t.id}
              ticket={t}
              clientEmail={emailMap[t.user_id] ?? "Cliente sin email"}
              onClick={() => setSelected(t)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default CrmSupportAdmin;
