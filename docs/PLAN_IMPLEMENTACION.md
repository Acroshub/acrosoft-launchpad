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

### F-2 · Formulario multi-página (Stepper en FormRenderer) ✅ COMPLETADO

**Ya implementado (revisado 2026-04-25):**
- `FormRenderer` muestra stepper automáticamente cuando hay más de una sección (`totalSteps > 1`) — no requiere flag `multi_page`, lo determina por la presencia de `form.sections`.
- Validación por página en `next()` antes de avanzar ✅
- Sección `isConfirmation: true` renderiza `ConfirmationView` + `confirmationMessage` ✅
- `CrmForms` tiene toggle "Todo en uno / Por páginas", gestión de secciones (añadir, renombrar, subtítulo, reordenar, eliminar), y botón "Agregar paso de confirmación" ✅
- Validación al guardar: cada sección necesita ≥1 campo real ✅

---

### A-1 · RLS para Staff (prerequisito de F-3) ✅ COMPLETADO

**Implementado (revisado 2026-04-26):**
- Ya existía `crm_staff_has_perm(owner_id, perm_col, action)` — función SECURITY DEFINER que evalúa permisos granulares por columna JSONB en `crm_staff`.
- Políticas Staff ya presentes en: `crm_contacts`, `crm_appointments`, `crm_blocked_slots`, `crm_pipelines`, `crm_tasks`, `crm_forms`, `crm_services`, `crm_sales`, `crm_calendar_config`, `crm_business_profile`, `crm_logs`, `crm_reminders`, `crm_pipeline_deals`, `crm_contact_notes`.
- **Migración `rls_staff_missing_tables`** añadió las políticas faltantes:
  - `crm_reminder_config` → Staff con `perm_dashboard.read`
  - `crm_form_submissions` → Staff con `perm_formularios.read` (join por `crm_forms`)
  - `crm_contact_pipeline_memberships` → Staff con `perm_pipeline` (read/insert/update/delete, join por `crm_pipelines`)

---

### F-3 · Staff — invitación por email y acceso real ✅ COMPLETADO

**Implementado:**
- Edge function `invite-staff-user` (v1): verifica ownership del owner, llama `inviteUserByEmail` con metadata `{account_type: "staff", staff_id, owner_user_id}`, actualiza `crm_staff.status = "invited"`. Si el email ya tiene cuenta confirmada, vincula el usuario existente directamente (`status = "active"`).
- DB: función RPC `activate_staff_invitation()` (SECURITY DEFINER) — el staff la llama con su JWT al aceptar la invitación; hace `UPDATE crm_staff SET staff_user_id = auth.uid(), status = 'active' WHERE email = auth.email AND status = 'invited'`.
- `CrmSetup.tsx`: detecta `user.user_metadata.account_type`; si es `"staff"` llama el RPC; si es `"saas_client"` activa `crm_client_accounts` (flujo existente).
- `useCrmData.ts`: hook `useInviteStaff` que llama la edge function con el JWT del owner.
- `CrmSettings.tsx`: invita automáticamente al staff tras crearlo; botón "Re-enviar invitación" (icono Send con Loader) para miembros con `status = "invited"`.

---

### F-3b · Log de actividad — incluir acciones del Staff ✅ COMPLETADO

**Descripción:** El tab de Logs en Configuración actualmente solo muestra acciones del Dueño de Negocio. Debe incluir también las acciones realizadas por cualquier Staff del negocio, con indicación de quién ejecutó cada acción.

**Implementación — 3 capas:**

1. **DB:** Migración: `ALTER TABLE crm_logs ADD COLUMN performed_by_user_id uuid REFERENCES auth.users`. `user_id` sigue siendo el Dueño del negocio (contexto de ownership). `performed_by_user_id` es quien ejecutó la acción (puede ser el dueño mismo o un Staff).

2. **Escritura de logs:** Todos los triggers y Edge Functions que insertan en `crm_logs` deben pasar `performed_by_user_id = auth.uid()` (el JWT del actor real). Actualmente muchos usan `user_id = auth.uid()` para ambas cosas — separar los dos campos.

3. **UI (`CrmSettings.tsx` — LogsTab):** Añadir columna o badge en cada fila del log indicando si fue el dueño o un Staff. Si fue Staff, mostrar su nombre/email (join con `crm_staff.email` o `crm_staff.name` via `performed_by_user_id`). Añadir filtro opcional por actor (Todos / Solo dueño / Solo Staff / Staff específico).

**Archivos:** migración SQL, triggers de `crm_logs`, `src/components/crm/CrmSettings.tsx`, `src/hooks/useCrmData.ts` (hook `useLogs`)
**Complejidad:** Media — cambio de schema + actualizar todos los puntos de escritura de logs + UI de visualización.

---

### F-4 · /onboarding → FormRenderer del CRM del Admin ✅ COMPLETADO

**Implementado:**
- `Onboarding.tsx` usa `FormRenderer` con `formId = "b733e0c5-60d4-414d-896a-5ce459b07eaf"` (formulario "Onboarding Oficial v4")
- El stepper hardcodeado fue eliminado — el stepper multi-paso está integrado dentro de `FormRenderer`
- `FormPage.tsx` sirve como ruta pública genérica `/f/:formId`

**Archivos:** `src/pages/Onboarding.tsx`, `src/pages/FormPage.tsx`

---

### F-5 · Soporte de Timezones en Calendarios ✅ COMPLETADO

**Implementado:**
- **DB:** `crm_calendar_config.timezone text NOT NULL DEFAULT 'America/La_Paz'`. Calendarios existentes heredan La Paz automáticamente.
- **CrmCalendarConfig:** Selector de timezone con todos los IANA vía `Intl.supportedValuesOf("timeZone")`. Auto-detecta el timezone del navegador al crear un calendario nuevo.
- **CalendarRenderer:** Auto-detecta timezone del visitante. Selector de timezone en el header (visitante puede cambiarlo). Los horarios disponibles se muestran convertidos al timezone del visitante usando `formatSlotInTz`. La lógica de `minBookableMs` y `isDayAvailable` usa `wallClockToUtcMs` para comparaciones UTC correctas independientemente del timezone del browser.
- **crm-calendar-book:** Reemplazado `TZ_OFFSET_HOURS = -4` por `wallClockToUtcMs()` con convergencia de 2 iteraciones (maneja DST). Lee `calendar.timezone` dinámicamente. Deployed v20.
- **Datos existentes:** Sin migración de datos — `date+hour+minute` se interpreta en el timezone del calendario. Calendarios existentes quedan en `America/La_Paz`.

**Archivos:** migración SQL, `src/components/crm/CrmCalendarConfig.tsx`, `src/components/crm/CalendarRenderer.tsx`, `src/lib/supabase.ts`, `supabase/functions/crm-calendar-book/index.ts`

---

### ✅ F-6 · Bloqueos de tiempo — edición, eliminación y panel de detalle
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

### ✅ F-6b · Vista completa de Ventas (página dedicada con filtros)
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

### ✅ F-7 · White Label básico — logo y colores por cliente SaaS
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

### ✅ F-8 · Importador y Exportador de Contactos (.csv)
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

### ✅ F-9 · Términos y Políticas de Privacidad — página estática + check obligatorio en formularios
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

### F-10 · Actualizar logo del sistema a Acros Logo (1).svg ✅ COMPLETADO
**Descripción:** Reemplazar el logo actual del sistema (navbar, login, onboarding, cualquier lugar donde aparezca el logo de Acrosoft) por `Acros Logo (1).svg` ubicado en la carpeta `assets/`.

**Implementado:**
- SVG copiado a `src/assets/acros-logo.svg` (nombre limpio sin espacios ni paréntesis).
- `AcrosoftLogo.tsx` actualizado: reemplaza el ícono matraz inline por `<img src={acrosLogo}>` con las mismas dimensiones por size (sm=32px, md=40px, lg=56px). Mantiene el texto "Acrosoft Labs" junto al ícono.
- El cambio aplica automáticamente a los 6 lugares donde se usa el componente: `Navbar`, `Crm`, `Login`, `Onboarding`, `Dashboard`, `Admin`.

**Archivos:** `src/assets/acros-logo.svg` (nuevo), `src/components/shared/AcrosoftLogo.tsx`.

---

## BLOQUE 4b — Fixes y Mejoras Rápidas Pendientes
> Items identificados tras completar los Bloques 1–4. Baja-media complejidad, sin dependencias de backend nuevo.

### QW-8 · Precio recurrente visible en tabla de precios (Landing) ✅ COMPLETADO
**Implementado:**
- **Root cause:** `recurring_label` se usaba como el contenido completo del badge (sobreescribiendo el precio). El admin configuró el label como `"/mes mantenimiento"` esperando que se combinara con el precio, pero el código lo trataba como texto libre.
- **Fix:** El precio recurrente siempre se muestra. `recurring_label` se usa como descriptor del intervalo (se normaliza quitando el `/` inicial si lo tiene). Patrón: `$recurring_price / {recurring_label ?? recurring_interval ?? "mes"}`.
- Label del precio de setup: dinámico — "Setup inicial" si hay `recurring_price`, "Pago único" si no es recurrente, `/ {interval}` si es recurrente sin precio separado.
- Mismo fix aplicado en los 4 lugares donde se muestra el precio recurrente:
  1. `src/pages/Index.tsx` — landing pública (cards de servicios)
  2. `src/components/crm/FormRenderer.tsx` — selector de servicios en formularios públicos
  3. `src/components/crm/CrmOverview.tsx` — formulario de venta manual
  4. `src/components/crm/CrmVentas.tsx` — formulario de venta manual (página Ventas)

---

### QW-9 · Toggle de idioma en Landing — arreglar funcionalidad ✅ COMPLETADO
**Problema:** La landing page tiene un botón de cambio de idioma (ES/EN) que no funciona actualmente.
**Fix:** Implementado React Context (`LanguageProvider`) con persistencia en localStorage. Traducciones completas ES/EN en `src/i18n/landing.ts`. Todo texto estático en `Index.tsx` y `Navbar.tsx` reemplazado con `T.*` del contexto.
**Archivos:**
  1. `src/hooks/useLanguage.tsx` — LanguageProvider + useLang hook (nuevo)
  2. `src/i18n/landing.ts` — traducciones completas ES/EN (nuevo)
  3. `src/App.tsx` — envuelto con LanguageProvider
  4. `src/components/Navbar.tsx` — toggle funcional con idioma activo resaltado
  5. `src/pages/Index.tsx` — todo texto estático traducido vía `T.*`

---

### QW-10 · Descuento aplicado en registro manual de ventas ✅ COMPLETADO
**Problema:** Al registrar una venta manualmente desde el CRM (formulario en `CrmOverview` y `CrmVentas`), el precio se toma directamente de `crm_services.price` sin considerar `discount_pct`. Solo L-5 (ventas automáticas desde formulario) aplica el descuento correctamente.
**Fix implementado:**
1. Helper `calcDiscounted(price, discountPct)` en `CrmOverview.tsx`
2. `handleServiceChange` aplica descuento al setear monto inicial
3. Radio "Pago Inicial" y "Pago Recurrente": monto pre-cargado con descuento, precios tachado+verde visibles
4. Indicador `✓ X% de descuento aplicado` debajo del campo de monto
5. Dropdown de servicios muestra precio descontado + `(-X%)`
**Archivos:** `src/components/crm/CrmOverview.tsx`

---

### QW-11a · Descuentos independientes por precio (DB + editor de servicios) ✅ COMPLETADO
**Decisión de diseño:** Setup y recurrente tienen descuentos separados e independientes. El admin puede aplicar 20% al setup y 0% al recurrente, o cualquier combinación.
**Migración DB:** Agregar `recurring_discount_pct INTEGER NOT NULL DEFAULT 0` en `crm_services`.
**Fix en editor (`CrmServices.tsx`):** Dentro de la sección de precio recurrente, agregar campo "Descuento recurrente (%)" junto al campo de descuento de setup. Ambos campos con el mismo estilo y comportamiento.
**Archivos:** migración SQL en Supabase, `src/components/crm/CrmServices.tsx`, `src/lib/supabase.ts` (tipo).
**Complejidad:** Baja — campo nuevo en DB + input adicional en el editor.

---

### QW-11b · Aplicar descuentos independientes en todos los displays ✅ COMPLETADO
**Depende de:** QW-11a completado.
**Problema:** Todos los lugares que muestran precios deben usar `discount_pct` para setup y `recurring_discount_pct` para recurrente — no el mismo campo para ambos.
**Corrección en QW-10:** `CrmOverview.tsx` actualmente aplica `discount_pct` al precio recurrente — corregir para usar `recurring_discount_pct`.
**Alcance completo:**
1. **`CrmOverview.tsx` (QW-10 fix):** radio "Pago Recurrente" usa `recurring_discount_pct`
2. **`Index.tsx`:** badge de recurrencia usa `recurring_discount_pct`
3. **`FormRenderer.tsx`:** precio recurrente en selector de servicio usa `recurring_discount_pct`
4. **`CrmServices.tsx`:** preview del servicio muestra ambos descuentos correctamente
5. **`crm-form-public` edge function:** venta automática aplica cada descuento al precio correspondiente
**Archivos:** `src/components/crm/CrmOverview.tsx`, `src/pages/Index.tsx`, `src/components/crm/FormRenderer.tsx`, `src/components/crm/CrmServices.tsx`, `supabase/functions/crm-form-public/index.ts`.
**Complejidad:** Baja — sustitución de campo en cada display, lógica ya existe.

---

### QW-12 · Widgets bilingües (calendario y formulario) para sites de clientes ✅ COMPLETADO
**Problema:** Los componentes `/book/:calendarId` y `/f/:formId` están en español fijo. Cuando se embeben en el site de un cliente (via iframe), no hay forma de controlar el idioma desde el exterior.
**Contexto:** Cada cliente tiene su propio site/Vercel. El CRM provee widgets embebibles (iframe). El cliente pasa el idioma como parámetro.
**Solución:** Parámetro `?lang=es|en` en la URL del widget. Cascada de resolución:
  1. `?lang=` en el URL → usa ese valor
  2. `navigator.language` del visitante → detecta automáticamente
  3. Fallback → `es`
**Implementación:**
  1. `src/i18n/widgets.ts` — traducciones ES/EN para FormRenderer y BookingPage (campos, botones, mensajes de error, estados de carga)
  2. `src/hooks/useLangWidget.ts` — hook que lee `?lang` del URL → `navigator.language` → `"es"`
  3. `src/pages/FormPage.tsx` — conectar con `useLangWidget()`
  4. `src/pages/BookingPage.tsx` — conectar con `useLangWidget()`
  5. Mini-toggle ES/EN dentro del widget (opcional, para que el visitante cambie si quiere)
**Snippet de embed para clientes:**
```html
<iframe src="https://acrosoftlabs.com/book/CALENDAR_ID?lang=es" width="100%" height="700px" frameborder="0"></iframe>
```
**Nota:** No afecta la landing de Acrosoft Labs (usa su propio LanguageProvider con toggle en Navbar).
**Archivos:** `src/i18n/widgets.ts` (nuevo), `src/hooks/useLangWidget.ts` (nuevo), `src/pages/FormPage.tsx`, `src/pages/BookingPage.tsx`, `src/components/crm/FormRenderer.tsx`.
**Complejidad:** Media — traducciones + hook + conectar 2 páginas públicas.

---

### L-29 · Formulario básico por usuario — crear solo una vez ✅ COMPLETADO
**Problema:** Cuando el admin crea un calendario sin vincularlo a un formulario existente, el sistema auto-crea un "formulario básico" cada vez. Si el usuario tiene 3 calendarios sin formulario, se crean 3 formularios básicos duplicados — confuso y difícil de gestionar.
**Comportamiento deseado:** El formulario básico auto-generado es único por usuario. Si ya existe uno (`crm_forms` con `is_basic_form: true`), los calendarios siguientes lo reutilizan en vez de crear uno nuevo.
**Fix:**
1. **Migración DB:** añadir columna `is_basic_form BOOLEAN DEFAULT false` en `crm_forms`.
2. **Lógica en `CrmCalendarConfig`:** antes de crear, hacer query `SELECT id FROM crm_forms WHERE user_id = auth.uid() AND is_basic_form = true LIMIT 1`. Si existe, reutilizar ese `id`. Si no, crear uno nuevo marcado con `is_basic_form = true`.
**Archivos:** migración SQL, `src/components/crm/CrmCalendarConfig.tsx`, `src/hooks/useCrmData.ts`.
**Complejidad:** Baja — query de lookup + flag en DB.

---

## BLOQUE 5 — Arquitectura crítica
> Afectan seguridad y aislamiento de datos. Necesarios antes de tener clientes reales.
> Nota: A-1 (RLS Staff) fue movido al Bloque 4, antes de F-3, por ser prerequisito directo de esa feature.

### A-2 · Impersonación del Admin (magic link) ✅
**Problema:** El Admin necesita entrar al CRM de un cliente SaaS sin credenciales.

**Estado:** ✅ Completado. Botón gateado por `isSuperAdmin`, `redirect_to` pasado desde el frontend, edge function desplegada (v7).

**Flujo:**
1. Admin clic en botón de impersonación junto al contacto SaaS en `CrmContacts`
2. Llama a `generate-magic-link` con `client_user_id`
3. Edge Function usa `supabase.auth.admin.generateLink()` con `service_role` key
4. Link abre en nueva pestaña → sesión temporal como el cliente
5. Dentro del CRM el Admin se comporta exactamente como el cliente (sin indicador especial)

**Archivos:** `supabase/functions/generate-magic-link/index.ts`, `src/components/crm/CrmContacts.tsx`

---

### A-3 · RLS para crm_client_accounts — acceso del cliente ✅ COMPLETADO
**Problema:** La política actual solo permite al Admin leer/escribir `crm_client_accounts`. La página `/crm-setup` necesita que el cliente pueda actualizar su propio registro (`status → active`).
**Implementado:** Políticas ya existentes y verificadas en DB:
- `"Client can view own account"` SELECT: `client_user_id = auth.uid()`
- `"Client can update own account status"` UPDATE: `client_user_id = auth.uid()`
- `CrmSetup.tsx` usa correctamente `.update({ status: "active" }).eq("client_user_id", user.id)`
- `crm_staff` RLS devuelve null para clientes SaaS sin errores (correcto)
**Archivos:** migración SQL (ya aplicada), `src/pages/CrmSetup.tsx`

---

### A-4 · RLS públicas exponen campos sensibles de citas ✅ COMPLETADO
**Origen:** L-2 auditado. Las políticas `"Public can read appointments"` y `"Public can read blocked slots"` tenían `qual: auth.role() = 'anon'` — devolvían TODAS las filas del sistema a queries anónimas sin filtro de columnas.

**Implementado:**
- **Row-level (nuevas políticas):** Anon solo puede leer filas cuyo `calendar_id` existe en `crm_calendar_config` — elimina enumeración de citas de calendarios desconocidos.
- **Column-level (grants de PostgreSQL):** `REVOKE SELECT ON table FROM anon` + `GRANT SELECT (safe_cols) ON table TO anon`:
  - `crm_appointments` anon SELECT: `id, calendar_id, service, date, hour, minute, duration_min, status, created_at` — sin `notes`, `contact_id`, `user_id`, `terms_accepted_at`.
  - `crm_blocked_slots` anon SELECT: `id, calendar_id, type, date, start_hour, end_hour, range_start, range_end, start_minute, end_minute, created_at` — sin `reason`, `user_id`.
- Acceso autenticado (admin/staff) mantiene acceso completo a todas las columnas vía RLS `user_id = auth.uid()`.

**Archivos:** migración SQL `a4_restrict_public_sensitive_fields`

---

### A-5 · Aislamiento completo de recursos de clientes SaaS ✅ COMPLETADO

**Estado de aislamiento por recurso:**
- `crm_calendar_config` ✅ F-1c: transferencia a `client_user_id` al activar, admin filtra `contact_id IS NULL`
- `crm_business_profile` ✅ RLS `user_id = auth.uid()` — cada uno ve solo el suyo
- `crm_services` ✅ RLS `user_id = auth.uid()` — verificado en DB (2 users distintos, sin crossover)
- `crm_forms` ✅ RLS `user_id = auth.uid()` — aislado
- `crm_contacts` ✅ RLS `user_id = auth.uid()` — aislado
- `crm_appointments`, `crm_blocked_slots` ✅ RLS `user_id = auth.uid()` — aislado
- `crm_sales`, `crm_pipelines`, `crm_tasks` ✅ RLS `user_id = auth.uid()` — aislado

**Implementado en esta iteración:**
1. **Gate de cuenta deshabilitada:** `useMyClientAccount` hook — clientes SaaS leen su propio `crm_client_accounts.status` (RLS `client_user_id = auth.uid()`). En `Crm.tsx`, si `account_type === "saas_client"` y `status === "disabled"`, se muestra pantalla de bloqueo en lugar del CRM completo.
2. **Seeding de servicios desde onboarding:** `create-saas-client` (v11) — al activar cuenta, extrae servicios del campo `ob-4-1` en `custom_fields` del contacto y los inserta en `crm_services` con `user_id = client_user_id`. Solo si el cliente no tiene servicios ya.

**Limitación residual (baja prioridad):** Formularios del admin usados en onboarding permanecen bajo `user_id` del admin. No son visibles al cliente SaaS — no hay leak. La transferencia de formularios queda pendiente si se decide que el cliente debe poder editar el formulario de onboarding desde su propio CRM.

**Archivos:** `src/hooks/useCrmData.ts`, `src/pages/Crm.tsx`, `supabase/functions/create-saas-client/index.ts` (v11)

---

## BLOQUE 6 — Sistema de Soporte
> Comunicación bidireccional entre Dueños de Negocio / Staff y el Admin de Acrosoft.

### SP-1 · Schema de base de datos ✅ COMPLETADO

**Tablas nuevas:**

```sql
-- Ticket o sugerencia
CREATE TABLE support_tickets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz DEFAULT now(),
  user_id         uuid REFERENCES auth.users NOT NULL,  -- quien lo envía
  type            text CHECK (type IN ('ticket', 'suggestion')) NOT NULL,
  subject         text NOT NULL,
  status          text CHECK (status IN ('open','in_progress','resolved','read')) NOT NULL DEFAULT 'open',
  -- 'read' solo aplica a sugerencias (sin respuesta)
  -- 'open','in_progress','resolved' aplican a tickets
  updated_at      timestamptz DEFAULT now()
);

-- Mensajes del hilo (tickets) o el cuerpo único (sugerencias)
CREATE TABLE support_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz DEFAULT now(),
  ticket_id   uuid REFERENCES support_tickets NOT NULL,
  sender_id   uuid REFERENCES auth.users NOT NULL,
  sender_role text CHECK (sender_role IN ('client','admin')) NOT NULL,
  content     text NOT NULL,
  attachments jsonb DEFAULT '[]'   -- array de URLs públicas (bucket: support-attachments)
);

-- Qué staff de Acrosoft recibe emails de soporte (configurado por el Admin)
CREATE TABLE support_notification_recipients (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id   uuid REFERENCES auth.users NOT NULL UNIQUE
);
```

**RLS:**
- `support_tickets`: el dueño (`user_id`) puede SELECT/INSERT/UPDATE propio. El Admin de Acrosoft (service role en edge functions) gestiona todo.
- `support_messages`: el dueño del ticket puede SELECT mensajes de su ticket. Puede INSERT solo con `sender_role = 'client'`. Admin puede hacer todo via service role.
- `support_notification_recipients`: solo Admin puede leer/escribir.

**Storage:** bucket `support-attachments` (privado, URLs firmadas de 24h).

**Archivos:** migración SQL, bucket Supabase Storage.

---

### SP-2 · Vista del Cliente / Staff (enviador) ✅ COMPLETADO

**Ubicación:** Sidebar CRM → sección "Soporte" debajo de "Configuración".

**Componente:** `src/components/crm/CrmSupport.tsx`

**UI:**
- Dos tabs: **Tickets** | **Sugerencias**
- Botón "+ Nuevo Ticket" / "+ Nueva Sugerencia"
- Lista de tickets/sugerencias propios con badge de estado (`Abierto`, `En proceso`, `Resuelto` / `Leído`)
- Al abrir un ticket: vista de chat con hilo de mensajes y campo para escribir respuesta + adjuntos
- Sugerencias: solo muestra el mensaje enviado, sin campo de respuesta
- Badge numérico en el icono del sidebar: tickets con respuesta nueva del Admin no leída por el cliente

**Formulario nuevo ticket:**
- Asunto (texto)
- Mensaje (textarea)
- Adjuntos (file upload → bucket `support-attachments`)

---

### SP-3 · Vista del Admin de Acrosoft ✅ COMPLETADO

**Ubicación:** Misma sección "Soporte" en el sidebar, pero con vista diferente cuando `isSuperAdmin === true`.

**Componente:** `src/components/crm/CrmSupportAdmin.tsx`

**UI:**
- Tabs: **Tickets** | **Sugerencias**
- Filtros: por estado (Abierto / En proceso / Resuelto / Todos), por usuario/negocio
- Lista con: nombre del remitente, asunto, fecha, badge de estado y badge "NUEVO" si no ha sido leído
- Al abrir un ticket: hilo de chat completo + campo para responder + cambiar estado
- Al abrir una sugerencia: solo ver el contenido, botón "Marcar como leída"
- El Admin **no puede** crear tickets ni sugerencias
- Badge numérico en el sidebar: total de tickets/sugerencias no leídos

---

### SP-4 · Notificaciones por email ✅ COMPLETADO

**Trigger A — Nuevo ticket o sugerencia:**
- Destinatarios: Admin de Acrosoft + staff configurados en `support_notification_recipients`
- Contenido: asunto, mensaje, nombre del remitente, tipo (ticket/sugerencia), link directo

**Trigger B — Admin responde un ticket:**
- Destinatario: el cliente/staff que abrió el ticket
- Contenido: la respuesta, asunto original, link para ver el hilo

**Implementación:** Edge Function `send-support-email` usando Resend. Se invoca desde el frontend cuando se crea un ticket/sugerencia o cuando el Admin responde.

**Archivos:** `supabase/functions/send-support-email/index.ts`

---

### SP-5 · Configuración de notificaciones (Admin) ✅ COMPLETADO

**Ubicación:** `CrmSettings.tsx` → tab "Soporte" (adminOnly).

