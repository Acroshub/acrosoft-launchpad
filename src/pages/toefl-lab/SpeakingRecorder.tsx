// Grabar y comparar (shadowing): la persona se graba repitiendo la frase y, al
// detener, suena el audio modelo para comparar de oído. Sin ninguna corrección:
// el punto es escucharse a sí misma. Nada sale del navegador.

import { Mic, Pause, Play, Repeat, Square, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatClock } from "./format";
import { usePlayer, type Track } from "./player";
import { deleteRecording, loadRecording, saveRecording } from "./recordings";
import { modelTrack } from "./tracks";
import type { AudioItem } from "./types";
import { cx } from "./ui";

const MAX_SECONDS = 30; // la frase más larga dura ~8 s: 30 s cubre de sobra sin dejar grabaciones eternas

/** Solo una grabación a la vez en toda la plataforma. */
let stopActiveRecorder: (() => void) | null = null;

function pickMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"].find((t) => MediaRecorder.isTypeSupported(t));
}

function friendlyError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "No tenemos permiso para usar el micrófono. Actívalo en los permisos del sitio (el candado junto a la dirección) y vuelve a intentarlo.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "No encontramos un micrófono. Conecta uno (o unos audífonos con micrófono) e inténtalo de nuevo.";
  }
  if (name === "NotReadableError") return "Otra aplicación está usando el micrófono. Ciérrala e inténtalo de nuevo.";
  return "No pudimos iniciar la grabación en este navegador.";
}

interface Take {
  url: string;
  seconds: number;
}

