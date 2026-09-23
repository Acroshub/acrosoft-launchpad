import { Check, ChevronLeft, ChevronRight, FileText, LogOut, Loader2, Mic, Pause, Play, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { LAB_ROOT } from "./constants";
import { formatDuration } from "./format";
import { useLab } from "./lab-context";
import { usePlayer } from "./player";
import { countDone, resetProgress, setDone, useProgress } from "./progress";
import { useRecordedIds } from "./recordings";
import { SpeakingRecorder } from "./SpeakingRecorder";
import { modelTrack } from "./tracks";
import type { AudioItem, Section } from "./types";
import { ProgressBar, cx } from "./ui";

// ─── Lista de las 6 secciones ────────────────────────────────────────────────
export function AudiosHome() {
  const { content, logout } = useLab();
  const progress = useProgress();

  // La sección resaltada es la primera que todavía tiene audios pendientes
  const nextId = content.sections.find((s) => countDone(progress, s.items.map((i) => i.id)) < s.items.length)?.id;

  const confirmReset = () => {
    if (window.confirm("¿Reiniciar tu progreso? Se desmarcan todos los audios completados en este dispositivo. Tus grabaciones no se borran.")) resetProgress();
  };

  return (
    <>
      <ul className="tl-sections">
        {content.sections.map((section) => {
          const ids = section.items.map((i) => i.id);
          const done = countDone(progress, ids);
          return (
            <li key={section.id}>
              <Link to={`${LAB_ROOT}/audios/${section.id}`} className={cx("tl-section", section.id === nextId && "is-next")}>
                <span className="tl-play tl-play-static" aria-hidden="true"><Play /></span>
                <span className="tl-section-text">
                  <strong>{section.title}</strong>
                  <small>{section.subtitle}</small>
                </span>
                <span className="tl-section-count" aria-label={`${done} de ${ids.length} completados`}>{done}/{ids.length}</span>
                <ChevronRight className="tl-chevron" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="tl-note">
        Escucha cada audio <strong>una sola vez y sin leer el guion</strong>, como en el examen. El texto lo ves después con “Ver texto”, para comparar con tus apuntes.
      </p>

      <div className="tl-home-actions">
        <button type="button" className="tl-link-btn" onClick={confirmReset}><RotateCcw aria-hidden="true" /> Reiniciar progreso</button>
        <button type="button" className="tl-link-btn" onClick={logout}><LogOut aria-hidden="true" /> Cerrar sesión</button>
      </div>
    </>
  );
}

// ─── Una sección ─────────────────────────────────────────────────────────────
function groupItems(section: Section): Array<{ name: string | null; items: AudioItem[] }> {
  const groups: Array<{ name: string | null; items: AudioItem[] }> = [];
  for (const item of section.items) {
    const name = item.group ?? null;
    const last = groups[groups.length - 1];
    if (last && last.name === name) last.items.push(item);
    else groups.push({ name, items: [item] });
  }
  return groups;
}

export function SectionView() {
  const { sectionId } = useParams();
  const { content } = useLab();
  const progress = useProgress();
  const section = content.sections.find((s) => s.id === sectionId);
  if (!section) return <Navigate to={LAB_ROOT} replace />;

  const done = countDone(progress, section.items.map((i) => i.id));

  return (
    <>
      <Link to={LAB_ROOT} className="tl-back"><ChevronLeft aria-hidden="true" /> Todas las secciones</Link>

      <header className="tl-section-head">
        <h1>{section.title}</h1>
        <p className="tl-section-sub">{section.subtitle}</p>
        <p className="tl-section-desc">{section.description}</p>
        <div className="tl-section-progress">
          <span><strong>{done}/{section.items.length}</strong> completados</span>
          <ProgressBar value={done} total={section.items.length} label={`Progreso de ${section.title}`} />
        </div>
      </header>

      {groupItems(section).map((group, gi) => (
        <div key={group.name ?? gi} className="tl-group">
          {group.name && <h2 className="tl-group-title">{group.name}</h2>}
          <ul className="tl-rows">
            {group.items.map((item) => (
              <AudioRow key={item.id} item={item} speaking={section.id === "speaking"} />
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

// ─── Una fila de audio ───────────────────────────────────────────────────────
function AudioRow({ item, speaking }: { item: AudioItem; speaking: boolean }) {
  const player = usePlayer();
  const progress = useProgress();
  const recorded = useRecordedIds();
  const [showText, setShowText] = useState(false);
  const [showRec, setShowRec] = useState(false);
  const [recording, setRecording] = useState(false);

  const key = `audio:${item.id}`;
  const active = player.track?.key === key;
  const playing = active && player.status === "playing";
  const loading = active && player.status === "loading";
  const done = item.id in progress;

  const onPlay = () => (active ? player.toggle() : void player.play(modelTrack(item)));

  return (
    <li className={cx("tl-row", active && "is-active", done && "is-done")}>
      <div className="tl-row-main">
        <button
          type="button"
          className="tl-play"
          onClick={onPlay}
          disabled={recording}
          aria-label={`${playing ? "Pausar" : "Reproducir"}: ${item.label}`}
        >
          {loading ? <Loader2 className="tl-spin" aria-hidden="true" /> : playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
        </button>

        <div className="tl-row-text">
          <strong>{item.title}</strong>
          <small>{item.ref} · {formatDuration(item.duration)}</small>
        </div>

        <button
          type="button"
          className={cx("tl-check", done && "is-on")}
          aria-pressed={done}
          aria-label={done ? `Marcar como pendiente: ${item.label}` : `Marcar como completado: ${item.label}`}
          onClick={() => setDone(item.id, !done)}
        >
          {done && <Check aria-hidden="true" />}
        </button>
      </div>

      <div className="tl-row-actions">
        <button type="button" className={cx("tl-chip", showText && "is-on")} aria-expanded={showText} onClick={() => setShowText((v) => !v)}>
          <FileText aria-hidden="true" /> {showText ? "Ocultar texto" : "Ver texto"}
        </button>
        {speaking && (
          <button type="button" className={cx("tl-chip", showRec && "is-on")} aria-expanded={showRec} onClick={() => setShowRec((v) => !v)}>
            <Mic aria-hidden="true" /> {recorded.has(item.id) ? "Mi grabación" : "Grabar y comparar"}
          </button>
        )}
      </div>

      {showText && <Transcript item={item} speaking={speaking} />}
      {speaking && showRec && <SpeakingRecorder item={item} onRecordingChange={setRecording} />}
    </li>
  );
}

function Transcript({ item, speaking }: { item: AudioItem; speaking: boolean }) {
  return (
    <div className="tl-transcript">
      <div lang="en">
        {item.transcript.map((turn, i) => (
          <p key={i}>
            {turn.speaker && <span className="tl-speaker">{turn.speaker}</span>}
            {turn.text}
          </p>
        ))}
      </div>
      <p className="tl-transcript-tip">
        {speaking
          ? "Marca qué palabras omitiste, cambiaste o sonaron raras, y vuelve a repetir la frase."
          : "Compara este guion con tus apuntes y marca qué palabras clave perdiste (¿velocidad? ¿vocabulario? ¿te distrajiste?)."}
      </p>
    </div>
  );
}
