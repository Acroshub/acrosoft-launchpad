# Acrosoft Labs — Documento Maestro del Sistema
> Versión 3.3 · Uso interno exclusivo · Confidencial
> Última actualización: Mayo 2026

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
| WhatsApp | Evolution API (Railway, self-hosted) | — | Recordatorios WhatsApp (AV-2, pendiente de conectar UI) |
| Deploy | Vercel | — | Frontend |

> **Regla de seguridad:** Toda lógica con claves secretas (Claude API, Resend, Google OAuth, Supabase service_role) debe ejecutarse en Supabase Edge Functions. Nunca en el frontend.

> **Tipos TypeScript:** Todos los tipos de DB viven en `src/lib/supabase.ts`. No definir tipos locales en hooks ni componentes que dupliquen los del schema.

---

## 4. Rutas del Sistema

```
/                         → Landing page (servicios dinámicos desde Supabase)
/onboarding               → Formulario de onboarding (migrando a FormRenderer)
/login                    → Login unificado → redirige a /crm
/crm                      → Panel CRM (Admin, Dueños de Negocio, Staff — mismo componente)
/crm-setup                → Crear contraseña para nuevos Staff o clientes SaaS invitados
/f/:formId                → FormRenderer público (formularios embebibles, acepta slug o UUID)
/book/:calendarId         → CalendarRenderer público (booking, acepta slug o UUID)
/oauth/google-calendar    → Callback de OAuth con Google Calendar
/terminos_y_politicas_de_privacidad → Página legal
*                         → 404
```

> **Nota:** `/dashboard` y `/admin` fueron eliminados. Todo ocurre en `/crm`.

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
| Soporte | `CrmSupport` / `CrmSupportAdmin` | Tickets y sugerencias (cliente ↔ admin) |

### Visibilidad por rol

| Módulo | SuperAdmin | Dueño de Negocio | Staff |
|---|---|---|---|
| Resumen | ✅ | ✅ | Si tiene perm. dashboard |
| Mi Negocio | ✅ | ✅ | Si tiene perm. mi_negocio_* |
| Calendarios | ✅ | ✅ | Si tiene perm. calendarios |
| Formularios | ✅ | ✅ | Si tiene perm. formularios |
| Contactos | ✅ | ✅ | Si tiene perm. contactos |
| Pipeline | ✅ | ✅ | Si tiene perm. pipeline |
| Recordatorios | ✅ | ✅ | Si tiene perm. recordatorios |
| Configuración | ✅ | ✅ | ❌ |
| Soporte | ✅ (vista admin) | ✅ (vista cliente) | ❌ |

---

## 6. Módulo Contactos — Reglas de Negocio

- Un contacto tiene `stage` dinámico: el nombre de la columna del pipeline donde esté. Puede aparecer en múltiples pipelines → múltiples stages simultáneos (via `crm_contact_pipeline_memberships`).
- Un contacto se convierte en **cliente** automáticamente cuando se registra una venta (manual o via formulario con campo `services`). No depende del pipeline.
- Un contacto SaaS muestra badge especial y botón de impersonación para el SuperAdmin.
- La vista "Clientes" es un filtro de contactos con al menos una venta registrada — no es un módulo separado.
- Los contactos que compran solo website/landing no reciben acceso al CRM.
- Cada contacto puede tener notas independientes (tabla `crm_contact_notes`), separadas del campo `notes` legacy.

---

## 7. Módulo Calendario — Reglas de Negocio

- **Multi-calendario:** Cada negocio puede tener N calendarios. Cada calendario es completamente independiente.
- **`duration_min` y `schedule_interval` siempre son iguales.** Al guardar la configuración, ambos se escriben con el mismo valor. No existe un calendario donde la duración de cita difiera del intervalo de slots del grid.
- **Opciones de minutos:** Todos los selectores de minutos (citas, bloqueos, edición) ofrecen solo las opciones válidas según `duration_min`:
  - 60 min → `[0]` (solo en punto)
  - 30 min → `[0, 30]`
  - 15 min → `[0, 15, 30, 45]`
  No existe una opción de :15 en un calendario de 30 min porque ese slot no existe en el grid.
