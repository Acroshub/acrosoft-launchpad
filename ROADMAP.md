# Roadmap de Implementación — Acrosoft Launchpad CRM

> Última actualización: 2026-04-09

---

## Criterios de priorización

- **Complejidad técnica**: estimado de días de implementación
- **Dependencias**: qué features bloquean a otras
- **Valor inmediato**: impacto visible para el usuario final

---

## FASE 1 — Quick Wins ✅ COMPLETADA
> Correcciones aisladas, sin dependencias entre sí. Alto impacto, bajo riesgo.

### #2 · Log de borrado menciona qué se eliminó ✅
### #4 · Precio recurrente dinámico al registrar venta ✅
### #6 · Dashboard: "Total Vendido" + ventas conectadas a base de datos ✅
### #14 · Integridad del historial de ventas al borrar contactos o servicios ✅

---

## FASE 2 — Log & Historial de Ventas ✅ COMPLETADA

### #1 · Log: tabla paginada con buscador ✅
### #7 · Editar y borrar transacciones con nota de justificación ✅

---

## FASE 3 — Contactos Enriquecidos ✅ COMPLETADA

### #8 · Añadir/quitar/editar etiquetas desde el Pipeline ✅
### #9 · Etiqueta automática al enviar formulario ✅
### #10 · Notas por contacto con historial ✅
### #12 · % Conversión en el Dashboard ✅

---

## FASE 3.5 — Correcciones & Mejoras UX ✅ COMPLETADA
> Bugs y ajustes identificados durante la implementación de la Fase 3.

### #15 · Nuevos contactos de la semana en el Dashboard
- **Estado**: pendiente
- **Complejidad**: baja (< 1 día)
- **Descripción**: En el Dashboard, dividir la sección de "Citas de hoy" en dos columnas: la izquierda mantiene las citas de hoy y la derecha muestra los nuevos contactos registrados en los últimos 7 días.
- **Técnica**: `useMemo` filtrando `contacts` por `created_at >= hace 7 días`. Layout `grid-cols-2` reemplazando el panel actual de ancho completo.

---

### #16 · Mover páginas (secciones) en formulario multipágina
- **Estado**: pendiente
- **Complejidad**: baja (< 1 día)
- **Descripción**: En el editor de formularios, cuando hay múltiples páginas/secciones, mostrar flechas ↑/↓ junto al número de página para reordenarlas.
- **Técnica**: Botones que modifican el array `sections` con intercambio de índices. Solo visible en modo multipágina.

---

### #17 · Confirmación antes de eliminar en formularios
- **Estado**: pendiente
- **Complejidad**: baja (< 1 día)
- **Descripción**: Todos los botones de eliminar en el editor de formularios (borrar página, borrar campo, borrar opción de select) deben mostrar un diálogo de confirmación antes de ejecutarse. Consistente con el patrón ya usado en el resto del CRM.
- **Técnica**: Usar el componente `DeleteConfirmDialog` existente, o un mini-popover de confirmación inline para los campos (para no interrumpir demasiado el flujo de edición).

---

### #18 · Campos de página eliminada persisten al cambiar a modo todo-en-uno
- **Estado**: pendiente
- **Complejidad**: baja (< 1 día)
- **Descripción**: Al eliminar una página en modo multipágina y luego cambiar al modo todo-en-uno (o viceversa), los campos que pertenecían a esa página siguen apareciendo. Se deben limpiar los campos huérfanos al cambiar de modo.
- **Técnica**: Al desactivar `multiPage`, filtrar `fields` eliminando los que tengan `sectionId` de una sección que ya no existe. Al eliminar una sección, también eliminar sus campos del array `fields`.

---

### #19 · Validación real de campos obligatorios en formularios
- **Estado**: pendiente
- **Complejidad**: media (1-2 días)
- **Descripción**: Los campos marcados como `required: true` no están siendo validados correctamente al enviar el formulario. El formulario de onboarding en `/onboarding` debe funcionar como un formulario CRM real creado desde el CRM, respetando las validaciones.
- **Técnica**:
  - En el componente de renderizado del formulario público, agregar validación antes del submit que recorra todos los campos `required` y verifique que tengan valor.
  - Mostrar errores inline debajo de cada campo inválido.
  - El formulario de onboarding en `/onboarding` debe migrarse a usar el mismo motor de renderizado de formularios CRM.

---

## FASE 4 — Staff & Permisos
> Cambio arquitectural. **Prerequisito para la Fase 5 (SaaS).**

### #5 · Sistema de Staff con permisos
- **Estado**: pendiente
- **Complejidad**: alta (5-7 días)
- **Descripción**: El usuario principal del CRM es tipo **Cliente**. Puede invitar colaboradores tipo **Staff** con permisos granulares. Existe además un rol único **Admin** (superadmin) que puede crear tanto clientes como staffs.
  - Staff ve los mismos datos del negocio (excepto datos personales del dueño)
  - Los permisos son configurables por módulo (contactos, ventas, pipeline, etc.)
- **Técnica**:
  - Nueva tabla: `crm_staff (id, owner_user_id, email, role: 'staff', permissions: jsonb, created_at)`
  - Invitación por email via Supabase Auth (`inviteUserByEmail`)
  - Actualizar RLS en todas las tablas: aceptar `user_id = auth.uid()` **o** que el uid sea staff autorizado del owner
  - Nuevo contexto en el frontend: `useCurrentRole()` que expone el rol activo

---

## FASE 5 — SaaS por Servicio
> Depende completamente de la Fase 4 (roles y permisos).

