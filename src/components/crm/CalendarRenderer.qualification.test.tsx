import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Formulario propio de /consultoria-mkt-tree: 4 datos obligatorios + 3 confirmaciones Sí / No. Con cualquier «No» no se puede reservar.
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
const day = { open: true, slots: [{ from: "6:00 AM", to: "10:00 PM" }] };
const CALENDAR_ID = "24dab059-b724-4a13-b900-c2d73fc4438f";
const CONFIG = {
  calendar: {
    id: CALENDAR_ID, name: "Selecciona el día y la hora", description: null, duration_min: 30, buffer_min: 0, min_advance_hours: 0, max_future_days: 60,
    timezone: TZ, language: "es", linked_form_id: "form-1", facebook_pixel_id: null, slug: null,
    availability: { Dom: day, Lun: day, Mar: day, "Mié": day, Jue: day, Vie: day, "Sáb": day },
  },
  profile: null,
  blockedSlots: [],
  // El formulario del calendario (el del upsell) NO debe verse cuando la página trae el suyo.
  formFields: [{ id: "extra_company", type: "text", label: "Empresa del calendario", required: true }],
};

vi.mock("@/hooks/useCrmData", () => ({
  usePublicCalendar: () => ({ data: CONFIG, isLoading: false }),
  usePublicAppointments: () => ({ data: [] }),
}));

import CalendarRenderer from "./CalendarRenderer";
import { CONSULTORIA_TREE_QUALIFICATION } from "@/lib/consultoriaTreeConfig";

const fetchMock = vi.fn();
const scrollMock = vi.fn();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 10, 8, 0, 0));
  fetchMock.mockReset();
  fetchMock.mockImplementation(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) }));
  vi.stubGlobal("fetch", fetchMock);
  scrollMock.mockReset();
  Element.prototype.scrollIntoView = scrollMock as unknown as typeof Element.prototype.scrollIntoView;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function goToForm() {
  fireEvent.click(screen.getAllByRole("button", { name: "11" })[0]);
  const slot = (await screen.findAllByRole("button", { name: /\d{1,2}:\d{2}/ }))[0];
  fireEvent.click(slot);
  fireEvent.click(screen.getAllByRole("button", { name: /continuar con/i })[0]);
  await screen.findByText(/tus datos/i);
}

const renderForm = (extra: Record<string, unknown> = {}) =>
  render(<CalendarRenderer calendarId={CALENDAR_ID} lang="es" phoneDefaultDial="+1" qualification={CONSULTORIA_TREE_QUALIFICATION} {...extra} />);

const group = (n: number) => screen.getAllByRole("radiogroup")[n];
const answer = (n: number, opt: "Sí" | "No") => fireEvent.click(within(group(n)).getByRole("radio", { name: opt }));
const bookBtn = () => screen.getByRole("button", { name: /confirmar cita/i }) as HTMLButtonElement;

function fillFields(container: HTMLElement) {
  const texts = container.querySelectorAll('input[type="text"]');
  fireEvent.change(texts[0], { target: { value: "Carlos Ramírez" } });
  fireEvent.change(container.querySelector('input[type="email"]') as HTMLInputElement, { target: { value: "carlos@ejemplo.com" } });
  fireEvent.change(container.querySelector('input[type="tel"]') as HTMLInputElement, { target: { value: "3055551234" } });
  fireEvent.change(texts[1], { target: { value: "Ramírez Tree Service" } });
}
const acceptTerms = (container: HTMLElement) => fireEvent.click(container.querySelector("label div") as HTMLElement);

