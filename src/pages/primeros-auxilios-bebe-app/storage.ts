// localStorage con try/catch: si está bloqueado (modo privado, política del navegador)
// la app sigue funcionando y guarda en memoria mientras dure la pestaña.
import { useCallback, useEffect, useRef, useState } from "react";
import { STATE_PREFIX } from "./constants";

const memory = new Map<string, string>();

export function readRaw(key: string): string | null {
  try {
    const v = localStorage.getItem(STATE_PREFIX + key);
    if (v !== null) return v;
  } catch {
    /* bloqueado: usamos memoria */
  }
  return memory.get(key) ?? null;
}

export function writeRaw(key: string, value: string): boolean {
  memory.set(key, value);
  try {
    localStorage.setItem(STATE_PREFIX + key, value);
    return true;
  } catch {
    return false;
  }
}

export function readJSON<T>(key: string, fallback: T, sanitize?: (raw: unknown) => T): T {
  const raw = readRaw(key);
  if (raw === null) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    return sanitize ? sanitize(parsed) : (parsed as T);
  } catch {
    return fallback;
  }
}

/** Como useState, pero se guarda solo y se recarga al volver. */
export function usePersisted<T>(key: string, fallback: T, sanitize?: (raw: unknown) => T): [T, (next: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => readJSON(key, fallback, sanitize));
  const ref = useRef(value);
  ref.current = value;
  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved = typeof next === "function" ? (next as (p: T) => T)(ref.current) : next;
      ref.current = resolved;
      setValue(resolved);
    },
    [],
  );
  useEffect(() => {
    writeRaw(key, JSON.stringify(value));
  }, [key, value]);
  return [value, set];
}