**Implementado:**
- Tabla `support_notification_recipients` con columnas `id`, `email`, `active`, `created_at`. RLS: solo superadmin.
- Tab "Soporte" en CrmSettings visible únicamente para el superadmin.
- Muestra la lista de staff del CRM (via `useStaff`) con toggle por persona.
- Toggle ON → inserta en `support_notification_recipients` con `active=true`. Toggle OFF → marca `active=false`. Subsiguientes toggles actualizan el registro existente.
- Edge function `send-support-email` lee esta tabla (con service role) para los triggers `new_ticket` y `client_reply`, y agrega los emails activos como destinatarios adicionales al admin.
- Hooks: `useNotificationRecipients`, `useAddNotificationRecipient`, `useToggleNotificationRecipient`.

---

### SP-6 · Badge en sidebar ✅ COMPLETADO

**Implementado:**
- Dot azul en sidebar aparece cuando `soporteBadge > 0` (cliente o admin según rol).
- **Admin:** `useAdminUnreadCount` — cuenta todos los tickets+sugerencias con `status='open'`. Refetch cada 30s. Se resetea naturalmente al cambiar el estado del ticket.
- **Cliente:** `useSupportUnreadCount` — cuenta tickets+sugerencias con `updated_at > client_last_seen_at`. Refetch cada 30s. Se resetea al abrir el hilo vía `useMarkTicketSeen` → `mark_ticket_seen()` (SECURITY DEFINER).
- Fix aplicado: el conteo del cliente ahora incluye sugerencias (antes solo contaba tickets).

---

**Orden de implementación sugerido:** SP-1 → SP-2 → SP-3 → SP-4 → SP-5 → SP-6

---

### SP-7 · Revisión end-to-end de recordatorios (`send-reminders`) ✅ COMPLETADO

**Objetivo:** Verificar que el sistema de recordatorios de citas funciona correctamente de extremo a extremo, igual que se hizo con el sistema de soporte (SP-2 → SP-4).

**Áreas a revisar:**

1. **Edge function `send-reminders`** — ¿envía emails y/o SMS correctamente? ¿maneja errores sin crashear? ¿usa dominio verificado en Resend (`acrosoftlabs.com`)?
2. **Edge function `crm-calendar-book`** — trigger `on_booking`: ¿inserta correctamente en `crm_reminders` y `crm_reminder_queue`? ¿llama a `send-reminders`?
3. **CRON de recordatorios programados** — ¿existe un job que procese `crm_reminder_queue` periódicamente para recordatorios `X horas/días antes`?
4. **RLS y permisos** — ¿los clientes pueden ver sus propios recordatorios? ¿el staff tiene acceso correcto?
5. **Templates de email** — ¿el contenido del email de recordatorio es claro y tiene el formato correcto? ¿escapa HTML para prevenir inyección?
6. **Recipient `business` vs `contact`** — ¿ambos tipos de destinatario funcionan? ¿multi-target para admin + staff?
7. **Registro en `crm_reminders`** — ¿el campo `sent_at` se actualiza al enviar? ¿el status refleja éxito/fallo?

**Archivos clave:**
- `supabase/functions/send-reminders/index.ts`
- `supabase/functions/crm-calendar-book/index.ts`
- `src/components/crm/ReminderRulesEditor.tsx`
- `src/hooks/useCrmData.ts` (hooks de recordatorios)

---

### SP-8 · Selector de país en inputs de teléfono ✅ COMPLETADO

**Problema:** Los inputs de teléfono en todos los formularios (FormRenderer, CrmForms) aceptan texto libre sin indicación de país. Un número "7712345" es ambiguo sin saber si pertenece a Bolivia (+591), México (+52) u otro país. Esto afecta futuros recordatorios WhatsApp y la calidad del dato.

**Alcance:**
1. **Nuevo campo de teléfono con selector de país:** En `FormRenderer`, los campos `type === "phone"` muestran un dropdown de prefijo de país (bandera + código) seguido del input numérico. Al enviar, el valor guardado incluye el prefijo: `+591 71234567`.
2. **Prefijos disponibles:** Lista estática de países con código ISO y prefijo. Ordenar: Bolivia primero (default), luego México, USA, España, Argentina, Colombia, Chile — luego el resto alfabético.
3. **CrmForms (builder):** El tipo de campo `phone` ya existe. No requiere cambio en el builder — el selector de país se aplica automáticamente en el renderer.
4. **Formulario de contacto manual en el CRM (`CrmContacts` / detalle):** El campo `phone` del formulario de edición de contacto también debe tener el selector de país.
5. **Valor guardado:** Siempre incluir el código de país en el string: `+591 71234567`. Si el campo ya tiene un valor que empieza con `+`, detectar el prefijo automáticamente al cargar.

**Archivos:** `src/components/crm/FormRenderer.tsx`, `src/components/crm/CrmContacts.tsx`, `src/i18n/phone-countries.ts` (lista de países, nuevo).
**Complejidad:** Baja-Media — componente nuevo de PhoneInput + integración en los dos lugares que usan campos phone.

---

### SP-9 · Validación de tipo en inputs de formularios ✅ COMPLETADO

**Problema:** Los inputs de los formularios no validan el tipo del valor ingresado antes de enviar. Un campo `email` acepta cualquier texto, un campo `phone` acepta letras, etc. Esto genera datos sucios en la DB y puede romper flujos downstream (envío de emails, recordatorios WhatsApp).

**Alcance — validación por tipo de campo:**

| Tipo de campo | Validación requerida |
|---|---|
| `email` | Formato de email válido (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) |
| `phone` | Solo dígitos, espacios, `+`, `-`, `()`. Mínimo 7 dígitos. |
| `number` | Solo números. Respetar `min`/`max` si están configurados. |
| `date` | Fecha válida. Respetar `min`/`max` si están configurados. |
| `text` / `textarea` | Respetar `minLength`/`maxLength` si están configurados. |
| `url` | URL válida (empieza con `http://` o `https://`). |

**Implementación:**
1. Función `validateFieldValue(field, value): string | null` — retorna mensaje de error o `null` si es válido.
2. En `FormRenderer`, la validación existente por página (campos obligatorios vacíos) se extiende para incluir la validación de tipo: si el campo tiene valor pero el formato es inválido → bloquear avance y mostrar error debajo del input.
3. Los errores se muestran en tiempo real al hacer blur del campo (`onBlur`), igual que en los mejores formularios de onboarding.
4. En el builder (`CrmForms`), no hay cambios de schema — los tipos ya existen. Solo la lógica de validación del renderer cambia.

**Archivos:** `src/components/crm/FormRenderer.tsx`.
**Complejidad:** Baja — función de validación pura + integración en el loop de validación existente.

---

## BLOQUE 7 — Features avanzadas
> Requieren infraestructura externa o lógica compleja.

### I-1 · Soporte bilingüe de contenido (ES/EN) en CRM y widgets ✅ COMPLETADO
**Estado:** Idioma seleccionable via parámetro URL `?lang=es|en`

**Implementación:**
- ✅ FormPage.tsx y BookingPage.tsx leen parámetro `?lang` de la URL
- ✅ Pasan `lang` prop a FormRenderer y CalendarRenderer
- ✅ Los renderers usan `lang` para mostrar contenido en idioma correcto
- ✅ Funciona en iframes: `?lang=es` o `?lang=en`
- ✅ Fallback a español si `lang` no está especificado

**Campos afectados por tabla:**
- `crm_services`: `name_en`, `description_en`, `benefits_en JSONB`, `recurring_label_en`
- `crm_forms`: `button_label_en`, y por cada campo: `label_en`, `placeholder_en`
- `crm_calendars`: `description_en`, `cta_label_en`

**UI en el CRM:**
- Sección colapsable **"🌐 Configuración de idiomas ▼"** en `CrmServices`, `CrmForms`, `CrmCalendarConfig`
- Muestra campos `_en` de los mismos campos que ya existen
- Colapsada por defecto — no interrumpe el flujo principal
- Badge visual si la versión EN está incompleta (para recordar al admin)

**En los widgets públicos (`/book/:id`, `/f/:id`):**
- Hook `useLangWidget` lee `?lang` → `navigator.language` → `"es"`
- Textos de UI (botones, mensajes) → `src/i18n/widgets.ts`
- Contenido de DB → campo `_en` si `lang === "en"` y no está vacío, sino campo base

**Implementación:**
  1. Migraciones SQL: añadir columnas `_en` en `crm_services`, `crm_forms`, `crm_calendars`
  2. `src/i18n/widgets.ts` — traducciones de UI para FormRenderer y BookingPage
  3. `src/hooks/useLangWidget.ts` — hook de resolución de idioma para widgets
  4. `src/components/crm/CrmServices.tsx` — sección "Configuración de idiomas" colapsable
  5. `src/components/crm/CrmForms.tsx` — ídem
  6. `src/components/crm/CrmCalendarConfig.tsx` — ídem
  7. `src/pages/FormPage.tsx` + `src/pages/BookingPage.tsx` — conectar `useLangWidget`
  8. `src/components/crm/FormRenderer.tsx` — renderizar campo `_en` según lang

**Snippet de embed para clientes:**
```html
<iframe src="https://acrosoftlabs.com/book/CALENDAR_ID?lang=en" width="100%" height="700px" frameborder="0"></iframe>
```
**Archivos:** Migración SQL, 3 componentes CRM, 2 páginas públicas, 1 componente renderer, 2 archivos nuevos (hook + i18n).
**Complejidad:** Media-Alta — toca DB, CRM editor UI y widgets públicos. Hacer en orden: DB → CRM UI → widgets.

---

### AV-1 · Google Calendar OAuth + Sync ✅ COMPLETADO
**Estado:** PRODUCCIÓN LISTA (solo pendiente Google Console para clientes reales)

**Implementado:**
- ✅ OAuth 2.0 via `google-calendar-oauth` edge function (authorization code flow)
- ✅ Selección de múltiples calendarios con radio selector en callback page
- ✅ Token storage con refresh automático (`getValidToken()` con expires_at validation)
- ✅ Sincronización create/update/delete (edge function `sync-to-google`)
- ✅ `google_event_id` guardado en `crm_appointments`
- ✅ Manejo de conflictos de horarios en aplicación
- ✅ Eliminación de attendees para evitar emails duplicados de Google
- ✅ Graceful degradation cuando Google no está conectado
- ✅ Migration SQL: `20260505_google_calendar_integration.sql`

**Archivos:** `supabase/functions/google-calendar-oauth/index.ts`, `supabase/functions/sync-to-google/index.ts`, `src/pages/GoogleCalendarCallback.tsx`, `src/components/crm/CrmCalendarConfig.tsx`, `src/hooks/useCrmData.ts`

---


### AV-4 · Detalle Completo de Cita en Calendario ✅ COMPLETADO
**Estado:** Panel lateral expandido con información completa de cita y contacto

**Implementado:**
- ✅ Panel lateral expandido (vistas día/semana) mostrando toda la información
- ✅ Panel expandido (vista mes) con mismo contenido
- ✅ Información de la Cita: fecha, hora, duración, servicio, notas, sincronización Google
- ✅ Información del Contacto: email, teléfono, empresa, tags, notas
- ✅ Campos opcionales se muestran solo si tienen valor
- ✅ Botones de acciones: Editar cita, Cancelar cita
- ✅ Type safety completo, sin errores TypeScript
- ✅ Integración con BD sin cambios de schema

**Archivos:** `src/components/crm/CrmCalendar.tsx` (modificado)

---

### AV-5 · Configuración Producción - Google Console
**Prioridad:** ALTA (bloquea lanzamiento a clientes reales)
**Complejidad:** Alta (proceso externo de Google)
**Estimación:** 2-4 semanas (depende de Google review)
**Dependencias:** AV-1 completado.

**Descripción:**
Preparar el proyecto de Google Cloud para producción con clientes reales.

**Tareas:**

**1. Google Cloud Console Setup (Ya completado básicamente)**
- ✅ Proyecto de Google Cloud creado
- ✅ OAuth 2.0 credentials configuradas
- ⏳ Verificar scopes actuales vs requeridos

**2. OAuth Consent Screen (PENDIENTE - CRÍTICO)**
- [ ] Cambiar de "testing" a "production"
- [ ] Completar Privacy Policy URL (debe ser accesible)
- [ ] Completar Terms of Service URL (debe ser accesible)
- [ ] Agregar información de contacto de soporte
- [ ] Subir logo de marca
- [ ] Definir "User Type" como "External"
- [ ] Listar scopes requeridos de forma clara

**3. Scopes Auditados (VERIFICAR)**
- Scope actual: `https://www.googleapis.com/auth/calendar`
- ✅ Permite leer calendarios, crear/editar/eliminar eventos
- ⏳ Considerar limitar a solo "calendar.events" si es posible (menos permisivo)

**4. Google Review Process**
- [ ] Enviar para review
- [ ] Esperar 1-2 semanas (típicamente)
- [ ] Responder preguntas de Google (si las hay)
- [ ] Recibir aprobación

**5. Test Users (mientras está en review)**
- [ ] Mantener lista de test users en Google Console
- [ ] Permitir que clientes de prueba usen feature durante review

**6. Documentación para Clientes**
- [ ] Crear guía: "Cómo conectar tu Google Calendar"
- [ ] Explicar qué permisos se solicitan y por qué
- [ ] Guía de troubleshooting (token expirado, desconexión, etc.)

**7. Monitoreo Post-Lanzamiento**
- [ ] Logs del uso de Google Calendar API
- [ ] Alertas de errores de sincronización
- [ ] Dashboard de feature usage

**Archivos a documentar:**
- `docs/GOOGLE_CALENDAR_SETUP.md` (guía para clientes)
- `docs/GOOGLE_CLOUD_PRODUCTION.md` (documentación interna)

---

### AV-6 · Notificaciones Personalizables con Subject y Contenido ✅ COMPLETADO
**Prioridad:** ALTA
**Complejidad:** Media
**Estimación:** 8-10 horas

**Descripción:**
Cambiar nomenclatura de "Recordatorios" a "Notificaciones" y permitir que cada notificación tenga Subject y Contenido personalizado con variables dinámicas.

**Cambios principales:**

**1. Cambio de Terminología**
- Reemplazar "Recordatorio" → "Notificación" en toda la UI
- Archivos afectados: componentes CRM, modales, etiquetas

**2. Editor de Notificación Expandido**
- Expandir `ReminderRulesEditor` para incluir:
  - Campo **Subject** (solo para canal email)
  - Campo **Contenido** (email + WhatsApp)
  - Editor de texto simple (no HTML)
  - Botón "Insertar variable" con panel de variables disponibles

**3. Variables Dinámicas**
- Inserción de variables en formato: `{{variable.subvariable}}`
- Variables disponibles:
  - `{{contact.name}}`, `{{contact.email}}`, `{{contact.phone}}`
  - `{{appointment.date}}`, `{{appointment.time}}`, `{{appointment.service}}`
  - `{{calendar.name}}`
  - `{{staff.name}}`
- Sistema de inserción visual: usuario hace clic en variable y se inserta en campo activo

**4. Templates (Opcional)**
- Dropdown "Usar template" en el modal de edición
- Templates predefinidos para casos comunes (confirmación, recordatorio 24h, etc.)
- Usuario puede seleccionar template y editarlo luego
- **Nota:** Feature secundaria, implementar después de funcionalidad base

**5. Alcance**
- Aplicar a: Notificaciones de Calendarios, Formularios, Personalizadas (tipo "personal")
- Subject solo en Email, Contenido en Email + WhatsApp

**6. Persistencia**
- Guardar Subject y Contenido en DB para cada notificación (schema TBD)
- Respetar datos existentes de notificaciones sin Subject/Contenido

**Archivos principales:**
- `src/components/shared/ReminderRulesEditor.tsx` (expandir)
- `src/components/crm/CrmReminders.tsx` (cambio terminología)
- `src/components/shared/CreateReminderModal.tsx` (cambio terminología)
- Migraciones SQL para agregar campos subject/content si no existen

---

## BLOQUE 7 — Mejoras visuales del Calendario Admin

### UI-1 · Bloques de tiempo con precisión de minuto en la vista admin ✅ COMPLETADO
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

### UI-3 · CalendarRenderer — fechas circulares con estados visuales claros ✅ COMPLETADO
**Implementado:**
- Celdas `w-9 h-9 rounded-full` centradas con `justify-items-center` (ya estaban)
- **Disponible:** `backgroundColor: ${primaryColor}26` (~15% opacidad) + `text-gray-800` + `hover:opacity-80`
- **Seleccionado:** `backgroundColor: primaryColor` sólido + `text-white font-bold shadow-sm`
- **Hoy (disponible):** ring `boxShadow: inset 0 0 0 1.5px ${primaryColor}` + `color: primaryColor` + `font-bold`
- **No disponible / pasado:** sin fondo, `text-gray-200 cursor-not-allowed`
**Archivos:** `src/components/crm/CalendarRenderer.tsx`

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

### DT-1 · Tipos TypeScript — eliminar duplicados ✅ COMPLETADO
- `ServiceConfig` local en `CrmServices.tsx` → reemplazado por `CrmService` de `supabase.ts`
- `CrmLog` local en `useCrmData.ts` → movido a `supabase.ts`, import actualizado en `CrmSettings.tsx`
- `SupportNotificationRecipient` local en `useCrmData.ts` → movido a `supabase.ts`
- TypeScript sin errores confirmado

### DT-2 · Admin.tsx (legacy) ✅ COMPLETADO
- Era un login placeholder sin autenticación real, no registrado en App.tsx ni importado en ningún componente. Eliminado.

### DT-3 · Var.tsx (legacy) ✅ COMPLETADO
- Solo era importado por `Dashboard.tsx`, que tampoco estaba en el router. Eliminados ambos: `src/components/Var.tsx` y `src/pages/Dashboard.tsx`.

### DT-4 · Actualizar documento maestro ✅ COMPLETADO
- `acrosoft-master-v3.md` actualizado a v3.3 con schema real de Supabase, nuevas tablas, rutas correctas, reglas de calendario y WhatsApp.

### DT-5 · useUpsertCalendarConfig — exportación muerta ✅ COMPLETADO
- Eliminado de `src/hooks/useCrmData.ts`. No había ningún importador. TypeScript sin errores confirmado.

---

## Resumen de prioridades

```
URGENTE — antes del primer cliente SaaS:
  A-1   RLS para Staff
  A-2   Impersonación del Admin (verificar + completar)
  A-3   RLS crm_client_accounts fix

PENDIENTE — continuación tras F-9:
  F-10  Actualizar logo del sistema
  QW-8  Precio recurrente en tabla de precios (Landing)
  QW-9  Toggle de idioma en Landing — arreglar funcionalidad
  QW-10 Descuento aplicado en registro manual de ventas
  L-29  Formulario básico por usuario — crear solo una vez

MEJORAS VISUALES (pendientes):
  UI-1  Bloques sub-hora con overlay preciso en vista admin del calendario
  UI-3  CalendarRenderer — fechas circulares con estados visuales claros

LARGO PLAZO:

LARGO PLAZO:
  SP-1  Sistema de Soporte — DB + Storage
  SP-2  Vista Cliente/Staff (envío de tickets y sugerencias) ✅
  SP-3  Vista Admin (inbox, responder, estados) ✅
  SP-4  Emails de notificación (Resend edge function) ✅
  SP-5  Configuración de staff notificados ✅
  SP-6  Badge de no leídos en sidebar ✅
  SP-7  Revisión end-to-end de recordatorios (send-reminders) ✅
  F-4   /onboarding → FormRenderer
  AV-1  Google Calendar sync
  AV-3  Google Calendar bidireccional
  DT-1/2/3  Limpieza de código

CON CLIENTES REALES:
  AV-2  WhatsApp Notificaciones completo
```

---

## BLOQUE 9 — Features para cuando tengamos clientes reales

> Estas features están diseñadas y documentadas pero **no se desarrollarán hasta tener el primer cliente SaaS activo**. El plan técnico está completo y listo para implementar.

---

### AV-2 · WhatsApp Notificaciones — Baileys Self-Hosted
**Estado:** UI "Próximamente" activa. Implementación pendiente.
**Estimación:** 1–2 semanas
**Prerequisito:** Deployar `baileys-service` en Railway + agregar secrets en Supabase.

**Descripción:**
Agente WhatsApp propio basado en **Baileys** (Node.js, open source, no Meta API, no Twilio). Cada cliente SaaS conecta su número escaneando un QR desde CRM → Configuración → WhatsApp. Las sesiones persisten en Supabase. Multi-tenant desde el diseño. Fase 1: solo admin activo, otros clientes ven "Próximamente".

**Arquitectura:**
```
Frontend CRM
  └─ → Edge Function: whatsapp-session (valida JWT Supabase)
        └─ → baileys-service en Railway (autenticado con BAILEYS_API_KEY)
                └─ ↔ WhatsApp Web (WebSocket Baileys)
                └─ → escribe status / QR / phone_number directamente a Supabase
                      (usa service_role_key, no pasa por edge function)
Frontend pollea tabla `whatsapp_sessions` (o Supabase Realtime)
```

**Tabla `whatsapp_sessions`:**
```sql
user_id        uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE
instance_name  text NOT NULL              -- = user_id, único por tenant
status         text DEFAULT 'disconnected' -- disconnected | qr_pending | connected
phone_number   text
qr_code        text                       -- base64 PNG, short-lived, Baileys lo escribe
auth_state     jsonb                      -- estado serializado de Baileys (sesión persistente)
updated_at     timestamptz
UNIQUE(user_id)
```

**Estructura `baileys-service/` (Node.js/Express + TypeScript, deploy en Railway):**
```
baileys-service/
  src/
    index.ts          ← Express server, health check en GET /
    sessions.ts       ← Map<userId, WASocket> + reconexión automática al arrancar
    auth-state.ts     ← Adapter: useMultiFileAuthState equivalente que lee/escribe Supabase jsonb
    routes/
      session.ts      ← POST /session/:userId/start   DELETE /session/:userId
      message.ts      ← POST /message/send  { userId, phone, text }
  package.json
  tsconfig.json
  railway.toml
```

**Edge Function `whatsapp-session` — 4 acciones (POST body `{ action }`):**
| Acción       | Descripción                                                                 |
|--------------|-----------------------------------------------------------------------------|
| `start`      | Llama baileys-service `POST /session/:userId/start`; upsert status=qr_pending |
| `qr`         | Lee `qr_code` de `whatsapp_sessions` (Baileys lo escribe solo)              |
| `status`     | Lee `status` + `phone_number` de `whatsapp_sessions`                        |
| `disconnect` | `DELETE /session/:userId` en baileys-service + update status=disconnected   |

**Flujo de conexión UX:**
1. Admin: CRM → Configuración → WhatsApp → "Conectar"
2. Edge function `whatsapp-session` acción `start` → baileys-service genera QR → escribe a Supabase
3. Frontend pollea acción `qr` cada 3s → muestra imagen QR base64
4. Admin escanea con WhatsApp → "Dispositivos vinculados"
5. Baileys detecta conexión exitosa → actualiza `status=connected` + `phone_number` en Supabase
6. Frontend pollea acción `status` → detecta `connected` → muestra badge verde con número

**Flujo de envío:**
- `send-reminders` detecta `type: "whatsapp"` → llama edge function `whatsapp-session` acción `send`
  (o directamente al edge function de envío: body `{ userId, phone, text }`)
- Edge function → baileys-service `POST /message/send`
- Número normalizado sin `+` (solo dígitos, formato internacional)

