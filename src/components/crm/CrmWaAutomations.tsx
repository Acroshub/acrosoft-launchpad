import { useState, useMemo } from "react";
import {
  Plus, Trash2, Edit2, Zap, Clock, CheckCircle2, XCircle, Loader2,
  ChevronDown, ChevronUp, ArrowLeft, SkipForward, Megaphone, GitBranch,
  ChevronLeft, ChevronRight, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  useWaAutomations, useCreateWaAutomation, useUpdateWaAutomation,
  useDeleteWaAutomation, useAutomationQueue, useWaTemplates,
  useProducts, useServices, useCourses, useDeleteWaSequence,
} from "@/hooks/useCrmData";
import { useCurrentUser } from "@/hooks/useAuth";
import { Switch } from "@/components/ui/switch";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";
import { filterLabel, StepAudience, useAudienceData } from "@/components/crm/wa/audience";
import { PART_TYPES, newPart, MessageEditor, PartPreview } from "@/components/crm/wa/message";
import { SequencePicker, useSequenceUsage, sequenceDeleteWarning } from "@/components/crm/wa/sequences";
import { SequenceEditorModal } from "@/components/crm/wa/SequenceEditor";
import { toDraftSequence, type DraftSequence } from "@/components/crm/wa/sequence-model";
import { StepBar } from "@/components/crm/wa/StepBar";
import type {
  CrmWaAutomation, CrmWaSequence, WaAutomationMsgType, WaVarSource,
  WaAudienceFilter, WaAudienceMatch, WaCampaignPart,
} from "@/lib/supabase";

// ─────────────────────────────────────────────────────────────────────────────
// SEGUIMIENTO AUTOMÁTICO
//
// Un solo disparador: el contacto lleva X horas sin responder. Ya no se elige,
// porque nunca hubo otro — el backend siempre filtró por 'inactivity' y los
// demás valores del enum eran código muerto.
//
// Wizard con la misma forma que Envíos Masivos y compartiendo sus piezas
// (audiencia, filtros, editor de mensaje). Antes tenía su propio modelo de
// audiencia por etiquetas y países: dos formas de responder "¿a quién?" que
// daban resultados distintos para la misma pregunta.
// ─────────────────────────────────────────────────────────────────────────────

const STEPS = ["Cuándo", "A quién", "Mensaje", "Revisar"] as const;
const STEP_HINTS = [
  "Cuántas horas de silencio tienen que pasar para que salga solo.",
  "Acota a quién se le hace seguimiento, o déjalo para todos.",
  "Qué recibe el contacto cuando salta el seguimiento.",
  "Comprueba que todo está como quieres antes de activarlo.",
];

// Tope duro de Meta para mensajes libres. Pasadas 24h del último mensaje del
// contacto solo se puede escribir con plantilla aprobada.
const META_WINDOW_H = 24;

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return "hace un momento";
  if (diff < 3600)  return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function extractVarNums(text: string): number[] {
  return [...new Set([...text.matchAll(/\{\{(\d+)\}\}/g)].map(m => Number(m[1])))].sort((a, b) => a - b);
}

// ─── Payloads ────────────────────────────────────────────────────────────────

type PayloadKind = Extract<WaAutomationMsgType, "free_text" | "template" | "sequence">;

const PAYLOADS: { id: PayloadKind; icon: JSX.Element; title: string; note: string; needsWindow: boolean }[] = [
  { id: "free_text", icon: <Zap size={15} />, title: "Mensaje libre",
    note: "Un mensaje suelto, gratis.", needsWindow: true },
  { id: "template", icon: <Megaphone size={15} />, title: "Plantilla aprobada",
    note: "Llega siempre, dentro o fuera de las 24h. Meta cobra cada mensaje entregado.", needsWindow: false },
  { id: "sequence", icon: <GitBranch size={15} />, title: "Secuencia",
    note: "Arranca una secuencia publicada y avanza según responda el contacto.", needsWindow: true },
];

// ─── Selectores ──────────────────────────────────────────────────────────────

