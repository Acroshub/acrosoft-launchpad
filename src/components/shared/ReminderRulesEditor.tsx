import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Trash2, Mail, Clock, User, Building2, Bell, Pencil, ChevronDown,
  MessageSquare,
} from "lucide-react";
import { useStaff, useBusinessProfile, useVendorProfile, useWaTemplates } from "@/hooks/useCrmData";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";
import type { ReminderWaVarSource, ReminderWaVarMap } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReminderRecipient = "contact" | "business";
export type ReminderChannel   = "email" | "whatsapp";
export type ReminderTiming    = "before" | "after" | "on_booking";
export type ReminderUnit      = "minutes" | "hours" | "days";
export type ReminderEditorMode = "calendar" | "form";

export interface ReminderRule {
  id: string;
  recipient:        ReminderRecipient;
  /** Multi-select: ["admin", "<staff_uuid>", ...] */
  businessTargets?: string[];
  /** @deprecated kept for backward-compat with rules saved before multi-select */
  businessTarget?:  string;
  /** Multi-channel: email and/or WhatsApp */
  channels?:        { email: boolean; whatsapp: boolean };
  /** @deprecated kept for backward-compat — use channels instead */
  channel:          ReminderChannel;
  channelValue:     string;
  timing:           ReminderTiming;
  amount:           number;
  unit:             ReminderUnit;
  subject?:         string;
  content?:         string;
  whatsapp_template_id?:  string | null;
  whatsapp_variable_map?: ReminderWaVarMap | null;
}

/** Normalize old single businessTarget to the new array */
const getTargets = (rule: ReminderRule): string[] => {
  if (rule.businessTargets?.length) return rule.businessTargets;
  if (rule.businessTarget)          return [rule.businessTarget];
  return ["admin"];
};

/** Get effective channels */
const getChannels = (rule: ReminderRule): { email: boolean; whatsapp: boolean } => {
  if (rule.channels) return { email: !!rule.channels.email, whatsapp: !!rule.channels.whatsapp };
  return { email: true, whatsapp: false };
};

// ─── Variables disponibles (email) ────────────────────────────────────────────

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

// ─── WA variable options (reminder context) ───────────────────────────────────

const WA_VAR_OPTIONS: { label: string; value: Omit<ReminderWaVarSource, "value"> }[] = [
  { label: "Nombre del contacto",   value: { source: "contact_field",     field: "name"    } },
  { label: "Email del contacto",    value: { source: "contact_field",     field: "email"   } },
  { label: "Teléfono del contacto", value: { source: "contact_field",     field: "phone"   } },
  { label: "Fecha de la cita",      value: { source: "appointment_field", field: "date"    } },
  { label: "Hora de la cita",       value: { source: "appointment_field", field: "time"    } },
  { label: "Servicio de la cita",   value: { source: "appointment_field", field: "service" } },
  { label: "Nombre del calendario", value: { source: "calendar_field",    field: "name"    } },
  { label: "Nombre del negocio",    value: { source: "business_field",    field: "name"    } },
  { label: "Texto fijo",            value: { source: "fixed" } },
];

function extractVarNums(text: string): number[] {
  const nums = new Set<number>();
  for (const m of text.matchAll(/\{\{(\d+)\}\}/g)) nums.add(Number(m[1]));
  return Array.from(nums).sort((a, b) => a - b);
}

