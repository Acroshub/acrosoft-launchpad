# Plan de Implementación - Roadmap por Complejidad

**Última actualización:** 2026-04-10  
**Estado:** Diseño CLARIFICADO - LISTO PARA DESARROLLO

---

## 🎯 Resumen Ejecutivo

Este documento ordena las 5 features por **complejidad técnica** y **temas similares**. Se divide en 4 bloques de trabajo secuencial. **Todas las preguntas bloqueadoras han sido respondidas.**

---

## ENTENDIMIENTO COMÚN DEL SISTEMA

### **Estructura de Usuarios**
```
Acrosoft (Admin - Usuario Principal)
├─ CRM propio (independiente)
├─ Staff del Admin (ven solo datos de Acrosoft)
├─ Contactos (clientes potenciales + clientes SaaS)
│  └─ Clientes SaaS (con label "Booking System")
│     └─ Su propio CRM (acceso mediante botón "Acceder a CRM" ámbar)
│        └─ Staff del Cliente SaaS (ven solo datos del cliente)
│           └─ Con permisos granulares por subsección
```

### **Key Points**
- ✅ Admin ve SOLO sus datos, NO puede ver datos de clientes SaaS
- ✅ Cada Cliente SaaS ve SOLO sus datos
- ✅ Staff de Cliente ve exactamente los datos del Cliente (con permisos restringidos)
- ✅ Un Contacto puede comprar máximo 1 servicio SaaS ($5000 Booking System)
- ✅ Contacto deshabilitado → no login, datos preservados, eliminación después 6 meses

---

## BLOQUE 1: UI & CRUD Básicos (⭐ Muy Fácil - Semana 1)

### 1.1 Indicador Visual en Contactos + Botón "Acceder a CRM"
**Complejidad:** ⭐ Muy Baja  
**Tiempo estimado:** 2-3 días  
**Dependencias:** Database `crm_client_accounts`

En `CrmContacts.tsx`, para cada contacto:
- [ ] Query `crm_client_accounts`: revisar si es cliente SaaS activo
- [ ] Si activo:
  - Badge visual con label: **"Booking System"**
  - Color: amarillo/ámbar (badge con fondo ámbar)
  - Ícono: 🔐 o similar
  - **Botón "Acceder a CRM" color ámbar**
    - Al clickear → genera magic link (edge function)
    - Redirige a página de login del cliente
    - Sin pasar por credenciales
- [ ] Si NO activo: sin badge, sin botón

**Datos iniciales al crear CRM del cliente:**
- Nombre del negocio (del contacto)
- Email/teléfono del contacto
- Horarios (vacíos o defaults, el cliente los configura)
- Servicios (vacío)
- Datos del Onboarding (si fue rellenado)

**Capacidades del Cliente SaaS:**
- ✅ Crear, editar, eliminar sus propios contactos
- ✅ Crear, editar, eliminar sus propias citas
- ✅ Acceder al Dashboard con métricas propias
- ✅ Configurar recordatorios (automáticos y manuales)
- ✅ Conectar Google Calendar
- ✅ Cambiar contraseña en "Datos personales"

**Archivos a tocar:**
- `src/components/crm/CrmContacts.tsx` (agregar badge + botón)
- `supabase/migrations/20260410_crm_client_accounts.sql` (crear tabla)
- `src/hooks/useCrmData.ts` (hook `useClientAccounts`)

---

### 1.2 Tab "Servicios SaaS" en Configuración (Admin Acrosoft)
**Complejidad:** ⭐ Muy Baja  
**Tiempo estimado:** 1-2 días  
**Dependencias:** Ninguna

En `CrmSettings.tsx`, nuevo tab para Admin Acrosoft:
- [ ] Lista de servicios actuales del Admin (`crm_services`)
- [ ] Solo el servicio de $5000 tiene opción SaaS (checkbox)
- [ ] Checkbox: "Vender como SaaS"
- [ ] Guardar en `crm_business_profile.saas_enabled`
- [ ] Simple UI: tabla con nombre servicio + toggle + fecha habilitación

