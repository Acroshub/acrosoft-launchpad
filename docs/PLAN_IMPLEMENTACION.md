# Plan de Implementación — Acrosoft Labs CRM
> Última actualización: Abril 2026 · Basado en Q&A completo del proyecto

---

## Estado actual del sistema

La UI de todos los módulos está completa. El backend (Supabase) está parcialmente conectado. Lo que sigue es conectar la lógica real, corregir bugs arquitectónicos y construir las features faltantes — ordenado de menor a mayor complejidad.

---

## BLOQUE 1 — Quick Wins
> Cambios de 1–4 horas. Sin riesgo. Mejoras inmediatas.

### QW-1 · isSuperAdmin dinámico ✅ COMPLETADO
**Problema:** `isSuperAdmin` está hardcodeado como `true` en `Crm.tsx`.
**Fix:** Comparar `user.email === 'e.daniel.acero.r@gmail.com'` al montar el componente.
**Archivos:** `src/pages/Crm.tsx`

---

### QW-2 · Eliminar CrmClients.tsx ✅ COMPLETADO
**Problema:** Duplicado accidental del Dashboard. Todo con `{VAR_DB}`. No tiene función real.
**Fix:** Eliminar el archivo. La vista "Clientes" será un filtro dentro de `CrmContacts` (contactos con al menos una venta registrada).
**Archivos:** `src/components/crm/CrmClients.tsx` → eliminar

---

### QW-3 · Stage del contacto dinámico ✅ COMPLETADO
**Problema:** El stage de un contacto se muestra como texto fijo. Ahora es el nombre de la columna del pipeline donde esté. Un contacto puede estar en múltiples pipelines → múltiples stages.
**Fix:** En la UI de contactos, mostrar todos los stages activos del contacto como badges (uno por pipeline donde aparezca). Hook `useAllContactStages` construye mapa `contact_id → [{pipelineName, stage}]` desde `crm_tasks JOIN crm_pipelines`.
**Archivos:** `src/components/crm/CrmContacts.tsx`

---

### QW-4 · Métricas del Overview — reestructuración ✅ COMPLETADO
**Cambios:**
- Eliminar métrica "Proyectos activos"
- Renombrar "Entregados (mes)" → "Ventas este mes" (mes calendario, no 30 días rolling)
- Reemplazar "Proyectos activos" por cards dinámicas de **Ingreso Recurrente Estimado**: una card por cada intervalo de recurrencia configurado en los servicios del negocio (mensual, anual, trimestral, semestral). Se calcula sumando el precio recurrente de los clientes activos con ese intervalo.
- El orden de métricas (drag) debe guardarse en Supabase — añadir campo `metrics_order jsonb` en `crm_business_profile`.
- Estas métricas son visibles para todos los Dueños de Negocio y Staff con permiso de dashboard.

**Archivos:** `src/components/crm/CrmOverview.tsx`, migración en `crm_business_profile`

---

### QW-5 · Servicios dinámicos en Landing ✅ COMPLETADO
**Problema:** El array `plans` en `Index.tsx` está hardcodeado.
**Fix:** Cargar todos los servicios activos del Admin desde `crm_services` via `usePublicServices`. Mostrar todos (SaaS y no-SaaS). La UI de cards se adapta dinámicamente a la cantidad de servicios registrados.
**Archivos:** `src/pages/Index.tsx`

---

### QW-6 · Descuento en servicios ✅ COMPLETADO
**Cambio:** Añadir campo `discount_pct numeric DEFAULT 0` en `crm_services`.
**UI:** Campo de descuento en el editor de `CrmServices`. Mostrar precio tachado + precio con descuento en la landing y en el campo `services` del FormRenderer.
**Archivos:** migración SQL, `src/components/crm/CrmServices.tsx`, `src/components/crm/FormRenderer.tsx`, `src/pages/Index.tsx`

---

