import { Download, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { useApp } from "./app-context";
import { getPdfUrl } from "./client";
import { formatBytes } from "./logic";
import type { LibraryItem } from "./types";

export function Library() {
  const { content } = useApp();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const download = async (item: LibraryItem) => {
    if (busy) return;
    setBusy(item.id);
    setError(null);
    try {
      const url = await getPdfUrl(item.id);
      const a = document.createElement("a");
      a.href = url;
      a.download = item.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
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
                <button type="button" className="pab-btn pab-btn-primary" disabled={!!busy} onClick={() => download(it)}>
                  {busy === it.id ? <Loader2 className="pab-spin" aria-hidden="true" /> : <Download aria-hidden="true" />} Descargar PDF
                </button>
              </div>
            ) : (
              <p className="pab-fine"><strong>Próximamente</strong></p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
