import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EstimadosPreviewVideo, PREVIEW_SECONDS, bunnyPosterFor } from "./EstimadosPreviewVideo";

beforeEach(() => { vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() => Promise.resolve()); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const URL_MP4 = "https://cdn.ejemplo.com/abc/play_720p.mp4";
const video = (c: HTMLElement) => c.querySelector("video") as HTMLVideoElement;

describe("EstimadosPreviewVideo", () => {
  it("de fondo: video mudo, en bucle, que se reproduce solo y en línea (iOS), con UN solo botón (Play) encima y sin controles", () => {
    const { container } = render(<EstimadosPreviewVideo url={URL_MP4} poster="https://cdn.ejemplo.com/abc/thumbnail.jpg" />);
    const v = video(container);
    expect(v.getAttribute("src")).toBe(URL_MP4);
    expect(v.getAttribute("poster")).toBe("https://cdn.ejemplo.com/abc/thumbnail.jpg");
    expect(v.muted).toBe(true);
    expect(v.loop).toBe(true);
    expect(v.hasAttribute("autoplay")).toBe(true);
    expect(v.hasAttribute("playsinline")).toBe(true);
    expect(v.controls).toBe(false);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button", { name: /reproducir el video con sonido/i })).toBeTruthy();
  });

  it("la vista previa vuelve al segundo 0 al pasar de PREVIEW_SECONDS (solo hasta que le dan play)", () => {
    const { container } = render(<EstimadosPreviewVideo url={URL_MP4} />);
    const v = video(container);
    v.currentTime = PREVIEW_SECONDS + 1;
    fireEvent(v, new Event("timeupdate"));
    expect(v.currentTime).toBe(0);
  });

  it("al darle play: empieza DESDE CERO, con sonido, sin bucle y con los controles normales; el botón desaparece y ya no vuelve al segundo 0 a los 20 s", () => {
    const { container } = render(<EstimadosPreviewVideo url={URL_MP4} />);
    const v = video(container);
    v.currentTime = 12.5; // la vista previa iba por el segundo 12
    fireEvent.click(screen.getByRole("button", { name: /reproducir/i }));
    expect(v.currentTime).toBe(0);
    expect(v.muted).toBe(false);
    expect(v.volume).toBe(1);
    expect(v.loop).toBe(false);
    expect(v.controls).toBe(true);
    expect(screen.queryByRole("button", { name: /reproducir/i })).toBeNull();
    v.currentTime = PREVIEW_SECONDS + 5;
    fireEvent(v, new Event("timeupdate"));
    expect(v.currentTime).toBe(PREVIEW_SECONDS + 5);
  });
});

describe("bunnyPosterFor", () => {
  it("saca el póster de los mp4 de Bunny y deja sin póster los demás", () => {
    expect(bunnyPosterFor("https://vz-1.b-cdn.net/55a9/play_720p.mp4")).toBe("https://vz-1.b-cdn.net/55a9/thumbnail.jpg");
    expect(bunnyPosterFor("https://vz-1.b-cdn.net/55a9/play_480p.mp4?x=1")).toBe("https://vz-1.b-cdn.net/55a9/thumbnail.jpg");
    expect(bunnyPosterFor("https://cdn.ejemplo.com/regalo.mp4")).toBeUndefined();
  });
});
