// Simulacro de Listening: los audios suenan en secuencia, una sola vez, sin
// pausa; al terminar cada uno corre el tiempo para responder (en el libro) y
// avanza solo. Pura lógica de temporizador: no corrige nada.

import { AlertTriangle, Headphones, Loader2, Play, Timer } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LAB_ROOT } from "./constants";
import { formatClock, formatDuration } from "./format";
import { useLab } from "./lab-context";
import { prefetchAudio } from "./lab-client";
import { usePlayer, usePlayerTime } from "./player";
import { modelTrack } from "./tracks";
import type { SimulacroPreset } from "./types";
import { ProgressBar, cx } from "./ui";

/** Margen entre ítems para que la persona se acomode antes de que suene el siguiente. */
const READY_MS = 3000;

type Phase = "ready" | "listen" | "answer" | "done";

interface Run {
  preset: SimulacroPreset;
  index: number;
  phase: Phase;
  startedAt: number;
  endedAt?: number;
}

export function Simulacro() {
  const { content, itemsById } = useLab();
  const { play, stop, status } = usePlayer();

  const [selectedId, setSelectedId] = useState(content.simulacros[0]?.id ?? "");
  const [run, setRun] = useState<Run | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0); // subir para reintentar la carga del audio actual
  const runRef = useRef<Run | null>(null);
  runRef.current = run;

  const preset = content.simulacros.find((s) => s.id === selectedId) ?? content.simulacros[0];

  const begin = () => {
    if (!preset) return;
    setLoadFailed(false);
    setRun({ preset, index: 0, phase: "ready", startedAt: Date.now() });
  };

  const advance = useCallback(() => {
    const r = runRef.current;
    if (!r || r.phase !== "answer") return;
    const last = r.index + 1 >= r.preset.items.length;
    setRun(last ? { ...r, phase: "done", endedAt: Date.now() } : { ...r, index: r.index + 1, phase: "ready" });
  }, []);

  const exit = () => {
    if (!window.confirm("¿Salir del simulacro? Los audios que ya escuchaste quedan marcados como completados.")) return;
    stop();
    setRun(null);
  };

  const index = run?.index;
  const phase = run?.phase;
  const items = run?.preset.items;

  // Motor: cada fase arma su propio temporizador y se desarma sola al cambiar
  useEffect(() => {
    if (index === undefined || !items || phase === undefined || phase === "done") return;
    const item = itemsById[items[index]];
    if (!item) return;

    if (phase === "ready") {
      prefetchAudio(item.id);
      const t = setTimeout(() => setRun((r) => (r && r.phase === "ready" ? { ...r, phase: "listen" } : r)), READY_MS);
      return () => clearTimeout(t);
    }

    if (phase === "listen") {
      let cancelled = false;
      setLoadFailed(false);
      const next = items[index + 1];
      if (next) prefetchAudio(next);
      void play(modelTrack(item, () => {
        if (!cancelled) setRun((r) => (r && r.phase === "listen" ? { ...r, phase: "answer" } : r));
      })).then((ok) => {
        if (!ok && !cancelled) setLoadFailed(true);
      });
      return () => { cancelled = true; };
    }

    // phase === "answer"
    const seconds = item.answerSeconds ?? 10;
    const deadline = Date.now() + seconds * 1000;
    setRemaining(seconds);
    const id = setInterval(() => {
      const left = Math.ceil((deadline - Date.now()) / 1000);
      if (left <= 0) {
        clearInterval(id);
        advance();
      } else {
        setRemaining(left);
      }
    }, 200);
    return () => clearInterval(id);
  }, [index, phase, items, itemsById, play, advance, attempt]);

  // Al entrar o salir de la pantalla no debe quedar sonando nada de otra sección
  useEffect(() => {
    stop();
    return () => stop();
  }, [stop]);

  // Que la pantalla no se apague a mitad del simulacro
  const active = run !== null && run.phase !== "done";
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let released = false;
    navigator.wakeLock.request("screen").then((l) => {
      if (released) void l.release();
      else lock = l;
    }).catch(() => {});
    return () => {
      released = true;
      void lock?.release().catch(() => {});
    };
  }, [active]);

  if (!preset) return null;

  // ─── Pantalla de resultado ─────────────────────────────────────────────────
  if (run?.phase === "done") {
    const seconds = Math.round(((run.endedAt ?? Date.now()) - run.startedAt) / 1000);
    return (
      <section className="tl-card tl-sim-done" aria-live="polite">
        <div className="tl-sim-icon"><Headphones aria-hidden="true" /></div>
        <h1>¡Simulacro completo!</h1>
        <p className="tl-sim-stats">
          <strong>{run.preset.items.length} audios</strong> en <strong>{formatClock(seconds)}</strong> · {run.preset.title}
        </p>
        <p className="tl-note">
          Ahora corrige con la clave del libro y lee cada guion con tus apuntes al lado (botón “Ver texto” en cada audio): el análisis de lo que fallaste vale más que hacer diez ejercicios más.
        </p>
        <div className="tl-sim-actions">
          <button type="button" className="tl-btn tl-btn-amber" onClick={begin}>Repetir simulacro</button>
          <Link to={LAB_ROOT} className="tl-btn tl-btn-ghost">Volver a los audios</Link>
        </div>
      </section>
    );
  }

  // ─── Simulacro en marcha ───────────────────────────────────────────────────
  if (run) {
    const item = itemsById[run.preset.items[run.index]];
    const total = run.preset.items.length;
    const questions = item.questions ?? 1;
    return (
      <section className="tl-card tl-sim-run" aria-live="polite">
        <div className="tl-sim-top">
          <span className="tl-sim-count">Audio {run.index + 1} de {total}</span>
          <button type="button" className="tl-link-btn" onClick={exit}>Salir</button>
        </div>
        <ProgressBar value={run.index + (run.phase === "answer" ? 1 : 0)} total={total} label="Avance del simulacro" />

        <p className="tl-sim-ref">{item.ref}</p>
        <h1 className="tl-sim-title">{item.label}</h1>

        {run.phase === "ready" && (
          <div className="tl-sim-stage">
            <p className="tl-sim-msg">Prepárate…</p>
            <div className="tl-sim-ready-bar"><span /></div>
            <p className="tl-sim-hint">El audio empieza solo. Se escucha una sola vez.</p>
          </div>
        )}

        {run.phase === "listen" && (
          <div className="tl-sim-stage">
            {loadFailed ? (
              <>
                <p className="tl-error" role="alert"><AlertTriangle aria-hidden="true" /> No pudimos cargar este audio. Revisa tu conexión.</p>
                <button type="button" className="tl-btn tl-btn-amber" onClick={() => setAttempt((n) => n + 1)}>Reintentar</button>
              </>
            ) : (
              <>
                <div className="tl-eq" aria-hidden="true"><i /><i /><i /><i /><i /></div>
                <p className="tl-sim-msg">{status === "loading" && <Loader2 className="tl-spin" aria-hidden="true" />} Escuchando…</p>
                <ListenProgress />
                <p className="tl-sim-hint">Toma apuntes. No se puede pausar ni repetir.</p>
              </>
            )}
          </div>
        )}

        {run.phase === "answer" && (
          <div className="tl-sim-stage">
            <CountdownRing remaining={remaining} total={item.answerSeconds ?? 10} />
            <p className="tl-sim-msg">
              {questions === 1 ? "Elige la mejor respuesta en tu libro" : `Responde las ${questions} preguntas en tu libro`}
            </p>
            <p className="tl-sim-hint">Avanza solo cuando llegue a cero.</p>
            <button type="button" className="tl-btn tl-btn-ghost" onClick={advance}>Ya respondí <Play aria-hidden="true" /></button>
          </div>
        )}
      </section>
    );
  }

  // ─── Pantalla de inicio ────────────────────────────────────────────────────
  return (
    <>
      <section className="tl-card">
        <h1 className="tl-h1"><Timer aria-hidden="true" /> Simulacro cronometrado</h1>
        <p className="tl-lead">
          Los audios de Listening suenan en secuencia, respetando tiempos como los del examen: <strong>audio → tiempo para responder → avanza solo</strong>. Sin pausas, sin repetir.
        </p>

        <div className="tl-presets" role="radiogroup" aria-label="Elige el simulacro">
          {content.simulacros.map((p) => {
            const seconds = p.items.reduce((sum, id) => sum + itemsById[id].duration + (itemsById[id].answerSeconds ?? 10) + READY_MS / 1000, 0);
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={p.id === selectedId}
                className={cx("tl-preset", p.id === selectedId && "is-on")}
                onClick={() => setSelectedId(p.id)}
              >
                <strong>{p.title}</strong>
                <span>{p.description}</span>
                <small>{p.items.length} audios · ≈ {Math.max(1, Math.round(seconds / 60))} min</small>
              </button>
            );
          })}
        </div>

        <Checklist preset={preset} />

        <button type="button" className="tl-btn tl-btn-amber tl-btn-block" onClick={begin}>
          <Play aria-hidden="true" /> Comenzar simulacro
        </button>
      </section>
    </>
  );
}

