// Checklist de audios completados, guardado en localStorage de este navegador.
// No se sincroniza entre dispositivos (decisión de producto: sin backend).

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "toefl_lab_progress_v1";

type Done = Readonly<Record<string, number>>;

function load(): Done {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    return raw && typeof raw === "object" && raw.done && typeof raw.done === "object" ? (raw.done as Done) : {};
  } catch {
    return {};
  }
}

let done: Done = load();
const listeners = new Set<() => void>();

function commit(next: Done) {
  done = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ done }));
  } catch {
    /* modo privado o disco lleno: el progreso vale mientras dure la pestaña */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Si abren la plataforma en dos pestañas, que se enteren una de la otra.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      done = load();
      listeners.forEach((l) => l());
    }
  });
}

export function setDone(id: string, value: boolean) {
  if (value === (id in done)) return;
  if (value) {
    commit({ ...done, [id]: Date.now() });
  } else {
    const { [id]: _removed, ...rest } = done;
    commit(rest);
  }
}

export function resetProgress() {
  commit({});
}

/** Set de ids completados; cambia de referencia solo cuando cambia el progreso. */
export function useProgress(): Done {
  return useSyncExternalStore(subscribe, () => done);
}

export function countDone(progress: Done, ids: string[]): number {
  return ids.reduce((n, id) => (id in progress ? n + 1 : n), 0);
}
