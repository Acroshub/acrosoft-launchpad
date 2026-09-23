# Ebook TOEFL — checklist de lanzamiento

Dominio de producción: `https://www.acrosoftlabs.com` (el dominio sin `www` redirige a este con un 308 que conserva la ruta y el `?session_id=`). Pixel: `1446406424021779`. DELF ya no se vende (su código y su entrada en el catálogo se conservan para que quienes ya compraron puedan volver a descargar).

```
/toefl (landing, A/B $19 vs $25)
  ├─ carga → PageView + ViewContent (pixel TOEFL, con el precio de la variante)
  └─ clic en cualquier CTA → InitiateCheckout (pixel) + guarda cookies de Meta en checkout_attribution
       → Payment Link live ?client_reference_id=toefl-b2_<id de esa fila>
       └─ pago → stripe-webhook (checkout.session.completed)
            ├─ orden en ebook_orders (product_slug = toefl-b2) con el NETO tras comisión de Stripe
            ├─ email (Resend): link a /toefl-ty + Bono 1 (link + contraseña)
            └─ Purchase por Conversions API (mismo pixel; valor = neto; event_id = session_id;
               user_data: email + nombre/país de Stripe + user agent, IP, fbp, fbc de checkout_attribution)
       └─ redirect de Stripe → /toefl-ty?session_id=…
            ├─ toefl-get-order → ZIP (URL firmada 1 h) + contraseña de la plataforma
            └─ Purchase por pixel (mismo event_id y valor → Meta deduplica; una sola vez por compra)
```

## Estado

| Pieza | Estado |
|---|---|
| Landing `/toefl` + thank-you `/toefl-ty` | ✅ publicadas en producción y verificadas (2026-09-23) |
| Plataforma `/toefl-plataforma` (`public/toefl-audiolab/`) | ✅ en producción: contraseña, audios, grabación con micrófono y cabecera `microphone=(self)` verificados |
| Links de Stripe (live) y Pixel ID | ✅ ya en `src/lib/toeflConfig.ts` |
| Edge Functions `toefl-get-order` (v1) y `stripe-webhook` (v13, multi-producto) | ✅ desplegadas el 2026-09-23 (el código anterior del webhook está en git, commit a4bf8ed, por si hay que volver atrás) |
| ZIP de entrega | ✅ `~/Ebooks/Ebook Ingles Internacional/Entrega/TOEFL-B2-Guia-Completa-Bonos.zip` (LEEME con link y contraseña) · ⏳ falta subirlo |
| Secrets de Supabase | ⏳ ver abajo |
| Redirect post-pago en los 2 Payment Links | ⏳ (después del deploy) |

## Pasos

1. **Subir el ZIP** — Supabase Dashboard → Storage → bucket `ebook-deliverables` (privado, solo .zip, máx. 100 MB) → crear la carpeta `toefl-b2` → subir `TOEFL-B2-Guia-Completa-Bonos.zip`. Ruta final exacta: `toefl-b2/TOEFL-B2-Guia-Completa-Bonos.zip` (es la que tiene el catálogo). Sube **solo el .zip**, no la carpeta descomprimida que macOS deja al lado.
2. **Secrets** — Dashboard → Edge Functions → Secrets:
   - `TOEFL_LAB_PASSWORD` = la contraseña con la que se construyó la plataforma y el ZIP (la que pusiste en el LEEME del ZIP).
   - `META_CAPI_ACCESS_TOKEN_TOEFL` = el token de la API de conversiones del pixel `1446406424021779`. (No sobrescribir `META_CAPI_ACCESS_TOKEN`: es el del pixel de DELF.)
   - `META_CAPI_TEST_EVENT_CODE_TOEFL` — opcional, solo para probar. **Ojo:** Meta indica que los eventos enviados con un código de prueba no se descartan (siguen a Events Manager y pueden usarse para anuncios). Úsalo con un evento que no sea `Purchase`, o quítalo enseguida.
   - Ya deben existir (los usa DELF): `STRIPE_WEBHOOK_SECRET`, `STRIPE_RESTRICTED_KEY` (live), `RESEND_API_KEY`, `RESEND_FROM_EMAIL`. `APP_URL` es opcional: sin él los correos enlazan a `acrosoftlabs.com` (funciona por el redirect); con `APP_URL=https://www.acrosoftlabs.com` enlazan directo.
