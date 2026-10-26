import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PISCINAS_PAYMENT_LINK } from "./piscinasConfig";
import { createKitCheckoutUrl, resolveKitCheckoutUrl, startKitCheckout } from "./piscinasCheckout";

const STRIPE_URL = "https://checkout.stripe.com/c/pay/cs_test_abc";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

beforeEach(() => {
  // saveCheckoutAttribution hace fetch a Supabase: se silencia (no es lo que se prueba).
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(null, { status: 201 }))));
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("startKitCheckout", () => {
  it("éxito: redirige a la url de Stripe y manda client_reference_id piscinas_<uuid>", async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(json({ url: STRIPE_URL })));
    const navigate = vi.fn();
    await startKitCheckout({ fetchImpl: fetchImpl as unknown as typeof fetch, navigate });
    expect(navigate).toHaveBeenCalledWith(STRIPE_URL);
    const body = JSON.parse((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.client_reference_id).toMatch(/^piscinas_[0-9a-f-]{36}$/);
  });

  it("error de la función: cae al Payment Link con el mismo client_reference_id", async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(json({ error: "x" }, 502)));
    const navigate = vi.fn();
    await startKitCheckout({ fetchImpl: fetchImpl as unknown as typeof fetch, navigate });
    expect(navigate).toHaveBeenCalledTimes(1);
    const dest = new URL(navigate.mock.calls[0][0] as string);
    expect(`${dest.origin}${dest.pathname}`).toBe(PISCINAS_PAYMENT_LINK);
    const sent = JSON.parse((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(dest.searchParams.get("client_reference_id")).toBe(sent.client_reference_id);
    expect(console.warn).toHaveBeenCalled();
  });

  it("falla de red: cae al Payment Link", async () => {
    const fetchImpl = vi.fn(() => Promise.reject(new TypeError("Failed to fetch")));
    const navigate = vi.fn();
    await startKitCheckout({ fetchImpl: fetchImpl as unknown as typeof fetch, navigate });
    expect(navigate.mock.calls[0][0]).toContain(PISCINAS_PAYMENT_LINK);
  });

  it("timeout: aborta a los ~6 s y cae al Payment Link", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn((_url: string, init: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      }));
    const navigate = vi.fn();
    const done = startKitCheckout({ fetchImpl: fetchImpl as unknown as typeof fetch, navigate });
    await vi.advanceTimersByTimeAsync(5900);
    expect(navigate).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(200);
    await done;
    expect(navigate.mock.calls[0][0]).toContain(PISCINAS_PAYMENT_LINK);
  });

  it("respuesta con una url que no es de Stripe: se descarta y cae al Payment Link", async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(json({ url: "https://evil.example.com/pay" })));
    expect(await createKitCheckoutUrl("piscinas", { fetchImpl: fetchImpl as unknown as typeof fetch })).toBeNull();
    const navigate = vi.fn();
    await startKitCheckout({ fetchImpl: fetchImpl as unknown as typeof fetch, navigate });
    expect(navigate.mock.calls[0][0]).toContain(PISCINAS_PAYMENT_LINK);
  });

  it("guarda la atribución en checkout_attribution con el mismo id del client_reference_id", async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(json({ url: STRIPE_URL })));
    await resolveKitCheckoutUrl({ fetchImpl: fetchImpl as unknown as typeof fetch });
    const attrCall = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.find((c) => String(c[0]).includes("checkout_attribution"));
    expect(attrCall).toBeTruthy();
    const attrId = JSON.parse(attrCall![1].body).id;
    const sent = JSON.parse((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(sent.client_reference_id).toBe(`piscinas_${attrId}`);
  });
});