**Archivos a tocar:**
- `src/components/crm/CrmSettings.tsx` (agregar SaaSTab)
- `src/lib/supabase.ts` (agregar campo a CrmBusinessProfile)
- `supabase/migrations/20260410_saas_config.sql` (crear campo)

---

### 1.3 Staff CRUD con Permisos Granulares (Principal)
**Complejidad:** ⭐⭐ Baja  
**Tiempo estimado:** 3-4 días  
**Dependencias:** Database schema staff

Reemplazar StaffTab vacío en `CrmSettings.tsx`:
- [ ] Tabla de staff: nombre, email, fecha agregado, estado (activo/inactivo)
- [ ] Botón "+ Agregar Staff" → modal con form:
  - Email, nombre, descripción (rol/cargo)
  - **Matriz de permisos granular:**
    ```
    [ ] Mi Negocio
        ├─ [ ] Datos del negocio → Ver, Editar
        ├─ [ ] Datos personales → Ver, Editar
        ├─ [ ] Servicios → Ver, Editar, Crear, Eliminar
    [ ] Dashboard
        ├─ [ ] Ver
    [ ] Registro de Ventas
        ├─ [ ] Ver, Editar, Crear, Eliminar
    [ ] Calendarios
        ├─ [ ] Ver, Editar, Crear, Eliminar
    [ ] Formularios
        ├─ [ ] Ver, Editar, Crear, Eliminar
    [ ] Contactos
        ├─ [ ] Ver, Editar, Crear, Eliminar
    [ ] Pipeline
        ├─ [ ] Ver, Editar, Crear, Eliminar
    ```
- [ ] Botón "Editar" → abrir modal con permisos editables
- [ ] Botón "Eliminar" con confirmación
- [ ] Staff NO puede agregar más staff (solo Principal)
- [ ] **Al crear staff:** enviar email de invitación con link para establecer contraseña (7 días)
- [ ] Staff loguea con email/contraseña (Supabase Auth normal)

**Archivos a tocar:**
- `src/components/crm/CrmSettings.tsx` → StaffTab (actualizar)
- `supabase/migrations/20260410_crm_staff.sql` (crear tabla)
- `src/hooks/useCrmData.ts` (CRUD hooks para staff)
- `src/lib/permissions.ts` (nuevo: sistema de permisos)

---

## BLOQUE 2: Autenticación & Multi-tenant (⭐⭐⭐ Media - Semana 2-3)

### 2.1 RLS Policies Multi-tenant (CRÍTICO)
**Complejidad:** ⭐⭐⭐ Media-Alta  
**Tiempo estimado:** 3-4 días  
**Dependencias:** 1.1, 1.3, database schema

Crear políticas de Row Level Security **TOTAL**:

**Admin (Acrosoft):**
- [ ] VE: solo sus propios datos (`user_id` match)
- [ ] NO VE: datos de clientes SaaS, staff de clientes, contactos de clientes

**Cliente SaaS:**
- [ ] VE: solo sus datos (referencia en `crm_client_accounts`)
- [ ] NO VE: datos de otros clientes, datos de Admin

**Staff:**
- [ ] VE: datos del Principal (cliente) que lo contrató
- [ ] Según permisos: R/E/C/D limitados por subsección
- [ ] NO VE: datos de otros clientes, datos de Admin

**Tablas afectadas:**
- `crm_contacts`, `crm_appointments`, `crm_forms`, `crm_calendar_config`
- `crm_services`, `crm_sales`, `crm_blocked_slots`, etc.

**Nota:** RLS se basa en JWT claims: `account_type` (admin|client|staff) + `business_user_id`

**Archivos a tocar:**
- `supabase/migrations/20260411_rls_multitenant.sql` (gran migration)
- `src/hooks/useAuth.ts` (verificar permisos en JWT)

---

### 2.2 SaaS Account Creation (Desde Dashboard Registro de Ventas)
**Complejidad:** ⭐⭐ Baja-Media  
**Tiempo estimado:** 2-3 días  
**Dependencias:** 1.1, 2.1

