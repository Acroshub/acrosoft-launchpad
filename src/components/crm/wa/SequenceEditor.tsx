import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, ArrowLeft, Check, CheckCircle2, ChevronRight, ExternalLink, FileVideo,
  GitBranch, Loader2, MessageSquare, Music2, Paperclip, Pencil, Plus, Sparkles, Trash2, Upload, X,
  Image as ImageIcon,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUpsertWaSequence } from "@/hooks/useCrmData";
import { normalizeUrl } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  BRANCH_COLORS, buildSequenceGraph, edgeSourceY, getStepPreview, nodeBoxHeight,
  SEQ_TREE_COL_PITCH, SEQ_TREE_MAX_PILLS, SEQ_TREE_NODE_H, SEQ_TREE_NODE_W,
  SEQ_TREE_PILL_H, SEQ_TREE_ROW_PITCH,
  type SeqGraphEdge, type SeqGraphNode,
} from "./sequence-graph";
import {
  canConnectForward, detectRealMime, edgeMatchesSource, edgePortGap, getReachableStepIds,
  incomingEdgesInVisualOrder, LINK_TYPE, MEDIA_TYPES, newStep, normalizeSequenceSteps,
  readMagicBytes, STEP_ACCEPT, STEP_TYPE_LABELS, STEP_TYPE_ORDER, stepsAfterDeleting,
  stepsWithEdgeTarget, stepsWithoutIds, stepsWithRewiredOption, WA_FORMAT_HINT, WA_VALID_MIME,
  type DraftSequence, type EdgeManageSource, type PendingStepCreate,
} from "./sequence-model";
import type { CrmWaSequence, SequenceStep, SequenceStepMedia, SequenceStepOption } from "@/lib/supabase";

// ─────────────────────────────────────────────────────────────────────────────
// Editor de secuencias — el mismo en todos lados.
//
// Una secuencia no pertenece a quien la usa: la comparten Flujos, Seguimiento
// Automático y Envíos Masivos. Por eso el editor vive acá y no dentro de Flujos:
// desde cualquiera de los tres se ve, se edita y se publica exactamente igual,
// sin mandar al usuario a otra sección para tocar algo que ya tenía a mano.
//
// El estado de edición es interno: quien lo monta solo dice con qué secuencia
// arranca y qué hacer cuando se publica.
// ─────────────────────────────────────────────────────────────────────────────

const STEP_TYPE_ICONS = {
  message: MessageSquare, question: GitBranch, link: ExternalLink,
  image: ImageIcon, video: FileVideo, audio: Music2, file: Paperclip,
} as const;

