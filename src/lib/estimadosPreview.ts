import { ESTIMADOS_PREVIEW_KEY } from "@/lib/estimadosConfig";

const STORAGE_KEY = "estimados_preview";

/**
 * ¿Esta pestaña está en modo vista previa de /estimados-ty y /estimados-gracias?
 * - En desarrollo (Vite): `?demo=1`.
 * - En producción: `?demo=<ESTIMADOS_PREVIEW_KEY>`.
 * Una vez activada se recuerda en la pestaña (sessionStorage) para que la página final siga en vista previa al «reservar» desde el
 * calendario, que navega sin el parámetro. Cerrar la pestaña la apaga.
 */
export function isEstimadosPreview(search: string = typeof window !== "undefined" ? window.location.search : ""): boolean {
  const demo = new URLSearchParams(search).get("demo");
  const asked = (import.meta.env.DEV && demo === "1") || (!!ESTIMADOS_PREVIEW_KEY && demo === ESTIMADOS_PREVIEW_KEY);
  try {
    if (asked) { sessionStorage.setItem(STORAGE_KEY, "1"); return true; }
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return asked;
  }
}
