import { afterEach, describe, expect, it, vi } from "vitest";
import { uuid } from "./uuid";

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => vi.unstubAllGlobals());

describe("uuid", () => {
  it("usa crypto.randomUUID cuando existe", () => {
    vi.stubGlobal("crypto", { randomUUID: () => "11111111-2222-4333-8444-555555555555" });
    expect(uuid()).toBe("11111111-2222-4333-8444-555555555555");
  });

  it("sin randomUUID (navegadores viejos) arma un v4 válido con getRandomValues", () => {
    vi.stubGlobal("crypto", { getRandomValues: (a: Uint8Array) => a.fill(0xff) });
    expect(uuid()).toMatch(V4);
    expect(uuid()).toBe("ffffffff-ffff-4fff-bfff-ffffffffffff");
  });

  it("sin nada de crypto tampoco lanza y devuelve un v4 válido y distinto cada vez", () => {
    vi.stubGlobal("crypto", undefined);
    const ids = new Set(Array.from({ length: 50 }, () => uuid()));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(id).toMatch(V4);
  });

  it("el uuid real cumple el mismo formato que espera el webhook", () => {
    expect(uuid()).toMatch(V4);
  });
});
