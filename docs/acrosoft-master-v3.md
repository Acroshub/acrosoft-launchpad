# Acrosoft Labs — Documento Maestro del Sistema
> Versión 3.0 · Uso interno exclusivo · Confidencial
> Stack actualizado al proyecto real generado en Lovable

---

## 1. Visión General

Acrosoft Labs es una agencia de desarrollo web con vibecoding orientada a negocios latinos en Estados Unidos. Este documento define la arquitectura, flujo de trabajo y estructura técnica del sistema interno de onboarding y gestión de clientes.

**Alcance actual (MVP):** Single Page Website y Multi Page Website.
**Próximo update (v4.0):** Custom Booking — sistema de citas + dashboard Supabase.

---

## 2. Stack Tecnológico Real

| Capa | Tecnología | Versión | Propósito |
|---|---|---|---|
| Framework | Vite + React | 18.3.1 | SPA sin SSR |
| Lenguaje | TypeScript | 5.8.3 | Tipado estático |
| Routing | React Router DOM | v6.30.1 | Navegación entre rutas |
| Estilos | Tailwind CSS | 3.4.17 | UI y branding |
| Componentes | shadcn/ui (Radix UI) | — | UI components accesibles |
| Formularios | react-hook-form + zod | 7.61.1 + 3.25.76 | Validación de formularios |
| Estado servidor | TanStack Query | v5.83.0 | Fetching y caché de datos |
| Gráficas | Recharts | 2.15.4 | Dashboard de métricas admin |
| Iconos | Lucide React | 0.462.0 | Iconografía |
| Toasts | Sonner | 1.7.4 | Notificaciones UI |
| Temas | next-themes | 0.3.0 | Dark/light mode |
| Base de datos | Supabase (PostgreSQL) | — | Almacenamiento de submissions |
| Autenticación | Supabase Auth | — | Login del panel admin |
| Storage | Supabase Storage | — | Logo y fotos del cliente |
| API IA | Claude API vía Supabase Edge Function | claude-sonnet-4-20250514 | Generación de copy bilingüe |
| Emails | Resend vía Supabase Edge Function | — | Notificaciones internas |
| Deploy | Vercel | — | Hosting del frontend |
| Dominio | Cliente lo compra | — | Conectado por Acrosoft |

> **Importante:** Este proyecto es una SPA pura (Vite, sin servidor Node propio).
> Toda lógica que requiera claves secretas (Claude API, Resend) debe ejecutarse
> en **Supabase Edge Functions** — nunca exponer API keys en el frontend.

---

## 3. Dependencias Instaladas (package.json)

### Producción (ya disponibles, no reinstalar)
```
react-router-dom        → routing
react-hook-form         → formularios
zod                     → validación de esquemas
@tanstack/react-query   → fetching y caché
recharts                → gráficas del dashboard
lucide-react            → iconos
sonner                  → toasts
next-themes             → dark/light mode
date-fns                → manejo de fechas
embla-carousel-react    → carrusel (galería de fotos)
react-day-picker        → date picker en formularios
tailwind-merge + clsx   → utilidades de clases
class-variance-authority → variantes de componentes shadcn
vaul                    → drawer mobile
cmdk                    → command palette
input-otp               → inputs OTP (login admin)
```

### Por instalar (cuando se conecte Supabase)
```bash
npm install @supabase/supabase-js
```

### Variables de entorno requeridas (.env)
```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxx
# Las siguientes NUNCA van en el frontend — van en Supabase Edge Functions:
# ANTHROPIC_API_KEY=xxxx
# RESEND_API_KEY=xxxx
```

---

## 4. Estructura de Carpetas del Proyecto

