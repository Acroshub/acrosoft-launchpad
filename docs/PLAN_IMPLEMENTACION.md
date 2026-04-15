# Plan de Implementación - Roadmap por Complejidad

**Última actualización:** 2026-04-14  
**Estado:** EN DESARROLLO ACTIVO

---

## 🎯 Resumen Ejecutivo

CRM SaaS multi-tenant sobre Supabase + React. 5 bloques ordenados por complejidad. Los bloques 3.1–3.3 y partes de 1.2, 1.3, 4.1 ya están completados.

---

## ENTENDIMIENTO COMÚN DEL SISTEMA

### **Estructura de Usuarios**
```
Acrosoft (Admin - Usuario Principal)
├─ CRM propio (independiente)
├─ Staff del Admin (ven solo datos de Acrosoft)
├─ Contactos (clientes potenciales + clientes SaaS)
│  └─ Clientes SaaS (label "Booking System")
│     └─ Su propio CRM (botón "Acceder a CRM" ámbar)
│        └─ Staff del Cliente SaaS (permisos granulares)
```

### **Key Points**
- Admin ve SOLO sus datos, NO puede ver datos de clientes SaaS
- Cada Cliente SaaS ve SOLO sus datos
- Staff ve exactamente los datos del cliente que lo contrató
- Un Contacto puede comprar máximo 1 servicio SaaS ($5000 Booking System)
- Contacto deshabilitado → no login, datos preservados, eliminación 6 meses

---

## ✅ LO YA IMPLEMENTADO

### Bloque 1 — UI & CRUD
- ✅ **1.2** Tab "SaaS" en CrmSettings (SaasTab implementado)
- ✅ **1.3** Staff CRUD con permisos granulares + `permissions.ts` + `useStaffPermissions()`

### Bloque 3 — Recordatorios
- ✅ **3.1** DB: `crm_reminders`, `crm_reminder_config`, `crm_reminder_queue`, columnas `reminder_rules` en calendarios y formularios, `pipeline_id` + `auto_tags` en formularios, columnas `is_personal`/`staff_id`/`business_target` en reminders
- ✅ **3.2** CRON `cron-queue-reminders` (Pass A/B/C) con deduplicación por `rule:sourceId:ruleId:targetId`
- ✅ **3.3** UI completa de recordatorios:
  - `ReminderRulesEditor` con destinatario (contacto / negocio), sub-destinatario multi-select (Admin con nombre real + rol + Staff con checkboxes), canal (Email/WhatsApp) con campo editable auto-sugerido, timing (antes/después + cantidad + unidad)
  - Integrado en config de Calendario y de Formulario
  - Vista "Recordatorios" en menú izquierdo: paneles Calendario, Formulario y Personal
  - Recordatorios Personales: grid con countdown, Editar/Eliminar, crear nuevo con destinatario multi-select y canal
- ✅ **3.4** Edge Function `send-reminders` con Resend API, retry hasta 3 intentos, envío por email y WhatsApp

### Bloque 4 — Google Calendar
- ✅ **4.1 parcial** UI de conexión en `CrmCalendarConfig`, edge function `google-calendar-oauth` desplegada, token guardado en `crm_calendar_config.google_token`

### Bloque 2 — SaaS Multi-Tenant
- ✅ **2.1** Badge "🔐 Booking System" en lista de contactos (estado activo/pendiente)
- ✅ **2.2** Botón "CRM" ámbar que abre link mágico en nueva pestaña
- ✅ **2.3** Edge Function `create-saas-client`: invitación vía Supabase Auth, crea `crm_client_accounts`, envía email automático
- ✅ **2.4** Botones "Deshabilitar" / "Reactivar" cuenta SaaS en detalle de contacto
- ✅ **2.5** Indicador de estado (pending/active/disabled) en contacto

