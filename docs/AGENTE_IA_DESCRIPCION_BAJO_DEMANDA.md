# Agente IA — Descripción de producto bajo demanda ("opción 4")

> Creado: 2026-08-07
> Estado: **No implementado — decisión documentada.** No bloqueado ni descartado, se retoma si cambian las condiciones descritas abajo.

## Contexto

Durante la optimización de costos del agente IA (WhatsApp, `supabase/functions/ai-agent/index.ts`) se estableció que Claude Haiku 4.5 solo cachea bloques de prompt de **≥4.096 tokens** — por debajo de eso, cada mensaje se cobra a precio completo ($1.00/M en vez de ~$0.10-0.37/M efectivo con caché). Esto llevó a dos mecanismos ya implementados:

1. **Relleno automático de caché** (`CACHE_FILLER_MODULES` / `applyCacheFiller` en `ai-agent/index.ts`): si el prompt propio de un negocio (system_prompt + catálogo) no llega al umbral, se le agregan módulos de buenas prácticas de venta hasta cruzarlo. Garantiza que **ninguna cuenta quede nunca por debajo del umbral**, sin depender de que el negocio configure catálogo.
2. **Recorte manual de contenido redundante**: para Barón Group se detectó que la descripción de su único producto (10.156 caracteres) repetía ~82% de lo que ya estaba en su `system_prompt` (precio, envíos, garantía). Se recortó a 1.760 caracteres, dejando solo lo que no estaba duplicado (mecanismo de acción, ficha INCI, protocolo de alopecia, seguridad). Resultado: prompt de ~8.300 → ~5.600 tokens, sin perder información real.

## Qué es la "opción 4"

En vez de enviar la ficha completa de cada producto en **todos los mensajes** (esté o no relacionada con lo que el cliente preguntó), dejar en el prompt solo un resumen corto, y exponer el detalle completo como una **herramienta (tool call)** que el agente invoca únicamente cuando el cliente pregunta algo que lo requiere (ingredientes, especificaciones técnicas, protocolos, etc.).

## Por qué no se implementa ahora

El relleno de caché ya resuelve el problema de "todos cruzan el umbral" — eso ya no depende del tamaño del catálogo. Lo único que la opción 4 seguiría aportando es reducir el **excedente** de prompt en cuentas cuyo catálogo es mucho más grande de lo necesario. Hoy (2026-08-07) solo hay una cuenta así:

| Cuenta | Prompt actual | Llamadas/30d | Costo/30d |
|---|---|---|---|
| **Cer Solutions** | ~9.977 tokens (un producto con descripción de 8.614 caracteres) | 8 | **$0.06** |

El ahorro potencial de construir la opción 4 para Cer Solutions es de centavos al mes — el volumen es demasiado bajo para justificar el trabajo de ingeniería (definir la herramienta, escribir versión corta y versión larga de cada producto, validar que el modelo la invoque cuando corresponde y no de más ni de menos, mantenerla sincronizada cuando el negocio edite su catálogo).

Barón Group, la única cuenta con volumen alto (cientos de mensajes/mes), ya no tiene exceso de catálogo — se recortó a mano y su prompt (~5.600 tokens) ya está bien dimensionado.

## Cuándo reconsiderarla

Cuando aparezca una cuenta que combine **ambas condiciones a la vez**:
- Catálogo genuinamente grande (varios productos con descripciones extensas, no solo uno).
- Volumen de mensajes alto (para que el ahorro por mensaje se traduzca en dólares reales, no centavos).

Si eso ocurre, la opción 4 sí tendría ROI claro.

## Alternativa de bajo costo, disponible ahora

Aplicar a Cer Solutions el mismo recorte manual que se le hizo a Barón: comparar su descripción de 8.614 caracteres contra su `system_prompt`, eliminar lo redundante, dejar solo la información que no está duplicada. Mismo ahorro de tokens, sin construir nada nuevo, sin el riesgo de que el modelo decida mal cuándo llamar a una herramienta. Pendiente de hacer — no se ha tocado la descripción de Cer Solutions.

## Bosquejo técnico (si se decide implementar en el futuro)

- Tool `get_product_detail(product_id)` — el agente la llama solo si la pregunta del cliente no se puede responder con el resumen corto ya presente en el prompt.
- Requiere mantener dos versiones de cada producto: resumen corto (siempre en el prompt) y detalle completo (servido bajo demanda) — carga de mantenimiento cada vez que el negocio edita su catálogo.
- Riesgos a validar antes de construir: que el modelo no invoque la herramienta cuando debería (respuesta incompleta al cliente) o la invoque de más (anulando el ahorro); latencia extra del round-trip en el turno donde sí se necesita el detalle.
