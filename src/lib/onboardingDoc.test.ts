import { describe, expect, it } from "vitest";
import {
  ONBOARDING_FORM_ID, buildOnboardingDocHtml, findOnboardingSource, hasActiveSaasAccess, personName, sanitizeDocHtml,
  type OnboardingContact,
} from "./onboardingDoc";

const VALUES = {
  "ob-name": "Pérez Tree Service", "ob-phone": "+1 7815550100", "ob-zone": "Boxford\nIpswich", "ob-lang": "Ambos",
  "ob-services": [{ name: "Poda" }, { name: "" }, { name: "Remoción <de> árboles" }], "ob-negatives": "Pintura", "ob-budget": "1500",
};

const contact = (id: string, over: Partial<OnboardingContact> = {}): OnboardingContact => ({
  id, user_id: "u1", name: "Juan Pérez", phone: "(781) 555-0100", custom_fields: null, ...over,
});

const textOf = (html: string) => {
  const el = document.createElement("div");
  el.innerHTML = html.replace(/<\/(p|li|h1)>|<br>/g, "$&\n");
  return el.textContent!.replace(/ /g, " ");
};

describe("buildOnboardingDocHtml", () => {
  it("trae todos los datos pedidos, en orden, y deja en blanco lo que no se respondió", () => {
    const out = textOf(buildOnboardingDocHtml(VALUES, "Juan Pérez"));
    const labels = ["Nombre:", "Nombre del negocio:", "Teléfono del negocio:", "Dirección del negocio:", "Calle:", "Ciudad:", "Estado:", "Zip Code:", "EIN:", "Zona que atiende:",
      "Idioma:", "Servicios que quieres promocionar:", "Servicios que NO promocionas:", "Presupuesto:", "Landing Page:", "Códigos de Tracking:"];
    const positions = labels.map((l) => out.indexOf(l));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(out).toContain("Nombre: Juan Pérez");
    expect(out).toContain("Teléfono del negocio: +1 7815550100");
    expect(out).toContain("Presupuesto: US$1,500 al mes");
    expect(out).not.toContain("palabras negativas");
    expect(out).toMatch(/EIN: \n/);
    expect(out).toMatch(/Calle: \n/);
  });

  it("llena nombre, dirección y EIN con lo que respondió el cliente", () => {
    const out = textOf(buildOnboardingDocHtml({
      ...VALUES, "ob-contact-name": "Ana Gómez", "ob-street": "12 Oak St", "ob-city": "Boxford", "ob-state": "MA", "ob-zip": "01921", "ob-ein": "12-3456789",
    }, "Nombre de la ficha"));
    for (const line of ["Nombre: Ana Gómez", "Calle: 12 Oak St", "Ciudad: Boxford", "Estado: MA", "Zip Code: 01921", "EIN: 12-3456789"]) expect(out).toContain(line);
    expect(out).not.toContain("Nombre de la ficha");
  });

  it("resalta el NO, escapa las respuestas y sobrevive a la limpieza sin cambios de contenido", () => {
    const html = buildOnboardingDocHtml(VALUES, "");
    expect(html).toContain("<mark>NO</mark>");
    expect(html).toContain("<li>Remoción &lt;de&gt; árboles</li>");
    expect(html.match(/<ol><li>.*?<\/ol>/)![0].match(/<li>/g)).toHaveLength(2);
    expect(textOf(sanitizeDocHtml(html))).toBe(textOf(html));
  });

  it("con el formulario vacío no inventa nada", () => {
    const out = textOf(buildOnboardingDocHtml({}, ""));
    expect(out).toMatch(/Presupuesto: \n/);
    expect(out).not.toContain("US$");
    expect(out).not.toContain("undefined");
  });
});

describe("findOnboardingSource", () => {
  const filled = { [ONBOARDING_FORM_ID]: VALUES };

  it("usa la ficha de la cita si tiene el formulario", () => {
    const c = contact("a", { custom_fields: filled });
    expect(findOnboardingSource(c, [c])?.id).toBe("a");
  });

  it("si el formulario quedó en otra ficha, la encuentra por teléfono dentro de la misma cuenta", () => {
    const appt = contact("a");
    const other = contact("b", { phone: "+1 781 555 0100", custom_fields: filled });
    const foreign = contact("c", { user_id: "u2", custom_fields: filled });
    expect(findOnboardingSource(appt, [foreign, appt, other])?.id).toBe("b");
    expect(findOnboardingSource(appt, [foreign, appt])).toBeNull();
  });

  it("no hay botón sin formulario llenado ni emparejando teléfonos vacíos", () => {
    const appt = contact("a", { phone: null });
    expect(findOnboardingSource(appt, [appt, contact("b", { phone: null, custom_fields: filled })])).toBeNull();
    const empty = contact("d", { custom_fields: { [ONBOARDING_FORM_ID]: { "ob-name": " " } } });
    expect(findOnboardingSource(empty, [empty])).toBeNull();
  });
});

describe("hasActiveSaasAccess", () => {
  it("solo con acceso activo y sin vencer", () => {
    const today = "2026-11-25";
    expect(hasActiveSaasAccess({ status: "active", expires_at: null }, today)).toBe(true);
    expect(hasActiveSaasAccess({ status: "active", expires_at: today }, today)).toBe(true);
    expect(hasActiveSaasAccess({ status: "active", expires_at: "2026-11-24" }, today)).toBe(false);
    expect(hasActiveSaasAccess({ status: "suspended" }, today)).toBe(false);
    expect(hasActiveSaasAccess(null, today)).toBe(false);
  });
});

describe("personName", () => {
  it("no repite el nombre del negocio como nombre de la persona", () => {
    const business = contact("b", { name: "Pérez Tree Service " });
    expect(personName("pérez tree service", contact("a"), business)).toBe("Juan Pérez");
    expect(personName("Pérez Tree Service", business, business)).toBe("");
  });
});

describe("sanitizeDocHtml", () => {
  it("quita scripts, manejadores, atributos y links peligrosos", () => {
    const dirty = `<p onclick="x()" style="color:red">hola <img src=x onerror=alert(1)><script>alert(1)</script></p>`
      + `<a href="javascript:alert(1)">uno</a><a href=" JaVaScRiPt:alert(1)">dos</a><a href="https://ok.com" onmouseover="x()">tres</a>`
      + `<svg><g onload="alert(1)"></g></svg><iframe src="https://evil.com"></iframe><form action="/x"><input value="v"><span>texto</span></form>`;
    expect(sanitizeDocHtml(dirty)).toBe(
      `<p>hola </p><a>uno</a><a>dos</a><a href="https://ok.com" target="_blank" rel="noopener noreferrer">tres</a>texto`,
    );
  });

  it("conserva el formato del documento", () => {
    const html = "<h1>T</h1><p><strong>A:</strong> <mark>NO</mark></p><ul><li>x</li></ul><div><br></div>";
    expect(sanitizeDocHtml(html)).toBe(html);
  });
});
