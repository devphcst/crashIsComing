import { describe, expect, it } from "vitest";
import { isUSEasternDst, usCloseInKst } from "./market-time";

describe("isUSEasternDst", () => {
  it("returns false in winter (January, December)", () => {
    expect(isUSEasternDst("2026-01-15")).toBe(false);
    expect(isUSEasternDst("2025-12-31")).toBe(false);
  });

  it("returns true in midsummer (June, July, August)", () => {
    expect(isUSEasternDst("2026-06-18")).toBe(true);
    expect(isUSEasternDst("2026-07-04")).toBe(true);
  });

  it("flips at the second Sunday of March", () => {
    // 2026년 3월: 1일=일요일 → 첫째 주 일요일 1일, 둘째 주 일요일 8일
    expect(isUSEasternDst("2026-03-07")).toBe(false);
    expect(isUSEasternDst("2026-03-08")).toBe(true);
  });

  it("flips at the first Sunday of November", () => {
    // 2026년 11월: 1일=일요일 → 첫째 주 일요일 1일
    expect(isUSEasternDst("2026-10-31")).toBe(true);
    expect(isUSEasternDst("2026-11-01")).toBe(false);
  });

  it("handles 2025 transition dates (regression sample)", () => {
    // 2025년 3월: 1일=토요일 → 첫째 주 일요일 2일, 둘째 주 일요일 9일
    expect(isUSEasternDst("2025-03-08")).toBe(false);
    expect(isUSEasternDst("2025-03-09")).toBe(true);
    // 2025년 11월: 1일=토요일 → 첫째 주 일요일 2일
    expect(isUSEasternDst("2025-11-01")).toBe(true);
    expect(isUSEasternDst("2025-11-02")).toBe(false);
  });
});

describe("usCloseInKst", () => {
  it("EDT close → next day 05:00 KST", () => {
    expect(usCloseInKst("2026-06-18")).toEqual({
      year: 2026,
      month: 6,
      day: 19,
      hour: 5,
    });
  });

  it("EST close → next day 06:00 KST", () => {
    expect(usCloseInKst("2026-01-15")).toEqual({
      year: 2026,
      month: 1,
      day: 16,
      hour: 6,
    });
  });

  it("month rollover (US Dec 31 EST → KST Jan 1)", () => {
    expect(usCloseInKst("2025-12-31")).toEqual({
      year: 2026,
      month: 1,
      day: 1,
      hour: 6,
    });
  });

  it("month rollover (US Mar 31 EDT → KST Apr 1)", () => {
    expect(usCloseInKst("2026-03-31")).toEqual({
      year: 2026,
      month: 4,
      day: 1,
      hour: 5,
    });
  });
});