describe("CalendarRenderer — formulario propio con confirmaciones Sí / No", () => {
  it("pide Nombre y Apellido, Correo, WhatsApp y Nombre del negocio, más 3 confirmaciones; no muestra los campos del formulario del calendario", async () => {
    const { container } = renderForm();
    await goToForm();
    for (const l of ["Nombre y Apellido", "Correo electrónico", "WhatsApp", "Nombre del negocio"]) expect(screen.getByText(l)).toBeTruthy();
    expect(screen.queryByText("Empresa del calendario")).toBeNull();
    expect(container.querySelectorAll('input[type="text"]')).toHaveLength(2); // nombre y negocio
    expect(container.querySelectorAll('input[type="email"]')).toHaveLength(1);
    expect(container.querySelectorAll('input[type="tel"]')).toHaveLength(1);
    expect((container.querySelector("select") as HTMLSelectElement).value).toBe("+1");
    expect(screen.getAllByRole("radiogroup")).toHaveLength(3);
    expect(screen.getByText(/busco ayuda para recibir más clientes con marketing profesional/)).toBeTruthy();
    expect(screen.getByText(/puedo invertir más de \$2000 USD al mes en marketing/)).toBeTruthy();
    expect(screen.getByText(/no me presento a la llamada sin avisar/)).toBeTruthy();
    expect(screen.queryByTestId("booking-blocked")).toBeNull();
    expect(bookBtn().disabled).toBe(true); // vacío: no se puede enviar
    expect(screen.getByTestId("booking-incomplete")).toBeTruthy();
  });

  it("con cualquier «No» bloquea el botón y dice «Aún no cumples los requisitos para la consultoría»; al cambiar a «Sí» se desbloquea", async () => {
    const { container } = renderForm();
    await goToForm();
    fillFields(container); acceptTerms(container);
    for (let i = 0; i < 3; i++) {
      answer(0, "Sí"); answer(1, "Sí"); answer(2, "Sí");
      expect(bookBtn().disabled).toBe(false);
      answer(i, "No");
      expect(bookBtn().disabled).toBe(true);
      expect(screen.getByTestId("booking-blocked").textContent).toBe("Aún no cumples los requisitos para la consultoría");
      fireEvent.click(bookBtn());
      expect(fetchMock).not.toHaveBeenCalled();
      answer(i, "Sí");
      expect(bookBtn().disabled).toBe(false);
      expect(screen.queryByTestId("booking-blocked")).toBeNull();
    }
  });

  it("el botón sigue bloqueado mientras falte CUALQUIER dato o confirmación, y solo se habilita cuando está todo", async () => {
    const { container } = renderForm();
    await goToForm();
    acceptTerms(container);
    expect(bookBtn().disabled).toBe(true); // todo vacío
    fireEvent.click(bookBtn());
    expect(fetchMock).not.toHaveBeenCalled();

    // Las 3 confirmaciones en «Sí» pero sin datos: bloqueado.
    answer(0, "Sí"); answer(1, "Sí"); answer(2, "Sí");
    expect(bookBtn().disabled).toBe(true);

    // Cada dato por separado: mientras falte uno, bloqueado.
    const texts = container.querySelectorAll('input[type="text"]');
    const email = container.querySelector('input[type="email"]') as HTMLInputElement;
    const tel = container.querySelector('input[type="tel"]') as HTMLInputElement;
    fireEvent.change(texts[0], { target: { value: "Carlos Ramírez" } });
    expect(bookBtn().disabled).toBe(true);
    fireEvent.change(email, { target: { value: "no-es-un-correo" } }); // correo inválido
    fireEvent.change(tel, { target: { value: "3055551234" } });
    fireEvent.change(texts[1], { target: { value: "Ramírez Tree Service" } });
    expect(bookBtn().disabled).toBe(true);
    fireEvent.change(email, { target: { value: "carlos@ejemplo.com" } });
    expect(bookBtn().disabled).toBe(false);
    expect(screen.queryByTestId("booking-incomplete")).toBeNull();

    // Vaciar un dato o dejar una confirmación sin responder vuelve a bloquear.
    fireEvent.change(texts[1], { target: { value: "  " } });
    expect(bookBtn().disabled).toBe(true);
    fireEvent.change(texts[1], { target: { value: "Ramírez Tree Service" } });
    expect(bookBtn().disabled).toBe(false);
    fireEvent.change(tel, { target: { value: "" } });
    expect(bookBtn().disabled).toBe(true);
  });

  it("con las confirmaciones sin responder y todos los datos llenos también queda bloqueado", async () => {
    const { container } = renderForm();
    await goToForm();
    fillFields(container); acceptTerms(container);
    answer(0, "Sí"); answer(1, "Sí"); // falta la tercera
    expect(bookBtn().disabled).toBe(true);
    fireEvent.click(bookBtn());
    expect(fetchMock).not.toHaveBeenCalled();
    answer(2, "Sí");
    expect(bookBtn().disabled).toBe(false);
  });

  it("con todo completo y las 3 en «Sí» reserva y manda los datos y las confirmaciones", async () => {
    const onBookingSuccess = vi.fn();
    const { container } = renderForm({ onBookingSuccess });
    await goToForm();
    fillFields(container); acceptTerms(container);
    answer(0, "Sí"); answer(1, "Sí"); answer(2, "Sí");
    fireEvent.click(bookBtn());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.form_data).toEqual({
      field_name: "Carlos Ramírez",
      field_email: "carlos@ejemplo.com",
      "f-1788373522211": "+1 3055551234",
      field_business: "Ramírez Tree Service",
      confirm_busca_clientes: "Sí",
      confirm_presupuesto: "Sí",
      confirm_asistencia: "Sí",
    });
    // Datos extra para el servidor: etiqueta de origen, zona del visitante y las confirmaciones con su texto.
    expect(body.booking_meta.source).toBe("consultoria-mkt-tree");
    expect(typeof body.booking_meta.visitor_tz).toBe("string");
    expect(body.booking_meta.answers).toHaveLength(3);
    expect(body.booking_meta.answers[1]).toEqual({ label: expect.stringMatching(/puedo invertir más de \$2000 USD/), value: "Sí" });
    await waitFor(() => expect(onBookingSuccess).toHaveBeenCalledTimes(1));
  });
});

