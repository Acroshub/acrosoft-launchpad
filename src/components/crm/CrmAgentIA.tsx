import { useState, useEffect, useRef, useMemo, lazy, Suspense } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bot, Settings, Send, Wifi, WifiOff, MessageSquare, Loader2,
  CheckCircle2, AlertTriangle, Copy, Trash2, X, Eye, EyeOff,
  Check, ChevronRight, ChevronLeft, ChevronDown, MoreVertical, Zap, Clock, Calendar, Phone, Sparkles, Lock,
  User, Upload, Bell, Tag, Plus, Pencil, UserPlus, Search, Paperclip, CreditCard, BadgeCheck, XCircle, CheckCheck,
  GripVertical, GitBranch, ArrowLeft, Megaphone, Smile, StickyNote, Star, Archive,
} from "lucide-react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, useSortable,
  verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  useMarkConversationRead,
  useSearchWaMessages,
  useBusinessProfile,
  useProducts, useServices,
  useCatalogs, useCatalogProductsMap,
  useCalendars,
  useAiPendingSales, useUpdateSale,
  useAppointments, useContacts,
  useWaSequences, useUpsertWaSequence, useDeleteWaSequence,
  useWaFlows, useUpsertWaFlow, useDeleteWaFlow, useToggleWaFlow,
  useInsertLog,
  useCourses,
  useToggleFavorite,
  useArchiveConversation,
  useArchivedWaConversations,
  useMarkConversationUnread,
  useQuickReplies,
  useUpsertQuickReply,
  useDeleteQuickReply,
} from "@/hooks/useCrmData";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";
import CrmWaTemplates from "@/components/crm/CrmWaTemplates";
import CrmWaCampaigns from "@/components/crm/CrmWaCampaigns";
import { supabase } from "@/lib/supabase";
import type { CrmWaConversation, CrmWaMessage, CrmStaff, CrmSale, CrmAppointment, CrmContact, CrmWaSequence, SequenceStep, SequenceStepOption, SequenceStepMedia, CrmWaFlow, CrmWaFlowFinalAction, CrmQuickReply } from "@/lib/supabase";
import { useCurrentUser, useStaffPermissions } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatAmount } from "@/lib/currencies";
// ─── Emoji Picker inline (B19-8) ─────────────────────────────────────────────
// ─── Emoji Picker (B19-8) — carga dinámica para evitar crash del bundle ───────
const EmojiPickerLazy = lazy(() => import("@emoji-mart/react"));
const emojiDataPromise = () => import("@emoji-mart/data").then(m => m.default ?? m);

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

function formatSaleAmount(amount: number, currency: string | null): string {
  return formatAmount(Number(amount), currency, 2);
}

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(`${label} copiado`));
}

function getDateLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (msgDay.getTime() === today.getTime()) return "Hoy";
  if (msgDay.getTime() === yesterday.getTime()) return "Ayer";
  return d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
}

function getAvatarColor(name: string): string {
  const colors = [
    "#1877F2", "#0a57d0", "#00a884", "#25D366",
    "#FF6B6B", "#FF8C42", "#9B59B6", "#2ECC71",
    "#E67E22", "#3498DB", "#E91E63", "#00BCD4",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
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
  const { user: wizardUser } = useCurrentUser();
  const { data: existingConfig, isLoading: configLoading } = useAIAgentConfig();
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
  const [useBusinessFaqWiz, setUseBusinessFaqWiz] = useState(existingConfig?.use_business_faq ?? true);
  const [agentDataCollectWiz, setAgentDataCollectWiz] = useState<string[]>(existingConfig?.agent_data_collect ?? []);
  const [customDataFieldWiz, setCustomDataFieldWiz]   = useState("");

  // Step 3 — Capacidades
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
  const [coursesMode, setCoursesMode]                 = useState<"all"|"selected"|"none">(existingConfig?.courses_mode ?? "none");
  const [selectedCourseIds, setSelectedCourseIds]     = useState<string[]>(existingConfig?.selected_course_ids ?? []);

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

  // Auto-crear fila en DB para generar el verify_token. Espera a que el query
  // termine (existingConfig === null, no undefined) y a que user esté disponible,
  // para evitar que user!.id falle silenciosamente en el primer render.
  useEffect(() => {
    if (!configLoading && existingConfig === null && wizardUser) {
      upsert.mutateAsync({ agent_name: "Asistente" }).catch(() => {});
    }
  }, [configLoading, existingConfig, wizardUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
    await upsert.mutateAsync({
      can_book_appointments: !!schedulingCalendarIdWiz,
      scheduling_calendar_id: schedulingCalendarIdWiz || null,
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
      courses_mode: coursesMode,
      selected_course_ids: coursesMode === "selected" ? selectedCourseIds : [],
      agent_data_collect: agentDataCollectWiz,
    });
    setStep(3);
  };

  const handleSaveStep3 = async () => {
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
      use_business_faq: useBusinessFaqWiz,
    });
    setStep(4);
  };

  const handleSaveStep5 = async () => {
    await upsert.mutateAsync({ schedule, timezone, off_hours_message: offHoursMsg || null });
    // Cargar perfil actual al avanzar al paso 6
    if (phoneNumberId && accessToken) {
      fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/whatsapp_business_profile?fields=about,profile_picture_url`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then(r => r.json()).then(d => {
        if (d.data?.[0]) {
          setBio(d.data[0].about ?? "");
          // Solo cargar foto de Meta si no hay URL guardado en DB (Supabase Storage es fuente de verdad)
          if (!profilePicUrl) setProfilePicUrl(d.data[0].profile_picture_url ?? null);
        }
      }).catch(() => {});
    }
    setStep(6);
  };

  const handleWizardPhotoUpload = async (file: File) => {
    if (!phoneNumberId || !accessToken || !wabaId || !wizardUser?.id) return;
    setUploadingPhoto(true);
    try {
      // 1. Subir a Supabase Storage → URL permanente inmediata (fuente de verdad del CRM)
      const ext = file.type === "image/png" ? "png" : "jpg";
      const storagePath = `agent-photos/${wizardUser.id}/profile.${ext}`;
      const { error: storageErr } = await supabase.storage
        .from("form-uploads")
        .upload(storagePath, file, { upsert: true, contentType: file.type });
      if (storageErr) throw new Error(`Error al guardar foto: ${storageErr.message}`);

      const { data: { publicUrl } } = supabase.storage.from("form-uploads").getPublicUrl(storagePath);
      const urlWithBust = `${publicUrl}?t=${Date.now()}`;

      // 2. Guardar en DB y mostrar en UI al instante
      await upsert.mutateAsync({ profile_picture_url: urlWithBust });
      setProfilePicUrl(urlWithBust);

      // 3. Subir a Meta (awaited — necesitamos saber si realmente llegó)
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { data: metaData, error: metaError } = await supabase.functions.invoke("upload-wa-profile-photo", {
        body: { base64, mime_type: file.type },
      });

      if (metaError || metaData?.error) {
        const msg = metaData?.error ?? metaError?.message ?? "Error desconocido";
        toast.warning(`Foto guardada en el CRM, pero falló en WhatsApp: ${msg}`);
      } else {
        toast.success("Foto actualizada en el CRM y en WhatsApp Business");
      }
    } catch (e: any) {
      toast.error(e.message?.slice(0, 160) ?? "Error al subir foto");
    } finally { setUploadingPhoto(false); }
  };

  const handleSaveStep6Bio = async () => {
    if (!phoneNumberId || !accessToken || !bio.trim()) { setStep(7); return; }
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
    finally { setSavingBio(false); setStep(7); }
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

  const STEP_LABELS = ["Conexión", "Capacidades", "Agente IA", "Flujos", "Horario", "Perfil WA", "Activar"];

  return (
    <div className="h-full overflow-y-auto">
    <div className="flex flex-col items-center justify-center min-h-full py-10 px-4">
      <div className="w-full max-w-lg space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Bot size={24} className="text-primary" />
          </div>
          <h1 className="text-lg font-semibold">Configura tu Agente IA</h1>
          <p className="text-sm text-muted-foreground">{STEP_LABELS[step - 1]} — Paso {step} de 7</p>
        </div>

        <StepIndicator current={step} total={7} />

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

        {/* ── Step 3: Agente IA ── */}
        {step === 3 && (
          <div className="bg-card border rounded-2xl p-6 space-y-6">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2"><Sparkles size={14} />Agente IA</h2>
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
              <label className="text-xs font-medium text-muted-foreground">Preguntas frecuentes</label>

              {/* Toggle: usar FAQs del negocio */}
              <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2.5">
                <div>
                  <p className="text-xs font-medium">Usar FAQs de Mi Negocio</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {businessProfile?.agent_faq?.length
                      ? `${businessProfile.agent_faq.length} pregunta${businessProfile.agent_faq.length !== 1 ? "s" : ""} registrada${businessProfile.agent_faq.length !== 1 ? "s" : ""} en el perfil del negocio`
                      : "Configúralas en Mi Negocio → Negocio"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setUseBusinessFaqWiz(v => !v)}
                  className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${useBusinessFaqWiz ? "bg-primary" : "bg-muted-foreground/30"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${useBusinessFaqWiz ? "translate-x-4" : "translate-x-0"}`} />
                </button>
              </div>

              {/* FAQs específicas del agente */}
              <div className="space-y-2 pt-1">
                <p className="text-[10px] text-muted-foreground">Preguntas adicionales — solo para este agente de WhatsApp</p>
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
                <p>✅ <strong>Audios</strong> — transcribe la nota de voz y responde al contenido</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)} className="h-9 text-xs">Atrás</Button>
              <Button onClick={handleSaveStep3} disabled={upsert.isPending} className="flex-1 h-9 gap-1.5">
                {upsert.isPending && <Loader2 size={13} className="animate-spin" />}
                Continuar <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Capacidades ── */}
        {step === 2 && (
          <div className="bg-card border rounded-2xl p-6 space-y-4">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2"><Zap size={14} />Capacidades</h2>
              <p className="text-xs text-muted-foreground mt-0.5">¿Qué puede hacer el agente además de responder preguntas?</p>
            </div>
            <div className="divide-y">
              {/* Agendar citas */}
              <div className="py-3 space-y-2">
                <div>
                  <p className="text-sm font-medium">Agendar citas</p>
                  <p className="text-xs text-muted-foreground">Detecta intención de agendar y crea citas en el calendario</p>
                </div>
                <select
                  value={schedulingCalendarIdWiz}
                  onChange={e => setSchedulingCalendarIdWiz(e.target.value)}
                  className="w-full text-xs h-8 rounded-lg border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Ninguno</option>
                  {calendars.map(cal => (
                    <option key={cal.id} value={cal.id}>{cal.name ?? cal.slug ?? cal.id}</option>
                  ))}
                </select>
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
                      const catProducts = allProducts.filter(p => catProductIds.includes(p.id));
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
                              <span className="text-sm">{p.name}{!p.is_active && <span className="ml-1.5 text-[10px] text-muted-foreground/60">(privado)</span>}</span>
                            </label>
                          ))}
                        </div>
                      );
                    })}
                    {/* Productos sin catálogo */}
                    {(() => {
                      const allCatProductIds = new Set(Array.from(catalogProductsMap.values()).flat());
                      const orphans = allProducts.filter(p => !allCatProductIds.has(p.id));
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
                              <span className="text-sm">{p.name}{!p.is_active && <span className="ml-1.5 text-[10px] text-muted-foreground/60">(privado)</span>}</span>
                            </label>
                          ))}
                        </div>
                      );
                    })()}
                    {catalogs.length === 0 && allProducts.length === 0 && (
                      <p className="px-3 py-2 text-xs text-muted-foreground">No hay productos</p>
                    )}
                  </div>
                )}
              </div>

              {/* Cursos */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Cursos</p>
                <div className="flex gap-3">
                  {(["all", "selected", "none"] as const).map(mode => (
                    <label key={mode} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="wiz-courses-mode" checked={coursesMode === mode} onChange={() => setCoursesMode(mode)} className="accent-primary" />
                      <span className="text-sm">{mode === "all" ? "Todos" : mode === "selected" ? "Solo seleccionados" : "Ninguno"}</span>
                    </label>
                  ))}
                </div>
                {coursesMode === "selected" && (
                  <div className="mt-1 border rounded-lg divide-y max-h-40 overflow-y-auto bg-background">
                    {allCourses.filter(c => c.is_published).length === 0
                      ? <p className="px-3 py-2 text-xs text-muted-foreground">No hay cursos publicados</p>
                      : allCourses.filter(c => c.is_published).map(c => (
                          <label key={c.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-secondary/40 transition-colors">
                            <input type="checkbox" checked={selectedCourseIds.includes(c.id)}
                              onChange={e => setSelectedCourseIds(prev => e.target.checked ? [...prev, c.id] : prev.filter(id => id !== c.id))}
                              className="accent-primary shrink-0" />
                            <span className="text-sm">{c.title}</span>
                          </label>
                        ))
                    }
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(1)} className="h-9 text-xs">Atrás</Button>
              <Button onClick={handleSaveStep2} disabled={upsert.isPending} className="flex-1 h-9 gap-1.5">
                {upsert.isPending && <Loader2 size={13} className="animate-spin" />}
                Continuar <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 4: Flujos ── */}
        {step === 4 && (
          <div className="bg-card border rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2"><GitBranch size={14} />Flujos de WhatsApp</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Los flujos automatizan respuestas según la intención del mensaje: cuando el agente IA detecta que el contacto
                tiene una intención específica, envía automáticamente una secuencia de mensajes y ejecuta una acción al finalizar.
              </p>
            </div>
            <div className="bg-secondary/40 rounded-xl p-4 space-y-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">¿Cómo funcionan?</p>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <span><strong>Disparador:</strong> El agente IA detecta la intención del mensaje (ej. "cuando el cliente pregunte por precios o quiera cotizar")</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <span><strong>Secuencia:</strong> El asistente envía automáticamente una serie de mensajes predefinidos</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <span><strong>Acción final:</strong> Continúa la conversación, transfiere a un humano o agenda una cita</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Puedes crear y gestionar tus flujos desde <strong>Configuración → Flujos</strong> después de la activación.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(3)} className="h-9 text-xs">Atrás</Button>
              <Button onClick={() => setStep(5)} className="flex-1 h-9 gap-1.5">
                Continuar <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 5: Horario ── */}
        {step === 5 && (
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
              <Button variant="outline" onClick={() => setStep(4)} className="h-9 text-xs">Atrás</Button>
              <Button onClick={handleSaveStep5} disabled={upsert.isPending} className="flex-1 h-9 gap-1.5">
                {upsert.isPending && <Loader2 size={13} className="animate-spin" />}
                Continuar <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 6: Perfil WA ── */}
        {step === 6 && (
          <div className="bg-card border rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2"><User size={14} />Perfil de WhatsApp</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Opcional — puedes configurarlo ahora o más tarde desde Configuración.</p>
            </div>

            {/* Foto de perfil */}
            <div className="space-y-3">
              <label className="text-xs font-medium text-muted-foreground">Foto de perfil</label>
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 shrink-0">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-secondary flex items-center justify-center border">
                    {profilePicUrl
                      ? <img src={profilePicUrl} alt="Perfil WA" className={`w-full h-full object-cover transition-opacity duration-300 ${uploadingPhoto ? "opacity-40" : "opacity-100"}`} />
                      : <User size={26} className="text-muted-foreground" />
                    }
                  </div>
                  {uploadingPhoto && (
                    <div className="absolute inset-0 rounded-full flex items-center justify-center bg-background/60">
                      <Loader2 size={20} className="animate-spin text-primary" />
                    </div>
                  )}
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
              <Button variant="outline" onClick={() => setStep(5)} className="h-9 text-xs shrink-0">Atrás</Button>
              <Button variant="outline" onClick={() => setStep(7)} className="h-9 text-xs shrink-0">Omitir</Button>
              <Button onClick={handleSaveStep6Bio} disabled={savingBio} className="flex-1 h-9 gap-1.5">
                {savingBio ? <Loader2 size={13} className="animate-spin" /> : <ChevronRight size={14} />}
                Guardar y continuar
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 7: Resumen + Activar ── */}
        {step === 7 && (
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
                { label: "Capacidades", value: [!!schedulingCalendarIdWiz && "Citas", canContacts && "Contactos", canServices && "Servicios", canTransfer && "Transfer"].filter(Boolean).join(" · ") || "Solo responder preguntas" },
                { label: "Zona horaria", value: timezone },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between gap-4 py-2 border-b last:border-0">
                  <span className="text-xs text-muted-foreground shrink-0">{label}</span>
                  <span className="text-xs font-medium text-right">{value}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(6)} className="h-9 text-xs shrink-0">Atrás</Button>
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
    </div>
  );
};

// ─── Sequence + Flow Builder helpers ─────────────────────────────────────────

type DraftSequence = { id?: string; name: string; product_id: string | null; steps: SequenceStep[] };

type StepBranchInfo = { label: string; branchIdx: number; pos: number; total: number };

const BRANCH_COLORS = [
  { bar: "bg-emerald-400", pill: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", border: "border-emerald-400/30", bg: "bg-emerald-500/5", text: "text-emerald-600 dark:text-emerald-400", hex: "#34d399" },
  { bar: "bg-rose-400",    pill: "bg-rose-400/10 text-rose-500 dark:text-rose-400 border-rose-400/20",             border: "border-rose-400/30",    bg: "bg-rose-400/5",    text: "text-rose-500 dark:text-rose-400",     hex: "#fb7185" },
  { bar: "bg-blue-400",    pill: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",             border: "border-blue-400/30",    bg: "bg-blue-400/5",    text: "text-blue-600 dark:text-blue-400",     hex: "#60a5fa" },
  { bar: "bg-amber-400",   pill: "bg-amber-400/10 text-amber-600 dark:text-amber-400 border-amber-400/20",         border: "border-amber-400/30",   bg: "bg-amber-400/5",   text: "text-amber-600 dark:text-amber-400",   hex: "#fbbf24" },
  { bar: "bg-purple-400",  pill: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",     border: "border-purple-400/30",  bg: "bg-purple-400/5",  text: "text-purple-600 dark:text-purple-400", hex: "#c084fc" },
];

type DraftFlow = {
  id?: string
  name: string
  trigger_text: string
  sequence_id: string | null
  final_action: CrmWaFlowFinalAction
  is_active: boolean
  trigger_once: boolean
  flow_trigger_type: "new_conversation" | "intent"
};

const FLOW_FINAL_ACTION_LABELS: Record<CrmWaFlowFinalAction, string> = {
  nothing:       "Continuar con IA",
  human_handoff: "Continuar con Humano",
} as const;

function newDraftFlow(): DraftFlow {
  return { name: "", trigger_text: "", sequence_id: null, final_action: "nothing", is_active: true, trigger_once: true, flow_trigger_type: "new_conversation" };
}

const STEP_TYPE_LABELS = {
  message: "Texto", question: "Pregunta",
  image: "Imagen", video: "Video", audio: "Audio", file: "Archivo", link: "Link",
} as const;

// WhatsApp Cloud API soporta estos formatos solamente
const STEP_ACCEPT = {
  image: "image/jpeg,image/png,.jpg,.jpeg,.png",
  video: "video/mp4,video/3gpp,.mp4,.3gp",
  audio: "audio/aac,audio/mp4,audio/mpeg,audio/amr,audio/ogg,audio/x-m4a,.aac,.m4a,.mp3,.amr,.ogg",
  file: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.7z",
} as const;

const WA_FORMAT_HINT: Partial<Record<SequenceStep["type"], string>> = {
  image: "JPG o PNG · máx 5 MB",
  video: "MP4 con codec H.264 · máx 16 MB (no MOV, no HEVC)",
  audio: "MP3, AAC, OGG, AMR o M4A · máx 16 MB",
  file: "PDF, Word, Excel, ZIP · máx 100 MB",
};

// Lee los primeros bytes del archivo para detectar el formato real (ignora extensión)
async function readMagicBytes(file: File): Promise<Uint8Array> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => resolve(new Uint8Array(e.target?.result as ArrayBuffer));
    reader.readAsArrayBuffer(file.slice(0, 12));
  });
}

// Devuelve el MIME type real del archivo según sus magic bytes, o null si no se puede detectar
function detectRealMime(bytes: Uint8Array): string | null {
  // MP3: ID3 tag o sync word FF Fx
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) return "audio/mpeg";
  if (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0) return "audio/mpeg";
  // OGG
  if (bytes[0] === 0x4F && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) return "audio/ogg";
  // FTYP box (MP4 / M4A / MOV / 3GP) — offset 4
  if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (brand === "qt  ") return "video/quicktime";           // MOV — no soportado
    if (brand.startsWith("M4A") || brand.startsWith("M4B")) return "audio/mp4"; // M4A
    if (brand === "3gp5" || brand === "3gp4" || brand === "3g2a") return "video/3gpp";
    return "video/mp4"; // isom, mp42, avc1, dash, etc.
  }
  // JPEG
  if (bytes[0] === 0xFF && bytes[1] === 0xD8) return "image/jpeg";
  // PNG
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return "image/png";
  return null;
}

// MIME types aceptados por WhatsApp Cloud API
const WA_VALID_MIME: Partial<Record<SequenceStep["type"], Set<string>>> = {
  image: new Set(["image/jpeg", "image/png"]),
  video: new Set(["video/mp4", "video/3gpp"]),
  audio: new Set(["audio/aac", "audio/mp4", "audio/mpeg", "audio/amr", "audio/ogg"]),
};

const MEDIA_TYPES = new Set(["image", "video", "audio", "file"]);
const LINK_TYPE = "link";

function newStep(type: SequenceStep["type"]): SequenceStep {
  return {
    id: crypto.randomUUID(),
    type,
    text: "",
    options: type === "question" ? [{ label: "", next_step_id: null }] : undefined,
    media: MEDIA_TYPES.has(type) ? [] : undefined,
  };
}

function getStepPreview(s: SequenceStep, maxLen: number): string | null {
  if (s.type === "message" || s.type === "question") return s.text?.trim().slice(0, maxLen) || null;
  if (s.type === "link") return s.link_url?.slice(0, maxLen) || null;
  return s.media?.[0]?.name?.slice(0, maxLen) || null;
}

// Recalcula next_step_id en todos los pasos no-pregunta según la estructura de ramas actual.
// Reglas: pasos en preludio/shared → cadena secuencial; pasos en rama → apuntan al siguiente
// de su misma rama o al primer paso compartido; fin de rama → null.
function computeNextStepIds(steps: SequenceStep[]): SequenceStep[] {
  // 1. Construir ramas activas (igual que el useMemo activeBranches pero standalone)
  type Branch = { targetIdx: number; insertBeforeIdx: number | null };
  const branches: Branch[] = [];
  for (const s of steps) {
    if (s.type !== "question") continue;
    const targets = (s.options ?? [])
      .filter(o => o.label.trim() && o.next_step_id)
      .map(o => ({ idx: steps.findIndex(st => st.id === o.next_step_id) }))
      .filter(t => t.idx >= 0)
      .sort((a, b) => a.idx - b.idx);
    const deduped = targets.filter((t, i, arr) => arr.findIndex(x => x.idx === t.idx) === i);
    for (let i = 0; i < deduped.length; i++) {
      branches.push({ targetIdx: deduped[i].idx, insertBeforeIdx: deduped[i + 1]?.idx ?? null });
    }
  }

  // 2. Asignar rama a cada paso no-compartido (mayor targetIdx gana = rama más interna)
  const branchMap = new Map<string, number>(); // stepId → branchIdx
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (step.shared) continue;
    let bestBi = -1, bestStart = -1;
    for (let bi = 0; bi < branches.length; bi++) {
      const start = branches[bi].targetIdx;
      const end = branches[bi].insertBeforeIdx ?? steps.length;
      if (i >= start && i < end && start > bestStart) { bestBi = bi; bestStart = start; }
    }
    if (bestBi >= 0) branchMap.set(step.id, bestBi);
  }

  // 3. Calcular next_step_id para cada paso no-pregunta
  return steps.map((step, i) => {
    if (step.type === "question") return step; // la pregunta navega mediante opciones
    const nextStep = steps[i + 1];

    if (step.shared) {
      return { ...step, next_step_id: nextStep?.id ?? null };
    }

    const myBranchIdx = branchMap.get(step.id);

    // Preludio (antes de cualquier rama): cadena secuencial
    if (myBranchIdx === undefined) {
      return { ...step, next_step_id: nextStep?.id ?? null };
    }

    if (!nextStep) return { ...step, next_step_id: null };
    if (nextStep.shared) return { ...step, next_step_id: nextStep.id };

    // Paso siguiente no-compartido: mismo branchIdx → continuar; distinto → fin de rama
    const nextBranchIdx = branchMap.get(nextStep.id);
    if (nextBranchIdx === myBranchIdx) {
      return { ...step, next_step_id: nextStep.id };
    }

    // Pregunta anidada dentro del mismo rango de rama
    if (nextStep.type === "question") {
      const br = branches[myBranchIdx];
      if (i + 1 < (br.insertBeforeIdx ?? steps.length)) {
        return { ...step, next_step_id: nextStep.id };
      }
    }

    // Fin de rama: saltar al primer paso compartido, o null
    const firstShared = steps.slice(i + 1).find(s => s.shared);
    return { ...step, next_step_id: firstShared?.id ?? null };
  });
}

