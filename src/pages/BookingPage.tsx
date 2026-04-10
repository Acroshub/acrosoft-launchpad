import { useParams } from "react-router-dom";
import CalendarRenderer from "@/components/crm/CalendarRenderer";

/**
 * Public standalone booking page.
 * Route: /book/:calendarId
 *
 * Intentionally minimal — no header, no branding, no navigation.
 * Works as a blank iframe target or as a direct link.
 * The business identity comes from the calendar config, not this shell.
 */
const BookingPage = () => {
  const { calendarId } = useParams<{ calendarId: string }>();

  if (!calendarId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-400">Calendario no encontrado.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-start justify-center p-6 sm:p-10 sm:pt-16">
      <div className="w-full max-w-sm">
        <CalendarRenderer calendarId={calendarId} />
      </div>
    </div>
  );
};

export default BookingPage;
