import { useState, useEffect, useRef } from "react";
import {
  Pencil, User, Building2, Image as ImageIcon, Briefcase, ShoppingBag,
  Check, Loader2, Trash2, Upload, Store, Globe, MapPin, Phone,
  Mail, Instagram, Facebook, Clock, Shield, Palette,
  ChevronRight, ChevronLeft, HelpCircle, Plus, X,
} from "lucide-react";
import PhoneInput from "@/components/shared/PhoneInput";
import CrmServices from "./CrmServices";
import CrmProductos from "./CrmProductos";
import { useBusinessProfile, useUpsertBusinessProfile, useUpdateStaff } from "@/hooks/useCrmData";
import { useCurrentUser, useStaffPermissions } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { CrmBusinessProfile, CrmStaff } from "@/lib/supabase";
import { validateEmail, validateUrl } from "@/lib/validators";

const LOGO_BUCKET = "form-uploads";

type Tab = "personal" | "negocio" | "logo" | "servicios" | "productos";

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "personal",  label: "Personal",  icon: User        },
  { id: "negocio",   label: "Negocio",   icon: Building2   },
  { id: "logo",      label: "Marca",     icon: Palette     },
  { id: "servicios", label: "Servicios", icon: Briefcase   },
  { id: "productos", label: "Productos", icon: ShoppingBag },
];

// ─── Input base class ─────────────────────────────────────────────────────────
const INPUT_CLS = "w-full h-12 px-4 rounded-2xl border border-border bg-background text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all placeholder:text-muted-foreground/50";

// ─── Field label ─────────────────────────────────────────────────────────────
const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1.5">
    {children}
  </p>
);

