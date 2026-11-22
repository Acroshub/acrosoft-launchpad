import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import FormDataPanel, { mergeFormValues } from "./FormDataPanel";
import type { CrmContact, CrmForm } from "@/lib/supabase";

afterEach(cleanup);

// Misma estructura que el formulario real guardado en crm_forms (slug onboarding-acros), recortada.
const FORM = {
  id: "form-1", name: "Onboarding Acros",
  sections: [{ id: "s-negocio", name: "Negocio" }, { id: "s-redes", name: "Redes sociales" }, { id: "s-oferta", name: "Oferta" }],
  fields: [
    { id: "ob-name", sectionId: "s-negocio", type: "text", label: "Nombre del negocio", required: true },
    { id: "ob-schedule", sectionId: "s-negocio", type: "schedule", label: "Horario de atención", required: true },
    { id: "ob-zone", sectionId: "s-negocio", type: "textarea", label: "Zona que atiende", required: true },
    { id: "ob-h-fb", sectionId: "s-redes", type: "heading", label: "Facebook", required: false },
    { id: "ob-fb-page", sectionId: "s-redes", type: "radio", label: "¿Tienes una Página de Facebook?", required: true, options: ["Sí", "No", "No sé"] },
    { id: "ob-fb-page-link", sectionId: "s-redes", type: "text", label: "Link de tu Página de Facebook (opcional)", required: false, showIf: { fieldId: "ob-fb-page", equals: ["Sí"] } },
    { id: "ob-fb-bm", sectionId: "s-redes", type: "radio", label: "¿Tienes Business Manager de Facebook?", required: true, options: ["Sí", "No", "No sé"] },
    { id: "ob-fb-bm-link", sectionId: "s-redes", type: "text", label: "Link de tu Business Manager (opcional)", required: false, showIf: { fieldId: "ob-fb-bm", equals: ["Sí"] } },
    { id: "ob-gads", sectionId: "s-redes", type: "radio", label: "¿Tienes cuenta en Google Ads?", required: true, options: ["Sí", "No", "No sé"] },
    { id: "ob-gads-link", sectionId: "s-redes", type: "text", label: "Link o ID de tu cuenta de Google Ads (opcional)", required: false, showIf: { fieldId: "ob-gads", equals: ["Sí"] } },
    { id: "ob-services", sectionId: "s-oferta", type: "repeatable", label: "Servicios que quieres promocionar", required: true, subFields: [{ id: "name", label: "Servicio", type: "text" }] },
    { id: "ob-promos", sectionId: "s-oferta", type: "textarea", label: "Promociones, garantías o diferenciadores", required: false },
    { id: "ob-budget", sectionId: "s-oferta", type: "number", label: "Presupuesto mensual para anuncios (US$)", required: true },
  ],
} as unknown as CrmForm;

const SCHEDULE = {
  Lun: { open: true, slots: [{ from: "9:00 AM", to: "6:00 PM" }] },
  Mar: { open: true, slots: [{ from: "9:00 AM", to: "12:00 PM" }, { from: "2:00 PM", to: "6:00 PM" }] },
  Mié: { open: false, slots: [] }, Jue: { open: false, slots: [] }, Vie: { open: false, slots: [] }, Sáb: { open: false, slots: [] }, Dom: { open: false, slots: [] },
};
// Respondió Sí a la página (con link), No al Business Manager, «No sé» a Google Ads, y dejó en blanco las promociones.
const ANSWERS = {
  "ob-name": "Pérez Tree", "ob-schedule": SCHEDULE, "ob-zone": "Dallas y Plano",
  "ob-fb-page": "Sí", "ob-fb-page-link": "facebook.com/perez", "ob-fb-bm": "No", "ob-gads": "No sé",
  "ob-services": [{ name: "Poda de árboles" }, { name: "Remoción de tocones" }], "ob-budget": "1500",
};
const contact = { id: "c1", custom_fields: { "form-1": ANSWERS } } as unknown as CrmContact;

