import { useState } from "react";
import { useStaffPermissions } from "@/hooks/useAuth";
import {
  Bell, CalendarDays, ClipboardList, User, ChevronRight, ArrowLeft,
  Loader2, Plus, Clock, CheckCircle2, AlertCircle, BellOff, Mail, Send, Trash2, Megaphone,
  MessageSquare,
} from "lucide-react";
import CrmWaTemplates from "@/components/crm/CrmWaTemplates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useCalendars, useForms, useUpdateForm, useStaff, useBusinessProfile,
  usePersonalReminders, useCreateReminder,
  useDeleteReminder, useVendorProfile, useWaTemplates,
} from "@/hooks/useCrmData";
import ReminderRulesEditor, { ReminderRule } from "@/components/shared/ReminderRulesEditor";
import CrmCalendarConfig from "./CrmCalendarConfig";
import CrmForms from "./CrmForms";
import type { CrmCalendarConfig as CalendarData, CrmReminder, ReminderWaVarMap } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
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
        initialSection="notificaciones"
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
        <h2 className="text-lg font-semibold">Notificaciones de Calendarios</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Selecciona un calendario para configurar sus notificaciones.</p>
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
                      {count ? `${count} notificación${count !== 1 ? "es" : ""} configurada${count !== 1 ? "s" : ""}` : "Sin notificaciones"}
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
  const { can } = useStaffPermissions();
  const canEdit = can("recordatorios", "create");

  const handleSave = async () => {
    try {
      await updateForm.mutateAsync({ id: formId, reminder_rules: rules as any });
      toast.success("Notificaciones guardadas");
    } catch { toast.error("Error al guardar"); }
  };

  return (
    <div className="space-y-6">
      <div>
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft size={12} /> Volver a formularios
        </button>
        <h2 className="text-lg font-semibold">{formName}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Notificaciones automáticas al completar este formulario.</p>
      </div>
      <div className="bg-card border rounded-2xl p-6 space-y-4">
        {canEdit ? (
          <>
            <ReminderRulesEditor rules={rules} onChange={setRules} />
            <Button onClick={handleSave} disabled={updateForm.isPending} className="rounded-xl h-9 font-medium text-sm">
              {updateForm.isPending ? <Loader2 size={13} className="animate-spin mr-2" /> : null}
              Guardar notificaciones
            </Button>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">No tienes permiso para editar notificaciones.</p>
        )}
      </div>
    </div>
  );
};

