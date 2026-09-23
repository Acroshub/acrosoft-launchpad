# Ebook TOEFL — checklist de lanzamiento

Dominio de producción: `https://www.acrosoftlabs.com` (el dominio sin `www` redirige a este con un 308 que conserva la ruta y el `?session_id=`). Pixel: `1446406424021779`. DELF ya no se vende (su código y su entrada en el catálogo se conservan para que quienes ya compraron puedan volver a descargar).

```
/toefl (landing, A/B $19 vs $25)
  ├─ carga → PageView + ViewContent (pixel TOEFL, con el precio de la variante)
  └─ clic en cualquier CTA → InitiateCheckout (pixel) → Payment Link live ?client_reference_id=toefl-b2
       └─ pago → stripe-webhook (checkout.session.completed)
            ├─ orden en ebook_orders (product_slug = toefl-b2) con el NETO tras comisión de Stripe
            ├─ email (Resend): link a /toefl-ty + Bono 1 (link + contraseña)
            └─ Purchase por Conversions API (mismo pixel; valor = neto; event_id = session_id)
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
   - `META_CAPI_TEST_EVENT_CODE_TOEFL` — opcional y **solo mientras pruebas** (los eventos con código de prueba no cuentan como reales).
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

## Consultas útiles

```sql
-- últimas compras de TOEFL y si se guardó el neto
select created_at, customer_email, amount_total, net_amount, net_currency, deliverable_sent_at
from ebook_orders where product_slug = 'toefl-b2' order by created_at desc limit 20;

-- A/B: visitas por variante (compras: amount_total 1900 vs 2500 en ebook_orders)
select variants->>'toefl_price' as variante, count(*) as visitas, count(*) filter (where converted) as clics_checkout
from ab_sessions where variants ? 'toefl_price' group by 1;
```

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

## Opcional

- Mejor atribución: hoy Conversions API solo envía el email (hash). Guardar `fbp`/`fbc` al hacer clic y enviarlos sube la "calidad de coincidencia".
- Meta: verificar el dominio `acrosoftlabs.com` y priorizar Purchase (Aggregated Event Measurement) para tráfico de iPhone.
- InitiateCheckout y ViewContent llevan el precio de lista de la variante (no se conoce la comisión antes de pagar); solo Purchase lleva el neto real.
- Aviso de venta al correo/celular del dueño (`notify-sale` es solo del CRM).
