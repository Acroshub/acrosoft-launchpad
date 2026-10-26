import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FRONT_SESSION_KEY } from "@/lib/piscinasFunnel";
import { useUpsellCharge } from "./useUpsellCharge";

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const opts = { offer: "up1" as const, fallbackHref: "https://buy.stripe.com/x?client_reference_id=piscinas-up1", flagKey: "piscinas_up1", nextUrl: "/piscinas-up2?from=up1" };

beforeEach(() => { sessionStorage.clear(); });
afterEach(() => { vi.unstubAllGlobals(); });

describe("useUpsellCharge", () => {
  it("sin session_id no atiende el clic (sigue el flujo con Payment Link) y no hay línea de confianza", async () => {
    const { result } = renderHook(() => useUpsellCharge(opts));
    let handled = true;
    await act(async () => { handled = await result.current.charge(); });
    expect(handled).toBe(false);
    expect(result.current.cardProps("Sí").yesNote).toBeUndefined();
  });

  it("requires_action: aviso con botón de reserva al Payment Link y «Sí» deshabilitado", async () => {
    sessionStorage.setItem(FRONT_SESSION_KEY, "cs_test_a1B2c3D4e5F6g7H8i9J0");
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json({ status: "requires_action", fallback: "link" }))));
    const { result } = renderHook(() => useUpsellCharge(opts));
    await act(async () => { await result.current.charge(); });
    const props = result.current.cardProps("Sí");
    expect(props.yesDisabled).toBe(true);
    render(<div>{props.notice}</div>);
    await waitFor(() => expect(screen.getByText("Completar mi compra")).toHaveAttribute("href", opts.fallbackHref));
  });
});
