# Landing «Kit de 50 anuncios virales para negocios de tree services» — `/estimados-lp`

Estado a **2026-11-07: EL EMBUDO ESTÁ PUBLICADO (LIVE).**
- **Frontend en producción** (commit `014b70c` en `origin/main`, Vercel): landing `/estimados-lp` con el pixel de Meta `1013028214851437`, página del regalo `/estimados-ty` y página final
  `/estimados-gracias`. Payment Link live `plink_1UZ0rIBeHVZCHGk0vL0ycOEX` (→ `ESTIMADOS_PAYMENT_LINK`) del producto «+50 Anuncios Virales - Mega Pack para Negocios de Tree Services»
  (`prod_VVDEkbY4CnH4nv`, US$30); la imagen del producto en Stripe (`/estimados/stripe-producto.png`) sirve `image/png`.
- **Servidor en producción** (Supabase «Acrosoft», `rhlnjtrbydwzzuvqayfo`): `stripe-webhook` v28, `product-track-event` v8 y `estimados-get-order` v1 (desplegadas con permiso explícito de Daniel el 2026-11-07;
  antes: v27 y v7). La columna `ebook_orders.customer_name` la creó Daniel a mano en el SQL Editor y se comprobó que existe. El secret `META_CAPI_ACCESS_TOKEN_ESTIMADOS` está cargado.
- **Video (2026-11-11):** el VSL de 2:50 (1.25x, con música) está en **Bunny Stream** (biblioteca 628395) y `ESTIMADOS_TY_VIDEO_URL` apunta a su reproductor con `autoplay=false`. Archivo y guion en `CRASHING/Kit Clientes Tree Services/VSL/`.
- **Ajustes del 2026-11-11:** (1) galería de la landing: las imágenes ahora cargan de inmediato (con `loading="lazy"` las de la derecha del carrusel quedaban en blanco), pesan 40 % menos (336×448) y llevan un fondo gris mientras cargan; las imágenes de `/estimados/` salen con caché de 1 día (`vercel.json`). (2) «Listos en 3 pasos» pasó a la tarjeta de la oferta, debajo de «Para llenar tu calendario…». (3) El video de `/estimados-ty` usa `iframe.mediadelivery.net`: el `frame-src` del CSP de `vercel.json` solo permite ese dominio de Bunny (con `player.mediadelivery.net` el navegador lo habría bloqueado en producción; un test lo vigila).
- **Galería de la landing (2026-11-11, 2ª versión):** el carrusel de `<img>` parpadeaba en Safari de iPhone (cuadros en blanco que aparecen y desaparecen), así que ahora son **dos videos mp4 en bucle** (`public/estimados/galeria-es.mp4` y `galeria-en.mp4`, ~1,9 MB c/u, **60 cuadros por segundo** con movimiento de medio pixel interpolado y anuncios tomados de los originales de 1080×1440, con póster `.jpg`), mudos, `playsInline` y sin salto al repetirse (la primera versión iba a 24 cuadros/s y se veía entrecortada); se reproducen solo mientras se ven. Se generan con `Kit Clientes Tree Services/Landing/_src/galeria/build_galeria.py` (si cambian los anuncios, se vuelve a correr). Probado en WebKit (motor de Safari, iPhone 13) y Chromium.
- **Falta:** una **compra de prueba real** (ver «Prueba de punta a punta» abajo): hasta hoy no se ha probado una compra real, ni el correo real de Resend, ni Meta recibiendo eventos.
- El producto de Stripe era el del kit de Piscinas (Daniel lo renombró); el Payment Link viejo de Piscinas `plink_1UUCpx…` (`https://buy.stripe.com/dRmbJ0fBo6Us5eOgKCbbG08`) se **desactivó el 2026-11-07** a pedido de Daniel (Stripe no permite borrar Payment Links, solo `active:false`; se puede reactivar). Pendiente de Piscinas: `PISCINAS_PAYMENT_LINK` en `src/lib/piscinasConfig.ts` sigue apuntando a él, y el secret `PISCINAS_KIT_PRICE_ID` apunta al mismo precio que ahora es el de Estimados.

