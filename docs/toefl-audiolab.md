# TOEFL Audio Lab (Bono 1 del ebook TOEFL) — `/toefl-plataforma`

Webapp del Bono 1 de "Guía para Aprobar el TOEFL con Nivel B2". Sitio **estático, sin backend, sin IA, sin cuentas**:
una contraseña compartida, y todo el estado (progreso, borradores, grabaciones) en el navegador de cada persona.

## Qué tiene

| Pestaña | Qué hace |
|---|---|
| **Audios** | 6 secciones (Diagnóstico 6, Listening 12, Conversaciones 3, Anuncios 3, Charlas 2, Speaking 21 = 47). Un audio a la vez, "Ver texto" con el guion exacto, checklist (auto al terminar el audio o manual) con progreso total y por sección. |
| **Speaking** (dentro de Audios) | "Grabar y comparar": `MediaRecorder`, al detener suena el modelo; botones Mi grabación / Modelo / Comparar (tú → modelo) / Descartar. La grabación vive en IndexedDB del navegador, nunca se sube. |
| **Simulacro** | Listening en secuencia: audio (una sola vez, sin pausa) → tiempo para responder en el libro → avanza solo. 3 presets: Listening completo (20), Solo frases (12), Diagnóstico (6). |
| **Writing** | Prompts del cap. 7 (3 correos + 3 discusiones), cronómetro (7 / 10 min), contador de palabras, borrador autoguardado, copiar / descargar `.txt`. Tras finalizar: checklist de 60 s (7.5) y modelo del libro. Sin corrección. |
| **Plantillas** | 6 `.txt` descargables (Email, Academic Discussion, Revisión de Writing, Take an Interview, Listen and Repeat, Apuntes de Listening). Fuente: `scripts/toefl-audiolab/templates.mjs`. |

Tiempos de respuesta del simulacro: 10 s para las frases sueltas, 15 s por pregunta en el resto (según las preguntas que trae cada audio en el libro). Son **aproximados** — el propio libro dice que ETS puede ajustarlos. Se cambian en `build.mjs` (`ANSWER_SECONDS_*`).

## Cómo se protege con contraseña (sin servidor)

La contraseña no se "valida": es la **llave de cifrado**. `public/toefl-audiolab/` contiene solo bytes cifrados
(AES-256-GCM, llave = PBKDF2-SHA256 de la contraseña, 250.000 iteraciones):

```
public/toefl-audiolab/
  meta.json      salt + versión (único archivo en claro)
  content.bin    guiones, prompts, plantillas, estructura (cifrado)
  a/<id>.bin     los 47 audios MP3 (cifrados)
```

El navegador deriva la llave, descifra `content.bin` (si falla → contraseña incorrecta) y descifra cada audio al reproducirlo.
Quien conozca la URL de un `.bin` sin la contraseña no obtiene nada. La contraseña **no** distingue mayúsculas ni espacios
en los bordes (el teclado del celular autocapitaliza). La sesión se recuerda en el dispositivo (la llave derivada, no la contraseña).

> Límite honesto: es una contraseña compartida. Quien la tenga puede pasársela a otros. Elige una que no se deduzca del nombre del producto.

## Cambiar la contraseña o el contenido

```bash
TOEFL_LAB_PASSWORD='la-nueva-contraseña' node scripts/toefl-audiolab/build.mjs
```

Requiere `ffmpeg` y `ffprobe`. Lee el libro y los WAV desde `~/Ebooks/Ebook Ingles Internacional`
(o `TOEFL_LAB_SRC=/otra/ruta`), convierte a MP3 mono 64 kbps, extrae los guiones del Anexo A y las 21 frases del
Ejercicio 8.1, los prompts de 7.3 / 7.4 con sus modelos y el checklist de 7.5, y regenera `public/toefl-audiolab/`.
Valida que haya 47 audios y que la velocidad de habla de cada audio sea coherente con su guion.
Luego commit + deploy.

- Cambiar la contraseña **cierra las sesiones guardadas** (piden la nueva). Cambiar solo el contenido no.
- La contraseña no vive en el repo: solo en quien corre el script.

## Dónde está el código

- Ruta: `src/App.tsx` → `/toefl-plataforma/*` (lazy) → `src/pages/ToeflPlataforma.tsx`.
- Módulos en `src/pages/toefl-lab/`: `lab-client.ts` (desbloqueo y audios), `crypto.ts`, `player.tsx` (un solo `<audio>` para todo), `progress.ts` (localStorage), `recordings.ts` (IndexedDB), pantallas (`Audios`, `Simulacro`, `WritingRoom`, `Templates`, `Gate`, `Shell`) y `toefl-lab.css` (todo bajo `.tl-app`).
- Test: `src/pages/toefl-lab/crypto.test.ts` comprueba que lo que cifra el script lo descifra el navegador.
- `vercel.json`: el sitio manda `Permissions-Policy: microphone=()` en todas partes, lo que bloquea grabar. Hay una regla extra solo para `/toefl-plataforma/*` con `microphone=(self)`.
- `robots.txt` + `noindex` en la página.

## Verificar después de desplegar

1. `curl -sI https://<dominio>/toefl-plataforma | grep -i permissions-policy` → debe decir `microphone=(self)`. Si dice `microphone=()`, Vercel dio prioridad a la regla global: mover la regla de `/toefl-plataforma/:path*` o excluir esa ruta de la regla `/(.*)`.
2. Abrir `/toefl-plataforma` en el celular, entrar con la contraseña, reproducir un audio, grabar una frase de Speaking (debe pedir permiso de micrófono y, al detener, sonar el modelo).
3. En un iPhone real, correr el simulacro de 6 audios (Diagnóstico) sin tocar la pantalla entre audios: debe avanzar solo. Es lo único que no pude probar (mis pruebas fueron en Chromium y WebKit de escritorio).

## Fuera de alcance (a propósito)

Sin corrección con IA, sin sincronización entre dispositivos, sin Reading, sin comunidad. La práctica de *Take an Interview* (entrevista con cronómetro de 45 s y grabación) no está en esta versión: el libro la trabaja con la grabadora del celular.

## Entrega al comprador

El link y la contraseña llegan en el correo de compra y en la thank-you (`/toefl-ty`). La contraseña sale del secret `TOEFL_LAB_PASSWORD` de Supabase (no está en el frontend): debe ser la misma con la que se corrió `build.mjs`. Ver `docs/toefl-lanzamiento.md`.
