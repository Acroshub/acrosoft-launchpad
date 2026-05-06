const Footer = () => (
  <footer className="py-6 border-t text-center space-y-2">
    <p className="text-sm text-muted-foreground">© 2025 Acrosoft Labs. Todos los derechos reservados.</p>
    <div className="flex justify-center gap-4">
      <a href="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
        Política de Privacidad
      </a>
      <span className="text-xs text-muted-foreground">·</span>
      <a href="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
        Términos de Uso
      </a>
    </div>
  </footer>
);

export default Footer;
