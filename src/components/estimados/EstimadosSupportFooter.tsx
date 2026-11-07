import type { ReactNode } from "react";
import { ESTIMADOS_SUPPORT_EMAIL, ESTIMADOS_SUPPORT_WHATSAPP, ESTIMADOS_SUPPORT_WHATSAPP_LABEL } from "@/lib/estimadosConfig";

// Pie oscuro de soporte (WhatsApp y correo) compartido por /estimados-ty y /estimados-gracias. Los estilos (.est-ty-foot…) están en estimadosTyStyles.ts.
// Va dentro de su propio `.est-page.est-ty` para tener las variables de color de la página aunque el calendario (que NO puede estar dentro de .est-page) vaya antes.

const SUPPORT_WA_TEXT = "Hola, compré el kit +50 Anuncios Virales para Tree Services y necesito ayuda.";
const SUPPORT_MAIL_SUBJECT = "Ayuda con mi kit +50 Anuncios Virales para Tree Services";

const MailIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3.5 7l8.5 6 8.5-6" /></svg>
);
/** WhatsApp: globo de chat con auricular. */
const ChatIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 20l1.3-4A8 8 0 1112 20a8 8 0 01-3.7-.9L4 20z" />
    <path d="M9 9.2c.2 2.2 2.6 4.6 4.8 4.8l1.2-1.1-1.7-1-.8.6a3.6 3.6 0 01-1.5-1.5l.6-.8-1-1.7L9 9.2z" />
  </svg>
);

export function EstimadosSupportFooter({ title = "¿Necesitas ayuda con tu kit?", badge }: { title?: ReactNode; badge?: string }) {
  return (
    <div className="est-page est-ty est-ty-footwrap">
      <footer className="est-ty-foot">
        <div className="est-wrap">
          <p className="est-ty-foot-title">{badge && <span className="est-end-num est-end-num--dark">{badge}</span>}{title}</p>
          <div className="est-ty-foot-links">
            <a
              className="est-ty-foot-link"
              href={`https://wa.me/${ESTIMADOS_SUPPORT_WHATSAPP}?text=${encodeURIComponent(SUPPORT_WA_TEXT)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ChatIcon />WhatsApp {ESTIMADOS_SUPPORT_WHATSAPP_LABEL}
            </a>
            <a className="est-ty-foot-link" href={`mailto:${ESTIMADOS_SUPPORT_EMAIL}?subject=${encodeURIComponent(SUPPORT_MAIL_SUBJECT)}`}>
              <MailIcon />{ESTIMADOS_SUPPORT_EMAIL}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
