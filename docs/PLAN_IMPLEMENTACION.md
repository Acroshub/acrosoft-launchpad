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
- `isSlotBlocked` en `CalendarRenderer` compara en minutos totales ✅
- `isHourBlocked` en `CrmCalendar` usa overlap detection con minutos ✅
- Modal standalone y `SlotDialog`: selectores hora+minuto (0/15/30/45) en "Desde" y "Hasta" ✅
- Mapping `rawBlocked → BlockedSlot` incluye `startMinute`/`endMinute` ✅

---

## BLOQUE 3 — Fixes de Lógica
> Bugs que afectan funcionalidad real. 2–6 horas cada uno.

### ✅ L-1 · useCalendars — hook multi-calendario (COMPLETADO)
- `useCalendars` trae todos los calendarios sin `.limit(1)` ✅
- `useCalendarConfig` (deprecated) eliminado — no tenía usos en ningún componente ✅
- **Bug corregido:** `appointments` memo ahora filtra por `selectedCalendar.id` — admin solo ve citas del calendario activo
- **Bug corregido:** `createAppointment.mutateAsync` ahora incluye `calendar_id: selectedCalendar.id` con guard previo
- **DB:** cita huérfana con `calendar_id = NULL` asignada automáticamente al primer calendario del usuario vía migración

---

### ✅ L-2 · Hooks públicos — filtrar por calendar_id (COMPLETADO)
- `usePublicAppointments` filtra por `.eq("calendar_id", resolvedCalendarId)` usando UUID resuelto ✅
- `usePublicBlockedSlots` filtra por `.eq("calendar_id", resolvedCalendarId)` ✅
- `CalendarRenderer` usa `resolvedCalendarId = calendar?.id ?? null` en lugar del prop crudo (que puede ser slug) ✅
- `BookingForm` recibe `resolvedCalendarId ?? calendarId` → edge function `crm-calendar-book` siempre recibe UUID ✅
- `endDate` en `usePublicAppointments` usa `new Date(year, month+1, 0).getDate()` para obtener el último día real del mes — PostgreSQL rechazaba "2026-04-31" con error 400 ✅
- Bloqueos tipo "fullday" y "range" pasaban `start_minute: null` / `end_minute: null` contra columnas NOT NULL → fix: enviar `0` ✅
- `BookingPage` pasa `calendarId` desde URL params ✅
- **Bugs pendientes encontrados:** A-4 (RLS públicas), L-14 (duplicate check sin calendar_id en edge fn), L-15 (S-3 constraints solo client-side)

---

### ✅ L-3 · Pipeline — renombrar columna actualiza stages de contactos (COMPLETADO)
- `handleRenameCol` en `ContactsBoard`: reemplazado N mutations individuales por `useBatchUpdateContactStage` → un solo UPDATE por IDs ✅
- `handleRenameCol` en `TasksBoard`: reemplazado N mutations individuales por `useBatchUpdateTaskStage` → un solo UPDATE por `pipeline_id + stage` ✅
- Ambos: siempre muestran toast (antes solo si `affected.length > 0`) ✅
- Ambos: envueltos en try/catch con error toast ✅
- Hooks añadidos: `useBatchUpdateContactStage`, `useBatchUpdateTaskStage` en `useCrmData.ts` ✅

---

### ✅ L-3b · Tasks pipeline — contacto vinculado opcional (COMPLETADO)
- Migración aplicada: `contact_id uuid REFERENCES crm_contacts ON DELETE SET NULL` (nullable) ✅
- `CrmTask` type actualizado con `contact_id: string | null` ✅
- `useCreateTask` acepta `contact_id?: string | null` ✅
- `TasksBoard` recibe `allContacts` desde el componente padre ✅
- Formulario de creación: selector de contacto opcional (visible solo si hay contactos) ✅
- `TaskCard` muestra badge con nombre del contacto si está vinculado ✅
- Reset de `newContactId` al abrir/cerrar el formulario ✅

---

### ✅ L-3c · TaskCard — expand/collapse + ordenar por prioridad (COMPLETADO)
**Contexto:** Complemento directo de L-3b. Las tarjetas de tareas actualmente son siempre compactas (solo título, descripción truncada, prioridad, contacto). El usuario quiere el mismo patrón toggle que `ContactCard`: un triangulito para expandir/ocultar detalles.

**Fix — dos partes:**

**Parte 1: Expand/collapse en TaskCard**
- Añadir `expanded` state con `useState(false)` dentro de `TaskCard`
- Header siempre visible: título + badge prioridad + badge contacto (compacto)
- Al expandir: descripción completa (sin `line-clamp`), datos del contacto (email, teléfono, empresa si existen — consultando `allContacts`)
- Botón toggle: `ChevronDown` que rota 180° al expandir (igual que `ContactCard`)
- Animación `animate-in fade-in slide-in-from-top-1` al expandir (igual que `ContactCard`)
- `TaskCard` necesita recibir el objeto `CrmContact | undefined` en lugar de solo `contactName: string`

**Parte 2: Ordenar automáticamente por prioridad dentro de cada columna**
- Al renderizar `tasks.filter((t) => t.stage === col)`, ordenarlos con: `high` → `medium` → `low` → sin prioridad
- Orden constante: `const PRIORITY_ORDER = { high: 0, medium: 1, low: 2, null: 3 }`
- No afecta el `position` guardado en DB — es solo ordenación visual client-side
- El drag entre columnas sigue funcionando igual

**Archivos:** `src/components/crm/CrmPipeline.tsx`
**Complejidad:** Baja

---

### ✅ L-3d · TaskCard — editar contenido de una tarjeta (COMPLETADO)
- Edición inline (mismo formulario que creación, sin modal) ✅
- Todos los botones siempre visibles — sin opacity-0/hover inconsistente ✅
**Contexto:** El usuario puede crear tareas con título, descripción, prioridad y contacto opcional. Falta poder editar esos campos después de creada.

**UX propuesta:** Botón "Editar" (lápiz) en el header de la tarjeta, junto al toggle y al eliminar. Al hacer clic abre un modal (mismo patrón que `StaffDialog` en CrmSettings) con los campos pre-rellenados. Al guardar hace `useUpdateTask` y cierra el modal. Sin cambio de route ni de vista.

**Campos editables:**
- Título (obligatorio)
- Descripción (opcional)
- Prioridad: selector de botones igual al formulario de creación
- Contacto vinculado: selector desplegable con todos los contactos (igual al de creación, con opción "Sin contacto")

**Fix:**
1. Añadir ícono `Pencil` al header de `TaskCard` (ya importado en el archivo)
2. Nuevo componente `EditTaskDialog` dentro de `CrmPipeline.tsx` con los 4 campos
3. `TaskCard` necesita recibir `allContacts` para el selector del modal, o levantar el estado de edición al `TasksBoard` (recomendado para no pasar contacts a cada card)
4. `TasksBoard` maneja `editingTask: CrmTask | null` + el modal a nivel board (igual que `deleteTarget`)
5. Al guardar: `useUpdateTask.mutateAsync({ id, title, description, priority, contact_id })`

**Archivos:** `src/components/crm/CrmPipeline.tsx`
**Complejidad:** Baja-media

---

### L-3e · Pipeline — confirmación al eliminar columna ✅ COMPLETADO
**Problema:** Al hacer clic en el ícono de eliminar de una columna, la columna se borra inmediatamente sin pedir confirmación. Solo hay protección si la columna tiene tarjetas (muestra error). Para columnas vacías no hay ninguna advertencia.
**Fix:** Usar `DeleteConfirmDialog` (ya importado en ambos boards) antes de ejecutar `handleDeleteCol`. Añadir estado `deleteColTarget: string | null` en `ContactsBoard` y en `TasksBoard`. Al confirmar, ejecutar el delete real.
**Archivos:** `src/components/crm/CrmPipeline.tsx`
**Complejidad:** Baja

---

### L-3f · Drag-to-reorder dentro de una columna (ambos pipelines) ✅ COMPLETADO
**Decisión tomada (Opción C):** Prioridad siempre primero; dentro de cada grupo de prioridad el usuario puede reordenar manualmente. Reordenar entre grupos de prioridad distintos no está permitido.

**Implementado:**

**Tasks pipeline:**
- Sort: `priority_group ASC → position ASC → created_at ASC` (tiebreaker para estabilidad inicial)
- Nuevas tareas se crean con `position = max_position_en_grupo + 10` para aparecer al final de su grupo
- Hook `useBatchUpdateTaskPositions` en `useCrmData.ts` — N updates secuenciales por grupo reordenado
- `handleReorder` en `TasksBoard`: valida mismo grupo de prioridad, reordena, persiste

**Contacts pipeline:**
- Migración aplicada: `ALTER TABLE crm_contacts ADD COLUMN pipeline_position jsonb DEFAULT '{}'`
- Mapa `{ pipeline_id: position }` por contacto — soporta multi-pipeline sin tabla adicional
- Sort por `pipeline_position[pipeline.id]`, fallback a `created_at ASC` para contactos sin posición asignada
- Hook `useBatchUpdateContactPositions` en `useCrmData.ts`
- `handleReorder` en `ContactsBoard`: reordena libremente (sin grupos de prioridad)

**Indicador visual:** línea azul encima de la tarjeta destino al arrastrar (solo cuando el drop es válido — mismo grupo de prioridad en tareas)
**Drag cancelado:** `onDragEnd` en tarjetas y `onDragLeave` en columnas limpian `dragOverCardId` para evitar estado sucio