```
src/
├── main.tsx                  → Entry point
├── App.tsx                   → Router principal con <Routes>
├── index.css                 → Estilos globales + variables Tailwind
│
├── pages/
│   ├── Index.tsx             → Ruta / (landing page)
│   ├── Onboarding.tsx        → Ruta /onboarding (stepper)
│   ├── Admin.tsx             → Ruta /admin (login)
│   ├── AdminDashboard.tsx    → Ruta /admin/dashboard
│   └── AdminClient.tsx       → Ruta /admin/client/:id
│
├── components/
│   ├── ui/                   → shadcn/ui (no modificar directamente)
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   └── Footer.tsx
│   ├── landing/
│   │   ├── Hero.tsx
│   │   ├── Plans.tsx
│   │   ├── HowItWorks.tsx
│   │   └── WhyAcrosoft.tsx
│   ├── onboarding/
│   │   ├── StepperHeader.tsx
│   │   ├── Step1Business.tsx
│   │   ├── Step2Plan.tsx
│   │   ├── Step3Identity.tsx
│   │   ├── Step4Services.tsx
│   │   ├── Step5Audience.tsx
│   │   ├── Step6Content.tsx
│   │   ├── Step7Contact.tsx
│   │   └── Step8Confirm.tsx
│   ├── admin/
│   │   ├── LoginForm.tsx
│   │   ├── ClientsTable.tsx
│   │   ├── MetricsCards.tsx
│   │   ├── ClientDetail.tsx
│   │   └── MasterDocPreview.tsx
│   └── shared/
│       ├── AcrosoftLogo.tsx  → SVG del logo (reutilizable)
│       └── LanguageToggle.tsx
│
├── hooks/
│   ├── useOnboardingForm.ts  → Estado global del stepper
│   ├── useSupabase.ts        → Cliente Supabase
│   └── useAuth.ts            → Auth del admin
│
├── lib/
│   ├── supabase.ts           → Inicialización del cliente Supabase
│   ├── utils.ts              → cn() y helpers
│   └── generateMd.ts        → Función que arma el .md desde los datos
│
├── types/
│   └── submission.ts         → Tipos TypeScript del formulario y DB
│
└── supabase/
    └── functions/
        ├── generate-copy/    → Edge Function: llama a Claude API
        │   └── index.ts
        └── send-notification/ → Edge Function: llama a Resend
            └── index.ts
```

---

## 5. Routing — React Router DOM v6

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                    element={<Index />} />
        <Route path="/onboarding"          element={<Onboarding />} />
        <Route path="/admin"               element={<Admin />} />
        <Route path="/admin/dashboard"     element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/client/:id"    element={<ProtectedRoute><AdminClient /></ProtectedRoute>} />
        <Route path="*"                    element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}
```

El componente `<ProtectedRoute>` verifica la sesión de Supabase Auth.
Si no hay sesión activa, redirige a `/admin`.

---

## 6. Planes Activos (MVP)

| Plan | Setup | Mantenimiento | Entrega |
|---|---|---|---|
| Single Page Website | $500 | $50/mes | 3–5 días hábiles |
| Multi Page Website | $1,500 | $100/mes | 10–14 días hábiles |

> **Custom Booking** ($5,000 setup · $250/mes) está definido comercialmente
> pero fuera del alcance técnico de este MVP. Se desarrolla en v4.0.

**Política de pagos:** 50% al inicio · 50% al entregar
**Dominio:** Lo compra el cliente (recomendado: Namecheap o GoDaddy)

---

## 7. Branding

| Token | Valor |
|---|---|
| Color primario | `#2563EB` |
| Color primario dark | `#1E40AF` |
| Color acento | `#DBEAFE` |
| Fondo claro | `#F8FAFC` |
| Texto principal | `#0F172A` |
| Texto secundario | `#64748B` |
| Fuente | Inter (Google Fonts) |
| Border radius | `rounded-xl` (12px) |
| Logo | Matraz flask azul con arco blanco + "Acrosoft Labs" |

El logo vive en `src/components/shared/AcrosoftLogo.tsx` como SVG inline
y se usa en Navbar, Admin login y Footer.

---

## 8. Formulario de Onboarding — `/onboarding`

### Estado del stepper
Manejar con `useState` local en `Onboarding.tsx` o con un hook `useOnboardingForm.ts`.
El estado completo del formulario se acumula en un objeto que al finalizar
se envía a Supabase en una sola operación.

```ts
// src/types/submission.ts
export type OnboardingData = {
  // Paso 1
  business_name: string
  industry: string
  city_state: string
  years_operating?: string
  description: string
  history?: string

  // Paso 2
  plan: 'single_page' | 'multi_page'
  payment_method: 'one_time' | 'installments'
  project_start_date?: string

  // Paso 3
  logo_url?: string
  color_primary?: string
  color_secondary?: string
  color_accent?: string
  typography?: string
  visual_style?: string
  reference_urls?: string[]

  // Paso 4
  services: Array<{
    name: string
    description?: string
    price?: string
    featured?: boolean
  }>

  // Paso 5
  target_audience?: string
  problem_solved?: string
  differentiators?: string
  testimonials?: Array<{ name: string; text: string }>
  faqs?: Array<{ question: string; answer: string }>

  // Paso 6
  photo_urls?: string[]
  team_photo_urls?: string[]
  video_url?: string

  // Paso 7
  phone: string
  email: string
  address?: string
  schedule?: string
  instagram?: string
  facebook?: string
  tiktok?: string
  google_maps?: string
  domain?: string
}
```