- **Bloqueos de tiempo:** Tipos `hours` (con `start_hour`, `start_minute`, `end_hour`, `end_minute`), `fullday`, `range` (con `range_start`, `range_end`). Por calendario específico.
- **Intervalo configurable:** Opciones de duración: 15, 30, 45, 60 minutos.
- **Visualización del grid:** `pxPerMin = ROW_HEIGHT / schedule_interval`. Las citas y bloqueos se renderizan como overlays absolutos con altura y `top` calculados por `duration_min` y el slot de inicio.
- **Google Calendar:** Cada calendario puede conectar una cuenta de Google via OAuth. Las citas se sincronizan bidirecccionalmente (campo `google_event_id` en `crm_appointments`).

---

## 8. Módulo Pipeline — Reglas de Negocio

- **Tipos:**
  - `contacts`: cada tarjeta ES un contacto. El contacto es obligatorio. Un contacto puede estar en múltiples pipelines (tabla `crm_contact_pipeline_memberships`).
  - `tasks`: cada tarjeta es una tarea libre. Campos: título (obligatorio), descripción, prioridad, contacto vinculado (opcional). Si el contacto se elimina, la tarea queda sin contacto pero no se elimina.
- **Renombrar columna:** Actualiza automáticamente el `stage` de todos los contactos/tareas en esa columna.

---

## 9. Módulo Formularios — Reglas de Negocio

- **Multi-página:** `multi_page: true` → cada sección es una página del stepper. Cada página necesita al menos 1 campo real (heading no cuenta).
- **Sección de confirmación:** `show_confirmation_step: true` → muestra resumen de respuestas antes de enviar.
- **Campo tipo `services`:** Solo 1 por formulario. Muestra selección visual de los servicios del negocio. Al enviar, registra la venta automáticamente. Si el servicio es `is_saas`, crea la cuenta CRM del contacto.
- **`pipeline_ids`:** Un formulario puede vincularse a múltiples pipelines (`uuid[]`). Al recibir submission, el contacto se añade a todos.
- **`auto_tags`:** Tags que se acumulan en el contacto al enviar (no reemplazan).
- **`is_basic_form`:** Formulario de una sola sección/página, sin stepper.
- **`language`:** Idioma del formulario (`'es'` por defecto).
- **Formulario "Onboarding":** Formulario en el CRM del Admin que reemplazará el stepper hardcodeado de `/onboarding`.

---

## 10. Módulo Servicios — Reglas de Negocio

- Cada servicio puede tener precio de setup + precio recurrente con intervalo configurable (mensual, trimestral, semestral, anual).
- `is_saas`: solo el SuperAdmin puede activar. Al venderse, crea automáticamente la cuenta CRM.
- `discount_pct`: descuento en porcentaje sobre el precio inicial. Se muestra en la landing y en el FormRenderer.
- `recurring_discount_pct`: descuento en porcentaje sobre el precio recurrente.
- Los servicios del Admin son los que aparecen en la landing page de Acrosoft.

---

## 11. Módulo Recordatorios — Reglas de Negocio

- **Tipo calendario:** N reglas por calendario (ej: 24h antes, 1h antes).
- **Tipo formulario:** Al recibir submission o X tiempo después.
- **Tipo personal (to-do):** Fecha, hora, mensaje, destinatario (admin o staff específico), canal. Sin vínculo a cita ni formulario.
- **`is_personal`:** `true` → recordatorio personal del staff o admin, no vinculado a cita ni formulario.
- **`business_target`:** Indica si el recordatorio va dirigido al negocio/admin en lugar del cliente.
- **`staff_id`:** Si el recordatorio es para un staff específico.
- **Cola de envío:** `crm_reminder_queue` — cola de procesamiento con control de intentos y estado.
- **Límites mensuales:** Solo el SuperAdmin configura `email_limit_per_month` y `whatsapp_limit_per_month` en `crm_reminder_config`. El Dueño no puede modificar sus propios límites.

---

## 12. WhatsApp

**Estado actual:** La tabla `crm_whatsapp_config` está creada en producción. La UI en CrmSettings muestra un panel "Beta: Próximamente". La edge function `send-reminders` lanza error explícito si el canal es `whatsapp`.

