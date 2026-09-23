// Plantillas descargables del Bono 1 (TOEFL Audio Lab).
//
// Contenido escrito a partir de los métodos del libro (cap. 6, 7 y 8, rúbricas
// del cap. 3.4 y Anexo C). Se cifra junto con el resto del contenido en
// build.mjs — acá vive en texto plano porque es la fuente que se edita.
//
// Cada `body` es texto plano (se descarga como .txt). Líneas de ≤ 70 caracteres
// para que se lea bien en el celular sin cortes raros.

const LINE = "─".repeat(60);

export const templates = [
  {
    id: "email",
    area: "Writing",
    title: "Write an Email · Plantilla de 5 líneas",
    description: "Método de 5 líneas para 7 minutos y 80–120 palabras. Incluye plan previo y frases del Anexo C.1.",
    filename: "TOEFL-Plantilla-Write-an-Email.txt",
    body: `WRITE AN EMAIL — PLANTILLA DE 5 LÍNEAS
Tiempo: 7 minutos · Meta: 80–120 palabras
${LINE}

PASO 1 · PLAN (1 minuto). Antes de escribir, anota:

  ¿A quién le escribo?  ______________________________
     (profesor / oficina = formal · compañero / grupo = amistoso)

  Cosa 1 que debo hacer: ______________________________
  Cosa 2 que debo hacer: ______________________________
  Cosa 3 que debo hacer: ______________________________

  ⚠ El enunciado casi siempre pide TRES cosas. Hazlas todas,
    en el orden en que las pide.

${LINE}

PASO 2 · ESCRIBE (5 minutos). Sigue las 5 líneas:

Subject: ____________________________________________

1. SALUDO
   Dear Professor ________,        (formal)
   Hello,                          (oficina / servicio)
   Hi everyone,  /  Hi ______,     (amistoso)

2. PROPÓSITO (primera frase: el lector debe saber para qué escribes)
   I am writing to ____________________________________.
   I wanted to let you know that ______________________.

3. DETALLES (1 o 2 frases con la razón o el contexto)
   ____________________________________________________
   ____________________________________________________

4. PETICIÓN O PROPUESTA (las cosas que pide el enunciado)
   Could you please ____________________________________?
   Would it be possible to _____________________________?
   I would be happy to _________________________________.

5. CIERRE Y FIRMA
   Thank you for your understanding.  /  Thank you for your help.
   Sincerely,  /  Best regards,  /  Best,
   (tu nombre)

${LINE}

PASO 3 · REVISA (1 minuto)

  [ ] ¿Hice las 3 cosas que pide el enunciado?
  [ ] ¿Dije para qué escribo en la primera frase?
  [ ] ¿El tono coincide con la persona? (formal / amistoso)
  [ ] ¿Cerré con una petición o un agradecimiento?
  [ ] ¿Cada oración tiene sujeto y verbo?
  [ ] ¿Llegué a 80 palabras?

${LINE}

BANCO DE FRASES (Anexo C.1) — úsalas como piezas, no como bloques

  Saludo formal ........ Dear Professor Lee, · Dear Sir or Madam, · Hello,
  Saludo amistoso ...... Hi everyone, · Hi Ana,
  Propósito ............ I am writing to… · I wanted to let you know that…
  Razón ................ because… · since… · due to…
  Pedir ................ Could you please…? · Would it be possible to…?
                         I would appreciate it if you could…
  Ofrecer .............. I would be happy to… · I can… · If it helps, I could…
  Proponer ............. One option would be to… · How about…? · I suggest that we…
  Disculparse .......... I apologize for any inconvenience.
                         I'm sorry for the short notice.
  Cierre ............... Thank you for your understanding. · Thank you for your help.
                         I look forward to your reply.
  Despedida ............ Sincerely, · Best regards, · Best,

Guía en Español para Aprobar el TOEFL con Nivel B2 · Bono 1
`,
  },
  {
    id: "discussion",
    area: "Writing",
    title: "Academic Discussion · Plantilla P-R-E-D-C",
    description: "Las 5 partes de una respuesta de 100–130 palabras en 10 minutos, con frases de conexión con tus compañeros.",
    filename: "TOEFL-Plantilla-Academic-Discussion.txt",
    body: `WRITE FOR AN ACADEMIC DISCUSSION — PLANTILLA P-R-E-D-C
Tiempo: 10 minutos · Meta: 100–130 palabras
${LINE}

Ves la pregunta de un profesor y las respuestas de dos compañeros.
Tu aporte: UNA opinión con razón y ejemplo, conectada con lo que dijo
al menos un compañero.

PASO 1 · PLAN (1 minuto)

  Mi posición:   ______________________________________
  Mi razón:      ______________________________________
  Mi ejemplo:    ______________________________________
  Compañero con quien dialogo: ________  (¿acuerdo / en parte / desacuerdo?)

${LINE}

PASO 2 · ESCRIBE (8 minutos) — cinco partes

P · POSICIÓN  (tu opinión clara, en la primera frase)
   In my opinion, ______________________________________.
   I believe that ______________________________________.
   I would support _____________________________________.

R · RAZÓN  (por qué lo piensas)
   The main reason is that _____________________________.
   First, ______________________________________________.

E · EJEMPLO  (un caso concreto, personal o general)
   For example, ________________________________________.
   For instance, when I ________________________________.

D · DIÁLOGO  (reacciona a un compañero, por su nombre)
   I agree with ______ that ____________________________.
   ______ makes a good point; however, _________________.
   I see ______'s point, but I disagree because ________.

C · CIERRE  (resume o propone una salida)
   That is why _________________________________________.
   A good compromise would be to _______________________.
   In short, ___________________________________________.

${LINE}

PASO 3 · REVISA (1 minuto)

  [ ] ¿Tomé una posición clara desde la primera frase?
  [ ] ¿Di una razón y un ejemplo concreto?
  [ ] ¿Nombré a un compañero y respondí a lo que dijo?
  [ ] ¿Aporté algo nuevo (no repetí lo que ya dijeron)?
  [ ] ¿Cerré con una frase que resume o propone una solución?
  [ ] ¿Llegué a 100 palabras?

Errores comunes: no tomar posición ("hay pros y contras…" y nada más) ·
repetir a los compañeros · escribir solo dos frases · usar frases
memorizadas que no responden la pregunta · olvidar el diálogo.

${LINE}

BANCO DE FRASES (Anexo C.2)

  Tu posición ............ In my opinion, … · I believe that… · I would support…
  De acuerdo ............. I agree with Ana that… · Like Kai, I think that…
  De acuerdo en parte .... I agree with X up to a point, but…
  En desacuerdo .......... I see Luis's point, but I disagree because…
                           I understand X's concern, but…
  Razón .................. The main reason is that… · First, … · This is important because…
  Ejemplo ................ For example, … · For instance, … · Take my own experience: …
  Contraste .............. However, … · On the other hand, … · Even though…
  Consecuencia ........... As a result, … · Therefore, … · That is why…
  Solución intermedia .... A good compromise would be to… · The best option is a combination of…
  Cierre ................. For these reasons, … · In short, …

Guía en Español para Aprobar el TOEFL con Nivel B2 · Bono 1
`,
  },
  {
    id: "writing-review",
    area: "Writing",
    title: "Revisión de Writing · Checklist de 60 segundos + rúbrica",
    description: "La lista para revisar tu escrito antes de terminar y la rúbrica de autoevaluación de /16 del libro.",
    filename: "TOEFL-Revision-Writing.txt",
    body: `REVISA TU ESCRITO EN 60 SEGUNDOS + RÚBRICA DE AUTOEVALUACIÓN
${LINE}

PARTE 1 · CHECKLIST DE 60 SEGUNDOS
Repásala de arriba abajo antes de terminar cada respuesta.

  [ ] ¿Hice todo lo que pide el enunciado? (en el email: las 3 cosas)
  [ ] Sujeto y verbo en cada oración.
        It is important…  (no: Is important…)
  [ ] Concordancia: He goes · people are · the students were.
  [ ] Tiempo verbal coherente en cada frase.
  [ ] Artículos y plurales: a / an / the, y la -s donde toca.
  [ ] Mayúsculas y puntuación: inicio de oración, nombres propios,
      comas después de "However," y "For example,".
  [ ] Conectores al empezar cada idea nueva.
  [ ] Longitud: ¿llegué a la meta de palabras?
        Email: 80–120 · Academic Discussion: 100–130

${LINE}

PARTE 2 · RÚBRICA DE WRITING (email) — puntúa cada criterio de 1 a 4

  CUMPLE LA TAREA
    4 Hace las 3 cosas que pide, con detalle
    3 Hace las 3, con poco detalle
    2 Omite una
    1 Omite dos o más                                Puntaje: ____

  ORGANIZACIÓN
    4 Saludo, propósito claro, orden lógico, cierre
    3 Orden claro, algún salto
    2 Ideas mezcladas
    1 Difícil de seguir                              Puntaje: ____

  LENGUAJE
    4 Pocos errores, no afectan
    3 Errores que no bloquean
    2 Errores que confunden a veces
    1 Errores que impiden entender                   Puntaje: ____

  LONGITUD Y FORMA
    4 80–120 palabras, puntuación cuidada
    3 Un poco corto o largo
    2 Muy corto o muy largo
    1 Incompleto                                     Puntaje: ____

  TOTAL: ____ / 16

Para la Academic Discussion, adapta "Cumple la tarea" a "responde la
pregunta y conecta con un compañero". Además, marca en tu texto con
colores: posición, razón, ejemplo, diálogo y cierre. Si falta alguno,
ya sabes qué reforzar.

${LINE}

DESPUÉS DE CORREGIR
  1. Compara tu texto con el modelo del libro DESPUÉS de escribir, no antes.
  2. Anota tus errores repetidos en tu hoja de errores (Anexo B.2).
  3. Un error que se repite merece su propio ejercicio: vuelve a
     practicarlo a las 48 horas.

Guía en Español para Aprobar el TOEFL con Nivel B2 · Bono 1
`,
  },
  {
    id: "interview",
    area: "Speaking",
    title: "Take an Interview · Plantilla R-R-E-C (45 segundos)",
    description: "Cómo repartir tus 45 segundos, frases puente para ganar tiempo y la rúbrica de Speaking de /16.",
    filename: "TOEFL-Plantilla-Take-an-Interview.txt",
    body: `TAKE AN INTERVIEW — PLANTILLA R-R-E-C
4 preguntas · unos 45 segundos cada una · SIN tiempo de preparación
Meta: 90–110 palabras por respuesta, sin apuro
${LINE}

LA FÓRMULA DE 45 SEGUNDOS

  R · RESPUESTA DIRECTA ......... 5 s
      Contestas la pregunta en una sola frase.
      I prefer ____________________________.
      I would say _________________________.
      Yes, I do, because __________________.

  R · RAZÓN ..................... 10 s
      The main reason is that _____________.
      That's because ______________________.

  E · EJEMPLO ................... 25 s   (2 o 3 frases, personal y concreto)
      For example, last semester I ________.
      A few weeks ago, I __________________.
      ____________________________________.

  C · CIERRE .................... 5 s
      So that's why _______________________.
      That works best for me.
      Overall, ____________________________.

Si te quedas sin ideas: agrega un contraste (On the other hand…)
o una consecuencia (As a result…).

${LINE}

FRASES PARA GANAR TIEMPO CON NATURALIDAD

  Necesitas pensar un segundo ... That's an interesting question. · Let me think for a second.
  Aclarar tu opinión ........... Personally, I think… · In my experience…
  Dar una razón ................ The main reason is that… · That's because…
  Dar un ejemplo ............... For example… · Last year, I…
  Contrastar ................... On the other hand… · Even though…
  Corregirte sin drama ......... Sorry, what I mean is… · Let me say that another way.

${LINE}

6 REGLAS QUE NO PUEDES OLVIDAR

  1. Habla todo el tiempo. Mejor una frase simple que 5 segundos de silencio.
  2. Responde primero, explica después.
  3. Usa ejemplos personales: son más fáciles y suenan más naturales.
  4. No memorices respuestas: memoriza la ESTRUCTURA y las frases puente.
  5. Si te equivocas, sigue. No te disculpes ni te detengas.
  6. Habla a volumen normal y claro, sin susurrar.

${LINE}

CÓMO PRACTICAR (cada pregunta)

  1. Lee la pregunta, activa el cronómetro y responde en voz alta,
     grabándote, 45 segundos. Sin notas.
  2. Escucha tu grabación una vez, sin parar: ¿qué parte se entendió menos?
  3. Mide tu tiempo: si terminas en 20 s, te falta desarrollo (razón y
     ejemplo). Si te cortan antes de cerrar, resume el ejemplo.
  4. Vuelve a grabar la misma pregunta aplicando UNA mejora concreta.
     La segunda toma casi siempre es mejor.

${LINE}

RÚBRICA DE SPEAKING — puntúa cada criterio de 1 a 4

  SE ENTIENDE
    4 Se entiende todo sin esfuerzo · 3 Casi todo · 2 Hay que esforzarse
    1 Difícil de entender                            Puntaje: ____

  FLUIDEZ
    4 Ritmo natural, pocas pausas · 3 Algunas pausas cortas
    2 Pausas largas frecuentes · 1 Muy entrecortado  Puntaje: ____

  DESARROLLO
    4 Respuesta + razón + ejemplo, usa casi los 45 s
    3 Respuesta + razón · 2 Solo una idea
    1 Casi no responde                               Puntaje: ____

  LENGUAJE
    4 Gramática y vocabulario variados y correctos
    3 Correcto con errores menores
    2 Errores frecuentes, vocabulario limitado
    1 Muy limitado                                   Puntaje: ____

  TOTAL: ____ / 16

Guía en Español para Aprobar el TOEFL con Nivel B2 · Bono 1
`,
  },
  {
    id: "repeat",
    area: "Speaking",
    title: "Listen and Repeat · Hoja de práctica (técnica de bloques)",
    description: "El protocolo de 7 pasos y una hoja para marcar qué palabras omitiste, cambiaste o sonaron raras.",
    filename: "TOEFL-Hoja-Listen-and-Repeat.txt",
    body: `LISTEN AND REPEAT — HOJA DE PRÁCTICA
En el examen: 7 frases, cada vez más largas (hasta ~25 palabras).
Oyes UNA sola vez y repites EXACTAMENTE lo que oíste.
${LINE}

TÉCNICA DE BLOQUES
Tu memoria de trabajo retiene bloques de sentido, no palabras sueltas.
Divide la frase mentalmente:

  The department has decided // to postpone the annual meeting //
  until every member of the committee // is able to attend in person.

  • Escucha el RITMO: sustantivos y verbos suenan fuertes; las palabras
    pequeñas (the, of, to) suenan débiles y rápidas.
  • Repite el ritmo, no solo las palabras.
  • No te detengas si te equivocas en una palabra: sigue hasta el final.
    Es mejor terminar con un error que quedarte callado.
  • Respeta las contracciones: si dijeron "don't", di "don't", no "do not".

${LINE}

PROTOCOLO DE PRÁCTICA (7 pasos) — en la webapp: botón de grabar

  1. Elige UNA frase del set.
  2. Escúchala una vez, sin mirar el texto.
  3. Repítela de inmediato, grabándote.
  4. Mira el texto y marca: palabras omitidas, cambiadas o raras.
  5. Escucha tu grabación junto al modelo: ¿coincide el ritmo?
  6. Repite la frase tres veces, corrigiendo lo marcado.
  7. Pasa a la siguiente. Al final, graba todo el set de corrido.

${LINE}

MI HOJA DE SET  (Set: ____   Fecha: ____________)

  Frase   ¿Exacta?   Omití…          Cambié…         Sonó raro…
  ─────   ────────   ─────────────   ─────────────   ─────────────
    1     [ ] sí
    2     [ ] sí
    3     [ ] sí
    4     [ ] sí
    5     [ ] sí
    6     [ ] sí
    7     [ ] sí

  Frases repetidas EXACTAMENTE igual: ____ / 7

  6–7 → Muy bien
  4–5 → Bien: trabaja las frases largas con bloques
  0–3 → Practica un set por día con el protocolo hasta subir

${LINE}

5 PUNTOS DE PRONUNCIACIÓN QUE MÁS AYUDAN

  1. Vocales largas y cortas (ship / sheep · full / fool).
  2. Sonido "th" (think, this): lengua entre los dientes, no "t" ni "d".
  3. Consonantes finales: no las cortes (worked, asked, months).
  4. Acento de palabra: PHO·to·graph vs. pho·TO·gra·phy.
  5. Ritmo de la frase: acentúa las palabras importantes; di rápido y
     débil las funcionales (to, of, the).

Guía en Español para Aprobar el TOEFL con Nivel B2 · Bono 1
`,
  },
  {
    id: "listening-notes",
    area: "Listening",
    title: "Apuntes de Listening · Plantilla T-E-D-C",
    description: "Para charlas y conversaciones: cómo apuntar tema, estructura, ejemplos y contraste sin volver a escuchar.",
    filename: "TOEFL-Plantilla-Apuntes-Listening.txt",
    body: `APUNTES DE LISTENING — PLANTILLA T-E-D-C
Como no puedes volver a escuchar, tus apuntes son tu memoria.
Regla: PALABRAS CLAVE, no frases.
${LINE}

ACADEMIC TALK (charla del profesor) — T-E-D-C

  T · TEMA: en las primeras frases el profesor dice de qué va.
  E · ESTRUCTURA: first, second, third → apunta cada punto (2–3 palabras).
  D · DETALLE Y EJEMPLOS: uno por punto; escribe el ejemplo en una palabra.
  C · CONTRASTE Y CIERRE: but, however, now… marcan límites o lo que viene.

  TEMA: ______________________________
  1. ________________  → ejemplo: ______________
  2. ________________  → ejemplo: ______________
  3. ________________  → ejemplo: ______________
  PERO / LÍMITE: ______________________
  PRÓXIMO PASO / CIERRE: ______________

${LINE}

CONVERSATION (conversación de campus)

  1. Apunta QUIÉN habla (M/F · estudiante / profesor / empleado).
  2. Apunta el PROBLEMA o lo que uno quiere.
  3. Apunta la SOLUCIÓN o la decisión, y lo que hará cada uno.

  Hablantes: __________________ / __________________
  Problema:  ______________________________________
  Solución:  ______________________________________
  Hará A:    ______________________________________
  Hará B:    ______________________________________

Las preguntas suelen ir a: ¿cuál es el problema? · ¿qué sugiere X? ·
¿qué hará después?

${LINE}

ANNOUNCEMENT (anuncio) — las 5 preguntas

  1. ¿Quién anuncia y a quién?
  2. ¿Qué cambia o qué se ofrece?
  3. ¿Cuándo?
  4. ¿Qué tienes que hacer? (registrarte, traer algo, ir a un lugar)
  5. ¿Hay excepciones o alternativas?

Anota fechas, números y verbos de acción: suelen ser lo que se pregunta.

${LINE}

ABREVIATURAS ÚTILES

  →        causa / lleva a          b/c      because
  ↑ ↓      aumenta / disminuye      w/ · w/o with · without
  ≠        distinto / contraste     + / –    ventaja / desventaja
  1, 2, 3  puntos en orden          ?        duda: vuelve a ella si hay pregunta

PALABRAS SEÑAL — te avisan qué viene

  First, second, finally ................... estructura: apunta cada número
  However, but, although, on the other hand  CONTRASTE: lo que sigue suele ser lo importante
  For example, for instance, such as ....... un ejemplo (no es la idea principal)
  That's why, so, as a result .............. consecuencia
  The point is, what matters is, in fact ... idea clave
  Actually, I'd rather, I was hoping ....... intención real o cambio de opinión

DESPUÉS DE ESCUCHAR: elimina las opciones que repiten palabras del audio
con otro sentido, contestan otra pregunta o exageran (always, never, all).

Guía en Español para Aprobar el TOEFL con Nivel B2 · Bono 1
`,
  },
];
