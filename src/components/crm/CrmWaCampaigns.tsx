import { useState, useMemo } from "react";
import {
  Plus, Trash2, Send, ChevronRight, ChevronLeft, CheckCircle2,
  XCircle, Clock, Loader2, Users, Filter, LayoutList, Eye,
  ArrowLeft, AlertCircle, Tag, Megaphone,
} from "lucide-react";
import { toast } from "sonner";
import {
  useWaTemplates, useWaCampaigns, useCreateWaCampaign,
  useDeleteWaCampaign, useWaCampaignLogs,
  useProducts, useServices, useCourses,
  usePipelines, useWaLabels, useAllContactTags, useContacts,
} from "@/hooks/useCrmData";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/useAuth";
import type {
  CrmWaCampaign, CrmWaCampaignLog, CrmWaTemplate,
  WaVarMap, WaVarSource, WaAudienceFilter,
} from "@/lib/supabase";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return "hace un momento";
  if (diff < 3600)  return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

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

// ─── Client-side audience estimation ─────────────────────────────────────────

function estimateAudience(
  contacts: any[],
  audienceType: string,
  filters: WaAudienceFilter[],
): number {
  const withPhone = contacts.filter(c => c.phone?.trim());
  if (audienceType === "all" || !filters.length) return withPhone.length;

  // Can only estimate tag filter client-side (other filters need DB queries)
  // For non-tag filters we show the full count as an upper bound
  const tagFilters = filters.filter(f => f.type === "tag") as Extract<WaAudienceFilter, { type: "tag" }>[];
  const hasOtherFilters = filters.some(f => f.type !== "tag");

  if (tagFilters.length === 0 && hasOtherFilters) return withPhone.length;

  const matchingIds = new Set<string>();
  for (const f of tagFilters) {
    withPhone.forEach(c => { if ((c.tags ?? []).includes(f.value)) matchingIds.add(c.id); });
  }

  return audienceType === "include" ? matchingIds.size : withPhone.length - matchingIds.size;
}

// ─── Step indicator ───────────────────────────────────────────────────────────

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
          {idx < STEPS.length - 1 && (
            <div className={`flex-1 h-px mx-1 ${idx < current ? "bg-primary" : "bg-border"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Step 1: Template selection ───────────────────────────────────────────────

function StepTemplate({
  selected,
  onSelect,
}: { selected: CrmWaTemplate | null; onSelect: (t: CrmWaTemplate) => void }) {
  const { data: templates = [], isLoading } = useWaTemplates("remarketing");
  const approved = templates.filter(t => t.local_status === "APPROVED");

  if (isLoading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 size={20} className="animate-spin text-muted-foreground/50" />
    </div>
  );

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
        <button
          key={t.id}
          type="button"
          onClick={() => onSelect(t)}
          className={`w-full text-left p-3 rounded-xl border transition-all ${
            selected?.id === t.id
              ? "border-primary bg-primary/5 ring-1 ring-primary/30"
              : "border-border hover:border-primary/40 hover:bg-muted/30"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold font-mono">{t.name}</span>
            <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full font-semibold">
              APROBADA
            </span>
            <span className="text-[10px] text-muted-foreground">{t.language}</span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{t.body_text}</p>
        </button>
      ))}
    </div>
  );
}

// ─── Step 2: Variable mapping ──────────────────────────────────────────────────

const CONTACT_FIELD_LABELS: Record<string, string> = {
  name:    "Nombre completo",
  email:   "Email",
  phone:   "Teléfono",
  company: "Empresa",
};

