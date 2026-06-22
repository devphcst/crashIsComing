import { describe, it, expect } from "vitest";
import { computeMarketStatus } from "./market-status";

describe("computeMarketStatus", () => {
  it("normal — Mon close → gap=0, next=Tue", () => {
    const r = computeMarketStatus("2026-05-18");
    expect(r).toEqual({ kind: "normal", nextTradingDay: "2026-05-19" });
  });

  it("weekend — Fri 2026-10-16 close → Sat/Sun gap, next=Mon", () => {
    const r = computeMarketStatus("2026-10-16");
    expect(r).toEqual({
      kind: "weekend",
      nextTradingDay: "2026-10-19",
      weekendStart: "2026-10-17",
      weekendEnd: "2026-10-18",
    });
  });

  it("holiday — Juneteenth Fri 2026-06-19 (Thu close + holiday + weekend)", () => {
    const r = computeMarketStatus("2026-06-18");
    expect(r).toEqual({
      kind: "holiday",
      nextTradingDay: "2026-06-22",
      holidayDate: "2026-06-19",
      holidayName: "Juneteenth",
      hasWeekend: true,
    });
  });

  it("holiday — Memorial Day Mon 2026-05-25 (Fri close + weekend + holiday)", () => {
    const r = computeMarketStatus("2026-05-22");
    expect(r).toEqual({
      kind: "holiday",
      nextTradingDay: "2026-05-26",
      holidayDate: "2026-05-25",
      holidayName: "Memorial Day",
      hasWeekend: true,
    });
  });

  it("holiday-no-weekend — Thanksgiving Thu 2026-11-26 (Wed close → Thu holiday → Fri trading)", () => {
    const r = computeMarketStatus("2026-11-25");
    expect(r).toEqual({
      kind: "holiday",
      nextTradingDay: "2026-11-27",
      holidayDate: "2026-11-26",
      holidayName: "Thanksgiving Day",
      hasWeekend: false,
    });
  });

  it("holiday — Christmas Day Fri 2026-12-25 (Thu close + holiday + weekend)", () => {
    const r = computeMarketStatus("2026-12-24");
    expect(r).toEqual({
      kind: "holiday",
      nextTradingDay: "2026-12-28",
      holidayDate: "2026-12-25",
      holidayName: "Christmas Day",
      hasWeekend: true,
    });
  });
});