Prototipo, copy aprobado, decisiones de diseño y registro de cambios: carpeta `CRASHING/Kit Clientes Tree Services/` (`Landing/NOTAS.md`,
`Info/estado.md`). El nombre del producto es **provisional** (elegido por Daniel el 2026-11-05).

## `/estimados-ty`: la página del regalo (no es una thank-you ni un upsell que vende)
Decisión de Daniel (2026-11-07), con el método de Nico Seoane para páginas de llamadas: quien paga el kit (US$30) llega a una página que **regala
una llamada de consultoría** (valor normal US$100, hoy gratis) sobre cómo conseguir más clientes con anuncios de pago en Facebook y Google Ads.
El servicio de gestión de anuncios se vende **en la llamada**, no en la página.

**La página es corta a propósito y el VIDEO queda en la primera pantalla, sin scroll** (decisión de Daniel, 2026-11-07). Medido en un navegador real: el video
termina dentro de la ventana en 360×560, 360×640, 375×553, 390×664, 390×844, 412×732, 1366×600 y 1280×720 (sobran 11 px o más; el caso más justo son los portátiles bajos y el iPhone SE con las
barras de Safari abiertas). **Para lograrlo en teléfonos con la ventana muy baja (≤ 600 px de alto y ≤ 600 px de ancho) se oculta solo con CSS la línea «Estamos enviando tu kit a <correo>» de la
barra**, porque repite lo que dice el texto de bienvenida; en el resto de pantallas se ve siempre. Cada línea o espacio nuevo arriba del video lo empuja hacia abajo, así que ya no cabe más: para
agregar algo habría que quitar otra cosa. En pantallas anchas pero bajas el video se achica según el alto de la ventana (regla y constante en `estimadosTyStyles.ts`). **Si se agrega o se cambia
algo ARRIBA del video, volver a medirlo.**

Orden de la página:
1. **Barra compacta** (~90 px) de confirmación: «¡Compra confirmada!», barra al **90 %** y «Estamos enviando tu kit a <correo>.» (sin texto de «solo falta reclamar»,
   quitado por Daniel). Daniel decidió mantener el 90 %. **No hay descarga en la página:** el kit llega por correo (ver «Entrega del kit»).
2. **Imagen 3D: un billete de US$100 con un moño naranja** (`public/estimados/regalo.{webp,png}`, 348×176, transparente; se muestra a 54 px de alto) para que se entienda que es un regalo
   valuado en US$100 (**16 px de aire entre la barra de arriba y el billete**); **debajo de la imagen y antes del título, un texto con el estilo de «Valor normal»** (Inter 600 y su mismo color;
   solo cambia el tamaño, 13 px, porque es una frase de 3 líneas; **8 px de espacio con el billete y 8 px con el título, y un poco de margen lateral**; pedido de Daniel): «Tu compra se realizó con éxito y recibirás tu kit en tu correo electrónico. Mientras tanto, déjame contarte una buena noticia...»; y luego el **título**
   «<Nombre>, recibiste un regalo valuado en US$100». La imagen se generó con **GPT Image 2 en la cuenta KIE de Daniel (2026-11-07)**: 2 variantes × 6 créditos = 12 créditos (~US$0.06);
   se eligió la B (un solo billete con el moño al centro) y la A (un fajo de billetes) queda en `Landing/_src/regalo/`. Billete **estilizado, sin retrato ni números de serie**, no una réplica
   fotográfica. (La caja 3D anterior se descartó por pedido de Daniel.) Debajo del título, una caja con un **ícono de laptop sin círculo**: «Una llamada de consultoría **GRATIS** para
   conseguir más clientes con anuncios de pago en Facebook y Google Ads» («GRATIS» en mayúscula).
3. **Video** (sin `ESTIMADOS_TY_VIDEO_URL` no se muestra en producción; en desarrollo, un recuadro rotulado). El guion se define después.
4. **«Valor normal ~~US$100~~ → Aquí y ahora GRATIS» en UNA sola línea** (las dos etiquetas con la misma tipografía; verificado de 320 a 1280 px) y la **lista NUMERADA** «Qué vas a
   conseguir en la llamada»: los números 1, 2, 3 van en cuadros naranja de bordes redondeados (30 px, radio 9 px). Sin botón de CTA.
