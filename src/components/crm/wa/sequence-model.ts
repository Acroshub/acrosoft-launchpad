import { edgeSourceY, type SeqGraphEdge, type SeqGraphNode } from "./sequence-graph";
import type { CrmWaSequence, SequenceStep } from "@/lib/supabase";

// ─────────────────────────────────────────────────────────────────────────────
// Modelo de datos de una secuencia: DAG explícito.
//
// Todo lo de este archivo es función pura sobre `steps` — no sabe nada de React
// ni de la base. Lo comparten el editor (Flujos, Seguimientos, Envíos) y el
// lienzo de solo lectura.
//
// Una secuencia es UNA LISTA DE NODOS + ARISTAS GUARDADAS POR ID, y nada más:
//
//   · cada paso tiene un `id` (UUID) que nace con él y muere con él — nunca se recicla ni se
//     reasigna, así que una conexión vieja jamás puede "caer" sobre un paso nuevo;
//   · un paso normal tiene UNA arista saliente: `next_step_id` (id del siguiente, o null = fin
//     de esta rama). Siempre está guardada: no se deduce de nada;
//   · un paso Pregunta NO usa `next_step_id`: tiene una arista por botón (`options[].next_step_id`).
//     El botón es la ETIQUETA de la arista, no un nodo — una pregunta con 3 botones es 1 nodo con
//     3 salidas, no 4 nodos. (Un botón sin destino se dibuja como un recuadro punteado "+ crear
//     paso", pero eso es solo el hueco de una arista sin terminar, no un nodo guardado.);
//   · varios padres pueden apuntar al mismo id (reconvergencia): por eso es un DAG y no un árbol.
//     Lo único prohibido es cerrar un ciclo, y de eso se encarga `canConnectForward`;
//   · la raíz es `steps[0]`. El orden del arreglo NO significa nada más: los pasos nuevos se
//     agregan SIEMPRE al final y nunca se reordenan. Gracias a eso el número visible de un paso
//     ("Paso 5") no cambia porque se haya creado otro en cualquier otra rama, y el índice que el
//     backend guarda en `crm_wa_conversations.flow_step` sigue apuntando al mismo paso mientras
//     una conversación está en curso.
//
// Antes, las conexiones de los pasos normales NO se guardaban: se recalculaban en cada cambio a
// partir de la posición en el arreglo y de rangos de "ramas" inferidos por índice. Esa derivación
// era la causa raíz de que crear, conectar o borrar un paso reescribiera en silencio conexiones
// de OTRAS ramas. Ya no existe: lo que está guardado es el grafo.
// ─────────────────────────────────────────────────────────────────────────────

/** Secuencia en edición: lo que el editor tiene en memoria, aún sin publicar. */
export type DraftSequence = { id?: string; name: string; steps: SequenceStep[]; status?: "draft" | "published" };

// Abre una secuencia guardada para editarla: se edita SIEMPRE el borrador si existe (draft_steps),
// que es el trabajo autoguardado más reciente; `steps` es la versión publicada que sigue corriendo
// en las conversaciones reales mientras tanto.
export function toDraftSequence(seq: CrmWaSequence): DraftSequence {
  return { id: seq.id, name: seq.name, steps: seq.draft_steps ?? seq.steps, status: seq.status };
}

export const STEP_TYPE_LABELS = {
  message: "Texto", question: "Pregunta",
  image: "Imagen", video: "Video", audio: "Audio", file: "Archivo", link: "Link",
} as const;

// Orden en el que se muestran los tipos al crear un paso nuevo o cambiar el tipo de uno existente.
export const STEP_TYPE_ORDER = ["message", "question", "link", "image", "video", "audio", "file"] as const;

// WhatsApp Cloud API soporta estos formatos solamente
export const STEP_ACCEPT = {
  image: "image/jpeg,image/png,.jpg,.jpeg,.png",
  video: "video/mp4,video/3gpp,.mp4,.3gp",
  audio: "audio/aac,audio/mp4,audio/mpeg,audio/amr,audio/ogg,audio/x-m4a,.aac,.m4a,.mp3,.amr,.ogg",
  file: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.7z",
} as const;

