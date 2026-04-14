import { useRef } from "react";
import { Variable } from "lucide-react";

// ─── Variable definitions ─────────────────────────────────────────────────────

export interface TemplateVariable {
  key: string;   // e.g. "nombre_cliente"
  label: string; // e.g. "Nombre del cliente"
}

export const REMINDER_VARIABLES: TemplateVariable[] = [
  { key: "nombre_cliente",    label: "Nombre del cliente" },
  { key: "email_cliente",     label: "Email del cliente" },
  { key: "telefono_cliente",  label: "Teléfono del cliente" },
  { key: "fecha_cita",        label: "Fecha de la cita" },
  { key: "hora_cita",         label: "Hora de la cita" },
  { key: "nombre_calendario", label: "Nombre del calendario" },
  { key: "nombre_negocio",    label: "Nombre del negocio" },
  { key: "nombre_staff",      label: "Nombre del staff" },
  { key: "cargo_staff",       label: "Cargo del staff" },
];

export const DEFAULT_REMINDER_MESSAGE =
  "Hola {{nombre_cliente}}, este es un recordatorio de tu cita el {{fecha_cita}} a las {{hora_cita}}.";

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  variables?: TemplateVariable[];
}

/**
 * A textarea with clickable variable chips underneath.
 * Clicking a chip inserts `{{variable}}` at the cursor position.
 */
const VariableChipsEditor = ({
  value,
  onChange,
  placeholder = "Escribe el texto del recordatorio…",
  rows = 3,
  variables = REMINDER_VARIABLES,
}: Props) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertVariable = (key: string) => {
    const ta = textareaRef.current;
    const token = `{{${key}}}`;
    if (!ta) {
      onChange((value ? value + " " : "") + token);
      return;
    }
    const start = ta.selectionStart ?? value.length;
    const end   = ta.selectionEnd   ?? value.length;
    const before = value.slice(0, start);
    const after  = value.slice(end);
    const newValue = before + token + after;
    onChange(newValue);
    // Restore cursor after the inserted token
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + token.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className="space-y-2">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-xl border border-input bg-background text-sm px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/50"
      />
      {/* Variable chips */}
      <div className="flex flex-wrap gap-1.5">
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50 font-medium uppercase tracking-wider mr-1 shrink-0">
          <Variable size={10} /> Variables:
        </span>
        {variables.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => insertVariable(v.key)}
            title={`Insertar {{${v.key}}}`}
            className="inline-flex items-center gap-1 text-[10px] font-medium border border-primary/20 bg-primary/5 text-primary rounded-full px-2 py-0.5 hover:bg-primary/10 hover:border-primary/40 transition-all cursor-pointer"
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default VariableChipsEditor;
