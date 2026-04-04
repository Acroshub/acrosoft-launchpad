import { Link } from "react-router-dom";
import { Instagram, Facebook } from "lucide-react";
import AcrosoftLogo from "./AcrosoftLogo";

const Footer = () => (
  <footer className="border-t bg-card">
    <div className="container mx-auto px-4 py-12">
      <div className="grid md:grid-cols-3 gap-8">
        <div>
          <AcrosoftLogo size="sm" />
          <p className="text-sm text-muted-foreground mt-3">
            Tu negocio en internet, sin complicaciones.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-sm mb-3">Enlaces</h4>
          <div className="flex flex-col gap-2">
            <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">Servicios</Link>
            <Link to="/onboarding" className="text-sm text-muted-foreground hover:text-primary transition-colors">Onboarding</Link>
            <Link to="/admin" className="text-sm text-muted-foreground hover:text-primary transition-colors">Admin</Link>
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-sm mb-3">Redes sociales</h4>
          <div className="flex gap-3">
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors"><Instagram size={20} /></a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors"><Facebook size={20} /></a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
              </svg>
            </a>
          </div>
        </div>
      </div>
      <div className="border-t mt-8 pt-6 text-center text-xs text-muted-foreground">
        © 2025 Acrosoft Labs. Todos los derechos reservados.
      </div>
    </div>
  </footer>
);

export default Footer;
