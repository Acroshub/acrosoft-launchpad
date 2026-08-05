# ESLint — Pendientes

> Generado: 2026-08-04
> Estado de `tsc --noEmit`: **0 errores** (limpio en todo el proyecto).
> Estado de `npm run build`: exitoso.
> Estos 79 problemas son de **ESLint** (reglas de estilo/rigor de código), no errores de TypeScript — el build y la app funcionan igual con o sin ellos. Ya existían antes de esta sesión; quedan documentados aquí para trabajarlos cuando haya tiempo.

## Resumen por regla

| Regla | Cantidad | Severidad | Qué implica |
|---|---|---|---|
| `@typescript-eslint/no-explicit-any` | 71 | error | Código tipado como `any` en vez de un tipo específico. Mayormente resultados de queries a Supabase, manejadores de eventos o datos con forma JSON nunca tipificados con precisión. |
| `react-hooks/exhaustive-deps` | 6 | warning | `useEffect` que usa una variable dentro del efecto pero no la declara en su arreglo de dependencias. |
| `no-useless-escape` | 1 | error | Un carácter de escape innecesario (`\-`) dentro de una expresión regular. |
| `@typescript-eslint/no-unused-expressions` | 1 | error | Un ternario usado solo por sus efectos secundarios en vez de un if/else. Funciona bien en runtime, pero ESLint prefiere la forma explícita. |

**Total: 79 problemas (73 errores, 6 warnings) en 7 archivos.**

## Resumen por archivo

| Archivo | Problemas |
|---|---|
| `src/components/crm/CrmAgentIA.tsx` | 30 |
| `src/hooks/useCrmData.ts` | 12 |
| `src/components/crm/FormRenderer.tsx` | 16 |
| `src/components/crm/CrmWaTemplates.tsx` | 10 |
| `src/components/crm/CrmContacts.tsx` | 5 |
| `src/components/crm/CrmVideos.tsx` | 4 |
| `src/components/shared/ReminderRulesEditor.tsx` | 2 |

## Cómo abordar cada tipo (guía rápida)

