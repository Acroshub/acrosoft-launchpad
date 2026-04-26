import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function val(map: Record<string, any>, key: string, fallback = ""): string {
  const v = map?.[key];
  if (v === null || v === undefined || v === "") return fallback;
  if (typeof v === "object") return JSON.stringify(v);
  return String(v).trim();
}

function formatDate(): string {
  return new Date().toLocaleDateString("es-ES", {
    year: "numeric", month: "long", day: "numeric",
  });
}

/** Flatten fields from form.fields and form.sections[].fields */
function getAllFields(form: any): any[] {
  const flat: any[] = [];
  if (Array.isArray(form.fields)) flat.push(...form.fields);
  if (Array.isArray(form.sections)) {
    for (const section of form.sections) {
      if (Array.isArray(section?.fields)) flat.push(...section.fields);
    }
  }
  return flat;
}

/**
 * Build a {doc_key: value} map from form fields.
 * Any field with a doc_key is included — admin can add new fields freely.
 */
function buildDocKeyMap(fields: any[], data: Record<string, any>): Record<string, any> {
  const map: Record<string, any> = {};
  for (const field of fields) {
    if (field.doc_key) {
      map[field.doc_key] = data[field.id];
    }
  }
  return map;
}

// doc_keys that are handled explicitly in the prompt — others go to "Información Adicional"
const KNOWN_DOC_KEYS = new Set([
  "contact_name", "contact_email", "contact_phone",
  "business_name", "industry", "city", "years", "description", "history",
  "selected_service", "logo",
  "color_primary", "color_secondary", "color_accent", "typography", "visual_style",
  "ref_1", "ref_2", "ref_3",
  "services_offered",
  "ideal_client", "problem", "differentiator",
  "testimonials", "faq",
  "gallery", "gallery_2", "gallery_3",
  "address", "schedule", "instagram", "facebook", "tiktok", "domain",
  "cta_goal",
]);

type ServiceType = "landing" | "multipage" | "booking";

function detectServiceType(serviceName: string | null, isSaas: boolean): ServiceType {
  if (isSaas) return "booking";
  const lower = (serviceName ?? "").toLowerCase();
  if (lower.includes("booking") || lower.includes("reserva") || lower.includes("cita")) return "booking";
  if (lower.includes("landing")) return "landing";
  return "multipage";
}

function buildSiteStructureInstructions(
  serviceType: ServiceType,
  calendarId: string | null,
): string {
  if (serviceType === "landing") {
    return `## 🏗️ Estructura del Sitio Web

**Tipo: Landing Page** — 1 sola página con 7–10 secciones en scroll vertical. Adapta las secciones al rubro del negocio.

Secciones obligatorias (en este orden):
1. **Hero** — headline impactante, sub-headline, CTA principal
2. **Propuesta de Valor** — 3 beneficios clave en tarjetas
3. **Servicios** — los servicios del negocio con descripción y precio
4. **Sobre Nosotros** — historia, diferenciador, años de experiencia
5. **Testimonios** — reseñas de clientes (ver instrucciones de generación con IA abajo)
6. **FAQ** — preguntas frecuentes (ver instrucciones de generación con IA abajo)
7. **Contacto & CTA Final** — formulario, WhatsApp, mapa si aplica

Secciones opcionales según rubro (agrega si aplica):
- **Galería / Portfolio** — trabajos o proyectos realizados
- **Proceso / Cómo funciona** — pasos del servicio
- **Métricas / Social Proof** — números de clientes, años, proyectos`;
  }

  if (serviceType === "multipage") {
    return `## 🏗️ Estructura del Sitio Web

**Tipo: Website Multi-Página** — 6 páginas independientes. Adapta el contenido de cada página al rubro del negocio.

### Página 1: Home
- Hero con headline + CTA principal
- Propuesta de valor (3 beneficios en tarjetas)
- Preview de servicios (máx 3 destacados con link a /servicios)
- Testimonios destacados (2-3)
- CTA final + contacto rápido

### Página 2: Servicios
- Listado completo de todos los servicios con descripción, precio y beneficios
- Marca el servicio estrella visualmente
- CTA en cada tarjeta (WhatsApp / formulario)

### Página 3: Sobre Nosotros
- Historia del negocio, misión, visión y valores
- Diferenciador competitivo y métricas/logros

### Página 4: Galería / Portfolio
- Grid de trabajos, proyectos o fotos del negocio
- Ver instrucciones de generación con IA abajo

### Página 5: Testimonios
- Todas las reseñas con rating visual y botón Google Reviews
- Ver instrucciones de generación con IA abajo

### Página 6: Contacto
- Formulario + WhatsApp directo + Email
- Dirección + Google Maps embed + Horario de atención`;
  }

  return `## 🏗️ Estructura del Sitio Web

**Tipo: SaaS Booking System** — 6 páginas de website + 7ª página de reservas integrada con CRM.

### Página 1: Home
- Hero con CTA "Agendar ahora" prominente, propuesta de valor, preview de servicios y testimonios

### Página 2: Servicios
- Listado con precios y duración, CTA "Reservar" en cada tarjeta → /agendar

### Página 3: Sobre Nosotros
- Historia, diferenciador, credenciales y métricas de confianza

### Página 4: Galería / Portfolio
- Ver instrucciones de generación con IA abajo

### Página 5: Testimonios
- Reseñas con botón Google Reviews
- Ver instrucciones de generación con IA abajo

### Página 6: Contacto
- Formulario + WhatsApp + Email + Dirección + Google Maps + Horario

### Página 7: Agendar Cita ⚡ (integración CRM)
- Componente \`CalendarRenderer\` del proyecto Acrosoft
- **calendar_id del cliente: \`${calendarId ?? "PENDIENTE — asignar al activar cuenta SaaS"}\`**
- Disponibilidad en tiempo real, formulario integrado, confirmación automática`;
}