### QW-7 · Heading no cuenta como campo real ✅ COMPLETADO
**Fix:** Actualizar validación del builder: al verificar "al menos 1 campo por página", el tipo `heading` no cuenta.
**Archivos:** `src/components/crm/CrmForms.tsx`

---

## BLOQUE 2 — Fixes de Schema
> Requieren migración SQL + ajuste de hooks. Impacto bajo en UI.

### S-1 · crm_appointments — añadir campo minute ✅ COMPLETADO
**Problema:** Solo hay `hour: int`. Las citas no pueden tener hora exacta con minutos.
**Fix:** Añadir `minute int NOT NULL DEFAULT 0`. Actualizar todos los hooks y componentes que usan `hour` para incluir `minute`.
**Archivos:** migración SQL, `src/hooks/useCrmData.ts`, `src/components/crm/CrmCalendar.tsx`, `src/components/crm/CalendarRenderer.tsx`

---

### S-2 · crm_blocked_slots — añadir calendar_id ✅ COMPLETADO
**Problema:** Los bloqueos son por calendario específico pero no tienen referencia al calendario. Con multi-calendario bloquea todos.
**Fix:** Añadir `calendar_id uuid REFERENCES crm_calendar_config ON DELETE CASCADE NOT NULL`.
**Archivos:** migración SQL, `src/hooks/useCrmData.ts`, `src/components/crm/CrmCalendar.tsx`

---

### ✅ S-3 · crm_calendar_config — campos de anticipación (COMPLETADO)
**Fix:** Columnas `min_advance_hours INT NOT NULL DEFAULT 1` y `max_future_days INT NOT NULL DEFAULT 60` aplicadas.
**UI:** Campos en `CrmCalendarConfig` bajo duración/buffer. Se guardan y cargan desde DB.
**Lógica:** `CalendarRenderer` filtra slots usando timestamp absoluto (`minBookableMs`) y bloquea días/navegación más allá de `maxDateKey`.

---

### ✅ S-4 · crm_services — discount_pct y sync general (COMPLETADO)
Todos los campos de `CrmService` verificados en DB: `is_saas`, `active`, `sort_order`, `recurring_label`, `delivery_time`, `benefits` (jsonb), `is_recommended`, `discount_pct`. Sin migraciones pendientes. UI lee y escribe todos los campos correctamente.

---

### ✅ S-5 · crm_business_profile — metrics_order (COMPLETADO)
`metrics_order jsonb NOT NULL DEFAULT '[]'` existe en DB. `CrmOverview` lee y guarda el orden vía `useUpsertBusinessProfile`. Sin migraciones pendientes.

---

### ✅ S-6 · crm_blocked_slots — soporte de minutos en bloqueos (COMPLETADO)
Migración aplicada: `start_minute INT NOT NULL DEFAULT 0` y `end_minute INT NOT NULL DEFAULT 0`.
- `isSlotBlocked` en `CalendarRenderer` compara en minutos totales.
- `isHourBlocked` en `CrmCalendar` usa overlap detection para sombrado de filas.
- Modal standalone y `SlotDialog`: selectores hora+minuto (0/15/30/45) en "Desde" y "Hasta".
- Mapping `rawBlocked → BlockedSlot` incluye `startMinute`/`endMinute`.

---

## BLOQUE 3 — Fixes de Lógica
> Bugs que afectan funcionalidad real. 2–6 horas cada uno.

### L-12 · useLandingServices y useLandingCalendar — bug multi-tenant
**Origen:** QW-5 auditado. La política RLS `"Public can read services"` tiene `qual: true` — devuelve servicios de TODOS los usuarios.
**Bugs:**
1. `useLandingServices` filtra solo por `active = true` sin `user_id` → servicios de clientes SaaS aparecerán en la landing de Acrosoft cuando haya clientes reales.
2. `useLandingCalendar` hace `ORDER BY created_at LIMIT 1` sin `user_id` → podría mostrar el calendario de un cliente SaaS en vez del del admin.
**Fix:** Ambos hooks deben obtener primero el `user_id` del admin (leyendo el primer `crm_business_profile` público, o hardcodeando el ID del admin como constante en el frontend) y filtrar por él.
**Prioridad:** Media. No falla hoy (un solo usuario). Se activa con el primer cliente SaaS.
**Archivos:** `src/hooks/useCrmData.ts`, `src/pages/Index.tsx`