const open = () => fireEvent.click(screen.getByRole("button", { name: /Onboarding Acros/ }));
const renderPanel = (onSave = vi.fn(async () => {})) => {
  render(<FormDataPanel contact={contact} forms={[FORM]} onSave={onSave} />);
  open();
  return onSave;
};

describe("FormDataPanel — respuestas del onboarding", () => {
  it("muestra TODOS los campos, agrupados por pestaña, también los sin respuesta", () => {
    renderPanel();
    for (const t of ["Negocio", "Redes sociales", "Oferta", "Facebook"]) expect(screen.getByText(t)).toBeTruthy();
    for (const l of [/Nombre del negocio/, /Horario de atención/, /Zona que atiende/, /Página de Facebook\?/, /Business Manager de Facebook\?/, /Google Ads\?/, /Servicios que quieres/, /Promociones, garantías/, /Presupuesto mensual/]) {
      expect(screen.getByText(l)).toBeTruthy();
    }
    // Promociones quedó en blanco → aparece igual, como «Sin respuesta»
    const promos = screen.getByText(/Promociones, garantías/).parentElement!;
    expect(within(promos).getByText("Sin respuesta")).toBeTruthy();
  });

  it("muestra las respuestas Sí / No / No sé y qué links aplican", () => {
    renderPanel();
    const of = (label: RegExp) => screen.getByText(label).parentElement!;
    expect(within(of(/Página de Facebook\?/)).getByText("Sí")).toBeTruthy();
    expect(within(of(/Link de tu Página de Facebook/)).getByText("facebook.com/perez")).toBeTruthy();
    expect(within(of(/Business Manager de Facebook\?/)).getByText("No")).toBeTruthy();
    expect(within(of(/Link de tu Business Manager/)).getByText("No aplica")).toBeTruthy(); // respondió No → el link no aplica
    expect(within(of(/Google Ads\?/)).getByText("No sé")).toBeTruthy();
    expect(within(of(/Link o ID de tu cuenta de Google Ads/)).getByText("No aplica")).toBeTruthy();
  });

  it("muestra el horario día por día y los servicios en orden de prioridad", () => {
    renderPanel();
    expect(screen.getByText("9:00 AM – 6:00 PM")).toBeTruthy();                       // Lun
    expect(screen.getByText("9:00 AM – 12:00 PM · 2:00 PM – 6:00 PM", { exact: false })).toBeTruthy(); // Mar, 2 franjas
    expect(screen.getAllByText("Cerrado")).toHaveLength(5);
    expect(screen.getByText("#1")).toBeTruthy();
    expect(screen.getByText("Poda de árboles")).toBeTruthy();
    expect(screen.getByText("#2")).toBeTruthy();
    expect(screen.getByText("Remoción de tocones")).toBeTruthy();
  });

  it("editar y guardar NO borra el horario, los servicios ni los radios", async () => {
    const onSave = renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /Editar/ }));
    fireEvent.change(screen.getByDisplayValue("Pérez Tree"), { target: { value: "Pérez Tree LLC" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const saved = (onSave.mock.calls[0] as unknown as [Record<string, Record<string, unknown>>])[0]["form-1"];
    expect(saved["ob-name"]).toBe("Pérez Tree LLC");
    expect(saved["ob-schedule"]).toEqual(SCHEDULE);
    expect(saved["ob-services"]).toEqual(ANSWERS["ob-services"]);
    expect(saved["ob-fb-page"]).toBe("Sí");
    expect(saved["ob-budget"]).toBe("1500");
  });

  it("mergeFormValues conserva los otros formularios y los campos no editados", () => {
    const all = { a: { x: 1, y: [1] }, b: { z: 2 } };
    expect(mergeFormValues(all, "a", { x: 9 })).toEqual({ a: { x: 9, y: [1] }, b: { z: 2 } });
  });
});
