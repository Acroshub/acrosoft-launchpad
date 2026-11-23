import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import OnboardingAcros from "./OnboardingAcros";

vi.mock("@/lib/piscinasFunnel", () => ({ addNoindex: vi.fn(() => () => {}) }));
vi.setConfig({ testTimeout: 20000 });

// Réplica reducida de la estructura real guardada en crm_forms (slug onboarding-acros): una pestaña por sección, un radio con campo condicional y un repetible obligatorio.
const FORM = {
  id: "2b6d1dae-110e-4e23-9442-540210d4d03d", name: "Onboarding Acros", submit_label: "Enviar información", success_action: "popup",
  success_message: "¡Listo! Recibimos la información", language: "es",
  sections: [
    { id: "s1", name: "Negocio" }, { id: "s2", name: "Redes sociales" }, { id: "s3", name: "Oferta" },
  ],
  fields: [
    { id: "name", sectionId: "s1", type: "text", label: "Nombre del negocio", required: true, placeholder: "Nombre" },
    { id: "sch", sectionId: "s1", type: "schedule", label: "Horario de atención", required: true },
    { id: "web", sectionId: "s2", type: "text", label: "Website (opcional)", required: false, placeholder: "tunegocio.com" },
    { id: "fb", sectionId: "s2", type: "radio", label: "¿Tienes una Página de Facebook?", required: true, options: ["Sí", "No", "No sé"], compact: true },
    { id: "fb-link", sectionId: "s2", type: "text", label: "Link de tu Página de Facebook (opcional)", required: false, placeholder: "facebook.com/tunegocio", showIf: { fieldId: "fb", equals: ["Sí"] } },
    { id: "svc", sectionId: "s3", type: "repeatable", label: "Servicios que quieres promocionar", required: true, subFields: [{ id: "name", label: "Servicio", type: "text" }] },
  ],
};

