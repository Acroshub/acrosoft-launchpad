import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// Config mutable: los getters se leen en cada render, así una misma suite prueba "con pixel/calendario/video" y "vacío".
const cfg = vi.hoisted(() => ({ pixel: "", calendar: "", video: "" }));

vi.mock("@/lib/estimadosConfig", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/estimadosConfig")>();
  return {
    ...real,
    get ESTIMADOS_PIXEL_ID() { return cfg.pixel; },
    get ESTIMADOS_CALL_CALENDAR_ID() { return cfg.calendar; },
    get ESTIMADOS_TY_VIDEO_URL() { return cfg.video; },
  };
});
vi.mock("@/lib/metaPixel", () => ({ initMetaPixel: vi.fn(), trackMetaEvent: vi.fn() }));
vi.mock("@/lib/piscinasFunnel", () => ({
  addNoindex: vi.fn(() => () => {}),
  readSession: vi.fn(() => null),
  writeSession: vi.fn(),
  trackAbPurchase: vi.fn(),
}));

// El calendario real es de Tailwind y usa react-query/Supabase: aquí se reemplaza por un botón que guarda sus props y deja simular la reserva.
const calendar = vi.hoisted(() => ({
  props: null as null | Record<string, unknown>,
  // Lo que el calendario real entrega al confirmar una reserva (onBookingSuccess): 12:00 en La Paz, vista desde Nueva York.
  booking: { date: "2026-11-09", hour: 12, minute: 0, calendarTz: "America/La_Paz", visitorTz: "America/New_York", calendarName: "Selecciona el día y la hora" },
}));
vi.mock("@/components/crm/CalendarRenderer", async () => {
  const React = await import("react");
  return {
    default: (props: Record<string, unknown>) => {
      calendar.props = props;
      return React.createElement("button", { type: "button", "data-testid": "calendario", onClick: () => (props.onBookingSuccess as (b: unknown) => void)?.(calendar.booking) }, "calendario");
    },
  };
});

import EstimadosTy from "./EstimadosTy";
import { EST_TY_CSS } from "@/components/estimados/estimadosTyStyles";
import { readBooking } from "@/lib/estimadosBooking";
import { ESTIMADOS_AB_CHECKOUT_SESSION_KEY, ESTIMADOS_BOOKING_KEY } from "@/lib/estimadosConfig";
import { initMetaPixel, trackMetaEvent } from "@/lib/metaPixel";
import { addNoindex, trackAbPurchase } from "@/lib/piscinasFunnel";

// La respuesta de estimados-get-order NO trae enlace de descarga: el kit llega por correo (Resend, desde stripe-webhook).
const ORDER = {
  productName: "+50 Anuncios Virales - Mega Pack para Negocios de Tree Services",
  name: "carlos ramírez",
  email: "carlos@ejemplo.com",
  amountTotal: 3000,
  currency: "usd",
  tracking: { value: 30, currency: "USD", content_ids: ["estimados"] },
};

const fetchMock = vi.fn();
const respondOrder = (order: unknown = ORDER) =>
  fetchMock.mockImplementation(() => Promise.resolve({ ok: true, json: () => Promise.resolve(order) }));
const respondNotFound = () =>
  fetchMock.mockImplementation(() => Promise.resolve({ ok: false, json: () => Promise.resolve({ error: "order not found" }) }));

const openPage = (query = "?session_id=cs_test_1") => window.history.pushState({}, "", `/estimados-ty${query}`);
// La página usa useNavigate (al reservar pasa a la página final), así que va dentro de un Router; la ruta final es un marcador.
const renderTy = () => render(
  <MemoryRouter initialEntries={["/estimados-ty"]}>
    <Routes>
      <Route path="/estimados-ty" element={<EstimadosTy />} />
      <Route path="/estimados-gracias" element={<div data-testid="pagina-final">final</div>} />
    </Routes>
  </MemoryRouter>,
);
const tracked = () => (trackMetaEvent as unknown as ReturnType<typeof vi.fn>).mock.calls;
const follows = (a: Node, b: Node) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  calendar.props = null;
  try { localStorage.clear(); sessionStorage.clear(); } catch { /* sin storage */ }
  openPage();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  cfg.pixel = "";
  cfg.calendar = "";
  cfg.video = "";
});