- **`no-explicit-any`**: no vale con reemplazar `any` por `unknown` a ciegas — hay que revisar caso por caso qué forma tienen realmente los datos (sobre todo en respuestas de Supabase, donde suele hacer falta un tipo explícito para el resultado de `.select()` o `.rpc()`) y escribir el tipo correcto.
- **`react-hooks/exhaustive-deps`**: revisar si falta agregar la dependencia al arreglo, o si fue omitida a propósito (en ese caso, usar `// eslint-disable-next-line react-hooks/exhaustive-deps` con un comentario explicando por qué, en vez de dejarlo como warning suelto).
- **`no-useless-escape`**: fix trivial, quitar el `\` innecesario.
- **`no-unused-expressions`**: convertir el ternario de efecto en un if/else normal.

## Detalle por archivo

### `src/components/crm/CrmAgentIA.tsx` (30)

| Línea:Col | Regla | Mensaje |
|---|---|---|
| 348:19 | no-explicit-any | Unexpected any |
| 462:17 | no-explicit-any | Unexpected any |
| 478:17 | no-explicit-any | Unexpected any |
| 1542:79 | no-useless-escape | Unnecessary escape character: `\-` |
| 1956:33 | no-explicit-any | Unexpected any |
| 2338:6 | exhaustive-deps (warning) | Falta `businessProfile?.timezone` en el useEffect |
| 2345:6 | exhaustive-deps (warning) | Faltan `notifyEmail` y `paymentEmailSP` en el useEffect |
| 2532:19 | no-explicit-any | Unexpected any |
| 2576:19 | no-explicit-any | Unexpected any |
| 2609:19 | no-explicit-any | Unexpected any |
| 3620:34 | no-explicit-any | Unexpected any |
| 3620:119 | no-explicit-any | Unexpected any |
| 3622:147 | no-explicit-any | Unexpected any |
| 3907:195 | no-explicit-any | Unexpected any |
| 3907:239 | no-explicit-any | Unexpected any |
| 3975:58 | no-explicit-any | Unexpected any |
| 3976:58 | no-explicit-any | Unexpected any |
| 4380:47 | no-explicit-any | Unexpected any |
| 4393:53 | no-explicit-any | Unexpected any |
| 4404:37 | no-explicit-any | Unexpected any |
| 4632:63 | no-explicit-any | Unexpected any |
| 4650:66 | no-explicit-any | Unexpected any |
| 4749:39 | no-explicit-any | Unexpected any |
| 5355:32 | no-explicit-any | Unexpected any |
| 5356:26 | no-explicit-any | Unexpected any |
| 5357:46 | no-explicit-any | Unexpected any |
| 5378:31 | no-explicit-any | Unexpected any |
| 5419:6 | exhaustive-deps (warning) | Falta `onHighlightClear` en el useEffect (sugiere envolverlo en `useCallback` en el padre) |
| 5473:6 | exhaustive-deps (warning) | Falta `noteNavId` en el useEffect |
| 6475:6 | exhaustive-deps (warning) | Falta `selectedId` en el useEffect |

### `src/components/crm/CrmContacts.tsx` (5)

| Línea:Col | Regla | Mensaje |
|---|---|---|
| 461:32 | no-explicit-any | Unexpected any |
| 470:21 | no-explicit-any | Unexpected any |
| 902:19 | no-explicit-any | Unexpected any |
| 903:29 | no-explicit-any | Unexpected any |
| 1110:17 | no-explicit-any | Unexpected any |

### `src/components/crm/CrmVideos.tsx` (4)

| Línea:Col | Regla | Mensaje |
|---|---|---|
| 219:19 | no-explicit-any | Unexpected any |
| 423:19 | no-explicit-any | Unexpected any |
| 710:19 | no-explicit-any | Unexpected any |
| 1567:7 | no-unused-expressions | Ternario `next.has(id) ? next.delete(id) : next.add(id);` usado como statement — convertir a if/else |

### `src/components/crm/CrmWaTemplates.tsx` (10)

| Línea:Col | Regla | Mensaje |
|---|---|---|
| 234:58 | no-explicit-any | Unexpected any |
| 326:43 | no-explicit-any | Unexpected any |
| 329:52 | no-explicit-any | Unexpected any |
| 512:76 | no-explicit-any | Unexpected any |
| 528:34 | no-explicit-any | Unexpected any |
| 529:79 | no-explicit-any | Unexpected any |
| 536:34 | no-explicit-any | Unexpected any |
| 537:88 | no-explicit-any | Unexpected any |
| 629:6 | exhaustive-deps (warning) | Falta `handleSync` en el useEffect |
| 744:15 | no-explicit-any | Unexpected any |

### `src/components/crm/FormRenderer.tsx` (16)

| Línea:Col | Regla | Mensaje |
|---|---|---|
| 142:56 | no-explicit-any | Unexpected any |
| 316:25 | no-explicit-any | Unexpected any |
| 317:32 | no-explicit-any | Unexpected any |
| 320:31 | no-explicit-any | Unexpected any |
| 324:54 | no-explicit-any | Unexpected any |
| 413:10 | no-explicit-any | Unexpected any |
| 414:17 | no-explicit-any | Unexpected any |
| 556:10 | no-explicit-any | Unexpected any |
| 557:17 | no-explicit-any | Unexpected any |
| 766:30 | no-explicit-any | Unexpected any |
| 771:49 | no-explicit-any | Unexpected any |
| 829:30 | no-explicit-any | Unexpected any |
| 834:28 | no-explicit-any | Unexpected any |
| 848:63 | no-explicit-any | Unexpected any |
| 857:28 | no-explicit-any | Unexpected any |
| 874:31 | no-explicit-any | Unexpected any |

### `src/components/shared/ReminderRulesEditor.tsx` (2)

| Línea:Col | Regla | Mensaje |
|---|---|---|
| 97:35 | no-explicit-any | Unexpected any |
| 225:34 | no-explicit-any | Unexpected any |

### `src/hooks/useCrmData.ts` (12)

| Línea:Col | Regla | Mensaje |
|---|---|---|
| 486:35 | no-explicit-any | Unexpected any |
| 2004:31 | no-explicit-any | Unexpected any |
| 2025:35 | no-explicit-any | Unexpected any |
| 2235:35 | no-explicit-any | Unexpected any |
| 2255:35 | no-explicit-any | Unexpected any |
| 2270:35 | no-explicit-any | Unexpected any |
| 2282:80 | no-explicit-any | Unexpected any |
| 2297:77 | no-explicit-any | Unexpected any |
| 2473:62 | no-explicit-any | Unexpected any |
| 2500:43 | no-explicit-any | Unexpected any |
| 2509:29 | no-explicit-any | Unexpected any |
| 2510:29 | no-explicit-any | Unexpected any |

## Cómo regenerar este listado

```bash
npx eslint src/components/crm/CrmAgentIA.tsx src/components/crm/CrmContacts.tsx \
  src/components/crm/CrmVideos.tsx src/components/crm/CrmWaTemplates.tsx \
  src/components/crm/FormRenderer.tsx src/components/shared/ReminderRulesEditor.tsx \
  src/hooks/useCrmData.ts
```

(Las líneas se van a desplazar a medida que se edite cada archivo — este listado es una foto del 2026-08-04, no una fuente viva.)