**Variables de entorno:**
- Railway (`baileys-service`): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BAILEYS_API_KEY`, `PORT=3000`
- Supabase secrets: `BAILEYS_SERVICE_URL` (URL pública Railway), `BAILEYS_API_KEY`

**Archivos a crear/modificar:**
- `baileys-service/` — nuevo servicio Node.js completo (ver estructura arriba)
- `supabase/migrations/YYYYMMDD_whatsapp_sessions.sql` — tabla `whatsapp_sessions` con RLS
- `supabase/functions/whatsapp-session/index.ts` — edge function con 4 acciones
- `supabase/functions/send-reminders/index.ts` — reemplazar `throw Error` WhatsApp con llamada real
- `src/components/crm/CrmSettings.tsx` — reemplazar `WhatsAppTab` "Próximamente" con UI QR real
- `src/lib/supabase.ts` — agregar tipo `WhatsappSession`

**Multi-tenant:** Un solo `baileys-service` en Railway atiende a todos los tenants. Cada tenant tiene su `WASocket` en `Map<userId, WASocket>`. Al arrancar el servicio, reconecta automáticamente todos los `user_id` con `status=connected` en Supabase.

**LLM-ready:** El handler de mensajes entrantes en `sessions.ts` queda vacío pero estructurado para conectar un agente LLM en la siguiente iteración (respuestas automáticas, calificación de leads, etc.).

**Banner de advertencia en UI:**
> ⚠️ **Uso responsable de WhatsApp** — Solo para recordatorios y notificaciones importantes. El envío masivo o spam puede resultar en ban permanente del número.

---

## BLOQUE 10 — Seguridad

> Auditoría de seguridad completa antes de escalar a más clientes SaaS. Algunos puntos ya están parcialmente cubiertos; este bloque documenta el estado actual y lo que falta.

---

### SEC-1 · Revisión de Autorización — RLS por tenant ✅ COMPLETADO
**Auditoría realizada Mayo 2026. Migración `sec1_rls_audit_fixes` aplicada.**

**Problemas encontrados y corregidos:**
1. **Escalación de privilegios (CRÍTICO):** Un Staff podía actualizar sus propias columnas `perm_*` via UPDATE policy. Corregido con trigger `crm_staff_perm_guard` BEFORE UPDATE que lanza EXCEPTION si el staff intenta cambiar sus permisos.
2. **`crm_staff_has_perm` incompleta:** La función no incluía `perm_recordatorios` en su CASE, haciendo que los permisos de recordatorios de staff siempre retornaran `false`. Corregido.
3. **3 policies muertas con typos:** `'perm_calendario'` (sin 's') y `'write'` (acción inválida). Eliminadas: `"Staff insert appointments"`, `"Staff insert blocked slots"`, `"Staff insert contact notes"`.
4. **Policy SELECT duplicada:** `"Form owner reads submissions"` era idéntica a `"Owners can read their form submissions"`. Eliminada.
5. **WITH CHECK implícito:** 3 policies ALL (`crm_contact_notes`, `crm_pipelines`, `crm_tasks`) tenían `with_check = null`. Recreadas con `WITH CHECK` explícito.

**Estado post-auditoría:** Todas las tablas tienen RLS activo. Ninguna tiene `USING (true)` sin restricción de `user_id`. El acceso cruzado entre tenants está bloqueado a nivel de DB.

---

### SEC-2 · Validación y sanitización de inputs ✅ COMPLETADO
**Problema a resolver:** Inputs sin validar pueden introducir datos malformados, XSS, o inyección de código en campos de texto libre (notas, mensajes, formularios públicos).
**Estado actual:** FormRenderer valida campos requeridos en frontend. Los endpoints públicos (`crm-form-public`, `crm-calendar-book`) no tienen sanitización robusta del lado del servidor.
**Acción:**
- En Edge Functions públicas: validar tipos, longitudes máximas y formatos (email, teléfono) antes de hacer INSERT
- Sanitizar campos de texto libre: strip HTML/scripts antes de guardar
- En frontend: nunca usar `dangerouslySetInnerHTML` con datos del usuario
- Revisar campos `custom_fields`, `notes`, `message` en reminders

**Implementado:**
- Creado `supabase/functions/_shared/validate.ts` con `sanitizeText`, `isValidUUID`, `isValidEmail`, `isValidPhone`, `isValidDate`, `isValidHour`, `isValidMinute`
- `crm-form-public` v26: valida `form_id` UUID, sanitiza nombre/email/phone, valida `selectedServiceId` UUID, HTTPS-only logos
- `crm-calendar-book` v27: valida `calendar_id` UUID, `date` formato + overflow, `hour` 0-23, `minute` 0-59, sanitiza contacto
- Mensajes de error genéricos en español (sin filtración de detalles internos)

---

### SEC-3 · Configuración de CORS Policy ✅ COMPLETADO
**Problema a resolver:** Sin CORS configurado correctamente, cualquier dominio puede hacer requests a las Edge Functions públicas.
**Estado actual:** Supabase aplica CORS por defecto pero sin restricción de origen en las edge functions propias.
**Acción:**
- Revisar headers en cada Edge Function pública (`crm-form-public`, `crm-calendar-book`)
- Añadir header `Access-Control-Allow-Origin` con los dominios permitidos (producción + localhost en dev)
- Rechazar requests OPTIONS sin origen válido
- Verificar que funciones privadas (con `Authorization: Bearer`) no tengan CORS permisivo

**Implementado:**
- Creado `supabase/functions/_shared/cors.ts` con dos helpers:
  - `PUBLIC_CORS_HEADERS` (wildcard `*`) — para widgets embebidos (`crm-form-public`, `crm-calendar-book`). Intencional: los clientes embeben formularios en sus propios dominios.
  - `getCorsHeaders(req)` — origin-reflective para funciones CRM privadas. Lee env var `ALLOWED_ORIGINS` (comma-separated). Sin configurar → wildcard (dev mode). Con configurar → restringe a dominios permitidos.
- Funciones privadas actualizadas (6): `reset-password` v5, `invite-staff-user` v8, `generate-magic-link` v10, `google-calendar-oauth` v12, `create-saas-client` v14, `send-support-email` v9
- Además corregidos error leaks en esas funciones (mensajes internos no se filtran al cliente)
- **Acción requerida:** Agregar secret `ALLOWED_ORIGINS` en Supabase Dashboard → Settings → Edge Functions:
  `https://app.acrosoft.app,http://localhost:5173`

---

### SEC-4 · Rate Limiting ✅ COMPLETADO
**Problema a resolver:** Sin rate limiting, un atacante puede hacer miles de requests a formularios públicos, endpoints de booking o login — generando spam de contactos, consumiendo límites de Resend, o haciendo fuerza bruta.

**Implementado:**
- Migración `20260507_sec4_rate_limiting.sql`: tabla `rate_limit_hits` + función `check_rate_limit()` (SECURITY DEFINER, atómica con FOR UPDATE lock, ventana deslizante por IP)
- `crm-form-public` v29: límite **10 submissions/IP/hora** → HTTP 429 + `Retry-After: 3600`
- `crm-calendar-book` v29: límite **20 bookings/IP/hora** → HTTP 429 + `Retry-After: 3600`
- IP extraída de `x-forwarded-for` (primer valor) con fallback a `x-real-ip`
- Si el check falla por error de BD → se permite el request (fail-open, no bloquea usuarios legítimos)
- Función `cleanup_rate_limit_hits()` disponible para purga manual o cron

---

### SEC-5 · Links de restablecimiento de contraseña con expiración ✅ COMPLETADO
**Problema a resolver:** Verificar que los links de invitación (Staff, clientes SaaS) y reset de contraseña expiran correctamente y no pueden reutilizarse.

**Implementado:**
- Migración `20260507_sec5_activate_staff_invitation.sql`: función `activate_staff_invitation()` SECURITY DEFINER
  - Lee `staff_id` + `owner_user_id` del JWT metadata del usuario invitado
  - Vincula `auth.uid()` al row de `crm_staff` (que antes tenía solo el email)
  - Solo activa si `status = 'invited'` — previene re-activación doble
  - Falla con excepción si el staff_id no coincide con el owner (previene escalación)
  - `GRANT EXECUTE ... TO authenticated` — solo usuarios autenticados pueden llamarla
- `CrmSetup.tsx`: corregido error leak (línea 74) — `err.message` → mensaje genérico + `console.error`
- Activación SaaS client ya tenía guarda implícita: `.eq("status", "pending")` previene re-activación
- Supabase Auth maneja expiración nativa de invite tokens (one-time-use por diseño)
- **Acción requerida (manual):** Supabase Dashboard → Auth → Settings → OTP expiry: configurar en **3600** (1 hora) o menos

---

### SEC-6 · Error Handling — fallbacks limpios para el usuario ✅ COMPLETADO
**Problema a resolver:** Los errores técnicos (stack traces, mensajes de Supabase, IDs internos) no deben llegar al usuario final. Exponen información del sistema y generan mala UX.

**Implementado:**
- `send-reminders` v13: `qErr.message` → `"Error al cargar la cola de recordatorios"` + `console.error`
- `sync-to-google` v9: 4 lugares con `data.error?.message` de Google API → mensajes genéricos en español
- `generate-master-doc` v13: Errores de Anthropic API y Storage → mensajes amigables; detalles técnicos solo en `console.error`
- `cron-queue-reminders` v15: `(err as Error).message` en catch → `"Error interno al procesar la cola"`
- `src/components/ErrorBoundary.tsx` (nuevo): captura errores de renderizado de React, muestra pantalla amigable "Algo salió mal" con botón de recarga
- `src/main.tsx`: App envuelta en `<ErrorBoundary>` en el nivel raíz

---

### SEC-7 · Índices de base de datos en los campos más consultados ✅ COMPLETADO
**Problema a resolver:** Sin índices, las queries sobre tablas grandes hacen full table scan — lento y costoso a medida que crece la base de datos.

**Implementado:** 2 migraciones — 17 índices en total cubriendo las 25 tablas públicas.

`20260507_sec7_db_indexes.sql` (9 índices):
- `idx_crm_contacts_user_created` — (user_id, created_at DESC)
- `idx_crm_appointments_user_date_status` — (user_id, date, status)
- `idx_crm_appointments_calendar_date` — (calendar_id, date)
- `idx_crm_reminders_user_status_scheduled` — (user_id, status, scheduled_at)
- `idx_crm_reminder_queue_status_created` — (status, created_at)
- `idx_crm_sales_user_created` — (user_id, created_at DESC)
- `idx_crm_contact_pipeline_memberships_pipeline_stage` — (pipeline_id, stage)
- `idx_crm_tasks_pipeline_stage_position` — (pipeline_id, stage, position)
- `idx_support_tickets_user_status` — (user_id, status)

`20260507_sec7_db_indexes_supplement.sql` (8 índices adicionales):
- `idx_crm_blocked_slots_calendar_date` — (calendar_id, date) ← hot path en booking
- `idx_crm_client_accounts_client_user_id` — (client_user_id) ← activación SaaS
- `idx_crm_contact_notes_contact_id` — (contact_id)
- `idx_crm_form_submissions_form_id` — (form_id, created_at DESC)
- `idx_crm_pipelines_user_id` — (user_id)
- `idx_crm_services_user_id_active` — (user_id, active)
- `idx_crm_staff_staff_user_id` — (staff_user_id) ← auth flow
- `idx_support_messages_ticket_id` — (ticket_id, created_at)

---

### SEC-8 · Validación de redirects para evitar phishing ✅ COMPLETADO
**Problema a resolver:** Si la app acepta una URL de redirect arbitraria como parámetro, un atacante puede redirigir usuarios a sitios maliciosos después del login.

**Implementado:**
- `FormRenderer.tsx`: antes de `window.location.href = url`, se valida con `new URL(url)` que el protocolo sea `https:`. URLs con `javascript:`, `data:` u otro esquema son silenciosamente ignoradas (no hay redirect).
- `generate-magic-link` (nueva versión): `redirect_to` del body se valida — solo se acepta si es una ruta relativa (`/...`) o tiene el mismo origen que `SITE_URL`. Cualquier URL externa o inválida cae al default `${SITE_URL}/crm`.
- Las otras funciones (`invite-staff-user`, `create-saas-client`, `reset-password`, `crm-form-public`) usan `redirectTo` hardcodeado desde env var `SITE_URL` — sin riesgo de manipulación.

---

### SEC-9 · RLS en Supabase Storage ✅ COMPLETADO
**Problema a resolver:** Los archivos subidos en Supabase Storage podrían ser accesibles entre tenants o contener tipos de archivo peligrosos.

**Auditoría realizada — 3 buckets:**

| Bucket | Público | RLS | Signed URLs | Estado |
|---|---|---|---|---|
| `form-uploads` | Sí | INSERT anon (by design, formularios anónimos) | N/A (público) | ✅ |
| `master-docs` | No | SELECT: path[1]=auth.uid() | 60s en CrmContacts | ✅ |
| `support-attachments` | No | SELECT/INSERT/DELETE: path[1]=auth.uid() o admin | 3600s | ✅ |

**Fixes aplicados** (`20260507_sec9_storage_rls.sql`):
- `form-uploads`: eliminado `image/svg+xml` — los SVGs pueden embeber JavaScript (XSS vector cuando se sirven directamente)
- `master-docs`: añadido `allowed_mime_types = ['text/markdown', 'text/plain']` — estaba sin restricción

**Ya correcto antes de esta iteración:**
- `master-docs` privado con RLS por `user_id` en el path
- Downloads de master docs usan `createSignedUrl(path, 60)` — URL expira en 60 segundos
- `support-attachments` privado con RLS por `user_id` + `is_acrosoft_admin()`
- Paths en `form-uploads` incluyen UUID de submission (no adivinables)

---

### SEC-10 · Logging en backend, no en frontend ✅ COMPLETADO
**Problema a resolver:** La tabla `crm_logs` se escribe desde el frontend (hooks de TanStack Query). Esto permite que cualquier usuario autenticado inserte logs falsos o manipule el historial de actividad.
**Implementación:**
- Función SECURITY DEFINER `_log_crm_change()` que escribe en `crm_logs` automáticamente
- Triggers AFTER INSERT/UPDATE/DELETE en 13 tablas: `crm_contacts`, `crm_appointments`, `crm_blocked_slots`, `crm_pipeline_deals`, `crm_forms`, `crm_services`, `crm_sales`, `crm_calendar_config`, `crm_business_profile`, `crm_pipelines`, `crm_tasks`, `crm_staff` + AFTER INSERT en `crm_reminders`
- Eliminada policy "Users can insert own logs" de `crm_logs`
- Eliminada función `logAction()` y sus 35 call sites de `src/hooks/useCrmData.ts`
- Migración: `supabase/migrations/20260507_sec10_backend_logging.sql`

---

### SEC-11 · Validación de Webhooks ✅ COMPLETADO
**Problema a resolver:** Los endpoints que reciben eventos externos (Google Calendar OAuth callback, futuras integraciones) deben verificar la autenticidad del request. Sin verificación, cualquiera puede simular un evento exitoso.
**Implementación:**
- `CrmCalendarConfig.tsx`: genera `crypto.randomUUID()` como CSRF token, lo guarda en `localStorage("google_oauth_csrf")`, y lo codifica en `state` como `${csrf}:${calendarUid}`
- `GoogleCalendarCallback.tsx`: parsea `state`, compara el CSRF con `localStorage`, rechaza si no coincide, y lo borra tras validar
- `google-calendar-oauth` Edge Function (v13): añade verificación de auth (`getUser`), verifica que el `calendar_id` pertenezca al usuario autenticado, valida `redirect_uri` contra SITE_URL origin, y sanitiza mensajes de error de Google
- Futuros webhooks (Stripe, Evolution API): deberán verificar firma HMAC antes de procesar — patrón establecido

---

### SEC-12 · Validación de roles en el servidor ✅ COMPLETADO
**Problema a resolver:** La lógica de permisos de Staff (qué puede ver/editar) se aplica principalmente en el frontend. Un Staff con acceso técnico podría hacer requests directos a Supabase saltándose la UI.
**Implementación:**
- Reemplazadas 11 políticas "FOR ALL" genéricas con 42 políticas granulares por operación (SELECT/INSERT/UPDATE/DELETE) que verifican el flag específico: `(perm_X->>'action')::boolean = true`
- Mapping de permisos: `crm_contacts→perm_contactos`, `crm_sales→perm_ventas`, `crm_appointments/blocked_slots/calendar_config/reminders/reminder_config→perm_calendarios`, `crm_forms/form_submissions→perm_formularios`, `crm_services→perm_servicios`, `crm_pipelines/tasks→perm_pipeline`, `crm_business_profile→perm_mi_negocio_datos`
- Fail-safe por diseño: si `perm_X` es NULL o la clave no existe, `->>'action'` devuelve NULL → acceso denegado
- Operaciones sensibles (invite-staff-user, generate-magic-link): ya tenían verificación auth + ownership en Edge Functions — confirmado correcto
- Migración: `supabase/migrations/20260509_sec12_staff_granular_rls.sql`

---

### SEC-13 · Auditoría de dependencias npm ✅ COMPLETADO
**Resultado:** `npm audit` encontró 19 vulnerabilidades (9 high, 7 moderate, 3 low).
**`npm audit fix` resolvió 14 de 19** (22 paquetes actualizados). Build verificado exitoso.
**Vulnerabilidades corregidas (high):** react-router-dom XSS, rollup path traversal, lodash prototype pollution, flatted DoS, glob command injection, minimatch ReDoS, picomatch ReDoS.
**Restantes (5 — no corregidas, breaking changes):**
- `esbuild/vite` (moderate): requiere Vite 8 major — solo afecta dev server, sin impacto en producción
- `@tootallnate/once/jsdom` (3 low): requiere jsdom 29 breaking — devDependency de testing solamente
**Revisión trimestral recomendada:** ejecutar `npm audit` cada 3 meses.

---

### SEC-14 · API Keys — nunca expuestas en el frontend ✅ COMPLETADO
**Resultado:** Auditoría completa — ninguna clave secreta encontrada en frontend ni en bundle.
**Variables VITE_* confirmadas (3 total):**
- `VITE_SUPABASE_URL` ✅ identificador público
- `VITE_SUPABASE_ANON_KEY` ✅ clave anon pública por diseño (role: anon en JWT)
- `VITE_GOOGLE_CLIENT_ID` ✅ los Client IDs de OAuth son públicos; el Client Secret está en Edge Function secrets
**Bundle escaneado:** sin presencia de `ANTHROPIC_`, `RESEND_`, `EVOLUTION_`, `GOOGLE_CLIENT_SECRET`, `SERVICE_ROLE`, ni patrones `sk-ant-`, `re_`, `sk_`. Solo el payload JWT de la anon key (esperado).
**Fix crítico aplicado:** `.env` estaba siendo trackeado por git (valores actuales son públicos, pero riesgo futuro). Se ejecutó `git rm --cached .env`, se agregó `.env` y `.env.production` a `.gitignore`, y se creó `.env.example` documentando qué va en frontend vs Edge Function secrets.
**Regla permanente documentada:** cualquier key que no sea la anon key de Supabase va en Edge Function secrets, nunca en `VITE_*`.

---

## BLOQUE 11 — Sistema de Vendedores

> Multi-nivel: el Superadmin puede registrar Vendedores que operan su propio CRM aislado (calendarios, contactos, pipelines, formularios) pero bajo el paraguas del negocio del Superadmin. El Superadmin ve reportes consolidados de ventas y comisiones.

---

### AV-3 · Fase 1 — Base: Roles, DB y RLS ✅ COMPLETADO

**Objetivo:** Crear la infraestructura de datos que soporta el rol `vendedor` con aislamiento total entre vendedores y visibilidad del superadmin sobre todos.

**Tablas nuevas:**
- `crm_vendors` — perfil del vendedor: `user_id`, `owner_user_id` (superadmin), `name`, `email`, `whatsapp`, `commission_pct`, `slug`, `status`
- `crm_vendor_links` — links del superadmin para sus vendedores: `user_id` (owner), `payment_link`, `onboarding_link`
- `crm_maintenance_payments` — pagos mensuales de mantenimiento: `vendor_id`, `month` (YYYY-MM), `amount`, `commission_amount`, `is_paid`, `proof_url`, `paid_at`

**Columnas nuevas en tablas existentes:**
- `crm_sales`: `vendor_id uuid REFERENCES crm_vendors`, `is_paid bool DEFAULT false`, `payment_proof_url text`, `paid_at timestamptz`
- `crm_contacts`: `vendor_id uuid REFERENCES crm_vendors` (para que el superadmin identifique el origen)

**RLS extendida:**
- `crm_contacts`: superadmin puede SELECT donde `user_id IN (SELECT user_id FROM crm_vendors WHERE owner_user_id = auth.uid())`
- `crm_sales`: misma lógica
- `crm_vendors`: owner puede ver/gestionar sus propios vendedores

**Invitación:** mismo flujo de `invite-staff-user` pero con rol `vendedor`. Al crear vendedor se generan automáticamente: 1 calendario, 1 formulario básico, 1 pipeline "Seguimiento de Leads".

**Archivos:**
- `supabase/migrations/YYYYMMDD_vendors_base.sql`
- `supabase/functions/invite-staff-user/index.ts` — extender para rol vendedor
- `src/lib/permissions.ts` — agregar rol `vendedor` con navItems restringidos
- `src/pages/Crm.tsx` — filtrar sidebar según rol vendedor

---

### AV-4 · Fase 2 — Landing del Vendedor + Tracking de Onboarding ✅ COMPLETADO

**Objetivo:** Cada vendedor tiene una landing page en `/{vendor_slug}` que es réplica exacta del home del superadmin. El formulario de onboarding captura `?ref={vendor_slug}` y registra la venta al vendedor correspondiente.

**Landing del vendedor:**
- Ruta: `/{vendor_slug}` — renderiza el mismo componente `Index.tsx` con datos públicos del negocio
- Siempre replica al home original (servicios, precios, textos, diseño del superadmin)
- Si el superadmin cambia algo en su landing, cambia para todos los vendedores automáticamente

**Tracking de onboarding:**
- El superadmin configura UN solo link de onboarding en `crm_vendor_links`
- Los vendedores reciben su URL personalizada: `{onboarding_link}?ref={vendor_slug}`
- El `FormRenderer` al hacer submit captura `ref` del query param y lo guarda en `crm_form_submissions.vendor_slug`
- Trigger en Supabase: cuando se inserta una submission con `vendor_slug`, busca el vendedor, crea/actualiza contacto en el CRM del vendedor, registra venta con el monto del servicio elegido

**Detección de servicio y monto:**
- El formulario de onboarding tiene un campo de tipo `select` con los servicios del negocio
- El precio del servicio seleccionado se toma de `crm_services.price`
- La venta se registra con ese monto + `vendor_id`

**Archivos:**
- `src/App.tsx` — nueva ruta `/:vendorSlug`
- `src/pages/VendorLanding.tsx` — wrapper que carga datos del negocio del owner y pasa `vendorSlug`
- `src/components/crm/FormRenderer.tsx` — captura `?ref=` y lo incluye en el submit
- `supabase/migrations/YYYYMMDD_form_submissions_vendor.sql` — columna `vendor_slug` en `crm_form_submissions`
- `supabase/functions/process-onboarding/index.ts` — Edge Function que procesa submissions con ref

---

### AV-5 · Fase 3 — Ventas, Comisiones y Pagos ✅ COMPLETADO

**Objetivo:** El superadmin ve ventas consolidadas de todos sus vendedores con cálculo de comisiones. Puede marcar pagos iniciales y de mantenimiento. Puede subir comprobantes.

**Vista Ventas del superadmin (nueva lógica):**
- Filtros: por vendedor, por tipo (inicial / mantenimiento), por mes, por estado de pago
- Métricas: ingreso total, ganancia del superadmin (total − comisiones), comisión por vendedor
- Tabla: cada venta muestra vendedor, cliente, servicio, monto, comisión, estado de pago
- Botón "Marcar como pagado" + upload de comprobante por fila
- Sección separada "Mantenimientos del mes": agrupado por vendedor, con total de mantenimientos activos y monto de comisión a pagar

**Vista Ventas del vendedor:**
- Solo sus propias ventas
- Resumen: total ventas, ingresos generados, comisiones ganadas
- Lista de sus clientes con el servicio contratado
- Historial de comprobantes de pago que subió el superadmin (solo lectura)

**Archivos:**
- `src/components/crm/CrmSales.tsx` — bifurcación: vista superadmin vs vista vendedor
- `src/hooks/useCrmData.ts` — nuevos hooks: `useVendorSales`, `useVendorCommissions`, `useMaintenancePayments`
- `supabase/functions/upload-payment-proof/index.ts` — subida a Storage + update de `crm_sales`
- `supabase/migrations/YYYYMMDD_sales_vendor_fields.sql`

---

### AV-6 · Fase 4 — Links, Notificaciones y Settings del Vendedor ✅ COMPLETADO

**Objetivo:** El vendedor tiene acceso a los links del superadmin y puede configurar notificaciones de email.

**Tab "Links" en sidebar del vendedor:**
- Muestra los links configurados por el superadmin en `crm_vendor_links`
- Título personalizable por el superadmin
- Links: Pago y Onboarding (con su `?ref=` ya incluido automáticamente)

**Tab "Links Vendedores" en Settings del superadmin:**
- Formulario para guardar título, link de pago y link de onboarding
- Vista previa de cómo verá cada vendedor sus links

**Notificaciones del vendedor:**
- Mismo componente `ReminderRulesEditor` pero ligado a los calendarios del vendedor
- Solo canal Email (igual que el resto del CRM actualmente)

**Settings del vendedor (restringidos):**
- Puede ver/editar: nombre, WhatsApp (no email)
- Puede elegir qué calendario usar en su landing page
- Puede ver historial de recordatorios
- No puede: añadir staff, ver logs, modificar notificaciones de soporte, ver Videos/Cursos, ver Soporte

**Archivos:**
- `src/components/crm/CrmSettings.tsx` — sección condicional para vendedores
- `src/components/crm/CrmVendorLinks.tsx` — nuevo componente de tab Links
- `src/hooks/useCrmData.ts` — `useVendorLinks`
- `supabase/migrations/YYYYMMDD_vendor_links.sql`

---

### Resumen del Sistema de Vendedores

| Feature | Fase | Estado |
|---|---|---|
| DB base + RLS multi-vendor | AV-3 | ✅ Completo |
| Invitación + creación automática de recursos | AV-3 | ✅ Completo |
| Restricciones UI por rol vendedor | AV-3 | ✅ Completo |
| Landing del vendedor + tracking `?ref=` | AV-4 | ✅ Completo |
| Auto-creación de contacto/venta al submit | AV-4 | ✅ Completo |
| Vista ventas superadmin con comisiones | AV-5 | ✅ Completo |
| Marcar pagado + subir comprobante | AV-5 | ✅ Completo |
| Vista ventas del vendedor | AV-5 | ✅ Completo |
| Tab Links del vendedor | AV-6 | ✅ Completo |
| Settings restringidos del vendedor | AV-6 | ✅ Completo |

---

## BLOQUE 12 — Agente IA de WhatsApp (Meta Cloud API + Claude)

> Despliegue inicial: solo Superadmin. Multi-tenant preparado desde el inicio.
> Otros usuarios SaaS verán la sección como "Próximamente".

---

### Arquitectura general

```
WhatsApp del cliente final
  → Meta Cloud API (webhook HTTPS)
      → Edge Function: whatsapp-webhook (recibe, verifica firma, responde 200 inmediato)
          → Dedup por wa_message_id
          → Busca tenant por phone_number_id → crm_ai_agent_config
          → Guarda mensaje en crm_wa_messages
          → Llama Edge Function: ai-agent (async, no bloquea webhook)
              → Carga historial reciente (últimos 20 mensajes)
              → Construye system prompt con variables del CRM del tenant
              → Llama Claude API con tools habilitadas según config
              → Guarda respuesta en crm_wa_messages
              → POST a Graph API → WhatsApp del cliente
```

Un solo webhook URL recibe mensajes de TODOS los tenants.
El tenant se identifica por el `phone_number_id` dentro del payload de Meta.

---

### AI-12 · Fase 1 — Base de datos y configuración ✅ COMPLETADO

**Tablas nuevas:**