describe("EstimadosTy — barra compacta de confirmación", () => {
  it("confirma la compra, muestra el correo y la barra al 90 %, sin el texto «Solo falta reclamar tu regalo»", async () => {
    respondOrder();
    renderTy();

    expect(await screen.findByText("¡Compra confirmada!")).toBeTruthy();
    expect(fetchMock.mock.calls[0][0]).toContain("estimados-get-order?session_id=cs_test_1");
    expect(screen.getByText("carlos@ejemplo.com")).toBeTruthy();
    expect(screen.getByText(/estamos enviando tu kit a/i)).toBeTruthy();

    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("90");
    expect(screen.getByText("90%")).toBeTruthy();
    expect(screen.queryByText(/solo falta/i)).toBeNull();
  });

  it("no ofrece descargar el kit en la página: la entrega es por correo (el enlace nunca pasa por esta página)", async () => {
    respondOrder();
    const { container } = renderTy();
    await screen.findByText("¡Compra confirmada!");
    expect(screen.queryByRole("link", { name: /descargar/i })).toBeNull();
    expect(container.querySelector("a[download]")).toBeNull();
    expect(container.textContent).not.toMatch(/descargar mi kit/i);
  });
});

describe("EstimadosTy — título del regalo", () => {
  it("el título se enfoca en el regalo valuado en US$100 y saluda por el nombre", async () => {
    respondOrder();
    renderTy();

    const h1 = await screen.findByRole("heading", { level: 1 });
    expect(h1.textContent).toBe("Carlos, recibiste un regalo valuado en US$100");
  });

  it("encima del título hay una imagen 3D: un billete de 100 dólares con un moño (no una caja ni un ícono dentro de un círculo)", async () => {
    respondOrder();
    const { container } = renderTy();
    const h1 = await screen.findByRole("heading", { level: 1 });
    const pic = container.querySelector("picture.est-ty-gift3d") as HTMLElement;
    expect(pic).toBeTruthy();
    expect(pic.querySelector("source")?.getAttribute("srcset")).toBe("/estimados/regalo.webp");
    const img = pic.querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("/estimados/regalo.png");
    expect(img.getAttribute("alt")).toMatch(/billete de 100 dólares con un moño/i);
    expect(img.getAttribute("alt")).not.toMatch(/caja/i);
    expect(container.querySelector(".est-ty-gifticon")).toBeNull();
    expect(follows(pic, h1)).toBe(true); // la imagen va antes (arriba) del título
  });

  it("entre la imagen del billete y el título hay un texto: compra con éxito, kit al correo y «una buena noticia...»", async () => {
    respondOrder();
    const { container } = renderTy();
    const h1 = await screen.findByRole("heading", { level: 1 });
    const pic = container.querySelector("picture.est-ty-gift3d") as HTMLElement;
    const intro = container.querySelector("p.est-ty-intro") as HTMLElement;
    expect(intro).toBeTruthy();
    expect(intro.textContent).toBe("Tu compra se realizó con éxito y recibirás tu kit en tu correo electrónico. Mientras tanto, déjame contarte una buena noticia...");
    expect(follows(pic, intro)).toBe(true); // después de la imagen
    expect(follows(intro, h1)).toBe(true); // y antes del título
    expect(intro.closest(".est-ty-gift")).toBeTruthy();
  });

  it("«una llamada de consultoría GRATIS…» (GRATIS en mayúscula) está en una caja con ícono de laptop (sin círculo), debajo del título", async () => {
    respondOrder();
    const { container } = renderTy();
    const h1 = await screen.findByRole("heading", { level: 1 });
    const box = container.querySelector(".est-ty-callbox") as HTMLElement;
    expect(box).toBeTruthy();
    expect(box.textContent).toBe("Una llamada de consultoría GRATIS para conseguir más clientes con anuncios de pago en Facebook y Google Ads.");
    // El ícono es una laptop (pantalla + base), no un teléfono ni un círculo.
    const icon = box.querySelector(".est-ty-callico svg") as SVGElement;
    expect(icon).toBeTruthy();
    expect(icon.querySelector("rect")).toBeTruthy();
    expect(icon.querySelector("circle")).toBeNull();
    expect(follows(h1, box)).toBe(true);
  });

  it("sin nombre guardado (compras anteriores a la migración) igual funciona y no inventa saludo", async () => {
    respondOrder({ ...ORDER, name: null });
    cfg.calendar = "cal-1";
    renderTy();
    const h1 = await screen.findByRole("heading", { level: 1 });
    expect(h1.textContent).toBe("Recibiste un regalo valuado en US$100");
    expect((calendar.props as { prefill?: { name?: string } }).prefill?.name).toBeUndefined();
  });

  it("debajo del video: «Valor normal US$100 → Aquí y ahora Gratis» en una sola fila, con las dos etiquetas en la misma tipografía, y sin «por tu compra del kit»", async () => {
    respondOrder();
    const { container } = renderTy();
    await screen.findByText("¡Compra confirmada!");

    expect(screen.getAllByText("US$100").length).toBeGreaterThanOrEqual(2); // en el título y tachado
    const value = container.querySelector(".est-ty-value") as HTMLElement;
    expect(value.textContent?.replace(/\s+/g, " ").trim()).toBe("Valor normal US$100 Aquí y ahora Gratis");
    // Una sola fila: es un solo párrafo con todos sus elementos al mismo nivel (la fila y el no-salto de línea son CSS).
    expect(Array.from(value.children).map((el) => el.tagName)).toEqual(["SPAN", "S", "svg", "SPAN", "B"]);
    // «Valor normal» y «Aquí y ahora» comparten la misma clase tipográfica.
    const labels = Array.from(value.querySelectorAll(".est-ty-lbl"));
    expect(labels.map((el) => el.textContent)).toEqual(["Valor normal", "Aquí y ahora"]);
    expect(follows(labels[1], screen.getByText("Gratis"))).toBe(true); // «Aquí y ahora» va justo antes de «Gratis»
    expect(container.textContent).not.toMatch(/por tu compra del kit/i);
  });

  it("«Qué vas a conseguir en la llamada» es una lista NUMERADA (ol) de 3 puntos", async () => {
    respondOrder();
    const { container } = renderTy();
    await screen.findByText("¡Compra confirmada!");
    expect(screen.getByText("Qué vas a conseguir en la llamada")).toBeTruthy();
    const list = container.querySelector(".est-ty-list") as HTMLElement;
    expect(list.tagName).toBe("OL");
    expect(list.querySelectorAll(":scope > li")).toHaveLength(3);
    expect(container.querySelector("ul.est-ty-list")).toBeNull();
  });

  it("ya no están la nota «Cómo funciona…» ni el título «Elige el día y la hora de tu llamada»", async () => {
    cfg.calendar = "cal-1";
    respondOrder();
    const { container } = renderTy();
    const cal = await screen.findByTestId("calendario");
    expect(container.textContent).not.toMatch(/cómo funciona/i);
    expect(container.textContent).not.toMatch(/si ves que tiene sentido/i);
    expect(container.textContent).not.toMatch(/te quedas con el plan/i);
    expect(container.textContent).not.toMatch(/elige el día y la hora/i);
    expect(container.textContent).not.toMatch(/solo te pedimos tu whatsapp/i);
    expect(container.querySelector(".est-ty-note")).toBeNull();
    expect(container.querySelector(".est-ty-pick")).toBeNull();
    // El calendario va directo después de la lista.
    expect(follows(container.querySelector(".est-ty-list") as Element, cal)).toBe(true);
  });
});

