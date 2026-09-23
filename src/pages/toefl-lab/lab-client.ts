// Acceso al paquete cifrado: desbloqueo con contraseña, sesión recordada en el
// dispositivo y audios descifrados bajo demanda.
//
// No hay servidor de por medio: /toefl-audiolab/ son archivos estáticos cifrados.
// "Contraseña correcta" = la llave derivada descifra content.bin (GCM autentica,
// así que una llave equivocada falla siempre, nunca devuelve basura).

import { WrongKeyError, decryptBytes, deriveKeyB64, importKey } from "./crypto";
import type { LabContent, LabMeta } from "./types";

const BASE = "/toefl-audiolab";
const KEY_STORAGE = "toefl_lab_key_v1";

export type LabErrorCode = "wrong-password" | "network";

export class LabError extends Error {
  constructor(public code: LabErrorCode) {
    super(code);
    this.name = "LabError";
  }
}

interface Session {
  key: CryptoKey;
  meta: LabMeta;
}

let session: Session | null = null;
const audioCache = new Map<string, Promise<string>>();

async function fetchOk(url: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new LabError("network");
  }
  if (!res.ok) throw new LabError("network");
  return res;
}

async function fetchMeta(): Promise<LabMeta> {
  // Sin caché: es lo que dice qué versión del paquete hay que bajar.
  const res = await fetchOk(`${BASE}/meta.json`, { cache: "no-store" });
  return (await res.json()) as LabMeta;
}

async function openContent(key: CryptoKey, meta: LabMeta): Promise<LabContent> {
  const res = await fetchOk(`${BASE}/content.bin?v=${meta.v}`);
  const plain = await decryptBytes(key, await res.arrayBuffer());
  session = { key, meta };
  return JSON.parse(new TextDecoder().decode(plain)) as LabContent;
}

function readStoredKey(): string | null {
  try {
    return localStorage.getItem(KEY_STORAGE);
  } catch {
    return null;
  }
}

function storeKey(keyB64: string) {
  try {
    localStorage.setItem(KEY_STORAGE, keyB64);
  } catch {
    /* modo privado: la sesión dura lo que dure la pestaña */
  }
}

function clearStoredKey() {
  try {
    localStorage.removeItem(KEY_STORAGE);
  } catch {
    /* nada que limpiar */
  }
}

/** Entra con la contraseña. Lanza LabError("wrong-password" | "network"). */
export async function loginWithPassword(password: string): Promise<LabContent> {
  const meta = await fetchMeta();
  const keyB64 = await deriveKeyB64(password, meta.salt, meta.iter);
  try {
    const content = await openContent(await importKey(keyB64), meta);
    storeKey(keyB64);
    return content;
  } catch (err) {
    if (err instanceof WrongKeyError) throw new LabError("wrong-password");
    throw err;
  }
}

/**
 * Reabre la sesión guardada en este dispositivo. null = no hay sesión (o ya no
 * sirve: cambiaron la contraseña). Lanza LabError("network") si no hay conexión,
 * sin borrar la sesión: cuando vuelva internet sigue valiendo.
 */
export async function resumeSession(): Promise<LabContent | null> {
  const keyB64 = readStoredKey();
  if (!keyB64) return null;
  const meta = await fetchMeta();
  try {
    return await openContent(await importKey(keyB64), meta);
  } catch (err) {
    if (err instanceof WrongKeyError) {
      clearStoredKey();
      return null;
    }
    throw err;
  }
}

export function logout() {
  session = null;
  clearStoredKey();
  for (const url of audioCache.values()) void url.then((u) => URL.revokeObjectURL(u)).catch(() => {});
  audioCache.clear();
}

/** URL (blob:) del audio ya descifrado. Se descifra una vez por sesión. */
export function getAudioUrl(id: string): Promise<string> {
  const cached = audioCache.get(id);
  if (cached) return cached;
  if (!session) return Promise.reject(new LabError("wrong-password"));

  const { key, meta } = session;
  const pending = (async () => {
    const res = await fetchOk(`${BASE}/a/${id}.bin?v=${meta.v}`);
    const plain = await decryptBytes(key, await res.arrayBuffer());
    // Safari no reproduce un blob de audio sin tipo declarado.
    return URL.createObjectURL(new Blob([plain], { type: "audio/mpeg" }));
  })();

  audioCache.set(id, pending);
  // Si falló, que el próximo intento vuelva a pedirlo en vez de repetir el error.
  pending.catch(() => audioCache.delete(id));
  return pending;
}

export function prefetchAudio(id: string) {
  getAudioUrl(id).catch(() => {});
}
