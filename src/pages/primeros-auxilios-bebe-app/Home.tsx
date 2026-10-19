import { Brain, ListChecks } from "lucide-react";
import { Link } from "react-router-dom";
import { useApp } from "./app-context";
import { CARDS, type EmergencyCard } from "./cards";
import { APP_ROOT } from "./constants";
import { ICONS } from "./icons";
import { STAGES, monthsBetween, splitCardsByStage, stageFromMonths } from "./logic";
import type { Stage } from "./types";

export function CardLink({ card, dim }: { card: EmergencyCard; dim?: boolean }) {
  const Icon = ICONS[card.icon];
  return (
    <Link to={`${APP_ROOT}/tarjetas/${card.id}`} className={`pab-etile tone-${card.icon} ${dim ? "is-dim" : ""}`}>
      <span className="pab-etile-ico" aria-hidden="true"><Icon /></span>
      <strong>{card.title}</strong>
    </Link>
  );
}

export function StagePicker({ ask }: { ask?: boolean }) {
  const { stage, setStage, birth, setBirth } = useApp();
  const months = birth ? monthsBetween(birth) : null;
  const today = new Date();
  const maxDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const onBirth = (value: string) => {
    setBirth(value);
    const m = value ? monthsBetween(value) : null;
    if (m !== null) setStage(stageFromMonths(m));
  };

  return (
    <section className="pab-stage" aria-label="Edad de tu bebé">
      {ask && !stage && <h2 className="pab-h2">¿Qué edad tiene tu bebé?</h2>}
      <div className="pab-seg" role="radiogroup" aria-label="Etapa">
        {STAGES.map((s) => (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={stage === s.id}
            className={`pab-seg-opt ${stage === s.id ? "is-on" : ""}`}
            onClick={() => setStage(stage === s.id ? null : (s.id as Stage))}
          >
            {s.label.replace(" a ", "–").replace(" meses", " m")}
          </button>
        ))}
      </div>
      <details className="pab-birth">
        <summary>Usar fecha de nacimiento</summary>
        <input type="date" className="pab-input" aria-label="Fecha de nacimiento" value={birth} max={maxDate} onChange={(e) => onBirth(e.target.value)} />
        {birth && months === null && <p className="pab-error">Fecha no válida.</p>}
        {months !== null && <p className="pab-fine">{months} {months === 1 ? "mes" : "meses"}</p>}
      </details>
    </section>
  );
}

export function Home() {
  const { stage } = useApp();
  const { primary, others } = stage ? splitCardsByStage(CARDS, stage) : { primary: CARDS, others: [] as EmergencyCard[] };
  return (
    <>
      <StagePicker ask />
      <section className="pab-section" aria-labelledby="pab-cards-title">
        <h2 id="pab-cards-title" className="pab-h2">Emergencias</h2>
        <div className="pab-egrid">
          {primary.map((c) => <CardLink key={c.id} card={c} />)}
          {others.map((c) => <CardLink key={c.id} card={c} dim />)}
        </div>
      </section>
      <section className="pab-section">
        <h2 className="pab-h2">Aprende y prepara</h2>
        <div className="pab-wide-list">
          <Link to={`${APP_ROOT}/quiz`} className="pab-wide"><span className="pab-wide-ico tone-bed"><Brain aria-hidden="true" /></span><strong>Quiz semanal</strong></Link>
          <Link to={`${APP_ROOT}/casa`} className="pab-wide"><span className="pab-wide-ico tone-thermometer"><ListChecks aria-hidden="true" /></span><strong>Casa segura</strong></Link>
        </div>
      </section>
    </>
  );
}