let submitted: any = null;
beforeEach(() => {
  submitted = null;
  window.scrollTo = vi.fn() as any;
  vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    if (body.action === "get_config") return new Response(JSON.stringify({ form: FORM, profile: null, services: [] }), { status: 200 });
    submitted = body;
    return new Response(JSON.stringify({ submission_id: "sub-1" }), { status: 200 });
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter><OnboardingAcros /></MemoryRouter>
    </QueryClientProvider>,
  );
const siguiente = () => fireEvent.click(screen.getByRole("button", { name: /Continuar/ }));

describe("/onboarding-acros", () => {
  it("muestra el logo y, sin botones de pestaña, dónde está el visitante y cuánto le falta", async () => {
    renderPage();
    expect(await screen.findByText(/Pestaña 1 de 3/)).toBeTruthy();
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
    expect(screen.getByText("Acros")).toBeTruthy(); // wordmark del logo
    expect(screen.getByText(/Negocio · te faltan 2 más/)).toBeTruthy();
    expect(screen.getByText("Empecemos con tu negocio")).toBeTruthy();
    expect(screen.queryByText(/Vista previa/)).toBeNull();
  });

  it("no deja avanzar con un obligatorio vacío y sí al llenarlo", async () => {
    renderPage();
    await screen.findByText(/Pestaña 1 de 3/);
    siguiente();
    expect(await screen.findByText(/es obligatorio/, { selector: "p" })).toBeTruthy();
    expect(screen.getByText(/Pestaña 1 de 3/)).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText("Nombre"), { target: { value: "Pérez Tree" } });
    siguiente();
    expect(await screen.findByText(/Pestaña 2 de 3/)).toBeTruthy();
    expect(screen.getByText(/Redes sociales · te falta 1 más/)).toBeTruthy();
  });

  it("el link de Facebook solo aparece al responder «Sí», y «Anterior» vuelve a la pestaña previa", async () => {
    renderPage();
    await screen.findByText(/Pestaña 1 de 3/);
    fireEvent.change(screen.getByPlaceholderText("Nombre"), { target: { value: "Pérez Tree" } });
    siguiente();
    await screen.findByText(/Pestaña 2 de 3/);
    expect(screen.queryByPlaceholderText("facebook.com/tunegocio")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "No" }));
    expect(screen.queryByPlaceholderText("facebook.com/tunegocio")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Sí" }));
    expect(screen.getByPlaceholderText("facebook.com/tunegocio")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Anterior/ }));
    expect(await screen.findByText(/Pestaña 1 de 3/)).toBeTruthy();
    expect((screen.getByPlaceholderText("Nombre") as HTMLInputElement).value).toBe("Pérez Tree");
  });

  it("exige al menos un servicio, exige los términos y envía sin los campos ocultos", async () => {
    renderPage();
    await screen.findByText(/Pestaña 1 de 3/);
    fireEvent.change(screen.getByPlaceholderText("Nombre"), { target: { value: "Pérez Tree" } });
    siguiente();
    await screen.findByText(/Pestaña 2 de 3/);
    fireEvent.click(screen.getByRole("button", { name: "Sí" }));
    fireEvent.change(screen.getByPlaceholderText("facebook.com/tunegocio"), { target: { value: "facebook.com/perez" } });
    fireEvent.click(screen.getByRole("button", { name: "No" })); // lo oculta de nuevo
    siguiente();
    await screen.findByText(/Pestaña 3 de 3/);
    expect(screen.getByText(/es la última/)).toBeTruthy();

    const enviar = () => fireEvent.click(screen.getByRole("button", { name: /Enviar información/ }));
    fireEvent.click(screen.getByText(/Acepto los/));
    enviar(); // repetible vacío
    expect(submitted).toBeNull();

    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: "Poda de árboles" } });
    enviar();
    await waitFor(() => expect(submitted).not.toBeNull());
    expect(submitted.form_id).toBe(FORM.id);
    expect(submitted.data.name).toBe("Pérez Tree");
    expect(submitted.data.fb).toBe("No");
    expect(submitted.data.sch.Lun.open).toBe(true); // el horario obligatorio mostrado por defecto sí se envía aunque no se toque
    expect("web" in submitted.data).toBe(false);     // website opcional sin llenar: no se envía
    expect("fb-link" in submitted.data).toBe(false); // el link quedó oculto → no se envía
    expect(submitted.data.svc[0].name).toBe("Poda de árboles");
    expect(await screen.findByText(/Recibimos la información/)).toBeTruthy();
    expect(screen.getByText("¡Información recibida!")).toBeTruthy();
    expect(screen.queryByText("Empecemos con tu negocio")).toBeNull(); // el título no aparece en la pantalla de éxito
  });

  describe("vista previa (?demo=1)", () => {
    beforeEach(() => { window.history.replaceState({}, "", "/onboarding-acros?demo=1"); sessionStorage.clear(); });
    afterEach(() => { window.history.replaceState({}, "", "/"); sessionStorage.clear(); });

    it("deja recorrer todas las pestañas sin llenar nada y al enviar no manda ni guarda nada", async () => {
      renderPage();
      expect(await screen.findByText(/Pestaña 1 de 3/)).toBeTruthy();
      expect(screen.getByText(/Vista previa/)).toBeTruthy();
      siguiente();
      expect(await screen.findByText(/Pestaña 2 de 3/)).toBeTruthy();
      siguiente();
      expect(await screen.findByText(/Pestaña 3 de 3/)).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: /Enviar información/ })); // sin términos, sin servicios
      expect(await screen.findByText("¡Información recibida!")).toBeTruthy();
      expect(submitted).toBeNull();
    });

    it("«&paso=exito» abre directo la pantalla de éxito", async () => {
      window.history.replaceState({}, "", "/onboarding-acros?demo=1&paso=exito");
      renderPage();
      expect(await screen.findByText("¡Información recibida!")).toBeTruthy();
    });
  });
});
