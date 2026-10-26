# Kit Llena tu Calendario de Piscinas — lanzamiento (`/piscinas-lp` → `/piscinas-up1` → `/piscinas-up2` → `/piscinas-ty`)

Producto: **Kit Llena tu Calendario de Piscinas** — 4 PDFs + 60 imágenes editables (ES/EN), ZIP. Pago único **US$30**, garantía **30 días**. Upsell 1: campaña publicitaria **US$100 único**. Upsell 2: gestión de anuncios **US$1,000/mes** (suscripción). Copy fuente: `CRASHING/Kit Clientes Piscinas/Info/copy-landings.md`.

> ## Pixel de Meta (hecho en el navegador) + API de Conversiones (pendiente: el token)
> **Pixel `4801611716791999`** (dado por Daniel, 2026-10-26) en `PISCINAS_PIXEL_ID` y en la entrada `piscinas` del catálogo (`meta` + `tracking`).
> **Navegador (ya activo):** `/piscinas-lp` → PageView, ViewContent (al cargar) e InitiateCheckout (en cada botón que lleva al checkout del kit, con `event_id`); `/piscinas-up1` y `/piscinas-up2` → PageView; `/piscinas-ty` → **Purchase del kit** (valor real de la orden, `event_id` = session_id, una vez por compra).
> **Upsells (decisión de Daniel, 2026-10-26):** `Purchase` = SOLO el kit (una venta por persona). Cada upsell es un evento **personalizado** con su valor: **`Upsell1Purchase`** ($100) al llegar a `/piscinas-up2?from=up1` y **`Upsell2Purchase`** ($1,000, primer mes) al llegar a `/piscinas-ty?up=2`; event_id `piscinas-up1-<session_id>` / `piscinas-up2-<session_id>`; una vez por compra (`localStorage`). Código: `src/lib/piscinasPixel.ts`. Las renovaciones mensuales no se reportan. En Ads Manager se leen como conversiones personalizadas (ver conversaciones: crear una por evento en Events Manager) y se suman al ingreso con una métrica personalizada.
> **Servidor (CAPI) — pendiente:** falta el token. Events Manager → pixel `4801611716791999` → Configuración → API de conversiones → Generar token de acceso → guardarlo como secret `META_CAPI_ACCESS_TOKEN_PISCINAS` en Supabase (no en el repo ni en el chat) y, solo para probar, `META_CAPI_TEST_EVENT_CODE_PISCINAS`. Sin el token `resolveMeta` devuelve `null` y el servidor no manda nada (el navegador sí). Con el token, `stripe-webhook` manda el Purchase del kit y `product-track-event` el ViewContent/InitiateCheckout de `/piscinas-lp` (solo esa ruta: `tracking.landingPath`). Los Purchase de los upsells hoy salen solo del navegador (mejora futura: mandarlos también por CAPI desde el webhook con el mismo event_id).
> Verificar en Events Manager → Test events.

## Piezas

| Pieza | Dónde |
|---|---|
| Landing | `/piscinas-lp` → `src/pages/PiscinasLp.tsx` (indexable) |
| Upsell 1 / Upsell 2 | `/piscinas-up1` → `PiscinasUp1.tsx`, `/piscinas-up2` → `PiscinasUp2.tsx` (`noindex`) |
| Thank-you | `/piscinas-ty` → `PiscinasTy.tsx` (`noindex`) |
| Config | `src/lib/piscinasConfig.ts` (links, precios, correo, formulario); `src/lib/piscinasFunnel.ts` (sessionStorage, `ab_*`) |
| CSS/iconos compartidos | `src/components/piscinas/` |
| Entrega | `supabase/functions/piscinas-get-order/` + entrada `piscinas` en `_shared/ebook-catalog.ts` + `[functions.piscinas-get-order] verify_jwt = false` en `supabase/config.toml` |
| Imágenes | `public/piscinas/`: `mockup-bundle.png`, `mockup-1-publicaciones.png`, `mockup-2-ofertas.png`, `mockup-3-reels.png`, `mockup-4-guia-llamada.png`, `antes-despues.jpg`. Si un archivo no existe, su bloque se oculta solo (no se rompe nada) |

