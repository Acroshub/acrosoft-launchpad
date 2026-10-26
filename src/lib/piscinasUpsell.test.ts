import { afterEach, describe, expect, it, vi } from "vitest";
import { chargeUpsell } from "./piscinasUpsell";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const asFetch = (f: unknown) => f as typeof fetch;

afterEach(() => vi.restoreAllMocks());

describe("chargeUpsell", () => {
  it("succeeded y already_paid cuentan como éxito; manda session e oferta", async () => {
    const f = vi.fn(() => Promise.resolve(json({ status: "succeeded" })));
    expect(await chargeUpsell("up1", "cs_test_abc", { fetchImpl: asFetch(f) })).toBe("succeeded");
    expect(JSON.parse((f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)).toEqual({ front_session_id: "cs_test_abc", offer: "up1" });
    expect(await chargeUpsell("up2", "cs_test_abc", { fetchImpl: asFetch(vi.fn(() => Promise.resolve(json({ status: "already_paid" })))) })).toBe("succeeded");
  });

  it("requires_action y failed se pasan tal cual; un error HTTP es failed sin reintentar", async () => {
    expect(await chargeUpsell("up1", "cs_test_abc", { fetchImpl: asFetch(vi.fn(() => Promise.resolve(json({ status: "requires_action", fallback: "link" })))) })).toBe("requires_action");
    expect(await chargeUpsell("up1", "cs_test_abc", { fetchImpl: asFetch(vi.fn(() => Promise.resolve(json({ status: "failed", message: "x" })))) })).toBe("failed");
    const f = vi.fn(() => Promise.resolve(json({ error: "x" }, 500)));
    expect(await chargeUpsell("up1", "cs_test_abc", { fetchImpl: asFetch(f) })).toBe("failed");
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("sin respuesta reintenta una vez (idempotente); si el reintento responde already_paid es éxito", async () => {
    const f = vi.fn().mockRejectedValueOnce(new TypeError("net")).mockResolvedValueOnce(json({ status: "already_paid" }));
    expect(await chargeUpsell("up1", "cs_test_abc", { fetchImpl: asFetch(f), retryDelayMs: 0 })).toBe("succeeded");
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("dos fallos de red seguidos → failed (plan de reserva), sin más reintentos", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const f = vi.fn(() => Promise.reject(new TypeError("net")));
    expect(await chargeUpsell("up2", "cs_test_abc", { fetchImpl: asFetch(f), retryDelayMs: 0 })).toBe("failed");
    expect(f).toHaveBeenCalledTimes(2);
  });
});