describe("EstimadosTy — la página es corta y el video queda en la primera pantalla", () => {
  it("el orden es: barra, título, video y recién después el resto (el video va justo debajo del título)", async () => {
    cfg.video = "https://cdn.ejemplo.com/regalo.mp4";
    respondOrder();
    const { container } = renderTy();
    await screen.findByText("¡Compra confirmada!");

    const page = container.querySelector(".est-page") as HTMLElement;
    const blocks = Array.from(page.children).map((el) => el.className);
    expect(blocks.slice(0, 3)).toEqual(["est-ty-bar", "est-ty-gift", "est-ty-vid"]);

    const video = container.querySelector("video") as HTMLVideoElement;
    expect(video.getAttribute("src")).toBe("https://cdn.ejemplo.com/regalo.mp4");
    expect(follows(screen.getByRole("heading", { level: 1 }), video)).toBe(true);
    expect(follows(video, container.querySelector(".est-ty-value") as Element)).toBe(true);
    expect(follows(video, container.querySelector(".est-ty-list") as Element)).toBe(true);
  });

  it("solo hay UN encabezado h1 y nada entre la barra y el video fuera del título", async () => {
    respondOrder();
    const { container } = renderTy();
    await screen.findByText("¡Compra confirmada!");
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    const page = container.querySelector(".est-page") as HTMLElement;
    // Con video presente o con el recuadro de desarrollo, el tercer bloque es el video.
    expect(Array.from(page.children).map((el) => el.className).slice(0, 3)).toEqual(["est-ty-bar", "est-ty-gift", "est-ty-vid"]);
  });

  it("no hay botón de «Reclamar mi regalo» en la página (ni ningún otro botón de llamada a la acción antes del calendario)", async () => {
    respondOrder();
    const { container } = renderTy();
    await screen.findByText("¡Compra confirmada!");
    expect(screen.queryByRole("link", { name: /reclamar/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /reclamar/i })).toBeNull();
    expect(container.querySelector(".est-btn")).toBeNull();
  });
});

