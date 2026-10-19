// Acceso al paquete cifrado: desbloqueo con contraseña, sesión recordada en el dispositivo y
// PDFs descifrados bajo demanda. Sin servidor: /primeros-auxilios-bebe-pack/ son archivos estáticos cifrados.
// "Contraseña correcta" = la llave derivada descifra content.bin (GCM autentica).

import { DATA_BASE, KEY_STORAGE } from "./constants";
import { WrongKeyError, decryptBytes, deriveKeyB64, importKey } from "./crypto";
import type { PackContent, PackMeta } from "./types";

export type PackErrorCode = "wrong-password" | "network";

export class PackError extends Error {
  constructor(public code: PackErrorCode) {
    super(code);
    this.name = "PackError";
  }
}

interface Session {
  key: CryptoKey;
  meta: PackMeta;
}

let session: Session | null = null;
let sessionKeyB64: string | null = null; // respaldo si localStorage está bloqueado
const pdfCache = new Map<string, Promise<string>>();

async function fetchOk(url: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new PackError("network");
  }
  if (!res.ok) throw new PackError("network");
  return res;
}

async function fetchMeta(): Promise<PackMeta> {
  const res = await fetchOk(`${DATA_BASE}/meta.json`, { cache: "no-store" });
  try {
    return (await res.json()) as PackMeta;
  } catch {
    // En desarrollo, si el paquete no existe, el servidor devuelve el index.html.
    throw new PackError("network");
  }
}

async function openContent(key: CryptoKey, meta: PackMeta): Promise<PackContent> {
  const res = await fetchOk(`${DATA_BASE}/content.bin?v=${meta.v}`);
  const plain = await decryptBytes(key, await res.arrayBuffer());
  session = { key, meta };
  return JSON.parse(new TextDecoder().decode(plain)) as PackContent;
}

function readStoredKey(): string | null {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? sessionKeyB64;
  } catch {
    return sessionKeyB64;
  }
}

function storeKey(keyB64: string) {
  sessionKeyB64 = keyB64;
  try {
    localStorage.setItem(KEY_STORAGE, keyB64);
  } catch {
    /* modo privado: la sesión dura lo que dure la pestaña */
  }
}

function clearStoredKey() {
  sessionKeyB64 = null;
  try {
    localStorage.removeItem(KEY_STORAGE);
  } catch {
    /* nada que limpiar */
  }
}

/** ¿Hay una sesión guardada en este dispositivo? (para abrir las tarjetas sin conexión). */
export function hasStoredSession(): boolean {
  return readStoredKey() !== null;
}

/** Entra con la contraseña. Lanza PackError("wrong-password" | "network"). */
export async function loginWithPassword(password: string): Promise<PackContent> {
  const meta = await fetchMeta();
  const keyB64 = await deriveKeyB64(password, meta.salt, meta.iter);
  try {
    const content = await openContent(await importKey(keyB64), meta);
    storeKey(keyB64);
    return content;
  } catch (err) {
    if (err instanceof WrongKeyError) throw new PackError("wrong-password");
    throw err;
  }
}

/** Reabre la sesión guardada. null = no hay sesión o ya no sirve. Lanza PackError("network") sin borrar la sesión. */
export async function resumeSession(): Promise<PackContent | null> {
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
  for (const url of pdfCache.values()) void url.then((u) => URL.revokeObjectURL(u)).catch(() => {});
  pdfCache.clear();
}

/** URL (blob:) del PDF ya descifrado. Se descifra una vez por sesión. */
export function getPdfUrl(id: string): Promise<string> {
  const cached = pdfCache.get(id);
  if (cached) return cached;
  if (!session) return Promise.reject(new PackError("wrong-password"));
  const { key, meta } = session;
  const pending = (async () => {
    const res = await fetchOk(`${DATA_BASE}/lib/${encodeURIComponent(id)}.bin?v=${meta.v}`);
    const plain = await decryptBytes(key, await res.arrayBuffer());
    return URL.createObjectURL(new Blob([plain], { type: "application/pdf" }));
  })();
  pdfCache.set(id, pending);
  pending.catch(() => pdfCache.delete(id));
  return pending;
}