**Archivos:** migración SQL, `src/lib/supabase.ts`, `src/hooks/useCrmData.ts`, `src/components/crm/CrmPipeline.tsx`

---

### L-4 · Formularios — soporte para múltiples pipelines ✅ COMPLETADO
**Decisión:** Opción B — arquitectura correcta con tabla junction. Un contacto puede estar en múltiples pipelines simultáneamente.

**Implementado:**
- **Migración**: `crm_contact_pipeline_memberships(id, contact_id, pipeline_id, stage, position)` con `UNIQUE(contact_id, pipeline_id)` + RLS + datos históricos migrados desde `crm_contacts.stage`
- **`supabase.ts`**: nuevo tipo `CrmContactPipelineMembership`
- **`useCrmData.ts`**: 6 hooks nuevos: `useContactMemberships`, `useAddContactMembership`, `useRemoveContactMembership`, `useUpdateMembershipStage`, `useBatchUpdateMembershipStage`, `useBatchUpdateMembershipPositions`
- **`useAllContactStages`**: reescrito para usar la tabla junction en lugar de matchear `crm_contacts.stage` contra column_names
- **`ContactsBoard` en `CrmPipeline.tsx`**: completamente reescrito — usa `useContactMemberships(pipeline.id)` como fuente de verdad. Drag entre columnas, reordenamiento dentro de columna, añadir/eliminar contactos — todo opera sobre memberships
- **Edge function `crm-form-public`**: `addContactToPipelines` ahora inserta una membership por CADA pipeline seleccionado (upsert con `ignoreDuplicates: true` para idempotencia)
- **`crm_contacts.stage`**: campo heredado, ya no es la fuente de verdad para pipeline membership

**Nota pendiente**: `crm_contacts.stage` sigue en el schema por compatibilidad. `CrmContacts.tsx` muestra `detail.stage` como fallback solo cuando `contactStagesMap` está vacío — con la nueva tabla, el mapa estará siempre poblado para contactos en pipelines, por lo que el fallback prácticamente nunca se activa.

**Archivos:** migración SQL, `src/lib/supabase.ts`, `src/hooks/useCrmData.ts`, `src/components/crm/CrmPipeline.tsx`, `supabase/functions/crm-form-public/index.ts`

---

### L-5 · Venta automática al enviar formulario con campo services ✅ COMPLETADO
**Problema:** Cuando alguien llena un formulario con campo `services` y elige un servicio, la venta no se registra automáticamente.
**Fix:** En `crm-form-public`, detectar campo tipo `services` en los datos, registrar venta en `crm_sales`, y si el servicio tiene `is_saas = true`, disparar `create-saas-client`.
**Archivos:** `supabase/functions/crm-form-public/index.ts`

**Implementación:**
- `handleServicesField()` busca el servicio, calcula precio con descuento (`discount_pct`), e inserta en `crm_sales`
- Prevención de ventas duplicadas: verifica que no exista venta `initial` para el mismo `contact_id + service_id` antes de insertar
- Si `is_saas = true`: verifica que no exista `crm_client_accounts` → invita por email via `auth.admin.inviteUserByEmail` → crea cuenta con status `pending`
- Edge function desplegada v12 con todos los fixes

---

### L-5b · Filtro de clientes y servicio contratado en CrmContacts ✅ COMPLETADO
**Problema:** No hay forma rápida de filtrar contactos que ya son clientes (tienen al menos una venta) ni de filtrar por servicio contratado. QW-2 definió que "Clientes" sería un filtro dentro de Contactos, pero nunca se implementó.
**Fix:** En `CrmContacts`, agregar filtros en la barra de búsqueda:
1. Toggle/botón "Solo clientes" — filtra contactos que tengan al menos un registro en `crm_sales`.
2. Dropdown "Servicio" — muestra los servicios activos del usuario; al seleccionar uno, filtra contactos que tengan una venta con ese `service_id`.
Requiere cargar `useSales()` en el componente y cruzar `contact_id` con los contactos visibles.
**Archivos:** `src/components/crm/CrmContacts.tsx`

**Implementación:**
- `clientContactIds: Set<string>` via `useMemo` — set de contact_ids con al menos una venta
- `contactIdsByService: Map<service_id, Set<contact_id>>` via `useMemo` — lookup rápido O(1)
- Botón toggle "Solo clientes" con estilo activo/inactivo
- Dropdown "Todos los servicios" con servicios activos del usuario
- Botón "Limpiar filtros" visible solo cuando hay filtros activos
- Los filtros se combinan con la búsqueda de texto existente (AND lógico)

---

### L-5c · Badges de servicio contratado y botón SaaS condicional en CrmContacts ✅ COMPLETADO
**Problema:** En la lista de contactos no se ve qué servicio compró cada cliente. Además, el botón de activar cuenta SaaS aparece para todos los contactos, incluso los que contrataron un servicio que no es SaaS.
**Fix:**
1. Mostrar badge(s) con el nombre del servicio contratado junto al nombre del contacto (usar `sales` cruzado con `services` para obtener `service_name`).
2. Condicionar el botón "Activar SaaS" / "Acceder al CRM del cliente" — solo mostrarlo si el contacto tiene al menos una venta de un servicio con `is_saas = true`.
Requiere construir un `Map<contact_id, { serviceName, isSaas }[]>` desde `sales + services`.
**Archivos:** `src/components/crm/CrmContacts.tsx`

**Implementación:**
- `contactServices: Map<contact_id, { serviceName, isSaas }[]>` via `useMemo` — cruza `sales` con `services`, deduplica por nombre
- Badges verdes con nombre del servicio junto al nombre del contacto en la lista
- Botón "Activar Booking System" en panel de detalle condicionado a `hasSaasService` — solo aparece si el contacto tiene venta de servicio con `is_saas = true`
- Botón "CRM" en lista ya estaba condicionado por `isSaasActive` (cuenta activa) — sin cambio necesario

---

### L-6 · CrmServices — sincronizar con schema real ✅ COMPLETADO
**Problema:** `CrmServices.tsx` tiene tipo local `ServiceConfig` desincronizado con `CrmService` de Supabase.
**Fix:** Eliminar `ServiceConfig` local. Usar directamente `CrmService`. Añadir en el editor: `is_saas` toggle (solo SuperAdmin), campo `discount_pct`, toggle `active`.
**Archivos:** `src/components/crm/CrmServices.tsx`

**Estado:** Ya estaba implementado correctamente. `ServiceConfig` no existe, `CrmService` coincide 1:1 con el schema DB, y el editor tiene todos los campos: `is_saas` (solo SuperAdmin), `discount_pct` con preview, toggle `active`, drag-to-reorder con `sort_order`.

---

### L-7 · isConfirmation en FormRenderer ✅
**Problema:** La sección con `isConfirmation: true` debería mostrar un resumen de todas las respuestas antes de enviar. No está verificado si funciona.
**Fix:** Verificado y corregido. Multi-página con `isConfirmation` funciona correctamente: muestra resumen con `ConfirmationView`. Corregido `formatValue` para resolver nombres de servicio (en vez de mostrar UUID). Eliminada la opción de confirmación para formularios single-page (por decisión del usuario). El toggle UI fue removido de `CrmForms.tsx`; la lógica backend se mantiene para backward compat.
**Archivos:** `src/components/crm/FormRenderer.tsx`, `src/components/crm/CrmForms.tsx`

---

### L-7b · Facebook Pixel — verificar funcionamiento en formularios ✅
**Problema:** El formulario público tiene integración de Facebook Pixel que dispara `ViewContent` al cargar y `Lead` al enviar. Tenía 3 bugs.
**Bugs corregidos:** (1) Redirect mataba el evento Lead — ahora se hace `setTimeout(350ms)` antes de redirigir para dar tiempo al beacon. (2) XSS en pixelId — ahora se sanitiza con `replace(/\D/g, "")` (solo dígitos). (3) Scripts duplicados al re-montar — se usa `id` único en el `<script>` para prevenir duplicados.
**Archivos:** `src/components/crm/FormRenderer.tsx`

---

### L-8 · WeeklySchedulePicker — soporte de horarios sub-hora ✅
**Problema:** El picker solo permite horas enteras. No se puede definir disponibilidad de 9:30 a 17:30. La función `isHourAvailable` descartaba minutos.
**Fix:** (1) `HOURS` reemplazado por `buildHours(interval)` dinámico — genera opciones cada 15, 30 o 60 min. (2) Prop `interval` en `WeeklySchedulePicker` (default 60 para retrocompat). (3) `amPmToHour` → `amPmToMinutes` en CalendarRenderer y CrmCalendar. (4) `isHourAvailable` → `isSlotAvailable(avail, dow, hour, minute)` — compara minutos totales. (5) Nueva columna `schedule_interval` en `crm_calendar_config` (default 30). (6) Selector "Cada 30 min / Cada 15 min" en CrmCalendarConfig.
**Archivos:** `src/components/shared/WeeklySchedulePicker.tsx`, `src/components/crm/CalendarRenderer.tsx`, `src/components/crm/CrmCalendar.tsx`, `src/components/crm/CrmCalendarConfig.tsx`, `src/lib/supabase.ts`

---

