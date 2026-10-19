import { describe, expect, it } from "vitest";
import { CARDS } from "./cards";
import { ROOMS, itemsForStage } from "./checklist";
import { checklistProgress, monthsBetween, pickQuiz, sanitizeBoolMap, scoreQuiz, splitCardsByStage, stageFromMonths, weekId } from "./logic";
import { QUESTIONS } from "./quiz";
import { readJSON, writeRaw } from "./storage";

describe("etapa del bebé", () => {
  it("mapea meses a etapa", () => {
    expect(stageFromMonths(0)).toBe("0-3");
    expect(stageFromMonths(2)).toBe("0-3");
    expect(stageFromMonths(3)).toBe("3-6");
    expect(stageFromMonths(5)).toBe("3-6");
    expect(stageFromMonths(6)).toBe("6-12");
    expect(stageFromMonths(30)).toBe("6-12");
    expect(stageFromMonths(NaN)).toBe("0-3");
  });
  it("calcula meses completos y rechaza fechas inválidas o futuras", () => {
    const now = new Date(2026, 9, 16);
    expect(monthsBetween("2026-07-16", now)).toBe(3);
    expect(monthsBetween("2026-07-17", now)).toBe(2);
    expect(monthsBetween("2026-10-16", now)).toBe(0);
    expect(monthsBetween("2027-01-01", now)).toBeNull();
    expect(monthsBetween("2026-02-31", now)).toBeNull();
    expect(monthsBetween("basura", now)).toBeNull();
    expect(monthsBetween("", now)).toBeNull();
  });
  it("el filtro deja primero las tarjetas de la etapa y no pierde ninguna", () => {
    for (const s of ["0-3", "3-6", "6-12"] as const) {
      const { primary, others } = splitCardsByStage(CARDS, s);
      expect(primary.length + others.length).toBe(CARDS.length);
      expect(primary.every((c) => c.stages.includes(s))).toBe(true);
    }
  });
});

describe("quiz semanal", () => {
  it("weekId usa semana ISO", () => {
    expect(weekId(new Date(2026, 9, 16))).toBe("2026-W42");
    expect(weekId(new Date(2026, 0, 1))).toBe("2026-W01");
    expect(weekId(new Date(2027, 0, 1))).toBe("2026-W53");
  });
  it("es determinista por semana y etapa, 5 preguntas únicas de la etapa", () => {
    const a = pickQuiz(QUESTIONS, "6-12", "2026-W42");
    const b = pickQuiz(QUESTIONS, "6-12", "2026-W42");
    expect(a.map((q) => q.id)).toEqual(b.map((q) => q.id));
    expect(a).toHaveLength(5);
    expect(new Set(a.map((q) => q.id)).size).toBe(5);
    expect(a.every((q) => q.stages.includes("6-12"))).toBe(true);
  });
  it("cambia entre semanas", () => {
    const ids = (w: string) => pickQuiz(QUESTIONS, "3-6", w).map((q) => q.id).join();
    const set = new Set(Array.from({ length: 8 }, (_, i) => ids(`2026-W${10 + i}`)));
    expect(set.size).toBeGreaterThan(1);
  });
  it("todas las etapas tienen al menos 5 preguntas y cada respuesta es válida", () => {
    for (const s of ["0-3", "3-6", "6-12"] as const) expect(pickQuiz(QUESTIONS, s, "x")).toHaveLength(5);
    for (const q of QUESTIONS) {
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(q.options.length);
    }
  });
  it("puntúa", () => {
    const qs = QUESTIONS.slice(0, 3);
    expect(scoreQuiz(qs, {})).toBe(0);
    expect(scoreQuiz(qs, Object.fromEntries(qs.map((q) => [q.id, q.answer])))).toBe(3);
  });
});

describe("checklist", () => {
  it("cuenta progreso y sanea el mapa", () => {
    const items = itemsForStage(ROOMS[0], "0-3");
    expect(items.length).toBeGreaterThan(0);
    expect(checklistProgress(items, { [items[0].id]: true, otro: true })).toEqual({ done: 1, total: items.length });
    expect(sanitizeBoolMap({ a: true, b: "si", c: false })).toEqual({ a: true });
    expect(sanitizeBoolMap([1, 2])).toEqual({});
  });
  it("cada habitación tiene algo para alguna etapa y los ids son únicos", () => {
    const ids = ROOMS.flatMap((r) => r.items.map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const r of ROOMS) expect(r.items.length).toBeGreaterThan(0);
  });
});

describe("contenido de las tarjetas", () => {
  it("tiene las 6 emergencias, con las 3 secciones, y sin dosis de medicamentos", () => {
    expect(CARDS.map((c) => c.id).sort()).toEqual(["atragantamiento", "caidas-cabeza", "fiebre", "intoxicacion", "quemaduras", "sofocacion"]);
    const dose = /\b\d+([.,]\d+)?\s?(mg|ml|mcg|gotas|cucharadas?|cucharaditas?|comprimidos?|tabletas?)\b|mg\/kg/i;
    for (const c of CARDS) {
      expect(c.see.length).toBeGreaterThan(0);
      expect(c.doNow.length).toBeGreaterThan(0);
      expect(c.callWhen.length).toBeGreaterThan(0);
      const text = JSON.stringify(c);
      expect(dose.test(text)).toBe(false);
    }
  });
  it("atragantamiento lleva la marca de revisión pendiente", () => {
    expect(CARDS.find((c) => c.id === "atragantamiento")!.pendingReview).toBe(true);
  });
});

describe("storage con localStorage bloqueado", () => {
  it("no lanza y guarda en memoria", () => {
    const orig = Object.getOwnPropertyDescriptor(window, "localStorage")!;
    Object.defineProperty(window, "localStorage", { configurable: true, get() { throw new Error("blocked"); } });
    try {
      expect(writeRaw("t", JSON.stringify([1]))).toBe(false);
      expect(readJSON("t", [])).toEqual([1]);
      expect(readJSON("nada", "fb")).toBe("fb");
    } finally {
      Object.defineProperty(window, "localStorage", orig);
    }
  });
  it("JSON corrupto devuelve el valor por defecto", () => {
    localStorage.setItem("pab_bad", "{no json");
    expect(readJSON("bad", 7)).toBe(7);
  });
});
