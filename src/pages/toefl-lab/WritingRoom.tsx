// Sala de Writing: prompt del libro + cronómetro + caja de texto + contador de
// palabras + copiar/descargar. Sin corrección automática: la persona se evalúa
// sola con la rúbrica y compara con el modelo del libro.

import { ChevronLeft, Copy, Download, Eye, PenLine, RotateCcw, Timer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { copyText, countWords, downloadText, formatClock } from "./format";
import { useLab } from "./lab-context";
import type { DiscussionPrompt, EmailPrompt, WritingPrompt, WritingTask } from "./types";
import { cx } from "./ui";

type AnyTask = WritingTask<EmailPrompt> | WritingTask<DiscussionPrompt>;

const isEmail = (p: WritingPrompt): p is EmailPrompt => "scenario" in p;
const draftKey = (promptId: string) => `toefl_lab_draft_${promptId}`;

function readDraft(promptId: string): string {
  try {
    return localStorage.getItem(draftKey(promptId)) ?? "";
  } catch {
    return "";
  }
}

function writeDraft(promptId: string, text: string) {
  try {
    if (text) localStorage.setItem(draftKey(promptId), text);
    else localStorage.removeItem(draftKey(promptId));
  } catch {
    /* sin almacenamiento: el borrador vale mientras la pestaña siga abierta */
  }
}

// ─── Menú: elegir tarea y prompt ─────────────────────────────────────────────
export function WritingRoom() {
  const { content } = useLab();
  const [pick, setPick] = useState<{ task: AnyTask; prompt: WritingPrompt } | null>(null);

  if (pick) {
    return <WritingSession key={pick.prompt.id} task={pick.task} prompt={pick.prompt} onExit={() => setPick(null)} />;
  }

  const tasks: AnyTask[] = [content.writing.email, content.writing.discussion];
  return (
    <section className="tl-card">
      <h1 className="tl-h1"><PenLine aria-hidden="true" /> Sala de Writing</h1>
      <p className="tl-lead">
        Elige una tarea: te damos el enunciado del libro, un cronómetro y una caja de texto con contador de palabras. Al final puedes copiar o descargar lo que escribiste. <strong>Nadie corrige por ti</strong>: te evalúas con la rúbrica y comparas con el modelo del libro.
      </p>

      {tasks.map((task) => (
        <div key={task.id} className="tl-task">
          <div className="tl-task-head">
            <h2>{task.title}</h2>
            <span className="tl-task-meta"><Timer aria-hidden="true" /> {task.minutes} min · {task.minWords}–{task.maxWords} palabras</span>
          </div>
          <p className="tl-task-method">Método: {task.method.join(" → ")}</p>
          <ul className="tl-prompts">
            {(task.prompts as WritingPrompt[]).map((prompt) => (
              <li key={prompt.id}>
                <button type="button" className="tl-prompt-btn" onClick={() => setPick({ task, prompt })}>
                  <strong>{prompt.title}</strong>
                  <span>{isEmail(prompt) ? prompt.scenario : prompt.posts[0].text}</span>
                  {readDraft(prompt.id) && <small>Tienes un borrador guardado</small>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

// ─── Sesión de escritura ─────────────────────────────────────────────────────
function WritingSession({ task, prompt, onExit }: { task: AnyTask; prompt: WritingPrompt; onExit: () => void }) {
  const { content } = useLab();
  const [text, setText] = useState(() => readDraft(prompt.id));
  const [restored] = useState(() => readDraft(prompt.id).length > 0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [endedAt, setEndedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState<"ok" | "fail" | null>(null);
  const [checks, setChecks] = useState<Record<number, boolean>>({});

  const finished = endedAt !== null;
  const words = useMemo(() => countWords(text), [text]);

  // Autoguardado del borrador (un refresh accidental no debe costar 7 minutos de trabajo)
  useEffect(() => {
    const t = setTimeout(() => writeDraft(prompt.id, text), 400);
    return () => clearTimeout(t);
  }, [prompt.id, text]);

  // Reloj
  useEffect(() => {
    if (startedAt === null || finished) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [startedAt, finished]);

  useEffect(() => {
    if (copied === null) return;
    const t = setTimeout(() => setCopied(null), 2200);
    return () => clearTimeout(t);
  }, [copied]);

  const totalMs = task.minutes * 60_000;
  const elapsedMs = startedAt === null ? 0 : (endedAt ?? now) - startedAt;
  const remainingMs = totalMs - elapsedMs;
  const overtime = remainingMs < 0;
  const low = !overtime && startedAt !== null && remainingMs <= 60_000;
  const clock = overtime ? `+${formatClock(Math.ceil(-remainingMs / 1000))}` : formatClock(Math.ceil(remainingMs / 1000));

  const start = () => {
    if (startedAt === null) {
      const t = Date.now();
      setStartedAt(t);
      setNow(t);
    }
  };

  const onChange = (value: string) => {
    setText(value);
    if (value.length > 0) start(); // escribir arranca el cronómetro
  };

  const restart = () => {
    if (text && !window.confirm("¿Empezar de cero? Se borra lo que escribiste y se reinicia el cronómetro.")) return;
    setText("");
    writeDraft(prompt.id, "");
    setStartedAt(null);
    setEndedAt(null);
    setChecks({});
  };

  const promptText = isEmail(prompt)
    ? `${prompt.scenario}\nIn your email: ${prompt.tasks.map((t, i) => `(${i + 1}) ${t}`).join("; ")}.`
    : prompt.posts.map((p) => `${p.author}: ${p.text}`).join("\n");

  const exportText = () =>
    [
      "TOEFL Audio Lab · Sala de Writing",
      `Tarea: ${task.title} · ${prompt.title}`,
      `Fecha: ${new Date().toLocaleDateString("es")} · Tiempo: ${formatClock(Math.round(elapsedMs / 1000))} de ${task.minutes}:00 · Palabras: ${words}`,
      "",
      "ENUNCIADO",
      promptText,
      "",
      "MI RESPUESTA",
      text,
      "",
    ].join("\n");

  const wordState =
    words === 0 ? "" : words < task.minWords ? "low" : words > task.maxWords ? "high" : "ok";
  const wordHint =
    words === 0
      ? `Meta: ${task.minWords}–${task.maxWords} palabras`
      : words < task.minWords
        ? `Te faltan ${task.minWords - words} para la meta (${task.minWords}–${task.maxWords})`
        : words > task.maxWords
          ? `${words - task.maxWords} de más sobre la meta (${task.minWords}–${task.maxWords})`
          : `Dentro de la meta (${task.minWords}–${task.maxWords})`;

  return (
    <section className="tl-card tl-write">
      <button type="button" className="tl-back" onClick={onExit}><ChevronLeft aria-hidden="true" /> Elegir otra tarea</button>

      <div className="tl-write-head">
        <div>
          <p className="tl-sim-ref">{task.title}</p>
          <h1 className="tl-write-title">{prompt.title}</h1>
        </div>
        <div className={cx("tl-clock", low && "is-low", overtime && "is-over", startedAt === null && "is-idle")} role="timer" aria-label="Cronómetro">
          <Timer aria-hidden="true" />
          <span>{startedAt === null ? formatClock(totalMs / 1000) : clock}</span>
        </div>
      </div>

      <div className="tl-prompt" lang="en">
        {isEmail(prompt) ? (
          <>
            <p>{prompt.scenario}</p>
            <p>In your email:</p>
            <ol>{prompt.tasks.map((t, i) => <li key={i}>{t}</li>)}</ol>
          </>
        ) : (
          prompt.posts.map((post, i) => (
            <p key={i} className={i === 0 ? "tl-post tl-post-prof" : "tl-post"}>
              <strong>{post.author}:</strong> {post.text}
            </p>
          ))
        )}
      </div>
      <p className="tl-task-method">Método: {task.method.join(" → ")}</p>

      {restored && !finished && startedAt === null && <p className="tl-note">Recuperamos tu borrador. El cronómetro arranca cuando sigas escribiendo.</p>}

      <label className="tl-label" htmlFor="tl-answer">Tu respuesta</label>
      <textarea
        id="tl-answer"
        className="tl-textarea"
        lang="en"
        value={text}
        onChange={(e) => onChange(e.target.value)}
        readOnly={finished}
        placeholder={startedAt === null ? "Empieza a escribir y el cronómetro arranca solo…" : ""}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="sentences"
        rows={12}
      />

      <div className="tl-write-bar">
        <span className={cx("tl-words", wordState && `is-${wordState}`)} aria-live="polite">
          <strong>{words}</strong> {words === 1 ? "palabra" : "palabras"} · {wordHint}
        </span>
        <div className="tl-write-buttons">
          {startedAt === null && !finished && (
            <button type="button" className="tl-btn tl-btn-ghost" onClick={start}>Iniciar cronómetro</button>
          )}
          {!finished ? (
            <button type="button" className="tl-btn tl-btn-amber" onClick={() => setEndedAt(Date.now())} disabled={words === 0}>Finalizar</button>
          ) : (
            <button type="button" className="tl-btn tl-btn-ghost" onClick={restart}><RotateCcw aria-hidden="true" /> Escribir de nuevo</button>
          )}
        </div>
      </div>

      {overtime && !finished && <p className="tl-note">Se acabó el tiempo. Termina la frase que estás escribiendo y pulsa “Finalizar”: así ves cuánto te pasaste.</p>}

      {finished && (
        <div className="tl-result">
          <h2>Tu resultado</h2>
          <p className="tl-result-stats">
            <strong>{words}</strong> palabras (meta {task.minWords}–{task.maxWords}) · <strong>{formatClock(Math.round(elapsedMs / 1000))}</strong> de {task.minutes}:00
          </p>

          <div className="tl-result-actions">
            <button
              type="button"
              className="tl-btn tl-btn-amber"
              onClick={async () => setCopied((await copyText(text)) ? "ok" : "fail")}
            >
              <Copy aria-hidden="true" /> {copied === "ok" ? "¡Copiado!" : "Copiar texto"}
            </button>
            <button type="button" className="tl-btn tl-btn-ghost" onClick={() => downloadText(`TOEFL-${prompt.id}.txt`, exportText())}>
              <Download aria-hidden="true" /> Descargar .txt
            </button>
          </div>
          {copied === "fail" && <p className="tl-error" role="alert">No pudimos copiar automáticamente. Selecciona el texto y cópialo a mano.</p>}

          <div className="tl-review">
            <h3>Revisa tu escrito en 60 segundos</h3>
            <ul>
              {content.writing.review.map((item, i) => (
                <li key={i}>
                  <label>
                    <input type="checkbox" checked={!!checks[i]} onChange={(e) => setChecks((c) => ({ ...c, [i]: e.target.checked }))} />
                    <span>{item}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <details className="tl-model">
            <summary><Eye aria-hidden="true" /> Ver el modelo del libro</summary>
            <p className="tl-note">Compara con tu texto <strong>después</strong> de haber escrito el tuyo, no antes.</p>
            <div className="tl-model-text" lang="en">{prompt.model}</div>
          </details>
        </div>
      )}
    </section>
  );
}
