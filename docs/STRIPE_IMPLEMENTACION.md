# Integración de Stripe — Plan de implementación

> Creado: 2026-08-05
> Estado: **Milestone 1 completo y desplegado.** Milestones 2-4 planeados, sin construir.
> **Bloqueado en**: falta que el usuario tenga/conecte una cuenta de Stripe (modo test) para poder probar Milestone 1 y seguir. Retomar desde ahí.

## Contexto

Hoy todos los cobros del CRM son manuales: el cliente paga por transferencia/QR/link externo por fuera del sistema y el negocio confirma el pago a mano en `crm_sales` (`CrmVentas.tsx`) o vía el agente de WhatsApp interpretando un comprobante. No existe ninguna pasarela real, ni cobro automático de renovaciones (el cron `send-renewal-reminders` solo **recuerda por email**, nunca cobra).

El objetivo es integrar Stripe para que — primero en la cuenta admin, después multi-tenant — se pueda cobrar servicios, productos físicos, productos digitales (cursos, ebooks, archivos) incluyendo recurrencias, con el pago, el registro en `crm_sales` (reporte/historial) y el cobro de renovaciones ocurriendo automáticamente.

## Decisiones ya confirmadas con el usuario

- **Conexión por API Keys pegadas** (no Stripe Connect/OAuth) — más simple para empezar con un solo tenant (el admin). Migrar a Connect queda para cuando esto sea multi-tenant real.
- **Alcance aprobado, completo**: conexión + marcar qué se vende por Stripe + checkout + registro automático (incluyendo recurrencias) — no solo la pantalla de conexión.
- **Seguridad**: el patrón de secretos por tenant que ya existe en el CRM (`crm_ai_agent_config.access_token`, texto plano y legible desde el navegador) **no se replica** para Stripe. El `secret_key` y el `webhook_secret` nunca deben ser legibles por el cliente — solo por edge functions con service role.

## Cómo retomar

1. El usuario crea/usa una cuenta de Stripe y obtiene su **Secret Key de modo test** (`sk_test_...`) desde `https://dashboard.stripe.com/test/apikeys`.
2. En el CRM: Ventas → Stripe, pegar la key, guardar.
3. Confirmar que aparece "Conectado" con el email de la cuenta de Stripe.
4. Avisar para seguir con Milestone 2.

---

## Milestone 1 — Conexión segura ✅ **Completo**

**DB** (proyecto Supabase `rhlnjtrbydwzzuvqayfo`):
- Tabla `crm_stripe_config` (`user_id` único, `mode` test/live, `publishable_key`, `secret_key`, `webhook_secret`, `connected`, `account_email`, `last_verified_at`). RLS habilitado **sin ninguna política** — deny-all para el cliente por diseño; todo acceso pasa por edge functions con service role.
- `crm_payment_methods_type_check` ampliado para aceptar `'stripe'` además de `'bank_transfer' | 'payment_link' | 'qr_code'`.

**Edge functions** (desplegadas, `verify_jwt: false`, cada una valida el JWT manualmente vía `supabase.auth.getUser(token)`):
- `stripe-save-keys` — guarda mode/secret_key/publishable_key/webhook_secret (todos opcionales, solo actualiza lo enviado). Si llega `secret_key`, la valida contra `GET https://api.stripe.com/v1/account` antes de guardar y guarda el `account_email` devuelto.
- `stripe-connection-status` — devuelve `{connected, mode, publishable_key, account_email, last_verified_at, has_webhook_secret}` — nunca el secret_key ni el webhook_secret.
- `stripe-disconnect` — limpia `secret_key`/`webhook_secret`/`account_email`, pone `connected: false`.

**Frontend**:
- `src/hooks/useCrmData.ts` — hooks `useStripeConnectionStatus`, `useSaveStripeKeys`, `useDisconnectStripe` (sección "Stripe (conexión — Milestone 1)").
- `src/components/crm/CrmStripe.tsx` — página nueva: banner "en desarrollo", tarjeta de estado de conexión, formulario (modo test/live, Secret Key, Publishable Key), botón desconectar con confirmación.
- `src/pages/Crm.tsx` — nuevo ítem `ventas_stripe` en `VENTAS_CHILDREN` (después de "Renovaciones"), **visible solo para `effectiveIsAdmin`** (mismo patrón que "Comunicaciones": entrada en `EXTRA_CHILD_VISIBILITY`, gate en el `case` del switch, y **no** agregado a la visibilidad incondicional de staff en `permissions.ts` — solo vive en la rama `!staffRecord`).
- `src/lib/permissions.ts` — `ventas_stripe` agregado solo a la lista del principal, no a la de staff.

---

## Milestone 2 — Marcar qué se vende por Stripe 📋 Planeado

