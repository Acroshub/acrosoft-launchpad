import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Code, Copy, Check, Globe, Clock, Calendar, ArrowLeft, Link2, Loader2, Trash2 } from "lucide-react";
import { useCreateCalendarConfig, useUpdateCalendarConfig, useDeleteCalendarConfig, useForms, useCreateForm } from "@/hooks/useCrmData";
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
}

const CrmCalendarConfig = ({ onBack, existingCalendar }: Props) => {
  const { data: forms = [] } = useForms();
  const createConfig = useCreateCalendarConfig();
  const updateConfig = useUpdateCalendarConfig();
  const deleteConfig = useDeleteCalendarConfig();
  const createForm   = useCreateForm();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isNew = existingCalendar === null;

  const [name, setName]                   = useState("");
  const [description, setDescription]     = useState("");
  const [duration, setDuration]           = useState(30);
  const [bufferTime, setBufferTime]       = useState(10);
  const [slug, setSlug]                   = useState("");
  const [linkedFormId, setLinkedFormId]   = useState<string | null>(null);
  const [availability, setAvailability]   = useState<WeeklySchedule>(DEFAULT_WEEKLY_SCHEDULE);
  const [reminderRules, setReminderRules] = useState<ReminderRule[]>([]);
  const [minAdvanceHours, setMinAdvanceHours] = useState(1);
  const [maxFutureDays, setMaxFutureDays]     = useState(60);
  const [scheduleInterval, setScheduleInterval] = useState<15 | 30>(30);
  const [isEditingHours, setIsEditingHours] = useState(false);
  const [embedTab, setEmbedTab]           = useState<"iframe" | "js">("iframe");
  const [copied, setCopied]               = useState(false);
  const [saving, setSaving]               = useState(false);

  // Populate form when editing an existing calendar
  useEffect(() => {
    if (existingCalendar) {
      setName(existingCalendar.name ?? "");
      setDescription(existingCalendar.description ?? "");
      setDuration(existingCalendar.duration_min ?? 30);
      setBufferTime(existingCalendar.buffer_min ?? 10);
      setSlug(existingCalendar.slug ?? "");
      setLinkedFormId(existingCalendar.linked_form_id ?? null);
      setAvailability(normalizeAvail(existingCalendar.availability));
      setReminderRules((existingCalendar.reminder_rules as unknown as ReminderRule[] | null) ?? []);
      setMinAdvanceHours(existingCalendar.min_advance_hours ?? 1);
      setMaxFutureDays(existingCalendar.max_future_days ?? 60);
      setScheduleInterval(((existingCalendar as any).schedule_interval === 15 ? 15 : 30));
    }
  }, [existingCalendar]);

  const calendarUid = existingCalendar?.id ?? "";
  // Public URL: slug when available, UUID as fallback. Embed code always uses UUID (stable).
  const publicUrl   = calendarUid
    ? `${window.location.origin}/book/${slug.trim() || calendarUid}`
    : "";
  const iframeCode  = calendarUid
    ? `<iframe\n  src="${window.location.origin}/book/${calendarUid}"\n  width="100%"\n  height="700"\n  frameborder="0"\n  style="border:none;border-radius:12px;"\n></iframe>`
    : "";
  const jsCode = calendarUid
    ? `<div id="acrosoft-cal-${calendarUid}"></div>\n<script>\n  (function(){\n    var i=document.createElement('iframe');\n    i.src='${window.location.origin}/book/${calendarUid}';\n    i.width='100%';i.height='700';i.frameBorder='0';\n    i.style.borderRadius='12px';\n    document.getElementById('acrosoft-cal-${calendarUid}').appendChild(i);\n  })();\n</script>`
    : "";
  const activeCode = embedTab === "iframe" ? iframeCode : jsCode;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resolveFormId = async (): Promise<string | null> => {
    if (linkedFormId) return linkedFormId;
    // Reuse existing basic form or create one
    const existing = forms.find((f) => f.name === BASIC_FORM_NAME);
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
        min_advance_hours: minAdvanceHours,
        max_future_days: maxFutureDays,
        slug: slug || null,
        linked_form_id: formId,
        availability,
        schedule_interval: scheduleInterval,
        reminder_rules: reminderRules as unknown as any,
      };

      if (isNew) {
        await createConfig.mutateAsync(payload);
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

          <Field label="Slug personalizado (opcional)">
            <div className="flex items-center gap-2">
              <Globe size={14} className="text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground truncate">{window.location.origin}/book/</span>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="h-9 text-sm flex-1"
                placeholder="mi-negocio"
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              El calendario funciona sin slug — se usa el ID automáticamente.
            </p>
          </Field>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Duración de la cita (min)">
              <Input
                type="number"
                min={5}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="h-10 text-sm"
              />
            </Field>
            <Field label="Tiempo entre citas (min)">
              <Input
                type="number"
                min={0}
                value={bufferTime}
                onChange={(e) => setBufferTime(Number(e.target.value))}
                className="h-10 text-sm"
              />
            </Field>
            <Field label="Intervalo del horario">
              <select
                value={scheduleInterval}
                onChange={(e) => setScheduleInterval(Number(e.target.value) as 15 | 30)}
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value={30}>Cada 30 min</option>
                <option value={15}>Cada 15 min</option>
              </select>
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
            interval={scheduleInterval}
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
            <div className="flex items-center justify-between p-5 rounded-2xl border bg-secondary/10 group hover:border-primary/30 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white border flex items-center justify-center p-2 shadow-sm shrink-0">
                  <img
                    src="https://www.gstatic.com/images/branding/product/1x/calendar_2020q4_48dp.png"
                    alt="Google Calendar"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Google Calendar</p>
                  <p className="text-xs text-muted-foreground mt-1">Sincroniza tus citas y evita duplicidad automáticamente en tiempo real.</p>
                </div>
              </div>
              <Button className="h-11 px-6 rounded-xl text-sm font-bold bg-primary hover:bg-primary/90 text-white shadow-md transition-all">
                Conectar cuenta
              </Button>
            </div>
          </div>
        </div>

        {/* URL Pública */}
        <div className="bg-card border rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Globe size={15} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold">URL pública del calendario</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Comparte este enlace para que tus clientes agenden directamente.
            {slug.trim() && " Usando el slug personalizado configurado arriba."}
          </p>
          <div className="flex items-center gap-2 bg-secondary/40 border rounded-xl px-4 py-3">
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-primary hover:underline truncate flex-1"
            >
              {publicUrl}
            </a>
            <button
              onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success("URL copiada"); }}
              className="flex items-center gap-1.5 text-[11px] font-medium border rounded-lg px-3 py-1.5 bg-background hover:bg-secondary transition-all shrink-0"
            >
              <Copy size={12} /> Copiar
            </button>
          </div>
          {slug.trim() && (
            <p className="text-[10px] text-muted-foreground">
              URL alternativa estable (ID):&nbsp;
              <a href={`${window.location.origin}/book/${calendarUid}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                {window.location.origin}/book/{calendarUid}
              </a>
            </p>
          )}
        </div>

        {/* Embed en sitio web */}
        <div className="bg-card border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Code size={15} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold">Incrustar en tu sitio web</h2>
          </div>
          <p className="text-[11px] text-muted-foreground -mt-1">
            El código siempre usa el ID del calendario (estable aunque cambies el slug).
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
              ? "Copia y pega este código HTML donde quieras mostrar el calendario en tu sitio."
              : "Ideal si quieres mayor control sobre el estilo y comportamiento del calendario."}
          </p>
          <div className="relative">
            <pre className="bg-secondary/40 border rounded-xl p-5 text-xs font-mono text-foreground overflow-x-auto leading-relaxed whitespace-pre">
              {activeCode}
            </pre>
            <button
              onClick={handleCopy}
              className="absolute top-3 right-3 flex items-center gap-1.5 text-[11px] font-medium border rounded-lg px-3 py-1.5 bg-background hover:bg-secondary transition-all"
            >
              {copied ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
              {copied ? "Copiado" : "Copiar"}
            </button>
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
        </div>
        </>
      )}
    </div>
    </>
  );
};

export default CrmCalendarConfig;