## Flujo y sesión

```
/piscinas-lp  → clic (guarda atribución, ab_track) → Payment Link kit ?client_reference_id=piscinas_<uuid>
   └ pago → webhook: orden en ebook_orders (product_slug=piscinas) + email con /piscinas-ty?session_id=…
   └ redirect Stripe → /piscinas-up1?session_id={CHECKOUT_SESSION_ID}   (guarda sessionStorage piscinas_front_session)
/piscinas-up1 → «Sí» = Payment Link upsell 1 ?client_reference_id=piscinas-up1
   └ pago → redirect → /piscinas-up2?from=up1                            (marca sessionStorage piscinas_up1=bought)
   └ «No, gracias» → /piscinas-up2 (sin ?from=up1: el upsell 2 se muestra a todos)
/piscinas-up2 → «Sí» = Payment Link suscripción ?client_reference_id=piscinas-up2
   └ pago → redirect → /piscinas-ty?up=2                                 (marca piscinas_up2=bought)
   └ «No, gracias» → /piscinas-ty
/piscinas-ty  → session_id de la URL (correo) o de sessionStorage → piscinas-get-order → botón de descarga del ZIP
```

Si la persona abre `/piscinas-ty` sin sesión ve el estado amable «no-session». Las banderas de upsell viven en `sessionStorage` (misma pestaña): si compra y cierra la pestaña, el enlace del correo sigue dando la descarga pero no el bloque de onboarding (ver «Cumplimiento de los upsells»). Las páginas up1/up2 tienen una sola decisión (un «Sí» y un «No»). Para los futuros downsells (`/piscinas-dn1`, `/piscinas-dn2`) ya están `PISCINAS_DN1_PAYMENT_LINK`, `PISCINAS_DN2_PAYMENT_LINK` y sus slugs en la config; faltan las páginas, las rutas y agregar sus slugs a `SERVICE_ORDERS` del catálogo.

## Cómo previsualizar las páginas

Con el dev server (`http://localhost:8080`; la vista previa de la thank-you solo existe en desarrollo, en producción `?demo=1` se ignora):

| Página | URL |
|---|---|
| Landing | `/piscinas-lp` |
| Upsell 1 | `/piscinas-up1` |
| Upsell 2 | `/piscinas-up2` = versión de quien NO compró el upsell 1 (texto y diagrama de 2 tarjetas); `/piscinas-up2?from=up1` = versión de quien SÍ compró (diagrama de 3 tarjetas). La marca `piscinas_up1` queda en sessionStorage de esa pestaña: para volver a ver la otra versión usa una pestaña nueva o `sessionStorage.removeItem("piscinas_up1")` |
| Thank-you real (sin compra) | `/piscinas-ty` → estado «no-session» |
| Thank-you demo, solo kit | `/piscinas-ty?demo=1` |
| Thank-you demo + upsell 1 | `/piscinas-ty?demo=1&up1=1` |
| Thank-you demo + upsell 1 y 2 | `/piscinas-ty?demo=1&up1=1&up2=1` |

La demo usa una orden simulada (no llama a `piscinas-get-order`, no dispara pixel ni `ab_*`); el botón de descarga no descarga nada y la thank-you ya no usa formulario ni `SUPPORT_EMAIL`: el contacto (WhatsApp +591 57697071 y daniel@acrosoftlabs.com) vive en `PISCINAS_TY_WHATSAPP` / `PISCINAS_TY_EMAIL`.

## 1. Stripe — 3 Payment Links (live) y redirecciones

Stripe → Payment links → cada link → Después del pago → «No mostrar página de confirmación» → Redirigir a tu sitio web:

| Link | Precio | Redirección | Se pega en |
|---|---|---|---|
| Kit | US$30 pago único | `https://www.acrosoftlabs.com/piscinas-up1?session_id={CHECKOUT_SESSION_ID}` | `PISCINAS_PAYMENT_LINK` |
| Upsell 1 (campaña) | US$100 pago único | `https://www.acrosoftlabs.com/piscinas-up2?from=up1` | `PISCINAS_UP1_PAYMENT_LINK` |
| Upsell 2 (gestión) | US$1,000/mes (suscripción) | `https://www.acrosoftlabs.com/piscinas-ty?up=2` | `PISCINAS_UP2_PAYMENT_LINK` |