```sql
-- Configuración del agente por tenant
CREATE TABLE crm_ai_agent_config (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  -- Conexión Meta
  phone_number_id         text,
  access_token            text,          -- guardar encriptado vía pgp_sym_encrypt
  waba_id                 text,
  app_secret              text,          -- encriptado
  webhook_verify_token    text NOT NULL DEFAULT gen_random_uuid()::text,
  -- Agente
  agent_name              text NOT NULL DEFAULT 'Asistente',
  system_prompt           text,
  model                   text NOT NULL DEFAULT 'claude-haiku-4-5-20251001',
  -- Capacidades (toggles)
  can_book_appointments   boolean NOT NULL DEFAULT false,
  can_create_contacts     boolean NOT NULL DEFAULT true,
  can_answer_services     boolean NOT NULL DEFAULT true,
  can_transfer_human      boolean NOT NULL DEFAULT false,
  -- Horario
  active_days             int[] NOT NULL DEFAULT '{1,2,3,4,5}',
  active_from             time NOT NULL DEFAULT '08:00',
  active_until            time NOT NULL DEFAULT '18:00',
  timezone                text NOT NULL DEFAULT 'America/Mexico_City',
  off_hours_message       text,
  -- Comportamiento
  session_timeout_minutes int NOT NULL DEFAULT 30,
  language                text NOT NULL DEFAULT 'es',
  is_active               boolean NOT NULL DEFAULT false,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(phone_number_id)  -- un número por tenant
);

-- Conversaciones (una por número de teléfono por tenant)
CREATE TABLE crm_wa_conversations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  phone               text NOT NULL,   -- E.164 sin '+', ej: '5219991234567'
  contact_name        text,            -- nombre que reporta Meta
  mode                text NOT NULL DEFAULT 'AI' CHECK (mode IN ('AI', 'HUMAN')),
  last_message_at     timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, phone)
);

-- Mensajes de cada conversación
CREATE TABLE crm_wa_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES crm_wa_conversations ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('user', 'assistant', 'human')),
  content         text NOT NULL,
  wa_message_id   text,                -- ID de Meta (para dedup y correlación)
  send_error      text,                -- si Graph devolvió error al enviar
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_wa_messages_wa_id ON crm_wa_messages(wa_message_id)
  WHERE wa_message_id IS NOT NULL;
CREATE INDEX idx_wa_messages_conv ON crm_wa_messages(conversation_id, created_at);

-- Dedup de webhooks (Meta reintenta hasta 7 días)
CREATE TABLE crm_wa_webhook_dedup (
  wa_message_id  text PRIMARY KEY,
  processed_at   timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE crm_ai_agent_config   ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_wa_conversations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_wa_messages        ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner" ON crm_ai_agent_config   USING (user_id = auth.uid());
CREATE POLICY "owner" ON crm_wa_conversations  USING (user_id = auth.uid());
CREATE POLICY "owner_conv" ON crm_wa_messages
  USING (conversation_id IN (
    SELECT id FROM crm_wa_conversations WHERE user_id = auth.uid()
  ));
```

**Archivos:**
- `supabase/migrations/YYYYMMDD_ai_agent.sql`

---

### AI-13 · Fase 2 — Edge Functions ✅ COMPLETADO

#### `whatsapp-webhook` (recibe mensajes de Meta)

**Lecciones críticas del prompt de referencia aplicadas a nuestro stack:**

```
GET  /functions/v1/whatsapp-webhook
  → Verifica hub.verify_token contra crm_ai_agent_config (busca el tenant por verify_token)
  → Devuelve hub.challenge como text/plain (NO JSON — Meta lo rechaza)

POST /functions/v1/whatsapp-webhook
  → Lee body como raw text PRIMERO (antes de parsear)
  → Verifica HMAC-SHA256 con app_secret del tenant (X-Hub-Signature-256)
  → Responde 200 OK INMEDIATAMENTE (Meta timeout ~10s; el LLM puede tardar más)
  → Procesa de forma async (void + catch, sin await)
  → Dedup: si wa_message_id ya está en crm_wa_webhook_dedup → ignorar
  → Marcar procesado ANTES de procesar (no después)
  → Identificar tenant por phone_number_id del payload
  → Guardar mensaje en crm_wa_messages
  → Invocar 'ai-agent' edge function de forma async
```

**Variables de entorno en Supabase Secrets:**
```
# No hay variables globales de Meta — cada tenant guarda sus credenciales en DB
# Solo se necesita:
ANTHROPIC_API_KEY          → para llamar Claude
SUPABASE_SERVICE_ROLE_KEY  → para que la edge function escriba en DB sin RLS
```

**Archivos:**
- `supabase/functions/whatsapp-webhook/index.ts`

---

#### `ai-agent` (procesa con Claude + tools)

```
Recibe: { conversation_id, user_message, tenant_user_id }

1. Carga crm_ai_agent_config del tenant
2. Verifica horario activo (active_days, active_from/until, timezone)
   - Fuera de horario → envía off_hours_message por Graph API → termina
3. Carga historial reciente: últimos 20 mensajes de la conversación
4. Construye system prompt con variables dinámicas:
   - {{negocio.nombre}} → crm_business_profile.name
   - {{negocio.servicios}} → lista de crm_services activos
   - {{contacto.nombre}} → contact_name de la conversación
   - {{fecha.hoy}} → fecha actual en timezone del tenant
5. Llama Claude API con:
   - model: config.model (haiku por defecto)
   - system: system_prompt compilado
   - messages: historial mapeado (human → assistant para el LLM)
   - tools: solo las habilitadas en config (can_book_appointments, etc.)
6. Guarda respuesta en crm_wa_messages (role: 'assistant')
7. POST a Graph API: https://graph.facebook.com/v21.0/{phone_number_id}/messages
   - Solo texto libre (dentro de ventana 24h por diseño: respondemos a quien nos escribe)
   - Si error 131047 (fuera de ventana 24h) → guardar send_error en el mensaje
8. Actualiza crm_wa_conversations.last_message_at
```

**Tools disponibles (según toggles del tenant):**
- `book_appointment` → crea cita en crm_appointments
- `create_contact` → crea/actualiza en crm_contacts
- `get_services` → lista servicios con precios
- `transfer_to_human` → cambia mode='HUMAN' + notifica al admin

**Archivos:**
- `supabase/functions/ai-agent/index.ts`

---

### AI-14 + AI-15 · Fases 3 y 4 — CrmAgentIA (vista unificada) ✅ COMPLETADO

Vista propia en el sidebar del CRM (no tab de Settings). Flujo en 2 estados:

**Estado A — Sin configuración → Setup Wizard (3 pasos)**
```
[Paso 1: Conexión]  →  [Paso 2: Agente]  →  [Paso 3: Capacidades]
```
- Paso 1: credenciales Meta (Phone Number ID, Access Token, WABA ID, App Secret)
  + Webhook URL (auto-generada, solo lectura + botón copiar)
  + Webhook Verify Token (auto-generado + botón copiar)
  + Instrucciones guiadas colapsables
  + Botón "Verificar conexión" → llama Graph API
- Paso 2: nombre del agente, modelo (Haiku/Sonnet), prompt guiado con template base
  + chips clicables de variables disponibles: `{{negocio.nombre}}`, `{{negocio.servicios}}`, etc.
- Paso 3: toggles de capacidades + horario activo (días + horas + timezone) + mensaje fuera de horario
  + Toggle master "Activar agente" al guardar

**Estado B — Configurado → Dashboard de conversaciones**
```
┌──────────────────────────────────────────────────────────────┐
│ 🤖 [Nombre del agente]   ● Activo          [⚙ Configurar]  │
├────────────────┬─────────────────────────────────────────────┤
│ Buscar...      │  Juan Pérez (+52 999...)  [toggle AI/HUMAN] │
│ ─────────────  │  ──────────────────────────────────────────  │
│ 📱 Juan Pérez  │  [burbuja user: izq, fondo secundario]      │
│ [badge IA 🟢]  │  [burbuja assistant: der, verde esmeralda]  │
│ hace 5 min     │  [burbuja human: der, ámbar]                │
│ ─────────────  │                                              │
│ 📱 María López │  [banner rojo si error 24h]                 │
│ [badge HUMAN🟡]│  ─────────────────────────────────────────  │
│ hace 1h        │  [input deshabilitado en modo AI]           │
│                │  [input + Enviar en modo HUMAN]              │
└────────────────┴─────────────────────────────────────────────┘
```
- Ícono ⚙️ arriba a la derecha → abre panel lateral de configuración (slide-over)
- Toggle AI/HUMAN por conversación
- Burbujas coloreadas por rol: user (izq/gris), assistant (der/verde), human (der/ámbar)
- Error `wa_message_id = null` → ícono de error en burbuja
- Error 24h → banner rojo en el input
- Borrar conversación con confirmación
- Polling cada 3s automático (via hooks)

**Panel de configuración (slide-over desde ⚙️):**
- Sección: Conexión (re-verificar credenciales)
- Sección: Agente (nombre, modelo, prompt + variables)
- Sección: Capacidades (toggles)
- Sección: Horario (días, horas, timezone, mensaje off-hours)
- Toggle master is_active con color verde/rojo

**Visibilidad en sidebar:**
- Superadmin → vista completa funcional
- SaaS clients → ítem visible en sidebar pero muestra pantalla "Próximamente"
- Staff / Vendors → ítem oculto

**Archivos:**
- `src/components/crm/CrmAgentIA.tsx` — componente principal (wizard + dashboard + settings)
- `src/pages/Crm.tsx` — agregar view `"agente_ia"` al sidebar y renderView

**Funcionalidad:**
- Lista de conversaciones ordenada por `last_message_at DESC`
- Badge IA (verde) / HUMANO (ámbar) — igual que la paleta del CRM
- Toggle AI/HUMAN por conversación → `PATCH crm_wa_conversations.mode`
- En modo HUMAN: input de texto + botón Enviar → POST directo a Graph API desde el frontend via edge function `send-wa-message`
- En modo AI: input deshabilitado, el bot responde automáticamente
- Error 131047 (ventana 24h expirada): banner rojo en el panel
- Polling cada 3s a `crm_wa_messages` mientras está abierto el panel
- Botón "Borrar conversación" con confirmación → DELETE cascade

**Burbujas de mensaje:**
- `role: 'user'` → izquierda, fondo secundario
- `role: 'assistant'` → derecha, verde esmeralda (igual que el agente)
- `role: 'human'` → derecha, ámbar (el admin respondiendo manualmente)
- Si `send_error` → icono de error en la burbuja

**Archivos:**
- `src/components/crm/CrmAgentIA.tsx` — panel de conversaciones
- `src/pages/Crm.tsx` — agregar view "agente_ia" al sidebar (solo superadmin)
- `supabase/functions/send-wa-message/index.ts` — envío manual desde HUMAN mode

---

### Resumen del Bloque 12 — Agente IA WhatsApp

| Feature | Fase | Estado |
|---|---|---|
| Migración DB (config + conversaciones + mensajes + dedup) | AI-12 | ✅ Completo |
| Edge function `whatsapp-webhook` (recibe, verifica, dedup) | AI-13 | ✅ Completo |
| Edge function `ai-agent` (Claude + tools + Graph API) | AI-13 | ✅ Completo |
| Tab "Agente IA" en CrmSettings (config + status) | AI-14 | ✅ Completo |
| Panel de conversaciones con toggle AI/HUMAN | AI-15 | ✅ Completo |
| Modo HUMAN: envío manual desde dashboard | AI-15 | ✅ Completo |

**Despliegue por fase:**
- Fase 1 (AI-12 + AI-13): infraestructura invisible para el usuario
- Fase 2 (AI-14): config visible solo para superadmin
- Fase 3 (AI-15): panel de conversaciones
- Expansión multi-tenant: activar el tab para tenants Pro (cambiar condición de visibilidad)

---

### Variables de entorno necesarias en Supabase Secrets

```
ANTHROPIC_API_KEY    → para llamar Claude desde ai-agent
```

---

---

## BLOQUE 13 — Agente IA: Features Avanzados

> **Base:** El Agente IA (Bloque 12, AI-12 a AI-22) ya está funcional con Meta WhatsApp Cloud API.
> Este bloque agrega capas de automatización, comunicación multicanal y gestión de conversaciones.

---

### AI-23 · WhatsApp como Canal de Notificaciones (Recordatorios) ✅ COMPLETADO

**Contexto:** El sistema de recordatorios (`crm_reminders` + `send-reminders`) solo envía por email. Ya tiene el campo `type` con valor `whatsapp` pero lanza error. Ahora que cada tenant tiene un número Cloud API en `crm_ai_agent_config`, se puede usar ese mismo número para enviar recordatorios a contactos/equipo.

**Reglas de negocio:**
- La opción WhatsApp **solo aparece en la UI** si el tenant tiene agente conectado (`crm_ai_agent_config.phone_number_id IS NOT NULL`)
- El usuario puede elegir: email, WhatsApp, o **ambos** (checkboxes independientes, no radio)
- Cuando se eligen ambos, se envía el mismo mensaje por los dos canales
- Fuera de la ventana 24h de WhatsApp → se registra error `whatsapp_window_expired` en el reminder (no bloquea el email)

**Flujo de envío WhatsApp en `send-reminders`:**
```
1. Cargar crm_ai_agent_config para el tenant (user_id del reminder)
2. Si no tiene phone_number_id → skip WhatsApp, solo email
3. Normalizar teléfono del contacto a E.164 sin "+" (ej: "59176421171")
4. POST https://graph.facebook.com/v21.0/{phone_number_id}/messages
   { messaging_product: "whatsapp", to: phone, type: "text", text: { body: message } }
5. Si error 131047 → marcar send_error = "whatsapp_window_expired"
```

**Archivos a modificar:**
- `supabase/migrations/` → columna `channels jsonb` en `crm_reminders` (ej: `{"email":true,"whatsapp":false}`)
- `src/lib/supabase.ts` → actualizar tipo `CrmReminder` con `channels`
- `supabase/functions/send-reminders/index.ts` → reemplazar `throw Error` WhatsApp con llamada real a Graph API
- `src/components/crm/CrmReminders.tsx` → checkboxes de canal en crear/editar reminder

---

### AI-24 · Click en Teléfono de Contacto → Abrir Chat en Agente IA ❌ DESCARTADO

**Comportamiento:**
- En el detalle de un contacto, el número de teléfono tiene un ícono de WhatsApp clickeable
- Al hacer clic → navega al tab "Agente IA" con ese número abierto en modo HUMAN
- Si existe conversación previa → abre directamente ese chat
- Si NO existe → abre el panel con el número pre-cargado listo para escribir el primer mensaje

**Implementación:**
- `Crm.tsx` → estado `whatsappTarget: string | null`; al recibir `onOpenWhatsApp(phone)`, hacer `setView("agente_ia")` y pasar `initialPhone` como prop a `CrmAgentIA`
- `CrmContacts.tsx` → botón WhatsApp en ficha del contacto que llama `onOpenWhatsApp(phone)`
- `CrmAgentIA.tsx` → aceptar prop `initialPhone`; al montar, buscar conversación con ese número o preparar nueva

**Archivos a modificar:**
- `src/pages/Crm.tsx`
- `src/components/crm/CrmContacts.tsx`
- `src/components/crm/CrmAgentIA.tsx`

---

### AI-25 · Auto-transferencia por Palabras Clave ✅ COMPLETADO

**Comportamiento:**
- El tenant configura una lista de keywords (ej: `"humano, persona, precio, urgente, hablar con alguien"`)
- El `ai-agent` edge function revisa cada mensaje entrante contra esa lista (case-insensitive, substring match)
- Si hay match → cambia conversación a modo HUMAN → notifica al staff/principal (ver AI-26)
- El agente NO responde con IA cuando hay match — deja el turno al humano

**Dónde se configura:**
- **Wizard Step 3 (Capacidades)** — si "Transferir a humano" está activado, aparece campo de texto para ingresar keywords separadas por coma
- **Settings → tab Capacidades** — misma UI para editar después de la configuración inicial

**DB:**
```sql
ALTER TABLE crm_ai_agent_config ADD COLUMN IF NOT EXISTS transfer_keywords text[];
```

**Archivos a modificar:**
- `supabase/migrations/` → columna `transfer_keywords text[]`
- `src/lib/supabase.ts` → `transfer_keywords: string[] | null` en `CrmAIAgentConfig`
- `supabase/functions/ai-agent/index.ts` → verificar keywords antes de llamar a Claude
- `src/components/crm/CrmAgentIA.tsx` → UI en Step 3 del wizard y tab Capacidades del panel

---

### AI-26 · Notificaciones WhatsApp al Staff (Cambio a Modo HUMAN)

**Cuándo se dispara:**
1. Conversación cambia a HUMAN por **keyword automática** (AI-25)
2. Llega **nuevo mensaje** en conversación ya en modo HUMAN con staff asignado (AI-28)
3. Conversación es **asignada manualmente** a un staff

**A quién se notifica:**
- Al **staff asignado** (AI-28) si existe
- Si no hay asignado → al **principal/dueño** del tenant
- Se usa el campo `personal_whatsapp` del staff (nuevo campo en `crm_staff`)

**Mensaje:**
```
Tienes un chat de WhatsApp esperando respuesta.
Cliente: {contact_name} (+{phone})
Último mensaje: "{preview de 80 chars}"
Entra al CRM para atender.
```

**Nota técnica:** El envío se hace con el número del agente del tenant hacia el WhatsApp personal del staff. Dentro de ventana 24h → texto libre. Fuera de ventana → requiere template aprobado. El staff debe haber escrito al número del negocio alguna vez para abrir la ventana inicialmente.

**Archivos a modificar/crear:**
- `supabase/migrations/` → `ALTER TABLE crm_staff ADD COLUMN personal_whatsapp text`
- `src/components/crm/CrmSettings.tsx` → campo "WhatsApp personal" en formulario de staff
- `supabase/functions/ai-agent/index.ts` → dispara notificación cuando cambia a HUMAN
- `supabase/functions/send-wa-message/index.ts` → o nueva función `notify-staff-whatsapp`

---

### ✅ AI-27 · Etiquetas en Conversaciones — COMPLETADO

**Funcionalidad:**
- El tenant crea etiquetas personalizadas (nombre + color HEX + sugerencia para IA)
- Se aplican múltiples etiquetas a una conversación (manual o automáticamente por la IA)
- Visibles como dots de color en la lista de conversaciones
- Filtro por etiqueta en la barra superior de la lista
- Gestión (crear/editar/eliminar) en Settings → nuevo tab "Etiquetas"
- Auto-etiquetado: `ai-agent` incluye sugerencias en el system prompt y parsea `|LABELS|` de la respuesta de Claude

**DB:**
```sql
CREATE TABLE crm_wa_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE crm_wa_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner" ON crm_wa_labels USING (user_id = auth.uid());

CREATE TABLE crm_wa_conversation_labels (
  conversation_id uuid REFERENCES crm_wa_conversations(id) ON DELETE CASCADE,
  label_id uuid REFERENCES crm_wa_labels(id) ON DELETE CASCADE,
  PRIMARY KEY (conversation_id, label_id)
);
ALTER TABLE crm_wa_conversation_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner" ON crm_wa_conversation_labels
  USING (conversation_id IN (SELECT id FROM crm_wa_conversations WHERE user_id = auth.uid()));
```

**Archivos a modificar/crear:**
- `supabase/migrations/` → tablas de arriba
- `src/lib/supabase.ts` → tipos `CrmWaLabel`, `CrmWaConversationLabel`
- `src/hooks/useCrmData.ts` → `useWaLabels`, `useUpsertWaLabel`, `useToggleConversationLabel`
- `src/components/crm/CrmAgentIA.tsx` → selector de etiquetas en header del chat + dots en lista + filtros

---

### ✅ AI-28 · Asignación de Conversaciones a Staff — COMPLETADO

**Funcionalidad:**
- Asignar conversaciones a staff desde el header del chat (dropdown con avatares)
- Badge de iniciales del asignado en cada item de la lista
- Filtros: "Todas" / "Sin asignar" / "Mías" (Mías solo visible si el usuario logueado es staff)
- Staff puede ver a sus colegas del mismo owner en el dropdown (nueva política RLS `staff_read_colleagues`)

**DB:**
```sql
ALTER TABLE crm_wa_conversations
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES crm_staff(id) ON DELETE SET NULL;
```

**Archivos a modificar:**
- `supabase/migrations/` → columna `assigned_to`
- `src/lib/supabase.ts` → `CrmWaConversation.assigned_to: string | null`
- `src/hooks/useCrmData.ts` → `useAssignConversation`
- `src/components/crm/CrmAgentIA.tsx` → selector en header + badge en lista + filtros

---

### ✅ AI-29 · Búsqueda en Historial de Mensajes — COMPLETADO

**Funcionalidad:**
- Toggle en la barra de búsqueda: modo **"Contactos"** (actual, por nombre/teléfono) vs **"Mensajes"** (nuevo, dentro del contenido)
- Resultados muestran: nombre del contacto, fragmento del mensaje con keyword resaltada, timestamp
- Hacer clic en resultado navega a esa conversación y hace scroll al mensaje
- Mínimo 3 caracteres, debounce 400ms

**Implementación:**
- Query: `supabase.from("crm_wa_messages").select("*, crm_wa_conversations(*)").ilike("content", "%query%").limit(20)`
- El hook acepta `userId` para soportar staff buscando en conversaciones del principal

**Archivos a modificar:**
- `src/hooks/useCrmData.ts` → `useSearchWaMessages(query: string, userId?: string)`
- `src/components/crm/CrmAgentIA.tsx` → toggle de modo búsqueda + resultados

---

### Resumen del Bloque 13 — Agente IA Features Avanzados

| Feature | ID | Prioridad | Complejidad | Estado |
|---|---|---|---|---|
| WhatsApp en Recordatorios | AI-23 | 🔴 Alta | Media | ✅ Completado |
| Click teléfono → chat | AI-24 | 🔴 Alta | Baja | ❌ Descartado |
| Keywords auto-transfer | AI-25 | 🔴 Alta | Baja | ✅ Completado |
| Notificaciones staff HUMAN | AI-26 | 🟡 Media | Media | ✅ Completado (email) |
| Etiquetas en conversaciones | AI-27 | 🟡 Media | Media | ✅ Completado |
| Asignación a staff | AI-28 | 🟡 Media | Media | ✅ Completado |
| Búsqueda en mensajes | AI-29 | 🟢 Baja | Baja | ✅ Completado |

Las credenciales de Meta (access_token, app_secret) se guardan **en la base de datos por tenant** (encriptadas con pgp_sym_encrypt), no como secrets globales. Esto es lo que hace posible el multi-tenant.

---

## BLOQUE 14 — Módulo Productos, Catálogos y Ventas por IA

### Contexto
El CRM actualmente tiene un módulo de Servicios orientado a ventas de tiempo/trabajo. Este bloque añade un módulo de **Productos** completamente independiente (con catálogos, variantes, stock, entregables digitales y métodos de pago), actualiza Servicios para que también admitan métodos de pago, y extiende el Agente IA para que pueda cerrar ventas detectando comprobantes de pago y entregar archivos digitales de forma automática.

---

### Arquitectura general

```
Mi Negocio
  ├── Servicios (existente, se añade Método de pago)
  └── Productos (nuevo)
        ├── Catálogos (agrupan productos, URL pública)
        └── Productos (CRUD con variantes, stock, imágenes, entregable, métodos de pago)

Página pública: /catalogo/{slug}
  └── Vitrina informativa → botón "Comprar por WhatsApp" → abre chat con IA

Agente IA (ai-agent edge function)
  └── Detecta comprobante de pago → crea Venta → (si procede) envía entregable
```

---

### ✅ PR-1 · DB: Tablas y migraciones — COMPLETADO

**Nuevas tablas:**

```sql
-- Productos
CREATE TABLE crm_products (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  price           numeric NOT NULL DEFAULT 0,
  currency        text NOT NULL DEFAULT 'USD',
  sku             text,
  stock_enabled   boolean NOT NULL DEFAULT false,
  stock           integer,                        -- null = "Sin stock" / no tracking
  images          text[] NOT NULL DEFAULT '{}',   -- [0] = thumbnail principal, [1-4] adicionales
  has_variants    boolean NOT NULL DEFAULT false,
  deliverable_type text,                          -- 'file' | 'text' | null
  deliverable_url  text,                          -- URL en Supabase Storage (zip/pdf)
  deliverable_text text,                          -- texto libre (link Drive, instrucciones)
  is_active       boolean NOT NULL DEFAULT true,
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
ALTER TABLE crm_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner" ON crm_products USING (user_id = auth.uid());

-- Variantes de producto
CREATE TABLE crm_product_variants (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id     uuid NOT NULL REFERENCES crm_products(id) ON DELETE CASCADE,
  name           text NOT NULL,          -- "Talla L", "Color Rojo + Azul"
  price_override numeric,               -- si es null, usa precio del producto base
  stock          integer,               -- si es null, usa stock del producto base
  sort_order     integer NOT NULL DEFAULT 0,
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE crm_product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner" ON crm_product_variants
  USING (product_id IN (SELECT id FROM crm_products WHERE user_id = auth.uid()));

-- Métodos de pago (unifica productos, variantes y servicios)
CREATE TABLE crm_payment_methods (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type  text NOT NULL,   -- 'product' | 'product_variant' | 'service'
  entity_id    uuid NOT NULL,
  type         text NOT NULL,   -- 'bank_transfer' | 'payment_link' | 'qr_code'
  label        text,            -- "Banco XYZ", "PayPal", etc.
  content      text NOT NULL,   -- texto con datos bancarios, URL, o URL del QR en Storage
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE crm_payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner" ON crm_payment_methods USING (user_id = auth.uid());

-- Catálogos
CREATE TABLE crm_catalogs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  slug        text UNIQUE NOT NULL,   -- URL pública: /catalogo/{slug}
  cover_image text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE crm_catalogs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner" ON crm_catalogs USING (user_id = auth.uid());

-- Relación catálogo ↔ producto (N:M)
CREATE TABLE crm_catalog_products (
  catalog_id uuid REFERENCES crm_catalogs(id) ON DELETE CASCADE,
  product_id uuid REFERENCES crm_products(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (catalog_id, product_id)
);
ALTER TABLE crm_catalog_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner" ON crm_catalog_products
  USING (catalog_id IN (SELECT id FROM crm_catalogs WHERE user_id = auth.uid()));
```

**Modificaciones a tablas existentes:**

```sql
-- Ventas: campos para ventas por IA
ALTER TABLE crm_sales
  ADD COLUMN IF NOT EXISTS product_id         uuid REFERENCES crm_products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS product_variant_id  uuid REFERENCES crm_product_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_method_id   uuid REFERENCES crm_payment_methods(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_ai_sale          boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status              text NOT NULL DEFAULT 'confirmed', -- 'confirmed' | 'pending_review'
  ADD COLUMN IF NOT EXISTS wa_conversation_id  uuid REFERENCES crm_wa_conversations(id) ON DELETE SET NULL;

-- Config del Agente IA: selección y detección de pagos
ALTER TABLE crm_ai_agent_config
  ADD COLUMN IF NOT EXISTS products_mode        text NOT NULL DEFAULT 'all',  -- 'all' | 'selected'
  ADD COLUMN IF NOT EXISTS selected_product_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS services_mode        text NOT NULL DEFAULT 'all',  -- 'all' | 'selected'
  ADD COLUMN IF NOT EXISTS selected_service_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS auto_detect_payments boolean NOT NULL DEFAULT false;
```

