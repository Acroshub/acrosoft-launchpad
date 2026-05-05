import { useParams, useSearchParams } from "react-router-dom";
import CalendarRenderer from "@/components/crm/CalendarRenderer";
import type { WidgetLang } from "@/hooks/useLangWidget";

const BookingPage = () => {
  const { calendarId } = useParams<{ calendarId: string }>();
  const [searchParams] = useSearchParams();
  const rawLang = searchParams.get("lang");
  const urlLang: WidgetLang | undefined = rawLang === "es" || rawLang === "en" ? rawLang : undefined;

  if (!calendarId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-400">Calendario no encontrado.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-start justify-center p-6 sm:p-10 sm:pt-16">
      <div className="w-full max-w-sm md:max-w-md">
        <CalendarRenderer calendarId={calendarId} lang={urlLang} />
      </div>
    </div>
  );
};

export default BookingPage;
