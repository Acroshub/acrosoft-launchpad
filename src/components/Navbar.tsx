import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import AcrosoftLogo from "./shared/AcrosoftLogo";
import { translations } from "@/i18n/landing";

const INK    = "#14161F";
const ACCENT = "#0F766E";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const T = translations.es.nav;

  const navLinks = [
    { href: "/#servicios", label: T.services },
    { href: "/#nosotros",  label: T.about },
    { href: "/#contacto",  label: T.contact },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b" style={{ borderColor: "rgba(20,22,31,0.08)" }}>
      <div className="container mx-auto flex items-center justify-between h-20 px-4 md:px-8">
        <Link to="/" className="hover:opacity-80 transition-opacity">
          <AcrosoftLogo size="sm" />
        </Link>

        {/* Desktop Menu */}
        <div className="hidden lg:flex items-center gap-9">
          {navLinks.map(link => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-semibold font-opensans tracking-tight transition-colors"
              style={{ color: "rgba(20,22,31,0.65)" }}
              onMouseEnter={e => (e.currentTarget.style.color = INK)}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(20,22,31,0.65)")}
            >
              {link.label}
            </a>
          ))}

          <div className="flex items-center gap-3 pl-2">
            <Link
              to="/login"
              className="text-sm font-semibold font-opensans px-4 py-2.5 rounded-xl transition-colors hover:bg-[#14161F]/[0.05]"
              style={{ color: INK }}
            >
              Iniciar sesión
            </Link>
            <a
              href="/#contacto"
              className="text-sm font-bold font-opensans px-6 py-2.5 rounded-xl text-white transition-opacity hover:opacity-90"
              style={{ background: ACCENT }}
            >
              {T.cta}
            </a>
          </div>
        </div>

        {/* Mobile toggle */}
        <div className="lg:hidden flex items-center gap-3">
          <button
            className="p-2 rounded-xl transition-colors"
            style={{ background: "rgba(20,22,31,0.05)", color: INK }}
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden bg-white border-b px-6 pt-4 pb-8 space-y-6 animate-in slide-in-from-top-4 duration-300" style={{ borderColor: "rgba(20,22,31,0.08)" }}>
          <div className="flex flex-col gap-1">
            {navLinks.map(link => (
              <a
                key={link.href}
                href={link.href}
                className="text-base font-semibold font-opensans py-3 border-b"
                style={{ color: INK, borderColor: "rgba(20,22,31,0.08)" }}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <Link
              to="/login"
              className="w-full h-12 rounded-xl font-semibold font-opensans flex items-center justify-center border"
              style={{ color: INK, borderColor: "rgba(20,22,31,0.15)" }}
              onClick={() => setOpen(false)}
            >
              Iniciar sesión
            </Link>
            <a
              href="/#contacto"
              className="w-full h-12 rounded-xl font-bold font-opensans flex items-center justify-center text-white"
              style={{ background: ACCENT }}
              onClick={() => setOpen(false)}
            >
              {T.cta}
            </a>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
