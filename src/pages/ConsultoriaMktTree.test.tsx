import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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
  booking: {
    date: "2026-11-23", hour: 12, minute: 0, calendarTz: "America/La_Paz", visitorTz: "America/New_York", calendarName: "Selecciona el día y la hora",
    // Lo que la persona llenó en el formulario (el calendario lo devuelve al terminar la reserva).
    formData: { field_name: "Carlos Ramírez", field_email: "carlos@ejemplo.com", "f-1788373522211": "+1 3055551234", field_business: "Ramírez Tree Service" },
  },
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

const openPopup = () => fireEvent.click(screen.getAllByRole("button", { name: /Agenda gratis ahora/i })[0]);

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

  it("«Qué te llevas de la consultoría»: sin el texto de «venta disfrazada», sin la caja «El plan es tuyo», y los 4 pasos (el último, el website de regalo)", () => {
    const { container } = render(<ConsultoriaMktTree />);
    const text = container.querySelector(".est-page")!.textContent ?? "";
    expect(text).not.toMatch(/venta disfrazada/);
    expect(container.querySelector(".ct-yours")).toBeNull();
    expect(text).not.toMatch(/Si luego prefieres ejecutarlo por tu cuenta/);
    const steps = Array.from(container.querySelectorAll(".ct-flow li")).map((li) => li.textContent ?? "");
    expect(steps).toHaveLength(4);
    expect(steps[3]).toContain("te regalamos un website");
    expect(steps[1]).toContain("Te decimos cómo organizar tus anuncios en Google y Facebook para sacarle el máximo provecho a tu presupuesto.");
    expect(steps[2]).toContain("Te vas con un plan de marketing claro, adaptado a tu negocio, listo para ponerlo en marcha. Totalmente Gratis. Sin importar si luego trabajas o no con nosotros.");
  });

  it("la barra fija es solo un botón: «Agenda gratis ahora» y, dentro del mismo botón y debajo, «Consultoría gratis + Website de Regalo»", () => {
    const { container } = render(<ConsultoriaMktTree />);
    const sticky = container.querySelector(".est-sticky")!;
    expect(sticky.querySelector(".est-p")).toBeNull();
    expect(sticky.querySelectorAll("button")).toHaveLength(1);
    const btn = sticky.querySelector("button")!;
    expect(btn.querySelector(".ct-btn-main")!.textContent).toBe("Agenda gratis ahora");
    expect(btn.querySelector("small")?.textContent).toBe("Consultoría gratis + Website de Regalo");
    expect(sticky.textContent).toBe(btn.textContent); // nada fuera del botón
    fireEvent.click(btn);
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("todos los botones llevan ícono de calendario, «Agenda gratis ahora» y el mismo subtexto «Consultoría gratis + Website de Regalo» dentro del botón", () => {
    const { container } = render(<ConsultoriaMktTree />);
    const buttons = screen.getAllByRole("button", { name: /Agenda gratis ahora/i });
    expect(buttons).toHaveLength(4); // hero, sistema, barra fija y cierre
    for (const btn of buttons) {
      expect(btn.querySelector("svg rect")).not.toBeNull(); // el cuadro del calendario
      expect(btn.querySelector("svg path[d^='M4 10h16']")).not.toBeNull();
      expect(btn.querySelector(".ct-btn-main")!.textContent).toBe("Agenda gratis ahora");
      expect(btn.querySelector("small")?.textContent).toBe("Consultoría gratis + Website de Regalo");
    }
    // debajo de cada botón (menos en la barra fija) van siempre los mismos 3 textos de confianza
    const trusts = Array.from(container.querySelectorAll(".est-trust"));
    expect(trusts).toHaveLength(3); // hero, sistema y cierre
    for (const t of trusts) {
      expect(Array.from(t.querySelectorAll("li")).map((li) => li.textContent)).toEqual(["Website gratis por asistir", "Zoom, Meet o WhatsApp", "30 minutos"]);
      expect(t.querySelector(".ct-gift")).toBeNull(); // sin subrayar
    }
    expect(container.querySelector(".est-sticky .est-trust")).toBeNull();
    // el subrayado es solo del subtexto dentro de los botones
    expect(container.querySelectorAll(".ct-gift")).toHaveLength(4);
    for (const g of Array.from(container.querySelectorAll(".ct-gift"))) expect(g.closest("button")).not.toBeNull();
    expect(container.textContent).not.toMatch(/100% gratis/);
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
    const buttons = screen.getAllByRole("button", { name: /Agenda gratis ahora/i });
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

  describe("el resto de la página aparece 2:50 después de tocar Play en el VSL", () => {
    const MP4 = "https://cdn.ejemplo.com/vsl/play_720p.mp4";
    const playBtn = () => screen.getByRole("button", { name: /Reproducir el video con sonido/i });
    const faq = () => screen.queryByRole("heading", { name: "Preguntas frecuentes" });
    const agendar = () => screen.queryAllByRole("button", { name: /Agenda gratis ahora/i });
    afterEach(() => { vi.useRealTimers(); });

    it("no hay texto «Míralo completo…» debajo del VSL", () => {
      cfg.video = MP4;
      const { container } = render(<ConsultoriaMktTree />);
      expect(container.textContent).not.toMatch(/Míralo completo/);
      expect(container.querySelector(".ct-vid-cap")).toBeNull();
    });

    it("antes del Play solo se ve el hero hasta el video (título, «Sin…» y el VSL) y, como excepción, el logo con los sellos de Meta y Google; nada de botones, secciones ni preguntas", () => {
      cfg.video = MP4;
      const { container } = render(<ConsultoriaMktTree />);
      expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
      expect(container.querySelector(".ct-sin")).not.toBeNull();
      expect(container.querySelector(".ct-vid video")).not.toBeNull();
      expect(agendar()).toHaveLength(0);
      expect(container.querySelector(".est-trust")).toBeNull();
      // excepción: el logo de Acros Software y los sellos de Meta y Google se ven desde el principio, justo debajo del video
      const badges = container.querySelector(".ct-badges") as HTMLElement;
      expect(badges).not.toBeNull();
      expect(badges.textContent).toMatch(/Expertos en Marketing y Tecnología/);
      expect(badges.textContent).toMatch(/Meta.*Media Buying Professional/);
      expect(badges.textContent).toMatch(/Google.*Marketing Certified/);
      expect(badges.querySelector('svg[aria-label="Meta"]')).not.toBeNull();
      expect(badges.querySelector('svg[aria-label="Google"]')).not.toBeNull();
      expect(container.querySelector(".ct-vid")!.compareDocumentPosition(badges) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy(); // va después del video
      expect(container.querySelector(".ct-carousel")).toBeNull();
      expect(container.querySelector(".ct-how")).toBeNull();
      expect(container.querySelector(".ct-flow")).toBeNull();
      expect(faq()).toBeNull();
      expect(container.querySelector(".est-final")).toBeNull();
      expect(container.querySelector(".est-sticky")).toBeNull();
    });

    it("la cuenta empieza al tocar Play: a los 2:49 sigue oculto y a los 2:50 aparece todo, incluido el botón de agendar", () => {
      vi.useFakeTimers();
      cfg.video = MP4;
      render(<ConsultoriaMktTree />);
      act(() => { vi.advanceTimersByTime(60_000); }); // un minuto en la página sin tocar Play: nada cambia
      expect(faq()).toBeNull();
      fireEvent.click(playBtn());
      expect(faq()).toBeNull();
      act(() => { vi.advanceTimersByTime(169_999); });
      expect(faq()).toBeNull();
      expect(agendar()).toHaveLength(0);
      act(() => { vi.advanceTimersByTime(1); });
      expect(faq()).not.toBeNull();
      expect(agendar().length).toBeGreaterThan(0);
      expect(screen.getByRole("heading", { level: 2, name: /Qué te llevas de la consultoría/ })).toBeTruthy();
    });

    it("al recargar se recuerda: con Play tocado hace más de 2:50 se ve todo de inmediato; con menos tiempo, solo falta lo que resta", () => {
      vi.useFakeTimers();
      cfg.video = MP4;
      localStorage.setItem("ct_vsl_played_at", String(Date.now() - 171_000));
      render(<ConsultoriaMktTree />);
      expect(faq()).not.toBeNull();
      cleanup();

      localStorage.setItem("ct_vsl_played_at", String(Date.now() - 100_000));
      render(<ConsultoriaMktTree />);
      expect(faq()).toBeNull();
      act(() => { vi.advanceTimersByTime(69_999); });
      expect(faq()).toBeNull();
      act(() => { vi.advanceTimersByTime(1); });
      expect(faq()).not.toBeNull();
    });

    it("sin VSL, o con un reproductor en iframe (que no avisa del Play), se muestra todo desde el principio", () => {
      render(<ConsultoriaMktTree />);
      expect(faq()).not.toBeNull();
      cleanup();
      cfg.video = "https://player.ejemplo.com/embed/abc";
      render(<ConsultoriaMktTree />);
      expect(faq()).not.toBeNull();
      expect(agendar().length).toBeGreaterThan(0);
    });

    it("en vista previa, `?todo=1` muestra todo sin esperar (para revisar la página completa)", () => {
      cfg.video = MP4;
      sessionStorage.setItem("estimados_preview", "1");
      window.history.pushState({}, "", "/consultoria-mkt-tree?todo=1");
      render(<ConsultoriaMktTree />);
      expect(faq()).not.toBeNull();
      // sin vista previa activa, `?todo=1` no hace nada (un visitante no puede saltarse la espera)
      cleanup();
      sessionStorage.clear();
      render(<ConsultoriaMktTree />);
      expect(faq()).toBeNull();
    });
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
    expect(screen.getByTestId("consultoria-agendada").textContent).toMatch(/Ya reservamos tu cita\. Solo falta confirmar\./);
    expect(screen.getByTestId("resumen-cita").textContent).toMatch(/11:00 AM/); // 12:00 La Paz (UTC-4) = 11:00 AM en Nueva York (EST)
    expect(screen.queryAllByRole("button", { name: /Agenda gratis ahora/i })).toHaveLength(0);
  });

  it("el calendario va con fireLead={false}: el Lead de la página (con event_id) es el único, así la reserva no cuenta dos Leads", () => {
    render(<ConsultoriaMktTree />);
    openPopup();
    expect(calendar.props?.fireLead).toBe(false);
  });

  it("antes de confirmar NO hay botón de cerrar ni «X» y el popup no se cierra con Esc; al tocar «Confirmar Consultoría Gratis» aparece «Cerrar»", () => {
    render(<ConsultoriaMktTree />);
    openPopup();
    act(() => { fireEvent.click(screen.getByTestId("calendario")); });
    const dialog = screen.getByRole("dialog");
    // el único botón del popup es el verde de WhatsApp (que es un enlace): ni «Cerrar» ni la «X» de la esquina
    expect(within(dialog).queryAllByRole("button")).toHaveLength(0);
    expect(within(dialog).queryByText("Close")).toBeNull();
    expect(within(dialog).queryByRole("button", { name: "Cerrar" })).toBeNull();
    expect(within(dialog).getByRole("link", { name: /Confirmar Consultoría Gratis/ })).toBeTruthy();
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeNull(); // no se cierra sin confirmar

    // al tocar el botón verde (se abre WhatsApp) aparece «Cerrar»
    fireEvent.click(screen.getByTestId("confirmar-whatsapp"));
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryAllByRole("button", { name: /Agenda gratis ahora/i })).toHaveLength(0);
  });

  it("la pantalla de «Ya reservamos tu cita» ya no trae la lista de «Ten a la mano…», «Piensa cuánto…» ni «Conéctate…»", () => {
    render(<ConsultoriaMktTree />);
    openPopup();
    act(() => { fireEvent.click(screen.getByTestId("calendario")); });
    const text = screen.getByTestId("consultoria-agendada").textContent ?? "";
    expect(text).not.toMatch(/Ten a la mano|Piensa cuánto|Conéctate/);
    expect(screen.getByTestId("consultoria-agendada").querySelector("ul")).toBeNull();
  });

  it("al agendar dice «Ya reservamos tu cita. Solo falta confirmar.» y ofrece un botón verde de WhatsApp que escribe al negocio con el mensaje y los datos llenados", () => {
    render(<ConsultoriaMktTree />);
    openPopup();
    act(() => { fireEvent.click(screen.getByTestId("calendario")); });
    expect(screen.getByRole("heading", { name: "Ya reservamos tu cita. Solo falta confirmar." })).toBeTruthy();
    // Aún no termina: barra de avance al 90 % (no un check de «todo listo»).
    const prog = screen.getByRole("progressbar");
    expect(prog.getAttribute("aria-valuenow")).toBe("90");
    expect(prog.textContent).toBe(""); // la barra va sola, sin texto debajo
    expect(screen.queryByText(/Aún no termina el proceso/)).toBeNull();
    expect(document.querySelector(".ct-done-check")).toBeNull();
    expect(document.querySelector(".ct-done-ring")).not.toBeNull();
    const btn = screen.getByTestId("confirmar-whatsapp") as HTMLAnchorElement;
    expect(btn.textContent).toBe("Confirmar Consultoría Gratis");
    expect(btn.querySelector("svg")).not.toBeNull(); // icono de WhatsApp
    expect(btn.className).toContain("ct-wa");
    expect(btn.target).toBe("_blank");
    expect(btn.rel).toContain("noopener");
    const url = new URL(btn.href);
    expect(url.origin + url.pathname).toBe("https://wa.me/59157697071");
    expect(url.searchParams.get("text")).toBe(
      "Confirmo mi consultoria gratis\n\nNombre: Carlos Ramírez\nCorreo: carlos@ejemplo.com\nNombre del Negocio: Ramírez Tree Service",
    );
    // solo esos tres datos: no se manda el WhatsApp del cliente ni nada más
    expect(url.searchParams.get("text")).not.toMatch(/3055551234/);
  });

  it("no promete resultados con cifras ni testimonios inventados (más allá de la meta declarada)", () => {
    const { container } = render(<ConsultoriaMktTree />);
    expect(container.textContent).not.toMatch(/\d+\s?(%|clientes)\s+(más|en)/i);
    expect(container.querySelector("blockquote, q")).toBeNull();
  });
});
