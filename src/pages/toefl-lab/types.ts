// Forma del contenido cifrado que arma scripts/toefl-audiolab/build.mjs.

export interface TranscriptTurn {
  speaker?: string;
  text: string;
}

export interface AudioItem {
  id: string;
  /** "Ítem 3", "Conversación 1", "Frase 2"… */
  title: string;
  /** "Listening · Ítem 3": lo que se ve en el reproductor. */
  label: string;
  /** Subtítulo de agrupación dentro de la sección ("Set A", "Listen to a Conversation"). */
  group?: string;
  /** Dónde está en el libro: "Ejercicio 6.1 · L1-3". */
  ref: string;
  /** Preguntas que trae en el libro (solo Listening). */
  questions?: number;
  /** Segundos para responder en el simulacro (solo Listening). */
  answerSeconds?: number;
  /** Duración del audio en segundos. */
  duration: number;
  transcript: TranscriptTurn[];
}

export interface Section {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  items: AudioItem[];
}

export interface SimulacroPreset {
  id: string;
  title: string;
  description: string;
  /** Ids de AudioItem, en el orden en que se reproducen. */
  items: string[];
}

export interface EmailPrompt {
  id: string;
  title: string;
  scenario: string;
  tasks: string[];
  model: string;
}

export interface DiscussionPrompt {
  id: string;
  title: string;
  posts: { author: string; text: string }[];
  model: string;
}

export interface WritingTask<P> {
  id: "email" | "discussion";
  title: string;
  minutes: number;
  minWords: number;
  maxWords: number;
  method: string[];
  prompts: P[];
}

export type WritingPrompt = EmailPrompt | DiscussionPrompt;

export interface Template {
  id: string;
  area: string;
  title: string;
  description: string;
  filename: string;
  body: string;
}

export interface LabContent {
  sections: Section[];
  simulacros: SimulacroPreset[];
  writing: {
    email: WritingTask<EmailPrompt>;
    discussion: WritingTask<DiscussionPrompt>;
    review: string[];
  };
  templates: Template[];
}

/** meta.json: lo único que viaja sin cifrar (parámetros de la derivación de llave). */
export interface LabMeta {
  v: string;
  kdf: string;
  iter: number;
  salt: string;
}