5. **Calendario del CRM de la cuenta ADMIN, directo**, con un **resplandor naranja estático** (borde naranja de 2 px + halo, sin animación; pedido de Daniel para que se entienda que ahí se agenda la
   llamada; se apaga al reservar) (sin título propio: el calendario trae el suyo, «Selecciona el día y la hora») con formulario de **solo el WhatsApp** (selector de país en +1 por defecto).
6. **Pie de soporte** de **fondo negro y estilo oscuro** (siempre visible, también si la compra no se encuentra; queda pegado al fondo de la pantalla incluso con contenido corto): WhatsApp **+591 57697071** (`wa.me/59157697071`) y correo **daniel@acrosoftlabs.com**.

**Entrega del kit (decisión de Daniel, 2026-11-07):** el enlace de **Google Drive** va **solo en el correo de confirmación**, que `stripe-webhook` manda por **Resend**
(el mismo correo de siempre, con botón «Descargar mi kit» y un bloque «Reclamar mi regalo» que lleva a esta página). El enlace
(`https://drive.google.com/file/d/1K-mbNjJBqJlkJ_ZC-AXWhAtqPqQc7af_/view?usp=sharing`, dado por Daniel) está en el catálogo (`emailDownloadUrlDefault`), que solo leen las Edge
Functions: **no pasa nunca por una función pública ni por el frontend**. El secret `ESTIMADOS_ZIP_URL` es **opcional** y, si existe y es https, lo reemplaza (para cambiar el enlace
sin tocar código). Si ninguno da un https válido, el webhook NO manda el correo y responde 500: Stripe reintenta (hasta ~3 días) y la entrega sale sola cuando se corrige.
Es un enlace `/view` de Drive: al abrirlo se ve la página de Drive y la persona pulsa el botón de descarga. El archivo debe estar compartido como «cualquiera con el enlace».
Como el enlace está en el repositorio, quien tenga acceso al código puede ver el kit: si eso importa, cambiar a secret (basta con quitar `emailDownloadUrlDefault` y cargar `ESTIMADOS_ZIP_URL`).

**Quitado a pedido de Daniel (2026-11-07):** la nota «Cómo funciona: revisamos tu negocio y te damos un plan. Si ves que tiene sentido, te contamos cómo podemos hacerlo por ti. Si no, te
quedas con el plan y no pasa nada» y el título «Elige el día y la hora de tu llamada / Solo te pedimos tu WhatsApp». La nota era el encuadre honesto de que la llamada puede incluir una propuesta
de servicio: sin ella, esa claridad tiene que venir en el video (o al abrir la llamada).

**Calendario (leído del CRM el 2026-11-07, por pedido de Daniel):** el usuario admin (`get_admin_user_id`) tiene **un solo calendario**: «Selecciona el día y la hora»,
`24dab059-b724-4a13-b900-c2d73fc4438f` (→ `ESTIMADOS_CALL_CALENDAR_ID`), 30 min, sin buffer, aviso mínimo de 6 h, reservas hasta **5 días** adelante, zona **America/La_Paz**, idioma es, sin slug ni pixel.
Horarios (hora de La Paz, UTC-4; el comprador los ve convertidos a su zona): Lun a Vie 12:00-17:30 y 22:00-23:00, Sáb 9:00-12:00 y 17:00-20:30, Dom 9:00-20:00. Recordatorios: **4 reglas, todas por correo**
(2 al reservar, 2 antes de la cita); **no hay recordatorios por WhatsApp**. Formulario vinculado «Formulario Básico de Calendario»: Nombre y Apellido, Correo electrónico y WhatsApp (los tres obligatorios).
Se leyeron solo `crm_calendar_config`, `crm_forms` (definición de campos) y el id del admin; no contactos ni citas.
Como es el calendario general del admin, las reservas de esta página **no llevan marca de origen** y se mezclan con las demás citas; si importa distinguirlas, duplicar el calendario con un nombre propio y cambiar el id.

