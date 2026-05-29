import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, HelpCircle } from "lucide-react";

export type FaqEntry = { question: string; answer: string };

interface Props {
  value: FaqEntry[];
  onChange: (entries: FaqEntry[]) => void;
}

export default function FaqEditor({ value, onChange }: Props) {
  const [open, setOpen]         = useState(() => value.length > 0);
  const [expanded, setExpanded] = useState<number | null>(null);

  const handleAdd = () => {
    const next = [...value, { question: "", answer: "" }];
    onChange(next);
    setExpanded(next.length - 1);
  };

  const handleUpdate = (idx: number, field: "question" | "answer", val: string) => {
    const next = [...value];
    next[idx] = { ...next[idx], [field]: val };
    onChange(next);
  };

  const handleRemove = (idx: number) => {
    const next = value.filter((_, i) => i !== idx);
    onChange(next);
    if (expanded === idx) setExpanded(null);
    else if (expanded !== null && expanded > idx) setExpanded(expanded - 1);
    if (next.length === 0) setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { setOpen(true); if (value.length === 0) handleAdd(); }}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors py-1 cursor-pointer"
      >
        <HelpCircle size={12} className="shrink-0" />
        Agregar preguntas frecuentes
        <span className="opacity-50">(FAQ para el Agente IA)</span>
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-secondary/20 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <HelpCircle size={12} className="text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Preguntas frecuentes (FAQ)</span>
        </div>
        {value.length === 0 && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-pointer"
          >
            ocultar
          </button>
        )}
      </div>

      {value.map((faq, idx) => (
        <div key={idx} className="rounded-lg border border-border/50 bg-background overflow-hidden">
          {/* Header row */}
          <div
            className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-secondary/30 transition-colors"
            onClick={() => setExpanded(expanded === idx ? null : idx)}
          >
            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
              {idx + 1}
            </span>
            <input
              type="text"
              value={faq.question}
              onChange={e => { e.stopPropagation(); handleUpdate(idx, "question", e.target.value); }}
              onClick={e => e.stopPropagation()}
              placeholder="¿Pregunta frecuente?"
              className="flex-1 min-w-0 bg-transparent text-xs font-medium outline-none placeholder:text-muted-foreground/50"
            />
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={e => { e.stopPropagation(); handleRemove(idx); }}
                className="p-1 rounded text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
              >
                <Trash2 size={11} />
              </button>
              {expanded === idx
                ? <ChevronUp size={12} className="text-muted-foreground/50" />
                : <ChevronDown size={12} className="text-muted-foreground/50" />
              }
            </div>
          </div>

          {/* Answer area */}
          {expanded === idx && (
            <div className="px-3 pb-3 pt-1 border-t border-border/30">
              <textarea
                value={faq.answer}
                onChange={e => handleUpdate(idx, "answer", e.target.value)}
                placeholder="Respuesta detallada que el Agente IA usará..."
                rows={3}
                className="w-full bg-transparent text-xs text-muted-foreground outline-none resize-none placeholder:text-muted-foreground/40 leading-relaxed"
              />
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={handleAdd}
        className="w-full h-8 rounded-lg bg-primary/8 text-primary text-xs font-medium hover:bg-primary/15 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <Plus size={12} /> Agregar pregunta
      </button>
    </div>
  );
}
