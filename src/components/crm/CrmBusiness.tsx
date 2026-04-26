import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, User, Building2, Image as ImageIcon, Palette, Briefcase, Check, Loader2 } from "lucide-react";
import CrmServices from "./CrmServices";
import { useBusinessProfile, useUpsertBusinessProfile, useUpdateStaff } from "@/hooks/useCrmData";
import { useCurrentUser, useStaffPermissions } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { CrmBusinessProfile, CrmStaff } from "@/lib/supabase";

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

const NegocioTab = ({ profile, update }: { profile: CrmBusinessProfile | null, update: (data: Partial<CrmBusinessProfile>) => Promise<void> }) => {
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
          <EditableField label="Nombre del negocio" value={profile?.business_name || ""} onSave={val => update({ business_name: val })} />
          <EditableField label="Rubro / Industria"  value={profile?.industry || ""}      onSave={val => update({ industry: val })} />
          <EditableField label="Ciudad"              value={profile?.city || ""}          onSave={val => update({ city: val })} />
          <EditableField label="País"                value={profile?.country || ""}       onSave={val => update({ country: val })} />
          <EditableField label="Sitio web"           value={profile?.website || ""}       onSave={val => update({ website: val })} />
          <EditableField label="WhatsApp"            value={profile?.whatsapp || ""}      onSave={val => update({ whatsapp: val })} />
          <EditableField label="Instagram"           value={profile?.instagram || ""}     onSave={val => update({ instagram: val })} />
          <EditableField label="Facebook"            value={profile?.facebook || ""}      onSave={val => update({ facebook: val })} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">Descripción del negocio</p>
              {desc !== profile?.description && (
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={handleSaveDesc} disabled={savingDesc}>
                      {savingDesc ? "Guardando..." : "Guardar"}
                  </Button>
              )}
          </div>
          <textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            rows={4}
            className="w-full rounded-xl border bg-secondary/20 text-sm px-4 py-3 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Describe tu negocio..."
          />
        </div>
      </div>
    );
};

const LogoTab = ({ profile, update }: { profile: CrmBusinessProfile | null, update: (data: Partial<CrmBusinessProfile>) => Promise<void> }) => (
  <div className="bg-card border rounded-2xl p-6 space-y-5 max-w-md">
    <h2 className="text-sm font-semibold">Logo</h2>
    <div className="border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center py-16 gap-3 bg-secondary/20 hover:bg-secondary/40 hover:border-primary/30 transition-all cursor-pointer">
      {profile?.logo_url ? (
        <img src={profile.logo_url} alt="Logo" className="w-24 h-24 object-contain" />
      ) : (
        <>
            <ImageIcon size={32} className="text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Arrastra tu logo aquí o haz clic para subir</p>
            <p className="text-xs text-muted-foreground/60">PNG, SVG o JPG — máx. 2 MB</p>
        </>
      )}
    </div>
    <Button variant="outline" className="w-full h-9 rounded-xl text-sm" onClick={() => toast.info("Subida de imagenes requerirá el bucket de Storage (Pendiente)")}>
      Subir nuevo logo
    </Button>
  </div>
);

const ColoresTab = ({ profile, update }: { profile: CrmBusinessProfile | null, update: (data: Partial<CrmBusinessProfile>) => Promise<void> }) => (
  <div className="bg-card border rounded-2xl p-6 space-y-6 max-w-sm">
    <h2 className="text-sm font-semibold">Colores de marca</h2>
    <div className="space-y-5">
      <ColorField label="Color primario"   value={profile?.color_primary || "#3b82f6"}   onSave={val => update({ color_primary: val })} />
      <ColorField label="Color secundario" value={profile?.color_secondary || "#ffffff"} onSave={val => update({ color_secondary: val })} />
      <ColorField label="Color de acento"  value={profile?.color_accent || "#f59e0b"}    onSave={val => update({ color_accent: val })} />
    </div>
  </div>
);

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
        {activeTab === "negocio"   && <NegocioTab   profile={profile} update={handleUpdate} />}
        {activeTab === "logo"      && <LogoTab       profile={profile} update={handleUpdate} />}
        {activeTab === "colores"   && <ColoresTab    profile={profile} update={handleUpdate} />}
        {activeTab === "servicios" && <CrmServices   isSuperAdmin={isSuperAdmin} />}
      </div>
    </div>
  );
};

export default CrmBusiness;
