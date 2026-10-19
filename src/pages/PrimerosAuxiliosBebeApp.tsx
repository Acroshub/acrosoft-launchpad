// Webapp «Primeros Auxilios del Bebé (0 a 12 Meses)» — /primeros-auxilios-bebe-app
//
// Estática y sin backend. La contraseña compartida cifra los PDFs de la Biblioteca (ebook + 3 bonos)
// en public/primeros-auxilios-bebe-pack/; el estado (etapa, contactos, quiz, checklist) vive en
// localStorage. Ver docs/primeros-auxilios-bebe-app.md.

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AppProvider } from "./primeros-auxilios-bebe-app/app-context";
import { PackError, hasStoredSession, logout as clearSession, resumeSession } from "./primeros-auxilios-bebe-app/client";
import { Gate } from "./primeros-auxilios-bebe-app/Gate";
import { Shell } from "./primeros-auxilios-bebe-app/Shell";
import type { PackContent } from "./primeros-auxilios-bebe-app/types";
import "./primeros-auxilios-bebe-app/app.css";

type Phase = { kind: "checking" } | { kind: "locked"; notice?: string } | { kind: "ready"; content: PackContent };

const CREAM = "#FFF9F4";

/** Título propio, noindex y color de barra mientras la app está montada; al salir deja todo como estaba. */
function usePrivatePage(title: string) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex, nofollow";
    document.head.appendChild(robots);
    const theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const prevTheme = theme?.content;
    if (theme) theme.content = CREAM;
    const prevBg = document.documentElement.style.backgroundColor;
    document.documentElement.style.backgroundColor = CREAM;
    return () => {
      document.title = prevTitle;
      robots.remove();
      if (theme && prevTheme !== undefined) theme.content = prevTheme;
      document.documentElement.style.backgroundColor = prevBg;
    };
  }, [title]);
}

const PrimerosAuxiliosBebeApp = () => {
  usePrivatePage("Primeros Auxilios del Bebé");
  const [phase, setPhase] = useState<Phase>({ kind: "checking" });

  useEffect(() => {
    let cancelled = false;
    resumeSession()
      .then((content) => {
        if (!cancelled) setPhase(content ? { kind: "ready", content } : { kind: "locked" });
      })
      .catch((err) => {
        if (cancelled) return;
        const offline = err instanceof PackError && err.code === "network";
        // Ya había entrado antes: sin internet las tarjetas, el quiz y el checklist siguen funcionando.
        if (offline && hasStoredSession()) {
          setPhase({ kind: "ready", content: { library: [], offline: true } });
          return;
        }
        setPhase({ kind: "locked", notice: offline ? "No pudimos conectarnos. Revisa tu internet e inténtalo de nuevo." : undefined });
      });
    return () => { cancelled = true; };
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setPhase({ kind: "locked" });
  }, []);

  return (
    <div className="pab-app">
      {phase.kind === "checking" && (
        <div className="pab-splash" role="status" aria-label="Cargando"><Loader2 className="pab-spin" /></div>
      )}
      {phase.kind === "locked" && <Gate notice={phase.notice} onUnlock={(content) => setPhase({ kind: "ready", content })} />}
      {phase.kind === "ready" && (
        <AppProvider content={phase.content} logout={logout}>
          <Shell />
        </AppProvider>
      )}
    </div>
  );
};

export default PrimerosAuxiliosBebeApp;
