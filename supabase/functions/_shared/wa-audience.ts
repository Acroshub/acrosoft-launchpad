// ─────────────────────────────────────────────────────────────────────────────
// Resolución unificada de audiencia para envíos de WhatsApp.
//
// El universo NO son los contactos del CRM: son los teléfonos únicos que
// resultan de unir dos fuentes, porque ~20% de las conversaciones de WhatsApp
// no tienen ficha de contacto y resolver solo sobre crm_contacts las perdía en
// silencio.
//
//   crm_contacts          (con teléfono)     → puede tener conversación o no
//   crm_wa_conversations                     → puede tener contacto o no
//
// Cada filtro se resuelve al conjunto de teléfonos que lo cumplen. Los filtros
// de CRM (compras, citas, etiquetas) solo pueden cumplirlos quienes tengan
// ficha; los de WhatsApp (etiqueta IA, ventana, país) solo quienes tengan
// conversación. Eso es información, no un bug: la UI lo muestra explícito.
// ─────────────────────────────────────────────────────────────────────────────

export type WaAudienceFilter =
  | { type: "tag";                    value: string }
  | { type: "wa_label";               labelId: string;    labelName: string }
  | { type: "has_sale_any" }
  | { type: "has_sale_product";       productId: string;  productName: string }
  | { type: "has_sale_course";        courseId: string;   courseName: string }
  | { type: "has_sale_service";       serviceId: string;  serviceName: string }
  | { type: "has_sale_digital" }
  | { type: "has_sale_physical" }
  | { type: "no_sale" }
  | { type: "has_appointment_ever" }
  | { type: "has_appointment_recent"; days: number }
  | { type: "has_wa_conversation" }
  | { type: "country";                codes: string[] };

export type AudienceType = "all" | "include" | "exclude";

/** Cómo se combinan varios filtros: cumplir uno cualquiera, o cumplirlos todos. */
export type AudienceMatch = "any" | "all";

export type AudienceMember = {
  phone: string;            // tal como se guardó, para enviar
  phoneKey: string;         // solo dígitos, para deduplicar y comparar
  contactId: string | null;
  conversationId: string | null;
  name: string | null;
  email: string | null;
  company: string | null;
};

export function normalizePhone(phone: string): string {
  return (phone ?? "").replace(/\D/g, "");
}

// PostgREST corta en 1000 filas por defecto. Una audiencia real pasa de eso sin
// esfuerzo (este proyecto ya tiene 1238 conversaciones), y el corte es silencioso:
// no da error, simplemente devuelve menos gente. Todo lo que pueda crecer con el
// negocio se lee paginado.
const PAGE = 1000;

/**
 * Lee una tabla entera en páginas de PAGE filas.
 *
 * `orderBy` NO es opcional por comodidad: sin ORDER BY, Postgres no garantiza
 * que dos consultas devuelvan las filas en el mismo orden, así que entre página
 * y página se pueden repetir unas y **perderse otras** — justo el fallo
 * silencioso que este helper existe para evitar. La columna tiene que ser única
 * y estable dentro de cada consulta.
 */
async function fetchAll<T>(
  // deno-lint-ignore no-explicit-any
  page: (from: number, to: number) => any,
  orderBy: string,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1).order(orderBy, { ascending: true });
    if (error) throw error;
    const rows: T[] = data ?? [];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

// ─── Universo base ────────────────────────────────────────────────────────────

export async function buildAudienceBase(
  supabase: any,
  userId: string,
): Promise<AudienceMember[]> {
  // deno-lint-ignore no-explicit-any
  const [contacts, convs] = await Promise.all([
    fetchAll<any>((from, to) => supabase
      .from("crm_contacts")
      .select("id, name, email, phone, company")
      .eq("user_id", userId)
      .not("phone", "is", null)
      .neq("phone", "")
      .range(from, to), "id"),
    fetchAll<any>((from, to) => supabase
      .from("crm_wa_conversations")
      .select("id, phone, contact_name, contact_id")
      .eq("user_id", userId)
      .not("phone", "is", null)
      .neq("phone", "")
      .range(from, to), "id"),
  ]);

  const byPhone = new Map<string, AudienceMember>();

  for (const c of contacts ?? []) {
    const key = normalizePhone(c.phone);
    if (!key) continue;
    byPhone.set(key, {
      phone: c.phone,
      phoneKey: key,
      contactId: c.id,
      conversationId: null,
      name: c.name ?? null,
      email: c.email ?? null,
      company: c.company ?? null,
    });
  }

  // Las conversaciones enriquecen al contacto si ya existe; si no, entran solas.
  for (const v of convs ?? []) {
    const key = normalizePhone(v.phone);
    if (!key) continue;
    const existing = byPhone.get(key);
    if (existing) {
      existing.conversationId = v.id;
      if (!existing.contactId && v.contact_id) existing.contactId = v.contact_id;
    } else {
      byPhone.set(key, {
        phone: v.phone,
        phoneKey: key,
        contactId: v.contact_id ?? null,
        conversationId: v.id,
        name: v.contact_name ?? null,
        email: null,
        company: null,
      });
    }
  }

  return [...byPhone.values()];
}

