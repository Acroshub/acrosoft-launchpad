import { describe, expect, it } from "vitest";
import {
  buildWebsiteTreeBody, cleanServices, emptyWebsiteTreeForm, validateWebsiteTreeStep1, validateWebsiteTreeStep2, websiteTreeConfirmUrl, websiteTreeSupportUrl,
} from "./websiteTreeConfig";
import type { WebsiteTreeForm } from "./websiteTreeConfig";

const ok = (): WebsiteTreeForm => ({
  ...emptyWebsiteTreeForm(),
  name: "Carlos Ramírez", email: "carlos@ejemplo.com", whatsapp: "+1 713 555 0101", business: "Ramírez Tree Service", language: "es", city: "Houston, TX",
  services: ["Poda de árboles", "", "Remoción de tocones", "", "", ""], star: 2,
  answers: { confirm_material: "yes", confirm_cost: "yes", confirm_call: "yes", confirm_marketing: "yes" },
});

describe("formulario de /website-tree", () => {
  it("paso 1: pide nombre, correo, WhatsApp y negocio", () => {
    expect(validateWebsiteTreeStep1(ok())).toBeNull();
    expect(validateWebsiteTreeStep1({ ...ok(), name: "Ca" })).toMatch(/nombre/i);
    expect(validateWebsiteTreeStep1({ ...ok(), email: "mal" })).toMatch(/correo/i);
    expect(validateWebsiteTreeStep1({ ...ok(), whatsapp: "12" })).toMatch(/WhatsApp/);
    expect(validateWebsiteTreeStep1({ ...ok(), business: " " })).toMatch(/negocio/i);
  });

  it("paso 2: válido con idioma, ciudad, al menos un servicio y las 4 confirmaciones en Sí; el servicio destacado es OPCIONAL", () => {
    expect(validateWebsiteTreeStep2(ok())).toBeNull();
    expect(validateWebsiteTreeStep2({ ...ok(), language: "" })).toMatch(/idioma/i);
    expect(validateWebsiteTreeStep2({ ...ok(), city: "" })).toMatch(/ciudad/i);
    expect(validateWebsiteTreeStep2({ ...ok(), star: -1 })).toBeNull(); // sin servicio destacado: se puede enviar
    expect(validateWebsiteTreeStep2({ ...ok(), services: ["", "", "", "", "", ""], star: -1 })).toMatch(/servicio/i); // pero al menos un servicio sí
    expect(validateWebsiteTreeStep2({ ...ok(), answers: { confirm_material: "yes" } })).toMatch(/4 confirmaciones/);
    expect(validateWebsiteTreeStep2({ ...ok(), answers: { ...ok().answers, confirm_call: "no" } })).toMatch(/requisitos/);
  });

  it("servicios: sin vacíos ni repetidos, y el destacado se conserva aunque haya filas vacías antes", () => {
    expect(cleanServices(ok())).toEqual({ services: ["Poda de árboles", "Remoción de tocones"], star: "Remoción de tocones" });
    const dup = { ...ok(), services: ["Remoción de tocones", "remoción de tocones", "", "", "", ""], star: 0 };
    expect(cleanServices(dup)).toEqual({ services: ["Remoción de tocones"], star: "Remoción de tocones" });
  });

  it("cuerpo para el servidor: las confirmaciones salen como booleanos", () => {
    const b = buildWebsiteTreeBody(ok());
    expect(b.confirm_material).toBe(true);
    expect(b.services).toEqual(["Poda de árboles", "Remoción de tocones"]);
    expect(b.star).toBe("Remoción de tocones");
    expect(buildWebsiteTreeBody({ ...ok(), answers: { ...ok().answers, confirm_cost: "no" } }).confirm_cost).toBe(false);
  });

  it("mensaje de WhatsApp: nombre, negocio y ciudad", () => {
    const url = decodeURIComponent(websiteTreeConfirmUrl(ok()).split("text=")[1]);
    expect(url).toContain("Nombre: Carlos Ramírez");
    expect(url).toContain("Negocio: Ramírez Tree Service");
    expect(url).toContain("Ciudad: Houston, TX");
  });

  it("botón de soporte: abre el WhatsApp de la confirmación con un mensaje que dice de qué página viene", () => {
    const url = websiteTreeSupportUrl();
    expect(url.startsWith("https://wa.me/59157697071?text=")).toBe(true);
    expect(decodeURIComponent(url.split("?text=")[1])).toBe("Hola, quiero mi website gratis para mi negocio de tree service, pero antes tengo una pregunta. Mi pregunta es: ");
  });
});
