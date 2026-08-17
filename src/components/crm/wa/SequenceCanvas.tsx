import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import type { SequenceStep } from "@/lib/supabase";
import {
  BRANCH_COLORS, SEQ_TREE_NODE_W, SEQ_TREE_NODE_H, SEQ_TREE_COL_PITCH,
  SEQ_TREE_PILL_H, SEQ_TREE_MAX_PILLS, SEQ_TREE_ROW_PITCH,
  buildSequenceGraph, nodeBoxHeight, edgeSourceY, getStepPreview,
} from "./sequence-graph";

// ─────────────────────────────────────────────────────────────────────────────
// Lienzo de una secuencia, en solo lectura.
//
// Dibuja exactamente lo mismo que el editor de Flujos —misma geometría, mismos
// colores de rama, mismo mockup de botones— pero sin nada en lo que se pueda
// hacer clic. Sirve para mirar qué hace una secuencia desde donde se la está
// usando (Seguimiento Automático, Envíos) sin salir de ahí ni arriesgar un
// cambio accidental.
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  message: "Mensaje", question: "Pregunta", image: "Imagen",
  video: "Video", audio: "Audio", file: "Documento", link: "Enlace",
};

export function SequenceCanvas({ steps, maxHeight = 340 }: {
  steps: SequenceStep[];
  maxHeight?: number;
}) {
  const graph = useMemo(() => steps.length ? buildSequenceGraph(steps) : null, [steps]);

  // Punto de llegada de cada conexión: si varias terminan en el mismo paso se
  // reparten en vertical para que no se solapen.
  const edgePorts = useMemo(() => {
    const ports = new Map<number, number>();
    if (!graph) return ports;
    for (const targetId of new Set(graph.edges.map(e => e.toId))) {
      const incoming = graph.edges
        .map((e, i) => ({ e, i }))
        .filter(({ e }) => e.toId === targetId);
      if (incoming.length <= 1) continue;
      const node = graph.nodes.find(n => n.id === targetId);
      const h = node ? nodeBoxHeight(node) : SEQ_TREE_NODE_H;
      const gap = h / (incoming.length + 1);
      incoming
        .sort((a, b) => {
          const na = graph.nodes.find(n => n.id === a.e.fromId);
          const nb = graph.nodes.find(n => n.id === b.e.fromId);
          return (na?.lane ?? 0) - (nb?.lane ?? 0);
        })
        .forEach(({ i }, idx) => ports.set(i, gap * (idx + 1) - h / 2));
    }
    return ports;
  }, [graph]);

  const edges = useMemo(() => {
    if (!graph) return [];
    return graph.edges.map((edge, ei) => {
      const from = graph.nodes.find(n => n.id === edge.fromId);
      const to   = graph.nodes.find(n => n.id === edge.toId);
      if (!from || !to) return null;
      const sx = from.depth * SEQ_TREE_COL_PITCH + SEQ_TREE_NODE_W;
      const sy = edgeSourceY(from, edge.colorIdx);
      const tx = to.depth * SEQ_TREE_COL_PITCH;
      const py = to.lane * SEQ_TREE_ROW_PITCH + SEQ_TREE_NODE_H / 2 + (edgePorts.get(ei) ?? 0);
      const midX = (sx + tx) / 2;
      const color = edge.colorIdx !== undefined
        ? BRANCH_COLORS[edge.colorIdx % BRANCH_COLORS.length].hex
        : "currentColor";
      return { edge, ei, sx, sy, tx, py, midX, color };
    }).filter(Boolean) as { edge: typeof graph.edges[0]; ei: number; sx: number; sy: number; tx: number; py: number; midX: number; color: string }[];
  }, [graph, edgePorts]);

  if (!graph || !graph.nodes.length) {
    return (
      <p className="text-[11px] text-muted-foreground/60 italic text-center py-6">
        Esta secuencia todavía no tiene pasos.
      </p>
    );
  }

  return (
    <div className="bg-secondary/10 overflow-auto rounded-xl border border-border" style={{ maxHeight }}>
      <div
        className="relative text-muted-foreground/40"
        style={{
          width: (graph.maxDepth + 1) * SEQ_TREE_COL_PITCH + SEQ_TREE_NODE_W + 40,
          height: (graph.maxLane + 1) * SEQ_TREE_ROW_PITCH + 16,
          margin: 12,
        }}
      >
        <svg className="absolute inset-0 overflow-visible pointer-events-none" width="100%" height="100%">
          {edges.map(({ edge, ei, sx, sy, tx, py, midX, color }) => (
            <g key={ei}>
              <path
                d={`M${sx},${sy} C${midX},${sy} ${midX},${py} ${tx},${py}`}
                stroke={color}
                strokeOpacity={edge.colorIdx !== undefined ? 0.8 : 0.3}
                strokeWidth={1.5}
                fill="none"
              />
              {edge.label && (
                <text x={tx - 14} y={py - 7} textAnchor="end" fontSize="8" fontWeight="700" fill={color} fontFamily="system-ui, sans-serif">
                  {edge.label}
                </text>
              )}
            </g>
          ))}
        </svg>

        {graph.nodes.map(node => {
          const x = node.depth * SEQ_TREE_COL_PITCH;
          const y = node.lane * SEQ_TREE_ROW_PITCH;

          // Botón de pregunta que no lleva a ningún sitio: en el editor se puede
          // conectar; aquí solo se señala, que es la información útil.
          if (node.pending) {
            return (
              <div key={node.id}
                title={`El botón "${node.pendingLabel}" no lleva a ningún paso`}
                className="absolute flex flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-destructive/50 bg-destructive/5 text-[8px] text-destructive px-2 text-center leading-tight"
                style={{ left: x, top: y, width: SEQ_TREE_NODE_W, height: SEQ_TREE_NODE_H }}>
                <span className="font-semibold flex items-center gap-1"><AlertTriangle size={8} className="shrink-0" /> sin respuesta</span>
              </div>
            );
          }

          const step = node.step!;
          const isQ = step.type === "question";
          const preview = getStepPreview(step, 30);
          const stepIdx = steps.findIndex(s => s.id === step.id);
          const boxH = nodeBoxHeight(node);
          const labeledOptions = isQ ? (step.options ?? []).filter(o => o.label.trim()).slice(0, SEQ_TREE_MAX_PILLS) : [];
          const borderClass = isQ ? "border-amber-400/50" : "border-border/70";

          return (
            <div key={node.id} className="absolute"
              style={{ left: x, top: y, width: SEQ_TREE_NODE_W, height: boxH }}>
              <div
                className={`w-full rounded-lg border bg-background px-2 py-1.5 text-left ${borderClass}`}
                style={{ height: SEQ_TREE_NODE_H }}
                title={node.mergeCount > 1 ? "Varias respuestas terminan en este mismo paso" : undefined}>
                <div className="flex items-center gap-1">
                  <span className="text-[8px] font-bold text-muted-foreground/60 shrink-0">{stepIdx + 1}</span>
                  <span className={`text-[9px] font-semibold truncate ${isQ ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                    {TYPE_LABEL[step.type] ?? step.type}
                  </span>
                  {node.mergeCount > 1 && (
                    <span className="ml-auto text-[8px] text-muted-foreground/50 shrink-0">↘{node.mergeCount}</span>
                  )}
                </div>
                {preview && <p className="text-[8px] text-muted-foreground/70 truncate leading-tight mt-0.5">{preview}</p>}
              </div>

              {/* Mockup de los botones, igual que en el editor */}
              {isQ && (
                <div className="flex flex-col gap-px mt-px">
                  {labeledOptions.length === 0 ? (
                    <div className="rounded border border-dashed border-amber-400/40 text-[7px] text-muted-foreground/50 text-center"
                      style={{ height: SEQ_TREE_PILL_H - 2, lineHeight: `${SEQ_TREE_PILL_H - 2}px` }}>
                      Sin botones
                    </div>
                  ) : labeledOptions.map((opt, i) => {
                    const c = BRANCH_COLORS[i % BRANCH_COLORS.length];
                    return (
                      <div key={opt.id}
                        className={`rounded border text-[7px] text-center truncate px-1 ${c.pill}`}
                        style={{ height: SEQ_TREE_PILL_H - 2, lineHeight: `${SEQ_TREE_PILL_H - 2}px` }}>
                        {opt.label}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
