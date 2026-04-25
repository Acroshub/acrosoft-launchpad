import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Plus, Trash2, GripVertical, Pencil, X,
  Type, AlignLeft, Mail, Phone, MapPin, ChevronDown,
  Calendar, Clock, Link, ClipboardList, ArrowLeft, Settings, Briefcase,
  Hash, Upload, CheckSquare, Minus, Palette, Circle, Layers, ChevronUp,
  ExternalLink, Copy, Code, Braces, Link as LinkIcon, Eye, Loader2, List
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";
import { useForms, useCreateForm, useUpdateForm, useDeleteForm, useServices, usePipelines } from "@/hooks/useCrmData";
import type { CrmForm } from "@/lib/supabase";
import { toast } from "sonner";
import ReminderRulesEditor, { type ReminderRule } from "@/components/shared/ReminderRulesEditor";

// {VAR_DB} — campos del formulario se guardarán en Supabase por negocio

interface FormSection {
  id: string;
  name: string;
  subtitle?: string;
  isConfirmation?: boolean; // special: renders a summary of all answers, no fields
}

interface FormConfig {
  id: string;
  name: string;
  fields: FormField[];
  sections?: FormSection[];
  multiPage?: boolean;
  showConfirmationStep?: boolean; // for single-page: show summary before submit
  confirmationMessage?: string;   // optional message shown before the submit button
  submitButtonText?: string;
  successAction?: "popup" | "redirect";
  successPopupMessage?: string;
  successImageType?: "icon" | "logo";
  successRedirectUrl?: string;
  autoTags?: string[];
  facebookPixelId?: string;
  pipelineIds?: string[];
  reminderRules?: ReminderRule[];
}

type FieldType =
  | "text" | "textarea" | "email" | "phone" | "address"
  | "select" | "date" | "time" | "url" | "services"
  | "number" | "file" | "checkbox" | "heading"
  | "radio" | "color" | "schedule" | "repeatable";

type SubFieldType = "text" | "textarea" | "number" | "url" | "checkbox";

interface SubField {
  id: string;
  label: string;
  type: SubFieldType;
}

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
  subFields?: SubField[];
  maxItems?: number;
  allowedServiceIds?: string[];
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
  { value: "services",   label: "Servicios",            icon: Briefcase   },
  { value: "repeatable", label: "Grupo repetible",     icon: List        },
  { value: "heading",    label: "Título / Sección",    icon: Minus       },
  { value: "schedule",   label: "Horarios",            icon: Calendar    },
];

const defaultFields: FormField[] = [
  { id: "f-name",  label: "Nombre completo", type: "text",  required: true,  locked: true  },
  { id: "f-email", label: "Email",           type: "email", required: true,  locked: true  },
  { id: "f-phone", label: "Teléfono",        type: "phone", required: false, locked: false },
];

const typeIcon = (type: FieldType) =>
  FIELD_TYPES.find((t) => t.value === type)?.icon ?? Type;

// ─── Field row ────────────────────────────────────────────────────────────────
// ─── Services Field Config ────────────────────────────────────────────────────
const ServicesFieldConfig = ({
  allowedServiceIds,
  onChange,
}: {
  allowedServiceIds?: string[];
  onChange: (ids: string[]) => void;
}) => {
  const { data: services = [] } = useServices();
  if (services.length === 0) return (
    <p className="text-[11px] text-muted-foreground">No hay servicios creados aún. Ve a Mi Negocio → Servicios.</p>
  );
  const selected = allowedServiceIds ?? [];
  const toggle = (id: string) => {
    const next = selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id];
    onChange(next);
  };
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Servicios visibles en este campo {selected.length > 0 ? `(${selected.length} seleccionados)` : "(todos)"}
      </p>
      {services.map((svc) => (
        <label key={svc.id} className="flex items-center gap-2.5 cursor-pointer group/svc">
          <input
            type="checkbox"
            checked={selected.length === 0 || selected.includes(svc.id)}
            onChange={() => toggle(svc.id)}
            className="rounded border-input h-3.5 w-3.5 text-primary focus:ring-primary"
          />
          <span className="text-xs text-foreground group-hover/svc:text-primary transition-colors">{svc.name}</span>
          <span className="text-[10px] text-muted-foreground">${svc.price}</span>
        </label>
      ))}
      {selected.length > 0 && (
        <button onClick={() => onChange([])} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
          Mostrar todos
        </button>
      )}
    </div>
  );
};