// ─── Un filtro → conjunto de phoneKeys que lo cumplen ────────────────────────

async function filterPhoneKeys(
  supabase: any,
  userId: string,
  filter: WaAudienceFilter,
  base: AudienceMember[],
): Promise<Set<string>> {
  const byContactId = new Map<string, AudienceMember>();
  const byConvId    = new Map<string, AudienceMember>();
  for (const m of base) {
    if (m.contactId)      byContactId.set(m.contactId, m);
    if (m.conversationId) byConvId.set(m.conversationId, m);
  }

  const fromContactIds = (rows: any[] | null, field = "contact_id") => {
    const out = new Set<string>();
    for (const r of rows ?? []) {
      const m = byContactId.get(r[field]);
      if (m) out.add(m.phoneKey);
    }
    return out;
  };

  switch (filter.type) {
    case "tag": {
      const data = await fetchAll<any>((from, to) => supabase
        .from("crm_contacts")
        .select("id, tags")
        .eq("user_id", userId)
        .contains("tags", [filter.value])
        .range(from, to), "id");
      return fromContactIds(data, "id");
    }

    case "wa_label": {
      const links = await fetchAll<any>((from, to) => supabase
        .from("crm_wa_conversation_labels")
        .select("conversation_id")
        .eq("label_id", filter.labelId)
        .range(from, to), "conversation_id");
      const out = new Set<string>();
      for (const l of links ?? []) {
        const m = byConvId.get(l.conversation_id);
        if (m) out.add(m.phoneKey);
      }
      return out;
    }

    case "has_sale_any": {
      const data = await fetchAll<any>((from, to) => supabase
        .from("crm_sales").select("contact_id")
        .eq("user_id", userId).neq("status", "rejected").range(from, to), "id");
      return fromContactIds(data);
    }

    case "has_sale_product": {
      const data = await fetchAll<any>((from, to) => supabase
        .from("crm_sales").select("contact_id")
        .eq("user_id", userId).eq("product_id", filter.productId).neq("status", "rejected").range(from, to), "id");
      return fromContactIds(data);
    }

    case "has_sale_course": {
      const data = await fetchAll<any>((from, to) => supabase
        .from("crm_sales").select("contact_id")
        .eq("user_id", userId).eq("course_id", filter.courseId).neq("status", "rejected").range(from, to), "id");
      return fromContactIds(data);
    }

    // "Digital" agrupa productos de tipo archivo Y cursos: para el usuario del
    // CRM son lo mismo (algo que se entrega sin enviar nada físico).
    case "has_sale_digital": {
      const digitalIds = await fetchAll<any>((from, to) => supabase
        .from("crm_products").select("id")
        .eq("user_id", userId).eq("product_kind", "archivo").range(from, to), "id");
      const ids = digitalIds.map(p => p.id);

      const sales = await fetchAll<any>((from, to) => supabase
        .from("crm_sales").select("contact_id, product_id, course_id")
        .eq("user_id", userId).neq("status", "rejected").range(from, to), "id");

      const idSet = new Set(ids);
      const hits = sales.filter(s => s.course_id || (s.product_id && idSet.has(s.product_id)));
      return fromContactIds(hits);
    }

    case "has_sale_physical": {
      const physicalIds = await fetchAll<any>((from, to) => supabase
        .from("crm_products").select("id")
        .eq("user_id", userId).eq("product_kind", "fisico").range(from, to), "id");
      const idSet = new Set(physicalIds.map(p => p.id));
      if (!idSet.size) return new Set();

      const sales = await fetchAll<any>((from, to) => supabase
        .from("crm_sales").select("contact_id, product_id")
        .eq("user_id", userId).neq("status", "rejected").range(from, to), "id");
      return fromContactIds(sales.filter(s => s.product_id && idSet.has(s.product_id)));
    }

    case "has_sale_service": {
      const data = await fetchAll<any>((from, to) => supabase
        .from("crm_sales").select("contact_id")
        .eq("user_id", userId).eq("service_id", filter.serviceId).neq("status", "rejected").range(from, to), "id");
      return fromContactIds(data);
    }

    case "no_sale": {
      const data = await fetchAll<any>((from, to) => supabase
        .from("crm_sales").select("contact_id")
        .eq("user_id", userId).neq("status", "rejected").range(from, to), "id");
      const withSale = fromContactIds(data);
      // Quien no tiene ficha tampoco tiene ventas — cuenta como "sin compras".
      return new Set(base.filter(m => !withSale.has(m.phoneKey)).map(m => m.phoneKey));
    }

    case "has_appointment_ever": {
      const data = await fetchAll<any>((from, to) => supabase
        .from("crm_appointments").select("contact_id")
        .eq("user_id", userId).neq("status", "cancelled").range(from, to), "id");
      return fromContactIds(data);
    }

    case "has_appointment_recent": {
      const days = Number(filter.days ?? 30);
      const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
      const data = await fetchAll<any>((from, to) => supabase
        .from("crm_appointments").select("contact_id")
        .eq("user_id", userId).neq("status", "cancelled").gte("created_at", cutoff).range(from, to), "id");
      return fromContactIds(data);
    }

    case "has_wa_conversation":
      return new Set(base.filter(m => m.conversationId).map(m => m.phoneKey));

    case "country": {
      // Varios países en un solo filtro: un teléfono no puede ser de dos países
      // a la vez, así que separarlos en filtros distintos haría imposible el
      // modo "cumplir todos".
      const codes = (filter.codes ?? []).map(c => String(c).replace(/\D/g, "")).filter(Boolean);
      if (!codes.length) return new Set();
      return new Set(
        base.filter(m => codes.some(c => m.phoneKey.startsWith(c))).map(m => m.phoneKey),
      );
    }

    default:
      return new Set();
  }
}