### L-9 · buffer_min — tiempo entre citas no se aplica ✅
**Problema:** `buffer_min` se guarda en `crm_calendar_config` pero nunca se usa.
**Fix:** Buffer bidireccional — un slot candidato `[T, T+dur)` está bloqueado si para cualquier cita existente `[A, A+dur)`: `T+dur+buffer > A && A+dur+buffer > T`. Esto garantiza que siempre haya al menos `buffer_min` minutos de descanso entre citas, tanto antes como después.
1. `CalendarRenderer`: reemplazado `bookedMap` (Set de keys exactos) por `appointmentsByDate` (array con `startMin/endMin`). Nueva función `isBufferBlocked` aplica la fórmula bidireccional en `isDayAvailable` y `availableSlots`.
2. `crm-calendar-book` (edge function v10): lee `buffer_min` del calendario, carga todas las citas del día, y aplica la misma fórmula de overlap bidireccional antes de permitir la reserva.
**Archivos:** `src/components/crm/CalendarRenderer.tsx`, `supabase/functions/crm-calendar-book/index.ts`

---

### L-10 · CrmOverview — minutos ignorados en citas (regresión S-1) ✅
**Origen:** S-1 añadió `minute` a `crm_appointments` pero `CrmOverview` nunca fue actualizado.
**Fix:** Propagado `a.minute ?? 0` en: (1) filtro `setHours(a.hour, a.minute)`, (2) sort `setHours(a.hour, a.minute, 0, 0)`, (3) display de métrica `proxima-cita`, (4) badge de hora en "Citas de hoy".
**Archivos:** `src/components/crm/CrmOverview.tsx`

---

### L-10c · CrmOverview — Formato de "Próxima cita" poco legible ✅
**Problema:** La métrica "Próxima cita" mostraba formato técnico `YYYY-MM-DD HH:MM`.
**Fix:** Ahora muestra "DD de MES a las HH:MM" (ej: "22 de Abril a las 10:30") usando `MONTHS_ES`.
**Archivos:** `src/components/crm/CrmOverview.tsx`

---

### L-10b · CrmCalendar — Editar cita no carga datos y no guarda ✅
**Problema:** Dialog de edición no cargaba datos actuales de la cita y fallaba al guardar (date vacío).
**Causa raíz:** Inicialización en `onOpenChange` (branch que nunca se ejecuta en dialogs controlados).
**Fix:** Inicialización movida al `onClick` de cada botón "Editar" (`setEditDate(detail.date); setEditHour(detail.hour); setEditMinute(detail.minute)`). Eliminado branch muerto del `onOpenChange`. Removidos fallbacks confusos en los inputs.
**Archivos:** `src/components/crm/CrmCalendar.tsx`

---

### L-11 · QW-3 — Colisión de stage entre pipelines ✅
**Origen:** `crm-calendar-book` escribía en `crm_contacts.stage` (campo legacy) y solo registraba en un pipeline. La tabla `crm_contact_pipeline_memberships` ya existía y era usada por `crm-form-public`, `CrmPipeline.tsx` y `useAllContactStages`.
**Fix:** Reescrito `addContactToPipeline` → `addContactToPipelines(userId, contactId, pipelineIds[])` — idéntica lógica a `crm-form-public`: lee `pipeline_ids` del formulario vinculado, itera todos los pipelines configurados, inserta membership en cada uno. Si no hay `pipeline_ids` configurados, fallback al primer pipeline de contactos. La UI de `CrmContacts` mantiene fallback a `contact.stage` para datos legacy.
**Archivos:** `supabase/functions/crm-calendar-book/index.ts` (edge function v12)

---

### L-12 · useLandingServices y useLandingCalendar — bug multi-tenant ✅
**Origen:** RLS pública + queries sin `user_id` → con múltiples usuarios mostraría datos mezclados.
**Fix:** Nuevo hook `useLandingProfile` obtiene el `user_id` del admin (primer `crm_business_profile` por `created_at`). `useLandingServices(userId)` ahora filtra por `user_id`. `useLandingCalendar(profile)` filtra el fallback de calendario por `user_id`. Cadena de dependencias: `useLandingProfile` → `useLandingCalendar` + `useLandingServices`.
**Archivos:** `src/hooks/useCrmData.ts`, `src/pages/Index.tsx`

---

### L-13 · CrmForms — validación "heading no cuenta" incompleta (QW-7) ✅ COMPLETADO
**Bugs:**
1. La validación `type !== "heading"` solo corre dentro de `if (multiPage)`. Un formulario de una sola página con solo headings puede guardarse y publicarse — el usuario vería una página sin campos reales.
2. `form.fields.length` en la lista de formularios cuenta campos `heading` → muestra contador incorrecto ("3 campos" en vez de "2" si uno es heading).
**Fix:**
1. Añadir validación para `!multiPage`: `fields.filter(f => f.type !== "heading").length === 0` → error antes de guardar.
2. Cambiar `form.fields.length` a `form.fields.filter(f => f.type !== "heading").length` en la lista.
**Prioridad:** Baja. Solo afecta edge case de admin creando formularios vacíos.
**Archivos:** `src/components/crm/CrmForms.tsx`

---

### L-14 · crm-calendar-book — duplicate check sin calendar_id (regresión S-1) ✅ COMPLETADO (resuelto en L-9)
**Origen:** S-1 añadió `minute` y multi-calendario, pero `crm-calendar-book` no fue actualizado para filtrar por `calendar_id` al verificar duplicados.
**Bug (crítico):** El check de slot duplicado en la edge function usa:
```ts
.eq("user_id", user_id).eq("date", date).eq("hour", hour).eq("minute", minute)
```
Sin `.eq("calendar_id", calendar_id)`. Con 2+ calendarios para el mismo usuario, reservar un slot en el Calendario A bloquea el mismo slot en el Calendario B con un error 409 falso.
**Fix:** Añadir `.eq("calendar_id", calendar_id)` al query de duplicate check en `crm-calendar-book/index.ts` (~línea 96-104).
**Prioridad:** Alta. Rompe la reserva pública cuando el admin tiene 2 o más calendarios.
**Archivos:** `supabase/functions/crm-calendar-book/index.ts`

---

### L-15 · crm-calendar-book — S-3 constraints solo client-side ✅ COMPLETADO
**Origen:** S-3 añadió `min_advance_hours` y `max_future_days` a `crm_calendar_config`, pero la edge function no los lee.
**Bug:** `crm-calendar-book` hace `SELECT user_id, duration_min, name, linked_form_id` del calendario — no lee `min_advance_hours`, `max_future_days` ni `buffer_min`. Un cliente que llame directamente a la edge function (bypass del `CalendarRenderer`) puede:
1. Reservar con menos anticipación de la configurada (ej: 0 horas si `min_advance_hours = 24`)
2. Reservar más días en el futuro de los permitidos
3. Reservar sin respetar el buffer entre citas
**Fix:** En `crm-calendar-book`, añadir los 3 campos al SELECT y validar server-side:
- `scheduled_ts < Date.now() + min_advance_hours * 3600000` → 422
- `scheduled_date > today + max_future_days` → 422
- Solapamiento con buffer: `appt_end + buffer_min > requested_start` → 409
**Prioridad:** Media. No falla en uso normal (UI respeta las reglas), pero es bypasseable.
**Archivos:** `supabase/functions/crm-calendar-book/index.ts`

---

### L-16 · crm_calendar_config — DB default de availability incompatible con código ✅ COMPLETADO
**Origen:** S-3 — el DB default de la columna `availability` usa estructura diferente a la que lee el código.
**Bug (bajo impacto):** El default de DB es:
```json
{"fri": {"end": 18, "start": 9, "active": true}, "mon": {...}, ...}
```
Keys en inglés (`mon`, `tue`...) y estructura `{active, start, end}`. El código espera:
```json
{"Lun": {"open": true, "slots": [{"from": "9:00 AM", "to": "6:00 PM"}]}, ...}
```
Keys en español (`Lun`, `Mar`...) y estructura `{open, slots[]}`. Si se inserta un calendario sin configurar el `WeeklySchedulePicker`, todos los días aparecerán cerrados en `CalendarRenderer` (`undefined?.open === false`).
**Fix:** Actualizar el DB default con la estructura correcta en español, o asegurarse que el modal de crear calendario siempre guarda la disponibilidad con `DEFAULT_WEEKLY_SCHEDULE` al crear.
**Prioridad:** Baja. Solo afecta calendarios recién creados antes de que el admin configure el horario.
**Archivos:** migración SQL (`ALTER TABLE crm_calendar_config ALTER COLUMN availability SET DEFAULT ...`), opcionalmente `src/components/crm/CrmCalendarConfig.tsx`

---

### L-17 · DayView / WeekView — múltiples citas en la misma hora invisibles (regresión S-1) ✅ COMPLETADO
**Origen:** S-1 habilitó `minute != 0`. Ahora es válido tener dos citas en la misma hora (10:00 y 10:30 con `duration_min = 30`). `DayView` y `WeekView` usaban `find` → solo mostraban la primera.
**Implementado:**
- `DayView`: `dayAppts.filter((a) => a.hour === hour).sort((a,b) => (a.minute??0) - (b.minute??0))` → renderiza todas las citas apiladas verticalmente en la misma fila, cada una con su hora (HH:MM) antes del nombre.
- `WeekView`: mismo patrón de filter+sort; stack vertical de botones pequeños dentro de la celda. `e.stopPropagation()` en el click del botón para no disparar el `onSlotClick` del contenedor.
- Lógica `unavailable` y `empty` ajustada a `cellAppts.length === 0`.
**Archivos:** `src/components/crm/CrmCalendar.tsx`

---