function VarSourceSelector({
  varNum,
  label,
  value,
  onChange,
}: {
  varNum: number;
  label: string;
  value: WaVarSource | undefined;
  onChange: (v: WaVarSource) => void;
}) {
  const { data: products = [] } = useProducts();
  const { data: services = [] } = useServices();
  const { data: courses  = [] } = useCourses();

  const source = value?.source ?? "contact_field";

  return (
    <div className="space-y-1.5 p-3 rounded-xl bg-muted/30 border border-border">
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-[11px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
          {`{{${varNum}}}`}
        </span>
        {label && <span className="text-[10px] text-muted-foreground italic">ej: {label}</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {/* Source type */}
        <select
          value={source}
          onChange={e => {
            const s = e.target.value;
            if (s === "contact_field") onChange({ source: "contact_field", field: "name" });
            else if (s === "fixed")    onChange({ source: "fixed", value: "" });
            else if (s === "product_field" && products[0])
              onChange({ source: "product_field", entityId: products[0].id, entityName: products[0].name, field: "name" });
            else if (s === "service_field" && services[0])
              onChange({ source: "service_field", entityId: services[0].id, entityName: services[0].name, field: "name" });
            else if (s === "course_field" && courses[0])
              onChange({ source: "course_field", entityId: courses[0].id, entityName: courses[0].title, field: "title" });
          }}
          className="h-8 px-2 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="contact_field">Campo del contacto</option>
          {products.length > 0 && <option value="product_field">Producto</option>}
          {services.length > 0 && <option value="service_field">Servicio</option>}
          {courses.length  > 0 && <option value="course_field">Curso</option>}
          <option value="fixed">Texto fijo</option>
        </select>

        {/* Sub-selector */}
        {source === "contact_field" && (
          <select
            value={(value as any)?.field ?? "name"}
            onChange={e => onChange({ source: "contact_field", field: e.target.value as any })}
            className="h-8 px-2 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/30"
          >
            {Object.entries(CONTACT_FIELD_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        )}

        {(source === "product_field" || source === "service_field" || source === "course_field") && (() => {
          const list = source === "product_field" ? products : source === "service_field" ? services : courses;
          const nameKey = source === "course_field" ? "title" : "name";
          const cur = (value as any)?.entityId ?? list[0]?.id;
          const fieldVal = (value as any)?.field ?? (source === "course_field" ? "title" : "name");
          return (
            <>
              <select
                value={cur}
                onChange={e => {
                  const item = list.find((x: any) => x.id === e.target.value);
                  onChange({ source: source as any, entityId: e.target.value, entityName: (item as any)?.[nameKey] ?? "", field: fieldVal } as any);
                }}
                className="h-8 px-2 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/30 flex-1 min-w-0"
              >
                {list.map((item: any) => (
                  <option key={item.id} value={item.id}>{item[nameKey]}</option>
                ))}
              </select>
              <select
                value={fieldVal}
                onChange={e => onChange({ ...(value as any), field: e.target.value })}
                className="h-8 px-2 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value={source === "course_field" ? "title" : "name"}>{source === "course_field" ? "Título" : "Nombre"}</option>
                <option value="price">Precio</option>
              </select>
            </>
          );
        })()}

        {source === "fixed" && (
          <input
            value={(value as any)?.value ?? ""}
            onChange={e => onChange({ source: "fixed", value: e.target.value })}
            placeholder="Texto que se enviará a todos"
            className="flex-1 h-8 px-2 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/30 min-w-0"
          />
        )}
      </div>
    </div>
  );
}

function extractVarNums(text: string): number[] {
  return [...new Set([...text.matchAll(/\{\{(\d+)\}\}/g)].map(m => Number(m[1])))].sort((a, b) => a - b);
}

function StepVariables({
  template,
  varMap,
  onChange,
}: { template: CrmWaTemplate; varMap: WaVarMap; onChange: (m: WaVarMap) => void }) {
  const varNums = extractVarNums(template.body_text);

  if (!varNums.length) return (
    <div className="text-center py-8 space-y-1">
      <CheckCircle2 size={24} className="mx-auto text-green-500" />
      <p className="text-sm text-muted-foreground">Esta plantilla no tiene variables — el mensaje es fijo.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Define qué valor se usará para cada variable al enviar el mensaje a cada contacto.
      </p>
      {varNums.map(num => (
        <VarSourceSelector
          key={num}
          varNum={num}
          label={template.variable_labels?.[num - 1] ?? ""}
          value={varMap[String(num)]}
          onChange={v => onChange({ ...varMap, [String(num)]: v })}
        />
      ))}
    </div>
  );
}

// ─── Step 3: Audience ─────────────────────────────────────────────────────────

type FilterType = WaAudienceFilter["type"];

const FILTER_TYPE_LABELS: Record<FilterType, string> = {
  tag:                    "Etiqueta del contacto",
  wa_label:               "Etiqueta del Agente IA",
  pipeline_stage:         "Estado en Pipeline",
  has_sale_any:           "Tiene alguna compra",
  has_sale_product:       "Compró un producto",
  has_sale_service:       "Compró un servicio",
  no_sale:                "Sin compras registradas",
  has_appointment_ever:   "Ha agendado alguna vez",
  has_appointment_recent: "Agendó recientemente",
  has_wa_conversation:    "Tiene conversación con el Agente IA",
};

function FilterBuilder({
  filters,
  onChange,
}: { filters: WaAudienceFilter[]; onChange: (f: WaAudienceFilter[]) => void }) {
  const { data: tags     = [] } = useAllContactTags();
  const { data: waLabels = [] } = useWaLabels();
  const { data: pipelines = [] } = usePipelines();
  const { data: products  = [] } = useProducts();
  const { data: services  = [] } = useServices();

  const [addType, setAddType] = useState<FilterType>("tag");

  // Sub-fields
  const [addTag,       setAddTag]       = useState("");
  const [addLabelId,   setAddLabelId]   = useState("");
  const [addPipeId,    setAddPipeId]    = useState("");
  const [addPipeStage, setAddPipeStage] = useState("");
  const [addProductId, setAddProductId] = useState("");
  const [addServiceId, setAddServiceId] = useState("");
  const [addDays,      setAddDays]      = useState("30");

  const handleAdd = () => {
    let filter: WaAudienceFilter | null = null;

    if (addType === "tag") {
      const tag = addTag || tags[0];
      if (!tag) return;
      filter = { type: "tag", value: tag };
    } else if (addType === "wa_label") {
      const lbl = waLabels.find(l => l.id === addLabelId) ?? waLabels[0];
      if (!lbl) return;
      filter = { type: "wa_label", labelId: lbl.id, labelName: lbl.name };
    } else if (addType === "pipeline_stage") {
      const pipe = pipelines.find(p => p.id === addPipeId) ?? pipelines[0];
      if (!pipe) return;
      const stage = addPipeStage || (pipe.column_names?.[0] ?? "");
      if (!stage) return;
      filter = { type: "pipeline_stage", pipelineId: pipe.id, pipelineName: pipe.name, stage };
    } else if (addType === "has_sale_product") {
      const prod = products.find(p => p.id === addProductId) ?? products[0];
      if (!prod) return;
      filter = { type: "has_sale_product", productId: prod.id, productName: prod.name };
    } else if (addType === "has_sale_service") {
      const svc = services.find(s => s.id === addServiceId) ?? services[0];
      if (!svc) return;
      filter = { type: "has_sale_service", serviceId: svc.id, serviceName: svc.name };
    } else if (addType === "has_appointment_recent") {
      filter = { type: "has_appointment_recent", days: Number(addDays) || 30 };
    } else {
      filter = { type: addType } as WaAudienceFilter;
    }

    if (filter) onChange([...filters, filter]);
  };

  const currentPipeline = pipelines.find(p => p.id === addPipeId) ?? pipelines[0];

  return (
    <div className="space-y-3">
      {/* Existing filters */}
      {filters.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f, idx) => (
            <span key={idx} className="inline-flex items-center gap-1.5 bg-primary/8 border border-primary/20 text-primary px-2.5 py-1 rounded-full text-[11px] font-medium">
              {filterLabel(f)}
              <button type="button" onClick={() => onChange(filters.filter((_, i) => i !== idx))}
                className="hover:text-destructive transition-colors">
                <XCircle size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add filter row */}
      <div className="rounded-xl border border-dashed border-border p-3 space-y-2 bg-muted/20">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Agregar filtro</p>
        <div className="flex flex-wrap gap-2">
          <select
            value={addType}
            onChange={e => setAddType(e.target.value as FilterType)}
            className="h-8 px-2 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/30"
          >
            {Object.entries(FILTER_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          {addType === "tag" && tags.length > 0 && (
            <select value={addTag || tags[0]} onChange={e => setAddTag(e.target.value)}
              className="h-8 px-2 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/30">
              {tags.map((t: string) => <option key={t} value={t}>{t}</option>)}
            </select>
          )}

          {addType === "wa_label" && waLabels.length > 0 && (
            <select value={addLabelId || waLabels[0]?.id} onChange={e => setAddLabelId(e.target.value)}
              className="h-8 px-2 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/30">
              {waLabels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          )}

          {addType === "pipeline_stage" && (
            <>
              {pipelines.length > 0 && (
                <select value={addPipeId || pipelines[0]?.id} onChange={e => { setAddPipeId(e.target.value); setAddPipeStage(""); }}
                  className="h-8 px-2 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/30">
                  {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
              {currentPipeline?.column_names?.length > 0 && (
                <select value={addPipeStage || currentPipeline.column_names[0]} onChange={e => setAddPipeStage(e.target.value)}
                  className="h-8 px-2 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/30">
                  {currentPipeline.column_names.map((s: string) => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
            </>
          )}

          {addType === "has_sale_product" && products.length > 0 && (
            <select value={addProductId || products[0]?.id} onChange={e => setAddProductId(e.target.value)}
              className="h-8 px-2 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/30 flex-1 min-w-0">
              {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}

          {addType === "has_sale_service" && services.length > 0 && (
            <select value={addServiceId || services[0]?.id} onChange={e => setAddServiceId(e.target.value)}
              className="h-8 px-2 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/30 flex-1 min-w-0">
              {services.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}

          {addType === "has_appointment_recent" && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input type="number" min={1} max={365} value={addDays} onChange={e => setAddDays(e.target.value)}
                className="w-16 h-8 px-2 rounded-lg border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/30 text-center" />
              <span>días</span>
            </div>
          )}

          <button type="button" onClick={handleAdd}
            className="h-8 px-3 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors flex items-center gap-1">
            <Plus size={12} /> Agregar
          </button>
        </div>
      </div>
    </div>
  );
}

function StepAudience({
  audienceType, filters, contacts,
  onTypeChange, onFiltersChange,
}: {
  audienceType: "all" | "include" | "exclude";
  filters: WaAudienceFilter[];
  contacts: any[];
  onTypeChange: (t: "all" | "include" | "exclude") => void;
  onFiltersChange: (f: WaAudienceFilter[]) => void;
}) {
  const estimated = estimateAudience(contacts, audienceType, filters);

  return (
    <div className="space-y-4">
      {/* Audience type */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">¿A quiénes enviar?</p>
        <div className="space-y-1.5">
          {(["all", "include", "exclude"] as const).map(t => (
            <label key={t} className="flex items-start gap-2.5 cursor-pointer p-2.5 rounded-xl border transition-all hover:bg-muted/20
              ${audienceType === t ? 'border-primary/50 bg-primary/5' : 'border-border'}">
              <input type="radio" name="audienceType" value={t} checked={audienceType === t}
                onChange={() => { onTypeChange(t); if (t === "all") onFiltersChange([]); }}
                className="mt-0.5 accent-primary shrink-0" />
              <div>
                <p className="text-sm font-medium">
                  {t === "all"     ? "Todos los contactos" :
                   t === "include" ? "Solo incluir a..." : "Todos menos..."}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {t === "all"     ? "Todos los contactos con número de WhatsApp." :
                   t === "include" ? "Solo los contactos que cumplan al menos uno de los filtros." :
                                    "Todos excepto los que cumplan al menos uno de los filtros."}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Filters */}
      {audienceType !== "all" && (
        <FilterBuilder filters={filters} onChange={onFiltersChange} />
      )}

      {/* Estimate */}
      <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/30 border border-border">
        <Users size={14} className="text-primary shrink-0" />
        <p className="text-xs text-muted-foreground">
          Audiencia estimada:{" "}
          <strong className="text-foreground">{estimated} contacto{estimated !== 1 ? "s" : ""}</strong>
          {audienceType !== "all" && filters.some(f => f.type !== "tag") &&
            <span className="text-muted-foreground/60"> (estimado; filtros DB se calculan al enviar)</span>}
        </p>
      </div>
    </div>
  );
}

// ─── Step 4: Review ───────────────────────────────────────────────────────────

function StepReview({
  template, varMap, audienceType, filters, campaignName,
  onNameChange, contacts,
}: {
  template: CrmWaTemplate;
  varMap: WaVarMap;
  audienceType: "all" | "include" | "exclude";
  filters: WaAudienceFilter[];
  campaignName: string;
  onNameChange: (n: string) => void;
  contacts: any[];
}) {
  const estimated = estimateAudience(contacts, audienceType, filters);

  const previewContact = contacts.find(c => c.phone?.trim()) ?? { name: "Juan Pérez", email: "juan@ejemplo.com", phone: "59170000000", company: "Mi Empresa" };

  // Preview message
  const varNums = extractVarNums(template.body_text);
  let previewText = template.body_text;
  for (const num of varNums) {
    const entry = varMap[String(num)];
    let val = `{{${num}}}`;
    if (entry?.source === "contact_field") val = (previewContact as any)[entry.field] ?? val;
    else if (entry?.source === "fixed")    val = entry.value || val;
    else if (entry?.source === "product_field") val = entry.entityName || val;
    else if (entry?.source === "service_field") val = entry.entityName || val;
    else if (entry?.source === "course_field")  val = entry.entityName || val;
    previewText = previewText.replace(`{{${num}}}`, val);
  }

  return (
    <div className="space-y-4">
      {/* Campaign name */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-muted-foreground">Nombre de la campaña *</label>
        <input
          value={campaignName}
          onChange={e => onNameChange(e.target.value)}
          placeholder="ej. Promoción junio 2025"
          className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
      </div>

      {/* Summary */}
      <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Plantilla</span>
          <span className="font-mono font-semibold">{template.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Audiencia</span>
          <span className="font-medium">
            {audienceType === "all" ? "Todos los contactos" :
             audienceType === "include" ? `Solo incluir (${filters.length} filtro${filters.length !== 1 ? "s" : ""})` :
             `Todos menos (${filters.length} filtro${filters.length !== 1 ? "s" : ""})`}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Contactos estimados</span>
          <span className="font-bold text-primary">{estimated}</span>
        </div>
      </div>

      {/* Preview */}
      <div className="space-y-1.5">
        <p className="text-[11px] text-muted-foreground font-medium">
          Vista previa con datos del primer contacto ({previewContact.name ?? "contacto de muestra"}):
        </p>
        <div className="rounded-xl bg-[#e5ddd5] dark:bg-[#1a1a2e] p-3">
          <div className="bg-white dark:bg-[#202c33] rounded-xl px-3 py-2.5 shadow-sm">
            <p className="text-sm whitespace-pre-wrap leading-snug">{previewText}</p>
          </div>
          {(template.buttons ?? []).length > 0 && (
            <div className="mt-1 space-y-1">
              {template.buttons.map((b, i) => (
                <div key={i} className="bg-white dark:bg-[#202c33] rounded-xl px-3 py-1.5 text-center">
                  <span className="text-xs text-[#0a7bcd] font-medium">{b.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30">
        <AlertCircle size={13} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
          Se enviará un mensaje de WhatsApp a cada contacto de la audiencia. Esta acción tiene costo por conversación según las tarifas de Meta. Una vez iniciada, no se puede cancelar.
        </p>
      </div>
    </div>
  );
}

// ─── Campaign list ────────────────────────────────────────────────────────────

function statusBadge(status: CrmWaCampaign["status"]) {
  const map = {
    draft:      { label: "Borrador",     cls: "bg-muted text-muted-foreground",                                                         icon: <LayoutList size={10} /> },
    processing: { label: "Enviando...",  cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",                       icon: <Loader2 size={10} className="animate-spin" /> },
    completed:  { label: "Completada",   cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",                   icon: <CheckCircle2 size={10} /> },
    failed:     { label: "Fallida",      cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",                           icon: <XCircle size={10} /> },
    cancelled:  { label: "Cancelada",    cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",               icon: <XCircle size={10} /> },
  };
  const m = map[status] ?? map.draft;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${m.cls}`}>
      {m.icon}{m.label}
    </span>
  );
}

function CampaignDetail({ campaign, onBack }: { campaign: CrmWaCampaign; onBack: () => void }) {
  const { data: logs = [], isLoading } = useWaCampaignLogs(campaign.id);

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={14} /> Volver a campañas
      </button>

      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-base font-semibold">{campaign.name}</h2>
          {statusBadge(campaign.status)}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Plantilla: <strong className="font-mono">{campaign.crm_wa_templates?.name}</strong>
          {" · "}{relativeTime(campaign.created_at)}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total", value: campaign.total_contacts ?? "—", cls: "text-foreground" },
          { label: "Enviados", value: campaign.sent_count, cls: "text-green-600 dark:text-green-400" },
          { label: "Fallidos", value: campaign.failed_count, cls: "text-red-600 dark:text-red-400" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-border bg-muted/20 p-3 text-center">
            <p className={`text-xl font-bold ${s.cls}`}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Logs */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">Detalle por contacto</p>
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-muted-foreground/50" /></div>
        ) : !logs.length ? (
          <p className="text-xs text-muted-foreground text-center py-4">Sin registros aún</p>
        ) : (
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {logs.map(log => (
              <div key={log.id} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/20 transition-colors">
                {log.status === "sent"    && <CheckCircle2 size={12} className="text-green-500 shrink-0" />}
                {log.status === "failed"  && <XCircle size={12} className="text-red-500 shrink-0" />}
                {log.status === "pending" && <Clock size={12} className="text-muted-foreground shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{log.contact_name ?? log.phone}</p>
                  {log.error_message && (
                    <p className="text-[10px] text-red-500 truncate">{log.error_message}</p>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0 font-mono">{log.phone}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CrmWaCampaigns() {
  const { user } = useCurrentUser();
  const { data: campaigns = [], isLoading, refetch } = useWaCampaigns();
  const createCampaign = useCreateWaCampaign();
  const deleteCampaign = useDeleteWaCampaign();
  const { data: contacts = [] } = useContacts();

  // Views
  const [building,    setBuilding]    = useState(false);
  const [detailId,    setDetailId]    = useState<string | null>(null);

  // Builder state
  const [step,         setStep]        = useState(0);
  const [selTemplate,  setSelTemplate] = useState<CrmWaTemplate | null>(null);
  const [varMap,       setVarMap]      = useState<WaVarMap>({});
  const [audienceType, setAudienceType] = useState<"all" | "include" | "exclude">("all");
  const [filters,      setFilters]     = useState<WaAudienceFilter[]>([]);
  const [campName,     setCampName]    = useState("");
  const [sending,      setSending]     = useState(false);

  const resetBuilder = () => {
    setStep(0); setSelTemplate(null); setVarMap({});
    setAudienceType("all"); setFilters([]); setCampName(""); setSending(false);
  };

  const canNext = () => {
    if (step === 0) return !!selTemplate;
    if (step === 1) {
      if (!selTemplate) return false;
      const nums = extractVarNums(selTemplate.body_text);
      return nums.every(n => {
        const e = varMap[String(n)];
        if (!e) return false;
        if (e.source === "fixed" && !e.value.trim()) return false;
        return true;
      });
    }
    if (step === 2) return audienceType === "all" || filters.length > 0;
    if (step === 3) return !!campName.trim();
    return false;
  };

  const handleSendCampaign = async () => {
    if (!selTemplate || !campName.trim()) return;
    setSending(true);
    try {
      const campaign = await createCampaign.mutateAsync({
        template_id:      selTemplate.id,
        name:             campName.trim(),
        variable_map:     varMap,
        audience_type:    audienceType,
        audience_filters: filters,
      });

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-wa-campaign`,
        {
          method:  "POST",
          headers: { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" },
          body:    JSON.stringify({ campaign_id: campaign.id }),
        },
      );
      const json = await res.json();

      if (json.ok) {
        toast.success(`Campaña enviada: ${json.sent} enviados, ${json.failed} fallidos de ${json.total} contactos`);
        refetch();
        setBuilding(false);
        resetBuilder();
        setDetailId(campaign.id);
      } else {
        const msg =
          json.error === "waba_not_configured" ? "Configura tu WABA en la sección Conexión" :
          json.error === "already_processed"   ? "Esta campaña ya fue procesada" :
          json.error ?? "Error al enviar la campaña";
        toast.error(msg, { duration: 8000 });
      }
    } catch {
      toast.error("Error de conexión al enviar la campaña");
    } finally {
      setSending(false);
    }
  };

  const detailCampaign = useMemo(() => campaigns.find(c => c.id === detailId), [campaigns, detailId]);

  // ── Detail view ──
  if (detailCampaign) {
    return <CampaignDetail campaign={detailCampaign} onBack={() => setDetailId(null)} />;
  }

  // ── Builder ──
  if (building) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={() => { setBuilding(false); resetBuilder(); }}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <ArrowLeft size={14} />
          </button>
          <h2 className="text-sm font-semibold">Nueva campaña</h2>
        </div>

        <StepBar current={step} />

        {step === 0 && <StepTemplate selected={selTemplate} onSelect={t => { setSelTemplate(t); setVarMap({}); }} />}
        {step === 1 && selTemplate && <StepVariables template={selTemplate} varMap={varMap} onChange={setVarMap} />}
        {step === 2 && (
          <StepAudience
            audienceType={audienceType} filters={filters} contacts={contacts}
            onTypeChange={t => { setAudienceType(t); if (t === "all") setFilters([]); }}
            onFiltersChange={setFilters}
          />
        )}
        {step === 3 && selTemplate && (
          <StepReview
            template={selTemplate} varMap={varMap} audienceType={audienceType}
            filters={filters} campaignName={campName} onNameChange={setCampName}
            contacts={contacts}
          />
        )}

        {/* Nav buttons */}
        <div className="flex gap-2 pt-2 border-t">
          {step > 0 && (
            <button type="button" onClick={() => setStep(s => s - 1 as any)}
              className="flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
              <ChevronLeft size={14} /> Anterior
            </button>
          )}
          <div className="flex-1" />
          {step < 3 ? (
            <button type="button" onClick={() => setStep(s => s + 1 as any)} disabled={!canNext()}
              className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40">
              Siguiente <ChevronRight size={14} />
            </button>
          ) : (
            <button type="button" onClick={handleSendCampaign} disabled={!canNext() || sending}
              className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-40">
              {sending ? <><Loader2 size={13} className="animate-spin" /> Enviando...</> : <><Send size={13} /> Enviar campaña</>}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Campaign list ──
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Campañas enviadas</p>
          <p className="text-xs text-muted-foreground">{campaigns.length} campaña{campaigns.length !== 1 ? "s" : ""} · Solo plantillas Marketing aprobadas</p>
        </div>
        <button
          type="button"
          onClick={() => { setBuilding(true); resetBuilder(); }}
          className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1.5"
        >
          <Plus size={12} /> Nueva campaña
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : !campaigns.length ? (
        <div className="text-center py-12 space-y-2">
          <Megaphone size={28} className="mx-auto text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Aún no has enviado ninguna campaña</p>
          <p className="text-xs text-muted-foreground/70">Crea una para enviar mensajes a tu audiencia</p>
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
                    <span className="font-mono">{c.crm_wa_templates?.name ?? "—"}</span>
                    {c.total_contacts != null && (
                      <> · {c.sent_count}/{c.total_contacts} enviados{c.failed_count > 0 && `, ${c.failed_count} fallidos`}</>
                    )}
                    {" · "}{relativeTime(c.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {(c.status === "completed" || c.status === "failed" || c.status === "processing") && (
                    <button type="button" onClick={() => setDetailId(c.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      title="Ver detalle">
                      <Eye size={13} />
                    </button>
                  )}
                  {c.status === "draft" && (
                    <button type="button"
                      onClick={async () => {
                        if (!confirm(`¿Eliminar la campaña "${c.name}"?`)) return;
                        await deleteCampaign.mutateAsync(c.id);
                        toast.success("Campaña eliminada");
                      }}
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
    </div>
  );
}