// ─── Ventana de actividad real ────────────────────────────────────────────────

export async function activePhoneKeys(
  supabase: any,
  userId: string,
  hours: number,
  base: AudienceMember[],
): Promise<Set<string>> {
  const cutoff = new Date(Date.now() - hours * 3_600_000).toISOString();

  const convIds = base.map(m => m.conversationId).filter(Boolean) as string[];
  if (!convIds.length) return new Set();

  const byConvId = new Map<string, AudienceMember>();
  for (const m of base) if (m.conversationId) byConvId.set(m.conversationId, m);

  const out = new Set<string>();
  // Se pagina porque `.in()` con miles de ids revienta el límite de la URL.
  const CHUNK = 200;
  for (let i = 0; i < convIds.length; i += CHUNK) {
    const slice = convIds.slice(i, i + CHUNK);
    const data = await fetchAll<any>((from, to) => supabase
      .from("crm_wa_messages")
      .select("conversation_id")
      .eq("role", "user")
      .in("conversation_id", slice)
      .gte("created_at", cutoff)
      .range(from, to), "id");
    for (const r of data) {
      const m = byConvId.get(r.conversation_id);
      if (m) out.add(m.phoneKey);
    }
  }
  return out;
}

// ─── Audiencia final ──────────────────────────────────────────────────────────

export async function buildAudience(
  supabase: any,
  userId: string,
  audienceType: AudienceType,
  filters: WaAudienceFilter[],
  opts: { withinHours?: number; match?: AudienceMatch } = {},
): Promise<AudienceMember[]> {
  const base = await buildAudienceBase(supabase, userId);
  if (!base.length) return [];

  let result = base;

  if (audienceType !== "all" && filters.length) {
    const sets = await Promise.all(filters.map(f => filterPhoneKeys(supabase, userId, f, base)));

    // 'any' = unión (cumple al menos uno) · 'all' = intersección (los cumple todos)
    let matched: Set<string>;
    if ((opts.match ?? "any") === "all") {
      matched = new Set(sets[0] ?? []);
      for (const s of sets.slice(1)) matched = new Set([...matched].filter(k => s.has(k)));
    } else {
      matched = new Set(sets.flatMap(s => [...s]));
    }

    result = audienceType === "include"
      ? base.filter(m => matched.has(m.phoneKey))
      : base.filter(m => !matched.has(m.phoneKey));
  }

  // Tope duro de la ventana de Meta para mensajes libres. No es un filtro que
  // elija el usuario: sin esto el envío lo rechaza Meta.
  if (opts.withinHours != null) {
    const active = await activePhoneKeys(supabase, userId, opts.withinHours, base);
    result = result.filter(m => active.has(m.phoneKey));
  }

  return result;
}