---

### L-13 · CrmForms — validación "heading no cuenta" incompleta (QW-7)
**Bugs:**
1. La validación `type !== "heading"` solo corre dentro de `if (multiPage)`. Un formulario de una sola página con solo headings puede guardarse y publicarse — el usuario vería una página sin campos reales.
2. `form.fields.length` en la lista de formularios cuenta campos `heading` → muestra contador incorrecto ("3 campos" en vez de "2" si uno es heading).
**Fix:**
1. Añadir validación para `!multiPage`: `fields.filter(f => f.type !== "heading").length === 0` → error antes de guardar.
2. Cambiar `form.fields.length` a `form.fields.filter(f => f.type !== "heading").length` en la lista.
**Prioridad:** Baja. Solo afecta edge case de admin creando formularios vacíos.
**Archivos:** `src/components/crm/CrmForms.tsx`

---

### L-10 · CrmOverview — minutos ignorados en citas (regresión S-1)
**Origen:** S-1 añadió `minute` a `crm_appointments` pero `CrmOverview` nunca fue actualizado.
**Bugs:**
1. `getMetricValue("proxima-cita")` retorna `${hour}:00` — ignora `minute`. Una cita a las 10:30 se muestra como "10:00".
2. Filtro `nextAppointment`: `d.setHours(a.hour, 0, 0, 0)` sin minutos — puede excluir citas futuras del mismo hour si `minute > minuto actual`.
3. Sort `nextAppointment`: `da.setHours(a.hour)` sin minute — ordena mal citas en la misma hora.
4. Sección "Citas de hoy": muestra `${hour}:00` hardcodeado en cada fila.
**Fix:** Propagar `minute` en filtro, sort y display de `nextAppointment` y "Citas de hoy" en `CrmOverview.tsx`.
**Archivos:** `src/components/crm/CrmOverview.tsx`

---

### L-11 · QW-3 — Colisión de stage entre pipelines
**Origen:** `crm_contacts.stage` guarda solo el texto del nombre de columna sin referencia al `pipeline_id`. Si dos pipelines tienen una columna con el mismo nombre, `useAllContactStages` asigna el contacto a ambos como falso positivo.
**Impacto:** Bajo con 1 pipeline. Alto al escalar (2+ pipelines con columnas de nombre similar).
**Fix:** Guardar stage como mapa `{ pipeline_id → stage_name }` en `crm_contacts.custom_fields` o agregar tabla `crm_contact_pipeline_stages(contact_id, pipeline_id, stage)`. Actualizar `useAllContactStages`, `addContactToPipelines` (edge function) y la UI de pipeline drag.
**Archivos:** migración SQL, `src/hooks/useCrmData.ts`, `supabase/functions/crm-form-public/index.ts`, `src/components/crm/CrmPipeline.tsx`
**Complejidad:** Alta — requiere cambio de schema + migración de datos + actualizar todos los puntos que leen/escriben stage.

---

### ✅ L-1 · useCalendars — hook multi-calendario (COMPLETADO)
- `useCalendars` trae todos los calendarios sin `.limit(1)` ✅
- `useCalendarConfig` (deprecated) eliminado — no tenía usos en ningún componente ✅
- **Bug corregido:** `appointments` memo ahora filtra por `selectedCalendar.id` — admin solo ve citas del calendario activo
- **Bug corregido:** `createAppointment.mutateAsync` ahora incluye `calendar_id: selectedCalendar.id` con guard previo
- **DB:** cita huérfana con `calendar_id = NULL` asignada automáticamente al primer calendario del usuario vía migración

