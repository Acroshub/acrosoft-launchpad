#!/usr/bin/env node
// Construye el paquete cifrado del Bono 1 (TOEFL Audio Lab) en public/toefl-audiolab/.
//
//   TOEFL_LAB_PASSWORD='la-contraseña' node scripts/toefl-audiolab/build.mjs
//
// Qué hace:
//   1. Convierte los 47 WAV del libro a MP3 mono liviano (ffmpeg).
//   2. Extrae los guiones (Anexo A + Ejercicio 8.1) y los prompts de Writing
//      (7.3 / 7.4, con sus modelos) directo del .md del libro — no se reescribe nada.
//   3. Le suma las plantillas descargables (templates.mjs).
//   4. Cifra audios + contenido con la contraseña (AES-256-GCM, ver lab-crypto.mjs).
//
// Para cambiar la contraseña: volver a correr este script con la nueva y desplegar.
// Las sesiones guardadas en los navegadores dejan de servir solas y piden la nueva.
//
// Variables opcionales:
//   TOEFL_LAB_SRC   carpeta del libro (default: ~/Ebooks/Ebook Ingles Internacional)
//   Requiere ffmpeg y ffprobe en el PATH.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { KDF_ITERATIONS, decrypt, deriveKey, encrypt, randomSalt } from "./lab-crypto.mjs";
import { templates } from "./templates.mjs";

const SRC = process.env.TOEFL_LAB_SRC ?? path.join(homedir(), "Ebooks", "Ebook Ingles Internacional");
const BOOK_MD = path.join(SRC, "Ebook Ingles Internacional Contenido.md");
const AUDIO_DIR = path.join(SRC, "Bonos", "Audios para Webapp");
const OUT = fileURLToPath(new URL("../../public/toefl-audiolab/", import.meta.url));

const password = process.env.TOEFL_LAB_PASSWORD;
if (!password || password.trim().length < 8) {
  console.error("Falta TOEFL_LAB_PASSWORD (mínimo 8 caracteres).\n  TOEFL_LAB_PASSWORD='...' node scripts/toefl-audiolab/build.mjs");
  process.exit(1);
}

// ─── Estructura de las 6 secciones ───────────────────────────────────────────
// `questions` = cuántas preguntas trae ese audio en el libro (cap. 3 y 6). Con
// eso se calcula el tiempo de respuesta del simulacro: la tarea 1 es una sola
// pregunta corta; el resto, unos 15 s por pregunta. Son tiempos aproximados
// (el libro avisa que ETS puede ajustarlos), no los oficiales.
const ANSWER_SECONDS_SINGLE = 10;
const ANSWER_SECONDS_PER_QUESTION = 15;

const range = (n, prefix) => Array.from({ length: n }, (_, i) => `${prefix}-${i + 1}`);

