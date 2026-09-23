#!/usr/bin/env node
// Arma el ZIP que se entrega al comprador del ebook TOEFL:
// guía + Bonos 2, 3 y 4 + un LEEME con el link y la contraseña del Bono 1.
//
//   TOEFL_LAB_PASSWORD='la-contraseña' node scripts/toefl-audiolab/build-zip.mjs
//
// Sale en <libro>/Entrega/TOEFL-B2-Guia-Completa-Bonos.zip. Hay que subirlo a
// Supabase Storage → bucket ebook-deliverables → toefl-b2/ (mismo nombre: el
// catálogo de supabase/functions/_shared/ebook-catalog.ts lo busca ahí).
//
// La contraseña debe ser la misma con la que se corrió build.mjs y la del secret
// TOEFL_LAB_PASSWORD de Supabase. Si cambia, hay que volver a generar y subir este ZIP.

import { execFileSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";

const SRC = process.env.TOEFL_LAB_SRC ?? path.join(homedir(), "Ebooks", "Ebook Ingles Internacional");
const OUT_DIR = path.join(SRC, "Entrega");
const ZIP_NAME = "TOEFL-B2-Guia-Completa-Bonos.zip";
const ROOT = "TOEFL-B2-Guia-Completa-Bonos";
const PLATFORM_URL = "https://acrosoftlabs.com/toefl-plataforma";

const password = process.env.TOEFL_LAB_PASSWORD?.trim();
if (!password || password.length < 8) {
  console.error("Falta TOEFL_LAB_PASSWORD (mínimo 8 caracteres).\n  TOEFL_LAB_PASSWORD='...' node scripts/toefl-audiolab/build-zip.mjs");
  process.exit(1);
}

const FILES = [
  ["Ebook final/Guia-TOEFL-B2-Internacional-2026.pdf", "Guia-TOEFL-B2-Internacional-2026.pdf"],
  ["Bonos/Bono-2-Plan-de-Emergencia-7-Dias.pdf", "Bono-2-Plan-de-Emergencia-7-Dias.pdf"],
  ["Bonos/Bono-4-Como-Generar-Mas-Ingresos.pdf", "Bono-4-Como-Generar-Mas-Ingresos.pdf"],
  ["Bonos/Bono3-Audio1-Antes-de-Salir.mp3", "Bono-3-Audios-Para-Calmar-los-Nervios/Bono3-Audio1-Antes-de-Salir.mp3"],
  ["Bonos/Bono3-Audio2-Sala-de-Espera.mp3", "Bono-3-Audios-Para-Calmar-los-Nervios/Bono3-Audio2-Sala-de-Espera.mp3"],
  ["Bonos/Bono3-Audio3-Respiracion-90s.mp3", "Bono-3-Audios-Para-Calmar-los-Nervios/Bono3-Audio3-Respiracion-90s.mp3"],
  ["Bonos/Bono3-Audio4-Reset-Entre-Secciones.mp3", "Bono-3-Audios-Para-Calmar-los-Nervios/Bono3-Audio4-Reset-Entre-Secciones.mp3"],
];

const LEEME = `GUÍA EN ESPAÑOL PARA APROBAR EL TOEFL CON NIVEL B2
Qué hay en esta carpeta
==========================================================

  Guia-TOEFL-B2-Internacional-2026.pdf
      La guía principal. Empieza por aquí.

  BONO 1 · PLATAFORMA TOEFL AUDIO LAB (en línea, no es un archivo)
  ----------------------------------------------------------
      Link:        ${PLATFORM_URL}
      Contraseña:  ${password}

      (La contraseña no distingue mayúsculas de minúsculas.)

      47 audios con voz real, simulacro cronometrado de Listening,
      sala de Writing con cronómetro y plantillas descargables.
      Funciona en el celular y en la computadora. Tu progreso se
      guarda en el dispositivo que uses.

  Bono-2-Plan-de-Emergencia-7-Dias.pdf
  Bono-3-Audios-Para-Calmar-los-Nervios/   (4 audios en MP3)
  Bono-4-Como-Generar-Mas-Ingresos.pdf

Consejos rápidos
----------------
  - Guarda esta carpeta en el celular y en la nube.
  - Usa audífonos para los audios y para la plataforma.
  - Si algo no funciona, escribe a daniel@acrosoftlabs.com

TOEFL® es una marca registrada de ETS. Este material es independiente:
no está afiliado, patrocinado ni respaldado por ETS.
`;

const stage = await mkdtemp(path.join(tmpdir(), "toefl-zip-"));
try {
  const root = path.join(stage, ROOT);
  for (const [from, to] of FILES) {
    const src = path.join(SRC, from);
    if (!existsSync(src)) {
      console.error(`✗ Falta el archivo: ${src}`);
      process.exit(1);
    }
    const dest = path.join(root, to);
    await mkdir(path.dirname(dest), { recursive: true });
    await copyFile(src, dest);
  }
  // BOM para que el Bloc de notas de Windows respete las tildes
  await writeFile(path.join(root, "LEEME.txt"), "﻿" + LEEME, "utf8");

  await mkdir(OUT_DIR, { recursive: true });
  const zipPath = path.join(OUT_DIR, ZIP_NAME);
  await rm(zipPath, { force: true });
  execFileSync("zip", ["-rqX", zipPath, ROOT, "-x", "*.DS_Store"], { cwd: stage });

  console.log(`✓ ${zipPath}`);
  console.log(execFileSync("unzip", ["-l", zipPath]).toString().trim().split("\n").slice(-1)[0]);
} finally {
  await rm(stage, { recursive: true, force: true });
}