**Datos al CRM:** el nombre y el correo salen del pago en Stripe (`estimados-get-order`) y viajan en `form_data` con los ids reales de ese formulario (`field_name`, `field_email`, `f-1788373522211`)
a `crm-calendar-book`, que crea o actualiza el contacto por correo y guarda el WhatsApp. El calendario muestra «Reservando como <nombre> · <correo>». **Solo se pide el WhatsApp aunque el formulario
vinculado tenga más campos** (`requireWhatsapp` oculta todo lo demás; el servidor no exige los campos del formulario).

**Al reservar** la llamada se guarda el resumen de la cita (`src/lib/estimadosBooking.ts`, en `sessionStorage`) y se pasa a la página FINAL `/estimados-gracias` (navegación dentro de la app).

### Pixel de Meta `1013028214851437` (dado por Daniel el 2026-11-07): mapa de eventos
Verificado en navegador real con un `fbq` espía (nada salió a Meta). Todos van SOLO a este pixel (`trackSingle`).
| Página | Eventos |
|---|---|
| `/estimados-lp` (landing) | `PageView`, `ViewContent` al cargar; `InitiateCheckout` en **cada uno de los 5 botones** de compra (hero, oferta, galería, cierre y barra fija) |
| `/estimados-ty` (regalo) | `PageView`, un único `Purchase` (`event_id` = `session_id`, valor US$30; no se repite al recargar) y `Schedule` (sin `value`) al reservar |
| `/estimados-gracias` (final) | `PageView` y `Lead` (sin `value`; `event_id` = `lead_<momento de la reserva>`), **una sola vez por cita aunque se recargue**; sin cita guardada NO hay Lead |
- `Schedule` y `Lead` se disparan por la misma acción (reservar). Si se quiere uno solo, quitar `Schedule` de `EstimadosTy.handleBooked`.
- **Servidor (API de Conversiones):** el secret `META_CAPI_ACCESS_TOKEN_ESTIMADOS` **ya está cargado** (2026-11-07). Cuando se desplieguen `stripe-webhook` y `product-track-event`, el servidor mandará el Purchase
  (mismo `event_id` que el navegador, para que Meta no lo cuente doble) y los ViewContent/InitiateCheckout de la landing. Hasta entonces el servidor no manda nada. El `Lead` y el `Schedule` no tienen versión de
  servidor (la lista de `product-track-event` es cerrada). Para probar sin ensuciar los datos reales: secret opcional `META_CAPI_TEST_EVENT_CODE_ESTIMADOS` (código de «Probar eventos»; **quitarlo después**).
- **Localhost no manda nada** (`src/lib/metaPixel.ts`): así abrir las páginas en tu computadora no ensucia el pixel real. Para probar a propósito en local (ej. con Meta Pixel Helper) se abre
  cualquier página con `?fbtest=1`; se recuerda durante esa pestaña.

## `/estimados-gracias`: la página FINAL del embudo (después de agendar)
Recomendación (y decisión de Daniel): al reservar, **redirigir a una página final propia** en vez de quedarse en el mensaje genérico del calendario. Motivos: confirma de forma clara y reduce las
ausencias, da una URL única para medir el `Lead` sin duplicados, y es el lugar para los siguientes pasos y la ayuda. Contenido:
- **Barra**: la del 90 % de la página anterior sube hasta el **100 %** («¡Todo listo!») y suelta **confeti** (una sola caída de ~4 s; sin movimiento si la persona pidió menos animación; no se puede tocar).
- **Título**: «<Nombre>, tu llamada ya está agendada» (sin cita: «Tu compra está confirmada»).
- **Sección 1, descargar el kit desde el correo**: 5 pasos con el **asunto y el remitente reales** del correo («Descarga tu compra: +50 Anuncios Virales Tree Services»; los comprueba `ebook-order.test.ts` contra el
  catálogo), el botón «Descargar mi kit», Google Drive, WiFi y descomprimir el ZIP. **No muestra el enlace de Drive.**
- **Sección 2, tu llamada**: día, hora y zona **en la zona de quien reservó** (el calendario del admin está en La Paz; `src/lib/slotTime.ts`) y «Te hablaremos por WhatsApp para coordinar la reunión».
  Sin cita: «Todavía no agendas…» y un botón para volver a agendar.
