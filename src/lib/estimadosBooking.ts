// Resumen de la cita recién agendada. /estimados-ty lo escribe cuando el calendario confirma la reserva y /estimados-gracias (la página final del embudo)
// lo lee para mostrar día y hora y para disparar el evento Lead una sola vez. Vive en sessionStorage (solo esa pestaña; se borra al cerrarla) y se
// valida al leer: si alguien lo altera a mano o falta, la página final simplemente no muestra la cita (y no manda Lead).

import { ESTIMADOS_BOOKING_KEY } from "@/lib/estimadosConfig";

export type EstimadosBooking = {
  /** Fecha de la cita en la zona del calendario, «AAAA-MM-DD». */
  date: string;
  hour: number;
  minute: number;
  /** Zona del calendario (ej. America/La_Paz) y zona de quien reservó. */
  calendarTz: string;
  visitorTz: string;
  calendarName: string;
  /** Nombre y correo de la compra (salen de Stripe); null si no se conocen. */
  email: string | null;
  name: string | null;
  /** session_id de Stripe de la compra. */
  sessionId: string | null;
  /** Cuándo se reservó (ms desde 1970): identifica la reserva para no repetir el Lead al recargar. */
  bookedAt: number;
};

export function saveBooking(booking: EstimadosBooking): void {
  try { sessionStorage.setItem(ESTIMADOS_BOOKING_KEY, JSON.stringify(booking)); } catch { /* sin storage: la página final igual abre, sin la cita */ }
}

const isStr = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 200;
const orNull = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, 200) : null);

/** Lee y valida el resumen guardado. null si no hay o si no tiene la forma esperada. */
export function readBooking(): EstimadosBooking | null {
  try {
    const raw = sessionStorage.getItem(ESTIMADOS_BOOKING_KEY);
    if (!raw) return null;
    const b = JSON.parse(raw) as Record<string, unknown>;
    if (
      typeof b.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(b.date) ||
      !Number.isInteger(b.hour) || (b.hour as number) < 0 || (b.hour as number) > 23 ||
      !Number.isInteger(b.minute) || (b.minute as number) < 0 || (b.minute as number) > 59 ||
      !isStr(b.calendarTz) || !isStr(b.visitorTz) || typeof b.bookedAt !== "number"
    ) return null;
    return {
      date: b.date,
      hour: b.hour as number,
      minute: b.minute as number,
      calendarTz: b.calendarTz,
      visitorTz: b.visitorTz,
      calendarName: orNull(b.calendarName) ?? "",
      email: orNull(b.email),
      name: orNull(b.name),
      sessionId: orNull(b.sessionId),
      bookedAt: b.bookedAt,
    };
  } catch {
    return null;
  }
}
