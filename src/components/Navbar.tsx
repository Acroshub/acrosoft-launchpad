import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import AcrosoftLogo from "./AcrosoftLogo";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/">
          <AcrosoftLogo size="sm" />
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-6">
          <Link
            to="/"
            className={`text-sm font-medium transition-colors hover:text-primary ${isActive("/") ? "text-primary" : "text-muted-foreground"}`}
          >
            Servicios
          </Link>
          <Link
            to="/#como-funciona"
            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            Cómo funciona
          </Link>
          <Link
            to="/admin"
            className={`text-sm font-medium transition-colors hover:text-primary ${isActive("/admin") ? "text-primary" : "text-muted-foreground"}`}
          >
            Admin
          </Link>
          <div className="flex items-center gap-1 text-xs text-muted-foreground border rounded-full px-2 py-1">
            <span className="font-semibold text-foreground">ES</span>
            <span>/</span>
            <span>EN</span>
          </div>
          <Button asChild size="sm">
            <Link to="/onboarding">Comenzar proyecto →</Link>
          </Button>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-card border-b px-4 pb-4 space-y-3 animate-fade-in">
          <Link to="/" className="block text-sm font-medium py-2" onClick={() => setOpen(false)}>
            Servicios
          </Link>
          <Link to="/admin" className="block text-sm font-medium py-2" onClick={() => setOpen(false)}>
            Admin
          </Link>
          <Button asChild size="sm" className="w-full">
            <Link to="/onboarding" onClick={() => setOpen(false)}>
              Comenzar proyecto →
            </Link>
          </Button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
