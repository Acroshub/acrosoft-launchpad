# Auditoría de seguridad — 2026-08-16

Alcance: Login/sesiones, RLS y multi-tenancy, Edge Functions, Storage, headers HTTP.
Proyecto Supabase: `rhlnjtrbydwzzuvqayfo`.

Los hallazgos marcados **[CONFIRMADO]** se verificaron ejecutándolos contra producción.
Los marcados **[LATENTE]** no son explotables hoy, pero se vuelven explotables con un cambio pequeño.

---

## Estado de remediación (mismo día)

| Id | Hallazgo | Estado |
|----|----------|--------|
| C-1 | Secreto de sesiones de cursos hardcodeado | ✅ **Eliminado por rediseño** — ya no existe ningún secreto |
| A-1 | Subida anónima ilimitada a bucket público | ✅ Corregido y verificado |
| A-2 | Escritura cruzada entre tenants en Storage | ✅ Corregido y verificado |
| A-3 | Staff sin permisos controla calendarios/formularios | ✅ Corregido |
| M-1 | `wa-media` público | ⚠️ **Parcial** — límites aplicados; privatización pendiente (ver nota) |
| M-2 | `send-support-email` sin autenticación | ✅ Corregido y verificado |
| M-3 | Policies anon latentes en citas/bloqueos | ✅ Eliminadas |
| M-4 | Flujo implícito en vez de PKCE | ✅ Corregido |
| M-5 | Protección de contraseñas filtradas | ⏸️ Requiere toggle en el Dashboard (no hay API) |
| M-6 | `request-course-access` sin rate limit | ✅ Corregido (por IP y por email+curso) |
| M-7 | Falta `frame-ancestors` | ✅ Corregido (+ se quitó `unsafe-eval`) |
| B-1 | `ab_stats` SECURITY DEFINER | ✅ Ahora `security_invoker=on` |
| Bugs | `crm_staff_has_perm`, perm `write`, comprobantes | ✅ Los tres corregidos |

**Nota sobre M-1:** `wa-media` guarda sólo multimedia **entrante**. La saliente va por
`form-uploads`/`chat-attachments` y **tiene que seguir siendo pública** porque Meta descarga
los archivos por URL. Como `crm_wa_messages.media_url` mezcla ambos orígenes, privatizar
`wa-media` obliga a distinguir el bucket por URL en cada punto de render del inbox y a montar
una capa de URLs firmadas con caché. Es un refactor con riesgo real sobre la bandeja de
WhatsApp en producción, así que se deja fuera de esta tanda. Mitigación aplicada: límite de
10 MB y lista blanca de MIME. Riesgo residual: las rutas son `{uuid}/{uuid}/{wa_id}` (no
enumerables, no listables), así que la exposición requiere conocer la URL exacta.

---

## 🔴 CRÍTICO

### C-1. El secreto que firma las sesiones de cursos está hardcodeado en el repo **[CONFIRMADO]**

`supabase/functions/get-course-content/index.ts:6` y `verify-course-magic-link/index.ts:6`:

```ts
const SESSION_SECRET = Deno.env.get("COURSE_SESSION_SECRET") ?? "course-session-secret-fallback";
```

**`COURSE_SESSION_SECRET` no está configurado en producción.** Verificado: firmé un JWT con
la cadena `course-session-secret-fallback` y el endpoint lo aceptó como válido — respondió
`403 "Acceso revocado"` (fallo en el lookup de DB, es decir *después* de validar la firma) en
lugar de `401 "Sesión inválida o expirada"` (fallo de firma).

**Impacto:** el magic link por email queda anulado como factor de autenticación. Cualquiera
puede emitirse un `session_token` para el par (email, course_id) que quiera y leer el curso
completo — lecciones, contenido, `bunny_video_id`, adjuntos — sin recibir nunca el correo.
Los `course_id` son públicos: la policy `anon_read_published_courses` deja leer `crm_courses`
a anónimos. Sólo hace falta el email de alguien matriculado.

**Fix (en este orden):**

1. Generar y configurar el secreto:
   ```bash
   openssl rand -base64 48
   npx supabase secrets set COURSE_SESSION_SECRET='<valor generado>'
   ```
2. Eliminar el fallback en ambos archivos para que la función falle en arranque, no en silencio:
   ```ts
   const SESSION_SECRET = Deno.env.get("COURSE_SESSION_SECRET");
   if (!SESSION_SECRET) throw new Error("COURSE_SESSION_SECRET no configurado");
   ```
