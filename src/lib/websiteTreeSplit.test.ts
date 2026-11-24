import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WEBSITE_TREE_SPLIT_KEY, resolveWebsiteTreeSplit } from "./websiteTreeSplit";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("resolveWebsiteTreeSplit", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("reparte 50/50: random < 0.5 → normal, si no → game", () => {
    expect(resolveWebsiteTreeSplit("", () => 0.49).variant).toBe("normal");
    localStorage.clear();
    expect(resolveWebsiteTreeSplit("", () => 0.5).variant).toBe("game");
  });

  it("la versión sale parejo en muchos visitantes nuevos", () => {
    let game = 0;
    const N = 4000;
    for (let i = 0; i < N; i++) { localStorage.clear(); if (resolveWebsiteTreeSplit("").variant === "game") game++; }
    expect(game / N).toBeGreaterThan(0.45);
    expect(game / N).toBeLessThan(0.55);
  });

  it("la guarda en el navegador: el mismo visitante siempre ve la misma versión y el mismo id", () => {
    const first = resolveWebsiteTreeSplit("", () => 0.9);
    expect(first.variant).toBe("game");
    expect(first.split?.visitorId).toMatch(UUID);
    const again = resolveWebsiteTreeSplit("", () => 0.1); // el sorteo ya no importa
    expect(again.variant).toBe("game");
    expect(again.split?.visitorId).toBe(first.split?.visitorId);
  });

  it("ignora lo guardado si está roto o es de una versión inexistente", () => {
    localStorage.setItem(WEBSITE_TREE_SPLIT_KEY, "{no es json");
    expect(resolveWebsiteTreeSplit("", () => 0.1).variant).toBe("normal");
    localStorage.setItem(WEBSITE_TREE_SPLIT_KEY, JSON.stringify({ variant: "otra", visitorId: "x" }));
    expect(resolveWebsiteTreeSplit("", () => 0.9).variant).toBe("game");
  });

  it("?v= fuerza la versión sin guardar nada y sin contar (split null)", () => {
    const r = resolveWebsiteTreeSplit("?v=game", () => 0.1);
    expect(r).toEqual({ variant: "game", split: null });
    expect(localStorage.getItem(WEBSITE_TREE_SPLIT_KEY)).toBeNull();
    expect(resolveWebsiteTreeSplit("?v=normal", () => 0.9)).toEqual({ variant: "normal", split: null });
    // un valor raro no fuerza nada: se sortea normal
    expect(resolveWebsiteTreeSplit("?v=zzz", () => 0.9).split).not.toBeNull();
  });

  it("sin localStorage igual elige versión (no rompe la página)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("bloqueado"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("bloqueado"); });
    const r = resolveWebsiteTreeSplit("", () => 0.2);
    expect(r.variant).toBe("normal");
    expect(r.split?.visitorId).toMatch(UUID);
  });
});