describe("EstimadosTy — pie con el contacto de soporte", () => {
  const checkFooter = (container: HTMLElement) => {
    const footer = container.querySelector("footer.est-ty-foot") as HTMLElement;
    expect(footer).toBeTruthy();
    const wa = footer.querySelector('a[href^="https://wa.me/"]') as HTMLAnchorElement;
    expect(wa.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/59157697071\?text=/);
    expect(wa.textContent).toContain("+591 57697071");
    expect(wa.getAttribute("target")).toBe("_blank");
    expect(wa.getAttribute("rel")).toContain("noopener");
    const mail = footer.querySelector('a[href^="mailto:"]') as HTMLAnchorElement;
    expect(mail.getAttribute("href")).toMatch(/^mailto:daniel@acrosoftlabs\.com\?subject=/);
    expect(mail.textContent).toContain("daniel@acrosoftlabs.com");
  };

  it("lleva el WhatsApp +591 57697071 y el correo daniel@acrosoftlabs.com, al final de la página", async () => {
    cfg.calendar = "cal-1";
    respondOrder();
    const { container } = renderTy();
    const cal = await screen.findByTestId("calendario");
    checkFooter(container);
    expect(follows(cal, container.querySelector("footer.est-ty-foot") as Element)).toBe(true);
  });

  it("también se ve cuando la compra no se encuentra (es justo ahí donde más hace falta)", async () => {
    openPage("");
    const { container } = renderTy();
    await screen.findByText("No encontramos tu compra");
    checkFooter(container);
  });
});

describe("EstimadosTy — calendario de Acrosoft", () => {
  it("le pasa el nombre y el correo de Stripe, pide solo el WhatsApp y lo muestra fuera de .est-page", async () => {
    cfg.calendar = "11111111-2222-4333-8444-555555555555";
    respondOrder();
    const { container } = renderTy();

    const cal = await screen.findByTestId("calendario");
    expect(calendar.props).toMatchObject({
      calendarId: "11111111-2222-4333-8444-555555555555",
      lang: "es",
      requireWhatsapp: true,
      phoneDefaultDial: "+1", // los compradores están en EE.UU.: sin esto el selector de país arranca en Bolivia
      prefill: { name: "carlos ramírez", email: "carlos@ejemplo.com" },
    });
    // Estilos de la página y calendario no se mezclan: el calendario es un bloque hermano de .est-page, no hijo.
    expect(container.querySelector(".est-page")?.contains(cal)).toBe(false);
  });

  it("usa el calendario del CRM de la cuenta admin (el único que tiene) cuando no se cambia la configuración", async () => {
    const real = await vi.importActual<typeof import("@/lib/estimadosConfig")>("@/lib/estimadosConfig");
    expect(real.ESTIMADOS_CALL_CALENDAR_ID).toBe("24dab059-b724-4a13-b900-c2d73fc4438f");
  });

  it("sin id de calendario no inventa uno: muestra un recuadro rotulado", async () => {
    respondOrder();
    renderTy();
    expect(await screen.findByText("Espacio del calendario")).toBeTruthy();
    expect(screen.queryByTestId("calendario")).toBeNull();
  });
});

