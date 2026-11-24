/**
 * Datos legales que aparecen en las páginas públicas (Privacy Policy, Terms & Conditions) y en el
 * consentimiento de SMS. Están aquí, en un solo lugar, porque tienen que coincidir EXACTO con lo que
 * se declare en la verificación de Twilio (nombre legal, correo de contacto, URLs).
 */
export const LEGAL = {
  /** Nombre con el que se identifica el remitente de los SMS. Debe coincidir con la verificación de Twilio. */
  brand: "Acros Software",
  /** Correo de contacto/soporte que ve el público (HELP, solicitudes de datos). */
  supportEmail: "soporte@acrossoftware.com",
  /** Fecha de la última actualización de ambas páginas. */
  updated: "November 23, 2026",
  privacyPath: "/privacy-policy",
  termsPath: "/terms-and-conditions",
} as const;
