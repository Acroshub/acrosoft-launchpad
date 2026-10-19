import { BookOpen, Brain, HeartPulse, Home as HomeIcon, ListChecks, LogOut } from "lucide-react";
import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useApp } from "./app-context";
import { CardView } from "./CardView";
import { APP_ROOT } from "./constants";
import { Home } from "./Home";
import { House } from "./House";
import { Library } from "./Library";
import { Quiz } from "./QuizScreen";

const NAV = [
  { to: APP_ROOT, label: "Inicio", Icon: HomeIcon, end: true },
  { to: `${APP_ROOT}/casa`, label: "Casa", Icon: ListChecks, end: false },
  { to: `${APP_ROOT}/quiz`, label: "Quiz", Icon: Brain, end: false },
  { to: `${APP_ROOT}/biblioteca`, label: "Biblioteca", Icon: BookOpen, end: false },
] as const;

export function Shell() {
  const { logout } = useApp();
  const { pathname } = useLocation();
  const fullscreen = pathname.startsWith(`${APP_ROOT}/tarjetas/`);

  if (fullscreen) {
    return (
      <Routes>
        <Route path="tarjetas/:id" element={<CardView />} />
      </Routes>
    );
  }

  return (
    <div className="pab-shell">
      <header className="pab-header">
        <div className="pab-brand"><span className="pab-brand-mark"><HeartPulse aria-hidden="true" /></span><span>Primeros Auxilios del Bebé</span></div>
        <button type="button" className="pab-icon-btn" onClick={logout} aria-label="Cerrar sesión"><LogOut aria-hidden="true" /></button>
      </header>
      <main className="pab-main">
        <Routes>
          <Route index element={<Home />} />
          <Route path="casa" element={<House />} />
          <Route path="quiz" element={<Quiz />} />
          <Route path="biblioteca" element={<Library />} />
          <Route path="*" element={<Navigate to={APP_ROOT} replace />} />
        </Routes>
      </main>
      <nav className="pab-nav" aria-label="Secciones">
        {NAV.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `pab-nav-link ${isActive ? "is-active" : ""}`}>
            <span className="pab-nav-ico"><Icon aria-hidden="true" /></span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
