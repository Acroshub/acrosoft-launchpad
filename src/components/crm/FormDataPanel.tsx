import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, Pencil, Plus, Loader2, ExternalLink } from "lucide-react";
import type { CrmContact, CrmForm } from "@/lib/supabase";
import WeeklySchedulePicker, {
  DEFAULT_WEEKLY_SCHEDULE,
  SCHEDULE_DAYS,
  type WeeklySchedule,
} from "@/components/shared/WeeklySchedulePicker";

// ─── Tipos ───────────────────────────────────────────────────────────────────
// Los formularios guardan sus campos como JSON (crm_forms.fields / sections). Estas son las propiedades que este panel necesita.
type FormFieldDef = {
  id: string;
  label: string;
  type: string;
  placeholder?: string;
  options?: string[];
  sectionId?: string;
  subFields?: { id: string; label: string; type: string }[];
  /** Campo condicional (ver FormRenderer): solo aplica si el campo `fieldId` vale alguno de `equals`. */
  showIf?: { fieldId: string; equals: string[] };
};
type FormSectionDef = { id: string; name: string; isConfirmation?: boolean };
export type FormValues = Record<string, unknown>;
export type AllFormValues = Record<string, FormValues>;

const fieldsOf = (form: CrmForm) => (form.fields as unknown as FormFieldDef[]) ?? [];
const sectionsOf = (form: CrmForm) =>
  ((form.sections as unknown as FormSectionDef[]) ?? []).filter((s) => !s.isConfirmation);

const isEmpty = (v: unknown): boolean =>
  v === undefined || v === null || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.length === 0);

/** Un repetible vacío es el estado inicial [{}]: cuenta como sin respuesta. */
const repeatableItems = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v)
    ? (v as Record<string, unknown>[]).filter((it) => it && Object.values(it).some((x) => !isEmpty(x)))
    : [];

/** Campo condicional cuya condición no se cumple con las respuestas dadas (ej. el link de Facebook cuando respondió «No»). */
const isNotApplicable = (f: FormFieldDef, values: FormValues): boolean =>
  !!f.showIf && !(f.showIf.equals ?? []).includes(values[f.showIf.fieldId] as string);

// ─── Valor de una respuesta (solo lectura) ────────────────────────────────────
const NoAnswer = ({ text = "Sin respuesta" }: { text?: string }) => (
  <span className="text-xs italic text-muted-foreground/50">{text}</span>
);

