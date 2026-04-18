# Acrosoft Labs — Documento Maestro del Sistema
> Versión 3.2 · Uso interno exclusivo · Confidencial
> Última actualización: Abril 2026

---

## 1. Visión General

Acrosoft Labs es una agencia de desarrollo web con vibecoding orientada a negocios latinos en Estados Unidos. Construye y opera un CRM SaaS multi-tenant que usa internamente y vende como producto a otros negocios.

**Acrosoft es el primer cliente de su propio CRM.** Esto significa que Daniel (el fundador) usa el mismo sistema que sus clientes, con algunas funciones exclusivas de administrador.

**Productos actuales:**
- Landing Page / Single Page Website
- Multi Page Website (hasta 6 páginas)
- Custom Booking + CRM (producto SaaS — el sistema descrito en este documento)

---

## 2. Estructura de Usuarios

```
SuperAdmin (Acrosoft — e.daniel.acero.r@gmail.com)
├─ CRM propio con features exclusivos de admin
├─ Staff del Admin (permisos granulares)
├─ Contactos (leads → clientes de websites o clientes SaaS)
│   └─ Cliente SaaS → Dueño de Negocio
│       ├─ Su propio CRM (aislado)
│       └─ Staff del Dueño (permisos granulares)
```

### Tipos de usuario

| Tipo | Descripción |
|---|---|
| **SuperAdmin** | Email `e.daniel.acero.r@gmail.com`. Features exclusivos: impersonación, control de límites SaaS, marcar servicios como SaaS. |
| **Dueño de Negocio** | Cliente SaaS con CRM propio. Solo ve sus datos. Puede tener Staff. |
| **Staff** | Empleado de un Dueño de Negocio. Accede al CRM del dueño con permisos granulares por sección. |

### Reglas importantes
- No hay recursividad: los Dueños de Negocio no pueden tener sus propios Dueños de Negocio.
- El SuperAdmin puede entrar al CRM de cualquier cliente vía magic link (sin credenciales). Dentro del CRM se comporta exactamente igual que el cliente — sin indicador especial.
- Un contacto del Admin puede comprar un website sin CRM (queda como contacto/cliente, no se convierte en Dueño de Negocio).
- Un contacto se convierte en Dueño de Negocio solo cuando compra un servicio marcado como `is_saas = true`.

---

## 3. Stack Tecnológico

| Capa | Tecnología | Versión | Propósito |
|---|---|---|---|
| Framework | Vite + React | 18.3.1 | SPA sin SSR |
| Lenguaje | TypeScript | 5.8.3 | Tipado estático |
| Routing | React Router DOM | v6.30.1 | Navegación |
| Estilos | Tailwind CSS | 3.4.17 | UI y branding |
| Componentes | shadcn/ui (Radix UI) | — | UI components accesibles |
| Formularios | react-hook-form + zod | — | Validación |
| Estado servidor | TanStack Query | v5.83.0 | Fetching y caché |
| Iconos | Lucide React | 0.462.0 | Iconografía |
| Toasts | Sonner | 1.7.4 | Notificaciones UI |
| Temas | next-themes | 0.3.0 | Dark/light mode |
| Base de datos | Supabase (PostgreSQL) | — | Almacenamiento y auth |
| Storage | Supabase Storage | — | Logos, fotos, documentos |
| Auth | Supabase Auth | — | Login de todos los usuarios |
| API IA | Claude API via Edge Function | claude-sonnet-4-6 | Generación de Documento Maestro |
| Emails | Resend via Edge Function | — | Recordatorios y notificaciones |
| WhatsApp | Evolution API (Railway) | — | Recordatorios WhatsApp (pendiente) |
| Deploy | Vercel | — | Frontend |

> **Regla de seguridad:** Toda lógica con claves secretas (Claude API, Resend, Google OAuth, Supabase service_role) debe ejecutarse en Supabase Edge Functions. Nunca en el frontend.

---

## 4. Rutas del Sistema