- **Sección 3, datos de contacto para ayuda**: pie oscuro con WhatsApp +591 57697071 y daniel@acrosoftlabs.com (el mismo componente que usa `/estimados-ty`, que también conserva su pie).
Ruta en `App.tsx`, `Disallow` en `robots.txt`, noindex. Abre siempre arriba (se llega desde el calendario con la pantalla bajada). Vista previa local: `/estimados-gracias?demo=1` (cita simulada, sin eventos).
**Ojo:** el calendario del admin solo manda recordatorios por correo; la página promete que se hablará por WhatsApp, así que alguien tiene que escribir esa coordinación (o configurar recordatorios por WhatsApp en el CRM).

**Copy por validar con Daniel:** el título, las 3 viñetas y la nota son propuesta mía. No se inventó ningún cupo ni fecha límite: si se quiere escasez o
urgencia, tiene que ser real (cupos por semana del calendario). Pendiente decidir qué se ofrece al final de la llamada (precio, garantía) y quién la toma.

**Vista previa local** (solo en desarrollo): `/estimados-ty?demo=1` usa una compra simulada sin llamar al servidor; `&calendar=<id>` prueba un calendario real.

## Qué hay hoy
| Archivo | Para qué |
|---|---|
| `src/pages/EstimadosTy.tsx`, `src/components/estimados/estimadosTyStyles.ts` | La página del regalo y su CSS (a mano, solo lo propio; reusa las variables de `EST_CSS`). El calendario va **fuera** de `.est-page` a propósito: sus `<p>`/`<h2>` son de Tailwind y los estilos de la página los deformarían. |
| `src/pages/EstimadosTy.test.tsx` | 36 pruebas (incluye pasar a la página final al reservar, y el resplandor del calendario estático y apagado al reservar, y los espacios del texto de bienvenida): barra al 90 % (sin el texto de «solo falta»), imagen 3D del billete con moño, texto de bienvenida entre la imagen y el título (con la tipografía de «Valor normal»), estilos fijados (pie negro, cuadros numerados, pie al fondo), caja con laptop y «GRATIS», valor en una fila con la misma tipografía, lista numerada, sin nota ni título del calendario, sin descarga ni botón de CTA, orden barra → título → video, pie de soporte (también sin compra), calendario del admin, video, estados (sin sesión, reintentos), eventos de Meta, prefijo `est-`. |
| `src/components/crm/CalendarRenderer.tsx`, `CalendarRenderer.prefill.test.tsx` | Props nuevas **opcionales** `prefill`, `requireWhatsapp`, `phoneDefaultDial`: sin ellas el calendario se comporta exactamente como antes. 4 pruebas con el formulario del admin (+ un campo extra): solo WhatsApp, no reserva sin WhatsApp, qué se envía, y comportamiento intacto sin las props. |
| `public/estimados/regalo.{webp,png}` | Imagen 3D del billete de US$100 con moño (27 KB / 119 KB, con transparencia). |
| `src/pages/EstimadosGracias.tsx`, `src/components/estimados/estimadosGraciasStyles.ts` | La página FINAL (tras agendar): barra al 100 % con confeti, 3 secciones y el evento Lead. |
| `src/pages/EstimadosGracias.test.tsx`, `src/lib/estimadosBooking.test.ts` | 18 + 13 pruebas: barra, secciones, orden, confeti (y sin él con `prefers-reduced-motion`), Lead una sola vez por cita, sin cita, datos dañados, noindex, abre arriba. |
| `src/lib/estimadosBooking.ts` | Guarda (sessionStorage) y valida la cita que pasa de `/estimados-ty` a `/estimados-gracias`. |
| `src/lib/slotTime.ts`, `slotTime.test.ts` | Horas de las citas, extraídas de `CalendarRenderer` sin cambiar su lógica (+ el resumen en español en la zona de la persona). |
| `src/components/estimados/EstimadosSupportFooter.tsx` | Pie oscuro de soporte, compartido por las dos páginas. |
| `src/lib/metaPixel.ts` (+ prueba) | Cambio compartido: en localhost no se carga el pixel ni se mandan eventos (salvo `?fbtest=1`, que se recuerda en la pestaña). Afecta también a las páginas de otros productos, solo en local. |
| `supabase/functions/estimados-get-order/` | Pública (`verify_jwt = false`, protegida por el `session_id`). Devuelve nombre, correo y datos del Purchase; **no** devuelve el enlace del kit. |
| `supabase/migrations/20261107_ebook_orders_customer_name.sql` | Columna `ebook_orders.customer_name`. |
| `supabase/functions/_shared/ebook-catalog.ts`, `ebook-order.ts`, `stripe-webhook/index.ts` | Entrada `estimados` (sin `meta` hasta que haya pixel; con `emailDownloadUrlEnv` y `emailGift`), correo con el kit y el regalo (los demás productos mantienen su correo de siempre), y guardado **best-effort** del nombre (si la columna aún no existe no rompe ningún producto). |
| `supabase/functions/_shared/ebook-order.test.ts` | Pruebas nuevas del producto y del correo (93 de Deno en total). |
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
1. ✅ **Payment Link live de Stripe** (hecho, `ESTIMADOS_PAYMENT_LINK`). Redirige a `https://www.acrosoftlabs.com/estimados-ty?session_id={CHECKOUT_SESSION_ID}`.
2. ✅ **Pixel ID de Meta** `1013028214851437` (hecho: `ESTIMADOS_PIXEL_ID` y `meta.pixelId` del catálogo, que coinciden; lo comprueba `ebook-order.test.ts`).
3. ✅ **Token de la API de Conversiones** de ese pixel: **cargado el 2026-11-07** como secret `META_CAPI_ACCESS_TOKEN_ESTIMADOS` en Supabase (Edge Functions → Secrets), con la CLI de Supabase de Daniel. El valor NO está en el repo, ni en esta documentación, ni en ningún archivo.
   Meta lo reconoció como token (una consulta de solo lectura respondió «Missing Permission», no «token inválido»: los tokens de la API de Conversiones solo sirven para enviar eventos). **Efecto: ninguno hasta desplegar** `stripe-webhook` y `product-track-event`.
   El token se pegó en el chat: si ese chat se comparte, conviene regenerarlo en Events Manager y volver a cargar el secret.
