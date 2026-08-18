# Agente IA — Caché condicional según el volumen del tenant

> Creado: 2026-08-17
> Estado: **No implementado — decisión documentada.** No bloqueado ni descartado; se retoma cuando crezca la cantidad de cuentas (ver "Cuándo reconsiderarla").

## El hallazgo

Comparando el costo del agente antes y después de los cambios del 17 de agosto de 2026, apareció un caso que no cuadraba: la cuenta **Daniel** parecía haber duplicado su costo por mensaje. Al mirar sus llamadas una por una resultó ser otra cosa, preexistente y más interesante.

```
02:21  write 4304   read 0     $0,0096
01:05  write 4304   read 0     $0,0097
23:16  write 4304   read 0     $0,0093
18:58  write 0      read 4194  $0,0008   <- la única que aprovechó el caché
18:57  write 4233   read 0     $0,0092
```

**Escribe el caché y nunca llega a leerlo.** Sus mensajes llegan separados por más de una hora, así que la entrada expira antes del siguiente. Escribir con TTL de 1 h cuesta **2× el precio de entrada**; no cachear cuesta 1×. En esas llamadas está pagando el doble por un caché que se tira.

Medido sobre 7 días, la correlación con el volumen es directa:

| Cuenta | Llamadas | Escrituras sin lectura | % |
|---|---|---|---|
| Daniel | 21 | 13 | **62 %** |
| Asistente | 721 | 52 | 7 % |

Visto como ratio de aprovechamiento (lecturas por cada escritura):

| Cuenta | Ratio lectura/escritura | Veredicto |
|---|---|---|
| Asistente | 12,9 | el caché rinde muy bien |
| Daniel | **0,6** | el caché cuesta más de lo que ahorra |

El punto de equilibrio está en **2 lecturas por escritura** (cálculo abajo). Daniel está en 0,6.

## Por qué pasa: dos decisiones que hoy son una sola

Es fácil confundir el umbral de caché con el pedido de caché. Son cosas distintas:

| | Quién lo decide | Qué implica |
|---|---|---|
| Umbral de 4.096 tokens (Haiku 4.5) | Anthropic | Si el prompt es más corto, no se cachea **aunque se lo pidas** |
| `cache_control` en el request | Nosotros, por llamada | Si no se manda, no se cachea y se paga entrada normal |

Hacer caché condicional **no es achicar el prompt para quedar bajo el umbral**. Es no mandar `cache_control` en esa llamada: el prompt viaja igual de grande pero se cobra a 1× en vez de 2×.

Hoy `buildSystemBlocks` (`ai-agent/index.ts`, línea ~2853) manda `cache_control` **siempre**, sin mirar si conviene:

```ts
{ type: "text", text: stable, cache_control: { type: "ephemeral", ttl: "1h" } }
```

Y de ahí se desprende lo segundo: `applyCacheFiller` (línea ~2290) agrega ~2.700 caracteres de módulos con el único fin de cruzar el umbral. **Si no se va a cachear, ese relleno es puro costo** — unos 885 tokens pagados a precio completo sin obtener nada a cambio.

Las dos decisiones son en realidad una:

```
¿conviene cachear?  ->  SÍ:  aplicar relleno  +  cache_control
                    ->  NO:  sin relleno      +  sin cache_control
```

Para una llamada aislada de Daniel:

| | Tokens | Costo |
|---|---|---|
| Hoy (relleno + caché escrito y tirado) | 4.304 | $0,0086 |
| Sin relleno ni caché | 3.419 | **$0,0034** |

**60 % menos**, contando el relleno evitado.

## El punto de equilibrio

Con un prompt de ~4.300 tokens y N lecturas antes de que la entrada expire:

| Lecturas | Con caché | Sin caché | Gana |
|---|---|---|---|
| 0 | 8.600 | 3.419 | sin caché |
| 1 | 9.030 | 6.838 | sin caché |
| **2** | 9.460 | 10.257 | **caché** |
| 3 | 9.890 | 13.676 | caché |

A partir de **2 lecturas** conviene cachear. Con menos, no.

Hay una asimetría que conviene aprovechar: equivocarse hacia "no cachear" cuesta 1× en esa llamada, mientras que equivocarse hacia "cachear" cuesta 2× tirados. **El error barato es no cachear**, así que ante la duda el criterio debe inclinarse hacia ahí.

## Cómo decidir en tiempo de ejecución

El caché es del prompt del **tenant**, compartido por todas sus conversaciones: un negocio con 10 chats simultáneos lo lee muchas veces aunque cada conversación esté espaciada. Por eso la señal tiene que medir la cuenta completa, no la conversación.