```
/                   → Landing page (servicios dinámicos desde Supabase)
/onboarding         → Formulario de onboarding (migrando a FormRenderer)
/login              → Login unificado → redirige a /crm
/crm                → Panel CRM (Admin, Dueños de Negocio, Staff — mismo componente)
/crm-setup          → Crear contraseña para nuevos Staff o clientes SaaS invitados
/f/:slug            → FormRenderer público (formularios embebibles)
/c/:slug            → CalendarRenderer público (calendarios embebibles)
*                   → 404
```

> **Nota:** `/dashboard` fue eliminado. Todo ocurre en `/crm`.

---

## 5. Módulos del CRM

| Módulo | Componente | Descripción |
|---|---|---|
| Resumen | `CrmOverview` | Métricas, registro de ventas, ingreso recurrente estimado |
| Mi Negocio | `CrmBusiness` | Info básica, logo, colores, servicios |
| Calendarios | `CrmCalendar` + `CrmCalendarConfig` | Multi-calendario, citas, bloqueos, Google Calendar |
| Formularios | `CrmForms` + `FormRenderer` | Constructor de formularios, render público |
| Contactos | `CrmContacts` | Gestión de contactos, ficha técnica, impersonación SaaS |
| Pipeline | `CrmPipeline` | Kanban de contactos y tareas |
| Recordatorios | `CrmReminders` | Recordatorios de citas, formularios y personales |
| Configuración | `CrmSettings` | Staff, logs, límites de recordatorios, WhatsApp |

### Visibilidad por rol

| Módulo | SuperAdmin | Dueño de Negocio | Staff |
|---|---|---|---|
| Resumen | ✅ | ✅ | Si tiene perm. dashboard |
| Mi Negocio | ✅ | ✅ | Si tiene perm. mi_negocio_* |
| Calendarios | ✅ | ✅ | Si tiene perm. calendarios |
| Formularios | ✅ | ✅ | Si tiene perm. formularios |
| Contactos | ✅ | ✅ | Si tiene perm. contactos |
| Pipeline | ✅ | ✅ | Si tiene perm. pipeline |
| Recordatorios | ✅ | ✅ | ✅ |
| Configuración | ✅ | ✅ | ❌ (Staff no puede crear más Staff) |

---

## 6. Módulo Contactos — Reglas de Negocio

- Un contacto tiene `stage` dinámico: el nombre de la columna del pipeline donde esté. Puede aparecer en múltiples pipelines → múltiples stages simultáneos.
- Un contacto se convierte en **cliente** automáticamente cuando se registra una venta (manual o via formulario con campo `services`). No depende del pipeline.
- Un contacto SaaS muestra badge especial y botón de impersonación para el SuperAdmin.
- La vista "Clientes" es un filtro de contactos con al menos una venta registrada — no es un módulo separado.
- Los contactos que compran solo website/landing no reciben acceso al CRM.

---

## 7. Módulo Calendario — Reglas de Negocio

- **Multi-calendario:** Cada negocio puede tener N calendarios. Cada calendario es completamente independiente: su propio formulario vinculado, URL pública, horario de atención, conexión con Google Calendar, recordatorios y bloqueos.
- **Bloqueos de tiempo:** Por calendario específico. Tipos: horas específicas, día completo, rango de fechas.
- **Configuración por calendario:** nombre, descripción, duración de cita, tiempo entre citas, anticipación mínima para reservar, máximo de días hacia el futuro para mostrar disponibilidad, horario de atención, URL pública, formulario vinculado, código de incrustación.

---

## 8. Módulo Pipeline — Reglas de Negocio

- **Tipos:**
  - `contacts` (columnas default: Nuevo Lead, Contactado, Propuesta, Cliente, Post-venta): cada tarjeta ES un contacto. El contacto es obligatorio.
  - `tasks` (columnas default: Por hacer, En progreso, Completado): cada tarjeta es una tarea libre. Campos: título (obligatorio), descripción (opcional), prioridad (opcional), contacto vinculado (opcional). Si el contacto vinculado se elimina, la tarea queda sin contacto pero no se elimina.
- **Renombrar columna:** Actualiza automáticamente el `stage` de todos los contactos/tareas en esa columna.
- Un contacto puede estar en múltiples pipelines simultáneamente.

---

## 9. Módulo Formularios — Reglas de Negocio