function TemplateSelector({ selectedId, onSelect }: {
  selectedId: string; onSelect: (id: string, body: string) => void;
}) {
  const { data: templates = [], isLoading } = useWaTemplates("remarketing");
  const approved = templates.filter(t => t.local_status === "APPROVED");
  if (isLoading) return <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-muted-foreground/50" /></div>;
  if (!approved.length) return (
    <p className="text-xs text-muted-foreground py-3 text-center">
      No tienes plantillas aprobadas. Créalas en Plantillas, dentro de esta misma sección.
    </p>
  );
  return (
    <div className="space-y-2">
      {approved.map(t => (
        <button key={t.id} type="button" onClick={() => onSelect(t.id, t.body_text)}
          className={`w-full text-left p-3 rounded-xl border transition-all ${
            selectedId === t.id ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border hover:border-primary/40 hover:bg-muted/30"
          }`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold font-mono">{t.name}</span>
            <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full font-semibold">APROBADA</span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{t.body_text}</p>
        </button>
      ))}
    </div>
  );
}

function VarSelector({ varNum, value, onChange }: {
  varNum: number; value: WaVarSource | undefined; onChange: (v: WaVarSource) => void;
}) {
  const { data: products = [] } = useProducts();
  const { data: services = [] } = useServices();
  const { data: courses = [] }  = useCourses();
  const source = value?.source ?? "contact_field";

  return (
    <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-muted/30 border border-border">
      <span className="text-[11px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md shrink-0">{`{{${varNum}}}`}</span>
      <select value={source}
        onChange={e => {
          const s = e.target.value;
          if (s === "contact_field") onChange({ source: "contact_field", field: "name" });
          else if (s === "fixed") onChange({ source: "fixed", value: "" });
          else if (s === "product_field" && products[0]) onChange({ source: "product_field", entityId: products[0].id, entityName: products[0].name, field: "name" });
          else if (s === "service_field" && services[0]) onChange({ source: "service_field", entityId: services[0].id, entityName: services[0].name, field: "name" });
          else if (s === "course_field" && courses[0]) onChange({ source: "course_field", entityId: courses[0].id, entityName: courses[0].title, field: "title" });
        }}
        className="h-8 px-2 rounded-lg border border-border bg-background text-base md:text-xs outline-none focus:ring-2 focus:ring-primary/30">
        <option value="contact_field">Campo del contacto</option>
        {products.length > 0 && <option value="product_field">Producto</option>}
        {services.length > 0 && <option value="service_field">Servicio</option>}
        {courses.length  > 0 && <option value="course_field">Curso</option>}
        <option value="fixed">Texto fijo</option>
      </select>
      {source === "contact_field" && (
        <select value={(value as any)?.field ?? "name"} onChange={e => onChange({ source: "contact_field", field: e.target.value as any })}
          className="h-8 px-2 rounded-lg border border-border bg-background text-base md:text-xs outline-none focus:ring-2 focus:ring-primary/30">
          <option value="name">Nombre</option>
          <option value="email">Email</option>
          <option value="phone">Teléfono</option>
          <option value="company">Empresa</option>
        </select>
      )}
      {source === "fixed" && (
        <input value={(value as any)?.value ?? ""} onChange={e => onChange({ source: "fixed", value: e.target.value })}
          placeholder="Texto fijo"
          className="flex-1 min-w-0 h-8 px-2 rounded-lg border border-border bg-background text-base md:text-xs outline-none focus:ring-2 focus:ring-primary/30" />
      )}
    </div>
  );
}

// ─── Wizard ──────────────────────────────────────────────────────────────────

type FormState = {
  name: string;
  hours: number;
  audienceType: "all" | "include" | "exclude";
  filters: WaAudienceFilter[];
  match: WaAudienceMatch;
  payload: PayloadKind;
  part: WaCampaignPart;
  templateId: string;
  templateBody: string;
  varMap: Record<string, WaVarSource>;
  sequenceId: string | null;
};

const emptyForm = (): FormState => ({
  name: "",
  hours: 6,
  audienceType: "all",
  filters: [],
  match: "any",
  payload: "free_text",
  part: newPart("text"),
  templateId: "",
  templateBody: "",
  varMap: {},
  sequenceId: null,
});

function toForm(a: CrmWaAutomation): FormState {
  const parts = Array.isArray(a.parts) ? a.parts : [];
  return {
    name: a.name,
    hours: a.trigger_inactivity_hours ?? 6,
    audienceType: a.audience_type ?? "all",
    filters: a.audience_filters ?? [],
    match: a.audience_match ?? "any",
    payload: (a.message_type ?? "free_text") as PayloadKind,
    part: parts[0] ?? (a.message_text ? { ...newPart("text"), text: a.message_text } : newPart("text")),
    templateId: a.template_id ?? "",
    templateBody: "",
    varMap: (a.template_var_map ?? {}) as Record<string, WaVarSource>,
    sequenceId: a.sequence_id ?? null,
  };
}

function AutomationWizard({ editing, onDone }: {
  editing: CrmWaAutomation | null;
  onDone: () => void;
}) {
  const { user } = useCurrentUser();
  const createAuto = useCreateWaAutomation();
  const updateAuto = useUpdateWaAutomation();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [pendingDeleteSeq, setPendingDeleteSeq] = useState<CrmWaSequence | null>(null);
  const deleteSequence = useDeleteWaSequence();
  const seqUsage = useSequenceUsage(pendingDeleteSeq?.id ?? null);
  // Editar la secuencia sin salir de aquí: son objetos compartidos con Flujos, pero
  // mandar al usuario a otra sección para tocar la que acaba de elegir rompía el hilo
  // de lo que estaba armando. null = editor cerrado.
  const [editingSeq, setEditingSeq] = useState<DraftSequence | null>(null);
  const [form, setForm] = useState<FormState>(() => editing ? toForm(editing) : emptyForm());
  const set = (patch: Partial<FormState>) => setForm(f => ({ ...f, ...patch }));

  // Un seguimiento no tiene una audiencia fija como una campaña: está siempre
  // vigilando y quien entra o sale cambia solo. Por eso aquí no se muestra
  // ningún total — solo se usan estos datos para pintar el selector de filtros.
  const { base, phoneless, ctx } = useAudienceData(Math.min(form.hours, META_WINDOW_H));

  // Pasadas 24h Meta solo acepta plantillas, así que a partir de ahí el paso del
  // mensaje ofrece solo esa. El slider NO se bloquea: elegir 48h es legítimo,
  // simplemente condiciona el tipo de mensaje.
  const outOfWindow = form.hours >= META_WINDOW_H;
  const available   = PAYLOADS.filter(p => !outOfWindow || !p.needsWindow);
  const meta        = PAYLOADS.find(p => p.id === form.payload)!;

  const varNums = useMemo(() => extractVarNums(form.templateBody), [form.templateBody]);

  const canNext = () => {
    if (step === 0) return form.hours >= 1;
    if (step === 1) return form.audienceType === "all" || form.filters.length > 0;
    if (step === 2) {
      if (form.payload === "sequence") return !!form.sequenceId;
      if (form.payload === "template") return !!form.templateId;
      return form.part.type === "text" ? (form.part.text ?? "").trim().length > 0
           : form.part.type === "link" ? (form.part.link_url ?? "").trim().length > 0
           : (form.part.url ?? "").trim().length > 0;
    }
    return form.name.trim().length > 0;
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const usesFree = form.payload === "free_text";
      const payload = {
        name: form.name.trim(),
        is_active: editing?.is_active ?? true,
        trigger_type: "inactivity" as const,
        trigger_inactivity_hours: form.hours,
        audience_type: form.audienceType,
        audience_filters: form.filters,
        audience_match: form.match,
        message_type: form.payload,
        parts: usesFree ? [form.part] : [],
        sequence_id: form.payload === "sequence" ? form.sequenceId : null,
        message_text: null,
        media_type: null,
        media_url: null,
        template_id: form.payload === "template" ? form.templateId : null,
        template_var_map: form.varMap,
      };
      if (editing) await updateAuto.mutateAsync({ id: editing.id, ...payload });
      else         await createAuto.mutateAsync(payload);
      toast.success(editing ? "Seguimiento actualizado" : "Seguimiento creado");
      onDone();
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => { if (step === 0) onDone(); else setStep(s => s - 1); }}
          title={step === 0 ? "Cancelar" : "Paso anterior"}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
          <ArrowLeft size={14} />
        </button>
        <h2 className="text-sm font-semibold flex-1 truncate">
          {editing ? "Editar seguimiento" : "Nuevo seguimiento"}
        </h2>
        <button onClick={onDone} title="Cancelar"
          className="p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground shrink-0">
          <XCircle size={15} />
        </button>
      </div>

      <StepBar steps={STEPS} current={step} />
      <p className="text-[11px] text-muted-foreground -mt-1">{STEP_HINTS[step]}</p>

      {/* ── Paso 1: cuándo ── */}
      {step === 0 && (
        <div className="space-y-3">
          <div className="space-y-1.5 p-3 rounded-xl bg-muted/20 border border-border">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold">Horas sin respuesta</p>
              <span className="text-xs font-bold shrink-0">{form.hours}h</span>
            </div>
            <input type="range" min={1} max={72} step={1} value={form.hours}
              onChange={e => {
                const h = Number(e.target.value);
                const needsTemplate = h >= META_WINDOW_H;
                // Si el tipo elegido deja de ser posible con esas horas, se pasa
                // a plantilla en vez de dejar una combinación que no puede salir.
                const stillValid = !needsTemplate || !PAYLOADS.find(p => p.id === form.payload)?.needsWindow;
                set({ hours: h, ...(stillValid ? {} : { payload: "template" as PayloadKind }) });
              }}
              className="w-full accent-primary" />
            <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
              El seguimiento sale cuando pasan {form.hours}h desde el último mensaje del contacto sin
              que haya vuelto a escribir. Si responde antes, no se envía nada.
            </p>
          </div>

          {form.hours >= META_WINDOW_H && (
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40">
              <AlertCircle size={13} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                A partir de 24h el contacto queda fuera de la ventana de Meta: solo se le puede escribir
                con <strong>plantilla aprobada</strong>. Es lo único que ofrecerá el paso del mensaje.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Paso 2: a quién ── */}
      {step === 1 && (
        <StepAudience
          audienceType={form.audienceType} filters={form.filters} base={base}
          phoneless={phoneless} ctx={ctx} match={form.match}
          onTypeChange={t => set({ audienceType: t, ...(t === "all" ? { filters: [] } : {}) })}
          onFiltersChange={f => set({ filters: f })}
          onMatchChange={m => set({ match: m })}
        />
      )}

      {/* ── Paso 3: mensaje ── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">¿Qué se le manda?</p>
            {outOfWindow && (
              <p className="text-[11px] text-muted-foreground">
                Con {form.hours}h de espera el contacto ya está fuera de la ventana de Meta, así que
                la plantilla aprobada es la única forma de llegarle.
              </p>
            )}
            {available.map(p => (
              <button key={p.id} type="button" onClick={() => set({ payload: p.id })}
                className={`w-full flex items-start gap-2.5 p-3 rounded-xl border text-left transition-colors ${
                  form.payload === p.id ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border hover:border-primary/40 hover:bg-muted/20"
                }`}>
                <span className={`mt-0.5 shrink-0 ${form.payload === p.id ? "text-primary" : "text-muted-foreground"}`}>{p.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{p.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{p.note}</p>
                </div>
              </button>
            ))}
          </div>

          {form.payload === "free_text" && (
            <div className="space-y-3 pt-1 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground mt-3">El mensaje</p>
              <MessageEditor part={form.part} onChange={p => set({ part: p })} userId={user?.id ?? ""} />
              <PartPreview part={form.part} />
            </div>
          )}

          {form.payload === "template" && (
            <div className="space-y-3 pt-1 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground mt-3">La plantilla</p>
              <TemplateSelector selectedId={form.templateId}
                onSelect={(id, body) => set({ templateId: id, templateBody: body, varMap: {} })} />
              {varNums.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Variables</p>
                  {varNums.map(n => (
                    <VarSelector key={n} varNum={n} value={form.varMap[String(n)]}
                      onChange={v => set({ varMap: { ...form.varMap, [String(n)]: v } })} />
                  ))}
                </div>
              )}
            </div>
          )}

          {form.payload === "sequence" && (
            <div className="space-y-3 pt-1 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground mt-3">La secuencia</p>
              <SequencePicker
                selectedId={form.sequenceId}
                onSelect={id => set({ sequenceId: id })}
                onEdit={seq => setEditingSeq(toDraftSequence(seq))}
                onDelete={seq => setPendingDeleteSeq(seq)}
                publishedOnly
                emptyHint="Todavía no tienes secuencias. Crea la primera aquí abajo."
              />
              <button
                type="button"
                onClick={() => setEditingSeq({ name: "", steps: [], status: "draft" })}
                className="flex items-center gap-1.5 w-full px-3 h-8 rounded-lg border border-dashed border-border text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
              >
                <Plus size={12} /> Crear secuencia
              </button>
              <p className="text-[10px] text-muted-foreground/70">
                Las secuencias se comparten con <strong>Flujos</strong>: lo que edites o elimines aquí cambia también allí.
              </p>
              <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
                La secuencia arranca en el contacto y avanza como cualquier flujo: si tiene preguntas,
                espera la respuesta. Si el contacto no responde y se cierra la ventana de 24h, la
                secuencia caduca y la conversación queda libre.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Paso 4: revisar ── */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Nombre del seguimiento</label>
            <input value={form.name} onChange={e => set({ name: e.target.value })}
              placeholder="Ej: Recordatorio a las 6h"
              className="w-full h-9 px-3 rounded-xl border border-border bg-background text-base md:text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            <p className="text-[10px] text-muted-foreground/70">Solo para que lo reconozcas en la lista.</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-3 space-y-2 text-xs">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground shrink-0">Se dispara</span>
              <span className="font-medium text-right">{form.hours}h sin respuesta</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground shrink-0">A quién</span>
              <span className="font-medium text-right">
                {form.audienceType === "all" ? "Todos"
                 : form.audienceType === "include" ? `Solo incluir (${form.filters.length})`
                 : `Todos menos (${form.filters.length})`}
              </span>
            </div>
            {form.filters.length > 0 && (
              <div className="flex flex-wrap gap-1 justify-end">
                {form.filters.map((f, i) => (
                  <span key={i} className="bg-primary/8 border border-primary/20 text-primary px-2 py-0.5 rounded-full text-[10px]">{filterLabel(f)}</span>
                ))}
              </div>
            )}
            <div className="flex justify-between gap-3 pt-2 border-t border-border">
              <span className="text-muted-foreground shrink-0">Se le manda</span>
              <span className="font-medium text-right">{meta.title}</span>
            </div>
            {form.payload === "free_text" && (
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground shrink-0">Tipo</span>
                <span className="font-medium text-right">{PART_TYPES.find(t => t.id === form.part.type)?.label}</span>
              </div>
            )}
          </div>

          {form.payload === "free_text" && <PartPreview part={form.part} />}
        </div>
      )}

      {editingSeq && (
        <SequenceEditorModal
          initial={editingSeq}
          userId={user?.id ?? ""}
          onClose={() => setEditingSeq(null)}
          // Recién publicada queda elegida: crearla y tener que buscarla en la lista
          // para seleccionarla era un paso de más sin ninguna decisión detrás.
          onPublished={saved => set({ sequenceId: saved.id })}
        />
      )}

      <DeleteConfirmDialog
        open={!!pendingDeleteSeq}
        onOpenChange={open => { if (!open) setPendingDeleteSeq(null); }}
        isPending={deleteSequence.isPending}
        description={sequenceDeleteWarning(seqUsage)}
        onConfirm={async () => {
          if (!pendingDeleteSeq) return;
          await deleteSequence.mutateAsync(pendingDeleteSeq.id);
          if (form.sequenceId === pendingDeleteSeq.id) set({ sequenceId: null });
          setPendingDeleteSeq(null);
          toast.success("Secuencia eliminada de todo el CRM");
        }}
      />

      <div className="flex items-center gap-2 pt-2 border-t border-border">
        {step > 0 && (
          <button type="button" onClick={() => setStep(s => s - 1)}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
            <ChevronLeft size={14} /> Anterior
          </button>
        )}
        <div className="flex-1" />
        {step < 3 ? (
          <button type="button" onClick={() => setStep(s => s + 1)} disabled={!canNext()}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40">
            Siguiente <ChevronRight size={14} />
          </button>
        ) : (
          <button type="button" onClick={handleSave} disabled={saving || !canNext()}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40">
            {saving ? <><Loader2 size={13} className="animate-spin" /> Guardando...</> : <><CheckCircle2 size={13} /> {editing ? "Guardar cambios" : "Crear seguimiento"}</>}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Historial de un seguimiento ─────────────────────────────────────────────

function AutomationQueueDetail({ automationId }: { automationId: string }) {
  const { data: items = [], isLoading } = useAutomationQueue(automationId);

  if (isLoading) return <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-muted-foreground/50" /></div>;
  if (!items.length) return <p className="text-xs text-muted-foreground text-center py-3">Sin actividad registrada.</p>;

  const icon = (s: string) =>
    s === "sent"    ? <CheckCircle2 size={12} className="text-green-500" />
  : s === "failed"  ? <XCircle size={12} className="text-red-500" />
  : s === "skipped" ? <SkipForward size={12} className="text-orange-400" />
  :                   <Clock size={12} className="text-blue-400" />;

  const label = (s: string) =>
    s === "sent" ? "Enviado" : s === "failed" ? "Fallido"
  : s === "skipped" ? "Omitido" : s === "pending" ? "Pendiente" : s;

  return (
    <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
      {items.map(item => (
        <div key={item.id} className="flex items-start gap-2 py-1.5 border-b border-border/50 last:border-0">
          <div className="mt-0.5 shrink-0">{icon(item.status)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-medium">{label(item.status)}</span>
              <span className="text-[10px] text-muted-foreground">{relativeTime(item.created_at)}</span>
            </div>
            {item.error_message && <p className="text-[10px] text-red-500 mt-0.5 truncate">{item.error_message}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Tarjeta de la lista ─────────────────────────────────────────────────────

const PAYLOAD_LABEL: Partial<Record<WaAutomationMsgType, string>> = {
  free_text: "Mensaje libre",
  free_text_with_fallback: "Libre + plantilla",   // legado
  template: "Plantilla",
  sequence: "Secuencia",
};

function AutomationCard({ automation, onEdit, onDelete }: {
  automation: CrmWaAutomation;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const updateAuto = useUpdateWaAutomation();

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-medium truncate">{automation.name}</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
              <Clock size={9} />{automation.trigger_inactivity_hours ?? "—"}h
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-secondary text-muted-foreground">
              {PAYLOAD_LABEL[automation.message_type] ?? automation.message_type}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {automation.sent_count} enviados · {automation.skipped_count} omitidos · {automation.failed_count} fallidos
          </p>
        </div>
        <Switch
          checked={automation.is_active}
          onCheckedChange={v => updateAuto.mutate({ id: automation.id, is_active: v })}
          className="shrink-0"
        />
      </div>
      <div className="flex items-center gap-1 px-3 pb-2.5">
        <button onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
          {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />} Historial
        </button>
        <div className="flex-1" />
        <button onClick={onEdit} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"><Edit2 size={13} /></button>
        <button onClick={onDelete} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 size={13} /></button>
      </div>
      {open && <div className="px-3 pb-3"><AutomationQueueDetail automationId={automation.id} /></div>}
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function CrmWaAutomations() {
  const { data: automations = [], isLoading } = useWaAutomations();
  const deleteAuto = useDeleteWaAutomation();

  const [building, setBuilding] = useState(false);
  const [editing, setEditing]   = useState<CrmWaAutomation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CrmWaAutomation | null>(null);

  if (building) return (
    <AutomationWizard
      editing={editing}
      onDone={() => { setBuilding(false); setEditing(null); }}
    />
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Seguimientos</p>
          <p className="text-xs text-muted-foreground">
            {automations.length} configurado{automations.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button type="button" onClick={() => { setEditing(null); setBuilding(true); }}
          className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1.5 shrink-0">
          <Plus size={12} /> Nuevo
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : !automations.length ? (
        <div className="text-center py-12 space-y-2">
          <Clock size={28} className="mx-auto text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Sin seguimientos todavía</p>
          <p className="text-xs text-muted-foreground/70">Configura uno y saldrá solo cuando un contacto deje de responder</p>
        </div>
      ) : (
        <div className="space-y-2">
          {automations.map(a => (
            <AutomationCard key={a.id} automation={a}
              onEdit={() => { setEditing(a); setBuilding(true); }}
              onDelete={() => setDeleteTarget(a)} />
          ))}
        </div>
      )}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => { if (!open) setDeleteTarget(null); }}
        description={`Se eliminará el seguimiento "${deleteTarget?.name}" permanentemente.`}
        isPending={deleteAuto.isPending}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteAuto.mutateAsync(deleteTarget.id);
          setDeleteTarget(null);
          toast.success("Seguimiento eliminado");
        }}
      />
    </div>
  );
}