**Trigger:** Admin Acrosoft registra venta de **$5000 Booking System** en Dashboard → "Registro de Ventas"

**Flow automático:**
- [ ] Al guardar la transacción (servicio $5000 al contacto):
  - Edge function `create-saas-client` se dispara
  - Crear nuevo user en `auth.users` con email del contacto
  - Crear row en `crm_client_accounts` (link admin → client)
  - Crear CRM vacío para el cliente (con datos del Onboarding si existe)
  - **Enviar email de invitación:**
    ```
    Hola [Nombre],
    
    ¡Tu CRM está listo! Haz clic aquí para establecer tu contraseña:
    [LINK de invitación - valido 7 días]
    ```
  - Link redirige a: `/crm-setup/[invitation-token]` → form para establecer contraseña

**Archivos a tocar:**
- `supabase/functions/create-saas-client/index.ts` (nueva edge function)
- `supabase/migrations/20260410_saas_invitations.sql` (tabla invitaciones)
- `src/pages/CrmSetup.tsx` (página de invitación)
- `src/components/crm/CrmContacts.tsx` (agregar lógica en formulario de venta)

---

### 2.3 Magic Link Login (Admin → Cliente SaaS)
**Complejidad:** ⭐⭐⭐ Media-Alta  
**Tiempo estimado:** 2-3 días  
**Dependencias:** 2.2, 2.1

**Flow:**
- [ ] Admin clickea botón "Acceder a CRM" (ámbar) en un cliente SaaS
- [ ] Edge function `generate-magic-link`:
  - Genera JWT temporario con `sub: client_user_id`, `exp: +30min`
  - Guarda en tabla `crm_magic_links`
  - Retorna link: `/crm-client/login?token=[JWT_temporal]`
- [ ] Link redirige a `/crm-client/login`:
  - Valida JWT
  - Crea sesión regular (Supabase Auth)
  - Redirige al CRM del cliente
  - **Sin pasar por email/password**

**Archivos a tocar:**
- `supabase/functions/generate-magic-link/index.ts` (nueva)
- `supabase/migrations/20260412_magic_links.sql` (crear tabla)
- `src/pages/CrmClientLogin.tsx` (nueva)
- `src/hooks/useAuth.ts` (agregar magic link auth)

---

### 2.4 Staff Login & Permissions (Cliente o Admin)
**Complejidad:** ⭐⭐⭐ Media-Alta  
**Tiempo estimado:** 3-5 días  
**Dependencias:** 1.3, 2.1

**Flow:**
- [ ] Staff loguea con email/contraseña normal (Supabase Auth)
- [ ] JWT claims incluyen:
  - `account_type: "staff"`
  - `business_user_id: [admin o cliente SaaS que lo contrató]`
  - `permissions: { "contactos": ["read", "edit"], "calendarios": ["read"], ... }`
- [ ] UI adapta según permisos:
  - Hook `useStaffPermissions()` en cada componente
  - Si no tiene permiso "read_contactos" → CrmContacts oculto/deshabilitado
  - Si tiene "read_calendarios" pero no "edit" → CrmCalendar es read-only
  - Etc.

**Datos personales:**
- Staff edita sus propios datos en "Mi Negocio" → Datos personales
- NO ve datos personales del Principal

**Archivos a tocar:**
- `src/hooks/useAuth.ts` (extraer permisos del JWT)
- `src/lib/permissions.ts` (lógica de permisos granulares)
- `src/components/crm/CrmContacts.tsx`, `CrmCalendar.tsx`, etc. (agregar checks)
- `supabase/functions/create-staff-user/index.ts` (crear user con permisos en JWT)

---

### 2.5 Deshabilitar Cliente SaaS
**Complejidad:** ⭐ Muy Baja  
**Tiempo estimado:** 1 día  
**Dependencias:** 2.2