4. ✅ **Enlace de Google Drive del kit** (hecho: en el catálogo, va en el correo de Resend; el ZIP pesa 210 MB y no cabe en Storage). Comprobar que el archivo esté compartido como «cualquiera con el enlace».
5. ✅ **Calendario de la llamada:** hecho, el del admin (ver «Calendario» arriba). Pendiente decidir en el CRM: si los horarios (hora de La Paz) sirven para compradores de EE.UU., si 5 días de
   anticipación máxima alcanzan, y si se quieren recordatorios por **WhatsApp** (hoy solo hay por correo; Nico recomienda 1 día, 1 hora y al momento para subir la asistencia).
6. **Video** → `ESTIMADOS_TY_VIDEO_URL` (el guion se define después; sin URL la página simplemente no lo muestra).
7. ✅ **Soporte:** hecho, pie con el WhatsApp +591 57697071 y el correo daniel@acrosoftlabs.com.

**Hecho (2026-11-07, sin desplegar; código que toca pagos compartidos: revisar el diff antes de desplegar):** entrada `estimados` del catálogo (con `tracking`, sin `meta`),
función `estimados-get-order`, página `/estimados-ty` con su ruta y `Disallow` en `robots.txt`, guardado del nombre en el webhook (best-effort), migración,
marca de `ab_sessions` como comprada (`ESTIMADOS_AB_CHECKOUT_SESSION_KEY`) y pruebas de catálogo que comparan `tracking` con `estimadosConfig.ts`.
**Sin diseñar:** upsells/downsells (hoy solo el kit de US$30 + la llamada) y el seguimiento a quien no reserva (el correo de compra ya trae el enlace a esta página).

**Cómo se desplegó (2026-11-07)** y cómo repetirlo (lo hace Daniel o con su orden expresa):
0. (Opcional) el secret `ESTIMADOS_ZIP_URL` solo si se quiere reemplazar el enlace de Drive del catálogo sin tocar código.
1. **Migraciones: SQL a mano en el SQL Editor (o con el MCP de Supabase). NO usar `supabase db push`**: el historial de migraciones local y el remoto no coinciden (la remota tiene cientos con versión de
   timestamp completo y decenas de archivos locales de solo fecha figuran como pendientes aunque ya están aplicadas), y `db push` intentaría reaplicarlas sobre producción. La de Estimados:
   `alter table public.ebook_orders add column if not exists customer_name text;` (el webhook tolera que falte: solo no se guarda el nombre y el contacto del CRM queda «Sin nombre»).
