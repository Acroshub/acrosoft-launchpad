# Landing «Kit de 50 anuncios virales para negocios de tree services» — `/estimados-lp`

Estado a **2026-11-07**: la landing está portada y probada. **Ya tiene Payment Link live** (producto «+50 Anuncios Virales - Mega Pack para
Negocios de Tree Services», `prod_VVDEkbY4CnH4nv`, US$30; `plink_1UZ0rIBeHVZCHGk0vL0ycOEX` → `ESTIMADOS_PAYMENT_LINK`), pero **no tiene pixel**, y la
thank-you (`/estimados-ty`, a donde redirige el pago), la entrega del ZIP y el catálogo del servidor **todavía no existen**: **no desplegar
hasta construirlos**, o quien pague caerá en una página inexistente. Nada de esto está publicado: hay cambios locales
sin commit ni push (no se despliega nada sin orden expresa de Daniel).
La imagen del producto en Stripe apunta a `https://www.acrosoftlabs.com/estimados/stripe-producto.png` (archivo en `public/estimados/`): se ve rota en el checkout hasta desplegar; al desplegar, comprobar que devuelva `image/png`.
El producto de Stripe era el del kit de Piscinas (Daniel lo renombró); el Payment Link viejo de Piscinas `plink_1UUCpx…` sigue activo sobre el mismo precio.

Prototipo, copy aprobado, decisiones de diseño y registro de cambios: carpeta `CRASHING/Kit Clientes Tree Services/` (`Landing/NOTAS.md`,
`Info/estado.md`). El nombre del producto es **provisional** (elegido por Daniel el 2026-11-05).

## Qué hay hoy
| Archivo | Para qué |
|---|---|
| `src/pages/EstimadosLp.tsx` | La landing. Carga fuentes, estilos y eventos por sí sola. |
| `src/components/estimados/estimadosStyles.ts` | CSS **generado** desde el prototipo (`Landing/_src/port_estilos.py`). Todo acotado a `.est-page` y con clases `est-*` para no chocar con las del proyecto (p. ej. `.card`, `.sticky`). No se edita a mano: se regenera. |
| `src/lib/estimadosConfig.ts` | Slug, nombre, precio, garantía, `ESTIMADOS_PIXEL_ID`, `ESTIMADOS_PAYMENT_LINK`, `estimadosCheckoutUrl()` (añade `client_reference_id=estimados_<uuid>`). |
| `src/lib/estimadosConfig.test.ts`, `src/pages/EstimadosLp.test.tsx` | 14 pruebas: contenido, 5 botones de compra, bucle de la galería, prefijo de clases, eventos al hacer clic (navegador y servidor con el mismo `event_id`), sin pixel/link no manda nada, Ctrl-clic, barra fija. |
| `public/estimados/` | Imágenes (3.4 MB): hero, mockup del bundle (WebP + PNG), franja de calificación y 14 anuncios de la galería. |
| `src/App.tsx` | Ruta `/estimados-lp` (lazy), junto a las de Piscinas. |

La página nace con `<meta name="robots" content="noindex, nofollow">` (constante `NOINDEX` en `EstimadosLp.tsx`). Los 5 botones de compra
(hero, oferta, galería, cierre y barra fija móvil) disparan `InitiateCheckout` y registran el clic en `ab_sessions` (experimento `estimados_price`).

## Lo que falta para poder vender (en este orden)
**Lo que debe darme Daniel** (en un solo mensaje; ningún secreto va por el chat ni al repo):
1. **Payment Link live de Stripe** del kit a US$30. Redirección tras el pago: `https://www.acrosoftlabs.com/estimados-ty?session_id={CHECKOUT_SESSION_ID}`. → `ESTIMADOS_PAYMENT_LINK`.
2. **Pixel ID de Meta** (¿nuevo o el de otro producto?). → `ESTIMADOS_PIXEL_ID` y `meta.pixelId` del catálogo (deben coincidir; lo comprueba `ebook-order.test.ts`).
3. **Token de la API de Conversiones** de ese pixel: lo carga Daniel como secret `META_CAPI_ACCESS_TOKEN_ESTIMADOS` (Supabase → Edge Functions → Secrets). Cada pixel tiene su token.
4. **ZIP** (`Kit-Conseguir-Clientes-Tree-Services.zip`, **210 MB**): no cabe en Storage (tope 100 MB), así que va por enlace de Google Drive con descarga directa, como Piscinas → secret `ESTIMADOS_ZIP_URL`.
5. Contacto de soporte para la thank-you (WhatsApp y correo), como en `/piscinas-ty`.