**Flow:**
- [ ] Admin clickea botón "Deshabilitar" en cliente SaaS (en lista Contactos)
- [ ] Marcar `crm_client_accounts.disabled_at = NOW()`
- [ ] Cliente NO puede loguear (comprobar en auth hook)
- [ ] Staff del cliente tampoco puede loguear
- [ ] Datos se preservan (NO se borran)
- [ ] **Cron job cada día:**
  - Buscar clientes deshabilitados hace 6+ meses
  - Soft delete (marcar como `deleted_at`)
  - Mantener por auditoría (nunca borrar hard)

**Archivos a tocar:**
- `src/components/crm/CrmContacts.tsx` (agregar botón "Deshabilitar")
- `supabase/functions/disable-saas-client/index.ts` (nueva)
- `src/hooks/useAuth.ts` (comprobar `disabled_at` en login)
- `supabase/functions/cleanup-disabled-clients/index.ts` (CRON job)

---

## BLOQUE 3: Sistema de Recordatorios (⭐⭐ Media - Semana 3-4)

### 3.1 Estructura DB + UI Configuración
**Complejidad:** ⭐⭐ Baja-Media  
**Tiempo estimado:** 2-3 días  
**Dependencias:** Ninguna

**Tablas:**
```sql
crm_reminders:
  id, user_id, contact_id, appointment_id, type (email|whatsapp), 
  scheduled_time, message, status (pending|sent|failed), created_at

crm_reminder_config:
  user_id, email_limit_per_month (100), whatsapp_limit_per_month (100), 
  auto_reminder_before_hours (24), created_at

crm_reminder_queue:
  id, user_id, reminder_id, status (pending|processing|sent), error, created_at
```

**UI en CrmSettings → Nuevo tab "Recordatorios":**
- [ ] Campo: "Horas antes de cita para recordatorio automático" (default: 24)
- [ ] Toggle: "Enviar recordatorio automático"
- [ ] Visor: "100 recordatorios disponibles este mes"
  - Barra de progreso
  - Contador: X de 100 usados
- [ ] Tabla histórica: recordatorios enviados (fecha, contacto, tipo, estado)
- [ ] Botón "Enviar recordatorio manual" (one-off)

**Archivos a tocar:**
- `supabase/migrations/20260413_reminders.sql` (crear tablas)
- `src/components/crm/CrmSettings.tsx` (agregar RemindersTab)
- `src/hooks/useCrmData.ts` (CRUD reminders)

---

### 3.2 Recordatorios Automáticos (Pre-Cita)
**Complejidad:** ⭐⭐⭐ Media  
**Tiempo estimado:** 2-3 días  
**Dependencias:** 3.1, Twilio setup

**CRON Job cada 5 minutos:**
- [ ] Buscar citas próximas en X horas (según `crm_reminder_config.auto_reminder_before_hours`)
- [ ] Revisar si ya hay reminder enviado (query `crm_reminders`)
- [ ] Si no existe:
  - Crear row en `crm_reminders`
  - Insertar en `crm_reminder_queue`
  - Respetar límite de 100 por mes
  - Si excede límite → marcar como "skipped"

**Edge function `send-reminders`:**
- [ ] Lee `crm_reminder_queue` (pending)
- [ ] Para cada reminder:
  - Si type = "email": Resend API
  - Si type = "whatsapp": Twilio API (con API key del usuario)
  - Capturar errores (API key inválida, número inválido, etc.)
  - Marcar como "sent" o "failed"
- [ ] Log en `crm_reminders.status`

**Archivos a tocar:**
- `supabase/functions/send-reminders/index.ts` (edge function nueva)
- `supabase/functions/cron-queue-reminders/index.ts` (CRON job)
- `.env` (RESEND_API_KEY)

---

### 3.3 Recordatorios Personales (One-off)
**Complejidad:** ⭐ Muy Baja  
**Tiempo estimado:** 1-2 días  
**Dependencias:** 3.1, 3.2

**UI en componentes:**
- [ ] Botón "Crear recordatorio" en:
  - `CrmContacts.tsx` (recordar contacto)
  - `CrmCalendar.tsx` (recordar cita)
- [ ] Modal: 
  - Fecha/hora del recordatorio
  - Mensaje personalizado
  - Tipo: email | whatsApp
  - Botón "Enviar ahora" o "Agendar"