const FormReminderPanel = ({ onBack }: { onBack: () => void }) => {
  const { data: forms = [], isLoading } = useForms();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (selectedId) {
    return (
      <CrmForms
        preselectedFormId={selectedId}
        initialFormTab="notificaciones"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft size={12} /> Volver
        </button>
        <h2 className="text-lg font-semibold">Notificaciones de Formularios</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Selecciona un formulario para configurar sus notificaciones.</p>
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
                      {count ? `${count} notificación${count !== 1 ? "es" : ""} configurada${count !== 1 ? "s" : ""}` : "Sin notificaciones"}
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

// ─── WA variable options (personal context: no appointment) ──────────────────

const PERSONAL_WA_VAR_OPTIONS: { label: string; key: string }[] = [
  { label: "Nombre del negocio", key: "business_field:name" },
  { label: "Texto fijo",         key: "fixed" },
];

function extractVarNumsPersonal(text: string): number[] {
  const nums = new Set<number>();
  for (const m of text.matchAll(/\{\{(\d+)\}\}/g)) nums.add(Number(m[1]));
  return Array.from(nums).sort((a, b) => a - b);
}

const pillCls = (active: boolean) =>
  `flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
    active
      ? "bg-primary text-primary-foreground border-primary"
      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
  }`;

const NewPersonalReminderForm = ({ onBack, onSaved }: { onBack: () => void; onSaved: () => void }) => {
  const { data: staffList = [] }      = useStaff();
  const { data: profile }             = useBusinessProfile();
  const { data: vendorProfile }       = useVendorProfile();
  const { data: allTemplates = [] }   = useWaTemplates();
  const isVendor                      = !!vendorProfile;
  const createReminder                = useCreateReminder();

  const utilityTemplates = allTemplates.filter(
    t => t.category === "UTILITY" && t.meta_status === "APPROVED",
  );

  const adminLabel = (() => {
    const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");
    if (!name) return "Dueño del negocio";
    return profile?.role ? `${name} (${profile.role})` : name;
  })();

  const [note, setNote]                       = useState("");
  const [subject, setSubject]                 = useState("");
  const [dateStr, setDateStr]                 = useState("");
  const [timeStr, setTimeStr]                 = useState("");
  const [targets, setTargets]                 = useState<string[]>(["admin"]);
  const [channels, setChannels]               = useState<{ email: boolean; whatsapp: boolean }>({ email: true, whatsapp: false });
  const [waTemplateId, setWaTemplateId]       = useState<string>("");
  const [waVarMap, setWaVarMap]               = useState<ReminderWaVarMap>({});
  const [sending, setSending]                 = useState(false);

  const selectedTemplate = utilityTemplates.find(t => t.id === waTemplateId);
  const templateVarNums  = selectedTemplate ? extractVarNumsPersonal(selectedTemplate.body_text) : [];

  const resolveEmail = (targetId: string): string => {
    if (isVendor) return vendorProfile?.email ?? "";
    if (targetId === "admin") return profile?.contact_email ?? "";
    return staffList.find(s => s.id === targetId)?.email ?? "";
  };

  const resolvePhone = (targetId: string): string => {
    if (isVendor) return "";
    if (targetId === "admin") return (profile as any)?.contact_phone ?? (profile as any)?.whatsapp ?? "";
    return (staffList.find(s => s.id === targetId) as any)?.phone ?? "";
  };

  const toggleTarget = (id: string) => {
    setTargets(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
        return prev.filter(t => t !== id);
      }
      return [...prev, id];
    });
  };

  const toggleChannel = (ch: "email" | "whatsapp") => {
    setChannels(prev => {
      const next = { ...prev, [ch]: !prev[ch] };
      if (!next.email && !next.whatsapp) return prev;
      if (!next.whatsapp) { setWaTemplateId(""); setWaVarMap({}); }
      return next;
    });
  };

  const buildReminderPayloads = (scheduledAt: string, msg: string) =>
    targets.map((targetId) => {
      const email = channels.email ? resolveEmail(targetId) : null;
      const phone = channels.whatsapp ? resolvePhone(targetId) : null;
      return createReminder.mutateAsync({
        contact_id:             null,
        appointment_id:         null,
        type:                   channels.email ? "email" : "whatsapp",
        channels,
        recipient_email:        email || null,
        recipient_phone:        phone || null,
        scheduled_at:           scheduledAt,
        subject:                subject.trim() || null,
        message:                msg,
        is_auto:                false,
        is_personal:            true,
        staff_id:               (targetId !== "admin" ? targetId : null) as any,
        business_target:        targetId,
        whatsapp_template_id:   (channels.whatsapp && waTemplateId) ? waTemplateId : null,
        whatsapp_variable_map:  (channels.whatsapp && waTemplateId) ? waVarMap : null,
      } as any);
    });

  const doSchedule = async () => {
    if (!note.trim() || !dateStr || !timeStr || targets.length === 0) return;
    if (createReminder.isPending) return;
    try {
      const scheduledAt = new Date(`${dateStr}T${timeStr}`).toISOString();
      await Promise.all(buildReminderPayloads(scheduledAt, note.trim()));
      toast.success(
        targets.length > 1
          ? `${targets.length} notificaciones programadas`
          : "Notificación personal programada"
      );
      onSaved();
    } catch { toast.error("Error al programar notificación"); }
  };

  const handleSendNow = async () => {
    if (!note.trim() || targets.length === 0) return;
    if (createReminder.isPending || sending) return;
    setSending(true);
    try {
      const scheduledAt = new Date(Date.now() - 1000).toISOString();
      await Promise.all(buildReminderPayloads(scheduledAt, note.trim()));
      await supabase.functions.invoke("send-reminders");
      toast.success(
        targets.length > 1
          ? `${targets.length} notificaciones enviadas`
          : "Notificación enviada"
      );
      onSaved();
    } catch {
      toast.error("Error al enviar notificación");
    } finally {
      setSending(false);
    }
  };

  const waValid     = !channels.whatsapp || !!waTemplateId;
  const canSchedule = !!note.trim() && !!dateStr && !!timeStr && targets.length > 0 && waValid;
  const canSendNow  = !!note.trim() && targets.length > 0 && waValid;

  return (
    <div className="space-y-6">
      <div>
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft size={12} /> Volver
        </button>
        <h2 className="text-lg font-semibold">Nueva notificación personal</h2>
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

        {/* Destination */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Enviar a *</p>
          {isVendor ? (
            <div className="border border-border/60 rounded-xl p-2.5">
              <div className="flex items-center gap-2.5 px-2 py-1.5">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold leading-none">Tú (Vendedor)</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{vendorProfile?.email}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-1 border border-border/60 rounded-xl p-2.5 max-h-44 overflow-y-auto">
              <label className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={targets.includes("admin")}
                  onChange={() => toggleTarget("admin")}
                  className="h-3.5 w-3.5 rounded border-input accent-primary"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold leading-none">{adminLabel}</p>
                  {profile?.contact_email
                    ? <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{profile.contact_email}</p>
                    : <p className="text-[10px] text-amber-600 mt-0.5">⚠ Sin email — configúralo en Mi Negocio</p>
                  }
                </div>
              </label>
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
          )}
          {!isVendor && targets.length > 1 && (
            <p className="text-[10px] text-muted-foreground">
              {targets.length} destinatarios — se creará una notificación por cada uno
            </p>
          )}
        </div>

        {/* Canal */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Canal de envío</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => toggleChannel("email")} className={pillCls(channels.email)}>
              <Mail size={11} /> Email
            </button>
            <button type="button" onClick={() => toggleChannel("whatsapp")} className={pillCls(channels.whatsapp)}>
              <MessageSquare size={11} /> WhatsApp
            </button>
          </div>

          {channels.email && (
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Mail size={10} className="shrink-0" />
              <span className="truncate">
                {targets.map(t => resolveEmail(t)).filter(Boolean).join(", ") || "—"}
              </span>
            </div>
          )}

          {channels.email && (
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-medium text-muted-foreground">Asunto del email <span className="text-muted-foreground/60">(opcional)</span></label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Tienes una notificación"
                className="rounded-xl text-sm"
              />
            </div>
          )}

          {channels.whatsapp && (
            <div className="space-y-2 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                Plantilla UTILITY aprobada
              </p>
              {utilityTemplates.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic">
                  No tienes plantillas UTILITY aprobadas. Créalas en Plantillas WhatsApp.
                </p>
              ) : (
                <select
                  value={waTemplateId}
                  onChange={(e) => { setWaTemplateId(e.target.value); setWaVarMap({}); }}
                  className="w-full h-8 rounded-lg border border-input bg-background text-xs px-2 focus:outline-none focus:ring-1 focus:ring-primary/40"
                >
                  <option value="">— selecciona una plantilla —</option>
                  {utilityTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.language})</option>
                  ))}
                </select>
              )}

              {selectedTemplate && (
                <div className="space-y-2">
                  <p className="text-[10px] text-muted-foreground/70 italic leading-relaxed line-clamp-3">
                    "{selectedTemplate.body_text}"
                  </p>
                  {templateVarNums.length > 0 && (
                    <div className="space-y-2 rounded-xl border border-border/50 bg-secondary/20 p-3">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">
                        Variables de la plantilla
                      </p>
                      {templateVarNums.map(num => {
                        const entry = waVarMap[String(num)];
                        const selectedKey = entry
                          ? (entry.source === "fixed" ? "fixed" : `${entry.source}:${(entry as any).field ?? "name"}`)
                          : "";
                        return (
                          <div key={num} className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-muted-foreground w-8 shrink-0">
                              {`{{${num}}}`}
                            </span>
                            <select
                              value={selectedKey}
                              onChange={(e) => {
                                const k = e.target.value;
                                if (!k) { const m = { ...waVarMap }; delete m[String(num)]; setWaVarMap(m); return; }
                                if (k === "fixed") {
                                  setWaVarMap(prev => ({ ...prev, [String(num)]: { source: "fixed", value: "" } }));
                                } else {
                                  const opt = PERSONAL_WA_VAR_OPTIONS.find(o => o.key === k);
                                  if (opt) {
                                    const [src, fld] = opt.key.split(":");
                                    setWaVarMap(prev => ({ ...prev, [String(num)]: { source: src, field: fld } as any }));
                                  }
                                }
                              }}
                              className="flex-1 h-7 rounded-lg border border-input bg-background text-xs px-2 focus:outline-none focus:ring-1 focus:ring-primary/40"
                            >
                              <option value="">— elegir —</option>
                              {PERSONAL_WA_VAR_OPTIONS.map(o => (
                                <option key={o.key} value={o.key}>{o.label}</option>
                              ))}
                            </select>
                            {entry?.source === "fixed" && (
                              <Input
                                value={(entry as any).value ?? ""}
                                onChange={(e) => setWaVarMap(prev => ({ ...prev, [String(num)]: { source: "fixed", value: e.target.value } }))}
                                placeholder="Texto fijo"
                                className="flex-1 h-7 text-xs"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Phones */}
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <MessageSquare size={10} className="shrink-0" />
                    <span className="truncate">
                      {targets.map(t => resolvePhone(t)).filter(Boolean).join(", ") || "Sin teléfono configurado"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Date + Time */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Programar para *</label>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground/70">Fecha</p>
              <Input
                type="date"
                value={dateStr}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDateStr(e.target.value)}
                className="h-10 text-sm"
              />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground/70">Hora</p>
              <Input
                type="time"
                value={timeStr}
                min={(() => {
                  if (dateStr !== new Date().toISOString().slice(0, 10)) return undefined;
                  const d = new Date(Date.now() + 60_000);
                  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
                })()}
                onChange={(e) => setTimeStr(e.target.value)}
                className="h-10 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleSendNow}
            disabled={!canSendNow || sending || createReminder.isPending}
            className="flex-1 rounded-xl h-10 font-medium text-sm gap-1.5"
          >
            {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            {sending ? "Enviando..." : "Enviar Ahora"}
          </Button>
          <Button
            onClick={doSchedule}
            disabled={!canSchedule || createReminder.isPending}
            className="flex-1 rounded-xl h-10 font-medium text-sm gap-1.5"
          >
            {createReminder.isPending ? <Loader2 size={13} className="animate-spin" /> : <Clock size={13} />}
            Programar
          </Button>
        </div>
      </div>
    </div>
  );
};

const PersonalReminderPanel = ({ onBack }: { onBack: () => void }) => {
  const { data: reminders = [], isLoading } = usePersonalReminders();
  const deleteReminder = useDeleteReminder();
  const { can } = useStaffPermissions();
  const canCreate = can("recordatorios", "create");
  const [creating, setCreating] = useState(false);

  const pending = reminders.filter(r => r.status === "pending" || r.status === "failed");

  if (creating) {
    return <NewPersonalReminderForm onBack={() => setCreating(false)} onSaved={() => setCreating(false)} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft size={12} /> Volver
        </button>
        <h2 className="text-lg font-semibold">Notificaciones Personales</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Notas programadas para ti o tu equipo.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Nueva notificación */}
          {canCreate && (
            <button
              onClick={() => setCreating(true)}
              className="flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed border-primary/30 rounded-2xl text-primary hover:bg-primary/5 hover:border-primary/60 transition-all min-h-[120px]"
            >
              <Plus size={20} />
              <span className="text-xs font-semibold">Nueva notificación</span>
            </button>
          )}

          {/* Pendientes */}
          {pending.map((r) => (
            <div key={r.id} className="bg-card border rounded-2xl p-4 space-y-2.5 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-snug line-clamp-2 flex-1">{r.message}</p>
                <div className="flex items-center gap-1.5 shrink-0">
                  {STATUS_ICON[r.status]}
                  <button
                    onClick={() => deleteReminder.mutate(r.id)}
                    disabled={deleteReminder.isPending}
                    className="p-0.5 rounded text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Mail size={10} className="shrink-0" />
                <span className="truncate">{r.recipient_email || "—"}</span>
              </div>
              <div className="mt-auto pt-1 flex items-center justify-between">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  r.status === "failed"
                    ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800"
                    : "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-800"
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

          {pending.length === 0 && !canCreate && (
            <div className="sm:col-span-2 lg:col-span-3 py-10 text-center text-sm text-muted-foreground">
              No hay notificaciones pendientes.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

type Panel = "menu" | "calendar" | "form" | "personal" | "plantillas";

const CrmReminders = () => {
  const [panel, setPanel] = useState<Panel>("menu");

  if (panel === "calendar")   return <CalendarReminderPanel onBack={() => setPanel("menu")} />;
  if (panel === "form")       return <FormReminderPanel     onBack={() => setPanel("menu")} />;
  if (panel === "personal")   return <PersonalReminderPanel onBack={() => setPanel("menu")} />;
  if (panel === "plantillas") return (
    <div className="space-y-4">
      <button
        onClick={() => setPanel("menu")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} /> Volver
      </button>
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Megaphone size={16} className="text-primary" /> Plantillas de WhatsApp
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Plantillas transaccionales (UTILITY) para recordatorios y seguimientos automatizados.
        </p>
      </div>
      <CrmWaTemplates
        context="notification"
        forcedCategory="UTILITY"
        associationOptions={[
          { id: "calendar", label: "Recordatorio de cita",       type: "calendar" as const, entityId: null },
          { id: "form",     label: "Seguimiento de formulario",  type: "form"     as const, entityId: null },
          { id: "general",  label: "Envío general",              type: "general"  as const, entityId: null },
        ]}
      />
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Send size={18} className="text-primary" /> Envíos
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configura envíos automáticos de recordatorios y confirmaciones a tus contactos.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button onClick={() => setPanel("calendar")}
          className="flex flex-col items-start gap-3 p-5 bg-card border rounded-2xl hover:border-primary/40 hover:bg-secondary/30 transition-all text-left">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <CalendarDays size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Citas</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Envía recordatorios y confirmaciones antes o después de una cita.</p>
          </div>
          <ChevronRight size={13} className="text-muted-foreground mt-auto self-end" />
        </button>

        <button onClick={() => setPanel("form")}
          className="flex flex-col items-start gap-3 p-5 bg-card border rounded-2xl hover:border-primary/40 hover:bg-secondary/30 transition-all text-left">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
            <ClipboardList size={18} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-semibold">Formularios</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Envía un mensaje de seguimiento cuando alguien completa un formulario.</p>
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
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Programa envíos manuales para ti o tu equipo.</p>
          </div>
          <ChevronRight size={13} className="text-muted-foreground mt-auto self-end" />
        </button>

        <button onClick={() => setPanel("plantillas")}
          className="flex flex-col items-start gap-3 p-5 bg-card border rounded-2xl hover:border-primary/40 hover:bg-secondary/30 transition-all text-left">
          <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950/30 flex items-center justify-center">
            <Megaphone size={18} className="text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm font-semibold">Plantillas WhatsApp</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Plantillas UTILITY para envíos fuera de las 24h.</p>
          </div>
          <ChevronRight size={13} className="text-muted-foreground mt-auto self-end" />
        </button>
      </div>
    </div>
  );
};

export default CrmReminders;