export function SpeakingRecorder({ item, onRecordingChange }: { item: AudioItem; onRecordingChange: (recording: boolean) => void }) {
  const player = usePlayer();
  const supported = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";

  const [phase, setPhase] = useState<"idle" | "starting" | "recording">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [take, setTake] = useState<Take | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const takeUrlRef = useRef<string | null>(null);
  const unmountedRef = useRef(false);
  const skipAutoplayRef = useRef(false);
  const playerRef = useRef(player);
  playerRef.current = player;

  const recKey = `rec:${item.id}`;

  const showTake = useCallback((blob: Blob, seconds: number) => {
    if (takeUrlRef.current) URL.revokeObjectURL(takeUrlRef.current);
    const url = URL.createObjectURL(blob);
    takeUrlRef.current = url;
    setTake({ url, seconds });
  }, []);

  // Toma guardada de una visita anterior
  useEffect(() => {
    let cancelled = false;
    loadRecording(item.id).then((r) => {
      if (!cancelled && r) showTake(r.blob, r.seconds);
    });
    return () => { cancelled = true; };
  }, [item.id, showTake]);

  // Al salir de la pantalla: cortar el micrófono y soltar la URL
  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") rec.stop();
      if (takeUrlRef.current) URL.revokeObjectURL(takeUrlRef.current);
    };
  }, []);

  const stop = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  }, []);

  // Cronómetro de la grabación (con tope)
  useEffect(() => {
    if (phase !== "recording") return;
    const startedAt = Date.now();
    setElapsed(0);
    const id = setInterval(() => {
      const secs = (Date.now() - startedAt) / 1000;
      setElapsed(secs);
      if (secs >= MAX_SECONDS) stop();
    }, 200);
    return () => clearInterval(id);
  }, [phase, stop]);

  const start = async () => {
    if (phase !== "idle") return;
    setError(null);
    setPhase("starting");
    player.stop(); // el modelo no debe colarse en el micrófono
    stopActiveRecorder?.();

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      setError(friendlyError(err));
      setPhase("idle");
      return;
    }

    const mimeType = pickMime();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      setError("Tu navegador no permite grabar audio. Prueba con Chrome, Edge o Safari actualizado.");
      setPhase("idle");
      return;
    }

    const chunks: Blob[] = [];
    const startedAt = Date.now();
    // Si otra fila arranca a grabar, esta se corta en silencio: sin sonar el modelo encima.
    const cutForAnotherRow = () => {
      skipAutoplayRef.current = true;
      stop();
    };
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      recorderRef.current = null;
      if (stopActiveRecorder === cutForAnotherRow) stopActiveRecorder = null;
      void finish(new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" }), (Date.now() - startedAt) / 1000);
    };

    recorderRef.current = recorder;
    stopActiveRecorder = cutForAnotherRow;
    recorder.start();
    setPhase("recording");
    onRecordingChange(true);
  };

  const finish = async (blob: Blob, seconds: number) => {
    if (!unmountedRef.current) {
      setPhase("idle");
      onRecordingChange(false);
    }
    if (seconds < 0.6 || blob.size < 500) {
      if (!unmountedRef.current) setError("La grabación salió vacía o muy corta. Toca “Grabar”, repite la frase y luego “Detener”.");
      return;
    }
    const secs = Math.round(seconds * 10) / 10;
    await saveRecording(item.id, blob, secs);
    if (unmountedRef.current) return;
    showTake(blob, secs);
    // Apenas terminas de grabar suena el modelo: comparas de oído (shadowing)
    const skip = skipAutoplayRef.current;
    skipAutoplayRef.current = false;
    if (!skip) void playerRef.current.play(modelTrack(item));
  };

  const toggle = (track: Track) => (player.track?.key === track.key ? player.toggle() : void player.play(track));
  const takeTrack = (then?: () => void): Track | null =>
    take && {
      key: recKey,
      title: `Tu grabación · ${item.label}`,
      subtitle: "Solo en tu navegador",
      durationHint: take.seconds,
      getUrl: async () => take.url,
      onEnded: then,
    };

  const discard = async () => {
    if (player.track?.key === recKey) player.stop();
    await deleteRecording(item.id);
    if (takeUrlRef.current) URL.revokeObjectURL(takeUrlRef.current);
    takeUrlRef.current = null;
    setTake(null);
  };

  if (!supported) {
    return (
      <div className="tl-rec">
        <p className="tl-rec-error" role="alert">Este navegador no permite grabar audio. Prueba con Chrome, Edge o Safari actualizado; el resto de la plataforma sigue funcionando.</p>
      </div>
    );
  }

  const isPlaying = (key: string) => player.track?.key === key && player.status === "playing";
  const recording = phase === "recording";

  return (
    <div className="tl-rec">
      <div className="tl-rec-main">
        {recording ? (
          <button type="button" className="tl-btn tl-btn-danger" onClick={stop}>
            <Square aria-hidden="true" /> Detener · {formatClock(elapsed)}
          </button>
        ) : (
          <button type="button" className="tl-btn tl-btn-amber" onClick={start} disabled={phase === "starting"}>
            <Mic aria-hidden="true" /> {take ? "Grabar de nuevo" : "Grabar mi voz"}
          </button>
        )}
        {recording && <span className="tl-rec-live" role="status">Grabando… repite la frase</span>}
      </div>

      <p className="tl-rec-help">
        Usa audífonos. Al detener, suena el audio modelo para que compares de oído. Tu grabación se queda solo en este navegador.
      </p>

      {take && !recording && (
        <div className="tl-rec-take" role="group" aria-label="Tu grabación">
          <button type="button" className={cx("tl-chip", isPlaying(recKey) && "is-on")} onClick={() => { const t = takeTrack(); if (t) toggle(t); }}>
            {isPlaying(recKey) ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />} Mi grabación · {formatClock(take.seconds)}
          </button>
          <button type="button" className={cx("tl-chip", isPlaying(`audio:${item.id}`) && "is-on")} onClick={() => toggle(modelTrack(item))}>
            {isPlaying(`audio:${item.id}`) ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />} Modelo
          </button>
          <button type="button" className="tl-chip" onClick={() => { const t = takeTrack(() => void player.play(modelTrack(item))); if (t) void player.play(t); }}>
            <Repeat aria-hidden="true" /> Comparar: tú → modelo
          </button>
          <button type="button" className="tl-chip tl-chip-danger" onClick={discard}>
            <Trash2 aria-hidden="true" /> Descartar
          </button>
        </div>
      )}

      {error && <p className="tl-rec-error" role="alert">{error}</p>}
    </div>
  );
}