### Validación con Zod
Cada paso tiene su propio schema Zod.
Se valida solo el paso actual antes de avanzar al siguiente.

```ts
// Ejemplo Paso 1
const step1Schema = z.object({
  business_name: z.string().min(2, 'Requerido'),
  industry:      z.string().min(1, 'Selecciona un rubro'),
  city_state:    z.string().min(2, 'Requerido'),
  description:   z.string().min(20, 'Mínimo 20 caracteres'),
})
```

### Upload de archivos a Supabase Storage
```ts
// Patrón para subir logo/fotos
const uploadFile = async (file: File, submissionId: string, type: 'logo' | 'photo') => {
  const path = `${submissionId}/${type}-${Date.now()}.${file.name.split('.').pop()}`
  const { data, error } = await supabase.storage
    .from('client-assets')
    .upload(path, file, { upsert: true })
  return supabase.storage.from('client-assets').getPublicUrl(path).data.publicUrl
}
```

---

## 9. Supabase Edge Functions

Como el proyecto es una SPA sin servidor, toda la lógica con APIs secretas
vive en Edge Functions de Supabase (Deno).

### Edge Function 1 — `generate-copy`
**Trigger:** Se llama desde el frontend después de guardar el submission en la DB.
**Propósito:** Llama a Claude API, genera el copy bilingüe y actualiza el campo `generated_md`.

```ts
// supabase/functions/generate-copy/index.ts
import Anthropic from 'npm:@anthropic-ai/sdk'

Deno.serve(async (req) => {
  const { submissionId, data } = await req.json()

  const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: buildCopyPrompt(data) // ver sección 11
    }]
  })

  const generatedMd = buildMasterDoc(data, message.content[0].text)

  // Guardar el .md en Supabase
  await supabaseAdmin
    .from('submissions')
    .update({ generated_md: generatedMd, status: 'received' })
    .eq('id', submissionId)

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
})
```

### Edge Function 2 — `send-notification`
**Trigger:** Se llama después de `generate-copy`.
**Propósito:** Envía email interno a Acrosoft con Resend.

```ts
// supabase/functions/send-notification/index.ts
import { Resend } from 'npm:resend'

Deno.serve(async (req) => {
  const { businessName, plan, submissionId } = await req.json()
  const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

  await resend.emails.send({
    from: 'sistema@acrosoftlabs.com',
    to: 'admin@acrosoftlabs.com',
    subject: `Nuevo cliente: ${businessName} (${plan})`,
    html: `<p>ID: ${submissionId}<br>Plan: ${plan}<br>Revisar en /admin/client/${submissionId}</p>`
  })

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
})
```

---

## 10. Schema de Supabase

### Tabla: `submissions`
```sql
CREATE TABLE submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz DEFAULT now(),
  plan            text NOT NULL CHECK (plan IN ('single_page', 'multi_page')),
  status          text NOT NULL DEFAULT 'received'
                  CHECK (status IN ('received', 'in_progress', 'delivered')),

  -- Negocio
  business_name   text NOT NULL,
  industry        text,
  city_state      text,
  years_operating text,
  description     text,
  history         text,

  -- Identidad
  color_primary   text,
  color_secondary text,
  color_accent    text,
  typography      text,
  visual_style    text,
  reference_urls  text[],

  -- Servicios
  services        jsonb DEFAULT '[]',

  -- Audiencia
  target_audience text,
  problem_solved  text,
  differentiators text,
  testimonials    jsonb DEFAULT '[]',
  faqs            jsonb DEFAULT '[]',

  -- Contacto
  phone           text,
  email           text,
  address         text,
  schedule        text,
  instagram       text,
  facebook        text,
  tiktok          text,
  google_maps     text,
  domain          text,

  -- Assets (URLs de Supabase Storage)
  logo_url        text,
  photo_urls      text[] DEFAULT '{}',
  team_photo_urls text[] DEFAULT '{}',
  video_url       text,

  -- Output
  generated_md    text,
  admin_notes     text
);

-- Row Level Security
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Solo el service role (Edge Functions) puede escribir
CREATE POLICY "Service role full access"
  ON submissions USING (auth.role() = 'service_role');
```

