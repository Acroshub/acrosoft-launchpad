import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCookie, getFbc, getFbp, saveCheckoutAttribution } from "./checkoutAttribution";
import { toeflCheckoutUrl } from "./toeflConfig";

const clearCookies = () =>
  document.cookie.split(";").forEach((c) => {
    const name = c.split("=")[0].trim();
    if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  });

beforeEach(() => {
  clearCookies();
  window.history.pushState({}, "", "/");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("cookies de Meta", () => {
  it("lee _fbp y _fbc de las cookies", () => {
    document.cookie = "_fbp=fb.1.1700000000000.1234567890; path=/";
    document.cookie = "_fbc=fb.1.1700000000000.AbC_-d; path=/";
    expect(getFbp()).toBe("fb.1.1700000000000.1234567890");
    expect(getFbc()).toBe("fb.1.1700000000000.AbC_-d");
    expect(getCookie("_nope")).toBeNull();
  });

  it("sin cookie _fbc arma el valor desde ?fbclid= con el formato de Meta", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    window.history.pushState({}, "", "/toefl?fbclid=IwAR0xyz");
    expect(getFbc()).toBe("fb.1.1700000000000.IwAR0xyz");
    vi.restoreAllMocks();
  });

  it("sin cookie ni fbclid devuelve null", () => {
    expect(getFbp()).toBeNull();
    expect(getFbc()).toBeNull();
  });
});

describe("saveCheckoutAttribution", () => {
  const ID = "0b7e3f1a-92c4-4d5e-8a61-3f2c9d7e4b10";

  it("inserta solo id, fbp y fbc (el user agent y la IP los pone la base)", async () => {
    document.cookie = "_fbp=fb.1.1700000000000.1234567890; path=/";
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    await saveCheckoutAttribution(ID);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/rest\/v1\/checkout_attribution$/);
    expect(init.method).toBe("POST");
    expect(init.keepalive).toBe(true);
    expect(init.headers.Prefer).toBe("return=minimal");
    expect(JSON.parse(init.body)).toEqual({ id: ID, fbp: "fb.1.1700000000000.1234567890", fbc: null });
  });

  it("si la petición falla no lanza (la compra no se bloquea)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("sin red")));
    await expect(saveCheckoutAttribution(ID)).resolves.toBeUndefined();
  });

  it("si Supabase tarda, espera solo el tiempo máximo", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {}))); // nunca responde
    let done = false;
    const p = saveCheckoutAttribution(ID, 800).then(() => { done = true; });
    await vi.advanceTimersByTimeAsync(799);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(2);
    await p;
    expect(done).toBe(true);
  });
});

describe("toeflCheckoutUrl con atribución", () => {
  it("client_reference_id = toefl-b2_<uuid>; sin id sigue siendo toefl-b2", () => {
    const id = "0b7e3f1a-92c4-4d5e-8a61-3f2c9d7e4b10";
    expect(new URL(toeflCheckoutUrl("https://buy.stripe.com/abc", id)).searchParams.get("client_reference_id")).toBe(`toefl-b2_${id}`);
    expect(new URL(toeflCheckoutUrl("https://buy.stripe.com/abc")).searchParams.get("client_reference_id")).toBe("toefl-b2");
  });
});