### Correcciones (5.2)
- ✅ Error envío formularios (columna `auto_tags` faltante)
- ✅ Contactos no llegaban al pipeline (`crm_contacts.stage` en lugar de `crm_pipeline_deals`)
- ✅ Datos del formulario vacíos en ficha del contacto (`custom_fields[form_id]`)
- ✅ Calendario mostraba "Servicio" y "Notas" con datos incorrectos
- ✅ Agendamiento no aparecía en Log
- ✅ Pipeline selector en formularios (todos los tipos, sin filtro)
- ✅ CalendarRenderer oculta slots/días sin disponibilidad real
- ✅ Botón Bell eliminado del detalle de cita
- ✅ RemindersTab simplificado (límite mensual + historial)
- ✅ Admin label mostrando nombre real + rol en ReminderRulesEditor
- ✅ Drag-drop de servicios: reorden por `sort_order` sincronizado con DB
- ✅ WhatsApp botón deshabilitado con tooltip cuando no configurado

---

## 🚀 LO QUE SIGUE — ORDENADO DE MÁS FÁCIL A MÁS DIFÍCIL

### ⭐ QUICK WINS (1–2 días cada uno) — COMPLETADOS

#### ✅ QW-1: Envío real de email con Resend

- [x] Edge Function `send-reminders` desplegada: Resend API, retry 3 intentos
- [x] Cron pg_cron cada 5 min configurado
- [x] `RESEND_API_KEY` en secrets

#### ✅ QW-2: CRON que genera la cola de recordatorios

- [x] Edge Function `cron-queue-reminders` (Pass A/B/C)
- [x] Deduplicación por `rule:sourceId:ruleId:targetId`
- [x] `calendar_id` en `crm_appointments`

#### ✅ QW-3: Sincronización real del orden de servicios

- [x] `sort_order ASC, created_at ASC` en `useServices`
- [x] Drag-drop con `Promise.all` para update

#### ✅ QW-4: WhatsApp — Bloqueo inteligente de UI

- [x] `useWhatsappEnabled()` gate
- [x] Botón WhatsApp deshabilitado en `ReminderRulesEditor` y `CrmReminders`

---

### ⭐⭐ MEDIA (2–4 días) — COMPLETADOS

#### ✅ M-1: Indicador "Booking System" + botón "Acceder a CRM"

- [x] Badge ámbar "🔐 Booking System" en contactos
- [x] Botón "CRM" llama `generate-magic-link`
- [x] `accountByContact` map para lookup

#### ✅ M-2: SaaS Account Creation

- [x] Edge Function `create-saas-client`: Auth invite + email
- [x] Hook `useCreateSaasClient()`
- [x] Botón "Activar Booking System" en detalle

#### ✅ M-3: Deshabilitar / Reactivar Cliente SaaS

- [x] Botones "Deshabilitar" / "Reactivar"
- [x] Indicador de estado (pending/active/disabled)
- [x] Hooks `useDisableSaasClient` / `useEnableSaasClient`

---

### ⭐⭐ SIGUIENTE PRIORIDAD

#### M-3.5: Kit de Descarga + Documento Maestro por Servicio
**Complejidad:** ⭐⭐⭐ Media  
**Dependencias:** M-2 (SaaS accounts), Onboarding completo

**Descripción:**
Cuando admin ve ficha técnica de contacto, puede descargar un "Kit" que contiene:
1. **Documento maestro .md** dinámico según servicio elegido
2. **Fotos** subidas en onboarding
3. **Configuración automática** si es Booking System

**Implementación por servicio:**

**A) Single Page Website:**
- [ ] Documento .md listo para developer: estructura landing page con secciones, hero, servicios, contacto
- [ ] Incluye: nombre negocio, descripción, servicios, precios, referencias, colores, tipografía
- [ ] Template markdown con placeholders para contenido

**B) Multi Page Website (6 páginas):**
- [ ] Documento .md con estructura: Landing + 6 páginas (Inicio, Servicios, Equipo, Galería, Blog/Testimonios, Contacto)
- [ ] Incluye todos los datos del onboarding + fotos en secciones
- [ ] Información de equipo, horarios, ubicación, redes sociales
- [ ] Colores, fuentes, logo extraído del onboarding

