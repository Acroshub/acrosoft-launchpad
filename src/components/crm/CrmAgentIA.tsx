import { useState, useEffect, useRef, useMemo } from "react";
import {
  Bot, Settings, Send, Wifi, WifiOff, MessageSquare, Loader2,
  CheckCircle2, AlertTriangle, Copy, Trash2, X, Eye, EyeOff,
  Check, ChevronRight, ChevronLeft, MoreVertical, Zap, Clock, Calendar, Phone, Sparkles, Lock,
  User, Upload, Bell, Tag, Plus, Pencil, UserPlus, Search, Paperclip, CreditCard, BadgeCheck, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import WeeklySchedulePicker from "@/components/shared/WeeklySchedulePicker";
import type { WeeklySchedule } from "@/components/shared/WeeklySchedulePicker";
import {
  useAIAgentConfig, useUpsertAIAgentConfig,
  useWaConversations, useWaMessages,
  useWaLabels, useUpsertWaLabel, useDeleteWaLabel,
  useAllConversationLabels, useConversationLabels, useToggleConversationLabel,
  useSetWaConversationMode, useDeleteWaConversation,
  useAssignConversation, useStaff,
  useSearchWaMessages,
  useBusinessProfile,
  useProducts, useServices,
  useCatalogs, useCatalogProductsMap,
  useCalendars,
  useAiPendingSales, useUpdateSale,
} from "@/hooks/useCrmData";
import { supabase } from "@/lib/supabase";
import type { CrmWaConversation, CrmWaMessage, CrmStaff, CrmSale } from "@/lib/supabase";
import { useCurrentUser, useStaffPermissions } from "@/hooks/useAuth";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────
const WEBHOOK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`;

const DEFAULT_SCHEDULE: WeeklySchedule = {
  "Lun": { open: true, slots: [{ from: "12:00 AM", to: "11:59 PM" }] },
  "Mar": { open: true, slots: [{ from: "12:00 AM", to: "11:59 PM" }] },
  "Mié": { open: true, slots: [{ from: "12:00 AM", to: "11:59 PM" }] },
  "Jue": { open: true, slots: [{ from: "12:00 AM", to: "11:59 PM" }] },
  "Vie": { open: true, slots: [{ from: "12:00 AM", to: "11:59 PM" }] },
  "Sáb": { open: true, slots: [{ from: "12:00 AM", to: "11:59 PM" }] },
  "Dom": { open: true, slots: [{ from: "12:00 AM", to: "11:59 PM" }] },
};

const TIMEZONES = [
  "America/Mexico_City", "America/Monterrey", "America/Cancun",
  "America/Bogota", "America/Lima", "America/Santiago",
  "America/Argentina/Buenos_Aires", "America/Caracas",
  "America/Guayaquil", "America/La_Paz", "America/Asuncion",
  "America/Montevideo", "America/Panama", "America/Guatemala",
  "America/El_Salvador", "America/Santo_Domingo",
  "Europe/Madrid", "America/New_York", "America/Los_Angeles",
];

const PROMPT_VARIABLES = [
  { label: "{{negocio.nombre}}", desc: "Nombre del negocio" },
  { label: "{{negocio.servicios}}", desc: "Lista de servicios y precios" },
  { label: "{{negocio.descripcion}}", desc: "Descripción del negocio" },
  { label: "{{contacto.nombre}}", desc: "Nombre del contacto" },
  { label: "{{fecha.hoy}}", desc: "Fecha actual" },
];

const AGENT_OBJECTIVES = [
  "Agendar citas", "Vender productos", "Responder dudas",
  "Capturar leads", "Dar soporte postventa", "Calificar prospectos",
];

const AGENT_PERSONALITIES = [
  "Profesional y formal", "Amigable y cercano", "Entusiasta y dinámico",
  "Empático y tranquilizador", "Directo y conciso",
];

const AGENT_PROACTIVITIES = [
  { val: "reactivo", label: "Reactivo", sub: "Solo responde a lo que pregunta el cliente" },
  { val: "moderado", label: "Moderado", sub: "Sugiere cuando hay una oportunidad clara" },
  { val: "proactivo", label: "Proactivo", sub: "Siempre orienta la conversación al objetivo" },
];

const RESPONSE_LENGTHS = [
  { val: "short", label: "Cortas" },
  { val: "normal", label: "Normales" },
  { val: "detailed", label: "Detalladas" },
];

const EMOJI_LEVELS = [
  { val: "none", label: "Ninguno" },
  { val: "poco", label: "Poco" },
  { val: "medio", label: "Medio" },
  { val: "mucho", label: "Mucho" },
];

const DATA_COLLECT_OPTIONS = [
  "Nombre", "Teléfono", "Email", "Presupuesto",
  "Necesidad específica", "Zona/ciudad", "Tamaño de empresa", "Fecha preferida",
];

const DEFAULT_PROMPT = `Eres un asistente de {{negocio.nombre}}, una empresa dedicada a brindar el mejor servicio a sus clientes.

Servicios disponibles:
{{negocio.servicios}}

Responde siempre en español, de forma amable y concisa (máximo 3-4 líneas por mensaje).
No uses listas largas ni emojis excesivos.
Si el cliente necesita hablar con una persona, dile que un asesor lo contactará pronto.`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return "ahora";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

const CURRENCY_SYMBOLS_UI: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", BOB: "Bs.", PEN: "S/", COP: "COP$",
  MXN: "MX$", ARS: "ARS$", CLP: "CLP$", BRL: "R$",
};
function formatSaleAmount(amount: number, currency: string | null): string {
  const cur = (currency ?? "USD").toUpperCase();
  const sym = CURRENCY_SYMBOLS_UI[cur] ?? `${cur} `;
  return `${sym}${Number(amount).toFixed(2)}`;
}

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(`${label} copiado`));
}

// ─── Próximamente (SaaS clients) ──────────────────────────────────────────────
const ProximamenteScreen = () => (
  <div className="flex flex-col items-center justify-center h-full gap-5 text-center px-8">
    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
      <Lock size={28} className="text-primary/60" />
    </div>
    <div className="space-y-1.5 max-w-xs">
      <h2 className="text-base font-semibold">Agente IA — Próximamente</h2>
      <p className="text-sm text-muted-foreground">
        El agente de WhatsApp con IA estará disponible pronto para tu cuenta. Contacta a soporte para más información.
      </p>
    </div>
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Bot size={13} />
      <span>Powered by Claude · Meta WhatsApp API</span>
    </div>
  </div>
);

// ─── Step indicator ───────────────────────────────────────────────────────────
const StepIndicator = ({ current, total }: { current: number; total: number }) => (
  <div className="flex items-center gap-2">
    {Array.from({ length: total }, (_, i) => i + 1).map((step) => (
      <div key={step} className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
          step < current ? "bg-primary text-primary-foreground" :
          step === current ? "bg-primary text-primary-foreground" :
          "bg-secondary text-muted-foreground"
        }`}>
          {step < current ? <Check size={13} /> : step}
        </div>
        {step < total && (
          <div className={`w-8 h-0.5 rounded ${step < current ? "bg-primary" : "bg-border"}`} />
        )}
      </div>
    ))}
  </div>
);

