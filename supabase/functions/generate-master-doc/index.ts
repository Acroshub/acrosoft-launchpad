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

Secciones obligatorias **en este orden CRO-optimizado**:
1. **Hero** — headline orientado al RESULTADO del cliente (no al servicio), sub-headline, CTA principal + CTA secundario WhatsApp
2. **¿Qué pasa después?** — 3 pasos visuales (agenda → nosotros construimos → tú creces). Reduce ansiedad de contacto
3. **Antes / Después** — contraste visual del dolor vs. la solución. Máximo impacto emocional
4. **Testimonios** ← ANTES de precios. La prueba social debe aparecer ANTES del ask económico
5. **Servicios** — los servicios con descripción, precio y CTA en cada tarjeta
6. **Cómo Funciona** — pasos del proceso
7. **Por qué Nosotros** — diferenciador, garantías, checklist de beneficios
8. **Precios / Planes** — con ancla de valor (precio de mercado tachado o comparación competidores)
9. **FAQ** ← JUSTO DESPUÉS de precios. Las objeciones se responden en el punto de decisión
10. **Garantía** — reversal de riesgo antes del CTA final
11. **CTA Final** — con todos los trust signals (sin contrato, sin tarjeta, etc.)

Secciones opcionales según rubro (agrega si aplica):
- **Galería / Portfolio** — trabajos o proyectos realizados
- **Métricas / Social Proof** — números de clientes, años, proyectos`;
  }

  if (serviceType === "multipage") {
    return `## 🏗️ Estructura del Sitio Web

**Tipo: Website Multi-Página** — 6 páginas independientes. Adapta el contenido de cada página al rubro del negocio.

### Página 1: Home (CRO-optimizada)
- Hero: headline de RESULTADO, CTA principal + CTA secundario WhatsApp
- Barra "¿Qué pasa después?" — 3 pasos para reducir ansiedad
- Testimonios destacados (2-3) ← ANTES de la preview de servicios
- Preview de servicios (máx 3 con link a /servicios)
- Garantía / trust signals prominentes
- CTA final con risk reversal

### Página 2: Servicios
- Ancla de valor al inicio: "Lo que otras agencias cobran vs. nosotros"
- Listado completo con descripción, precio y beneficios
- Marca el servicio estrella visualmente con badge
- CTA en cada tarjeta (WhatsApp / formulario)
- Risk reversal bajo cada CTA: "Sin contrato · Precio fijo"

### Página 3: Sobre Nosotros
- Historia del negocio con detalles específicos (años, logros, número de clientes)
- Diferenciador competitivo con prueba concreta
- Fotos reales > ilustraciones (pedir al cliente)

### Página 4: Galería / Portfolio
- Grid de trabajos con resultados/métricas donde aplique
- Ver instrucciones de generación con IA abajo

### Página 5: Testimonios
- Badges de resultado en cada testimonio (ej. "+40% clientes", "Agenda llena")
- Botón Google Reviews
- Ver instrucciones de generación con IA abajo

### Página 6: Contacto
- Múltiples canales: Formulario + WhatsApp directo + Email + Tel
- Dirección + Google Maps embed + Horario de atención
- "Respondemos en menos de X horas" — expectativa concreta`;
  }

  return `## 🏗️ Estructura del Sitio Web

**Tipo: SaaS Booking System** — 6 páginas de website + 7ª página de reservas integrada con CRM.

### Página 1: Home (CRO-optimizada)
- Hero con calendario de agendamiento VISIBLE above the fold — es el CTA principal
- Chip de urgencia/disponibilidad: "X horarios disponibles esta semana"
- Testimonios (2-3) antes de la preview de servicios
- Garantía y trust signals prominentes

### Página 2: Servicios
- Listado con precios, duración y CTA "Reservar" en cada tarjeta → /agendar
- Ancla de valor vs. competidores si aplica

### Página 3: Sobre Nosotros
- Historia, diferenciador, credenciales y métricas de confianza

### Página 4: Galería / Portfolio
- Ver instrucciones de generación con IA abajo

### Página 5: Testimonios
- Badges de resultado en cada testimonio
- Botón Google Reviews
- Ver instrucciones de generación con IA abajo

### Página 6: Contacto
- Formulario + WhatsApp + Email + Dirección + Google Maps + Horario