export const WA_FORMAT_HINT: Partial<Record<SequenceStep["type"], string>> = {
  image: "JPG o PNG · máx 5 MB",
  video: "MP4 con codec H.264 · máx 16 MB (no MOV, no HEVC)",
  audio: "MP3, AAC, OGG, AMR o M4A · máx 16 MB",
  file: "PDF, Word, Excel, ZIP · máx 100 MB",
};

// MIME types aceptados por WhatsApp Cloud API
export const WA_VALID_MIME: Partial<Record<SequenceStep["type"], Set<string>>> = {
  image: new Set(["image/jpeg", "image/png"]),
  video: new Set(["video/mp4", "video/3gpp"]),
  audio: new Set(["audio/aac", "audio/mp4", "audio/mpeg", "audio/amr", "audio/ogg"]),
};

export const MEDIA_TYPES = new Set(["image", "video", "audio", "file"]);
export const LINK_TYPE = "link";

// Lee los primeros bytes del archivo para detectar el formato real (ignora extensión)
export async function readMagicBytes(file: File): Promise<Uint8Array> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => resolve(new Uint8Array(e.target?.result as ArrayBuffer));
    reader.readAsArrayBuffer(file.slice(0, 12));
  });
}

// Devuelve el MIME type real del archivo según sus magic bytes, o null si no se puede detectar
export function detectRealMime(bytes: Uint8Array): string | null {
  // MP3: ID3 tag o sync word FF Fx
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) return "audio/mpeg";
  if (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0) return "audio/mpeg";
  // OGG
  if (bytes[0] === 0x4F && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) return "audio/ogg";
  // FTYP box (MP4 / M4A / MOV / 3GP) — offset 4
  if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (brand === "qt  ") return "video/quicktime";           // MOV — no soportado
    if (brand.startsWith("M4A") || brand.startsWith("M4B")) return "audio/mp4"; // M4A
    if (brand === "3gp5" || brand === "3gp4" || brand === "3g2a") return "video/3gpp";
    return "video/mp4"; // isom, mp42, avc1, dash, etc.
  }
  // JPEG
  if (bytes[0] === 0xFF && bytes[1] === 0xD8) return "image/jpeg";
  // PNG
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return "image/png";
  return null;
}

export function newStep(type: SequenceStep["type"]): SequenceStep {
  return {
    id: crypto.randomUUID(),
    type,
    text: "",
    // Sin botones por defecto — en el modelo árbol-primero, los botones de una pregunta se crean
    // desde el "+" del lienzo (así siempre hay una rama visible detrás de cada opción del editor).
    options: type === "question" ? [] : undefined,
    media: MEDIA_TYPES.has(type) ? [] : undefined,
    // Arista saliente explícita desde el minuto cero (null = todavía no lleva a ningún lado): una
    // pregunta no la usa, cualquier otro paso siempre la tiene guardada, nunca deducida.
    next_step_id: null,
  };
}

// Único punto donde se toca data legada: se ejecuta UNA vez, al abrir la secuencia.
//   · rellena el `id` de botones guardados antes de que ese campo existiera (toda la lógica
//     identifica botones por id, nunca por texto ni por posición);
//   · materializa como arista explícita el enlace de los pasos legados que no la tenían (el
//     runtime viejo avanzaba al siguiente del arreglo: se guarda exactamente eso);
//   · limpia referencias colgantes — un id que apunta a un paso que ya no existe pasa a null,
//     nunca queda una conexión "fantasma" a un paso borrado;
//   · descarta los marcadores del modelo viejo (`shared`, `next_step_pinned`), que ya no se leen.
export function normalizeSequenceSteps(rawSteps: SequenceStep[]): SequenceStep[] {
  const ids = new Set(rawSteps.map(s => s.id));
  const resolve = (id: string | null | undefined): string | null => (id && ids.has(id) ? id : null);
  return rawSteps.map((s, i) => {
    const step: SequenceStep = { ...s };
    delete step.shared;
    delete step.next_step_pinned;
    if (step.options) {
      step.options = step.options.map(o => ({ ...o, id: o.id || crypto.randomUUID(), next_step_id: resolve(o.next_step_id) }));
    }
    if (step.type === "question") {
      step.next_step_id = null; // una pregunta navega por sus botones: su arista propia no se usa
    } else {
      step.next_step_id = step.next_step_id === undefined
        ? (rawSteps[i + 1]?.id ?? null) // legado sin enlace explícito: el runtime avanzaba por índice
        : resolve(step.next_step_id);
    }
    return step;
  });
}

