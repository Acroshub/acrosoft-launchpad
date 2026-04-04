import { Link, useLocation } from "react-router-dom";
import { Menu, X, Globe } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import AcrosoftLogo from "./shared/AcrosoftLogo";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border/40">
      <div className="container mx-auto flex items-center justify-between h-20 px-4 md:px-8">
        <Link to="/" className="hover:scale-105 transition-transform">
          <AcrosoftLogo size="sm" />
        </Link>

        {/* Desktop Menu */}
        <div className="hidden lg:flex items-center gap-8">
          <Link
            to="/"
            className={`text-sm font-bold tracking-tight transition-all hover:text-primary ${isActive("/") ? "text-primary" : "text-muted-foreground/80"}`}
          >
            Servicios
          </Link>
          <a
            href="/#como-funciona"
            className="text-sm font-bold tracking-tight text-muted-foreground/80 hover:text-primary transition-all underline-offset-8 hover:underline"
          >
            Cómo funciona
          </a>
          <a
            href="/#planes"
            className="text-sm font-bold tracking-tight text-muted-foreground/80 hover:text-primary transition-all underline-offset-8 hover:underline"
          >
            Planes
          </a>
          
          <div className="h-6 w-[1px] bg-border/60 mx-2" />
          
          <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground border border-border/40 rounded-full px-4 py-1.5 bg-secondary/30 uppercase tracking-[0.2em] shadow-inner">
            <Globe size={12} className="text-primary/70" /> ES <span className="opacity-20">/</span> EN
          </div>
          
          <Button asChild className="rounded-2xl font-black h-11 px-6 shadow-lg shadow-primary/20 hover:scale-105 transition-all">
            <a href="/#agendar">Agendar Llamada</a>
          </Button>
        </div>

        {/* Mobile toggle */}
        <button 
          className="lg:hidden p-2 rounded-xl bg-secondary/50 text-foreground hover:bg-secondary transition-all" 
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden bg-background/95 backdrop-blur-2xl border-b px-6 pt-4 pb-10 space-y-6 animate-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col gap-4">
            <Link to="/" className="text-lg font-bold py-2 border-b border-border/40" onClick={() => setOpen(false)}>
              Servicios
            </Link>
            <a href="/#como-funciona" className="text-lg font-bold py-2 border-b border-border/40" onClick={() => setOpen(false)}>
              Cómo funciona
            </a>
            <a href="/#planes" className="text-lg font-bold py-2 border-b border-border/40" onClick={() => setOpen(false)}>
              Planes
            </a>
          </div>
          
<Button asChild className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20">
            <a href="/#agendar" onClick={() => setOpen(false)}>
              Agendar Llamada →
            </a>
          </Button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
