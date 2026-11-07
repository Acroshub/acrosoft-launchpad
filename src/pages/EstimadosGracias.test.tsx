import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Config mutable: los getters se leen en cada render, así una misma suite prueba «con pixel» y «sin pixel».
const cfg = vi.hoisted(() => ({ pixel: "" }));

vi.mock("@/lib/estimadosConfig", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/estimadosConfig")>();
  return { ...real, get ESTIMADOS_PIXEL_ID() { return cfg.pixel; } };
});
vi.mock("@/lib/metaPixel", () => ({ initMetaPixel: vi.fn(), trackMetaEvent: vi.fn() }));
vi.mock("@/lib/piscinasFunnel", () => ({
  addNoindex: vi.fn(() => () => {}),
  readSession: vi.fn(() => "cs_test_9"),
}));

import EstimadosGracias from "./EstimadosGracias";
import { EST_END_CSS } from "@/components/estimados/estimadosGraciasStyles";
import { saveBooking, type EstimadosBooking } from "@/lib/estimadosBooking";
import { ESTIMADOS_BOOKING_KEY, ESTIMADOS_EMAIL_SENDER, ESTIMADOS_EMAIL_SUBJECT } from "@/lib/estimadosConfig";
import { initMetaPixel, trackMetaEvent } from "@/lib/metaPixel";
import { addNoindex } from "@/lib/piscinasFunnel";

// 12:00 en La Paz (zona del calendario del admin) vista desde Nueva York: lunes 9 de noviembre, 11:00 AM.
const BOOKING: EstimadosBooking = {
  date: "2026-11-09", hour: 12, minute: 0, calendarTz: "America/La_Paz", visitorTz: "America/New_York",
  calendarName: "Selecciona el día y la hora", email: "carlos@ejemplo.com", name: "carlos ramírez", sessionId: "cs_test_1", bookedAt: 1790000000000,
};

const tracked = () => (trackMetaEvent as unknown as ReturnType<typeof vi.fn>).mock.calls;
const follows = (a: Node, b: Node) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
const realMatchMedia = window.matchMedia;

const scrollTo = vi.fn(); // jsdom no implementa window.scrollTo

beforeEach(() => {
  vi.clearAllMocks();
  window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
  try { localStorage.clear(); sessionStorage.clear(); } catch { /* sin storage */ }
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.matchMedia = realMatchMedia;
  cfg.pixel = "";
});

describe("EstimadosGracias — abre siempre arriba", () => {
  it("sube al inicio al abrir (se llega desde el calendario, con la pantalla bajada) para que se vean la barra al 100 % y el confeti", () => {
    saveBooking(BOOKING);
    render(<EstimadosGracias />);
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });
});