Mientras un link esté vacío en `piscinasConfig.ts`, su botón registra el clic y no navega. Pega además los `plink_…` como respaldo (secrets opcionales, ver §3).

## 2. Entrega por ZIP — HOY: enlace de Google Drive (`PISCINAS_ZIP_URL`)

Decisión de Daniel (2026-10-26): el bucket `ebook-deliverables` tiene tope de 100 MB y subirlo cuesta plan; la entrega usa el secret `PISCINAS_ZIP_URL` = `https://drive.usercontent.google.com/download?id=<ID del archivo de Drive>&export=download&confirm=t` (descarga directa, sin la página de aviso de virus). El archivo de Drive debe estar compartido como «Cualquier persona con el enlace». Riesgo: Drive limita las descargas masivas de un mismo archivo («demasiadas descargas»); si pasa, mover el ZIP a un CDN (Bunny/R2) y cambiar el secret. Lo de abajo describe la opción por bucket, por si algún día se sube el límite.

## 2b. (Alternativa) Entrega por ZIP en el bucket

ZIP: `CRASHING/Kit Clientes Piscinas/Kit-Conseguir-Clientes-Piscinas.zip` (**~105 MB**, 68 archivos). Ruta esperada en el bucket privado `ebook-deliverables`: `piscinas/Kit-Conseguir-Clientes-Piscinas.zip` (Dashboard → Storage → carpeta `piscinas` → subir solo el .zip).

**Riesgo:** el límite por archivo de Supabase Storage puede impedir subirlo (plan gratis ≈ 50 MB; revisa Storage → Settings → «Upload file size limit» y el límite del bucket, que en TOEFL se fijó en 100 MB: **este ZIP lo supera**). Opciones:
1. Subir el límite del proyecto/bucket (plan Pro) y reintentar.
2. Comprimir más las imágenes (60 PNG de ~1.5 MB; convertir a PNG optimizado/JPG de calidad alta, o bajar a menos de 50 MB) y regenerar el ZIP.
3. Hospedar el ZIP donde prefieras (otro bucket/CDN, Drive no recomendado) y poner su URL `https://…` en el secret `PISCINAS_ZIP_URL`: `piscinas-get-order` la devuelve tal cual (sin firmar).
`storagePath` es configurable sin tocar código con el secret `PISCINAS_ZIP_PATH` (ruta dentro del bucket). Si el ZIP no está, la thank-you muestra «No pudimos preparar tu descarga» con «Reintentar» y el log de la función lo avisa.

## 3. Secrets de Supabase (los pones tú)