describe("EstimadosTy — video", () => {
  it("sin URL muestra el recuadro rotulado (solo en desarrollo); con un .mp4 incrusta <video>; con otra URL, un reproductor en iframe", async () => {
    respondOrder();
    const first = renderTy();
    expect(await screen.findByText("Espacio del video")).toBeTruthy();
    first.unmount();

    cfg.video = "https://cdn.ejemplo.com/regalo.mp4";
    const second = renderTy();
    await screen.findByText("¡Compra confirmada!");
    expect(second.container.querySelector("video")?.getAttribute("src")).toBe("https://cdn.ejemplo.com/regalo.mp4");
    second.unmount();

    cfg.video = "https://iframe.mediadelivery.net/embed/123/abc";
    const third = renderTy();
    await screen.findByText("¡Compra confirmada!");
    expect(third.container.querySelector("iframe")?.getAttribute("src")).toBe("https://iframe.mediadelivery.net/embed/123/abc");
  });
});

describe("EstimadosTy — estados", () => {
  it("sin session_id no consulta nada, explica qué hacer y no muestra calendario", async () => {
    openPage("");
    cfg.calendar = "cal-1";
    renderTy();
    expect(await screen.findByText("No encontramos tu compra")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId("calendario")).toBeNull();
  });

  it("si el pago aún no está registrado reintenta solo y luego deja un botón para reintentar", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    respondNotFound();
    renderTy();

    // 1 intento + 4 reintentos automáticos, separados por 3 s.
    for (let i = 0; i < 5; i++) await act(async () => { await vi.advanceTimersByTimeAsync(3100); });
    expect(await screen.findByText("Todavía no vemos tu compra")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(screen.queryByText("¡Compra confirmada!")).toBeNull();

    respondOrder();
    fireEvent.click(screen.getByRole("button", { name: /reintentar/i }));
    expect(await screen.findByText("¡Compra confirmada!")).toBeTruthy();
  });

  it("si la compra aparece en un reintento (el webhook tardó), la página se muestra sola", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fetchMock.mockImplementationOnce(() => Promise.resolve({ ok: false, json: () => Promise.resolve({}) }));
    fetchMock.mockImplementation(() => Promise.resolve({ ok: true, json: () => Promise.resolve(ORDER) }));
    renderTy();
    await act(async () => { await vi.advanceTimersByTimeAsync(3100); });
    expect(await screen.findByText("¡Compra confirmada!")).toBeTruthy();
  });
});

describe("EstimadosTy — al reservar la llamada", () => {
  it("guarda la cita (con el nombre, el correo y el session_id de la compra) y pasa a la página final", async () => {
    cfg.calendar = "cal-1";
    respondOrder();
    renderTy();
    fireEvent.click(await screen.findByTestId("calendario"));

    expect(await screen.findByTestId("pagina-final")).toBeTruthy();
    expect(screen.queryByTestId("calendario")).toBeNull(); // ya no está la página del regalo
    const saved = JSON.parse(sessionStorage.getItem(ESTIMADOS_BOOKING_KEY) as string);
    expect(saved).toMatchObject({
      date: "2026-11-09", hour: 12, minute: 0,
      calendarTz: "America/La_Paz", visitorTz: "America/New_York", calendarName: "Selecciona el día y la hora",
      email: "carlos@ejemplo.com", name: "carlos ramírez", sessionId: "cs_test_1",
    });
    expect(typeof saved.bookedAt).toBe("number");
  });

  it("lo que guarda lo entiende la página final (readBooking lo valida y lo devuelve igual)", async () => {
    cfg.calendar = "cal-1";
    respondOrder();
    renderTy();
    fireEvent.click(await screen.findByTestId("calendario"));
    await screen.findByTestId("pagina-final");
    expect(readBooking()).toMatchObject({ date: "2026-11-09", hour: 12, email: "carlos@ejemplo.com", sessionId: "cs_test_1" });
  });
});

