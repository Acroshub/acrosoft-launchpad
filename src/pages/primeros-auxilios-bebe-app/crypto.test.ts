// @vitest-environment node
// (jsdom no trae crypto.subtle; acá probamos el cifrado real, sin DOM.)
import { describe, expect, it } from "vitest";
import * as node from "../../../scripts/primeros-auxilios-bebe-app/lab-crypto.mjs";
import { demoPdf, assignPdfs, LIBRARY } from "../../../scripts/primeros-auxilios-bebe-app/build.mjs";
import { WrongKeyError, decryptBytes, deriveKeyB64, importKey } from "./crypto";

const ITER = 1000;
const salt = Buffer.from("0123456789abcdef");
const saltB64 = salt.toString("base64");

async function roundTrip(buildPassword: string, browserPassword: string, plaintext: Buffer) {
  const enc = node.encrypt(node.deriveKey(buildPassword, salt, ITER), plaintext);
  const key = await importKey(await deriveKeyB64(browserPassword, saltB64, ITER));
  return decryptBytes(key, enc.buffer.slice(enc.byteOffset, enc.byteOffset + enc.byteLength));
}

describe("cifrado de Primeros Auxilios del Bebé (build ↔ navegador)", () => {
  it("el navegador descifra un PDF cifrado por el build", async () => {
    const pdf = demoPdf("Ebook de prueba");
    const out = await roundTrip("Clave-de-prueba-26", "clave-de-prueba-26", pdf);
    expect(Buffer.from(out).equals(pdf)).toBe(true);
    expect(Buffer.from(out).subarray(0, 5).toString()).toBe("%PDF-");
  });
  it("deriva la misma llave en Node y en el navegador", async () => {
    expect(await deriveKeyB64("clave-de-prueba-26", saltB64, ITER)).toBe(node.deriveKey("clave-de-prueba-26", salt, ITER).toString("base64"));
  });
  it("una contraseña equivocada no descifra", async () => {
    await expect(roundTrip("clave-a-12345", "clave-b-12345", Buffer.from("x"))).rejects.toBeInstanceOf(WrongKeyError);
  });
  it("un archivo alterado o truncado no descifra", async () => {
    const key = await importKey(await deriveKeyB64("clave-a-12345", saltB64, ITER));
    const enc = node.encrypt(node.deriveKey("clave-a-12345", salt, ITER), Buffer.from("contenido"));
    enc[enc.length - 1] ^= 0xff;
    await expect(decryptBytes(key, enc.buffer.slice(enc.byteOffset, enc.byteOffset + enc.byteLength))).rejects.toBeInstanceOf(WrongKeyError);
    await expect(decryptBytes(key, new ArrayBuffer(10))).rejects.toBeInstanceOf(WrongKeyError);
  });
});

describe("build: asignación de PDFs", () => {
  it("asigna ebook y bonos por nombre, sin repetir y tolerando faltantes", () => {
    const m = assignPdfs(["/x/Ebook-Primeros-Auxilios.pdf", "/x/Bono-1-Casa-Segura-Habitacion.pdf", "/x/Bono 3 Niñera y Abuelos.pdf"]);
    expect(m.get("ebook")).toBe("/x/Ebook-Primeros-Auxilios.pdf");
    expect(m.get("bono1")).toBe("/x/Bono-1-Casa-Segura-Habitacion.pdf");
    expect(m.get("bono3")).toBe("/x/Bono 3 Niñera y Abuelos.pdf");
    expect(m.has("bono2")).toBe(false);
    expect(new Set(m.values()).size).toBe(m.size);
  });
  it("sin PDFs no asigna nada", () => {
    expect(assignPdfs([], LIBRARY).size).toBe(0);
  });
});
