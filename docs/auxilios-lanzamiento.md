# Primeros Auxilios del Bebé — lanzamiento (`/auxilios-lp`, `/auxilios-ty`)

Producto: **Primeros Auxilios del Bebé (0 a 12 Meses)** — ebook + app de modo emergencia + 3 bonos. Pago único **US$25** (precio de lista tachado US$50), garantía de **7 días**.
La entrega es **solo la app** (`/primeros-auxilios-bebe-app`, contraseña compartida); el ebook y los 3 bonos están cifrados dentro de la pestaña Biblioteca. No hay ZIP.

| Pieza | Dónde |
|---|---|
| Landing | `/auxilios-lp` → `src/pages/AuxiliosLp.tsx` |
| Thank-you | `/auxilios-ty?session_id=…` → `src/pages/AuxiliosTy.tsx` (privada, `noindex`) |
| Config pública (pixel, precio, link) | `src/lib/auxiliosConfig.ts` |
| Entrega | `supabase/functions/auxilios-get-order/` + entrada `auxilios` en `supabase/functions/_shared/ebook-catalog.ts` |
| Webapp | `/primeros-auxilios-bebe-app` (paquete cifrado en `public/primeros-auxilios-bebe-pack/`) |

**URL de la thank-you (producción):** `https://www.acrosoftlabs.com/auxilios-ty`
**Landing (producción):** `https://www.acrosoftlabs.com/auxilios-lp`

## Medición

| Evento | Dónde | Cuándo |
|---|---|---|
| `PageView` | landing y thank-you | al cargar |
| `ViewContent` (`value: 25`, `USD`, `content_ids: ["auxilios"]`) | landing | al cargar |
| `InitiateCheckout` (mismos parámetros) | landing | clic en **cualquier** CTA hacia el pago (hero, producto, secciones, final y sticky móvil) |
| `Purchase` (valor de la orden, `event_id` = `session_id` de Stripe) | thank-you | una sola vez por compra, solo cuando la orden ya existe en `ebook_orders` (la crea el webhook de Stripe al confirmar el pago) |
| `Purchase` por Conversions API | servidor (`stripe-webhook`) | mismo `event_id`: Meta deduplica navegador + servidor |
| `ViewContent` e `InitiateCheckout` por Conversions API | servidor (`auxilios-track-event`) | la landing genera un `event_id` y lo manda al pixel (`eventID`) y a la función: Meta deduplica. Valor, moneda y producto los fija el servidor |

- Pixel: `1209613534467929` (en `auxiliosConfig.ts` y en el catálogo; un test comprueba que coinciden).
- El valor del `Purchase` es el **neto** que cobra Stripe cuando está disponible (igual que TOEFL y DELF: `purchaseTrackingValue`), si no, el bruto. Es el mismo número de los dos lados para que la deduplicación funcione.
- El clic guarda `_fbp`/`_fbc` en `checkout_attribution` y manda su id a Stripe en `client_reference_id` (`auxilios_<uuid>`); el webhook lo usa para la Conversions API.

## Lo que hace falta de tu lado (en este orden)

### 1. Stripe
Payment Link: `https://buy.stripe.com/eVqbJ0bl8ceMgXw2TMbbG07`.
Stripe → Payment links → ese link → **Después del pago → "No mostrar página de confirmación" → Redirigir a tu sitio web**:

```
https://www.acrosoftlabs.com/auxilios-ty?session_id={CHECKOUT_SESSION_ID}
```

Comprueba que el precio del link sea **US$25** y que el webhook de Stripe ya incluya `checkout.session.completed` (el mismo que usa TOEFL).

### 2. Secrets de Supabase (Dashboard → Edge Functions → Secrets, o `supabase secrets set`)
| Secret | Valor |
|---|---|
| `PRIMEROS_AUXILIOS_BEBE_APP_PASSWORD` | la contraseña de `Info/accesos.md` (la misma con la que se cifró la app) |
| `META_CAPI_ACCESS_TOKEN_AUXILIOS` | el token de la API de Conversiones del pixel `1209613534467929` |
| `META_CAPI_TEST_EVENT_CODE_AUXILIOS` | (opcional, solo para probar; quítalo después) código de "Test events" |
| `AUXILIOS_PAYMENT_LINK_IDS` | (opcional) el id `plink_…` del Payment Link |

El token **no va en el repo, ni en Vercel, ni en el chat.** (Si ya lo pegaste en un chat, considera regenerarlo en Events Manager.)

### 3. Despliegue (no se hizo; lo haces tú o lo pides)
```bash
supabase functions deploy stripe-webhook auxilios-get-order auxilios-track-event
# frontend: push a la rama que despliega Vercel
```
El cambio en `ebook-catalog.ts` / `ebook-order.ts` / `stripe-webhook` es compartido con DELF y TOEFL: los tests (`deno test --allow-read supabase/functions/_shared/`) confirman que su comportamiento no cambió. Revisa el diff antes de desplegar.

**`auxilios-track-event`** (pública, `verify_jwt = false`): lista cerrada de eventos (`ViewContent`, `InitiateCheckout`), solo acepta `Origin` de `acrosoftlabs.com`, `source_url` de `/auxilios-lp`, `event_id` con formato estricto y 30 peticiones/min por IP. Usa el mismo secret `META_CAPI_ACCESS_TOKEN_AUXILIOS`. Para probar: pon `META_CAPI_TEST_EVENT_CODE_AUXILIOS`, abre la landing y mira en Events Manager → Test events un `ViewContent` de **navegador** y otro de **servidor** con el mismo `event_id` (deduplicado); luego quita el código.

