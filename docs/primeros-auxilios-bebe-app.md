# Primeros Auxilios del Bebé — webapp (`/primeros-auxilios-bebe-app`)

Herramienta de cliente del producto «Primeros Auxilios del Bebé (0 a 12 Meses)». Sin cuentas ni backend; acceso con una
contraseña compartida que es la **llave de cifrado** de los PDFs de la Biblioteca (mismo patrón que `docs/toefl-audiolab.md`).

## Qué hace
Inicio con filtro de edad (0–3, 3–6, 6–12 meses, o fecha de nacimiento) · tarjetas de emergencia a pantalla completa
(Qué ver / Qué hacer ya / Cuándo llamar) · sin contactos ni botón de llamada (la tarjeta indica llamar a emergencias de tu país) ·
quiz semanal de 5 preguntas · checklist de casa segura por habitación · Biblioteca (ebook + 3 bonos en PDF).
Estado en `localStorage` (prefijo `pab_`, con try/catch; si está bloqueado se guarda en memoria).

## Dónde está el código
- Página: `src/pages/PrimerosAuxiliosBebeApp.tsx` · módulos: `src/pages/primeros-auxilios-bebe-app/`
- **Contenido editable:** `cards.ts` (tarjetas), `quiz.ts`, `checklist.ts`. En `cards.ts`, `pendingReview: true` muestra la marca
  «Contenido pendiente de revisión profesional» (hoy: atragantamiento/RCP). Quítala solo tras la revisión de un profesional.
  Sin dosis de medicamentos (hay un test que lo vigila).
- Lógica pura: `logic.ts` (+ `logic.test.ts`); cifrado: `crypto.ts` ↔ `scripts/primeros-auxilios-bebe-app/lab-crypto.mjs` (+ `crypto.test.ts`).

## Paquete cifrado
`public/primeros-auxilios-bebe-pack/` (no se llama igual que la ruta para no tapar la SPA): `meta.json` (salt, versión; en claro),
`content.bin` (lista de la Biblioteca) y `lib/<id>.bin` (PDFs). AES-256-GCM, llave PBKDF2-SHA256 250 000 it.

```bash
PRIMEROS_AUXILIOS_BEBE_APP_PASSWORD='…' node scripts/primeros-auxilios-bebe-app/build.mjs
```
Lee los PDFs de `~/CRASHING/Primeros Auxilios del Bebe/Entregables/` (o `PAB_SRC=/otra/ruta`), los asigna por nombre de archivo
(`ebook`/`principal`/`primeros-auxilios`, `bono-1`/`casa-segura`, `bono-2`/`fiebre`, `bono-3`/`niñera`/`abuelos`; ver `LIBRARY` en
`build.mjs`). Los que falten se omiten con aviso y la app los muestra como «Próximamente». `--demo` genera PDFs de PRUEBA donde falten
(solo para verificar el flujo; **no desplegar así**). Cambiar la contraseña cierra las sesiones guardadas.

## Límites
La contraseña protege lo cifrado (PDFs). Las tarjetas, el quiz y el checklist viajan en el bundle JS y no se pueden ocultar.
Es contraseña compartida. Sin conexión: si ya se había entrado, las tarjetas/quiz/checklist siguen (si el navegador tiene
la app en caché); la Biblioteca necesita internet.