3. Redesplegar `get-course-content` y `verify-course-magic-link`.

Rotar el secreto invalida las sesiones de curso vigentes: los alumnos tendrán que pedir un
nuevo magic link. Es el comportamiento correcto y deseable aquí.

---

## 🟠 ALTO

### A-1. Subida anónima ilimitada a un bucket público (`form-uploads`)

```
Policy "Anon upload form-uploads": INSERT TO PUBLIC WITH CHECK (bucket_id = 'form-uploads')
```

El bucket es `public = true`, admite 50 MB por archivo y tipos como `application/zip`,
`x-rar-compressed`, `x-7z-compressed`, vídeo y ofimática. La anon key es pública (está en el
bundle). Resultado: **cualquiera en internet puede subir archivos arbitrarios, sin límite de
cantidad, y servirlos desde tu dominio de Storage.** Hosting gratuito de malware/phishing con
tu marca, más un DoS de costes de almacenamiento.

**Fix:** el bucket lo usan también flujos autenticados (cursos, secuencias, fotos del agente),
así que hay que acotar el anónimo a un prefijo propio y dejar el resto a usuarios logueados.

```sql
DROP POLICY "Anon upload form-uploads" ON storage.objects;

-- Anónimo: sólo bajo submissions/, para adjuntos de formularios públicos
CREATE POLICY "anon_upload_form_submissions" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'form-uploads' AND (storage.foldername(name))[1] = 'submissions');

-- Autenticados: el resto del bucket
CREATE POLICY "auth_upload_form_uploads" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'form-uploads');
```

Requiere que `FormRenderer.tsx` (~línea 442) suba a `submissions/...`. Además conviene bajar
`file_size_limit` y recortar `allowed_mime_types` (quitar zip/rar/7z si no se usan).

### A-2. Cualquier usuario autenticado escribe en la carpeta de otro tenant

```
"auth users can upload chat attachments": INSERT WITH CHECK (bucket_id = 'chat-attachments')
"authenticated can upload proofs":        INSERT WITH CHECK (bucket_id = 'payment-proofs')
```

Ninguna de las dos ata la ruta al `auth.uid()`, aunque el resto de policies del proyecto sí lo
hacen. `chat-attachments` además es un bucket **público**. Un usuario de cualquier tenant puede
plantar archivos dentro de la carpeta de otro y, en el caso de comprobantes de pago, sembrar
justificantes falsos.

**Fix (`chat-attachments` ya usa el patrón `{user.id}/...`, así que es directo):**

```sql
DROP POLICY "auth users can upload chat attachments" ON storage.objects;
CREATE POLICY "auth users can upload chat attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
```

`payment-proofs` sube hoy a una ruta plana (`CrmVentas.tsx:86`: `${Date.now()}-${random}.ext`),
así que hay que anteponer `${user.id}/` en el cliente antes de aplicar la policy equivalente.

> Nota aparte: `CrmVentas.tsx:89` llama a `getPublicUrl()` sobre `payment-proofs`, que es un
> bucket **privado**. Esa URL no resuelve; para mostrar el comprobante hace falta
> `createSignedUrl()`.

### A-3. Staff sin permisos controla calendarios y formularios del dueño

Las 4 policies de staff sobre `crm_calendar_config` y las 4 sobre `crm_forms` sólo comprueban
`status = 'active'` — **no miran `perm_calendarios` ni `perm_formularios`**, a diferencia del
resto de tablas. Un empleado con todos los permisos desactivados puede leer, crear, editar y
borrar calendarios y formularios.

Agravante: `crm_calendar_config` guarda `google_token`, el token OAuth de Google Calendar del
dueño. Cualquier staff activo puede leerlo.

**Fix:**

