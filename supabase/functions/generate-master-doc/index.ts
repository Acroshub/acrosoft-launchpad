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

function val(data: Record<string, any>, id: string, fallback = ""): string {
  const v = data?.[id];
  if (v === null || v === undefined || v === "") return fallback;
  if (typeof v === "object") return JSON.stringify(v);
  return String(v).trim();
}

function formatDate(): string {
  return new Date().toLocaleDateString("es-ES", {
    year: "numeric", month: "long", day: "numeric",
  });
}

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
  businessName: string,
): string {
  if (serviceType === "landing") {
    return `## 🏗️ Estructura del Sitio Web

**Tipo: Landing Page** — 1 sola página con 7–10 secciones en scroll vertical. Adapta las secciones al rubro del negocio.

Secciones obligatorias (en este orden):
1. **Hero** — headline impactante, sub-headline, CTA principal
2. **Propuesta de Valor** — 3 beneficios clave en tarjetas
3. **Servicios** — los servicios del negocio con descripción y precio
4. **Sobre Nosotros** — historia, diferenciador, años de experiencia
5. **Testimonios** — reseñas de clientes (ver instrucciones de generación abajo)
6. **FAQ** — preguntas frecuentes (ver instrucciones de generación abajo)
7. **Contacto & CTA Final** — formulario, WhatsApp, mapa si aplica

Secciones opcionales según rubro (agrega si aplica):
- **Galería / Portfolio** — trabajos o proyectos realizados
- **Proceso / Cómo funciona** — pasos del servicio
- **Métricas / Social Proof** — números de clientes, años, proyectos`;
  }

  if (serviceType === "multipage") {
    return `## 🏗️ Estructura del Sitio Web

**Tipo: Website Multi-Página** — 6 páginas independientes. Adapta el contenido de cada página al rubro del negocio.

**Páginas obligatorias:**

### Página 1: Home
- Hero con headline + CTA principal
- Propuesta de valor (3 beneficios en tarjetas)
- Preview de servicios (máx 3 destacados con link a /servicios)
- Testimonios destacados (2-3)
- CTA final + contacto rápido

### Página 2: Servicios
- Listado completo de todos los servicios
- Cada servicio: nombre, descripción, precio, beneficios
- Marca el servicio estrella visualmente
- CTA en cada tarjeta (WhatsApp / formulario)

### Página 3: Sobre Nosotros
- Historia del negocio
- Misión, visión y valores
- Equipo (si aplica) o perfil del fundador
- Diferenciador competitivo
- Métricas / logros (si hay)

### Página 4: Galería / Portfolio
- Grid de trabajos, proyectos o fotos del negocio
- Filtros por categoría si aplica
- Ver instrucciones de generación con IA abajo

### Página 5: Testimonios
- Todas las reseñas de clientes
- Rating visual (estrellas)
- Botón para dejar reseña en Google
- Ver instrucciones de generación con IA abajo

### Página 6: Contacto
- Formulario de contacto
- WhatsApp directo (click-to-chat)
- Email
- Dirección + Google Maps embed (si hay dirección)
- Horario de atención
- Redes sociales`;
  }

  // booking
  return `## 🏗️ Estructura del Sitio Web

**Tipo: SaaS Booking System** — 6 páginas de website + 7ª página de reservas integrada con CRM.

**Páginas obligatorias:**

### Página 1: Home
- Hero con headline + CTA "Agendar ahora" prominente
- Propuesta de valor (3 beneficios clave)
- Preview de servicios con precios
- Testimonios destacados
- CTA final de reserva

### Página 2: Servicios
- Listado completo con precios y duración de cada servicio
- CTA "Reservar" en cada tarjeta → link a /agendar
- Marca el servicio estrella

### Página 3: Sobre Nosotros
- Historia del negocio y equipo
- Diferenciador y credenciales
- Métricas de confianza

### Página 4: Galería / Portfolio
- Trabajos, proyectos o fotos del espacio
- Ver instrucciones de generación con IA abajo

### Página 5: Testimonios
- Reseñas de clientes
- Botón Google Reviews
- Ver instrucciones de generación con IA abajo

### Página 6: Contacto
- Formulario + WhatsApp + Email
- Dirección + horario de atención
- Google Maps embed (si hay dirección)

### Página 7: Agendar Cita ⚡ (integración CRM)
- Usar el componente \`CalendarRenderer\` del proyecto Acrosoft
- **calendar_id del cliente: \`${calendarId ?? "PENDIENTE — asignar al activar cuenta SaaS"}\`**
- Mostrar disponibilidad en tiempo real
- Formulario de datos del cliente integrado
- Confirmación automática por email/WhatsApp`;
}

