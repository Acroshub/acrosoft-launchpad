import { Eye, EyeOff, HeartPulse, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { PackError, loginWithPassword } from "./client";
import { DISCLAIMER } from "./constants";
import type { PackContent } from "./types";

export function Gate({ onUnlock, notice }: { onUnlock: (content: PackContent) => void; notice?: string | null }) {
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
        err instanceof PackError && err.code === "wrong-password"
          ? "Contraseña incorrecta. Revisa la que recibiste con tu compra."
          : "Sin conexión. Inténtalo de nuevo.",
      );
      setBusy(false);
    }
  };

  return (
    <main className="pab-gate">
      <form className="pab-gate-card" onSubmit={submit} noValidate>
        <div className="pab-gate-lock" aria-hidden="true"><HeartPulse /></div>
        <h1 className="pab-h1">Primeros Auxilios del Bebé</h1>
        <p className="pab-muted">Ingresa tu contraseña</p>

        <label className="pab-sr" htmlFor="pab-password">Contraseña</label>
        <div className="pab-input-wrap">
          <input
            id="pab-password"
            placeholder="Contraseña"
            name="password"
            className="pab-input"
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
            aria-describedby={error ? "pab-password-error" : undefined}
          />
          <button type="button" className="pab-input-toggle" onClick={() => setVisible((v) => !v)} aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}>
            {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </button>
        </div>

        {error && <p id="pab-password-error" className="pab-error" role="alert">{error}</p>}

        <button type="submit" className="pab-btn pab-btn-primary pab-btn-block" disabled={busy || !password.trim()}>
          {busy ? <><Loader2 className="pab-spin" aria-hidden="true" /> Verificando…</> : "Entrar"}
        </button>
        <p className="pab-fine">{DISCLAIMER}</p>
      </form>
    </main>
  );
}