- **Multi-página:** `multi_page: true` → cada sección es una página del stepper. Cada página necesita al menos 1 campo real (heading no cuenta).
- **Sección de confirmación:** `isConfirmation: true` → muestra resumen de respuestas antes de enviar.
- **Campo tipo `services`:** Solo 1 por formulario. Muestra selección visual de los servicios del negocio. Al enviar, registra la venta automáticamente. Si el servicio es `is_saas`, crea la cuenta CRM del contacto.
- **Campo tipo `repeatable`:** El usuario puede añadir N instancias de sub-campos (ej: lista de servicios, FAQs, reviews).
- **`pipeline_ids`:** Un formulario puede vincularse a múltiples pipelines. Al recibir submission, el contacto se añade a todos los pipelines vinculados.
- **`auto_tags`:** Tags que se acumulan en el contacto al enviar (no reemplazan).
- **Formulario "Onboarding":** Formulario creado en el CRM del Admin que reemplazará el stepper hardcodeado de `/onboarding`.

---

## 10. Módulo Servicios — Reglas de Negocio

- Cada servicio puede tener precio de setup + precio recurrente con intervalo configurable (mensual, trimestral, semestral, anual).
- Campo `is_saas`: solo el SuperAdmin puede marcar un servicio como SaaS. Al venderse, crea automáticamente la cuenta CRM del contacto.
- Campo `discount_pct`: descuento en porcentaje. Se muestra en la landing y en el FormRenderer.
- Los servicios del Admin son los que aparecen en la landing page de Acrosoft (todos los activos, SaaS y no-SaaS).

---

## 11. Módulo Recordatorios — Reglas de Negocio

- **Tipo calendario:** N reglas configurables por calendario (ej: 24h antes, 1h antes de la cita).
- **Tipo formulario:** Al recibir submission (inmediato) o X tiempo después.
- **Tipo personal (to-do):** Fecha, hora, mensaje, destinatario (admin o staff específico), canal. Sin vínculo a cita ni formulario.
- Los recordatorios se configuran desde el módulo Recordatorios O desde la configuración del calendario/formulario.
- **Límites mensuales:** Solo el SuperAdmin configura los límites de email/WhatsApp por mes para cada cliente SaaS. El Dueño de Negocio no puede modificar sus propios límites. El Admin puede activar/desactivar el límite por cliente.

---

## 12. WhatsApp

**Estado actual: Solo UI con banner "Beta: Próximamente".**

Cuando se implemente:
- **Opción A (fácil):** Evolution API self-hosted en Railway (~$10/mes total). QR scan estilo WhatsApp Web. 1 servidor para todos los clientes.
- **Opción B (oficial):** Meta WhatsApp Business API. Sin riesgo de ban, pero configuración más compleja para el usuario.
- Banner de advertencia sobre riesgo de ban al activar.

---

## 13. Documento Maestro del Cliente (.md)

Se genera automáticamente cuando un contacto completa el formulario Onboarding.

**Contenido:** instrucciones técnicas, estructura de secciones, datos del negocio, paleta de colores, tipografía, servicios, público objetivo, diferenciadores, referencias. **No incluye copys** — es un brief para iniciar el proyecto en Claude Code.

**Reglas por servicio:**
- **Landing Page** → documento para construir una landing page
- **Website Completo** → documento para landing + website multi-página
- **SaaS Booking System** → igual que Website Completo (el CRM se activa por separado)

**Implementación:** Edge Function `generate-master-doc` → llama a Claude API → sube `.md` a Supabase Storage → guarda URL en el contacto. El botón "Descargar Kit" en la ficha del contacto descarga el `.md` + imágenes como ZIP.

---

## 14. Schema de Supabase — Tablas CRM

### `crm_contacts`
```sql
CREATE TABLE crm_contacts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz DEFAULT now(),
  user_id       uuid REFERENCES auth.users NOT NULL,
  name          text NOT NULL,
  email         text,
  phone         text,
  company       text,
  stage         text,           -- nombre de columna del pipeline (dinámico, no fijo)
  tags          text[] DEFAULT '{}',
  notes         text,
  custom_fields jsonb DEFAULT '{}'  -- { [form_id]: { [field_id]: value } }
);
```

