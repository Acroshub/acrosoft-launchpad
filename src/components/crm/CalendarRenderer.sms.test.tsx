import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Calendario de GH Tree Services (en inglés, con SMS activado): el formulario pide Name, Phone Number y la dirección.
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
const day = { open: true, slots: [{ from: "6:00 AM", to: "10:00 PM" }] };
const CALENDAR_ID = "cdf76e4d-b80f-40d2-bbd8-e7b09f2a6c97";
const FORM_FIELDS = [
  { id: "field_name", type: "text", label: "Name", required: true },
  { id: "field_phone", type: "phone", label: "Phone Number", required: true },
  { id: "field_street", type: "text", label: "Street Address", required: true },
  { id: "field_city", type: "text", label: "City", required: true },
  { id: "field_state", type: "text", label: "State", required: true },
  { id: "field_zip", type: "text", label: "ZIP Code", required: true },
];

const state = vi.hoisted(() => ({ smsEnabled: true }));

vi.mock("@/hooks/useCrmData", () => ({
  usePublicCalendar: () => ({
    data: {
      calendar: {
        id: CALENDAR_ID, name: "Book your appointment", description: null, duration_min: 60, buffer_min: 0, min_advance_hours: 0, max_future_days: 60,
        timezone: TZ, language: "en", linked_form_id: "form-1", facebook_pixel_id: null, slug: null, sms_reminders_enabled: state.smsEnabled,
        availability: { Dom: day, Lun: day, Mar: day, "Mié": day, Jue: day, Vie: day, "Sáb": day },
      },
      profile: { business_name: "GH tree services and landscaping", color_primary: "#2563EB", theme: "default" },
      blockedSlots: [],
      formFields: FORM_FIELDS,
    },
    isLoading: false,
  }),
  usePublicAppointments: () => ({ data: [] }),
}));

import CalendarRenderer from "./CalendarRenderer";

const fetchMock = vi.fn();

beforeEach(() => {
  state.smsEnabled = true;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 10, 8, 0, 0));
  fetchMock.mockReset();
  fetchMock.mockImplementation(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ appointment_id: "a1" }) }));
  vi.stubGlobal("fetch", fetchMock);
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
  fireEvent.click(screen.getAllByRole("button", { name: /continue with/i })[0]);
  await screen.findByText(/your details/i);
}

function fillForm(container: HTMLElement) {
  const text = Array.from(container.querySelectorAll('input[type="text"]')) as HTMLInputElement[]; // Name, Street, City, State, ZIP
  ["Ana Smith", "12 Oak St", "Boxford", "MA", "01921"].forEach((v, i) => fireEvent.change(text[i], { target: { value: v } }));
  fireEvent.change(container.querySelector('input[type="tel"]') as HTMLInputElement, { target: { value: "7815551234" } });
  fireEvent.click(container.querySelector("label div") as HTMLElement); // términos
}

const bookingBody = () => JSON.parse(fetchMock.mock.calls.find((c) => String(c[0]).includes("crm-calendar-book"))?.[1].body);

describe("CalendarRenderer — consentimiento de SMS", () => {
  it("muestra el checkbox de SMS SIN marcar, con el remitente, el negocio, STOP/HELP y los enlaces a Privacy y Terms en inglés", async () => {
    render(<CalendarRenderer calendarId={CALENDAR_ID} />);
    await goToForm();

    const box = screen.getByTestId("sms-consent-checkbox") as HTMLInputElement;
    expect(box.checked).toBe(false);
    const block = screen.getByTestId("sms-consent-block").textContent ?? "";
    expect(block).toContain("Acros Software");
    expect(block).toContain("GH tree services and landscaping");
    expect(block).toMatch(/Reply STOP/);
    expect(block).toMatch(/HELP/);
    expect(block).toMatch(/Message and data rates may apply/);
    expect(block).toMatch(/optional and is not required to book/);

    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/privacy-policy");
    expect(hrefs).toContain("/terms-and-conditions");
    expect(hrefs).not.toContain("/terminos_y_politicas_de_privacidad");
  });

  it("es opcional: reserva sin marcarlo y NO manda sms_consent", async () => {
    const { container } = render(<CalendarRenderer calendarId={CALENDAR_ID} />);
    await goToForm();
    fillForm(container);
    fireEvent.click(screen.getByRole("button", { name: /confirm appointment/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(bookingBody()).not.toHaveProperty("sms_consent");
  });

  it("si lo marca, manda sms_consent con el texto exacto que vio (prueba del consentimiento)", async () => {
    const { container } = render(<CalendarRenderer calendarId={CALENDAR_ID} />);
    await goToForm();
    fillForm(container);
    fireEvent.click(screen.getByTestId("sms-consent-checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /confirm appointment/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const { sms_consent } = bookingBody();
    expect(sms_consent.accepted).toBe(true);
    expect(sms_consent.text).toContain("I agree to receive appointment reminder text messages (SMS) from Acros Software on behalf of GH tree services and landscaping.");
    expect(sms_consent.text).toContain("Reply STOP to opt out");
  });

  it("un calendario sin SMS activado no muestra el checkbox", async () => {
    state.smsEnabled = false;
    render(<CalendarRenderer calendarId={CALENDAR_ID} />);
    await goToForm();
    expect(screen.queryByTestId("sms-consent-block")).toBeNull();
  });
});
