# Bandeja de entrada del webhook de WhatsApp — reintentos sin errores a Meta

> **Estado:** implementado y desplegado el 2026-08-17.
> **Decidido:** 2026-08-17, tras el incidente del 16/08.
>
> Queda **una tarea a propósito para más adelante**: eliminar la tabla vieja
> `crm_wa_webhook_dedup` y su cron. Ver §10. No borrarla hasta que la bandeja
> lleve días funcionando — mientras exista, volver atrás es trivial.
>
> Lo que sigue describe el diseño y el porqué de cada decisión. §10 recoge lo que
> se construyó de verdad y cómo verificarlo.

---

## 1. Por qué

El 16/08, una migración eliminó la columna `delay_hours` y dejó rotos dos
triggers que la leían. Durante **21 horas ninguna conversación nueva de WhatsApp
pudo crearse**. El webhook, al no poder guardar, descartaba el mensaje entero:
sin conversación no se guarda nada ni responde la IA.

**Se perdieron 70 leads de 89 que escribieron.** Ninguno dejó rastro: no se
pueden ver mensajes que nunca se guardaron.

Dos cosas fallaron, y son distintas:

| | Qué falló | Ya resuelto |
|---|---|---|
| **Detección** | Nadie se enteró en 21 h | ✅ Sí — `wa-health-check` avisa en 5 min |
| **Recuperación** | Lo perdido no se pudo recuperar | ❌ **No — es lo que hay que construir** |

Las alertas cubren lo urgente, pero si algo se rompe de madrugada, los mensajes
de esas horas se siguen perdiendo aunque te enteres al despertar.

## 2. La restricción que manda

**No se le devuelven errores a Meta.** Nunca.

La solución "obvia" sería responder un código de error para que Meta reintente
la entrega. Se descartó por decisión de Daniel, y con razón: Meta vigila la salud
del endpoint, y fallos sostenidos pueden hacer que **limite o bloquee las cuentas
de WhatsApp de los clientes SaaS**. Una cuenta bloqueada es peor que perder los
mensajes de un día.

**Conclusión: el reintento lo hacemos nosotros, no Meta.**

## 3. El diseño

```
1. Meta avisa            → se valida la firma (igual que hoy)
2. Se guarda el aviso crudo como "pendiente"          ← NUEVO
3. Se responde 200 a Meta                             ← IDÉNTICO A HOY
4. Se procesa en segundo plano (igual que hoy)
5. Sale bien → "hecho"   ·   Falla → sigue "pendiente"
6. Un cron cada minuto reprocesa los pendientes       ← NUEVO
```

**Meta ve exactamente lo mismo que hoy: siempre `200`.** Cero cambio en lo que
percibe, cero riesgo de bloqueo.

Aplicado al 16/08: los 92 mensajes se habrían quedado en la bandeja. Al arreglar
el trigger a las 23:21, el cron los habría procesado solos en minutos.

### Por qué casi no cuesta nada

La fila de la bandeja **sustituye a la de `crm_wa_webhook_dedup`**: misma clave
(`wa_message_id`), mismo número de escrituras que hoy. Solo se le añaden el
contenido del aviso y un estado.

### Dos hechos verificados que lo hacen viable

1. **`crm_wa_messages` tiene índice único parcial sobre `wa_message_id`**
   (`idx_wa_messages_wa_id`). Reprocesar un mensaje **no puede duplicarlo**: la
   idempotencia ya está garantizada por la base.
2. **El webhook ya responde `200` antes de procesar.** `handlePost` llama a
   `processPayload(...)` sin `await` y devuelve 200 de inmediato. Meta ya no sabe
   si el procesamiento salió bien, así que guardar el aviso no cambia nada de
   cara a Meta.

---

## 4. Estado actual del código

**Archivo:** `supabase/functions/whatsapp-webhook/index.ts`

| Función | Línea aprox. | Qué hace |
|---|---|---|
| `handlePost` | 91 | Valida firma, lanza `processPayload` sin await, responde 200 |
| `processPayload` | 188 | Recorre entries/changes; actualiza `statuses`; recorre `value.messages` llamando a `handleIncomingMessage` |
| `handleIncomingMessage` | 230 | Una rama por tipo de mensaje |
| `upsertConversation` | 449 | Crea/actualiza la conversación. **Aquí falló el 16/08** |

**Las 5 inserciones de deduplicación** están al principio de cada rama de
`handleIncomingMessage`:

| Línea | Rama |
|---|---|
| 243 | `audio` / `voice` |
| 275 | `text` |
| 297 | `image` |
| 349 | `document` |
| 395 | `interactive` (botones) |

Todas con el mismo patrón:
```ts
const { error: dedupErr } = await supabase.from("crm_wa_webhook_dedup").insert({ wa_message_id: waMessageId });
if (dedupErr) return;
```

---

## 5. Pasos

### Paso 1 — Migración: crear la bandeja

```sql
create table crm_wa_inbox (
  wa_message_id  text primary key,
  tenant_user_id uuid not null references auth.users(id) on delete cascade,
  contact_name   text,
  payload        jsonb not null,          -- el objeto `msg` crudo de Meta
  status         text not null default 'pending'
                 check (status in ('pending','done','failed')),
  attempts       integer not null default 0,
  last_error     text,
  created_at     timestamptz not null default now(),
  processed_at   timestamptz
);

-- Índice para que el cron encuentre rápido lo que le toca reintentar
create index crm_wa_inbox_pendientes on crm_wa_inbox (created_at)
  where status = 'pending';

alter table crm_wa_inbox enable row level security;
-- Sin políticas: solo la escribe/lee el service role desde Edge Functions.
```

**Migrar la deduplicación existente** para no reprocesar mensajes viejos:

```sql
insert into crm_wa_inbox (wa_message_id, tenant_user_id, payload, status, processed_at)
select d.wa_message_id,
       (select user_id from crm_ai_agent_config limit 1),  -- da igual: ya están hechos
       '{}'::jsonb, 'done', d.processed_at
from crm_wa_webhook_dedup d
on conflict (wa_message_id) do nothing;
```

> ⚠️ Revisar el `tenant_user_id` de esa migración: como todas van con
> `status = 'done'` nunca se reprocesan, así que el valor no se usa. Pero la
> columna es `not null`. Alternativa más limpia: hacerla nullable.

**Después de verificar que todo funciona**, eliminar `crm_wa_webhook_dedup` y su
cron `cleanup-wa-webhook-dedup`, y crear el equivalente para la bandeja:

```sql
select cron.schedule('cleanup-wa-inbox', '15 3 * * 0',
  $$delete from crm_wa_inbox where status = 'done' and processed_at < now() - interval '30 days'$$);
```

### Paso 2 — El punto delicado: que los fallos se noten

**Esta es la parte que hay que hacer con más cuidado. Léela dos veces.**

Hoy `handleIncomingMessage` y sus ayudantes **no lanzan excepciones cuando
fallan**: hacen `return` en silencio.

```ts
const conv = await upsertConversation(tenantUserId, phone, contactName);
if (!conv) return;          // ← el 16/08 pasaba por aquí, 92 veces
```

Si se envuelve la llamada en un `try/catch` sin tocar esto, **el fallo parecería
un éxito** y la bandeja marcaría "hecho" un mensaje que se perdió. El bug
seguiría exactamente igual, pero con una tabla nueva dando falsa tranquilidad.

**Hay que convertir los caminos de fallo en excepciones**, o hacer que
`handleIncomingMessage` devuelva un booleano de éxito. Sitios a revisar:

- `upsertConversation` → devuelve `null` en error (línea ~470)
- Los 5 `if (!conv) return;` de cada rama
- Cualquier otro `return` temprano que signifique "no pude"

**Ojo:** hay `return` que significan "no aplica", no "fallé" — por ejemplo
ignorar mensajes de grupo (`@g.us`) o un tipo de mensaje no soportado. Esos
**deben marcarse "hecho"**, no reintentarse eternamente. Distinguir bien los dos
casos es el trabajo real de este paso.

### Paso 3 — Reclamar el mensaje en `processPayload`

En el bucle de `processPayload` (línea ~217), antes de llamar a
`handleIncomingMessage`:

```ts
for (const msg of value.messages ?? []) {
  if (esDeGrupo(msg)) continue;

  // Reclamar: la fila de la bandeja hace de deduplicación Y de respaldo.
  // - No existe        → se inserta 'pending' y se procesa
  // - Existe 'done'    → duplicado de Meta, se ignora
  // - Existe 'pending' → es un reintento, se vuelve a intentar
  const claim = await reclamarEnBandeja(msg, nameByPhone.get(msg.from) ?? null, tenantUserId);
  if (!claim) continue;

  try {
    await handleIncomingMessage(msg, ..., tenantUserId, isActive, accessToken);
    // marcar 'done' — ver Paso 4 para el momento exacto
  } catch (e) {
    await marcarFallo(msg.id, e);   // se queda 'pending' → lo reintenta el cron
  }
}
```