**Plan AV-2 (próximo):** Evolution API self-hosted en Railway (~$5/mes total para todos los clientes SaaS).
- Una sola instancia de Evolution API en Railway sirve a todos los tenants.
- Cada tenant conecta su propio número escaneando un QR desde CrmSettings → tab WhatsApp.
- La sesión de cada tenant se identifica con su `user_id` como `instanceName`.
- Edge function `whatsapp-session` maneja: `create`, `qr`, `status`, `disconnect`.
- Banner de advertencia sobre riesgo de ban siempre visible.

**Variables de entorno necesarias (Supabase secrets):**
- `EVOLUTION_API_URL` → URL pública de la instancia en Railway
- `EVOLUTION_API_KEY` → API key configurada como `AUTHENTICATION_API_KEY` en Railway

---

## 13. Sistema de Soporte

- Los clientes SaaS crean tickets o sugerencias desde `CrmSupport` (tab "Soporte" en su CRM).
- El SuperAdmin ve todos los tickets en `CrmSupportAdmin` con hilo de conversación.
- `support_notification_recipients`: emails que reciben notificación cuando llega un ticket nuevo.
- Estados: `open` → `in_progress` → `resolved` (admin) | `read` (cliente vio la respuesta).

---

## 14. Documento Maestro del Cliente (.md)

Se genera automáticamente cuando un contacto completa el formulario Onboarding.

**Contenido:** instrucciones técnicas, estructura de secciones, datos del negocio, paleta de colores, tipografía, servicios, público objetivo, diferenciadores, referencias. **No incluye copys** — es un brief para iniciar el proyecto en Claude Code.

**Implementación:** Edge Function `generate-master-doc` → llama a Claude API → sube `.md` a Supabase Storage → guarda URL en `crm_contacts.master_doc_url`.

---

## 15. Schema de Supabase — Tablas CRM

### `crm_contacts`
```sql
id            uuid PK
created_at    timestamptz
user_id       uuid → auth.users
name          text
email         text
phone         text
company       text
stage         text          -- legacy: columna del pipeline (ahora via memberships)
tags          text[]
notes         text          -- legacy: nota general
custom_fields jsonb         -- { [form_id]: { [field_id]: value } }
master_doc_url text         -- URL del .md generado por Claude
pipeline_position jsonb     -- { [pipeline_id]: position } (legacy)
```

### `crm_contact_notes`
```sql
id         uuid PK
created_at timestamptz
contact_id uuid → crm_contacts
user_id    uuid → auth.users
body       text
```

### `crm_contact_pipeline_memberships`
```sql
id          uuid PK
created_at  timestamptz
contact_id  uuid → crm_contacts
pipeline_id uuid → crm_pipelines
stage       text
position    int DEFAULT 0
```

### `crm_appointments`
```sql
id              uuid PK
created_at      timestamptz
user_id         uuid → auth.users
calendar_id     uuid → crm_calendar_config
contact_id      uuid → crm_contacts
date            date
hour            int (0–23)
minute          int (0–59) DEFAULT 0
duration_min    int DEFAULT 30
service         text
status          text ('confirmed' | 'cancelled')
notes           text
google_event_id text        -- ID del evento en Google Calendar
terms_accepted_at timestamptz
```

### `crm_blocked_slots`
```sql
id           uuid PK
created_at   timestamptz
user_id      uuid → auth.users
calendar_id  uuid → crm_calendar_config
type         text ('hours' | 'fullday' | 'range')
date         date            -- para tipo 'hours' y 'fullday'
start_hour   int
start_minute int DEFAULT 0
end_hour     int
end_minute   int DEFAULT 0
range_start  date            -- para tipo 'range'
range_end    date
reason       text
```

### `crm_calendar_config`
```sql
id                uuid PK
created_at        timestamptz
user_id           uuid → auth.users
contact_id        uuid → crm_contacts   -- staff asociado (opcional)
name              text
description       text
duration_min      int DEFAULT 30        -- = schedule_interval, siempre iguales
buffer_min        int DEFAULT 10
schedule_interval int DEFAULT 30        -- = duration_min, siempre iguales
min_advance_hours int DEFAULT 1
max_future_days   int DEFAULT 60
slug              text UNIQUE
linked_form_id    uuid → crm_forms
availability      jsonb                 -- { "Lun": { open, slots:[{from,to}] }, ... }
google_token      jsonb                 -- { access_token, refresh_token, expires_at, ... }
google_calendar_id text
reminder_rules    jsonb DEFAULT '[]'
timezone          text DEFAULT 'America/La_Paz'
language          text DEFAULT 'es'
```

