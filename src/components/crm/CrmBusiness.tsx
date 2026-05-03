import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, User, Building2, Image as ImageIcon, Palette, Briefcase, Check, Loader2, Trash2, Upload } from "lucide-react";
import CrmServices from "./CrmServices";
import { useBusinessProfile, useUpsertBusinessProfile, useUpdateStaff } from "@/hooks/useCrmData";
import { useCurrentUser, useStaffPermissions } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { CrmBusinessProfile, CrmStaff } from "@/lib/supabase";

const LOGO_BUCKET = "form-uploads";

type Tab = "personal" | "negocio" | "logo" | "colores" | "servicios";

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "personal",  label: "Información Personal", icon: User       },
  { id: "negocio",   label: "Negocio",               icon: Building2  },
  { id: "logo",      label: "Logo",                  icon: ImageIcon  },
  { id: "colores",   label: "Colores",               icon: Palette    },
  { id: "servicios", label: "Servicios",             icon: Briefcase  },
];

// ─── Editable field ──────────────────────────────────────────────────────────
const EditableField = ({ label, value, onSave, readOnly }: { label: string; value: string; onSave: (val: string) => Promise<void>; readOnly?: boolean }) => {
  if (readOnly) return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium mb-1">{label}</p>
      <p className="text-sm font-medium">{value || "—"}</p>
    </div>
  );
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [editing, setEditing] = useState(false);
  const [val, setVal]         = useState(value);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    setVal(value);
  }, [value]);

  const handleSave = async () => {
    if (val === value) {
      setEditing(false);
      return;
    }
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

  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium mb-1">{label}</p>
      {editing ? (
        <div className="flex items-center gap-2">
          <Input
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => { 
                if (e.key === "Enter") handleSave(); 
                if (e.key === "Escape") { setVal(value); setEditing(false); }
            }}
            autoFocus
            disabled={saving}
            className="h-8 text-sm flex-1"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="p-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 group">
          <p className="text-sm font-medium">{val || "—"}</p>
          <button
            onClick={() => setEditing(true)}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            <Pencil size={12} />
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Color swatch ────────────────────────────────────────────────────────────
const ColorField = ({ label, value, onSave }: { label: string; value: string; onSave: (val: string) => Promise<void> }) => {
  const [val, setVal] = useState(value);
  
  useEffect(() => {
    setVal(value);
  }, [value]);

  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium mb-1.5">{label}</p>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => {
            if (val !== value) onSave(val);
          }}
          className="w-10 h-10 rounded-xl border cursor-pointer bg-transparent p-0.5"
        />
        <span className="text-sm font-mono text-muted-foreground">{val}</span>
      </div>
    </div>
  );
};

// ─── Staff personal tab ──────────────────────────────────────────────────────
const StaffPersonalTab = ({ staff, canEdit, onUpdate }: {
  staff: CrmStaff;
  canEdit: boolean;
  onUpdate: (updates: { name?: string; description?: string | null }) => Promise<void>;
}) => (
  <div className="bg-card border rounded-2xl p-6 space-y-6 max-w-xl">
    <h2 className="text-sm font-semibold">Información Personal</h2>
    <div className="grid sm:grid-cols-2 gap-5">
      <EditableField label="Nombre completo" value={staff.name}         readOnly={!canEdit} onSave={val => onUpdate({ name: val })} />
      <EditableField label="Email"           value={staff.email}        readOnly onSave={() => Promise.resolve()} />
      <EditableField label="Cargo / Rol"     value={staff.description ?? ""} readOnly={!canEdit} onSave={val => onUpdate({ description: val || null })} />
    </div>
  </div>
);

// ─── Tabs ────────────────────────────────────────────────────────────────────
const PersonalTab = ({ profile, update }: { profile: CrmBusinessProfile | null, update: (data: Partial<CrmBusinessProfile>) => Promise<void> }) => (
  <div className="bg-card border rounded-2xl p-6 space-y-6 max-w-xl">
    <h2 className="text-sm font-semibold">Información Personal</h2>
    <div className="grid sm:grid-cols-2 gap-5">
      <EditableField label="Nombre"          value={profile?.first_name || ""}  onSave={val => update({ first_name: val })} />
      <EditableField label="Apellido"         value={profile?.last_name || ""}   onSave={val => update({ last_name: val })} />
      <EditableField label="Email de contacto" value={profile?.contact_email || ""} onSave={val => update({ contact_email: val })} />
      <EditableField label="Teléfono"         value={profile?.contact_phone || ""} onSave={val => update({ contact_phone: val })} />
      <EditableField label="Rol / Cargo"      value={profile?.role || ""}        onSave={val => update({ role: val })} />
    </div>
  </div>
);

const TIMEZONE_OPTIONS = (Intl as any).supportedValuesOf?.("timeZone") as string[] | undefined ?? ["America/La_Paz"];

