# Bandeja de WhatsApp — Paginación de la lista de conversaciones

> Creado: 2026-08-17
> Estado: **No implementado — decisión documentada.** No bloqueado ni descartado; se retoma cuando se crucen los umbrales de la sección "Cuándo reconsiderarla".

## Contexto

Durante la revisión de costos de agosto de 2026 se midió de dónde sale el egress de Supabase en la bandeja de WhatsApp. La hipótesis inicial era que lo dominaba la multimedia (imágenes de las conversaciones), y resultó falsa.

Medición sobre datos reales:

| Dato | Valor |
|---|---|
| Conversaciones (`crm_wa_conversations`) | 1.314 |
| Mensajes por conversación (promedio) | 5 |
| Conversación más larga | 117 mensajes |
| Imágenes en todo el sistema | 512 (≈2 por chat que tiene) |
| Documentos / audios | 16 / 1 |
| Peso de la tabla, todas las columnas | 195 kB |
| Peso solo de las columnas que usa la lista | 62 kB |

El consumidor real era `useWaConversations`: traía **las 1.314 conversaciones enteras** (`select("*")`, sin `limit`) cada 5 minutos y otra vez en cada vuelta a la pestaña — esto último sin freno, porque `refetchOnWindowFocus: true` sin `staleTime` hace que React Query considere los datos obsoletos de inmediato.

## Qué se hizo en lugar de paginar

Tres cambios de bajo riesgo que no tocan la interfaz, todos en `src/hooks/useCrmData.ts`:

1. **`select` con columnas explícitas** (`WA_CONVERSATION_LIST_COLUMNS`) en vez de `*`. Se quitó `triggered_flow_ids`, que el frontend no usa y era de las más pesadas. Va como literal, no concatenado, porque supabase-js infiere el tipo del resultado analizando ese string.
2. **`WA_LIST_REFETCH_MS` de 15 minutos** para las tres consultas de listas (activas, archivadas y previews), separada de `WA_FALLBACK_REFETCH_MS` de 5 minutos, que se mantiene para los mensajes del chat abierto: son pocas filas y un mensaje que tarda en aparecer se nota mucho más que una lista desfasada.
3. **`staleTime` igual al intervalo** en esas tres, para que volver a la pestaña no dispare una descarga completa.

Resultado medido, por usuario y mes (jornada de 8 h, ~40 cambios de pestaña por día):

| Escenario | GB/mes | vs. inicio |
|---|---|---|
| Antes: `select *`, 5 min, focus sin freno | 1,67 | — |
| Solo el `select` acotado | 1,30 | −22 % |
| 15 min, sin `staleTime` | 0,69 | −59 % |
| **15 min + `staleTime`** (lo aplicado) | **0,35** | **−79 %** |

Con 4 usuarios activos: de 6,7 GB/mes a 1,42 GB, contra los 5 GB del plan gratuito.

## Por qué no se paginó ahora

Porque con esos tres cambios el egress quedó en menos de un tercio del límite, y paginar **no es mover un `limit`: obliga a reescribir el filtrado entero de la bandeja.**

Hoy `filteredConvs` (en `CrmAgentIA.tsx`, alrededor de la línea 5324) opera sobre el array completo en memoria y combina **cuatro filtros**:

| Filtro | Fuente | Qué haría falta en servidor |
|---|---|---|
| Búsqueda por texto | `search` sobre `contact_name` y `phone` | `ilike` sobre ambas columnas, con el teléfono normalizado sin separadores |
| Etiquetas | `convLabelsMap` de `useAllConversationLabels` | `join`/`in` contra `crm_wa_conversation_labels`, con semántica AND (hoy exige *todas* las etiquetas seleccionadas) |
| Asignación | `assignFilter`: `unassigned` / `mine` | `is null` o `eq` sobre `assigned_to` |
| Leído / no leído | `readFilter` + `stickyUnreadIds` | `unread_count > 0`, más la lógica de "sticky" que hoy vive solo en el cliente |

Los cuatro son combinables entre sí y se aplican sobre activas o archivadas según `showArchived`. Moverlos al servidor implica reconstruir esa combinatoria en SQL y mantener las dos implementaciones alineadas mientras dure la transición.

