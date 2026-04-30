import { Link, useLocation } from "react-router-dom";
import { Menu, X, Globe } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import AcrosoftLogo from "./shared/AcrosoftLogo";
import { useLang } from "@/hooks/useLanguage";
import { translations } from "@/i18n/landing";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { lang, toggle } = useLang();
  const T = translations[lang].nav;

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
            {T.services}
          </Link>
          <a
            href="/#como-funciona"
            className="text-sm font-bold tracking-tight text-muted-foreground/80 hover:text-primary transition-all underline-offset-8 hover:underline"
          >
            {T.howItWorks}
          </a>
          <a
            href="/#planes"
            className="text-sm font-bold tracking-tight text-muted-foreground/80 hover:text-primary transition-all underline-offset-8 hover:underline"
          >
            {T.plans}
          </a>

          <div className="h-6 w-[1px] bg-border/60 mx-2" />

          <button
            onClick={toggle}
            className="flex items-center gap-2 text-[10px] font-black border border-border/40 rounded-full px-4 py-1.5 bg-secondary/30 uppercase tracking-[0.2em] shadow-inner hover:bg-secondary/60 transition-colors cursor-pointer"
            aria-label="Toggle language"
          >
            <Globe size={12} className="text-primary/70" />
            <span className={lang === "es" ? "text-foreground" : "text-muted-foreground/40"}>ES</span>
            <span className="opacity-20">/</span>
            <span className={lang === "en" ? "text-foreground" : "text-muted-foreground/40"}>EN</span>
          </button>

          <Button asChild className="rounded-2xl font-black h-11 px-6 shadow-lg shadow-primary/20 hover:scale-105 transition-all">
            <a href="/#agendar">{T.cta}</a>
          </Button>
        </div>

        {/* Mobile toggle */}
        <div className="lg:hidden flex items-center gap-3">
          <button
            onClick={toggle}
            className="flex items-center gap-1.5 text-[10px] font-black border border-border/40 rounded-full px-3 py-1.5 bg-secondary/30 uppercase tracking-[0.15em] hover:bg-secondary/60 transition-colors"
            aria-label="Toggle language"
          >
            <Globe size={11} className="text-primary/70" />
            <span className={lang === "es" ? "text-foreground" : "text-muted-foreground/40"}>ES</span>
            <span className="opacity-20">/</span>
            <span className={lang === "en" ? "text-foreground" : "text-muted-foreground/40"}>EN</span>
          </button>
          <button
            className="p-2 rounded-xl bg-secondary/50 text-foreground hover:bg-secondary transition-all"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden bg-background/95 backdrop-blur-2xl border-b px-6 pt-4 pb-10 space-y-6 animate-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col gap-4">
            <Link to="/" className="text-lg font-bold py-2 border-b border-border/40" onClick={() => setOpen(false)}>
              {T.services}
            </Link>
            <a href="/#como-funciona" className="text-lg font-bold py-2 border-b border-border/40" onClick={() => setOpen(false)}>
              {T.howItWorks}
            </a>
            <a href="/#planes" className="text-lg font-bold py-2 border-b border-border/40" onClick={() => setOpen(false)}>
              {T.plans}
            </a>
          </div>
          <Button asChild className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20">
            <a href="/#agendar" onClick={() => setOpen(false)}>
              {T.cta} →
            </a>
          </Button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
