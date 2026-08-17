import { useState, useMemo, useEffect, useRef } from "react";
import {
  Plus, Trash2, Send, ChevronRight, ChevronLeft, CheckCircle2,
  XCircle, Clock, Loader2, Users, Eye,
  ArrowLeft, AlertCircle, Megaphone, Zap, Info, Calendar,
  ChevronUp, ChevronDown, MessageSquare, FileText, Link as LinkIcon,
  Image, Video, Mic, Upload,
} from "lucide-react";
import { toast } from "sonner";
import {
  useWaTemplates, useWaCampaigns, useCreateWaCampaign,
  useDeleteWaCampaign, useWaCampaignLogs,
  useProducts, useServices, useCourses,
  useInstantCampaigns, useInstantCampaignLogs,
  useCreateInstantCampaign, useDeleteInstantCampaign,
  useBusinessProfile,
} from "@/hooks/useCrmData";
import { supabase } from "@/lib/supabase";
import {
  COUNTRY_INFO, getPhonePrefix, filterLabel, digits,
  estimateAudience, StepAudience, useAudienceData,
  type AudienceMember,
} from "@/components/crm/wa/audience";
import {
  PART_TYPES, newPart, MessageEditor, PartPreview, SentPart, MediaUploadField,
  type WaMediaKind,
} from "@/components/crm/wa/message";
import { StepBar } from "@/components/crm/wa/StepBar";
import { useCurrentUser } from "@/hooks/useAuth";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";
import type {
  CrmWaCampaign, CrmWaCampaignLog, CrmWaTemplate,
  WaVarMap, WaVarSource, WaAudienceFilter, WaAudienceMatch, WaCampaignPart,
  CrmWaInstantCampaign, CrmWaInstantCampaignLog,
} from "@/lib/supabase";

