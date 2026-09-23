// Grabaciones de Speaking: viven solo en este navegador (IndexedDB), nunca se
// suben a ningún servidor. Una toma por frase: grabar de nuevo reemplaza la anterior.
//
// localStorage no sirve para esto (guarda texto y tiene ~5 MB), por eso IndexedDB.
// Si IndexedDB no está disponible (modo privado en algunos navegadores) se usa
// memoria: la grabación dura mientras la pestaña siga abierta.

import { useEffect, useSyncExternalStore } from "react";

const DB_NAME = "toefl-audiolab";
const STORE = "recordings";

interface StoredRecording {
  buf: ArrayBuffer;
  type: string;
  seconds: number;
}

export interface Recording {
  blob: Blob;
  seconds: number;
}

const memory = new Map<string, StoredRecording>();
let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("sin IndexedDB"));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  dbPromise.catch(() => { dbPromise = null; });
  return dbPromise;
}

async function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const req = run(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ─── Ids con grabación (para el indicador en la lista) ───────────────────────
let recordedIds: ReadonlySet<string> = new Set();
let loaded = false;
const listeners = new Set<() => void>();

function setIds(next: Set<string>) {
  recordedIds = next;
  listeners.forEach((l) => l());
}

async function ensureLoaded() {
  if (loaded) return;
  loaded = true;
  try {
    const keys = await tx("readonly", (s) => s.getAllKeys());
    setIds(new Set([...recordedIds, ...keys.map(String)]));
  } catch {
    /* solo memoria */
  }
}

/** Ids que tienen una toma guardada. */
export function useRecordedIds(): ReadonlySet<string> {
  useEffect(() => { void ensureLoaded(); }, []);
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => recordedIds,
  );
}

// ─── API ─────────────────────────────────────────────────────────────────────
export async function saveRecording(id: string, blob: Blob, seconds: number): Promise<void> {
  const stored: StoredRecording = { buf: await blob.arrayBuffer(), type: blob.type, seconds };
  memory.set(id, stored);
  setIds(new Set([...recordedIds, id]));
  try {
    await tx("readwrite", (s) => s.put(stored, id));
  } catch {
    /* quedó en memoria */
  }
}

export async function loadRecording(id: string): Promise<Recording | null> {
  let stored = memory.get(id);
  if (!stored) {
    try {
      stored = (await tx<StoredRecording | undefined>("readonly", (s) => s.get(id))) ?? undefined;
    } catch {
      stored = undefined;
    }
  }
  return stored ? { blob: new Blob([stored.buf], { type: stored.type }), seconds: stored.seconds } : null;
}

export async function deleteRecording(id: string): Promise<void> {
  memory.delete(id);
  const next = new Set(recordedIds);
  next.delete(id);
  setIds(next);
  try {
    await tx("readwrite", (s) => s.delete(id));
  } catch {
    /* ya no está en memoria */
  }
}