### L-18 · Booking: unificar `schedule_interval` con `duration_min` (rediseño) ✅ COMPLETADO
**Decisión (2026-04-23):** Se elimina la distinción entre "intervalo de grilla" y "duración de cita". Cada calendario define una sola duración (15, 30 o 60 min), y los slots arrancan cada esa misma cantidad de minutos. Esto elimina la ambigüedad de L-18 de raíz: cada slot ocupa exactamente su propia ventana de tiempo, así los bloqueos y solapes se comportan de forma intuitiva.
**Motivo:** La versión con dos campos (`schedule_interval` ≠ `duration_min`) generaba confusión: ej. `duration_min=60, schedule_interval=15` provocaba que slots de 9:00 "tocaran" un bloqueo de 9:45–11:00 aunque su inicio fuera antes. Con un solo valor, esto ya no puede pasar.
**Implementado:**
- `isSlotBlocked` (`CalendarRenderer.tsx`) y `isSlotBlockedAt` (`CrmCalendar.tsx`) usan la semántica simple `slotStart ∈ [blockStart, blockEnd)`, sin parámetro `durationMin`.
- `CrmCalendarConfig.tsx`: se elimina el selector "Intervalo del horario". La "Duración de la cita" es un `<select>` con opciones 15/30/60 min. El payload envía `schedule_interval = duration`.
- `CrmCalendar.tsx`: `calendarInterval` se deriva de `duration_min` en lugar de `schedule_interval`. Props y helpers sin cambios de firma externos.
- DB: todos los calendarios existentes sincronizados (`schedule_interval = duration_min`), con `duration_min` normalizado a {15, 30, 60}.
**Archivos:** `src/components/crm/CalendarRenderer.tsx`, `src/components/crm/CrmCalendar.tsx`, `src/components/crm/CrmCalendarConfig.tsx`, DB `crm_calendar_config`

---

### L-19 · CrmCalendar — calendario seleccionado no se persiste al navegar (auditoría L-1) ✅ COMPLETADO
**Implementado:**
- `selectedCalendarId` se inicializa desde `localStorage.getItem("crm_selected_calendar_id")`.
- Nuevo `handleSelectCalendar(id)` persiste (o borra) la clave al cambiar el calendario en el dropdown.
- `useEffect` defensivo: si el id guardado apunta a un calendario borrado, se limpia automáticamente (evita estado fantasma).
**Archivos:** `src/components/crm/CrmCalendar.tsx`

---

### L-20 · CrmCalendar — nuevo calendario no queda seleccionado tras su creación (auditoría L-1) ✅ COMPLETADO
**Implementado:**
- `CrmCalendarConfig` acepta prop opcional `onCreated?: (id: string) => void`.
- En `handleSave` (rama `isNew`), se emite `onCreated(created.id)` inmediatamente después del `mutateAsync` (antes de `onBack()`).
- `CrmCalendar` pasa `onCreated={(id) => handleSelectCalendar(id)}` — reutiliza el setter de L-19 que también persiste en localStorage.
**Archivos:** `src/components/crm/CrmCalendar.tsx`, `src/components/crm/CrmCalendarConfig.tsx`

---

### L-21 · useAppointments — carga todas las citas sin filtro de calendario (auditoría L-1) ✅ COMPLETADO
**Implementado:**
1. `useAppointments(calendarId?)` ahora acepta un id opcional. Si se provee, aplica `.eq("calendar_id", calendarId)` en la query y lo incluye en el `queryKey`. `CrmOverview` sigue invocándolo sin args (trae todas — es intencional para el resumen global).
2. `CrmCalendar` llama `useAppointments(selectedCalendar?.id)` → la DB ya filtra. El `.filter(a => selectedCalendar ? a.calendar_id === selectedCalendar.id : true)` del `useMemo` se mantiene como defensa durante el render transitorio (antes que `selectedCalendar` resuelva).
3. `useBlockedSlots(calendarId)` pasa a exigir `calendarId` para habilitar la query: `enabled: !!user && !!calendarId`. Eliminada la rama "sin filtro" — el `.eq("calendar_id", calendarId!)` siempre se aplica. Ya no se dispara query innecesaria con `undefined` durante carga inicial.
**Archivos:** `src/hooks/useCrmData.ts`, `src/components/crm/CrmCalendar.tsx`

---

### L-22 · Cambio de schedule_interval con citas existentes — citas huérfanas invisibles (edge case post-UI-2) ✅ OBSOLETO
**Resolución (2026-04-23):** Con el rediseño de L-18 se eliminó la distinción entre `schedule_interval` y `duration_min`. La duración solo acepta {15, 30, 60} y se envía también como `schedule_interval`. Al cambiar la duración, podría seguir habiendo citas desalineadas, pero:
- Verificado SQL: ninguna cita actual en DB está desalineada con su calendario.
- Si en el futuro se cambia la duración de 30→60, una cita a las 9:30 quedaría en un slot "fantasma" — pendiente como warning futuro, pero de muy baja prioridad.
- El mismo warning aplica a L-22 y ya no justifica una entrada separada. Se fusiona como nota dentro de la entrada de L-18.

---

### L-23 · crm-calendar-book no valida bloqueos ni availability (server-side gap) ✅ COMPLETADO
**Implementado (incluye L-26 en la misma pasada):**
1. `calendar.availability` se agrega al SELECT. Se porta `amPmToMinutes` + `slotFitsAvailability` (Deno) con semántica `slotStart >= from && slotStart + duration <= to` → cierra también el gap past-closing de L-26 en el servidor.
2. Nuevo query a `crm_blocked_slots` (filtrado por `calendar_id`) + helper `isBlockedBySlots(blocks, dateKey, slotStartMin)` con match por `type`:
   - `fullday` → `b.date === dateKey`
   - `range`   → `dateKey ∈ [range_start, range_end]`
   - `hours`   → `slotStart ∈ [start, end)` (misma semántica que el front)
3. Errores descriptivos: 422 para disponibilidad fuera de rango, 409 para bloqueo activo, 409 para conflicto con cita previa.
4. Deploy a Supabase: `crm-calendar-book` v15.
**Archivos:** `supabase/functions/crm-calendar-book/index.ts`

---

### L-24 · saveBlock no valida que fin > inicio (bloqueo inválido silencioso) ✅ COMPLETADO 2026-04-24
**Bug:** Ambos paths de creación de bloqueo permitían guardar `endHour/endMinute <= startHour/startMinute`. No mostraba error, se guardaba en DB, pero `isSlotBlocked` nunca lo marcaba (rango vacío) — bloqueo "fantasma". También el handler del SlotDialog (click en slot vacío → tab "Reservar tiempo") omitía la validación.
**Fix aplicado en los dos paths de `CrmCalendar.tsx`:**
- `saveBlock` (botón "+ Bloquear tiempo" del header): si `type === "hours"` valida `end > start`; si `type === "range"` valida `startDate && endDate` y `endDate >= startDate` → toast y abortar.
- `onSaveBlock` handler del `SlotDialog` (click en slot vacío → tab "Reservar tiempo"): misma validación `end > start` para `type === "hours"`.
**Prioridad:** Baja. No rompe datos, pero confunde al admin.
**Archivos:** `src/components/crm/CrmCalendar.tsx`

---

### L-24b · Modales de "Reservar tiempo" — dropdown de minutos no respeta `duration_min` ✅ COMPLETADO 2026-04-24
**Bug:** Los modales de bloqueo (tipo "Horas") usaban la constante `MINUTES = [0,5,10,...,55]` para los dropdowns de inicio/fin, ignorando el `duration_min` del calendario. Permitía elegir minutos que no existen en el grid (ej. calendar de 30min → se podía bloquear desde :05), generando bloqueos desalineados que no cortan slots completos. Afectaba ambos paths: botón del header y click-en-slot.
**Fix aplicado:** Los `<select>` de `startMinute` y `endMinute` en ambos modales (`saveBlock` del header y `SlotDialog` click-en-slot) ahora usan `slotMinuteOptions`/`apptMinuteOptions` (derivados de `minutesForInterval(calendar.duration_min)`), igual que los dropdowns de creación/edición de citas.
**Prioridad:** Baja. UX consistency con el grid del calendario.
**Archivos:** `src/components/crm/CrmCalendar.tsx`

---

### L-25 · Edit-appointment modal — minuto fuera del grid actual no se muestra ✅ COMPLETADO 2026-04-24
**Bug:** Al editar una cita con `minute` que no existe en el `slotMinuteOptions` actual (ej. cita a :15 y calendar duration=60 → options=[0]), el select aparecía vacío.
**Fix aplicado:** El select de "Min." ahora usa `[...new Set([...slotMinuteOptions, editMinute])].sort()` — incluye el valor actual como opción extra si no está en el grid, ordenado numéricamente. El admin puede ver y cambiar el minuto sin perder el valor original.
**Prioridad:** Baja. Solo afecta edición de citas viejas tras cambio de duración.
**Archivos:** `src/components/crm/CrmCalendar.tsx`

---