### `crm_pipelines`
```sql
id           uuid PK
created_at   timestamptz
user_id      uuid → auth.users
name         text
type         text ('contacts' | 'tasks')
column_names text[]
```

### `crm_tasks`
```sql
id          uuid PK
created_at  timestamptz
user_id     uuid → auth.users
pipeline_id uuid → crm_pipelines
contact_id  uuid → crm_contacts  -- opcional
title       text
description text
priority    text ('low' | 'medium' | 'high')
stage       text
position    int DEFAULT 0
```

### `crm_forms`
```sql
id                    uuid PK
created_at            timestamptz
user_id               uuid → auth.users
name                  text
fields                jsonb DEFAULT '[]'
sections              jsonb
multi_page            boolean DEFAULT false
is_basic_form         boolean DEFAULT false
show_confirmation_step boolean DEFAULT false
confirmation_message  text
submit_label          text DEFAULT 'Enviar'
success_action        text ('popup' | 'redirect')
success_message       text
success_image         text ('icon' | 'logo')
redirect_url          text
slug                  text UNIQUE
auto_tags             text[]
facebook_pixel_id     text
pipeline_id           uuid → crm_pipelines   -- FK legacy (usar pipeline_ids)
pipeline_ids          uuid[]                 -- multi-pipeline
reminder_rules        jsonb DEFAULT '[]'
language              text DEFAULT 'es'
```

### `crm_form_submissions`
```sql
id               uuid PK
created_at       timestamptz
form_id          uuid → crm_forms
data             jsonb
terms_accepted   boolean DEFAULT false
terms_accepted_at timestamptz
```

### `crm_services`
```sql
id                   uuid PK
created_at           timestamptz
user_id              uuid → auth.users
name                 text
description          text
price                numeric DEFAULT 0
currency             text DEFAULT 'USD'
discount_pct         numeric DEFAULT 0        -- descuento inicial
is_recurring         boolean DEFAULT false
recurring_price      numeric
recurring_interval   text                     -- 'month','quarterly','biannual','annual'
recurring_label      text
recurring_discount_pct int DEFAULT 0          -- descuento recurrente
delivery_time        text
benefits             jsonb DEFAULT '[]'
is_recommended       boolean DEFAULT false
active               boolean DEFAULT true
sort_order           int DEFAULT 0
is_saas              boolean DEFAULT false    -- solo SuperAdmin puede activar
```

### `crm_sales`
```sql
id           uuid PK
created_at   timestamptz
user_id      uuid → auth.users
contact_id   uuid → crm_contacts
contact_name text           -- snapshot del nombre al momento de la venta
service_id   uuid → crm_services
service_name text
amount       numeric
currency     text DEFAULT 'USD'
type         text ('initial' | 'recurring')
notes        text
```

### `crm_business_profile`
```sql
id              uuid PK
created_at      timestamptz
user_id         uuid UNIQUE → auth.users
first_name      text
last_name       text
contact_email   text
contact_phone   text
role            text
business_name   text
industry        text
city            text
country         text
website         text
whatsapp        text
instagram       text
facebook        text
description     text
logo_url        text
color_primary   text DEFAULT '#3b82f6'
color_secondary text DEFAULT '#ffffff'
color_accent    text DEFAULT '#f59e0b'
theme           text DEFAULT 'classic'
metrics_order   jsonb DEFAULT '[]'
landing_calendar_id uuid → crm_calendar_config
timezone        text DEFAULT 'America/La_Paz'
```

