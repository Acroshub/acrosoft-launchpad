import { useState, useMemo } from "react";
import { Plus, XCircle, Users, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  useProducts, useServices, useCourses, useWaLabels, useAllContactTags,
  useContacts, useWaConversationPhones, useWaActiveConversations,
  useSales, useAppointments, useWaConversationLabelLinks,
} from "@/hooks/useCrmData";
import type { WaAudienceFilter, WaAudienceMatch } from "@/lib/supabase";

// ─────────────────────────────────────────────────────────────────────────────
// Selección de audiencia para WhatsApp — compartida por Envíos Masivos y
// Seguimiento Automático.
//
// Vivía dentro de CrmWaCampaigns. Se sacó aquí cuando Seguimientos pasó a usar
// los mismos filtros: tener dos lenguajes de audiencia (uno de etiquetas+países
// y otro de filtros de CRM) obligaba a mantener dos veces lo mismo y daba
// resultados distintos para la misma pregunta.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Países ──────────────────────────────────────────────────────────────────

export const PHONE_TIMEZONE: Record<string, string> = {
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

export const COUNTRY_INFO: Record<string, { name: string; flag: string }> = {
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


export function getPhonePrefix(phone: string): string {
  const d = phone.replace(/\D/g, "");
  for (const len of [3, 2, 1]) {
    const p = d.slice(0, len);
    if (PHONE_TIMEZONE[p]) return p;
  }
  return "unknown";
}

// Converts "YYYY-MM-DD"+"HH:MM" in a given IANA timezone to a UTC ISO string

// ─── Filtros ─────────────────────────────────────────────────────────────────

export function filterLabel(f: WaAudienceFilter): string {
  switch (f.type) {
    case "tag":                    return `Etiqueta: ${f.value}`;
    case "wa_label":               return `IA: ${f.labelName}`;
    case "has_sale_any":           return "Tiene alguna compra";
    case "has_sale_product":       return `Compró: ${f.productName}`;
    case "has_sale_course":        return `Compró el curso: ${f.courseName}`;
    case "has_sale_digital":       return "Compró algo digital (producto o curso)";
    case "has_sale_physical":      return "Compró un producto físico";
    case "has_sale_service":       return `Compró servicio: ${f.serviceName}`;
    case "no_sale":                return "Sin compras registradas";
    case "has_appointment_ever":   return "Agendó alguna vez";
    case "has_appointment_recent": return `Agendó en los últimos ${f.days} días`;
    case "has_wa_conversation":    return "Tiene conversación con el Agente IA";
    case "country":                return f.codes.length === 1
                                     ? `País: ${COUNTRY_INFO[f.codes[0]]?.flag ?? ""} ${COUNTRY_INFO[f.codes[0]]?.name ?? `+${f.codes[0]}`}`.trim()
                                     : `Países: ${f.codes.map(c => COUNTRY_INFO[c]?.flag ?? `+${c}`).join(" ")}`;
    default:                       return "Filtro desconocido";
  }
}

// Qué fuente necesita cada filtro para poder cumplirse. Un contacto sin
// conversación nunca cumplirá un filtro de WhatsApp, y una conversación sin
// ficha nunca cumplirá uno de CRM — la UI lo dice en vez de esconderlo.
export const FILTER_SOURCE: Record<WaAudienceFilter["type"], "crm" | "wa" | "any"> = {
  tag: "crm", has_sale_any: "crm", has_sale_product: "crm", has_sale_service: "crm",
  no_sale: "crm", has_appointment_ever: "crm", has_appointment_recent: "crm",
  has_sale_course: "crm", has_sale_digital: "crm", has_sale_physical: "crm",
  wa_label: "wa", has_wa_conversation: "wa",
  country: "any",
};


export type AudienceMember = {
  phoneKey: string;
  phone: string;
  name: string | null;
  contactId: string | null;
  conversationId: string | null;
  tags: string[];
};

export const digits = (p: string) => (p ?? "").replace(/\D/g, "");

export function buildLocalBase(
  contacts: { id: string; name?: string | null; phone: string | null; tags?: string[] | null }[],
  convs: { id: string; phone: string; contact_name?: string | null; contact_id: string | null }[],
): AudienceMember[] {
  const byPhone = new Map<string, AudienceMember>();
  for (const c of contacts) {
    const key = digits(c.phone);
    if (!key) continue;
    byPhone.set(key, {
      phoneKey: key, phone: c.phone ?? "", name: c.name ?? null,
      contactId: c.id, conversationId: null, tags: c.tags ?? [],
    });
  }
  for (const v of convs) {
    const key = digits(v.phone);
    if (!key) continue;
    const existing = byPhone.get(key);
    if (existing) {
      existing.conversationId = v.id;
      if (!existing.contactId && v.contact_id) existing.contactId = v.contact_id;
      if (!existing.name) existing.name = v.contact_name ?? null;
    } else {
      byPhone.set(key, {
        phoneKey: key, phone: v.phone, name: v.contact_name ?? null,
        contactId: v.contact_id ?? null, conversationId: v.id, tags: [],
      });
    }
  }
  return [...byPhone.values()];
}

// Todo lo que hace falta para resolver cualquier filtro sin llamar al backend.
// Los volúmenes son pequeños (ventas, citas, etiquetas), así que sale más barato
// traerlos que pedir al servidor un recuento cada vez que se toca un filtro —
// y además el número que ve el usuario deja de ser una estimación.
export type AudienceContext = {
  activeKeys: Set<string>;
  /** contact_id de quien compró algo de cada tipo */
  saleAny: Set<string>;
  saleDigital: Set<string>;
  salePhysical: Set<string>;
  saleByProduct: Map<string, Set<string>>;
  saleByCourse: Map<string, Set<string>>;
  saleByService: Map<string, Set<string>>;
  apptEver: Set<string>;
  /** contact_id → fecha de creación de su cita más reciente (ms) */
  apptLatest: Map<string, number>;
  /** label_id → conversation_id que la tienen */
  convByLabel: Map<string, Set<string>>;
};

export function matchesFilter(m: AudienceMember, f: WaAudienceFilter, ctx: AudienceContext): boolean {
  const cid = m.contactId;
  switch (f.type) {
    case "tag":                    return m.tags.includes(f.value);
    case "country":                return f.codes.some(c => m.phoneKey.startsWith(digits(c)));
    case "has_wa_conversation":    return !!m.conversationId;
    case "wa_label":               return !!m.conversationId && !!ctx.convByLabel.get(f.labelId)?.has(m.conversationId);
    case "has_sale_any":           return !!cid && ctx.saleAny.has(cid);
    case "has_sale_digital":       return !!cid && ctx.saleDigital.has(cid);
    case "has_sale_physical":      return !!cid && ctx.salePhysical.has(cid);
    case "has_sale_product":       return !!cid && !!ctx.saleByProduct.get(f.productId)?.has(cid);
    case "has_sale_course":        return !!cid && !!ctx.saleByCourse.get(f.courseId)?.has(cid);
    case "has_sale_service":       return !!cid && !!ctx.saleByService.get(f.serviceId)?.has(cid);
    // Sin ficha no hay ventas registradas, así que cuenta como "sin compras".
    case "no_sale":                return !cid || !ctx.saleAny.has(cid);
    case "has_appointment_ever":   return !!cid && ctx.apptEver.has(cid);
    case "has_appointment_recent": {
      if (!cid) return false;
      const last = ctx.apptLatest.get(cid);
      return last != null && last >= Date.now() - (f.days ?? 30) * 86_400_000;
    }
    default:                       return false;
  }
}

export function estimateAudience(
  base: AudienceMember[],
  audienceType: string,
  filters: WaAudienceFilter[],
  ctx: AudienceContext,
  match: WaAudienceMatch = "any",
): AudienceMember[] {
  if (audienceType === "all" || !filters.length) return base;

  const matched = base.filter(m => match === "all"
    ? filters.every(f => matchesFilter(m, f, ctx))
    : filters.some(f  => matchesFilter(m, f, ctx)));

  if (audienceType === "include") return matched;
  const keep = new Set(matched.map(m => m.phoneKey));
  return base.filter(m => !keep.has(m.phoneKey));
}


export type FilterType = WaAudienceFilter["type"];
export const FILTER_TYPE_LABELS: Record<FilterType, string> = {
  tag: "Etiqueta del contacto", wa_label: "Etiqueta del Agente IA",
  has_sale_any: "Compró cualquier cosa",
  has_sale_digital: "Compró algo digital (producto o curso)",
  has_sale_physical: "Compró un producto físico",
  has_sale_product: "Compró un producto concreto",
  has_sale_course: "Compró un curso concreto",
  has_sale_service: "Compró un servicio",
  no_sale: "Sin compras registradas", has_appointment_ever: "Ha agendado alguna vez",
  has_appointment_recent: "Agendó recientemente", has_wa_conversation: "Tiene conversación con el Agente IA",
  country: "País del teléfono",
};

export function FilterBuilder({ filters, onChange, match, onMatchChange }: {
  filters: WaAudienceFilter[];
  onChange: (f: WaAudienceFilter[]) => void;
  match: WaAudienceMatch;
  onMatchChange: (m: WaAudienceMatch) => void;
}) {
  const [adding, setAdding] = useState(false);
  const { data: tags = [] }      = useAllContactTags();
  const { data: waLabels = [] }  = useWaLabels();
  const { data: products = [] }  = useProducts();
  const { data: services = [] }  = useServices();
  const { data: courses = [] }   = useCourses();
  const { data: convPhones = [] } = useWaConversationPhones();
  const { data: allContacts = [] } = useContacts();

  // Solo se ofrecen países donde realmente tienes gente — una lista de 200
  // banderas vacías no ayuda a nadie. Se miran las dos fuentes: si tienes un
  // contacto de México sin conversación, México debe poder elegirse igual.
  const availableCountries = useMemo(() => {
    const counts: Record<string, number> = {};
    const bump = (phone?: string | null) => {
      if (!phone) return;
      const prefix = getPhonePrefix(phone);
      if (prefix !== "unknown" && COUNTRY_INFO[prefix]) counts[prefix] = (counts[prefix] ?? 0) + 1;
    };
    for (const c of convPhones)  bump(c.phone);
    for (const c of allContacts) bump(c.phone);
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([code, n]) => ({ code, n, ...COUNTRY_INFO[code] }));
  }, [convPhones, allContacts]);

  const [addType, setAddType]       = useState<FilterType>("tag");
  const [addTag, setAddTag]         = useState("");
  const [addLabelId, setAddLabelId] = useState("");
  const [addProductId, setAddProductId] = useState("");
  const [addServiceId, setAddServiceId] = useState("");
  const [addDays, setAddDays]       = useState("30");
  const [addCountries, setAddCountries] = useState<string[]>([]);
  const [addCourseId, setAddCourseId] = useState("");

  const handleAdd = () => {
    let filter: WaAudienceFilter | null = null;
    if (addType === "tag") { const tag = addTag || tags[0]; if (!tag) return; filter = { type: "tag", value: tag }; }
    else if (addType === "wa_label") { const lbl = waLabels.find(l => l.id === addLabelId) ?? waLabels[0]; if (!lbl) return; filter = { type: "wa_label", labelId: lbl.id, labelName: lbl.name }; }
    else if (addType === "has_sale_product") { const prod = products.find(p => p.id === addProductId) ?? products[0]; if (!prod) return; filter = { type: "has_sale_product", productId: prod.id, productName: prod.name }; }
    else if (addType === "has_sale_service") { const svc = services.find(s => s.id === addServiceId) ?? services[0]; if (!svc) return; filter = { type: "has_sale_service", serviceId: svc.id, serviceName: svc.name }; }
    else if (addType === "has_appointment_recent") { filter = { type: "has_appointment_recent", days: Number(addDays) || 30 }; }
    else if (addType === "country") { if (!addCountries.length) return; filter = { type: "country", codes: addCountries }; }
    else if (addType === "has_sale_course") { const c = courses.find(x => x.id === addCourseId) ?? courses[0]; if (!c) return; filter = { type: "has_sale_course", courseId: c.id, courseName: c.title }; }
    else { filter = { type: addType } as WaAudienceFilter; }
    if (filter) onChange([...filters, filter]);
  };

  const addLabel = FILTER_TYPE_LABELS[addType];

  return (
    <div className="space-y-3">
      {/* Filtros ya puestos */}
      {filters.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {filters.map((f, idx) => (
              <span key={idx} className="inline-flex items-center gap-1.5 bg-primary/8 border border-primary/20 text-primary px-2.5 py-1 rounded-full text-[11px] font-medium">
                {filterLabel(f)}
                <button type="button" onClick={() => onChange(filters.filter((_, i) => i !== idx))} className="hover:text-destructive transition-colors"><XCircle size={12} /></button>
              </span>
            ))}
          </div>

        </div>
      )}

      {/* Añadir otro */}
      {!adding ? (
        <>
          <button type="button" onClick={() => setAdding(true)}
            className="w-full flex items-center justify-center gap-1.5 h-9 rounded-xl border border-dashed border-border text-xs font-semibold text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-muted/20">
            <Plus size={13} /> {filters.length ? "Agregar otro filtro" : "Agregar filtro"}
          </button>

          {/* Con un solo filtro no hay nada que decidir, así que no se pregunta. */}
          {filters.length > 1 && (
            <div className="rounded-xl border border-border bg-muted/20 p-2.5 space-y-1.5">
              <p className="text-xs font-semibold">Con {filters.length} filtros, ¿a quién le mando?</p>
              {([
                { id: "any" as const,
                  title: "A quien cumpla cualquiera de ellos",
                  note: "Con \u201cetiqueta VIP\u201d y \u201ccompr\u00f3 el curso\u201d entra tanto un VIP que no compr\u00f3 como alguien que compr\u00f3 sin ser VIP. Llega a m\u00e1s gente." },
                { id: "all" as const,
                  title: "Solo a quien los cumpla todos",
                  note: "Con los mismos dos, entra \u00fanicamente quien sea VIP y adem\u00e1s haya comprado el curso. Llega a menos gente." },
              ]).map(m => (
                <label key={m.id} className={`flex items-start gap-2.5 cursor-pointer p-2 rounded-lg border ${match === m.id ? "border-primary/50 bg-primary/5" : "border-border"}`}>
                  <input type="radio" name="audienceMatch" checked={match === m.id}
                    onChange={() => onMatchChange(m.id)} className="mt-0.5 accent-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium">{m.title}</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">{m.note}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-3 space-y-2.5 bg-muted/20">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Nuevo filtro</p>
            <button type="button" onClick={() => setAdding(false)}
              className="text-muted-foreground hover:text-destructive"><XCircle size={13} /></button>
          </div>

          <select value={addType} onChange={e => setAddType(e.target.value as FilterType)}
            className="w-full h-9 px-2 rounded-lg border border-border bg-background text-base md:text-xs outline-none focus:ring-2 focus:ring-primary/30">
            {Object.entries(FILTER_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>

          {addType === "tag" && (
            tags.length > 0
              ? <select value={addTag || tags[0]} onChange={e => setAddTag(e.target.value)} className="w-full h-9 px-2 rounded-lg border border-border bg-background text-base md:text-xs outline-none focus:ring-2 focus:ring-primary/30">{tags.map((t: string) => <option key={t} value={t}>{t}</option>)}</select>
              : <p className="text-[11px] text-muted-foreground">No tienes etiquetas de contacto todavía.</p>
          )}

          {addType === "wa_label" && (
            waLabels.length > 0
              ? <select value={addLabelId || waLabels[0]?.id} onChange={e => setAddLabelId(e.target.value)} className="w-full h-9 px-2 rounded-lg border border-border bg-background text-base md:text-xs outline-none focus:ring-2 focus:ring-primary/30">{waLabels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
              : <p className="text-[11px] text-muted-foreground">El Agente IA aún no ha asignado etiquetas.</p>
          )}

          {addType === "has_sale_product" && products.length > 0 && (
            <select value={addProductId || products[0]?.id} onChange={e => setAddProductId(e.target.value)} className="w-full h-9 px-2 rounded-lg border border-border bg-background text-base md:text-xs outline-none focus:ring-2 focus:ring-primary/30">
              {products.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.product_kind === "fisico" ? "· físico" : "· digital"}
                </option>
              ))}
            </select>
          )}

          {addType === "has_sale_course" && (
            courses.length > 0
              ? <select value={addCourseId || courses[0]?.id} onChange={e => setAddCourseId(e.target.value)} className="w-full h-9 px-2 rounded-lg border border-border bg-background text-base md:text-xs outline-none focus:ring-2 focus:ring-primary/30">{courses.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
              : <p className="text-[11px] text-muted-foreground">No tienes cursos creados.</p>
          )}

          {(addType === "has_sale_digital" || addType === "has_sale_physical") && (
            <p className="text-[11px] text-muted-foreground">
              {addType === "has_sale_digital"
                ? "Cuenta cualquier producto de tipo archivo y cualquier curso."
                : "Cuenta cualquier producto que se envía físicamente."}
            </p>
          )}

          {addType === "has_sale_service" && services.length > 0 && (
            <select value={addServiceId || services[0]?.id} onChange={e => setAddServiceId(e.target.value)} className="w-full h-9 px-2 rounded-lg border border-border bg-background text-base md:text-xs outline-none focus:ring-2 focus:ring-primary/30">{services.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          )}

          {addType === "has_appointment_recent" && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input type="number" min={1} max={365} value={addDays} onChange={e => setAddDays(e.target.value)}
                className="w-20 h-9 px-2 rounded-lg border border-border bg-background text-base md:text-xs outline-none focus:ring-2 focus:ring-primary/30 text-center" />
              <span>días atrás</span>
            </div>
          )}


          {/* Países: multi-selección en UN solo filtro. Un teléfono no puede ser
              de dos países, así que como filtros separados sería imposible
              combinarlos con "debe cumplirlos todos". */}
          {addType === "country" && (
            availableCountries.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-[10px] text-muted-foreground">
                  Solo aparecen los países de los que tienes contactos o conversaciones. Puedes marcar varios.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {availableCountries.map(c => {
                    const on = addCountries.includes(c.code);
                    return (
                      <button key={c.code} type="button"
                        onClick={() => setAddCountries(prev => on ? prev.filter(x => x !== c.code) : [...prev, c.code])}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[11px] ${
                          on ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border text-muted-foreground hover:border-primary/40"
                        }`}>
                        {on ? <CheckCircle2 size={11} /> : null}
                        {c.flag} {c.name}
                        <span className="text-muted-foreground/60">{c.n}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">Todavía no hay teléfonos con país reconocible.</p>
            )
          )}

          <button type="button"
            onClick={() => { handleAdd(); setAdding(false); setAddCountries([]); }}
            disabled={addType === "country" && addCountries.length === 0}
            className="w-full h-9 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5">
            <Plus size={12} /> Agregar {addLabel.toLowerCase()}
          </button>
        </div>
      )}
    </div>
  );
}


export function StepAudience({ audienceType, filters, base, phoneless, ctx, match, onTypeChange, onFiltersChange, onMatchChange }: {
  audienceType: "all" | "include" | "exclude";
  filters: WaAudienceFilter[];
  base: AudienceMember[];
  phoneless: AudienceMember[];
  ctx: AudienceContext;
  match: WaAudienceMatch;
  onTypeChange: (t: "all" | "include" | "exclude") => void;
  onFiltersChange: (f: WaAudienceFilter[]) => void;
  onMatchChange: (m: WaAudienceMatch) => void;
}) {
  // El total va en el paso Revisar; aquí solo interesa avisar de los que no
  // tienen ficha, porque cambia qué filtros pueden cumplir.
  const members = estimateAudience(base, audienceType, filters, ctx, match);
  const orphans = members.filter(m => !m.contactId).length;

  // Contactos que SÍ cumplen los filtros pero no tienen teléfono guardado. Sin
  // esto, filtrar por "compró el servicio X" puede dar 0 sin explicación y
  // parece que el filtro está roto — cuando el problema es la ficha incompleta.
  const sinTelefono = (audienceType === "include" && filters.length)
    ? estimateAudience(phoneless, "include", filters, ctx, match).length
    : 0;

  // Un filtro de CRM no lo puede cumplir quien no tiene ficha, y uno de
  // WhatsApp no lo puede cumplir quien no tiene conversación. Vale avisarlo
  // antes de enviar, no después.
  const usesCrmFilters = filters.some(f => FILTER_SOURCE[f.type] === "crm");

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">¿A quiénes enviar?</p>
        <div className="space-y-1.5">
          {(["all", "include", "exclude"] as const).map(t => (
            <label key={t} className={`flex items-start gap-2.5 cursor-pointer p-2.5 rounded-xl border transition-all hover:bg-muted/20 ${audienceType === t ? "border-primary/50 bg-primary/5" : "border-border"}`}>
              <input type="radio" name="audienceType" value={t} checked={audienceType === t} onChange={() => { onTypeChange(t); if (t === "all") onFiltersChange([]); }} className="mt-0.5 accent-primary shrink-0" />
              <div>
                <p className="text-sm font-medium">{t === "all" ? "Todos" : t === "include" ? "Solo incluir a..." : "Todos menos..."}</p>
                <p className="text-[11px] text-muted-foreground">{t === "all" ? "Todo teléfono conocido: contactos del CRM y quien te haya escrito por WhatsApp." : t === "include" ? "Solo quienes cumplan al menos uno de los filtros." : "Todos excepto quienes cumplan al menos uno de los filtros."}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {audienceType !== "all" && (
        <FilterBuilder filters={filters} onChange={onFiltersChange} match={match} onMatchChange={onMatchChange} />
      )}

      {sinTelefono > 0 && (
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40">
          <AlertCircle size={13} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
            {sinTelefono} contacto{sinTelefono !== 1 ? "s" : ""} cumple{sinTelefono !== 1 ? "n" : ""} estos filtros pero
            <strong> no tiene{sinTelefono !== 1 ? "n" : ""} teléfono guardado</strong>, así que no puede{sinTelefono !== 1 ? "n" : ""} recibir WhatsApp.
            Añade su número en Contactos para incluirlo{sinTelefono !== 1 ? "s" : ""}.
          </p>
        </div>
      )}

      {orphans > 0 && usesCrmFilters && (
        <p className="text-[10px] text-muted-foreground/70">
          {orphans} de los seleccionados no tienen ficha en CRM — no les aplican filtros de compras, citas ni etiquetas de contacto.
        </p>
      )}
    </div>
  );
}


// ─── Datos de audiencia en un solo sitio ─────────────────────────────────────
// Los dos wizards necesitan exactamente lo mismo: el universo de teléfonos, los
// contactos sin teléfono (para explicar los ceros) y los índices con los que se
// resuelven los filtros. Se agrupa aquí para que no haya dos versiones.

export function useAudienceData(windowHours: number) {
  const { data: contacts = [] }     = useContacts();
  const { data: convPhones = [] }   = useWaConversationPhones();
  const { data: sales = [] }        = useSales();
  const { data: appointments = [] } = useAppointments();
  const { data: labelLinks = [] }   = useWaConversationLabelLinks();
  const { data: allProducts = [] }  = useProducts();
  const { data: activeConvs = [] }  = useWaActiveConversations(windowHours);

  const base = useMemo(() => buildLocalBase(contacts, convPhones), [contacts, convPhones]);

  const phoneless = useMemo<AudienceMember[]>(
    () => contacts
      .filter(c => !digits(c.phone))
      .map(c => ({ phoneKey: `no-phone:${c.id}`, phone: "", name: c.name ?? null, contactId: c.id, conversationId: null, tags: c.tags ?? [] })),
    [contacts],
  );

  const activeKeys = useMemo(() => new Set(activeConvs.map(c => digits(c.phone))), [activeConvs]);

  const ctx = useMemo<AudienceContext>(() => {
    const digitalProductIds  = new Set(allProducts.filter((p: any) => p.product_kind === "archivo").map((p: any) => p.id));
    const physicalProductIds = new Set(allProducts.filter((p: any) => p.product_kind === "fisico").map((p: any) => p.id));

    const saleAny = new Set<string>();
    const saleDigital = new Set<string>();
    const salePhysical = new Set<string>();
    const saleByProduct = new Map<string, Set<string>>();
    const saleByCourse  = new Map<string, Set<string>>();
    const saleByService = new Map<string, Set<string>>();
    const push = (map: Map<string, Set<string>>, key: string | null, cid: string) => {
      if (!key) return;
      if (!map.has(key)) map.set(key, new Set());
      map.get(key)!.add(cid);
    };

    for (const sale of sales) {
      if (sale.status === "rejected" || !sale.contact_id) continue;
      const cid = sale.contact_id;
      saleAny.add(cid);
      if (sale.course_id || (sale.product_id && digitalProductIds.has(sale.product_id))) saleDigital.add(cid);
      if (sale.product_id && physicalProductIds.has(sale.product_id)) salePhysical.add(cid);
      push(saleByProduct, sale.product_id, cid);
      push(saleByCourse,  sale.course_id,  cid);
      push(saleByService, sale.service_id, cid);
    }

    const apptEver = new Set<string>();
    const apptLatest = new Map<string, number>();
    for (const a of appointments) {
      if (a.status === "cancelled" || !a.contact_id) continue;
      apptEver.add(a.contact_id);
      const t = new Date(a.created_at).getTime();
      if (!apptLatest.has(a.contact_id) || t > apptLatest.get(a.contact_id)!) apptLatest.set(a.contact_id, t);
    }

    const convByLabel = new Map<string, Set<string>>();
    for (const l of labelLinks) {
      if (!convByLabel.has(l.label_id)) convByLabel.set(l.label_id, new Set());
      convByLabel.get(l.label_id)!.add(l.conversation_id);
    }

    return { activeKeys, saleAny, saleDigital, salePhysical, saleByProduct, saleByCourse, saleByService, apptEver, apptLatest, convByLabel };
  }, [sales, appointments, labelLinks, allProducts, activeKeys]);

  return { base, phoneless, ctx, activeKeys };
}