### L-26 · Slot past-closing — cita puede arrancar antes del cierre y terminar después ✅ COMPLETADO 2026-04-24
**Origen:** Auditoría post L-21. Los predicates de disponibilidad solo validaban que el **inicio** del slot estuviera dentro del horario abierto, no que el slot completo cupiera.
**Bug:** Con `availability = 9:00–18:00` y `duration_min = 60`, un slot a las 17:30 pasaba la validación y se ofrecía al usuario aunque termine a las 18:30 (30 min después del cierre).
**Fix aplicado:**
- `isSlotAvailable` en `CrmCalendar.tsx` y `CalendarRenderer.tsx` ahora recibe `duration = 0` (default retrocompatible).
- Predicate cambiado a `totalMin + duration <= amPmToMinutes(slot.to)`.
- Callers en DayView y WeekView pasan `interval`; callers en CalendarRenderer pasan `slotStep`.
- Servidor ya corregido en L-23 (`slotFitsAvailability`). Ahora cliente y servidor son consistentes.
**Archivos:** `src/components/crm/CrmCalendar.tsx`, `src/components/crm/CalendarRenderer.tsx`.

---

### L-26b · Admin puede crear citas solapadas sin collision check (auditoría 2026-04-24) ✅ COMPLETADO 2026-04-24
**Bug:** Cuando el admin crea una cita desde `SlotDialog` (click en slot vacío → "Agendar cita"), llama directamente a `useCreateAppointment` → Supabase insert sin pasar por el edge function `crm-calendar-book`. No hay validación de solapamiento, buffer, ni disponibilidad — el admin puede crear citas en horarios ya ocupados, en días bloqueados o fuera de la disponibilidad del calendario.
**Comportamiento deseado:** El admin tampoco debería poder crear citas solapadas — las reglas de negocio aplican igual para bookings internos.
**Fix:**
1. En `onSaveAppt` del handler de `SlotDialog` en `CrmCalendar.tsx`, antes del `createAppointment.mutateAsync`, validar client-side:
   - ¿El slot colisiona con alguna cita existente del mismo calendario (considerando `duration_min` y `buffer_min`)?
   - ¿El slot está bloqueado (`isSlotBlockedAt`)?
   - ¿El slot cae dentro de la disponibilidad del calendario (`isSlotAvailable` con duración)?
2. Si hay colisión: `toast.error(...)` descriptivo y abortar — no insertar.
3. Los datos necesarios ya están en memoria (`appointments`, `blockedSlots`, `availability`, `calendarInterval`) — no requiere llamadas extra a DB.
**Prioridad:** Media. No es bloqueante (admin generalmente sabe lo que hace), pero genera datos inconsistentes que confunden al cliente SaaS.
**Archivos:** `src/components/crm/CrmCalendar.tsx`

---

### L-26c · Edit-appointment tampoco valida colisiones (mismo gap que L-26b) ✅ COMPLETADO 2026-04-24
**Bug:** El modal de edición de cita llamaba a `updateAppointment.mutateAsync` directamente sin validar solapamiento, disponibilidad ni bloqueos.
**Fix aplicado:** Antes del `updateAppointment.mutateAsync`, se corren las mismas 3 validaciones de L-26b: disponibilidad (`isSlotAvailable`), bloqueo (`isSlotBlockedAt`), colisión con buffer — excluyendo la propia cita editada (`a.id !== editingApptId`). Fecha parseada con `Date.UTC` para evitar off-by-one de timezone.
**Archivos:** `src/components/crm/CrmCalendar.tsx`

---

### L-27 · `HOURS` hardcoded 7–19 desalineado con grid 0–23 en modales (auditoría 2026-04-24) ✅ COMPLETADO 2026-04-24
**Bug:** `const HOURS = [7..19]` no cubría valores fuera del rango (ej. `blockEndHour=20` cuando `newAppt.hour=19`), dejando selects vacíos.
**Fix aplicado:** `HOURS` cambiado a `Array.from({ length: 24 }, (_, i) => i)` — cubre 0:00–23:00. Las validaciones de disponibilidad (L-26b/c) ya impiden agendar fuera del horario real — el select solo necesita ser exhaustivo.
**Archivos:** `src/components/crm/CrmCalendar.tsx`

---

### L-28 · Grid y dropdowns de hora no reflejan el rango de disponibilidad configurado ✅ COMPLETADO 2026-04-24
**Bug (ampliado desde defaults 12–14):** Tres problemas relacionados:
1. `buildSlots` usa rango fijo 7:00–20:00 — el grid del admin no se adapta a la disponibilidad del usuario (si abre 9:00–18:00, igual muestra slots de 7:00).
2. `HOURS` pasó de [7..19] a [0..23] en L-27 (fix de emergencia), pero debería derivarse del rango de availability.
3. `openBlockModal` inicializa `startHour: 12, endHour: 14` sin considerar la disponibilidad configurada.
**Fix:**
- Extraer helper `availabilityHourRange(avail): { min: number; max: number }` que calcula la hora de apertura más temprana y la de cierre más tardía de toda la semana.
- `buildSlots` usa `range.min` como inicio y `range.max` como fin (en lugar de 7/20 hardcoded).
- `HOURS` en modales se reemplaza por el array derivado del mismo rango (`Array.from({length: range.max - range.min + 1}, (_, i) => i + range.min)`).
- `openBlockModal` usa `range.min` como `startHour` default y `range.min + 1` como `endHour`.
- Si no hay `availability` configurado, mantener el fallback 7–20.
- Comportamiento acordado: el grid usa el rango mínimo/máximo de TODA la semana (no por día). Si lunes abre 07:00 y martes abre 08:00, el grid arranca en 07:00 todos los días. Los slots fuera de disponibilidad del día actual se muestran en gris (comportamiento ya existente).
**Prioridad:** Media (elevada desde Baja). Inconsistencia visible para cualquier usuario del CRM admin.
**Archivos:** `src/components/crm/CrmCalendar.tsx`

---

## BLOQUE 4 — Features Nuevas (media-alta complejidad)
> Features que requieren backend + UI nueva. 1–3 días cada uno.

### F-1 · Documento Maestro (.md) — generación automática ✅ COMPLETADO
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

### F-1b ✅ · Documento Maestro — mejoras de contenido y precisión
**Descripción:** Actualizar el prompt de Claude y el edge function `generate-master-doc` para producir un documento más preciso, completo y accionable según el servicio contratado.

**Cambios al prompt:**

1. **Benefits del servicio:** leer el campo `benefits[]` de `crm_services` y pasarlo al prompt. Claude los incluye como requisitos técnicos en la sección "Instrucciones para Claude Code". Ejemplos:
   - Landing Page: "bilingüe ES/EN con toggle", "diseño enfocado en conversión", "botones WhatsApp/llamada"
   - Multi Page: "SEO local con schema LocalBusiness", "galería dinámica", "analytics y píxeles"
   - Booking: todo lo anterior + "reservas 24/7 con CalendarRenderer", "recordatorios automáticos"

2. **Estructura de páginas fija por servicio:**
   - **Landing Page:** 1 página larga con 7-10 secciones (Hero, Propuesta de valor, Servicios, CTA, Testimonios, FAQ, Contacto, etc.)
   - **Multi Page Website:** 6 páginas obligatorias: Home · Servicios · Sobre Nosotros · Galería/Portfolio · Testimonios · Contacto
   - **SaaS Booking:** las mismas 6 páginas + 7ª página "Agendar Cita" usando `CalendarRenderer` con el `calendar_id` del cliente

3. **Contenido generado con IA cuando faltan datos:** si el cliente no llenó Galería → Claude genera estructura de placeholder ("aquí va tu portafolio de trabajos"). Si no hay Testimonios → genera estructura de reseñas Google + placeholders. Si no hay FAQ → genera preguntas frecuentes típicas del rubro. El desarrollador conecta el contenido real después.

4. **calendar_id en el documento:** para servicios `is_saas: true`, leer el `calendar_id` guardado en `custom_fields` del contacto (clave `_saas_calendar_id`) e incluirlo explícitamente en la sección de instrucciones de la página de reservas.

5. **CTA del onboarding:** leer el campo `ob-cta` (objetivo de la página elegido por el cliente en el onboarding) e incluirlo en el Resumen del Proyecto y en la sección de instrucciones como el objetivo de conversión principal del sitio.

**Archivos:** `supabase/functions/generate-master-doc/index.ts`
**Complejidad:** Baja. Solo cambios al edge function (prompt + lectura de campos nuevos).

---

### F-1c ✅ · Calendario automático al activar cuenta SaaS (Opción B)
**Descripción:** Cuando un cliente completa el onboarding eligiendo el servicio Booking System, se crea automáticamente un `crm_calendar_config` vinculado al contacto. Al activar la cuenta SaaS, el calendario se transfiere al `user_id` del cliente. El admin nunca ve los calendarios de clientes SaaS en su panel.

**Flujo completo:**
```
1. Onboarding completado (servicio is_saas: true)
   → crm-form-public crea crm_calendar_config:
     user_id = admin_user_id
     contact_id = id del contacto (campo nuevo)
     name = nombre del negocio (ob-1-1)
     availability = ob-7-4 (formato compatible directo)
     slug = slugify(ob-1-1) + sufijo numérico si ya existe
     duration_min = 60, buffer_min = 0
     min_advance_hours = 1, max_future_days = 30
   → calendar_id guardado en custom_fields del contacto: { _saas_calendar_id: "uuid" }

2. Admin activa cuenta SaaS (create-saas-client)
   → transferir user_id del calendario: UPDATE crm_calendar_config SET user_id = client_user_id WHERE contact_id = contact_id

3. Panel del admin (CrmCalendar)
   → filtrar: solo mostrar calendarios donde contact_id IS NULL

4. generate-master-doc lee custom_fields._saas_calendar_id e incluye el calendar_id en el doc
```

