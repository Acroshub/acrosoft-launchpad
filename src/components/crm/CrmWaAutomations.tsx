import { useState, useMemo, useRef } from "react";
import {
  Plus, Trash2, Edit2, Zap, Clock,
  CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp,
  ArrowLeft, AlertCircle, Send, SkipForward,
  Image, Video, Mic, Upload,
} from "lucide-react";
import { toast } from "sonner";
import {
  useWaAutomations, useCreateWaAutomation, useUpdateWaAutomation,
  useDeleteWaAutomation, useAutomationQueue, useWaLabels, useWaTemplates,
} from "@/hooks/useCrmData";
import { useCurrentUser } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Switch } from "@/components/ui/switch";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";
import type { CrmWaAutomation, WaAutomationTrigger, WaAutomationMsgType, WaMediaType, WaVarSource } from "@/lib/supabase";

// ── Media upload field ────────────────────────────────────────────────────────

type WaMediaKind = "image" | "video" | "audio";

function MediaUploadField({
  mediaType, value, onChange, userId,
}: {
  mediaType: WaMediaKind;
  value: string;
  onChange: (url: string) => void;
  userId: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const accept = mediaType === "image"
    ? "image/jpeg,image/png,image/webp"
    : mediaType === "video"
    ? "video/mp4,video/3gpp"
    : "audio/ogg,audio/mpeg,audio/mp4,audio/aac,audio/amr";

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
      const path = `wa-campaigns/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("form-uploads").upload(path, file, { upsert: false });
      if (error) { toast.error("Error al subir archivo: " + error.message); return; }
      const { data: { publicUrl } } = supabase.storage.from("form-uploads").getPublicUrl(path);
      onChange(publicUrl);
    } catch {
      toast.error("Error al subir archivo");
    } finally {
      setUploading(false);
    }
  };

  const label = mediaType === "image" ? "imagen" : mediaType === "video" ? "video" : "audio";
  const Icon = mediaType === "image" ? Image : mediaType === "video" ? Video : Mic;

  return (
    <div className="space-y-1.5">
      <input ref={inputRef} type="file" accept={accept} className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
      {value ? (
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border bg-muted/20">
          {mediaType === "image" ? (
            <img src={value} alt="" className="h-14 w-14 object-cover rounded-lg shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Icon size={18} className="text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium">{label.charAt(0).toUpperCase() + label.slice(1)} subido</p>
            <p className="text-[10px] text-muted-foreground truncate">{value.split("/").pop()}</p>
          </div>
          <button type="button" onClick={() => onChange("")}
            className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground shrink-0">
            <XCircle size={14} />
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
          className="w-full flex flex-col items-center justify-center gap-2 h-24 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/20 transition-all text-muted-foreground disabled:opacity-50 cursor-pointer">
          {uploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
          <span className="text-xs">{uploading ? "Subiendo..." : `Seleccionar ${label}`}</span>
        </button>
      )}
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COUNTRY_REGIONS: { label: string; countries: { code: string; name: string; flag: string }[] }[] = [
  {
    label: "Norte América",
    countries: [
      { code: "1",  name: "USA / Canadá", flag: "🇺🇸" },
      { code: "52", name: "México",       flag: "🇲🇽" },
    ],
  },
  {
    label: "Centro América",
    countries: [
      { code: "53",  name: "Cuba",         flag: "🇨🇺" },
      { code: "502", name: "Guatemala",    flag: "🇬🇹" },
      { code: "503", name: "El Salvador",  flag: "🇸🇻" },
      { code: "504", name: "Honduras",     flag: "🇭🇳" },
      { code: "505", name: "Nicaragua",    flag: "🇳🇮" },
      { code: "506", name: "Costa Rica",   flag: "🇨🇷" },
      { code: "507", name: "Panamá",       flag: "🇵🇦" },
    ],
  },
  {
    label: "Sud América",
    countries: [
      { code: "57",  name: "Colombia",  flag: "🇨🇴" },
      { code: "58",  name: "Venezuela", flag: "🇻🇪" },
      { code: "593", name: "Ecuador",   flag: "🇪🇨" },
      { code: "51",  name: "Perú",      flag: "🇵🇪" },
      { code: "591", name: "Bolivia",   flag: "🇧🇴" },
      { code: "55",  name: "Brasil",    flag: "🇧🇷" },
      { code: "595", name: "Paraguay",  flag: "🇵🇾" },
      { code: "54",  name: "Argentina", flag: "🇦🇷" },
      { code: "56",  name: "Chile",     flag: "🇨🇱" },
      { code: "598", name: "Uruguay",   flag: "🇺🇾" },
    ],
  },
  {
    label: "Europa",
    countries: [
      { code: "351", name: "Portugal",      flag: "🇵🇹" },
      { code: "34",  name: "España",        flag: "🇪🇸" },
      { code: "33",  name: "Francia",       flag: "🇫🇷" },
      { code: "44",  name: "Reino Unido",   flag: "🇬🇧" },
      { code: "49",  name: "Alemania",      flag: "🇩🇪" },
      { code: "39",  name: "Italia",        flag: "🇮🇹" },
      { code: "31",  name: "Países Bajos",  flag: "🇳🇱" },
    ],
  },
];

// Lookup plano para el backend (getPhonePrefix sigue funcionando igual)
const COUNTRY_INFO: Record<string, { name: string; flag: string }> = Object.fromEntries(
  COUNTRY_REGIONS.flatMap(r => r.countries.map(c => [c.code, { name: c.name, flag: c.flag }]))
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return "hace un momento";
  if (diff < 3600)  return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function extractVarNums(text: string): number[] {
  return [...new Set([...text.matchAll(/\{\{(\d+)\}\}/g)].map(m => Number(m[1])))].sort((a, b) => a - b);
}

function triggerBadge(trigger: WaAutomationTrigger) {
  const map: Record<WaAutomationTrigger, { label: string; cls: string }> = {
    new_conversation: { label: "Conversación nueva", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    label_assigned:   { label: "Etiqueta asignada",  cls: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
    inactivity:       { label: "Inactividad",         cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  };
  const m = map[trigger];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${m.cls}`}>
      {m.label}
    </span>
  );
}