const SECTIONS = [
  {
    id: "diagnostico",
    title: "Diagnóstico",
    subtitle: "Cap. 3 · Parte C",
    description: "Los 6 audios del diagnóstico de Listening: 5 frases sueltas y 1 conversación. Una sola escucha.",
    dir: "A1-Diagnostico",
    ids: range(6, "LD"),
    fileOf: (id) => (id === "LD-6" ? "LD-6-Conversacion" : id),
    make: (id, n) =>
      id === "LD-6"
        ? { title: "Conversación", group: "Listen to a Conversation", questions: 2, ref: `Cap. 3 · Parte C2 · ${id}` }
        : { title: `Ítem ${n}`, group: "Listen and Choose a Response", questions: 1, ref: `Cap. 3 · Parte C1 · ${id}` },
  },
  {
    id: "listening",
    title: "Listening",
    subtitle: "Cap. 6.3 · Ejercicio 6.1",
    description: "Listen and Choose a Response: oyes una frase corta y eliges la respuesta más natural. Mide si entiendes la intención.",
    dir: "A2-Listen-Choose-Response",
    ids: range(12, "L1"),
    make: (id, n) => ({ title: `Ítem ${n}`, questions: 1, ref: `Ejercicio 6.1 · ${id}` }),
  },
  {
    id: "conversaciones",
    title: "Conversaciones",
    subtitle: "Cap. 6.3 · Ejercicio 6.2",
    description: "Listen to a Conversation: una conversación breve de vida universitaria. Apunta quién habla, el problema y la decisión.",
    dir: "A3-Conversaciones",
    ids: range(3, "L2"),
    questions: { "L2-1": 3, "L2-2": 2, "L2-3": 3 },
    make: (id, n, cfg) => ({ title: `Conversación ${n}`, questions: cfg.questions[id], ref: `Ejercicio 6.2 · ${id}` }),
  },
  {
    id: "anuncios",
    title: "Anuncios",
    subtitle: "Cap. 6.3 · Ejercicio 6.3",
    description: "Listen to an Announcement: un anuncio del campus. Anota fechas, números y verbos de acción.",
    dir: "A4-Anuncios",
    ids: range(3, "L3"),
    make: (id, n) => ({ title: `Anuncio ${n}`, questions: 2, ref: `Ejercicio 6.3 · ${id}` }),
  },
  {
    id: "charlas",
    title: "Charlas Académicas",
    subtitle: "Cap. 6.3 · Ejercicio 6.4",
    description: "Listen to an Academic Talk: una charla breve de un profesor. La tarea más exigente: tema, estructura, ejemplos y contraste.",
    dir: "A5-Charlas-Academicas",
    ids: range(2, "L4"),
    make: (id, n, _cfg, label) => ({ title: `Charla ${n}${label ? ` · ${label}` : ""}`, questions: 4, ref: `Ejercicio 6.4 · ${id}` }),
  },
];

const SPEAKING = {
  id: "speaking",
  title: "Speaking",
  subtitle: "Cap. 8.3 · Ejercicio 8.1",
  description: "Listen and Repeat: 3 sets de 7 frases, cada vez más largas. Escucha, repite exactamente y compara tu voz con el modelo.",
  dir: "8.1-Speaking-Listen-Repeat",
};

const SIMULACRO_PRESETS = [
  { id: "completo", title: "Listening completo", description: "Las 4 tareas en el orden del examen: frases, conversaciones, anuncios y charlas.", sections: ["listening", "conversaciones", "anuncios", "charlas"] },
  { id: "frases", title: "Solo frases cortas", description: "Listen and Choose a Response: los 12 ítems del ejercicio 6.1, uno tras otro.", sections: ["listening"] },
  { id: "diagnostico", title: "Diagnóstico", description: "Los 6 audios del diagnóstico del capítulo 3.", sections: ["diagnostico"] },
];

// ─── Utilidades ──────────────────────────────────────────────────────────────
const wordCount = (s) => s.split(/\s+/).filter(Boolean).length;
const stripBold = (s) => s.replace(/\*\*/g, "");
const unquote = (s) => s.replace(/^"+|"+$/g, "").trim();
const sha = (buf) => createHash("sha256").update(buf).digest("hex");

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

/** Líneas entre la primera que cumple `startRe` (excluida) y la siguiente que cumple `endRe` (excluida). */
function slice(lines, startRe, endRe) {
  const start = lines.findIndex((l) => startRe.test(l));
  if (start === -1) fail(`No encuentro en el libro: ${startRe}`);
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (endRe.test(lines[i])) { end = i; break; }
  }
  return lines.slice(start + 1, end);
}