function varSourceKey(src: ReminderWaVarSource): string {
  if (src.source === "fixed") return "fixed";
  return `${src.source}:${(src as any).field}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 10);

const DEFAULT_RULE: Omit<ReminderRule, "id"> = {
  recipient:        "contact",
  businessTargets:  ["admin"],
  channels:         { email: true, whatsapp: false },
  channel:          "email",
  channelValue:     "",
  timing:           "before",
  amount:           24,
  unit:             "hours",
  subject:          "Recordatorio de tu cita — {{appointment.date}}",
  content:          "Hola {{contact.name}}, te recordamos tu cita el {{appointment.date}} a las {{appointment.time}}.",
  whatsapp_template_id:  null,
  whatsapp_variable_map: null,
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

// ─── Selector de variables (email) ────────────────────────────────────────────

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

// ─── WA Variable Mapper ───────────────────────────────────────────────────────

const WaVarMapper = ({
  varNums,
  varMap,
  onChange,
}: {
  varNums: number[];
  varMap: ReminderWaVarMap;
  onChange: (map: ReminderWaVarMap) => void;
}) => {
  if (!varNums.length) return null;

  const updateVar = (num: number, src: ReminderWaVarSource) => {
    onChange({ ...varMap, [String(num)]: src });
  };

  const getSourceKey = (num: number): string => {
    const entry = varMap[String(num)];
    if (!entry) return "";
    return varSourceKey(entry);
  };

  const handleSelect = (num: number, key: string) => {
    if (key === "fixed") {
      updateVar(num, { source: "fixed", value: "" });
    } else {
      const opt = WA_VAR_OPTIONS.find(o => varSourceKey(o.value as ReminderWaVarSource) === key);
      if (opt) updateVar(num, opt.value as ReminderWaVarSource);
    }
  };

  return (
    <div className="space-y-2 rounded-xl border border-border/50 bg-secondary/20 p-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">
        Variables de la plantilla
      </p>
      {varNums.map((num) => {
        const entry = varMap[String(num)];
        const selectedKey = getSourceKey(num);

        return (
          <div key={num} className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-muted-foreground w-8 shrink-0">
              {`{{${num}}}`}
            </span>
            <select
              value={selectedKey}
              onChange={(e) => handleSelect(num, e.target.value)}
              className="flex-1 h-7 rounded-lg border border-input bg-background text-xs px-2 focus:outline-none focus:ring-1 focus:ring-primary/40"
            >
              <option value="">— elegir —</option>
              {WA_VAR_OPTIONS.map((opt) => {
                const key = varSourceKey(opt.value as ReminderWaVarSource);
                return <option key={key} value={key}>{opt.label}</option>;
              })}
            </select>
            {entry?.source === "fixed" && (
              <Input
                value={(entry as any).value ?? ""}
                onChange={(e) => updateVar(num, { source: "fixed", value: e.target.value })}
                placeholder="Texto fijo"
                className="flex-1 h-7 text-xs"
              />
            )}
          </div>
        );
      })}
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
  const targets  = getTargets(rule);
  const channels = getChannels(rule);

  const recipientLabel = rule.recipient === "contact"
    ? "Quien agendó"
    : targets.includes("vendor")
      ? "Vendedor"
      : `${businessName || "El negocio"}${targets.length > 1 ? ` (${targets.length} dest.)` : ""}`;

  const timingLabel = rule.timing === "on_booking"
    ? "Al reservar"
    : `${rule.amount} ${UNITS.find(u => u.value === rule.unit)?.label ?? rule.unit} ${rule.timing === "before" ? "antes" : "después"} de la cita`;

  return (
    <div className="border border-border/60 rounded-xl px-3.5 py-3 bg-card flex items-center gap-3">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          {channels.email && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-medium">
              <Mail size={10} /> Email
            </span>
          )}
          {channels.whatsapp && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 text-[11px] font-medium">
              <MessageSquare size={10} /> WhatsApp
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            {rule.recipient === "contact" ? <User size={10} /> : <Building2 size={10} />}
            {recipientLabel}
          </span>
          {channels.email && rule.subject && (
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
  mode = "calendar",
  onChange,
}: {
  rule:          ReminderRule;
  businessName?: string;
  adminEmail?:   string | null;
  adminPhone?:   string | null;
  mode?:         ReminderEditorMode;
  onChange:      (patch: Partial<ReminderRule>) => void;
}) => {
  const { data: staffList = [] }   = useStaff();
  const { data: profile }          = useBusinessProfile();
  const { data: vendorProfile }    = useVendorProfile();
  const { data: allTemplates = [] } = useWaTemplates();
  const isVendor                   = !!vendorProfile;

  const channels = getChannels(rule);

  const utilityApprovedTemplates = allTemplates.filter(
    t => t.category === "UTILITY" && t.meta_status === "APPROVED",
  );

  const selectedTemplate = utilityApprovedTemplates.find(t => t.id === rule.whatsapp_template_id);
  const templateVarNums  = selectedTemplate ? extractVarNums(selectedTemplate.body_text) : [];

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
      if (current.size === 1) return;
      current.delete(id);
    } else {
      current.add(id);
    }
    const next = Array.from(current);
    onChange({ businessTargets: next, businessTarget: next[0] });
  };

  const toggleChannel = (ch: "email" | "whatsapp") => {
    const next = { ...channels, [ch]: !channels[ch] };
    if (!next.email && !next.whatsapp) return; // must keep at least one
    const patch: Partial<ReminderRule> = {
      channels: next,
      channel: next.email ? "email" : "whatsapp",
    };
    if (!next.whatsapp) {
      patch.whatsapp_template_id  = null;
      patch.whatsapp_variable_map = null;
    }
    onChange(patch);
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

  const recipientInfo = () => {
    if (rule.recipient === "contact") return ["Email del contacto"];
    return targets.flatMap((targetId) => {
      if (targetId === "vendor") return ["Email del vendedor"];
      const name  = targetId === "admin" ? adminLabel : staffList.find(s => s.id === targetId)?.name ?? targetId;
      const email = targetId === "admin" ? adminEmail  : staffList.find(s => s.id === targetId)?.email;
      return email ? [`${name}: ${email}`] : [`${name}: sin email configurado`];
    });
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
            onClick={() => onChange({
              recipient: "business",
              businessTargets: isVendor ? ["vendor"] : ["admin"],
              businessTarget:  isVendor ? "vendor" : "admin",
            })}
            className={pill(rule.recipient === "business")}
          >
            <Building2 size={11} /> {isVendor ? "Vendedor" : (businessName || "El negocio")}
          </button>
        </div>
      </div>

      {/* ── Business multi-target checkboxes ──────────────────────────────── */}
      {rule.recipient === "business" && (
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium mb-1.5">
            Destinatarios
          </p>
          {isVendor ? (
            <div className="border border-border/60 rounded-xl p-2.5">
              <div className="flex items-center gap-2.5 px-2 py-1.5">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold leading-none">Tú (Vendedor)</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Recibirás esta notificación en tu email</p>
                </div>
              </div>
            </div>
          ) : (
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
          )}
          {!isVendor && targets.length > 1 && (
            <p className="text-[10px] text-muted-foreground mt-1.5">
              {targets.length} destinatarios — cada uno recibirá su propia notificación
            </p>
          )}
        </div>
      )}

      {/* ── Canal ─────────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">Canal</p>
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={() => toggleChannel("email")} className={pill(channels.email)}>
            <Mail size={11} /> Email
          </button>
          <button type="button" onClick={() => toggleChannel("whatsapp")} className={pill(channels.whatsapp)}>
            <MessageSquare size={11} /> WhatsApp
          </button>
        </div>

        {/* Email recipient info */}
        {channels.email && (() => {
          const lines = recipientInfo();
          if (!lines.length) return null;
          return (
            <div className="rounded-xl border border-border/40 bg-secondary/30 px-3 py-2 space-y-0.5">
              {lines.map((line, i) => (
                <p key={i} className="text-[11px] text-muted-foreground">{line}</p>
              ))}
            </div>
          );
        })()}

        {/* WhatsApp: template selector */}
        {channels.whatsapp && (
          <div className="space-y-2 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
            <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
              Plantilla UTILITY aprobada
            </p>
            {utilityApprovedTemplates.length === 0 ? (
              <p className="text-[11px] text-muted-foreground italic">
                No tienes plantillas UTILITY aprobadas. Créalas en Plantillas WhatsApp.
              </p>
            ) : (
              <select
                value={rule.whatsapp_template_id ?? ""}
                onChange={(e) => {
                  const id = e.target.value || null;
                  onChange({
                    whatsapp_template_id:  id,
                    whatsapp_variable_map: id ? {} : null,
                  });
                }}
                className="w-full h-8 rounded-lg border border-input bg-background text-xs px-2 focus:outline-none focus:ring-1 focus:ring-primary/40"
              >
                <option value="">— selecciona una plantilla —</option>
                {utilityApprovedTemplates.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.language})
                  </option>
                ))}
              </select>
            )}

            {selectedTemplate && (
              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground/70 italic leading-relaxed line-clamp-3">
                  "{selectedTemplate.body_text}"
                </p>
                {templateVarNums.length > 0 && (
                  <WaVarMapper
                    varNums={templateVarNums}
                    varMap={rule.whatsapp_variable_map ?? {}}
                    onChange={(map) => onChange({ whatsapp_variable_map: map })}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Timing ────────────────────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium mb-1.5">Cuándo</p>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            {mode === "calendar" && (
              <button type="button" onClick={() => onChange({ timing: "before" })} className={pill(rule.timing === "before")}>
                <Clock size={11} /> Antes
              </button>
            )}
            <button type="button" onClick={() => onChange({ timing: "after" })} className={pill(rule.timing === "after")}>
              <Clock size={11} /> {mode === "form" ? "Tiempo después" : "Después"}
            </button>
            <button type="button" onClick={() => onChange({ timing: "on_booking" })} className={pill(rule.timing === "on_booking")}>
              <Bell size={11} /> {mode === "form" ? "Al enviar" : "Al reservar"}
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
              <span className="text-xs text-muted-foreground">
                {mode === "form" ? "del envío" : "de la cita"}
              </span>
            </div>
          )}
          {rule.timing === "on_booking" && (
            <p className="text-xs text-muted-foreground">
              {mode === "form"
                ? "Se envía en el momento exacto en que se envía el formulario."
                : "Se envía en el momento exacto de la reserva."}
            </p>
          )}
        </div>
      </div>

      {/* ── Email: Subject + Content ───────────────────────────────────────── */}
      {channels.email && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">Mensaje (email)</p>
            <VariablePicker onSelect={insertVariable} />
          </div>

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

          <div>
            <p className="text-[10px] text-muted-foreground mb-1">Contenido</p>
            <Textarea
              ref={contentRef}
              value={rule.content ?? ""}
              onChange={(e) => onChange({ content: e.target.value })}
              onFocus={() => setActiveField("content")}
              placeholder="Hola {{contact.name}}, te recordamos tu cita el {{appointment.date}} a las {{appointment.time}}."
              rows={3}
              className="text-xs resize-none"
            />
            <p className="text-[10px] text-muted-foreground/50 mt-1">
              Si lo dejas vacío se usará el mensaje por defecto del sistema.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Editor ──────────────────────────────────────────────────────────────

interface Props {
  rules:         ReminderRule[];
  onChange:      (rules: ReminderRule[]) => void;
  businessName?: string;
  mode?:         ReminderEditorMode;
}

interface EditingState {
  rule:  ReminderRule;
  isNew: boolean;
}

const ReminderRulesEditor = ({ rules, onChange, businessName, mode = "calendar" }: Props) => {
  const { data: profile }     = useBusinessProfile();
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
              mode={mode}
              onChange={patchEditing}
            />
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={saveDialog}
              disabled={!!(editing && getChannels(editing.rule).whatsapp && !editing.rule.whatsapp_template_id)}
            >
              Guardar notificación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReminderRulesEditor;