// Ids de pasos alcanzables desde la raíz (steps[0]) siguiendo las aristas reales — mismo criterio
// de "hijos" que usa buildSequenceGraph (opciones de pregunta / next_step_id). Se usa para detectar
// si una reconexión o un borrado dejaría contenido sin conexión ("rama suelta").
export function getReachableStepIds(steps: SequenceStep[]): Set<string> {
  const seen = new Set<string>();
  if (steps.length === 0) return seen;
  const byId = new Map(steps.map(s => [s.id, s]));
  const stack = [steps[0].id];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const s = byId.get(id);
    if (!s) continue;
    if (s.type === "question") {
      for (const o of s.options ?? []) {
        if (o.label.trim() && o.next_step_id && byId.has(o.next_step_id)) stack.push(o.next_step_id);
      }
    } else if (s.next_step_id && byId.has(s.next_step_id)) {
      stack.push(s.next_step_id);
    }
  }
  return seen;
}

// Devuelve `steps` con el botón `optionId` de `questionId` reapuntado a `newTargetId` (o
// desenlazado si es null) — identidad por el id propio del botón, nunca por posición ni por
// texto (2 botones pueden compartir texto, y borrar uno del medio corre los índices).
export function stepsWithRewiredOption(steps: SequenceStep[], questionId: string, optionId: string, newTargetId: string | null): SequenceStep[] {
  return steps.map(s => s.id !== questionId ? s : {
    ...s,
    options: s.options?.map(o => o.id === optionId ? { ...o, next_step_id: newTargetId } : o),
  });
}

// Identidad de UNA arista concreta del grafo — la de un botón de pregunta, o la única saliente de
// un paso normal. Se usa tanto para crearla la primera vez como para cambiar su destino o quitarla
// después, siempre desde el mismo lugar (tocar el círculo al final de la línea), nunca arrastrando
// — más simple y funciona igual en mobile.
export type EdgeManageSource =
  | { kind: "option"; questionId: string; optionId: string }
  | { kind: "step"; stepId: string };

// Devuelve `steps` con la arista `source` apuntando a `newTargetId` (o desconectada si es null).
// No toca ninguna otra arista: reapuntar una conexión nunca puede robarle un padre a un paso, así
// que un destino con 2+ padres (reconvergencia) simplemente suma o pierde uno.
export function stepsWithEdgeTarget(steps: SequenceStep[], source: EdgeManageSource, newTargetId: string | null): SequenceStep[] {
  return source.kind === "option"
    ? stepsWithRewiredOption(steps, source.questionId, source.optionId, newTargetId)
    : steps.map(s => s.id === source.stepId ? { ...s, next_step_id: newTargetId } : s);
}

// Quita `removeIds` del grafo y borra TODA referencia a ellos desde cualquier padre (aristas de
// botones y aristas normales por igual): un id borrado se reemplaza por su reemplazo en `redirect`
// si lo tiene, o pasa a null. Nunca queda un padre apuntando a un paso que ya no existe.
export function stepsWithoutIds(steps: SequenceStep[], removeIds: Set<string>, redirect?: Map<string, string | null>): SequenceStep[] {
  const resolve = (id: string | null | undefined): string | null => {
    if (!id) return null;
    if (!removeIds.has(id)) return id;
    return redirect?.get(id) ?? null;
  };
  return steps.filter(s => !removeIds.has(s.id)).map(s => ({
    ...s,
    options: s.options?.map(o => ({ ...o, next_step_id: resolve(o.next_step_id) })),
    next_step_id: resolve(s.next_step_id),
  }));
}

// Deja a `rootId` en la posición 0 sin alterar el orden relativo del resto — la raíz de la
// secuencia es, por convención, `steps[0]` (es donde arranca el runtime, con flow_step = 0). Solo
// hace falta al borrar el primer paso: en cualquier otro caso el arreglo nunca se reordena.
export function stepsWithRoot(steps: SequenceStep[], rootId: string | null): SequenceStep[] {
  if (!rootId) return steps;
  const idx = steps.findIndex(s => s.id === rootId);
  if (idx <= 0) return steps;
  return [steps[idx], ...steps.slice(0, idx), ...steps.slice(idx + 1)];
}

