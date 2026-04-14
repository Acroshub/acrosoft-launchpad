import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Mail, MessageSquare, Clock, User, Building2 } from "lucide-react";
import { useStaff, useBusinessProfile } from "@/hooks/useCrmData";
import VariableChipsEditor, { DEFAULT_REMINDER_MESSAGE } from "./VariableChipsEditor";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReminderRecipient = "contact" | "business";
export type ReminderChannel   = "email" | "whatsapp";
export type ReminderTiming    = "before" | "after";
export type ReminderUnit      = "minutes" | "hours" | "days";

/**
 * businessTargets (array):
 *   "admin"       → the SaaS admin (owner)
 *   "<staff_id>"  → a specific staff member UUID
 *
 * Backwards-compatible: old `businessTarget: string` is migrated to `businessTargets: string[]`.
 */
export interface ReminderRule {
  id: string;
  recipient:        ReminderRecipient;
  /** @deprecated Use businessTargets */
  businessTarget?:  "admin" | string;
  businessTargets?: string[];         // multi-select — new field
  channel:          ReminderChannel;
  channelValue:     string;           // the actual email or phone to send to
  timing:           ReminderTiming;
  amount:           number;
  unit:             ReminderUnit;
  message?:         string;           // note / message template with {{variables}}
}

/** Normalize old single-target to new multi-target array */
const getTargets = (rule: ReminderRule): string[] => {
  if (rule.businessTargets?.length) return rule.businessTargets;
  if (rule.businessTarget) return [rule.businessTarget];
  return ["admin"];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 10);

