import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Calendar {
  id: string;
  summary: string;
  primary: boolean;
}

const GoogleCalendarCallback = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "select" | "saving" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>("");
  const [calendarId, setCalendarId] = useState("");

  useEffect(() => {
    const code       = searchParams.get("code");
    const calId      = searchParams.get("state");
    const error      = searchParams.get("error");

    if (error || !code || !calId) {
      setErrorMsg(error === "access_denied" ? "Acceso denegado por el usuario." : "Parámetros inválidos.");
      setStatus("error");
      return;
    }

    setCalendarId(calId);

    supabase.functions.invoke("google-calendar-oauth", {
      body: {
        code,
        calendar_id:  calId,
        redirect_uri: `${window.location.origin}/oauth/google-calendar`,
      },
    }).then(({ data, error: fnError }) => {
      if (fnError) {
        setErrorMsg("Error al conectar con Google Calendar. Intenta de nuevo.");
        setStatus("error");
      } else {
        const cals = data?.calendars ?? [];
        setCalendars(cals);
        // Preseleccionar calendar primario
        const primary = cals.find((c: Calendar) => c.primary);
        if (primary) setSelectedCalendarId(primary.id);
        else if (cals.length > 0) setSelectedCalendarId(cals[0].id);
        setStatus("select");
      }
    });
  }, []);

  const handleSelectCalendar = async () => {
    if (!selectedCalendarId) {
      setErrorMsg("Debes seleccionar un calendario.");
      return;
    }

    setStatus("saving");

    const { error } = await supabase
      .from("crm_calendar_config")
      .update({ google_calendar_id: selectedCalendarId })
      .eq("id", calendarId);

    if (error) {
      setErrorMsg("Error al guardar selección. Intenta de nuevo.");
      setStatus("error");
    } else {
      setStatus("success");
      setTimeout(() => window.close(), 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 max-w-md px-6">
        {status === "loading" && (
          <>
            <Loader2 className="mx-auto animate-spin text-primary" size={40} />
            <p className="text-sm text-muted-foreground">Conectando Google Calendar…</p>
          </>
        )}

        {status === "select" && (
          <>
            <h3 className="text-base font-semibold">Elige un calendario</h3>
            <p className="text-xs text-muted-foreground">Selecciona dónde quieres sincronizar tus citas:</p>
            <div className="space-y-2 mt-4 max-h-64 overflow-y-auto">
              {calendars.map((cal) => (
                <label
                  key={cal.id}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedCalendarId === cal.id
                      ? "bg-primary/10 border-primary"
                      : "bg-secondary/20 border-border hover:border-primary/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="calendar"
                    value={cal.id}
                    checked={selectedCalendarId === cal.id}
                    onChange={(e) => setSelectedCalendarId(e.target.value)}
                    className="cursor-pointer"
                  />
                  <div className="text-left flex-1">
                    <p className="text-sm font-medium">{cal.summary}</p>
                    {cal.primary && <p className="text-xs text-muted-foreground">Principal</p>}
                  </div>
                </label>
              ))}
            </div>
            <Button
              onClick={handleSelectCalendar}
              className="w-full mt-4"
              disabled={!selectedCalendarId}
            >
              Confirmar
            </Button>
          </>
        )}

        {status === "saving" && (
          <>
            <Loader2 className="mx-auto animate-spin text-primary" size={40} />
            <p className="text-sm text-muted-foreground">Guardando selección…</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="mx-auto text-green-500" size={40} />
            <p className="text-sm font-medium">¡Google Calendar conectado exitosamente!</p>
            <p className="text-xs text-muted-foreground">Esta ventana se cerrará automáticamente.</p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="mx-auto text-destructive" size={40} />
            <p className="text-sm font-medium text-destructive">{errorMsg}</p>
            <button
              onClick={() => window.close()}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Cerrar ventana
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default GoogleCalendarCallback;