// Borra `stepId` junto con los `discardedIds` que se pierden con él, y reconecta hacia
// `successorId` (o desconecta, si es null) todo lo que apuntaba al paso borrado. Si el borrado era
// la raíz, `successorId` pasa a ocupar su lugar como nuevo primer paso.
export function stepsAfterDeleting(steps: SequenceStep[], stepId: string, discardedIds: string[], successorId: string | null): SequenceStep[] {
  const removeIds = new Set([stepId, ...discardedIds]);
  if (successorId) removeIds.delete(successorId); // el paso que se conserva nunca se borra
  const wasRoot = steps[0]?.id === stepId;
  const cleaned = stepsWithoutIds(steps, removeIds, new Map([[stepId, successorId]]));
  return wasRoot ? stepsWithRoot(cleaned, successorId) : cleaned;
}

// ¿Se puede conectar sourceId → targetId? Solo si targetId ya está en un nivel ESTRICTAMENTE más
// profundo que sourceId en el árbol actual — nunca el mismo nivel, nunca uno anterior. Esto solo
// alcanza para garantizar que nunca se forme un ciclo: un ancestro real siempre tiene un nivel
// menor que su descendiente (cada conexión suma +1 de profundidad), así que cualquier candidato
// que pudiera cerrar un ciclo queda automáticamente descartado por este único chequeo.
export function canConnectForward(nodes: SeqGraphNode[], sourceId: string, targetId: string): boolean {
  if (sourceId === targetId) return false;
  const source = nodes.find(n => n.id === sourceId);
  const target = nodes.find(n => n.id === targetId);
  if (!source || !target) return false;
  return target.depth > source.depth;
}

// ¿Esta arista del grafo es la que identifica `source`? Un paso normal tiene una sola saliente;
// una pregunta tiene una por botón, y ahí lo que la distingue es el id del botón.
export function edgeMatchesSource(edge: SeqGraphEdge, source: EdgeManageSource): boolean {
  return source.kind === "option"
    ? edge.fromId === source.questionId && edge.optionId === source.optionId
    : edge.fromId === source.stepId && edge.optionId === undefined;
}

// Conexiones que llegan a un mismo paso, ordenadas de ARRIBA hacia ABAJO por la altura real desde
// la que sale cada una en el lienzo. Este orden es la única referencia que tiene el usuario para
// saber "cuál es cuál" cuando 2+ ramas terminan en el mismo paso, así que se calcula UNA vez acá y
// lo usan por igual el lienzo (para repartir los puntos de llegada) y el diálogo de gestión (para
// listar los caminos): si los dos no coincidieran exactamente, sería posible borrar el camino
// equivocado creyendo que se borra otro.
export function incomingEdgesInVisualOrder(
  graph: { nodes: SeqGraphNode[]; edges: SeqGraphEdge[] },
  targetId: string,
): { edge: SeqGraphEdge; index: number }[] {
  const sourceY = (e: SeqGraphEdge): number => {
    const from = graph.nodes.find(n => n.id === e.fromId);
    return from ? edgeSourceY(from, e.colorIdx) : 0;
  };
  return graph.edges
    .map((edge, index) => ({ edge, index }))
    .filter(e => e.edge.toId === targetId)
    .sort((a, b) => sourceY(a.edge) - sourceY(b.edge) || a.index - b.index);
}

// Separación vertical entre los puntos de llegada de varias conexiones a un mismo paso — se achica
// si son muchas, para que todas sigan cayendo dentro de la caja del nodo destino.
export function edgePortGap(count: number): number {
  // 16 = un poco más que el diámetro del círculo (r=7), para que no se toquen entre sí; 40 = alto
  // de la cabecera del nodo, para que ni el primero ni el último se salgan de la caja.
  return Math.min(16, 40 / Math.max(count - 1, 1));
}

// Descripción de "dónde" se está creando un paso nuevo desde el árbol — se resuelve recién
// cuando el usuario elige el tipo en el selector, en vez de crear directo con tipo "message".
export type PendingStepCreate =
  | { kind: "first" }
  | { kind: "after"; afterStepId: string }
  // optionId identifica la arista exacta cuando el origen es una pregunta — 2 botones de la misma
  // pregunta pueden apuntar al mismo destino, y solo se debe intercalar el paso en uno de ellos.
  | { kind: "edge"; fromId: string; toId: string; optionId?: string }
  | { kind: "option"; questionStepId: string; optionId: string };