function buildPrompt(
  contactName: string,
  dk: Record<string, any>,   // doc_key map
  serviceName: string | null,
  serviceType: ServiceType,
  serviceBenefits: string[],
  calendarId: string | null,
  extraFields: { label: string; value: string }[],
): string {
  const businessName   = val(dk, "business_name") || contactName;
  const industry       = val(dk, "industry", "No especificado");
  const city           = val(dk, "city", "No especificado");
  const years          = val(dk, "years");
  const description    = val(dk, "description", "No proporcionada");
  const history        = val(dk, "history");
  const colorPrimary   = val(dk, "color_primary");
  const colorSecond    = val(dk, "color_secondary");
  const colorAccent    = val(dk, "color_accent");
  const typography     = val(dk, "typography");
  const visualStyle    = val(dk, "visual_style");
  const idealClient    = val(dk, "ideal_client", "No especificado");
  const problem        = val(dk, "problem", "No especificado");
  const differentiator = val(dk, "differentiator", "No especificado");
  const whatsapp       = val(dk, "contact_phone");
  const email          = val(dk, "contact_email");
  const instagram      = val(dk, "instagram");
  const facebook       = val(dk, "facebook");
  const tiktok         = val(dk, "tiktok");
  const address        = val(dk, "address");
  const domain         = val(dk, "domain");
  const ctaGoal        = val(dk, "cta_goal");
  const refs           = [val(dk, "ref_1"), val(dk, "ref_2"), val(dk, "ref_3")].filter(Boolean).join("\n") || "Ninguna";

  const scheduleRaw = dk["schedule"];
  const schedule = scheduleRaw
    ? (typeof scheduleRaw === "string" ? scheduleRaw : JSON.stringify(scheduleRaw))
    : "No especificado";

  // Services offered (repeatable)
  const servicesOffered = dk["services_offered"];
  let servicesText = "No especificados";
  if (Array.isArray(servicesOffered) && servicesOffered.length > 0) {
    servicesText = servicesOffered
      .map((s: any, i: number) => {
        const name  = s?.["ob-4-1-1"] || `Servicio ${i + 1}`;
        const desc  = s?.["ob-4-1-2"] || "";
        const price = s?.["ob-4-1-3"] ? `Desde $${s["ob-4-1-3"]}` : "";
        const star  = s?.["ob-4-1-4"] ? " ⭐ ESTRELLA" : "";
        return `• ${name}${star}${desc ? `: ${desc}` : ""}${price ? ` (${price})` : ""}`;
      })
      .join("\n");
  }

  // Testimonials (repeatable)
  const testimonialsRaw = dk["testimonials"];
  const hasTestimonials = Array.isArray(testimonialsRaw) && testimonialsRaw.length > 0;
  let testimonialsText = "⚠️ NO PROPORCIONADOS — ver instrucciones de generación con IA abajo";
  if (hasTestimonials) {
    testimonialsText = testimonialsRaw
      .map((t: any) => `"${t?.["ob-5-4-2"] || ""}" — ${t?.["ob-5-4-1"] || "Cliente"}`)
      .join("\n");
  }

  // FAQ (repeatable)
  const faqRaw = dk["faq"];
  const hasFaq = Array.isArray(faqRaw) && faqRaw.length > 0;
  let faqText = "⚠️ NO PROPORCIONADAS — ver instrucciones de generación con IA abajo";
  if (hasFaq) {
    faqText = faqRaw
      .map((q: any) => `P: ${q?.["ob-5-5-1"] || ""}\nR: ${q?.["ob-5-5-2"] || ""}`)
      .join("\n\n");
  }

  const planLabel = serviceName || "No especificado";
  const serviceTypeLabel = serviceType === "landing" ? "Landing Page"
    : serviceType === "multipage" ? "Website Multi-Página"
    : "SaaS Booking System";

  const benefitsSection = serviceBenefits.length > 0
    ? `\n━━━━━━━━━━━━━━━━━━━━ CARACTERÍSTICAS DEL PLAN CONTRATADO ━━━━━━━━━━━━━━━━━━━━\n\nEl plan "${planLabel}" incluye las siguientes características que DEBEN estar reflejadas en el sitio:\n${serviceBenefits.map(b => `• ${b}`).join("\n")}`
    : "";

  const ctaSection = ctaGoal
    ? `\n━━━━━━━━━━━━━━━━━━━━ OBJETIVO DE CONVERSIÓN DEL CLIENTE ━━━━━━━━━━━━━━━━━━━━\n\nEl cliente eligió como objetivo principal de su sitio: **${ctaGoal}**\nEste CTA debe ser el eje central del diseño — Hero, copy y estructura deben orientarse a lograr esta acción.`
    : "";

  // Extra fields added by admin (unknown doc_keys)
  const extraSection = extraFields.length > 0
    ? `\n━━━━━━━━━━━━━━━━━━━━ INFORMACIÓN ADICIONAL ━━━━━━━━━━━━━━━━━━━━\n\nCampos extra del formulario — incluirlos en el documento donde aplique:\n${extraFields.map(f => `• ${f.label}: ${f.value}`).join("\n")}`
    : "";

  const missingContentInstructions: string[] = [];
  if (!hasTestimonials) {
    missingContentInstructions.push(`**Testimonios (el cliente no los proporcionó):** Genera 3–5 testimonios realistas y creíbles para el rubro "${industry}" en "${city}". Nombres hispanos genéricos, valoración de 5 estrellas, comentario específico del servicio. Incluir botón "Déjanos tu reseña en Google" (el cliente configura el link después).`);
  }
  if (!hasFaq) {
    missingContentInstructions.push(`**FAQ (el cliente no las proporcionó):** Genera 5–7 preguntas frecuentes para el rubro "${industry}". Basar en: precios, tiempo de entrega, formas de pago, cobertura, cómo contratar. Contenido directamente usable, no genérico.`);
  }
  if (serviceType !== "landing") {
    missingContentInstructions.push(`**Galería / Portfolio (sin imágenes):** Genera la estructura del componente gallery con datos de ejemplo para el rubro "${industry}". Describe qué imágenes reales debería proveer el cliente.`);
  }

  const missingSection = missingContentInstructions.length > 0
    ? `\n━━━━━━━━━━━━━━━━━━━━ CONTENIDO A GENERAR CON IA ━━━━━━━━━━━━━━━━━━━━\n\nEl cliente no proporcionó los siguientes contenidos. El desarrollador debe generarlos con Claude Code:\n\n${missingContentInstructions.join("\n\n")}`
    : "";

  const siteStructure = buildSiteStructureInstructions(serviceType, calendarId);

  return `Eres un experto en diseño y desarrollo web para pequeños negocios del mercado hispano.
Tu misión: generar un DOCUMENTO MAESTRO en Markdown para que un desarrollador use Claude Code y construya el sitio web de este cliente.

━━━━━━━━━━━━━━━━━━━━ DATOS DEL CLIENTE ━━━━━━━━━━━━━━━━━━━━

Nombre del contacto: ${contactName}
Nombre del negocio: ${businessName}
Rubro / Industria: ${industry}
Ciudad: ${city}
Años en operación: ${years || "No especificado"}
Plan contratado: ${planLabel} (${serviceTypeLabel})
${ctaGoal ? `Objetivo principal del sitio: ${ctaGoal}` : ""}

Descripción del negocio:
${description}

Historia del negocio:
${history || "No proporcionada"}

Diferenciador competitivo:
${differentiator}
${benefitsSection}${ctaSection}${extraSection}

━━━━━━━━━━━━━━━━━━━━ IDENTIDAD VISUAL ━━━━━━━━━━━━━━━━━━━━

Color Primario: ${colorPrimary || "No especificado"}
Color Secundario: ${colorSecond || "No especificado"}
Color de Acento: ${colorAccent || "No especificado"}
Tipografía preferida: ${typography || "No especificada"}
Estilo visual: ${visualStyle || "No especificado"}

━━━━━━━━━━━━━━━━━━━━ SERVICIOS QUE OFRECE ━━━━━━━━━━━━━━━━━━━━

${servicesText}

━━━━━━━━━━━━━━━━━━━━ AUDIENCIA Y POSICIONAMIENTO ━━━━━━━━━━━━━━━━━━━━

Cliente ideal: ${idealClient}
Problema que resuelven: ${problem}
Diferenciador: ${differentiator}

━━━━━━━━━━━━━━━━━━━━ TESTIMONIOS ━━━━━━━━━━━━━━━━━━━━

${testimonialsText}

━━━━━━━━━━━━━━━━━━━━ FAQ ━━━━━━━━━━━━━━━━━━━━

${faqText}
${missingSection}

━━━━━━━━━━━━━━━━━━━━ CONTACTO Y REDES ━━━━━━━━━━━━━━━━━━━━

WhatsApp: ${whatsapp || "No especificado"}
Email: ${email || "No especificado"}
Instagram: ${instagram || "No especificado"}
Facebook: ${facebook || "No especificado"}
TikTok: ${tiktok || "No especificado"}
Dirección física: ${address || "No especificado"}
Horario de atención: ${schedule}
Dominio deseado: ${domain || "No especificado"}

━━━━━━━━━━━━━━━━━━━━ SITIOS DE REFERENCIA ━━━━━━━━━━━━━━━━━━━━

${refs}

━━━━━━━━━━━━━━━━━━━━ INSTRUCCIONES PARA GENERAR EL DOCUMENTO ━━━━━━━━━━━━━━━━━━━━

Genera el Documento Maestro completo en Markdown con EXACTAMENTE estas secciones:

# Documento Maestro — ${businessName}
*Proyecto Web · ${serviceTypeLabel} · Acrosoft Labs · ${formatDate()}*

---

## 🎯 Resumen del Proyecto
Describe el tipo de proyecto (${serviceTypeLabel}), el objetivo principal${ctaGoal ? ` (el cliente eligió: "${ctaGoal}")` : ""}, la propuesta de valor y qué logrará el sitio para el cliente. Sé específico y motivador.

## 🏢 El Negocio
(Descripción, historia, diferenciador, años de operación, rubro e industria.)

## 🎨 Identidad Visual
(Tabla con colores en HEX — si no se dieron HEX exactos, sugiere aproximados basados en el nombre del color. Tipografía de Google Fonts. Estilo visual. Tono de comunicación recomendado.)

## 📦 Servicios a Mostrar
(Lista detallada con descripción, precios y duración. Marca el servicio estrella.)

## 👥 Audiencia & Posicionamiento
(Cliente ideal, problema, diferenciador. Tono de voz recomendado para esa audiencia.)

## 💬 Testimonios
(Si los hay, formatear como tarjetas con rating. Si no hay, generar con IA — contenido real y usable.)

## ❓ FAQ
(Si los hay, formatear. Si no hay, generar con IA — contenido real y usable.)

## 🌐 Contacto & Redes Sociales
(Lista limpia con iconos de todos los datos de contacto y redes.)

## 🔗 Sitios de Referencia
(Links clicables en Markdown: [dominio](url))

${siteStructure}

## ✅ Instrucciones para Claude Code
⚡ GENERA ESTO CON INTELIGENCIA — instrucciones técnicas profesionales y accionables:

1. **Stack:** React + Vite + TypeScript + Tailwind CSS + shadcn/ui
2. **Paleta de colores:** implementar en \`tailwind.config.ts\` con HEX exactos
3. **Tipografía:** Google Fonts a usar y cómo configurarlas en Tailwind
4. **Estructura de archivos:** componentes clave con nombres de archivo
5. **Bilingüismo:** estrategia ES/EN recomendada (react-i18next, toggle, o separado)
6. **Copy & tono:** cómo hablar al cliente ideal basado en el negocio y audiencia
7. **Objetivo de conversión:** ${ctaGoal || "definir según rubro"} — cómo orientar diseño y copy
8. **Características del plan:** ${serviceBenefits.length > 0 ? serviceBenefits.join(", ") : "según el plan contratado"}
9. **SEO:** keywords para el rubro + ciudad, headings, schema markup recomendado
10. **Contenido IA:** instrucciones para implementar cada sección generada con IA
${serviceType === "booking" ? `11. **CalendarRenderer:** \`calendarId="${calendarId ?? "ID_PENDIENTE"}"\` — importar desde Acrosoft CRM. El cliente gestiona su disponibilidad desde su panel.` : ""}

