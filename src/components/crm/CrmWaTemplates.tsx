import { useState, useEffect, useRef } from "react";
import {
  Plus, Trash2, Send, RefreshCw, AlertCircle, CheckCircle2,
  Clock, XCircle, PauseCircle, ChevronDown, ChevronUp,
  MessageSquare, Info, ExternalLink, HelpCircle, Wand2, ShieldOff, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  useWaTemplates,
  useCreateWaTemplate,
  useUpdateWaTemplate,
  useDeleteWaTemplate,
} from "@/hooks/useCrmData";
import type {
  CrmWaTemplate,
  WaTemplateContext,
  WaTemplateCategory,
  WaTemplateButton,
  WaTemplateAssocType,
} from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/useAuth";

// ─── Meta pricing table ───────────────────────────────────────────────────────
const META_PRICING = [
  { region: "Bolivia, Perú, Chile, Argentina, Colombia", marketing: "$0.0147", utility: "$0.0062" },
  { region: "México",                                    marketing: "$0.0165", utility: "$0.0073" },
  { region: "Brasil",                                    marketing: "$0.0625", utility: "$0.0200" },
  { region: "España",                                    marketing: "$0.0379", utility: "$0.0167" },
  { region: "Estados Unidos / Canadá",                   marketing: "$0.0250", utility: "$0.0083" },
  { region: "Venezuela, Ecuador, Paraguay",              marketing: "$0.0147", utility: "$0.0062" },
];