---

### L-2 · Hooks públicos — filtrar por calendar_id
**Problema:** `usePublicAppointments` y `usePublicBlockedSlots` filtran por `user_id`. Con multi-calendario muestran datos mezclados de todos los calendarios del usuario.
**Fix:** Añadir parámetro `calendarId` a ambos hooks. Filtrar por `calendar_id` en vez de `user_id`. Actualizar `CalendarRenderer` para pasar el `calendarId`.
**Archivos:** `src/hooks/useCrmData.ts`, `src/components/crm/CalendarRenderer.tsx`

---

### L-3 · Pipeline — renombrar columna actualiza stages de contactos
**Problema:** Al renombrar una columna del pipeline, los contactos en esa columna mantienen el nombre antiguo.
**Fix:** Al guardar el cambio de nombre en `useUpdatePipeline`, hacer update en batch en `crm_contacts` → todos los contactos con `stage = nombreViejo` actualizan a `stage = nombreNuevo` (filtrado por el pipeline específico).
**Archivos:** `src/components/crm/CrmPipeline.tsx`, `src/hooks/useCrmData.ts`

---

### L-4 · Formularios — soporte para múltiples pipelines
**Problema:** `pipeline_id` en `CrmForm` es un solo uuid. Un formulario puede vincularse a múltiples pipelines.
**Fix:** Cambiar a `pipeline_ids uuid[]`. Actualizar Edge Function `crm-form-public` para agregar el contacto a todos los pipelines vinculados.
**Archivos:** migración SQL, `supabase/functions/crm-form-public/index.ts`, `src/components/crm/CrmForms.tsx`

---

### L-5 · Venta automática al enviar formulario con campo services
**Problema:** Cuando alguien llena un formulario con campo `services` y elige un servicio, la venta no se registra automáticamente.
**Fix:** En `crm-form-public`, detectar campo tipo `services` en los datos, registrar venta en `crm_sales`, y si el servicio tiene `is_saas = true`, disparar `create-saas-client`.
**Archivos:** `supabase/functions/crm-form-public/index.ts`

---

### L-6 · CrmServices — sincronizar con schema real
**Problema:** `CrmServices.tsx` tiene tipo local `ServiceConfig` desincronizado con `CrmService` de Supabase.
**Fix:** Eliminar `ServiceConfig` local. Usar directamente `CrmService`. Añadir en el editor: `is_saas` toggle (solo SuperAdmin), campo `discount_pct`, toggle `active`.
**Archivos:** `src/components/crm/CrmServices.tsx`

---

### L-7 · isConfirmation en FormRenderer
**Problema:** La sección con `isConfirmation: true` debería mostrar un resumen de todas las respuestas antes de enviar. No está verificado si funciona.
**Fix:** Verificar en `FormRenderer`. Si no funciona, implementar: renderizar cada campo respondido en modo solo lectura antes del botón de envío.
**Archivos:** `src/components/crm/FormRenderer.tsx`

---

### L-9 · buffer_min — tiempo entre citas no se aplica
**Problema:** `buffer_min` se guarda en `crm_calendar_config` pero nunca se usa. Si hay una cita a las 9:00 con duración 60 min y buffer 15 min, el slot de las 10:00 debería estar bloqueado automáticamente (ocupado hasta las 10:15), pero `CalendarRenderer` lo muestra disponible y `crm-calendar-book` permite la reserva.

**Fix — dos lugares:**
1. `CalendarRenderer`: al generar `availableSlots`, además de verificar `booked.has(slot)`, verificar que ninguna cita existente ocupe el período `[appt_start, appt_start + duration_min + buffer_min)`. Un slot candidato `{h, m}` está bloqueado si `h*60+m >= appt_start_min && h*60+m < appt_start_min + duration_min + buffer_min`.
2. `crm-calendar-book` (edge function): leer `buffer_min` del calendario, buscar citas en `±(duration_min + buffer_min)` del slot solicitado y rechazar si hay solapamiento.

