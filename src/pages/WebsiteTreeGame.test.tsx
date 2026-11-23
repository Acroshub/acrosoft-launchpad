import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import WebsiteTreeGame from "./WebsiteTreeGame";

// Vista previa (?demo=1): no se envía nada al servidor ni se dispara el pixel.
vi.mock("@/lib/estimadosPreview", () => ({ isEstimadosPreview: () => true }));

const screenOf = () => screen.getByTestId("game-root").getAttribute("data-screen");
const next = async () => { await act(async () => { vi.advanceTimersByTime(500); }); };

describe("/website-tree-game (recorrido gamificado)", () => {
  beforeEach(() => { vi.useFakeTimers(); window.scrollTo = vi.fn() as unknown as typeof window.scrollTo; });
  afterEach(() => { vi.useRealTimers(); });

  it("empieza en la pantalla 0 y recorre el juego hasta el formulario", async () => {
    render(<WebsiteTreeGame />);
    expect(screenOf()).toBe("0");

    fireEvent.click(screen.getByTestId("game-start")); await next();
    expect(screenOf()).toBe("1");
    // Quiz de una sola respuesta: el botón de avance aparece solo cuando elige una opción.
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /resolverlo gratis/ })).toBeNull();
    fireEvent.click(screen.getAllByRole("radio")[0]);
    fireEvent.click(screen.getAllByRole("radio")[1]);
    expect(screen.getAllByRole("radio").filter((r) => r.getAttribute("aria-checked") === "true")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /resolverlo gratis/ })); await next();
    expect(screenOf()).toBe("2");

    // Vista 3: «¿Cómo te gustaría tu website?» admite varias respuestas; el botón aparece al marcar alguna.
    expect(screen.getByText("¿Cómo te gustaría tu website?")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Así quiero mi website/ })).toBeNull();
    const wants = screen.getAllByRole("button", { pressed: false }).filter((x) => /Que /.test(x.textContent ?? ""));
    expect(wants).toHaveLength(4);
    fireEvent.click(wants[0]); fireEvent.click(wants[2]);
    expect(screen.getAllByRole("button", { pressed: true })).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: /Así quiero mi website/ })); await next();
    expect(screenOf()).toBe("3");

    // Vista 4: solo la pregunta y el botón circular; sin precios.
    expect(screen.getByText(/¿Por qué la website que te ofrecemos es/)).toBeTruthy();
    expect(screen.queryByText(/Porque también ayudamos/)).toBeNull();
    fireEvent.click(screen.getByTestId("game-round")); await next();
    expect(screenOf()).toBe("4");

    // Vista 5: la respuesta con los badges de Meta y Google, todavía sin comparar precios ni hablar de los US$20.
    expect(screen.getByText(/Porque también ayudamos a negocios a conseguir más clientes/)).toBeTruthy();
    expect(screen.getByLabelText("Respaldo profesional")).toBeTruthy();
    expect(screen.queryByText(/US\$500/)).toBeNull();
    expect(screen.queryByText(/US\$20/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Sí, sigamos con mi website/ })); await next();
    expect(screenOf()).toBe("5");
    // Vista 6: directo a «Qué incluye tu website gratis» (sin ejemplos).
    expect(screen.queryByText(/Así se ven nuestras/)).toBeNull();
    expect(screen.getByText(/Qué incluye tu website/)).toBeTruthy();
    expect(screen.queryByText(/3 pasos/)).toBeNull();

    // El botón de esta vista lleva al formulario (parte 1: tus datos), ya sin popup ni pantalla de 3 pasos.
    expect(screen.queryByTestId("formulario-popup")).toBeNull();
    fireEvent.click(screen.getByTestId("game-to-form")); await next();
    expect(screenOf()).toBe("6");
    expect(screen.getByTestId("formulario-popup")).toBeTruthy();
    expect(screen.getByText("Nombre y Apellido")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Continuar/ })).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