**Buckets de Storage:**
- `product-images` (público) — imágenes de productos
- `payment-qr` (público) — imágenes QR de métodos de pago
- `product-deliverables` (privado) — archivos zip/pdf de entregables

---

### ✅ PR-2 · Métodos de pago en Servicios — COMPLETADO

**Qué cambia:** Los servicios existentes ganan soporte de métodos de pago usando la tabla `crm_payment_methods` con `entity_type = 'service'`.

**UI (`src/components/crm/CrmServices.tsx`):**
- En el formulario de edición de cada servicio, agregar sección "Métodos de pago" (igual que en productos)
- Cada método tiene: tipo (transferencia/link/QR), etiqueta, contenido
- Botón para añadir método, lista editable con eliminar

**Hooks (`src/hooks/useCrmData.ts`):**
- `usePaymentMethods(entityType, entityId)` → lista de métodos
- `useUpsertPaymentMethod()` → crear/editar
- `useDeletePaymentMethod()` → eliminar

---

### ✅ PR-3 · UI: Módulo de Productos — COMPLETADO

**Ubicación:** Pestaña "Productos" dentro de "Mi Negocio", al lado de "Servicios".

**Vista principal:** Lista de catálogos (cards con cover image, nombre, cantidad de productos, badge activo/inactivo, botón de URL pública).

**Flujo de creación:**
1. Crear catálogo → nombre, descripción, slug (auto-generado del nombre, editable), imagen de portada
2. Dentro del catálogo → botón "Agregar producto"
3. Formulario de producto:
   - **Info básica:** nombre, descripción, precio, moneda, SKU (opcional)
   - **Imágenes:** 1 principal + hasta 4 adicionales (drag & drop / upload)
   - **Stock:** toggle "Gestionar stock" → si activo: campo numérico de stock inicial. Si inactivo: "Sin límite"
   - **Variantes:** toggle "Este producto tiene variantes" → lista editable de variantes con nombre, precio propio (opcional, si no hereda el base), stock propio (opcional). Botón "Añadir variante"
   - **Métodos de pago:** lista de métodos con tipo/etiqueta/contenido. Para QR: upload de imagen
   - **Entregable:** toggle "Producto digital / entregable" → tipo (Archivo o Texto). Si archivo: upload de zip/pdf. Si texto: textarea (links de Drive, instrucciones, etc.)
   - **Catálogos:** checklist de catálogos del tenant donde incluir este producto

**Archivos a crear/modificar:**
- `src/components/crm/CrmProductos.tsx` — componente principal nuevo
- `src/hooks/useCrmData.ts` — hooks para productos, variantes, catálogos, métodos de pago
- `src/lib/supabase.ts` — tipos: `CrmProduct`, `CrmProductVariant`, `CrmPaymentMethod`, `CrmCatalog`
- `src/pages/Crm.tsx` — añadir tab "Productos" en Mi Negocio

---

### ✅ PR-4 · Página pública del catálogo — COMPLETADO

**URL:** `/catalogo/:slug` (ruta pública, sin auth)

**Layout (mobile-first):**
- Header con cover image del catálogo, nombre, descripción del negocio
- Grid de cards de productos: imagen principal, nombre, precio, descripción breve
- Click en producto → modal/drawer con:
  - Galería de imágenes (principal + adicionales)
  - Nombre, descripción completa, precio
  - Selector de variante si el producto las tiene (precio se actualiza)
  - Métodos de pago (informativo: texto con datos bancarios, link clicable, o imagen QR)
  - Botón **"Comprar por WhatsApp"** → abre `https://wa.me/{phone_negocio}?text=Hola!+Me+interesa+el+producto+{nombre}` (la IA del negocio recibirá ese mensaje y sabrá de qué producto se trata)
- Footer con nombre del negocio y logo

**Acceso a datos:** Via `supabasePublic` (cliente sin sesión) con políticas RLS públicas de solo lectura en `crm_catalogs`, `crm_products`, `crm_catalog_products`.

**Archivos:**
- `src/pages/CatalogPublic.tsx` — página nueva
- `src/router.tsx` (o equivalente) — ruta pública `/catalogo/:slug`
- RLS públicas:
  ```sql
  CREATE POLICY "public_read_active_catalogs" ON crm_catalogs FOR SELECT USING (is_active = true);
  CREATE POLICY "public_read_active_products" ON crm_products FOR SELECT USING (is_active = true);
  CREATE POLICY "public_read_catalog_products" ON crm_catalog_products FOR SELECT USING (true);
  CREATE POLICY "public_read_payment_methods" ON crm_payment_methods FOR SELECT USING (true);
  ```

---

### ✅ PR-5 · Upload seguro de entregables — COMPLETADO

**Validación de tipos permitidos (solo en servidor):**
- Archivos: `application/zip`, `application/pdf`
- Bucket: `product-deliverables` (privado — RLS: solo el owner puede leer/escribir)
- Tamaño máximo: 50 MB

**Generación de URL temporal para descarga:**
- Cuando la venta se confirma, el edge function genera una URL firmada (`createSignedUrl`) con expiración de 72h y la envía por WhatsApp al cliente. Nunca se expone la URL permanente.

**Edge function:** `send-deliverable` (nueva)
- Input: `{ sale_id, conversation_id }`
- Busca el producto/variante de la venta, obtiene `deliverable_url` o `deliverable_text`
- Si es archivo: genera signed URL y envía por WhatsApp
- Si es texto: envía el texto directamente por WhatsApp
- Registra en la venta: `deliverable_sent_at`

---

### ✅ PR-6 · Agente IA: conocimiento de productos y métodos de pago — COMPLETADO

**Cambios en `buildSystemPrompt` (`supabase/functions/ai-agent/index.ts`):**

```typescript
// Carga productos según config (all | selected)
const products = config.products_mode === 'all'
  ? await loadAllProducts(config.user_id)
  : await loadSelectedProducts(config.selected_product_ids);

// Carga servicios según config (all | selected)
const services = config.services_mode === 'all'
  ? await loadAllServices(config.user_id)
  : await loadSelectedServices(config.selected_service_ids);
```

**Formato en system prompt:**
```
PRODUCTOS DISPONIBLES:
- {nombre} ({variantes si las hay}): {moneda} ${precio}
  Descripción: {descripción}
  Métodos de pago: {lista de métodos con su contenido}
  {Si tiene entregable: "Entrega digital automática al confirmar pago"}

SERVICIOS DISPONIBLES:
- {nombre}: {moneda} ${precio}
  Métodos de pago: {lista}
```

**Regla si no hay método de pago:**
```
Si un cliente quiere comprar un producto/servicio sin método de pago configurado, 
responde ÚNICAMENTE: [TRANSFER] (para pasar a modo Manual)
```

---

### PR-7 · Agente IA: detección de pagos

**Estado:** ✅ Completado. `parseAndStripPayment` en ai-agent, edge function `confirm-ai-sale`, toggle `auto_detect_payments` en wizard y settings, panel de ventas pendientes con confirmar/rechazar, badge IA en historial de ventas. Email de notificación al owner funcional vía Resend (llamada directa en `ai-agent` v51) con campo `payment_notify_email` configurable en wizard y settings (sub-panel igual que "Transferir a humano").

**Marcadores de respuesta de Claude:**

```
[PAYMENT_DETECTED|product_id:{uuid}|variant_id:{uuid_o_null}|amount:{numero}|method_type:{tipo}]
```

Claude añade este marcador al final de su respuesta cuando detecta un comprobante de pago válido. La función `parseAndStripPayment()` extrae los datos antes de enviar el mensaje al usuario.

**Flujo completo:**

```
1. Cliente envía imagen de comprobante por WhatsApp
2. ai-agent lo procesa como media (visión)
3. System prompt incluye:
   "Si recibes un comprobante de pago, analiza la imagen, identifica el monto, 
   confirma con el cliente: «Recibí tu comprobante de {monto}. Confirmo tu compra de {producto}.»
   Y añade al final de tu respuesta: [PAYMENT_DETECTED|product_id:...|amount:...|method_type:...]"
4. Edge function parsea el marcador:
   - Crea registro en crm_sales (is_ai_sale=true, wa_conversation_id=conv_id)
   - Si auto_detect_payments=true: status='confirmed', notifica al owner por email, 
     dispara send-deliverable si aplica, decrementa stock
   - Si auto_detect_payments=false: status='pending_review', notifica al owner 
     con link para confirmar/rechazar
5. Respuesta limpia (sin marcador) se envía al cliente por WhatsApp
```

**Notificación email al owner:**
- Asunto: `🛒 Nueva venta IA — {producto} · {monto}`
- Cuerpo: datos del cliente (nombre/teléfono), producto, monto, método de pago, miniatura del comprobante
- Si `pending_review`: incluir botones "Confirmar venta" / "Rechazar"

**Edge function de confirmación manual:** `confirm-ai-sale`
- Input: `{ sale_id, action: 'confirm' | 'reject' }` (llamado desde link del email)
- Si confirm: cambia status a `confirmed`, dispara `send-deliverable`, decrementa stock
- Si reject: cambia status a `rejected`, notifica al cliente por WhatsApp que el pago no fue verificado

---

### PR-8 · Agente IA: selección de servicios y productos (Wizard + Config)

**Estado:** ✅ Completado. Sección "Catálogo del Agente IA" en wizard Step 3 y Settings Panel → Capacidades, con radio All/Seleccionados y checklist de servicios activos y productos activos. Backend ya usaba `products_mode`/`services_mode`.

**Wizard — Step 3 (Capacidades):** Se añade subsección "Catálogo IA" después de los toggles actuales:

```
─ Servicios ──────────────────────────────────────
  ○ Todos mis servicios
  ○ Solo seleccionados → checklist de servicios activos

─ Productos ──────────────────────────────────────
  ○ Todos mis productos
  ○ Solo seleccionados → checklist de productos activos

─ Pagos ──────────────────────────────────────────
  [ ] Detectar pagos automáticos con IA
      "La IA analiza los comprobantes enviados por WhatsApp y registra
       ventas automáticamente. Requiere atención: puede haber falsos positivos."
```

**Settings Panel — tab "Capacidades":** mismos controles para edición post-wizard.

**Archivos:**
- `src/components/crm/CrmAgentIA.tsx` — wizard Step 3 + SettingsPanel tab Capacidades
- `src/lib/supabase.ts` — actualizar `CrmAIAgentConfig` con nuevos campos
- `supabase/functions/ai-agent/index.ts` — leer nuevos campos de config

---

### PR-9 · Ventas: registro automático y decremento de stock

**Estado:** ✅ Completado. Función SQL `decrement_sale_stock` (atómica, evita stock negativo), llamada en `ai-agent` (venta auto-confirmada) y `confirm-ai-sale` (confirmación manual). Columna "Servicio / Producto" en tabla de ventas muestra nombre de producto IA o servicio. `serviceName` usa `product_name ?? service_name`.

**Decremento de stock:**
```sql
-- Al confirmar venta con product_variant_id:
UPDATE crm_product_variants SET stock = stock - 1 WHERE id = {variant_id} AND stock IS NOT NULL;

-- Al confirmar venta sin variante:
UPDATE crm_products SET stock = stock - 1 WHERE id = {product_id} AND stock IS NOT NULL AND stock_enabled = true;
```

**Vista en módulo Ventas (`CrmVentas.tsx`):**
- Badge "IA" en ventas con `is_ai_sale = true`
- Badge "Pendiente" en ventas con `status = 'pending_review'`
- En venta pendiente: botones "Confirmar" y "Rechazar" (llaman a `confirm-ai-sale`)
- Columna "Producto" visible cuando `product_id` está seteado
- Columna "Comprobante" con thumbnail del proof_url (ya existe en `crm_sales`)

---

### Orden de implementación sugerido

| Prioridad | Feature | Complejidad | Impacto |
|---|---|---|---|
| 1 | PR-1 · DB: Tablas y migraciones | Alta | Bloqueante para todo |
| 2 | PR-2 · Métodos de pago en Servicios | Baja | Alto — mejora inmediata |
| 3 | PR-3 · UI: Módulo Productos | Alta | Alto — feature principal |
| 4 | PR-4 · Página pública del catálogo | Media | Alto — valor para clientes |
| 5 | PR-5 · Upload seguro de entregables | Media | Alto — diferenciador |
| 6 | PR-6 · IA: conocimiento de productos | Media | Alto — cierre de ventas |
| 7 | PR-7 · IA: detección de pagos | Alta | Alto — automatización |
| 8 | PR-8 · IA: selección servicios/productos | Baja | Medio — control granular |
| 9 | PR-9 · Ventas: registro y stock | Media | Alto — cierra el loop |

---

### Resumen del Bloque 14 — Productos, Catálogos y Ventas por IA

| Feature | ID | Prioridad | Complejidad | Estado |
|---|---|---|---|---|
| DB: tablas y migraciones | PR-1 | 🔴 Alta | Alta | ✅ Completado |
| Métodos de pago en Servicios | PR-2 | 🔴 Alta | Baja | ✅ Completado |
| UI: Módulo Productos | PR-3 | 🔴 Alta | Alta | ✅ Completado |
| Página pública del catálogo | PR-4 | 🔴 Alta | Media | ✅ Completado |
| Upload seguro de entregables | PR-5 | 🔴 Alta | Media | ✅ Completado |
| IA: conocimiento de productos | PR-6 | 🟡 Media | Media | ✅ Completado |
| IA: detección de pagos | PR-7 | 🟡 Media | Alta | ✅ Completado |
| IA: selección servicios/productos | PR-8 | 🟡 Media | Baja | ✅ Completado |
| Ventas: registro automático + stock | PR-9 | 🟡 Media | Media | ✅ Completado |

---

## BLOQUE 15 — Mejoras y Correcciones (Backlog)

Ideas registradas para planificar e implementar. Cada ítem indica si ya existe parcialmente (Revisar) o si es nuevo (Desarrollar).

---

### B15-1 · Configuración estratégica guiada del Agente IA

**Estado:** ✅ Completado

**Implementado:**
- `buildStrategicInstructions(config)` en `ai-agent/index.ts` — convierte los campos estratégicos en instrucciones de prompt concretas
- Wizard (Step 2 + Step 3) y Settings Panel tienen todos los campos: objetivos, personalidad, proactividad, datos a recopilar, longitud de respuesta, emojis, upsell, resumen de confirmación, FAQ, prompt adicional
- DB: columnas añadidas vía migración a `crm_ai_agent_config`
- Tipo `CrmAIAgentConfig` en `supabase.ts` actualizado
- Detección de pagos IA (`auto_detect_payments`) + email de notificación al owner (`payment_notify_email`) — configurable en wizard Step 3 y Settings con sub-panel de correo de destino
- Email de notificación de venta enviado directamente via Resend desde `ai-agent` (v51)

**Problema:** El campo libre de system prompt exige que el usuario sepa qué escribir. La mayoría no sabe qué incluir y deja prompts genéricos o incompletos. Los datos de negocio ya existen en "Mi Negocio" — lo que falta es la estrategia de cómo actúa el agente.

**Solución propuesta:** Reemplazar (o complementar) el textarea libre con una configuración estratégica guiada. El sistema convierte estas opciones en instrucciones de prompt específicas. El usuario puede seguir editando el resultado final en un textarea de "Prompt adicional" al pie.

---

#### Campos de configuración estratégica

| Campo | Tipo | Opciones / Descripción |
|-------|------|------------------------|
| **Objetivos del agente** | Multi-select (el primero = CTA implícito) | Agendar cita · Vender productos · Responder dudas · Capturar leads · Dar soporte postventa · Calificar prospectos |
| **Personalidad / tono** | Single-select | Profesional y formal · Amigable y cercano · Entusiasta y dinámico · Empático y tranquilizador · Directo y conciso |
| **Nivel de proactividad** | Single-select | Reactivo (solo responde) · Moderado (sugiere cuando hay oportunidad) · Proactivo (siempre orienta al objetivo) |
| **Datos a recopilar** | Multi-select → se guardan en `crm_contacts.ai_collected_data jsonb` | Nombre · Teléfono · Email · Presupuesto · Necesidad específica · Zona/ciudad · Tamaño de empresa · Fecha preferida |
| **Longitud de respuestas** | Escala de 3 puntos | Muy cortas · Normales · Detalladas |
| **Uso de emojis** | Escala de 4 puntos | Ninguno · Poco · Medio · Mucho |
| **Mostrar catálogo al preguntar** | Toggle | ON = incluye lista de servicios/productos al preguntar sobre oferta |
| **Hacer upsell/cross-sell** | Toggle | ON = sugiere productos/servicios complementarios cuando es relevante |
| **Resumen de confirmación** | Toggle | ON = antes de cerrar una venta, el agente resume lo acordado para confirmación del cliente |
| **Crear contactos automáticamente** | Toggle | ON = crea contacto + guarda datos recopilados en `ai_collected_data`; OFF = ni crea contacto ni recopila datos |
| **Preguntas frecuentes (FAQ)** | Lista de pares Q&A | El agente responde estas preguntas exactas con las respuestas definidas, sin interpretación |
| **Prompt adicional libre** | Textarea | Instrucciones extra que se anexan al final del prompt generado. Para casos avanzados. |

---

#### Comportamientos fijos (no configurables — siempre activos)

- **Detección de idioma automática:** El agente detecta el idioma del cliente y responde en el mismo idioma.
- **Gestión de objeciones:** Experto por defecto en todos los planes — maneja objeciones con argumentos basados en los servicios/productos del negocio.
- **Bloqueo de temas fuera de contexto:** No responde preguntas ajenas al negocio (política, entretenimiento, etc.).
- **Descuentos configurados:** Si el negocio tiene descuentos activos, el agente los menciona cuando es relevante (sin toggle — siempre que existan).

---

#### Relación entre "Crear contactos" y recopilación de datos

El toggle **"Crear contactos automáticamente"** controla ambas funciones:
- **ON:** El agente crea el contacto en el CRM al identificar al prospecto Y guarda los datos recopilados (nombre, presupuesto, etc.) en `crm_contacts.ai_collected_data`.
- **OFF:** El agente no crea contactos ni recopila datos en la BD (modo conversacional puro).

---

#### Cómo se genera el prompt

El sistema toma los valores de estos campos y los convierte en instrucciones concretas al final del wizard/settings. Ejemplo simplificado:

```
Tu objetivo principal es [primer objetivo seleccionado]. También puedes [otros objetivos].
Tu personalidad es [personalidad elegida].
[Si proactividad alta:] Orienta siempre la conversación hacia tu objetivo principal.
[Si recopilar datos:] Durante la conversación, obtén de forma natural: [lista de campos].
Responde con mensajes [cortos/normales/detallados].
[Si emojis > Ninguno:] Usa emojis [ocasionalmente/con frecuencia/abundantemente].
[Si FAQ:] Responde estas preguntas con las respuestas exactas definidas: [Q&A list]
[Prompt adicional del usuario]
```

---

#### DB — Columnas nuevas en `crm_ai_agent_config`

```sql
ALTER TABLE crm_ai_agent_config
  ADD COLUMN agent_objectives text[] DEFAULT '{}',
  ADD COLUMN agent_personality text,
  ADD COLUMN agent_proactivity text,
  ADD COLUMN agent_data_collect text[] DEFAULT '{}',
  ADD COLUMN response_length text DEFAULT 'normal',  -- 'short' | 'normal' | 'detailed'
  ADD COLUMN emoji_level text DEFAULT 'poco',        -- 'none' | 'poco' | 'medio' | 'mucho'
  ADD COLUMN show_catalog_on_ask boolean DEFAULT true,
  ADD COLUMN do_upsell boolean DEFAULT false,
  ADD COLUMN confirm_summary boolean DEFAULT true,
  ADD COLUMN agent_faq jsonb DEFAULT '[]',           -- [{ q: string, a: string }]
  ADD COLUMN agent_extra_prompt text;
```

> Nota: `auto_create_contacts` ya existe o se puede reutilizar el toggle existente de creación de contactos.

---

**Archivos a modificar:**
- `supabase/migrations/` — columnas nuevas en `crm_ai_agent_config`
- `src/lib/supabase.ts` — actualizar tipo `CrmAIAgentConfig` con los nuevos campos
- `src/components/crm/CrmAgentIA.tsx` — wizard Step 2 (Agente) + SettingsPanel tab "Agente": reemplazar textarea libre con los campos estratégicos + textarea "Prompt adicional" al pie; botón "Ver prompt generado" para previsualizar el resultado
- `supabase/functions/ai-agent/index.ts` — leer los nuevos campos de config y construir las instrucciones estratégicas en el system prompt (función `buildStrategicInstructions(config)`)

---

### B15-2 · Selección de servicios y productos en el agente IA

**Estado:** ✅ Completado en PR-8 — Solo revisar que funciona correctamente.

El wizard Step 3 y Settings Panel → Capacidades tienen la sección "Catálogo del Agente IA" con radio All/Seleccionados y checklist de servicios activos y productos activos.

---

### B15-3 · Seguimiento de costos de Claude IA por cuenta

**Estado:** ✅ Completado

**Objetivo:** El superadmin puede ver cuántos tokens se han consumido por cada cuenta de cliente SaaS, con desglose de costo estimado.

**Datos a guardar por cada llamada a Claude:**
- `user_id` del tenant
- `input_tokens` y `output_tokens` (disponibles en `json.usage` de la respuesta de Anthropic)
- `model` usado
- `timestamp`
- `conversation_id`

**Implementación:**
- Nueva tabla `crm_ai_usage_log { id, user_id, conversation_id, model, input_tokens, output_tokens, created_at }`
- En `ai-agent/index.ts`: después de llamar a Claude, insertar en `crm_ai_usage_log` con `json.usage.input_tokens` y `json.usage.output_tokens`
- Vista en el CRM (solo superadmin): tabla agrupada por `user_id` con totales de tokens e ingreso estimado (ej: Haiku cuesta $0.25/M input + $1.25/M output)
- Filtro por rango de fechas y por cuenta

**Archivos a modificar/crear:**
- `supabase/migrations/` — tabla `crm_ai_usage_log`
- `supabase/functions/ai-agent/index.ts` — registrar `json.usage` tras cada llamada
- `src/components/crm/` — nuevo componente `CrmAIUsage.tsx` o sección en el superadmin dashboard

---

### B15-4 · UI/UX de ventas con múltiples monedas

**Estado:** ✅ Completado — revisión exhaustiva 2026-05-18

**Problema:** La tabla de ventas muestra todos los montos con `$` sin importar la moneda real (BOB, PEN, EUR, etc.). Mezclar monedas en los totales KPI es incorrecto.

**Mejoras:**
1. Mostrar el símbolo correcto según `currency` de la venta (solo `$` para USD, `Bs.` para BOB, `S/` para PEN)
2. Los KPIs de "Total vendido" e "Ingresos del mes" deben agruparse por moneda o mostrar solo USD si hay mezcla
3. Filtro de moneda en el historial de ventas
4. En el modal de nueva venta: el selector de monto debe mostrar la moneda del servicio/producto seleccionado

**Archivos a modificar:**
- `src/components/crm/CrmVentas.tsx` — lógica de formateo de moneda, KPIs por moneda, filtro

---

### B15-5 · Monedas en Servicios (USD, BOB, PEN)

**Estado:** ✅ Completado

**Situación actual:** `crm_services` ya tiene columna `currency` (text), pero la UI de servicios no permite seleccionarla — siempre usa USD por defecto.

**Solución:**
- Agregar selector de moneda (USD / BOB / PEN) en el formulario de creación/edición de servicios
- Las mismas monedas ya disponibles en Productos
- El agente IA ya usa `formatPrice()` que maneja monedas correctamente

**Archivos a modificar:**
- `src/components/crm/CrmServicios.tsx` — agregar `<select>` de currency en el formulario de servicio
- `src/hooks/useCrmData.ts` — verificar que `useUpsertService` guarda `currency`

---

### B15-6 · Descuentos en Productos (y mejora de descuentos en Servicios)

**Estado:** ✅ Completado

**Situación actual:**
- Servicios: tienen `discount_pct` y el agente IA ya los muestra. La UI de servicios ya permite editarlo.
- Productos: NO tienen `discount_pct`. Tampoco las variantes.

**A implementar:**
1. **Migración SQL:** `ALTER TABLE crm_products ADD COLUMN discount_pct numeric DEFAULT 0;` y en `crm_product_variants ADD COLUMN discount_pct numeric DEFAULT 0;`
2. **UI en CrmProductos.tsx:** campo de descuento (%) en el formulario de producto y en cada variante dentro del wizard
3. **UI en CrmServicios.tsx:** revisar que el campo de descuento ya esté visible y funcional — si no, mostrarlo
4. **ai-agent:** `buildProductsCatalog` ya tendría que mostrar precio con descuento igual que servicios (usar `formatPrice` con el precio neto)
5. **Catálogo público:** mostrar precio tachado + precio con descuento en las tarjetas de producto

**Archivos a modificar/crear:**
- `supabase/migrations/` — columnas `discount_pct` en productos y variantes
- `src/components/crm/CrmProductos.tsx` — campo descuento en wizard y formulario de variante
- `src/components/crm/CrmServicios.tsx` — revisar visibilidad del campo descuento
- `supabase/functions/ai-agent/index.ts` — aplicar descuento en `buildProductsCatalog`
- `src/pages/CatalogPublic.tsx` — mostrar precio con descuento

---

### B15-7 · Auto-guardar notificaciones en calendarios y formularios

**Estado:** ✅ Completado

**Problema:** Al crear una notificación desde el calendario o desde formularios, el usuario debía hacer clic en un botón "Guardar" adicional, generando fricción innecesaria.

**Solución implementada:** Al confirmar una regla en `ReminderRulesEditor`, el guardado ocurre automáticamente sin pasos extras.
- `CrmCalendarConfig.tsx` — `handleRulesChange` llama `updateConfig.mutateAsync` con await real. Eliminado el botón "Guardar notificaciones". Spinner "Guardando..." mientras persiste. Calendarios nuevos: las reglas se incluyen en el save inicial.
- `CrmForms.tsx` — `handleRulesChange` llama `onUpdate()` inmediatamente. El toast de feedback lo muestra el parent ("Formulario guardado").