**Archivos:** `src/components/crm/CalendarRenderer.tsx`, `supabase/functions/crm-calendar-book/index.ts`

---

### L-8 · WeeklySchedulePicker — soporte de horarios sub-hora
**Problema:** El picker solo permite horas enteras (`"9:00 AM"`, `"5:00 PM"`). No se puede definir disponibilidad de 9:30 a 17:30.
**Fix:** Añadir opciones de :30 al array `HOURS` del picker (`"9:00 AM"`, `"9:30 AM"`, `"10:00 AM"`...). Actualizar `amPmToHour` en `CalendarRenderer` para extraer también los minutos (`amPmToMin` que retorne minutos totales). Actualizar `isHourAvailable` para comparar con minutos totales del slot contra los boundaries del schedule.
**Archivos:** `src/components/shared/WeeklySchedulePicker.tsx`, `src/components/crm/CalendarRenderer.tsx`

---

## BLOQUE 4 — Features Nuevas (media-alta complejidad)
> Features que requieren backend + UI nueva. 1–3 días cada uno.

### F-1 · Documento Maestro (.md) — generación automática
**Descripción:** Al recibir un submission del formulario Onboarding, se genera un `.md` con instrucciones y estructura del proyecto web. Sirve para iniciar el proyecto en Claude Code. No incluye copys — solo instrucciones, referencias, estructura y datos del cliente.

**Reglas por servicio elegido:**
- **Landing Page** → documento para construir una landing page
- **Website Completo** → documento para landing + website multi-página
- **SaaS Booking System** → igual que Website Completo (el CRM se activa por separado)

**Implementación:**
- Edge Function `generate-master-doc`: lee datos del submission, llama a Claude API (`claude-sonnet-4-6`), genera el `.md`, lo sube a Supabase Storage
- Columna `master_doc_url text` en `crm_form_submissions` o en `crm_contacts`
- Botón "Descargar Kit (.zip)" en ficha del contacto: descarga `.md` + imágenes del onboarding
- La ficha técnica del contacto muestra los datos reales del onboarding organizados (eliminar `{VAR_DB}`)

**Archivos:** `supabase/functions/generate-master-doc/index.ts`, `src/components/crm/CrmContacts.tsx`

---

### F-2 · Formulario multi-página (Stepper en FormRenderer)
**Descripción:** Un formulario con `multi_page: true` se renderiza como stepper en `FormRenderer`. Cada sección = una página.

**Reglas:**
- Cada página necesita al menos 1 campo real (`heading` no cuenta)
- Validación por página antes de avanzar al siguiente
- La sección `isConfirmation: true` muestra resumen antes de enviar

**Archivos:** `src/components/crm/FormRenderer.tsx`, `src/components/crm/CrmForms.tsx`

---

### F-3 · Staff — invitación por email y acceso real
**Descripción:** Al crear un Staff en CrmSettings, enviar email de invitación con link para crear contraseña en `/crm-setup`.

**Pendiente:**
- Verificar si el flujo de `create-saas-client` puede reutilizarse para Staff o si se necesita Edge Function separada `invite-staff-user`
- Al aceptar la invitación: actualizar `crm_staff.staff_user_id` y `status: 'active'`
- Confirmar que `/crm-setup` funciona para Staff y para clientes SaaS

**Archivos:** `supabase/functions/invite-staff-user/index.ts`, `src/pages/CrmSetup.tsx`, `src/components/crm/CrmSettings.tsx`

---

### F-4 · /onboarding → FormRenderer del CRM del Admin
**Descripción:** El stepper hardcodeado de 8 pasos se reemplaza por `FormRenderer` renderizando el formulario "Onboarding" del CRM del Admin (slug: `onboarding`).

**Transición:** Mantener el stepper como fallback hasta que el formulario esté completamente configurado y probado en producción. Luego eliminar los Steps 1–8.

