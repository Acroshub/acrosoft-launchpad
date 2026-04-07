import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Plus, Trash2, GripVertical, Pencil,
  Type, AlignLeft, Mail, Phone, MapPin, ChevronDown,
  Calendar, Clock, Link, ClipboardList, ArrowLeft, Settings, Briefcase,
  Hash, Upload, CheckSquare, Minus, Palette, Circle, Layers
} from "lucide-react";

// {VAR_DB} — campos del formulario se guardarán en Supabase por negocio

interface FormSection {
  id: string;
  name: string;
}

interface FormConfig {
  id: string;
  name: string;
  fields: FormField[];
  sections?: FormSection[];
  multiPage?: boolean;
}

type FieldType =
  | "text" | "textarea" | "email" | "phone" | "address"
  | "select" | "date" | "time" | "url" | "services"
  | "number" | "file" | "checkbox" | "heading"
  | "radio" | "color";

interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  options?: string[];
  multiSelect?: boolean;
  locked?: boolean;
  sectionId?: string;
}

const FIELD_TYPES: { value: FieldType; label: string; icon: React.ElementType }[] = [
  { value: "text",     label: "Texto corto",          icon: Type        },
  { value: "textarea", label: "Texto largo",          icon: AlignLeft   },
  { value: "number",   label: "Número",               icon: Hash        },
  { value: "email",    label: "Email",                icon: Mail        },
  { value: "phone",    label: "Teléfono",             icon: Phone       },
  { value: "address",  label: "Dirección",            icon: MapPin      },
  { value: "select",   label: "Desplegable",          icon: ChevronDown },
  { value: "radio",    label: "Selección visual",     icon: Circle      },
  { value: "checkbox", label: "Casilla de selección", icon: CheckSquare },
  { value: "color",    label: "Selector de color",    icon: Palette     },
  { value: "date",     label: "Fecha",                icon: Calendar    },
  { value: "time",     label: "Hora",                 icon: Clock       },
  { value: "url",      label: "Enlace / URL",         icon: Link        },
  { value: "file",     label: "Subir archivo",        icon: Upload      },
  { value: "services", label: "Servicios",            icon: Briefcase   },
  { value: "heading",  label: "Título / Sección",     icon: Minus       },
];

const defaultFields: FormField[] = [
  { id: "f-name",  label: "Nombre completo", type: "text",  required: true,  locked: true  },
  { id: "f-email", label: "Email",           type: "email", required: true,  locked: true  },
  { id: "f-phone", label: "Teléfono",        type: "phone", required: false, locked: false },
];

const typeIcon = (type: FieldType) =>
  FIELD_TYPES.find((t) => t.value === type)?.icon ?? Type;

