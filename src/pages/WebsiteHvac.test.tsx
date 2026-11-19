import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import type { ComponentType } from "react";

const px = vi.hoisted(() => ({ init: vi.fn(), track: vi.fn() }));
vi.mock("@/lib/metaPixel", () => ({ initMetaPixel: px.init, trackMetaEvent: px.track }));
vi.mock("@/lib/piscinasFunnel", () => ({ addNoindex: vi.fn(() => () => {}) }));

const PIXEL = "4563434847244973";
let WebsiteHvac: ComponentType;

// IS_DEMO se calcula al cargar el módulo: cada suite fija la URL (y limpia la sessionStorage, que recuerda el modo demo) y recién entonces importa la página.
async function loadPage(demo: boolean) {
  vi.resetModules();
  sessionStorage.clear();
  window.history.replaceState({}, "", demo ? "/website-hvac?demo=1" : "/website-hvac");
  Element.prototype.scrollIntoView = vi.fn();
  ({ default: WebsiteHvac } = await import("./WebsiteHvac"));
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const type = (placeholder: string, value: string) => fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value } });
const fillStep1 = () => {
  type("Ej: Carlos Ramírez", "Carlos Ramírez");
  type("tucorreo@ejemplo.com", "carlos@ejemplo.com");
  type("713 555 0101", "713 555 0101");
  type("Ej: Ramírez Heating & Air", "Ramírez Heating & Air");
};
const renderPage = () => render(<MemoryRouter><WebsiteHvac /></MemoryRouter>);
/** El formulario NO está en la página: solo aparece en un popup al tocar un botón CTA. */
const abrirPopup = () => fireEvent.click(screen.getAllByRole("button", { name: /Quiero mi website gratis/ })[0]);
const continuar = () => screen.getByRole("button", { name: /Continuar/ }) as HTMLButtonElement;
const enviar = () => screen.getByRole("button", { name: /Enviar mi pedido/ }) as HTMLButtonElement;
const llenarPaso2 = () => {
  fireEvent.click(screen.getByRole("button", { name: "Español" }));
  fireEvent.change(screen.getByPlaceholderText("Ej: Houston, TX"), { target: { value: "Houston, TX" } });
  fireEvent.click(screen.getByRole("button", { name: /Reparación de A\/C/ }));
  fireEvent.click(screen.getByRole("button", { name: /Marcar el servicio 1 como servicio destacado/ }));
  document.querySelectorAll(".wh-conf").forEach((c) => fireEvent.click(c.querySelector("button")!));
};

