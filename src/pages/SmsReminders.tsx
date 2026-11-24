import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import AcrosoftLogo from "@/components/shared/AcrosoftLogo";
import { LEGAL, SMS_SIGNUP_CONSENT } from "@/lib/legal";

/**
 * /sms-reminders — formulario público de alta para recibir recordatorios de cita por SMS.
 *
 * Es la prueba de consentimiento (opt-in por web) que revisa Twilio para verificar el número toll-free:
 * campo de teléfono, checkbox SIN marcar de fábrica, qué mensajes se reciben, frecuencia, tarifas,
 * STOP/HELP, enlaces a Terms y Privacy y un botón claro. Todo el texto está a la vista, sin login.
 * El consentimiento se guarda (con el texto exacto) en sms_opt_ins vía la Edge Function sms-opt-in.
 */

/** Solo números de EE.UU.: 10 dígitos, sin 0/1 al inicio del código de área ni de la central (misma regla que el servidor). */
const US_PHONE = /^[2-9]\d{2}[2-9]\d{6}$/;

/** Deja solo los 10 dígitos nacionales (acepta el +1 / 1 inicial). */
export const nationalDigits = (value: string): string => {
  const d = value.replace(/\D/g, "");
  return (d.length > 10 && d.startsWith("1") ? d.slice(1) : d).slice(0, 10);
};

/** 7812683755 → (781) 268-3755, mientras se escribe. */
export const formatUsPhone = (value: string): string => {
  const d = nationalDigits(value);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};

type Status = "idle" | "submitting" | "done";

