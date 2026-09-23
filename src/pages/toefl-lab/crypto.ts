// Descifrado del TOEFL Audio Lab (lado navegador, Web Crypto).
// Formato y derivación: ver scripts/toefl-audiolab/lab-crypto.mjs.

const IV_BYTES = 12;
const TAG_BYTES = 16;

/** Debe ser idéntica a normalizePassword() de scripts/toefl-audiolab/lab-crypto.mjs. */
export function normalizePassword(password: string): string {
  return password.normalize("NFKC").trim().toLowerCase();
}

/** La llave no descifra el archivo: contraseña equivocada, o paquete cambiado desde que se guardó. */
export class WrongKeyError extends Error {
  constructor() {
    super("La llave no descifra este contenido");
    this.name = "WrongKeyError";
  }
}

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

export function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Contraseña → 32 bytes de llave (en base64, para poder recordarla en este dispositivo). */
export async function deriveKeyB64(password: string, saltB64: string, iterations: number): Promise<string> {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(normalizePassword(password)), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: base64ToBytes(saltB64), iterations }, material, 256);
  return bytesToBase64(new Uint8Array(bits));
}

export function importKey(keyB64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", base64ToBytes(keyB64), "AES-GCM", false, ["decrypt"]);
}

export async function decryptBytes(key: CryptoKey, data: ArrayBuffer): Promise<ArrayBuffer> {
  if (data.byteLength < IV_BYTES + TAG_BYTES) throw new WrongKeyError();
  const bytes = new Uint8Array(data);
  try {
    return await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(0, IV_BYTES) }, key, bytes.slice(IV_BYTES));
  } catch {
    throw new WrongKeyError();
  }
}