describe("formulario de /website-hvac (vista previa)", () => {
  beforeAll(() => loadPage(true));

  it("el formulario no está visible de primera: aparece en un popup al tocar un botón", () => {
    renderPage();
    expect(screen.queryByPlaceholderText("Ej: Carlos Ramírez")).toBeNull();
    expect(screen.queryByTestId("formulario-popup")).toBeNull();
    abrirPopup();
    expect(screen.getByTestId("formulario-popup")).toBeTruthy();
    expect(screen.getByPlaceholderText("Ej: Carlos Ramírez")).toBeTruthy();
  });

  it("paso 1: «Continuar» queda deshabilitado hasta que estén los 4 datos", () => {
    renderPage();
    abrirPopup();
    expect(continuar().disabled).toBe(true);
    type("Ej: Carlos Ramírez", "Carlos Ramírez");
    type("tucorreo@ejemplo.com", "carlos@ejemplo.com");
    expect(continuar().disabled).toBe(true);
    type("713 555 0101", "713 555 0101");
    expect(continuar().disabled).toBe(true); // falta el negocio
    type("Ej: Ramírez Heating & Air", "Ramírez Heating & Air");
    expect(continuar().disabled).toBe(false);
  });

  // OJO: esta prueba NO detecta el error original de «Atrás» (React reutilizaba el <form> y convertía el botón «Atrás» en «Continuar» antes de que el navegador
  // terminara el clic, así que reenviaba el paso 1). jsdom no lo reproduce: se comprobó quitando las `key` de los <form> y la prueba seguía pasando. Ese error solo
  // se ve en un navegador real; se verificó con Playwright. Aquí solo se cubre el comportamiento esperado.
  it("«Atrás» vuelve al paso 1 y conserva lo escrito", () => {
    renderPage();
    abrirPopup();
    fillStep1();
    fireEvent.click(continuar());
    expect(enviar().disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText("Ej: Houston, TX"), { target: { value: "Houston, TX" } });

    fireEvent.click(screen.getByRole("button", { name: "Atrás" }));
    expect(screen.queryByRole("button", { name: /Enviar mi pedido/ })).toBeNull();
    expect((screen.getByPlaceholderText("Ej: Carlos Ramírez") as HTMLInputElement).value).toBe("Carlos Ramírez");
    expect(continuar().disabled).toBe(false);

    fireEvent.click(continuar());
    expect((screen.getByPlaceholderText("Ej: Houston, TX") as HTMLInputElement).value).toBe("Houston, TX");
  });

  it("paso 2: «Enviar» solo se habilita con idioma, ciudad, servicio destacado y las 4 confirmaciones en Sí", () => {
    renderPage();
    abrirPopup();
    fillStep1();
    fireEvent.click(continuar());
    fireEvent.click(screen.getByRole("button", { name: "Español" }));
    fireEvent.change(screen.getByPlaceholderText("Ej: Houston, TX"), { target: { value: "Houston, TX" } });
    fireEvent.click(screen.getByRole("button", { name: /Reparación de A\/C/ }));
    expect(enviar().disabled).toBe(true); // falta el servicio destacado
    fireEvent.click(screen.getByRole("button", { name: /Marcar el servicio 1 como servicio destacado/ }));

    const confirmaciones = Array.from(document.querySelectorAll(".wh-conf"));
    expect(confirmaciones).toHaveLength(4);
    confirmaciones.slice(0, 3).forEach((c) => fireEvent.click(c.querySelector("button")!));
    expect(enviar().disabled).toBe(true); // falta la 4.ª
    fireEvent.click(confirmaciones[3].querySelectorAll("button")[1]); // «No»
    expect(enviar().disabled).toBe(true);
    expect(screen.getByRole("alert").textContent).toMatch(/requisitos/);
    fireEvent.click(confirmaciones[3].querySelectorAll("button")[0]); // «Sí»
    expect(enviar().disabled).toBe(false);
  });
});

describe("pixel de Meta de /website-hvac (producción: sin ?demo)", () => {
  const fetchMock = vi.fn();
  beforeEach(async () => {
    px.init.mockClear();
    px.track.mockClear();
    fetchMock.mockReset();
    fetchMock.mockImplementation(async (_url: string, init?: { body?: string }) => {
      const body = init?.body ? JSON.parse(init.body) : {};
      const json = body.action === "slots" ? { slots_left: 10 } : body.action === "lead" ? { ok: true } : { ok: true, slots_left: 9 };
      return { status: 200, json: async () => json };
    });
    vi.stubGlobal("fetch", fetchMock);
    await loadPage(false);
  });

  it("usa el pixel propio y manda PageView y ViewContent al cargar, pero NO Lead", () => {
    renderPage();
    expect(px.init).toHaveBeenCalledWith(PIXEL);
    const eventos = px.track.mock.calls.map((c) => c[0]);
    expect(eventos).toEqual(["PageView", "ViewContent"]);
    expect(px.track.mock.calls.every((c) => c[3] === PIXEL)).toBe(true);
  });

  it("Lead sale UNA vez cuando se ve «Recibimos tu pedido», no antes", async () => {
    renderPage();
    abrirPopup();
    fillStep1();
    fireEvent.click(continuar());
    expect(px.track.mock.calls.some((c) => c[0] === "Lead")).toBe(false); // llenar el paso 1 no es un Lead
    llenarPaso2();
    fireEvent.click(enviar());
    await screen.findByTestId("website-pedido-recibido");
    await waitFor(() => expect(px.track.mock.calls.filter((c) => c[0] === "Lead")).toHaveLength(1));
    const lead = px.track.mock.calls.find((c) => c[0] === "Lead")!;
    expect(lead[3]).toBe(PIXEL);
    expect(typeof lead[2]).toBe("string"); // event_id para deduplicar
  });
});