// ─── Editable field ──────────────────────────────────────────────────────────
const EditableField = ({
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

// ─── Phone editable field ─────────────────────────────────────────────────────
const PhoneEditableField = ({
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

// ─── Color field ─────────────────────────────────────────────────────────────
const ColorField = ({
  label, value, onSave, description,
}: {
  label: string;
  value: string;
  onSave: (val: string) => Promise<void>;
  description?: string;
}) => {
  const [val, setVal] = useState(value);
  useEffect(() => { setVal(value); }, [value]);

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5 rounded-2xl bg-background border border-border">
      <div className="flex items-center gap-3">
        <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-border/60 cursor-pointer shrink-0 shadow-sm">
          <input
            type="color"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={() => { if (val !== value) onSave(val); }}
            className="absolute inset-0 w-[200%] h-[200%] -top-1/4 -left-1/4 cursor-pointer border-0 p-0 opacity-0"
          />
          <div className="absolute inset-0 rounded-xl" style={{ backgroundColor: val }} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{label}</p>
          {description && <p className="text-xs text-muted-foreground truncate">{description}</p>}
        </div>
      </div>
      <span className="text-xs font-mono text-muted-foreground bg-secondary px-2.5 py-1.5 rounded-xl shrink-0">{val}</span>
    </div>
  );
};

// ─── Section card ─────────────────────────────────────────────────────────────
const SectionCard = ({
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

// ─── Staff personal tab ──────────────────────────────────────────────────────
const StaffPersonalTab = ({
  staff, canEdit, onUpdate,
}: {
  staff: CrmStaff;
  canEdit: boolean;
  onUpdate: (updates: { name?: string; description?: string | null }) => Promise<void>;
}) => (
  <SectionCard title="Información Personal" subtitle="Tus datos de perfil" icon={User} className="max-w-lg">
    <div className="space-y-4">
      <EditableField label="Nombre completo" value={staff.name} icon={User} readOnly={!canEdit} onSave={val => onUpdate({ name: val })} />
      <EditableField label="Email" value={staff.email} icon={Mail} readOnly onSave={() => Promise.resolve()} />
      <EditableField label="Cargo / Rol" value={staff.description ?? ""} readOnly={!canEdit} onSave={val => onUpdate({ description: val || null })} placeholder="Ej: Asesor de ventas" />
    </div>
  </SectionCard>
);

// ─── Personal tab ─────────────────────────────────────────────────────────────
const PersonalTab = ({
  profile, update,
}: {
  profile: CrmBusinessProfile | null;
  update: (data: Partial<CrmBusinessProfile>) => Promise<void>;
}) => (
  <SectionCard title="Información Personal" subtitle="Tus datos de perfil y contacto" icon={User} className="max-w-lg">
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <EditableField label="Nombre" value={profile?.first_name || ""} icon={User} onSave={val => update({ first_name: val })} placeholder="Tu nombre" />
        <EditableField label="Apellido" value={profile?.last_name || ""} onSave={val => update({ last_name: val })} placeholder="Tu apellido" />
      </div>
      <EditableField label="Email de contacto" value={profile?.contact_email || ""} icon={Mail} onSave={val => update({ contact_email: val })} validate={validateEmail} placeholder="contacto@ejemplo.com" />
      <PhoneEditableField label="Teléfono" value={profile?.contact_phone || ""} icon={Phone} onSave={val => update({ contact_phone: val })} />
      <EditableField label="Rol / Cargo" value={profile?.role || ""} onSave={val => update({ role: val })} placeholder="Ej: CEO, Director" />
    </div>
  </SectionCard>
);

// ─── Timezone options ─────────────────────────────────────────────────────────
const TIMEZONE_OPTIONS = (Intl as any).supportedValuesOf?.("timeZone") as string[] | undefined ?? ["America/La_Paz"];

// ─── Negocio tab ──────────────────────────────────────────────────────────────
const NegocioTab = ({
  profile, update, readOnly = false,
}: {
  profile: CrmBusinessProfile | null;
  update: (data: Partial<CrmBusinessProfile>) => Promise<void>;
  readOnly?: boolean;
}) => {
  const [desc, setDesc]             = useState(profile?.description || "");
  const [savingDesc, setSavingDesc] = useState(false);
  const [faq, setFaq]               = useState<Array<{ q: string; a: string }>>(profile?.agent_faq ?? []);
  const [newQ, setNewQ]             = useState("");
  const [newA, setNewA]             = useState("");
  const [savingFaq, setSavingFaq]   = useState(false);

  useEffect(() => { setDesc(profile?.description || ""); }, [profile?.description]);
  useEffect(() => { setFaq(profile?.agent_faq ?? []); }, [profile?.agent_faq]);

  const handleAddFaq = async () => {
    if (!newQ.trim() || !newA.trim()) return;
    const updated = [...faq, { q: newQ.trim(), a: newA.trim() }];
    setSavingFaq(true);
    try {
      await update({ agent_faq: updated });
      setFaq(updated);
      setNewQ("");
      setNewA("");
      toast.success("Pregunta agregada");
    } catch {
      toast.error("Error al guardar pregunta");
    } finally {
      setSavingFaq(false);
    }
  };

  const handleDeleteFaq = async (index: number) => {
    const updated = faq.filter((_, i) => i !== index);
    setSavingFaq(true);
    try {
      await update({ agent_faq: updated });
      setFaq(updated);
    } catch {
      toast.error("Error al eliminar pregunta");
    } finally {
      setSavingFaq(false);
    }
  };

  const handleSaveDesc = async () => {
    if (desc === profile?.description) return;
    setSavingDesc(true);
    try {
      await update({ description: desc });
      toast.success("Descripción guardada");
    } catch {
      toast.error("Error al guardar descripción");
    } finally {
      setSavingDesc(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">

      {/* Datos básicos */}
      <div className="bg-card border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center gap-3">
          <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 size={13} className="text-primary" />
          </div>
          <h2 className="text-sm font-semibold">Información del Negocio</h2>
        </div>
        <div className="px-5 py-5 space-y-4">
          <EditableField label="Nombre del negocio" value={profile?.business_name || ""} icon={Building2} readOnly={readOnly} onSave={val => update({ business_name: val })} placeholder="Nombre de tu empresa" />
          <EditableField label="Rubro / Industria" value={profile?.industry || ""} readOnly={readOnly} onSave={val => update({ industry: val })} placeholder="Ej: Salud, Tecnología" />
          <EditableField label="Ciudad" value={profile?.city || ""} icon={MapPin} readOnly={readOnly} onSave={val => update({ city: val })} placeholder="Tu ciudad" />
          <EditableField label="País" value={profile?.country || ""} readOnly={readOnly} onSave={val => update({ country: val })} placeholder="Tu país" />
        </div>
      </div>

      {/* Contacto y redes sociales */}
      <div className="bg-card border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center gap-3">
          <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Globe size={13} className="text-primary" />
          </div>
          <h2 className="text-sm font-semibold">Contacto y Redes</h2>
        </div>
        <div className="px-5 py-5 space-y-4">
          <EditableField label="Sitio web" value={profile?.website || ""} icon={Globe} readOnly={readOnly} onSave={val => update({ website: val })} validate={validateUrl} placeholder="https://..." />
          <PhoneEditableField label="WhatsApp" value={profile?.whatsapp || ""} icon={Phone} readOnly={readOnly} onSave={val => update({ whatsapp: val })} />
          <EditableField label="Instagram" value={profile?.instagram || ""} icon={Instagram} readOnly={readOnly} onSave={val => update({ instagram: val })} placeholder="@usuario" />
          <EditableField label="Facebook" value={profile?.facebook || ""} icon={Facebook} readOnly={readOnly} onSave={val => update({ facebook: val })} placeholder="Página o @usuario" />
        </div>
      </div>

      {/* Zona horaria */}
      <div className="bg-card border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center gap-3">
          <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Clock size={13} className="text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Zona Horaria</h2>
            <p className="text-xs text-muted-foreground">Los calendarios nuevos la heredan automáticamente</p>
          </div>
        </div>
        <div className="px-5 py-5">
          {readOnly ? (
            <p className="text-sm font-medium">{profile?.timezone?.replace(/_/g, " ") ?? "America/La Paz"}</p>
          ) : (
            <div className="relative">
              <select
                value={profile?.timezone ?? "America/La_Paz"}
                onChange={(e) => update({ timezone: e.target.value })}
                className="w-full h-12 px-4 rounded-2xl border border-border bg-background text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all appearance-none cursor-pointer"
              >
                {TIMEZONE_OPTIONS.map((tz) => (
                  <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Descripción */}
      <div className="bg-card border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="text-sm font-semibold">Descripción del Negocio</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Describe qué ofreces y a quién va dirigido</p>
        </div>
        <div className="px-5 py-5 space-y-3">
          <textarea
            value={desc}
            onChange={e => !readOnly && setDesc(e.target.value)}
            rows={5}
            readOnly={readOnly}
            className={`w-full rounded-2xl border border-border bg-background text-sm px-4 py-3.5 resize-none outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${readOnly ? "opacity-70 cursor-default" : ""}`}
            placeholder="Describe brevemente tu negocio, qué ofreces y a quién..."
          />
          {!readOnly && desc !== profile?.description && (
            <button
              onClick={handleSaveDesc}
              disabled={savingDesc}
              className="h-11 px-5 rounded-2xl text-sm font-bold text-white flex items-center gap-2 transition-all disabled:opacity-50 active:scale-[0.98] shadow-sm"
              style={{ background: "linear-gradient(135deg, #1877F2, #0f5cc8)" }}
            >
              {savingDesc ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              Guardar descripción
            </button>
          )}
        </div>
      </div>

      {/* Preguntas Frecuentes */}
      <div className="md:col-span-2 bg-card border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center gap-3">
          <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <HelpCircle size={13} className="text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Preguntas Frecuentes</h2>
            <p className="text-xs text-muted-foreground mt-0.5">El Agente IA usará estas respuestas en las conversaciones de WhatsApp</p>
          </div>
        </div>
        <div className="px-5 py-5 space-y-4">
          {/* Listado existente */}
          {faq.length > 0 ? (
            <div className="space-y-2">
              {faq.map((item, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-xs font-semibold text-foreground truncate">P: {item.q}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">R: {item.a}</p>
                  </div>
                  {!readOnly && (
                    <button
                      onClick={() => handleDeleteFaq(i)}
                      disabled={savingFaq}
                      className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-40"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/60 text-center py-4">
              Aún no hay preguntas frecuentes registradas.
            </p>
          )}

          {/* Formulario para agregar nueva FAQ */}
          {!readOnly && (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-4 space-y-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Agregar pregunta</p>
              <input
                type="text"
                value={newQ}
                onChange={e => setNewQ(e.target.value)}
                placeholder="¿Cuál es la pregunta que hacen los clientes?"
                className="w-full h-10 rounded-xl border border-border bg-background text-sm px-3 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
              <textarea
                value={newA}
                onChange={e => setNewA(e.target.value)}
                rows={3}
                placeholder="Escribe la respuesta que el agente debe dar..."
                className="w-full rounded-xl border border-border bg-background text-sm px-3 py-2.5 resize-none outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
              <button
                onClick={handleAddFaq}
                disabled={savingFaq || !newQ.trim() || !newA.trim()}
                className="h-9 px-4 rounded-xl text-sm font-semibold text-white flex items-center gap-1.5 transition-all disabled:opacity-40 active:scale-[0.98] shadow-sm"
                style={{ background: "linear-gradient(135deg, #1877F2, #0f5cc8)" }}
              >
                {savingFaq ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                Agregar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Logo y Colores tab ───────────────────────────────────────────────────────
const LogoColoresTab = ({
  profile, update,
}: {
  profile: CrmBusinessProfile | null;
  update: (data: Partial<CrmBusinessProfile>) => Promise<void>;
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const currentTheme = profile?.theme ?? "classic";

  const handleFile = async (file: File) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("El archivo supera el límite de 2 MB"); return; }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Formato no soportado. Usa PNG, JPG o WEBP"); return;
    }
    setUploading(true);
    try {
      const ext  = file.name.split(".").pop() ?? "png";
      const path = `logos/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(LOGO_BUCKET).upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path);
      await update({ logo_url: urlData.publicUrl });
      toast.success("Logo actualizado");
    } catch {
      toast.error("Error al subir el logo. Intenta de nuevo.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    await update({ logo_url: null });
    toast.success("Logo eliminado");
  };

  return (
    <div className="grid md:grid-cols-2 gap-4 items-start">

      {/* Logo — columna izquierda */}
      <div className="bg-card border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center gap-3">
          <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <ImageIcon size={13} className="text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Logo del negocio</h2>
            <p className="text-xs text-muted-foreground">Aparece en el sidebar y páginas públicas</p>
          </div>
        </div>
        <div className="px-5 py-5 space-y-4">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center py-10 gap-3 bg-secondary/10 hover:bg-secondary/30 hover:border-primary/40 transition-all disabled:opacity-60 group"
          >
            {uploading ? (
              <Loader2 size={28} className="animate-spin text-muted-foreground" />
            ) : profile?.logo_url ? (
              <img src={profile.logo_url} alt="Logo" className="max-h-20 max-w-[200px] object-contain" />
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-secondary group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                  <Upload size={22} className="text-muted-foreground/50 group-hover:text-primary/60 transition-colors" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">Sube tu logo</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">PNG, JPG o WEBP · máx. 2 MB</p>
                </div>
              </>
            )}
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex-1 h-11 rounded-2xl border border-border text-sm font-semibold flex items-center justify-center gap-2 hover:bg-secondary transition-colors disabled:opacity-50"
            >
              <Upload size={14} />
              {profile?.logo_url ? "Cambiar logo" : "Subir logo"}
            </button>
            {profile?.logo_url && (
              <button
                onClick={handleRemove}
                disabled={uploading}
                className="h-11 w-11 rounded-2xl border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/5 hover:border-destructive/30 transition-all disabled:opacity-50"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Columna derecha: Tema + Colores apilados */}
      <div className="space-y-4">

        {/* Tema de apariencia */}
        <div className="bg-card border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center gap-3">
            <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Palette size={13} className="text-primary" />
            </div>
            <h2 className="text-sm font-semibold">Tema de apariencia</h2>
          </div>
          <div className="px-5 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {(["classic", "branded"] as const).map((t) => {
                const active = currentTheme === t;
                return (
                  <button
                    key={t}
                    onClick={() => update({ theme: t })}
                    className={`relative rounded-2xl border-2 p-4 text-left transition-all ${
                      active ? "border-primary bg-primary/5" : "border-border hover:border-primary/30 hover:bg-secondary/30"
                    }`}
                  >
                    {active && (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check size={10} className="text-white" />
                      </div>
                    )}
                    <div
                      className="w-8 h-8 rounded-xl mb-3 shadow-sm"
                      style={{ backgroundColor: t === "classic" ? "hsl(var(--primary))" : (profile?.color_primary ?? "#3b82f6") }}
                    />
                    <p className="text-sm font-semibold">{t === "classic" ? "Clásico" : "Branded"}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      {t === "classic" ? "Tema Acrosoft por defecto" : "Tus colores de marca"}
                    </p>
                  </button>
                );
              })}
            </div>
            {currentTheme === "branded" && (
              <p className="text-xs text-muted-foreground bg-secondary/40 px-3 py-2 rounded-xl">
                Los colores de marca se aplican al CRM y a tus páginas públicas.
              </p>
            )}
          </div>
        </div>

        {/* Colores de marca */}
        <div className="bg-card border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center gap-3">
            <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Shield size={13} className="text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Colores de marca</h2>
              <p className="text-xs text-muted-foreground">Activos con el tema Branded</p>
            </div>
          </div>
          <div className="px-5 py-5 space-y-3">
            <ColorField
              label="Color primario"
              description="Botones, enlaces y elementos clave"
              value={profile?.color_primary || "#3b82f6"}
              onSave={val => update({ color_primary: val })}
            />
            <ColorField
              label="Color secundario"
              description="Fondos y elementos de apoyo"
              value={profile?.color_secondary || "#ffffff"}
              onSave={val => update({ color_secondary: val })}
            />
            <ColorField
              label="Color de acento"
              description="Detalles y énfasis"
              value={profile?.color_accent || "#f59e0b"}
              onSave={val => update({ color_accent: val })}
            />
          </div>
        </div>

      </div>

    </div>
  );
};

const SUPER_ADMIN_EMAIL = "e.daniel.acero.r@gmail.com";

const TAB_DESCS: Record<Tab, string> = {
  personal:  "Nombre, email, teléfono y cargo",
  negocio:   "Datos, ubicación y redes sociales",
  logo:      "Logo, colores y tema de marca",
  servicios: "Servicios que ofreces a clientes",
  productos: "Catálogos y productos digitales",
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const CrmBusiness = ({ initialTab }: { initialTab?: Tab }) => {
  const { user }                      = useCurrentUser();
  const { isStaff, staffRecord, can } = useStaffPermissions();
  const { data: profile, isLoading }  = useBusinessProfile();
  const upsertProfile                 = useUpsertBusinessProfile();
  const updateStaff                   = useUpdateStaff();
  const isSuperAdmin                  = user?.email === SUPER_ADMIN_EMAIL;

  const visibleTabs = isStaff
    ? tabs.filter(({ id }) => {
        if (id === "personal")  return can("mi_negocio_personal", "read");
        if (id === "negocio")   return can("mi_negocio_datos",    "read");
        if (id === "servicios") return can("servicios",           "read");
        return false;
      })
    : tabs;

  const [tab, setTab] = useState<Tab>(() => {
    const resolvedTab = initialTab === "colores" ? "logo" : initialTab;
    if (resolvedTab && tabs.find(t => t.id === resolvedTab)) return resolvedTab as Tab;
    return visibleTabs.length > 0 ? visibleTabs[0].id : "personal";
  });

  // Mobile: muestra el contenido de la sección seleccionada (oculta el menú)
  const [mobileShowContent, setMobileShowContent] = useState(() => !!initialTab);

  const activeTab = visibleTabs.find(t => t.id === tab) ? tab : (visibleTabs[0]?.id ?? "personal");
  const activeTabMeta = visibleTabs.find(t => t.id === activeTab);

  const handleUpdate = async (updates: Partial<CrmBusinessProfile>) => {
    await upsertProfile.mutateAsync(updates);
  };

  const handleUpdateStaff = async (updates: { name?: string; description?: string | null }) => {
    if (!staffRecord) return;
    await updateStaff.mutateAsync({ id: staffRecord.id, ...updates });
    toast.success("Información actualizada");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-24">
        <Loader2 size={22} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (visibleTabs.length === 0) {
    return (
      <div className="flex items-center justify-center p-24 text-center">
        <p className="text-sm text-muted-foreground">No tienes permisos para acceder a esta sección.</p>
      </div>
    );
  }

  // ── Contenido del tab activo (reutilizado en mobile y desktop) ──────────────
  const TabContent = () => (
    <>
      {activeTab === "personal" && (
        isStaff && staffRecord
          ? <StaffPersonalTab staff={staffRecord} canEdit={can("mi_negocio_personal", "edit")} onUpdate={handleUpdateStaff} />
          : <PersonalTab profile={profile} update={handleUpdate} />
      )}
      {activeTab === "negocio"   && <NegocioTab profile={profile} update={handleUpdate} readOnly={isStaff && !can("mi_negocio_datos", "edit")} />}
      {activeTab === "logo"      && <LogoColoresTab profile={profile} update={handleUpdate} />}
      {activeTab === "servicios" && (
        <CrmServices
          isSuperAdmin={isSuperAdmin}
          canEdit={!isStaff || can("servicios", "edit")}
          canCreate={!isStaff || can("servicios", "create")}
          canDelete={!isStaff || can("servicios", "delete")}
          canReorder={!isStaff || can("servicios", "edit")}
        />
      )}
      {activeTab === "productos" && <CrmProductos />}
    </>
  );

  return (
    <div className="space-y-5">

      {/* ── Page header ── */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Mi Negocio</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isStaff ? "Tu información y datos del negocio" : "Gestiona la información y perfil de tu negocio"}
        </p>
      </div>

      {/* ══════════════════════════════════════════════════════════
          MOBILE ONLY  (oculto en md+)
      ══════════════════════════════════════════════════════════ */}

      {/* Mobile — Lista menú */}
      <div className={`md:hidden ${mobileShowContent ? "hidden" : "block"}`}>
        <div className="bg-card border rounded-2xl overflow-hidden">
          {visibleTabs.map(({ id, label, icon: Icon }, index) => (
            <button
              key={id}
              onClick={() => { setTab(id); setMobileShowContent(true); }}
              className={`w-full flex items-center gap-3.5 px-4 py-4 text-left transition-colors active:bg-secondary/50 hover:bg-secondary/30 ${
                index < visibleTabs.length - 1 ? "border-b border-border/60" : ""
              }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                activeTab === id ? "bg-primary/10" : "bg-secondary"
              }`}>
                <Icon size={16} className={activeTab === id ? "text-primary" : "text-muted-foreground"} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold leading-tight ${activeTab === id ? "text-primary" : "text-foreground"}`}>
                  {label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{TAB_DESCS[id]}</p>
              </div>
              <ChevronRight size={15} className="text-muted-foreground/30 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Mobile — Vista de contenido */}
      <div className={`md:hidden ${mobileShowContent ? "block" : "hidden"}`}>
        {/* Back breadcrumb */}
        <button
          onClick={() => setMobileShowContent(false)}
          className="flex items-center gap-1.5 text-sm font-medium text-primary mb-4 -ml-1 px-1 py-1 rounded-xl hover:bg-secondary/60 transition-colors"
        >
          <ChevronLeft size={16} />
          Mi Negocio
          {activeTabMeta && (
            <span className="text-muted-foreground/50 font-normal ml-0.5">
              · {activeTabMeta.label}
            </span>
          )}
        </button>
        <TabContent />
      </div>

      {/* ══════════════════════════════════════════════════════════
          DESKTOP ONLY  (oculto en mobile)
      ══════════════════════════════════════════════════════════ */}
      <div className="hidden md:block space-y-5">

        {/* Tab bar */}
        <div className="overflow-x-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          <div className="inline-flex items-center gap-0.5 bg-secondary/60 rounded-xl p-1 min-w-max">
            {visibleTabs.map(({ id, label, icon: Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    active
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon size={13} className="shrink-0" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <TabContent />
      </div>

    </div>
  );
};

export default CrmBusiness;
