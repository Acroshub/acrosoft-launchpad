import { Link } from "react-router-dom";
import AcrosoftLogo from "./shared/AcrosoftLogo";
import { Mail, Phone, Instagram, Facebook, Globe, Shield, Star, Rocket } from "lucide-react";

const Footer = () => (
  <footer className="bg-background border-t pt-20 pb-10">
    <div className="container mx-auto px-4 md:px-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
        <div className="col-span-1 md:col-span-1 space-y-6">
          <AcrosoftLogo size="sm" />
          <p className="text-sm text-muted-foreground leading-relaxed font-medium">
            Transformando negocios latinos en líderes del mercado bilingüe en Estados Unidos. 
            Calidad de agencia, precios de aliado.
          </p>
          <div className="flex gap-4">
            <a href="#" className="p-2 rounded-lg bg-secondary/50 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all">
              <Instagram size={20} />
            </a>
            <a href="#" className="p-2 rounded-lg bg-secondary/50 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all">
              <Facebook size={20} />
            </a>
            <a href="#" className="p-2 rounded-lg bg-secondary/50 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all">
              <Phone size={20} />
            </a>
          </div>
        </div>
        
        <div className="space-y-6">
          <h4 className="text-sm font-black uppercase tracking-widest text-foreground">Plataforma</h4>
          <ul className="space-y-3">
            <li><Link to="/" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Servicios</Link></li>
            <li><Link to="/#planes" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Planes & Precios</Link></li>
            <li><Link to="/#como-funciona" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Cómo funciona</Link></li>
            <li><Link to="/onboarding" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Iniciar Brief</Link></li>
          </ul>
        </div>
        
        <div className="space-y-6">
          <h4 className="text-sm font-black uppercase tracking-widest text-foreground">Compañía</h4>
          <ul className="space-y-3">
            <li><a href="#" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Sobre nosotros</a></li>
            <li><a href="#" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Historias de éxito</a></li>
            <li><a href="#" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Blog de negocios</a></li>
            <li><Link to="/admin" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Acceso Admin</Link></li>
          </ul>
        </div>
        
        <div className="space-y-6 bg-secondary/10 p-8 rounded-[32px] border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Rocket size={18} className="text-primary animate-pulse" />
            <span className="text-xs font-black uppercase tracking-widest">¿Quieres crecer?</span>
          </div>
          <h4 className="text-lg font-black leading-tight text-foreground">Hablemos sobre tu proyecto hoy.</h4>
          <p className="text-xs text-muted-foreground font-medium leading-relaxed">
            Nuestros consultores bilingües están listos para asesorarte sin compromiso.
          </p>
          <a 
            href="mailto:hola@acrosoft-labs.com" 
            className="flex items-center gap-2 text-sm font-bold text-primary hover:underline hover:scale-105 transition-all w-fit"
          >
            <Mail size={16} /> hola@acrosoft-labs.com
          </a>
        </div>
      </div>
      
      <div className="border-t border-border/40 pt-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
          <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest">
            © 2025 Acrosoft Labs Inc.
          </p>
          <div className="h-3 w-[1px] bg-border hidden md:block" />
          <div className="flex gap-4">
            <a href="#" className="text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest">Términos</a>
            <a href="#" className="text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest">Privacidad</a>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/30 border border-border/40 text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest leading-none">
            <Shield size={12} className="text-emerald-500" /> Secure SSL
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/30 border border-border/40 text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest leading-none">
            <Globe size={12} className="text-primary/70" /> USA & LatAm
          </div>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
