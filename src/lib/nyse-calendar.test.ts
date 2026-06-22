import { describe, it, expect } from "vitest";
import {
  getHolidayName,
  isUSTradingDay,
  lastTradingDayBefore,
  nextTradingDayAfter,
} from "./nyse-calendar";

describe("isUSTradingDay", () => {
  it("returns false for known 2026 NYSE holidays", () => {
    const holidays2026 = [
      "2026-01-01", "2026-01-19", "2026-02-16", "2026-04-03",
      "2026-05-25", "2026-06-19", "2026-07-03", "2026-09-07",
      "2026-11-26", "2026-12-25",
    ];
    for (const h of holidays2026) {
      expect(isUSTradingDay(h), `${h} should be a holiday`).toBe(false);
    }
  });

  it("returns false for weekends", () => {
    expect(isUSTradingDay("2026-05-16")).toBe(false); // Sat
    expect(isUSTradingDay("2026-05-17")).toBe(false); // Sun
  });

  it("returns true for ordinary weekdays", () => {
    expect(isUSTradingDay("2026-05-18")).toBe(true); // Mon
    expect(isUSTradingDay("2026-05-19")).toBe(true); // Tue
    expect(isUSTradingDay("2026-05-22")).toBe(true); // Fri
    expect(isUSTradingDay("2026-10-15")).toBe(true);
  });

  it("returns false for invalid date strings", () => {
    expect(isUSTradingDay("nope")).toBe(false);
  });
});

describe("lastTradingDayBefore", () => {
  it("returns today when called after market close (>= 21:00 UTC)", () => {
    const now = new Date("2026-05-19T22:00:00Z"); // Tue 22:00 UTC
    expect(lastTradingDayBefore(now)).toBe("2026-05-19");
  });

  it("returns yesterday when called before market close", () => {
    const now = new Date("2026-05-19T12:00:00Z"); // Tue noon UTC
    expect(lastTradingDayBefore(now)).toBe("2026-05-18");
  });

  it("skips weekends — Monday morning returns previous Friday", () => {
    const now = new Date("2026-05-18T08:00:00Z"); // Mon morning
    expect(lastTradingDayBefore(now)).toBe("2026-05-15"); // Fri
  });

  it("skips holiday — day after July 3 holiday (Mon Jul 6) morning returns Jul 2", () => {
    const now = new Date("2026-07-06T08:00:00Z");
    expect(lastTradingDayBefore(now)).toBe("2026-07-02");
  });

  it("skips both weekend and adjacent holiday", () => {
    // 2026-12-25 (Fri Christmas) closed. 2026-12-26 Sat, 27 Sun. Mon 28 morning → 24 Thu.
    const now = new Date("2026-12-28T08:00:00Z");
    expect(lastTradingDayBefore(now)).toBe("2026-12-24");
  });
});

describe("nextTradingDayAfter", () => {
  it("returns next weekday for ordinary trading day", () => {
    expect(nextTradingDayAfter("2026-05-19")).toBe("2026-05-20"); // Tue → Wed
  });

  it("skips weekend — Friday returns Monday", () => {
    expect(nextTradingDayAfter("2026-05-22")).toBe("2026-05-26"); // Fri → next Mon (Memorial Day 5/25 is Mon)
  });

  it("skips Memorial Day holiday — Fri 2026-05-22 → Tue 2026-05-26", () => {
    // 5/22 Fri → 5/23 Sat → 5/24 Sun → 5/25 Mon (Memorial Day) → 5/26 Tue
    expect(nextTradingDayAfter("2026-05-22")).toBe("2026-05-26");
  });

  it("skips Juneteenth — Thu 2026-06-18 → Mon 2026-06-22", () => {
    // 6/18 Thu → 6/19 Fri Juneteenth → 6/20 Sat → 6/21 Sun → 6/22 Mon
    expect(nextTradingDayAfter("2026-06-18")).toBe("2026-06-22");
  });
});

describe("getHolidayName", () => {
  it("returns name for Juneteenth", () => {
    expect(getHolidayName("2026-06-19")).toBe("Juneteenth");
  });
  it("returns name for Thanksgiving", () => {
    expect(getHolidayName("2026-11-26")).toBe("Thanksgiving Day");
  });
  it("returns null for non-holiday", () => {
    expect(getHolidayName("2026-05-19")).toBeNull();
    expect(getHolidayName("2026-05-16")).toBeNull(); // Sat
  });
});
