import { useState } from "react";
import {
  Bell, CalendarDays, ClipboardList, User, ChevronRight, ArrowLeft,
  Loader2, Plus, Clock, CheckCircle2, AlertCircle, BellOff, Mail, MessageSquare,
  Pencil, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useCalendars, useForms, useUpdateForm, useStaff, useBusinessProfile,
  usePersonalReminders, useCreateReminder, useDeleteReminder, useUpdateReminder,
} from "@/hooks/useCrmData";
import ReminderRulesEditor, { ReminderRule } from "@/components/shared/ReminderRulesEditor";
import VariableChipsEditor from "@/components/shared/VariableChipsEditor";
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

const NewPersonalReminderForm = ({ onBack, onSaved, editData }: { onBack: () => void; onSaved: () => void; editData?: CrmReminder }) => {
  const { data: staffList = [] } = useStaff();
  const { data: profile }       = useBusinessProfile();
  const createReminder          = useCreateReminder();
  const updateReminder          = useUpdateReminder();

  const adminLabel = (() => {
    const fn = profile?.first_name?.trim() ?? "";
    const ln = profile?.last_name?.trim() ?? "";
    const fullName = [fn, ln].filter(Boolean).join(" ") || "Administrador";
    const role = profile?.role?.trim() || "Admin";
    return `${fullName} (${role})`;
  })();

  const [note, setNote]           = useState(editData?.message ?? "");
  const [dateTime, setDateTime]   = useState(editData ? new Date(editData.scheduled_at).toISOString().slice(0, 16) : "");
  const [targets, setTargets]     = useState<string[]>(
    editData?.business_target ? [editData.business_target] : ["admin"]
  );
  const [channel, setChannel]     = useState<"email" | "whatsapp">(editData?.type ?? "email");
  const [channelValue, setChannelValue] = useState(
    editData ? (editData.recipient_email ?? editData.recipient_phone ?? "") : ""
  );

  const isEditing = !!editData;

  // Build channel value from selected targets
  const buildChannelValues = (selectedTargets: string[], ch: "email" | "whatsapp"): string => {
    const values: string[] = [];
    for (const t of selectedTargets) {
      if (t === "admin") {
        const val = ch === "email"
          ? (profile?.contact_email ?? "")
          : (profile?.contact_phone ?? profile?.whatsapp ?? "");
        if (val) values.push(val);
      } else {
        const staff = staffList.find(s => s.id === t);
        const val = ch === "email" ? (staff?.email ?? "") : "";
        if (val) values.push(val);
      }
    }
    return values.join(", ");
  };

  const toggleTarget = (targetId: string) => {
    const current = new Set(targets);
    if (current.has(targetId)) {
      current.delete(targetId);
      if (current.size === 0) current.add("admin");
    } else {
      current.add(targetId);
    }
    const newTargets = Array.from(current);
    setTargets(newTargets);
    setChannelValue(buildChannelValues(newTargets, channel));
  };

  const handleChannelChange = (ch: "email" | "whatsapp") => {
    setChannel(ch);
    setChannelValue(buildChannelValues(targets, ch));
  };

  const handleSave = async () => {
    if (!note.trim() || !dateTime || !channelValue.trim()) return;
    try {
      if (isEditing) {
        await updateReminder.mutateAsync({
          id: editData!.id,
          type: channel,
          recipient_email: channel === "email" ? channelValue : null,
          recipient_phone: channel === "whatsapp" ? channelValue : null,
          scheduled_at: new Date(dateTime).toISOString(),
          message: note.trim(),
          business_target: targets[0],
        });
        toast.success("Recordatorio actualizado");
      } else {
        // Create one reminder per selected target
        for (const t of targets) {
          let chVal = "";
          if (t === "admin") {
            chVal = channel === "email"
              ? (profile?.contact_email ?? "")
              : (profile?.contact_phone ?? profile?.whatsapp ?? "");
          } else {
            const staff = staffList.find(s => s.id === t);
            chVal = channel === "email" ? (staff?.email ?? "") : "";
          }
          await createReminder.mutateAsync({
            contact_id: null,
            appointment_id: null,
            type: channel,
            recipient_email: channel === "email" ? chVal : null,
            recipient_phone: channel === "whatsapp" ? chVal : null,
            scheduled_at: new Date(dateTime).toISOString(),
            message: note.trim(),
            is_auto: false,
            is_personal: true,
            staff_id: (t !== "admin" ? t : null) as any,
            business_target: t,
          } as any);
        }
        toast.success(targets.length > 1 ? `${targets.length} recordatorios programados` : "Recordatorio personal programado");
      }
      onSaved();
    } catch { toast.error("Error al guardar recordatorio"); }
  };

  return (
    <div className="space-y-6">
      <div>
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft size={12} /> Volver
        </button>
        <h2 className="text-lg font-semibold">{isEditing ? "Editar recordatorio" : "Nuevo recordatorio personal"}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Para ti o tu equipo en una fecha específica.</p>
      </div>

      <div className="bg-card border rounded-2xl p-6 space-y-5">
        {/* Note with variables */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Nota / mensaje *</label>
          <VariableChipsEditor
            value={note}
            onChange={setNote}
            placeholder="Ej: Llamar al cliente {{nombre_cliente}} para hacer seguimiento..."
          />
        </div>

        {/* Destination — multi-select checkboxes */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Enviar a</p>
          <div className="space-y-1.5 border rounded-xl p-3 max-h-48 overflow-y-auto">
            {/* Admin */}
            <label className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-secondary/40 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={targets.includes("admin")}
                onChange={() => toggleTarget("admin")}
                className="rounded border-input h-3.5 w-3.5 text-primary"
              />
              <span className="text-xs font-medium">{adminLabel}</span>
            </label>
            {/* Staff */}
            {staffList.map((s) => (
              <label key={s.id} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-secondary/40 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={targets.includes(s.id)}
                  onChange={() => toggleTarget(s.id)}
                  className="rounded border-input h-3.5 w-3.5 text-primary"
                />
                <span className="text-xs font-medium">{s.name} (Staff)</span>
              </label>
            ))}
          </div>
          {targets.length > 1 && (
            <p className="text-[10px] text-muted-foreground">
              {targets.length} destinatarios seleccionados — se creará un recordatorio por cada uno
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
            <button type="button" onClick={() => handleChannelChange("whatsapp")} className={pill(channel === "whatsapp")}>
              <MessageSquare size={11} /> WhatsApp
            </button>
          </div>
        </div>

        {/* Channel value */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            {channel === "email" ? "Email destino *" : "WhatsApp destino *"}
          </label>
          <Input
            value={channelValue}
            onChange={(e) => setChannelValue(e.target.value)}
            placeholder={channel === "email" ? "correo@ejemplo.com" : "+52 55 1234 5678"}
            className="h-10 text-sm"
          />
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
          disabled={!note.trim() || !dateTime || !channelValue.trim() || createReminder.isPending || updateReminder.isPending}
          className="w-full rounded-xl h-10 font-medium text-sm"
        >
          {(createReminder.isPending || updateReminder.isPending) ? <Loader2 size={13} className="animate-spin mr-2" /> : null}
          {isEditing ? "Actualizar recordatorio" : "Programar recordatorio"}
        </Button>
      </div>
    </div>
  );
};

/** Returns a human-readable countdown string */
const formatCountdown = (scheduledAt: string): string => {
  const diffMs = new Date(scheduledAt).getTime() - Date.now();
  if (diffMs <= 0) return "Ya pasó";
  const mins  = Math.floor(diffMs / 60_000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (days > 0)  return `Faltan ${days}d ${hours % 24}h`;
  if (hours > 0) return `Faltan ${hours}h ${mins % 60}min`;
  return `Faltan ${mins}min`;
};

const PersonalReminderPanel = ({ onBack }: { onBack: () => void }) => {
  const { data: reminders = [], isLoading } = usePersonalReminders();
  const deleteReminder = useDeleteReminder();
  const [creating, setCreating] = useState(false);
  const [editingReminder, setEditingReminder] = useState<typeof reminders[number] | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (creating || editingReminder) {
    return (
      <NewPersonalReminderForm
        onBack={() => { setCreating(false); setEditingReminder(null); }}
        onSaved={() => { setCreating(false); setEditingReminder(null); }}
        editData={editingReminder ?? undefined}
      />
    );
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteReminder.mutateAsync({ id });
      toast.success("Recordatorio eliminado");
    } catch { toast.error("Error al eliminar"); }
    setDeletingId(null);
  };

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
              {/* Countdown */}
              {r.status === "pending" && (
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
                  <Clock size={10} className="shrink-0" />
                  <span>{formatCountdown(r.scheduled_at)}</span>
                </div>
              )}
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
              {/* Edit / Delete buttons */}
              <div className="flex items-center gap-1.5 pt-1 border-t border-border/40">
                <button
                  onClick={() => setEditingReminder(r)}
                  className="flex items-center gap-1 flex-1 justify-center py-1.5 rounded-lg text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                >
                  <Pencil size={10} /> Editar
                </button>
                {deletingId === r.id ? (
                  <div className="flex items-center gap-1 flex-1 justify-center">
                    <button
                      onClick={() => handleDelete(r.id)}
                      disabled={deleteReminder.isPending}
                      className="text-[10px] font-semibold text-destructive hover:underline"
                    >
                      {deleteReminder.isPending ? "…" : "Confirmar"}
                    </button>
                    <button
                      onClick={() => setDeletingId(null)}
                      className="text-[10px] font-medium text-muted-foreground hover:text-foreground"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeletingId(r.id)}
                    className="flex items-center gap-1 flex-1 justify-center py-1.5 rounded-lg text-[10px] font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 size={10} /> Borrar
                  </button>
                )}
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
