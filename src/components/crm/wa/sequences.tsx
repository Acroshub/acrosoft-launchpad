import { useMemo, useState } from "react";
import { CheckCircle2, MessageSquare, Pencil, Trash2, Loader2, Eye, X } from "lucide-react";
import { SequenceCanvas } from "./SequenceCanvas";
import { useWaSequences, useWaFlows, useWaAutomations } from "@/hooks/useCrmData";
import type { CrmWaSequence } from "@/lib/supabase";

// ─────────────────────────────────────────────────────────────────────────────
// Selector de secuencias — compartido por Flujos y Seguimiento Automático.
//
// Una secuencia no pertenece a quien la usa: vive sola y la pueden apuntar
// varios flujos y varios seguimientos. Por eso borrarla desde cualquiera de los
// dos sitios la borra para todos, y el aviso tiene que decirlo con nombres.
// ─────────────────────────────────────────────────────────────────────────────

/** Dónde se está usando una secuencia, para poder avisar antes de borrarla. */
export function useSequenceUsage(sequenceId: string | null) {
  const { data: flows = [] }       = useWaFlows();
  const { data: automations = [] } = useWaAutomations();

  return useMemo(() => {
    if (!sequenceId) return { flows: [] as string[], followups: [] as string[], total: 0 };
    const inFlows = flows
      .filter(f => f.sequence_id === sequenceId || (f.country_sequences ?? []).some(cs => cs.sequence_id === sequenceId))
      .map(f => f.name);
    const inFollowups = automations
      .filter(a => a.sequence_id === sequenceId)
      .map(a => a.name);
    return { flows: inFlows, followups: inFollowups, total: inFlows.length + inFollowups.length };
  }, [sequenceId, flows, automations]);
}

/**
 * Texto del diálogo de borrado. Se usa igual desde Flujos y desde Seguimientos
 * para que el aviso sea el mismo mires donde mires.
 */
export function sequenceDeleteWarning(
  usage: { flows: string[]; followups: string[]; total: number },
): string {
  if (usage.total === 0) {
    return "Se eliminará la secuencia permanentemente de todo el CRM. Ahora mismo no la usa ningún flujo ni ningún seguimiento.";
  }
  const partes: string[] = [];
  if (usage.flows.length)     partes.push(`${usage.flows.length === 1 ? "el flujo" : "los flujos"} ${usage.flows.map(n => `"${n}"`).join(", ")}`);
  if (usage.followups.length) partes.push(`${usage.followups.length === 1 ? "el seguimiento" : "los seguimientos"} ${usage.followups.map(n => `"${n}"`).join(", ")}`);
  return `Se eliminará permanentemente de TODO el CRM, no solo de aquí. La está usando ${partes.join(" y ")}, y dejará${usage.total === 1 ? "" : "n"} de enviar estos mensajes.`;
}

/**
 * Lienzo de una secuencia en modal de solo lectura. Se usa desde el selector
 * compartido y también desde la lista de secuencias de Flujos, para que "ver"
 * signifique lo mismo en los dos sitios.
 */
export function SequenceViewer({ seq, onClose }: {
  seq: CrmWaSequence | null;
  onClose: () => void;
}) {
  if (!seq) return null;
  const steps = seq.draft_steps ?? seq.steps;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="w-full max-w-3xl rounded-2xl border border-border bg-background shadow-xl overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <MessageSquare size={14} className="text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{seq.name}</p>
            <p className="text-[10px] text-muted-foreground">
              {steps.length} paso{steps.length !== 1 ? "s" : ""}
              {seq.status === "draft" && " · borrador sin publicar"}
              {seq.status === "published" && seq.draft_steps && " · viendo el borrador, con cambios sin publicar"}
              {" · solo lectura"}
            </p>
          </div>
          <button type="button" onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors shrink-0">
            <X size={15} />
          </button>
        </div>
        <div className="p-3">
          <SequenceCanvas steps={steps} maxHeight={420} />
        </div>
      </div>
    </div>
  );
}

export function SequencePicker({
  selectedId, onSelect, onEdit, onDelete, publishedOnly = false, emptyHint,
}: {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onEdit?: (seq: CrmWaSequence) => void;
  onDelete?: (seq: CrmWaSequence) => void;
  /** Los seguimientos solo pueden disparar secuencias publicadas. */
  publishedOnly?: boolean;
  emptyHint?: string;
}) {
  const { data: sequences = [], isLoading } = useWaSequences();
  // Ver es distinto de editar: abre el lienzo tal cual, sin riesgo de tocar nada.
  const [viewing, setViewing] = useState<CrmWaSequence | null>(null);

  if (isLoading) {
    return <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-muted-foreground/50" /></div>;
  }
  if (!sequences.length) {
    return (
      <p className="text-[11px] text-muted-foreground/60 italic text-center py-3">
        {emptyHint ?? "Todavía no tienes secuencias. Créalas en Flujos."}
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {sequences.map(seq => {
        const isDraft   = seq.status === "draft";
        const blocked   = publishedOnly && isDraft;
        const selected  = selectedId === seq.id;
        const stepCount = (seq.draft_steps ?? seq.steps).length;

        return (
          <div key={seq.id}
            className={`rounded-lg border transition-all ${
              selected ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border/60 bg-background"
            }`}>
            <div className="flex items-center gap-2 px-3 py-2">
              <button
                type="button"
                onClick={() => { if (!blocked) onSelect(selected ? null : seq.id); }}
                disabled={blocked}
                title={blocked ? "Publica la secuencia para poder usarla aquí" : undefined}
                className={`flex-1 min-w-0 flex items-center gap-2 text-left ${blocked ? "opacity-50 cursor-not-allowed" : ""}`}>
                {selected
                  ? <CheckCircle2 size={13} className="text-primary shrink-0" />
                  : <MessageSquare size={12} className="text-muted-foreground shrink-0" />}
                <span className="flex-1 min-w-0 truncate">
                  <span className="text-xs">{seq.name}</span>
                  <span className="block text-[10px] text-muted-foreground/60">
                    {stepCount} paso{stepCount !== 1 ? "s" : ""}
                    {isDraft && " · borrador sin publicar"}
                    {!isDraft && seq.draft_steps && " · con cambios sin publicar"}
                  </span>
                </span>
              </button>

              <button type="button" onClick={() => setViewing(seq)} title="Ver la secuencia"
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground transition-colors shrink-0">
                <Eye size={11} />
              </button>
              {onEdit && (
                <button type="button" onClick={() => onEdit(seq)} title="Editar"
                  className="p-1 rounded-lg hover:bg-secondary text-muted-foreground transition-colors shrink-0">
                  <Pencil size={11} />
                </button>
              )}
              {onDelete && (
                <button type="button" onClick={() => onDelete(seq)} title="Eliminar"
                  className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0">
                  <Trash2 size={11} />
                </button>
              )}
            </div>
          </div>
        );
      })}

      <SequenceViewer seq={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