### `crm_staff`
```sql
id              uuid PK
created_at      timestamptz
owner_user_id   uuid → auth.users
staff_user_id   uuid → auth.users  -- se llena al aceptar invitación
name            text
email           text
phone           text
description     text
status          text ('invited' | 'active' | 'inactive')
-- Permisos por sección (jsonb: { read, edit?, create?, delete? })
perm_mi_negocio_datos     jsonb
perm_mi_negocio_personal  jsonb
perm_servicios            jsonb
perm_dashboard            jsonb
perm_ventas               jsonb
perm_calendarios          jsonb
perm_formularios          jsonb
perm_contactos            jsonb
perm_pipeline             jsonb
perm_recordatorios        jsonb    -- { read: bool, create: bool }
-- Overrides por ítem (null = sin restricción, aplica el perm de sección a todos)
perm_calendarios_items    jsonb    -- { [calendar_id]: { read, edit } }
perm_formularios_items    jsonb    -- { [form_id]: { read, edit } }
perm_pipeline_items       jsonb    -- { [pipeline_id]: { read, edit } }
UNIQUE (owner_user_id, email)
```

### `crm_client_accounts`
```sql
id            uuid PK
created_at    timestamptz
admin_user_id uuid → auth.users
contact_id    uuid → crm_contacts
client_user_id uuid → auth.users  -- se llena al aceptar invitación
client_email  text
status        text ('pending' | 'active' | 'disabled')
disabled_at   timestamptz
deleted_at    timestamptz
```

### `crm_saas_invitations`
```sql
id         uuid PK
created_at timestamptz
account_id uuid → crm_client_accounts
token      text UNIQUE
expires_at timestamptz DEFAULT now() + 7 days
used_at    timestamptz
```

### `crm_logs`
```sql
id                  uuid PK
created_at          timestamptz
user_id             uuid → auth.users
action              text ('create' | 'update' | 'delete')
entity              text   -- 'Contacto', 'Servicio', 'Cita', etc.
entity_id           text
description         text
performed_by_user_id uuid → auth.users  -- si es staff actuando en nombre del owner
```

### `crm_reminder_config`
```sql
id                      uuid PK
created_at              timestamptz
user_id                 uuid UNIQUE → auth.users
auto_enabled            boolean DEFAULT false
auto_reminder_before_hours int DEFAULT 24
default_type            text ('email' | 'whatsapp')
email_limit_per_month   int DEFAULT 100
whatsapp_limit_per_month int DEFAULT 100
```

### `crm_reminders`
```sql
id              uuid PK
created_at      timestamptz
user_id         uuid → auth.users
contact_id      uuid → crm_contacts
appointment_id  uuid → crm_appointments
type            text ('email' | 'whatsapp')
recipient_email text
recipient_phone text
subject         text
message         text
scheduled_at    timestamptz
status          text ('pending' | 'sent' | 'failed' | 'skipped')
sent_at         timestamptz
error           text
is_auto         boolean DEFAULT false
is_personal     boolean DEFAULT false
staff_id        uuid → crm_staff
business_target text
```

### `crm_reminder_queue`
```sql
id           uuid PK
created_at   timestamptz
updated_at   timestamptz
reminder_id  uuid UNIQUE → crm_reminders
status       text ('pending' | 'processing' | 'sent' | 'failed')
attempts     int DEFAULT 0
processed_at timestamptz
error        text
```

### `crm_whatsapp_config`
```sql
id            uuid PK
created_at    timestamptz
user_id       uuid UNIQUE → auth.users
status        text DEFAULT 'disconnected'  -- 'disconnected' | 'connecting' | 'connected'
provider      text DEFAULT 'evolution'
session_uuid  text      -- instance name en Evolution API (= user_id)
phone_number  text
api_url       text      -- URL de la instancia Evolution en Railway
api_key       text      -- API key de la instancia
last_paired_at timestamptz
```

### `crm_pipeline_deals` *(legacy, sin uso activo)*
```sql
id           uuid PK
user_id      uuid → auth.users
contact_id   uuid → crm_contacts
title        text
stage        text
value        numeric DEFAULT 0
currency     text DEFAULT 'USD'
notes        text
custom_fields jsonb
```

### `support_tickets`
```sql
id               uuid PK
created_at       timestamptz
updated_at       timestamptz
user_id          uuid → auth.users
type             text ('ticket' | 'suggestion')
subject          text
status           text ('open' | 'in_progress' | 'resolved' | 'read')
client_last_seen_at timestamptz
```

### `support_messages`
```sql
id          uuid PK
created_at  timestamptz
ticket_id   uuid → support_tickets
sender_id   uuid → auth.users
sender_role text ('client' | 'admin')
content     text
attachments jsonb DEFAULT '[]'
```