describe("EstimadosTy — medición", () => {
  it("sin pixel no manda ningún evento de Meta", async () => {
    respondOrder();
    cfg.calendar = "cal-1";
    renderTy();
    fireEvent.click(await screen.findByTestId("calendario"));
    expect(initMetaPixel).not.toHaveBeenCalled();
    expect(tracked()).toHaveLength(0);
  });

  it("con pixel: PageView al cargar, un solo Purchase (event_id = session_id) aunque se recargue, y Schedule sin valor al reservar", async () => {
    cfg.pixel = "999000111";
    cfg.calendar = "cal-1";
    respondOrder();
    const first = renderTy();
    await screen.findByText("¡Compra confirmada!");

    expect(initMetaPixel).toHaveBeenCalledWith("999000111");
    const purchase = tracked().filter((c) => c[0] === "Purchase");
    expect(purchase).toHaveLength(1);
    expect(purchase[0][1]).toEqual(ORDER.tracking);
    expect(purchase[0][2]).toBe("cs_test_1");
    expect(purchase[0][3]).toBe("999000111");

    // Recargar la página no repite el Purchase.
    first.unmount();
    renderTy();
    await screen.findByText("¡Compra confirmada!");
    expect(tracked().filter((c) => c[0] === "Purchase")).toHaveLength(1);

    // Reservar la llamada dispara Schedule, sin `value` (es gratis), y pasa a la página final (donde sale el Lead).
    fireEvent.click(screen.getByTestId("calendario"));
    const schedule = tracked().filter((c) => c[0] === "Schedule");
    expect(schedule).toHaveLength(1);
    expect(schedule[0][1]).not.toHaveProperty("value");
    expect(typeof schedule[0][2]).toBe("string");
    expect(await screen.findByTestId("pagina-final")).toBeTruthy();
    expect(tracked().filter((c) => c[0] === "Lead")).toHaveLength(0); // el Lead sale en la página final, no aquí
  });

  it("marca como comprada la sesión de A/B de la landing y es una página noindex", async () => {
    respondOrder();
    renderTy();
    await screen.findByText("¡Compra confirmada!");
    expect(trackAbPurchase).toHaveBeenCalledWith(ESTIMADOS_AB_CHECKOUT_SESSION_KEY);
    expect(addNoindex).toHaveBeenCalled();
  });
});

