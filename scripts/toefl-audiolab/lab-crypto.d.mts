// Tipos para importar lab-crypto.mjs desde los tests (TS no infiere .mjs).
export const KDF_ITERATIONS: number;
export const IV_BYTES: number;
export function normalizePassword(password: string): string;
export function randomSalt(): Buffer;
export function deriveKey(password: string, salt: Buffer | Uint8Array, iterations?: number): Buffer;
export function encrypt(key: Buffer | Uint8Array, plaintext: Buffer | Uint8Array): Buffer;
export function decrypt(key: Buffer | Uint8Array, data: Buffer | Uint8Array): Buffer;
