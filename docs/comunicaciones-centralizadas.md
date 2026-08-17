# Comunicaciones centralizadas — qué edita el cliente SaaS y qué no

> **Estado:** propuesta de diseño, sin implementar.
> **Escrito:** 2026-08-17.
> La sección `Comunicaciones` existe hoy como maqueta (banner "Sección en
> desarrollo", solo visible para el admin) y guarda "copias" de plantillas en
> `crm_email_templates` que **nadie lee al enviar**.

---

## 1. Qué hay hoy, de verdad

Tres sistemas separados que nadie coordina:

### a) Recordatorios con contenido ya editable (el único que funciona)

Las reglas viven **dentro de cada feature**, no en Comunicaciones:

- Calendario → `crm_calendar_config.reminder_rules` (jsonb), editadas con
  [ReminderRulesEditor.tsx](src/components/shared/ReminderRulesEditor.tsx)
- Formularios → mismas reglas, `mode="form"`

Cada regla ya lleva destinatario (contacto / negocio+staff), canales (email +
plantilla WA), timing (`on_booking` / `before` / `after`), asunto y cuerpo con
variables `{{contact.name}}`, `{{appointment.date}}`, etc.

Al agendar, [crm-calendar-book](supabase/functions/crm-calendar-book/index.ts)
materializa cada regla como fila en `crm_reminders` (con el texto **ya copiado**)
y [send-reminders](supabase/functions/send-reminders/index.ts) resuelve variables
y envía.

**Consecuencia importante:** el texto se congela en el momento de agendar. Si el
dueño edita la plantilla hoy, las citas ya agendadas siguen con el texto viejo.

### b) Emails con contenido 100% hardcodeado en el código

| Función | Asunto | Destinatario |
|---|---|---|
| `request-course-access` | `Tu código de acceso: {code}` | cliente final |
| `send-course-invitation` | `Tienes acceso al curso: {title}` | cliente final |
| `send-deliverable` | entregable de producto digital | cliente final |
| `send-renewal-reminders` | recordatorio de renovación | cliente final |
| `invite-staff-user` | invitación de staff | staff del negocio |
| `activate-saas-client` / `generate-magic-link` | acceso al CRM | cliente SaaS |
| `reset-password` | `Restablece tu contraseña — Acrosoft` | cualquiera |
| `send-support-email` | tickets de soporte | Acros ↔ cliente |

Además, tres funciones **muertas** (sin ningún llamador en el repo):
`notify-sale`, `notify-stock-alert`, `notify-course-url-change`. Hay que
borrarlas o reconectarlas antes de listarlas como "editables" en la UI — hoy la
maqueta de Comunicaciones promete emails de stock y de cambio de URL que no
existen.

### c) Push web, sin ningún control

| Origen | Cuándo | A quién |
|---|---|---|
| `whatsapp-webhook` | **cada mensaje entrante** de WhatsApp | dueño + *todo* el staff activo |
| `ai-agent` | transferencia a humano, venta confirmada, pago pendiente, sin método de pago, rate limit | dueño + *todo* el staff activo |
| `wa-health-check` | alertas críticas de salud | solo admin de Acros |
| `send-push-notification` | envío manual | panel admin |

Cero preferencias: no se puede apagar, ni elegir quién recibe qué. El comentario
en el código lo dice literal: *"Siempre activo, sin toggle"*.

### d) Detalle que se nota más que cualquier copy

Todos los emails salen como `Acrosoft <noreply@acrosoftlabs.com>` y el layout
HTML de `send-reminders` tiene un header negro que dice **"Acrosoft"**. El
cliente final de Barón Group recibe un recordatorio de su cita firmado por
Acrosoft.

---

## 2. Mi opinión sobre la idea

**La idea es correcta, pero centralizar "las notificaciones" es demasiado
amplio.** Hay que separar tres cosas que hoy están mezcladas:

| Cosa | Dónde debe vivir | Por qué |
|---|---|---|
| **Contenido** (asunto, cuerpo, título de push) | ✅ Comunicaciones | Es transversal, se edita una vez, es lo que la marca del cliente necesita controlar |
| **Disparo** (cuándo, cuántas horas antes, para qué calendario) | ❌ Se queda en la feature | Es contextual: "24 h antes" solo tiene sentido dentro de un calendario concreto; sacarlo obliga a inventar un selector de calendarios dentro de Comunicaciones |
| **Ruteo** (quién lo recibe) | ⚠️ Mitad y mitad | El destinatario *lógico* (contacto vs negocio) es de la regla; qué persona del equipo quiere push es **preferencia personal**, y esa sí es transversal |

Si Comunicaciones intenta absorber también el "cuándo", termina siendo un
segundo programador de recordatorios que compite con el editor de reglas, y el
contenido se duplica en dos sitios que se desincronizan. Ese es el riesgo real,
y ya está empezando: el asunto de la cita existe hoy en `reminder_rules` **y**
en `CATEGORIES` de `CrmComunicaciones.tsx`, con textos distintos.

**Regla que propongo:** Comunicaciones es el **diccionario de textos**; cada
feature sigue decidiendo cuándo dispara y elige una entrada del diccionario.

Dos cosas más, sin rodeos:

1. **El modelo actual de "crear copias" no funciona.** Puedes crear "Copia 1",
   "Copia 2"… y no hay forma de decir cuál se usa. O se convierte en
   **override único por evento con botón "Restaurar original"** (simple, cubre el
   95%), o las copias necesitan un selector desde la regla que las consume. Yo
   iría por el override único, y variantes con nombre solo en calendario y
   formularios, donde tener varios recordatorios sí es real.

2. **Para las push internas, editar el texto vale poco.** El título de la push de
   WhatsApp *es* el nombre del contacto; el cuerpo es el preview del mensaje. No
   hay prosa que personalizar. Lo que falta de verdad ahí es **apagarlas y elegir
   quién las recibe** — hoy le llegan a todo el staff activo, siempre. Ese
   interruptor vale más que cualquier editor de copy.

---

## 3. Modelo de tres capas

```
┌─ Capa 1: CATÁLOGO (código, no editable) ──────────────────────────┐
│ event_key, categoría, canales posibles, destinatario, variables   │
│ disponibles, variables OBLIGATORIAS, textos por defecto,          │
│ nivel de edición                                                  │
└───────────────────────────────────────────────────────────────────┘
                              ↓ fallback
┌─ Capa 2: OVERRIDES POR TENANT (BD, editable en Comunicaciones) ───┐
│ crm_notification_settings: user_id + event_key + channel →        │
│ enabled, subject/title, body                                      │
└───────────────────────────────────────────────────────────────────┘
                              ↓ se consume desde
┌─ Capa 3: DISPARO (cada feature, como hoy) ────────────────────────┐
│ reglas del calendario / del formulario / eventos del ai-agent     │
│ → deciden CUÁNDO y A QUIÉN, y referencian un event_key            │
└───────────────────────────────────────────────────────────────────┘
```

El catálogo vive en un solo sitio compartido y se importa desde los dos lados
(`supabase/functions/_shared/notifications.ts` + `src/lib/notifications.ts`, o un
archivo espejo). Si un evento no tiene override, se usa el default del catálogo.

---

## 4. Taxonomía: qué puede editar cada quién

Niveles:

- 🟢 **Libre** — el cliente SaaS edita asunto y cuerpo completos, con "Restaurar original".
- 🟡 **Parcial** — edita saludo, intro y firma. El bloque funcional (código, botón,
  enlace, aviso de expiración) lo renderiza el sistema y no se puede romper.
- 🔵 **Solo interruptor** — el contenido es dinámico o diagnóstico. Solo se elige
  si se recibe y quién lo recibe.
- 🔴 **Fijo** — comunicación de la plataforma Acros con su cliente SaaS. No se toca.

### 📅 Calendario

| Evento | Canal | Para quién | Nivel |
|---|---|---|---|
| Cita agendada — confirmación | email + WA | contacto | 🟢 |
| Cita agendada — aviso interno | push + email | negocio / staff | 🟢 |
| Recordatorio X antes | email + WA | contacto o negocio | 🟢 |
| Seguimiento X después | email + WA | contacto o negocio | 🟢 |
| Cita cancelada / reprogramada | email + WA | ambos | 🟢 *(no existe hoy — hueco)* |

Es exactamente tu ejemplo, y es el caso más claro de todos.

### 📋 Formularios

| Evento | Canal | Para quién | Nivel |
|---|---|---|---|
| Confirmación de envío | email + WA | contacto | 🟢 |
| Nuevo lead recibido | push + email | negocio / staff | 🟢 |

### 💰 Ventas y pagos

| Evento | Canal | Para quién | Nivel |
|---|---|---|---|
| Venta confirmada | push | negocio | 🟢 |
| Pago pendiente de revisión | push | negocio | 🔵 (es operativo, el monto y el motivo los pone el sistema) |
| Entrega de producto digital | email + WA | cliente final | 🟡 (el enlace de descarga y su caducidad los pone el sistema) |
| Recordatorio de renovación | email | cliente final | 🟢 |
| Cliente quiere comprar sin método de pago | push | negocio | 🔵 |

### 🎓 Cursos

| Evento | Canal | Para quién | Nivel |
|---|---|---|---|
| Código OTP de acceso | email | cliente final | 🟡 **el código y su caducidad son intocables** |
| Invitación al curso | email | cliente final | 🟢 |
| Cambio de URL del curso | email | cliente final | 🟡 *(función muerta hoy)* |

### 📦 Inventario

| Evento | Canal | Para quién | Nivel |
|---|---|---|---|
| Stock bajo / agotado | push | negocio | 🟢 *(función muerta hoy — reconectar)* |

### 🤖 Agente IA / WhatsApp

| Evento | Canal | Para quién | Nivel |
|---|---|---|---|
| Mensaje nuevo de un cliente | push | negocio + staff | 🔵 |
| Conversación transferida a humano | push | negocio + staff | 🔵 |
| Conversación pausada por límite | push | negocio + staff | 🔵 |
| Mensajes que el agente le manda al cliente | WA | cliente final | ⛔ **fuera de alcance** |

La última fila importa: el contenido que el Agente IA envía a los clientes ya se
edita en Flujos, Secuencias, Plantillas y Envíos. **Comunicaciones no debe
intentar absorberlo** — solo cubre email + push. Si no, hay dos sitios para lo
mismo.

### 🔑 Acceso al CRM

| Evento | Canal | Para quién | Nivel |
|---|---|---|---|
| Invitación de staff | email | staff del negocio | 🟡 (el magic link es del sistema) |
| Invitación SaaS (alta manual o por formulario) | email | cliente SaaS nuevo | 🔴 la manda Acros |
| Restablecer contraseña | email | cualquiera | 🔴 |

### 🛠️ Plataforma Acros

| Evento | Nivel |
|---|---|
| Alertas de `wa-health-check` | 🔴 solo admin, nadie más las ve |
| Tickets de soporte | 🔴 |
| Facturación / avisos de servicio | 🔴 |

---

## 5. Lo que hay que proteger sí o sí

Estas reglas son las que evitan que "dejar editar" se convierta en soporte:

1. **Variables obligatorias.** Cada evento declara `requiredVars` en el catálogo.
   Si el cuerpo de "Código OTP" pierde `{{code}}`, **no se guarda** y se explica
   por qué. Sin esto, un cliente rompe su propio flujo de acceso y no hay forma
   de saberlo hasta que alguien se queja.
2. **Bloque funcional fuera del textarea.** En los 🟡, el código / botón / enlace
   no está *dentro* del cuerpo editable: el sistema lo inserta después del texto
   del cliente. Así no hay nada que romper.
3. **Pie legal siempre del sistema.** "Mensaje automático, no respondas" +
   identificación del remitente. Nadie lo edita.
4. **Sin baja masiva encubierta.** Estos son emails transaccionales. Si mañana
   alguien usa "Recordatorio de renovación" como boletín, hace falta
   desuscripción. Vale la pena dejar el aviso escrito en la UI desde el día uno.
5. **Longitud de push.** Título ≤ 50 y cuerpo ≤ 120 caracteres, truncado y con
   contador en el editor (hoy el corte es silencioso: `body.slice(0, 120)`).

---

## 6. Cómo lo abordaría — fases

### Fase 0 — Limpieza (antes de tocar nada)

- Borrar `notify-sale`, `notify-stock-alert`, `notify-course-url-change` o
  reconectarlas. No listar en la UI eventos que no existen.
- Quitar de `CATEGORIES` los emails inventados que no corresponden a ningún envío
  real.

### Fase 1 — Catálogo + una categoría de punta a punta

- `_shared/notifications.ts`: el catálogo (event_key, canales, variables,
  `requiredVars`, defaults, nivel de edición).
- Tabla nueva:

  ```sql
  create table crm_notification_settings (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references auth.users(id) on delete cascade,
    event_key   text not null,
    channel     text not null check (channel in ('email','push','whatsapp')),
    enabled     boolean not null default true,
    subject     text,          -- asunto de email / título de push
    body        text,
    updated_at  timestamptz not null default now(),
    unique (user_id, event_key, channel)
  );
  ```

  RLS por `user_id` con el mismo patrón de owner/staff que el resto (ojo con los
  permisos de staff: solo el dueño debería editar textos).
- Helper `renderNotification(supabase, userId, eventKey, channel, vars)` que
  resuelve override → default → variables. **Todas** las funciones lo usan.
- Migrar **solo Calendario** completo: confirmación al agendar, aviso interno,
  recordatorio antes, seguimiento después. Es tu ejemplo y valida el modelo.
- El editor de reglas del calendario deja de guardar texto inline: guarda
  `event_key` + variante. `crm_reminders` sigue congelando el texto al agendar
  (está bien: es el texto vigente al momento de la promesa).

### Fase 2 — Ruteo y preferencias personales

Es la fase con más valor por esfuerzo, e independiente del copy:

- `crm_notification_prefs (user_id, event_key, push_enabled)` — cada persona
  (dueño o staff) elige qué push recibe.
- Reemplazar el "dueño + todo el staff activo" hardcodeado de `whatsapp-webhook`
  y `ai-agent` por una consulta a esa tabla.
- UI: en Comunicaciones, pestaña "Mis notificaciones" (lo que yo recibo) separada
  de "Mensajes a mis clientes" (lo que reciben ellos). Son dos audiencias
  distintas y mezclarlas en la misma lista confunde.

### Fase 3 — Identidad del email (impacto visible inmediato)

- Remitente con el nombre del negocio: `Barón Group <noreply@acrossoftware.com>`
  en vez de `Acrosoft <…>`.
- El header del layout HTML toma `business_name` y, si existe, el logo y el color
  de la marca del tenant.
- Esto vale más para el cliente final que cualquier cambio de copy, y es de una
  tarde.

### Fase 4 — Resto de categorías

Cursos, Ventas, Inventario, Formularios, Acceso — cada una migrando su función al
helper del catálogo.

---

## 7. Cómo debería verse la sección

```
Comunicaciones
├── Mensajes a mis clientes        ← email + WA al contacto/cliente final
│   ├── Calendario   (4 eventos)
│   ├── Formularios  (1)
│   ├── Ventas       (2)
│   └── Cursos       (3)
└── Mis notificaciones             ← push + email al dueño y su equipo
    ├── Avisos del negocio         (cita nueva, lead, venta, stock)  🟢 editables
    └── Avisos del Agente IA       (mensajes, transferencias)        🔵 interruptores
```

Cada evento abre: vista previa (email renderizado / push simulada) → Editar →
Restaurar original. Los 🔵 solo muestran el interruptor y la lista de quién lo
recibe. Los 🔴 ni aparecen.

---

## 8. Decisiones abiertas

1. **¿Override único o variantes con nombre?** Recomiendo override único, con
   variantes solo en calendario y formularios.
2. **¿El staff puede editar textos?** Recomiendo que no: solo el dueño edita
   contenido; el staff sí gestiona sus propias preferencias de push.
3. **¿Texto congelado o vivo en `crm_reminders`?** Hoy se congela al agendar.
   Mantenerlo así es lo correcto, pero hay que decirlo en la UI: *"los cambios
   aplican a las citas que se agenden desde ahora"*.
4. **¿Idioma?** Todo está en español. Si algún cliente SaaS atiende en inglés, el
   override por tenant ya lo resuelve sin tocar el catálogo — no hace falta i18n.