**Archivos:** `src/pages/Onboarding.tsx`, `src/pages/FormPage.tsx`

---

## BLOQUE 5 — Arquitectura crítica
> Afectan seguridad y aislamiento de datos. Necesarios antes de tener clientes reales.

### A-1 · RLS para Staff (bloqueante)
**Problema:** Las políticas RLS usan `auth.uid() = user_id`. El Staff tiene su propio `auth.uid()` → recibe datos vacíos en todas las tablas del CRM.

**Fix:** Para cada tabla del CRM, añadir política que permita acceso al Staff del dueño:
```sql
-- Ejemplo para crm_contacts:
CREATE POLICY "Staff accede a datos del dueño"
ON crm_contacts FOR ALL
USING (
  user_id IN (
    SELECT owner_user_id FROM crm_staff
    WHERE staff_user_id = auth.uid()
    AND status = 'active'
  )
);
```
Replicar en: `crm_contacts`, `crm_appointments`, `crm_blocked_slots`, `crm_pipelines`, `crm_tasks`, `crm_forms`, `crm_form_submissions`, `crm_services`, `crm_sales`, `crm_calendar_config`, `crm_business_profile`, `crm_logs`, `crm_reminders`, `crm_reminder_config`.

**Archivos:** `supabase/migrations/rls_staff_access.sql`

---

### A-2 · Impersonación del Admin (magic link)
**Problema:** El Admin necesita entrar al CRM de un cliente SaaS sin credenciales.

**Estado:** Edge Function `generate-magic-link` existe — verificar si está completa y funcional.

**Flujo:**
1. Admin clic en botón de impersonación junto al contacto SaaS en `CrmContacts`
2. Llama a `generate-magic-link` con `client_user_id`
3. Edge Function usa `supabase.auth.admin.generateLink()` con `service_role` key
4. Link abre en nueva pestaña → sesión temporal como el cliente
5. Dentro del CRM el Admin se comporta exactamente como el cliente (sin indicador especial)

**Archivos:** `supabase/functions/generate-magic-link/index.ts`, `src/components/crm/CrmContacts.tsx`

---

### A-3 · RLS para crm_client_accounts — acceso del cliente
**Problema:** La política actual solo permite al Admin leer/escribir `crm_client_accounts`. La página `/crm-setup` necesita que el cliente pueda actualizar su propio registro (`status → active`).
**Fix:** Añadir política que permita `UPDATE` cuando `client_user_id = auth.uid()`, solo para el campo `status`.
**Archivos:** migración SQL

---

## BLOQUE 6 — Features avanzadas
> Requieren infraestructura externa o lógica compleja.

### AV-1 · Google Calendar OAuth + Sync
**Estado:** UI lista. Edge Function `google-calendar-oauth` deployada. Token guardado. Falta el sync real.

**Pendiente:**
- Edge Function `sync-to-google`: crear/actualizar/cancelar eventos en Google al operar citas en el CRM
- Guardar `google_event_id` en `crm_appointments`
- Refresh automático del token cuando expira

**Archivos:** `supabase/functions/sync-to-google/index.ts`, `src/components/crm/CrmCalendar.tsx`

---

### AV-2 · WhatsApp — UI beta (backend en pausa)
**Estado:** Solo construir la UI con banner **"Beta: Próximamente"**. No implementar backend hasta tener el primer cliente SaaS de pago.

**UI a construir:**
- Tab "WhatsApp" en Configuración con dos opciones:
  - **Opción A:** Evolution API (QR scan, fácil, riesgo de ban)
  - **Opción B:** Meta WhatsApp Business API (oficial, sin riesgo, configuración compleja)
- Banner prominente con advertencia sobre spam y riesgo de ban
- Todo deshabilitado con estado "Próximamente"