---

### B15-8 · Corrección: cambio de foto de perfil del Agente IA

**Estado:** ✅ Completado

**Bug corregido:** Al Step 2 del upload binario le faltaba el header `Content-Type: application/octet-stream`, requerido por la Meta Resumable Upload API. Meta rechazaba silenciosamente el archivo sin ese header. Deployado como v2.

**Si sigue fallando en producción:** el error más probable es permisos del Access Token (debe tener `whatsapp_business_management`) o WABA ID incorrecto. El mensaje de error específico aparecerá en el toast de la UI.

---

### B15-9 · Prompt caching + optimización de tokens IA

**Estado:** ✅ Completado

**Implementado en `ai-agent/index.ts`:**
- Prompt caching: header `anthropic-beta: prompt-caching-2024-07-31` + `cache_control: {type: "ephemeral"}` en system prompt. Ahorra ~90% tokens de entrada en conversaciones activas (ventana de 5 min).
- Historial reducido: 20 → 15 mensajes. Menos tokens sin perder contexto relevante.
- max_tokens: 1024 → 512. Los mensajes de WhatsApp son cortos; el agente raramente supera 300 tokens de output.

**Implementación en `ai-agent/index.ts`:**
```typescript
// En callClaude(), al construir el body:
body: JSON.stringify({
  model,
  max_tokens: 1024,
  system: [
    {
      type: "text",
      text: systemPrompt,
      cache_control: { type: "ephemeral" }  // Cache el system prompt
    }
  ],
  messages,
  betas: ["prompt-caching-2024-07-31"]  // Header requerido
})
```
También agregar el header: `"anthropic-beta": "prompt-caching-2024-07-31"`.

**Ahorro estimado:** El system prompt (~2000-4000 tokens) se cachea entre mensajes de la misma conversación. Costo de cache read ≈ 10% del costo original.

---

### B15-10 · Bloquear uso del agente en grupos de WhatsApp

**Estado:** ✅ Completado

**Problema:** Si el número de WhatsApp es agregado a un grupo, el agente podría responder a mensajes de grupo, enviando respuestas inapropiadas o siendo spam para el grupo.

**Solución:** En `whatsapp-webhook/index.ts`, detectar si el mensaje viene de un grupo y no procesarlo.

**Cómo detectarlo:** WhatsApp envía el `to` del mensaje con formato de grupo (`@g.us`) o el `from` en mensajes de grupo incluye el ID de grupo. Verificar el campo `entry[0].changes[0].value.messages[0]` — si `to` termina en `@g.us` es un grupo.

**Implementación:**
```typescript
const recipientId = value.messages?.[0]?.to ?? "";
if (recipientId.endsWith("@g.us")) {
  console.log("[webhook] mensaje de grupo ignorado");
  return; // No procesar
}
```

**Archivos a modificar:**
- `supabase/functions/whatsapp-webhook/index.ts` — agregar filtro antes de procesar el mensaje

---

### B15-11 · UX: Cómo añadir stock a un producto

**Estado:** ✅ Completado

**Situación actual:** El campo de stock existe en el wizard de productos (`CrmProductos.tsx`):
- Toggle "Gestionar stock" → activa `stock_enabled`
- Campo numérico de stock (solo visible cuando `stock_enabled = true`)
- Las variantes también tienen campo de stock individual

**Problema de UX:** No es evidente cómo añadir o reponer stock cuando el stock llega a cero, ni cómo incrementarlo después de la creación del producto.

**Mejoras sugeridas:**
1. En la vista de detalle del producto, mostrar el stock actual con un indicador visual (badge verde/amarillo/rojo según nivel)
2. Botón "Ajustar stock" (±) que permite sumar o restar unidades sin entrar al modo de edición completa
3. Alerta visual en el CRM cuando un producto llega a stock ≤ 0

**Archivos a modificar:**
- `src/components/crm/CrmProductos.tsx` — badge de stock, botón de ajuste rápido, alerta de stock bajo

---

---

### B15-12 · Wizard de onboarding en el panel Resumen

**Estado:** ✅ Completado

**Objetivo:** Cuando un usuario nuevo accede al CRM, ve en el panel Resumen un wizard de configuración inicial que lo guía a completar los datos esenciales del negocio. Reduce la fricción de los primeros pasos.

**Comportamiento del wizard:**

| Paso | Sección destino | Obligatorio | Completado cuando... |
|------|----------------|-------------|----------------------|
| 1 · Datos personales | Mi Negocio → tab Personal | ✅ Sí | `first_name`, `last_name`, `contact_email` y `contact_phone` no están vacíos |
| 2 · Datos del negocio | Mi Negocio → tab Negocio | ✅ Sí | `business_name` y `description` no están vacíos (`website`, `instagram`, `facebook` son opcionales) |
| 3 · Logo y colores | Mi Negocio → tab Logo / Colores | ⬜ Opcional | `logo_url` tiene valor O el usuario hace clic en "Omitir" |
| 4 · Servicios o Productos | Mi Negocio → tab Servicios / Productos | ⬜ Opcional | Al menos 1 servicio O 1 producto registrado, o el usuario hace clic en "Omitir" |

**Estados del wizard:**
- **Incompleto (pasos 1 o 2 sin completar):** el widget se muestra expandido y prominente con estado "Configura tu negocio" — no se puede ocultar.
- **Obligatorios completos, opcionales pendientes:** el wizard se colapsa y muestra un resumen tipo checklist. El usuario puede mostrarlo/ocultarlo con un toggle.
- **Todo completo:** el widget desaparece completamente del panel Resumen.

**UI del widget:**
```
┌─ Configura tu negocio ──────────────────────── [Ocultar ˅] ─┐
│  ✅ Datos personales              Completado                  │
│  ✅ Datos del negocio             Completado                  │
│  ⬜ Logo y colores                Agregar →   [Omitir]        │
│  ⬜ Servicios o Productos         Agregar →   [Omitir]        │
│                                                               │
│  ████████████░░  2 de 4 pasos completos                       │
└───────────────────────────────────────────────────────────────┘
```

Cada fila es clickeable y navega al módulo correspondiente (`Mi Negocio` con el tab ya seleccionado, o el módulo de Servicios/Productos).

**Persistencia del estado "Omitir":**
- Los pasos opcionales omitidos se guardan en `crm_business_profile` como flags (`onboarding_logo_skipped`, `onboarding_catalog_skipped`) o en `localStorage` si se prefiere no tocar la DB.
- Recomendado: columna `onboarding_flags jsonb` en `crm_business_profile` para mantenerlo server-side y que persista entre dispositivos.

**Campos verificados para cada paso:**

*Paso 1 — Datos personales* (tabla `crm_user_profiles` o equivalente):
- `first_name` — no vacío
- `last_name` — no vacío
- `contact_email` — no vacío
- `contact_phone` — no vacío

*Paso 2 — Datos del negocio* (tabla `crm_business_profile`):
- `business_name` — no vacío
- `description` — no vacío
- `website`, `instagram`, `facebook` — opcionales, no afectan el estado

*Paso 3 — Logo y colores* (tabla `crm_business_profile`):
- `logo_url` — no null

*Paso 4 — Servicios o Productos*:
- `COUNT(crm_services WHERE user_id = ?) >= 1` OR `COUNT(crm_products WHERE user_id = ?) >= 1`

**Archivos a modificar/crear:**
- `supabase/migrations/` — columna `onboarding_flags jsonb DEFAULT '{}'` en `crm_business_profile`
- `src/components/crm/CrmResumen.tsx` (o equivalente del dashboard) — widget `<OnboardingWizard />`
- `src/components/crm/OnboardingWizard.tsx` — nuevo componente del wizard
- `src/hooks/useCrmData.ts` — hook `useOnboardingStatus()` que calcula el estado de cada paso consultando datos existentes

---

### Resumen del Bloque 15

| Feature | ID | Prioridad | Esfuerzo | Estado |
|---|---|---|---|---|
| Prompt guiado IA | B15-1 | ✅ | — | Completado |
| Selección catálogo IA | B15-2 | ✅ | — | Completado (PR-8) |
| Costos Claude por cuenta | B15-3 | ✅ | — | Completado |
| UI/UX ventas multi-moneda | B15-4 | ✅ | — | Completado |
| Monedas en Servicios | B15-5 | ✅ | — | Completado |
| Descuentos en Productos | B15-6 | ✅ | — | Completado |
| Auto-guardar notificaciones | B15-7 | 🟡 Media | Baja | Pendiente |
| Fix foto de perfil WhatsApp | B15-8 | 🔴 Alta | — | Revisar |
| Prompt caching IA | B15-9 | 🟡 Media | Baja | Pendiente |
| Bloquear bot en grupos WA | B15-10 | 🔴 Alta | Baja | Pendiente |
| UX stock en productos | B15-11 | 🟡 Media | Baja | Pendiente |
| Wizard onboarding en Resumen | B15-12 | 🔴 Alta | Media | Pendiente |

---

## BLOQUE 16 — Calendario IA, Stock Inteligente y Catálogo Dinámico

> Fecha de planificación: Mayo 2026

---

### B16-1 · Agendamientos reales del Agente IA con el Calendario

**Estado:** ✅ COMPLETADO

**Contexto:**
El agente IA puede detectar intención de agendar (cita, reunión, estimado, recogida, etc.) pero actualmente no consulta la disponibilidad real ni crea eventos. El toggle "Agendar citas" en Capacidades existe pero no tiene lógica de backend completa.

**Comportamiento esperado:**
1. El agente detecta intención de agendar en el mensaje del contacto.
2. Si el toggle "Agendar citas" está **ON** y hay un calendario configurado en el agente:
   - Consulta los slots disponibles del calendario seleccionado (respetando horarios, duración, bloqueos y citas ya existentes).
   - Presenta al contacto **3–5 slots disponibles próximos** en lenguaje natural (ej: "Puedo ofrecerte estos horarios: Lunes 26 a las 10:00, Martes 27 a las 14:00, Miércoles 28 a las 09:00. ¿Cuál prefieres?").
3. El contacto elige un slot respondiendo al chat.
4. El agente confirma y crea el evento en el calendario:
   - Si no existe contacto → lo crea en `crm_contacts` con los datos recopilados.
   - Crea la cita en `crm_appointments` vinculada al contacto y al calendario.
5. Envía confirmación en el chat con resumen: fecha, hora, servicio/motivo y nombre del negocio.

**Configuración:**
- En **Capacidades** del Agente IA (wizard Step 2 y Settings): agregar selector de calendario ("¿Qué calendario usar para agendar?") — dropdown con los calendarios activos del tenant.
- Este campo se guarda en `crm_ai_agent_config.scheduling_calendar_id`.
- Si el toggle "Agendar citas" está ON pero no hay calendario seleccionado → el agente responde que no tiene disponibilidad configurada y sugiere contactar directamente.

**DB — Columna nueva:**
```sql
ALTER TABLE crm_ai_agent_config
  ADD COLUMN IF NOT EXISTS scheduling_calendar_id uuid REFERENCES crm_calendar_config(id) ON DELETE SET NULL;
```

**Lógica de slots disponibles (en `ai-agent/index.ts`):**
```
1. Cargar crm_calendar_config (horarios, duración de slot, timezone)
2. Cargar crm_blocked_slots del calendario (fechas/horas bloqueadas)
3. Cargar crm_appointments del calendario (citas ya agendadas)
4. Generar grid de slots libres para los próximos N días (recomendado: 7 días)
5. Excluir slots bloqueados y ocupados
6. Devolver los primeros 3–5 slots libres al agente como lista para presentar
```

**Tool nueva en el agente:**
```typescript
{
  name: "get_available_slots",
  description: "Consulta los próximos slots disponibles del calendario del negocio",
  input_schema: {
    type: "object",
    properties: {
      days_ahead: { type: "number", description: "Cuántos días hacia adelante buscar (default 7)" }
    }
  }
}

{
  name: "book_appointment",
  description: "Agenda una cita en el calendario del negocio",
  input_schema: {
    type: "object",
    properties: {
      contact_name:  { type: "string" },
      contact_phone: { type: "string" },
      date:          { type: "string", description: "YYYY-MM-DD" },
      hour:          { type: "number" },
      minute:        { type: "number" },
      notes:         { type: "string", description: "Motivo o descripción de la cita" }
    },
    required: ["contact_name", "contact_phone", "date", "hour", "minute"]
  }
}
```

**Archivos a modificar:**
- `supabase/migrations/` — columna `scheduling_calendar_id` en `crm_ai_agent_config`
- `supabase/functions/ai-agent/index.ts` — tools `get_available_slots` y `book_appointment`, lógica de detección de intención de agendamiento
- `src/lib/supabase.ts` — actualizar tipo `CrmAIAgentConfig` con `scheduling_calendar_id`
- `src/components/crm/CrmAgentIA.tsx` — selector de calendario en Wizard Step 2 y SettingsPanel (tab Capacidades)
- `src/hooks/useCrmData.ts` — si es necesario, hook para calendario del agente

---

### B16-2 · Notificaciones de poco inventario por email

**Estado:** ✅ COMPLETADO

**Comportamiento:**
- Cuando el stock de un producto **o una variante individual** llega exactamente a **5 unidades**, se envía un email de alerta al `contact_email` del perfil "Mi Negocio" del tenant.
- Cuando el stock llega a **0 unidades**, se envía un segundo email indicando que el producto está agotado.
- **No es configurable** — siempre activo para todos los tenants.
- Una sola notificación por umbral: si ya se notificó que llegó a 5, no se vuelve a notificar hasta que el stock suba y vuelva a bajar.
- Las notificaciones se disparan **en tiempo real** al momento en que se registra la venta que baja el stock (no hay cron).

**Umbrales:**

| Umbral | Asunto del email | Cuerpo |
|--------|-----------------|--------|
| Stock = 5 | ⚠️ Poco stock: {nombre producto/variante} | "El producto {nombre} tiene solo 5 unidades disponibles. Considera reabastecer pronto." |
| Stock = 0 | 🚨 Producto agotado: {nombre producto/variante} | "El producto {nombre} ha llegado a 0 unidades. Ya no aparece en tu catálogo público." |

**Control de duplicados:**
Añadir dos columnas booleanas en `crm_products` y `crm_product_variants`:
```sql
ALTER TABLE crm_products
  ADD COLUMN IF NOT EXISTS notified_low_stock    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notified_out_of_stock boolean NOT NULL DEFAULT false;

ALTER TABLE crm_product_variants
  ADD COLUMN IF NOT EXISTS notified_low_stock    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notified_out_of_stock boolean NOT NULL DEFAULT false;
```
- Cuando el stock sube por encima de 5 → resetear `notified_low_stock = false`.
- Cuando el stock sube por encima de 0 → resetear ambos flags a `false`.

**Flujo de envío:**
El envío ocurre dentro de la lógica que decrementa el stock al registrar una venta (actualmente en el hook de ventas o en la edge function correspondiente). Después de actualizar el stock:
1. Consultar el nuevo stock.
2. Si stock == 5 y `notified_low_stock = false` → enviar email + marcar flag.
3. Si stock == 0 y `notified_out_of_stock = false` → enviar email + marcar flag.
4. Si stock > 5 → resetear flags.

**Envío de email:** Vía Resend (mismo patrón que notificaciones de venta del Agente IA). Usar el `contact_email` de `crm_business_profile` del tenant dueño del producto.

**Archivos a modificar:**
- `supabase/migrations/` — columnas `notified_low_stock` y `notified_out_of_stock` en ambas tablas
- El hook/función que registra ventas y decrementa stock — agregar lógica de chequeo y envío
- `src/lib/supabase.ts` — actualizar tipos `CrmProduct` y `CrmProductVariant`

---

### B16-3 · Catálogo público según stock

**Estado:** ✅ COMPLETADO

**Comportamiento esperado:**

| Situación | Comportamiento en catálogo público |
|-----------|-----------------------------------|
| Producto sin stock configurado (`has_stock = false`) | Siempre visible, sin indicadores de cantidad |
| Producto con stock > 5 | Visible, sin alerta de cantidad |
| Producto con stock ≤ 5 y > 0 | Visible con badge **"Solo quedan X unidades"** (texto urgente en rojo/naranja) |
| Producto con stock = 0 | **Oculto del catálogo** — no se muestra |

**Para productos con variantes:**
- Una variante con `stock = 0` (y `has_stock = true`) **no aparece** como opción seleccionable (se muestra tachada o directamente oculta).
- Un producto se oculta del catálogo completo solo cuando **todas** sus variantes activas tienen `stock = 0`.
- Si al menos una variante tiene stock > 0 (o no tiene stock configurado), el producto se sigue mostrando.
- El badge "Solo quedan X unidades" en variantes aplica por variante individual, no al producto completo.

**Umbral para el badge de urgencia:** ≤ 5 unidades (consistente con B16-2).

**Archivos a modificar:**
- La página/componente de catálogo público — filtrar productos agotados y mostrar badges de stock bajo
- La query pública de productos — incluir `stock`, `has_stock` y stock de variantes en la respuesta
- `src/lib/supabase.ts` — asegurarse de que el tipo público incluya campos de stock

---

### B16-4 · Clarificación y corrección del modelo de stock (productos con variantes)

**Estado:** ✅ COMPLETADO

**Problema detectado:**
Actualmente `crm_products.stock` y `crm_product_variants.stock` son campos independientes. Cuando un producto tiene variantes (`has_variants = true`), mantener un stock propio en el producto principal genera inconsistencias: el stock del producto no refleja la realidad de lo que queda en sus variantes.

**Definición correcta del modelo:**

| Situación | Stock gestionado en |
|-----------|-------------------|
| `has_variants = false` | `crm_products.stock` (campo directo) |
| `has_variants = true` | `crm_product_variants.stock` (por variante) |

Cuando `has_variants = true`:
- El campo `crm_products.stock` **se ignora** en toda la lógica del sistema (CRM, catálogo, notificaciones, agente IA).
- El "stock total" del producto que se muestra en el CRM es `SUM(variant.stock)` de las variantes que tienen `has_stock = true`.
- Las notificaciones de B16-2 se disparan por **variante individual**, no por el total del producto.
- El catálogo público oculta variantes agotadas individualmente; oculta el producto solo si todas sus variantes están agotadas.

**Cambios en UI del CRM:**
- En la lista de productos: cuando `has_variants = true`, mostrar el stock como suma de variantes (calculado al cargar) en vez del `product.stock`.
- El `StockAdjuster` del producto principal se oculta cuando `has_variants = true` (el stock se gestiona desde el panel de variantes).
- Esta corrección elimina la confusión reportada anteriormente donde el producto mostraba stock inconsistente con sus variantes.

**No requiere migración SQL** — es un cambio de lógica en frontend y en las queries/funciones que leen stock. El campo `crm_products.stock` puede dejarse en la DB para compatibilidad; simplemente se ignora cuando `has_variants = true`.

**Archivos a modificar:**
- `src/components/crm/CrmProductos.tsx` — ocultar `StockAdjuster` del producto cuando tiene variantes; mostrar suma de stocks de variantes
- `src/hooks/useCrmData.ts` — actualizar queries que leen stock para incluir suma de variantes cuando corresponda
- Catálogo público — misma lógica

---

### Resumen del Bloque 16

| Feature | ID | Prioridad | Esfuerzo | Estado |
|---|---|---|---|---|
| Agendamientos reales Agente IA | B16-1 | ✅ | Alta | Completado |
| Notificaciones de poco stock | B16-2 | ✅ | Media | Completado |
| Catálogo público según stock | B16-3 | ✅ | Media | Completado |
| Fix modelo stock productos+variantes | B16-4 | ✅ | Baja | Completado |

**Orden de implementación recomendado:** B16-4 → B16-3 → B16-2 → B16-1
(B16-4 es prerequisito para que B16-2 y B16-3 tengan lógica consistente. B16-1 es independiente pero más complejo.)

---

## BLOQUE 17 — Pulido, Bugs Críticos y UX
> Correcciones de bugs en producción, limpieza de canales de notificación, Google Calendar real-time y mejoras de UI/UX en áreas clave del sistema.
> Items ordenados por dependencias y facilidad: primero quick wins sin dependencias, luego features encadenadas.

---

### B17-1 · Eliminar canal WhatsApp de la UI de notificaciones

**Estado:** ✅ COMPLETADO

**Contexto:**
En los módulos de notificaciones (recordatorios de calendarios, formularios, notificaciones personalizadas) existe una opción de canal "WhatsApp" que está incompleta y nunca funcionó de forma estable. La decisión es **eliminarla completamente de la UI** — dejar únicamente el canal Email como opción de envío para todos los módulos de notificaciones.

**Módulos afectados:**
- Recordatorios de citas (`CrmReminders.tsx`) — selector de canal email/WhatsApp
- Notificaciones de formularios — si existe opción WhatsApp en las acciones post-submit
- Notificaciones personalizadas (`crm_reminders` con type = 'whatsapp')

**Cambios requeridos:**
- Eliminar el checkbox/radio de "WhatsApp" en el formulario de creación de recordatorios
- Si existen recordatorios guardados con `type = 'whatsapp'` en DB → no se deben enviar ni dar error; simplemente se ignoran con un guard en `send-reminders`
- No se requiere migración SQL — solo limpieza de UI

**Archivos a modificar:**
- `src/components/crm/CrmReminders.tsx` — eliminar opción WhatsApp del selector de canal
- `supabase/functions/send-reminders/index.ts` — si `type === 'whatsapp'` → `console.log("Skipped: whatsapp not enabled")` + `continue` en lugar de `throw`

---

### B17-2 · Fix foto de perfil del Agente IA — URL temporal vs persistente

**Estado:** ✅ COMPLETADO

**Bug:**
La foto se sube correctamente a Meta (WhatsApp Business) vía la edge function `upload-wa-profile-photo`. Sin embargo, después del upload el código hace `setProfilePicUrl(URL.createObjectURL(file))` — una URL de blob temporal que se destruye al recargar o desde otro dispositivo. Al recargar, intenta cargar la URL desde la API de Meta (`whatsapp_business_profile`), pero esa URL también puede expirar o no estar disponible consistentemente.

**Síntoma confirmado:** La foto no persiste al recargar ni se ve desde otros dispositivos.

**Causa raíz:**
La URL de la foto de perfil de WhatsApp (en Meta) nunca se guarda en `crm_ai_agent_config` en Supabase. Cada vez que se recarga, el fetch a Meta puede fallar o retornar una URL expirada, y no hay respaldo en DB.

**Fix correcto:**
1. Después de subir la foto a Meta exitosamente, hacer un fetch a `whatsapp_business_profile` para obtener la URL actual de la foto (la real que Meta asigna)
2. Guardar esa URL en `crm_ai_agent_config.profile_picture_url` en Supabase
3. En el estado local, usar la URL de DB (no `createObjectURL`)
4. Al cargar la configuración del agente (en `useEffect` al montar), leer `profile_picture_url` desde DB como fuente de verdad

**Flujo corregido:**
```typescript
// Después de upload exitoso a Meta:
const profileRes = await fetch(
  `https://graph.facebook.com/v21.0/${phoneNumberId}/whatsapp_business_profile?fields=profile_picture_url`,
  { headers: { Authorization: `Bearer ${accessToken}` } }
)
const profileData = await profileRes.json()
const metaUrl = profileData.data?.[0]?.profile_picture_url ?? null
// Guardar en DB
await supabase.from("crm_ai_agent_config")
  .update({ profile_picture_url: metaUrl })
  .eq("user_id", userId)
// Estado local con URL real (no blob)
setProfilePicUrl(metaUrl)
```

**Consideraciones:**
- Agregar columna `profile_picture_url text` a `crm_ai_agent_config` si no existe
- Al inicializar el componente, leer `config.profile_picture_url` desde DB y setearlo en estado
- Si Meta no retorna URL tras el upload (demora de procesamiento), guardar `null` y mostrar un mensaje "Foto actualizada — puede tardar unos minutos en reflejarse"

**Archivos a modificar:**
- `src/components/crm/CrmAgentIA.tsx` — corregir `handleWizardPhotoUpload` y su equivalente en SettingsPanel; inicializar `profilePicUrl` desde `config.profile_picture_url`
- `supabase/migrations/` — `ALTER TABLE crm_ai_agent_config ADD COLUMN IF NOT EXISTS profile_picture_url text;`

---

### B17-3 · Fix Google Calendar OAuth — redirect_uri www vs non-www

**Estado:** ✅ COMPLETADO

**Bug en producción:**
La función `google-calendar-oauth` construye el `redirect_uri` a partir de la variable de entorno `SITE_URL`, que apunta a `https://acrosoftlabs.com` (sin `www`). Sin embargo, el callback de Google llega a `https://www.acrosoftlabs.com` (con `www`), lo que genera un error `redirect_uri_mismatch` — Google rechaza el intercambio de código porque el URI registrado en Google Cloud Console no coincide con el URI enviado en la request.

**Causa raíz (líneas ~46-71 en `google-calendar-oauth/index.ts`):**
```
const redirect_uri = `${SITE_URL}/crm?tab=calendar&oauth=google`
```
Si `SITE_URL = "https://acrosoftlabs.com"` pero el usuario navega desde `www.acrosoftlabs.com`, Google devuelve el código al dominio con `www` — ese URI no está registrado en Google Cloud Console ni coincide con el `redirect_uri` que se envió al inicio.

**Fix (usando `acrosoftlabs.com` sin www como canónico):**
La solución es garantizar que el `redirect_uri` sea siempre el mismo, independientemente de si el usuario llegó con o sin `www`. La URL sin `www` es la canónica:
1. Fijar `SITE_URL=https://acrosoftlabs.com` en los secrets de Supabase
2. En la función NO construir el redirect_uri desde el header `origin` (que varía entre www y no-www) — usar siempre `SITE_URL`
3. Registrar en Google Cloud Console únicamente `https://acrosoftlabs.com/crm?tab=calendar&oauth=google`
4. El DNS/CDN (Cloudflare) debe tener una regla de redirect `www → no-www` (301 permanente). Así, si el usuario entra a `www.acrosoftlabs.com`, es redirigido a `acrosoftlabs.com` antes de iniciar el OAuth — y el redirect_uri siempre coincidirá.

