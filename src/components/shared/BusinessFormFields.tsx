import { useState, useEffect } from "react";
import { Pencil, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import PhoneInput from "@/components/shared/PhoneInput";

const INPUT_CLS = "w-full h-12 px-4 rounded-2xl border border-border bg-background text-base md:text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all placeholder:text-muted-foreground/50";

export const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1.5">
    {children}
  </p>
);

export const EditableField = ({
  label, value, onSave, readOnly, validate, placeholder,
  icon: FieldIcon,
}: {
  label: string;
  value: string;
  onSave: (val: string) => Promise<void>;
  readOnly?: boolean;
  validate?: (v: string) => string | null;
  placeholder?: string;
  icon?: React.ElementType;
}) => {
  if (readOnly) return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-3 px-4 h-12 rounded-2xl bg-secondary/40 border border-border/50">
        {FieldIcon && <FieldIcon size={14} className="text-muted-foreground/40 shrink-0" />}
        <p className="text-sm font-medium">{value || "—"}</p>
      </div>
    </div>
  );

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [editing, setEditing] = useState(false);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [val, setVal] = useState(value);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [saving, setSaving] = useState(false);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [fieldError, setFieldError] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => { setVal(value); }, [value]);

  const handleSave = async () => {
    if (val === value) { setEditing(false); return; }
    if (validate) {
      const err = validate(val);
      if (err) { setFieldError(err); return; }
    }
    setFieldError(null);
    setSaving(true);
    try {
      await onSave(val);
      setEditing(false);
    } catch {
      toast.error("Error al guardar");
      setVal(value);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="space-y-1.5">
        <FieldLabel>{label}</FieldLabel>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            {FieldIcon && (
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <FieldIcon size={14} className="text-muted-foreground/40" />
              </div>
            )}
            <input
              value={val}
              onChange={(e) => { setVal(e.target.value); setFieldError(null); }}
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") { setVal(value); setEditing(false); setFieldError(null); }
              }}
              autoFocus
              disabled={saving}
              placeholder={placeholder}
              className={`${INPUT_CLS} ${FieldIcon ? "pl-10" : ""}`}
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shrink-0 disabled:opacity-50 hover:bg-primary/90 transition-all active:scale-95"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
          </button>
        </div>
        {fieldError && <p className="text-xs text-destructive px-1">{fieldError}</p>}
      </div>
    );
  }

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <button
        onClick={() => setEditing(true)}
        className="w-full flex items-center gap-3 px-4 h-12 rounded-2xl bg-background border border-border hover:border-primary/40 hover:bg-primary/3 transition-all group text-left"
      >
        {FieldIcon && <FieldIcon size={14} className="text-muted-foreground/40 group-hover:text-primary/60 shrink-0 transition-colors" />}
        <span className="text-sm font-medium flex-1 truncate">
          {val || <span className="text-muted-foreground/50 font-normal">{placeholder ?? "—"}</span>}
        </span>
        <Pencil size={12} className="text-muted-foreground/30 group-hover:text-primary/50 shrink-0 transition-colors" />
      </button>
    </div>
  );
};

export const PhoneEditableField = ({
  label, value, onSave, readOnly, icon: FieldIcon,
}: {
  label: string;
  value: string;
  onSave: (val: string) => Promise<void>;
  readOnly?: boolean;
  icon?: React.ElementType;
}) => {
  if (readOnly) return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-3 px-4 h-12 rounded-2xl bg-secondary/40 border border-border/50">
        {FieldIcon && <FieldIcon size={14} className="text-muted-foreground/40 shrink-0" />}
        <p className="text-sm font-medium">{value || "—"}</p>
      </div>
    </div>
  );

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [editing, setEditing] = useState(false);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [val, setVal] = useState(value);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [saving, setSaving] = useState(false);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => { setVal(value); }, [value]);

  const handleSave = async () => {
    if (val === value) { setEditing(false); return; }
    setSaving(true);
    try {
      await onSave(val);
      setEditing(false);
    } catch {
      toast.error("Error al guardar");
      setVal(value);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="space-y-1.5">
        <FieldLabel>{label}</FieldLabel>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <PhoneInput value={val} onChange={setVal} disabled={saving} />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shrink-0 disabled:opacity-50 hover:bg-primary/90 transition-all active:scale-95"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <button
        onClick={() => setEditing(true)}
        className="w-full flex items-center gap-3 px-4 h-12 rounded-2xl bg-background border border-border hover:border-primary/40 hover:bg-primary/3 transition-all group text-left"
      >
        {FieldIcon && <FieldIcon size={14} className="text-muted-foreground/40 group-hover:text-primary/60 shrink-0 transition-colors" />}
        <span className="text-sm font-medium flex-1 truncate">
          {val || <span className="text-muted-foreground/50 font-normal">—</span>}
        </span>
        <Pencil size={12} className="text-muted-foreground/30 group-hover:text-primary/50 shrink-0 transition-colors" />
      </button>
    </div>
  );
};

export const SectionCard = ({
  title, subtitle, icon: SectionIcon, children, className = "",
}: {
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`bg-card border rounded-2xl overflow-hidden ${className}`}>
    <div className="px-5 py-4 border-b flex items-center gap-3">
      {SectionIcon && (
        <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <SectionIcon size={13} className="text-primary" />
        </div>
      )}
      <div className="min-w-0">
        <h2 className="text-sm font-semibold">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>}
      </div>
    </div>
    <div className="px-5 py-5">
      {children}
    </div>
  </div>
);
