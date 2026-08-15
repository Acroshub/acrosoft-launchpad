/**
 * Autenticación para funciones que no llevan verify_jwt.
 *
 * Supabase solo verifica la FIRMA del JWT cuando verify_jwt = true, y la anon key
 * es un JWT válido — así que verify_jwt no distingue a un tercero de un llamador
 * legítimo. Estas funciones se protegen aquí dentro, comparando contra el service
 * role key, que nunca sale del servidor.
 *
 * Dos modos:
 *   requireInternal(req)      — solo llamadas internas (edge→edge, pg_cron, triggers)
 *   requireInternalOrUser(...) — internas o un usuario autenticado del CRM
 */

const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

/** Comparación en tiempo constante — evita filtrar el key por timing. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Extrae el token del header Authorization o de x-internal-key. */
export function extractToken(req: Request): string {
  const auth = req.headers.get("Authorization") ?? "";
  if (auth.startsWith("Bearer ")) return auth.slice("Bearer ".length).trim();
  return (req.headers.get("x-internal-key") ?? "").trim();
}

/** true si la petición viene con el service role key (edge→edge, pg_cron, trigger DB). */
export function isInternalCall(req: Request): boolean {
  if (!SERVICE_ROLE_KEY) return false;
  const token = extractToken(req);
  if (!token) return false;
  return safeEqual(token, SERVICE_ROLE_KEY)
    || safeEqual((req.headers.get("x-internal-key") ?? "").trim(), SERVICE_ROLE_KEY);
}

/**
 * Guard estricto: solo llamadas internas.
 * Devuelve null si pasa, o la Response 401 que hay que retornar.
 */
export function requireInternal(req: Request): Response | null {
  if (isInternalCall(req)) return null;
  return new Response(JSON.stringify({ error: "No autorizado" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

export type Caller =
  | { kind: "internal"; userId: null }
  | { kind: "user"; userId: string };

/**
 * Guard híbrido: acepta llamadas internas o un JWT de usuario autenticado.
 * `supabase` debe ser un cliente con service role (para resolver el usuario del token).
 *
 * Devuelve el llamador, o una Response 401 lista para retornar.
 */
export async function requireInternalOrUser(
  req: Request,
  // deno-lint-ignore no-explicit-any
  supabase: any,
): Promise<{ caller: Caller; error: null } | { caller: null; error: Response }> {
  if (isInternalCall(req)) {
    return { caller: { kind: "internal", userId: null }, error: null };
  }

  const token = extractToken(req);
  if (token) {
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data?.user) {
      return { caller: { kind: "user", userId: data.user.id }, error: null };
    }
  }

  return {
    caller: null,
    error: new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    }),
  };
}