| Secret | Para qué |
|---|---|
| `PISCINAS_PAYMENT_LINK_IDS` | (opcional) `plink_…` del link del kit: respaldo para reconocer el producto |
| `PISCINAS_UP1_PAYMENT_LINK_IDS`, `PISCINAS_UP2_PAYMENT_LINK_IDS` | (recomendado) `plink_…` de los upsells: respaldo para que nunca se confundan con DELF |
| `PISCINAS_ZIP_URL` / `PISCINAS_ZIP_PATH` | (opcional) ver §2 |
| `META_CAPI_*_PISCINAS` | **pendiente** (ver arriba) |
| Existentes (no tocar) | `STRIPE_WEBHOOK_SECRET`, `STRIPE_RESTRICTED_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `APP_URL` |

## 4. Cambios en código compartido (revisar el diff antes de desplegar)

- `_shared/ebook-catalog.ts`: `meta` pasa a opcional (`resolveMeta` devuelve `null` sin `meta`); entrada `piscinas`; nuevo `SERVICE_ORDERS` (`piscinas-up1`, `piscinas-up2`).
- `_shared/ebook-order.ts`: `resolveProductSlug` reconoce los servicios (por `client_reference_id` o id de Payment Link) sin cambiar el orden para DELF/TOEFL/auxilios; nuevo `isServiceOrder`.
- `stripe-webhook`: si la compra es un servicio, **registra en el log y responde 200** (sin email, sin `ebook_orders`, sin CAPI). Sin esto, un Payment Link de upsell sin pista habría caído en DELF (producto por defecto) y enviado el email equivocado.
- Tests: `deno test --allow-read supabase/functions/_shared/` (55 pasan, incluidos los de TOEFL/auxilios sin cambios).
- Despliegue (lo haces tú): `supabase functions deploy stripe-webhook piscinas-get-order` + push del frontend.

## 5. Cumplimiento de los upsells (manual por ahora)

Los pagos de los upsells **no** crean orden ni mandan email: llegan al webhook, se ignoran con un log (`servicio sin entrega…`) y Stripe los muestra en Pagos/Suscripciones. Mientras tanto: (a) revisa Stripe cada día, (b) la thank-you indica a quien compró un servicio (en esa pestaña) que debe escribir por WhatsApp o correo para iniciar el onboarding (no hay formulario automático), (c) escribe al cliente con el correo de Stripe. Mejora futura: guardar la compra del servicio en una tabla y avisarte por correo.

## 6. Pendientes de Daniel

- [ ] 3 Payment Links y pegarlos en `piscinasConfig.ts` (+ redirecciones de §1)
- [ ] `PISCINAS_SUPPORT_EMAIL` (hoy vacío: se ocultan los botones/enlaces de ayuda; la guía 06d pide soporte humano con una persona encargada)
- [x] Onboarding sin formulario: WhatsApp/correo en la thank-you (`PISCINAS_TY_*`). `PISCINAS_ONBOARDING_FORM_URL` ya no se usa.
- [ ] Copiar las 6 imágenes a `public/piscinas/`
- [ ] Subir el ZIP (§2) y secrets (§3)
- [ ] **Pixel + CAPI** (sección destacada arriba)
- [ ] Definir `PISCINAS_LIST_PRICE` si quieres precio de lista tachado (`SHOW_LIST_PRICE` en `PiscinasLp.tsx`, hoy `false`) y decidir si hay una oferta con fecha real antes de activar `SHOW_TIMER` (hoy `false`)
- [ ] Reembolsos de 30 días: definir cómo se piden (la landing dice «nos escribes»)
- [ ] Compra de prueba real (kit, luego reembolso): fila `ebook_orders` con `product_slug='piscinas'`, correo con asunto «Descarga tu compra: Kit Llena tu Calendario de Piscinas», `/piscinas-ty` con descarga

## Seguimiento del embudo

```sql
select variants->>'piscinas_price' is not null as kit, count(*) as visitas, count(*) filter (where converted) as clics
from ab_sessions where variants ? 'piscinas_price' group by 1;
-- clics en los upsells: claves piscinas_up1_offer y piscinas_up2_offer (mismo formato)
select count(*) as compras, sum(amount_total)/100.0 as bruto_usd from ebook_orders where product_slug = 'piscinas';
```

## Versiones de landing (v1 / v2 / v3)

Las tres venden el mismo kit (US$30), con el mismo Payment Link y el mismo flujo posterior (`/piscinas-up1` → `/piscinas-up2` → `/piscinas-ty`). Se comparan por separado; no hay sorteo ni A/B automático. `/piscinas-lp2` y `/piscinas-lp3` están en `robots.txt` como `Disallow` mientras se comparan.

| Versión | Ruta | Qué es | Clave en `ab_sessions` |
|---|---|---|---|
| v1 | `/piscinas-lp` | Página corta (estructura de `/toefl`), sin VSL | `piscinas_price` |
| v2 | `/piscinas-lp2` | Página larga (estructura de 19 secciones, sin lo que no podemos cumplir): promesa, barra de amplificación, CTA, presentación, «qué obtendrás», demo con páginas reales de los PDFs (`public/piscinas/demo-*.jpg`), mockups + precio, garantía, resumen, FAQ, cierre y proceso de compra. Todos los botones compran. | `piscinas_v2_price` |
| v3 | `/piscinas-lp3` | Página de oferta bajo el VSL. **Un solo botón de compra** (debajo del VSL); todos los demás botones suben con scroll suave al VSL y no disparan `InitiateCheckout`. | `piscinas_v3_price` |

Configuración nueva: `src/lib/piscinasVersionsConfig.ts` (`VSL_URL` para la v2, `VSL_EMBED_URL`, `OFFER_REVEAL`, claves de medición, `SHOW_TIMER` / `SHOW_LIST_PRICE` apagados). Componentes nuevos: `VslSlot.tsx`, `PiscinasShared2.tsx`, `usePiscinasBuy.ts`, `piscinasStylesV2.ts`. Pixel/CAPI siguen siendo no-op mientras `PISCINAS_PIXEL_ID = ""`. Copy final: `CRASHING/Kit Clientes Piscinas/Info/copy-landing-v2.md` y `copy-landing-v3.md`.

Qué falta de la v3 (no se puede publicar sin esto):
- [ ] **Grabar el VSL** (guion con la skill `escribir-vsl`). Mientras `VSL_EMBED_URL` esté vacío la página muestra un recuadro «Espacio del VSL — aún no grabado».
- [ ] **Elegir el reproductor** (Biturbo u otro) y pegar su URL embebible en `VSL_EMBED_URL`.
- [ ] **Revelado de la oferta al decir el precio** (opcional): poner `OFFER_REVEAL = "on-price"`. La página escucha `window.dispatchEvent(new CustomEvent("piscinas:vsl-price"))` o `window.postMessage({ type: "piscinas:vsl-price" }, "*")`; el mecanismo exacto del reproductor lo define Daniel (TODO en `PiscinasLp3.tsx`). Por defecto es `"always"`.
- [ ] Botón de compra incrustado en el reproductor (si se usa Biturbo): hoy el botón de compra es el de la página, justo bajo el VSL. Si se cambia, el botón del reproductor debe llevar al mismo Payment Link con `client_reference_id`.
- [ ] Cuando exista el pixel, verificar con `verificar_pixel.mjs` adaptando el selector al único botón `a.js-buy` de la v3.

Medición por versión (visita y clic):
```sql
select key, count(*) as visitas, count(*) filter (where converted) as clics
from ab_sessions, jsonb_object_keys(variants) key
where key in ('piscinas_price','piscinas_v2_price','piscinas_v3_price') group by 1;
```

## Versión 4 de la landing (`/piscinas-lp4`)
Copia de la v1 (mismo contenido, misma medición con la clave `piscinas_v4_price`) con un **hero animado por scroll**: el hero queda fijado mientras se hace scroll y revela, en orden, (1) la imagen antes/después con el título, (2) los 3 checks, (3) los 3 párrafos del subtítulo uno por uno y (4) el CTA con los métodos de pago; después la página sigue normal. En móvil la imagen se contrae para dejar espacio al texto. Con «reducir movimiento» activado en el sistema, el hero se muestra completo y sin pin. Noindex (Disallow en robots.txt) mientras se compara con la v1.

## Cobro en un clic (upsells)

**Qué hace:** el cliente paga el kit (US$30); en `/piscinas-up1` toca «Sí» y se le cobra US$100 con la MISMA tarjeta, sin volver a escribirla; en `/piscinas-up2` igual (suscripción de US$1,000/mes). Si algo falla hay plan de reserva y nunca se cobra dos veces.

### Arquitectura
1. Los botones de compra de las 4 landings llaman a `startKitCheckout()` (`src/lib/piscinasCheckout.ts`): guarda la atribución de Meta (igual que antes), llama a la función `piscinas-create-checkout` y redirige a la `url` de Stripe Checkout. Si la función falla o tarda más de 6 s, cae al Payment Link normal (`PISCINAS_PAYMENT_LINK`) y deja el aviso en la consola.
2. `piscinas-create-checkout` crea una Checkout Session (`mode=payment`, US$30, solo tarjeta, `customer_creation=always`, `setup_future_usage=off_session`, `client_reference_id=piscinas_<id>`, metadata `{product:"piscinas", step:"kit"}`, `success_url=/piscinas-up1?session_id={CHECKOUT_SESSION_ID}`, `cancel_url=/piscinas-lp`) con el texto de consentimiento junto al botón de pagar.
3. `/piscinas-up1` guarda el `session_id` (como hoy). Al tocar «Sí» llama a `piscinas-upsell-charge` con `{front_session_id, offer}`:
   - lee la sesión del kit (`payment_status=paid`, `metadata.product=piscinas`, con customer y tarjeta guardada);
   - consulta si ya existe un cobro/suscripción de esa oferta y esa compra (metadata `front_session_id`) → `already_paid`;
   - up1: PaymentIntent de US$100 (`off_session`, `confirm`); up2: Subscription mensual de US$1,000 (`off_session`, `payment_behavior=error_if_incomplete`); ambos con `Idempotency-Key` determinista `piscinas-up1-<session_id>` / `piscinas-up2-<session_id>`;
   - responde `{status:"succeeded"}`, `{status:"already_paid"}`, `{status:"requires_action", fallback:"link"}` o `{status:"failed", message}` (sin detalles internos).
4. En la página: «Procesando tu pago…» (sin doble clic) → éxito: marca `piscinas_up1`/`piscinas_up2` y va a `/piscinas-up2?from=up1` o `/piscinas-ty?up=2`. `requires_action`/`failed` → aviso breve + botón «Completar mi compra» al Payment Link del upsell (si `PISCINAS_UP1/UP2_PAYMENT_LINK` tiene valor) o «Escríbenos» (si hay `PISCINAS_SUPPORT_EMAIL`). Sin `session_id` guardado todo funciona como antes (Payment Link). Si no hay respuesta de la función (red/timeout) se reintenta una vez: es seguro por la idempotencia.
5. `stripe-webhook`: `payment_intent.succeeded`, `invoice.paid` y `customer.subscription.created` con `metadata.product=piscinas` y step `up1`/`up2` se REGISTRAN en el log (ids, monto, moneda; nada sensible) para el cumplimiento manual. No envía emails ni toca `ebook_orders`. El `checkout.session.completed` del kit (email con link a `/piscinas-ty?session_id=…`) y el de TOEFL/DELF/Auxilios no cambian; la sesión del kit se reconoce por `client_reference_id` `piscinas_…` y por `metadata.product_slug`.

Código: `supabase/functions/piscinas-create-checkout`, `piscinas-upsell-charge`, `_shared/piscinas-checkout.ts` (lógica pura, con tests), `_shared/stripe-call.ts`, `src/lib/piscinasCheckout.ts`, `src/lib/piscinasUpsell.ts`, `src/components/piscinas/useUpsellCharge.tsx`.

### Secrets nuevos (Supabase → Edge Functions → Secrets)
| Secret | Para qué |
|---|---|
| `STRIPE_PISCINAS_SECRET_KEY` | Clave restringida de Stripe en modo LIVE (`rk_live_…`) |
| `STRIPE_PISCINAS_SECRET_KEY_TEST` | Clave restringida en modo TEST (`rk_test_…`) |
| `PISCINAS_KIT_PRICE_ID` / `PISCINAS_KIT_PRICE_ID_TEST` (recomendado) | `price_…` del kit ($30, pago único) creado una vez en Stripe, uno por modo (live / test). Con él, todas las ventas del kit quedan bajo UN producto y la tarjeta se sigue guardando; sin él, Stripe crea un producto suelto por compra |
| `PISCINAS_UP1_PRICE_ID` / `PISCINAS_UP1_PRICE_ID_TEST` (opcional) | `price_…` del upsell 1 ($100, pago único). Con él, el upsell 1 se cobra con una **factura** de ese precio (queda bajo su producto en los reportes de Stripe); sin él, se cobra con un pago suelto de $100. Un `price_…` por modo |
| `PISCINAS_UP2_PRICE_ID` (opcional) | `price_…` mensual de US$1,000 creado a mano. Sin él, la función busca/crea un Product «Gestión completa de anuncios (Piscinas)» y crea el precio al suscribir. Con él, usa ese precio tal cual |
| `PISCINAS_ALLOW_LOCALHOST=true` (solo pruebas) | Permite llamar desde `http://localhost:<puerto>`; en ese caso la sesión se crea en modo test. Quítalo en producción |
| `PISCINAS_STRIPE_MODE=test` (solo pruebas) | Fuerza modo test en `piscinas-create-checkout` desde el dominio real. Quítalo para vender |