const isLink = (s: string) => /^(https?:\/\/|www\.)/i.test(s.trim());
const hrefOf = (s: string) => (/^https?:\/\//i.test(s.trim()) ? s.trim() : `https://${s.trim()}`);

const ScheduleAnswer = ({ value }: { value: WeeklySchedule }) => (
  <div className="mt-0.5 divide-y rounded-lg border bg-background">
    {SCHEDULE_DAYS.map((day) => {
      const d = value[day];
      const open = !!d?.open && d.slots?.length > 0;
      return (
        <div key={day} className="flex items-baseline gap-3 px-2.5 py-1 text-xs">
          <span className={`w-8 shrink-0 font-semibold ${open ? "text-primary" : "text-muted-foreground/60"}`}>{day}</span>
          {open ? (
            <span>{d.slots.map((s) => `${s.from} – ${s.to}`).join("  ·  ")}</span>
          ) : (
            <span className="italic text-muted-foreground/50">Cerrado</span>
          )}
        </div>
      );
    })}
  </div>
);

const AnswerValue = ({
  field,
  value,
  serviceNames,
}: {
  field: FormFieldDef;
  value: unknown;
  serviceNames: Record<string, string>;
}) => {
  if (field.type === "repeatable") {
    const items = repeatableItems(value);
    if (items.length === 0) return <NoAnswer />;
    const subs = field.subFields ?? [];
    return (
      <ol className="mt-0.5 space-y-1">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-xs">
            <span className="w-5 shrink-0 font-semibold text-muted-foreground">#{i + 1}</span>
            <span className="min-w-0 break-words">
              {subs.length > 0
                ? subs.map((sf) => (isEmpty(it[sf.id]) ? null : (subs.length > 1 ? `${sf.label}: ` : "") + String(it[sf.id]))).filter(Boolean).join(" · ")
                : Object.values(it).filter((x) => !isEmpty(x)).join(" · ")}
            </span>
          </li>
        ))}
      </ol>
    );
  }

  if (isEmpty(value)) return <NoAnswer />;

  if (field.type === "schedule" && value && typeof value === "object") {
    return <ScheduleAnswer value={value as WeeklySchedule} />;
  }
  if (field.type === "checkbox") return <span className="text-xs">{value ? "Sí" : "No"}</span>;
  if (field.type === "color") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs">
        <span className="h-3.5 w-3.5 rounded border" style={{ backgroundColor: String(value) }} />
        {String(value)}
      </span>
    );
  }
  if (field.type === "services") return <span className="text-xs">{serviceNames[String(value)] ?? String(value)}</span>;
  if (field.type === "file") {
    const urls = (Array.isArray(value) ? value : [value]).map(String).filter(Boolean);
    return (
      <div className="mt-0.5 space-y-0.5">
        {urls.map((u, i) => (
          <a key={i} href={u} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 break-all text-xs text-primary hover:underline">
            <ExternalLink size={10} className="shrink-0" /> {decodeURIComponent(u.split("/").pop() ?? u).replace(/^\d+-/, "")}
          </a>
        ))}
      </div>
    );
  }
  if (Array.isArray(value)) return <span className="text-xs">{value.map(String).join(", ")}</span>;
  if (typeof value === "object") return <span className="break-all text-xs">{JSON.stringify(value)}</span>;

  const text = String(value);
  if (isLink(text)) {
    return (
      <a href={hrefOf(text)} target="_blank" rel="noopener noreferrer" className="break-all text-xs text-primary hover:underline">
        {text}
      </a>
    );
  }
  return <span className="whitespace-pre-wrap break-words text-xs">{text}</span>;
};

// ─── Todas las respuestas de un formulario ────────────────────────────────────
/**
 * Muestra TODOS los campos del formulario, agrupados por sección, hayan sido llenados o no: lo vacío sale como «Sin respuesta»
 * y un campo condicional que no aplica (ej. el link cuando respondió «No») como «No aplica».
 */
export const FormAnswers = ({
  form,
  values,
  serviceNames = {},
}: {
  form: CrmForm;
  values: FormValues;
  serviceNames?: Record<string, string>;
}) => {
  const fields = fieldsOf(form);
  const sections = sectionsOf(form);
  // Sin secciones (formulario de una sola página) o campos sueltos: un grupo sin título.
  const groups: { id: string; name?: string; fields: FormFieldDef[] }[] = [
    { id: "__none__", fields: fields.filter((f) => !f.sectionId || !sections.some((s) => s.id === f.sectionId)) },
    ...sections.map((s) => ({ id: s.id, name: s.name, fields: fields.filter((f) => f.sectionId === s.id) })),
  ].filter((g) => g.fields.length > 0);

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.id} className="space-y-2.5">
          {g.name && (
            <p className="border-b pb-1 text-[10px] font-bold uppercase tracking-widest text-primary">{g.name}</p>
          )}
          {g.fields.map((f) =>
            f.type === "heading" ? (
              <p key={f.id} className="pt-1 text-xs font-bold text-foreground">{f.label}</p>
            ) : (
              <div key={f.id}>
                <span className="block text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60">{f.label}</span>
                {isNotApplicable(f, values) ? (
                  <NoAnswer text="No aplica" />
                ) : (
                  <AnswerValue field={f} value={values[f.id]} serviceNames={serviceNames} />
                )}
              </div>
            ),
          )}
        </div>
      ))}
    </div>
  );
};