- [ ] Guardar en `crm_reminders`
- [ ] CRON `send-reminders` también procesa éstos

**Archivos a tocar:**
- `src/components/modals/CreateReminderModal.tsx` (nueva)
- `src/components/crm/CrmContacts.tsx`, `CrmCalendar.tsx` (agregar botón)

---

## BLOQUE 4: Google Calendar Integration (⭐⭐⭐⭐⭐ Muy Difícil - Semana 4-5)

### 4.1 OAuth2 Setup + Database
**Complejidad:** ⭐⭐⭐⭐ Muy Alta  
**Tiempo estimado:** 2-3 días  
**Dependencias:** Ninguna (requiere Google Cloud setup)

**Setup Google Cloud:**
- [ ] Crear proyecto en Google Cloud Console
- [ ] OAuth 2.0 credentials (Web application)
- [ ] Authorized redirect URIs: `[APP_URL]/crm/integrations/google-calendar/callback`
- [ ] Scopes necesarios:
  - `https://www.googleapis.com/auth/calendar`
  - `https://www.googleapis.com/auth/calendar.events`

**Database:**
```sql
crm_google_calendar_tokens:
  id, user_id, crm_calendar_id, google_account_email, access_token, refresh_token, 
  expires_at, google_calendar_id, is_sync_enabled, created_at
  -- Nota: 1 crm_calendar = máximo 1 google connection

crm_google_sync_log:
  id, user_id, action (sync_to_google|sync_from_google), status, error, created_at
```

**Estructura:**
- ✅ Un CRM puede tener **múltiples calendarios** (crm_calendar_config)
- ✅ Cada calendario se conecta a **máximo 1 Google Calendar**
- ✅ Un usuario puede conectar Google Calendar a su propio CRM (Admin o Cliente SaaS)

**Edge function `google-calendar-auth`:**
- [ ] Recibe `code` de Google OAuth
- [ ] Intercambia por token (server-to-server)
- [ ] Guarda tokens en DB
- [ ] Retorna success al frontend
- [ ] Manejo de errores (expired tokens, revoke, etc.)

**UI:**
- [ ] Botón "Conectar Google Calendar" en CrmCalendarConfig
- [ ] Redirige a Google Auth consent
- [ ] Callback → valida y guarda tokens

**Archivos a tocar:**
- `supabase/migrations/20260414_google_calendar.sql`
- `supabase/functions/google-calendar-auth/index.ts` (nueva)
- `src/components/crm/CrmCalendarConfig.tsx` (agregar botón + callback)
- `.env` (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)

---

### 4.2 Google Calendar Sync (Acrosoft → Google)
**Complejidad:** ⭐⭐⭐⭐ Muy Alta  
**Tiempo estimado:** 3-4 días  
**Dependencias:** 4.1

**Triggers:**
- [ ] Crear cita en `CrmCalendar` → Edge function `sync-to-google`
- [ ] Editar cita → Edge function `sync-to-google` (update)
- [ ] Cancelar cita (status = cancelled) → Edge function `sync-to-google` (delete)

**Lógica de Reactivación de Citas:**
- Si se cancela una cita y el **mismo contacto** quiere agendar → **reactivar** cita existente (status = active)
- Si es un **contacto diferente** → crear **nueva cita**
- Verificar: `contact_id` match + `status = cancelled` para reactivar

**Edge function `sync-to-google-calendar`:**
- [ ] Recibe: `appointment_id`, `action` (create|update|delete)
- [ ] Obtiene Google tokens del user
- [ ] Comprobar si token expirado → refresh si es necesario
- [ ] Llama Google Calendar API:
  - CREATE: `POST /calendar/v3/calendars/{calendarId}/events`
  - UPDATE: `PUT /calendar/v3/calendars/{calendarId}/events/{eventId}`
  - DELETE: `DELETE /calendar/v3/calendars/{calendarId}/events/{eventId}`
- [ ] Guarda `google_event_id` en `crm_appointments`
- [ ] Log en `crm_google_sync_log`
- [ ] Manejo de errores: token revoked, permiso denied, etc.

