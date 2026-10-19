import { ArrowLeft } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useApp } from "./app-context";
import { getCard } from "./cards";
import { APP_ROOT, DISCLAIMER, PENDING_REVIEW_LABEL } from "./constants";
import { ICONS } from "./icons";

function Block({ title, tone, items, ordered }: { title: string; tone: "see" | "do" | "call" | "avoid"; items: string[]; ordered?: boolean }) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <section className={`pab-block pab-block-${tone}`}>
      <h2>{title}</h2>
      <Tag>{items.map((t, i) => <li key={i}>{t}</li>)}</Tag>
    </section>
  );
}

/** Tarjeta a pantalla completa, letra grande, sin pasos intermedios. */
export function CardView() {
  const { id } = useParams();
  const { stage } = useApp();
  const card = getCard(id);
  if (!card) return <Navigate to={APP_ROOT} replace />;
  const note = stage ? card.stageNotes[stage] : undefined;
  const Icon = ICONS[card.icon];

  return (
    <div className="pab-emerg" role="region" aria-label={`Tarjeta de emergencia: ${card.title}`}>
      <div className="pab-emerg-top">
        <Link to={APP_ROOT} className="pab-back" aria-label="Volver"><ArrowLeft aria-hidden="true" /></Link>
      </div>
      <div className="pab-emerg-scroll">
        <header className={`pab-emerg-head tone-${card.icon}`}>
          <span className="pab-etile-ico" aria-hidden="true"><Icon /></span>
          <h1 className="pab-emerg-title">{card.title}</h1>
        </header>
        {card.pendingReview && <p className="pab-pending" role="note">{PENDING_REVIEW_LABEL}</p>}
        <Block title="Qué ver" tone="see" items={card.see} />
        <Block title="Qué hacer ya" tone="do" items={card.doNow} ordered />
        <Block title="Llama a emergencias si" tone="call" items={card.callWhen} />
        {card.avoid && <Block title="Evita" tone="avoid" items={card.avoid} />}
        {note && (
          <section className="pab-note">
            <strong>Con {stage} meses</strong>
            <p>{note}</p>
          </section>
        )}
        <p className="pab-fine">Fuentes: {card.sources} {DISCLAIMER}</p>
      </div>
    </div>
  );
}
