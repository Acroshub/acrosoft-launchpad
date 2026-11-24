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
  /** Página pública con el formulario de alta de SMS (la que se le muestra a Twilio como prueba de consentimiento). */
  smsSignupPath: "/sms-reminders",
} as const;

/** Texto EXACTO del consentimiento en /sms-reminders. Se muestra junto al checkbox y se guarda tal cual como prueba. */
export const SMS_SIGNUP_CONSENT =
  `I agree to receive appointment confirmation and reminder text messages (SMS) from ${LEGAL.brand} about appointments I book with businesses that use its online booking service.`;
