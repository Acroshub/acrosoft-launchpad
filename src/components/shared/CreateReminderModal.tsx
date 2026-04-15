import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Mail, MessageSquare, Clock, Send, Bell } from "lucide-react";
import { useCreateReminder } from "@/hooks/useCrmData";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Pre-fill contact info */
  contactId?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactName?: string | null;
  /** Pre-fill appointment */
  appointmentId?: string | null;
}

const CreateReminderModal = ({
  open,
  onOpenChange,
  contactId,
  contactEmail,
  contactPhone,
  contactName,
  appointmentId,
}: Props) => {
  const createReminder = useCreateReminder();

  const defaultMessage = contactName
    ? `Hola ${contactName}, este es un recordatorio para ti.`
    : "Este es un recordatorio para ti.";

  const [type,     setType]     = useState<"email" | "whatsapp">("email");
  const [message,  setMessage]  = useState(defaultMessage);
  const [sendMode, setSendMode] = useState<"now" | "schedule">("now");
  const [schedAt,  setSchedAt]  = useState("");

  const recipientEmail = type === "email"     ? contactEmail : null;
  const recipientPhone = type === "whatsapp"  ? contactPhone : null;

  const canSend =
    message.trim().length > 0 &&
    (type === "email" ? !!recipientEmail : !!recipientPhone) &&
    (sendMode === "now" || !!schedAt);

  const handleSend = async () => {
    if (!canSend) return;

    const scheduled_at = sendMode === "now"
      ? new Date().toISOString()
      : new Date(schedAt).toISOString();

    try {
      await createReminder.mutateAsync({
        contact_id:      contactId ?? null,
        appointment_id:  appointmentId ?? null,
        type,
        recipient_email: recipientEmail ?? null,
        recipient_phone: recipientPhone ?? null,
        scheduled_at,
        message:         message.trim(),
        is_auto:         false,
      });

      toast.success(sendMode === "now" ? "Recordatorio enviado" : "Recordatorio programado");
      onOpenChange(false);
    } catch {
      toast.error("Error al crear el recordatorio");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <Bell size={16} /> Recordatorio
            {contactName && <span className="text-muted-foreground font-normal">— {contactName}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Channel selector */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Canal</p>
            <div className="flex gap-2">
              {(["email", "whatsapp"] as const).map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setType(ch)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    type === ch
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {ch === "email" ? <Mail size={12} /> : <MessageSquare size={12} />}
                  {ch === "email" ? "Email" : "WhatsApp"}
                </button>
              ))}
            </div>
            {type === "email" && !recipientEmail && (
              <p className="text-[11px] text-destructive mt-1">Este contacto no tiene email registrado.</p>
            )}
            {type === "whatsapp" && !recipientPhone && (
              <p className="text-[11px] text-destructive mt-1">Este contacto no tiene teléfono registrado.</p>
            )}
            {type === "email" && recipientEmail && (
              <p className="text-[11px] text-muted-foreground mt-1">→ {recipientEmail}</p>
            )}
            {type === "whatsapp" && recipientPhone && (
              <p className="text-[11px] text-muted-foreground mt-1">→ {recipientPhone}</p>
            )}
          </div>

          {/* Message */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Mensaje</p>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Escribe el mensaje del recordatorio..."
              className="text-sm resize-none"
            />
          </div>

          {/* Send mode */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Envío</p>
            <div className="flex gap-2 mb-2">
              {(["now", "schedule"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSendMode(m)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    sendMode === m
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {m === "now" ? <Send size={12} /> : <Clock size={12} />}
                  {m === "now" ? "Ahora" : "Programar"}
                </button>
              ))}
            </div>
            {sendMode === "schedule" && (
              <Input
                type="datetime-local"
                value={schedAt}
                onChange={(e) => setSchedAt(e.target.value)}
                className="h-9 text-sm"
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleSend}
            disabled={!canSend || createReminder.isPending}
            className="rounded-xl"
          >
            {createReminder.isPending && <Loader2 size={13} className="animate-spin mr-1.5" />}
            {sendMode === "now" ? "Enviar ahora" : "Programar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateReminderModal;
