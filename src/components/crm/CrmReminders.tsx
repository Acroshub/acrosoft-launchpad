import { useState } from "react";
import {
  Bell, CalendarDays, ClipboardList, User, ChevronRight, ArrowLeft,
  Loader2, Plus, Clock, CheckCircle2, AlertCircle, BellOff, Mail, MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useCalendars, useForms, useUpdateForm, useStaff, useBusinessProfile,
  usePersonalReminders, useCreateReminder, useWhatsappEnabled,
} from "@/hooks/useCrmData";
import ReminderRulesEditor, { ReminderRule } from "@/components/shared/ReminderRulesEditor";
import CrmCalendarConfig from "./CrmCalendarConfig";
import type { CrmCalendarConfig as CalendarData, CrmReminder } from "@/lib/supabase";
import { toast } from "sonner";

// ─── Shared helpers ───────────────────────────────────────────────────────────

const STATUS_ICON: Record<CrmReminder["status"], React.ReactNode> = {
  pending:  <Clock size={12} className="text-yellow-500" />,
  sent:     <CheckCircle2 size={12} className="text-emerald-500" />,
  failed:   <AlertCircle size={12} className="text-destructive" />,
  skipped:  <BellOff size={12} className="text-muted-foreground" />,
};
const STATUS_LABEL: Record<CrmReminder["status"], string> = {
  pending: "Pendiente", sent: "Enviado", failed: "Error", skipped: "Omitido",
};

// ─── Calendar Reminders ───────────────────────────────────────────────────────

