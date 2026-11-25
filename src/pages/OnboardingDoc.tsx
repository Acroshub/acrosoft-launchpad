import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { AlertTriangle, Check, FileX, Loader2 } from "lucide-react";
import AcrosoftLogo from "@/components/shared/AcrosoftLogo";
import { addNoindex } from "@/lib/piscinasFunnel";
import { ONBOARDING_DOC_MAX_CHARS, sanitizeDocHtml } from "@/lib/onboardingDoc";

// /onboarding-google/:token — documento público y editable («como un Google Docs») con la copia del onboarding de un cliente. Cualquiera con el
// link lo lee y lo edita; se guarda solo (Edge Function onboarding-doc) y nunca cambia la ficha del contacto. Nace con noindex.

const SAVE_DELAY_MS = 1200;
const RETRY_DELAY_MS = 5000;

type Doc = { content: string; version: number };
type SaveState = "saved" | "pending" | "saving" | "error" | "tooLong";

const callDoc = (payload: Record<string, unknown>, keepalive = false) =>
  fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/onboarding-doc`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
    body: JSON.stringify(payload),
    keepalive,
  });

const OnboardingDoc = () => {
  const { token = "" } = useParams();
  const [status, setStatus] = useState<"loading" | "ready" | "notFound" | "error">("loading");
  const [doc, setDoc] = useState<Doc | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  /** Versión que guardó otra persona mientras aquí había cambios sin guardar. */
  const [conflict, setConflict] = useState<Doc | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const versionRef = useRef(0);
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const blockedRef = useRef(false);
  const timerRef = useRef<number>();

  useEffect(() => {
    document.title = "Onboarding para Google Ads | Acros Software";
    return addNoindex();
  }, []);

  /** Reemplaza lo que se ve por una versión del servidor y descarta lo pendiente. */
  const show = useCallback((next: Doc) => {
    window.clearTimeout(timerRef.current);
    versionRef.current = next.version;
    dirtyRef.current = false;
    blockedRef.current = false;
    setConflict(null);
    setSaveState("saved");
    setDoc({ ...next });
  }, []);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await callDoc({ action: "get", token });
      if (res.status === 404) { setStatus("notFound"); return; }
      if (!res.ok) throw new Error(String(res.status));
      show(await res.json());
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [token, show]);

  useEffect(() => { load(); }, [load]);

  // El HTML se escribe a mano (no por React) para no mover el cursor mientras se edita.
  useLayoutEffect(() => {
    if (status === "ready" && doc && editorRef.current) editorRef.current.innerHTML = sanitizeDocHtml(doc.content);
  }, [status, doc]);

  const save = useCallback(async (keepalive = false) => {
    window.clearTimeout(timerRef.current);
    if (!editorRef.current || !dirtyRef.current || savingRef.current || blockedRef.current) return;
    const content = sanitizeDocHtml(editorRef.current.innerHTML);
    if (content.length > ONBOARDING_DOC_MAX_CHARS) { setSaveState("tooLong"); return; }

    savingRef.current = true;
    dirtyRef.current = false;
    setSaveState("saving");
    let retryIn = SAVE_DELAY_MS;
    try {
      const res = await callDoc({ action: "save", token, content, version: versionRef.current }, keepalive);
      if (res.status === 404) { blockedRef.current = true; setStatus("notFound"); return; }
      const data = await res.json();
      if (res.status === 409) {
        // Si el servidor ya tiene exactamente esto, fue un guardado nuestro cuya respuesta se perdió.
        if (data.content === content) versionRef.current = data.version;
        else {
          blockedRef.current = true;
          dirtyRef.current = true;
          setConflict({ content: data.content, version: data.version });
          return;
        }
      } else if (!res.ok) throw new Error(String(res.status));
      else versionRef.current = data.version;
      setSaveState(dirtyRef.current ? "pending" : "saved");
    } catch {
      dirtyRef.current = true;
      retryIn = RETRY_DELAY_MS;
      setSaveState("error");
    } finally {
      savingRef.current = false;
      if (dirtyRef.current && !blockedRef.current) timerRef.current = window.setTimeout(() => save(), retryIn);
    }
  }, [token]);

  const handleInput = () => {
    dirtyRef.current = true;
    setSaveState((s) => (s === "saving" ? s : "pending"));
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => save(), SAVE_DELAY_MS);
  };

  const keepMine = () => {
    if (!conflict) return;
    versionRef.current = conflict.version;
    blockedRef.current = false;
    setConflict(null);
    save();
  };

  useEffect(() => {
    const onVisibility = async () => {
      if (document.visibilityState === "hidden") { save(true); return; }
      // Al volver a la pestaña, traer lo que otros hayan cambiado (solo si aquí no hay nada pendiente).
      if (status !== "ready" || dirtyRef.current || savingRef.current) return;
      try {
        const res = await callDoc({ action: "get", token });
        if (!res.ok) return;
        const latest: Doc = await res.json();
        if (!dirtyRef.current && !savingRef.current && latest.version > versionRef.current) show(latest);
      } catch { /* sin conexión: se queda lo que ya se ve */ }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current || savingRef.current) { e.preventDefault(); e.returnValue = ""; }
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [save, show, status, token]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 print:bg-white">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white print:static print:border-0">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4">
          <AcrosoftLogo size="md" className="!cursor-default" />
          {status === "ready" && (
            <p role="status" className="flex items-center gap-1.5 text-xs text-slate-500 print:hidden">
              {conflict ? (
                <><AlertTriangle size={13} className="text-amber-600" /> Sin guardar</>
              ) : saveState === "saved" ? (
                <><Check size={13} className="text-teal-700" /> Guardado</>
              ) : saveState === "error" ? (
                <><AlertTriangle size={13} className="text-amber-600" /> No se pudo guardar, reintentando…</>
              ) : saveState === "tooLong" ? (
                <><AlertTriangle size={13} className="text-amber-600" /> Documento demasiado largo: no se guarda</>
              ) : (
                <><Loader2 size={13} className="animate-spin" /> Guardando…</>
              )}
            </p>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-3 py-4 sm:px-4 sm:py-8 print:p-0">
        {conflict && (
          <div role="alert" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Alguien más cambió este documento mientras lo editabas.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => show(conflict)} className="rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold">
                Ver la versión nueva (descarta mis cambios)
              </button>
              <button onClick={keepMine} className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white">
                Guardar la mía
              </button>
            </div>
          </div>
        )}

        {status === "loading" && (
          <div className="flex justify-center py-24"><Loader2 size={24} className="animate-spin text-slate-400" /></div>
        )}
        {(status === "notFound" || status === "error") && (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center">
            <FileX size={28} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-semibold">{status === "notFound" ? "Este documento no existe" : "No pudimos abrir el documento"}</p>
            <p className="mt-1 text-xs text-slate-500">
              {status === "notFound" ? "Revisa que el link esté completo." : "Revisa tu conexión e inténtalo de nuevo."}
            </p>
            {status === "error" && (
              <button onClick={load} className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white">Reintentar</button>
            )}
          </div>
        )}
        {status === "ready" && (
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-label="Documento de onboarding"
            spellCheck={false}
            onInput={handleInput}
            onBlur={() => save()}
            // Pegar y soltar solo texto: nada de formato ni HTML ajeno.
            onPaste={(e) => {
              e.preventDefault();
              document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
            }}
            onDrop={(e) => e.preventDefault()}
            className="min-h-[70vh] break-words rounded-sm border border-slate-200 bg-white px-5 py-8 text-base leading-relaxed shadow-sm outline-none sm:px-14 sm:py-14 md:text-[15px] print:border-0 print:p-0 print:shadow-none [&_a]:text-teal-700 [&_a]:underline [&_h1]:mb-6 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mb-3 [&_h2]:mt-5 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:font-bold [&_li]:my-0.5 [&_mark]:rounded [&_mark]:bg-red-100 [&_mark]:px-1 [&_mark]:font-extrabold [&_mark]:text-red-700 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-3 [&_small]:block [&_small]:rounded-md [&_small]:border-l-4 [&_small]:border-red-300 [&_small]:bg-red-50 [&_small]:px-3 [&_small]:py-2 [&_small]:text-[13px] [&_small]:text-slate-600 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6"
          />
        )}
      </main>
    </div>
  );
};

export default OnboardingDoc;