const NegocioTab = ({ profile, update, readOnly = false }: { profile: CrmBusinessProfile | null, update: (data: Partial<CrmBusinessProfile>) => Promise<void>, readOnly?: boolean }) => {
    const [desc, setDesc] = useState(profile?.description || "");
    const [savingDesc, setSavingDesc] = useState(false);

    useEffect(() => { setDesc(profile?.description || ""); }, [profile?.description]);

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
      <div className="bg-card border rounded-2xl p-6 space-y-6 max-w-xl">
        <h2 className="text-sm font-semibold">Información del Negocio</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <EditableField label="Nombre del negocio" value={profile?.business_name || ""} readOnly={readOnly} onSave={val => update({ business_name: val })} />
          <EditableField label="Rubro / Industria"  value={profile?.industry || ""}      readOnly={readOnly} onSave={val => update({ industry: val })} />
          <EditableField label="Ciudad"              value={profile?.city || ""}          readOnly={readOnly} onSave={val => update({ city: val })} />
          <EditableField label="País"                value={profile?.country || ""}       readOnly={readOnly} onSave={val => update({ country: val })} />
          <EditableField label="Sitio web"           value={profile?.website || ""}       readOnly={readOnly} onSave={val => update({ website: val })} />
          <EditableField label="WhatsApp"            value={profile?.whatsapp || ""}      readOnly={readOnly} onSave={val => update({ whatsapp: val })} />
          <EditableField label="Instagram"           value={profile?.instagram || ""}     readOnly={readOnly} onSave={val => update({ instagram: val })} />
          <EditableField label="Facebook"            value={profile?.facebook || ""}      readOnly={readOnly} onSave={val => update({ facebook: val })} />
        </div>

        {/* Zona horaria */}
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium mb-1.5">Zona horaria del negocio</p>
          {readOnly ? (
            <p className="text-sm font-medium">{profile?.timezone?.replace(/_/g, " ") ?? "America/La Paz"}</p>
          ) : (
            <>
              <select
                value={profile?.timezone ?? "America/La_Paz"}
                onChange={(e) => update({ timezone: e.target.value })}
                className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
              >
                {TIMEZONE_OPTIONS.map((tz) => (
                  <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
                ))}
              </select>
              <p className="text-[10px] text-muted-foreground mt-1">
                Zona horaria base del negocio. Los calendarios nuevos la heredan automáticamente.
              </p>
            </>
          )}
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">Descripción del negocio</p>
              {!readOnly && desc !== profile?.description && (
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={handleSaveDesc} disabled={savingDesc}>
                      {savingDesc ? "Guardando..." : "Guardar"}
                  </Button>
              )}
          </div>
          <textarea
            value={desc}
            onChange={e => !readOnly && setDesc(e.target.value)}
            rows={4}
            readOnly={readOnly}
            className={`w-full rounded-xl border bg-secondary/20 text-sm px-4 py-3 resize-none focus:outline-none focus:ring-1 focus:ring-primary ${readOnly ? "opacity-70 cursor-default" : ""}`}
            placeholder="Describe tu negocio..."
          />
        </div>
      </div>
    );
};