Y **eliminar las 5 inserciones de deduplicación** de `handleIncomingMessage`
(líneas 243, 275, 297, 349, 395), que quedan sustituidas por este reclamo único.

### Paso 4 — Dónde marcar "hecho" (evita respuestas duplicadas)

**Marcar "hecho" en cuanto el mensaje quede guardado en `crm_wa_messages`, NO al
terminar toda la función.**

Motivo: cada rama termina invocando al agente IA (`maybeInvokeAgent`). Si se
marcara "hecho" al final y algo fallara *después* de invocar a la IA, el
reintento **volvería a invocarla y el cliente recibiría dos respuestas**.

Con el corte en el punto correcto:
- Falla antes de guardar → se reintenta. Correcto: no se perdió nada.
- Falla después de guardar (p. ej. la IA) → no se reintenta. Correcto: el
  mensaje está a salvo en el CRM, y que la IA falle ya lo cubre la alerta
  `wa_ai_not_replying`.

### Paso 5 — El cron de reintentos

Nueva Edge Function `wa-inbox-retry`, `verify_jwt = false`, protegida con
`requireInternal` (ver `_shared/internal-auth.ts`). En `supabase/config.toml`
añadir su bloque, como las demás.

Lógica:

1. Leer hasta ~50 filas `status = 'pending'` con `created_at < now() - 2 minutos`
   (el margen evita competir con el procesamiento en vivo, que aún puede estar
   corriendo en segundo plano).
2. Descartar las que superen `attempts >= 5`: marcarlas `failed` y anotar un
   evento en `crm_wa_health_events` para que **wa-health-check avise**.
3. Por cada una: reprocesar y actualizar estado + `attempts`.

**Cómo reprocesar, del modo más seguro:** volver a enviar el `payload` guardado
al propio webhook, con una cabecera interna que salte la validación de firma
(no tenemos la firma original de Meta). Así se reproduce por **el mismo camino ya
probado en producción**, sin duplicar la lógica de procesamiento.

Requiere un pequeño cambio en `handlePost`: si la petición trae la cabecera
interna válida (service role key), saltar `verifySignature`. Es el mismo patrón
que ya usan `send-wa-campaign` y `send-wa-instant` con `requireInternalOrUser`.

Programar con pg_cron cada minuto, **copiando la cabecera de un job existente**
para no escribir el secreto a mano:

```sql
do $$
declare hdr text;
begin
  select substring(command from 'headers := (''\{.*?\}'')') into hdr
  from cron.job where jobname = 'process-wa-automations';
  perform cron.schedule('wa-inbox-retry', '* * * * *', format($f$
    select net.http_post(
      url := 'https://rhlnjtrbydwzzuvqayfo.supabase.co/functions/v1/wa-inbox-retry',
      headers := %s::jsonb, body := '{}'::jsonb);
  $f$, hdr));
end $$;
```

### Paso 6 — Alerta de mensajes descartados

En `wa-health-check`, añadir una detección: si hay filas `status = 'failed'`
(agotaron los 5 intentos), avisar. Son mensajes definitivamente perdidos y
merecen la máxima prioridad.

Encaja en el sistema existente: `severity: 'critical'`, con el nombre del cliente
SaaS vía `get_tenant_labels()`.

---

## 6. Cómo verificar

**Antes de tocar producción:** los pasos 1 y 2 son los que pueden romper cosas.
El resto es aditivo.

1. **Que no rompe el camino normal.** Escribir desde un WhatsApp real al número
   de pruebas (`+591 68484191` contra el WABA de Acrosoft). Comprobar que llega,
   se guarda, la IA responde, y la fila de la bandeja queda en `done`.

2. **Que la deduplicación sigue funcionando.** Reenviar el mismo `payload` al
   webhook dos veces: solo debe procesarse una vez.

3. **Que el reintento funciona de verdad.** Es la prueba que importa:
   - Romper `upsertConversation` a propósito (p. ej. renombrar temporalmente una
     columna en una transacción, o forzar un error controlado con una variable de
     entorno de prueba).
   - Escribir un mensaje desde el teléfono real.
   - Verificar: Meta recibió `200`, la fila quedó `pending`, y **nada llegó al
     chat**.
   - Deshacer la rotura.
   - Esperar al cron y verificar que el mensaje **aparece solo** en el chat, con
     su respuesta de la IA.

