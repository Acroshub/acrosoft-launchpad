import { FileText, Headphones, PenLine, Timer } from "lucide-react";
import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AudiosHome, SectionView } from "./Audios";
import { LAB_ROOT } from "./constants";
import { useLab } from "./lab-context";
import { MiniPlayer } from "./MiniPlayer";
import { usePlayer } from "./player";
import { countDone, useProgress } from "./progress";
import { Simulacro } from "./Simulacro";
import { Templates } from "./Templates";
import { Brand, ProgressBar, cx } from "./ui";
import { WritingRoom } from "./WritingRoom";

const NAV = [
  { to: LAB_ROOT, label: "Audios", Icon: Headphones, end: true },
  { to: `${LAB_ROOT}/simulacro`, label: "Simulacro", Icon: Timer, end: false },
  { to: `${LAB_ROOT}/writing`, label: "Writing", Icon: PenLine, end: false },
  { to: `${LAB_ROOT}/plantillas`, label: "Plantillas", Icon: FileText, end: false },
] as const;

export function Shell() {
  const { allIds } = useLab();
  const progress = useProgress();
  const { track } = usePlayer();
  const { pathname } = useLocation();

  const done = countDone(progress, allIds);
  // En el simulacro no hay reproductor: no se puede pausar ni retroceder
  const showPlayer = !pathname.endsWith("/simulacro");

  return (
    <div className={cx("tl-shell", showPlayer && track && "has-player")}>
      <header className="tl-header">
        <div className="tl-header-top">
          <Brand />
          <div className="tl-total" aria-label={`${done} de ${allIds.length} audios completados`}>
            <strong>{done}/{allIds.length}</strong>
            <span>audios</span>
          </div>
        </div>
        <p className="tl-tagline">Escucha cada ejercicio con voz real</p>
        <ProgressBar value={done} total={allIds.length} label="Progreso total" />
      </header>

      <nav className="tl-nav" aria-label="Secciones de la plataforma">
        {NAV.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => cx("tl-nav-link", isActive && "is-active")}>
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <main className="tl-main">
        <Routes>
          <Route index element={<AudiosHome />} />
          <Route path="audios/:sectionId" element={<SectionView />} />
          <Route path="simulacro" element={<Simulacro />} />
          <Route path="writing" element={<WritingRoom />} />
          <Route path="plantillas" element={<Templates />} />
          <Route path="*" element={<Navigate to={LAB_ROOT} replace />} />
        </Routes>
      </main>

      <footer className="tl-footer">
        <p>
          Material independiente de práctica. TOEFL® es una marca registrada de ETS; esta plataforma no está afiliada, patrocinada ni respaldada por ETS. Todos los audios y textos son originales y no son preguntas reales del examen.
        </p>
      </footer>

      {showPlayer && <MiniPlayer />}
    </div>
  );
}
