import { describe, expect, it } from "vitest";
import { formatBookingSummary, formatSlotInTz, wallClockToUtcMs } from "./slotTime";

// El calendario del admin está en America/La_Paz (UTC-4 todo el año, sin horario de verano).
const LA_PAZ = "America/La_Paz";

describe("wallClockToUtcMs / formatSlotInTz (misma lógica que tenía CalendarRenderer)", () => {
  it("12:00 en La Paz son las 16:00 UTC", () => {
    expect(new Date(wallClockToUtcMs(2026, 11, 9, 12, 0, LA_PAZ)).toISOString()).toBe("2026-11-09T16:00:00.000Z");
  });

  it("se ve convertida a la zona de quien reserva (invierno: Miami UTC-5, Los Ángeles UTC-8)", () => {
    expect(formatSlotInTz("2026-11-09", 12, 0, LA_PAZ, "America/New_York")).toBe("11:00 AM");
    expect(formatSlotInTz("2026-11-09", 12, 0, LA_PAZ, "America/Los_Angeles")).toBe("8:00 AM");
    expect(formatSlotInTz("2026-11-09", 12, 0, LA_PAZ, LA_PAZ)).toBe("12:00 PM");
  });

  it("respeta el horario de verano de EE.UU. (en julio Nueva York es UTC-4)", () => {
    expect(formatSlotInTz("2026-07-15", 12, 0, LA_PAZ, "America/New_York")).toBe("12:00 PM");
  });
});

describe("formatBookingSummary", () => {
  it("día, hora y zona en español, en la zona de la persona", () => {
    const s = formatBookingSummary("2026-11-09", 12, 0, LA_PAZ, "America/New_York");
    expect(s.dateLabel).toMatch(/^Lunes,? 9 de noviembre$/);
    expect(s.timeLabel).toBe("11:00 AM");
    expect(s.tzLabel).toMatch(/^America\/New York \((EST|GMT-5)\)$/);
  });

  it("si la hora cruza la medianoche, la fecha mostrada es la de la persona (no la del calendario)", () => {
    // 22:30 del lunes 9 en La Paz = 02:30 UTC del martes 10 = 6:30 PM del lunes 9 en Los Ángeles... y 9:30 PM del lunes en Nueva York.
    const la = formatBookingSummary("2026-11-09", 22, 30, LA_PAZ, "America/Los_Angeles");
    expect(la.dateLabel).toMatch(/Lunes,? 9 de noviembre/);
    expect(la.timeLabel).toBe("6:30 PM");
    // En Madrid (UTC+1) esa misma cita ya es del martes 10, 3:30 AM.
    const madrid = formatBookingSummary("2026-11-09", 22, 30, LA_PAZ, "Europe/Madrid");
    expect(madrid.dateLabel).toMatch(/Martes,? 10 de noviembre/);
    expect(madrid.timeLabel).toBe("3:30 AM");
  });

  it("si la zona de la persona no es válida, usa la del calendario en vez de romperse", () => {
    const s = formatBookingSummary("2026-11-09", 12, 0, LA_PAZ, "Zona/Que_No_Existe");
    expect(s.timeLabel).toBe("12:00 PM");
    expect(s.tzLabel).toContain("America/La Paz");
  });
});