REGLAS CRÍTICAS:
- Todo en español (excepto código, términos técnicos y nombres de librerías)
- Sé ESPECÍFICO — sin consejos genéricos
- Suficientemente detallado para construir SIN preguntas adicionales
- Calidad Anthropic — representa la excelencia del servicio de Acrosoft Labs`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { contact_id, form_id, data, user_id } = await req.json();

    if (!contact_id || !user_id) {
      return respond({ error: "contact_id and user_id are required" }, 400);
    }

    // ── 1. Load contact ────────────────────────────────────────────────────────
    const { data: contact, error: contactError } = await supabase
      .from("crm_contacts")
      .select("id, name, custom_fields")
      .eq("id", contact_id)
      .single();

    if (contactError || !contact) {
      return respond({ error: "Contact not found" }, 404);
    }

    // ── 2. Load form schema and build doc_key map ──────────────────────────────
    let docKeyMap: Record<string, any> = {};
    let allFormFields: any[] = [];

    if (form_id) {
      const { data: form } = await supabase
        .from("crm_forms")
        .select("fields, sections")
        .eq("id", form_id)
        .single();
      if (form) {
        allFormFields = getAllFields(form);
        docKeyMap = buildDocKeyMap(allFormFields, data ?? {});
      }
    }

    // Collect extra fields (admin added with unknown doc_keys) for prompt
    const extraFields: { label: string; value: string }[] = [];
    for (const field of allFormFields) {
      if (field.doc_key && !KNOWN_DOC_KEYS.has(field.doc_key)) {
        const v = docKeyMap[field.doc_key];
        if (v !== null && v !== undefined && v !== "" && !Array.isArray(v)) {
          extraFields.push({ label: field.label ?? field.doc_key, value: String(v) });
        }
      }
    }

    // ── 3. Resolve service info ────────────────────────────────────────────────
    let serviceName: string | null = null;
    let serviceBenefits: string[] = [];
    let isSaas = false;
    const selectedServiceId = docKeyMap["selected_service"] ?? data?.["ob-2-1"];
    if (selectedServiceId && typeof selectedServiceId === "string") {
      const { data: svc } = await supabase
        .from("crm_services")
        .select("name, benefits, is_saas")
        .eq("id", selectedServiceId)
        .single();
      if (svc) {
        serviceName = svc.name ?? null;
        isSaas = svc.is_saas ?? false;
        if (Array.isArray(svc.benefits)) {
          serviceBenefits = svc.benefits.filter((b: any) => typeof b === "string");
        }
      }
    }

    // ── 4. Detect service type and calendar_id ─────────────────────────────────
    const serviceType = detectServiceType(serviceName, isSaas);
    let calendarId: string | null = null;
    if (serviceType === "booking") {
      const cf = contact.custom_fields as Record<string, any> | null;
      calendarId = cf?.["_saas_calendar_id"] ?? null;
    }

    // ── 5. Call Anthropic API ──────────────────────────────────────────────────
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return respond({ error: "ANTHROPIC_API_KEY not configured" }, 503);
    }

    const prompt = buildPrompt(
      contact.name,
      docKeyMap,
      serviceName,
      serviceType,
      serviceBenefits,
      calendarId,
      extraFields,
    );

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 8000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiRes.ok) {
      const errBody = await aiRes.text();
      throw new Error(`Anthropic API error ${aiRes.status}: ${errBody}`);
    }

    const aiData = await aiRes.json();
    const mdContent: string = aiData.content?.[0]?.text ?? "";
    if (!mdContent) throw new Error("Empty response from Anthropic API");

    // ── 6. Upload .md to Storage ───────────────────────────────────────────────
    const filePath = `${user_id}/${contact_id}.md`;
    const { error: uploadError } = await supabase.storage
      .from("master-docs")
      .upload(filePath, new Blob([mdContent], { type: "text/markdown; charset=utf-8" }), {
        upsert: true,
        contentType: "text/markdown; charset=utf-8",
      });

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    // ── 7. Update contact + log ────────────────────────────────────────────────
    await supabase.from("crm_contacts").update({ master_doc_url: filePath }).eq("id", contact_id);

    try {
      await supabase.from("crm_logs").insert({
        user_id,
        action: "create",
        entity: "master_doc",
        entity_id: contact_id,
        description: `Documento Maestro generado para ${contact.name} (${serviceName ?? "plan desconocido"})`,
      });
    } catch (_) { /* non-fatal */ }

    return respond({ master_doc_url: filePath, contact_id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("generate-master-doc error:", msg);
    return respond({ error: msg }, 500);
  }
});
