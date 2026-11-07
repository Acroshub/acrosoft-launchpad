import { afterEach, describe, expect, it } from "vitest";
import { readBooking, saveBooking, type EstimadosBooking } from "./estimadosBooking";
import { ESTIMADOS_BOOKING_KEY } from "./estimadosConfig";

const BOOKING: EstimadosBooking = {
  date: "2026-11-09", hour: 12, minute: 0, calendarTz: "America/La_Paz", visitorTz: "America/New_York",
  calendarName: "Selecciona el día y la hora", email: "carlos@ejemplo.com", name: "Carlos Ramírez", sessionId: "cs_test_1", bookedAt: 1790000000000,
};

afterEach(() => sessionStorage.clear());

describe("estimadosBooking", () => {
  it("guarda y lee la cita tal cual", () => {
    saveBooking(BOOKING);
    expect(readBooking()).toEqual(BOOKING);
  });

  it("sin cita guardada devuelve null", () => {
    expect(readBooking()).toBeNull();
  });

  it("lo guardado se borra al cerrar la pestaña: vive en sessionStorage, no en localStorage", () => {
    saveBooking(BOOKING);
    expect(sessionStorage.getItem(ESTIMADOS_BOOKING_KEY)).toBeTruthy();
    expect(localStorage.getItem(ESTIMADOS_BOOKING_KEY)).toBeNull();
  });

  it.each([
    ["no es JSON", "esto no es json"],
    ["fecha inválida", JSON.stringify({ ...BOOKING, date: "9/11/2026" })],
    ["hora fuera de rango", JSON.stringify({ ...BOOKING, hour: 25 })],
    ["minuto fuera de rango", JSON.stringify({ ...BOOKING, minute: 75 })],
    ["hora no entera", JSON.stringify({ ...BOOKING, hour: 12.5 })],
    ["sin zona del calendario", JSON.stringify({ ...BOOKING, calendarTz: "" })],
    ["sin zona de la persona", JSON.stringify({ ...BOOKING, visitorTz: undefined })],
    ["sin momento de reserva", JSON.stringify({ ...BOOKING, bookedAt: "ayer" })],
    ["no es un objeto", JSON.stringify("hola")],
  ])("si lo guardado es inválido (%s) se ignora: la página final no muestra cita ni manda Lead", (_name, raw) => {
    sessionStorage.setItem(ESTIMADOS_BOOKING_KEY, raw);
    expect(readBooking()).toBeNull();
  });

  it("el nombre, el correo y el session_id son opcionales (null si faltan o vienen vacíos)", () => {
    sessionStorage.setItem(ESTIMADOS_BOOKING_KEY, JSON.stringify({ ...BOOKING, email: "  ", name: undefined, sessionId: 5 }));
    expect(readBooking()).toMatchObject({ email: null, name: null, sessionId: null, date: "2026-11-09" });
  });
});