const SUB_FIELD_TYPES: { value: SubFieldType; label: string }[] = [
  { value: "text",     label: "Texto corto" },
  { value: "textarea", label: "Texto largo" },
  { value: "number",   label: "Número" },
  { value: "url",      label: "URL" },
  { value: "checkbox", label: "Casilla" },
];

const FieldRow = ({
  field,
  onToggleRequired,
  onChangeLabel,
  onChangeType,
  onToggleMultiSelect,
  onAddOption,
  onChangeOption,
  onRemoveOption,
  onAddSubField,
  onChangeSubField,
  onRemoveSubField,
  onChangeMaxItems,
  onChangeAllowedServices,
  onChangePlaceholder,
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
  onAddSubField: () => void;
  onChangeSubField: (i: number, patch: Partial<SubField>) => void;
  onRemoveSubField: (i: number) => void;
  onChangeMaxItems: (n: number) => void;
  onChangeAllowedServices: (ids: string[]) => void;
  onChangePlaceholder: (v: string) => void;
  onDelete: () => void;
}) => {
  const Icon = typeIcon(field.type);
  const [pendingDelete, setPendingDelete] = useState(false);

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
          pendingDelete ? (
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[11px] text-destructive font-medium">¿Eliminar?</span>
              <button
                onClick={onDelete}
                className="px-2 py-1 rounded-lg bg-destructive text-destructive-foreground text-[11px] font-semibold hover:bg-destructive/90 transition-colors"
              >
                Sí
              </button>
              <button
                onClick={() => setPendingDelete(false)}
                className="px-2 py-1 rounded-lg border text-[11px] font-semibold text-muted-foreground hover:bg-secondary transition-colors"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setPendingDelete(true)}
              className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
            >
              <Trash2 size={13} />
            </button>
          )
        ) : (
          <div className="w-7 shrink-0" />
        )}
      </div>

      {/* Placeholder */}
      {!["date", "time", "heading", "file", "checkbox", "color", "services", "radio", "schedule", "repeatable"].includes(field.type) && (
        <div className="pl-11">
          <Input
            value={field.placeholder ?? ""}
            onChange={(e) => onChangePlaceholder(e.target.value)}
            placeholder="Texto de ayuda (placeholder)…"
            className="h-8 text-xs text-muted-foreground"
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

      {/* Services field config */}
      {field.type === "services" && (
        <div className="pl-11 space-y-3">
          <div className="bg-primary/5 border border-primary/15 rounded-xl px-4 py-3 space-y-3">
            <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
              <Briefcase size={12} />
              Selector de servicios
            </p>
            <ServicesFieldConfig
              allowedServiceIds={field.allowedServiceIds}
              onChange={onChangeAllowedServices}
            />
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

      {/* Schedule info */}
      {field.type === "schedule" && (
        <div className="pl-11">
          <div className="bg-primary/5 border border-primary/10 rounded-xl px-4 py-3">
            <p className="text-[11px] text-primary font-medium flex items-center gap-1.5">
              <Calendar size={12} />
              Selector de Horarios (Semanal)
            </p>
            <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
              El cliente verá una tabla interactiva para definir sus horarios de disponibilidad (ej. Lun a Vie de 9am - 6pm), igual a la que se utiliza en el Onboarding de cuenta.
            </p>
          </div>
        </div>
      )}

      {/* Repeatable group */}
      {field.type === "repeatable" && (
        <div className="pl-11 space-y-3">
          <div className="bg-primary/5 border border-primary/15 rounded-xl px-4 py-2.5 flex items-start gap-2">
            <List size={12} className="text-primary mt-0.5 shrink-0" />
            <p className="text-[11px] text-primary font-medium leading-relaxed">
              Grupo repetible — el usuario puede añadir múltiples entradas de este bloque (ej. servicios, testimonios, FAQs).
            </p>
          </div>

          {/* Max items */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Máx. entradas:</span>
            <input
              type="number"
              min={1}
              max={20}
              value={field.maxItems ?? 3}
              onChange={(e) => onChangeMaxItems(Number(e.target.value))}
              className="h-8 w-20 rounded-lg border border-input bg-background px-2 text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Sub-fields */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Campos del grupo</p>
            {(field.subFields ?? []).map((sf, i) => (
              <div key={sf.id} className="flex gap-2 items-center">
                <input
                  value={sf.label}
                  onChange={(e) => onChangeSubField(i, { label: e.target.value })}
                  placeholder={`Campo ${i + 1}`}
                  className="h-8 flex-1 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <select
                  value={sf.type}
                  onChange={(e) => onChangeSubField(i, { type: e.target.value as SubFieldType })}
                  className="h-8 rounded-lg border border-input bg-background text-xs px-2 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {SUB_FIELD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => onRemoveSubField(i)}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            <button
              onClick={onAddSubField}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus size={12} /> Añadir campo al grupo
            </button>
          </div>
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
  const [showConfirmationStep, setShowConfirmationStep] = useState(form.showConfirmationStep ?? false);
  const [confirmationMessage, setConfirmationMessage]   = useState(form.confirmationMessage ?? "");
  const [sections, setSections]   = useState<FormSection[]>(form.sections ?? [{ id: "sec-1", name: "Página 1" }]);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [deletingSectionId, setDeletingSectionId] = useState<string | null>(null);
  const [deletingFieldId, setDeletingFieldId] = useState<string | null>(null);

  const [submitButtonText, setSubmitButtonText] = useState(form.submitButtonText || "Enviar mensaje");
  const [successAction, setSuccessAction] = useState<"popup" | "redirect">(form.successAction || "popup");
  const [successPopupMessage, setSuccessPopupMessage] = useState(form.successPopupMessage || "¡Gracias! Hemos recibido tu información.");
  const [successImageType, setSuccessImageType] = useState<"icon" | "logo">(form.successImageType || "icon");
  const [successRedirectUrl, setSuccessRedirectUrl] = useState(form.successRedirectUrl || "");
  const [autoTags, setAutoTags] = useState<string[]>(form.autoTags ?? []);
  const [newAutoTag, setNewAutoTag] = useState("");
  const [facebookPixelId, setFacebookPixelId] = useState(form.facebookPixelId ?? "");
  const [pipelineIds, setPipelineIds] = useState<string[]>(form.pipelineIds ?? []);
  const [reminderRules, setReminderRules] = useState<ReminderRule[]>(form.reminderRules ?? []);
  const { data: pipelines = [] } = usePipelines();

  const update = (id: string, patch: Partial<FormField>) =>
    setFields((fs) => fs.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const serviceCallbacks = (fieldId: string) => ({
    onChangeAllowedServices: (ids: string[]) => update(fieldId, { allowedServiceIds: ids }),
  });

  const subFieldCallbacks = (fieldId: string) => ({
    onAddSubField: () =>
      update(fieldId, {
        subFields: [
          ...(fields.find(f => f.id === fieldId)?.subFields ?? []),
          { id: `sf-${Date.now()}`, label: "Nuevo campo", type: "text" as SubFieldType },
        ],
      }),
    onChangeSubField: (i: number, patch: Partial<SubField>) => {
      const sfs = [...(fields.find(f => f.id === fieldId)?.subFields ?? [])];
      sfs[i] = { ...sfs[i], ...patch };
      update(fieldId, { subFields: sfs });
    },
    onRemoveSubField: (i: number) =>
      update(fieldId, {
        subFields: (fields.find(f => f.id === fieldId)?.subFields ?? []).filter((_, idx) => idx !== i),
      }),
    onChangeMaxItems: (n: number) => update(fieldId, { maxItems: n }),
  });

  const addField = (sectionId?: string) =>
    setFields((fs) => [
      ...fs,
      { id: `f-${Date.now()}`, label: "Nuevo campo", type: "text", required: false, placeholder: "", options: [], sectionId },
    ]);

  const handleSave = async () => {
    // Validate: form must have at least 1 real field (heading doesn't count)
    if (!multiPage) {
      const realFields = fields.filter((f) => f.type !== "heading");
      if (realFields.length === 0) {
        toast.error("El formulario necesita al menos un campo real (un Título no cuenta).");
        return;
      }
    }
    if (multiPage) {
      const invalidSection = sections.find((sec) => {
        if (sec.isConfirmation) return false;
        const realFields = fields.filter((f) => f.sectionId === sec.id && f.type !== "heading");
        return realFields.length === 0;
      });
      if (invalidSection) {
        toast.error(`La página "${invalidSection.name}" necesita al menos un campo real (un Título no cuenta).`);
        return;
      }
    }
    try {
      onUpdate({ ...form, name, fields, sections: multiPage ? sections : undefined, multiPage, showConfirmationStep, confirmationMessage: confirmationMessage || undefined, submitButtonText, successAction, successPopupMessage, successImageType, successRedirectUrl, autoTags, facebookPixelId: facebookPixelId || undefined, pipelineIds, reminderRules });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // error handled in parent
    }
  };

  const addSection = () =>
    setSections(s => [...s, { id: `sec-${Date.now()}`, name: `Página ${s.length + 1}` }]);

  const renameSection = (id: string, newName: string) =>
    setSections(s => s.map(sec => sec.id === id ? { ...sec, name: newName } : sec));

  const updateSectionSubtitle = (id: string, subtitle: string) =>
    setSections(s => s.map(sec => sec.id === id ? { ...sec, subtitle } : sec));

  const removeSection = (id: string) => {
    setSections(s => s.filter(sec => sec.id !== id));
    // Remove fields that belonged to this section (don't leave orphans)
    setFields(fs => fs.filter(f => f.sectionId !== id || f.locked));
  };

  const moveSection = (id: string, dir: -1 | 1) => {
    setSections(s => {
      const idx = s.findIndex(sec => sec.id === id);
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= s.length) return s;
      const next = [...s];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  };

  return (
    <>
    <DeleteConfirmDialog
      open={!!deletingSectionId}
      onOpenChange={(o) => { if (!o) setDeletingSectionId(null); }}
      onConfirm={() => { if (deletingSectionId) { removeSection(deletingSectionId); setDeletingSectionId(null); } }}
      description="Se eliminará esta página y todos sus campos permanentemente."
    />

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
              onClick={() => {
                setMultiPage(false);
                // Strip sectionId from all fields so they all appear in flat mode
                setFields(fs => fs.map(f => ({ ...f, sectionId: undefined })));
              }}
              className={`px-4 py-2 text-xs font-semibold transition-all ${
                !multiPage ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Todo en uno
            </button>
            <button
              onClick={() => {
                setMultiPage(true);
                // Assign ALL fields without a sectionId to the first section
                // (not just locked ones — otherwise non-locked fields stay "floating"
                //  and can't be deleted when their page is removed)
                const firstSec = sections[0];
                if (firstSec) {
                  setFields(fs => fs.map(f => !f.sectionId ? { ...f, sectionId: firstSec.id } : f));
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

      {/* ─── Columns Layout ─── */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-8 items-start">
        {/* LEFT COLUMN: Fields Editor */}
        <div className="space-y-8">
          {/* Fields (flat or by sections) */}
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
                    onChangePlaceholder={(v) => update(field.id, { placeholder: v })}
                    {...subFieldCallbacks(field.id)}
                    {...serviceCallbacks(field.id)}
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
                  <div key={sec.id} className={`border rounded-2xl overflow-hidden ${sec.isConfirmation ? "border-amber-300/60 dark:border-amber-700/40 bg-amber-50/30 dark:bg-amber-950/10" : "bg-card"}`}>
                    {/* Section header */}
                    <div className={`border-b group/secheader ${sec.isConfirmation ? "bg-amber-100/40 dark:bg-amber-900/20 border-amber-200/50 dark:border-amber-800/30" : "bg-secondary/30"}`}>
                      {/* Name row */}
                      <div className="flex items-center gap-3 px-5 py-3">
                        {sec.isConfirmation
                          ? <CheckSquare size={14} className="text-amber-500 shrink-0" />
                          : <Layers size={14} className="text-primary shrink-0" />
                        }
                        <div className="flex-1 flex items-center gap-2">
                          {!sec.isConfirmation && editingSectionId === sec.id ? (
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
                              {!sec.isConfirmation && (
                                <button
                                  onClick={() => setEditingSectionId(sec.id)}
                                  className="p-1 rounded-md text-muted-foreground opacity-40 group-hover/secheader:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-all"
                                >
                                  <Pencil size={13} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                          Página {secIdx + 1}
                        </span>
                        {!sec.isConfirmation && (
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              onClick={() => moveSection(sec.id, -1)}
                              disabled={secIdx === 0}
                              className="p-1 rounded hover:bg-secondary text-muted-foreground disabled:opacity-20 transition-colors"
                              title="Mover arriba"
                            >
                              <ChevronUp size={13} />
                            </button>
                            <button
                              onClick={() => moveSection(sec.id, 1)}
                              disabled={secIdx === sections.filter(s => !s.isConfirmation).length - 1}
                              className="p-1 rounded hover:bg-secondary text-muted-foreground disabled:opacity-20 transition-colors"
                              title="Mover abajo"
                            >
                              <ChevronDown size={13} />
                            </button>
                          </div>
                        )}
                        {sectionFields.some(f => f.locked) ? (
                          <div
                            title="Esta página contiene campos obligatorios del sistema (Nombre y Correo) y no puede eliminarse."
                            className="p-1.5 rounded-lg text-muted-foreground/25 cursor-not-allowed shrink-0"
                          >
                            <Trash2 size={13} />
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingSectionId(sec.id)}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                      {/* Subtitle row — editable, only on non-confirmation sections */}
                      {!sec.isConfirmation && (
                        <div className="px-5 pb-2.5 pl-[52px]">
                          <input
                            value={sec.subtitle ?? ""}
                            onChange={(e) => updateSectionSubtitle(sec.id, e.target.value)}
                            placeholder="Descripción de la página (opcional)…"
                            className="w-full text-xs text-muted-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/30 focus:text-foreground transition-colors"
                          />
                        </div>
                      )}
                    </div>

                    {/* Confirmation page preview */}
                    {sec.isConfirmation ? (
                      <div className="p-6 space-y-3">
                        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1.5">
                          <CheckSquare size={12} /> Resumen automático de respuestas
                        </p>
                        <div className="bg-background/60 border border-amber-200/40 dark:border-amber-800/30 rounded-xl p-4 space-y-2">
                          {sections.filter(s => !s.isConfirmation).map((s) => (
                            <div key={s.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                              <span className="font-medium text-foreground">{s.name}</span>
                              <span className="text-muted-foreground/60">— {fields.filter(f => f.sectionId === s.id && f.type !== "heading").length} campo{fields.filter(f => f.sectionId === s.id && f.type !== "heading").length !== 1 ? "s" : ""}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          El usuario verá un resumen de todo lo ingresado antes de confirmar el envío. No se pueden añadir campos aquí.
                        </p>
                        <div className="space-y-1.5 pt-1">
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Mensaje antes de enviar (opcional)
                          </label>
                          <textarea
                            value={confirmationMessage}
                            onChange={(e) => setConfirmationMessage(e.target.value)}
                            rows={3}
                            placeholder="Ej: Al confirmar, nuestro equipo comenzará a trabajar en tu proyecto. Recibirás un correo de confirmación."
                            className="w-full rounded-xl border border-amber-200/60 dark:border-amber-800/40 bg-background/80 text-sm px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-amber-400/60 placeholder:text-muted-foreground/50"
                          />
                          <p className="text-[10px] text-muted-foreground">Si lo dejas vacío, no se mostrará ningún mensaje.</p>
                        </div>
                      </div>
                    ) : (
                    /* Section fields */
                    <div className="p-4 space-y-3">
                      {sectionFields.filter(f => f.type !== "heading").length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          Sin campos reales. Añade al menos uno (los títulos no cuentan).
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
                          onChangePlaceholder={(v) => update(field.id, { placeholder: v })}
                          {...subFieldCallbacks(field.id)}
                          {...serviceCallbacks(field.id)}
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
                    )}
                  </div>
                );
              })}
              <div className="flex gap-3">
                <button
                  onClick={addSection}
                  className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-primary/30 rounded-2xl py-4 text-sm text-primary font-medium hover:bg-primary/5 transition-all"
                >
                  <Plus size={15} /> Añadir sección (página)
                </button>
                {!sections.some(s => s.isConfirmation) && (
                  <button
                    onClick={() => setSections(s => [...s, { id: `sec-confirm-${Date.now()}`, name: "Confirmación", isConfirmation: true }])}
                    className="flex items-center justify-center gap-2 border-2 border-dashed border-amber-400/50 rounded-2xl py-4 px-5 text-sm text-amber-600 dark:text-amber-400 font-medium hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-all"
                  >
                    <CheckSquare size={15} /> Página de confirmación
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Acciones del formulario (Botón y Éxito) */}
          <div className="bg-card border rounded-2xl p-6 space-y-6 mt-8">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <CheckSquare size={16} className="text-primary"/> Configuración de envío
            </h2>

            {/* Submit button text */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Texto del botón enviar</label>
              <Input
                value={submitButtonText}
                onChange={e => setSubmitButtonText(e.target.value)}
                placeholder="Ej: Agendar Cita"
                className="h-10 text-sm"
              />
            </div>

            {/* Auto-tags */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Etiquetas automáticas</label>
                <p className="text-[11px] text-muted-foreground mt-0.5">Se asignarán al contacto cada vez que envíe este formulario.</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {autoTags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 text-xs border rounded-full pl-2.5 pr-1 py-0.5 bg-secondary/60 text-foreground">
                    {t}
                    <button
                      onClick={() => setAutoTags(autoTags.filter((x) => x !== t))}
                      className="rounded-full hover:bg-destructive/20 hover:text-destructive p-0.5 transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
                <div className="flex items-center gap-1">
                  <input
                    value={newAutoTag}
                    onChange={(e) => setNewAutoTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      const tag = newAutoTag.trim();
                      if (!tag || autoTags.includes(tag)) { setNewAutoTag(""); return; }
                      setAutoTags([...autoTags, tag]);
                      setNewAutoTag("");
                    }}
                    placeholder="+ nueva etiqueta"
                    className="text-xs h-7 px-2.5 rounded-full border border-dashed bg-transparent text-muted-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary w-36"
                  />
                </div>
              </div>
            </div>

            {/* Pipelines (multi-select) */}
            <div className="space-y-2 pt-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Agregar al Pipeline</label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Los nuevos contactos se añadirán a la primera columna de cada pipeline seleccionado.
                </p>
              </div>
              {pipelines.filter((p: any) => p.type === "contacts").length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No hay pipelines de contactos creados.</p>
              ) : (
                <div className="space-y-2">
                  {pipelines
                    .filter((p: any) => p.type === "contacts")
                    .map((p: any) => {
                      const checked = pipelineIds.includes(p.id);
                      return (
                        <label key={p.id} className="flex items-center gap-2.5 cursor-pointer group/pl">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setPipelineIds(checked
                                ? pipelineIds.filter((id) => id !== p.id)
                                : [...pipelineIds, p.id]
                              )
                            }
                            className="rounded border-input h-3.5 w-3.5 text-primary focus:ring-primary"
                          />
                          <span className="text-sm group-hover/pl:text-primary transition-colors">{p.name}</span>
                        </label>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Al completar el formulario */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Al completar el formulario</label>
              <div className="flex border rounded-xl overflow-hidden h-10">
                <button
                  onClick={() => setSuccessAction("popup")}
                  className={`flex-1 text-xs font-semibold transition-all ${
                    successAction === "popup" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-secondary/50"
                  }`}
                >
                  Mostrar Mensaje
                </button>
                <button
                  onClick={() => setSuccessAction("redirect")}
                  className={`flex-1 text-xs font-semibold transition-all border-l ${
                    successAction === "redirect" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-secondary/50"
                  }`}
                >
                  Redirigir a URL
                </button>
              </div>
            </div>

            <div className="bg-secondary/20 p-4 rounded-xl border border-secondary/50 space-y-5">
              {successAction === "popup" ? (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Imagen a mostrar</label>
                    <div className="flex border rounded-xl overflow-hidden h-9 w-max">
                      <button
                        onClick={() => setSuccessImageType("icon")}
                        className={`px-4 text-xs font-semibold transition-all ${
                          successImageType === "icon" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-secondary/50"
                        }`}
                      >
                        Icono (Check)
                      </button>
                      <button
                        onClick={() => setSuccessImageType("logo")}
                        className={`px-4 text-xs font-semibold transition-all border-l ${
                          successImageType === "logo" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-secondary/50"
                        }`}
                      >
                        Logo de la marca
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Mensaje principal de éxito</label>
                    <Input
                      value={successPopupMessage}
                      onChange={e => setSuccessPopupMessage(e.target.value)}
                      placeholder="¡Gracias! Hemos recibido tu solicitud."
                      className="h-10 text-sm bg-background border-input"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Este texto aparecerá en grande {successImageType === "icon" ? "debajo del icono de éxito" : "debajo de tu logotipo"} al enviar la información.
                    </p>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">URL de redirección (Thank you page)</label>
                  <Input
                    value={successRedirectUrl}
                    onChange={e => setSuccessRedirectUrl(e.target.value)}
                    placeholder="https://tudominio.com/gracias"
                    className="h-10 text-sm bg-background border-input font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">El usuario será redirigido automáticamente a este enlace al completar el formulario.</p>
                </div>
              )}
            </div>

            {/* Facebook Pixel */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-sm bg-blue-600 inline-flex items-center justify-center shrink-0">
                  <span className="text-white font-black" style={{ fontSize: 8 }}>f</span>
                </span>
                Facebook Pixel ID
              </label>
              <Input
                value={facebookPixelId}
                onChange={e => setFacebookPixelId(e.target.value)}
                placeholder="Ej: 1234567890123456"
                className="h-10 text-sm font-mono"
              />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Se dispara <strong>ViewContent</strong> al cargar el formulario y <strong>Lead</strong> al enviar el formulario.
              </p>
            </div>
          </div>


          <div className="bg-secondary/40 border rounded-2xl px-5 py-4 text-xs text-muted-foreground leading-relaxed">
            <p className="font-semibold text-foreground mb-1">¿Cómo funciona?</p>
            <p>
              Los campos que configures aquí aparecerán en el formulario público de reserva.
              Cada respuesta quedará guardada en la ficha del contacto, visible en la sección <strong>Contactos</strong>.
              Los campos <em>Nombre</em> y <em>Email</em> son fijos y siempre obligatorios.
            </p>
          </div>

          {/* ── Recordatorios ──────────────────────────────────── */}
          <div className="bg-card border rounded-2xl p-6 space-y-4 mt-4">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 text-xs">🔔</span>
                Recordatorios automáticos
              </h2>
              <p className="text-xs text-muted-foreground mt-1">Se enviarán automáticamente después de que alguien complete este formulario o agende una cita vinculada.</p>
            </div>
            <ReminderRulesEditor rules={reminderRules} onChange={setReminderRules} />
          </div>
        </div>

        {/* RIGHT COLUMN: Share Form */}
        <div className="bg-card border rounded-2xl p-5 space-y-6 sticky top-6">
           <div>
             <h3 className="text-sm font-semibold mb-1">Compartir Formulario</h3>
             <p className="text-xs text-muted-foreground">Comparte este formulario o incrústalo en tu página web.</p>
           </div>
           
           {/* Enlace directo */}
           <div className="space-y-2.5">
             <div className="flex items-center gap-2 text-sm font-medium">
               <LinkIcon size={14} className="text-primary"/> Link (directo)
             </div>
             <div className="flex gap-2">
               <Input
                 readOnly
                 value={`${window.location.origin}/f/${form.id}`}
                 className="h-8 text-[11px] bg-secondary/30 font-mono"
               />
               <Button
                 variant="secondary" size="icon" className="h-8 w-8 shrink-0"
                 onClick={() => navigator.clipboard.writeText(`${window.location.origin}/f/${form.id}`)}
               >
                 <Copy size={13}/>
               </Button>
               <Button
                 variant="outline" size="icon" className="h-8 w-8 shrink-0"
                 onClick={() => window.open(`/f/${form.id}`, "_blank")}
               >
                 <ExternalLink size={13}/>
               </Button>
             </div>
           </div>

           {/* Iframe */}
           <div className="space-y-2.5">
             <div className="flex items-center gap-2 text-sm font-medium">
               <Code size={14} className="text-orange-500"/> Iframe (HTML)
             </div>
             <div className="relative">
               <textarea
                 readOnly
                 value={`<iframe src="${window.location.origin}/f/${form.id}" width="100%" height="600px" frameborder="0" style="border:none;border-radius:12px;"></iframe>`}
                 className="w-full h-[76px] p-2.5 pr-10 text-[10px] font-mono bg-secondary/30 rounded-xl border border-border/50 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
               />
               <Button
                 variant="secondary" size="icon" className="absolute top-2 right-2 h-6 w-6"
                 onClick={() => navigator.clipboard.writeText(`<iframe src="${window.location.origin}/f/${form.id}" width="100%" height="600px" frameborder="0" style="border:none;border-radius:12px;"></iframe>`)}
               >
                 <Copy size={11}/>
               </Button>
             </div>
           </div>

           {/* Javascript */}
           <div className="space-y-2.5">
             <div className="flex items-center gap-2 text-sm font-medium">
               <Braces size={14} className="text-blue-500"/> Javascript Embed
             </div>
             <div className="relative">
               <textarea
                 readOnly
                 value={`<div id="acrosoft-form-${form.id}"></div>\n<script>\n  (function(){\n    var i=document.createElement('iframe');\n    i.src='${window.location.origin}/f/${form.id}';\n    i.width='100%';i.height='600';i.frameBorder='0';\n    i.style.borderRadius='12px';\n    document.getElementById('acrosoft-form-${form.id}').appendChild(i);\n  })();\n</script>`}
                 className="w-full h-[100px] p-2.5 pr-10 text-[10px] font-mono bg-secondary/30 rounded-xl border border-border/50 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
               />
               <Button
                 variant="secondary" size="icon" className="absolute top-2 right-2 h-6 w-6"
                 onClick={() => navigator.clipboard.writeText(`<div id="acrosoft-form-${form.id}"></div>\n<script>\n  (function(){\n    var i=document.createElement('iframe');\n    i.src='${window.location.origin}/f/${form.id}';\n    i.width='100%';i.height='600';i.frameBorder='0';\n    i.style.borderRadius='12px';\n    document.getElementById('acrosoft-form-${form.id}').appendChild(i);\n  })();\n</script>`)}
               >
                 <Copy size={11}/>
               </Button>
             </div>
           </div>
        </div>
      </div>
    </div>
    </>
  );
};

// ─── Main Component: Forms Library ─────────────────────────────────────────
const CrmForms = () => {
  const { data: rawForms = [], isLoading } = useForms();
  const createForm = useCreateForm();
  const updateForm = useUpdateForm();
  const deleteForm = useDeleteForm();

  const [view, setView] = useState<"list" | "builder">("list");
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Convert rawForms to FormConfig format
  const forms: FormConfig[] = rawForms.map(f => ({
    id: f.id,
    name: f.name,
    fields: (Array.isArray(f.fields) ? f.fields : []) as unknown as FormField[],
    sections: (Array.isArray(f.sections) ? f.sections : undefined) as unknown as FormSection[],
    multiPage: f.multi_page ?? false,
    showConfirmationStep: f.show_confirmation_step ?? false,
    confirmationMessage: f.confirmation_message ?? "",
    submitButtonText: f.submit_label ?? "Enviar",
    successAction: f.success_action ?? "popup",
    successPopupMessage: f.success_message ?? "",
    successImageType: f.success_image ?? "icon",
    successRedirectUrl: f.redirect_url ?? "",
    autoTags: (f.auto_tags as string[] | null) ?? [],
    facebookPixelId: f.facebook_pixel_id ?? "",
    pipelineIds: (f.pipeline_ids as string[] | null) ?? [],
    reminderRules: (f.reminder_rules as any[] | null) ?? [],
  }));

  const selectedForm = forms.find(f => f.id === selectedFormId);

  const handleCreateNew = async () => {
    try {
      const result = await createForm.mutateAsync({
        name: "Nuevo Formulario",
        fields: defaultFields as any,
        submit_label: "Enviar mensaje",
        success_action: "popup",
        success_message: "¡Gracias! Hemos recibido tu información.",
        success_image: "icon",
        multi_page: false,
      });
      setSelectedFormId(result.id);
      setView("builder");
    } catch {
      toast.error("Error al crear formulario");
    }
  };

  const handleEdit = (id: string) => {
    setSelectedFormId(id);
    setView("builder");
  };

  const handleDelete = (id: string) => {
    const form = forms.find((f) => f.id === id);
    setDeleteTarget({ id, name: form?.name ?? id });
    setDeleteConfirmText("");
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteForm.mutateAsync({ id: deleteTarget.id, name: deleteTarget.name });
      if (selectedFormId === deleteTarget.id) {
        setSelectedFormId(null);
        setView("list");
      }
      toast.success("Formulario eliminado");
    } catch {
      toast.error("Error al eliminar formulario");
    } finally {
      setDeleteTarget(null);
      setDeleteConfirmText("");
    }
  };

  if (view === "builder" && selectedForm) {
    return <FormBuilder form={selectedForm} onBack={() => setView("list")} onUpdate={async (updated) => {
      try {
        await updateForm.mutateAsync({
          id: updated.id,
          name: updated.name,
          fields: updated.fields as any,
          sections: updated.sections as any,
          multi_page: updated.multiPage,
          show_confirmation_step: updated.showConfirmationStep ?? false,
          confirmation_message: updated.confirmationMessage || null,
          submit_label: updated.submitButtonText ?? "Enviar",
          success_action: updated.successAction ?? "popup",
          success_message: updated.successPopupMessage ?? null,
          success_image: updated.successImageType ?? "icon",
          redirect_url: updated.successRedirectUrl ?? null,
          auto_tags: updated.autoTags ?? [],
          facebook_pixel_id: updated.facebookPixelId || null,
          pipeline_ids: updated.pipelineIds ?? [],
          reminder_rules: (updated.reminderRules ?? []) as any,
        });
        toast.success("Formulario guardado");
      } catch {
        toast.error("Error al guardar formulario");
      }
    }} />;
  }

  return (
    <>
    <DeleteConfirmDialog
      open={!!deleteTarget}
      onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteConfirmText(""); } }}
      onConfirm={handleConfirmDelete}
      isPending={deleteForm.isPending}
      description="Se eliminará el formulario y todos sus campos permanentemente."
    />

    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Formularios</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Define la información que solicitarás a tus clientes</p>
        </div>
        <Button onClick={handleCreateNew} disabled={createForm.isPending} className="h-9 rounded-xl text-sm font-medium px-4 gap-2">
          {createForm.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={16} />} Crear nuevo
        </Button>
      </div>

      <div className="grid gap-4">
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : forms.length === 0 ? (
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
                   <p className="text-xs text-muted-foreground">{form.fields.filter(f => f.type !== "heading").length} campos configurados</p>
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
    </>
  );
};

export default CrmForms;
