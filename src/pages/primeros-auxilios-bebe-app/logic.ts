// Lógica pura de la webapp (sin React ni DOM) para poder probarla.
import type { EmergencyCard } from "./cards";
import type { QuizQuestion } from "./quiz";
import type { CheckItem } from "./checklist";
import type { Stage } from "./types";

export const STAGES: { id: Stage; label: string; hint: string }[] = [
  { id: "0-3", label: "0 a 3 meses", hint: "Recién nacido" },
  { id: "3-6", label: "3 a 6 meses", hint: "Empieza a rodar y agarrar" },
  { id: "6-12", label: "6 a 12 meses", hint: "Gatea y explora todo" },
];

export function isStage(v: unknown): v is Stage {
  return v === "0-3" || v === "3-6" || v === "6-12";
}

export function stageFromMonths(months: number): Stage {
  if (!(months >= 3)) return "0-3";
  return months < 6 ? "3-6" : "6-12";
}

/** Meses completos entre la fecha de nacimiento (YYYY-MM-DD) y `now`. null si no es válida o es futura. */
export function monthsBetween(birthISO: string, now: Date = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthISO);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const birth = new Date(y, mo - 1, d);
  if (birth.getFullYear() !== y || birth.getMonth() !== mo - 1 || birth.getDate() !== d) return null;
  if (birth.getTime() > now.getTime()) return null;
  let months = (now.getFullYear() - y) * 12 + (now.getMonth() - (mo - 1));
  if (now.getDate() < d) months -= 1;
  return Math.max(0, months);
}

export function splitCardsByStage(cards: EmergencyCard[], stage: Stage): { primary: EmergencyCard[]; others: EmergencyCard[] } {
  const rank = (c: EmergencyCard) => {
    const i = c.stages.indexOf(stage);
    return i === -1 ? Infinity : i;
  };
  const relevant = cards.filter((c) => c.stages.includes(stage));
  const sorted = [...relevant].sort((a, b) => rank(a) - rank(b));
  return { primary: sorted, others: cards.filter((c) => !c.stages.includes(stage)) };
}

/** ISO week id "2026-W42" (jueves de la semana define el año). */
export function weekId(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Las mismas 5 preguntas durante toda la semana (para esa etapa), en el mismo orden. */
export function pickQuiz(questions: QuizQuestion[], stage: Stage, week: string, n = 5): QuizQuestion[] {
  const pool = questions.filter((q) => q.stages.includes(stage));
  const rnd = mulberry32(hashString(`${week}|${stage}`));
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, Math.min(n, arr.length));
}

export function scoreQuiz(questions: QuizQuestion[], answers: Record<string, number>): number {
  return questions.reduce((acc, q) => acc + (answers[q.id] === q.answer ? 1 : 0), 0);
}

export function checklistProgress(items: CheckItem[], done: Record<string, boolean>): { done: number; total: number } {
  return { done: items.filter((i) => done[i.id]).length, total: items.length };
}

export function sanitizeBoolMap(raw: unknown): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const [k, v] of Object.entries(raw)) if (v === true) out[k] = true;
  }
  return out;
}

export function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