3. ~~Desplegar las Edge Functions~~ (hecho) y push del frontend a Vercel.
4. **Stripe** — en cada uno de los 2 Payment Links: Después del pago → "No mostrar página de confirmación" → redirigir a `https://www.acrosoftlabs.com/toefl-ty?session_id={CHECKOUT_SESSION_ID}`. El webhook existente ya recibe los eventos de todos los links de la cuenta.
5. ~~Verificar cabeceras del micrófono~~ (hecho: `microphone=(self)` solo en `/toefl-plataforma`; el resto del sitio mantiene `microphone=()`).
6. **Compra de prueba real** ($19 con tu tarjeta, luego reembolso; los links son live y un cupón de 100 % no sirve porque Stripe lo marca `no_payment_required` y el webhook lo ignora):
   - Fila nueva en `ebook_orders` con `product_slug = 'toefl-b2'` y **`net_amount` lleno**. Si `net_amount` queda vacío, `STRIPE_RESTRICTED_KEY` no está o no tiene permiso de lectura sobre el cargo/balance: el valor que se manda a Meta sería el bruto. (Hoy las 5 órdenes de DELF tienen `net_amount` vacío: esa parte nunca se comprobó con un pago real.)
   - Llega el correo con la descarga, el Bono 1 y la contraseña.
   - `/toefl-ty` muestra descarga y contraseña; con esa contraseña se entra a la plataforma.
   - Events Manager → Test events: **un** Purchase (navegador + servidor, mismo `event_id`), con el valor neto.
7. Quitar `META_CAPI_TEST_EVENT_CODE_TOEFL` si lo usaste.

## Cómo leer el split test de precio ($19 vs $25)

**Cómo funciona:** cada navegador nuevo sortea 50/50 un precio y lo recuerda (`localStorage`), así que siempre ve el mismo. Cada carga de la landing guarda una fila en `ab_sessions` con el precio (`variants->>'toefl_price'`); el clic en cualquier CTA marca `converted = true` y lleva al Payment Link de ESE precio. La compra sale por el webhook a `ebook_orders`.

**Ojo con lo que significa cada número:**
- *visitas* = **cargas de página**, no personas: quien recarga o vuelve suma otra fila (tus pruebas también). Con tráfico real el sesgo afecta a los dos precios por igual.
- *clics_checkout* = clics en un CTA (intención), no compras.
- *compras* salen de `ebook_orders`; se atribuyen al precio por el monto cobrado (1900 → $19, 2500 → $25). Un cupón cambiaría el monto y esa compra no se contaría.

**Consulta** (Supabase → SQL Editor). Cambia las dos fechas `2000-01-01` por la del lanzamiento para no mezclar tus pruebas:

```sql
with visitas as (
  select variants->>'toefl_price' as precio,
         count(*) as visitas,
         count(*) filter (where converted) as clics_checkout
  from ab_sessions
  where variants ? 'toefl_price' and created_at >= '2000-01-01'   -- fecha de lanzamiento
  group by 1
), compras as (
  select case amount_total when 1900 then '19' when 2500 then '25' end as precio,
         count(*) as compras,
         round(sum(coalesce(net_amount, amount_total)) / 100.0, 2) as neto_usd
  from ebook_orders
  where product_slug = 'toefl-b2' and created_at >= '2000-01-01'  -- la misma fecha
  group by 1
)
select v.precio as precio_usd, v.visitas, v.clics_checkout,
       round(100.0 * v.clics_checkout / nullif(v.visitas, 0), 1) as pct_clic,
       coalesce(c.compras, 0) as compras,
       round(100.0 * coalesce(c.compras, 0) / nullif(v.visitas, 0), 2) as pct_compra,
       coalesce(c.neto_usd, 0) as neto_usd,
       round(coalesce(c.neto_usd, 0) / nullif(v.visitas, 0), 3) as neto_por_visita
from visitas v left join compras c using (precio)
order by v.precio::int;
```

**Cómo decidir:** gana el precio con más **`neto_por_visita`** (dinero neto por cada visita), no el que tiene más compras: a $25 se compra menos pero cada venta deja más. No cierres el test con pocas ventas: con conversiones de 1–3 % hacen falta del orden de 100 compras por precio (miles de visitas por precio) para que la diferencia no sea ruido. La vista `ab_stats` (`select * from ab_stats where element_key = 'toefl_price'`) da solo visitas y clics.

