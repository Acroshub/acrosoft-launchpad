import { Copy, Download, Eye, EyeOff, FileText } from "lucide-react";
import { useState } from "react";
import { copyText, downloadText } from "./format";
import { useLab } from "./lab-context";

/** Que "P-R-E-D-C" no se parta en dos renglones por los guiones. */
function NoBreak({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\b[A-Z](?:-[A-Z])+\b)/).map((part, i) =>
        i % 2 ? <span key={i} className="tl-nowrap">{part}</span> : part,
      )}
    </>
  );
}

export function Templates() {
  const { content } = useLab();
  const [open, setOpen] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (id: string, body: string) => {
    if (await copyText(body)) {
      setCopied(id);
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 2000);
    }
  };

  return (
    <section className="tl-card">
      <h1 className="tl-h1"><FileText aria-hidden="true" /> Plantillas descargables</h1>
      <p className="tl-lead">
        Hojas de trabajo en texto plano, listas para imprimir, pegar en tus notas o llenar en el celular. Salen de los métodos del libro (capítulos 6, 7 y 8).
      </p>

      <ul className="tl-templates">
        {content.templates.map((t) => (
          <li key={t.id} className="tl-template">
            <div className="tl-template-head">
              <span className="tl-template-area">{t.area}</span>
              <h2><NoBreak text={t.title} /></h2>
              <p>{t.description}</p>
            </div>
            <div className="tl-template-actions">
              <button type="button" className="tl-btn tl-btn-amber" onClick={() => downloadText(t.filename, t.body)}>
                <Download aria-hidden="true" /> Descargar .txt
              </button>
              <button type="button" className="tl-chip" onClick={() => copy(t.id, t.body)}>
                <Copy aria-hidden="true" /> {copied === t.id ? "¡Copiado!" : "Copiar"}
              </button>
              <button type="button" className="tl-chip" aria-expanded={open === t.id} onClick={() => setOpen(open === t.id ? null : t.id)}>
                {open === t.id ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />} {open === t.id ? "Ocultar" : "Vista previa"}
              </button>
            </div>
            {open === t.id && <pre className="tl-template-preview">{t.body}</pre>}
          </li>
        ))}
      </ul>
    </section>
  );
}
