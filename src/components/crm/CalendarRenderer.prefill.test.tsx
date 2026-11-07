import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Calendario simulado: la misma forma que devuelve crm-calendar-book (get_config). El formulario vinculado es el del calendario del admin de
// Acrosoft (Nombre y Apellido, Correo electrónico, WhatsApp) MÁS un campo extra obligatorio ("Empresa") para comprobar que, en modo
// «solo WhatsApp», lo que sobra no se pide.
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
const day = { open: true, slots: [{ from: "6:00 AM", to: "10:00 PM" }] };
const CALENDAR_ID = "24dab059-b724-4a13-b900-c2d73fc4438f";
const FORM_FIELDS = [
  { id: "field_name", type: "text", label: "Nombre y Apellido", required: true },
  { id: "field_email", type: "email", label: "Correo electrónico", required: true },
  { id: "extra_company", type: "text", label: "Empresa", required: true },
  { id: "f-1788373522211", type: "phone", label: "WhatsApp", required: true, placeholder: "" },
];
const CONFIG = {
  calendar: {
    id: CALENDAR_ID, name: "Selecciona el día y la hora", description: null, duration_min: 30, buffer_min: 0, min_advance_hours: 0, max_future_days: 60,
    timezone: TZ, language: "es", linked_form_id: "form-1", facebook_pixel_id: null, slug: null,
    availability: { Dom: day, Lun: day, Mar: day, "Mié": day, Jue: day, Vie: day, "Sáb": day },
  },
  profile: null,
  blockedSlots: [],
  formFields: FORM_FIELDS,
};

vi.mock("@/hooks/useCrmData", () => ({
  usePublicCalendar: () => ({ data: CONFIG, isLoading: false }),
  usePublicAppointments: () => ({ data: [] }),
}));

import CalendarRenderer from "./CalendarRenderer";

const fetchMock = vi.fn();

beforeEach(() => {
  // Solo se simula la fecha: así «mañana» siempre cae dentro del mes que se muestra.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 10, 8, 0, 0)); // martes 10 de noviembre de 2026, 8:00
  fetchMock.mockReset();
  fetchMock.mockImplementation(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** Elige mañana (11) y el primer horario, y avanza al formulario. */
async function goToForm() {
  fireEvent.click(screen.getAllByRole("button", { name: "11" })[0]);
  const slot = (await screen.findAllByRole("button", { name: /\d{1,2}:\d{2}/ }))[0];
  fireEvent.click(slot);
  fireEvent.click(screen.getAllByRole("button", { name: /continuar con/i })[0]);
  await screen.findByText(/tus datos/i);
}

const bookingBody = () => JSON.parse(fetchMock.mock.calls.find((c) => String(c[0]).includes("crm-calendar-book"))?.[1].body);

describe("CalendarRenderer — modo «solo WhatsApp» (prefill + requireWhatsapp)", () => {
  it("con nombre y correo precargados muestra ÚNICAMENTE el WhatsApp (ni Nombre, ni Correo, ni campos extra del formulario)", async () => {
    const { container } = render(
      <CalendarRenderer calendarId={CALENDAR_ID} lang="es" prefill={{ name: "Carlos Ramírez", email: "carlos@ejemplo.com" }} requireWhatsapp phoneDefaultDial="+1" />,
    );
    await goToForm();

    expect(screen.queryByText("Nombre y Apellido")).toBeNull();
    expect(screen.queryByText("Correo electrónico")).toBeNull();
    expect(screen.queryByText("Empresa")).toBeNull(); // un campo extra del formulario no se pide
    expect(screen.getByText("WhatsApp")).toBeTruthy();
    expect(container.querySelectorAll('input[type="tel"]')).toHaveLength(1);
    expect(container.querySelectorAll('input[type="text"], input[type="email"]')).toHaveLength(0);
    expect(screen.getByTestId("booking-prefill-note").textContent).toBe("Reservando como Carlos Ramírez · carlos@ejemplo.com");
    // El selector de país arranca en +1 (EE.UU.), no en Bolivia.
    expect((container.querySelector("select") as HTMLSelectElement).value).toBe("+1");
  });

  it("no deja reservar sin WhatsApp, y al reservar manda nombre y correo de la compra con el WhatsApp, sin los campos extra", async () => {
    const onBookingSuccess = vi.fn();
    const { container } = render(
      <CalendarRenderer calendarId={CALENDAR_ID} lang="es" prefill={{ name: "Carlos Ramírez", email: "carlos@ejemplo.com" }} requireWhatsapp phoneDefaultDial="+1" onBookingSuccess={onBookingSuccess} />,
    );
    await goToForm();

    // Sin escribir el WhatsApp: no se envía nada (aunque se acepten los términos).
    fireEvent.click(container.querySelector("label div") as HTMLElement);
    fireEvent.click(screen.getByRole("button", { name: /confirmar cita/i }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await screen.findByText(/completa|requerid|obligatorio|whatsapp/i, { selector: "p" })).toBeTruthy();

    // Con el WhatsApp: se envía.
    fireEvent.change(container.querySelector('input[type="tel"]') as HTMLInputElement, { target: { value: "3055551234" } });
    fireEvent.click(screen.getByRole("button", { name: /confirmar cita/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const body = bookingBody();
    expect(body.calendar_id).toBe(CALENDAR_ID);
    expect(body.form_data).toEqual({
      field_name: "Carlos Ramírez",
      field_email: "carlos@ejemplo.com",
      "f-1788373522211": "+1 3055551234",
    });
    expect(body.form_data).not.toHaveProperty("extra_company");
    expect(typeof body.terms_accepted_at).toBe("string");
    await waitFor(() => expect(onBookingSuccess).toHaveBeenCalledTimes(1));
  });

  it("si el formulario del calendario no tuviera teléfono, agrega el WhatsApp (sin WhatsApp la reserva no sirve)", async () => {
    CONFIG.formFields = [FORM_FIELDS[0], FORM_FIELDS[1]];
    try {
      const { container } = render(
        <CalendarRenderer calendarId={CALENDAR_ID} lang="es" prefill={{ name: "Carlos Ramírez", email: "carlos@ejemplo.com" }} requireWhatsapp phoneDefaultDial="+1" />,
      );
      await goToForm();
      expect(screen.getByText("WhatsApp")).toBeTruthy();
      expect(container.querySelectorAll('input[type="tel"]')).toHaveLength(1);
      expect(screen.queryByText("Nombre y Apellido")).toBeNull();
    } finally {
      CONFIG.formFields = FORM_FIELDS;
    }
  });
});

describe("CalendarRenderer — sin las props nuevas se comporta como siempre", () => {
  it("muestra todos los campos del formulario del calendario, sin nota de datos precargados y con el selector de país por defecto", async () => {
    const { container } = render(<CalendarRenderer calendarId={CALENDAR_ID} lang="es" />);
    await goToForm();

    expect(screen.getByText("Nombre y Apellido")).toBeTruthy();
    expect(screen.getByText("Correo electrónico")).toBeTruthy();
    expect(screen.getByText("Empresa")).toBeTruthy();
    expect(screen.getByText("WhatsApp")).toBeTruthy();
    expect(screen.queryByTestId("booking-prefill-note")).toBeNull();
    expect((container.querySelector("select") as HTMLSelectElement).value).not.toBe("+1"); // arranca en el país por defecto (Bolivia)
  });
});