### `crm_appointments`
```sql
CREATE TABLE crm_appointments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz DEFAULT now(),
  user_id       uuid REFERENCES auth.users NOT NULL,
  calendar_id   uuid REFERENCES crm_calendar_config,
  contact_id    uuid REFERENCES crm_contacts,
  date          date NOT NULL,
  hour          int NOT NULL,        -- 0–23
  minute        int NOT NULL DEFAULT 0,  -- 0–59
  duration_min  int DEFAULT 30,
  service       text,
  status        text DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled')),
  notes         text,
  google_event_id text              -- id del evento en Google Calendar (si sincronizado)
);
```

### `crm_blocked_slots`
```sql
CREATE TABLE crm_blocked_slots (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz DEFAULT now(),
  user_id       uuid REFERENCES auth.users NOT NULL,
  calendar_id   uuid REFERENCES crm_calendar_config NOT NULL,
  type          text NOT NULL CHECK (type IN ('hours','fullday','range')),
  date          date,
  start_hour    int,
  end_hour      int,
  range_start   date,
  range_end     date,
  reason        text
);
```

### `crm_calendar_config`
```sql
CREATE TABLE crm_calendar_config (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        timestamptz DEFAULT now(),
  user_id           uuid REFERENCES auth.users NOT NULL,
  name              text,
  description       text,
  duration_min      int DEFAULT 30,
  buffer_min        int DEFAULT 10,
  min_advance_hours int DEFAULT 1,    -- anticipación mínima para reservar
  max_future_days   int DEFAULT 60,   -- hasta cuántos días mostrar disponibilidad
  slug              text UNIQUE,
  linked_form_id    uuid REFERENCES crm_forms,
  availability      jsonb DEFAULT '{}',
  google_token      jsonb,
  reminder_rules    jsonb DEFAULT '[]'
);
```

### `crm_pipelines`
```sql
CREATE TABLE crm_pipelines (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz DEFAULT now(),
  user_id      uuid REFERENCES auth.users NOT NULL,
  name         text NOT NULL,
  type         text CHECK (type IN ('contacts','tasks')),  -- null = personalizado vacío
  column_names text[] NOT NULL DEFAULT '{}'
);
```

### `crm_tasks`
```sql
CREATE TABLE crm_tasks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz DEFAULT now(),
  user_id     uuid REFERENCES auth.users NOT NULL,
  pipeline_id uuid REFERENCES crm_pipelines NOT NULL,
  contact_id  uuid REFERENCES crm_contacts,  -- opcional; NULL si la tarea no está vinculada a un contacto
  title       text NOT NULL,
  description text,
  priority    text CHECK (priority IN ('low','medium','high')),
  stage       text NOT NULL,
  position    int DEFAULT 0
);
```

### `crm_forms`
```sql
CREATE TABLE crm_forms (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            timestamptz DEFAULT now(),
  user_id               uuid REFERENCES auth.users NOT NULL,
  name                  text NOT NULL,
  fields                jsonb NOT NULL DEFAULT '[]',
  sections              jsonb DEFAULT '[]',
  multi_page            boolean DEFAULT false,
  show_confirmation_step boolean DEFAULT false,
  confirmation_message  text,
  submit_label          text DEFAULT 'Enviar',
  success_action        text DEFAULT 'popup' CHECK (success_action IN ('popup','redirect')),
  success_message       text,
  success_image         text DEFAULT 'icon' CHECK (success_image IN ('icon','logo')),
  redirect_url          text,
  slug                  text UNIQUE,
  auto_tags             text[] DEFAULT '{}',
  facebook_pixel_id     text,
  pipeline_ids          uuid[] DEFAULT '{}',  -- múltiples pipelines
  reminder_rules        jsonb DEFAULT '[]'
);
```