**C) Booking System (CRM):**
- [ ] Documento .md: Landing + 6 páginas (igual a Multi Page)
- [ ] **ADEMÁS:** Crear automáticamente Usuario Cliente SaaS con:
  - Perfil llenable desde onboarding (nombre negocio, descripción, logo, colores)
  - Horarios/availability del onboarding
  - Servicios registrados con precios
  - Email de bienvenida con link para configurar password
  - Se puede seguir editando en el CRM del cliente

**Funcionalidades técnicas:**
- [ ] Edge Function `generate-kit`: toma datos del onboarding + fotos → genera .md + comprime todo en ZIP
- [ ] UI en `CrmContacts` detail: botón "Descargar Kit" (visible si onboarding completado)
- [ ] Si es Booking System: al descargar, también crea el usuario SaaS automáticamente
- [ ] Ficha técnica muestra datos del onboarding de forma completa y organizada
- [ ] Fotos del onboarding muestran en galería en la ficha técnica

**Archivos:** 
- `supabase/functions/generate-kit/index.ts`
- `src/components/crm/CrmContacts.tsx` (button + ficha técnica expanded)
- Nueva tabla: `crm_onboarding` (si no existe) con todos los datos del onboarding

---

#### M-4: WhatsApp QR Setup
**Complejidad:** ⭐⭐⭐ Media  
**Dependencias:** QW-1 (para tener el pipeline de envío listo)

- [ ] Setup Evolution API o Z-api (servidor externo)
- [ ] Edge function para obtener QR en vivo y estado de conexión
- [ ] UI en CrmSettings → "Integraciones" → "WhatsApp": QR + estado + disclaimer de riesgo de spam
- [ ] `crm_whatsapp_config`: `user_id`, `session_uuid`, `status`, `phone_number`
- [ ] Edge Function `send-reminders` envía por WhatsApp cuando canal = "whatsapp" y hay sesión activa

**Archivos:** `src/components/crm/CrmSettings.tsx`, `supabase/functions/send-reminders/index.ts`

---

### ⭐⭐⭐ DIFÍCIL (3–5 días)

#### D-1: Magic Link Login (Admin → Cliente SaaS)
**Complejidad:** ⭐⭐⭐ Media-Alta  
**Dependencias:** M-2

- [ ] Edge Function `generate-magic-link` → JWT temporal 30 min en tabla `crm_magic_links`
- [ ] Botón ámbar "Acceder a CRM" en contacto llama esta función
- [ ] Página `/crm-client/login?token=[JWT]` valida y crea sesión Supabase sin password

**Archivos:** `supabase/functions/generate-magic-link/index.ts`, `src/pages/CrmClientLogin.tsx`

---

#### D-2: Staff Login & JWT Permissions
**Complejidad:** ⭐⭐⭐ Media-Alta  
**Dependencias:** 1.3 (ya hecho)

- [ ] Edge Function `create-staff-user`: crea user en auth con claims `account_type: "staff"` + permisos
- [ ] Email de invitación al staff (igual que SaaS, link 7 días)
- [ ] `useStaffPermissions()` ya existe — conectar con JWT real

**Archivos:** `supabase/functions/create-staff-user/index.ts`, `src/hooks/useAuth.ts`

---

#### D-3: Google Calendar Sync (Acrosoft → Google)
**Complejidad:** ⭐⭐⭐⭐ Muy Alta  
**Dependencias:** 4.1 (parcialmente listo)

- [ ] Edge Function `sync-to-google-calendar`: create / update / delete eventos
- [ ] Trigger desde `CrmCalendar` al guardar/cancelar cita
- [ ] Guardar `google_event_id` en `crm_appointments`
- [ ] Refresh token automático si está expirado