4. **Que no hay respuestas duplicadas.** Tras el reintento del punto 3, contar
   los mensajes de la IA en esa conversación: debe haber exactamente uno.

5. **Que Meta sigue viendo 200 siempre.** Revisar `net._http_response` y los
   logs del webhook: ningún código distinto de 200 durante toda la prueba.

## 7. Plan de reversa

Si algo va mal en producción:

1. **Desprogramar el cron:** `select cron.unschedule('wa-inbox-retry');` — corta
   los reintentos al instante sin tocar el webhook.
2. **Volver al webhook anterior:** los despliegues de Edge Functions guardan
   versiones; se puede volver a la anterior desde el dashboard de Supabase.
3. La tabla `crm_wa_inbox` puede quedarse: sin el cron, es solo un registro.

**No borrar `crm_wa_webhook_dedup` hasta que todo lleve días funcionando.**
Mientras exista, volver atrás es trivial.

## 8. Contexto útil

- El webhook ya responde `200` antes de procesar → guardar el aviso no cambia
  la latencia percibida por Meta.
- `crm_wa_messages.wa_message_id` es único (parcial, `where wa_message_id is not
  null`) → reprocesar no duplica mensajes.
- Las alertas de `wa-health-check` ya avisan en 5 minutos si algo se rompe;
  esto es lo que además lo **recupera**.
- Volumen actual: ~100-200 mensajes/día entre todos los clientes. El coste de
  guardar el payload es despreciable.

## 9. Lección del incidente que originó esto

Antes de eliminar cualquier columna, comprobar qué código de base de datos la
usa — `DROP COLUMN` no avisa de las funciones PL/pgSQL que la referencian, y
PL/pgSQL no valida su SQL hasta ejecutarlo:

```sql
select proname from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosrc ilike '%nombre_de_la_columna%';
```

Y tras cualquier migración destructiva, revisar `function_logs` filtrando por
`level = 'error'` durante unos minutos. Que la migración devuelva éxito no
significa que nada se haya roto.

---

## 10. Lo que se construyó (2026-08-17)

### Base de datos

| Objeto | Qué es |
|---|---|
| `crm_wa_inbox` | La bandeja. PK `wa_message_id`, `status` pending/done/failed, `attempts`, `last_error`, `payload` con el aviso crudo. RLS activo y sin políticas: solo service role. |
| índice `crm_wa_inbox_por_reintentar` | Parcial sobre `next_attempt_at where status='pending'` — lo que lee el cron. |
| índice `crm_wa_inbox_fallidos` | Parcial sobre `processed_at where status='failed'` — lo que lee la alerta. |
| cron `wa-inbox-retry` | Cada minuto: mira a quién le toca según `next_attempt_at`. |
| cron `cleanup-wa-inbox` | Domingos 03:20. Borra solo las `done` de más de 30 días; las `failed` se quedan como constancia. |

Las 3.441 filas de `crm_wa_webhook_dedup` se heredaron como `done` para no
reprocesar mensajes viejos. Su `tenant_user_id` es `null` a propósito: nunca se
reprocesan, así que no hace falta.

### Código

**`whatsapp-webhook/index.ts`** — los tres cambios que importan:

1. **Los fallos ahora se notan.** `upsertConversation` lanza en vez de devolver
   `null`, y guardar el mensaje se hace por `saveIncoming`, que lanza si la
   inserción falla. Antes ambos casos hacían `return` en silencio y el mensaje se
   perdía sin dejar rastro.
2. **Se distingue "fallé" de "no aplica".** Los caminos que significan "aquí no
   hay nada que hacer" (texto vacío, documento que no es PDF, tipo no soportado)
   llaman a `onSaved()` y quedan `done`. Si se reintentaran, darían vueltas para
   siempre.
3. **Se marca `done` justo al guardar**, dentro de `saveIncoming`, no al final de
   la función. Si se marcara al final, un fallo posterior a invocar a la IA haría
   que el reintento la invocase otra vez y el cliente recibiría dos respuestas.

Las 5 inserciones en `crm_wa_webhook_dedup` desaparecieron: las sustituye un
único `claimInbox()` en `processPayload`.

