import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Trash2, Mail, MessageSquare, Clock, User, Building2, Bell, Pencil, ChevronDown,
} from "lucide-react";
import { useStaff, useBusinessProfile, useWhatsappEnabled } from "@/hooks/useCrmData";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReminderRecipient = "contact" | "business";
export type ReminderChannel   = "email" | "whatsapp";
export type ReminderTiming    = "before" | "after" | "on_booking";
export type ReminderUnit      = "minutes" | "hours" | "days";

export interface ReminderRule {
  id: string;
  recipient:        ReminderRecipient;
  /** Multi-select: ["admin", "<staff_uuid>", ...] */
  businessTargets?: string[];
  /** @deprecated kept for backward-compat with rules saved before multi-select */
  businessTarget?:  string;
  channel:          ReminderChannel;
  channelValue:     string;
  timing:           ReminderTiming;
  amount:           number;
  unit:             ReminderUnit;
  subject?:         string;
  content?:         string;
}

/** Normalize old single businessTarget to the new array */
const getTargets = (rule: ReminderRule): string[] => {
  if (rule.businessTargets?.length) return rule.businessTargets;
  if (rule.businessTarget)          return [rule.businessTarget];
  return ["admin"];
};

// ─── Variables disponibles ────────────────────────────────────────────────────