**Arquitectura para cuando se implemente (Opción A):**
- Evolution API self-hosted en Railway (~$10/mes para todos los clientes)
- 1 servidor maneja N sesiones (una por Dueño de Negocio)
- Edge Function intermedia para comunicarse con Evolution API

**Archivos:** `src/components/crm/CrmSettings.tsx`

---

### AV-3 · Google Calendar Sync bidireccional
**Dependencias:** AV-1 completado.
**Descripción:** Eventos de Google → `crm_appointments`. CRON cada 15 min con `syncToken`. Acrosoft es source of truth en conflictos.

---

## BLOQUE 7 — Mejoras visuales del Calendario Admin

### UI-1 · Bloques de tiempo con precisión de minuto en la vista admin
**Problema:** En la vista de semana/día del CRM, un bloque de 9:30–11:30 sombrea filas enteras (9, 10, 11). La lógica de bloqueo es correcta — el calendario público filtra slots con precisión. Solo falla la representación visual del admin.
**Fix:** Reemplazar el sistema de "sombrear celda de hora" por un overlay absolutamente posicionado que calcule `top` y `height` en función de los minutos (`startMinute / 60 * rowHeight` y `(endHour*60+endMinute - startHour*60-startMinute) / 60 * rowHeight`).
**Archivos:** `src/components/crm/CrmCalendar.tsx` (vista semana y día)
**Complejidad:** Media — requiere refactorizar el renderizado del grid horario.

---

## BLOQUE 8 — Deuda técnica
> Sin urgencia, pero mejoran la base del código.

### DT-1 · Tipos TypeScript — eliminar duplicados
- Reemplazar `ServiceConfig` local en `CrmServices.tsx` por `CrmService` de `supabase.ts`
- Revisar otros tipos locales que dupliquen tipos del schema

### DT-2 · Admin.tsx (legacy)
- Verificar si `src/pages/Admin.tsx` sigue en uso o puede eliminarse

### DT-3 · Var.tsx (legacy)
- Verificar si `src/components/Var.tsx` sigue en uso o puede eliminarse

### DT-4 · Actualizar documento maestro
- Mantener `acrosoft-master-v3.md` actualizado con cada decisión arquitectónica nueva

---

## Resumen de prioridades

```
URGENTE — antes del primer cliente SaaS:
  A-1   RLS para Staff
  A-2   Impersonación del Admin (verificar + completar)
  A-3   RLS crm_client_accounts fix

ALTA PRIORIDAD — mejoran el producto activo:
  QW-1  isSuperAdmin dinámico
  QW-2  Eliminar CrmClients.tsx
  QW-4  Métricas del Overview reestructuradas
  QW-5  Servicios dinámicos en Landing
  S-1   crm_appointments + minute
  S-2   crm_blocked_slots + calendar_id
  L-1   useCalendars multi-calendario
  L-2   Hooks públicos por calendar_id
  L-5   Venta automática desde formulario
  F-1   Documento Maestro (.md)

MEDIA PRIORIDAD:
  QW-3  Stage dinámico en contactos
  QW-6  Descuento en servicios
  QW-7  Heading no cuenta como campo
  S-3   crm_calendar_config campos anticipación
  S-6   crm_blocked_slots minutos en bloqueos
  L-9   buffer_min tiempo entre citas (no se aplica actualmente)
  L-3   Renombrar columna pipeline
  L-4   Pipeline múltiple en formularios
  L-6   CrmServices sync con schema
  L-7   isConfirmation en FormRenderer
  L-8   WeeklySchedulePicker horarios sub-hora
  F-2   FormRenderer multi-página stepper
  F-3   Staff invitación email

MEJORAS VISUALES:
  UI-1  Bloques sub-hora con overlay preciso en vista admin del calendario

LARGO PLAZO:
  F-4   /onboarding → FormRenderer
  AV-1  Google Calendar sync
  AV-2  WhatsApp UI beta
  AV-3  Google Calendar bidireccional
  DT-1/2/3  Limpieza de código
```