// ─── Field row ────────────────────────────────────────────────────────────────
const FieldRow = ({
  field,
  onToggleRequired,
  onChangeLabel,
  onChangeType,
  onToggleMultiSelect,
  onAddOption,
  onChangeOption,
  onRemoveOption,
  onDelete,
}: {
  field: FormField;
  onToggleRequired: () => void;
  onChangeLabel: (v: string) => void;
  onChangeType: (v: FieldType) => void;
  onToggleMultiSelect: () => void;
  onAddOption: () => void;
  onChangeOption: (i: number, v: string) => void;
  onRemoveOption: (i: number) => void;
  onDelete: () => void;
}) => {
  const Icon = typeIcon(field.type);

  return (
    <div className="bg-card border rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <GripVertical size={14} className="text-muted-foreground/30 shrink-0 cursor-grab" />

        {/* Type icon */}
        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
          <Icon size={13} className="text-muted-foreground" />
        </div>

        {/* Label */}
        <Input
          value={field.label}
          onChange={(e) => onChangeLabel(e.target.value)}
          className="h-9 text-sm flex-1 min-w-[140px]"
          placeholder="Nombre del campo"
        />

        {/* Type selector */}
        <div className="relative shrink-0">
          <select
            value={field.type}
            onChange={(e) => onChangeType(e.target.value as FieldType)}
            disabled={field.locked}
            className={`h-9 rounded-lg border bg-background text-xs pl-3 pr-8 appearance-none focus:outline-none focus:ring-1 focus:ring-primary ${field.locked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            {FIELD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>

        {/* Required toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <Switch
            checked={field.required}
            onCheckedChange={onToggleRequired}
            id={`req-${field.id}`}
            disabled={field.locked}
          />
          <label
            htmlFor={`req-${field.id}`}
            className={`text-xs font-medium select-none ${field.locked ? "text-muted-foreground/40 cursor-not-allowed" : field.required ? "text-foreground cursor-pointer" : "text-muted-foreground cursor-pointer"}`}
          >
            {field.required ? "Obligatorio" : "Opcional"}
          </label>
        </div>

        {/* Delete */}
        {!field.locked ? (
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
          >
            <Trash2 size={13} />
          </button>
        ) : (
          <div className="w-7 shrink-0" />
        )}
      </div>

      {/* Placeholder */}
      {!["date", "time", "heading", "file", "checkbox", "color", "services", "radio"].includes(field.type) && (
        <div className="pl-11">
          <Input
            value={field.placeholder ?? ""}
            onChange={() => {/* {VAR_DB} */}}
            placeholder="Texto de ayuda (placeholder)…"
            className="h-8 text-xs text-muted-foreground"
            readOnly
          />
        </div>
      )}

      {/* Select options + multi-select toggle */}
      {field.type === "select" && (
        <div className="pl-11 space-y-3">
          {/* Multi-select toggle */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Selección:</span>
            <div className="flex border rounded-lg overflow-hidden text-xs">
              <button
                onClick={() => field.multiSelect && onToggleMultiSelect()}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  !field.multiSelect
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Una opción
              </button>
              <button
                onClick={() => !field.multiSelect && onToggleMultiSelect()}
                className={`px-3 py-1.5 font-medium transition-colors border-l ${
                  field.multiSelect
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Varias opciones
              </button>
            </div>
          </div>

          {/* Options list */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Opciones</p>
            {(field.options ?? []).map((opt, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={opt}
                  onChange={(e) => onChangeOption(i, e.target.value)}
                  className="h-8 text-xs flex-1"
                  placeholder={`Opción ${i + 1}`}
                />
                <button
                  onClick={() => onRemoveOption(i)}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            <button
              onClick={onAddOption}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus size={12} /> Añadir opción
            </button>
          </div>
        </div>
      )}

      {/* Radio options */}
      {field.type === "radio" && (
        <div className="pl-11 space-y-3">
          <div className="bg-primary/5 border border-primary/15 rounded-xl px-4 py-2.5">
            <p className="text-[11px] text-primary font-medium flex items-center gap-1.5">
              <Circle size={11} />
              Se mostrarán como tarjetas visuales seleccionables (tipo cards)
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Opciones</p>
            {(field.options ?? []).map((opt, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={opt}
                  onChange={(e) => onChangeOption(i, e.target.value)}
                  className="h-8 text-xs flex-1"
                  placeholder={`Opción ${i + 1}`}
                />
                <button
                  onClick={() => onRemoveOption(i)}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            <button
              onClick={onAddOption}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus size={12} /> Añadir opción
            </button>
          </div>
        </div>
      )}

      {/* Color picker info */}
      {field.type === "color" && (
        <div className="pl-11">
          <div className="bg-gradient-to-r from-pink-50 to-violet-50 dark:from-pink-950/20 dark:to-violet-950/20 border border-pink-200/40 dark:border-pink-800/30 rounded-xl px-4 py-3">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              El cliente podrá seleccionar un color usando un selector visual. Útil para branding, preferencias, etc.
            </p>
          </div>
        </div>
      )}

      {/* Services field info */}
      {field.type === "services" && (
        <div className="pl-11 space-y-2">
          <div className="bg-primary/5 border border-primary/15 rounded-xl px-4 py-3 space-y-2">
            <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
              <Briefcase size={12} />
              Selector de servicios
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Este campo mostrará automáticamente todos los servicios que hayas creado en la sección <strong>Servicios</strong> del CRM.
              El cliente podrá seleccionar uno o varios servicios al completar el formulario.
            </p>
          </div>
        </div>
      )}

      {/* File upload info */}
      {field.type === "file" && (
        <div className="pl-11 space-y-2">
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 rounded-xl px-4 py-3 space-y-2">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <Upload size={12} />
              Carga de archivos
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              El cliente podrá subir imágenes, documentos o videos. Formatos aceptados: JPG, PNG, PDF, MP4.
            </p>
          </div>
        </div>
      )}

      {/* Heading info */}
      {field.type === "heading" && (
        <div className="pl-11">
          <p className="text-[11px] text-muted-foreground">
            Este campo se mostrará como un título de sección para organizar visualmente el formulario.
          </p>
        </div>
      )}
    </div>
  );
};

// ─── Form Builder ───────────────────────────────────────────────────────────
const FormBuilder = ({ form, onBack, onUpdate }: { form: FormConfig, onBack: () => void, onUpdate: (f: FormConfig) => void }) => {
  const [fields, setFields]       = useState<FormField[]>(form.fields);
  const [name, setName]           = useState(form.name);
  const [editingName, setEditingName] = useState(false);
  const [saved, setSaved]         = useState(false);
  const [multiPage, setMultiPage] = useState(form.multiPage ?? false);
  const [sections, setSections]   = useState<FormSection[]>(form.sections ?? [{ id: "sec-1", name: "Página 1" }]);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);

  const update = (id: string, patch: Partial<FormField>) =>
    setFields((fs) => fs.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const addField = (sectionId?: string) =>
    setFields((fs) => [
      ...fs,
      { id: `f-${Date.now()}`, label: "Nuevo campo", type: "text", required: false, placeholder: "", options: [], sectionId },
    ]);

  const handleSave = () => {
    // {VAR_DB} — guardar en Supabase
    onUpdate({ ...form, name, fields, sections: multiPage ? sections : undefined, multiPage });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addSection = () =>
    setSections(s => [...s, { id: `sec-${Date.now()}`, name: `Página ${s.length + 1}` }]);

  const renameSection = (id: string, newName: string) =>
    setSections(s => s.map(sec => sec.id === id ? { ...sec, name: newName } : sec));

  const removeSection = (id: string) => {
    setSections(s => s.filter(sec => sec.id !== id));
    setFields(fs => fs.map(f => f.sectionId === id ? { ...f, sectionId: undefined } : f));
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button 
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-3 transition-colors"
          >
            <ArrowLeft size={12} />
            Volver a formularios
          </button>
          <div className="flex items-center gap-2 mt-1 mb-1">
            {editingName ? (
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setEditingName(false)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setEditingName(false); }}
                autoFocus
                className="text-lg font-semibold h-10 max-w-sm"
                placeholder="Nombre del formulario…"
              />
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold">{name}</h1>
                <button
                  onClick={() => setEditingName(true)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                >
                  <Pencil size={13} />
                </button>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Define qué información se solicita al usar este formulario
          </p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          {/* Multi-page toggle */}
          <div className="flex border rounded-xl overflow-hidden bg-card">
            <button
              onClick={() => setMultiPage(false)}
              className={`px-4 py-2 text-xs font-semibold transition-all ${
                !multiPage ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Todo en uno
            </button>
            <button
              onClick={() => {
                setMultiPage(true);
                // Auto-assign locked fields to first section
                const firstSec = sections[0];
                if (firstSec) {
                  setFields(fs => fs.map(f => f.locked ? { ...f, sectionId: firstSec.id } : f));
                }
              }}
              className={`px-4 py-2 text-xs font-semibold transition-all ${
                multiPage ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Por páginas
            </button>
          </div>
          <Button onClick={handleSave} className="h-9 rounded-xl text-sm font-medium px-5">
            {saved ? "Guardado ✓" : "Guardar cambios"}
          </Button>
        </div>
      </div>

      {/* ─── Fields (flat or by sections) ─── */}
      {!multiPage ? (
        <>
          <div className="space-y-3">
            {fields.map((field) => (
              <FieldRow
                key={field.id}
                field={field}
                onToggleRequired={() => update(field.id, { required: !field.required })}
                onChangeLabel={(v) => update(field.id, { label: v })}
                onChangeType={(v) =>
                  update(field.id, {
                    type: v,
                    options: (v === "select" || v === "radio") ? (field.options?.length ? field.options : ["", ""]) : field.options,
                    multiSelect: v === "select" ? (field.multiSelect ?? false) : undefined,
                  })
                }
                onToggleMultiSelect={() => update(field.id, { multiSelect: !field.multiSelect })}
                onAddOption={() => update(field.id, { options: [...(field.options ?? []), ""] })}
                onChangeOption={(i, v) => {
                  const opts = [...(field.options ?? [])];
                  opts[i] = v;
                  update(field.id, { options: opts });
                }}
                onRemoveOption={(i) =>
                  update(field.id, { options: (field.options ?? []).filter((_, idx) => idx !== i) })
                }
                onDelete={() => setFields((fs) => fs.filter((f) => f.id !== field.id))}
              />
            ))}
          </div>
          <button
            onClick={() => addField()}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-2xl py-4 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all"
          >
            <Plus size={15} />
            Añadir campo
          </button>
        </>
      ) : (
        <div className="space-y-6">
          {sections.map((sec, secIdx) => {
            const sectionFields = fields.filter(f => f.sectionId === sec.id);
            return (
              <div key={sec.id} className="bg-card border rounded-2xl overflow-hidden">
                {/* Section header */}
                <div className="flex items-center gap-3 px-5 py-3 bg-secondary/30 border-b group/secheader">
                  <Layers size={14} className="text-primary shrink-0" />
                  <div className="flex-1 flex items-center gap-2">
                    {editingSectionId === sec.id ? (
                      <Input
                        value={sec.name}
                        onChange={(e) => renameSection(sec.id, e.target.value)}
                        onBlur={() => setEditingSectionId(null)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setEditingSectionId(null); }}
                        autoFocus
                        className="h-8 text-sm font-semibold border-none bg-background px-2 -ml-2 focus-visible:ring-1 max-w-[250px]"
                        placeholder="Nombre de la sección"
                      />
                    ) : (
                      <>
                        <h2 className="text-sm font-semibold text-foreground leading-8">
                          {sec.name || "Sin título"}
                        </h2>
                        <button
                          onClick={() => setEditingSectionId(sec.id)}
                          className="p-1 rounded-md text-muted-foreground opacity-40 group-hover/secheader:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-all"
                        >
                          <Pencil size={13} />
                        </button>
                      </>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                    Página {secIdx + 1}
                  </span>
                  {sections.length > 1 && (
                    <button
                      onClick={() => removeSection(sec.id)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
                {/* Section fields */}
                <div className="p-4 space-y-3">
                  {sectionFields.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Sin campos. Añade uno abajo.
                    </p>
                  )}
                  {sectionFields.map((field) => (
                    <FieldRow
                      key={field.id}
                      field={field}
                      onToggleRequired={() => update(field.id, { required: !field.required })}
                      onChangeLabel={(v) => update(field.id, { label: v })}
                      onChangeType={(v) =>
                        update(field.id, {
                          type: v,
                          options: (v === "select" || v === "radio") ? (field.options?.length ? field.options : ["", ""]) : field.options,
                          multiSelect: v === "select" ? (field.multiSelect ?? false) : undefined,
                        })
                      }
                      onToggleMultiSelect={() => update(field.id, { multiSelect: !field.multiSelect })}
                      onAddOption={() => update(field.id, { options: [...(field.options ?? []), ""] })}
                      onChangeOption={(i, v) => {
                        const opts = [...(field.options ?? [])];
                        opts[i] = v;
                        update(field.id, { options: opts });
                      }}
                      onRemoveOption={(i) =>
                        update(field.id, { options: (field.options ?? []).filter((_, idx) => idx !== i) })
                      }
                      onDelete={() => setFields((fs) => fs.filter((f) => f.id !== field.id))}
                    />
                  ))}
                  <button
                    onClick={() => addField(sec.id)}
                    className="w-full flex items-center justify-center gap-2 border border-dashed border-border rounded-xl py-2.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all"
                  >
                    <Plus size={13} /> Añadir campo a esta sección
                  </button>
                </div>
              </div>
            );
          })}
          <button
            onClick={addSection}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-primary/30 rounded-2xl py-4 text-sm text-primary font-medium hover:bg-primary/5 transition-all"
          >
            <Plus size={15} /> Añadir sección (página)
          </button>
        </div>
      )}

      <div className="bg-secondary/40 border rounded-2xl px-5 py-4 text-xs text-muted-foreground leading-relaxed">
        <p className="font-semibold text-foreground mb-1">¿Cómo funciona?</p>
        <p>
          Los campos que configures aquí aparecerán en el formulario público de reserva.
          Cada respuesta quedará guardada en la ficha del contacto, visible en la sección <strong>Contactos</strong>.
          Los campos <em>Nombre</em> y <em>Email</em> son fijos y siempre obligatorios.
        </p>
      </div>
    </div>
  );
};

// ─── Main Component: Forms Library ─────────────────────────────────────────

// {VAR_DB} — formularios reales vendrán de Supabase
const dummyForms: FormConfig[] = [
  { id: "f-1", name: "{VAR_DB}", fields: defaultFields },
  { id: "f-2", name: "{VAR_DB}", fields: defaultFields },
];

const CrmForms = () => {
  const [view, setView] = useState<"list" | "builder">("list");
  const [forms, setForms] = useState<FormConfig[]>(dummyForms);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);

  const selectedForm = forms.find(f => f.id === selectedFormId);

  const handleCreateNew = () => {
    const newForm = { 
      id: `form-${Date.now()}`, 
      name: "{VAR_DB}",
      fields: defaultFields 
    };
    setForms([...forms, newForm]);
    setSelectedFormId(newForm.id);
    setView("builder");
  };

  const handleEdit = (id: string) => {
    setSelectedFormId(id);
    setView("builder");
  };

  const handleDelete = (id: string) => {
    setForms(forms.filter(f => f.id !== id));
  };


  if (view === "builder" && selectedForm) {
    return <FormBuilder form={selectedForm} onBack={() => setView("list")} onUpdate={(updated) => {
       setForms(forms.map(f => f.id === updated.id ? updated : f));
    }} />;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Formularios</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Define la información que solicitarás a tus clientes</p>
        </div>
        <Button onClick={handleCreateNew} className="h-9 rounded-xl text-sm font-medium px-4 gap-2">
          <Plus size={16} /> Crear nuevo
        </Button>
      </div>

      <div className="grid gap-4">
        {forms.length === 0 ? (
           <div className="text-center py-12 bg-card border rounded-2xl">
             <ClipboardList size={32} className="mx-auto text-muted-foreground/30 mb-3" />
             <p className="text-sm font-medium">No hay formularios creados.</p>
           </div>
        ) : (
          forms.map(form => (
            <div key={form.id} className="bg-card border rounded-2xl p-5 flex items-center justify-between group">
               <div 
                 className="flex items-center gap-4 cursor-pointer flex-1" 
                 onClick={() => handleEdit(form.id)}
               >
                 <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <ClipboardList size={18} className="text-primary" />
                 </div>
                 <div>
                   <p className="text-sm font-semibold group-hover:text-primary transition-colors">{form.name}</p>
                   <p className="text-xs text-muted-foreground">{form.fields.length} campos configurados</p>
                 </div>
               </div>
               <div className="flex items-center gap-2">
                 <Button 
                   variant="ghost" 
                   size="icon" 
                   className="text-muted-foreground hover:text-foreground hover:bg-secondary" 
                   onClick={() => handleEdit(form.id)}
                 >
                   <Settings size={15} />
                 </Button>
                 <Button 
                   variant="ghost" 
                   size="icon" 
                   className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive" 
                   onClick={() => handleDelete(form.id)}
                 >
                   <Trash2 size={14} />
                 </Button>
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CrmForms;