const VARIABLES = [
  { label: "Nombre del contacto",   value: "{{contact.name}}" },
  { label: "Email del contacto",    value: "{{contact.email}}" },
  { label: "Teléfono del contacto", value: "{{contact.phone}}" },
  { label: "Fecha de la cita",      value: "{{appointment.date}}" },
  { label: "Hora de la cita",       value: "{{appointment.time}}" },
  { label: "Servicio",              value: "{{appointment.service}}" },
  { label: "Nombre del calendario", value: "{{calendar.name}}" },
  { label: "Nombre del negocio",    value: "{{business.name}}" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 10);

const DEFAULT_RULE: Omit<ReminderRule, "id"> = {
  recipient:        "contact",
  businessTargets:  ["admin"],
  channel:          "email",
  channelValue:     "",
  timing:           "before",
  amount:           24,
  unit:             "hours",
  subject:          "Recordatorio de tu cita — {{appointment.date}}",
  content:          "Hola {{contact.name}}, te recordamos tu cita el {{appointment.date}} a las {{appointment.time}}.",
};

const UNITS: { value: ReminderUnit; label: string }[] = [
  { value: "minutes", label: "minutos" },
  { value: "hours",   label: "horas"   },
  { value: "days",    label: "días"    },
];

const pill = (active: boolean) =>
  `flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
    active
      ? "bg-primary text-primary-foreground border-primary"
      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
  }`;

// ─── Selector de variables ────────────────────────────────────────────────────

const VariablePicker = ({ onSelect }: { onSelect: (v: string) => void }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-[10px] text-primary font-medium hover:underline"
      >
        Insertar variable
        <ChevronDown size={10} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="flex flex-wrap gap-1">
          {VARIABLES.map((v) => (
            <button
              key={v.value}
              type="button"
              onClick={() => onSelect(v.value)}
              title={v.label}
              className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-mono hover:bg-primary/20 transition-colors"
            >
              {v.value}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Read-only Summary Card ───────────────────────────────────────────────────

const RuleSummaryCard = ({
  rule,
  businessName,
  onEdit,
  onDelete,
}: {
  rule:          ReminderRule;
  businessName?: string;
  onEdit:        () => void;
  onDelete:      () => void;
}) => {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const targets = getTargets(rule);

  const recipientLabel = rule.recipient === "contact"
    ? "Quien agendó"
    : `${businessName || "El negocio"}${targets.length > 1 ? ` (${targets.length} dest.)` : ""}`;

  const timingLabel = rule.timing === "on_booking"
    ? "Al reservar"
    : `${rule.amount} ${UNITS.find(u => u.value === rule.unit)?.label ?? rule.unit} ${rule.timing === "before" ? "antes" : "después"} de la cita`;

  return (
    <div className="border border-border/60 rounded-xl px-3.5 py-3 bg-card flex items-center gap-3">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-medium">
            {rule.channel === "email" ? <Mail size={10} /> : <MessageSquare size={10} />}
            {rule.channel === "email" ? "Email" : "WhatsApp"}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            {rule.recipient === "contact" ? <User size={10} /> : <Building2 size={10} />}
            {recipientLabel}
          </span>
          {rule.subject && (
            <span className="text-[10px] text-muted-foreground/60 italic truncate max-w-[120px]">
              "{rule.subject}"
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          {rule.timing === "on_booking" ? <Bell size={10} /> : <Clock size={10} />}
          {timingLabel}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-secondary/60"
        >
          <Pencil size={11} /> Editar
        </button>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded-lg hover:bg-destructive/10"
        >
          <Trash2 size={11} /> Eliminar
        </button>
      </div>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={onDelete}
        description="Esta acción eliminará la notificación permanentemente."
      />
    </div>
  );
};

// ─── Rule Edit Form ───────────────────────────────────────────────────────────

const RuleForm = ({
  rule,
  businessName,
  adminEmail,
  adminPhone,
  onChange,
}: {
  rule:          ReminderRule;
  businessName?: string;
  adminEmail?:   string | null;
  adminPhone?:   string | null;
  onChange:      (patch: Partial<ReminderRule>) => void;
}) => {
  const { data: staffList = [] } = useStaff();
  const { data: profile }        = useBusinessProfile();
  const whatsappEnabled          = useWhatsappEnabled();

  const subjectRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const [activeField, setActiveField] = useState<"subject" | "content">("content");

  const adminLabel = (() => {
    const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");
    if (!name) return "Dueño del negocio";
    return profile?.role ? `${name} (${profile.role})` : name;
  })();

  const targets = getTargets(rule);

  const toggleTarget = (id: string) => {
    const current = new Set(targets);
    if (current.has(id)) {
      current.delete(id);
      if (current.size === 0) current.add("admin");
    } else {
      current.add(id);
    }
    const next = Array.from(current);
    onChange({ businessTargets: next, businessTarget: next[0] });
  };

  const insertVariable = (variable: string) => {
    if (activeField === "subject" && subjectRef.current) {
      const el = subjectRef.current;
      const start = el.selectionStart ?? (rule.subject ?? "").length;
      const end   = el.selectionEnd   ?? start;
      const current = rule.subject ?? "";
      onChange({ subject: current.slice(0, start) + variable + current.slice(end) });
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    } else if (contentRef.current) {
      const el = contentRef.current;
      const start = el.selectionStart ?? (rule.content ?? "").length;
      const end   = el.selectionEnd   ?? start;
      const current = rule.content ?? "";
      onChange({ content: current.slice(0, start) + variable + current.slice(end) });
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    }
  };

  return (
    <div className="space-y-4">

      {/* ── Recipient ─────────────────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium mb-1.5">Para</p>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => onChange({ recipient: "contact", businessTargets: undefined, businessTarget: undefined })}
            className={pill(rule.recipient === "contact")}
          >
            <User size={11} /> Quien agendó
          </button>
          <button
            type="button"
            onClick={() => onChange({ recipient: "business", businessTargets: ["admin"], businessTarget: "admin" })}
            className={pill(rule.recipient === "business")}
          >
            <Building2 size={11} /> {businessName || "El negocio"}
          </button>
        </div>
      </div>

      {/* ── Business multi-target checkboxes ──────────────────────────────── */}
      {rule.recipient === "business" && (
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium mb-1.5">
            Destinatarios
          </p>
          <div className="space-y-1 border border-border/60 rounded-xl p-2.5 max-h-44 overflow-y-auto">
            <label className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={targets.includes("admin")}
                onChange={() => toggleTarget("admin")}
                className="h-3.5 w-3.5 rounded border-input text-primary accent-primary"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold leading-none">{adminLabel}</p>
                {adminEmail && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{adminEmail}</p>
                )}
              </div>
            </label>

            {staffList.map((s) => (
              <label
                key={s.id}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={targets.includes(s.id)}
                  onChange={() => toggleTarget(s.id)}
                  className="h-3.5 w-3.5 rounded border-input text-primary accent-primary"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold leading-none">
                    {s.name} <span className="font-normal text-muted-foreground">(Staff)</span>
                  </p>
                  {s.email && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{s.email}</p>
                  )}
                </div>
              </label>
            ))}

            {staffList.length === 0 && (
              <p className="text-[11px] text-muted-foreground/50 italic px-2 py-1">Sin staff registrado</p>
            )}
          </div>
          {targets.length > 1 && (
            <p className="text-[10px] text-muted-foreground mt-1.5">
              {targets.length} destinatarios — cada uno recibirá su propia notificación
            </p>
          )}
        </div>
      )}

      {/* ── Channel ───────────────────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium mb-1.5">Canal</p>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => onChange({ channel: "email" })}
            className={pill(rule.channel === "email")}
          >
            <Mail size={11} /> Email
          </button>
          <button
            type="button"
            onClick={() => whatsappEnabled && onChange({ channel: "whatsapp" })}
            disabled={!whatsappEnabled}
            title={whatsappEnabled ? undefined : "WhatsApp no está configurado. Ve a Configuración → WhatsApp."}
            className={
              whatsappEnabled
                ? pill(rule.channel === "whatsapp")
                : "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium border-border text-muted-foreground/40 cursor-not-allowed opacity-50"
            }
          >
            <MessageSquare size={11} /> WhatsApp
          </button>
        </div>
      </div>

      {/* ── Timing ────────────────────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium mb-1.5">Cuándo</p>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={() => onChange({ timing: "before" })} className={pill(rule.timing === "before")}>
              <Clock size={11} /> Antes
            </button>
            <button type="button" onClick={() => onChange({ timing: "after" })} className={pill(rule.timing === "after")}>
              <Clock size={11} /> Después
            </button>
            <button type="button" onClick={() => onChange({ timing: "on_booking" })} className={pill(rule.timing === "on_booking")}>
              <Bell size={11} /> Al reservar
            </button>
          </div>
          {rule.timing !== "on_booking" && (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                max={999}
                value={rule.amount}
                onChange={(e) => onChange({ amount: Math.max(1, Number(e.target.value) || 1) })}
                className="w-16 h-8 rounded-lg border border-input bg-background text-sm px-2 text-center focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <select
                value={rule.unit}
                onChange={(e) => onChange({ unit: e.target.value as ReminderUnit })}
                className="h-8 rounded-lg border border-input bg-background text-xs px-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
              <span className="text-xs text-muted-foreground">de la cita</span>
            </div>
          )}
          {rule.timing === "on_booking" && (
            <p className="text-xs text-muted-foreground">Se envía en el momento exacto de la reserva.</p>
          )}
        </div>
      </div>

      {/* ── Subject + Content ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">Mensaje</p>
          <VariablePicker onSelect={insertVariable} />
        </div>

        {rule.channel === "email" && (
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">Asunto</p>
            <Input
              ref={subjectRef}
              value={rule.subject ?? ""}
              onChange={(e) => onChange({ subject: e.target.value })}
              onFocus={() => setActiveField("subject")}
              placeholder="Ej: Recordatorio de tu cita — {{appointment.date}}"
              className="h-8 text-xs"
            />
          </div>
        )}

        <div>
          <p className="text-[10px] text-muted-foreground mb-1">
            {rule.channel === "email" ? "Contenido" : "Mensaje"}
          </p>
          <Textarea
            ref={contentRef}
            value={rule.content ?? ""}
            onChange={(e) => onChange({ content: e.target.value })}
            onFocus={() => setActiveField("content")}
            placeholder={
              rule.channel === "email"
                ? "Hola {{contact.name}}, te recordamos tu cita el {{appointment.date}} a las {{appointment.time}}."
                : "Hola {{contact.name}}, tu cita es el {{appointment.date}} a las {{appointment.time}}."
            }
            rows={3}
            className="text-xs resize-none"
          />
          <p className="text-[10px] text-muted-foreground/50 mt-1">
            Si lo dejas vacío se usará el mensaje por defecto del sistema.
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Main Editor ──────────────────────────────────────────────────────────────

interface Props {
  rules:         ReminderRule[];
  onChange:      (rules: ReminderRule[]) => void;
  businessName?: string;
}

interface EditingState {
  rule:  ReminderRule;
  isNew: boolean;
}

const ReminderRulesEditor = ({ rules, onChange, businessName }: Props) => {
  const { data: profile } = useBusinessProfile();
  const [editing, setEditing] = useState<EditingState | null>(null);

  const openNew = () =>
    setEditing({ rule: { ...DEFAULT_RULE, id: uid() }, isNew: true });

  const openEdit = (rule: ReminderRule) =>
    setEditing({ rule: { ...rule }, isNew: false });

  const closeDialog = () => setEditing(null);

  const saveDialog = () => {
    if (!editing) return;
    if (editing.isNew) {
      onChange([...rules, editing.rule]);
    } else {
      onChange(rules.map((r) => (r.id === editing.rule.id ? editing.rule : r)));
    }
    setEditing(null);
  };

  const remove = (id: string) => onChange(rules.filter((r) => r.id !== id));

  const patchEditing = (patch: Partial<ReminderRule>) =>
    setEditing((prev) => prev ? { ...prev, rule: { ...prev.rule, ...patch } } : prev);

  return (
    <div className="space-y-3">
      {rules.length === 0 && (
        <p className="text-xs text-muted-foreground/60 italic py-2">
          Sin notificaciones configuradas. Agrega una para que se envíe automáticamente.
        </p>
      )}

      {rules.map((rule) => (
        <RuleSummaryCard
          key={rule.id}
          rule={rule}
          businessName={businessName}
          onEdit={() => openEdit(rule)}
          onDelete={() => remove(rule.id)}
        />
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={openNew}
        className="w-full rounded-xl border-dashed h-9 text-xs gap-1.5"
      >
        <Plus size={13} /> Agregar notificación
      </Button>

      {/* ── Edit / New dialog ─────────────────────────────────────────────── */}
      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              {editing?.isNew ? "Nueva notificación" : "Editar notificación"}
            </DialogTitle>
          </DialogHeader>

          {editing && (
            <RuleForm
              rule={editing.rule}
              businessName={businessName}
              adminEmail={profile?.contact_email}
              adminPhone={profile?.contact_phone ?? profile?.whatsapp}
              onChange={patchEditing}
            />
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button type="button" size="sm" onClick={saveDialog}>
              Guardar notificación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReminderRulesEditor;