**Campos a sincronizar:**
- Título: `[Cliente] - [Servicio]`
- Fecha/hora: de `appointment.date` y `appointment.hour`
- Descripción: contacto, teléfono, etc.

**Archivos a tocar:**
- `supabase/functions/sync-to-google-calendar/index.ts` (nueva)
- `src/components/crm/CrmCalendar.tsx` (trigger sync on save)
- `src/lib/google-calendar-utils.ts` (helpers)
- `supabase/migrations` (agregar `google_event_id` a `crm_appointments`)

---

### 4.3 Google Calendar Sync (Google → Acrosoft) - BIDIRECCIONAL
**Complejidad:** ⭐⭐⭐⭐⭐ Extremadamente Difícil  
**Tiempo estimado:** 3-5 días  
**Dependencias:** 4.1, 4.2

**CRON Job cada 15 minutos:**
- [ ] Para cada user con Google Calendar conectado:
  - Obtener tokens (refresh si es necesario)
  - Listar eventos de Google Calendar (últimos cambios)
  - Comparar con `crm_appointments` (match por `google_event_id`)
  - Si evento borrado en Google → marcar `crm_appointments.status = 'cancelled'`
  - Si evento editado (fecha/hora) → actualizar `crm_appointments.date` y `crm_appointments.hour`
  - Si evento nuevo en Google:
    - Crear `crm_appointment` con info básica
    - Dejar `contact_id` vacío (requiere match manual o heurística)
    - Marcar como "sync_only: true"

**Manejo de conflictos:**
- [ ] **Source of truth:** Acrosoft siempre (Google es mirror)
  - Si conflicto en fecha/hora → Acrosoft gana, reapply a Google
  - Si conflicto en descripción → ignorar
  - Timeout de 30 min: si se edita en ambos simultáneamente, last-write-wins

**Manejo de cambios:**
- [ ] Usar `syncToken` de Google Calendar API (más eficiente que full sync)
- [ ] Solo procesar cambios nuevos desde último sync

**Edge function `sync-from-google-calendar`:**
- [ ] Recibe: `user_id`, `sync_token`
- [ ] Google Calendar API:
  - `GET /calendar/v3/calendars/{calendarId}/events?syncToken={syncToken}`
- [ ] Procesar cambios (create|update|delete)
- [ ] Guardar nuevo `syncToken` para próximo ciclo

**Archivos a tocar:**
- `supabase/functions/sync-from-google-calendar/index.ts` (nueva)
- `supabase/functions/cron-sync-google-calendar/index.ts` (CRON job)
- `src/lib/google-calendar-utils.ts` (helpers para conflictos)
- `supabase/migrations` (agregar campos: `google_event_id`, `sync_token`, `last_synced_at`)

**NOTA CRÍTICA:**
- Esta es la tarea MÁS COMPLEJA del roadmap
- Requiere manejo cuidadoso de tokens, errores de API, conflictos de datos
- Considerar implementar primero 4.2 (Acrosoft → Google) y dejar 4.3 para sprint posterior

---

## BLOQUE 5: WhatsApp Integration & Bug Fixes (⭐⭐⭐ Media - Semana 5-6)

### 5.1 WhatsApp Setup (Twilio)
**Complejidad:** ⭐⭐ Baja-Media  
**Tiempo estimado:** 2-3 días  
**Dependencias:** Ninguna

**Setup Twilio:**
- [ ] Crear cuenta Twilio
- [ ] Obtener: Account SID, Auth Token, WhatsApp phone number
- [ ] Configurar webhook para mensajes entrantes (opcional)

**UI:**
- [ ] Sección en CrmSettings → "Integraciones" → "WhatsApp"
- [ ] Campos:
  - Twilio Account SID (input)
  - Twilio Auth Token (password input)
  - Twilio Phone Number (input)
- [ ] Botón "Guardar" y "Probar conexión"
- [ ] Indicador: "✓ Conectado" o "✗ Error"

**Database:**
```sql
crm_whatsapp_config:
  user_id, twilio_account_sid, twilio_auth_token (encrypted), 
  twilio_phone_number, created_at
```