const SmsReminders = () => {
  const [phone, setPhone] = useState("");
  const [agreed, setAgreed] = useState(false); // NUNCA marcado de fábrica
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    const prev = document.title;
    document.title = `SMS Appointment Reminders · ${LEGAL.brand}`;
    return () => { document.title = prev; };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const national = nationalDigits(phone);
    if (!US_PHONE.test(national)) {
      setError("Please enter a valid 10-digit U.S. mobile phone number.");
      return;
    }
    if (!agreed) {
      setError("Please check the box to agree to receive text messages.");
      return;
    }
    setStatus("submitting");
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sms-opt-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
        body: JSON.stringify({ phone: `+1${national}`, consent: true, consent_text: SMS_SIGNUP_CONSENT, website: honeypot }),
      });
      if (res.status === 429) throw new Error("Too many attempts. Please try again later.");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error === "invalid_phone"
          ? "Please enter a valid 10-digit U.S. mobile phone number."
          : "We couldn't sign you up. Please try again.");
      }
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't sign you up. Please try again.");
      setStatus("idle");
    }
  };

  const link = "text-[#0F766E] underline underline-offset-2 hover:opacity-80";

  return (
    <div className="min-h-screen bg-white text-[#14161F] font-opensans">
      <main className="max-w-xl mx-auto px-6 py-12 sm:py-16 space-y-8">
        <header className="space-y-6">
          <AcrosoftLogo size="md" />
          <div className="space-y-3">
            <h1 className="text-3xl font-poppins font-bold tracking-tight">Appointment reminders by text message</h1>
            <p className="text-base text-[#14161F]/70 leading-relaxed">
              Sign up to receive text messages from {LEGAL.brand} that confirm your appointments and remind you
              before they happen. The messages come from our online booking service, which small local service
              businesses use to schedule customers.
            </p>
          </div>
        </header>

        <section aria-labelledby="what-you-get" className="space-y-3">
          <h2 id="what-you-get" className="text-sm font-semibold uppercase tracking-wide text-[#14161F]/55">What you will receive</h2>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-[#14161F]/75 leading-relaxed pl-1">
            <li>A confirmation when you book an appointment.</li>
            <li>Reminders before your appointment.</li>
            <li>Nothing else: no marketing or promotional messages.</li>
          </ul>
          <p className="text-sm text-[#14161F]/75 leading-relaxed border-l-2 border-[#0F766E] pl-4">
            Example: “GH Tree Services: Reminder - your appointment is tomorrow at 9:00 AM. Reply STOP to opt out,
            HELP for help. Msg&amp;data rates may apply. - {LEGAL.brand}”
          </p>
        </section>

        {status === "done" ? (
          <section role="status" data-testid="sms-signup-done" className="rounded-xl border border-[#0F766E]/30 bg-[#0F766E]/5 p-6 space-y-2">
            <h2 className="text-lg font-poppins font-bold">You're signed up</h2>
            <p className="text-sm text-[#14161F]/75 leading-relaxed">
              Thanks! You'll receive appointment confirmations and reminders from {LEGAL.brand} at{" "}
              <strong>{formatUsPhone(phone)}</strong>. Reply STOP to any message to unsubscribe, or HELP for help.
            </p>
          </section>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-5" aria-label="SMS sign-up form">
            <div className="space-y-1.5">
              <label htmlFor="sms-phone" className="text-sm font-semibold">Mobile phone number</label>
              <input
                id="sms-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder="(555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(formatUsPhone(e.target.value))}
                className="w-full h-12 px-4 rounded-xl border border-[#14161F]/20 bg-white text-base outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:border-[#0F766E] transition-all"
              />
            </div>

            {/* Trampa para bots: oculto a las personas y a los lectores de pantalla */}
            <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
              <label htmlFor="sms-website">Website</label>
              <input id="sms-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                id="sms-consent"
                name="consent"
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 w-5 h-5 flex-none cursor-pointer accent-[#0F766E]"
              />
              <span className="text-sm text-[#14161F]/80 leading-snug">{SMS_SIGNUP_CONSENT}</span>
            </label>

            {error && (
              <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={status === "submitting"}
              className="w-full h-12 rounded-xl text-sm font-bold text-white bg-[#0F766E] hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {status === "submitting" ? "Signing you up…" : "Yes, sign me up!"}
            </button>
          </form>
        )}

        <section aria-labelledby="sms-details" className="space-y-3">
          <h2 id="sms-details" className="text-sm font-semibold uppercase tracking-wide text-[#14161F]/55">Program details</h2>
          <ul className="list-disc list-inside space-y-1.5 text-xs text-[#14161F]/65 leading-relaxed pl-1">
            <li><strong>Program:</strong> {LEGAL.brand} Appointment Reminders.</li>
            <li><strong>Message frequency:</strong> varies depending on your appointments.</li>
            <li><strong>Message and data rates may apply.</strong> We do not charge you for the messages.</li>
            <li><strong>To unsubscribe:</strong> reply <strong>STOP</strong> to any message at any time.</li>
            <li><strong>For help:</strong> reply <strong>HELP</strong> to any message, or email <a href={`mailto:${LEGAL.supportEmail}`} className={link}>{LEGAL.supportEmail}</a>.</li>
            <li>Consent is optional and is not a condition of booking an appointment or of any purchase.</li>
            <li>Wireless carriers are not liable for delayed or undelivered messages.</li>
            <li>No mobile information will be shared with third parties/affiliates for marketing/promotional purposes. All the above categories exclude text messaging originator opt-in data and consent; this information will not be shared with any third parties.</li>
          </ul>
          <p className="text-xs text-[#14161F]/65">
            Read our <a href={LEGAL.termsPath} className={link}>Terms and Conditions</a> and{" "}
            <a href={LEGAL.privacyPath} className={link}>Privacy Policy</a>.
          </p>
        </section>

        <footer className="pt-6 border-t border-[#14161F]/10 text-xs text-[#14161F]/50 flex flex-wrap gap-x-4 gap-y-1">
          <span>© {new Date().getFullYear()} {LEGAL.brand}</span>
          <a href={LEGAL.privacyPath} className="underline underline-offset-2">Privacy Policy</a>
          <a href={LEGAL.termsPath} className="underline underline-offset-2">Terms and Conditions</a>
        </footer>
      </main>
    </div>
  );
};

export default SmsReminders;