describe("EstimadosTy — estilos pedidos por Daniel (contrato del CSS)", () => {
  // jsdom no calcula estilos reales; esto fija lo decidido para que un cambio accidental del CSS se note. Lo visual se verifica en navegador.
  const rule = (selector: string) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return EST_TY_CSS.match(new RegExp(`${escaped}\\{([^}]*)\\}`))?.[1] ?? "";
  };

  it("el pie es de fondo negro y estilo oscuro (enlaces en tarjetas oscuras con texto claro)", () => {
    expect(rule(".est-ty .est-ty-foot")).toMatch(/background:#0B0B0B/i);
    expect(rule(".est-ty .est-ty-foot-link")).toMatch(/background:#181818/i);
    expect(rule(".est-ty .est-ty-foot-link")).toMatch(/color:#F2F2F2/i);
    expect(rule(".est-ty .est-ty-foot-title")).toMatch(/color:#9A9A9A/i);
  });

  it("el billete y el texto de bienvenida tienen aire respecto a la barra de arriba (≥ 14 px) y el texto no queda pegado a los bordes", () => {
    const top = Number(rule(".est-ty .est-ty-gift").match(/padding:(\d+)px/)?.[1]);
    expect(top).toBeGreaterThanOrEqual(14);
    expect(rule(".est-ty .est-ty-intro")).toMatch(/padding:0 [1-9]\d*px/); // margen lateral del texto
  });

  it("el texto de bienvenida tiene espacio (≥ 6 px) con el billete (arriba) y con el título principal (abajo)", () => {
    const intro = rule(".est-ty .est-ty-intro");
    const [vertical] = (intro.match(/margin:(\d+)px 0(?:\s|;)/) ?? []).slice(1).map(Number);
    expect(vertical).toBeGreaterThanOrEqual(6); // margin: Npx 0 = N arriba y N abajo
    expect(rule(".est-ty .est-ty-gift3d")).toMatch(/margin:0 auto(?!\s+\d)/); // el billete no suma ni resta: el aire lo da el texto
  });

  it("en ventanas muy bajas de teléfono se oculta (solo con CSS) la línea de la barra que repite el texto de bienvenida; el contenido sigue en la página", async () => {
    expect(EST_TY_CSS).toMatch(/@media \(max-height:600px\) and \(max-width:600px\)\{\.est-ty \.est-ty-bar-sub\{display:none\}\}/);
    respondOrder();
    renderTy();
    await screen.findByText("¡Compra confirmada!");
    expect(screen.getByText(/estamos enviando tu kit a/i)).toBeTruthy(); // sigue en el DOM (lectores de pantalla, ventanas normales)
  });

  it("el texto de bienvenida tiene el estilo de «Valor normal»: misma fuente, mismo peso y mismo color (solo cambia el tamaño)", () => {
    const intro = rule(".est-ty .est-ty-intro");
    const label = rule(".est-ty .est-ty-lbl");
    const family = (css: string) => css.match(/font:600\s+[^/]+\/[\d.]+\s+(var\(--[a-z]+\))/)?.[1];
    expect(family(intro)).toBe("var(--text)");
    expect(family(intro)).toBe(family(label)); // la misma fuente (Inter) y el mismo peso (600)
    expect(intro.match(/color:(var\(--body\))/)?.[1]).toBe("var(--body)");
    expect(intro.match(/color:(var\(--body\))/)?.[1]).toBe(label.match(/color:(var\(--body\))/)?.[1]); // el mismo color
    expect(intro).not.toMatch(/text-transform/); // como «Valor normal»: sin mayúsculas forzadas
  });

  it("el calendario tiene un resplandor naranja ESTÁTICO (sin animación)", () => {
    const glow = rule(".est-ty-cal");
    expect(glow).toMatch(/box-shadow:[^;]*rgba\(234,90,11/); // halo del naranja de la marca
    expect(glow).not.toMatch(/animation/); // estático
    expect(EST_TY_CSS).not.toMatch(/@keyframes est-ty-glow|animation:[^;]*glow/); // y no hay ninguna animación de brillo
  });

  it("el pie queda pegado al fondo aunque el contenido sea corto (columna de pantalla completa)", async () => {
    expect(rule(".est-ty-root")).toMatch(/display:flex;flex-direction:column;min-height:100vh/);
    expect(rule(".est-ty-root>.est-ty-footwrap")).toMatch(/margin-top:auto/);
    openPage("");
    const { container } = renderTy();
    await screen.findByText("No encontramos tu compra");
    const root = container.querySelector(".est-ty-root") as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.lastElementChild?.classList.contains("est-ty-footwrap")).toBe(true); // el pie es el último bloque de la columna
    expect(root.querySelector("footer.est-ty-foot")).toBeTruthy();
  });

  it("los números 1, 2, 3 van sobre un cuadro de bordes redondeados con fondo", () => {
    const badge = rule(".est-ty .est-ty-list li::before");
    expect(badge).toMatch(/content:counter\(est-n\)/);
    expect(badge).toMatch(/background:var\(--orange\)/);
    expect(badge).toMatch(/border-radius:9px/);
    expect(badge).toMatch(/width:30px;height:30px/);
  });
});

describe("EstimadosTy — estilo", () => {
  it("todas las clases de la página llevan el prefijo est- (no chocan con las globales) y el copy no usa rayas largas", async () => {
    cfg.calendar = "cal-1";
    respondOrder();
    const { container } = renderTy();
    await screen.findByText("¡Compra confirmada!");
    container.querySelectorAll("[class]").forEach((el) => {
      if (el.closest("svg")) return;
      String(el.getAttribute("class")).split(/\s+/).filter(Boolean).forEach((c) => expect(c.startsWith("est-")).toBe(true));
    });
    expect(container.textContent).not.toMatch(/[—–]/);
  });
});