2. Funciones: `supabase functions deploy stripe-webhook estimados-get-order product-track-event --use-api --project-ref rhlnjtrbydwzzuvqayfo` (sin Docker; `--use-api` empaqueta en el servidor).
   El modo automático de Claude Code bloqueó este comando la primera vez; funcionó después de que Daniel dio permiso explícito.
3. Push del frontend a Vercel (`main`), ~2 minutos.
Orden recomendado: 1, 2 y recién 3 (si el frontend sale antes que las funciones, quien pague ve «Todavía no vemos tu compra»). Sin 1 y 2 el servidor no reconoce el producto: el pago se cobra pero no se registra la orden ni sale el correo.
**Prueba de punta a punta sugerida** (compra real de US$30 reembolsable): el correo llega por Resend con el botón «Descargar mi kit» (que abre el Drive) y el botón «Reclamar mi regalo»;
ese botón abre `/estimados-ty?session_id=…` con el nombre y el correo correctos; se reserva una llamada y el contacto aparece en el CRM con nombre, correo y WhatsApp.
Otros secrets: `META_CAPI_ACCESS_TOKEN_ESTIMADOS`, opcional `META_CAPI_TEST_EVENT_CODE_ESTIMADOS` (solo para probar; **quitarlo después**) y `ESTIMADOS_PAYMENT_LINK_IDS`.
Decisiones ya tomadas para el embudo de Piscinas que aplican igual: se prueba directo en live sin modo test, sin enlaces a Términos/Privacidad, soporte solo en la thank-you.

## Para encenderla
1. (Hecho) El Payment Link y el Pixel ID ya están en `src/lib/estimadosConfig.ts`.
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

## Verificación de `/estimados-ty` (2026-11-07, en local)
`tsc` sin errores · `eslint` limpio en los archivos nuevos y `CalendarRenderer.tsx` igual que antes (19 problemas preexistentes) · `vitest` 112/112 · `deno test` 93/93
(`deno check` de las dos funciones) · `npm run build`. Playwright con Chrome a 8 tamaños (ver arriba): sin desborde, video dentro de la primera pantalla, sin errores de consola. Recorrido real del calendario
con respuestas simuladas: día → horario → formulario **solo con WhatsApp** («Reservando como Carlos Ramírez · carlos@…», selector en +1) → la reserva sale con
`form_data = { f-name, f-email, f-phone: "+1 …" }`, que es lo que lee `crm-calendar-book`.
**No se probó:** una compra real de Stripe, la función `estimados-get-order` desplegada, la migración aplicada ni los eventos de Meta contra Meta de verdad.

## Verificación de `/estimados-gracias` y del pixel (2026-11-07, en local)
`tsc` sin errores · `eslint` limpio en los archivos nuevos y `CalendarRenderer.tsx` igual que antes (19 preexistentes) · `vitest` 155/155 · `deno test` 93/93 · `npm run build`. Auditoría en Chrome con un `fbq` espía y la
compra y la reserva simuladas (el calendario leyó el real; la reserva se interceptó: no se creó ninguna cita ni contacto): landing → PageView + ViewContent y InitiateCheckout en los 5 botones; regalo → PageView + Purchase
(`event_id` = session_id); reservar → Schedule, URL `/estimados-gracias`, PageView + Lead (`lead_<momento>`); barra en 100 %; 48 piezas de confeti que se quitan solas; abre con scrollY = 0; recargar la final → PageView sin otro Lead;
final abierta sin cita → PageView sin Lead; el HTML de la final no contiene el enlace de Drive; en localhost sin `?fbtest=1` no sale ningún evento.
**No se probó:** eventos recibidos por Meta (hay que mirar «Probar eventos» en Events Manager con la página desplegada), el correo real de Resend ni una compra real.
