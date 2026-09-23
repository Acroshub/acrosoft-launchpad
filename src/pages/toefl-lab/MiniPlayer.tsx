import { Loader2, Pause, Play } from "lucide-react";
import type { CSSProperties } from "react";
import { formatClock, formatDuration } from "./format";
import { usePlayer, usePlayerTime } from "./player";

/** Barra fija de abajo (como en el mockup): qué suena, play/pausa, avance y tiempo. */
export function MiniPlayer() {
  const { track, status, error, toggle, seek } = usePlayer();
  const { time, duration } = usePlayerTime();
  if (!track) return null;

  const pct = duration > 0 ? Math.min(100, (time / duration) * 100) : 0;
  const playing = status === "playing";

  return (
    <div className="tl-mini" role="region" aria-label="Reproductor">
      <button type="button" className="tl-play tl-play-sm" onClick={toggle} aria-label={playing ? "Pausar" : "Reproducir"}>
        {status === "loading" ? <Loader2 className="tl-spin" aria-hidden="true" /> : playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
      </button>
      <div className="tl-mini-body">
        <div className="tl-mini-title">{track.title}</div>
        {error ? (
          <div className="tl-mini-error" role="alert">{error}</div>
        ) : (
          <input
            type="range"
            className="tl-seek"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(time, duration || 0)}
            onChange={(e) => seek(Number(e.target.value))}
            disabled={!duration}
            aria-label="Posición del audio"
            style={{ "--pct": `${pct}%` } as CSSProperties}
          />
        )}
      </div>
      <div className="tl-mini-time" aria-hidden="true">
        {formatClock(time)} / {formatDuration(duration)}
      </div>
    </div>
  );
}
