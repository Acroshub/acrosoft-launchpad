import { useState, useEffect } from "react";
import { useStaffPermissions } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Code, Copy, Check, Globe, Clock, Calendar, ArrowLeft, Link2, Loader2, Trash2, CheckCircle2, Unlink } from "lucide-react";
import { useCreateCalendarConfig, useUpdateCalendarConfig, useDeleteCalendarConfig, useForms, useCreateForm, useBusinessProfile } from "@/hooks/useCrmData";
import type { CrmCalendarConfig as CalendarData } from "@/lib/supabase";
import { toast } from "sonner";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";
import WeeklySchedulePicker, { WeeklySchedule, DEFAULT_WEEKLY_SCHEDULE } from "@/components/shared/WeeklySchedulePicker";
import ReminderRulesEditor, { ReminderRule } from "@/components/shared/ReminderRulesEditor";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const KEY_MAP: Record<string, string> = {
  mon: "Lun", tue: "Mar", wed: "Mié", thu: "Jue", fri: "Vie", sat: "Sáb", sun: "Dom",
};

const numToAmPm = (h: number): string => {
  if (h === 0) return "12:00 AM";
  if (h < 12) return `${h}:00 AM`;
  if (h === 12) return "12:00 PM";
  return `${h - 12}:00 PM`;
};

const normalizeAvail = (raw: any): WeeklySchedule => {
  if (!raw || typeof raw !== "object") return DEFAULT_WEEKLY_SCHEDULE;
  if ("Lun" in raw) return raw as WeeklySchedule;
  const result: WeeklySchedule = { ...DEFAULT_WEEKLY_SCHEDULE };
  for (const [k, v] of Object.entries(raw as Record<string, any>)) {
    const day = KEY_MAP[k];
    if (!day) continue;
    if (v?.slots) {
      result[day] = {
        open: v.active ?? false,
        slots: (v.slots as { start: number; end: number }[]).map((s) => ({
          from: numToAmPm(s.start ?? 9),
          to: numToAmPm(s.end ?? 18),
        })),
      };
    } else if (v?.start != null) {
      result[day] = {
        open: v.active ?? false,
        slots: [{ from: numToAmPm(v.start), to: numToAmPm(v.end) }],
      };
    }
  }
  return result;
};

const BASIC_FORM_NAME = "Formulario Básico de Calendario";

// ─── Field helper ─────────────────────────────────────────────────────────────

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-medium text-muted-foreground">{label}</label>
    {children}
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  onBack: () => void;
  /** null = creating new calendar; CalendarData = editing existing */
  existingCalendar: CalendarData | null;
  /** Called with the id of the newly created calendar (only on create, not edit) */
  onCreated?: (id: string) => void;
  /** Called when Google Calendar connection is updated */
  onGoogleConnected?: () => void;
}

