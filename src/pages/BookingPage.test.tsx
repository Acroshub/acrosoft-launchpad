import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BookingPage from "./BookingPage";

// El calendario real habla con Supabase: aquí solo importa que BookingPage le pase onBookingSuccess y avise al padre.
let successCb: (() => void) | undefined;
vi.mock("@/components/crm/CalendarRenderer", () => ({
  default: (props: { onBookingSuccess?: () => void }) => {
    successCb = props.onBookingSuccess;
    return <div data-testid="cal">calendar</div>;
  },
}));

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/book/abc?lang=en"]}>
      <Routes><Route path="/book/:calendarId" element={<BookingPage />} /></Routes>
    </MemoryRouter>,
  );

const realParent = Object.getOwnPropertyDescriptor(window, "parent");
let post: ReturnType<typeof vi.fn>;
let roCallback: (() => void) | undefined;

beforeEach(() => {
  successCb = undefined;
  post = vi.fn();
  vi.stubGlobal("ResizeObserver", class { constructor(cb: () => void) { roCallback = cb; } observe() {} disconnect() {} });
  // alto simulado del contenido del calendario
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ height: 500 } as DOMRect);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  if (realParent) Object.defineProperty(window, "parent", realParent);
});

const embedInIframe = () => Object.defineProperty(window, "parent", { configurable: true, value: { postMessage: post } });

describe("BookingPage embebido en un iframe", () => {
  it("avisa al padre la altura del contenido (contenido + padding), sin datos personales", () => {
    embedInIframe();
    renderPage();
    expect(screen.getByTestId("cal")).toBeTruthy();
    expect(post).toHaveBeenCalledTimes(1);
    const [msg, target] = post.mock.calls[0];
    expect(target).toBe("*");
    expect(msg.type).toBe("acrosoft-booking-resize");
    expect(msg.source).toBe("acrosoft-booking");
    expect(msg.calendarId).toBe("abc");
    expect(msg.height).toBeGreaterThanOrEqual(500);
    expect(Object.keys(msg).sort()).toEqual(["calendarId", "height", "source", "type"]);
  });

  it("no repite el aviso si la altura no cambió y lo reenvía si cambia", () => {
    embedInIframe();
    renderPage();
    roCallback?.();
    expect(post).toHaveBeenCalledTimes(1);
    (HTMLElement.prototype.getBoundingClientRect as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ height: 760 } as DOMRect);
    roCallback?.();
    expect(post).toHaveBeenCalledTimes(2);
    expect(post.mock.calls[1][0].height).toBeGreaterThanOrEqual(760);
  });

  it("al completarse la reserva avisa con acrosoft-booking-success y SIN formData", () => {
    embedInIframe();
    renderPage();
    post.mockClear();
    successCb?.();
    expect(post).toHaveBeenCalledTimes(1);
    const [msg] = post.mock.calls[0];
    expect(msg).toEqual({ source: "acrosoft-booking", type: "acrosoft-booking-success", calendarId: "abc" });
  });
});

describe("BookingPage abierto directamente (fuera de un iframe)", () => {
  it("no envía ningún mensaje", () => {
    renderPage();
    successCb?.();
    expect(post).not.toHaveBeenCalled();
  });
});
