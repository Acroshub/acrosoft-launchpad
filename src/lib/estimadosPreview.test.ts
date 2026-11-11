import { afterEach, describe, expect, it } from "vitest";
import { ESTIMADOS_PREVIEW_KEY } from "./estimadosConfig";
import { isEstimadosPreview } from "./estimadosPreview";

afterEach(() => sessionStorage.clear());

describe("isEstimadosPreview", () => {
  it("la clave de vista previa es larga y no es «1» (si no, cualquiera abriría la vista previa en producción)", () => {
    expect(ESTIMADOS_PREVIEW_KEY.length).toBeGreaterThanOrEqual(16);
    expect(ESTIMADOS_PREVIEW_KEY).not.toBe("1");
  });

  it("sin parámetro: no es vista previa", () => {
    expect(isEstimadosPreview("")).toBe(false);
    expect(isEstimadosPreview("?session_id=cs_live_123")).toBe(false);
  });

  it("con una clave equivocada: no es vista previa y no se recuerda", () => {
    expect(isEstimadosPreview("?demo=otra-cosa")).toBe(false);
    expect(isEstimadosPreview("")).toBe(false);
  });

  it("con la clave correcta: es vista previa y se recuerda en la pestaña (la página final se abre sin el parámetro)", () => {
    expect(isEstimadosPreview(`?demo=${ESTIMADOS_PREVIEW_KEY}`)).toBe(true);
    expect(isEstimadosPreview("")).toBe(true);
  });
});