### `support_notification_recipients`
```sql
id         uuid PK
created_at timestamptz
email      text UNIQUE
active     boolean DEFAULT true
```

---

## 16. Edge Functions

| Función | Estado | Propósito |
|---|---|---|
| `crm-form-public` | ✅ Deployada | Recibe submissions públicos, crea contacto, agrega a pipeline, registra venta si hay campo services |
| `crm-calendar-book` | ✅ Deployada | Crea cita desde CalendarRenderer público |
| `create-saas-client` | ✅ Deployada | Crea cuenta en Supabase Auth + `crm_client_accounts`, envía email de invitación |
| `generate-magic-link` | ✅ Deployada | Genera sesión temporal para impersonación del Admin |
| `cron-queue-reminders` | ✅ Deployada | CRON que genera la cola de recordatorios (pass A: citas, B: formularios, C: personales) |
| `send-reminders` | ✅ Deployada | Envía recordatorios via Resend (email). WhatsApp: lanza error hasta conectar Evolution API (AV-2) |
| `google-calendar-oauth` | ✅ Deployada | OAuth 2.0 con Google Calendar |
| `whatsapp-session` | ❌ Pendiente (AV-2) | Maneja create/qr/status/disconnect de instancias en Evolution API |
| `generate-master-doc` | ❌ Pendiente | Genera Documento Maestro .md con Claude API al recibir submission del Onboarding |
| `sync-to-google` | ❌ Pendiente | Sincroniza citas del CRM con Google Calendar |
| `invite-staff-user` | ❌ Pendiente | Envía invitación por email a nuevo Staff |

---

## 17. Flujo Completo del Sistema

```
CLIENTE FINAL (lead del negocio)
  │
  ├─ 1. Llena formulario público (/f/:formId) o calendario (/book/:calendarId)
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
  ├─ 11. CRON genera cola en crm_reminder_queue
  ├─ 12. send-reminders envía por email (o WhatsApp cuando AV-2 esté listo)
  └─ 13. Si Google Calendar conectado → sync de citas

ACROSOFT (SuperAdmin en /crm)
  │
  ├─ 14. Gestiona sus propios contactos y ventas
  ├─ 15. El Onboarding llena su CRM con nuevos leads
  ├─ 16. Al completar el Onboarding → genera Documento Maestro .md
  ├─ 17. Puede entrar al CRM de cualquier cliente SaaS (magic link)
  └─ 18. Gestiona tickets de soporte en CrmSupportAdmin
```

---

## 18. Branding

| Token | Valor |
|---|---|
| Color primario (default) | `#3b82f6` |
| Color secundario (default) | `#ffffff` |
| Color acento (default) | `#f59e0b` |
| Fondo claro | `#F8FAFC` |
| Texto principal | `#0F172A` |
| Texto secundario | `#64748B` |
| Color "Tiempo Reservado" | `amber-100` / `amber-900/40` (dark) |
| Fuente | Inter (Google Fonts) |
| Border radius | `rounded-xl` (12px) |
| Logo | Matraz flask azul con arco blanco + "Acrosoft Labs" |

> Los colores del negocio (`color_primary`, `color_secondary`, `color_accent`) en `crm_business_profile` se aplican en el `FormRenderer` y `CalendarRenderer` públicos de cada negocio.

---

## 19. Variables de Entorno

```env
# Frontend (.env)
VITE_SUPABASE_URL=https://rhlnjtrbydwzzuvqayfo.supabase.co
VITE_SUPABASE_ANON_KEY=xxxx

# Edge Functions (Supabase secrets — nunca en el frontend)
ANTHROPIC_API_KEY=xxxx          # Generación de Documento Maestro
RESEND_API_KEY=xxxx             # Envío de emails
GOOGLE_CLIENT_ID=xxxx           # Google Calendar OAuth
GOOGLE_CLIENT_SECRET=xxxx       # Google Calendar OAuth
EVOLUTION_API_URL=xxxx          # WhatsApp — URL pública del servidor Railway (AV-2)
EVOLUTION_API_KEY=xxxx          # WhatsApp — API key del servidor Railway (AV-2)
```

---

*Acrosoft Labs · Documento de uso interno · No compartir con clientes*
