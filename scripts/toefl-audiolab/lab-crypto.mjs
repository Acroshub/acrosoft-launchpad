// Cifrado del TOEFL Audio Lab (lado build, Node).
//
// La webapp es un sitio estático sin backend, así que la contraseña compartida
// no "valida" nada en un servidor: es la llave con la que se cifran los audios,
// los guiones y las plantillas. Sin la contraseña, lo que hay en /public son
// bytes ilegibles. El navegador (src/pages/toefl-lab/crypto.ts) hace la misma
// derivación con Web Crypto y descifra.
//
// Formato de cada archivo .bin:  iv (12 bytes) || ciphertext || tag GCM (16 bytes)
// Llave: PBKDF2-SHA256(contraseña normalizada, salt de meta.json, KDF_ITERATIONS) → AES-256-GCM.

import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from "node:crypto";

export const KDF_ITERATIONS = 250_000;
export const IV_BYTES = 12;
const TAG_BYTES = 16;

/**
 * Debe ser idéntica a normalizePassword() de src/pages/toefl-lab/crypto.ts.
 * Minúsculas y sin espacios en los bordes: en el celular el teclado pone la
 * primera letra en mayúscula sola y eso no debería costar un ticket de soporte.
 */
export function normalizePassword(password) {
  return password.normalize("NFKC").trim().toLowerCase();
}

export function randomSalt() {
  return randomBytes(16);
}

export function deriveKey(password, salt, iterations = KDF_ITERATIONS) {
  return pbkdf2Sync(normalizePassword(password), salt, iterations, 32, "sha256");
}

export function encrypt(key, plaintext) {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([iv, body, cipher.getAuthTag()]);
}

export function decrypt(key, data) {
  const iv = data.subarray(0, IV_BYTES);
  const tag = data.subarray(data.length - TAG_BYTES);
  const body = data.subarray(IV_BYTES, data.length - TAG_BYTES);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]);
}
