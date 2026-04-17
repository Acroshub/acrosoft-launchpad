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

function buildPrompt(
  contactName: string,
  data: Record<string, any>,
  serviceName: string | null,
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
  let testimonialsText = "Ninguno proporcionado";
  if (Array.isArray(testimonials) && testimonials.length > 0) {
    testimonialsText = testimonials
      .map((t: any) => `"${t?.["ob-5-4-2"] || ""}" — ${t?.["ob-5-4-1"] || "Cliente"}`)
      .join("\n");
  }

  // Repeatable: FAQ
  const faq = data?.["ob-5-5"];
  let faqText = "Ninguno proporcionado";
  if (Array.isArray(faq) && faq.length > 0) {
    faqText = faq
      .map((q: any) => `P: ${q?.["ob-5-5-1"] || ""}\nR: ${q?.["ob-5-5-2"] || ""}`)
      .join("\n\n");
  }

  const planLabel = serviceName || "No especificado";
  const references = [ref1, ref2, ref3].filter(Boolean).join("\n") || "Ninguna";

  return `Eres un experto en diseño y desarrollo web para pequeños negocios del mercado hispano.
Tu misión: generar un DOCUMENTO MAESTRO en Markdown para que un desarrollador use Claude Code y construya el sitio web de este cliente.

━━━━━━━━━━━━━━━━━━━━ DATOS DEL CLIENTE ━━━━━━━━━━━━━━━━━━━━

Nombre del contacto: ${contactName}
Nombre del negocio: ${businessName}
Rubro / Industria: ${industry}
Ciudad: ${city}
Años en operación: ${years || "No especificado"}
Plan contratado: ${planLabel}

Descripción del negocio:
${description}

Historia del negocio:
${history || "No proporcionada"}

Diferenciador competitivo:
${differentiator}

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
*Proyecto Web · Acrosoft Labs · ${formatDate()}*

---

## 🎯 Resumen del Proyecto
(Tipo de sitio basado en el plan. Landing Page = 1 página larga con CTA. Website Completo = landing + páginas internas. SaaS Booking = Website Completo + sistema de reservas CRM integrado. Incluye objetivo principal y propuesta de valor del sitio.)

## 🏢 El Negocio
(Toda la info del negocio: descripción, historia, diferenciador, años de operación.)

## 🎨 Identidad Visual
(Tabla con colores en formato HEX — si no se proporcionaron valores HEX exactos, sugiere HEX aproximados basados en el nombre del color dado. Tipografía. Estilo visual. Tono de comunicación recomendado para este negocio.)

## 📦 Servicios a Mostrar
(Lista detallada de todos los servicios con descripción y precios. Marca el servicio estrella.)

## 👥 Audiencia & Posicionamiento
(Cliente ideal, problema que resuelven, diferenciador. Añade notas sobre el tono de voz recomendado para conectar con esa audiencia.)

## 💬 Testimonios
(Si los hay, formatearlos. Si no hay, omitir esta sección.)

## ❓ FAQ
(Si los hay, formatearlos. Si no hay, omitir esta sección.)

## 🌐 Contacto & Redes Sociales
(Todos los datos de contacto y redes. Formatear como lista limpia.)

## 🔗 Sitios de Referencia
(Listar como links clicables en Markdown: [dominio](url))

## 🏗️ Estructura del Sitio Web
⚡ GENERA ESTO CON INTELIGENCIA basándote en el rubro y plan:
- Lista cada sección/página con nombre y descripción breve de su contenido
- Para Landing Page: 7-10 secciones en una sola página (Hero, Propuesta de valor, Servicios, etc.)
- Para Website Completo: páginas independientes + secciones de la landing
- Para SaaS Booking: igual que Website Completo + sección/página de Reservas con CRM
- Adapta las secciones específicamente al rubro del negocio (ej: para un restaurante incluye Menú; para una clínica incluye Especialidades)

## ✅ Instrucciones para Claude Code
⚡ GENERA ESTO CON INTELIGENCIA — instrucciones técnicas profesionales y accionables:
1. Stack a usar: React + Vite + TypeScript + Tailwind CSS + shadcn/ui
2. Paleta de colores exacta a implementar en el config de Tailwind (con los HEX)
3. Tipografía: qué Google Fonts usar y cómo configurarlas
4. Estructura de archivos sugerida (componentes clave)
5. Bilingüismo: el sitio debe ser español/inglés — estrategia recomendada (i18n, toggle, o secciones separadas)
6. Tono y estilo del copy basado en el negocio y audiencia
7. Componentes clave a construir (nombres específicos)
8. 3-5 recomendaciones especiales basadas en el rubro específico del negocio
9. SEO: keywords principales basadas en el negocio y ciudad
10. Cualquier integración o feature especial basada en el plan contratado

REGLAS CRÍTICAS:
- Todo en español (excepto código, terms técnicos, y nombres de librerías)
- Sé ESPECÍFICO — evita consejos genéricos
- El documento final debe ser suficientemente detallado para que un desarrollador empiece a construir sin hacer preguntas adicionales
- Calidad Anthropic — este documento representa el nivel de excelencia de nuestro servicio`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { contact_id, form_id, data, user_id } = await req.json();

    if (!contact_id || !user_id) {
      return respond({ error: "contact_id and user_id are required" }, 400);
    }

    // ── 1. Load contact name ───────────────────────────────────────────────────
    const { data: contact, error: contactError } = await supabase
      .from("crm_contacts")
      .select("id, name")
      .eq("id", contact_id)
      .single();

    if (contactError || !contact) {
      return respond({ error: "Contact not found" }, 404);
    }

    // ── 2. Resolve service name from ob-2-1 (selected plan) ───────────────────
    let serviceName: string | null = null;
    const selectedServiceId = data?.["ob-2-1"];
    if (selectedServiceId && typeof selectedServiceId === "string") {
      const { data: svc } = await supabase
        .from("crm_services")
        .select("name")
        .eq("id", selectedServiceId)
        .single();
      serviceName = svc?.name ?? null;
    }

    // ── 3. Call Anthropic API ──────────────────────────────────────────────────
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      console.error("ANTHROPIC_API_KEY is not set — skipping document generation");
      return respond({ error: "ANTHROPIC_API_KEY not configured" }, 503);
    }

    const prompt = buildPrompt(contact.name, data ?? {}, serviceName);

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

    // ── 4. Upload .md to Storage ───────────────────────────────────────────────
    const filePath = `${user_id}/${contact_id}.md`;

    const { error: uploadError } = await supabase.storage
      .from("master-docs")
      .upload(filePath, new Blob([mdContent], { type: "text/markdown; charset=utf-8" }), {
        upsert: true,
        contentType: "text/markdown; charset=utf-8",
      });

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    // ── 5. Update contact with doc path ───────────────────────────────────────
    await supabase
      .from("crm_contacts")
      .update({ master_doc_url: filePath })
      .eq("id", contact_id);

    // ── 6. Log ─────────────────────────────────────────────────────────────────
    try {
      await supabase.from("crm_logs").insert({
        user_id,
        action: "create",
        entity: "master_doc",
        entity_id: contact_id,
        description: `Documento Maestro generado para ${contact.name}`,
      });
    } catch (_) { /* non-fatal */ }

    return respond({ master_doc_url: filePath, contact_id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("generate-master-doc error:", msg);
    return respond({ error: msg }, 500);
  }
});