// ─── Guiones de Listening (Anexo A) ──────────────────────────────────────────
function parseScripts(lines) {
  const block = slice(lines, /^# Anexo A /, /^# Anexo B /);
  const found = new Map();
  let cur = null;
  for (const raw of block) {
    const line = raw.trim();
    const head = line.match(/^\*\*((?:LD|L[1-4])-\d+)(?:\s*·\s*([^*]+?))?\*\*\s*(.*)$/);
    if (head) {
      cur = { id: head[1], label: head[2]?.trim() ?? null, lines: [] };
      found.set(cur.id, cur);
      if (head[3]) cur.lines.push(head[3]);
      continue;
    }
    if (!cur) continue;
    if (line === "---" || /^#{1,6}\s/.test(line)) { cur = null; continue; }
    if (line === "" || line.startsWith(">")) continue;
    cur.lines.push(line);
  }
  return found;
}

/** Monólogo (entre comillas) o diálogo ("Student: …") → lista de turnos. */
function toTranscript(scriptLines) {
  return scriptLines.map((line) => {
    if (line.startsWith('"')) return { text: unquote(line) };
    const turn = line.match(/^([A-Z][A-Za-z]+):\s+(.*)$/);
    return turn ? { speaker: turn[1], text: turn[2].trim() } : { text: unquote(line) };
  });
}

// ─── Frases de Speaking (Ejercicio 8.1) ──────────────────────────────────────
function parseSpeakingSets(lines) {
  const block = slice(lines, /^### Ejercicio 8\.1 /, /^### Cómo evaluarte/);
  const sets = {};
  let cur = null;
  for (const raw of block) {
    const line = raw.trim();
    const head = line.match(/^\*\*Set ([ABC])\*\*$/);
    if (head) { cur = head[1]; sets[cur] = []; continue; }
    const phrase = line.match(/^(\d+)\.\s+(.*)$/);
    if (cur && phrase) sets[cur].push(phrase[2].trim());
  }
  return sets;
}

// ─── Prompts de Writing (7.3 y 7.4) ──────────────────────────────────────────
const unquoteBlock = (l) => l.replace(/^>\s?/, "");

/** Agrupa las citas (`> …`) bajo cada título en negrita `**Correo 1**`. */
function quotesByTitle(lines, titleRe) {
  const out = [];
  let cur = null;
  for (const raw of lines) {
    const line = raw.trim();
    const title = line.match(titleRe);
    if (title) { cur = { title: title[0].replace(/\*\*/g, ""), quote: [] }; out.push(cur); continue; }
    if (cur && line.startsWith(">")) cur.quote.push(unquoteBlock(line));
  }
  return out;
}

const quoteToText = (quote) => stripBold(quote.join("\n")).replace(/\n{3,}/g, "\n\n").trim();

function parseEmailPrompts(lines) {
  const sec = slice(lines, /^## 7\.3 /, /^## 7\.4 /);
  const exercises = quotesByTitle(slice(sec, /^### Ejercicio 7\.2/, /^### Respuestas modelo/), /^\*\*Correo \d+\*\*$/);
  const models = quotesByTitle(slice(sec, /^### Respuestas modelo/, /^### Por qué funcionan/), /^\*\*Modelo \d+\*\*$/);
  if (exercises.length !== 3 || models.length !== 3) fail(`Esperaba 3 correos y 3 modelos, hay ${exercises.length}/${models.length}`);

  return exercises.map((ex, i) => {
    const text = quoteToText(ex.quote);
    const [scenario, rest] = text.split(/\s*In your email,\s*/);
    if (!rest) fail(`No pude separar las 3 tareas del ${ex.title}`);
    const tasks = rest
      .split(/\(\d\)\s*/)
      .map((t) => t.trim().replace(/[,.]?\s*(and\s*)?$/, "").replace(/,\s*and$/, ""))
      .filter(Boolean)
      .map((t) => t.charAt(0).toUpperCase() + t.slice(1));
    if (tasks.length !== 3) fail(`El ${ex.title} debería tener 3 tareas y tiene ${tasks.length}`);
    return { id: `email-${i + 1}`, title: ex.title, scenario: scenario.trim(), tasks, model: quoteToText(models[i].quote) };
  });
}

function parseDiscussionPrompts(lines) {
  const sec = slice(lines, /^## 7\.4 /, /^## 7\.5 /);
  const exercises = quotesByTitle(slice(sec, /^### Ejercicio 7\.3/, /^### Respuestas modelo/), /^\*\*Discusión \d+\*\*$/);
  const models = quotesByTitle(slice(sec, /^### Respuestas modelo/, /^### Por qué funcionan/), /^\*\*Modelo \d+\*\*$/);
  if (exercises.length !== 3 || models.length !== 3) fail(`Esperaba 3 discusiones y 3 modelos, hay ${exercises.length}/${models.length}`);

  return exercises.map((ex, i) => {
    const posts = ex.quote
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const m = l.match(/^\*\*(.+?):\*\*\s*(.*)$/);
        return m ? { author: m[1], text: m[2].trim() } : null;
      })
      .filter(Boolean);
    if (posts.length !== 3) fail(`La ${ex.title} debería tener 3 mensajes y tiene ${posts.length}`);
    return { id: `discussion-${i + 1}`, title: ex.title, posts, model: quoteToText(models[i].quote) };
  });
}

function parseReviewChecklist(lines) {
  return slice(lines, /^## 7\.5 /, /^## 7\.6 /)
    .map((l) => l.match(/^- \[ \]\s+(.*)$/))
    .filter(Boolean)
    .map((m) => m[1].replace(/\*/g, "").trim());
}

// ─── ffmpeg ──────────────────────────────────────────────────────────────────
function toMp3(wavPath, mp3Path) {
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", wavPath, "-ac", "1", "-ar", "24000", "-c:a", "libmp3lame", "-b:a", "64k", mp3Path]);
}

function durationOf(file) {
  const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file]);
  return Math.round(parseFloat(out.toString()) * 10) / 10;
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  if (!existsSync(BOOK_MD)) fail(`No encuentro el libro: ${BOOK_MD}`);
  if (!existsSync(AUDIO_DIR)) fail(`No encuentro los audios: ${AUDIO_DIR}`);

  const lines = (await readFile(BOOK_MD, "utf8")).split(/\r?\n/);
  const scripts = parseScripts(lines);
  const speakingSets = parseSpeakingSets(lines);

  // Lista plana de todo lo que hay que convertir y cifrar
  const sections = [];
  const jobs = [];
  const warnings = [];

  for (const cfg of SECTIONS) {
    const items = cfg.ids.map((id, i) => {
      const script = scripts.get(id);
      if (!script) fail(`El Anexo A no trae el guion ${id}`);
      const meta = cfg.make(id, i + 1, cfg, script.label);
      const item = {
        id,
        title: meta.title,
        label: `${cfg.title} · ${meta.title}`,
        ...(meta.group ? { group: meta.group } : {}),
        ref: meta.ref,
        questions: meta.questions,
        answerSeconds: meta.questions === 1 ? ANSWER_SECONDS_SINGLE : meta.questions * ANSWER_SECONDS_PER_QUESTION,
        duration: 0,
        transcript: toTranscript(script.lines),
      };
      jobs.push({ item, wav: path.join(AUDIO_DIR, cfg.dir, `${cfg.fileOf?.(id) ?? id}.wav`) });
      return item;
    });
    sections.push({ id: cfg.id, title: cfg.title, subtitle: cfg.subtitle, description: cfg.description, items });
  }

  const speakingItems = [];
  for (const set of ["A", "B", "C"]) {
    const phrases = speakingSets[set];
    if (!phrases || phrases.length !== 7) fail(`El Set ${set} debería tener 7 frases y tiene ${phrases?.length ?? 0}`);
    phrases.forEach((text, i) => {
      const id = `Set${set}-${i + 1}`;
      const item = {
        id,
        title: `Frase ${i + 1}`,
        label: `Speaking · Set ${set} · Frase ${i + 1}`,
        group: `Set ${set}`,
        ref: `Ejercicio 8.1 · Set ${set} · frase ${i + 1}`,
        duration: 0,
        transcript: [{ text }],
      };
      jobs.push({ item, wav: path.join(AUDIO_DIR, SPEAKING.dir, `${id}.wav`) });
      speakingItems.push(item);
    });
  }
  sections.push({ id: SPEAKING.id, title: SPEAKING.title, subtitle: SPEAKING.subtitle, description: SPEAKING.description, items: speakingItems });

  if (jobs.length !== 47) fail(`Esperaba 47 audios y armé ${jobs.length}`);

  // Salt estable entre builds: si solo cambia el contenido, las sesiones ya
  // guardadas en los navegadores siguen sirviendo. Cambiar la contraseña las invalida.
  let salt;
  const metaPath = path.join(OUT, "meta.json");
  if (existsSync(metaPath)) {
    try { salt = Buffer.from(JSON.parse(await readFile(metaPath, "utf8")).salt, "base64"); } catch { /* se regenera */ }
  }
  if (!salt || salt.length !== 16) salt = randomSalt();
  const key = deriveKey(password, salt);

  const tmp = await mkdtemp(path.join(tmpdir(), "toefl-audiolab-"));
  await rm(path.join(OUT, "a"), { recursive: true, force: true });
  await mkdir(path.join(OUT, "a"), { recursive: true });

  const digests = [];
  let mp3Bytes = 0;
  try {
    for (const { item, wav } of jobs) {
      if (!existsSync(wav)) fail(`Falta el audio de ${item.id}: ${wav}`);
      const mp3 = path.join(tmp, `${item.id}.mp3`);
      toMp3(wav, mp3);
      item.duration = durationOf(mp3);

      // Sanidad: velocidad de habla razonable → el audio corresponde al guion
      const words = wordCount(item.transcript.map((t) => t.text).join(" "));
      const wps = words / item.duration;
      if (wps < 1.3 || wps > 4.5) warnings.push(`${item.id}: ${words} palabras en ${item.duration}s (${wps.toFixed(1)}/s) — ¿el audio corresponde al guion?`);

      const bytes = await readFile(mp3);
      mp3Bytes += bytes.length;
      const enc = encrypt(key, bytes);
      await writeFile(path.join(OUT, "a", `${item.id}.bin`), enc);
      digests.push(sha(enc));

      // Verificación de ida y vuelta
      if (!decrypt(key, enc).equals(bytes)) fail(`El cifrado de ${item.id} no descifra igual`);
    }
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }

  const byId = Object.fromEntries(sections.flatMap((s) => s.items.map((i) => [i.id, i])));
  const simulacros = SIMULACRO_PRESETS.map((p) => {
    const items = p.sections.flatMap((sid) => sections.find((s) => s.id === sid).items.map((i) => i.id));
    return { id: p.id, title: p.title, description: p.description, items };
  });
  for (const s of simulacros) for (const id of s.items) if (!byId[id]) fail(`Simulacro ${s.id}: no existe ${id}`);

  const content = {
    sections,
    simulacros,
    writing: {
      email: {
        id: "email",
        title: "Write an Email",
        minutes: 7,
        minWords: 80,
        maxWords: 120,
        method: ["Saludo", "Propósito en la primera frase", "Detalles", "Petición o propuesta", "Cierre y firma"],
        prompts: parseEmailPrompts(lines),
      },
      discussion: {
        id: "discussion",
        title: "Write for an Academic Discussion",
        minutes: 10,
        minWords: 100,
        maxWords: 130,
        method: ["Posición", "Razón", "Ejemplo", "Diálogo con un compañero", "Cierre"],
        prompts: parseDiscussionPrompts(lines),
      },
      review: parseReviewChecklist(lines),
    },
    templates,
  };
  if (content.writing.review.length < 6) fail("No pude extraer el checklist de 7.5");

  const contentEnc = encrypt(key, Buffer.from(JSON.stringify(content), "utf8"));
  await writeFile(path.join(OUT, "content.bin"), contentEnc);
  digests.push(sha(contentEnc));

  const version = sha(Buffer.from(digests.join(""))).slice(0, 10);
  await writeFile(metaPath, JSON.stringify({ v: version, kdf: "PBKDF2-SHA256", iter: KDF_ITERATIONS, salt: salt.toString("base64") }) + "\n");

  // Verificación final: lo que quedó en disco descifra con la contraseña
  const check = JSON.parse(decrypt(deriveKey(password, salt), await readFile(path.join(OUT, "content.bin"))).toString("utf8"));
  const files = (await readdir(path.join(OUT, "a"))).length;

  console.log(`✓ ${jobs.length} audios (${(mp3Bytes / 1024 / 1024).toFixed(1)} MB en MP3) → ${files} archivos cifrados`);
  console.log(`✓ ${check.sections.length} secciones · ${check.templates.length} plantillas · ${check.writing.email.prompts.length + check.writing.discussion.prompts.length} prompts de Writing`);
  console.log(`✓ versión ${version} → ${path.relative(process.cwd(), OUT)}`);
  if (warnings.length) {
    console.warn("\n⚠ Revisar:");
    for (const w of warnings) console.warn(`  - ${w}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
