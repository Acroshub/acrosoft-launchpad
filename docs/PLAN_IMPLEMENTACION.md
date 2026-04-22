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

### L-19 · CrmCalendar — calendario seleccionado no se persiste al navegar (auditoría L-1)
**Origen:** L-1 implementó multi-calendario, pero `selectedCalendarId` se inicializa como `null` y nunca se guarda.
**Bug:** Al navegar fuera del tab Calendario y volver, siempre se muestra `calendars[0]` (el más antiguo) sin importar cuál estaba seleccionado. El modo de vista sí se persiste (`crm_calendar_view` en localStorage), pero no el calendario.
**Fix:** Inicializar `selectedCalendarId` desde `localStorage.getItem("crm_selected_calendar_id")` y guardar al cambiar de calendario (mismo patrón que `handleSetView`).
**Prioridad:** Baja. Molestia de UX, no rompe datos.
**Archivos:** `src/components/crm/CrmCalendar.tsx`

---

### L-20 · CrmCalendar — nuevo calendario no queda seleccionado tras su creación (auditoría L-1)
**Origen:** L-1 implementó creación de calendarios, pero no comunicó el ID del calendario creado de vuelta al componente padre.
**Bug:** Después de guardar un calendario nuevo en `CrmCalendarConfig`, se llama a `onBack()` → `setEditingCalendar(undefined)`. En ese momento `selectedCalendarId` sigue siendo `null`, por lo que cae en `calendars[0]` (el más antiguo). El nuevo calendario (el más reciente en la lista `ORDER BY created_at ASC`) NO queda seleccionado — el usuario tiene que buscarlo manualmente en el dropdown.
**Fix:** Pasar prop `onCreated?: (id: string) => void` de `CrmCalendar` a `CrmCalendarConfig`. En `handleSave` (rama `isNew`), llamar `onCreated(data.id)` después del `mutateAsync`. En `CrmCalendar`, usar ese callback para hacer `setSelectedCalendarId(id)` y guardarlo en localStorage.
**Prioridad:** Baja. Confunde al usuario pero no pierde datos.
**Archivos:** `src/components/crm/CrmCalendar.tsx`, `src/components/crm/CrmCalendarConfig.tsx`

---

### L-21 · useAppointments — carga todas las citas sin filtro de calendario (auditoría L-1)
**Origen:** L-1 añadió filtrado client-side en CrmCalendar, pero el hook sigue trayendo todo desde la DB.
**Bugs:**
1. `useAppointments()` (línea 148 useCrmData.ts) no acepta `calendarId` — trae todas las citas del usuario. Con 2+ calendarios se carga el doble de datos para descartar la mitad en el memo.
2. `useBlockedSlots(selectedCalendar?.id)` se llama con `undefined` durante la carga inicial (antes de que `calendars` resuelva) → dispara una query sin filtro de `calendar_id` que devuelve todos los bloques del usuario y se descarta al completar la carga real.
**Fix:**
1. Añadir parámetro opcional `calendarId` a `useAppointments`. Incluir en `queryKey`. Aplicar `.eq("calendar_id", calendarId)` si se provee. Actualizar `CrmCalendar` para pasar `selectedCalendar?.id`.
2. Añadir `enabled: !!user && !!calendarId` a `useBlockedSlots` para no disparar la query sin filtro.
**Prioridad:** Baja ahora (pocos calendarios/citas). Media cuando el volumen escale.
**Archivos:** `src/hooks/useCrmData.ts`, `src/components/crm/CrmCalendar.tsx`

---

### L-18 · isSlotBlocked — solo verifica inicio del slot, no su duración (regresión S-1/S-6)
**Origen:** S-1 habilitó minutos en citas y S-6 habilitó minutos en bloqueos. Ahora es posible que el START de un slot esté antes de un bloqueo pero su END caiga dentro del bloqueo.
**Bug (medio):** `isSlotBlocked` en `CalendarRenderer.tsx` verifica únicamente si el inicio del slot está dentro del rango bloqueado:
```ts
return slotTotal >= startTotal && slotTotal < endTotal;
```
Si un slot de 30 min comienza a las 9:30 (termina a las 10:00) y hay un bloqueo de 9:45 a 11:00, el slot 9:30 NO queda bloqueado (9:30 < 9:45). Pero la cita agendada correría de 9:30 a 10:00, solapándose con el bloqueo de 9:45 en adelante. El usuario público puede reservar ese slot incorrectamente.
**Condición:** Se activa cuando el admin crea un bloque con inicio que NO coincide con un límite de slot (ej: 9:45 con slots de 30 min en :00/:30). Posible desde la UI (selectores de minuto en 0/15/30/45).
**Fix:** Cambiar la condición en `isSlotBlocked` para verificar si el intervalo del slot `[slotStart, slotStart + duration_min)` se solapa con `[blockStart, blockEnd)`:
```ts
const slotEnd = slotTotal + durationMin;
return slotTotal < endTotal && slotEnd > startTotal;
```
Requiere pasar `durationMin` como parámetro adicional a `isSlotBlocked`.
**Prioridad:** Media. Afecta cuando bloqueos usan minutos no múltiplos del `duration_min` del calendario.
**Archivos:** `src/components/crm/CalendarRenderer.tsx`

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

### UI-2 · Slots visuales y agendamiento manual según `schedule_interval`
**Problema:** La vista daily/weekly del calendario CRM (`CrmCalendar.tsx`) siempre muestra filas de hora completa y el modal de agendar manual usa intervalos de 15 min hardcodeados. Debería respetar la configuración `schedule_interval` del calendario (15 o 30 min) para que la grilla y el agendamiento reflejen la misma granularidad que el calendario público.
**Fix:** (1) Leer `schedule_interval` del calendario activo. (2) Generar las filas del grid según el intervalo (en vez de `HOURS = [7..19]` fijo). (3) El selector de minuto en el modal de agendar manual debe ofrecer solo las opciones que correspondan al intervalo (cada 15 o cada 30). (4) Opcionalmente agregar un toggle visual en la vista admin para cambiar entre 1H, 30m, 15m como zoom de la grilla.
**Archivos:** `src/components/crm/CrmCalendar.tsx`
**Complejidad:** Media — grid dinámico + selector de minutos contextual.

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
