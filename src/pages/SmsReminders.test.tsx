import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SmsReminders, { formatUsPhone, nationalDigits } from "./SmsReminders";
import { SMS_SIGNUP_CONSENT } from "@/lib/legal";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true }) }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const phoneInput = () => screen.getByLabelText("Mobile phone number") as HTMLInputElement;
const checkbox = () => screen.getByRole("checkbox") as HTMLInputElement;
const submit = () => screen.getByRole("button", { name: "Yes, sign me up!" });
const body = () => JSON.parse(fetchMock.mock.calls[0][1].body);

describe("/sms-reminders — lo que exige Twilio para el opt-in por web", () => {
  it("tiene el campo de teléfono, el checkbox SIN marcar y el botón «Yes, sign me up!»", () => {
    render(<SmsReminders />);
    expect(phoneInput()).toBeTruthy();
    expect(checkbox().checked).toBe(false);
    expect(submit()).toBeTruthy();
  });

  it("describe los mensajes, la frecuencia, las tarifas, STOP/HELP y enlaza a Terms y Privacy", () => {
    const { container } = render(<SmsReminders />);
    const text = container.textContent ?? "";
    expect(text).toContain(SMS_SIGNUP_CONSENT);
    expect(text).toMatch(/confirmation when you book/i);
    expect(text).toMatch(/no marketing or promotional messages/i);
    expect(text).toMatch(/Message frequency:\s*varies/i);
    expect(text).toMatch(/Message and data rates may apply/i);
    expect(text).toMatch(/reply STOP/i);
    expect(text).toMatch(/reply HELP/i);
    expect(text).toMatch(/not a condition of booking/i);
    expect(text).toMatch(/will not be shared with any third parties/i);

    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/terms-and-conditions");
    expect(hrefs).toContain("/privacy-policy");
  });

  it("no envía nada sin marcar el checkbox, y avisa", async () => {
    render(<SmsReminders />);
    fireEvent.change(phoneInput(), { target: { value: "7815551234" } });
    fireEvent.click(submit());
    expect((await screen.findByRole("alert")).textContent).toMatch(/check the box/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("no envía un teléfono inválido", async () => {
    render(<SmsReminders />);
    fireEvent.change(phoneInput(), { target: { value: "123" } });
    fireEvent.click(checkbox());
    fireEvent.click(submit());
    expect((await screen.findByRole("alert")).textContent).toMatch(/valid 10-digit/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("con teléfono y checkbox marcado manda el número en E.164 y el texto exacto del consentimiento, y muestra la confirmación", async () => {
    render(<SmsReminders />);
    fireEvent.change(phoneInput(), { target: { value: "7815551234" } });
    expect(phoneInput().value).toBe("(781) 555-1234");
    fireEvent.click(checkbox());
    fireEvent.click(submit());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(String(fetchMock.mock.calls[0][0])).toContain("/functions/v1/sms-opt-in");
    expect(body()).toMatchObject({ phone: "+17815551234", consent: true, consent_text: SMS_SIGNUP_CONSENT, website: "" });
    expect(await screen.findByTestId("sms-signup-done")).toBeTruthy();
  });

  it("si el servidor falla muestra el error y deja volver a intentar", async () => {
    fetchMock.mockImplementationOnce(() => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ error: "internal_error" }) }));
    render(<SmsReminders />);
    fireEvent.change(phoneInput(), { target: { value: "7815551234" } });
    fireEvent.click(checkbox());
    fireEvent.click(submit());
    expect((await screen.findByRole("alert")).textContent).toMatch(/couldn't sign you up/i);
    expect(submit()).toBeTruthy();
  });
});

describe("formato del teléfono", () => {
  it("formatea mientras se escribe y acepta el 1 / +1 inicial", () => {
    expect(formatUsPhone("781")).toBe("781");
    expect(formatUsPhone("78126")).toBe("(781) 26");
    expect(formatUsPhone("7812683755")).toBe("(781) 268-3755");
    expect(nationalDigits("+1 (781) 268-3755")).toBe("7812683755");
    expect(nationalDigits("17812683755")).toBe("7812683755");
  });
});