function msgTypeBadge(msgType: WaAutomationMsgType) {
  const map: Record<WaAutomationMsgType, string> = {
    free_text:               "Texto libre",
    template:                "Plantilla",
    free_text_with_fallback: "Inteligente",
  };
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground">
      {map[msgType]}
    </span>
  );
}

// ─── Var Selector (simplified: only contact_field and fixed) ──────────────────

function AutoVarSelector({
  varNum, value, onChange,
}: {
  varNum: number;
  value: WaVarSource | undefined;
  onChange: (v: WaVarSource) => void;
}) {
  const source = value?.source ?? "contact_field";
  return (
    <div className="space-y-1.5 p-3 rounded-xl bg-muted/30 border border-border">
      <span className="text-[11px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">{`{{${varNum}}}`}</span>
      <div className="flex flex-wrap gap-2 mt-1.5">
        <select
          value={source}
          onChange={e => {
            if (e.target.value === "contact_field") onChange({ source: "contact_field", field: "name" });
            else onChange({ source: "fixed", value: "" });
          }}
          className="h-8 px-2 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="contact_field">Campo del contacto</option>
          <option value="fixed">Texto fijo</option>
        </select>
        {source === "contact_field" && (
          <select
            value={(value as any)?.field ?? "name"}
            onChange={e => onChange({ source: "contact_field", field: e.target.value as any })}
            className="h-8 px-2 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="name">Nombre</option>
            <option value="phone">Teléfono</option>
          </select>
        )}
        {source === "fixed" && (
          <input
            value={(value as any)?.value ?? ""}
            onChange={e => onChange({ source: "fixed", value: e.target.value })}
            placeholder="Texto fijo para todos"
            className="flex-1 h-8 px-2 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/30 min-w-0"
          />
        )}
      </div>
    </div>
  );
}

// ─── Template selector ────────────────────────────────────────────────────────

