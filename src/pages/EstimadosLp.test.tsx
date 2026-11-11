import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Config mutable: los getters se leen en cada render, así una misma suite prueba "con pixel y link" y "vacío".
const cfg = vi.hoisted(() => ({ link: "", pixel: "" }));

vi.mock("@/lib/estimadosConfig", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/estimadosConfig")>();
  return {
    ...real,
    get ESTIMADOS_PAYMENT_LINK() { return cfg.link; },
    get ESTIMADOS_PIXEL_ID() { return cfg.pixel; },
  };
});
vi.mock("@/lib/metaPixel", () => ({ initMetaPixel: vi.fn(), trackMetaEvent: vi.fn() }));
vi.mock("@/lib/productServerEvents", () => ({ sendProductServerEvent: vi.fn(() => Promise.resolve()) }));
vi.mock("@/lib/checkoutAttribution", () => ({ saveCheckoutAttribution: vi.fn(() => Promise.resolve()) }));
vi.mock("@/lib/piscinasFunnel", () => ({
  registerAbSession: vi.fn(() => "sesion-ab-1"),
  trackAbClick: vi.fn(),
  addNoindex: vi.fn(() => () => {}),
}));

import EstimadosLp from "./EstimadosLp";
import { initMetaPixel, trackMetaEvent } from "@/lib/metaPixel";
import { sendProductServerEvent } from "@/lib/productServerEvents";
import { trackAbClick } from "@/lib/piscinasFunnel";

let navigatedTo = "";
const realLocation = window.location;

beforeEach(() => {
  navigatedTo = "";
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { get href() { return "http://localhost/estimados-lp"; }, set href(v: string) { navigatedTo = v; } },
  });
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
  Object.defineProperty(window, "location", { configurable: true, value: realLocation });
  cfg.link = "";
  cfg.pixel = "";
});

const buyButtons = () => screen.getAllByRole("link", { name: /quiero|sí, quiero/i });

