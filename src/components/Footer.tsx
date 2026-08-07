import AcrosoftLogo from "./shared/AcrosoftLogo";

const Footer = () => (
  <footer className="py-12 border-t font-opensans" style={{ borderColor: "rgba(20,22,31,0.08)" }}>
    <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-6">
      <AcrosoftLogo size="sm" />

      <div className="flex flex-wrap justify-center items-center gap-x-5 gap-y-2">
        <a href="/privacy" className="text-xs font-medium transition-colors" style={{ color: "rgba(20,22,31,0.55)" }}>
          Política de Privacidad
        </a>
        <a href="/terms" className="text-xs font-medium transition-colors" style={{ color: "rgba(20,22,31,0.55)" }}>
          Términos de Uso
        </a>
        <a href="/login" className="text-xs font-medium transition-colors" style={{ color: "rgba(20,22,31,0.55)" }}>
          Iniciar sesión
        </a>
      </div>

      <p className="text-xs font-medium" style={{ color: "rgba(20,22,31,0.4)" }}>
        © 2026 Acros Software. Todos los derechos reservados.
      </p>
    </div>
  </footer>
);

export default Footer;
