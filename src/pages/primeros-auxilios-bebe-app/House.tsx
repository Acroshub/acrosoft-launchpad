import { useState } from "react";
import { useApp } from "./app-context";
import { ROOMS, itemsForStage } from "./checklist";
import { checklistProgress, sanitizeBoolMap } from "./logic";
import { StagePicker } from "./Home";
import { usePersisted } from "./storage";

export function House() {
  const { stage } = useApp();
  const [done, setDone] = usePersisted<Record<string, boolean>>("house", {}, sanitizeBoolMap);
  const [showAll, setShowAll] = useState(false);
  const visible = ROOMS.map((r) => ({ room: r, items: stage && !showAll ? itemsForStage(r, stage) : r.items })).filter((r) => r.items.length > 0);
  const all = visible.flatMap((v) => v.items);
  const total = checklistProgress(all, done);
  const pct = total.total ? Math.round((total.done / total.total) * 100) : 0;

  return (
    <section className="pab-section">
      <StagePicker />
      <div className="pab-progress-wrap">
      <div className="pab-progress" role="progressbar" aria-label="Progreso del checklist" aria-valuemin={0} aria-valuemax={total.total} aria-valuenow={total.done}>
        <span style={{ width: `${pct}%` }} />
      </div>
      <p className="pab-progress-n" aria-live="polite">{total.done}/{total.total}</p>
      </div>
      {stage && (
        <label className="pab-check pab-check-inline">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
          <span>Ver todas las etapas</span>
        </label>
      )}
      {visible.map(({ room, items }) => {
        const p = checklistProgress(items, done);
        return (
          <details key={room.id} className="pab-room" open={visible.length <= 2 ? true : undefined}>
            <summary>
              <strong>{room.title}</strong>
              <span>{p.done}/{p.total}</span>
            </summary>
            <ul>
              {items.map((it) => (
                <li key={it.id}>
                  <label className="pab-check">
                    <input type="checkbox" checked={!!done[it.id]} onChange={(e) => setDone((d) => ({ ...d, [it.id]: e.target.checked }))} />
                    <span>{it.text}</span>
                  </label>
                </li>
              ))}
            </ul>
          </details>
        );
      })}
      <button type="button" className="pab-link" onClick={() => { if (window.confirm("¿Desmarcar todo?")) setDone({}); }}>Reiniciar</button>
    </section>
  );
}
