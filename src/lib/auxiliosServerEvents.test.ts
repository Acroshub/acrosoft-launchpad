import { afterEach, describe, expect, it, vi } from "vitest";
import { sendAuxiliosServerEvent } from "./auxiliosServerEvents";

afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = "_fbp=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
});

describe("sendAuxiliosServerEvent", () => {
  it("manda evento, event_id, versión, url y cookies de Meta sin preflight", async () => {
    document.cookie = "_fbp=fb.1.1792440802683.64856671888511552";
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    await sendAuxiliosServerEvent({ event: "InitiateCheckout", eventId: "evt_12345678", abVersion: "B" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/functions/v1/auxilios-track-event");
    expect(init.keepalive).toBe(true);
    expect(init.headers["Content-Type"]).toContain("text/plain");
    expect(JSON.parse(init.body)).toMatchObject({
      event: "InitiateCheckout", event_id: "evt_12345678", ab_version: "B", fbp: "fb.1.1792440802683.64856671888511552",
    });
  });

  it("si la red falla no lanza (la landing no puede depender de esto)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(sendAuxiliosServerEvent({ event: "ViewContent", eventId: "evt_12345678", abVersion: "A" })).resolves.toBeUndefined();
  });
});