### Storage Bucket: `client-assets`
```
Bucket: client-assets (público para lectura)

Estructura:
client-assets/
└── {submission_id}/
    ├── logo.png
    ├── photo-1.jpg
    ├── photo-2.jpg
    └── team-1.jpg
```

---

## 11. Prompt de Claude API (generación de copy)

```
Eres un experto en copywriting para negocios latinos en Estados Unidos.
Recibirás los datos de un negocio en JSON y generarás todo el contenido
bilingüe (español e inglés) para su sitio web.

El copy debe ser:
- Cercano, profesional y orientado al beneficio del cliente
- Pensado para el mercado latino en EE.UU. (no traducción literal)
- Sin tecnicismos ni lenguaje corporativo
- Optimizado para SEO local con keywords naturales

Datos del negocio:
{JSON_DATA}

Responde ÚNICAMENTE con un JSON válido (sin markdown, sin explicaciones)
con estas claves exactas:

{
  "hero_headline_es": "",
  "hero_headline_en": "",
  "hero_subheadline_es": "",
  "hero_subheadline_en": "",
  "about_es": "",
  "about_en": "",
  "services": [{ "name": "", "description_es": "", "description_en": "" }],
  "differentiator_1_es": "", "differentiator_1_en": "",
  "differentiator_2_es": "", "differentiator_2_en": "",
  "differentiator_3_es": "", "differentiator_3_en": "",
  "testimonials": [{ "name": "", "text_en": "" }],
  "faqs": [{ "question_en": "", "answer_en": "" }],
  "seo_keyword_es": "",
  "seo_keyword_en": "",
  "meta_title_es": "",
  "meta_title_en": "",
  "meta_description_es": "",
  "meta_description_en": ""
}
```

---

## 12. Plantillas del Documento Maestro

Generado en `src/lib/generateMd.ts` como función pura TypeScript.
Recibe `OnboardingData + AIGeneratedCopy` y retorna un string `.md`.

### 12A — Single Page Website ($500 · $50/mes)

```markdown
# {business_name} — Brief de Proyecto
**Plan:** Single Page Website · $500 setup · $50/mes mantenimiento
**Fecha:** {created_at}
**Desarrollador:** Acrosoft Labs

---

## BRIEF DE DISEÑO
- Rubro: {industry}
- Ubicación: {city_state}
- Colores: Primario {color_primary} · Secundario {color_secondary} · Acento {color_accent}
- Estilo visual: {visual_style}
- Tipografía: {typography}
- Referencias: {reference_urls}
- Dominio: {domain}
- Logo: {logo_url}
- Fotos: {photo_urls}

---

## CONTENIDO DEL SITIO

### Hero
**Headline ES:** {hero_headline_es}
**Headline EN:** {hero_headline_en}
**Subheadline ES:** {hero_subheadline_es}
**Subheadline EN:** {hero_subheadline_en}
**CTA ES:** Contáctanos hoy
**CTA EN:** Contact us today

### Sobre Nosotros
**ES:** {about_es}
**EN:** {about_en}

### Servicios
| Servicio | Descripción ES | Descripción EN | Precio |
|---|---|---|---|
{services_table}

### Por qué elegirnos
1. {differentiator_1_es} / {differentiator_1_en}
2. {differentiator_2_es} / {differentiator_2_en}
3. {differentiator_3_es} / {differentiator_3_en}

### Testimonios
{testimonials_table}

### Contacto
- WhatsApp: {phone}
- Email: {email}
- Dirección: {address}
- Horario: {schedule}
- Instagram: {instagram}
- Facebook: {facebook}
- TikTok: {tiktok}

---

## NOTAS TÉCNICAS
- Deploy: Vercel
- Formulario de contacto: Resend → {email}
- Revisiones incluidas: 3 rondas
- Entrega estimada: 3–5 días hábiles
```

### 12B — Multi Page Website ($1,500 · $100/mes)

Incluye todo lo anterior más:

