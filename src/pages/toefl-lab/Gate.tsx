import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { useState, type FormEvent } from "react";
import { LabError, loginWithPassword } from "./lab-client";
import type { LabContent } from "./types";
import { Brand } from "./ui";

export function Gate({ onUnlock, notice }: { onUnlock: (content: LabContent) => void; notice?: string | null }) {
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(notice ?? null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || !password.trim()) return;
    setBusy(true);
    setError(null);
    try {
      onUnlock(await loginWithPassword(password));
    } catch (err) {
      setError(
        err instanceof LabError && err.code === "wrong-password"
          ? "Esa contraseña no es correcta. Revisa que sea la que recibiste con tu guía."
          : "No pudimos conectarnos. Revisa tu internet e inténtalo de nuevo.",
      );
      setBusy(false);
    }
  };

  return (
    <main className="tl-gate">
      <form className="tl-gate-card" onSubmit={submit} noValidate>
        <Brand large />
        <p className="tl-tagline">Escucha cada ejercicio con voz real</p>

        <div className="tl-gate-lock" aria-hidden="true"><Lock /></div>
        <h1 className="tl-gate-title">Acceso con contraseña</h1>
        <p className="tl-gate-help">Es la contraseña que recibiste junto con tu guía. No distingue mayúsculas.</p>

        <label className="tl-label" htmlFor="tl-password">Contraseña</label>
        <div className="tl-input-wrap">
          <input
            id="tl-password"
            name="password"
            className="tl-input"
            type={visible ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            autoFocus
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "tl-password-error" : undefined}
          />
          <button type="button" className="tl-input-toggle" onClick={() => setVisible((v) => !v)} aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}>
            {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </button>
        </div>

        {error && <p id="tl-password-error" className="tl-error" role="alert">{error}</p>}

        <button type="submit" className="tl-btn tl-btn-amber tl-btn-block" disabled={busy || !password.trim()}>
          {busy ? <><Loader2 className="tl-spin" aria-hidden="true" /> Verificando…</> : "Entrar"}
        </button>
      </form>
    </main>
  );
}