function SortableSequenceStep({
  step, index, allSteps, onChange, onRemove, userId, branchInfo, isShared, isHighlighted,
  availableBranches, onMoveToBranch,
}: {
  step: SequenceStep; index: number; allSteps: SequenceStep[];
  onChange: (s: SequenceStep) => void; onRemove: () => void; userId: string;
  branchInfo?: StepBranchInfo; isShared?: boolean; isHighlighted?: boolean;
  availableBranches?: Array<{ label: string; branchIdx: number }>;
  onMoveToBranch?: (target: number | "shared") => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [badgeMenuOpen, setBadgeMenuOpen] = useState(false);
  const badgeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!badgeMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (badgeMenuRef.current && !badgeMenuRef.current.contains(e.target as Node)) {
        setBadgeMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [badgeMenuOpen]);

  const isMedia = MEDIA_TYPES.has(step.type);

  const handleTypeChange = (newType: SequenceStep["type"]) => {
    const nowMedia = MEDIA_TYPES.has(newType);
    onChange({
      ...step,
      type: newType,
      options: newType === "question" ? (step.options?.length ? step.options : [{ label: "", next_step_id: null }]) : undefined,
      media: nowMedia ? (step.media ?? []) : undefined,
    });
  };

  const handleFiles = async (files: FileList) => {
    if (!userId) return;
    setUploading(true);
    try {
      const added: SequenceStepMedia[] = [];
      for (const file of Array.from(files)) {
        // Detectar formato real leyendo magic bytes (ignora extensión renombrada)
        const magic = await readMagicBytes(file);
        const realMime = detectRealMime(magic);

        // Si detectamos MOV (QuickTime), bloquearlo aunque la extensión diga .mp4
        if (realMime === "video/quicktime") {
          toast.error(
            `"${file.name}" es un video MOV/QuickTime — WhatsApp no lo soporta aunque tenga extensión .mp4.\n\nConverti el video a MP4 verdadero (H.264) con QuickTime → Exportar como → 1080p, o usa un convertidor online.`,
            { duration: 8000 },
          );
          continue;
        }

        // Usar el MIME real si lo detectamos; si no, confiar en file.type pero normalizarlo
        const effectiveMime = realMime ?? file.type;
        // Normalizar variantes de M4A → audio/mp4 (es lo que WhatsApp acepta)
        const normalizedMime = (effectiveMime === "audio/x-m4a" || effectiveMime === "audio/m4a")
          ? "audio/mp4"
          : effectiveMime;

        const validMimes = WA_VALID_MIME[step.type];
        if (validMimes && normalizedMime && !validMimes.has(normalizedMime)) {
          toast.error(
            `Formato no compatible con WhatsApp: "${file.name}" (${normalizedMime})\nUsa: ${WA_FORMAT_HINT[step.type]}`,
            { duration: 6000 },
          );
          continue;
        }

        const safeName = file.name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._\-]/g, "_");
        const path = `wa-sequences/${userId}/${step.id}/${Date.now()}_${safeName}`;
        const { error } = await supabase.storage.from("form-uploads").upload(path, file, { contentType: normalizedMime || file.type, upsert: true });
        if (error) { toast.error(`Error al subir ${file.name}: ${error.message}`); continue; }
        const { data: { publicUrl } } = supabase.storage.from("form-uploads").getPublicUrl(path);
        added.push({ url: publicUrl, name: file.name, mime_type: normalizedMime || file.type });
      }
      // Reemplazar (no acumular): WhatsApp solo envía 1 archivo por mensaje
      if (added.length) onChange({ ...step, media: added });
    } finally { setUploading(false); }
  };

  const setOption = (i: number, patch: Partial<SequenceStepOption>) => {
    const opts = [...(step.options ?? [])];
    opts[i] = { ...opts[i], ...patch };
    onChange({ ...step, options: opts });
  };
  const addOption = () => {
    if ((step.options?.length ?? 0) >= 3) return;
    onChange({ ...step, options: [...(step.options ?? []), { label: "", next_step_id: null }] });
  };

  const branchColor = branchInfo ? BRANCH_COLORS[branchInfo.branchIdx % BRANCH_COLORS.length] : null;
  const hasLeftBar = branchColor || isShared;
  const leftPad = hasLeftBar ? "pl-4 pr-3" : "px-3";

  return (
    <div
      id={`seq-step-${step.id}`}
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border bg-card transition-all duration-500 relative overflow-hidden ${
        isHighlighted ? "border-primary ring-2 ring-primary/25 shadow-md shadow-primary/10" : "border-border"
      }`}
    >
      {/* Barra lateral: coloreada para ramas, gris punteada para compartido */}
      {branchColor && (
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${branchColor.bar} rounded-l-xl`} />
      )}
      {isShared && !branchColor && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-border rounded-l-xl" style={{ backgroundImage: "repeating-linear-gradient(to bottom, transparent 0px, transparent 4px, hsl(var(--muted-foreground)/0.3) 4px, hsl(var(--muted-foreground)/0.3) 8px)" }} />
      )}
      {/* Header */}
      <div className={`flex items-center gap-2 py-2 border-b border-border/60 ${leftPad}`}>
        <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground/65 hover:text-muted-foreground touch-none">
          <GripVertical size={14} />
        </button>
        <span className="text-[11px] font-medium text-muted-foreground shrink-0">Paso {index + 1}</span>
        {/* Badge clicable: abre menú para cambiar de rama */}
        {(branchInfo || isShared) && onMoveToBranch ? (
          <div ref={badgeMenuRef} className="relative shrink-0">
            <button
              onClick={() => setBadgeMenuOpen(v => !v)}
              title="Cambiar de rama"
              className={`text-[9px] px-1.5 py-0.5 rounded-full border font-semibold cursor-pointer hover:opacity-75 transition-opacity ${
                branchInfo && branchColor
                  ? branchColor.pill
                  : "border-border bg-secondary/60 text-muted-foreground"
              }`}
            >
              {branchInfo
                ? `${branchInfo.label} · ${branchInfo.pos}/${branchInfo.total}`
                : "↩ Compartido"}
            </button>
            {badgeMenuOpen && (
              <div className="absolute left-0 top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[140px]">
                <p className="text-[9px] text-muted-foreground/70 px-2.5 py-1 border-b border-border/40 font-medium">Mover a:</p>
                {availableBranches?.filter(b => b.branchIdx !== branchInfo?.branchIdx).map(b => {
                  const c = BRANCH_COLORS[b.branchIdx % BRANCH_COLORS.length];
                  return (
                    <button key={b.branchIdx}
                      onClick={() => { onMoveToBranch(b.branchIdx); setBadgeMenuOpen(false); }}
                      className="flex items-center gap-2 w-full px-2.5 py-1.5 text-[10px] hover:bg-secondary/60 transition-colors text-left">
                      <span className={`w-2 h-2 shrink-0 rounded-full ${c.bar}`} />
                      <span>Rama "{b.label}"</span>
                    </button>
                  );
                })}
                {!isShared && (
                  <button
                    onClick={() => { onMoveToBranch("shared"); setBadgeMenuOpen(false); }}
                    className="flex items-center gap-2 w-full px-2.5 py-1.5 text-[10px] hover:bg-secondary/60 transition-colors text-muted-foreground text-left">
                    <span className="w-2 h-2 shrink-0 rounded-full border border-border bg-muted/50" />
                    <span>Paso compartido</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            {branchInfo && branchColor && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full border shrink-0 font-semibold tabular-nums ${branchColor.pill}`}>
                {branchInfo.label} · {branchInfo.pos}/{branchInfo.total}
              </span>
            )}
            {isShared && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-border bg-secondary/60 text-muted-foreground shrink-0 font-medium">
                ↩ Compartido
              </span>
            )}
          </>
        )}
        <select
          value={step.type}
          onChange={e => handleTypeChange(e.target.value as SequenceStep["type"])}
          className="ml-1 h-6 px-1.5 text-[10px] rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
        >
          {(["message", "question", "link", "image", "video", "audio", "file"] as const).map(t => (
            <option key={t} value={t}>{STEP_TYPE_LABELS[t]}</option>
          ))}
        </select>
        <button onClick={onRemove} className="ml-auto p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 size={12} />
        </button>
      </div>

      {/* Body */}
      <div className={`p-3 space-y-2 ${hasLeftBar ? "pl-4" : ""}`}>
        {/* Texto del mensaje */}
        {step.type === "message" && (
          <div className="space-y-1.5">
            <textarea
              value={step.text ?? ""}
              onChange={e => onChange({ ...step, text: e.target.value })}
              placeholder="Texto del mensaje…"
              rows={2}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
            <div
              role="switch"
              aria-checked={!!step.ai_enhance}
              onClick={() => onChange({ ...step, ai_enhance: !step.ai_enhance })}
              className="flex items-center gap-2 cursor-pointer select-none w-fit group"
            >
              <div className={`relative w-8 h-4 rounded-full border transition-colors shrink-0 ${step.ai_enhance ? "bg-primary border-primary" : "bg-muted border-border"}`}>
                <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-150 ${step.ai_enhance ? "translate-x-4" : "translate-x-0"}`} />
              </div>
              <span className={`flex items-center gap-1 text-[10px] transition-colors ${step.ai_enhance ? "text-primary font-medium" : "text-muted-foreground/60"}`}>
                <Sparkles size={9} />
                IA personaliza al enviar
              </span>
            </div>
            {step.ai_enhance && (
              <p className="text-[9px] text-muted-foreground/70 leading-relaxed ml-10">
                La IA adapta el texto según el contexto de la conversación antes de enviarlo.
              </p>
            )}
          </div>
        )}

        {/* Texto de la pregunta (sin toggle IA — el texto es estructural para el routing) */}
        {step.type === "question" && (
          <textarea
            value={step.text ?? ""}
            onChange={e => onChange({ ...step, text: e.target.value })}
            placeholder="Texto de la pregunta…"
            rows={2}
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />
        )}

        {/* Opciones para pregunta */}
        {step.type === "question" && (
          <div className="space-y-1.5">
            {(step.options ?? []).map((opt, i) => (
              <div key={i} className="rounded-lg border border-border/50 bg-secondary/20 p-2 space-y-1.5">
                {/* Fila 1: número + input + contador + eliminar */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground/70 w-4 shrink-0 font-medium">{i + 1}.</span>
                  <input
                    value={opt.label}
                    onChange={e => setOption(i, { label: e.target.value.slice(0, 20) })}
                    maxLength={20}
                    placeholder={`Texto del botón ${i + 1}`}
                    className="flex-1 h-7 px-2 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary/20 min-w-0"
                  />
                  <span className={`text-[10px] tabular-nums shrink-0 ${opt.label.length >= 18 ? "text-amber-500" : "text-muted-foreground/65"}`}>
                    {opt.label.length}/20
                  </span>
                  {(step.options ?? []).length > 1 && (
                    <button onClick={() => onChange({ ...step, options: (step.options ?? []).filter((_, j) => j !== i) })}
                      className="p-0.5 text-muted-foreground/65 hover:text-destructive shrink-0">
                      <X size={11} />
                    </button>
                  )}
                </div>
                {/* Fila 2: saltar a paso */}
                <div className="flex items-center gap-1.5 pl-5">
                  <select
                    value={opt.next_step_id ?? ""}
                    onChange={e => setOption(i, { next_step_id: e.target.value || null })}
                    className={`flex-1 h-6 px-1.5 text-[10px] rounded-md border focus:outline-none bg-background ${
                      !opt.next_step_id ? "border-amber-400/60 text-amber-600 dark:text-amber-400" : "border-input"
                    }`}
                  >
                    <option value="" disabled>⚠ Selecciona el paso de destino</option>
                    {allSteps.filter(s => s.id !== step.id).map(s => {
                      const idx = allSteps.indexOf(s);
                      const preview = (s.type === "question" || s.type === "message")
                        ? s.text?.trim().slice(0, 28)
                        : s.type === "link" ? s.link_url?.slice(0, 28)
                        : s.media?.[0]?.name?.slice(0, 22) ?? null;
                      return (
                        <option key={s.id} value={s.id}>
                          → Paso {idx + 1} · {STEP_TYPE_LABELS[s.type]}{preview ? `: ${preview}` : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            ))}
            {(step.options?.length ?? 0) < 3 && (
              <button onClick={addOption} className="flex items-center gap-1 text-[10px] text-primary hover:underline">
                <Plus size={10} /> Agregar botón
              </button>
            )}
            <p className="text-[10px] text-muted-foreground/65">Botones interactivos · máx. 3 · 20 caracteres c/u</p>
          </div>
        )}

        {/* Link con botón CTA */}
        {step.type === LINK_TYPE && (
          <div className="space-y-1.5">
            <input
              value={step.link_url ?? ""}
              onChange={e => onChange({ ...step, link_url: e.target.value })}
              placeholder="https://ejemplo.com"
              type="url"
              className="w-full h-7 px-2.5 text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <div className="flex items-center gap-2">
              <input
                value={step.link_label ?? ""}
                onChange={e => onChange({ ...step, link_label: e.target.value.slice(0, 20) })}
                maxLength={20}
                placeholder="Texto del botón"
                className="flex-1 h-7 px-2.5 text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-0"
              />
              <span className={`text-[10px] tabular-nums shrink-0 ${(step.link_label?.length ?? 0) >= 18 ? "text-amber-500" : "text-muted-foreground/65"}`}>
                {step.link_label?.length ?? 0}/20
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground/65">Botón CTA WhatsApp · el receptor lo toca y abre el link</p>
          </div>
        )}

        {/* Media: imagen / video / audio / archivo */}
        {isMedia && (
          <>
            {/* Lista de archivos subidos */}
            {(step.media ?? []).length > 0 && (
              <div className="space-y-1">
                {(step.media ?? []).map((m, i) => (
                  <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border/60 bg-secondary/30">
                    <Paperclip size={11} className="text-muted-foreground/70 shrink-0" />
                    <span className="flex-1 text-xs truncate text-muted-foreground">{m.name}</span>
                    <button onClick={() => onChange({ ...step, media: (step.media ?? []).filter((_, j) => j !== i) })}
                      className="p-0.5 text-muted-foreground/65 hover:text-destructive shrink-0">
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {/* Botón subir */}
            <input
              ref={fileInputRef}
              type="file"
              accept={STEP_ACCEPT[step.type] ?? "*"}
              className="hidden"
              onChange={e => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = ""; }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center justify-center gap-1.5 w-full h-8 rounded-lg border border-dashed border-border text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors disabled:opacity-50"
            >
              {uploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
              {uploading ? "Subiendo…" : `+ Agregar ${STEP_TYPE_LABELS[step.type].toLowerCase()}`}
            </button>
            {WA_FORMAT_HINT[step.type] && (
              <p className="text-[10px] text-center text-muted-foreground/70">
                WhatsApp: {WA_FORMAT_HINT[step.type]}
              </p>
            )}
            {/* Caption opcional (no aplica para audio) */}
            {step.type !== "audio" && (
              <div className="space-y-1.5">
                <Textarea
                  value={step.text ?? ""}
                  onChange={e => onChange({ ...step, text: e.target.value })}
                  placeholder="Caption / texto acompañante (opcional)"
                  rows={2}
                  className="w-full min-h-0 px-2.5 py-1.5 text-xs rounded-lg border border-input bg-background focus:outline-none resize-none"
                />
                {step.text?.trim() && (
                  <div
                    role="switch"
                    aria-checked={!!step.ai_enhance}
                    onClick={() => onChange({ ...step, ai_enhance: !step.ai_enhance })}
                    className="flex items-center gap-2 cursor-pointer select-none w-fit"
                  >
                    <div className={`relative w-8 h-4 rounded-full border transition-colors shrink-0 ${step.ai_enhance ? "bg-primary border-primary" : "bg-muted border-border"}`}>
                      <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-150 ${step.ai_enhance ? "translate-x-4" : "translate-x-0"}`} />
                    </div>
                    <span className={`flex items-center gap-1 text-[10px] transition-colors ${step.ai_enhance ? "text-primary font-medium" : "text-muted-foreground/60"}`}>
                      <Sparkles size={9} />
                      IA personaliza al enviar
                    </span>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Indicador de siguiente paso explícito (solo pasos no-pregunta) */}
        {step.type !== "question" && step.next_step_id !== undefined && (
          <div className="flex items-center gap-1.5 pt-1 border-t border-border/20 mt-1">
            {step.next_step_id === null ? (
              <span className="text-[9px] text-muted-foreground/65 flex items-center gap-1">
                <span className="text-[8px]">⊣</span> Fin de rama
              </span>
            ) : (() => {
              const targetIdx = allSteps.findIndex(s => s.id === step.next_step_id);
              const target = allSteps[targetIdx];
              if (!target) return null;
              const preview = (target.type === "message" || target.type === "question")
                ? target.text?.trim().slice(0, 22)
                : target.type === "link" ? target.link_url?.slice(0, 18)
                : target.media?.[0]?.name?.slice(0, 18) ?? null;
              return (
                <span className="text-[9px] text-muted-foreground/65 flex items-center gap-1 truncate">
                  <ChevronRight size={9} className="shrink-0" />
                  <span className="shrink-0">Paso {targetIdx + 1}</span>
                  {preview && <span className="truncate opacity-70">· {preview}</span>}
                </span>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Settings Panel (slide-over) ──────────────────────────────────────────────
const LABEL_COLORS = [
  "#6366f1","#8b5cf6","#ec4899","#ef4444","#f97316",
  "#eab308","#22c55e","#14b8a6","#3b82f6","#64748b",
];

const SettingsPanel = ({ onClose, onDisconnect }: { onClose: () => void; onDisconnect: () => void }) => {
  const { data: config } = useAIAgentConfig();
  const { data: businessProfile } = useBusinessProfile();
  const { user } = useCurrentUser();
  const { data: labels = [] }       = useWaLabels();
  const upsertLabel                 = useUpsertWaLabel();
  const deleteLabel                 = useDeleteWaLabel();
  const { data: quickReplies = [] } = useQuickReplies();
  const upsertQuickReply            = useUpsertQuickReply();
  const deleteQuickReply            = useDeleteQuickReply();
  const { data: sequences = [] } = useWaSequences();
  const upsertSequence           = useUpsertWaSequence();
  const deleteSequence           = useDeleteWaSequence();
  const [editingSeq, setEditingSeq] = useState<DraftSequence | null>(null);
  const { data: flows = [] }       = useWaFlows();
  const upsertFlow                 = useUpsertWaFlow();
  const deleteFlow                 = useDeleteWaFlow();
  const toggleFlow                 = useToggleWaFlow();
  const [editingFlow, setEditingFlow] = useState<DraftFlow | null>(null);
  const insertLog                  = useInsertLog();
  const [pendingDeleteSeqId, setPendingDeleteSeqId]   = useState<string | null>(null);
  const [deletingSeq, setDeletingSeq]                 = useState(false);
  const [pendingDeleteFlowId, setPendingDeleteFlowId] = useState<string | null>(null);
  const [deletingFlow, setDeletingFlow]               = useState(false);

  const handleDeleteSeq = async () => {
    if (!pendingDeleteSeqId) return;
    const seq = sequences.find(s => s.id === pendingDeleteSeqId);
    setDeletingSeq(true);
    try {
      await deleteSequence.mutateAsync(pendingDeleteSeqId);
      insertLog.mutateAsync({ action: "delete", entity: "wa_sequence", entity_id: pendingDeleteSeqId, description: `Secuencia eliminada: ${seq?.name}` }).catch(() => {});
      setPendingDeleteSeqId(null);
    } catch { toast.error("Error al eliminar la secuencia"); }
    finally { setDeletingSeq(false); }
  };

  const handleDeleteFlow = async () => {
    if (!pendingDeleteFlowId) return;
    const flow = flows.find(f => f.id === pendingDeleteFlowId);
    setDeletingFlow(true);
    try {
      await deleteFlow.mutateAsync(pendingDeleteFlowId);
      insertLog.mutateAsync({ action: "delete", entity: "wa_flow", entity_id: pendingDeleteFlowId, description: `Flujo eliminado: ${flow?.name}` }).catch(() => {});
      setPendingDeleteFlowId(null);
    } catch { toast.error("Error al eliminar el flujo"); }
    finally { setDeletingFlow(false); }
  };
  const [triggerValidation, setTriggerValidation] = useState<{ severity: "valid" | "warn" | "invalid"; category: string | null; reason: string } | null>(null);
  const [insertAtIdx, setInsertAtIdx] = useState<number | null>(null);
  const seqSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const upsert = useUpsertAIAgentConfig();
  const { data: allProducts = [] } = useProducts();
  const { data: allServices = [] } = useServices();
  const { data: allCourses  = [] } = useCourses();
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
  const [spCoursesMode, setSpCoursesMode]             = useState<"all"|"selected"|"none">("none");
  const [spSelectedCourseIds, setSpSelectedCourseIds] = useState<string[]>([]);
  // Config estratégica B15-1
  const [agentObjectivesSP, setAgentObjectivesSP]     = useState<string[]>([]);
  const [agentPersonalitySP, setAgentPersonalitySP]   = useState("");
  const [agentProactivitySP, setAgentProactivitySP]   = useState("");
  const [responseLengthSP, setResponseLengthSP]       = useState("normal");
  const [emojiLevelSP, setEmojiLevelSP]               = useState("poco");
  const [agentFaqSP, setAgentFaqSP]                   = useState<{ q: string; a: string }[]>([]);
  const [useBusinessFaqSP, setUseBusinessFaqSP]       = useState(true);
  const [showCatalogOnAsk, setShowCatalogOnAsk]       = useState(true);
  const [doUpsell, setDoUpsell]                       = useState(false);
  const [confirmSummary, setConfirmSummary]           = useState(true);
  const [agentDataCollect, setAgentDataCollect]       = useState<string[]>([]);
  const [customDataField, setCustomDataField]         = useState("");
  const [notifyEmail, setNotifyEmail]             = useState("");
  const [editingNotifyEmail, setEditingNotifyEmail] = useState(false);
  // Label form state
  const [newLabelName, setNewLabelName]         = useState("");
  const [newLabelColor, setNewLabelColor]       = useState(LABEL_COLORS[0]);
  const [newLabelHint, setNewLabelHint]         = useState("");
  const [newLabelRemoveHint, setNewLabelRemoveHint] = useState("");
  const [editingLabel, setEditingLabel]         = useState<{ id: string; name: string; color: string; hint: string | null; remove_hint: string | null } | null>(null);
  const [newQrShortcut, setNewQrShortcut]       = useState("");
  const [newQrContent, setNewQrContent]         = useState("");
  const [editingQr, setEditingQr]               = useState<CrmQuickReply | null>(null);
  const [improvingHintNew, setImprovingHintNew]       = useState(false);
  const [improvingHintEdit, setImprovingHintEdit]     = useState(false);
  const [improvingRemoveNew, setImprovingRemoveNew]   = useState(false);
  const [improvingRemoveEdit, setImprovingRemoveEdit] = useState(false);
  const [schedule, setSchedule]           = useState<WeeklySchedule>(DEFAULT_SCHEDULE);
  const [timezone, setTimezone]           = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [offHoursMsg, setOffHoursMsg]     = useState("");
  const [section, setSection]             = useState<"conexion"|"agente"|"capacidades"|"horario"|"perfil"|"etiquetas"|"respuestas"|"flujos"|"plantillas"|"campanias">("conexion");
  const [mobileShowSection, setMobileShowSection] = useState(false);
  const initialized                       = useRef(false);

  const branchTargets = useMemo<Map<string, string[]>>(() => {
    if (!editingSeq) return new Map();
    const map = new Map<string, string[]>();
    for (const s of editingSeq.steps) {
      if (s.type !== "question") continue;
      for (const opt of s.options ?? []) {
        if (opt.next_step_id) {
          const arr = map.get(opt.next_step_id) ?? [];
          arr.push(opt.label || "?");
          map.set(opt.next_step_id, arr);
        }
      }
    }
    return map;
  }, [editingSeq]);

  const activeBranches = useMemo(() => {
    type Branch = { label: string; targetIdx: number; insertBeforeIdx: number | null; questionId: string; isVirtual?: boolean };
    if (!editingSeq) return [] as Branch[];
    const result: Branch[] = [];

    for (const s of editingSeq.steps) {
      if (s.type !== "question") continue;
      const opts = s.options ?? [];
      const labeledOpts = opts.filter(o => o.label.trim());
      if (labeledOpts.length === 0) continue;

      const questionIdx = editingSeq.steps.indexOf(s);

      // Ramas reales: botones con next_step_id configurado
      const realTargets = labeledOpts
        .filter(o => o.next_step_id)
        .map(o => ({ label: o.label, idx: editingSeq.steps.findIndex(st => st.id === o.next_step_id) }))
        .filter(t => t.idx >= 0 && t.idx < editingSeq.steps.length)
        .sort((a, b) => a.idx - b.idx);
      const dedupedReal = realTargets.filter((t, i, arr) => arr.findIndex(x => x.idx === t.idx) === i);
      for (let i = 0; i < dedupedReal.length; i++) {
        result.push({ label: dedupedReal[i].label, targetIdx: dedupedReal[i].idx, insertBeforeIdx: dedupedReal[i + 1]?.idx ?? null, questionId: s.id });
      }

      // Ramas pendientes: botones con etiqueta pero sin next_step_id
      // Al agregar un paso se auto-enlaza el botón (ya no existe "Continuar al siguiente paso")
      for (const opt of labeledOpts.filter(o => !o.next_step_id)) {
        result.push({ label: opt.label, targetIdx: questionIdx + 1, insertBeforeIdx: null, questionId: s.id, isVirtual: true });
      }
    }
    return result;
  }, [editingSeq]);

  const stepBranchMap = useMemo<Map<string, StepBranchInfo>>(() => {
    if (!editingSeq || activeBranches.length === 0) return new Map();
    const map = new Map<string, StepBranchInfo>();
    // Primera pasada: asignar rama a cada paso no compartido
    for (let i = 0; i < editingSeq.steps.length; i++) {
      const step = editingSeq.steps[i];
      if (step.shared) continue; // pasos compartidos no pertenecen a ninguna rama
      // Buscar la rama más específica (mayor targetIdx que cubre este paso)
      let bestBi = -1, bestStart = -1;
      for (let bi = 0; bi < activeBranches.length; bi++) {
        if (activeBranches[bi].isVirtual) continue;
        const start = activeBranches[bi].targetIdx;
        const end = activeBranches[bi].insertBeforeIdx ?? editingSeq.steps.length;
        if (i >= start && i < end && start > bestStart) {
          bestBi = bi;
          bestStart = start;
        }
      }
      if (bestBi >= 0) {
        map.set(step.id, { label: activeBranches[bestBi].label, branchIdx: bestBi, pos: 0, total: 0 });
      }
    }
    // Segunda pasada: calcular posición y total reales (solo pasos no-compartidos de esa rama)
    const branchSteps = new Map<number, string[]>();
    for (const [id, info] of map) {
      const list = branchSteps.get(info.branchIdx) ?? [];
      list.push(id);
      branchSteps.set(info.branchIdx, list);
    }
    for (const [bi, ids] of branchSteps) {
      ids.forEach((id, idx) => {
        const info = map.get(id)!;
        map.set(id, { ...info, pos: idx + 1, total: ids.length });
      });
    }
    return map;
  }, [editingSeq, activeBranches]);

  const [addBranchTarget, setAddBranchTarget] = useState<number | "shared">("shared");
  const [highlightStepId, setHighlightStepId] = useState<string | null>(null);
  const [treeOpen, setTreeOpen] = useState(false);

  const flashStep = (id: string) => {
    setHighlightStepId(id);
    setTimeout(() => {
      document.getElementById(`seq-step-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 30);
    setTimeout(() => setHighlightStepId(null), 1800);
  };

  const handleMoveToBranch = (stepId: string, target: number | "shared") => {
    const branch = typeof target === "number" ? activeBranches[target] : null;
    setEditingSeq(seq => {
      if (!seq) return seq;
      const stepIdx = seq.steps.findIndex(s => s.id === stepId);
      if (stepIdx === -1) return seq;
      const step = { ...seq.steps[stepIdx] };
      const steps = seq.steps.filter((_, i) => i !== stepIdx);

      if (target === "shared") {
        const movedSteps = [...steps, { ...step, shared: true }];
        return { ...seq, steps: computeNextStepIds(movedSteps) };
      }
      if (!branch) return seq;

      let insertIdx: number;
      if (branch.isVirtual && branch.questionId) {
        const realSiblings = activeBranches.filter(b => !b.isVirtual && b.questionId === branch.questionId);
        if (realSiblings.length > 0) {
          const maxEnd = realSiblings.reduce((acc, b) => {
            const end = b.insertBeforeIdx ?? steps.length + 1;
            return end > acc ? end : acc;
          }, 0);
          insertIdx = maxEnd - (stepIdx < maxEnd ? 1 : 0);
        } else {
          const qi = steps.findIndex(s => s.id === branch.questionId);
          insertIdx = qi >= 0 ? qi + 1 : steps.length;
        }
      } else if (branch.insertBeforeIdx === null) {
        const firstShared = steps.findIndex(s => s.shared);
        insertIdx = firstShared === -1 ? steps.length : firstShared;
      } else {
        insertIdx = branch.insertBeforeIdx - (stepIdx < branch.insertBeforeIdx ? 1 : 0);
      }
      const newSteps = [...steps];
      newSteps.splice(insertIdx, 0, { ...step, shared: false });

      if (branch.isVirtual && branch.questionId) {
        const linked = newSteps.map(st => st.id !== branch.questionId ? st : {
          ...st,
          options: st.options?.map(o => o.label === branch.label && !o.next_step_id ? { ...o, next_step_id: step.id } : o),
        });
        return { ...seq, steps: computeNextStepIds(linked) };
      }
      return { ...seq, steps: computeNextStepIds(newSteps) };
    });
    setTimeout(() => flashStep(stepId), 50);
  };

  const treeData = useMemo(() => {
    if (!editingSeq || activeBranches.length === 0) return null;

    // Agrupar ramas por questionId (reales y virtuales separadas)
    type BE = { label: string; bi: number; targetIdx: number; insertBeforeIdx: number | null; questionId: string; isVirtual?: boolean };
    const qMap = new Map<string, { real: BE[]; virt: BE[] }>();
    activeBranches.forEach((b, bi) => {
      const entry = qMap.get(b.questionId) ?? { real: [], virt: [] };
      (b.isVirtual ? entry.virt : entry.real).push({ ...b, bi });
      qMap.set(b.questionId, entry);
    });

    // Ordenar preguntas por posición en la secuencia (solo las que tienen ramas reales)
    const orderedQ = [...qMap.entries()]
      .filter(([, v]) => v.real.length > 0)
      .map(([qId, v]) => ({
        qId,
        qIdx: editingSeq.steps.findIndex(s => s.id === qId),
        real: v.real.sort((a, b) => a.targetIdx - b.targetIdx),
        virt: v.virt,
      }))
      .filter(q => q.qIdx >= 0)
      .sort((a, b) => a.qIdx - b.qIdx);

    if (orderedQ.length === 0) return null;

    type StepNode = { step: SequenceStep; idx: number };
    type BranchDef = { label: string; bi: number; steps: StepNode[] };
    type Seg = { kind: "trunk"; steps: StepNode[] } | { kind: "fork"; qIdx: number; branches: BranchDef[] };

    const segs: Seg[] = [];
    let cur = 0;

    for (const { qIdx, real, virt } of orderedQ) {
      // Tronco desde cursor hasta la pregunta (inclusive)
      const trunk: StepNode[] = editingSeq.steps
        .slice(cur, qIdx + 1)
        .map((s, i) => ({ step: s, idx: cur + i }));
      if (trunk.length > 0) segs.push({ kind: "trunk", steps: trunk });

      // Fin de las ramas de esta pregunta
      const lastReal = real[real.length - 1];
      const firstSharedAfter = editingSeq.steps.findIndex((s, i) => s.shared && i > lastReal.targetIdx);
      const branchEnd = lastReal.insertBeforeIdx ?? (firstSharedAfter >= 0 ? firstSharedAfter : editingSeq.steps.length);

      const branches: BranchDef[] = [
        ...real.map(b => ({
          label: b.label,
          bi: b.bi,
          steps: editingSeq.steps
            .slice(b.targetIdx, b.insertBeforeIdx ?? branchEnd)
            .map((s, i) => ({ step: s, idx: b.targetIdx + i }))
            .filter(n => !n.step.shared),
        })),
        ...virt.map(b => ({ label: b.label, bi: b.bi, steps: [] as StepNode[] })),
      ];

      segs.push({ kind: "fork", qIdx, branches });
      cur = branchEnd;
    }

    // Cola (pasos después de todas las ramas)
    if (cur < editingSeq.steps.length) {
      const tail: StepNode[] = editingSeq.steps
        .slice(cur)
        .map((s, i) => ({ step: s, idx: cur + i }));
      if (tail.length > 0) segs.push({ kind: "trunk", steps: tail });
    }

    return segs.length > 0 ? segs : null;
  }, [editingSeq, activeBranches]);

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
    setSpCoursesMode(config.courses_mode ?? "none");
    setSpSelectedCourseIds(config.selected_course_ids ?? []);
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
    setUseBusinessFaqSP(config.use_business_faq ?? true);
    setShowCatalogOnAsk(config.show_catalog_on_ask ?? true);
    setDoUpsell(config.do_upsell ?? false);
    setConfirmSummary(config.confirm_summary ?? true);
    setAgentDataCollect(config.agent_data_collect ?? []);
    setProfilePicUrl(config.profile_picture_url ?? null);
    if (config.agent_about) setBio(config.agent_about);
  }, [config]);

  // Rellenar emails de notificación con el del perfil si no hay uno guardado
  useEffect(() => {
    const fallback = businessProfile?.contact_email ?? user?.email ?? "";
    if (!notifyEmail && fallback) setNotifyEmail(fallback);
    if (!paymentEmailSP && fallback) { setPaymentEmailSP(fallback); }
  }, [businessProfile?.contact_email, user?.email]);

  // Clasifica el trigger localmente — instantáneo, sin API.
  // Solo bloquea lo que confundiría al usuario (tiempo, llamadas):
  // triggers inválidos que pasen no hacen daño — simplemente nunca se activan
  // porque el sistema evalúa triggers SOLO cuando llega un mensaje de WhatsApp.
  const classifyTrigger = (raw: string): { severity: "valid" | "warn" | "invalid"; category: string | null; reason: string } => {
    const t = raw.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

    // ── BLOQUEOS DUROS: casos que confunden al usuario creyendo que es un scheduler ──
    const hardBlocks: Array<[RegExp, (m: string) => string]> = [
      [/\b(a\s*las\s*\d+|\d+\s*:\s*\d+\s*(am|pm)?|cada\s+\d+\s*(hora|dia|semana|mes)|diario\s*a\s*las|programar\s*para)\b/i,
        m => `"${m}" es una hora programada — este trigger no es un scheduler. El flujo solo se activa cuando el usuario envía un mensaje.`],
      [/\b(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/,
        m => `"${m}" es un día de la semana — los flujos no tienen scheduler. Solo se activan cuando llega un mensaje.`],
      [/\b(cumpleanos|aniversario)\b/,
        m => `"${m}" requiere conocer la fecha del contacto — usa los Recordatorios para envíos programados.`],
      [/\b(llamada[s]?|llame[ns]?|llamar[ae]?|videollamada)\b/,
        m => `"${m}" es una llamada de voz — los flujos solo detectan mensajes de texto en WhatsApp.`],
    ];

    for (const [regex, label] of hardBlocks) {
      const m = t.match(regex);
      if (m) return { severity: "invalid", category: null, reason: label(m[0].trim()) };
    }

    // ── VÁLIDOS RECONOCIDOS ──────────────────────────────────────────────────
    if (/\b(primer.?mensaje|primera.?vez|primer.?contacto|nuevo.?contacto|contacto.?nuevo)\b/.test(t))
      return { severity: "valid", category: "Primer contacto", reason: "Se activa cuando alguien escribe por primera vez" };
    if (/\b(precio[s]?|cotiz|comprar|contratar|adquirir|tarifa|cuanto.?(cuesta|vale)|costo\b|presupuesto)\b/.test(t))
      return { severity: "valid", category: "Intención de compra", reason: "Detecta cuando el usuario quiere comprar o cotizar" };
    if (/\b(descuento|rebaja|regatear?|negociar?|mas.?barato|precio.?especial|promocion)\b/.test(t))
      return { severity: "valid", category: "Negociación", reason: "Detecta cuando el usuario intenta negociar precio" };
    if (/\b(no.?(me|le)?.?interesa|muy.?caro|demasiado.?caro|no.?gracias|no.?quiero|objecion)\b/.test(t))
      return { severity: "valid", category: "Objeción / Rechazo", reason: "Detecta cuando el usuario rechaza u objeta" };
    if (/\b(pregunte?|consulte?|informacion\b|horario|ubicacion|como.?funciona|que.?(es|son|ofrece)|donde.?(esta|queda))\b/.test(t))
      return { severity: "valid", category: "Pregunta frecuente", reason: "Detecta preguntas comunes sobre el negocio" };
    if (/\b(emoji\b|palabra.?clave|keyword|cuando.?(diga|escriba|mande)\b|diga\b|escriba\b|mande\b)\b/.test(t))
      return { severity: "valid", category: "Palabra clave / Emoji", reason: "Detecta una palabra o emoji específico" };
    if (/\b(responde?.?(la\s*)?propuesta|acepta?.?(la\s*)?propuesta|responde?.?(la\s*)?cotizacion)\b/.test(t))
      return { severity: "valid", category: "Respuesta a propuesta", reason: "Detecta cuando el usuario responde a una oferta" };

    // ── DESCONOCIDO: se permite guardar con advertencia ──────────────────────
    return { severity: "warn", category: null, reason: "No reconocido como categoría estándar — si el usuario no puede expresarlo en un mensaje, el flujo no se activará" };
  };

  useEffect(() => {
    const text = editingFlow?.trigger_text?.trim() ?? "";
    if (text.length < 10) { setTriggerValidation(null); return; }
    setTriggerValidation(classifyTrigger(text));
  }, [editingFlow?.trigger_text]);

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
        can_book_appointments: !!schedulingCalendarId,
        scheduling_calendar_id: schedulingCalendarId || null,
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
        courses_mode: spCoursesMode,
        selected_course_ids: spCoursesMode === "selected" ? spSelectedCourseIds : [],
        schedule,
        timezone,
        off_hours_message: offHoursMsg || null,
        agent_objectives: agentObjectivesSP,
        agent_personality: agentPersonalitySP || null,
        agent_proactivity: agentProactivitySP || null,
        response_length: responseLengthSP as "short" | "normal" | "detailed",
        emoji_level: emojiLevelSP as "none" | "poco" | "medio" | "mucho",
        agent_faq: agentFaqSP.length > 0 ? agentFaqSP : null,
        use_business_faq: useBusinessFaqSP,
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

  // Cargar perfil de WhatsApp al abrir el tab y sincronizar URL con DB
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
        // Bio: Meta es la fuente de verdad; guardar en DB como backup
        const metaBio: string = d.about ?? "";
        setBio(metaBio || config?.agent_about || "");
        if (metaBio && metaBio !== config?.agent_about) {
          upsert.mutateAsync({ agent_about: metaBio }).catch(() => {});
        }
        // Foto: Supabase Storage es la fuente de verdad; Meta solo como fallback
        if (!config?.profile_picture_url) {
          setProfilePicUrl(d.profile_picture_url ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingProfile(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      // Guardar también en DB para persistencia local
      await upsert.mutateAsync({ agent_about: bio });
      toast.success("Bio actualizada en WhatsApp Business");
    } catch (err: any) { toast.error(err.message?.slice(0, 100)); }
    finally { setSavingBio(false); }
  };

  const handlePhotoUpload = async (file: File) => {
    if (!config?.phone_number_id || !config?.access_token || !user?.id) return;
    if (!config?.waba_id) {
      toast.error("Configura el WABA ID en el tab Conexión para poder subir la foto de perfil");
      return;
    }
    setUploadingPhoto(true);
    try {
      // 1. Subir a Supabase Storage → URL permanente inmediata (fuente de verdad del CRM)
      const ext = file.type === "image/png" ? "png" : "jpg";
      const storagePath = `agent-photos/${user.id}/profile.${ext}`;
      const { error: storageErr } = await supabase.storage
        .from("form-uploads")
        .upload(storagePath, file, { upsert: true, contentType: file.type });
      if (storageErr) throw new Error(`Error al guardar foto: ${storageErr.message}`);

      const { data: { publicUrl } } = supabase.storage.from("form-uploads").getPublicUrl(storagePath);
      const urlWithBust = `${publicUrl}?t=${Date.now()}`;

      // 2. Guardar en DB y mostrar en UI al instante
      await upsert.mutateAsync({ profile_picture_url: urlWithBust });
      setProfilePicUrl(urlWithBust);

      // 3. Subir a Meta (awaited — necesitamos saber si realmente llegó)
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { data: metaData, error: metaError } = await supabase.functions.invoke("upload-wa-profile-photo", {
        body: { base64, mime_type: file.type },
      });

      if (metaError || metaData?.error) {
        const msg = metaData?.error ?? metaError?.message ?? "Error desconocido";
        toast.warning(`Foto guardada en el CRM, pero falló en WhatsApp: ${msg}`);
      } else {
        toast.success("Foto actualizada en el CRM y en WhatsApp Business");
      }
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

  const SECTIONS = [
    { id: "conexion" as const,    label: "Conexión",    icon: Wifi,      desc: "Meta Cloud API" },
    { id: "capacidades" as const, label: "Capacidades", icon: Zap,       desc: "Herramientas del agente" },
    { id: "agente" as const,      label: "Agente IA",   icon: Sparkles,  desc: "Nombre, prompt, idioma" },
    { id: "flujos" as const,      label: "Flujos",      icon: GitBranch, desc: "Secuencias y Flujos" },
    { id: "horario" as const,     label: "Horario",     icon: Clock,     desc: "Disponibilidad y timezone" },
    { id: "perfil" as const,      label: "Perfil WA",   icon: User,      desc: "Foto y bio de WhatsApp" },
    { id: "etiquetas" as const,   label: "Etiquetas",   icon: Tag,       desc: "Gestionar etiquetas" },
    { id: "respuestas" as const,  label: "Respuestas",  icon: Zap,       desc: "/ atajos de respuesta rápida" },
    { id: "plantillas" as const,  label: "Plantillas",  icon: Megaphone, desc: "Remarketing fuera de 24h" },
    { id: "campanias" as const,   label: "Envío Masivo", icon: Send,     desc: "Envíos pasados y dentro de 24h" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <DeleteConfirmDialog
        open={!!pendingDeleteSeqId}
        onOpenChange={open => !open && setPendingDeleteSeqId(null)}
        onConfirm={handleDeleteSeq}
        isPending={deletingSeq}
        description="Se eliminará la secuencia de mensajes permanentemente y dejará de estar disponible en los flujos."
      />
      <DeleteConfirmDialog
        open={!!pendingDeleteFlowId}
        onOpenChange={open => !open && setPendingDeleteFlowId(null)}
        onConfirm={handleDeleteFlow}
        isPending={deletingFlow}
        description="Se eliminará el flujo de automatización permanentemente."
      />
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-xl bg-card h-full flex shadow-2xl border-l overflow-hidden">

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

        {/* Nav column — full width on mobile (home), sidebar on sm+ */}
        <div className={`flex-col bg-card border-r sm:w-52 sm:shrink-0 sm:flex
          ${mobileShowSection ? "hidden" : "flex w-full"}
        `}>
          {/* Agent profile header */}
          <div className="px-4 py-4 border-b shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-full overflow-hidden bg-[#1877F2] flex items-center justify-center text-white">
                  {config?.profile_picture_url ? (
                    <img src={config.profile_picture_url} alt={agentName || "Agente"} className="w-full h-full object-cover"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <Bot size={20} />
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 flex items-center gap-0.5 bg-[#00a884] rounded-full px-1 py-0.5 border border-background">
                  <Bot size={8} className="text-white" />
                  <span className="text-[7px] font-bold text-white leading-none">IA</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{agentName || "Asistente"}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${config?.is_active ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                  <p className="text-[11px] text-muted-foreground">{config?.is_active ? "Activo" : "Inactivo"}</p>
                </div>
              </div>
              <button onClick={onClose} className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl hover:bg-secondary transition-colors shrink-0">
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Section list */}
          <div className="flex-1 overflow-y-auto py-2">
            {SECTIONS.map(s => {
              const Icon = s.icon;
              const isActive = section === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => { setSection(s.id); setMobileShowSection(true); }}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${
                    isActive ? "bg-[#1877F2]/8 dark:bg-[#1877F2]/12" : "hover:bg-secondary/60"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isActive ? "bg-[#1877F2]/15" : "bg-secondary"
                  }`}>
                    <Icon size={15} className={isActive ? "text-[#1877F2]" : "text-muted-foreground"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium leading-tight ${isActive ? "text-[#1877F2]" : "text-foreground"}`}>{s.label}</p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{s.desc}</p>
                  </div>
                  <ChevronRight size={14} className={`shrink-0 sm:hidden ${isActive ? "text-[#1877F2]" : "text-muted-foreground/30"}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Content column */}
        <div className={`flex-col flex-1 min-w-0 sm:flex
          ${mobileShowSection ? "flex" : "hidden"}
        `}>
          {/* Section header */}
          <div className="px-4 py-3 border-b flex items-center gap-1 shrink-0">
            <button
              onClick={() => setMobileShowSection(false)}
              className="sm:hidden min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl hover:bg-secondary transition-colors -ml-1.5"
            >
              <ChevronLeft size={18} className="text-muted-foreground" />
            </button>
            <h2 className="text-sm font-semibold flex-1 truncate">
              {SECTIONS.find(s => s.id === section)?.label ?? "Configuración"}
            </h2>
            <button onClick={onClose} className="hidden sm:flex min-w-[36px] min-h-[36px] items-center justify-center rounded-xl hover:bg-secondary transition-colors">
              <X size={16} className="text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-5 space-y-4">
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
                <label className="text-xs font-medium text-muted-foreground">Preguntas frecuentes</label>

                {/* Toggle: usar FAQs del negocio */}
                <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2.5">
                  <div>
                    <p className="text-xs font-medium">Usar FAQs de Mi Negocio</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {businessProfile?.agent_faq?.length
                        ? `${businessProfile.agent_faq.length} pregunta${businessProfile.agent_faq.length !== 1 ? "s" : ""} registrada${businessProfile.agent_faq.length !== 1 ? "s" : ""} en el perfil del negocio`
                        : "Configúralas en Mi Negocio → Negocio"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUseBusinessFaqSP(v => !v)}
                    className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${useBusinessFaqSP ? "bg-primary" : "bg-muted-foreground/30"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${useBusinessFaqSP ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                </div>

                {/* FAQs específicas del agente */}
                <div className="space-y-2 pt-1">
                  <p className="text-[10px] text-muted-foreground">Preguntas adicionales — solo para este agente de WhatsApp</p>
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


            </div>
          )}

          {section === "capacidades" && (
            <>
            <div className="divide-y">
              {/* Agendar citas */}
              <div className="py-3 space-y-2">
                <div>
                  <p className="text-sm font-medium">Agendar citas</p>
                  <p className="text-xs text-muted-foreground">Detecta intención de agendar y crea citas en el calendario</p>
                </div>
                <select
                  value={schedulingCalendarId}
                  onChange={e => setSchedulingCalendarId(e.target.value)}
                  className="w-full text-xs h-8 rounded-lg border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Ninguno</option>
                  {calendars.map(cal => (
                    <option key={cal.id} value={cal.id}>{cal.name ?? cal.slug ?? cal.id}</option>
                  ))}
                </select>
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
                      const catProducts = allProducts.filter(p => catProductIds.includes(p.id));
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
                              <span className="text-sm">{p.name}{!p.is_active && <span className="ml-1.5 text-[10px] text-muted-foreground/60">(privado)</span>}</span>
                            </label>
                          ))}
                        </div>
                      );
                    })}
                    {/* Productos sin catálogo */}
                    {(() => {
                      const allCatProductIds = new Set(Array.from(catalogProductsMap.values()).flat());
                      const orphans = allProducts.filter(p => !allCatProductIds.has(p.id));
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
                              <span className="text-sm">{p.name}{!p.is_active && <span className="ml-1.5 text-[10px] text-muted-foreground/60">(privado)</span>}</span>
                            </label>
                          ))}
                        </div>
                      );
                    })()}
                    {catalogs.length === 0 && allProducts.length === 0 && (
                      <p className="px-3 py-2 text-xs text-muted-foreground">No hay productos</p>
                    )}
                  </div>
                )}
              </div>

              {/* Cursos */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Cursos</p>
                <div className="flex gap-3">
                  {(["all", "selected", "none"] as const).map(mode => (
                    <label key={mode} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="sp-courses-mode" checked={spCoursesMode === mode} onChange={() => setSpCoursesMode(mode)} className="accent-primary" />
                      <span className="text-sm">{mode === "all" ? "Todos" : mode === "selected" ? "Solo seleccionados" : "Ninguno"}</span>
                    </label>
                  ))}
                </div>
                {spCoursesMode === "selected" && (
                  <div className="mt-1 border rounded-lg divide-y max-h-40 overflow-y-auto bg-background">
                    {allCourses.filter(c => c.is_published).length === 0
                      ? <p className="px-3 py-2 text-xs text-muted-foreground">No hay cursos publicados</p>
                      : allCourses.filter(c => c.is_published).map(c => (
                          <label key={c.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-secondary/40 transition-colors">
                            <input type="checkbox" checked={spSelectedCourseIds.includes(c.id)}
                              onChange={e => setSpSelectedCourseIds(prev => e.target.checked ? [...prev, c.id] : prev.filter(id => id !== c.id))}
                              className="accent-primary shrink-0" />
                            <span className="text-sm">{c.title}</span>
                          </label>
                        ))
                    }
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
                      <div className="relative w-16 h-16 shrink-0">
                        <div className="w-16 h-16 rounded-full overflow-hidden bg-secondary flex items-center justify-center border">
                          {profilePicUrl ? (
                            <img src={profilePicUrl} alt="Perfil WA" className={`w-full h-full object-cover transition-opacity duration-300 ${uploadingPhoto ? "opacity-40" : "opacity-100"}`} />
                          ) : (
                            <User size={26} className="text-muted-foreground" />
                          )}
                        </div>
                        {uploadingPhoto && (
                          <div className="absolute inset-0 rounded-full flex items-center justify-center bg-background/60">
                            <Loader2 size={20} className="animate-spin text-primary" />
                          </div>
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
                        <div className="space-y-1">
                          <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Cuándo asignar</label>
                          <textarea
                            value={editingLabel.hint ?? ""}
                            onChange={e => setEditingLabel(prev => prev ? { ...prev, hint: e.target.value } : null)}
                            placeholder="ej: cuando el usuario pregunta por precios o quiere comprar"
                            rows={2}
                            className="w-full px-2 py-1.5 text-xs rounded-lg border border-input bg-background focus:outline-none resize-none"
                          />
                          {editingLabel.hint?.trim() && (
                            <button
                              type="button"
                              disabled={improvingHintEdit}
                              onClick={async () => {
                                setImprovingHintEdit(true);
                                try {
                                  const { data, error } = await supabase.functions.invoke("improve-label-hint", {
                                    body: { hint: editingLabel.hint, labelName: editingLabel.name },
                                  });
                                  if (error) { toast.error("No se pudo mejorar la sugerencia"); return; }
                                  if (data?.improved) setEditingLabel(prev => prev ? { ...prev, hint: data.improved } : null);
                                } finally { setImprovingHintEdit(false); }
                              }}
                              className="flex items-center gap-1 text-[10px] text-primary hover:underline disabled:opacity-50"
                            >
                              {improvingHintEdit ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                              {improvingHintEdit ? "Mejorando..." : "Mejorar con IA"}
                            </button>
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Cuándo quitar</label>
                          <textarea
                            value={editingLabel.remove_hint ?? ""}
                            onChange={e => setEditingLabel(prev => prev ? { ...prev, remove_hint: e.target.value } : null)}
                            placeholder="ej: cuando el usuario envía comprobante de pago o confirma el pago"
                            rows={2}
                            className="w-full px-2 py-1.5 text-xs rounded-lg border border-input bg-background focus:outline-none resize-none"
                          />
                          {editingLabel.remove_hint?.trim() && (
                            <button
                              type="button"
                              disabled={improvingRemoveEdit}
                              onClick={async () => {
                                setImprovingRemoveEdit(true);
                                try {
                                  const { data, error } = await supabase.functions.invoke("improve-label-hint", {
                                    body: { hint: editingLabel.remove_hint, labelName: editingLabel.name, type: "remove" },
                                  });
                                  if (error) { toast.error("No se pudo mejorar la sugerencia"); return; }
                                  if (data?.improved) setEditingLabel(prev => prev ? { ...prev, remove_hint: data.improved } : null);
                                } finally { setImprovingRemoveEdit(false); }
                              }}
                              className="flex items-center gap-1 text-[10px] text-primary hover:underline disabled:opacity-50"
                            >
                              {improvingRemoveEdit ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                              {improvingRemoveEdit ? "Mejorando..." : "Mejorar con IA"}
                            </button>
                          )}
                        </div>
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
                        <Tag size={13} className="shrink-0" style={{ color: l.color }} />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm">{l.name}</span>
                          {l.hint && <p className="text-[10px] text-muted-foreground/70 truncate">+ {l.hint}</p>}
                          {(l as any).remove_hint && <p className="text-[10px] text-destructive/60 truncate">− {(l as any).remove_hint}</p>}
                        </div>
                        <button onClick={() => setEditingLabel({ id: l.id, name: l.name, color: l.color, hint: l.hint ?? null, remove_hint: (l as any).remove_hint ?? null })}
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
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Cuándo asignar</label>
                  <textarea
                    value={newLabelHint}
                    onChange={e => setNewLabelHint(e.target.value)}
                    placeholder="ej: cuando el usuario pregunta por precios o quiere comprar"
                    rows={2}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                  {newLabelHint.trim() && (
                    <button
                      type="button"
                      disabled={improvingHintNew}
                      onClick={async () => {
                        setImprovingHintNew(true);
                        try {
                          const { data, error } = await supabase.functions.invoke("improve-label-hint", {
                            body: { hint: newLabelHint, labelName: newLabelName || "etiqueta" },
                          });
                          if (error) { toast.error("No se pudo mejorar la sugerencia"); return; }
                          if (data?.improved) setNewLabelHint(data.improved);
                        } finally { setImprovingHintNew(false); }
                      }}
                      className="flex items-center gap-1 text-[10px] text-primary hover:underline disabled:opacity-50"
                    >
                      {improvingHintNew ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                      {improvingHintNew ? "Mejorando..." : "Mejorar con IA"}
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Cuándo quitar</label>
                  <textarea
                    value={newLabelRemoveHint}
                    onChange={e => setNewLabelRemoveHint(e.target.value)}
                    placeholder="ej: cuando el usuario envía comprobante de pago o confirma el pago"
                    rows={2}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                  {newLabelRemoveHint.trim() && (
                    <button
                      type="button"
                      disabled={improvingRemoveNew}
                      onClick={async () => {
                        setImprovingRemoveNew(true);
                        try {
                          const { data, error } = await supabase.functions.invoke("improve-label-hint", {
                            body: { hint: newLabelRemoveHint, labelName: newLabelName || "etiqueta", type: "remove" },
                          });
                          if (error) { toast.error("No se pudo mejorar la sugerencia"); return; }
                          if (data?.improved) setNewLabelRemoveHint(data.improved);
                        } finally { setImprovingRemoveNew(false); }
                      }}
                      className="flex items-center gap-1 text-[10px] text-primary hover:underline disabled:opacity-50"
                    >
                      {improvingRemoveNew ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                      {improvingRemoveNew ? "Mejorando..." : "Mejorar con IA"}
                    </button>
                  )}
                </div>
                <button
                  onClick={async () => {
                    if (!newLabelName.trim()) return;
                    await upsertLabel.mutateAsync({ name: newLabelName.trim(), color: newLabelColor, hint: newLabelHint.trim() || null, remove_hint: newLabelRemoveHint.trim() || null });
                    setNewLabelName("");
                    setNewLabelHint("");
                    setNewLabelRemoveHint("");
                  }}
                  disabled={!newLabelName.trim() || upsertLabel.isPending}
                  className="flex items-center gap-1 px-3 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40"
                >
                  <Plus size={12} /> Crear etiqueta
                </button>
              </div>
            </div>
          )}

          {/* ── Respuestas Rápidas ── */}
          {section === "respuestas" && (
            <div className="space-y-4">
              {/* Lista */}
              <div className="space-y-1">
                {quickReplies.length === 0 && (
                  <p className="text-xs text-muted-foreground/60 italic text-center py-4">Sin respuestas. Crea una abajo.</p>
                )}
                {quickReplies.map(qr => (
                  <div key={qr.id} className="flex items-start gap-2 px-3 py-2.5 rounded-xl border border-border/60 bg-card">
                    {editingQr?.id === qr.id ? (
                      <div className="w-full space-y-2">
                        <input
                          value={editingQr.shortcut}
                          onChange={e => setEditingQr(prev => prev ? { ...prev, shortcut: e.target.value } : null)}
                          className="w-full h-7 px-2 text-xs rounded-lg border border-input bg-background focus:outline-none font-mono"
                          placeholder="atajo (ej: saludo)"
                          autoFocus
                        />
                        <textarea
                          value={editingQr.content}
                          onChange={e => setEditingQr(prev => prev ? { ...prev, content: e.target.value } : null)}
                          rows={3}
                          className="w-full px-2 py-1.5 text-xs rounded-lg border border-input bg-background focus:outline-none resize-none"
                          placeholder="Contenido completo..."
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              if (!editingQr.shortcut.trim() || !editingQr.content.trim()) return;
                              await upsertQuickReply.mutateAsync({ id: editingQr.id, shortcut: editingQr.shortcut, content: editingQr.content });
                              setEditingQr(null);
                            }}
                            className="flex-1 h-7 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
                          >Guardar</button>
                          <button onClick={() => setEditingQr(null)} className="h-7 px-3 rounded-lg border text-xs hover:bg-secondary transition-colors">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-mono font-semibold text-primary">/{qr.shortcut}</p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{qr.content}</p>
                        </div>
                        <button onClick={() => setEditingQr({ ...qr })} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-secondary">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => deleteQuickReply.mutate(qr.id)} className="shrink-0 text-muted-foreground hover:text-destructive transition-colors p-1 rounded-lg hover:bg-destructive/10">
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
              {/* Formulario de creación */}
              <div className="space-y-2 pt-2 border-t border-border/40">
                <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Nueva respuesta</p>
                <input
                  value={newQrShortcut}
                  onChange={e => setNewQrShortcut(e.target.value.replace(/\s/g, "").replace(/^\//, ""))}
                  className="w-full h-8 px-2 text-xs rounded-lg border border-input bg-background focus:outline-none font-mono"
                  placeholder="atajo  (ej: saludo, precio, cita)"
                />
                <textarea
                  value={newQrContent}
                  onChange={e => setNewQrContent(e.target.value)}
                  rows={3}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-input bg-background focus:outline-none resize-none"
                  placeholder="Hola! Gracias por contactarnos..."
                />
                <button
                  disabled={!newQrShortcut.trim() || !newQrContent.trim() || upsertQuickReply.isPending}
                  onClick={async () => {
                    if (!newQrShortcut.trim() || !newQrContent.trim()) return;
                    await upsertQuickReply.mutateAsync({ shortcut: newQrShortcut, content: newQrContent });
                    setNewQrShortcut(""); setNewQrContent("");
                  }}
                  className="w-full h-8 rounded-xl bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-40 hover:opacity-90 transition-opacity"
                >
                  <Plus size={12} /> Crear respuesta
                </button>
              </div>
            </div>
          )}

          {/* ── Flujos (Secuencias + Flujos) ── */}
          {section === "flujos" && (
            <div className="space-y-4">

              {/* ── Sub-sección: Secuencias de Mensajes ── */}
              {editingFlow === null && <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-secondary/20">
                  <p className="text-xs font-semibold">Secuencias de Mensajes</p>
                  <span className="text-[10px] text-muted-foreground/60">Scripts reutilizables</span>
                </div>

                <div className="p-4 space-y-3">
                {editingSeq === null ? (
                  <>
                    {sequences.length === 0 && (
                      <p className="text-xs text-muted-foreground/60 italic text-center py-3">Sin secuencias. Crea una abajo.</p>
                    )}
                    {sequences.map(seq => (
                      <div key={seq.id} className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl border border-border/60 bg-background">
                        <MessageSquare size={13} className="text-muted-foreground mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{seq.name}</p>
                          <p className="text-[10px] text-muted-foreground/60">
                            {seq.steps.length} paso{seq.steps.length !== 1 ? "s" : ""}
                            {seq.product_id && (() => {
                              const name = allServices.find(s => s.id === seq.product_id)?.name
                                ?? allProducts.find(p => p.id === seq.product_id)?.name;
                              return name ? <> · {name}</> : null;
                            })()}
                          </p>
                        </div>
                        <button onClick={() => { setInsertAtIdx(null); setAddBranchTarget("shared"); setEditingSeq({ id: seq.id, name: seq.name, product_id: seq.product_id, steps: seq.steps }); }}
                          className="p-1 rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => setPendingDeleteSeqId(seq.id)}
                          className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => { setInsertAtIdx(null); setAddBranchTarget("shared"); setEditingSeq({ name: "", product_id: null, steps: [] }); }}
                      className="flex items-center gap-1.5 w-full px-3 h-9 rounded-xl border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors">
                      <Plus size={13} /> Nueva secuencia
                    </button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEditingSeq(null)} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
                        <ArrowLeft size={14} />
                      </button>
                      <span className="text-xs font-medium">{editingSeq.id ? "Editar secuencia" : "Nueva secuencia"}</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Nombre</label>
                      <input
                        value={editingSeq.name}
                        onChange={e => setEditingSeq(s => s ? { ...s, name: e.target.value } : s)}
                        placeholder="ej: Presentación Paquete Gold"
                        className="w-full h-8 px-2.5 text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Servicio/Producto asociado <span className="text-muted-foreground/50">(opcional)</span></label>
                      <select
                        value={editingSeq.product_id ?? ""}
                        onChange={e => setEditingSeq(s => s ? { ...s, product_id: e.target.value || null } : s)}
                        className="w-full h-8 px-2 text-xs rounded-lg border border-input bg-background focus:outline-none">
                        <option value="">Sin asociar</option>
                        {allServices.length > 0 && <option disabled>── Servicios ──</option>}
                        {allServices.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        {allProducts.length > 0 && <option disabled>── Productos ──</option>}
                        {allProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Pasos</label>
                      {editingSeq.steps.length === 0 && (
                        <p className="text-[11px] text-muted-foreground/50 italic text-center py-3">Sin pasos. Agrega uno abajo.</p>
                      )}
                      <DndContext
                        sensors={seqSensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(event: DragEndEvent) => {
                          const { active, over } = event;
                          if (!over || active.id === over.id) return;
                          setEditingSeq(s => {
                            if (!s) return s;
                            const oldIdx = s.steps.findIndex(st => st.id === active.id);
                            const newIdx = s.steps.findIndex(st => st.id === over.id);
                            const reordered = arrayMove(s.steps, oldIdx, newIdx);
                            return { ...s, steps: computeNextStepIds(reordered) };
                          });
                        }}
                      >
                        <SortableContext items={editingSeq.steps.map(s => s.id)} strategy={verticalListSortingStrategy}>
                          <div className="space-y-0">
                            {editingSeq.steps.flatMap((step, i) => {
                              const stepEl = (
                                <div key={step.id} className="pb-2">
                                  <SortableSequenceStep
                                    step={step}
                                    index={i}
                                    allSteps={editingSeq.steps}
                                    onChange={updated => setEditingSeq(s => {
                                      if (!s) return s;
                                      const newSteps = s.steps.map(st => st.id === updated.id ? updated : st);
                                      const prevType = s.steps.find(st => st.id === updated.id)?.type;
                                      // Recomputar si el paso es/era pregunta (estructura de ramas cambia)
                                      const needsRecompute = updated.type === "question" || prevType === "question";
                                      return { ...s, steps: needsRecompute ? computeNextStepIds(newSteps) : newSteps };
                                    })}
                                    onRemove={() => setEditingSeq(s => {
                                      if (!s) return s;
                                      // Limpiar referencias a este paso en opciones de preguntas
                                      const cleaned = s.steps
                                        .filter(st => st.id !== step.id)
                                        .map(st => ({
                                          ...st,
                                          options: st.options?.map(o => o.next_step_id === step.id ? { ...o, next_step_id: null } : o),
                                        }));
                                      return { ...s, steps: computeNextStepIds(cleaned) };
                                    })}
                                    userId={user?.id ?? ""}
                                    branchInfo={stepBranchMap.get(step.id)}
                                    isShared={step.shared === true}
                                    isHighlighted={step.id === highlightStepId}
                                    availableBranches={activeBranches.length > 0 ? activeBranches.map((b, bi) => ({ label: b.label, branchIdx: bi })) : undefined}
                                    onMoveToBranch={activeBranches.length > 0 ? (target) => handleMoveToBranch(step.id, target) : undefined}
                                  />
                                </div>
                              );
                              if (i === 0) return [stepEl];
                              const insertBtn = insertAtIdx === i - 1 ? (
                                <div key={`ins-open-${i}`} className="flex flex-wrap gap-1 py-2 px-2.5 rounded-lg bg-primary/5 border border-primary/20 mb-2">
                                  <span className="text-[10px] text-muted-foreground/70 w-full">Insertar paso aquí:</span>
                                  {(["message", "question", "link", "image", "video", "audio", "file"] as const).map(t => (
                                    <button key={t} onClick={() => {
                                      const inserted = newStep(t);
                                      setEditingSeq(s => {
                                        if (!s) return s;
                                        const steps = [...s.steps];
                                        steps.splice(i, 0, inserted);
                                        return { ...s, steps: computeNextStepIds(steps) };
                                      });
                                      setInsertAtIdx(null);
                                      flashStep(inserted.id);
                                    }} className="text-[10px] px-2 py-0.5 rounded-md border border-primary/30 bg-background hover:bg-primary/10 text-primary transition-colors">
                                      + {STEP_TYPE_LABELS[t]}
                                    </button>
                                  ))}
                                  <button onClick={() => setInsertAtIdx(null)} className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground ml-1">✕</button>
                                </div>
                              ) : (
                                <button key={`ins-btn-${i}`} onClick={() => setInsertAtIdx(i - 1)}
                                  className="w-full flex items-center gap-2 mb-1.5 group cursor-pointer">
                                  <div className="flex-1 h-px bg-border/20 group-hover:bg-primary/25 transition-colors" />
                                  <span className="text-[9px] text-muted-foreground/25 group-hover:text-primary/50 transition-colors flex items-center gap-0.5 shrink-0 select-none">
                                    <Plus size={7} /> insertar
                                  </span>
                                  <div className="flex-1 h-px bg-border/20 group-hover:bg-primary/25 transition-colors" />
                                </button>
                              );
                              return [insertBtn, stepEl];
                            })}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </div>

                    {branchTargets.size > 0 && (
                      <div className="rounded-lg border border-border bg-secondary/20 px-3 pt-2.5 pb-2 space-y-2">
                        <p className="text-[10px] font-semibold text-muted-foreground">Estructura de ramas</p>
                        <svg viewBox="0 0 310 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full" style={{ maxHeight: 72 }}>
                          <rect x="1" y="27" width="70" height="26" rx="5" fill="#6366f1" fillOpacity="0.14" stroke="#6366f1" strokeOpacity="0.5" strokeWidth="1"/>
                          <text x="36" y="44" textAnchor="middle" fontSize="9" fill="currentColor" fontFamily="system-ui, sans-serif">Pregunta</text>
                          <path d="M71 33 L100 18" stroke="#22c55e" strokeWidth="1.5"/>
                          <text x="78" y="12" fontSize="8" fill="#22c55e" fontWeight="700" fontFamily="system-ui, sans-serif">SI</text>
                          <rect x="100" y="6" width="96" height="24" rx="5" fill="#22c55e" fillOpacity="0.1" stroke="#22c55e" strokeOpacity="0.5" strokeWidth="1"/>
                          <text x="148" y="22" textAnchor="middle" fontSize="8" fill="#22c55e" fontFamily="system-ui, sans-serif">pasos rama SI</text>
                          <path d="M71 47 L100 62" stroke="#ef4444" strokeWidth="1.5"/>
                          <text x="78" y="76" fontSize="8" fill="#ef4444" fontWeight="700" fontFamily="system-ui, sans-serif">NO</text>
                          <rect x="100" y="50" width="96" height="24" rx="5" fill="#ef4444" fillOpacity="0.1" stroke="#ef4444" strokeOpacity="0.5" strokeWidth="1"/>
                          <text x="148" y="66" textAnchor="middle" fontSize="8" fill="#ef4444" fontFamily="system-ui, sans-serif">pasos rama NO</text>
                          <path d="M196 18 Q214 18 214 40 L228 40" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5"/>
                          <path d="M196 62 Q214 62 214 40 L228 40" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5"/>
                          <rect x="228" y="27" width="80" height="26" rx="5" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1"/>
                          <text x="268" y="44" textAnchor="middle" fontSize="8" fill="currentColor" fillOpacity="0.5" fontFamily="system-ui, sans-serif">paso compartido</text>
                        </svg>
                        <p className="text-[9px] text-muted-foreground/60 leading-relaxed">
                          Los pasos después de cada destino se ejecutan en cadena. Los pasos al final (compartidos) los ejecutan <em>todas</em> las ramas.
                        </p>
                      </div>
                    )}

                    {activeBranches.length > 0 ? (
                      <div className="space-y-2">
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-medium text-muted-foreground">Agregar nuevo paso a:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {activeBranches.map((branch, idx) => (
                              <button key={branch.label + idx}
                                onClick={() => setAddBranchTarget(idx)}
                                className={`text-[10px] px-2.5 py-1 rounded-full border font-medium transition-colors ${
                                  addBranchTarget === idx
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : branch.isVirtual
                                      ? "border-dashed border-amber-400/60 text-amber-600 dark:text-amber-400 hover:border-amber-500"
                                      : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                                }`}>
                                {branch.isVirtual ? `⚠ "${branch.label}" sin paso` : `Rama "${branch.label}"`}
                              </button>
                            ))}
                            <button
                              onClick={() => setAddBranchTarget("shared")}
                              className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
                                addBranchTarget === "shared"
                                  ? "bg-secondary border-border text-foreground font-medium"
                                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                              }`}>
                              Paso compartido
                            </button>
                          </div>
                          {addBranchTarget === "shared" && (
                            <p className="text-[9px] text-muted-foreground/50">El paso se agrega al final — lo ejecutan todas las ramas (reconvergencia)</p>
                          )}
                          {typeof addBranchTarget === "number" && (
                            <p className="text-[9px] text-muted-foreground/50">El paso se inserta al final de la rama "{activeBranches[addBranchTarget]?.label}"</p>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {(["message", "question", "link", "image", "video", "audio", "file"] as const).map(t => (
                            <button key={t}
                              onClick={() => {
                                const inserted = addBranchTarget === "shared"
                                  ? { ...newStep(t), shared: true }
                                  : newStep(t);
                                const branch = typeof addBranchTarget === "number" ? activeBranches[addBranchTarget] : null;
                                setEditingSeq(seq => {
                                  if (!seq) return seq;
                                  if (addBranchTarget === "shared") {
                                    return { ...seq, steps: computeNextStepIds([...seq.steps, inserted]) };
                                  }
                                  let insertIdx: number;
                                  if (branch?.isVirtual && branch.questionId) {
                                    const realSiblings = activeBranches.filter(b => !b.isVirtual && b.questionId === branch.questionId);
                                    if (realSiblings.length > 0) {
                                      const maxEnd = realSiblings.reduce((acc, b) => {
                                        const end = b.insertBeforeIdx ?? seq.steps.length;
                                        return end > acc ? end : acc;
                                      }, 0);
                                      insertIdx = maxEnd;
                                    } else {
                                      const qi = seq.steps.findIndex(s => s.id === branch.questionId);
                                      insertIdx = qi >= 0 ? qi + 1 : seq.steps.length;
                                    }
                                  } else {
                                    insertIdx = branch?.insertBeforeIdx ?? seq.steps.length;
                                  }
                                  const steps = [...seq.steps];
                                  steps.splice(insertIdx, 0, inserted);
                                  if (branch?.isVirtual && branch.questionId) {
                                    const linked = steps.map(st => st.id !== branch.questionId ? st : {
                                      ...st,
                                      options: st.options?.map(o => o.label === branch.label && !o.next_step_id ? { ...o, next_step_id: inserted.id } : o),
                                    });
                                    return { ...seq, steps: computeNextStepIds(linked) };
                                  }
                                  return { ...seq, steps: computeNextStepIds(steps) };
                                });
                                flashStep(inserted.id);
                              }}
                              className="flex items-center justify-center gap-1 h-8 rounded-lg border border-dashed border-border text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors">
                              <Plus size={10} /> {STEP_TYPE_LABELS[t]}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-1.5">
                        {(["message", "question", "link", "image", "video", "audio", "file"] as const).map(t => (
                          <button key={t}
                            onClick={() => {
                              const inserted = newStep(t);
                              setEditingSeq(s => s ? { ...s, steps: computeNextStepIds([...s.steps, inserted]) } : s);
                              flashStep(inserted.id);
                            }}
                            className="flex items-center justify-center gap-1 h-8 rounded-lg border border-dashed border-border text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors">
                            <Plus size={10} /> {STEP_TYPE_LABELS[t]}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* ── Árbol visual de la secuencia ── */}
                    {activeBranches.length > 0 && treeData && (
                      <div className="rounded-lg border border-border overflow-hidden">
                        <button
                          onClick={() => setTreeOpen(v => !v)}
                          className="flex items-center justify-between w-full px-3 py-2 text-[11px] font-medium text-muted-foreground hover:bg-secondary/30 transition-colors"
                        >
                          <span className="flex items-center gap-1.5">
                            <GitBranch size={11} />
                            Árbol de la secuencia
                            <span className="text-[9px] font-normal opacity-50">
                              {editingSeq.steps.length} pasos · {activeBranches.filter(b => !b.isVirtual).length} ramas
                            </span>
                          </span>
                          <ChevronDown size={12} className={`transition-transform duration-200 ${treeOpen ? "rotate-180" : ""}`} />
                        </button>
                        {treeOpen && treeData && (
                          <div className="bg-secondary/10 border-t border-border/40 overflow-x-auto">
                            <div
                              className="p-3 flex flex-col items-center"
                              style={{
                                minWidth: `${Math.max(220, treeData.reduce<number>((acc, s) => s.kind === "fork" ? Math.max(acc, s.branches.length) : acc, 1) * 92)}px`,
                              }}
                            >
                              {treeData.map((seg, si) => {
                                const hasNextSeg = si < treeData.length - 1;

                                if (seg.kind === "trunk") {
                                  return (
                                    <div key={`t${si}`} className="flex flex-col items-center w-full">
                                      {/* Conector de entrada cuando este trunk sigue a un fork */}
                                      {si > 0 && <div className="w-px h-2 bg-border/60" />}
                                      {seg.steps.map((node, ni) => {
                                        const isQ = node.step.type === "question";
                                        const preview = getStepPreview(node.step, 26);
                                        return (
                                          <div key={node.step.id} className="flex flex-col items-center w-full">
                                            {ni > 0 && <div className="w-px h-2.5 bg-border/60" />}
                                            <button
                                              onClick={() => flashStep(node.step.id)}
                                              className={`flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-lg border text-left w-full max-w-[210px] hover:border-primary/40 hover:bg-primary/5 transition-colors ${isQ ? "border-amber-400/40 bg-amber-400/5" : "border-border/60 bg-background"}`}
                                            >
                                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isQ ? "bg-amber-400" : "bg-border"}`} />
                                              <span className="text-[8px] text-muted-foreground/60 tabular-nums shrink-0 w-3.5">{node.idx + 1}</span>
                                              <span className={`text-[9px] font-semibold shrink-0 ${isQ ? "text-amber-500 dark:text-amber-400" : "text-foreground/80"}`}>{STEP_TYPE_LABELS[node.step.type]}</span>
                                              {preview && <span className="text-[8.5px] text-muted-foreground/65 truncate">{preview}</span>}
                                              {isQ && <span className="ml-auto text-[8px] text-amber-400/70 shrink-0">▼</span>}
                                            </button>
                                          </div>
                                        );
                                      })}
                                      {hasNextSeg && <div className="w-px h-2.5 bg-border/60" />}
                                    </div>
                                  );
                                }

                                // Fork: columnas de ramas en paralelo
                                const isSingle = seg.branches.length === 1;
                                return (
                                  <div key={`f${si}`} className="flex flex-col w-full">

                                    {/* Columnas de ramas */}
                                    <div className="flex w-full">
                                      {seg.branches.map((branch, bi) => {
                                        const color = BRANCH_COLORS[branch.bi % BRANCH_COLORS.length];
                                        const isFirstB = bi === 0;
                                        const isLastB = bi === seg.branches.length - 1;
                                        return (
                                          /* relative: contexto para la línea vertical absoluta */
                                          <div key={branch.bi} className="relative flex-1 flex flex-col items-center min-w-[84px]">

                                            {/* Línea vertical absoluta: recorre TODO el alto de la columna
                                                independientemente del contenido — esto garantiza la conexión */}
                                            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-border/55 pointer-events-none" />

                                            {/* T-connector superior: solo líneas horizontales (la vertical ya está arriba) */}
                                            <div className="relative w-full h-3">
                                              {!isSingle && !isFirstB && <div className="absolute top-0 left-0 w-1/2 h-px bg-border/60" />}
                                              {!isSingle && !isLastB && <div className="absolute top-0 right-0 w-1/2 h-px bg-border/60" />}
                                            </div>

                                            {/* Etiqueta de rama */}
                                            <span className={`relative z-10 text-[8px] font-bold px-2 py-px rounded-full border truncate max-w-[82px] mb-1.5 ${color.pill}`}>
                                              {branch.label}
                                            </span>

                                            {/* Pasos de esta rama — z-10 para rendir encima de la línea absoluta */}
                                            <div className="relative z-10 flex flex-col items-center w-full px-1 pb-3">
                                              {branch.steps.length === 0 ? (
                                                <span className="text-[8px] text-muted-foreground/50 italic py-1">(vacío)</span>
                                              ) : branch.steps.map((node, ni) => {
                                                const isNestedQ = node.step.type === "question";
                                                const preview = getStepPreview(node.step, 10);
                                                return (
                                                  <div key={node.step.id} className="flex flex-col items-center w-full">
                                                    {ni > 0 && <div className={`w-px h-1.5 ${color.bar} opacity-50`} />}
                                                    <button
                                                      onClick={() => flashStep(node.step.id)}
                                                      className={`w-full text-left rounded-md border px-1.5 py-0.5 hover:bg-primary/5 hover:border-primary/40 transition-colors ${isNestedQ ? "border-amber-400/40 bg-amber-400/5" : `${color.border} bg-background/80`}`}
                                                    >
                                                      <div className="flex items-center gap-0.5">
                                                        <span className="text-[7.5px] text-muted-foreground/55 tabular-nums shrink-0">{node.idx + 1}</span>
                                                        <span className={`text-[8.5px] font-semibold shrink-0 ${isNestedQ ? "text-amber-500 dark:text-amber-400" : color.text}`}>{STEP_TYPE_LABELS[node.step.type]}</span>
                                                      </div>
                                                      {preview && <div className="text-[7.5px] text-muted-foreground/60 truncate leading-tight">{preview}</div>}
                                                    </button>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>

                                    {/* Línea de merge horizontal — justo debajo de las columnas */}
                                    {hasNextSeg && (
                                      <div className="flex w-full" style={{ height: "1px" }}>
                                        {seg.branches.map((branch, bi) => {
                                          const isFirstB = bi === 0;
                                          const isLastB = bi === seg.branches.length - 1;
                                          return (
                                            <div key={`m${branch.bi}`} className="flex-1 relative" style={{ height: "1px" }}>
                                              {!isSingle && !isFirstB && <div className="absolute inset-y-0 left-0 right-1/2 bg-border/60" />}
                                              {!isSingle && !isLastB && <div className="absolute inset-y-0 right-0 left-1/2 bg-border/60" />}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      disabled={!editingSeq.name.trim() || upsertSequence.isPending}
                      onClick={async () => {
                        if (!editingSeq.name.trim()) return;
                        try {
                          await upsertSequence.mutateAsync(editingSeq);
                          setEditingSeq(null);
                          toast.success(editingSeq.id ? "Secuencia actualizada" : "Secuencia creada");
                        } catch (e: any) {
                          toast.error(e?.message?.slice(0, 120) ?? "Error al guardar la secuencia");
                        }
                      }}
                      className="w-full h-9 rounded-xl bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-40 transition-opacity">
                      {upsertSequence.isPending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                      Guardar secuencia
                    </button>
                  </div>
                )}
                </div>
              </div>}

              {/* ── Sub-sección: Flujos ── */}
              {editingSeq === null && (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-secondary/20">
                    <p className="text-xs font-semibold">Flujos</p>
                    <span className="text-[10px] text-muted-foreground/60">Trigger → Secuencia → Acción</span>
                  </div>

                  <div className="p-4 space-y-3">
                  {editingFlow === null ? (
                    <>
                      {flows.length === 0 && (
                        <p className="text-xs text-muted-foreground/60 italic text-center py-3">Sin flujos. Crea uno abajo.</p>
                      )}
                      {flows.map(flow => {
                        const seqName = sequences.find(s => s.id === flow.sequence_id)?.name;
                        return (
                          <div key={flow.id} className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl border border-border/60 bg-background">
                            <GitBranch size={13} className="text-muted-foreground mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{flow.name}</p>
                              <p className="text-[10px] text-muted-foreground/60 truncate">
                                {(flow.flow_trigger_type ?? "intent") === "new_conversation"
                                  ? "Conversación nueva"
                                  : flow.trigger_text || <em>Sin trigger</em>}
                              </p>
                              <p className="text-[10px] text-muted-foreground/50">
                                {seqName ? `→ ${seqName}` : "→ Sin secuencia"}
                                {" · "}
                                {FLOW_FINAL_ACTION_LABELS[flow.final_action]}
                                {(flow.flow_trigger_type ?? "intent") === "intent" && (
                                  <> · {(flow.trigger_once ?? true) ? "1 vez" : "múltiples veces"}</>
                                )}
                              </p>
                            </div>
                            {/* Toggle activo */}
                            <button
                              onClick={() => toggleFlow.mutate({ id: flow.id, is_active: !flow.is_active })}
                              className={`w-8 h-5 shrink-0 rounded-full transition-colors flex items-center px-0.5 mt-0.5 ${flow.is_active ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
                            >
                              <span className={`w-3 h-3 rounded-full bg-white shadow transition-transform ${flow.is_active ? "translate-x-3.5" : "translate-x-0"}`} />
                            </button>
                            <button
                              onClick={() => { setTriggerValidation(null); setEditingFlow({ id: flow.id, name: flow.name, trigger_text: flow.trigger_text, sequence_id: flow.sequence_id, final_action: flow.final_action, is_active: flow.is_active, trigger_once: flow.trigger_once ?? true, flow_trigger_type: flow.flow_trigger_type ?? "intent" }); }}
                              className="p-1 rounded-lg hover:bg-secondary text-muted-foreground transition-colors shrink-0">
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={() => setPendingDeleteFlowId(flow.id)}
                              className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        );
                      })}
                      <button
                        onClick={() => { setTriggerValidation(null); setEditingFlow(newDraftFlow()); }}
                        className="flex items-center gap-1.5 w-full px-3 h-9 rounded-xl border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors">
                        <Plus size={13} /> Nuevo flujo
                      </button>
                    </>
                  ) : (
                    /* ── Editor de flujo ── */
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setTriggerValidation(null); setEditingFlow(null); }} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
                          <ArrowLeft size={14} />
                        </button>
                        <span className="text-xs font-medium">{editingFlow.id ? "Editar flujo" : "Nuevo flujo"}</span>
                      </div>

                      {/* Nombre */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Nombre</label>
                        <input
                          value={editingFlow.name}
                          onChange={e => setEditingFlow(f => f ? { ...f, name: e.target.value } : f)}
                          placeholder="ej: Consulta de precios"
                          className="w-full h-8 px-2.5 text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>

                      {/* Tipo de trigger */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">¿Cuándo se activa?</label>
                        <div className="grid grid-cols-1 gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingFlow(f => f ? { ...f, flow_trigger_type: "new_conversation" } : f)}
                            className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all ${editingFlow.flow_trigger_type === "new_conversation" ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border hover:border-primary/40 hover:bg-muted/30"}`}
                          >
                            <p className="text-xs font-semibold">Conversación Nueva</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Se envía 1 sola vez cuando el contacto escribe por primera vez al agente IA</p>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingFlow(f => f ? { ...f, flow_trigger_type: "intent" } : f)}
                            className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all ${editingFlow.flow_trigger_type === "intent" ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border hover:border-primary/40 hover:bg-muted/30"}`}
                          >
                            <p className="text-xs font-semibold">Comportamiento</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Se activa cuando la IA detecta una intención específica en el mensaje del contacto</p>
                          </button>
                        </div>
                      </div>

                      {/* Intent config — solo si trigger_type = "intent" */}
                      {editingFlow.flow_trigger_type === "intent" && (
                        <div className="space-y-2 pl-0.5">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">
                              ¿Qué comportamiento activa el flujo?
                            </label>
                            <textarea
                              value={editingFlow.trigger_text}
                              onChange={e => setEditingFlow(f => f ? { ...f, trigger_text: e.target.value } : f)}
                              placeholder="Describe en lenguaje natural la intención del usuario. Ej: «cuando el usuario pregunta por precios, planes o quiere cotizar»"
                              rows={3}
                              className={`w-full px-2.5 py-1.5 text-xs rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none leading-relaxed transition-colors ${
                                triggerValidation
                                  ? triggerValidation.severity === "valid"
                                    ? "border-emerald-400/70"
                                    : triggerValidation.severity === "warn"
                                      ? "border-amber-400/70"
                                      : "border-red-400/70"
                                  : "border-input"
                              }`}
                            />
                            {triggerValidation ? (
                              <div className={`rounded-md px-2 py-1.5 text-[10px] leading-snug mt-1 ${
                                triggerValidation.severity === "valid"
                                  ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                                  : triggerValidation.severity === "warn"
                                    ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400"
                                    : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400"
                              }`}>
                                <span className="font-semibold mr-1">
                                  {triggerValidation.severity === "valid" ? "✓ Válido" : triggerValidation.severity === "warn" ? "⚠ Advertencia" : "✗ No válido"}
                                </span>
                                {triggerValidation.category && <span className="opacity-75">({triggerValidation.category}) </span>}
                                <span className="opacity-80">{triggerValidation.reason}</span>
                              </div>
                            ) : (
                              <p className="text-[10px] text-muted-foreground/50 mt-1">La IA evalúa esta intención en cada mensaje entrante.</p>
                            )}
                            <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2 mt-1 space-y-1.5">
                              <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ Funciona: </span>
                                intención de compra, FAQ, objeción, negociación, palabra clave o emoji
                              </p>
                              <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
                                <span className="text-red-500 font-medium">✗ Bloqueado: </span>
                                horas programadas, días de la semana, llamadas de voz
                              </p>
                            </div>
                          </div>

                          {/* ¿Cuántas veces? */}
                          <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5 space-y-1.5">
                            <p className="text-xs font-medium">¿Cuántas veces puede activarse?</p>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingFlow(f => f ? { ...f, trigger_once: true } : f)}
                                className={`flex-1 text-[10px] py-1.5 rounded-lg border transition-all ${editingFlow.trigger_once ? "border-primary bg-primary/8 text-primary font-medium" : "border-border text-muted-foreground hover:border-primary/40"}`}
                              >
                                1 sola vez por conversación
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingFlow(f => f ? { ...f, trigger_once: false } : f)}
                                className={`flex-1 text-[10px] py-1.5 rounded-lg border transition-all ${!editingFlow.trigger_once ? "border-primary bg-primary/8 text-primary font-medium" : "border-border text-muted-foreground hover:border-primary/40"}`}
                              >
                                Múltiples veces
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Secuencia */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Secuencia a ejecutar</label>
                        <select
                          value={editingFlow.sequence_id ?? ""}
                          onChange={e => setEditingFlow(f => f ? { ...f, sequence_id: e.target.value || null } : f)}
                          className="w-full h-8 px-2 text-xs rounded-lg border border-input bg-background focus:outline-none">
                          <option value="">Sin secuencia</option>
                          {sequences.map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.steps.length} pasos)</option>
                          ))}
                        </select>
                        {sequences.length === 0 && (
                          <p className="text-[10px] text-amber-600">No hay secuencias creadas. Crea una en la sección de arriba primero.</p>
                        )}
                      </div>

                      {/* Acción final */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Acción al terminar</label>
                        <select
                          value={editingFlow.final_action}
                          onChange={e => setEditingFlow(f => f ? { ...f, final_action: e.target.value as CrmWaFlowFinalAction } : f)}
                          className="w-full h-8 px-2 text-xs rounded-lg border border-input bg-background focus:outline-none">
                          {(Object.entries(FLOW_FINAL_ACTION_LABELS) as [CrmWaFlowFinalAction, string][]).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                      </div>

                      {/* Activo */}
                      <div className="flex items-center justify-between py-1">
                        <label className="text-xs font-medium text-muted-foreground">Flujo activo</label>
                        <button
                          onClick={() => setEditingFlow(f => f ? { ...f, is_active: !f.is_active } : f)}
                          className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${editingFlow.is_active ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
                        >
                          <span className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${editingFlow.is_active ? "translate-x-4" : "translate-x-0"}`} />
                        </button>
                      </div>


                      {/* Guardar */}
                      <button
                        disabled={!editingFlow.name.trim() || (editingFlow.flow_trigger_type === "intent" && !editingFlow.trigger_text.trim()) || upsertFlow.isPending}
                        onClick={async () => {
                          if (!editingFlow.name.trim()) return;
                          if (editingFlow.flow_trigger_type === "intent") {
                            if (!editingFlow.trigger_text.trim()) return;
                            const validation = triggerValidation ?? classifyTrigger(editingFlow.trigger_text.trim());
                            if (!triggerValidation) setTriggerValidation(validation);
                            if (validation.severity === "invalid") {
                              toast.error("Corrige el trigger antes de guardar.");
                              return;
                            }
                          }
                          try {
                            await upsertFlow.mutateAsync(editingFlow);
                            setTriggerValidation(null); setEditingFlow(null);
                            toast.success(editingFlow.id ? "Flujo actualizado" : "Flujo creado");
                          } catch (e: any) {
                            toast.error(e?.message?.slice(0, 120) ?? "Error al guardar el flujo");
                          }
                        }}
                        className="w-full h-9 rounded-xl bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-40 transition-opacity">
                        {upsertFlow.isPending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                        Guardar flujo
                      </button>
                    </div>
                  )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Plantillas / Remarketing ── */}
          {section === "plantillas" && (
            <CrmWaTemplates
              context="remarketing"
              forcedCategory="MARKETING"
              associationOptions={[
                ...allProducts.map(p => ({ id: p.id, label: p.name, type: "product" as const, entityId: p.id })),
                ...allServices.map(s => ({ id: s.id, label: s.name, type: "service" as const, entityId: s.id })),
                ...allCourses.map(c  => ({ id: c.id, label: c.title, type: "course" as const, entityId: c.id })),
              ]}
            />
          )}

          {/* ── Campañas ── */}
          {section === "campanias" && <CrmWaCampaigns />}

          </div>{/* end inner padding wrapper */}
          </div>{/* end scrollable area */}

          {/* Footer — fijo en la base, fuera del scroll */}
          {section !== "perfil" && section !== "etiquetas" && section !== "respuestas" && section !== "flujos" && section !== "plantillas" && section !== "campanias" && (
            <div className="px-5 py-4 border-t shrink-0">
              <Button onClick={handleSave} disabled={saving} className="w-full h-9 gap-1.5">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                Guardar cambios
              </Button>
            </div>
          )}
        </div>{/* end content column */}
      </div>
    </div>
  );
};

// ─── Delivery Tick ────────────────────────────────────────────────────────────
function DeliveryTick({ status }: { status?: string }) {
  if (!status || status === "pending") return <Clock size={10} className="text-white/50 shrink-0" />;
  if (status === "sent")     return <Check size={10} className="text-white/60 shrink-0" />;
  if (status === "failed")   return <AlertTriangle size={10} className="text-red-300 shrink-0" />;
  return <CheckCheck size={10} className={status === "read" ? "text-[#53bdeb] shrink-0" : "text-white/60 shrink-0"} />;
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
const MessageBubble = ({ msg, highlight }: { msg: CrmWaMessage; highlight?: boolean }) => {
  const isUser    = msg.role === "user";
  const isNotif   = !isUser && msg.content.startsWith("[notif]");
  const isHuman   = msg.role === "human";
  const displayContent = isNotif ? msg.content.slice(7) : msg.content;
  const time = new Date(msg.created_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

  // Nota interna — solo visible para el equipo
  if (msg.is_internal) {
    return (
      <div id={`msg-${msg.id}`} className="flex justify-end mb-1.5 px-3">
        <div className="max-w-[78%] sm:max-w-[65%] bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl rounded-tr-sm px-3 py-2 shadow-sm">
          <div className="flex items-center gap-1 mb-1">
            <Lock size={9} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Nota interna</span>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{msg.content}</p>
          <p className="text-[10px] text-amber-600/70 dark:text-amber-400/60 text-right mt-1">{time}</p>
        </div>
      </div>
    );
  }

  // Notificación del sistema — centrada, tipo pill
  if (isNotif) {
    return (
      <div id={`msg-${msg.id}`} className="flex justify-center my-3 px-4">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60">
          <Bell size={10} className="text-blue-500 shrink-0" />
          <span className="text-[11px] text-blue-700 dark:text-blue-400 text-center">{displayContent}</span>
        </div>
      </div>
    );
  }

  const isIncoming = isUser;

  return (
    <div id={`msg-${msg.id}`} className={`flex ${isIncoming ? "justify-start" : "justify-end"} mb-1.5 px-3`}>
      <div className={`max-w-[78%] sm:max-w-[65%] ${highlight ? "ring-2 ring-yellow-400 ring-offset-2 rounded-2xl" : ""}`}>
        <div className={`rounded-2xl overflow-hidden text-sm ${
          isIncoming
            ? "bg-white dark:bg-zinc-800 text-foreground rounded-tl-sm border border-border/40 shadow-sm"
            : isHuman
              ? "bg-[#1877F2] text-white rounded-tr-sm shadow-sm"
              : "bg-[#00a884] text-white rounded-tr-sm shadow-sm"
        }`}>
          {/* Imagen */}
          {msg.media_type === "image" && msg.media_url && (
            <a href={msg.media_url} target="_blank" rel="noopener noreferrer">
              <img src={msg.media_url} alt="Imagen"
                className="w-full max-w-[260px] object-cover block"
                style={{ maxHeight: 200, borderRadius: "inherit" }} />
            </a>
          )}
          {/* Documento */}
          {msg.media_type === "document" && msg.media_url && (
            <div>
              <a href={msg.media_url} target="_blank" rel="noopener noreferrer"
                className={`flex items-center gap-2.5 px-3.5 py-3 font-medium ${isIncoming ? "text-primary" : "text-white"}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base ${isIncoming ? "bg-primary/10" : "bg-white/20"}`}>
                  📄
                </div>
                <span className="text-sm truncate">{displayContent.replace(/^\[PDF: /, "").replace(/\]$/, "")}</span>
              </a>
              {msg.send_error && (
                <div className={`flex items-center gap-1 px-3.5 pb-2 text-[10px] ${isIncoming ? "text-destructive" : "text-red-300"}`}>
                  <AlertTriangle size={9} />
                  No se pudo entregar al destinatario
                </div>
              )}
            </div>
          )}
          {/* Video */}
          {msg.media_type === "video" && msg.media_url && (
            <div>
              <a href={msg.media_url} target="_blank" rel="noopener noreferrer"
                className={`flex items-center gap-2.5 px-3.5 py-3 font-medium ${isIncoming ? "text-primary" : "text-white"}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base ${isIncoming ? "bg-primary/10" : "bg-white/20"}`}>
                  📹
                </div>
                <span className="text-sm truncate">{displayContent !== "[video]" ? displayContent : "Video"}</span>
              </a>
              {msg.send_error && (
                <div className={`flex items-center gap-1 px-3.5 pb-2 text-[10px] ${isIncoming ? "text-destructive" : "text-red-300"}`}>
                  <AlertTriangle size={9} />
                  No se pudo entregar al destinatario
                </div>
              )}
            </div>
          )}
          {/* Audio */}
          {msg.media_type === "audio" && (
            <div>
              <div className={`flex items-start gap-2.5 px-3.5 py-3 ${isIncoming ? "text-muted-foreground" : "text-white/90"}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-base mt-0.5 ${isIncoming ? "bg-secondary" : "bg-white/20"}`}>
                  🎤
                </div>
                <div className="flex-1 min-w-0">
                  {msg.transcription ? (
                    <p className="text-sm italic leading-relaxed break-words">{msg.transcription}</p>
                  ) : (
                    <span className={`text-sm ${isIncoming ? "opacity-60" : "opacity-70"}`}>
                      {msg.content !== "[Mensaje de voz]" ? msg.content : "Mensaje de voz"}
                    </span>
                  )}
                </div>
              </div>
              {msg.send_error && (
                <div className={`flex items-center gap-1 px-3.5 pb-2 text-[10px] ${isIncoming ? "text-destructive" : "text-red-300"}`}>
                  <AlertTriangle size={9} />
                  No se pudo entregar al destinatario
                </div>
              )}
            </div>
          )}
          {/* Pregunta interactiva (flujo) */}
          {msg.media_type === "interactive_question" && (
            <div className="px-3.5 py-2.5 space-y-2">
              <p className="whitespace-pre-wrap break-words text-sm font-medium">{displayContent}</p>
              {msg.interactive_options && msg.interactive_options.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {msg.interactive_options.map((opt, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/20 border border-white/30">
                      {opt.label}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-end gap-1 mt-1 text-white/60">
                <span className="text-[10px]">{time}</span>
                <DeliveryTick status={msg.delivery_status} />
              </div>
            </div>
          )}
          {/* Texto */}
          {!(msg.media_type === "document" || msg.media_type === "video" || msg.media_type === "audio" || msg.media_type === "interactive_question") && (
            <div className="px-3.5 py-2.5 leading-relaxed">
              {displayContent !== "[Imagen]" && (
                <>
                  <p className="whitespace-pre-wrap break-words">{displayContent}</p>
                  {/* Badge botón — respuesta a pregunta de flujo */}
                  {msg.button_reply_id && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        🔘 Botón seleccionado
                      </span>
                    </div>
                  )}
                </>
              )}
              {msg.send_error && (
                <div className={`flex items-center gap-1 mt-1.5 text-[10px] ${isIncoming ? "text-destructive" : "text-white/80"}`}>
                  <AlertTriangle size={9} />
                  {msg.send_error === "whatsapp_window_expired" || msg.send_error === "24h_window_expired"
                    ? "No se pudo enviar: más de 24h sin interacción"
                    : "Error al enviar"}
                </div>
              )}
              <div className={`flex items-center justify-end gap-1 mt-1 ${isIncoming ? "text-muted-foreground/60" : "text-white/60"}`}>
                <span className="text-[10px]">{time}</span>
                {!isIncoming && <DeliveryTick status={msg.delivery_status} />}
              </div>
            </div>
          )}
          {(msg.media_type === "document" || msg.media_type === "video" || msg.media_type === "audio") && (
            <div className={`flex items-center justify-end gap-1 px-3.5 pb-2 text-[10px] ${isIncoming ? "text-muted-foreground/60" : "text-white/60"}`}>
              <span>{time}</span>
              {!isIncoming && <DeliveryTick status={msg.delivery_status} />}
            </div>
          )}
        </div>
        {/* Etiqueta del emisor */}
        {!isIncoming && (
          <p className={`text-[10px] mt-0.5 pr-1 text-right font-medium ${isHuman ? "text-[#1877F2]/70" : "text-[#00a884]/70"}`}>
            {isHuman ? "Tú" : "IA"}
          </p>
        )}
      </div>
    </div>
  );
};

// ─── Chat Panel ───────────────────────────────────────────────────────────────
type UpcomingAppt = { appt: CrmAppointment; contact: CrmContact; minutesAway: number };

const ChatPanel = ({
  conv, onBack, onDelete, onToggleFavorite, onArchive, staffList, staffMap, highlightMessageId, onHighlightClear, pendingSale, onSaleConfirmed, upcomingAppt,
}: {
  conv: CrmWaConversation;
  onBack?: () => void;
  onDelete?: () => void;
  onToggleFavorite?: () => void;
  onArchive?: () => void;
  staffList: CrmStaff[];
  staffMap: Record<string, CrmStaff>;
  highlightMessageId?: string | null;
  onHighlightClear?: () => void;
  pendingSale?: CrmSale | null;
  onSaleConfirmed?: () => void;
  upcomingAppt?: UpcomingAppt | null;
}) => {
  const { data: messages = [], isLoading } = useWaMessages(conv.id);
  const { data: allLabels = [] }           = useWaLabels();
  const { data: convLabels = [] }          = useConversationLabels(conv.id);
  const { data: allQuickReplies = [] }     = useQuickReplies();
  const toggleLabel                        = useToggleConversationLabel();
  const assignConv                         = useAssignConversation();
  const setMode                            = useSetWaConversationMode();
  const qc                                 = useQueryClient();
  const updateSale                         = useUpdateSale();
  const [text, setText]             = useState("");
  const [sending, setSending]       = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [windowError, setWindowError] = useState(false);
  const [showMenu, setShowMenu]     = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [qrSuggestions, setQrSuggestions] = useState<CrmQuickReply[]>([]);
  const [showQrPopover, setShowQrPopover] = useState(false);
  const [qrFocusIdx, setQrFocusIdx]       = useState(0);
  const [showAssign, setShowAssign] = useState(false);
  const [isInternalMode, setIsInternalMode] = useState(false);
  const [showNotesLog, setShowNotesLog] = useState(false);
  const [noteNavId, setNoteNavId] = useState<string | null>(null);
  const [paymentAction, setPaymentAction] = useState<"confirm" | "reject" | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<"confirm" | "reject" | null>(null);
  const bottomRef       = useRef<HTMLDivElement>(null);
  const fileInputRef    = useRef<HTMLInputElement>(null);
  const textareaRef     = useRef<HTMLTextAreaElement>(null);
  const prevNotesLogRef = useRef(false);

  const applyQuickReply = (content: string) => {
    setText(content);
    setShowQrPopover(false);
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      ta.style.height = "auto";
      ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
      ta.focus();
      ta.setSelectionRange(content.length, content.length);
    });
  };

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

  // Reset de estado al cambiar de conversación
  useEffect(() => {
    setIsInternalMode(false);
    setShowNotesLog(false);
    setNoteNavId(null);
    setText("");
    setShowEmojiPicker(false);
    setShowQrPopover(false);
    setQrSuggestions([]);
  }, [conv.id]);

  useEffect(() => {
    if (highlightMessageId) return; // el scroll al mensaje resaltado toma prioridad
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, conv.ai_typing, highlightMessageId]);

  // Scroll al mensaje resaltado cuando los mensajes carguen
  useEffect(() => {
    if (!highlightMessageId || isLoading) return;
    const t = setTimeout(() => onHighlightClear?.(), 3000);
    const el = document.getElementById(`msg-${highlightMessageId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    return () => clearTimeout(t);
  }, [highlightMessageId, isLoading, messages.length]);

  // Al salir del log de notas: scroll al fondo o al mensaje clickeado
  useEffect(() => {
    if (prevNotesLogRef.current && !showNotesLog) {
      setTimeout(() => {
        if (noteNavId) {
          const el = document.getElementById(`msg-${noteNavId}`);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
          setTimeout(() => setNoteNavId(null), 2500);
        } else {
          bottomRef.current?.scrollIntoView({ behavior: "instant" });
        }
      }, 60);
    }
    prevNotesLogRef.current = showNotesLog;
  }, [showNotesLog]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    setWindowError(false);
    try {
      if (isInternalMode) {
        const { error } = await supabase.from("crm_wa_messages").insert({
          conversation_id: conv.id,
          role: "human",
          content: text.trim(),
          is_internal: true,
        });
        if (error) toast.error("Error al guardar la nota");
        else {
          setText("");
          setIsInternalMode(false);
          qc.invalidateQueries({ queryKey: ["crm_wa_messages", conv.id] });
        }
      } else {
        const { data, error } = await supabase.functions.invoke("send-wa-message", {
          body: { conversation_id: conv.id, text: text.trim() },
        });
        if (error || data?.error === "24h_window_expired") {
          setWindowError(true);
          if (data?.error !== "24h_window_expired") toast.error("Error al enviar el mensaje");
        } else {
          setText("");
        }
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
  };

  const contactInitial = (conv.contact_name ?? conv.phone)[0].toUpperCase();
  const avatarBg = getAvatarColor(conv.contact_name ?? conv.phone);

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="px-3 sm:px-4 py-2.5 border-b flex items-center gap-2 shrink-0 bg-card">
        {/* Back button — mobile only */}
        {onBack && (
          <button onClick={onBack} className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-secondary transition-colors shrink-0 -ml-1">
            <ChevronLeft size={20} className="text-muted-foreground" />
          </button>
        )}

        {/* Avatar */}
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden flex items-center justify-center shrink-0 text-white font-bold text-sm relative"
          style={{ backgroundColor: avatarBg }}>
          <span>{contactInitial}</span>
          {conv.contact_profile_pic && (
            <img
              src={conv.contact_profile_pic}
              alt={conv.contact_name ?? conv.phone}
              className="absolute inset-0 w-full h-full object-cover"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          )}
        </div>

        {/* Name + phone */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold truncate leading-tight">{conv.contact_name ?? `+${conv.phone}`}</p>
            {conv.is_archived && (
              <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground border">
                Archivada
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {conv.contact_name && <p className="text-[11px] text-muted-foreground truncate">+{conv.phone}</p>}
            {conv.contact_name && <span className="text-muted-foreground/40">·</span>}
            <span className={`text-[11px] font-medium ${conv.mode === "AI" ? "text-[#00a884]" : "text-blue-500"}`}>
              {conv.mode === "AI" ? "IA activa" : "Manual"}
            </span>
          </div>
        </div>

        {/* Action icons — 44px touch targets */}
        <div className="flex items-center gap-0.5 shrink-0">

          {/* Favorite */}
          {onToggleFavorite && (
            <button
              onClick={onToggleFavorite}
              title={conv.is_favorite ? "Quitar de favoritos" : "Marcar como favorito"}
              className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-colors ${
                conv.is_favorite
                  ? "text-amber-400 hover:text-amber-500"
                  : "text-muted-foreground hover:bg-secondary hover:text-amber-400"
              }`}
            >
              <Star size={17} fill={conv.is_favorite ? "currentColor" : "none"} />
            </button>
          )}

          {/* Notes log */}
          <button
            onClick={() => setShowNotesLog(v => !v)}
            title="Notas internas"
            className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-colors ${showNotesLog ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
          >
            <StickyNote size={17} />
          </button>

          {/* Assign */}
          {staffList.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowAssign(v => !v)}
                className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-colors ${showAssign ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                title={conv.assigned_to ? `Asignado a ${staffMap[conv.assigned_to]?.name ?? ""}` : "Asignar a staff"}
              >
                {conv.assigned_to && staffMap[conv.assigned_to]
                  ? <span className="flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: "#1877F2" }}>
                      {staffMap[conv.assigned_to].name.charAt(0).toUpperCase()}
                    </span>
                  : <UserPlus size={17} />
                }
              </button>
              {showAssign && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowAssign(false)} />
                  <div className="absolute right-0 top-full mt-1.5 z-20 bg-card border rounded-2xl shadow-xl py-1.5 min-w-[200px] overflow-hidden">
                    <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest px-4 py-2">Asignar a</p>
                    <button
                      onClick={async () => { await assignConv.mutateAsync({ conversationId: conv.id, staffId: null }); setShowAssign(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/60 transition-colors"
                    >
                      <span className="w-7 h-7 rounded-full border-2 border-dashed border-border flex items-center justify-center text-muted-foreground">
                        <X size={11} />
                      </span>
                      <span className="text-sm text-muted-foreground flex-1 text-left">Sin asignar</span>
                      {!conv.assigned_to && <Check size={13} className="text-primary shrink-0" />}
                    </button>
                    {staffList.filter(s => s.status === "active").map(s => (
                      <button
                        key={s.id}
                        onClick={async () => { await assignConv.mutateAsync({ conversationId: conv.id, staffId: s.id }); setShowAssign(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/60 transition-colors"
                      >
                        <span className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ backgroundColor: "#1877F2" }}>
                          {s.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="text-sm flex-1 text-left truncate">{s.name}</span>
                        {conv.assigned_to === s.id && <Check size={13} className="text-primary shrink-0" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Delete */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(v => !v)}
              className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-colors ${showMenu ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
            >
              <MoreVertical size={17} />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1.5 z-20 bg-card border rounded-2xl shadow-xl py-1 min-w-[180px] overflow-hidden">
                  {onArchive && (
                    <button
                      onClick={() => { setShowMenu(false); onArchive(); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-secondary/60 transition-colors"
                    >
                      <Archive size={14} className="text-muted-foreground" />
                      {conv.is_archived ? "Desarchivar" : "Archivar"}
                    </button>
                  )}
                  {onArchive && onDelete && <div className="border-t mx-2" />}
                  {onDelete && (
                    <button
                      onClick={() => { setShowMenu(false); onDelete(); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 size={14} /> Eliminar chat
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
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

      {/* Banner de cita próxima — solo si el teléfono del chat coincide con el contacto */}
      {upcomingAppt && (
        <div className="mx-3 mt-2 mb-0 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-3 flex items-center gap-3 shrink-0">
          <Calendar size={18} className="text-blue-500 dark:text-blue-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-blue-800 dark:text-blue-200">
              {upcomingAppt.minutesAway < 60
                ? `En ${upcomingAppt.minutesAway} min tienes cita con ${upcomingAppt.contact.name}`
                : `En ${Math.floor(upcomingAppt.minutesAway / 60)}h tienes cita con ${upcomingAppt.contact.name}`}
            </p>
            <p className="text-[11px] text-blue-600 dark:text-blue-400">
              {upcomingAppt.appt.date} · {String(upcomingAppt.appt.hour).padStart(2, "0")}:{String(upcomingAppt.appt.minute ?? 0).padStart(2, "0")}
              {upcomingAppt.appt.service ? ` · ${upcomingAppt.appt.service}` : ""}
            </p>
          </div>
        </div>
      )}

      {/* Messages / Notes log */}
      {showNotesLog ? (
        <div className="flex-1 overflow-y-auto py-3 bg-amber-50/40 dark:bg-amber-950/10" style={{ overscrollBehavior: "contain" }}>
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/50 rounded-xl px-3 py-2">
              <StickyNote size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Notas internas</span>
              <span className="text-xs text-amber-600/60 dark:text-amber-500/60 ml-auto">{messages.filter(m => m.is_internal).length} nota(s)</span>
            </div>
          </div>
          {messages.filter(m => m.is_internal).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60%] gap-3 text-muted-foreground px-6">
              <StickyNote size={24} className="opacity-25" />
              <p className="text-sm text-center">Sin notas internas aún.<br />Las notas que escribas aparecerán aquí.</p>
            </div>
          ) : (
            messages.filter(m => m.is_internal).map(msg => (
              <div
                key={msg.id}
                onClick={() => { setNoteNavId(msg.id); setShowNotesLog(false); }}
                className="cursor-pointer hover:opacity-75 transition-opacity"
                title="Ver en la conversación"
              >
                <MessageBubble msg={msg} />
              </div>
            ))
          )}
          <div ref={bottomRef} className="h-2" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto py-3 bg-[#F0F2F5] dark:bg-zinc-900/50" style={{ overscrollBehavior: "contain" }}>
          {isLoading ? (
            <div className="flex justify-center pt-10"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground px-6">
              <div className="w-14 h-14 rounded-full bg-white dark:bg-zinc-800 border flex items-center justify-center shadow-sm">
                <MessageSquare size={22} className="opacity-30" />
              </div>
              <p className="text-sm text-center">Sin mensajes aún.<br />Cuando el contacto escriba, aparecerán aquí.</p>
            </div>
          ) : (
            messages.reduce<React.ReactNode[]>((acc, msg, i) => {
              const prevMsg = messages[i - 1];
              const showDate = !prevMsg || getDateLabel(msg.created_at) !== getDateLabel(prevMsg.created_at);
              if (showDate) {
                acc.push(
                  <div key={`date-${msg.id}`} className="flex justify-center my-3 px-4">
                    <span className="text-[11px] text-muted-foreground bg-white dark:bg-zinc-800 border border-border/40 px-3 py-1 rounded-full shadow-sm font-medium capitalize">
                      {getDateLabel(msg.created_at)}
                    </span>
                  </div>
                );
              }
              acc.push(<MessageBubble key={msg.id} msg={msg} highlight={msg.id === highlightMessageId || msg.id === noteNavId} />);
              return acc;
            }, [])
          )}

          <div ref={bottomRef} className="h-2" />
        </div>
      )}

      {/* Input */}
      <div className="px-3 pt-2 pb-4 lg:pb-3 border-t bg-card shrink-0" style={{ paddingBottom: "max(1.75rem, env(safe-area-inset-bottom))" }}>
        {windowError && (
          <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2 mb-2">
            <AlertTriangle size={13} className="shrink-0" /> Ventana de 24h expirada — no se pueden enviar mensajes de texto libre.
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleMediaUpload(f); e.target.value = ""; }}
        />
        {/* Quick Replies Popover (B19-9) */}
        {showQrPopover && qrSuggestions.length > 0 && (
          <div className="mb-1.5 bg-card border rounded-2xl shadow-xl overflow-hidden">
            {qrSuggestions.map((qr, i) => (
              <button
                key={qr.id}
                onMouseDown={e => { e.preventDefault(); applyQuickReply(qr.content); }}
                className={`w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors ${i === qrFocusIdx ? "bg-primary/10" : "hover:bg-secondary/60"}`}
              >
                <span className="text-xs font-mono font-semibold text-primary shrink-0 mt-0.5">/{qr.shortcut}</span>
                <span className="text-xs text-muted-foreground truncate">{qr.content}</span>
              </button>
            ))}
          </div>
        )}
        <div className={`rounded-2xl border transition-colors ${
          isInternalMode
            ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60 focus-within:border-amber-400 dark:focus-within:border-amber-600"
            : "bg-secondary/60 border-border/50 focus-within:border-primary/40 focus-within:bg-background"
        }`}>
          <div className="relative">
            <textarea
              value={text}
              onChange={e => {
                const val = e.target.value;
                setText(val);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                if (val === "/" || (val.startsWith("/") && !val.includes(" "))) {
                  const q = val.slice(1).toLowerCase();
                  const matches = allQuickReplies.filter(r =>
                    r.shortcut.toLowerCase().includes(q) || r.content.toLowerCase().includes(q)
                  );
                  setQrSuggestions(matches);
                  setShowQrPopover(matches.length > 0);
                  setQrFocusIdx(0);
                } else {
                  setShowQrPopover(false);
                }
              }}
              onKeyDown={e => {
                if (showQrPopover) {
                  if (e.key === "ArrowDown") { e.preventDefault(); setQrFocusIdx(i => Math.min(i + 1, qrSuggestions.length - 1)); return; }
                  if (e.key === "ArrowUp")   { e.preventDefault(); setQrFocusIdx(i => Math.max(i - 1, 0)); return; }
                  if (e.key === "Enter" || e.key === "Tab") {
                    e.preventDefault();
                    const sel = qrSuggestions[qrFocusIdx];
                    if (sel) applyQuickReply(sel.content);
                    return;
                  }
                  if (e.key === "Escape") { setShowQrPopover(false); return; }
                }
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              ref={textareaRef}
              placeholder=""
              rows={1}
              className="w-full bg-transparent px-4 pt-3 pb-1 text-sm resize-none outline-none leading-relaxed"
              style={{ maxHeight: 120, touchAction: "manipulation" }}
              disabled={sending || uploadingMedia || (conv.mode === "AI" && !isInternalMode)}
            />
            {!text && (
              <div className="absolute top-3 left-4 right-4 flex items-center gap-1.5 pointer-events-none select-none">
                {isInternalMode
                  ? <StickyNote size={13} className="text-amber-500/50 shrink-0" />
                  : conv.mode === "AI"
                    ? <Bot size={13} className="text-[#00a884]/50 shrink-0" />
                    : <Pencil size={13} className="text-blue-500/50 shrink-0" />
                }
                <span className="text-sm text-muted-foreground/55 truncate">
                  {isInternalMode ? "Nota interna — solo visible para el equipo..." : conv.mode === "AI" ? "Activa nota interna o toma el control..." : "Escribe un mensaje..."}
                </span>
              </div>
            )}
          </div>
          {/* Toolbar */}
          <div className="flex items-center justify-between px-2 pb-2 pt-0.5">
            <div className="flex items-center gap-0.5">
              {/* Mode switcher */}
              <button
                onClick={handleToggleMode}
                disabled={setMode.isPending}
                title={conv.mode === "AI" ? "Tomar control manual" : "Activar agente IA"}
                className={`inline-flex items-center gap-1 px-2 h-7 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                  conv.mode === "AI" ? "text-[#00a884] hover:bg-[#00a884]/10" : "text-blue-500 hover:bg-blue-500/10"
                }`}
              >
                {conv.mode === "AI" ? <Bot size={13} /> : <Pencil size={13} />}
                {conv.mode === "AI" ? "Modo IA" : "Humano"}
              </button>
              <div className="w-px h-3.5 bg-border/60 mx-1" />
              {/* Nota interna */}
              <button
                onClick={() => setIsInternalMode(v => !v)}
                className={`text-xs px-1.5 py-1 rounded transition-colors cursor-pointer ${
                  isInternalMode ? "text-amber-600 dark:text-amber-400 font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Nota interna
              </button>
              <div className="w-px h-3.5 bg-border/60 mx-1" />
              {/* Attach — oculto en modo AI */}
              {conv.mode !== "AI" && (
                <button
                  className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/8 cursor-pointer"
                  disabled={sending || uploadingMedia}
                  onClick={() => fileInputRef.current?.click()}
                  title="Adjuntar archivo"
                >
                  {uploadingMedia ? <Loader2 size={15} className="animate-spin" /> : <Paperclip size={15} />}
                </button>
              )}
              {/* Emoji Picker (B19-8) — modo HUMAN */}
              {conv.mode === "HUMAN" && (
                <div className="relative">
                  <button
                    onClick={() => setShowEmojiPicker(v => !v)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${showEmojiPicker ? "bg-black/5 dark:bg-white/8 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/8"}`}
                    title="Emojis"
                  >
                    <Smile size={15} />
                  </button>
                  {showEmojiPicker && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowEmojiPicker(false)} />
                      <div className="absolute left-0 bottom-full mb-1.5 z-20 drop-shadow-xl">
                        <Suspense fallback={<div className="w-72 h-48 bg-card border rounded-2xl flex items-center justify-center"><Loader2 size={18} className="animate-spin text-muted-foreground" /></div>}>
                          <EmojiPickerLazy
                            data={emojiDataPromise}
                            locale="es"
                            theme={document.documentElement.classList.contains("dark") ? "dark" : "light"}
                            previewPosition="none"
                            skinTonePosition="none"
                            onEmojiSelect={(e: { native: string }) => {
                              setText(t => t + e.native);
                              setShowEmojiPicker(false);
                            }}
                          />
                        </Suspense>
                      </div>
                    </>
                  )}
                </div>
              )}
              {/* Tags */}
              {allLabels.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowLabels(v => !v)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${showLabels ? "bg-black/5 dark:bg-white/8 text-foreground" : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/8 hover:text-foreground"}`}
                    title="Etiquetas"
                  >
                    <Tag size={15} />
                  </button>
                  {showLabels && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowLabels(false)} />
                      <div className="absolute left-0 bottom-full mb-1.5 z-20 bg-card border rounded-2xl shadow-xl py-1.5 min-w-[200px] overflow-hidden">
                        <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest px-4 py-2">Etiquetas</p>
                        {allLabels.map(l => {
                          const active = convLabels.some(cl => cl.id === l.id);
                          return (
                            <button key={l.id} onClick={() => toggleLabel.mutate({ conversationId: conv.id, labelId: l.id, active: !active })} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/60 transition-colors">
                              <Tag size={12} className="shrink-0" style={{ color: l.color }} />
                              <span className="text-sm flex-1 text-left">{l.name}</span>
                              {active && <Check size={13} className="text-primary shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
              {/* Respuestas rápidas (B19-9) — solo modo HUMAN */}
              {conv.mode === "HUMAN" && allQuickReplies.length > 0 && (
                <button
                  onClick={() => {
                    setText("/");
                    setQrSuggestions(allQuickReplies);
                    setShowQrPopover(true);
                    setQrFocusIdx(0);
                    requestAnimationFrame(() => textareaRef.current?.focus());
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/8 font-semibold text-sm"
                  title="Respuestas rápidas"
                >
                  /
                </button>
              )}
            </div>
            {/* Send */}
            <button
              onClick={handleSend}
              disabled={sending || uploadingMedia || !text.trim() || (conv.mode === "AI" && !isInternalMode)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-white transition-all shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: text.trim() && !(conv.mode === "AI" && !isInternalMode) ? (isInternalMode ? "#d97706" : "#1877F2") : undefined }}
              title={isInternalMode ? "Guardar nota interna" : "Enviar"}
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : isInternalMode ? <StickyNote size={17} /> : <Send size={18} />}
            </button>
          </div>
        </div>
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
  const { data: conversations = [] }         = useWaConversations(principalId);
  const { data: archivedConversations = [] } = useArchivedWaConversations(principalId);
  const { data: pendingSales = [] }          = useAiPendingSales();
  const updateSaleStatus                     = useUpdateSale();
  const deleteConv       = useDeleteWaConversation();
  const markRead         = useMarkConversationRead();
  const toggleFavorite   = useToggleFavorite();
  const archiveConv      = useArchiveConversation();
  const markUnread       = useMarkConversationUnread();
  const { data: labels = [] }        = useWaLabels(principalId);
  const { data: convLabelsMap = {} } = useAllConversationLabels(principalId);
  const { data: staffList = [] }     = useStaff();
  const { staffRecord }              = useStaffPermissions();
  const { data: appointments = [] }  = useAppointments();
  const { data: allContacts = [] }   = useContacts();
  const staffMap = useMemo(() => Object.fromEntries(staffList.map(s => [s.id, s])), [staffList]);

  // Map convId → próxima cita (próximas 24h, solo cuando el teléfono del chat coincide con el contacto)
  const normalizePhone = (p: string) => p.replace(/\D/g, "");
  const upcomingApptByConvId = useMemo<Map<string, UpcomingAppt>>(() => {
    const nowMs = Date.now();
    const in24h = nowMs + 24 * 60 * 60 * 1000;
    // phone normalizado → cita más próxima
    const phoneToAppt = new Map<string, { appt: CrmAppointment; contact: CrmContact }>();
    for (const appt of appointments) {
      if (appt.status !== "confirmed" || !appt.contact_id) continue;
      const [y, m, d] = appt.date.split("-").map(Number);
      const apptMs = new Date(y, m - 1, d, appt.hour, appt.minute ?? 0).getTime();
      if (apptMs < nowMs || apptMs > in24h) continue;
      const contact = allContacts.find(c => c.id === appt.contact_id);
      if (!contact?.phone) continue;
      const key = normalizePhone(contact.phone);
      if (!key) continue;
      const prev = phoneToAppt.get(key);
      if (!prev) {
        phoneToAppt.set(key, { appt, contact });
      } else {
        const [py, pm, pd] = prev.appt.date.split("-").map(Number);
        const prevMs = new Date(py, pm - 1, pd, prev.appt.hour, prev.appt.minute ?? 0).getTime();
        if (apptMs < prevMs) phoneToAppt.set(key, { appt, contact });
      }
    }
    const result = new Map<string, UpcomingAppt>();
    for (const conv of conversations) {
      const key = normalizePhone(conv.phone);
      const found = phoneToAppt.get(key);
      if (!found) continue;
      const [y, m, d] = found.appt.date.split("-").map(Number);
      const apptMs = new Date(y, m - 1, d, found.appt.hour, found.appt.minute ?? 0).getTime();
      result.set(conv.id, { ...found, minutesAway: Math.round((apptMs - nowMs) / 60000) });
    }
    return result;
  }, [appointments, allContacts, conversations]);

  const [selectedId, setSelectedId]           = useState<string | null>(() => localStorage.getItem("crm_agente_conv"));

  useEffect(() => {
    if (selectedId) localStorage.setItem("crm_agente_conv", selectedId);
    else localStorage.removeItem("crm_agente_conv");
  }, [selectedId]);
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(null);
  const [mobileShowChat, setMobileShowChat]   = useState(false);
  const [showSettings, setShowSettings]       = useState(false);
  const [search, setSearch]                   = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [labelFilter, setLabelFilter]         = useState<string | null>(null);
  const [assignFilter, setAssignFilter]       = useState<"all" | "mine" | "unassigned">("all");
  const [readFilter, setReadFilter]           = useState<"all" | "unread" | "favorites">("all");
  const [wizardDone, setWizardDone]           = useState(false);
  const [forceWizard, setForceWizard]         = useState(false);
  const [deleteModalId, setDeleteModalId]     = useState<string | null>(null);
  const [showArchived, setShowArchived]       = useState(false);
  const [convMenu, setConvMenu]               = useState<{ id: string; isArchived: boolean; top: number; right: number } | null>(null);

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
    () => conversations.find(c => c.id === selectedId)
      ?? archivedConversations.find(c => c.id === selectedId)
      ?? null,
    [conversations, archivedConversations, selectedId]
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
    const source = showArchived ? archivedConversations : conversations;
    let result = source.filter(c =>
      !search || (c.contact_name ?? c.phone).toLowerCase().includes(search.toLowerCase())
    );
    if (!showArchived) {
      if (labelFilter) {
        result = result.filter(c => (convLabelsMap[c.id] ?? []).some(l => l.id === labelFilter));
      }
      if (assignFilter === "unassigned") {
        result = result.filter(c => !c.assigned_to);
      } else if (assignFilter === "mine" && staffRecord) {
        result = result.filter(c => c.assigned_to === staffRecord.id);
      }
      if (readFilter === "unread") {
        result = result.filter(c => (c.unread_count ?? 0) > 0);
      } else if (readFilter === "favorites") {
        result = result.filter(c => c.is_favorite);
      }
      // Chats con pago pendiente al tope
      return [...result].sort((a, b) => {
        const ap = pendingSaleConvIds.has(a.id) ? 0 : 1;
        const bp = pendingSaleConvIds.has(b.id) ? 0 : 1;
        return ap - bp;
      });
    }
    return result;
  }, [showArchived, conversations, archivedConversations, search, labelFilter, convLabelsMap, assignFilter, readFilter, staffRecord, pendingSaleConvIds]);

  // Debounce para búsqueda de mensajes
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data: msgResults = [], isFetching: searchingMsgs } = useSearchWaMessages(debouncedSearch);

  // Auto-select first conversation (or restore saved one)
  useEffect(() => {
    if (conversations.length === 0) return;
    const exists = selectedId && conversations.some(c => c.id === selectedId);
    if (!exists) setSelectedId(conversations[0].id);
  }, [conversations]);

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
  // El wizard sale cuando is_active=true (setup completo) o wizardDone (recién completado).
  // No salimos solo por que exista la fila (el auto-upsert la crea vacía desde el inicio).
  const needsWizard = !isStaff && (forceWizard || (!config?.is_active && !wizardDone));
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

      <div className="flex flex-col h-full">

        {/* Top bar — oculto en mobile cuando el chat está abierto */}
        <div className={`px-4 sm:px-5 py-3 border-b flex items-center gap-3 shrink-0 bg-card ${mobileShowChat ? "hidden lg:flex" : "flex"}`}>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Agent avatar — WA profile photo or Bot icon fallback, with IA badge */}
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-xl overflow-hidden bg-[#1877F2] flex items-center justify-center text-white">
                {config?.profile_picture_url ? (
                  <img src={config.profile_picture_url} alt={config.agent_name ?? "Agente"} className="w-full h-full object-cover"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <Bot size={17} />
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 flex items-center gap-0.5 bg-[#00a884] rounded-full px-1 py-0.5 border border-background">
                <Bot size={7} className="text-white" />
                <span className="text-[7px] font-bold text-white leading-none">IA</span>
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{config?.agent_name ?? "Agente IA"}</p>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config?.is_active ? "bg-[#00a884] animate-pulse" : "bg-muted-foreground/40"}`} />
                <span className="text-[11px] text-muted-foreground">{config?.is_active ? "Conectado" : "Inactivo"}</span>
                {config?.verified_phone && (
                  <span className="text-[11px] text-muted-foreground truncate hidden sm:inline">· {config.verified_phone}</span>
                )}
              </div>
            </div>
          </div>
          {!isStaff && (
            <button onClick={() => setShowSettings(true)} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors" title="Configurar">
              <Settings size={18} />
            </button>
          )}
        </div>

        {/* Main layout */}
        <div className="flex flex-1 overflow-hidden">

          {/* Conversation list — full screen on mobile, sidebar on desktop */}
          <div className={`flex flex-col overflow-hidden border-r bg-card
            ${mobileShowChat ? "hidden lg:flex lg:w-72 lg:shrink-0" : "flex w-full lg:w-72 lg:shrink-0"}
          `}>
            {/* Header modo Archivadas */}
            {showArchived && (
              <div className="px-4 py-3 border-b flex items-center gap-2">
                <button
                  onClick={() => { setShowArchived(false); setSearch(""); }}
                  className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft size={16} /> Volver
                </button>
                <span className="flex-1 text-sm font-semibold text-center">Archivadas</span>
                <span className="text-[11px] text-muted-foreground">{archivedConversations.length}</span>
              </div>
            )}

            {/* Tabs: Unread / All / Assignment filter */}
            {!showArchived && <div className="px-4 pt-3 pb-0 border-b space-y-2.5">
              {/* Unread / All / Favorites tabs */}
              <div className="flex gap-0">
                {[
                  { id: "all", label: "Todos" },
                  { id: "unread", label: "Sin leer", count: conversations.filter(c => (c.unread_count ?? 0) > 0).length },
                  { id: "favorites", label: "Favoritos", icon: true },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setReadFilter(tab.id as "all" | "unread" | "favorites")}
                    className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                      readFilter === tab.id
                        ? "border-[#1877F2] text-[#1877F2]"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.icon && <Star size={12} fill={readFilter === tab.id ? "currentColor" : "none"} />}
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-[#1877F2] text-[10px] font-bold text-white">
                        {tab.count > 99 ? "99+" : tab.count}
                      </span>
                    )}
                  </button>
                ))}
                {staffList.length > 0 && staffRecord && (
                  <button
                    onClick={() => setAssignFilter(f => f === "mine" ? "all" : "mine")}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ml-auto ${
                      assignFilter === "mine"
                        ? "border-[#1877F2] text-[#1877F2]"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Mías
                  </button>
                )}
                {staffList.length > 0 && !staffRecord && (
                  <button
                    onClick={() => setAssignFilter(f => f === "unassigned" ? "all" : "unassigned")}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ml-auto ${
                      assignFilter === "unassigned"
                        ? "border-[#1877F2] text-[#1877F2]"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Sin asignar
                  </button>
                )}
              </div>

              {/* Search */}
              <div className="relative pb-2.5">
                <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground pointer-events-none" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar conversaciones..."
                  className="h-9 text-sm pl-8 bg-secondary/60 border-transparent focus:border-input rounded-xl"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground">
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Label pills */}
              {search.length < 3 && labels.length > 0 && (
                <div className="flex gap-1.5 flex-wrap pb-2">
                  {labels.map(l => (
                    <button
                      key={l.id}
                      onClick={() => setLabelFilter(f => f === l.id ? null : l.id)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
                      style={labelFilter === l.id
                        ? { backgroundColor: l.color, color: "#fff" }
                        : { backgroundColor: `${l.color}18`, color: l.color, border: `1px solid ${l.color}30` }
                      }
                    >
                      <Tag size={10} className="shrink-0" style={{ color: labelFilter === l.id ? "#fff" : l.color }} />
                      {l.name}
                    </button>
                  ))}
                </div>
              )}
            </div>}

            {/* Search bar en modo archivadas */}
            {showArchived && (
              <div className="px-4 py-2 border-b">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground pointer-events-none" />
                  <Input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar archivadas..."
                    className="h-9 text-sm pl-8 bg-secondary/60 border-transparent focus:border-input rounded-xl"
                  />
                  {search && (
                    <button onClick={() => setSearch("")} className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground">
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {(showArchived || search.length < 3) ? (
                /* ── Lista normal ── */
                filteredConvs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground px-6 text-center">
                    {readFilter === "unread" ? (
                      <>
                        <CheckCheck size={24} className="opacity-30" />
                        <p className="text-xs font-medium">Todo leído</p>
                        <p className="text-xs opacity-70">No hay conversaciones sin leer.</p>
                      </>
                    ) : readFilter === "favorites" ? (
                      <>
                        <Star size={24} className="opacity-30" />
                        <p className="text-xs font-medium">Sin favoritos</p>
                        <p className="text-xs opacity-70">Marca conversaciones con ⭐ para encontrarlas rápido.</p>
                      </>
                    ) : showArchived ? (
                      <>
                        <Archive size={24} className="opacity-30" />
                        <p className="text-xs font-medium">Sin archivadas</p>
                        <p className="text-xs opacity-70">Las conversaciones que archives aparecerán aquí.</p>
                      </>
                    ) : (
                      <>
                        <MessageSquare size={24} className="opacity-30" />
                        <p className="text-xs">Sin conversaciones aún. Cuando alguien te escriba por WhatsApp, aparecerá aquí.</p>
                      </>
                    )}
                  </div>
                ) : (
                  filteredConvs.map(conv => {
                    const hasPendingPayment = pendingSaleConvIds.has(conv.id);
                    const pendingSale = hasPendingPayment ? pendingSaleByConvId[conv.id] : null;
                    const unread = conv.unread_count ?? 0;
                    const isUnread = unread > 0 && selectedId !== conv.id;
                    const isSelected = selectedId === conv.id;
                    const convName = conv.contact_name ?? `+${conv.phone}`;
                    const convAvatarBg = getAvatarColor(convName);
                    return (
                    <button
                      key={conv.id}
                      onClick={() => { setSelectedId(conv.id); setMobileShowChat(true); setHighlightMessageId(null); if (unread > 0) markRead.mutate(conv.id); }}
                      className={`group/convitem w-full text-left px-4 py-3 border-b transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-[#1877F2]/8 dark:bg-[#1877F2]/10 border-l-2 border-l-[#1877F2]"
                          : isUnread
                            ? "bg-primary/5 hover:bg-primary/8"
                            : hasPendingPayment
                              ? "bg-amber-50 dark:bg-amber-900/10 hover:bg-amber-100/80 dark:hover:bg-amber-900/20"
                              : "hover:bg-secondary/60"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-h-[52px]">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          {hasPendingPayment ? (
                            <div className="w-11 h-11 rounded-full bg-amber-100 dark:bg-amber-800/40 flex items-center justify-center">
                              <CreditCard size={18} className="text-amber-600 dark:text-amber-400" />
                            </div>
                          ) : (
                            <div className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center text-white font-semibold text-base relative"
                              style={{ backgroundColor: convAvatarBg }}>
                              <span>{convName[0].toUpperCase()}</span>
                              {conv.contact_profile_pic && (
                                <img
                                  src={conv.contact_profile_pic}
                                  alt={convName}
                                  className="absolute inset-0 w-full h-full object-cover"
                                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                                />
                              )}
                            </div>
                          )}
                          {/* Mode dot */}
                          <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${
                            conv.mode === "AI" ? "bg-[#00a884]" : "bg-blue-500"
                          }`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-sm truncate ${isUnread ? "font-bold text-foreground" : "font-medium text-foreground"}`}>
                              {convName}
                            </p>
                            <span className={`text-[11px] shrink-0 ${isUnread ? "text-[#1877F2] font-semibold" : "text-muted-foreground"}`}>
                              {formatTime(conv.last_message_at)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-0.5">
                            <p className={`text-[12px] truncate flex-1 ${isUnread ? "text-foreground/80 font-medium" : "text-muted-foreground"}`}>
                              {hasPendingPayment
                                ? `💳 ${pendingSale?.product_name ?? pendingSale?.service_name ?? "Pago pendiente"} · ${formatSaleAmount(Number(pendingSale?.amount), pendingSale?.currency ?? null)}`
                                : conv.contact_name ? `+${conv.phone}` : formatTime(conv.last_message_at)
                              }
                            </p>
                            {isUnread && (
                              <span className="shrink-0 min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-[#1877F2] text-[11px] font-bold text-white">
                                {unread > 99 ? "99+" : unread}
                              </span>
                            )}
                          </div>
                          {/* Labels */}
                          {(convLabelsMap[conv.id] ?? []).length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              {(convLabelsMap[conv.id] ?? []).slice(0, 5).map(l => (
                                <Tag key={l.id} size={10} className="shrink-0" style={{ color: l.color }} title={l.name} />
                              ))}
                              {(convLabelsMap[conv.id] ?? []).length > 5 && (
                                <span className="text-[9px] text-muted-foreground">+{(convLabelsMap[conv.id] ?? []).length - 5}</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Assigned staff avatar */}
                        {conv.assigned_to && staffMap[conv.assigned_to] && (
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0" style={{ backgroundColor: "#1877F2" }} title={staffMap[conv.assigned_to].name}>
                            {staffMap[conv.assigned_to].name.charAt(0).toUpperCase()}
                          </span>
                        )}

                        {/* Quick-actions ⋮ — always visible on mobile, hover-only on desktop */}
                        <div
                          role="button"
                          tabIndex={0}
                          title="Acciones"
                          onClick={e => {
                            e.stopPropagation();
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            setConvMenu({ id: conv.id, isArchived: !!conv.is_archived, top: rect.bottom + 4, right: window.innerWidth - rect.right });
                          }}
                          onKeyDown={e => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.stopPropagation();
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              setConvMenu({ id: conv.id, isArchived: !!conv.is_archived, top: rect.bottom + 4, right: window.innerWidth - rect.right });
                            }
                          }}
                          className="cursor-pointer shrink-0 w-9 h-9 flex items-center justify-center rounded-xl transition-colors text-muted-foreground/50 hover:text-muted-foreground hover:bg-secondary/70 lg:opacity-0 lg:group-hover/convitem:opacity-100"
                        >
                          <MoreVertical size={15} />
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

            {/* Ver archivadas / botón al fondo */}
            {!showArchived && (
              <button
                onClick={() => { setShowArchived(true); setSelectedId(null); setMobileShowChat(false); setSearch(""); }}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors border-t shrink-0"
              >
                <Archive size={12} />
                Archivadas
                {archivedConversations.length > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-secondary text-[10px] font-bold">
                    {archivedConversations.length}
                  </span>
                )}
              </button>
            )}
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
                onToggleFavorite={() => toggleFavorite.mutate({ id: selectedConv.id, value: !selectedConv.is_favorite })}
                onArchive={isStaff ? undefined : () => {
                  archiveConv.mutate({ id: selectedConv.id, value: !selectedConv.is_archived });
                  setSelectedId(null);
                  setMobileShowChat(false);
                }}
                staffList={staffList}
                staffMap={staffMap}
                highlightMessageId={highlightMessageId}
                onHighlightClear={() => setHighlightMessageId(null)}
                pendingSale={pendingSaleByConvId[selectedConv.id] ?? null}
                onSaleConfirmed={() => {/* react-query auto-refetches */}}
                upcomingAppt={upcomingApptByConvId.get(selectedConv.id) ?? null}
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

      {/* Dropdown de acciones por conversación — position:fixed para escapar overflow-y:auto */}
      {convMenu && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setConvMenu(null)} />
          <div
            className="fixed z-40 bg-card border rounded-2xl shadow-xl py-1 min-w-[180px] overflow-hidden"
            style={{ top: convMenu.top, right: convMenu.right }}
          >
            <button
              onClick={() => {
                markUnread.mutate(convMenu.id);
                if (convMenu.id === selectedId) { setSelectedId(null); setMobileShowChat(false); }
                setConvMenu(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-secondary/60 transition-colors"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#1877F2] shrink-0" />
              Marcar como no leído
            </button>
            <button
              onClick={() => {
                archiveConv.mutate({ id: convMenu.id, value: !convMenu.isArchived });
                if (convMenu.id === selectedId) { setSelectedId(null); setMobileShowChat(false); }
                setConvMenu(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-secondary/60 transition-colors"
            >
              <Archive size={14} className="text-muted-foreground" />
              {convMenu.isArchived ? "Desarchivar" : "Archivar"}
            </button>
          </div>
        </>
      )}
    </>
  );
};

export default CrmAgentIA;