describe("EstimadosLp — contenido", () => {
  it("muestra la promesa, la garantía de 7 días y el precio de US$30", () => {
    render(<EstimadosLp />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/más clientes para tu negocio de tree service/i);
    expect(screen.getAllByText(/garantía de 7 días/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/US\$30/).length).toBeGreaterThan(0);
  });

  it("tiene 5 botones de compra: hero, oferta, galería, cierre y barra fija", () => {
    render(<EstimadosLp />);
    expect(buyButtons()).toHaveLength(5);
  });

  it("la galería son dos videos en bucle (ES y EN), mudos y en línea: el carrusel de <img> parpadeaba en Safari de iPhone", () => {
    const { container } = render(<EstimadosLp />);
    const vids = Array.from(container.querySelectorAll(".est-gal video")) as HTMLVideoElement[];
    expect(vids).toHaveLength(2);
    expect(vids.map((v) => v.getAttribute("src"))).toEqual(["/estimados/galeria-es.mp4", "/estimados/galeria-en.mp4"]);
    expect(vids.map((v) => v.getAttribute("poster"))).toEqual(["/estimados/galeria-es.jpg", "/estimados/galeria-en.jpg"]);
    vids.forEach((v) => {
      expect(v.loop).toBe(true);
      expect(v.muted).toBe(true); // iOS solo reproduce solo si está mudo
      expect(v.hasAttribute("playsinline")).toBe(true);
      expect(v.hasAttribute("autoplay")).toBe(true);
      expect(v.getAttribute("aria-label")).toBeTruthy();
    });
    // ya no hay filas de imágenes con scroll
    expect(container.querySelectorAll(".est-marq, .est-track, .est-gal img")).toHaveLength(0);
  });

  it("«Listos en 3 pasos» va dentro de la oferta, justo debajo del texto «Para llenar tu calendario…», y ya no es una sección aparte", () => {
    const { container } = render(<EstimadosLp />);
    const card = container.querySelector(".est-offer-card") as HTMLElement;
    const tagline = card.querySelector(".est-tagline") as HTMLElement;
    const steps = card.querySelector(".est-steps") as HTMLElement;
    expect(steps).not.toBeNull();
    expect(steps.querySelectorAll(".est-step")).toHaveLength(3);
    expect(Array.from(steps.querySelectorAll(".est-step b")).map((b) => b.textContent)).toEqual([
      "Elige tu anuncio viral",
      "Ponle tu logo, fácil y rápido desde el celular",
      "Publícalo y Promociónalo",
    ]);
    // orden en la tarjeta: tagline -> etiqueta «Listos en 3 pasos» -> pasos -> mockup del kit
    const label = tagline.nextElementSibling as HTMLElement;
    expect(label.textContent).toBe("Listos en 3 pasos");
    expect(label.nextElementSibling).toBe(steps);
    expect(steps.compareDocumentPosition(card.querySelector(".est-bundle") as Element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // y no queda ninguna otra lista de pasos fuera de la tarjeta
    expect(container.querySelectorAll(".est-steps")).toHaveLength(1);
    expect(Array.from(container.querySelectorAll("h2")).some((h) => /Listos en 3 pasos/.test(h.textContent ?? ""))).toBe(false);
  });

  it("todas las clases llevan el prefijo est- (no chocan con las globales del proyecto)", () => {
    const { container } = render(<EstimadosLp />);
    container.querySelectorAll("[class]").forEach((el) => {
      if (el.closest("svg")) return;
      String(el.getAttribute("class")).split(/\s+/).filter(Boolean).forEach((c) => expect(c.startsWith("est-")).toBe(true));
    });
  });
});

describe("EstimadosLp — compra y medición", () => {
  it("con pixel y link: PageView + ViewContent al cargar, y cada botón dispara InitiateCheckout (navegador y servidor, mismo event_id) y va a Stripe con client_reference_id", async () => {
    cfg.link = "https://buy.stripe.com/test_abc";
    cfg.pixel = "999000111";
    render(<EstimadosLp />);

    expect(initMetaPixel).toHaveBeenCalledWith("999000111");
    const names = (trackMetaEvent as unknown as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
    expect(names).toEqual(["PageView", "ViewContent"]);

    for (const button of buyButtons()) {
      vi.clearAllMocks();
      navigatedTo = "";
      fireEvent.click(button);
      await waitFor(() => expect(navigatedTo).not.toBe(""), { timeout: 3000 });

      const dest = new URL(navigatedTo);
      expect(`${dest.origin}${dest.pathname}`).toBe("https://buy.stripe.com/test_abc");
      expect(dest.searchParams.get("client_reference_id")).toMatch(/^estimados_[0-9a-f-]{36}$/);

      const browser = (trackMetaEvent as unknown as ReturnType<typeof vi.fn>).mock.calls.find((c) => c[0] === "InitiateCheckout");
      const server = (sendProductServerEvent as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(browser).toBeTruthy();
      expect(browser![3]).toBe("999000111");
      expect(server).toMatchObject({ product: "estimados", event: "InitiateCheckout" });
      expect(server.eventId).toBe(browser![2]);
      expect(trackAbClick).toHaveBeenCalledWith("sesion-ab-1");
    }
  });

  it("sin pixel y sin link: no manda ningún evento de Meta y el botón no navega, pero registra el clic", async () => {
    render(<EstimadosLp />);
    expect(initMetaPixel).not.toHaveBeenCalled();
    expect(trackMetaEvent).not.toHaveBeenCalled();

    fireEvent.click(buyButtons()[0]);
    await new Promise((r) => setTimeout(r, 400));
    expect(navigatedTo).toBe("");
    expect(sendProductServerEvent).not.toHaveBeenCalled();
    expect(trackAbClick).toHaveBeenCalledWith("sesion-ab-1");
  });

  it("Ctrl/Cmd-clic abre el link real en otra pestaña sin interceptarlo", () => {
    cfg.link = "https://buy.stripe.com/test_abc";
    render(<EstimadosLp />);
    const first = buyButtons()[0] as HTMLAnchorElement;
    expect(first.getAttribute("href")).toMatch(/^https:\/\/buy\.stripe\.com\/test_abc\?client_reference_id=estimados$/);
    // El listener de document corre después del manejador de React: ahí vemos si la página canceló el clic y luego lo cancelamos
    // nosotros para que jsdom no intente navegar.
    let prevented: boolean | null = null;
    const spy = (e: Event) => { prevented = e.defaultPrevented; e.preventDefault(); };
    document.addEventListener("click", spy);
    fireEvent.click(first, { ctrlKey: true });
    document.removeEventListener("click", spy);
    expect(prevented).toBe(false);
    expect(navigatedTo).toBe("");
  });
});

describe("EstimadosLp — barra fija móvil", () => {
  const rect = (top: number) => ({ top, bottom: top, left: 0, right: 0, width: 0, height: 0, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;

  it("está oculta mientras el hero sigue a la vista y aparece cuando el marcador ya quedó arriba de la pantalla", () => {
    const spy = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(rect(400));
    const { container } = render(<EstimadosLp />);
    const bar = container.querySelector(".est-sticky") as HTMLElement;
    expect(bar.classList.contains("est-is-visible")).toBe(false);

    spy.mockReturnValue(rect(-120));
    window.dispatchEvent(new Event("scroll"));
    return waitFor(() => expect(bar.classList.contains("est-is-visible")).toBe(true)).finally(() => spy.mockRestore());
  });

  it("si la página abre ya desplazada más allá del hero, la barra aparece desde el inicio", () => {
    const spy = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(rect(-900));
    const { container } = render(<EstimadosLp />);
    expect((container.querySelector(".est-sticky") as HTMLElement).classList.contains("est-is-visible")).toBe(true);
    spy.mockRestore();
  });
});
