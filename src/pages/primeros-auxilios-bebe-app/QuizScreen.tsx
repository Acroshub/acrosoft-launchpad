import { CheckCircle2, PartyPopper, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { useApp } from "./app-context";
import { QUESTIONS } from "./quiz";
import { pickQuiz, scoreQuiz, weekId } from "./logic";
import { StagePicker } from "./Home";
import { usePersisted } from "./storage";

interface Result { score: number; total: number; stage: string }

function sanitizeResults(raw: unknown): Record<string, Result> {
  const out: Record<string, Result> = {};
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const [k, v] of Object.entries(raw)) {
      const r = v as Partial<Result> | null;
      if (r && typeof r.score === "number" && typeof r.total === "number") out[k] = { score: r.score, total: r.total, stage: String(r.stage ?? "") };
    }
  }
  return out;
}

export function Quiz() {
  const { stage } = useApp();
  const [results, setResults] = usePersisted<Record<string, Result>>("quiz", {}, sanitizeResults);
  const week = weekId(new Date());
  const effectiveStage = stage ?? "3-6";
  const questions = useMemo(() => pickQuiz(QUESTIONS, effectiveStage, week), [effectiveStage, week]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [index, setIndex] = useState(0);
  const [replay, setReplay] = useState(false);

  const previous = results[week];
  const finished = index >= questions.length;

  if (previous && !replay) {
    return (
      <section className="pab-section">
        <div className="pab-result">
          <span className="pab-result-ico"><PartyPopper aria-hidden="true" /></span>
          <p className="pab-score">{previous.score}/{previous.total}</p>
          <p className="pab-muted">Quiz de esta semana hecho</p>
        </div>
        <button type="button" className="pab-btn pab-btn-secondary pab-btn-block" onClick={() => { setAnswers({}); setIndex(0); setReplay(true); }}>Repasar de nuevo</button>
      </section>
    );
  }

  if (finished) {
    const score = scoreQuiz(questions, answers);
    return (
      <section className="pab-section">
        <div className="pab-result">
          <span className="pab-result-ico"><PartyPopper aria-hidden="true" /></span>
          <p className="pab-score" aria-live="polite">{score}/{questions.length}</p>
          <p className="pab-muted">{score === questions.length ? "¡Perfecto!" : "Repasa las tarjetas que fallaste"}</p>
        </div>
        <button type="button" className="pab-btn pab-btn-primary pab-btn-block" onClick={() => { setResults((p) => ({ ...p, [week]: { score, total: questions.length, stage: effectiveStage } })); setReplay(false); }}>
          Guardar resultado
        </button>
      </section>
    );
  }

  const q = questions[index];
  const chosen = answers[q.id];
  const answered = chosen !== undefined;

  return (
    <section className="pab-section">
      {!stage && <StagePicker ask />}
      <div className="pab-dots" role="progressbar" aria-label="Progreso" aria-valuemin={1} aria-valuemax={questions.length} aria-valuenow={index + 1}>
        {questions.map((_, i) => <span key={i} className={i <= index ? "is-on" : ""} />)}
      </div>
      <fieldset className="pab-quiz">
        <legend className="pab-q">{q.question}</legend>
        {q.options.map((opt, i) => {
          const state = !answered ? "" : i === q.answer ? "is-right" : i === chosen ? "is-wrong" : "";
          return (
            <button key={i} type="button" className={`pab-opt ${state}`} disabled={answered} onClick={() => setAnswers((a) => ({ ...a, [q.id]: i }))}>
              {answered && i === q.answer && <CheckCircle2 aria-hidden="true" />}
              {answered && i === chosen && i !== q.answer && <XCircle aria-hidden="true" />}
              <span>{opt}</span>
            </button>
          );
        })}
      </fieldset>
      {answered && (
        <div className="pab-callout" role="status">
          <strong>{chosen === q.answer ? "¡Correcto!" : "Casi"}</strong> {q.explain}
        </div>
      )}
      {answered && (
        <button type="button" className="pab-btn pab-btn-primary pab-btn-block" onClick={() => setIndex((i) => i + 1)}>
          {index + 1 < questions.length ? "Siguiente" : "Ver resultado"}
        </button>
      )}
    </section>
  );
}
