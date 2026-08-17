import type { SequenceStep } from "@/lib/supabase";

// Colores de rama: se reparten entre los botones de una pregunta para que cada
// camino se siga de un vistazo.
export const BRANCH_COLORS = [
  { bar: "bg-emerald-400", pill: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", border: "border-emerald-400/30", bg: "bg-emerald-500/5", text: "text-emerald-600 dark:text-emerald-400", hex: "#34d399" },
  { bar: "bg-rose-400",    pill: "bg-rose-400/10 text-rose-500 dark:text-rose-400 border-rose-400/20",             border: "border-rose-400/30",    bg: "bg-rose-400/5",    text: "text-rose-500 dark:text-rose-400",     hex: "#fb7185" },
  { bar: "bg-blue-400",    pill: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",             border: "border-blue-400/30",    bg: "bg-blue-400/5",    text: "text-blue-600 dark:text-blue-400",     hex: "#60a5fa" },
  { bar: "bg-amber-400",   pill: "bg-amber-400/10 text-amber-600 dark:text-amber-400 border-amber-400/20",         border: "border-amber-400/30",   bg: "bg-amber-400/5",   text: "text-amber-600 dark:text-amber-400",   hex: "#fbbf24" },
  { bar: "bg-purple-400",  pill: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",     border: "border-purple-400/30",  bg: "bg-purple-400/5",  text: "text-purple-600 dark:text-purple-400", hex: "#c084fc" },
];

/** Texto corto que representa un paso en la caja del lienzo. */
export function getStepPreview(s: SequenceStep, maxLen: number): string | null {
  if (s.type === "message" || s.type === "question") return s.text?.trim().slice(0, maxLen) || null;
  if (s.type === "link") return s.link_url?.slice(0, maxLen) || null;
  return s.media?.[0]?.name?.slice(0, maxLen) || null;
}


// ─────────────────────────────────────────────────────────────────────────────
// Geometría y grafo del lienzo de secuencias.
//
// Todo aquí es función pura de `steps`: no sabe nada de edición ni de estado.
// Por eso lo pueden compartir el editor de Flujos y la vista de solo lectura que
// se abre desde Seguimiento Automático y Envíos Masivos — el dibujo es el mismo,
// cambia solo quién puede tocarlo.
// ─────────────────────────────────────────────────────────────────────────────

// Geometría del árbol horizontal de la secuencia
export const SEQ_TREE_NODE_W = 148;
export const SEQ_TREE_NODE_H = 40; // caja "cabecera" (índice + tipo + preview) — igual para todos los nodos
export const SEQ_TREE_COL_PITCH = 190;
// Preview de botones debajo de los nodos Pregunta (mockup del mensaje interactivo final de WhatsApp)
export const SEQ_TREE_PILL_H = 16;
export const SEQ_TREE_MAX_PILLS = 3; // igual al máximo de botones reales que admite una pregunta
// Alto de fila: cabecera + hasta 3 pills de botón + margen — así ningún nodo Pregunta se superpone
// con el carril de abajo, sin importar cuántos botones tenga.
export const SEQ_TREE_ROW_PITCH = SEQ_TREE_NODE_H + SEQ_TREE_MAX_PILLS * SEQ_TREE_PILL_H + 12;

// ─── Árbol visual de la secuencia como grafo ─────────────────────────────────
// Construido siguiendo los enlaces reales (next_step_id / options[].next_step_id) en vez de
// cortar el arreglo por índices — así un paso de reconvergencia (con varios "padres") se
// dibuja UNA sola vez con varias líneas entrando, sin duplicarse nunca en el árbol.
export type SeqGraphNode = {
  id: string;
  step: SequenceStep | null; // null = placeholder de botón sin enlazar
  depth: number;
  lane: number;
  pending?: boolean;
  pendingLabel?: string;
  pendingOptionId?: string; // id propio del botón origen — identidad estable para crear/enlazar,
  // nunca la posición ni el texto del botón (pueden cambiar o repetirse)
  mergeCount: number; // cuántas conexiones entrantes tiene (>1 = punto de reconvergencia)
};
// colorIdx: posición entre los botones con texto — solo para asignar color/orden visual al pill,
// NUNCA para identidad (2+ botones pueden compartir label y su índice cambia al borrar otro).
// optionId: id propio del botón origen (solo en aristas que salen de una pregunta) — identidad
// real para crear/enlazar/arrastrar.
export type SeqGraphEdge = { fromId: string; toId: string; label?: string; colorIdx?: number; optionId?: string };


// Cuántos botones (labeled) muestra el mockup de un nodo Pregunta en el lienzo — al menos 1
// (una fila "Sin botones" cuando todavía no tiene ninguno), acotado a SEQ_TREE_MAX_PILLS.
export function nodeQuestionPillCount(node: SeqGraphNode): number {
  if (node.pending || !node.step || node.step.type !== "question") return 0;
  const labeled = (node.step.options ?? []).filter(o => o.label.trim()).length;
  return Math.min(Math.max(labeled, 1), SEQ_TREE_MAX_PILLS);
}

// Alto real de la caja de un nodo en el lienzo — la cabecera sola para pasos normales y
// placeholders, o cabecera + preview de botones para preguntas. Compartido entre el render y el
// hit-test del arrastre de conexiones para que nunca queden desincronizados.
export function nodeBoxHeight(node: SeqGraphNode): number {
  const pills = nodeQuestionPillCount(node);
  return pills === 0 ? SEQ_TREE_NODE_H : SEQ_TREE_NODE_H + pills * SEQ_TREE_PILL_H;
}

// Punto vertical de donde sale una línea: si el origen es una pregunta y la arista es una de sus
// opciones (colorIdx definido), sale del pill de ESE botón específico en el mockup — no del
// centro genérico del nodo — para que se vea de qué botón exacto sale cada conexión.
export function edgeSourceY(from: SeqGraphNode, colorIdx: number | undefined): number {
  const base = from.lane * SEQ_TREE_ROW_PITCH;
  const pills = nodeQuestionPillCount(from);
  if (colorIdx === undefined || pills === 0) return base + SEQ_TREE_NODE_H / 2;
  const pillIdx = Math.min(colorIdx, pills - 1);
  return base + SEQ_TREE_NODE_H + pillIdx * SEQ_TREE_PILL_H + SEQ_TREE_PILL_H / 2;
}


export function buildSequenceGraph(steps: SequenceStep[]): { nodes: SeqGraphNode[]; edges: SeqGraphEdge[]; maxDepth: number; maxLane: number } {
  if (steps.length === 0) return { nodes: [], edges: [], maxDepth: 0, maxLane: 0 };
  const byId = new Map(steps.map(s => [s.id, s]));

  type Child = { id: string; label?: string; colorIdx?: number; pending?: boolean; optionId?: string };
  const children = new Map<string, Child[]>();
  for (const s of steps) {
    if (s.type === "question") {
      const labeled = (s.options ?? []).filter(o => o.label.trim());
      const list: Child[] = labeled.map((o, oi) => {
        if (o.next_step_id && byId.has(o.next_step_id)) {
          return { id: o.next_step_id, label: o.label, colorIdx: oi, optionId: o.id };
        }
        // El id sintético del placeholder usa el id REAL del botón (no su posición) — así sigue
        // siendo el mismo nodo aunque se borre/agregue otro botón antes en la lista.
        return { id: `__pending__${s.id}__${o.id}`, label: o.label, colorIdx: oi, pending: true, optionId: o.id };
      });
      if (list.length > 0) children.set(s.id, list);
    } else if (s.next_step_id && byId.has(s.next_step_id)) {
      children.set(s.id, [{ id: s.next_step_id }]);
    }
  }

  const rootId = steps[0].id;

  // Profundidad por relajación (tipo Bellman-Ford, acotado): correcto incluso con reconvergencias
  // o loops (un botón que enlaza hacia un paso anterior), sin importar el orden de visita.
  const depth = new Map<string, number>([[rootId, 0]]);
  for (let iter = 0; iter < steps.length + 1; iter++) {
    let changed = false;
    for (const [fromId, kids] of children) {
      if (!depth.has(fromId)) continue;
      const d = depth.get(fromId)!;
      for (const kid of kids) {
        const nd = d + 1;
        if (!depth.has(kid.id) || nd > depth.get(kid.id)!) { depth.set(kid.id, nd); changed = true; }
      }
    }
    if (!changed) break;
  }
  // Pasos nunca alcanzados (huérfanos) — no deberían existir, pero por seguridad no se ocultan.
  for (const s of steps) if (!depth.has(s.id)) depth.set(s.id, 0);

  // Carriles: árbol centrado (post-orden) — cada nodo se ubica en el promedio de los carriles de
  // los hijos que "posee" (los que solo él enlaza), así que el primer paso y cada bifurcación
  // quedan centrados respecto a todo lo que cuelga de ellos. Un hijo ya reclamado por otra rama
  // (reconvergencia) NO participa en el promedio de este nodo — ni siquiera con su carril ya
  // calculado: si contara, un padre cuyo único hijo es un nodo compartido quedaría "pegado" al
  // carril de ese nodo (y potencialmente superpuesto con el otro padre que sí lo posee), en vez
  // de mantener su propia posición independiente y solo dibujar una línea hacia el destino
  // compartido. Las hojas (y los nodos sin ningún hijo PROPIO) reciben carriles consecutivos en
  // el orden de recorrido.
  const lane = new Map<string, number>();
  const owned = new Set<string>([rootId]);
  const visiting = new Set<string>();
  let nextLeafLane = 0;
  const computeLane = (id: string): number => {
    if (lane.has(id)) return lane.get(id)!;
    visiting.add(id);
    const kids = children.get(id) ?? [];
    const ownedLanes: number[] = [];
    for (const kid of kids) {
      if (visiting.has(kid.id)) continue; // enlace hacia un ancestro (loop) — no se centra sobre sí mismo
      if (owned.has(kid.id)) continue; // ya lo posee otro padre — no mueve mi propia posición
      owned.add(kid.id);
      ownedLanes.push(computeLane(kid.id));
    }
    visiting.delete(id);
    const myLane = ownedLanes.length > 0
      ? ownedLanes.reduce((a, b) => a + b, 0) / ownedLanes.length
      : nextLeafLane++;
    lane.set(id, myLane);
    return myLane;
  };
  computeLane(rootId);
  for (const s of steps) if (!lane.has(s.id)) lane.set(s.id, nextLeafLane++);

  // Aristas + conteo de entrantes (para marcar puntos de reconvergencia)
  const edges: SeqGraphEdge[] = [];
  const incoming = new Map<string, number>();
  for (const [fromId, kids] of children) {
    for (const kid of kids) {
      edges.push({ fromId, toId: kid.id, label: kid.label, colorIdx: kid.colorIdx, optionId: kid.optionId });
      incoming.set(kid.id, (incoming.get(kid.id) ?? 0) + 1);
    }
  }

  const nodes: SeqGraphNode[] = steps.map(s => ({
    id: s.id, step: s, depth: depth.get(s.id) ?? 0, lane: lane.get(s.id) ?? 0,
    mergeCount: incoming.get(s.id) ?? 0,
  }));
  // Placeholders de botones sin enlazar
  for (const [, kids] of children) {
    for (const kid of kids) {
      if (kid.pending && !nodes.some(n => n.id === kid.id)) {
        nodes.push({
          id: kid.id, step: null, depth: depth.get(kid.id) ?? 0, lane: lane.get(kid.id) ?? 0,
          pending: true, pendingLabel: kid.label, pendingOptionId: kid.optionId, mergeCount: 0,
        });
      }
    }
  }

  const maxDepth = nodes.reduce((acc, n) => Math.max(acc, n.depth), 0);
  const maxLane = nodes.reduce((acc, n) => Math.max(acc, n.lane), 0);
  return { nodes, edges, maxDepth, maxLane };
}