| Opción | Cómo | Contra |
|---|---|---|
| **A. Consultar el log de uso** (recomendada) | `count(*)` sobre `crm_ai_usage_log` filtrando la última hora | Una consulta extra por request |
| B. Campo `last_call_at` en `crm_ai_agent_config` | Sin consulta extra: el agente ya carga la config | Solo sabe *cuándo* fue la última, no *cuántas* hubo |
| C. Contador rodante en la config | Más preciso que B | Hay que cuidar las condiciones de carrera entre llamadas concurrentes |

**Recomendada: A.** El índice necesario ya existe —`crm_ai_usage_log_user_created_idx` sobre `(user_id, created_at DESC)`— así que es un index-only scan de 5-10 ms, despreciable frente a los 2-5 s que tarda Claude. No requiere migración ni mantener estado.

```sql
select count(*) from crm_ai_usage_log
where user_id = $1 and created_at > now() - interval '1 hour';
-- >= 2  ->  cachear
```

## Bosquejo técnico

**1. Propagar la decisión.** `buildSystemBlocks(stable, volatile, useCache)`:

```ts
function buildSystemBlocks(stable: string, volatile: string, useCache: boolean) {
  const blocks: unknown[] = [
    useCache
      ? { type: "text", text: stable, cache_control: { type: "ephemeral", ttl: "1h" } }
      : { type: "text", text: stable },
  ];
  if (volatile.trim()) {
    blocks.push(useCache
      ? { type: "text", text: volatile, cache_control: { type: "ephemeral" } }
      : { type: "text", text: volatile });
  }
  return blocks;
}
```

**2. Saltear el relleno cuando no se cachea.** `buildSystemPrompt` recibe el mismo flag y omite `applyCacheFiller`. Sin este paso el ahorro se reduce a la mitad: se evita el 2× pero se siguen pagando los ~885 tokens de relleno.

**3. Calcular el flag una vez por request**, antes de construir el prompt, y pasarlo a ambas funciones. `callClaude` y `callClaudeAgentLoop` ya reciben todo lo demás por parámetro.

**Cuidado con `notifyInsufficientFiller`:** hoy avisa al superadmin cuando el relleno no alcanza para cruzar el umbral. Cuando se decide no cachear a propósito, esa alerta no debe dispararse — no es un problema, es la decisión correcta.

## Cuándo reconsiderarla

**El ahorro hoy es chico.** Las 13 escrituras perdidas de Daniel en 7 días son unos **$0,29/mes**. No justifica tocar el agente.

El argumento no es el dinero de hoy: es que **todo tenant nuevo empieza exactamente en ese perfil** —poco tráfico, mensajes espaciados— y son justo las cuentas de plan básico, donde el margen es más ajustado. El desperdicio escala con la cantidad de cuentas, no con el uso.

**Disparadores concretos:**

- ~15 cuentas activas con ratio lectura/escritura por debajo de 2 (a $0,29/mes cada una, unos $4-5/mes).
- Que el plan básico de $10 quede con margen por debajo del 45 %, donde estos centavos empiezan a pesar.
- Que se sume un modelo con umbral de caché más alto, lo que agranda el relleno y con él el desperdicio.

**Consulta de diagnóstico** para saber cuándo se cruzó el umbral:

```sql
select c.agent_name,
       count(*) as llamadas,
       count(*) filter (where l.cache_read_tokens > 0) as lecturas,
       count(*) filter (where l.cache_creation_tokens > 1000) as escrituras,
       round(count(*) filter (where l.cache_read_tokens > 0)::numeric
             / nullif(count(*) filter (where l.cache_creation_tokens > 1000), 0), 1) as ratio
from crm_ai_usage_log l
join crm_ai_agent_config c on c.user_id = l.user_id
where l.source = 'ai-agent' and l.created_at > now() - interval '7 days'
group by 1 having count(*) > 10 order by ratio;
```

Cualquier cuenta con `ratio < 2` está perdiendo dinero con el caché.

## Advertencia al medir el resultado

Después de implementarlo **van a verse más escrituras de caché, no menos.** Al alternar entre "con relleno" y "sin relleno" el prompt cambia de forma, así que cuando una cuenta vuelve a cachear escribe una entrada nueva en vez de reusar la anterior.

El costo total baja igual, pero un tablero que mire `cache_creation_tokens` va a parecer que empeoró. **Medir por `cost_usd`, nunca por cantidad de escrituras.**

## Alternativa descartada: bajar el TTL a 5 minutos

Se evaluó usar `ttl: "5m"` (escritura a 1,25× en vez de 2×) en lugar de decidir por volumen. No sirve: las ráfagas reales de Daniel tienen mensajes cada 6-10 minutos, así que con 5 minutos la entrada expira *dentro* de la ráfaga y habría que reescribir en cada mensaje. Para su ráfaga del 17/08 entre las 16:24 y las 17:54 (1 escritura + 5 lecturas), el TTL de 1 h costó $0,0158 y con 5 min habrían sido $0,0324 — el doble.

El TTL actual de 1 h es el correcto **cuando se cachea**. El problema no es la duración sino cachear en llamadas que no lo aprovechan.