function Checklist({ preset }: { preset: SimulacroPreset }) {
  const { itemsById } = useLab();
  const refs = useMemo(() => {
    // "Ejercicio 6.1 · L1-3" → "Ejercicio 6.1" (sin el código del ítem)
    const exercises = new Set(preset.items.map((id) => itemsById[id].ref.replace(/ · [^·]+$/, "")));
    return [...exercises].join(", ");
  }, [preset, itemsById]);

  return (
    <div className="tl-prep">
      <h2>Antes de empezar</h2>
      <ul>
        <li>Ponte <strong>audífonos</strong> y busca un lugar sin ruido.</li>
        <li>Abre el libro en: <strong>{refs}</strong>. Ahí están las preguntas; aquí solo suena el audio.</li>
        <li>Ten a mano <strong>cuaderno y lápiz</strong> para tus apuntes.</li>
        <li>Cada audio suena <strong>una sola vez</strong>. No se puede pausar ni repetir.</li>
        <li>Los tiempos para responder son aproximados: ETS puede ajustarlos.</li>
      </ul>
    </div>
  );
}

/** Barra de avance del audio actual (aparte para que no repinte todo el simulacro cada 250 ms). */
function ListenProgress() {
  const { time, duration } = usePlayerTime();
  const pct = duration > 0 ? Math.min(100, (time / duration) * 100) : 0;
  return (
    <div className="tl-listen">
      <div className="tl-bar" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
      <div className="tl-listen-time">{formatClock(time)} / {formatDuration(duration)}</div>
    </div>
  );
}

function CountdownRing({ remaining, total }: { remaining: number; total: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const fraction = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;
  return (
    <div className={cx("tl-ring", remaining <= 3 && "is-low")} role="timer" aria-label={`${remaining} segundos para responder`}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle className="tl-ring-track" cx="60" cy="60" r={radius} />
        <circle className="tl-ring-fill" cx="60" cy="60" r={radius} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - fraction)} />
      </svg>
      <span className="tl-ring-num">{remaining}</span>
    </div>
  );
}