const LogoTab = ({ profile, update }: { profile: CrmBusinessProfile | null, update: (data: Partial<CrmBusinessProfile>) => Promise<void> }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("El archivo supera el límite de 2 MB"); return; }
    if (!["image/png", "image/jpeg", "image/svg+xml", "image/webp"].includes(file.type)) {
      toast.error("Formato no soportado. Usa PNG, JPG, SVG o WEBP"); return;
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
    } catch (e: any) {
      toast.error(e?.message ?? "Error al subir el logo");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    await update({ logo_url: null });
    toast.success("Logo eliminado");
  };

  return (
    <div className="bg-card border rounded-2xl p-6 space-y-5 max-w-md">
      <h2 className="text-sm font-semibold">Logo del negocio</h2>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />

      {/* Preview or drop zone */}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="w-full border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center py-12 gap-3 bg-secondary/20 hover:bg-secondary/40 hover:border-primary/30 transition-all disabled:opacity-60"
      >
        {uploading ? (
          <Loader2 size={28} className="animate-spin text-primary" />
        ) : profile?.logo_url ? (
          <img src={profile.logo_url} alt="Logo" className="max-h-20 max-w-[200px] object-contain" />
        ) : (
          <>
            <ImageIcon size={28} className="text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Haz clic para subir tu logo</p>
            <p className="text-xs text-muted-foreground/60">PNG, SVG, WEBP o JPG — máx. 2 MB</p>
          </>
        )}
      </button>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1 h-9 rounded-xl text-sm gap-2" onClick={() => fileRef.current?.click()} disabled={uploading}>
          <Upload size={14} /> {profile?.logo_url ? "Cambiar logo" : "Subir logo"}
        </Button>
        {profile?.logo_url && (
          <Button variant="ghost" className="h-9 px-3 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleRemove} disabled={uploading}>
            <Trash2 size={14} />
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">El logo aparece en el sidebar del CRM y en tus páginas públicas cuando el tema "Branded" está activo.</p>
    </div>
  );
};

const ColoresTab = ({ profile, update }: { profile: CrmBusinessProfile | null, update: (data: Partial<CrmBusinessProfile>) => Promise<void> }) => {
  const currentTheme = profile?.theme ?? "classic";

  return (
    <div className="space-y-5 max-w-sm">
      {/* Theme selector */}
      <div className="bg-card border rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-semibold">Tema de apariencia</h2>
        <div className="grid grid-cols-2 gap-3">
          {(["classic", "branded"] as const).map((t) => {
            const active = currentTheme === t;
            return (
              <button
                key={t}
                onClick={() => update({ theme: t })}
                className={`rounded-xl border-2 p-4 text-left transition-all ${
                  active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                }`}
              >
                <div className={`w-6 h-6 rounded-full mb-3 ${t === "classic" ? "bg-primary" : ""}`}
                  style={t === "branded" ? { backgroundColor: profile?.color_primary ?? "#3b82f6" } : {}} />
                <p className="text-sm font-semibold">{t === "classic" ? "Clásico" : "Branded"}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {t === "classic" ? "Tema Acrosoft por defecto" : "Tus colores de marca"}
                </p>
              </button>
            );
          })}
        </div>
        {currentTheme === "branded" && (
          <p className="text-xs text-muted-foreground">Los colores definidos abajo se aplican al CRM y a tus páginas públicas.</p>
        )}
      </div>

      {/* Color fields */}
      <div className="bg-card border rounded-2xl p-6 space-y-5">
        <h2 className="text-sm font-semibold">Colores de marca</h2>
        <ColorField label="Color primario"   value={profile?.color_primary   || "#3b82f6"} onSave={val => update({ color_primary: val })} />
        <ColorField label="Color secundario" value={profile?.color_secondary || "#ffffff"}  onSave={val => update({ color_secondary: val })} />
        <ColorField label="Color de acento"  value={profile?.color_accent    || "#f59e0b"} onSave={val => update({ color_accent: val })} />
      </div>
    </div>
  );
};

const SUPER_ADMIN_EMAIL = "e.daniel.acero.r@gmail.com";

// ─── Main ─────────────────────────────────────────────────────────────────────
const CrmBusiness = () => {
  const { user } = useCurrentUser();
  const { isStaff, staffRecord, can } = useStaffPermissions();
  const { data: profile, isLoading } = useBusinessProfile();
  const upsertProfile = useUpsertBusinessProfile();
  const updateStaff   = useUpdateStaff();
  const isSuperAdmin  = user?.email === SUPER_ADMIN_EMAIL;

  // Tabs visible según rol
  const visibleTabs = isStaff
    ? tabs.filter(({ id }) => {
        if (id === "personal")  return can("mi_negocio_personal", "read");
        if (id === "negocio")   return can("mi_negocio_datos",    "read");
        if (id === "servicios") return can("servicios",           "read");
        return false; // logo y colores solo para el dueño
      })
    : tabs;

  const [tab, setTab] = useState<Tab>(() =>
    visibleTabs.length > 0 ? visibleTabs[0].id : "personal"
  );

  // Si el tab actual ya no es visible (cambio de permisos), resetear
  const activeTab = visibleTabs.find(t => t.id === tab) ? tab : (visibleTabs[0]?.id ?? "personal");

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
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Mi Negocio</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isStaff ? "Tu información y datos del negocio" : "Gestiona la información de tu negocio y perfil"}
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 p-1 bg-card border rounded-2xl w-fit">
        {visibleTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="animate-in fade-in duration-200">
        {activeTab === "personal" && (
          isStaff && staffRecord
            ? <StaffPersonalTab
                staff={staffRecord}
                canEdit={can("mi_negocio_personal", "edit")}
                onUpdate={handleUpdateStaff}
              />
            : <PersonalTab profile={profile} update={handleUpdate} />
        )}
        {activeTab === "negocio"   && <NegocioTab   profile={profile} update={handleUpdate} readOnly={isStaff && !can("mi_negocio_datos", "edit")} />}
        {activeTab === "logo"      && <LogoTab       profile={profile} update={handleUpdate} />}
        {activeTab === "colores"   && <ColoresTab    profile={profile} update={handleUpdate} />}
        {activeTab === "servicios" && (
          <CrmServices
            isSuperAdmin={isSuperAdmin}
            canEdit={!isStaff || can("servicios", "edit")}
            canCreate={!isStaff || can("servicios", "create")}
            canDelete={!isStaff || can("servicios", "delete")}
            canReorder={!isStaff || can("servicios", "edit")}
          />
        )}
      </div>
    </div>
  );
};

export default CrmBusiness;