**Acción requerida por el usuario (fuera del código):**
- Verificar que Cloudflare tenga redirect `www → no-www` activo
- En Google Cloud Console → Credenciales → agregar `https://acrosoftlabs.com/crm?tab=calendar&oauth=google` como Authorized Redirect URI (y eliminar la variante con www si existe)
- Actualizar secret `SITE_URL` en Supabase Dashboard si actualmente tiene `www`

**Archivos a modificar:**
- `supabase/functions/google-calendar-oauth/index.ts` — usar `SITE_URL` de variable de entorno para construir `redirect_uri`, nunca el header `origin`

---

### B17-4 · Sincronización de eventos de Google Calendar como slots bloqueados (readonly)

**Estado:** ✅ COMPLETADO

**Prerequisito:** B17-3 debe estar completado y funcionando en producción antes de implementar esto.

**Contexto:**
El tenant conecta su Google Calendar a través de B17-3. Una vez conectado, los eventos existentes en Google Calendar deben aparecer en el calendario del CRM como **slots bloqueados** — de esta forma, el agente IA y el sistema de citas no ofrecen horarios que ya están ocupados por eventos de Google.

**Comportamiento deseado:**
- Los eventos de Google Calendar se muestran en el calendario del CRM con estilo diferente (ej: fondo gris, icono de Google) para distinguirlos de las citas del CRM
- Son **solo lectura** — no se pueden editar ni eliminar desde el CRM
- Sincronización cada 5 minutos — si el tenant agrega un evento en Google Calendar, se refleja en el CRM en los próximos 5 minutos
- Solo se sincronizan eventos del **calendario principal** del tenant (el que conectó con OAuth)
- Rango de sincronización: eventos desde hoy hasta 60 días en el futuro

**Implementación técnica:**
- Usar Google Calendar API `events.list` con `timeMin` y `timeMax` para cargar eventos del rango activo
- Guardar access_token + refresh_token en `crm_google_calendar_config` (tabla existente o nueva)
- Crear edge function `sync-google-calendar` que:
  1. Lee eventos del tenant desde Google Calendar API (con refresh automático del token si expiró)
  2. Upsert en tabla `crm_google_events` (id de Google como clave única)
  3. Elimina de `crm_google_events` los eventos que ya no existen en Google
- Disparar `sync-google-calendar` mediante:
  - Cron de Supabase cada **5 minutos** (para todos los tenants que tienen Google Calendar conectado)
  - También al conectar por primera vez (sincronización inicial inmediata)
- En el frontend, cargar `crm_google_events` junto con las citas y mostrarlos en el calendario

**DB — nueva tabla:**
```sql
CREATE TABLE crm_google_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  google_event_id text NOT NULL,
  title text,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  synced_at timestamptz DEFAULT now(),
  UNIQUE(user_id, google_event_id)
);
ALTER TABLE crm_google_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner" ON crm_google_events USING (user_id = auth.uid());
```

**Archivos a crear/modificar:**
- `supabase/migrations/` — tabla `crm_google_events`
- `supabase/functions/sync-google-calendar/index.ts` — nueva edge function
- `src/components/crm/CrmCalendar.tsx` — renderizar eventos de Google como slots bloqueados
- `src/hooks/useCrmData.ts` — hook `useGoogleEvents(userId)` para cargar `crm_google_events`
- `src/lib/supabase.ts` — tipo `CrmGoogleEvent`

---

### B17-5 · Mejora de landing page acrosoftlabs.com

**Estado:** ✅ COMPLETADO

**Contexto:**
La landing page actual en `acrosoftlabs.com` muestra la información del negocio (descripción, servicios, planes). Se quiere mejorar el diseño y la experiencia visual para aumentar conversiones. Implementar cuando se comparta imagen de referencia de diseño.

**Scope:**
- Mejorar el diseño visual de la landing page existente (no rediseño completo, sino refinamiento)
- Aplicar mejores prácticas de UX: jerarquía visual, CTA más claros, secciones bien separadas
- Asegurar que los servicios cargados dinámicamente (QW-5) se muestren de forma atractiva
- Responsive correcto en mobile

**Archivos a modificar:**
- `src/pages/Index.tsx` (o equivalente — landing page principal)
- Componentes de secciones de la landing si están separados

---

### B17-6 · Mejoras de UX en la interfaz de chat del Agente IA

**Estado:** ✅ Completado

**Contexto:**
La interfaz actual del chat del Agente IA en el CRM es funcional pero tiene oportunidades de mejora en UX. El objetivo es refinar lo existente y agregar elementos que mejoren la experiencia de trabajo de los agentes humanos. Implementar cuando se comparta imagen de referencia de diseño.

**Mejoras propuestas:**
- **Burbuja de mensaje mejorada**: mejor distinción visual entre mensajes del bot, del contacto y del staff humano (colores diferenciados, avatares)
- **Estado de mensaje**: indicadores de "enviado", "entregado", "leído" (si la API lo soporta)
- **Timestamp más legible**: agrupar mensajes por día ("Hoy", "Ayer", "Lunes 12 de mayo")
- **Input de respuesta mejorado**: área de texto expandible, contador de caracteres, shortcut Ctrl+Enter para enviar
- **Barra lateral de conversaciones**: mostrar última vez activo, preview del último mensaje truncado a 2 líneas
- **Indicador de modo** (IA / HUMANO) más prominente en el header del chat
- **Acciones rápidas**: botones de acción contextual (confirmar pago, ver contacto, crear cita) visibles en el chat sin tener que cambiar de vista

**Archivos a modificar:**
- `src/components/crm/CrmAgentIA.tsx` — componentes de burbuja, input, lista de conversaciones, header de chat

---

### Resumen del Bloque 17

| # | Feature | Dependencias | Esfuerzo | Estado |
|---|---|---|---|---|
| B17-1 | Eliminar WhatsApp de notificaciones UI | Ninguna | Baja | ✅ Completado |
| B17-2 | Fix foto de perfil Agente IA | Ninguna | Media | ✅ Completado |
| B17-3 | Fix OAuth Google Calendar www/non-www | Ninguna | Baja | ✅ Completado |
| B17-4 | Sync Google Calendar → slots bloqueados | B17-3 | Alta | ✅ Completado |
| B17-5 | Mejora landing page acrosoftlabs.com | Ninguna (espera imagen) | Media | ✅ Completado |
| B17-6 | Mejoras UX chat Agente IA | Ninguna (espera imagen) | Alta | ✅ Completado |

---

## BLOQUE 18 — Agente IA: Flujos, Voz, Cursos y Operaciones SaaS
> Features de alto impacto que extienden el Agente IA con flujos conversacionales, transcripción de voz, gestión manual de clientes SaaS y una plataforma de cursos con acceso por magic link.

---

### B18-1 · Activación Manual de Clientes SaaS (Superadmin)

**Estado:** ✅ COMPLETADO

**Contexto:**
El superadmin (`e.daniel.acero.r@gmail.com`) necesita poder activar acceso SaaS a cualquier contacto sin que ese contacto pase por el onboarding. Esto cubre casos como: ventas por WhatsApp, referidos, clientes que ya conocen el producto y prefieren que el superadmin los configure directamente.

**Dónde vive en la UI:** CRM → Contactos → detalle del contacto → sección colapsable **"Acceso SaaS"** (solo visible para el superadmin)

**Estados posibles:**
- `Sin acceso` — el contacto no tiene cuenta SaaS
- `Activo` — tiene acceso vigente (muestra plan, fechas)
- `Suspendido` — tenía acceso pero fue suspendido manualmente
- `Vencido` — la fecha de vencimiento pasó

**Flujo de activación:**
1. Superadmin abre el detalle de un contacto
2. Ve la sección "Acceso SaaS" con estado actual
3. Hace clic en "Activar acceso SaaS"
4. Modal con:
   - Plan (selector de `crm_services` donde `type = 'saas'`)
   - Fecha de inicio (default: hoy)
   - Fecha de vencimiento (datepicker o toggle "Sin vencimiento")
   - Notas internas (opcional)
5. Al confirmar:
   - Se crea/actualiza registro en `crm_saas_access`
   - Se llama a la Supabase Admin API para crear el usuario auth si no existe (con el email del contacto)
   - Se envía email de bienvenida al contacto con sus credenciales de acceso

**DB:**
```sql
CREATE TABLE crm_saas_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  activated_by uuid NOT NULL REFERENCES auth.users(id), -- siempre el superadmin
  plan_id uuid REFERENCES crm_services(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active', -- active | suspended | expired
  starts_at date NOT NULL DEFAULT CURRENT_DATE,
  expires_at date, -- null = sin vencimiento
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(contact_id)
);
-- Sin RLS pública — solo accesible vía service_role desde edge function
```

**Edge function `activate-saas-client`:**
- Recibe: `contact_id`, `plan_id`, `starts_at`, `expires_at`, `notes`
- Verifica que el caller sea el superadmin
- Busca el email del contacto en `crm_contacts`
- Crea usuario en `auth.users` vía Admin API si no existe (password temporal + `email_confirm = true`)
- Inserta/actualiza `crm_saas_access`
- Envía email de bienvenida con credenciales

**Archivos a modificar/crear:**
- `supabase/migrations/` — tabla `crm_saas_access`
- `supabase/functions/activate-saas-client/index.ts` — edge function con Admin API
- `src/components/crm/CrmContacts.tsx` — sección "Acceso SaaS" en detalle de contacto (solo visible si `isSuperAdmin`)
- `src/hooks/useCrmData.ts` — hook `useSaasAccess(contactId)`, mutation `useActivateSaasClient`
- `src/lib/supabase.ts` — tipo `CrmSaasAccess`

---

### B18-2 · Transcripción de mensajes de voz (Groq Whisper)

**Estado:** ✅ COMPLETADO

**Contexto:**
Los contactos frecuentemente envían notas de voz por WhatsApp en lugar de texto. El agente IA actualmente no puede procesarlos — los ignora o responde con un mensaje genérico. Con Groq Whisper Large v3 (tier gratuito) se transcribe el audio a texto antes de pasarlo al modelo, habilitando respuestas coherentes a mensajes de voz.

**Flujo técnico:**
1. Llega webhook de WhatsApp con mensaje tipo `audio`
2. `ai-agent` edge function descarga el archivo de audio desde la URL de Meta Graph API
3. Envía el buffer a `https://api.groq.com/openai/v1/audio/transcriptions` con modelo `whisper-large-v3`
4. Recibe texto transcrito → lo trata como si fuera un mensaje de texto normal
5. El agente responde al texto transcrito

**Variables de entorno a agregar en Supabase:**
- `GROQ_API_KEY` → obtenida desde console.groq.com (gratuito)

**Comportamiento en UI:**
- En el historial de chat del CRM, los mensajes de voz muestran un ícono de micrófono + el texto transcrito en cursiva debajo
- Si la transcripción falla → mostrar "[Mensaje de voz — no se pudo transcribir]"

**DB:**
No requiere cambios de schema. Se puede añadir opcionalmente `transcription text` a `crm_wa_messages` para cachear las transcripciones y no volver a llamar a Groq si se recarga el historial.

**Archivos a modificar/crear:**
- `supabase/functions/ai-agent/index.ts` — detectar tipo `audio`, descargar, transcribir, inyectar texto
- `src/components/crm/CrmAgentIA.tsx` — render de burbuja de mensaje de voz con transcripción
- `src/lib/supabase.ts` — campo opcional `transcription` en `CrmWaMessage`
- `supabase/migrations/` — `ALTER TABLE crm_wa_messages ADD COLUMN transcription text;`

---

### B18-3 · Reestructuración del Wizard del Agente IA

**Estado:** ⏳ PENDIENTE

**Contexto:**
El wizard actual tiene un orden que no refleja la dependencia lógica entre pasos. Se reorganiza para preparar la llegada de los flujos conversacionales: primero conectas el canal, luego defines qué puede hacer el agente, luego configuras cómo se comporta (incluyendo los trigger-flows).

**Nuevo orden del wizard:** Conexión → Capacidades → Agente IA

**Paso 1 — Conexión:** igual que hoy (conectar número de WhatsApp via Meta Cloud API)

**Paso 2 — Capacidades:** igual que hoy (checkboxes de funcionalidades: agendar citas, registrar ventas, transferir a humano, etc.)

**Paso 3 — Agente IA:** (renombrado desde "Personalidad") — ahora incluye:
- Nombre del agente, instrucciones de personalidad, idioma
- **Nueva sección "Flujos de conversación"** (se activará con B18-5): lista de trigger-flows configurados
  - Botón "Agregar flujo"
  - Por cada flujo: prompt de intención en lenguaje natural + producto + flujo seleccionado + acciones post-flujo
  - Las opciones de acciones post-flujo se derivan de las capacidades activadas en el Paso 2

**Archivos a modificar:**
- `src/components/crm/CrmAgentIA.tsx` — reordenar pasos del wizard, renombrar "Personalidad" → "Agente IA", añadir estructura de sección de flujos (vacía, lista para B18-5)

---

### B18-4 · Flow Builder — Crear y Editar Flujos

**Estado:** ⏳ PENDIENTE

**Contexto:**
Los tenants que venden múltiples productos necesitan guiar al contacto por una secuencia de mensajes predefinida. Un flujo es solo contenido reutilizable — sin triggers ni acciones finales incorporadas. Los triggers y acciones se configuran desde el wizard (B18-5). Los flujos son independientes del agente: se crean, editan y reutilizan libremente.

**Arquitectura general de la feature de flujos:**

```
Conversación → mode: 'AI' | 'HUMAN' | 'FLOW'
                              + active_flow_id uuid
                              + flow_step int
```

**Separación de responsabilidades:**
- **`crm_wa_flows`** — define los pasos del flujo (solo contenido, sin triggers ni acciones)
- **`crm_ai_agent_config.trigger_flows`** — conecta intenciones detectadas con flujos + acciones post-flujo (se configura en B18-5)
- Los flujos son reutilizables: el mismo flujo puede dispararse desde distintas intenciones

**Dónde vive en la UI:** CRM → Agente IA → tab "Flujos"

Cada flujo tiene:
- **Nombre** (interno, ej: "Presentación Paquete Premium")
- **Producto asociado** (referencia a `crm_services`)
- **Lista de pasos** (editables con drag-and-drop de orden)

**Tipos de paso:**
- **Mensaje** → solo envía texto al contacto, avanza automáticamente al siguiente paso
- **Pregunta** → envía texto + hasta 3 opciones (se muestran como texto numerado en WhatsApp). Cada opción lleva a un paso distinto. Las bifurcaciones son opcionales.

**Ejemplo de flujo "Presentación Paquete Gold":**
```
Paso 1 (Mensaje): "¡Hola! Te cuento sobre nuestro Paquete Gold 🎯"
Paso 2 (Mensaje): "Incluye: acceso ilimitado, soporte 24/7 y onboarding personalizado."
Paso 3 (Pregunta): "¿Te gustaría agendar una llamada para resolver tus dudas?"
  → Opción 1 "Sí, me interesa" → Paso 4
  → Opción 2 "No por ahora" → Paso 5
Paso 4 (Mensaje): "Perfecto, te comparto el link para agendar: {calendar_link}"
Paso 5 (Mensaje): "Sin problema. Si en algún momento quieres más info, con gusto te ayudo."
```

**DB:**
```sql
CREATE TABLE crm_wa_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  product_id uuid REFERENCES crm_services(id) ON DELETE SET NULL,
  steps jsonb NOT NULL DEFAULT '[]',
  -- steps: [{ id, type: 'message'|'question', text, options?: [{label, next_step_id}] }]
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE crm_wa_flows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner" ON crm_wa_flows USING (user_id = auth.uid());
```

**Archivos a modificar/crear:**
- `supabase/migrations/` — tabla `crm_wa_flows`
- `src/components/crm/CrmAgentIA.tsx` — tab "Flujos" con listado, creación y editor de pasos
- `src/hooks/useCrmData.ts` — hooks `useWaFlows`, `useUpsertWaFlow`, `useDeleteWaFlow`
- `src/lib/supabase.ts` — tipo `CrmWaFlow`

---

### B18-5 · Configuración de Trigger-Flows en el Wizard (Paso 3)

**Estado:** ⏳ PENDIENTE

**Dependencias:** B18-3, B18-4

**Contexto:**
Con el wizard reestructurado (B18-3) y los flujos creados (B18-4), se completa el Paso 3 "Agente IA" con la configuración de qué intención dispara qué flujo y qué acciones ejecutar al terminar. El trigger no es una keyword sino un prompt en lenguaje natural que Claude evalúa en runtime.

**Configuración de cada trigger-flow (dentro del Paso 3 del Wizard):**
1. **Prompt de intención** (lenguaje natural): `"Cuando el contacto pregunte por precios, quiera información sobre el paquete X, o muestre interés en contratar"`
2. **Producto** (selector): elige un servicio del catálogo
3. **Flujo** (selector): elige uno de los flujos creados para ese producto en B18-4
4. **Acciones al completar el flujo** (checkboxes — solo aparecen si la capacidad fue activada en paso 2):
   - ☐ Registrar como lead interesado
   - ☐ Crear cita automáticamente (si "Agendar citas" está activo)
   - ☐ Registrar venta (si "Registrar ventas" está activo)
   - ☐ Notificar al staff asignado (si "Transferir a humano" está activo)

**Evaluación del trigger en runtime:**
Cuando llega un mensaje en modo AI, `ai-agent` evalúa contra todos los trigger-flows del tenant usando Claude:
```
"Dada esta lista de intenciones: [...], ¿el siguiente mensaje activa alguna?
Mensaje: '{mensaje del contacto}'
Responde solo con el ID del trigger activado o null."
```
Si retorna un ID → cambia a modo `FLOW`, guarda `active_flow_id` y `flow_step: 0`.

**Columna a añadir en `crm_ai_agent_config`:**
```sql
ALTER TABLE crm_ai_agent_config
  ADD COLUMN trigger_flows jsonb DEFAULT '[]';
-- trigger_flows: [{intent_prompt, product_id, flow_id, post_flow_actions: string[]}]
```

**Archivos a modificar/crear:**
- `supabase/migrations/` — columna `trigger_flows` en `crm_ai_agent_config`
- `src/components/crm/CrmAgentIA.tsx` — UI de trigger-flows en wizard paso 3 (activar sección creada en B18-3)
- `src/lib/supabase.ts` — actualizar tipo `CrmAIAgentConfig`

---

### B18-6 · Ejecución del Modo FLOW en ai-agent

**Estado:** ⏳ PENDIENTE

**Dependencias:** B18-4, B18-5

**Contexto:**
Con los flujos creados y los triggers configurados, se implementa la lógica de ejecución en la edge function `ai-agent`. Cuando un mensaje activa un trigger, la conversación entra en modo FLOW y el agente deja de llamar a Claude para responder libremente — en cambio ejecuta los pasos del flujo en secuencia hasta completarlo, y luego vuelve automáticamente a modo AI.

**Lógica de ejecución en ai-agent:**
```
Llega mensaje en modo FLOW:
1. Cargar crm_wa_flows donde id = active_flow_id
2. Leer paso en posición flow_step
3. Si tipo = 'message':
   - Enviar texto (con variables: {nombre}, {calendar_link}, etc.)
   - flow_step++
   - Si era el último paso → ejecutar post_flow_actions + mode = 'AI'
4. Si tipo = 'question':
   - Enviar texto + opciones numeradas
   - Esperar respuesta: parsear número/texto de la respuesta
   - Resolver siguiente paso según la opción seleccionada
   - flow_step = next_step_id
   - Si el paso destino es el último → ejecutar post_flow_actions + mode = 'AI'
5. Si el contacto envía algo inesperado en medio de un 'question' → reenviar las opciones
```

**Columnas a añadir en `crm_wa_conversations`:**
```sql
ALTER TABLE crm_wa_conversations
  ADD COLUMN active_flow_id uuid REFERENCES crm_wa_flows(id) ON DELETE SET NULL,
  ADD COLUMN flow_step int DEFAULT 0;
```

**Archivos a modificar/crear:**
- `supabase/migrations/` — columnas `active_flow_id`, `flow_step` en `crm_wa_conversations`
- `supabase/functions/ai-agent/index.ts` — lógica de evaluación de triggers y ejecución de pasos de flujo
- `src/lib/supabase.ts` — actualizar tipo `CrmWaConversation`

---

### B18-7 · Plataforma de Cursos — Acceso por Magic Link (sin cuenta)

**Estado:** ⏳ PENDIENTE

**Contexto:**
Los tenants que venden cursos necesitan que sus alumnos accedan al contenido de forma simple, sin crear una cuenta en el CRM. Cada curso tiene un link público. El alumno solo ingresa su email y recibe un magic link. No hay contraseñas, no hay onboarding, no hay relación con la autenticación de Supabase.

**Flujo del alumno:**
1. Recibe el link del curso (ej: `acrosoftlabs.com/curso/slug-del-curso`)
2. Ve una pantalla de acceso con solo un campo de email
3. Ingresa su email → clic en "Acceder al curso"
4. Si el email tiene acceso al curso: recibe magic link por email (válido 15 minutos)
5. Hace clic en el link → accede directamente al contenido del curso
6. Su sesión queda en localStorage por 30 días (token firmado)
7. Próxima visita: si el token sigue válido, acceso directo sin email

**Lo que NO tiene:**
- Cuenta en Supabase Auth
- Contraseña
- Perfil editable
- Acceso al CRM en ningún momento

**DB:**
```sql
CREATE TABLE crm_course_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES crm_courses(id) ON DELETE CASCADE,
  email text NOT NULL,
  granted_by uuid REFERENCES auth.users(id), -- el tenant que dio acceso
  access_token text UNIQUE, -- token JWT firmado, para sesiones activas
  token_expires_at timestamptz,
  granted_at timestamptz DEFAULT now(),
  expires_at timestamptz, -- null = sin vencimiento
  UNIQUE(course_id, email)
);

CREATE TABLE crm_course_magic_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_access_id uuid NOT NULL REFERENCES crm_course_access(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  used_at timestamptz,
  expires_at timestamptz NOT NULL
);
```

**Edge functions:**
- `request-course-access` — recibe email + course_id, verifica acceso en `crm_course_access`, genera magic link y envía email
- `verify-course-magic-link` — recibe token, valida expiración y uso único, retorna JWT de sesión (30 días) para guardar en localStorage

**Gestión de acceso desde el CRM (para el tenant):**
- En CRM → Cursos → detalle del curso → tab "Alumnos": lista de emails con acceso, botón "Dar acceso" (ingresa email + fecha de vencimiento opcional), botón "Revocar"

**Archivos a modificar/crear:**
- `supabase/migrations/` — tablas `crm_course_access`, `crm_course_magic_links`
- `supabase/functions/request-course-access/index.ts`
- `supabase/functions/verify-course-magic-link/index.ts`
- `src/pages/CourseAccess.tsx` — página pública de gate de acceso (solo email)
- `src/pages/CoursePlayer.tsx` — página del curso con validación de token en localStorage
- `src/components/crm/CrmCourses.tsx` — tab "Alumnos" en detalle de curso
- `src/hooks/useCrmData.ts` — hooks de gestión de acceso de alumnos
- `src/lib/supabase.ts` — tipos `CrmCourseAccess`, `CrmCourseMagicLink`

**Rutas a añadir en el router:**
```
/curso/:courseSlug          → CourseAccess (gate de email, público)
/curso/:courseSlug/ver      → CoursePlayer (requiere token válido en localStorage)
```

---

### B18-8 · Videos en Cursos via Bunny.net

**Estado:** ⏳ PENDIENTE

**Dependencias:** B18-7

**Contexto:**
Los tenants que crean cursos necesitan subir videos directamente desde el CRM. Bunny.net ya está en uso para los tutoriales del superadmin, por lo que la integración existe. Cada lección de un curso puede tener un video subido a Bunny.net, que se reproduce desde el `CoursePlayer` embebido.

**Flujo del tenant (creador del curso):**
1. En CRM → Cursos → editor de lección
2. Botón "Subir video"
3. Selector de archivo → progreso de carga
4. Al terminar: el video queda procesado en Bunny.net y la URL se guarda en la lección

**Flujo técnico:**
1. Frontend solicita URL de upload presignada llamando a edge function `get-bunny-upload-url`
2. Edge function crea un video en la librería de Bunny.net via Bunny Stream API → retorna `videoId` + URL TUS de upload
3. Frontend sube el archivo directamente a Bunny (cliente TUS o fetch chunked) — no pasa por Supabase
4. Al completar: guarda `bunny_video_id` en la lección
5. En `CoursePlayer`: embed con `<iframe src="https://iframe.mediadelivery.net/embed/{libraryId}/{videoId}">` o Bunny Player JS

**Variables de entorno a añadir:**
- `BUNNY_API_KEY` → API key de Bunny.net (ya disponible para tutoriales)
- `BUNNY_STREAM_LIBRARY_ID` → ID de la librería de Bunny Stream para cursos

**DB:**
```sql
-- Añadir a la tabla de lecciones existente (crm_course_lessons):
ALTER TABLE crm_course_lessons
  ADD COLUMN bunny_video_id text,
  ADD COLUMN video_duration_seconds int,
  ADD COLUMN video_status text DEFAULT 'none'; -- none | uploading | processing | ready | error
```

**Archivos a modificar/crear:**
- `supabase/functions/get-bunny-upload-url/index.ts` — crea video en Bunny, retorna upload URL
- `supabase/migrations/` — columnas `bunny_video_id`, `video_duration_seconds`, `video_status` en `crm_course_lessons`
- `src/components/crm/CrmCourses.tsx` — UI de upload con barra de progreso en editor de lección
- `src/pages/CoursePlayer.tsx` — embed del player de Bunny.net en la vista del alumno
- `src/lib/supabase.ts` — actualizar tipo `CrmCourseLesson`

---

### Resumen del Bloque 18

