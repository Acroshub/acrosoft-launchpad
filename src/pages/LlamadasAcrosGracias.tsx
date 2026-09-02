import { useLocation } from "react-router-dom";
import { CalendarClock, CalendarCheck, ArrowDown, Play, MapPin, Building2, Info } from "lucide-react";
import WhatsAppIcon from "@/components/shared/WhatsAppIcon";

// ─── Palette — misma identidad de Acros Software (máx. 3 colores) ────────────
// Ink #14161F · Paper #FFFFFF · Accent guindo #8C1414

const WA_NUMBER = "59157697071";
const WA_MSG = "Quiero confirmar mi llamada gratuita. \nMi negocio se llama: \nTrabajo en estas zonas: ";
const waLink = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_MSG)}`;

const CUENTAME = [
  { icon: Building2, text: "Cómo se llama tu negocio de control de plagas." },
  { icon: MapPin, text: "En qué zonas de Florida opera tu negocio." },
  { icon: Info, text: "Algún otro dato extra que quieras contarme." },
];

interface BookingState {
  date: string;
  hour: number;
  minute: number;
  calendarTz: string;
  visitorTz: string;
  calendarName: string;
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** Converts a wall-clock time in a given IANA timezone to absolute UTC ms (2-iteration convergence for DST). */
const wallClockToUtcMs = (year: number, month: number, day: number, hour: number, minute: number, tz: string): number => {
  const fmt = new Intl.DateTimeFormat("en", {
    timeZone: tz, year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", hour12: false,
  });
  let utcMs = Date.UTC(year, month - 1, day, hour, minute);
  for (let i = 0; i < 2; i++) {
    const parts = fmt.formatToParts(new Date(utcMs));
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
    const h = get("hour") % 24;
    const displayedMs = Date.UTC(get("year"), get("month") - 1, get("day"), h, get("minute"));
    utcMs += Date.UTC(year, month - 1, day, hour, minute) - displayedMs;
  }
  return utcMs;
};

/** Formats a booked wall-clock slot (in calendarTz) as "DD de MES a las HH:MM AM/PM" in the visitor's timezone. */
const formatBooking = (b: BookingState): string => {
  const [y, m, d] = b.date.split("-").map(Number);
  const utcMs = wallClockToUtcMs(y, m, d, b.hour, b.minute, b.calendarTz);
  const dateParts = new Intl.DateTimeFormat("en-CA", { timeZone: b.visitorTz, year: "numeric", month: "numeric", day: "numeric" }).formatToParts(new Date(utcMs));
  const get = (t: string) => Number(dateParts.find((p) => p.type === t)?.value ?? 0);
  const timeParts = new Intl.DateTimeFormat("en", { timeZone: b.visitorTz, hour: "numeric", minute: "2-digit", hour12: true }).formatToParts(new Date(utcMs));
  const time = timeParts.map((p) => p.value).join("").replace(/\s?(AM|PM)/, " $1").trim();
  return `${get("day")} de ${MESES[get("month") - 1]} a las ${time}`;
};

const LlamadasAcrosGracias = () => {
  const location = useLocation();
  const booking = location.state as BookingState | null;

  return (
    <div className="min-h-screen font-opensans bg-white text-[#14161F]">
      <style>{`
        @keyframes progressFill {
          from { width: 0%; }
          to   { width: 90%; }
        }
        @keyframes progressStripes {
          from { background-position: 0 0; }
          to   { background-position: 28px 0; }
        }
        .progress-fill {
          background-color: #8C1414;
          background-image: linear-gradient(
            135deg,
            rgba(255,255,255,0.28) 25%, transparent 25%,
            transparent 50%, rgba(255,255,255,0.28) 50%,
            rgba(255,255,255,0.28) 75%, transparent 75%, transparent
          );
          background-size: 28px 28px;
          animation: progressFill 1.2s ease-out forwards, progressStripes 1s linear infinite;
        }
      `}</style>

      {/* ═══════════════════════════════════════════════════════════
          ÚLTIMO PASO — cuéntame por WhatsApp
      ═══════════════════════════════════════════════════════════ */}
      <section className="pt-6 pb-16 md:pt-8 md:pb-20">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="rounded-2xl border border-[#14161F]/10 p-7 md:p-8">
            <p className="flex items-center justify-center gap-2 font-poppins font-bold text-base mb-4">
              <CalendarClock size={18} className="shrink-0 text-[#8C1414]" />
              Último paso: Ya casi completas todo...
            </p>

            <div className="h-2 rounded-full bg-[#14161F]/10 overflow-hidden mb-5">
              <div className="progress-fill h-full rounded-full" style={{ width: "90%" }} />
            </div>

            <div className="relative w-full aspect-video rounded-2xl border border-[#14161F]/12 bg-[#14161F]/[0.03] flex flex-col items-center justify-center gap-3 overflow-hidden mb-5">
              <div className="w-16 h-16 rounded-full bg-[#8C1414] flex items-center justify-center">
                <Play size={26} className="text-white ml-1" fill="white" />
              </div>
              <p className="text-sm font-semibold text-[#14161F]/50">Video: qué esperar en tu llamada</p>
            </div>

            <p className="flex items-center justify-center gap-2 font-poppins font-bold text-sm mb-4">
              <CalendarCheck size={16} className="shrink-0 text-[#8C1414]" />
              Termina de confirmar tu llamada
              <ArrowDown size={16} className="shrink-0 text-[#8C1414]" />
            </p>

            <p className="text-sm text-[#14161F]/70 leading-relaxed mb-5">
              Para poder ayudarte mejor y tener una comunicación más fluida, escríbeme por WhatsApp y cuéntame:
            </p>

            <ul className="space-y-4 mb-6">
              {CUENTAME.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3.5">
                  <Icon size={17} className="shrink-0 mt-0.5 text-[#8C1414]" />
                  <span className="text-sm text-[#14161F]/75 leading-relaxed">{text}</span>
                </li>
              ))}
            </ul>

            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 h-12 px-7 rounded-xl font-bold font-opensans text-sm text-white hover:opacity-90 transition-opacity bg-[#8C1414]"
            >
              <WhatsAppIcon size={16} /> Escríbeme por WhatsApp
            </a>
            {booking && (
              <p className="text-[11px] text-[#14161F]/45 text-center leading-relaxed mt-3">
                Agendaste para el {formatBooking(booking)}. Si deseas cancelar o reagendar puedes hacerlo
                escribiendo a mi WhatsApp.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default LlamadasAcrosGracias;