// ─── Edición ─────────────────────────────────────────────────────────────────
const TEXT_TYPES = ["text", "email", "phone", "number", "url", "textarea", "address", "date", "time"];
/** Tipos que se pueden editar aquí. Repetibles, archivos, servicios y color se muestran pero no se editan (y se conservan al guardar). */
const isEditable = (f: FormFieldDef) =>
  TEXT_TYPES.includes(f.type) || ["select", "radio", "checkbox", "schedule"].includes(f.type);

/** Lo que se guarda: los valores previos + lo editado. Nunca reemplaza el formulario entero (borraría lo que aquí no se edita). */
export const mergeFormValues = (all: AllFormValues, formId: string, edited: FormValues): AllFormValues => ({
  ...all,
  [formId]: { ...(all[formId] ?? {}), ...edited },
});

const selectCls =
  "flex h-8 w-full rounded-md border border-input bg-background px-2 text-base md:text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

// ─── Panel ───────────────────────────────────────────────────────────────────
const FormDataPanel = ({
  contact,
  forms,
  onSave,
  canEdit = true,
  serviceNames = {},
}: {
  contact: CrmContact;
  forms: CrmForm[];
  onSave: (customFields: AllFormValues) => Promise<void>;
  canEdit?: boolean;
  /** id de servicio → nombre, para los formularios con campo «servicios». */
  serviceNames?: Record<string, string>;
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<FormValues>({});
  const [saving, setSaving] = useState(false);
  const [showAddPicker, setShowAddPicker] = useState(false);

  const getAll = (): AllFormValues => (contact.custom_fields as unknown as AllFormValues) ?? {};
  const getFormValues = (formId: string): FormValues => getAll()[formId] ?? {};

  const hasData = (form: CrmForm) => {
    const vals = getFormValues(form.id);
    return fieldsOf(form).some((f) => {
      const v = vals[f.id];
      return f.type === "repeatable" ? repeatableItems(v).length > 0 : !isEmpty(v);
    });
  };

  const startEdit = (form: CrmForm) => {
    const current = getFormValues(form.id);
    const initial: FormValues = {};
    fieldsOf(form).filter(isEditable).forEach((f) => {
      initial[f.id] =
        f.type === "schedule" ? (current[f.id] ?? DEFAULT_WEEKLY_SCHEDULE)
        : f.type === "checkbox" ? !!current[f.id]
        : (current[f.id] ?? "");
    });
    setEditValues(initial);
    setEditingFormId(form.id);
    setExpandedId(form.id);
    setShowAddPicker(false);
  };

  const saveEdit = async (formId: string) => {
    setSaving(true);
    try {
      await onSave(mergeFormValues(getAll(), formId, editValues));
      setEditingFormId(null);
    } finally {
      setSaving(false);
    }
  };

  if (forms.length === 0) return null;

  const formsWithData = forms.filter(hasData);
  // Mientras se está agregando datos a un formulario nuevo, mantenerlo visible en la lista aunque aún no tenga datos guardados
  const editingExtra = editingFormId && !formsWithData.some((f) => f.id === editingFormId)
    ? forms.find((f) => f.id === editingFormId)
    : null;
  const displayForms = editingExtra ? [...formsWithData, editingExtra] : formsWithData;
  const addableForms = forms.filter((f) => !hasData(f) && f.id !== editingFormId);

  const setValue = (id: string, v: unknown) => setEditValues((p) => ({ ...p, [id]: v }));

  return (
    <div>
      <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60">Formularios</p>
      {displayForms.length === 0 && (
        <p className="mb-2 text-[11px] italic text-muted-foreground/50">Sin datos de formularios aún.</p>
      )}
      <div className="space-y-1">
        {displayForms.map((form) => {
          const isExpanded = expandedId === form.id;
          const isEditing = editingFormId === form.id;
          const values = getFormValues(form.id);
          const fields = fieldsOf(form);
          const editable = fields.filter(isEditable);
          const readOnly = fields.filter((f) => !isEditable(f) && f.type !== "heading");

          return (
            <div key={form.id} className="overflow-hidden rounded-xl border">
              <button
                onClick={() => setExpandedId(isExpanded ? null : form.id)}
                className="flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-secondary/30"
              >
                <span className="text-xs font-medium">{form.name}</span>
                <ChevronDown size={13} className={`text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
              </button>

              {isExpanded && (
                <div className="space-y-2.5 border-t bg-secondary/10 px-3 pb-3 pt-2">
                  {fields.length === 0 ? (
                    <p className="text-xs italic text-muted-foreground/50">Sin campos configurados</p>
                  ) : isEditing ? (
                    <>
                      {editable.filter((f) => !isNotApplicable(f, editValues)).map((f) => (
                        <div key={f.id}>
                          <label className="mb-0.5 block text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60">{f.label}</label>
                          {f.type === "textarea" ? (
                            <textarea
                              value={String(editValues[f.id] ?? "")}
                              onChange={(e) => setValue(f.id, e.target.value)}
                              placeholder={f.placeholder ?? ""}
                              className="flex min-h-[60px] w-full resize-none rounded-md border border-input bg-background px-3 py-1.5 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-xs"
                            />
                          ) : f.type === "select" || f.type === "radio" ? (
                            <select value={String(editValues[f.id] ?? "")} onChange={(e) => setValue(f.id, e.target.value)} className={selectCls}>
                              <option value="">Sin respuesta</option>
                              {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : f.type === "checkbox" ? (
                            <label className="flex cursor-pointer items-center gap-2 text-xs">
                              <input type="checkbox" checked={!!editValues[f.id]} onChange={(e) => setValue(f.id, e.target.checked)} className="h-4 w-4 rounded border-input" />
                              Sí
                            </label>
                          ) : f.type === "schedule" ? (
                            <WeeklySchedulePicker value={(editValues[f.id] as WeeklySchedule) ?? DEFAULT_WEEKLY_SCHEDULE} onChange={(v) => setValue(f.id, v)} />
                          ) : (
                            <Input
                              type={f.type === "date" ? "date" : f.type === "time" ? "time" : "text"}
                              value={String(editValues[f.id] ?? "")}
                              onChange={(e) => setValue(f.id, e.target.value)}
                              placeholder={f.placeholder ?? ""}
                              className="h-7 text-base md:text-xs"
                            />
                          )}
                        </div>
                      ))}
                      {readOnly.length > 0 && (
                        <p className="text-[10px] italic text-muted-foreground/60">
                          No se editan aquí (se conservan tal cual): {readOnly.map((f) => f.label).join(", ")}.
                        </p>
                      )}
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" onClick={() => saveEdit(form.id)} disabled={saving} className="h-7 flex-1 text-xs">
                          {saving && <Loader2 size={11} className="mr-1 animate-spin" />}
                          Guardar
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setEditingFormId(null)} className="h-7 text-xs">
                          Cancelar
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <FormAnswers form={form} values={values} serviceNames={serviceNames} />
                      {canEdit && editable.length > 0 && (
                        <Button variant="ghost" size="sm" onClick={() => startEdit(form)} className="mt-1 h-7 w-full gap-1.5 text-xs">
                          <Pencil size={11} /> Editar
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {canEdit && addableForms.length > 0 && (
        showAddPicker ? (
          <div className="mt-2 divide-y overflow-hidden rounded-xl border">
            {addableForms.map((form) => (
              <button
                key={form.id}
                onClick={() => startEdit(form)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-secondary/30"
              >
                <span>{form.name}</span>
                <Plus size={12} className="text-muted-foreground" />
              </button>
            ))}
            <button
              onClick={() => setShowAddPicker(false)}
              className="w-full px-3 py-1.5 text-center text-[11px] text-muted-foreground transition-colors hover:bg-secondary/20"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAddPicker(true)}
            className="mt-2 h-8 w-full gap-1.5 border border-dashed border-border text-xs text-muted-foreground hover:text-foreground"
          >
            <Plus size={12} /> Agregar datos de formulario existente
          </Button>
        )
      )}
    </div>
  );
};

export default FormDataPanel;
