import { useState, useEffect, useRef, useMemo, lazy, Suspense } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bot, Settings, Send, Wifi, WifiOff, MessageSquare, Loader2,
  CheckCircle2, AlertTriangle, Copy, Trash2, X, Eye, EyeOff,
  Check, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, MoreVertical, Zap, Clock, Calendar, Phone, Sparkles, Lock,
  User, Upload, Bell, Tag, Plus, Pencil, UserPlus, Search, Paperclip, CreditCard, BadgeCheck, XCircle, CheckCheck,
  GitBranch, ArrowLeft, Megaphone, Smile, StickyNote, Star, Archive, LayoutGrid, ExternalLink, Reply,
  Image as ImageIcon, FileVideo, Music2, Globe,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePushSubscriptionStatus, useSubscribeToPush, isPushSupported } from "@/hooks/usePushNotifications";
import {
  useAIAgentConfig, useUpsertAIAgentConfig,
  useWaConversations, useWaLastMessages, useWaMessages,
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
import { FLOW_COUNTRY_OPTIONS, FLOW_COUNTRY_BY_CODE } from "@/lib/countries";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";
import CrmWaTemplates from "@/components/crm/CrmWaTemplates";
import CrmWaCampaigns from "@/components/crm/CrmWaCampaigns";
import { supabase } from "@/lib/supabase";
import type { WaLastMessage, CrmWaFlowCountrySequence, CrmWaConversation, CrmWaMessage, CrmStaff, CrmSale, CrmAppointment, CrmContact, CrmWaSequence, SequenceStep, SequenceStepOption, SequenceStepMedia, CrmWaFlow, CrmWaFlowFinalAction, CrmQuickReply } from "@/lib/supabase";
import { useCurrentUser, useStaffPermissions } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatAmount } from "@/lib/currencies";
// ─── Emoji Picker inline (B19-8) ─────────────────────────────────────────────
// ─── Emoji Picker (B19-8) — carga dinámica para evitar crash del bundle ───────
const EmojiPickerLazy = lazy(() => import("@emoji-mart/react"));
const emojiDataPromise = () => import("@emoji-mart/data").then(m => m.default ?? m);