**Implementación:**
1. **Migración DB:** `ALTER TABLE crm_calendar_config ADD COLUMN contact_id uuid REFERENCES crm_contacts(id)` (nullable)
2. **`crm-form-public`:** detectar `is_saas: true` en el servicio elegido → crear calendario con los valores definidos → guardar `calendar_id` en `custom_fields`
3. **`create-saas-client`:** transferir `user_id` del calendario al `user_id` del cliente SaaS recién creado
4. **`CrmCalendar`:** añadir filtro `contact_id IS NULL` en la query de calendarios del admin
5. **RLS:** políticas para que el cliente SaaS (y su Staff) pueda gestionar calendarios con su `user_id`

**Archivos:** migración SQL, `supabase/functions/crm-form-public/index.ts`, `supabase/functions/create-saas-client/index.ts`, `src/components/crm/CrmCalendar.tsx`, `src/hooks/useCrmData.ts`
**Complejidad:** Alta. Toca 4 archivos + migración + lógica de transferencia de ownership.

---

### F-1d · Logo del cliente — upload en onboarding y persistencia en business profile ✅ COMPLETADO

**Implementado:**
1. Bucket `form-uploads` creado en Supabase Storage (público, 5 MB, images + PDF) con políticas RLS (anon INSERT, public SELECT, service DELETE).
2. `FormRenderer.tsx` — componente `FileUploadField`: sube a Storage en el momento de selección, muestra miniatura + spinner, almacena URL pública en `formValues`.
3. `crm-form-public` (v18) — `handleLogoField()`: extrae la primera URL de campo `file`, la persiste en `crm_contacts.custom_fields._logo_url`. Se ejecuta **antes** de `handleServicesField` para que el logo esté disponible al sembrar el perfil.
4. `handleServicesField` (v18): al crear cuenta SaaS desde formulario, siembra `crm_business_profile` con `logo_url` leído de `custom_fields._logo_url`.
5. `create-saas-client` (v7): al activar cuenta manualmente, siembra `crm_business_profile` con logo del contacto.
6. `ConfirmationView`: muestra conteo de archivos ("2 archivos adjuntos") en lugar de texto genérico.

---

### F-1e · Confirmación inmediata de reserva — integrada en sistema de recordatorios ✅ COMPLETADO

**Implementado:**
- Sin migración DB — `reminder_rules` en `crm_calendar_config` ya es JSON; `"on_booking"` es un nuevo valor de `timing` en el mismo campo.
- `ReminderRulesEditor.tsx`: nuevo tipo `"on_booking"` en `ReminderTiming`, botón "Al reservar" en la sección Cuándo, oculta los campos de cantidad/unidad cuando está activo, muestra texto explicativo.
- `crm-calendar-book` (v17): tras crear la cita exitosamente, filtra las `reminder_rules` con `timing === "on_booking"`, crea filas en `crm_reminders` con `scheduled_at = now()`, las encola en `crm_reminder_queue`, y llama `send-reminders` para envío inmediato. Todo non-fatal.
- Soporta `recipient: "contact"` (email/tel del cliente que agendó) y `recipient: "business"` con multi-target (admin + staff).
- **Fix UX (campo "Email/WhatsApp destino" eliminado):** El editor de recordatorios ya no solicita un destino manual. El backend (`cron-queue-reminders`, `crm-calendar-book`) siempre resuelve el email/teléfono desde `crm_contacts`, `crm_business_profile` o `crm_staff` en tiempo de envío — el campo `channelValue` guardado en el JSON es ignorado. Se eliminaron del `ReminderRulesEditor` la UI, los imports sin uso (`useState`, `Input`), la función `buildChannelValue` y las props `contactEmail`/`contactPhone`.

---

### F-1f · UX del editor de recordatorios — modo vista/edición con guardado individual ✅ COMPLETADO

**Implementado:**
- "Añadir recordatorio" abre un `Dialog` con el formulario de edición (no inserta inline).
- El modal tiene botón **"Guardar recordatorio"** individual; "Cancelar" descarta el draft.
- Al guardar, el recordatorio aparece como `RuleSummaryCard` (read-only): muestra canal (badge), destinatario y cuándo en dos líneas compactas.
- Cada card tiene botones **"Editar"** (reabre el dialog con los valores actuales, editando una copia local) y **"Eliminar"**.
- No hay botón global de guardar — cada recordatorio se confirma por separado.
- Sin cambios de DB ni edge functions.

---

### F-2 · Formulario multi-página (Stepper en FormRenderer)
**Descripción:** Un formulario con `multi_page: true` se renderiza como stepper en `FormRenderer`. Cada sección = una página.

**Reglas:**
- Cada página necesita al menos 1 campo real (`heading` no cuenta)
- Validación por página antes de avanzar al siguiente
- La sección `isConfirmation: true` muestra resumen antes de enviar

**Archivos:** `src/components/crm/FormRenderer.tsx`, `src/components/crm/CrmForms.tsx`

---

### A-1 · RLS para Staff (prerequisito de F-3)
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

### F-3 · Staff — invitación por email y acceso real
**Prerequisito:** A-1 debe estar completo — sin RLS el Staff invitado verá datos vacíos.
**Descripción:** Al crear un Staff en CrmSettings, enviar email de invitación con link para crear contraseña en `/crm-setup`.

**Pendiente:**
- Verificar si el flujo de `create-saas-client` puede reutilizarse para Staff o si se necesita Edge Function separada `invite-staff-user`
- Al aceptar la invitación: actualizar `crm_staff.staff_user_id` y `status: 'active'`
- Confirmar que `/crm-setup` funciona para Staff y para clientes SaaS

**Archivos:** `supabase/functions/invite-staff-user/index.ts`, `src/pages/CrmSetup.tsx`, `src/components/crm/CrmSettings.tsx`

---

### F-4 · /onboarding → FormRenderer del CRM del Admin
**Prerequisito:** F-2 debe estar completo — el onboarding es multi-página y requiere el stepper.
**Descripción:** El stepper hardcodeado de 8 pasos se reemplaza por `FormRenderer` renderizando el formulario "Onboarding" del CRM del Admin (slug: `onboarding`).

**Transición:** Mantener el stepper como fallback hasta que el formulario esté completamente configurado y probado en producción. Luego eliminar los Steps 1–8.

**Archivos:** `src/pages/Onboarding.tsx`, `src/pages/FormPage.tsx`

---

### F-5 · Soporte de Timezones en Calendarios
**Descripción:** Cada calendario tiene un timezone configurado. El CalendarRenderer muestra los horarios convertidos al timezone del visitante.

**Implementación — 4 capas:**

1. **DB:** Migración: `ALTER TABLE crm_calendar_config ADD COLUMN timezone text NOT NULL DEFAULT 'America/La_Paz'`. Migrar calendarios existentes con `'America/La_Paz'` como timezone.

2. **CrmCalendarConfig (admin):** Nuevo campo selector de timezone. Detección automática del timezone del navegador del admin al crear un calendario nuevo (`Intl.DateTimeFormat().resolvedOptions().timeZone`). Editable manualmente (dropdown con todos los timezones IANA).

3. **CalendarRenderer (público):** Detectar timezone del visitante vía `Intl.DateTimeFormat().resolvedOptions().timeZone`. Convertir slots disponibles del timezone del calendario al timezone del visitante para display. Mostrar selector de timezone con el detectado como default (el visitante puede cambiarlo). Al enviar reserva a `crm-calendar-book`, enviar la hora en el timezone del calendario (conversión client-side antes de POST).

4. **crm-calendar-book (edge function):** Recibir `hour`/`minute` en el timezone del calendario. **Reemplazar el hardcode `TZ_OFFSET_HOURS = -4` (La Paz) por lookup dinámico del `calendar.timezone`** usando `Intl.DateTimeFormat` o librería de timezones (ej. `date-fns-tz`) para convertir wall-clock → absolute UTC ms en las validaciones de `min_advance_hours` y `max_future_days`. Opcionalmente recibir `visitor_timezone` para logging.

5. **CrmCalendar (admin):** Las citas se muestran en el timezone del calendario seleccionado. Si el admin cambia de calendario y los timezones difieren, las horas se ajustan.

**Datos existentes:** Citas actuales se asumen en `America/La_Paz` (timezone actual del admin). No requieren migración de datos — se almacenan como date+hour+minute y el nuevo campo timezone del calendario contextualiza la interpretación.

**Archivos:** migración SQL, `src/components/crm/CrmCalendarConfig.tsx`, `src/components/crm/CalendarRenderer.tsx`, `src/components/crm/CrmCalendar.tsx`, `src/lib/supabase.ts`
**Complejidad:** Alta — lógica de conversión de timezone en múltiples componentes + UX de detección automática.

---

### F-6 · Bloqueos de tiempo — edición, eliminación y panel de detalle
**Problema:** Los slots bloqueados (ícono de café ☕) en CrmCalendar son de solo lectura. Una vez creados no se pueden editar (cambiar fecha, horario, rango o motivo) ni eliminar desde la UI del calendario. El usuario debe borrar y recrear para cualquier cambio.

**Alcance:**
1. **Panel de detalle para bloqueos:** Al hacer click en un bloqueo (DayView, WeekView, MonthView), abrir un panel lateral similar al de citas mostrando: tipo (horas / día completo / rango), fechas, horario, motivo. Con botones de **Editar** y **Eliminar**.
2. **Edición completa:** Reusar el modal de "Reservar tiempo" precargado con los datos del bloqueo existente. Permitir cambiar todos los campos según el tipo:
   - `hours`: fecha, hora inicio, hora fin, motivo
   - `fullday`: fecha, motivo
   - `range`: fecha inicio, fecha fin, motivo
   - Permitir cambiar el tipo del bloqueo (ej. de `hours` a `fullday`)