### `crm_services`
```sql
CREATE TABLE crm_services (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        timestamptz DEFAULT now(),
  user_id           uuid REFERENCES auth.users NOT NULL,
  name              text NOT NULL,
  description       text,
  price             numeric DEFAULT 0,
  currency          text DEFAULT 'USD',
  discount_pct      numeric DEFAULT 0,      -- porcentaje de descuento
  is_recurring      boolean DEFAULT false,
  recurring_price   numeric,
  recurring_interval text,                  -- 'monthly','quarterly','biannual','annual'
  recurring_label   text,
  delivery_time     text,
  benefits          text[],
  is_recommended    boolean DEFAULT false,
  active            boolean DEFAULT true,
  sort_order        int,
  is_saas           boolean DEFAULT false   -- solo SuperAdmin puede activar
);
```

### `crm_sales`
```sql
CREATE TABLE crm_sales (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz DEFAULT now(),
  user_id       uuid REFERENCES auth.users NOT NULL,
  contact_id    uuid REFERENCES crm_contacts,
  contact_name  text,    -- snapshot del nombre al momento de la venta
  service_id    uuid REFERENCES crm_services,
  service_name  text,
  amount        numeric DEFAULT 0,
  currency      text DEFAULT 'USD',
  type          text CHECK (type IN ('initial','recurring')),
  notes         text
);
```

### `crm_business_profile`
```sql
CREATE TABLE crm_business_profile (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz DEFAULT now(),
  user_id         uuid REFERENCES auth.users UNIQUE NOT NULL,
  first_name      text,
  last_name       text,
  contact_email   text,
  contact_phone   text,
  role            text,
  business_name   text,
  industry        text,
  city            text,
  country         text,
  website         text,
  whatsapp        text,
  instagram       text,
  facebook        text,
  description     text,
  logo_url        text,
  color_primary   text DEFAULT '#2563EB',
  color_secondary text DEFAULT '#1E40AF',
  color_accent    text DEFAULT '#DBEAFE',
  metrics_order   jsonb DEFAULT '[]'   -- orden personalizado de métricas del Overview
);
```

### `crm_staff`
```sql
CREATE TABLE crm_staff (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz DEFAULT now(),
  owner_user_id   uuid REFERENCES auth.users NOT NULL,
  staff_user_id   uuid REFERENCES auth.users,  -- se llena al aceptar invitación
  name            text NOT NULL,
  email           text NOT NULL,
  description     text,
  status          text DEFAULT 'invited' CHECK (status IN ('invited','active','inactive')),
  -- Permisos granulares (jsonb: { read, edit, create, delete })
  perm_mi_negocio_datos     jsonb DEFAULT '{"read":true,"edit":false}',
  perm_mi_negocio_personal  jsonb DEFAULT '{"read":true,"edit":false}',
  perm_servicios            jsonb DEFAULT '{"read":true,"edit":false,"create":false,"delete":false}',
  perm_dashboard            jsonb DEFAULT '{"read":false}',
  perm_ventas               jsonb DEFAULT '{"read":false,"edit":false,"create":false,"delete":false}',
  perm_calendarios          jsonb DEFAULT '{"read":false,"edit":false,"create":false,"delete":false}',
  perm_formularios          jsonb DEFAULT '{"read":false,"edit":false,"create":false,"delete":false}',
  perm_contactos            jsonb DEFAULT '{"read":false,"edit":false,"create":false,"delete":false}',
  perm_pipeline             jsonb DEFAULT '{"read":false,"edit":false,"create":false,"delete":false}',
  UNIQUE (owner_user_id, email)
);
```

### `crm_client_accounts`
```sql
CREATE TABLE crm_client_accounts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz DEFAULT now(),
  admin_user_id   uuid REFERENCES auth.users NOT NULL,
  contact_id      uuid REFERENCES crm_contacts NOT NULL,
  client_user_id  uuid REFERENCES auth.users,
  client_email    text NOT NULL,
  status          text DEFAULT 'pending' CHECK (status IN ('pending','active','disabled')),
  disabled_at     timestamptz,
  deleted_at      timestamptz,
  UNIQUE (admin_user_id, contact_id)
);
```

---

## 15. Edge Functions