### #3 · Activación de SaaS por servicio + acceso como cliente
- **Estado**: pendiente
- **Complejidad**: alta (7-10 días)
- **Descripción**: Solo visible para Admins. Se compone de tres partes:
  1. **Config SaaS**: En Configuración > tab "Servicio SaaS", el admin elige qué servicios habilitados activarán acceso a un CRM propio para el cliente.
  2. **Detección en Contactos**: Si un contacto tiene registrada una venta del servicio SaaS habilitado, su fila recibe un color especial y un botón "Acceder al CRM".
  3. **Login sin contraseña**: Al hacer clic, el admin entra al CRM de ese cliente con rol "Cliente". Los datos iniciales del CRM del cliente se llenan con la información enviada en el formulario de onboarding (horarios, nombre del negocio, teléfonos, etc.).
- **Técnica**:
  - Nueva tabla: `crm_saas_config (id, user_id, enabled_service_ids: uuid[])`
  - Detección: join `crm_contacts` ↔ `crm_sales` ↔ `crm_saas_config`
  - Login como cliente: Supabase Admin API (`createSession` / magic link con redirect)
  - Pre-llenado del CRM: mapeo de campos del formulario de onboarding → `crm_business_profile` del cliente

---

## FASE 6 — Integraciones Externas
> Requieren credenciales de terceros y posiblemente Supabase Edge Functions. Independientes entre sí.

### #13 · Google Calendar sync por usuario
- **Estado**: pendiente
- **Complejidad**: alta (5-7 días)
- **Descripción**: Cada usuario puede conectar su propio Google Calendar al calendario seleccionado en el CRM. Las citas creadas se sincronizan bidireccionalmente.
- **Técnica**:
  - OAuth2 con Google (flow de autorización desde el frontend)
  - Tokens guardados en `crm_calendar_config.google_token` (ya existe el campo)
  - Supabase Edge Function para sync bidireccional via Google Calendar API
  - Manejo de refresh tokens y revocación

---

### #11 · Recordatorios por email y WhatsApp
- **Estado**: pendiente
- **Complejidad**: alta (5-7 días)
- **Descripción**: Envío automático de recordatorios para citas de calendario o recordatorios personalizados. Límites configurables por plan.
  - **Email**: X días/horas antes de la cita
  - **WhatsApp**: mensaje predefinido personalizable, con límite mensual de envíos
- **Técnica**:
  - Email: Resend o SendGrid
  - WhatsApp: Twilio o Meta Cloud API (WhatsApp Business)
  - Scheduler: Supabase Edge Function con `pg_cron` o trigger por `scheduled_at`
  - Nueva tabla: `crm_reminders (id, user_id, appointment_id, channel, send_at, sent, message)`
  - Config de límites por plan en `crm_settings`

---

## Mapa de dependencias

```
#15 ─────────────────────────────────────────► independiente
#16 ─────────────────────────────────────────► independiente
#17 ─────────────────────────────────────────► independiente
#18 ─────────────────────────────────────────► independiente
#19 ─────────────────────────────────────────► independiente

#5  ─────────────────────────────────────────► independiente (pero grande)
#3  ◄── requiere #5 completado ────────────────────────┘

#13 ─────────────────────────────────────────► independiente
#11 ─────────────────────────────────────────► independiente
```

---

## Orden de ejecución recomendado

| Sprint | Features | Estimado |
|--------|----------|----------|
| **Sprint 1** ✅ | #2 · #4 · #6 · #14 | 2-3 días |
| **Sprint 2** ✅ | #1 · #7 | 3-4 días |
| **Sprint 3** ✅ | #8 · #9 · #10 · #12 | 5-6 días |
| **Sprint 3.5** | #15 · #16 · #17 · #18 · #19 | 3-4 días |
| **Sprint 4** | #5 | 5-7 días |
| **Sprint 5** | #3 | 7-10 días |
| **Sprint 6** | #13 · #11 | 10-14 días |

---

## Tabla resumen

| # | Feature | Fase | Complejidad | Depende de | Estado |
|---|---------|------|-------------|------------|--------|
| #2 | Log menciona qué se borró | 1 | Baja | — | ✅ |
| #4 | Precio recurrente dinámico | 1 | Baja | — | ✅ |
| #6 | Total Vendido en dashboard | 1 | Baja | — | ✅ |
| #14 | Integridad historial de ventas | 1 | Baja | — | ✅ |
| #1 | Log paginado con buscador | 2 | Media | — | ✅ |
| #7 | Editar/borrar transacción con justificación | 2 | Media | — | ✅ |
| #8 | Etiquetas desde Pipeline | 3 | Baja-Media | — | ✅ |
| #9 | Etiqueta automática en formulario | 3 | Baja-Media | — | ✅ |
| #10 | Notas por contacto con historial | 3 | Media | — | ✅ |
| #12 | % Conversión en dashboard | 3 | Baja | — | ✅ |
| #15 | Nuevos contactos de la semana en Dashboard | 3.5 | Baja | — | ✅ |
| #16 | Mover páginas en formulario multipágina | 3.5 | Baja | — | ✅ |
| #17 | Confirmación antes de eliminar en formularios | 3.5 | Baja | — | ✅ |
| #18 | Campos huérfanos al cambiar modo formulario | 3.5 | Baja | — | ✅ |
| #19 | Validación real de campos obligatorios | 3.5 | Media | — | ✅ |
| #5 | Staff con permisos | 4 | Alta | — | pendiente |
| #3 | SaaS por servicio + acceso cliente | 5 | Alta | #5 | pendiente |
| #13 | Google Calendar sync | 6 | Alta | — | pendiente |
| #11 | Recordatorios email + WhatsApp | 6 | Alta | — | pendiente |
