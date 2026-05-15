import { useState, useEffect, useRef, useMemo } from "react";
import {
  Bot, Settings, Send, Wifi, WifiOff, MessageSquare, Loader2,
  CheckCircle2, AlertTriangle, Copy, Trash2, X, Eye, EyeOff,
  Check, ChevronRight, Zap, Clock, Calendar, Phone, Sparkles, Lock,
  User, Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import WeeklySchedulePicker from "@/components/shared/WeeklySchedulePicker";
import type { WeeklySchedule } from "@/components/shared/WeeklySchedulePicker";
import {
  useAIAgentConfig, useUpsertAIAgentConfig,
  useWaConversations, useWaMessages,
  useSetWaConversationMode, useDeleteWaConversation,
  useBusinessProfile,
} from "@/hooks/useCrmData";
import { supabase } from "@/lib/supabase";
import type { CrmWaConversation, CrmWaMessage } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/useAuth";
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
  const [systemPrompt, setSystemPrompt] = useState(existingConfig?.system_prompt ?? DEFAULT_PROMPT);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  // Step 3 — Capacidades
  const [canBook, setCanBook]         = useState(existingConfig?.can_book_appointments ?? false);
  const [canContacts, setCanContacts] = useState(existingConfig?.can_create_contacts ?? true);
  const [canServices, setCanServices] = useState(existingConfig?.can_answer_services ?? true);
  const [canTransfer, setCanTransfer] = useState(existingConfig?.can_transfer_human ?? false);

  // Step 4 — Horario
  const [schedule, setSchedule]     = useState<WeeklySchedule>(
    (existingConfig?.schedule as WeeklySchedule | null) ?? DEFAULT_SCHEDULE
  );
  const [timezone, setTimezone]     = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [offHoursMsg, setOffHoursMsg] = useState(existingConfig?.off_hours_message ?? "");
  const timezoneInitialized         = useRef(false);

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
    await upsert.mutateAsync({ agent_name: agentName.trim(), model: "claude-haiku-4-5-20251001", system_prompt: systemPrompt || null });
    setStep(3);
  };

  const handleSaveStep3 = async () => {
    await upsert.mutateAsync({ can_book_appointments: canBook, can_create_contacts: canContacts, can_answer_services: canServices, can_transfer_human: canTransfer });
    setStep(4);
  };

  const handleSaveStep4 = async () => {
    await upsert.mutateAsync({ schedule, timezone, off_hours_message: offHoursMsg || null });
    setStep(5);
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

  const STEP_LABELS = ["Conexión", "Agente", "Capacidades", "Horario", "Activar"];

  return (
    <div className="flex flex-col items-center justify-center min-h-full py-10 px-4">
      <div className="w-full max-w-lg space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Bot size={24} className="text-primary" />
          </div>
          <h1 className="text-lg font-semibold">Configura tu Agente IA</h1>
          <p className="text-sm text-muted-foreground">{STEP_LABELS[step - 1]} — Paso {step} de 5</p>
        </div>

        <StepIndicator current={step} total={5} />

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
          <div className="bg-card border rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2"><Sparkles size={14} />Personalidad del Agente</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Define cómo se presenta y responde tu agente de IA.</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Nombre del agente</label>
              <Input value={agentName} onChange={e => setAgentName(e.target.value)} placeholder="Sofi, Asistente..." className="h-9 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Prompt del sistema</label>
              <Textarea ref={promptRef} value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} rows={8}
                className="text-sm resize-none font-mono text-xs leading-relaxed" placeholder="Describe el comportamiento del agente..." />
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] text-muted-foreground self-center">Insertar variable:</span>
                {PROMPT_VARIABLES.map(v => (
                  <button key={v.label} onClick={() => insertVariable(v.label)} title={v.desc}
                    className="text-[10px] font-mono bg-primary/8 text-primary border border-primary/20 px-1.5 py-0.5 rounded hover:bg-primary/15 transition-colors">
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Nota sobre capacidades de media */}
            <div className="rounded-xl border border-border bg-secondary/30 px-4 py-3 space-y-1.5">
              <p className="text-xs font-semibold">Capacidades del asistente con archivos</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>✅ <strong>Imágenes</strong> — el asistente puede verlas y analizarlas (ideal para comprobantes de pago, fotos de productos, etc.)</p>
                <p>✅ <strong>PDFs</strong> — puede leer documentos PDF enviados por WhatsApp</p>
                <p>🚫 <strong>Audios</strong> — no soportado. Cuando alguien envíe un audio, el asistente responderá automáticamente pidiendo que escriban el mensaje</p>
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
            {[
              { label: "Agendar citas", sub: "Crea citas en el calendario del CRM", val: canBook, set: setCanBook },
              { label: "Crear contactos automáticamente", sub: "Guarda nuevos leads al recibir mensajes", val: canContacts, set: setCanContacts },
              { label: "Responder sobre servicios y precios", sub: "Informa a clientes sobre el catálogo de servicios", val: canServices, set: setCanServices },
              { label: "Transferir a humano", sub: "Cambia a modo HUMAN y te notifica para que tomes la conversación", val: canTransfer, set: setCanTransfer },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between gap-4 py-3 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.sub}</p>
                </div>
                <button onClick={() => item.set(!item.val)} className="relative shrink-0 rounded-full" style={{ width: 40, height: 22 }}>
                  <span className={`absolute inset-0 rounded-full transition-colors ${item.val ? "bg-primary" : "bg-secondary border"}`} />
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${item.val ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </div>
            ))}
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

        {/* ── Step 5: Resumen + Activar ── */}
        {step === 5 && (
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
              <Button variant="outline" onClick={() => setStep(4)} className="h-9 text-xs shrink-0">Atrás</Button>
              <Button
                onClick={handleActivar}
                disabled={saving}
                className="flex-1 h-11 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm"
              >
                {saving
                  ? <Loader2 size={15} className="animate-spin" />
                  : <Bot size={15} />
                }
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
const SettingsPanel = ({ onClose, onDisconnect }: { onClose: () => void; onDisconnect: () => void }) => {
  const { data: config } = useAIAgentConfig();
  const { data: businessProfile } = useBusinessProfile();
  const { user } = useCurrentUser();
  const upsert = useUpsertAIAgentConfig();
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
  const [systemPrompt, setSystemPrompt]   = useState(DEFAULT_PROMPT);
  const [isActive, setIsActive]           = useState(false);
  const [canBook, setCanBook]             = useState(false);
  const [canContacts, setCanContacts]     = useState(true);
  const [canServices, setCanServices]     = useState(true);
  const [canTransfer, setCanTransfer]     = useState(false);
  const [schedule, setSchedule]           = useState<WeeklySchedule>(DEFAULT_SCHEDULE);
  const [timezone, setTimezone]           = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [offHoursMsg, setOffHoursMsg]     = useState("");
  const [section, setSection]             = useState<"conexion"|"agente"|"capacidades"|"horario"|"perfil">("conexion");
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
    setSystemPrompt(config.system_prompt ?? DEFAULT_PROMPT);
    setIsActive(config.is_active ?? false);
    setCanBook(config.can_book_appointments ?? false);
    setCanContacts(config.can_create_contacts ?? true);
    setCanServices(config.can_answer_services ?? true);
    setCanTransfer(config.can_transfer_human ?? false);
    setSchedule((config.schedule as WeeklySchedule | null) ?? DEFAULT_SCHEDULE);
    setTimezone(config.timezone ?? businessProfile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
    setOffHoursMsg(config.off_hours_message ?? "");
  }, [config]);

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
        can_create_contacts: canContacts,
        can_answer_services: canServices,
        can_transfer_human: canTransfer,
        schedule,
        timezone,
        off_hours_message: offHoursMsg || null,
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
    const pid = config?.phone_number_id;
    const tok = config?.access_token;
    if (!pid || !tok) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("messaging_product", "whatsapp");
      formData.append("type", file.type);
      formData.append("file", file);
      const uploadRes = await fetch(`https://graph.facebook.com/v21.0/${pid}/media`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tok}` },
        body: formData,
      });
      if (!uploadRes.ok) throw new Error(await uploadRes.text());
      const { id: mediaId } = await uploadRes.json();
      const profileRes = await fetch(`https://graph.facebook.com/v21.0/${pid}/whatsapp_business_profile`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", photo_media_handle: mediaId }),
      });
      if (!profileRes.ok) throw new Error(await profileRes.text());
      setProfilePicUrl(URL.createObjectURL(file));
      toast.success("Foto de perfil actualizada");
    } catch (err: any) { toast.error(err.message?.slice(0, 100) ?? "Error al subir la foto"); }
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
      toast.success("Conexión OK");
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
            <div className="space-y-4">
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
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Nombre del agente</label>
                <Input value={agentName} onChange={e => setAgentName(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Prompt del sistema</label>
                <Textarea ref={promptRef} value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} rows={10} className="text-xs font-mono resize-none leading-relaxed" />
                <div className="flex flex-wrap gap-1">
                  {PROMPT_VARIABLES.map(v => (
                    <button key={v.label} onClick={() => insertVariable(v.label)} title={v.desc} className="text-[10px] font-mono bg-primary/8 text-primary border border-primary/20 px-1.5 py-0.5 rounded hover:bg-primary/15 transition-colors">
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-secondary/30 px-3 py-2.5 space-y-1 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">Archivos soportados</p>
                <p>✅ Imágenes · ✅ PDFs · 🚫 Audios (respuesta automática)</p>
              </div>
            </div>
          )}

          {section === "capacidades" && (
            <div className="space-y-1">
              {[
                { label: "Agendar citas",              sub: "Crea citas en el calendario",       val: canBook,     set: setCanBook },
                { label: "Crear contactos",            sub: "Guarda nuevos leads automáticamente", val: canContacts, set: setCanContacts },
                { label: "Responder sobre servicios",  sub: "Informa precios y servicios",       val: canServices, set: setCanServices },
                { label: "Transferir a humano",        sub: "Cambia a HUMAN y notifica",         val: canTransfer, set: setCanTransfer },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.sub}</p>
                  </div>
                  <button onClick={() => item.set(!item.val)} className="relative shrink-0 rounded-full" style={{ width: 40, height: 22 }}>
                    <span className={`absolute inset-0 rounded-full transition-colors ${item.val ? "bg-primary" : "bg-secondary border"}`} />
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${item.val ? "left-[22px]" : "left-0.5"}`} />
                  </button>
                </div>
              ))}
            </div>
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

        {/* Footer — solo visible en tabs que tienen guardado global */}
        {section !== "perfil" && (
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
const MessageBubble = ({ msg }: { msg: CrmWaMessage }) => {
  const isUser = msg.role === "user";
  const bubbleClass = isUser
    ? "bg-secondary text-foreground rounded-tl-sm"
    : msg.role === "human"
      ? "bg-amber-500 text-white rounded-tr-sm"
      : "bg-emerald-500 text-white rounded-tr-sm";

  return (
    <div className={`flex ${isUser ? "justify-start" : "justify-end"} mb-2`}>
      <div className={`max-w-[78%] rounded-2xl overflow-hidden text-sm relative ${bubbleClass}`}>
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
            <span>📄</span> {msg.content.replace(/^\[PDF: /, "").replace(/\]$/, "")}
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
            {msg.content !== "[Imagen]" ? msg.content : null}
            {msg.send_error && (
              <div className="flex items-center gap-1 mt-1.5 text-[10px] opacity-80">
                <AlertTriangle size={10} />
                {msg.send_error === "24h_window_expired" ? "Ventana 24h expirada" : "Error al enviar"}
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
const ChatPanel = ({ conv }: { conv: CrmWaConversation }) => {
  const { data: messages = [], isLoading } = useWaMessages(conv.id);
  const setMode = useSetWaConversationMode();
  const deleteConv = useDeleteWaConversation();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [windowError, setWindowError] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

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

  const handleToggleMode = async () => {
    const next = conv.mode === "AI" ? "HUMAN" : "AI";
    await setMode.mutateAsync({ id: conv.id, mode: next });
    toast.success(next === "AI" ? "Modo IA activado" : "Modo manual activado");
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteConv.mutateAsync(conv.id);
      toast.success("Conversación eliminada");
    } catch { toast.error("Error al eliminar"); }
    finally { setDeleting(false); setConfirmDelete(false); }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="px-5 py-3.5 border-b flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
          <Phone size={15} className="text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{conv.contact_name ?? conv.phone}</p>
          {conv.contact_name && <p className="text-[11px] text-muted-foreground truncate">+{conv.phone}</p>}
        </div>
        <div className="flex items-center gap-2">
          {/* Mode toggle */}
          <button
            onClick={handleToggleMode}
            disabled={setMode.isPending}
            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${
              conv.mode === "AI"
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            }`}
          >
            {conv.mode === "AI" ? <><Bot size={11} /> IA</> : <><MessageSquare size={11} /> HUMAN</>}
          </button>
          {/* Delete */}
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button onClick={handleDelete} disabled={deleting} className="text-[11px] text-destructive font-semibold hover:underline">
                {deleting ? <Loader2 size={12} className="animate-spin" /> : "Confirmar"}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="text-[11px] text-muted-foreground hover:text-foreground">Cancelar</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

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
          messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)
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
            <Input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Escribe un mensaje..."
              className="flex-1 h-10 text-sm"
              disabled={sending}
            />
            <Button onClick={handleSend} disabled={sending || !text.trim()} size="sm" className="h-10 px-3 shrink-0">
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
}: {
  isSuperAdmin?: boolean;
  isSaasClient?: boolean;
}) => {
  const { data: config, isLoading } = useAIAgentConfig();
  const { data: conversations = [] } = useWaConversations();
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [search, setSearch]           = useState("");
  const [wizardDone, setWizardDone]   = useState(false);
  const [forceWizard, setForceWizard] = useState(false);

  const handleDisconnect = () => {
    setForceWizard(true);
    setWizardDone(false);
    setShowSettings(false);
  };

  const selectedConv = useMemo(
    () => conversations.find(c => c.id === selectedId) ?? null,
    [conversations, selectedId]
  );

  const filteredConvs = useMemo(() =>
    conversations.filter(c =>
      !search || (c.contact_name ?? c.phone).toLowerCase().includes(search.toLowerCase())
    ),
    [conversations, search]
  );

  // Auto-select first conversation
  useEffect(() => {
    if (!selectedId && conversations.length > 0) setSelectedId(conversations[0].id);
  }, [conversations, selectedId]);

  if (!isSuperAdmin && !isSaasClient) return null;
  if (!isSuperAdmin && isSaasClient) return <ProximamenteScreen />;

  if (isLoading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 size={24} className="animate-spin text-muted-foreground" />
    </div>
  );

  const configRowExists = config !== null && config !== undefined;
  const needsWizard = forceWizard || (!configRowExists && !wizardDone);
  if (needsWizard) {
    return <SetupWizard onComplete={() => { setWizardDone(true); setForceWizard(false); }} />;
  }

  return (
    <>
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} onDisconnect={handleDisconnect} />}

      <div className="flex flex-col h-full -mx-4 -my-6 sm:-mx-6 sm:-my-8">
        {/* Top bar */}
        <div className="px-5 py-3.5 border-b flex items-center gap-3 shrink-0 bg-card">
          <div className="flex items-center gap-2.5 flex-1">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bot size={16} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">{config?.agent_name ?? "Agente IA"}</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config?.is_active ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                <span className="text-[11px] text-muted-foreground">{config?.is_active ? "Activo" : "Inactivo"}</span>
                {config?.verified_phone && (
                  <span className="text-[11px] text-muted-foreground">· {config.verified_phone}</span>
                )}
                <span className="text-[11px] text-muted-foreground">· {conversations.length} conv.</span>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(true)}
            className="h-8 gap-1.5 text-xs"
          >
            <Settings size={13} /> Configurar
          </Button>
        </div>

        {/* Main layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Conversation list */}
          <div className="w-72 shrink-0 border-r flex flex-col overflow-hidden">
            <div className="p-3 border-b">
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar conversación..."
                className="h-8 text-xs"
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredConvs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground px-4 text-center">
                  <MessageSquare size={20} className="opacity-30" />
                  <p className="text-xs">Sin conversaciones aún. Cuando alguien te escriba por WhatsApp, aparecerá aquí.</p>
                </div>
              ) : (
                filteredConvs.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedId(conv.id)}
                    className={`w-full text-left px-4 py-3 border-b transition-colors hover:bg-secondary/50 ${
                      selectedId === conv.id ? "bg-secondary" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-xs font-semibold truncate flex-1">
                        {conv.contact_name ?? `+${conv.phone}`}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          conv.mode === "AI"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        }`}>
                          {conv.mode}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{formatTime(conv.last_message_at)}</span>
                      </div>
                    </div>
                    {conv.contact_name && (
                      <p className="text-[11px] text-muted-foreground truncate">+{conv.phone}</p>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat area */}
          <div className="flex-1 overflow-hidden">
            {selectedConv ? (
              <ChatPanel conv={selectedConv} />
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
