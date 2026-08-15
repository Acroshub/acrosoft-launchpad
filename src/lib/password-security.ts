/**
 * Comprobación de contraseñas filtradas contra HaveIBeenPwned.
 *
 * Supabase Auth trae esto integrado, pero solo desde el plan Pro y la organización
 * está en free, así que se hace desde el cliente con la misma fuente de datos.
 *
 * Usa el modelo k-anonymity de HIBP: se calcula el SHA-1 de la contraseña y se
 * envían ÚNICAMENTE los primeros 5 caracteres del hash. El servidor devuelve todos
 * los sufijos que empiezan por ese prefijo (unos cientos) y la coincidencia se
 * busca localmente. La contraseña, su hash completo y el email del usuario nunca
 * salen del navegador.
 */

const HIBP_RANGE_URL = "https://api.pwnedpasswords.com/range/";

async function sha1Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-1", bytes);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

export type PwnedCheck = {
  /** true solo si HIBP confirmó la filtración. Ante cualquier duda, false. */
  pwned: boolean;
  /** Nº de filtraciones donde apareció, para poder graduar el mensaje. */
  count: number;
  /** true si no se pudo consultar (red caída, timeout). El registro NO debe bloquearse. */
  unavailable: boolean;
};

export async function checkPasswordPwned(password: string): Promise<PwnedCheck> {
  if (!password) return { pwned: false, count: 0, unavailable: false };

  try {
    const hash   = await sha1Hex(password);
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);

    // Si HIBP tarda, no vale la pena bloquear el alta: se deja pasar.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${HIBP_RANGE_URL}${prefix}`, {
      signal: controller.signal,
      headers: { "Add-Padding": "true" }, // respuestas de tamaño uniforme: no filtra por longitud
    });
    clearTimeout(timeout);

    if (!res.ok) return { pwned: false, count: 0, unavailable: true };

    const body = await res.text();
    for (const line of body.split("\n")) {
      const [candidate, countRaw] = line.trim().split(":");
      if (candidate === suffix) {
        const count = Number(countRaw) || 0;
        // El padding de HIBP añade sufijos falsos con count 0; solo cuentan los >0.
        return { pwned: count > 0, count, unavailable: false };
      }
    }

    return { pwned: false, count: 0, unavailable: false };
  } catch {
    // Red caída, CSP, timeout… nunca dejar a un usuario sin poder crear su cuenta.
    return { pwned: false, count: 0, unavailable: true };
  }
}
