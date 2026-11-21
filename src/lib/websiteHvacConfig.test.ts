import { describe, expect, it } from "vitest";
import {
  buildWebsiteHvacBody, cleanServices, emptyWebsiteHvacForm, validateWebsiteHvacStep1, validateWebsiteHvacStep2, websiteHvacConfirmUrl, websiteHvacSupportUrl,
} from "./websiteHvacConfig";
import type { WebsiteHvacForm } from "./websiteHvacConfig";

const ok = (): WebsiteHvacForm => ({
  ...emptyWebsiteHvacForm(),
  name: "Carlos Ramírez", email: "carlos@ejemplo.com", whatsapp: "+1 713 555 0101", business: "Ramírez Heating & Air", language: "es", city: "Houston, TX",
  services: ["Reparación de A/C", "", "Instalación", "", "", ""], star: 2,
  answers: { confirm_material: "yes", confirm_cost: "yes", confirm_call: "yes", confirm_marketing: "yes" },
});

describe("formulario de /website-hvac", () => {
  it("paso 1: pide nombre, correo, WhatsApp y negocio", () => {
    expect(validateWebsiteHvacStep1(ok())).toBeNull();
    expect(validateWebsiteHvacStep1({ ...ok(), name: "Ca" })).toMatch(/nombre/i);
    expect(validateWebsiteHvacStep1({ ...ok(), email: "mal" })).toMatch(/correo/i);
    expect(validateWebsiteHvacStep1({ ...ok(), whatsapp: "12" })).toMatch(/WhatsApp/);
    expect(validateWebsiteHvacStep1({ ...ok(), business: " " })).toMatch(/negocio/i);
  });

  it("paso 2: válido con idioma, ciudad, al menos un servicio y las 4 confirmaciones en Sí; el servicio destacado es OPCIONAL", () => {
    expect(validateWebsiteHvacStep2(ok())).toBeNull();
    expect(validateWebsiteHvacStep2({ ...ok(), language: "" })).toMatch(/idioma/i);
    expect(validateWebsiteHvacStep2({ ...ok(), city: "" })).toMatch(/ciudad/i);
    expect(validateWebsiteHvacStep2({ ...ok(), star: -1 })).toBeNull(); // sin servicio destacado: se puede enviar
    expect(validateWebsiteHvacStep2({ ...ok(), services: ["", "", "", "", "", ""], star: -1 })).toMatch(/servicio/i); // pero al menos un servicio sí
    expect(validateWebsiteHvacStep2({ ...ok(), answers: { confirm_material: "yes" } })).toMatch(/4 confirmaciones/);
    expect(validateWebsiteHvacStep2({ ...ok(), answers: { ...ok().answers, confirm_call: "no" } })).toMatch(/requisitos/);
  });

  it("servicios: sin vacíos ni repetidos, y el destacado se conserva aunque haya filas vacías antes", () => {
    expect(cleanServices(ok())).toEqual({ services: ["Reparación de A/C", "Instalación"], star: "Instalación" });
    const dup = { ...ok(), services: ["Instalación", "instalación", "", "", "", ""], star: 0 };
    expect(cleanServices(dup)).toEqual({ services: ["Instalación"], star: "Instalación" });
  });

  it("cuerpo para el servidor: las confirmaciones salen como booleanos", () => {
    const b = buildWebsiteHvacBody(ok());
    expect(b.confirm_material).toBe(true);
    expect(b.services).toEqual(["Reparación de A/C", "Instalación"]);
    expect(b.star).toBe("Instalación");
    expect(buildWebsiteHvacBody({ ...ok(), answers: { ...ok().answers, confirm_cost: "no" } }).confirm_cost).toBe(false);
  });

  it("mensaje de WhatsApp: nombre, negocio y ciudad", () => {
    const url = decodeURIComponent(websiteHvacConfirmUrl(ok()).split("text=")[1]);
    expect(url).toContain("Nombre: Carlos Ramírez");
    expect(url).toContain("Negocio: Ramírez Heating & Air");
    expect(url).toContain("Ciudad: Houston, TX");
  });

  it("botón de soporte: abre el WhatsApp de la confirmación con un mensaje que dice de qué página viene", () => {
    const url = websiteHvacSupportUrl();
    expect(url.startsWith("https://wa.me/59157697071?text=")).toBe(true);
    expect(decodeURIComponent(url.split("?text=")[1])).toBe("Hola, quiero mi website gratis para mi negocio de HVAC, pero antes tengo una pregunta. Mi pregunta es: ");
  });
});