**Dos decisiones de fallo que conviene recordar:**

- Si `claimInbox` no puede escribir por un motivo que no sea conflicto de clave,
  **se procesa igual** y se anota `inbox_claim_failed`. Perder el mensaje es peor
  que arriesgar un reproceso, y el índice único de `crm_wa_messages` impide que
  se duplique.
- Si al guardar salta un `23505`, el mensaje ya estaba guardado: se marca `done`
  y **no se invoca a la IA**. Es lo que evita la respuesta doble en un reproceso.

**`wa-inbox-retry/index.ts`** (nueva) — lee hasta 20 mensajes a los que ya les
toca y les reenvía el aviso al propio webhook con el service role key. Reprocesa
por el mismo camino probado en producción en vez de duplicar la lógica. Descarta
tras 8 intentos y deja constancia en `crm_wa_health_events`.

El intento **se cuenta antes de lanzarlo**: si el webhook ni siquiera arranca, el
contador sube igual y el mensaje no se queda dando vueltas para siempre.

#### Los reintentos van escalonados, y esa es la parte importante

**2 min → 5 min → 15 min → 1 h → 3 h → 6 h → 12 h → 24 h.** En total la bandeja
aguanta unas **46 horas** de avería.

La primera versión reintentaba cada minuto con un tope de 5 intentos, lo que daba
una ventana de ~7 minutos. Suena razonable hasta que se comprueba contra el caso
que originó todo esto: **el incidente del 16/08 duró 21 horas**. Con aquella
cadencia, cada mensaje habría agotado sus intentos en los primeros siete minutos
y habría acabado en `failed`. La bandeja habría guardado los mensajes para
después tirarlos — el aviso habría llegado, pero los 70 leads se habrían perdido
igual.

El escalonado también evita machacar cada minuto un sistema que ya está caído.

`next_attempt_at` lleva la cuenta. Su valor por defecto en la base es
`now() + 2 minutos`, así que el webhook no tiene que acordarse de fijarlo y
ninguna fila puede quedar fuera de la cadencia por descuido.

> Detalle que costó una corrección: tras el ÚLTIMO intento, `next_attempt_at` se
> pone en "ya" en vez de sumar otra espera. Si no, la fila esperaría 24 horas más
> antes de descartarse y el aviso de mensaje perdido llegaría un día tarde.

**`whatsapp-webhook` acepta replay interno**: si la petición trae el service role
key se salta la verificación de firma, porque no tenemos la firma original de
Meta. Meta jamás manda ese key, así que desde fuera sigue siendo imposible entrar
sin firma válida. En ese caso el webhook **espera** a terminar el procesamiento,
para que quien reintenta sepa el resultado — con Meta no se espera, como siempre.

**`wa-health-check`** — sexta detección, `wa_inbox_discarded`: avisa de mensajes
que agotaron los 5 intentos. Son pérdidas definitivas y piden actuar a mano.

### El simulacro de fallo

`whatsapp-webhook` lee el secreto opcional **`WA_TEST_FAIL_TARGET`**, con el
formato exacto `<tenant_user_id>:<telefono>`. Si coincide, lanza un error a
propósito.

Existe para poder comprobar que la bandeja retiene y reintenta de verdad **sin
romper nada**: cualquier otro número sigue su curso normal, y sin el secreto el
código es inerte. El tenant va en la clave a propósito — un mismo teléfono puede
tener conversación abierta con varios clientes SaaS a la vez, y filtrar solo por
número afectaría a todas.

```bash
npx supabase secrets set WA_TEST_FAIL_TARGET=<tenant_user_id>:59168484191  # activar
npx supabase secrets unset WA_TEST_FAIL_TARGET                             # desactivar
```

Conviene además **pausar el cron durante la fase de retención**, o a los ~7
minutos el mensaje agota los 5 intentos y se descarta solo:

```sql
select cron.alter_job((select jobid from cron.job where jobname='wa-inbox-retry'), active := false);
```

> Tras cambiar el secreto hay que **volver a desplegar** el webhook para que los
> isolates nuevos lo recojan.

### Qué queda pendiente a propósito

Eliminar `crm_wa_webhook_dedup` y su cron `cleanup-wa-webhook-dedup`. Nada los
usa ya, pero se dejan como red de seguridad: mientras existan, volver atrás es
trivial. Hacerlo cuando la bandeja lleve días funcionando.