const CrmCalendarConfig = ({ onBack, existingCalendar, onCreated, onGoogleConnected }: Props) => {
  const { can } = useStaffPermissions();
  const canEditReminders = can("recordatorios", "create");
  const { data: forms = [] } = useForms();
  const { data: businessProfile } = useBusinessProfile();
  const createConfig = useCreateCalendarConfig();
  const updateConfig = useUpdateCalendarConfig();
  const deleteConfig = useDeleteCalendarConfig();
  const createForm   = useCreateForm();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isNew = existingCalendar === null;

  const [name, setName]                   = useState("");
  const [description, setDescription]     = useState("");
  const [duration, setDuration]           = useState<15 | 30 | 60>(30);
  const [bufferTime, setBufferTime]       = useState(0);
  const [linkedFormId, setLinkedFormId]   = useState<string | null>(null);
  const [availability, setAvailability]   = useState<WeeklySchedule>(DEFAULT_WEEKLY_SCHEDULE);
  const [reminderRules, setReminderRules] = useState<ReminderRule[]>([]);
  const [timezone, setTimezone]               = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  // For new calendars, inherit business profile timezone once it loads
  useEffect(() => {
    if (isNew && businessProfile?.timezone) setTimezone(businessProfile.timezone);
  }, [isNew, businessProfile?.timezone]);
  const [minAdvanceHours, setMinAdvanceHours] = useState(1);
  const [maxFutureDays, setMaxFutureDays]     = useState(60);
  const [isEditingHours, setIsEditingHours] = useState(false);
  const [embedTab, setEmbedTab]           = useState<"iframe" | "js">("iframe");
  const [copied, setCopied]               = useState(false);
  const [saving, setSaving]               = useState(false);

  // Populate form when editing an existing calendar
  useEffect(() => {
    if (existingCalendar) {
      setName(existingCalendar.name ?? "");
      setDescription(existingCalendar.description ?? "");
      {
        const raw = existingCalendar.duration_min ?? 30;
        setDuration(raw === 15 || raw === 60 ? raw : 30);
      }
      setBufferTime(existingCalendar.buffer_min ?? 10);
      setLinkedFormId(existingCalendar.linked_form_id ?? null);
      setAvailability(normalizeAvail(existingCalendar.availability));
      setReminderRules((existingCalendar.reminder_rules as unknown as ReminderRule[] | null) ?? []);
      setTimezone(existingCalendar.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
      setMinAdvanceHours(existingCalendar.min_advance_hours ?? 1);
      setMaxFutureDays(existingCalendar.max_future_days ?? 60);
    }
  }, [existingCalendar]);

  const calendarUid = existingCalendar?.id ?? "";
  const makeIframe = (lang: "es" | "en") => calendarUid
    ? `<iframe\n  src="${window.location.origin}/book/${calendarUid}?lang=${lang}"\n  width="100%"\n  height="700"\n  frameborder="0"\n  style="border:none;border-radius:12px;"\n></iframe>`
    : "";
  const makeJs = (lang: "es" | "en") => calendarUid
    ? `<div id="acrosoft-cal-${calendarUid}-${lang}"></div>\n<script>\n  (function(){\n    var i=document.createElement('iframe');\n    i.src='${window.location.origin}/book/${calendarUid}?lang=${lang}';\n    i.width='100%';i.height='700';i.frameBorder='0';\n    i.style.borderRadius='12px';\n    document.getElementById('acrosoft-cal-${calendarUid}-${lang}').appendChild(i);\n  })();\n</script>`
    : "";
  const iframeCodeEs = makeIframe("es");
  const iframeCodeEn = makeIframe("en");
  const jsCodeEs = makeJs("es");
  const jsCodeEn = makeJs("en");
  const activeCodeEs = embedTab === "iframe" ? iframeCodeEs : jsCodeEs;
  const activeCodeEn = embedTab === "iframe" ? iframeCodeEn : jsCodeEn;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeCodeEs + "\n\n" + activeCodeEn);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resolveFormId = async (): Promise<string | null> => {
    if (linkedFormId) return linkedFormId;
    // Reusar el formulario básico existente (por flag, no por nombre)
    const existing = forms.find((f) => f.is_basic_form);
    if (existing) {
      setLinkedFormId(existing.id);
      toast.info("Se vinculó el formulario básico existente al calendario");
      return existing.id;
    }
    const basicForm = await createForm.mutateAsync({
      name: BASIC_FORM_NAME,
      fields: [
        { id: "field_name",  type: "text",  label: "Nombre",             required: true },
        { id: "field_email", type: "email", label: "Correo electrónico", required: true },
      ],
      submit_label: "Confirmar reserva",
      success_action: "popup",
      success_message: "¡Tu cita ha sido agendada!",
      success_image: "icon",
      redirect_url: null,
      slug: null,
      is_basic_form: true,
    });
    setLinkedFormId(basicForm.id);
    toast.info("Se creó un formulario básico vinculado al calendario");
    return basicForm.id;
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("El nombre del calendario es obligatorio");
      return;
    }
    setSaving(true);
    try {
      const formId = await resolveFormId();
      const payload = {
        name: name.trim(),
        description: description || null,
        duration_min: duration,
        buffer_min: bufferTime,
        timezone,
        min_advance_hours: minAdvanceHours,
        max_future_days: maxFutureDays,
        linked_form_id: formId,
        availability,
        schedule_interval: duration,
        reminder_rules: reminderRules as unknown as any,
      };

      if (isNew) {
        const created = await createConfig.mutateAsync(payload);
        onCreated?.(created.id);
      } else {
        await updateConfig.mutateAsync({ id: existingCalendar!.id, ...payload });
      }
      toast.success(isNew ? "Calendario creado" : "Configuración guardada");
      if (isNew) onBack(); // return to calendar view after creating
    } catch {
      toast.error("Error al guardar configuración");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHours = async () => {
    await handleSave();
    setIsEditingHours(false);
  };

  const handleConfirmDelete = async () => {
    if (!existingCalendar) return;
    try {
      await deleteConfig.mutateAsync(existingCalendar.id);
      toast.success("Calendario eliminado");
      onBack();
    } catch {
      toast.error("Error al eliminar el calendario");
    } finally {
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
    <DeleteConfirmDialog
      open={showDeleteDialog}
      onOpenChange={setShowDeleteDialog}
      onConfirm={handleConfirmDelete}
      isPending={deleteConfig.isPending}
      description="Se eliminará este calendario permanentemente. Las citas existentes no se verán afectadas."
    />
    <div className="space-y-8">
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft size={12} />
          Volver al calendario
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">
              {isNew ? "Nuevo Calendario" : "Configuración del Calendario"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isNew ? "Completa los datos para comenzar a recibir citas" : "Personaliza cómo los clientes agendan contigo"}
            </p>
          </div>
          {!isNew && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5 h-8 shrink-0"
            >
              <Trash2 size={13} /> Eliminar calendario
            </Button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Configuración general */}
        <div className="bg-card border rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={15} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold">Información general</h2>
          </div>

          <Field label="Nombre del calendario *">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`h-10 text-sm ${!name.trim() ? "border-destructive/50 focus-visible:ring-destructive/30" : ""}`}
              placeholder="Ej: Consultas Iniciales"
            />
          </Field>

          <Field label="Descripción breve">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-10 text-sm"
              placeholder="Ej: Consulta inicial sin costo"
            />
          </Field>

          <Field label="Formulario vinculado">
            <select
              value={linkedFormId ?? ""}
              onChange={(e) => setLinkedFormId(e.target.value || null)}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
            >
              <option value="">Sin formulario (se creará uno básico)</option>
              {forms.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </Field>


          <Field label="Zona horaria del negocio">
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
            >
              {((Intl as any).supportedValuesOf?.("timeZone") ?? ["America/La_Paz"]).map((tz: string) => (
                <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground mt-1">
              Los horarios del calendario se interpretan en esta zona horaria.
            </p>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Duración de cada cita">
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value) as 15 | 30 | 60)}
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={60}>60 min</option>
              </select>
              <p className="text-[10px] text-muted-foreground mt-1">
                Cada cita dura este tiempo y la grilla arranca un slot cada este intervalo.
              </p>
            </Field>
            <Field label="Tiempo entre citas (min)">
              <Input
                type="number"
                min={0}
                value={bufferTime}
                onChange={(e) => setBufferTime(Number(e.target.value))}
                className="h-10 text-sm"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Margen adicional entre citas consecutivas.
              </p>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Anticipación mínima (hs)">
              <Input
                type="number"
                min={0}
                value={minAdvanceHours}
                onChange={(e) => setMinAdvanceHours(Number(e.target.value))}
                className="h-10 text-sm"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Horas mínimas antes de una cita para poder reservarla.
              </p>
            </Field>
            <Field label="Disponibilidad futura (días)">
              <Input
                type="number"
                min={1}
                value={maxFutureDays}
                onChange={(e) => setMaxFutureDays(Number(e.target.value))}
                className="h-10 text-sm"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Cuántos días hacia adelante se pueden ver en el calendario.
              </p>
            </Field>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-xl h-10 font-medium text-sm mt-2"
          >
            {saving ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
            {isNew ? "Crear Calendario" : "Guardar cambios"}
          </Button>
        </div>

        {/* Disponibilidad */}
        <div className="bg-card border rounded-2xl p-6 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-muted-foreground" />
              <h2 className="text-sm font-semibold">Disponibilidad</h2>
            </div>
            {!isNew && (
              isEditingHours ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingHours(false)}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancelar
                  </button>
                  <Button
                    size="sm"
                    className="h-7 text-xs px-3 gap-1.5"
                    onClick={handleSaveHours}
                    disabled={saving}
                  >
                    {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                    Guardar horarios
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs px-3"
                  onClick={() => setIsEditingHours(true)}
                >
                  Editar horarios
                </Button>
              )
            )}
          </div>

          <WeeklySchedulePicker
            value={availability}
            onChange={setAvailability}
            isEditing={isNew ? true : isEditingHours}
            interval={duration}
          />

          <p className="text-[11px] text-muted-foreground italic pt-1">
            La disponibilidad determina qué horarios están abiertos a reservas públicas.
          </p>
        </div>
      </div>

      {/* Integraciones — only shown when editing */}
      {!isNew && (
        <>
        <div className="bg-card border rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Link2 size={15} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold">Integraciones Externas</h2>
          </div>
          <div className="grid gap-4">
            {(() => {
              const isConnected = !!(existingCalendar?.google_token);
              const googleCalendarId = existingCalendar?.google_calendar_id as string | undefined;
              const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

              const handleConnect = () => {
                if (!calendarUid || !clientId) {
                  toast.error("Configura VITE_GOOGLE_CLIENT_ID en las variables de entorno.");
                  return;
                }
                const redirectUri = `${window.location.origin}/oauth/google-calendar`;
                const scope = "https://www.googleapis.com/auth/calendar";
                const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${encodeURIComponent(calendarUid)}`;
                const popup = window.open(url, "google-oauth", "width=500,height=750,scrollbars=yes");
                const timer = setInterval(() => {
                  if (popup?.closed) {
                    clearInterval(timer);
                    onGoogleConnected?.();
                  }
                }, 800);
              };

              const handleDisconnect = async () => {
                const { error } = await (await import("@/lib/supabase")).supabase
                  .from("crm_calendar_config")
                  .update({ google_token: null, google_calendar_id: null })
                  .eq("id", calendarUid);
                if (error) { toast.error("Error al desconectar"); return; }
                toast.success("Google Calendar desconectado");
                onGoogleConnected?.();
              };

              return (
                <div className={`p-5 rounded-2xl border transition-all ${isConnected ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800" : "bg-secondary/10"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 rounded-xl bg-white border flex items-center justify-center p-2 shadow-sm shrink-0">
                        <img
                          src="https://www.gstatic.com/images/branding/product/1x/calendar_2020q4_48dp.png"
                          alt="Google Calendar"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-foreground">Google Calendar</p>
                          {isConnected && (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-green-600 bg-green-100 dark:bg-green-900/40 px-2 py-0.5 rounded-full">
                              <CheckCircle2 size={10} /> Conectado
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {isConnected
                            ? googleCalendarId
                              ? `Sincronizando a: ${googleCalendarId}`
                              : "Conectado pero no hay calendario seleccionado. Reconecta para elegir uno."
                            : "Sincroniza tus citas y evita duplicidad automáticamente en tiempo real."}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {isConnected ? (
                        <>
                          <Button
                            onClick={handleConnect}
                            variant="outline"
                            size="sm"
                            className="text-xs"
                          >
                            Cambiar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDisconnect}
                            className="text-xs text-muted-foreground gap-1.5"
                          >
                            <Unlink size={13} /> Desconectar
                          </Button>
                        </>
                      ) : (
                        <Button
                          onClick={handleConnect}
                          className="h-10 px-6 rounded-lg text-sm font-bold bg-primary hover:bg-primary/90 text-white shadow-md"
                        >
                          Conectar cuenta
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* URL Pública */}
        <div className="bg-card border rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Globe size={15} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold">URL pública del calendario</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Comparte el enlace del idioma que necesites. Ambos apuntan al mismo calendario.
          </p>
          {(["es", "en"] as const).map((lang) => {
            const url = calendarUid ? `${window.location.origin}/book/${calendarUid}?lang=${lang}` : "";
            return (
              <div key={lang} className="space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {lang === "es" ? "🇪🇸 Español" : "🇺🇸 English"}
                </p>
                <div className="flex items-center gap-2 bg-secondary/40 border rounded-xl px-4 py-3">
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-primary hover:underline truncate flex-1"
                  >
                    {url}
                  </a>
                  <button
                    onClick={() => { navigator.clipboard.writeText(url); toast.success("URL copiada"); }}
                    className="flex items-center gap-1.5 text-[11px] font-medium border rounded-lg px-3 py-1.5 bg-background hover:bg-secondary transition-all shrink-0"
                  >
                    <Copy size={12} /> Copiar
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Embed en sitio web */}
        <div className="bg-card border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Code size={15} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold">Incrustar en tu sitio web</h2>
          </div>
          <p className="text-[11px] text-muted-foreground -mt-1">
            Elige el tipo de código e incorpóralo donde quieras en tu sitio.
          </p>
          <div className="flex gap-2">
            {(["iframe", "js"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setEmbedTab(tab)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${
                  embedTab === tab
                    ? "bg-primary text-white border-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "iframe" ? "iFrame" : "JavaScript"}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {embedTab === "iframe"
              ? "Copia y pega el código del idioma que necesites. Ambos apuntan al mismo calendario."
              : "Ideal si quieres mayor control sobre el estilo y comportamiento del calendario."}
          </p>
          <div className="space-y-3">
            {(["es", "en"] as const).map((lang) => {
              const code = lang === "es" ? activeCodeEs : activeCodeEn;
              return (
                <div key={lang} className="space-y-1">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    {lang === "es" ? "🇪🇸 Español" : "🇺🇸 English"}
                  </p>
                  <div className="relative">
                    <pre className="bg-secondary/40 border rounded-xl p-4 pr-20 text-xs font-mono text-foreground overflow-x-auto leading-relaxed whitespace-pre">
                      {code}
                    </pre>
                    <button
                      onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                      className="absolute top-3 right-3 flex items-center gap-1.5 text-[11px] font-medium border rounded-lg px-3 py-1.5 bg-background hover:bg-secondary transition-all"
                    >
                      <Copy size={12} />
                      Copiar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recordatorios */}
        <div className="bg-card border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold">Recordatorios automáticos</h2>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            Se enviarán automáticamente antes o después de cada cita agendada en este calendario.
          </p>
          {canEditReminders ? (
            <>
              <ReminderRulesEditor rules={reminderRules} onChange={setReminderRules} />
              <Button
                onClick={handleSave}
                disabled={saving}
                variant="outline"
                className="rounded-xl h-9 font-medium text-sm"
              >
                {saving ? <Loader2 size={13} className="animate-spin mr-2" /> : null}
                Guardar recordatorios
              </Button>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">No tienes permiso para editar recordatorios.</p>
          )}
        </div>
        </>
      )}
    </div>
    </>
  );
};

export default CrmCalendarConfig;
