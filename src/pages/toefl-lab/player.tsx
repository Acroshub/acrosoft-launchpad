// Un solo <audio> para toda la plataforma: garantiza "un audio a la vez" (el
// modelo, tu grabación y el simulacro pasan por el mismo reproductor) y, en
// iPhone, que un elemento ya autorizado por un toque pueda seguir reproduciendo
// solo (lo que necesita el simulacro para avanzar sin que toques nada).

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export interface Track {
  /** Identidad: "audio:L1-3", "rec:SetA-2"… Sirve para saber qué fila está sonando. */
  key: string;
  title: string;
  subtitle?: string;
  /** Devuelve una URL reproducible (ya descifrada). Puede tardar: se muestra "cargando". */
  getUrl: () => Promise<string>;
  /** Duración conocida, para cuando el navegador no la sabe (webm grabado reporta Infinity). */
  durationHint?: number;
  /** Se llama cuando el audio termina solo (no cuando lo pausan ni lo reemplazan). */
  onEnded?: () => void;
}

export type PlayerStatus = "idle" | "loading" | "playing" | "paused";

interface PlayerActions {
  /** true si el audio arrancó; false si no se pudo cargar o reproducir. */
  play: (track: Track) => Promise<boolean>;
  toggle: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  stop: () => void;
}

interface PlayerState {
  track: Track | null;
  status: PlayerStatus;
  error: string | null;
}

const ActionsContext = createContext<PlayerActions | null>(null);
const StateContext = createContext<PlayerState>({ track: null, status: "idle", error: null });
// El tiempo cambia ~4 veces por segundo: va aparte para que solo el reproductor
// de abajo se vuelva a pintar, no toda la lista.
const TimeContext = createContext<{ time: number; duration: number }>({ time: 0, duration: 0 });

/** 0,1 s de silencio: se reproduce en el primer toque para "autorizar" el elemento en Safari. */
function makeSilentWavUrl(): string {
  const samples = 800;
  const rate = 8000;
  const buf = new ArrayBuffer(44 + samples);
  const v = new DataView(buf);
  const tag = (offset: number, s: string) => [...s].forEach((c, i) => v.setUint8(offset + i, c.charCodeAt(0)));
  tag(0, "RIFF"); v.setUint32(4, 36 + samples, true); tag(8, "WAVE"); tag(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
  tag(36, "data"); v.setUint32(40, samples, true);
  new Uint8Array(buf, 44).fill(128);
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PlayerState>({ track: null, status: "idle", error: null });
  const [clock, setClock] = useState({ time: 0, duration: 0 });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackRef = useRef<Track | null>(null);
  const tokenRef = useRef(0);
  const silentRef = useRef<string | null>(null);
  const unlockedRef = useRef(false);

  const actions = useMemo<PlayerActions>(() => {
    const audio = () => (audioRef.current ??= new Audio());
    const isSilent = () => silentRef.current !== null && audio().src === silentRef.current;

    /** Se llama de forma SÍNCRONA dentro del toque del usuario (antes de cualquier await). */
    const unlock = () => {
      if (unlockedRef.current) return;
      unlockedRef.current = true;
      silentRef.current = makeSilentWavUrl();
      const a = audio();
      a.src = silentRef.current;
      a.play().catch(() => {});
    };

    const stop = () => {
      tokenRef.current++;
      const a = audio();
      a.pause();
      trackRef.current = null;
      setState({ track: null, status: "idle", error: null });
      setClock({ time: 0, duration: 0 });
    };

    const play = async (track: Track): Promise<boolean> => {
      unlock();
      const token = ++tokenRef.current;
      const a = audio();
      a.pause();
      trackRef.current = track;
      setState({ track, status: "loading", error: null });
      setClock({ time: 0, duration: track.durationHint ?? 0 });

      let url: string;
      try {
        url = await track.getUrl();
      } catch {
        if (token === tokenRef.current) setState({ track, status: "paused", error: "No pudimos cargar el audio. Revisa tu conexión e inténtalo de nuevo." });
        return false;
      }
      if (token !== tokenRef.current) return false; // otro audio tomó el turno

      a.src = url;
      try {
        await a.play();
        return token === tokenRef.current;
      } catch {
        if (token === tokenRef.current) setState({ track, status: "paused", error: "Tu navegador bloqueó la reproducción. Toca play para escuchar." });
        return false;
      }
    };

    return {
      play,
      stop,
      toggle: () => {
        const a = audio();
        if (!trackRef.current) return;
        if (a.paused) a.play().catch(() => {});
        else a.pause();
      },
      pause: () => audio().pause(),
      seek: (seconds) => {
        const a = audio();
        if (Number.isFinite(seconds)) a.currentTime = Math.max(0, seconds);
      },
    };
  }, []);

  useEffect(() => {
    const a = (audioRef.current ??= new Audio());
    a.preload = "auto";
    const silent = () => silentRef.current !== null && a.src === silentRef.current;
    const realDuration = () => (Number.isFinite(a.duration) && a.duration > 0 ? a.duration : trackRef.current?.durationHint ?? 0);

    const onPlay = () => { if (!silent() && trackRef.current) setState((s) => ({ ...s, status: "playing", error: null })); };
    const onPause = () => { if (!silent() && trackRef.current && !a.ended) setState((s) => (s.status === "loading" ? s : { ...s, status: "paused" })); };
    const onTime = () => { if (!silent()) setClock({ time: a.currentTime, duration: realDuration() }); };
    const onEnded = () => {
      if (silent() || !trackRef.current) return;
      const finished = trackRef.current;
      setState((s) => ({ ...s, status: "paused" }));
      setClock({ time: realDuration(), duration: realDuration() });
      finished.onEnded?.();
    };
    const onError = () => {
      if (silent() || !trackRef.current) return;
      setState((s) => ({ ...s, status: "paused", error: "No pudimos reproducir este audio." }));
    };

    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onTime);
    a.addEventListener("durationchange", onTime);
    a.addEventListener("ended", onEnded);
    a.addEventListener("error", onError);
    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onTime);
      a.removeEventListener("durationchange", onTime);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("error", onError);
      a.pause();
      if (silentRef.current) URL.revokeObjectURL(silentRef.current);
    };
  }, []);

  return (
    <ActionsContext.Provider value={actions}>
      <StateContext.Provider value={state}>
        <TimeContext.Provider value={clock}>{children}</TimeContext.Provider>
      </StateContext.Provider>
    </ActionsContext.Provider>
  );
}

/** Estado del reproductor + acciones (no se repinta con cada segundo que avanza). */
export function usePlayer(): PlayerState & PlayerActions {
  const actions = useContext(ActionsContext);
  const state = useContext(StateContext);
  if (!actions) throw new Error("usePlayer fuera de PlayerProvider");
  return { ...state, ...actions };
}

export function usePlayerTime() {
  return useContext(TimeContext);
}