**Archivos a tocar:**
- `supabase/migrations/20260415_whatsapp_config.sql`
- `src/components/crm/CrmSettings.tsx` (agregar WhatsAppTab)
- `src/lib/encryption.ts` (cifrar tokens)
- `supabase/functions/test-whatsapp-connection/index.ts` (nueva)

---

### 5.2 Revisar & Corregir Errores
**Complejidad:** ⭐⭐ Variable  
**Tiempo estimado:** 2-4 días  
**Dependencias:** Todos los bloques

**Tareas:**
- [ ] Revisar error al enviar formularios (¿ocurre en todos? ¿solo admin?)
- [ ] Revisar error al registrar citas en calendario (¿ocurre en todos?)
- [ ] Logs/Debugging
- [ ] Fix e implementación de solución

---

## 📅 Timeline Recomendado

```
SEMANA 1: BLOQUE 1
├─ 1.1 Indicador + Botón Acceder (2-3 días)
├─ 1.2 Tab SaaS Services (1-2 días)
└─ 1.3 Staff CRUD (3-4 días)
✓ ENTREGABLE: Admin y Clientes visibles, Staff creable

SEMANA 2-3: BLOQUE 2
├─ 2.1 RLS Policies (3-4 días) ⚠️ CRÍTICO
├─ 2.2 SaaS Account Creation (2-3 días)
├─ 2.3 Magic Link Login (2-3 días)
├─ 2.4 Staff Login & Perms (3-5 días)
└─ 2.5 Deshabilitar Cliente (1 día)
✓ ENTREGABLE: Full multi-tenant auth + client isolation

SEMANA 3-4: BLOQUE 3
├─ 3.1 DB + UI (2-3 días)
├─ 3.2 Auto Reminders (2-3 días)
└─ 3.3 Custom Reminders (1-2 días)
✓ ENTREGABLE: Recordatorios funcionales (100 límite)

SEMANA 4-5: BLOQUE 4
├─ 4.1 OAuth Setup (2-3 días)
├─ 4.2 Sync Acrosoft → Google (3-4 días)
└─ 4.3 Sync Google → Acrosoft (3-5 días) ⚠️ MÁS COMPLEJO
✓ ENTREGABLE: Sincronización bidireccional

SEMANA 5-6: BLOQUE 5
├─ 5.1 WhatsApp Twilio (2-3 días)
└─ 5.2 Bug Fixes (2-4 días)
✓ ENTREGABLE: Sistema completo + estable
```

---

## ⚠️ PUNTOS CRÍTICOS

| Punto | Descripción | Mitigación |
|-------|-------------|-----------|
| **2.1 RLS** | Policies complejas, facil errores | Testing exhaustivo, permisos granulares |
| **4.3 Google Sync** | Conflictos de datos, tokens expiran | Decidir source-of-truth primero |
| **Admin data isolation** | Admin NO debe ver datos clientes | RLS strict, auditoría de queries |
| **Staff permisos** | Granular pero complejo | Sistema permissions.ts robusto |
| **Twilio WhatsApp** | API key en DB (seguridad) | Cifrar tokens en DB |

---

## ✅ DECISIONES FINALES

- ✅ **WhatsApp:** Twilio (yo lo configuro)
- ✅ **Email:** Resend
- ✅ **Google Calendar:** OAuth + Sync bidireccional (aunque 4.3 es muy complejo)
- ✅ **Recordatorios:** 100 límite por mes, por usuario
- ✅ **Permisos Staff:** Granular por subsección (R/E/C/D)
- ✅ **Data isolation:** RLS policies + JWT claims
- ✅ **Admin access clientes:** Magic link (botón ámbar sin credenciales)

---

## ✅ CLARIFICACIONES FINALES (10 Decisiones)

1. **Cambio de contraseña en "Datos Personales":**
   - ✅ Sí, los usuarios pueden cambiar su contraseña desde la sección "Mi Negocio" → "Datos personales"
   - Se implementa con password reset flow en Supabase Auth

