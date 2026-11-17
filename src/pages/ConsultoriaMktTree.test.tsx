import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Config mutable: los getters se leen en cada render.
const cfg = vi.hoisted(() => ({ pixel: "", calendar: "cal-123", video: "" }));

vi.mock("@/lib/consultoriaTreeConfig", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/consultoriaTreeConfig")>();
  return {
    ...real,
    get CONSULTORIA_TREE_PIXEL_ID() { return cfg.pixel; },
    get CONSULTORIA_TREE_CALENDAR_ID() { return cfg.calendar; },
    get CONSULTORIA_TREE_VIDEO_URL() { return cfg.video; },
  };
});
vi.mock("@/lib/metaPixel", () => ({ initMetaPixel: vi.fn(), trackMetaEvent: vi.fn() }));
vi.mock("@/lib/piscinasFunnel", () => ({ addNoindex: vi.fn(() => () => {}) }));

const calendar = vi.hoisted(() => ({
  props: null as null | Record<string, unknown>,
  booking: { date: "2026-11-23", hour: 12, minute: 0, calendarTz: "America/La_Paz", visitorTz: "America/New_York", calendarName: "Selecciona el día y la hora" },
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

import ConsultoriaMktTree from "./ConsultoriaMktTree";
import { initMetaPixel, trackMetaEvent } from "@/lib/metaPixel";
import { addNoindex } from "@/lib/piscinasFunnel";

const tracked = () => (trackMetaEvent as unknown as ReturnType<typeof vi.fn>).mock.calls;
const follows = (a: Node, b: Node) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom no implementa la reproducción de video (la galería de anuncios y el VSL la piden al montarse).
  Object.defineProperty(HTMLMediaElement.prototype, "play", { configurable: true, value: vi.fn(() => Promise.resolve()) });
  Object.defineProperty(HTMLMediaElement.prototype, "pause", { configurable: true, value: vi.fn() });
  calendar.props = null;
  try { localStorage.clear(); sessionStorage.clear(); } catch { /* sin storage */ }
  window.history.pushState({}, "", "/consultoria-mkt-tree");
});
afterEach(() => {
  cleanup();
  cfg.pixel = "";
  cfg.calendar = "cal-123";
  cfg.video = "";
});

const openPopup = () => fireEvent.click(screen.getAllByRole("button", { name: /Agendar ahora/i })[0]);

describe("/consultoria-mkt-tree", () => {
  it("promete +10 estimados nuevos al mes con un sistema probado de 4 sencillos pasos y es privada (noindex)", () => {
    render(<ConsultoriaMktTree />);
    const h1 = screen.getByRole("heading", { level: 1 }).textContent ?? "";
    expect(h1).toBe("Consigue +10 estimados nuevos al mes con un sistema probado de 4 sencillos pasos");
    expect(addNoindex).toHaveBeenCalled();
    expect(document.title).toMatch(/Consultoría de marketing gratis/);
  });

  it("el subtítulo es una lista «Sin…» de objeciones y el recuadro del presupuesto ya no está en el hero", () => {
    const { container } = render(<ConsultoriaMktTree />);
    const items = Array.from(container.querySelectorAll(".ct-sin li")).map((li) => li.textContent ?? "");
    expect(items).toHaveLength(3);
    items.forEach((t) => expect(t).toMatch(/^Sin /));
    expect(items[0]).toBe("Sin quemar tu presupuesto “probando estrategias a ver si funciona”");
    expect(items[1]).toBe("Sin compartir leads con otros negocios. Los estimados serán 100% tuyos");
    expect(items[2]).toBe("Sin reportes mediocres de “likes y seguidores”");
    expect(container.querySelector(".ct-hero")?.textContent).not.toMatch(/cada dólar se convierta/i);
    expect(container.querySelector(".ct-qual")).toBeNull();
  });

  it("la franja superior usa los avatares y las estrellas del kit con el texto «Experiencia con +50 Dueños de Tree Service en Estados Unidos»", () => {
    const { container } = render(<ConsultoriaMktTree />);
    const strip = container.querySelector(".est-top-proof")!;
    expect(strip.querySelector("img")?.getAttribute("src")).toBe("/estimados/avatares.png");
    const stars = strip.querySelector("svg[aria-label*='5 estrellas']")!;
    expect(stars.querySelectorAll("path")).toHaveLength(5); // cinco estrellas completas, sin media estrella
    expect(strip.querySelectorAll(".ct-proof-txt p > span")).toHaveLength(2); // el texto va en exactamente 2 líneas
    expect(strip.textContent).toBe("Experiencia con +50 Dueños de Tree Service en Estados Unidos");
    expect(strip.textContent).not.toMatch(/Todo el Mundo/i);
  });

  it("el texto de arriba del título dice «USA» y lleva la bandera de Estados Unidos al inicio", () => {
    const { container } = render(<ConsultoriaMktTree />);
    const eyebrow = container.querySelector(".ct-eyebrow")!;
    expect(eyebrow.textContent).toBe("Para dueños de tree service latinos en USA");
    expect(eyebrow.firstElementChild?.getAttribute("aria-label")).toBe("Estados Unidos");
    expect(container.textContent).not.toMatch(/EE\.?UU/i);
  });

  it("usa comillas normales (“ ”) y no comillas latinas (« ») en el texto visible", () => {
    const { container } = render(<ConsultoriaMktTree />);
    expect(container.querySelector(".est-page")!.textContent).not.toMatch(/[«»]/);
  });

  it("entre el hero y la sección de agencias van los sellos en inglés: «Meta Media Buying Professional» y «Google Marketing Certified»", () => {
    const { container } = render(<ConsultoriaMktTree />);
    const badges = container.querySelector(".ct-badges")!;
    const texts = Array.from(badges.querySelectorAll("li")).map((li) => li.textContent);
    expect(texts).toEqual(["Meta Media Buying Professional", "Google Marketing Certified"]); // la marca va al inicio de cada texto
    expect(badges.textContent).not.toMatch(/Profesional/);
    expect(badges.querySelector("svg[aria-label='Meta']")).not.toBeNull();
    expect(badges.querySelector("svg[aria-label='Google']")).not.toBeNull();
    const hero = container.querySelector(".ct-hero")!;
    const agencias = container.querySelector("h2.est-long")!;
    expect(follows(hero, badges)).toBe(true);
    expect(follows(badges, agencias)).toBe(true);
  });

  it("la sección de agencias es una pregunta y sus tres puntos dicen lo que pediste", () => {
    const { container } = render(<ConsultoriaMktTree />);
    expect(container.querySelector("h2.est-long")?.textContent).toBe("¿Por qué la mayoría de las agencias de marketing no pueden llenarte el calendario?");
    const titles = Array.from(container.querySelectorAll(".est-not h3")).map((h) => h.textContent);
    expect(titles).toEqual([
      "Queman tu dinero probando estrategias a ver si funcionan",
      "Reportes con Datos Maquillados",
      "Compran Datos Compartidos",
    ]);
    expect(container.querySelectorAll(".est-not p")[0].textContent).toBe("No tienen un plan claro, solo quieren cobrar y aprender con tu dinero.");
  });

  it("encima de los sellos va el logo de Acros Software con «Expertos en Marketing y Tecnología»", () => {
    const { container } = render(<ConsultoriaMktTree />);
    const by = container.querySelector(".ct-badges .ct-by")!;
    expect(by.textContent).toBe("AcrosSoftwareExpertos en Marketing y Tecnología"); // «Acros» + «Software» (el espacio lo da el margen del logo)
    expect(follows(by, container.querySelector(".ct-badges ul")!)).toBe(true);
  });

  it("«¿Por qué las agencias…?» es un carrusel de 3 tarjetas lado a lado con 3 puntos de posición", () => {
    const { container } = render(<ConsultoriaMktTree />);
    const track = container.querySelector(".ct-track")!;
    expect(track.querySelectorAll(".ct-card")).toHaveLength(3);
    const dots = Array.from(container.querySelectorAll(".ct-dots button"));
    expect(dots).toHaveLength(3);
    expect(dots[0].getAttribute("aria-current")).toBe("true");
    expect(dots[1].getAttribute("aria-current")).toBeNull();
  });

  it("al deslizar el carrusel el punto activo cambia, y al tocar un punto se mueve a esa tarjeta", () => {
    const { container } = render(<ConsultoriaMktTree />);
    const track = container.querySelector(".ct-track") as HTMLElement;
    const cards = Array.from(track.children) as HTMLElement[];
    // jsdom no mide nada: se simulan el ancho de las tarjetas (300 + 12 de espacio) y el área visible.
    cards.forEach((c, i) => { Object.defineProperty(c, "offsetWidth", { configurable: true, value: 300 }); Object.defineProperty(c, "offsetLeft", { configurable: true, value: 20 + i * 312 }); });
    Object.defineProperty(track, "clientWidth", { configurable: true, value: 390 });
    Object.defineProperty(track, "scrollWidth", { configurable: true, value: 20 + 3 * 312 + 8 });
    const on = () => Array.from(container.querySelectorAll(".ct-dots button")).findIndex((b) => b.getAttribute("aria-current") === "true");

    track.scrollLeft = 312; fireEvent.scroll(track);
    expect(on()).toBe(1);
    track.scrollLeft = 600; fireEvent.scroll(track); // ya no hay más a dónde deslizar: queda en la última
    expect(on()).toBe(2);
    track.scrollLeft = 0; fireEvent.scroll(track);
    expect(on()).toBe(0);

    const scrollTo = vi.fn();
    track.scrollTo = scrollTo as unknown as typeof track.scrollTo;
    fireEvent.click(container.querySelectorAll(".ct-dots button")[2]);
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ left: 20 + 2 * 312 - 20 }));
    expect(on()).toBe(2);
  });

  it("«Entonces, ¿qué sí funciona?»: icono de 4 piezas de rompecabezas sobre el título, sin subtexto ni estadísticas, y 4 pasos cortos numerados", () => {
    const { container } = render(<ConsultoriaMktTree />);
    const card = container.querySelector(".est-offer-card")!;
    expect(card.querySelector("h2")?.textContent).toBe("UN SISTEMA VALIDADO PARA CONSEGUIR ESTIMADOS GARANTIZADOS");
    expect(container.querySelector(".est-tagline")).toBeNull();
    expect(container.querySelector(".ct-stats")).toBeNull();
    // icono de rompecabezas: 4 piezas, justo encima del título
    const puzzle = card.querySelector("svg.ct-puzzle")!;
    expect(puzzle.querySelectorAll("path")).toHaveLength(4);
    expect(puzzle.nextElementSibling?.tagName).toBe("H2");
    const steps = Array.from(card.querySelectorAll(".ct-how li"));
    expect(steps.map((li) => li.querySelector("h3")?.textContent)).toEqual([
      "Anuncios que atraen clientes",
      "Campañas en el orden correcto",
      "Citas que se agendan solas",
      "Se revisa y se mejora cada semana",
    ]);
    expect(steps.map((li) => li.querySelector(".ct-how-n")?.textContent)).toEqual(["1", "2", "3", "4"]);
    expect(steps[0].textContent).toMatch(/virales/);
    expect(steps[1].textContent).toMatch(/Google/);
    expect(steps[1].textContent).toMatch(/Facebook/);
    expect(steps[2].textContent).toMatch(/teléfono/);
    expect(steps[3].textContent).toMatch(/cada semana/);
    // explicación, no oferta: nada de «usamos / te mostramos / volvemos»
    for (const li of steps) expect(li.textContent).not.toMatch(/\b(usamos|hacemos|volvemos|mostrarte|te mostramos|nosotros)\b/i);
    // 3 piezas solo con borde y 1 rellena
    expect(Array.from(puzzle.querySelectorAll("path")).filter((p) => p.getAttribute("fill") === "none")).toHaveLength(3);
    // explicaciones cortas (antes eran párrafos largos)
    for (const li of steps) expect(li.querySelector("p")!.textContent!.length).toBeLessThan(160);
    expect(card.textContent).not.toMatch(/Por eso va primero|Va segundo porque|Van al final porque/);
  });

  it("secciones quitadas: galería de anuncios, «¿Es para tu negocio?», garantía, caja «El plan es tuyo» y pie de soporte con WhatsApp", () => {
    const { container } = render(<ConsultoriaMktTree />);
    const page = container.querySelector(".est-page")!;
    expect(page.textContent).not.toMatch(/Así se ven los formatos|¿Es para tu negocio\?|venta disfrazada/i);
    expect(container.querySelector(".ct-get")!.textContent).not.toMatch(/El plan es tuyo/);
    expect(page.textContent).not.toMatch(/garantía de|reembolso/i);
    expect(container.querySelector(".est-support, .est-footer, a[href*='wa.me']")).toBeNull();
  });

  it("«Qué te llevas de la consultoría»: sin el texto de «venta disfrazada», sin la caja «El plan es tuyo», y los 3 pasos que pediste", () => {
    const { container } = render(<ConsultoriaMktTree />);
    const text = container.querySelector(".est-page")!.textContent ?? "";
    expect(text).not.toMatch(/venta disfrazada/);
    expect(container.querySelector(".ct-yours")).toBeNull();
    expect(text).not.toMatch(/Si luego prefieres ejecutarlo por tu cuenta/);
    const steps = Array.from(container.querySelectorAll(".ct-flow li")).map((li) => li.textContent ?? "");
    expect(steps).toHaveLength(3);
    expect(steps[1]).toContain("Te decimos cómo organizar tus anuncios en Google y Facebook para sacarle el máximo provecho a tu presupuesto.");
    expect(steps[2]).toContain("Te vas con un plan de marketing claro, adaptado a tu negocio, listo para ponerlo en marcha. Totalmente Gratis. Sin importar si luego trabajas o no con nosotros.");
  });

  it("la barra fija es solo un botón: «Agendar ahora» y, dentro del mismo botón y debajo, «Consultoría gratis + plan garantizado»", () => {
    const { container } = render(<ConsultoriaMktTree />);
    const sticky = container.querySelector(".est-sticky")!;
    expect(sticky.querySelector(".est-p")).toBeNull();
    expect(sticky.querySelectorAll("button")).toHaveLength(1);
    const btn = sticky.querySelector("button")!;
    expect(btn.querySelector(".ct-btn-txt")!.firstChild?.textContent).toBe("Agendar ahora");
    expect(btn.querySelector("small")?.textContent).toBe("Consultoría gratis + plan garantizado");
    expect(sticky.textContent).toBe(btn.textContent); // nada fuera del botón
    fireEvent.click(btn);
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("todos los botones llevan ícono de calendario, «Agendar ahora» y el mismo subtexto «Consultoría gratis + plan garantizado» dentro del botón", () => {
    const { container } = render(<ConsultoriaMktTree />);
    const buttons = screen.getAllByRole("button", { name: /Agendar ahora/i });
    expect(buttons).toHaveLength(4); // hero, sistema, barra fija y cierre
    for (const btn of buttons) {
      expect(btn.querySelector("svg rect")).not.toBeNull(); // el cuadro del calendario
      expect(btn.querySelector("svg path[d^='M4 10h16']")).not.toBeNull();
      expect(btn.querySelector(".ct-btn-txt")!.firstChild?.textContent).toBe("Agendar ahora");
      expect(btn.querySelector("small")?.textContent).toBe("Consultoría gratis + plan garantizado");
    }
    // la lista de confianza del hero ya no repite el plan (lo dice el botón)
    expect(container.querySelector(".est-trust")!.textContent).not.toMatch(/Plan de Marketing/);
    expect(container.textContent).not.toMatch(/plan claro garantizado/i);
  });

  it("el calendario NO está en la página: solo aparece en el popup al tocar un botón", () => {
    render(<ConsultoriaMktTree />);
    expect(screen.queryByTestId("calendario")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    openPopup();
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByTestId("calendario")).toBeTruthy();
  });

  it("TODOS los botones (incluida la barra fija) abren el popup", () => {
    render(<ConsultoriaMktTree />);
    const buttons = screen.getAllByRole("button", { name: /Agendar ahora/i });
    expect(buttons.length).toBeGreaterThanOrEqual(4);
    buttons.forEach((b) => {
      fireEvent.click(b);
      expect(screen.getByRole("dialog")).toBeTruthy();
      fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("usa el MISMO calendario del CRM, con el formulario completo (sin precargar nombre/correo) y +1 por defecto", () => {
    render(<ConsultoriaMktTree />);
    openPopup();
    expect(calendar.props?.calendarId).toBe("cal-123");
    expect(calendar.props?.prefill).toBeUndefined();
    expect(calendar.props?.requireWhatsapp).toBeUndefined();
    expect(calendar.props?.phoneDefaultDial).toBe("+1");
    expect(calendar.props?.lang).toBe("es");
    expect(calendar.props?.primaryColorOverride).toBe("#1F4D36");
    // formulario propio: 4 datos obligatorios + 3 confirmaciones Sí / No que bloquean la reserva
    const q = calendar.props?.qualification as { fields: { label: string }[]; confirmations: { text: string }[]; blockedMessage: string };
    expect(q.fields.map((f) => f.label)).toEqual(["Nombre y Apellido", "Correo electrónico", "WhatsApp", "Nombre del negocio"]);
    expect(q.confirmations).toHaveLength(3);
    expect(q.blockedMessage).toBe("Aún no cumples los requisitos para la consultoría");
  });

  it("sin URL de VSL no inventa video; con URL de archivo muestra el <video> y con otra URL un iframe", () => {
    const { container, unmount } = render(<ConsultoriaMktTree />);
    expect(container.querySelector(".est-ty-video video, .est-ty-video iframe")).toBeNull();
    unmount();

    cfg.video = "https://cdn.ejemplo.com/vsl/play_720p.mp4";
    const a = render(<ConsultoriaMktTree />);
    expect(a.container.querySelector(".ct-vid video")).not.toBeNull();
    expect(screen.getByRole("button", { name: /Reproducir el video con sonido/i })).toBeTruthy();
    a.unmount();

    cfg.video = "https://player.ejemplo.com/embed/abc";
    const b = render(<ConsultoriaMktTree />);
    expect(b.container.querySelector(".ct-vid iframe")?.getAttribute("src")).toBe("https://player.ejemplo.com/embed/abc");
  });

  it("sin calendario configurado el popup avisa que no está disponible", () => {
    cfg.calendar = "";
    render(<ConsultoriaMktTree />);
    openPopup();
    expect(screen.queryByTestId("calendario")).toBeNull();
    expect(screen.getByText(/Calendario no disponible/i)).toBeTruthy();
  });

  it("sin pixel no dispara ningún evento de Meta", () => {
    render(<ConsultoriaMktTree />);
    openPopup();
    fireEvent.click(screen.getByTestId("calendario"));
    expect(initMetaPixel).not.toHaveBeenCalled();
    expect(tracked()).toHaveLength(0);
  });

  it("con pixel: PageView y ViewContent al cargar; Lead y Schedule (sin value) al agendar", () => {
    cfg.pixel = "999";
    render(<ConsultoriaMktTree />);
    expect(initMetaPixel).toHaveBeenCalledWith("999");
    expect(tracked().map((c) => c[0])).toEqual(["PageView", "ViewContent"]);

    openPopup();
    fireEvent.click(screen.getByTestId("calendario"));
    const events = tracked().map((c) => c[0]);
    expect(events).toContain("Lead");
    expect(events).toContain("Schedule");
    const lead = tracked().find((c) => c[0] === "Lead")!;
    expect(lead[1]).not.toHaveProperty("value");
    expect(lead[3]).toBe("999");
    expect(typeof lead[2]).toBe("string");
  });

  it("al agendar el popup muestra la confirmación con día y hora, y los botones de agendar desaparecen de la página", () => {
    render(<ConsultoriaMktTree />);
    openPopup();
    act(() => { fireEvent.click(screen.getByTestId("calendario")); });
    expect(screen.queryByTestId("calendario")).toBeNull();
    expect(screen.getByTestId("consultoria-agendada").textContent).toMatch(/Tu consultoría está agendada/);
    expect(screen.getByTestId("resumen-cita").textContent).toMatch(/11:00 AM/); // 12:00 La Paz (UTC-4) = 11:00 AM en Nueva York (EST)

    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryAllByRole("button", { name: /Agendar ahora/i })).toHaveLength(0);
  });

  it("no promete resultados con cifras ni testimonios inventados (más allá de la meta declarada)", () => {
    const { container } = render(<ConsultoriaMktTree />);
    expect(container.textContent).not.toMatch(/\d+\s?(%|clientes)\s+(más|en)/i);
    expect(container.querySelector("blockquote, q")).toBeNull();
  });
});