function buildPrompt(
  contactName: string,
  data: Record<string, any>,
  serviceName: string | null,
  serviceType: ServiceType,
  serviceBenefits: string[],
  calendarId: string | null,
): string {
  const businessName  = val(data, "ob-1-1") || contactName;
  const industry      = val(data, "ob-1-2", "No especificado");
  const city          = val(data, "ob-1-3", "No especificado");
  const years         = val(data, "ob-1-4");
  const description   = val(data, "ob-1-5", "No proporcionada");
  const history       = val(data, "ob-1-6");
  const colorPrimary  = val(data, "ob-3-2");
  const colorSecond   = val(data, "ob-3-3");
  const colorAccent   = val(data, "ob-3-4");
  const typography    = val(data, "ob-3-5");
  const visualStyle   = val(data, "ob-3-6");
  const ref1          = val(data, "ob-3-7");
  const ref2          = val(data, "ob-3-8");
  const ref3          = val(data, "ob-3-9");
  const idealClient   = val(data, "ob-5-1", "No especificado");
  const problem       = val(data, "ob-5-2", "No especificado");
  const differentiator = val(data, "ob-5-3", "No especificado");
  const whatsapp      = val(data, "ob-0-phone");
  const email         = val(data, "ob-0-email");
  const instagram     = val(data, "ob-7-5");
  const facebook      = val(data, "ob-7-6");
  const tiktok        = val(data, "ob-7-7");
  const address       = val(data, "ob-7-3");
  const domain        = val(data, "ob-7-8");
  const ctaGoal       = val(data, "ob-cta");

  // Schedule — can be object from schedule field
  const scheduleRaw = data?.["ob-7-4"];
  const schedule = scheduleRaw
    ? (typeof scheduleRaw === "string" ? scheduleRaw : JSON.stringify(scheduleRaw))
    : "No especificado";

  // Repeatable: services offered
  const services = data?.["ob-4-1"];
  let servicesText = "No especificados";
  if (Array.isArray(services) && services.length > 0) {
    servicesText = services
      .map((s: any, i: number) => {
        const name  = s?.["ob-4-1-1"] || `Servicio ${i + 1}`;
        const desc  = s?.["ob-4-1-2"] || "";
        const price = s?.["ob-4-1-3"] ? `Desde $${s["ob-4-1-3"]}` : "";
        const star  = s?.["ob-4-1-4"] ? " ⭐ ESTRELLA" : "";
        return `• ${name}${star}${desc ? `: ${desc}` : ""}${price ? ` (${price})` : ""}`;
      })
      .join("\n");
  }

  // Repeatable: testimonials
  const testimonials = data?.["ob-5-4"];
  const hasTestimonials = Array.isArray(testimonials) && testimonials.length > 0;
  let testimonialsText = "⚠️ NO PROPORCIONADOS — ver instrucciones de generación IA abajo";
  if (hasTestimonials) {
    testimonialsText = testimonials
      .map((t: any) => `"${t?.["ob-5-4-2"] || ""}" — ${t?.["ob-5-4-1"] || "Cliente"}`)
      .join("\n");
  }

  // Repeatable: FAQ
  const faq = data?.["ob-5-5"];
  const hasFaq = Array.isArray(faq) && faq.length > 0;
  let faqText = "⚠️ NO PROPORCIONADAS — ver instrucciones de generación IA abajo";
  if (hasFaq) {
    faqText = faq
      .map((q: any) => `P: ${q?.["ob-5-5-1"] || ""}\nR: ${q?.["ob-5-5-2"] || ""}`)
      .join("\n\n");
  }

  const planLabel = serviceName || "No especificado";
  const references = [ref1, ref2, ref3].filter(Boolean).join("\n") || "Ninguna";

  const benefitsSection = serviceBenefits.length > 0
    ? `\n━━━━━━━━━━━━━━━━━━━━ CARACTERÍSTICAS DEL PLAN CONTRATADO ━━━━━━━━━━━━━━━━━━━━\n\nEl plan "${planLabel}" incluye las siguientes características que DEBEN estar reflejadas en el sitio y en las instrucciones técnicas:\n${serviceBenefits.map(b => `• ${b}`).join("\n")}`
    : "";

  const ctaSection = ctaGoal
    ? `\n━━━━━━━━━━━━━━━━━━━━ OBJETIVO DE CONVERSIÓN DEL CLIENTE ━━━━━━━━━━━━━━━━━━━━\n\nEl cliente eligió como objetivo principal de su sitio: **${ctaGoal}**\nEste CTA debe ser el eje central del diseño — el Hero, el copy y la estructura deben orientarse a lograr esta acción.`
    : "";

  const siteStructure = buildSiteStructureInstructions(serviceType, calendarId, businessName);

  // Instructions for AI-generated content (no placeholders — Claude Code generates real content)
  const missingContentInstructions: string[] = [];
  if (!hasTestimonials) {
    missingContentInstructions.push(`**Testimonios (el cliente no los proporcionó):** Usa Claude Code para generar 3–5 testimonios realistas y creíbles para el rubro "${industry}" en "${city}". Los testimonios deben sonar auténticos: incluir nombre hispano genérico, valoración de 5 estrellas y un comentario específico sobre el servicio. Incluir también un botón "Déjanos tu reseña en Google" (el cliente configura el link después).`);
  }
  if (!hasFaq) {
    missingContentInstructions.push(`**FAQ (el cliente no las proporcionó):** Usa Claude Code para generar 5–7 preguntas frecuentes típicas y relevantes para el rubro "${industry}". Basar en: precios, tiempo de entrega/servicio, formas de pago, cobertura, cómo contratar. El contenido generado debe ser directamente usable, no genérico.`);
  }
  if (serviceType !== "landing") {
    missingContentInstructions.push(`**Galería / Portfolio (el cliente no cargó imágenes):** Usa Claude Code para generar la estructura del componente gallery con datos de ejemplo apropiados para el rubro "${industry}". Describe qué tipo de imágenes reales debería proveer el cliente para reemplazarlos (ej: fotos de trabajos terminados, del local, del equipo, etc.).`);
  }

  const missingSection = missingContentInstructions.length > 0
    ? `\n━━━━━━━━━━━━━━━━━━━━ CONTENIDO PENDIENTE (GENERAR CON IA) ━━━━━━━━━━━━━━━━━━━━\n\nEl cliente no proporcionó los siguientes contenidos. El desarrollador debe generarlos:\n\n${missingContentInstructions.join("\n\n")}`
    : "";

  const serviceTypeLabel = serviceType === "landing" ? "Landing Page"
    : serviceType === "multipage" ? "Website Multi-Página"
    : "SaaS Booking System";

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
${benefitsSection}${ctaSection}

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

${references}

━━━━━━━━━━━━━━━━━━━━ INSTRUCCIONES PARA GENERAR EL DOCUMENTO ━━━━━━━━━━━━━━━━━━━━

Genera el Documento Maestro completo en Markdown con EXACTAMENTE estas secciones (usa los emojis tal cual):

# Documento Maestro — ${businessName}
*Proyecto Web · ${serviceTypeLabel} · Acrosoft Labs · ${formatDate()}*

---

## 🎯 Resumen del Proyecto
Describe el tipo de proyecto (${serviceTypeLabel}), el objetivo principal del sitio${ctaGoal ? ` (el cliente eligió: "${ctaGoal}")` : ""}, la propuesta de valor del negocio y qué va a lograr el sitio para el cliente. Sé específico y motivador — este párrafo es lo primero que lee el desarrollador.

## 🏢 El Negocio
(Toda la info del negocio: descripción, historia, diferenciador, años de operación, rubro e industria.)

## 🎨 Identidad Visual
(Tabla con los colores en formato HEX — si no se proporcionaron valores HEX exactos, sugiere HEX aproximados basados en el nombre del color dado. Tipografía recomendada de Google Fonts. Estilo visual. Tono de comunicación recomendado para este negocio y su audiencia.)

## 📦 Servicios a Mostrar
(Lista detallada de todos los servicios con descripción y precios. Marca el servicio estrella. Incluye el tiempo estimado de entrega/duración si aplica al rubro.)

## 👥 Audiencia & Posicionamiento
(Cliente ideal, problema que resuelven, diferenciador. Agrega notas sobre el tono de voz recomendado para conectar con esa audiencia específica.)

## 💬 Testimonios
(Si los hay, formatearlos como tarjetas con nombre y rating. Si no hay, incluir los testimonios generados con IA — contenido real y usable, no placeholders.)

## ❓ FAQ
(Si los hay, formatearlos. Si no hay, incluir las FAQ generadas con IA — contenido real y usable, no placeholders.)

## 🌐 Contacto & Redes Sociales
(Todos los datos de contacto y redes. Formatear como lista limpia con iconos.)

## 🔗 Sitios de Referencia
(Listar como links clicables en Markdown: [dominio](url))

${siteStructure}

## ✅ Instrucciones para Claude Code
⚡ GENERA ESTO CON INTELIGENCIA — instrucciones técnicas profesionales y accionables:

1. **Stack:** React + Vite + TypeScript + Tailwind CSS + shadcn/ui
2. **Paleta de colores:** implementar en \`tailwind.config.ts\` con los HEX exactos (generar si no se proporcionaron)
3. **Tipografía:** qué Google Fonts usar, cómo configurarlas en Tailwind
4. **Estructura de archivos:** componentes clave con sus nombres de archivo
5. **Bilingüismo:** el sitio debe ser español/inglés — estrategia recomendada (i18n con react-i18next, toggle, o separado)
6. **Copy & tono:** basado en el negocio, rubro y audiencia ideal — cómo hablar al cliente ideal
7. **Objetivo de conversión principal:** ${ctaGoal || "definir según rubro"} — cómo el diseño y el copy deben orientarse a esta acción
8. **Características del plan a implementar:** ${serviceBenefits.length > 0 ? serviceBenefits.join(", ") : "según el plan contratado"}
9. **SEO:** keywords principales para el rubro + ciudad, estructura de headings, schema markup recomendado
10. **Contenido generado con IA:** para cada sección sin datos del cliente (testimonios, FAQ, galería), el contenido generado debe ser directamente implementable — no placeholders, sino contenido real que el cliente puede aprobar o ajustar
${serviceType === "booking" ? `11. **Integración CalendarRenderer:** el componente \`CalendarRenderer\` recibe \`calendarId="${calendarId ?? "ID_PENDIENTE"}"\` como prop — importar desde el proyecto Acrosoft CRM. El cliente gestiona su disponibilidad desde su panel.` : ""}