**Lo que hay que construir** (código que toca pagos compartidos: se revisa el diff antes de desplegar):
- Entrada `estimados` en `supabase/functions/_shared/ebook-catalog.ts` con `tracking: { contentName, price: 30, landingPath: "/estimados-lp" }` (**obligatoria**: sin ella `product-track-event` rechaza `ViewContent` e `InitiateCheckout` por servidor), `meta`, `thankYouPath: "/estimados-ty"`, `paymentLinkIdsEnv`.
- Función `estimados-get-order` (copia de `piscinas-get-order`, que sirve el ZIP desde `PISCINAS_ZIP_URL`) o generalizarla.
- Página `/estimados-ty` (`EstimadosTy.tsx`, con `PageView` + un solo `Purchase` con `eventID = session_id`, descarga y soporte), su ruta en `App.tsx` y `Disallow: /estimados-ty` en `public/robots.txt`.
- Que `stripe-webhook` reconozca el producto (correo de confirmación sin mencionar webapp) y un test de catálogo que compare `tracking` con `estimadosConfig.ts`.
- Marcar la sesión de `ab_sessions` como comprada desde la thank-you con `ESTIMADOS_AB_CHECKOUT_SESSION_KEY` (como hace `PiscinasTy`).
- Upsells / downsells: no están diseñados (hoy solo el kit de US$30).

**Despliegue** (lo hace Daniel o con su orden expresa): `supabase functions deploy stripe-webhook estimados-get-order product-track-event` y push a Vercel.
Secrets: `META_CAPI_ACCESS_TOKEN_ESTIMADOS`, `ESTIMADOS_ZIP_URL`, opcional `META_CAPI_TEST_EVENT_CODE_ESTIMADOS` (solo para probar; **quitarlo después**) y `ESTIMADOS_PAYMENT_LINK_IDS`.
Decisiones ya tomadas para el embudo de Piscinas que aplican igual: se prueba directo en live sin modo test, sin enlaces a Términos/Privacidad, soporte solo en la thank-you.

## Para encenderla
1. Pegar el Payment Link y el Pixel ID en `src/lib/estimadosConfig.ts`.
2. (Si se quiere indexar) `NOINDEX = false` en `EstimadosLp.tsx`.
3. Con la landing desplegada o en preview: `node ~/.claude/skills/producto-low-ticket/scripts/verificar_pixel.mjs --slug estimados --pixel <PIXEL_ID> --price 30 --base <url>` (debe terminar en «✓ Todo correcto») y revisar Test events en Meta.

## Antes de pautar tráfico (avisos del copy; decisión de Daniel)
- **Franja de «4.5 estrellas» con rostros generados por IA** (`SHOW_RATING_STRIP` en `EstimadosLp.tsx`): no existe ninguna calificación real del kit; mostrarla puede leerse como reseñas falsas (FTC y políticas de Meta). Reemplazar por una calificación real o apagarla.
- **«Más de 5K likes en cada post»**: debe ser cierto para todos los estilos de referencia; si no, «miles de likes» o quitar la cifra.
- **Garantía**: «nuevos diseños virales y personalizados, gratis, sin objeciones» no tiene tope ni define qué es «publicar constantemente» o «una mejora»; definir proceso y canal de solicitud. No hay reembolso en el texto.
- **«2 minutos» vs «unos 10 minutos»**: «Listos en 3 pasos» y la guía PDF aún dicen 10 minutos. La guía no se ha probado con ChatGPT real.
- **El pie de página se eliminó** (decisión de Daniel): ya no hay aviso de producto digital, de no garantizar resultados ni de no afiliación con Meta/OpenAI.
- Auditoría de copy con la skill `nico-seoane` pendiente (el diseño se adaptó de landings de referencia, no de la estructura `/toefl`).

## Verificación hecha (2026-11-06)
`tsc` sin errores · `eslint` limpio en los archivos nuevos · `vitest` 14/14 (más las pruebas existentes de pixel, atribución y eventos) · `npm run build` ·
Playwright con Chrome a 375, 390 y 1280 px: sin desborde horizontal, sin imágenes rotas, sin errores de consola, filas de la galería en sentidos opuestos, barra fija al saltar el scroll,
clic sin link no navega. Las llamadas a Supabase/Meta/Stripe se bloquearon en las pruebas (no se ensució ningún dato real).
No se probó: compra real, eventos de Meta (pixel vacío) ni la thank-you (no existe).
