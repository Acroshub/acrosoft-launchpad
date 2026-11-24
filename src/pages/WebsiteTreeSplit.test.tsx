import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { WEBSITE_TREE_SPLIT_KEY } from "@/lib/websiteTreeSplit";
import type { ComponentType } from "react";

const px = vi.hoisted(() => ({ init: vi.fn(), track: vi.fn() }));
vi.mock("@/lib/metaPixel", () => ({ initMetaPixel: px.init, trackMetaEvent: px.track }));
vi.mock("@/lib/piscinasFunnel", () => ({ addNoindex: vi.fn(() => () => {}) }));
vi.setConfig({ testTimeout: 20000 });

const VISITOR = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
let Split: ComponentType;
const fetchMock = vi.fn();
const calls = () => fetchMock.mock.calls.map(([, init]) => JSON.parse((init as { body: string }).body) as Record<string, unknown>);

async function load(search: string, saved?: "normal" | "game") {
  vi.resetModules();
  sessionStorage.clear();
  localStorage.clear();
  if (saved) localStorage.setItem(WEBSITE_TREE_SPLIT_KEY, JSON.stringify({ variant: saved, visitorId: VISITOR }));
  window.history.replaceState({}, "", `/website-tree${search}`);
  Element.prototype.scrollIntoView = vi.fn();
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  ({ default: Split } = await import("./WebsiteTreeSplit"));
}
const renderSplit = () => render(<MemoryRouter><Split /></MemoryRouter>);

beforeEach(() => {
  px.init.mockClear(); px.track.mockClear(); fetchMock.mockReset();
  fetchMock.mockImplementation(async (_u: string, init?: { body?: string }) => {
    const b = init?.body ? JSON.parse(init.body) : {};
    return { status: 200, json: async () => (b.action === "slots" ? { slots_left: 10 } : { ok: true, slots_left: 9 }) };
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("/website-tree como split test", () => {
  it("a quien le tocó game ve la gamificada, cuenta una visita y el pixel lleva PageView + ViewContent con la versión", async () => {
    await load("", "game");
    renderSplit();
    expect(await screen.findByTestId("game-root")).toBeTruthy();
    await waitFor(() => expect(calls()).toContainEqual({ action: "visit", variant: "game", visitor_id: VISITOR }));
    await waitFor(() => expect(px.track.mock.calls.map((c) => c[0])).toEqual(["PageView", "ViewContent"]));
    expect(px.track.mock.calls.find((c) => c[0] === "ViewContent")![1]).toMatchObject({ ab_variant: "game" });
  });

  it("a quien le tocó normal ve la landing normal y también cuenta su visita", async () => {
    await load("", "normal");
    renderSplit();
    await screen.findAllByRole("button", { name: /Quiero mi website gratis/ });
    expect(screen.queryByTestId("game-root")).toBeNull();
    await waitFor(() => expect(calls()).toContainEqual({ action: "visit", variant: "normal", visitor_id: VISITOR }));
    expect(px.track.mock.calls.find((c) => c[0] === "ViewContent")![1]).toMatchObject({ ab_variant: "normal" });
  });

  it("?v=game fuerza la versión pero NO cuenta la visita ni manda la versión al pixel", async () => {
    await load("?v=game");
    renderSplit();
    expect(await screen.findByTestId("game-root")).toBeTruthy();
    await waitFor(() => expect(px.track).toHaveBeenCalled());
    expect(calls().some((c) => c.action === "visit")).toBe(false);
    expect(px.track.mock.calls.find((c) => c[0] === "ViewContent")![1]).not.toHaveProperty("ab_variant");
    expect(localStorage.getItem(WEBSITE_TREE_SPLIT_KEY)).toBeNull();
  });

  it("al enviar el formulario de la versión normal, el paso 1 y el pedido llevan la versión", async () => {
    await load("", "normal");
    renderSplit();
    fireEvent.click((await screen.findAllByRole("button", { name: /Quiero mi website gratis/ }))[0]);
    const type = (ph: string, value: string) => fireEvent.change(screen.getByPlaceholderText(ph), { target: { value } });
    type("Ej: Carlos Ramírez", "Carlos Ramírez");
    type("tucorreo@ejemplo.com", "carlos@ejemplo.com");
    type("713 555 0101", "713 555 0101");
    type("Ej: Ramírez Tree Service", "Ramírez Tree Service");
    fireEvent.click(screen.getByRole("button", { name: /Continuar/ }));
    await waitFor(() => expect(calls().find((c) => c.action === "lead")).toMatchObject({ variant: "normal" }));
  });
});