3. **Eliminación:** Botón de eliminar con confirmación (DeleteConfirmDialog). Ya existe `useDeleteBlockedSlot`.
4. **Hook `useUpdateBlockedSlot`:** Crear nuevo hook en `useCrmData.ts` para actualizar parcialmente un `crm_blocked_slots` existente.

**Archivos:** `src/components/crm/CrmCalendar.tsx`, `src/hooks/useCrmData.ts`
**Complejidad:** Media — nuevo panel de detalle + reusar modal existente + nuevo hook de update.

---

### F-6b · Vista completa de Ventas (página dedicada con filtros)
**Descripción:** Nueva página `/crm/ventas` accesible desde la navegación del CRM. Contiene exactamente los mismos elementos del panel "Ventas" del resumen (CrmOverview): registro manual de ventas, historial paginado, métricas de ingresos y proyección de recurrentes. Reutiliza los mismos hooks y DB — no se duplica lógica.

**Diferencias respecto al panel del resumen:**
- Layout expandido a pantalla completa (no tarjeta lateral).
- Filtros adicionales en el historial: por rango de fechas, por servicio y por cliente.
- El historial del resumen (`CrmOverview`) se mantiene igual con paginación propia.

**Alcance:**
1. **Ruta nueva:** `src/pages/CrmVentas.tsx` registrada en el router (`/crm/ventas`).
2. **Navegación:** ítem "Ventas" en el sidebar del CRM (`CrmLayout` o navbar principal).
3. **Componente de filtros:** `SalesFilters` — fecha desde/hasta, select de servicio, select de cliente. Aplicados client-side sobre los datos ya cargados por `useSales()`.
4. **Historial paginado filtrado:** mismo componente de tabla/lista que en `CrmOverview`, con los filtros aplicados. Edición y eliminación de ventas (con motivo) idéntica al resumen.
5. **Métricas y proyección:** mismo bloque de KPIs del resumen — ingresos del mes, proyección de recurrentes. Se puede reutilizar el componente extraído de `CrmOverview`.
6. **Registro manual de venta:** mismo formulario del resumen reutilizado sin cambios.

**Decisión de implementación:**
- Extraer los sub-componentes de ventas de `CrmOverview` a componentes compartidos para no duplicar código.
- `useSales()` ya carga todas las ventas del usuario — filtrar client-side es suficiente (volumen bajo, sin necesidad de query separada por filtros).

**Archivos:** `src/pages/CrmVentas.tsx`, `src/components/crm/CrmOverview.tsx` (extracción de componentes), router, sidebar nav.
**Complejidad:** Media. Principalmente extracción y reutilización — no requiere backend nuevo.

---

### F-7 · White Label básico — logo y colores por cliente SaaS
**Descripción:** Cada cliente SaaS puede personalizar la apariencia de su CRM (panel admin) y páginas públicas (formularios, CalendarRenderer) eligiendo entre dos temas: **Clásico** (tema Acrosoft por default) y **Branded** (colores de marca registrados durante el onboarding).

**Alcance:**
1. **Origen de datos:**
   - Colores: `crm_business_profile.color_primary / color_secondary / color_accent` — ya existen, se registraron en el onboarding.
   - Logo: URL del logo subido durante el onboarding (ya implementado en F-1d). También debe poder cambiarse desde `CrmBusiness → tab "Logo"` (actualmente stub con toast "pendiente" — implementar como parte de este bloque reutilizando el bucket `form-uploads` y el patrón de `FileUploadField`).
   - Logo ajustado a tamaño fijo (ej. `max-height: 40px`, `object-fit: contain`) para evitar discrepancias entre logos de distintos tamaños.

2. **Selector de tema en configuración:**
   - En `CrmSettings` (o sección "Apariencia"), dos opciones: `Clásico` / `Branded`.
   - Persistir elección en `crm_business_profile.theme` (`classic` | `branded`).

3. **Aplicación del tema:**
   - En el panel admin del CRM: leer `theme` + colores/logo de `crm_business_profile` y aplicar CSS variables (`--color-primary`, etc.) al root del layout del CRM.
   - En páginas públicas (FormPage, CalendarRenderer): ya leen `usePublicBusinessProfile` — extender para incluir `logo_url` y `theme`.
   - Logo en el header del CRM admin + header de páginas públicas.

4. **Migración DB:** añadir columnas `logo_url TEXT` y `theme TEXT DEFAULT 'classic'` a `crm_business_profile`.

**Archivos:** `src/components/crm/CrmSettings.tsx`, `src/components/crm/CalendarRenderer.tsx`, `src/components/crm/FormRenderer.tsx`, `src/hooks/useCrmData.ts`, migración SQL.
**Complejidad:** Media. DB trivial, la aplicación de CSS variables requiere cuidado para no romper el tema global de Acrosoft para otros usuarios.

---

### F-8 · Importador y Exportador de Contactos (.csv)
**Descripción:** Los usuarios pueden importar contactos desde un archivo CSV con mapeo flexible de columnas, y exportar todos sus contactos a CSV incluyendo todos los campos.

**Importador:**
1. **Upload del archivo:** input CSV en `CrmContacts` (botón "Importar"). Parsear client-side con `papaparse`.
2. **Pantalla de mapeo:** tabla donde cada columna del CSV se mapea a un campo del sistema (nombre, email, teléfono, empresa) o a un campo custom. Si el usuario no encuentra un campo existente puede escribir un nombre nuevo → se crea como key en `custom_fields` JSONB. No requiere schema change.
3. **Detección de duplicados:** antes de insertar, verificar por email. Si ya existe un contacto con ese email, mostrar lista de conflictos con opciones: **Actualizar** (merge de campos) o **Ignorar** por cada uno o en bloque.
4. **Inserción:** upsert/insert en `crm_contacts`. Campos custom nuevos se guardan en `custom_fields` y aparecen automáticamente en la vista detalle del contacto (iteración sobre keys del JSONB).
5. **Resultado:** resumen post-importación: N creados, N actualizados, N ignorados.

**Exportador:**
1. Botón "Exportar CSV" en `CrmContacts`.
2. Exporta todos los contactos del usuario con campos estándar (nombre, email, teléfono, empresa, tags, stage, created_at) + todas las keys de `custom_fields` como columnas adicionales.
3. Generado client-side con `papaparse` — sin edge function necesaria.

**Decisiones de implementación:**
- `papaparse` para parse y generación de CSV (librería estándar, sin dependencias pesadas).
- Campos custom del JSONB: union de todas las keys de todos los contactos para definir columnas de export.
- "Crear campo al vuelo" = solo añadir una key al JSONB — la vista detalle del contacto ya mostrará esa key automáticamente al iterar sobre `custom_fields`.

**Archivos:** `src/components/crm/CrmContacts.tsx`, `src/hooks/useCrmData.ts`.
**Complejidad:** Media-alta. El mapeo de columnas y manejo de duplicados requieren UI dedicada (wizard de 2-3 pasos).

---

### F-9 · Términos y Políticas de Privacidad — página estática + check obligatorio en formularios
**Descripción:** Todos los formularios del CRM (FormRenderer) incluyen un checkbox obligatorio "Acepto los términos y políticas de privacidad" que bloquea el envío si no está marcado. Los términos son redactados una vez por Acrosoft y aplican universalmente a todos los clientes SaaS y sus usuarios finales.

**Alcance:**
1. **Página `/terminos_y_politicas_de_privacidad`:** componente React estático (`src/pages/TerminosPoliticas.tsx`). Texto redactado directamente en el componente (sin DB). Registrada en el router como ruta pública (sin auth). Contenido: Acrosoft se limita como procesador de datos, cada cliente SaaS es responsable del uso de los datos recolectados, datos usados solo para contacto.

2. **Check en FormRenderer:** antes del botón "Enviar", añadir checkbox con texto "Acepto los [términos y políticas de privacidad](link)" — link abre `/terminos_y_politicas_de_privacidad` en nueva pestaña. El campo es obligatorio — si no está marcado, submit bloqueado con mensaje de error. No se puede desactivar por formulario.

3. **Persistencia en DB:** al enviar el formulario, guardar en `crm_form_submissions` (o en la fila de contacto creada):
   - `terms_accepted: true`
   - `terms_accepted_at: timestamp`
   - Columnas nuevas en `crm_form_submissions`: `terms_accepted BOOLEAN DEFAULT false`, `terms_accepted_at TIMESTAMPTZ`.
   - También aplica al booking de citas (`crm-calendar-book` edge function): guardar `terms_accepted_at` en la cita o contacto creado.

4. **Migración DB:** añadir columnas a `crm_form_submissions` y opcionalmente a `crm_appointments`.

**Archivos:** `src/pages/TerminosPoliticas.tsx`, `src/components/crm/FormRenderer.tsx`, `supabase/functions/crm-calendar-book/index.ts`, router, migración SQL.
**Complejidad:** Baja-Media. Página estática simple + cambio en FormRenderer + migración.

---

### F-10 · Actualizar logo del sistema a Acros Logo (1).svg
**Descripción:** Reemplazar el logo actual del sistema (navbar, login, onboarding, cualquier lugar donde aparezca el logo de Acrosoft) por `Acros Logo (1).svg` ubicado en la carpeta `assets/`.