// ─── Setup Wizard ─────────────────────────────────────────────────────────────
const SetupWizard = ({ onComplete }: { onComplete: () => void }) => {
  const upsert = useUpsertAIAgentConfig();
  const { data: existingConfig } = useAIAgentConfig();
  const { data: businessProfile } = useBusinessProfile();
  const { data: allProducts = [] } = useProducts();
  const { data: allServices = [] } = useServices();
  const { data: catalogs = [] } = useCatalogs();
  const { data: catalogProductsMap = new Map() } = useCatalogProductsMap();
  const { data: calendars = [] } = useCalendars();

  const [step, setStep]         = useState(1);
  const [testing, setTesting]   = useState(false);
  const [testResult, setTestResult] = useState<{ phone: string; name: string } | null>(null);
  const [verified, setVerified] = useState(false);
  const [saving, setSaving]     = useState(false);

  // Step 1 — Conexión
  const [phoneNumberId, setPhoneNumberId] = useState(existingConfig?.phone_number_id ?? "");
  const [accessToken, setAccessToken]     = useState(existingConfig?.access_token ?? "");
  const [wabaId, setWabaId]               = useState(existingConfig?.waba_id ?? "");
  const [appSecret, setAppSecret]         = useState(existingConfig?.app_secret ?? "");
  const [showToken, setShowToken]         = useState(false);
  const [showSecret, setShowSecret]       = useState(false);
  const verifyToken = existingConfig?.webhook_verify_token ?? "—";

  const setPhoneNumberIdSafe = (v: string) => { setPhoneNumberId(v); setVerified(false); setTestResult(null); };
  const setAccessTokenSafe   = (v: string) => { setAccessToken(v);   setVerified(false); setTestResult(null); };

  // Step 2 — Agente
  const [agentName, setAgentName]       = useState(existingConfig?.agent_name ?? "Asistente");
  const [systemPrompt, setSystemPrompt] = useState(existingConfig?.system_prompt ?? "");
  const promptRef = useRef<HTMLTextAreaElement>(null);

  // Step 2 — Config estratégica B15-1
  const [agentObjectives, setAgentObjectives]     = useState<string[]>(existingConfig?.agent_objectives ?? []);
  const [agentPersonality, setAgentPersonality]   = useState(existingConfig?.agent_personality ?? "");
  const [agentProactivity, setAgentProactivity]   = useState(existingConfig?.agent_proactivity ?? "");
  const [responseLengthWiz, setResponseLengthWiz] = useState(existingConfig?.response_length ?? "normal");
  const [emojiLevelWiz, setEmojiLevelWiz]         = useState(existingConfig?.emoji_level ?? "poco");
  const [agentFaqWiz, setAgentFaqWiz]             = useState<{ q: string; a: string }[]>(existingConfig?.agent_faq ?? []);
  const [agentDataCollectWiz, setAgentDataCollectWiz] = useState<string[]>(existingConfig?.agent_data_collect ?? []);
  const [customDataFieldWiz, setCustomDataFieldWiz]   = useState("");

  // Step 3 — Capacidades
  const [canBook, setCanBook]                       = useState(existingConfig?.can_book_appointments ?? false);
  const [schedulingCalendarIdWiz, setSchedulingCalendarIdWiz] = useState<string>(existingConfig?.scheduling_calendar_id ?? "");
  const [canContacts, setCanContacts]               = useState(existingConfig?.can_create_contacts ?? true);
  const [canServices, setCanServices]         = useState(existingConfig?.can_answer_services ?? true);
  const [canTransfer, setCanTransfer]         = useState(existingConfig?.can_transfer_human ?? false);
  const [autoDetectPayments, setAutoDetectPayments] = useState(existingConfig?.auto_detect_payments ?? false);
  const [wizPaymentNotify, setWizPaymentNotify]       = useState(!!(existingConfig?.payment_notify_email));
  const [wizPaymentEmail, setWizPaymentEmail]         = useState(existingConfig?.payment_notify_email ?? "");
  const [wizNotifyOnTransfer, setWizNotifyOnTransfer] = useState(existingConfig?.notify_on_transfer ?? false);
  const [wizNotifyEmail, setWizNotifyEmail]           = useState(existingConfig?.notify_email ?? "");
  // Catálogo IA
  const [productsMode, setProductsMode]               = useState<"all"|"selected"|"none">(existingConfig?.products_mode ?? "all");
  const [selectedProductIds, setSelectedProductIds]   = useState<string[]>(existingConfig?.selected_product_ids ?? []);
  const [servicesMode, setServicesMode]               = useState<"all"|"selected"|"none">(existingConfig?.services_mode ?? "all");
  const [selectedServiceIds, setSelectedServiceIds]   = useState<string[]>(existingConfig?.selected_service_ids ?? []);

  // Step 4 — Horario
  const [schedule, setSchedule]     = useState<WeeklySchedule>(
    (existingConfig?.schedule as WeeklySchedule | null) ?? DEFAULT_SCHEDULE
  );
  const [timezone, setTimezone]     = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [offHoursMsg, setOffHoursMsg] = useState(existingConfig?.off_hours_message ?? "");
  const timezoneInitialized         = useRef(false);

  // Step 5 — Perfil WA
  const [bio, setBio]                   = useState("");
  const [savingBio, setSavingBio]       = useState(false);
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const wizardPhotoRef                  = useRef<HTMLInputElement>(null);

  // Auto-crear fila en DB al montar para generar el verify_token de inmediato
  useEffect(() => {
    if (!existingConfig) {
      upsert.mutateAsync({ agent_name: "Asistente" }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-detect timezone from existing config or business profile
  useEffect(() => {
    if (timezoneInitialized.current) return;
    const tz = existingConfig?.timezone ?? businessProfile?.timezone;
    if (tz) {
      setTimezone(tz);
      timezoneInitialized.current = true;
    } else if (existingConfig !== undefined && businessProfile !== undefined) {
      timezoneInitialized.current = true;
    }
  }, [existingConfig, businessProfile]);

  const handleTestConnection = async () => {
    if (!phoneNumberId || !accessToken) { toast.error("Ingresa el Phone Number ID y el Access Token"); return; }
    setTesting(true); setTestResult(null);
    try {
      // 1. Verificar credenciales y obtener número
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${phoneNumberId}?fields=display_phone_number,verified_name`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!res.ok) throw new Error(`Error ${res.status}: ${await res.text()}`);
      const json = await res.json();
      setTestResult({ phone: json.display_phone_number, name: json.verified_name });
      setVerified(true);
      await upsert.mutateAsync({ verified_phone: json.display_phone_number ?? null }).catch(() => {});

      // 2. Registrar número en Cloud API (paso oculto que Meta no muestra en el portal)
      await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/register`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", pin: "123456" }),
      }).catch(() => {}); // No bloqueamos si falla (ej. ya registrado con otro PIN)

      toast.success("¡Conexión exitosa!");
    } catch (err: any) {
      setVerified(false);
      toast.error(err.message?.slice(0, 120) ?? "Error al conectar");
    } finally { setTesting(false); }
  };

  const handleSaveStep1 = async () => {
    if (!phoneNumberId || !accessToken || !appSecret) { toast.error("Completa todos los campos obligatorios"); return; }
    await upsert.mutateAsync({ phone_number_id: phoneNumberId, access_token: accessToken, waba_id: wabaId || null, app_secret: appSecret });

    // 3. Suscribir app al WABA para que Meta envíe los mensajes al webhook
    if (wabaId) {
      await fetch(`https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      }).catch(() => {}); // No bloqueamos si falla
    }

    setStep(2);
  };

  const handleSaveStep2 = async () => {
    if (!agentName.trim()) { toast.error("El nombre del agente es obligatorio"); return; }
    await upsert.mutateAsync({
      agent_name: agentName.trim(),
      model: "claude-haiku-4-5-20251001",
      system_prompt: systemPrompt || null,
      agent_objectives: agentObjectives,
      agent_personality: agentPersonality || null,
      agent_proactivity: agentProactivity || null,
      response_length: responseLengthWiz as "short" | "normal" | "detailed",
      emoji_level: emojiLevelWiz as "none" | "poco" | "medio" | "mucho",
      agent_faq: agentFaqWiz.length > 0 ? agentFaqWiz : null,
    });
    setStep(3);
  };

  const handleSaveStep3 = async () => {
    await upsert.mutateAsync({
      can_book_appointments: canBook,
      scheduling_calendar_id: canBook && schedulingCalendarIdWiz ? schedulingCalendarIdWiz : null,
      can_create_contacts: canContacts,
      can_answer_services: canServices,
      can_transfer_human: canTransfer,
      auto_detect_payments: autoDetectPayments,
      payment_notify_email: autoDetectPayments && wizPaymentNotify ? (wizPaymentEmail.trim() || null) : null,
      notify_on_transfer: wizNotifyOnTransfer,
      notify_email: wizNotifyOnTransfer ? (wizNotifyEmail.trim() || null) : null,
      products_mode: productsMode,
      selected_product_ids: productsMode === "selected" ? selectedProductIds : [],
      services_mode: servicesMode,
      selected_service_ids: servicesMode === "selected" ? selectedServiceIds : [],
      agent_data_collect: agentDataCollectWiz,
    });
    setStep(4);
  };

  const handleSaveStep4 = async () => {
    await upsert.mutateAsync({ schedule, timezone, off_hours_message: offHoursMsg || null });
    // Cargar perfil actual al avanzar al paso 5
    if (phoneNumberId && accessToken) {
      fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/whatsapp_business_profile?fields=about,profile_picture_url`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then(r => r.json()).then(d => {
        if (d.data?.[0]) {
          setBio(d.data[0].about ?? "");
          setProfilePicUrl(d.data[0].profile_picture_url ?? null);
        }
      }).catch(() => {});
    }
    setStep(5);
  };

  const handleWizardPhotoUpload = async (file: File) => {
    if (!phoneNumberId || !accessToken || !wabaId) return;
    setUploadingPhoto(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { data, error } = await supabase.functions.invoke("upload-wa-profile-photo", {
        body: { base64, mime_type: file.type },
      });
      if (error || data?.error) throw new Error(data?.error ?? error?.message ?? "Error desconocido");
      setProfilePicUrl(URL.createObjectURL(file));
      toast.success("Foto de perfil actualizada");
    } catch (e: any) {
      toast.error(e.message?.slice(0, 160) ?? "Error al subir foto");
    } finally { setUploadingPhoto(false); }
  };

  const handleSaveStep5Bio = async () => {
    if (!phoneNumberId || !accessToken || !bio.trim()) { setStep(6); return; }
    setSavingBio(true);
    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/whatsapp_business_profile`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", about: bio.trim() }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}: ${await res.text()}`);
      toast.success("Bio guardada");
    } catch (e: any) {
      toast.error(e.message?.slice(0, 100) ?? "Error al guardar bio");
    }
    finally { setSavingBio(false); setStep(6); }
  };

  const handleActivar = async () => {
    setSaving(true);
    try {
      await upsert.mutateAsync({ is_active: true });
      toast.success("¡Asistente IA activado!");
      onComplete();
    } catch { toast.error("Error al activar"); }
    finally { setSaving(false); }
  };

  const insertVariable = (variable: string) => {
    const el = promptRef.current;
    if (!el) return;
    const start = el.selectionStart ?? systemPrompt.length;
    const end   = el.selectionEnd   ?? systemPrompt.length;
    setSystemPrompt(systemPrompt.slice(0, start) + variable + systemPrompt.slice(end));
    setTimeout(() => { el.focus(); el.setSelectionRange(start + variable.length, start + variable.length); }, 0);
  };

  const STEP_LABELS = ["Conexión", "Agente", "Capacidades", "Horario", "Perfil WA", "Activar"];

  return (
    <div className="flex flex-col items-center justify-center min-h-full py-10 px-4">
      <div className="w-full max-w-lg space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Bot size={24} className="text-primary" />
          </div>
          <h1 className="text-lg font-semibold">Configura tu Agente IA</h1>
          <p className="text-sm text-muted-foreground">{STEP_LABELS[step - 1]} — Paso {step} de 6</p>
        </div>

        <StepIndicator current={step} total={6} />

        {/* ── Step 1: Conexión ── */}
        {step === 1 && (
          <div className="bg-card border rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2"><Wifi size={14} />Conexión con Meta WhatsApp</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Necesitas una app en Meta for Developers con WhatsApp Business habilitado.</p>
            </div>
            <div className="bg-secondary/40 rounded-xl p-4 space-y-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Configura en el panel de Meta</p>
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Webhook URL</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[11px] bg-background border rounded-lg px-2.5 py-1.5 truncate">{WEBHOOK_URL}</code>
                    <button onClick={() => copyToClipboard(WEBHOOK_URL, "Webhook URL")} className="p-1.5 rounded-lg hover:bg-secondary transition-colors"><Copy size={13} className="text-muted-foreground" /></button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Verify Token</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[11px] bg-background border rounded-lg px-2.5 py-1.5 truncate">{verifyToken}</code>
                    <button onClick={() => copyToClipboard(verifyToken, "Verify Token")} className="p-1.5 rounded-lg hover:bg-secondary transition-colors"><Copy size={13} className="text-muted-foreground" /></button>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Phone Number ID <span className="text-destructive">*</span></label>
                <Input value={phoneNumberId} onChange={e => setPhoneNumberIdSafe(e.target.value)} placeholder="123456789012345" className="h-9 text-sm font-mono" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Access Token (System User) <span className="text-destructive">*</span></label>
                <div className="relative">
                  <Input type={showToken ? "text" : "password"} value={accessToken} onChange={e => setAccessTokenSafe(e.target.value)} placeholder="EAAG..." className="h-9 text-sm font-mono pr-9" />
                  <button onClick={() => setShowToken(!showToken)} className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground">{showToken ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                </div>
                <p className="text-[10px] text-muted-foreground">Usa un System User Token permanente, no el token de prueba de 24h.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">WABA ID</label>
                <Input value={wabaId} onChange={e => setWabaId(e.target.value)} placeholder="WhatsApp Business Account ID" className="h-9 text-sm font-mono" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">App Secret <span className="text-destructive">*</span></label>
                <div className="relative">
                  <Input type={showSecret ? "text" : "password"} value={appSecret} onChange={e => setAppSecret(e.target.value)} placeholder="App Dashboard → Settings → Basic" className="h-9 text-sm font-mono pr-9" />
                  <button onClick={() => setShowSecret(!showSecret)} className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground">{showSecret ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                </div>
              </div>
            </div>
            {testResult && (
              <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{testResult.name}</p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-500">{testResult.phone}</p>
                </div>
              </div>
            )}
            {!verified && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <AlertTriangle size={12} /> Debes verificar la conexión antes de continuar.
              </p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleTestConnection} disabled={testing || !phoneNumberId || !accessToken}
                className={`gap-1.5 h-9 text-xs flex-1 ${verified ? "border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400" : ""}`}>
                {testing ? <Loader2 size={13} className="animate-spin" /> : verified ? <CheckCircle2 size={13} /> : <Wifi size={13} />}
                {verified ? "Conexión verificada" : "Verificar conexión"}
              </Button>
              <Button onClick={handleSaveStep1} disabled={!verified || upsert.isPending} className="flex-1 h-9 gap-1.5">
                {upsert.isPending && <Loader2 size={13} className="animate-spin" />}
                Continuar <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Agente ── */}
        {step === 2 && (
          <div className="bg-card border rounded-2xl p-6 space-y-6">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2"><Sparkles size={14} />Configura tu Agente</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Define la estrategia y personalidad de tu asistente.</p>
            </div>

            {/* Nombre */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Nombre del agente</label>
              <Input value={agentName} onChange={e => setAgentName(e.target.value)} placeholder="Sofi, Asistente..." className="h-9 text-sm" />
            </div>

            {/* Objetivos */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Objetivos <span className="text-[10px] text-primary">(el primero es el principal)</span></label>
              <div className="flex flex-wrap gap-1.5">
                {AGENT_OBJECTIVES.map(obj => {
                  const selected = agentObjectives.includes(obj);
                  const idx = agentObjectives.indexOf(obj);
                  return (
                    <button key={obj} onClick={() => {
                      if (selected) setAgentObjectives(agentObjectives.filter(o => o !== obj));
                      else setAgentObjectives([...agentObjectives, obj]);
                    }} className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${selected ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"}`}>
                      {selected && idx === 0 && <span className="mr-1 text-[10px] opacity-75">★</span>}
                      {obj}
                    </button>
                  );
                })}
              </div>
              {agentObjectives.length > 0 && (
                <p className="text-[10px] text-muted-foreground">Objetivo principal (CTA): <span className="font-medium text-foreground">{agentObjectives[0]}</span></p>
              )}
            </div>

            {/* Personalidad */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Personalidad / Tono</label>
              <div className="grid grid-cols-1 gap-1.5">
                {AGENT_PERSONALITIES.map(p => (
                  <button key={p} onClick={() => setAgentPersonality(agentPersonality === p ? "" : p)}
                    className={`text-left text-xs px-3 py-2 rounded-lg border transition-colors ${agentPersonality === p ? "bg-primary/10 border-primary text-primary font-medium" : "border-border hover:border-primary/40"}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Proactividad */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Nivel de proactividad</label>
              <div className="space-y-1.5">
                {AGENT_PROACTIVITIES.map(p => (
                  <button key={p.val} onClick={() => setAgentProactivity(agentProactivity === p.val ? "" : p.val)}
                    className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${agentProactivity === p.val ? "bg-primary/10 border-primary" : "border-border hover:border-primary/40"}`}>
                    <p className={`text-xs font-medium ${agentProactivity === p.val ? "text-primary" : ""}`}>{p.label}</p>
                    <p className="text-[11px] text-muted-foreground">{p.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Longitud de respuestas */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Longitud de respuestas</label>
              <div className="flex gap-2">
                {RESPONSE_LENGTHS.map(r => (
                  <button key={r.val} onClick={() => setResponseLengthWiz(r.val)}
                    className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${responseLengthWiz === r.val ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/40"}`}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Emojis */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Uso de emojis</label>
              <div className="flex gap-2">
                {EMOJI_LEVELS.map(e => (
                  <button key={e.val} onClick={() => setEmojiLevelWiz(e.val)}
                    className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${emojiLevelWiz === e.val ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/40"}`}>
                    {e.label}
                  </button>
                ))}
              </div>
            </div>

            {/* FAQ */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Preguntas frecuentes <span className="text-[10px] text-muted-foreground">(opcional)</span></label>
              <div className="space-y-2">
                {agentFaqWiz.map((pair, i) => (
                  <div key={i} className="rounded-lg border p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground font-medium">Pregunta {i + 1}</span>
                      <button onClick={() => setAgentFaqWiz(agentFaqWiz.filter((_, j) => j !== i))} className="text-destructive hover:opacity-70">
                        <X size={12} />
                      </button>
                    </div>
                    <Input value={pair.q} onChange={e => setAgentFaqWiz(agentFaqWiz.map((p, j) => j === i ? { ...p, q: e.target.value } : p))}
                      placeholder="¿Cuál es el horario de atención?" className="h-7 text-xs" />
                    <Textarea value={pair.a} onChange={e => setAgentFaqWiz(agentFaqWiz.map((p, j) => j === i ? { ...p, a: e.target.value } : p))}
                      placeholder="Atendemos de lunes a viernes de 9am a 6pm." rows={2} className="text-xs resize-none" />
                  </div>
                ))}
                <button onClick={() => setAgentFaqWiz([...agentFaqWiz, { q: "", a: "" }])}
                  className="w-full text-xs border border-dashed rounded-lg py-2 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors flex items-center justify-center gap-1.5">
                  <Plus size={12} /> Añadir pregunta
                </button>
              </div>
            </div>

            {/* Prompt adicional libre */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Instrucciones adicionales <span className="text-[10px] text-muted-foreground">(opcional — se añaden al final)</span></label>
              <Textarea ref={promptRef} value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} rows={4}
                className="text-xs font-mono resize-none leading-relaxed" placeholder="Restricciones específicas, información extra, casos especiales..." />
            </div>

            {/* Info media */}
            <div className="rounded-xl border border-border bg-secondary/30 px-4 py-3 space-y-1.5">
              <p className="text-xs font-semibold">Capacidades con archivos</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>✅ <strong>Imágenes</strong> — puede verlas y analizarlas (comprobantes, fotos, etc.)</p>
                <p>✅ <strong>PDFs</strong> — puede leer documentos PDF</p>
                <p>🚫 <strong>Audios</strong> — no soportado, responderá pidiendo que escriban</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="h-9 text-xs">Atrás</Button>
              <Button onClick={handleSaveStep2} disabled={upsert.isPending} className="flex-1 h-9 gap-1.5">
                {upsert.isPending && <Loader2 size={13} className="animate-spin" />}
                Continuar <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Capacidades ── */}
        {step === 3 && (
          <div className="bg-card border rounded-2xl p-6 space-y-4">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2"><Zap size={14} />Capacidades</h2>
              <p className="text-xs text-muted-foreground mt-0.5">¿Qué puede hacer el agente además de responder preguntas?</p>
            </div>
            <div className="divide-y">
              {/* Agendar citas */}
              <div className="py-3 space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Agendar citas</p>
                    <p className="text-xs text-muted-foreground">Detecta intención de agendar y crea citas en el calendario</p>
                  </div>
                  <button
                    onClick={() => { if (schedulingCalendarIdWiz) setCanBook(v => !v); }}
                    disabled={!schedulingCalendarIdWiz}
                    className={`relative shrink-0 rounded-full transition-opacity ${!schedulingCalendarIdWiz ? "opacity-40 cursor-not-allowed" : ""}`}
                    style={{ width: 40, height: 22 }}
                  >
                    <span className={`absolute inset-0 rounded-full transition-colors ${canBook && schedulingCalendarIdWiz ? "bg-primary" : "bg-secondary border"}`} />
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${canBook && schedulingCalendarIdWiz ? "left-[22px]" : "left-0.5"}`} />
                  </button>
                </div>
                {/* Selector de calendario — siempre visible en esta fila */}
                <div className="pl-0">
                  <select
                    value={schedulingCalendarIdWiz}
                    onChange={e => {
                      const val = e.target.value;
                      setSchedulingCalendarIdWiz(val);
                      if (!val) setCanBook(false);
                    }}
                    className="w-full text-xs h-8 rounded-lg border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">— Selecciona un calendario —</option>
                    {calendars.map(cal => (
                      <option key={cal.id} value={cal.id}>{cal.name ?? cal.slug ?? cal.id}</option>
                    ))}
                  </select>
                  {!schedulingCalendarIdWiz && (
                    <p className="text-[10px] text-muted-foreground mt-1">Selecciona un calendario para activar el agendamiento.</p>
                  )}
                </div>
              </div>
              {/* Crear contactos + datos a recopilar */}
              <div className="py-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Crear contactos automáticamente</p>
                    <p className="text-xs text-muted-foreground">Guarda nuevos leads al recibir mensajes</p>
                  </div>
                  <button onClick={() => setCanContacts(v => !v)} className="relative shrink-0 rounded-full" style={{ width: 40, height: 22 }}>
                    <span className={`absolute inset-0 rounded-full transition-colors ${canContacts ? "bg-primary" : "bg-secondary border"}`} />
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${canContacts ? "left-[22px]" : "left-0.5"}`} />
                  </button>
                </div>
                {canContacts && (
                  <div className="mt-3 pl-3 border-l-2 border-primary/20 space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Datos a recopilar del prospecto</p>
                    <div className="flex flex-wrap gap-1.5">
                      {DATA_COLLECT_OPTIONS.map(opt => {
                        const sel = agentDataCollectWiz.includes(opt);
                        return (
                          <button key={opt} onClick={() => setAgentDataCollectWiz(sel ? agentDataCollectWiz.filter(o => o !== opt) : [...agentDataCollectWiz, opt])}
                            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${sel ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"}`}>
                            {opt}
                          </button>
                        );
                      })}
                      {agentDataCollectWiz.filter(o => !DATA_COLLECT_OPTIONS.includes(o)).map(custom => (
                        <span key={custom} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border bg-primary text-primary-foreground border-primary">
                          {custom}
                          <button onClick={() => setAgentDataCollectWiz(agentDataCollectWiz.filter(o => o !== custom))} className="hover:opacity-70"><X size={10} /></button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      <Input value={customDataFieldWiz} onChange={e => setCustomDataFieldWiz(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && customDataFieldWiz.trim()) { setAgentDataCollectWiz(prev => [...new Set([...prev, customDataFieldWiz.trim()])]); setCustomDataFieldWiz(""); } }}
                        placeholder="Personalizado (ej: Empresa, RFC...)" className="h-7 text-xs flex-1" />
                      <button onClick={() => { if (customDataFieldWiz.trim()) { setAgentDataCollectWiz(prev => [...new Set([...prev, customDataFieldWiz.trim()])]); setCustomDataFieldWiz(""); } }}
                        className="text-xs px-2.5 py-1 rounded-lg border border-primary text-primary hover:bg-primary/10 transition-colors shrink-0">
                        + Añadir
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {/* Transferir a humano + notificación */}
              <div className="py-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Transferir a humano</p>
                    <p className="text-xs text-muted-foreground">El agente detecta automáticamente cuando el cliente quiere hablar con una persona y cambia a modo Manual</p>
                  </div>
                  <button onClick={() => setCanTransfer(v => !v)} className="relative shrink-0 rounded-full" style={{ width: 40, height: 22 }}>
                    <span className={`absolute inset-0 rounded-full transition-colors ${canTransfer ? "bg-primary" : "bg-secondary border"}`} />
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${canTransfer ? "left-[22px]" : "left-0.5"}`} />
                  </button>
                </div>
                {canTransfer && (
                  <div className="mt-3 pl-3 border-l-2 border-primary/20 space-y-2.5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium">Notificación por email</p>
                        <p className="text-xs text-muted-foreground">Recibe un correo cuando se transfiere a modo Manual</p>
                      </div>
                      <button onClick={() => setWizNotifyOnTransfer(v => !v)} className="relative shrink-0 rounded-full" style={{ width: 40, height: 22 }}>
                        <span className={`absolute inset-0 rounded-full transition-colors ${wizNotifyOnTransfer ? "bg-primary" : "bg-secondary border"}`} />
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${wizNotifyOnTransfer ? "left-[22px]" : "left-0.5"}`} />
                      </button>
                    </div>
                    {wizNotifyOnTransfer && (
                      <Input
                        type="email"
                        value={wizNotifyEmail}
                        onChange={e => setWizNotifyEmail(e.target.value)}
                        placeholder="tu@correo.com"
                        className="h-8 text-xs"
                      />
                    )}
                  </div>
                )}
              </div>
              {/* Detectar pagos con IA */}
              <div className="py-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Detectar pagos con IA</p>
                    <p className="text-xs text-muted-foreground">La IA analiza comprobantes de pago enviados por WhatsApp y registra ventas automáticamente</p>
                  </div>
                  <button onClick={() => setAutoDetectPayments(v => !v)} className="relative shrink-0 rounded-full" style={{ width: 40, height: 22 }}>
                    <span className={`absolute inset-0 rounded-full transition-colors ${autoDetectPayments ? "bg-primary" : "bg-secondary border"}`} />
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${autoDetectPayments ? "left-[22px]" : "left-0.5"}`} />
                  </button>
                </div>
                {autoDetectPayments && (
                  <div className="mt-3 pl-3 border-l-2 border-primary/20 space-y-2.5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium">Notificación por email</p>
                        <p className="text-xs text-muted-foreground">Recibe un correo cuando se registre una venta</p>
                      </div>
                      <button onClick={() => setWizPaymentNotify(v => !v)} className="relative shrink-0 rounded-full" style={{ width: 40, height: 22 }}>
                        <span className={`absolute inset-0 rounded-full transition-colors ${wizPaymentNotify ? "bg-primary" : "bg-secondary border"}`} />
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${wizPaymentNotify ? "left-[22px]" : "left-0.5"}`} />
                      </button>
                    </div>
                    {wizPaymentNotify && (
                      <Input
                        type="email"
                        value={wizPaymentEmail}
                        onChange={e => setWizPaymentEmail(e.target.value)}
                        placeholder="tu@correo.com"
                        className="h-8 text-xs"
                      />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Información disponible para el agente */}
            <div className="border rounded-xl p-4 space-y-4 bg-secondary/20 mt-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Información disponible para el agente</p>

              {/* Servicios */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Servicios</p>
                <div className="flex gap-3">
                  {(["all", "selected", "none"] as const).map(mode => (
                    <label key={mode} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="wiz-services-mode" checked={servicesMode === mode} onChange={() => setServicesMode(mode)} className="accent-primary" />
                      <span className="text-sm">{mode === "all" ? "Todos" : mode === "selected" ? "Solo seleccionados" : "Ninguno"}</span>
                    </label>
                  ))}
                </div>
                {servicesMode === "selected" && (
                  <div className="mt-1 border rounded-lg divide-y max-h-40 overflow-y-auto bg-background">
                    {allServices.filter(s => s.active).length === 0
                      ? <p className="px-3 py-2 text-xs text-muted-foreground">No hay servicios activos</p>
                      : allServices.filter(s => s.active).map(s => (
                          <label key={s.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-secondary/40 transition-colors">
                            <input type="checkbox" checked={selectedServiceIds.includes(s.id)}
                              onChange={e => setSelectedServiceIds(prev => e.target.checked ? [...prev, s.id] : prev.filter(id => id !== s.id))}
                              className="accent-primary shrink-0" />
                            <span className="text-sm">{s.name}</span>
                          </label>
                        ))
                    }
                  </div>
                )}
              </div>

              {/* Productos */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Productos</p>
                <div className="flex gap-3">
                  {(["all", "selected", "none"] as const).map(mode => (
                    <label key={mode} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="wiz-products-mode" checked={productsMode === mode} onChange={() => setProductsMode(mode)} className="accent-primary" />
                      <span className="text-sm">{mode === "all" ? "Todos" : mode === "selected" ? "Solo seleccionados" : "Ninguno"}</span>
                    </label>
                  ))}
                </div>
                {productsMode === "selected" && (
                  <div className="mt-1 border rounded-lg divide-y bg-background max-h-52 overflow-y-auto">
                    {catalogs.map(cat => {
                      const catProductIds = catalogProductsMap.get(cat.id) ?? [];
                      const catProducts = allProducts.filter(p => catProductIds.includes(p.id) && p.is_active);
                      if (catProducts.length === 0) return null;
                      const allSelected = catProducts.every(p => selectedProductIds.includes(p.id));
                      const someSelected = catProducts.some(p => selectedProductIds.includes(p.id));
                      return (
                        <div key={cat.id}>
                          <label className="flex items-center gap-2.5 px-3 py-2 bg-secondary/30 cursor-pointer hover:bg-secondary/50 transition-colors">
                            <input type="checkbox" checked={allSelected} ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                              onChange={e => {
                                const ids = catProducts.map(p => p.id);
                                if (e.target.checked) setSelectedProductIds(prev => [...new Set([...prev, ...ids])]);
                                else setSelectedProductIds(prev => prev.filter(id => !ids.includes(id)));
                              }}
                              className="accent-primary shrink-0" />
                            <span className="text-xs font-semibold">{cat.name}</span>
                          </label>
                          {catProducts.map(p => (
                            <label key={p.id} className="flex items-center gap-2.5 px-3 py-2 pl-8 cursor-pointer hover:bg-secondary/40 transition-colors">
                              <input type="checkbox" checked={selectedProductIds.includes(p.id)}
                                onChange={e => setSelectedProductIds(prev => e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id))}
                                className="accent-primary shrink-0" />
                              <span className="text-sm">{p.name}</span>
                            </label>
                          ))}
                        </div>
                      );
                    })}
                    {/* Productos sin catálogo */}
                    {(() => {
                      const allCatProductIds = new Set(Array.from(catalogProductsMap.values()).flat());
                      const orphans = allProducts.filter(p => !allCatProductIds.has(p.id) && p.is_active);
                      if (orphans.length === 0) return null;
                      return (
                        <div>
                          <div className="px-3 py-2 bg-secondary/30">
                            <span className="text-xs font-semibold text-muted-foreground">Sin catálogo</span>
                          </div>
                          {orphans.map(p => (
                            <label key={p.id} className="flex items-center gap-2.5 px-3 py-2 pl-8 cursor-pointer hover:bg-secondary/40 transition-colors">
                              <input type="checkbox" checked={selectedProductIds.includes(p.id)}
                                onChange={e => setSelectedProductIds(prev => e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id))}
                                className="accent-primary shrink-0" />
                              <span className="text-sm">{p.name}</span>
                            </label>
                          ))}
                        </div>
                      );
                    })()}
                    {catalogs.length === 0 && allProducts.filter(p => p.is_active).length === 0 && (
                      <p className="px-3 py-2 text-xs text-muted-foreground">No hay productos activos</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(2)} className="h-9 text-xs">Atrás</Button>
              <Button onClick={handleSaveStep3} disabled={upsert.isPending} className="flex-1 h-9 gap-1.5">
                {upsert.isPending && <Loader2 size={13} className="animate-spin" />}
                Continuar <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 4: Horario ── */}
        {step === 4 && (
          <div className="bg-card border rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2"><Clock size={14} />Horario del Asistente Virtual</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Este horario controla <strong>cuándo el asistente virtual responde automáticamente</strong> por WhatsApp.
                No es el horario de atención de tu negocio — es solo para el bot.
                Fuera de este horario, el asistente enviará el mensaje de "fuera de horario" en lugar de responder con IA.
                Por defecto está configurado 24/7.
              </p>
            </div>
            <WeeklySchedulePicker value={schedule} onChange={setSchedule} interval={30} />
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Zona horaria</label>
              <select value={timezone} onChange={e => setTimezone(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {(TIMEZONES.includes(timezone) ? TIMEZONES : [timezone, ...TIMEZONES]).map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Mensaje fuera de horario</label>
              <Textarea value={offHoursMsg} onChange={e => setOffHoursMsg(e.target.value)} rows={2} className="text-sm resize-none"
                placeholder="Ej: ¡Hola! Estamos fuera de horario. Nuestro equipo te atenderá pronto." />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(3)} className="h-9 text-xs">Atrás</Button>
              <Button onClick={handleSaveStep4} disabled={upsert.isPending} className="flex-1 h-9 gap-1.5">
                {upsert.isPending && <Loader2 size={13} className="animate-spin" />}
                Continuar <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 5: Perfil WA ── */}
        {step === 5 && (
          <div className="bg-card border rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2"><User size={14} />Perfil de WhatsApp</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Opcional — puedes configurarlo ahora o más tarde desde Configuración.</p>
            </div>

            {/* Foto de perfil */}
            <div className="space-y-3">
              <label className="text-xs font-medium text-muted-foreground">Foto de perfil</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-secondary flex items-center justify-center shrink-0 border">
                  {profilePicUrl
                    ? <img src={profilePicUrl} alt="Perfil WA" className="w-full h-full object-cover" />
                    : <User size={26} className="text-muted-foreground" />
                  }
                </div>
                <div className="space-y-1.5">
                  <input
                    ref={wizardPhotoRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleWizardPhotoUpload(f); e.target.value = ""; }}
                  />
                  <Button
                    variant="outline" size="sm"
                    onClick={() => wizardPhotoRef.current?.click()}
                    disabled={uploadingPhoto || !wabaId}
                    className="h-8 text-xs gap-1.5"
                  >
                    {uploadingPhoto ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                    {uploadingPhoto ? "Subiendo..." : "Cambiar foto"}
                  </Button>
                  {!wabaId && <p className="text-[10px] text-amber-500">Requiere WABA ID (paso 1)</p>}
                  {wabaId && <p className="text-[10px] text-muted-foreground">JPG o PNG · Imagen cuadrada</p>}
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Bio / Descripción</label>
              <Textarea
                value={bio}
                onChange={e => setBio(e.target.value.slice(0, 139))}
                rows={3}
                className="text-sm resize-none"
                placeholder="Ej: Servicio de atención al cliente 24/7"
              />
              <span className={`text-[10px] ${bio.length >= 130 ? "text-amber-500" : "text-muted-foreground"}`}>
                {bio.length}/139
              </span>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(4)} className="h-9 text-xs shrink-0">Atrás</Button>
              <Button variant="outline" onClick={() => setStep(6)} className="h-9 text-xs shrink-0">Omitir</Button>
              <Button onClick={handleSaveStep5Bio} disabled={savingBio} className="flex-1 h-9 gap-1.5">
                {savingBio ? <Loader2 size={13} className="animate-spin" /> : <ChevronRight size={14} />}
                Guardar y continuar
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 6: Resumen + Activar ── */}
        {step === 6 && (
          <div className="bg-card border rounded-2xl p-6 space-y-6">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2"><CheckCircle2 size={14} />Todo listo para activar</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Revisa la configuración y activa tu asistente.</p>
            </div>

            {/* Resumen */}
            <div className="space-y-3">
              {[
                { label: "Número de WhatsApp", value: testResult?.phone ?? existingConfig?.phone_number_id ?? "—" },
                { label: "Nombre del asistente", value: agentName },
                { label: "Modelo", value: "Claude Haiku" },
                { label: "Capacidades", value: [canBook && "Citas", canContacts && "Contactos", canServices && "Servicios", canTransfer && "Transfer"].filter(Boolean).join(" · ") || "Solo responder preguntas" },
                { label: "Zona horaria", value: timezone },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between gap-4 py-2 border-b last:border-0">
                  <span className="text-xs text-muted-foreground shrink-0">{label}</span>
                  <span className="text-xs font-medium text-right">{value}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(5)} className="h-9 text-xs shrink-0">Atrás</Button>
              <Button
                onClick={handleActivar}
                disabled={saving}
                className="flex-1 h-11 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Bot size={15} />}
                Activar Asistente IA · {testResult?.phone ?? existingConfig?.phone_number_id ?? "WhatsApp"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Settings Panel (slide-over) ──────────────────────────────────────────────
const LABEL_COLORS = [
  "#6366f1","#8b5cf6","#ec4899","#ef4444","#f97316",
  "#eab308","#22c55e","#14b8a6","#3b82f6","#64748b",
];

const SettingsPanel = ({ onClose, onDisconnect }: { onClose: () => void; onDisconnect: () => void }) => {
  const { data: config } = useAIAgentConfig();
  const { data: businessProfile } = useBusinessProfile();
  const { user } = useCurrentUser();
  const { data: labels = [] }  = useWaLabels();
  const upsertLabel            = useUpsertWaLabel();
  const deleteLabel            = useDeleteWaLabel();
  const upsert = useUpsertAIAgentConfig();
  const { data: allProducts = [] } = useProducts();
  const { data: allServices = [] } = useServices();
  const { data: catalogs = [] } = useCatalogs();
  const { data: catalogProductsMap = new Map() } = useCatalogProductsMap();
  const { data: calendars = [] } = useCalendars();
  const [saving, setSaving]         = useState(false);
  const [testing, setTesting]       = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  // Credentials revealed state
  const [credentialsRevealed, setCredentialsRevealed] = useState(false);

  // Password prompt: "reveal" | "disconnect" | null
  const [pwdPrompt, setPwdPrompt]   = useState<"reveal" | "disconnect" | null>(null);
  const [password, setPassword]     = useState("");
  const [verifying, setVerifying]   = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Form state
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken]     = useState("");
  const [wabaId, setWabaId]               = useState("");
  const [appSecret, setAppSecret]         = useState("");
  const [agentName, setAgentName]         = useState("Asistente");
  const [systemPrompt, setSystemPrompt]   = useState("");
  const [isActive, setIsActive]           = useState(false);
  const [canBook, setCanBook]                         = useState(false);
  const [schedulingCalendarId, setSchedulingCalendarId] = useState("");
  const [canContacts, setCanContacts]                 = useState(true);
  const [canServices, setCanServices]                 = useState(true);
  const [canTransfer, setCanTransfer]                 = useState(false);
  const [autoDetectPaymentsSP, setAutoDetectPaymentsSP] = useState(false);
  const [paymentNotifySP, setPaymentNotifySP]           = useState(false);
  const [paymentEmailSP, setPaymentEmailSP]             = useState("");
  const [editingPaymentEmail, setEditingPaymentEmail]   = useState(false);
  const [notifyOnTransfer, setNotifyOnTransfer]       = useState(false);
  const [spProductsMode, setSpProductsMode]           = useState<"all"|"selected"|"none">("all");
  const [spSelectedProductIds, setSpSelectedProductIds] = useState<string[]>([]);
  const [spServicesMode, setSpServicesMode]           = useState<"all"|"selected"|"none">("all");
  const [spSelectedServiceIds, setSpSelectedServiceIds] = useState<string[]>([]);
  // Config estratégica B15-1
  const [agentObjectivesSP, setAgentObjectivesSP]     = useState<string[]>([]);
  const [agentPersonalitySP, setAgentPersonalitySP]   = useState("");
  const [agentProactivitySP, setAgentProactivitySP]   = useState("");
  const [responseLengthSP, setResponseLengthSP]       = useState("normal");
  const [emojiLevelSP, setEmojiLevelSP]               = useState("poco");
  const [agentFaqSP, setAgentFaqSP]                   = useState<{ q: string; a: string }[]>([]);
  const [showCatalogOnAsk, setShowCatalogOnAsk]       = useState(true);
  const [doUpsell, setDoUpsell]                       = useState(false);
  const [confirmSummary, setConfirmSummary]           = useState(true);
  const [agentDataCollect, setAgentDataCollect]       = useState<string[]>([]);
  const [customDataField, setCustomDataField]         = useState("");
  const [notifyEmail, setNotifyEmail]             = useState("");
  const [editingNotifyEmail, setEditingNotifyEmail] = useState(false);
  // Label form state
  const [newLabelName, setNewLabelName]   = useState("");
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0]);
  const [newLabelHint, setNewLabelHint]   = useState("");
  const [editingLabel, setEditingLabel]   = useState<{ id: string; name: string; color: string; hint: string | null } | null>(null);
  const [schedule, setSchedule]           = useState<WeeklySchedule>(DEFAULT_SCHEDULE);
  const [timezone, setTimezone]           = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [offHoursMsg, setOffHoursMsg]     = useState("");
  const [section, setSection]             = useState<"conexion"|"agente"|"capacidades"|"horario"|"perfil"|"etiquetas">("conexion");
  const initialized                       = useRef(false);

  // Perfil de WhatsApp
  const [bio, setBio]                     = useState("");
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingBio, setSavingBio]         = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef                     = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!config || initialized.current) return;
    initialized.current = true;
    setPhoneNumberId(config.phone_number_id ?? "");
    setAccessToken(config.access_token ?? "");
    setWabaId(config.waba_id ?? "");
    setAppSecret(config.app_secret ?? "");
    setAgentName(config.agent_name ?? "Asistente");
    setSystemPrompt(config.system_prompt ?? "");
    setIsActive(config.is_active ?? false);
    setCanBook(config.can_book_appointments ?? false);
    setSchedulingCalendarId(config.scheduling_calendar_id ?? "");
    setCanContacts(config.can_create_contacts ?? true);
    setCanServices(config.can_answer_services ?? true);
    setCanTransfer(config.can_transfer_human ?? false);
    setAutoDetectPaymentsSP(config.auto_detect_payments ?? false);
    setPaymentNotifySP(!!(config.payment_notify_email));
    setPaymentEmailSP(config.payment_notify_email ?? "");
    setNotifyOnTransfer(config.notify_on_transfer ?? false);
    setSpProductsMode(config.products_mode ?? "all");
    setSpSelectedProductIds(config.selected_product_ids ?? []);
    setSpServicesMode(config.services_mode ?? "all");
    setSpSelectedServiceIds(config.selected_service_ids ?? []);
    setNotifyEmail(config.notify_email ?? "");
    setSchedule((config.schedule as WeeklySchedule | null) ?? DEFAULT_SCHEDULE);
    setTimezone(config.timezone ?? businessProfile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
    setOffHoursMsg(config.off_hours_message ?? "");
    setAgentObjectivesSP(config.agent_objectives ?? []);
    setAgentPersonalitySP(config.agent_personality ?? "");
    setAgentProactivitySP(config.agent_proactivity ?? "");
    setResponseLengthSP(config.response_length ?? "normal");
    setEmojiLevelSP(config.emoji_level ?? "poco");
    setAgentFaqSP(config.agent_faq ?? []);
    setShowCatalogOnAsk(config.show_catalog_on_ask ?? true);
    setDoUpsell(config.do_upsell ?? false);
    setConfirmSummary(config.confirm_summary ?? true);
    setAgentDataCollect(config.agent_data_collect ?? []);
  }, [config]);

  // Rellenar emails de notificación con el del perfil si no hay uno guardado
  useEffect(() => {
    const fallback = businessProfile?.contact_email ?? user?.email ?? "";
    if (!notifyEmail && fallback) setNotifyEmail(fallback);
    if (!paymentEmailSP && fallback) { setPaymentEmailSP(fallback); }
  }, [businessProfile?.contact_email, user?.email]);

  // Verify password and execute action
  const handleVerifyPassword = async () => {
    if (!password.trim()) { toast.error("Ingresa tu contraseña"); return; }
    setVerifying(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: user!.email!,
        password: password.trim(),
      });
      if (error) { toast.error("Contraseña incorrecta"); return; }

      if (pwdPrompt === "reveal") {
        setCredentialsRevealed(true);
        toast.success("Credenciales desbloqueadas");
      } else if (pwdPrompt === "disconnect") {
        setDisconnecting(true);
        await upsert.mutateAsync({
          phone_number_id: null,
          access_token: null,
          waba_id: null,
          app_secret: null,
          is_active: false,
        });
        toast.success("Asistente desconectado");
        onDisconnect();
        onClose();
      }
      setPwdPrompt(null);
      setPassword("");
    } catch { toast.error("Error al verificar la contraseña"); }
    finally { setVerifying(false); setDisconnecting(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsert.mutateAsync({
        phone_number_id: phoneNumberId || null,
        access_token: accessToken || null,
        waba_id: wabaId || null,
        app_secret: appSecret || null,
        agent_name: agentName || "Asistente",
        model: "claude-haiku-4-5-20251001",
        system_prompt: systemPrompt || null,
        is_active: isActive,
        can_book_appointments: canBook,
        scheduling_calendar_id: canBook && schedulingCalendarId ? schedulingCalendarId : null,
        can_create_contacts: canContacts,
        can_answer_services: canServices,
        can_transfer_human: canTransfer,
        auto_detect_payments: autoDetectPaymentsSP,
        payment_notify_email: autoDetectPaymentsSP && paymentNotifySP ? (paymentEmailSP.trim() || null) : null,
        notify_on_transfer: notifyOnTransfer,
        notify_email: notifyOnTransfer ? (notifyEmail.trim() || null) : null,
        products_mode: spProductsMode,
        selected_product_ids: spProductsMode === "selected" ? spSelectedProductIds : [],
        services_mode: spServicesMode,
        selected_service_ids: spServicesMode === "selected" ? spSelectedServiceIds : [],
        schedule,
        timezone,
        off_hours_message: offHoursMsg || null,
        agent_objectives: agentObjectivesSP,
        agent_personality: agentPersonalitySP || null,
        agent_proactivity: agentProactivitySP || null,
        response_length: responseLengthSP as "short" | "normal" | "detailed",
        emoji_level: emojiLevelSP as "none" | "poco" | "medio" | "mucho",
        agent_faq: agentFaqSP.length > 0 ? agentFaqSP : null,
        show_catalog_on_ask: showCatalogOnAsk,
        do_upsell: doUpsell,
        confirm_summary: confirmSummary,
        agent_data_collect: agentDataCollect,
      });

      // Re-suscribir al WABA si hay credenciales completas
      if (wabaId && accessToken) {
        await fetch(`https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
        }).catch(() => {});
      }

      toast.success("Configuración guardada");
    } catch { toast.error("Error al guardar"); }
    finally { setSaving(false); }
  };

  // Cargar perfil de WhatsApp al abrir el tab
  useEffect(() => {
    if (section !== "perfil") return;
    const pid = config?.phone_number_id;
    const tok = config?.access_token;
    if (!pid || !tok) return;
    setLoadingProfile(true);
    fetch(`https://graph.facebook.com/v21.0/${pid}/whatsapp_business_profile?fields=about,profile_picture_url`, {
      headers: { Authorization: `Bearer ${tok}` },
    })
      .then(r => r.json())
      .then(json => {
        const d = json.data?.[0] ?? {};
        setBio(d.about ?? "");
        setProfilePicUrl(d.profile_picture_url ?? null);
      })
      .catch(() => {})
      .finally(() => setLoadingProfile(false));
  }, [section, config?.phone_number_id, config?.access_token]);

  const handleSaveBio = async () => {
    const pid = config?.phone_number_id;
    const tok = config?.access_token;
    if (!pid || !tok) return;
    setSavingBio(true);
    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/${pid}/whatsapp_business_profile`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", about: bio }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Bio actualizada");
    } catch (err: any) { toast.error(err.message?.slice(0, 100)); }
    finally { setSavingBio(false); }
  };

  const handlePhotoUpload = async (file: File) => {
    if (!config?.phone_number_id || !config?.access_token) return;
    if (!config?.waba_id) {
      toast.error("Configura el WABA ID en el tab Conexión para poder subir la foto de perfil");
      return;
    }
    setUploadingPhoto(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { data, error } = await supabase.functions.invoke("upload-wa-profile-photo", {
        body: { base64, mime_type: file.type },
      });
      if (error || data?.error) throw new Error(data?.error ?? error?.message ?? "Error desconocido");
      setProfilePicUrl(URL.createObjectURL(file));
      toast.success("Foto de perfil actualizada");
    } catch (err: any) { toast.error(err.message?.slice(0, 160) ?? "Error al subir la foto"); }
    finally { setUploadingPhoto(false); }
  };

  const handleTest = async () => {
    if (!phoneNumberId || !accessToken) { toast.error("Ingresa Phone Number ID y Access Token"); return; }
    setTesting(true); setTestResult(null);
    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}?fields=display_phone_number,verified_name`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      const label = `${json.verified_name} · ${json.display_phone_number}`;
      setTestResult(label);
      await upsert.mutateAsync({ verified_phone: json.display_phone_number ?? null }).catch(() => {});

      // 1. Re-registrar el número (restaura la entrega de mensajes con 2 checks)
      await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/register`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", pin: "123456" }),
      }).catch(() => {});

      // 2. Re-suscribir WABA al app (restaura la recepción de mensajes vía webhook)
      if (wabaId) {
        await fetch(`https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
        }).catch(() => {});
      }

      toast.success("Reconectado — registro y suscripción restaurados");
    } catch (err: any) { toast.error(err.message?.slice(0, 100)); }
    finally { setTesting(false); }
  };

  const insertVariable = (v: string) => {
    const el = promptRef.current;
    if (!el) return;
    const start = el.selectionStart ?? systemPrompt.length;
    const end   = el.selectionEnd   ?? systemPrompt.length;
    setSystemPrompt(systemPrompt.slice(0, start) + v + systemPrompt.slice(end));
    setTimeout(() => { el.focus(); el.setSelectionRange(start + v.length, start + v.length); }, 0);
  };

  const maskValue = (v: string) => v ? "•".repeat(Math.min(v.length || 16, 24)) : "No configurado";

  const TABS = [
    { id: "conexion" as const,    label: "Conexión",    icon: Wifi },
    { id: "agente" as const,      label: "Agente",      icon: Sparkles },
    { id: "capacidades" as const, label: "Capacidades", icon: Zap },
    { id: "horario" as const,     label: "Horario",     icon: Clock },
    { id: "perfil" as const,      label: "Perfil WA",   icon: User },
    { id: "etiquetas" as const,   label: "Etiquetas",   icon: Tag },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-card h-full flex flex-col shadow-2xl border-l">

        {/* Password prompt modal */}
        {pwdPrompt && (
          <div className="absolute inset-0 z-20 bg-card/95 backdrop-blur-sm flex flex-col items-center justify-center p-8 gap-5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${pwdPrompt === "disconnect" ? "bg-destructive/10" : "bg-primary/10"}`}>
              {pwdPrompt === "disconnect"
                ? <WifiOff size={22} className="text-destructive" />
                : <Eye size={22} className="text-primary" />
              }
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold">
                {pwdPrompt === "disconnect" ? "Desconectar el Asistente" : "Desbloquear credenciales"}
              </p>
              <p className="text-xs text-muted-foreground max-w-xs">
                {pwdPrompt === "disconnect"
                  ? "Esto borrará las credenciales de conexión y detendrá el asistente. El Verify Token se mantendrá. Ingresa tu contraseña para confirmar."
                  : "Ingresa tu contraseña para ver y editar las credenciales de conexión."
                }
              </p>
            </div>
            <div className="w-full space-y-3">
              <Input
                type="password"
                placeholder="Tu contraseña"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleVerifyPassword(); }}
                className="h-10 text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setPwdPrompt(null); setPassword(""); }} className="flex-1 h-9 text-xs">
                  Cancelar
                </Button>
                <Button
                  onClick={handleVerifyPassword}
                  disabled={verifying || !password.trim()}
                  className={`flex-1 h-9 text-xs gap-1.5 ${pwdPrompt === "disconnect" ? "bg-destructive hover:bg-destructive/90 text-white" : ""}`}
                >
                  {verifying ? <Loader2 size={13} className="animate-spin" /> : null}
                  {pwdPrompt === "disconnect" ? "Desconectar" : "Desbloquear"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="px-5 py-4 border-b flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`w-2 h-2 rounded-full ${config?.is_active ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
            <div>
              <h2 className="text-sm font-semibold">Configuración del Agente</h2>
              <p className="text-[10px] text-muted-foreground">
                {config?.is_active ? "Asistente activo" : "Asistente inactivo"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b shrink-0 px-2 overflow-x-auto">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setSection(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                  section === t.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}>
                <Icon size={12} />{t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {section === "conexion" && (
            <>
              {/* Webhook info */}
              <div className="bg-secondary/40 rounded-xl p-3 space-y-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Webhook URL</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-[10px] truncate">{WEBHOOK_URL}</code>
                  <button onClick={() => copyToClipboard(WEBHOOK_URL, "URL")}><Copy size={12} className="text-muted-foreground" /></button>
                </div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-1">Verify Token</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-[10px] truncate">{config?.webhook_verify_token}</code>
                  <button onClick={() => copyToClipboard(config?.webhook_verify_token ?? "", "Token")}><Copy size={12} className="text-muted-foreground" /></button>
                </div>
              </div>

              {/* Credentials — locked or revealed */}
              {!credentialsRevealed ? (
                <div className="space-y-3">
                  {/* Estado de conexión actual */}
                  <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${
                    config?.verified_phone
                      ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20"
                      : "border-border bg-secondary/30"
                  }`}>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${config?.verified_phone ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">
                        {config?.verified_phone ?? "Sin verificar"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {config?.verified_phone ? "Número conectado" : "Reconecta para verificar el número"}
                      </p>
                    </div>
                    {testResult && (
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    )}
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: "Phone Number ID", value: phoneNumberId },
                      { label: "Access Token",    value: accessToken },
                      { label: "WABA ID",         value: wabaId },
                      { label: "App Secret",      value: appSecret },
                    ].map(f => (
                      <div key={f.label} className="space-y-1">
                        <label className="text-xs text-muted-foreground">{f.label}</label>
                        <div className="h-9 px-3 flex items-center rounded-md border border-input bg-secondary/30 text-sm font-mono text-muted-foreground select-none">
                          {f.value ? maskValue(f.value) : <span className="text-muted-foreground/40 italic text-xs">No configurado</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleTest} disabled={testing || !phoneNumberId || !accessToken} className="flex-1 h-8 text-xs gap-1.5">
                      {testing ? <Loader2 size={12} className="animate-spin" /> : <Wifi size={12} />} Reconectar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPwdPrompt("reveal")} className="flex-1 h-8 text-xs gap-1.5">
                      <Eye size={12} /> Editar credenciales
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
                      <CheckCircle2 size={12} /> Credenciales visibles
                    </p>
                    <button onClick={() => setCredentialsRevealed(false)} className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                      <EyeOff size={11} /> Bloquear
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Phone Number ID</label>
                    <Input value={phoneNumberId} onChange={e => setPhoneNumberId(e.target.value)} className="h-9 text-sm font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Access Token</label>
                    <Input value={accessToken} onChange={e => setAccessToken(e.target.value)} className="h-9 text-sm font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">WABA ID</label>
                    <Input value={wabaId} onChange={e => setWabaId(e.target.value)} className="h-9 text-sm font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">App Secret</label>
                    <Input value={appSecret} onChange={e => setAppSecret(e.target.value)} className="h-9 text-sm font-mono" />
                  </div>
                  {testResult && (
                    <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2">
                      <CheckCircle2 size={13} /> {testResult}
                    </div>
                  )}
                  <Button variant="outline" size="sm" onClick={handleTest} disabled={testing} className="w-full h-8 text-xs gap-1.5">
                    {testing ? <Loader2 size={12} className="animate-spin" /> : <Wifi size={12} />} Reconectar
                  </Button>
                </div>
              )}

              {/* Disconnect button */}
              <div className="pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPwdPrompt("disconnect")}
                  className="w-full h-8 text-xs gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive"
                >
                  <WifiOff size={12} /> Desconectar Asistente IA
                </Button>
                <p className="text-[10px] text-muted-foreground text-center mt-1.5">
                  Borra las credenciales y vuelve al wizard de configuración inicial. El Verify Token se conserva.
                </p>
              </div>
            </>
          )}

          {section === "agente" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="text-sm font-medium">Asistente activo</p>
                  <p className="text-xs text-muted-foreground">Cuando está inactivo, no responde mensajes de WhatsApp.</p>
                </div>
                <button onClick={() => setIsActive(!isActive)} className="relative shrink-0 rounded-full" style={{ width: 40, height: 22 }}>
                  <span className={`absolute inset-0 rounded-full transition-colors ${isActive ? "bg-emerald-500" : "bg-secondary border"}`} />
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${isActive ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </div>

              {/* Nombre */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Nombre del agente</label>
                <Input value={agentName} onChange={e => setAgentName(e.target.value)} className="h-9 text-sm" />
              </div>

              {/* Objetivos */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Objetivos <span className="text-[10px] text-primary">(el primero es el principal)</span></label>
                <div className="flex flex-wrap gap-1.5">
                  {AGENT_OBJECTIVES.map(obj => {
                    const selected = agentObjectivesSP.includes(obj);
                    const idx = agentObjectivesSP.indexOf(obj);
                    return (
                      <button key={obj} onClick={() => {
                        if (selected) setAgentObjectivesSP(agentObjectivesSP.filter(o => o !== obj));
                        else setAgentObjectivesSP([...agentObjectivesSP, obj]);
                      }} className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${selected ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"}`}>
                        {selected && idx === 0 && <span className="mr-1 text-[10px] opacity-75">★</span>}
                        {obj}
                      </button>
                    );
                  })}
                </div>
                {agentObjectivesSP.length > 0 && (
                  <p className="text-[10px] text-muted-foreground">Objetivo principal (CTA): <span className="font-medium text-foreground">{agentObjectivesSP[0]}</span></p>
                )}
              </div>

              {/* Personalidad */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Personalidad / Tono</label>
                <div className="grid grid-cols-1 gap-1.5">
                  {AGENT_PERSONALITIES.map(p => (
                    <button key={p} onClick={() => setAgentPersonalitySP(agentPersonalitySP === p ? "" : p)}
                      className={`text-left text-xs px-3 py-2 rounded-lg border transition-colors ${agentPersonalitySP === p ? "bg-primary/10 border-primary text-primary font-medium" : "border-border hover:border-primary/40"}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Proactividad */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Nivel de proactividad</label>
                <div className="space-y-1.5">
                  {AGENT_PROACTIVITIES.map(p => (
                    <button key={p.val} onClick={() => setAgentProactivitySP(agentProactivitySP === p.val ? "" : p.val)}
                      className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${agentProactivitySP === p.val ? "bg-primary/10 border-primary" : "border-border hover:border-primary/40"}`}>
                      <p className={`text-xs font-medium ${agentProactivitySP === p.val ? "text-primary" : ""}`}>{p.label}</p>
                      <p className="text-[11px] text-muted-foreground">{p.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Longitud + Emojis en la misma fila */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Longitud de respuestas</label>
                  <div className="flex gap-1.5">
                    {RESPONSE_LENGTHS.map(r => (
                      <button key={r.val} onClick={() => setResponseLengthSP(r.val)}
                        className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${responseLengthSP === r.val ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/40"}`}>
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Uso de emojis</label>
                  <div className="flex gap-1.5">
                    {EMOJI_LEVELS.map(e => (
                      <button key={e.val} onClick={() => setEmojiLevelSP(e.val)}
                        className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${emojiLevelSP === e.val ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/40"}`}>
                        {e.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* FAQ */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Preguntas frecuentes <span className="text-[10px] text-muted-foreground">(opcional)</span></label>
                <div className="space-y-2">
                  {agentFaqSP.map((pair, i) => (
                    <div key={i} className="rounded-lg border p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground font-medium">Pregunta {i + 1}</span>
                        <button onClick={() => setAgentFaqSP(agentFaqSP.filter((_, j) => j !== i))} className="text-destructive hover:opacity-70">
                          <X size={12} />
                        </button>
                      </div>
                      <Input value={pair.q} onChange={e => setAgentFaqSP(agentFaqSP.map((p, j) => j === i ? { ...p, q: e.target.value } : p))}
                        placeholder="¿Cuál es el horario de atención?" className="h-7 text-xs" />
                      <Textarea value={pair.a} onChange={e => setAgentFaqSP(agentFaqSP.map((p, j) => j === i ? { ...p, a: e.target.value } : p))}
                        placeholder="Atendemos de lunes a viernes de 9am a 6pm." rows={2} className="text-xs resize-none" />
                    </div>
                  ))}
                  <button onClick={() => setAgentFaqSP([...agentFaqSP, { q: "", a: "" }])}
                    className="w-full text-xs border border-dashed rounded-lg py-2 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors flex items-center justify-center gap-1.5">
                    <Plus size={12} /> Añadir pregunta
                  </button>
                </div>
              </div>

              {/* Instrucciones adicionales */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Instrucciones adicionales <span className="text-[10px] text-muted-foreground">(opcional)</span></label>
                <Textarea ref={promptRef} value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} rows={5} className="text-xs font-mono resize-none leading-relaxed" placeholder="Restricciones específicas, información extra, casos especiales..." />
              </div>

              <div className="rounded-xl border border-border bg-secondary/30 px-3 py-2.5 space-y-1 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">Archivos soportados</p>
                <p>✅ Imágenes · ✅ PDFs · 🚫 Audios (respuesta automática)</p>
              </div>
            </div>
          )}

          {section === "capacidades" && (
            <>
            <div className="divide-y">
              {/* Agendar citas — requiere calendario seleccionado */}
              <div className="py-3 space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Agendar citas</p>
                    <p className="text-xs text-muted-foreground">Detecta intención de agendar y crea citas en el calendario</p>
                  </div>
                  <button
                    onClick={() => { if (schedulingCalendarId) setCanBook(v => !v); }}
                    disabled={!schedulingCalendarId}
                    className={`relative shrink-0 rounded-full transition-opacity ${!schedulingCalendarId ? "opacity-40 cursor-not-allowed" : ""}`}
                    style={{ width: 40, height: 22 }}
                  >
                    <span className={`absolute inset-0 rounded-full transition-colors ${canBook && schedulingCalendarId ? "bg-primary" : "bg-secondary border"}`} />
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${canBook && schedulingCalendarId ? "left-[22px]" : "left-0.5"}`} />
                  </button>
                </div>
                <select
                  value={schedulingCalendarId}
                  onChange={e => {
                    const val = e.target.value;
                    setSchedulingCalendarId(val);
                    if (!val) setCanBook(false);
                  }}
                  className="w-full text-xs h-8 rounded-lg border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">— Selecciona un calendario —</option>
                  {calendars.map(cal => (
                    <option key={cal.id} value={cal.id}>{cal.name ?? cal.slug ?? cal.id}</option>
                  ))}
                </select>
                {!schedulingCalendarId && (
                  <p className="text-[10px] text-muted-foreground">Selecciona un calendario para activar el agendamiento.</p>
                )}
              </div>
              {/* Crear contactos + datos a recopilar */}
              <div className="py-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Crear contactos</p>
                    <p className="text-xs text-muted-foreground">Guarda nuevos leads automáticamente</p>
                  </div>
                  <button onClick={() => setCanContacts(v => !v)} className="relative shrink-0 rounded-full" style={{ width: 40, height: 22 }}>
                    <span className={`absolute inset-0 rounded-full transition-colors ${canContacts ? "bg-primary" : "bg-secondary border"}`} />
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${canContacts ? "left-[22px]" : "left-0.5"}`} />
                  </button>
                </div>
                {canContacts && (
                  <div className="mt-3 pl-3 border-l-2 border-primary/20 space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Datos a recopilar del prospecto</p>
                    <div className="flex flex-wrap gap-1.5">
                      {DATA_COLLECT_OPTIONS.map(opt => {
                        const sel = agentDataCollect.includes(opt);
                        return (
                          <button key={opt} onClick={() => setAgentDataCollect(sel ? agentDataCollect.filter(o => o !== opt) : [...agentDataCollect, opt])}
                            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${sel ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"}`}>
                            {opt}
                          </button>
                        );
                      })}
                      {agentDataCollect.filter(o => !DATA_COLLECT_OPTIONS.includes(o)).map(custom => (
                        <span key={custom} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border bg-primary text-primary-foreground border-primary">
                          {custom}
                          <button onClick={() => setAgentDataCollect(agentDataCollect.filter(o => o !== custom))} className="hover:opacity-70"><X size={10} /></button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      <Input value={customDataField} onChange={e => setCustomDataField(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && customDataField.trim()) { setAgentDataCollect(prev => [...new Set([...prev, customDataField.trim()])]); setCustomDataField(""); } }}
                        placeholder="Personalizado (ej: Empresa, RFC...)" className="h-7 text-xs flex-1" />
                      <button onClick={() => { if (customDataField.trim()) { setAgentDataCollect(prev => [...new Set([...prev, customDataField.trim()])]); setCustomDataField(""); } }}
                        className="text-xs px-2.5 py-1 rounded-lg border border-primary text-primary hover:bg-primary/10 transition-colors shrink-0">
                        + Añadir
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {/* Transferir a humano + notificación inline */}
              <div className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Transferir a humano</p>
                    <p className="text-xs text-muted-foreground">El agente detecta cuando el cliente quiere hablar con una persona y cambia a modo Manual</p>
                  </div>
                  <button onClick={() => setCanTransfer(v => !v)} className="relative shrink-0 rounded-full" style={{ width: 40, height: 22 }}>
                    <span className={`absolute inset-0 rounded-full transition-colors ${canTransfer ? "bg-primary" : "bg-secondary border"}`} />
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${canTransfer ? "left-[22px]" : "left-0.5"}`} />
                  </button>
                </div>
                {canTransfer && (
                  <div className="mt-3 pl-3 border-l-2 border-primary/20 space-y-2.5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium">Notificación por email</p>
                        <p className="text-xs text-muted-foreground">Recibe un correo cuando se transfiere a modo Manual</p>
                      </div>
                      <button onClick={() => setNotifyOnTransfer(v => !v)} className="relative shrink-0 rounded-full" style={{ width: 40, height: 22 }}>
                        <span className={`absolute inset-0 rounded-full transition-colors ${notifyOnTransfer ? "bg-primary" : "bg-secondary border"}`} />
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${notifyOnTransfer ? "left-[22px]" : "left-0.5"}`} />
                      </button>
                    </div>
                    {notifyOnTransfer && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Correo de destino</p>
                        {editingNotifyEmail ? (
                          <div className="flex gap-2">
                            <Input type="email" value={notifyEmail} onChange={e => setNotifyEmail(e.target.value)} placeholder="tu@correo.com" className="h-8 text-xs flex-1" autoFocus />
                            <button type="button" onClick={() => setEditingNotifyEmail(false)} className="text-xs text-primary font-medium hover:underline shrink-0">Listo</button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-background border border-border/60">
                            <span className="text-xs text-foreground truncate">{notifyEmail || "Sin correo configurado"}</span>
                            <button type="button" onClick={() => setEditingNotifyEmail(true)} className="text-[11px] text-primary font-medium hover:underline shrink-0">Cambiar</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* Detectar pagos con IA */}
              <div className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Detectar pagos con IA</p>
                    <p className="text-xs text-muted-foreground">La IA analiza comprobantes de pago y registra ventas automáticamente</p>
                  </div>
                  <button onClick={() => setAutoDetectPaymentsSP(v => !v)} className="relative shrink-0 rounded-full" style={{ width: 40, height: 22 }}>
                    <span className={`absolute inset-0 rounded-full transition-colors ${autoDetectPaymentsSP ? "bg-primary" : "bg-secondary border"}`} />
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${autoDetectPaymentsSP ? "left-[22px]" : "left-0.5"}`} />
                  </button>
                </div>
                {autoDetectPaymentsSP && (
                  <div className="mt-3 pl-3 border-l-2 border-primary/20 space-y-2.5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium">Notificación por email</p>
                        <p className="text-xs text-muted-foreground">Recibe un correo cuando se registre una venta</p>
                      </div>
                      <button onClick={() => setPaymentNotifySP(v => !v)} className="relative shrink-0 rounded-full" style={{ width: 40, height: 22 }}>
                        <span className={`absolute inset-0 rounded-full transition-colors ${paymentNotifySP ? "bg-primary" : "bg-secondary border"}`} />
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${paymentNotifySP ? "left-[22px]" : "left-0.5"}`} />
                      </button>
                    </div>
                    {paymentNotifySP && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Correo de destino</p>
                        {editingPaymentEmail ? (
                          <div className="flex gap-2">
                            <Input type="email" value={paymentEmailSP} onChange={e => setPaymentEmailSP(e.target.value)} placeholder="tu@correo.com" className="h-8 text-xs flex-1" autoFocus />
                            <button type="button" onClick={() => setEditingPaymentEmail(false)} className="text-xs text-primary font-medium hover:underline shrink-0">Listo</button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-background border border-border/60">
                            <span className="text-xs text-foreground truncate">{paymentEmailSP || "Sin correo configurado"}</span>
                            <button type="button" onClick={() => setEditingPaymentEmail(true)} className="text-[11px] text-primary font-medium hover:underline shrink-0">Cambiar</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between py-3 border-t">
                <div>
                  <p className="text-sm font-medium">Hacer upsell / cross-sell</p>
                  <p className="text-xs text-muted-foreground">Sugiere productos complementarios cuando sea relevante</p>
                </div>
                <button onClick={() => setDoUpsell(v => !v)} className="relative shrink-0 rounded-full" style={{ width: 40, height: 22 }}>
                  <span className={`absolute inset-0 rounded-full transition-colors ${doUpsell ? "bg-primary" : "bg-secondary border"}`} />
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${doUpsell ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </div>
              <div className="flex items-center justify-between py-3 border-t">
                <div>
                  <p className="text-sm font-medium">Resumen de confirmación</p>
                  <p className="text-xs text-muted-foreground">Antes de cerrar una venta, resume lo acordado para confirmación del cliente</p>
                </div>
                <button onClick={() => setConfirmSummary(v => !v)} className="relative shrink-0 rounded-full" style={{ width: 40, height: 22 }}>
                  <span className={`absolute inset-0 rounded-full transition-colors ${confirmSummary ? "bg-primary" : "bg-secondary border"}`} />
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${confirmSummary ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </div>
            </div>

            {/* Información disponible para el agente */}
            <div className="border rounded-xl p-4 space-y-4 bg-secondary/20 mt-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Información disponible para el agente</p>

              {/* Servicios */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Servicios</p>
                <div className="flex gap-3">
                  {(["all", "selected", "none"] as const).map(mode => (
                    <label key={mode} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="sp-services-mode" checked={spServicesMode === mode} onChange={() => setSpServicesMode(mode)} className="accent-primary" />
                      <span className="text-sm">{mode === "all" ? "Todos" : mode === "selected" ? "Solo seleccionados" : "Ninguno"}</span>
                    </label>
                  ))}
                </div>
                {spServicesMode === "selected" && (
                  <div className="mt-1 border rounded-lg divide-y max-h-40 overflow-y-auto bg-background">
                    {allServices.filter(s => s.active).length === 0
                      ? <p className="px-3 py-2 text-xs text-muted-foreground">No hay servicios activos</p>
                      : allServices.filter(s => s.active).map(s => (
                          <label key={s.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-secondary/40 transition-colors">
                            <input type="checkbox" checked={spSelectedServiceIds.includes(s.id)}
                              onChange={e => setSpSelectedServiceIds(prev => e.target.checked ? [...prev, s.id] : prev.filter(id => id !== s.id))}
                              className="accent-primary shrink-0" />
                            <span className="text-sm">{s.name}</span>
                          </label>
                        ))
                    }
                  </div>
                )}
              </div>

              {/* Productos */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Productos</p>
                <div className="flex gap-3">
                  {(["all", "selected", "none"] as const).map(mode => (
                    <label key={mode} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="sp-products-mode" checked={spProductsMode === mode} onChange={() => setSpProductsMode(mode)} className="accent-primary" />
                      <span className="text-sm">{mode === "all" ? "Todos" : mode === "selected" ? "Solo seleccionados" : "Ninguno"}</span>
                    </label>
                  ))}
                </div>
                {spProductsMode === "selected" && (
                  <div className="mt-1 border rounded-lg divide-y bg-background max-h-52 overflow-y-auto">
                    {catalogs.map(cat => {
                      const catProductIds = catalogProductsMap.get(cat.id) ?? [];
                      const catProducts = allProducts.filter(p => catProductIds.includes(p.id) && p.is_active);
                      if (catProducts.length === 0) return null;
                      const allSelected = catProducts.every(p => spSelectedProductIds.includes(p.id));
                      const someSelected = catProducts.some(p => spSelectedProductIds.includes(p.id));
                      return (
                        <div key={cat.id}>
                          <label className="flex items-center gap-2.5 px-3 py-2 bg-secondary/30 cursor-pointer hover:bg-secondary/50 transition-colors">
                            <input type="checkbox" checked={allSelected} ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                              onChange={e => {
                                const ids = catProducts.map(p => p.id);
                                if (e.target.checked) setSpSelectedProductIds(prev => [...new Set([...prev, ...ids])]);
                                else setSpSelectedProductIds(prev => prev.filter(id => !ids.includes(id)));
                              }}
                              className="accent-primary shrink-0" />
                            <span className="text-xs font-semibold">{cat.name}</span>
                          </label>
                          {catProducts.map(p => (
                            <label key={p.id} className="flex items-center gap-2.5 px-3 py-2 pl-8 cursor-pointer hover:bg-secondary/40 transition-colors">
                              <input type="checkbox" checked={spSelectedProductIds.includes(p.id)}
                                onChange={e => setSpSelectedProductIds(prev => e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id))}
                                className="accent-primary shrink-0" />
                              <span className="text-sm">{p.name}</span>
                            </label>
                          ))}
                        </div>
                      );
                    })}
                    {/* Productos sin catálogo */}
                    {(() => {
                      const allCatProductIds = new Set(Array.from(catalogProductsMap.values()).flat());
                      const orphans = allProducts.filter(p => !allCatProductIds.has(p.id) && p.is_active);
                      if (orphans.length === 0) return null;
                      return (
                        <div>
                          <div className="px-3 py-2 bg-secondary/30">
                            <span className="text-xs font-semibold text-muted-foreground">Sin catálogo</span>
                          </div>
                          {orphans.map(p => (
                            <label key={p.id} className="flex items-center gap-2.5 px-3 py-2 pl-8 cursor-pointer hover:bg-secondary/40 transition-colors">
                              <input type="checkbox" checked={spSelectedProductIds.includes(p.id)}
                                onChange={e => setSpSelectedProductIds(prev => e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id))}
                                className="accent-primary shrink-0" />
                              <span className="text-sm">{p.name}</span>
                            </label>
                          ))}
                        </div>
                      );
                    })()}
                    {catalogs.length === 0 && allProducts.filter(p => p.is_active).length === 0 && (
                      <p className="px-3 py-2 text-xs text-muted-foreground">No hay productos activos</p>
                    )}
                  </div>
                )}
              </div>
            </div>
            </>
          )}

          {section === "horario" && (
            <div className="space-y-4">
              <div className="bg-secondary/40 rounded-xl px-4 py-3 space-y-1">
                <p className="text-xs font-medium">Horario del Asistente Virtual</p>
                <p className="text-xs text-muted-foreground">
                  Este horario controla <strong>cuándo el bot responde automáticamente</strong> por WhatsApp. No es el horario de atención de tu negocio. Por defecto 24/7.
                </p>
              </div>
              <WeeklySchedulePicker value={schedule} onChange={setSchedule} interval={30} />
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Zona horaria</label>
                <select value={timezone} onChange={e => setTimezone(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {(TIMEZONES.includes(timezone) ? TIMEZONES : [timezone, ...TIMEZONES]).map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Mensaje fuera de horario</label>
                <Textarea value={offHoursMsg} onChange={e => setOffHoursMsg(e.target.value)} rows={3} className="text-sm resize-none"
                  placeholder="Ej: ¡Hola! Estamos fuera de horario. Te atenderemos pronto." />
              </div>
            </div>
          )}

          {section === "perfil" && (
            <div className="space-y-5">
              {loadingProfile ? (
                <div className="flex justify-center pt-10">
                  <Loader2 size={20} className="animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Foto de perfil */}
                  <div className="space-y-3">
                    <label className="text-xs font-medium text-muted-foreground">Foto de perfil</label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-secondary flex items-center justify-center shrink-0 border">
                        {profilePicUrl ? (
                          <img src={profilePicUrl} alt="Perfil WA" className="w-full h-full object-cover" />
                        ) : (
                          <User size={26} className="text-muted-foreground" />
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <input
                          ref={photoInputRef}
                          type="file"
                          accept="image/jpeg,image/png"
                          className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); e.target.value = ""; }}
                        />
                        <Button
                          variant="outline" size="sm"
                          onClick={() => photoInputRef.current?.click()}
                          disabled={uploadingPhoto || !config?.phone_number_id}
                          className="h-8 text-xs gap-1.5"
                        >
                          {uploadingPhoto ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                          {uploadingPhoto ? "Subiendo..." : "Cambiar foto"}
                        </Button>
                        <p className="text-[10px] text-muted-foreground">JPG o PNG · Imagen cuadrada recomendada</p>
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Bio / Descripción</label>
                    <Textarea
                      value={bio}
                      onChange={e => setBio(e.target.value.slice(0, 139))}
                      rows={3}
                      className="text-sm resize-none"
                      placeholder="Ej: Servicio de atención al cliente 24/7"
                    />
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] ${bio.length >= 130 ? "text-amber-500" : "text-muted-foreground"}`}>
                        {bio.length}/139
                      </span>
                      <Button size="sm" onClick={handleSaveBio} disabled={savingBio || !config?.phone_number_id} className="h-7 text-xs gap-1.5">
                        {savingBio && <Loader2 size={11} className="animate-spin" />}
                        Guardar bio
                      </Button>
                    </div>
                  </div>

                  {!config?.phone_number_id && (
                    <p className="text-xs text-muted-foreground text-center bg-secondary/40 rounded-xl px-4 py-3">
                      Completa la conexión en el tab Conexión para editar el perfil.
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>

          {section === "etiquetas" && (
            <div className="space-y-4">
              {/* Lista de etiquetas existentes */}
              <div className="space-y-1">
                {labels.length === 0 && (
                  <p className="text-xs text-muted-foreground/60 italic text-center py-4">Sin etiquetas. Crea una abajo.</p>
                )}
                {labels.map(l => (
                  <div key={l.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border/60 bg-card">
                    {editingLabel?.id === l.id ? (
                      <div className="w-full space-y-2">
                        <div className="flex gap-1 flex-wrap">
                          {LABEL_COLORS.map(c => (
                            <button key={c} onClick={() => setEditingLabel(prev => prev ? { ...prev, color: c } : null)}
                              className="w-4 h-4 rounded-full border-2 transition-all"
                              style={{ backgroundColor: c, borderColor: editingLabel.color === c ? "#000" : "transparent" }}
                            />
                          ))}
                        </div>
                        <input
                          value={editingLabel.name}
                          onChange={e => setEditingLabel(prev => prev ? { ...prev, name: e.target.value } : null)}
                          className="w-full h-7 px-2 text-xs rounded-lg border border-input bg-background focus:outline-none"
                          placeholder="Nombre"
                          autoFocus
                        />
                        <textarea
                          value={editingLabel.hint ?? ""}
                          onChange={e => setEditingLabel(prev => prev ? { ...prev, hint: e.target.value } : null)}
                          placeholder="Sugerencia para IA (opcional) — ej: «cuando el usuario pregunta por precios o quiere comprar»"
                          rows={2}
                          className="w-full px-2 py-1.5 text-xs rounded-lg border border-input bg-background focus:outline-none resize-none"
                        />
                        <div className="flex gap-2">
                          <button onClick={async () => { await upsertLabel.mutateAsync(editingLabel); setEditingLabel(null); }}
                            disabled={!editingLabel.name.trim() || upsertLabel.isPending}
                            className="text-[11px] text-primary font-medium hover:underline">
                            Guardar
                          </button>
                          <button onClick={() => setEditingLabel(null)} className="text-[11px] text-muted-foreground hover:underline">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm">{l.name}</span>
                          {l.hint && <p className="text-[10px] text-muted-foreground/70 truncate">{l.hint}</p>}
                        </div>
                        <button onClick={() => setEditingLabel({ id: l.id, name: l.name, color: l.color, hint: l.hint ?? null })}
                          className="p-1 rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => deleteLabel.mutate(l.id)}
                          className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Formulario nueva etiqueta */}
              <div className="rounded-xl border border-dashed border-border p-3 space-y-2.5">
                <p className="text-xs font-medium text-muted-foreground">Nueva etiqueta</p>
                <div className="flex gap-1 flex-wrap">
                  {LABEL_COLORS.map(c => (
                    <button key={c} onClick={() => setNewLabelColor(c)}
                      className="w-5 h-5 rounded-full border-2 transition-all"
                      style={{ backgroundColor: c, borderColor: newLabelColor === c ? "#000" : "transparent" }}
                    />
                  ))}
                </div>
                <input
                  value={newLabelName}
                  onChange={e => setNewLabelName(e.target.value)}
                  placeholder="Nombre de la etiqueta"
                  className="w-full h-8 px-2.5 text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <textarea
                  value={newLabelHint}
                  onChange={e => setNewLabelHint(e.target.value)}
                  placeholder="Sugerencia para IA (opcional) — ej: «cuando el usuario pregunta por precios o quiere comprar»"
                  rows={2}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
                <button
                  onClick={async () => {
                    if (!newLabelName.trim()) return;
                    await upsertLabel.mutateAsync({ name: newLabelName.trim(), color: newLabelColor, hint: newLabelHint.trim() || null });
                    setNewLabelName("");
                    setNewLabelHint("");
                  }}
                  disabled={!newLabelName.trim() || upsertLabel.isPending}
                  className="flex items-center gap-1 px-3 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40"
                >
                  <Plus size={12} /> Crear etiqueta
                </button>
              </div>
            </div>
          )}

        {/* Footer — solo visible en tabs que tienen guardado global */}
        {section !== "perfil" && section !== "etiquetas" && (
          <div className="px-5 py-4 border-t shrink-0">
            <Button onClick={handleSave} disabled={saving} className="w-full h-9 gap-1.5">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              Guardar cambios
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Message Bubble ───────────────────────────────────────────────────────────
const MessageBubble = ({ msg, highlight }: { msg: CrmWaMessage; highlight?: boolean }) => {
  const isUser = msg.role === "user";
  const isNotif = !isUser && msg.content.startsWith("[notif]");
  const displayContent = isNotif ? msg.content.slice(7) : msg.content;

  const bubbleClass = isUser
    ? "bg-secondary text-foreground rounded-tl-sm"
    : isNotif
      ? "bg-blue-500 text-white rounded-tr-sm"
      : msg.role === "human"
        ? "bg-amber-500 text-white rounded-tr-sm"
        : "bg-emerald-500 text-white rounded-tr-sm";

  return (
    <div id={`msg-${msg.id}`} className={`flex ${isUser ? "justify-start" : "justify-end"} mb-2`}>
      <div className={`max-w-[78%] rounded-2xl overflow-hidden text-sm relative ${bubbleClass} ${highlight ? "ring-2 ring-yellow-400 ring-offset-1" : ""}`}>
        {/* Badge de notificación */}
        {isNotif && (
          <div className="flex items-center gap-1 px-3.5 pt-2 pb-0.5 text-[10px] font-semibold text-white/80 uppercase tracking-wide">
            <Bell size={9} /> Notificación automática
          </div>
        )}
        {/* Imagen */}
        {msg.media_type === "image" && msg.media_url && (
          <a href={msg.media_url} target="_blank" rel="noopener noreferrer">
            <img
              src={msg.media_url}
              alt="Imagen"
              className="w-full max-w-[260px] object-cover block"
              style={{ maxHeight: 220 }}
            />
          </a>
        )}
        {/* PDF */}
        {msg.media_type === "document" && msg.media_url && (
          <a
            href={msg.media_url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium underline underline-offset-2 ${isUser ? "text-primary" : "text-white"}`}
          >
            <span>📄</span> {displayContent.replace(/^\[PDF: /, "").replace(/\]$/, "")}
          </a>
        )}
        {/* Audio */}
        {msg.media_type === "audio" && (
          <div className={`flex items-center gap-2 px-3.5 py-2.5 text-xs ${isUser ? "text-muted-foreground" : "text-white/80"}`}>
            🎤 Mensaje de voz
          </div>
        )}
        {/* Texto (siempre, excepto si es solo placeholder de media) */}
        {!(msg.media_type === "document" || msg.media_type === "audio") && (
          <div className="px-3.5 py-2 leading-relaxed">
            {displayContent !== "[Imagen]" ? displayContent : null}
            {msg.send_error && (
              <div className="flex items-center gap-1 mt-1.5 text-[10px] opacity-80">
                <AlertTriangle size={10} />
                {msg.send_error === "whatsapp_window_expired" || msg.send_error === "24h_window_expired"
                  ? "No se pudo enviar: más de 24h sin interacción"
                  : "Error al enviar"}
              </div>
            )}
            <p className={`text-[10px] mt-1 ${isUser ? "text-muted-foreground" : "text-white/70"} text-right`}>
              {new Date(msg.created_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        )}
        {(msg.media_type === "document" || msg.media_type === "audio") && (
          <p className={`text-[10px] px-3.5 pb-2 ${isUser ? "text-muted-foreground" : "text-white/70"} text-right`}>
            {new Date(msg.created_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>
    </div>
  );
};

// ─── Chat Panel ───────────────────────────────────────────────────────────────
const ChatPanel = ({
  conv, onBack, onDelete, staffList, staffMap, highlightMessageId, onHighlightClear, pendingSale, onSaleConfirmed,
}: {
  conv: CrmWaConversation;
  onBack?: () => void;
  onDelete?: () => void;
  staffList: CrmStaff[];
  staffMap: Record<string, CrmStaff>;
  highlightMessageId?: string | null;
  onHighlightClear?: () => void;
  pendingSale?: CrmSale | null;
  onSaleConfirmed?: () => void;
}) => {
  const { data: messages = [], isLoading } = useWaMessages(conv.id);
  const { data: allLabels = [] }           = useWaLabels();
  const { data: convLabels = [] }          = useConversationLabels(conv.id);
  const toggleLabel                        = useToggleConversationLabel();
  const assignConv                         = useAssignConversation();
  const setMode = useSetWaConversationMode();
  const updateSale                         = useUpdateSale();
  const [text, setText]             = useState("");
  const [sending, setSending]       = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [windowError, setWindowError] = useState(false);
  const [showMenu, setShowMenu]     = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [paymentAction, setPaymentAction] = useState<"confirm" | "reject" | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<"confirm" | "reject" | null>(null);
  const bottomRef    = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleConfirmPayment = async () => {
    if (!pendingSale || paymentAction !== null) return;
    setPendingConfirm(null);
    setPaymentAction("confirm");
    try {
      await updateSale.mutateAsync({
        id: pendingSale.id,
        status: "confirmed" as any,
        is_paid: true as any,
        paid_at: new Date().toISOString() as any,
        justification: "Confirmado manualmente desde Agente IA",
      });
      if (pendingSale.product_id) {
        supabase.functions.invoke("send-deliverable", {
          body: { sale_id: pendingSale.id },
        }).catch(() => {});
      }
      toast.success("Pago confirmado y venta registrada");
      onSaleConfirmed?.();
    } catch { toast.error("Error al confirmar el pago"); }
    finally { setPaymentAction(null); }
  };

  const handleRejectPayment = async () => {
    if (!pendingSale || paymentAction !== null) return;
    setPendingConfirm(null);
    setPaymentAction("reject");
    try {
      await updateSale.mutateAsync({
        id: pendingSale.id,
        status: "rejected" as any,
        justification: "Rechazado manualmente desde Agente IA",
      });
      toast.success("Pago rechazado");
      onSaleConfirmed?.();
    } catch { toast.error("Error al rechazar el pago"); }
    finally { setPaymentAction(null); }
  };

  useEffect(() => {
    if (highlightMessageId) return; // el scroll al mensaje resaltado toma prioridad
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, highlightMessageId]);

  // Scroll al mensaje resaltado cuando los mensajes carguen
  useEffect(() => {
    if (!highlightMessageId || isLoading) return;
    // Siempre limpiar después de 3s, exista o no el elemento en DOM
    const t = setTimeout(() => onHighlightClear?.(), 3000);
    const el = document.getElementById(`msg-${highlightMessageId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    return () => clearTimeout(t);
  }, [highlightMessageId, isLoading, messages.length]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    setWindowError(false);
    try {
      const { data, error } = await supabase.functions.invoke("send-wa-message", {
        body: { conversation_id: conv.id, text: text.trim() },
      });
      if (error || data?.error === "24h_window_expired") {
        setWindowError(true);
        if (data?.error !== "24h_window_expired") toast.error("Error al enviar el mensaje");
      } else {
        setText("");
      }
    } catch { toast.error("Error al enviar"); }
    finally { setSending(false); }
  };

  const handleMediaUpload = async (file: File) => {
    if (uploadingMedia || sending) return;
    setUploadingMedia(true);
    setWindowError(false);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${conv.user_id}/${conv.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("chat-attachments").upload(path, file);
      if (uploadErr) { toast.error("Error al subir el archivo"); return; }

      const { data: urlData } = supabase.storage.from("chat-attachments").getPublicUrl(path);
      const mediaUrl = urlData.publicUrl;
      const mediaType = file.type.startsWith("image/") ? "image" : "document";

      const { data, error } = await supabase.functions.invoke("send-wa-message", {
        body: {
          conversation_id: conv.id,
          media_url: mediaUrl,
          media_type: mediaType,
          media_filename: file.name,
        },
      });
      if (error || data?.error === "24h_window_expired") {
        setWindowError(true);
        if (data?.error !== "24h_window_expired") toast.error("Error al enviar el archivo");
      }
    } catch { toast.error("Error al enviar"); }
    finally { setUploadingMedia(false); }
  };

  const handleToggleMode = async () => {
    const next = conv.mode === "AI" ? "HUMAN" : "AI";
    await setMode.mutateAsync({ id: conv.id, mode: next });
    toast.success(next === "AI" ? "Modo IA activado" : "Modo manual activado");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="px-3 sm:px-5 py-3 border-b flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Back button — mobile only */}
        {onBack && (
          <button onClick={onBack} className="lg:hidden p-1.5 rounded-lg hover:bg-secondary transition-colors shrink-0">
            <ChevronLeft size={18} className="text-muted-foreground" />
          </button>
        )}
        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0 ${
          conv.mode === "AI" ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-amber-100 dark:bg-amber-900/30"
        }`}>
          <span className={`text-sm font-bold ${conv.mode === "AI" ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
            {(conv.contact_name ?? conv.phone)[0].toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{conv.contact_name ?? `+${conv.phone}`}</p>
          {conv.contact_name && <p className="text-[11px] text-muted-foreground truncate">+{conv.phone}</p>}
        </div>

        {/* Segmented mode toggle */}
        <div className={`flex rounded-xl border overflow-hidden shrink-0 text-xs font-semibold transition-colors ${setMode.isPending ? "opacity-50 pointer-events-none" : ""}`}>
          <button
            onClick={() => conv.mode !== "AI" && handleToggleMode()}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 transition-colors ${
              conv.mode === "AI" ? "bg-emerald-500 text-white" : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            <Bot size={11} /> IA
          </button>
          <div className="w-px bg-border shrink-0" />
          <button
            onClick={() => conv.mode !== "HUMAN" && handleToggleMode()}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 transition-colors ${
              conv.mode === "HUMAN" ? "bg-amber-500 text-white" : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            <MessageSquare size={11} /> Manual
          </button>
        </div>

        {/* Label selector */}
        {allLabels.length > 0 && (
          <div className="relative shrink-0">
            <button
              onClick={() => setShowLabels(v => !v)}
              className={`p-1.5 rounded-lg transition-colors ${showLabels ? "bg-secondary" : "hover:bg-secondary"} text-muted-foreground hover:text-foreground`}
              title="Etiquetas"
            >
              <Tag size={15} />
            </button>
            {showLabels && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowLabels(false)} />
                <div className="absolute right-0 top-full mt-1.5 z-20 bg-card border rounded-xl shadow-lg py-1.5 min-w-[180px] overflow-hidden">
                  <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide px-3.5 pb-1">Etiquetas</p>
                  {allLabels.map(l => {
                    const active = convLabels.some(cl => cl.id === l.id);
                    return (
                      <button
                        key={l.id}
                        onClick={() => toggleLabel.mutate({ conversationId: conv.id, labelId: l.id, active: !active })}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-secondary/60 transition-colors"
                      >
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                        <span className="text-sm flex-1 text-left">{l.name}</span>
                        {active && <Check size={12} className="text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Assignment selector */}
        {staffList.length > 0 && (
          <div className="relative shrink-0">
            <button
              onClick={() => setShowAssign(v => !v)}
              className={`p-1.5 rounded-lg transition-colors ${showAssign ? "bg-secondary" : "hover:bg-secondary"} text-muted-foreground hover:text-foreground`}
              title={conv.assigned_to ? `Asignado a ${staffMap[conv.assigned_to]?.name ?? ""}` : "Asignar a staff"}
            >
              {conv.assigned_to && staffMap[conv.assigned_to]
                ? <span className="flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold text-white" style={{ backgroundColor: "#6366f1" }}>
                    {staffMap[conv.assigned_to].name.charAt(0).toUpperCase()}
                  </span>
                : <UserPlus size={15} />
              }
            </button>
            {showAssign && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowAssign(false)} />
                <div className="absolute right-0 top-full mt-1.5 z-20 bg-card border rounded-xl shadow-lg py-1.5 min-w-[190px] overflow-hidden">
                  <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide px-3.5 pb-1">Asignar a</p>
                  <button
                    onClick={async () => { await assignConv.mutateAsync({ conversationId: conv.id, staffId: null }); setShowAssign(false); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-secondary/60 transition-colors"
                  >
                    <span className="w-6 h-6 rounded-full border border-dashed border-border flex items-center justify-center text-muted-foreground">
                      <X size={10} />
                    </span>
                    <span className="text-sm text-muted-foreground">Sin asignar</span>
                    {!conv.assigned_to && <Check size={12} className="ml-auto text-primary shrink-0" />}
                  </button>
                  {staffList.filter(s => s.status === "active").map(s => (
                    <button
                      key={s.id}
                      onClick={async () => { await assignConv.mutateAsync({ conversationId: conv.id, staffId: s.id }); setShowAssign(false); }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-secondary/60 transition-colors"
                    >
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: "#6366f1" }}>
                        {s.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="text-sm flex-1 text-left truncate">{s.name}</span>
                      {conv.assigned_to === s.id && <Check size={12} className="text-primary shrink-0" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* 3-dot menu */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowMenu(v => !v)}
            className={`p-1.5 rounded-lg transition-colors ${showMenu ? "bg-secondary" : "hover:bg-secondary"} text-muted-foreground hover:text-foreground`}
          >
            <MoreVertical size={16} />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1.5 z-20 bg-card border rounded-xl shadow-lg py-1 min-w-[180px] overflow-hidden">
                <button
                  onClick={() => { setShowMenu(false); onDelete?.(); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 size={14} /> Eliminar chat
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Banner de pago pendiente */}
      {pendingSale && (
        <div className={`mx-3 mt-2 mb-0 rounded-xl border px-4 py-3 flex items-center gap-3 shrink-0 transition-colors ${
          pendingConfirm === "reject"
            ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20"
            : "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20"
        }`}>
          {pendingConfirm === "reject"
            ? <XCircle size={18} className="text-red-500 dark:text-red-400 shrink-0" />
            : <CreditCard size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
          }
          <div className="flex-1 min-w-0">
            {pendingConfirm === "confirm" && (
              <>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">¿Confirmar este pago?</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 truncate">
                  {pendingSale.product_name ?? pendingSale.service_name ?? "Comprobante recibido"} ·{" "}
                  <span className="font-bold">{formatSaleAmount(Number(pendingSale.amount), pendingSale.currency)}</span>
                </p>
              </>
            )}
            {pendingConfirm === "reject" && (
              <>
                <p className="text-sm font-semibold text-red-700 dark:text-red-300">¿Rechazar este pago?</p>
                <p className="text-xs text-red-600 dark:text-red-400">Esta acción no se puede deshacer.</p>
              </>
            )}
            {pendingConfirm === null && (
              <>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Pago pendiente de revisión</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 truncate">
                  {pendingSale.product_name ?? pendingSale.service_name ?? "Comprobante recibido"} ·{" "}
                  <span className="font-bold">{formatSaleAmount(Number(pendingSale.amount), pendingSale.currency)}</span>
                </p>
              </>
            )}
          </div>
          <div className="flex gap-1.5 shrink-0">
            {pendingConfirm === null ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-xs border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
                  onClick={() => setPendingConfirm("reject")}
                >
                  <XCircle size={13} className="mr-1" />Rechazar
                </Button>
                <Button
                  size="sm"
                  className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => setPendingConfirm("confirm")}
                >
                  <BadgeCheck size={13} className="mr-1" />Confirmar pago
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-xs"
                  disabled={paymentAction !== null}
                  onClick={() => setPendingConfirm(null)}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className={`h-7 px-2.5 text-xs text-white ${
                    pendingConfirm === "reject"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                  disabled={paymentAction !== null}
                  onClick={pendingConfirm === "confirm" ? handleConfirmPayment : handleRejectPayment}
                >
                  {paymentAction !== null
                    ? <Loader2 size={13} className="animate-spin mr-1" />
                    : null}
                  {pendingConfirm === "reject" ? "Sí, rechazar" : "Sí, confirmar"}
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <div className="flex justify-center pt-8"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
            <MessageSquare size={24} className="opacity-30" />
            <p className="text-xs">Sin mensajes aún</p>
          </div>
        ) : (
          messages.map(msg => <MessageBubble key={msg.id} msg={msg} highlight={msg.id === highlightMessageId} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t shrink-0 space-y-2">
        {windowError && (
          <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
            <AlertTriangle size={13} /> Ventana de 24h expirada — no se pueden enviar mensajes de texto libre.
          </div>
        )}
        {conv.mode === "AI" ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 rounded-xl px-4 py-3">
            <Bot size={13} className="text-emerald-500" />
            El agente IA responde automáticamente. Cambia a modo HUMAN para responder tú.
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleMediaUpload(f);
                e.target.value = "";
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-3 shrink-0"
              disabled={sending || uploadingMedia}
              onClick={() => fileInputRef.current?.click()}
              title="Enviar imagen o archivo"
            >
              {uploadingMedia ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
            </Button>
            <Input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Escribe un mensaje..."
              className="flex-1 h-10 text-sm"
              disabled={sending || uploadingMedia}
            />
            <Button onClick={handleSend} disabled={sending || uploadingMedia || !text.trim()} size="sm" className="h-10 px-3 shrink-0">
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const CrmAgentIA = ({
  isSuperAdmin = false,
  isSaasClient = false,
  isStaff      = false,
  isVendor     = false,
  ownerUserId,
}: {
  isSuperAdmin?: boolean;
  isSaasClient?: boolean;
  isStaff?:      boolean;
  isVendor?:     boolean;
  ownerUserId?:  string | null;
}) => {
  // Staff uses principal's userId to fetch config and conversations
  const principalId = isStaff ? (ownerUserId ?? undefined) : undefined;
  const { data: config, isLoading } = useAIAgentConfig(principalId);
  const { data: conversations = [] } = useWaConversations(principalId);
  const { data: pendingSales = [] }  = useAiPendingSales();
  const updateSaleStatus             = useUpdateSale();
  const deleteConv = useDeleteWaConversation();
  const { data: labels = [] }        = useWaLabels(principalId);
  const { data: convLabelsMap = {} } = useAllConversationLabels(principalId);
  const { data: staffList = [] }     = useStaff();
  const { staffRecord }              = useStaffPermissions();
  const staffMap = useMemo(() => Object.fromEntries(staffList.map(s => [s.id, s])), [staffList]);
  const [selectedId, setSelectedId]           = useState<string | null>(null);
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(null);
  const [mobileShowChat, setMobileShowChat]   = useState(false);
  const [showSettings, setShowSettings]       = useState(false);
  const [search, setSearch]                   = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [labelFilter, setLabelFilter]         = useState<string | null>(null);
  const [assignFilter, setAssignFilter]       = useState<"all" | "mine" | "unassigned">("all");
  const [wizardDone, setWizardDone]           = useState(false);
  const [forceWizard, setForceWizard]         = useState(false);
  const [deleteModalId, setDeleteModalId]     = useState<string | null>(null);

  const handleDisconnect = () => {
    setForceWizard(true);
    setWizardDone(false);
    setShowSettings(false);
  };

  const handleDeleteConv = async (id: string) => {
    try {
      await deleteConv.mutateAsync(id);
      if (selectedId === id) { setSelectedId(null); setMobileShowChat(false); }
      toast.success("Conversación eliminada");
    } catch { toast.error("Error al eliminar"); }
    finally { setDeleteModalId(null); }
  };

  const selectedConv = useMemo(
    () => conversations.find(c => c.id === selectedId) ?? null,
    [conversations, selectedId]
  );

  // Set de conversation IDs con pago pendiente — para lookup O(1)
  const pendingSaleConvIds = useMemo(
    () => new Set(pendingSales.map(s => s.wa_conversation_id).filter(Boolean)),
    [pendingSales],
  );
  // Map convId → sale (para el banner en el chat)
  const pendingSaleByConvId = useMemo(
    () => Object.fromEntries(pendingSales.filter(s => s.wa_conversation_id).map(s => [s.wa_conversation_id!, s])),
    [pendingSales],
  );

  const filteredConvs = useMemo(() => {
    let result = conversations.filter(c =>
      !search || (c.contact_name ?? c.phone).toLowerCase().includes(search.toLowerCase())
    );
    if (labelFilter) {
      result = result.filter(c => (convLabelsMap[c.id] ?? []).some(l => l.id === labelFilter));
    }
    if (assignFilter === "unassigned") {
      result = result.filter(c => !c.assigned_to);
    } else if (assignFilter === "mine" && staffRecord) {
      result = result.filter(c => c.assigned_to === staffRecord.id);
    }
    // Chats con pago pendiente al tope
    return [...result].sort((a, b) => {
      const ap = pendingSaleConvIds.has(a.id) ? 0 : 1;
      const bp = pendingSaleConvIds.has(b.id) ? 0 : 1;
      return ap - bp;
    });
  }, [conversations, search, labelFilter, convLabelsMap, assignFilter, staffRecord, pendingSaleConvIds]);

  // Debounce para búsqueda de mensajes
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data: msgResults = [], isFetching: searchingMsgs } = useSearchWaMessages(debouncedSearch);

  // Auto-select first conversation
  useEffect(() => {
    if (!selectedId && conversations.length > 0) setSelectedId(conversations[0].id);
  }, [conversations, selectedId]);

  // Re-registrar número y re-suscribir WABA al montar — restaura entrega y recepción silenciosamente
  const wabaSubscribed = useRef(false);
  useEffect(() => {
    if (wabaSubscribed.current) return;
    if (!config?.phone_number_id || !config?.access_token) return;
    wabaSubscribed.current = true;
    // Re-registro del número (restaura los 2 checks)
    fetch(`https://graph.facebook.com/v21.0/${config.phone_number_id}/register`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", pin: "123456" }),
    }).catch(() => {});
    // Re-suscripción del WABA (restaura el webhook)
    if (config.waba_id) {
      fetch(`https://graph.facebook.com/v21.0/${config.waba_id}/subscribed_apps`, {
        method: "POST",
        headers: { Authorization: `Bearer ${config.access_token}` },
      }).catch(() => {});
    }
  }, [config?.phone_number_id, config?.waba_id, config?.access_token]);


  // Access control
  if (!isSuperAdmin && !isSaasClient && !isStaff && !isVendor) return null;

  if (isLoading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 size={24} className="animate-spin text-muted-foreground" />
    </div>
  );

  const configRowExists = config !== null && config !== undefined;
  // Staff nunca ve el wizard — si no está configurado, muestra aviso
  const needsWizard = !isStaff && (forceWizard || (!configRowExists && !wizardDone));
  if (needsWizard) {
    return <SetupWizard onComplete={() => { setWizardDone(true); setForceWizard(false); }} />;
  }

  // Staff sin config del principal → aviso simple
  if (isStaff && !configRowExists) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
        <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center">
          <Bot size={22} className="text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold">Agente IA no configurado</p>
          <p className="text-xs text-muted-foreground">El titular de la cuenta aún no ha configurado el Agente de WhatsApp.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} onDisconnect={handleDisconnect} />}

      {/* Modal de confirmación para eliminar */}
      {deleteModalId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteModalId(null)} />
          <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 space-y-1">
              <div className="w-11 h-11 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <Trash2 size={20} className="text-destructive" />
              </div>
              <p className="text-base font-semibold">Eliminar chat</p>
              <p className="text-sm text-muted-foreground">
                Se eliminará el historial de mensajes. Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex border-t">
              <button
                onClick={() => setDeleteModalId(null)}
                className="flex-1 py-3.5 text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors border-r"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteConv(deleteModalId)}
                disabled={deleteConv.isPending}
                className="flex-1 py-3.5 text-sm font-semibold text-destructive hover:bg-destructive/10 transition-colors flex items-center justify-center gap-2"
              >
                {deleteConv.isPending ? <Loader2 size={14} className="animate-spin" /> : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col h-full -mx-4 -my-6 sm:-mx-6 sm:-my-8">

        {/* Top bar — oculto en mobile cuando el chat está abierto */}
        <div className={`px-4 sm:px-5 py-3 border-b flex items-center gap-3 shrink-0 bg-card ${mobileShowChat ? "hidden lg:flex" : "flex"}`}>
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Bot size={16} className="text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{config?.agent_name ?? "Agente IA"}</p>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config?.is_active ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                <span className="text-[11px] text-muted-foreground">{config?.is_active ? "Activo" : "Inactivo"}</span>
                {config?.verified_phone && (
                  <span className="text-[11px] text-muted-foreground truncate hidden sm:inline">· {config.verified_phone}</span>
                )}
              </div>
            </div>
          </div>
          {!isStaff && (
            <Button variant="outline" size="sm" onClick={() => setShowSettings(true)} className="h-8 gap-1.5 text-xs shrink-0">
              <Settings size={13} />
              <span className="hidden sm:inline">Configurar</span>
            </Button>
          )}
        </div>

        {/* Main layout */}
        <div className="flex flex-1 overflow-hidden">

          {/* Conversation list — full screen on mobile, sidebar on desktop */}
          <div className={`flex flex-col overflow-hidden border-r
            ${mobileShowChat ? "hidden lg:flex lg:w-72 lg:shrink-0" : "flex w-full lg:w-72 lg:shrink-0"}
          `}>
            <div className="p-3 border-b space-y-2">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-2.5 text-muted-foreground pointer-events-none" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar chats y mensajes..."
                  className="h-9 text-sm pl-7"
                />
              </div>
              {/* Filtros — solo visibles cuando no hay búsqueda activa */}
              {search.length < 3 && (
                <>
                  {staffList.length > 0 && (
                    <div className="flex rounded-lg border overflow-hidden text-[11px] font-medium">
                      {(["all", "unassigned", ...(staffRecord ? ["mine"] : [])] as const).map(f => (
                        <button
                          key={f}
                          onClick={() => setAssignFilter(f)}
                          className={`flex-1 py-1 transition-colors ${assignFilter === f ? "bg-secondary font-semibold" : "text-muted-foreground hover:bg-secondary/50"}`}
                        >
                          {f === "all" ? "Todas" : f === "unassigned" ? "Sin asignar" : "Mías"}
                        </button>
                      ))}
                    </div>
                  )}
                  {labels.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {labels.map(l => (
                        <button
                          key={l.id}
                          onClick={() => setLabelFilter(f => f === l.id ? null : l.id)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all"
                          style={labelFilter === l.id
                            ? { backgroundColor: l.color, color: "#fff" }
                            : { backgroundColor: `${l.color}20`, color: l.color, border: `1px solid ${l.color}40` }
                          }
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: labelFilter === l.id ? "#fff" : l.color }} />
                          {l.name}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {search.length < 3 ? (
                /* ── Lista normal ── */
                filteredConvs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground px-6 text-center">
                    <MessageSquare size={24} className="opacity-30" />
                    <p className="text-xs">Sin conversaciones aún. Cuando alguien te escriba por WhatsApp, aparecerá aquí.</p>
                  </div>
                ) : (
                  filteredConvs.map(conv => {
                    const hasPendingPayment = pendingSaleConvIds.has(conv.id);
                    const pendingSale = hasPendingPayment ? pendingSaleByConvId[conv.id] : null;
                    return (
                    <button
                      key={conv.id}
                      onClick={() => { setSelectedId(conv.id); setMobileShowChat(true); setHighlightMessageId(null); }}
                      className={`w-full text-left px-4 py-3.5 border-b transition-colors ${
                        selectedId === conv.id
                          ? hasPendingPayment ? "bg-amber-100 dark:bg-amber-900/30" : "bg-secondary"
                          : hasPendingPayment ? "bg-amber-50 dark:bg-amber-900/10 hover:bg-amber-100 dark:hover:bg-amber-900/20" : "hover:bg-secondary/50 active:bg-secondary/80"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          hasPendingPayment ? "bg-amber-200 dark:bg-amber-800/50" :
                          conv.mode === "AI" ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-amber-100 dark:bg-amber-900/30"
                        }`}>
                          {hasPendingPayment
                            ? <CreditCard size={16} className="text-amber-700 dark:text-amber-400" />
                            : <span className={`text-sm font-bold ${conv.mode === "AI" ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
                                {(conv.contact_name ?? conv.phone)[0].toUpperCase()}
                              </span>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{conv.contact_name ?? `+${conv.phone}`}</p>
                          {hasPendingPayment
                            ? <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium truncate">
                                💳 {pendingSale?.product_name ?? pendingSale?.service_name ?? "Pago pendiente"} · {formatSaleAmount(Number(pendingSale?.amount), pendingSale?.currency ?? null)}
                              </p>
                            : <p className="text-[11px] text-muted-foreground truncate">{conv.contact_name ? `+${conv.phone}` : formatTime(conv.last_message_at)}</p>
                          }
                          {(convLabelsMap[conv.id] ?? []).length > 0 && (
                            <div className="flex items-center gap-0.5 mt-0.5">
                              {(convLabelsMap[conv.id] ?? []).slice(0, 4).map(l => (
                                <span key={l.id} className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: l.color }} title={l.name} />
                              ))}
                              {(convLabelsMap[conv.id] ?? []).length > 4 && (
                                <span className="text-[9px] text-muted-foreground ml-0.5">+{(convLabelsMap[conv.id] ?? []).length - 4}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-[10px] text-muted-foreground">{formatTime(conv.last_message_at)}</span>
                          {hasPendingPayment
                            ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-800 dark:bg-amber-800/50 dark:text-amber-300">Pago</span>
                            : <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                conv.mode === "AI"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              }`}>{conv.mode === "AI" ? "IA" : "Manual"}</span>
                          }
                          {conv.assigned_to && staffMap[conv.assigned_to] && (
                            <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0" style={{ backgroundColor: "#6366f1" }} title={staffMap[conv.assigned_to].name}>
                              {staffMap[conv.assigned_to].name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                    );
                  })
                )
              ) : (
                /* ── Búsqueda unificada (≥3 chars) ── */
                (() => {
                  const q = search.toLowerCase();
                  const dq = debouncedSearch;

                  // Contactos que coinciden por nombre/teléfono
                  const contactMatches = conversations.filter(c =>
                    (c.contact_name ?? c.phone).toLowerCase().includes(q)
                  );
                  const contactIds = new Set(contactMatches.map(c => c.id));

                  // Mensajes que coinciden (sin duplicar convs ya en contactMatches)
                  const seenConvIds = new Set<string>();
                  const msgMatches = msgResults.filter(m => {
                    const cid = m.crm_wa_conversations?.id;
                    if (!cid || contactIds.has(cid) || seenConvIds.has(cid)) return false;
                    seenConvIds.add(cid);
                    return true;
                  });

                  const hasResults = contactMatches.length > 0 || msgMatches.length > 0;

                  if (!hasResults && !searchingMsgs) {
                    return (
                      <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground px-6 text-center">
                        <Search size={20} className="opacity-30" />
                        <p className="text-xs">Sin resultados para «{search}»</p>
                      </div>
                    );
                  }

                  return (
                    <>
                      {/* Sección: Chats */}
                      {contactMatches.length > 0 && (
                        <>
                          {msgMatches.length > 0 && (
                            <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide px-4 py-1.5 bg-secondary/30">Chats</p>
                          )}
                          {contactMatches.map(conv => (
                            <button
                              key={conv.id}
                              onClick={() => { setSelectedId(conv.id); setMobileShowChat(true); setSearch(""); setHighlightMessageId(null); }}
                              className={`w-full text-left px-4 py-3.5 border-b transition-colors ${
                                selectedId === conv.id ? "bg-secondary" : "hover:bg-secondary/50"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                                  conv.mode === "AI" ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-amber-100 dark:bg-amber-900/30"
                                }`}>
                                  <span className={`text-sm font-bold ${conv.mode === "AI" ? "text-emerald-700" : "text-amber-700"}`}>
                                    {(conv.contact_name ?? conv.phone)[0].toUpperCase()}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold truncate">{conv.contact_name ?? `+${conv.phone}`}</p>
                                  <p className="text-[11px] text-muted-foreground truncate">{conv.contact_name ? `+${conv.phone}` : formatTime(conv.last_message_at)}</p>
                                </div>
                                <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(conv.last_message_at)}</span>
                              </div>
                            </button>
                          ))}
                        </>
                      )}

                      {/* Sección: Mensajes */}
                      {(msgMatches.length > 0 || searchingMsgs) && (
                        <>
                          <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide px-4 py-1.5 bg-secondary/30 flex items-center gap-1.5">
                            Mensajes {searchingMsgs && <Loader2 size={10} className="animate-spin" />}
                          </p>
                          {msgMatches.map(msg => {
                            const conv = msg.crm_wa_conversations;
                            if (!conv) return null;
                            const contactLabel = conv.contact_name ?? `+${conv.phone}`;
                            const raw = msg.content;
                            const idx = raw.toLowerCase().indexOf(dq.toLowerCase());
                            const start = Math.max(0, idx - 25);
                            const end = Math.min(raw.length, idx + dq.length + 45);
                            const pre = start > 0 ? "…" : "";
                            const post = end < raw.length ? "…" : "";
                            const before = raw.slice(start, idx);
                            const match = raw.slice(idx, idx + dq.length);
                            const after = raw.slice(idx + dq.length, end);
                            return (
                              <button
                                key={msg.id}
                                onClick={() => {
                                  setSelectedId(conv.id);
                                  setHighlightMessageId(msg.id);
                                  setMobileShowChat(true);
                                  setSearch("");
                                }}
                                className="w-full text-left px-4 py-3 border-b hover:bg-secondary/50 transition-colors"
                              >
                                <div className="flex items-start gap-2.5">
                                  <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0 text-sm font-bold mt-0.5">
                                    {contactLabel[0].toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-sm font-semibold truncate">{contactLabel}</p>
                                      <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(msg.created_at)}</span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                                      {pre}{before}<mark className="bg-yellow-200 dark:bg-yellow-800 text-foreground not-italic rounded px-0.5">{match}</mark>{after}{post}
                                    </p>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </>
                      )}
                    </>
                  );
                })()
              )}
            </div>
          </div>

          {/* Chat area — full screen on mobile when open, flex-1 on desktop */}
          <div className={`overflow-hidden flex-col
            ${mobileShowChat ? "flex w-full lg:flex-1" : "hidden lg:flex lg:flex-1"}
          `}>
            {selectedConv ? (
              <ChatPanel
                conv={selectedConv}
                onBack={() => setMobileShowChat(false)}
                onDelete={isStaff ? undefined : () => setDeleteModalId(selectedConv.id)}
                staffList={staffList}
                staffMap={staffMap}
                highlightMessageId={highlightMessageId}
                onHighlightClear={() => setHighlightMessageId(null)}
                pendingSale={pendingSaleByConvId[selectedConv.id] ?? null}
                onSaleConfirmed={() => {/* react-query auto-refetches */}}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                <MessageSquare size={32} className="opacity-20" />
                <p className="text-sm">Selecciona una conversación</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default CrmAgentIA;