describe("EstimadosGracias — barra y título", () => {
  it("la barra del 90 % de la página anterior llega al 100 % y confirma compra y llamada", () => {
    saveBooking(BOOKING);
    render(<EstimadosGracias />);
    expect(screen.getByText("¡Todo listo!")).toBeTruthy();
    expect(screen.getByText("100%")).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("100");
    expect(screen.getByText("Tu compra y tu llamada están confirmadas.")).toBeTruthy();
  });

  it("el título saluda por el nombre y dice que la llamada ya está agendada", () => {
    saveBooking(BOOKING);
    render(<EstimadosGracias />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Carlos, tu llamada ya está agendada");
  });
});

describe("EstimadosGracias — las 3 secciones", () => {
  it("Sección 1: instrucciones para descargar el kit DESDE EL CORREO (con el asunto y el remitente reales), sin ningún enlace de descarga en la página", () => {
    saveBooking(BOOKING);
    const { container } = render(<EstimadosGracias />);
    const card = screen.getByRole("heading", { name: /descarga tu kit desde tu correo/i }).closest("article") as HTMLElement;
    expect(card.querySelector(".est-end-num")?.textContent).toBe("1");
    const steps = card.querySelectorAll("ol.est-end-steps > li");
    expect(steps.length).toBeGreaterThanOrEqual(4);
    expect(card.textContent).toContain("carlos@ejemplo.com");
    expect(card.textContent).toContain(`«${ESTIMADOS_EMAIL_SUBJECT}»`); // lo que de verdad manda el webhook
    expect(card.textContent).toContain(`«${ESTIMADOS_EMAIL_SENDER}»`);
    expect(card.textContent).toMatch(/Descargar mi kit/);
    expect(card.textContent).toMatch(/Spam o Promociones/);
    // El enlace de Drive viaja solo en el correo: esta página no lo muestra ni lo enlaza.
    expect(container.innerHTML).not.toMatch(/drive\.google\.com/i);
    expect(container.querySelector("a[download]")).toBeNull();
  });

  it("Sección 2: resumen de la fecha y la hora en la zona de quien reservó, y avisa que se le hablará por WhatsApp", () => {
    saveBooking(BOOKING);
    render(<EstimadosGracias />);
    const card = screen.getByRole("heading", { name: /tu llamada de consultoría/i }).closest("article") as HTMLElement;
    expect(card.querySelector(".est-end-num")?.textContent).toBe("2");
    const summary = screen.getByTestId("resumen-cita");
    expect(summary.textContent).toMatch(/Lunes,? 9 de noviembre/);
    expect(summary.textContent).toContain("11:00 AM"); // 12:00 de La Paz = 11:00 AM en Nueva York
    expect(summary.textContent).toMatch(/America\/New York/);
    expect(card.textContent).toContain("Te hablaremos por WhatsApp para coordinar la reunión.");
  });

  it("Sección 3: datos de contacto para ayuda en el pie oscuro (WhatsApp y correo)", () => {
    saveBooking(BOOKING);
    const { container } = render(<EstimadosGracias />);
    const footer = container.querySelector("footer.est-ty-foot") as HTMLElement;
    expect(footer.querySelector(".est-end-num")?.textContent).toBe("3");
    expect(footer.textContent).toContain("Datos de contacto para ayuda");
    expect((footer.querySelector('a[href^="https://wa.me/"]') as HTMLAnchorElement).getAttribute("href")).toMatch(/^https:\/\/wa\.me\/59157697071\?text=/);
    expect(footer.textContent).toContain("+591 57697071");
    expect((footer.querySelector('a[href^="mailto:"]') as HTMLAnchorElement).getAttribute("href")).toMatch(/^mailto:daniel@acrosoftlabs\.com/);
  });

  it("el orden es: barra, título, sección 1, sección 2 y, al final, la sección 3", () => {
    saveBooking(BOOKING);
    const { container } = render(<EstimadosGracias />);
    const bar = container.querySelector(".est-ty-bar") as Element;
    const h1 = screen.getByRole("heading", { level: 1 });
    const s1 = screen.getByRole("heading", { name: /descarga tu kit/i });
    const s2 = screen.getByRole("heading", { name: /tu llamada de consultoría/i });
    const s3 = container.querySelector("footer.est-ty-foot") as Element;
    expect([follows(bar, h1), follows(h1, s1), follows(s1, s2), follows(s2, s3)]).toEqual([true, true, true, true]);
  });
});

describe("EstimadosGracias — confeti", () => {
  it("cae una sola vez con la barra al 100 % y luego se quita de la página", () => {
    vi.useFakeTimers();
    saveBooking(BOOKING);
    const { container } = render(<EstimadosGracias />);
    const confetti = screen.getByTestId("confeti");
    expect(confetti.getAttribute("aria-hidden")).toBe("true"); // decorativo: no estorba a los lectores de pantalla
    expect(confetti.querySelectorAll("i").length).toBeGreaterThanOrEqual(30);
    act(() => { vi.advanceTimersByTime(5300); });
    expect(container.querySelector('[data-testid="confeti"]')).toBeNull();
  });

  it("si la persona pidió menos movimiento (prefers-reduced-motion) no hay confeti", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    saveBooking(BOOKING);
    render(<EstimadosGracias />);
    expect(screen.queryByTestId("confeti")).toBeNull();
  });

  it("el CSS: la barra sube de 90 % a 100 %, el confeti no recibe clics y se apaga con prefers-reduced-motion", () => {
    expect(EST_END_CSS).toMatch(/\.est-end \.est-ty-fill\{width:100%;animation:est-end-fill/);
    expect(EST_END_CSS).toMatch(/@keyframes est-end-fill\{from\{width:90%\}to\{width:100%\}\}/);
    expect(EST_END_CSS).toMatch(/\.est-end-confetti\{[^}]*pointer-events:none/);
    expect(EST_END_CSS).toMatch(/@media \(prefers-reduced-motion:reduce\)\{\.est-end \.est-end-confetti\{display:none\}\}/);
    expect(EST_END_CSS).toMatch(/animation:est-end-fall[^;]*\s1\s+both|animation:est-end-fall var\(--d\)[^;]* 1 both/); // una sola caída
  });
});

describe("EstimadosGracias — pixel de Meta: PageView y Lead", () => {
  it("con pixel y cita recién agendada: PageView y UN Lead (sin valor, event_id estable), y no se repite al recargar", () => {
    cfg.pixel = "999000111";
    saveBooking(BOOKING);
    const first = render(<EstimadosGracias />);

    expect(initMetaPixel).toHaveBeenCalledWith("999000111");
    expect(tracked().map((c) => c[0])).toEqual(["PageView", "Lead"]);
    const lead = tracked().find((c) => c[0] === "Lead") as unknown[];
    expect(lead[1]).not.toHaveProperty("value"); // la llamada es gratis: sin valor
    expect(lead[2]).toBe("lead_1790000000000"); // event_id estable (sirve para deduplicar con un futuro envío del servidor)
    expect(lead[3]).toBe("999000111"); // va solo a ESTE pixel

    // Recargar la página (misma pestaña, misma cita) NO repite el Lead.
    first.unmount();
    render(<EstimadosGracias />);
    expect(tracked().filter((c) => c[0] === "Lead")).toHaveLength(1);
  });

  it("una cita NUEVA (otra reserva) sí dispara su propio Lead", () => {
    cfg.pixel = "999000111";
    saveBooking(BOOKING);
    const first = render(<EstimadosGracias />);
    first.unmount();
    saveBooking({ ...BOOKING, bookedAt: BOOKING.bookedAt + 60000 });
    render(<EstimadosGracias />);
    expect(tracked().filter((c) => c[0] === "Lead").map((c) => c[2])).toEqual(["lead_1790000000000", "lead_1790000060000"]);
  });

  it("sin cita (la página se abrió directo) manda PageView pero NO Lead", () => {
    cfg.pixel = "999000111";
    render(<EstimadosGracias />);
    expect(tracked().map((c) => c[0])).toEqual(["PageView"]);
  });

  it("sin pixel configurado no manda ningún evento", () => {
    saveBooking(BOOKING);
    render(<EstimadosGracias />);
    expect(initMetaPixel).not.toHaveBeenCalled();
    expect(tracked()).toHaveLength(0);
  });
});

describe("EstimadosGracias — sin cita", () => {
  it("sin cita guardada: sección 2 dice que aún no agenda y ofrece volver a agendar (con el session_id de la compra); las secciones 1 y 3 siguen", () => {
    const { container } = render(<EstimadosGracias />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Tu compra está confirmada");
    expect(screen.getByText("Tu compra está confirmada.")).toBeTruthy();
    expect(screen.queryByTestId("resumen-cita")).toBeNull();
    expect(screen.getByText(/todavía no agendas tu llamada/i)).toBeTruthy();
    const back = screen.getByRole("link", { name: /agendar mi llamada gratis/i });
    expect(back.getAttribute("href")).toBe("/estimados-ty?session_id=cs_test_9");
    expect(screen.getByRole("heading", { name: /descarga tu kit desde tu correo/i })).toBeTruthy();
    expect(container.querySelector("footer.est-ty-foot")).toBeTruthy();
  });

  it("si lo guardado está dañado se trata como «sin cita» (no muestra datos raros ni manda Lead)", () => {
    cfg.pixel = "999000111";
    sessionStorage.setItem(ESTIMADOS_BOOKING_KEY, JSON.stringify({ date: "no-es-fecha", hour: 99 }));
    render(<EstimadosGracias />);
    expect(screen.queryByTestId("resumen-cita")).toBeNull();
    expect(tracked().filter((c) => c[0] === "Lead")).toHaveLength(0);
  });
});

describe("EstimadosGracias — página privada y estilo", () => {
  it("es noindex", () => {
    render(<EstimadosGracias />);
    expect(addNoindex).toHaveBeenCalled();
  });

  it("todas las clases llevan el prefijo est- y el copy no usa rayas largas", () => {
    saveBooking(BOOKING);
    const { container } = render(<EstimadosGracias />);
    container.querySelectorAll("[class]").forEach((el) => {
      if (el.closest("svg")) return;
      String(el.getAttribute("class")).split(/\s+/).filter(Boolean).forEach((c) => expect(c.startsWith("est-")).toBe(true));
    });
    expect(container.textContent).not.toMatch(/[—–]/);
  });
});
