/**
 * Suspensión de tenants — chequeo para Edge Functions.
 *
 * Un cliente SaaS con el servicio sin pagar queda "disabled" en crm_client_accounts.
 * Esa es la única fuente de verdad (ver migración 20261103_tenant_suspension.sql).
 * Mientras esté así, nada de lo que corre en su nombre y cuesta dinero o escribe a sus
 * clientes debe ejecutarse: agente IA, automatizaciones, campañas, recordatorios…
 *
 * Política ante fallo: si la consulta falla se deja pasar (fail-open) y se loguea. Un error
 * transitorio de base de datos no debe apagar el negocio de los clientes que sí pagaron.
 * La barrera dura contra el acceso es el ban en Auth, no este chequeo.
 */

// deno-lint-ignore no-explicit-any
type Supabase = any;

/** true si el tenant (o el dueño del que este usuario es staff) está suspendido. */
export async function isTenantSuspended(supabase: Supabase, userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  const { data, error } = await supabase.rpc("is_tenant_suspended", { p_user_id: userId });
  if (error) {
    console.error("[tenant-access] is_tenant_suspended falló, se deja pasar:", error.message);
    return false;
  }
  return data === true;
}

/**
 * Ids de todos los tenants suspendidos. Para los crons, que recorren muchos tenants:
 * una consulta por pasada en lugar de una por fila.
 */
export async function getSuspendedTenantIds(supabase: Supabase): Promise<Set<string>> {
  const { data, error } = await supabase.rpc("suspended_tenant_ids");
  if (error) {
    console.error("[tenant-access] suspended_tenant_ids falló, no se filtra nada:", error.message);
    return new Set();
  }
  return new Set((data ?? []) as string[]);
}

/** Respuesta estándar para quien llame a una función de un tenant suspendido. */
export function suspendedResponse(corsHeaders: Record<string, string> = {}): Response {
  return new Response(
    JSON.stringify({ error: "tenant_suspended", message: "El servicio de esta cuenta está suspendido." }),
    { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