function TemplateSelector({
  selectedId, onSelect,
}: {
  selectedId: string;
  onSelect: (id: string, body: string) => void;
}) {
  const { data: templates = [], isLoading } = useWaTemplates("remarketing");
  const approved = templates.filter(t => t.local_status === "APPROVED");
  if (isLoading) return <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-muted-foreground/50" /></div>;
  if (!approved.length) return (
    <p className="text-xs text-muted-foreground py-3 text-center">
      No tienes plantillas aprobadas. Ve a la sección Plantillas.
    </p>
  );
  return (
    <div className="space-y-2">
      {approved.map(t => (
        <button
          key={t.id} type="button"
          onClick={() => onSelect(t.id, t.body_text)}
          className={`w-full text-left p-3 rounded-xl border transition-all ${
            selectedId === t.id
              ? "border-primary bg-primary/5 ring-1 ring-primary/30"
              : "border-border hover:border-primary/40 hover:bg-muted/30"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold font-mono">{t.name}</span>
            <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full font-semibold">APROBADA</span>
            <span className="text-[10px] text-muted-foreground">{t.language}</span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{t.body_text}</p>
        </button>
      ))}
    </div>
  );
}

// ─── Form state type ───────────────────────────────────────────────────────────

type FormState = {
  name: string;
  is_active: boolean;
  trigger_type: WaAutomationTrigger;
  trigger_label_ids: string[];
  trigger_inactivity_hours: string;
  trigger_country_codes: string[];
  delay_hours: string;
  message_type: WaAutomationMsgType;
  message_text: string;
  media_type: WaMediaType | "none";
  media_url: string;
  template_id: string;
  template_body: string;
  template_var_map: Record<string, WaVarSource>;
};

function emptyForm(): FormState {
  return {
    name: "",
    is_active: true,
    trigger_type: "inactivity",
    trigger_label_ids: [],
    trigger_inactivity_hours: "6",
    trigger_country_codes: [],
    delay_hours: "0",
    message_type: "free_text",
    message_text: "",
    media_type: "none",
    media_url: "",
    template_id: "",
    template_body: "",
    template_var_map: {},
  };
}

function automationToForm(a: CrmWaAutomation): FormState {
  return {
    name: a.name,
    is_active: a.is_active,
    trigger_type: "inactivity",
    trigger_label_ids: a.trigger_label_ids ?? [],
    trigger_inactivity_hours: String(a.trigger_inactivity_hours ?? 6),
    trigger_country_codes: a.trigger_country_codes ?? [],
    delay_hours: String(a.delay_hours ?? 0),
    message_type: a.message_type,
    message_text: a.message_text ?? "",
    media_type: a.media_type ?? "none",
    media_url: a.media_url ?? "",
    template_id: a.template_id ?? "",
    template_body: "",
    template_var_map: (a.template_var_map ?? {}) as Record<string, WaVarSource>,
  };
}

// ─── Automation Form ──────────────────────────────────────────────────────────

function AutomationForm({
  initial, editing, onBack,
}: {
  initial: FormState;
  editing: CrmWaAutomation | null;
  onBack: () => void;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const { user } = useCurrentUser();
  const createAuto = useCreateWaAutomation();
  const updateAuto = useUpdateWaAutomation();
  const { data: labels = [] } = useWaLabels();

  const set = (patch: Partial<FormState>) => setForm(f => ({ ...f, ...patch }));

  const varNums = useMemo(
    () => form.template_body ? extractVarNums(form.template_body) : [],
    [form.template_body]
  );

  const needsTemplate = form.message_type === "template" || form.message_type === "free_text_with_fallback";
  const needsText = form.message_type === "free_text" || form.message_type === "free_text_with_fallback";

  const isValid = useMemo(() => {
    if (!form.name.trim()) return false;
    if (!form.trigger_inactivity_hours || Number(form.trigger_inactivity_hours) < 1) return false;
    if (needsText) {
      if (form.media_type === "none" && !form.message_text.trim()) return false;
      if (form.media_type !== "none" && !form.media_url.trim()) return false;
    }
    if (needsTemplate && !form.template_id) return false;
    return true;
  }, [form, needsText, needsTemplate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;

    const payload: Omit<CrmWaAutomation, "id" | "user_id" | "sent_count" | "skipped_count" | "failed_count" | "created_at"> = {
      name: form.name.trim(),
      is_active: form.is_active,
      trigger_type: "inactivity",
      trigger_label_ids: form.trigger_label_ids,
      trigger_inactivity_hours: Number(form.trigger_inactivity_hours),
      trigger_country_codes: form.trigger_country_codes,
      delay_hours: Number(form.delay_hours) || 0,
      message_type: form.message_type,
      message_text: needsText && form.media_type !== "audio" ? form.message_text.trim() : null,
      media_type: needsText && form.media_type !== "none" ? form.media_type as WaMediaType : null,
      media_url: needsText && form.media_type !== "none" ? form.media_url.trim() : null,
      template_id: needsTemplate ? form.template_id : null,
      template_var_map: needsTemplate ? form.template_var_map : {},
    };

    try {
      if (editing) {
        await updateAuto.mutateAsync({ id: editing.id, ...payload });
        toast.success("Automatización actualizada");
      } else {
        await createAuto.mutateAsync(payload);
        toast.success("Automatización creada");
      }
      onBack();
    } catch (err: any) {
      toast.error(err.message ?? "Error al guardar");
    }
  }

  const isPending = createAuto.isPending || updateAuto.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={14} /> Volver
        </button>
        <h2 className="text-sm font-semibold flex-1">{editing ? "Editar automatización" : "Nueva automatización"}</h2>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${form.is_active ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
            {form.is_active ? "Activa" : "Inactiva"}
          </span>
          <Switch
            checked={form.is_active}
            onCheckedChange={v => set({ is_active: v })}
          />
        </div>
      </div>

      {/* Nombre */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground">Nombre</label>
        <input
          value={form.name}
          onChange={e => set({ name: e.target.value })}
          placeholder="Ej: Seguimiento a nuevos contactos"
          className="w-full h-9 px-3 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Trigger — solo inactividad */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-foreground">Disparador</label>
        <div className="p-3 rounded-xl border border-primary bg-primary/5 ring-1 ring-primary/30">
          <p className="text-xs font-semibold">Inactividad</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Se activa cuando un contacto no ha escrito en X horas</p>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <label className="text-xs text-muted-foreground shrink-0">Horas sin actividad:</label>
          <input
            type="number" min="1" max="720"
            value={form.trigger_inactivity_hours}
            onChange={e => set({ trigger_inactivity_hours: e.target.value })}
            className="w-24 h-8 px-2 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 text-center"
          />
          <span className="text-xs text-muted-foreground">horas</span>
        </div>
      </div>

      {/* Filtro por etiquetas */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground">Filtro por etiquetas <span className="text-muted-foreground font-normal">(opcional)</span></label>
        <p className="text-[11px] text-muted-foreground">Solo se enviará a contactos que tengan al menos una de estas etiquetas. Dejar vacío = todos los contactos.</p>
        {labels.length === 0
          ? <p className="text-xs text-muted-foreground/70">No hay etiquetas disponibles.</p>
          : (
            <div className="flex flex-wrap gap-1.5">
              {labels.map(lbl => {
                const selected = form.trigger_label_ids.includes(lbl.id);
                return (
                  <button key={lbl.id} type="button"
                    onClick={() => set({
                      trigger_label_ids: selected
                        ? form.trigger_label_ids.filter(id => id !== lbl.id)
                        : [...form.trigger_label_ids, lbl.id],
                    })}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {lbl.name}
                  </button>
                );
              })}
            </div>
          )
        }
      </div>

      {/* Country filter */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-foreground">Filtro por país <span className="text-muted-foreground font-normal">(opcional)</span></label>
        <p className="text-[11px] text-muted-foreground">Si seleccionas países, solo se activará para contactos de esos países.</p>
        <div className="space-y-2.5">
          {COUNTRY_REGIONS.map(region => (
            <div key={region.label}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1.5">{region.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {region.countries.map(({ code, name, flag }) => {
                  const selected = form.trigger_country_codes.includes(code);
                  return (
                    <button key={code} type="button"
                      onClick={() => set({
                        trigger_country_codes: selected
                          ? form.trigger_country_codes.filter(c => c !== code)
                          : [...form.trigger_country_codes, code],
                      })}
                      className={`px-2 py-1 rounded-lg text-xs border transition-all ${
                        selected
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border bg-muted/20 text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {flag} {name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delay */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground">¿Cuánto tiempo esperar antes de enviar?</label>
        <p className="text-[11px] text-muted-foreground">
          Tiempo entre que se activa el disparador y que se envía el mensaje.{" "}
          <span className="text-foreground/70">
            Ej: si alguien te escribe por primera vez y pones 2h, recibirá tu mensaje 2 horas después.
          </span>
        </p>
        <div className="flex items-center gap-2">
          <input
            type="number" min="0" max="8760"
            value={form.delay_hours}
            onChange={e => set({ delay_hours: e.target.value })}
            className="w-24 h-9 px-2 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 text-center font-semibold"
          />
          <span className="text-xs text-muted-foreground">horas</span>
          <span className="text-[10px] text-muted-foreground/60 italic">
            {Number(form.delay_hours) === 0 ? "· Envío inmediato" : Number(form.delay_hours) === 1 ? "· 1 hora de espera" : `· ${form.delay_hours} horas de espera`}
          </span>
        </div>
      </div>

      {/* Message type */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-foreground">Tipo de mensaje</label>
        <div className="grid grid-cols-1 gap-2">
          {([
            {
              value: "free_text",
              label: "Texto libre",
              desc: "Solo aplica si el contacto escribió en las últimas 24h. Fuera de ese tiempo, el mensaje se omite.",
            },
            {
              value: "template",
              label: "Plantilla aprobada",
              desc: "Usa una plantilla de Meta. Se envía siempre, sin importar cuándo fue el último mensaje.",
            },
            {
              value: "free_text_with_fallback",
              label: "Inteligente: texto libre o plantilla",
              desc: "Si el contacto está en las últimas 24h → envía texto libre. Si no → envía la plantilla automáticamente.",
            },
          ] as const).map(opt => (
            <button
              key={opt.value} type="button"
              onClick={() => set({ message_type: opt.value, media_type: "none", media_url: "" })}
              className={`w-full text-left p-3 rounded-xl border transition-all ${
                form.message_type === opt.value
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border hover:border-primary/40 hover:bg-muted/30"
              }`}
            >
              <p className="text-xs font-semibold">{opt.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Message text / media */}
      {needsText && (
        <div className="space-y-3">
          <label className="text-xs font-semibold text-foreground">
            {form.message_type === "free_text_with_fallback" ? "Mensaje de texto libre (dentro de 24h)" : "Mensaje"}
          </label>

          {/* Media type selector */}
          <div className="grid grid-cols-4 gap-1.5">
            {([
              { value: "none",  icon: <Send size={13} />,  label: "Solo texto" },
              { value: "image", icon: <Image size={13} />, label: "Imagen" },
              { value: "video", icon: <Video size={13} />, label: "Video" },
              { value: "audio", icon: <Mic size={13} />,   label: "Audio" },
            ] as const).map(opt => (
              <button key={opt.value} type="button"
                onClick={() => set({ media_type: opt.value, media_url: "" })}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                  form.media_type === opt.value
                    ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/30"
                    : "border-border hover:border-primary/40 text-muted-foreground"
                }`}
              >
                {opt.icon}
                <span className="text-[10px]">{opt.label}</span>
              </button>
            ))}
          </div>

          {/* Media upload */}
          {form.media_type !== "none" && (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Archivo de {form.media_type === "image" ? "imagen" : form.media_type === "video" ? "video" : "audio"} *
              </label>
              <MediaUploadField
                mediaType={form.media_type as WaMediaKind}
                value={form.media_url}
                onChange={url => set({ media_url: url })}
                userId={user?.id ?? ""}
              />
            </div>
          )}

          {/* Caption / text (hidden for audio) */}
          {form.media_type !== "audio" && (
            <textarea
              value={form.message_text}
              onChange={e => set({ message_text: e.target.value })}
              rows={4}
              placeholder={form.media_type === "none"
                ? "Escribe el mensaje que se enviará..."
                : "Pie de foto o descripción (opcional)..."}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          )}
        </div>
      )}

      {/* Template */}
      {needsTemplate && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            {form.message_type === "free_text_with_fallback" ? "Plantilla fallback (fuera de 24h)" : "Plantilla aprobada"}
          </label>
          <TemplateSelector
            selectedId={form.template_id}
            onSelect={(id, body) => {
              set({ template_id: id, template_body: body, template_var_map: {} });
            }}
          />
          {form.template_id && varNums.length > 0 && (
            <div className="mt-2 space-y-2">
              <p className="text-[11px] text-muted-foreground">Configura las variables de la plantilla:</p>
              {varNums.map(num => (
                <AutoVarSelector
                  key={num}
                  varNum={num}
                  value={form.template_var_map[String(num)]}
                  onChange={v => set({ template_var_map: { ...form.template_var_map, [String(num)]: v } })}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit" disabled={!isValid || isPending}
        className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
      >
        {isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
        {editing ? "Guardar cambios" : "Crear automatización"}
      </button>
    </form>
  );
}

// ─── Queue Detail ─────────────────────────────────────────────────────────────

function AutomationQueueDetail({ automationId }: { automationId: string }) {
  const { data: items = [], isLoading } = useAutomationQueue(automationId);

  if (isLoading) return <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-muted-foreground/50" /></div>;
  if (!items.length) return <p className="text-xs text-muted-foreground text-center py-3">Sin actividad registrada.</p>;

  const statusIcon = (s: string) => {
    if (s === "sent")    return <CheckCircle2 size={12} className="text-green-500" />;
    if (s === "failed")  return <XCircle size={12} className="text-red-500" />;
    if (s === "skipped") return <SkipForward size={12} className="text-orange-400" />;
    if (s === "pending") return <Clock size={12} className="text-blue-400" />;
    return <Clock size={12} className="text-muted-foreground" />;
  };

  const statusLabel = (s: string) => {
    if (s === "sent")    return "Enviado";
    if (s === "failed")  return "Fallido";
    if (s === "skipped") return "Omitido";
    if (s === "pending") return "Pendiente";
    return s;
  };

  return (
    <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
      {items.map(item => (
        <div key={item.id} className="flex items-start gap-2 py-1.5 border-b border-border/50 last:border-0">
          <div className="mt-0.5 shrink-0">{statusIcon(item.status)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-medium">{statusLabel(item.status)}</span>
              <span className="text-[10px] text-muted-foreground">{relativeTime(item.created_at)}</span>
              {item.scheduled_at && item.status === "pending" && (
                <span className="text-[10px] text-blue-500">
                  · envío: {new Date(item.scheduled_at).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
            {item.error_message && (
              <p className="text-[10px] text-red-500 mt-0.5 truncate">{item.error_message}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Automation Card ──────────────────────────────────────────────────────────

function AutomationCard({
  automation,
  onEdit,
  onDelete,
}: {
  automation: CrmWaAutomation;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const updateAuto = useUpdateWaAutomation();

  async function toggleActive() {
    try {
      await updateAuto.mutateAsync({ id: automation.id, is_active: !automation.is_active });
      toast.success(automation.is_active ? "Automatización pausada" : "Automatización activada");
    } catch {
      toast.error("Error al cambiar estado");
    }
  }

  const countryFlags = (automation.trigger_country_codes ?? [])
    .map(code => COUNTRY_INFO[code]?.flag ?? code)
    .join(" ");

  return (
    <div className={`rounded-2xl border bg-card transition-all ${automation.is_active ? "border-border" : "border-border/50 opacity-70"}`}>
      <div className="p-4 space-y-2.5">
        {/* Header row */}
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold truncate">{automation.name}</h3>
              {triggerBadge(automation.trigger_type)}
              {msgTypeBadge(automation.message_type)}
            </div>
            <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground">
              {automation.trigger_type === "inactivity" && automation.trigger_inactivity_hours && (
                <span className="flex items-center gap-1"><Clock size={9} />{automation.trigger_inactivity_hours}h sin actividad</span>
              )}
              {automation.delay_hours > 0 && (
                <span>· Demora {automation.delay_hours}h</span>
              )}
              {countryFlags && <span>· {countryFlags}</span>}
              <span>· {relativeTime(automation.created_at)}</span>
            </div>
          </div>

          {/* Active toggle */}
          <Switch
            checked={automation.is_active}
            onCheckedChange={toggleActive}
            disabled={updateAuto.isPending}
            className="shrink-0"
          />
        </div>

        {/* Stats */}
        <div className="flex gap-3">
          <div className="flex items-center gap-1 text-[11px]">
            <Send size={10} className="text-green-500" />
            <span className="font-semibold">{automation.sent_count}</span>
            <span className="text-muted-foreground">enviados</span>
          </div>
          <div className="flex items-center gap-1 text-[11px]">
            <SkipForward size={10} className="text-orange-400" />
            <span className="font-semibold">{automation.skipped_count}</span>
            <span className="text-muted-foreground">omitidos</span>
          </div>
          <div className="flex items-center gap-1 text-[11px]">
            <XCircle size={10} className="text-red-400" />
            <span className="font-semibold">{automation.failed_count}</span>
            <span className="text-muted-foreground">fallidos</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button" onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {expanded ? "Ocultar historial" : "Ver historial"}
          </button>
          <div className="flex-1" />
          <button
            type="button" onClick={onEdit}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-2.5 py-1 hover:border-primary/40 transition-all"
          >
            <Edit2 size={11} /> Editar
          </button>
          <button
            type="button" onClick={onDelete}
            className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 border border-red-200 dark:border-red-900/40 rounded-lg px-2.5 py-1 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
          >
            <Trash2 size={11} /> Eliminar
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border px-4 pb-4">
          <AutomationQueueDetail automationId={automation.id} />
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CrmWaAutomations() {
  const { data: automations = [], isLoading } = useWaAutomations();
  const deleteAuto = useDeleteWaAutomation();
  const [view, setView] = useState<"list" | "form">("list");
  const [editing, setEditing] = useState<CrmWaAutomation | null>(null);
  const [formInitial, setFormInitial] = useState<FormState>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<CrmWaAutomation | null>(null);

  function handleCreate() {
    setEditing(null);
    setFormInitial(emptyForm());
    setView("form");
  }

  function handleEdit(a: CrmWaAutomation) {
    setEditing(a);
    setFormInitial(automationToForm(a));
    setView("form");
  }

  if (view === "form") {
    return (
      <AutomationForm
        initial={formInitial}
        editing={editing}
        onBack={() => setView("list")}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-secondary/40 border border-border">
        <AlertCircle size={13} className="text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Las automatizaciones se ejecutan en segundo plano cada minuto. Puedes configurar mensajes automáticos basados en disparadores como conversaciones nuevas, etiquetas del Agente IA o períodos de inactividad.
        </p>
      </div>

      {/* Header */}
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold flex-1">Automatizaciones</h2>
        <button
          type="button" onClick={handleCreate}
          className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus size={13} /> Nueva
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={20} className="animate-spin text-muted-foreground/50" />
        </div>
      ) : automations.length === 0 ? (
        <div className="text-center py-14 space-y-2">
          <Zap size={28} className="mx-auto text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">Sin automatizaciones</p>
          <p className="text-xs text-muted-foreground/70">Crea tu primera automatización para enviar mensajes de forma automática.</p>
          <button
            type="button" onClick={handleCreate}
            className="mt-2 inline-flex items-center gap-1.5 h-8 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
          >
            <Plus size={13} /> Crear automatización
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {automations.map(a => (
            <AutomationCard
              key={a.id}
              automation={a}
              onEdit={() => handleEdit(a)}
              onDelete={() => setDeleteTarget(a)}
            />
          ))}
        </div>
      )}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => { if (!open) setDeleteTarget(null); }}
        description={`Se eliminará la automatización "${deleteTarget?.name}" y todo su historial de envíos permanentemente.`}
        isPending={deleteAuto.isPending}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteAuto.mutateAsync(deleteTarget.id);
          setDeleteTarget(null);
          toast.success("Automatización eliminada");
        }}
      />
    </div>
  );
}
