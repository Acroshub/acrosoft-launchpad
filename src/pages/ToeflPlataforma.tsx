// Bono 1 · TOEFL Audio Lab — /toefl-plataforma
//
// Webapp estática y sin backend. Una contraseña compartida cifra todo el
// contenido (audios, guiones, plantillas) en public/toefl-audiolab/; el progreso
// y las grabaciones viven en este navegador. Ver docs/toefl-audiolab.md.

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Gate } from "./toefl-lab/Gate";
import { LabError, logout as clearSession, resumeSession } from "./toefl-lab/lab-client";
import { LabProvider } from "./toefl-lab/lab-context";
import { PlayerProvider } from "./toefl-lab/player";
import { Shell } from "./toefl-lab/Shell";
import type { LabContent } from "./toefl-lab/types";
import "./toefl-lab/toefl-lab.css";

type Phase = { kind: "checking" } | { kind: "locked"; notice?: string } | { kind: "ready"; content: LabContent };

const NAVY = "#0a2350";

/**
 * Mientras la plataforma está montada: título propio, noindex, y el navy hasta
 * los bordes (barra del navegador y rebote del scroll en iPhone). Al salir deja
 * todo como estaba: el resto del sitio es una SPA y comparte <head> y <body>.
 */
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
    if (theme) theme.content = NAVY;

    const prevBg = document.documentElement.style.backgroundColor;
    document.documentElement.style.backgroundColor = NAVY;

    return () => {
      document.title = prevTitle;
      robots.remove();
      if (theme && prevTheme !== undefined) theme.content = prevTheme;
      document.documentElement.style.backgroundColor = prevBg;
    };
  }, [title]);
}

const ToeflPlataforma = () => {
  usePrivatePage("TOEFL Audio Lab");
  const [phase, setPhase] = useState<Phase>({ kind: "checking" });

  useEffect(() => {
    let cancelled = false;
    resumeSession()
      .then((content) => {
        if (!cancelled) setPhase(content ? { kind: "ready", content } : { kind: "locked" });
      })
      .catch((err) => {
        if (cancelled) return;
        const offline = err instanceof LabError && err.code === "network";
        setPhase({ kind: "locked", notice: offline ? "No pudimos conectarnos. Revisa tu internet e inténtalo de nuevo." : undefined });
      });
    return () => { cancelled = true; };
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setPhase({ kind: "locked" });
  }, []);

  return (
    <div className="tl-app">
      {phase.kind === "checking" && (
        <div className="tl-splash" role="status" aria-label="Cargando">
          <Loader2 className="tl-spin" />
        </div>
      )}

      {phase.kind === "locked" && <Gate notice={phase.notice} onUnlock={(content) => setPhase({ kind: "ready", content })} />}

      {phase.kind === "ready" && (
        <LabProvider content={phase.content} logout={logout}>
          <PlayerProvider>
            <Shell />
          </PlayerProvider>
        </LabProvider>
      )}
    </div>
  );
};

export default ToeflPlataforma;
