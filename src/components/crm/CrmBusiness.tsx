import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, User, Building2, Image as ImageIcon, Palette, Briefcase, Check } from "lucide-react";
import CrmServices from "./CrmServices";

type Tab = "personal" | "negocio" | "logo" | "colores" | "servicios";

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "personal",  label: "Información Personal", icon: User       },
  { id: "negocio",   label: "Negocio",               icon: Building2  },
  { id: "logo",      label: "Logo",                  icon: ImageIcon  },
  { id: "colores",   label: "Colores",               icon: Palette    },
  { id: "servicios", label: "Servicios",             icon: Briefcase  },
];

// ─── Editable field ──────────────────────────────────────────────────────────
const EditableField = ({ label, value }: { label: string; value: string }) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal]         = useState(value);

  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium mb-1">{label}</p>
      {editing ? (
        <div className="flex items-center gap-2">
          <Input
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setEditing(false); }}
            autoFocus
            className="h-8 text-sm flex-1"
          />
          <button
            onClick={() => setEditing(false)}
            className="p-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Check size={13} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 group">
          <p className="text-sm font-medium">{val}</p>
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
const ColorField = ({ label, value }: { label: string; value: string }) => {
  const [val, setVal] = useState(value);
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium mb-1.5">{label}</p>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="w-10 h-10 rounded-xl border cursor-pointer bg-transparent p-0.5"
        />
        <span className="text-sm font-mono text-muted-foreground">{val}</span>
      </div>
    </div>
  );
};

// ─── Tabs ────────────────────────────────────────────────────────────────────
const PersonalTab = () => (
  <div className="bg-card border rounded-2xl p-6 space-y-6 max-w-xl">
    <h2 className="text-sm font-semibold">Información Personal</h2>
    <div className="grid sm:grid-cols-2 gap-5">
      <EditableField label="Nombre"          value="{VAR_DB}" />
      <EditableField label="Apellido"         value="{VAR_DB}" />
      <EditableField label="Email de contacto" value="{VAR_DB}" />
      <EditableField label="Teléfono"         value="{VAR_DB}" />
      <EditableField label="Rol / Cargo"      value="{VAR_DB}" />
    </div>
  </div>
);

const NegocioTab = () => (
  <div className="bg-card border rounded-2xl p-6 space-y-6 max-w-xl">
    <h2 className="text-sm font-semibold">Información del Negocio</h2>
    <div className="grid sm:grid-cols-2 gap-5">
      <EditableField label="Nombre del negocio" value="{VAR_DB}" />
      <EditableField label="Rubro / Industria"  value="{VAR_DB}" />
      <EditableField label="Ciudad"              value="{VAR_DB}" />
      <EditableField label="País"                value="{VAR_DB}" />
      <EditableField label="Sitio web"           value="{VAR_DB}" />
      <EditableField label="WhatsApp"            value="{VAR_DB}" />
      <EditableField label="Instagram"           value="{VAR_DB}" />
      <EditableField label="Facebook"            value="{VAR_DB}" />
    </div>
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium mb-1.5">Descripción del negocio</p>
      <textarea
        defaultValue="{VAR_DB}"
        rows={4}
        className="w-full rounded-xl border bg-secondary/20 text-sm px-4 py-3 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
        placeholder="Describe tu negocio..."
      />
    </div>
  </div>
);

const LogoTab = () => (
  <div className="bg-card border rounded-2xl p-6 space-y-5 max-w-md">
    <h2 className="text-sm font-semibold">Logo</h2>
    {/* {VAR_DB} — URL del logo en Supabase Storage */}
    <div className="border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center py-16 gap-3 bg-secondary/20 hover:bg-secondary/40 hover:border-primary/30 transition-all cursor-pointer">
      <ImageIcon size={32} className="text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">Arrastra tu logo aquí o haz clic para subir</p>
      <p className="text-xs text-muted-foreground/60">PNG, SVG o JPG — máx. 2 MB</p>
    </div>
    <Button variant="outline" className="w-full h-9 rounded-xl text-sm">
      Subir nuevo logo
    </Button>
  </div>
);

const ColoresTab = () => (
  <div className="bg-card border rounded-2xl p-6 space-y-6 max-w-sm">
    <h2 className="text-sm font-semibold">Colores de marca</h2>
    {/* {VAR_DB} — colores guardados en Supabase */}
    <div className="space-y-5">
      <ColorField label="Color primario"   value="{VAR_DB}" />
      <ColorField label="Color secundario" value="{VAR_DB}" />
      <ColorField label="Color de acento"  value="{VAR_DB}" />
    </div>
    <Button className="w-full h-9 rounded-xl text-sm">Guardar colores</Button>
  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
const CrmBusiness = () => {
  const [tab, setTab] = useState<Tab>("personal");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Mi Negocio</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gestiona la información de tu negocio y perfil</p>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 p-1 bg-card border rounded-2xl w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              tab === id
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
        {tab === "personal"  && <PersonalTab />}
        {tab === "negocio"   && <NegocioTab />}
        {tab === "logo"      && <LogoTab />}
        {tab === "colores"   && <ColoresTab />}
        {tab === "servicios" && <CrmServices />}
      </div>
    </div>
  );
};

export default CrmBusiness;