2. **Invitación de Staff por Email:**
   - ✅ Sí, al crear un staff miembro se envía email de invitación
   - Email contiene link para establecer contraseña (7 días de validez)
   - Similar a la invitación SaaS (2.2)

3. **Clientes crean sus propios Contactos y Citas:**
   - ✅ Sí, los Clientes SaaS pueden crear y gestionar sus propios contactos y citas
   - No se limita a lectura; tienen permisos completos en su CRM
   - Cada cliente ve solo sus datos (RLS policies)

4. **Tipo y Entrega de Recordatorios:**
   - ✅ El usuario final decide tipo (email | WhatsApp) y timing
   - Configuración en CrmSettings → "Recordatorios"
   - Campo: "Horas antes de cita para recordatorio automático" (personalizable)
   - El sistema respeta la configuración del usuario

5. **Múltiples Calendarios + Google Integration:**
   - ✅ Un CRM puede tener múltiples calendarios (muchos-a-uno)
   - ✅ Cada calendario se conecta a máximo 1 Google Calendar
   - Flow: Usuario crea calendario → conecta Google Calendar → sincroniza bidireccional

6. **Flujo de Citas Canceladas y Reactivación:**
   - ✅ Si se cancela una cita y el mismo contacto quiere agendar → **reactivar** la cita existente
   - ✅ Si es un contacto diferente → crear **nueva cita**
   - Lógica: verificar `contact_id` y `status = cancelled`

7. **Eliminación de Datos (Clientes Deshabilitados):**
   - ✅ Sí, después de 6 meses de deshabilitación → soft delete (marcar como `deleted_at`)
   - Datos se preservan para auditoría (nunca hard delete)
   - CRON job implementado en 2.5

8. **Número de Clientes SaaS:**
   - ✅ **Ilimitado.** No hay restricción en cantidad de clientes SaaS que Acrosoft puede tener
   - Cada cliente es completamente aislado via RLS

9. **Visibilidad del Dashboard:**
   - ✅ **Dashboard visible para clientes SaaS:** Sí
   - Los clientes ven sus propias métricas, ventas, calendarios
   - Admin ve solo sus datos (no ve datos de clientes)

10. **Múltiples Logins Simultáneos:**
    - ✅ **Sí, permitido.** Un usuario puede estar logueado en múltiples dispositivos/sesiones simultáneamente
    - Supabase Auth lo permite nativamente (no hay restricción de sesiones)

---

## 📊 Métricas

| Bloque | Complejidad | Tiempo | % del Total |
|--------|------------|--------|-----------|
| 1 | ⭐ | 1 semana | 17% |
| 2 | ⭐⭐⭐ | 2 semanas | 33% |
| 3 | ⭐⭐ | 1.5 semanas | 25% |
| 4 | ⭐⭐⭐⭐⭐ | 2 semanas | 33% |
| 5 | ⭐⭐ | 1 semana | 17% |
| **TOTAL** | **⭐⭐⭐⭐** | **~6 semanas** | **100%** |

---

## 🚀 ESTADO

- ✅ Todas las preguntas respondidas
- ✅ Arquitectura clarificada
- ✅ Dependencies mapeadas
- ✅ Timeline realista
- ✅ 10 Clarificaciones finales integradas
- **✅ DOCUMENTO LISTO PARA DESARROLLO**

---

## 📝 NOTAS DE INTEGRACIÓN

**Cambios principales incorporados (10 abril 2026):**
- Agregado apartado "CLARIFICACIONES FINALES" con 10 decisiones críticas
- Actualizado sección de capacidades de Cliente SaaS (crear contactos, acceder dashboard, cambiar contraseña)
- Clarificado flujo de invitación de staff por email
- Especificado regla: 1 CRM → múltiples calendarios, 1 calendario → máximo 1 Google connection
- Documentado flujo de reactivación de citas canceladas
- Confirmado: ilimitados clientes SaaS, permitidos múltiples logins simultáneos, dashboard visible para clientes

**El documento está 100% alineado con los requerimientos del usuario y listo para proceder con BLOQUE 1.**
