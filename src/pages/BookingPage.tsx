import { useEffect, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import CalendarRenderer from "@/components/crm/CalendarRenderer";
import type { WidgetLang } from "@/hooks/useLangWidget";

/**
 * Avisos al sitio que embebe este calendario en un iframe (la landing de un cliente).
 * Sin PII: solo el tipo de evento y, en el resize, la altura. Si la página no está en un iframe, no hace nada.
 *  - acrosoft-booking-resize  { height }  → la landing ajusta la altura del iframe (sin scroll interno ni huecos en blanco)
 *  - acrosoft-booking-success {}          → la landing redirige a su página de gracias / dispara la conversión
 */
const notifyParent = (message: Record<string, unknown>) => {
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ source: "acrosoft-booking", ...message }, "*");
    }
  } catch {
    /* un padre que no acepte el mensaje no debe romper el calendario */
  }
};

const BookingPage = () => {
  const { calendarId } = useParams<{ calendarId: string }>();
  const [searchParams] = useSearchParams();
  const rawLang = searchParams.get("lang");
  const urlLang: WidgetLang | undefined = rawLang === "es" || rawLang === "en" ? rawLang : undefined;

  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  // Altura del contenido real (no la del iframe: el contenedor usa min-h-screen y nunca encogería).
  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner || window.parent === window) return;

    let last = 0;
    const report = () => {
      const cs = getComputedStyle(outer);
      const height = Math.ceil(
        inner.getBoundingClientRect().height + (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0),
      );
      if (height > 0 && height !== last) {
        last = height;
        notifyParent({ type: "acrosoft-booking-resize", calendarId, height });
      }
    };

    report();
    const ro = new ResizeObserver(report);
    ro.observe(inner);
    window.addEventListener("resize", report);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", report);
    };
  }, [calendarId]);

  if (!calendarId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-400">Calendario no encontrado.</p>
      </div>
    );
  }

  return (
    <div ref={outerRef} className="min-h-screen bg-white flex items-start justify-center p-6 sm:p-10 sm:pt-16">
      <div ref={innerRef} className="w-full max-w-sm md:max-w-md">
        <CalendarRenderer
          calendarId={calendarId}
          lang={urlLang}
          onBookingSuccess={() => notifyParent({ type: "acrosoft-booking-success", calendarId })}
        />
      </div>
    </div>
  );
};

export default BookingPage;
