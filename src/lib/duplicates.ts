// Duplicar etiquetas, flujos y seguimientos.
//
// Una copia nace como Borrador y recuerda de quién viene (duplicated_from). No se puede guardar hasta
// que difiera del original en algo — si no, quedarían dos elementos idénticos haciendo lo mismo
// (dos flujos que disparan juntos, dos seguimientos que escriben dos veces al mismo contacto).

export const NOT_MODIFIED_MSG = "Cambia al menos un dato respecto al original para poder guardar la copia.";

/** Quita el sufijo " (copia)" / " (copia 2)" que se le pone al duplicar. */
export function baseName(name: string): string {
  return name.replace(/\s*\(copia(?: \d+)?\)\s*$/i, "").trim();
}

/** "Nombre (copia)", o "Nombre (copia 2)"… si ya existe uno igual. */
export function copyName(name: string, existing: string[]): string {
  const base = baseName(name) || name.trim();
  const taken = new Set(existing.map(n => n.trim().toLowerCase()));
  let candidate = `${base} (copia)`;
  for (let i = 2; taken.has(candidate.toLowerCase()); i++) candidate = `${base} (copia ${i})`;
  return candidate;
}

/** JSON con las claves ordenadas, para comparar objetos sin que importe el orden. */
export function stable(value: unknown): string {
  return JSON.stringify(value, (_k, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)))
      : v);
}

const text = (v: unknown) => (typeof v === "string" ? v.trim() : v ?? "");

/** Nombre sin sufijo de copia: dejar "X (copia)" tal cual cuenta como NO haberlo cambiado. */
const nameKey = (v: string) => baseName(v).toLowerCase();

// ─── Etiquetas ───────────────────────────────────────────────────────────────

export interface LabelComparable {
  name: string; color: string; hint: string | null; remove_hint: string | null;
  meta_event: string | null; product_id: string | null;
}

export function labelUnchanged(copy: LabelComparable, source: LabelComparable): boolean {
  return nameKey(copy.name) === nameKey(source.name)
    && copy.color === source.color
    && text(copy.hint) === text(source.hint)
    && text(copy.remove_hint) === text(source.remove_hint)
    && (copy.meta_event ?? null) === (source.meta_event ?? null)
    && (copy.product_id ?? null) === (source.product_id ?? null);
}

// ─── Secuencias (las usan flujos y seguimientos) ─────────────────────────────

export interface SequenceLike { id: string; steps: unknown; duplicated_from?: string | null }

/**
 * ¿Alguna de las secuencias de la copia cambió respecto a su original?
 * Cada secuencia copiada recuerda la suya (duplicated_from); se compara su contenido publicado.
 */
export function sequencesEdited(ids: (string | null | undefined)[], sequences: SequenceLike[]): boolean {
  return ids.some(id => {
    const seq = sequences.find(s => s.id === id);
    const source = seq?.duplicated_from ? sequences.find(s => s.id === seq.duplicated_from) : null;
    return !!(seq && source && stable(seq.steps) !== stable(source.steps));
  });
}

/** Secuencia "de origen" de un id: si es una copia, la original; si no, ella misma. */
export function sequenceOrigin(id: string | null | undefined, sequences: SequenceLike[]): string | null {
  if (!id) return null;
  return sequences.find(s => s.id === id)?.duplicated_from ?? id;
}

// ─── Flujos ──────────────────────────────────────────────────────────────────

export interface FlowComparable {
  name: string; flow_trigger_type: string; trigger_text: string; trigger_once: boolean;
  product_id: string | null; final_action: string; sequence_id: string | null;
  country_sequences: { country_code: string; sequence_id: string }[];
}

export function flowUnchanged(copy: FlowComparable, source: FlowComparable, sequences: SequenceLike[]): boolean {
  const countries = (f: FlowComparable) =>
    (f.country_sequences ?? []).map(c => [c.country_code, sequenceOrigin(c.sequence_id, sequences)]).sort();
  const copyIds = [copy.sequence_id, ...(copy.country_sequences ?? []).map(c => c.sequence_id)];
  return nameKey(copy.name) === nameKey(source.name)
    && copy.flow_trigger_type === source.flow_trigger_type
    && text(copy.trigger_text) === text(source.trigger_text)
    && !!copy.trigger_once === !!source.trigger_once
    && (copy.product_id ?? null) === (source.product_id ?? null)
    && copy.final_action === source.final_action
    && sequenceOrigin(copy.sequence_id, sequences) === sequenceOrigin(source.sequence_id, sequences)
    && stable(countries(copy)) === stable(countries(source))
    && !sequencesEdited(copyIds, sequences);
}

// ─── Seguimientos ────────────────────────────────────────────────────────────

export interface AutomationComparable {
  name: string; trigger_inactivity_hours: number | null; audience_type: string; audience_filters: unknown;
  audience_match: string; message_type: string; parts: unknown; template_id: string | null;
  template_var_map: unknown; sequence_id: string | null;
}

export function automationUnchanged(copy: AutomationComparable, source: AutomationComparable, sequences: SequenceLike[]): boolean {
  return nameKey(copy.name) === nameKey(source.name)
    && (copy.trigger_inactivity_hours ?? null) === (source.trigger_inactivity_hours ?? null)
    && copy.audience_type === source.audience_type
    && stable(copy.audience_filters ?? []) === stable(source.audience_filters ?? [])
    && copy.audience_match === source.audience_match
    && copy.message_type === source.message_type
    && stable(copy.parts ?? []) === stable(source.parts ?? [])
    && (copy.template_id ?? null) === (source.template_id ?? null)
    && stable(copy.template_var_map ?? {}) === stable(source.template_var_map ?? {})
    && sequenceOrigin(copy.sequence_id, sequences) === sequenceOrigin(source.sequence_id, sequences)
    && !sequencesEdited([copy.sequence_id], sequences);
}