### 4. Vercel
Solo variables `VITE_*` públicas (ya configuradas). La Biblioteca de la app solo ofrece **Descargar PDF** (verificado en producción); el visor «Ver» se quitó porque la CSP global bloquea los `blob:` en iframes y no hace falta tocarla.

### 5. Compra de prueba real (de punta a punta)
1. Abre `/auxilios-lp` con `?fbclid=test`, pulsa un CTA → llegas a Stripe con `client_reference_id=auxilios_<uuid>`.
2. Paga (tarjeta real o link de prueba) → Stripe redirige a `/auxilios-ty?session_id=…`.
3. La thank-you muestra el resumen, la **contraseña** y "Abrir mi app"; el correo llega con el mismo link y contraseña (sin ZIP ni botón de descarga).
4. Entra a la app con esa contraseña → pestaña Biblioteca → se abren el ebook y los 3 bonos.
5. Events Manager → Test events: **un** `Purchase` (navegador) y **un** `Purchase` (servidor) con el mismo `event_id`, mostrados como deduplicados.
6. `ebook_orders` tiene la fila con `product_slug = 'auxilios'` y `net_amount`.
7. Reembolsa esa compra de prueba en Stripe.

### 6. Meta Business
Dominio verificado y evento **Purchase** priorizado (Aggregated Event Measurement). Cuenta publicitaria con método de pago, página de Facebook e Instagram, sin restricciones. **Salud es categoría sensible:** sube los anuncios con 24 a 48 h de margen para la revisión.

## Garantía de 7 días (proceso)
La landing promete reembolso del 100% dentro de 7 días y **no muestra correo ni teléfono de soporte** (decisión del dueño). Falta definir cómo se pide el reembolso en la práctica (la landing dice "pides tu reembolso"): por ejemplo, responder al correo de confirmación de la compra. Si el remitente (`RESEND_FROM_EMAIL`) no recibe respuestas, hay que ponerle un `reply-to` o publicar un canal. Quien lo gestione hace el reembolso desde Stripe.

## A/B test de la landing (versión A completa vs. B corta)
- **Reparto:** 50/50 por visitante nuevo; cada persona conserva su versión (localStorage `auxilios_version`). A = landing completa; B = corta (sin subtítulo del hero, sin título «¿Te ha pasado antes?», lista corta con carita triste y checklist de ventajas con el título «La forma más fácil de estar siempre preparado es tener…» y la oferta en la misma sección). Desde la oferta hacia abajo ambas son idénticas.
- **Qué se guarda (tabla `ab_sessions`):** cada visita con `variants.auxilios_version = 'A' | 'B'`; el clic en un CTA marca `converted`; `/auxilios-ty` marca `purchased` solo cuando la **compra está confirmada** (la orden ya existe en `ebook_orders`). El pixel también lleva `ab_version` en `ViewContent` e `InitiateCheckout`.
- **Previsualizar sin contaminar datos:** `/auxilios-lp?v=A` o `/auxilios-lp?v=B` fuerza la versión y no registra nada.
- **Ver quién gana** (SQL Editor de Supabase, o `supabase db query --linked "<sql>"`):
```sql
select variant                                              as version,
       impressions                                          as visitas,
       conversions                                          as clics_checkout,
       purchases                                            as compras_confirmadas,
       round(100.0 * purchases / nullif(impressions, 0), 2) as compras_por_100_visitas
from ab_stats
where element_key = 'auxilios_version'
order by variant;
```
- **Límite conocido:** la compra se atribuye si la persona vuelve a `/auxilios-ty` en el **mismo navegador** que hizo clic (lo normal tras Stripe) y dentro de 3 días. Las compras en otro dispositivo no se asignan a ninguna versión; las ventas totales siguen en `ebook_orders`.
- **Cuándo decidir:** no cierres el test con pocas ventas; con conversiones de 1–3 % hacen falta del orden de 100 compras por versión para que la diferencia no sea ruido. Mira compras por visita, no clics.

## Seguimiento del embudo (visitas → clics → compras)
Cada carga de la landing guarda una fila en `ab_sessions` con `variants.auxilios_price = '25'`; el clic en un CTA marca `converted = true`.
```sql
select count(*) as visitas,
       count(*) filter (where converted) as clics_checkout
from ab_sessions
where variants ? 'auxilios_price';

select count(*) as compras, sum(amount_total)/100.0 as bruto_usd, sum(net_amount)/100.0 as neto
from ebook_orders where product_slug = 'auxilios';
```
La vista `ab_stats` (`where element_key = 'auxilios_price'`) da visitas y clics.
**CPA máximo:** con US$25 el margen es chico (descontando comisión de Stripe); define cuánto gastar por anuncio/ángulo (p. ej. 2 a 3 veces el precio) antes de decidir pausar o escalar.

## Imágenes (`public/auxilios/imagenes/`)
`hero-antes-despues.webp`, `mockup-ebook.webp`, `mockup-webapp.webp`, `mockup-bono-1.webp`, `-2`, `-3`, `mockup-bundle.webp` (KIE) y `app-inicio.webp`, `app-tarjeta.webp`, `app-quiz.webp` (capturas reales de la app).