| Función | Estado | Propósito |
|---|---|---|
| `crm-form-public` | ✅ Deployada | Recibe submissions públicos, crea contacto, agrega a pipeline, registra venta si hay campo services |
| `crm-calendar-book` | ✅ Deployada | Crea cita desde CalendarRenderer público |
| `create-saas-client` | ✅ Deployada | Crea cuenta en Supabase Auth + `crm_client_accounts`, envía email de invitación |
| `generate-magic-link` | ✅ Deployada | Genera sesión temporal para impersonación del Admin |
| `cron-queue-reminders` | ✅ Deployada | CRON que genera la cola de recordatorios (pass A: citas, B: formularios, C: personales) |
| `send-reminders` | ✅ Deployada | Envía recordatorios via Resend (email) o WhatsApp |
| `google-calendar-oauth` | ✅ Deployada | OAuth 2.0 con Google Calendar |
| `generate-master-doc` | ❌ Pendiente | Genera Documento Maestro .md con Claude API al recibir submission del Onboarding |
| `sync-to-google` | ❌ Pendiente | Sincroniza citas del CRM con Google Calendar |
| `invite-staff-user` | ❌ Pendiente | Envía invitación por email a nuevo Staff |

---

## 16. Flujo Completo del Sistema

```
CLIENTE FINAL (lead del negocio)
  │
  ├─ 1. Llena formulario público (/f/:slug) o calendario (/c/:slug)
  ├─ 2. Submit → crm-form-public → crea contacto + submission
  ├─ 3. Si campo services → registra venta automáticamente
  ├─ 4. Si servicio is_saas → crea cuenta CRM para el contacto
  └─ 5. Ve popup de confirmación o es redirigido

NEGOCIO (Dueño de Negocio en /crm)
  │
  ├─ 6. Ve nuevo contacto en CrmContacts
  ├─ 7. Confirma cita → aparece en CrmCalendar
  ├─ 8. Mueve el contacto por el Pipeline
  ├─ 9. Registra ventas en CrmOverview
  └─ 10. Bloquea tiempo en el calendario (☕)

SISTEMA AUTOMÁTICO
  │
  ├─ 11. CRON genera cola de recordatorios
  ├─ 12. send-reminders envía por email o WhatsApp
  └─ 13. Si Google Calendar conectado → sync de citas

ACROSOFT (SuperAdmin en /crm)
  │
  ├─ 14. Gestiona sus propios contactos y ventas
  ├─ 15. El Onboarding llena su CRM con nuevos leads
  ├─ 16. Al completar el Onboarding → genera Documento Maestro .md
  └─ 17. Puede entrar al CRM de cualquier cliente SaaS (magic link)
```

---

## 17. Branding

| Token | Valor |
|---|---|
| Color primario | `#2563EB` |
| Color primario dark | `#1E40AF` |
| Color acento | `#DBEAFE` |
| Fondo claro | `#F8FAFC` |
| Texto principal | `#0F172A` |
| Texto secundario | `#64748B` |
| Color "Tiempo Reservado" | `amber-100` / `amber-900/40` (dark) |
| Fuente | Inter (Google Fonts) |
| Border radius | `rounded-xl` (12px) |
| Logo | Matraz flask azul con arco blanco + "Acrosoft Labs" |

> Los colores del negocio (`color_primary`, `color_secondary`, `color_accent`) en `crm_business_profile` se aplican en el `FormRenderer` y `CalendarRenderer` públicos de cada negocio.

---

## 18. Variables de Entorno

```env
# Frontend (.env)
VITE_SUPABASE_URL=https://vbzpvjikkvwlcadughmm.supabase.co
VITE_SUPABASE_ANON_KEY=xxxx

# Edge Functions (Supabase secrets — nunca en el frontend)
ANTHROPIC_API_KEY=xxxx          # Generación de Documento Maestro
RESEND_API_KEY=xxxx             # Envío de emails
GOOGLE_CLIENT_ID=xxxx           # Google Calendar OAuth
GOOGLE_CLIENT_SECRET=xxxx       # Google Calendar OAuth
# EVOLUTION_API_URL=xxxx        # WhatsApp (pendiente)
# EVOLUTION_API_KEY=xxxx        # WhatsApp (pendiente)
```

---

*Acrosoft Labs · Documento de uso interno · No compartir con clientes*