**Archivos:** `supabase/functions/sync-to-google-calendar/index.ts`, `src/components/crm/CrmCalendar.tsx`

---

### ⭐⭐⭐⭐⭐ MUY DIFÍCIL (última fase)

#### MD-1: RLS Policies Multi-tenant
**Complejidad:** ⭐⭐⭐ Media-Alta (pero bloqueante para producción real)  
**Dependencias:** M-2, D-2

- [ ] RLS completo: Admin ve solo sus datos, Cliente SaaS sus datos, Staff según permisos
- [ ] JWT claims: `account_type` + `business_user_id`
- [ ] Migration grande con policies en todas las tablas CRM

**Archivos:** `supabase/migrations/rls_multitenant.sql`

---

#### MD-2: Google Calendar Sync Bidireccional (Google → Acrosoft)
**Complejidad:** ⭐⭐⭐⭐⭐ Extremadamente Difícil  
**Dependencias:** D-3

- [ ] CRON cada 15 min con `syncToken` de Google
- [ ] Resolución de conflictos (Acrosoft = source of truth)
- [ ] Eventos nuevos desde Google → `crm_appointments` con `sync_only: true`

---

## 📅 Estado de ejecución

```
✅ COMPLETADOS (Sprint 1-2):
  ✅ QW-1  Envío real email (Resend)
  ✅ QW-2  CRON cola de recordatorios
  ✅ QW-3  Fix sort_order servicios
  ✅ QW-4  Bloqueo WhatsApp en UI
  ✅ M-1   Badge + botón "Acceder a CRM"
  ✅ M-2   SaaS Account Creation
  ✅ M-3   Deshabilitar cliente SaaS

📋 PRÓXIMOS (por orden de prioridad):
  1. M-3.5 Kit descarga + Doc Maestro (⭐⭐⭐ media, 3-4 días) — NUEVO
  2. M-4   WhatsApp QR Setup (⭐⭐⭐ media complejidad, 2-3 días)
  3. D-1   Magic Link Login (⭐⭐⭐ media-alta, 2-3 días)
  4. D-2   Staff JWT Login (⭐⭐⭐ media-alta, 2-3 días)
  5. MD-1  RLS Policies (⭐⭐⭐ necesario para producción, 3-4 días)
  6. D-3   Google Sync Acrosoft → Google (⭐⭐⭐⭐ muy alta, 4-5 días)
  7. MD-2  Google Sync bidireccional (⭐⭐⭐⭐⭐ extremadamente difícil, última fase)
```

---

## ⚠️ Puntos críticos

| Punto | Descripción | Mitigación |
|-------|-------------|-----------|
| **MD-1 RLS** | Sin esto cualquier usuario puede ver datos de otro | Hacer antes del primer cliente SaaS real |
| **MD-2 Google Sync** | Conflictos de datos, tokens expiran | Acrosoft es source-of-truth, syncToken |
| **M-4 WhatsApp QR** | Riesgo de ban del número | Disclaimer prominente + límites estrictos |
| **send-reminders** | `reminder_rules` en JSON deben parsearse bien | Tipado estricto + validación en edge function |
| **D-2 Staff JWT** | Permisos en token deben ser inmutables | Refresh token revoca permisos viejos |

---

## ✅ Decisiones confirmadas

- **WhatsApp:** QR (modo Web) con disclaimer + bloqueo UI si no configurado
- **Email:** Resend
- **Google Calendar:** OAuth + Sync bidireccional (bidireccional en sprint final)
- **Recordatorios:** 100/mes por usuario, reglas por calendario y formulario
- **Permisos Staff:** Granular R/E/C/D por subsección
- **Data isolation:** RLS + JWT claims
- **Admin → Cliente:** Magic link, botón ámbar, sin credenciales
- **Pipelines en formularios:** Todos los tipos visibles (no solo "contacts")
- **Destinatario "El negocio":** Nombre real del perfil con rol + staff multi-seleccionable
