import { useState, useMemo, useEffect, useRef } from "react";
import {
  Plus, Trash2, Send, ChevronRight, ChevronLeft, CheckCircle2,
  XCircle, Clock, Loader2, Users, Eye,
  ArrowLeft, AlertCircle, Tag, Megaphone, Zap, Info, Calendar, Globe, Bot,
  Image, Video, Mic, Upload,
} from "lucide-react";
import CrmWaAutomations from "./CrmWaAutomations";
import { toast } from "sonner";
import {
  useWaTemplates, useWaCampaigns, useCreateWaCampaign,
  useDeleteWaCampaign, useWaCampaignLogs,
  useProducts, useServices, useCourses,
  usePipelines, useWaLabels, useAllContactTags, useContacts,
  useInstantCampaigns, useInstantCampaignLogs,
  useCreateInstantCampaign, useDeleteInstantCampaign,
  useWaActiveConversations, useBusinessProfile,
  type ActiveConv,
} from "@/hooks/useCrmData";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/useAuth";
import DeleteConfirmDialog from "@/components/shared/DeleteConfirmDialog";
import type {
  CrmWaCampaign, CrmWaCampaignLog, CrmWaTemplate,
  WaVarMap, WaVarSource, WaAudienceFilter,
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

function filterLabel(f: WaAudienceFilter): string {
  switch (f.type) {
    case "tag":                    return `Etiqueta: ${f.value}`;
    case "wa_label":               return `IA: ${f.labelName}`;
    case "pipeline_stage":         return `Pipeline "${f.pipelineName}": ${f.stage}`;
    case "has_sale_any":           return "Tiene alguna compra";
    case "has_sale_product":       return `Compró: ${f.productName}`;
    case "has_sale_service":       return `Compró servicio: ${f.serviceName}`;
    case "no_sale":                return "Sin compras registradas";
    case "has_appointment_ever":   return "Agendó alguna vez";
    case "has_appointment_recent": return `Agendó en los últimos ${f.days} días`;
    case "has_wa_conversation":    return "Tiene conversación con el Agente IA";
    default:                       return "Filtro desconocido";
  }
}

function estimateAudience(contacts: any[], audienceType: string, filters: WaAudienceFilter[]): number {
  const withPhone = contacts.filter(c => c.phone?.trim());
  if (audienceType === "all" || !filters.length) return withPhone.length;
  const tagFilters = filters.filter(f => f.type === "tag") as Extract<WaAudienceFilter, { type: "tag" }>[];
  const hasOtherFilters = filters.some(f => f.type !== "tag");
  if (tagFilters.length === 0 && hasOtherFilters) return withPhone.length;
  const matchingIds = new Set<string>();
  for (const f of tagFilters) {
    withPhone.forEach(c => { if ((c.tags ?? []).includes(f.value)) matchingIds.add(c.id); });
  }
  return audienceType === "include" ? matchingIds.size : withPhone.length - matchingIds.size;
}

const STEPS = ["Plantilla", "Variables", "Audiencia", "Revisar"];
function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1 mb-5">
      {STEPS.map((label, idx) => (
        <div key={idx} className="flex items-center gap-1 flex-1">
          <div className={`flex items-center gap-1.5 ${idx <= current ? "text-primary" : "text-muted-foreground/40"}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors
              ${idx < current ? "bg-primary text-primary-foreground" :
                idx === current ? "border-2 border-primary text-primary" :
                "border border-muted-foreground/30 text-muted-foreground/40"}`}>
              {idx < current ? <CheckCircle2 size={12} /> : idx + 1}
            </div>
            <span className={`text-[11px] font-medium hidden sm:inline ${idx === current ? "text-foreground" : ""}`}>{label}</span>
          </div>
          {idx < STEPS.length - 1 && <div className={`flex-1 h-px mx-1 ${idx < current ? "bg-primary" : "bg-border"}`} />}
        </div>
      ))}
    </div>
  );
}

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
        }} className="h-8 px-2 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/30">
          <option value="contact_field">Campo del contacto</option>
          {products.length > 0 && <option value="product_field">Producto</option>}
          {services.length > 0 && <option value="service_field">Servicio</option>}
          {courses.length  > 0 && <option value="course_field">Curso</option>}
          <option value="fixed">Texto fijo</option>
        </select>
        {source === "contact_field" && (
          <select value={(value as any)?.field ?? "name"} onChange={e => onChange({ source: "contact_field", field: e.target.value as any })}
            className="h-8 px-2 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/30">
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
                className="h-8 px-2 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/30 flex-1 min-w-0">
                {list.map((item: any) => <option key={item.id} value={item.id}>{item[nameKey]}</option>)}
              </select>
              <select value={fieldVal} onChange={e => onChange({ ...(value as any), field: e.target.value })}
                className="h-8 px-2 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/30">
                <option value={source === "course_field" ? "title" : "name"}>{source === "course_field" ? "Título" : "Nombre"}</option>
                <option value="price">Precio</option>
              </select>
            </>
          );
        })()}
        {source === "fixed" && (
          <input value={(value as any)?.value ?? ""} onChange={e => onChange({ source: "fixed", value: e.target.value })}
            placeholder="Texto que se enviará a todos"
            className="flex-1 h-8 px-2 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/30 min-w-0" />
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

type FilterType = WaAudienceFilter["type"];
const FILTER_TYPE_LABELS: Record<FilterType, string> = {
  tag: "Etiqueta del contacto", wa_label: "Etiqueta del Agente IA",
  pipeline_stage: "Estado en Pipeline", has_sale_any: "Tiene alguna compra",
  has_sale_product: "Compró un producto", has_sale_service: "Compró un servicio",
  no_sale: "Sin compras registradas", has_appointment_ever: "Ha agendado alguna vez",
  has_appointment_recent: "Agendó recientemente", has_wa_conversation: "Tiene conversación con el Agente IA",
};

function FilterBuilder({ filters, onChange }: { filters: WaAudienceFilter[]; onChange: (f: WaAudienceFilter[]) => void }) {
  const { data: tags = [] }      = useAllContactTags();
  const { data: waLabels = [] }  = useWaLabels();
  const { data: pipelines = [] } = usePipelines();
  const { data: products = [] }  = useProducts();
  const { data: services = [] }  = useServices();
  const [addType, setAddType]       = useState<FilterType>("tag");
  const [addTag, setAddTag]         = useState("");
  const [addLabelId, setAddLabelId] = useState("");
  const [addPipeId, setAddPipeId]   = useState("");
  const [addPipeStage, setAddPipeStage] = useState("");
  const [addProductId, setAddProductId] = useState("");
  const [addServiceId, setAddServiceId] = useState("");
  const [addDays, setAddDays]       = useState("30");

  const handleAdd = () => {
    let filter: WaAudienceFilter | null = null;
    if (addType === "tag") { const tag = addTag || tags[0]; if (!tag) return; filter = { type: "tag", value: tag }; }
    else if (addType === "wa_label") { const lbl = waLabels.find(l => l.id === addLabelId) ?? waLabels[0]; if (!lbl) return; filter = { type: "wa_label", labelId: lbl.id, labelName: lbl.name }; }
    else if (addType === "pipeline_stage") { const pipe = pipelines.find(p => p.id === addPipeId) ?? pipelines[0]; if (!pipe) return; const stage = addPipeStage || (pipe.column_names?.[0] ?? ""); if (!stage) return; filter = { type: "pipeline_stage", pipelineId: pipe.id, pipelineName: pipe.name, stage }; }
    else if (addType === "has_sale_product") { const prod = products.find(p => p.id === addProductId) ?? products[0]; if (!prod) return; filter = { type: "has_sale_product", productId: prod.id, productName: prod.name }; }
    else if (addType === "has_sale_service") { const svc = services.find(s => s.id === addServiceId) ?? services[0]; if (!svc) return; filter = { type: "has_sale_service", serviceId: svc.id, serviceName: svc.name }; }
    else if (addType === "has_appointment_recent") { filter = { type: "has_appointment_recent", days: Number(addDays) || 30 }; }
    else { filter = { type: addType } as WaAudienceFilter; }
    if (filter) onChange([...filters, filter]);
  };

  const currentPipeline = pipelines.find(p => p.id === addPipeId) ?? pipelines[0];

  return (
    <div className="space-y-3">
      {filters.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f, idx) => (
            <span key={idx} className="inline-flex items-center gap-1.5 bg-primary/8 border border-primary/20 text-primary px-2.5 py-1 rounded-full text-[11px] font-medium">
              {filterLabel(f)}
              <button type="button" onClick={() => onChange(filters.filter((_, i) => i !== idx))} className="hover:text-destructive transition-colors"><XCircle size={12} /></button>
            </span>
          ))}
        </div>
      )}
      <div className="rounded-xl border border-dashed border-border p-3 space-y-2 bg-muted/20">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Agregar filtro</p>
        <div className="flex flex-wrap gap-2">
          <select value={addType} onChange={e => setAddType(e.target.value as FilterType)} className="h-8 px-2 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/30">
            {Object.entries(FILTER_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {addType === "tag" && tags.length > 0 && <select value={addTag || tags[0]} onChange={e => setAddTag(e.target.value)} className="h-8 px-2 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/30">{tags.map((t: string) => <option key={t} value={t}>{t}</option>)}</select>}
          {addType === "wa_label" && waLabels.length > 0 && <select value={addLabelId || waLabels[0]?.id} onChange={e => setAddLabelId(e.target.value)} className="h-8 px-2 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/30">{waLabels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>}
          {addType === "pipeline_stage" && (<>{pipelines.length > 0 && <select value={addPipeId || pipelines[0]?.id} onChange={e => { setAddPipeId(e.target.value); setAddPipeStage(""); }} className="h-8 px-2 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/30">{pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}{currentPipeline?.column_names?.length > 0 && <select value={addPipeStage || currentPipeline.column_names[0]} onChange={e => setAddPipeStage(e.target.value)} className="h-8 px-2 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/30">{currentPipeline.column_names.map((s: string) => <option key={s} value={s}>{s}</option>)}</select>}</>)}
          {addType === "has_sale_product" && products.length > 0 && <select value={addProductId || products[0]?.id} onChange={e => setAddProductId(e.target.value)} className="h-8 px-2 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/30 flex-1 min-w-0">{products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}
          {addType === "has_sale_service" && services.length > 0 && <select value={addServiceId || services[0]?.id} onChange={e => setAddServiceId(e.target.value)} className="h-8 px-2 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/30 flex-1 min-w-0">{services.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>}
          {addType === "has_appointment_recent" && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><input type="number" min={1} max={365} value={addDays} onChange={e => setAddDays(e.target.value)} className="w-16 h-8 px-2 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/30 text-center" /><span>días</span></div>}
          <button type="button" onClick={handleAdd} className="h-8 px-3 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors flex items-center gap-1"><Plus size={12} /> Agregar</button>
        </div>
      </div>
    </div>
  );
}

function StepAudience({ audienceType, filters, contacts, onTypeChange, onFiltersChange }: { audienceType: "all" | "include" | "exclude"; filters: WaAudienceFilter[]; contacts: any[]; onTypeChange: (t: "all" | "include" | "exclude") => void; onFiltersChange: (f: WaAudienceFilter[]) => void }) {
  const estimated = estimateAudience(contacts, audienceType, filters);
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">¿A quiénes enviar?</p>
        <div className="space-y-1.5">
          {(["all", "include", "exclude"] as const).map(t => (
            <label key={t} className={`flex items-start gap-2.5 cursor-pointer p-2.5 rounded-xl border transition-all hover:bg-muted/20 ${audienceType === t ? "border-primary/50 bg-primary/5" : "border-border"}`}>
              <input type="radio" name="audienceType" value={t} checked={audienceType === t} onChange={() => { onTypeChange(t); if (t === "all") onFiltersChange([]); }} className="mt-0.5 accent-primary shrink-0" />
              <div>
                <p className="text-sm font-medium">{t === "all" ? "Todos los contactos" : t === "include" ? "Solo incluir a..." : "Todos menos..."}</p>
                <p className="text-[11px] text-muted-foreground">{t === "all" ? "Todos los contactos con número de WhatsApp." : t === "include" ? "Solo los contactos que cumplan al menos uno de los filtros." : "Todos excepto los que cumplan al menos uno de los filtros."}</p>
              </div>
            </label>
          ))}
        </div>
      </div>
      {audienceType !== "all" && <FilterBuilder filters={filters} onChange={onFiltersChange} />}
      <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/30 border border-border">
        <Users size={14} className="text-primary shrink-0" />
        <p className="text-xs text-muted-foreground">Audiencia estimada: <strong className="text-foreground">{estimated} contacto{estimated !== 1 ? "s" : ""}</strong>{audienceType !== "all" && filters.some(f => f.type !== "tag") && <span className="text-muted-foreground/60"> (estimado; filtros DB se calculan al enviar)</span>}</p>
      </div>
    </div>
  );
}

function StepReview({ template, varMap, audienceType, filters, campaignName, onNameChange, contacts }: { template: CrmWaTemplate; varMap: WaVarMap; audienceType: "all" | "include" | "exclude"; filters: WaAudienceFilter[]; campaignName: string; onNameChange: (n: string) => void; contacts: any[] }) {
  const estimated = estimateAudience(contacts, audienceType, filters);
  const previewContact = contacts.find(c => c.phone?.trim()) ?? { name: "Juan Pérez", email: "juan@ejemplo.com", phone: "59170000000", company: "Mi Empresa" };
  const varNums = extractVarNums(template.body_text);
  let previewText = template.body_text;
  for (const num of varNums) {
    const entry = varMap[String(num)];
    let val = `{{${num}}}`;
    if (entry?.source === "contact_field") val = (previewContact as any)[entry.field] ?? val;
    else if (entry?.source === "fixed") val = entry.value || val;
    else if (entry?.source === "product_field") val = entry.entityName || val;
    else if (entry?.source === "service_field") val = entry.entityName || val;
    else if (entry?.source === "course_field")  val = entry.entityName || val;
    previewText = previewText.replace(`{{${num}}}`, val);
  }
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="text-xs font-semibold text-muted-foreground">Nombre de la campaña *</label>
        <input value={campaignName} onChange={e => onNameChange(e.target.value)} placeholder="ej. Promoción junio 2025" className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
      </div>
      <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2 text-xs">
        <div className="flex justify-between"><span className="text-muted-foreground">Plantilla</span><span className="font-mono font-semibold">{template.name}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Audiencia</span><span className="font-medium">{audienceType === "all" ? "Todos los contactos" : audienceType === "include" ? `Solo incluir (${filters.length} filtro${filters.length !== 1 ? "s" : ""})` : `Todos menos (${filters.length} filtro${filters.length !== 1 ? "s" : ""})`}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Contactos estimados</span><span className="font-bold text-primary">{estimated}</span></div>
      </div>
      <div className="space-y-1.5">
        <p className="text-[11px] text-muted-foreground font-medium">Vista previa con datos del primer contacto:</p>
        <div className="rounded-xl bg-[#e5ddd5] dark:bg-[#1a1a2e] p-3">
          <div className="bg-white dark:bg-[#202c33] rounded-xl px-3 py-2.5 shadow-sm">
            <p className="text-sm whitespace-pre-wrap leading-snug">{previewText}</p>
          </div>
          {(template.buttons ?? []).length > 0 && (
            <div className="mt-1 space-y-1">
              {template.buttons.map((b: any, i: number) => (
                <div key={i} className="bg-white dark:bg-[#202c33] rounded-xl px-3 py-1.5 text-center">
                  <span className="text-xs text-[#0a7bcd] font-medium">{b.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30">
        <AlertCircle size={13} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">Se enviará un mensaje de WhatsApp a cada contacto de la audiencia. Esta acción tiene costo por conversación según las tarifas de Meta. Una vez iniciada, no se puede cancelar.</p>
      </div>
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

function TemplateCampaignsSection() {
  const { user } = useCurrentUser();
  const { data: campaigns = [], isLoading, refetch } = useWaCampaigns();
  const createCampaign = useCreateWaCampaign();
  const deleteCampaign = useDeleteWaCampaign();
  const { data: contacts = [] } = useContacts();

  const [building, setBuilding] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [step, setStep]             = useState(0);
  const [selTemplate, setSelTemplate] = useState<CrmWaTemplate | null>(null);
  const [varMap, setVarMap]         = useState<WaVarMap>({});
  const [audienceType, setAudienceType] = useState<"all" | "include" | "exclude">("all");
  const [filters, setFilters]       = useState<WaAudienceFilter[]>([]);
  const [campName, setCampName]     = useState("");
  const [sending, setSending]       = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const resetBuilder = () => { setStep(0); setSelTemplate(null); setVarMap({}); setAudienceType("all"); setFilters([]); setCampName(""); setSending(false); };

  const canNext = () => {
    if (step === 0) return !!selTemplate;
    if (step === 1) { if (!selTemplate) return false; const nums = extractVarNums(selTemplate.body_text); return nums.every(n => { const e = varMap[String(n)]; if (!e) return false; if (e.source === "fixed" && !e.value.trim()) return false; return true; }); }
    if (step === 2) return audienceType === "all" || filters.length > 0;
    if (step === 3) return !!campName.trim();
    return false;
  };

  const handleSend = async () => {
    if (!selTemplate || !campName.trim()) return;
    setSending(true);
    try {
      const campaign = await createCampaign.mutateAsync({ template_id: selTemplate.id, name: campName.trim(), variable_map: varMap, audience_type: audienceType, audience_filters: filters });
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-wa-campaign`, { method: "POST", headers: { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ campaign_id: campaign.id }) });
      const js = await res.json();
      if (js.ok) { toast.success(`Enviado: ${js.sent} enviados, ${js.failed} fallidos de ${js.total}`); refetch(); setBuilding(false); resetBuilder(); setDetailId(campaign.id); }
      else { toast.error(js.error === "waba_not_configured" ? "Configura tu WABA en la sección Conexión" : js.error === "already_processed" ? "Esta campaña ya fue procesada" : js.error ?? "Error al enviar", { duration: 8000 }); }
    } catch { toast.error("Error de conexión"); }
    finally { setSending(false); }
  };

  const detailCampaign = useMemo(() => campaigns.find(c => c.id === detailId), [campaigns, detailId]);
  if (detailCampaign) return <CampaignDetail campaign={detailCampaign} onBack={() => setDetailId(null)} />;

  if (building) return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => { setBuilding(false); resetBuilder(); }} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"><ArrowLeft size={14} /></button>
        <h2 className="text-sm font-semibold">Nueva campaña de plantilla</h2>
      </div>
      <StepBar current={step} />
      {step === 0 && <StepTemplate selected={selTemplate} onSelect={t => { setSelTemplate(t); setVarMap({}); }} />}
      {step === 1 && selTemplate && <StepVariables template={selTemplate} varMap={varMap} onChange={setVarMap} />}
      {step === 2 && <StepAudience audienceType={audienceType} filters={filters} contacts={contacts} onTypeChange={t => { setAudienceType(t); if (t === "all") setFilters([]); }} onFiltersChange={setFilters} />}
      {step === 3 && selTemplate && <StepReview template={selTemplate} varMap={varMap} audienceType={audienceType} filters={filters} campaignName={campName} onNameChange={setCampName} contacts={contacts} />}
      <div className="flex gap-2 pt-2 border-t">
        {step > 0 && <button type="button" onClick={() => setStep(s => s - 1 as any)} className="flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"><ChevronLeft size={14} /> Anterior</button>}
        <div className="flex-1" />
        {step < 3 ? (
          <button type="button" onClick={() => setStep(s => s + 1 as any)} disabled={!canNext()} className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40">Siguiente <ChevronRight size={14} /></button>
        ) : (
          <button type="button" onClick={handleSend} disabled={!canNext() || sending} className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-40">
            {sending ? <><Loader2 size={13} className="animate-spin" /> Enviando...</> : <><Send size={13} /> Enviar campaña</>}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Campañas con plantilla</p>
          <p className="text-xs text-muted-foreground">{campaigns.length} campaña{campaigns.length !== 1 ? "s" : ""} · Solo plantillas Marketing aprobadas</p>
        </div>
        <button type="button" onClick={() => { setBuilding(true); resetBuilder(); }} className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1.5"><Plus size={12} /> Nueva</button>
      </div>
      {isLoading ? (
        <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : !campaigns.length ? (
        <div className="text-center py-12 space-y-2"><Megaphone size={28} className="mx-auto text-muted-foreground/30" /><p className="text-sm text-muted-foreground">Aún no has enviado ninguna campaña</p></div>
      ) : (
        <div className="space-y-2">
          {campaigns.map(c => (
            <div key={c.id} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap"><span className="text-sm font-medium truncate">{c.name}</span>{statusBadge(c.status)}</div>
                  <p className="text-xs text-muted-foreground mt-0.5"><span className="font-mono">{c.crm_wa_templates?.name ?? "—"}</span>{c.total_contacts != null && <> · {c.sent_count}/{c.total_contacts} enviados{c.failed_count > 0 && `, ${c.failed_count} fallidos`}</>}{" · "}{relativeTime(c.created_at)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {(c.status === "completed" || c.status === "failed" || c.status === "processing") && <button type="button" onClick={() => setDetailId(c.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Ver detalle"><Eye size={13} /></button>}
                  {c.status === "draft" && <button type="button" onClick={() => setDeleteTarget({ id: c.id, name: c.name })} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 size={13} /></button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => { if (!open) setDeleteTarget(null); }}
        description={`Se eliminará la campaña "${deleteTarget?.name}" permanentemente.`}
        isPending={deleteCampaign.isPending}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteCampaign.mutateAsync(deleteTarget.id);
          setDeleteTarget(null);
          toast.success("Campaña eliminada");
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── SECCIÓN 2: DENTRO DE 24H (Mensajes libres) ────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// ── Country / Timezone data ───────────────────────────────────────────────────

const PHONE_TIMEZONE: Record<string, string> = {
  "1":"America/New_York","52":"America/Mexico_City","34":"Europe/Madrid",
  "57":"America/Bogota","54":"America/Argentina/Buenos_Aires","55":"America/Sao_Paulo",
  "56":"America/Santiago","51":"America/Lima","58":"America/Caracas",
  "591":"America/La_Paz",
  "593":"America/Guayaquil","595":"America/Asuncion","598":"America/Montevideo",
  "502":"America/Guatemala","503":"America/El_Salvador","504":"America/Tegucigalpa",
  "505":"America/Managua","506":"America/Costa_Rica","507":"America/Panama",
  "53":"America/Havana",
  "44":"Europe/London","33":"Europe/Paris","49":"Europe/Berlin","39":"Europe/Rome",
  "351":"Europe/Lisbon","31":"Europe/Amsterdam","61":"Australia/Sydney",
  "64":"Pacific/Auckland","81":"Asia/Tokyo","82":"Asia/Seoul","86":"Asia/Shanghai",
  "91":"Asia/Kolkata","971":"Asia/Dubai","972":"Asia/Jerusalem","966":"Asia/Riyadh",
  "20":"Africa/Cairo","27":"Africa/Johannesburg","234":"Africa/Lagos",
};

const COUNTRY_INFO: Record<string, { name: string; flag: string }> = {
  "1":  { name: "USA/Canadá",       flag: "🇺🇸" },
  "52": { name: "México",           flag: "🇲🇽" },
  "34": { name: "España",           flag: "🇪🇸" },
  "57": { name: "Colombia",         flag: "🇨🇴" },
  "54": { name: "Argentina",        flag: "🇦🇷" },
  "55": { name: "Brasil",           flag: "🇧🇷" },
  "56": { name: "Chile",            flag: "🇨🇱" },
  "51": { name: "Perú",             flag: "🇵🇪" },
  "58": { name: "Venezuela",        flag: "🇻🇪" },
  "591":{ name: "Bolivia",           flag: "🇧🇴" },
  "593":{ name: "Ecuador",          flag: "🇪🇨" },
  "595":{ name: "Paraguay",         flag: "🇵🇾" },
  "598":{ name: "Uruguay",          flag: "🇺🇾" },
  "502":{ name: "Guatemala",        flag: "🇬🇹" },
  "503":{ name: "El Salvador",      flag: "🇸🇻" },
  "504":{ name: "Honduras",         flag: "🇭🇳" },
  "505":{ name: "Nicaragua",        flag: "🇳🇮" },
  "506":{ name: "Costa Rica",       flag: "🇨🇷" },
  "507":{ name: "Panamá",           flag: "🇵🇦" },
  "53": { name: "Cuba",             flag: "🇨🇺" },
  "44": { name: "Reino Unido",      flag: "🇬🇧" },
  "33": { name: "Francia",          flag: "🇫🇷" },
  "49": { name: "Alemania",         flag: "🇩🇪" },
  "39": { name: "Italia",           flag: "🇮🇹" },
  "351":{ name: "Portugal",         flag: "🇵🇹" },
  "31": { name: "Países Bajos",     flag: "🇳🇱" },
  "61": { name: "Australia",        flag: "🇦🇺" },
  "64": { name: "Nueva Zelanda",    flag: "🇳🇿" },
  "81": { name: "Japón",            flag: "🇯🇵" },
  "82": { name: "Corea del Sur",    flag: "🇰🇷" },
  "86": { name: "China",            flag: "🇨🇳" },
  "91": { name: "India",            flag: "🇮🇳" },
  "971":{ name: "Emiratos Árabes",  flag: "🇦🇪" },
  "972":{ name: "Israel",           flag: "🇮🇱" },
  "966":{ name: "Arabia Saudita",   flag: "🇸🇦" },
  "20": { name: "Egipto",           flag: "🇪🇬" },
  "27": { name: "Sudáfrica",        flag: "🇿🇦" },
  "234":{ name: "Nigeria",          flag: "🇳🇬" },
};

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

function getPhonePrefix(phone: string): string {
  const d = phone.replace(/\D/g, "");
  for (const len of [3, 2, 1]) {
    const p = d.slice(0, len);
    if (PHONE_TIMEZONE[p]) return p;
  }
  return "unknown";
}

// Converts "YYYY-MM-DD"+"HH:MM" in a given IANA timezone to a UTC ISO string
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

const INSTANT_STEPS = ["Mensaje", "Audiencia", "Programación", "Confirmar"];
function InstantStepBar({ current }: { current: number }) {
  return (
    <div className="mb-5 space-y-2">
      {/* Circles + connectors — siempre en una fila sin texto para evitar desbordamiento */}
      <div className="flex items-center">
        {INSTANT_STEPS.map((_, idx) => (
          <div key={idx} className="flex items-center flex-1 last:flex-none">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all ${
              idx < current  ? "bg-primary text-primary-foreground" :
              idx === current ? "border-2 border-primary text-primary bg-background" :
                               "border border-muted-foreground/30 text-muted-foreground/40 bg-background"
            }`}>
              {idx < current ? <CheckCircle2 size={11} /> : idx + 1}
            </div>
            {idx < INSTANT_STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-1 ${idx < current ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>
      {/* Solo el nombre del paso actual — sin truncar nada */}
      <p className="text-[11px] text-center">
        <span className="font-semibold text-foreground">{INSTANT_STEPS[current]}</span>
        <span className="text-muted-foreground"> · {current + 1} de {INSTANT_STEPS.length}</span>
      </p>
    </div>
  );
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
      <div className="rounded-xl border border-border bg-muted/20 p-3">
        <p className="text-[10px] text-muted-foreground mb-1 font-medium">Mensaje enviado</p>
        <p className="text-sm whitespace-pre-wrap">{campaign.message_text}</p>
      </div>
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
    } catch (e: any) {
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
            <p className="text-xs font-medium truncate">{label.charAt(0).toUpperCase() + label.slice(1)} subido</p>
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
          {uploading
            ? <Loader2 size={20} className="animate-spin" />
            : <Upload size={20} />}
          <span className="text-xs">{uploading ? "Subiendo..." : `Seleccionar ${label}`}</span>
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function InstantCampaignsSection() {
  const { user } = useCurrentUser();
  const { data: campaigns = [], isLoading, refetch } = useInstantCampaigns();
  const { data: waLabels = [] } = useWaLabels();
  const { data: businessProfile } = useBusinessProfile();
  const createCampaign = useCreateInstantCampaign();
  const deleteCampaign = useDeleteInstantCampaign();

  const [building, setBuilding]   = useState(false);
  const [detailId, setDetailId]   = useState<string | null>(null);
  const [step, setStep]           = useState(0);
  const [sending, setSending]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  // Step 0: Mensaje
  const [campName, setCampName]       = useState("");
  const [msgText, setMsgText]         = useState("");
  const [mediaType, setMediaType]     = useState<"none" | "image" | "video" | "audio">("none");
  const [mediaUrl, setMediaUrl]       = useState("");

  // Step 1: Audiencia
  const [windowHours, setWindowHours]         = useState(23);
  const [selCountryCodes, setSelCountryCodes] = useState<string[]>([]);
  const [selLabelIds, setSelLabelIds]         = useState<string[]>([]);

  // Step 2: Programación
  const [sendMode, setSendMode] = useState<"instant" | "scheduled">("instant");
  const [schedDate, setSchedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [schedTime, setSchedTime] = useState("10:00");
  const [tzMode, setTzMode]       = useState<"user" | "contact">("user");
  const [userTz, setUserTz]       = useState("UTC");

  // Sync userTz with business profile timezone once loaded
  useEffect(() => {
    if (businessProfile?.timezone) setUserTz(businessProfile.timezone);
  }, [businessProfile?.timezone]);

  // Active conversations (with label_ids) for live filtering
  const { data: activeConvs = [] } = useWaActiveConversations(windowHours);

  // Countries with at least one active conversation
  const availableCountries = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of activeConvs) {
      const prefix = getPhonePrefix(c.phone);
      if (prefix !== "unknown" && COUNTRY_INFO[prefix]) {
        counts[prefix] = (counts[prefix] ?? 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([prefix, count]) => ({ prefix, count, ...COUNTRY_INFO[prefix] }));
  }, [activeConvs]);

  // Live filtered count reflecting both country AND label filters
  const filteredConvs = useMemo((): ActiveConv[] => {
    let result = activeConvs;
    if (selCountryCodes.length > 0) {
      result = result.filter(c => selCountryCodes.includes(getPhonePrefix(c.phone)));
    }
    if (selLabelIds.length > 0) {
      result = result.filter(c => selLabelIds.some(lid => c.label_ids.includes(lid)));
    }
    return result;
  }, [activeConvs, selCountryCodes, selLabelIds]);

  // Human-readable audience summary for the counter line
  const audienceSummary = useMemo(() => {
    const total = activeConvs.length;
    const filtered = filteredConvs.length;
    if (total === 0) return "Sin conversaciones activas en esta ventana";
    const countPart = <><span className="font-semibold text-foreground">{filtered}</span>{filtered !== total ? <span className="text-muted-foreground/60"> de {total}</span> : null}</>;
    // Show country hint when no country filter and only one country exists
    const countryHint = selCountryCodes.length === 0 && availableCountries.length === 1
      ? ` · ${availableCountries[0].flag} ${availableCountries[0].name}`
      : selCountryCodes.length > 0
        ? ` · ${selCountryCodes.map(cc => COUNTRY_INFO[cc]?.flag).join(" ")}`
        : "";
    const labelHint = selLabelIds.length > 0 ? " · etiquetas (OR)" : "";
    return <>{countPart} conversaciones activas{countryHint}{labelHint}</>;
  }, [activeConvs, filteredConvs, selCountryCodes, selLabelIds, availableCountries]);

  const audienceType = useMemo((): "all" | "labels" | "countries" | "combined" => {
    const hasLabels = selLabelIds.length > 0;
    const hasCountries = selCountryCodes.length > 0;
    if (hasLabels && hasCountries) return "combined";
    if (hasLabels) return "labels";
    if (hasCountries) return "countries";
    return "all";
  }, [selLabelIds, selCountryCodes]);

  // True when the scheduled date+time is in the past (blocks Next / Submit)
  const schedInPast = useMemo(() => {
    if (sendMode !== "scheduled" || !schedDate || !schedTime) return false;
    try {
      return new Date(toUtcIso(schedDate, schedTime, userTz)) <= new Date();
    } catch { return false; }
  }, [sendMode, schedDate, schedTime, userTz]);

  // Timezone options: ensure business profile tz is always selectable
  const tzOptions = useMemo(() => {
    const inList = TIMEZONES.some(t => t.value === userTz);
    if (inList || !businessProfile?.timezone) return TIMEZONES;
    return [{ value: businessProfile.timezone, label: `Tu negocio (${businessProfile.timezone})` }, ...TIMEZONES];
  }, [businessProfile?.timezone, userTz]);

  const resetBuilder = () => {
    setStep(0); setCampName(""); setMsgText(""); setWindowHours(23);
    setMediaType("none"); setMediaUrl("");
    setSelCountryCodes([]); setSelLabelIds([]);
    setSendMode("instant"); setSchedDate(new Date().toISOString().slice(0, 10));
    setSchedTime("10:00"); setTzMode("user"); setSending(false);
    setUserTz(businessProfile?.timezone ?? "UTC");
  };

  const canNext = () => {
    if (step === 0) {
      if (!campName.trim()) return false;
      if (mediaType === "none") return msgText.trim().length >= 5;
      if (!mediaUrl.trim()) return false;
      return true; // image/video caption optional; audio no text needed
    }
    if (step === 1) return true;
    if (step === 2) {
      if (sendMode === "instant") return true;
      if (!schedDate || !schedTime) return false;
      return !schedInPast;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!campName.trim()) return;
    if (mediaType === "none" && msgText.trim().length < 5) return;
    if (mediaType !== "none" && !mediaUrl.trim()) return;
    if (sendMode === "scheduled" && schedInPast) {
      toast.error("La hora programada ya pasó. Elige una hora futura.", { duration: 6000 });
      return;
    }
    setSending(true);
    try {
      let scheduledAt: string | null = null;
      let targetDate: string | null = null;
      let targetLocalTime: string | null = null;
      let status: CrmWaInstantCampaign["status"] = "draft";

      if (sendMode === "scheduled") {
        if (tzMode === "user") {
          scheduledAt = toUtcIso(schedDate, schedTime, userTz);
        } else {
          // Mode B: store target date+time; scheduler computes per-tz UTC
          targetDate = schedDate;
          targetLocalTime = schedTime;
          // scheduled_at = start of that date (UTC) so scheduler wakes up in time
          scheduledAt = `${schedDate}T00:00:00.000Z`;
        }
        status = "scheduled";
      }

      const campaign = await createCampaign.mutateAsync({
        name: campName.trim(),
        message_text: mediaType === "audio" ? "" : msgText.trim(),
        media_type: mediaType === "none" ? null : mediaType,
        media_url: mediaType === "none" ? null : mediaUrl.trim(),
        window_hours: windowHours,
        label_ids: selLabelIds,
        country_codes: selCountryCodes,
        audience_type: audienceType,
        send_mode: sendMode,
        timezone_mode: sendMode === "scheduled" ? tzMode : null,
        target_local_time: targetLocalTime,
        target_date: targetDate,
        user_timezone: sendMode === "scheduled" && tzMode === "user" ? userTz : null,
        scheduled_at: scheduledAt,
        status,
      });

      if (sendMode === "instant") {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-wa-instant`, {
          method: "POST",
          headers: { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ campaign_id: campaign.id }),
        });
        const js = await res.json();
        if (js.ok) {
          toast.success(`Envío completado: ${js.sent} enviados, ${js.failed} fallidos de ${js.total} conversaciones`);
          refetch();
          setBuilding(false);
          resetBuilder();
          setDetailId(campaign.id);
        } else {
          toast.error(
            js.error === "waba_not_configured" ? "Configura tu WABA en la sección Conexión"
            : js.error === "already_processed" ? "Esta campaña ya fue procesada"
            : js.error ?? "Error al enviar",
            { duration: 8000 },
          );
        }
      } else {
        toast.success("Campaña programada. Se enviará en el momento indicado.");
        refetch();
        setBuilding(false);
        resetBuilder();
      }
    } catch { toast.error("Error de conexión"); }
    finally { setSending(false); }
  };

  const detailCampaign = useMemo(() => campaigns.find(c => c.id === detailId), [campaigns, detailId]);
  if (detailCampaign) return <InstantCampaignDetail campaign={detailCampaign} onBack={() => setDetailId(null)} />;

  if (building) return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => { setBuilding(false); resetBuilder(); }} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"><ArrowLeft size={14} /></button>
        <h2 className="text-sm font-semibold">Nuevo envío dentro de 24h</h2>
      </div>
      <InstantStepBar current={step} />

      {/* ── Step 0: Mensaje ─────────────────────────────────────────────────── */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Nombre del envío *</label>
            <input value={campName} onChange={e => setCampName(e.target.value)} placeholder="ej. Seguimiento clientes activos"
              className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
          </div>

          {/* Media selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">Tipo de contenido</label>
            <div className="grid grid-cols-4 gap-1.5">
              {([
                { value: "none",  icon: <Send size={13} />,  label: "Solo texto" },
                { value: "image", icon: <Image size={13} />, label: "Imagen" },
                { value: "video", icon: <Video size={13} />, label: "Video" },
                { value: "audio", icon: <Mic size={13} />,   label: "Audio" },
              ] as const).map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => { setMediaType(opt.value); setMediaUrl(""); }}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                    mediaType === opt.value
                      ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/30"
                      : "border-border hover:border-primary/40 text-muted-foreground"
                  }`}
                >
                  {opt.icon}
                  <span className="text-[10px]">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Media upload */}
          {mediaType !== "none" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Archivo de {mediaType === "image" ? "imagen" : mediaType === "video" ? "video" : "audio"} *
              </label>
              <MediaUploadField
                mediaType={mediaType}
                value={mediaUrl}
                onChange={setMediaUrl}
                userId={user?.id ?? ""}
              />
            </div>
          )}

          {/* Mensaje / Caption */}
          {mediaType !== "audio" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                {mediaType === "none" ? "Mensaje a enviar *" : "Pie de foto / caption"} {mediaType !== "none" && <span className="font-normal">(opcional)</span>}
              </label>
              <textarea value={msgText} onChange={e => setMsgText(e.target.value)}
                rows={mediaType === "none" ? 5 : 3}
                placeholder={mediaType === "none"
                  ? "Hola! Queremos recordarte que...\n\nEscribe aquí tu mensaje libre. No necesita aprobación de Meta."
                  : "Escribe un pie de foto o descripción (opcional)..."}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none leading-relaxed" />
              {mediaType === "none" && <p className="text-[10px] text-muted-foreground">{msgText.length} caracteres · Límite sugerido: 1024</p>}
            </div>
          )}

          {/* Vista previa */}
          {(msgText.trim() || (mediaType !== "none" && mediaUrl.trim())) && (
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground font-medium">Vista previa:</p>
              <div className="rounded-xl bg-[#e5ddd5] dark:bg-[#1a1a2e] p-3">
                <div className="bg-white dark:bg-[#202c33] rounded-xl px-3 py-2.5 shadow-sm space-y-1.5">
                  {mediaType === "image" && mediaUrl.trim() && (
                    <img src={mediaUrl} alt="" className="w-full rounded-lg object-cover max-h-48" />
                  )}
                  {mediaType === "video" && mediaUrl.trim() && (
                    <div className="rounded-lg overflow-hidden bg-muted/30 flex items-center justify-center h-28 text-muted-foreground/50 text-xs border border-border/50">
                      <Video size={20} className="mr-1.5" /> video adjunto
                    </div>
                  )}
                  {mediaType === "audio" && mediaUrl.trim() && (
                    <div className="rounded-lg bg-muted/30 flex items-center gap-2 px-3 py-2 text-muted-foreground/70 text-xs border border-border/50">
                      <Mic size={14} /> nota de voz
                    </div>
                  )}
                  {msgText.trim() && <p className="text-sm whitespace-pre-wrap leading-snug">{msgText}</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 1: Audiencia ───────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-5">
          {/* Ventana */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">Ventana de actividad</label>
            <p className="text-[11px] text-muted-foreground/70">Solo se enviará a conversaciones donde el contacto haya escrito en las últimas {windowHours} horas.</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 space-y-1">
                <input type="range" min={1} max={23} step={1} value={windowHours}
                  onChange={e => setWindowHours(Number(e.target.value))} className="w-full accent-primary" />
                <div className="flex justify-between text-[10px] text-muted-foreground/60 px-0.5">
                  <span>1h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span>
                </div>
              </div>
              <span className="text-sm font-bold w-20 text-right shrink-0">Últimas {windowHours}h</span>
            </div>
            <p className="text-[11px] text-muted-foreground">{audienceSummary}</p>
          </div>

          {/* Filtro por País */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Globe size={12} className="text-muted-foreground" />
              <label className="text-xs font-semibold text-muted-foreground">Filtrar por país <span className="font-normal">(opcional)</span></label>
            </div>
            {availableCountries.length === 0 ? (
              activeConvs.length === 0
                ? <p className="text-[11px] text-muted-foreground/60 italic">No hay conversaciones activas en esta ventana.</p>
                : <p className="text-[11px] text-muted-foreground/60 italic">Los números de estos contactos no tienen prefijo internacional identificado.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableCountries.map(({ prefix, name, flag, count }) => {
                  const sel = selCountryCodes.includes(prefix);
                  return (
                    <button key={prefix} type="button"
                      onClick={() => setSelCountryCodes(prev => sel ? prev.filter(c => c !== prefix) : [...prev, prefix])}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${sel ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                      <span>{flag}</span>{name}
                      <span className={`text-[10px] ${sel ? "text-primary/70" : "text-muted-foreground/60"}`}>({count})</span>
                    </button>
                  );
                })}
              </div>
            )}
            {selCountryCodes.length > 0 && (
              <button type="button" onClick={() => setSelCountryCodes([])}
                className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline">
                Limpiar selección
              </button>
            )}
          </div>

          {/* Filtro por Etiqueta */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Tag size={12} className="text-muted-foreground" />
              <label className="text-xs font-semibold text-muted-foreground">Filtrar por etiqueta <span className="font-normal">(opcional)</span></label>
            </div>
            {waLabels.length === 0 ? (
              <p className="text-[11px] text-muted-foreground/60 italic">No tienes etiquetas creadas aún.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {waLabels.map(l => {
                  const sel = selLabelIds.includes(l.id);
                  return (
                    <button key={l.id} type="button"
                      onClick={() => setSelLabelIds(prev => sel ? prev.filter(id => id !== l.id) : [...prev, l.id])}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${sel ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                      <Tag size={10} style={{ color: l.color }} />{l.name}
                    </button>
                  );
                })}
              </div>
            )}
            {selCountryCodes.length > 0 && selLabelIds.length > 0 && (
              <p className="text-[11px] text-blue-600 dark:text-blue-400">Los filtros se combinan (AND): solo recibirán el mensaje quienes cumplan ambos.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Step 2: Programación ────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-5">
          {/* Enviar ahora vs Programar */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">¿Cuándo enviar?</p>
            <div className="grid grid-cols-2 gap-2">
              {(["instant", "scheduled"] as const).map(m => (
                <button key={m} type="button" onClick={() => setSendMode(m)}
                  className={`flex items-center justify-center gap-2 h-10 rounded-xl text-xs font-semibold border transition-all ${
                    sendMode === m
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                  }`}>
                  {m === "instant" ? <><Zap size={13} /> Enviar ahora</> : <><Calendar size={13} /> Programar</>}
                </button>
              ))}
            </div>
          </div>

          {sendMode === "scheduled" && (
            <>
              {/* Fecha y hora — grid para alineación exacta */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground">Fecha y hora</p>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <input type="date" value={schedDate} min={new Date().toLocaleDateString("en-CA")}
                    onChange={e => setSchedDate(e.target.value)}
                    className={`h-9 px-3 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all w-full ${schedInPast ? "border-destructive focus:border-destructive" : "border-border focus:border-primary"}`} />
                  <input type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)}
                    className={`h-9 px-3 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all w-32 ${schedInPast ? "border-destructive focus:border-destructive" : "border-border focus:border-primary"}`} />
                </div>
                {schedInPast && (
                  <p className="text-[11px] text-destructive flex items-center gap-1 mt-1">
                    <AlertCircle size={11} /> Esta hora ya pasó. Elige una fecha y hora futuras.
                  </p>
                )}
              </div>

              {/* Zona horaria — divs en lugar de labels para evitar conflicto con select interno */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground">Zona horaria del envío</p>
                <div className="space-y-2">

                  {/* Modo A: mi zona horaria */}
                  <div
                    onClick={() => setTzMode("user")}
                    className={`cursor-pointer p-3 rounded-xl border transition-all ${tzMode === "user" ? "border-primary/50 bg-primary/5" : "border-border hover:bg-muted/20"}`}>
                    <div className="flex items-start gap-2.5">
                      <div className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${tzMode === "user" ? "border-primary" : "border-muted-foreground/40"}`}>
                        {tzMode === "user" && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <p className="text-sm font-medium leading-none">Mi zona horaria</p>
                        <p className="text-[11px] text-muted-foreground">Todos reciben el mensaje al mismo instante.</p>
                      </div>
                    </div>
                    {tzMode === "user" && (
                      <div className="mt-2.5 ml-6 space-y-1.5" onClick={e => e.stopPropagation()}>
                        <select value={userTz} onChange={e => setUserTz(e.target.value)}
                          className="w-full h-9 px-2 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/30">
                          {tzOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        {schedDate && schedTime && (
                          <p className="text-[10px] text-primary font-medium">
                            Se envía el {schedDate} a las {schedTime} · {tzOptions.find(t => t.value === userTz)?.label ?? userTz}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Modo B: hora local de cada contacto */}
                  <div
                    onClick={() => setTzMode("contact")}
                    className={`cursor-pointer p-3 rounded-xl border transition-all ${tzMode === "contact" ? "border-primary/50 bg-primary/5" : "border-border hover:bg-muted/20"}`}>
                    <div className="flex items-start gap-2.5">
                      <div className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${tzMode === "contact" ? "border-primary" : "border-muted-foreground/40"}`}>
                        {tzMode === "contact" && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-sm font-medium leading-none">Hora local de cada contacto</p>
                        <p className="text-[11px] text-muted-foreground">
                          Cada persona recibe el mensaje a las {schedTime} de su propia zona horaria.
                        </p>
                        {tzMode === "contact" && availableCountries.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {(selCountryCodes.length > 0
                              ? availableCountries.filter(c => selCountryCodes.includes(c.prefix))
                              : availableCountries.slice(0, 5)
                            ).map(c => (
                              <span key={c.prefix} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
                                {c.flag} <span className="font-medium">{schedTime}</span>
                              </span>
                            ))}
                            {selCountryCodes.length === 0 && availableCountries.length > 5 && (
                              <span className="text-[10px] text-muted-foreground/60">+{availableCountries.length - 5} más</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Step 3: Confirmar ───────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3 text-xs">
            <div className="flex justify-between items-start gap-2">
              <span className="text-muted-foreground shrink-0">Nombre</span>
              <span className="font-semibold text-right">{campName}</span>
            </div>
            <div className="flex justify-between items-start gap-2">
              <span className="text-muted-foreground shrink-0">Ventana</span>
              <span className="font-semibold">Últimas {windowHours}h</span>
            </div>
            <div className="flex justify-between items-start gap-2">
              <span className="text-muted-foreground shrink-0">Países</span>
              <span className="font-semibold text-right">
                {selCountryCodes.length === 0 ? "Todos" : selCountryCodes.map(cc => `${COUNTRY_INFO[cc]?.flag} ${COUNTRY_INFO[cc]?.name}`).join(", ")}
              </span>
            </div>
            <div className="flex justify-between items-start gap-2">
              <span className="text-muted-foreground shrink-0">Etiquetas</span>
              <span className="font-semibold text-right">
                {selLabelIds.length === 0 ? "Todas" : selLabelIds.map(id => waLabels.find(l => l.id === id)?.name).filter(Boolean).join(", ")}
              </span>
            </div>
            <div className="flex justify-between items-start gap-2">
              <span className="text-muted-foreground shrink-0">Envío</span>
              <span className="font-semibold text-right">
                {sendMode === "instant" ? "Ahora" : tzMode === "contact"
                  ? `${schedDate} a las ${schedTime} (hora local de cada contacto)`
                  : `${schedDate} a las ${schedTime} (${TIMEZONES.find(t => t.value === userTz)?.label ?? userTz})`}
              </span>
            </div>
            <div className="flex justify-between items-start gap-2">
              <span className="text-muted-foreground shrink-0">Audiencia estimada</span>
              <span className="font-semibold">{filteredConvs.length} conversaciones activas</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground font-medium">Contenido:</p>
            <div className="rounded-xl bg-[#e5ddd5] dark:bg-[#1a1a2e] p-3">
              <div className="bg-white dark:bg-[#202c33] rounded-xl px-3 py-2.5 shadow-sm space-y-1.5">
                {mediaType === "image" && mediaUrl && (
                  <div className="rounded-lg bg-muted/30 flex items-center justify-center h-20 text-muted-foreground/50 text-xs border border-border/50">
                    <Image size={16} className="mr-1.5" /> imagen adjunta
                  </div>
                )}
                {mediaType === "video" && mediaUrl && (
                  <div className="rounded-lg bg-muted/30 flex items-center justify-center h-20 text-muted-foreground/50 text-xs border border-border/50">
                    <Video size={16} className="mr-1.5" /> video adjunto
                  </div>
                )}
                {mediaType === "audio" && mediaUrl && (
                  <div className="rounded-lg bg-muted/30 flex items-center gap-2 px-3 py-2 text-muted-foreground/70 text-xs border border-border/50">
                    <Mic size={12} /> nota de voz
                  </div>
                )}
                {msgText.trim() && <p className="text-sm whitespace-pre-wrap leading-snug">{msgText}</p>}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30">
            <Info size={13} className="text-blue-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-700 dark:text-blue-400 leading-relaxed">
              Este envío es <strong>gratuito</strong> para Meta (dentro de la ventana de 24h). La ventana se evalúa al momento del envío real.
            </p>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30">
            <AlertCircle size={13} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
              {sendMode === "instant"
                ? "Una vez iniciado el envío no se puede cancelar."
                : "Puedes cancelar la campaña programada desde la lista antes de que se ejecute."}
            </p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-2 pt-2 border-t">
        {step > 0 && (
          <button type="button" onClick={() => setStep(s => s - 1)}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
            <ChevronLeft size={14} /> Anterior
          </button>
        )}
        <div className="flex-1" />
        {step < 3 ? (
          <button type="button" onClick={() => setStep(s => s + 1)} disabled={!canNext()}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40">
            Siguiente <ChevronRight size={14} />
          </button>
        ) : sendMode === "instant" ? (
          <button type="button" onClick={handleSubmit} disabled={sending}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-40">
            {sending ? <><Loader2 size={13} className="animate-spin" /> Enviando...</> : <><Zap size={13} /> Enviar ahora</>}
          </button>
        ) : (
          <button type="button" onClick={handleSubmit} disabled={sending}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40">
            {sending ? <><Loader2 size={13} className="animate-spin" /> Guardando...</> : <><Calendar size={13} /> Programar</>}
          </button>
        )}
      </div>
    </div>
  );

  // ── Campaign list ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Envíos dentro de 24h</p>
          <p className="text-xs text-muted-foreground">{campaigns.length} envío{campaigns.length !== 1 ? "s" : ""} · Mensajes libres a conversaciones activas</p>
        </div>
        <button type="button" onClick={() => { setBuilding(true); resetBuilder(); }}
          className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1.5">
          <Plus size={12} /> Nuevo
        </button>
      </div>
      {isLoading ? (
        <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : !campaigns.length ? (
        <div className="text-center py-12 space-y-2">
          <Zap size={28} className="mx-auto text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Sin envíos todavía</p>
          <p className="text-xs text-muted-foreground/70">Envía mensajes libres a tus conversaciones activas sin necesidad de plantilla</p>
        </div>
      ) : (
        <div className="space-y-2">
          {campaigns.map(c => (
            <div key={c.id} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-medium truncate">{c.name}</span>
                    {statusBadge(c.status)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Ventana: {c.window_hours}h
                    {c.country_codes?.length > 0 && ` · ${c.country_codes.map(cc => COUNTRY_INFO[cc]?.flag ?? cc).join(" ")}`}
                    {c.label_ids?.length > 0 && ` · ${c.label_ids.length} etiqueta${c.label_ids.length !== 1 ? "s" : ""}`}
                    {c.status === "scheduled" && c.scheduled_at && ` · Programado: ${new Date(c.scheduled_at).toLocaleDateString("es-ES")} ${new Date(c.scheduled_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`}
                    {c.total_contacts != null && ` · ${c.sent_count}/${c.total_contacts} enviados`}
                    {" · "}{relativeTime(c.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {(c.status === "completed" || c.status === "failed" || c.status === "processing") && (
                    <button type="button" onClick={() => setDetailId(c.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                      <Eye size={13} />
                    </button>
                  )}
                  {c.status !== "processing" && (
                    <button type="button"
                      onClick={() => setDeleteTarget({ id: c.id, name: c.name })}
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
        description={`Se eliminará la campaña "${deleteTarget?.name}" permanentemente.`}
        isPending={deleteCampaign.isPending}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteCampaign.mutateAsync(deleteTarget.id);
          setDeleteTarget(null);
          toast.success("Campaña eliminada");
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── COMPONENTE PRINCIPAL: Envío Masivo con 2 tabs ─────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

export default function CrmWaCampaigns() {
  const [activeTab, setActiveTab] = useState<"pasado24" | "dentro24" | "automatizar">("pasado24");

  return (
    <div className="space-y-4">
      {/* Explicación de la regla META */}
      {activeTab !== "automatizar" && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-secondary/40 border border-border">
          <Info size={13} className="text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Regla de 24h de Meta:</strong> Si un contacto te escribió en las últimas 24h, puedes responderle con cualquier mensaje (gratis). Pasado ese tiempo, solo puedes contactarlos usando <strong>plantillas aprobadas</strong> por Meta (con costo por conversación).
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="grid grid-cols-3 bg-muted/50 rounded-2xl border border-border p-1 gap-1">
        {([
          { id: "pasado24",    icon: <Megaphone size={16} />, label: "Pasado 24h",   sub: "Plantillas" },
          { id: "dentro24",   icon: <Zap size={16} />,       label: "Dentro 24h",   sub: "Mensajes libres" },
          { id: "automatizar",icon: <Bot size={16} />,        label: "Automatizar",  sub: "Secuencias auto" },
        ] as const).map(tab => (
          <button
            key={tab.id} type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center gap-1 py-3 rounded-xl transition-all ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/60"
            }`}
          >
            {tab.icon}
            <span className="text-[11px] font-semibold leading-none">{tab.label}</span>
            <span className={`text-[9px] leading-none ${activeTab === tab.id ? "text-primary-foreground/70" : "text-muted-foreground/60"}`}>{tab.sub}</span>
          </button>
        ))}
      </div>

      {/* Tab: Pasado 24h */}
      {activeTab === "pasado24" && (
        <div>
          <p className="text-[11px] text-muted-foreground/70 mb-3">Envío masivo usando plantillas aprobadas por Meta. Útil para reactivar contactos que no han escrito recientemente.</p>
          <TemplateCampaignsSection />
        </div>
      )}

      {/* Tab: Dentro de 24h */}
      {activeTab === "dentro24" && (
        <div>
          <p className="text-[11px] text-muted-foreground/70 mb-3">Envío libre a conversaciones activas. No requiere plantilla ni aprobación. Solo aplica mientras el contacto esté dentro de la ventana de 24h.</p>
          <InstantCampaignsSection />
        </div>
      )}

      {/* Tab: Automatizar */}
      {activeTab === "automatizar" && <CrmWaAutomations />}
    </div>
  );
}