**Alcance:**
1. Buscar todos los usos del logo actual en el codebase (img src, imports de SVG, referencias en CSS).
2. Reemplazar con la referencia a `Acros Logo (1).svg` (o renombrar el archivo a `acros-logo.svg` para evitar espacios y paréntesis en el nombre).
3. Verificar tamaños y proporciones en cada contexto (navbar, sidebar, login, formularios públicos).

**Archivos:** todos los componentes que referencien el logo actual.
**Complejidad:** Muy baja. Búsqueda y reemplazo puntual.

---

## BLOQUE 5 — Arquitectura crítica
> Afectan seguridad y aislamiento de datos. Necesarios antes de tener clientes reales.
> Nota: A-1 (RLS Staff) fue movido al Bloque 4, antes de F-3, por ser prerequisito directo de esa feature.

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

### A-4 · RLS públicas exponen campos sensibles de citas (auditoría L-2)
**Origen:** L-2 auditado. Las políticas `"Public can read appointments"` y `"Public can read blocked slots"` tienen `qual: true` — devuelven TODAS las filas del sistema a queries anónimas.
**Bug:**
- `crm_appointments`: expone `notes` y `contact_id` de todas las citas de todos los usuarios ante un `curl` directo a la API de Supabase (el frontend solo selecciona campos seguros, pero la DB no lo impone).
- `crm_blocked_slots`: expone el campo `reason` de todos los bloqueos (e.g., "De vacaciones", información privada del negocio).
- `crm_calendar_config`: expone configuraciones de todos los calendarios del sistema (menor impacto — datos no personales).
**Fix:** Crear una DB Function o View `public_appointments_view` que solo exponga `date, hour, minute, duration_min, status, calendar_id` y asignar la política pública a esa view en vez de la tabla completa. Alternativa mínima: cambiar la política `"Public can read appointments"` para restringir el rol anon con `WITH CHECK` que bloquee `notes` y `contact_id` — pero RLS no soporta columnas. La solución correcta es una view + policy, o aceptar el riesgo y documentarlo hasta que haya clientes reales.
**Prioridad:** Media. Exposición real pero limitada (anon key es semi-pública, solo expone datos de availability + metadatos). Se vuelve crítico con clientes SaaS reales con citas privadas.
**Archivos:** migración SQL (view o policy update en `crm_appointments`, `crm_blocked_slots`)

---

### A-5 · Aislamiento completo de recursos de clientes SaaS
**Problema:** Los calendarios, formularios, pipelines, contactos y demás recursos creados para/por clientes SaaS actualmente conviven en el mismo `user_id` del admin. El admin los ve mezclados con sus propios datos. Los clientes SaaS no tienen aislamiento real.

**Regla de negocio:** Una vez que un cliente SaaS tiene cuenta activa y `user_id` propio, todos sus recursos deben pertenecer a ese `user_id`. El admin **no debe ver ni gestionar** los recursos de clientes SaaS desde su panel.

**Recursos a aislar:**
- `crm_calendar_config` → ya resuelto por F-1c (filtro `contact_id IS NULL` en admin, transferencia al activar cuenta)
- `crm_forms` → formularios creados por/para el cliente SaaS
- `crm_pipelines` → pipelines del cliente SaaS
- `crm_contacts` → contactos del cliente SaaS (sus propios clientes)
- `crm_appointments`, `crm_blocked_slots` → citas del cliente SaaS
- `crm_services`, `crm_sales` → servicios y ventas del cliente SaaS
- `crm_business_profile` → perfil del negocio del cliente SaaS

**Implementación:**
1. **Transferencia al activar cuenta:** en `create-saas-client`, identificar y transferir todos los recursos del contacto al nuevo `user_id` del cliente (similar al calendario en F-1c). Requiere vincular recursos al `contact_id` o identificarlos por un campo existente.
2. **Filtros en el panel admin:** en cada hook/query del admin, filtrar para excluir recursos con `user_id` que pertenezca a un cliente SaaS activo (`crm_client_accounts`).
3. **RLS:** el cliente SaaS solo accede a recursos con su propio `user_id`. El admin no puede leer recursos con `user_id` de clientes SaaS (excepción: impersonación vía magic link, A-2).
4. **Formularios creados en el onboarding:** el formulario de onboarding puede haber creado formularios vinculados al admin. Identificar cuáles pertenecen al cliente y transferirlos.

**Nota de complejidad:** Este es el cambio arquitectónico más grande del sistema. Requiere auditar todos los hooks y queries del panel admin para añadir filtros de exclusión, y definir exactamente cuáles recursos se crean al hacer onboarding vs. cuáles se crean después de activar la cuenta.

**Prerequisito:** F-1c debe estar completo (define el patrón de transferencia).

**Archivos:** `supabase/functions/create-saas-client/index.ts`, `src/hooks/useCrmData.ts` (todos los hooks de admin), migración SQL (RLS policies), múltiples componentes del CRM.
**Complejidad:** Muy alta. Refactor de arquitectura multi-tenant.

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

### UI-2 · Slots visuales y agendamiento manual según `schedule_interval` ✅ COMPLETADO
**Origen:** DayView/WeekView iteraban `HOURS = [7..19]` sin minutos. Con `schedule_interval=30` un slot reservado a las 14:00 ocupaba la fila entera y 14:30 no tenía fila propia.
**Implementado:**
- Helpers `buildSlots(interval)` y `minutesForInterval(interval)` generan los slots y las opciones de minuto coherentes con el intervalo (15 → [0,15,30,45], 30 → [0,30], 60 → [0]).
- `DayView` y `WeekView` reciben props `interval` y `durationMin`; renderizan una fila por cada slot usando etiqueta `HH:MM`.
- Match de citas: `a.hour === h && (a.minute ?? 0) === m`.
- Nuevo helper `isSlotBlockedAt(blocked, day, hour, minute, durationMin)` detecta solape real con bloqueos considerando la duración del slot.
- `onSlotClick(date, hour, minute)` y `openNewAppt(date, hour, minute)` propagan el minuto del slot clickeado.
- `SlotDialog` recibe prop `apptMinuteOptions` — el selector de minuto para agendar cita se restringe al intervalo.
- Modal "Editar cita" también usa `slotMinuteOptions`.
- Modales de "Reservar tiempo personal" (bloqueos) conservan `MINUTES = [0,15,30,45]` — los bloqueos operan con precisión fina independiente del intervalo del calendario.
**Archivos:** `src/components/crm/CrmCalendar.tsx`

---

### UI-3 · CalendarRenderer — fechas circulares
**Problema:** Las celdas de fecha del calendario público usan `rounded-md` (cuadrados redondeados) con `h-12 w-full`. Deberían ser celdas cuadradas perfectas con `rounded-full` para verse como círculos modernos (estilo Calendly/Cal.com/GHL).
**Fix:** Cambiar las celdas de fecha de `h-12 w-full rounded-md` a dimensiones cuadradas fijas (`w-10 h-10` o similar) con `rounded-full`. Centrar cada celda en su columna del grid. Mantener los colores configurables del CRM (`primaryColor`) — solo cambiar la forma. Ajustar estados: hoy (ring circular), seleccionado (fondo primary circular), disponible (texto), no disponible (texto gris tenue).
**Archivos:** `src/components/crm/CalendarRenderer.tsx`
**Complejidad:** Baja — solo CSS/Tailwind.

---

### UI-4 · CrmCalendarConfig — agregar opción "60 min" al schedule_interval ✅ COMPLETADO
**Origen:** El selector solo ofrecía 15 min / 30 min. Ahora acepta 60 min para calendarios con citas largas.
**Implementado:**
- `scheduleInterval` state tipado `15 | 30 | 60` (default 30)
- Normalización desde DB: `raw === 15 || raw === 60 ? raw : 30`
- Selector UI con 3 opciones: "Cada 15 min", "Cada 30 min", "Cada 60 min"
- `WeeklySchedulePicker.tsx:21` ya soportaba 60 en `buildHours`, sin cambios
- DB: `schedule_interval` no tiene check constraint (verificado), sin migración
- `CalendarRenderer` y `CrmCalendar` usan `duration_min` para slots, no `schedule_interval` — sin regresiones
**Archivos:** `src/components/crm/CrmCalendarConfig.tsx`

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

### DT-5 · useUpsertCalendarConfig — exportación muerta
- `useUpsertCalendarConfig` en `useCrmData.ts` está marcado como `@deprecated` y nunca es importado en ningún componente (grep confirmado). La nota "kept for CrmCalendar missing-form recovery" es incorrecta — ese código usa `useUpdateCalendarConfig`.
- Eliminar la función completa.
- **Archivo:** `src/hooks/useCrmData.ts`

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
  L-7   isConfirmation en FormRenderer ✅
  L-7b  Facebook Pixel en formularios ✅
  L-8   WeeklySchedulePicker horarios sub-hora ✅
  F-2   FormRenderer multi-página stepper
  F-3   Staff invitación email

MEJORAS VISUALES:
  UI-1  Bloques sub-hora con overlay preciso en vista admin del calendario
  UI-2  Slots visuales y agendamiento manual según schedule_interval

LARGO PLAZO:
  F-4   /onboarding → FormRenderer
  AV-1  Google Calendar sync
  AV-2  WhatsApp UI beta
  AV-3  Google Calendar bidireccional
  DT-1/2/3  Limpieza de código
```