const DEFAULT_RULE: Omit<ReminderRule, "id"> = {
  recipient:      "contact",
  channel:        "email",
  channelValue:   "",
  timing:         "before",
  amount:         24,
  unit:           "hours",
  message:        DEFAULT_REMINDER_MESSAGE,
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

// ─── Admin Label Helper ───────────────────────────────────────────────────────

const useAdminLabel = () => {
  const { data: profile } = useBusinessProfile();
  const fn = profile?.first_name?.trim() ?? "";
  const ln = profile?.last_name?.trim() ?? "";
  const fullName = [fn, ln].filter(Boolean).join(" ") || "Administrador";
  const role = profile?.role?.trim() || "Admin";
  return `${fullName} (${role})`;
};

// ─── Single Rule Row ──────────────────────────────────────────────────────────

const RuleRow = ({
  rule,
  businessName,
  contactEmail,
  contactPhone,
  adminEmail,
  adminPhone,
  onChange,
  onDelete,
}: {
  rule: ReminderRule;
  businessName?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  adminEmail?: string | null;
  adminPhone?: string | null;
  onChange: (patch: Partial<ReminderRule>) => void;
  onDelete: () => void;
}) => {
  const { data: staffList = [] } = useStaff();
  const { data: profile } = useBusinessProfile();
  const adminLabel = useAdminLabel();

  const targets = getTargets(rule);

  // Build auto channel values from selected targets
  const buildChannelValues = (selectedTargets: string[], ch: ReminderChannel): string => {
    const values: string[] = [];
    for (const t of selectedTargets) {
      if (t === "admin") {
        const val = ch === "email"
          ? (adminEmail ?? profile?.contact_email ?? "")
          : (adminPhone ?? profile?.contact_phone ?? profile?.whatsapp ?? "");
        if (val) values.push(val);
      } else {
        const staff = staffList.find(s => s.id === t);
        const val = ch === "email" ? (staff?.email ?? "") : "";
        if (val) values.push(val);
      }
    }
    return values.join(", ");
  };

  // Auto-populate channelValue when recipient/channel/targets changes
  useEffect(() => {
    if (rule.channelValue) return;
    let suggested = "";
    if (rule.recipient === "contact") {
      suggested = rule.channel === "email"
        ? (contactEmail ?? "")
        : (contactPhone ?? "");
    } else {
      suggested = buildChannelValues(targets, rule.channel);
    }
    if (suggested) onChange({ channelValue: suggested });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rule.recipient, rule.channel, JSON.stringify(targets)]);

  const toggleTarget = (targetId: string) => {
    const current = new Set(targets);
    if (current.has(targetId)) {
      current.delete(targetId);
      if (current.size === 0) current.add("admin"); // at least one
    } else {
      current.add(targetId);
    }
    const newTargets = Array.from(current);
    const newChannelVal = buildChannelValues(newTargets, rule.channel);
    onChange({
      businessTargets: newTargets,
      businessTarget: newTargets[0], // backwards compat
      channelValue: newChannelVal,
    });
  };

  const channelPlaceholder = rule.channel === "email"
    ? "correo@ejemplo.com"
    : "+52 55 1234 5678";

  const channelLabel = rule.channel === "email" ? "Email destino" : "WhatsApp destino";

  return (
    <div className="border border-border/60 rounded-xl p-3.5 space-y-3 bg-card">
      {/* Recipient */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium mb-1.5">Para</p>
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={() => onChange({ recipient: "contact", businessTargets: undefined, businessTarget: undefined })} className={pill(rule.recipient === "contact")}>
            <User size={11} /> Quien agendó
          </button>
          <button type="button" onClick={() => onChange({ recipient: "business", businessTargets: ["admin"], businessTarget: "admin" })} className={pill(rule.recipient === "business")}>
            <Building2 size={11} /> {businessName || "El negocio"}
          </button>
        </div>
      </div>

      {/* Business sub-target — multi-select checkboxes */}
      {rule.recipient === "business" && (
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium mb-2">Destinatarios del negocio</p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {/* Admin checkbox */}
            <label className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-secondary/40 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={targets.includes("admin")}
                onChange={() => toggleTarget("admin")}
                className="rounded border-input h-3.5 w-3.5 text-primary"
              />
              <span className="text-xs font-medium">{adminLabel}</span>
            </label>
            {/* Staff checkboxes */}
            {staffList.map((s) => (
              <label key={s.id} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-secondary/40 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={targets.includes(s.id)}
                  onChange={() => toggleTarget(s.id)}
                  className="rounded border-input h-3.5 w-3.5 text-primary"
                />
                <span className="text-xs font-medium">{s.name} (Staff)</span>
              </label>
            ))}
          </div>
          {targets.length > 1 && (
            <p className="text-[10px] text-muted-foreground mt-1.5">
              {targets.length} destinatarios seleccionados
            </p>
          )}
        </div>
      )}

      {/* Channel */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium mb-1.5">Canal</p>
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={() => onChange({ channel: "email", channelValue: "" })} className={pill(rule.channel === "email")}>
            <Mail size={11} /> Email
          </button>
          <button type="button" onClick={() => onChange({ channel: "whatsapp", channelValue: "" })} className={pill(rule.channel === "whatsapp")}>
            <MessageSquare size={11} /> WhatsApp
          </button>
        </div>
      </div>

      {/* Channel destination — editable */}
      <div>
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">{channelLabel}</label>
        <Input
          value={rule.channelValue}
          onChange={(e) => onChange({ channelValue: e.target.value })}
          placeholder={channelPlaceholder}
          className="h-8 text-xs mt-1.5"
        />
      </div>

      {/* Message / Note with variables */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium mb-1.5">Nota / Mensaje</p>
        <VariableChipsEditor
          value={rule.message ?? ""}
          onChange={(v) => onChange({ message: v })}
          rows={3}
        />
      </div>

      {/* Timing */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium mb-1.5">Cuándo</p>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-2">
            <button type="button" onClick={() => onChange({ timing: "before" })} className={pill(rule.timing === "before")}>
              <Clock size={11} /> Antes
            </button>
            <button type="button" onClick={() => onChange({ timing: "after" })} className={pill(rule.timing === "after")}>
              <Clock size={11} /> Después
            </button>
          </div>
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
        </div>
      </div>

      {/* Delete */}
      <div className="flex justify-end pt-0.5">
        <button
          type="button"
          onClick={onDelete}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 size={11} /> Eliminar recordatorio
        </button>
      </div>
    </div>
  );
};

// ─── Main Editor ──────────────────────────────────────────────────────────────

interface Props {
  rules: ReminderRule[];
  onChange: (rules: ReminderRule[]) => void;
  businessName?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

const ReminderRulesEditor = ({
  rules,
  onChange,
  businessName,
  contactEmail,
  contactPhone,
}: Props) => {
  const { data: profile } = useBusinessProfile();

  const add = () =>
    onChange([...rules, { ...DEFAULT_RULE, id: uid() }]);

  const update = (id: string, patch: Partial<ReminderRule>) =>
    onChange(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const remove = (id: string) =>
    onChange(rules.filter((r) => r.id !== id));

  return (
    <div className="space-y-3">
      {rules.length === 0 && (
        <p className="text-xs text-muted-foreground/60 italic py-2">
          Sin recordatorios configurados. Agrega uno para que se envíe automáticamente.
        </p>
      )}
      {rules.map((rule) => (
        <RuleRow
          key={rule.id}
          rule={rule}
          businessName={businessName}
          contactEmail={contactEmail}
          contactPhone={contactPhone}
          adminEmail={profile?.contact_email}
          adminPhone={profile?.contact_phone ?? profile?.whatsapp}
          onChange={(patch) => update(rule.id, patch)}
          onDelete={() => remove(rule.id)}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        className="w-full rounded-xl border-dashed h-9 text-xs gap-1.5"
      >
        <Plus size={13} /> Agregar recordatorio
      </Button>
    </div>
  );
};

export default ReminderRulesEditor;