```markdown
## PÁGINAS DEL SITIO
| Página | Slug | Propósito |
|---|---|---|
| Inicio | / | Hero + resumen |
| Servicios | /servicios | Detalle completo |
| Galería | /galeria | Fotos del negocio |
| Sobre Nosotros | /nosotros | Historia y equipo |
| FAQ | /faq | Preguntas frecuentes |
| Contacto | /contacto | Formulario + mapa |

## SEO LOCAL
- Keyword ES: {seo_keyword_es}
- Keyword EN: {seo_keyword_en}
- Meta title ES: {meta_title_es}
- Meta title EN: {meta_title_en}
- Meta description ES: {meta_description_es}
- Meta description EN: {meta_description_en}

## FAQ
{faqs_table}

## NOTAS TÉCNICAS
- Galería: Supabase Storage (imágenes dinámicas)
- SEO: sitemap.xml + robots.txt + meta tags
- Revisiones incluidas: 5 rondas
- Entrega estimada: 10–14 días hábiles
```

---

## 13. Flujo Completo del Sistema

```
CLIENTE
  │
  ├─ 1. Recibe link /onboarding
  ├─ 2. Llena stepper (8 pasos, bilingüe)
  ├─ 3. Sube logo y fotos → Supabase Storage
  ├─ 4. Submit → POST a Supabase (tabla submissions)
  └─ 5. Ve pantalla de confirmación con ID de seguimiento

SISTEMA (automático)
  │
  ├─ 6. Edge Function generate-copy → Claude API
  ├─ 7. Claude genera JSON con copy bilingüe
  ├─ 8. generateMd() arma el documento maestro .md
  ├─ 9. .md se guarda en submissions.generated_md
  └─ 10. Edge Function send-notification → Resend → email a admin

ACROSOFT (admin)
  │
  ├─ 11. Entra a /admin/dashboard
  ├─ 12. Ve nuevo cliente con estado "Recibido"
  ├─ 13. Entra a /admin/client/:id
  ├─ 14. Descarga el .md
  ├─ 15. Construye el sitio con el brief
  └─ 16. Cambia estado: Recibido → En progreso → Entregado
```

---

## 14. Panel Admin — `/admin`

### Autenticación
```ts
// src/hooks/useAuth.ts
import { supabase } from '@/lib/supabase'

export const signIn = (email: string, password: string) =>
  supabase.auth.signInWithPassword({ email, password })

export const signOut = () => supabase.auth.signOut()

export const getSession = () => supabase.auth.getSession()
```

### Métricas del dashboard
Calculadas con queries a Supabase desde TanStack Query:
- Total clientes: `COUNT(*) FROM submissions`
- Activos: `COUNT(*) WHERE status = 'in_progress'`
- Entregados: `COUNT(*) WHERE status = 'delivered'`
- MRR: suma de `$50/mes * single_page_count + $100/mes * multi_page_count`

### Estados del proyecto
| Estado | Badge color | Descripción |
|---|---|---|
| `received` | Amarillo | Formulario recibido, pendiente de revisión |
| `in_progress` | Azul | Sitio en construcción |
| `delivered` | Verde | Sitio entregado al cliente |

---

## 15. Checklist de Desarrollo

- [x] Proyecto creado en Lovable
- [x] Repositorio en GitHub
- [x] Clonado y dependencias instaladas en Cursor
- [ ] Configurar proyecto en Supabase (crear tablas + storage + auth)
- [ ] Instalar `@supabase/supabase-js` y configurar `src/lib/supabase.ts`
- [ ] Crear archivo `.env` con variables de Supabase
- [ ] Implementar rutas en `App.tsx` con React Router DOM v6
- [ ] Construir componente `AcrosoftLogo.tsx` (SVG reutilizable)
- [ ] Construir landing page `/`
- [ ] Construir stepper de onboarding `/onboarding` (8 pasos)
- [ ] Implementar upload de archivos a Supabase Storage
- [ ] Crear Edge Function `generate-copy` (Claude API)
- [ ] Crear Edge Function `send-notification` (Resend)
- [ ] Construir panel admin `/admin` (login + dashboard + cliente)
- [ ] Implementar descarga del .md desde el admin
- [ ] Deploy en Vercel (conectar repo de GitHub)
- [ ] Configurar variables de entorno en Vercel
- [ ] Activar campañas en Facebook Ads

---

## 16. Backlog (v4.0)

**Custom Booking**
- Sistema de citas propio (calendario + disponibilidad)
- Dashboard de gestión de citas en Supabase
- Notificaciones automáticas por email al cliente y negocio
- Panel de administración de clientes del negocio
- Precio: $5,000 setup · $250/mes mantenimiento

---

*Acrosoft Labs · Documento de uso interno · No compartir con clientes*