```sql
-- Calendarios
DROP POLICY "Staff lee calendarios del dueno"     ON crm_calendar_config;
DROP POLICY "Staff crea calendarios del dueno"    ON crm_calendar_config;
DROP POLICY "Staff edita calendarios del dueno"   ON crm_calendar_config;
DROP POLICY "Staff elimina calendarios del dueno" ON crm_calendar_config;

CREATE POLICY "Staff lee calendarios del dueno" ON crm_calendar_config FOR SELECT USING (
  user_id IN (SELECT owner_user_id FROM crm_staff
              WHERE staff_user_id = auth.uid() AND status = 'active'
                AND (perm_calendarios ->> 'read')::boolean = true));

CREATE POLICY "Staff crea calendarios del dueno" ON crm_calendar_config FOR INSERT WITH CHECK (
  user_id IN (SELECT owner_user_id FROM crm_staff
              WHERE staff_user_id = auth.uid() AND status = 'active'
                AND (perm_calendarios ->> 'create')::boolean = true));

CREATE POLICY "Staff edita calendarios del dueno" ON crm_calendar_config FOR UPDATE USING (
  user_id IN (SELECT owner_user_id FROM crm_staff
              WHERE staff_user_id = auth.uid() AND status = 'active'
                AND (perm_calendarios ->> 'edit')::boolean = true));

CREATE POLICY "Staff elimina calendarios del dueno" ON crm_calendar_config FOR DELETE USING (
  user_id IN (SELECT owner_user_id FROM crm_staff
              WHERE staff_user_id = auth.uid() AND status = 'active'
                AND (perm_calendarios ->> 'delete')::boolean = true));
```

Lo mismo para `crm_forms` con `perm_formularios`.

Idealmente, además, mover `google_token` a una tabla aparte a la que el staff no llegue nunca.

---

## 🟡 MEDIO

### M-1. `wa-media` es un bucket público sin restricciones

Toda la multimedia de las conversaciones de WhatsApp de **todos los tenants** (fotos, audios y
documentos que envían los clientes) es legible por cualquiera que tenga la URL, sin autenticar.
Sin `file_size_limit` ni `allowed_mime_types`. No es enumerable (no hay policy de SELECT que
permita listar), pero las URLs viven en la DB y no caducan nunca.

**Fix:** pasar el bucket a privado y servir la multimedia con `createSignedUrl()` (TTL corto)
desde el CRM. Es un cambio con impacto en `CrmAgentIA.tsx`, conviene planificarlo.

### M-2. `send-support-email` no autentica al llamante

`supabase/functions/send-support-email/index.ts` sólo aplica rate limit por IP (10/h). Acepta
`ticketId` y `messageContent` arbitrarios y envía correo desde tu dominio a la contraparte del
ticket. El `ticketId` es un UUIDv4 (no adivinable), lo que limita mucho el riesgo, pero el
endpoint debería exigir el JWT del usuario y comprobar que el ticket es suyo.

### M-3. Policies anónimas latentes en citas y bloqueos **[LATENTE]**

```
crm_appointments  → anon SELECT USING (calendar_id IN (SELECT id FROM crm_calendar_config))
crm_blocked_slots → anon SELECT USING (calendar_id IN (SELECT id FROM crm_calendar_config))
```

Hoy no filtran nada: la subconsulta también pasa por RLS y `crm_calendar_config` no tiene policy
para `anon`, así que devuelve vacío. Verificado: `SET role anon` → 0 filas en ambas tablas.

Pero son una mina. El día que alguien añada una policy anon a `crm_calendar_config` (algo muy
natural para un widget público de reservas), **se filtran las citas de todos los tenants de
golpe** — contacto, fecha, servicio y notas. Las reservas públicas ya van por
`crm-calendar-book` con service role, así que estas policies no hacen falta.

```sql
DROP POLICY "Public can read appointments for valid calendars" ON crm_appointments;
DROP POLICY "Public can read blocked slots for valid calendars" ON crm_blocked_slots;
```

### M-4. Flujo de auth implícito en vez de PKCE

`src/lib/supabase.ts:11` crea el cliente sin `flowType`. El valor por defecto de supabase-js v2
es `implicit`, que entrega los tokens de recuperación y magic link en el **fragmento de la URL**
— queda en el historial del navegador y es más fácil de filtrar. Usáis magic links (staff,
clientes SaaS, cursos) y recuperación de contraseña, así que conviene PKCE:

```ts
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { flowType: 'pkce' },
})
```

### M-5. Protección de contraseñas filtradas desactivada en Supabase Auth

El advisor lo reporta. `src/lib/password-security.ts` lo compensa desde el cliente contra HIBP,
lo cual está bien pensado, pero es un control **client-side**: se salta llamando a
`auth.updateUser()` directamente. Es el compromiso consciente por estar en plan free — anotado
como aceptado, no como fallo.

### M-6. `request-course-access` sin rate limit

Endpoint anónimo que dispara correos. `crm_courses` expone `user_id` y `slug` a anónimos, así
que un atacante tiene todo lo necesario para bombardear de magic links a un alumno matriculado.
Añadir `check_rate_limit` por IP y por email, igual que en `reset-password`.

### M-7. Falta `frame-ancestors` en la CSP

