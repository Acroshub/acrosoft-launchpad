-- ══════════════════════════════════════════════════════════════════════════════
-- Onboarding v4 — Contact-first page + subtitle support + RLS for public reads
-- Form ID: b733e0c5-60d4-414d-896a-5ce459b07eaf
-- Run in: Supabase → SQL Editor
-- ══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Allow anonymous (public) reads on crm_forms ───────────────────────────
-- Needed so /onboarding can load form config without user authentication.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'crm_forms'
      AND policyname = 'Public can read forms'
  ) THEN
    CREATE POLICY "Public can read forms"
      ON crm_forms FOR SELECT
      USING (true);
  END IF;
END $$;

-- ─── 2. Allow anonymous reads on crm_services ─────────────────────────────────
-- Needed so the "services" field type (plan selector) works publicly.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'crm_services'
      AND policyname = 'Public can read services'
  ) THEN
    CREATE POLICY "Public can read services"
      ON crm_services FOR SELECT
      USING (true);
  END IF;
END $$;

-- ─── 3. Rebuild Onboarding Oficial form with new structure ────────────────────
-- Changes vs v3:
--   • NEW first section "sec-contact": Nombre (locked) + Correo (locked) + WhatsApp (required)
--   • All existing sections shifted (sec-1 … sec-7 keep their IDs)
--   • sec-7 "Contacto y Redes": removed ob-7-1 (phone) and ob-7-2 (email) — now on sec-contact
--   • Subtitles added to every section
--   • Section sec-8 "Confirmación" kept as isConfirmation page
UPDATE crm_forms
SET
  name         = 'Onboarding Oficial v4',
  multi_page   = true,
  submit_label = 'Confirmar y Enviar Brief',
  success_action  = 'popup',
  success_message = '¡Todo listo! Nuestro equipo revisará tu información y comenzará a trabajar en tu proyecto.',
  success_image   = 'logo',

  show_confirmation_step = false,
  confirmation_message   = 'Al hacer clic en el botón, nuestro equipo recibirá tu brief. Iniciaremos el proceso de diseño y copywriting profesional. Recibirás un correo electrónico de confirmación en los próximos minutos.',

  -- ── Sections ──────────────────────────────────────────────────────────────
  sections = '[
    {
      "id": "sec-contact",
      "name": "Datos de Contacto",
      "subtitle": "Comencemos con tu información básica. Te contactaremos a través de estos datos."
    },
    {
      "id": "sec-1",
      "name": "Tu Negocio",
      "subtitle": "Esta información es la base para crear tu sitio web profesional y bilingüe."
    },
    {
      "id": "sec-2",
      "name": "Plan de Servicio",
      "subtitle": "Selecciona el paquete que mejor se adapte a las necesidades de tu negocio."
    },
    {
      "id": "sec-3",
      "name": "Identidad Visual",
      "subtitle": "Tu imagen de marca define cómo te perciben tus clientes. Cuéntanos tu estilo."
    },
    {
      "id": "sec-4",
      "name": "Tus Servicios",
      "subtitle": "Describe los servicios que ofreces para que los mostremos en tu página web."
    },
    {
      "id": "sec-5",
      "name": "Tu Audiencia",
      "subtitle": "Conocer a tu cliente ideal nos permite crear mensajes que realmente conecten."
    },
    {
      "id": "sec-6",
      "name": "Contenido Visual",
      "subtitle": "Las imágenes y videos son el corazón de tu sitio web. Sube tu mejor material."
    },
    {
      "id": "sec-7",
      "name": "Redes y Presencia Digital",
      "subtitle": "Tu dirección, horario y redes sociales aparecerán en tu página web."
    },
    {
      "id": "sec-8",
      "name": "Confirmación",
      "isConfirmation": true
    }
  ]'::jsonb,

  -- ── Fields ────────────────────────────────────────────────────────────────
  fields = '[
    {
      "id": "ob-0-name",  "sectionId": "sec-contact",
      "label": "Nombre completo", "type": "text",
      "required": true, "locked": true,
      "placeholder": "Ej: María González"
    },
    {
      "id": "ob-0-email", "sectionId": "sec-contact",
      "label": "Correo electrónico", "type": "email",
      "required": true, "locked": true,
      "placeholder": "hola@tunegocio.com"
    },
    {
      "id": "ob-0-phone", "sectionId": "sec-contact",
      "label": "WhatsApp", "type": "phone",
      "required": true,
      "placeholder": "+1 (000) 000-0000"
    },

    {
      "id": "ob-1-1", "sectionId": "sec-1",
      "label": "Nombre del negocio", "type": "text",
      "required": true, "placeholder": "Ej: El Sabor de México"
    },
    {
      "id": "ob-1-2", "sectionId": "sec-1",
      "label": "Rubro / Industria", "type": "select",
      "required": true,
      "options": ["Restaurante / Comida", "Salón de belleza / Barbería", "Construcción / Remodelación", "Clínica / Salud", "Servicios profesionales", "E-commerce / Tienda", "Educación / Coaching", "Bienes raíces", "Tecnología", "Otro"],
      "multiSelect": false
    },
    {
      "id": "ob-1-3", "sectionId": "sec-1",
      "label": "Ciudad y Estado", "type": "text",
      "required": true, "placeholder": "Ej: Miami, FL"
    },
    {
      "id": "ob-1-4", "sectionId": "sec-1",
      "label": "Años en operación", "type": "number",
      "required": false, "placeholder": "Ej: 5"
    },
    {
      "id": "ob-1-5", "sectionId": "sec-1",
      "label": "Descripción breve del negocio", "type": "textarea",
      "required": true,
      "placeholder": "Ej: Somos un restaurante familiar en Miami con más de 10 años sirviendo comida mexicana auténtica..."
    },
    {
      "id": "ob-1-6", "sectionId": "sec-1",
      "label": "Historia del negocio", "type": "textarea",
      "required": false,
      "placeholder": "¿Cómo empezó tu negocio? Cuéntanos tu historia y pasión."
    },

    {
      "id": "ob-2-1", "sectionId": "sec-2",
      "label": "Plan seleccionado", "type": "services",
      "required": true
    },

    {
      "id": "ob-3-1", "sectionId": "sec-3",
      "label": "Logo del negocio", "type": "file",
      "required": true
    },
    {
      "id": "ob-3-2", "sectionId": "sec-3",
      "label": "Color Primario", "type": "color",
      "required": false
    },
    {
      "id": "ob-3-3", "sectionId": "sec-3",
      "label": "Color Secundario", "type": "color",
      "required": false
    },
    {
      "id": "ob-3-4", "sectionId": "sec-3",
      "label": "Color de Acento", "type": "color",
      "required": false
    },
    {
      "id": "ob-3-5", "sectionId": "sec-3",
      "label": "Tipografía preferida", "type": "select",
      "required": false,
      "options": ["Moderna e Innovadora (Inter, Roboto)", "Clásica y Formal (Playfair, Lora)", "Cálida y Amigable (Outfit, Lexend)", "Elegante y Sofisticada (Montserrat, Lato)"],
      "multiSelect": false
    },
    {
      "id": "ob-3-6", "sectionId": "sec-3",
      "label": "Estilo visual", "type": "select",
      "required": false,
      "options": ["Minimalista y Limpio", "Profesional y Corporativo", "Creativo y Atrevido", "Cálido y Familiar"],
      "multiSelect": false
    },
    {
      "id": "ob-3-7", "sectionId": "sec-3",
      "label": "Sitio de referencia 1", "type": "url",
      "required": false, "placeholder": "https://ejemplo.com"
    },
    {
      "id": "ob-3-8", "sectionId": "sec-3",
      "label": "Sitio de referencia 2", "type": "url",
      "required": false, "placeholder": "https://ejemplo.com"
    },
    {
      "id": "ob-3-9", "sectionId": "sec-3",
      "label": "Sitio de referencia 3", "type": "url",
      "required": false, "placeholder": "https://ejemplo.com"
    },

    {
      "id": "ob-4-1", "sectionId": "sec-4",
      "label": "Servicios que ofreces", "type": "repeatable",
      "required": true, "maxItems": 6,
      "subFields": [
        { "id": "ob-4-1-1", "label": "Nombre del servicio", "type": "text" },
        { "id": "ob-4-1-2", "label": "Descripción breve", "type": "textarea" },
        { "id": "ob-4-1-3", "label": "Precio / Desde ($)", "type": "number" },
        { "id": "ob-4-1-4", "label": "Servicio Estrella", "type": "checkbox" }
      ]
    },

    {
      "id": "ob-5-1", "sectionId": "sec-5",
      "label": "¿Quién es tu cliente ideal?", "type": "textarea",
      "required": true,
      "placeholder": "Ej: Madres latinas trabajadoras en Miami que buscan servicios rápidos y de confianza..."
    },
    {
      "id": "ob-5-2", "sectionId": "sec-5",
      "label": "¿Qué problema resuelves?", "type": "textarea",
      "required": true,
      "placeholder": "Ej: Ayudamos a que las familias dejen de preocuparse por la limpieza de su hogar..."
    },
    {
      "id": "ob-5-3", "sectionId": "sec-5",
      "label": "¿Qué te hace diferente de la competencia?", "type": "textarea",
      "required": true,
      "placeholder": "Ej: Garantía de satisfacción, somos bilingües y usamos productos orgánicos certificados..."
    },
    {
      "id": "ob-5-4", "sectionId": "sec-5",
      "label": "Testimonios de clientes", "type": "repeatable",
      "required": false, "maxItems": 3,
      "subFields": [
        { "id": "ob-5-4-1", "label": "Nombre del cliente", "type": "text" },
        { "id": "ob-5-4-2", "label": "Testimonio", "type": "textarea" }
      ]
    },
    {
      "id": "ob-5-5", "sectionId": "sec-5",
      "label": "Preguntas frecuentes (FAQ)", "type": "repeatable",
      "required": false, "maxItems": 5,
      "subFields": [
        { "id": "ob-5-5-1", "label": "Pregunta", "type": "text" },
        { "id": "ob-5-5-2", "label": "Respuesta", "type": "textarea" }
      ]
    },

    {
      "id": "ob-6-1", "sectionId": "sec-6",
      "label": "Fotos del negocio (Galería principal)", "type": "file",
      "required": true
    },
    {
      "id": "ob-6-2", "sectionId": "sec-6",
      "label": "Fotos del equipo", "type": "file",
      "required": false
    },
    {
      "id": "ob-6-3", "sectionId": "sec-6",
      "label": "Video de presentación (opcional)", "type": "file",
      "required": false
    },

    {
      "id": "ob-7-3", "sectionId": "sec-7",
      "label": "Dirección física", "type": "address",
      "required": false, "placeholder": "Ej: 123 Miami St, FL 33101"
    },
    {
      "id": "ob-7-4", "sectionId": "sec-7",
      "label": "Horario de atención", "type": "schedule",
      "required": false
    },
    {
      "id": "ob-7-5", "sectionId": "sec-7",
      "label": "Instagram", "type": "url",
      "required": false, "placeholder": "https://instagram.com/tu_usuario"
    },
    {
      "id": "ob-7-6", "sectionId": "sec-7",
      "label": "Facebook", "type": "url",
      "required": false, "placeholder": "https://facebook.com/tu_pagina"
    },
    {
      "id": "ob-7-7", "sectionId": "sec-7",
      "label": "TikTok", "type": "url",
      "required": false, "placeholder": "https://tiktok.com/@tu_usuario"
    },
    {
      "id": "ob-7-8", "sectionId": "sec-7",
      "label": "Dominio deseado para tu web", "type": "url",
      "required": false, "placeholder": "Ej: www.tunegocio.com"
    }
  ]'::jsonb

WHERE id = 'b733e0c5-60d4-414d-896a-5ce459b07eaf';