describe("CalendarRenderer — ventana de reserva (max_future_days)", () => {
  it("con max_future_days = 2 en una zona al oeste de Greenwich (La Paz) deja reservar mañana Y pasado mañana, no solo mañana", async () => {
    const prev = { ...CONFIG.calendar };
    Object.assign(CONFIG.calendar, { max_future_days: 2, timezone: "America/La_Paz" });
    vi.setSystemTime(new Date(Date.UTC(2026, 10, 10, 12, 0, 0))); // 08:00 del 10 de noviembre en La Paz
    try {
      render(<CalendarRenderer calendarId={CALENDAR_ID} lang="es" />);
      const enabled = (d: string) => !(screen.getAllByRole("button", { name: d })[0] as HTMLButtonElement).disabled;
      expect(enabled("11")).toBe(true);
      expect(enabled("12")).toBe(true);  // pasado mañana (antes quedaba bloqueado)
      expect(enabled("13")).toBe(false); // más allá de la ventana
    } finally {
      Object.assign(CONFIG.calendar, prev);
    }
  });
});

describe("CalendarRenderer — desplazamientos automáticos y título del formulario", () => {
  const scrolledEls = () => scrollMock.mock.contexts as HTMLElement[];

  it("al elegir una fecha baja a los horarios; al elegir un horario baja al botón Continuar; al continuar vuelve arriba al formulario", async () => {
    renderForm();
    expect(scrollMock).not.toHaveBeenCalled();

    // 1) fecha → sección de horarios
    fireEvent.click(screen.getAllByRole("button", { name: "11" })[0]);
    const slot = (await screen.findAllByRole("button", { name: /\d{1,2}:\d{2}/ }))[0];
    await waitFor(() => expect(scrollMock).toHaveBeenCalledTimes(1));
    const slotsSection = scrolledEls()[0];
    expect(within(slotsSection).getAllByRole("button", { name: /\d{1,2}:\d{2}/ }).length).toBeGreaterThan(0); // es la sección de horarios
    expect(scrollMock.mock.calls[0][0]).toMatchObject({ block: "start" });

    // 2) horario → botón Continuar
    fireEvent.click(slot);
    const cont = screen.getAllByRole("button", { name: /continuar con/i })[0];
    await waitFor(() => expect(scrollMock).toHaveBeenCalledTimes(2));
    expect(scrolledEls()[1].contains(cont)).toBe(true);
    expect(scrollMock.mock.calls[1][0]).toMatchObject({ block: "nearest" });

    // 3) Continuar → arriba del formulario: se ve la fecha elegida y el primer campo
    fireEvent.click(cont);
    await screen.findByText(/tus datos/i);
    await waitFor(() => expect(scrollMock).toHaveBeenCalledTimes(3));
    const top = scrolledEls()[2];
    expect(top.textContent).toMatch(/Tu fecha y hora son:/);
    expect(scrollMock.mock.calls[2][0]).toMatchObject({ block: "start" });
    expect(top.compareDocumentPosition(document.querySelector("input") as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("en el formulario ya no se muestra el nombre del calendario: dice «Tu fecha y hora son:» (también con el formulario normal del calendario)", async () => {
    // formulario propio
    const a = renderForm();
    await goToForm();
    expect(screen.getByText("Tu fecha y hora son:")).toBeTruthy();
    expect(screen.queryByText("Selecciona el día y la hora", { selector: "p" })).toBeNull();
    a.unmount();
    // formulario del calendario (sin `qualification`)
    render(<CalendarRenderer calendarId={CALENDAR_ID} lang="es" />);
    await goToForm();
    expect(screen.getByText("Tu fecha y hora son:")).toBeTruthy();
    expect(screen.queryByText("Selecciona el día y la hora", { selector: "p" })).toBeNull();
  });

  it("el aviso mientras falta algo dice «Completa todos los datos para agendar.»", async () => {
    renderForm();
    await goToForm();
    expect(screen.getByTestId("booking-incomplete").textContent).toBe("Completa todos los datos para agendar.");
  });
});