El modo de `piscinas-upsell-charge` sale del `session_id` (`cs_live_…` / `cs_test_…`). Nunca se registra la clave ni datos de tarjeta.

### Permisos EXACTOS de la clave restringida (Stripe → Developers → API keys → Create restricted key)
- **Escritura (Write):** Customers, PaymentIntents, Subscriptions, Products, Prices, Checkout Sessions y, si usas `PISCINAS_UP1_PRICE_ID`, **Invoices** e **Invoice Items**.
- **Lectura (Read):** PaymentMethods, Charges, Invoices.
- Todo lo demás en «None». Crea una para live y otra para test.

### Probar en modo test de Stripe
1. Pon `STRIPE_PISCINAS_SECRET_KEY_TEST` y, para probar desde el dominio real, `PISCINAS_STRIPE_MODE=test` (o prueba desde localhost con `PISCINAS_ALLOW_LOCALHOST=true`). El webhook de test necesita su `STRIPE_WEBHOOK_SECRET_TEST` (ya existe el patrón).
2. Compra el kit con `4242 4242 4242 4242` (cualquier fecha futura, CVC y código postal). Llegarás a `/piscinas-up1`. Toca «Sí»: debe cobrar US$100 sin pedir la tarjeta y llevarte a `/piscinas-up2?from=up1`; toca «Sí» otra vez: suscripción de US$1,000/mes y `/piscinas-ty?up=2`. Verifica en Stripe (test) el PaymentIntent y la Subscription con metadata `product=piscinas`, `step`, `front_session_id`.
3. Autenticación: repite con `4000 0025 0000 3155`. El kit se paga (te pide autenticar), pero al tocar «Sí» el banco pide autenticación otra vez → debe salir el aviso y el plan de reserva (botón al Payment Link si está configurado, o «Escríbenos»).
4. Doble clic: toca «Sí» muy rápido varias veces (o recarga durante «Procesando») → en Stripe debe haber UN solo cobro/suscripción por oferta (botón bloqueado + `already_paid` + Idempotency-Key).
5. Cuando termines, quita `PISCINAS_STRIPE_MODE` y `PISCINAS_ALLOW_LOCALHOST`.