// ─── Constants ────────────────────────────────────────────────────────────────
const WEBHOOK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`;

// Meta solo acepta imágenes JPG/PNG de hasta 8 bit/canal (WebP estático).
// Capturas de iPhone en 16-bit/Display P3, CMYK o GIF animado llegan a
// "send-wa-message" y Meta las rechaza async (error 131053) sin que se note
// en el momento del envío. Redibujar en un canvas fuerza 8-bit sRGB estático.
async function normalizeImageForWhatsApp(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
    const quality = outputType === "image/jpeg" ? 0.92 : undefined;
    const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, outputType, quality));
    if (!blob) return file;
    const ext = outputType === "image/png" ? "png" : "jpg";
    const baseName = file.name.replace(/\.[^./]+$/, "");
    return new File([blob], `${baseName}.${ext}`, { type: outputType });
  } catch {
    return file;
  }
}

const PROMPT_VARIABLES = [
  { label: "{{negocio.nombre}}", desc: "Nombre del negocio" },
  { label: "{{negocio.servicios}}", desc: "Lista de servicios y precios" },
  { label: "{{negocio.descripcion}}", desc: "Descripción del negocio" },
  { label: "{{contacto.nombre}}", desc: "Nombre del contacto" },
  { label: "{{fecha.hoy}}", desc: "Fecha actual" },
];

const AGENT_PERSONALITIES = [
  "Profesional y formal", "Amigable y cercano",
];

// Objetivos fijos por defecto para todos los usuarios SaaS (ya no configurables):
// si hay un calendario vinculado en Capacidades, el objetivo principal pasa a ser agendar citas.
function computeAgentObjectives(hasCalendar: boolean): string[] {
  return hasCalendar
    ? ["Agendar citas", "Vender productos", "Responder dudas"]
    : ["Vender productos", "Responder dudas"];
}

const RESPONSE_LENGTHS = [
  { val: "short", label: "Cortas" },
  { val: "normal", label: "Normales" },
  { val: "detailed", label: "Detalladas" },
] as const;

const EMOJI_LEVELS = [
  { val: "none", label: "Ninguno" },
  { val: "poco", label: "Poco" },
  { val: "medio", label: "Medio" },
  { val: "mucho", label: "Mucho" },
] as const;

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
  const { permission: pushPermission, hasSubscription: pushHasSubscription, checked: pushChecked } = usePushSubscriptionStatus();
  const subscribePush = useSubscribeToPush();
  const { data: allProducts = [] } = useProducts();
  const { data: allServices = [] } = useServices();
  const { data: catalogs = [] } = useCatalogs();
  const { data: catalogProductsMap = new Map() } = useCatalogProductsMap();
  const { data: calendars = [] } = useCalendars();
  const { data: allCourses = [] } = useCourses();

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
  const [agentPersonality, setAgentPersonality]   = useState(existingConfig?.agent_personality ?? "");
  const [responseLengthWiz, setResponseLengthWiz] = useState(existingConfig?.response_length ?? "normal");
  const [emojiLevelWiz, setEmojiLevelWiz]         = useState(existingConfig?.emoji_level ?? "poco");

  // Step 3 — Capacidades
  const [schedulingCalendarIdWiz, setSchedulingCalendarIdWiz] = useState<string>(existingConfig?.scheduling_calendar_id ?? "");
  const [canServices, setCanServices]         = useState(existingConfig?.can_answer_services ?? true);
  const [canTransfer, setCanTransfer]         = useState(existingConfig?.can_transfer_human ?? false);
  const [autoDetectPayments, setAutoDetectPayments] = useState(existingConfig?.auto_detect_payments ?? false);
  // Catálogo IA
  const [physicalProductsModeWiz, setPhysicalProductsModeWiz] = useState<"all"|"selected"|"none">(existingConfig?.physical_products_mode ?? "none");
  const [digitalProductsModeWiz, setDigitalProductsModeWiz]   = useState<"all"|"selected"|"none">(existingConfig?.digital_products_mode ?? "none");
  const [selectedProductIds, setSelectedProductIds]   = useState<string[]>(existingConfig?.selected_product_ids ?? []);
  const [servicesMode, setServicesMode]               = useState<"all"|"selected"|"none">(existingConfig?.services_mode ?? "none");
  const [selectedServiceIds, setSelectedServiceIds]   = useState<string[]>(existingConfig?.selected_service_ids ?? []);
  const [coursesMode, setCoursesMode]                 = useState<"all"|"selected"|"none">(existingConfig?.courses_mode ?? "none");
  const [selectedCourseIds, setSelectedCourseIds]     = useState<string[]>(existingConfig?.selected_course_ids ?? []);

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
      await upsert.mutateAsync({
        verified_phone: json.display_phone_number ?? null,
        verified_business_name: json.verified_name ?? null,
      }).catch(() => {});

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

    // Cargar perfil actual de Meta al avanzar al paso de Perfil WA (siguiente paso)
    fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/whatsapp_business_profile?fields=about,profile_picture_url`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then(r => r.json()).then(d => {
      if (d.data?.[0]) {
        setBio(d.data[0].about ?? "");
        // Solo cargar foto de Meta si no hay URL guardado en DB (Supabase Storage es fuente de verdad)
        if (!profilePicUrl) setProfilePicUrl(d.data[0].profile_picture_url ?? null);
      }
    }).catch(() => {});

    setStep(2);
  };

  const handleSaveStep3 = async () => {
    await upsert.mutateAsync({
      can_book_appointments: !!schedulingCalendarIdWiz,
      scheduling_calendar_id: schedulingCalendarIdWiz || null,
      can_create_contacts: true,
      can_answer_services: canServices,
      can_transfer_human: canTransfer,
      auto_detect_payments: autoDetectPayments,
      physical_products_mode: physicalProductsModeWiz,
      digital_products_mode: digitalProductsModeWiz,
      selected_product_ids: (physicalProductsModeWiz === "selected" || digitalProductsModeWiz === "selected") ? selectedProductIds : [],
      services_mode: servicesMode,
      selected_service_ids: servicesMode === "selected" ? selectedServiceIds : [],
      courses_mode: coursesMode,
      selected_course_ids: coursesMode === "selected" ? selectedCourseIds : [],
      model: "claude-haiku-4-5-20251001",
      system_prompt: systemPrompt || null,
      agent_objectives: computeAgentObjectives(!!schedulingCalendarIdWiz),
      agent_personality: agentPersonality || null,
      agent_proactivity: "proactivo",
      response_length: responseLengthWiz as "short" | "normal" | "detailed",
      emoji_level: emojiLevelWiz as "none" | "poco" | "medio" | "mucho",
      use_business_faq: true,
    });
    setStep(4);
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
    await upsert.mutateAsync({ agent_name: agentName.trim() || "Asistente" }).catch(() => {});
    if (!phoneNumberId || !accessToken || !bio.trim()) { setStep(3); return; }
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
    finally { setSavingBio(false); setStep(3); }
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

  const STEP_LABELS = ["Conexión", "Perfil WA", "Agente IA", "Activar"];

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
          <p className="text-sm text-muted-foreground">{STEP_LABELS[step - 1]} — Paso {step} de {STEP_LABELS.length}</p>
        </div>

        <StepIndicator current={step} total={STEP_LABELS.length} />

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
                <Input value={phoneNumberId} onChange={e => setPhoneNumberIdSafe(e.target.value)} placeholder="123456789012345" className="h-9 text-base md:text-sm font-mono" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Access Token (System User) <span className="text-destructive">*</span></label>
                <div className="relative">
                  <Input type={showToken ? "text" : "password"} value={accessToken} onChange={e => setAccessTokenSafe(e.target.value)} placeholder="EAAG..." className="h-9 text-base md:text-sm font-mono pr-9" />
                  <button onClick={() => setShowToken(!showToken)} className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground">{showToken ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                </div>
                <p className="text-[10px] text-muted-foreground">Usa un System User Token permanente, no el token de prueba de 24h.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">WABA ID</label>
                <Input value={wabaId} onChange={e => setWabaId(e.target.value)} placeholder="WhatsApp Business Account ID" className="h-9 text-base md:text-sm font-mono" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">App Secret <span className="text-destructive">*</span></label>
                <div className="relative">
                  <Input type={showSecret ? "text" : "password"} value={appSecret} onChange={e => setAppSecret(e.target.value)} placeholder="App Dashboard → Settings → Basic" className="h-9 text-base md:text-sm font-mono pr-9" />
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

        {/* ── Step 4: Agente IA ── */}
        {/* ── Step 3: Agente IA (Personalidad + Capacidades) ── */}
        {step === 3 && (
          <div className="bg-card border rounded-2xl p-6 space-y-6">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2"><Sparkles size={14} />Agente IA</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Define la personalidad, el estilo y lo que puede hacer tu asistente.</p>
            </div>

            {/* Sección: Personalidad */}
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-bold text-primary uppercase tracking-wider">Personalidad</p>
              <div className="flex-1 h-px bg-border" />
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

            {/* Longitud de respuestas */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Longitud de respuestas</label>
              <div className="grid grid-cols-1 gap-1.5">
                {RESPONSE_LENGTHS.map(r => (
                  <button key={r.val} onClick={() => setResponseLengthWiz(r.val)}
                    className={`text-left text-xs px-3 py-2 rounded-lg border transition-colors ${responseLengthWiz === r.val ? "bg-primary/10 border-primary text-primary font-medium" : "border-border hover:border-primary/40"}`}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Emojis */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Uso de emojis</label>
              <div className="grid grid-cols-1 gap-1.5">
                {EMOJI_LEVELS.map(e => (
                  <button key={e.val} onClick={() => setEmojiLevelWiz(e.val)}
                    className={`text-left text-xs px-3 py-2 rounded-lg border transition-colors ${emojiLevelWiz === e.val ? "bg-primary/10 border-primary text-primary font-medium" : "border-border hover:border-primary/40"}`}>
                    {e.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sección: Capacidades */}
            <div className="flex items-center gap-2 pt-2">
              <p className="text-[11px] font-bold text-primary uppercase tracking-wider">Capacidades</p>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="divide-y">
              {/* Agendar citas — solo si hay al menos un calendario creado */}
              {calendars.length > 0 && (
                <div className="py-3 space-y-2">
                  <div>
                    <p className="text-sm font-medium">Agendar citas</p>
                    <p className="text-xs text-muted-foreground">Detecta intención de agendar y crea citas en el calendario</p>
                  </div>
                  <select
                    value={schedulingCalendarIdWiz}
                    onChange={e => setSchedulingCalendarIdWiz(e.target.value)}
                    className="w-full text-base md:text-xs h-8 rounded-lg border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Ningún Calendario Seleccionado</option>
                    {calendars.map(cal => (
                      <option key={cal.id} value={cal.id}>{cal.name ?? cal.slug ?? cal.id}</option>
                    ))}
                  </select>
                </div>
              )}
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
                {canTransfer && pushChecked && isPushSupported() && pushPermission !== "denied" && !pushHasSubscription && (
                  <div className="mt-3 pl-3 border-l-2 border-primary/20">
                    <p className="text-xs text-muted-foreground mb-2">Activa las notificaciones para saber cuando se transfiere un chat</p>
                    <button
                      onClick={() => subscribePush.mutate(undefined, {
                        onError: err => toast.error(err instanceof Error ? err.message : "No se pudo activar las notificaciones"),
                        onSuccess: () => toast.success("¡Notificaciones activadas!"),
                      })}
                      disabled={subscribePush.isPending}
                      className="h-8 px-3 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5 disabled:opacity-60"
                    >
                      {subscribePush.isPending ? <Loader2 size={12} className="animate-spin" /> : <Bell size={12} />}
                      Activar Notificaciones
                    </button>
                  </div>
                )}
              </div>
              {/* Registrar Ventas Automáticas */}
              <div className="py-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Registrar Ventas Automáticas</p>
                    <p className="text-xs text-muted-foreground">La IA analiza comprobantes de pago enviados por WhatsApp y registra ventas automáticamente. Si lo desactivas, el comprobante detectado queda pendiente de tu confirmación manual en el CRM.</p>
                  </div>
                  <button onClick={() => setAutoDetectPayments(v => !v)} className="relative shrink-0 rounded-full" style={{ width: 40, height: 22 }}>
                    <span className={`absolute inset-0 rounded-full transition-colors ${autoDetectPayments ? "bg-primary" : "bg-secondary border"}`} />
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${autoDetectPayments ? "left-[22px]" : "left-0.5"}`} />
                  </button>
                </div>
                {pushChecked && isPushSupported() && pushPermission !== "denied" && !pushHasSubscription && (
                  <div className="mt-3 pl-3 border-l-2 border-primary/20">
                    <p className="text-xs text-muted-foreground mb-2">Activa las notificaciones para saber cuando se registra una venta o hay un pago pendiente</p>
                    <button
                      onClick={() => subscribePush.mutate(undefined, {
                        onError: err => toast.error(err instanceof Error ? err.message : "No se pudo activar las notificaciones"),
                        onSuccess: () => toast.success("¡Notificaciones activadas!"),
                      })}
                      disabled={subscribePush.isPending}
                      className="h-8 px-3 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5 disabled:opacity-60"
                    >
                      {subscribePush.isPending ? <Loader2 size={12} className="animate-spin" /> : <Bell size={12} />}
                      Activar Notificaciones
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* El agente podrá vender: */}
            <div className="border rounded-xl p-4 space-y-4 bg-secondary/20 mt-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">El agente podrá vender:</p>

              {/* Servicios */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Servicios</p>
                <div className="flex gap-3">
                  {(["none", "selected", "all"] as const).map(mode => (
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

              {/* Productos Físicos */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Productos Físicos</p>
                <div className="flex gap-3">
                  {(["none", "selected", "all"] as const).map(mode => (
                    <label key={mode} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="wiz-physical-products-mode" checked={physicalProductsModeWiz === mode} onChange={() => setPhysicalProductsModeWiz(mode)} className="accent-primary" />
                      <span className="text-sm">{mode === "all" ? "Todos" : mode === "selected" ? "Solo seleccionados" : "Ninguno"}</span>
                    </label>
                  ))}
                </div>
                {physicalProductsModeWiz === "selected" && (
                  <div className="mt-1 border rounded-lg divide-y bg-background max-h-52 overflow-y-auto">
                    {catalogs.map(cat => {
                      const catProductIds = catalogProductsMap.get(cat.id) ?? [];
                      const catProducts = allProducts.filter(p => catProductIds.includes(p.id) && p.product_kind === "fisico");
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
                            <div key={p.id} className="flex items-center gap-2 px-3 py-2 pl-8 hover:bg-secondary/40 transition-colors">
                              <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                                <input type="checkbox" checked={selectedProductIds.includes(p.id)}
                                  onChange={e => setSelectedProductIds(prev => e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id))}
                                  className="accent-primary shrink-0" />
                                <span className="text-sm truncate">{p.name}{!p.is_active && <span className="ml-1.5 text-[10px] text-muted-foreground/60">(privado)</span>}</span>
                              </label>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                    {/* Productos físicos sin catálogo */}
                    {(() => {
                      const allCatProductIds = new Set(Array.from(catalogProductsMap.values()).flat());
                      const orphans = allProducts.filter(p => !allCatProductIds.has(p.id) && p.product_kind === "fisico");
                      if (orphans.length === 0) return null;
                      return (
                        <div>
                          <div className="px-3 py-2 bg-secondary/30">
                            <span className="text-xs font-semibold text-muted-foreground">Sin catálogo</span>
                          </div>
                          {orphans.map(p => (
                            <div key={p.id} className="flex items-center gap-2 px-3 py-2 pl-8 hover:bg-secondary/40 transition-colors">
                              <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                                <input type="checkbox" checked={selectedProductIds.includes(p.id)}
                                  onChange={e => setSelectedProductIds(prev => e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id))}
                                  className="accent-primary shrink-0" />
                                <span className="text-sm truncate">{p.name}{!p.is_active && <span className="ml-1.5 text-[10px] text-muted-foreground/60">(privado)</span>}</span>
                              </label>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                    {allProducts.filter(p => p.product_kind === "fisico").length === 0 && (
                      <p className="px-3 py-2 text-xs text-muted-foreground">No hay productos físicos</p>
                    )}
                  </div>
                )}
              </div>

              {/* Productos Digitales */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Productos Digitales</p>
                <div className="flex gap-3">
                  {(["none", "selected", "all"] as const).map(mode => (
                    <label key={mode} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="wiz-digital-products-mode" checked={digitalProductsModeWiz === mode} onChange={() => setDigitalProductsModeWiz(mode)} className="accent-primary" />
                      <span className="text-sm">{mode === "all" ? "Todos" : mode === "selected" ? "Solo seleccionados" : "Ninguno"}</span>
                    </label>
                  ))}
                </div>
                {digitalProductsModeWiz === "selected" && (
                  <div className="mt-1 border rounded-lg divide-y bg-background max-h-52 overflow-y-auto">
                    {allProducts.filter(p => p.product_kind === "archivo").length === 0
                      ? <p className="px-3 py-2 text-xs text-muted-foreground">No hay productos digitales</p>
                      : allProducts.filter(p => p.product_kind === "archivo").map(p => (
                          <div key={p.id} className="flex items-center gap-2 px-3 py-2 hover:bg-secondary/40 transition-colors">
                            <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                              <input type="checkbox" checked={selectedProductIds.includes(p.id)}
                                onChange={e => setSelectedProductIds(prev => e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id))}
                                className="accent-primary shrink-0" />
                              <span className="text-sm truncate">{p.name}{!p.is_active && <span className="ml-1.5 text-[10px] text-muted-foreground/60">(privado)</span>}</span>
                            </label>
                          </div>
                        ))
                    }
                  </div>
                )}
              </div>

              {/* Cursos */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Cursos</p>
                <div className="flex gap-3">
                  {(["none", "selected", "all"] as const).map(mode => (
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

            {/* Prompt adicional libre */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Prompt - Instrucciones Adicionales <span className="text-[10px] text-muted-foreground">(opcional — se añaden al final)</span></label>
              <Textarea ref={promptRef} value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} rows={4}
                className="text-base md:text-xs font-mono resize-none leading-relaxed" placeholder="Restricciones específicas, información extra, casos especiales..." />
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

        {/* ── Step 2: Perfil WA ── */}
        {step === 2 && (
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

            {/* Nombre del Negocio + Nombre del Agente */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  Nombre del Negocio <Lock size={10} />
                </label>
                <p className="text-sm text-muted-foreground/70 truncate py-1.5">
                  {existingConfig?.verified_business_name || <span className="italic text-muted-foreground/50">Sin verificar</span>}
                </p>
                <a
                  href="https://business.facebook.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5"
                >
                  Cambia el nombre desde Meta <ExternalLink size={10} />
                </a>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Nombre del Agente</label>
                <Input value={agentName} onChange={e => setAgentName(e.target.value)} placeholder="Sofi, Asistente..." className="h-9 text-base md:text-sm" />
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Bio / Descripción</label>
              <Textarea
                value={bio}
                onChange={e => setBio(e.target.value.slice(0, 139))}
                rows={3}
                className="text-base md:text-sm resize-none"
                placeholder="Ej: Servicio de atención al cliente 24/7"
              />
              <span className={`text-[10px] ${bio.length >= 130 ? "text-amber-500" : "text-muted-foreground"}`}>
                {bio.length}/139
              </span>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="h-9 text-xs shrink-0">Atrás</Button>
              <Button variant="outline" onClick={() => { upsert.mutateAsync({ agent_name: agentName.trim() || "Asistente" }).catch(() => {}); setStep(3); }} className="h-9 text-xs shrink-0">Omitir</Button>
              <Button onClick={handleSaveStep6Bio} disabled={savingBio} className="flex-1 h-9 gap-1.5">
                {savingBio ? <Loader2 size={13} className="animate-spin" /> : <ChevronRight size={14} />}
                Guardar y continuar
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 4: Resumen + Activar ── */}
        {step === 4 && (
          <div className="bg-card border rounded-2xl p-6 space-y-6">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2"><CheckCircle2 size={14} />Todo listo para activar</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Revisa la configuración y activa tu asistente.</p>
            </div>

            {/* Resumen */}
            <div className="space-y-3">
              {[
                { label: "Nombre del Negocio en Meta", value: existingConfig?.verified_business_name || testResult?.name || "—" },
                { label: "Número de WhatsApp", value: testResult?.phone ?? existingConfig?.phone_number_id ?? "—" },
                { label: "Nombre del asistente", value: agentName },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between gap-4 py-2 border-b last:border-0">
                  <span className="text-xs text-muted-foreground shrink-0">{label}</span>
                  <span className="text-xs font-medium text-right">{value}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(3)} className="h-9 text-xs shrink-0">Atrás</Button>
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

type DraftSequence = { id?: string; name: string; steps: SequenceStep[]; status?: "draft" | "published" };

// Abre una secuencia guardada para editarla: se edita SIEMPRE el borrador si existe (draft_steps),
// que es el trabajo autoguardado más reciente; `steps` es la versión publicada que sigue corriendo
// en las conversaciones reales mientras tanto.
function toDraftSequence(seq: CrmWaSequence): DraftSequence {
  return { id: seq.id, name: seq.name, steps: seq.draft_steps ?? seq.steps, status: seq.status };
}

const BRANCH_COLORS = [
  { bar: "bg-emerald-400", pill: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", border: "border-emerald-400/30", bg: "bg-emerald-500/5", text: "text-emerald-600 dark:text-emerald-400", hex: "#34d399" },
  { bar: "bg-rose-400",    pill: "bg-rose-400/10 text-rose-500 dark:text-rose-400 border-rose-400/20",             border: "border-rose-400/30",    bg: "bg-rose-400/5",    text: "text-rose-500 dark:text-rose-400",     hex: "#fb7185" },
  { bar: "bg-blue-400",    pill: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",             border: "border-blue-400/30",    bg: "bg-blue-400/5",    text: "text-blue-600 dark:text-blue-400",     hex: "#60a5fa" },
  { bar: "bg-amber-400",   pill: "bg-amber-400/10 text-amber-600 dark:text-amber-400 border-amber-400/20",         border: "border-amber-400/30",   bg: "bg-amber-400/5",   text: "text-amber-600 dark:text-amber-400",   hex: "#fbbf24" },
  { bar: "bg-purple-400",  pill: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",     border: "border-purple-400/30",  bg: "bg-purple-400/5",  text: "text-purple-600 dark:text-purple-400", hex: "#c084fc" },
];

// Geometría del árbol horizontal de la secuencia
const SEQ_TREE_NODE_W = 148;
const SEQ_TREE_NODE_H = 40; // caja "cabecera" (índice + tipo + preview) — igual para todos los nodos
const SEQ_TREE_COL_PITCH = 190;
// Preview de botones debajo de los nodos Pregunta (mockup del mensaje interactivo final de WhatsApp)
const SEQ_TREE_PILL_H = 16;
const SEQ_TREE_MAX_PILLS = 3; // igual al máximo de botones reales que admite una pregunta
// Alto de fila: cabecera + hasta 3 pills de botón + margen — así ningún nodo Pregunta se superpone
// con el carril de abajo, sin importar cuántos botones tenga.
const SEQ_TREE_ROW_PITCH = SEQ_TREE_NODE_H + SEQ_TREE_MAX_PILLS * SEQ_TREE_PILL_H + 12;

type DraftFlow = {
  id?: string
  name: string
  trigger_text: string
  sequence_id: string | null
  final_action: CrmWaFlowFinalAction
  is_active: boolean
  trigger_once: boolean
  flow_trigger_type: "new_conversation" | "intent"
  country_sequences: { country_code: string; sequence_id: string }[]
  status: "draft" | "published"
  draft_step: number
};

// Preview del último mensaje en la lista de chats. El prefijo dice QUIÉN habló último — sin él no
// se distingue "el cliente preguntó algo y espera" de "ya le respondimos", que es justo lo que se
// mira al recorrer la lista.
const WA_MEDIA_PREVIEW: Record<string, string> = {
  image: "📷 Foto",
  audio: "🎤 Audio",
  video: "🎥 Video",
  document: "📄 Archivo",
  interactive_question: "❓ Pregunta con botones",
};

function lastMessagePreview(msg: WaLastMessage | undefined): string | null {
  if (!msg) return null;
  const body = msg.content?.trim() || (msg.media_type ? WA_MEDIA_PREVIEW[msg.media_type] ?? "📎 Adjunto" : "");
  if (!body) return null;
  const prefix = msg.role === "user" ? "" : msg.role === "assistant" ? "IA: " : "Tú: ";
  return `${prefix}${body.replace(/\s+/g, " ")}`;
}

const FLOW_FINAL_ACTION_LABELS: Record<CrmWaFlowFinalAction, string> = {
  nothing:       "Continuar con IA",
  human_handoff: "Continuar con Humano",
} as const;

type CountryRow = { country_codes: string[]; sequence_id: string };

// La base guarda pares país→secuencia (es lo que compara el runtime); el editor agrupa por
// secuencia para poder asignarle varios países de una. Estas dos funciones son el puente.
function groupCountrySequences(pairs: CrmWaFlowCountrySequence[]): CountryRow[] {
  const bySequence = new Map<string, string[]>();
  for (const { country_code, sequence_id } of pairs) {
    if (!sequence_id || !country_code) continue;
    bySequence.set(sequence_id, [...(bySequence.get(sequence_id) ?? []), country_code]);
  }
  return [...bySequence].map(([sequence_id, country_codes]) => ({ sequence_id, country_codes }));
}

function flattenCountryRows(rows: CountryRow[]): CrmWaFlowCountrySequence[] {
  return rows.flatMap(row =>
    row.sequence_id ? row.country_codes.map(country_code => ({ country_code, sequence_id: row.sequence_id })) : [],
  );
}

const FLOW_FINAL_ACTION_DESCRIPTIONS: Record<CrmWaFlowFinalAction, string> = {
  nothing:       "El agente sigue atendiendo la conversación solo",
  human_handoff: "La conversación pasa a tu equipo y el agente deja de responder",
} as const;

// El ícono es lo que hace distinguibles las 2 opciones de un vistazo, sin leerlas: el mismo robot
// que identifica al agente en el resto del panel, y una persona para el traspaso a tu equipo.
const FLOW_FINAL_ACTION_ICONS: Record<CrmWaFlowFinalAction, LucideIcon> = {
  nothing:       Bot,
  human_handoff: UserPlus,
} as const;

function newDraftFlow(): DraftFlow {
  return { name: "", trigger_text: "", sequence_id: null, final_action: "nothing", is_active: true, trigger_once: true, flow_trigger_type: "new_conversation", country_sequences: [], status: "draft", draft_step: 1 };
}

// COUNTRY_OPTIONS es ahora dinámico vía useSupportedCountries() — ver hook abajo

const STEP_TYPE_LABELS = {
  message: "Texto", question: "Pregunta",
  image: "Imagen", video: "Video", audio: "Audio", file: "Archivo", link: "Link",
} as const;

const STEP_TYPE_ICONS = {
  message: MessageSquare, question: GitBranch, link: ExternalLink,
  image: ImageIcon, video: FileVideo, audio: Music2, file: Paperclip,
} as const;

// Orden en el que se muestran los tipos al crear un paso nuevo o cambiar el tipo de uno existente.
const STEP_TYPE_ORDER = ["message", "question", "link", "image", "video", "audio", "file"] as const;

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
    // Sin botones por defecto — en el modelo árbol-primero, los botones de una pregunta se crean
    // desde el "+" del lienzo (así siempre hay una rama visible detrás de cada opción del editor).
    options: type === "question" ? [] : undefined,
    media: MEDIA_TYPES.has(type) ? [] : undefined,
    // Arista saliente explícita desde el minuto cero (null = todavía no lleva a ningún lado): una
    // pregunta no la usa, cualquier otro paso siempre la tiene guardada, nunca deducida.
    next_step_id: null,
  };
}

// ─── Modelo de datos de una secuencia: DAG explícito ─────────────────────────
// Una secuencia es UNA LISTA DE NODOS + ARISTAS GUARDADAS POR ID, y nada más:
//
//   · cada paso tiene un `id` (UUID) que nace con él y muere con él — nunca se recicla ni se
//     reasigna, así que una conexión vieja jamás puede "caer" sobre un paso nuevo;
//   · un paso normal tiene UNA arista saliente: `next_step_id` (id del siguiente, o null = fin
//     de esta rama). Siempre está guardada: no se deduce de nada;
//   · un paso Pregunta NO usa `next_step_id`: tiene una arista por botón (`options[].next_step_id`).
//     El botón es la ETIQUETA de la arista, no un nodo — una pregunta con 3 botones es 1 nodo con
//     3 salidas, no 4 nodos. (Un botón sin destino se dibuja como un recuadro punteado "+ crear
//     paso", pero eso es solo el hueco de una arista sin terminar, no un nodo guardado.);
//   · varios padres pueden apuntar al mismo id (reconvergencia): por eso es un DAG y no un árbol.
//     Lo único prohibido es cerrar un ciclo, y de eso se encarga `canConnectForward`;
//   · la raíz es `steps[0]`. El orden del arreglo NO significa nada más: los pasos nuevos se
//     agregan SIEMPRE al final y nunca se reordenan. Gracias a eso el número visible de un paso
//     ("Paso 5") no cambia porque se haya creado otro en cualquier otra rama, y el índice que el
//     backend guarda en `crm_wa_conversations.flow_step` sigue apuntando al mismo paso mientras
//     una conversación está en curso.
//
// Antes, las conexiones de los pasos normales NO se guardaban: se recalculaban en cada cambio a
// partir de la posición en el arreglo y de rangos de "ramas" inferidos por índice. Esa derivación
// era la causa raíz de que crear, conectar o borrar un paso reescribiera en silencio conexiones
// de OTRAS ramas. Ya no existe: lo que está guardado es el grafo.

// Único punto donde se toca data legada: se ejecuta UNA vez, al abrir la secuencia.
//   · rellena el `id` de botones guardados antes de que ese campo existiera (toda la lógica
//     identifica botones por id, nunca por texto ni por posición);
//   · materializa como arista explícita el enlace de los pasos legados que no la tenían (el
//     runtime viejo avanzaba al siguiente del arreglo: se guarda exactamente eso);
//   · limpia referencias colgantes — un id que apunta a un paso que ya no existe pasa a null,
//     nunca queda una conexión "fantasma" a un paso borrado;
//   · descarta los marcadores del modelo viejo (`shared`, `next_step_pinned`), que ya no se leen.
function normalizeSequenceSteps(rawSteps: SequenceStep[]): SequenceStep[] {
  const ids = new Set(rawSteps.map(s => s.id));
  const resolve = (id: string | null | undefined): string | null => (id && ids.has(id) ? id : null);
  return rawSteps.map((s, i) => {
    const step: SequenceStep = { ...s };
    delete step.shared;
    delete step.next_step_pinned;
    if (step.options) {
      step.options = step.options.map(o => ({ ...o, id: o.id || crypto.randomUUID(), next_step_id: resolve(o.next_step_id) }));
    }
    if (step.type === "question") {
      step.next_step_id = null; // una pregunta navega por sus botones: su arista propia no se usa
    } else {
      step.next_step_id = step.next_step_id === undefined
        ? (rawSteps[i + 1]?.id ?? null) // legado sin enlace explícito: el runtime avanzaba por índice
        : resolve(step.next_step_id);
    }
    return step;
  });
}

function getStepPreview(s: SequenceStep, maxLen: number): string | null {
  if (s.type === "message" || s.type === "question") return s.text?.trim().slice(0, maxLen) || null;
  if (s.type === "link") return s.link_url?.slice(0, maxLen) || null;
  return s.media?.[0]?.name?.slice(0, maxLen) || null;
}

// Ids de pasos alcanzables desde la raíz (steps[0]) siguiendo las aristas reales — mismo criterio
// de "hijos" que usa buildSequenceGraph (opciones de pregunta / next_step_id). Se usa para detectar
// si una reconexión o un borrado dejaría contenido sin conexión ("rama suelta").
function getReachableStepIds(steps: SequenceStep[]): Set<string> {
  const seen = new Set<string>();
  if (steps.length === 0) return seen;
  const byId = new Map(steps.map(s => [s.id, s]));
  const stack = [steps[0].id];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const s = byId.get(id);
    if (!s) continue;
    if (s.type === "question") {
      for (const o of s.options ?? []) {
        if (o.label.trim() && o.next_step_id && byId.has(o.next_step_id)) stack.push(o.next_step_id);
      }
    } else if (s.next_step_id && byId.has(s.next_step_id)) {
      stack.push(s.next_step_id);
    }
  }
  return seen;
}

// Devuelve `steps` con el botón `optionId` de `questionId` reapuntado a `newTargetId` (o
// desenlazado si es null) — identidad por el id propio del botón, nunca por posición ni por
// texto (2 botones pueden compartir texto, y borrar uno del medio corre los índices).
function stepsWithRewiredOption(steps: SequenceStep[], questionId: string, optionId: string, newTargetId: string | null): SequenceStep[] {
  return steps.map(s => s.id !== questionId ? s : {
    ...s,
    options: s.options?.map(o => o.id === optionId ? { ...o, next_step_id: newTargetId } : o),
  });
}

// Identidad de UNA arista concreta del grafo — la de un botón de pregunta, o la única saliente de
// un paso normal. Se usa tanto para crearla la primera vez como para cambiar su destino o quitarla
// después, siempre desde el mismo lugar (tocar el círculo al final de la línea), nunca arrastrando
// — más simple y funciona igual en mobile.
type EdgeManageSource =
  | { kind: "option"; questionId: string; optionId: string }
  | { kind: "step"; stepId: string };

// Devuelve `steps` con la arista `source` apuntando a `newTargetId` (o desconectada si es null).
// No toca ninguna otra arista: reapuntar una conexión nunca puede robarle un padre a un paso, así
// que un destino con 2+ padres (reconvergencia) simplemente suma o pierde uno.
function stepsWithEdgeTarget(steps: SequenceStep[], source: EdgeManageSource, newTargetId: string | null): SequenceStep[] {
  return source.kind === "option"
    ? stepsWithRewiredOption(steps, source.questionId, source.optionId, newTargetId)
    : steps.map(s => s.id === source.stepId ? { ...s, next_step_id: newTargetId } : s);
}

// Quita `removeIds` del grafo y borra TODA referencia a ellos desde cualquier padre (aristas de
// botones y aristas normales por igual): un id borrado se reemplaza por su reemplazo en `redirect`
// si lo tiene, o pasa a null. Nunca queda un padre apuntando a un paso que ya no existe.
function stepsWithoutIds(steps: SequenceStep[], removeIds: Set<string>, redirect?: Map<string, string | null>): SequenceStep[] {
  const resolve = (id: string | null | undefined): string | null => {
    if (!id) return null;
    if (!removeIds.has(id)) return id;
    return redirect?.get(id) ?? null;
  };
  return steps.filter(s => !removeIds.has(s.id)).map(s => ({
    ...s,
    options: s.options?.map(o => ({ ...o, next_step_id: resolve(o.next_step_id) })),
    next_step_id: resolve(s.next_step_id),
  }));
}

// Borra `stepId` junto con los `discardedIds` que se pierden con él, y reconecta hacia
// `successorId` (o desconecta, si es null) todo lo que apuntaba al paso borrado. Si el borrado era
// la raíz, `successorId` pasa a ocupar su lugar como nuevo primer paso.
function stepsAfterDeleting(steps: SequenceStep[], stepId: string, discardedIds: string[], successorId: string | null): SequenceStep[] {
  const removeIds = new Set([stepId, ...discardedIds]);
  if (successorId) removeIds.delete(successorId); // el paso que se conserva nunca se borra
  const wasRoot = steps[0]?.id === stepId;
  const cleaned = stepsWithoutIds(steps, removeIds, new Map([[stepId, successorId]]));
  return wasRoot ? stepsWithRoot(cleaned, successorId) : cleaned;
}

// Deja a `rootId` en la posición 0 sin alterar el orden relativo del resto — la raíz de la
// secuencia es, por convención, `steps[0]` (es donde arranca el runtime, con flow_step = 0). Solo
// hace falta al borrar el primer paso: en cualquier otro caso el arreglo nunca se reordena.
function stepsWithRoot(steps: SequenceStep[], rootId: string | null): SequenceStep[] {
  if (!rootId) return steps;
  const idx = steps.findIndex(s => s.id === rootId);
  if (idx <= 0) return steps;
  return [steps[idx], ...steps.slice(0, idx), ...steps.slice(idx + 1)];
}

// ¿Se puede conectar sourceId → targetId? Solo si targetId ya está en un nivel ESTRICTAMENTE más
// profundo que sourceId en el árbol actual — nunca el mismo nivel, nunca uno anterior. Esto solo
// alcanza para garantizar que nunca se forme un ciclo: un ancestro real siempre tiene un nivel
// menor que su descendiente (cada conexión suma +1 de profundidad), así que cualquier candidato
// que pudiera cerrar un ciclo queda automáticamente descartado por este único chequeo.
function canConnectForward(nodes: SeqGraphNode[], sourceId: string, targetId: string): boolean {
  if (sourceId === targetId) return false;
  const source = nodes.find(n => n.id === sourceId);
  const target = nodes.find(n => n.id === targetId);
  if (!source || !target) return false;
  return target.depth > source.depth;
}

// ─── Árbol visual de la secuencia como grafo ─────────────────────────────────
// Construido siguiendo los enlaces reales (next_step_id / options[].next_step_id) en vez de
// cortar el arreglo por índices — así un paso de reconvergencia (con varios "padres") se
// dibuja UNA sola vez con varias líneas entrando, sin duplicarse nunca en el árbol.
type SeqGraphNode = {
  id: string;
  step: SequenceStep | null; // null = placeholder de botón sin enlazar
  depth: number;
  lane: number;
  pending?: boolean;
  pendingLabel?: string;
  pendingOptionId?: string; // id propio del botón origen — identidad estable para crear/enlazar,
  // nunca la posición ni el texto del botón (pueden cambiar o repetirse)
  mergeCount: number; // cuántas conexiones entrantes tiene (>1 = punto de reconvergencia)
};
// colorIdx: posición entre los botones con texto — solo para asignar color/orden visual al pill,
// NUNCA para identidad (2+ botones pueden compartir label y su índice cambia al borrar otro).
// optionId: id propio del botón origen (solo en aristas que salen de una pregunta) — identidad
// real para crear/enlazar/arrastrar.
type SeqGraphEdge = { fromId: string; toId: string; label?: string; colorIdx?: number; optionId?: string };

// Cuántos botones (labeled) muestra el mockup de un nodo Pregunta en el lienzo — al menos 1
// (una fila "Sin botones" cuando todavía no tiene ninguno), acotado a SEQ_TREE_MAX_PILLS.
function nodeQuestionPillCount(node: SeqGraphNode): number {
  if (node.pending || !node.step || node.step.type !== "question") return 0;
  const labeled = (node.step.options ?? []).filter(o => o.label.trim()).length;
  return Math.min(Math.max(labeled, 1), SEQ_TREE_MAX_PILLS);
}

// Alto real de la caja de un nodo en el lienzo — la cabecera sola para pasos normales y
// placeholders, o cabecera + preview de botones para preguntas. Compartido entre el render y el
// hit-test del arrastre de conexiones para que nunca queden desincronizados.
function nodeBoxHeight(node: SeqGraphNode): number {
  const pills = nodeQuestionPillCount(node);
  return pills === 0 ? SEQ_TREE_NODE_H : SEQ_TREE_NODE_H + pills * SEQ_TREE_PILL_H;
}

// Punto vertical de donde sale una línea: si el origen es una pregunta y la arista es una de sus
// opciones (colorIdx definido), sale del pill de ESE botón específico en el mockup — no del
// centro genérico del nodo — para que se vea de qué botón exacto sale cada conexión.
function edgeSourceY(from: SeqGraphNode, colorIdx: number | undefined): number {
  const base = from.lane * SEQ_TREE_ROW_PITCH;
  const pills = nodeQuestionPillCount(from);
  if (colorIdx === undefined || pills === 0) return base + SEQ_TREE_NODE_H / 2;
  const pillIdx = Math.min(colorIdx, pills - 1);
  return base + SEQ_TREE_NODE_H + pillIdx * SEQ_TREE_PILL_H + SEQ_TREE_PILL_H / 2;
}

// ¿Esta arista del grafo es la que identifica `source`? Un paso normal tiene una sola saliente;
// una pregunta tiene una por botón, y ahí lo que la distingue es el id del botón.
function edgeMatchesSource(edge: SeqGraphEdge, source: EdgeManageSource): boolean {
  return source.kind === "option"
    ? edge.fromId === source.questionId && edge.optionId === source.optionId
    : edge.fromId === source.stepId && edge.optionId === undefined;
}

// Conexiones que llegan a un mismo paso, ordenadas de ARRIBA hacia ABAJO por la altura real desde
// la que sale cada una en el lienzo. Este orden es la única referencia que tiene el usuario para
// saber "cuál es cuál" cuando 2+ ramas terminan en el mismo paso, así que se calcula UNA vez acá y
// lo usan por igual el lienzo (para repartir los puntos de llegada) y el diálogo de gestión (para
// listar los caminos): si los dos no coincidieran exactamente, sería posible borrar el camino
// equivocado creyendo que se borra otro.
function incomingEdgesInVisualOrder(
  graph: { nodes: SeqGraphNode[]; edges: SeqGraphEdge[] },
  targetId: string,
): { edge: SeqGraphEdge; index: number }[] {
  const sourceY = (e: SeqGraphEdge): number => {
    const from = graph.nodes.find(n => n.id === e.fromId);
    return from ? edgeSourceY(from, e.colorIdx) : 0;
  };
  return graph.edges
    .map((edge, index) => ({ edge, index }))
    .filter(e => e.edge.toId === targetId)
    .sort((a, b) => sourceY(a.edge) - sourceY(b.edge) || a.index - b.index);
}

// Separación vertical entre los puntos de llegada de varias conexiones a un mismo paso — se achica
// si son muchas, para que todas sigan cayendo dentro de la caja del nodo destino.
function edgePortGap(count: number): number {
  // 16 = un poco más que el diámetro del círculo (r=7), para que no se toquen entre sí; 40 = alto
  // de la cabecera del nodo, para que ni el primero ni el último se salgan de la caja.
  return Math.min(16, 40 / Math.max(count - 1, 1));
}

// Mini-mapa de las conexiones que llegan a un paso, con la que se está por cambiar o borrar
// resaltada y las demás atenuadas. Va en el diálogo de gestión: leer "Paso 2 · botón X → Paso 6"
// obliga a reconstruir mentalmente el dibujo, y con varias ramas cayendo en el mismo paso es
// justo donde es fácil borrar la equivocada. El orden de las filas es el MISMO de arriba hacia
// abajo que el de los círculos en el lienzo.
function EdgeTargetPreview({ steps, graph, source }: {
  steps: SequenceStep[];
  graph: { nodes: SeqGraphNode[]; edges: SeqGraphEdge[] };
  source: EdgeManageSource;
}) {
  const targetId = graph.edges.find(e => edgeMatchesSource(e, source))?.toId;
  const target = targetId ? steps.find(s => s.id === targetId) : null;
  if (!targetId || !target) return null;

  const incoming = incomingEdgesInVisualOrder(graph, targetId);
  const ROW_H = 52;
  const height = Math.max(incoming.length * ROW_H, ROW_H);
  const targetPreview = getStepPreview(target, 22);
  const targetIdx = steps.findIndex(s => s.id === targetId);

  const rowColor = (edge: SeqGraphEdge) =>
    edge.colorIdx !== undefined ? BRANCH_COLORS[edge.colorIdx % BRANCH_COLORS.length].hex : "currentColor";

  return (
    <div className="rounded-lg border border-border bg-secondary/20 p-2">
      <p className="text-[9px] text-muted-foreground/70 mb-1">
        {incoming.length > 1
          ? `${incoming.length} caminos terminan en este mismo paso — el resaltado es el que estás tocando`
          : "Este es el camino que estás tocando"}
      </p>
      <div className="flex items-center">
        {/* Los pasos DE DONDE viene cada camino, dibujados como las tarjetas del lienzo: ver el paso
            padre completo (y no solo su número) es lo que hace reconocible cuál se está por tocar. */}
        <div className="flex-1 min-w-0 flex flex-col">
          {incoming.map(({ edge, index }) => {
            const from = steps.find(s => s.id === edge.fromId);
            const fromIdx = steps.findIndex(s => s.id === edge.fromId);
            const fromPreview = from ? getStepPreview(from, 20) : null;
            const isThisOne = edgeMatchesSource(edge, source);
            return (
              <div key={index} className="flex items-center min-w-0" style={{ height: ROW_H }}>
                <div
                  className={`w-full min-w-0 rounded-md border px-2 py-1 ${
                    isThisOne ? "border-primary bg-primary/5" : "border-border/50 bg-background/50 opacity-45"
                  }`}
                >
                  <p className="text-[9px] font-semibold truncate">
                    Paso {fromIdx + 1} · {from ? STEP_TYPE_LABELS[from.type] : "—"}
                  </p>
                  {fromPreview && <p className="text-[9px] text-muted-foreground/70 truncate">{fromPreview}</p>}
                  {edge.label && (
                    <p className="text-[9px] font-medium truncate" style={{ color: rowColor(edge) }}>
                      botón "{edge.label}"
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <svg width={30} height={height} className="shrink-0">
          {incoming.map(({ edge, index }, i) => {
            const y = i * ROW_H + ROW_H / 2;
            const cy = height / 2;
            const isThisOne = edgeMatchesSource(edge, source);
            return (
              <path
                key={index}
                d={`M0,${y} C15,${y} 15,${cy} 30,${cy}`}
                fill="none"
                stroke={rowColor(edge)}
                strokeWidth={isThisOne ? 2 : 1}
                strokeOpacity={isThisOne ? 1 : 0.25}
              />
            );
          })}
        </svg>
        <div className="shrink-0 max-w-[42%] rounded-md border border-primary/50 bg-background px-2 py-1">
          <p className="text-[9px] font-semibold truncate">Paso {targetIdx + 1} · {STEP_TYPE_LABELS[target.type]}</p>
          {targetPreview && <p className="text-[9px] text-muted-foreground/70 truncate">{targetPreview}</p>}
        </div>
      </div>
    </div>
  );
}

// Descripción de "dónde" se está creando un paso nuevo desde el árbol — se resuelve recién
// cuando el usuario elige el tipo en el selector, en vez de crear directo con tipo "message".
type PendingStepCreate =
  | { kind: "first" }
  | { kind: "after"; afterStepId: string }
  // optionId identifica la arista exacta cuando el origen es una pregunta — 2 botones de la misma
  // pregunta pueden apuntar al mismo destino, y solo se debe intercalar el paso en uno de ellos.
  | { kind: "edge"; fromId: string; toId: string; optionId?: string }
  | { kind: "option"; questionStepId: string; optionId: string };

function buildSequenceGraph(steps: SequenceStep[]): { nodes: SeqGraphNode[]; edges: SeqGraphEdge[]; maxDepth: number; maxLane: number } {
  if (steps.length === 0) return { nodes: [], edges: [], maxDepth: 0, maxLane: 0 };
  const byId = new Map(steps.map(s => [s.id, s]));

  type Child = { id: string; label?: string; colorIdx?: number; pending?: boolean; optionId?: string };
  const children = new Map<string, Child[]>();
  for (const s of steps) {
    if (s.type === "question") {
      const labeled = (s.options ?? []).filter(o => o.label.trim());
      const list: Child[] = labeled.map((o, oi) => {
        if (o.next_step_id && byId.has(o.next_step_id)) {
          return { id: o.next_step_id, label: o.label, colorIdx: oi, optionId: o.id };
        }
        // El id sintético del placeholder usa el id REAL del botón (no su posición) — así sigue
        // siendo el mismo nodo aunque se borre/agregue otro botón antes en la lista.
        return { id: `__pending__${s.id}__${o.id}`, label: o.label, colorIdx: oi, pending: true, optionId: o.id };
      });
      if (list.length > 0) children.set(s.id, list);
    } else if (s.next_step_id && byId.has(s.next_step_id)) {
      children.set(s.id, [{ id: s.next_step_id }]);
    }
  }

  const rootId = steps[0].id;

  // Profundidad por relajación (tipo Bellman-Ford, acotado): correcto incluso con reconvergencias
  // o loops (un botón que enlaza hacia un paso anterior), sin importar el orden de visita.
  const depth = new Map<string, number>([[rootId, 0]]);
  for (let iter = 0; iter < steps.length + 1; iter++) {
    let changed = false;
    for (const [fromId, kids] of children) {
      if (!depth.has(fromId)) continue;
      const d = depth.get(fromId)!;
      for (const kid of kids) {
        const nd = d + 1;
        if (!depth.has(kid.id) || nd > depth.get(kid.id)!) { depth.set(kid.id, nd); changed = true; }
      }
    }
    if (!changed) break;
  }
  // Pasos nunca alcanzados (huérfanos) — no deberían existir, pero por seguridad no se ocultan.
  for (const s of steps) if (!depth.has(s.id)) depth.set(s.id, 0);

  // Carriles: árbol centrado (post-orden) — cada nodo se ubica en el promedio de los carriles de
  // los hijos que "posee" (los que solo él enlaza), así que el primer paso y cada bifurcación
  // quedan centrados respecto a todo lo que cuelga de ellos. Un hijo ya reclamado por otra rama
  // (reconvergencia) NO participa en el promedio de este nodo — ni siquiera con su carril ya
  // calculado: si contara, un padre cuyo único hijo es un nodo compartido quedaría "pegado" al
  // carril de ese nodo (y potencialmente superpuesto con el otro padre que sí lo posee), en vez
  // de mantener su propia posición independiente y solo dibujar una línea hacia el destino
  // compartido. Las hojas (y los nodos sin ningún hijo PROPIO) reciben carriles consecutivos en
  // el orden de recorrido.
  const lane = new Map<string, number>();
  const owned = new Set<string>([rootId]);
  const visiting = new Set<string>();
  let nextLeafLane = 0;
  const computeLane = (id: string): number => {
    if (lane.has(id)) return lane.get(id)!;
    visiting.add(id);
    const kids = children.get(id) ?? [];
    const ownedLanes: number[] = [];
    for (const kid of kids) {
      if (visiting.has(kid.id)) continue; // enlace hacia un ancestro (loop) — no se centra sobre sí mismo
      if (owned.has(kid.id)) continue; // ya lo posee otro padre — no mueve mi propia posición
      owned.add(kid.id);
      ownedLanes.push(computeLane(kid.id));
    }
    visiting.delete(id);
    const myLane = ownedLanes.length > 0
      ? ownedLanes.reduce((a, b) => a + b, 0) / ownedLanes.length
      : nextLeafLane++;
    lane.set(id, myLane);
    return myLane;
  };
  computeLane(rootId);
  for (const s of steps) if (!lane.has(s.id)) lane.set(s.id, nextLeafLane++);

  // Aristas + conteo de entrantes (para marcar puntos de reconvergencia)
  const edges: SeqGraphEdge[] = [];
  const incoming = new Map<string, number>();
  for (const [fromId, kids] of children) {
    for (const kid of kids) {
      edges.push({ fromId, toId: kid.id, label: kid.label, colorIdx: kid.colorIdx, optionId: kid.optionId });
      incoming.set(kid.id, (incoming.get(kid.id) ?? 0) + 1);
    }
  }

  const nodes: SeqGraphNode[] = steps.map(s => ({
    id: s.id, step: s, depth: depth.get(s.id) ?? 0, lane: lane.get(s.id) ?? 0,
    mergeCount: incoming.get(s.id) ?? 0,
  }));
  // Placeholders de botones sin enlazar
  for (const [, kids] of children) {
    for (const kid of kids) {
      if (kid.pending && !nodes.some(n => n.id === kid.id)) {
        nodes.push({
          id: kid.id, step: null, depth: depth.get(kid.id) ?? 0, lane: lane.get(kid.id) ?? 0,
          pending: true, pendingLabel: kid.label, pendingOptionId: kid.optionId, mergeCount: 0,
        });
      }
    }
  }

  const maxDepth = nodes.reduce((acc, n) => Math.max(acc, n.depth), 0);
  const maxLane = nodes.reduce((acc, n) => Math.max(acc, n.lane), 0);
  return { nodes, edges, maxDepth, maxLane };
}

// Panel de edición de un solo paso — reemplaza el antiguo item de lista arrastrable: en el modelo
// árbol-primero no hay reordenar por drag, así que este componente es solo el contenido del paso
// seleccionado en el árbol (sin manija de arrastre ni menú de "mover a otra rama").
function StepEditorPanel({
  step, allSteps, onChange, onRemove, onDeleteOption, userId,
}: {
  step: SequenceStep; allSteps: SequenceStep[];
  onChange: (s: SequenceStep) => void; onRemove: () => void; onDeleteOption: (optionId: string) => void; userId: string;
}) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stepIdx = allSteps.findIndex(s => s.id === step.id);

  const isMedia = MEDIA_TYPES.has(step.type);

  const handleTypeChange = (newType: SequenceStep["type"]) => {
    const nowMedia = MEDIA_TYPES.has(newType);
    const wasQuestion = step.type === "question";
    const isQuestion = newType === "question";
    let newOptions = isQuestion ? (step.options ?? []) : step.options;
    let newNextStepId = step.next_step_id ?? null;
    // Un paso normal navega por `next_step_id` y una Pregunta por sus botones: al cambiar de tipo
    // hay que trasvasar la conexión de un lado al otro, o la rama que colgaba de este paso queda
    // suelta en silencio.
    if (isQuestion && !wasQuestion && (newOptions?.length ?? 0) === 0 && newNextStepId && allSteps.some(s => s.id === newNextStepId)) {
      newOptions = [{ id: crypto.randomUUID(), label: "Opción 1", next_step_id: newNextStepId }];
    }
    if (isQuestion) newNextStepId = null; // una pregunta no usa su arista propia
    if (!isQuestion && wasQuestion && !newNextStepId) {
      // Al dejar de ser Pregunta se conserva el destino del primer botón enlazado (los botones no
      // se borran: si vuelve a ser Pregunta, sus ramas siguen ahí intactas).
      newNextStepId = (step.options ?? []).find(o => o.label.trim() && o.next_step_id && allSteps.some(s => s.id === o.next_step_id))?.next_step_id ?? null;
    }
    onChange({
      ...step,
      type: newType,
      next_step_id: newNextStepId,
      // No se borran los botones al salir de "Pregunta" — quedan guardados sin usarse (el resto
      // del código solo los lee cuando type === "question") y se restauran solos si se vuelve a
      // "Pregunta", en vez de perder las ramas ya armadas y dejar sus pasos huérfanos en el árbol.
      options: newOptions,
      // Mismo criterio que options: no se pierde el archivo ya subido por pasar por otro tipo
      // de paso y volver — solo se usa cuando el tipo actual es de medios.
      media: nowMedia ? (step.media ?? []) : step.media,
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

  // "Sin enlazar" incluye next_step_id null y next_step_id colgante (apunta a un paso ya borrado).
  const hasUnlinkedOption = step.type === "question" && (step.options ?? []).some(o => o.label.trim() && (!o.next_step_id || !allSteps.some(s => s.id === o.next_step_id)));

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 py-2 px-3 border-b border-border/60">
        <span className="text-[11px] font-medium text-muted-foreground shrink-0">Paso {stepIdx + 1}</span>
        <select
          value={step.type}
          onChange={e => handleTypeChange(e.target.value as SequenceStep["type"])}
          className="ml-1 h-6 px-1.5 text-base md:text-[10px] rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
        >
          {STEP_TYPE_ORDER.map(t => (
            <option key={t} value={t}>{STEP_TYPE_LABELS[t]}</option>
          ))}
        </select>
        {hasUnlinkedOption && (
          <span title="Hay un botón que todavía no lleva a ningún paso" className="ml-auto w-2 h-2 rounded-full bg-amber-500 shrink-0" />
        )}
        <button onClick={onRemove} className={`${hasUnlinkedOption ? "" : "ml-auto"} p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors`}>
          <Trash2 size={12} />
        </button>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        {/* Texto del mensaje */}
        {step.type === "message" && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-muted-foreground">Mensaje</label>
            <textarea
              value={step.text ?? ""}
              onChange={e => onChange({ ...step, text: e.target.value })}
              placeholder="Texto del mensaje…"
              rows={2}
              className="w-full px-2.5 py-1.5 text-base md:text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
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
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-muted-foreground">Pregunta</label>
            <textarea
              value={step.text ?? ""}
              onChange={e => onChange({ ...step, text: e.target.value })}
              placeholder="Texto de la pregunta…"
              rows={2}
              className="w-full px-2.5 py-1.5 text-base md:text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>
        )}

        {/* Opciones para pregunta */}
        {step.type === "question" && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-muted-foreground">Botones</label>
            {(step.options ?? []).map((opt, i) => {
              // Mismo índice de color que usa el árbol (BRANCH_COLORS por posición entre las
              // opciones CON texto) — así el color de cada fila coincide con el de su rama en el lienzo.
              const labeledBefore = (step.options ?? []).slice(0, i).filter(o => o.label.trim()).length;
              const branchColor = opt.label.trim() ? BRANCH_COLORS[labeledBefore % BRANCH_COLORS.length] : null;
              return (
              <div key={opt.id} className={`rounded-lg border p-2 space-y-1.5 ${branchColor ? `${branchColor.border} ${branchColor.bg}` : "border-border/50 bg-secondary/20"}`}>
                <label className={`text-[10px] font-medium ${branchColor ? branchColor.text : "text-muted-foreground/70"}`}>Opción {i + 1}</label>
                {/* Fila 1: número + input + contador + eliminar */}
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] w-4 shrink-0 font-medium ${branchColor ? branchColor.text : "text-muted-foreground/70"}`}>{i + 1}.</span>
                  <input
                    value={opt.label}
                    onChange={e => setOption(i, { label: e.target.value.slice(0, 20) })}
                    maxLength={20}
                    placeholder={`Texto del botón ${i + 1}`}
                    className="flex-1 h-7 px-2 text-base md:text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary/20 min-w-0"
                  />
                  <span className={`text-[10px] tabular-nums shrink-0 ${opt.label.length >= 18 ? "text-amber-500" : "text-muted-foreground/65"}`}>
                    {opt.label.length}/20
                  </span>
                  <button onClick={() => onDeleteOption(opt.id)}
                    className="p-0.5 text-muted-foreground/65 hover:text-destructive shrink-0">
                    <X size={11} />
                  </button>
                </div>
                {/* Destino — de solo lectura: el enlace se arma desde el árbol (clic en el placeholder
                    pendiente o arrastrando la conexión), no desde este editor */}
                <div className="flex items-center gap-1.5 pl-5">
                  {(() => {
                    if (!opt.next_step_id || !allSteps.some(s => s.id === opt.next_step_id)) {
                      return (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          ⚠ Falta decir a dónde lleva — conéctala arriba
                        </span>
                      );
                    }
                    const target = allSteps.find(s => s.id === opt.next_step_id);
                    const targetIdx = target ? allSteps.indexOf(target) : -1;
                    const preview = target && (
                      (target.type === "question" || target.type === "message") ? target.text?.trim().slice(0, 24)
                      : target.type === "link" ? target.link_url?.slice(0, 24)
                      : target.media?.[0]?.name?.slice(0, 20) ?? null
                    );
                    return (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
                        <ChevronRight size={10} className="shrink-0" />
                        {target ? `Paso ${targetIdx + 1} · ${STEP_TYPE_LABELS[target.type]}${preview ? `: ${preview}` : ""}` : "Paso eliminado"}
                      </span>
                    );
                  })()}
                </div>
              </div>
              );
            })}
            {(step.options?.length ?? 0) === 0 && (
              <p className="text-[10px] text-muted-foreground/50 italic">Sin botones todavía — agrégalos con el "+" amarillo de esta pregunta, arriba.</p>
            )}
            <p className="text-[10px] text-muted-foreground/65">Botones interactivos · máx. 3 · 20 caracteres c/u</p>
          </div>
        )}

        {/* Link con botón CTA */}
        {step.type === LINK_TYPE && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-muted-foreground">URL del link</label>
            <input
              value={step.link_url ?? ""}
              onChange={e => onChange({ ...step, link_url: e.target.value })}
              placeholder="https://ejemplo.com"
              type="url"
              className="w-full h-7 px-2.5 text-base md:text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <label className="text-[10px] font-medium text-muted-foreground">Texto del botón (CTA)</label>
            <div className="flex items-center gap-2">
              <input
                value={step.link_label ?? ""}
                onChange={e => onChange({ ...step, link_label: e.target.value.slice(0, 20) })}
                maxLength={20}
                placeholder="Texto del botón"
                className="flex-1 h-7 px-2.5 text-base md:text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-0"
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
                <label className="text-[10px] font-medium text-muted-foreground">Caption (opcional)</label>
                <Textarea
                  value={step.text ?? ""}
                  onChange={e => onChange({ ...step, text: e.target.value })}
                  placeholder="Caption / texto acompañante (opcional)"
                  rows={2}
                  className="w-full min-h-0 px-2.5 py-1.5 text-base md:text-xs rounded-lg border border-input bg-background focus:outline-none resize-none"
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
  const { permission: pushPermission, hasSubscription: pushHasSubscription, checked: pushChecked } = usePushSubscriptionStatus();
  const subscribePush = useSubscribeToPush();
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
  const { data: flows = [] }       = useWaFlows();
  const upsertFlow                 = useUpsertWaFlow();
  const deleteFlow                 = useDeleteWaFlow();
  const toggleFlow                 = useToggleWaFlow();
  const [editingFlow, setEditingFlow] = useState<DraftFlow | null>(null);
  const insertLog                  = useInsertLog();
  const [pendingDeleteFlowId, setPendingDeleteFlowId] = useState<string | null>(null);
  const [deletingFlow, setDeletingFlow]               = useState(false);
  const [pendingDeleteSeqId, setPendingDeleteSeqId]   = useState<string | null>(null);
  const [deletingSeq, setDeletingSeq]                 = useState(false);
  // Wizard unificado de Flujos: null = lista; 1|2|3 = paso del wizard abierto
  const [flowWizardStep, setFlowWizardStep] = useState<1 | 2 | 3 | null>(null);
  const [flowUsageMode, setFlowUsageMode] = useState<"global" | "country">("global");
  // Una fila = una secuencia + todos los países que la reciben. En la base se sigue guardando como
  // pares país→secuencia (`country_sequences`), que es lo que compara el runtime: agrupar es solo
  // para editarlo, así asignar 8 países a una misma secuencia es una fila y no ocho.
  const [countryRows, setCountryRows] = useState<CountryRow[]>([]);
  // Qué tarjeta tiene abierta la grilla de países (una a la vez): con 38 países desplegados en cada
  // secuencia la lista se vuelve ilegible.
  const [expandedCountrySeqId, setExpandedCountrySeqId] = useState<string | null>(null);

  // En modo Por País una secuencia "está en uso" si tiene fila en countryRows — aunque todavía no
  // tenga ningún país. Esa fila vacía es justamente lo que permite elegir primero la secuencia y
  // recién después sus países (y lo que hace que falte algo si se deja así). Al guardar, las filas
  // sin países no llegan a la base: `flattenCountryRows` las descarta.
  const isSequenceInUse = (sequenceId: string): boolean =>
    countryRows.some(r => r.sequence_id === sequenceId);

  const countriesForSequence = (sequenceId: string): string[] =>
    countryRows.find(r => r.sequence_id === sequenceId)?.country_codes ?? [];

  const toggleSequenceInUse = (sequenceId: string) => {
    const willBeInUse = !isSequenceInUse(sequenceId);
    setCountryRows(rows => willBeInUse
      ? [...rows, { sequence_id: sequenceId, country_codes: [] }]
      : rows.filter(r => r.sequence_id !== sequenceId));
    // Al elegirla se abre su lista de países, que es el paso siguiente inmediato; al quitarla no
    // queda nada desplegado.
    setExpandedCountrySeqId(willBeInUse ? sequenceId : null);
  };

  // Asigna o quita un país de una secuencia. Un país solo puede recibir UNA secuencia dentro del
  // mismo flujo, así que asignarlo acá lo saca automáticamente de la que lo tuviera antes — si no,
  // el runtime encontraría dos reglas para el mismo teléfono y ganaría la que estuviera primero.
  // La secuencia a la que se le quita NO se deselecciona: queda visible sin países, que es un
  // estado que el usuario tiene que resolver, no algo que deba desaparecer en silencio.
  const toggleCountryForSequence = (sequenceId: string, code: string) => {
    setCountryRows(rows => rows.map(r => {
      if (r.sequence_id === sequenceId) {
        return {
          ...r,
          country_codes: r.country_codes.includes(code)
            ? r.country_codes.filter(c => c !== code)
            : [...r.country_codes, code],
        };
      }
      return { ...r, country_codes: r.country_codes.filter(c => c !== code) };
    }));
  };
  // null = paso 2 muestra la lista de secuencias; no-null = paso 2 muestra el editor de una secuencia.
  // assignTo = qué hacer al publicarla: "global" la asigna como la secuencia del flujo, "country"
  // abre su grilla de países para asignársela a alguno, null es solo editarla.
  const [seqEditorOpen, setSeqEditorOpen] = useState<{ assignTo: "global" | "country" | null } | null>(null);
  const [savingFlowStep, setSavingFlowStep] = useState(false);

  const handleDeleteFlow = async () => {
    if (!pendingDeleteFlowId) return;
    const flow = flows.find(f => f.id === pendingDeleteFlowId);
    setDeletingFlow(true);
    try {
      // Las secuencias son objetos independientes — eliminar un flujo NO elimina las secuencias que usa.
      await deleteFlow.mutateAsync(pendingDeleteFlowId);
      insertLog.mutateAsync({ action: "delete", entity: "wa_flow", entity_id: pendingDeleteFlowId, description: `Flujo eliminado: ${flow?.name}` }).catch(() => {});
      setPendingDeleteFlowId(null);
    } catch { toast.error("Error al eliminar el flujo"); }
    finally { setDeletingFlow(false); }
  };

  const handleDeleteSeq = async () => {
    if (!pendingDeleteSeqId) return;
    const seq = sequences.find(s => s.id === pendingDeleteSeqId);
    setDeletingSeq(true);
    try {
      // `crm_wa_flows.sequence_id` tiene FK ON DELETE SET NULL, pero `country_sequences` es JSONB y
      // no la tiene: sin esta limpieza quedan flujos apuntando a una secuencia que ya no existe, y
      // el runtime deja de responder a los contactos de ese país sin ningún aviso.
      const affected = flows.filter(f => (f.country_sequences ?? []).some(cs => cs.sequence_id === pendingDeleteSeqId));
      for (const f of affected) {
        await upsertFlow.mutateAsync({
          id: f.id, name: f.name, trigger_text: f.trigger_text, sequence_id: f.sequence_id,
          final_action: f.final_action, is_active: f.is_active, trigger_once: f.trigger_once ?? true,
          flow_trigger_type: (f.flow_trigger_type === "new_conversation" ? "new_conversation" : "intent"),
          country_sequences: (f.country_sequences ?? []).filter(cs => cs.sequence_id !== pendingDeleteSeqId),
          status: f.status ?? "published", draft_step: f.draft_step ?? 3,
        });
      }
      await deleteSequence.mutateAsync(pendingDeleteSeqId);
      // Si la secuencia eliminada estaba asignada en el flujo que se está editando ahora mismo, se limpia la referencia.
      setEditingFlow(f => f && f.sequence_id === pendingDeleteSeqId ? { ...f, sequence_id: null } : f);
      setCountryRows(rows => rows.filter(r => r.sequence_id !== pendingDeleteSeqId));
      insertLog.mutateAsync({ action: "delete", entity: "wa_sequence", entity_id: pendingDeleteSeqId, description: `Secuencia eliminada: ${seq?.name}` }).catch(() => {});
      setPendingDeleteSeqId(null);
    } catch { toast.error("Error al eliminar la secuencia"); }
    finally { setDeletingSeq(false); }
  };

  const openSeqEditor = (assignTo: "global" | "country" | null, existing?: DraftSequence) => {
    setEditingSeq(existing
      ? { ...existing, steps: normalizeSequenceSteps(existing.steps) }
      : { name: "", steps: [], status: "draft" });
    setTreeSelectedStepId(null);
    setPickingTarget(null);
    autosaveSnapshot.current = null; // se rellena en el primer render: abrir no debe disparar un guardado
    autosavePending.current = false;
    setDraftSaveState("idle");
    setSeqEditorOpen({ assignTo });
  };

  const closeSeqEditor = () => {
    setSeqEditorOpen(null);
    setEditingSeq(null);
    setPickingTarget(null); // el modo conexión no debe sobrevivir a cerrar el editor
    autosaveSnapshot.current = null;
    autosavePending.current = false;
    setDraftSaveState("idle");
  };


  const handleSaveSequence = async () => {
    if (!editingSeq || !editingSeq.name.trim()) { toast.error("Ponle un nombre a la secuencia"); return; }
    if (sequenceIssues.length > 0) {
      toast.error(
        sequenceIssues.length === 1
          ? `Falta conectar una respuesta: ${sequenceIssues[0].text}`
          : `Faltan ${sequenceIssues.length} respuestas por conectar:\n${sequenceIssues.map(i => `· ${i.text}`).join("\n")}`,
        { duration: 6000 },
      );
      return;
    }
    setSavingFlowStep(true);
    try {
      // Publicar: recién acá el borrador pasa a ser la versión que corre en las conversaciones.
      const saved = await upsertSequence.mutateAsync({
        id: editingSeq.id, name: editingSeq.name,
        steps: editingSeq.steps, draft_steps: null, status: "published",
      });
      if (seqEditorOpen?.assignTo === "global") {
        setEditingFlow(f => f ? { ...f, sequence_id: saved.id } : f);
      } else if (seqEditorOpen?.assignTo === "country") {
        // Se abre su grilla de países: acabar de crearla y no ver dónde asignarla dejaba el
        // trabajo a medias, sin ninguna pista de cuál era el paso siguiente.
        setExpandedCountrySeqId(saved.id);
      }
      toast.success(editingSeq.status === "published" ? "Secuencia actualizada" : "Secuencia publicada");
      closeSeqEditor();
    } catch (e: any) {
      toast.error(e?.message?.slice(0, 120) ?? "Error al guardar la secuencia");
    } finally { setSavingFlowStep(false); }
  };

  const startNewFlow = () => {
    setTriggerValidation(null);
    setEditingFlow(newDraftFlow());
    setFlowUsageMode("global");
    setCountryRows([]);
    setExpandedCountrySeqId(null);
    setSeqEditorOpen(null);
    setEditingSeq(null);
    setFlowWizardStep(1);
  };

  const openFlowForEdit = (flow: CrmWaFlow) => {
    setTriggerValidation(null);
    setEditingFlow({
      id: flow.id, name: flow.name, trigger_text: flow.trigger_text, sequence_id: flow.sequence_id,
      final_action: flow.final_action, is_active: flow.is_active, trigger_once: flow.trigger_once ?? true,
      flow_trigger_type: (flow.flow_trigger_type === "new_conversation" ? "new_conversation" : "intent") as DraftFlow["flow_trigger_type"],
      country_sequences: flow.country_sequences ?? [],
      status: flow.status ?? "published",
      draft_step: flow.draft_step ?? 3,
    });
    setFlowUsageMode((flow.country_sequences?.length ?? 0) > 0 ? "country" : "global");
    setCountryRows(groupCountrySequences(flow.country_sequences ?? []));
    setExpandedCountrySeqId(null);
    setSeqEditorOpen(null);
    setEditingSeq(null);
    setFlowWizardStep(flow.status === "draft" ? ((flow.draft_step as 1 | 2 | 3) || 1) : 1);
  };

  const closeFlowWizard = () => {
    setFlowWizardStep(null);
    setEditingFlow(null);
    setSeqEditorOpen(null);
    setEditingSeq(null);
  };

  const handleFlowStep1Continue = async () => {
    if (!editingFlow) return;
    if (!editingFlow.name.trim()) { toast.error("Ponle un nombre al flujo"); return; }
    if (editingFlow.flow_trigger_type === "intent") {
      if (!editingFlow.trigger_text.trim()) { toast.error("Describe cuándo se activa el flujo"); return; }
      const validation = triggerValidation ?? classifyTrigger(editingFlow.trigger_text.trim());
      if (!triggerValidation) setTriggerValidation(validation);
      if (validation.severity === "invalid") { toast.error("Corrige el trigger antes de continuar."); return; }
    }
    setSavingFlowStep(true);
    try {
      const saved = await upsertFlow.mutateAsync({ ...editingFlow, draft_step: editingFlow.status === "published" ? editingFlow.draft_step : 2 });
      setEditingFlow(f => f ? { ...f, id: saved.id, status: saved.status, draft_step: saved.draft_step } : f);
      setFlowWizardStep(2);
    } catch (e: any) {
      toast.error(e?.message?.slice(0, 120) ?? "Error al guardar el flujo");
    } finally { setSavingFlowStep(false); }
  };

  // Qué le falta al flujo para poder publicarse (null = está listo). Un solo lugar, usado tanto al
  // pasar del paso 2 como al publicar desde el 3.
  const flowPublishProblem = (): string | null => {
    if (!editingFlow) return "No hay flujo para publicar";
    if (!editingFlow.name.trim()) return "Ponle un nombre al flujo";
    if (editingFlow.flow_trigger_type === "intent" && !editingFlow.trigger_text.trim()) {
      return "Describe cuándo se activa el flujo";
    }
    if (flowUsageMode === "global") {
      if (!editingFlow.sequence_id) return "Elige la secuencia que enviará este flujo";
      // La secuencia pudo borrarse mientras el flujo estaba en borrador.
      if (!sequences.some(sq => sq.id === editingFlow.sequence_id)) return "La secuencia elegida ya no existe. Elige otra.";
    } else {
      if (countryRows.length === 0) return "Elige al menos una secuencia para este flujo";
      const sinPaises = countryRows.find(r => r.country_codes.length === 0);
      if (sinPaises) {
        const nombre = sequences.find(sq => sq.id === sinPaises.sequence_id)?.name ?? "Una secuencia elegida";
        return `"${nombre}" no tiene países asignados. Elige sus países o quítala del flujo.`;
      }
      if (countryRows.some(r => !sequences.some(sq => sq.id === r.sequence_id))) {
        return "Una de las secuencias elegidas ya no existe. Revisa la lista.";
      }
    }
    return null;
  };

  const handleFlowStep2Continue = async () => {
    if (!editingFlow?.id) return;
    const problem = flowPublishProblem();
    if (problem) { toast.error(problem); return; }
    setSavingFlowStep(true);
    try {
      const savedFlow = await upsertFlow.mutateAsync({
        ...editingFlow,
        sequence_id: flowUsageMode === "global" ? editingFlow.sequence_id : null,
        country_sequences: flowUsageMode === "country" ? flattenCountryRows(countryRows) : [],
        draft_step: editingFlow.status === "published" ? editingFlow.draft_step : 3,
      });
      setEditingFlow(f => f ? {
        ...f,
        sequence_id: flowUsageMode === "global" ? f.sequence_id : null,
        country_sequences: flowUsageMode === "country" ? flattenCountryRows(countryRows) : [],
        status: savedFlow.status, draft_step: savedFlow.draft_step,
      } : f);
      setFlowWizardStep(3);
    } catch (e: any) {
      toast.error(e?.message?.slice(0, 120) ?? "Error al guardar el flujo");
    } finally { setSavingFlowStep(false); }
  };

  const handleFlowPublish = async () => {
    if (!editingFlow?.id) return;
    // Se revalida acá y no solo al pasar de paso: un borrador se reanuda en el paso donde quedó, así
    // que se puede llegar directo al paso 3 sin haber pasado nunca por la validación del paso 2. Sin
    // esto se podía publicar un flujo activo sin secuencia, que se dispara y no envía nada.
    const problem = flowPublishProblem();
    if (problem) { toast.error(problem); return; }
    setSavingFlowStep(true);
    try {
      await upsertFlow.mutateAsync({ ...editingFlow, status: "published", draft_step: 3 });
      toast.success(editingFlow.status === "published" ? "Flujo actualizado" : "Flujo publicado");
      closeFlowWizard();
    } catch (e: any) {
      toast.error(e?.message?.slice(0, 120) ?? "Error al guardar el flujo");
    } finally { setSavingFlowStep(false); }
  };

  const [triggerValidation, setTriggerValidation] = useState<{ severity: "valid" | "warn" | "invalid"; category: string | null; reason: string } | null>(null);
  const upsert = useUpsertAIAgentConfig();
  const { data: allProducts = [] } = useProducts();
  const { data: allServices = [] } = useServices();
  const { data: allCourses  = [] } = useCourses();
  const [editingSeq, setEditingSeq] = useState<DraftSequence | null>(null);
  // Autoguardado del borrador: la instantánea es lo último que quedó guardado (o lo que había al
  // abrir), para no reescribir en la base cada vez que el componente se vuelve a renderizar.
  const autosaveSnapshot = useRef<string | null>(null);
  const autosaveInFlight = useRef(false);
  // Un cambio hecho MIENTRAS se está guardando se anota acá: sin esto se perdía hasta la siguiente
  // edición (el guardado en curso marcaba como guardada una instantánea ya vieja y el efecto no se
  // volvía a disparar solo). El tick fuerza esa nueva vuelta.
  const autosavePending = useRef(false);
  const [autosaveTick, setAutosaveTick] = useState(0);
  const [draftSaveState, setDraftSaveState] = useState<"idle" | "saving" | "saved">("idle");

  // Autoguardado en borrador: cada cambio del editor se persiste solo, con un respiro de 1,2 s para
  // no escribir en cada tecla. Escribe SIEMPRE en `draft_steps`, nunca en `steps` — así una secuencia
  // que un flujo activo ya está usando sigue corriendo su versión publicada mientras se la edita, y
  // el trabajo a medio hacer (con botones sin conectar incluidos) nunca llega a un cliente real.
  useEffect(() => {
    if (!seqEditorOpen || !editingSeq) return;
    const snapshot = JSON.stringify({ name: editingSeq.name, steps: editingSeq.steps });
    if (autosaveSnapshot.current === null) { autosaveSnapshot.current = snapshot; return; }
    if (autosaveSnapshot.current === snapshot) return;
    // Todavía no hay nada que valga la pena guardar (secuencia recién abierta y vacía).
    if (!editingSeq.name.trim() && editingSeq.steps.length === 0) return;

    const timer = setTimeout(async () => {
      // Dos guardados en paralelo sin id crearían DOS secuencias, y con id podrían llegar fuera de
      // orden: se deja pasar solo uno por vez y el que quedó afuera se reintenta al terminar.
      if (autosaveInFlight.current) { autosavePending.current = true; return; }
      autosaveInFlight.current = true;
      setDraftSaveState("saving");
      try {
        const saved = await upsertSequence.mutateAsync({
          id: editingSeq.id,
          name: editingSeq.name.trim() || "Secuencia sin nombre",
          draft_steps: editingSeq.steps,
          // Una secuencia nueva nace como borrador: no debe poder asignarse a un flujo hasta publicarse.
          ...(editingSeq.id ? {} : { status: "draft" as const }),
        });
        autosaveSnapshot.current = snapshot;
        if (!editingSeq.id) setEditingSeq(seq => seq ? { ...seq, id: saved.id, status: saved.status } : seq);
        setDraftSaveState("saved");
      } catch {
        setDraftSaveState("idle"); // se reintenta con el próximo cambio
      } finally {
        autosaveInFlight.current = false;
        if (autosavePending.current) { autosavePending.current = false; setAutosaveTick(t => t + 1); }
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [editingSeq, seqEditorOpen, autosaveTick]); // eslint-disable-line react-hooks/exhaustive-deps
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
  const [canServices, setCanServices]                 = useState(true);
  const [canTransfer, setCanTransfer]                 = useState(false);
  const [autoDetectPaymentsSP, setAutoDetectPaymentsSP] = useState(false);
  const [physicalProductsModeSP, setPhysicalProductsModeSP] = useState<"all"|"selected"|"none">("none");
  const [digitalProductsModeSP, setDigitalProductsModeSP]   = useState<"all"|"selected"|"none">("none");
  const [spSelectedProductIds, setSpSelectedProductIds] = useState<string[]>([]);
  const [spServicesMode, setSpServicesMode]           = useState<"all"|"selected"|"none">("none");
  const [spSelectedServiceIds, setSpSelectedServiceIds] = useState<string[]>([]);
  const [spCoursesMode, setSpCoursesMode]             = useState<"all"|"selected"|"none">("none");
  const [spSelectedCourseIds, setSpSelectedCourseIds] = useState<string[]>([]);
  // Config estratégica B15-1
  const [agentPersonalitySP, setAgentPersonalitySP]   = useState("");
  const [responseLengthSP, setResponseLengthSP]       = useState("normal");
  const [emojiLevelSP, setEmojiLevelSP]               = useState("poco");
  const [showCatalogOnAsk, setShowCatalogOnAsk]       = useState(true);
  const [doUpsell, setDoUpsell]                       = useState(false);
  const [applyDiscounts, setApplyDiscounts]           = useState(true);
  // Label form state
  const [showNewLabelForm, setShowNewLabelForm] = useState(false);
  const [newLabelName, setNewLabelName]         = useState("");
  const [newLabelColor, setNewLabelColor]       = useState(LABEL_COLORS[0]);
  const [newLabelHint, setNewLabelHint]         = useState("");
  const [newLabelRemoveHint, setNewLabelRemoveHint] = useState("");
  const [editingLabel, setEditingLabel]         = useState<{ id: string; name: string; color: string; hint: string | null; remove_hint: string | null } | null>(null);
  const [showNewQrForm, setShowNewQrForm]       = useState(false);
  const [newQrShortcut, setNewQrShortcut]       = useState("");
  const [newQrContent, setNewQrContent]         = useState("");
  const [newQrMediaUrl, setNewQrMediaUrl]       = useState<string | null>(null);
  const [newQrMediaType, setNewQrMediaType]     = useState<string | null>(null);
  const [newQrMediaFilename, setNewQrMediaFilename] = useState<string | null>(null);
  const [newQrUploading, setNewQrUploading]     = useState(false);
  const newQrFileRef                            = useRef<HTMLInputElement>(null);
  const [editingQr, setEditingQr]               = useState<CrmQuickReply | null>(null);
  const editingQrFileRef                        = useRef<HTMLInputElement>(null);
  const [editingQrUploading, setEditingQrUploading] = useState(false);
  const [improvingHintNew, setImprovingHintNew]       = useState(false);
  const [improvingHintEdit, setImprovingHintEdit]     = useState(false);
  const [improvingRemoveNew, setImprovingRemoveNew]   = useState(false);
  const [improvingRemoveEdit, setImprovingRemoveEdit] = useState(false);
  const [section, setSection]             = useState<"conexion"|"agente"|"perfil"|"etiquetas"|"respuestas"|"flujos"|"plantillas"|"campanias">("conexion");
  const [mobileShowSection, setMobileShowSection] = useState(false);
  const initialized                       = useRef(false);
  // Evita que los toggles animen "encendiéndose" al cargar la config guardada — la transición
  // solo se habilita después de que el estado inicial ya se pintó sin cambios pendientes.
  const [switchesReady, setSwitchesReady] = useState(false);
  // Snapshot de los campos de "Conexión"/"Agente IA" tal como están guardados — habilita
  // "Guardar cambios" solo cuando el estado actual difiere de este snapshot.
  const [savedConexionAgenteSnapshot, setSavedConexionAgenteSnapshot] = useState(() => JSON.stringify({
    phoneNumberId: "", accessToken: "", wabaId: "", appSecret: "",
    systemPrompt: "", schedulingCalendarId: "", canServices: true, canTransfer: false,
    autoDetectPaymentsSP: false, physicalProductsModeSP: "none", digitalProductsModeSP: "none",
    spSelectedProductIds: [] as string[], spServicesMode: "none", spSelectedServiceIds: [] as string[],
    spCoursesMode: "none", spSelectedCourseIds: [] as string[], agentPersonalitySP: "",
    responseLengthSP: "normal", emojiLevelSP: "poco", doUpsell: false, applyDiscounts: true,
  }));

  // Una rama = una arista saliente de una pregunta, es decir un botón con texto. `targetId` null
  // significa que ese botón todavía no tiene destino (se dibuja como el recuadro "+ crear paso").
  // Todo por id: ni índices del arreglo ni el texto del botón (dos botones pueden repetirlo).
  const activeBranches = useMemo(() => {
    type Branch = { label: string; questionId: string; optionId: string; targetId: string | null };
    if (!editingSeq) return [] as Branch[];
    const ids = new Set(editingSeq.steps.map(s => s.id));
    const result: Branch[] = [];
    for (const s of editingSeq.steps) {
      if (s.type !== "question") continue;
      for (const o of s.options ?? []) {
        if (!o.label.trim()) continue;
        result.push({
          label: o.label,
          questionId: s.id,
          optionId: o.id,
          // Una referencia colgante (a un paso ya borrado) cuenta como "sin destino": mejor
          // mostrarla como rama pendiente que como un callejón sin salida invisible.
          targetId: o.next_step_id && ids.has(o.next_step_id) ? o.next_step_id : null,
        });
      }
    }
    return result;
  }, [editingSeq]);

  // Salidas de una pregunta que no llevan a ningún paso. En WhatsApp esto le deja al contacto un
  // botón que, al tocarlo, no responde nada y corta la conversación en seco — así que bloquean el
  // guardado en vez de publicarse rotas. Cada issue apunta al botón exacto para poder resolverlo
  // de un toque desde el aviso.
  const sequenceIssues = useMemo(() => {
    if (!editingSeq) return [] as { questionId: string; optionId?: string; text: string }[];
    const stepNumber = new Map(editingSeq.steps.map((s, i) => [s.id, i + 1]));
    const issues: { questionId: string; optionId?: string; text: string }[] = [];
    for (const s of editingSeq.steps) {
      if (s.type !== "question") continue;
      const branches = activeBranches.filter(b => b.questionId === s.id);
      if (branches.length === 0) {
        // Sin ningún botón con texto la pregunta no tiene salidas: el contacto responde y no pasa nada.
        issues.push({ questionId: s.id, text: `Paso ${stepNumber.get(s.id)} · la pregunta no tiene botones` });
        continue;
      }
      for (const b of branches) {
        if (!b.targetId) {
          issues.push({ questionId: s.id, optionId: b.optionId, text: `Paso ${stepNumber.get(s.id)} · botón "${b.label}" sin respuesta` });
        }
      }
    }
    return issues;
  }, [editingSeq, activeBranches]);

  // Paso seleccionado en el árbol — su editor se muestra debajo (modelo árbol-primero: ya no
  // hay lista lineal con drag-and-drop, el árbol ES el lienzo principal).
  const [treeSelectedStepId, setTreeSelectedStepId] = useState<string | null>(null);
  const flashStep = (id: string) => setTreeSelectedStepId(id);

  // Qué paso se está creando desde el árbol — se resuelve al elegir el tipo en el selector
  // (ver <PendingStepCreate>), en vez de crear directo con tipo "message" por defecto.
  const [pendingStepCreate, setPendingStepCreate] = useState<PendingStepCreate | null>(null);
  // Punto del árbol desde el que se puede crear un paso NUEVO o CONECTAR a uno ya existente
  // (comparte un nodo resultado con otra rama, sin duplicar contenido) — tocar un botón
  // pendiente, o el "+" de continuar tras un nodo hoja, abren el mismo flujo de elección.
  type ConnectFlowSource =
    | { kind: "option"; questionStepId: string; optionId: string }
    | { kind: "after"; afterStepId: string };
  const [pendingConnectFlow, setPendingConnectFlow] = useState<ConnectFlowSource | null>(null);
  // Conexión YA existente que se tocó (el círculo al final de la línea) — igual que
  // pendingConnectFlow pero para gestionar un enlace que ya tiene destino: cambiarlo o quitarlo.
  // Se toca en vez de arrastrar — más simple y funciona igual en mobile.
  const [pendingEdgeManage, setPendingEdgeManage] = useState<EdgeManageSource | null>(null);
  // "Modo conexión": elegir el paso destino tocándolo DIRECTO EN EL LIENZO en vez de buscarlo en
  // una lista. Mientras está activo, el árbol resalta con un halo los pasos a los que sí se puede
  // conectar, atenúa el resto y desactiva el resto de acciones — conectar es una operación
  // espacial ("de acá hasta allá"), y verla sobre el mismo dibujo evita tener que traducir
  // mentalmente entre "Paso 6" de una lista y el nodo del árbol.
  // currentTargetId: destino actual al cambiar una conexión ya existente (no se ofrece de nuevo).
  const [pickingTarget, setPickingTarget] = useState<{ source: EdgeManageSource; currentTargetId: string | null } | null>(null);
  // Paso a eliminar cuando tiene contenido en el árbol que depende solo de él (una rama entera,
  // o lo que sigue después de la cabeza de una rama) — se pide elegir entre borrar todo o
  // unificar (borrar solo este paso y conectar directo lo anterior con lo siguiente).
  // unifySuccessorId: string | null = unificar disponible, conecta a ese id (o a nada si null);
  // undefined = unificar no está disponible (el paso tiene 2+ ramas reales, sin un único "siguiente").
  const [pendingDeleteStep, setPendingDeleteStep] = useState<{
    id: string; cascadeIds: string[]; unifySuccessorId: string | null | undefined;
    branchOptions?: { label: string; successorId: string; discardedIds: string[] }[];
  } | null>(null);
  // Botón a eliminar cuando tiene un paso enlazado que depende solo de él.
  const [pendingDeleteOption, setPendingDeleteOption] = useState<{ questionId: string; optionId: string; orphanIds: string[] } | null>(null);

  // Crea un paso nuevo y lo enlaza al toque a un botón de pregunta que todavía no tiene
  // destino — evita el ida-y-vuelta de crear el paso abajo y luego volver a la pregunta
  // para enlazarlo.
  const createLinkedStepForOption = (questionStepId: string, optionId: string, type: SequenceStep["type"]) => {
    const inserted = newStep(type);
    setEditingSeq(seq => seq ? {
      ...seq,
      // Se agrega al final (el arreglo nunca se reordena) y se enlaza por el id propio del botón,
      // nunca por texto ni posición: 2 botones de una misma pregunta pueden tener el mismo texto.
      steps: stepsWithRewiredOption([...seq.steps, inserted], questionStepId, optionId, inserted.id),
    } : seq);
    flashStep(inserted.id);
  };

  // Primer paso de una secuencia vacía — dispara el prompt inicial cuando aún no hay árbol.
  const createFirstStep = (type: SequenceStep["type"]) => {
    const inserted = newStep(type);
    setEditingSeq(s => s ? { ...s, steps: [inserted] } : s);
    flashStep(inserted.id);
  };

  // Agrega un paso a continuación de uno existente (nodo "hoja" del árbol, sin hijos aún): nodo
  // nuevo al final del arreglo + arista explícita desde `afterStepId` hacia él. Nada más se toca,
  // así que ningún otro paso cambia de número ni de conexiones.
  const insertStepAfter = (afterStepId: string, type: SequenceStep["type"]) => {
    const inserted = newStep(type);
    setEditingSeq(seq => seq ? {
      ...seq,
      steps: [...seq.steps, inserted].map(s => s.id === afterStepId ? { ...s, next_step_id: inserted.id } : s),
    } : seq);
    flashStep(inserted.id);
  };

  // Aplica (crea, cambia o quita) el destino de una conexión manejable — un solo lugar usado
  // tanto para enlazarla la primera vez (desde un botón pendiente o un paso hoja) como para
  // cambiarla o quitarla después (tocando el círculo al final de la línea ya existente). Fijar
  // el enlace de un paso normal (`kind: "step"`) no inserta ningún nodo de más: el paso que ya
  // llevaba a `afterStepId`/`stepId` sigue enlazado exactamente igual, esto solo agrega o mueve
  // la conexión saliente de este paso puntual — puede terminar con 2+ padres en el destino.
  const applyEdgeTarget = (source: EdgeManageSource, newTargetId: string | null) => {
    setEditingSeq(seq => seq ? { ...seq, steps: stepsWithEdgeTarget(seq.steps, source, newTargetId) } : seq);
    if (newTargetId) flashStep(source.kind === "option" ? source.questionId : source.stepId);
  };

  // Ids que quedarían sin conexión si se cambia o quita esta conexión — mismo criterio de "rama
  // suelta" que ya usan el borrado de pasos y de botones.
  const computeEdgeChangeOrphans = (source: EdgeManageSource, newTargetId: string | null): string[] => {
    if (!editingSeq) return [];
    const before = getReachableStepIds(editingSeq.steps);
    const after = getReachableStepIds(stepsWithEdgeTarget(editingSeq.steps, source, newTargetId));
    return [...before].filter(id => !after.has(id));
  };

  // Describe "de cuál conexión estamos hablando" en texto plano — imprescindible cuando 2+ ramas
  // comparten un nodo resultado, para no depender de adivinar cuál círculo es cuál en el lienzo.
  const describeEdgeSource = (source: EdgeManageSource): { text: string; currentTargetId: string | null } | null => {
    if (!editingSeq) return null;
    const fromStepId = source.kind === "option" ? source.questionId : source.stepId;
    const fromStep = editingSeq.steps.find(s => s.id === fromStepId);
    if (!fromStep) return null;
    const fromIdx = editingSeq.steps.indexOf(fromStep);
    const fromPreview = getStepPreview(fromStep, 26);
    const option = source.kind === "option" ? fromStep.options?.find(o => o.id === source.optionId) : null;
    const currentTargetId = source.kind === "option" ? (option?.next_step_id ?? null) : (fromStep.next_step_id ?? null);
    const toStep = currentTargetId ? editingSeq.steps.find(s => s.id === currentTargetId) : null;
    const toIdx = toStep ? editingSeq.steps.indexOf(toStep) : -1;
    const toPreview = toStep ? getStepPreview(toStep, 26) : null;
    const fromLabel = `Paso ${fromIdx + 1}${option ? ` · botón "${option.label}"` : ""} (${STEP_TYPE_LABELS[fromStep.type]}${fromPreview ? `: ${fromPreview}` : ""})`;
    const toLabel = toStep ? `Paso ${toIdx + 1} (${STEP_TYPE_LABELS[toStep.type]}${toPreview ? `: ${toPreview}` : ""})` : "todavía sin conectar";
    return { text: `${fromLabel} → ${toLabel}`, currentTargetId };
  };

  // Intercala un paso nuevo en medio de una conexión ya existente (el "+" sobre la línea): el
  // nodo nuevo se agrega al final del arreglo, la arista `from → to` pasa a apuntarle, y él toma
  // `to` como destino. Si el paso intercalado es una Pregunta no puede heredar `to` por su arista
  // propia (una pregunta navega por botones), así que nace con un botón que va a `to` — si no, todo
  // lo que colgaba de esa conexión quedaría suelto.
  const insertStepOnEdge = (fromId: string, toId: string, optionId: string | undefined, type: SequenceStep["type"]) => {
    const base = newStep(type);
    const inserted: SequenceStep = type === "question"
      ? { ...base, options: [{ id: crypto.randomUUID(), label: "Opción 1", next_step_id: toId }] }
      : { ...base, next_step_id: toId };
    setEditingSeq(seq => {
      if (!seq) return seq;
      if (!seq.steps.some(s => s.id === toId)) return seq;
      const steps = [...seq.steps, inserted];
      return {
        ...seq,
        steps: optionId
          ? stepsWithRewiredOption(steps, fromId, optionId, inserted.id)
          : steps.map(st => st.id === fromId && st.next_step_id === toId ? { ...st, next_step_id: inserted.id } : st),
      };
    });
    flashStep(inserted.id);
  };

  // Resuelve la creación pendiente una vez el usuario elige el tipo de paso en el selector.
  const resolvePendingStepCreate = (type: SequenceStep["type"]) => {
    const pending = pendingStepCreate;
    if (!pending) return;
    setPendingStepCreate(null);
    if (pending.kind === "first") createFirstStep(type);
    else if (pending.kind === "after") insertStepAfter(pending.afterStepId, type);
    else if (pending.kind === "edge") insertStepOnEdge(pending.fromId, pending.toId, pending.optionId, type);
    else if (pending.kind === "option") createLinkedStepForOption(pending.questionStepId, pending.optionId, type);
  };

  // Calcula qué pasa si se elimina un paso:
  // - `cascadeIds`: ids que dependen únicamente de él (todas sus ramas, si es una pregunta con
  //   ramas reales; o lo que sigue después de él, si es la cabeza de una rama) — se pierden con
  //   él si se elige "eliminar todo".
  // - `unifySuccessorId`: a qué paso reconectar lo anterior si en vez de eso se elige "unificar"
  //   (borrar SOLO este paso, sin tocar el resto): un id concreto, `null` si no tiene siguiente
  //   (queda sin conectar), o `undefined` si no hay un único "siguiente" posible (pregunta con
  //   2+ ramas reales — ahí no se ofrece unificar liso, sino `branchOptions`).
  // - `branchOptions`: solo si es una pregunta con 2+ ramas reales — una opción por rama para
  //   CONSERVARLA (reconectando lo anterior directo a ella, sin importar si es una cadena larga
  //   sin bifurcaciones o una sub-rama con más preguntas adentro) mientras se descartan las demás.
  const computeDeletionImpact = (stepId: string): {
    cascadeIds: string[];
    unifySuccessorId: string | null | undefined;
    branchOptions?: { label: string; successorId: string; discardedIds: string[] }[];
  } => {
    if (!editingSeq) return { cascadeIds: [], unifySuccessorId: undefined };
    const steps = editingSeq.steps;
    const step = steps.find(s => s.id === stepId);
    if (!step) return { cascadeIds: [], unifySuccessorId: undefined };

    // Basado en alcanzabilidad real del grafo (mismo mecanismo que las validaciones de "rama
    // suelta" del borrado de botones y el arrastre de conexiones) en vez de rangos de índices del
    // arreglo — más simple y sin los casos límite de la versión anterior (que necesitó un parche
    // especial tras un bug real donde un id que una rama elegía CONSERVAR terminaba también en su
    // propia lista de descarte).
    const reachableBefore = getReachableStepIds(steps);
    // Simula "borrar este paso y reconectar lo que apuntaba a él hacia `successorId`" (o
    // desconectarlo si es null) — sirve tanto para "eliminar todo" (successorId=null) como para
    // calcular, por cada rama posible, qué queda huérfano si esa rama es la que se conserva.
    const reachableIfRewiredTo = (successorId: string | null): Set<string> =>
      getReachableStepIds(stepsAfterDeleting(steps, stepId, [], successorId));

    const reachableAfterFullDelete = reachableIfRewiredTo(null);
    const cascadeIds = [...reachableBefore].filter(id => id !== stepId && !reachableAfterFullDelete.has(id));

    let unifySuccessorId: string | null | undefined;
    let branchOptions: { label: string; successorId: string; discardedIds: string[] }[] | undefined;

    if (step.type === "question") {
      // Destinos distintos: 2 botones que llevan al mismo paso son una sola opción de "conservar".
      const realBranches = activeBranches
        .filter(b => b.questionId === stepId && b.targetId)
        .filter((b, i, arr) => arr.findIndex(x => x.targetId === b.targetId) === i);
      if (realBranches.length === 1) {
        unifySuccessorId = realBranches[0].targetId ?? null;
      } else if (realBranches.length > 1) {
        unifySuccessorId = undefined;
        branchOptions = realBranches.map(b => {
          const successorId = b.targetId!;
          const reachableKeepingThis = reachableIfRewiredTo(successorId);
          const discardedIds = [...reachableBefore].filter(id => id !== stepId && id !== successorId && !reachableKeepingThis.has(id));
          return { label: b.label, successorId, discardedIds };
        });
      } else {
        unifySuccessorId = null; // pregunta sin ramas reales — no tiene "siguiente"
      }
    } else {
      unifySuccessorId = step.next_step_id ?? null;
    }

    return { cascadeIds, unifySuccessorId, branchOptions };
  };

  // Elimina un paso: siempre quita `stepId` + `discardedIds` (lo que se pierde con él), y
  // reconecta cualquier opción que apuntara a `stepId` hacia `successorId` (o la desenlaza si es
  // `null`). Cubre los 3 casos del diálogo: "eliminar todo" (discardedIds = cascadeIds,
  // successorId = null), "unificar" (discardedIds = [], successorId = unifySuccessorId) y
  // "conservar esta rama" (discardedIds = las otras ramas, successorId = la rama elegida).
  const deleteStepWithRewire = (stepId: string, discardedIds: string[], successorId: string | null) => {
    setEditingSeq(s => s ? { ...s, steps: stepsAfterDeleting(s.steps, stepId, discardedIds, successorId) } : s);
    setTreeSelectedStepId(successorId);
    setPendingDeleteStep(null);
  };

  // Ids que dependen únicamente de un botón específico (no del paso Pregunta completo) — se
  // pierden si se borra ese botón desde el editor. Mismo criterio de "rama suelta" que ya se usa
  // al borrar un paso o al reconectar una conexión por arrastre.
  const computeOptionDeletionOrphans = (questionId: string, optionId: string): string[] => {
    if (!editingSeq) return [];
    const before = getReachableStepIds(editingSeq.steps);
    const hypothetical = editingSeq.steps.map(st => st.id !== questionId ? st : { ...st, options: (st.options ?? []).filter(o => o.id !== optionId) });
    const after = getReachableStepIds(hypothetical);
    return [...before].filter(id => !after.has(id));
  };

  // Quita el botón `optionId` de `questionId` y, si tenía contenido que dependía solo de él,
  // también ese contenido — así nunca queda una rama suelta invisible en el árbol.
  const deleteOptionWithCascade = (questionId: string, optionId: string, orphanIds: string[]) => {
    setEditingSeq(s => {
      if (!s) return s;
      const withOptionRemoved = s.steps.map(st => st.id !== questionId ? st : { ...st, options: (st.options ?? []).filter(o => o.id !== optionId) });
      return { ...s, steps: stepsWithoutIds(withOptionRemoved, new Set(orphanIds)) };
    });
    setPendingDeleteOption(null);
  };

  // Agrega un botón nuevo a una pregunta directo desde el árbol (sin abrir su editor) — queda
  // sin enlazar (aparece como placeholder pendiente) y se selecciona la pregunta para que el
  // usuario le ponga un texto real al botón desde su panel de edición.
  const addOptionToQuestion = (questionId: string) => {
    setEditingSeq(seq => {
      if (!seq) return seq;
      const steps = seq.steps.map(s => {
        if (s.id !== questionId) return s;
        // Evita repetir un texto ya usado (ej. tras borrar "Opción 1" y agregar uno nuevo, el
        // conteo simple volvería a proponer "Opción 2" si ya existe) — 2 botones con el mismo
        // texto confunden al usuario final de WhatsApp, aunque ya no rompan el enlazado interno.
        const existingLabels = new Set((s.options ?? []).map(o => o.label));
        let n = (s.options?.length ?? 0) + 1;
        while (existingLabels.has(`Opción ${n}`)) n++;
        return { ...s, options: [...(s.options ?? []), { id: crypto.randomUUID(), label: `Opción ${n}`, next_step_id: null }] };
      });
      return { ...seq, steps };
    });
    setTreeSelectedStepId(questionId);
  };

  const sequenceGraph = useMemo(() => {
    if (!editingSeq || editingSeq.steps.length === 0) return null;
    return buildSequenceGraph(editingSeq.steps);
  }, [editingSeq]);

  // Punto de llegada de cada conexión sobre la caja del paso destino: cuando varias terminan en el
  // mismo paso se reparten en vertical, EN EL MISMO ORDEN de arriba hacia abajo en que salen sus
  // orígenes (ver incomingEdgesInVisualOrder) — así el círculo de más arriba siempre corresponde a
  // la rama de más arriba, y el diálogo de gestión lista los caminos en ese mismo orden.
  const edgePorts = useMemo(() => {
    const ports = new Map<number, number>(); // índice de arista → desplazamiento vertical
    if (!sequenceGraph) return ports;
    for (const targetId of new Set(sequenceGraph.edges.map(e => e.toId))) {
      const incoming = incomingEdgesInVisualOrder(sequenceGraph, targetId);
      if (incoming.length < 2) continue;
      const gap = edgePortGap(incoming.length);
      incoming.forEach(({ index }, i) => ports.set(index, (i - (incoming.length - 1) / 2) * gap));
    }
    return ports;
  }, [sequenceGraph]);

  // Geometría de cada arista, calculada una sola vez: la usan las DOS capas del lienzo (las líneas,
  // que van detrás de los nodos, y los controles tocables, que van siempre delante).
  const edgeGeometry = useMemo(() => {
    if (!sequenceGraph) return [];
    return sequenceGraph.edges.flatMap((edge, ei) => {
      const from = sequenceGraph.nodes.find(n => n.id === edge.fromId);
      const to = sequenceGraph.nodes.find(n => n.id === edge.toId);
      if (!from || !to) return [];
      const sx = from.depth * SEQ_TREE_COL_PITCH + SEQ_TREE_NODE_W;
      const sy = edgeSourceY(from, edge.colorIdx);
      const tx = to.depth * SEQ_TREE_COL_PITCH;
      // Varias conexiones pueden terminar en el mismo paso. En vez de superponerlas en un único
      // punto (donde solo la de encima sería tocable), cada una llega a su propio punto sobre el
      // borde del destino, repartidos de arriba hacia abajo en el orden visual de sus orígenes.
      const py = to.lane * SEQ_TREE_ROW_PITCH + SEQ_TREE_NODE_H / 2 + (edgePorts.get(ei) ?? 0);
      return [{
        edge, ei, to,
        sx, sy, tx, py,
        midX: (sx + tx) / 2,
        midY: (sy + py) / 2,
        color: edge.colorIdx !== undefined ? BRANCH_COLORS[edge.colorIdx % BRANCH_COLORS.length].hex : "currentColor",
      }];
    });
  }, [sequenceGraph, edgePorts]);

  // Pasos a los que se puede conectar mientras el lienzo está en modo conexión: solo los de un
  // nivel estrictamente más profundo que el origen (ver canConnectForward — con eso alcanza para
  // que nunca se pueda cerrar un ciclo), y nunca el destino que esa conexión ya tiene.
  const pickableTargetIds = useMemo(() => {
    if (!pickingTarget || !sequenceGraph) return new Set<string>();
    const sourceId = pickingTarget.source.kind === "option" ? pickingTarget.source.questionId : pickingTarget.source.stepId;
    return new Set(
      sequenceGraph.nodes
        .filter(n => !n.pending && n.id !== pickingTarget.currentTargetId && canConnectForward(sequenceGraph.nodes, sourceId, n.id))
        .map(n => n.id),
    );
  }, [pickingTarget, sequenceGraph]);

  // Abre el modo conexión para una arista concreta, cerrando el diálogo desde el que se llamó.
  const startPickingTarget = (source: EdgeManageSource, currentTargetId: string | null) => {
    setPendingConnectFlow(null);
    setPendingEdgeManage(null);
    setPickingTarget({ source, currentTargetId });
  };

  // Confirma el destino tocado en el lienzo. La validación de "rama suelta" es la misma que tenía
  // la lista: si mover esta conexión dejaría contenido sin forma de llegar, no se aplica.
  const confirmPickedTarget = (targetId: string) => {
    if (!pickingTarget) return;
    const orphaned = computeEdgeChangeOrphans(pickingTarget.source, targetId);
    if (orphaned.length > 0) {
      toast.error(`Si conectas aquí, ${orphaned.length} paso${orphaned.length !== 1 ? "s quedarían" : " quedaría"} sin forma de llegar. Reconéctalo${orphaned.length !== 1 ? "s" : ""} o bórralo${orphaned.length !== 1 ? "s" : ""} primero.`);
      return;
    }
    applyEdgeTarget(pickingTarget.source, targetId);
    setPickingTarget(null);
  };

  // Perfil de WhatsApp
  const [bio, setBio]                     = useState("");
  const [savedBio, setSavedBio]           = useState("");
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingBio, setSavingBio]         = useState(false);
  const [savedAgentName, setSavedAgentName] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef                     = useRef<HTMLInputElement>(null);

  const uploadQrMedia = async (
    file: File,
    setUrl: (v: string | null) => void,
    setType: (v: string | null) => void,
    setFilename: (v: string | null) => void,
    setUploading: (v: boolean) => void,
  ) => {
    if (!user?.id) return;
    setUploading(true);
    try {
      const uploadFile = await normalizeImageForWhatsApp(file);
      const ext = uploadFile.name.split(".").pop() ?? "bin";
      const path = `${user.id}/quick-replies/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("chat-attachments").upload(path, uploadFile);
      if (uploadErr) { toast.error("Error al subir el archivo"); return; }
      const { data: urlData } = supabase.storage.from("chat-attachments").getPublicUrl(path);
      const mediaType = uploadFile.type.startsWith("image/") ? "image" : uploadFile.type.startsWith("video/") ? "video" : "document";
      setUrl(urlData.publicUrl);
      setType(mediaType);
      setFilename(uploadFile.name);
    } catch { toast.error("Error al subir el archivo"); }
    finally { setUploading(false); }
  };

  useEffect(() => {
    if (!config || initialized.current) return;
    initialized.current = true;
    setPhoneNumberId(config.phone_number_id ?? "");
    setAccessToken(config.access_token ?? "");
    setWabaId(config.waba_id ?? "");
    setAppSecret(config.app_secret ?? "");
    setAgentName(config.agent_name ?? "Asistente");
    setSavedAgentName((config.agent_name ?? "Asistente").trim());
    setSystemPrompt(config.system_prompt ?? "");
    setIsActive(config.is_active ?? false);
    setSchedulingCalendarId(config.scheduling_calendar_id ?? "");
    setCanServices(config.can_answer_services ?? true);
    setCanTransfer(config.can_transfer_human ?? false);
    setAutoDetectPaymentsSP(config.auto_detect_payments ?? false);
    setPhysicalProductsModeSP(config.physical_products_mode ?? "none");
    setDigitalProductsModeSP(config.digital_products_mode ?? "none");
    setSpSelectedProductIds(config.selected_product_ids ?? []);
    setSpServicesMode(config.services_mode ?? "none");
    setSpSelectedServiceIds(config.selected_service_ids ?? []);
    setSpCoursesMode(config.courses_mode ?? "none");
    setSpSelectedCourseIds(config.selected_course_ids ?? []);

    setAgentPersonalitySP(config.agent_personality ?? "");
    setResponseLengthSP(config.response_length ?? "normal");
    setEmojiLevelSP(config.emoji_level ?? "poco");
    setShowCatalogOnAsk(config.show_catalog_on_ask ?? true);
    setDoUpsell(config.do_upsell ?? false);
    setApplyDiscounts(config.apply_discounts ?? true);
    setProfilePicUrl(config.profile_picture_url ?? null);
    if (config.agent_about) setBio(config.agent_about);
    setSavedConexionAgenteSnapshot(JSON.stringify({
      phoneNumberId: config.phone_number_id ?? "",
      accessToken: config.access_token ?? "",
      wabaId: config.waba_id ?? "",
      appSecret: config.app_secret ?? "",
      systemPrompt: config.system_prompt ?? "",
      schedulingCalendarId: config.scheduling_calendar_id ?? "",
      canServices: config.can_answer_services ?? true,
      canTransfer: config.can_transfer_human ?? false,
      autoDetectPaymentsSP: config.auto_detect_payments ?? false,
      physicalProductsModeSP: config.physical_products_mode ?? "none",
      digitalProductsModeSP: config.digital_products_mode ?? "none",
      spSelectedProductIds: config.selected_product_ids ?? [],
      spServicesMode: config.services_mode ?? "none",
      spSelectedServiceIds: config.selected_service_ids ?? [],
      spCoursesMode: config.courses_mode ?? "none",
      spSelectedCourseIds: config.selected_course_ids ?? [],
      agentPersonalitySP: config.agent_personality ?? "",
      responseLengthSP: config.response_length ?? "normal",
      emojiLevelSP: config.emoji_level ?? "poco",
      doUpsell: config.do_upsell ?? false,
      applyDiscounts: config.apply_discounts ?? true,
    }));
    // Doble rAF: deja pintar el estado real sin transición y recién luego la habilita,
    // para que el cambio de valores inicial no se vea como una animación de encendido.
    requestAnimationFrame(() => requestAnimationFrame(() => setSwitchesReady(true)));
  }, [config]);

  // Clasifica el trigger localmente — instantáneo, sin API.
  // Solo bloquea lo que confundiría al usuario (tiempo, llamadas):
  // triggers inválidos que pasen no hacen daño — simplemente nunca se activan
  // porque el sistema evalúa triggers SOLO cuando llega un mensaje de WhatsApp.
  const classifyTrigger = (raw: string): { severity: "valid" | "warn" | "invalid"; category: string | null; reason: string } => {
    const t = raw.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

    // ── BLOQUEOS DUROS: casos que confunden al usuario creyendo que es un scheduler ──
    const hardBlocks: Array<[RegExp, (m: string) => string]> = [
      [/\b(a\s*las\s*\d+|\d+\s*:\s*\d+\s*(am|pm)?|cada\s+\d+\s*(hora|dia|semana|mes)|diario\s*a\s*las|programar\s*para)\b/i,
        m => `"${m}" es una hora, y los flujos no se disparan solos a una hora. Se activan cuando el cliente te escribe.`],
      [/\b(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/,
        m => `"${m}" es un día de la semana, y los flujos no se programan por fecha. Se activan cuando el cliente te escribe.`],
      [/\b(cumpleanos|aniversario)\b/,
        m => `Para "${m}" hace falta la fecha del contacto. Usa Recordatorios, que sí envían en una fecha.`],
      [/\b(llamada[s]?|llame[ns]?|llamar[ae]?|videollamada)\b/,
        m => `"${m}" es una llamada, y los flujos solo reconocen mensajes de texto de WhatsApp.`],
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

  const handleToggleActive = async () => {
    const next = !isActive;
    setIsActive(next);
    try {
      await upsert.mutateAsync({ is_active: next });
      toast.success(next ? "Asistente activado" : "Asistente desactivado");
    } catch {
      setIsActive(!next);
      toast.error("Error al actualizar el estado del asistente");
    }
  };

  const currentConexionAgenteSnapshot = useMemo(() => JSON.stringify({
    phoneNumberId, accessToken, wabaId, appSecret,
    systemPrompt, schedulingCalendarId, canServices, canTransfer,
    autoDetectPaymentsSP, physicalProductsModeSP, digitalProductsModeSP,
    spSelectedProductIds, spServicesMode, spSelectedServiceIds,
    spCoursesMode, spSelectedCourseIds, agentPersonalitySP,
    responseLengthSP, emojiLevelSP, doUpsell, applyDiscounts,
  }), [
    phoneNumberId, accessToken, wabaId, appSecret,
    systemPrompt, schedulingCalendarId, canServices, canTransfer,
    autoDetectPaymentsSP, physicalProductsModeSP, digitalProductsModeSP,
    spSelectedProductIds, spServicesMode, spSelectedServiceIds,
    spCoursesMode, spSelectedCourseIds, agentPersonalitySP,
    responseLengthSP, emojiLevelSP, doUpsell, applyDiscounts,
  ]);
  const hasUnsavedConexionAgenteChanges = currentConexionAgenteSnapshot !== savedConexionAgenteSnapshot;

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
        can_create_contacts: true,
        can_answer_services: canServices,
        can_transfer_human: canTransfer,
        auto_detect_payments: autoDetectPaymentsSP,
        physical_products_mode: physicalProductsModeSP,
        digital_products_mode: digitalProductsModeSP,
        selected_product_ids: (physicalProductsModeSP === "selected" || digitalProductsModeSP === "selected") ? spSelectedProductIds : [],
        services_mode: spServicesMode,
        selected_service_ids: spServicesMode === "selected" ? spSelectedServiceIds : [],
        courses_mode: spCoursesMode,
        selected_course_ids: spCoursesMode === "selected" ? spSelectedCourseIds : [],
        agent_objectives: computeAgentObjectives(!!schedulingCalendarId),
        agent_personality: agentPersonalitySP || null,
        agent_proactivity: "proactivo",
        response_length: responseLengthSP as "short" | "normal" | "detailed",
        emoji_level: emojiLevelSP as "none" | "poco" | "medio" | "mucho",
        use_business_faq: true,
        show_catalog_on_ask: showCatalogOnAsk,
        do_upsell: doUpsell,
        confirm_summary: true,
        apply_discounts: applyDiscounts,
      });

      // Re-suscribir al WABA si hay credenciales completas
      if (wabaId && accessToken) {
        await fetch(`https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
        }).catch(() => {});
      }

      setSavedConexionAgenteSnapshot(currentConexionAgenteSnapshot);
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
        const resolvedBio = metaBio || config?.agent_about || "";
        setBio(resolvedBio);
        setSavedBio(resolvedBio);
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

    // Nombre del negocio verificado en Meta: se refresca en segundo plano, sin bloquear el resto del perfil
    fetch(`https://graph.facebook.com/v21.0/${pid}?fields=verified_name`, {
      headers: { Authorization: `Bearer ${tok}` },
    })
      .then(r => r.json())
      .then(json => {
        if (json.verified_name && json.verified_name !== config?.verified_business_name) {
          upsert.mutateAsync({ verified_business_name: json.verified_name }).catch(() => {});
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, config?.phone_number_id, config?.access_token]);

  const handleSaveProfile = async () => {
    setSavingBio(true);
    try {
      const trimmedName = agentName.trim() || "Asistente";
      if (trimmedName !== savedAgentName) {
        await upsert.mutateAsync({ agent_name: trimmedName });
        setAgentName(trimmedName);
        setSavedAgentName(trimmedName);
      }

      if (bio !== savedBio) {
        const pid = config?.phone_number_id;
        const tok = config?.access_token;
        if (pid && tok) {
          const res = await fetch(`https://graph.facebook.com/v21.0/${pid}/whatsapp_business_profile`, {
            method: "POST",
            headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
            body: JSON.stringify({ messaging_product: "whatsapp", about: bio }),
          });
          if (!res.ok) throw new Error(await res.text());
          // Guardar también en DB para persistencia local
          await upsert.mutateAsync({ agent_about: bio });
          setSavedBio(bio);
        }
      }

      toast.success("Cambios guardados");
    } catch (err: any) { toast.error(err.message?.slice(0, 100) ?? "Error al guardar"); }
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
      await upsert.mutateAsync({
        verified_phone: json.display_phone_number ?? null,
        verified_business_name: json.verified_name ?? null,
      }).catch(() => {});

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
    { id: "agente" as const,      label: "Agente IA",   icon: Sparkles,  desc: "Personalidad, capacidades y prompt" },
    { id: "etiquetas" as const,   label: "Etiquetas",   icon: Tag,       desc: "Gestionar etiquetas" },
    { id: "respuestas" as const,  label: "Respuestas Rápidas", icon: Zap, desc: "/ atajos de respuesta rápida" },
    { id: "flujos" as const,      label: "Flujos",      icon: GitBranch, desc: "Automatiza conversaciones paso a paso" },
    { id: "plantillas" as const,  label: "Plantillas",  icon: Megaphone, desc: "Remarketing fuera de 24h" },
    { id: "campanias" as const,   label: "Envío Masivo", icon: Send,     desc: "Envíos pasados y dentro de 24h" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <DeleteConfirmDialog
        open={!!pendingDeleteFlowId}
        onOpenChange={open => !open && setPendingDeleteFlowId(null)}
        onConfirm={handleDeleteFlow}
        isPending={deletingFlow}
        description="Se eliminará el flujo permanentemente. La(s) secuencia(s) que usaba no se borran — siguen disponibles para otros flujos."
      />
      <DeleteConfirmDialog
        open={!!pendingDeleteSeqId}
        onOpenChange={open => !open && setPendingDeleteSeqId(null)}
        onConfirm={handleDeleteSeq}
        isPending={deletingSeq}
        description={(() => {
          const inUse = flows.filter(f =>
            f.sequence_id === pendingDeleteSeqId || (f.country_sequences ?? []).some(cs => cs.sequence_id === pendingDeleteSeqId),
          );
          if (inUse.length === 0) return "Se eliminará la secuencia permanentemente. Ningún flujo la está usando.";
          return `Se eliminará permanentemente. La está usando ${inUse.length === 1 ? "el flujo" : "los flujos"} ${inUse.map(f => `"${f.name}"`).join(", ")}${inUse.some(f => f.is_active && f.status === "published") ? " —que está activo ahora mismo—" : ""}, y ${inUse.length === 1 ? "dejará" : "dejarán"} de enviar estos mensajes.`;
        })()}
      />
      <Dialog open={!!pendingStepCreate} onOpenChange={open => !open && setPendingStepCreate(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">¿Qué tipo de paso quieres crear?</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 pt-1">
            {STEP_TYPE_ORDER.map(t => {
              const Icon = STEP_TYPE_ICONS[t];
              return (
                <button
                  key={t}
                  onClick={() => resolvePendingStepCreate(t)}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-xs font-medium"
                >
                  <Icon size={18} className="text-muted-foreground" />
                  {STEP_TYPE_LABELS[t]}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!pendingConnectFlow} onOpenChange={open => !open && setPendingConnectFlow(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">¿Qué sigue después de esto?</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-1">
            <button
              onClick={() => {
                if (!pendingConnectFlow) return;
                setPendingStepCreate(pendingConnectFlow.kind === "option"
                  ? { kind: "option", questionStepId: pendingConnectFlow.questionStepId, optionId: pendingConnectFlow.optionId }
                  : { kind: "after", afterStepId: pendingConnectFlow.afterStepId });
                setPendingConnectFlow(null);
              }}
              className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
            >
              Crear paso nuevo
            </button>
            <button
              onClick={() => {
                if (!pendingConnectFlow) return;
                startPickingTarget(
                  pendingConnectFlow.kind === "option"
                    ? { kind: "option", questionId: pendingConnectFlow.questionStepId, optionId: pendingConnectFlow.optionId }
                    : { kind: "step", stepId: pendingConnectFlow.afterStepId },
                  null,
                );
              }}
              className="h-10 px-4 rounded-xl border border-primary/40 text-primary text-xs font-medium hover:bg-primary/5 transition-colors"
            >
              Llevar a un paso que ya existe
            </button>
            <button
              onClick={() => setPendingConnectFlow(null)}
              className="h-9 px-4 rounded-xl border text-xs text-muted-foreground hover:bg-secondary transition-colors"
            >
              Cancelar
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!pendingEdgeManage} onOpenChange={open => !open && setPendingEdgeManage(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">¿Qué quieres hacer con este camino?</DialogTitle>
          </DialogHeader>
          {pendingEdgeManage && editingSeq && sequenceGraph && (
            <EdgeTargetPreview steps={editingSeq.steps} graph={sequenceGraph} source={pendingEdgeManage} />
          )}
          <div className="flex flex-col gap-2 pt-1">
            <button
              onClick={() => {
                if (!pendingEdgeManage) return;
                startPickingTarget(pendingEdgeManage, describeEdgeSource(pendingEdgeManage)?.currentTargetId ?? null);
              }}
              className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
            >
              Cambiar a dónde lleva
            </button>
            <button
              onClick={() => {
                if (!pendingEdgeManage) return;
                const orphaned = computeEdgeChangeOrphans(pendingEdgeManage, null);
                if (orphaned.length > 0) {
                  toast.error(`Si quitas esta conexión, ${orphaned.length} paso${orphaned.length !== 1 ? "s quedarían" : " quedaría"} sin forma de llegar. Bórralo${orphaned.length !== 1 ? "s" : ""} primero.`);
                  return;
                }
                applyEdgeTarget(pendingEdgeManage, null);
                setPendingEdgeManage(null);
              }}
              className="h-10 px-4 rounded-xl border border-destructive/40 text-destructive text-xs font-medium hover:bg-destructive/5 transition-colors"
            >
              Quitar este camino
            </button>
            <button
              onClick={() => setPendingEdgeManage(null)}
              className="h-9 px-4 rounded-xl border text-xs text-muted-foreground hover:bg-secondary transition-colors"
            >
              Cancelar
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!pendingDeleteStep} onOpenChange={open => !open && setPendingDeleteStep(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Después de este paso hay más contenido</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-sm text-muted-foreground">
              {pendingDeleteStep?.branchOptions
                ? `Esta pregunta abre ${pendingDeleteStep.branchOptions.length} caminos distintos. Puedes quedarte con uno (sigue completo y se conecta directo con lo anterior) y eliminar los demás, o eliminar todo.`
                : pendingDeleteStep?.unifySuccessorId !== undefined
                ? `Hay ${pendingDeleteStep?.cascadeIds.length ?? 0} paso${pendingDeleteStep && pendingDeleteStep.cascadeIds.length !== 1 ? "s" : ""} que dependen solo de este. Puedes eliminar solo este paso y conectar directo lo anterior con lo siguiente, o eliminar todo junto con él.`
                : `Este paso abre varios caminos, así que no hay uno solo con el que continuar. Si sigues, se eliminarán todos (${pendingDeleteStep?.cascadeIds.length ?? 0} pasos).`}
            </p>
            <div className="flex flex-col gap-2">
              {pendingDeleteStep?.branchOptions?.map(opt => (
                <button
                  key={opt.successorId}
                  onClick={() => pendingDeleteStep && deleteStepWithRewire(pendingDeleteStep.id, opt.discardedIds, opt.successorId)}
                  className="h-9 px-4 rounded-xl border border-primary/40 text-primary text-xs font-medium hover:bg-primary/5 transition-colors truncate"
                >
                  Quedarme solo con "{opt.label}"
                </button>
              ))}
              {pendingDeleteStep?.unifySuccessorId !== undefined && (
                <button
                  onClick={() => pendingDeleteStep && deleteStepWithRewire(pendingDeleteStep.id, [], pendingDeleteStep.unifySuccessorId ?? null)}
                  className="h-9 px-4 rounded-xl border border-primary/40 text-primary text-xs font-medium hover:bg-primary/5 transition-colors"
                >
                  Eliminar solo este paso y unir lo de antes con lo de después
                </button>
              )}
              <button
                onClick={() => pendingDeleteStep && deleteStepWithRewire(pendingDeleteStep.id, pendingDeleteStep.cascadeIds, null)}
                className="h-9 px-4 rounded-xl bg-destructive text-destructive-foreground text-xs font-medium hover:opacity-90 transition-opacity"
              >
                Eliminar todo ({pendingDeleteStep ? pendingDeleteStep.cascadeIds.length + 1 : 0} pasos)
              </button>
              <button
                onClick={() => setPendingDeleteStep(null)}
                className="h-9 px-4 rounded-xl border text-xs text-muted-foreground hover:bg-secondary transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!pendingDeleteOption} onOpenChange={open => !open && setPendingDeleteOption(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Este botón lleva a otros pasos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-sm text-muted-foreground">
              Hay {pendingDeleteOption?.orphanIds.length ?? 0} paso{pendingDeleteOption && pendingDeleteOption.orphanIds.length !== 1 ? "s" : ""} que dependen solo de este botón — si lo eliminas, se eliminarán junto con él.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => pendingDeleteOption && deleteOptionWithCascade(pendingDeleteOption.questionId, pendingDeleteOption.optionId, pendingDeleteOption.orphanIds)}
                className="h-9 px-4 rounded-xl bg-destructive text-destructive-foreground text-xs font-medium hover:opacity-90 transition-opacity"
              >
                Eliminar botón y {pendingDeleteOption?.orphanIds.length ?? 0} paso{pendingDeleteOption && pendingDeleteOption.orphanIds.length !== 1 ? "s" : ""}
              </button>
              <button
                onClick={() => setPendingDeleteOption(null)}
                className="h-9 px-4 rounded-xl border text-xs text-muted-foreground hover:bg-secondary transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-lg bg-card h-full flex shadow-2xl border-l overflow-hidden">

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
                className="h-10 text-base md:text-sm"
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

        {/* Nav column — lista de opciones (home). Un solo panel visible a la vez, en cualquier tamaño de pantalla */}
        <div className={`flex-col bg-card border-r
          ${mobileShowSection ? "hidden" : "flex w-full"}
        `}>
          {/* Header: cerrar (X) + asistente activo (toggle) + editar perfil de WhatsApp (Lápiz) */}
          <div className="px-4 py-3 shrink-0 flex items-center justify-between">
            <button onClick={onClose} className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl hover:bg-secondary transition-colors shrink-0">
              <X size={16} className="text-muted-foreground" />
            </button>
            <div className="flex items-center gap-3">
              <button onClick={handleToggleActive} className="relative shrink-0 rounded-full" style={{ width: 40, height: 22 }}>
                <span className={`absolute inset-0 rounded-full ${switchesReady ? "transition-colors" : ""} ${isActive ? "bg-emerald-500" : "bg-secondary border"}`} />
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow ${switchesReady ? "transition-all" : ""} ${isActive ? "left-[22px]" : "left-0.5"}`} />
              </button>
              <button
                onClick={() => { setSection("perfil"); setMobileShowSection(true); }}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl hover:bg-secondary transition-colors shrink-0"
              >
                <Pencil size={16} className="text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Sección scrolleable: foto de perfil (no sticky) + lista de opciones */}
          <div className="flex-1 overflow-y-auto py-2">
            {/* Agent profile info */}
            <div className="px-4 pb-4 border-b">
              <div className="flex flex-col items-center gap-2">
                <div className="relative shrink-0">
                  <div className="w-28 h-28 rounded-full overflow-hidden bg-[#1877F2] flex items-center justify-center text-white">
                    {config?.profile_picture_url ? (
                      <img src={config.profile_picture_url} alt={agentName || "Agente"} className="w-full h-full object-cover"
                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <Bot size={40} />
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 flex items-center gap-1 bg-[#00a884] rounded-full px-2 py-1 border-2 border-background">
                    <Bot size={13} className="text-white" />
                    <span className="text-[11px] font-bold text-white leading-none">IA</span>
                  </div>
                </div>
                <div className="text-center min-w-0">
                  <p className="text-sm truncate">
                    <span className="font-semibold">{agentName || "Asistente"}</span>
                    {config?.verified_business_name && (
                      <span className="text-[11px] font-normal text-muted-foreground"> de {config.verified_business_name}</span>
                    )}
                  </p>
                  <div className="flex items-center justify-center gap-1.5 mt-0.5">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${config?.is_active ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                    <p className="text-[11px] text-muted-foreground">{config?.is_active ? "Activo" : "Inactivo"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section list */}
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
                  <div className={`relative w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isActive ? "bg-[#1877F2]/15" : "bg-secondary"
                  }`}>
                    <Icon size={15} className={isActive ? "text-[#1877F2]" : "text-muted-foreground"} />
                    {s.id === "conexion" && !config?.verified_phone && (
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-destructive border-2 border-background" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium leading-tight ${isActive ? "text-[#1877F2]" : "text-foreground"}`}>{s.label}</p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{s.desc}</p>
                  </div>
                  <ChevronRight size={14} className={`shrink-0 ${isActive ? "text-[#1877F2]" : "text-muted-foreground/30"}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Content column — se muestra en lugar de la nav (drill-down), en cualquier tamaño de pantalla */}
        <div className={`flex-col flex-1 min-w-0
          ${mobileShowSection ? "flex" : "hidden"}
        `}>
          {/* Section header */}
          <div className="px-4 py-3 border-b flex items-center gap-1 shrink-0">
            <button
              onClick={() => setMobileShowSection(false)}
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl hover:bg-secondary transition-colors -ml-1.5"
            >
              <ChevronLeft size={18} className="text-muted-foreground" />
            </button>
            <h2 className="text-sm font-semibold flex-1 truncate">
              {section === "perfil" ? "Perfil WhatsApp" : SECTIONS.find(s => s.id === section)?.label ?? "Configuración"}
            </h2>
            {section === "respuestas" && (
              <button
                onClick={() => setShowNewQrForm(v => !v)}
                className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors shrink-0 ${
                  showNewQrForm ? "bg-secondary text-muted-foreground hover:bg-secondary/80" : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                {showNewQrForm ? <X size={16} /> : <Plus size={16} />}
              </button>
            )}
            {section === "etiquetas" && (
              <button
                onClick={() => setShowNewLabelForm(v => !v)}
                className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors shrink-0 ${
                  showNewLabelForm ? "bg-secondary text-muted-foreground hover:bg-secondary/80" : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                {showNewLabelForm ? <X size={16} /> : <Plus size={16} />}
              </button>
            )}
            {section === "flujos" && flowWizardStep === null && (
              <button
                onClick={startNewFlow}
                className="w-8 h-8 flex items-center justify-center rounded-xl transition-colors shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus size={16} />
              </button>
            )}
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
                    <Input value={phoneNumberId} onChange={e => setPhoneNumberId(e.target.value)} className="h-9 text-base md:text-sm font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Access Token</label>
                    <Input value={accessToken} onChange={e => setAccessToken(e.target.value)} className="h-9 text-base md:text-sm font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">WABA ID</label>
                    <Input value={wabaId} onChange={e => setWabaId(e.target.value)} className="h-9 text-base md:text-sm font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">App Secret</label>
                    <Input value={appSecret} onChange={e => setAppSecret(e.target.value)} className="h-9 text-base md:text-sm font-mono" />
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
              {/* Sección: Personalidad */}
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-bold text-primary uppercase tracking-wider">Personalidad</p>
                <div className="flex-1 h-px bg-border" />
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

              {/* Longitud de respuestas */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Longitud de respuestas</label>
                <div className="grid grid-cols-1 gap-1.5">
                  {RESPONSE_LENGTHS.map(r => (
                    <button key={r.val} onClick={() => setResponseLengthSP(r.val)}
                      className={`text-left text-xs px-3 py-2 rounded-lg border transition-colors ${responseLengthSP === r.val ? "bg-primary/10 border-primary text-primary font-medium" : "border-border hover:border-primary/40"}`}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Uso de emojis */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Uso de emojis</label>
                <div className="grid grid-cols-1 gap-1.5">
                  {EMOJI_LEVELS.map(e => (
                    <button key={e.val} onClick={() => setEmojiLevelSP(e.val)}
                      className={`text-left text-xs px-3 py-2 rounded-lg border transition-colors ${emojiLevelSP === e.val ? "bg-primary/10 border-primary text-primary font-medium" : "border-border hover:border-primary/40"}`}>
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sección: Capacidades */}
              <div className="flex items-center gap-2 pt-2">
                <p className="text-[11px] font-bold text-primary uppercase tracking-wider">Capacidades</p>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="divide-y">
              {/* Agendar citas — solo si hay al menos un calendario creado */}
              {calendars.length > 0 && (
                <div className="py-3 space-y-2">
                  <div>
                    <p className="text-sm font-medium">Agendar citas</p>
                    <p className="text-xs text-muted-foreground">Detecta intención de agendar y crea citas en el calendario</p>
                  </div>
                  <select
                    value={schedulingCalendarId}
                    onChange={e => setSchedulingCalendarId(e.target.value)}
                    className="w-full text-base md:text-xs h-8 rounded-lg border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Ningún Calendario Seleccionado</option>
                    {calendars.map(cal => (
                      <option key={cal.id} value={cal.id}>{cal.name ?? cal.slug ?? cal.id}</option>
                    ))}
                  </select>
                </div>
              )}
              {/* Transferir a humano + notificación inline */}
              <div className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Transferir a humano</p>
                    <p className="text-xs text-muted-foreground">El agente detecta cuando el cliente quiere hablar con una persona y cambia a modo Manual</p>
                  </div>
                  <button onClick={() => setCanTransfer(v => !v)} className="relative shrink-0 rounded-full" style={{ width: 40, height: 22 }}>
                    <span className={`absolute inset-0 rounded-full ${switchesReady ? "transition-colors" : ""} ${canTransfer ? "bg-primary" : "bg-secondary border"}`} />
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow ${switchesReady ? "transition-all" : ""} ${canTransfer ? "left-[22px]" : "left-0.5"}`} />
                  </button>
                </div>
                {canTransfer && pushChecked && isPushSupported() && pushPermission !== "denied" && !pushHasSubscription && (
                  <div className="mt-3 pl-3 border-l-2 border-primary/20">
                    <p className="text-xs text-muted-foreground mb-2">Activa las notificaciones para saber cuando se transfiere un chat</p>
                    <button
                      onClick={() => subscribePush.mutate(undefined, {
                        onError: err => toast.error(err instanceof Error ? err.message : "No se pudo activar las notificaciones"),
                        onSuccess: () => toast.success("¡Notificaciones activadas!"),
                      })}
                      disabled={subscribePush.isPending}
                      className="h-8 px-3 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5 disabled:opacity-60"
                    >
                      {subscribePush.isPending ? <Loader2 size={12} className="animate-spin" /> : <Bell size={12} />}
                      Activar Notificaciones
                    </button>
                  </div>
                )}
              </div>
              {/* Registrar Ventas Automáticas */}
              <div className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Registrar Ventas Automáticas</p>
                    <p className="text-xs text-muted-foreground">La IA analiza comprobantes de pago y registra ventas automáticamente. Si lo desactivas, el comprobante detectado queda pendiente de tu confirmación manual en el CRM.</p>
                  </div>
                  <button onClick={() => setAutoDetectPaymentsSP(v => !v)} className="relative shrink-0 rounded-full" style={{ width: 40, height: 22 }}>
                    <span className={`absolute inset-0 rounded-full ${switchesReady ? "transition-colors" : ""} ${autoDetectPaymentsSP ? "bg-primary" : "bg-secondary border"}`} />
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow ${switchesReady ? "transition-all" : ""} ${autoDetectPaymentsSP ? "left-[22px]" : "left-0.5"}`} />
                  </button>
                </div>
                {pushChecked && isPushSupported() && pushPermission !== "denied" && !pushHasSubscription && (
                  <div className="mt-3 pl-3 border-l-2 border-primary/20">
                    <p className="text-xs text-muted-foreground mb-2">Activa las notificaciones para saber cuando se registra una venta o hay un pago pendiente</p>
                    <button
                      onClick={() => subscribePush.mutate(undefined, {
                        onError: err => toast.error(err instanceof Error ? err.message : "No se pudo activar las notificaciones"),
                        onSuccess: () => toast.success("¡Notificaciones activadas!"),
                      })}
                      disabled={subscribePush.isPending}
                      className="h-8 px-3 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5 disabled:opacity-60"
                    >
                      {subscribePush.isPending ? <Loader2 size={12} className="animate-spin" /> : <Bell size={12} />}
                      Activar Notificaciones
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between py-3 border-t">
                <div>
                  <p className="text-sm font-medium">Sugerir Productos Complementarios</p>
                  <p className="text-xs text-muted-foreground">Sugiere productos complementarios cuando sea relevante</p>
                </div>
                <button onClick={() => setDoUpsell(v => !v)} className="relative shrink-0 rounded-full" style={{ width: 40, height: 22 }}>
                  <span className={`absolute inset-0 rounded-full ${switchesReady ? "transition-colors" : ""} ${doUpsell ? "bg-primary" : "bg-secondary border"}`} />
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow ${switchesReady ? "transition-all" : ""} ${doUpsell ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </div>
              <div className="flex items-center justify-between py-3 border-t">
                <div>
                  <p className="text-sm font-medium">Aplicar descuentos</p>
                  <p className="text-xs text-muted-foreground">El agente mostrará precios con descuento cuando estén configurados para la moneda del contacto</p>
                </div>
                <button onClick={() => setApplyDiscounts(v => !v)} className="relative shrink-0 rounded-full" style={{ width: 40, height: 22 }}>
                  <span className={`absolute inset-0 rounded-full ${switchesReady ? "transition-colors" : ""} ${applyDiscounts ? "bg-primary" : "bg-secondary border"}`} />
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow ${switchesReady ? "transition-all" : ""} ${applyDiscounts ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </div>
            </div>

            {/* El agente podrá vender: */}
            <div className="border rounded-xl p-4 space-y-4 bg-secondary/20 mt-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">El agente podrá vender:</p>

              {/* Servicios */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Servicios</p>
                <div className="flex gap-3">
                  {(["none", "selected", "all"] as const).map(mode => (
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

              {/* Productos Físicos */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Productos Físicos</p>
                <div className="flex gap-3">
                  {(["none", "selected", "all"] as const).map(mode => (
                    <label key={mode} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="sp-physical-products-mode" checked={physicalProductsModeSP === mode} onChange={() => setPhysicalProductsModeSP(mode)} className="accent-primary" />
                      <span className="text-sm">{mode === "all" ? "Todos" : mode === "selected" ? "Solo seleccionados" : "Ninguno"}</span>
                    </label>
                  ))}
                </div>
                {physicalProductsModeSP === "selected" && (
                  <div className="mt-1 border rounded-lg divide-y bg-background max-h-52 overflow-y-auto">
                    {catalogs.map(cat => {
                      const catProductIds = catalogProductsMap.get(cat.id) ?? [];
                      const catProducts = allProducts.filter(p => catProductIds.includes(p.id) && p.product_kind === "fisico");
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
                            <div key={p.id} className="flex items-center gap-2 px-3 py-2 pl-8 hover:bg-secondary/40 transition-colors">
                              <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                                <input type="checkbox" checked={spSelectedProductIds.includes(p.id)}
                                  onChange={e => setSpSelectedProductIds(prev => e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id))}
                                  className="accent-primary shrink-0" />
                                <span className="text-sm truncate">{p.name}{!p.is_active && <span className="ml-1.5 text-[10px] text-muted-foreground/60">(privado)</span>}</span>
                              </label>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                    {/* Productos físicos sin catálogo */}
                    {(() => {
                      const allCatProductIds = new Set(Array.from(catalogProductsMap.values()).flat());
                      const orphans = allProducts.filter(p => !allCatProductIds.has(p.id) && p.product_kind === "fisico");
                      if (orphans.length === 0) return null;
                      return (
                        <div>
                          <div className="px-3 py-2 bg-secondary/30">
                            <span className="text-xs font-semibold text-muted-foreground">Sin catálogo</span>
                          </div>
                          {orphans.map(p => (
                            <div key={p.id} className="flex items-center gap-2 px-3 py-2 pl-8 hover:bg-secondary/40 transition-colors">
                              <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                                <input type="checkbox" checked={spSelectedProductIds.includes(p.id)}
                                  onChange={e => setSpSelectedProductIds(prev => e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id))}
                                  className="accent-primary shrink-0" />
                                <span className="text-sm truncate">{p.name}{!p.is_active && <span className="ml-1.5 text-[10px] text-muted-foreground/60">(privado)</span>}</span>
                              </label>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                    {allProducts.filter(p => p.product_kind === "fisico").length === 0 && (
                      <p className="px-3 py-2 text-xs text-muted-foreground">No hay productos físicos</p>
                    )}
                  </div>
                )}
              </div>

              {/* Productos Digitales */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Productos Digitales</p>
                <div className="flex gap-3">
                  {(["none", "selected", "all"] as const).map(mode => (
                    <label key={mode} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="sp-digital-products-mode" checked={digitalProductsModeSP === mode} onChange={() => setDigitalProductsModeSP(mode)} className="accent-primary" />
                      <span className="text-sm">{mode === "all" ? "Todos" : mode === "selected" ? "Solo seleccionados" : "Ninguno"}</span>
                    </label>
                  ))}
                </div>
                {digitalProductsModeSP === "selected" && (
                  <div className="mt-1 border rounded-lg divide-y bg-background max-h-52 overflow-y-auto">
                    {allProducts.filter(p => p.product_kind === "archivo").length === 0
                      ? <p className="px-3 py-2 text-xs text-muted-foreground">No hay productos digitales</p>
                      : allProducts.filter(p => p.product_kind === "archivo").map(p => (
                          <div key={p.id} className="flex items-center gap-2 px-3 py-2 hover:bg-secondary/40 transition-colors">
                            <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                              <input type="checkbox" checked={spSelectedProductIds.includes(p.id)}
                                onChange={e => setSpSelectedProductIds(prev => e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id))}
                                className="accent-primary shrink-0" />
                              <span className="text-sm truncate">{p.name}{!p.is_active && <span className="ml-1.5 text-[10px] text-muted-foreground/60">(privado)</span>}</span>
                            </label>
                          </div>
                        ))
                    }
                  </div>
                )}
              </div>

              {/* Cursos */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Cursos</p>
                <div className="flex gap-3">
                  {(["none", "selected", "all"] as const).map(mode => (
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

              {/* Instrucciones adicionales */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Prompt - Instrucciones Adicionales <span className="text-[10px] text-muted-foreground">(opcional)</span></label>
                <Textarea ref={promptRef} value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} rows={5} className="text-base md:text-xs font-mono resize-none leading-relaxed" placeholder="Restricciones específicas, información extra, casos especiales..." />
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
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative w-28 h-28 shrink-0">
                      <div className="w-28 h-28 rounded-full overflow-hidden bg-secondary flex items-center justify-center border">
                        {profilePicUrl ? (
                          <img src={profilePicUrl} alt="Perfil WA" className={`w-full h-full object-cover transition-opacity duration-300 ${uploadingPhoto ? "opacity-40" : "opacity-100"}`} />
                        ) : (
                          <User size={40} className="text-muted-foreground" />
                        )}
                      </div>
                      {uploadingPhoto && (
                        <div className="absolute inset-0 rounded-full flex items-center justify-center bg-background/60">
                          <Loader2 size={24} className="animate-spin text-primary" />
                        </div>
                      )}
                    </div>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/jpeg,image/png"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); e.target.value = ""; }}
                    />
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={uploadingPhoto || !config?.phone_number_id}
                      className="text-sm font-bold text-primary hover:underline disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {uploadingPhoto ? "Subiendo..." : "Editar Foto"}
                    </button>
                    <p className="text-[10px] text-muted-foreground">JPG o PNG · Imagen cuadrada recomendada</p>
                  </div>

                  {/* Nombre del Negocio + Nombre del Agente */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        Nombre del Negocio <Lock size={10} />
                      </label>
                      <p className="text-sm text-muted-foreground/70 truncate py-1.5">
                        {config?.verified_business_name || <span className="italic text-muted-foreground/50">Sin verificar</span>}
                      </p>
                      <a
                        href="https://business.facebook.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5"
                      >
                        Cambia el nombre desde Meta <ExternalLink size={10} />
                      </a>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Nombre del Agente</label>
                      <Input value={agentName} onChange={e => setAgentName(e.target.value)} className="h-9 text-base md:text-sm" />
                    </div>
                  </div>

                  {/* Bio */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Biografía / Descripción</label>
                    <Textarea
                      value={bio}
                      onChange={e => setBio(e.target.value.slice(0, 139))}
                      rows={3}
                      className="text-base md:text-sm resize-none"
                      placeholder="Ej: Servicio de atención al cliente 24/7"
                    />
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] ${bio.length >= 130 ? "text-amber-500" : "text-muted-foreground"}`}>
                        {bio.length}/139
                      </span>
                      <Button
                        size="sm"
                        variant={(bio === savedBio && agentName.trim() === savedAgentName) ? "secondary" : "default"}
                        onClick={handleSaveProfile}
                        disabled={savingBio || (bio === savedBio && agentName.trim() === savedAgentName)}
                        className="h-7 text-xs gap-1.5"
                      >
                        {savingBio && <Loader2 size={11} className="animate-spin" />}
                        Guardar Cambios
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
              {!showNewLabelForm && (
              <>
              {/* Lista de etiquetas existentes */}
              <div className="space-y-1">
                {labels.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-3 py-8">
                    <p className="text-xs text-muted-foreground/60 italic text-center">Sin etiquetas creadas</p>
                    <button
                      onClick={() => setShowNewLabelForm(true)}
                      className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity"
                    >
                      <Plus size={13} /> Crear Etiqueta
                    </button>
                  </div>
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
                          className="w-full h-7 px-2 text-base md:text-xs rounded-lg border border-input bg-background focus:outline-none"
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
                            className="w-full px-2 py-1.5 text-base md:text-xs rounded-lg border border-input bg-background focus:outline-none resize-none"
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
                            className="w-full px-2 py-1.5 text-base md:text-xs rounded-lg border border-input bg-background focus:outline-none resize-none"
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
              </>
              )}

              {/* Formulario nueva etiqueta — pantalla completa, solo visible al presionar + en el header */}
              {showNewLabelForm && (
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
                  className="w-full h-8 px-2.5 text-base md:text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Cuándo asignar</label>
                  <textarea
                    value={newLabelHint}
                    onChange={e => setNewLabelHint(e.target.value)}
                    placeholder="ej: cuando el usuario pregunta por precios o quiere comprar"
                    rows={2}
                    className="w-full px-2.5 py-1.5 text-base md:text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
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
                    className="w-full px-2.5 py-1.5 text-base md:text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
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
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowNewLabelForm(false); setNewLabelName(""); setNewLabelHint(""); setNewLabelRemoveHint(""); }}
                    className="h-8 px-3 rounded-lg border text-xs hover:bg-secondary transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      if (!newLabelName.trim()) return;
                      await upsertLabel.mutateAsync({ name: newLabelName.trim(), color: newLabelColor, hint: newLabelHint.trim() || null, remove_hint: newLabelRemoveHint.trim() || null });
                      setNewLabelName("");
                      setNewLabelHint("");
                      setNewLabelRemoveHint("");
                      setShowNewLabelForm(false);
                    }}
                    disabled={!newLabelName.trim() || upsertLabel.isPending}
                    className="flex-1 flex items-center justify-center gap-1 px-3 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40"
                  >
                    <Plus size={12} /> Crear etiqueta
                  </button>
                </div>
              </div>
              )}
            </div>
          )}

          {/* ── Respuestas Rápidas ── */}
          {section === "respuestas" && (
            <div className="space-y-4">
              {!showNewQrForm && (
              <>
              {/* Lista */}
              <div className="space-y-1">
                {quickReplies.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-3 py-8">
                    <p className="text-xs text-muted-foreground/60 italic text-center">Sin respuestas rápidas creadas</p>
                    <button
                      onClick={() => setShowNewQrForm(true)}
                      className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity"
                    >
                      <Plus size={13} /> Crear Respuesta Rápida
                    </button>
                  </div>
                )}
                {quickReplies.map(qr => (
                  <div key={qr.id} className="flex items-start gap-2 px-3 py-2.5 rounded-xl border border-border/60 bg-card">
                    {editingQr?.id === qr.id ? (
                      <div className="w-full space-y-2">
                        <input
                          value={editingQr.shortcut}
                          onChange={e => setEditingQr(prev => prev ? { ...prev, shortcut: e.target.value } : null)}
                          className="w-full h-7 px-2 text-base md:text-xs rounded-lg border border-input bg-background focus:outline-none font-mono"
                          placeholder="atajo (ej: saludo)"
                          autoFocus
                        />
                        {/* Preview de media adjunta al editar */}
                        {editingQr.media_url && (
                          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-secondary/50 border border-border/50">
                            {editingQr.media_type === "image"
                              ? <img src={editingQr.media_url} className="w-10 h-10 rounded object-cover shrink-0" />
                              : editingQr.media_type === "video"
                                ? <FileVideo size={20} className="text-muted-foreground shrink-0" />
                                : <Paperclip size={16} className="text-muted-foreground shrink-0" />
                            }
                            <span className="text-xs text-muted-foreground truncate flex-1">{editingQr.media_filename ?? "Archivo adjunto"}</span>
                            <button onClick={() => setEditingQr(prev => prev ? { ...prev, media_url: null, media_type: null, media_filename: null } : null)}
                              className="p-1 text-muted-foreground hover:text-destructive shrink-0"><X size={12} /></button>
                          </div>
                        )}
                        <textarea
                          value={editingQr.content}
                          onChange={e => setEditingQr(prev => prev ? { ...prev, content: e.target.value } : null)}
                          rows={3}
                          className="w-full px-2 py-1.5 text-base md:text-xs rounded-lg border border-input bg-background focus:outline-none resize-none"
                          placeholder={editingQr.media_url ? "Caption (opcional)..." : "Contenido completo..."}
                        />
                        <input ref={editingQrFileRef} type="file" className="hidden"
                          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/3gpp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          onChange={e => { const f = e.target.files?.[0]; if (f) uploadQrMedia(f, (url) => setEditingQr(prev => prev ? { ...prev, media_url: url } : null), (t) => setEditingQr(prev => prev ? { ...prev, media_type: t } : null), (fn) => setEditingQr(prev => prev ? { ...prev, media_filename: fn } : null), setEditingQrUploading); e.target.value = ""; }}
                        />
                        <div className="flex items-center gap-2">
                          <button onClick={() => editingQrFileRef.current?.click()} disabled={editingQrUploading}
                            className="h-7 px-2 rounded-lg border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1 disabled:opacity-40">
                            {editingQrUploading ? <Loader2 size={11} className="animate-spin" /> : <Paperclip size={11} />}
                            {editingQr.media_url ? "Cambiar" : "Adjuntar"}
                          </button>
                          <button
                            onClick={async () => {
                              if (!editingQr.shortcut.trim() || (!editingQr.content.trim() && !editingQr.media_url)) return;
                              await upsertQuickReply.mutateAsync({ id: editingQr.id, shortcut: editingQr.shortcut, content: editingQr.content, media_url: editingQr.media_url, media_type: editingQr.media_type, media_filename: editingQr.media_filename });
                              setEditingQr(null);
                            }}
                            className="flex-1 h-7 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
                          >Guardar</button>
                          <button onClick={() => setEditingQr(null)} className="h-7 px-3 rounded-lg border text-xs hover:bg-secondary transition-colors">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0 flex items-start gap-2">
                          {qr.media_type === "image" && qr.media_url
                            ? <img src={qr.media_url} className="w-7 h-7 rounded object-cover shrink-0 mt-0.5" />
                            : qr.media_type === "video"
                              ? <FileVideo size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                              : qr.media_type === "document"
                                ? <Paperclip size={13} className="text-muted-foreground shrink-0 mt-0.5" />
                                : null
                          }
                          <div className="min-w-0">
                            <p className="text-xs font-mono font-semibold text-primary">/{qr.shortcut}</p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{qr.content || (qr.media_filename ?? "Archivo adjunto")}</p>
                          </div>
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
              </>
              )}

              {/* Formulario de creación — pantalla completa, solo visible al presionar + en el header */}
              {showNewQrForm && (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Nueva respuesta</p>
                <input
                  value={newQrShortcut}
                  onChange={e => setNewQrShortcut(e.target.value.replace(/\s/g, "").replace(/^\//, ""))}
                  className="w-full h-8 px-2 text-base md:text-xs rounded-lg border border-input bg-background focus:outline-none font-mono"
                  placeholder="atajo  (ej: saludo, precio, cita)"
                />
                {/* Preview de media en formulario de creación */}
                {newQrMediaUrl && (
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-secondary/50 border border-border/50">
                    {newQrMediaType === "image"
                      ? <img src={newQrMediaUrl} className="w-10 h-10 rounded object-cover shrink-0" />
                      : newQrMediaType === "video"
                        ? <FileVideo size={20} className="text-muted-foreground shrink-0" />
                        : <Paperclip size={16} className="text-muted-foreground shrink-0" />
                    }
                    <span className="text-xs text-muted-foreground truncate flex-1">{newQrMediaFilename ?? "Archivo adjunto"}</span>
                    <button onClick={() => { setNewQrMediaUrl(null); setNewQrMediaType(null); setNewQrMediaFilename(null); }}
                      className="p-1 text-muted-foreground hover:text-destructive shrink-0"><X size={12} /></button>
                  </div>
                )}
                <textarea
                  value={newQrContent}
                  onChange={e => setNewQrContent(e.target.value)}
                  rows={3}
                  className="w-full px-2 py-1.5 text-base md:text-xs rounded-lg border border-input bg-background focus:outline-none resize-none"
                  placeholder={newQrMediaUrl ? "Caption (opcional)..." : "Hola! Gracias por contactarnos..."}
                />
                <input ref={newQrFileRef} type="file" className="hidden"
                  accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/3gpp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadQrMedia(f, setNewQrMediaUrl, setNewQrMediaType, setNewQrMediaFilename, setNewQrUploading); e.target.value = ""; }}
                />
                <div className="flex gap-2">
                  <button onClick={() => newQrFileRef.current?.click()} disabled={newQrUploading}
                    className="h-8 px-2.5 rounded-xl border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1 disabled:opacity-40">
                    {newQrUploading ? <Loader2 size={12} className="animate-spin" /> : <Paperclip size={12} />}
                    {newQrMediaUrl ? "Cambiar" : "Adjuntar"}
                  </button>
                  <button
                    onClick={() => { setShowNewQrForm(false); setNewQrShortcut(""); setNewQrContent(""); setNewQrMediaUrl(null); setNewQrMediaType(null); setNewQrMediaFilename(null); }}
                    className="h-8 px-3 rounded-xl border text-xs hover:bg-secondary transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    disabled={!newQrShortcut.trim() || (!newQrContent.trim() && !newQrMediaUrl) || newQrUploading || upsertQuickReply.isPending}
                    onClick={async () => {
                      if (!newQrShortcut.trim() || (!newQrContent.trim() && !newQrMediaUrl)) return;
                      await upsertQuickReply.mutateAsync({ shortcut: newQrShortcut, content: newQrContent, media_url: newQrMediaUrl, media_type: newQrMediaType, media_filename: newQrMediaFilename });
                      setNewQrShortcut(""); setNewQrContent(""); setNewQrMediaUrl(null); setNewQrMediaType(null); setNewQrMediaFilename(null);
                      setShowNewQrForm(false);
                    }}
                    className="flex-1 h-8 rounded-xl bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-40 hover:opacity-90 transition-opacity"
                  >
                    <Plus size={12} /> Crear respuesta
                  </button>
                </div>
              </div>
              )}
            </div>
          )}

          {/* ── Flujos ── */}
          {section === "flujos" && (
            <div className="space-y-4">
              {flowWizardStep === null ? (
                <>
                  {flows.length === 0 && (
                    <div className="flex flex-col items-center justify-center gap-3 py-8">
                      <p className="text-xs text-muted-foreground/60 italic text-center">Sin flujos creados</p>
                      <button
                        onClick={startNewFlow}
                        className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity"
                      >
                        <Plus size={13} /> Crear Flujo
                      </button>
                    </div>
                  )}
                  {flows.map(flow => {
                    const isDraft = flow.status === "draft";
                    const seqName = sequences.find(s => s.id === flow.sequence_id)?.name;
                    return (
                      <div key={flow.id} className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl border ${isDraft ? "border-dashed border-amber-400/50 bg-amber-50/40 dark:bg-amber-950/10" : "border-border/60 bg-background"}`}>
                        <GitBranch size={13} className={`mt-0.5 shrink-0 ${isDraft ? "text-amber-500" : "text-muted-foreground"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium truncate">{flow.name || "Sin nombre"}</p>
                            {isDraft && (
                              <span className="text-[9px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 bg-amber-400/15 px-1.5 py-0.5 rounded-full shrink-0">
                                Borrador
                              </span>
                            )}
                          </div>
                          {isDraft ? (
                            <p className="text-[10px] text-amber-600/80 dark:text-amber-400/70 mt-0.5">Continúa en el paso {flow.draft_step} de 3</p>
                          ) : (
                            <>
                              <p className="text-[10px] text-muted-foreground/60 truncate">
                                {(flow.flow_trigger_type ?? "intent") === "new_conversation" ? "Conversación nueva" : flow.trigger_text || <em>Sin trigger</em>}
                              </p>
                              <p className="text-[10px] text-muted-foreground/50">
                                {(flow.country_sequences?.length > 0)
                                  ? <>→ Por país: {flow.country_sequences.map(cs => FLOW_COUNTRY_BY_CODE[cs.country_code]?.flag ?? cs.country_code).join(" ")}</>
                                  : (seqName ? `→ ${seqName}` : "→ Sin secuencia")
                                }
                                {" · "}
                                {FLOW_FINAL_ACTION_LABELS[flow.final_action]}
                              </p>
                            </>
                          )}
                        </div>
                        {!isDraft && (
                          <button
                            onClick={() => toggleFlow.mutate({ id: flow.id, is_active: !flow.is_active })}
                            className={`w-8 h-5 shrink-0 rounded-full transition-colors flex items-center px-0.5 mt-0.5 ${flow.is_active ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
                          >
                            <span className={`w-3 h-3 rounded-full bg-white shadow transition-transform ${flow.is_active ? "translate-x-3.5" : "translate-x-0"}`} />
                          </button>
                        )}
                        <button onClick={() => openFlowForEdit(flow)} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground transition-colors shrink-0">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => setPendingDeleteFlowId(flow.id)} className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })}
                </>
              ) : editingFlow && (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-secondary/20">
                    <button onClick={closeFlowWizard} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
                      <ArrowLeft size={14} />
                    </button>
                    <div className="flex flex-col items-center">
                      <p className="text-xs font-semibold">
                        {flowWizardStep === 1 ? "Nombre y activación" : flowWizardStep === 2 ? "Secuencia(s)" : "Acción final"}
                      </p>
                      <span className="text-[10px] text-muted-foreground/60">Paso {flowWizardStep} de 3</span>
                    </div>
                    <div style={{ width: 24 }} />
                  </div>

                  <div className="p-4 space-y-3">
                    {flowWizardStep === 1 && (
                      <>
                      {/* Nombre */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Nombre</label>
                        <input
                          value={editingFlow.name}
                          onChange={e => setEditingFlow(f => f ? { ...f, name: e.target.value } : f)}
                          placeholder="ej: Consulta de precios"
                          className="w-full h-8 px-2.5 text-base md:text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                              className={`w-full px-2.5 py-1.5 text-base md:text-xs rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none leading-relaxed transition-colors ${
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

                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={handleFlowStep1Continue}
                            disabled={savingFlowStep}
                            className="w-full h-9 rounded-xl bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-40 transition-opacity"
                          >
                            {savingFlowStep ? <Loader2 size={13} className="animate-spin" /> : null}
                            Continuar
                          </button>
                        </div>
                      </>
                    )}

                    {flowWizardStep === 2 && (
                      <>
                        {seqEditorOpen === null ? (
                          <>
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-muted-foreground">¿Cómo se usa la secuencia?</label>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => setFlowUsageMode("global")}
                                  className={`text-left px-3 py-2 rounded-xl border transition-all ${flowUsageMode === "global" ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border hover:border-primary/40 hover:bg-muted/30"}`}
                                >
                                  <p className="text-xs font-semibold">Global</p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">Misma secuencia para todos los contactos</p>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFlowUsageMode("country")}
                                  className={`text-left px-3 py-2 rounded-xl border transition-all ${flowUsageMode === "country" ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border hover:border-primary/40 hover:bg-muted/30"}`}
                                >
                                  <p className="text-xs font-semibold">Por País</p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">Una secuencia distinta según el país del contacto</p>
                                </button>
                              </div>
                            </div>

                            {/* UNA sola lista en los dos modos. Antes, en Por País, había un desplegable
                                de secuencia por fila Y abajo la lista completa: la misma secuencia
                                aparecía dos veces y elegirla era un paso aparte de elegir sus países.
                                Ahora se recorre la lista de secuencias y a cada una se le asignan sus
                                países ahí mismo; en Global se toca la que se quiere usar y ya. */}
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-muted-foreground">
                                {flowUsageMode === "global"
                                  ? "Toca la secuencia que enviará este flujo"
                                  : "Toca las secuencias que usará este flujo y elige los países de cada una"}
                              </label>
                              {sequences.length === 0 && (
                                <p className="text-[11px] text-muted-foreground/50 italic text-center py-2">
                                  Todavía no tienes secuencias. Crea la primera aquí abajo.
                                </p>
                              )}
                              {sequences.map(seq => {
                                const isDraft = seq.status === "draft";
                                const assigned = countriesForSequence(seq.id);
                                const inUse = isSequenceInUse(seq.id);
                                const isSelected = flowUsageMode === "global"
                                  ? editingFlow.sequence_id === seq.id
                                  : inUse;
                                // Elegida pero todavía sin países: no envía a nadie y bloquea continuar.
                                const missingCountries = flowUsageMode === "country" && inUse && assigned.length === 0;
                                const isExpanded = expandedCountrySeqId === seq.id;
                                const stepCount = (seq.draft_steps ?? seq.steps).length;
                                return (
                                  <div
                                    key={seq.id}
                                    className={`rounded-lg border transition-all ${
                                      missingCountries ? "border-destructive/50 bg-destructive/5"
                                      : isSelected ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                                      : "border-border/60 bg-background"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 px-3 py-2">
                                      <button
                                        onClick={() => {
                                          if (isDraft) { toast.error("Esta secuencia es un borrador. Ábrela y publícala para poder usarla."); return; }
                                          if (flowUsageMode === "global") {
                                            setEditingFlow(f => f ? { ...f, sequence_id: isSelected ? null : seq.id } : f);
                                          } else {
                                            toggleSequenceInUse(seq.id);
                                          }
                                        }}
                                        className={`flex-1 min-w-0 flex items-center gap-2 text-left ${isDraft ? "opacity-60" : ""}`}
                                      >
                                        {isSelected
                                          ? <CheckCircle2 size={13} className="text-primary shrink-0" />
                                          : <MessageSquare size={12} className="text-muted-foreground shrink-0" />}
                                        <span className="flex-1 min-w-0 truncate">
                                          <span className="text-xs">{seq.name}</span>
                                          <span className="block text-[10px] text-muted-foreground/60">
                                            {stepCount} paso{stepCount !== 1 ? "s" : ""}
                                            {isDraft && " · borrador sin publicar"}
                                            {!isDraft && seq.draft_steps && " · con cambios sin publicar"}
                                          </span>
                                        </span>
                                      </button>
                                      <button onClick={() => openSeqEditor(flowUsageMode, toDraftSequence(seq))} title="Editar" className="p-1 rounded-lg hover:bg-secondary text-muted-foreground transition-colors shrink-0">
                                        <Pencil size={11} />
                                      </button>
                                      <button onClick={() => setPendingDeleteSeqId(seq.id)} title="Eliminar" className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0">
                                        <Trash2 size={11} />
                                      </button>
                                    </div>

                                    {flowUsageMode === "country" && !isDraft && inUse && (
                                      <>
                                        <button
                                          onClick={() => setExpandedCountrySeqId(isExpanded ? null : seq.id)}
                                          className="w-full flex items-center gap-1.5 px-3 py-1.5 border-t border-border/40 text-left"
                                        >
                                          <Globe size={11} className="text-muted-foreground shrink-0" />
                                          <span className={`flex-1 min-w-0 truncate text-[10px] ${missingCountries ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                                            {assigned.length === 0
                                              ? "Falta elegir a qué países se envía"
                                              : `${assigned.length} país${assigned.length !== 1 ? "es" : ""}: ${assigned.map(c => FLOW_COUNTRY_BY_CODE[c]?.flag ?? c).join(" ")}`}
                                          </span>
                                          {isExpanded
                                            ? <ChevronUp size={11} className="text-muted-foreground shrink-0" />
                                            : <ChevronDown size={11} className="text-muted-foreground shrink-0" />}
                                        </button>
                                        {isExpanded && (
                                          <div className="px-3 pb-2.5 pt-1 space-y-2 border-t border-border/40">
                                            <div className="flex flex-wrap gap-1.5">
                                              {FLOW_COUNTRY_OPTIONS.map(c => {
                                                const mine = assigned.includes(c.code);
                                                const ownerId = countryRows.find(r => r.sequence_id !== seq.id && r.country_codes.includes(c.code))?.sequence_id;
                                                const owner = ownerId ? sequences.find(sq => sq.id === ownerId) : null;
                                                return (
                                                  <button
                                                    key={c.code}
                                                    type="button"
                                                    // Un país solo puede recibir UNA secuencia. En vez de dejar el
                                                    // botón muerto, tocarlo lo MUEVE acá y el aviso dice de dónde
                                                    // sale: bloquearlo obligaba a ir a buscar la otra tarjeta.
                                                    title={owner ? `Ahora lo recibe "${owner.name}" — tócalo para moverlo aquí` : undefined}
                                                    onClick={() => toggleCountryForSequence(seq.id, c.code)}
                                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium border transition-all ${
                                                      mine ? "border-primary bg-primary/10 text-primary"
                                                      : owner ? "border-dashed border-border text-muted-foreground/50 hover:border-primary/40"
                                                      : "border-border text-muted-foreground hover:border-primary/40"
                                                    }`}
                                                  >
                                                    <span>{c.flag}</span>{c.name}
                                                  </button>
                                                );
                                              })}
                                            </div>
                                            {assigned.length > 0 && (
                                              <button
                                                type="button"
                                                onClick={() => setCountryRows(rows => rows.map(r => r.sequence_id === seq.id ? { ...r, country_codes: [] } : r))}
                                                className="text-[10px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                                              >
                                                Limpiar selección
                                              </button>
                                            )}
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                              <button onClick={() => openSeqEditor(flowUsageMode)} className="flex items-center gap-1.5 w-full px-3 h-8 rounded-lg border border-dashed border-border text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors">
                                <Plus size={12} /> Crear secuencia
                              </button>
                              {flowUsageMode === "country" && (
                                <p className="text-[10px] text-muted-foreground/50">
                                  El flujo no se activa para contactos de países que no asignes a ninguna de las secuencias elegidas.
                                </p>
                              )}
                            </div>

                            <div className="flex gap-2 pt-1">
                              <button onClick={() => setFlowWizardStep(1)} className="h-9 px-4 rounded-xl border text-xs text-muted-foreground hover:bg-secondary transition-colors">
                                Atrás
                              </button>
                              <button
                                onClick={handleFlowStep2Continue}
                                disabled={savingFlowStep}
                                className="flex-1 h-9 rounded-xl bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-40 transition-opacity"
                              >
                                {savingFlowStep ? <Loader2 size={13} className="animate-spin" /> : null}
                                Continuar
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <button onClick={closeSeqEditor} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
                                <ArrowLeft size={14} />
                              </button>
                              <span className="text-xs font-medium">{editingSeq?.status === "published" ? "Editar secuencia" : "Nueva secuencia"}</span>
                              {/* Estado del autoguardado: los cambios nunca se pierden aunque se cierre
                                  a medias, pero siguen siendo un borrador hasta tocar Publicar. */}
                              <span className="ml-auto text-[10px] text-muted-foreground/60 flex items-center gap-1 shrink-0">
                                {draftSaveState === "saving" && <><Loader2 size={10} className="animate-spin" /> Guardando…</>}
                                {draftSaveState === "saved" && <><Check size={10} /> Borrador guardado</>}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-medium text-muted-foreground">Nombre</label>
                              <input
                                value={editingSeq?.name ?? ""}
                                onChange={e => setEditingSeq(s => s ? { ...s, name: e.target.value } : s)}
                                placeholder="ej: Presentación Paquete Gold"
                                className="w-full h-8 px-2.5 text-base md:text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                              />
                            </div>

                      {/* ── Mapa de la secuencia + editor del paso elegido — un solo elemento ── */}
                      <div className="rounded-lg border border-border overflow-hidden">
                        <div className="px-3 py-2 bg-secondary/20 border-b border-border/40">
                          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                            <GitBranch size={11} />
                            Tu secuencia
                            {sequenceGraph && sequenceGraph.nodes.length > 0 && (
                              <span className="text-[9px] font-normal opacity-50">
                                {editingSeq.steps.length} paso{editingSeq.steps.length !== 1 ? "s" : ""}
                                {activeBranches.filter(b => b.targetId).length > 0 && ` · ${activeBranches.filter(b => b.targetId).length} respuesta${activeBranches.filter(b => b.targetId).length !== 1 ? "s" : ""}`}
                              </span>
                            )}
                            {sequenceIssues.length > 0 && (
                              <span className="ml-auto flex items-center gap-1 text-[9px] font-semibold text-destructive shrink-0">
                                <AlertTriangle size={10} />
                                {sequenceIssues.length} sin conectar
                              </span>
                            )}
                          </div>
                          {sequenceGraph && sequenceGraph.nodes.length > 0 && !pickingTarget && (
                            <p className="text-[9.5px] text-muted-foreground/60 mt-0.5">
                              Así ve tu cliente la conversación, de izquierda a derecha. Toca un paso para editarlo abajo, o un "+" para agregar el siguiente.
                            </p>
                          )}
                        </div>
                        {/* Modo conexión: el lienzo mismo es el selector de destino. */}
                        {pickingTarget && (
                          <div className="px-3 py-2 bg-primary/10 border-b border-primary/30 flex items-center gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-semibold text-primary">
                                {pickableTargetIds.size > 0
                                  ? "Toca el paso al que quieres llevar la conversación"
                                  : "Todavía no hay un paso al que puedas llevarla"}
                              </p>
                              <p className="text-[9px] text-muted-foreground truncate">
                                {pickableTargetIds.size > 0
                                  ? describeEdgeSource(pickingTarget.source)?.text
                                  : "La conversación solo puede seguir hacia adelante. Mejor crea un paso nuevo aquí."}
                              </p>
                            </div>
                            <button
                              onClick={() => setPickingTarget(null)}
                              className="h-7 px-2.5 rounded-lg border border-border bg-background text-[10px] text-muted-foreground hover:bg-secondary transition-colors shrink-0"
                            >
                              Cancelar
                            </button>
                          </div>
                        )}
                        {/* Aviso de respuestas sin conectar — cada línea lleva de un toque al botón
                            exacto que falta resolver, en vez de dejar al usuario buscarlo en el árbol. */}
                        {sequenceIssues.length > 0 && !pickingTarget && (
                          <div className="px-3 py-2 bg-destructive/10 border-b border-destructive/20 space-y-1">
                            <p className="text-[10px] font-semibold text-destructive flex items-center gap-1">
                              <AlertTriangle size={11} className="shrink-0" />
                              No puedes guardar hasta conectar {sequenceIssues.length === 1 ? "esta respuesta" : "estas respuestas"}
                            </p>
                            {sequenceIssues.map(issue => (
                              <button
                                key={`${issue.questionId}-${issue.optionId ?? "sin-botones"}`}
                                onClick={() => {
                                  setTreeSelectedStepId(issue.questionId);
                                  if (issue.optionId) {
                                    setPendingConnectFlow({ kind: "option", questionStepId: issue.questionId, optionId: issue.optionId });
                                  }
                                }}
                                className="w-full flex items-center gap-1.5 text-left text-[10px] text-destructive/90 hover:text-destructive hover:underline"
                              >
                                <ChevronRight size={10} className="shrink-0" />
                                <span className="truncate">{issue.text}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {sequenceGraph && sequenceGraph.nodes.length > 0 ? (
                          <div
                            className="bg-secondary/10 overflow-auto"
                            style={{ maxHeight: 340 }}
                          >
                            <div
                              className="relative"
                              style={{
                                width: (sequenceGraph.maxDepth + 1) * SEQ_TREE_COL_PITCH + SEQ_TREE_NODE_W + 40,
                                // ROW_PITCH ya reserva espacio para el nodo Pregunta más alto posible (3 botones),
                                // así que un carril extra + margen alcanza para lo que quede en el último carril.
                                height: (sequenceGraph.maxLane + 1) * SEQ_TREE_ROW_PITCH + 16,
                                margin: 12,
                              }}
                            >
                              <svg className="absolute inset-0 overflow-visible pointer-events-none" width="100%" height="100%">
                                {edgeGeometry.map(({ edge, ei, sx, sy, tx, py, midX, color }) => (
                                  <g key={ei}>
                                    <path
                                      d={`M${sx},${sy} C${midX},${sy} ${midX},${py} ${tx},${py}`}
                                      stroke={color}
                                      strokeOpacity={edge.colorIdx !== undefined ? 0.8 : 0.3}
                                      strokeWidth={1.5}
                                      fill="none"
                                    />
                                    {/* Etiqueta junto al destino (no a la salida de la pregunta) — como cada opción
                                        normalmente termina en un paso distinto, las etiquetas de una misma pregunta
                                        quedan naturalmente separadas en vez de apiladas en un solo punto. */}
                                    {edge.label && (
                                      <text x={tx - 14} y={py - 7} textAnchor="end" fontSize="8" fontWeight="700" fill={color} fontFamily="system-ui, sans-serif">
                                        {edge.label}
                                      </text>
                                    )}
                                  </g>
                                ))}
                              </svg>
                              {sequenceGraph.nodes.map(node => {
                                const x = node.depth * SEQ_TREE_COL_PITCH;
                                const y = node.lane * SEQ_TREE_ROW_PITCH;
                                if (node.pending) {
                                  const parentEdge = sequenceGraph.edges.find(e => e.toId === node.id);
                                  return (
                                    <button
                                      key={node.id}
                                      onClick={() => parentEdge && node.pendingOptionId && setPendingConnectFlow({ kind: "option", questionStepId: parentEdge.fromId, optionId: node.pendingOptionId })}
                                      disabled={!!pickingTarget}
                                      title={`El botón "${node.pendingLabel}" todavía no lleva a ningún paso — tócalo para conectarlo o crear el paso que sigue`}
                                      className={`absolute flex flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-destructive/50 bg-destructive/5 text-[8px] text-destructive px-2 text-center leading-tight transition-all ${
                                        pickingTarget ? "opacity-25" : "hover:bg-destructive/10 hover:border-destructive/70"
                                      }`}
                                      style={{ left: x, top: y, width: SEQ_TREE_NODE_W, height: SEQ_TREE_NODE_H }}
                                    >
                                      <span className="font-semibold flex items-center gap-1"><AlertTriangle size={8} className="shrink-0" /> sin respuesta</span>
                                      <span className="opacity-70">toca para conectar</span>
                                    </button>
                                  );
                                }
                                const step = node.step!;
                                const isQ = step.type === "question";
                                const isLeaf = !isQ && !sequenceGraph.edges.some(e => e.fromId === node.id);
                                const canAddOption = isQ && (step.options?.filter(o => o.label.trim()).length ?? 0) < SEQ_TREE_MAX_PILLS;
                                const isSelected = step.id === treeSelectedStepId;
                                const preview = getStepPreview(step, 30);
                                const stepIdx = editingSeq.steps.findIndex(s => s.id === step.id);
                                const boxH = nodeBoxHeight(node);
                                const labeledOptions = isQ ? (step.options ?? []).filter(o => o.label.trim()).slice(0, SEQ_TREE_MAX_PILLS) : [];
                                // Modo conexión: solo los destinos válidos quedan vivos (halo que late), el resto
                                // se atenúa y no responde — el usuario ve de una cuáles son sus opciones reales.
                                const isPickable = !!pickingTarget && pickableTargetIds.has(step.id);
                                const isPickBlocked = !!pickingTarget && !isPickable;
                                // Mismo color de borde para la cabecera y el mockup de botones debajo — para que
                                // se lean como una sola tarjeta, no dos elementos apilados.
                                const stateBorderClass = isPickable ? "border-primary" : isSelected ? "border-primary" : isQ ? "border-amber-400/50" : "border-border/70";
                                return (
                                  <div
                                    key={node.id}
                                    className={`absolute transition-opacity ${isPickBlocked ? "opacity-25" : ""}`}
                                    style={{ left: x, top: y, width: SEQ_TREE_NODE_W, height: boxH }}
                                  >
                                    <button
                                      onClick={() => pickingTarget ? confirmPickedTarget(step.id) : setTreeSelectedStepId(step.id)}
                                      disabled={isPickBlocked}
                                      title={
                                        isPickable ? "Llevar la conversación hasta aquí"
                                        : isPickBlocked ? "Aquí no: la conversación avanza hacia adelante, no puede volver a un paso anterior"
                                        : node.mergeCount > 1 ? "Varias respuestas terminan en este mismo paso"
                                        : undefined
                                      }
                                      className={`absolute inset-x-0 top-0 flex flex-col justify-center gap-0.5 border px-2.5 py-1 text-left transition-colors overflow-hidden ${isQ ? "rounded-t-lg" : "rounded-lg"} ${
                                        isPickable ? "border-2 border-primary bg-primary/10 motion-safe:animate-connect-pulse"
                                        : isSelected ? "border-primary ring-2 ring-primary/25 bg-primary/5"
                                        : isQ ? "border-amber-400/50 bg-amber-400/5"
                                        : "border-border/70 bg-background"
                                      } ${isPickBlocked ? "cursor-not-allowed" : "hover:border-primary/50 hover:bg-primary/5"}`}
                                      style={{ height: SEQ_TREE_NODE_H, animationDelay: isPickable ? `${(node.depth * 2 + node.lane) * 90}ms` : undefined }}
                                    >
                                      <div className="flex items-center gap-1">
                                        <span className="text-[8px] text-muted-foreground/60 tabular-nums shrink-0">{stepIdx + 1}</span>
                                        <span className={`text-[9px] font-semibold shrink-0 ${isQ ? "text-amber-500 dark:text-amber-400" : "text-foreground/80"}`}>{STEP_TYPE_LABELS[step.type]}</span>
                                        {node.mergeCount > 1 && <span className="ml-auto text-[8px] text-muted-foreground/50 shrink-0">⤵</span>}
                                      </div>
                                      {preview && <span className="text-[8.5px] text-muted-foreground/65 truncate">{preview}</span>}
                                    </button>
                                    {/* Mockup de los botones de respuesta — se parece al mensaje interactivo real de
                                        WhatsApp, para que se entienda de un vistazo que una Pregunta trae botones. */}
                                    {isQ && (
                                      <div
                                        className={`absolute inset-x-0 rounded-b-lg border-x border-b overflow-hidden bg-background ${stateBorderClass}`}
                                        style={{ top: SEQ_TREE_NODE_H }}
                                      >
                                        {labeledOptions.length === 0 ? (
                                          <div className="flex items-center justify-center px-2 text-[8px] text-muted-foreground/40 italic" style={{ height: SEQ_TREE_PILL_H }}>
                                            Sin botones
                                          </div>
                                        ) : labeledOptions.map((o, oi) => {
                                          const color = BRANCH_COLORS[oi % BRANCH_COLORS.length];
                                          return (
                                            <div
                                              key={oi}
                                              title={o.label}
                                              className={`flex items-center justify-center px-2 truncate ${oi > 0 ? "border-t border-border/40" : ""} ${color.text}`}
                                              style={{ height: SEQ_TREE_PILL_H }}
                                            >
                                              <span className="text-[8px] font-medium truncate">{o.label}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                    {isLeaf && !pickingTarget && (
                                      <button
                                        onClick={() => setPendingConnectFlow({ kind: "after", afterStepId: step.id })}
                                        title="Agregar o conectar el siguiente paso"
                                        className="absolute top-1/2 -right-3 -translate-y-1/2 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center hover:bg-primary/90 transition-colors shadow"
                                      >
                                        +
                                      </button>
                                    )}
                                    {canAddOption && !pickingTarget && (
                                      <button
                                        onClick={() => addOptionToQuestion(step.id)}
                                        title="Agregar otro botón a esta pregunta"
                                        className="absolute -bottom-2.5 right-2 w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center hover:bg-amber-600 transition-colors shadow"
                                      >
                                        +
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                              {/* Controles de las conexiones, DESPUÉS de los nodos y con z-index: el círculo de
                                  editar se apoya sobre el borde del paso destino, así que si se dibujara con las
                                  líneas (detrás) la caja del nodo le taparía la mitad y quedaría medio oculto.
                                  El svg no captura clics; solo los grupos tocables los reactivan. */}
                              {!pickingTarget && (
                                <svg className="absolute inset-0 overflow-visible pointer-events-none z-10" width="100%" height="100%">
                                  {edgeGeometry.map(({ edge, ei, to, tx, py, midX, midY, color }) => (
                                    <g key={ei}>
                                      {/* "+" para intercalar un paso a la mitad de esta conexión */}
                                      {!to.pending && (
                                        <g
                                          onClick={() => setPendingStepCreate({ kind: "edge", fromId: edge.fromId, toId: edge.toId, optionId: edge.optionId })}
                                          style={{ cursor: "pointer", pointerEvents: "auto" }}
                                        >
                                          <circle cx={midX} cy={midY} r={7} fill="hsl(var(--card))" stroke={color} strokeOpacity={0.6} strokeWidth={1} />
                                          <text x={midX} y={midY + 3} textAnchor="middle" fontSize="10" fontWeight="700" fill={color} fillOpacity={0.8}>+</text>
                                        </g>
                                      )}
                                      {/* Tocar para cambiar o quitar el destino de esta conexión (en vez de
                                          arrastrar — más simple y funciona igual en mobile). */}
                                      {!to.pending && (
                                        <g
                                          onClick={() => setPendingEdgeManage(edge.optionId !== undefined
                                            ? { kind: "option", questionId: edge.fromId, optionId: edge.optionId }
                                            : { kind: "step", stepId: edge.fromId })}
                                          style={{ cursor: "pointer", pointerEvents: "auto" }}
                                        >
                                          <circle cx={tx} cy={py} r={7} fill="hsl(var(--card))" stroke={color} strokeWidth={1.5} />
                                          {/* El lápiz hace evidente que el círculo se toca para editar este camino
                                              — sin él parecía el remate decorativo de la línea. */}
                                          <Pencil x={tx - 4} y={py - 4} width={8} height={8} stroke={color} strokeWidth={2.5} />
                                        </g>
                                      )}
                                    </g>
                                  ))}
                                </svg>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-2 py-8 bg-secondary/10">
                            <p className="text-[11px] text-muted-foreground/60 italic">Sin pasos todavía</p>
                            <button
                              onClick={() => setPendingStepCreate({ kind: "first" })}
                              className="h-8 px-3 rounded-lg border border-dashed border-muted-foreground/40 bg-secondary/40 text-muted-foreground text-xs font-medium flex items-center gap-1.5 hover:bg-secondary/70 hover:border-muted-foreground/60 transition-colors"
                            >
                              <Plus size={12} /> Crear primer paso
                            </button>
                          </div>
                        )}

                        {/* ── Zona Edición: panel del paso seleccionado en el árbol de arriba ── */}
                        <div className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium text-muted-foreground bg-secondary/20 border-y border-border/40">
                          <Pencil size={11} />
                          {treeSelectedStepId && editingSeq.steps.some(s => s.id === treeSelectedStepId)
                            ? `Contenido del paso ${editingSeq.steps.findIndex(s => s.id === treeSelectedStepId) + 1}`
                            : "Contenido del paso"}
                        </div>
                        <div className="bg-card p-3">
                          {treeSelectedStepId && editingSeq.steps.some(s => s.id === treeSelectedStepId) ? (
                            <StepEditorPanel
                              step={editingSeq.steps.find(s => s.id === treeSelectedStepId)!}
                              allSteps={editingSeq.steps}
                              onChange={updated => setEditingSeq(s => {
                                if (!s) return s;
                                const newSteps = s.steps.map(st => st.id === updated.id ? updated : st);
                                return { ...s, steps: newSteps };
                              })}
                              onRemove={() => {
                                if (!treeSelectedStepId) return;
                                const impact = computeDeletionImpact(treeSelectedStepId);
                                if (impact.cascadeIds.length > 0) {
                                  setPendingDeleteStep({ id: treeSelectedStepId, ...impact });
                                  return;
                                }
                                deleteStepWithRewire(treeSelectedStepId, [], null);
                              }}
                              onDeleteOption={optionId => {
                                if (!treeSelectedStepId) return;
                                const orphanIds = computeOptionDeletionOrphans(treeSelectedStepId, optionId);
                                if (orphanIds.length > 0) {
                                  setPendingDeleteOption({ questionId: treeSelectedStepId, optionId, orphanIds });
                                  return;
                                }
                                setEditingSeq(s => {
                                  if (!s) return s;
                                  const steps = s.steps.map(st => st.id !== treeSelectedStepId ? st : { ...st, options: (st.options ?? []).filter(o => o.id !== optionId) });
                                  return { ...s, steps };
                                });
                              }}
                              userId={user?.id ?? ""}
                            />
                          ) : (
                            <p className="text-[11px] text-muted-foreground/50 italic text-center py-3">
                              {sequenceGraph && sequenceGraph.nodes.length > 0
                                ? 'Toca un paso de arriba para editar su contenido aquí, o crea uno nuevo con los "+".'
                                : "Crea el primer paso para empezar a editarlo aquí."}
                            </p>
                          )}
                        </div>
                      </div>

                            {/* El botón sigue habilitado a propósito: al tocarlo el aviso dice cuál es
                                el botón que falta conectar, en vez de quedar muerto sin explicación. */}
                            {sequenceIssues.length === 0 && (
                              <p className="text-[10px] text-muted-foreground/60 pt-1">
                                {editingSeq?.status === "published"
                                  ? "Tus cambios se guardan solos como borrador. La versión que reciben tus clientes es la última publicada."
                                  : "Tus cambios se guardan solos como borrador. Publícala para poder usarla en un flujo."}
                              </p>
                            )}
                            {sequenceIssues.length > 0 && (
                              <p className="flex items-center gap-1 text-[10px] font-medium text-destructive pt-1">
                                <AlertTriangle size={11} className="shrink-0" />
                                {sequenceIssues.length === 1
                                  ? "Hay 1 respuesta sin conectar — revísala arriba para poder guardar"
                                  : `Hay ${sequenceIssues.length} respuestas sin conectar — revísalas arriba para poder guardar`}
                              </p>
                            )}
                            <div className="flex gap-2 pt-1">
                              <button onClick={closeSeqEditor} className="h-9 px-4 rounded-xl border text-xs text-muted-foreground hover:bg-secondary transition-colors">
                                Cancelar
                              </button>
                              <button
                                onClick={handleSaveSequence}
                                disabled={savingFlowStep}
                                className={`flex-1 h-9 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-40 transition-opacity ${
                                  sequenceIssues.length > 0 ? "bg-primary/40 text-primary-foreground" : "bg-primary text-primary-foreground"
                                }`}
                              >
                                {savingFlowStep ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                                {editingSeq?.status === "published" ? "Guardar cambios" : "Publicar secuencia"}
                              </button>
                            </div>
                          </>
                        )}
                      </>
                    )}

                    {flowWizardStep === 3 && (
                      <>
                      {/* Acción final — son solo 2 opciones, así que se muestran las dos a la vez
                          (mismo patrón que Global / Por País del paso anterior): un desplegable
                          esconde la mitad de la decisión detrás de un toque de más. */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Cuando la secuencia termina…</label>
                        <div className="grid grid-cols-2 gap-2">
                          {(Object.entries(FLOW_FINAL_ACTION_DESCRIPTIONS) as [CrmWaFlowFinalAction, string][]).map(([key, description]) => {
                            const Icon = FLOW_FINAL_ACTION_ICONS[key];
                            const isSelected = editingFlow.final_action === key;
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => setEditingFlow(f => f ? { ...f, final_action: key } : f)}
                                className={`text-left px-3 py-2.5 rounded-xl border transition-all ${
                                  isSelected
                                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                                    : "border-border hover:border-primary/40 hover:bg-muted/30"
                                }`}
                              >
                                <span className={`flex items-center justify-center w-7 h-7 rounded-lg mb-1.5 ${
                                  isSelected ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
                                }`}>
                                  <Icon size={14} />
                                </span>
                                <p className="text-xs font-semibold">{FLOW_FINAL_ACTION_LABELS[key]}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                        <div className="flex gap-2 pt-1">
                          <button onClick={() => setFlowWizardStep(2)} className="h-9 px-4 rounded-xl border text-xs text-muted-foreground hover:bg-secondary transition-colors">
                            Atrás
                          </button>
                          <button
                            onClick={handleFlowPublish}
                            disabled={savingFlowStep}
                            className="flex-1 h-9 rounded-xl bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-40 transition-opacity"
                          >
                            {savingFlowStep ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                            {editingFlow.status === "published" ? "Guardar cambios" : "Publicar flujo"}
                          </button>
                        </div>
                      </>
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
              <Button
                onClick={handleSave}
                disabled={saving || !hasUnsavedConexionAgenteChanges}
                variant={hasUnsavedConexionAgenteChanges ? "default" : "secondary"}
                className="w-full h-9 gap-1.5"
              >
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
const MessageBubble = ({ msg, highlight, searchMatch, isActiveSearchMatch, onMsgContextMenu, replyToMsg, contactName }: { msg: CrmWaMessage; highlight?: boolean; searchMatch?: boolean; isActiveSearchMatch?: boolean; onMsgContextMenu?: (msg: CrmWaMessage, x: number, y: number) => void; replyToMsg?: CrmWaMessage; contactName?: string }) => {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Limpiar timer si el bubble se desmonta antes de que dispare
  useEffect(() => () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }, []);

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
      <div
        className={`max-w-[78%] sm:max-w-[65%] select-none ${highlight ? "ring-2 ring-yellow-400 ring-offset-2 rounded-2xl" : ""} ${isActiveSearchMatch ? "ring-2 ring-amber-400 ring-offset-2 rounded-2xl" : searchMatch ? "ring-1 ring-amber-300 ring-offset-1 rounded-2xl" : ""}`}
        style={{ WebkitTouchCallout: "none" } as React.CSSProperties}
        onContextMenu={onMsgContextMenu ? (e) => {
          e.preventDefault();
          // Cancelar timer manual para evitar doble disparo en iOS 13+ y Android
          if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
          onMsgContextMenu(msg, e.clientX, e.clientY);
        } : undefined}
        onTouchStart={onMsgContextMenu ? (e) => {
          const t = e.touches[0];
          // Fallback para iOS <13 donde contextmenu no se dispara en long press
          longPressTimer.current = setTimeout(() => { longPressTimer.current = null; onMsgContextMenu(msg, t.clientX, t.clientY); }, 500);
        } : undefined}
        onTouchEnd={onMsgContextMenu ? () => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } } : undefined}
        onTouchMove={onMsgContextMenu ? () => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } } : undefined}
      >
        <div className={`rounded-2xl overflow-hidden text-sm ${
          isIncoming
            ? "bg-white dark:bg-zinc-800 text-foreground rounded-tl-sm border border-border/40 shadow-sm"
            : isHuman
              ? "bg-[#1877F2] text-white rounded-tr-sm shadow-sm"
              : "bg-[#00a884] text-white rounded-tr-sm shadow-sm"
        }`}>
          {/* Quoted reply (B19-13) */}
          {(replyToMsg || msg.replied_to_preview) && (
            <div
              className={`flex overflow-hidden mx-2 mt-2 mb-1 rounded-lg ${replyToMsg ? "cursor-pointer" : ""} ${isIncoming ? "bg-black/[0.06]" : "bg-black/20"}`}
              onClick={replyToMsg ? (e) => { e.stopPropagation(); document.getElementById(`msg-${replyToMsg.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); } : undefined}
            >
              <div className={`w-1 shrink-0 ${isIncoming ? "bg-primary" : "bg-white/60"}`} />
              <div className="flex-1 px-2 py-1.5 min-w-0">
                {replyToMsg ? (
                  <>
                    <p className={`text-[11px] font-semibold leading-tight mb-0.5 truncate ${isIncoming ? "text-primary" : "text-white"}`}>
                      {replyToMsg.role === "user" ? (contactName ?? "Contacto") : replyToMsg.role === "human" ? "Tú" : "IA"}
                    </p>
                    <p className={`text-[11px] leading-tight truncate ${isIncoming ? "text-foreground/60" : "text-white/70"}`}>
                      {replyToMsg.media_url
                        ? (replyToMsg.media_type === "image" ? "Imagen" : replyToMsg.media_type === "document" ? "Documento" : replyToMsg.media_type === "video" ? "Video" : "Mensaje de voz")
                        : (replyToMsg.content?.slice(0, 80) ?? "")}
                    </p>
                  </>
                ) : (
                  <p className={`text-[11px] leading-tight truncate ${isIncoming ? "text-foreground/60" : "text-white/70"}`}>
                    {msg.replied_to_preview}
                  </p>
                )}
              </div>
            </div>
          )}
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
                <div className="flex items-center gap-1 mt-1.5 text-[10px] text-white/70">
                  <AlertTriangle size={9} className="shrink-0" />
                  <span>No enviado</span>
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
        {/* Explicación de error debajo de la burbuja */}
        {!isIncoming && (msg.delivery_status === "failed" || msg.send_error) && (
          <div className="flex items-start gap-1.5 mt-1 pr-1">
            <AlertTriangle size={11} className="shrink-0 text-orange-500 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-snug">
              {msg.send_error === "24h_window_expired" || msg.send_error === "whatsapp_window_expired"
                ? "No enviado — ventana de 24 h cerrada. Usa una plantilla para retomar."
                : msg.send_error
                  ? `No enviado — ${msg.send_error}`
                  : "No entregado — WhatsApp rechazó el mensaje (posiblemente ventana de 24 h cerrada). Usa una plantilla para retomar."}
            </p>
          </div>
        )}
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

// ─── Media Gallery Panel (B19-10) ─────────────────────────────────────────────
function MediaGalleryPanel({
  messages,
  tab,
  onTabChange,
  onClose,
}: {
  messages: CrmWaMessage[];
  tab: "photos" | "docs";
  onTabChange: (t: "photos" | "docs") => void;
  onClose: () => void;
}) {
  const photos = messages.filter(m => m.media_type === "image" && m.media_url);
  const docs   = messages.filter(m => m.media_type === "document" && m.media_url);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background">
      {/* Header — sticky */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <LayoutGrid size={15} className="text-muted-foreground" />
          <span className="text-sm font-semibold">Galería de medios</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      {/* Tabs — sticky */}
      <div className="flex shrink-0">
        {(["photos", "docs"] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => onTabChange(t)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors border-b-2 ${
              tab === t
                ? "text-primary border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            {t === "photos" ? `Fotos (${photos.length})` : `Documentos (${docs.length})`}
          </button>
        ))}
      </div>

      {/* Content — solo esta área scrollea */}
      {tab === "photos" ? (
        photos.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground px-6">
            <LayoutGrid size={28} className="opacity-20" />
            <p className="text-sm text-center">Sin fotos en esta conversación</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto" style={{ overscrollBehavior: "contain" }}>
            <div className="grid grid-cols-3 gap-0.5 p-0.5">
              {photos.map(m => (
                <a
                  key={m.id}
                  href={m.media_url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aspect-square overflow-hidden bg-secondary block"
                >
                  <img
                    src={m.media_url!}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                  />
                </a>
              ))}
            </div>
          </div>
        )
      ) : (
        docs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground px-6">
            <Paperclip size={28} className="opacity-20" />
            <p className="text-sm text-center">Sin documentos en esta conversación</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto divide-y" style={{ overscrollBehavior: "contain" }}>
            {docs.map(m => {
              const filename = m.content?.replace(/^\[PDF:\s*/, "").replace(/\]$/, "") ?? "Documento";
              const date = new Date(m.created_at).toLocaleDateString("es", {
                day: "2-digit", month: "short", year: "numeric",
              });
              return (
                <a
                  key={m.id}
                  href={m.media_url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/40 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Paperclip size={16} className="text-primary/70" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{filename}</p>
                    <p className="text-xs text-muted-foreground">{date}</p>
                  </div>
                  <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    Abrir →
                  </span>
                </a>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

// ─── Message Context Menu (B19-12) ────────────────────────────────────────────
function MessageContextMenu({
  msg, x, y, onClose, onReply, onCopyText, onCopyTranscription, onOpenMedia, onCreateNote, onDelete,
}: {
  msg: CrmWaMessage; x: number; y: number;
  onClose: () => void;
  onReply: () => void;
  onCopyText: () => void;
  onCopyTranscription: () => void;
  onOpenMedia: () => void;
  onCreateNote: () => void;
  onDelete: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const MENU_W = 210;
  const adjustedX = x + MENU_W > window.innerWidth ? x - MENU_W : x;
  const adjustedY = Math.min(y, window.innerHeight - 230);

  const canCopyText = !msg.media_url && !!msg.content && !msg.content.startsWith("[notif]");
  const canCopyTranscription = msg.media_type === "audio" && !!msg.transcription;
  const canOpenMedia = !!msg.media_url && msg.media_type !== "audio";

  return (
    <>
      <div className="fixed inset-0 z-40" onMouseDown={onClose} />
      <div
        style={{ left: adjustedX, top: adjustedY }}
        className="fixed z-50 bg-card border rounded-2xl shadow-xl py-1.5 min-w-[200px] overflow-hidden"
      >
        {/* Responder */}
        <button type="button"
          onClick={() => { onReply(); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary/60 transition-colors"
        >
          <Reply size={14} className="text-muted-foreground shrink-0" />
          Responder
        </button>

        {/* Copiar */}
        {canCopyText && (
          <button type="button"
            onClick={() => { onCopyText(); onClose(); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary/60 transition-colors"
          >
            <Copy size={14} className="text-muted-foreground shrink-0" />
            Copiar texto
          </button>
        )}
        {canCopyTranscription && (
          <button type="button"
            onClick={() => { onCopyTranscription(); onClose(); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary/60 transition-colors"
          >
            <Copy size={14} className="text-muted-foreground shrink-0" />
            Copiar transcripción
          </button>
        )}
        {canOpenMedia && (
          <button type="button"
            onClick={() => { onOpenMedia(); onClose(); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary/60 transition-colors"
          >
            <ExternalLink size={14} className="text-muted-foreground shrink-0" />
            Abrir adjunto
          </button>
        )}

        <div className="border-t mx-2 my-1" />

        {/* Nota interna */}
        <button type="button"
          onClick={() => { onCreateNote(); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary/60 transition-colors"
        >
          <StickyNote size={14} className="text-muted-foreground shrink-0" />
          Nota interna
        </button>

        <div className="border-t mx-2 my-1" />

        {/* Eliminar */}
        <button type="button"
          onClick={() => { onDelete(); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 size={14} className="shrink-0" />
          Eliminar mensaje
        </button>
      </div>
    </>
  );
}

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
  const [showMenu, setShowMenu]           = useState(false);
  const [showLabels, setShowLabels]       = useState(false);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [mediaGalleryTab, setMediaGalleryTab]   = useState<"photos" | "docs">("photos");
  const [ctxMenu, setCtxMenu] = useState<{ msg: CrmWaMessage; x: number; y: number } | null>(null);
  const [replyTo, setReplyTo] = useState<CrmWaMessage | null>(null);
  const [inChatSearchActive, setInChatSearchActive] = useState(false);
  const [inChatSearch, setInChatSearch]             = useState("");
  const [debouncedSearch, setDebouncedSearch]       = useState("");
  const [searchIndex, setSearchIndex]               = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
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
  const [pendingQrMedia, setPendingQrMedia] = useState<{ url: string; type: string; filename?: string | null } | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const pendingFileUrl = useMemo(() => pendingFile ? URL.createObjectURL(pendingFile) : null, [pendingFile]);
  useEffect(() => () => { if (pendingFileUrl) URL.revokeObjectURL(pendingFileUrl); }, [pendingFileUrl]);
  const bottomRef       = useRef<HTMLDivElement>(null);
  const fileInputRef    = useRef<HTMLInputElement>(null);
  const textareaRef     = useRef<HTMLTextAreaElement>(null);
  const prevNotesLogRef = useRef(false);

  const applyQuickReply = (qr: CrmQuickReply) => {
    setText(qr.content);
    if (qr.media_url) {
      setPendingQrMedia({ url: qr.media_url, type: qr.media_type ?? "document", filename: qr.media_filename });
    } else {
      setPendingQrMedia(null);
    }
    setShowQrPopover(false);
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      ta.style.height = "auto";
      ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
      ta.focus();
      ta.setSelectionRange(qr.content.length, qr.content.length);
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
    setShowMediaGallery(false);
    setInChatSearchActive(false);
    setInChatSearch("");
    setDebouncedSearch("");
    setNoteNavId(null);
    setText("");
    setShowEmojiPicker(false);
    setShowQrPopover(false);
    setQrSuggestions([]);
    setCtxMenu(null);
    setReplyTo(null);
    setPendingQrMedia(null);
    setPendingFile(null);
    setWindowError(false);
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

  // Detectar error de ventana 24h desde mensajes existentes
  const lastOutgoing = useMemo(() => [...messages].reverse().find(m => m.role === "human" && !m.is_internal), [messages]);
  const showWindowError = windowError || lastOutgoing?.send_error === "24h_window_expired" || lastOutgoing?.send_error === "whatsapp_window_expired" || lastOutgoing?.delivery_status === "failed";

  // ── In-chat search (B19-11) ────────────────────────────────────────────────

  // Debounce 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(inChatSearch), 300);
    return () => clearTimeout(t);
  }, [inChatSearch]);

  const searchMatches = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (q.length < 2) return [] as string[];
    return messages
      .filter(m => !m.is_internal && !m.media_url && !m.content?.startsWith("[notif]") && m.content?.toLowerCase().includes(q))
      .map(m => m.id);
  }, [debouncedSearch, messages]);

  const searchMatchSet = useMemo(() => new Set(searchMatches), [searchMatches]);
  const msgMap = useMemo(() => new Map(messages.map(m => [m.id, m])), [messages]);

  // Reset index cuando cambia la búsqueda
  useEffect(() => { setSearchIndex(0); }, [searchMatches]);

  // Scroll al resultado activo
  useEffect(() => {
    if (searchMatches.length === 0) return;
    const id = searchMatches[searchIndex];
    document.getElementById(`msg-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [searchIndex, searchMatches]);

  // Auto-focus al abrir buscador
  useEffect(() => {
    if (inChatSearchActive) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [inChatSearchActive]);

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
    if ((!text.trim() && !pendingQrMedia && !pendingFile) || sending) return;
    if (pendingFile) {
      await handleMediaUpload(pendingFile);
      setPendingFile(null);
      return;
    }
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
          setReplyTo(null);
          setPendingQrMedia(null);
          qc.invalidateQueries({ queryKey: ["crm_wa_messages", conv.id] });
        }
      } else if (pendingQrMedia) {
        const { data, error } = await supabase.functions.invoke("send-wa-message", {
          body: {
            conversation_id: conv.id,
            media_url: pendingQrMedia.url,
            media_type: pendingQrMedia.type,
            media_filename: pendingQrMedia.filename,
            ...(text.trim() ? { text: text.trim() } : {}),
            ...(replyTo ? { reply_to_id: replyTo.id } : {}),
          },
        });
        if (error || data?.error === "24h_window_expired") {
          setWindowError(true);
          if (data?.error === "24h_window_expired") toast.warning("Ventana de 24 h cerrada — usa una plantilla para retomar", { duration: 6000 });
          else toast.error("Error al enviar el archivo");
        } else {
          setText("");
          setReplyTo(null);
          setPendingQrMedia(null);
        }
      } else {
        const { data, error } = await supabase.functions.invoke("send-wa-message", {
          body: { conversation_id: conv.id, text: text.trim(), ...(replyTo ? { reply_to_id: replyTo.id } : {}) },
        });
        if (error || data?.error === "24h_window_expired") {
          setWindowError(true);
          if (data?.error === "24h_window_expired") toast.warning("Ventana de 24 h cerrada — usa una plantilla para retomar", { duration: 6000 });
          else toast.error("Error al enviar el mensaje");
        } else {
          setText("");
          setReplyTo(null);
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
      const uploadFile = await normalizeImageForWhatsApp(file);
      const ext = uploadFile.name.split(".").pop() ?? "bin";
      const path = `${conv.user_id}/${conv.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("chat-attachments").upload(path, uploadFile);
      if (uploadErr) { toast.error("Error al subir el archivo"); return; }

      const { data: urlData } = supabase.storage.from("chat-attachments").getPublicUrl(path);
      const mediaUrl = urlData.publicUrl;
      const mediaType = uploadFile.type.startsWith("image/") ? "image" : uploadFile.type.startsWith("video/") ? "video" : "document";
      const caption = text.trim() || undefined;

      const { data, error } = await supabase.functions.invoke("send-wa-message", {
        body: {
          conversation_id: conv.id,
          media_url: mediaUrl,
          media_type: mediaType,
          media_filename: uploadFile.name,
          ...(caption ? { text: caption } : {}),
          ...(replyTo ? { reply_to_id: replyTo.id } : {}),
        },
      });
      if (error || data?.error === "24h_window_expired") {
        setWindowError(true);
        if (data?.error === "24h_window_expired") toast.warning("Ventana de 24 h cerrada — usa una plantilla para retomar", { duration: 6000 });
        else toast.error("Error al enviar el archivo");
      } else {
        setText("");
        setReplyTo(null);
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
      <div className="px-3 sm:px-4 border-b flex items-center gap-2 shrink-0 bg-card" style={{ paddingTop: "max(0.625rem, env(safe-area-inset-top))", paddingBottom: "0.625rem" }}>
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
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold shrink-0 ${
              conv.mode === "AI"
                ? "bg-[#00a884]/12 text-[#00a884]"
                : "bg-blue-500/12 text-blue-600 dark:text-blue-400"
            }`}>
              {conv.mode === "AI" ? <Bot size={10} /> : <User size={10} />}
              {conv.mode === "AI" ? "Responde la IA" : "Respondes tú"}
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

          {/* Search (B19-11) */}
          <button
            onClick={() => { setInChatSearchActive(v => !v); setInChatSearch(""); setDebouncedSearch(""); setShowNotesLog(false); setShowMediaGallery(false); }}
            title="Buscar en conversación"
            className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-colors ${inChatSearchActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
          >
            <Search size={17} />
          </button>

          {/* Notes log */}
          <button
            onClick={() => { setShowNotesLog(v => !v); setShowMediaGallery(false); setInChatSearchActive(false); setInChatSearch(""); setDebouncedSearch(""); }}
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
                  <button
                    onClick={() => { setShowMenu(false); setShowMediaGallery(true); setShowNotesLog(false); setInChatSearchActive(false); setInChatSearch(""); setDebouncedSearch(""); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-secondary/60 transition-colors"
                  >
                    <LayoutGrid size={14} className="text-muted-foreground" />
                    Galería de medios
                  </button>
                  {(onArchive || onDelete) && <div className="border-t mx-2" />}
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

      {/* Search bar (B19-11) */}
      {inChatSearchActive && !showMediaGallery && !showNotesLog && (
        <div className="px-3 py-2 border-b bg-card shrink-0 flex items-center gap-2">
          <Search size={14} className="text-muted-foreground shrink-0" />
          <input
            ref={searchInputRef}
            value={inChatSearch}
            onChange={e => setInChatSearch(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Escape") { setInChatSearchActive(false); setInChatSearch(""); setDebouncedSearch(""); }
              if (e.key === "Enter") {
                if (searchMatches.length === 0) return;
                setSearchIndex(i => e.shiftKey ? (i - 1 + searchMatches.length) % searchMatches.length : (i + 1) % searchMatches.length);
              }
            }}
            placeholder="Buscar en la conversación..."
            className="flex-1 text-base md:text-sm bg-transparent outline-none placeholder:text-muted-foreground/60"
          />
          {searchMatches.length > 0 && (
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-xs text-muted-foreground tabular-nums">
                {searchIndex + 1} de {searchMatches.length}
              </span>
              <button
                type="button"
                onClick={() => setSearchIndex(i => (i - 1 + searchMatches.length) % searchMatches.length)}
                className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                title="Anterior (Shift+Enter)"
              >
                <ChevronUp size={14} />
              </button>
              <button
                type="button"
                onClick={() => setSearchIndex(i => (i + 1) % searchMatches.length)}
                className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                title="Siguiente (Enter)"
              >
                <ChevronDown size={14} />
              </button>
            </div>
          )}
          {inChatSearch.length >= 2 && searchMatches.length === 0 && debouncedSearch === inChatSearch && (
            <span className="text-xs text-muted-foreground/60 shrink-0">Sin resultados</span>
          )}
          <button
            type="button"
            onClick={() => { setInChatSearchActive(false); setInChatSearch(""); setDebouncedSearch(""); }}
            className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      )}

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

      {/* Messages / Notes log / Media gallery */}
      {showMediaGallery ? (
        <MediaGalleryPanel
          messages={messages}
          tab={mediaGalleryTab}
          onTabChange={setMediaGalleryTab}
          onClose={() => setShowMediaGallery(false)}
        />
      ) : showNotesLog ? (
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
              acc.push(<MessageBubble key={msg.id} msg={msg} highlight={msg.id === highlightMessageId || msg.id === noteNavId} searchMatch={searchMatchSet.has(msg.id)} isActiveSearchMatch={searchMatches[searchIndex] === msg.id} onMsgContextMenu={(m, x, y) => setCtxMenu({ msg: m, x, y })} replyToMsg={msg.reply_to_id ? msgMap.get(msg.reply_to_id) : undefined} contactName={conv.contact_name ?? "Contacto"} />);
              return acc;
            }, [])
          )}

          <div ref={bottomRef} className="h-2" />
        </div>
      )}

      {/* Input */}
      {!showMediaGallery && <div className="px-3 pt-2 pb-4 lg:pb-3 border-t bg-card shrink-0" style={{ paddingBottom: "max(1.75rem, env(safe-area-inset-bottom))" }}>
        {/* Reply preview bar */}
        {replyTo && (
          <div className="flex items-start gap-2 px-2 py-2 mb-2 rounded-xl bg-secondary/50 border border-border">
            <Reply size={13} className="text-primary mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0 border-l-2 border-primary pl-2">
              <p className="text-[11px] font-semibold text-primary leading-tight">
                {replyTo.role === "user" ? (conv.contact_name ?? "Contacto") : replyTo.role === "human" ? "Tú" : "IA"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {replyTo.media_url
                  ? (replyTo.media_type === "image" ? "Imagen" : replyTo.media_type === "document" ? "Documento" : replyTo.media_type === "video" ? "Video" : "Mensaje de voz")
                  : (replyTo.content?.slice(0, 80) ?? "")}
              </p>
            </div>
            <button type="button" onClick={() => setReplyTo(null)} className="p-1 text-muted-foreground hover:text-foreground shrink-0">
              <X size={13} />
            </button>
          </div>
        )}
        {/* Pending QR media preview */}
        {pendingQrMedia && (
          <div className="flex items-center gap-2 px-2 py-2 mb-2 rounded-xl bg-secondary/50 border border-border">
            {pendingQrMedia.type === "image"
              ? <img src={pendingQrMedia.url} className="w-10 h-10 rounded object-cover shrink-0" />
              : pendingQrMedia.type === "video"
                ? <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0"><FileVideo size={18} className="text-muted-foreground" /></div>
                : <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0"><Paperclip size={16} className="text-muted-foreground" /></div>
            }
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-muted-foreground leading-tight">
                {pendingQrMedia.type === "image" ? "Imagen" : pendingQrMedia.type === "video" ? "Video" : "Documento"}
              </p>
              <p className="text-xs text-muted-foreground/70 truncate">{pendingQrMedia.filename ?? "Archivo adjunto"}</p>
            </div>
            <button type="button" onClick={() => setPendingQrMedia(null)} className="p-1 text-muted-foreground hover:text-foreground shrink-0">
              <X size={13} />
            </button>
          </div>
        )}
        {/* Pending file preview */}
        {pendingFile && (
          <div className="flex items-center gap-2 px-2 py-2 mb-2 rounded-xl bg-secondary/50 border border-border">
            {pendingFile.type.startsWith("image/") && pendingFileUrl
              ? <img src={pendingFileUrl} className="w-10 h-10 rounded object-cover shrink-0" />
              : pendingFile.type.startsWith("video/")
                ? <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0"><FileVideo size={18} className="text-muted-foreground" /></div>
                : <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0"><Paperclip size={16} className="text-muted-foreground" /></div>
            }
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-muted-foreground leading-tight">
                {pendingFile.type.startsWith("image/") ? "Imagen" : pendingFile.type.startsWith("video/") ? "Video" : "Documento"}
              </p>
              <p className="text-xs text-muted-foreground/70 truncate">{pendingFile.name}</p>
            </div>
            <button type="button" onClick={() => setPendingFile(null)} className="p-1 text-muted-foreground hover:text-foreground shrink-0">
              <X size={13} />
            </button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif,video/mp4,video/3gpp,.mp4,.3gp,application/pdf,.pdf,application/msword,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,application/vnd.ms-excel,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx,application/vnd.ms-powerpoint,.ppt,application/vnd.openxmlformats-officedocument.presentationml.presentation,.pptx,text/plain,.txt,.zip,.rar"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) setPendingFile(f); e.target.value = ""; }}
        />
        {/* Quick Replies Popover (B19-9) */}
        {showQrPopover && qrSuggestions.length > 0 && (
          <div className="mb-1.5 bg-card border rounded-2xl shadow-xl overflow-hidden">
            {qrSuggestions.map((qr, i) => (
              <button
                key={qr.id}
                onMouseDown={e => { e.preventDefault(); applyQuickReply(qr); }}
                className={`w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors ${i === qrFocusIdx ? "bg-primary/10" : "hover:bg-secondary/60"}`}
              >
                <span className="text-xs font-mono font-semibold text-primary shrink-0 mt-0.5">/{qr.shortcut}</span>
                <div className="flex items-center gap-1.5 min-w-0">
                  {qr.media_type === "image" && <ImageIcon size={11} className="text-muted-foreground shrink-0" />}
                  {qr.media_type === "video" && <FileVideo size={11} className="text-muted-foreground shrink-0" />}
                  {qr.media_type === "document" && <Paperclip size={11} className="text-muted-foreground shrink-0" />}
                  <span className="text-xs text-muted-foreground truncate">{qr.content || qr.media_filename || "Archivo adjunto"}</span>
                </div>
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
                    if (sel) applyQuickReply(sel);
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
                  {isInternalMode ? "Nota interna — solo visible para el equipo..." : conv.mode === "AI" ? "Activa nota interna o toma el control..." : (pendingQrMedia || pendingFile) ? "Caption (opcional)..." : "Escribe un mensaje..."}
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
                title={conv.mode === "AI" ? "Responder tú este chat: la IA deja de contestar" : "Que la IA vuelva a responder este chat"}
                className={`inline-flex items-center gap-1 px-2 h-7 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                  conv.mode === "AI" ? "text-[#00a884] hover:bg-[#00a884]/10" : "text-blue-500 hover:bg-blue-500/10"
                }`}
              >
                {/* Antes el botón se etiquetaba con el estado actual ("Modo IA") mientras su tooltip
                    decía la acción contraria ("Tomar control manual") — una de las dos mentía. Ahora
                    el estado vive en la cabecera y el botón dice solo qué pasa si lo tocas. */}
                {conv.mode === "AI" ? <User size={13} /> : <Bot size={13} />}
                {conv.mode === "AI" ? "Tomar el control" : "Devolver a la IA"}
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
              disabled={sending || uploadingMedia || (!text.trim() && !pendingQrMedia && !pendingFile) || (conv.mode === "AI" && !isInternalMode)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-white transition-all shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: (text.trim() || pendingQrMedia || pendingFile) && !(conv.mode === "AI" && !isInternalMode) ? (isInternalMode ? "#d97706" : "#1877F2") : undefined }}
              title={isInternalMode ? "Guardar nota interna" : "Enviar"}
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : isInternalMode ? <StickyNote size={17} /> : <Send size={18} />}
            </button>
          </div>
        </div>
      </div>}

      {/* Context menu (B19-12) */}
      {ctxMenu && (
        <MessageContextMenu
          msg={ctxMenu.msg}
          x={ctxMenu.x}
          y={ctxMenu.y}
          onClose={() => setCtxMenu(null)}
          onReply={() => {
            setReplyTo(ctxMenu.msg);
            setShowNotesLog(false);
            setShowMediaGallery(false);
            setInChatSearchActive(false);
            setTimeout(() => textareaRef.current?.focus(), 50);
          }}
          onCopyText={() => {
            navigator.clipboard.writeText(ctxMenu.msg.content ?? "").catch(() => {});
            toast.success("Texto copiado");
          }}
          onCopyTranscription={() => {
            navigator.clipboard.writeText(ctxMenu.msg.transcription ?? "").catch(() => {});
            toast.success("Transcripción copiada");
          }}
          onOpenMedia={() => {
            if (ctxMenu.msg.media_url) window.open(ctxMenu.msg.media_url, "_blank", "noopener,noreferrer");
          }}
          onCreateNote={() => {
            setIsInternalMode(true);
            setShowNotesLog(false);
            setShowMediaGallery(false);
            setInChatSearchActive(false);
            setTimeout(() => textareaRef.current?.focus(), 50);
          }}
          onDelete={() => {
            supabase.from("crm_wa_messages").delete().eq("id", ctxMenu.msg.id).then(({ error }) => {
              if (error) toast.error("Error al eliminar el mensaje");
              else qc.invalidateQueries({ queryKey: ["crm_wa_messages", conv.id] });
            });
          }}
        />
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const CrmAgentIA = ({
  isSuperAdmin = false,
  isSaasClient = false,
  isStaff      = false,
  ownerUserId,
}: {
  isSuperAdmin?: boolean;
  isSaasClient?: boolean;
  isStaff?:      boolean;
  ownerUserId?:  string | null;
}) => {
  // Staff uses principal's userId to fetch config and conversations
  const principalId = isStaff ? (ownerUserId ?? undefined) : undefined;
  const { data: config, isLoading } = useAIAgentConfig(principalId);
  const { data: conversations = [] }         = useWaConversations(principalId);
  const { data: lastMessages = {} }          = useWaLastMessages(principalId);
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
  const [readFilter, setReadFilter]           = useState<"all" | "unread" | "favorites" | "pending_payment" | "human">("all");
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

  // Tabs del listado — "Pagos" solo aparece (al frente) mientras haya pagos pendientes de revisión
  const conversationTabs = useMemo(() => {
    const base = [
      { id: "all" as const,       label: "Todos" },
      { id: "unread" as const,    label: "Sin leer", count: conversations.filter(c => (c.unread_count ?? 0) > 0).length },
      { id: "favorites" as const, label: "Favoritos", icon: "star" as const },
      // Poder filtrar por "los que atiendo yo" es lo que convierte el modo IA/Humano en algo
      // entendible: deja de ser un color en un punto y pasa a ser una pregunta que se responde.
      { id: "human" as const, label: "Humano", icon: "human" as const, count: conversations.filter(c => c.mode === "HUMAN").length },
    ];
    if (pendingSaleConvIds.size === 0) return base;
    const paymentTab = { id: "pending_payment" as const, label: "Pagos", icon: "payment" as const, count: pendingSaleConvIds.size, amber: true };
    return [paymentTab, ...base];
  }, [conversations, pendingSaleConvIds]);

  // Si el tab de pagos pendientes desaparece (todo confirmado/rechazado) y estaba activo, volver a "Todos"
  useEffect(() => {
    if (readFilter === "pending_payment" && pendingSaleConvIds.size === 0) {
      setReadFilter("all");
    }
  }, [readFilter, pendingSaleConvIds]);

  const filteredConvs = useMemo(() => {
    const source = showArchived ? archivedConversations : conversations;
    const q = search.toLowerCase().replace(/\s/g, "");
    let result = source.filter(c => {
      if (!search) return true;
      const name = (c.contact_name ?? "").toLowerCase();
      const phone = c.phone.replace(/\D/g, "");
      return name.includes(q) || phone.includes(q.replace(/\D/g, ""));
    });
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
      } else if (readFilter === "pending_payment") {
        result = result.filter(c => pendingSaleConvIds.has(c.id));
      } else if (readFilter === "human") {
        result = result.filter(c => c.mode === "HUMAN");
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
  if (!isSuperAdmin && !isSaasClient && !isStaff) return null;

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
        <div className={`px-4 sm:px-5 border-b flex items-center gap-3 shrink-0 bg-card ${mobileShowChat ? "hidden lg:flex" : "flex"}`} style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))", paddingBottom: "0.75rem" }}>
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
              <p className="text-sm truncate">
                <span className="font-semibold">{config?.agent_name ?? "Agente IA"}</span>
                {config?.verified_business_name && (
                  <span className="text-[11px] font-normal text-muted-foreground"> de {config.verified_business_name}</span>
                )}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {config?.verified_phone && (
                  <span className="text-[11px] text-muted-foreground truncate">{config.verified_phone}</span>
                )}
                {config?.verified_phone
                  ? <span title="Conectado a la API de Meta" className="shrink-0 inline-flex"><Wifi size={13} className="text-[#00a884]" /></span>
                  : <span title="Desconectado — revisa Conexión en Configuración" className="shrink-0 inline-flex"><WifiOff size={13} className="text-destructive" /></span>
                }
                <span className="flex items-center gap-1 shrink-0">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config?.is_active ? "bg-[#00a884]" : "bg-muted-foreground/40"}`} />
                  <span className="text-[11px] text-muted-foreground">{config?.is_active ? "Activo" : "Apagado"}</span>
                </span>
              </div>
            </div>
          </div>
          {!isStaff && (
            <button onClick={() => setShowSettings(true)} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors" title="Configurar">
              <span className="relative inline-flex">
                <Settings size={18} />
                {!config?.verified_phone && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-destructive border-2 border-background" />
                )}
              </span>
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
              <div className="flex gap-0 overflow-x-auto">
                {conversationTabs.map(tab => {
                  const isActive = readFilter === tab.id;
                  const amber = (tab as any).amber === true;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setReadFilter(tab.id as "all" | "unread" | "favorites" | "pending_payment" | "human")}
                      className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors shrink-0 ${
                        isActive
                          ? amber
                            ? "border-amber-500 text-amber-600 dark:text-amber-400"
                            : "border-[#1877F2] text-[#1877F2]"
                          : amber
                            ? "border-transparent text-amber-600/80 hover:text-amber-600 dark:text-amber-400/80 dark:hover:text-amber-400"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tab.icon === "star" && <Star size={12} fill={isActive ? "currentColor" : "none"} />}
                      {tab.icon === "payment" && <CreditCard size={12} />}
                      {tab.icon === "human" && <User size={12} />}
                      {tab.label}
                      {tab.count !== undefined && tab.count > 0 && (
                        <span className={`min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-bold text-white ${amber ? "bg-amber-500" : "bg-[#1877F2]"}`}>
                          {tab.count > 99 ? "99+" : tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
                {staffList.length > 0 && staffRecord && (
                  <button
                    onClick={() => setAssignFilter(f => f === "mine" ? "all" : "mine")}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ml-auto shrink-0 ${
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
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ml-auto shrink-0 ${
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
                  className="h-9 text-base md:text-sm pl-8 bg-secondary/60 border-transparent focus:border-input rounded-xl"
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
                    className="h-9 text-base md:text-sm pl-8 bg-secondary/60 border-transparent focus:border-input rounded-xl"
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
                    ) : readFilter === "human" ? (
                      <>
                        <User size={24} className="opacity-30" />
                        <p className="text-xs font-medium">Ningún chat en manos del equipo</p>
                        <p className="text-xs opacity-70">La IA está respondiendo todas las conversaciones. Toma el control de una cuando quieras responder tú.</p>
                      </>
                    ) : readFilter === "pending_payment" ? (
                      <>
                        <CreditCard size={24} className="opacity-30 text-amber-600 dark:text-amber-400" />
                        <p className="text-xs font-medium">Sin pagos pendientes</p>
                        <p className="text-xs opacity-70">Los comprobantes que necesiten tu confirmación manual aparecerán aquí.</p>
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
                    const convLabels = convLabelsMap[conv.id] ?? [];
                    const preview = lastMessagePreview(lastMessages[conv.id]);
                    // El teléfono solo se repite si arriba se está mostrando el nombre del contacto.
                    const subtitle = hasPendingPayment
                      ? `💳 ${pendingSale?.product_name ?? pendingSale?.service_name ?? "Pago pendiente"} · ${formatSaleAmount(Number(pendingSale?.amount), pendingSale?.currency ?? null)}`
                      : conv.contact_name ? `+${conv.phone}` : "";
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
                          {/* Quién responde este chat. Antes era un punto de color a secas: sin
                              leyenda, verde y azul no significan nada. Con el ícono la forma ya lo
                              dice, y el color queda como refuerzo (no como única pista). */}
                          <span
                            title={conv.mode === "AI" ? "La IA responde este chat" : "Este chat lo respondes tú"}
                            className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-background flex items-center justify-center ${
                              conv.mode === "AI" ? "bg-[#00a884]" : "bg-blue-500"
                            }`}
                          >
                            {conv.mode === "AI" ? <Bot size={9} className="text-white" /> : <User size={9} className="text-white" />}
                          </span>
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
                          {/* Renglón 2: identidad (teléfono o pago pendiente) + etiquetas.
                              Las etiquetas vivían en un renglón propio abajo del todo; se movieron
                              acá, a la derecha de este renglón —que estaba vacío— para dejarle el
                              último renglón al preview de la conversación sin que la fila crezca. */}
                          {(subtitle || convLabels.length > 0) && (
                            <div className="flex items-center justify-between gap-2 mt-0.5">
                              <p className={`text-[11px] truncate flex-1 ${hasPendingPayment ? "text-amber-700 dark:text-amber-500 font-medium" : "text-muted-foreground/70"}`}>
                                {subtitle}
                              </p>
                              {convLabels.length > 0 && (
                                <span className="flex items-center gap-1 shrink-0">
                                  {convLabels.slice(0, 5).map(l => (
                                    <span key={l.id} title={l.name} className="inline-flex">
                                      <Tag size={10} style={{ color: l.color }} />
                                    </span>
                                  ))}
                                  {convLabels.length > 5 && (
                                    <span className="text-[9px] text-muted-foreground">+{convLabels.length - 5}</span>
                                  )}
                                </span>
                              )}
                            </div>
                          )}
                          {/* Renglón 3: de qué se viene hablando */}
                          <div className="flex items-center justify-between gap-2 mt-0.5">
                            <p className={`text-[12px] truncate flex-1 ${isUnread ? "text-foreground/80 font-medium" : "text-muted-foreground"}`}>
                              {preview ?? <span className="italic text-muted-foreground/40">Sin mensajes todavía</span>}
                            </p>
                            {isUnread && (
                              <span className="shrink-0 min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-[#1877F2] text-[11px] font-bold text-white">
                                {unread > 99 ? "99+" : unread}
                              </span>
                            )}
                          </div>
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
                  const qDigits = q.replace(/\D/g, "");
                  const contactMatches = conversations.filter(c => {
                    const name = (c.contact_name ?? "").toLowerCase();
                    const phone = c.phone.replace(/\D/g, "");
                    return name.includes(q) || (qDigits && phone.includes(qDigits));
                  });
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
            <div className="mx-3 my-1 border-t border-border/60" />
            <button
              onClick={() => {
                setDeleteModalId(convMenu.id);
                setConvMenu(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              <Trash2 size={14} />
              Eliminar chat
            </button>
          </div>
        </>
      )}
    </>
  );
};

export default CrmAgentIA;
