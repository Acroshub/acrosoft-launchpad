/**
 * Aviso push al superadmin cuando alguien reserva en SU calendario (crm-calendar-book).
 *
 * El calendario de la cuenta admin es uno solo y lo comparten la llamada del kit (/estimados-ty) y la consultoría gratis
 * (/consultoria-mkt-tree): con el filtro «el calendario es del admin» se cubren las dos y NO se avisa de las reservas de los
 * calendarios de otros clientes (el admin no debe recibir en su teléfono los datos de los clientes de otro negocio).
 *
 * Este archivo no importa nada pesado (el envío real se inyecta con `deps.send`) para poder probarlo sin red ni VAPID.
 * Reglas: nunca lanza (una reserva ya hecha no puede fallar por un aviso) y nunca espera más de `timeoutMs`.
 */
import { formatWhen } from "./booking-meta.ts";

/** Lo máximo que la reserva espera al aviso antes de responderle a quien reservó. */
export const BOOKING_PUSH_TIMEOUT_MS = 4000;

/** Etiqueta con la que `consultoria-mkt-tree` (la landing de la consultoría) manda `booking_meta.source`. */
const SOURCE_CONSULTORIA = "consultoria-mkt-tree";

export interface BookingPushInfo {
  /** `booking_meta.source` ya saneado: «consultoria-mkt-tree» o vacío (la llamada del kit no manda ninguno). */
  source: string;
  /** Nombre de quien reservó (o su correo si no dio nombre). */
  name: string;
  business: string;
  scheduledMs: number;
  /** Zona del calendario: la hora del aviso se dice en la hora de quien lo recibe, no en la del visitante. */
  tz: string;
}

export interface BookingPushPayload { title: string; body: string; url: string }

export function bookingPushLabel(source: string): string {
  if (source === SOURCE_CONSULTORIA) return "Consultoría gratis";
  if (!source) return "Llamada del kit";
  return source;
}

export function buildBookingPushPayload(o: BookingPushInfo): BookingPushPayload {
  const who = (o.name || "").trim() || "Alguien";
  const business = (o.business || "").trim();
  return {
    title: `📅 Nueva cita · ${bookingPushLabel(o.source)}`,
    body: `${business ? `${who} · ${business}` : who}\n${formatWhen(o.scheduledMs, o.tz)}`,
    // El CRM es una sola ruta (las secciones son estado interno): no hay enlace directo al calendario.
    url: "/crm",
  };
}

export type BookingPushStatus = "sent" | "skipped" | "timeout" | "error";

export interface BookingPushDeps {
  /** Id del superadmin (RPC `get_admin_user_id`). */
  getAdminId: () => Promise<string | null>;
  /** Manda el push a ese usuario. */
  send: (adminId: string, payload: BookingPushPayload) => Promise<unknown>;
}

/**
 * Avisa al superadmin SOLO si el calendario donde se reservó es suyo. Devuelve qué pasó; nunca lanza.
 *  sent     el push salió hacia el push service (no garantiza que el aparato lo muestre)
 *  skipped  el calendario no es del admin, o no hay admin
 *  timeout  tardó más de `timeoutMs`; se deja de esperar (el envío sigue por su cuenta)
 *  error    algo falló; la reserva sigue valiendo
 */
export async function notifyAdminOfBooking(
  deps: BookingPushDeps,
  o: BookingPushInfo & { calendarOwnerId: string },
  timeoutMs: number = BOOKING_PUSH_TIMEOUT_MS,
): Promise<BookingPushStatus> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const adminId = await deps.getAdminId();
    if (!adminId || adminId !== o.calendarOwnerId) return "skipped";
    const sending = deps.send(adminId, buildBookingPushPayload(o)).then(() => "sent" as const);
    const timeout = new Promise<"timeout">((resolve) => { timer = setTimeout(() => resolve("timeout"), timeoutMs); });
    return await Promise.race([sending, timeout]);
  } catch (e) {
    console.error("[booking-push] no se pudo avisar (la reserva sigue valiendo):", e);
    return "error";
  } finally {
    if (timer) clearTimeout(timer);
  }
}
