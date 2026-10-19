#!/usr/bin/env node
// Construye el paquete cifrado de la webapp «Primeros Auxilios del Bebé» en public/primeros-auxilios-bebe-pack/.
//
//   PRIMEROS_AUXILIOS_BEBE_APP_PASSWORD='la-contraseña' node scripts/primeros-auxilios-bebe-app/build.mjs
//   (añade --demo para generar PDFs de PRUEBA donde falte el real; solo para verificar el flujo)
//
// Qué hace:
//   1. Busca los PDFs en Entregables/ (ebook + 3 bonos) por nombre de archivo. Los que no encuentra se
//      omiten con aviso y la app los muestra como «Próximamente».
//   2. Cifra cada PDF (lib/<id>.bin) y la lista de la Biblioteca (content.bin) con AES-256-GCM.
//   3. Escribe meta.json (salt + versión, único archivo en claro).
//
// Variables:
//   PRIMEROS_AUXILIOS_BEBE_APP_PASSWORD  contraseña (obligatoria; nunca va en el repo)
//   PAB_SRC   carpeta Entregables (default: ~/CRASHING/Primeros Auxilios del Bebe/Entregables)
//
// Cambiar la contraseña cierra las sesiones guardadas en los navegadores (piden la nueva).

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { KDF_ITERATIONS, deriveKey, encrypt, randomSalt } from "./lab-crypto.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT, "public", "primeros-auxilios-bebe-pack");
const SRC = process.env.PAB_SRC || path.join(os.homedir(), "CRASHING", "Primeros Auxilios del Bebe", "Entregables");
const DEMO = process.argv.includes("--demo");

/** `match` se prueba contra el nombre de archivo sin acentos, en minúsculas. Primero los bonos, luego el ebook. */
export const LIBRARY = [
  { id: "ebook", kind: "ebook", title: "Ebook · Primeros Auxilios del Bebé (0 a 12 Meses)", description: "Tarjetas de emergencia, carpeta de emergencia, casa segura y repaso semanal.", filename: "Primeros-Auxilios-del-Bebe.pdf", match: /ebook|principal|primeros[-_ ]auxilios/ },
  { id: "bono1", kind: "bono", title: "Bono 1 · Casa Segura Habitación por Habitación", description: "Checklist de riesgos para cuando el bebé empieza a moverse.", filename: "Bono-1-Casa-Segura.pdf", match: /bono[-_ ]?1|casa[-_ ]?segura/ },
  { id: "bono2", kind: "bono", title: "Bono 2 · Fiebre y Malestares: Cuándo Llamar al Pediatra", description: "Señales de alarma, qué preguntar y qué anotar antes de llamar.", filename: "Bono-2-Fiebre.pdf", match: /bono[-_ ]?2|fiebre|malestares/ },
  { id: "bono3", kind: "bono", title: "Bono 3 · Hoja de Instrucciones para Niñeras y Abuelos", description: "Hoja imprimible y guion para dejar al bebé con otros.", filename: "Bono-3-Ninera-Abuelos.pdf", match: /bono[-_ ]?3|ninera|abuelos|hoja/ },
];

const fold = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

async function findPdfs(dir) {
  const found = [];
  if (!existsSync(dir)) return found;
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (/^(mockups?|_contenido)$/i.test(e.name)) continue;
      found.push(...(await findPdfs(p)));
    } else if (/\.pdf$/i.test(e.name)) found.push(p);
  }
  return found;
}

/** Asigna cada PDF a lo más una entrada; los bonos tienen prioridad sobre el ebook. */
export function assignPdfs(files, library = LIBRARY) {
  const out = new Map();
  const order = [...library.filter((l) => l.kind === "bono"), ...library.filter((l) => l.kind === "ebook")];
  const used = new Set();
  for (const item of order) {
    const hit = files.find((f) => !used.has(f) && item.match.test(fold(path.basename(f))));
    if (hit) {
      out.set(item.id, hit);
      used.add(hit);
    }
  }
  return out;
}

/** PDF mínimo válido de una página, para probar el flujo. */
export function demoPdf(title) {
  const safe = title.replace(/[^\x20-\x7e]/g, "?").replace(/[()\\]/g, "");
  const stream = `BT /F1 20 Tf 60 740 Td (PDF DE PRUEBA - NO ES EL CONTENIDO REAL) Tj 0 -40 Td (${safe}) Tj ET`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

async function main() {
  const password = process.env.PRIMEROS_AUXILIOS_BEBE_APP_PASSWORD;
  if (!password || password.trim().length < 10) {
    console.error("Falta PRIMEROS_AUXILIOS_BEBE_APP_PASSWORD (mínimo 10 caracteres).");
    process.exit(1);
  }

  const files = await findPdfs(SRC);
  const assigned = assignPdfs(files);
  console.log(`Buscando PDFs en ${SRC}: ${files.length} encontrado(s).`);

  let salt;
  const metaPath = path.join(OUT, "meta.json");
  if (existsSync(metaPath)) {
    try { salt = Buffer.from(JSON.parse(await readFile(metaPath, "utf8")).salt, "base64"); } catch { /* se regenera */ }
  }
  if (!salt || salt.length !== 16) salt = randomSalt();
  const key = deriveKey(password, salt);

  await rm(path.join(OUT, "lib"), { recursive: true, force: true });
  await mkdir(path.join(OUT, "lib"), { recursive: true });

  const hash = createHash("sha256");
  const library = [];
  for (const item of LIBRARY) {
    let data = null;
    let demo = false;
    if (assigned.has(item.id)) {
      data = await readFile(assigned.get(item.id));
      if (data.subarray(0, 5).toString("latin1") !== "%PDF-") {
        console.warn(`AVISO: ${assigned.get(item.id)} no parece un PDF; se omite ${item.id}.`);
        data = null;
      }
    }
    if (!data && DEMO) {
      data = demoPdf(item.title);
      demo = true;
    }
    if (!data) {
      console.warn(`AVISO: falta el PDF de «${item.title}» (id ${item.id}). Se omite; la app lo mostrará como «Próximamente».`);
      library.push({ id: item.id, kind: item.kind, title: item.title, description: item.description, filename: item.filename, available: false });
      continue;
    }
    await writeFile(path.join(OUT, "lib", `${item.id}.bin`), encrypt(key, data));
    hash.update(item.id).update(data);
    console.log(`  cifrado ${item.id}: ${(data.length / 1024).toFixed(0)} KB${demo ? " (PDF DE PRUEBA)" : ` ← ${path.relative(SRC, assigned.get(item.id))}`}`);
    library.push({ id: item.id, kind: item.kind, title: item.title, description: item.description, filename: item.filename, available: true, bytes: data.length, ...(demo ? { demo: true } : {}) });
  }

  const content = { library };
  const json = Buffer.from(JSON.stringify(content));
  hash.update(json);
  await writeFile(path.join(OUT, "content.bin"), encrypt(key, json));
  const v = hash.digest("hex").slice(0, 10);
  await writeFile(metaPath, JSON.stringify({ v, kdf: "PBKDF2-SHA256", iter: KDF_ITERATIONS, salt: salt.toString("base64") }) + "\n");

  const missing = library.filter((l) => !l.available).length;
  const demos = library.filter((l) => l.demo).length;
  console.log(`Listo: public/primeros-auxilios-bebe-pack/ (v ${v}). ${library.length - missing} PDF, ${missing} pendiente(s)${demos ? `, ${demos} de PRUEBA` : ""}.`);
  if (demos) console.warn("ATENCIÓN: hay PDFs de prueba. NO desplegar así: vuelve a correr sin --demo cuando existan los reales.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