REGLAS CRÍTICAS:
- Todo en español (excepto código, términos técnicos y nombres de librerías)
- Sé ESPECÍFICO — evita consejos genéricos que no aporten valor
- El documento final debe ser suficientemente detallado para que un desarrollador empiece a construir SIN hacer preguntas adicionales
- Calidad Anthropic — este documento representa el nivel de excelencia del servicio de Acrosoft Labs`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { contact_id, form_id, data, user_id } = await req.json();

    if (!contact_id || !user_id) {
      return respond({ error: "contact_id and user_id are required" }, 400);
    }

    // ── 1. Load contact (with custom_fields for _saas_calendar_id) ─────────────
    const { data: contact, error: contactError } = await supabase
      .from("crm_contacts")
      .select("id, name, custom_fields")
      .eq("id", contact_id)
      .single();

    if (contactError || !contact) {
      return respond({ error: "Contact not found" }, 404);
    }

    // ── 2. Resolve service info from ob-2-1 (selected plan) ───────────────────
    let serviceName: string | null = null;
    let serviceBenefits: string[] = [];
    let isSaas = false;
    const selectedServiceId = data?.["ob-2-1"];
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

    // ── 3. Detect service type and resolve calendar_id ─────────────────────────
    const serviceType = detectServiceType(serviceName, isSaas);
    let calendarId: string | null = null;
    if (serviceType === "booking") {
      const cf = contact.custom_fields as Record<string, any> | null;
      calendarId = cf?.["_saas_calendar_id"] ?? null;
    }

    // ── 4. Call Anthropic API ──────────────────────────────────────────────────
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      console.error("ANTHROPIC_API_KEY is not set — skipping document generation");
      return respond({ error: "ANTHROPIC_API_KEY not configured" }, 503);
    }

    const prompt = buildPrompt(
      contact.name,
      data ?? {},
      serviceName,
      serviceType,
      serviceBenefits,
      calendarId,
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

    // ── 5. Upload .md to Storage ───────────────────────────────────────────────
    const filePath = `${user_id}/${contact_id}.md`;

    const { error: uploadError } = await supabase.storage
      .from("master-docs")
      .upload(filePath, new Blob([mdContent], { type: "text/markdown; charset=utf-8" }), {
        upsert: true,
        contentType: "text/markdown; charset=utf-8",
      });

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    // ── 6. Update contact with doc path ───────────────────────────────────────
    await supabase
      .from("crm_contacts")
      .update({ master_doc_url: filePath })
      .eq("id", contact_id);

    // ── 7. Log ─────────────────────────────────────────────────────────────────
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