`vercel.json` pone `X-Frame-Options: DENY` sólo en `/crm` y `/login`. Rutas autenticadas como
`/crm-setup` o el reproductor de cursos quedan sin protección de clickjacking. Añadir
`frame-ancestors 'none'` a la CSP global cubre todo y es el mecanismo moderno.

---

## 🔵 BAJO / higiene

| # | Hallazgo | Acción |
|---|---|---|
| B-1 | Vista `ab_stats` es SECURITY DEFINER y `anon` tiene SELECT — lee `ab_sessions` saltándose RLS. Sólo expone agregados de A/B testing. | `ALTER VIEW ab_stats SET (security_invoker = on)` o revocar a `anon`. |
| B-2 | `ab_sessions` y `ab_stats` tienen GRANT de UPDATE/DELETE/TRUNCATE a `anon`. RLS lo bloquea, pero los grants sobran. | `REVOKE` lo que no se use. |
| B-3 | Superadmin cableado por email (`e.daniel.acero.r@gmail.com`) en 8 policies y en `is_acrosoft_admin()`. | Migrar a un claim de rol o tabla de admins. |
| B-4 | `pg_net` instalada en el esquema `public`. | Mover a `extensions`. |
| B-5 | CSP con `'unsafe-eval'` y `'unsafe-inline'` en `script-src`. | `'unsafe-eval'` no hace falta en build de producción de Vite. |
| B-6 | `crm_stripe_config`, `rate_limit_hits`, `crm_wa_webhook_dedup`: RLS activo sin policies (deny-all). | Correcto — sólo acceso por service role. Sin acción. |

---

## ✅ Lo que está bien resuelto

Merece constancia, porque son las partes donde suele romperse un SaaS multi-tenant:

- **`crm_staff` está bien blindada.** El trigger `crm_staff_prevent_perm_escalation` cubre las 19
  columnas `perm_*` más `owner_user_id`, `staff_user_id`, `status`, `email` y `contact_id`. Un
  empleado no puede auto-concederse permisos ni reasignarse a otro tenant. El bypass por
  `app.crm_staff_trusted_update` no es alcanzable desde PostgREST.
- **`crm_client_accounts_guard`** impide que un cliente se reasigne a otro negocio o se
  reactive tras ser deshabilitado.
- **Webhook de WhatsApp**: HMAC-SHA256 con comparación en tiempo constante, y el `app_secret`
  se resuelve por tenant antes de verificar. Correcto.
- **`_shared/internal-auth.ts`**: el razonamiento de por qué `verify_jwt` no sirve (la anon key
  también es un JWT válido) es exacto, y la comparación contra el service key es en tiempo
  constante.
- **Autorización en Edge Functions**: `send-wa-campaign:118`, `send-wa-instant:268` y
  `sync-to-google:69` comprueban propiedad del recurso contra el `caller.userId`.
  `generate-magic-link` valida propiedad de la cuenta y el `redirect_to` contra el origen.
- **Login**: mensaje de error genérico (sin enumeración de usuarios), `reset-password` con rate
  limit de 5/IP/h y respuesta uniforme exista o no el email.
- **Secretos**: `.env` no está en git; sólo contiene claves públicas (anon key, VAPID pública,
  Google client ID).
- **Headers**: HSTS con preload, `nosniff`, Referrer-Policy y Permissions-Policy correctos.

---

## Bugs funcionales encontrados de paso

No son vulnerabilidades — fallan cerrado — pero están rompiendo features:

1. **`crm_staff_has_perm()` está rota.** Su `CASE` referencia `perm_ventas` y `perm_pipeline`,
   columnas que ya no existen en `crm_staff`. Verificado: lanza
   `ERROR 42703: column "perm_ventas" does not exist`. Como la usan las policies de
   `crm_contact_notes`, **cualquier staff que intente leer o crear notas de contacto recibe un
   error 500**. Hay que reescribir el `CASE` con las columnas actuales.

2. **Policy `Staff edita contactos del dueno` comprueba `perm_contactos ->> 'write'`**, pero la
   app escribe la acción como `'edit'` (`src/lib/permissions.ts:29`). La clave `write` no existe
   nunca, así que **ningún staff puede editar contactos**, tenga el permiso que tenga.

3. **`payment-proofs` usa `getPublicUrl()` sobre un bucket privado** (`CrmVentas.tsx:89`) — la
   URL guardada en `payment_proof_url` no resuelve. Debería ser `createSignedUrl()`.
