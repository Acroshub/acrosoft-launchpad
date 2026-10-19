import { Download, Eye, FileText, Loader2, X } from "lucide-react";
import { useState } from "react";
import { useApp } from "./app-context";
import { getPdfUrl } from "./client";
import { formatBytes } from "./logic";
import type { LibraryItem } from "./types";

export function Library() {
  const { content } = useApp();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<{ item: LibraryItem; url: string } | null>(null);

  const open = async (item: LibraryItem, mode: "view" | "download") => {
    if (busy) return;
    setBusy(item.id + mode);
    setError(null);
    try {
      const url = await getPdfUrl(item.id);
      if (mode === "view") {
        setViewing({ item, url });
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = item.filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch {
      setError("No pudimos abrir el archivo. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="pab-section">
      <h1 className="pab-h1">Biblioteca</h1>
      {content.offline && <p className="pab-callout" role="status">Sin conexión. Recarga cuando vuelvas a tener internet.</p>}
      {error && <p className="pab-error" role="alert">{error}</p>}
      <ul className="pab-lib">
        {content.library.map((it) => (
          <li key={it.id} className="pab-lib-item">
            <div className="pab-lib-head">
              <span className="pab-lib-ico"><FileText aria-hidden="true" /></span>
              <div>
                <h2 className="pab-h3">{it.title}</h2>
                <p className="pab-fine">{it.description}{it.bytes ? ` · ${formatBytes(it.bytes)}` : ""}</p>
                {it.demo && <p className="pab-pending" role="note">Archivo de prueba</p>}
              </div>
            </div>
            {it.available ? (
              <div className="pab-row">
                <button type="button" className="pab-btn pab-btn-primary" disabled={!!busy} onClick={() => open(it, "view")}>
                  {busy === it.id + "view" ? <Loader2 className="pab-spin" aria-hidden="true" /> : <Eye aria-hidden="true" />} Ver
                </button>
                <button type="button" className="pab-btn pab-btn-secondary" disabled={!!busy} onClick={() => open(it, "download")}>
                  {busy === it.id + "download" ? <Loader2 className="pab-spin" aria-hidden="true" /> : <Download aria-hidden="true" />} Descargar
                </button>
              </div>
            ) : (
              <p className="pab-fine"><strong>Próximamente</strong></p>
            )}
          </li>
        ))}
      </ul>
      {viewing && (
        <div className="pab-viewer" role="dialog" aria-modal="true" aria-label={viewing.item.title}>
          <div className="pab-viewer-bar">
            <strong>{viewing.item.title}</strong>
            <a className="pab-btn pab-btn-ghost" href={viewing.url} target="_blank" rel="noreferrer">Abrir aparte</a>
            <button type="button" className="pab-btn pab-btn-secondary" onClick={() => setViewing(null)}><X aria-hidden="true" /> Cerrar</button>
          </div>
          <iframe className="pab-viewer-frame" title={viewing.item.title} src={viewing.url} />
        </div>
      )}
    </section>
  );
}
