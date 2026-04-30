import { useParams } from "react-router-dom";
import { useState } from "react";
import { Globe } from "lucide-react";
import CalendarRenderer from "@/components/crm/CalendarRenderer";
import { useLangWidget } from "@/hooks/useLangWidget";
import type { WidgetLang } from "@/hooks/useLangWidget";
import { widgetTranslations } from "@/i18n/widgets";

const BookingPage = () => {
  const { calendarId } = useParams<{ calendarId: string }>();
  const detectedLang = useLangWidget();
  const [lang, setLang] = useState<WidgetLang>(detectedLang);
  const T = widgetTranslations[lang].calendar;

  if (!calendarId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-400">{T.notFound}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-start justify-center p-6 sm:p-10 sm:pt-16">
      <div className="w-full max-w-sm md:max-w-md">
        {/* Lang toggle */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setLang(l => l === "es" ? "en" : "es")}
            className="flex items-center gap-1.5 text-[10px] font-black border border-gray-200 rounded-full px-3 py-1.5 uppercase tracking-[0.15em] hover:bg-gray-50 transition-colors text-gray-400"
          >
            <Globe size={11} />
            <span className={lang === "es" ? "text-gray-800" : "text-gray-300"}>ES</span>
            <span className="opacity-30">/</span>
            <span className={lang === "en" ? "text-gray-800" : "text-gray-300"}>EN</span>
          </button>
        </div>
        <CalendarRenderer calendarId={calendarId} lang={lang} />
      </div>
    </div>
  );
};

export default BookingPage;