**Verificado (2026-09-23, navegador real contra producción):** el precio mostrado y el Payment Link coinciden con la variante; la visita queda en `ab_sessions` con `toefl_price`; el clic llama `ab_track` y marca `converted`; recargar mantiene el precio; el sorteo reparte ~50/50 (60 navegadores nuevos: 33 vs 27).

## Contraseña de la plataforma: cambiarla

```bash
export TOEFL_LAB_PASSWORD='nueva'
node scripts/toefl-audiolab/build.mjs        # regenera public/toefl-audiolab/
node scripts/toefl-audiolab/build-zip.mjs    # regenera el ZIP (LEEME con la nueva)
# + subir el ZIP a Storage + actualizar el secret TOEFL_LAB_PASSWORD + push del frontend
```

Las páginas de gracias siempre muestran la contraseña vigente (la leen del secret); los correos ya enviados conservan la que tenían.

## Antes de pagar anuncios (revisión de la landing) — sin cambios todavía

- **Testimonios** con nombre, ciudad y puntaje en un producto nuevo: si no son de compradores reales, Meta rechaza anuncios con prueba social inventada y Stripe puede cerrar la cuenta.
- **Contador de 30 min** ("después vuelven a su precio normal") sin efecto real y **precios de lista $48 / $63** que nunca se cobraron: urgencia y anclaje que Meta y varias leyes de consumo consideran engañosos.
- **"Simulacro con los tiempos reales del examen"**: los tiempos son aproximados. Cambiar a "tiempos aproximados al examen".
- **Footer sin enlaces legales, contacto ni política de reembolso** (Meta pide privacidad; Stripe revisa términos, reembolsos y contacto). `/terminos_y_politicas_de_privacidad` ya existe.

## Conversions API: qué está verificado y qué no (2026-09-23)

**Qué manda el evento del servidor (`Purchase`):** `action_source=website`, `event_source_url`, `event_id` = session_id de Stripe, valor NETO, y en `user_data`: email, nombre y país que trae Stripe (hasheados) + **`client_user_agent`, `client_ip_address`, `fbp` y `fbc`** del navegador del comprador. Meta exige `client_user_agent` en eventos web enviados por servidor; sin él el evento puede descartarse (por eso se agregó).

**Cómo llegan esos datos:** al hacer clic en un CTA, la landing guarda `fbp`/`fbc` en `checkout_attribution` (el user agent y la IP los pone un trigger de la base a partir de los headers de la petición; el navegador no puede falsearlos) y pasa el id de la fila en `client_reference_id` (`toefl-b2_<uuid>`). El webhook lee la fila. Si falta o falla, el evento sale igual con lo que trae Stripe.

**Privacidad:** `checkout_attribution` guarda IP y user agent. El navegador solo puede insertar; solo el webhook lee; se borra sola a los 30 días (cron semanal `cleanup-checkout-attribution`). La política de privacidad del sitio (`/terminos_y_politicas_de_privacidad`) todavía no menciona cookies, píxel de Meta ni IP: conviene agregar un párrafo.

- ✅ Verificado: secret y token válidos; el código está probado (25 tests de servidor + 19 de frontend) y desplegado; en navegador real contra producción el clic guarda la fila con `fbp`/`fbc`, la base llena IP y user agent, Stripe acepta `client_reference_id = toefl-b2_<uuid>`, y la clave anon no puede leer, modificar, borrar ni falsear IP/user agent.
- ⏳ **No ejecutado con un pago real:** no hay llamadas de Stripe al webhook desde el despliegue. Con la primera compra revisa el log de `stripe-webhook`: debe decir `CAPI enviado (toefl-b2); user_data: em,fn,ln,country,…,client_ip_address,client_user_agent,fbp,fbc; atribución: sí`. Si dice `atribución: no`, el clic no guardó la fila (falló la red o el comprador vino de un link viejo sin el id). Si dice `Meta CAPI no se pudo enviar`, mira el error que sigue.
- En Events Manager → Overview el `Purchase` debe aparecer con origen "Navegador y servidor" (deduplicado por `event_id`); la calidad de coincidencia (EMQ) se ve a las pocas horas.

## Opcional

- Meta: verificar el dominio `acrosoftlabs.com` y priorizar Purchase (Aggregated Event Measurement) para tráfico de iPhone.
- InitiateCheckout y ViewContent llevan el precio de lista de la variante (no se conoce la comisión antes de pagar); solo Purchase lleva el neto real.
- Aviso de venta al correo/celular del dueño (`notify-sale` es solo del CRM).