| # | Feature | Dependencias | Esfuerzo | Estado |
|---|---|---|---|---|
| B18-1 | Activación manual de clientes SaaS | Ninguna | Media | ✅ Completado |
| B18-2 | Transcripción de mensajes de voz (Groq Whisper) | GROQ_API_KEY en Supabase | Media | ✅ Completado |
| B18-3 | Reestructuración wizard Agente IA | Ninguna | Media | ⏳ Pendiente |
| B18-4 | Flow Builder (crear y editar flujos) | Ninguna | Alta | ⏳ Pendiente |
| B18-5 | Configuración de trigger-flows en wizard | B18-3, B18-4 | Alta | ⏳ Pendiente |
| B18-6 | Ejecución modo FLOW en ai-agent | B18-4, B18-5 | Alta | ⏳ Pendiente |
| B18-7 | Cursos — acceso por magic link | Ninguna | Alta | ⏳ Pendiente |
| B18-8 | Videos en cursos via Bunny.net | B18-7, BUNNY_API_KEY | Media | ⏳ Pendiente |

---

---

## BLOQUE 19 — Agente IA: Experiencia WhatsApp Nativa

> Objetivo: hacer que el panel de Agente IA se sienta como usar WhatsApp nativo — conversaciones fluidas, acciones contextuales, y herramientas de equipo integradas.
>
> **Nota:** El ítem "adjuntar archivos desde el CRM" ya está implementado (botón Paperclip funcional en el input con soporte para imágenes y PDFs). No forma parte de este bloque.

---

### B19-1 · Reorganización UI del Área de Input

**Prioridad: PRIMERO — fundación visual de B19-3, B19-8, B19-9, B19-11**

Actualmente el input tiene: `[Paperclip] [Textarea] [Send]` en una sola fila. Se reorganiza para que quede como las apps de mensajería modernas:

```
┌────────────────────────────────────────────────────┐
│ [💬 Nota interna]  ← botón encima del textarea     │
├────────────────────────────────────────────────────┤
│                                                     │
│   Escribe un mensaje...                             │
│                                                     │
├─────────────────────────────────────┬──────────────┤
│  [📎] [😊] [🏷️ Tags]               │  [Enviar →]  │
└─────────────────────────────────────┴──────────────┘
```

- **Encima del textarea:** botón "Nota interna" (visible solo en modo HUMAN). Al activarse, el textarea cambia de fondo (amarillo suave) y el mensaje se envía como nota interna en lugar de al contacto.
- **Debajo del textarea (toolbar izquierda):** Paperclip (ya existe), Emoji picker (B19-8), botón de etiquetas de conversación (AI-27 ya implementado, se mueve aquí).
- **Derecha:** botón Send (ya existe).

**Archivos a modificar:**
- `src/components/crm/CrmAgentIA.tsx` — ChatPanel input area (líneas ~2930–2985)

**No requiere cambios de backend.**

---

### B19-2 · Estado de Mensajes (Ticks)

**Dependencias: Ninguna · Esfuerzo: Medio**

Muestra el estado de cada mensaje enviado desde el CRM directamente en la burbuja, igual que WhatsApp:
- `✓` gris — enviado a Meta API
- `✓✓` gris — entregado al dispositivo del contacto
- `✓✓` azul (`#1877F2`) — leído por el contacto

### Cómo funciona

El webhook de Meta ya recibe eventos `statuses` con campos `status: "sent" | "delivered" | "read"` y `id` (el `wa_message_id`). Actualmente se loguean pero no se persisten.

**DB:**
```sql
ALTER TABLE crm_wa_messages
  ADD COLUMN IF NOT EXISTS delivery_status text DEFAULT 'pending';
  -- 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
```

**`whatsapp-webhook/index.ts`** — en `processPayload`, ya hay un loop sobre `value.statuses`. Reemplazar el `console.log` por:
```ts
for (const status of value.statuses ?? []) {
  const newStatus =
    status.status === "read"      ? "read"      :
    status.status === "delivered" ? "delivered" :
    status.status === "sent"      ? "sent"      :
    status.status === "failed"    ? "failed"    : null;

  if (newStatus) {
    await supabase
      .from("crm_wa_messages")
      .update({ delivery_status: newStatus })
      .eq("wa_message_id", status.id);
  }
}
```

**Frontend — `MessageBubble`:**
Solo mostrar ticks en mensajes outbound (`role !== "user"`). Agregar en la esquina inferior derecha de la burbuja, junto al timestamp:
```tsx
{!isUser && (
  <DeliveryTick status={msg.delivery_status} />
)}
```

Componente `DeliveryTick`:
```tsx
function DeliveryTick({ status }: { status?: string | null }) {
  if (!status || status === "pending") return <Clock size={10} className="text-white/50" />;
  if (status === "sent")      return <Check size={10} className="text-white/60" />;
  if (status === "failed")    return <AlertTriangle size={10} className="text-red-300" />;
  const blue = status === "read";
  return (
    <CheckCheck size={10} className={blue ? "text-[#53bdeb]" : "text-white/60"} />
  );
}
```

**Archivos a modificar/crear:**
- `supabase/migrations/` — columna `delivery_status` en `crm_wa_messages`
- `supabase/functions/whatsapp-webhook/index.ts` — guardar status en lugar de solo loguear
- `src/lib/supabase.ts` — agregar `delivery_status?: string | null` a `CrmWaMessage`
- `src/components/crm/CrmAgentIA.tsx` — componente `DeliveryTick` + uso en `MessageBubble`

---

### B19-3 · Notas Internas

**Dependencias: B19-1 (layout del input) · Esfuerzo: Bajo**

Mensajes visibles únicamente para el staff en el CRM, **nunca enviados al contacto**. Fondo amarillo suave para distinguirlos visualmente. Útil para coordinar equipo: "este cliente ya tuvo un problema antes", "ofrecerle descuento del 10%".

**DB:**
```sql
ALTER TABLE crm_wa_messages
  ADD COLUMN IF NOT EXISTS is_internal boolean NOT NULL DEFAULT false;
```

**Frontend:**
- Botón "Nota interna" encima del textarea (definido en B19-1)
- Estado local `isInternalMode: boolean` en ChatPanel
- Cuando `isInternalMode`:
  - El textarea tiene fondo `bg-amber-50 dark:bg-amber-950/30` y placeholder "Escribe una nota interna..."
  - Al enviar: `supabase.from("crm_wa_messages").insert({ ..., is_internal: true })` — **NO** llama a `sendWhatsAppMessage`
  - El botón "Nota interna" queda activo/resaltado en ámbar

**`MessageBubble` — render de notas internas:**
```tsx
if (msg.is_internal) {
  return (
    <div className="flex justify-end mb-1.5 px-3">
      <div className="max-w-[78%] bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl rounded-tr-sm px-3 py-2">
        <div className="flex items-center gap-1 mb-1">
          <Lock size={9} className="text-amber-600" />
          <span className="text-[9px] font-semibold text-amber-600 uppercase tracking-wider">Nota interna</span>
        </div>
        <p className="text-sm text-foreground leading-relaxed">{msg.content}</p>
        <p className="text-[10px] text-amber-600/70 text-right mt-1">{time}</p>
      </div>
    </div>
  );
}
```

**Archivos a modificar/crear:**
- `supabase/migrations/` — columna `is_internal` en `crm_wa_messages`
- `src/lib/supabase.ts` — agregar `is_internal?: boolean` a `CrmWaMessage`
- `src/components/crm/CrmAgentIA.tsx` — estado `isInternalMode`, lógica de envío, render en `MessageBubble`

---

### B19-4 · Favoritos de Conversación

**Dependencias: Ninguna · Esfuerzo: Bajo**

Permite "pinear" conversaciones importantes. Aparece una nueva pestaña "⭐ Favoritos" junto a "Sin leer" en la barra de tabs.

**DB:**
```sql
ALTER TABLE crm_wa_conversations
  ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false;
```

**Frontend:**

*Tab nuevo en la barra de filtros:*
```tsx
{ id: "favorites", label: "Favoritos", icon: "⭐" }
```

*Filtro en `filteredConvs`:*
```tsx
if (readFilter === "favorites") result = result.filter(c => c.is_favorite);
```

*Botón estrella en cada conversación (hover desktop / visible mobile):*
- En el item de la lista: estrella en la esquina cuando la conversación está seleccionada o en hover
- En el header del chat: icono estrella al lado del nombre del contacto

*Hook:*
```ts
export const useToggleFavorite = () => useMutation({
  mutationFn: async ({ id, value }: { id: string; value: boolean }) =>
    supabase.from("crm_wa_conversations").update({ is_favorite: value }).eq("id", id),
  onSuccess: () => qc.invalidateQueries({ queryKey: ["crm_wa_conversations"] }),
});
```

**Archivos a modificar/crear:**
- `supabase/migrations/` — columna `is_favorite` en `crm_wa_conversations`
- `src/lib/supabase.ts` — agregar `is_favorite?: boolean` a `CrmWaConversation`
- `src/hooks/useCrmData.ts` — `useToggleFavorite`
- `src/components/crm/CrmAgentIA.tsx` — tab Favoritos, filtro, botón estrella en lista y en header

---

### B19-5 · Archivar Conversación

**Dependencias: B19-4 (patrón de estado de conversación) · Esfuerzo: Bajo**

Un botón explícito para archivar conversaciones cerradas. Las conversaciones archivadas desaparecen de la lista principal y van a una sección "Archivadas" accesible desde un botón al fondo de la lista.

**DB:**
```sql
ALTER TABLE crm_wa_conversations
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;
```

**Frontend:**
- La query `useWaConversations` agrega `.eq("is_archived", false)` por defecto
- Botón "Archivar" en el menú de 3 puntos del header del chat (MoreVertical → dropdown)
- Al fondo de la lista de conversaciones: link "Ver archivadas (N)" que activa un modo `showArchived` que hace una segunda query sin el filtro
- Conversaciones archivadas muestran un badge gris "Archivada" y botón "Desarchivar"

*Hook:*
```ts
export const useArchiveConversation = () => useMutation({
  mutationFn: async ({ id, value }: { id: string; value: boolean }) =>
    supabase.from("crm_wa_conversations").update({ is_archived: value }).eq("id", id),
  onSuccess: () => qc.invalidateQueries({ queryKey: ["crm_wa_conversations"] }),
});
```

**Archivos a modificar/crear:**
- `supabase/migrations/` — columna `is_archived` en `crm_wa_conversations`
- `src/lib/supabase.ts` — agregar `is_archived?: boolean` a `CrmWaConversation`
- `src/hooks/useCrmData.ts` — `useArchiveConversation`, filtro `.eq("is_archived", false)` en `useWaConversations`
- `src/components/crm/CrmAgentIA.tsx` — botón archivar en menú, sección "Archivadas"

---

### B19-6 · Marcar como No Leído

**Dependencias: B19-5 (patrón de acciones en conversación) · Esfuerzo: Muy bajo**

Permite volver a marcar una conversación como no leída para recordar responderla más tarde. Se agrega al mismo menú de 3 puntos del header donde irá "Archivar" (B19-5), o como botón directo en el item de la lista al hacer swipe (mobile) o hover (desktop).

**Implementación:**
- Al activar "Marcar como no leído": `UPDATE crm_wa_conversations SET unread_count = 1 WHERE id = ?`
- Si la conversación estaba seleccionada → deseleccionar y volver a la lista

*Hook:*
```ts
export const useMarkConversationUnread = () => useMutation({
  mutationFn: async (id: string) =>
    supabase.from("crm_wa_conversations").update({ unread_count: 1 }).eq("id", id),
  onSuccess: () => qc.invalidateQueries({ queryKey: ["crm_wa_conversations"] }),
});
```

**Archivos a modificar/crear:**
- `src/hooks/useCrmData.ts` — `useMarkConversationUnread`
- `src/components/crm/CrmAgentIA.tsx` — opción en menú de conversación + deselección

---

### B19-7 · Indicador "Escribiendo..." de la IA

**Dependencias: Ninguna · Esfuerzo: Bajo**

Mientras el agente IA está procesando una respuesta, el contacto no ve nada. En el CRM, el staff tampoco sabe si la IA ya respondió o está tardando. Se agrega un indicador visual en el chat (lado izquierdo, burbuja animada) mientras `ai-agent` trabaja.

**DB:**
```sql
ALTER TABLE crm_wa_conversations
  ADD COLUMN IF NOT EXISTS ai_typing boolean NOT NULL DEFAULT false;
```

**`ai-agent/index.ts`** — al inicio del procesamiento, marcar `ai_typing = true`; al terminar (éxito o error), `ai_typing = false`:
```ts
// Al inicio de la función principal
await supabase.from("crm_wa_conversations").update({ ai_typing: true }).eq("id", conversation_id);
// ... procesamiento ...
// Al final (en try/finally)
await supabase.from("crm_wa_conversations").update({ ai_typing: false }).eq("id", conversation_id);
```

**Frontend:**
- El hook `useWaConversations` ya hace polling cada 3s — `ai_typing` llega automáticamente
- En el área de mensajes del chat activo, si `selectedConv?.ai_typing && selectedConv?.mode === "AI"`:
```tsx
<div className="flex justify-start mb-1.5 px-3">
  <div className="bg-white dark:bg-zinc-800 border border-border/40 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
    <div className="flex gap-1 items-center h-4">
      {[0, 150, 300].map(delay => (
        <span key={delay} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce"
          style={{ animationDelay: `${delay}ms` }} />
      ))}
    </div>
  </div>
</div>
```

**Archivos a modificar/crear:**
- `supabase/migrations/` — columna `ai_typing` en `crm_wa_conversations`
- `src/lib/supabase.ts` — `ai_typing?: boolean` en `CrmWaConversation`
- `supabase/functions/ai-agent/index.ts` — setear `ai_typing` al inicio y en finally
- `src/components/crm/CrmAgentIA.tsx` — burbuja de typing animada en el chat

---

### B19-8 · Emoji Picker (Desktop · Modo HUMAN)

**Dependencias: B19-1 (toolbar debajo del textarea) · Esfuerzo: Muy bajo**

Botón 😊 en la toolbar inferior del input, **visible únicamente en desktop y cuando la conversación está en modo HUMAN**. Al hacer clic abre un popover con el picker de emojis.

**Librería:**
```bash
npm install @emoji-mart/react @emoji-mart/data
```

**Implementación:**
```tsx
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";

// En la toolbar inferior:
{!isMobile && conv.mode === "HUMAN" && (
  <Popover>
    <PopoverTrigger asChild>
      <button className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary transition-colors">
        <Smile size={16} />
      </button>
    </PopoverTrigger>
    <PopoverContent className="p-0 w-auto border-0 shadow-xl" side="top" align="start">
      <Picker data={data} onEmojiSelect={(e: any) => setText(t => t + e.native)}
        locale="es" theme="light" previewPosition="none" skinTonePosition="none" />
    </PopoverContent>
  </Popover>
)}
```

**Detección mobile:** `const isMobile = window.innerWidth < 1024` (o usar el hook `useMediaQuery`).

**Archivos a modificar/crear:**
- `package.json` — dependencias `@emoji-mart/react`, `@emoji-mart/data`
- `src/components/crm/CrmAgentIA.tsx` — botón + Picker en toolbar (B19-1 layout)

---

### B19-9 · Respuestas Rápidas con "/"

**Dependencias: B19-1 (layout input) · Esfuerzo: Medio**

Al escribir `/` en el input, aparece un popover encima del textarea con una lista de respuestas guardadas. Seleccionar una la inserta en el input. Las respuestas se gestionan en Settings → nuevo tab "Respuestas".

**DB:**
```sql
CREATE TABLE IF NOT EXISTS crm_quick_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shortcut text NOT NULL,   -- ej: "saludo", "precio", "cita"
  content text NOT NULL,    -- el texto completo a insertar
  created_at timestamptz DEFAULT now()
);
ALTER TABLE crm_quick_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner" ON crm_quick_replies USING (user_id = auth.uid());
```

**Frontend — lógica de activación:**
```tsx
// En el onChange del textarea:
if (value === "/" || value.startsWith("/")) {
  const query = value.slice(1).toLowerCase();
  const matches = quickReplies.filter(r =>
    r.shortcut.includes(query) || r.content.toLowerCase().includes(query)
  );
  setQuickReplySuggestions(matches);
  setShowQuickReplies(true);
} else {
  setShowQuickReplies(false);
}
```

**Popover de sugerencias** (aparece encima del textarea):
- Lista de items: `[shortcut] → preview del contenido (truncado a 60 chars)`
- Click o Enter selecciona → reemplaza el texto del input
- Escape cierra el popover

**Settings — tab "Respuestas":** CRUD sencillo en el SettingsPanel (nueva sección). Mismo patrón que el tab "Etiquetas": lista + formulario inline para crear/editar/borrar.

**Hooks:**
```ts
export const useQuickReplies = () => { /* query crm_quick_replies */ }
export const useUpsertQuickReply = () => { /* insert/update */ }
export const useDeleteQuickReply = () => { /* delete */ }
```

**Archivos a modificar/crear:**
- `supabase/migrations/` — tabla `crm_quick_replies` + RLS
- `src/lib/supabase.ts` — tipo `CrmQuickReply`
- `src/hooks/useCrmData.ts` — 3 hooks
- `src/components/crm/CrmAgentIA.tsx` — lógica "/" + popover + nueva sección "Respuestas" en SettingsPanel
- Nueva sección `SECTIONS` en `SettingsPanel`: `{ id: "respuestas", label: "Respuestas rápidas", icon: Zap, desc: "/" + shortcuts` }`

---

### B19-10 · Galería de Medios por Conversación

**Dependencias: Ninguna · Esfuerzo: Bajo**

Un botón en el header del chat que abre un panel lateral (o modal) con todas las imágenes y PDFs enviados y recibidos en esa conversación, en grid.

**Frontend:**
- Botón con icono `Images` o `Grid` en el header del chat (en el menú de 3 puntos `MoreVertical`)
- Estado `showMediaGallery: boolean` en ChatPanel
- Panel lateral (o modal sheet) con dos tabs: "Fotos" y "Documentos"
- Los medios ya están en `crm_wa_messages.media_url` — filtrar por `media_type === "image"` y `media_type === "document"`

**Query en el hook existente:**
```ts
export const useConversationMedia = (conversationId: string) =>
  useQuery({
    queryKey: ["wa_media", conversationId],
    queryFn: async () => supabase
      .from("crm_wa_messages")
      .select("id, media_url, media_type, created_at, role, content")
      .eq("conversation_id", conversationId)
      .not("media_url", "is", null)
      .order("created_at", { ascending: false }),
  });
```

**UI:**
- Imágenes: grid de miniaturas 3 columnas, click abre lightbox (o nueva pestaña)
- PDFs: lista con nombre del archivo (extraído del `content`: `[PDF: nombre.pdf]`) + ícono + fecha + botón abrir

**No requiere cambios de backend ni migración.**

**Archivos a modificar/crear:**
- `src/hooks/useCrmData.ts` — `useConversationMedia`
- `src/components/crm/CrmAgentIA.tsx` — botón galería en header, panel/modal de galería

---

### B19-11 · Buscar dentro de una Conversación

**Dependencias: Ninguna · Esfuerzo: Bajo**

Buscador de mensajes dentro del hilo actual. Cuando el chat tiene muchos mensajes, permite encontrar rápido un mensaje específico. Se activa desde un botón en el header del chat.

**Comportamiento:**
- Icono de búsqueda en el header → expande un input encima del área de mensajes
- Mientras se escribe (debounce 300ms), los mensajes que coinciden quedan resaltados (fondo amarillo en la burbuja)
- Contador "3 de 7" con flechas ↑↓ para navegar entre resultados
- Hacer scroll automático al resultado activo
- Presionar Escape cierra la búsqueda

**Implementación:**
- Estado `inChatSearch: string` y `inChatSearchActive: boolean` en ChatPanel
- Los mensajes ya están en memoria (el hook `useWaMessages` los trae todos)
- Filtrar `messages.filter(m => m.content.toLowerCase().includes(query))` → array de IDs que coinciden
- En `MessageBubble`: prop `isSearchMatch` → aplica `bg-yellow-100 dark:bg-yellow-900/20` al contenedor

**No requiere cambios de backend.**

**Archivos a modificar/crear:**
- `src/components/crm/CrmAgentIA.tsx` — estado + input + highlighting + navegación en ChatPanel

---

### B19-12 · Menú Contextual en Mensajes (Desktop · Clic Derecho)

**Dependencias: B19-3, B19-6, B19-11 (para tener acciones útiles en el menú) · Esfuerzo: Medio**

En desktop, clic derecho sobre cualquier mensaje despliega un menú contextual nativo con acciones relevantes según el tipo de mensaje.

**Opciones del menú:**
| Acción | Condición |
|---|---|
| Responder | Siempre (dispara B19-13) |
| Copiar texto | Solo mensajes de texto |
| Marcar conversación como no leída | Siempre (B19-6) |
| Eliminar mensaje | Solo mensajes propios (role = "assistant" o "human") |

**Implementación:**
```tsx
// En MessageBubble, agregar:
const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);

<div
  onContextMenu={e => { e.preventDefault(); setMenuPos({ x: e.clientX, y: e.clientY }); }}
  ...
>
  {/* contenido del mensaje */}
</div>

{menuPos && (
  <ContextMenu pos={menuPos} onClose={() => setMenuPos(null)}
    onReply={() => { onReply(msg); setMenuPos(null); }}
    onCopy={() => { copyToClipboard(msg.content, "Mensaje"); setMenuPos(null); }}
    onMarkUnread={() => { markUnread.mutate(msg.conversation_id); setMenuPos(null); }}
    onDelete={canDelete ? () => { deleteMsg.mutate(msg.id); setMenuPos(null); } : undefined}
  />
)}
```

**Componente `ContextMenu`:** posicionado con `position: fixed` en `{ x, y }`, con `useEffect` para cerrar al hacer click fuera o presionar Escape. `border rounded-2xl shadow-xl bg-card` para consistencia visual.

**Hook `useDeleteWaMessage`:**
```ts
export const useDeleteWaMessage = () => useMutation({
  mutationFn: async (id: string) =>
    supabase.from("crm_wa_messages").delete().eq("id", id),
  onSuccess: (_, id) => /* optimistic remove from cache */,
});
```

**Archivos a modificar/crear:**
- `src/hooks/useCrmData.ts` — `useDeleteWaMessage`
- `src/components/crm/CrmAgentIA.tsx` — `ContextMenu` component, `onContextMenu` en `MessageBubble`, props `onReply`/`onMarkUnread` propagados desde ChatPanel

---

### B19-13 · Responder a Mensaje Específico (Quote Reply)

**Dependencias: B19-12 (menú contextual para dispararlo) · Esfuerzo: Alto**

Al seleccionar "Responder" en el menú contextual (B19-12), aparece una preview del mensaje citado encima del textarea. Al enviar, el mensaje incluye la referencia al original tanto en la UI del CRM como en WhatsApp (vía `context.message_id`).

**DB:**
```sql
ALTER TABLE crm_wa_messages
  ADD COLUMN IF NOT EXISTS replied_to_id uuid REFERENCES crm_wa_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS replied_to_preview text; -- snapshot del contenido en el momento de responder
```

**Frontend — preview de cita:**
```tsx
{replyTo && (
  <div className="mx-3 mb-1 px-3 py-2 rounded-xl bg-secondary/80 border-l-2 border-[#1877F2] flex items-start justify-between gap-2">
    <div className="min-w-0">
      <p className="text-[11px] font-semibold text-[#1877F2]">
        {replyTo.role === "user" ? (selectedConv?.contact_name ?? "Contacto") : "Tú"}
      </p>
      <p className="text-xs text-muted-foreground truncate">{replyTo.content}</p>
    </div>
    <button onClick={() => setReplyTo(null)}><X size={12} /></button>
  </div>
)}
```

**Frontend — estado:**
```tsx
const [replyTo, setReplyTo] = useState<CrmWaMessage | null>(null);
```

**Al enviar**, pasar `replied_to_id` al insert de `crm_wa_messages` y el `context: { message_id: replyTo.wa_message_id }` al llamar a la Meta Graph API.

**Render en burbujas recibidas** (mensajes que son reply a algo):
Si un mensaje tiene `replied_to_preview`, mostrar encima del contenido una mini-cita con fondo gris, igual que WhatsApp.

**`send-wa-message/index.ts`** — agregar soporte para `context.message_id` opcional en el body de la llamada a Meta:
```ts
body: JSON.stringify({
  messaging_product: "whatsapp",
  to: phone,
  type: "text",
  text: { body: message },
  ...(contextMessageId ? { context: { message_id: contextMessageId } } : {}),
})
```

**Archivos a modificar/crear:**
- `supabase/migrations/` — columnas `replied_to_id`, `replied_to_preview` en `crm_wa_messages`
- `src/lib/supabase.ts` — campos en `CrmWaMessage`
- `src/components/crm/CrmAgentIA.tsx` — estado `replyTo`, preview UI, paso de `replied_to_id` al enviar, render de cita en `MessageBubble`
- `supabase/functions/send-wa-message/index.ts` — soporte para `context.message_id`

---

### Resumen del Bloque 19

| # | Feature | Dependencias | Esfuerzo | Estado |
|---|---|---|---|---|
| B19-1 | Reorganización UI del input (toolbar inferior + nota interna encima) | Ninguna | Bajo | ⏳ Pendiente |
| B19-2 | Estado de mensajes (ticks ✓ ✓✓ azul) | Ninguna | Medio | ⏳ Pendiente |
| B19-3 | Notas internas (amarillo, no enviadas al contacto) | B19-1 | Bajo | ⏳ Pendiente |
| B19-4 | Favoritos de conversación + tab "Favoritos" | Ninguna | Bajo | ⏳ Pendiente |
| B19-5 | Archivar conversación (botón manual) | B19-4 | Bajo | ⏳ Pendiente |
| B19-6 | Marcar conversación como no leída | B19-5 | Muy bajo | ⏳ Pendiente |
| B19-7 | Indicador "escribiendo..." mientras la IA procesa | Ninguna | Bajo | ⏳ Pendiente |
| B19-8 | Emoji picker (desktop · modo HUMAN) | B19-1 | Muy bajo | ⏳ Pendiente |
| B19-9 | Respuestas rápidas con "/" | B19-1 | Medio | ⏳ Pendiente |
| B19-10 | Galería de medios por conversación | Ninguna | Bajo | ⏳ Pendiente |
| B19-11 | Buscar dentro de una conversación | Ninguna | Bajo | ⏳ Pendiente |
| B19-12 | Menú contextual en mensajes (desktop · clic derecho) | B19-3, B19-6 | Medio | ⏳ Pendiente |
| B19-13 | Responder a mensaje específico (quote reply) | B19-12 | Alto | ⏳ Pendiente |