### Deploy (en este orden)
1. Crear las claves restringidas y cargar los secrets (arriba).
2. `supabase functions deploy piscinas-create-checkout piscinas-upsell-charge stripe-webhook piscinas-get-order` (`piscinas-get-order` no cambió; se incluye por orden de despliegue). El `verify_jwt=false` de las dos nuevas ya está en `supabase/config.toml`.
3. Webhook de Stripe (opcional pero recomendado para el registro): añadir a la destinación existente los eventos `payment_intent.succeeded`, `invoice.paid` y `customer.subscription.created` (además de `checkout.session.completed`). Sin ellos el cobro funciona igual; solo falta el log de cumplimiento.
4. Probar en modo test (arriba) y luego publicar el front (Vercel).

### Consentimiento y cumplimiento
Texto que se muestra junto al botón de pagar (Stripe `custom_text.submit.message`): «Al pagar, autorizas que guardemos tu método de pago para poder cobrarte, con un solo clic, las ofertas adicionales que decidas aceptar después de tu compra.» Debe verse ANTES de pagar y la persona solo es cobrada tras tocar «Sí» en la oferta. Daniel debe revisar este texto, el cobro de US$1,000/mes sin reingresar la tarjeta y las reglas de Stripe/tarjetas sobre cobros recurrentes con su asesor antes de salir a vender.

### Payment Link existente
Queda solo como respaldo: si `piscinas-create-checkout` falla o tarda, la landing lleva al Payment Link (compra normal, sin cobro en un clic; el upsell caerá entonces a su Payment Link porque esa sesión no trae tarjeta guardada). Los Payment Links de upsell (`PISCINAS_UP1/UP2_PAYMENT_LINK`) siguen siendo el plan de reserva.