// ─── Shared helpers ───────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return "hace un momento";
  if (diff < 3600)  return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string; icon: JSX.Element }> = {
    draft:      { label: "Borrador",    cls: "bg-muted text-muted-foreground",                                               icon: <Clock size={10} /> },
    scheduled:  { label: "Programado", cls: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",    icon: <Calendar size={10} /> },
    processing: { label: "Enviando...", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",            icon: <Loader2 size={10} className="animate-spin" /> },
    completed:  { label: "Completada", cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",         icon: <CheckCircle2 size={10} /> },
    failed:     { label: "Fallida",    cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",                 icon: <XCircle size={10} /> },
    cancelled:  { label: "Cancelada",  cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",    icon: <XCircle size={10} /> },
  };
  const m = map[status] ?? map.draft;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${m.cls}`}>
      {m.icon}{m.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── SECCIÓN 1: PASADO 24H (Templates) — código original ──────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// ─── Universo unificado: teléfonos únicos ────────────────────────────────────
// Espeja _shared/wa-audience.ts en el cliente para poder estimar sin llamar al
// backend. El número final SIEMPRE lo recalcula el servidor al enviar; esto es
// una estimación honesta, no una promesa.

// Cuántos destinatarios se listan en el resumen antes de resumir con "y N más".
const LIST_PREVIEW = 100;

// "Cómo llegas" es un paso propio y no parte de "Mensaje" porque decide dos
// cosas que no son contenido: a cuánta gente alcanzas y cuánto te cuesta. El
// deslizador de la ventana vive ahí por lo mismo — recorta la audiencia, no el
// texto.
const STEPS = ["Audiencia", "Cómo llegas", "Mensaje", "Cuándo", "Revisar"];
const STEP_HINTS = [
  "Elige entre todos tus contactos o filtra por lo que te interese.",
  "Define a cuántos alcanzas y si el envío tiene costo.",
  "Escribe lo que van a recibir.",
  "Ahora mismo, o en el día y hora que elijas.",
  "Comprueba a quién llega y qué recibe antes de mandarlo.",
];

// Barra de progreso: el nombre va DEBAJO de cada número y siempre visible, para
// que en cualquier momento se vea qué pasos están hechos y cuáles faltan sin
// tener que deducirlo del número solo. Antes el nombre iba al lado y se ocultaba
// en móvil (hidden sm:inline), que es justo donde más falta hace.
function StepTemplate({ selected, onSelect }: { selected: CrmWaTemplate | null; onSelect: (t: CrmWaTemplate) => void }) {
  const { data: templates = [], isLoading } = useWaTemplates("remarketing");
  const approved = templates.filter(t => t.local_status === "APPROVED");
  if (isLoading) return <div className="flex items-center justify-center py-16"><Loader2 size={20} className="animate-spin text-muted-foreground/50" /></div>;
  if (!approved.length) return (
    <div className="text-center py-12 space-y-2">
      <CheckCircle2 size={28} className="mx-auto text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">No tienes plantillas APROBADAS.</p>
      <p className="text-xs text-muted-foreground/70">Ve a la sección Plantillas, crea una y envíala a Meta para aprobación.</p>
    </div>
  );
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground mb-3">Selecciona una plantilla aprobada por Meta para esta campaña.</p>
      {approved.map(t => (
        <button key={t.id} type="button" onClick={() => onSelect(t)}
          className={`w-full text-left p-3 rounded-xl border transition-all ${selected?.id === t.id ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border hover:border-primary/40 hover:bg-muted/30"}`}>
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

const CONTACT_FIELD_LABELS: Record<string, string> = { name: "Nombre completo", email: "Email", phone: "Teléfono", company: "Empresa" };

function VarSourceSelector({ varNum, label, value, onChange }: { varNum: number; label: string; value: WaVarSource | undefined; onChange: (v: WaVarSource) => void }) {
  const { data: products = [] } = useProducts();
  const { data: services = [] } = useServices();
  const { data: courses  = [] } = useCourses();
  const source = value?.source ?? "contact_field";
  return (
    <div className="space-y-1.5 p-3 rounded-xl bg-muted/30 border border-border">
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-[11px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">{`{{${varNum}}}`}</span>
        {label && <span className="text-[10px] text-muted-foreground italic">ej: {label}</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        <select value={source} onChange={e => {
          const s = e.target.value;
          if (s === "contact_field") onChange({ source: "contact_field", field: "name" });
          else if (s === "fixed") onChange({ source: "fixed", value: "" });
          else if (s === "product_field" && products[0]) onChange({ source: "product_field", entityId: products[0].id, entityName: products[0].name, field: "name" });
          else if (s === "service_field" && services[0]) onChange({ source: "service_field", entityId: services[0].id, entityName: services[0].name, field: "name" });
          else if (s === "course_field" && courses[0]) onChange({ source: "course_field", entityId: courses[0].id, entityName: courses[0].title, field: "title" });
        }} className="h-8 px-2 rounded-lg border border-border bg-background text-base md:text-xs outline-none focus:ring-2 focus:ring-primary/30">
          <option value="contact_field">Campo del contacto</option>
          {products.length > 0 && <option value="product_field">Producto</option>}
          {services.length > 0 && <option value="service_field">Servicio</option>}
          {courses.length  > 0 && <option value="course_field">Curso</option>}
          <option value="fixed">Texto fijo</option>
        </select>
        {source === "contact_field" && (
          <select value={(value as any)?.field ?? "name"} onChange={e => onChange({ source: "contact_field", field: e.target.value as any })}
            className="h-8 px-2 rounded-lg border border-border bg-background text-base md:text-xs outline-none focus:ring-2 focus:ring-primary/30">
            {Object.entries(CONTACT_FIELD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        )}
        {(source === "product_field" || source === "service_field" || source === "course_field") && (() => {
          const list = source === "product_field" ? products : source === "service_field" ? services : courses;
          const nameKey = source === "course_field" ? "title" : "name";
          const cur = (value as any)?.entityId ?? list[0]?.id;
          const fieldVal = (value as any)?.field ?? (source === "course_field" ? "title" : "name");
          return (
            <>
              <select value={cur} onChange={e => { const item = list.find((x: any) => x.id === e.target.value); onChange({ source: source as any, entityId: e.target.value, entityName: (item as any)?.[nameKey] ?? "", field: fieldVal } as any); }}
                className="h-8 px-2 rounded-lg border border-border bg-background text-base md:text-xs outline-none focus:ring-2 focus:ring-primary/30 flex-1 min-w-0">
                {list.map((item: any) => <option key={item.id} value={item.id}>{item[nameKey]}</option>)}
              </select>
              <select value={fieldVal} onChange={e => onChange({ ...(value as any), field: e.target.value })}
                className="h-8 px-2 rounded-lg border border-border bg-background text-base md:text-xs outline-none focus:ring-2 focus:ring-primary/30">
                <option value={source === "course_field" ? "title" : "name"}>{source === "course_field" ? "Título" : "Nombre"}</option>
                <option value="price">Precio</option>
              </select>
            </>
          );
        })()}
        {source === "fixed" && (
          <input value={(value as any)?.value ?? ""} onChange={e => onChange({ source: "fixed", value: e.target.value })}
            placeholder="Texto que se enviará a todos"
            className="flex-1 h-8 px-2 rounded-lg border border-border bg-background text-base md:text-xs outline-none focus:ring-2 focus:ring-primary/30 min-w-0" />
        )}
      </div>
    </div>
  );
}

function extractVarNums(text: string): number[] {
  return [...new Set([...text.matchAll(/\{\{(\d+)\}\}/g)].map(m => Number(m[1])))].sort((a, b) => a - b);
}

function StepVariables({ template, varMap, onChange }: { template: CrmWaTemplate; varMap: WaVarMap; onChange: (m: WaVarMap) => void }) {
  const varNums = extractVarNums(template.body_text);
  if (!varNums.length) return (
    <div className="text-center py-8 space-y-1">
      <CheckCircle2 size={24} className="mx-auto text-green-500" />
      <p className="text-sm text-muted-foreground">Esta plantilla no tiene variables — el mensaje es fijo.</p>
    </div>
  );
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Define qué valor se usará para cada variable al enviar el mensaje a cada contacto.</p>
      {varNums.map(num => (
        <VarSourceSelector key={num} varNum={num} label={template.variable_labels?.[num - 1] ?? ""}
          value={varMap[String(num)]} onChange={v => onChange({ ...varMap, [String(num)]: v })} />
      ))}
    </div>
  );
}

// ─── Qué se envió ─────────────────────────────────────────────────────────────

/** Descripción legible del origen de una variable de plantilla. */
function varSourceLabel(v: WaVarSource | undefined): string {
  if (!v) return "—";
  switch (v.source) {
    case "contact_field": return CONTACT_FIELD_LABELS[v.field] ?? v.field;
    case "fixed":         return `"${v.value}"`;
    case "product_field": return `${v.entityName} · ${v.field === "price" ? "precio" : "nombre"}`;
    case "service_field": return `${v.entityName} · ${v.field === "price" ? "precio" : "nombre"}`;
    case "course_field":  return `${v.entityName} · ${v.field === "price" ? "precio" : "título"}`;
    default:              return "—";
  }
}

/**
 * Las partes de un envío libre. Los envíos anteriores a la columna `parts`
 * guardaban texto y adjunto por separado: se convierten al vuelo para no tener
 * dos formas de pintar lo mismo.
 */
function campaignPartsOf(campaign: CrmWaInstantCampaign): WaCampaignPart[] {
  if (Array.isArray(campaign.parts) && campaign.parts.length) return campaign.parts;
  const text = (campaign.message_text ?? "").trim();
  if (campaign.media_type && campaign.media_url) {
    return [{ id: "legacy", type: campaign.media_type as WaCampaignPart["type"], url: campaign.media_url, text: text || undefined }];
  }
  return text ? [{ id: "legacy", type: "text", text }] : [];
}

/** Una parte tal como llegó al teléfono, con enlace abrible para comprobarlo. */
function SentContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-muted-foreground">Contenido enviado</p>
      {children}
    </div>
  );
}

function CampaignDetail({ campaign, onBack }: { campaign: CrmWaCampaign; onBack: () => void }) {
  const { data: logs = [], isLoading } = useWaCampaignLogs(campaign.id);
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft size={14} /> Volver</button>
      <div>
        <div className="flex items-center gap-2 flex-wrap"><h2 className="text-base font-semibold">{campaign.name}</h2>{statusBadge(campaign.status)}</div>
        <p className="text-xs text-muted-foreground mt-0.5">Plantilla: <strong className="font-mono">{campaign.crm_wa_templates?.name}</strong>{" · "}{relativeTime(campaign.created_at)}</p>
      </div>
      <SentContent>
        <div className="rounded-xl border border-border bg-[#E5DDD5] dark:bg-[#0B141A] p-3">
          <div className="max-w-[85%] rounded-lg bg-[#DCF8C6] dark:bg-[#005C4B] px-2.5 py-1.5 shadow-sm">
            <p className="text-[11px] text-black dark:text-white whitespace-pre-wrap leading-relaxed">
              {campaign.crm_wa_templates?.body_text ?? "—"}
            </p>
          </div>
        </div>
        {Object.keys(campaign.variable_map ?? {}).length > 0 && (
          <div className="rounded-xl border border-border bg-muted/20 p-2.5 space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Variables</p>
            {Object.entries(campaign.variable_map ?? {})
              .sort((a, b) => Number(a[0]) - Number(b[0]))
              .map(([num, src]) => (
                <div key={num} className="flex items-center gap-2 text-[11px]">
                  <span className="font-mono font-bold text-primary bg-primary/10 px-1.5 rounded shrink-0">{`{{${num}}}`}</span>
                  <span className="text-muted-foreground truncate">{varSourceLabel(src as WaVarSource)}</span>
                </div>
              ))}
          </div>
        )}
      </SentContent>
      <div className="grid grid-cols-3 gap-3">
        {[{ label: "Total", value: campaign.total_contacts ?? "—", cls: "text-foreground" }, { label: "Enviados", value: campaign.sent_count, cls: "text-green-600 dark:text-green-400" }, { label: "Fallidos", value: campaign.failed_count, cls: "text-red-600 dark:text-red-400" }].map(s => (
          <div key={s.label} className="rounded-xl border border-border bg-muted/20 p-3 text-center"><p className={`text-xl font-bold ${s.cls}`}>{s.value}</p><p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p></div>
        ))}
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">Detalle por contacto</p>
        {isLoading ? <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-muted-foreground/50" /></div> : !logs.length ? <p className="text-xs text-muted-foreground text-center py-4">Sin registros aún</p> : (
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {logs.map(log => (
              <div key={log.id} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/20 transition-colors">
                {log.status === "sent" && <CheckCircle2 size={12} className="text-green-500 shrink-0" />}
                {log.status === "failed" && <XCircle size={12} className="text-red-500 shrink-0" />}
                {log.status === "pending" && <Clock size={12} className="text-muted-foreground shrink-0" />}
                <div className="flex-1 min-w-0"><p className="text-xs font-medium truncate">{log.contact_name ?? log.phone}</p>{log.error_message && <p className="text-[10px] text-red-500 truncate">{log.error_message}</p>}</div>
                <span className="text-[10px] text-muted-foreground shrink-0 font-mono">{log.phone}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── SECCIÓN 2: DENTRO DE 24H (Mensajes libres) ────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// ── Country / Timezone data ───────────────────────────────────────────────────

const TIMEZONES = [
  { value: "America/Bogota",                 label: "Colombia (UTC-5)" },
  { value: "America/Mexico_City",            label: "México Centro (UTC-6)" },
  { value: "America/Lima",                   label: "Perú (UTC-5)" },
  { value: "America/Santiago",               label: "Chile (UTC-4)" },
  { value: "America/Argentina/Buenos_Aires", label: "Argentina (UTC-3)" },
  { value: "America/Sao_Paulo",              label: "Brasil (UTC-3)" },
  { value: "America/Caracas",                label: "Venezuela (UTC-4)" },
  { value: "America/La_Paz",                 label: "Bolivia (UTC-4)" },
  { value: "America/Guayaquil",              label: "Ecuador (UTC-5)" },
  { value: "America/Asuncion",               label: "Paraguay (UTC-4)" },
  { value: "America/Montevideo",             label: "Uruguay (UTC-3)" },
  { value: "America/Guatemala",              label: "Centroamérica (UTC-6)" },
  { value: "America/Panama",                 label: "Panamá (UTC-5)" },
  { value: "Europe/Madrid",                  label: "España (UTC+1/+2)" },
  { value: "Europe/London",                  label: "Reino Unido (UTC+0/+1)" },
  { value: "America/New_York",               label: "USA Este (UTC-5/-4)" },
  { value: "America/Los_Angeles",            label: "USA Oeste (UTC-8/-7)" },
  { value: "UTC",                            label: "UTC" },
];

function toUtcIso(date: string, time: string, timezone: string): string {
  const nominal = new Date(`${date}T${time}:00Z`);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(nominal).map(p => [p.type, p.value]));
  const tzApparentMs = new Date(
    `${parts.year}-${parts.month}-${parts.day}T${parts.hour.replace("24","00")}:${parts.minute}:${parts.second}Z`
  ).getTime();
  const offsetMs = nominal.getTime() - tzApparentMs;
  return new Date(new Date(`${date}T${time}:00Z`).getTime() + offsetMs).toISOString();
}

function InstantCampaignDetail({ campaign, onBack }: { campaign: CrmWaInstantCampaign; onBack: () => void }) {
  const { data: logs = [], isLoading } = useInstantCampaignLogs(campaign.id);

  const scheduleLabel = useMemo(() => {
    if (campaign.send_mode !== "scheduled" || !campaign.scheduled_at) return null;
    if (campaign.timezone_mode === "contact") {
      return `${campaign.target_date} a las ${campaign.target_local_time} (hora local de cada contacto)`;
    }
    const d = new Date(campaign.scheduled_at);
    return `${d.toLocaleDateString("es-ES")} ${d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })} (${campaign.user_timezone ?? "UTC"})`;
  }, [campaign]);

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft size={14} /> Volver</button>
      <div>
        <div className="flex items-center gap-2 flex-wrap"><h2 className="text-base font-semibold">{campaign.name}</h2>{statusBadge(campaign.status)}</div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Ventana: últimas {campaign.window_hours}h
          {campaign.country_codes?.length > 0 && ` · ${campaign.country_codes.map(cc => COUNTRY_INFO[cc]?.flag ?? cc).join(" ")}`}
          {scheduleLabel && ` · Programado: ${scheduleLabel}`}
          {" · "}{relativeTime(campaign.created_at)}
        </p>
      </div>
      <SentContent>
        {(() => {
          const parts = campaignPartsOf(campaign);
          if (!parts.length) return <p className="text-xs text-muted-foreground">Sin contenido registrado.</p>;
          return (
            <div className="space-y-2">
              {parts.map(p => <SentPart key={p.id} part={p} />)}
            </div>
          );
        })()}
      </SentContent>
      <div className="grid grid-cols-3 gap-3">
        {[{ label: "Total", value: campaign.total_contacts ?? "—", cls: "text-foreground" }, { label: "Enviados", value: campaign.sent_count, cls: "text-green-600 dark:text-green-400" }, { label: "Fallidos", value: campaign.failed_count, cls: "text-red-600 dark:text-red-400" }].map(s => (
          <div key={s.label} className="rounded-xl border border-border bg-muted/20 p-3 text-center"><p className={`text-xl font-bold ${s.cls}`}>{s.value}</p><p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p></div>
        ))}
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">Detalle por conversación</p>
        {isLoading ? <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-muted-foreground/50" /></div> : !logs.length ? <p className="text-xs text-muted-foreground text-center py-4">Sin registros</p> : (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {logs.map((log: CrmWaInstantCampaignLog) => (
              <div key={log.id} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/20 transition-colors">
                {log.status === "sent"    && <CheckCircle2 size={12} className="text-green-500 shrink-0" />}
                {log.status === "failed"  && <XCircle size={12} className="text-red-500 shrink-0" />}
                {log.status === "skipped" && <Clock size={12} className="text-muted-foreground shrink-0" />}
                <div className="flex-1 min-w-0"><p className="text-xs font-medium truncate">{log.contact_name ?? log.phone}</p>{log.error_message && <p className="text-[10px] text-red-500 truncate">{log.error_message}</p>}</div>
                <span className="text-[10px] text-muted-foreground shrink-0 font-mono">{log.phone}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Media upload field ────────────────────────────────────────────────────────

// ─── Piezas compartidas por los pasos 2 y 3 ──────────────────────────────────

type MsgKind = "template" | "free";

/** Días entre hoy y la fecha elegida. 0 = hoy mismo. */
function daysUntil(dateStr: string): number {
  if (!dateStr) return 0;
  const target = new Date(`${dateStr}T00:00:00`).getTime();
  const today  = new Date(new Date().toDateString()).getTime();
  return Math.max(0, Math.round((target - today) / 86_400_000));
}

/**
 * Aviso de que la audiencia de un mensaje libre se recalcula al enviar. Se
 * muestra igual en el paso "Cuándo" y en el resumen: es justo donde el usuario
 * ve una lista de nombres y podría creer que son los destinatarios definitivos.
 */
function WindowRecalcNotice({ windowHours, reachNow, daysAhead }: {
  windowHours: number; reachNow: number; daysAhead: number;
}) {
  const strong = daysAhead >= 1;
  return (
    <div className={`flex items-start gap-2 p-2.5 rounded-lg border ${
      strong
        ? "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/40"
        : "bg-secondary/40 border-border"
    }`}>
      <AlertCircle size={13} className={`shrink-0 mt-0.5 ${strong ? "text-amber-600" : "text-muted-foreground"}`} />
      <p className={`text-[11px] leading-relaxed ${strong ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
        Un mensaje libre solo puede llegar a quien te haya escrito en las últimas {windowHours}h,
        y eso <strong>se vuelve a calcular en el momento del envío</strong>.
        {strong
          ? ` Los ${reachNow} de ahora ya no estarán en ventana dentro de ${daysAhead} día${daysAhead !== 1 ? "s" : ""}: llegará a quien esté activo ese día, que puede ser mucha gente distinta o nadie.`
          : ` Ahora mismo serían ${reachNow}, pero puede variar hasta la hora de envío.`}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── PASO 2: CÓMO LLEGAS ───────────────────────────────────────────────────────
//
// Aquí muere la vieja separación "Pasado 24h / Dentro 24h". No son dos lugares:
// son la misma campaña con distinto tipo de mensaje, y la regla de Meta se
// expresa como el alcance de cada opción en vez de como un tab que hay que
// entender antes de empezar.
// ─────────────────────────────────────────────────────────────────────────────

function StepChannel({
  kind, onKindChange, reachTotal, reachFree, windowHours, onWindowHoursChange,
}: {
  kind: MsgKind; onKindChange: (k: MsgKind) => void;
  reachTotal: number; reachFree: number;
  windowHours: number; onWindowHoursChange: (h: number) => void;
}) {
  const OPTIONS = [
    { id: "template" as const, icon: <Megaphone size={15} />, title: "Plantilla aprobada",
      reach: reachTotal, note: "Llega a toda la audiencia · con costo por mensaje entregado" },
    { id: "free" as const, icon: <Zap size={15} />, title: "Mensaje libre",
      reach: reachFree, note: "Solo a quien te escribió recientemente · gratis" },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {OPTIONS.map(o => (
          <button key={o.id} type="button" onClick={() => onKindChange(o.id)}
            className={`w-full flex items-start gap-2.5 p-3 rounded-xl border text-left ${
              kind === o.id ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border hover:border-primary/40 hover:bg-muted/20"
            }`}>
            <span className={`mt-0.5 shrink-0 ${kind === o.id ? "text-primary" : "text-muted-foreground"}`}>{o.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{o.title}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Llega a <strong className="text-foreground">{o.reach}</strong> · {o.note}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* El recorte de tiempo recorta la audiencia, así que va aquí y no con el
          contenido: es parte de "a cuántos llegas". */}
      {kind === "free" && (
        <div className="space-y-1.5 p-3 rounded-xl bg-muted/20 border border-border">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold">¿Hace cuánto te escribieron?</p>
            <span className="text-xs font-bold shrink-0">Últimas {windowHours}h</span>
          </div>
          <input type="range" min={1} max={24} step={1} value={windowHours}
            onChange={e => onWindowHoursChange(Number(e.target.value))}
            className="w-full accent-primary" />
          <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
            24h es el máximo que permite Meta para mensajes libres — bájalo si quieres alcanzar
            solo a los más recientes.
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/30 border border-border">
        <Users size={14} className="text-primary shrink-0" />
        <p className="text-xs text-muted-foreground">
          Llegará a <strong className="text-foreground">{kind === "template" ? reachTotal : reachFree} destinatario{(kind === "template" ? reachTotal : reachFree) !== 1 ? "s" : ""}</strong>
          {kind === "template" ? " · con costo por mensaje entregado" : " · sin costo"}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── PASO 3: MENSAJE ───────────────────────────────────────────────────────────
// Solo contenido. Quién lo recibe ya quedó decidido en el paso anterior.
// ─────────────────────────────────────────────────────────────────────────────

function StepContent({
  kind, template, onTemplateChange, varMap, onVarMapChange, part, onPartChange, userId,
}: {
  kind: MsgKind;
  template: CrmWaTemplate | null; onTemplateChange: (t: CrmWaTemplate) => void;
  varMap: WaVarMap; onVarMapChange: (m: WaVarMap) => void;
  part: WaCampaignPart; onPartChange: (p: WaCampaignPart) => void;
  userId: string;
}) {
  if (kind === "template") {
    return (
      <div className="space-y-4">
        <StepTemplate selected={template} onSelect={onTemplateChange} />
        {template && (
          <div className="pt-1 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground mb-2 mt-3">Variables</p>
            <StepVariables template={template} varMap={varMap} onChange={onVarMapChange} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <MessageEditor part={part} onChange={onPartChange} userId={userId} />
      <PartPreview part={part} />
    </div>
  );
}

// ── PASO 3: CUÁNDO ────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

function StepWhen({
  sendMode, onSendModeChange, schedDate, onSchedDateChange, schedTime, onSchedTimeChange,
  tzMode, onTzModeChange, userTz, onUserTzChange, tzOptions, schedInPast,
  isFree, windowHours, reachNow,
}: {
  sendMode: "instant" | "scheduled"; onSendModeChange: (m: "instant" | "scheduled") => void;
  schedDate: string; onSchedDateChange: (d: string) => void;
  schedTime: string; onSchedTimeChange: (t: string) => void;
  tzMode: "user" | "contact"; onTzModeChange: (m: "user" | "contact") => void;
  userTz: string; onUserTzChange: (tz: string) => void;
  tzOptions: { value: string; label: string }[];
  schedInPast: boolean;
  isFree: boolean; windowHours: number; reachNow: number;
}) {
  const daysAhead = daysUntil(schedDate);
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">¿Cuándo se envía?</p>
        {([
          { id: "instant" as const,  title: "Ahora",
            note: "Sale en cuanto confirmes." },
          { id: "scheduled" as const, title: "Programar",
            note: "Eliges día y hora. La audiencia se recalcula en el momento del envío." },
        ]).map(m => (
          <button key={m.id} type="button" onClick={() => onSendModeChange(m.id)}
            className={`w-full flex items-start gap-2.5 p-3 rounded-xl border text-left ${
              sendMode === m.id ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border hover:border-primary/40 hover:bg-muted/20"
            }`}>
            <span className={`mt-0.5 shrink-0 ${sendMode === m.id ? "text-primary" : "text-muted-foreground"}`}>
              {m.id === "instant" ? <Zap size={15} /> : <Calendar size={15} />}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{m.title}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{m.note}</p>
            </div>
          </button>
        ))}
      </div>

      {sendMode === "scheduled" && (
        <div className="space-y-3 p-3 rounded-xl bg-muted/20 border border-border">
          {/* La zona horaria va primero: cambia el significado de la hora que se
              elige justo debajo. Preguntarla después obligaba a releer. */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">1 · ¿En qué horario?</label>
            {([
              { id: "user" as const,    title: "La misma hora para todos", note: "Sale de una sola vez, en la zona horaria que elijas." },
              { id: "contact" as const, title: "Hora local de cada contacto", note: "Sale por tandas, según va dando la hora en el país de cada número." },
            ]).map(t => (
              <label key={t.id} className={`flex items-start gap-2.5 cursor-pointer p-2.5 rounded-xl border ${tzMode === t.id ? "border-primary/50 bg-primary/5" : "border-border"}`}>
                <input type="radio" name="tzMode" checked={tzMode === t.id} onChange={() => onTzModeChange(t.id)} className="mt-0.5 accent-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium">{t.title}</p>
                  <p className="text-[10px] text-muted-foreground">{t.note}</p>
                </div>
              </label>
            ))}

            {tzMode === "user" && (
              <select value={userTz} onChange={e => onUserTzChange(e.target.value)}
                className="w-full h-9 px-2 rounded-lg border border-border bg-background text-base md:text-sm outline-none focus:ring-2 focus:ring-primary/30">
                {tzOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            )}
          </div>

          <div className="space-y-1.5 pt-1 border-t border-border">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">2 · ¿Qué día y a qué hora?</label>
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <input type="date" value={schedDate} onChange={e => onSchedDateChange(e.target.value)}
                  className="w-full h-9 px-2 rounded-lg border border-border bg-background text-base md:text-sm outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="flex-1 space-y-1">
                <input type="time" value={schedTime} onChange={e => onSchedTimeChange(e.target.value)}
                  className="w-full h-9 px-2 rounded-lg border border-border bg-background text-base md:text-sm outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground/70">
              {tzMode === "contact"
                ? "A cada contacto le llega a esa hora en su propio país."
                : `Hora de ${userTz}.`}
            </p>
          </div>

          {/* La ventana de 24h es móvil: al programar, los destinatarios de hoy no
              son los del día del envío. Callarlo haría que el usuario creyera
              que le llega a las personas que vio en el paso anterior. */}
          {isFree && (
            <WindowRecalcNotice windowHours={windowHours} reachNow={reachNow} daysAhead={daysAhead} />
          )}

          {schedInPast && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40">
              <AlertCircle size={13} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-700 dark:text-red-400">Esa fecha y hora ya pasaron.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── PASO 4: REVISAR ───────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

function StepReview({
  kind, template, varMap, part, windowHours,
  audienceType, filters, match, recipients, sendMode, schedDate, schedTime, tzMode, userTz,
  campaignName, onNameChange,
}: {
  kind: MsgKind; template: CrmWaTemplate | null; varMap: WaVarMap;
  part: WaCampaignPart; windowHours: number;
  audienceType: "all" | "include" | "exclude"; filters: WaAudienceFilter[];
  match: WaAudienceMatch; recipients: AudienceMember[];
  sendMode: "instant" | "scheduled"; schedDate: string; schedTime: string;
  tzMode: "user" | "contact"; userTz: string;
  campaignName: string; onNameChange: (n: string) => void;
}) {
  const [showList, setShowList] = useState(false);

  // Un mensaje libre programado NO va a los que están en la lista: la ventana
  // se reevalúa al enviar. Hay que decirlo justo donde se ven los nombres.
  const windowRecalcs = kind === "free" && sendMode === "scheduled";

  const audienceLabel =
    audienceType === "all"     ? "Todos"
  : audienceType === "include" ? `Solo incluir (${filters.length} filtro${filters.length !== 1 ? "s" : ""})`
  :                              `Todos menos (${filters.length} filtro${filters.length !== 1 ? "s" : ""})`;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground">Nombre del envío</label>
        <input
          value={campaignName}
          onChange={e => onNameChange(e.target.value)}
          placeholder="Ej: Promo de septiembre"
          className="w-full h-9 px-3 rounded-xl border border-border bg-background text-base md:text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
        <p className="text-[10px] text-muted-foreground/70">Solo para que lo reconozcas en la lista. El contacto no lo ve.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-3 space-y-2 text-xs">
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground shrink-0">Audiencia</span>
          <span className="font-medium text-right">{audienceLabel}</span>
        </div>
        {filters.length > 0 && (
          <>
            <div className="flex flex-wrap gap-1 justify-end">
              {filters.map((f, i) => (
                <span key={i} className="bg-primary/8 border border-primary/20 text-primary px-2 py-0.5 rounded-full text-[10px]">{filterLabel(f)}</span>
              ))}
            </div>
            {filters.length > 1 && (
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground shrink-0">Combinación</span>
                <span className="font-medium text-right">
                  {match === "all" ? "Debe cumplirlos todos" : "Basta con cumplir uno"}
                </span>
              </div>
            )}
          </>
        )}
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground shrink-0">Destinatarios</span>
          <span className="font-medium text-right">{recipients.length}</span>
        </div>
        <div className="flex justify-between gap-3 pt-2 border-t border-border">
          <span className="text-muted-foreground shrink-0">Mensaje</span>
          <span className="font-medium text-right">
            {kind === "template"
              ? `Plantilla · ${template?.name ?? "—"}`
              : `Libre · ${PART_TYPES.find(t => t.id === part.type)?.label ?? part.type} · últimas ${windowHours}h`}
          </span>
        </div>
        {kind === "template" && Object.keys(varMap).length > 0 && (
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground shrink-0">Variables</span>
            <span className="font-medium text-right">{Object.keys(varMap).length} configurada{Object.keys(varMap).length !== 1 ? "s" : ""}</span>
          </div>
        )}
        <div className="flex justify-between gap-3 pt-2 border-t border-border">
          <span className="text-muted-foreground shrink-0">Cuándo</span>
          <span className="font-medium text-right">
            {sendMode === "instant"
              ? "Ahora"
              : tzMode === "contact"
                ? `${schedDate} a las ${schedTime}, hora local de cada contacto`
                : `${schedDate} a las ${schedTime} (${userTz})`}
          </span>
        </div>
      </div>

      {/* Quiénes son exactamente. El backend recalcula al enviar con los mismos
          criterios, así que esta lista es la definitiva salvo que algo cambie
          entre ahora y el envío — y con un mensaje libre programado eso no es
          una excepción rara, es lo que va a pasar seguro. */}
      {recipients.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <button type="button" onClick={() => setShowList(v => !v)}
            className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted/30 transition-colors text-left">
            <Users size={13} className="text-primary shrink-0" />
            <span className="text-xs font-medium flex-1">
              Ver quiénes reciben ({recipients.length})
              {windowRecalcs && (
                <span className="block text-[10px] font-normal text-amber-600 dark:text-amber-400 mt-0.5">
                  Esta lista cambiará: se recalcula al enviar
                </span>
              )}
            </span>
            {showList ? <ChevronUp size={13} className="text-muted-foreground" /> : <ChevronDown size={13} className="text-muted-foreground" />}
          </button>

          {showList && (
            <div className="border-t border-border">
              {windowRecalcs && (
                <div className="p-2.5 border-b border-border">
                  <WindowRecalcNotice windowHours={windowHours} reachNow={recipients.length} daysAhead={daysUntil(schedDate)} />
                </div>
              )}
              <div className="max-h-56 overflow-y-auto divide-y divide-border">
                {recipients.slice(0, LIST_PREVIEW).map(m => (
                  <div key={m.phoneKey} className="flex items-center gap-2 px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{m.name || "Sin nombre"}</p>
                      <p className="text-[10px] text-muted-foreground font-mono truncate">{m.phone}</p>
                    </div>
                    {!m.contactId && (
                      <span className="text-[9px] text-muted-foreground/70 border border-border rounded-full px-1.5 py-0.5 shrink-0">
                        sin ficha
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {recipients.length > LIST_PREVIEW && (
                <p className="px-3 py-2 text-[10px] text-muted-foreground border-t border-border">
                  y {recipients.length - LIST_PREVIEW} más
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {kind === "template" ? (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40">
          <Info size={13} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
            Meta cobra <strong>cada mensaje de plantilla entregado</strong>, no la conversación: la tarifa depende del país
            del destinatario y de la categoría de la plantilla. Revisa los precios en Plantillas.
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-secondary/40 border border-border">
          <Info size={13} className="text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Este envío es <strong className="text-foreground">gratuito</strong> para Meta. La ventana de 24h se evalúa en el momento del envío real, no ahora.
          </p>
        </div>
      )}

      {kind === "free" && <PartPreview part={part} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── COMPONENTE PRINCIPAL: Envíos Masivos ──────────────────────────────────────
//
// Un solo wizard: Audiencia → Mensaje → Cuándo → Revisar.
//
// El tipo de mensaje decide en qué tabla aterriza el envío (crm_wa_campaigns
// para plantillas, crm_wa_instant_campaigns para mensajes libres) porque su
// runtime es distinto — pero eso es un detalle de implementación que el usuario
// nunca ve: para él es una sola lista de envíos.
// ─────────────────────────────────────────────────────────────────────────────

type AnyCampaign =
  | { kind: "template"; row: CrmWaCampaign }
  | { kind: "free";     row: CrmWaInstantCampaign };

export default function CrmWaCampaigns() {
  const { user } = useCurrentUser();
  const { data: businessProfile } = useBusinessProfile();

  const { data: tplCampaigns = [],  isLoading: loadingTpl,  refetch: refetchTpl }  = useWaCampaigns();
  const { data: freeCampaigns = [], isLoading: loadingFree, refetch: refetchFree } = useInstantCampaigns();
  const deleteTpl  = useDeleteWaCampaign();
  const deleteFree = useDeleteInstantCampaign();
  const createTpl  = useCreateWaCampaign();
  const createFree = useCreateInstantCampaign();

  const [building, setBuilding] = useState(false);
  const [step, setStep]         = useState(0);
  const [sending, setSending]   = useState(false);
  const [detail, setDetail]     = useState<AnyCampaign | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AnyCampaign | null>(null);

  // Paso 1 — Audiencia
  const [audienceType, setAudienceType] = useState<"all" | "include" | "exclude">("all");
  const [filters, setFilters]           = useState<WaAudienceFilter[]>([]);
  const [audienceMatch, setAudienceMatch] = useState<WaAudienceMatch>("any");

  // Paso 2 — Mensaje
  const [msgKind, setMsgKind]       = useState<MsgKind>("template");
  const [selTemplate, setSelTemplate] = useState<CrmWaTemplate | null>(null);
  const [varMap, setVarMap]         = useState<WaVarMap>({});
  const [part, setPart]             = useState<WaCampaignPart>(() => newPart("text"));
  const [windowHours, setWindowHours] = useState(24);

  // Paso 4 — Cuándo
  const [sendMode, setSendMode]   = useState<"instant" | "scheduled">("instant");
  const [schedDate, setSchedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [schedTime, setSchedTime] = useState("10:00");
  const [tzMode, setTzMode]       = useState<"user" | "contact">("user");
  const [userTz, setUserTz]       = useState("UTC");

  // Paso 5 — Revisar
  const [campName, setCampName] = useState("");

  useEffect(() => {
    if (businessProfile?.timezone) setUserTz(businessProfile.timezone);
  }, [businessProfile?.timezone]);

  // Todos los datos de audiencia (universo, sin-teléfono e índices de filtros)
  // salen del mismo sitio que en Seguimiento Automático.
  const { base, phoneless, ctx, activeKeys } = useAudienceData(windowHours);

  const audience = useMemo(
    () => estimateAudience(base, audienceType, filters, ctx, audienceMatch),
    [base, audienceType, filters, ctx, audienceMatch],
  );
  // El mensaje libre solo alcanza a quien esté dentro de la ventana elegida.
  const freeMembers = useMemo(
    () => audience.filter(m => activeKeys.has(m.phoneKey)),
    [audience, activeKeys],
  );

  const tzOptions = useMemo(() => {
    const inList = TIMEZONES.some(t => t.value === userTz);
    if (inList || !businessProfile?.timezone) return TIMEZONES;
    return [{ value: businessProfile.timezone, label: `Tu negocio (${businessProfile.timezone})` }, ...TIMEZONES];
  }, [businessProfile?.timezone, userTz]);

  const schedInPast = useMemo(() => {
    if (sendMode !== "scheduled" || !schedDate || !schedTime) return false;
    try { return new Date(toUtcIso(schedDate, schedTime, userTz)) <= new Date(); }
    catch { return false; }
  }, [sendMode, schedDate, schedTime, userTz]);

  const resetBuilder = () => {
    setStep(0); setAudienceType("all"); setFilters([]); setAudienceMatch("any");
    setMsgKind("template"); setSelTemplate(null); setVarMap({});
    setPart(newPart("text")); setWindowHours(24);
    setSendMode("instant"); setSchedDate(new Date().toISOString().slice(0, 10));
    setSchedTime("10:00"); setTzMode("user"); setUserTz(businessProfile?.timezone ?? "UTC");
    setCampName(""); setSending(false);
  };

  const canNext = () => {
    if (step === 0) return audienceType === "all" || filters.length > 0;
    // Paso 2 (cómo llegas): siempre hay una opción marcada, nada que validar.
    if (step === 1) return true;
    if (step === 2) {
      if (msgKind === "template") return !!selTemplate;
      // El mensaje tiene que llevar algo.
      return part.type === "text" ? (part.text ?? "").trim().length > 0
           : part.type === "link" ? (part.link_url ?? "").trim().length > 0
           : (part.url ?? "").trim().length > 0;
    }
    if (step === 3) {
      if (sendMode === "instant") return true;
      if (!schedDate || !schedTime) return false;
      return !schedInPast;
    }
    return campName.trim().length > 0;
  };

  const invokeSend = async (fn: string, campaignId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fn}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ campaign_id: campaignId }),
    });
    return res.json();
  };

  const handleSubmit = async () => {
    if (!campName.trim()) return;
    setSending(true);
    try {
      // Programación: modo A guarda el instante UTC; modo B guarda fecha+hora
      // local y deja que el scheduler calcule el UTC por zona de cada contacto.
      let scheduledAt: string | null = null;
      let targetDate: string | null = null;
      let targetLocalTime: string | null = null;
      if (sendMode === "scheduled") {
        if (tzMode === "user") {
          scheduledAt = toUtcIso(schedDate, schedTime, userTz);
        } else {
          targetDate = schedDate;
          targetLocalTime = schedTime;
          scheduledAt = `${schedDate}T00:00:00.000Z`;
        }
      }
      const scheduleFields = {
        send_mode: sendMode,
        timezone_mode: sendMode === "scheduled" ? tzMode : null,
        target_local_time: targetLocalTime,
        target_date: targetDate,
        user_timezone: sendMode === "scheduled" && tzMode === "user" ? userTz : null,
        scheduled_at: scheduledAt,
        status: (sendMode === "scheduled" ? "scheduled" : "draft") as "scheduled" | "draft",
      };

      let campaignId: string;
      let created: AnyCampaign;

      if (msgKind === "template") {
        if (!selTemplate) return;
        const row = await createTpl.mutateAsync({
          template_id: selTemplate.id,
          name: campName.trim(),
          variable_map: varMap,
          audience_type: audienceType,
          audience_filters: filters,
          audience_match: audienceMatch,
          ...scheduleFields,
        });
        campaignId = row.id;
        created = { kind: "template", row };
      } else {
        const row = await createFree.mutateAsync({
          name: campName.trim(),
          // parts es la fuente de verdad; los campos sueltos quedan como legado.
          parts: [part],
          message_text: "",
          media_type: null,
          media_url: null,
          window_hours: windowHours,
          label_ids: [],
          country_codes: [],
          audience_type: audienceType,
          audience_filters: filters,
          audience_match: audienceMatch,
          ...scheduleFields,
        });
        campaignId = row.id;
        created = { kind: "free", row };
      }

      if (sendMode === "scheduled") {
        toast.success("Envío programado");
        refetchTpl(); refetchFree();
        setBuilding(false); resetBuilder();
        return;
      }

      const js = await invokeSend(msgKind === "template" ? "send-wa-campaign" : "send-wa-instant", campaignId);
      if (js.ok) {
        // Un envío grande no cabe en una invocación: el backend manda un lote y
        // deja el resto en cola. No es un error — el cron lo continúa solo.
        if (js.done === false) {
          toast.success(
            `Enviando: ${js.sent} de ${js.total}. Los ${js.remaining} restantes salen en segundo plano, puedes cerrar esta ventana.`,
            { duration: 10000 },
          );
        } else {
          toast.success(`Envío completado: ${js.sent} enviados, ${js.failed} fallidos de ${js.total}`);
        }
        refetchTpl(); refetchFree();
        setBuilding(false); resetBuilder();
        setDetail(created);
      } else {
        toast.error(
          js.error === "waba_not_configured" ? "Configura tu WABA en la sección Conexión"
          : js.error === "already_processed" ? "Este envío ya fue procesado"
          : js.error ?? "Error al enviar",
          { duration: 8000 },
        );
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSending(false);
    }
  };

  // ── Detalle ────────────────────────────────────────────────────────────────
  if (detail?.kind === "template") return <CampaignDetail campaign={detail.row} onBack={() => setDetail(null)} />;
  if (detail?.kind === "free")     return <InstantCampaignDetail campaign={detail.row} onBack={() => setDetail(null)} />;

  // ── Builder ────────────────────────────────────────────────────────────────
  if (building) return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {/* La flecha retrocede un paso; solo cancela si ya estás en el primero.
            Perder todo el envío por tocar "atrás" en el paso 4 era demasiado
            castigo para un gesto que en cualquier otra pantalla es inofensivo. */}
        <button
          onClick={() => { if (step === 0) { setBuilding(false); resetBuilder(); } else setStep(s => s - 1); }}
          title={step === 0 ? "Cancelar" : "Paso anterior"}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
          <ArrowLeft size={14} />
        </button>
        <h2 className="text-sm font-semibold flex-1 truncate">Nuevo envío masivo</h2>
        {/* Salir del todo tiene su propio botón, explícito y siempre en el mismo sitio. */}
        <button
          onClick={() => { setBuilding(false); resetBuilder(); }}
          title="Cancelar envío"
          className="p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground shrink-0">
          <XCircle size={15} />
        </button>
      </div>

      <StepBar steps={STEPS} current={step} />

      <p className="text-[11px] text-muted-foreground -mt-1">{STEP_HINTS[step]}</p>

      {step === 0 && (
        <StepAudience
          audienceType={audienceType} filters={filters} base={base} phoneless={phoneless} ctx={ctx}
          match={audienceMatch}
          onTypeChange={t => { setAudienceType(t); if (t === "all") setFilters([]); }}
          onFiltersChange={setFilters}
          onMatchChange={setAudienceMatch}
        />
      )}

      {step === 1 && (
        <StepChannel
          kind={msgKind} onKindChange={setMsgKind}
          reachTotal={audience.length} reachFree={freeMembers.length}
          windowHours={windowHours} onWindowHoursChange={setWindowHours}
        />
      )}

      {step === 2 && (
        <StepContent
          kind={msgKind}
          template={selTemplate} onTemplateChange={t => { setSelTemplate(t); setVarMap({}); }}
          varMap={varMap} onVarMapChange={setVarMap}
          part={part} onPartChange={setPart}
          userId={user?.id ?? ""}
        />
      )}

      {step === 3 && (
        <StepWhen
          sendMode={sendMode} onSendModeChange={setSendMode}
          schedDate={schedDate} onSchedDateChange={setSchedDate}
          schedTime={schedTime} onSchedTimeChange={setSchedTime}
          tzMode={tzMode} onTzModeChange={setTzMode}
          userTz={userTz} onUserTzChange={setUserTz}
          tzOptions={tzOptions} schedInPast={schedInPast}
          isFree={msgKind === "free"} windowHours={windowHours} reachNow={freeMembers.length}
        />
      )}

      {step === 4 && (
        <StepReview
          kind={msgKind} template={selTemplate} varMap={varMap}
          part={part} windowHours={windowHours}
          audienceType={audienceType} filters={filters} match={audienceMatch}
          recipients={msgKind === "template" ? audience : freeMembers}
          sendMode={sendMode} schedDate={schedDate} schedTime={schedTime}
          tzMode={tzMode} userTz={userTz}
          campaignName={campName} onNameChange={setCampName}
        />
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-border">
        {step > 0 && (
          <button type="button" onClick={() => setStep(s => s - 1)}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
            <ChevronLeft size={14} /> Anterior
          </button>
        )}
        <div className="flex-1" />
        {step < 4 ? (
          <button type="button" onClick={() => setStep(s => s + 1)} disabled={!canNext()}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40">
            Siguiente <ChevronRight size={14} />
          </button>
        ) : sendMode === "instant" ? (
          <button type="button" onClick={handleSubmit} disabled={sending || !canNext()}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-40">
            {sending ? <><Loader2 size={13} className="animate-spin" /> Enviando...</> : <><Zap size={13} /> Enviar ahora</>}
          </button>
        ) : (
          <button type="button" onClick={handleSubmit} disabled={sending || !canNext()}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40">
            {sending ? <><Loader2 size={13} className="animate-spin" /> Guardando...</> : <><Calendar size={13} /> Programar</>}
          </button>
        )}
      </div>
    </div>
  );

  // ── Lista unificada ────────────────────────────────────────────────────────
  const all: AnyCampaign[] = [
    ...tplCampaigns.map(row  => ({ kind: "template" as const, row })),
    ...freeCampaigns.map(row => ({ kind: "free" as const,     row })),
  ].sort((a, b) => (a.row.created_at < b.row.created_at ? 1 : -1));

  const isLoading = loadingTpl || loadingFree;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 rounded-xl bg-secondary/40 border border-border">
        <Info size={13} className="text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Regla de 24h de Meta:</strong> si un contacto te escribió en las últimas 24h puedes responderle con cualquier mensaje (gratis hasta el 1 oct 2026). Pasado ese tiempo solo puedes contactarlo con <strong>plantillas aprobadas</strong> (con costo por cada mensaje entregado).
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Envíos</p>
          <p className="text-xs text-muted-foreground">{all.length} envío{all.length !== 1 ? "s" : ""}</p>
        </div>
        <button type="button" onClick={() => { setBuilding(true); resetBuilder(); }}
          className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1.5 shrink-0">
          <Plus size={12} /> Nuevo
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : !all.length ? (
        <div className="text-center py-12 space-y-2">
          <Send size={28} className="mx-auto text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Sin envíos todavía</p>
          <p className="text-xs text-muted-foreground/70">Elige una audiencia, escribe el mensaje y decide cuándo sale</p>
        </div>
      ) : (
        <div className="space-y-2">
          {all.map(c => (
            <div key={`${c.kind}-${c.row.id}`} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-medium truncate">{c.row.name}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      c.kind === "template"
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    }`}>
                      {c.kind === "template" ? <Megaphone size={9} /> : <Zap size={9} />}
                      {c.kind === "template" ? "Plantilla" : "Libre"}
                    </span>
                    {statusBadge(c.row.status)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {c.row.status === "scheduled" && c.row.scheduled_at &&
                      `Programado: ${new Date(c.row.scheduled_at).toLocaleDateString("es-ES")} · `}
                    {c.row.total_contacts != null && `${c.row.sent_count}/${c.row.total_contacts} enviados · `}
                    {relativeTime(c.row.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {(c.row.status === "completed" || c.row.status === "failed" || c.row.status === "processing") && (
                    /* En 'processing' el detalle es útil: muestra el avance lote a lote */
                    <button type="button" onClick={() => setDetail(c)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                      <Eye size={13} />
                    </button>
                  )}
                  {c.row.status !== "processing" && (
                    <button type="button" onClick={() => setDeleteTarget(c)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => { if (!open) setDeleteTarget(null); }}
        description={`Se eliminará el envío "${deleteTarget?.row.name}" permanentemente.`}
        isPending={deleteTpl.isPending || deleteFree.isPending}
        onConfirm={async () => {
          if (!deleteTarget) return;
          if (deleteTarget.kind === "template") await deleteTpl.mutateAsync(deleteTarget.row.id);
          else                                  await deleteFree.mutateAsync(deleteTarget.row.id);
          setDeleteTarget(null);
          toast.success("Envío eliminado");
        }}
      />
    </div>
  );
}