### Página 7: Agendar Cita ⚡ (integración CRM)
- Componente \`CalendarRenderer\` del proyecto Acrosoft
- **calendar_id del cliente: \`${calendarId ?? "PENDIENTE — asignar al activar cuenta SaaS"}\`**
- Disponibilidad en tiempo real, formulario integrado, confirmación automática`;
}

function buildCROInstructions(serviceType: ServiceType, ctaGoal: string, industry: string): string {
  const ctaNote = ctaGoal ? `El CTA principal del cliente es: **"${ctaGoal}"**. Todo el CRO debe orientarse a lograr esa acción.` : "";

  return `## 🔥 Reglas CRO Obligatorias (Conversion Rate Optimization)

> Estas reglas son **NO NEGOCIABLES**. Cada una tiene impacto directo en la tasa de conversión. Impleméntalas todas.

${ctaNote}

### 1. Jerarquía de Prueba Social
- **Testimonios SIEMPRE antes de precios.** La prueba social reduce la resistencia al precio.
- Cada testimonio debe incluir un **badge de resultado específico** (ej. "+40% clientes", "Agenda llena en 2 semanas", "0 cancelaciones"). El resultado va en un chip de color verde/esmeralda.
- Usar nombres y ciudades reales/verosímiles. Foto si el cliente la provee; avatar de iniciales si no.
- Mínimo 3 testimonios. Si el cliente no los da, generarlos con IA específicos para el rubro "${industry}".

### 2. FAQ en el Punto de Decisión
- Las preguntas frecuentes van **inmediatamente después de los precios/planes**, nunca al final.
- Las preguntas deben responder las principales objeciones de compra: precio, tiempo de entrega, contrato, propiedad del sitio, soporte.
- Usar acordeón (expand/collapse) para no saturar visualmente.

### 3. Risk Reversal en Cada CTA
- **Bajo CADA botón de acción** incluir una línea de micro-copy con trust signals:
  \`Sin contrato · Sin tarjeta requerida · Respuesta en 24h\`
- En la sección de precios agregar un trust strip horizontal: 3 íconos con texto (Sin permanencia / Precio fijo / Soporte en español).
- En el CTA final: lista horizontal con checkmarks verdes de todos los trust signals.

### 4. Ancla de Valor en Precios
- Antes o junto a los precios, mostrar comparación: *"Agencias americanas cobran $3,000–$10,000. Nosotros lo hacemos por una fracción."*
- Si el cliente tiene precio de lista y precio con descuento, mostrar el original tachado.
- Marcar el plan recomendado con badge dorado "MÁS RECOMENDADO" y borde diferenciado.

### 5. Reducir Ansiedad de Contacto
- Agregar una sección visual **"¿Qué pasa después de contactarnos?"** con 3 pasos simples:
  1. Agendas la llamada (gratis, 30 min)
  2. Te contamos el plan (sin presión)
  3. Tu sitio en X días
- Ubicarla justo después del Hero o después del primer CTA importante.

### 6. Botón Flotante de WhatsApp
- Implementar botón fijo (fixed position) en esquina inferior derecha, color #25D366.
- Solo visible si el cliente tiene número de WhatsApp. Usar SVG oficial de WhatsApp.
- Mensaje pre-cargado: "Hola, vi su sitio web y me gustaría saber más sobre sus servicios."
- En mobile: ubicar a \`bottom-20 right-4\` para no tapar la barra sticky.

### 7. Barra Sticky en Mobile
- En pantallas pequeñas: barra fija en la parte inferior con el CTA principal.
- Fondo semitransparente con blur. Texto: "Agendar [servicio] Gratis →"
- Agregar \`pb-16 sm:pb-0\` al contenedor principal para que no tape contenido.

### 8. Headline Orientado al Resultado
- El headline del Hero NO debe describir el servicio. Debe describir el **resultado que obtiene el cliente**.
- ❌ Mal: "Creamos sitios web profesionales"
- ✅ Bien: "Llena tu agenda con clientes nuevos — sin pagar $5,000 a una agencia americana"
- El sub-headline explica EL CÓMO (bilingüe, rápido, precio justo).

### 9. Urgencia / Escasez Real
- Agregar un elemento de urgencia creíble: "Agenda disponible esta semana" con punto verde pulsante.
- No usar contadores falsos. Usar disponibilidad real del calendario si aplica.
- Para landing de servicios: "Solo atendemos X proyectos por mes" si es verdad.

### 10. Contraste Visual Antes / Después
- Incluir sección de contraste "Sin nosotros vs. Con nosotros" con listas paralelas.
- La columna izquierda (dolor) en tonos grises/rojos. La derecha (solución) en azul/verde.
- Items específicos del rubro "${industry}" — no genéricos.

### 11. Especificidad en Números
- Usar números exactos cuando sea posible: "53 clientes atendidos" es más creíble que "+50".
- Tiempo de entrega exacto: "7 días hábiles" > "rápido".
- Stats en el Hero deben ser verificables y específicos del negocio.

### 12. Múltiples Canales de Contacto
- Siempre ofrecer al menos 2 formas de contacto: calendario de agendamiento + WhatsApp.
- El calendario reduce fricción al máximo (no requiere llamar, agenda 24/7).
- WhatsApp para quienes prefieren texto antes de comprometerse.${serviceType === "booking" ? `

### 13. CRO Específico para Booking Systems
- El **calendario de disponibilidad debe estar above the fold** en el Hero — es el CTA principal.
- Mostrar "X horarios disponibles esta semana" para crear urgencia real basada en disponibilidad.
- Agregar confirmación inmediata post-booking: "Tu cita está confirmada. Recibirás un recordatorio por WhatsApp."
- En cada tarjeta de servicio: botón "Reservar ahora" → lleva directo al calendario con ese servicio pre-seleccionado.` : ""}`;
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
  const croSection = buildCROInstructions(serviceType, ctaGoal, industry);
  const uiSkillCommand = `python3 skills/ui-ux-pro-max/scripts/search.py "${industry} service" --design-system -p "${businessName}" --persist`;

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

## 🎨 Skill Obligatoria: UI/UX Pro Max

**ANTES de escribir una sola línea de código**, ejecutar este comando en Claude Code:

\`\`\`bash
${uiSkillCommand}
\`\`\`

Este comando genera el **Design System Maestro** (\`design-system/MASTER.md\`) con:
- Paleta de colores recomendada para el rubro "${industry}"
- Tipografías de Google Fonts óptimas para el estilo visual
- Estilo UI (glassmorphism, minimal, neobrutalist, etc.)
- Anti-patrones a evitar según el tipo de producto

**Reglas de uso del Design System:**
1. Después de ejecutar el skill, abrir \`design-system/MASTER.md\` y seguir TODAS sus recomendaciones.
2. Si el cliente especificó colores/tipografía en la sección "Identidad Visual" arriba, esos colores tienen **prioridad** — combinarlos con el Design System generado.
3. Para páginas individuales con necesidades distintas, ejecutar también: \`python3 skills/ui-ux-pro-max/scripts/search.py "${industry}" --design-system --persist --page "nombre-pagina"\`
4. Nunca usar emojis como íconos — usar exclusivamente SVG (Heroicons, Lucide, Simple Icons).
5. Verificar antes de entregar: contraste de color ≥ 4.5:1, touch targets ≥ 44px, sin scroll horizontal en mobile.

${croSection}

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
      console.error(`generate-master-doc Anthropic error ${aiRes.status}:`, errBody);
      throw new Error("Error al generar el documento con IA");
    }

    const aiData = await aiRes.json();
    const mdContent: string = aiData.content?.[0]?.text ?? "";
    if (!mdContent) throw new Error("Error al generar el documento con IA");

    // ── 6. Upload .md to Storage ───────────────────────────────────────────────
    const filePath = `${user_id}/${contact_id}.md`;
    const { error: uploadError } = await supabase.storage
      .from("master-docs")
      .upload(filePath, new Blob([mdContent], { type: "text/markdown; charset=utf-8" }), {
        upsert: true,
        contentType: "text/markdown; charset=utf-8",
      });

    if (uploadError) {
      console.error("generate-master-doc storage upload error:", uploadError);
      throw new Error("Error al guardar el documento generado");
    }

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
    console.error("generate-master-doc error:", err);
    const msg = err instanceof Error ? err.message : "Error inesperado al generar el documento";
    return respond({ error: msg }, 500);
  }
});