A eso se suma que **`useWaLastMessages` también trae una fila por conversación** (la vista `crm_wa_conversation_last_message`, sin filtro por usuario porque es `security_invoker`). Paginar la lista sin paginar esa consulta en paralelo deja la mitad del ahorro sobre la mesa, y sincronizar ambas paginaciones es parte del trabajo.

En resumen: es reemplazar algo que hoy funciona bien y es instantáneo por algo nuevo con latencia y superficie de bugs, para ahorrar un egress que ya está controlado.

## Cuándo reconsiderarla

El consumo escala de forma lineal con la cantidad de conversaciones y de usuarios activos. Con las optimizaciones ya aplicadas:

| Situación | GB/mes | ¿Aprieta? |
|---|---|---|
| 1.314 conversaciones, 4 usuarios (agosto 2026) | 1,4 | no |
| 5.000 conversaciones, 4 usuarios | 5,4 | **sí** |
| 1.314 conversaciones, 15 usuarios | 5,3 | **sí** |

**Disparadores concretos:** ~5.000 conversaciones en un tenant, ~14 usuarios activos simultáneos, o pasar a un plan de pago donde el egress se factura por GB. Cualquiera de los tres alcanza.

Antes de construir, volver a medir: los números de arriba salen de una jornada estimada de 8 horas y ~40 cambios de pestaña. Si el uso real cambió, el umbral se mueve.

## Bosquejo técnico

Orden sugerido, de menos a más invasivo. Los tres primeros pasos son independientes entre sí y cada uno aporta por separado.

**1. Paginar la lista sin tocar los filtros.** Convertir `useWaConversations` a `useInfiniteQuery` con `.range(from, to)` de a 50, y scroll infinito hacia abajo en la lista. Mientras no haya búsqueda ni filtros activos funciona tal cual. **Requisito:** que `filteredConvs` detecte cuándo hay algún filtro activo y, en ese caso, fuerce la carga completa o pase al modo servidor — si no, el usuario buscaría solo dentro de las 50 cargadas y no lo notaría, que es el peor modo de fallo posible.

**2. Búsqueda en servidor.** `ilike` sobre `contact_name` y sobre `phone` normalizado, con debounce de ~300 ms. Conviene un índice `gin` con `pg_trgm` sobre ambas columnas: sin él, `ilike '%texto%'` hace scan secuencial y a 5.000 filas ya se nota. La UI necesita un estado de carga que hoy no existe, porque el filtro en memoria es instantáneo.

**3. Filtros en servidor.** Etiquetas, asignación y leído/no leído, respetando que se combinan entre sí. El de etiquetas es el más delicado por la semántica AND. Revisar aquí si `useAllConversationLabels` sigue teniendo sentido trayendo el mapa completo.

**4. Paginar `useWaLastMessages` en paralelo**, o cambiarla por una consulta que reciba los IDs de la página actual (`in (...)`). Sin este paso el ahorro queda a la mitad.

**Invariantes que no se pueden romper:**

- `useWaRealtime` parchea la caché de React Query con `patchWaConversation` cuando llega un evento. Con `useInfiniteQuery` la forma de la caché cambia (páginas en vez de array plano) y **ese parcheo hay que reescribirlo**, o la bandeja deja de actualizarse en vivo.
- Una conversación que recibe un mensaje sube al tope por `last_message_at`. Con paginación puede estar en una página que todavía no se cargó: hay que decidir si se inserta al tope de la primera página o se recarga.
- El contador de no leídos de la cabecera no puede depender de las conversaciones cargadas; si hoy se calcula sobre el array completo, pasa a necesitar un `count` aparte.

## Alternativas más baratas, si se necesita margen antes del umbral

- **Subir `WA_LIST_REFETCH_MS`** de 15 a 30 minutos. Realtime cubre `crm_wa_conversations` con `event: "*"`, así que el intervalo es solo respaldo. Es cambiar un número y aporta otro ~40 %.
- **Archivar conversaciones inactivas.** `useWaConversations` ya filtra por `is_archived = false`, así que archivar reduce la lista sin tocar código. Un archivado automático a los N meses sin actividad ataca el crecimiento en la raíz.
- **Quitar `user_id` del `select`.** Son ~21 kB de 195 kB, pero hay que verificar antes que ningún consumidor lo use.