// Mini-mapa de las conexiones que llegan a un paso, con la que se está por cambiar o borrar
// resaltada y las demás atenuadas. Va en el diálogo de gestión: leer "Paso 2 · botón X → Paso 6"
// obliga a reconstruir mentalmente el dibujo, y con varias ramas cayendo en el mismo paso es
// justo donde es fácil borrar la equivocada. El orden de las filas es el MISMO de arriba hacia
// abajo que el de los círculos en el lienzo.
function EdgeTargetPreview({ steps, graph, source }: {
  steps: SequenceStep[];
  graph: { nodes: SeqGraphNode[]; edges: SeqGraphEdge[] };
  source: EdgeManageSource;
}) {
  const targetId = graph.edges.find(e => edgeMatchesSource(e, source))?.toId;
  const target = targetId ? steps.find(s => s.id === targetId) : null;
  if (!targetId || !target) return null;

  const incoming = incomingEdgesInVisualOrder(graph, targetId);
  const ROW_H = 52;
  const height = Math.max(incoming.length * ROW_H, ROW_H);
  const targetPreview = getStepPreview(target, 22);
  const targetIdx = steps.findIndex(s => s.id === targetId);

  const rowColor = (edge: SeqGraphEdge) =>
    edge.colorIdx !== undefined ? BRANCH_COLORS[edge.colorIdx % BRANCH_COLORS.length].hex : "currentColor";

  return (
    <div className="rounded-lg border border-border bg-secondary/20 p-2">
      <p className="text-[9px] text-muted-foreground/70 mb-1">
        {incoming.length > 1
          ? `${incoming.length} caminos terminan en este mismo paso — el resaltado es el que estás tocando`
          : "Este es el camino que estás tocando"}
      </p>
      <div className="flex items-center">
        {/* Los pasos DE DONDE viene cada camino, dibujados como las tarjetas del lienzo: ver el paso
            padre completo (y no solo su número) es lo que hace reconocible cuál se está por tocar. */}
        <div className="flex-1 min-w-0 flex flex-col">
          {incoming.map(({ edge, index }) => {
            const from = steps.find(s => s.id === edge.fromId);
            const fromIdx = steps.findIndex(s => s.id === edge.fromId);
            const fromPreview = from ? getStepPreview(from, 20) : null;
            const isThisOne = edgeMatchesSource(edge, source);
            return (
              <div key={index} className="flex items-center min-w-0" style={{ height: ROW_H }}>
                <div
                  className={`w-full min-w-0 rounded-md border px-2 py-1 ${
                    isThisOne ? "border-primary bg-primary/5" : "border-border/50 bg-background/50 opacity-45"
                  }`}
                >
                  <p className="text-[9px] font-semibold truncate">
                    Paso {fromIdx + 1} · {from ? STEP_TYPE_LABELS[from.type] : "—"}
                  </p>
                  {fromPreview && <p className="text-[9px] text-muted-foreground/70 truncate">{fromPreview}</p>}
                  {edge.label && (
                    <p className="text-[9px] font-medium truncate" style={{ color: rowColor(edge) }}>
                      botón "{edge.label}"
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <svg width={30} height={height} className="shrink-0">
          {incoming.map(({ edge, index }, i) => {
            const y = i * ROW_H + ROW_H / 2;
            const cy = height / 2;
            const isThisOne = edgeMatchesSource(edge, source);
            return (
              <path
                key={index}
                d={`M0,${y} C15,${y} 15,${cy} 30,${cy}`}
                fill="none"
                stroke={rowColor(edge)}
                strokeWidth={isThisOne ? 2 : 1}
                strokeOpacity={isThisOne ? 1 : 0.25}
              />
            );
          })}
        </svg>
        <div className="shrink-0 max-w-[42%] rounded-md border border-primary/50 bg-background px-2 py-1">
          <p className="text-[9px] font-semibold truncate">Paso {targetIdx + 1} · {STEP_TYPE_LABELS[target.type]}</p>
          {targetPreview && <p className="text-[9px] text-muted-foreground/70 truncate">{targetPreview}</p>}
        </div>
      </div>
    </div>
  );
}

// Panel de edición de un solo paso — reemplaza el antiguo item de lista arrastrable: en el modelo
// árbol-primero no hay reordenar por drag, así que este componente es solo el contenido del paso
// seleccionado en el árbol (sin manija de arrastre ni menú de "mover a otra rama").
function StepEditorPanel({
  step, allSteps, onChange, onRemove, onDeleteOption, userId,
}: {
  step: SequenceStep; allSteps: SequenceStep[];
  onChange: (s: SequenceStep) => void; onRemove: () => void; onDeleteOption: (optionId: string) => void; userId: string;
}) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stepIdx = allSteps.findIndex(s => s.id === step.id);

  const isMedia = MEDIA_TYPES.has(step.type);

  const handleTypeChange = (newType: SequenceStep["type"]) => {
    const nowMedia = MEDIA_TYPES.has(newType);
    const wasQuestion = step.type === "question";
    const isQuestion = newType === "question";
    let newOptions = isQuestion ? (step.options ?? []) : step.options;
    let newNextStepId = step.next_step_id ?? null;
    // Un paso normal navega por `next_step_id` y una Pregunta por sus botones: al cambiar de tipo
    // hay que trasvasar la conexión de un lado al otro, o la rama que colgaba de este paso queda
    // suelta en silencio.
    if (isQuestion && !wasQuestion && (newOptions?.length ?? 0) === 0 && newNextStepId && allSteps.some(s => s.id === newNextStepId)) {
      newOptions = [{ id: crypto.randomUUID(), label: "Opción 1", next_step_id: newNextStepId }];
    }
    if (isQuestion) newNextStepId = null; // una pregunta no usa su arista propia
    if (!isQuestion && wasQuestion && !newNextStepId) {
      // Al dejar de ser Pregunta se conserva el destino del primer botón enlazado (los botones no
      // se borran: si vuelve a ser Pregunta, sus ramas siguen ahí intactas).
      newNextStepId = (step.options ?? []).find(o => o.label.trim() && o.next_step_id && allSteps.some(s => s.id === o.next_step_id))?.next_step_id ?? null;
    }
    onChange({
      ...step,
      type: newType,
      next_step_id: newNextStepId,
      // No se borran los botones al salir de "Pregunta" — quedan guardados sin usarse (el resto
      // del código solo los lee cuando type === "question") y se restauran solos si se vuelve a
      // "Pregunta", en vez de perder las ramas ya armadas y dejar sus pasos huérfanos en el árbol.
      options: newOptions,
      // Mismo criterio que options: no se pierde el archivo ya subido por pasar por otro tipo
      // de paso y volver — solo se usa cuando el tipo actual es de medios.
      media: nowMedia ? (step.media ?? []) : step.media,
    });
  };

  const handleFiles = async (files: FileList) => {
    if (!userId) return;
    setUploading(true);
    try {
      const added: SequenceStepMedia[] = [];
      for (const file of Array.from(files)) {
        // Detectar formato real leyendo magic bytes (ignora extensión renombrada)
        const magic = await readMagicBytes(file);
        const realMime = detectRealMime(magic);

        // Si detectamos MOV (QuickTime), bloquearlo aunque la extensión diga .mp4
        if (realMime === "video/quicktime") {
          toast.error(
            `"${file.name}" es un video MOV/QuickTime — WhatsApp no lo soporta aunque tenga extensión .mp4.\n\nConverti el video a MP4 verdadero (H.264) con QuickTime → Exportar como → 1080p, o usa un convertidor online.`,
            { duration: 8000 },
          );
          continue;
        }

        // Usar el MIME real si lo detectamos; si no, confiar en file.type pero normalizarlo
        const effectiveMime = realMime ?? file.type;
        // Normalizar variantes de M4A → audio/mp4 (es lo que WhatsApp acepta)
        const normalizedMime = (effectiveMime === "audio/x-m4a" || effectiveMime === "audio/m4a")
          ? "audio/mp4"
          : effectiveMime;

        const validMimes = WA_VALID_MIME[step.type];
        if (validMimes && normalizedMime && !validMimes.has(normalizedMime)) {
          toast.error(
            `Formato no compatible con WhatsApp: "${file.name}" (${normalizedMime})\nUsa: ${WA_FORMAT_HINT[step.type]}`,
            { duration: 6000 },
          );
          continue;
        }

        const safeName = file.name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._\-]/g, "_");
        const path = `wa-sequences/${userId}/${step.id}/${Date.now()}_${safeName}`;
        const { error } = await supabase.storage.from("form-uploads").upload(path, file, { contentType: normalizedMime || file.type, upsert: true });
        if (error) { toast.error(`Error al subir ${file.name}: ${error.message}`); continue; }
        const { data: { publicUrl } } = supabase.storage.from("form-uploads").getPublicUrl(path);
        added.push({ url: publicUrl, name: file.name, mime_type: normalizedMime || file.type });
      }
      // Reemplazar (no acumular): WhatsApp solo envía 1 archivo por mensaje
      if (added.length) onChange({ ...step, media: added });
    } finally { setUploading(false); }
  };

  const setOption = (i: number, patch: Partial<SequenceStepOption>) => {
    const opts = [...(step.options ?? [])];
    opts[i] = { ...opts[i], ...patch };
    onChange({ ...step, options: opts });
  };

  // "Sin enlazar" incluye next_step_id null y next_step_id colgante (apunta a un paso ya borrado).
  const hasUnlinkedOption = step.type === "question" && (step.options ?? []).some(o => o.label.trim() && (!o.next_step_id || !allSteps.some(s => s.id === o.next_step_id)));

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 py-2 px-3 border-b border-border/60">
        <span className="text-[11px] font-medium text-muted-foreground shrink-0">Paso {stepIdx + 1}</span>
        <select
          value={step.type}
          onChange={e => handleTypeChange(e.target.value as SequenceStep["type"])}
          className="ml-1 h-6 px-1.5 text-base md:text-[10px] rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
        >
          {STEP_TYPE_ORDER.map(t => (
            <option key={t} value={t}>{STEP_TYPE_LABELS[t]}</option>
          ))}
        </select>
        {hasUnlinkedOption && (
          <span title="Hay un botón que todavía no lleva a ningún paso" className="ml-auto w-2 h-2 rounded-full bg-amber-500 shrink-0" />
        )}
        <button onClick={onRemove} className={`${hasUnlinkedOption ? "" : "ml-auto"} p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors`}>
          <Trash2 size={12} />
        </button>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        {/* Texto del mensaje */}
        {step.type === "message" && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-muted-foreground">Mensaje</label>
            <textarea
              value={step.text ?? ""}
              onChange={e => onChange({ ...step, text: e.target.value })}
              placeholder="Texto del mensaje…"
              rows={2}
              className="w-full px-2.5 py-1.5 text-base md:text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
            <div
              role="switch"
              aria-checked={!!step.ai_enhance}
              onClick={() => onChange({ ...step, ai_enhance: !step.ai_enhance })}
              className="flex items-center gap-2 cursor-pointer select-none w-fit group"
            >
              <div className={`relative w-8 h-4 rounded-full border transition-colors shrink-0 ${step.ai_enhance ? "bg-primary border-primary" : "bg-muted border-border"}`}>
                <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-150 ${step.ai_enhance ? "translate-x-4" : "translate-x-0"}`} />
              </div>
              <span className={`flex items-center gap-1 text-[10px] transition-colors ${step.ai_enhance ? "text-primary font-medium" : "text-muted-foreground/60"}`}>
                <Sparkles size={9} />
                IA personaliza al enviar
              </span>
            </div>
            {step.ai_enhance && (
              <p className="text-[9px] text-muted-foreground/70 leading-relaxed ml-10">
                La IA adapta el texto según el contexto de la conversación antes de enviarlo.
              </p>
            )}
          </div>
        )}

        {/* Texto de la pregunta (sin toggle IA — el texto es estructural para el routing) */}
        {step.type === "question" && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-muted-foreground">Pregunta</label>
            <textarea
              value={step.text ?? ""}
              onChange={e => onChange({ ...step, text: e.target.value })}
              placeholder="Texto de la pregunta…"
              rows={2}
              className="w-full px-2.5 py-1.5 text-base md:text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>
        )}

        {/* Opciones para pregunta */}
        {step.type === "question" && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-muted-foreground">Botones</label>
            {(step.options ?? []).map((opt, i) => {
              // Mismo índice de color que usa el árbol (BRANCH_COLORS por posición entre las
              // opciones CON texto) — así el color de cada fila coincide con el de su rama en el lienzo.
              const labeledBefore = (step.options ?? []).slice(0, i).filter(o => o.label.trim()).length;
              const branchColor = opt.label.trim() ? BRANCH_COLORS[labeledBefore % BRANCH_COLORS.length] : null;
              return (
              <div key={opt.id} className={`rounded-lg border p-2 space-y-1.5 ${branchColor ? `${branchColor.border} ${branchColor.bg}` : "border-border/50 bg-secondary/20"}`}>
                <label className={`text-[10px] font-medium ${branchColor ? branchColor.text : "text-muted-foreground/70"}`}>Opción {i + 1}</label>
                {/* Fila 1: número + input + contador + eliminar */}
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] w-4 shrink-0 font-medium ${branchColor ? branchColor.text : "text-muted-foreground/70"}`}>{i + 1}.</span>
                  <input
                    value={opt.label}
                    onChange={e => setOption(i, { label: e.target.value.slice(0, 20) })}
                    maxLength={20}
                    placeholder={`Texto del botón ${i + 1}`}
                    className="flex-1 h-7 px-2 text-base md:text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary/20 min-w-0"
                  />
                  <span className={`text-[10px] tabular-nums shrink-0 ${opt.label.length >= 18 ? "text-amber-500" : "text-muted-foreground/65"}`}>
                    {opt.label.length}/20
                  </span>
                  <button onClick={() => onDeleteOption(opt.id)}
                    className="p-0.5 text-muted-foreground/65 hover:text-destructive shrink-0">
                    <X size={11} />
                  </button>
                </div>
                {/* Destino — de solo lectura: el enlace se arma desde el árbol (clic en el placeholder
                    pendiente o arrastrando la conexión), no desde este editor */}
                <div className="flex items-center gap-1.5 pl-5">
                  {(() => {
                    if (!opt.next_step_id || !allSteps.some(s => s.id === opt.next_step_id)) {
                      return (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          ⚠ Falta decir a dónde lleva — conéctala arriba
                        </span>
                      );
                    }
                    const target = allSteps.find(s => s.id === opt.next_step_id);
                    const targetIdx = target ? allSteps.indexOf(target) : -1;
                    const preview = target && (
                      (target.type === "question" || target.type === "message") ? target.text?.trim().slice(0, 24)
                      : target.type === "link" ? target.link_url?.slice(0, 24)
                      : target.media?.[0]?.name?.slice(0, 20) ?? null
                    );
                    return (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
                        <ChevronRight size={10} className="shrink-0" />
                        {target ? `Paso ${targetIdx + 1} · ${STEP_TYPE_LABELS[target.type]}${preview ? `: ${preview}` : ""}` : "Paso eliminado"}
                      </span>
                    );
                  })()}
                </div>
              </div>
              );
            })}
            {(step.options?.length ?? 0) === 0 && (
              <p className="text-[10px] text-muted-foreground/50 italic">Sin botones todavía — agrégalos con el "+" amarillo de esta pregunta, arriba.</p>
            )}
            <p className="text-[10px] text-muted-foreground/65">Botones interactivos · máx. 3 · 20 caracteres c/u</p>
          </div>
        )}

        {/* Link con botón CTA */}
        {step.type === LINK_TYPE && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-muted-foreground">URL del link</label>
            <input
              value={step.link_url ?? ""}
              onChange={e => onChange({ ...step, link_url: e.target.value })}
              // Meta exige URL absoluta para el botón CTA: sin https:// el
              // mensaje llega pero el botón no abre nada. Se completa al salir.
              onBlur={() => {
                const raw = (step.link_url ?? "").trim();
                const fixed = normalizeUrl(raw);
                if (fixed && fixed !== raw) onChange({ ...step, link_url: fixed });
              }}
              placeholder="https://ejemplo.com"
              type="url"
              className={`w-full h-7 px-2.5 text-base md:text-xs rounded-lg border bg-background focus:outline-none focus:ring-2 ${
                (step.link_url ?? "").trim() && !normalizeUrl(step.link_url)
                  ? "border-destructive focus:ring-destructive/20"
                  : "border-input focus:ring-primary/20"
              }`}
            />
            {(step.link_url ?? "").trim() && !normalizeUrl(step.link_url) && (
              <p className="text-[10px] text-destructive">
                No parece una dirección web válida. Debe ser algo como <strong>https://ejemplo.com</strong>.
              </p>
            )}
            <label className="text-[10px] font-medium text-muted-foreground">Texto del botón (CTA)</label>
            <div className="flex items-center gap-2">
              <input
                value={step.link_label ?? ""}
                onChange={e => onChange({ ...step, link_label: e.target.value.slice(0, 20) })}
                maxLength={20}
                placeholder="Texto del botón"
                className="flex-1 h-7 px-2.5 text-base md:text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-0"
              />
              <span className={`text-[10px] tabular-nums shrink-0 ${(step.link_label?.length ?? 0) >= 18 ? "text-amber-500" : "text-muted-foreground/65"}`}>
                {step.link_label?.length ?? 0}/20
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground/65">Botón CTA WhatsApp · el receptor lo toca y abre el link</p>
          </div>
        )}

        {/* Media: imagen / video / audio / archivo */}
        {isMedia && (
          <>
            {/* Lista de archivos subidos */}
            {(step.media ?? []).length > 0 && (
              <div className="space-y-1">
                {(step.media ?? []).map((m, i) => (
                  <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border/60 bg-secondary/30">
                    <Paperclip size={11} className="text-muted-foreground/70 shrink-0" />
                    <span className="flex-1 text-xs truncate text-muted-foreground">{m.name}</span>
                    <button onClick={() => onChange({ ...step, media: (step.media ?? []).filter((_, j) => j !== i) })}
                      className="p-0.5 text-muted-foreground/65 hover:text-destructive shrink-0">
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {/* Botón subir */}
            <input
              ref={fileInputRef}
              type="file"
              accept={STEP_ACCEPT[step.type as keyof typeof STEP_ACCEPT] ?? "*"}
              className="hidden"
              onChange={e => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = ""; }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center justify-center gap-1.5 w-full h-8 rounded-lg border border-dashed border-border text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors disabled:opacity-50"
            >
              {uploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
              {uploading ? "Subiendo…" : `+ Agregar ${STEP_TYPE_LABELS[step.type].toLowerCase()}`}
            </button>
            {WA_FORMAT_HINT[step.type] && (
              <p className="text-[10px] text-center text-muted-foreground/70">
                WhatsApp: {WA_FORMAT_HINT[step.type]}
              </p>
            )}
            {/* Caption opcional (no aplica para audio) */}
            {step.type !== "audio" && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-muted-foreground">Caption (opcional)</label>
                <Textarea
                  value={step.text ?? ""}
                  onChange={e => onChange({ ...step, text: e.target.value })}
                  placeholder="Caption / texto acompañante (opcional)"
                  rows={2}
                  className="w-full min-h-0 px-2.5 py-1.5 text-base md:text-xs rounded-lg border border-input bg-background focus:outline-none resize-none"
                />
                {step.text?.trim() && (
                  <div
                    role="switch"
                    aria-checked={!!step.ai_enhance}
                    onClick={() => onChange({ ...step, ai_enhance: !step.ai_enhance })}
                    className="flex items-center gap-2 cursor-pointer select-none w-fit"
                  >
                    <div className={`relative w-8 h-4 rounded-full border transition-colors shrink-0 ${step.ai_enhance ? "bg-primary border-primary" : "bg-muted border-border"}`}>
                      <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-150 ${step.ai_enhance ? "translate-x-4" : "translate-x-0"}`} />
                    </div>
                    <span className={`flex items-center gap-1 text-[10px] transition-colors ${step.ai_enhance ? "text-primary font-medium" : "text-muted-foreground/60"}`}>
                      <Sparkles size={9} />
                      IA personaliza al enviar
                    </span>
                  </div>
                )}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}

export function SequenceEditor({
  initial, userId, onClose, onPublished, closeIcon = "arrow",
}: {
  /** Secuencia con la que arranca el editor. Se normaliza al montar. */
  initial: DraftSequence;
  userId: string;
  onClose: () => void;
  /** Se llama al publicar, con la fila ya guardada — quien monta decide qué hacer con ella. */
  onPublished?: (saved: CrmWaSequence) => void;
  closeIcon?: "arrow" | "x";
}) {
  const upsertSequence = useUpsertWaSequence();
  const [editingSeq, setEditingSeq] = useState<DraftSequence>(() => ({
    ...initial,
    steps: normalizeSequenceSteps(initial.steps),
  }));
  const [publishing, setPublishing] = useState(false);

  // Autoguardado del borrador: la instantánea es lo último que quedó guardado (o lo que había al
  // abrir), para no reescribir en la base cada vez que el componente se vuelve a renderizar.
  const autosaveSnapshot = useRef<string | null>(null);
  const autosaveInFlight = useRef(false);
  // Un cambio hecho MIENTRAS se está guardando se anota acá: sin esto se perdía hasta la siguiente
  // edición (el guardado en curso marcaba como guardada una instantánea ya vieja y el efecto no se
  // volvía a disparar solo). El tick fuerza esa nueva vuelta.
  const autosavePending = useRef(false);
  const [autosaveTick, setAutosaveTick] = useState(0);
  const [draftSaveState, setDraftSaveState] = useState<"idle" | "saving" | "saved">("idle");

  // Autoguardado en borrador: cada cambio del editor se persiste solo, con un respiro de 1,2 s para
  // no escribir en cada tecla. Escribe SIEMPRE en `draft_steps`, nunca en `steps` — así una secuencia
  // que un flujo activo ya está usando sigue corriendo su versión publicada mientras se la edita, y
  // el trabajo a medio hacer (con botones sin conectar incluidos) nunca llega a un cliente real.
  useEffect(() => {
    const snapshot = JSON.stringify({ name: editingSeq.name, steps: editingSeq.steps });
    if (autosaveSnapshot.current === null) { autosaveSnapshot.current = snapshot; return; }
    if (autosaveSnapshot.current === snapshot) return;
    // Todavía no hay nada que valga la pena guardar (secuencia recién abierta y vacía).
    if (!editingSeq.name.trim() && editingSeq.steps.length === 0) return;

    const timer = setTimeout(async () => {
      // Dos guardados en paralelo sin id crearían DOS secuencias, y con id podrían llegar fuera de
      // orden: se deja pasar solo uno por vez y el que quedó afuera se reintenta al terminar.
      if (autosaveInFlight.current) { autosavePending.current = true; return; }
      autosaveInFlight.current = true;
      setDraftSaveState("saving");
      try {
        const saved = await upsertSequence.mutateAsync({
          id: editingSeq.id,
          name: editingSeq.name.trim() || "Secuencia sin nombre",
          draft_steps: editingSeq.steps,
          // Una secuencia nueva nace como borrador: no debe poder asignarse a un flujo hasta publicarse.
          ...(editingSeq.id ? {} : { status: "draft" as const }),
        });
        autosaveSnapshot.current = snapshot;
        if (!editingSeq.id) setEditingSeq(seq => ({ ...seq, id: saved.id, status: saved.status }));
        setDraftSaveState("saved");
      } catch {
        setDraftSaveState("idle"); // se reintenta con el próximo cambio
      } finally {
        autosaveInFlight.current = false;
        if (autosavePending.current) { autosavePending.current = false; setAutosaveTick(t => t + 1); }
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [editingSeq, autosaveTick]); // eslint-disable-line react-hooks/exhaustive-deps

  // Una rama = una arista saliente de una pregunta, es decir un botón con texto. `targetId` null
  // significa que ese botón todavía no tiene destino (se dibuja como el recuadro "+ crear paso").
  // Todo por id: ni índices del arreglo ni el texto del botón (dos botones pueden repetirlo).
  const activeBranches = useMemo(() => {
    type Branch = { label: string; questionId: string; optionId: string; targetId: string | null };
    const ids = new Set(editingSeq.steps.map(s => s.id));
    const result: Branch[] = [];
    for (const s of editingSeq.steps) {
      if (s.type !== "question") continue;
      for (const o of s.options ?? []) {
        if (!o.label.trim()) continue;
        result.push({
          label: o.label,
          questionId: s.id,
          optionId: o.id,
          // Una referencia colgante (a un paso ya borrado) cuenta como "sin destino": mejor
          // mostrarla como rama pendiente que como un callejón sin salida invisible.
          targetId: o.next_step_id && ids.has(o.next_step_id) ? o.next_step_id : null,
        });
      }
    }
    return result;
  }, [editingSeq]);

  // Salidas de una pregunta que no llevan a ningún paso. En WhatsApp esto le deja al contacto un
  // botón que, al tocarlo, no responde nada y corta la conversación en seco — así que bloquean el
  // guardado en vez de publicarse rotas. Cada issue apunta al botón exacto para poder resolverlo
  // de un toque desde el aviso.
  const sequenceIssues = useMemo(() => {
    const stepNumber = new Map(editingSeq.steps.map((s, i) => [s.id, i + 1]));
    const issues: { questionId: string; optionId?: string; text: string }[] = [];
    for (const s of editingSeq.steps) {
      if (s.type !== "question") continue;
      const branches = activeBranches.filter(b => b.questionId === s.id);
      if (branches.length === 0) {
        // Sin ningún botón con texto la pregunta no tiene salidas: el contacto responde y no pasa nada.
        issues.push({ questionId: s.id, text: `Paso ${stepNumber.get(s.id)} · la pregunta no tiene botones` });
        continue;
      }
      for (const b of branches) {
        if (!b.targetId) {
          issues.push({ questionId: s.id, optionId: b.optionId, text: `Paso ${stepNumber.get(s.id)} · botón "${b.label}" sin respuesta` });
        }
      }
    }
    return issues;
  }, [editingSeq, activeBranches]);

  // Paso seleccionado en el árbol — su editor se muestra debajo (modelo árbol-primero: ya no
  // hay lista lineal con drag-and-drop, el árbol ES el lienzo principal).
  const [treeSelectedStepId, setTreeSelectedStepId] = useState<string | null>(null);
  const flashStep = (id: string) => setTreeSelectedStepId(id);

  // Qué paso se está creando desde el árbol — se resuelve al elegir el tipo en el selector
  // (ver <PendingStepCreate>), en vez de crear directo con tipo "message" por defecto.
  const [pendingStepCreate, setPendingStepCreate] = useState<PendingStepCreate | null>(null);
  // Punto del árbol desde el que se puede crear un paso NUEVO o CONECTAR a uno ya existente
  // (comparte un nodo resultado con otra rama, sin duplicar contenido) — tocar un botón
  // pendiente, o el "+" de continuar tras un nodo hoja, abren el mismo flujo de elección.
  type ConnectFlowSource =
    | { kind: "option"; questionStepId: string; optionId: string }
    | { kind: "after"; afterStepId: string };
  const [pendingConnectFlow, setPendingConnectFlow] = useState<ConnectFlowSource | null>(null);
  // Conexión YA existente que se tocó (el círculo al final de la línea) — igual que
  // pendingConnectFlow pero para gestionar un enlace que ya tiene destino: cambiarlo o quitarlo.
  // Se toca en vez de arrastrar — más simple y funciona igual en mobile.
  const [pendingEdgeManage, setPendingEdgeManage] = useState<EdgeManageSource | null>(null);
  // "Modo conexión": elegir el paso destino tocándolo DIRECTO EN EL LIENZO en vez de buscarlo en
  // una lista. Mientras está activo, el árbol resalta con un halo los pasos a los que sí se puede
  // conectar, atenúa el resto y desactiva el resto de acciones — conectar es una operación
  // espacial ("de acá hasta allá"), y verla sobre el mismo dibujo evita tener que traducir
  // mentalmente entre "Paso 6" de una lista y el nodo del árbol.
  // currentTargetId: destino actual al cambiar una conexión ya existente (no se ofrece de nuevo).
  const [pickingTarget, setPickingTarget] = useState<{ source: EdgeManageSource; currentTargetId: string | null } | null>(null);
  // Paso a eliminar cuando tiene contenido en el árbol que depende solo de él (una rama entera,
  // o lo que sigue después de la cabeza de una rama) — se pide elegir entre borrar todo o
  // unificar (borrar solo este paso y conectar directo lo anterior con lo siguiente).
  // unifySuccessorId: string | null = unificar disponible, conecta a ese id (o a nada si null);
  // undefined = unificar no está disponible (el paso tiene 2+ ramas reales, sin un único "siguiente").
  const [pendingDeleteStep, setPendingDeleteStep] = useState<{
    id: string; cascadeIds: string[]; unifySuccessorId: string | null | undefined;
    branchOptions?: { label: string; successorId: string; discardedIds: string[] }[];
  } | null>(null);
  // Botón a eliminar cuando tiene un paso enlazado que depende solo de él.
  const [pendingDeleteOption, setPendingDeleteOption] = useState<{ questionId: string; optionId: string; orphanIds: string[] } | null>(null);

  // Crea un paso nuevo y lo enlaza al toque a un botón de pregunta que todavía no tiene
  // destino — evita el ida-y-vuelta de crear el paso abajo y luego volver a la pregunta
  // para enlazarlo.
  const createLinkedStepForOption = (questionStepId: string, optionId: string, type: SequenceStep["type"]) => {
    const inserted = newStep(type);
    setEditingSeq(seq => ({
      ...seq,
      // Se agrega al final (el arreglo nunca se reordena) y se enlaza por el id propio del botón,
      // nunca por texto ni posición: 2 botones de una misma pregunta pueden tener el mismo texto.
      steps: stepsWithRewiredOption([...seq.steps, inserted], questionStepId, optionId, inserted.id),
    }));
    flashStep(inserted.id);
  };

  // Primer paso de una secuencia vacía — dispara el prompt inicial cuando aún no hay árbol.
  const createFirstStep = (type: SequenceStep["type"]) => {
    const inserted = newStep(type);
    setEditingSeq(s => ({ ...s, steps: [inserted] }));
    flashStep(inserted.id);
  };

  // Agrega un paso a continuación de uno existente (nodo "hoja" del árbol, sin hijos aún): nodo
  // nuevo al final del arreglo + arista explícita desde `afterStepId` hacia él. Nada más se toca,
  // así que ningún otro paso cambia de número ni de conexiones.
  const insertStepAfter = (afterStepId: string, type: SequenceStep["type"]) => {
    const inserted = newStep(type);
    setEditingSeq(seq => ({
      ...seq,
      steps: [...seq.steps, inserted].map(s => s.id === afterStepId ? { ...s, next_step_id: inserted.id } : s),
    }));
    flashStep(inserted.id);
  };

  // Aplica (crea, cambia o quita) el destino de una conexión manejable — un solo lugar usado
  // tanto para enlazarla la primera vez (desde un botón pendiente o un paso hoja) como para
  // cambiarla o quitarla después (tocando el círculo al final de la línea ya existente). Fijar
  // el enlace de un paso normal (`kind: "step"`) no inserta ningún nodo de más: el paso que ya
  // llevaba a `afterStepId`/`stepId` sigue enlazado exactamente igual, esto solo agrega o mueve
  // la conexión saliente de este paso puntual — puede terminar con 2+ padres en el destino.
  const applyEdgeTarget = (source: EdgeManageSource, newTargetId: string | null) => {
    setEditingSeq(seq => ({ ...seq, steps: stepsWithEdgeTarget(seq.steps, source, newTargetId) }));
    if (newTargetId) flashStep(source.kind === "option" ? source.questionId : source.stepId);
  };

  // Ids que quedarían sin conexión si se cambia o quita esta conexión — mismo criterio de "rama
  // suelta" que ya usan el borrado de pasos y de botones.
  const computeEdgeChangeOrphans = (source: EdgeManageSource, newTargetId: string | null): string[] => {
    const before = getReachableStepIds(editingSeq.steps);
    const after = getReachableStepIds(stepsWithEdgeTarget(editingSeq.steps, source, newTargetId));
    return [...before].filter(id => !after.has(id));
  };

  // Describe "de cuál conexión estamos hablando" en texto plano — imprescindible cuando 2+ ramas
  // comparten un nodo resultado, para no depender de adivinar cuál círculo es cuál en el lienzo.
  const describeEdgeSource = (source: EdgeManageSource): { text: string; currentTargetId: string | null } | null => {
    const fromStepId = source.kind === "option" ? source.questionId : source.stepId;
    const fromStep = editingSeq.steps.find(s => s.id === fromStepId);
    if (!fromStep) return null;
    const fromIdx = editingSeq.steps.indexOf(fromStep);
    const fromPreview = getStepPreview(fromStep, 26);
    const option = source.kind === "option" ? fromStep.options?.find(o => o.id === source.optionId) : null;
    const currentTargetId = source.kind === "option" ? (option?.next_step_id ?? null) : (fromStep.next_step_id ?? null);
    const toStep = currentTargetId ? editingSeq.steps.find(s => s.id === currentTargetId) : null;
    const toIdx = toStep ? editingSeq.steps.indexOf(toStep) : -1;
    const toPreview = toStep ? getStepPreview(toStep, 26) : null;
    const fromLabel = `Paso ${fromIdx + 1}${option ? ` · botón "${option.label}"` : ""} (${STEP_TYPE_LABELS[fromStep.type]}${fromPreview ? `: ${fromPreview}` : ""})`;
    const toLabel = toStep ? `Paso ${toIdx + 1} (${STEP_TYPE_LABELS[toStep.type]}${toPreview ? `: ${toPreview}` : ""})` : "todavía sin conectar";
    return { text: `${fromLabel} → ${toLabel}`, currentTargetId };
  };

  // Intercala un paso nuevo en medio de una conexión ya existente (el "+" sobre la línea): el
  // nodo nuevo se agrega al final del arreglo, la arista `from → to` pasa a apuntarle, y él toma
  // `to` como destino. Si el paso intercalado es una Pregunta no puede heredar `to` por su arista
  // propia (una pregunta navega por botones), así que nace con un botón que va a `to` — si no, todo
  // lo que colgaba de esa conexión quedaría suelto.
  const insertStepOnEdge = (fromId: string, toId: string, optionId: string | undefined, type: SequenceStep["type"]) => {
    const base = newStep(type);
    const inserted: SequenceStep = type === "question"
      ? { ...base, options: [{ id: crypto.randomUUID(), label: "Opción 1", next_step_id: toId }] }
      : { ...base, next_step_id: toId };
    setEditingSeq(seq => {
      if (!seq.steps.some(s => s.id === toId)) return seq;
      const steps = [...seq.steps, inserted];
      return {
        ...seq,
        steps: optionId
          ? stepsWithRewiredOption(steps, fromId, optionId, inserted.id)
          : steps.map(st => st.id === fromId && st.next_step_id === toId ? { ...st, next_step_id: inserted.id } : st),
      };
    });
    flashStep(inserted.id);
  };

  // Resuelve la creación pendiente una vez el usuario elige el tipo de paso en el selector.
  const resolvePendingStepCreate = (type: SequenceStep["type"]) => {
    const pending = pendingStepCreate;
    if (!pending) return;
    setPendingStepCreate(null);
    if (pending.kind === "first") createFirstStep(type);
    else if (pending.kind === "after") insertStepAfter(pending.afterStepId, type);
    else if (pending.kind === "edge") insertStepOnEdge(pending.fromId, pending.toId, pending.optionId, type);
    else if (pending.kind === "option") createLinkedStepForOption(pending.questionStepId, pending.optionId, type);
  };

  // Calcula qué pasa si se elimina un paso:
  // - `cascadeIds`: ids que dependen únicamente de él (todas sus ramas, si es una pregunta con
  //   ramas reales; o lo que sigue después de él, si es la cabeza de una rama) — se pierden con
  //   él si se elige "eliminar todo".
  // - `unifySuccessorId`: a qué paso reconectar lo anterior si en vez de eso se elige "unificar"
  //   (borrar SOLO este paso, sin tocar el resto): un id concreto, `null` si no tiene siguiente
  //   (queda sin conectar), o `undefined` si no hay un único "siguiente" posible (pregunta con
  //   2+ ramas reales — ahí no se ofrece unificar liso, sino `branchOptions`).
  // - `branchOptions`: solo si es una pregunta con 2+ ramas reales — una opción por rama para
  //   CONSERVARLA (reconectando lo anterior directo a ella, sin importar si es una cadena larga
  //   sin bifurcaciones o una sub-rama con más preguntas adentro) mientras se descartan las demás.
  const computeDeletionImpact = (stepId: string): {
    cascadeIds: string[];
    unifySuccessorId: string | null | undefined;
    branchOptions?: { label: string; successorId: string; discardedIds: string[] }[];
  } => {
    const steps = editingSeq.steps;
    const step = steps.find(s => s.id === stepId);
    if (!step) return { cascadeIds: [], unifySuccessorId: undefined };

    // Basado en alcanzabilidad real del grafo (mismo mecanismo que las validaciones de "rama
    // suelta" del borrado de botones y el arrastre de conexiones) en vez de rangos de índices del
    // arreglo — más simple y sin los casos límite de la versión anterior (que necesitó un parche
    // especial tras un bug real donde un id que una rama elegía CONSERVAR terminaba también en su
    // propia lista de descarte).
    const reachableBefore = getReachableStepIds(steps);
    // Simula "borrar este paso y reconectar lo que apuntaba a él hacia `successorId`" (o
    // desconectarlo si es null) — sirve tanto para "eliminar todo" (successorId=null) como para
    // calcular, por cada rama posible, qué queda huérfano si esa rama es la que se conserva.
    const reachableIfRewiredTo = (successorId: string | null): Set<string> =>
      getReachableStepIds(stepsAfterDeleting(steps, stepId, [], successorId));

    const reachableAfterFullDelete = reachableIfRewiredTo(null);
    const cascadeIds = [...reachableBefore].filter(id => id !== stepId && !reachableAfterFullDelete.has(id));

    let unifySuccessorId: string | null | undefined;
    let branchOptions: { label: string; successorId: string; discardedIds: string[] }[] | undefined;

    if (step.type === "question") {
      // Destinos distintos: 2 botones que llevan al mismo paso son una sola opción de "conservar".
      const realBranches = activeBranches
        .filter(b => b.questionId === stepId && b.targetId)
        .filter((b, i, arr) => arr.findIndex(x => x.targetId === b.targetId) === i);
      if (realBranches.length === 1) {
        unifySuccessorId = realBranches[0].targetId ?? null;
      } else if (realBranches.length > 1) {
        unifySuccessorId = undefined;
        branchOptions = realBranches.map(b => {
          const successorId = b.targetId!;
          const reachableKeepingThis = reachableIfRewiredTo(successorId);
          const discardedIds = [...reachableBefore].filter(id => id !== stepId && id !== successorId && !reachableKeepingThis.has(id));
          return { label: b.label, successorId, discardedIds };
        });
      } else {
        unifySuccessorId = null; // pregunta sin ramas reales — no tiene "siguiente"
      }
    } else {
      unifySuccessorId = step.next_step_id ?? null;
    }

    return { cascadeIds, unifySuccessorId, branchOptions };
  };

  // Elimina un paso: siempre quita `stepId` + `discardedIds` (lo que se pierde con él), y
  // reconecta cualquier opción que apuntara a `stepId` hacia `successorId` (o la desenlaza si es
  // `null`). Cubre los 3 casos del diálogo: "eliminar todo" (discardedIds = cascadeIds,
  // successorId = null), "unificar" (discardedIds = [], successorId = unifySuccessorId) y
  // "conservar esta rama" (discardedIds = las otras ramas, successorId = la rama elegida).
  const deleteStepWithRewire = (stepId: string, discardedIds: string[], successorId: string | null) => {
    setEditingSeq(s => ({ ...s, steps: stepsAfterDeleting(s.steps, stepId, discardedIds, successorId) }));
    setTreeSelectedStepId(successorId);
    setPendingDeleteStep(null);
  };

  // Ids que dependen únicamente de un botón específico (no del paso Pregunta completo) — se
  // pierden si se borra ese botón desde el editor. Mismo criterio de "rama suelta" que ya se usa
  // al borrar un paso o al reconectar una conexión por arrastre.
  const computeOptionDeletionOrphans = (questionId: string, optionId: string): string[] => {
    const before = getReachableStepIds(editingSeq.steps);
    const hypothetical = editingSeq.steps.map(st => st.id !== questionId ? st : { ...st, options: (st.options ?? []).filter(o => o.id !== optionId) });
    const after = getReachableStepIds(hypothetical);
    return [...before].filter(id => !after.has(id));
  };

  // Quita el botón `optionId` de `questionId` y, si tenía contenido que dependía solo de él,
  // también ese contenido — así nunca queda una rama suelta invisible en el árbol.
  const deleteOptionWithCascade = (questionId: string, optionId: string, orphanIds: string[]) => {
    setEditingSeq(s => {
      const withOptionRemoved = s.steps.map(st => st.id !== questionId ? st : { ...st, options: (st.options ?? []).filter(o => o.id !== optionId) });
      return { ...s, steps: stepsWithoutIds(withOptionRemoved, new Set(orphanIds)) };
    });
    setPendingDeleteOption(null);
  };

  // Agrega un botón nuevo a una pregunta directo desde el árbol (sin abrir su editor) — queda
  // sin enlazar (aparece como placeholder pendiente) y se selecciona la pregunta para que el
  // usuario le ponga un texto real al botón desde su panel de edición.
  const addOptionToQuestion = (questionId: string) => {
    setEditingSeq(seq => {
      const steps = seq.steps.map(s => {
        if (s.id !== questionId) return s;
        // Evita repetir un texto ya usado (ej. tras borrar "Opción 1" y agregar uno nuevo, el
        // conteo simple volvería a proponer "Opción 2" si ya existe) — 2 botones con el mismo
        // texto confunden al usuario final de WhatsApp, aunque ya no rompan el enlazado interno.
        const existingLabels = new Set((s.options ?? []).map(o => o.label));
        let n = (s.options?.length ?? 0) + 1;
        while (existingLabels.has(`Opción ${n}`)) n++;
        return { ...s, options: [...(s.options ?? []), { id: crypto.randomUUID(), label: `Opción ${n}`, next_step_id: null }] };
      });
      return { ...seq, steps };
    });
    setTreeSelectedStepId(questionId);
  };

  const sequenceGraph = useMemo(() => {
    if (editingSeq.steps.length === 0) return null;
    return buildSequenceGraph(editingSeq.steps);
  }, [editingSeq]);

  // Punto de llegada de cada conexión sobre la caja del paso destino: cuando varias terminan en el
  // mismo paso se reparten en vertical, EN EL MISMO ORDEN de arriba hacia abajo en que salen sus
  // orígenes (ver incomingEdgesInVisualOrder) — así el círculo de más arriba siempre corresponde a
  // la rama de más arriba, y el diálogo de gestión lista los caminos en ese mismo orden.
  const edgePorts = useMemo(() => {
    const ports = new Map<number, number>(); // índice de arista → desplazamiento vertical
    if (!sequenceGraph) return ports;
    for (const targetId of new Set(sequenceGraph.edges.map(e => e.toId))) {
      const incoming = incomingEdgesInVisualOrder(sequenceGraph, targetId);
      if (incoming.length < 2) continue;
      const gap = edgePortGap(incoming.length);
      incoming.forEach(({ index }, i) => ports.set(index, (i - (incoming.length - 1) / 2) * gap));
    }
    return ports;
  }, [sequenceGraph]);

  // Geometría de cada arista, calculada una sola vez: la usan las DOS capas del lienzo (las líneas,
  // que van detrás de los nodos, y los controles tocables, que van siempre delante).
  const edgeGeometry = useMemo(() => {
    if (!sequenceGraph) return [];
    return sequenceGraph.edges.flatMap((edge, ei) => {
      const from = sequenceGraph.nodes.find(n => n.id === edge.fromId);
      const to = sequenceGraph.nodes.find(n => n.id === edge.toId);
      if (!from || !to) return [];
      const sx = from.depth * SEQ_TREE_COL_PITCH + SEQ_TREE_NODE_W;
      const sy = edgeSourceY(from, edge.colorIdx);
      const tx = to.depth * SEQ_TREE_COL_PITCH;
      // Varias conexiones pueden terminar en el mismo paso. En vez de superponerlas en un único
      // punto (donde solo la de encima sería tocable), cada una llega a su propio punto sobre el
      // borde del destino, repartidos de arriba hacia abajo en el orden visual de sus orígenes.
      const py = to.lane * SEQ_TREE_ROW_PITCH + SEQ_TREE_NODE_H / 2 + (edgePorts.get(ei) ?? 0);
      return [{
        edge, ei, to,
        sx, sy, tx, py,
        midX: (sx + tx) / 2,
        midY: (sy + py) / 2,
        color: edge.colorIdx !== undefined ? BRANCH_COLORS[edge.colorIdx % BRANCH_COLORS.length].hex : "currentColor",
      }];
    });
  }, [sequenceGraph, edgePorts]);

  // Pasos a los que se puede conectar mientras el lienzo está en modo conexión: solo los de un
  // nivel estrictamente más profundo que el origen (ver canConnectForward — con eso alcanza para
  // que nunca se pueda cerrar un ciclo), y nunca el destino que esa conexión ya tiene.
  const pickableTargetIds = useMemo(() => {
    if (!pickingTarget || !sequenceGraph) return new Set<string>();
    const sourceId = pickingTarget.source.kind === "option" ? pickingTarget.source.questionId : pickingTarget.source.stepId;
    return new Set(
      sequenceGraph.nodes
        .filter(n => !n.pending && n.id !== pickingTarget.currentTargetId && canConnectForward(sequenceGraph.nodes, sourceId, n.id))
        .map(n => n.id),
    );
  }, [pickingTarget, sequenceGraph]);

  // Abre el modo conexión para una arista concreta, cerrando el diálogo desde el que se llamó.
  const startPickingTarget = (source: EdgeManageSource, currentTargetId: string | null) => {
    setPendingConnectFlow(null);
    setPendingEdgeManage(null);
    setPickingTarget({ source, currentTargetId });
  };

  // Confirma el destino tocado en el lienzo. La validación de "rama suelta" es la misma que tenía
  // la lista: si mover esta conexión dejaría contenido sin forma de llegar, no se aplica.
  const confirmPickedTarget = (targetId: string) => {
    if (!pickingTarget) return;
    const orphaned = computeEdgeChangeOrphans(pickingTarget.source, targetId);
    if (orphaned.length > 0) {
      toast.error(`Si conectas aquí, ${orphaned.length} paso${orphaned.length !== 1 ? "s quedarían" : " quedaría"} sin forma de llegar. Reconéctalo${orphaned.length !== 1 ? "s" : ""} o bórralo${orphaned.length !== 1 ? "s" : ""} primero.`);
      return;
    }
    applyEdgeTarget(pickingTarget.source, targetId);
    setPickingTarget(null);
  };

  const handleSaveSequence = async () => {
    if (!editingSeq.name.trim()) { toast.error("Ponle un nombre a la secuencia"); return; }
    if (sequenceIssues.length > 0) {
      toast.error(
        sequenceIssues.length === 1
          ? `Falta conectar una respuesta: ${sequenceIssues[0].text}`
          : `Faltan ${sequenceIssues.length} respuestas por conectar:\n${sequenceIssues.map(i => `· ${i.text}`).join("\n")}`,
        { duration: 6000 },
      );
      return;
    }
    setPublishing(true);
    try {
      // Publicar: recién acá el borrador pasa a ser la versión que corre en las conversaciones.
      const saved = await upsertSequence.mutateAsync({
        id: editingSeq.id, name: editingSeq.name,
        steps: editingSeq.steps, draft_steps: null, status: "published",
      });
      toast.success(editingSeq.status === "published" ? "Secuencia actualizada" : "Secuencia publicada");
      onPublished?.(saved);
      onClose();
    } catch (e: any) {
      toast.error(e?.message?.slice(0, 120) ?? "Error al guardar la secuencia");
    } finally { setPublishing(false); }
  };

  return (
    <>
      <Dialog open={!!pendingStepCreate} onOpenChange={open => !open && setPendingStepCreate(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">¿Qué tipo de paso quieres crear?</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 pt-1">
            {STEP_TYPE_ORDER.map(t => {
              const Icon = STEP_TYPE_ICONS[t];
              return (
                <button
                  key={t}
                  onClick={() => resolvePendingStepCreate(t)}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-xs font-medium"
                >
                  <Icon size={18} className="text-muted-foreground" />
                  {STEP_TYPE_LABELS[t]}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!pendingConnectFlow} onOpenChange={open => !open && setPendingConnectFlow(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">¿Qué sigue después de esto?</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-1">
            <button
              onClick={() => {
                if (!pendingConnectFlow) return;
                setPendingStepCreate(pendingConnectFlow.kind === "option"
                  ? { kind: "option", questionStepId: pendingConnectFlow.questionStepId, optionId: pendingConnectFlow.optionId }
                  : { kind: "after", afterStepId: pendingConnectFlow.afterStepId });
                setPendingConnectFlow(null);
              }}
              className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
            >
              Crear paso nuevo
            </button>
            <button
              onClick={() => {
                if (!pendingConnectFlow) return;
                startPickingTarget(
                  pendingConnectFlow.kind === "option"
                    ? { kind: "option", questionId: pendingConnectFlow.questionStepId, optionId: pendingConnectFlow.optionId }
                    : { kind: "step", stepId: pendingConnectFlow.afterStepId },
                  null,
                );
              }}
              className="h-10 px-4 rounded-xl border border-primary/40 text-primary text-xs font-medium hover:bg-primary/5 transition-colors"
            >
              Llevar a un paso que ya existe
            </button>
            <button
              onClick={() => setPendingConnectFlow(null)}
              className="h-9 px-4 rounded-xl border text-xs text-muted-foreground hover:bg-secondary transition-colors"
            >
              Cancelar
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!pendingEdgeManage} onOpenChange={open => !open && setPendingEdgeManage(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">¿Qué quieres hacer con este camino?</DialogTitle>
          </DialogHeader>
          {pendingEdgeManage && sequenceGraph && (
            <EdgeTargetPreview steps={editingSeq.steps} graph={sequenceGraph} source={pendingEdgeManage} />
          )}
          <div className="flex flex-col gap-2 pt-1">
            <button
              onClick={() => {
                if (!pendingEdgeManage) return;
                startPickingTarget(pendingEdgeManage, describeEdgeSource(pendingEdgeManage)?.currentTargetId ?? null);
              }}
              className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
            >
              Cambiar a dónde lleva
            </button>
            <button
              onClick={() => {
                if (!pendingEdgeManage) return;
                const orphaned = computeEdgeChangeOrphans(pendingEdgeManage, null);
                if (orphaned.length > 0) {
                  toast.error(`Si quitas esta conexión, ${orphaned.length} paso${orphaned.length !== 1 ? "s quedarían" : " quedaría"} sin forma de llegar. Bórralo${orphaned.length !== 1 ? "s" : ""} primero.`);
                  return;
                }
                applyEdgeTarget(pendingEdgeManage, null);
                setPendingEdgeManage(null);
              }}
              className="h-10 px-4 rounded-xl border border-destructive/40 text-destructive text-xs font-medium hover:bg-destructive/5 transition-colors"
            >
              Quitar este camino
            </button>
            <button
              onClick={() => setPendingEdgeManage(null)}
              className="h-9 px-4 rounded-xl border text-xs text-muted-foreground hover:bg-secondary transition-colors"
            >
              Cancelar
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!pendingDeleteStep} onOpenChange={open => !open && setPendingDeleteStep(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Después de este paso hay más contenido</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-sm text-muted-foreground">
              {pendingDeleteStep?.branchOptions
                ? `Esta pregunta abre ${pendingDeleteStep.branchOptions.length} caminos distintos. Puedes quedarte con uno (sigue completo y se conecta directo con lo anterior) y eliminar los demás, o eliminar todo.`
                : pendingDeleteStep?.unifySuccessorId !== undefined
                ? `Hay ${pendingDeleteStep?.cascadeIds.length ?? 0} paso${pendingDeleteStep && pendingDeleteStep.cascadeIds.length !== 1 ? "s" : ""} que dependen solo de este. Puedes eliminar solo este paso y conectar directo lo anterior con lo siguiente, o eliminar todo junto con él.`
                : `Este paso abre varios caminos, así que no hay uno solo con el que continuar. Si sigues, se eliminarán todos (${pendingDeleteStep?.cascadeIds.length ?? 0} pasos).`}
            </p>
            <div className="flex flex-col gap-2">
              {pendingDeleteStep?.branchOptions?.map(opt => (
                <button
                  key={opt.successorId}
                  onClick={() => pendingDeleteStep && deleteStepWithRewire(pendingDeleteStep.id, opt.discardedIds, opt.successorId)}
                  className="h-9 px-4 rounded-xl border border-primary/40 text-primary text-xs font-medium hover:bg-primary/5 transition-colors truncate"
                >
                  Quedarme solo con "{opt.label}"
                </button>
              ))}
              {pendingDeleteStep?.unifySuccessorId !== undefined && (
                <button
                  onClick={() => pendingDeleteStep && deleteStepWithRewire(pendingDeleteStep.id, [], pendingDeleteStep.unifySuccessorId ?? null)}
                  className="h-9 px-4 rounded-xl border border-primary/40 text-primary text-xs font-medium hover:bg-primary/5 transition-colors"
                >
                  Eliminar solo este paso y unir lo de antes con lo de después
                </button>
              )}
              <button
                onClick={() => pendingDeleteStep && deleteStepWithRewire(pendingDeleteStep.id, pendingDeleteStep.cascadeIds, null)}
                className="h-9 px-4 rounded-xl bg-destructive text-destructive-foreground text-xs font-medium hover:opacity-90 transition-opacity"
              >
                Eliminar todo ({pendingDeleteStep ? pendingDeleteStep.cascadeIds.length + 1 : 0} pasos)
              </button>
              <button
                onClick={() => setPendingDeleteStep(null)}
                className="h-9 px-4 rounded-xl border text-xs text-muted-foreground hover:bg-secondary transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!pendingDeleteOption} onOpenChange={open => !open && setPendingDeleteOption(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Este botón lleva a otros pasos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-sm text-muted-foreground">
              Hay {pendingDeleteOption?.orphanIds.length ?? 0} paso{pendingDeleteOption && pendingDeleteOption.orphanIds.length !== 1 ? "s" : ""} que dependen solo de este botón — si lo eliminas, se eliminarán junto con él.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => pendingDeleteOption && deleteOptionWithCascade(pendingDeleteOption.questionId, pendingDeleteOption.optionId, pendingDeleteOption.orphanIds)}
                className="h-9 px-4 rounded-xl bg-destructive text-destructive-foreground text-xs font-medium hover:opacity-90 transition-opacity"
              >
                Eliminar botón y {pendingDeleteOption?.orphanIds.length ?? 0} paso{pendingDeleteOption && pendingDeleteOption.orphanIds.length !== 1 ? "s" : ""}
              </button>
              <button
                onClick={() => setPendingDeleteOption(null)}
                className="h-9 px-4 rounded-xl border text-xs text-muted-foreground hover:bg-secondary transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-center gap-2">
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
          {closeIcon === "x" ? <X size={15} /> : <ArrowLeft size={14} />}
        </button>
        <span className="text-xs font-medium">{editingSeq.status === "published" ? "Editar secuencia" : "Nueva secuencia"}</span>
        {/* Estado del autoguardado: los cambios nunca se pierden aunque se cierre
            a medias, pero siguen siendo un borrador hasta tocar Publicar. */}
        <span className="ml-auto text-[10px] text-muted-foreground/60 flex items-center gap-1 shrink-0">
          {draftSaveState === "saving" && <><Loader2 size={10} className="animate-spin" /> Guardando…</>}
          {draftSaveState === "saved" && <><Check size={10} /> Borrador guardado</>}
        </span>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Nombre</label>
        <input
          value={editingSeq.name}
          onChange={e => setEditingSeq(s => ({ ...s, name: e.target.value }))}
          placeholder="ej: Presentación Paquete Gold"
          className="w-full h-8 px-2.5 text-base md:text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* ── Mapa de la secuencia + editor del paso elegido — un solo elemento ── */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-3 py-2 bg-secondary/20 border-b border-border/40">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <GitBranch size={11} />
            Tu secuencia
            {sequenceGraph && sequenceGraph.nodes.length > 0 && (
              <span className="text-[9px] font-normal opacity-50">
                {editingSeq.steps.length} paso{editingSeq.steps.length !== 1 ? "s" : ""}
                {activeBranches.filter(b => b.targetId).length > 0 && ` · ${activeBranches.filter(b => b.targetId).length} respuesta${activeBranches.filter(b => b.targetId).length !== 1 ? "s" : ""}`}
              </span>
            )}
            {sequenceIssues.length > 0 && (
              <span className="ml-auto flex items-center gap-1 text-[9px] font-semibold text-destructive shrink-0">
                <AlertTriangle size={10} />
                {sequenceIssues.length} sin conectar
              </span>
            )}
          </div>
          {sequenceGraph && sequenceGraph.nodes.length > 0 && !pickingTarget && (
            <p className="text-[9.5px] text-muted-foreground/60 mt-0.5">
              Así ve tu cliente la conversación, de izquierda a derecha. Toca un paso para editarlo abajo, o un "+" para agregar el siguiente.
            </p>
          )}
        </div>
        {/* Modo conexión: el lienzo mismo es el selector de destino. */}
        {pickingTarget && (
          <div className="px-3 py-2 bg-primary/10 border-b border-primary/30 flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold text-primary">
                {pickableTargetIds.size > 0
                  ? "Toca el paso al que quieres llevar la conversación"
                  : "Todavía no hay un paso al que puedas llevarla"}
              </p>
              <p className="text-[9px] text-muted-foreground truncate">
                {pickableTargetIds.size > 0
                  ? describeEdgeSource(pickingTarget.source)?.text
                  : "La conversación solo puede seguir hacia adelante. Mejor crea un paso nuevo aquí."}
              </p>
            </div>
            <button
              onClick={() => setPickingTarget(null)}
              className="h-7 px-2.5 rounded-lg border border-border bg-background text-[10px] text-muted-foreground hover:bg-secondary transition-colors shrink-0"
            >
              Cancelar
            </button>
          </div>
        )}
        {/* Aviso de respuestas sin conectar — cada línea lleva de un toque al botón
            exacto que falta resolver, en vez de dejar al usuario buscarlo en el árbol. */}
        {sequenceIssues.length > 0 && !pickingTarget && (
          <div className="px-3 py-2 bg-destructive/10 border-b border-destructive/20 space-y-1">
            <p className="text-[10px] font-semibold text-destructive flex items-center gap-1">
              <AlertTriangle size={11} className="shrink-0" />
              No puedes guardar hasta conectar {sequenceIssues.length === 1 ? "esta respuesta" : "estas respuestas"}
            </p>
            {sequenceIssues.map(issue => (
              <button
                key={`${issue.questionId}-${issue.optionId ?? "sin-botones"}`}
                onClick={() => {
                  setTreeSelectedStepId(issue.questionId);
                  if (issue.optionId) {
                    setPendingConnectFlow({ kind: "option", questionStepId: issue.questionId, optionId: issue.optionId });
                  }
                }}
                className="w-full flex items-center gap-1.5 text-left text-[10px] text-destructive/90 hover:text-destructive hover:underline"
              >
                <ChevronRight size={10} className="shrink-0" />
                <span className="truncate">{issue.text}</span>
              </button>
            ))}
          </div>
        )}
        {sequenceGraph && sequenceGraph.nodes.length > 0 ? (
          <div
            className="bg-secondary/10 overflow-auto"
            style={{ maxHeight: 340 }}
          >
            <div
              className="relative"
              style={{
                width: (sequenceGraph.maxDepth + 1) * SEQ_TREE_COL_PITCH + SEQ_TREE_NODE_W + 40,
                // ROW_PITCH ya reserva espacio para el nodo Pregunta más alto posible (3 botones),
                // así que un carril extra + margen alcanza para lo que quede en el último carril.
                height: (sequenceGraph.maxLane + 1) * SEQ_TREE_ROW_PITCH + 16,
                margin: 12,
              }}
            >
              <svg className="absolute inset-0 overflow-visible pointer-events-none" width="100%" height="100%">
                {edgeGeometry.map(({ edge, ei, sx, sy, tx, py, midX, color }) => (
                  <g key={ei}>
                    <path
                      d={`M${sx},${sy} C${midX},${sy} ${midX},${py} ${tx},${py}`}
                      stroke={color}
                      strokeOpacity={edge.colorIdx !== undefined ? 0.8 : 0.3}
                      strokeWidth={1.5}
                      fill="none"
                    />
                    {/* Etiqueta junto al destino (no a la salida de la pregunta) — como cada opción
                        normalmente termina en un paso distinto, las etiquetas de una misma pregunta
                        quedan naturalmente separadas en vez de apiladas en un solo punto. */}
                    {edge.label && (
                      <text x={tx - 14} y={py - 7} textAnchor="end" fontSize="8" fontWeight="700" fill={color} fontFamily="system-ui, sans-serif">
                        {edge.label}
                      </text>
                    )}
                  </g>
                ))}
              </svg>
              {sequenceGraph.nodes.map(node => {
                const x = node.depth * SEQ_TREE_COL_PITCH;
                const y = node.lane * SEQ_TREE_ROW_PITCH;
                if (node.pending) {
                  const parentEdge = sequenceGraph.edges.find(e => e.toId === node.id);
                  return (
                    <button
                      key={node.id}
                      onClick={() => parentEdge && node.pendingOptionId && setPendingConnectFlow({ kind: "option", questionStepId: parentEdge.fromId, optionId: node.pendingOptionId })}
                      disabled={!!pickingTarget}
                      title={`El botón "${node.pendingLabel}" todavía no lleva a ningún paso — tócalo para conectarlo o crear el paso que sigue`}
                      className={`absolute flex flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-destructive/50 bg-destructive/5 text-[8px] text-destructive px-2 text-center leading-tight transition-all ${
                        pickingTarget ? "opacity-25" : "hover:bg-destructive/10 hover:border-destructive/70"
                      }`}
                      style={{ left: x, top: y, width: SEQ_TREE_NODE_W, height: SEQ_TREE_NODE_H }}
                    >
                      <span className="font-semibold flex items-center gap-1"><AlertTriangle size={8} className="shrink-0" /> sin respuesta</span>
                      <span className="opacity-70">toca para conectar</span>
                    </button>
                  );
                }
                const step = node.step!;
                const isQ = step.type === "question";
                const isLeaf = !isQ && !sequenceGraph.edges.some(e => e.fromId === node.id);
                const canAddOption = isQ && (step.options?.filter(o => o.label.trim()).length ?? 0) < SEQ_TREE_MAX_PILLS;
                const isSelected = step.id === treeSelectedStepId;
                const preview = getStepPreview(step, 30);
                const stepIdx = editingSeq.steps.findIndex(s => s.id === step.id);
                const boxH = nodeBoxHeight(node);
                const labeledOptions = isQ ? (step.options ?? []).filter(o => o.label.trim()).slice(0, SEQ_TREE_MAX_PILLS) : [];
                // Modo conexión: solo los destinos válidos quedan vivos (halo que late), el resto
                // se atenúa y no responde — el usuario ve de una cuáles son sus opciones reales.
                const isPickable = !!pickingTarget && pickableTargetIds.has(step.id);
                const isPickBlocked = !!pickingTarget && !isPickable;
                // Mismo color de borde para la cabecera y el mockup de botones debajo — para que
                // se lean como una sola tarjeta, no dos elementos apilados.
                const stateBorderClass = isPickable ? "border-primary" : isSelected ? "border-primary" : isQ ? "border-amber-400/50" : "border-border/70";
                return (
                  <div
                    key={node.id}
                    className={`absolute transition-opacity ${isPickBlocked ? "opacity-25" : ""}`}
                    style={{ left: x, top: y, width: SEQ_TREE_NODE_W, height: boxH }}
                  >
                    <button
                      onClick={() => pickingTarget ? confirmPickedTarget(step.id) : setTreeSelectedStepId(step.id)}
                      disabled={isPickBlocked}
                      title={
                        isPickable ? "Llevar la conversación hasta aquí"
                        : isPickBlocked ? "Aquí no: la conversación avanza hacia adelante, no puede volver a un paso anterior"
                        : node.mergeCount > 1 ? "Varias respuestas terminan en este mismo paso"
                        : undefined
                      }
                      className={`absolute inset-x-0 top-0 flex flex-col justify-center gap-0.5 border px-2.5 py-1 text-left transition-colors overflow-hidden ${isQ ? "rounded-t-lg" : "rounded-lg"} ${
                        isPickable ? "border-2 border-primary bg-primary/10 motion-safe:animate-connect-pulse"
                        : isSelected ? "border-primary ring-2 ring-primary/25 bg-primary/5"
                        : isQ ? "border-amber-400/50 bg-amber-400/5"
                        : "border-border/70 bg-background"
                      } ${isPickBlocked ? "cursor-not-allowed" : "hover:border-primary/50 hover:bg-primary/5"}`}
                      style={{ height: SEQ_TREE_NODE_H, animationDelay: isPickable ? `${(node.depth * 2 + node.lane) * 90}ms` : undefined }}
                    >
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] text-muted-foreground/60 tabular-nums shrink-0">{stepIdx + 1}</span>
                        <span className={`text-[9px] font-semibold shrink-0 ${isQ ? "text-amber-500 dark:text-amber-400" : "text-foreground/80"}`}>{STEP_TYPE_LABELS[step.type]}</span>
                        {node.mergeCount > 1 && <span className="ml-auto text-[8px] text-muted-foreground/50 shrink-0">⤵</span>}
                      </div>
                      {preview && <span className="text-[8.5px] text-muted-foreground/65 truncate">{preview}</span>}
                    </button>
                    {/* Mockup de los botones de respuesta — se parece al mensaje interactivo real de
                        WhatsApp, para que se entienda de un vistazo que una Pregunta trae botones. */}
                    {isQ && (
                      <div
                        className={`absolute inset-x-0 rounded-b-lg border-x border-b overflow-hidden bg-background ${stateBorderClass}`}
                        style={{ top: SEQ_TREE_NODE_H }}
                      >
                        {labeledOptions.length === 0 ? (
                          <div className="flex items-center justify-center px-2 text-[8px] text-muted-foreground/40 italic" style={{ height: SEQ_TREE_PILL_H }}>
                            Sin botones
                          </div>
                        ) : labeledOptions.map((o, oi) => {
                          const color = BRANCH_COLORS[oi % BRANCH_COLORS.length];
                          return (
                            <div
                              key={oi}
                              title={o.label}
                              className={`flex items-center justify-center px-2 truncate ${oi > 0 ? "border-t border-border/40" : ""} ${color.text}`}
                              style={{ height: SEQ_TREE_PILL_H }}
                            >
                              <span className="text-[8px] font-medium truncate">{o.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {isLeaf && !pickingTarget && (
                      <button
                        onClick={() => setPendingConnectFlow({ kind: "after", afterStepId: step.id })}
                        title="Agregar o conectar el siguiente paso"
                        className="absolute top-1/2 -right-3 -translate-y-1/2 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center hover:bg-primary/90 transition-colors shadow"
                      >
                        +
                      </button>
                    )}
                    {canAddOption && !pickingTarget && (
                      <button
                        onClick={() => addOptionToQuestion(step.id)}
                        title="Agregar otro botón a esta pregunta"
                        className="absolute -bottom-2.5 right-2 w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center hover:bg-amber-600 transition-colors shadow"
                      >
                        +
                      </button>
                    )}
                  </div>
                );
              })}
              {/* Controles de las conexiones, DESPUÉS de los nodos y con z-index: el círculo de
                  editar se apoya sobre el borde del paso destino, así que si se dibujara con las
                  líneas (detrás) la caja del nodo le taparía la mitad y quedaría medio oculto.
                  El svg no captura clics; solo los grupos tocables los reactivan. */}
              {!pickingTarget && (
                <svg className="absolute inset-0 overflow-visible pointer-events-none z-10" width="100%" height="100%">
                  {edgeGeometry.map(({ edge, ei, to, tx, py, midX, midY, color }) => (
                    <g key={ei}>
                      {/* "+" para intercalar un paso a la mitad de esta conexión */}
                      {!to.pending && (
                        <g
                          onClick={() => setPendingStepCreate({ kind: "edge", fromId: edge.fromId, toId: edge.toId, optionId: edge.optionId })}
                          style={{ cursor: "pointer", pointerEvents: "auto" }}
                        >
                          <circle cx={midX} cy={midY} r={7} fill="hsl(var(--card))" stroke={color} strokeOpacity={0.6} strokeWidth={1} />
                          <text x={midX} y={midY + 3} textAnchor="middle" fontSize="10" fontWeight="700" fill={color} fillOpacity={0.8}>+</text>
                        </g>
                      )}
                      {/* Tocar para cambiar o quitar el destino de esta conexión (en vez de
                          arrastrar — más simple y funciona igual en mobile). */}
                      {!to.pending && (
                        <g
                          onClick={() => setPendingEdgeManage(edge.optionId !== undefined
                            ? { kind: "option", questionId: edge.fromId, optionId: edge.optionId }
                            : { kind: "step", stepId: edge.fromId })}
                          style={{ cursor: "pointer", pointerEvents: "auto" }}
                        >
                          <circle cx={tx} cy={py} r={7} fill="hsl(var(--card))" stroke={color} strokeWidth={1.5} />
                          {/* El lápiz hace evidente que el círculo se toca para editar este camino
                              — sin él parecía el remate decorativo de la línea. */}
                          <Pencil x={tx - 4} y={py - 4} width={8} height={8} stroke={color} strokeWidth={2.5} />
                        </g>
                      )}
                    </g>
                  ))}
                </svg>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-8 bg-secondary/10">
            <p className="text-[11px] text-muted-foreground/60 italic">Sin pasos todavía</p>
            <button
              onClick={() => setPendingStepCreate({ kind: "first" })}
              className="h-8 px-3 rounded-lg border border-dashed border-muted-foreground/40 bg-secondary/40 text-muted-foreground text-xs font-medium flex items-center gap-1.5 hover:bg-secondary/70 hover:border-muted-foreground/60 transition-colors"
            >
              <Plus size={12} /> Crear primer paso
            </button>
          </div>
        )}

        {/* ── Zona Edición: panel del paso seleccionado en el árbol de arriba ── */}
        <div className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium text-muted-foreground bg-secondary/20 border-y border-border/40">
          <Pencil size={11} />
          {treeSelectedStepId && editingSeq.steps.some(s => s.id === treeSelectedStepId)
            ? `Contenido del paso ${editingSeq.steps.findIndex(s => s.id === treeSelectedStepId) + 1}`
            : "Contenido del paso"}
        </div>
        <div className="bg-card p-3">
          {treeSelectedStepId && editingSeq.steps.some(s => s.id === treeSelectedStepId) ? (
            <StepEditorPanel
              step={editingSeq.steps.find(s => s.id === treeSelectedStepId)!}
              allSteps={editingSeq.steps}
              onChange={updated => setEditingSeq(s => ({
                ...s,
                steps: s.steps.map(st => st.id === updated.id ? updated : st),
              }))}
              onRemove={() => {
                if (!treeSelectedStepId) return;
                const impact = computeDeletionImpact(treeSelectedStepId);
                if (impact.cascadeIds.length > 0) {
                  setPendingDeleteStep({ id: treeSelectedStepId, ...impact });
                  return;
                }
                deleteStepWithRewire(treeSelectedStepId, [], null);
              }}
              onDeleteOption={optionId => {
                if (!treeSelectedStepId) return;
                const orphanIds = computeOptionDeletionOrphans(treeSelectedStepId, optionId);
                if (orphanIds.length > 0) {
                  setPendingDeleteOption({ questionId: treeSelectedStepId, optionId, orphanIds });
                  return;
                }
                setEditingSeq(s => ({
                  ...s,
                  steps: s.steps.map(st => st.id !== treeSelectedStepId ? st : { ...st, options: (st.options ?? []).filter(o => o.id !== optionId) }),
                }));
              }}
              userId={userId}
            />
          ) : (
            <p className="text-[11px] text-muted-foreground/50 italic text-center py-3">
              {sequenceGraph && sequenceGraph.nodes.length > 0
                ? 'Toca un paso de arriba para editar su contenido aquí, o crea uno nuevo con los "+".'
                : "Crea el primer paso para empezar a editarlo aquí."}
            </p>
          )}
        </div>
      </div>

      {/* El botón sigue habilitado a propósito: al tocarlo el aviso dice cuál es
          el botón que falta conectar, en vez de quedar muerto sin explicación. */}
      {sequenceIssues.length === 0 && (
        <p className="text-[10px] text-muted-foreground/60 pt-1">
          {editingSeq.status === "published"
            ? "Tus cambios se guardan solos como borrador. La versión que reciben tus clientes es la última publicada."
            : "Tus cambios se guardan solos como borrador. Publícala para poder usarla en un flujo."}
        </p>
      )}
      {sequenceIssues.length > 0 && (
        <p className="flex items-center gap-1 text-[10px] font-medium text-destructive pt-1">
          <AlertTriangle size={11} className="shrink-0" />
          {sequenceIssues.length === 1
            ? "Hay 1 respuesta sin conectar — revísala arriba para poder guardar"
            : `Hay ${sequenceIssues.length} respuestas sin conectar — revísalas arriba para poder guardar`}
        </p>
      )}
      <div className="flex gap-2 pt-1">
        <button onClick={onClose} className="h-9 px-4 rounded-xl border text-xs text-muted-foreground hover:bg-secondary transition-colors">
          Cancelar
        </button>
        <button
          onClick={handleSaveSequence}
          disabled={publishing}
          className={`flex-1 h-9 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-40 transition-opacity ${
            sequenceIssues.length > 0 ? "bg-primary/40 text-primary-foreground" : "bg-primary text-primary-foreground"
          }`}
        >
          {publishing ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
          {editingSeq.status === "published" ? "Guardar cambios" : "Publicar secuencia"}
        </button>
      </div>
    </>
  );
}

/**
 * El mismo editor, en un modal — para Seguimiento Automático y Envíos Masivos,
 * donde se abre encima del wizard en curso en vez de ocupar un paso propio.
 * Cerrar solo con el botón: un clic al fondo perdiendo el editor a medias sería
 * demasiado fácil de hacer sin querer.
 */
export function SequenceEditorModal(props: Parameters<typeof SequenceEditor>[0]) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-background shadow-xl p-4 space-y-3">
        <SequenceEditor {...props} closeIcon="x" />
      </div>
    </div>
  );
}