- **DB**: agregar `stripe_price_id` (+ `stripe_recurring_price_id` donde aplique recurrencia) a `crm_services`, `crm_product_plans`, `crm_course_plans`, `crm_products`. Verificar nombres/tipos exactos contra el esquema real antes de migrar (ya se hizo una vez para Milestone 1 — repetir el chequeo, el esquema real puede haber cambiado).
- **Edge function nueva**: `stripe-sync-price` — dado `entity_type`+`entity_id`, lee precio/moneda/recurrencia actual de la entidad, crea/actualiza Product+Price en Stripe vía API (con el `secret_key` del tenant, leído server-side desde `crm_stripe_config`), guarda los IDs devueltos en la entidad.
- **Frontend**: extender `src/components/shared/PaymentMethodsEditor.tsx` con un 4º tipo `'stripe'` (sin QR/link manual — solo un toggle "Vender por Stripe", deshabilitado con tooltip si el tenant no tiene Stripe conectado). Se usa en los mismos editores que ya usan `PaymentMethodsEditor`: `CrmServices.tsx`, `CrmProductos.tsx`, `CrmCourses.tsx`, `PlanEditor.tsx`, `CrmPhysicalProductEditor.tsx`.

## Milestone 3 — Checkout público 📋 Planeado

- **Edge function nueva**: `stripe-create-checkout` (pública, sin auth — la usa un visitante anónimo). Recibe `user_id` del tenant + `entity_type`/`entity_id` + tipo de precio (único/recurrente) + datos de contacto, crea una Checkout Session de Stripe (`mode: payment` o `subscription` según corresponda) con `metadata` (tenant, entidad, contacto) para que el webhook sepa qué registrar, devuelve la URL de checkout.
- **Frontend**: ubicar exactamente al implementar dónde se renderizan hoy los métodos de pago públicos (candidatos: `FormRenderer.tsx` → `ServicesField`, páginas públicas de producto/curso) y agregar botón "Pagar con tarjeta" para el método `type==='stripe'` que llama la función y redirige.

## Milestone 4 — Webhook y registro automático (incluye renovaciones) 📋 Planeado

- **DB**: agregar `stripe_subscription_id`, `stripe_customer_id` a `crm_sales` (para atribuir una renovación entrante a la venta original).
- **Edge function nueva**: `stripe-webhook` — mismo patrón de firma que `whatsapp-webhook/index.ts` (líneas 13-27, 90-133: leer `rawBody` crudo, verificar HMAC contra el `webhook_secret` guardado antes de parsear, responder 200 rápido, procesar en background). Maneja:
  - `checkout.session.completed` → crea/matchea `crm_contacts` por email, inserta `crm_sales` (`type: initial`, `payment_method_type: 'stripe'`, `is_paid: true`, `status: 'confirmed'`, calcula `next_renewal_date` si es recurrente, decrementa stock si es producto físico vía el RPC existente `decrement_sale_stock`).
  - `invoice.paid` (ciclo de renovación, no la primera factura) → busca la venta original por `stripe_subscription_id`, inserta `crm_sales` (`type: recurring`), actualiza `next_renewal_date`.
  - `invoice.payment_failed` / `customer.subscription.deleted` → por ahora solo log, sin flujo de dunning (posible mejora futura).
- **Paso manual del usuario**: registrar la URL del webhook desplegado en el Dashboard de Stripe (modo test) y pegar el signing secret en la pantalla de Milestone 1 (`CrmStripe.tsx` necesitará un campo nuevo para esto, ya soportado por `stripe-save-keys`).

---

## Referencia técnica reutilizada (para no reinventar al retomar)

- `crm_sales` es la tabla única de ventas; el flujo manual (`CrmVentas.tsx:458-581`, `useCreateSale` en `useCrmData.ts:497-528`) y el de IA (`ai-agent/index.ts:3455-3496`) insertan ahí con formas de payload compatibles — Stripe debe insertar igual.
- `crm_payment_methods` (ver `PaymentMethodsEditor.tsx`) es la abstracción existente para "cómo se paga esta entidad" — Stripe se agrega como un 4º `type`, no un sistema paralelo.
- `whatsapp-webhook/index.ts` es el patrón de referencia para webhooks firmados de terceros.
- Entidades vendibles y sus campos de precio (confirmado contra el esquema real): `crm_services` (`price`/`currency` + `is_recurring`/`recurring_price`/`recurring_currency`/`recurring_interval`), `crm_course_plans` y `crm_product_plans` (misma forma), `crm_products` (precio base sin planes, sin recurrencia, campo `product_kind: 'fisico'|'archivo'`).
- Drift de esquema conocido: hay columnas (`crm_payment_methods.price_id/currency`, `crm_sales.commission_pct`) y tablas base (`crm_sales`, `crm_ai_agent_config`) sin `CREATE TABLE` versionado en `supabase/migrations/`. Antes de escribir cualquier migración nueva de este plan, verificar el esquema real vía `mcp__supabase__list_tables`/`execute_sql`, no confiar solo en los tipos TS de `src/lib/supabase.ts`.

## Verificación (repetir en cada milestone)

1. `npx tsc --noEmit --project tsconfig.app.json`, `npx eslint <archivos tocados>`, `npm run build`.
2. `mcp__supabase__get_advisors` (security) después de cada migración nueva.
3. Verificación funcional real con las API keys de test del usuario — no se puede simular ni fabricar.
