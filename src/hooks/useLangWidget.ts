import { useMemo } from "react";

export type WidgetLang = "es" | "en";

export function useLangWidget(): WidgetLang {
  return useMemo(() => {
    const param = new URLSearchParams(window.location.search).get("lang");
    if (param === "es" || param === "en") return param;
    const browser = navigator.language?.split("-")[0];
    if (browser === "en") return "en";
    return "es";
  }, []);
}
