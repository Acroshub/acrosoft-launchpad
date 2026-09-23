// @vitest-environment node
// (jsdom no trae crypto.subtle; acá probamos el cifrado real, sin DOM.)
import { describe, expect, it } from "vitest";
import * as node from "../../../scripts/toefl-audiolab/lab-crypto.mjs";
import { WrongKeyError, decryptBytes, deriveKeyB64, importKey } from "./crypto";

const ITER = 1000; // solo para que el test sea rápido; en producción son 250.000
const salt = Buffer.from("0123456789abcdef");
const saltB64 = salt.toString("base64");

/** Cifra como el script de build y descifra como el navegador. */
async function roundTrip(buildPassword: string, browserPassword: string, plaintext: Buffer) {
  const enc = node.encrypt(node.deriveKey(buildPassword, salt, ITER), plaintext);
  const key = await importKey(await deriveKeyB64(browserPassword, saltB64, ITER));
  const ab = enc.buffer.slice(enc.byteOffset, enc.byteOffset + enc.byteLength);
  return decryptBytes(key, ab);
}

describe("cifrado del TOEFL Audio Lab (build ↔ navegador)", () => {
  it("el navegador descifra lo que cifra el build", async () => {
    const plain = Buffer.from("ID3 audio de prueba · ñ é ✓".repeat(500));
    const out = await roundTrip("test-pass-2026", "test-pass-2026", plain);
    expect(Buffer.from(out).equals(plain)).toBe(true);
  });

  it("deriva la misma llave en Node y en el navegador", async () => {
    const fromNode = node.deriveKey("test-pass-2026", salt, ITER).toString("base64");
    expect(await deriveKeyB64("test-pass-2026", saltB64, ITER)).toBe(fromNode);
  });

  it("ignora mayúsculas y espacios en los bordes (autocapitalizar del celular)", async () => {
    const plain = Buffer.from("hola");
    const out = await roundTrip("test-pass-2026", "  Test-Pass-2026 ", plain);
    expect(Buffer.from(out).toString()).toBe("hola");
  });

  it("una contraseña equivocada no descifra", async () => {
    await expect(roundTrip("test-pass-2026", "test-pass-2027", Buffer.from("secreto"))).rejects.toBeInstanceOf(WrongKeyError);
  });

  it("un archivo alterado o truncado no descifra", async () => {
    const key = await importKey(await deriveKeyB64("test-pass-2026", saltB64, ITER));
    const enc = node.encrypt(node.deriveKey("test-pass-2026", salt, ITER), Buffer.from("contenido"));
    enc[enc.length - 1] ^= 0xff;
    await expect(decryptBytes(key, enc.buffer.slice(enc.byteOffset, enc.byteOffset + enc.byteLength))).rejects.toBeInstanceOf(WrongKeyError);
    await expect(decryptBytes(key, new ArrayBuffer(10))).rejects.toBeInstanceOf(WrongKeyError);
  });
});