const CalendarReminderPanel = ({ onBack }: { onBack: () => void }) => {
  const { data: calendars = [], isLoading } = useCalendars();
  const [selected, setSelected] = useState<CalendarData | null>(null);

  if (selected) {
    return (
      <CrmCalendarConfig
        existingCalendar={selected}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft size={12} /> Volver
        </button>
        <h2 className="text-lg font-semibold">Recordatorios de Calendarios</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Selecciona un calendario para configurar sus recordatorios.</p>
      </div>
      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Cargando…</div>
      ) : calendars.length === 0 ? (
        <div className="py-12 text-center bg-card border rounded-2xl">
          <CalendarDays size={28} className="mx-auto text-muted-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground">No hay calendarios creados.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {calendars.map((cal) => {
            const count = (cal.reminder_rules as any[] | null)?.length ?? 0;
            return (
              <button key={cal.id} onClick={() => setSelected(cal)}
                className="w-full flex items-center justify-between px-4 py-3.5 bg-card border rounded-xl hover:border-primary/40 hover:bg-secondary/40 transition-all text-left">
                <div className="flex items-center gap-3">
                  <CalendarDays size={15} className="text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{cal.name ?? "Sin nombre"}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {count ? `${count} recordatorio${count !== 1 ? "s" : ""} configurado${count !== 1 ? "s" : ""}` : "Sin recordatorios"}
                    </p>
                  </div>
                </div>
                <ChevronRight size={14} className="text-muted-foreground" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Form Reminders ───────────────────────────────────────────────────────────

const FormReminderDetail = ({
  formId, formName, initialRules, onBack,
}: {
  formId: string; formName: string; initialRules: ReminderRule[]; onBack: () => void;
}) => {
  const [rules, setRules] = useState<ReminderRule[]>(initialRules);
  const updateForm = useUpdateForm();

  const handleSave = async () => {
    try {
      await updateForm.mutateAsync({ id: formId, reminder_rules: rules as any });
      toast.success("Recordatorios guardados");
    } catch { toast.error("Error al guardar"); }
  };

  return (
    <div className="space-y-6">
      <div>
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft size={12} /> Volver a formularios
        </button>
        <h2 className="text-lg font-semibold">{formName}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Recordatorios automáticos al completar este formulario.</p>
      </div>
      <div className="bg-card border rounded-2xl p-6 space-y-4">
        <ReminderRulesEditor rules={rules} onChange={setRules} />
        <Button onClick={handleSave} disabled={updateForm.isPending} className="rounded-xl h-9 font-medium text-sm">
          {updateForm.isPending ? <Loader2 size={13} className="animate-spin mr-2" /> : null}
          Guardar recordatorios
        </Button>
      </div>
    </div>
  );
};

const FormReminderPanel = ({ onBack }: { onBack: () => void }) => {
  const { data: forms = [], isLoading } = useForms();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedForm = forms.find((f) => f.id === selectedId);

  if (selectedForm) {
    return (
      <FormReminderDetail
        formId={selectedForm.id}
        formName={selectedForm.name}
        initialRules={(selectedForm.reminder_rules as unknown as ReminderRule[] | null) ?? []}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft size={12} /> Volver
        </button>
        <h2 className="text-lg font-semibold">Recordatorios de Formularios</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Selecciona un formulario para configurar sus recordatorios.</p>
      </div>
      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Cargando…</div>
      ) : forms.length === 0 ? (
        <div className="py-12 text-center bg-card border rounded-2xl">
          <ClipboardList size={28} className="mx-auto text-muted-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground">No hay formularios creados.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {forms.map((form) => {
            const count = (form.reminder_rules as any[] | null)?.length ?? 0;
            return (
              <button key={form.id} onClick={() => setSelectedId(form.id)}
                className="w-full flex items-center justify-between px-4 py-3.5 bg-card border rounded-xl hover:border-primary/40 hover:bg-secondary/40 transition-all text-left">
                <div className="flex items-center gap-3">
                  <ClipboardList size={15} className="text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{form.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {count ? `${count} recordatorio${count !== 1 ? "s" : ""} configurado${count !== 1 ? "s" : ""}` : "Sin recordatorios"}
                    </p>
                  </div>
                </div>
                <ChevronRight size={14} className="text-muted-foreground" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Personal Reminders ───────────────────────────────────────────────────────

const pill = (active: boolean) =>
  `flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
    active
      ? "bg-primary text-primary-foreground border-primary"
      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
  }`;

const NewPersonalReminderForm = ({ onBack, onSaved }: { onBack: () => void; onSaved: () => void }) => {
  const { data: staffList = [] } = useStaff();
  const { data: profile }        = useBusinessProfile();
  const createReminder           = useCreateReminder();
  const whatsappEnabled          = useWhatsappEnabled();

  const adminLabel = (() => {
    const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");
    if (!name) return "Dueño del negocio";
    return profile?.role ? `${name} (${profile.role})` : name;
  })();

  const [note, setNote]           = useState("");
  const [dateTime, setDateTime]   = useState("");
  const [targets, setTargets]     = useState<string[]>(["admin"]);
  const [channel, setChannel]     = useState<"email" | "whatsapp">("email");

  const resolveChannelValue = (targetId: string, ch: "email" | "whatsapp"): string => {
    if (targetId === "admin") {
      return ch === "email"
        ? (profile?.contact_email ?? "")
        : (profile?.contact_phone ?? profile?.whatsapp ?? "");
    }
    const staff = staffList.find(s => s.id === targetId);
    return ch === "email" ? (staff?.email ?? "") : "";
  };

  const toggleTarget = (id: string) => {
    setTargets(prev => {
      if (prev.includes(id)) {
        const next = prev.filter(t => t !== id);
        return next.length === 0 ? ["admin"] : next; // always keep at least one
      }
      return [...prev, id];
    });
  };

  const handleChannelChange = (ch: "email" | "whatsapp") => {
    if (!whatsappEnabled && ch === "whatsapp") return;
    setChannel(ch);
  };

  const canSave = note.trim() && dateTime && targets.length > 0;

  const handleSave = async () => {
    if (!canSave || createReminder.isPending) return;
    try {
      const scheduledAt = new Date(dateTime).toISOString();
      const msg = note.trim();
      // One reminder per selected target
      await Promise.all(
        targets.map((targetId) => {
          const channelValue = resolveChannelValue(targetId, channel);
          return createReminder.mutateAsync({
            contact_id:      null,
            appointment_id:  null,
            type:            channel,
            recipient_email: channel === "email"     ? channelValue : null,
            recipient_phone: channel === "whatsapp"  ? channelValue : null,
            scheduled_at:    scheduledAt,
            message:         msg,
            is_auto:         false,
            is_personal:     true,
            staff_id:        (targetId !== "admin" ? targetId : null) as any,
            business_target: targetId,
          } as any);
        })
      );
      toast.success(
        targets.length > 1
          ? `${targets.length} recordatorios programados`
          : "Recordatorio personal programado"
      );
      onSaved();
    } catch { toast.error("Error al programar recordatorio"); }
  };

  return (
    <div className="space-y-6">
      <div>
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft size={12} /> Volver
        </button>
        <h2 className="text-lg font-semibold">Nuevo recordatorio personal</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Para ti o tu equipo en una fecha específica.</p>
      </div>

      <div className="bg-card border rounded-2xl p-6 space-y-5">
        {/* Note */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Nota / mensaje *</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Ej: Llamar al cliente Martínez para hacer seguimiento..."
            className="w-full rounded-xl border border-input bg-background text-sm px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
          />
        </div>

        {/* Destination — multi-select checkboxes */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Enviar a *</p>
          <div className="space-y-1 border border-border/60 rounded-xl p-2.5 max-h-44 overflow-y-auto">
            {/* Admin */}
            <label className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={targets.includes("admin")}
                onChange={() => toggleTarget("admin")}
                className="h-3.5 w-3.5 rounded border-input accent-primary"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold leading-none">{adminLabel}</p>
                {profile?.contact_email && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{profile.contact_email}</p>
                )}
              </div>
            </label>
            {/* Staff */}
            {staffList.map((s) => (
              <label key={s.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={targets.includes(s.id)}
                  onChange={() => toggleTarget(s.id)}
                  className="h-3.5 w-3.5 rounded border-input accent-primary"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold leading-none">{s.name} <span className="font-normal text-muted-foreground">(Staff)</span></p>
                  {s.email && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{s.email}</p>}
                </div>
              </label>
            ))}
            {staffList.length === 0 && (
              <p className="text-[11px] text-muted-foreground/50 italic px-2 py-1">Sin staff registrado</p>
            )}
          </div>
          {targets.length > 1 && (
            <p className="text-[10px] text-muted-foreground">
              {targets.length} destinatarios — se creará un recordatorio por cada uno
            </p>
          )}
        </div>

        {/* Channel */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Canal</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => handleChannelChange("email")} className={pill(channel === "email")}>
              <Mail size={11} /> Email
            </button>
            <button
              type="button"
              onClick={() => handleChannelChange("whatsapp")}
              disabled={!whatsappEnabled}
              title={whatsappEnabled ? undefined : "WhatsApp no está configurado. Ve a Configuración → Integraciones."}
              className={whatsappEnabled ? pill(channel === "whatsapp") : "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium border-border text-muted-foreground/40 cursor-not-allowed opacity-50"}
            >
              <MessageSquare size={11} /> WhatsApp
            </button>
          </div>
        </div>

        {/* Date time */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Fecha y hora *</label>
          <Input
            type="datetime-local"
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
            className="h-10 text-sm"
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={!canSave || createReminder.isPending}
          className="w-full rounded-xl h-10 font-medium text-sm"
        >
          {createReminder.isPending ? <Loader2 size={13} className="animate-spin mr-2" /> : null}
          Programar recordatorio
        </Button>
      </div>
    </div>
  );
};

const PersonalReminderPanel = ({ onBack }: { onBack: () => void }) => {
  const { data: reminders = [], isLoading } = usePersonalReminders();
  const [creating, setCreating] = useState(false);

  if (creating) {
    return <NewPersonalReminderForm onBack={() => setCreating(false)} onSaved={() => setCreating(false)} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft size={12} /> Volver
        </button>
        <h2 className="text-lg font-semibold">Recordatorios Personales</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Notas programadas para ti o tu equipo.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Create new card — always first */}
          <button
            onClick={() => setCreating(true)}
            className="flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed border-primary/30 rounded-2xl text-primary hover:bg-primary/5 hover:border-primary/60 transition-all min-h-[120px]"
          >
            <Plus size={20} />
            <span className="text-xs font-semibold">Nuevo recordatorio</span>
          </button>

          {reminders.map((r) => (
            <div key={r.id} className="bg-card border rounded-2xl p-4 space-y-2.5 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-snug line-clamp-2 flex-1">{r.message}</p>
                <div className="shrink-0">{STATUS_ICON[r.status]}</div>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                {r.type === "email"
                  ? <Mail size={10} className="shrink-0" />
                  : <MessageSquare size={10} className="shrink-0" />}
                <span className="truncate">{r.recipient_email ?? r.recipient_phone ?? "—"}</span>
              </div>
              <div className="mt-auto pt-1 flex items-center justify-between">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  r.status === "sent"    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800" :
                  r.status === "failed"  ? "bg-red-50 text-red-700 border-red-200" :
                  r.status === "skipped" ? "bg-secondary text-muted-foreground border-border" :
                                          "bg-yellow-50 text-yellow-700 border-yellow-200"
                }`}>
                  {STATUS_LABEL[r.status]}
                </span>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {new Date(r.scheduled_at).toLocaleString("es-ES", {
                    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

type Panel = "menu" | "calendar" | "form" | "personal";

const CrmReminders = () => {
  const [panel, setPanel] = useState<Panel>("menu");

  if (panel === "calendar") return <CalendarReminderPanel onBack={() => setPanel("menu")} />;
  if (panel === "form")     return <FormReminderPanel     onBack={() => setPanel("menu")} />;
  if (panel === "personal") return <PersonalReminderPanel onBack={() => setPanel("menu")} />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Bell size={18} className="text-primary" /> Recordatorios
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gestiona recordatorios de calendarios, formularios y personales.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <button onClick={() => setPanel("calendar")}
          className="flex flex-col items-start gap-3 p-5 bg-card border rounded-2xl hover:border-primary/40 hover:bg-secondary/30 transition-all text-left">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <CalendarDays size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Calendario</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Recordatorios antes o después de citas agendadas.</p>
          </div>
          <ChevronRight size={13} className="text-muted-foreground mt-auto self-end" />
        </button>

        <button onClick={() => setPanel("form")}
          className="flex flex-col items-start gap-3 p-5 bg-card border rounded-2xl hover:border-primary/40 hover:bg-secondary/30 transition-all text-left">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
            <ClipboardList size={18} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-semibold">Formulario</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Recordatorios tras completar un formulario.</p>
          </div>
          <ChevronRight size={13} className="text-muted-foreground mt-auto self-end" />
        </button>

        <button onClick={() => setPanel("personal")}
          className="flex flex-col items-start gap-3 p-5 bg-card border rounded-2xl hover:border-primary/40 hover:bg-secondary/30 transition-all text-left">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
            <User size={18} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold">Personal</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Notas programadas para ti o tu equipo.</p>
          </div>
          <ChevronRight size={13} className="text-muted-foreground mt-auto self-end" />
        </button>
      </div>
    </div>
  );
};

export default CrmReminders;
