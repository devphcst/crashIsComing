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

describe("computeMarketStatus(KRX)", () => {
  it("normal — Mon close → next=Tue (weekday only)", () => {
    const r = computeMarketStatus("2026-05-18", "KRX");
    expect(r).toEqual({ kind: "normal", nextTradingDay: "2026-05-19" });
  });

  it("weekend — Fri close → Sat/Sun gap, next=Mon", () => {
    const r = computeMarketStatus("2026-10-16", "KRX");
    expect(r).toEqual({
      kind: "weekend",
      nextTradingDay: "2026-10-19",
      weekendStart: "2026-10-17",
      weekendEnd: "2026-10-18",
    });
  });

  it("ignores Korean public holidays — Liberation Day Fri 2026-08-14 still rolls to Mon", () => {
    // 광복절(8/15)이 토요일이고 8/17 월요일이 대체공휴일이지만, KRX 캘린더 미구현이라
    // 단순히 8/14 금요일 close 다음 평일 = 8/17(월)로 계산. 실제 KRX는 8/17 휴장이라
    // 8/18이 정답이지만 MVP에서는 하루 어긋남을 감수.
    const r = computeMarketStatus("2026-08-14", "KRX");
    expect(r).toEqual({
      kind: "weekend",
      nextTradingDay: "2026-08-17",
      weekendStart: "2026-08-15",
      weekendEnd: "2026-08-16",
    });
  });
});