const LANGUAGES = [
  { code: "es",    name: "Español" },
  { code: "es_MX", name: "Español (México)" },
  { code: "en_US", name: "English (US)" },
  { code: "pt_BR", name: "Português (Brasil)" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function relativeTime(iso: string | Date): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return "hace un momento";
  if (diff < 3600)  return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  return `hace ${Math.floor(diff / 86400)} día(s)`;
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: CrmWaTemplate["local_status"] }) {
  const map: Record<CrmWaTemplate["local_status"], { label: string; icon: React.ReactNode; cls: string }> = {
    DRAFT:    { label: "Borrador",  icon: <MessageSquare size={11} />, cls: "bg-muted text-muted-foreground" },
    PENDING:  { label: "Pendiente", icon: <Clock size={11} />,         cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
    APPROVED: { label: "Aprobado",  icon: <CheckCircle2 size={11} />,  cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    REJECTED: { label: "Rechazado", icon: <XCircle size={11} />,       cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
    PAUSED:   { label: "Pausado",   icon: <PauseCircle size={11} />,   cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  };
  const m = map[status] ?? map.DRAFT;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${m.cls}`}>
      {m.icon}{m.label}
    </span>
  );
}

// ─── WhatsApp preview ─────────────────────────────────────────────────────────
function WaPreview({ template }: { template: Partial<CrmWaTemplate> }) {
  const hasButtons = (template.buttons ?? []).length > 0;
  return (
    <div className="flex justify-center py-2">
      <div className="w-64 bg-[#e5ddd5] dark:bg-[#1a1a2e] rounded-2xl p-3 shadow-md">
        <div className="text-[9px] text-center text-muted-foreground mb-2 uppercase tracking-widest">Vista previa</div>
        <div className="bg-white dark:bg-[#202c33] rounded-xl shadow-sm overflow-hidden">
          <div className="px-3 py-2.5">
            <p className="text-sm text-foreground whitespace-pre-wrap leading-snug min-h-[2rem]">
              {template.body_text
                ? template.body_text
                : <span className="text-muted-foreground italic text-xs">El mensaje aparecerá aquí...</span>
              }
            </p>
          </div>
          <div className="px-3 pb-2 text-right">
            <span className="text-[9px] text-muted-foreground">12:00 ✓✓</span>
          </div>
        </div>
        {hasButtons && (
          <div className="mt-1 space-y-1">
            {(template.buttons ?? []).map((btn, i) => (
              <div key={i} className="bg-white dark:bg-[#202c33] rounded-xl px-3 py-2 text-center">
                <span className="text-xs text-[#0a7bcd] font-medium">{btn.text || "Botón"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Pricing info panel ───────────────────────────────────────────────────────
function PricingInfo({ collapsed, onToggle, showOnly }: {
  collapsed: boolean;
  onToggle: () => void;
  showOnly?: "marketing" | "utility";
}) {
  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-colors"
      >
        <Info size={14} className="text-amber-600 shrink-0" />
        <span className="text-xs font-semibold text-amber-800 dark:text-amber-400 flex-1">
          Costos y políticas de Meta
        </span>
        {collapsed ? <ChevronDown size={13} className="text-amber-600" /> : <ChevronUp size={13} className="text-amber-600" />}
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-xs text-amber-700 dark:text-amber-500 leading-relaxed">
            WhatsApp permite mensajes libres solo dentro de <strong>24 horas</strong> desde el último mensaje del cliente.
            Fuera de ese plazo <strong>es obligatorio usar plantillas aprobadas por Meta</strong> — esto protege a los
            usuarios del spam y cumple con las políticas de WhatsApp Business.
            Meta revisa cada plantilla en <strong>minutos a 24 horas</strong>.
          </p>

          <div>
            <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-400 mb-1.5">
              Costo por conversación iniciada con plantilla (USD aprox.)
            </p>
            <div className="rounded-lg border border-amber-200 dark:border-amber-800/40 overflow-hidden">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="bg-amber-100 dark:bg-amber-900/30">
                    <th className="text-left px-2.5 py-1.5 text-amber-800 dark:text-amber-400 font-semibold">Región</th>
                    {(!showOnly || showOnly === "marketing") && (
                      <th className="text-right px-2.5 py-1.5 text-amber-800 dark:text-amber-400 font-semibold">Marketing</th>
                    )}
                    {(!showOnly || showOnly === "utility") && (
                      <th className="text-right px-2.5 py-1.5 text-amber-800 dark:text-amber-400 font-semibold">Utilidad</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {META_PRICING.map((row, i) => (
                    <tr key={i} className="border-t border-amber-200 dark:border-amber-800/30">
                      <td className="px-2.5 py-1.5 text-amber-700 dark:text-amber-500">{row.region}</td>
                      {(!showOnly || showOnly === "marketing") && (
                        <td className="text-right px-2.5 py-1.5 text-amber-700 dark:text-amber-500 font-mono">{row.marketing}</td>
                      )}
                      {(!showOnly || showOnly === "utility") && (
                        <td className="text-right px-2.5 py-1.5 text-amber-700 dark:text-amber-500 font-mono">{row.utility}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-amber-600 dark:text-amber-600 mt-1">
              * Precios aprox. por conversación de 24h. Verifica en{" "}
              <a href="https://business.whatsapp.com/products/platform-pricing" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-0.5">
                Meta Business <ExternalLink size={9} />
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Meta rejection reason map ───────────────────────────────────────────────
const META_REJECTION_MAP: Record<string, string> = {
  INVALID_FORMAT:                       "Formato inválido — el mensaje debe incluir botón de opt-out, variables consecutivas desde {{1}} y seguir las guías de estructura de Meta",
  ABUSIVE_CONTENT:                      "Contenido inapropiado o abusivo según las políticas de Meta",
  PROMOTIONAL:                          "Contenido demasiado promocional para la categoría Utility — usa categoría Marketing",
  HIGH_QUALITY_SCORE_BELOW_THRESHOLD:   "Puntuación de calidad insuficiente — simplifica el mensaje y evita lenguaje de venta agresivo",
  SCAM:                                 "Detectado como posible fraude o contenido engañoso",
  INCORRECT_CATEGORY:                   "La categoría no coincide con el contenido — revisa si debe ser Marketing o Utility",
  NONE:                                 "Meta no especificó una razón de rechazo",
};
function getRejectionDescription(reason: string | null): string {
  if (!reason) return "";
  return META_REJECTION_MAP[reason] ?? reason;
}

// ─── Template form ────────────────────────────────────────────────────────────
const OPTOUT_BUTTON: WaTemplateButton = { type: "QUICK_REPLY", text: "No, gracias" };

const makeEmpty = (forcedCategory: WaTemplateCategory) => ({
  name: "",
  category: forcedCategory,
  language: "es",
  body_text: "",
  buttons: (forcedCategory === "MARKETING" ? [OPTOUT_BUTTON] : []) as WaTemplateButton[],
  variable_labels: [] as string[],
  association_type: null as WaTemplateAssocType | null,
  association_id: null as string | null,
});

function extractVarNums(text: string): number[] {
  const matches = [...text.matchAll(/\{\{(\d+)\}\}/g)];
  return [...new Set(matches.map(m => Number(m[1])))].sort((a, b) => a - b);
}

// entityId is a real UUID (for products/services/courses) or null (for conceptual types like calendar/form/general)
interface AssocOption {
  id: string;
  label: string;
  type: WaTemplateAssocType;
  entityId?: string | null;
}

interface TemplateFormProps {
  forcedCategory: WaTemplateCategory;
  initial?: Partial<ReturnType<typeof makeEmpty>>;
  onSave: (data: ReturnType<typeof makeEmpty>) => void;
  onCancel: () => void;
  loading?: boolean;
  associationOptions?: AssocOption[];
}

function TemplateForm({ forcedCategory, initial, onSave, onCancel, loading, associationOptions }: TemplateFormProps) {
  const [form, setForm] = useState({ ...makeEmpty(forcedCategory), ...initial });
  const [preview, setPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // keep category in sync with forced value
  useEffect(() => { setForm(f => ({ ...f, category: forcedCategory })); }, [forcedCategory]);

  const set = (k: keyof ReturnType<typeof makeEmpty>, v: any) => setForm(f => ({ ...f, [k]: v }));

  const [rewriting, setRewriting] = useState(false);

  const handleRewrite = async () => {
    if (!form.body_text.trim()) { toast.error("Escribe un mensaje primero"); return; }
    setRewriting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-wa-templates?action=rewrite`,
        { method: "POST", headers: { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ body_text: form.body_text, category: forcedCategory }) }
      );
      const json = await res.json();
      if (json.ok && json.rewritten) {
        set("body_text", json.rewritten);
        toast.success("Texto reescrito — revisa y ajusta si necesitas");
      } else {
        toast.error(json.error ?? "Error al reescribir");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setRewriting(false);
    }
  };

  const setVarLabel = (num: number, label: string) => {
    const next = [...form.variable_labels];
    next[num - 1] = label;
    set("variable_labels", next);
  };

  const insertVariable = () => {
    const matches = [...(form.body_text.matchAll(/\{\{(\d+)\}\}/g))];
    const max = matches.length > 0 ? Math.max(...matches.map(m => Number(m[1]))) : 0;
    const variable = `{{${max + 1}}}`;
    const el = textareaRef.current;
    if (el) {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const newText = form.body_text.slice(0, start) + variable + form.body_text.slice(end);
      set("body_text", newText);
      setTimeout(() => {
        el.selectionStart = el.selectionEnd = start + variable.length;
        el.focus();
      }, 0);
    } else {
      set("body_text", form.body_text + variable);
    }
  };

  const addButton = () => {
    if (form.buttons.length >= 3) return;
    set("buttons", [...form.buttons, { type: "QUICK_REPLY" as const, text: "" }]);
  };

  const updateButton = (idx: number, patch: Partial<WaTemplateButton>) => {
    const next = [...form.buttons];
    next[idx] = { ...next[idx], ...patch } as WaTemplateButton;
    set("buttons", next);
  };

  const removeButton = (idx: number) => set("buttons", form.buttons.filter((_, i) => i !== idx));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim())      { toast.error("El nombre es obligatorio"); return; }
    if (!form.body_text.trim()) { toast.error("El cuerpo del mensaje es obligatorio"); return; }

    // Variables must start at {{1}} with no gaps — Meta rejects otherwise
    const varNums = extractVarNums(form.body_text);
    for (let i = 0; i < varNums.length; i++) {
      if (varNums[i] !== i + 1) {
        toast.error(`Las variables deben ser consecutivas desde {{1}}. Falta {{${i + 1}}}.`);
        return;
      }
    }
    const missing = varNums.filter(n => !form.variable_labels[n - 1]?.trim());
    if (missing.length > 0) {
      toast.error(`Completa el valor de ejemplo de: ${missing.map(n => `{{${n}}}`).join(", ")}`);
      return;
    }

    // MARKETING requires at least one button (opt-out)
    if (forcedCategory === "MARKETING" && form.buttons.length === 0) {
      toast.error("Las plantillas de Marketing requieren al menos un botón de opt-out (ej. 'No, gracias')");
      return;
    }
    // Validate button fields
    for (const btn of form.buttons) {
      if (!btn.text.trim()) { toast.error("El texto de todos los botones es obligatorio"); return; }
      if (btn.type === "URL" && !((btn as any).url ?? "").trim()) {
        toast.error("El enlace URL del botón es obligatorio"); return;
      }
      if (btn.type === "PHONE_NUMBER" && !((btn as any).phone_number ?? "").trim()) {
        toast.error("El número de teléfono del botón es obligatorio"); return;
      }
    }

    const cleanName = form.name.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/__+/g, "_").replace(/^_+|_+$/g, "");
    onSave({ ...form, name: cleanName });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name + Language */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Nombre *</label>
          <input
            value={form.name}
            onChange={e => set("name", e.target.value)}
            placeholder="ej. seguimiento_cliente"
            className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
          <p className="text-[10px] text-muted-foreground">Solo letras, números y _</p>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">
            Idioma *{" "}
            <span className="font-normal text-muted-foreground/60">(requerido por Meta)</span>
          </label>
          <select
            value={form.language}
            onChange={e => set("language", e.target.value)}
            className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          >
            {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
          </select>
        </div>
      </div>

      {/* Association */}
      {associationOptions && associationOptions.length > 0 && (
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Vincular a (opcional)</label>
          <select
            value={
              // Show the matching option: prefer entityId match, then type match for concept-only options
              form.association_id
                ? (associationOptions.find(o => o.entityId === form.association_id)?.id ?? "")
                : (form.association_type
                  ? (associationOptions.find(o => o.type === form.association_type && !o.entityId)?.id ?? "")
                  : "")
            }
            onChange={e => {
              const opt = associationOptions.find(o => o.id === e.target.value);
              set("association_type", opt?.type ?? null);
              // Only set association_id if it's a real UUID entity; concept-only options store null
              set("association_id", opt?.entityId ?? null);
            }}
            className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          >
            <option value="">Sin vinculación específica</option>
            {associationOptions.map(o => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Body */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-muted-foreground">Mensaje *</label>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleRewrite}
              disabled={rewriting}
              className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/40 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors disabled:opacity-50"
            >
              <Wand2 size={10} className={rewriting ? "animate-pulse" : ""} />
              {rewriting ? "Reescribiendo..." : "IA"}
            </button>
            <button
              type="button"
              onClick={insertVariable}
              className="text-[11px] font-semibold text-primary hover:text-primary/80 bg-primary/8 hover:bg-primary/15 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors"
            >
              <Plus size={10} /> Variable
            </button>
          </div>
        </div>
        <textarea
          ref={textareaRef}
          value={form.body_text}
          onChange={e => set("body_text", e.target.value)}
          rows={4}
          maxLength={1024}
          placeholder={forcedCategory === "MARKETING"
            ? "Hola {{1}}, tenemos una oferta especial para ti en {{2}}. ¿Te interesa saber más?"
            : "Hola {{1}}, te recordamos tu cita el {{2}} a las {{3}}."}
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
        />
        <div className="flex justify-between items-start gap-2">
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground">{"{{1}}, {{2}}... se reemplazan por valores reales al enviar"}</p>
            {forcedCategory === "MARKETING" && (
              <p className="text-[10px] text-amber-600 dark:text-amber-500 flex items-center gap-1">
                <ShieldOff size={9} /> Incluye siempre un botón de opt-out al final (ej. "No, gracias")
              </p>
            )}
            {forcedCategory === "UTILITY" && (
              <p className="text-[10px] text-muted-foreground/70">Sin lenguaje promocional — solo info transaccional (citas, recordatorios, confirmaciones)</p>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground shrink-0">{form.body_text.length}/1024</span>
        </div>
      </div>

      {/* Variable labels */}
      {extractVarNums(form.body_text).length > 0 && (
        <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
          <div>
            <p className="text-[11px] font-semibold text-foreground flex items-center gap-1">
              Valor de ejemplo por variable <span className="text-destructive">*</span>
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Pon un valor real (ej. "Juan Pérez"). Meta revisa el mensaje con estos datos antes de aprobar.
            </p>
          </div>
          <div className="space-y-1.5">
            {extractVarNums(form.body_text).map(num => (
              <div key={num} className="flex items-center gap-2">
                <span className="shrink-0 text-[11px] font-mono font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                  {`{{${num}}}`}
                </span>
                <span className="text-muted-foreground text-xs shrink-0">=</span>
                <input
                  value={form.variable_labels[num - 1] ?? ""}
                  onChange={e => setVarLabel(num, e.target.value)}
                  placeholder={num === 1 ? "ej. Juan Pérez" : num === 2 ? "ej. lunes 3 de junio" : "ej. 10:00 AM"}
                  className="flex-1 h-7 px-2 rounded-md border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              Botones {forcedCategory === "MARKETING" ? <span className="text-destructive">*</span> : "(opcional)"} · máx. 3
            </label>
            <div className="group relative">
              <HelpCircle size={12} className="text-muted-foreground cursor-help" />
              <div className="absolute left-0 bottom-5 z-10 hidden group-hover:block w-64 bg-popover border border-border rounded-lg p-2.5 shadow-lg text-[10px] text-muted-foreground leading-relaxed">
                Los botones aparecen debajo del mensaje en WhatsApp. Tipos:
                <br />• <strong>Respuesta rápida</strong>: el cliente toca para enviar un texto
                <br />• <strong>Ir a URL</strong>: abre un enlace
                <br />• <strong>Llamar</strong>: marca un número de teléfono
                {forcedCategory === "MARKETING" && <><br /><br /><strong>Marketing requiere al menos un botón de opt-out</strong> (ej. "No, gracias") como último botón.</>}
              </div>
            </div>
          </div>
          {form.buttons.length < 3 && (
            <button type="button" onClick={addButton} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
              <Plus size={11} /> Agregar botón
            </button>
          )}
        </div>
        {form.buttons.map((btn, idx) => {
          const isLast = idx === form.buttons.length - 1;
          const isOptOut = forcedCategory === "MARKETING" && isLast;
          return (
            <div key={idx} className={`flex items-center gap-2 p-2 rounded-lg ${isOptOut ? "bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/30" : "bg-muted/50"}`}>
              {isOptOut && <ShieldOff size={12} className="text-orange-500 shrink-0" title="Opt-out" />}
              <select
                value={btn.type}
                onChange={e => updateButton(idx, { type: e.target.value as any })}
                className="h-8 px-2 rounded-md border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/30 shrink-0"
              >
                <option value="QUICK_REPLY">Respuesta rápida</option>
                <option value="URL">Ir a URL</option>
                <option value="PHONE_NUMBER">Llamar</option>
              </select>
              <input
                value={btn.text}
                onChange={e => updateButton(idx, { text: e.target.value })}
                placeholder={isOptOut ? "ej. No, gracias" : "Texto del botón"}
                maxLength={25}
                className="flex-1 h-8 min-w-0 px-2 rounded-md border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/30"
              />
              {btn.type === "URL" && (
                <input
                  value={(btn as any).url ?? ""}
                  onChange={e => updateButton(idx, { url: e.target.value } as any)}
                  placeholder="https://..."
                  className="flex-1 h-8 min-w-0 px-2 rounded-md border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/30"
                />
              )}
              {btn.type === "PHONE_NUMBER" && (
                <input
                  value={(btn as any).phone_number ?? ""}
                  onChange={e => updateButton(idx, { phone_number: e.target.value } as any)}
                  placeholder="+591..."
                  className="w-24 h-8 px-2 rounded-md border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/30"
                />
              )}
              <button type="button" onClick={() => removeButton(idx)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}
        {forcedCategory === "MARKETING" && form.buttons.length === 0 && (
          <p className="text-[10px] text-destructive flex items-center gap-1">
            <AlertCircle size={10} /> Agrega al menos un botón de opt-out para poder guardar
          </p>
        )}
      </div>

      {/* Preview toggle */}
      <button
        type="button"
        onClick={() => setPreview(p => !p)}
        className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
      >
        {preview ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {preview ? "Ocultar vista previa" : "Ver cómo se ve en WhatsApp"}
      </button>

      {preview && <WaPreview template={{ body_text: form.body_text, buttons: form.buttons }} />}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-9 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? "Guardando..." : "Guardar borrador"}
        </button>
      </div>
    </form>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface CrmWaTemplatesProps {
  context: WaTemplateContext;
  forcedCategory: WaTemplateCategory;
  associationOptions?: AssocOption[];
}

export default function CrmWaTemplates({ context, forcedCategory, associationOptions }: CrmWaTemplatesProps) {
  const { user } = useCurrentUser();
  const { data: templates = [], isLoading, refetch } = useWaTemplates(context);
  const createTmpl = useCreateWaTemplate();
  const updateTmpl = useUpdateWaTemplate();
  const deleteTmpl = useDeleteWaTemplate();

  const [showForm,          setShowForm]          = useState(false);
  const [editId,            setEditId]            = useState<string | null>(null);
  const [expandedId,        setExpandedId]        = useState<string | null>(null);
  const [pricingOpen,       setPricingOpen]       = useState(true);
  const [submitting,        setSubmitting]        = useState<string | null>(null);
  const [syncing,           setSyncing]           = useState(false);
  const [autoSyncing,       setAutoSyncing]       = useState(false);
  const [lastSyncAt,        setLastSyncAt]        = useState<Date | null>(null);
  const [wabaOk,            setWabaOk]            = useState<boolean | null>(null);
  const [pendingDeleteTmpl, setPendingDeleteTmpl] = useState<CrmWaTemplate | null>(null);
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("crm_ai_agent_config")
      .select("waba_id, access_token")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setWabaOk(!!(data?.waba_id && data?.access_token)));
  }, [user?.id]);

  // Auto-sync once: wait for both wabaOk=true AND templates loaded
  useEffect(() => {
    if (wabaOk !== true || templates.length === 0 || hasSyncedRef.current) return;
    hasSyncedRef.current = true;
    handleSync(true);
  }, [wabaOk, templates.length]);

  const handleSync = async (silent = false) => {
    if (!silent) setSyncing(true);
    else setAutoSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-wa-templates?action=sync`,
        { method: "POST", headers: { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" }, body: "{}" }
      );
      const json = await res.json();
      if (json.ok) {
        await refetch();
        setLastSyncAt(new Date());
        if (!silent) toast.success(`Estados sincronizados con Meta${json.synced > 0 ? ` (${json.synced} actualizada(s))` : ""}`);
      } else if (!silent) {
        toast.error(json.error === "waba_not_configured" ? "Configura tu WABA en Conexión primero" : "Error al sincronizar con Meta");
      }
    } catch {
      if (!silent) toast.error("Error de conexión");
    } finally {
      setSyncing(false);
      setAutoSyncing(false);
    }
  };

  const handleSubmitToMeta = async (templateId: string) => {
    setSubmitting(templateId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-wa-templates?action=submit`,
        { method: "POST", headers: { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ template_id: templateId }) }
      );
      const json = await res.json();
      if (json.ok) {
        toast.success("Plantilla enviada a Meta para revisión — sincronizando estado en 4 seg...");
        refetch();
        setTimeout(() => handleSync(true), 4000);
      } else {
        const isDuplicateName = json.error?.toLowerCase().includes("already") && json.error?.toLowerCase().includes("content");
        if (isDuplicateName) {
          toast.error(
            "Este nombre ya existe en Meta (aunque esté rechazada). Cambia el nombre de la plantilla y vuelve a enviar.",
            { duration: 10000 }
          );
          setEditId(templateId);
          setShowForm(true);
        } else {
          const msg =
            json.error === "waba_not_configured" ? "Configura tu WABA en Conexión primero" :
            json.error === "template_not_found"  ? "Plantilla no encontrada" :
            json.error ?? "Error al enviar a Meta";
          toast.error(msg, { duration: 8000 });
        }
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSubmitting(null);
    }
  };

  const handleDelete = async (tmpl: CrmWaTemplate) => {
    try {
      if (tmpl.meta_template_id) {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-wa-templates?id=${tmpl.id}`,
          { method: "DELETE", headers: { Authorization: `Bearer ${session?.access_token}` } }
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.ok === false) {
          toast.error(json.error ? `Error: ${json.error}` : "Error al eliminar la plantilla");
          return;
        }
        refetch();
      } else {
        await deleteTmpl.mutateAsync(tmpl.id);
      }
      toast.success("Plantilla eliminada");
      if (expandedId === tmpl.id) setExpandedId(null);
      setPendingDeleteTmpl(null);
    } catch {
      toast.error("Error al eliminar");
    }
  };

  const handleSave = async (formData: ReturnType<typeof makeEmpty>) => {
    try {
      const payload = {
        name: formData.name,
        category: forcedCategory,
        language: formData.language,
        header_type: "NONE" as const,
        header_text: null,
        body_text: formData.body_text,
        footer_text: null,
        buttons: formData.buttons,
        variable_labels: formData.variable_labels,
        usage_context: context,
        association_type: formData.association_type,
        association_id: formData.association_id,
        local_status: "DRAFT" as const,
      };
      if (editId) {
        await updateTmpl.mutateAsync({ id: editId, ...payload });
        toast.success("Plantilla actualizada");
      } else {
        await createTmpl.mutateAsync(payload);
        toast.success("Plantilla guardada como borrador");
      }
      setShowForm(false);
      setEditId(null);
  } catch (e: any) {
      const msg = e?.message ?? e?.error_description ?? JSON.stringify(e) ?? "error desconocido";
      toast.error(`Error al guardar: ${msg}`);
    }
  };

  const editTemplate = templates.find(t => t.id === editId);

  const pricingShowOnly = forcedCategory === "MARKETING" ? "marketing" : "utility";

  return (
    <>
    <div className="space-y-3">
      {/* WABA warning */}
      {wabaOk === false && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40">
          <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 dark:text-red-400">
            Necesitas configurar tu <strong>WABA ID y token de acceso</strong> en{" "}
            {context === "notification"
              ? <><strong>Agente IA → Conexión</strong> para enviar plantillas a Meta.</>
              : <><strong>la sección Conexión</strong> para enviar plantillas a Meta.</>
            }
          </p>
        </div>
      )}

      {/* Meta marketing messages activation notice */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40">
        <Info size={14} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
            Paso previo: activa los mensajes de marketing en tu cuenta de Meta
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400/80">
            Antes de que Meta apruebe tus plantillas, debes completar el onboarding de mensajes de marketing en tu Ads Manager. Entra al link, busca el aviso "<strong>Activar mensajes de marketing</strong>" y sigue los pasos.
          </p>
          <a
            href="https://business.facebook.com/adsmanager/manage/accounts"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 dark:text-amber-300 hover:underline mt-0.5"
          >
            Ir a Meta Ads Manager <ExternalLink size={11} />
          </a>
        </div>
      </div>

      {/* Pricing info */}
      <PricingInfo
        collapsed={pricingOpen}
        onToggle={() => setPricingOpen(p => !p)}
        showOnly={pricingShowOnly}
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Mis plantillas</p>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs text-muted-foreground">
              {templates.length} plantilla{templates.length !== 1 ? "s" : ""} · <strong>{forcedCategory === "MARKETING" ? "Marketing" : "Utilidad"}</strong>
            </p>
            {autoSyncing && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                <Loader2 size={9} className="animate-spin" /> actualizando...
              </span>
            )}
            {!autoSyncing && lastSyncAt && (
              <span className="text-[10px] text-muted-foreground/50">
                Sync {relativeTime(lastSyncAt)}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleSync()}
            disabled={syncing || autoSyncing || wabaOk === false}
            title="Sincronizar estado con Meta"
            className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors disabled:opacity-40"
          >
            <RefreshCw size={13} className={(syncing || autoSyncing) ? "animate-spin" : ""} />
          </button>
          <button
            type="button"
            onClick={() => { setShowForm(true); setEditId(null); }}
            className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1.5"
          >
            <Plus size={12} /> Nueva
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-semibold mb-4">{editId ? "Editar plantilla" : "Nueva plantilla"}</p>
          <TemplateForm
            forcedCategory={forcedCategory}
            initial={editTemplate ? {
              name: editTemplate.name,
              language: editTemplate.language,
              body_text: editTemplate.body_text,
              buttons: editTemplate.buttons,
              variable_labels: editTemplate.variable_labels ?? [],
              association_type: editTemplate.association_type ?? null,
              association_id: editTemplate.association_id ?? null,
            } : undefined}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditId(null); }}
            loading={createTmpl.isPending || updateTmpl.isPending}
            associationOptions={associationOptions}
          />
        </div>
      )}

      {/* Template list — hidden while form is open */}
      {!showForm && (isLoading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare size={28} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No tienes plantillas aún</p>
          <p className="text-xs mt-0.5">Crea una para empezar</p>
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map(tmpl => (
            <div key={tmpl.id} className="rounded-xl border border-border bg-card overflow-hidden">
              <div
                className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedId(expandedId === tmpl.id ? null : tmpl.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-medium truncate">{tmpl.name}</span>
                    <StatusBadge status={tmpl.local_status} />
                    <span className="text-[10px] text-muted-foreground">{tmpl.language}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{tmpl.body_text}</p>
                  {tmpl.rejection_reason && tmpl.local_status === "REJECTED" && (
                    <p className="text-[10px] text-red-500 mt-0.5 leading-relaxed line-clamp-2">{getRejectionDescription(tmpl.rejection_reason)}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {(tmpl.local_status === "DRAFT" || tmpl.local_status === "REJECTED") && wabaOk && (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); handleSubmitToMeta(tmpl.id); }}
                      disabled={submitting === tmpl.id}
                      className="h-7 px-2 rounded-lg bg-primary/10 text-primary text-[11px] font-semibold hover:bg-primary/20 transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      <Send size={10} />
                      {submitting === tmpl.id ? "Enviando..." : "Enviar a Meta"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setPendingDeleteTmpl(tmpl); }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                  {expandedId === tmpl.id
                    ? <ChevronUp size={13} className="text-muted-foreground" />
                    : <ChevronDown size={13} className="text-muted-foreground" />}
                </div>
              </div>

              {/* Expanded detail */}
              {expandedId === tmpl.id && (
                <div className="border-t border-border px-3 py-3 space-y-3">
                  <WaPreview template={tmpl} />

                  {/* Status panel */}
                  <div className="rounded-lg border border-border bg-muted/20 p-2.5 space-y-1.5">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Estado Meta</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground shrink-0">Local:</span>
                        <StatusBadge status={tmpl.local_status} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground shrink-0">Meta:</span>
                        {tmpl.meta_status ? (
                          <span className="font-mono text-[10px] bg-muted border border-border px-1.5 py-0.5 rounded font-semibold">
                            {tmpl.meta_status}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/50 italic">no enviada</span>
                        )}
                      </div>
                      {tmpl.meta_template_id && (
                        <div className="col-span-2 flex items-center gap-1.5">
                          <span className="text-muted-foreground shrink-0">ID:</span>
                          <span className="font-mono text-[10px] text-muted-foreground">{tmpl.meta_template_id}</span>
                        </div>
                      )}
                      <div className="col-span-2 flex items-center gap-1.5">
                        <span className="text-muted-foreground shrink-0">Actualizado:</span>
                        <span className="text-[10px] text-muted-foreground">{relativeTime(tmpl.updated_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Rejection detail */}
                  {tmpl.rejection_reason && tmpl.local_status === "REJECTED" && (
                    <div className="rounded-lg border border-red-200 dark:border-red-800/30 bg-red-50 dark:bg-red-900/10 p-2.5 space-y-1">
                      <p className="text-[10px] font-semibold text-red-700 dark:text-red-400 flex items-center gap-1">
                        <XCircle size={10} /> Razón de rechazo
                      </p>
                      <p className="text-[10px] text-red-600 dark:text-red-500 leading-relaxed">
                        {getRejectionDescription(tmpl.rejection_reason)}
                      </p>
                      <p className="text-[9px] font-mono text-red-400/70 mt-0.5">
                        Código: {tmpl.rejection_reason}
                      </p>
                    </div>
                  )}

                  {/* Message detail */}
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div><span className="font-semibold text-foreground">Mensaje: </span>{tmpl.body_text}</div>
                    {extractVarNums(tmpl.body_text).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {extractVarNums(tmpl.body_text).map(num => (
                          <span key={num} className="inline-flex items-center gap-1 bg-primary/8 border border-primary/20 px-2 py-0.5 rounded-md text-[10px]">
                            <span className="font-mono font-semibold text-primary">{`{{${num}}}`}</span>
                            {tmpl.variable_labels?.[num - 1] ? (
                              <><span className="text-muted-foreground">→</span><span className="text-foreground">{tmpl.variable_labels[num - 1]}</span></>
                            ) : (
                              <span className="text-muted-foreground/50 italic">sin etiqueta</span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                    {(tmpl.buttons ?? []).length > 0 && (
                      <div>
                        <span className="font-semibold text-foreground">Botones: </span>
                        {tmpl.buttons.map((b, i) => <span key={i} className="ml-1 bg-muted px-1.5 py-0.5 rounded text-[10px]">{b.text}</span>)}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => { setEditId(tmpl.id); setShowForm(true); setExpandedId(null); }}
                    className="text-primary hover:underline text-xs"
                  >
                    Editar plantilla
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>

    {/* Modal de confirmación para eliminar plantilla */}
    {pendingDeleteTmpl && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-card border border-border rounded-2xl shadow-xl p-5 max-w-sm w-full space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold">¿Eliminar plantilla?</p>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">"{pendingDeleteTmpl.name}"</span>
              {pendingDeleteTmpl.meta_template_id
                ? " también se eliminará en Meta. Esta acción no se puede deshacer."
                : " se eliminará permanentemente."}
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setPendingDeleteTmpl(null)}
              className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => handleDelete(pendingDeleteTmpl)}
              disabled={deleteTmpl.isPending}
              className="px-3 py-1.5 text-xs rounded-lg bg-destructive text-white hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              {deleteTmpl.isPending && <Loader2 size={11} className="animate-spin" />}
              Eliminar
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
